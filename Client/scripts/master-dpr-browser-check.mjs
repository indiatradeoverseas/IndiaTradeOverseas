import http from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
const root=resolve(import.meta.dirname,'../dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root)){res.writeHead(403).end();return;}
  const file=existsSync(path)&&statSync(path).isFile()?path:resolve(root,'index.html');
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  browser=await puppeteer.launch({headless:true});
  const page=await browser.newPage(),pageErrors=[],submissions=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',request=>{
    if(request.url().startsWith(origin))return request.continue();
    // No production traffic: API and all providers are intercepted locally.
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST, GET, OPTIONS'};
    if(request.method()==='OPTIONS')return request.respond({status:204,headers});
    if(request.url().endsWith('/api/leads/website')){
      const body=JSON.parse(request.postData());submissions.push(body);
      return request.respond({status:201,headers,contentType:'application/json',body:JSON.stringify({success:true,data:{persisted:true,leadId:'fixture_lead',leadCode:'LOCAL_TEST_ONLY',leadCreatedEventId:`lead_created_${body.submissionId}`}})});
    }
    return request.abort();
  });
  await page.goto(`${origin}/contact`,{waitUntil:'networkidle0'});
  await page.waitForSelector('#quick-enquiry');
  assert.equal(await page.evaluate(()=>document.querySelectorAll('script[data-ito-meta-pixel]').length),0);
  assert.equal(await page.evaluate(()=>Boolean(window.__itoGtmLoaded)),false);
  const buttons=await page.$$('button');
  for(const button of buttons)if((await button.evaluate(b=>b.textContent)).trim()==='Accept all'){await button.click();break;}
  await page.waitForSelector('script[data-ito-meta-pixel]');
  await page.select('#quick-enquiry select','RICE');
  const inputs=await page.$$('#quick-enquiry input:not([type=checkbox])');
  for(const [i,value] of ['Local fixture product','Local fixture location','12025550123'].entries())await inputs[i].type(value);
  await page.click('#quick-enquiry input[type=checkbox]');
  await page.click('#quick-enquiry button');
  await page.waitForFunction(()=>document.querySelector('#quick-enquiry').textContent.includes('LOCAL_TEST_ONLY'));
  assert.equal(submissions.length,1);assert.equal(submissions[0].captureMode,'QUICK');assert.equal(submissions[0].consent.contactAllowed,true);
  const events=await page.evaluate(()=>window.fbq.queue);
  assert.equal(events.filter(c=>c[0]==='init').length,1);
  const conversion=events.filter(c=>c[0]==='trackSingle'&&c[2]==='Lead');
  assert.equal(conversion.length,1);assert.equal(conversion[0][4].eventID,`lead_created_${submissions[0].submissionId}`);
  assert.equal(await page.evaluate(()=>document.querySelector('script[data-ito-meta-pixel]')!==null),true);
  assert.deepEqual(pageErrors,[]);
  console.log('PASS: browser consent gate, single Pixel initialization, quick-enquiry persistence contract and shared conversion event ID; all provider requests blocked.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
