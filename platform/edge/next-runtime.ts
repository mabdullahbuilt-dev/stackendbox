import { AsyncLocalStorage } from "node:async_hooks";
import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

type CookieOptions = Parameters<typeof serializeCookieHeader>[2];
type State = { jar: Map<string, string>; outgoing: Map<string, string>; tasks: (() => Promise<void>)[] };
const requests = new AsyncLocalStorage<State>();
export class NextRequest extends Request {
  get nextUrl() { return new URL(this.url); }
}
export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit) { return Response.json(body, init); }
}
export async function cookies() {
  const state = requests.getStore();
  if (!state) throw new Error("request_context_required");
  return {
    getAll: () => [...state.jar].map(([name, value]) => ({ name, value })),
    set(name: string, value: string, options: CookieOptions = {}) {
      state.jar.set(name, value);
      state.outgoing.set(name, serializeCookieHeader(name, value, options));
    },
  };
}
export function after(task: () => Promise<void>) {
  const state = requests.getStore();
  if (!state) throw new Error("request_context_required");
  state.tasks.push(task);
}
export async function withRequest(req: Request, run: () => Promise<Response>, waitUntil?: (p: Promise<unknown>) => void) {
  const state: State = { jar: new Map(parseCookieHeader(req.headers.get("cookie") || "").map(c => [c.name, c.value || ""])), outgoing: new Map(), tasks: [] };
  return requests.run(state, async () => {
    let response: Response;
    try { response = await run(); }
    catch { response = Response.json({ error: "request_failed" }, { status: 503 }); }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    for (const cookie of state.outgoing.values()) headers.append("Set-Cookie", cookie);
    if (state.tasks.length) {
      const task = Promise.allSettled(state.tasks.map(fn => fn()));
      if (waitUntil) waitUntil(task); else await task;
    }
    return new Response(response.body, { status: response.status, headers });
  });
}
