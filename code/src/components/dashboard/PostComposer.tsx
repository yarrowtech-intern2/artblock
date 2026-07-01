import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";
import type { FeedPostType } from "../../lib/supabase.types";
import {
  defaultRichPostStyle,
  getRichPostStyleVars,
  serializeRichPostPayload,
  type PostTextAlign,
  type RichPostStyle
} from "../../lib/postRichContent";
import { createFeedPost, renderFormattedText, uploadPostMedia } from "../../lib/profile";

const postOptions: { label: string; value: FeedPostType }[] = [
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
  { label: "Poll", value: "poll" },
  { label: "Text", value: "text" }
];

const baseSchema = z.object({
  title: z.string().max(120, "Title or question must stay under 120 characters."),
  body: z.string().max(2000, "Post body must stay under 2000 characters.")
});

type PostComposerProps = {
  userId: string;
  onPublished: () => Promise<void>;
  variant?: "dashboard" | "feed";
  initialPostType?: FeedPostType;
  showHeader?: boolean;
  showTypeSelector?: boolean;
  className?: string;
};

const emptyPollOptions = ["", ""];
const titleWeightOptions: RichPostStyle["titleWeight"][] = [700, 800, 900];
const bodyWeightOptions: RichPostStyle["bodyWeight"][] = [400, 500, 600, 700];
const titleFontOptions = [
  { label: "Space Grotesk", value: "space" },
  { label: "Onest", value: "onest" },
  { label: "Poppins", value: "poppins" }
] as const;
const textAlignOptions: PostTextAlign[] = ["left", "center", "right"];

export const PostComposer = ({
  userId,
  onPublished,
  variant = "dashboard",
  initialPostType = "image",
  showHeader = true,
  showTypeSelector = true,
  className
}: PostComposerProps) => {
  const [postType, setPostType] = useState<FeedPostType>(initialPostType);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(emptyPollOptions);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isExpanded, setExpanded] = useState(variant === "dashboard");
  const [richStyle, setRichStyle] = useState<RichPostStyle>(defaultRichPostStyle);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const mediaAccept =
    postType === "video" ? "video/mp4,video/webm,video/quicktime" : "image/png,image/jpeg,image/webp";
  const cameraAccept = postType === "video" ? "video/*" : "image/*";

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    setPostType(initialPostType);
  }, [initialPostType]);

  const resetComposer = () => {
    setTitle("");
    setBody("");
    setPollOptions(emptyPollOptions);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRichStyle(defaultRichPostStyle);
    if (variant === "feed") {
      setExpanded(false);
    }
  };

  const wrapBodySelection = (prefix: string, suffix = prefix, placeholder = "text") => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBody((current) => `${current}${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end) || placeholder;
    const nextValue = `${body.slice(0, start)}${prefix}${selected}${suffix}${body.slice(end)}`;
    setBody(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + prefix.length;
      const selectionEnd = selectionStart + selected.length;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const addListToSelection = () => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBody((current) => `${current}${current ? "\n" : ""}- list item`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end) || "list item";
    const transformed = selected
      .split("\n")
      .map((line) => (line.trim() ? `- ${line.replace(/^- /, "")}` : "- "))
      .join("\n");
    const nextValue = `${body.slice(0, start)}${transformed}${body.slice(end)}`;
    setBody(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + transformed.length);
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const maxSizeInBytes = postType === "video" ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setError(postType === "video" ? "Video must be 25 MB or smaller." : "Image must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    event.target.value = "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = baseSchema.safeParse({ title, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter valid post details.");
      return;
    }

    const trimmedTitle = parsed.data.title.trim();
    const trimmedBody = parsed.data.body.trim();
    const validPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);

    if ((postType === "image" || postType === "video") && !selectedFile) {
      setError(`Choose a ${postType} file before publishing.`);
      return;
    }

    if (postType === "poll") {
      if (!trimmedTitle) {
        setError("Poll posts require a question.");
        return;
      }

      if (validPollOptions.length < 2) {
        setError("Poll posts require at least two options.");
        return;
      }
    }

    if (postType === "text" && !trimmedBody) {
      setError("Text posts require content.");
      return;
    }

    setSubmitting(true);
    let mediaUrl: string | null = null;

    if (selectedFile) {
      const uploadResult = await uploadPostMedia(userId, selectedFile);
      if (uploadResult.error || !uploadResult.data) {
        setSubmitting(false);
        setError(uploadResult.error ?? "Media upload failed.");
        return;
      }

      mediaUrl = uploadResult.data.publicUrl;
    }

    const serializedBody = serializeRichPostPayload({
      version: 1,
      title: trimmedTitle || null,
      body: trimmedBody || null,
      style: richStyle
    });

    const result = await createFeedPost(userId, {
      postType,
      title: trimmedTitle || null,
      body: serializedBody,
      plainBody: trimmedBody || null,
      mediaUrl,
      isPublished: true,
      pollOptions: postType === "poll" ? validPollOptions : []
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    resetComposer();
    setMessage("Post published to the feed.");
    await onPublished();
  };

  const hasPreviewContent = Boolean(title.trim() || body.trim());
  const richPreviewStyle = getRichPostStyleVars(richStyle, postType === "text") as CSSProperties;

  return (
    <section className={`editor-panel ${variant === "feed" ? "editor-panel--feed" : ""} ${className ?? ""}`.trim()}>
      {showHeader ? (
        <div className="editor-panel__header">
          <div>
            <span className="section-heading__eyebrow">Posting</span>
            <h2>{variant === "feed" ? "New post" : "Feed composer"}</h2>
          </div>
          {variant === "feed" ? (
            <button
              className="solid-button"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {isExpanded ? "Close" : "Start Post"}
            </button>
          ) : null}
        </div>
      ) : null}

      {variant === "feed" && !isExpanded ? (
        <div className="feed-composer-trigger">
          <button
            className="feed-composer-trigger__button"
            onClick={() => setExpanded(true)}
            type="button"
          >
            Share an update
          </button>
          <div className="feed-composer-trigger__actions">
            {postOptions.map((option) => (
              <button
                className="ghost-button"
                key={option.value}
                onClick={() => {
                  setPostType(option.value);
                  setExpanded(true);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {variant === "feed" && !isExpanded ? null : (
      <form className="dashboard-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-message auth-message--error">{error}</div> : null}
        {message ? <div className="auth-message auth-message--info">{message}</div> : null}

        {showTypeSelector ? (
          <div className="composer-type-grid">
            {postOptions.map((option) => (
              <button
                className={`composer-type ${postType === option.value ? "composer-type--active" : ""}`}
                key={option.value}
                onClick={() => {
                  setPostType(option.value);
                  setError(null);
                  setMessage(null);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {postType === "poll" ? (
          <label className="dashboard-form__full">
            Poll Question
            <input
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What do you want your audience to choose?"
              type="text"
              value={title}
            />
          </label>
        ) : null}

        {postType !== "poll" ? (
          <label className="dashboard-form__full">
            Title
            <input
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add an optional title"
              type="text"
              value={title}
            />
          </label>
        ) : null}

        {postType === "image" || postType === "video" ? (
          <label className="dashboard-form__full">
            {postType === "video" ? "Video" : "Image"}
            <div className="media-uploader">
              <div className="upload-panel">
                <div className="upload-panel__header">
                  <div>
                    <span className="upload-panel__eyebrow">{postType === "video" ? "Video Post" : "Image Post"}</span>
                    <strong>{selectedFile ? selectedFile.name : `Choose a ${postType} to publish`}</strong>
                    <p>
                      {postType === "video"
                        ? "Portrait, square, and landscape videos are supported."
                        : "Upload from gallery or camera."}
                    </p>
                  </div>
                  {selectedFile ? (
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setError(null);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                {previewUrl ? (
                  <div className={`upload-panel__preview-frame upload-panel__preview-frame--${postType}`}>
                    {postType === "video" ? (
                      <video className="media-uploader__preview" controls src={previewUrl} />
                    ) : (
                      <img alt="Selected post preview" className="media-uploader__preview" src={previewUrl} />
                    )}
                  </div>
                ) : (
                  <button
                    className="upload-panel__dropzone"
                    onClick={() => libraryInputRef.current?.click()}
                    type="button"
                  >
                    <span aria-hidden="true" className="upload-panel__dropzone-icon">
                      +
                    </span>
                    <strong>Select from gallery</strong>
                    <span>{postType === "video" ? "MP4, WebM, MOV" : "PNG, JPG, WEBP"}</span>
                  </button>
                )}

                <div className="upload-panel__actions">
                  <button
                    className="solid-button"
                    disabled={isSubmitting}
                    onClick={() => libraryInputRef.current?.click()}
                    type="button"
                  >
                    {selectedFile ? "Replace from gallery" : "From Gallery"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={isSubmitting}
                    onClick={() => cameraInputRef.current?.click()}
                    type="button"
                  >
                    Camera Upload
                  </button>
                </div>

                <input accept={mediaAccept} hidden onChange={handleFileChange} ref={libraryInputRef} type="file" />
                <input
                  accept={cameraAccept}
                  capture={postType === "video" ? "environment" : "user"}
                  hidden
                  onChange={handleFileChange}
                  ref={cameraInputRef}
                  type="file"
                />
              </div>
            </div>
          </label>
        ) : null}

        {postType === "poll" ? (
          <div className="dashboard-form__full poll-editor">
            <span>Poll Options</span>
            {pollOptions.map((option, index) => (
              <input
                key={`${index}-${postType}`}
                onChange={(event) =>
                  setPollOptions((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index ? event.target.value : entry
                    )
                  )
                }
                placeholder={`Option ${index + 1}`}
                type="text"
                value={option}
              />
            ))}
            {pollOptions.length < 4 ? (
              <button
                className="ghost-button"
                onClick={() => setPollOptions((current) => [...current, ""])}
                type="button"
              >
                Add Option
              </button>
            ) : null}
          </div>
        ) : null}

        {postType === "text" || postType === "poll" ? (
          <label className="dashboard-form__full">
            {postType === "text" ? "Formatted Text" : "Context / Description"}
            <div className="composer-format-toolbar" role="toolbar" aria-label="Text formatting controls">
              <button className="composer-format-button" onClick={() => wrapBodySelection("**", "**", "bold")} type="button">
                Bold
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("*", "*", "italic")} type="button">
                Italic
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("++", "++", "underline")} type="button">
                Underline
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("~~", "~~", "strike")} type="button">
                Strike
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("`", "`", "code")} type="button">
                Code
              </button>
              <button className="composer-format-button" onClick={addListToSelection} type="button">
                List
              </button>
            </div>
            <textarea
              ref={bodyTextareaRef}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                postType === "text"
                  ? "Use **bold**, *italic*, ++underline++, ~~strike~~, `code`, and - list items."
                  : "Add optional context for the poll."
              }
              rows={postType === "text" ? 8 : 4}
              value={body}
            />
          </label>
        ) : null}

        {postType === "image" || postType === "video" ? (
          <label className="dashboard-form__full">
            Caption
            <div className="composer-format-toolbar" role="toolbar" aria-label="Caption formatting controls">
              <button className="composer-format-button" onClick={() => wrapBodySelection("**", "**", "bold")} type="button">
                Bold
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("*", "*", "italic")} type="button">
                Italic
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("++", "++", "underline")} type="button">
                Underline
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("~~", "~~", "strike")} type="button">
                Strike
              </button>
              <button className="composer-format-button" onClick={() => wrapBodySelection("`", "`", "code")} type="button">
                Code
              </button>
              <button className="composer-format-button" onClick={addListToSelection} type="button">
                List
              </button>
            </div>
            <textarea
              ref={bodyTextareaRef}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write a caption for the media post."
              rows={4}
              value={body}
            />
          </label>
        ) : null}

        <div className="dashboard-form__full composer-style-panel">
          <div className="composer-style-panel__header">
            <span>Style</span>
          </div>

          <div className="composer-style-grid">
            <label>
              Title font
              <select
                onChange={(event) =>
                  setRichStyle((current) => ({
                    ...current,
                    titleFont: event.target.value as RichPostStyle["titleFont"]
                  }))
                }
                value={richStyle.titleFont}
              >
                {titleFontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Title weight
              <select
                onChange={(event) =>
                  setRichStyle((current) => ({
                    ...current,
                    titleWeight: Number(event.target.value) as RichPostStyle["titleWeight"]
                  }))
                }
                value={richStyle.titleWeight}
              >
                {titleWeightOptions.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Body weight
              <select
                onChange={(event) =>
                  setRichStyle((current) => ({
                    ...current,
                    bodyWeight: Number(event.target.value) as RichPostStyle["bodyWeight"]
                  }))
                }
                value={richStyle.bodyWeight}
              >
                {bodyWeightOptions.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Text align
              <div className="composer-align-group">
                {textAlignOptions.map((option) => (
                  <button
                    className={`composer-align-button${richStyle.textAlign === option ? " composer-align-button--active" : ""}`}
                    key={option}
                    onClick={() => setRichStyle((current) => ({ ...current, textAlign: option }))}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </label>

            <label>
              Title size
              <input
                max="42"
                min="20"
                onChange={(event) =>
                  setRichStyle((current) => ({
                    ...current,
                    titleSize: Number(event.target.value)
                  }))
                }
                type="range"
                value={richStyle.titleSize}
              />
              <span className="composer-style-value">{richStyle.titleSize}px</span>
            </label>

            <label>
              Body size
              <input
                max="24"
                min="14"
                onChange={(event) =>
                  setRichStyle((current) => ({
                    ...current,
                    bodySize: Number(event.target.value)
                  }))
                }
                type="range"
                value={richStyle.bodySize}
              />
              <span className="composer-style-value">{richStyle.bodySize}px</span>
            </label>

            <label>
              Title color
              <input
                onChange={(event) => setRichStyle((current) => ({ ...current, titleColor: event.target.value }))}
                type="color"
                value={richStyle.titleColor}
              />
            </label>

            <label>
              Body color
              <input
                onChange={(event) => setRichStyle((current) => ({ ...current, bodyColor: event.target.value }))}
                type="color"
                value={richStyle.bodyColor}
              />
            </label>
          </div>

          {postType === "text" ? (
            <div className="composer-style-grid composer-style-grid--background">
              <label>
                Background
                <select
                  onChange={(event) =>
                    setRichStyle((current) => ({
                      ...current,
                      backgroundMode: event.target.value as RichPostStyle["backgroundMode"]
                    }))
                  }
                  value={richStyle.backgroundMode}
                >
                  <option value="none">None</option>
                  <option value="solid">Solid</option>
                  <option value="gradient">Gradient</option>
                </select>
              </label>

              {richStyle.backgroundMode !== "none" ? (
                <>
                  <label>
                    Background color
                    <input
                      onChange={(event) =>
                        setRichStyle((current) => ({
                          ...current,
                          backgroundColor: event.target.value
                        }))
                      }
                      type="color"
                      value={richStyle.backgroundColor}
                    />
                  </label>

                  {richStyle.backgroundMode === "gradient" ? (
                    <label>
                      Gradient color
                      <input
                        onChange={(event) =>
                          setRichStyle((current) => ({
                            ...current,
                            backgroundColorSecondary: event.target.value
                          }))
                        }
                        type="color"
                        value={richStyle.backgroundColorSecondary}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasPreviewContent ? (
          <div className="dashboard-form__full text-preview">
            <span>Preview</span>
            <div
              className={`rich-post-surface${postType === "text" ? " rich-post-surface--text" : ""}`}
              style={richPreviewStyle}
            >
              {title.trim() ? <h3 className="rich-post-surface__title">{title.trim()}</h3> : null}
              {body.trim() ? (
                <div
                  className="rich-post-surface__body"
                  dangerouslySetInnerHTML={{ __html: renderFormattedText(body.trim()) }}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        <button className="solid-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Publishing..." : "Publish Post"}
        </button>
      </form>
      )}
    </section>
  );
};
