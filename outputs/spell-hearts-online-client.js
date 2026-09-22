/* Shared board client. Loaded by the polished solo board; active only with ?room=. */
(()=>{
  let socket=null, net=null, joining=false, chooser=false, localSet=false, remoteSet=false, heartbeat=null, ampArriving={p:false,c:false};
  const query=new URLSearchParams(location.search);
  const $=selector=>document.querySelector(selector);
  const sideSlot=w=>w==='p'?'#pBattle':'#cBattle';
  const spellSlot=w=>w==='p'?'#pSpell':'#cSpell';
  const charge=w=>w==='p'?'#pCharge':'#cCharge';
  const chargeSpell=w=>w==='p'?'#pChargeSpell':'#cChargeSpell';
  const grave=w=>w==='p'?'#pGrave':'#cGrave';
  const send=(type,card)=>socket?.readyState===1&&socket.send(JSON.stringify({type,card}));
  const back=(w,kind)=>`<img class="spell-back" src="${A+(w==='p'?(kind==='battle'?'red-battle-back.png':'red-spell-back.png'):(kind==='battle'?'blue-battle-back.jpg':'blue-spell-back.jpg'))}" alt="">`;
  const onlineStyle=document.createElement('style');
  onlineStyle.textContent='.online-battle-ready{animation:online-battle-flash .95s ease-in-out infinite!important}@keyframes online-battle-flash{0%,100%{filter:brightness(1);box-shadow:0 0 0 transparent}50%{filter:brightness(1.65);box-shadow:0 0 15px 4px rgba(255,224,113,.82)}}.online-battle-ready .ok-label{display:grid}.online-mode .arena{left:0;width:100%;display:block;pointer-events:none}.online-mode .played{position:absolute;top:15%;width:12%;height:76%}.online-mode .played.spell-display-top{z-index:20;overflow:visible}.online-mode #pPlayed{left:29%}.online-mode #cPlayed{right:29%}.online-mode .vs{left:50%;top:44%;transform:translate(-50%,-50%)}.online-spell-overlay{inset:auto!important;width:82%!important;height:82%!important;top:14%!important;z-index:10!important;filter:brightness(1.18);box-shadow:0 0 19px #e3adff}.online-spell-overlay.p-side{left:-18%!important}.online-spell-overlay.c-side{right:-18%!important}.spell-effect-backdrop{position:absolute;inset:0;z-index:8;background:rgba(0,0,0,.68);pointer-events:none;animation:spell-backdrop-in .22s ease-out both}.online-mode .spell-effect-message.p-side{color:#ff756f!important;text-shadow:0 0 8px #641411,0 0 20px #ff4e48!important}.online-mode .spell-effect-message.c-side{color:#70d8ff!important;text-shadow:0 0 8px #0b3862,0 0 20px #3aafff!important}@keyframes spell-backdrop-in{from{opacity:0}to{opacity:1}}';
  document.head.append(onlineStyle);

  function hand(){
    return `<div class="picks">${net.hand.map(k=>`<button class="pick" title="${cardTip(k)}" onclick="pick('${k}')">${img(cards[k].i)}</button>`).join('')}</div>`;
  }

  function showResult(){
    let result=$('#resultScreen');
    if(!result){ result=document.createElement('div'); result.id='resultScreen'; document.body.append(result); }
    if(net.phase==='end'){
      const red=net.red.hp>net.blue.hp, blue=net.blue.hp>net.red.hp;
      result.innerHTML=`<div class="result-stack"><div class="result-word ${red?'result-red':blue?'result-blue':'result-draw'}">${red?'RED WIN':blue?'BLUE WIN':'DRAW GAME'}</div><button class="result-retry" onclick="location.href=location.pathname">タイトルへ戻る</button></div>`;
      requestAnimationFrame(()=>result.classList.add('show'));
    }else{ result.classList.remove('show'); result.innerHTML=''; }
  }

  function runOnlineDamage(before,after){
    const damage=after.battle?.d||{p:0,c:0};
    const from={p:before.red.hp,c:before.blue.hp},to={p:after.red.hp,c:after.blue.hp};
    for(const w of ['p','c'])$('#'+w+'Hp').textContent=`HP ${from[w]} / 10`;
    const stage=$('.stage');
    if(damage.c)stage.insertAdjacentHTML('beforeend',effectMarkup('aura-to-c'));
    if(damage.p)stage.insertAdjacentHTML('beforeend',effectMarkup('aura-to-p'));
    setTimeout(()=>{
      let soundIndex=0;
      for(const w of ['p','c'])if(damage[w]){
        const hp=$('#'+w+'Hp'); hp.classList.remove('hp-hit'); void hp.offsetWidth; hp.classList.add('hp-hit');
        setTimeout(()=>hp.classList.remove('hp-hit'),440); playDamageSfx(80+soundIndex*110); soundIndex++;
      }
      const timer=setInterval(()=>{
        let done=true;
        for(const w of ['p','c'])if(from[w]!==to[w]){from[w]+=Math.sign(to[w]-from[w]);$('#'+w+'Hp').textContent=`HP ${from[w]} / 10`;done=false}
        if(done){clearInterval(timer);setTimeout(()=>$('.stage').querySelectorAll('.damage-aura').forEach(el=>el.remove()),180)}
      },120);
    },620);
  }

  function renderOnline(){
    if(!net)return;
    const me=net.side, state={p:net.red,c:net.blue}, battle=net.battle;
    for(const w of ['p','c']){
      const own=w===me, s=state[w], battleDeck=$(sideSlot(w));
      $('#'+w+'Hp').textContent=`HP ${s.hp} / 10`;
      const canPass=net.phase==='spell'&&own&&net.canOk;
      const keepingOpenHand=net.phase==='pick'&&own&&!net.picked&&chooser&&!!battleDeck.querySelector('.picks');
      if(!keepingOpenHand)battleDeck.innerHTML=net.phase==='pick'&&own?(net.picked?back(w,'battle'):(chooser?hand():back(w,'battle'))):back(w,'battle');
      if(canPass)battleDeck.insertAdjacentHTML('beforeend','<span class="ok-label">OK!</span>');
      battleDeck.classList.toggle('online-battle-ready',(net.phase==='pick'&&own&&!net.picked&&!chooser)||canPass);
      battleDeck.onclick=canPass?()=>confirmPlayerOk():(net.phase==='pick'&&own&&!net.picked&&!chooser?()=>openBattle():null);
      battleDeck.style.cursor=canPass||net.phase==='pick'&&own&&!net.picked&&!chooser?'pointer':'default';
      const spellDeck=$(spellSlot(w));
      spellDeck.innerHTML=s.deckCount?back(w,'spell'):'';
      spellDeck.classList.toggle('opening-spell-deck',net.phase==='opening'&&!s.hasSpell);
      spellDeck.onclick=net.phase==='opening'&&own&&!s.spell?()=>send('draw'):null;
      spellDeck.style.cursor=net.phase==='opening'&&own&&!s.spell?'pointer':'default';
      const amplifier=$(charge(w));
      amplifier.innerHTML=s.amp==='charged'?`<img src="${A+cards.amplify.i}" title="${cardTip('amplify')}" alt="アンプリファイア">`:'';
      const isOpeningAmplifier=net.phase==='reveal'&&(w==='p'?battle?.a:battle?.b)==='amplify';
      amplifier.classList.toggle('amp-arriving',!!ampArriving[w]||isOpeningAmplifier);
      const held=$(chargeSpell(w));
      held.innerHTML=s.hasSpell?(own?`<img src="${A+spells[s.spell].i}" title="${spellTip(s.spell,s.amp==='charged')}" alt="${spells[s.spell].n}">`:back(w,'spell')):'';
      held.classList.toggle('spell-ready',net.phase==='spell'&&own&&net.canUse);
      held.onclick=net.phase==='spell'&&own&&net.canUse?()=>send('use'):null;
      held.style.cursor=net.phase==='spell'&&own&&net.canUse?'pointer':'default';
      const graveCards=[...s.grave.map(k=>({image:spells[k].i,title:spells[k].n})),...(s.ampGrave?[{image:cards.amplify.i,title:'アンプリファイア'}]:[])];
      $(grave(w)).innerHTML=graveCards.map(card=>`<img src="${A+card.image}" title="${card.title}" alt="">`).join('');
    }
    $('#pPlayed').innerHTML=battle?(net.phase==='reveal'?back('p','battle'):img(cards[battle.a].i)):((localSet&&me==='p'||remoteSet&&me==='c')?back('p','battle'):'' );
    $('#cPlayed').innerHTML=battle?(net.phase==='reveal'?back('c','battle'):img(cards[battle.b].i)):((localSet&&me==='c'||remoteSet&&me==='p')?back('c','battle'):'' );
    let message=net.waiting?'対戦相手の入室を待っています。':net.message||'';
    if(net.phase==='pick')message=`ROUND ${net.round} ― <span class="battle-select-prompt">バトルカードを選択</span>`;
    $('#message').innerHTML=message;
    const own=state[me];
    $('#spellInfo').innerHTML=own.spell?`伏せスペル：<strong>${spells[own.spell].n}</strong> ― ${spells[own.spell][own.amp==='charged'?'x':'a']}`:'伏せスペルはありません';
    $('#actions').innerHTML='';
    showResult();
  }

  function holdOnlineSpell(center,source,side){
    const host=$(center); if(!host)return;
    const card=document.createElement('img');
    card.src=source; card.className=`spell-center-overlay online-spell-overlay ${side==='p'?'p-side':'c-side'}`;
    host.append(card); setTimeout(()=>card.remove(),1420);
  }

  function showOnlineSpellMessage(use){
    const stage=$('.stage');
    if(!stage.querySelector('.spell-effect-backdrop')){
      const backdrop=document.createElement('div');
      backdrop.className='spell-effect-backdrop';
      stage.append(backdrop);
    }
    const message=document.createElement('div');
    message.className=`spell-effect-message ${use.side==='p'?'p-side':'c-side'}`;
    message.textContent=spellResult(use.k,use.x);
    stage.append(message); setTimeout(()=>{
      message.remove();
      if(!stage.querySelector('.spell-effect-message'))stage.querySelector('.spell-effect-backdrop')?.remove();
    },3500);
  }

  function playOnlineSpell(use){
    const source=A+spells[use.k].i, center=use.side==='p'?'#pPlayed':'#cPlayed';
    const target=$(center);
    target?.classList.add('spell-display-top');
    setTimeout(()=>target?.classList.remove('spell-display-top'),3500);
    slideCard(chargeSpell(use.side),center,source); playCardFlip();
    setTimeout(()=>{holdOnlineSpell(center,source,use.side);showOnlineSpellMessage(use)},1240);
    setTimeout(()=>{slideCard(center,grave(use.side),source);playCardFlip()},2650);
  }

  function connect(code){
    if(joining)return;
    joining=true;
    document.body.classList.add('online-mode');
    socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
    socket.onopen=()=>{socket.send(JSON.stringify({type:'join',room:code}));heartbeat=setInterval(()=>send('ping'),10000)};
    socket.onmessage=event=>{
      let message; try{message=JSON.parse(event.data)}catch{return;}
      if(message.type==='error'){ $('#roomNote').textContent=message.message; joining=false; return; }
      if(message.type==='joined'){
        history.replaceState({},'',location.pathname+'?room='+encodeURIComponent(message.room));
        $('#titleScreen').classList.add('dismiss');
      }
      if(message.type==='state'){
        const previous=net, incoming=message.state;
        const ownKey=incoming.side==='p'?'red':'blue';
        const drew=previous&&!previous[ownKey].spell&&!!incoming[ownKey].spell;
        const opponentSet=previous&&previous.phase==='pick'&&incoming.phase==='pick'&&!previous.opponentPicked&&incoming.opponentPicked;
        const flipped=previous&&previous.phase==='reveal'&&incoming.phase==='spell';
        const previousUses=previous?.battle?.uses||{}, incomingUses=incoming.battle?.uses||{};
        const newSpellUses=['p','c'].map(side=>incomingUses[side]&&!previousUses[side]?{...incomingUses[side],side}:null).filter(Boolean);
        const damaged=previous&&previous.phase==='spell'&&incoming.phase==='damage';
        if(incoming.phase!=='pick'){chooser=false;localSet=false;remoteSet=false}
        if(opponentSet)remoteSet=true;
        const charging=flipped?['p','c'].filter(side=>(side==='p'?incoming.battle?.a:incoming.battle?.b)==='amplify'):[];
        if(flipped)for(const side of charging)ampArriving[side]=true;
        newSpellUses.forEach(playOnlineSpell);
        net=incoming;
        try{ renderOnline(); }
        catch(error){ $('#roomNote').textContent='対戦画面エラー：'+error.message; console.error(error); }
        if(drew){const held=$(chargeSpell(net.side));held?.classList.add('spell-draw');playCardFlip();setTimeout(()=>held?.classList.remove('spell-draw'),1100)}
        if(opponentSet){const opponent=net.side==='p'?'c':'p';slideCard(sideSlot(opponent),opponent==='p'?'#pPlayed':'#cPlayed',A+(opponent==='p'?'red-battle-back.png':'blue-battle-back.jpg'));playCardFlip()}
        if(flipped){playCardFlip();for(const id of ['#pPlayed','#cPlayed']){const card=$(id);card?.classList.add('battle-flip');setTimeout(()=>card?.classList.remove('battle-flip'),650)}setTimeout(()=>charging.forEach(side=>{slideCard(side==='p'?'#pPlayed':'#cPlayed',charge(side),A+cards.amplify.i);playCardFlip()}),650);setTimeout(()=>{for(const side of charging)ampArriving[side]=false;renderOnline()},1980)}
        newSpellUses.forEach(use=>{if(use.k==='pursuit')playPursuit();if(use.k==='block')playBlock();if(use.k==='scheme')playScheme()})
        if(damaged)runOnlineDamage(previous,incoming);
      }
    };
    socket.onclose=()=>{clearInterval(heartbeat);if(net&&net.phase!=='end')$('#message').textContent='接続が切れました。再読み込みして再入室してください。'; };
  }

  window.drawInitial=()=>send('draw');
  window.openBattle=()=>{if(net?.phase==='pick'&&!net.picked){chooser=true;playCardFlip();renderOnline();}};
  window.pick=card=>{if(net?.phase!=='pick'||net.picked)return;const mine=net.side;chooser=false;localSet=true;renderOnline();slideCard(sideSlot(mine),mine==='p'?'#pPlayed':'#cPlayed',A+(mine==='p'?'red-battle-back.png':'blue-battle-back.jpg'));playCardFlip();send('pick',card)};
  window.use=()=>send('use');
  window.confirmPlayerOk=()=>send('ok');
  window.endRound=()=>send('ok');
  window.beginOnlineMatch=code=>{
    if(location.protocol==='file:'){
      location.href='http://localhost:8787/?room='+encodeURIComponent(code);
      return;
    }
    connect(code);
  };
  if(query.get('room'))connect(query.get('room'));
})();
