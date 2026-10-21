import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
http.createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.endsWith('/'))pathname+='index.html';
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const types={'.html':'text/html','.js':'text/javascript','.png':'image/png'};
    res.writeHead(200,{'Content-Type':types[extname(path)]||'text/plain','Cache-Control':'no-store'});
    res.end(await readFile(path));
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(8767,'127.0.0.1',()=>console.log('Demo: http://127.0.0.1:8767/demo/'));
