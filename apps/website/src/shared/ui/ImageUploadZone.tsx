import { Upload, Trash2 } from "lucide-react";
import { type ReactElement, type ReactNode, useRef, useState } from "react";

type ImageUploadZoneProps = {
  accept?: string;
  children: ReactNode;
  imageUrl?: string | null;
  onDelete?: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  placeholder?: ReactNode;
  variant: "circle" | "square";
};

export function ImageUploadZone({
  accept = "image/png,image/jpeg,image/gif",
  children,
  imageUrl,
  onDelete,
  onUpload,
  placeholder,
  variant,
}: ImageUploadZoneProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File): Promise<void> {
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!onDelete) return;
    setUploading(true);
    try {
      await onDelete();
    } finally {
      setUploading(false);
    }
  }

  const hasImage = Boolean(imageUrl);
  const isCircle = variant === "circle";

  const triggerUpload = () => fileInputRef.current?.click();

  const fileInput = (
    <input
      accept={accept}
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          void handleUpload(file);
        }
        event.target.value = "";
      }}
      ref={fileInputRef}
      type="file"
    />
  );

  if (isCircle) {
    return (
      <div className="group relative flex size-[160px] items-start rounded-[80px] border border-[var(--track-border)] bg-[var(--track-surface)] md:size-[220px] md:rounded-[110px]">
        {fileInput}
        <div className="flex h-full w-full items-center justify-center py-[2px]">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-[80px] bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 md:rounded-[110px]">
          <OverlayButton disabled={uploading} onClick={triggerUpload} tone="neutral">
            <Upload className="size-5" />
          </OverlayButton>
          {hasImage && onDelete ? (
            <OverlayButton disabled={uploading} onClick={() => void handleDelete()} tone="danger">
              <Trash2 className="size-5" />
            </OverlayButton>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-[216px] w-[216px] shrink-0 flex-col items-center justify-center rounded-[20px] border-2 border-dashed bg-[var(--track-surface)] px-[22px] py-[22px] shadow-[0px_1px_3px_0px_var(--track-shadow-subtle)] transition-[border-color,background-color] duration-150 ${hasImage ? "border-[var(--track-border)]" : "cursor-pointer border-[var(--track-border)] hover:border-[var(--track-accent)] hover:bg-[var(--track-surface-muted)]"}`}
      onClick={hasImage ? undefined : triggerUpload}
    >
      {fileInput}
      {hasImage ? (
        <>
          {children}
          <div className="flex gap-2">
            <TextButton disabled={uploading} onClick={triggerUpload} tone="neutral">
              <Upload className="size-3" />
            </TextButton>
            {onDelete ? (
              <TextButton disabled={uploading} onClick={() => void handleDelete()} tone="danger">
                <Trash2 className="size-3" />
              </TextButton>
            ) : null}
          </div>
        </>
      ) : (
        <button
          className="flex flex-col items-center gap-3 transition-colors"
          disabled={uploading}
          onClick={triggerUpload}
          type="button"
        >
          {placeholder}
        </button>
      )}
    </div>
  );
}

function OverlayButton({
  children,
  disabled,
  onClick,
  tone,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  tone: "neutral" | "danger";
}): ReactElement {
  return (
    <button
      className={`flex size-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 ${tone === "danger" ? "text-red-300" : "text-white"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TextButton({
  children,
  disabled,
  onClick,
  tone,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  tone: "neutral" | "danger";
}): ReactElement {
  return (
    <button
      className={`flex items-center gap-1 rounded-[6px] px-2 py-1 text-[12px] font-medium transition-colors ${
        tone === "danger"
          ? "text-red-400 hover:bg-red-400/10 hover:text-red-300"
          : "text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
