// Banner Adapt 1.6 — local layout engine. Optional AI framing: one small request per master with the user's own key,
// the answer is the scene geometry only; every format is still computed locally.
// Author: Alexey Lyamin · https://alexlyamin.framer.website/ru-home
type Role = 'logo'|'headline'|'date'|'body'|'cta'|'visual';
type MasterNode = FrameNode | GroupNode | ComponentNode | InstanceNode;
type DesignNode = MasterNode | TextNode | RectangleNode | EllipseNode | VectorNode | BooleanOperationNode | PolygonNode | StarNode | LineNode;
type Assets = Partial<Record<Role, DesignNode>>;
type Size = [number, number];
type Box = {x:number;y:number;w:number;h:number};
type Align = 'start'|'center'|'end';
// text: column for the date/headline/body stack; ctaInStack puts the button under the text, otherwise it uses the cta box.
type Layout = {kind:string;variant?:string;logo:Box;text:Box;align:Align;ctaInStack:boolean;cta:Box;visual:Box;font:number};
type Rect01 = {x:number;y:number;w:number;h:number};
// Typographic proportions measured on the master: sizes relative to the headline and gaps in headline units.
type Metrics = {head:number;date:number;body:number;cta:number;logoH:number;gapDate:number;gapBody:number;gapCta:number;mw:number;mh:number;headEm:number;textBox:Rect01|null;visualBox:Rect01|null;textLum:number|null};
type Options = {enforceMinFont?:boolean;variantOverrides?:Record<string,Overrides>;preserveMaster?:boolean;visualMode?:string;isBackground?:boolean;background:string;fit:string;focusX:number;focusY:number;zoom:number;minFont:number;headlineScale:number;visualSide:string;fade:boolean;trimLogo:boolean;outlineMissing:boolean;aiPlan?:string;subject?:Rect01|null;luma?:number[]|null;focusOverride?:boolean;scrim?:boolean;shade?:string;edge?:string|null;extend?:boolean;alternates?:AltMaster[];platforms?:string[];campaign?:string;placement?:string;textPos?:string;busy?:number[]|null;subjectGuessed?:boolean;useAi?:boolean;aiScene?:AiScene|null;aiAnchor?:string;subjectManual?:boolean;imageFit?:string;fillColor?:string};
// AI framing of a picture: what must stay visible (subject), what is enough when space is tight (core),
// how to align a tall object, and for each class of proportions whether the whole subject or only its core is kept.
// hash ties the answer to the analysed picture, so a cached answer is reused and never applied to another image.
type AiFit='whole'|'core';
type AiScene={hash:string;model:string;label:string;subject:Rect01;core:Rect01|null;anchor:'top'|'center'|'bottom';formats:{strip:AiFit;wide:AiFit;square:AiFit;tall:AiFit}};
// Extra masters for other proportions, with the panel's analysis of their background.
type AltMaster={id:string;subject?:Rect01|null;luma?:number[]|null;busy?:number[]|null;shade?:string;edge?:string|null;aiScene?:AiScene|null};
type Overrides = Partial<Pick<Options,'focusX'|'focusY'|'zoom'|'headlineScale'|'visualSide'|'preserveMaster'|'textPos'|'imageFit'>>;
type UiMessage = {type:string;altId?:string;config?:unknown;masterId?:string;batchId?:string;confirmed?:boolean;trialSize?:Size;visualMode?:string;id?:string;roles:Record<Role,string>;sizes:Size[];options:Options};
function isDesign(n:BaseNode):n is DesignNode{return ['FRAME','GROUP','COMPONENT','INSTANCE','TEXT','RECTANGLE','ELLIPSE','VECTOR','BOOLEAN_OPERATION','POLYGON','STAR','LINE'].includes(n.type);}
function isMaster(n:BaseNode):n is MasterNode{return ['FRAME','GROUP','COMPONENT','INSTANCE'].includes(n.type);}
function messageText(error:unknown):string{const m=(error as {message?:unknown}|null)?.message;return typeof m==='string'?m:String(error);}
function record(x:unknown):x is Record<string,unknown>{return typeof x==='object'&&x!==null&&!Array.isArray(x);}
// Advertising platforms (checked 14.10.2026 against the platforms' help pages; see README for sources).
// sizes — files the platform accepts; maxKB — file weight limit; safeTop/safeBottom — share of height kept free of
// logo, text and button; textShare — maximum share of the image covered by text.
type Platform={id:string;name:string;slug:string;sizes:Size[];maxKB:number|null;format:'jpg'|'png';safeTop?:number;safeBottom?:number;textShare?:number;note:string};
const PLATFORMS:Platform[]=[
  {id:'yd-rsya',name:'Яндекс Директ · графические объявления (РСЯ)',slug:'yandex-rsya',format:'jpg',maxKB:512,
   sizes:[[480,800],[600,500],[600,1000],[600,1200],[640,100],[640,200],[640,960],[672,560],[960,640],[1456,180],[1940,500]],
   note:'Креативы в 2 раза больше блоков 240×400, 300×250, 300×500, 300×600, 320×50, 320×100, 320×480, 336×280, 480×320, 728×90, 970×250. JPG/PNG/GIF, до 512 КБ.'},
  {id:'yd-image',name:'Яндекс Директ · изображения для объявлений',slug:'yandex-image',format:'jpg',maxKB:10240,
   sizes:[[1080,1080],[1440,1080],[1080,1440],[1920,1080]],
   note:'1:1, 4:3 и 3:4 — от 450 до 5000 px; 16:9 — от 1080×607. JPG/PNG, до 10 МБ. Если картинка одна — 4:3.'},
  {id:'vk',name:'VK Реклама · универсальное объявление',slug:'vk',format:'jpg',maxKB:5120,safeTop:.1,textShare:.2,
   sizes:[[1080,1080],[1080,1350],[1080,607]],
   note:'1:1 (от 600×600), 4:5 1080×1350, 16:9 1080×607. JPG/PNG, до 5 МБ. Текст — не больше 20% площади, верхние 10% без важных элементов.'},
  {id:'vk-240',name:'VK Реклама · баннер 240×400',slug:'vk-banner',format:'jpg',maxKB:60,safeTop:.1,
   sizes:[[240,400]],note:'JPG/PNG, до 60 КБ, без рамок по краям, верхние 10% без важных элементов.'},
  {id:'dzen',name:'Дзен · продвижение канала (через VK Рекламу)',slug:'dzen',format:'jpg',maxKB:5120,
   sizes:[[1200,1600]],note:'1200×1600, PNG/JPG. Не сплошной чёрный или белый фон.'},
  {id:'tg',name:'Telegram Ads · изображение',slug:'telegram',format:'jpg',maxKB:5120,
   sizes:[[1280,720]],note:'16:9, от 640 px по ширине, JPG/PNG, до 5 МБ. Картинки включаются для кабинета по запросу.'},
  {id:'own',name:'Свои площадки (сайт, рассылки, события)',slug:'own',format:'png',maxKB:null,
   sizes:[[1080,1080],[1200,1200],[1200,628],[1080,607],[1500,1125],[1080,1920],[1080,1350],[900,1524],[940,1524],[1000,1500],[300,250],[336,280],[240,400],[300,600],[160,600],[728,90],[970,90],[970,250],[468,60],[320,100],[1456,180],[1280,256],[1706,184],[1080,450],[2832,600]],
   note:'Прежний набор из 25 размеров. PNG без ограничения веса.'}
];
const PRESETS:Size[]=PLATFORMS.find(p=>p.id==='own')!.sizes;
// Combined requirements of the chosen platforms that use this exact size.
function platformRules(ids:string[]|undefined,w:number,h:number){
  const used=PLATFORMS.filter(p=>(ids||[]).includes(p.id)&&p.sizes.some(s=>s[0]===w&&s[1]===h));
  const share=used.map(p=>p.textShare).filter((v):v is number=>typeof v==='number');
  return {used,safeTop:Math.max(0,...used.map(p=>p.safeTop||0)),safeBottom:Math.max(0,...used.map(p=>p.safeBottom||0)),textShare:share.length?Math.min(...share):null};
}
const ROLE_KEYS: Role[] = ['logo','headline','date','body','cta','visual'];
const ROLE_NAMES = {logo:'Логотип',headline:'Заголовок',date:'Дата / надпись',body:'Дополнительный текст',cta:'Кнопка',visual:'Изображение'};
const DATA_NS='BannerAdaptLocalV1';
const AUTHOR_URL='https://alexlyamin.framer.website/ru-home';
let masterId = '', busy = false, cancelled = false;
const cloneData = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const clamp = (x:number,a:number,b:number) => Math.max(a,Math.min(b,x));
function descendants(node:BaseNode, limit = 800):DesignNode[] {
  const result:DesignNode[] = [], pending:SceneNode[] = 'children' in node && node.type!=='DOCUMENT' ? [...node.children].reverse() : [];
  while(pending.length){const n=pending.pop()!;if(!n.visible)continue;if(isDesign(n))result.push(n);if(result.length>limit)throw new Error('В мастере больше '+limit+' слоёв. Выберите отдельный баннер.');if('children'in n)pending.push(...[...n.children].reverse());}
  return result;
}
function isInside(node:BaseNode, ancestor:BaseNode) {let p:BaseNode|null=node;while(p){if(p.id===ancestor.id)return true;p=p.parent;}return false;}
function imagePaint(n:DesignNode){return 'fills'in n && Array.isArray(n.fills) && n.fills.some(p=>p.visible!==false&&p.type==='IMAGE');}
// Background detection uses the selected image's coverage of the master, not its name.
function coversMaster(source:DesignNode,master:MasterNode){
  const a=source.absoluteBoundingBox,b=master.absoluteBoundingBox;if(!a||!b)return false;
  const t=Math.max(1,Math.min(b.width,b.height)*.015);
  return a.x<=b.x+t&&a.y<=b.y+t&&a.x+a.width>=b.x+b.width-t&&a.y+a.height>=b.y+b.height-t;
}
// A picture is a background when it covers the master: an image layer, or a group/frame with an image inside.
// "Fill the banner" (imageFit = fill) always treats the picture as a background scaled over the whole format.
function hasImage(n:DesignNode){return imagePaint(n)||descendants(n,400).some(imagePaint);}
function backgroundMode(source:DesignNode,master:MasterNode,mode='auto',fit='auto'){
  if(['fill','width','height'].includes(fit)&&mode!=='block')return true;
  return mode==='background'||(mode!=='block'&&hasImage(source)&&coversMaster(source,master));
}
// Picture scaling: fill — cover the area, cropping the edges; width / height — scale proportionally to the banner's
// width or height (the other side is cropped, or the gap is filled); extend — fit the object and fill the rest;
// auto — extend only when the picture's edges are one flat colour.
const FITS=['fill','extend','width','height'];
function extendOn(o:Options){return o.imageFit==='fill'?false:o.imageFit&&o.imageFit!=='auto'?true:o.extend!==false&&!!o.edge;}
// Colour of the free space: the picture's edge colour, or the "Resize background" colour when the designer chose it.
function edgeHex(o:Options){return o.fillColor==='custom'?o.background:o.edge||o.background;}
function relativeToMaster(source:DesignNode,master:MasterNode):Transform{
  const a=master.absoluteTransform,b=source.absoluteTransform;
  const det=a[0][0]*a[1][1]-a[0][1]*a[1][0];
  if(Math.abs(det)<1e-8)throw new Error('Некорректная трансформация мастера.');
  const ia=a[1][1]/det,ib=-a[0][1]/det,ic=-a[1][0]/det,id=a[0][0]/det;
  const dx=b[0][2]-a[0][2],dy=b[1][2]-a[1][2];
  return [[ia*b[0][0]+ib*b[1][0],ia*b[0][1]+ib*b[1][1],ia*dx+ib*dy],[ic*b[0][0]+id*b[1][0],ic*b[0][1]+id*b[1][1],ic*dx+id*dy]];
}
function masterBackground(asset:DesignNode,source:DesignNode,master:MasterNode,stage:FrameNode):DesignNode{
  // Preserve the master's existing crop, including images larger than the frame.
  if(!coversMaster(source,master))return asset;
  const frame=figma.createFrame();stage.appendChild(frame);frame.name='Фон · кадр мастера';
  frame.resize(master.width,master.height);frame.fills=[];frame.clipsContent=true;
  frame.appendChild(asset);resetPosition(asset);asset.relativeTransform=relativeToMaster(source,master);
  return frame;
}
function subtreeHas(n:SceneNode,ids:Set<string>):boolean{if(ids.has(n.id))return true;return 'children'in n&&n.children.some(c=>subtreeHas(c,ids));}
// Remove from a clone the nodes whose originals are listed, walking original and clone in parallel.
function pruneClone(orig:SceneNode,clone:SceneNode,remove:Set<string>){
  if(!('children'in orig)||!('children'in clone))return;
  const a=[...orig.children],b=[...clone.children];
  for(let i=0;i<a.length;i++){const o=a[i];let c=b[i];if(!c)continue;
    if(remove.has(o.id)){c.remove();continue;}
    if(subtreeHas(o,remove)){if(c.type==='INSTANCE')c=c.detachInstance();pruneClone(o,c,remove);}
  }
}
// The whole background scene of the master: image, overlays, glows and decor — everything except text and the
// foreground roles. A logo's glow belongs to the logo and leaves the scene with it.
function sceneBackground(master:MasterNode,stage:FrameNode,sources:Assets):FrameNode{
  const remove=new Set<string>();
  for(const k of ROLE_KEYS){const s=sources[k];if(!s||k==='visual')continue;
    remove.add(s.id);}
  for(const t of descendants(master,3000))if(t.type==='TEXT')remove.add(t.id);
  const wrap=figma.createFrame();stage.appendChild(wrap);wrap.name='Фон · сцена мастера';wrap.resize(master.width,master.height);wrap.fills=[];wrap.clipsContent=true;
  let copy:SceneNode=master.type==='COMPONENT'?master.createInstance():master.clone();wrap.appendChild(copy);
  if(copy.type==='INSTANCE'&&subtreeHas(master,remove))copy=copy.detachInstance();
  resetPosition(copy as DesignNode);copy.x=0;copy.y=0;if('rotation'in copy)copy.rotation=0;
  pruneClone(master,copy,remove);copy.name='Сцена';
  if('setSharedPluginData'in copy){copy.setSharedPluginData(DATA_NS,'settings','');copy.setSharedPluginData(DATA_NS,'batch','');copy.setSharedPluginData(DATA_NS,'trial','');}
  return wrap;
}
// Bounds of nodes relative to the master, 0–1; used to learn where the master keeps its text relative to the picture.
function unionBox(list:(DesignNode|undefined)[],master:MasterNode):Rect01|null{
  const mb=master.absoluteBoundingBox,bs=list.map(n=>n?.absoluteBoundingBox).filter((b):b is Rect=>!!b);if(!mb||!bs.length)return null;
  const x0=Math.min(...bs.map(b=>b.x)),y0=Math.min(...bs.map(b=>b.y)),x1=Math.max(...bs.map(b=>b.x+b.width)),y1=Math.max(...bs.map(b=>b.y+b.height));
  return {x:(x0-mb.x)/mb.width,y:(y0-mb.y)/mb.height,w:(x1-x0)/mb.width,h:(y1-y0)/mb.height};
}
function textLuminance(n?:DesignNode):number|null{
  if(!n)return null;const t=n.type==='TEXT'?n:descendants(n).find(x=>x.type==='TEXT');if(!t||!('fills'in t)||!Array.isArray(t.fills))return null;
  const f=t.fills.find(p=>p.type==='SOLID'&&p.visible!==false) as SolidPaint|undefined;return f?luminance(f.color):null;
}
function masterMetrics(sources:Assets,assets:Assets,master:MasterNode):Metrics{
  const H=sources.headline?sizeOf(sources.headline):0,ref=H||Math.max(12,master.height*.04);
  const box=(n?:DesignNode)=>n?.absoluteBoundingBox||null;
  const gap=(a?:DesignNode,b?:DesignNode,fallback=.35)=>{const x=box(a),y=box(b);if(!x||!y)return fallback;const g=y.y-(x.y+x.height);return g>=0&&g<ref*3?g/ref:fallback;};
  return {head:ref,date:sources.date?sizeOf(sources.date)||ref*.55:ref*.55,body:sources.body?sizeOf(sources.body)||ref*.6:ref*.6,cta:sources.cta?sources.cta.height:ref*1.4,
    logoH:assets.logo?assets.logo.height/ref:0,gapDate:gap(sources.date,sources.headline,.3),gapBody:gap(sources.headline,sources.body,.35),gapCta:gap(sources.body||sources.headline,sources.cta,.55),mw:master.width,mh:master.height,headEm:sources.headline?sources.headline.width/ref:0,textBox:unionBox([sources.date,sources.headline,sources.body,sources.cta],master),visualBox:unionBox([sources.visual],master),textLum:textLuminance(sources.headline)} as Metrics;
}
function paintVisible(n:DesignNode){return ('fills'in n && Array.isArray(n.fills)&&n.fills.some(p=>p.visible!==false&&(p.opacity??1)>.01))||('strokes'in n&&n.strokes.some(p=>p.visible!==false));}
function hexColor(n:RGB){return '#'+[n.r,n.g,n.b].map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('');}
function rgb(hex:string):RGB{if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Укажите цвет в формате #112233.');return {r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255};}
function analyze(master:MasterNode){
  const nodes=descendants(master), texts=nodes.filter(n=>n.type==='TEXT');
  const ctaText=texts.find(n=>/регистрац|подробнее|купить|заказать|узнать|перейти|register|learn more|sign up|buy now/i.test(n.characters));
  const cta=nodes.find(n=>/^(cta|button|кнопка)(\b|[ _-])/i.test(n.name))||(ctaText&&ctaText.parent&&ctaText.parent!==master&&['FRAME','INSTANCE','COMPONENT','GROUP'].includes(ctaText.parent.type)?ctaText.parent:ctaText);
  const freeTexts=texts.filter(n=>!cta||!isInside(n,cta));
  const date=freeTexts.find(n=>/\b\d{1,2}[–—-]\d{1,2}|октября|ноября|декабря|января|февраля|марта|апреля|июня|июля|августа|сентября|\d{2}\.\d{2}/i.test(n.characters));
  const headline=freeTexts.filter(n=>n!==date).sort((a,b)=>{const sz=(n:TextNode)=>typeof n.fontSize==='number'?n.fontSize:20;return sz(b)-sz(a)||b.width*b.height-a.width*a.height;})[0];
  const images=nodes.filter(imagePaint).sort((a,b)=>b.width*b.height-a.width*a.height);
  const visual=nodes.find(n=>/^(hero|visual|key visual|имидж|иллюстрация)/i.test(n.name))||images[0];
  let logo=nodes.find(n=>/logo|логотип/i.test(n.name));
  if(!logo)logo=nodes.find(n=>n.parent===master&&['FRAME','GROUP'].includes(n.type)&&n!==cta&&n!==visual&&descendants(n).some(x=>x.type==='VECTOR')&&!descendants(n).some(x=>x.type==='TEXT'||imagePaint(x)));
  const body=freeTexts.find(n=>n!==headline&&n!==date);
  const roles:Record<Role,string>={logo:'',headline:'',date:'',body:'',cta:'',visual:''};for(const k of ROLE_KEYS){const n=({logo,headline,date,body,cta,visual})[k];roles[k]=n?n.id:'';}
  let bg={r:.0314,g:.0706,b:.149};
  const large=[master,...nodes.filter(n=>n.width*n.height>=master.width*master.height*.35)];
  const solids:SolidPaint[]=[];for(const n of large)if('fills'in n&&Array.isArray(n.fills))for(const p of n.fills)if(p.type==='SOLID'&&p.visible!==false&&(p.opacity??1)>.8)solids.push(p);
  if(solids.length)bg=solids.sort((a,b)=>a.color.r+a.color.g+a.color.b-b.color.r-b.color.g-b.color.b)[0].color;
  const candidates=nodes.map(n=>({id:n.id,name:n.name.slice(0,72),type:n.type,width:Math.round(n.width),height:Math.round(n.height),text:n.type==='TEXT'?n.characters.slice(0,200):undefined}));
  return {id:master.id,name:master.name,width:master.width,height:master.height,roles,candidates,background:hexColor(bg),textCount:texts.length};
}
function validateSizes(raw:unknown):Size[]{
  if(!Array.isArray(raw)||!raw.length||raw.length>60)throw new Error('Выберите от 1 до 60 размеров.');
  const seen=new Set<string>(), sizes:Size[]=[];let pixels=0;
  for(const s of raw){const w=Number(s[0]),h=Number(s[1]);if(!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||w>6000||h>6000)throw new Error('Размеры должны быть целыми: от 32 до 6000 px.');const key=w+'x'+h;if(seen.has(key))continue;seen.add(key);pixels+=w*h;sizes.push([w,h]);}
  if(pixels>120000000)throw new Error('Слишком большой набор. Разделите его на несколько запусков.');return sizes;
}
function validatePlan(raw:unknown,sizes:Size[]):Record<string,Overrides>{
  if(!raw||!String(raw).trim())return {};
  if(String(raw).length>16000)throw new Error('Ответ AI слишком большой. Максимум 16 000 символов.');
  const cleaned=String(raw).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');let p:unknown;
  try{p=JSON.parse(cleaned);}catch(_e){throw new Error('Ответ AI должен быть JSON. Скопируйте объект целиком.');}
  if(!record(p)||p.version!==1||!Array.isArray(p.variants)||p.variants.length>60)throw new Error('Неверная схема AI: нужны version: 1 и variants.');
  const allowed=new Set(sizes.map(s=>s.join('x'))), result:Record<string,Overrides>={};
  for(const v of p.variants){if(!record(v)||typeof v.size!=='string')throw new Error('AI: неверный формат записи.');if(!allowed.has(v.size))throw new Error('AI указал размер, которого нет в наборе: '+v.size);if(result[v.size])throw new Error('Повтор размера в AI: '+v.size);const out:Overrides={};const ranges:Array<['focusX'|'focusY'|'zoom'|'headlineScale',number,number]>=[['focusX',0,100],['focusY',0,100],['zoom',100,500],['headlineScale',.6,1.4]];for(const [k,a,b]of ranges)if(v[k]!==undefined){if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<a||v[k]>b)throw new Error('AI: '+k+' должен быть от '+a+' до '+b);out[k]=v[k];}if(v.visualSide!==undefined){if(typeof v.visualSide!=='string'||!['left','right','auto'].includes(v.visualSide))throw new Error('AI: visualSide должен быть left, right или auto.');out.visualSide=v.visualSide;}result[v.size]=out;}
  return result;
}
function validateOverrides(raw:unknown):Record<string,Overrides>{
  if(raw===undefined)return {};
  if(!record(raw)||Object.keys(raw).length>60)throw new Error('Индивидуальные настройки: максимум 60 форматов.');
  const result:Record<string,Overrides>={};
  for(const key of Object.keys(raw)){
    if(!/^[1-9]\d{1,3}x[1-9]\d{1,3}$/.test(key))throw new Error('Неверный размер индивидуальных настроек.');
    validateSizes([key.split('x').map(Number)]);const v=raw[key];if(!record(v))throw new Error('Неверные параметры формата '+key);
    const out:Overrides={};
    for(const [name,lo,hi]of [['focusX',0,100],['focusY',0,100],['zoom',100,500],['headlineScale',.6,1.4]] as const){if(v[name]!==undefined){if(typeof v[name]!=='number'||!Number.isFinite(v[name])||v[name]<lo||v[name]>hi)throw new Error(key+': параметр '+name+' должен быть от '+lo+' до '+hi);out[name]=v[name];}}
    if(v.visualSide!==undefined){if(!['left','right','auto'].includes(v.visualSide as string))throw new Error('Неверная сторона изображения.');out.visualSide=v.visualSide as string;}
    if(v.textPos!==undefined){if(!['auto','top','bottom','left','right'].includes(v.textPos as string))throw new Error('Неверное положение текста.');out.textPos=v.textPos as string;}
    if(v.imageFit!==undefined){if(!['auto',...FITS].includes(v.imageFit as string))throw new Error('Неверный режим масштаба картинки.');if(v.imageFit!=='auto')out.imageFit=v.imageFit as string;}
    if(v.preserveMaster!==undefined){if(typeof v.preserveMaster!=='boolean')throw new Error('Неверный режим композиции.');out.preserveMaster=v.preserveMaster;}
    result[key]=out;
  }return result;
}
function variantOptions(options:Options,key:string,ai:Record<string,Overrides>):Options{
  const a=ai[key]||{},o=options.variantOverrides?.[key]||{};
  // A per-format focus that differs from the shared one moves the subject; otherwise the detected subject box is used.
  const moved=(v:Overrides)=>(v.focusX!==undefined&&v.focusX!==options.focusX)||(v.focusY!==undefined&&v.focusY!==options.focusY);
  return {...options,...a,...o,focusOverride:moved(a)||moved(o)};
}
function fontMetrics(n:DesignNode){
  const texts=n.type==='TEXT'?[n]:descendants(n).filter((t):t is TextNode=>t.type==='TEXT');
  const sizes:number[]=[];for(const t of texts){if(typeof t.fontSize==='number')sizes.push(t.fontSize);else for(const seg of t.getStyledTextSegments(['fontSize']))sizes.push(seg.fontSize);}
  return {min:sizes.length?Math.min(...sizes):0,max:sizes.length?Math.max(...sizes):0};
}
async function loadNodeFonts(node:DesignNode){
  const texts=node.type==='TEXT'?[node]:descendants(node).filter(n=>n.type==='TEXT');
  const faces=new Map<string,FontName>();for(const t of texts){if(!t.characters.length){if(t.fontName!==figma.mixed)faces.set(JSON.stringify(t.fontName),t.fontName);}else for(const f of t.getRangeAllFontNames(0,t.characters.length))faces.set(JSON.stringify(f),f);}
  const missing=[];for(const f of faces.values()){try{await figma.loadFontAsync(f);}catch(_e){missing.push(f.family+' '+f.style);}}return missing;
}
function resetPosition(n:DesignNode){n.locked=false;if('layoutPositioning'in n)n.layoutPositioning='AUTO';if('constraints'in n)n.constraints={horizontal:'MIN',vertical:'MIN'};}
function inkLeaves(node:DesignNode){
  return (node.type==='VECTOR'?[node]:descendants(node)).filter(n=>['VECTOR','BOOLEAN_OPERATION','TEXT','RECTANGLE','ELLIPSE'].includes(n.type)&&paintVisible(n)&&n.opacity>.1&&(!('effects'in n)||!n.effects.some(e=>e.visible!==false&&e.type==='LAYER_BLUR'))&&!imagePaint(n)).filter((n,i,all)=>!all.some((p,j)=>i!==j&&isInside(n,p)));
}
async function prepareAsset(source:DesignNode,role:Role,stage:FrameNode,options:Options,warnings:Set<string>):Promise<DesignNode>{
  const missing=await loadNodeFonts(source);
  if(missing.length){
    if(!options.outlineMissing)throw new Error('Недоступен шрифт '+missing.join(', ')+'. Установите его или включите перевод в кривые.');
    const svg=await source.exportAsync({format:'SVG_STRING',svgOutlineText:true});const n=figma.createNodeFromSvg(svg);stage.appendChild(n);n.name=ROLE_NAMES[role]+' · в кривых';{const fm=fontMetrics(source);n.setSharedPluginData(DATA_NS,'textMin',String(fm.min));n.setSharedPluginData(DATA_NS,'textMax',String(fm.max));}warnings.add(ROLE_NAMES[role]+': шрифт недоступен ('+missing.join(', ')+'), слой переведён в кривые.');return n;
  }
  if(role==='logo'&&options.trimLogo){
    const leaves=inkLeaves(source);
    if(leaves.length&&leaves.length<100){const boxes=leaves.map(n=>n.absoluteBoundingBox).filter((b):b is Rect=>b!==null);const minX=Math.min(...boxes.map(b=>b.x)),minY=Math.min(...boxes.map(b=>b.y)),maxX=Math.max(...boxes.map(b=>b.x+b.width)),maxY=Math.max(...boxes.map(b=>b.y+b.height));const group=figma.createFrame();stage.appendChild(group);group.name='Логотип · без световых эффектов';group.fills=[];group.clipsContent=false;group.resize(Math.max(1,maxX-minX),Math.max(1,maxY-minY));for(const leaf of leaves){const matrix=cloneData(leaf.absoluteTransform),n=leaf.clone();group.appendChild(n);resetPosition(n);matrix[0][2]-=minX;matrix[1][2]-=minY;n.relativeTransform=matrix;}return group;}
  }
  const n=source.clone();stage.appendChild(n);resetPosition(n);n.name=ROLE_NAMES[role];n.x=0;n.y=0;return n;
}
function contain(asset:DesignNode,parent:FrameNode,box:Box,align='left',maxScale=Infinity):DesignNode{
  const n=asset.clone();parent.appendChild(n);resetPosition(n);const s=Math.min(box.w/n.width,box.h/n.height,maxScale);n.rescale(s);n.x=box.x+(align==='center'?(box.w-n.width)/2:0);n.y=box.y+(box.h-n.height)/2;return n;
}
// Nominal type size of a role asset: live text reports its own sizes, outlined text keeps the sizes measured before outlining.
function sizeOf(n:DesignNode):number{
  if(n.type==='TEXT'||descendants(n).some(t=>t.type==='TEXT'))return fontMetrics(n).max;
  return Number(n.getSharedPluginData(DATA_NS,'textMax'))||0;
}
function minSizeOf(n:DesignNode):number{
  if(n.type==='TEXT'||descendants(n).some(t=>t.type==='TEXT'))return fontMetrics(n).min;
  return Number(n.getSharedPluginData(DATA_NS,'textMin'))||0;
}
function layout(w:number,h:number,side='right'):Layout{
  const r=w/h,B=(x:number,y:number,ww:number,hh:number):Box=>({x:x*w,y:y*h,w:ww*w,h:hh*h});let b:Layout;
  if(w<600&&h<=140&&r>=2&&r<4)b={kind:'Компактный',logo:B(.035,.1,.22,.8),text:B(.29,.08,.43,.84),align:'center',ctaInStack:false,cta:B(.745,.25,.23,.5),visual:B(.5,0,.5,1),font:h*.2};
  else if(r>=4)b={kind:'Полоса',logo:B(.025,.16,.12,.68),text:B(.17,.1,.39,.8),align:'center',ctaInStack:false,cta:B(.80,.22,.175,.56),visual:B(.57,.02,.21,.96),font:h*.26};
  else if(r>=2.6)b={kind:'Широкий',logo:B(.035,.14,.16,.72),text:B(.23,.1,.40,.8),align:'center',ctaInStack:true,cta:B(0,0,0,0),visual:B(.65,.04,.32,.92),font:h*.15};
  else if(r>=1.55)b={kind:'Горизонталь',logo:B(.055,.07,.25,.22),text:B(.055,.34,.47,.59),align:'end',ctaInStack:true,cta:B(0,0,0,0),visual:B(.53,.055,.44,.89),font:h*.085};
  else if(r>=.88)b={kind:'Квадрат',logo:B(.07,.055,.31,.23),text:B(.07,.54,.86,.40),align:'end',ctaInStack:true,cta:B(0,0,0,0),visual:B(.405,.08,.55,.47),font:w*.055};
  else if(r>=.4)b={kind:'Вертикаль',logo:B(.08,.045,.40,.14),text:B(.08,.62,.84,.32),align:'center',ctaInStack:true,cta:B(0,0,0,0),visual:B(.04,.215,.92,.365),font:w*.065};
  else b={kind:'Скайскрейпер',logo:B(.10,.045,.80,.125),text:B(.08,.5,.84,.45),align:'start',ctaInStack:true,cta:B(0,0,0,0),visual:B(.025,.21,.95,.26),font:w*.1};
  if((b.kind==='Горизонталь'||b.kind==='Широкий')&&side==='left'){for(const k of ['logo','text','visual'] as const)b[k].x=w-b[k].x-b[k].w;b.variant='картинка слева';}
  return b;
}
// Alternative compositions of the same format. The engine tries them and keeps the one where the text
// does not cover the main object, reads well and keeps the master's text-to-picture arrangement.
function layoutCandidates(w:number,h:number,side='auto'):Layout[]{
  const base=layout(w,h,side==='left'?'left':'right'),B=(x:number,y:number,ww:number,hh:number):Box=>({x:x*w,y:y*h,w:ww*w,h:hh*h}),out=[base];
  if((base.kind==='Горизонталь'||base.kind==='Широкий')&&side==='auto')out.push(layout(w,h,'left'));
  if(base.kind==='Горизонталь')out.push({...base,variant:'текст сверху',logo:B(.045,.07,.2,.17),text:B(.27,.06,.68,.34),align:'start',visual:B(0,.42,1,.58)});
  if(base.kind==='Полоса'&&side!=='right')out.push({...base,variant:'картинка у логотипа',visual:B(.165,.02,.21,.96),text:B(.39,.1,.39,.8)});
  if(base.kind==='Квадрат'){out.push({...base,variant:'текст сверху',logo:B(.07,.055,.31,.2),text:B(.07,.27,.86,.32),align:'start',visual:B(.2,.6,.75,.37)});
    out.push({...base,variant:'текст слева',logo:B(.07,.055,.31,.2),text:B(.07,.3,.44,.62),align:'end',visual:B(.53,.08,.44,.84)});}
  if(base.kind==='Вертикаль')out.push({...base,variant:'текст сверху',logo:B(.08,.045,.40,.12),text:B(.08,.18,.84,.3),align:'start',visual:B(0,.5,1,.5)});
  if(base.kind==='Скайскрейпер')out.push({...base,variant:'текст сверху',logo:B(.10,.045,.80,.11),text:B(.08,.17,.84,.4),align:'start',visual:B(.025,.61,.95,.36)});
  return out;
}
function addFade(parent:FrameNode,w:number,h:number,color:RGB){
  const transforms:Transform[]=[[[1,0,0],[0,1,0]],[[0,1,0],[-1,0,1]]];
  for(let i=0;i<2;i++){const n=figma.createRectangle();parent.appendChild(n);n.name='Мягкие края';n.resize(w,h);n.fills=[{type:'GRADIENT_LINEAR',gradientTransform:transforms[i],gradientStops:[{position:0,color:{...color,a:1}},{position:.12,color:{...color,a:0}},{position:.88,color:{...color,a:0}},{position:1,color:{...color,a:1}}]}];n.locked=true;}
}
// Place the subject (box in 0–1 of the asset) at the centre of target, without ever uncovering the crop frame.
// With the default 100% zoom the image may grow up to 25% when that is what it takes to reach the target.
// An object taller than its zone is aligned by its top (roofs, heads and labels read best), otherwise centred.
// AI framing may ask to align it by the bottom or keep it centred.
function placeSubject(nw:number,nh:number,box:Box,target:Box,center:{x:number;y:number},auto:boolean,sh=0,anchor='top'){
  const solve=(z:number)=>{const w=nw*z,h=nh*z;const tall=sh*h>target.h&&anchor!=='center';const want={x:target.x-box.x+target.w/2-w*center.x,y:!tall?target.y-box.y+target.h/2-h*center.y:anchor==='bottom'?target.y-box.y+target.h*.97-h*(center.y+sh/2):target.y-box.y+target.h*.03-h*(center.y-sh/2)};
    const x=clamp(want.x,Math.min(0,box.w-w),Math.max(0,box.w-w)),y=clamp(want.y,Math.min(0,box.h-h),Math.max(0,box.h-h));return {z,x,y,err:Math.max(Math.abs(x-want.x)/box.w,Math.abs(y-want.y)/box.h)};};
  let best=solve(1);if(!auto||best.err<.015)return best;
  for(let z=1.025;z<=1.2501;z+=.025){const s=solve(z);if(s.err<.015)return s;if(s.err<best.err-.01)best=s;}
  return best;
}
// Soft transitions from the picture into the flat edge colour wherever the picture ends inside its frame.
function edgeFades(frame:FrameNode,x:number,y:number,w:number,h:number,c:RGB){
  const d=Math.max(2,Math.min(w,h)*.14),sides:[boolean,number,number,number,number,Transform][]=[
    [x>.5,x,y,d,h,[[1,0,0],[0,1,0]]],[x+w<frame.width-.5,x+w-d,y,d,h,[[-1,0,1],[0,1,0]]],
    [y>.5,x,y,w,d,[[0,1,0],[1,0,0]]],[y+h<frame.height-.5,x,y+h-d,w,d,[[0,-1,1],[1,0,0]]]];
  for(const [on,rx,ry,rw,rh,t] of sides){if(!on)continue;const r=figma.createRectangle();frame.appendChild(r);r.name='Переход в цвет фона';r.resize(Math.max(1,rw),Math.max(1,rh));r.x=rx;r.y=ry;r.locked=true;
    r.fills=[{type:'GRADIENT_LINEAR',gradientTransform:t,gradientStops:[{position:0,color:{...c,a:1}},{position:1,color:{...c,a:0}}]}];}
}
// Where the picture lands inside its frame: scale and offset (frame coordinates). Pure — also used to compare layouts.
function visualGeometry(aw:number,ah:number,box:Box,target:Box,options:Options){
  const base=options.fit==='contain'?Math.min(box.w/aw,box.h/ah):Math.max(box.w/aw,box.h/ah);
  const s=options.subject&&!options.focusOverride?options.subject:null;
  const center=s?{x:s.x+s.w/2,y:s.y+s.h/2}:{x:options.focusX/100,y:options.focusY/100};
  const edge=extendOn(options),force=options.imageFit==='extend';
  let scale=base*options.zoom/100,auto=!!s&&options.zoom===100&&options.fit!=='contain';
  if(options.imageFit==='width'||options.imageFit==='height'){
    scale=(options.imageFit==='width'?box.w/aw:box.h/ah)*options.zoom/100;
    const p=placeSubject(aw*scale,ah*scale,box,options.isBackground?target:{...box},center,false,s?s.h:0,options.aiAnchor||'top');
    return {scale,x:p.x,y:p.y,w:aw*scale,h:ah*scale};
  }
  if(edge&&s){const zone=options.isBackground?target:box,bg=!!options.isBackground;
    const fit=Math.min(zone.h*(bg?.9:.86)/(s.h*ah),zone.w*(bg?1:.9)/(s.w*aw))*options.zoom/100;
    // A background shrinks where the object would be cut by the banner edges or clearly overflows its zone
    // (and would end up under the text); the freed space takes the backdrop colour.
    const cut=s.h*ah*scale>box.h*.94||s.w*aw*scale>box.w*.94;
    if(!bg||((force||cut||fit<scale*.9)&&fit<scale)){scale=fit;auto=false;}}
  const p=placeSubject(aw*scale,ah*scale,box,options.isBackground?target:{...box},center,auto,s?s.h:0,options.aiAnchor||'top');
  return {scale:scale*p.z,x:p.x,y:p.y,w:aw*scale*p.z,h:ah*scale*p.z};
}
function visualInto(asset:DesignNode,parent:FrameNode,box:Box,target:Box,options:Options,color:RGB){
  const frame=figma.createFrame();parent.appendChild(frame);frame.name='Изображение · кадрирование';frame.resize(box.w,box.h);frame.x=box.x;frame.y=box.y;frame.clipsContent=true;frame.fills=[];
  const n=asset.clone();frame.appendChild(n);resetPosition(n);
  // A picture whose edges are one flat colour (object shot on a plain backdrop) can be smaller than its frame:
  // the rest is filled with that colour, so the whole object fits narrow formats instead of being cut.
  const edge=extendOn(options)?rgb(edgeHex(options)):null;
  const g=visualGeometry(n.width,n.height,box,target,options);n.rescale(g.scale);n.x=g.x;n.y=g.y;const p=g;
  if(edge){frame.fills=[{type:'SOLID',color:edge}];edgeFades(frame,p.x,p.y,n.width,n.height,edge);}
  else if(options.fade&&!options.isBackground)addFade(frame,box.w,box.h,color);
  return {frame,map:(u:number,v:number)=>({x:box.x+p.x+u*n.width,y:box.y+p.y+v*n.height})};
}
const area=(b:Box)=>Math.max(0,b.w)*Math.max(0,b.h);
const overlap=(a:Box,b:Box)=>area({x:0,y:0,w:Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h:Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)});
// Score each candidate composition without building it: lower is better.
function scoreLayout(b:Layout,index:number,asset:DesignNode|undefined,options:Options,m:Metrics,w:number,h:number){
  let subj:Box|null=null,map:((u:number,v:number)=>{x:number;y:number})|null=null;
  if(asset){const box=options.isBackground?{x:0,y:0,w,h}:b.visual,o=options.isBackground?{...options,fit:'cover'}:options,g=visualGeometry(asset.width,asset.height,box,b.visual,o);
    map=(u,v)=>({x:box.x+g.x+u*g.w,y:box.y+g.y+v*g.h});
    const s=options.subject&&!options.focusOverride?options.subject:null;
    if(s){const a=map(s.x,s.y),c=map(s.x+s.w,s.y+s.h);subj={x:a.x,y:a.y,w:c.x-a.x,h:c.y-a.y};}
    else if(!options.isBackground)subj={...b.visual};}
  const text=b.text,frameBox={x:0,y:0,w,h};
  // 1. The object must stay clear: share of the visible object covered by text, button and logo.
  let cover=0;if(subj){const vis=Math.max(1,overlap(subj,frameBox));cover=(overlap(subj,text)+(b.ctaInStack?0:overlap(subj,b.cta))+.5*overlap(subj,b.logo))/vis;}
  // 2. Readability: share of the text zone where the background would not give 3:1 contrast.
  let bad=0;const g=options.luma;
  if(g&&map&&options.isBackground&&m.textLum!==null){const N=Math.round(Math.sqrt(g.length)),o=map(0,0),e=map(1,1);let n=0;
    for(let yy=0;yy<6;yy++)for(let xx=0;xx<8;xx++){const px=text.x+text.w*(xx+.5)/8,py=text.y+text.h*(yy+.5)/6,u=(px-o.x)/(e.x-o.x),v=(py-o.y)/(e.y-o.y);if(u<0||u>1||v<0||v>1)continue;
      const L=g[Math.min(N-1,Math.floor(v*N))*N+Math.min(N-1,Math.floor(u*N))],r=(Math.max(L,m.textLum)+.05)/(Math.min(L,m.textLum)+.05);n++;if(r<3)bad++;}
    bad=n?bad/n:0;}
  // 3. Same arrangement as the master: direction from the picture's object to the text block.
  let prior=0;const ms=options.subject&&!options.focusOverride?(options.isBackground?options.subject:(m.visualBox?{x:m.visualBox.x+options.subject.x*m.visualBox.w,y:m.visualBox.y+options.subject.y*m.visualBox.h,w:options.subject.w*m.visualBox.w,h:options.subject.h*m.visualBox.h}:null)):(options.isBackground?null:m.visualBox);
  if(m.textBox&&ms&&subj){const dx=(m.textBox.x+m.textBox.w/2)-(ms.x+ms.w/2),dy=(m.textBox.y+m.textBox.h/2)-(ms.y+ms.h/2),cx=(text.x+text.w/2-subj.x-subj.w/2)/w,cy=(text.y+text.h/2-subj.y-subj.h/2)/h;
    const l=Math.hypot(dx,dy)*Math.hypot(cx,cy);if(l>1e-6)prior=(1-(dx*cx+dy*cy)/l)/2;}
  // 4. Calm background under the text: detail and edges of the picture (columns, textures) make text hard to read.
  let busy=0;const bz=options.busy;
  if(bz&&map&&options.isBackground){const N=Math.round(Math.sqrt(bz.length)),o=map(0,0),e=map(1,1);let n=0,sum=0;
    for(let yy=0;yy<6;yy++)for(let xx=0;xx<8;xx++){const px=text.x+text.w*(xx+.5)/8,py=text.y+text.h*(yy+.5)/6,u=(px-o.x)/(e.x-o.x),v=(py-o.y)/(e.y-o.y);n++;if(u<0||u>1||v<0||v>1)continue;sum+=bz[Math.min(N-1,Math.floor(v*N))*N+Math.min(N-1,Math.floor(u*N))];}
    busy=n?sum/n:0;}
  // 5. A larger object is better, all else equal.
  const big=subj?Math.min(1,overlap(subj,frameBox)/(w*h)):0;
  return {score:6*cover+1.5*bad+2.5*busy+prior+.15*index-.6*big,cover,bad,prior,busy};
}
// Where the text block sits in a layout: top / bottom / left / right (by its centre).
function textSide(b:Layout,w:number,h:number){const cx=(b.text.x+b.text.w/2)/w,cy=(b.text.y+b.text.h/2)/h;
  return {v:cy<.45?'top':cy>.55?'bottom':'middle',hz:cx<.45?'left':cx>.55?'right':'center'};}
// No logo in the master: the text column takes over the empty logo slot next to or above it.
function withoutLogoSlot(b:Layout,w:number,h:number):Layout{
  const l=b.logo,t={...b.text};
  if(l.x+l.w<=t.x+1&&t.x-(l.x+l.w)<=w*.06&&l.y<t.y+t.h&&t.y<l.y+l.h){t.w+=t.x-l.x;t.x=l.x;}
  else if(l.y+l.h<=t.y+1&&t.y-(l.y+l.h)<=h*.08&&l.x<t.x+t.w&&t.x<l.x+l.w){t.h+=t.y-l.y;t.y=l.y;}
  else return b;
  return {...b,text:t,logo:{...l,w:0,h:0}};
}
function chooseLayout(cands:Layout[],asset:DesignNode|undefined,options:Options,m:Metrics,w:number,h:number){
  // A per-format choice of the text side narrows the candidates; if no scheme matches, all stay.
  const pos=options.textPos;if(pos&&pos!=='auto'){const f=cands.filter(c=>{const s=textSide(c,w,h);return s.v===pos||s.hz===pos;});if(f.length)cands=f;}
  if(options.placement==='fixed'||cands.length===1)return cands[0];
  if(options.placement==='master'&&m.textBox){const tx=m.textBox.x+m.textBox.w/2,ty=m.textBox.y+m.textBox.h/2;let best=cands[0],d=Infinity;
    for(const c of cands){const dd=Math.hypot((c.text.x+c.text.w/2)/w-tx,(c.text.y+c.text.h/2)/h-ty);if(dd<d-1e-6){d=dd;best=c;}}return best;}
  // A smaller text zone than the format's main scheme costs a little: text there gets smaller.
  const room=area(cands[0].text);let best=cands[0],bestScore=Infinity;
  cands.forEach((c,i)=>{const s=scoreLayout(c,i,asset,options,m,w,h).score+.5*Math.max(0,1-area(c.text)/room);if(s<bestScore){bestScore=s;best=c;}});return best;
}
type StackItem={role:Role;node:DesignNode;ratio:number;base:number;gap:number;min:number};
// Scale one stack item to a target type size (px). Live text wraps to the column; vectors and buttons scale as a whole.
function sizeItem(it:StackItem,size:number,width:number){
  const n=it.node,k=size/it.base;if(Math.abs(k-1)>1e-4){n.rescale(k);it.base=size;}
  if(n.type==='TEXT'){n.textAutoResize='WIDTH_AND_HEIGHT';if(n.width>width){n.textAutoResize='HEIGHT';n.resize(Math.max(1,width),n.height);}}
  else if(n.width>width+.5){const f=width/n.width;n.rescale(f);it.base*=f;}
}
function textStack(assets:Assets,frame:FrameNode,b:Layout,m:Metrics,options:Options,warnings:Set<string>,label:string,w:number,h:number){
  const col=b.text,items:StackItem[]=[];
  const add=(role:Role,ratio:number,gap:number)=>{const a=assets[role];if(!a)return;const n=a.clone();frame.appendChild(n);resetPosition(n);n.name=ROLE_NAMES[role];
    if(n.type==='TEXT')n.textAlignVertical='TOP';items.push({role,node:n,ratio,base:role==='cta'?a.height:sizeOf(a)||m.head,gap,min:role==='cta'?0:minSizeOf(a)});};
  add('date',m.date/m.head,m.gapDate);add('headline',1,0);add('body',m.body/m.head,m.gapBody);if(b.ctaInStack)add('cta',m.cta/m.head,m.gapCta);
  if(!items.length)return 0;
  const head=items.find(i=>i.role==='headline');
  const minimum=options.minFont;
  // Smallest headline allowed: the threshold applies to its smallest styled run when the master mixes sizes.
  const floor=head&&options.enforceMinFont?minimum*(head.base/(head.min||head.base)):3;
  const apply=(hs:number)=>{let total=0;for(const it of items){let size=hs*it.ratio;if(it.role!=='headline'&&it.role!=='cta')size=Math.max(size,Math.min(minimum,hs));sizeItem(it,size,col.w);total+=it.node.height+(it===items[0]?0:it.gap*hs);}return total;};
  // Never larger than the master's own headline scaled by the larger side ratio.
  // Prefer the master's own line breaks: size the headline so its longest line fits the column,
  // unless that would make it far smaller than the format suggests — then let it wrap.
  let nominal=Math.min(b.font,m.head*Math.max(w/m.mw,h/m.mh)*1.15);
  if(m.headEm>0)nominal=Math.min(nominal,Math.max(col.w*.98/m.headEm,nominal*.72));
  let hi=Math.max(floor,nominal*options.headlineScale),lo=floor,hs=hi;
  if(apply(hi)>col.h){for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(apply(mid)>col.h)hi=mid;else lo=mid;}hs=lo;}
  const total=apply(hs);
  if(total>col.h+.5){if(options.enforceMinFont&&head)warnings.add(label+' · заголовок: не помещается при минимуме '+minimum+' px; размер сохранён, нужна ручная правка.');else if(!options.enforceMinFont)warnings.add(label+': текст не помещается в колонку, проверьте макет.');}
  let y=col.y+(b.align==='center'?(col.h-total)/2:b.align==='end'?col.h-total:0);y=Math.max(y,Math.min(col.y,0));
  for(const it of items){if(it!==items[0])y+=it.gap*hs;it.node.x=col.x;it.node.y=y;y+=it.node.height;}
  for(const it of items){const actual=it.node.type==='TEXT'?fontMetrics(it.node).min:0;if(it.role!=='cta'&&actual&&actual<minimum-.01)warnings.add(label+' · '+ROLE_NAMES[it.role].toLowerCase()+': шрифт '+actual.toFixed(1)+' px, меньше заданных '+minimum+' px.');}
  if(head&&head.node.type!=='TEXT'){const orig=Number(assets.headline!.getSharedPluginData(DATA_NS,'textMin'));if(!orig)warnings.add(label+' · заголовок: размер шрифта в готовых кривых неизвестен — проверьте читаемость.');}
  return hs;
}
// Button outside the text column (strips): master proportions, sized from the headline and limited by its box.
function buttonInto(asset:DesignNode,parent:FrameNode,box:Box,target:number,m:Metrics):DesignNode{
  const n=asset.clone();parent.appendChild(n);resetPosition(n);n.name=ROLE_NAMES.cta;
  const k=Math.min(target/n.height,box.w/n.width,box.h/n.height);n.rescale(k);
  n.x=box.x+box.w-n.width;n.y=box.y+(box.h-n.height)/2;return n;
}
function luminance(c:RGB){const f=(v:number)=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);}
type Contrast={node:SceneNode;label:string;ratio:number;light:boolean};
// Contrast of each free-standing live text against the background under it, read from an N×N luminance grid of the master background.
function measureContrast(frame:FrameNode,options:Options,map:((u:number,v:number)=>{x:number;y:number})|null):Contrast[]{
  const g=options.luma,out:Contrast[]=[];if(!g||!map)return out;const N=Math.round(Math.sqrt(g.length));
  const o=map(0,0),e=map(1,1),fb=frame.absoluteTransform,edgeL=extendOn(options)?luminance(rgb(edgeHex(options))):null;
  const logo=frame.children.find(n=>n.name===ROLE_NAMES.logo) as DesignNode|undefined;
  const items:SceneNode[]=[...descendants(frame).filter(n=>n.type==='TEXT'),...(logo?[logo]:[])];
  for(const t of items){
    let par:BaseNode|null=t.parent,onFill=false;while(par&&par!==frame){if('fills'in par&&Array.isArray(par.fills)&&par.fills.some(p=>p.visible!==false&&p.type==='SOLID'&&(p.opacity??1)>.5))onFill=true;par=par.parent;}if(onFill)continue;
    if(logo&&t!==logo&&isInside(t,logo))continue; // text inside the logo is judged with the logo
    const painted=t.type==='TEXT'?t:[t as DesignNode,...descendants(t as DesignNode)].find(n=>'fills'in n&&Array.isArray(n.fills)&&n.fills.some(p=>p.type==='SOLID'&&p.visible!==false));
    const fill=painted&&'fills'in painted&&Array.isArray(painted.fills)?painted.fills.find(p=>p.type==='SOLID'&&p.visible!==false) as SolidPaint|undefined:undefined;if(!fill)continue;
    const bb=t.absoluteBoundingBox;if(!bb)continue;const x0=bb.x-fb[0][2],y0=bb.y-fb[1][2];
    const vals:number[]=[];for(let yy=0;yy<4;yy++)for(let xx=0;xx<10;xx++){const px=x0+bb.width*(xx+.5)/10,py=y0+bb.height*(yy+.5)/4;const u=(px-o.x)/(e.x-o.x),v=(py-o.y)/(e.y-o.y);if(u<0||u>1||v<0||v>1){if(edgeL!==null)vals.push(edgeL);continue;}vals.push(g[Math.min(N-1,Math.floor(v*N))*N+Math.min(N-1,Math.floor(u*N))]);}
    if(!vals.length)continue;const L1=luminance(fill.color),light=L1>.4;
    // The worst quarter of the area decides: a bright patch behind part of a line is enough to break it.
    vals.sort((a,b)=>light?b-a:a-b);const q=vals.slice(0,Math.max(1,Math.ceil(vals.length/4)));const L2=q.reduce((a,b)=>a+b,0)/q.length;
    out.push({node:t,label:t.type==='TEXT'?'текста «'+t.characters.slice(0,24)+'»':'логотипа',ratio:(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05),light});
  }
  return out;
}
// A soft gradient of the banner's dark colour behind the text block, added only where light text lost its contrast.
function addScrim(frame:FrameNode,b:Layout,nodes:SceneNode[],color:RGB,w:number,h:number,index:number){
  const xs=nodes.map(n=>n.x),xe=nodes.map(n=>n.x+n.width),ys=nodes.map(n=>n.y);
  const vertical=['Квадрат','Вертикаль','Скайскрейпер'].includes(b.kind),fromRight=!vertical&&b.text.x>w/2;
  const r=figma.createRectangle();frame.insertChild(index,r);r.name='Подложка под текст';r.locked=true;
  const c=luminance(color)<.25?color:{r:0,g:0,b:0};
  let edge:number;
  if(vertical){edge=Math.max(.15,1-(Math.min(...ys)-h*.08)/h);r.resize(w,h*edge);r.x=0;r.y=h-r.height;}
  else{const reach=fromRight?w-Math.min(...xs):Math.max(...xe);edge=Math.min(.85,(reach+w*.1)/w);r.resize(w*edge,h);r.x=fromRight?w-r.width:0;r.y=0;}
  const t:Transform=vertical?[[0,1,0],[-1,0,1]]:fromRight?[[-1,0,1],[0,1,0]]:[[1,0,0],[0,1,0]];
  // Gradient runs 0→1 from the text edge of the banner towards the image; text sits over the first ~80%.
  r.fills=[{type:'GRADIENT_LINEAR',gradientTransform:vertical?[[0,-1,1],[1,0,0]]:t,gradientStops:[{position:0,color:{...c,a:.78}},{position:.6,color:{...c,a:.5}},{position:1,color:{...c,a:0}}]}];
}
// Keep logo, text and button out of the platform's reserved strips; the picture still fills the banner.
function applySafeZone(b:Layout,h:number,top:number,bottom:number):Layout{
  if(!top&&!bottom)return b;const k=1-top-bottom,map=(x:Box):Box=>({x:x.x,y:h*top+x.y*k,w:x.w,h:x.h*k});
  return {...b,logo:map(b.logo),text:map(b.text),cta:map(b.cta),font:b.font*Math.max(.8,k)};
}
function textArea(frame:FrameNode){
  let a=0;const f=frame.absoluteBoundingBox!;
  for(const t of descendants(frame).filter(n=>n.type==='TEXT')){const bb=t.absoluteBoundingBox;if(!bb)continue;const w=Math.max(0,Math.min(bb.x+bb.width,f.x+f.width)-Math.max(bb.x,f.x)),hh=Math.max(0,Math.min(bb.y+bb.height,f.y+f.height)-Math.max(bb.y,f.y));a+=w*hh;}
  return a/(f.width*f.height);
}
// Platform checks for every variant, including exact copies of a master: text share and reserved strips.
function platformChecks(frame:FrameNode,w:number,h:number,ids:string[]|undefined,warnings:Set<string>){
  const rules=platformRules(ids,w,h),label=w+'×'+h,names=(f:(p:Platform)=>unknown)=>rules.used.filter(f).map(p=>p.name.split(' · ')[0]).join(', ');
  if(rules.textShare!==null){const share=textArea(frame);if(share>rules.textShare+.005)warnings.add(label+': текст занимает '+Math.round(share*100)+'% площади, '+names(p=>p.textShare)+' допускает до '+Math.round(rules.textShare*100)+'%.');}
  if(rules.safeTop||rules.safeBottom){const f=frame.absoluteBoundingBox!;
    const bad=descendants(frame).some(n=>n.type==='TEXT'&&(()=>{const b=n.absoluteBoundingBox;return !!b&&(b.y<f.y+h*rules.safeTop-.5||b.y+b.height>f.y+h*(1-rules.safeBottom)+.5);})());
    if(bad)warnings.add(label+': текст заходит в служебную зону '+names(p=>p.safeTop||p.safeBottom)+' (верхние '+Math.round(rules.safeTop*100)+'%'+(rules.safeBottom?', нижние '+Math.round(rules.safeBottom*100)+'%':'')+').');}
}
function createVariant(assets:Assets,parent:FrameNode,w:number,h:number,options:Options,m:Metrics,warnings:Set<string>,geometry?:{map:((u:number,v:number)=>{x:number;y:number})|null}){
  const rules=platformRules(options.platforms,w,h);
  const cands=layoutCandidates(w,h,options.visualSide).map(c=>applySafeZone(c,h,rules.safeTop,rules.safeBottom));
  if(!assets.logo)for(let i=0;i<cands.length;i++)cands[i]=withoutLogoSlot(cands[i],w,h);
  const b=chooseLayout(cands,assets.visual,options,m,w,h), frame=figma.createFrame();parent.appendChild(frame);frame.name=w+'×'+h+' · '+b.kind+(b.variant?' · '+b.variant:'');frame.resize(w,h);frame.clipsContent=true;const color=extendOn(options)&&assets.visual?rgb(edgeHex(options)):rgb(options.background);frame.fills=[{type:'SOLID',color}];frame.exportSettings=[{format:'PNG',suffix:'',constraint:{type:'SCALE',value:1}}];
  const label=w+'×'+h;let map:((u:number,v:number)=>{x:number;y:number})|null=null;
  if(assets.visual){const v=visualInto(assets.visual,frame,options.isBackground?{x:0,y:0,w,h}:b.visual,b.visual,options.isBackground?{...options,fit:'cover'}:options,color);if(options.isBackground)map=v.map;}
  if(geometry)geometry.map=map;
  const hs=textStack(assets,frame,b,m,options,warnings,label,w,h);
  if(assets.logo){const cap=m.logoH&&hs?hs*m.logoH/assets.logo.height:Infinity;contain(assets.logo,frame,b.logo,'left',cap);}
  if(assets.cta&&!b.ctaInStack)buttonInto(assets.cta,frame,b.cta,(hs||b.font)*(m.cta/m.head),m);
  if(assets.cta){const c=frame.children.find(n=>n.name===ROLE_NAMES.cta);if(c){for(const t of (c.type==='TEXT'?[c]:descendants(c as DesignNode)).filter((n):n is TextNode=>n.type==='TEXT'))if(typeof t.fontSize==='number'&&t.fontSize<options.minFont)warnings.add(label+' · кнопка: '+t.fontSize.toFixed(1)+' px, нужна проверка.');}}
  for(const t of descendants(frame).filter(n=>n.type==='TEXT')){const a=t.absoluteBoundingBox,f=frame.absoluteBoundingBox;if(a&&f&&(a.x<f.x-.5||a.y<f.y-.5||a.x+a.width>f.x+w+.5||a.y+a.height>f.y+h+.5))warnings.add(label+': текст выходит за границу, проверьте макет.');}
  if(options.isBackground&&map&&options.luma){
    let low=measureContrast(frame,options,map).filter(c=>c.ratio<3);
    if(options.scrim!==false&&low.some(c=>c.light&&c.node.type==='TEXT')){
      const idx=frame.children.findIndex(n=>n.name==='Изображение · кадрирование')+1;
      const fore=frame.children.filter(n=>n.name!=='Изображение · кадрирование'&&n.name!==ROLE_NAMES.cta||b.ctaInStack&&n.name===ROLE_NAMES.cta);
      addScrim(frame,b,fore,options.shade?rgb(options.shade):color,w,h,idx);
      // A bottom scrim does not reach a logo at the top of vertical formats.
      const vertical=['Квадрат','Вертикаль','Скайскрейпер'].includes(b.kind);low=low.filter(c=>!c.light||(vertical&&c.node.name===ROLE_NAMES.logo));
      warnings.add(label+': текст плохо читался на фоне — добавлена подложка под текст.');
    }
    for(const c of low)warnings.add(label+': низкий контраст '+c.label+' с фоном ('+c.ratio.toFixed(1)+':1) — сдвиньте фокус или проверьте макет.');
  }
  frame.setSharedPluginData(DATA_NS,'size',w+'x'+h);
  return frame;
}
// ——— ConstraintValidator: result status of each banner ———
// Passed — automatic checks passed; Warning — needs a designer's look; Failed — a mandatory constraint is broken.
// Passed means only that the formal checks passed, not that the composition is good.
type Status='passed'|'warning'|'failed';
type Issue={level:'warning'|'failed';code:string;text:string};
// Geometry of one banner in its own coordinates, collected from the frame (pure input for the checks).
type VariantGeometry={w:number;h:number;texts:{name:string;box:Box}[];logo:Box|null;cta:Box|null;logoAllowedOverText:boolean;
  aspects:{name:string;source:number;result:number}[];protectedArea:Box|null};
// Tolerances: 1 px for edges (anti-aliasing and rounding), 0.5% for proportions (float rounding of rescale),
// 2% of the smaller box for overlaps (touching outlines are not an overlap), 98% of the object for "fully visible".
const EDGE_TOLERANCE=1,ASPECT_TOLERANCE=.005,OVERLAP_SHARE=.02,PROTECTED_VISIBLE=.98;
function checkGeometry(g:VariantGeometry):Issue[]{
  const out:Issue[]=[],frame={x:0,y:0,w:g.w,h:g.h};
  const outside=(b:Box)=>b.x<-EDGE_TOLERANCE||b.y<-EDGE_TOLERANCE||b.x+b.w>g.w+EDGE_TOLERANCE||b.y+b.h>g.h+EDGE_TOLERANCE;
  for(const t of g.texts)if(outside(t.box))out.push({level:'failed',code:'bounds',text:t.name+' выходит за границы баннера.'});
  if(g.logo&&outside(g.logo))out.push({level:'failed',code:'bounds',text:'Логотип выходит за границы баннера.'});
  if(g.cta&&outside(g.cta))out.push({level:'failed',code:'bounds',text:'Кнопка выходит за границы баннера.'});
  if(g.logo&&!g.logoAllowedOverText)for(const t of g.texts){const o=overlap(g.logo,t.box),small=Math.min(area(g.logo),area(t.box));
    if(small>0&&o>small*OVERLAP_SHARE)out.push({level:'failed',code:'overlap',text:'Логотип пересекается с текстом «'+t.name+'».'});}
  for(const a of g.aspects)if(a.source>0&&Math.abs(a.result/a.source-1)>ASPECT_TOLERANCE)out.push({level:'failed',code:'aspect',text:a.name+': изменены пропорции.'});
  if(g.protectedArea&&area(g.protectedArea)>0){const vis=overlap(g.protectedArea,frame)/area(g.protectedArea);
    if(vis<PROTECTED_VISIBLE)out.push({level:'warning',code:'protected',text:'Главный объект обрезан: видно '+Math.round(vis*100)+'%.'});}
  return out;
}
// Report lines that mean a mandatory constraint is broken (the rest are warnings).
const FAILED_REPORT=[/не помещается при минимуме/,/текст выходит за границу/,/текст не помещается в колонку/];
function issuesFromReport(lines:string[],label:string):Issue[]{
  return lines.filter(t=>t.startsWith(label)).map(t=>({level:FAILED_REPORT.some(r=>r.test(t))?'failed' as const:'warning' as const,code:'report',text:t.slice(label.length).replace(/^\s*[·:]\s*/,'')}));
}
function statusOf(issues:Issue[]):Status{return issues.some(i=>i.level==='failed')?'failed':issues.length?'warning':'passed';}
const STATUS_MARK:Record<Status,string>={passed:'',warning:' · ⚠ Проверить',failed:' · ✕ Не прошёл проверку'};
function relBox(n:SceneNode,frame:FrameNode):Box|null{const a=n.absoluteBoundingBox,f=frame.absoluteBoundingBox;return a&&f?{x:a.x-f.x,y:a.y-f.y,w:a.width,h:a.height}:null;}
// Collects the geometry of a created banner. Source aspects come from the prepared assets (what was placed).
function variantGeometry(frame:FrameNode,w:number,h:number,assets:Assets|null,subject:Rect01|null,map:((u:number,v:number)=>{x:number;y:number})|null,logoOverText:boolean):VariantGeometry{
  const top=(name:string)=>frame.children.find(c=>c.name===name)||null;
  const texts:{name:string;box:Box}[]=[];for(const r of ['date','headline','body'] as Role[]){const n=top(ROLE_NAMES[r]);const b=n&&relBox(n,frame);if(b)texts.push({name:ROLE_NAMES[r],box:b});}
  const logoN=top(ROLE_NAMES.logo),ctaN=top(ROLE_NAMES.cta),aspects:{name:string;source:number;result:number}[]=[];
  if(logoN&&assets?.logo)aspects.push({name:'Логотип',source:assets.logo.width/assets.logo.height,result:logoN.width/logoN.height});
  const pic=top('Изображение · кадрирование');const im=pic&&'children'in pic?(pic as FrameNode).children[0]:null;
  if(im&&assets?.visual)aspects.push({name:'Изображение',source:assets.visual.width/assets.visual.height,result:im.width/im.height});
  let protectedArea:Box|null=null;if(subject&&map){const a=map(subject.x,subject.y),c=map(subject.x+subject.w,subject.y+subject.h);protectedArea={x:a.x,y:a.y,w:c.x-a.x,h:c.y-a.y};}
  return {w,h,texts,logo:logoN?relBox(logoN,frame):null,cta:ctaN?relBox(ctaN,frame):null,logoAllowedOverText:logoOverText,aspects,protectedArea};
}
// A failed format keeps its place in the set as an empty frame with the error, so the other banners are not lost.
function failedPlaceholder(parent:FrameNode,w:number,h:number,error:unknown):FrameNode{
  const f=figma.createFrame();parent.appendChild(f);f.resize(w,h);f.name=w+'×'+h+' · ошибка';f.clipsContent=true;
  f.fills=[{type:'SOLID',color:{r:.98,g:.9,b:.9}}];f.setSharedPluginData(DATA_NS,'size',w+'x'+h);f.setSharedPluginData(DATA_NS,'placeholder','1');
  f.setSharedPluginData(DATA_NS,'error',messageText(error).slice(0,300));return f;
}
function sameAspect(master:MasterNode,w:number,h:number){return Math.abs(w/master.width-h/master.height)<=1e-6*Math.max(w/master.width,h/master.height);}
function allDesignNodes(root:DesignNode):DesignNode[]{
  const out:DesignNode[]=[root];for(let i=0;i<out.length;i++){const n=out[i];if('children'in n)for(const c of n.children)if(isDesign(c))out.push(c);if(out.length>3000)throw new Error('Для точного масштабирования выберите мастер до 3000 слоёв.');}return out;
}
async function prepareMaster(master:MasterNode,stage:FrameNode,options:Options,warnings:Set<string>):Promise<DesignNode>{
  const originals=allDesignNodes(master),missingTexts=new Set<string>();
  for(const n of originals)if(n.type==='TEXT'){const missing=await loadNodeFonts(n);if(missing.length){if(!options.outlineMissing)throw new Error('Недоступен шрифт '+missing.join(', '));missingTexts.add(n.id);}}
  let copy:DesignNode=master.clone();stage.appendChild(copy);resetPosition(copy);copy.x=0;copy.y=0;
  // Missing fonts are outlined per text layer; all other layers remain native.
  async function repair(original:DesignNode,clone:DesignNode):Promise<DesignNode>{
    if(original.type==='TEXT'&&missingTexts.has(original.id)){
      const svg=await original.exportAsync({format:'SVG_STRING',svgOutlineText:true});const outlined=figma.createNodeFromSvg(svg);
      const parent=clone.parent;if(!parent||!('insertChild'in parent))throw new Error('Не удалось подготовить текст. Установите шрифт мастера.');
      const matrix=cloneData(clone.relativeTransform),index=parent.children.indexOf(clone);
      parent.insertChild(index,outlined);outlined.relativeTransform=matrix;outlined.name=clone.name+' · в кривых';outlined.visible=clone.visible;outlined.opacity=clone.opacity;
      clone.remove();warnings.add('Точный ресайз: недоступный шрифт слоя «'+original.name+'» переведён в кривые.');return outlined;
    }
    if(clone.type==='INSTANCE'&&missingTexts.size&&allDesignNodes(original).some(n=>missingTexts.has(n.id)))clone=clone.detachInstance();
    if('children'in original&&'children'in clone){const a=[...original.children],b=[...clone.children];for(let i=0;i<a.length;i++)if(isDesign(a[i])&&b[i]&&isDesign(b[i]))await repair(a[i] as DesignNode,b[i] as DesignNode);}
    return clone;
  }
  copy=await repair(master,copy);copy.setSharedPluginData(DATA_NS,'settings','');copy.setSharedPluginData(DATA_NS,'batch','');return copy;
}
function proportionalVariant(template:DesignNode,parent:FrameNode,w:number,h:number,master:MasterNode,warnings:Set<string>,minFont:number){
  const frame=figma.createFrame();parent.appendChild(frame);frame.name=w+'×'+h+' · Как в мастере';frame.resize(w,h);frame.fills=[];frame.clipsContent=true;frame.exportSettings=[{format:'PNG',suffix:'',constraint:{type:'SCALE',value:1}}];
  const copy=template.clone();frame.appendChild(copy);resetPosition(copy);copy.rescale(w/master.width);copy.x=0;copy.y=0;
  frame.setSharedPluginData(DATA_NS,'size',w+'x'+h);
  for(const n of allDesignNodes(copy))if(n.type==='TEXT'&&n.visible&&typeof n.fontSize==='number'&&n.fontSize<minFont)warnings.add(w+'×'+h+' · «'+n.name+'»: шрифт '+n.fontSize.toFixed(1)+' px.');
  return frame;
}
function validSubject(s:unknown):Rect01|null{
  if(!record(s))return null;const v=['x','y','w','h'].map(k=>Number(s[k]));if(v.some(n=>!Number.isFinite(n)))return null;
  const [x,y,w,h]=v;if(w<.01||h<.01||x<0||y<0||x+w>1.001||y+h>1.001)return null;return {x,y,w,h};
}
// AI scene from the panel or saved settings. Coordinates are shares of the picture (0–1).
const AI_CLASSES=['strip','wide','square','tall'] as const;
function validAiScene(raw:unknown):AiScene|null{
  if(!record(raw)||typeof raw.hash!=='string'||!/^[\w:-]{4,80}$/.test(raw.hash))return null;
  const subject=validSubject(raw.subject);if(!subject||subject.w<.02||subject.h<.02)return null;
  let core=validSubject(raw.core);
  if(core){const x=Math.max(core.x,subject.x),y=Math.max(core.y,subject.y),r=Math.min(core.x+core.w,subject.x+subject.w),b=Math.min(core.y+core.h,subject.y+subject.h);core=r-x>=.02&&b-y>=.02?{x,y,w:+(r-x).toFixed(4),h:+(b-y).toFixed(4)}:null;}
  const f=record(raw.formats)?raw.formats:{},formats={} as AiScene['formats'];
  for(const k of AI_CLASSES)formats[k]=f[k]==='core'&&core?'core':'whole';
  const anchor=raw.anchor==='center'||raw.anchor==='bottom'?raw.anchor:'top';
  return {hash:raw.hash,model:String(raw.model||'').slice(0,80),label:String(raw.label||'').replace(/[\u0000-\u001f]/g,' ').slice(0,60),subject,core,anchor,formats};
}
// Class of proportions used by AI framing: strips, horizontals, near-square and verticals.
function aspectClass(w:number,h:number):typeof AI_CLASSES[number]{const r=w/h;return r>=4?'strip':r>=1.55?'wide':r>.88?'square':'tall';}
// Object box and alignment for one format from the AI scene (null — AI framing is off or there is no answer).
function aiFraming(o:Options,w:number,h:number){
  if(!o.useAi||!o.aiScene)return null;const a=o.aiScene,core=a.formats[aspectClass(w,h)]==='core'&&a.core;
  return {subject:core?a.core!:a.subject,anchor:a.anchor,core:!!core};
}
function validLuma(g:unknown):number[]|null{return Array.isArray(g)&&[16,24,32,48,64].some(n=>n*n===g.length)&&g.every(v=>typeof v==='number'&&v>=0&&v<=1)?g as number[]:null;}
// Campaign name for file names: latin/cyrillic letters, digits, - and _.
function cleanCampaign(v:unknown){return String(v||'').trim().replace(/\s+/g,'-').replace(/[^A-Za-z0-9А-Яа-яЁё_-]/g,'').slice(0,40);}
function hexOrUndef(v:unknown){return /^#[\da-f]{6}$/i.test(String(v||''))?String(v):undefined;}
function validAlternates(raw:unknown):AltMaster[]{
  if(raw===undefined||raw===null)return [];
  if(!Array.isArray(raw)||raw.length>3)throw new Error('Дополнительных мастеров может быть не больше трёх.');
  const seen=new Set<string>(),out:AltMaster[]=[];
  for(const a of raw){if(!record(a)||typeof a.id!=='string'||!/^[\w:;-]{3,60}$/.test(a.id))throw new Error('Неверный дополнительный мастер.');if(seen.has(a.id))continue;seen.add(a.id);
    out.push({id:a.id,subject:validSubject(a.subject),luma:validLuma(a.luma),busy:validLuma(a.busy),shade:hexOrUndef(a.shade),edge:hexOrUndef(a.edge)||null,aiScene:validAiScene(a.aiScene)});}
  return out;
}
function normalizeOptions(input:Options):Options{
  const options:Options={enforceMinFont:input.enforceMinFont!==false,variantOverrides:validateOverrides(input.variantOverrides),preserveMaster:input.preserveMaster!==false,visualMode:['background','block'].includes(input.visualMode||'')?input.visualMode:'auto',background:input.background,fit:input.fit==='contain'?'contain':'cover',focusX:clamp(Number(input.focusX)||0,0,100),focusY:clamp(Number(input.focusY)||0,0,100),zoom:clamp(Number(input.zoom)||100,100,500),minFont:clamp(Number(input.minFont)||12,6,48),headlineScale:1,visualSide:['left','auto'].includes(input.visualSide)?input.visualSide:'right',fade:!!input.fade,trimLogo:!!input.trimLogo,outlineMissing:!!input.outlineMissing,aiPlan:String(input.aiPlan||''),subject:validSubject(input.subject),luma:validLuma(input.luma),scrim:input.scrim!==false,shade:hexOrUndef(input.shade),edge:hexOrUndef(input.edge)||null,extend:input.extend!==false,alternates:validAlternates(input.alternates),platforms:Array.isArray(input.platforms)?PLATFORMS.map(p=>p.id).filter(id=>input.platforms!.includes(id)):[],campaign:cleanCampaign(input.campaign),placement:['fixed','master'].includes(input.placement||'')?input.placement:'auto',textPos:['top','bottom','left','right'].includes(input.textPos||'')?input.textPos:'auto',busy:validLuma(input.busy),fillColor:input.fillColor==='custom'?'custom':'edge',imageFit:FITS.includes(input.imageFit||'')?input.imageFit:input.imageFit===undefined&&input.extend===false?'fill':'auto',useAi:!!input.useAi,aiScene:validAiScene(input.aiScene),subjectManual:!!input.subjectManual&&!!validSubject(input.subject)};rgb(options.background);return options;
}
// One prepared source per master: roles, prepared assets, metrics and the exact-copy template.
type Source={logoOverText?:boolean;master:MasterNode;roles:Record<Role,string>;options:Options;sources:Assets;assets:Assets;metrics:Metrics|null;template:DesignNode|null;ready:boolean;primary:boolean};
function aspectDistance(m:MasterNode,w:number,h:number){return Math.abs(Math.log((w/h)/(m.width/m.height)));}
// The master whose proportions are closest to the format; ties go to the primary master.
function pickSource(list:Source[],w:number,h:number){let best=list[0];for(const s of list)if(aspectDistance(s.master,w,h)<aspectDistance(best.master,w,h)-1e-9)best=s;return best;}
async function rolesFor(master:MasterNode):Promise<Record<Role,string>>{
  const saved=readSettings(master);
  if(saved){let ok=true;for(const k of ROLE_KEYS){const id=saved.roles[k];if(!id)continue;const n=await figma.getNodeByIdAsync(id);if(!n||!isInside(n,master)){ok=false;break;}}if(ok)return saved.roles;}
  return analyze(master).roles;
}
async function alternateSources(primary:MasterNode,options:Options,warnings:Set<string>):Promise<Source[]>{
  const out:Source[]=[];
  for(const a of options.alternates||[]){
    const m=await figma.getNodeByIdAsync(a.id);
    if(!m||!isMaster(m)||m.removed||!isInside(m,figma.currentPage)||m.id===primary.id||isInside(m,primary)||isInside(primary,m)){warnings.add('Дополнительный мастер недоступен на этой странице — его форматы собраны из основного.');continue;}
    const saved=readSettings(m)?.options;
    // Per-format settings still apply; their focus point refers to the primary picture, so it is left out here.
    const overrides:Record<string,Overrides>={};for(const [k,v] of Object.entries(options.variantOverrides||{})){const {focusX,focusY,...rest}=v;overrides[k]=rest;}
    const own:Options={...options,alternates:[],variantOverrides:overrides,aiScene:a.aiScene||null,subject:a.subject||saved?.subject||null,luma:a.luma||null,busy:a.busy||null,shade:a.shade,edge:a.edge||null,visualMode:saved?.visualMode||options.visualMode};
    out.push({master:m,roles:await rolesFor(m),options:own,sources:{},assets:{},metrics:null,template:null,ready:false,primary:false});
  }
  return out;
}
function freeSide(t:Rect01):Rect01|null{
  const sides=[{x:0,y:0,w:1,h:t.y},{x:0,y:t.y+t.h,w:1,h:1-t.y-t.h},{x:0,y:0,w:t.x,h:1},{x:t.x+t.w,y:0,w:1-t.x-t.w,h:1}].filter(r=>r.w>.15&&r.h>.15);
  if(!sides.length)return null;sides.sort((a,b)=>b.w*b.h-a.w*a.h);const r=sides[0];return {x:r.x,y:r.y,w:Math.min(1,r.w),h:Math.min(1,r.h)};
}
async function prepareSource(src:Source,stage:FrameNode,warnings:Set<string>,needAdapt:boolean,needExact:boolean){
  const {master,options}=src;
  if(needExact&&!src.template)src.template=await prepareMaster(master,stage,options,warnings);
  if(!needAdapt||src.ready)return;
  const sources:Assets={},roles=src.roles,where=src.primary?'':' (мастер «'+master.name+'»)';
  for(const key of ROLE_KEYS){if(!roles[key])continue;const n=await figma.getNodeByIdAsync(roles[key]);if(!n||!isDesign(n)||!isInside(n,master)||n.id===master.id)throw new Error(ROLE_NAMES[key]+': выберите слой внутри текущего мастера'+where+'.');sources[key]=n;}
  options.isBackground=!!sources.visual&&backgroundMode(sources.visual,master,options.visualMode,options.imageFit);
  // A large picture taken as a separate block is usually a background the detection missed (e.g. partly transparent edges).
  {const v=sources.visual?.absoluteBoundingBox,mb=master.absoluteBoundingBox;if(v&&mb&&!options.isBackground&&options.visualMode!=='block'){const ix=Math.max(0,Math.min(v.x+v.width,mb.x+mb.width)-Math.max(v.x,mb.x)),iy=Math.max(0,Math.min(v.y+v.height,mb.y+mb.height)-Math.max(v.y,mb.y));
    if(ix*iy>=mb.width*mb.height*.6)warnings.add('Изображение'+where+' занимает большую часть мастера, но обработано как отдельный блок. Чтобы картинка растягивалась на весь баннер, выберите «Изображение и композиция» → «Масштаб картинки» → «Заполнять баннер».');}}
  if(!sources.headline&&!sources.visual)throw new Error('Назначьте хотя бы заголовок или изображение'+where+'.');
  const entries=ROLE_KEYS.filter(k=>sources[k]).map(k=>[k,sources[k]!] as [Role,DesignNode]);for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(isInside(entries[i][1],entries[j][1])||isInside(entries[j][1],entries[i][1]))throw new Error('Роли «'+ROLE_NAMES[entries[i][0]]+'» и «'+ROLE_NAMES[entries[j][0]]+'» пересекаются'+where+'. Выберите независимые слои.');
  for(const t of descendants(master).filter(n=>n.type==='TEXT'))if(!entries.some(([,n])=>isInside(t,n)))warnings.add('Для других пропорций не назначен текст'+where+': «'+t.characters.slice(0,50)+'».');
  const assets:Assets={};
  for(const key of ROLE_KEYS)if(sources[key])assets[key]=await prepareAsset(sources[key]!,key,stage,options,warnings);
  if(options.isBackground&&assets.visual&&sources.visual)assets.visual=coversMaster(sources.visual,master)?sceneBackground(master,stage,sources):masterBackground(assets.visual,sources.visual,master,stage);
  src.sources=sources;src.assets=assets;src.metrics=masterMetrics(sources,assets,master);src.ready=true;
  // Logo over text is allowed only when the master itself has it.
  {const l=sources.logo?.absoluteBoundingBox;src.logoOverText=!!l&&(['headline','date','body'] as Role[]).some(r=>{const t=sources[r]?.absoluteBoundingBox;return !!t&&overlap({x:l.x,y:l.y,w:l.width,h:l.height},{x:t.x,y:t.y,w:t.width,h:t.height})>0;});}
  // Without a detected object, the picture's content is taken to be where the master has no text:
  // the largest side of the master left free by the text block. Designers put text over empty space.
  if(options.isBackground&&!options.subject&&src.metrics.textBox){options.subject=freeSide(src.metrics.textBox);options.subjectGuessed=!!options.subject;}
  if(options.isBackground&&!options.luma)warnings.add('Фон'+where+' не проанализирован (нет рамки объекта и проверки контраста) — расстановка по положению текста в мастере. Откройте «Изображение и композиция» и дождитесь рамки на превью.');
}
async function generate(master:MasterNode,roles:Record<Role,string>,rawSizes:unknown,input:Options,progress:(done:number,total:number)=>void|Promise<void>=()=>{},isCancelled:()=>boolean=()=>false){
  const sizes=validateSizes(rawSizes),options=normalizeOptions(input),ai=validatePlan(options.aiPlan,sizes),warnings=new Set<string>();
  const list:Source[]=[{master,roles,options,sources:{},assets:{},metrics:null,template:null,ready:false,primary:true},...await alternateSources(master,options,warnings)];
  const plan=sizes.map(([w,h])=>{const src=pickSource(list,w,h),vo=variantOptions(src.options,w+'x'+h,src.primary?ai:{});return {w,h,src,exact:!!vo.preserveMaster&&sameAspect(src.master,w,h),vo};});
  const stage=figma.createFrame();figma.currentPage.appendChild(stage);stage.name='Banner Adapt · подготовка';stage.fills=[];stage.visible=false;stage.x=figma.viewport.center.x;stage.y=figma.viewport.center.y;
  let output:FrameNode|null=null,completed=0;const results:{id:string;w:number;h:number;name:string;status:Status;issues:Issue[]}[]=[];
  try{
    for(const src of list){const mine=plan.filter(p=>p.src===src);if(mine.length)await prepareSource(src,stage,warnings,mine.some(p=>!p.exact),mine.some(p=>p.exact));}
    if(isCancelled())throw new Error('Создание отменено.');
    if(options.useAi)for(const src of list)if(!src.options.aiScene&&plan.some(p=>p.src===src&&!p.exact))warnings.add('AI-кадрирование: для мастера «'+src.master.name+'» нет ответа AI — использован локальный анализ.');
    output=figma.createFrame();figma.currentPage.appendChild(output);output.name='Banner Adapt · '+master.name;output.fills=[];output.clipsContent=false;
    const mb=master.absoluteBoundingBox!;output.x=mb.x+mb.width+160;output.y=mb.y;
    for(const other of figma.currentPage.children){if(other===output||other===stage||list.some(s=>s.master===other))continue;const ob=other.absoluteBoundingBox;if(ob&&ob.y<output.y+7000&&ob.y+ob.height>output.y&&ob.x+ob.width>output.x&&ob.x<output.x+4500)output.x=ob.x+ob.width+160;}
    let x=0,y=0,rowH=0,maxX=0;const wrap=Math.max(3600,...sizes.map(s=>s[0]));
    for(const {w,h,src,exact,vo} of plan){if(isCancelled())break;if(x>0&&x+w>wrap){x=0;y+=rowH+100;rowH=0;}
      // Each variant keeps the per-format settings; the background analysis belongs to the master it is built from.
      // AI framing (when on) replaces the detected object box: the whole subject or only its core, by the format's proportions.
      const ai=vo.focusOverride?null:aiFraming(src.options,w,h);
      const opts:Options={...vo,isBackground:src.options.isBackground,subject:vo.focusOverride?vo.subject:ai?ai.subject:src.options.subject,aiAnchor:ai?.anchor,luma:src.options.luma,busy:src.options.busy,shade:src.options.shade,edge:src.options.edge};
      // Each format is isolated: an error removes only its own partial layers and leaves a Failed placeholder.
      const before=output.children.length,label=w+'×'+h,mine=new Set<string>();let v:FrameNode,issues:Issue[];
      try{
        const geo={map:null as ((u:number,v:number)=>{x:number;y:number})|null};
        v=exact&&src.template?proportionalVariant(src.template,output,w,h,src.master,mine,options.minFont):createVariant(src.assets,output,w,h,opts,src.metrics!,mine,geo);
        if(!src.primary)v.name+=' · из «'+src.master.name+'»';
        if(ai&&!exact)v.setSharedPluginData(DATA_NS,'aiFraming',ai.core?'core':'whole');
        platformChecks(v,w,h,options.platforms,mine);
        const geometric=exact?[]:checkGeometry(variantGeometry(v,w,h,src.assets,opts.isBackground?opts.subject||null:null,geo.map,!!src.logoOverText));
        // The detailed edge check replaces the general "text crosses the edge" line.
        issues=[...issuesFromReport([...mine],label).filter(i=>!(geometric.some(g=>g.code==='bounds')&&/выходит за границу/.test(i.text))),...geometric];
      }catch(err){
        for(const n of output.children.slice(before))n.remove();
        v=failedPlaceholder(output,w,h,err);issues=[{level:'failed',code:'error',text:'Не удалось собрать формат: '+messageText(err)}];
      }
      for(const t of mine)warnings.add(t);
      const status=statusOf(issues);v.name+=STATUS_MARK[status];v.setSharedPluginData(DATA_NS,'status',status);v.setSharedPluginData(DATA_NS,'issues',JSON.stringify(issues).slice(0,4000));
      results.push({id:v.id,w,h,name:v.name,status,issues});
      v.x=x;v.y=y;x+=w+100;rowH=Math.max(rowH,h);maxX=Math.max(maxX,x-100);completed++;await progress(completed,sizes.length);
    }
    if(!completed){output.remove();output=null;throw new Error('Создание отменено.');}
    output.resize(maxX,y+rowH);output.name='Banner Adapt · '+master.name+' · '+completed+' форматов';
    const labels=results.map(r=>r.w+'×'+r.h),perFormat=new Set([...warnings].filter(t=>labels.some(l=>t.startsWith(l))));
    return {output,completed,warnings:[...warnings],general:[...warnings].filter(t=>!perFormat.has(t)),results,cancelled:completed<sizes.length};
  }catch(e){if(output&&!output.removed)output.remove();throw e;}finally{stage.remove();}
}
type SavedSettings={roles:Record<Role,string>;sizes:Size[];options:Options};
type BatchData={schema:1;ownerId:string;masterId:string;settings:SavedSettings;updatedAt:number};
function settingsFrom(roles:Record<Role,string>,sizes:unknown,options:Options):SavedSettings{
  const cleanRoles={} as Record<Role,string>;for(const key of ROLE_KEYS)cleanRoles[key]=typeof roles?.[key]==='string'?roles[key]:'';
  const validSizes=validateSizes(sizes),cleanOptions=normalizeOptions(options);delete cleanOptions.luma;delete cleanOptions.busy;for(const a of cleanOptions.alternates||[]){delete a.luma;delete a.busy;}validatePlan(cleanOptions.aiPlan,validSizes);
  return {roles:cleanRoles,sizes:validSizes,options:cleanOptions};
}
function subsetSettings(settings:SavedSettings,sizes:Size[]):SavedSettings{
  const plan=validatePlan(settings.options.aiPlan,settings.sizes),variantOverrides:Record<string,Overrides>={};
  const variants=sizes.filter(s=>plan[s.join('x')]).map(s=>({size:s.join('x'),...plan[s.join('x')]}));
  for(const size of sizes){const k=size.join('x');if(settings.options.variantOverrides?.[k])variantOverrides[k]=settings.options.variantOverrides[k];}
  return {...settings,sizes,options:{...settings.options,variantOverrides,aiPlan:variants.length?JSON.stringify({version:1,variants}):''}};
}
function completedSettings(settings:SavedSettings,count:number):SavedSettings{return subsetSettings(settings,settings.sizes.slice(0,count));}
function readData(node:BaseNode,key:string):Record<string,unknown>|null{
  try{const raw=node.getSharedPluginData(DATA_NS,key);if(!raw||raw.length>60000)return null;const v:unknown=JSON.parse(raw);return record(v)&&v.schema===1&&v.ownerId===node.id?v:null;}catch(_e){return null;}
}
function readSettings(node:BaseNode):SavedSettings|null{
  const d=readData(node,'settings');if(!d||!record(d.settings))return null;
  try{return settingsFrom(d.settings.roles as Record<Role,string>,d.settings.sizes,d.settings.options as Options);}catch(_e){return null;}
}
function saveSettings(master:MasterNode,settings:SavedSettings){master.setSharedPluginData(DATA_NS,'settings',JSON.stringify({schema:1,ownerId:master.id,settings}));}
function readBatch(node:BaseNode,key='batch'):BatchData|null{
  const d=readData(node,key);if(!d||node.type!=='FRAME'||typeof d.masterId!=='string'||!record(d.settings))return null;
  try{return {schema:1,ownerId:node.id,masterId:d.masterId,updatedAt:Number(d.updatedAt)||0,settings:settingsFrom(d.settings.roles as Record<Role,string>,d.settings.sizes,d.settings.options as Options)};}catch(_e){return null;}
}
function registerBatch(output:FrameNode,master:MasterNode,settings:SavedSettings,key='batch'){output.setSharedPluginData(DATA_NS,key,JSON.stringify({schema:1,ownerId:output.id,masterId:master.id,settings,updatedAt:Date.now()}));}
function listBatches(id:string){return figma.currentPage.findAllWithCriteria({types:['FRAME']}).map(n=>({node:n,data:readBatch(n)})).filter(x=>x.data?.masterId===id).map(x=>({id:x.node.id,name:x.node.name,count:x.data!.settings.sizes.length}));}
function batchAncestor(node:BaseNode):FrameNode|null{let n:BaseNode|null=node;while(n&&n.type!=='PAGE'&&n.type!=='DOCUMENT'){if(readBatch(n)||readBatch(n,'trial'))return n as FrameNode;n=n.parent;}return null;}
function commitUpdate(target:FrameNode,fresh:FrameNode,master:MasterNode,settings:SavedSettings,key='batch'){
  if(target.layoutMode!=='NONE')throw new Error('У набора включён Auto Layout. Отключите его перед обновлением.');
  const old=[...target.children].map(n=>({n,matrix:cloneData(n.relativeTransform)})),incoming=[...fresh.children].map(n=>({n,matrix:cloneData(n.relativeTransform)}));
  const previous={w:target.width,h:target.height,name:target.name,data:target.getSharedPluginData(DATA_NS,key)};
  const backup=figma.createFrame();figma.currentPage.appendChild(backup);backup.name='Предыдущая версия · '+target.name+' · '+new Date().toISOString().slice(0,16).replace('T',' ');backup.fills=cloneData(target.fills as Paint[]);backup.clipsContent=target.clipsContent;backup.resize(target.width,target.height);
  backup.x=Math.max(...figma.currentPage.children.filter(n=>n!==backup).map(n=>{const b=n.absoluteBoundingBox;return b?b.x+b.width:0;}))+160;backup.y=target.absoluteBoundingBox!.y;
  try{
    for(const {n,matrix}of old){backup.appendChild(n);n.relativeTransform=matrix;}
    for(const {n,matrix}of incoming){target.appendChild(n);n.relativeTransform=matrix;}
    target.resize(fresh.width,fresh.height);target.name=fresh.name;registerBatch(target,master,settings,key);
  }catch(e){
    for(const {n,matrix}of incoming){if(n.parent===target){fresh.appendChild(n);n.relativeTransform=matrix;}}
    for(const {n,matrix}of old){target.appendChild(n);n.relativeTransform=matrix;}
    target.resize(previous.w,previous.h);target.name=previous.name;target.setSharedPluginData(DATA_NS,key,previous.data);backup.remove();throw e;
  }
  fresh.remove();if(key==='trial')backup.remove();return backup;
}
// PANEL LIFECYCLE — core above is tested independently in Figma.
figma.showUI(__html__, {width:440,height:800,themeColors:true});
const send = (msg:unknown) => figma.ui.postMessage(msg);
async function showMaster(m:MasterNode,settings:SavedSettings|null=null,batchId=''){
  if(Math.abs(m.rotation||0)>.01)throw new Error('Мастер должен быть без поворота.');
  if(!isInside(m,figma.currentPage))throw new Error('Откройте страницу исходного мастера.');
  masterId=m.id;const st=settings||readSettings(m);send({type:'master',data:analyze(m),settings:st,batchId});send({type:'batches',items:listBatches(m.id),selectedId:batchId});
  const png=await m.exportAsync({format:'PNG',constraint:{type:'WIDTH',value:380}});send({type:'preview',kind:'master',bytes:Array.from(png)});
  await sendAlternates(m,st);
}
async function capture(){
  if(busy)return;const s=figma.currentPage.selection;
  if(s.length!==1)throw new Error('Выделите мастер или созданный набор.');
  const batch=batchAncestor(s[0]);if(batch){const d=(readBatch(batch)||readBatch(batch,'trial'))!;const m=await figma.getNodeByIdAsync(d.masterId);if(!m||!isMaster(m))throw new Error('Исходный мастер набора удалён.');await showMaster(m,d.settings,readBatch(batch)?batch.id:'');return;}
  if(!isMaster(s[0]))throw new Error('Выделите один фрейм или группу с мастер-баннером.');await showMaster(s[0]);
}
// A small render of what will sit behind the text (no texts, logo or button) for subject, contrast and edge analysis.
// For AI framing the same render is a JPG with the longest side of 512 px (about 350 image tokens).
function exportSmall(n:DesignNode,ai:boolean):Promise<Uint8Array>{
  if(!ai)return n.exportAsync({format:'PNG',constraint:{type:'WIDTH',value:128}});
  return n.exportAsync({format:'JPG',constraint:n.width>=n.height?{type:'WIDTH',value:512}:{type:'HEIGHT',value:512}});
}
async function sceneBytes(m:MasterNode,n:DesignNode,roles:Record<Role,string>|undefined,scene:boolean,ai=false):Promise<Uint8Array>{
  if(!scene)return exportSmall(n,ai);
  const sources:Assets={};for(const k of ROLE_KEYS){const rid=roles?.[k];if(!rid)continue;const r=await figma.getNodeByIdAsync(rid);if(r&&isDesign(r)&&isInside(r,m)&&r.id!==m.id)sources[k]=r;}
  const stage=figma.createFrame();figma.currentPage.appendChild(stage);stage.name='Banner Adapt · анализ фона';stage.fills=[];stage.x=-100000;stage.y=-100000;
  try{return await exportSmall(sceneBackground(m,stage,sources),ai);}finally{stage.remove();}
}
async function visualPreview(id:string,mode='auto',roles?:Record<Role,string>){
  const m=await figma.getNodeByIdAsync(masterId),n=await figma.getNodeByIdAsync(id);if(!m||!isMaster(m)||!n||!isDesign(n)||!isInside(n,m))return;
  const bg=backgroundMode(n,m,mode),scene=bg&&coversMaster(n,m),preview=scene?m:n;
  const png=await preview.exportAsync({format:'PNG',constraint:{type:'WIDTH',value:500}});send({type:'preview',kind:'visual',id,isBackground:bg,bytes:Array.from(png)});
  send({type:'scene',id,isBackground:bg,bytes:Array.from(await sceneBytes(m,n,roles,scene))});
}
// The picture for AI framing: the main master's image (by layer id) or an extra master's (by its id).
async function aiImage(message:UiMessage){
  let m:BaseNode|null,n:BaseNode|null,roles:Record<Role,string>|undefined,mode:string|undefined;
  if(message.altId){m=await figma.getNodeByIdAsync(message.altId);if(!m||!isMaster(m))throw new Error('Дополнительный мастер недоступен.');roles=await rolesFor(m);n=roles.visual?await figma.getNodeByIdAsync(roles.visual):null;mode=readSettings(m)?.options.visualMode;}
  else{m=await figma.getNodeByIdAsync(masterId);n=await figma.getNodeByIdAsync(message.id||'');roles=message.roles;mode=message.visualMode;}
  if(!m||!isMaster(m)||!n||!isDesign(n)||!isInside(n,m)){send({type:'ai-image',key:message.altId||message.id||'',bytes:null});return;}
  const bg=backgroundMode(n,m,mode||'auto');
  send({type:'ai-image',key:message.altId||message.id||'',bytes:Array.from(await sceneBytes(m,n,roles,bg&&coversMaster(n,m),true))});
}
// The AI connection is personal: kept in this user's Figma storage on this computer, never in the file.
const AI_PROVIDERS=['anthropic','openai','gemini','openrouter','custom','bridge','chat'];
function validAiConfig(raw:unknown){
  if(!record(raw))throw new Error('Неверные настройки AI.');
  const text=(v:unknown,n:number)=>String(v??'').trim().slice(0,n);
  const endpoint=text(raw.endpoint,300);if(endpoint&&!/^(https:\/\/|http:\/\/localhost[:/])/i.test(endpoint))throw new Error('Адрес AI должен начинаться с https:// (или http://localhost).');
  return {enabled:!!raw.enabled,provider:AI_PROVIDERS.includes(String(raw.provider))?String(raw.provider):'anthropic',model:text(raw.model,100),endpoint,key:text(raw.key,400)};
}
async function aiConfig(){try{return validAiConfig(await figma.clientStorage.getAsync('aiConfig'));}catch(_e){return null;}}
// Export: the banners of a created set (or trial), in canvas order. PNG at 1× is the lossless source; the panel
// converts to the platform's format and fits the weight limit.
async function exportTarget(id?:string):Promise<FrameNode>{
  if(id){const n=await figma.getNodeByIdAsync(id);if(n&&n.type==='FRAME'&&(readBatch(n)||readBatch(n,'trial')))return n;}
  const sel=figma.currentPage.selection[0],b=sel&&batchAncestor(sel);if(b)return b;
  throw new Error('Выберите созданный набор в списке «Обновить созданный набор» или выделите его на холсте.');
}
function exportItems(frame:FrameNode){return frame.children.filter((c):c is FrameNode=>c.type==='FRAME'&&c.visible&&c.getSharedPluginData(DATA_NS,'placeholder')!=='1'&&(!!c.getSharedPluginData(DATA_NS,'size')||/^\d+×\d+/.test(c.name)));}
function alternateInfo(m:MasterNode){return {id:m.id,name:m.name,width:Math.round(m.width),height:Math.round(m.height),savedSubject:readSettings(m)?.options.subject||null};}
function checkAlternate(n:BaseNode|null,primary:BaseNode|null):MasterNode{
  if(!n||!isMaster(n))throw new Error('Выделите фрейм или группу с дополнительным мастером.');
  if(!isInside(n,figma.currentPage))throw new Error('Дополнительный мастер должен быть на странице основного.');
  if(primary&&(n.id===primary.id||isInside(n,primary)||isInside(primary,n)))throw new Error('Это основной мастер или его часть. Выделите другой баннер.');
  if(batchAncestor(n))throw new Error('Это созданный набор. Выделите другой мастер-баннер.');
  return n;
}
// Analysis of an extra master: same render as for the main one, from its own (or detected) roles.
async function alternateScene(m:MasterNode){
  const roles=await rolesFor(m),v=roles.visual?await figma.getNodeByIdAsync(roles.visual):null;
  if(!v||!isDesign(v)||!isInside(v,m)){send({type:'alt-scene',id:m.id,bytes:null});return;}
  const mode=readSettings(m)?.options.visualMode||'auto',bg=backgroundMode(v,m,mode);
  send({type:'alt-scene',id:m.id,bytes:Array.from(await sceneBytes(m,v,roles,bg&&coversMaster(v,m)))});
}
async function sendAlternates(m:MasterNode,settings:SavedSettings|null){
  const items=[];for(const a of settings?.options.alternates||[]){const n=await figma.getNodeByIdAsync(a.id);try{items.push({...alternateInfo(checkAlternate(n,m)),subject:a.subject||null,aiScene:a.aiScene||null});}catch(_e){}}
  send({type:'alternates',items});for(const it of items){const n=await figma.getNodeByIdAsync(it.id);if(n&&isMaster(n))await alternateScene(n);}
}
figma.ui.onmessage=async (message:UiMessage)=>{
  const operation=message.type==='generate'||message.type==='update'||message.type==='trial';let ownsBusy=false;
  try{
    if(message.type==='cancel'){cancelled=true;return;}
    if(message.type==='ready'){send({type:'presets',sizes:PRESETS,platforms:PLATFORMS});send({type:'ai-config',config:await aiConfig()});try{await capture();}catch(e){send({type:'status',text:messageText(e)});}return;}
    if(message.type==='ai-config-save'){await figma.clientStorage.setAsync('aiConfig',validAiConfig(message.config));send({type:'ai-config-saved'});return;}
    if(busy)return;
    if(message.type==='save-settings'){
      const m=await figma.getNodeByIdAsync(message.masterId||'');if(!m||!isMaster(m))throw new Error('Мастер недоступен.');
      saveSettings(m,settingsFrom(message.roles,message.sizes,message.options));send({type:'saved',masterId:m.id});return;
    }
    if(message.type==='capture'){await capture();return;}
    // Reset: forget this master's saved settings and start again from automatic roles and the default presets.
    // Created sets keep their own settings; the personal AI connection is not touched.
    if(message.type==='reset-settings'){
      const m=await figma.getNodeByIdAsync(message.masterId||'');if(!m||!isMaster(m))throw new Error('Мастер недоступен.');
      m.setSharedPluginData(DATA_NS,'settings','');await showMaster(m);send({type:'reset-done',masterId:m.id});return;
    }
    if(message.type==='list-batches'){send({type:'batches',items:listBatches(masterId)});return;}
    if(message.type==='load-batch'){
      const n=await figma.getNodeByIdAsync(message.batchId||''),d=n&&readBatch(n);if(!d)throw new Error('Набор не найден или создан до версии 0.6.');
      const m=await figma.getNodeByIdAsync(d.masterId);if(!m||!isMaster(m))throw new Error('Исходный мастер удалён.');await showMaster(m,d.settings,n!.id);return;
    }
    if(message.type==='open-link'){figma.openExternal(AUTHOR_URL);return;}
    if(message.type==='export'){
      const frame=await exportTarget(message.batchId);const items=exportItems(frame);
      if(!items.length)throw new Error('В наборе нет баннеров для выгрузки.');
      busy=true;ownsBusy=true;cancelled=false;send({type:'busy',value:true});
      send({type:'export-start',total:items.length,name:frame.name});
      for(let i=0;i<items.length;i++){if(cancelled)break;const c=items[i];
        const bytes=await c.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}});
        send({type:'export-file',index:i,w:Math.round(c.width),h:Math.round(c.height),name:c.name,bytes});await new Promise(r=>setTimeout(r,0));}
      send({type:'export-end',cancelled});return;
    }
    if(message.type==='add-alternate'){
      const sel=figma.currentPage.selection,primary=await figma.getNodeByIdAsync(masterId);if(sel.length!==1)throw new Error('Выделите один дополнительный мастер-баннер.');
      const m=checkAlternate(sel[0],primary);send({type:'alternate',item:alternateInfo(m)});await alternateScene(m);return;
    }
    if(message.type==='visual-preview'){await visualPreview(message.id||'',message.visualMode,message.roles);return;}
    if(message.type==='ai-image'){await aiImage(message);return;}
    if(message.type==='select-layer'){const n=await figma.getNodeByIdAsync(message.id||'');if(n&&'visible'in n){figma.currentPage.selection=[n];figma.viewport.scrollAndZoomIntoView([n]);}return;}
    if(!operation)return;
    busy=true;ownsBusy=true;cancelled=false;send({type:'busy',value:true});
    const m=await figma.getNodeByIdAsync(masterId);if(!m||m.removed||!isMaster(m))throw new Error('Мастер недоступен. Выберите его заново.');
    if(!isInside(m,figma.currentPage))throw new Error('Вернитесь на страницу мастера.');
    let target:FrameNode|null=null;
    if(message.type==='update'){
      if(!message.confirmed)throw new Error('Подтвердите замену содержимого набора.');
      const n=await figma.getNodeByIdAsync(message.batchId||''),data=n&&readBatch(n);
      if(!n||n.type!=='FRAME'||!data||data.masterId!==m.id||!isInside(n,figma.currentPage)||isInside(m,n))throw new Error('Выберите связанный набор на странице мастера.');
      target=n;
    }
    const settings=settingsFrom(message.roles,message.sizes,message.options);
    let work=settings;
    if(message.type==='trial'){
      const size=validateSizes([message.trialSize])[0];if(!settings.sizes.some(s=>s[0]===size[0]&&s[1]===size[1]))throw new Error('Выберите пробный размер из набора.');
      work=subsetSettings(settings,[size]);
      target=figma.currentPage.findAllWithCriteria({types:['FRAME']}).find(n=>readBatch(n,'trial')?.masterId===m.id)||null;
      if(target&&isInside(m,target))throw new Error('Пробный фрейм не должен содержать мастер.');
    }
    const result=await generate(m,work.roles,work.sizes,work.options,async(done,total)=>{send({type:'progress',done,total});await new Promise(resolve=>setTimeout(resolve,0));},()=>cancelled);
    let output=result.output,backupId='';const actual=completedSettings(work,result.completed);
    if((target||message.type==='trial')&&(cancelled||result.cancelled)){output.remove();send({type:'status',text:'Обновление отменено. Прежний набор сохранён без изменений.'});return;}
    const isTrial=message.type==='trial',dataKey=isTrial?'trial':'batch';
    if(isTrial)output.name='Пробный ресайз · '+m.name+' · '+work.sizes[0].join('×');
    try{if(target){const backup=commitUpdate(target,output,m,isTrial?settings:actual,dataKey);backupId=isTrial?'':backup.id;output=target;}else registerBatch(output,m,isTrial?settings:actual,dataKey);}catch(e){if(!result.output.removed)result.output.remove();throw e;}
    try{saveSettings(m,settings);}catch(e){result.warnings.push('Не удалось сохранить настройки мастера: '+messageText(e));}
    figma.currentPage.selection=[output];figma.viewport.scrollAndZoomIntoView([output]);if(!isTrial)send({type:'batches',items:listBatches(m.id),selectedId:output.id});
    send({type:'done',count:result.completed,warnings:result.warnings,general:result.general,results:result.results,cancelled:result.cancelled,updated:!!target,trial:isTrial,backupId,outputId:output.id});
  }catch(e){send({type:message.type==='save-settings'?'save-error':'error',masterId:message.masterId,text:messageText(e)});}finally{if(ownsBusy){busy=false;send({type:'busy',value:false});}}
};
