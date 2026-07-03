import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getIdentityNameClass } from "../../lib/identity";
import { fetchTipDashboard, type TipDashboardRecord, type TipDashboardResponse } from "../../lib/tips";
import { ProfileAvatar } from "../shared/ProfileAvatar";
import { VerifiedArtistBadge } from "../shared/VerifiedArtistBadge";
import type { Profile } from "../../types/auth";

type TipTab = "all" | "sent" | "received";

type TipDashboardSectionProps = {
  profile: Profile;
  userId: string;
  mode?: "user" | "admin";
};

const formatRupees = (valueInPaise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(valueInPaise / 100);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));

const getCounterparty = (record: TipDashboardRecord, tab: TipTab, mode: "user" | "admin") => {
  if (mode === "admin") {
    return {
      primary: record.sender,
      secondary: record.recipient,
      label: "Sender -> Recipient"
    };
  }

  if (tab === "sent") {
    return {
      primary: record.recipient,
      secondary: record.sender,
      label: "Sent to"
    };
  }

  if (tab === "received") {
    return {
      primary: record.sender,
      secondary: record.recipient,
      label: "Received from"
    };
  }

  if (record.viewer_relation === "sender") {
    return {
      primary: record.recipient,
      secondary: record.sender,
      label: "Sent to"
    };
  }

  if (record.viewer_relation === "recipient") {
    return {
      primary: record.sender,
      secondary: record.recipient,
      label: "Received from"
    };
  }

  return {
    primary: record.sender,
    secondary: record.recipient,
    label: "Transaction"
  };
};

const getStatusLabel = (status: string) => {
  if (status === "paid") {
    return "Paid";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
};

const TipSectionSkeleton = () => (
  <div className="tip-dashboard__skeleton">
    {[1, 2, 3].map((item) => (
      <div className="tip-dashboard__skeleton-card shimmer" key={item} />
    ))}
  </div>
);

export const TipDashboardSection = ({ profile, userId, mode = "user" }: TipDashboardSectionProps) => {
  const [data, setData] = useState<TipDashboardResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TipTab>("all");
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const result = await fetchTipDashboard();

    setLoading(false);

    if (result.error) {
      setError(result.error);
      setData(null);
      return;
    }

    setData(result.data);
  };

  useEffect(() => {
    void loadData();
  }, [userId]);

  const visibleRecords = useMemo(() => {
    if (!data) {
      return [] as TipDashboardRecord[];
    }

    if (mode === "admin") {
      return data.records;
    }

    if (activeTab === "sent") {
      return data.records.filter((record) => record.viewer_relation === "sender");
    }

    if (activeTab === "received") {
      return data.records.filter((record) => record.viewer_relation === "recipient");
    }

    return data.records;
  }, [activeTab, data, mode]);

  const summaryCards = data
    ? mode === "admin"
      ? [
          {
            label: "Total tips",
            value: String(data.summary.total_tips)
          },
          {
            label: "Paid amount",
            value: formatRupees(data.summary.total_amount_paise)
          },
          {
            label: "Top sender",
            value: data.top_senders[0]?.profile.full_name ?? "None yet"
          },
          {
            label: "Top recipient",
            value: data.top_recipients[0]?.profile.full_name ?? "None yet"
          }
        ]
      : [
          {
            label: "Sent",
            value: `${data.summary.sent_tips} tips`
          },
          {
            label: "Received",
            value: `${data.summary.received_tips} tips`
          },
          {
            label: "Sent value",
            value: formatRupees(data.summary.sent_amount_paise)
          },
          {
            label: "Received value",
            value: formatRupees(data.summary.received_amount_paise)
          }
        ]
    : [];

  return (
    <section className="dashboard-section tip-dashboard" id="tips">
      <div className="dashboard-section__heading">
        <div>
          <span className="section-heading__eyebrow">Tips</span>
          <h2>{mode === "admin" ? "Tip analytics" : "Tip history"}</h2>
        </div>
        <div className="dashboard-section__actions">
          <button className="ghost-button" onClick={() => void loadData()} type="button">
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="auth-message auth-message--error">{error}</div> : null}

      {isLoading ? <TipSectionSkeleton /> : null}

      {!isLoading && data ? (
        <>
          <div className="tip-dashboard__summary-grid">
            {summaryCards.map((card) => (
              <article className="dashboard-card tip-dashboard__summary-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>

          {mode === "admin" ? (
            <div className="tip-dashboard__leaderboards">
              <article className="dashboard-card tip-dashboard__leaderboard">
                <span className="section-heading__eyebrow">Top senders</span>
                <div className="tip-dashboard__leaderboard-list">
                  {data.top_senders.map((entry) => (
                    <div className="tip-dashboard__leaderboard-item" key={entry.profile.id}>
                      <div className="tip-dashboard__leaderboard-identity">
                        <ProfileAvatar
                          alt={entry.profile.full_name}
                          className="tip-dashboard__leaderboard-avatar"
                          name={entry.profile.full_name}
                          src={entry.profile.avatar_url}
                        />
                        <div>
                          <strong className="profile-name-row">
                            <span className={getIdentityNameClass(entry.profile.role)}>
                              {entry.profile.username ? `@${entry.profile.username}` : entry.profile.full_name}
                            </span>
                            {entry.profile.is_verified_artist ? <VerifiedArtistBadge /> : null}
                          </strong>
                          <small>
                            {entry.tip_count} tips · {formatRupees(entry.amount_paise)}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-card tip-dashboard__leaderboard">
                <span className="section-heading__eyebrow">Top recipients</span>
                <div className="tip-dashboard__leaderboard-list">
                  {data.top_recipients.map((entry) => (
                    <div className="tip-dashboard__leaderboard-item" key={entry.profile.id}>
                      <div className="tip-dashboard__leaderboard-identity">
                        <ProfileAvatar
                          alt={entry.profile.full_name}
                          className="tip-dashboard__leaderboard-avatar"
                          name={entry.profile.full_name}
                          src={entry.profile.avatar_url}
                        />
                        <div>
                          <strong className="profile-name-row">
                            <span className={getIdentityNameClass(entry.profile.role)}>
                              {entry.profile.username ? `@${entry.profile.username}` : entry.profile.full_name}
                            </span>
                            {entry.profile.is_verified_artist ? <VerifiedArtistBadge /> : null}
                          </strong>
                          <small>
                            {entry.tip_count} tips · {formatRupees(entry.amount_paise)}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          ) : null}

          {mode !== "admin" ? (
            <div className="tip-dashboard__tabs" role="tablist">
              {(["all", "sent", "received"] as TipTab[]).map((tab) => (
                <button
                  aria-selected={activeTab === tab}
                  className={`feed-chip${activeTab === tab ? " feed-chip--active" : ""} tip-dashboard__tab`}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  type="button"
                >
                  {tab === "all" ? "All" : tab === "sent" ? "Sent" : "Received"}
                </button>
              ))}
            </div>
          ) : null}

          <div className="tip-dashboard__ledger">
            {visibleRecords.length === 0 ? (
              <div className="empty-feed tip-dashboard__empty">
                <h3>No tips yet.</h3>
                <p>{mode === "admin" ? "Tip activity will appear here once it starts flowing." : "Your sent and received tips will appear here."}</p>
              </div>
            ) : (
              visibleRecords.map((record) => {
                const counterparty = getCounterparty(record, activeTab, mode);

                return (
                  <article className="dashboard-card tip-entry" key={record.id}>
                    <div className="tip-entry__topline">
                      <div className="tip-entry__direction">
                        <span className="tip-entry__direction-label">{counterparty.label}</span>
                        <strong className="profile-name-row">
                          <span className={getIdentityNameClass(counterparty.primary.role)}>
                            {mode === "admin"
                              ? `${record.sender.username ? `@${record.sender.username}` : record.sender.full_name} → ${record.recipient.username ? `@${record.recipient.username}` : record.recipient.full_name}`
                              : counterparty.primary.username
                                ? `@${counterparty.primary.username}`
                                : counterparty.primary.full_name}
                          </span>
                          {counterparty.primary.is_verified_artist ? <VerifiedArtistBadge /> : null}
                        </strong>
                      </div>
                      <div className="tip-entry__amount">
                        <strong>{formatRupees(record.amount_paise)}</strong>
                        <span className={`tip-entry__status tip-entry__status--${record.status}`}>{getStatusLabel(record.status)}</span>
                      </div>
                    </div>

                    <div className="tip-entry__meta">
                      <span>{formatDateTime(record.created_at)}</span>
                      <span>{record.context.title}</span>
                      {record.message ? <span>{record.message}</span> : null}
                    </div>

                    <div className="tip-entry__parties">
                      <Link className="tip-entry__party" to={record.sender.creator_slug ? `/creators/${record.sender.creator_slug}` : `/profiles/${record.sender.id}`}>
                        <ProfileAvatar
                          alt={record.sender.full_name}
                          className="tip-entry__avatar"
                          name={record.sender.full_name}
                          src={record.sender.avatar_url}
                        />
                        <span>
                          From {record.sender.username ? `@${record.sender.username}` : record.sender.full_name}
                        </span>
                      </Link>
                      <Link className="tip-entry__party" to={record.recipient.creator_slug ? `/creators/${record.recipient.creator_slug}` : `/profiles/${record.recipient.id}`}>
                        <ProfileAvatar
                          alt={record.recipient.full_name}
                          className="tip-entry__avatar"
                          name={record.recipient.full_name}
                          src={record.recipient.avatar_url}
                        />
                        <span>
                          To {record.recipient.username ? `@${record.recipient.username}` : record.recipient.full_name}
                        </span>
                      </Link>
                      {record.context.href ? (
                        <Link className="ghost-button tip-entry__context-link" to={record.context.href}>
                          Open {record.context.kind === "post" ? "post" : "profile"}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </section>
  );
};
