import type { CSSProperties, ReactNode } from "react";

export function Window({
  title,
  right,
  children,
  className,
  style,
  bodyClass,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  bodyClass?: string;
}) {
  return (
    <div className={`window ${className ?? ""}`} style={style}>
      <div className="window__bar">
        <span className="window__dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="window__title">{title}</span>
        {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
      </div>
      <div className={`window__body ${bodyClass ?? ""}`}>{children}</div>
    </div>
  );
}
