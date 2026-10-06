/**
 * A small (72px) aperture drawn inside the bottom padding of the OUTGOING chapter. The chapter's object passes through it
 * while the chapter leaves. It is driven by that chapter's --exit variable (chapter runtime), occupies existing padding
 * (no added page height) and never takes pointer input. Used for four hand-offs only.
 */
export function Aperture({ kind }: { kind: "module" | "record" | "payload" | "live" }) {
  return (
    <div className="apt" data-kind={kind} aria-hidden>
      <i className="apt__ring" />
      <i className="apt__obj" />
    </div>
  );
}
