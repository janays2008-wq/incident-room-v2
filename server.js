const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handler } = require('./netlify/functions/api.js');
const root = path.join(__dirname, '.site');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv; charset=utf-8','.pcap':'application/octet-stream'};
http.createServer(async (req,res)=>{
  const json=(status,error)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error}));};
  try {
    const url = new URL(req.url,'http://localhost');
    if(url.pathname==='/.netlify/functions/api') {
      if(req.method!=='POST') return json(405,'Method not allowed');
      let chunks=[], size=0;
      for await(const chunk of req){size+=chunk.length;if(size>262144)return json(413,'Request too large');chunks.push(chunk);}
      const result=await handler({httpMethod:req.method,headers:req.headers,body:Buffer.concat(chunks).toString('utf8')});
      res.writeHead(result.statusCode,result.headers);return res.end(result.body);
    }
    if(!['GET','HEAD'].includes(req.method))return json(405,'Method not allowed');
    const name=decodeURIComponent(url.pathname);
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return json(404,'Not found');
    const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'};
    if(name.startsWith('/evidence/'))headers['Content-Security-Policy']="default-src 'none'; sandbox";
    res.writeHead(200,headers);if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
  } catch {if(!res.headersSent)json(500,'Server error');else res.end();}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
