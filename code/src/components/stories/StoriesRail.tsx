import { VerifiedArtistBadge } from "../shared/VerifiedArtistBadge";
import { ProfileAvatar } from "../shared/ProfileAvatar";
import { getIdentityNameClass } from "../../lib/identity";
import type { Profile, StoryGroup } from "../../types/auth";

type StoriesRailProps = {
  groups: StoryGroup[];
  profile: Profile | null;
  onOpenGroup: (authorId: string) => void;
  onCreateStory: () => void;
};

export const StoriesRail = ({
  groups,
  profile,
  onOpenGroup,
  onCreateStory
}: StoriesRailProps) => {
  const ownGroup = profile ? groups.find((group) => group.author_id === profile.id) ?? null : null;
  const otherGroups = profile ? groups.filter((group) => group.author_id !== profile.id) : groups;

  return (
    <section className="stories-rail" aria-label="Stories">
      <div className="stories-rail__scroll">
        <div className="stories-rail__item stories-rail__item--create">
          <button
            className="stories-rail__trigger"
            onClick={() => {
              if (ownGroup) {
                onOpenGroup(ownGroup.author_id);
                return;
              }

              onCreateStory();
            }}
            type="button"
          >
            <span className={`stories-rail__ring${ownGroup ? (ownGroup.has_unviewed ? " stories-rail__ring--fresh" : " stories-rail__ring--seen") : ""}`}>
              <ProfileAvatar
                alt={profile?.full_name ?? "Your story"}
                className="stories-rail__avatar"
                name={profile?.full_name ?? "You"}
                src={profile?.avatar_url}
              />
            </span>
            <span className="stories-rail__label">{ownGroup ? "Your Story" : "Add Story"}</span>
          </button>
          <button className="stories-rail__plus" onClick={onCreateStory} type="button">
            +
          </button>
        </div>

        {otherGroups.map((group) => (
          <button
            className="stories-rail__item"
            key={group.author_id}
            onClick={() => onOpenGroup(group.author_id)}
            type="button"
          >
            <span className={`stories-rail__ring${group.has_unviewed ? " stories-rail__ring--fresh" : " stories-rail__ring--seen"}`}>
              <ProfileAvatar
                alt={group.full_name}
                className="stories-rail__avatar"
                name={group.full_name}
                src={group.avatar_url ?? group.items[group.items.length - 1]?.thumbnail_url ?? group.items[group.items.length - 1]?.media_url}
              />
            </span>
            <span className="stories-rail__label">
              <span className={getIdentityNameClass(group.author_role)}>{group.username ? `@${group.username}` : group.full_name}</span>
              {group.is_verified_artist ? <VerifiedArtistBadge /> : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
