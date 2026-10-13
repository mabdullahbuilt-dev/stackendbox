// Read-only DNS wire query to .com parent authorities, not a cached recursive DS
// lookup. No credentials, writes, DNSSEC changes or delegation are performed.
import {createSocket} from 'node:dgram';
import {randomBytes} from 'node:crypto';
function readName(buffer,start){
  let offset=start,end,labels=[],visited=new Set();
  for(let steps=0;steps<128;steps++){
    if(offset>=buffer.length||visited.has(offset))throw Error('invalid_dns_name');visited.add(offset);
    const length=buffer[offset++];
    if((length&192)===192){if(offset>=buffer.length)throw Error('invalid_dns_pointer');end??=offset+1;offset=((length&63)<<8)|buffer[offset];continue;}
    if(length===0)return {name:labels.join('.'),end:end??offset};
    if(length>63||offset+length>buffer.length)throw Error('invalid_dns_label');labels.push(buffer.subarray(offset,offset+length).toString('ascii'));offset+=length;
  }
  throw Error('invalid_dns_name');
}
function records(buffer,offset,count){
  const values=[];
  for(let i=0;i<count;i++){
    const name=readName(buffer,offset);offset=name.end;
    if(offset+10>buffer.length)throw Error('invalid_dns_record');
    const type=buffer.readUInt16BE(offset),ttl=buffer.readUInt32BE(offset+4),length=buffer.readUInt16BE(offset+8);offset+=10;
    if(offset+length>buffer.length)throw Error('invalid_dns_data');
    if(type===43){if(length<5)throw Error('invalid_ds');values.push({name:name.name,type,ttl,keyTag:buffer.readUInt16BE(offset),algorithm:buffer[offset+2],digestType:buffer[offset+3],digest:buffer.subarray(offset+4,offset+length).toString('hex')});}
    else values.push({name:name.name,type,ttl});offset+=length;
  }
  return {values,offset};
}
async function parentQuery(server){
  const header=Buffer.alloc(12),id=randomBytes(2).readUInt16BE();header.writeUInt16BE(id);header.writeUInt16BE(1,4);
  const question=Buffer.concat(['stackendbox','com'].map(label=>Buffer.concat([Buffer.from([label.length]),Buffer.from(label)])));
  const suffix=Buffer.from([0,0,43,0,1]),packet=Buffer.concat([header,question,suffix]);
  return new Promise((resolve,reject)=>{
    const socket=createSocket('udp4'),timer=setTimeout(()=>{socket.close();reject(Error('parent_dns_timeout'));},6000);
    const fail=()=>{clearTimeout(timer);socket.close();reject(Error('parent_dns_failed'));};socket.on('error',fail);
    socket.on('message',(buffer,remote)=>{
      try{
        if(remote.address!==server||remote.port!==53||buffer.length<12||buffer.readUInt16BE()!==id)return;
        clearTimeout(timer);socket.close();const flags=buffer.readUInt16BE(2);
        let offset=12;for(let i=0;i<buffer.readUInt16BE(4);i++)offset=readName(buffer,offset).end+4;
        const answer=records(buffer,offset,buffer.readUInt16BE(6)),authority=records(buffer,answer.offset,buffer.readUInt16BE(8));
        const rcode=flags&15,ds=answer.values.filter(r=>r.type===43),denial=authority.values.some(r=>[6,47,50].includes(r.type));
        resolve({server,checkedAt:new Date().toISOString(),rcode,truncated:!!(flags&512),authoritative:!!(flags&1024),ds,denialRecords:authority.values,confirmedAbsent:rcode===0&&!!(flags&1024)&&!(flags&512)&&ds.length===0&&denial});
      }catch{reject(Error('parent_dns_parse_failed'));}
    });socket.send(packet,53,server,error=>{if(error)fail();});
  });
}
for(const parent of ['a.gtld-servers.net','b.gtld-servers.net']){
  try{
    const response=await fetch(`https://dns.google/resolve?name=${parent}&type=A`,{signal:AbortSignal.timeout(10000)}),data=await response.json();
    const address=data.Answer?.find(item=>item.type===1)?.data;if(!address)throw Error('parent_address_unavailable');
    console.log(JSON.stringify({parent,...await parentQuery(address)}));
  }catch{console.log(JSON.stringify({parent,verified:false,error:'direct_parent_query_unavailable',absenceNotAssumed:true}));process.exitCode=1;}
}
