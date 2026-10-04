/**
 * Reliable in-page navigation. Next's Link skips a scroll when the hash does not change, and smooth scrolls across
 * content-visibility sections can land short or long as heights resolve. This turns content-visibility off first
 * (stable heights), scrolls, then corrects once if the target is not where it should be.
 */
let token = 0;
export function scrollToHash(id: string, opts: { focus?: boolean; replace?: boolean } = {}): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const mine = ++token; // a newer navigation cancels any pending corrections of this one
  const root = document.documentElement;
  // (content-visibility stays as is: toggling it forces a full-page layout; the corrections below absorb the drift)
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.motion === "reduced";
  const go = (behavior: ScrollBehavior) => el.scrollIntoView({ behavior, block: "start" });
  {
    // Long trips: jump close to the target first, then glide the last stretch. Same result, far fewer frames.
    const vh = window.innerHeight;
    const dist = el.getBoundingClientRect().top;
    if (!reduce && Math.abs(dist) > vh * 2.5) window.scrollTo({ top: window.scrollY + dist - Math.sign(dist) * vh * 1.1, behavior: "auto" });
    go(reduce ? "auto" : "smooth");
    let done = false;
    const finish = () => {
      if (done || mine !== token) return;
      done = true;
      window.removeEventListener("scrollend", finish);
      if (Math.abs(el.getBoundingClientRect().top) > 70) go("auto");
      if (opts.focus) window.dispatchEvent(new CustomEvent("seb:builder-focus"));
    };
    window.addEventListener("scrollend", finish, { once: true });
    setTimeout(finish, reduce ? 60 : 1100);
    // Late layout work (scroll-trigger setup, lazy scenes) can still move the page: correct once more unless the visitor took over.
    let manual = false;
    const take = () => { manual = true; };
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((t) => window.addEventListener(t, take, { once: true, passive: true }));
    setTimeout(() => {
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach((t) => window.removeEventListener(t, take));
      if (mine === token && !manual && Math.abs(el.getBoundingClientRect().top) > 70) go("auto");
    }, reduce ? 400 : 2400);
  }
  if (opts.replace !== false) { try { history.replaceState(history.state, "", `/#${id}`); } catch {} }
  return true;
}

/** Click handler for every internal hash link on the page (capture phase, before Next's Link sees it). */
export function onDocumentClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.target === "_blank") return;
  const href = a.getAttribute("href") ?? "";
  const m = href.match(/^(?:\/)?#([A-Za-z][\w-]*)$/);
  if (!m) return;
  if (!document.getElementById(m[1])) return;
  e.preventDefault();
  scrollToHash(m[1], { focus: m[1] === "start" });
}
