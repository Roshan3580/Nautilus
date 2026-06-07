import type { ReactNode } from "react";

type BlockMeta = {
  label: string;
  hint: string;
};

export const BLOCK_LIBRARY_META: Record<string, BlockMeta> = {
  Heading: { label: "Heading", hint: "H1 — H6" },
  Text: { label: "Text", hint: "Paragraph" },
  Button: { label: "Button", hint: "CTA" },
  Image: { label: "Image", hint: "Hero / inline" },
  Section: { label: "Section", hint: "Full-width" },
  Container: { label: "Container", hint: "Padded block" },
};

function BlockIcon({ name }: { name: string }) {
  switch (name) {
    case "Heading":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      );
    case "Text":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h10M4 17h14" />
        </svg>
      );
    case "Button":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13 19 19" />
        </svg>
      );
    case "Image":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    case "Section":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "Container":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
      );
  }
}

export function PuckBlockDrawerItem({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const meta = BLOCK_LIBRARY_META[name] ?? { label: name, hint: "" };

  return (
    <div className="puck-block-card">
      <span className="puck-block-card__icon" aria-hidden>
        <BlockIcon name={name} />
      </span>
      <span className="puck-block-card__title">{meta.label}</span>
      <span className="puck-block-card__hint">{meta.hint}</span>
      <span className="puck-block-card__drag">{children}</span>
    </div>
  );
}

export const puckBlockLibraryOverrides = {
  drawerItem: PuckBlockDrawerItem,
};
