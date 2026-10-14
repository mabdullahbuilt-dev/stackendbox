// Portal browser code only. Tokens stay in memory until server validation.
export type VerificationOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback": (code: string) => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  [key: string]: unknown;
};
export type VerificationRuntime = {
  render: (element: HTMLElement, options: VerificationOptions) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
let scriptLoading: Promise<VerificationRuntime> | undefined;
function runtime() { return (window as unknown as {turnstile?: VerificationRuntime}).turnstile; }
export function loadPortalVerification(): Promise<VerificationRuntime> {
  const ready = runtime();
  if (ready) return Promise.resolve(ready);
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise<VerificationRuntime>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.dataset.stackendboxVerification = "true";
    const timer = setTimeout(() => fail(), 10000);
    function fail() {
      clearTimeout(timer);
      script.onload = script.onerror = null;
      script.remove();
      reject(new Error("Security verification couldn't load. Check your connection and select Sign in again."));
    }
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      const api = runtime();
      if (!api) return fail();
      script.onload = script.onerror = null;
      resolve(api);
    };
    document.head.appendChild(script);
  }).catch(error => {scriptLoading = undefined; throw error;});
  return scriptLoading;
}
export function verificationError(code: string) {
  if (["110100", "110110", "110200", "400020", "400021", "400070"].includes(code))
    return `Security verification needs a StackEndBox configuration check. Contact support with code ${code}.`;
  if (code === "200500") return "Security verification couldn't connect. Allow challenges.cloudflare.com in your browser, then select Sign in again.";
  if (code === "200100") return "Check your device's date and time, then select Sign in again.";
  return "Security verification didn't finish. Select Sign in to try again.";
}
export class PortalVerificationController {
  private api?: VerificationRuntime;
  private widget?: string;
  private disposed = false;
  private active?: {promise: Promise<string>; resolve: (token:string)=>void; reject: (error:Error)=>void; timer: ReturnType<typeof setTimeout>};
  constructor(private element: HTMLElement, private siteKey: string, private loader=loadPortalVerification, private deadline=25000) {}
  verify(): Promise<string> {
    if (this.disposed) return Promise.reject(new Error("Sign-in page closed. Open it again."));
    if (!this.siteKey) return Promise.reject(new Error("Sign-in is temporarily unavailable. Contact StackEndBox."));
    if (this.active) return this.active.promise;
    let resolve!: (token:string)=>void, reject!: (error:Error)=>void;
    const promise = new Promise<string>((yes,no)=>{resolve=yes;reject=no;});
    this.active = {promise,resolve,reject,timer:setTimeout(()=>this.finish(undefined,new Error(verificationError("timeout")),promise),this.deadline)};
    void this.loader().then(api=>{
      if (this.disposed || !this.active || this.active.promise!==promise) return;
      this.api=api;
      if (this.widget) {const previous=this.widget;this.widget=undefined;api.remove(previous);}
      this.widget=api.render(this.element,{
        sitekey:this.siteKey,theme:"dark",size:"flexible",appearance:"interaction-only",execution:"execute",
        retry:"never","refresh-expired":"manual","refresh-timeout":"manual","response-field":false,
        callback:token=>this.finish(token,undefined,promise),
        "error-callback":code=>this.finish(undefined,new Error(verificationError(code)),promise),
        "expired-callback":()=>this.finish(undefined,new Error(verificationError("expired")),promise),
        "timeout-callback":()=>this.finish(undefined,new Error(verificationError("timeout")),promise),
      });
      api.execute(this.widget);
    }).catch(error=>this.finish(undefined,error instanceof Error?error:new Error(verificationError("load")),promise));
    return promise;
  }
  private finish(token?:string,error?:Error,expected?:Promise<string>) {
    const active=this.active;
    if (!active || expected&&active.promise!==expected) return;
    this.active=undefined;
    clearTimeout(active.timer);
    if (token) active.resolve(token);
    else {
      if(this.widget&&this.api){const widget=this.widget;this.widget=undefined;try{this.api.remove(widget);}catch{/* Retry creates a fresh widget. */}}
      active.reject(error||new Error(verificationError("empty")));
    }
  }
  dispose() {
    this.disposed=true;
    this.finish(undefined,new Error("Sign-in page closed."));
    if (this.widget && this.api) this.api.remove(this.widget);
  }
}
