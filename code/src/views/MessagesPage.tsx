import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProfileAvatar } from "../components/shared/ProfileAvatar";
import {
  fetchCommunityMembers,
  fetchCommunityMessages,
  fetchCommunityPreviews,
  fetchDirectMessages,
  fetchInboxThreads,
  fetchProfileFollowers,
  fetchProfileSubscribers,
  inviteCommunityMembers,
  leaveArtistCommunity,
  markCommunityRead,
  markThreadRead,
  removeCommunityMember,
  respondToCommunityInvite,
  setCommunityMemberRole,
  sendCommunityMessage,
  sendDirectMessage,
  toggleCommunityMessageReaction,
  updateArtistCommunity
} from "../lib/profile";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import { getIdentityNameClass } from "../lib/identity";
import { getSupabaseClient } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import type {
  CommunityMember,
  CommunityMessage,
  CommunityPreview,
  DirectMessage,
  InboxThread,
  ProfileConnectionItem
} from "../types/auth";

const COMMUNITY_REACTIONS = ["\u2764\uFE0F", "\uD83D\uDD25", "\uD83D\uDC4F"] as const;
const INBOX_FILTERS = [
  { label: "All", value: "all" },
  { label: "Groups", value: "communities" },
  { label: "Chats", value: "direct" }
] as const;

type InboxFilter = (typeof INBOX_FILTERS)[number]["value"];

type CommunityInviteCandidate = ProfileConnectionItem;

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(value))
    : "No messages yet";

const parseSharedReelMessage = (body: string) => {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const reelUrl = lines.find((line) => /^https?:\/\//.test(line) && line.includes("/shorts?reel="));

  if (!reelUrl || lines[0] !== "Shared a reel on ArtBlock") {
    return null;
  }

  return {
    title: lines[1] ?? "Open reel",
    url: reelUrl
  };
};

const renderSharedContent = (body: string) => {
  const sharedReel = parseSharedReelMessage(body);

  if (!sharedReel) {
    return <p>{body}</p>;
  }

  return (
    <div className="message-share-card">
      <span className="message-share-card__eyebrow">Shared Reel</span>
      <strong>{sharedReel.title}</strong>
      <a href={sharedReel.url}>Open in Shorts</a>
    </div>
  );
};

const matchesInboxSearch = (query: string, values: Array<string | null | undefined>) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
};

const parseInboxFilter = (value: string | null): InboxFilter =>
  value === "communities" || value === "direct" ? value : "all";

export const MessagesPage = () => {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [communities, setCommunities] = useState<CommunityPreview[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<CommunityMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>(() => parseInboxFilter(searchParams.get("view")));
  const [isManageSheetOpen, setManageSheetOpen] = useState(false);
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>([]);
  const [inviteCandidates, setInviteCandidates] = useState<CommunityInviteCandidate[]>([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [manageCommunityName, setManageCommunityName] = useState("");
  const [manageCommunityDescription, setManageCommunityDescription] = useState("");
  const [manageFanInteractionsEnabled, setManageFanInteractionsEnabled] = useState(false);
  const [isLoadingManageSheet, setLoadingManageSheet] = useState(false);
  const [isSavingManageSheet, setSavingManageSheet] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageInfo, setManageInfo] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const activeThreadId = searchParams.get("thread");
  const activeCommunityId = searchParams.get("community");
  const requestedView = parseInboxFilter(searchParams.get("view"));
  const activeThread = useMemo(
    () => threads.find((thread) => thread.thread_id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );
  const activeCommunity = useMemo(
    () => communities.find((community) => community.community_id === activeCommunityId) ?? null,
    [communities, activeCommunityId]
  );
  const hasActiveConversation = Boolean(activeThread || activeCommunity);
  const filteredCommunities = useMemo(
    () =>
      communities.filter((community) =>
        matchesInboxSearch(searchQuery, [
          community.name,
          community.description,
          community.creator_full_name,
          community.creator_username,
          community.last_message_body
        ])
      ),
    [communities, searchQuery]
  );
  const filteredThreads = useMemo(
    () =>
      threads.filter((thread) =>
        matchesInboxSearch(searchQuery, [
          thread.peer_full_name,
          thread.peer_username,
          thread.peer_role,
          thread.last_message_body
        ])
      ),
    [threads, searchQuery]
  );
  const visibleCommunities = inboxFilter === "direct" ? [] : filteredCommunities;
  const visibleThreads = inboxFilter === "communities" ? [] : filteredThreads;
  const hasInboxResults = visibleCommunities.length > 0 || visibleThreads.length > 0;
  const isCommunityAdmin = activeCommunity?.viewer_role === "admin";

  useEffect(() => {
    setInboxFilter(requestedView);
  }, [requestedView]);

  const loadSidebar = async () => {
    setLoading(true);
    setError(null);
    const [threadsResult, communitiesResult] = await Promise.all([fetchInboxThreads(), fetchCommunityPreviews()]);
    setLoading(false);

    if (threadsResult.error || communitiesResult.error) {
      setError(threadsResult.error ?? communitiesResult.error ?? "Unable to load inbox.");
      return;
    }

    setThreads(threadsResult.data);
    setCommunities(communitiesResult.data);

    if (!activeThreadId && !activeCommunityId) {
      const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

      if (requestedView === "direct" && threadsResult.data[0]) {
        setSearchParams({ thread: threadsResult.data[0].thread_id, view: "direct" });
      } else if (requestedView === "communities" && communitiesResult.data[0]) {
        setSearchParams({ community: communitiesResult.data[0].community_id, view: "communities" });
      } else if (isDesktop && communitiesResult.data[0]) {
        setSearchParams({ community: communitiesResult.data[0].community_id, view: "communities" });
      } else if (isDesktop && threadsResult.data[0]) {
        setSearchParams({ thread: threadsResult.data[0].thread_id, view: "direct" });
      }
    }
  };

  const loadThreadMessages = async (threadId: string) => {
    setError(null);
    const result = await fetchDirectMessages(threadId);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDirectMessages(result.data);
  };

  const loadCommunityMessageStream = async (communityId: string) => {
    setError(null);
    const result = await fetchCommunityMessages(communityId);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCommunityMessages(result.data);
  };

  const loadManageCommunity = async (community: CommunityPreview) => {
    setLoadingManageSheet(true);
    setManageError(null);

    const [membersResult, followersResult, subscribersResult] = await Promise.all([
      fetchCommunityMembers(community.community_id),
      fetchProfileFollowers(community.creator_id),
      fetchProfileSubscribers(community.creator_id)
    ]);

    setLoadingManageSheet(false);

    if (membersResult.error || followersResult.error || subscribersResult.error) {
      setManageError(
        membersResult.error ?? followersResult.error ?? subscribersResult.error ?? "Unable to load community settings."
      );
      return;
    }

    setCommunityMembers(membersResult.data);
    setManageCommunityName(community.name);
    setManageCommunityDescription(community.description ?? "");
    setManageFanInteractionsEnabled(Boolean(community.fan_interactions_enabled));

    const blockedIds = new Set(
      membersResult.data
        .filter((member) => member.status === "active" || member.status === "invited")
        .map((member) => member.user_id)
    );
    const candidates = Array.from(
      new Map(
        [...followersResult.data, ...subscribersResult.data]
          .filter((item) => !blockedIds.has(item.id))
          .map((item) => [item.id, item])
      ).values()
    );

    setInviteCandidates(candidates);
    setSelectedInviteIds(candidates.map((item) => item.id));
  };

  useEffect(() => {
    void loadSidebar();
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      setCommunityMessages([]);
      setReplyToMessage(null);
      setManageSheetOpen(false);
      void loadThreadMessages(activeThreadId);
      return;
    }

    if (activeCommunityId) {
      setDirectMessages([]);
      void loadCommunityMessageStream(activeCommunityId);
      return;
    }

    setDirectMessages([]);
    setCommunityMessages([]);
    setReplyToMessage(null);
    setManageSheetOpen(false);
  }, [activeThreadId, activeCommunityId]);

  useEffect(() => {
    if (!manageInfo) {
      return;
    }

    const timer = window.setTimeout(() => setManageInfo(null), 2200);
    return () => window.clearTimeout(timer);
  }, [manageInfo]);

  useEffect(() => {
    if (!activeThreadId || !user?.id) {
      return;
    }

    void markThreadRead(activeThreadId).then(() => {
      void loadSidebar();
    });
  }, [activeThreadId, user?.id]);

  useEffect(() => {
    if (!activeCommunityId || !user?.id) {
      return;
    }

    void markCommunityRead(activeCommunityId).then(() => {
      void loadSidebar();
    });
  }, [activeCommunityId, user?.id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [directMessages.length, communityMessages.length, activeThreadId, activeCommunityId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !user?.id) {
      return;
    }

    const threadsChannel = supabase
      .channel(`messages-members-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_thread_members",
          filter: `user_id=eq.${user.id}`
        },
        () => {
          void loadSidebar();
        }
      )
      .subscribe();

    const communitiesChannel = supabase
      .channel(`communities-members-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_memberships",
          filter: `user_id=eq.${user.id}`
        },
        () => {
          void loadSidebar();
        }
      )
      .subscribe();

    const activeThreadChannel =
      activeThreadId
        ? supabase
            .channel(`messages-thread-${activeThreadId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "direct_messages",
                filter: `thread_id=eq.${activeThreadId}`
              },
              () => {
                void Promise.all([loadThreadMessages(activeThreadId), markThreadRead(activeThreadId), loadSidebar()]);
              }
            )
            .subscribe()
        : null;

    const activeCommunityChannel =
      activeCommunityId
        ? supabase
            .channel(`community-thread-${activeCommunityId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "community_messages",
                filter: `community_id=eq.${activeCommunityId}`
              },
              () => {
                void Promise.all([
                  loadCommunityMessageStream(activeCommunityId),
                  markCommunityRead(activeCommunityId),
                  loadSidebar()
                ]);
              }
            )
            .subscribe()
        : null;

    return () => {
      void supabase.removeChannel(threadsChannel);
      void supabase.removeChannel(communitiesChannel);

      if (activeThreadChannel) {
        void supabase.removeChannel(activeThreadChannel);
      }

      if (activeCommunityChannel) {
        void supabase.removeChannel(activeCommunityChannel);
      }
    };
  }, [activeThreadId, activeCommunityId, user?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const trimmed = draft.trim();

    if (!trimmed) {
      setError("Message cannot be empty.");
      return;
    }

    setSending(true);
    setError(null);

    if (activeThreadId) {
      const result = await sendDirectMessage(activeThreadId, user.id, trimmed);
      setSending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDraft("");
      await Promise.all([loadSidebar(), loadThreadMessages(activeThreadId)]);
      return;
    }

    if (activeCommunityId) {
      const result = await sendCommunityMessage({
        communityId: activeCommunityId,
        senderId: user.id,
        body: trimmed,
        parentMessageId: replyToMessage?.id ?? null
      });
      setSending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDraft("");
      setReplyToMessage(null);
      await Promise.all([loadSidebar(), loadCommunityMessageStream(activeCommunityId), markCommunityRead(activeCommunityId)]);
    }
  };

  const handleCommunityInvite = async (acceptInvite: boolean) => {
    if (!activeCommunity) {
      return;
    }

    setSending(true);
    setError(null);
    const result = await respondToCommunityInvite(activeCommunity.community_id, acceptInvite);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await loadSidebar();

    if (!acceptInvite) {
      setSearchParams({});
    }
  };

  const handleLeaveCommunity = async () => {
    if (!activeCommunity) {
      return;
    }

    setSending(true);
    setError(null);
    const result = await leaveArtistCommunity(activeCommunity.community_id);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await loadSidebar();
    setSearchParams({});
  };

  const handleToggleReaction = async (message: CommunityMessage, emoji: string) => {
    if (!user) {
      return;
    }

    setReactionError(null);
    const currentReaction = message.reactions.find((entry) => entry.emoji === emoji);
    const result = await toggleCommunityMessageReaction({
      messageId: message.id,
      userId: user.id,
      emoji,
      currentlyReacted: Boolean(currentReaction?.reacted_by_viewer)
    });

    if (result.error) {
      setReactionError(result.error);
      return;
    }

    if (activeCommunityId) {
      await loadCommunityMessageStream(activeCommunityId);
    }
  };

  const canComposeInCommunity =
    activeCommunity?.viewer_status === "active" && Boolean(activeCommunity.can_send_messages);

  const handleOpenManageSheet = async () => {
    if (!activeCommunity || !isCommunityAdmin) {
      return;
    }

    setManageSheetOpen(true);
    await loadManageCommunity(activeCommunity);
  };

  const handleToggleInviteCandidate = (profileId: string) => {
    setSelectedInviteIds((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId]
    );
  };

  const handleSaveCommunitySettings = async () => {
    if (!activeCommunity) {
      return;
    }

    setSavingManageSheet(true);
    setManageError(null);
    const result = await updateArtistCommunity({
      communityId: activeCommunity.community_id,
      communityName: manageCommunityName.trim() || activeCommunity.name,
      communityDescription: manageCommunityDescription,
      enableFanInteractions: manageFanInteractionsEnabled
    });
    setSavingManageSheet(false);

    if (result.error) {
      setManageError(result.error);
      return;
    }

    setManageInfo("Saved.");
    await Promise.all([loadSidebar(), loadCommunityMessageStream(activeCommunity.community_id)]);
  };

  const handleSendInvites = async () => {
    if (!activeCommunity || selectedInviteIds.length === 0) {
      setManageError("Select at least one person.");
      return;
    }

    setSavingManageSheet(true);
    setManageError(null);
    const result = await inviteCommunityMembers(activeCommunity.community_id, selectedInviteIds);
    setSavingManageSheet(false);

    if (result.error) {
      setManageError(result.error);
      return;
    }

    setManageInfo(`${result.data} sent.`);
    await loadManageCommunity(activeCommunity);
    await loadSidebar();
  };

  const handleToggleModerator = async (member: CommunityMember) => {
    if (!activeCommunity) {
      return;
    }

    setSavingManageSheet(true);
    setManageError(null);
    const result = await setCommunityMemberRole(
      activeCommunity.community_id,
      member.user_id,
      member.role === "moderator" ? "member" : "moderator"
    );
    setSavingManageSheet(false);

    if (result.error) {
      setManageError(result.error);
      return;
    }

    setManageInfo(member.role === "moderator" ? "Moderator removed." : "Moderator added.");
    await loadManageCommunity(activeCommunity);
    await loadSidebar();
  };

  const handleRemoveMember = async (member: CommunityMember) => {
    if (!activeCommunity) {
      return;
    }

    setSavingManageSheet(true);
    setManageError(null);
    const result = await removeCommunityMember(activeCommunity.community_id, member.user_id);
    setSavingManageSheet(false);

    if (result.error) {
      setManageError(result.error);
      return;
    }

    setManageInfo("Removed.");
    await loadManageCommunity(activeCommunity);
    await loadSidebar();
  };

  return (
    <section className="messages-page">
      <div className="messages-shell">
        <aside className={`messages-sidebar ${hasActiveConversation ? "messages-sidebar--hidden-mobile" : ""}`}>
          <div className="messages-sidebar__top">
            <div>
              <span className="section-heading__eyebrow">Inbox</span>
              <h2>Messages</h2>
            </div>
            <div className="messages-sidebar__actions">
              {profile?.role === "creator" ? (
                <Link className="ghost-button" to="/dashboard#community">
                  {communities.length > 0 ? "Community" : "Create community"}
                </Link>
              ) : null}
              <Link className="ghost-button" to="/feed">
                Feed
              </Link>
            </div>
          </div>

          <div className="messages-search">
            <input
              aria-label="Search inbox"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              type="search"
              value={searchQuery}
            />
          </div>

          <div aria-label="Inbox filters" className="messages-filterbar" role="tablist">
            {INBOX_FILTERS.map((filter) => (
              <button
                aria-selected={inboxFilter === filter.value}
                className={`messages-filterbar__button${
                  inboxFilter === filter.value ? " messages-filterbar__button--active" : ""
                }`}
                key={filter.value}
                onClick={() => {
                  setInboxFilter(filter.value);
                  const nextParams = new URLSearchParams(searchParams);

                  if (filter.value === "all") {
                    nextParams.delete("view");
                  } else {
                    nextParams.set("view", filter.value);
                  }

                  setSearchParams(nextParams);
                }}
                role="tab"
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="feed-rail-card">
              <p>Loading inbox...</p>
            </div>
          ) : threads.length === 0 && communities.length === 0 ? (
            <div className="feed-rail-card">
              <h2>No messages yet</h2>
              <p>Start a chat or join a group.</p>
              <Link className="solid-button" to="/feed">
                Back to feed
              </Link>
            </div>
          ) : !hasInboxResults ? (
            <div className="feed-rail-card">
              <h2>No matches</h2>
              <p>Try another search or switch the inbox filter.</p>
            </div>
          ) : (
            <>
              {visibleCommunities.length > 0 ? (
                <div className="messages-thread-group">
                  <div className="messages-thread-group__heading">
                    <span>Groups</span>
                    <small>{visibleCommunities.length}</small>
                  </div>
                  <div className="messages-thread-list">
                    {visibleCommunities.map((community) => (
                      <button
                        className={`messages-thread-card messages-thread-card--community ${
                          community.community_id === activeCommunityId ? "messages-thread-card--active" : ""
                        }`}
                        key={community.community_id}
                        onClick={() => setSearchParams({ community: community.community_id, view: "communities" })}
                        type="button"
                      >
                        <div className="messages-thread-card__avatar">
                          <ProfileAvatar
                            alt={community.name}
                            className="feed-card__avatar"
                            name={community.name}
                            src={community.creator_avatar_url}
                          />
                        </div>
                        <div className="messages-thread-card__body">
                          <div className="messages-thread-card__row">
                            <strong>{community.name}</strong>
                            <div className="messages-thread-card__meta">
                              {community.unread_count > 0 ? (
                                <span className="messages-thread-card__badge">
                                  {community.unread_count > 99 ? "99+" : community.unread_count}
                                </span>
                              ) : null}
                              <span>{formatDate(community.last_message_created_at)}</span>
                            </div>
                          </div>
                          <div className="messages-thread-card__subrow">
                            <span className="messages-thread-chip">
                              {community.viewer_status === "invited" ? "Invite" : "Group"}
                            </span>
                            <span>{community.member_count} members</span>
                          </div>
                          <p>
                            {community.last_message_body ??
                              (community.viewer_status === "invited"
                                ? "Community invite pending."
                                : community.description ?? "Open the community stream.")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {visibleThreads.length > 0 ? (
                <div className="messages-thread-group">
                  <div className="messages-thread-group__heading">
                    <span>Chats</span>
                    <small>{visibleThreads.length}</small>
                  </div>
                  <div className="messages-thread-list">
                    {visibleThreads.map((thread) => (
                      <button
                        className={`messages-thread-card ${
                          thread.thread_id === activeThreadId ? "messages-thread-card--active" : ""
                        }`}
                        key={thread.thread_id}
                        onClick={() => setSearchParams({ thread: thread.thread_id, view: "direct" })}
                        type="button"
                      >
                        <div className="messages-thread-card__avatar">
                          <ProfileAvatar
                            alt={thread.peer_full_name}
                            className="feed-card__avatar"
                            name={thread.peer_full_name}
                            src={thread.peer_avatar_url}
                          />
                        </div>
                        <div className="messages-thread-card__body">
                          <div className="messages-thread-card__row">
                            <strong>
                              <span className={getIdentityNameClass(thread.peer_role)}>
                                {thread.peer_username ? `@${thread.peer_username}` : thread.peer_full_name}
                              </span>
                              {thread.peer_is_verified_artist ? <VerifiedArtistBadge /> : null}
                            </strong>
                            <div className="messages-thread-card__meta">
                              {thread.unread_count > 0 ? (
                                <span className="messages-thread-card__badge">
                                  {thread.unread_count > 99 ? "99+" : thread.unread_count}
                                </span>
                              ) : null}
                              <span>{formatDate(thread.last_message_created_at)}</span>
                            </div>
                          </div>
                          <div className="messages-thread-card__subrow">
                            <span className="messages-thread-chip">Chat</span>
                            <span>{thread.message_count}</span>
                          </div>
                          <p>{thread.last_message_body ?? "Start the conversation."}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </aside>

        <div
          className={`messages-main ${
            hasActiveConversation ? "messages-main--active-mobile" : "messages-main--idle-mobile"
          }`}
        >
          {activeThread ? (
            <>
              <div className="messages-header">
                <div className="messages-header__left">
                  <div className="feed-card__identity">
                    <ProfileAvatar
                      alt={activeThread.peer_full_name}
                      className="feed-card__avatar"
                      name={activeThread.peer_full_name}
                      src={activeThread.peer_avatar_url}
                    />

                    <div>
                      <strong className="profile-name-row">
                        <span className={getIdentityNameClass(activeThread.peer_role)}>{activeThread.peer_full_name}</span>
                        {activeThread.peer_is_verified_artist ? <VerifiedArtistBadge /> : null}
                      </strong>
                      <p>{activeThread.peer_username ? `@${activeThread.peer_username}` : activeThread.peer_role}</p>
                    </div>
                  </div>
                </div>

                <div className="messages-header__actions">
                  <Link className="ghost-button messages-header__profile-link" to={`/profiles/${activeThread.peer_id}`}>
                    Profile
                  </Link>
                </div>
              </div>

              {error ? <div className="auth-message auth-message--error">{error}</div> : null}

              <div className="messages-stream">
                {directMessages.length === 0 ? (
                  <div className="empty-feed">
                    <h2>No messages yet.</h2>
                    <p>Send the first note to start this conversation.</p>
                  </div>
                ) : (
                  directMessages.map((message) => {
                    const isOwn = user?.id === message.sender_id;

                    return (
                      <article className={`message-bubble ${isOwn ? "message-bubble--own" : ""}`} key={message.id}>
                        <strong className={!isOwn ? "profile-name-row" : undefined}>
                          {isOwn ? (
                            "You"
                          ) : (
                            <span className={getIdentityNameClass(message.sender_role)}>
                              {message.username ? `@${message.username}` : message.full_name}
                            </span>
                          )}
                          {!isOwn && message.is_verified_artist ? <VerifiedArtistBadge /> : null}
                        </strong>
                        {renderSharedContent(message.body)}
                        <span>{formatDate(message.created_at)}</span>
                      </article>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <form className="messages-composer" onSubmit={handleSubmit}>
                <div className="messages-composer__row">
                  <textarea
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a direct message"
                    rows={1}
                    value={draft}
                  />
                  <button className="solid-button messages-send-button" disabled={isSending} type="submit">
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : activeCommunity ? (
            <>
              <div className="messages-header">
                <div className="messages-header__left">
                  <div className="feed-card__identity">
                    <ProfileAvatar
                      alt={activeCommunity.name}
                      className="feed-card__avatar"
                      name={activeCommunity.name}
                      src={activeCommunity.creator_avatar_url}
                    />

                    <div>
                      <strong className="profile-name-row">
                        <span>{activeCommunity.name}</span>
                      </strong>
                      <p>{activeCommunity.member_count} members</p>
                    </div>
                  </div>
                </div>

                <div className="messages-header__actions">
                  <Link className="ghost-button messages-header__profile-link" to={`/profiles/${activeCommunity.creator_id}`}>
                    Profile
                  </Link>
                  {isCommunityAdmin ? (
                    <button className="ghost-button messages-header__profile-link" onClick={() => void handleOpenManageSheet()} type="button">
                      Manage
                    </button>
                  ) : null}
                  {activeCommunity.viewer_status === "active" && activeCommunity.viewer_role !== "admin" ? (
                    <button className="ghost-button messages-header__profile-link" onClick={() => void handleLeaveCommunity()} type="button">
                      Leave
                    </button>
                  ) : null}
                </div>
              </div>

              {error ? <div className="auth-message auth-message--error">{error}</div> : null}
              {reactionError ? <div className="auth-message auth-message--error">{reactionError}</div> : null}

              {activeCommunity.viewer_status === "invited" ? (
                <div className="messages-community-banner">
                  <div>
                    <strong>Join this group?</strong>
                    <p>Accept or decline.</p>
                  </div>
                  <div className="messages-community-banner__actions">
                    <button className="ghost-button" disabled={isSending} onClick={() => void handleCommunityInvite(false)} type="button">
                      Decline
                    </button>
                    <button className="solid-button" disabled={isSending} onClick={() => void handleCommunityInvite(true)} type="button">
                      Accept invite
                    </button>
                  </div>
                </div>
              ) : null}

              {activeCommunity.viewer_status === "active" && !activeCommunity.can_send_messages ? (
                <div className="messages-community-banner messages-community-banner--muted">
                  <div>
                    <strong>Interactions off</strong>
                    <p>Only admins and moderators can post.</p>
                  </div>
                </div>
              ) : null}

              <div className="messages-stream">
                {communityMessages.length === 0 ? (
                  <div className="empty-feed">
                    <h2>No posts yet.</h2>
                    <p>Messages will appear here.</p>
                  </div>
                ) : (
                  communityMessages.map((message) => {
                    const isOwn = user?.id === message.sender_id;

                    return (
                      <article className={`message-bubble ${isOwn ? "message-bubble--own" : ""}`} key={message.id}>
                        <strong className={!isOwn ? "profile-name-row" : undefined}>
                          {isOwn ? (
                            "You"
                          ) : (
                            <span className={getIdentityNameClass(message.sender_role)}>
                              {message.username ? `@${message.username}` : message.full_name}
                            </span>
                          )}
                          {!isOwn && message.is_verified_artist ? <VerifiedArtistBadge /> : null}
                        </strong>
                        {message.parent_body ? (
                          <div className="message-reply-preview">
                            <span>
                              Replying to{" "}
                              {message.parent_sender_username
                                ? `@${message.parent_sender_username}`
                                : message.parent_sender_full_name ?? "member"}
                            </span>
                            <strong>{message.parent_body}</strong>
                          </div>
                        ) : null}
                        {renderSharedContent(message.body)}
                        <div className="message-community-actions">
                          <button
                            className="ghost-button"
                            disabled={!canComposeInCommunity}
                            onClick={() => setReplyToMessage(message)}
                            type="button"
                          >
                            Reply
                          </button>
                          <div className="message-reactions">
                            {COMMUNITY_REACTIONS.map((emoji) => {
                              const reaction = message.reactions.find((entry) => entry.emoji === emoji);

                              return (
                                <button
                                  className={`message-reaction-button${
                                    reaction?.reacted_by_viewer ? " message-reaction-button--active" : ""
                                  }`}
                                  disabled={!canComposeInCommunity}
                                  key={emoji}
                                  onClick={() => void handleToggleReaction(message, emoji)}
                                  type="button"
                                >
                                  <span>{emoji}</span>
                                  <small>{reaction?.count ?? 0}</small>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <span>{formatDate(message.created_at)}</span>
                      </article>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {activeCommunity.viewer_status === "active" ? (
                <form className="messages-composer" onSubmit={handleSubmit}>
                  {replyToMessage ? (
                    <div className="messages-reply-chip">
                      <span>
                        Replying to{" "}
                        {replyToMessage.username ? `@${replyToMessage.username}` : replyToMessage.full_name}
                      </span>
                      <button className="ghost-button" onClick={() => setReplyToMessage(null)} type="button">
                        Clear
                      </button>
                    </div>
                  ) : null}
                  <div className="messages-composer__row">
                    <textarea
                      disabled={!canComposeInCommunity}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={
                        canComposeInCommunity ? "Message group" : "Only admins or moderators can post"
                      }
                      rows={1}
                      value={draft}
                    />
                    <button className="solid-button messages-send-button" disabled={isSending || !canComposeInCommunity} type="submit">
                      Send
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          ) : (
            <div className="messages-empty-state">
              <div className="messages-empty-state__card">
                <span className="section-heading__eyebrow">Chat Ready</span>
                <h2>Select a conversation</h2>
                <p>Choose a direct thread or a community to open the message stream.</p>
                <Link className="solid-button" to="/feed">
                  Explore profiles
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {isManageSheetOpen && activeCommunity && isCommunityAdmin ? (
        <div className="messages-manage-sheet" role="dialog" aria-modal="true" aria-labelledby="manage-community-title">
          <div className="messages-manage-sheet__backdrop" onClick={() => setManageSheetOpen(false)} />
          <section className="messages-manage-sheet__panel">
            <div className="messages-manage-sheet__header">
              <div>
                <span className="section-heading__eyebrow">Manage</span>
                <h2 id="manage-community-title">{activeCommunity.name}</h2>
              </div>
              <button className="ghost-button" onClick={() => setManageSheetOpen(false)} type="button">
                Close
              </button>
            </div>

            {manageError ? <div className="auth-message auth-message--error">{manageError}</div> : null}
            {manageInfo ? <div className="auth-message auth-message--info">{manageInfo}</div> : null}

            {isLoadingManageSheet ? (
              <p className="messages-manage-sheet__empty">Loading…</p>
            ) : (
              <div className="messages-manage-sheet__body">
                <div className="messages-manage-card">
                  <label className="messages-manage-field">
                    <span>Name</span>
                    <input onChange={(event) => setManageCommunityName(event.target.value)} value={manageCommunityName} />
                  </label>
                  <label className="messages-manage-field">
                    <span>About</span>
                    <textarea
                      onChange={(event) => setManageCommunityDescription(event.target.value)}
                      rows={2}
                      value={manageCommunityDescription}
                    />
                  </label>
                  <label className="messages-manage-toggle">
                    <input
                      checked={manageFanInteractionsEnabled}
                      onChange={(event) => setManageFanInteractionsEnabled(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Fan interactions</span>
                  </label>
                  <button className="solid-button" disabled={isSavingManageSheet} onClick={() => void handleSaveCommunitySettings()} type="button">
                    Save
                  </button>
                </div>

                <div className="messages-manage-card">
                  <div className="messages-manage-card__row">
                    <strong>Invite</strong>
                    <span>{inviteCandidates.length}</span>
                  </div>
                  {inviteCandidates.length === 0 ? (
                    <p className="messages-manage-sheet__empty">No one to invite.</p>
                  ) : (
                    <div className="messages-manage-list">
                      {inviteCandidates.map((candidate) => (
                        <label className="messages-manage-list__item" key={candidate.id}>
                          <input
                            checked={selectedInviteIds.includes(candidate.id)}
                            onChange={() => handleToggleInviteCandidate(candidate.id)}
                            type="checkbox"
                          />
                          <span>{candidate.username ? `@${candidate.username}` : candidate.full_name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <button className="solid-button" disabled={isSavingManageSheet || selectedInviteIds.length === 0} onClick={() => void handleSendInvites()} type="button">
                    Send invites
                  </button>
                </div>

                <div className="messages-manage-card">
                  <div className="messages-manage-card__row">
                    <strong>Members</strong>
                    <span>{communityMembers.length}</span>
                  </div>
                  <div className="messages-manage-list">
                    {communityMembers.map((member) => (
                      <div className="messages-manage-list__item messages-manage-list__item--member" key={member.user_id}>
                        <span>
                          {member.username ? `@${member.username}` : member.full_name}
                          <small>{member.role}</small>
                        </span>
                        {member.role !== "admin" ? (
                          <div className="messages-manage-actions">
                            {member.status === "active" ? (
                              <button className="ghost-button" disabled={isSavingManageSheet} onClick={() => void handleToggleModerator(member)} type="button">
                                {member.role === "moderator" ? "Unmod" : "Mod"}
                              </button>
                            ) : null}
                            <button className="ghost-button" disabled={isSavingManageSheet} onClick={() => void handleRemoveMember(member)} type="button">
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
};
