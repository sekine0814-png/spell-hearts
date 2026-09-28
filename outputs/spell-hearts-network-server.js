/* Spell Heart rebuilt relay. The server owns the match; clients only request actions. */
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const ROOT=__dirname,PORT=process.env.PORT||8787,rooms=new Map(),HAND=["rock","scissors","paper","amplify"];
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const other=s=>s==="p"?"c":"p",wins=(a,b)=>(a==="rock"&&b==="scissors")||(a==="scissors"&&b==="paper")||(a==="paper"&&b==="rock");
const newSide=()=>({hp:10,deck:["pursuit","block"],spell:null,used:[],pick:null,ok:false,drawn:false});
function game(code){return {id:crypto.randomUUID(),code,clients:{p:null,c:null},names:{p:"RED",c:"BLUE"},sides:{p:newSide(),c:newSide()},phase:"opening",round:1,message:"両者、始まりのスペルをドローしてください。",shown:null}}
function snapshot(g,side){
  const self=g.sides[side],foe=g.sides[other(side)],publicSide=(x,owner)=>({hp:x.hp,spell:owner===side?x.spell:null,hasSpell:!!x.spell,grave:x.used});
  return {room:g.code,side,phase:g.phase,round:g.round,message:g.message,red:publicSide(g.sides.p,"p"),blue:publicSide(g.sides.c,"c"),hand:HAND,canUse:g.phase==="spell"&&!!self.spells[0],canOk:g.phase==="spell"&&!self.ok,battle:g.shown};
}
function frame(socket,object){if(!socket||socket.destroyed)return;const data=Buffer.from(JSON.stringify(object)),size=data.length,header=size<126?Buffer.from([129,size]):Buffer.from([129,126,size>>8,size&255]);socket.write(Buffer.concat([header,data]));}
function broadcast(g){for(const side of ["p","c"])frame(g.clients[side],{type:"state",state:snapshot(g,side)})}
function startIfReady(g){if(g.clients.p&&g.clients.c){g.message="両者、始まりのスペルをドローしてください。";broadcast(g)}}
function join(socket,input){
  const code=String(input.room||"").trim().slice(0,10);if(!code)return frame(socket,{type:"error",message:"合言葉を入力してください。"});
  let g=rooms.get(code);if(!g){g=game(code);rooms.set(code,g)}let side=!g.clients.p?"p":!g.clients.c?"c":null;
  if(!side)return frame(socket,{type:"error",message:"この部屋は満員です。"});
  g.clients[side]=socket;socket.game=g;socket.side=side;frame(socket,{type:"joined",side,room:code});startIfReady(g);broadcast(g);
}
function draw(g,side){const s=g.sides[side];if(g.phase!=="opening"||s.drawn)return;s.drawn=true;s.spell=s.deck.shift()||null;if(g.sides.p.drawn&&g.sides.c.drawn){g.phase="pick";g.message=`ROUND ${g.round} — バトルカードを選択`}broadcast(g)}
async function pick(g,side,key){
  if(g.phase!=="pick"||!HAND.includes(key)||g.sides[side].pick)return;g.sides[side].pick=key;
  if(!g.sides.p.pick||!g.sides.c.pick){g.message="相手のバトルカードを待っています。";return broadcast(g)}
  const p=g.sides.p.pick,c=g.sides.c.pick;g.phase="reveal";g.shown={a:p,b:c};g.message="カードを公開！";broadcast(g);await wait(750);
  if(g.phase!=="reveal")return;let dp=0,dc=0;if(wins(p,c))dc=2;else if(wins(c,p))dp=2;g.sides.p.hp=Math.max(0,g.sides.p.hp-dp);g.sides.c.hp=Math.max(0,g.sides.c.hp-dc);
  if(!g.sides.p.hp||!g.sides.c.hp){g.phase="end";g.message=g.sides.p.hp===g.sides.c.hp?"DRAW GAME":g.sides.p.hp?"RED WIN":"BLUE WIN";return broadcast(g)}
  g.phase="spell";g.sides.p.ok=false;g.sides.c.ok=false;g.message="スペルを使用するか、OKを押してください。";broadcast(g);
}
function use(g,side){const s=g.sides[side],foe=g.sides[other(side)],spell=s.spell;if(g.phase!=="spell"||!spell)return;if(spell==="pursuit")foe.hp=Math.max(0,foe.hp-1);if(spell==="block")s.hp=Math.min(10,s.hp+1);s.used.push(spell);s.spell=s.deck.shift()||null;s.ok=true;g.message=`${side==="p"?"RED":"BLUE"}：${spell==="pursuit"?"追撃":"ブロック"}`;finishSpell(g)}
function ready(g,side){if(g.phase!=="spell")return;g.sides[side].ok=true;finishSpell(g)}
function finishSpell(g){if(!g.sides.p.ok||!g.sides.c.ok)return broadcast(g);if(!g.sides.p.hp||!g.sides.c.hp){g.phase="end";g.message=g.sides.p.hp?"RED WIN":"BLUE WIN";return broadcast(g)}g.round++;for(const s of Object.values(g.sides)){s.pick=null;s.ok=false}s.phase="pick";g.phase="pick";g.shown=null;g.message=`ROUND ${g.round} — バトルカードを選択`;broadcast(g)}
function parse(buffer,receive){let at=0;while(at+2<=buffer.length){let n=buffer[at+1]&127,masked=!!(buffer[at+1]&128),head=2;if(n===126){if(at+4>buffer.length)break;n=buffer.readUInt16BE(at+2);head=4}const total=head+(masked?4:0)+n;if(at+total>buffer.length)break;const mask=masked?buffer.subarray(at+head,at+head+4):null,start=at+head+(masked?4:0),body=Buffer.from(buffer.subarray(start,start+n));if(mask)for(let i=0;i<body.length;i++)body[i]^=mask[i%4];if((buffer[at]&15)===1)try{receive(JSON.parse(body.toString()))}catch{}at+=total}return buffer.subarray(at)}
const server=http.createServer((req,res)=>{const name=new URL(req.url,"http://x").pathname==="/"
  ?"spell-hearts.html":decodeURIComponent(new URL(req.url,"http://x").pathname).replace(/^\//,""),file=path.resolve(ROOT,name);if(!file.startsWith(ROOT)||!fs.existsSync(file)){res.writeHead(404);return res.end("Not found")}res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});fs.createReadStream(file).pipe(res)});
server.on("upgrade",(req,socket)=>{const key=req.headers["sec-websocket-key"];if(!key)return socket.destroy();const accept=crypto.createHash("sha1").update(key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);let rest=Buffer.alloc(0);socket.on("data",chunk=>{rest=parse(Buffer.concat([rest,chunk]),m=>{if(m.type==="join")join(socket,m);else if(socket.game){if(m.type==="draw")draw(socket.game,socket.side);if(m.type==="pick")pick(socket.game,socket.side,m.card);if(m.type==="use")use(socket.game,socket.side);if(m.type==="ok")ready(socket.game,socket.side)}})});socket.on("close",()=>{const g=socket.game;if(g&&g.clients[socket.side]===socket){g.clients[socket.side]=null;g.message="相手の再入室を待っています。";broadcast(g)}})});
server.listen(PORT,"0.0.0.0",()=>console.log(`Spell Heart rebuilt server listening on ${PORT}`));
