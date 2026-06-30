import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFeedPost, uploadPostMedia } from "../../lib/profile";
import { prepareShortMedia, type PreparedShortMedia } from "../../lib/mediaProcessing";

type ShortsComposerProps = {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

const getPreviewUrl = (media: PreparedShortMedia | null) =>
  media ? URL.createObjectURL(media.file) : null;

export const ShortsComposer = ({
  userId,
  isOpen,
  onClose,
  onCreated
}: ShortsComposerProps) => {
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

  useEffect(() => {
    if (!isOpen) {
      setPreparedMedia(null);
      setPreviewUrl(null);
      setTitle("");
      setCaption("");
      setTipEnabled(true);
      setError(null);
      setMessage(null);
    }
  }, [isOpen]);

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
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="shorts-composer-sheet" role="dialog" aria-modal="true" aria-labelledby="shorts-composer-title">
      <div className="shorts-composer-sheet__backdrop" onClick={onClose} />
      <section className="shorts-composer">
        <div className="shorts-composer__header">
          <div>
            <span className="section-heading__eyebrow">Upload Reel</span>
            <h2 id="shorts-composer-title">Post to Shorts</h2>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {error ? <div className="auth-message auth-message--error">{error}</div> : null}
        {message ? <div className="auth-message auth-message--info">{message}</div> : null}

        <form className="shorts-composer__form" onSubmit={handleSubmit}>
          <div className="shorts-composer__preview">
            {previewUrl ? (
              preparedMedia?.kind === "video" ? (
                <video className="shorts-composer__media" controls playsInline src={previewUrl} />
              ) : (
                <img alt="Selected reel preview" className="shorts-composer__media" src={previewUrl} />
              )
            ) : (
              <div className="shorts-composer__empty">
                <strong>Choose media</strong>
                <p>Vertical video is ideal, but photo posts are supported too.</p>
              </div>
            )}
          </div>

          <div className="shorts-composer__source-grid">
            <button
              className="solid-button"
              disabled={isPreparing || isSubmitting}
              onClick={() => libraryInputRef.current?.click()}
              type="button"
            >
              {isPreparing ? "Preparing..." : "From Gallery"}
            </button>
            <button
              className="ghost-button"
              disabled={isPreparing || isSubmitting}
              onClick={() => cameraInputRef.current?.click()}
              type="button"
            >
              Camera Upload
            </button>
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
            Title
            <input
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add a short title"
              type="text"
              value={title}
            />
          </label>

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
      </section>
    </div>
  );
};
