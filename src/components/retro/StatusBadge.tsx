import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "pending"
  | "rejected"
  | "approved"
  | "info"
  | "warning"
  | "live"
  | "privacy";

interface StatusBadgeProps {
  variant?: BadgeVariant | string | null;
  children: ReactNode;
  className?: string;
}

const styles: Record<
  BadgeVariant,
  {
    color: string;
    bg: string;
    border: string;
  }
> = {
  default: {
    color: "#9ca3b8",
    bg: "rgba(156,163,184,0.12)",
    border: "#252836",
  },

  success: {
    color: "#00e676",
    bg: "rgba(0,230,118,0.1)",
    border: "rgba(0,230,118,0.3)",
  },

  pending: {
    color: "#ffd600",
    bg: "rgba(255,214,0,0.1)",
    border: "rgba(255,214,0,0.3)",
  },

  rejected: {
    color: "#ff3860",
    bg: "rgba(255,56,96,0.1)",
    border: "rgba(255,56,96,0.3)",
  },

  approved: {
    color: "#00d4e6",
    bg: "rgba(0,212,230,0.1)",
    border: "rgba(0,212,230,0.3)",
  },

  info: {
    color: "#4d7cff",
    bg: "rgba(77,124,255,0.1)",
    border: "rgba(77,124,255,0.3)",
  },

  warning: {
    color: "#ff8c00",
    bg: "rgba(255,140,0,0.1)",
    border: "rgba(255,140,0,0.3)",
  },

  live: {
    color: "#00e676",
    bg: "rgba(0,230,118,0.1)",
    border: "rgba(0,230,118,0.3)",
  },

  privacy: {
    color: "#b14dff",
    bg: "rgba(177,77,255,0.1)",
    border: "rgba(177,77,255,0.3)",
  },
};

function normalizeVariant(
  variant?: string | null,
): BadgeVariant {
  if (!variant) {
    return "default";
  }

  const normalized = variant
    .toLowerCase()
    .trim();

  /*
   * Direct matches
   */
  if (
    normalized in styles
  ) {
    return normalized as BadgeVariant;
  }

  /*
   * Handle common values coming from
   * blockchain/API data.
   */
  switch (normalized) {
    case "active":
    case "open":
    case "ongoing":
    case "executing":
      return "live";

    case "completed":
    case "complete":
    case "success":
    case "succeeded":
      return "success";

    case "approved":
    case "passed":
      return "approved";

    case "pending":
    case "pending_vote":
    case "pendingvote":
      return "pending";

    case "rejected":
    case "failed":
    case "cancelled":
    case "canceled":
      return "rejected";

    case "private":
    case "confidential":
      return "privacy";

    case "warning":
      return "warning";

    case "info":
      return "info";

    default:
      return "default";
  }
}

export function StatusBadge({
  variant,
  children,
  className,
}: StatusBadgeProps) {
  const safeVariant = normalizeVariant(
    variant,
  );

  const s = styles[safeVariant];

  return (
    <span
      className={cn("badge", className)}
      style={{
        color: s.color,
        background: s.bg,
        borderColor: s.border,
      }}
    >
      {safeVariant === "live" && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full blink"
          style={{
            background: s.color,
          }}
        />
      )}

      {children}
    </span>
  );
}
