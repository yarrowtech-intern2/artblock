import { Link } from "react-router-dom";
import { createOptions, type CreateOptionId } from "../../lib/createOptions";

type CreateOptionsMenuProps = {
  activeId?: CreateOptionId | null;
  className?: string;
  compact?: boolean;
  onSelect?: () => void;
};

export const CreateOptionsMenu = ({
  activeId = null,
  className,
  compact = false,
  onSelect
}: CreateOptionsMenuProps) => (
  <div className={["create-options-menu", compact ? "create-options-menu--compact" : "", className].filter(Boolean).join(" ")}>
    {createOptions.map((option) => (
      <Link
        className={`create-options-menu__item${activeId === option.id ? " create-options-menu__item--active" : ""}`}
        key={option.id}
        onClick={onSelect}
        to={option.href}
      >
        <span>{option.label}</span>
      </Link>
    ))}
  </div>
);
