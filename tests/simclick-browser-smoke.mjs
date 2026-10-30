// Real Microsoft Edge mobile-viewport smoke; verifies the actual PlayCanvas game.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output=resolve('.test-output/simclick-browser');
await mkdir(output,{recursive:true});
const profile=await mkdtemp(resolve(output,'profile-'));
const edge=process.env.SIMCLICK_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port=9357;
const browser=spawn(edge,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking',
 '--disable-extensions','--disable-component-update', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port='+port,
 '--user-data-dir='+profile,'--window-size=393,852','about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const failTimeout=setTimeout(()=>{console.error('The SIM Click browser QA timed out');browser.kill();process.exitCode=1;},160000);
let ws,seq=0;
const pending=new Map(),jsErrors=[];
const send=(method,params={})=>{
 const id=++seq;
 const promise=new Promise((yes,no)=>{
  const t=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout '+method));},30000);
  pending.set(id,{yes:x=>{clearTimeout(t);yes(x);},no:e=>{clearTimeout(t);no(e);}});
 });
 ws.send(JSON.stringify({id,method,params}));
 return promise;
};
const evaluate=async expression=>{
 const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(r.exceptionDetails)throw Error('Browser exception: '+JSON.stringify(r.exceptionDetails));
 return r.result?.value;
};
async function until(expression,timeout=35000){
 const started=Date.now();
 while(Date.now()-started<timeout){if(await evaluate(expression))return;await sleep(100);}
 throw Error('Condition timeout: '+expression);
}
async function click(selector){
 const bounds=await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');if(!el)throw Error("Missing target element");el.scrollIntoView({block:"nearest"});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,top:r.top,bottom:r.bottom,active:el===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)||el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()');
 assert.ok(bounds.width>=12&&bounds.height>=12,'Touch target must be visible: '+selector);
 assert.ok(bounds.active,'Touch target obstructed: '+selector+JSON.stringify(bounds));
 for(const type of ['mouseMoved','mousePressed','mouseReleased'])
  await send('Input.dispatchMouseEvent',{type,x:bounds.x,y:bounds.y,button:type==='mouseMoved'?'none':'left',clickCount:1});
}
async function screenshot(name){
 const s=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(resolve(output,name),Buffer.from(s.data,'base64'));
}
try{
 let tabs;
 for(let n=0;n<120;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();break;}catch{await sleep(100);}}
 assert.ok(tabs?.length,'Microsoft Edge started');
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
 ws.onmessage=event=>{
  const m=JSON.parse(event.data);
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.no(Error(JSON.stringify(m.error))):p.yes(m.result);}
  if(m.method==='Runtime.exceptionThrown')jsErrors.push(m.params.exceptionDetails);
 };
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:4173/The-SIM-Click/'});
 await until('!!window.cityManager && !!document.querySelector("#simclick-root .sc-nav")');
 await until('window.cityManager.visuals().ready',45000);
 assert.equal(await evaluate('document.title'),'The SIM Click · ชีวิตในเมือง');
 assert.equal(await evaluate('document.documentElement.classList.contains("simclick-mode")'),true);
 assert.equal(await evaluate('getComputedStyle(document.querySelector(".top-hud")).display'),'none');
 assert.equal(await evaluate('document.querySelectorAll(".sc-nav button").length'),3);
 assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),true,'No horizontal overflow on 393px mobile');
 const state=await evaluate('(()=>{const c=JSON.parse(window.cityManager.snapshot());return{tick:c.tick,buildings:c.buildings.length}})()');
 assert.ok(state.tick>=24&&state.buildings>0,'Starter town must have developed buildings');
 await screenshot('01-city-393.png');

 await click('[data-sc-page="home"]');
 await until('document.querySelector(".sc-panel.home")!==null');
 assert.ok((await evaluate('document.querySelector(".sc-body").textContent')).includes('ความต้องการ'));
 await click('[data-sc-action="sleep"]');
 const activity=await evaluate('JSON.parse(localStorage.getItem("simclick.life.v1")).activity.id');
 assert.equal(activity,'sleep');
 await click('[data-sc-page="character"]');
 await until('document.querySelector(".sc-panel.character")!==null');
 assert.ok((await evaluate('document.querySelector(".sc-body").textContent')).includes('ทักษะ'));
 await screenshot('02-character-393.png');

 const prior=await evaluate('JSON.parse(localStorage.getItem("simclick.life.v1")).lastMinute');
 await sleep(2400);
 await until('JSON.parse(localStorage.getItem("simclick.life.v1")).lastMinute > '+prior,5000);
 const future=await evaluate('JSON.parse(localStorage.getItem("simclick.life.v1")).lastMinute');
 assert.ok(future>prior,'Life clock advances with the city');
 assert.equal(await evaluate('localStorage.getItem("citymanager.save.v7")'),null);
 await click('[data-sc-builder]');
 assert.equal(await evaluate('document.documentElement.classList.contains("simclick-builder")'),true);
 assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".top-hud")).display'),'none');
 await click('#toggle-game-menu');
 await until('document.querySelector("#inspector").dataset.page==="game" && document.querySelector("#inspector").dataset.open==="true"');
 await click('#save');
 await until('!!localStorage.getItem("simclick.save.v7")',15000);
 assert.equal(await evaluate('localStorage.getItem("citymanager.save.v7")'),null,'CityManager saves remain untouched');
 await screenshot('03-builder-393.png');
 await send('Page.reload',{ignoreCache:true});
 await until('!!window.cityManager && !!document.querySelector(".sc-panel")',45000);
 assert.ok((await evaluate('JSON.parse(localStorage.getItem("simclick.life.v1")).events.join("|")')).length>5,'Life progress survived reload');
 assert.equal(await evaluate('localStorage.getItem("citymanager.save.v7")'),null);
 assert.equal(jsErrors.length,0,'No runtime exceptions: '+JSON.stringify(jsErrors));
 console.log('PASS: Edge WebGL2 start, city/house/character, life activity+clock, touch targets, save isolation, reload.');
}catch(err){
 console.error(err);
 try{if(ws?.readyState===1)await screenshot('error-393.png');}catch{}
 process.exitCode=1;
}finally{
 clearTimeout(failTimeout);
 try{ws?.close();}catch{}
 browser.kill();
}
