const path=require('path');const root=path.join(__dirname,'..');const fs=require('fs'),vm=require('vm'),assert=require('assert'),{stripTypeScriptTypes}=require('node:module');
const booking={id:'BOOK1',rec:{customer:'test',sales:'Test Sales',br:'PSC',doc_imgs:[],slip_imgs:[],gform:{via:'web',sent_at:'2026-10-14T12:00:00Z',res:{mgr:'ok',sales:'error',sheet:'ok',drive:'ok'}}}};
async function clientCase(){
 let outgoing, saved;
 const c={window:{__WEB:{notifyReady:{mgr:true,sales:true,sheet:true,drive:true},notify:async body=>{outgoing=body;return {sales:'ok'}}}},S:{},ACTIONS:{},perms:()=>({write:true}),canEditBooking:()=>true,atById:()=>booking,render(){},toast(){},confirm:()=>{throw Error('retry must not request photos')},gsCfg:()=>({id:'sheet1',range:'Booking!A2:U'}),gformValue:()=>'',actor:()=>({}),esc:x=>x,box:(_,x)=>x,saveBk:async(id,act,note,fn)=>{saved=structuredClone(booking.rec);fn(saved);return saved}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'src/75-notify.js'),'utf8'),c);
 assert.deepEqual(Array.from(c.notifyPending(booking)),['sales']);assert(c.notifyBox(booking,null).includes('ส่งเฉพาะ กลุ่มเซลล์'));
 await c.ACTIONS['bk-notify']({dataset:{id:'BOOK1'}});assert.deepEqual(Array.from(outgoing.channels),['sales']);assert.equal(saved.gform.res.mgr,'ok');assert.equal(saved.gform.res.sales,'ok');assert.equal(saved.gform.res.sheet,'ok');assert(saved.gform.sent_at);
 c.window.__WEB.notify=async()=>({sales:'off',details:{sales:'Missing settings'}});await c.ACTIONS['bk-notify']({dataset:{id:'BOOK1'}});assert.equal(saved.gform.sent_at,null);assert.equal(saved.gform.details.sales,'Missing settings');assert.equal(saved.gform.res.mgr,'ok');
 c.window.__WEB.notify=async()=>{throw Error('network')};await c.ACTIONS['bk-notify']({dataset:{id:'BOOK1'}});assert.equal(saved.gform.res.sales,'unknown');assert(!Array.from(c.notifyPending({id:'B',rec:saved})).includes('sales'));
 console.log('PASS client: partial delivery stays incomplete, sales-only retry, success preserved, missing config visible, uncertain results cannot blindly resend');
}
async function serverCase({role='exec',salesConfigured=true,telegramStatus=200,telegramOk=true,prior={mgr:'ok',sales:'error',sheet:'ok',drive:'ok'}}={}){
 let handle;const sent=[];const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-test',TELEGRAM_MGR_BOT_TOKEN:'mgr-test',TELEGRAM_MGR_CHAT_ID:'mgr-chat'};
 if(salesConfigured){env.TELEGRAM_SALES_BOT_TOKEN='sales-test';env.TELEGRAM_SALES_CHAT_ID='sales-chat';}
 const ctx={
 console:{error(){}},Response,Request,Headers,Set,Date,crypto:require('crypto').webcrypto,TextEncoder,Uint8Array,btoa,atob,
 Deno:{env:{get:k=>env[k]},serve:h=>handle=h},
 createClient:()=>({
  auth:{getUser:async()=>({data:{user:{email:'test@test.local',id:'USER'}}})},
  from(table){return {
   select(){return this},eq(){return this},
   maybeSingle:async()=>({data:table==='members'?{active:true,role,branch:'KPA',sales_name:'Other'}:{data:{br:'PSC',sales:'Test Sales',gform:{via:'web',res:prior}}}})
  };}
 }),
 fetch:async(url,opt)=>{sent.push({url,body:JSON.parse(opt.body)});return {
  ok:telegramStatus===200,status:telegramStatus,
  json:async()=>telegramOk?{ok:true,result:{message_id:1}}:{ok:false,error_code:telegramStatus===200?400:telegramStatus,description:'Bad Request: chat not found'}
 };}
 };
 vm.createContext(ctx);let source=fs.readFileSync(path.join(root,'supabase/functions/booking-notify/index.ts'),'utf8').replace(/^import .*;\n/gm,'');source=stripTypeScriptTypes(source);vm.runInContext(source,ctx);
 const resp=await handle(new Request('https://test.local',{method:'POST',body:JSON.stringify({webId:'BOOK1',channels:['sales'],fields:[['customer','test']],salesFields:[['customer','test']],sheetId:'sheet1',photos:['photo1']})}));return {status:resp.status,result:await resp.json(),sent};
}
(async()=>{
 await clientCase();let r=await serverCase();assert.equal(r.sent.length,1);assert(r.sent[0].url.endsWith('/sendMessage'));assert.equal(r.sent[0].body.chat_id,'sales-chat');assert.equal(r.result.mgr,'ok');assert.equal(r.result.sales,'ok');
 r=await serverCase({salesConfigured:false});assert.equal(r.sent.length,0);assert.equal(r.result.sales,'off');assert(r.result.details.sales.includes('TELEGRAM_SALES_CHAT_ID'));
 r=await serverCase({telegramStatus:200,telegramOk:false});assert.equal(r.result.sales,'error');assert(r.result.details.sales.includes('Chat ID'));
 r=await serverCase({prior:{mgr:'ok',sales:'ok',sheet:'ok'}});assert.equal(r.sent.length,0);assert.equal(r.result.sales,'ok');
 r=await serverCase({role:'sales'});assert.equal(r.status,403);assert.equal(r.sent.length,0);
 r=await serverCase({prior:{mgr:'ok',sales:'unknown',sheet:'ok'}});assert.equal(r.sent.length,0);assert.equal(r.result.sales,'unknown');
 console.log('PASS server: only sales requested, existing successes skipped, missing env reported, Telegram JSON failure rejected, role checked, unknown outcome not replayed');
})().catch(e=>{console.error(e);process.exitCode=1});
