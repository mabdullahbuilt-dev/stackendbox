"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {Building2,Plus,RefreshCw} from "lucide-react";
import {api} from "./Portal";
import {useAdminAccess} from "./AdminAccess";
import {DetailDrawer,EmptyState,LoadingSkeleton,PageHeader,SectionTabs,StatusBadge} from "./PortalUI";
type Client={id:string;name:string;business_name:string};
type Website={id:string;client_id:string;name:string;url:string;status:string};
type Service={id:string;client_id:string;website_id:string|null;service:string;description:string;status:string};
type Snapshot={clients:Client[];websites:Website[];service_entitlements:Service[]};
const serviceTypes=["Website development","Website hosting","Managed database","Website performance optimization","Integrations","Maintenance","Technical support"];
export function AdminServices(){
  const {can}=useAdminAccess(),canWrite=can("services.write");
  const [data,setData]=useState<Snapshot|null>(null),[tab,setTab]=useState("Websites"),[search,setSearch]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [editor,setEditor]=useState<{kind:"website"|"service";row?:Website|Service}|null>(null),[selectedClient,setSelectedClient]=useState("");
  const request=useRef("");
  const load=useCallback(async()=>{setLoading(true);try{setData(await api("admin/workspace?section=websites"));setError("");}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  function open(kind:"website"|"service",row?:Website|Service){if(!canWrite)return;request.current=crypto.randomUUID();setSelectedClient(row?.client_id||data?.clients[0]?.id||"");setEditor({kind,row});setMessage("");}
  async function save(form:HTMLFormElement){
    if(busy||!editor)return;setBusy(true);setError("");
    const fields:Record<string,unknown>=Object.fromEntries(new FormData(form));
    if(fields.website_id===""){
      if(editor.row)fields.website_id=null;
      else delete fields.website_id;
    }
    try{const result=await api(editor.row?`admin/${editor.kind}-update`:`admin/${editor.kind==="website"?"websites":"services"}`,{...fields,...(editor.row?{id:editor.row.id}:{idempotency_key:request.current})});setEditor(null);setMessage(result.message);await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const client=(id:string)=>data?.clients.find(row=>row.id===id)?.business_name||"Client record unavailable";
  const matches=(row:Website|Service)=>`${"name" in row?row.name:row.service} ${client(row.client_id)}`.toLowerCase().includes(search.toLowerCase());
  return <section><PageHeader title="Websites & Services" eyebrow="Workspace" description="Manage the work and services assigned to each client." actions={<><button className="p-button" disabled={loading||busy} onClick={()=>void load()} aria-label="Refresh services"><RefreshCw size={16}/>Refresh</button><button className="p-button p-button-primary" disabled={!data?.clients.length||busy||!canWrite} onClick={()=>open(tab==="Websites"?"website":"service")}><Plus size={16}/>Add {tab==="Websites"?"website":"service"}</button></>}/>
    {message&&<p className="p-toast" role="status">{message}</p>}{error&&<p className="portal-error" role="alert">{error}<button onClick={()=>void load()}>Retry loading</button></p>}
    {loading&&!data&&<LoadingSkeleton label="Loading services"/>}
    {data&&<div className="p-workbench"><SectionTabs tabs={["Websites","Services"]} value={tab} onChange={setTab} label="Service views" panelId="service-panel"/><div className="p-workbench-body" id="service-panel" role="tabpanel" aria-labelledby={`service-panel-${tab==="Websites"?0:1}`} tabIndex={0}><div className="p-table-toolbar"><h2>{tab}</h2><label className="p-search"><span className="p-sr-only">Search services</span><input type="search" value={search} placeholder="Find a client or service" onChange={e=>setSearch(e.target.value)} maxLength={100}/></label></div>
    {(tab==="Websites"?data.websites:data.service_entitlements).length?<div className="portal-table-wrap"><table><thead><tr><th>{tab==="Websites"?"Website":"Service"}</th><th>Client</th><th>Status</th><th>Details</th><th>Action</th></tr></thead><tbody>{(tab==="Websites"?data.websites:data.service_entitlements).filter(matches).map(row=><tr key={row.id}><td><strong>{"name" in row?row.name:row.service}</strong></td><td><Link href={`/admin/clients/${row.client_id}`}>{client(row.client_id)}</Link></td><td><StatusBadge value={row.status}/></td><td>{"url" in row?<a href={row.url} target="_blank" rel="noopener noreferrer">Open website</a>:row.description}</td><td><button className="p-button p-button-small" disabled={busy||!canWrite} onClick={()=>open(tab==="Websites"?"website":"service",row)}>Edit</button></td></tr>)}</tbody></table>{!(tab==="Websites"?data.websites:data.service_entitlements).some(matches)&&<EmptyState title="No matching records"/>}</div>:<EmptyState title={`No ${tab.toLowerCase()} assigned`} description="Add an agreed service to an existing client." action={<Building2 size={22}/>}/>}</div><footer className="p-table-footer">Saved client assignments. No hosting, billing or registrar changes are triggered here.</footer></div>}
    {editor&&data&&<DetailDrawer title={`${editor.row?"Edit":"Add"} ${editor.kind}`} onClose={()=>setEditor(null)}><form className="portal-form" onSubmit={e=>{e.preventDefault();void save(e.currentTarget);}}><label>Client{editor.row?<><input value={client(editor.row.client_id)} readOnly/><input type="hidden" name="client_id" value={editor.row.client_id}/></>:<select name="client_id" required value={selectedClient} onChange={e=>setSelectedClient(e.target.value)}>{data.clients.filter(c=>c.id).map(c=><option key={c.id} value={c.id}>{c.business_name}</option>)}</select>}</label>
    {editor.kind==="website"?<><label>Website name<input name="name" required maxLength={120} defaultValue={(editor.row as Website)?.name}/></label><label>Website URL<input name="url" type="url" required placeholder="https://example.com" defaultValue={(editor.row as Website)?.url}/></label><p className="p-muted">A saved link doesn&apos;t confirm that hosting or a website is live.</p></>:<><label>Service<select name="service" defaultValue={(editor.row as Service)?.service||serviceTypes[0]}>{serviceTypes.map(type=><option key={type}>{type}</option>)}</select></label><label>Linked website<select key={selectedClient} name="website_id" defaultValue={(editor.row as Service)?.website_id||""}><option value="">No linked website</option>{data.websites.filter(w=>w.client_id===selectedClient).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>Agreed scope<textarea name="description" required maxLength={1000} defaultValue={(editor.row as Service)?.description}/></label><label>Status<select name="status" defaultValue={(editor.row as Service)?.status||"included"}><option value="included">Included in agreement</option><option value="provisioned">Provisioned</option><option value="suspended">Suspended</option></select></label></>}
    {error&&<p className="portal-error" role="alert">{error}</p>}<button className="p-button p-button-primary" disabled={busy}>{busy?"Saving…":"Save assignment"}</button><p className="p-muted">Client ownership can&apos;t be changed by editing a record. No invoice or payment will be created.</p></form></DetailDrawer>}
  </section>;
}
