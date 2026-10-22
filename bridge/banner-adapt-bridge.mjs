#!/usr/bin/env node
// Banner Adapt bridge — AI framing through your Claude or ChatGPT subscription, without an API key.
// Author: Alexey Lyamin · https://alexlyamin.framer.website/ru-home
//
// The plugin sends one picture per master to http://localhost:8787 (OpenAI-compatible format).
// The bridge passes it to the Claude Code CLI (`claude`, signed in with Pro/Max) or the Codex CLI
// (`codex`, signed in with ChatGPT) and returns the model's JSON answer. Usage counts toward your plan limits.
//
//   node banner-adapt-bridge.mjs                 # Claude Code, model haiku
//   node banner-adapt-bridge.mjs --engine codex  # Codex (ChatGPT subscription)
//   options: --port 8787  --model sonnet  --timeout 120
//
// Requires Node.js 18+. No dependencies. Listens on 127.0.0.1 only; requests need the bridge code
// printed at start (paste it into the plugin's «Код моста» field).
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const args=process.argv.slice(2),opt=(name,def)=>{const i=args.indexOf('--'+name);return i>=0&&args[i+1]?args[i+1]:def;};
const ENGINE=opt('engine','claude')==='codex'?'codex':'claude';
const PORT=Number(opt('port','8787'));
const DEFAULT_MODEL=opt('model',ENGINE==='claude'?'haiku':'');
const TIMEOUT=Number(opt('timeout','120'))*1000;
const WIN=process.platform==='win32';

// A stable code, so the plugin keeps working after the bridge restarts.
const tokenFile=path.join(os.homedir(),'.banner-adapt-bridge');
let TOKEN='';try{TOKEN=fs.readFileSync(tokenFile,'utf8').trim();}catch(_e){}
if(!/^ba-[a-f0-9]{16}$/.test(TOKEN)){TOKEN='ba-'+crypto.randomBytes(8).toString('hex');try{fs.writeFileSync(tokenFile,TOKEN,{mode:0o600});}catch(_e){}}

function run(cmd,argv,input,cwd){
  return new Promise((resolve,reject)=>{
    const quoted=WIN?argv.map(a=>'"'+String(a).replace(/"/g,'\\"')+'"'):argv;
    const p=spawn(cmd,quoted,{cwd,shell:WIN,stdio:['pipe','pipe','pipe'],env:process.env});
    let out='',err='';const t=setTimeout(()=>{p.kill();reject(new Error('timeout after '+TIMEOUT/1000+' s'));},TIMEOUT);
    p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
    p.on('error',e=>{clearTimeout(t);reject(new Error(e.code==='ENOENT'?cmd+' не найден. Установите его и войдите в аккаунт.':e.message));});
    p.on('close',code=>{clearTimeout(t);code===0?resolve(out):reject(new Error((err||out).trim().slice(-400)||cmd+' завершился с кодом '+code));});
    p.stdin.end(input);
  });
}
// Claude Code: one turn, no tools, no MCP servers, no skills, no session file — about 1.5k tokens with the picture.
async function askClaude(text,image,model){
  const content=[];if(image)content.push({type:'image',source:{type:'base64',media_type:image.type,data:image.data}});content.push({type:'text',text});
  const line=JSON.stringify({type:'user',message:{role:'user',content}})+'\n';
  const out=await run('claude',['-p','--input-format','stream-json','--output-format','stream-json','--verbose','--tools','','--model',model||'haiku',
    '--strict-mcp-config','--no-chrome','--disable-slash-commands','--setting-sources','','--no-session-persistence',
    '--system-prompt','You analyse one picture and reply with the JSON the user asks for, nothing else.'],line,os.tmpdir());
  let result='',last='';
  for(const l of out.split('\n')){if(!l.trim())continue;let j;try{j=JSON.parse(l);}catch(_e){continue;}
    if(j.type==='result'){if(j.is_error)throw new Error(String(j.result||j.error||'ошибка Claude Code'));result=String(j.result||'');}
    if(j.type==='assistant')last=(j.message?.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('');}
  return result||last;
}
// Codex: read-only sandbox in a temporary folder, the last message is written to a file.
async function askCodex(text,image,model){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'banner-adapt-'));
  try{
    const out=path.join(dir,'answer.txt'),argv=['exec','--skip-git-repo-check','--ephemeral','-s','read-only','-C',dir,'-o',out,'-c','model_reasoning_effort="low"'];
    if(model)argv.push('-m',model);
    if(image){const f=path.join(dir,'picture.'+(image.type==='image/png'?'png':'jpg'));fs.writeFileSync(f,Buffer.from(image.data,'base64'));argv.push('-i',f);}
    await run('codex',argv,text,dir);return fs.readFileSync(out,'utf8');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
// OpenAI-style request → prompt text and the first image.
function unpack(body){
  let text='',image=null;
  for(const m of body.messages||[]){const parts=typeof m.content==='string'?[{type:'text',text:m.content}]:m.content||[];
    for(const p of parts){if(p.type==='text')text+=(text?'\n':'')+p.text;
      if(p.type==='image_url'&&!image){const u=String(p.image_url?.url||''),mm=u.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(mm)image={type:mm[1],data:mm[2]};}}}
  return {text,image};
}
let queue=Promise.resolve();
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, content-type, x-title','access-control-allow-methods':'POST, GET, OPTIONS','access-control-allow-private-network':'true'};
function reply(res,status,obj){res.writeHead(status,{...headers,'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj));}
const server=http.createServer((req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
  if(req.method==='GET'&&req.url==='/health'){reply(res,200,{ok:true,engine:ENGINE});return;}
  if(req.method!=='POST'||!/\/chat\/completions$/.test(req.url||'')){reply(res,404,{error:{message:'not found'}});return;}
  if((req.headers.authorization||'')!=='Bearer '+TOKEN){reply(res,401,{error:{message:'Неверный код моста. Скопируйте код из окна моста.'}});return;}
  let size=0;const chunks=[];
  req.on('data',c=>{size+=c.length;if(size>8e6){req.destroy();return;}chunks.push(c);});
  req.on('end',()=>{let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(_e){reply(res,400,{error:{message:'bad json'}});return;}
    const {text,image}=unpack(body),model=body.model&&body.model!=='auto'?body.model:DEFAULT_MODEL;
    if(!text){reply(res,400,{error:{message:'empty prompt'}});return;}
    const started=Date.now();
    queue=queue.then(()=>(ENGINE==='claude'?askClaude(text,image,model):askCodex(text,image,model)).then(answer=>{
      console.log(new Date().toLocaleTimeString()+' · ответ за '+((Date.now()-started)/1000).toFixed(1)+' с');
      reply(res,200,{id:'bridge-'+Date.now(),object:'chat.completion',model:model||ENGINE,choices:[{index:0,message:{role:'assistant',content:answer.trim()},finish_reason:'stop'}]});
    },e=>{console.error('Ошибка: '+e.message);reply(res,502,{error:{message:e.message}});}));
  });
});
server.listen(PORT,'127.0.0.1',()=>{
  console.log('Banner Adapt · мост к '+(ENGINE==='claude'?'Claude Code (подписка Claude)':'Codex (подписка ChatGPT)')+' запущен.');
  console.log('В плагине: AI-кадрирование → Подключение «Подписка через мост».');
  console.log('Код моста: '+TOKEN);
  console.log('Адрес: http://localhost:'+PORT+'/v1/chat/completions · Остановить: Ctrl+C');
});
