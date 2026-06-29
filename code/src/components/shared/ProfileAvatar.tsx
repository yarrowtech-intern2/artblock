import Avatar from "boring-avatars";

type ProfileAvatarProps = {
  alt: string;
  className: string;
  name: string;
  src?: string | null;
};

const avatarVariants = ["beam", "marble", "pixel", "sunset", "ring", "bauhaus"] as const;

const avatarPalettes = [
  ["#111827", "#2563eb", "#60a5fa", "#bfdbfe", "#f8fafc"],
  ["#0f172a", "#7c3aed", "#a78bfa", "#ddd6fe", "#f5f3ff"],
  ["#1f2937", "#10b981", "#6ee7b7", "#d1fae5", "#f0fdf4"],
  ["#172554", "#ec4899", "#f9a8d4", "#fbcfe8", "#fdf2f8"],
  ["#3f3f46", "#f59e0b", "#fcd34d", "#fef3c7", "#fffbeb"]
] as const;

const hashString = (value: string) =>
  value.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);

export const ProfileAvatar = ({ alt, className, name, src }: ProfileAvatarProps) => {
  if (src) {
    return <img alt={alt} className={className} src={src} />;
  }

  const seed = name.trim() || alt || "ArtBlock";
  const palette = avatarPalettes[hashString(seed) % avatarPalettes.length];
  const variant = avatarVariants[hashString(`${seed}-variant`) % avatarVariants.length];

  return (
    <span aria-label={alt} className={`${className} generated-avatar`} role="img">
      <Avatar colors={[...palette]} name={seed} size={128} variant={variant} />
    </span>
  );
};
