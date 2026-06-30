import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  convertProfileToCreator,
  createArtistVerificationOrder,
  createSlug,
  verifyArtistVerificationPayment
} from "../../lib/profile";
import { loadRazorpayCheckout } from "../../lib/razorpay";
import type { CreatorProfile, Profile } from "../../types/auth";
import { VerifiedArtistBadge } from "../shared/VerifiedArtistBadge";

type CreatorAccessPanelProps = {
  creatorProfile: CreatorProfile | null;
  profile: Profile;
  onRefreshProfile: () => Promise<void>;
  onRefreshCreatorProfile: () => Promise<void>;
};

const ARTIST_VERIFICATION_PRICE_LABEL = "Rs 499";

export const CreatorAccessPanel = ({
  creatorProfile,
  profile,
  onRefreshProfile,
  onRefreshCreatorProfile
}: CreatorAccessPanelProps) => {
  const [isConverting, setConverting] = useState(false);
  const [isStartingVerification, setStartingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const suggestedSlug = useMemo(
    () => createSlug(profile.username ?? profile.full_name),
    [profile.full_name, profile.username]
  );

  const handleConvert = async () => {
    setConverting(true);
    setError(null);
    setMessage(null);

    const result = await convertProfileToCreator(suggestedSlug);
    setConverting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await Promise.all([onRefreshProfile(), onRefreshCreatorProfile()]);
    setMessage("Your account is now an artist account. Complete the creator page below.");
  };

  const handleVerify = async () => {
    setStartingVerification(true);
    setError(null);
    setMessage(null);

    const checkoutLoaded = await loadRazorpayCheckout();

    if (!checkoutLoaded || !window.Razorpay) {
      setStartingVerification(false);
      setError("Razorpay Checkout could not be loaded.");
      return;
    }

    const orderResult = await createArtistVerificationOrder();

    if (orderResult.error || !orderResult.data) {
      setStartingVerification(false);
      setError(orderResult.error ?? "Unable to start artist verification.");
      return;
    }

    const razorpay = new window.Razorpay({
      key: orderResult.data.keyId,
      amount: orderResult.data.amount,
      currency: orderResult.data.currency,
      name: "ArtBlock",
      description: "Original artist verification",
      order_id: orderResult.data.orderId,
      prefill: {
        name: profile.full_name,
        email: profile.email
      },
      theme: {
        color: "#6d54ff"
      },
      modal: {
        ondismiss: () => {
          setStartingVerification(false);
        }
      },
      handler: async (response) => {
        const verifyResult = await verifyArtistVerificationPayment({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        });

        setStartingVerification(false);

        if (verifyResult.error) {
          setError(verifyResult.error);
          return;
        }

        await onRefreshProfile();
        setMessage("Verification complete. Your original artist badge is now live.");
      }
    });

    razorpay.open();
  };

  if (profile.role !== "creator") {
    return (
      <article className="dashboard-card creator-access-card">
        <div className="creator-access-card__header">
          <div>
            <span className="section-heading__eyebrow">Artist Upgrade</span>
            <h2>Convert this account into an artist profile</h2>
            <p>
              Your current visitor account stays the same. This upgrade unlocks the creator page,
              publishing tools, and later verification on the same login.
            </p>
          </div>
          <div className="creator-access-card__status">
            <span className="creator-access-pill">Default: Visitor</span>
          </div>
        </div>

        {error ? <div className="auth-message auth-message--error">{error}</div> : null}
        {message ? <div className="auth-message auth-message--info">{message}</div> : null}

        <div className="creator-access-card__body">
          <div className="creator-access-card__meta">
            <strong>Suggested artist page</strong>
            <span>{suggestedSlug ? `/creators/${suggestedSlug}` : "A slug will be generated automatically."}</span>
          </div>
          <button className="solid-button" disabled={isConverting} onClick={() => void handleConvert()} type="button">
            {isConverting ? "Converting..." : "Convert to Artist"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="dashboard-card creator-access-card">
      <div className="creator-access-card__header">
        <div>
          <span className="section-heading__eyebrow">Original Artist Badge</span>
          <h2>Verify this creator identity</h2>
          <p>
            Verified artists rank above other creators in discovery and carry the gold star badge
            beside their name across the platform.
          </p>
        </div>
        <div className="creator-access-card__status">
          {profile.is_verified_artist ? (
            <span className="creator-access-pill creator-access-pill--verified">
              <VerifiedArtistBadge />
              Verified
            </span>
          ) : (
            <span className="creator-access-pill">{ARTIST_VERIFICATION_PRICE_LABEL}</span>
          )}
        </div>
      </div>

      {error ? <div className="auth-message auth-message--error">{error}</div> : null}
      {message ? <div className="auth-message auth-message--info">{message}</div> : null}

      <div className="creator-access-card__body">
        {profile.is_verified_artist ? (
          <>
            <div className="creator-access-card__meta">
              <strong>Badge active</strong>
              <span>
                {profile.verified_artist_at
                  ? `Verified on ${new Date(profile.verified_artist_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}`
                  : "This account has already been verified."}
              </span>
            </div>
            {creatorProfile?.is_published && creatorProfile.slug ? (
              <Link className="ghost-button" to={`/creators/${creatorProfile.slug}`}>
                View public artist page
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <div className="creator-access-card__meta">
              <strong>One-time verification fee</strong>
              <span>
                Test-mode Razorpay checkout. Successful payment marks this account verified
                immediately.
              </span>
            </div>
            <button
              className="solid-button"
              disabled={isStartingVerification}
              onClick={() => void handleVerify()}
              type="button"
            >
              {isStartingVerification ? "Opening checkout..." : `Verify for ${ARTIST_VERIFICATION_PRICE_LABEL}`}
            </button>
          </>
        )}
      </div>
    </article>
  );
};
