"use client";
import { CalendarClock } from "lucide-react";
import { track } from "@/lib/analytics";
import { calParts, openCal, prepareCal } from "@/lib/cal";

/** Book a Call. Renders nothing unless NEXT_PUBLIC_CAL_URL is configured. */
export function CalButton({ children = "Book a Call", className = "btn btn--lg btn--secondary", placement, icon = true }: { children?: React.ReactNode; className?: string; placement: string; icon?: boolean }) {
  if (!calParts()) return null;
  return (
    <button
      type="button"
      className={className}
      onPointerEnter={prepareCal}
      onFocus={prepareCal}
      onClick={() => { track("contact_clicked", { placement, kind: "cal" }); void openCal(); }}
    >
      {icon && <CalendarClock aria-hidden />}
      {children}
    </button>
  );
}
