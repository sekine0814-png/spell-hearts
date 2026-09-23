/* Shared board client. Loaded by the polished solo board; active only with ?room=. */
(()=>{
  let socket=null, net=null, joining=false, chooser=false, localSet=false, remoteSet=false, heartbeat=null, resultSoundPlayed=false, spellInTransit={p:false,c:false}, ampArriving={p:false,c:false}, battleArriving={p:false,c:false};
  const query=new URLSearchParams(location.search);
  const $=selector=>document.querySelector(selector);
  const sideSlot=w=>w==='p'?'#pBattle':'#cBattle';
  const spellSlot=w=>w==='p'?'#pSpell':'#cSpell';
  const charge=w=>w==='p'?'#pCharge':'#cCharge';
  const chargeSpell=w=>w==='p'?'#pChargeSpell':'#cChargeSpell';
  const grave=w=>w==='p'?'#pGrave':'#cGrave';
  const send=(type,card)=>socket?.readyState===1&&socket.send(JSON.stringify({type,card}));
  const back=(w,kind)=>`<img class="spell-back" src="${A+(w==='p'?(kind==='battle'?'red-battle-back.png':'red-spell-back.png'):(kind==='battle'?'blue-battle-back.jpg':'blue-spell-back.jpg'))}" alt="">`;
  const battleFace=(w,key)=>A+(window.getSpellHeartsBattleArt?.((w==='p'?net?.red:net?.blue)?.cosmetics,key)||cards[key].i);
  const onlineStyle=document.createElement('style');
  onlineStyle.textContent='.online-battle-ready{animation:online-battle-flash .95s ease-in-out infinite!important}@keyframes online-battle-flash{0%,100%{filter:brightness(1);box-shadow:0 0 0 transparent}50%{filter:brightness(1.65);box-shadow:0 0 15px 4px rgba(255,224,113,.82)}}.online-battle-ready .ok-label{display:grid}.online-mode .arena{left:0;width:100%;display:block;pointer-events:none}.online-mode .played{position:absolute;top:15%;width:12%;height:76%}.online-mode .played.flight-target{display:block!important;visibility:hidden}.online-mode .played.spell-display-top{z-index:20;overflow:visible}.online-mode #pPlayed{left:29%}.online-mode #cPlayed{right:29%}.online-mode .vs{left:50%;top:44%;transform:translate(-50%,-50%)}.online-spell-overlay{inset:auto!important;width:82%!important;height:82%!important;top:14%!important;z-index:10!important;filter:brightness(1.18);box-shadow:0 0 19px #e3adff}.online-spell-overlay.p-side{left:-18%!important}.online-spell-overlay.c-side{right:-18%!important}.spell-effect-backdrop{position:absolute;inset:0;z-index:8;background:rgba(0,0,0,.68);pointer-events:none;animation:spell-backdrop-in .22s ease-out both}.online-mode .spell-effect-message.p-side{color:#ff756f!important;text-shadow:0 0 8px #641411,0 0 20px #ff4e48!important}.online-mode .spell-effect-message.c-side{color:#70d8ff!important;text-shadow:0 0 8px #0b3862,0 0 20px #3aafff!important}@keyframes spell-backdrop-in{from{opacity:0}to{opacity:1}}';
  document.head.append(onlineStyle);
  onlineStyle.textContent+='.online-mode .faction{display:none}.online-nameplate{position:absolute;z-index:6;top:5.2%;max-width:20%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:bold clamp(11px,1.9vw,23px) Georgia,"Yu Mincho",serif;letter-spacing:.07em;-webkit-text-stroke:1px #10090d;paint-order:stroke fill;text-shadow:0 2px 6px #000}.online-nameplate.p-side{left:8%;color:#ff9b91}.online-nameplate.c-side{right:8%;color:#94dcff;text-align:right}';

  onlineStyle.textContent+='.online-nameplate{top:3.5%;min-width:15%;padding:3px 8px;border:1px solid rgba(225,184,77,.7);border-radius:3px;background:rgba(2,3,7,.86);box-shadow:0 2px 8px #000b;font-size:clamp(10px,1.45vw,18px);line-height:1.15}.online-nameplate.p-side{left:24%;text-align:center}.online-nameplate.c-side{right:24%;text-align:center}';

  function hand(){
    return `<div class="picks${net.hand.length===3?' three-picks':''}">${net.hand.map(k=>`<button class="pick" title="${cardTip(k)}" onclick="pick('${k}')">${img(battleFace(net.side,k))}</button>`).join('')}</div>`;
  }

  function showResult(){
    let result=$('#resultScreen');
    if(!result){ result=document.createElement('div'); result.id='resultScreen'; document.body.append(result); }
    if(net.phase==='end'){
      const red=net.red.hp>net.blue.hp, blue=net.blue.hp>net.red.hp;
      const winner=red?'p':blue?'c':null;
      const reward=winner===net.side?2:1;
      const rematchLabel=net.rematchReady?'相手の返答を待っています…':'もう一度対戦';
      result.innerHTML=`<div class="result-stack"><div class="result-word ${red?'result-red':blue?'result-blue':'result-draw'}">${red?'RED WIN':blue?'BLUE WIN':'DRAW GAME'}</div><div class="result-token-reward"><img class="token-coin" src="assets/spell-hearts-token.png" alt="金貨"><span>+${reward}</span></div><div class="result-actions"><button class="result-retry" onclick="requestRematch()" ${net.rematchReady?'disabled':''}>${rematchLabel}</button><button class="result-retry" onclick="returnToTitle()">タイトルへ戻る</button></div></div>`;
      if(!resultSoundPlayed){resultSoundPlayed=true;window.playWinFanfare?.();}
      requestAnimationFrame(()=>result.classList.add('show'));
    }else{ resultSoundPlayed=false; result.classList.remove('show'); result.innerHTML=''; }
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
    const stage=$('.stage');
    for(const w of ['p','c']){
      let plate=$(`#${w}Nameplate`);
      if(!plate){plate=document.createElement('div');plate.id=`${w}Nameplate`;plate.className=`online-nameplate ${w==='p'?'p':'c'}-side`;stage?.append(plate);}
      plate.textContent=state[w].nickname||`ゲスト${w==='p'?'RED':'BLUE'}`;
    }
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
      spellDeck.classList.toggle('opening-spell-deck',net.phase==='opening'&&own&&!s.hasSpell);
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
      const visibleSpells=spellInTransit[w]?s.grave.slice(0,-1):s.grave;
      const graveCards=[...visibleSpells.map(k=>({image:spells[k].i,title:spells[k].n})),...(s.ampGrave?[{image:cards.amplify.i,title:'アンプリファイア'}]:[])];
      $(grave(w)).innerHTML=graveCards.map(card=>`<img src="${A+card.image}" title="${card.title}" alt="">`).join('');
    }
    const pShown=battle&&!battleArriving.p, cShown=battle&&!battleArriving.c;
    $('#pPlayed').innerHTML=pShown?(net.phase==='reveal'?back('p','battle'):img(battleFace('p',battle.a))):((!battleArriving.p&&(localSet&&me==='p'||remoteSet&&me==='c'))?back('p','battle'):'' );
    $('#cPlayed').innerHTML=cShown?(net.phase==='reveal'?back('c','battle'):img(battleFace('c',battle.b))):((!battleArriving.c&&(localSet&&me==='c'||remoteSet&&me==='p'))?back('c','battle'):'' );
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
    const [headline,...detail]=spellResult(use.k,use.x).split('\n');
    message.innerHTML=`<strong>${headline}</strong><span>${detail.join(' ')}</span>`;
    stage.append(message); setTimeout(()=>{
      message.remove();
      if(!stage.querySelector('.spell-effect-message'))stage.querySelector('.spell-effect-backdrop')?.remove();
    },3500);
  }

  function playOnlineSpell(use){
    const source=A+spells[use.k].i, center=use.side==='p'?'#pPlayed':'#cPlayed';
    spellInTransit[use.side]=true;
    const target=$(center);
    target?.classList.add('spell-display-top');
    setTimeout(()=>target?.classList.remove('spell-display-top'),3500);
    slideCard(chargeSpell(use.side),center,source); playCardFlip();
    setTimeout(()=>{holdOnlineSpell(center,source,use.side);showOnlineSpellMessage(use)},1240);
    setTimeout(()=>{slideCard(center,grave(use.side),source);playCardFlip()},2650);
    setTimeout(()=>{spellInTransit[use.side]=false;renderOnline()},4000);
  }

  function connect(code){
    if(joining)return;
    joining=true;
    document.body.classList.add('online-mode');
    socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
    socket.onopen=()=>{socket.send(JSON.stringify({type:'join',room:code,nickname:window.getSpellHeartsNickname?.(),cosmetics:window.getSpellHeartsCosmetics?.()}));heartbeat=setInterval(()=>send('ping'),10000)};
    socket.onmessage=event=>{
      let message; try{message=JSON.parse(event.data)}catch{return;}
      if(message.type==='error'){ $('#roomNote').textContent=message.message; joining=false; return; }
      if(message.type==='joined'){
        history.replaceState({},'',location.pathname+'?room='+encodeURIComponent(message.room));
        $('#titleScreen').classList.add('dismiss');
      }
      if(message.type==='state'){
        const previous=net, incoming=message.state;
        const gameEnded=previous&&previous.phase!=='end'&&incoming.phase==='end';
        const ownKey=incoming.side==='p'?'red':'blue';
        const drew=previous&&!previous[ownKey].spell&&!!incoming[ownKey].spell;
        const opponentSet=previous&&previous.phase==='pick'&&!previous.opponentPicked&&incoming.opponentPicked;
        const flipped=previous&&previous.phase==='reveal'&&incoming.phase==='spell';
        const previousUses=previous?.battle?.uses||{}, incomingUses=incoming.battle?.uses||{};
        const newSpellUses=['p','c'].map(side=>incomingUses[side]&&!previousUses[side]?{...incomingUses[side],side}:null).filter(Boolean);
        const damaged=previous&&previous.phase==='spell'&&incoming.phase==='damage';
        if(incoming.phase!=='pick'){chooser=false;localSet=false;remoteSet=false}
        if(incoming.phase==='opening')spellInTransit={p:false,c:false};
        if(opponentSet){const opponent=incoming.side==='p'?'c':'p';battleArriving[opponent]=true;$(opponent==='p'?'#pPlayed':'#cPlayed')?.classList.add('flight-target');}
        const charging=flipped?['p','c'].filter(side=>(side==='p'?incoming.battle?.a:incoming.battle?.b)==='amplify'):[];
        if(flipped)for(const side of charging)ampArriving[side]=true;
        newSpellUses.forEach(playOnlineSpell);
        net=incoming;
        try{ renderOnline(); }
        catch(error){ $('#roomNote').textContent='対戦画面エラー：'+error.message; console.error(error); }
        if(drew){const held=$(chargeSpell(net.side));held?.classList.add('spell-draw');playCardFlip();setTimeout(()=>held?.classList.remove('spell-draw'),1100)}
        if(opponentSet){const opponent=net.side==='p'?'c':'p',target=$(opponent==='p'?'#pPlayed':'#cPlayed');slideCard(sideSlot(opponent),opponent==='p'?'#pPlayed':'#cPlayed',A+(opponent==='p'?'red-battle-back.png':'blue-battle-back.jpg'));playCardFlip();setTimeout(()=>{target?.classList.remove('flight-target');battleArriving[opponent]=false;remoteSet=true;renderOnline()},1320)}
        if(flipped){playCardFlip();for(const id of ['#pPlayed','#cPlayed']){const card=$(id);card?.classList.add('battle-flip');setTimeout(()=>card?.classList.remove('battle-flip'),650)}setTimeout(()=>charging.forEach(side=>{slideCard(side==='p'?'#pPlayed':'#cPlayed',charge(side),A+cards.amplify.i);playCardFlip()}),650);setTimeout(()=>{for(const side of charging)ampArriving[side]=false;renderOnline()},1980)}
        newSpellUses.forEach(use=>{if(use.k==='pursuit')playPursuit();if(use.k==='block')playBlock();if(use.k==='scheme')playScheme()})
        if(damaged)runOnlineDamage(previous,incoming);
        if(gameEnded){
          const winner=incoming.red.hp===incoming.blue.hp?null:(incoming.red.hp>incoming.blue.hp?'p':'c');
          window.recordSpellHeartsResult?.(winner===null?'draw':winner===incoming.side?'win':'loss',incoming.matchId);
          window.awardSpellHeartsTokens?.(winner===incoming.side?2:1,incoming.matchId);
        }
      }
    };
    socket.onclose=()=>{clearInterval(heartbeat);if(net&&net.phase!=='end')$('#message').textContent='接続が切れました。再読み込みして再入室してください。'; };
  }

  let controlsActive=false;
  function activateOnlineControls(){
    if(controlsActive)return;
    controlsActive=true;
    window.drawInitial=()=>send('draw');
    window.openBattle=()=>{if(net?.phase==='pick'&&!net.picked){chooser=true;playCardFlip();renderOnline();}};
    window.pick=card=>{if(net?.phase!=='pick'||net.picked)return;const mine=net.side,target=$(mine==='p'?'#pPlayed':'#cPlayed');chooser=false;battleArriving[mine]=true;target?.classList.add('flight-target');renderOnline();slideCard(sideSlot(mine),mine==='p'?'#pPlayed':'#cPlayed',A+(mine==='p'?'red-battle-back.png':'blue-battle-back.jpg'));playCardFlip();send('pick',card);setTimeout(()=>{target?.classList.remove('flight-target');battleArriving[mine]=false;localSet=true;renderOnline()},1320)};
    window.use=()=>send('use');
    window.confirmPlayerOk=()=>send('ok');
    window.endRound=()=>send('ok');
    window.requestRematch=()=>{if(net?.phase==='end'&&!net.rematchReady)send('rematch')};
  }
  window.beginOnlineMatch=code=>{
    if(location.protocol==='file:'){
      location.href='http://localhost:8787/?room='+encodeURIComponent(code);
      return;
    }
    activateOnlineControls();
    connect(code);
  };
  if(query.get('room')){activateOnlineControls();connect(query.get('room'));}
  window.addEventListener('spellhearts-cosmeticschange',event=>send('cosmetics',event.detail));
})();
