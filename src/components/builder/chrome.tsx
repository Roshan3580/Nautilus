import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ThemeToggle({
  dark,
  onChange,
}: {
  dark: boolean;
  onChange: (dark: boolean) => void;
}) {
  return (
    <div className="relative inline-flex items-center rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-sm)]">
      <span
        className="absolute top-1 bottom-1 w-9 rounded-full bg-[var(--gradient-primary)] transition-all duration-300 ease-out"
        style={{ left: dark ? "calc(100% - 2.5rem)" : "0.25rem" }}
      />
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "relative z-10 grid h-8 w-9 place-items-center rounded-full transition-colors",
          !dark ? "text-primary-foreground" : "text-muted-foreground",
        )}
        aria-label="Light mode"
      >
        <SunIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "relative z-10 grid h-8 w-9 place-items-center rounded-full transition-colors",
          dark ? "text-primary-foreground" : "text-muted-foreground",
        )}
        aria-label="Dark mode"
      >
        <MoonIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function BuilderNavbar({ dark, onThemeChange }: { dark: boolean; onThemeChange: (v: boolean) => void }) {
  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-border/60 glass">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Nautilus"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[var(--shadow-glow)]"
            priority
          />
          <div className="leading-tight">
            <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
              Nautilus Email Builder
              <span className="inline-flex h-5 items-center rounded-full border border-primary/30 bg-primary/10 px-2 text-[10px] font-medium text-primary">
                BETA
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Drag-and-drop editor with live React Email preview
            </div>
          </div>
        </div>
        <ThemeToggle dark={dark} onChange={onThemeChange} />
      </div>
    </header>
  );
}

export function ComposeField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function ComposeDivider() {
  return <div className="hidden h-10 w-px bg-border md:block" />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-md border border-border bg-background px-1.5 font-mono text-[10px] text-foreground shadow-[var(--shadow-sm)]">
      {children}
    </kbd>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function UndoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
    </svg>
  );
}

export function RedoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
    </svg>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function SmartphoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="14" height="20" x="5" y="2" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

export function CodeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
