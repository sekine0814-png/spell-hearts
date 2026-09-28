/* Spell Heart rebuilt client — one state store, one renderer, no DOM observers. */
const A="assets/", app=document.querySelector("#app"), fade=document.querySelector("#fade");
const CARD={rock:{name:"グー",file:"rock.webp"},scissors:{name:"チョキ",file:"scissors.webp"},paper:{name:"パー",file:"paper.webp"},amplify:{name:"増幅",file:"amplify.webp"}};
const SPELL={pursuit:{name:"追撃",file:"pursuit.webp"},block:{name:"ブロック",file:"block.webp"},scheme:{name:"謀略",file:"scheme.webp"}};
const SERIES={normal:{},animal:{rock:"animal-rock.webp",scissors:"animal-scissors.webp",paper:"animal-paper.webp",amplify:"animal-amplify.webp"},astrologian:{rock:"astrologian-rock.webp",scissors:"astrologian-scissors.webp",paper:"astrologian-paper.webp",amplify:"astrologian-amplify.webp"},magic:{rock:"magic-rock.webp",scissors:"magic-scissors.webp",paper:"magic-paper.webp",amplify:"magic-amplify.webp"},samurai:{rock:"samurai-rock.webp",scissors:"samurai-scissors.webp",paper:"samurai-paper.webp",amplify:"samurai-amplify.webp"}};
const DEFAULT={chapter:1,tokens:7,owned:["normal"],cosmetics:{battle:"normal"},sound:{bgm:.42,se:.5}};
function stored(){
  try{
    const raw=JSON.parse(localStorage.getItem("spell-heart-rebuild")||"{}"), selected=raw?.cosmetics?.battle;
    return {...DEFAULT,...raw,tokens:Number.isFinite(Number(raw.tokens))?Number(raw.tokens):DEFAULT.tokens,
      owned:Array.isArray(raw.owned)?raw.owned.filter(x=>Object.hasOwn(SERIES,x)):["normal"],
      cosmetics:{battle:Object.hasOwn(SERIES,selected)?selected:"normal"},sound:{...DEFAULT.sound,...raw.sound}};
  }catch{return {...DEFAULT}}
}
const S={profile:stored(),view:"title",story:null,battle:null,audio:new Map(),audioUnlocked:false,transitioning:false};
function save(){localStorage.setItem("spell-heart-rebuild",JSON.stringify(S.profile))}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function button(label,action,cls="choice"){return `<button class="${cls}" data-action="${action}">${label}</button>`}
function topbar(){return `<div class="topbar">${button("⚙ 着せ替え","dress","primary icon")}${button("タイトルに戻る","title","primary icon")}</div>`}
function art(key,kind="battle"){
  const data=kind==="battle"?CARD[key]:SPELL[key], selected=kind==="battle"?SERIES[S.profile.cosmetics.battle]?.[key]:null;
  const base=A+data.file, custom=selected?A+selected:null, name=esc(data.name);
  return `<span style="position:relative;display:block;width:100%;height:100%"><img src="${base}" alt="${name}" draggable="false">${custom?`<img src="${custom}" alt="" aria-hidden="true" draggable="false" style="position:absolute;inset:0" onerror="this.remove()">`:""}<span style="position:absolute;left:0;right:0;bottom:0;padding:3px 1px;background:#05070dcc;color:#ffe99f;font-size:clamp(9px,1vw,14px);text-align:center;text-shadow:0 1px #000">${name}</span></span>`;
}
function card(key,kind="battle",action=""){return `<button class="card ${action?"ready":""}" ${action?`data-action="${action}"`:"disabled"}>${art(key,kind)}</button>`}
function audio(name,{loop=false,volume=S.profile.sound.bgm}={}){
  if(!S.audio.has(name)){const x=new Audio(A+name);x.loop=loop;S.audio.set(name,x)} const x=S.audio.get(name);x.loop=loop;x.volume=volume;return x;
}
/* Audio is deliberately fire-and-forget: no browser audio promise may block UI state. */
function playMusic(name){stopMusic();const x=audio(name,{loop:true});x.play().catch(()=>{})}
function stopMusic(){for(const x of S.audio.values())if(x.loop){x.pause();x.currentTime=0}}
function se(name){const x=audio(name,{volume:S.profile.sound.se});x.currentTime=0;x.play().catch(()=>{})}
function unlockAudio(){
  if(S.audioUnlocked)return;S.audioUnlocked=true;
  const x=audio("card-flip.mp3",{volume:0});
  x.play().then(()=>{x.pause();x.currentTime=0}).catch(()=>{});
}
async function transition(work){
  if(S.transitioning)return false;S.transitioning=true;fade.classList.add("on");
  try{await new Promise(r=>setTimeout(r,560));await work()}finally{requestAnimationFrame(()=>fade.classList.remove("on"));S.transitioning=false}
  return true;
}

const CHAPTERS={
  1:[
    {bg:"story-village.webp",music:"story-village-ambience.mp3",text:"朝の村は、いつも通り穏やかだった。今日も演習場へ向かおう。"},
    {bg:"story-training-ground.webp",left:"story-woman-warrior.webp",right:"story-yuto-battle.png",speaker:"ユート",text:"「来たか。まずは、俺と一戦やってみようぜ。」"},
    {speaker:"エア",text:"「焦らなくて大丈夫。自分の手札をよく見て選んで。」"},
    {action:"battle",enemy:"狼",battleBg:"story-training-ground.webp",music:"tutorial-battle-bgm.mp3"},
    {bg:"story-village.webp",left:"story-woman-warrior.webp",speaker:"エア",text:"「やるね、キミ。これからが楽しみだよ。」"},
    {text:"こうして、主人公の最初の一日は終わった。",end:true}
  ],
  2:[
    {bg:"story-tavern.jpg",music:"story-tavern-bgm.mp3",left:"story-air-tavern-v2.png",right:"story-yuto-tavern-v2.png",speaker:"ユート",text:"「改めて紹介するよ。こっちがエア。昔からの仲間なんだ。」"},
    {speaker:"エア",text:"「訓練校を出てから王都へ行ってね。冒険者として、ずっと剣を磨いてきたの。」"},
    {speaker:"ユート",text:"「王都の兵士や冒険者になるのが夢だったろ。よく考えて決めろよ。」"},
    {bg:"story-home-night.jpg",music:"melancholy.mp3",text:"（王都かぁ……。自分の実力で、あそこで仕事ができるだろうか。）"},
    {text:"考えているうちに、いつの間にか眠りに落ちていた。"},
    {bg:"story-home-morning.jpg",text:"朝日が差し込む。今日も訓練だ。準備をして演習場へ向かう。"},
    {bg:"story-training-ground.jpg",left:"story-woman-warrior.webp",right:"story-yuto-battle.png",music:"story-training-ground-bgm.mp3",text:"演習場では、エアとユートが手合わせをしていた。わずかにエアが優勢だ。"},
    {speaker:"ユート",text:"「王都では最近、魔物の動きが活発らしい。兵士も冒険者も、腕利きを求めている。」"},
    {speaker:"エア",text:"「今ならチャンスかもね。……ものは試しに、私と手合わせしてみる？」"},
    {speaker:"ユート",text:"「決めるのはお前だ。でも、実力を試す価値はある。」"},
    {speaker:"主人公",text:"「では、お願いします！」"},
    {speaker:"エア",text:"「じゃあ、いくよ！」",action:"battle",enemy:"エア",battleBg:"story-training-ground.webp",music:"story-training-ground-bgm.mp3"},
    {bg:"story-training-ground.jpg",left:"story-woman-warrior.webp",right:"story-yuto-battle.png",speaker:"エア",text:"「やるね……キミ！」"},
    {speaker:"エア",text:"「それなら……！」"},
    {speaker:"ユート",text:"「そこまで！　やりすぎだ、エア。」"},
    {speaker:"エア",text:"「ご、ごめん。でも、思っていたよりずっと洗練されている技だった。危なかったよ。」"},
    {speaker:"主人公",text:"「ありがとうございました……。」"},
    {speaker:"エア",text:"「見くびっていたよ。その実力なら王都でも十分やっていける。ただ、実戦経験は必要だね。」"},
    {speaker:"主人公",text:"「王都に、行ってみたいです……！」"},
    {speaker:"ユート",text:"「なら、王都に帰るエアと旅をしてみたらどうだ？」"},
    {speaker:"エア",text:"「私はいいよ。一緒に行こう。」"},
    {bg:"story-home-morning.jpg",text:"荷物をまとめる。（しばらく帰って来られないな……。）"},
    {bg:"story-town-gate.jpg",left:"story-woman-warrior.webp",right:"story-yuto-battle.png",speaker:"ユート",text:"「忘れ物はないか？」"},
    {speaker:"エア",text:"「大丈夫だよ。」"},
    {speaker:"主人公",text:"「はい。」"},
    {speaker:"ユート",text:"「お前ならできる。気をつけて行けよ。」"},
    {speaker:"エア",text:"「じゃあ行こうか。」"},
    {text:"街を出たところで、Chapter 2 終了。",end:true}
  ]
};
function title(){
  stopMusic();S.view="title";S.story=null;S.battle=null;
  app.className="screen title";app.innerHTML=`<div class="title-panel"><div class="logo">SPELL HEART</div><div class="menu">${button("PRESS SCREEN","press","primary")}</div></div>`;
}
function menu(){
  app.className="screen title";app.innerHTML=`<div class="title-panel"><div class="logo">SPELL HEART</div><div class="menu">${button("STORY MODE","story")}${button("CPU戦","cpu")}${button("オンライン対戦","online")}${button("交換所（所持："+S.profile.tokens+"）","shop")}${button("着せ替え","dress")}</div></div>`;playMusic("title-old-growth-forest.mp3");
}
function storySelect(){
  app.className="screen title";app.innerHTML=`<div class="title-panel"><div class="logo">STORY MODE</div><div class="menu">${button("Chapter 1","chapter:1")}${button("Chapter 2","chapter:2")}${button("戻る","menu","secondary")}</div></div>`;
}
function startStory(chapter){S.story={chapter,index:0};advanceStory(true)}
async function advanceStory(first=false){
  const lines=CHAPTERS[S.story.chapter],line=lines[S.story.index];
  if(line.end){title();return}
  if(line.action==="battle"){await beginBattle({story:true,enemy:line.enemy,bg:line.battleBg,music:line.music});return}
  const draw=()=>renderStory(line);if(first||line.bg)await transition(draw);else draw();
}
function renderStory(line){
  if(line.music)playMusic(line.music);S.view="story";S.story.bg=line.bg||S.story.bg||"story-village.webp";app.className="screen story";app.style.backgroundImage=`linear-gradient(#0002,#0008),url("${A+S.story.bg}")`;
  const left=line.left?`<img class="portrait left ${line.speaker&&line.speaker!=="エア"?"dim":""}" src="${A+line.left}" alt="">`:"";
  const right=line.right?`<img class="portrait right ${line.speaker&&line.speaker!=="ユート"?"dim":""}" src="${A+line.right}" alt="">`:"";
  app.innerHTML=`${topbar()}<div class="characters">${left}${right}</div><button class="dialogue" data-action="next-story"><span class="speaker">${esc(line.speaker||"")}</span><div class="line">${esc(line.text)}</div><span class="next">▼</span></button>`;
}
function nextStory(){if(S.transitioning)return;S.story.index++;advanceStory()}
function beats(a,b){return(a==="rock"&&b==="scissors")||(a==="scissors"&&b==="paper")||(a==="paper"&&b==="rock")}
async function beginBattle({story=false,enemy="CPU",bg="battle-bg-castle-tower-night.webp",music="forgotten-city.mp3"}={}){
  stopMusic();playMusic(music);S.view="battle";S.battle={story,enemy,bg,music,playerHp:10,cpuHp:10,hand:["rock","scissors","paper","amplify"],spells:["pursuit","block"],cpu:["rock","scissors","paper"],round:1,phase:"select",log:[`${enemy}との戦闘が始まった。バトルカードを選択。`],returnIndex:S.story?.index??0};renderBattle();
}
function renderBattle(){
  const b=S.battle;app.className="screen battle";app.style.backgroundImage=`linear-gradient(#0003,#0008),url("${A+b.bg}")`;
  const hand=b.hand.map(k=>card(k,"battle",b.phase==="select"?`pick:${k}`:"")).join("");
  const pSpell=b.spells.map(k=>card(k,"spell",b.phase==="select"?`spell:${k}`:"")).join("");
  const cpuCards=`<div class="hand">${b.cpu.map(()=>`<div class="card-back"><img src="${A+"blue-battle-back.webp"}" alt="CPUのバトルカード"></div>`).join("")}</div>`;
  const cpuSpells=`<div class="spell-row">${b.spells.map(()=>`<div class="card-back"><img src="${A+"blue-spell-back.webp"}" alt="CPUのスペルカード"></div>`).join("")}</div>`;
  const played=b.played?`<div class="played">${art(b.played.player)}</div><span class="vs">VS</span><div class="played">${art(b.played.cpu)}</div>`:`<span class="vs">VS</span>`;
  app.innerHTML=`${topbar()}<div class="battle-frame"><div class="battle-head"><span class="hp player">HP ${b.playerHp} / 10</span><span class="hp cpu">${esc(b.enemy)} HP ${b.cpuHp} / 10</span></div><div class="board"><section class="side player"><div class="zone-title">バトルカード</div><div class="hand">${hand}</div><div class="zone-title">スペルカード</div><div class="spell-row">${pSpell}</div></section><section class="arena">${played}</section><section class="side cpu"><div class="zone-title">CPU バトルカード</div>${cpuCards}<div class="zone-title">CPU スペルカード</div>${cpuSpells}</section><div class="battle-message">${esc(b.message||`ROUND ${b.round} — バトルカードを選択`)}</div></div><div class="battle-actions">${button("パス","pass","secondary")}</div><ul class="log">${b.log.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
}
async function pick(key){
  const b=S.battle;if(b.phase!=="select")return;b.phase="resolving";b.played={player:key,cpu:b.cpu[Math.floor(Math.random()*b.cpu.length)]};b.message="カードを公開！";se("card-flip.mp3");renderBattle();await new Promise(r=>setTimeout(r,700));
  let p=0,c=0;if(beats(key,b.played.cpu))c=2;else if(beats(b.played.cpu,key))p=2;b.cpuHp-=c;b.playerHp-=p;if(c)se("damage-1.mp3");if(p)se("damage-2.mp3");
  b.log.unshift(c?`あなたの${CARD[key].name}が勝利。相手に${c}ダメージ。`:p?`${b.enemy}の${CARD[b.played.cpu].name}が勝利。あなたに${p}ダメージ。`:"あいこ。");b.round++;
  if(b.playerHp<=0||b.cpuHp<=0){b.message=b.cpuHp<=0?"勝利！":"敗北……";renderBattle();setTimeout(finishBattle,1000);return}
  b.phase="select";b.message=`ROUND ${b.round} — バトルカードを選択`;renderBattle();
}
function castSpell(key){
  const b=S.battle;if(b.phase!=="select"||!b.spells.includes(key))return;b.spells=b.spells.filter(x=>x!==key);
  if(key==="pursuit"){b.cpuHp=Math.max(0,b.cpuHp-1);b.log.unshift("追撃：相手に1ダメージ。");se("pursuit-sfx.mp3")}else{b.playerHp=Math.min(10,b.playerHp+1);b.log.unshift("ブロック：HPを1回復。");se("block-sfx.mp3")}
  renderBattle();if(b.cpuHp===0)setTimeout(finishBattle,500);
}
function pass(){if(S.battle?.phase==="select"){S.battle.log.unshift("スペルは使わず、バトルカードを選択する。");renderBattle()}}
function finishBattle(){
  const b=S.battle;stopMusic();if(!b.story){menu();return}S.story.index=b.returnIndex+1;transition(()=>advanceStory(true));
}
function dress(){
  const current=S.profile.cosmetics.battle;
  const preview=s=>A+(SERIES[s]?.rock||CARD.rock.file);
  app.insertAdjacentHTML("beforeend",`<div class="modal-layer"><section class="modal"><h2>現在のバトルカード着せ替え</h2><div class="inventory">${Object.keys(SERIES).map(s=>`<button class="card ${s===current?"equipped":""}" data-action="equip:${s}"><img src="${preview(s)}" alt="${s==="normal"?"通常":esc(s)}"><span class="small">${s==="normal"?"通常":esc(s)}</span></button>`).join("")}</div><p class="small">選択中の枠が光ります。戦闘中も同じ設定を一度だけ読み込みます。</p>${button("閉じる","close-modal","secondary")}</section></div>`);
}
function closeModal(){document.querySelector(".modal-layer")?.remove()}
function equip(series){S.profile.cosmetics.battle=series;save();closeModal();if(S.view==="battle")renderBattle()}
function shop(){
  stopMusic();S.view="shop";app.className="screen title";
  const price=10, options=Object.keys(SERIES).filter(x=>x!=="normal");
  app.innerHTML=`<div class="title-panel"><div class="logo" style="font-size:clamp(34px,6vw,70px)">アイテム交換所</div><section class="modal"><p style="text-align:center">所持：<b style="color:#ffe18a">${S.profile.tokens}</b> 星のカケラ</p><div class="inventory">${options.map(s=>{const owned=S.profile.owned.includes(s),src=A+(SERIES[s].rock||CARD.rock.file);return `<button class="card ${owned?"equipped":""}" data-action="${owned?`equip:${s}`:`buy:${s}`}"><img src="${src}" alt="${esc(s)}"><span class="small">${esc(s)}<br>${owned?"所持中・選択":"10 星のカケラで交換"}</span></button>`}).join("")}</div><p class="small">交換後は着せ替え画面でも確認できます。</p>${button("戻る","menu","secondary")}</section></div>`;
}
function buy(series){
  if(!Object.hasOwn(SERIES,series)||S.profile.owned.includes(series))return;
  if(S.profile.tokens<10){app.querySelector(".small").textContent="星のカケラが足りません。";return}
  S.profile.tokens-=10;S.profile.owned.push(series);S.profile.cosmetics.battle=series;save();shop();
}
function online(){
  stopMusic();S.view="online";app.className="screen title";
  app.innerHTML=`<div class="title-panel"><div class="logo" style="font-size:clamp(34px,6vw,70px)">ONLINE BATTLE</div><section class="modal"><p class="small">同じ合言葉を入力した二人が、自動的に対戦相手になります。</p><input id="roomCode" maxlength="10" placeholder="合言葉" style="width:100%;padding:13px;text-align:center;background:#05070d;color:#ffe9b2;border:1px solid var(--gold)"><p id="onlineNotice" class="small"></p>${button("対戦部屋へ入る","join-online","primary")}${button("戻る","menu","secondary")}</section></div>`;
}
function closeNet(){if(S.net?.socket){S.net.socket.onclose=null;S.net.socket.close()}S.net=null}
function joinOnline(){
  const code=String(document.querySelector("#roomCode")?.value||"").trim();if(!code){document.querySelector("#onlineNotice").textContent="合言葉を入力してください。";return}
  closeNet();const protocol=location.protocol==="https:"?"wss":"ws", socket=new WebSocket(`${protocol}://${location.host}`);
  S.net={socket,state:null};document.querySelector("#onlineNotice").textContent="接続しています……";
  socket.onopen=()=>socket.send(JSON.stringify({type:"join",room:code,nickname:"PLAYER",cosmetics:{battle:{rock:S.profile.cosmetics.battle,scissors:S.profile.cosmetics.battle,paper:S.profile.cosmetics.battle,amplify:S.profile.cosmetics.battle}}}));
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.type==="state"){S.net.state=msg.state;renderOnlineBattle()}else if(msg.type==="error"){document.querySelector("#onlineNotice").textContent=msg.message}};
  socket.onerror=()=>{const notice=document.querySelector("#onlineNotice");if(notice)notice.textContent="接続できませんでした。"};
}
function netSend(type,card){if(S.net?.socket?.readyState===WebSocket.OPEN)S.net.socket.send(JSON.stringify({type,card}))}
function renderOnlineBattle(){
  const n=S.net?.state;if(!n)return;S.view="online-battle";app.className="screen battle";app.style.backgroundImage=`linear-gradient(#0003,#0008),url("${A+"battle-bg-castle-tower-night.webp"}")`;
  const me=n.side==="p"?n.red:n.blue, foe=n.side==="p"?n.blue:n.red;
  const playerHand=n.phase==="pick"?n.hand.map(k=>card(k,"battle",`net-pick:${k}`)).join(""):"";
  const playerSpell=me.spell?card(me.spell,"spell",n.canUse?"net-use":""):`<div class="small">スペルなし</div>`;
  const enemyHand=Array.from({length:n.hand?.length||3},()=>`<div class="card-back"><img src="${A+"blue-battle-back.webp"}" alt="相手のバトルカード"></div>`).join("");
  const enemySpell=foe.hasSpell?`<div class="card-back"><img src="${A+"blue-spell-back.webp"}" alt="相手のスペルカード"></div>`:"";
  const played=n.battle?`<div class="played">${art(n.battle.a)}</div><span class="vs">VS</span><div class="played">${art(n.battle.b)}</div>`:`<span class="vs">VS</span>`;
  const primary=n.phase==="opening"&&!me.spell?button("始まりのスペルをドロー","net-draw","primary"):n.phase==="spell"&&!n.canOk?button("OK","net-ok","primary"):"";
  app.innerHTML=`${topbar()}<div class="battle-frame"><div class="battle-head"><span class="hp player">HP ${me.hp} / 10</span><span class="hp cpu">相手 HP ${foe.hp} / 10</span></div><div class="board"><section class="side player"><div class="zone-title">バトルカード</div><div class="hand">${playerHand}</div><div class="zone-title">スペルカード</div><div class="spell-row">${playerSpell}</div></section><section class="arena">${played}</section><section class="side cpu"><div class="zone-title">相手のバトルカード</div><div class="hand">${enemyHand}</div><div class="zone-title">相手のスペルカード</div><div class="spell-row">${enemySpell}</div></section><div class="battle-message">${esc(n.message)}</div></div><div class="battle-actions">${primary}${button("タイトルへ戻る","title","secondary")}</div></div>`;
}
app.addEventListener("click",event=>{
  const target=event.target.closest("[data-action]");if(!target)return;unlockAudio();const action=target.dataset.action;
  if(action==="press"){se("title-press-sfx.mp3");menu()}else if(action==="menu"){closeNet();menu()}else if(action==="title"){closeNet();title()}else if(action==="story"){storySelect()}else if(action.startsWith("chapter:")){startStory(Number(action.split(":")[1]))}else if(action==="cpu"){beginBattle({enemy:"CPU"})}else if(action==="next-story"){nextStory()}else if(action.startsWith("pick:")){pick(action.split(":")[1])}else if(action.startsWith("spell:")){castSpell(action.split(":")[1])}else if(action==="pass"){pass()}else if(action==="dress"){dress()}else if(action==="shop"){shop()}else if(action.startsWith("buy:")){buy(action.split(":")[1])}else if(action==="close-modal"){closeModal()}else if(action.startsWith("equip:")){equip(action.split(":")[1])}else if(action==="online"){online()}else if(action==="join-online"){joinOnline()}else if(action==="net-draw"){netSend("draw")}else if(action==="net-ok"){netSend("ok")}else if(action.startsWith("net-pick:")){netSend("pick",action.split(":")[1])}else if(action==="net-use"){netSend("use")}
});
new URLSearchParams(location.search).get("mode")==="online"?online():title();
