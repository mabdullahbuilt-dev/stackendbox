import Image from "next/image";

export function Logo({ markHeight = 28, wordmark = true, priority, stacked }: { markHeight?: number; wordmark?: boolean; priority?: boolean; stacked?: boolean }) {
  const mw = Math.round(markHeight * (406 / 481));
  const wh = Math.round(markHeight * (stacked ? 0.42 : 0.62));
  const ww = Math.round(wh * (1225 / 178));
  return (
    <span className={stacked ? "logo logo--stacked" : "logo"}>
      <Image src="/brand/mark.png" alt={wordmark ? "" : "StackEndBox"} width={mw} height={markHeight} priority={priority} style={{ height: markHeight, width: mw }} />
      {wordmark && <Image src="/brand/wordmark.png" alt="StackEndBox" width={ww} height={wh} priority={priority} style={{ height: wh, width: ww }} />}
    </span>
  );
}
