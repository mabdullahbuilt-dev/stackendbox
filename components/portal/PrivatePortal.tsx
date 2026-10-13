"use client";
import dynamic from "next/dynamic";
// Server pages still verify identity and MFA before returning these shells.
// Customer data stays in the independently authorized, uncached API routes.
const ClientPortal=dynamic(()=>import("./Portal").then(m=>m.Portal),{ssr:false,loading:()=> <main id="main" className="portal-auth"><p role="status">Opening your private portal</p></main>});
const StaffPortal=dynamic(()=>import("./AdminPortal").then(m=>m.AdminPortal),{ssr:false,loading:()=> <main id="main" className="portal-auth"><p role="status">Opening private administration</p></main>});
export function PrivateClientPortal(props:{path:string[];userId:string}) {return <ClientPortal {...props}/>;}
export function PrivateAdminPortal(props:{section:string;createClient:boolean;domain?:string;clientId?:string}) {return <StaffPortal {...props}/>;}
