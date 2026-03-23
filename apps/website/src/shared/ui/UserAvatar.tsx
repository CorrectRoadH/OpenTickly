import { type ReactElement } from "react";

type UserAvatarProps = {
  className?: string;
  imageUrl?: string | null;
  name: string;
  textClassName?: string;
};

export function UserAvatar({
  className = "",
  imageUrl,
  name,
  textClassName = "",
}: UserAvatarProps): ReactElement {
  const trimmedName = name.trim();
  const accessibleName = trimmedName || "User avatar";

  if (imageUrl) {
    return (
      <img
        alt={accessibleName}
        className={`rounded-full object-cover ${className}`.trim()}
        src={imageUrl}
      />
    );
  }

  return (
    <div
      aria-label={accessibleName}
      className={`flex items-center justify-center rounded-full bg-[#d94182] text-white ${className}`.trim()}
      role="img"
    >
      <span className={textClassName}>{initialForName(trimmedName)}</span>
    </div>
  );
}

function initialForName(name: string): string {
  if (!name) {
    return "U";
  }

  return name.charAt(0).toUpperCase();
}
