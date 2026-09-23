import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged,
  signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  linkWithCredential, EmailAuthProvider, signOut, sendPasswordResetEmail, updateProfile,
  GoogleAuthProvider, signInWithPopup, linkWithPopup
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, doc, getDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig={
  apiKey:'AIzaSyCP3E5ojlmFo9cp0sT4GY_MN81bMV4eSSc',
  authDomain:'spellhearts-3579a.firebaseapp.com',
  projectId:'spellhearts-3579a',
  storageBucket:'spellhearts-3579a.firebasestorage.app',
  messagingSenderId:'652447743725',
  appId:'1:652447743725:web:bd8066c0f16d3554d756e4',
  measurementId:'G-XH0X45FXF8'
};

const firebaseApp=initializeApp(firebaseConfig);
const auth=getAuth(firebaseApp);
const db=getFirestore(firebaseApp);
let currentUser=null;
let modal=null;
const gameOwnerEmail='sekine0814@gmail.com';

setPersistence(auth,browserLocalPersistence).catch(()=>{});

function authMessage(error){
  const messages={
    'auth/invalid-email':'メールアドレスの形式を確認してください。',
    'auth/missing-password':'パスワードを入力してください。',
    'auth/weak-password':'パスワードは6文字以上にしてください。',
    'auth/email-already-in-use':'このメールアドレスはすでに使われています。',
    'auth/invalid-credential':'メールアドレスまたはパスワードが違います。',
    'auth/too-many-requests':'しばらく待ってから、もう一度試してください。',
    'auth/network-request-failed':'通信に失敗しました。接続を確認してください。',
    'auth/operation-not-allowed':'このログイン方法はまだ有効になっていません。',
    'auth/unauthorized-domain':'この公開サイトをFirebaseの許可済みドメインへ追加してください。',
    'auth/credential-already-in-use':'このメールアドレスは別のアカウントで使われています。'
  };
  return messages[error?.code]||'ログインに失敗しました。もう一度試してください。';
}

function updateLoginButton(){
  const button=document.querySelector('.title-login');
  if(!button)return;
  if(!currentUser||currentUser.isAnonymous){button.textContent='ログイン';return;}
  button.textContent=currentUser.displayName||'冒険者';
  button.title='アカウント設定・ログアウト';
}

function tokenKey(){return `spellHeartsTokens:${currentUser?.uid||'guest'}`;}
function readTokens(){return Math.max(0,Number.parseInt(localStorage.getItem(tokenKey())||'0',10)||0);}
function isGameOwner(){return currentUser?.email?.toLowerCase()===gameOwnerEmail;}
function displayedTokens(){return isGameOwner()?'∞':readTokens();}
function shardKey(){return `spellHeartsStardust:${currentUser?.uid||'guest'}`;}
function readStardust(){return Math.max(0,Number.parseInt(localStorage.getItem(shardKey())||'0',10)||0);}
const battleArt={rock:'rock.jpg',scissors:'scissors.jpg',paper:'paper.jpg'};
const astrologianArt={rock:'astrologian-rock.png',scissors:'astrologian-scissors.png',paper:'astrologian-paper.png'};
function defaultCosmetics(){return {owned:{battle:{astrologian:{}}},equipped:{battle:{rock:'normal',scissors:'normal',paper:'normal'},battleShrink:'normal',spellShrink:'normal'}};}
function normalizeCosmetics(value){
  const base=defaultCosmetics(),source=value&&typeof value==='object'?value:{},owned=source.owned?.battle?.astrologian||{},equipped=source.equipped||{};
  for(const card of Object.keys(battleArt)){
    if(owned[card]===true)base.owned.battle.astrologian[card]=true;
    if(equipped.battle?.[card]==='astrologian'&&base.owned.battle.astrologian[card])base.equipped.battle[card]='astrologian';
  }
  return base;
}
function cosmeticsKey(){return `spellHeartsCosmetics:${currentUser?.uid||'guest'}`;}
function readLocalCosmetics(){try{return normalizeCosmetics(JSON.parse(localStorage.getItem(cosmeticsKey())||'{}'));}catch{return defaultCosmetics();}}
let cosmeticProfile=readLocalCosmetics();
function writeLocalCosmetics(){localStorage.setItem(cosmeticsKey(),JSON.stringify(cosmeticProfile));}
function publicCosmetics(){return {battle:{...cosmeticProfile.equipped.battle},battleShrink:cosmeticProfile.equipped.battleShrink,spellShrink:cosmeticProfile.equipped.spellShrink};}
function battleArtFor(cosmetics,card){return cosmetics?.battle?.[card]==='astrologian'&&astrologianArt[card]?astrologianArt[card]:battleArt[card]||'';}
function announceCosmetics(){window.dispatchEvent(new CustomEvent('spellhearts-cosmeticschange',{detail:publicCosmetics()}));}
async function loadAccountCosmetics(){
  cosmeticProfile=readLocalCosmetics();
  if(currentUser&&!currentUser.isAnonymous){
    try{const snapshot=await getDoc(doc(db,'profiles',currentUser.uid));if(snapshot.exists())cosmeticProfile=normalizeCosmetics(snapshot.data().cosmetics);writeLocalCosmetics();}
    catch(error){console.warn('Cosmetics sync failed',error);}
  }
  announceCosmetics();
}
async function saveCosmetics(){
  writeLocalCosmetics();announceCosmetics();
  if(!currentUser||currentUser.isAnonymous)return false;
  try{await runTransaction(db,async transaction=>{transaction.set(doc(db,'profiles',currentUser.uid),{cosmetics:cosmeticProfile,updatedAt:Date.now()},{merge:true});});return true;}
  catch(error){console.warn('Cosmetics save failed',error);return false;}
}
function ownsAstrologian(card){return cosmeticProfile.owned.battle.astrologian[card]===true;}
function grantAstrologian(card){if(!astrologianArt[card])return;cosmeticProfile.owned.battle.astrologian[card]=true;void saveCosmetics();}
function equipCosmetic(category,series,item){
  if(category==='バトルカード')cosmeticProfile.equipped.battle[item.key]=series;
  else if(category==='バトルカードシュリンク')cosmeticProfile.equipped.battleShrink=series;
  else if(category==='スペルカードシュリンク')cosmeticProfile.equipped.spellShrink=series;
  void saveCosmetics();
}
window.getSpellHeartsCosmetics=()=>publicCosmetics();
window.getSpellHeartsBattleArt=(cosmetics,card)=>battleArtFor(cosmetics,card);
let titleBgmStarted=false,titleBgmFadeFrame=0;
function titleBgmLevel(){return Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsBgmVolume')??28)/100));}
function ensureTitleBgm(){
  let music=document.querySelector('#titleBgm');
  if(music)return music;
  music=document.createElement('audio');music.id='titleBgm';music.src='assets/title-old-growth-forest.mp3';music.loop=true;music.preload='auto';music.volume=0;
  document.body.append(music);return music;
}
function stopTitleBgm(){
  cancelAnimationFrame(titleBgmFadeFrame);titleBgmFadeFrame=0;titleBgmStarted=false;
  const music=document.querySelector('#titleBgm');
  if(music){music.pause();music.currentTime=0;music.volume=0;music.dataset.fading='';}
}
function startTitleBgm(){
  const title=document.querySelector('#titleScreen'),music=ensureTitleBgm();
  if(titleBgmStarted||title?.classList.contains('dismiss'))return;
  titleBgmStarted=true;music.volume=0;music.dataset.fading='1';
  music.play().then(()=>{
    const began=performance.now(),duration=1400;
    const fade=now=>{const progress=Math.min(1,(now-began)/duration);music.volume=titleBgmLevel()*progress;if(progress<1&&titleBgmStarted)titleBgmFadeFrame=requestAnimationFrame(fade);else music.dataset.fading='';};
    titleBgmFadeFrame=requestAnimationFrame(fade);
  }).catch(()=>{titleBgmStarted=false;music.dataset.fading='';});
}
function installTitleBgm(){
  ensureTitleBgm();
  const originalStartBgm=window.startBgm,originalRestartFromTitle=window.restartFromTitle,originalReturnToTitle=window.returnToTitle;
  if(typeof originalStartBgm==='function')window.startBgm=()=>{stopTitleBgm();return originalStartBgm();};
  if(typeof originalRestartFromTitle==='function')window.restartFromTitle=()=>{const result=originalRestartFromTitle();startTitleBgm();return result;};
  if(typeof originalReturnToTitle==='function')window.returnToTitle=()=>{stopTitleBgm();return originalReturnToTitle();};
  document.addEventListener('pointerdown',startTitleBgm,{once:true,capture:true});
  document.addEventListener('keydown',startTitleBgm,{once:true,capture:true});
  startTitleBgm();
}
function renderTokenBalance(){
  const count=document.querySelector('#tokenBalance .token-count');
  if(count)count.textContent=displayedTokens();
}
function makeTokenBalance(){
  const title=document.querySelector('#titleScreen');
  if(!title||document.querySelector('#tokenBalance'))return;
  const balance=document.createElement('div');
  balance.id='tokenBalance';balance.className='token-balance';balance.title='所持トークン';
  balance.innerHTML='<img class="token-coin" src="assets/spell-hearts-token.png" alt="金貨"><span class="token-count">0</span>';
  title.append(balance);renderTokenBalance();
}
function openSummonGate(){
  let modal=document.querySelector('#summonGatePanel');
  if(!modal){
    modal=document.createElement('section');modal.id='summonGatePanel';modal.className='summon-gate-panel';
    modal.innerHTML='<div class="summon-gate-book" role="dialog" aria-modal="true" aria-labelledby="summonGateTitle"><button class="summon-gate-close" type="button" aria-label="閉じる">×</button><div class="summon-gate-sigil">✦</div><p class="summon-gate-kicker">ARCANE GACHA</p><h2 id="summonGateTitle">召喚の門</h2><div class="summon-stock"><div><span>所持金貨</span><b class="summon-token-total">0</b></div><div><span>星のカケラ</span><b class="summon-shard-total">0</b></div></div><button class="summon-cast" type="button">ガチャを引く<small>金貨 10枚</small></button><p class="summon-gate-note">星のカケラを10個集めると、景品と交換できます。</p><button class="summon-exchange" type="button">アイテムと交換する</button><button class="summon-gate-dismiss" type="button">戻る</button></div>';
    document.body.append(modal);
    modal.querySelector('.summon-gate-close').onclick=()=>modal.hidden=true;
    modal.querySelector('.summon-gate-dismiss').onclick=()=>modal.hidden=true;
    modal.querySelector('.summon-cast').onclick=openSummonConfirm;
    modal.querySelector('.summon-exchange').onclick=openItemExchange;
    modal.onclick=event=>{if(event.target===modal)modal.hidden=true;};
  }
  renderSummonStock();
  modal.hidden=false;
}
const astrologianItems=[
  {key:'rock',name:'グー',image:'assets/astrologian-rock.png'},
  {key:'scissors',name:'チョキ',image:'assets/astrologian-scissors.png'},
  {key:'paper',name:'パー',image:'assets/astrologian-paper.png'}
];
function showAstrologianCollection(hall){
  const content=hall.querySelector('.item-exchange-detail-content');
  content.innerHTML='<button class="astrologian-feature" type="button"><img src="assets/astrologian-rock.png" alt="astrologian グー"><span>astrologian</span></button>';
  content.querySelector('.astrologian-feature').onclick=()=>{
    content.innerHTML='<h3>astrologian</h3><p>交換したいバトルカードを選んでください</p><div class="astrologian-items">'+astrologianItems.map(item=>`<button type="button" data-astrologian-item="${item.name}"><img src="${item.image}" alt="astrologian ${item.name}"><span>${item.name}</span></button>`).join('')+'</div>';
    content.querySelectorAll('[data-astrologian-item]').forEach(button=>button.onclick=()=>{
      const item=astrologianItems.find(entry=>entry.name===button.dataset.astrologianItem);
      if(item)openAstrologianConfirm(item);
    });
  };
}
function playExchangeAnimation(dialog,item,onComplete){
  const sparks=Array.from({length:12},(_,index)=>`<img class="exchange-spark exchange-spark-${index}" src="assets/spell-hearts-star-fragment.png" alt="">`).join('');
  dialog.innerHTML=`<div class="exchange-animation-box" aria-label="交換中"><div class="exchange-magic-ring"></div>${sparks}<img class="exchange-core-shard" src="assets/spell-hearts-star-fragment.png" alt="星のカケラ"><img class="exchange-reward-card" src="${item.image}" alt="astrologian ${item.name}"><p>星のカケラが光をまとっていく……</p></div>`;
  dialog.classList.add('exchange-animating');
  setTimeout(()=>{
    dialog.classList.remove('exchange-animating');
    onComplete();
  },2200);
}
function openAstrologianConfirm(item){
  let dialog=document.querySelector('#itemExchangeConfirm');
  if(!dialog){dialog=document.createElement('section');dialog.id='itemExchangeConfirm';dialog.className='item-exchange-confirm';document.body.append(dialog);}
  const close=()=>dialog.hidden=true;
  dialog.innerHTML=`<div class="item-exchange-confirm-box"><img src="${item.image}" alt="astrologian ${item.name}"><p>星のカケラ10個で<br>astrologian ${item.name}を交換しますか？</p><div><button type="button" class="exchange-confirm-yes">はい</button><button type="button" class="exchange-confirm-no">いいえ</button></div></div>`;
  dialog.hidden=false;
  dialog.onclick=event=>{if(event.target===dialog)close();};
  dialog.querySelector('.exchange-confirm-no').onclick=close;
  dialog.querySelector('.exchange-confirm-yes').onclick=()=>{
    if(readStardust()<10){dialog.querySelector('.item-exchange-confirm-box').innerHTML='<p>星のカケラが足りません。</p><button type="button" class="exchange-confirm-no">戻る</button>';dialog.querySelector('.exchange-confirm-no').onclick=close;return;}
    localStorage.setItem(shardKey(),String(readStardust()-10));renderSummonStock();
    grantAstrologian(item.key);
    playExchangeAnimation(dialog,item,()=>{
      dialog.innerHTML=`<div class="item-exchange-confirm-box"><img src="${item.image}" alt="astrologian ${item.name}"><p>astrologian ${item.name}を交換しました！</p><button type="button" class="exchange-confirm-no">閉じる</button></div>`;
      dialog.querySelector('.exchange-confirm-no').onclick=close;
    });
  };
}
const normalDressupItems={
  'バトルカード':[
    {key:'rock',name:'グー',image:'assets/rock.jpg'},
    {key:'scissors',name:'チョキ',image:'assets/scissors.jpg'},
    {key:'paper',name:'パー',image:'assets/paper.jpg'}
  ],
  'バトルカードシュリンク':[{name:'ノーマル',image:'assets/red-battle-back.png'}],
  'スペルカードシュリンク':[{name:'ノーマル',image:'assets/blue-spell-back.jpg'}]
};
function dressupItems(category,series){
  if(series==='normal')return normalDressupItems[category]||[];
  if(category==='バトルカード'&&series==='astrologian')return astrologianItems.filter(item=>ownsAstrologian(item.key));
  return [];
}
function showDressupOwnedItems(hall,category,series){
  const content=hall.querySelector('.item-exchange-detail-content'),items=dressupItems(category,series),seriesName=series==='normal'?'ノーマルシリーズ':'astrologian';
  content.innerHTML=`<h3>${seriesName}</h3><p>所持しているアイテム</p><div class="dressup-owned-items">${items.map(item=>`<button type="button" data-dressup-item="${item.name}"><img src="${item.image}" alt="${category} ${item.name}"><span>${item.name}</span></button>`).join('')}</div>`;
  content.querySelectorAll('[data-dressup-item]').forEach(button=>button.onclick=()=>{
    const item=items.find(entry=>entry.name===button.dataset.dressupItem);
    if(item)openDressupConfirm(category,series,item);
  });
}
function showDressupSeries(hall,category){
  const content=hall.querySelector('.item-exchange-detail-content'),normal=(normalDressupItems[category]||[])[0],series=[{key:'normal',name:'ノーマルシリーズ',image:normal.image}];
  if(category==='バトルカード'&&Object.keys(cosmeticProfile.owned.battle.astrologian).length)series.push({key:'astrologian',name:'astrologian',image:'assets/astrologian-rock.png'});
  content.innerHTML=`<p>シリーズを選んでください</p><div class="dressup-series-list">${series.map(entry=>`<button class="dressup-series" type="button" data-dressup-series="${entry.key}"><img src="${entry.image}" alt="${entry.name}"><span>${entry.name}</span><small>所持済み</small></button>`).join('')}</div>`;
  content.querySelectorAll('[data-dressup-series]').forEach(button=>button.onclick=()=>showDressupOwnedItems(hall,category,button.dataset.dressupSeries));
}
function openDressupConfirm(category,series,item){
  let dialog=document.querySelector('#dressupConfirm');
  if(!dialog){dialog=document.createElement('section');dialog.id='dressupConfirm';dialog.className='item-exchange-confirm';document.body.append(dialog);}
  const close=()=>dialog.hidden=true;
  if(!currentUser||currentUser.isAnonymous){
    dialog.innerHTML='<div class="item-exchange-confirm-box"><p>着せ替えを保存するにはログインが必要です。</p><button type="button" class="exchange-confirm-no">閉じる</button></div>';
    dialog.hidden=false;dialog.onclick=event=>{if(event.target===dialog)close();};dialog.querySelector('.exchange-confirm-no').onclick=close;return;
  }
  dialog.innerHTML=`<div class="item-exchange-confirm-box"><img src="${item.image}" alt="${category} ${item.name}"><p>${category}「${item.name}」を着せ替えますか？</p><div><button type="button" class="dressup-confirm-yes">はい</button><button type="button" class="exchange-confirm-no">いいえ</button></div></div>`;
  dialog.hidden=false;
  dialog.onclick=event=>{if(event.target===dialog)close();};
  dialog.querySelector('.exchange-confirm-no').onclick=close;
  dialog.querySelector('.dressup-confirm-yes').onclick=()=>{
    equipCosmetic(category,series,item);
    dialog.querySelector('.item-exchange-confirm-box').innerHTML=`<img src="${item.image}" alt="${category} ${item.name}"><p>${category}「${item.name}」を着せ替えました！</p><button type="button" class="exchange-confirm-no">閉じる</button>`;
    dialog.querySelector('.exchange-confirm-no').onclick=close;
  };
}
function openDressupMenu(){
  let hall=document.querySelector('#dressupPanel');
  if(!hall){
    hall=document.createElement('section');hall.id='dressupPanel';hall.className='item-exchange-panel dressup-panel';
    hall.innerHTML='<div class="item-exchange-book" role="dialog" aria-modal="true" aria-labelledby="dressupTitle"><button class="item-exchange-close" type="button" aria-label="閉じる">×</button><p class="item-exchange-kicker">WARDROBE</p><h2 id="dressupTitle">着せ替え</h2><p class="item-exchange-copy">着せ替えたいカードの種類を選んでください</p><div class="item-exchange-categories"><button type="button" data-dressup-category="バトルカード"><img src="assets/rock.jpg" alt="バトルカード"><span>バトルカード</span></button><button type="button" data-dressup-category="バトルカードシュリンク"><img src="assets/red-battle-back.png" alt="バトルカードシュリンク"><span>バトルカード<br>シュリンク</span></button><button type="button" data-dressup-category="スペルカードシュリンク"><img src="assets/blue-spell-back.jpg" alt="スペルカードシュリンク"><span>スペルカード<br>シュリンク</span></button></div><div class="item-exchange-detail" hidden><button class="item-exchange-detail-back" type="button">← カードの種類を選ぶ</button><div class="item-exchange-detail-content"></div></div><button class="item-exchange-return" type="button">戻る</button></div>';
    document.body.append(hall);
    hall.querySelector('.item-exchange-close').onclick=()=>hall.hidden=true;
    hall.querySelector('.item-exchange-return').onclick=()=>hall.hidden=true;
    hall.querySelector('.item-exchange-detail-back').onclick=()=>{
      hall.querySelector('.item-exchange-detail').hidden=true;
      hall.querySelector('.item-exchange-categories').hidden=false;
      hall.querySelector('.item-exchange-copy').hidden=false;
    };
    hall.querySelectorAll('[data-dressup-category]').forEach(button=>button.onclick=()=>{
      const category=button.dataset.dressupCategory;
      hall.querySelector('.item-exchange-categories').hidden=true;
      hall.querySelector('.item-exchange-copy').hidden=true;
      showDressupSeries(hall,category);
      hall.querySelector('.item-exchange-detail').hidden=false;
    });
    hall.onclick=event=>{if(event.target===hall)hall.hidden=true;};
  }
  hall.querySelector('.item-exchange-detail').hidden=true;
  hall.querySelector('.item-exchange-categories').hidden=false;
  hall.querySelector('.item-exchange-copy').hidden=false;
  hall.hidden=false;
}
function openItemExchange(){
  const summonPanel=document.querySelector('#summonGatePanel');
  if(summonPanel)summonPanel.hidden=true;
  let hall=document.querySelector('#itemExchangePanel');
  if(!hall){
    hall=document.createElement('section');hall.id='itemExchangePanel';hall.className='item-exchange-panel';
    hall.innerHTML='<div class="item-exchange-book" role="dialog" aria-modal="true" aria-labelledby="itemExchangeTitle"><button class="item-exchange-close" type="button" aria-label="閉じる">×</button><p class="item-exchange-kicker">ARCANE EXCHANGE</p><h2 id="itemExchangeTitle">アイテム交換所</h2><p class="item-exchange-copy">交換したいカードの種類を選んでください</p><div class="item-exchange-categories"><button type="button" data-exchange-category="バトルカード"><img src="assets/rock.jpg" alt="バトルカード"><span>バトルカード</span></button><button type="button" data-exchange-category="バトルカードシュリンク"><img src="assets/red-battle-back.png" alt="バトルカードシュリンク"><span>バトルカード<br>シュリンク</span></button><button type="button" data-exchange-category="スペルカードシュリンク"><img src="assets/blue-spell-back.jpg" alt="スペルカードシュリンク"><span>スペルカード<br>シュリンク</span></button></div><div class="item-exchange-detail" hidden><button class="item-exchange-detail-back" type="button">← カードの種類を選ぶ</button><div class="item-exchange-detail-content"></div></div><button class="item-exchange-return" type="button">召喚の門へ戻る</button></div>';
    document.body.append(hall);
    hall.querySelector('.item-exchange-close').onclick=()=>hall.hidden=true;
    hall.querySelector('.item-exchange-return').onclick=()=>{hall.hidden=true;openSummonGate();};
    hall.querySelector('.item-exchange-detail-back').onclick=()=>{
      hall.querySelector('.item-exchange-detail').hidden=true;
      hall.querySelector('.item-exchange-categories').hidden=false;
      hall.querySelector('.item-exchange-copy').hidden=false;
    };
    hall.querySelectorAll('[data-exchange-category]').forEach(button=>button.onclick=()=>{
      const name=button.dataset.exchangeCategory;
      hall.querySelector('.item-exchange-categories').hidden=true;
      hall.querySelector('.item-exchange-copy').hidden=true;
      if(name==='バトルカード')showAstrologianCollection(hall);
      else hall.querySelector('.item-exchange-detail-content').innerHTML=`<h3>${name}</h3><p>このカードの着せ替えアイテムを表示します。</p><div class="item-exchange-empty">交換できるアイテムを準備中です</div>`;
      hall.querySelector('.item-exchange-detail').hidden=false;
    });
    hall.onclick=event=>{if(event.target===hall)hall.hidden=true;};
  }
  hall.querySelector('.item-exchange-detail').hidden=true;
  hall.querySelector('.item-exchange-categories').hidden=false;
  hall.querySelector('.item-exchange-copy').hidden=false;
  hall.hidden=false;
}
function renderSummonStock(){
  document.querySelectorAll('.summon-token-total').forEach(node=>node.textContent=displayedTokens());
  document.querySelectorAll('.summon-shard-total').forEach(node=>node.textContent=readStardust());
}
function openSummonConfirm(){
  const guest=!currentUser||currentUser.isAnonymous;
  let dialog=document.querySelector('#summonConfirm');
  if(!dialog){
    dialog=document.createElement('section');dialog.id='summonConfirm';dialog.className='summon-confirm';
    document.body.append(dialog);
  }
  dialog.innerHTML=guest
    ?'<div class="summon-confirm-box"><p>召喚にはログインが必要です。</p><button type="button" class="summon-confirm-no">閉じる</button></div>'
    :'<div class="summon-confirm-box"><p>金貨10枚を消費して<br>ガチャを引きますか？</p><div><button type="button" class="summon-confirm-yes">はい</button><button type="button" class="summon-confirm-no">いいえ</button></div></div>';
  dialog.hidden=false;
  dialog.querySelector('.summon-confirm-no').onclick=()=>dialog.hidden=true;
  dialog.onclick=event=>{if(event.target===dialog)dialog.hidden=true;};
  const yes=dialog.querySelector('.summon-confirm-yes');
  if(yes)yes.onclick=()=>{
    if(!isGameOwner()&&readTokens()<10){dialog.querySelector('.summon-confirm-box').innerHTML='<p>金貨が足りません。</p><button type="button" class="summon-confirm-no">戻る</button>';dialog.querySelector('.summon-confirm-no').onclick=()=>dialog.hidden=true;return;}
    dialog.classList.add('summoning');
    dialog.innerHTML='<div class="summon-animation-box" aria-label="召喚中"><img class="summon-vortex" src="assets/spell-hearts-star-vortex.png" alt=""><img class="summon-animation-gate" src="assets/spell-hearts-summon-gate.png" alt=""><div class="summon-particles"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><img class="summon-falling-shard" src="assets/spell-hearts-star-fragment.png" alt="星のカケラ"></div>';
    setTimeout(()=>{
      if(!isGameOwner())localStorage.setItem(tokenKey(),String(readTokens()-10));
      localStorage.setItem(shardKey(),String(readStardust()+1));
      renderTokenBalance();renderSummonStock();
      dialog.classList.remove('summoning');
      dialog.innerHTML='<div class="summon-confirm-box summon-result-box"><img class="summon-result-shard" src="assets/spell-hearts-star-fragment.png" alt="星のカケラ"><p>星のカケラがひとつ落ちてきました</p><button type="button" class="summon-confirm-no">受け取る</button>';
      dialog.querySelector('.summon-confirm-no').onclick=()=>dialog.hidden=true;
    },2600);
  };
}
function makeSummonButton(){
  const title=document.querySelector('#titleScreen');
  if(!title||document.querySelector('#summonButton'))return;
  const button=document.createElement('button');
  button.id='summonButton';button.className='summon-button';button.type='button';button.setAttribute('aria-label','召喚の門を開く');
  button.innerHTML='<span>召 喚</span><img class="summon-portal" src="assets/spell-hearts-summon-gate.png" alt="">';
  button.onclick=openSummonGate;title.append(button);
}
function makeDressupButton(){
  const title=document.querySelector('#titleScreen');
  if(!title||document.querySelector('#dressupButton'))return;
  const button=document.createElement('button');
  button.id='dressupButton';button.className='dressup-button';button.type='button';button.setAttribute('aria-label','着せ替え');
  button.innerHTML='<span>着せ替え</span><img class="dressup-card" src="assets/spell-hearts-dressup-card.png" alt="">';
  button.onclick=openDressupMenu;title.append(button);
}
window.awardSpellHeartsTokens=(amount,matchId)=>{
  const reward=Math.max(0,Number(amount)||0),matchKey=`spellHeartsTokensAwarded:${matchId}`;
  if(!currentUser||currentUser.isAnonymous||!reward||!matchId||sessionStorage.getItem(matchKey))return readTokens();
  sessionStorage.setItem(matchKey,'1');
  const total=readTokens()+reward;
  localStorage.setItem(tokenKey(),String(total));
  renderTokenBalance();
  return total;
};

onAuthStateChanged(auth,user=>{currentUser=user;cosmeticProfile=readLocalCosmetics();updateLoginButton();renderTokenBalance();void loadAccountCosmetics();});

function closeLogin(){modal?.remove();modal=null;}

function makeModal(){
  if(modal)return modal;
  modal=document.createElement('section');
  modal.className='auth-modal';
  modal.innerHTML=`
    <div class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <button class="auth-close" type="button" aria-label="閉じる">×</button>
      <div class="auth-crown">✦</div>
      <h2 id="authTitle">SPELL HEARTS</h2>
      <p class="auth-subtitle">冒険者の記録</p>
      <div class="auth-tabs"><button type="button" class="auth-tab active" data-mode="login">ログイン</button><button type="button" class="auth-tab" data-mode="register">新規登録</button></div>
      <button type="button" class="auth-google"><span>G</span> Googleでログイン</button>
      <form class="auth-form">
        <label>メールアドレス<input class="auth-email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
        <label class="auth-nickname">ニックネーム<input class="auth-name" type="text" autocomplete="nickname" maxlength="16" placeholder="対戦中に表示される名前"></label>
        <label>パスワード<input class="auth-password" type="password" autocomplete="current-password" required minlength="6" placeholder="6文字以上"></label>
        <p class="auth-status" aria-live="polite"></p>
        <button class="auth-submit" type="submit">ログイン</button>
      </form>
      <button type="button" class="auth-reset">パスワードを忘れた場合</button>
      <p class="auth-guest-note">ログインしなくても、ゲストとして対戦できます。</p>
    </div>`;
  document.body.append(modal);
  const panel=modal.querySelector('.auth-panel'), form=modal.querySelector('.auth-form'), status=modal.querySelector('.auth-status');
  let mode='login';
  modal.querySelector('.auth-close').onclick=closeLogin;
  modal.addEventListener('click',event=>{if(event.target===modal)closeLogin();});
  modal.querySelectorAll('.auth-tab').forEach(tab=>tab.onclick=()=>{
    mode=tab.dataset.mode;
    modal.querySelectorAll('.auth-tab').forEach(button=>button.classList.toggle('active',button===tab));
    panel.querySelector('#authTitle').textContent=mode==='login'?'SPELL HEARTS':'新しい冒険者';
    form.classList.toggle('registering',mode==='register');
    panel.querySelector('.auth-submit').textContent=mode==='login'?'ログイン':'アカウントを作成';
    panel.querySelector('.auth-password').autocomplete=mode==='login'?'current-password':'new-password';
    status.textContent='';
  });
  modal.querySelector('.auth-google').onclick=async()=>{
    const googleButton=panel.querySelector('.auth-google');
    googleButton.disabled=true;status.textContent='Googleログインを開いています…';
    try{
      const provider=new GoogleAuthProvider();
      if(auth.currentUser?.isAnonymous)await linkWithPopup(auth.currentUser,provider);
      else await signInWithPopup(auth,provider);
      status.textContent='Googleでログインしました。';
      setTimeout(closeLogin,550);
    }catch(error){status.textContent=authMessage(error);}
    finally{googleButton.disabled=false;}
  };
  form.onsubmit=async event=>{
    event.preventDefault();
    const email=panel.querySelector('.auth-email').value.trim(), password=panel.querySelector('.auth-password').value, nickname=panel.querySelector('.auth-name').value.trim();
    const submit=panel.querySelector('.auth-submit');
    submit.disabled=true;status.textContent='魔法を準備しています…';
    try{
      if(mode==='register'){
        if(!nickname){status.textContent='ニックネームを入力してください。';submit.disabled=false;return;}
        if(auth.currentUser?.isAnonymous){
          await linkWithCredential(auth.currentUser,EmailAuthProvider.credential(email,password));
        }else{
          await createUserWithEmailAndPassword(auth,email,password);
        }
        await updateProfile(auth.currentUser,{displayName:nickname});
        currentUser=auth.currentUser;
        updateLoginButton();
      }else{
        if(auth.currentUser?.isAnonymous)await signOut(auth);
        await signInWithEmailAndPassword(auth,email,password);
      }
      status.textContent='ログインしました。';
      setTimeout(closeLogin,550);
    }catch(error){status.textContent=authMessage(error);}
    finally{submit.disabled=false;}
  };
  modal.querySelector('.auth-reset').onclick=async()=>{
    const email=panel.querySelector('.auth-email').value.trim();
    if(!email){status.textContent='先にメールアドレスを入力してください。';return;}
    try{await sendPasswordResetEmail(auth,email);status.textContent='再設定用メールを送信しました。';}
    catch(error){status.textContent=authMessage(error);}
  };
  return modal;
}

window.openSpellHeartsLogin=()=>{
  if(currentUser&&!currentUser.isAnonymous){
    if(confirm(`${currentUser.email} でログイン中です。ログアウトしますか？`))signOut(auth);
    return;
  }
  makeModal();
};

window.ensureSpellHeartsGuest=async()=>{
  if(currentUser)return true;
  const note=document.querySelector('#roomNote');
  try{
    if(note)note.textContent='ゲストとして入室しています…';
    const result=await signInAnonymously(auth);
    currentUser=result.user;
    return true;
  }catch(error){
    if(note)note.textContent=authMessage(error);
    return false;
  }
};

window.getSpellHeartsNickname=()=>{
  if(currentUser?.displayName)return currentUser.displayName;
  let guest=localStorage.getItem('spellHeartsGuestNickname');
  if(!guest){guest=`ゲスト${Math.floor(1000+Math.random()*9000)}`;localStorage.setItem('spellHeartsGuestNickname',guest);}
  return guest;
};

function applySoundLevels(){
  const bgm=Math.max(0,Math.min(100,Number(localStorage.getItem('spellHeartsBgmVolume')??28)));
  const sfx=Math.max(0,Math.min(100,Number(localStorage.getItem('spellHeartsSfxVolume')??70)));
  const music=document.querySelector('#battleBgm'); if(music)music.volume=bgm/100;
  const titleMusic=document.querySelector('#titleBgm'); if(titleMusic&&!titleMusic.dataset.fading)titleMusic.volume=bgm/100;
  document.querySelectorAll('#cardFlipSfx,#pursuitSfx,#blockSfx,#schemeSfx,#damageSfxOne,#damageSfxTwo').forEach(sound=>sound.volume=sfx/100);
  return {bgm,sfx};
}

function makeSettings(){
  const title=document.querySelector('#titleScreen');
  if(!title||document.querySelector('#titleSettings'))return;
  const gear=document.createElement('button');
  gear.id='titleSettings';gear.className='title-settings';gear.type='button';gear.setAttribute('aria-label','設定を開く');gear.textContent='⚙';
  const panel=document.createElement('section');
  panel.className='settings-panel';panel.hidden=true;
  const levels=applySoundLevels();
  panel.innerHTML=`<div class="settings-heading">SETTINGS</div><label>ニックネーム<input class="settings-name" maxlength="16" value="${window.getSpellHeartsNickname()}"></label><button class="settings-save" type="button">名前を保存</button><label>BGM <output class="bgm-value">${levels.bgm}</output><input class="bgm-range" type="range" min="0" max="100" value="${levels.bgm}"></label><label>SE <output class="sfx-value">${levels.sfx}</output><input class="sfx-range" type="range" min="0" max="100" value="${levels.sfx}"></label>`;
  title.append(gear,panel);
  gear.onclick=()=>{panel.hidden=!panel.hidden;gear.classList.toggle('open',!panel.hidden);};
  panel.querySelector('.settings-save').onclick=async()=>{
    const input=panel.querySelector('.settings-name'),nickname=input.value.trim().replace(/[<>]/g,'');
    if(!nickname){input.focus();return;}
    try{if(currentUser&&!currentUser.isAnonymous)await updateProfile(currentUser,{displayName:nickname});else localStorage.setItem('spellHeartsGuestNickname',nickname);input.value=nickname;updateLoginButton();}
    catch(error){alert(authMessage(error));}
  };
  for(const [kind,key] of [['bgm','spellHeartsBgmVolume'],['sfx','spellHeartsSfxVolume']]){
    const range=panel.querySelector(`.${kind}-range`),output=panel.querySelector(`.${kind}-value`);
    range.oninput=()=>{localStorage.setItem(key,range.value);output.value=range.value;applySoundLevels();};
  }
}

function recordKey(){return `spellHeartsRecord:${currentUser?.uid||'guest'}`;}
function readRecord(){try{return {...{wins:0,losses:0,draws:0},...JSON.parse(localStorage.getItem(recordKey())||'{}')};}catch{return {wins:0,losses:0,draws:0};}}
function writeLocalRecord(record){localStorage.setItem(recordKey(),JSON.stringify(record));}
async function readCloudRecord(){
  if(!currentUser||currentUser.isAnonymous)return readRecord();
  try{const snapshot=await getDoc(doc(db,'records',currentUser.uid));return {...{wins:0,losses:0,draws:0},...(snapshot.exists()?snapshot.data():{})};}
  catch{return readRecord();}
}
function drawRecord(panel,record){
  panel.querySelector('.record-wins').textContent=record.wins||0;
  panel.querySelector('.record-losses').textContent=record.losses||0;
  panel.querySelector('.record-draws').textContent=record.draws||0;
}
async function openRecord(){
  let panel=document.querySelector('#recordPanel');
  if(!panel){
    panel=document.createElement('section');panel.id='recordPanel';panel.className='record-panel';
    panel.innerHTML='<button class="record-close" type="button" aria-label="閉じる">×</button><div class="record-heading">BATTLE RECORD</div><div class="record-user"></div><div class="record-grid"><div><b class="record-wins">0</b><span>WIN</span></div><div><b class="record-losses">0</b><span>LOSE</span></div><div><b class="record-draws">0</b><span>DRAW</span></div></div><p class="record-note"></p>';
    document.querySelector('#titleScreen')?.append(panel);
    panel.querySelector('.record-close').onclick=()=>panel.hidden=true;
  }
  const record=readRecord(),name=window.getSpellHeartsNickname?.()||'ゲスト';
  panel.querySelector('.record-user').textContent=name;
  drawRecord(panel,record);
  panel.querySelector('.record-note').textContent=currentUser?.isAnonymous?'ゲスト戦績はこのブラウザに保存されます。':'アカウント戦績を読み込んでいます…';
  panel.hidden=false;
  if(currentUser&&!currentUser.isAnonymous){const cloudRecord=await readCloudRecord();drawRecord(panel,cloudRecord);panel.querySelector('.record-note').textContent='アカウントの戦績を表示しています。';}
}
window.recordSpellHeartsResult=async(result,matchId)=>{
  const matchKey=`spellHeartsRecorded:${matchId}`;
  if(!matchId||sessionStorage.getItem(matchKey))return;
  sessionStorage.setItem(matchKey,'1');
  const changes={wins:result==='win'?1:0,losses:result==='loss'?1:0,draws:result==='draw'?1:0};
  const local={...readRecord()};for(const key of Object.keys(changes))local[key]=(local[key]||0)+changes[key];writeLocalRecord(local);
  if(!currentUser||currentUser.isAnonymous)return;
  try{await runTransaction(db,async transaction=>{const ref=doc(db,'records',currentUser.uid),snapshot=await transaction.get(ref),old=snapshot.exists()?snapshot.data():{};transaction.set(ref,{wins:(old.wins||0)+changes.wins,losses:(old.losses||0)+changes.losses,draws:(old.draws||0)+changes.draws,updatedAt:Date.now()},{merge:true});});}
  catch(error){console.warn('Record sync failed',error);}
};
function makeRecordButton(){
  const form=document.querySelector('.room-form');
  if(!form||document.querySelector('#recordButton'))return;
  const button=document.createElement('button');button.id='recordButton';button.className='room-record';button.type='button';button.textContent='戦 績';button.onclick=openRecord;form.append(button);
}
function openTutorial(){
  let modal=document.querySelector('#tutorialPanel');
  if(!modal){
    modal=document.createElement('section');modal.id='tutorialPanel';modal.className='tutorial-panel';
    modal.innerHTML='<div class="tutorial-book"><button class="tutorial-close" type="button" aria-label="閉じる">×</button><div class="tutorial-seal">✦</div><div class="tutorial-page"></div><div class="tutorial-progress"></div><div class="tutorial-actions"><button class="tutorial-back" type="button">戻る</button><button class="tutorial-next" type="button">次の頁へ</button></div></div>';
    document.body.append(modal);
    modal.querySelector('.tutorial-close').onclick=()=>modal.hidden=true;
  }
  const pages=[
    {chapter:'チュートリアル・第一頁',title:'バトルカードの基本',body:'<div class="tutorial-rule"><b>グー</b><span>勝利時：1ダメージ</span></div><div class="tutorial-rule"><b>チョキ</b><span>勝利時：2ダメージ</span></div><div class="tutorial-rule"><b>パー</b><span>勝利時：5ダメージ</span></div><div class="tutorial-rule"><b>あいこ</b><span>両者：1ダメージ</span></div>',hint:'先に相手のHPを0にした側の勝利。'},
    {chapter:'チュートリアル・第二頁',title:'一巡の流れ',body:'<div class="tutorial-flow"><b>① スペルを引く</b><span>伏せたままCHARGEに置かれる</span></div><div class="tutorial-flow"><b>② バトルカードを選ぶ</b><span>グー・チョキ・パー・アンプリファイア</span></div><div class="tutorial-flow"><b>③ 公開後にスペルを選ぶ</b><span>使わない場合もOKで進行する</span></div>',hint:'相手の伏せスペルは、使われるまで正体が見えない。'},
    {chapter:'チュートリアル・第三頁',title:'スペルカードの効果',body:'<div class="tutorial-rule"><b>追い打ち</b><span>勝利時：与ダメージ +1 ／ 強化：+3</span></div><div class="tutorial-rule"><b>ブロック</b><span>敗北時：受ダメージ -1 ／ 強化：0・HP+1</span></div><div class="tutorial-rule"><b>謀略</b><span>あいこ時：自分のダメージを0 ／ 強化：HP+2・相手に2ダメージ</span></div>',hint:'使える状況はカードごとに決まっている。'},
    {chapter:'チュートリアル・最終頁',title:'アンプリファイア',body:'<div class="tutorial-rule tutorial-amp"><b>アンプリファイア</b><span>このバトルでは相手のダメージを受け、次に使うスペルを強化する。</span></div><div class="tutorial-rule tutorial-amp"><b>強化後</b><span>スペル使用後、アンプリファイアは墓地へ送られる。</span></div>',hint:'危険な一手が、決闘を覆す。準備は整った。',start:true}
  ];
  let page=0;const pageNode=modal.querySelector('.tutorial-page'),progress=modal.querySelector('.tutorial-progress'),back=modal.querySelector('.tutorial-back'),next=modal.querySelector('.tutorial-next');
  const renderPage=()=>{const item=pages[page];pageNode.innerHTML=`<div class="tutorial-chapter">${item.chapter}</div><h2>${item.title}</h2><div class="tutorial-body">${item.body}</div><p>${item.hint}</p>`;progress.innerHTML=pages.map((_,index)=>`<i class="${index===page?'active':''}"></i>`).join('');back.disabled=page===0;next.textContent=item.start?'模擬戦を始める':'次の頁へ';};
  back.onclick=()=>{if(page){page--;renderPage();}};
  next.onclick=()=>{if(page<pages.length-1){page++;renderPage();}else{modal.hidden=true;enterGame();}};
  renderPage();modal.hidden=false;
}
function makeTutorialButton(){
  const menu=document.querySelector('.title-menu');
  if(!menu||document.querySelector('#tutorialButton'))return;
  const button=document.createElement('button');button.id='tutorialButton';button.className='tutorial-button';button.type='button';button.textContent='チュートリアル';button.onclick=openTutorial;
  menu.insertBefore(button,menu.querySelector('.push-screen'));
}
function makeBattleSettings(){
  const title=document.querySelector('#titleScreen');
  if(!title||document.querySelector('#battleSettings'))return;
  const gear=document.createElement('button');gear.id='battleSettings';gear.className='battle-settings';gear.type='button';gear.textContent='⚙';gear.setAttribute('aria-label','対戦中の音量設定');gear.hidden=true;
  const panel=document.createElement('section');panel.className='battle-settings-panel';panel.hidden=true;
  const levels=applySoundLevels();
  panel.innerHTML=`<div>VOLUME</div><label>BGM <output class="battle-bgm-value">${levels.bgm}</output><input class="battle-bgm-range" type="range" min="0" max="100" value="${levels.bgm}"></label><label>SE <output class="battle-sfx-value">${levels.sfx}</output><input class="battle-sfx-range" type="range" min="0" max="100" value="${levels.sfx}"></label>`;
  document.body.append(gear,panel);
  gear.onclick=()=>{panel.hidden=!panel.hidden;};
  for(const [kind,key] of [['bgm','spellHeartsBgmVolume'],['sfx','spellHeartsSfxVolume']]){
    const range=panel.querySelector(`.battle-${kind}-range`),output=panel.querySelector(`.battle-${kind}-value`);
    range.oninput=()=>{localStorage.setItem(key,range.value);output.value=range.value;applySoundLevels();};
  }
  const syncBattleSettings=()=>{const playing=title.classList.contains('dismiss');gear.hidden=!playing;if(!playing)panel.hidden=true;};
  new MutationObserver(syncBattleSettings).observe(title,{attributes:true,attributeFilter:['class']});syncBattleSettings();
}

window.openSpellHeartsSettings=()=>document.querySelector('#titleSettings')?.click();
makeSettings();
makeTokenBalance();
makeSummonButton();
makeDressupButton();
makeRecordButton();
makeTutorialButton();
makeBattleSettings();
installTitleBgm();

const style=document.createElement('style');
style.textContent=`
.auth-modal{position:fixed;inset:0;z-index:240;display:grid;place-items:center;padding:20px;background:rgba(1,4,9,.78);backdrop-filter:blur(5px);animation:auth-fade .2s ease-out both}.auth-panel{position:relative;width:min(92vw,410px);padding:30px 34px 26px;border:1px solid #d8af4b;border-radius:8px;background:linear-gradient(145deg,rgba(27,28,41,.98),rgba(9,9,16,.99));box-shadow:inset 0 0 32px rgba(226,169,52,.16),0 18px 60px #000;color:#fff0bc;text-align:center}.auth-panel:before{content:'';position:absolute;inset:7px;border:1px solid rgba(219,181,84,.35);border-radius:4px;pointer-events:none}.auth-crown{position:relative;color:#ffe28a;font-size:29px;text-shadow:0 0 18px #e1a126}.auth-panel h2{position:relative;margin:3px 0 1px;font:27px Georgia,"Yu Mincho",serif;letter-spacing:.1em;text-shadow:0 0 12px #d99b27}.auth-subtitle{position:relative;margin:0 0 20px;color:#cbb879;font:13px Georgia,"Yu Mincho",serif;letter-spacing:.22em}.auth-close{position:absolute;z-index:1;right:14px;top:10px;border:0;background:transparent;color:#d9c27f;font:28px/1 Georgia,serif;cursor:pointer}.auth-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;margin-bottom:16px;border-bottom:1px solid #735d2b}.auth-tab{border:0;background:transparent;color:#b8a66b;padding:9px;font:15px Georgia,"Yu Mincho",serif;cursor:pointer}.auth-tab.active{color:#fff3b2;border-bottom:2px solid #f0c85c;text-shadow:0 0 8px #e6ac2b}.auth-form{position:relative;display:grid;gap:12px;text-align:left}.auth-form label{display:grid;gap:5px;color:#e5d29a;font:13px "Yu Gothic",sans-serif}.auth-form input{width:100%;padding:11px;border:1px solid #80652d;border-radius:3px;outline:0;background:#080911;color:#fff2c6;font:15px Georgia,"Yu Mincho",serif}.auth-form input:focus{border-color:#ffe287;box-shadow:0 0 13px rgba(255,205,77,.35)}.auth-status{min-height:2.6em;margin:0;color:#ffe59a;font:12px "Yu Gothic",sans-serif;line-height:1.35}.auth-submit{padding:11px;border:1px solid #e5b64a;border-radius:3px;background:linear-gradient(#75541a,#291806);color:#fff2b0;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.12em;cursor:pointer}.auth-submit:disabled{opacity:.55;cursor:wait}.auth-reset{position:relative;margin-top:13px;border:0;background:transparent;color:#d6c184;font:12px "Yu Gothic",sans-serif;text-decoration:underline;cursor:pointer}.auth-guest-note{position:relative;margin:14px 0 0;color:#a5adbc;font:11px "Yu Gothic",sans-serif}@keyframes auth-fade{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}`;
document.head.append(style);
const settingsTweaks=document.createElement('style');
settingsTweaks.textContent='.title-settings{top:58px;left:34px;width:84px;height:84px;padding:0;display:grid;place-items:center;border:2px solid #d8ae4e;border-radius:6px;background:rgba(3,5,8,.74);box-shadow:inset 0 0 14px rgba(255,225,135,.13),0 2px 14px #0009;color:#ffe9a0;font:50px/1 serif;text-shadow:0 1px 3px #000;transition:filter .2s}.title-settings.open{transform:none}.settings-panel{top:158px}.push-screen{margin-bottom:42px}@media(max-width:600px){.title-settings{top:50px;left:16px;width:64px;height:64px;font-size:39px}.settings-panel{top:122px}.push-screen{margin-bottom:24px}}';
document.head.append(settingsTweaks);
const tokenStyle=document.createElement('style');
tokenStyle.textContent='.token-balance{position:absolute;z-index:3;right:34px;bottom:3.5vh;display:inline-flex;align-items:center;gap:14px;background:transparent;color:#fff0ad;font:bold 34px Georgia,"Yu Mincho",serif;text-shadow:0 2px 5px #000}.token-coin{display:block;width:36px;height:36px;object-fit:contain;filter:drop-shadow(0 2px 5px #000)}.token-balance .token-coin{width:81px;height:81px}.token-count{min-width:2ch;text-align:right}.result-token-reward{display:inline-flex;align-items:center;gap:12px;margin-top:20px;padding:8px 15px;border:1px solid rgba(225,184,77,.8);border-radius:5px;background:rgba(3,5,8,.74);box-shadow:inset 0 0 13px rgba(255,225,135,.12),0 2px 12px #0009;color:#fff0ad;font:bold clamp(20px,2.7vw,32px) Georgia,"Yu Mincho",serif;text-shadow:0 1px 3px #000}.result-token-reward .token-coin{width:50px;height:50px}@media(max-width:600px){.token-balance{right:16px;bottom:3vh;gap:8px;font-size:25px}.token-balance .token-coin{width:58px;height:58px}.result-token-reward{margin-top:14px;padding:7px 12px}.result-token-reward .token-coin{width:43px;height:43px}}';
document.head.append(tokenStyle);
const summonStyle=document.createElement('style');
summonStyle.textContent='.summon-button{position:absolute;z-index:3;right:26px;bottom:calc(3.5vh + 114px);width:132px;height:142px;padding:0;border:0;background:transparent;color:#f9e5a7;font:bold 19px/1 Georgia,"Yu Mincho",serif;letter-spacing:.18em;text-shadow:0 2px 5px #000;cursor:pointer;transition:transform .2s ease,filter .2s ease}.summon-button:hover{filter:brightness(1.18);transform:translateY(-5px)}.summon-button>span{position:absolute;z-index:1;top:0;left:-28px;width:100px;text-align:center}.summon-portal{position:absolute;left:0;bottom:0;display:block;width:100px;height:117px;object-fit:contain;filter:drop-shadow(0 4px 6px #000);transform:translateX(-28px);transition:filter .2s ease}.summon-button:hover .summon-portal{filter:drop-shadow(0 0 12px rgba(107,170,255,.85)) drop-shadow(0 0 23px rgba(136,86,255,.66)) drop-shadow(0 4px 6px #000)}.summon-gate-panel{position:fixed;z-index:260;inset:0;display:grid;place-items:center;padding:20px;background:rgba(1,4,9,.8);backdrop-filter:blur(5px)}.summon-gate-panel[hidden]{display:none}.summon-gate-book{position:relative;width:min(90vw,410px);padding:35px 34px 28px;border:1px solid #d8ae4e;border-radius:8px;background:radial-gradient(ellipse at 50% 20%,rgba(73,52,108,.97),rgba(10,9,17,.99) 68%);box-shadow:inset 0 0 42px rgba(177,132,255,.22),0 20px 65px #000;color:#f7e7bc;text-align:center}.summon-gate-book:before{content:"";position:absolute;inset:9px;border:1px solid rgba(225,184,77,.3);border-radius:4px;pointer-events:none}.summon-gate-close{position:absolute;z-index:1;right:15px;top:11px;border:0;background:transparent;color:#e4cb82;font:28px/1 Georgia,serif;cursor:pointer}.summon-gate-sigil{position:relative;display:grid;place-items:center;width:82px;height:82px;margin:0 auto 12px;border:1px solid #d2b8ff;border-radius:50%;background:radial-gradient(circle,rgba(161,122,255,.68),rgba(38,23,70,.32) 52%,transparent 55%);box-shadow:0 0 25px #987dff99;color:#fff8ca;font:47px Georgia,serif;text-shadow:0 0 14px #fff}.summon-gate-kicker{position:relative;margin:0;color:#c9b182;font:11px Georgia,serif;letter-spacing:.23em}.summon-gate-book h2{position:relative;margin:9px 0 16px;color:#fff0b0;font:31px Georgia,"Yu Mincho",serif;letter-spacing:.13em;text-shadow:0 0 13px #dba432}.summon-gate-copy,.summon-gate-note{position:relative;margin:0;color:#e6d8b4;font:14px/1.7 "Yu Gothic",sans-serif}.summon-gate-note{margin-top:8px;color:#b7a8ce;font-size:12px}.summon-gate-dismiss{position:relative;margin-top:23px;min-width:120px;padding:9px;border:1px solid #c59b38;border-radius:3px;background:linear-gradient(#684a16,#261704);color:#fff0b2;font:14px Georgia,"Yu Mincho",serif;cursor:pointer}.summon-gate-dismiss:hover{filter:brightness(1.25)}@media(max-width:600px){.summon-button{right:10px;bottom:calc(3vh + 78px);width:92px;height:103px;font-size:14px}.summon-button>span{top:0;left:-20px;width:76px}.summon-portal{width:76px;height:88px;transform:translateX(-20px)}.summon-gate-book{padding:32px 25px 24px}}';
document.head.append(summonStyle);
summonStyle.textContent+='.summon-stock{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 18px}.summon-stock div{display:grid;gap:4px;padding:11px 7px;border:1px solid rgba(216,174,78,.45);background:rgba(3,5,10,.46)}.summon-stock span{color:#cbb784;font:12px "Yu Gothic",sans-serif}.summon-stock b{color:#fff0ae;font:27px Georgia,"Yu Mincho",serif;text-shadow:0 0 8px #d99b27}.summon-cast{position:relative;width:min(100%,280px);padding:13px 14px 11px;border:1px solid #d8ae4e;border-radius:4px;background:linear-gradient(145deg,#46305e,#16101f);box-shadow:inset 0 0 17px rgba(169,126,255,.23),0 4px 12px #0008;color:#fff0bc;font:17px Georgia,"Yu Mincho",serif;letter-spacing:.08em;cursor:pointer}.summon-cast:hover{filter:brightness(1.22)}.summon-cast small{display:block;margin-top:5px;color:#ddc380;font:12px Georgia,"Yu Mincho",serif}.summon-confirm{position:fixed;z-index:270;inset:0;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.5);transition:background .25s}.summon-confirm.summoning{background:rgba(0,0,0,.88)}.summon-confirm[hidden]{display:none}.summon-confirm-box{width:min(86vw,350px);padding:26px 24px;border:1px solid #d8ae4e;border-radius:6px;background:linear-gradient(145deg,#2a2134,#0a090f);box-shadow:inset 0 0 25px rgba(167,121,255,.18),0 15px 45px #000;color:#fff0bd;text-align:center}.summon-confirm-box p{margin:0 0 20px;font:16px/1.7 "Yu Gothic",sans-serif}.summon-confirm-box>div{display:flex;justify-content:center;gap:15px}.summon-confirm-box button{min-width:104px;padding:9px 14px;border:1px solid #d8ae4e;border-radius:3px;background:linear-gradient(#72531c,#291906);color:#fff0b2;font:14px Georgia,"Yu Mincho",serif;cursor:pointer}.summon-confirm-box .summon-confirm-no{border-color:#aaa5b2;background:linear-gradient(#4b4851,#1b1920)}.summon-result-shard{margin:-3px auto 10px;color:#e6ccff;font:43px Georgia,serif;text-shadow:0 0 18px #9b73ff}.summon-animation-box{position:relative;width:min(78vw,370px);height:min(76vh,480px);overflow:hidden}.summon-vortex{position:absolute;z-index:2;left:50%;top:50%;width:min(68%,260px);aspect-ratio:1;object-fit:contain;opacity:0;transform:translate(-50%,-50%) scale(.28) rotate(0deg);filter:brightness(.8) saturate(.9);animation:summon-vortex-fade-spin 2.45s cubic-bezier(.18,.7,.24,1) forwards}.summon-animation-gate{position:absolute;z-index:1;left:50%;top:50%;width:min(88%,335px);height:92%;object-fit:contain;transform:translate(-50%,-50%) scale(.5) rotate(-8deg);filter:brightness(.58) saturate(.85);animation:summon-gate-open 1.25s cubic-bezier(.15,.8,.25,1) forwards}.summon-particles{position:absolute;z-index:3;inset:0;pointer-events:none}.summon-particles i{position:absolute;left:calc(15% + var(--x,0%));top:var(--y,50%);width:5px;height:5px;border-radius:50%;background:#e4d4ff;box-shadow:0 0 12px 4px #956dff;animation:summon-star 1.35s ease-in forwards}.summon-particles i:nth-child(1){--x:4%;--y:20%;animation-delay:.35s}.summon-particles i:nth-child(2){--x:57%;--y:16%;animation-delay:.48s}.summon-particles i:nth-child(3){--x:66%;--y:39%;animation-delay:.25s}.summon-particles i:nth-child(4){--x:14%;--y:61%;animation-delay:.55s}.summon-particles i:nth-child(5){--x:61%;--y:68%;animation-delay:.38s}.summon-particles i:nth-child(6){--x:34%;--y:79%;animation-delay:.62s}.summon-particles i:nth-child(7){--x:49%;--y:27%;animation-delay:.72s}.summon-particles i:nth-child(8){--x:25%;--y:44%;animation-delay:.18s}.summon-particles i:nth-child(9){--x:73%;--y:57%;animation-delay:.65s}.summon-falling-shard{position:absolute;z-index:4;left:50%;top:4%;color:#fff2b8;font:clamp(52px,10vw,86px) Georgia,serif;text-shadow:0 0 12px #fff,0 0 35px #9d75ff;opacity:0;transform:translate(-50%,-20px) scale(.4);animation:summon-shard-fall .78s 1.48s cubic-bezier(.18,.82,.28,1.15) forwards}@keyframes summon-gate-open{0%{transform:translate(-50%,-50%) scale(.5) rotate(-8deg);filter:brightness(.45) saturate(.6)}65%{transform:translate(-50%,-50%) scale(1.05) rotate(5deg);filter:brightness(1.15) saturate(1.25)}100%{transform:translate(-50%,-50%) scale(1) rotate(0);filter:brightness(.92) saturate(1)}}@keyframes summon-vortex-fade-spin{0%{opacity:0;transform:translate(-50%,-50%) scale(.28) rotate(0deg)}55%{opacity:.86;transform:translate(-50%,-50%) scale(.92) rotate(460deg)}82%{opacity:1;transform:translate(-50%,-50%) scale(1.13) rotate(690deg)}100%{opacity:.9;transform:translate(-50%,-50%) scale(1.05) rotate(820deg)}}@keyframes summon-star{0%{opacity:0;transform:translate(0,0) scale(.2)}20%{opacity:1}100%{opacity:0;transform:translate(calc(35vw - var(--x)),calc(38vh - var(--y))) scale(.05)}}@keyframes summon-shard-fall{0%{opacity:0;transform:translate(-50%,-55px) scale(.3)}20%{opacity:1}78%{opacity:1;transform:translate(-50%,150px) scale(1.12)}100%{opacity:1;transform:translate(-50%,136px) scale(1)}}@media(max-width:600px){.summon-stock{gap:7px}.summon-stock b{font-size:23px}.summon-cast{font-size:15px}.summon-animation-box{width:88vw;height:68vh}}';
summonStyle.textContent+='.summon-exchange{position:relative;display:block;width:min(100%,230px);margin:15px auto -8px;padding:8px;border:1px solid #806cbd;border-radius:3px;background:rgba(12,10,24,.72);color:#ded4ff;font:13px Georgia,"Yu Mincho",serif;letter-spacing:.08em;cursor:pointer}.summon-exchange:hover{filter:brightness(1.25)}.dressup-button{position:absolute;z-index:3;right:26px;bottom:calc(3.5vh + 278px);width:132px;height:145px;padding:0;border:0;background:transparent;color:#f9e5a7;font:bold 18px/1 Georgia,"Yu Mincho",serif;letter-spacing:.14em;text-shadow:0 2px 5px #000;cursor:pointer;transition:transform .18s ease,filter .18s ease}.dressup-button:hover{filter:brightness(1.18);transform:translateY(-4px)}.dressup-button>span{position:absolute;z-index:1;top:0;left:-28px;width:100px;text-align:center}.dressup-card{position:absolute;left:0;bottom:0;display:block;width:92px;height:119px;object-fit:contain;filter:drop-shadow(0 4px 6px #000);transform:translateX(-28px)}.summon-result-shard{display:block;width:92px;height:92px;object-fit:contain;margin:-13px auto 3px!important;text-shadow:none!important}.summon-falling-shard{width:112px;height:112px;object-fit:contain;color:transparent!important;text-shadow:none!important}@media(max-width:600px){.dressup-button{right:10px;bottom:calc(3vh + 190px);width:92px;height:106px;font-size:13px}.dressup-button>span{left:-20px;width:76px}.dressup-card{width:76px;height:91px;transform:translateX(-20px)}.summon-result-shard{width:78px;height:78px}}';
summonStyle.textContent+='.item-exchange-panel{position:fixed;z-index:280;inset:0;display:grid;place-items:center;padding:24px;background:rgba(1,3,8,.84);backdrop-filter:blur(7px)}.item-exchange-panel[hidden]{display:none}.item-exchange-book{position:relative;width:min(92vw,810px);min-height:430px;padding:42px 54px 32px;border:1px solid #d8ae4e;border-radius:9px;background:radial-gradient(ellipse at 50% 15%,rgba(86,60,28,.7),rgba(12,11,15,.97) 68%);box-shadow:inset 0 0 52px rgba(201,150,50,.18),0 25px 78px #000;color:#f8e8bc;text-align:center}.item-exchange-book:before{content:"";position:absolute;inset:11px;border:1px solid rgba(225,184,77,.38);border-radius:5px;pointer-events:none}.item-exchange-close{position:absolute;z-index:1;right:18px;top:14px;border:0;background:transparent;color:#e4cb82;font:29px/1 Georgia,serif;cursor:pointer}.item-exchange-kicker,.item-exchange-book h2,.item-exchange-copy,.item-exchange-categories,.item-exchange-detail,.item-exchange-return{position:relative}.item-exchange-kicker{margin:0;color:#c9b182;font:11px Georgia,serif;letter-spacing:.26em}.item-exchange-book h2{margin:10px 0 9px;color:#fff0b0;font:32px Georgia,"Yu Mincho",serif;letter-spacing:.14em;text-shadow:0 0 14px #dba432}.item-exchange-copy{margin:0 0 24px;color:#d9ca9f;font:14px "Yu Gothic",sans-serif}.item-exchange-categories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:19px;align-items:start}.item-exchange-categories button{min-height:238px;padding:12px 10px 14px;border:1px solid rgba(216,174,78,.72);border-radius:5px;background:linear-gradient(145deg,rgba(49,37,23,.88),rgba(7,8,13,.92));box-shadow:inset 0 0 22px rgba(197,145,42,.12),0 6px 16px #0008;color:#ffe8a4;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.08em;cursor:pointer;transition:transform .18s ease,filter .18s ease}.item-exchange-categories button:hover{filter:brightness(1.25);transform:translateY(-5px)}.item-exchange-categories img{display:block;width:136px;height:168px;margin:0 auto 12px;object-fit:contain;filter:drop-shadow(0 5px 6px #000)}.item-exchange-categories span{display:block;line-height:1.35}.item-exchange-detail{min-height:252px;padding:22px 12px}.item-exchange-detail-back{position:absolute;left:6px;top:3px;border:0;background:transparent;color:#d8c38b;font:13px Georgia,"Yu Mincho",serif;cursor:pointer}.item-exchange-detail-content{display:grid;place-items:center;gap:12px;min-height:230px;padding:18px;border:1px solid rgba(216,174,78,.35);background:rgba(2,3,7,.48)}.item-exchange-detail-content h3{margin:0;color:#ffe7a0;font:25px Georgia,"Yu Mincho",serif}.item-exchange-detail-content p{margin:0;color:#d8c8a0;font:14px "Yu Gothic",sans-serif}.item-exchange-empty{width:min(100%,410px);padding:24px 12px;border:1px dashed rgba(216,174,78,.48);color:#ad9a74;font:14px "Yu Gothic",sans-serif}.item-exchange-return{margin-top:22px;min-width:150px;padding:9px 15px;border:1px solid #c59b38;border-radius:3px;background:linear-gradient(#684a16,#261704);color:#fff0b2;font:14px Georgia,"Yu Mincho",serif;cursor:pointer}.item-exchange-return:hover{filter:brightness(1.25)}@media(max-width:600px){.item-exchange-book{min-height:450px;padding:38px 25px 24px}.item-exchange-categories{gap:8px}.item-exchange-categories button{min-height:170px;padding:8px 4px;font-size:12px}.item-exchange-categories img{width:76px;height:108px;margin-bottom:8px}.item-exchange-detail{min-height:230px;padding-top:30px}.item-exchange-detail-content{min-height:190px}.item-exchange-book h2{font-size:26px}}';
const itemExchangeStyle=document.createElement('style');
itemExchangeStyle.textContent='.astrologian-feature{display:grid;gap:12px;place-items:center;width:min(100%,240px);margin:auto;padding:8px 8px 13px;border:1px solid rgba(216,174,78,.72);border-radius:5px;background:linear-gradient(145deg,rgba(35,47,71,.88),rgba(7,8,13,.92));box-shadow:inset 0 0 22px rgba(157,190,255,.16),0 6px 16px #0008;color:#ffe8a4;font:20px Georgia,"Yu Mincho",serif;letter-spacing:.1em;cursor:pointer;transition:transform .18s ease,filter .18s ease}.astrologian-feature:hover{filter:brightness(1.22);transform:translateY(-4px)}.astrologian-feature img{width:180px;height:212px;object-fit:cover;object-position:center;box-shadow:0 5px 13px #000}.astrologian-items{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:min(100%,590px);margin:4px auto 0}.astrologian-items button{padding:7px 6px 9px;border:1px solid rgba(216,174,78,.65);border-radius:4px;background:linear-gradient(145deg,rgba(37,45,67,.94),rgba(7,8,13,.95));color:#ffe8a4;font:15px Georgia,"Yu Mincho",serif;cursor:pointer;transition:transform .18s ease,filter .18s ease}.astrologian-items button:hover{filter:brightness(1.26);transform:translateY(-4px)}.astrologian-items img{display:block;width:100%;height:172px;margin-bottom:7px;object-fit:cover;object-position:center;box-shadow:0 4px 10px #000}.item-exchange-confirm{position:fixed;z-index:290;inset:0;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.62);backdrop-filter:blur(3px)}.item-exchange-confirm[hidden]{display:none}.item-exchange-confirm-box{width:min(86vw,350px);padding:24px;border:1px solid #d8ae4e;border-radius:6px;background:linear-gradient(145deg,rgba(30,32,46,.98),rgba(7,8,13,.99));box-shadow:inset 0 0 27px rgba(153,187,255,.15),0 15px 45px #000;color:#fff0bd;text-align:center}.item-exchange-confirm-box img{display:block;width:104px;height:125px;margin:-2px auto 12px;object-fit:cover;box-shadow:0 4px 12px #000}.item-exchange-confirm-box p{margin:0 0 19px;font:16px/1.65 "Yu Gothic",sans-serif}.item-exchange-confirm-box>div{display:flex;justify-content:center;gap:15px}.item-exchange-confirm-box button{min-width:104px;padding:9px 14px;border:1px solid #d8ae4e;border-radius:3px;background:linear-gradient(#72531c,#291906);color:#fff0b2;font:14px Georgia,"Yu Mincho",serif;cursor:pointer}.item-exchange-confirm-box .exchange-confirm-no{border-color:#aaa5b2;background:linear-gradient(#4b4851,#1b1920)}@media(max-width:600px){.astrologian-feature{width:190px}.astrologian-feature img{width:145px;height:171px}.astrologian-items{gap:6px}.astrologian-items button{font-size:12px;padding:5px}.astrologian-items img{height:112px}}';
itemExchangeStyle.textContent+='.astrologian-items [data-astrologian-item="チョキ"] img{object-position:center 20%}.astrologian-items [data-astrologian-item="パー"] img{object-position:center 24%}.dressup-series{display:grid;place-items:center;gap:7px;width:min(100%,236px);margin:4px auto;padding:9px 9px 13px;border:1px solid rgba(216,174,78,.72);border-radius:5px;background:linear-gradient(145deg,rgba(38,40,53,.9),rgba(7,8,13,.95));box-shadow:inset 0 0 22px rgba(234,197,111,.1),0 6px 16px #0008;color:#ffe8a4;cursor:pointer;transition:transform .18s ease,filter .18s ease}.dressup-series:hover{transform:translateY(-4px);filter:brightness(1.22)}.dressup-series img{width:170px;height:201px;object-fit:cover;object-position:center;box-shadow:0 5px 13px #000}.dressup-series span{font:20px Georgia,"Yu Mincho",serif;letter-spacing:.08em}.dressup-series small{font:13px "Yu Gothic",sans-serif;color:#cbb987}.dressup-series-list{display:flex;flex-wrap:wrap;justify-content:center;gap:13px;width:100%}.dressup-owned-items{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;width:min(100%,590px);margin:4px auto 0}.dressup-owned-items button{width:calc((100% - 24px)/3);min-width:128px;padding:7px 6px 9px;border:1px solid rgba(216,174,78,.65);border-radius:4px;background:linear-gradient(145deg,rgba(40,42,54,.94),rgba(7,8,13,.96));color:#ffe8a4;font:15px Georgia,"Yu Mincho",serif;cursor:pointer;transition:transform .18s ease,filter .18s ease}.dressup-owned-items button:hover{transform:translateY(-4px);filter:brightness(1.26)}.dressup-owned-items img{display:block;width:100%;height:172px;margin-bottom:7px;object-fit:cover;object-position:center;box-shadow:0 4px 10px #000}@media(max-width:600px){.dressup-series{width:190px}.dressup-series img{width:145px;height:171px}.dressup-owned-items{gap:6px}.dressup-owned-items button{min-width:0;padding:5px;font-size:12px}.dressup-owned-items img{height:112px}}.exchange-animation-box{position:relative;display:grid;place-items:center;width:min(86vw,350px);height:342px;overflow:hidden;border:1px solid #d8ae4e;border-radius:6px;background:radial-gradient(circle,rgba(65,81,139,.48),rgba(13,12,24,.98) 66%);box-shadow:inset 0 0 34px rgba(155,205,255,.27),0 15px 45px #000;color:#fff0bd;text-align:center}.exchange-animation-box p{position:absolute;bottom:17px;z-index:5;margin:0;font:16px "Yu Gothic",sans-serif;text-shadow:0 2px 5px #000}.exchange-magic-ring{position:absolute;width:200px;height:200px;border:2px solid rgba(211,180,255,.68);border-radius:50%;box-shadow:0 0 24px #9d7dff, inset 0 0 28px rgba(96,183,255,.55);animation:exchangeRingSpin 2.15s linear forwards}.exchange-core-shard{position:absolute;z-index:3;width:88px;height:88px;object-fit:contain;filter:drop-shadow(0 0 15px #d2c5ff);animation:exchangeShardBloom 2.15s ease-in forwards}.exchange-reward-card{position:absolute;z-index:4;width:116px;height:151px;object-fit:cover;opacity:0;transform:scale(.48);box-shadow:0 0 23px #fff4bf;animation:exchangeCardReveal 2.15s ease-in forwards}.exchange-spark{position:absolute;z-index:2;width:27px;height:27px;object-fit:contain;opacity:0;filter:drop-shadow(0 0 8px #d2c5ff);animation:exchangeSparkFly 1.8s ease-in forwards}.exchange-spark-0{--x:-130px;--y:-84px}.exchange-spark-1{--x:-88px;--y:-142px}.exchange-spark-2{--x:-19px;--y:-154px}.exchange-spark-3{--x:74px;--y:-133px}.exchange-spark-4{--x:137px;--y:-69px}.exchange-spark-5{--x:147px;--y:20px}.exchange-spark-6{--x:111px;--y:108px}.exchange-spark-7{--x:30px;--y:145px}.exchange-spark-8{--x:-58px;--y:139px}.exchange-spark-9{--x:-133px;--y:79px}.exchange-spark-10{--x:-152px;--y:0}.exchange-spark-11{--x:5px;--y:158px}@keyframes exchangeRingSpin{0%{opacity:0;transform:scale(.45) rotate(0deg)}22%{opacity:1}100%{opacity:.12;transform:scale(1.58) rotate(410deg)}}@keyframes exchangeSparkFly{0%{opacity:0;transform:translate(var(--x),var(--y)) scale(.3) rotate(0deg)}18%{opacity:1}76%{opacity:1}100%{opacity:0;transform:translate(0,0) scale(1.7) rotate(220deg)}}@keyframes exchangeShardBloom{0%,52%{opacity:1;transform:scale(.66) rotate(0deg)}78%{opacity:1;transform:scale(2.25) rotate(135deg);filter:drop-shadow(0 0 30px #fff)}100%{opacity:0;transform:scale(3.2) rotate(230deg)}}@keyframes exchangeCardReveal{0%,58%{opacity:0;transform:scale(.48)}79%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}@media(max-width:600px){.exchange-animation-box{height:310px}.exchange-magic-ring{width:174px;height:174px}}';
document.head.append(itemExchangeStyle);
const googleButtonStyle=document.createElement('style');
googleButtonStyle.textContent='.auth-google{position:relative;width:100%;margin:0 0 14px;padding:10px;border:1px solid #a08e62;border-radius:3px;background:#f8f8f6;color:#28231c;font:14px "Yu Gothic",sans-serif;font-weight:bold;cursor:pointer}.auth-google:hover{filter:brightness(.94)}.auth-google:disabled{opacity:.55;cursor:wait}.auth-google span{display:inline-grid;place-items:center;width:19px;height:19px;margin-right:8px;border-radius:50%;background:conic-gradient(from -45deg,#4285f4 0 25%,#34a853 0 50%,#fbbc05 0 75%,#ea4335 0);color:#fff;font:bold 12px Arial;text-shadow:0 1px 1px #0006}';
document.head.append(googleButtonStyle);
const recordStyle=document.createElement('style');
recordStyle.textContent='.room-form{grid-template-columns:1fr auto auto}.room-record{padding:0 12px;border:1px solid #806cbd;border-radius:3px;background:linear-gradient(#41365f,#171124);color:#eee4ff;font:14px Georgia,"Yu Mincho",serif;letter-spacing:.08em;cursor:pointer}.room-record:hover{filter:brightness(1.3)}.record-panel{position:absolute;z-index:5;left:50%;bottom:calc(100% + 15px);width:min(88vw,380px);padding:22px 24px;border:1px solid #d8ae4e;border-radius:6px;background:linear-gradient(145deg,rgba(28,28,35,.98),rgba(7,8,14,.99));box-shadow:inset 0 0 25px #d69b2424,0 12px 32px #000c;color:#fff0bb;transform:translateX(-50%);text-align:center}.record-panel[hidden]{display:none}.record-close{position:absolute;right:12px;top:9px;border:0;background:transparent;color:#ddc984;font:26px/1 Georgia,serif;cursor:pointer}.record-heading{letter-spacing:.16em;color:#ffe69a;font:19px Georgia,"Yu Mincho",serif;text-shadow:0 0 9px #d18d1b}.record-user{margin:8px 0 17px;color:#e5d2a1;font:15px Georgia,"Yu Mincho",serif}.record-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #735d2b;border-bottom:1px solid #735d2b}.record-grid div{display:grid;gap:4px;padding:13px 4px}.record-grid div+div{border-left:1px solid #735d2b}.record-grid b{font:28px Georgia,serif;color:#fff2c4}.record-grid span{font:11px Georgia,serif;letter-spacing:.1em;color:#d4bd78}.record-note{margin:14px 0 0;color:#aeb4c0;font:11px "Yu Gothic",sans-serif}@media(max-width:600px){.room-record{padding:0 9px;font-size:12px}.record-panel{bottom:calc(100% + 10px)}}';
document.head.append(recordStyle);
const battleSettingsStyle=document.createElement('style');
battleSettingsStyle.textContent='.battle-settings{position:fixed;z-index:145;top:15px;right:126px;width:38px;height:38px;border:1px solid #d8ae4e;border-radius:50%;background:#050508;color:#ffe9a0;font:22px/1 serif;text-shadow:0 1px 3px #000;cursor:pointer}.battle-settings:hover{filter:brightness(1.3)}.battle-settings-panel{position:fixed;z-index:146;top:58px;right:126px;width:210px;padding:13px;border:1px solid #d8ae4e;border-radius:5px;background:rgba(7,8,13,.96);box-shadow:0 8px 22px #000b;color:#f8e5ac;font:13px Georgia,"Yu Mincho",serif}.battle-settings-panel[hidden]{display:none}.battle-settings-panel>div{margin-bottom:10px;text-align:center;letter-spacing:.13em;color:#ffe9a0}.battle-settings-panel label{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center;margin:9px 0}.battle-settings-panel input{accent-color:#e8b543}.battle-settings-panel output{color:#ffe9a0}@media(max-width:600px){.battle-settings{right:98px;top:10px}.battle-settings-panel{right:98px;top:53px}}';
document.head.append(battleSettingsStyle);
const tutorialStyle=document.createElement('style');
tutorialStyle.textContent='.tutorial-button{border:0;background:transparent;color:#d8c38b;font:clamp(13px,1.8vw,19px) Georgia,"Yu Mincho",serif;letter-spacing:.2em;cursor:pointer;text-shadow:0 0 8px #000;transition:color .2s,filter .2s}.tutorial-button:hover{color:#fff0b0;filter:drop-shadow(0 0 7px #e2a225)}.tutorial-panel{position:fixed;z-index:230;inset:0;display:grid;place-items:center;padding:20px;background:rgba(1,4,9,.78);backdrop-filter:blur(5px)}.tutorial-panel[hidden]{display:none}.tutorial-book{position:relative;width:min(92vw,600px);min-height:410px;padding:46px 68px 32px;border:1px solid #cba243;border-radius:8px;background:radial-gradient(ellipse at center,rgba(53,43,26,.98),rgba(15,15,16,.99));box-shadow:inset 0 0 45px #d4a23628,0 25px 75px #000;color:#f6e7bb;text-align:center}.tutorial-book:before{content:"";position:absolute;inset:10px;border:1px solid rgba(224,184,75,.42);border-radius:4px;pointer-events:none}.tutorial-close{position:absolute;z-index:1;right:20px;top:17px;border:0;background:transparent;color:#e4cb82;font:27px/1 Georgia,serif;cursor:pointer}.tutorial-seal{position:relative;color:#ffe17c;font-size:30px;text-shadow:0 0 20px #e0a126}.tutorial-chapter{position:relative;margin:6px 0 16px;color:#cfae65;font:13px Georgia,"Yu Mincho",serif;letter-spacing:.22em}.tutorial-page h2{position:relative;margin:0 0 24px;color:#fff0b3;font:clamp(21px,3.3vw,34px) Georgia,"Yu Mincho",serif;text-shadow:0 0 12px #d59a24}.tutorial-body{position:relative;display:grid;gap:9px;min-height:115px;color:#e7d5a2;font:16px/1.85 "Yu Mincho",serif}.tutorial-body span{display:block;padding:4px;border-bottom:1px solid rgba(210,169,67,.22)}.tutorial-page p{position:relative;margin:18px 0;color:#c3b58c;font:14px "Yu Gothic",sans-serif}.tutorial-progress{position:relative;display:flex;justify-content:center;gap:10px;margin:23px 0 17px}.tutorial-progress i{width:7px;height:7px;border-radius:50%;background:#615333}.tutorial-progress i.active{background:#ffe18a;box-shadow:0 0 8px #edb647}.tutorial-actions{position:relative;display:flex;justify-content:space-between;gap:16px}.tutorial-actions button{min-width:116px;padding:9px;border:1px solid #c59b38;border-radius:3px;background:linear-gradient(#6c4d16,#271806);color:#fff0b2;font:14px Georgia,"Yu Mincho",serif;letter-spacing:.08em;cursor:pointer}.tutorial-actions button:disabled{opacity:.3;cursor:default}.tutorial-actions .tutorial-next{margin-left:auto;background:linear-gradient(#8a6724,#30200a)}@media(max-width:600px){.tutorial-book{min-height:380px;padding:38px 31px 25px}.tutorial-body{font-size:14px}.tutorial-button{font-size:12px}}';
document.head.append(tutorialStyle);
tutorialStyle.textContent+='#tutorialButton{position:fixed;z-index:3;left:6vw;bottom:8vh}.tutorial-rule,.tutorial-flow{display:grid;grid-template-columns:112px 1fr;gap:12px;align-items:center;padding:7px 10px;border:1px solid rgba(212,169,67,.26);background:rgba(0,0,0,.18);text-align:left}.tutorial-rule b,.tutorial-flow b{color:#ffe39a;font:15px Georgia,"Yu Mincho",serif}.tutorial-rule span,.tutorial-flow span{padding:0;border:0;color:#e6d7ae;font:13px/1.45 "Yu Gothic",sans-serif}.tutorial-amp{grid-template-columns:112px 1fr}.spell-effect-message strong{display:block;margin-bottom:.14em;font-size:1em}.spell-effect-message span{display:block;white-space:nowrap;font-size:.68em;letter-spacing:0}@media(max-width:600px){#tutorialButton{left:5vw;bottom:9vh}.tutorial-rule,.tutorial-flow{grid-template-columns:88px 1fr;gap:7px;padding:6px}.tutorial-rule span,.tutorial-flow span{font-size:11px}}';
tutorialStyle.textContent+='.tutorial-book{width:min(94vw,680px)}.tutorial-rule,.tutorial-flow,.tutorial-amp{grid-template-columns:1fr;gap:3px;padding:8px 12px}.tutorial-rule b,.tutorial-flow b{white-space:nowrap}.tutorial-rule span,.tutorial-flow span{white-space:nowrap;font-size:13px}.tutorial-amp span{white-space:nowrap}@media(max-width:600px){.tutorial-rule,.tutorial-flow,.tutorial-amp{padding:7px 9px}.tutorial-rule span,.tutorial-flow span{font-size:10px}}';
recordStyle.textContent+='.record-panel{position:fixed;top:50%;bottom:auto;transform:translate(-50%,-50%)}';
style.textContent+='.auth-form .auth-nickname{display:none}.auth-form.registering .auth-nickname{display:grid}';
style.textContent+='.title-settings{position:absolute;z-index:3;top:28px;left:34px;width:42px;height:42px;border:1px solid #d8ae4e;border-radius:50%;background:radial-gradient(circle at 35% 28%,#88703a,#251a0a 67%);box-shadow:inset 0 0 10px #ffe19a44,0 2px 12px #0009;color:#ffe9a0;font:25px/1 serif;text-shadow:0 1px 3px #000;cursor:pointer;transition:filter .2s,transform .3s}.title-settings:hover{filter:brightness(1.3)}.title-settings.open{transform:rotate(90deg)}.settings-panel{position:absolute;z-index:4;top:78px;left:34px;width:245px;padding:16px;border:1px solid #d8ae4e;border-radius:5px;background:linear-gradient(145deg,rgba(32,30,22,.97),rgba(7,9,14,.98));box-shadow:inset 0 0 20px #d99d2e22,0 9px 25px #000b;color:#f9e7ad;font:13px Georgia,"Yu Mincho",serif}.settings-panel[hidden]{display:none}.settings-heading{margin-bottom:13px;color:#ffe9a0;font-size:16px;letter-spacing:.16em;text-align:center;text-shadow:0 0 8px #d69320}.settings-panel label{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;margin:10px 0}.settings-name{grid-column:1/-1;width:100%;padding:7px;border:1px solid #8d6c2e;background:#0b0c11;color:#fff0bd;font:14px Georgia,"Yu Mincho",serif}.settings-save{width:100%;padding:7px;border:1px solid #c79c37;background:linear-gradient(#72531c,#291906);color:#fff1b6;font:13px Georgia,"Yu Mincho",serif;cursor:pointer}.settings-panel input[type=range]{accent-color:#e8b543}.settings-panel output{justify-self:end;color:#ffeaa5}@media(max-width:600px){.title-settings{top:16px;left:16px;width:36px;height:36px;font-size:22px}.settings-panel{top:58px;left:16px;width:225px}}';
