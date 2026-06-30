import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteAdminPost,
  deleteCampaign,
  fetchAdminCampaigns,
  fetchAdminPosts,
  fetchAdminStats,
  fetchAdminUsers,
  isCampaignActiveNow,
  isSystemCampaign,
  saveCampaign,
  updateAdminPost,
  updateAdminUserBlockState,
  uploadCampaignImage
} from "../lib/admin";
import { useAuth } from "../providers/AuthProvider";
import type { AdminPostRecord, AdminStats, AdminUserRecord, Campaign } from "../types/admin";

type StatKey = "users" | "admins" | "blocked" | "verified" | "posts" | "campaigns";

const emptyCampaignForm = {
  id: "",
  name: "",
  image_url: "",
  destination_url: "",
  cta_label: "Open",
  open_in_new_tab: false,
  desktop_enabled: true,
  feed_enabled: true,
  priority: 100,
  is_active: true,
  starts_at: "",
  ends_at: ""
};

const emptyPostForm = {
  id: "",
  title: "",
  body: "",
  caption: "",
  is_published: true,
  is_pinned: false
};

const toDateTimeLocal = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) => (value ? new Date(value).toISOString() : null);

export const AdminPage = () => {
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [posts, setPosts] = useState<AdminPostRecord[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [expandedStat, setExpandedStat] = useState<StatKey | null>("users");
  const [showCampaignEditor, setShowCampaignEditor] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [activeUserMenuId, setActiveUserMenuId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [postQuery, setPostQuery] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [isSavingCampaign, setSavingCampaign] = useState(false);
  const [isSavingPost, setSavingPost] = useState(false);
  const [isUploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadConsole = async () => {
    setLoading(true);
    setError(null);

    const [statsResult, campaignsResult, usersResult, postsResult] = await Promise.all([
      fetchAdminStats(),
      fetchAdminCampaigns(),
      fetchAdminUsers(),
      fetchAdminPosts()
    ]);

    setLoading(false);

    const nextError =
      statsResult.error ?? campaignsResult.error ?? usersResult.error ?? postsResult.error ?? null;

    if (nextError) {
      setError(nextError);
      return;
    }

    if (statsResult.data) {
      setStats(statsResult.data);
    }

    setCampaigns(campaignsResult.data);
    setUsers(usersResult.data);
    setPosts(postsResult.data);
  };

  useEffect(() => {
    void loadConsole();
  }, []);

  useEffect(() => {
    const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);

    if (!selectedCampaign) {
      setCampaignForm(emptyCampaignForm);
      return;
    }

    setCampaignForm({
      id: selectedCampaign.id,
      name: selectedCampaign.name,
      image_url: selectedCampaign.image_url,
      destination_url: selectedCampaign.destination_url,
      cta_label: selectedCampaign.cta_label,
      open_in_new_tab: selectedCampaign.open_in_new_tab,
      desktop_enabled: selectedCampaign.desktop_enabled,
      feed_enabled: selectedCampaign.feed_enabled,
      priority: selectedCampaign.priority,
      is_active: selectedCampaign.is_active,
      starts_at: toDateTimeLocal(selectedCampaign.starts_at),
      ends_at: toDateTimeLocal(selectedCampaign.ends_at)
    });
  }, [campaigns, selectedCampaignId]);

  useEffect(() => {
    const selectedPost = posts.find((post) => post.id === selectedPostId);

    if (!selectedPost) {
      setPostForm(emptyPostForm);
      return;
    }

    setPostForm({
      id: selectedPost.id,
      title: selectedPost.title ?? "",
      body: selectedPost.body ?? "",
      caption: selectedPost.caption ?? "",
      is_published: selectedPost.is_published,
      is_pinned: selectedPost.is_pinned
    });
  }, [posts, selectedPostId]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((entry) =>
      [entry.full_name, entry.email, entry.username ?? "", entry.role]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [userQuery, users]);

  const filteredPosts = useMemo(() => {
    const query = postQuery.trim().toLowerCase();

    if (!query) {
      return posts;
    }

    return posts.filter((entry) =>
      [entry.author_name, entry.title ?? "", entry.body ?? "", entry.post_type]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [postQuery, posts]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const selectedPost = posts.find((post) => post.id === selectedPostId) ?? null;

  const statCards = stats
    ? [
        {
          key: "users" as const,
          title: "Users",
          value: stats.totalUsers,
          summary: `${stats.totalCreators} creators - ${stats.totalVisitors} visitors`,
          details: [
            `${stats.totalUsers} total accounts`,
            `${stats.totalCreators} creator accounts`,
            `${stats.totalVisitors} visitor accounts`
          ],
          tone: "sun"
        },
        {
          key: "admins" as const,
          title: "Admins",
          value: stats.totalAdmins,
          summary: "Protected control accounts",
          details: [
            `${stats.totalAdmins} admin accounts`,
            "These accounts control moderation and campaigns"
          ],
          tone: "mint"
        },
        {
          key: "blocked" as const,
          title: "Blocked",
          value: stats.blockedUsers,
          summary: "Accounts currently disabled",
          details: [
            `${stats.blockedUsers} blocked members`,
            `${Math.max(stats.totalUsers - stats.blockedUsers, 0)} accounts remain active`
          ],
          tone: "rose"
        },
        {
          key: "verified" as const,
          title: "Verified",
          value: stats.verifiedArtists,
          summary: "Badge-enabled creators",
          details: [
            `${stats.verifiedArtists} verified creators`,
            `${Math.max(stats.totalCreators - stats.verifiedArtists, 0)} creators still unverified`
          ],
          tone: "violet"
        },
        {
          key: "posts" as const,
          title: "Posts",
          value: stats.totalPosts,
          summary: "Published and draft content",
          details: [
            `${stats.totalPosts} total post records`,
            `${posts.filter((entry) => entry.is_published).length} recent published posts visible in this panel`
          ],
          tone: "sky"
        },
        {
          key: "campaigns" as const,
          title: "Campaigns",
          value: stats.activeCampaigns,
          summary: `${stats.totalCampaigns} total assets`,
          details: [
            `${stats.activeCampaigns} active campaigns`,
            `${Math.max(stats.totalCampaigns - stats.activeCampaigns, 0)} scheduled or inactive campaigns`
          ],
          tone: "amber"
        }
      ]
    : [];
  const expandedStatCard = statCards.find((card) => card.key === expandedStat) ?? null;

  if (!profile || !user) {
    return null;
  }

  if (profile.role !== "admin") {
    return (
      <section className="dashboard-page">
        <article className="dashboard-card">
          <span className="section-heading__eyebrow">Restricted</span>
          <h2>Admin access required</h2>
          <p>This route is only available to admin accounts.</p>
          <div className="dashboard-page__actions">
            <Link className="ghost-button" to="/feed">
              Back to feed
            </Link>
            <Link className="solid-button" to="/dashboard">
              Open dashboard
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleCampaignImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingImage(true);
    setError(null);
    const result = await uploadCampaignImage(user.id, file);
    setUploadingImage(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Unable to upload campaign image.");
      return;
    }

    setCampaignForm((current) => ({
      ...current,
      image_url: result.data ?? current.image_url
    }));
  };

  const openCampaignEditor = (campaign?: Campaign) => {
    if (campaign && isSystemCampaign(campaign)) {
      setMessage("The verify-account poster is built in and always active.");
      setError(null);
      return;
    }

    if (!campaign) {
      setSelectedCampaignId("");
      setCampaignForm(emptyCampaignForm);
    } else {
      setSelectedCampaignId(campaign.id);
    }

    setShowCampaignEditor(true);
  };

  const handleCampaignSave = async () => {
    if (!campaignForm.name.trim() || !campaignForm.image_url.trim() || !campaignForm.destination_url.trim()) {
      setError("Campaign name, image, and destination are required.");
      return;
    }

    setSavingCampaign(true);
    setError(null);
    setMessage(null);

    const result = await saveCampaign(user.id, {
      id: campaignForm.id || undefined,
      name: campaignForm.name.trim(),
      image_url: campaignForm.image_url.trim(),
      destination_url: campaignForm.destination_url.trim(),
      cta_label: campaignForm.cta_label.trim() || "Open",
      open_in_new_tab: campaignForm.open_in_new_tab,
      desktop_enabled: campaignForm.desktop_enabled,
      feed_enabled: campaignForm.feed_enabled,
      priority: Number(campaignForm.priority) || 100,
      is_active: campaignForm.is_active,
      starts_at: toIsoOrNull(campaignForm.starts_at),
      ends_at: toIsoOrNull(campaignForm.ends_at)
    });

    setSavingCampaign(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSelectedCampaignId("");
    setCampaignForm(emptyCampaignForm);
    setShowCampaignEditor(false);
    setMessage("Poster saved.");
    await loadConsole();
  };

  const handleCampaignDelete = async (campaignId: string) => {
    const confirmed = window.confirm("Delete this poster?");

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    const result = await deleteCampaign(campaignId);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (selectedCampaignId === campaignId) {
      setSelectedCampaignId("");
      setShowCampaignEditor(false);
    }

    setMessage("Poster deleted.");
    await loadConsole();
  };

  const handleBlockToggle = async (target: AdminUserRecord) => {
    if (target.id === user.id) {
      setError("The current admin account cannot block itself from the console.");
      return;
    }

    setError(null);
    setMessage(null);
    const result = await updateAdminUserBlockState(target.id, !target.deactivated_at);

    if (result.error) {
      setError(result.error);
      return;
    }

    setActiveUserMenuId(null);
    setMessage(target.deactivated_at ? "User restored." : "User blocked.");
    await loadConsole();
  };

  const handlePostSave = async () => {
    if (!postForm.id) {
      setError("Choose a post to edit first.");
      return;
    }

    setSavingPost(true);
    setError(null);
    setMessage(null);

    const result = await updateAdminPost(postForm.id, {
      title: postForm.title.trim() || null,
      body: postForm.body.trim() || null,
      caption: postForm.caption.trim() || null,
      is_published: postForm.is_published,
      is_pinned: postForm.is_pinned
    });

    setSavingPost(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage("Post updated.");
    await loadConsole();
  };

  const handlePostDelete = async (postId: string) => {
    const confirmed = window.confirm("Delete this post permanently?");

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    const result = await deleteAdminPost(postId);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (selectedPostId === postId) {
      setSelectedPostId("");
    }

    setMessage("Post deleted.");
    await loadConsole();
  };

  return (
    <section className="admin-console">
      <header className="admin-console__header">
        <div>
          <span className="section-heading__eyebrow">Admin Console</span>
          <h1>System control</h1>
          <p>Compact moderation, poster control, and platform stats.</p>
        </div>
        <div className="admin-console__actions">
          <button className="ghost-button" onClick={() => void loadConsole()} type="button">
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <Link className="ghost-button" to={`/profiles/${user.id}`}>
            Profile
          </Link>
          <button className="solid-button" onClick={() => void handleLogout()} type="button">
            Logout
          </button>
        </div>
      </header>

      {error ? <div className="auth-message auth-message--error">{error}</div> : null}
      {message ? <div className="auth-message auth-message--info">{message}</div> : null}

      <div className="admin-stats-grid">
        {statCards.map((card) => {
          const isExpanded = expandedStat === card.key;

          return (
            <button
              className={`dashboard-card admin-stat-card admin-stat-card--${card.tone}${isExpanded ? " is-expanded" : ""}`}
              key={card.key}
              onClick={() => setExpandedStat((current) => (current === card.key ? null : card.key))}
              type="button"
            >
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <small>{card.summary}</small>
            </button>
          );
        })}
      </div>

      {expandedStatCard ? (
        <article className={`dashboard-card admin-stat-detail admin-stat-detail--${expandedStatCard.tone}`}>
          <div className="admin-stat-detail__header">
            <div>
              <span className="section-heading__eyebrow">Expanded Insight</span>
              <h2>{expandedStatCard.title}</h2>
            </div>
            <strong>{expandedStatCard.value}</strong>
          </div>
          <div className="admin-stat-detail__list">
            {expandedStatCard.details.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        </article>
      ) : null}

      <div className="admin-console__grid">
        <article className="dashboard-card admin-panel">
          <div className="admin-panel__header">
            <div>
              <span className="section-heading__eyebrow">Campaign Manager</span>
              <h2>Posters and destinations</h2>
            </div>
            <button
              className="ghost-button"
              onClick={() => {
                if (showCampaignEditor) {
                  setShowCampaignEditor(false);
                  setSelectedCampaignId("");
                  setCampaignForm(emptyCampaignForm);
                  return;
                }

                openCampaignEditor();
              }}
              type="button"
            >
              Poster
            </button>
          </div>

          {showCampaignEditor ? (
            <div className="admin-campaign-editor">
              <div className="admin-campaign-editor__topline">
                <strong>{campaignForm.id ? "Edit poster" : "New poster"}</strong>
                <span>{selectedCampaign ? selectedCampaign.name : "Create a new campaign poster"}</span>
              </div>

              <label className="admin-image-upload">
                Poster image
                <div className="admin-image-upload__row">
                  <input accept="image/*" onChange={(event) => void handleCampaignImageChange(event)} type="file" />
                  <span>{isUploadingImage ? "Uploading..." : campaignForm.image_url ? "Image ready" : "Choose image"}</span>
                </div>
                <small className="admin-image-upload__advisory">
                  Use the standard poster format: landscape A4 ratio (about 1.414:1). Recommended sizes include
                  1600 x 1131 px or 2000 x 1414 px.
                </small>
              </label>

              {campaignForm.image_url ? (
                <div className="admin-campaign-preview">
                  <img alt={campaignForm.name || "Campaign preview"} src={campaignForm.image_url} />
                </div>
              ) : null}

              <label>
                Internal label
                <input
                  onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Verify badge poster"
                  type="text"
                  value={campaignForm.name}
                />
              </label>

              <label>
                Destination
                <input
                  onChange={(event) =>
                    setCampaignForm((current) => ({ ...current, destination_url: event.target.value }))
                  }
                  placeholder="/dashboard#verification or https://..."
                  type="text"
                  value={campaignForm.destination_url}
                />
              </label>

              <div className="admin-campaign-editor__grid">
                <label>
                  CTA label
                  <input
                    onChange={(event) => setCampaignForm((current) => ({ ...current, cta_label: event.target.value }))}
                    placeholder="Verify now"
                    type="text"
                    value={campaignForm.cta_label}
                  />
                </label>

                <label>
                  Priority
                  <input
                    min="1"
                    onChange={(event) =>
                      setCampaignForm((current) => ({ ...current, priority: Number(event.target.value) || 100 }))
                    }
                    type="number"
                    value={campaignForm.priority}
                  />
                </label>
              </div>

              <div className="admin-campaign-editor__grid">
                <label>
                  Start time
                  <input
                    onChange={(event) => setCampaignForm((current) => ({ ...current, starts_at: event.target.value }))}
                    type="datetime-local"
                    value={campaignForm.starts_at}
                  />
                </label>

                <label>
                  End time
                  <input
                    onChange={(event) => setCampaignForm((current) => ({ ...current, ends_at: event.target.value }))}
                    type="datetime-local"
                    value={campaignForm.ends_at}
                  />
                </label>
              </div>

              <div className="admin-toggle-grid">
                <label className="settings-toggle">
                  <div>
                    <strong>Campaign active</strong>
                    <span>Turn the poster on or off immediately.</span>
                  </div>
                  <input
                    checked={campaignForm.is_active}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, is_active: event.target.checked }))}
                    type="checkbox"
                  />
                </label>

                <label className="settings-toggle">
                  <div>
                    <strong>Desktop left rail</strong>
                    <span>Show under the profile card on wide screens.</span>
                  </div>
                  <input
                    checked={campaignForm.desktop_enabled}
                    onChange={(event) =>
                      setCampaignForm((current) => ({ ...current, desktop_enabled: event.target.checked }))
                    }
                    type="checkbox"
                  />
                </label>

                <label className="settings-toggle">
                  <div>
                    <strong>Inline mobile/feed</strong>
                    <span>Insert between posts with a CTA button.</span>
                  </div>
                  <input
                    checked={campaignForm.feed_enabled}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, feed_enabled: event.target.checked }))}
                    type="checkbox"
                  />
                </label>

                <label className="settings-toggle">
                  <div>
                    <strong>Open new tab</strong>
                    <span>Useful for external destinations.</span>
                  </div>
                  <input
                    checked={campaignForm.open_in_new_tab}
                    onChange={(event) =>
                      setCampaignForm((current) => ({ ...current, open_in_new_tab: event.target.checked }))
                    }
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="admin-panel__footer">
                <button
                  className="ghost-button"
                  onClick={() => {
                    setShowCampaignEditor(false);
                    setSelectedCampaignId("");
                    setCampaignForm(emptyCampaignForm);
                  }}
                  type="button"
                >
                  Close
                </button>
                <button
                  className="solid-button"
                  disabled={isSavingCampaign || isUploadingImage}
                  onClick={() => void handleCampaignSave()}
                  type="button"
                >
                  {isSavingCampaign ? "Saving..." : campaignForm.id ? "Update poster" : "Create poster"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="admin-campaign-list">
            {campaigns.map((campaign) => (
              <article className="admin-campaign-list__item" key={campaign.id}>
                {isSystemCampaign(campaign) ? (
                  <div className="admin-campaign-list__thumb admin-campaign-list__thumb--static">
                    <img alt={campaign.name} src={campaign.image_url} />
                  </div>
                ) : (
                  <button
                    className={`admin-campaign-list__thumb${selectedCampaignId === campaign.id ? " is-active" : ""}`}
                    onClick={() => openCampaignEditor(campaign)}
                    type="button"
                  >
                    <img alt={campaign.name} src={campaign.image_url} />
                  </button>
                )}
                <div className="admin-campaign-list__meta">
                  <strong>{campaign.name}</strong>
                  <span>{campaign.destination_url}</span>
                  <small>
                    {isSystemCampaign(campaign)
                      ? "Built-in - always active"
                      : `${isCampaignActiveNow(campaign) ? "Live" : "Scheduled"} - priority ${campaign.priority}`}
                  </small>
                </div>
                {isSystemCampaign(campaign) ? (
                  <span className="admin-campaign-list__fixed-tag">Permanent</span>
                ) : (
                  <button className="ghost-button ghost-button--danger" onClick={() => void handleCampaignDelete(campaign.id)} type="button">
                    Delete
                  </button>
                )}
              </article>
            ))}
          </div>
        </article>

        <article className="dashboard-card admin-panel">
          <div className="admin-panel__header">
            <div>
              <span className="section-heading__eyebrow">User Controls</span>
              <h2>Users and account state</h2>
            </div>
            <input
              className="admin-search"
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Search users"
              type="search"
              value={userQuery}
            />
          </div>

          <div className={`admin-user-list${showAllUsers ? " is-expanded" : ""}`}>
            {filteredUsers.map((entry) => (
              <article className="admin-user-row" key={entry.id}>
                <div className="admin-user-row__identity">
                  <strong>{entry.full_name}</strong>
                  <span>{entry.email}</span>
                </div>
                <div className="admin-user-row__meta">
                  <span className={`admin-role-pill admin-role-pill--${entry.role}`}>{entry.role}</span>
                  <span>{entry.username ? `@${entry.username}` : "No username"}</span>
                  <span>{entry.deactivated_at ? "Blocked" : "Active"}</span>
                </div>
                <div className="admin-user-row__menu">
                  <button
                    aria-label={`Open actions for ${entry.full_name}`}
                    className={`admin-kebab${activeUserMenuId === entry.id ? " is-active" : ""}`}
                    onClick={() => setActiveUserMenuId((current) => (current === entry.id ? null : entry.id))}
                    type="button"
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                  {activeUserMenuId === entry.id ? (
                    <div className="admin-kebab-menu">
                      <Link className="admin-kebab-menu__item" to={`/profiles/${entry.id}`}>
                        Open profile
                      </Link>
                      {entry.creator_slug ? (
                        <Link className="admin-kebab-menu__item" to={`/creators/${entry.creator_slug}`}>
                          Open creator page
                        </Link>
                      ) : null}
                      <button className="admin-kebab-menu__item" onClick={() => void handleBlockToggle(entry)} type="button">
                        {entry.deactivated_at ? "Unblock user" : "Block user"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {filteredUsers.length > 4 ? (
            <div className="admin-panel__footer">
              <button
                className="ghost-button"
                onClick={() => setShowAllUsers((current) => !current)}
                type="button"
              >
                {showAllUsers ? "Collapse users" : `Show more users (${filteredUsers.length})`}
              </button>
            </div>
          ) : null}
        </article>
      </div>

      <div className="admin-console__grid admin-console__grid--posts">
        <article className="dashboard-card admin-panel">
          <div className="admin-panel__header">
            <div>
              <span className="section-heading__eyebrow">Post Moderation</span>
              <h2>Review recent posts</h2>
            </div>
            <input
              className="admin-search"
              onChange={(event) => setPostQuery(event.target.value)}
              placeholder="Search posts"
              type="search"
              value={postQuery}
            />
          </div>

          <div className="admin-post-list">
            {filteredPosts.map((entry) => (
              <article className="admin-post-list__item" key={entry.id}>
                <button
                  className={`admin-post-list__select${selectedPostId === entry.id ? " is-active" : ""}`}
                  onClick={() => setSelectedPostId(entry.id)}
                  type="button"
                >
                  <div>
                    <strong>{entry.title ?? entry.caption ?? "Untitled post"}</strong>
                    <span>{entry.author_name} - {entry.post_type}</span>
                  </div>
                  <small>{entry.is_published ? "Published" : "Draft"}</small>
                </button>
              </article>
            ))}
          </div>
        </article>

        <article className="dashboard-card admin-panel">
          <div className="admin-panel__header">
            <div>
              <span className="section-heading__eyebrow">Selected Post</span>
              <h2>{selectedPost ? "Edit content state" : "Pick a post"}</h2>
            </div>
          </div>

          {selectedPost ? (
            <div className="admin-post-editor">
              {selectedPost.media_url ? (
                selectedPost.post_type === "video" ? (
                  <video className="admin-post-editor__media" controls src={selectedPost.media_url} />
                ) : (
                  <img
                    alt={selectedPost.title ?? selectedPost.author_name}
                    className="admin-post-editor__media"
                    src={selectedPost.media_url}
                  />
                )
              ) : null}

              <div className="admin-post-editor__meta">
                <span>{selectedPost.author_name}</span>
                <span>{selectedPost.like_count} likes</span>
                <span>{selectedPost.comment_count} comments</span>
              </div>

              <label>
                Title
                <input
                  onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))}
                  type="text"
                  value={postForm.title}
                />
              </label>

              <label>
                Body
                <textarea
                  onChange={(event) => setPostForm((current) => ({ ...current, body: event.target.value }))}
                  rows={6}
                  value={postForm.body}
                />
              </label>

              <label>
                Caption
                <textarea
                  onChange={(event) => setPostForm((current) => ({ ...current, caption: event.target.value }))}
                  rows={3}
                  value={postForm.caption}
                />
              </label>

              <div className="admin-toggle-grid">
                <label className="settings-toggle">
                  <div>
                    <strong>Published</strong>
                    <span>Controls feed visibility.</span>
                  </div>
                  <input
                    checked={postForm.is_published}
                    onChange={(event) => setPostForm((current) => ({ ...current, is_published: event.target.checked }))}
                    type="checkbox"
                  />
                </label>

                <label className="settings-toggle">
                  <div>
                    <strong>Pinned</strong>
                    <span>Allows creator profile pin state.</span>
                  </div>
                  <input
                    checked={postForm.is_pinned}
                    onChange={(event) => setPostForm((current) => ({ ...current, is_pinned: event.target.checked }))}
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="admin-panel__footer">
                <button className="ghost-button ghost-button--danger" onClick={() => void handlePostDelete(selectedPost.id)} type="button">
                  Delete post
                </button>
                <button className="solid-button" disabled={isSavingPost} onClick={() => void handlePostSave()} type="button">
                  {isSavingPost ? "Saving..." : "Save post"}
                </button>
              </div>
            </div>
          ) : (
            <p className="admin-empty-copy">Select a post from the left list to inspect or modify it.</p>
          )}
        </article>
      </div>
    </section>
  );
};
