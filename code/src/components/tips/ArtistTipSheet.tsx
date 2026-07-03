import { useEffect, useState } from "react";
import type { Profile } from "../../types/auth";
import { createArtistTipOrder, verifyArtistTipPayment } from "../../lib/profile";
import { loadRazorpayCheckout } from "../../lib/razorpay";

const TIP_PRESETS = [100, 250, 500, 1000];

export type ArtistTipTarget = {
  recipientId: string;
  recipientName: string;
  postId?: string | null;
};

type ArtistTipSheetProps = {
  isOpen: boolean;
  target: ArtistTipTarget | null;
  sender: Pick<Profile, "full_name" | "email"> | null;
  onClose: () => void;
  onCompleted?: () => Promise<void> | void;
};

export const ArtistTipSheet = ({ isOpen, target, sender, onClose, onCompleted }: ArtistTipSheetProps) => {
  const [tipAmount, setTipAmount] = useState("100");
  const [tipMessage, setTipMessage] = useState("");
  const [isStartingTip, setStartingTip] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !target) {
      setTipAmount("100");
      setTipMessage("");
      setStartingTip(false);
      setTipError(null);
    }
  }, [isOpen, target?.recipientId]);

  const handleStartTip = async () => {
    if (!sender || !target) {
      return;
    }

    const amountRupees = Number(tipAmount);

    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      setTipError("Enter a valid tip amount.");
      return;
    }

    setStartingTip(true);
    setTipError(null);

    const checkoutLoaded = await loadRazorpayCheckout();

    if (!checkoutLoaded || !window.Razorpay) {
      setStartingTip(false);
      setTipError("Razorpay Checkout could not be loaded.");
      return;
    }

    const orderResult = await createArtistTipOrder({
      postId: target.postId ?? null,
      recipientId: target.recipientId,
      amountRupees,
      message: tipMessage.trim() || null
    });

    if (orderResult.error || !orderResult.data) {
      setStartingTip(false);
      setTipError(orderResult.error ?? "Unable to start the tip payment.");
      return;
    }

    const razorpay = new window.Razorpay({
      key: orderResult.data.keyId,
      amount: orderResult.data.amount,
      currency: orderResult.data.currency,
      name: "ArtBlock",
      description: `Tip ${orderResult.data.recipientName}`,
      order_id: orderResult.data.orderId,
      prefill: {
        name: sender.full_name,
        email: sender.email
      },
      theme: {
        color: "#5f61f2"
      },
      modal: {
        ondismiss: () => {
          setStartingTip(false);
        }
      },
      handler: async (response) => {
        const verifyResult = await verifyArtistTipPayment({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        });

        setStartingTip(false);

        if (verifyResult.error) {
          setTipError(verifyResult.error);
          return;
        }

        setTipMessage("");
        setTipAmount("100");
        onClose();
        await onCompleted?.();
      }
    });

    razorpay.open();
  };

  if (!isOpen || !target) {
    return null;
  }

  return (
    <div className="shorts-sheet" role="dialog" aria-modal="true" aria-labelledby="artist-tip-title">
      <div className="shorts-sheet__backdrop" onClick={onClose} />
      <section className="shorts-sheet__panel">
        <div className="shorts-sheet__header">
          <div>
            <span className="section-heading__eyebrow">Tip Artist</span>
            <h2 id="artist-tip-title">{target.recipientName}</h2>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {tipError ? <div className="auth-message auth-message--error">{tipError}</div> : null}

        <div className="shorts-tip">
          <div className="shorts-tip__presets">
            {TIP_PRESETS.map((value) => (
              <button
                className={`ghost-button${tipAmount === String(value) ? " shorts-tip__preset--active" : ""}`}
                key={value}
                onClick={() => setTipAmount(String(value))}
                type="button"
              >
                Rs {value}
              </button>
            ))}
          </div>

          <label className="shorts-tip__field">
            Amount
            <input
              min="10"
              onChange={(event) => setTipAmount(event.target.value)}
              step="1"
              type="number"
              value={tipAmount}
            />
          </label>

          <label className="shorts-tip__field">
            Message
            <textarea
              maxLength={240}
              onChange={(event) => setTipMessage(event.target.value)}
              placeholder="Optional note for the artist"
              rows={3}
              value={tipMessage}
            />
          </label>

          <button className="solid-button" disabled={isStartingTip} onClick={() => void handleStartTip()} type="button">
            {isStartingTip ? "Opening checkout..." : "Continue to payment"}
          </button>
        </div>
      </section>
    </div>
  );
};
