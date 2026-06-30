import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { isExternalDestination } from "../../lib/admin";
import type { Campaign } from "../../types/admin";

type CampaignCardProps = {
  campaign: Campaign;
  mode: "rail" | "inline";
};

const CampaignAnchor = ({
  campaign,
  className,
  children
}: {
  campaign: Campaign;
  className: string;
  children: ReactNode;
}) => {
  if (isExternalDestination(campaign.destination_url)) {
    return (
      <a
        className={className}
        href={campaign.destination_url}
        rel="noreferrer"
        target={campaign.open_in_new_tab ? "_blank" : "_self"}
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} to={campaign.destination_url}>
      {children}
    </Link>
  );
};

export const CampaignCard = ({ campaign, mode }: CampaignCardProps) => {
  if (mode === "rail") {
    return (
      <CampaignAnchor campaign={campaign} className="campaign-rail-link">
        <article className="feed-campaign-rail">
          <img alt={campaign.name} className="campaign-rail-image" src={campaign.image_url} />
        </article>
      </CampaignAnchor>
    );
  }

  return (
    <CampaignAnchor campaign={campaign} className="campaign-card__media-link campaign-card">
      <img alt={campaign.name} className="campaign-card__image" src={campaign.image_url} />
    </CampaignAnchor>
  );
};
