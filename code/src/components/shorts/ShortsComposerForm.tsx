import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFeedPost, uploadPostMedia } from "../../lib/profile";
import { prepareShortMedia, type PreparedShortMedia } from "../../lib/mediaProcessing";

type ShortsComposerFormProps = {
  userId: string;
  onCreated: () => Promise<void>;
  onSuccess?: () => void;
};

const getPreviewUrl = (media: PreparedShortMedia | null) =>
  media ? URL.createObjectURL(media.file) : null;

export const ShortsComposerForm = ({
  userId,
  onCreated,
  onSuccess
}: ShortsComposerFormProps) => {
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [preparedMedia, setPreparedMedia] = useState<PreparedShortMedia | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [tipEnabled, setTipEnabled] = useState(true);
  const [isPreparing, setPreparing] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const reset = () => {
    setPreparedMedia(null);
    setPreviewUrl(null);
    setTitle("");
    setCaption("");
    setTipEnabled(true);
    setError(null);
    setMessage(null);
  };

  const handleMediaSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setPreparing(true);
    setError(null);
    setMessage(null);

    try {
      const nextPreparedMedia = await prepareShortMedia(file);
      setPreparedMedia(nextPreparedMedia);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return getPreviewUrl(nextPreparedMedia);
      });
      setMessage(
        nextPreparedMedia.compressionStatus === "compressed"
          ? "Media optimized and ready to publish."
          : "Media ready to publish."
      );
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Unable to prepare this file."
      );
    } finally {
      setPreparing(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!preparedMedia) {
      setError("Choose a photo or video before publishing.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const mediaUpload = await uploadPostMedia(userId, preparedMedia.file);

    if (mediaUpload.error || !mediaUpload.data) {
      setSubmitting(false);
      setError(mediaUpload.error ?? "Media upload failed.");
      return;
    }

    let thumbnailUpload:
      | {
          publicUrl: string;
          path: string;
        }
      | null = null;

    if (preparedMedia.thumbnailFile) {
      const result = await uploadPostMedia(userId, preparedMedia.thumbnailFile);

      if (result.error || !result.data) {
        setSubmitting(false);
        setError(result.error ?? "Thumbnail upload failed.");
        return;
      }

      thumbnailUpload = result.data;
    }

    const createResult = await createFeedPost(userId, {
      postType: preparedMedia.kind,
      surface: "short",
      title: title.trim() || null,
      body: caption.trim() || null,
      plainBody: caption.trim() || null,
      mediaUrl: mediaUpload.data.publicUrl,
      thumbnailUrl: thumbnailUpload?.publicUrl ?? null,
      mediaStoragePath: mediaUpload.data.path,
      thumbnailStoragePath: thumbnailUpload?.path ?? null,
      mediaDurationSeconds: preparedMedia.durationSeconds,
      mediaWidth: preparedMedia.width,
      mediaHeight: preparedMedia.height,
      compressionStatus: preparedMedia.compressionStatus,
      tipEnabled
    });

    setSubmitting(false);

    if (createResult.error) {
      setError(createResult.error);
      return;
    }

    setMessage("Reel published.");
    await onCreated();
    reset();
    onSuccess?.();
  };

  return (
    <form className="shorts-composer__form" onSubmit={handleSubmit}>
      {error ? <div className="auth-message auth-message--error">{error}</div> : null}
      {message ? <div className="auth-message auth-message--info">{message}</div> : null}

      <label className="shorts-composer__field">
        Title
        <input
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a short title"
          type="text"
          value={title}
        />
      </label>

      <div className="upload-panel upload-panel--shorts">
        <div className="upload-panel__header">
          <div>
            <span className="upload-panel__eyebrow">Reel Media</span>
            <strong>{preparedMedia ? preparedMedia.file.name : "Choose media for the reel"}</strong>
            <p>Upload portrait, square, or landscape media. Wide videos keep their framing instead of being cropped.</p>
          </div>
          {preparedMedia ? (
            <button className="ghost-button" onClick={reset} type="button">
              Remove
            </button>
          ) : null}
        </div>

        {previewUrl ? (
          <div className="upload-panel__preview-frame upload-panel__preview-frame--shorts">
            {preparedMedia?.kind === "video" ? (
              <video className="shorts-composer__media shorts-composer__media--contained" controls playsInline src={previewUrl} />
            ) : (
              <img alt="Selected reel preview" className="shorts-composer__media shorts-composer__media--contained" src={previewUrl} />
            )}
          </div>
        ) : (
          <button
            className="upload-panel__dropzone upload-panel__dropzone--compact"
            disabled={isPreparing || isSubmitting}
            onClick={() => libraryInputRef.current?.click()}
            type="button"
          >
            <span aria-hidden="true" className="upload-panel__dropzone-icon">
              +
            </span>
            <strong>{isPreparing ? "Preparing media..." : "Choose media"}</strong>
            <span>Small dropzone first, preview appears after selection</span>
          </button>
        )}

        <div className="upload-panel__actions">
          <button
            className="solid-button"
            disabled={isPreparing || isSubmitting}
            onClick={() => libraryInputRef.current?.click()}
            type="button"
          >
            {isPreparing ? "Preparing..." : preparedMedia ? "Replace from gallery" : "From Gallery"}
          </button>
          <button
            className="ghost-button"
            disabled={isPreparing || isSubmitting}
            onClick={() => cameraInputRef.current?.click()}
            type="button"
          >
            Camera Upload
          </button>
        </div>

        <input
          accept="image/*,video/*"
          hidden
          onChange={handleMediaSelection}
          ref={libraryInputRef}
          type="file"
        />
        <input
          accept="image/*,video/*"
          capture="environment"
          hidden
          onChange={handleMediaSelection}
          ref={cameraInputRef}
          type="file"
        />
      </div>

      <label className="shorts-composer__field">
        Caption
        <textarea
          maxLength={500}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Describe this reel, add context, or mention the artwork."
          rows={4}
          value={caption}
        />
      </label>

      <label className="shorts-composer__toggle">
        <input
          checked={tipEnabled}
          onChange={(event) => setTipEnabled(event.target.checked)}
          type="checkbox"
        />
        <span>Allow supporters to tip this artist on the reel.</span>
      </label>

      <button className="solid-button" disabled={isPreparing || isSubmitting || !preparedMedia} type="submit">
        {isSubmitting ? "Publishing..." : "Publish Reel"}
      </button>
    </form>
  );
};
