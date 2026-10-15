// Loopback-only second browser hostname for a disposable client session.
// Separates localhost cookies from the staff session on 127.0.0.1.
import {createServer,request} from 'node:http';
const origin='http://localhost:4178',target='http://127.0.0.1:4179';
const server=createServer((req,res)=>{
 if(req.headers.host!=='localhost:4178'||!['GET','HEAD','POST'].includes(req.method)||req.method==='POST'&&req.headers.origin!==origin){res.writeHead(403).end();return;}
 const headers={...req.headers,host:'127.0.0.1:4179'};
 if(headers.origin)headers.origin=target;
 const upstream=request(target+req.url,{method:req.method,headers,timeout:20000},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
 upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end('Local isolated fixture unavailable.');});req.pipe(upstream);
});
server.listen(4178,'127.0.0.1',()=>console.log('Disposable client-view proxy ready at http://localhost:4178/fixture/client. No external provider or hosted credentials.'));
process.once('SIGINT',()=>server.close(()=>process.exit(0)));
