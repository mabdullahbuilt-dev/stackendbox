import {PortalError} from "./rules";
/** Bound bytes while streaming, before buffering an attacker-controlled body. */
export async function boundedText(request:Request,limit:number):Promise<string> {
 const declared=request.headers.get("content-length");
 if(declared && Number(declared)>limit) throw new PortalError("request_too_large",413);
 const reader=request.body?.getReader();if(!reader)return "";
 const decoder=new TextDecoder();let size=0,text="";
 try {
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new PortalError("request_too_large",413);}text+=decoder.decode(value,{stream:true});}
   return text+decoder.decode();
 } finally {reader.releaseLock();}
}
