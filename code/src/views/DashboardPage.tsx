import { useEffect, useMemo, useRef, useState } from "react";
import { CreatorAccessPanel } from "../components/dashboard/CreatorAccessPanel";
import { Link, Navigate, useLocation } from "react-router-dom";
import { CreatorStudio } from "../components/dashboard/CreatorStudio";
import { PostComposer } from "../components/dashboard/PostComposer";
import { ProfileEditor } from "../components/dashboard/ProfileEditor";
import { getIdentityNameClass } from "../lib/identity";
import {
  createArtistCommunity,
  fetchCommunityMembers,
  fetchCreatorCommunityAccess,
  fetchOwnCreatorProfile,
  fetchProfileFollowers,
  fetchProfileSubscribers,
  inviteCommunityMembers,
  removeCommunityMember,
  setCommunityMemberRole,
  updateArtistCommunity
} from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import type { CommunityMember, CreatorCommunity, CreatorProfile, ProfileConnectionItem } from "../types/auth";

export const DashboardPage = () => {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  const postingSectionRef = useRef<HTMLDivElement | null>(null);
  const verificationSectionRef = useRef<HTMLDivElement | null>(null);
  const communitySectionRef = useRef<HTMLDivElement | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [isLoadingCreatorProfile, setLoadingCreatorProfile] = useState(false);
  const [community, setCommunity] = useState<CreatorCommunity | null>(null);
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>([]);
  const [inviteCandidates, setInviteCandidates] = useState<ProfileConnectionItem[]>([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [fanInteractionsEnabled, setFanInteractionsEnabled] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [communityInfo, setCommunityInfo] = useState<string | null>(null);
  const [isLoadingCommunity, setLoadingCommunity] = useState(false);
  const [isSavingCommunity, setSavingCommunity] = useState(false);

  const loadCreatorProfile = async () => {
    if (!user || profile?.role !== "creator") {
      setCreatorProfile(null);
      return;
    }

    setLoadingCreatorProfile(true);
    const result = await fetchOwnCreatorProfile(user.id);
    setLoadingCreatorProfile(false);

    if (result.data) {
      setCreatorProfile(result.data);
      return;
    }

    setCreatorProfile(null);
  };

  const loadCreatorCommunity = async () => {
    if (!user || profile?.role !== "creator") {
      setCommunity(null);
      setCommunityMembers([]);
      setInviteCandidates([]);
      setSelectedInviteIds([]);
      return;
    }

    setLoadingCommunity(true);
    setCommunityError(null);
    const [communityResult, followersResult, subscribersResult] = await Promise.all([
      fetchCreatorCommunityAccess(user.id),
      fetchProfileFollowers(user.id),
      fetchProfileSubscribers(user.id)
    ]);

    let loadedMembers: CommunityMember[] = [];

    if (communityResult.data?.community_id) {
      const membersResult = await fetchCommunityMembers(communityResult.data.community_id);

      if (membersResult.error) {
        setCommunityError(membersResult.error);
      } else {
        loadedMembers = membersResult.data;
        setCommunityMembers(membersResult.data);
      }
    } else {
      setCommunityMembers([]);
    }

    setLoadingCommunity(false);

    if (communityResult.error || followersResult.error || subscribersResult.error) {
      setCommunityError(
        communityResult.error ?? followersResult.error ?? subscribersResult.error ?? "Unable to load community."
      );
    }

    setCommunity(communityResult.data);
    setCommunityName(communityResult.data?.name ?? "");
    setCommunityDescription(communityResult.data?.description ?? "");
    setFanInteractionsEnabled(Boolean(communityResult.data?.fan_interactions_enabled));

    const blockedInviteIds = new Set(
      loadedMembers
        .filter((member) => member.status === "active" || member.status === "invited")
        .map((member) => member.user_id)
    );
    const dedupedCandidates = Array.from(
      new Map(
        [...followersResult.data, ...subscribersResult.data]
          .filter((candidate) => !blockedInviteIds.has(candidate.id))
          .map((candidate) => [candidate.id, candidate])
      ).values()
    );

    setInviteCandidates(dedupedCandidates);
    setSelectedInviteIds(dedupedCandidates.map((candidate) => candidate.id));
  };

  useEffect(() => {
    void loadCreatorProfile();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    void loadCreatorCommunity();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!communityInfo) {
      return;
    }

    const timer = window.setTimeout(() => setCommunityInfo(null), 2400);
    return () => window.clearTimeout(timer);
  }, [communityInfo]);

  useEffect(() => {
    if (profile?.role !== "creator") {
      return;
    }

    const targetRef =
      location.hash === "#posting"
        ? postingSectionRef
        : location.hash === "#community"
          ? communitySectionRef
        : location.hash === "#verification"
          ? verificationSectionRef
          : null;

    if (!targetRef) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, profile?.role]);

  if (!profile || !user) {
    return null;
  }

  if (profile.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  const activeCommunityMembers = useMemo(
    () => communityMembers.filter((member) => member.status === "active"),
    [communityMembers]
  );
  const invitedCommunityMembers = useMemo(
    () => communityMembers.filter((member) => member.status === "invited"),
    [communityMembers]
  );

  const handleCreateCommunity = async () => {
    const trimmedName = communityName.trim();

    if (!trimmedName) {
      setCommunityError("Community name is required.");
      return;
    }

    setSavingCommunity(true);
    setCommunityError(null);
    const result = await createArtistCommunity(trimmedName, communityDescription);
    setSavingCommunity(false);

    if (result.error) {
      setCommunityError(result.error);
      return;
    }

    setCommunityInfo("Community created.");
    await loadCreatorCommunity();
  };

  const handleSaveCommunity = async () => {
    if (!community) {
      return;
    }

    const trimmedName = communityName.trim();

    if (!trimmedName) {
      setCommunityError("Community name is required.");
      return;
    }

    setSavingCommunity(true);
    setCommunityError(null);
    const result = await updateArtistCommunity({
      communityId: community.community_id,
      communityName: trimmedName,
      communityDescription,
      enableFanInteractions: fanInteractionsEnabled
    });
    setSavingCommunity(false);

    if (result.error) {
      setCommunityError(result.error);
      return;
    }

    setCommunityInfo("Community updated.");
    await loadCreatorCommunity();
  };

  const handleInviteMembers = async () => {
    if (!community || selectedInviteIds.length === 0) {
      setCommunityError("Select at least one follower or subscriber to invite.");
      return;
    }

    setSavingCommunity(true);
    setCommunityError(null);
    const result = await inviteCommunityMembers(community.community_id, selectedInviteIds);
    setSavingCommunity(false);

    if (result.error) {
      setCommunityError(result.error);
      return;
    }

    setCommunityInfo(`${result.data} invite${result.data === 1 ? "" : "s"} sent.`);
    await loadCreatorCommunity();
  };

  const handleToggleInvite = (profileId: string) => {
    setSelectedInviteIds((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId]
    );
  };

  const handleToggleModerator = async (member: CommunityMember) => {
    if (!community) {
      return;
    }

    setSavingCommunity(true);
    setCommunityError(null);
    const result = await setCommunityMemberRole(
      community.community_id,
      member.user_id,
      member.role === "moderator" ? "member" : "moderator"
    );
    setSavingCommunity(false);

    if (result.error) {
      setCommunityError(result.error);
      return;
    }

    setCommunityInfo(member.role === "moderator" ? "Moderator removed." : "Moderator added.");
    await loadCreatorCommunity();
  };

  const handleRemoveMember = async (member: CommunityMember) => {
    if (!community) {
      return;
    }

    setSavingCommunity(true);
    setCommunityError(null);
    const result = await removeCommunityMember(community.community_id, member.user_id);
    setSavingCommunity(false);

    if (result.error) {
      setCommunityError(result.error);
      return;
    }

    setCommunityInfo("Member removed.");
    await loadCreatorCommunity();
  };

  return (
    <section className="dashboard-page">
      <header className="dashboard-page__header">
        <div className="dashboard-page__title">
          <span className="section-heading__eyebrow">Dashboard</span>
          <h1>{profile.role === "creator" ? "Creator Dashboard" : "Dashboard"}</h1>
          <p>
            Signed in as <span className={getIdentityNameClass(profile.role)}>{profile.full_name}</span>
          </p>
        </div>
        <div className="dashboard-page__actions">
          <Link className="ghost-button" to={`/profiles/${user.id}`}>
            View Profile
          </Link>
          <Link className="ghost-button" to="/settings">
            Settings
          </Link>
          {profile.role === "creator" && creatorProfile?.is_published ? (
            <Link className="ghost-button" to={`/creators/${creatorProfile.slug}`}>
              Public Page
            </Link>
          ) : null}
          <button className="ghost-button" onClick={() => void signOut()} type="button">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-summary dashboard-summary--compact">
        <article className="dashboard-summary__card">
          <span>Role</span>
          <strong className="dashboard-summary__value">
            {profile.role}
            {profile.is_verified_artist ? <VerifiedArtistBadge /> : null}
          </strong>
        </article>
        <article className="dashboard-summary__card">
          <span>Email</span>
          <strong>{profile.email ?? user.email ?? "Unavailable"}</strong>
        </article>
        <article className="dashboard-summary__card">
          <span>Username</span>
          <strong>{profile.username ?? "Not set"}</strong>
        </article>
        <article className="dashboard-summary__card">
          <span>{profile.role === "creator" ? "Creator page" : "Account status"}</span>
          <strong>
            {profile.role === "creator"
              ? creatorProfile?.is_published
                ? "Published"
                : "Draft"
              : "Visitor"}
          </strong>
        </article>
      </div>

      <div className="dashboard-workspace">
        <div className="dashboard-workspace__main">
          <ProfileEditor profile={profile} userId={user.id} onProfileSaved={refreshProfile} />

          {profile.role === "creator" ? (
            <>
              <div className="dashboard-anchor-target dashboard-section" id="posting" ref={postingSectionRef}>
                <div className="dashboard-section__heading">
                  <div>
                    <span className="section-heading__eyebrow">Publishing</span>
                    <h2>Feed posts</h2>
                  </div>
                  <div className="dashboard-section__actions">
                    <Link className="ghost-button" to="/create">
                      Reels & Stories
                    </Link>
                  </div>
                </div>
                <PostComposer onPublished={loadCreatorProfile} showHeader={false} userId={user.id} />
              </div>
              <CreatorStudio
                creatorProfile={creatorProfile}
                defaultName={profile.full_name}
                onSaved={loadCreatorProfile}
                userId={user.id}
              />
              <section
                className="dashboard-anchor-target dashboard-section dashboard-section--community"
                id="community"
                ref={communitySectionRef}
              >
                <div className="dashboard-section__heading">
                  <div>
                    <span className="section-heading__eyebrow">Community</span>
                    <h2>Artist community</h2>
                  </div>
                </div>

                {communityError ? <div className="auth-message auth-message--error">{communityError}</div> : null}
                {communityInfo ? <div className="auth-message auth-message--info">{communityInfo}</div> : null}

                <article className="dashboard-card dashboard-card--compact dashboard-community-card">
                  <div className="dashboard-community-card__form">
                    <label className="dashboard-field">
                      <span>Community name</span>
                      <input
                        onChange={(event) => setCommunityName(event.target.value)}
                        placeholder="The Developer Community"
                        value={communityName}
                      />
                    </label>
                    <label className="dashboard-field">
                      <span>Description</span>
                      <textarea
                        onChange={(event) => setCommunityDescription(event.target.value)}
                        placeholder="A broadcast space for your fans, updates, and drops."
                        rows={3}
                        value={communityDescription}
                      />
                    </label>
                    <label className="settings-toggle dashboard-community-card__toggle">
                      <input
                        checked={fanInteractionsEnabled}
                        onChange={(event) => setFanInteractionsEnabled(event.target.checked)}
                        type="checkbox"
                      />
                      <span>
                        <strong>Fan interactions</strong>
                        <small>Allow members to message, reply, and react inside the community.</small>
                      </span>
                    </label>
                    <div className="dashboard-section__actions">
                      {community ? (
                        <button
                          className="solid-button"
                          disabled={isSavingCommunity}
                          onClick={() => void handleSaveCommunity()}
                          type="button"
                        >
                          Save community
                        </button>
                      ) : (
                        <button
                          className="solid-button"
                          disabled={isSavingCommunity}
                          onClick={() => void handleCreateCommunity()}
                          type="button"
                        >
                          Create community
                        </button>
                      )}
                      {community ? (
                        <Link className="ghost-button" to={`/messages?community=${community.community_id}`}>
                          Open inbox
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>

                {community ? (
                  <>
                    <article className="dashboard-card dashboard-card--compact dashboard-community-card">
                      <div className="dashboard-community-card__header">
                        <div>
                          <span className="section-heading__eyebrow">Invites</span>
                          <h2>Followers and subscribers</h2>
                        </div>
                        <strong>{community.member_count} members</strong>
                      </div>
                      {isLoadingCommunity ? <p>Loading community roster...</p> : null}
                      {inviteCandidates.length === 0 ? (
                        <p>No eligible followers or subscribers to invite right now.</p>
                      ) : (
                        <>
                          <div className="dashboard-community-picker">
                            {inviteCandidates.map((candidate) => (
                              <label className="dashboard-community-picker__item" key={candidate.id}>
                                <input
                                  checked={selectedInviteIds.includes(candidate.id)}
                                  onChange={() => handleToggleInvite(candidate.id)}
                                  type="checkbox"
                                />
                                <span>
                                  <strong>{candidate.username ? `@${candidate.username}` : candidate.full_name}</strong>
                                  <small>{candidate.headline ?? candidate.role}</small>
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="dashboard-section__actions">
                            <button
                              className="solid-button"
                              disabled={isSavingCommunity || selectedInviteIds.length === 0}
                              onClick={() => void handleInviteMembers()}
                              type="button"
                            >
                              Send invites
                            </button>
                          </div>
                        </>
                      )}
                    </article>

                    <article className="dashboard-card dashboard-card--compact dashboard-community-card">
                      <div className="dashboard-community-card__header">
                        <div>
                          <span className="section-heading__eyebrow">Members</span>
                          <h2>Community roster</h2>
                        </div>
                        <strong>{activeCommunityMembers.length} active</strong>
                      </div>
                      <div className="dashboard-community-roster">
                        {[...activeCommunityMembers, ...invitedCommunityMembers].map((member) => (
                          <div className="dashboard-community-roster__item" key={member.user_id}>
                            <div>
                              <strong>
                                {member.username ? `@${member.username}` : member.full_name}
                              </strong>
                              <small>
                                {member.role} • {member.status}
                              </small>
                            </div>
                            {member.role !== "admin" ? (
                              <div className="dashboard-community-roster__actions">
                                {member.status === "active" ? (
                                  <button
                                    className="ghost-button"
                                    disabled={isSavingCommunity}
                                    onClick={() => void handleToggleModerator(member)}
                                    type="button"
                                  >
                                    {member.role === "moderator" ? "Remove mod" : "Make mod"}
                                  </button>
                                ) : null}
                                <button
                                  className="ghost-button"
                                  disabled={isSavingCommunity}
                                  onClick={() => void handleRemoveMember(member)}
                                  type="button"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </article>
                  </>
                ) : null}
              </section>
            </>
          ) : (
            <article className="dashboard-card dashboard-card--compact">
              <span className="section-heading__eyebrow">Visitor</span>
              <h2>Account ready</h2>
              <p>Use this account for browsing, follows, saves, and upgrades when needed.</p>
            </article>
          )}
        </div>

        <aside className="dashboard-workspace__side">
          <div className="dashboard-anchor-target" id="verification" ref={verificationSectionRef}>
            <CreatorAccessPanel
              creatorProfile={creatorProfile}
              onRefreshCreatorProfile={loadCreatorProfile}
              onRefreshProfile={refreshProfile}
              profile={profile}
            />
          </div>

          {profile.role === "creator" ? (
            <article className="dashboard-card dashboard-card--compact dashboard-utility-card">
              <div className="dashboard-utility-card__header">
                <div>
                  <span className="section-heading__eyebrow">Create</span>
                  <h2>Shortcuts</h2>
                </div>
              </div>
              <div className="dashboard-utility-card__actions">
                <Link className="solid-button" to="/create">
                  Open Create
                </Link>
                {creatorProfile?.is_published && creatorProfile.slug ? (
                  <Link className="ghost-button" to={`/creators/${creatorProfile.slug}`}>
                    Public page
                  </Link>
                ) : null}
              </div>
            </article>
          ) : null}

          {profile.role === "creator" && isLoadingCreatorProfile ? (
            <article className="dashboard-card dashboard-card--compact">
              <p>Loading creator settings...</p>
            </article>
          ) : null}
        </aside>
      </div>
    </section>
  );
};
