const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const VIDEO_MAX_BYTES = 18 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1600;
const SHORT_VIDEO_MAX_WIDTH = 720;
const SHORT_VIDEO_MAX_HEIGHT = 1280;
const SHORT_VIDEO_BITRATE = 2_500_000;

type CapturableVideoElement = HTMLVideoElement & {
  captureStream?: () => MediaStream;
};

export type CompressionStatus = "original" | "compressed";
export type ShortMediaKind = "image" | "video";

export type PreparedShortMedia = {
  kind: ShortMediaKind;
  file: File;
  thumbnailFile: File | null;
  width: number;
  height: number;
  durationSeconds: number | null;
  compressionStatus: CompressionStatus;
};

const loadImageElement = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = url;
  });

const loadVideoElement = (url: string) =>
  new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Unable to load video."));
    video.src = url;
  });

const scaleWithin = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) => {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to export media."));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });

const blobToFile = (blob: Blob, filename: string) =>
  new File([blob], filename, {
    type: blob.type,
    lastModified: Date.now()
  });

const buildDerivedName = (file: File, suffix: string, extension: string) => {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
  return `${baseName}-${suffix}.${extension}`;
};

const maybeCompressImage = async (file: File): Promise<PreparedShortMedia> => {
  const url = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(url);
    const scaled = scaleWithin(
      image.naturalWidth,
      image.naturalHeight,
      IMAGE_MAX_DIMENSION,
      IMAGE_MAX_DIMENSION
    );
    const shouldCompress =
      file.size > IMAGE_MAX_BYTES ||
      scaled.width !== image.naturalWidth ||
      scaled.height !== image.naturalHeight;

    if (!shouldCompress) {
      return {
        kind: "image",
        file,
        thumbnailFile: null,
        width: image.naturalWidth,
        height: image.naturalHeight,
        durationSeconds: null,
        compressionStatus: "original"
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Image compression is unavailable.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let outputBlob = await canvasToBlob(canvas, "image/jpeg", quality);

    while (outputBlob.size > IMAGE_MAX_BYTES && quality > 0.52) {
      quality -= 0.08;
      outputBlob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    return {
      kind: "image",
      file: blobToFile(outputBlob, buildDerivedName(file, "compressed", "jpg")),
      thumbnailFile: null,
      width: scaled.width,
      height: scaled.height,
      durationSeconds: null,
      compressionStatus: "compressed"
    };
  } finally {
    URL.revokeObjectURL(url);
  }
};

const captureVideoThumbnail = async (video: HTMLVideoElement, file: File) => {
  const canvas = document.createElement("canvas");
  const scaled = scaleWithin(
    video.videoWidth,
    video.videoHeight,
    720,
    1280
  );
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const seekTarget = Math.min(0.15, Math.max(0, (video.duration || 0) / 4));

  await new Promise<void>((resolve) => {
    const handleSeek = () => {
      video.removeEventListener("seeked", handleSeek);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve();
    };

    video.addEventListener("seeked", handleSeek, { once: true });
    video.currentTime = seekTarget;
  });

  const thumbnailBlob = await canvasToBlob(canvas, "image/jpeg", 0.78);
  return blobToFile(thumbnailBlob, buildDerivedName(file, "thumb", "jpg"));
};

const getSupportedRecorderMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? null;
};

const maybeCompressVideo = async (file: File): Promise<PreparedShortMedia> => {
  const url = URL.createObjectURL(file);

  try {
    const video = await loadVideoElement(url);
    const thumbnailFile = await captureVideoThumbnail(video, file);
    const scaled = scaleWithin(
      video.videoWidth,
      video.videoHeight,
      SHORT_VIDEO_MAX_WIDTH,
      SHORT_VIDEO_MAX_HEIGHT
    );
    const shouldCompress =
      file.size > VIDEO_MAX_BYTES ||
      scaled.width !== video.videoWidth ||
      scaled.height !== video.videoHeight;

    if (!shouldCompress) {
      return {
        kind: "video",
        file,
        thumbnailFile,
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        compressionStatus: "original"
      };
    }

    const supportedMimeType = getSupportedRecorderMimeType();

    const capturableVideo = video as CapturableVideoElement;

    if (!supportedMimeType || typeof capturableVideo.captureStream !== "function") {
      return {
        kind: "video",
        file,
        thumbnailFile,
        width: scaled.width,
        height: scaled.height,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        compressionStatus: "original"
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const context = canvas.getContext("2d");

    if (!context || typeof canvas.captureStream !== "function") {
      return {
        kind: "video",
        file,
        thumbnailFile,
        width: scaled.width,
        height: scaled.height,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        compressionStatus: "original"
      };
    }

    const canvasStream = canvas.captureStream(30);
    const sourceStream = capturableVideo.captureStream();
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...sourceStream.getAudioTracks()
    ]);

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: supportedMimeType,
      videoBitsPerSecond: SHORT_VIDEO_BITRATE
    });

    let animationFrameId = 0;

    const renderFrame = () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (!video.paused && !video.ended) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    const recordingComplete = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Unable to compress video."));
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: supportedMimeType }));
      };
    });

    recorder.start(250);
    video.currentTime = 0;
    await video.play();
    renderFrame();

    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error("Video playback failed during compression."));
    });

    window.cancelAnimationFrame(animationFrameId);
    recorder.stop();
    combinedStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    sourceStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    canvasStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());

    const compressedBlob = await recordingComplete;
    const nextFile =
      compressedBlob.size > 0
        ? blobToFile(compressedBlob, buildDerivedName(file, "compressed", "webm"))
        : file;

    return {
      kind: "video",
      file: nextFile,
      thumbnailFile,
      width: scaled.width,
      height: scaled.height,
      durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
      compressionStatus: nextFile === file ? "original" : "compressed"
    };
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const prepareShortMedia = async (file: File) => {
  if (file.type.startsWith("image/")) {
    return maybeCompressImage(file);
  }

  if (file.type.startsWith("video/")) {
    return maybeCompressVideo(file);
  }

  throw new Error("Choose an image or video file.");
};
