import { Link, useSearchParams } from "react-router-dom";
import { CreateOptionsMenu } from "../components/create/CreateOptionsMenu";
import { PostComposer } from "../components/dashboard/PostComposer";
import { ShortsComposerForm } from "../components/shorts/ShortsComposerForm";
import { StoryComposer } from "../components/stories/StoryComposer";
import { createOptions, isCreateOptionId, isFeedComposerType, type CreateOptionId } from "../lib/createOptions";
import { useAuth } from "../providers/AuthProvider";

const getDefaultCreateType = (value: string | null): CreateOptionId =>
  isCreateOptionId(value) ? value : "image";

export const CreatePage = () => {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeType = getDefaultCreateType(searchParams.get("type"));
  const activeOption = createOptions.find((option) => option.id === activeType) ?? createOptions[0];

  if (!user) {
    return null;
  }

  return (
    <section className="create-page">
      <div className="create-page__bar">
        <div>
          <span className="section-heading__eyebrow">Create</span>
          <h1>Publish</h1>
        </div>
        <div className="create-page__bar-actions">
          <Link className="ghost-button" to="/feed">
            Back to feed
          </Link>
          <Link className="ghost-button" to={profile?.role === "creator" ? "/dashboard#posting" : "/dashboard"}>
            Dashboard
          </Link>
        </div>
      </div>

      <div className="create-page__picker">
        <CreateOptionsMenu activeId={activeType} className="create-page__options" />
      </div>

      <section className="create-surface">
        <div className="create-surface__meta">
          <span className="section-heading__eyebrow">{activeOption.label}</span>
        </div>

        {isFeedComposerType(activeType) ? (
          <PostComposer
            className="editor-panel--create"
            initialPostType={activeType}
            key={activeType}
            onPublished={async () => undefined}
            showHeader={false}
            showTypeSelector={false}
            userId={user.id}
          />
        ) : null}

        {activeType === "short" ? (
          <div className="create-surface__module create-surface__module--shorts">
            <ShortsComposerForm onCreated={async () => undefined} userId={user.id} />
          </div>
        ) : null}

        {activeType === "story" ? (
          <div className="create-surface__module">
            <StoryComposer onCreated={async () => undefined} userId={user.id} />
          </div>
        ) : null}
      </section>
    </section>
  );
};
