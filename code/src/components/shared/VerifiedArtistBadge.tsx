import verifiedStarIcon from "../../public/icons/svg/STAR.svg";

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
  >
    <span className="verified-artist-badge__halo">
      <img alt="" aria-hidden="true" src={verifiedStarIcon} />
    </span>
  </span>
);
