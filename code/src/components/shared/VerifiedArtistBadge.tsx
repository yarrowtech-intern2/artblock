type VerifiedArtistBadgeProps = {
  className?: string;
  label?: string;
};

export const VerifiedArtistBadge = ({
  className = "",
  label = "Verified artist"
}: VerifiedArtistBadgeProps) => (
  <span
    aria-label={label}
    className={`verified-artist-badge${className ? ` ${className}` : ""}`}
    role="img"
    title={label}
  >
    <span className="verified-artist-badge__halo">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 2.9l2.49 5.04 5.56.81-4.03 3.93.95 5.54L12 15.59l-4.97 2.63.95-5.54L3.95 8.75l5.56-.81L12 2.9z" />
      </svg>
    </span>
  </span>
);
