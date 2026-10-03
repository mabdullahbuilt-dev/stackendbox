import type { ReactNode } from "react";
import { Chip } from "@/components/ui/StatusChip";
import { Window } from "@/components/ui/Window";

export type SceneProps = { playing: boolean; reduced: boolean };

/** A supporting layer that DOCKs in when `on` flips true. */
export function Dock({ on, className, children }: { on: boolean; className: string; children: ReactNode }) {
  return (
    <div className={`dm-sup dock ${className}`} data-on={on}>
      {children}
    </div>
  );
}

export function SceneWindow({ title, status, children, bodyClass }: { title: string; status?: ReactNode; children: ReactNode; bodyClass?: string }) {
  return (
    <Window
      title={title}
      className="dm-primary"
      bodyClass={bodyClass}
      right={
        <span className="dm-bar-right">
          {status}
          <Chip mono>DEMO SYSTEM</Chip>
        </span>
      }
    >
      {children}
      <span className="sample-chip">
        <Chip mono>SAMPLE DATA</Chip>
      </span>
    </Window>
  );
}
