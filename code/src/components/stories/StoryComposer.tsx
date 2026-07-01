import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { prepareShortMedia, type PreparedShortMedia } from "../../lib/mediaProcessing";
import { createStory, uploadStoryMedia } from "../../lib/profile";

type StoryComposerProps = {
  userId: string;
  onCreated: () => Promise<void>;
};

const getPreviewUrl = (media: PreparedShortMedia | null) =>
  media ? URL.createObjectURL(media.file) : null;

export const StoryComposer = ({
  userId,
  onCreated
}: StoryComposerProps) => {
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [preparedMedia, setPreparedMedia] = useState<PreparedShortMedia | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
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
    setCaption("");
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
          ? "Story media optimized and ready."
          : "Story media ready to publish."
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

    const mediaUpload = await uploadStoryMedia(userId, preparedMedia.file);

    if (mediaUpload.error || !mediaUpload.data) {
      setSubmitting(false);
      setError(mediaUpload.error ?? "Story upload failed.");
      return;
    }

    let thumbnailUpload:
      | {
          publicUrl: string;
          path: string;
        }
      | null = null;

    if (preparedMedia.thumbnailFile) {
      const result = await uploadStoryMedia(userId, preparedMedia.thumbnailFile);

      if (result.error || !result.data) {
        setSubmitting(false);
        setError(result.error ?? "Story thumbnail upload failed.");
        return;
      }

      thumbnailUpload = result.data;
    }

    const createResult = await createStory(userId, {
      mediaKind: preparedMedia.kind,
      mediaUrl: mediaUpload.data.publicUrl,
      mediaStoragePath: mediaUpload.data.path,
      thumbnailUrl: thumbnailUpload?.publicUrl ?? null,
      thumbnailStoragePath: thumbnailUpload?.path ?? null,
      body: caption.trim() || null,
      mediaDurationSeconds: preparedMedia.durationSeconds,
      mediaWidth: preparedMedia.width,
      mediaHeight: preparedMedia.height,
      compressionStatus: preparedMedia.compressionStatus
    });

    setSubmitting(false);

    if (createResult.error) {
      setError(createResult.error);
      return;
    }

    setMessage("Story published. It will disappear automatically after 24 hours.");
    await onCreated();
    reset();
  };

  return (
    <form className="story-composer" onSubmit={handleSubmit}>
      {error ? <div className="auth-message auth-message--error">{error}</div> : null}
      {message ? <div className="auth-message auth-message--info">{message}</div> : null}

      <div className="upload-panel upload-panel--story">
        <div className="upload-panel__header">
          <div>
            <span className="upload-panel__eyebrow">Story Media</span>
            <strong>{preparedMedia ? preparedMedia.file.name : "Choose media for the story"}</strong>
            <p>Image or video stories stay live for 24 hours, then disappear from the app.</p>
          </div>
          {preparedMedia ? (
            <button className="ghost-button" onClick={reset} type="button">
              Remove
            </button>
          ) : null}
        </div>

        {previewUrl ? (
          <div className="upload-panel__preview-frame upload-panel__preview-frame--story">
            {preparedMedia?.kind === "video" ? (
              <video className="story-composer__media story-composer__media--contained" controls playsInline src={previewUrl} />
            ) : (
              <img alt="Selected story preview" className="story-composer__media story-composer__media--contained" src={previewUrl} />
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
            <span>Compact uploader with gallery and camera access</span>
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
          maxLength={240}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Add a short caption for this story."
          rows={3}
          value={caption}
        />
      </label>

      <div className="story-composer__meta">
        <span>Visibility: active for 24 hours</span>
        <span>{preparedMedia?.kind === "video" ? "Video story" : preparedMedia?.kind === "image" ? "Image story" : "Choose media"}</span>
      </div>

      <button className="solid-button" disabled={isPreparing || isSubmitting || !preparedMedia} type="submit">
        {isSubmitting ? "Publishing..." : "Publish Story"}
      </button>
    </form>
  );
};
