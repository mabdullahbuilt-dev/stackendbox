"use client";
import { Mic, Smartphone } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { useSteps } from "@/lib/useSteps";
import { PropertyPhoto, photoKinds } from "./PropertyPhoto";
import { Dock, SceneWindow, type SceneProps } from "./shared";

// 12 photos in a 4x3 grid. `best` are the six chosen shots, in the order they appear in the reel.
const BEST = [0, 1, 2, 4, 6, 9];
const photos = Array.from({ length: 12 }, (_, i) => ({ kind: photoKinds[i % 6], tone: (Math.floor(i / 6) % 2) as 0 | 1, score: [9.4, 9.1, 8.8, 4.2, 8.6, 3.9, 8.9, 5.1, 4.4, 8.7, 3.6, 4.8][i] }));

export function ListingReel({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 700, 1500, 2500, 3500, 4400, 5300, 6300], playing, reduced);
  const mode = s >= 3 ? "timeline" : s >= 2 ? "pick" : "grid";
  const status = s >= 7 ? ["READY TO PUBLISH", "green"] : s >= 6 ? ["ASSEMBLING REEL", "blue"] : s >= 4 ? ["WRITING AND VOICE", "blue"] : s >= 2 ? ["SELECTING SHOTS", "amber"] : ["ANALYZING PHOTOS", "amber"];
  return (
    <div className="dm">
      <SceneWindow title="ListingReel AI" status={<StatusChip tone={status[1] as "green"}>{status[0]}</StatusChip>}>
        <div className="lr" data-mode={mode} data-scan={s === 1}>
          {photos.map((p, i) => {
            const best = BEST.indexOf(i);
            const gx = 14 + (i % 4) * 24;
            const gy = 18 + Math.floor(i / 4) * 24;
            return (
              <div key={i} className="lr-p" data-best={best >= 0} style={{ ["--gx" as string]: gx, ["--gy" as string]: gy, ["--tx" as string]: best >= 0 ? 11 + best * 15.5 : gx, ["--ty" as string]: best >= 0 ? 80 : 96, ["--i" as string]: i }}>
                <PropertyPhoto kind={p.kind} tone={p.tone} />
                {s >= 1 && <span className="lr-score" data-good={p.score > 8}>{p.score.toFixed(1)}</span>}
              </div>
            );
          })}
          <i className="lr-scan" />
        </div>
      </SceneWindow>
      <Dock on={s >= 4} className="dm-a">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">SCRIPT</span>
          <div className="lr-script">{["Welcome to a bright home with an open plan.", "A kitchen made for hosting.", "Book a viewing today."].map((t, i) => <p key={t} data-on={s >= 4 + (i > 1 ? 1 : 0)}>{t}</p>)}</div>
        </div>
      </Dock>
      <Dock on={s >= 5} className="dm-b">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted"><Mic className="mk-inl" /> VOICE</span>
          <div className="lr-wave">{Array.from({ length: 28 }).map((_, i) => <i key={i} style={{ height: `${20 + ((i * 37) % 70)}%`, ["--i" as string]: i }} />)}</div>
        </div>
      </Dock>
      <Dock on={s >= 6} className="dm-c">
        <div className="lr-phoneframe">
          <div className="lr-phone"><PropertyPhoto kind="kitchen" /><span className="lr-cap">A kitchen made for hosting.</span><u><i style={{ width: s >= 7 ? "100%" : "40%" }} /></u></div>
          <span className="mono mono--muted"><Smartphone className="mk-inl" /> 9:16 REEL</span>
        </div>
      </Dock>
    </div>
  );
}
