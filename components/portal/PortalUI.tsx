"use client";
import Link from "next/link";
import {useEffect,useId,useRef,type ReactNode} from "react";
import {ArrowUpRight,Inbox,X,type LucideIcon} from "lucide-react";

export function PageHeader({title,description,actions,eyebrow}:{title:string;description?:string;actions?:ReactNode;eyebrow?:string}){
  return <header className="p-page-header"><div>{eyebrow&&<span className="p-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="p-header-actions">{actions}</div>}</header>;
}
export function StatusBadge({value}:{value:unknown}){
  const status=typeof value==="string"?value:"unknown";
  const tone=["active","registered","delivered","paid","completed","verified","provisioned"].includes(status)?"positive":["failed","bounced","rejected","disputed","declined","suspended"].includes(status)?"negative":["review_required","action_required","applying","queued","retry","deferred","pending"].includes(status)?"warning":"neutral";
  return <span className={`p-badge p-badge-${tone}`}><span aria-hidden="true"/>{status.replaceAll("_"," ")}</span>;
}
export function MetricCard({title,value,icon:Icon,href,hint}:{title:string;value:number|null|undefined;icon:LucideIcon;href?:string;hint?:string}){
  const body=<><div className="p-metric-label"><span>{title}</span><Icon size={17} aria-hidden="true"/></div><strong>{value??"Unavailable"}</strong>{hint&&<small>{hint}</small>}{href&&<ArrowUpRight className="p-metric-arrow" size={15} aria-hidden="true"/>}</>;
  return href?<Link className="p-metric" href={href}>{body}</Link>:<div className="p-metric">{body}</div>;
}
export function EmptyState({title,description,action}:{title:string;description?:string;action?:ReactNode}){
  return <div className="p-empty"><Inbox size={25} aria-hidden="true"/><h3>{title}</h3>{description&&<p>{description}</p>}{action}</div>;
}
export function LoadingSkeleton({label="Loading records"}:{label?:string}){
  return <div role="status" aria-label={label} className="p-skeleton"><span/><span/><span/><span/></div>;
}
export function SectionTabs<T extends string>({tabs,value,onChange,label,panelId}:{tabs:readonly T[];value:T;onChange:(value:T)=>void;label:string;panelId:string}){
  return <div className="p-tabbar" role="tablist" aria-label={label}>{tabs.map((tab,index)=><button type="button" key={tab} role="tab" id={`${panelId}-${index}`} aria-controls={panelId} aria-selected={value===tab} tabIndex={value===tab?0:-1} onClick={()=>onChange(tab)} onKeyDown={event=>{
    const next=event.key==="ArrowRight"?(index+1)%tabs.length:event.key==="ArrowLeft"?(index+tabs.length-1)%tabs.length:event.key==="Home"?0:event.key==="End"?tabs.length-1:null;
    if(next===null)return;event.preventDefault();onChange(tabs[next]);document.getElementById(`${panelId}-${next}`)?.focus();
  }}>{tab}</button>)}</div>;
}
export function DetailDrawer({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{const node=dialog.current;if(node&&!node.open)node.showModal();return()=>{if(node?.open)node.close();};},[]);
  return <dialog ref={dialog} className="p-drawer" aria-labelledby={id} onClose={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><header><h2 id={id}>{title}</h2><button type="button" aria-label="Close details" className="p-icon-button" onClick={onClose}><X size={19}/></button></header><div className="p-drawer-content">{children}</div></dialog>;
}
