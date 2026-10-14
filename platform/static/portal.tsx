import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { Portal, type Data } from "../../components/portal/Portal";
import { AdminPortal } from "../../components/portal/AdminPortal";
import { PortalCache } from "../../components/portal/PortalCache";
import { Link } from "./navigation";
import { portalApiPath } from "../../lib/portal/browser-path";
import { portalPageRoute } from "../../lib/portal/page-route";
import { bootstrapPath } from "../../lib/portal/bootstrap-path";
import {watchSessionChange} from "../../lib/portal/session-events";
import "./fonts.css";
import "../../styles/tokens.css";
import "../../styles/base.css";
import "../../styles/portal.css";
import "../../styles/portal-design.css";

function App() {
  const route = portalPageRoute(window.location.pathname);
  const {admin = false, section = "", detail, publicPage = false} = route || {};
  const [identity, setIdentity] = useState<{ user_id: string } | null>(null);
  const [initialData,setInitialData]=useState<Data|undefined>();
  const [error, setError] = useState("");
  useEffect(()=>{
    if(publicPage||!identity)return;
    let active=true,checking=false,last=Date.now();
    const controller=new AbortController();
    const reset=()=>{setIdentity(null);setInitialData(undefined);window.location.reload();};
    const stop=watchSessionChange(reset);
    const check=async()=>{
      if(!active||checking||document.visibilityState!=="visible"||Date.now()-last<15000)return;
      last=Date.now();checking=true;
      try{
        const response=await fetch(portalApiPath(`auth/identity${admin?"?admin=1":""}`),{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
        const current=await response.json();
        if(active&&(!response.ok||current.user_id!==identity.user_id))reset();
      }catch{if(active){setIdentity(null);setInitialData(undefined);setError("Your session couldn't be confirmed. Retry to sign in securely.");}}
      finally{checking=false;}
    };
    window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);
    return()=>{active=false;controller.abort();stop();window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check);};
  },[publicPage,admin,identity]);
  useEffect(() => {
    if (publicPage || !section) return;
    const controller = new AbortController();
    const target=bootstrapPath({admin,section,detail,publicPage});
    fetch(portalApiPath(target), { cache: "no-store", signal: AbortSignal.any([controller.signal,AbortSignal.timeout(25000)]) }).then(async r => {
      const data = await r.json();
      if (r.status === 401) return window.location.replace("/client-portal/login");
      if(data.error==="password_change_required")return window.location.replace("/client-portal/reset-password");
      if (!r.ok) throw new Error(data.error === "administrator_mfa_required" ? "Verify your authenticator in Account security before opening administration." : data.error === "administrator_required" ? "This account doesn't have administrator access. Use your client portal." : "Account access could not be verified. Sign in again or retry.");
      if (data.password_change_required && section !== "reset-password") return window.location.replace("/client-portal/reset-password");
      if(admin)setIdentity(data);
      else {
        if(typeof data.account?.user_id!=="string")throw new Error("Account response could not be verified. Retry safely.");
        setInitialData(data);setIdentity({user_id:data.account.user_id});
      }
    }).catch(e => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, [publicPage, admin, section, detail]);
  if (!route) return <main className="portal-auth"><h1>Page not found</h1><Link href="/client-portal">Return to portal</Link></main>;
  if (error) return <main className="portal-auth"><h1>Account access unavailable</h1><p role="alert">{error}</p><Link href="/client-portal/dashboard">Client portal</Link> · <Link href="/client-portal/settings">Account security</Link> · <Link href="/client-portal/login">Sign in</Link><p><button onClick={() => location.reload()}>Retry</button></p></main>;
  if (!publicPage && !identity) return <main className="portal-auth"><p role="status">Verifying your account…</p></main>;
  return <div className="portal-root"><PortalCache>{admin ? <AdminPortal section={section} createClient={section === "clients" && detail === "new"} clientId={section === "clients" && detail !== "new" ? detail : undefined} domain={section === "domains" ? detail : undefined} /> : <Portal path={detail ? [section, detail] : [section]} userId={identity?.user_id || ""} initialData={initialData} />}</PortalCache></div>;
}
createRoot(document.getElementById("root")!).render(<App />);
