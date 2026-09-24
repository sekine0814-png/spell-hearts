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

// 高解像度端末が desktop 表示として報告されても、実際のタッチ端末には横画面用の操作領域を適用する。
function syncTouchLandscapeLayout(){
  const touch=navigator.maxTouchPoints>0||'ontouchstart' in window;
  document.body?.classList.toggle('touch-landscape',touch&&window.innerWidth>window.innerHeight);
}
window.addEventListener('resize',syncTouchLandscapeLayout,{passive:true});
window.addEventListener('orientationchange',syncTouchLandscapeLayout,{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncTouchLandscapeLayout,{once:true});else syncTouchLandscapeLayout();

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
function displayedStardust(){return isGameOwner()?'∞':readStardust();}
const battleArt={rock:'rock.webp',scissors:'scissors.webp',paper:'paper.webp',amplify:'amplify.webp'};
const astrologianArt={rock:'astrologian-rock.webp',scissors:'astrologian-scissors.webp',paper:'astrologian-paper.webp',amplify:'astrologian-amplify.webp'};
function defaultCosmetics(){return {owned:{battle:{astrologian:{}}},equipped:{battle:{rock:'normal',scissors:'normal',paper:'normal',amplify:'normal'},battleShrink:'normal',spellShrink:'normal'}};}
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
let titleBgmStarted=false,titleBgmFadeFrame=0,chapterOneBgmFadeFrame=0,tutorialBattleBgmFadeFrame=0,villageAmbienceFadeFrame=0,tutorialBattleBgmWatch=0;
function titleBgmLevel(){return Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsBgmVolume')??28)/100));}
function ensureTitleBgm(){
  let music=document.querySelector('#titleBgm');
  if(music)return music;
  music=document.createElement('audio');music.id='titleBgm';music.src='assets/title-old-growth-forest.mp3';music.loop=true;music.preload='none';music.volume=0;
  document.body.append(music);return music;
}
function stopTitleBgm(){
  cancelAnimationFrame(titleBgmFadeFrame);titleBgmFadeFrame=0;titleBgmStarted=false;
  const music=document.querySelector('#titleBgm');
  if(music){music.pause();music.currentTime=0;music.volume=0;music.dataset.fading='';}
}
function ensureChapterOneBgm(){
  let music=document.querySelector('#chapterOneBgm');
  if(music)return music;
  music=document.createElement('audio');music.id='chapterOneBgm';music.src='assets/story-training-ground-bgm.mp3';music.loop=true;music.preload='none';music.volume=0;
  document.body.append(music);return music;
}
function stopChapterOneBgm(){
  cancelAnimationFrame(chapterOneBgmFadeFrame);chapterOneBgmFadeFrame=0;
  const music=document.querySelector('#chapterOneBgm');
  if(music){music.dataset.keepPlaying='';music.pause();music.currentTime=0;music.volume=0;music.dataset.fading='';}
}
function startChapterOneBgm(){
  const music=ensureChapterOneBgm();
  cancelAnimationFrame(chapterOneBgmFadeFrame);music.pause();music.currentTime=0;music.volume=0;music.dataset.keepPlaying='1';music.dataset.fading='1';
  music.play().then(()=>{
    const began=performance.now(),duration=1300;
    const fade=now=>{const progress=Math.min(1,(now-began)/duration);music.volume=titleBgmLevel()*progress;if(progress<1)chapterOneBgmFadeFrame=requestAnimationFrame(fade);else music.dataset.fading='';};
    chapterOneBgmFadeFrame=requestAnimationFrame(fade);
  }).catch(()=>{music.dataset.fading='';});
}
function ensureTutorialBattleBgm(){
  let music=document.querySelector('#tutorialBattleBgm');
  if(music)return music;
  music=document.createElement('audio');music.id='tutorialBattleBgm';music.src='assets/tutorial-battle-bgm.mp3';music.loop=true;music.preload='auto';music.volume=0;
  music.addEventListener('ended',()=>{if(music.dataset.keepPlaying==='1'){music.currentTime=0;music.play().catch(()=>{});}});
  document.body.append(music);return music;
}
function resumeTutorialBattleBgm(){
  const music=document.querySelector('#tutorialBattleBgm');
  if(!music||music.dataset.keepPlaying!=='1')return;
  music.loop=true;
  if(music.paused||music.ended){music.play().catch(()=>{});}
}
function stopTutorialBattleBgm(){
  cancelAnimationFrame(tutorialBattleBgmFadeFrame);tutorialBattleBgmFadeFrame=0;clearInterval(tutorialBattleBgmWatch);tutorialBattleBgmWatch=0;
  const music=document.querySelector('#tutorialBattleBgm');
  if(music){music.dataset.keepPlaying='';music.pause();music.currentTime=0;music.volume=0;music.dataset.fading='';}
}
function startTutorialBattleBgm(){
  const music=ensureTutorialBattleBgm();
  clearInterval(tutorialBattleBgmWatch);cancelAnimationFrame(tutorialBattleBgmFadeFrame);music.pause();music.currentTime=0;music.volume=0;music.dataset.keepPlaying='1';music.dataset.fading='1';
  music.play().then(()=>{
    const began=performance.now(),duration=1150;
    const fade=now=>{const progress=Math.min(1,(now-began)/duration);music.volume=titleBgmLevel()*progress;if(progress<1)tutorialBattleBgmFadeFrame=requestAnimationFrame(fade);else music.dataset.fading='';};
    tutorialBattleBgmFadeFrame=requestAnimationFrame(fade);
  }).catch(()=>{music.dataset.fading='';});
  // モバイルブラウザが長時間の再生を途中で止めても、チュートリアル中だけは復帰させる。
  tutorialBattleBgmWatch=setInterval(resumeTutorialBattleBgm,1200);
}
function ensureVillageAmbience(){
  let music=document.querySelector('#villageAmbience');
  if(music)return music;
  music=document.createElement('audio');music.id='villageAmbience';music.src='assets/story-village-ambience.mp3';music.loop=true;music.preload='none';music.volume=0;
  document.body.append(music);return music;
}
function stopVillageAmbience(){
  cancelAnimationFrame(villageAmbienceFadeFrame);villageAmbienceFadeFrame=0;
  const music=document.querySelector('#villageAmbience');
  if(music){music.dataset.keepPlaying='';music.pause();music.currentTime=0;music.volume=0;music.dataset.fading='';}
}
function startVillageAmbience(){
  const music=ensureVillageAmbience();
  cancelAnimationFrame(villageAmbienceFadeFrame);music.pause();music.currentTime=0;music.volume=0;music.dataset.keepPlaying='1';music.dataset.fading='1';
  music.play().then(()=>{
    const began=performance.now(),duration=1250;
    const fade=now=>{const progress=Math.min(1,(now-began)/duration);music.volume=titleBgmLevel()*.42*progress;if(progress<1)villageAmbienceFadeFrame=requestAnimationFrame(fade);else music.dataset.fading='';};
    villageAmbienceFadeFrame=requestAnimationFrame(fade);
  }).catch(()=>{music.dataset.fading='';});
}
function ensureVillageDangerBgm(){
  let music=document.querySelector('#villageDangerBgm');
  if(music)return music;
  music=document.createElement('audio');music.id='villageDangerBgm';music.src='assets/story-village-danger-bgm.mp3';music.loop=true;music.preload='none';music.volume=0;
  document.body.append(music);return music;
}
function stopVillageDangerBgm(){
  const music=document.querySelector('#villageDangerBgm');
  if(music){music.dataset.keepPlaying='';music.pause();music.currentTime=0;music.volume=0;}
}
function startVillageDangerBgm(){
  stopVillageAmbience();
  const music=ensureVillageDangerBgm();
  if(!music.paused)return;
  music.currentTime=0;music.volume=titleBgmLevel();music.dataset.keepPlaying='1';music.play().catch(()=>{});
}
function ensureAirSmileBgm(){
  let music=document.querySelector('#airSmileBgm');
  if(music)return music;
  music=document.createElement('audio');music.id='airSmileBgm';music.src='assets/story-air-smile-bgm.mp3';music.loop=true;music.preload='none';music.volume=0;
  document.body.append(music);return music;
}
function startAirSmileBgm(){
  const music=ensureAirSmileBgm();
  if(!music.paused)return;
  music.currentTime=0;music.volume=titleBgmLevel()*.82;music.dataset.keepPlaying='1';music.play().catch(()=>{});
}
function stopAirSmileBgm(){
  const music=document.querySelector('#airSmileBgm');
  if(music){music.dataset.keepPlaying='';music.pause();music.currentTime=0;music.volume=0;}
}
function startWolfBattleBgm(){
  const music=document.querySelector('#battleBgm');
  if(!music)return;
  music.pause();music.loop=true;music.src='assets/story-wolf-battle-bgm.mp3';music.load();music.volume=titleBgmLevel();music.dataset.storyKeepPlaying='1';music.play().catch(()=>{});
}
/*
 * スマホのブラウザでは、setTimeout 後の audio.play() が「ユーザー操作外」と見なされる。
 * 物語を選んだ最初のタップで必要な音源を一度だけ起動可能状態にし、復帰時も続きの曲を戻す。
 */
let storyMediaPrimed=false;
function primeStoryMedia(){
  if(storyMediaPrimed)return;
  storyMediaPrimed=true;
  const tracks=[ensureChapterOneBgm(),ensureTutorialBattleBgm(),ensureVillageAmbience(),ensureVillageDangerBgm(),ensureAirSmileBgm(),document.querySelector('#battleBgm')].filter(Boolean);
  tracks.forEach(music=>{
    const volume=music.volume;music.volume=0;
    const started=music.play();
    if(started&&typeof started.then==='function')started.then(()=>{music.pause();music.currentTime=0;music.volume=volume;}).catch(()=>{music.volume=volume;});
    else{music.pause();music.currentTime=0;music.volume=volume;}
  });
}
function resumeStoryMedia(){
  if(document.visibilityState==='hidden')return;
  document.querySelectorAll('audio[data-keep-playing="1"]').forEach(music=>{if(music.paused||music.ended)music.play().catch(()=>{});});
  const battle=document.querySelector('#battleBgm');
  if(window.storyWolfBattleActive&&battle?.dataset.storyKeepPlaying==='1'&&(battle.paused||battle.ended))battle.play().catch(()=>{});
}
document.addEventListener('pointerdown',()=>{primeStoryMedia();resumeStoryMedia();},{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(resumeStoryMedia,80);});
window.addEventListener('pageshow',()=>setTimeout(resumeStoryMedia,80));

const storyVisualAssets=['assets/story-training-ground.webp','assets/story-village.webp','assets/story-village-night.webp','assets/story-senior-warrior.webp','assets/story-wolf-monster.webp','assets/story-woman-warrior.webp','assets/story-woman-warrior-smile.webp'];
let storyVisualPreload=null;
function preloadStoryVisuals(){
  if(storyVisualPreload)return storyVisualPreload;
  storyVisualPreload=Promise.all(storyVisualAssets.map(src=>new Promise(resolve=>{const image=new Image();image.onload=image.onerror=()=>resolve();image.src=src;})));
  return storyVisualPreload;
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
  if(typeof originalReturnToTitle==='function')window.returnToTitle=()=>{document.body.classList.remove('story-cinematic');document.querySelector('#battleBgm')?.removeAttribute('data-story-keep-playing');stopTitleBgm();stopChapterOneBgm();stopTutorialBattleBgm();stopVillageAmbience();stopVillageDangerBgm();stopAirSmileBgm();return originalReturnToTitle();};
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
  balance.innerHTML='<img class="token-coin" src="assets/spell-hearts-token.webp" alt="金貨"><span class="token-count">0</span>';
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
  {key:'rock',name:'グー',image:'assets/astrologian-rock.webp'},
  {key:'scissors',name:'チョキ',image:'assets/astrologian-scissors.webp'},
  {key:'paper',name:'パー',image:'assets/astrologian-paper.webp'},
  {key:'amplify',name:'アンプリファイア',image:'assets/astrologian-amplify.webp'}
];
function showAstrologianCollection(hall){
  const content=hall.querySelector('.item-exchange-detail-content');
  content.innerHTML='<button class="astrologian-feature" type="button"><img src="assets/astrologian-rock.webp" alt="astrologian グー"><span>astrologian</span></button>';
  content.querySelector('.astrologian-feature').onclick=()=>{
    content.innerHTML='<h3>astrologian</h3><p>交換したいバトルカードを選んでください</p><div class="astrologian-items">'+astrologianItems.map(item=>`<button type="button" data-astrologian-item="${item.name}"><img src="${item.image}" alt="astrologian ${item.name}"><span>${item.name}</span></button>`).join('')+'</div>';
    content.querySelectorAll('[data-astrologian-item]').forEach(button=>button.onclick=()=>{
      const item=astrologianItems.find(entry=>entry.name===button.dataset.astrologianItem);
      if(item)openAstrologianConfirm(item);
    });
  };
}
function playExchangeAnimation(dialog,item,onComplete){
  const sparks=Array.from({length:12},(_,index)=>`<img class="exchange-spark exchange-spark-${index}" src="assets/spell-hearts-star-fragment.webp" alt="">`).join('');
  dialog.innerHTML=`<div class="exchange-animation-box" aria-label="交換中"><div class="exchange-magic-ring"></div>${sparks}<img class="exchange-core-shard" src="assets/spell-hearts-star-fragment.webp" alt="星のカケラ"><img class="exchange-reward-card" src="${item.image}" alt="astrologian ${item.name}"><p>星のカケラが光をまとっていく……</p></div>`;
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
    if(!isGameOwner()&&readStardust()<10){dialog.querySelector('.item-exchange-confirm-box').innerHTML='<p>星のカケラが足りません。</p><button type="button" class="exchange-confirm-no">戻る</button>';dialog.querySelector('.exchange-confirm-no').onclick=close;return;}
    if(!isGameOwner())localStorage.setItem(shardKey(),String(readStardust()-10));renderSummonStock();
    grantAstrologian(item.key);
    playExchangeAnimation(dialog,item,()=>{
      dialog.innerHTML=`<div class="item-exchange-confirm-box"><img src="${item.image}" alt="astrologian ${item.name}"><p>astrologian ${item.name}を交換しました！</p><button type="button" class="exchange-confirm-no">閉じる</button></div>`;
      dialog.querySelector('.exchange-confirm-no').onclick=close;
    });
  };
}
const normalDressupItems={
  'バトルカード':[
    {key:'rock',name:'グー',image:'assets/rock.webp'},
    {key:'scissors',name:'チョキ',image:'assets/scissors.webp'},
    {key:'paper',name:'パー',image:'assets/paper.webp'},
    {key:'amplify',name:'アンプリファイア',image:'assets/amplify.webp'}
  ],
  'バトルカードシュリンク':[{name:'ノーマル',image:'assets/red-battle-back.webp'}],
  'スペルカードシュリンク':[{name:'ノーマル',image:'assets/blue-spell-back.webp'}]
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
  if(category==='バトルカード'&&Object.keys(cosmeticProfile.owned.battle.astrologian).length)series.push({key:'astrologian',name:'astrologian',image:'assets/astrologian-rock.webp'});
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
    hall.innerHTML='<div class="item-exchange-book" role="dialog" aria-modal="true" aria-labelledby="dressupTitle"><button class="item-exchange-close" type="button" aria-label="閉じる">×</button><p class="item-exchange-kicker">WARDROBE</p><h2 id="dressupTitle">着せ替え</h2><p class="item-exchange-copy">着せ替えたいカードの種類を選んでください</p><div class="item-exchange-categories"><button type="button" data-dressup-category="バトルカード"><img src="assets/rock.webp" alt="バトルカード"><span>バトルカード</span></button><button type="button" data-dressup-category="バトルカードシュリンク"><img src="assets/red-battle-back.webp" alt="バトルカードシュリンク"><span>バトルカード<br>シュリンク</span></button><button type="button" data-dressup-category="スペルカードシュリンク"><img src="assets/blue-spell-back.webp" alt="スペルカードシュリンク"><span>スペルカード<br>シュリンク</span></button></div><div class="item-exchange-detail" hidden><button class="item-exchange-detail-back" type="button">← カードの種類を選ぶ</button><div class="item-exchange-detail-content"></div></div><button class="item-exchange-return" type="button">戻る</button></div>';
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
    hall.innerHTML='<div class="item-exchange-book" role="dialog" aria-modal="true" aria-labelledby="itemExchangeTitle"><button class="item-exchange-close" type="button" aria-label="閉じる">×</button><p class="item-exchange-kicker">ARCANE EXCHANGE</p><h2 id="itemExchangeTitle">アイテム交換所</h2><p class="item-exchange-copy">交換したいカードの種類を選んでください</p><div class="item-exchange-categories"><button type="button" data-exchange-category="バトルカード"><img src="assets/rock.webp" alt="バトルカード"><span>バトルカード</span></button><button type="button" data-exchange-category="バトルカードシュリンク"><img src="assets/red-battle-back.webp" alt="バトルカードシュリンク"><span>バトルカード<br>シュリンク</span></button><button type="button" data-exchange-category="スペルカードシュリンク"><img src="assets/blue-spell-back.webp" alt="スペルカードシュリンク"><span>スペルカード<br>シュリンク</span></button></div><div class="item-exchange-detail" hidden><button class="item-exchange-detail-back" type="button">← カードの種類を選ぶ</button><div class="item-exchange-detail-content"></div></div><button class="item-exchange-return" type="button">召喚の門へ戻る</button></div>';
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
  document.querySelectorAll('.summon-shard-total').forEach(node=>node.textContent=displayedStardust());
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
    dialog.innerHTML='<div class="summon-animation-box" aria-label="召喚中"><img class="summon-vortex" src="assets/spell-hearts-star-vortex.webp" alt=""><img class="summon-animation-gate" src="assets/spell-hearts-summon-gate.webp" alt=""><div class="summon-particles"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><img class="summon-falling-shard" src="assets/spell-hearts-star-fragment.webp" alt="星のカケラ"></div>';
    setTimeout(()=>{
      if(!isGameOwner())localStorage.setItem(tokenKey(),String(readTokens()-10));
      if(!isGameOwner())localStorage.setItem(shardKey(),String(readStardust()+1));
      renderTokenBalance();renderSummonStock();
      dialog.classList.remove('summoning');
      dialog.innerHTML='<div class="summon-confirm-box summon-result-box"><img class="summon-result-shard" src="assets/spell-hearts-star-fragment.webp" alt="星のカケラ"><p>星のカケラがひとつ落ちてきました</p><button type="button" class="summon-confirm-no">受け取る</button>';
      dialog.querySelector('.summon-confirm-no').onclick=()=>dialog.hidden=true;
    },2600);
  };
}
function makeSummonButton(){
  const title=document.querySelector('#titleScreen');
  if(!title||document.querySelector('#summonButton'))return;
  const button=document.createElement('button');
  button.id='summonButton';button.className='summon-button';button.type='button';button.setAttribute('aria-label','召喚の門を開く');
  button.innerHTML='<span>召 喚</span><img class="summon-portal" src="assets/spell-hearts-summon-gate.webp" alt="">';
  button.onclick=openSummonGate;title.append(button);
}
function makeDressupButton(){
  const title=document.querySelector('#titleScreen');
  if(!title||document.querySelector('#dressupButton'))return;
  const button=document.createElement('button');
  button.id='dressupButton';button.className='dressup-button';button.type='button';button.setAttribute('aria-label','着せ替え');
  button.innerHTML='<span>着せ替え</span><img class="dressup-card" src="assets/spell-hearts-dressup-card.webp" alt="">';
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
function claimStoryChapterReward(chapter,amount){
  if(!currentUser||currentUser.isAnonymous)return false;
  const rewardKey=`spellHeartsStoryReward:${currentUser.uid}:${chapter}`;
  if(localStorage.getItem(rewardKey)==='claimed')return false;
  window.awardSpellHeartsTokens?.(amount,`story-${chapter}`);
  localStorage.setItem(rewardKey,'claimed');
  return true;
}

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
  const chapterMusic=document.querySelector('#chapterOneBgm'); if(chapterMusic&&!chapterMusic.dataset.fading)chapterMusic.volume=bgm/100;
  const tutorialMusic=document.querySelector('#tutorialBattleBgm'); if(tutorialMusic&&!tutorialMusic.dataset.fading)tutorialMusic.volume=bgm/100;
  const villageAmbience=document.querySelector('#villageAmbience'); if(villageAmbience&&!villageAmbience.dataset.fading)villageAmbience.volume=bgm/100*.42;
  const villageDanger=document.querySelector('#villageDangerBgm'); if(villageDanger)villageDanger.volume=bgm/100;
  document.querySelectorAll('#cardFlipSfx,#pursuitSfx,#blockSfx,#schemeSfx,#damageSfxOne,#damageSfxTwo,#winFanfare').forEach(sound=>sound.volume=(sound.id==='pursuitSfx'?sfx*.57:sound.id==='winFanfare'?sfx*.82:sfx)/100);
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
function storyProgressKey(){return `spellHeartsStoryProgress:${currentUser?.uid||'guest'}`;}
function unlockedStoryChapter(){return Math.max(1,Math.min(2,Number.parseInt(localStorage.getItem(storyProgressKey())||'1',10)||1));}
function playStoryModeSelectSfx(){
  let sound=document.querySelector('#storyModeSelectSfx');
  if(!sound){sound=document.createElement('audio');sound.id='storyModeSelectSfx';sound.src='assets/story-mode-select.mp3';sound.preload='none';document.body.append(sound);}
  sound.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsSfxVolume')??70)/100));
  sound.currentTime=0;sound.play().catch(()=>{});
}
function playChapterOneSelectSfx(){
  let sound=document.querySelector('#chapterOneSelectSfx');
  if(!sound){sound=document.createElement('audio');sound.id='chapterOneSelectSfx';sound.src='assets/chapter-one-select.mp3';sound.preload='none';document.body.append(sound);}
  sound.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsSfxVolume')??70)/100));
  sound.currentTime=0;sound.play().catch(()=>{});
}
function preloadStorySelectSfx(){
  for(const [id,src] of [['storyModeSelectSfx','assets/story-mode-select.mp3'],['chapterOneSelectSfx','assets/chapter-one-select.mp3']]){
    if(document.querySelector('#'+id))continue;
    const sound=document.createElement('audio');sound.id=id;sound.src=src;sound.preload='none';sound.load();document.body.append(sound);
  }
}
function playAmplifyChargeSfx(){
  let sound=document.querySelector('#amplifyChargeSfx');
  if(!sound){sound=document.createElement('audio');sound.id='amplifyChargeSfx';sound.src='assets/amplify-charge-sfx.mp3';sound.preload='none';document.body.append(sound);}
  sound.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsSfxVolume')??70)/100));
  sound.currentTime=0;sound.play().catch(()=>{});
}
function installAmplifyChargeSfx(){
  const original=window.slideCard;
  if(typeof original!=='function'||original.amplifyChargeSfxInstalled)return;
  const enhanced=function(fromSelector,toSelector,...rest){if(toSelector==='#pCharge'||toSelector==='#cCharge')playAmplifyChargeSfx();return original.call(this,fromSelector,toSelector,...rest);};
  enhanced.amplifyChargeSfxInstalled=true;window.slideCard=enhanced;
}
function playEnhancedHpSfx(kind){
  const id=kind==='drain'?'enhancedSchemeDrainSfx':'enhancedBlockHealSfx';
  const source=kind==='drain'?'assets/enhanced-scheme-drain-sfx.mp3':'assets/enhanced-block-heal-sfx.mp3';
  let sound=document.querySelector('#'+id);
  if(!sound){sound=new Audio(source);sound.id=id;sound.preload='auto';document.body.append(sound);}
  sound.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsSfxVolume')??70)/100))*.72;
  sound.currentTime=0;sound.play().catch(()=>{});
}
function showHolyHpGlow(effect){
  for(const side of ['p','c']){
    if(Number(effect.to?.[side])<=Number(effect.old?.[side]))continue;
    const hp=document.querySelector('#'+side+'Hp');
    if(!hp)continue;
    hp.classList.remove('holy-hp-heal');void hp.offsetWidth;hp.classList.add('holy-hp-heal');
    setTimeout(()=>hp.classList.remove('holy-hp-heal'),1450);
  }
}
const holyHealStyle=document.createElement('style');
holyHealStyle.textContent='.hp.holy-hp-heal{z-index:45!important;color:#fff9bf!important;text-shadow:0 0 4px #fff,0 0 12px #ffe66d,0 0 24px #e9b43d,0 2px 5px #000!important;animation:holy-hp-heal-pulse 1.45s ease-out both!important}.hp.holy-hp-heal:before,.hp.holy-hp-heal:after{content:"✦";position:absolute;top:50%;color:#fffbd3;font:20px/1 Georgia,serif;text-shadow:0 0 6px #fff,0 0 14px #ffd75b;pointer-events:none;animation:holy-hp-spark 1.2s ease-out both}.hp.holy-hp-heal:before{left:-22px}.hp.holy-hp-heal:after{right:-22px;animation-delay:.14s}@keyframes holy-hp-heal-pulse{0%{filter:brightness(1);transform:scale(1)}22%{filter:brightness(2.2);transform:scale(1.14)}56%{filter:brightness(1.6);transform:scale(1.05)}100%{filter:brightness(1);transform:scale(1)}}@keyframes holy-hp-spark{0%{opacity:0;transform:translateY(9px) scale(.5)}28%{opacity:1}100%{opacity:0;transform:translateY(-26px) scale(1.2)}}';
document.head.append(holyHealStyle);
function installEnhancedSpellHpSfx(tries=0){
  const original=window.runDamage;
  if(typeof original!=='function'){
    if(tries<30)setTimeout(()=>installEnhancedSpellHpSfx(tries+1),80);
    return;
  }
  if(original.enhancedSpellHpSfxInstalled)return;
  const enhanced=function(effect){
    /* HPが増え、かつダメージも同時に起きるのは強化謀略。回復のみは強化ブロック。 */
    if(!effect.started){
      const healed=['p','c'].some(side=>Number(effect.to?.[side])>Number(effect.old?.[side]));
      const damaged=['p','c'].some(side=>Number(effect.damage?.[side])>0);
      if(healed)setTimeout(()=>{showHolyHpGlow(effect);playEnhancedHpSfx(damaged?'drain':'heal');},640);
    }
    return original.apply(this,arguments);
  };
  enhanced.enhancedSpellHpSfxInstalled=true;
  window.runDamage=enhanced;
}
setTimeout(installEnhancedSpellHpSfx,0);
function localBattleAsset(card){
  const file=window.getSpellHeartsBattleArt?.(window.getSpellHeartsCosmetics?.(),card)||battleArt[card];
  return file?`assets/${file}`:'';
}
function localSpellShrinkAsset(){
  /* 裏面デザインが追加された際も、所持・装備設定の参照先をここへ集約する。 */
  const cosmetics=window.getSpellHeartsCosmetics?.();
  const series=cosmetics?.spellShrink||'normal';
  return series==='normal'?'assets/red-spell-back.webp':'assets/red-spell-back.webp';
}
const spellShrinkArt={normal:{p:'red-spell-back.webp',c:'blue-spell-back.webp'}};
window.getSpellHeartsSpellShrinkArt=(cosmetics,side)=>{
  const series=cosmetics?.spellShrink||'normal';
  return spellShrinkArt[series]?.[side]||spellShrinkArt.normal[side];
};
function installLocalCosmeticSync(){
  const original=window.slideCard;
  if(typeof original==='function'&&!original.localCosmeticSyncInstalled){
    const enhanced=function(fromSelector,toSelector,source){
      if((fromSelector==='#pCharge'||toSelector==='#pCharge')&&/amplify\.jpg(?:$|[?#])/.test(source))source=localBattleAsset('amplify')||source;
      return original.call(this,fromSelector,toSelector,source);
    };
    enhanced.localCosmeticSyncInstalled=true;window.slideCard=enhanced;
  }
  const sync=()=>{
    const amplifier=document.querySelector('#pCharge img');if(amplifier)amplifier.src=localBattleAsset('amplify')||amplifier.src;
    const spell=document.querySelector('#pChargeSpell img');if(spell&&spell.dataset.shrinkBack==='true')spell.src=localSpellShrinkAsset();
  };
  const stage=document.querySelector('.stage');if(stage){new MutationObserver(sync).observe(stage,{childList:true,subtree:true});sync();}
}
function tutorialLock(){
  let lock=document.querySelector('#tutorialInputLock');
  if(!lock){lock=document.createElement('div');lock.id='tutorialInputLock';document.body.append(lock);}
  lock.hidden=false;lock.classList.remove('focus');lock.replaceChildren();
  return lock;
}
function tutorialUnlock(){const lock=document.querySelector('#tutorialInputLock');if(lock){lock.hidden=true;lock.replaceChildren();}}
function tutorialDialogue(text,next){
  const intro=document.querySelector('#tutorialBattleIntro');if(!intro)return;
  const dialogue=intro.querySelector('.tutorial-battle-dialogue'),copy=dialogue.querySelector('p');
  intro.hidden=false;intro.classList.add('show');copy.textContent=text;
  dialogue.onclick=()=>{resumeTutorialBattleBgm();if(typeof next==='function')next();};
  tutorialLock();
}
function tutorialFocusElement(target,onChoose){
  const intro=document.querySelector('#tutorialBattleIntro'),lock=tutorialLock();
  const resolve=typeof target==='function'?target:()=>target;
  intro.hidden=true;intro.classList.remove('show');lock.classList.add('focus');
  let active=null,activeHand=null,finished=false;
  const clear=()=>{
    if(active){active.classList.remove('tutorial-focus-target');active.style.removeProperty('pointer-events');active.style.removeProperty('z-index');active.style.removeProperty('position');}
    if(activeHand){activeHand.style.removeProperty('position');activeHand.style.removeProperty('z-index');activeHand.querySelectorAll('.pick').forEach(card=>card.style.removeProperty('pointer-events'));}
    active=null;activeHand=null;
  };
  // 座標を別の要素へ写さず、見えている実カードを直接発光・最前面化する。
  // これで再描画や高解像度端末でも誘導枠がずれない。
  const sync=()=>{
    if(finished)return;
    const current=resolve();
    if(!current||!current.isConnected||current===active){requestAnimationFrame(sync);return;}
    clear();active=current;active.classList.add('tutorial-focus-target');active.style.zIndex='170';
    const hand=active.closest('.picks');
    if(hand){activeHand=hand;active.style.position='relative';hand.style.position='relative';hand.style.zIndex='170';hand.querySelectorAll('.pick').forEach(card=>card.style.pointerEvents=card===active?'auto':'none');}
    requestAnimationFrame(sync);
  };
  const choose=event=>{
    const current=resolve();
    event.preventDefault();event.stopImmediatePropagation();
    if(!current||!current.contains(event.target))return;
    finished=true;document.removeEventListener('click',choose,true);clear();resumeTutorialBattleBgm();tutorialUnlock();onChoose?.();
  };
  document.addEventListener('click',choose,true);requestAnimationFrame(sync);
}
function tutorialFocus(selector,onChoose){tutorialFocusElement(()=>document.querySelector(selector),onChoose);}
function tutorialFocusCard(card,onChoose){
  tutorialFocusElement(()=>[...document.querySelectorAll('#pBattle .pick')].find(button=>button.getAttribute('onclick')?.includes(`pick('${card}')`)),onChoose);
}
function tutorialGlowCard(card){
  document.querySelectorAll('#pBattle .pick').forEach(button=>button.classList.toggle('tutorial-card-glow',button.getAttribute('onclick')?.includes(`pick('${card}')`)));
}
function tutorialGlowHp(on){
  for(const id of ['pHp','cHp'])document.querySelector('#'+id)?.classList.toggle('tutorial-hp-glow',on);
}
function tutorialWaitFor(ready,done,tries=0){
  if(ready()){done?.();return;}
  if(tries<150)setTimeout(()=>tutorialWaitFor(ready,done,tries+1),100);
}
function tutorialPick(card,cpu,onResolved){
  tutorialFocusCard(card,()=>{
    window.setSpellHeartsTutorialCpuChoice?.(cpu);
    window.pick?.(card);
    tutorialWaitFor(()=>typeof g!=='undefined'&&g.phase==='spell',onResolved);
  });
}
function tutorialUseSpell(onDone){
  tutorialFocus('#pChargeSpell',()=>{
    window.use?.('p');window.render?.();if(typeof g!=='undefined')g.pOk=true;
    setTimeout(onDone,1300);
  });
}
function tutorialFinishRound(nextRound,next){
  if(typeof g==='undefined')return;
  let completed=false,move=()=>{if(completed)return;completed=true;next?.();};
  g.pOk=true;g.cOk=true;g.cpuSpellReady=true;
  window.endRound?.();
  tutorialWaitFor(()=>typeof g!=='undefined'&&g.round>=nextRound&&g.phase==='pick',move);
  setTimeout(()=>{
    if(typeof g==='undefined'||g.round>=nextRound)return;
    g.round=nextRound;g.phase='pick';g.chooser=true;g.now=null;g.damageEffect=null;window.render?.();move();
  },6000);
}
function tutorialRoundOne(){
  tutorialDialogue('では実戦だ。グーを選んでみろ。俺はチョキを出す。',()=>tutorialPick('rock','scissors',()=>{
    tutorialDialogue('見事だ。グーはチョキに勝つ。ここでは、追い打ちを使える。',()=>{
      tutorialDialogue('スペルカードは、使っても使わなくてもいい。\n使わない場合は、バトルカード山札の「OK！」を押すんだ。',()=>{
        tutorialDialogue('今回は追い打ちを使ってみろ。',()=>tutorialUseSpell(()=>{
          tutorialDialogue('追い打ちは、バトルに勝ったときに使えるスペルだ。\n相手に与えるダメージを、さらに1増やす。',()=>tutorialFinishRound(2,tutorialRoundTwo));
        }));
      });
    });
  }));
}
function tutorialRoundTwo(){
  tutorialDialogue('次はチョキだ。俺のグーには負けるが、\nブロックを使えば被害を抑えられる。',()=>tutorialPick('scissors','rock',()=>{
    tutorialDialogue('惜しい。チョキはグーに負ける。だが、ここでブロックの出番だ。',()=>tutorialUseSpell(()=>{
      tutorialDialogue('ブロックは負けたときに使える。\n受けるダメージを1減らせる。',()=>tutorialFinishRound(3,tutorialRoundThree));
    }));
  }));
}
function tutorialRoundThree(){
  if(typeof g!=='undefined'){g.c.spell='block';window.render?.();}
  tutorialDialogue('最後はパーだ。俺もパーを出すから、あいこになる。',()=>tutorialPick('paper','paper',()=>{
    tutorialDialogue('あいこでは互いに1ダメージを受ける。\nここでは謀略を使ってみよう。',()=>tutorialUseSpell(()=>{
      tutorialDialogue('謀略はあいこのときに使える。\n自分だけダメージを受けずに済む。',tutorialBeginAmplifyLesson);
    }));
  }));
}
function tutorialBeginAmplifyLesson(){
  tutorialDialogue('次はアンプリファイアだ。盤面を整えて、\nその力を実際に確かめてみよう。',()=>{
    window.start?.();window.setBattleBackdrop?.('story-training-ground.webp');
    if(typeof g!=='undefined'){g.p.deck=['scheme','block','pursuit'];g.c.deck=['pursuit','block','scheme'];}
    setTimeout(()=>tutorialDialogue('まずは、スペルカードをドローして追い打ちを用意しよう。',()=>tutorialFocus('#pSpell',()=>{
      window.drawInitial?.();
      setTimeout(()=>tutorialDialogue('準備完了だ。次はアンプリファイアを出してみろ。\n俺はグーを出す。',()=>{
        window.openBattle?.();setTimeout(()=>tutorialPick('amplify','rock',tutorialExplainAmplify),350);
      }),680);
    })),500);
  });
}
function tutorialExplainAmplify(){
  tutorialDialogue('アンプリファイアは、バトルカードの代わりに出す特殊カードだ。',()=>{
    tutorialDialogue('そのターンは相手の攻撃を無条件に受ける。\nだから出すタイミングが大切になる。',()=>{
      tutorialDialogue('その代わり、次に使用するスペルの効果を強化できる。',()=>{
        tutorialDialogue('強化したスペルを使うと、アンプリファイアは墓地へ送られる。\nアンプリファイアを含めて、墓地に送られたスペルカードは、そのゲーム中はもう使えない。',()=>tutorialFinishRound(2,tutorialAmplifiedPursuit));
      });
    });
  });
}
function tutorialAmplifiedPursuit(){
  tutorialDialogue('次はパーだ。俺のグーに勝って、\n強化された追い打ちを使ってみろ。',()=>tutorialPick('paper','rock',()=>{
    tutorialDialogue('パーの5ダメージに、強化追い打ちの3ダメージが加わる。\n合計8ダメージだ。',()=>tutorialUseSpell(()=>{
      tutorialDialogue('残りHPは2。次の一手で決めよう。',()=>tutorialFinishRound(3,tutorialFinalStrike));
    }));
  }));
}
function coverStoryCurtain(curtain){
  curtain.classList.remove('lift');
  curtain.style.setProperty('z-index','2147483647','important');
  curtain.style.setProperty('opacity','1','important');
  curtain.style.setProperty('transition','none','important');
  void curtain.offsetWidth;
}
function revealStoryCurtain(curtain){
  curtain.style.removeProperty('opacity');
  curtain.style.removeProperty('transition');
  void curtain.offsetWidth;
  curtain.classList.add('lift');
}
function tutorialFinishChapterOne(scene){
  stopChapterOneBgm();
  const title=document.querySelector('#titleScreen');
  let curtain=document.querySelector('#tutorialBattleCurtain');
  if(!curtain){curtain=document.createElement('div');curtain.id='tutorialBattleCurtain';curtain.classList.add('lift');document.body.append(curtain);}
  curtain.classList.add('returning');
  requestAnimationFrame(()=>requestAnimationFrame(()=>coverStoryCurtain(curtain)));
  /* 暗転が完全に覆うまでストーリー背景を残し、盤面を露出させない。 */
  setTimeout(()=>{
    scene.hidden=true;scene.classList.remove('show','preparing','leaving');
    document.body.classList.remove('story-active','story-cinematic');title?.classList.remove('dismiss');title?.classList.add('chapter-title-reveal');startTitleBgm();
    requestAnimationFrame(()=>{revealStoryCurtain(curtain);requestAnimationFrame(()=>title?.classList.remove('chapter-title-reveal'));});
    setTimeout(()=>curtain.remove(),1150);
  },1120);
}
function tutorialReturnToStory(){
  tutorialUnlock();stopTutorialBattleBgm();
  document.body.classList.add('story-cinematic');
  let intro=document.querySelector('#tutorialBattleIntro'),scene=document.querySelector('#chapterOneScene'),curtain=document.querySelector('#tutorialBattleCurtain');
  if(!scene)return;
  if(!curtain){curtain=document.createElement('div');curtain.id='tutorialBattleCurtain';curtain.classList.add('lift');document.body.append(curtain);requestAnimationFrame(()=>requestAnimationFrame(()=>coverStoryCurtain(curtain)));}
  else{curtain.classList.add('returning');coverStoryCurtain(curtain);}
  setTimeout(()=>{
    intro?.classList.remove('show');if(intro)intro.hidden=true;
    const npc=scene.querySelector('.chapter-npc-card'),dialogue=scene.querySelector('.chapter-dialogue'),speaker=scene.querySelector('.chapter-speaker'),copy=dialogue.querySelector('p');
    const epilogue=[
      {speaker:'ユート',text:'流石だ。筋がいいぞ。'},
      {speaker:'ユート',text:'これからお前も戦場に出たり、誰かを守ったりすることもあるだろう。'},
      {speaker:'ユート',text:'そんなときは、今の戦い方を思い出すんだぞ。'},
      {speaker:'主人公',text:'・・・はい、ユート先輩！'}
    ];
    let lineIndex=0;
    const renderEpilogue=()=>{let line=epilogue[lineIndex],npcSpeaking=line.speaker==='ユート';speaker.textContent=line.speaker;copy.textContent=line.text;npc.classList.toggle('speaker-active',npcSpeaking);npc.classList.toggle('speaker-idle',!npcSpeaking);dialogue.dataset.ended=String(lineIndex===epilogue.length-1);};
    scene.hidden=false;scene.dataset.transitioning='false';scene.classList.remove('leaving');scene.classList.add('preparing','show');
    npc.hidden=false;npc.classList.remove('speaker-idle');npc.classList.add('speaker-active','enter');
    dialogue.hidden=false;dialogue.onclick=()=>{if(lineIndex<epilogue.length-1){lineIndex+=1;renderEpilogue();}else beginVillageEncounter(scene);};renderEpilogue();
    startChapterOneBgm();requestAnimationFrame(()=>revealStoryCurtain(curtain));
    setTimeout(()=>curtain.classList.remove('returning'),1050);
  },1120);
}
function beginVillageEncounter(scene){
  stopChapterOneBgm();
  let curtain=document.querySelector('#tutorialBattleCurtain');
  if(!curtain){curtain=document.createElement('div');curtain.id='tutorialBattleCurtain';document.body.append(curtain);}
  coverStoryCurtain(curtain);
  scene.classList.add('leaving');
  setTimeout(()=>{
    const senior=scene.querySelector('.chapter-npc-card');
    const dialogue=scene.querySelector('.chapter-dialogue');
    const speaker=scene.querySelector('.chapter-speaker');
    const copy=dialogue.querySelector('p');
    let wolf=scene.querySelector('.story-wolf-card'),warrior=scene.querySelector('.story-warrior-card');
    if(!wolf){wolf=document.createElement('img');wolf.className='chapter-story-card story-wolf-card';wolf.src='assets/story-wolf-monster.webp';wolf.alt='狼のような魔物';scene.append(wolf);}
    if(!warrior){warrior=document.createElement('img');warrior.className='chapter-story-card story-warrior-card';warrior.src='assets/story-woman-warrior.webp';warrior.alt='女性戦士';scene.append(warrior);}
    const lines=[
      {speaker:'主人公',text:'演習場からの帰り道、買い物をしていくことにした。'},
      {speaker:'主人公',text:'「えーと、あとは塩コショウ、玉ねぎ、それから……」\n呟きながら商店街を歩いていた。'},
      {speaker:'主人公',text:'――その時。'},
      {speaker:'主人公',text:'「キャアアアアアァァッ！」\n驚いて音のした方を向く。一瞬遅れて、女性の悲鳴が聞こえたことに気づいた。'},
      {speaker:'男の声',text:'「魔物だぁっ！」\n続けて近くにいた男性が叫ぶ。'},
      {speaker:'主人公',text:'魔物……！？ まさか防壁を超えてきたのか？\nそんな高さじゃないはずだが……。'},
      {speaker:'主人公',text:'「助けてぇ！！」\n声のした街の入口の方へ駆け出した。'},
      {speaker:'主人公',text:'本当に魔物だ……！ 女性が今にも襲われそうになっている。\nくそっ……やるしかないか。',wolf:true},
      {speaker:'主人公',text:'腰に下げた剣に手をかけるが、震えているのがわかる。\nしかし、このままでは取り返しのつかないことになる。',wolf:true},
      {speaker:'主人公',text:'力を振り絞って、なんとか喉から叫びを出した。\n「こっちを見ろ、魔物っ！」',wolf:true},
      {speaker:'主人公',text:'すると、狼のような魔物がこちらを向いた。',wolf:true},
      {speaker:'魔物',text:'「グルルルルル……」',wolf:true},
      {speaker:'主人公',text:'大きな体、虚ろな目。いかにも不気味だが、よく見るとかなり痩せ細っている。\n長い間、何も食べていないのだろう。',wolf:true},
      {speaker:'主人公',text:'しかし油断はできない。訓練で習った通り、魔物には十分気をつけなければ。\nなにより戦闘が始まれば、俺にとっては初めての実戦経験になる。',wolf:true},
      {speaker:'主人公',text:'目を見据え、お互い動かない時間が続く。\n――と、その時。',wolf:true},
      {speaker:'街の人々',text:'「うわああああっ！」\n「また魔物が来たぞ！」',wolf:true},
      {speaker:'主人公',text:'なんだって！？ コイツ一匹じゃなかったのか……！\n後方で叫び声が聞こえる。早く、眼の前の魔物を倒して向かわなければ……。',wolf:true},
      {speaker:'主人公',text:'しかし、緊張した体は言うことを聞いてくれない。\n剣に手をかけているのが精一杯だ。',wolf:true},
      {speaker:'主人公',text:'「ど……どうする！」\n万事休すか……！',wolf:true},
      {speaker:'？？？',text:'「キミ！」',wolf:true,warrior:true},
      {speaker:'主人公',text:'透き通るような声が響く。それは間違いなく俺へ向けられたものだった。',wolf:true,warrior:true},
      {speaker:'？？？',text:'キミ、戦える？',wolf:true,warrior:true},
      {speaker:'主人公',text:'僅かな時間を置いて質問の意図を理解した俺は、\n「っ……戦えます！」',wolf:true,warrior:true},
      {speaker:'？？？',text:'よし、ここは任せるよ！ 私は向こうへ！',wolf:true,warrior:true},
      {speaker:'主人公',text:'言うと、彼女はどよめく街中へ駆け出していった。\n向き直る。魔物は前足をギリギリと鳴らし、いつ襲いかかってきてもおかしくない。',wolf:true,warrior:false},
      {speaker:'主人公',text:'「いくぞ……！」\n俺は剣を抜いた。瞬間、魔物がこちらへ勢いよく駆け出してきた。',wolf:true,warrior:false}
    ];
    let index=0;
    const renderLine=()=>{
      const line=lines[index],wolfEntering=wolf.hidden&&line.wolf,warriorEntering=warrior.hidden&&line.warrior;
      speaker.textContent=line.speaker;copy.textContent=line.text;
      if(index===4)startVillageDangerBgm();
      wolf.hidden=!line.wolf;warrior.hidden=!line.warrior;
      if(wolfEntering){wolf.classList.remove('enter');void wolf.offsetWidth;wolf.classList.add('enter');}
      if(warriorEntering){warrior.classList.remove('enter');void warrior.offsetWidth;warrior.classList.add('enter');}
      wolf.classList.toggle('speaker-active',wolfEntering||line.speaker==='魔物');wolf.classList.toggle('speaker-idle',line.wolf&&!wolfEntering&&line.speaker!=='魔物');
      warrior.classList.toggle('speaker-active',warriorEntering||line.speaker==='？？？');warrior.classList.toggle('speaker-idle',line.warrior&&!warriorEntering&&line.speaker!=='？？？');
      dialogue.dataset.ended=String(index===lines.length-1);
    };
    senior.hidden=true;scene.classList.add('village-scene');scene.classList.remove('leaving');scene.hidden=false;dialogue.hidden=false;
    dialogue.onclick=()=>{if(index<lines.length-1){index+=1;renderLine();}else beginVillageBattle(scene);};
    renderLine();
    startVillageAmbience();
    requestAnimationFrame(()=>requestAnimationFrame(()=>revealStoryCurtain(curtain)));
  },980);
}
function beginVillageBattle(scene){
  stopVillageAmbience();stopVillageDangerBgm();
  let curtain=document.querySelector('#tutorialBattleCurtain');
  if(!curtain){curtain=document.createElement('div');curtain.id='tutorialBattleCurtain';document.body.append(curtain);}
  coverStoryCurtain(curtain);scene.classList.add('leaving');
  setTimeout(()=>{
    scene.hidden=true;scene.classList.remove('show','preparing','leaving');document.body.classList.remove('story-cinematic');
    window.storyWolfBattleActive=true;window.storyWolfBattleResolved=false;
    window.start?.();
    if(typeof g!=='undefined'){g.c.deck=['pursuit','scheme','block'];g.p.deck=['scheme','block','pursuit'];window.render?.();}
    window.setBattleBackdrop?.('story-village.webp');startWolfBattleBgm();
    let opponent=document.querySelector('#storyBattleOpponentCard');
    if(!opponent){opponent=document.createElement('img');opponent.id='storyBattleOpponentCard';opponent.className='story-battle-opponent-card';document.body.append(opponent);}
    opponent.src='assets/story-wolf-monster.webp';opponent.alt='狼のような魔物';opponent.hidden=false;
    let intro=document.querySelector('#villageBattleIntro');
    if(!intro){
      intro=document.createElement('section');intro.id='villageBattleIntro';
      intro.innerHTML='<button class="chapter-dialogue village-battle-dialogue" type="button" aria-label="会話を進める"><span class="chapter-speaker">主人公</span><p>思い出すんだ……ユート先輩が教えてくれたことを！</p><i class="chapter-next-mark" aria-hidden="true"></i></button>';
      document.body.append(intro);
    }
    intro.hidden=false;requestAnimationFrame(()=>{intro.classList.add('show');revealStoryCurtain(curtain);});
    intro.querySelector('.village-battle-dialogue').onclick=()=>{intro.classList.remove('show');setTimeout(()=>{intro.hidden=true;},350);};
    setTimeout(()=>curtain.remove(),1150);
  },1000);
}
function showWolfBattleContinue(){
  let overlay=document.querySelector('#wolfBattleContinue');
  if(!overlay){
    overlay=document.createElement('button');overlay.id='wolfBattleContinue';overlay.type='button';
    overlay.innerHTML='<span>画面をクリックして続ける</span>';
    document.body.append(overlay);
  }
  overlay.hidden=false;overlay.onclick=()=>beginWolfAftermath();
}
function beginWolfAftermath(){
  const overlay=document.querySelector('#wolfBattleContinue');if(overlay)overlay.hidden=true;
  const result=document.querySelector('#resultScreen');if(result){result.classList.remove('show');result.innerHTML='';result.onclick=null;}
  const opponent=document.querySelector('#storyBattleOpponentCard');if(opponent)opponent.hidden=true;
  window.storyWolfBattleActive=false;stopTutorialBattleBgm();const battleMusic=document.querySelector('#battleBgm');if(battleMusic){battleMusic.removeAttribute('data-story-keep-playing');battleMusic.pause();battleMusic.currentTime=0;}
  let scene=document.querySelector('#chapterOneScene'),curtain=document.querySelector('#tutorialBattleCurtain');
  if(!scene)return;
  if(!curtain){curtain=document.createElement('div');curtain.id='tutorialBattleCurtain';document.body.append(curtain);}
  document.body.classList.add('story-cinematic');coverStoryCurtain(curtain);
  setTimeout(()=>{
    let wolf=scene.querySelector('.story-wolf-card'),warrior=scene.querySelector('.story-warrior-card'),yuto=scene.querySelector('.chapter-npc-card');
    const dialogue=scene.querySelector('.chapter-dialogue'),speaker=scene.querySelector('.chapter-speaker'),copy=dialogue.querySelector('p');
    if(!wolf){wolf=document.createElement('img');wolf.className='chapter-story-card story-wolf-card';scene.append(wolf);}wolf.src='assets/story-wolf-monster.webp';wolf.alt='狼のような魔物';
    if(!warrior){warrior=document.createElement('img');warrior.className='chapter-story-card story-warrior-card';scene.append(warrior);}warrior.src='assets/story-woman-warrior.webp';warrior.alt='エア・ノエル';
    yuto.src='assets/story-senior-warrior.webp';yuto.alt='ユート先輩';
    const lines=[
      {speaker:'魔物',text:'「グアアアアッ！！」',wolf:true},
      {speaker:'主人公',text:'「これで……終わりだっ！」',wolf:true},
      {speaker:'主人公',text:'振り下ろした剣が魔物の体を切り裂く。',wolf:true},
      {speaker:'魔物',text:'「グォォォォ……」',wolf:true,vanishWolf:true},
      {speaker:'主人公',text:'「ハァ……ハァ……」'},
      {speaker:'主人公',text:'「そうだ、街中の方へ行かないと……！」'},
      {speaker:'主人公',text:'後ろで女性がお礼を言っているのが聞こえていたが、ほんの軽く頭を下げて、なりふり構わず走り出した。'},
      {speaker:'主人公',text:'街中に戻ると――'},
      {speaker:'？？？',text:'「ハァーーッ！！」',warrior:true},
      {speaker:'主人公',text:'気高く、しかし力強い叫びと共に、剣が風を纏って魔物の体を切り裂いていた。',warrior:true},
      {speaker:'主人公',text:'周りを見ると、5体もの魔物たちが息絶えていた。',warrior:true},
      {speaker:'主人公',text:'走ってきた俺は緊張と戦闘でクタクタだったが、女性は汗一つかいていなかった。何者なんだ、あの人……。',warrior:true},
      {speaker:'主人公',text:'女性は剣をしまい、こちらに気づくと険しい表情を緩め、笑顔を向けた。',warrior:true,smile:true},
      {speaker:'？？？',text:'あ……キミ！ 大丈夫だった？',warrior:true},
      {speaker:'主人公',text:'はい、なんとか……。',warrior:true},
      {speaker:'？？？',text:'よく頑張ったね、街を守ってくれてありがとう。',warrior:true},
      {speaker:'主人公',text:'それはこっちのセリフだ。5体も魔物を相手にして、盾にすら傷一つ付いていない。',warrior:true},
      {speaker:'主人公',text:'いえ、こちらこそありがとうございました。お強いんですね。',warrior:true},
      {speaker:'？？？',text:'まあこのくらいならね。今ちょうど外から帰ってきたところだったんだ。間に合ってよかった。',warrior:true},
      {speaker:'ユート',text:'おーい、大丈夫か！',warrior:true,yuto:true},
      {speaker:'？？？',text:'ユート！ 久しぶりじゃないか。',warrior:true,yuto:true},
      {speaker:'主人公',text:'どうやらユート先輩との知り合いらしい。旧知の仲なのだろうか。',warrior:true,yuto:true},
      {speaker:'ユート',text:'帰ってきてたのか！',warrior:true,yuto:true},
      {speaker:'主人公',text:'女性は俺達二人に向き直ると、俺に自己紹介をしてくれた。',warrior:true,yuto:true},
      {speaker:'？？？',text:'私の名前はエア。エア・ノエルだよ。よろしくね。',warrior:true,yuto:true},
      {speaker:'ユート',text:'訓練校まで一緒だった、俺の友達だ。',warrior:true,yuto:true},
      {speaker:'ユート',text:'二人とも、よく頑張ったな。とりあえず戦いの後片付けをしないとな。',warrior:true,yuto:true},
      {speaker:'主人公',text:'俺達は街の人達と協力して、魔物たちの亡骸を火葬した。土葬では臭いが残り、他の魔物を呼び寄せてしまうため、魔物の亡骸は火葬すると定められている。',warrior:true,yuto:true,night:true},
      {speaker:'ユート',text:'よし、あらかた片付いたな。3人で飯でも食いに行こう。今日は俺の奢りだ！',warrior:true,yuto:true,night:true},
      {speaker:'エア',text:'ほんと？ やったー！',warrior:true,yuto:true,night:true},
      {speaker:'主人公',text:'ありがとうございます！',warrior:true,yuto:true,night:true},
      {speaker:'主人公',text:'俺達は夜の街へと歩き出した。',warrior:true,yuto:true,night:true},
      {speaker:'主人公',text:'このときは気づく由もない。',warrior:true,yuto:true,night:true},
      {speaker:'主人公',text:'この戦いが、全ての始まりであったことを……。',warrior:true,yuto:true,night:true}
    ];
    let index=0;
    const renderLine=()=>{
      const line=lines[index];speaker.textContent=line.speaker;copy.textContent=line.text;
      wolf.hidden=!line.wolf;warrior.hidden=!line.warrior;yuto.hidden=!line.yuto;scene.classList.toggle('night-village',!!line.night);
      if(line.smile){warrior.src='assets/story-woman-warrior-smile.webp';stopVillageDangerBgm();startAirSmileBgm();}
      warrior.classList.toggle('smile-card',warrior.src.includes('story-woman-warrior-smile.webp'));
      wolf.classList.toggle('speaker-active',line.speaker==='魔物');wolf.classList.toggle('speaker-idle',line.wolf&&line.speaker!=='魔物');
      warrior.classList.toggle('speaker-active',line.speaker==='？？？'||line.speaker==='エア');warrior.classList.toggle('speaker-idle',line.warrior&&line.speaker!=='？？？'&&line.speaker!=='エア');
      yuto.classList.toggle('speaker-active',line.speaker==='ユート');yuto.classList.toggle('speaker-idle',line.yuto&&line.speaker!=='ユート');
      dialogue.dataset.ended=String(index===lines.length-1);
    };
    scene.hidden=false;scene.classList.remove('leaving');scene.classList.add('preparing','show','village-scene');dialogue.hidden=false;renderLine();
    dialogue.onclick=()=>{if(index<lines.length-1){index+=1;renderLine();}else showChapterOneEnd(scene);};
    startVillageDangerBgm();requestAnimationFrame(()=>revealStoryCurtain(curtain));setTimeout(()=>curtain.remove(),1150);
  },1000);
}
function showChapterOneEnd(scene){
  stopVillageDangerBgm();stopAirSmileBgm();let end=document.querySelector('#chapterOneEndScreen');
  if(!end){end=document.createElement('button');end.id='chapterOneEndScreen';end.type='button';end.innerHTML='<span>Chapter 1 END</span><small>クリックしてタイトルへ戻る</small>';document.body.append(end);}
  end.hidden=false;requestAnimationFrame(()=>end.classList.add('show'));
  end.onclick=()=>{if(claimStoryChapterReward('chapter-one',5))sessionStorage.setItem('spellHeartsStoryRewardNotice','5');window.returnToTitle?.();};
}
function installStoryWolfResultHandler(){
  const original=window.render;
  if(typeof original!=='function'||original.storyWolfResultHandlerInstalled)return;
  const wrapped=function(...args){
    const result=original.apply(this,args);
    if(window.storyWolfBattleActive&&typeof g!=='undefined'&&g?.phase==='end'){
      const resultScreen=document.querySelector('#resultScreen');
      if(resultScreen){resultScreen.querySelector('.result-actions')?.remove();resultScreen.onclick=()=>{if(!window.storyWolfBattleResolved){window.storyWolfBattleResolved=true;beginWolfAftermath();}};}
    }
    return result;
  };
  wrapped.storyWolfResultHandlerInstalled=true;window.render=wrapped;
}
setTimeout(installStoryWolfResultHandler,0);
function installStoryWolfBattleRules(){
  const originalPick=window.pick;
  if(typeof originalPick!=='function'||originalPick.storyWolfRulesInstalled)return;
  const losingCard={rock:'scissors',scissors:'paper',paper:'rock'};
  const forceEnhancedBlock=roundGame=>{
    let tries=0;
    const watch=()=>{
      if(!window.storyWolfBattleActive||typeof g==='undefined'||g!==roundGame||tries++>90)return;
      if(g.phase==='spell'&&g.round===2&&g.now?.r==='p'&&g.c.spell==='block'&&g.c.amp==='charged'){
        window.use?.('c');window.render?.();return;
      }
      setTimeout(watch,80);
    };
    watch();
  };
  const wrapped=function(card){
    if(window.storyWolfBattleActive&&typeof g!=='undefined'&&g.phase==='pick'){
      const roundGame=g;
      window.setSpellHeartsTutorialCpuChoice?.(g.round===1?'amplify':(losingCard[card]||'rock'));
      if(g.round===2)forceEnhancedBlock(roundGame);
    }
    return originalPick.apply(this,arguments);
  };
  wrapped.storyWolfRulesInstalled=true;window.pick=wrapped;
}
setTimeout(installStoryWolfBattleRules,0);
function tutorialFinalStrike(){
  tutorialDialogue('最後はチョキだ。俺はパーを出す。\n勝って、決着をつけよう。',()=>tutorialPick('scissors','paper',()=>{
    if(typeof g!=='undefined'){g.c.hp=0;g.phase='spell';window.render?.();}
    tutorialDialogue('よくやった。これで俺のHPは0だ。\n本来ならここで勝利となる。',()=>{
      tutorialDialogue('強化ブロックは、受けるダメージを0にして、\nさらに自分のHPを1回復する。',()=>{
        tutorialDialogue('強化謀略は、あいこのダメージを防ぐだけでなく、\n俺に2ダメージを与える強力な一手だ。',()=>{
          tutorialDialogue('よくやった、これで訓練は終了だ。',tutorialReturnToStory);
        });
      });
    });
  }));
}
function beginBattleCardLesson(){
  window.openBattle?.();
  setTimeout(()=>tutorialDialogue('バトルカードは4種類あるぞ。\n基本はグー、チョキ、パーのジャンケンだ。',()=>{
    tutorialDialogue('それと、アンプリファイアと呼ばれる特殊カードが1枚。',()=>{
      tutorialDialogue('バトルの基本はジャンケンだ。ただし普通のジャンケンではない。',()=>{
        tutorialGlowCard('rock');tutorialDialogue('グーで勝つと1ダメージ。',()=>{
          tutorialGlowCard('scissors');tutorialDialogue('チョキで勝つと2ダメージ。',()=>{
            tutorialGlowCard('paper');tutorialDialogue('パーで勝つと5ダメージ。',()=>{
              tutorialGlowCard('');tutorialGlowHp(true);tutorialDialogue('ジャンケンで勝った方が負けた方にダメージを与える。\n自分のHPは10ポイントで、先に相手のHPを0にした方の勝ちだ。',()=>{tutorialGlowHp(false);tutorialRoundOne();});
            });
          });
        });
      });
    });
  }),620);
}
function beginSpellDrawLesson(){
  tutorialFocus('#pSpell',()=>{
    if(typeof g!=='undefined'){g.p.deck=['scheme','block','pursuit'];g.c.deck=['pursuit','block','scheme'];}
    window.drawInitial?.();
    setTimeout(()=>tutorialDialogue('よし、いい感じだ。最初に引いたスペルカードは、\nチャージエリアに自分だけ見える形で伏せて置かれる。',()=>{
      tutorialDialogue('次は、このバトルカードをドローするんだ。',()=>tutorialFocus('#pBattle',beginBattleCardLesson));
    }),780);
  });
}
function beginChapterOneTutorial(scene){
  if(scene.dataset.transitioning==='true')return;
  scene.dataset.transitioning='true';
  stopChapterOneBgm();
  let curtain=document.querySelector('#tutorialBattleCurtain');
  if(!curtain){curtain=document.createElement('div');curtain.id='tutorialBattleCurtain';document.body.append(curtain);}
  coverStoryCurtain(curtain);
  scene.classList.add('leaving');
  setTimeout(()=>{
    scene.hidden=true;document.body.classList.remove('story-cinematic');
    window.start?.();
    window.setBattleBackdrop?.('story-training-ground.webp');
    let intro=document.querySelector('#tutorialBattleIntro');
    if(!intro){
      intro=document.createElement('section');intro.id='tutorialBattleIntro';
      intro.innerHTML='<img class="chapter-npc-card speaker-active" src="assets/story-senior-warrior.webp" alt="ユート先輩"><button class="chapter-dialogue tutorial-battle-dialogue" type="button" aria-label="会話を進める"><span class="chapter-speaker">ユート</span><p></p><i class="chapter-next-mark" aria-hidden="true"></i></button>';
      document.body.append(intro);
    }
    intro.hidden=false;
    startTutorialBattleBgm();
    requestAnimationFrame(()=>{intro.classList.add('show');revealStoryCurtain(curtain);});
    setTimeout(()=>curtain.remove(),950);
    setTimeout(()=>tutorialDialogue('よし、始めるぞ。まずは実際に手を動かして、\n戦い方を覚えていこう。',()=>{
      tutorialDialogue('戦闘は、まずお互いにこのスペルカードをドローするところから始まる。',beginSpellDrawLesson);
    }),980);
  },720);
}
function startChapterOne(){
  const panel=document.querySelector('#storyModePanel'),title=document.querySelector('#titleScreen');
  if(panel)panel.hidden=true;
  document.body.classList.add('story-active','story-cinematic');
  /* 背景はクリック直後から先読みし、曲も同じユーザー操作の中で開始許可を得る。 */
  preloadStoryVisuals();primeStoryMedia();
  stopTitleBgm();stopChapterOneBgm();startChapterOneBgm();
  const lines=[
    {speaker:'主人公',text:'……よし。次は、もう少し踏み込みを深くして――'},
    {speaker:'ユート',text:'お、今日も精が出るな。朝からずっとやってたのか？'},
    {speaker:'主人公',text:'ユート先輩。うん、昨日の型がどうにも決まらなくて。'},
    {speaker:'ユート',text:'真面目なのはいいことだ。でも、少し肩に力が入りすぎてる。'},
    {speaker:'ユート',text:'ほら、基本の型はこうだ。\n足を置いて、相手の動きを見てから手を出す。'},
    {speaker:'主人公',text:'なるほど……先に当てにいこうとしてた。'},
    {speaker:'ユート',text:'その通り。今日は俺が相手になる。\n遊びながら、戦い方のコツを教えてやるよ。'}
  ];
  let scene=document.querySelector('#chapterOneScene');
  if(!scene){
    scene=document.createElement('section');scene.id='chapterOneScene';scene.className='chapter-one-scene';
    scene.innerHTML='<button class="chapter-return-title" type="button">タイトルに戻る</button><img class="chapter-npc-card" src="assets/story-senior-warrior.webp" alt="ユート先輩" hidden><button class="chapter-dialogue" type="button" hidden aria-label="会話を進める"><span class="chapter-speaker"></span><p></p><i class="chapter-next-mark" aria-hidden="true"></i></button>';
    document.body.append(scene);
    scene.querySelector('.chapter-return-title').onclick=()=>{if(window.confirmReturnToTitle)window.confirmReturnToTitle();else location.href=location.pathname;};
  }
  const dialogue=scene.querySelector('.chapter-dialogue'),speaker=scene.querySelector('.chapter-speaker'),copy=dialogue.querySelector('p'),npc=scene.querySelector('.chapter-npc-card');
  let currentLine=0;
  const renderLine=()=>{
    const line=lines[currentLine],npcSpeaking=line.speaker==='ユート',wasHidden=npc.hidden;
    speaker.textContent=line.speaker;copy.textContent=line.text;
    npc.hidden=currentLine===0;
    if(!npc.hidden&&wasHidden){npc.classList.remove('enter');void npc.offsetWidth;npc.classList.add('enter');}
    npc.classList.toggle('speaker-active',npcSpeaking||(!npc.hidden&&wasHidden));
    npc.classList.toggle('speaker-idle',!npcSpeaking&&!wasHidden);
    dialogue.dataset.ended=String(currentLine===lines.length-1);
  };
  dialogue.onclick=()=>{if(currentLine<lines.length-1){currentLine+=1;renderLine();}else beginChapterOneTutorial(scene);};
  dialogue.hidden=true;npc.hidden=true;
  scene.hidden=false;scene.dataset.transitioning='false';scene.classList.remove('preparing','show','leaving');
  title?.classList.add('dismiss');
  scene.classList.add('preparing');
  setTimeout(()=>{scene.classList.add('show');},1120);
  setTimeout(()=>{if(scene.classList.contains('show')){dialogue.hidden=false;renderLine();}},2570);
}
window.startChapterOne=startChapterOne;
function openStoryMode(){
  if(!currentUser||currentUser.isAnonymous){
    window.openSpellHeartsLogin?.();
    const status=document.querySelector('.auth-status');if(status)status.textContent='ストーリーモードをプレイするには、ログインして下さい。';
    return;
  }
  preloadStoryVisuals();playStoryModeSelectSfx();
  let panel=document.querySelector('#storyModePanel');
  if(!panel){
    panel=document.createElement('section');panel.id='storyModePanel';panel.className='story-mode-panel';
    panel.innerHTML='<div class="story-mode-book" role="dialog" aria-modal="true" aria-labelledby="storyModeTitle"><button class="story-mode-close" type="button" aria-label="閉じる">×</button><p class="story-mode-kicker">SPELL HEART CHRONICLE</p><h2 id="storyModeTitle">ストーリーモード</h2><p class="story-mode-copy">進む道を選んでください</p><div class="story-chapters"></div><p class="story-mode-note"></p></div>';
    document.body.append(panel);
    panel.querySelector('.story-mode-close').onclick=()=>panel.hidden=true;
    panel.onclick=event=>{if(event.target===panel)panel.hidden=true;};
  }
  const unlocked=unlockedStoryChapter(),chapters=panel.querySelector('.story-chapters'),note=panel.querySelector('.story-mode-note');
  chapters.innerHTML=[1,2].map(chapter=>{
    const available=chapter<=unlocked;
    return `<button type="button" class="story-chapter ${available?'available':'locked'}" ${available?'':'disabled'} data-story-chapter="${chapter}"><span class="story-chapter-number">Chapter ${chapter}</span><small>${available?(chapter===1?'旅立ち':'挑戦できる章'):'🔒 LOCKED'}</small></button>`;
  }).join('');
  note.textContent=unlocked<2?'Chapter 1 をクリアすると、次の章が解放されます。':'すべての章が解放されています。';
  chapters.querySelectorAll('.story-chapter.available').forEach(button=>button.onclick=()=>{if(button.dataset.storyChapter==='1'){playChapterOneSelectSfx();startChapterOne();}else note.textContent=`Chapter ${button.dataset.storyChapter} は準備中です。`;});
  panel.hidden=false;
}
window.openStoryMode=openStoryMode;
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
    {chapter:'チュートリアル・最終頁',title:'アンプリファイア',body:'<div class="tutorial-rule tutorial-amp"><b>アンプリファイア</b><span>このバトルでは相手のダメージを受け、次に使うスペルを強化する。</span></div><div class="tutorial-rule tutorial-amp"><b>強化後</b><span>アンプリファイアを含めて、墓地に送られたスペルカードは、そのゲーム中は再使用できない。</span></div>',hint:'危険な一手が、決闘を覆す。準備は整った。',start:true}
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
preloadStorySelectSfx();
installLocalCosmeticSync();
installAmplifyChargeSfx();
installTitleBgm();
document.addEventListener('DOMContentLoaded',()=>{
  const pursuit=document.querySelector('#pursuitSfx');
  if(pursuit)pursuit.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsSfxVolume')??70)/100*.57));
  const fanfare=document.querySelector('#winFanfare');
  if(fanfare)fanfare.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('spellHeartsSfxVolume')??70)/100*.82));
});

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
itemExchangeStyle.textContent+='#dressupConfirm .item-exchange-confirm-box{width:min(94vw,480px)}#dressupConfirm .item-exchange-confirm-box p{white-space:nowrap;font-size:15px}@media(max-width:430px){#dressupConfirm .item-exchange-confirm-box{padding-left:12px;padding-right:12px}#dressupConfirm .item-exchange-confirm-box p{font-size:12px}}';
itemExchangeStyle.textContent+='.dressup-panel{overflow:auto}.dressup-panel .item-exchange-book{width:min(96vw,1160px);min-height:0;max-height:calc(100vh - 32px);padding:26px 44px 20px;overflow:auto}.dressup-panel .item-exchange-book h2{margin:5px 0 7px}.dressup-panel .item-exchange-copy{margin-bottom:14px}.dressup-panel .item-exchange-categories{gap:14px}.dressup-panel .item-exchange-categories button{min-height:164px;padding:8px}.dressup-panel .item-exchange-categories img{width:92px;height:116px;margin-bottom:6px}.dressup-panel .item-exchange-detail{min-height:0;padding:15px 8px 8px}.dressup-panel .item-exchange-detail-content{min-height:0;padding:14px}.dressup-panel .dressup-owned-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:min(100%,760px)}.dressup-panel .dressup-owned-items button{display:grid;grid-template-columns:112px 1fr;align-items:center;gap:10px;width:auto;min-width:0;padding:7px 10px;text-align:center}.dressup-panel .dressup-owned-items img{width:112px;height:142px;margin:0;object-fit:cover}.dressup-panel .item-exchange-return{margin-top:12px}@media(max-width:600px){.dressup-panel .item-exchange-book{width:min(98vw,600px);padding:24px 18px 18px}.dressup-panel .dressup-owned-items{gap:7px}.dressup-panel .dressup-owned-items button{grid-template-columns:76px 1fr;gap:5px;padding:5px;font-size:12px}.dressup-panel .dressup-owned-items img{width:76px;height:98px}.dressup-panel .item-exchange-categories button{min-height:138px;font-size:11px}.dressup-panel .item-exchange-categories img{width:62px;height:86px}}';
itemExchangeStyle.textContent+='@media(min-width:601px){.astrologian-items{grid-template-columns:repeat(4,1fr)}.astrologian-items img{height:155px}}';
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
const storyModeStyle=document.createElement('style');
storyModeStyle.textContent='.story-mode-panel{position:fixed;z-index:275;inset:0;display:grid;place-items:center;padding:20px;background:rgba(1,4,9,.8);backdrop-filter:blur(5px)}.story-mode-panel[hidden]{display:none}.story-mode-book{position:relative;width:min(92vw,610px);padding:42px 48px 40px;border:1px solid #d8ae4e;border-radius:8px;background:radial-gradient(ellipse at 50% 18%,rgba(74,54,101,.97),rgba(11,10,18,.99) 70%);box-shadow:inset 0 0 48px rgba(181,136,255,.15),0 22px 68px #000;color:#f7e7bc;text-align:center}.story-mode-book:before{content:"";position:absolute;inset:10px;border:1px solid rgba(225,184,77,.34);border-radius:4px;pointer-events:none}.story-mode-close{position:absolute;z-index:1;right:18px;top:14px;border:0;background:transparent;color:#e4cb82;font:29px/1 Georgia,serif;cursor:pointer}.story-mode-kicker,.story-mode-book h2,.story-mode-copy,.story-chapters,.story-mode-note{position:relative}.story-mode-kicker{margin:0;color:#c9b182;font:11px Georgia,serif;letter-spacing:.24em}.story-mode-book h2{margin:10px 0 9px;color:#fff0b0;font:32px Georgia,"Yu Mincho",serif;letter-spacing:.14em;text-shadow:0 0 14px #dba432}.story-mode-copy{margin:0 0 24px;color:#d9ca9f;font:14px "Yu Gothic",sans-serif}.story-chapters{display:grid;grid-template-columns:1fr 1fr;gap:18px}.story-chapter{min-height:164px;padding:20px 16px;border:1px solid rgba(216,174,78,.72);border-radius:5px;background:linear-gradient(145deg,rgba(48,39,63,.92),rgba(8,8,14,.96));box-shadow:inset 0 0 22px rgba(193,154,255,.11),0 5px 14px #0008;color:#ffe8a4;cursor:pointer;transition:transform .18s ease,filter .18s ease}.story-chapter.available{background:linear-gradient(145deg,rgba(38,113,153,.96),rgba(8,42,75,.98));box-shadow:inset 0 0 25px rgba(112,224,255,.26),0 5px 14px #0008}.story-chapter.available:hover{transform:translateY(-5px);filter:brightness(1.25)}.story-chapter-number{display:block;margin:22px 0 13px;font:25px Georgia,"Yu Mincho",serif;letter-spacing:.08em}.story-chapter small{display:block;color:#d7c394;font:12px "Yu Gothic",sans-serif}.story-chapter.available small{color:#c6f3ff}.story-chapter.locked{border-color:rgba(132,124,145,.48);background:linear-gradient(145deg,rgba(30,30,38,.9),rgba(8,8,12,.98));box-shadow:none;color:#777080;cursor:not-allowed;filter:saturate(.35)}.story-chapter.locked .story-chapter-number{color:#92899a}.story-mode-note{min-height:1.5em;margin:22px 0 0;color:#c5b68d;font:13px "Yu Gothic",sans-serif}@media(max-width:600px){.story-mode-book{padding:39px 26px 30px}.story-chapters{gap:9px}.story-chapter{min-height:135px;padding:14px 7px}.story-chapter-number{margin:17px 0 10px;font-size:19px}.story-mode-book h2{font-size:26px}}';
document.head.append(storyModeStyle);
const chapterOneStyle=document.createElement('style');
chapterOneStyle.textContent='.chapter-one-scene{position:fixed;z-index:215;inset:0;overflow:hidden;background:#020509 url("assets/story-training-ground.webp") center/cover no-repeat;opacity:0;visibility:hidden;transition:opacity 1.25s ease,visibility 1.25s ease}.chapter-one-scene:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,17,.1),rgba(2,5,10,.5) 78%,rgba(0,0,0,.76));pointer-events:none}.chapter-one-scene.show{opacity:1;visibility:visible}.chapter-return-title{position:absolute;z-index:3;top:14px;right:16px;padding:10px 18px;border:1px solid #d8ae4e;border-radius:4px;background:linear-gradient(180deg,rgba(81,57,18,.93),rgba(23,14,5,.96));box-shadow:inset 0 0 13px rgba(255,220,126,.18),0 2px 14px #0009;color:#fff0ba;font:15px Georgia,"Yu Mincho",serif;letter-spacing:.1em;text-shadow:0 1px 3px #000;cursor:pointer}.chapter-return-title:hover{filter:brightness(1.27)}.chapter-dialogue{position:absolute;z-index:2;left:50%;bottom:5.5vh;width:min(88vw,920px);min-height:144px;padding:26px 42px 30px;transform:translateX(-50%);border:1px solid #d8ae4e;border-radius:5px;background:rgba(4,5,9,.76);box-shadow:inset 0 0 22px rgba(255,217,129,.12),0 8px 26px #000b;color:#f9ead0;animation:chapter-dialogue-in .46s ease-out both}.chapter-dialogue[hidden]{display:none}.chapter-dialogue:before{content:"";position:absolute;inset:8px;border:1px solid rgba(225,184,77,.32);border-radius:2px;pointer-events:none}.chapter-speaker{position:absolute;left:26px;top:-17px;min-width:130px;padding:7px 17px;border:1px solid #d8ae4e;border-radius:3px;background:linear-gradient(180deg,rgba(59,43,18,.97),rgba(14,10,5,.98));color:#fff0ae;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.14em;text-align:center;text-shadow:0 1px 3px #000}.chapter-dialogue p{position:relative;margin:18px 20px 0;font:clamp(18px,2.25vw,28px)/1.7 "Yu Mincho",serif;letter-spacing:.08em;text-shadow:0 2px 4px #000}.chapter-next-mark{position:absolute;right:24px;bottom:16px;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:12px solid #f5d77c;filter:drop-shadow(0 1px 3px #000);animation:chapter-next-bob .82s ease-in-out infinite}.chapter-next-mark:before{content:"";position:absolute;left:-10px;top:-18px;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:12px solid #f5d77c}@keyframes chapter-dialogue-in{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes chapter-next-bob{0%,100%{transform:translateY(0);opacity:.56}50%{transform:translateY(7px);opacity:1}}@media(max-width:600px){.chapter-return-title{top:10px;right:10px;padding:8px 12px;font-size:12px}.chapter-dialogue{bottom:3.5vh;width:94vw;min-height:122px;padding:23px 16px 26px}.chapter-speaker{left:18px;top:-15px;min-width:104px;padding:6px 12px;font-size:13px}.chapter-dialogue p{margin:16px 8px 0;font-size:16px}.chapter-next-mark{right:17px;bottom:13px}}';
document.head.append(chapterOneStyle);
chapterOneStyle.textContent+='.chapter-one-scene{z-index:199;isolation:isolate;background:#020509}.chapter-one-scene.preparing{opacity:1;visibility:visible}.chapter-one-scene:before{content:"";position:absolute;z-index:0;inset:0;background:url("assets/story-training-ground.webp") center/cover no-repeat;opacity:0;transition:opacity 1.25s ease}.chapter-one-scene.show:before{opacity:1}.chapter-one-scene:after{z-index:1}.chapter-one-scene.show{opacity:1;visibility:visible}';
chapterOneStyle.textContent+='.chapter-dialogue{font:inherit;text-align:left;cursor:pointer}.chapter-dialogue[data-ended="true"] .chapter-next-mark{opacity:0}.chapter-npc-card{position:absolute;z-index:2;right:6vw;bottom:22vh;width:min(26vw,330px);max-height:66vh;object-fit:contain;transform-origin:bottom center;filter:brightness(.55) saturate(.65);opacity:.76;transition:transform .35s ease,filter .35s ease,opacity .35s ease;pointer-events:none}.chapter-npc-card[hidden]{display:none}.chapter-npc-card.enter{animation:chapter-npc-enter .55s cubic-bezier(.16,.82,.28,1) both}.chapter-npc-card.speaker-active{z-index:4;transform:translateX(-14px) scale(1.08);filter:brightness(1.13) saturate(1.07) drop-shadow(0 0 12px rgba(225,205,138,.45));opacity:1}.chapter-npc-card.speaker-idle{z-index:2;transform:translateX(18px) scale(.92);filter:brightness(.53) saturate(.67);opacity:.72}@keyframes chapter-npc-enter{from{opacity:0;transform:translateX(90px) scale(.72)}to{opacity:.76;transform:translateX(18px) scale(.92)}}@media(max-width:600px){.chapter-npc-card{right:1vw;bottom:20vh;width:32vw;max-height:48vh}.chapter-npc-card.speaker-active{transform:translateX(-4px) scale(1.04)}.chapter-npc-card.speaker-idle{transform:translateX(8px) scale(.9)}}';
chapterOneStyle.textContent+='.chapter-one-scene.leaving{opacity:0}.chapter-one-scene.leaving .chapter-dialogue,.chapter-one-scene.leaving .chapter-npc-card{pointer-events:none}#tutorialBattleCurtain{position:fixed;z-index:198;inset:0;background:#000;opacity:1;transition:opacity 1.1s ease;pointer-events:none}#tutorialBattleCurtain.lift{opacity:0}#tutorialBattleIntro{position:fixed;z-index:160;inset:0;opacity:0;pointer-events:none;transition:opacity .8s ease}#tutorialBattleIntro[hidden]{display:none}#tutorialBattleIntro.show{opacity:1}#tutorialBattleIntro .chapter-npc-card{position:fixed}#tutorialBattleIntro .tutorial-battle-dialogue{position:fixed;z-index:5;cursor:pointer;pointer-events:auto}#tutorialInputLock{position:fixed;z-index:155;inset:0;pointer-events:auto}#tutorialInputLock[hidden]{display:none}.tutorial-focus-button{position:fixed;z-index:1;border:2px solid #ffe37d;border-radius:7px;background:transparent;box-shadow:0 0 0 100vmax rgba(0,0,0,.76),0 0 12px 4px rgba(255,218,104,.9),inset 0 0 13px rgba(255,239,150,.5);cursor:pointer;animation:tutorial-target-pulse 1.05s ease-in-out infinite}@keyframes tutorial-target-pulse{0%,100%{filter:brightness(1);transform:scale(1)}50%{filter:brightness(1.36);transform:scale(1.035)}}.tutorial-card-glow{position:relative;z-index:25;filter:brightness(1.36)!important;box-shadow:0 0 0 2px #ffe584,0 0 23px 8px rgba(255,201,67,.9)!important;animation:tutorial-card-pulse 1s ease-in-out infinite}@keyframes tutorial-card-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}@media(max-width:600px){#tutorialBattleIntro .chapter-npc-card{right:1vw;bottom:20vh;width:32vw;max-height:48vh}}';
chapterOneStyle.textContent+='.story-active .battle-settings{z-index:230;left:34px;right:auto;top:58px}.story-active .battle-settings-panel{z-index:231;left:34px;right:auto;top:108px}.story-active #tutorialBattleIntro .chapter-npc-card{right:0}@media(max-width:600px){.story-active .battle-settings{left:16px;right:auto;top:50px}.story-active .battle-settings-panel{left:16px;right:auto;top:96px}.story-active #tutorialBattleIntro .chapter-npc-card{right:0}}';
chapterOneStyle.textContent+='.chapter-dialogue{width:min(94vw,1080px);min-height:170px;padding:29px 46px 33px}.chapter-dialogue p{margin:18px 20px 0;font-size:clamp(16px,1.85vw,23px);line-height:1.68;white-space:pre-line}@media(max-width:600px){.chapter-dialogue{min-height:138px;padding:24px 18px 28px}.chapter-dialogue p{margin:16px 8px 0;font-size:15px;line-height:1.6}}';
chapterOneStyle.textContent+='.story-active .below{display:none}';
chapterOneStyle.textContent+='body.story-cinematic main{visibility:hidden!important}';
chapterOneStyle.textContent+='#tutorialInputLock{background:transparent}.tutorial-focus-target{position:relative!important;z-index:auto!important;filter:none!important;outline:0!important;box-shadow:none!important;animation:none!important}';
chapterOneStyle.textContent+='#tutorialBattleCurtain,#tutorialBattleCurtain.returning{z-index:9999!important}';
chapterOneStyle.textContent+='#tutorialBattleCurtain{opacity:1!important;transition:none!important}#tutorialBattleCurtain.lift{opacity:0!important;transition:opacity 1.1s ease!important}';
chapterOneStyle.textContent+='#titleScreen.chapter-title-reveal{transition:none!important;opacity:1!important;visibility:visible!important}';
chapterOneStyle.textContent+='.tutorial-hp-glow{z-index:28!important}.tutorial-hp-glow:after{content:"";position:absolute;inset:-8px -12px;border:2px solid #ffe584;border-radius:6px;box-shadow:0 0 10px 3px rgba(255,224,112,.9),inset 0 0 10px rgba(255,229,141,.35);animation:tutorial-hp-pulse .9s ease-in-out infinite;pointer-events:none}@keyframes tutorial-hp-pulse{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:1;transform:scale(1.07)}}';
chapterOneStyle.textContent+='.chapter-one-scene.village-scene:before{background-image:url("assets/story-village.webp")}.chapter-one-scene.night-village:before{background-image:url("assets/story-village-night.webp")}.chapter-story-card{position:absolute;z-index:2;bottom:22vh;width:min(25vw,315px);max-height:67vh;object-fit:contain;transform-origin:bottom center;filter:brightness(.55) saturate(.65);opacity:.76;transition:transform .35s ease,filter .35s ease,opacity .35s ease;pointer-events:none}.chapter-story-card[hidden]{display:none}.chapter-story-card.enter{animation:chapter-story-card-enter .55s cubic-bezier(.16,.82,.28,1) both}.story-wolf-card{right:3vw}.story-warrior-card{left:3vw}.chapter-story-card.speaker-active{z-index:4;transform:translateX(0) scale(1.08);filter:brightness(1.13) saturate(1.07) drop-shadow(0 0 12px rgba(225,205,138,.45));opacity:1}.chapter-story-card.speaker-idle{z-index:2;transform:scale(.92);filter:brightness(.53) saturate(.67);opacity:.72}@keyframes chapter-story-card-enter{from{opacity:0;transform:translateY(28px) scale(.82)}to{opacity:1;transform:translateY(0) scale(1.08)}}#villageBattleIntro{position:fixed;z-index:160;inset:0;opacity:0;background:transparent;pointer-events:auto;transition:opacity .45s ease}#villageBattleIntro[hidden]{display:none}#villageBattleIntro.show{opacity:1}.village-battle-dialogue{position:fixed;z-index:5;cursor:pointer;pointer-events:auto}.story-battle-opponent-card{position:fixed;z-index:140;right:0;bottom:21vh;width:min(26vw,330px);max-height:66vh;object-fit:contain;filter:brightness(1.04) saturate(1.05) drop-shadow(0 0 13px rgba(194,158,83,.38));pointer-events:none}.story-battle-opponent-card[hidden],#wolfBattleContinue[hidden],#chapterOneEndScreen[hidden]{display:none}#wolfBattleContinue{position:fixed;z-index:250;inset:0;border:0;background:transparent;color:#fff0ad;cursor:pointer}#wolfBattleContinue span{position:absolute;left:50%;bottom:7vh;transform:translateX(-50%);padding:10px 18px;border:1px solid rgba(216,174,78,.72);background:rgba(4,5,9,.8);font:16px Georgia,"Yu Mincho",serif;letter-spacing:.12em}#chapterOneEndScreen{position:fixed;z-index:10000;inset:0;border:0;background:rgba(0,0,0,.86);color:#fff0b4;opacity:0;cursor:pointer;transition:opacity .8s ease}#chapterOneEndScreen.show{opacity:1}#chapterOneEndScreen span{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);font:clamp(34px,5vw,72px) Georgia,"Yu Mincho",serif;letter-spacing:.16em;text-shadow:0 0 20px #d99a22,0 3px 8px #000}#chapterOneEndScreen small{position:absolute;left:50%;top:59%;transform:translateX(-50%);font:14px "Yu Gothic",sans-serif;letter-spacing:.12em;color:#d8c58d}@media(max-width:600px){.chapter-story-card{bottom:20vh;width:31vw;max-height:48vh}.story-wolf-card{right:0}.story-warrior-card{left:0}.story-battle-opponent-card{right:0;bottom:20vh;width:32vw;max-height:48vh}}';
function showStoryRewardNotice(){const amount=Number(sessionStorage.getItem('spellHeartsStoryRewardNotice')||0);if(!amount)return;sessionStorage.removeItem('spellHeartsStoryRewardNotice');const notice=document.createElement('div');notice.className='story-reward-notice';notice.innerHTML=`<b>ストーリークリア報酬！</b><span><img src="assets/spell-hearts-token.webp" alt="金貨">金貨を ${amount} 枚手に入れました</span>`;document.body.append(notice);setTimeout(()=>notice.remove(),5000);}setTimeout(showStoryRewardNotice,350);
chapterOneStyle.textContent+='.story-reward-notice{position:fixed;z-index:300;left:50%;top:50%;width:min(86vw,480px);padding:28px 30px;border:1px solid #d8ae4e;border-radius:7px;background:radial-gradient(ellipse at 50% 0,rgba(95,68,25,.98),rgba(11,9,11,.98) 72%);box-shadow:inset 0 0 30px rgba(255,217,129,.18),0 14px 48px #000;transform:translate(-50%,-50%);color:#fff0ae;text-align:center;animation:story-reward-in .45s ease-out both}.story-reward-notice b{display:block;margin-bottom:12px;font:26px Georgia,"Yu Mincho",serif;letter-spacing:.1em}.story-reward-notice span{display:flex;align-items:center;justify-content:center;gap:10px;font:18px "Yu Gothic",sans-serif}.story-reward-notice img{width:46px;height:46px;object-fit:contain;filter:drop-shadow(0 2px 5px #000)}@keyframes story-reward-in{from{opacity:0;transform:translate(-50%,-46%) scale(.92)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}';
chapterOneStyle.textContent+='.story-warrior-card.smile-card{box-sizing:border-box;padding:3px;border:2px solid rgba(229,196,116,.96);border-radius:6px;background:linear-gradient(135deg,#6d5429,#f2dc97,#5f461f);box-shadow:0 0 0 1px rgba(35,24,10,.95),0 0 13px rgba(241,211,129,.46),0 5px 15px #0008}';
const mobileLandscapeStyle=document.createElement('style');
mobileLandscapeStyle.textContent=`
/* 横向きスマホでは、画面の高さを基準に盤面と操作部を一画面へ収める。 */
@media (orientation:landscape) and (pointer:coarse), (orientation:landscape) and (max-height:620px){
  html,body{width:100%;min-height:100%;overflow-x:hidden}
  body{overscroll-behavior:none}
  main{width:100%;padding:3px 6px}
  .top{min-height:25px;margin:0 auto 2px;max-width:min(100%,calc((100vh - 78px)*1.67))}
  .top h1{font-size:clamp(16px,3vw,25px);line-height:1;letter-spacing:.1em}
  .top .btn{min-height:24px;padding:4px 8px;border-radius:4px;font-size:10px}
  .stage-wrap{overflow:visible!important}
  .stage{min-width:0!important;width:min(100%,calc((100vh - 78px)*1.67));max-width:100%;margin:0 auto}
  .below{max-width:min(100%,calc((100vh - 78px)*1.67));margin:2px auto;font-size:11px;line-height:1.25}
  .spell-info{margin:2px 4px;font-size:10px}
  .actions{margin:2px}.actions .btn{min-height:25px;padding:4px 9px;font-size:10px}
  .log{display:none}
  .message{font-size:clamp(8px,1.75vw,13px)}
  /* 展開した手札だけは十分なタップ領域を確保する。枠は実際の表示座標を追従する。 */
  .picks{transform:scale(1.04);transform-origin:center}
  #pBattle .picks{transform:scale(1.75);transform-origin:left top}
  #cBattle .picks{transform:scale(1.75);transform-origin:right top}
  .battle-settings{top:8px!important;right:8px!important;left:auto!important;transform:scale(.78);transform-origin:top right}
  .battle-settings-panel{top:42px!important;right:8px!important;left:auto!important;max-height:calc(100vh - 48px);overflow:auto;transform:scale(.82);transform-origin:top right}
  .story-active .battle-settings{top:8px!important;left:8px!important;right:auto!important;transform-origin:top left}
  .story-active .battle-settings-panel{top:42px!important;left:8px!important;right:auto!important;transform-origin:top left}

  #titleScreen{padding-bottom:10px}
  .title-menu{gap:4px;min-width:min(68vw,390px);transform:none}
  .push-screen{margin-bottom:3px!important;padding:7px 15px!important;font-size:clamp(14px,2.8vw,23px)!important}
  .room-form{padding:6px;width:min(66vw,340px);gap:5px}.room-form label{font-size:10px}.room-code{padding:6px 8px;font-size:13px}.room-enter{padding:0 9px;font-size:12px}.room-note{font-size:9px}
  .title-login{top:10px!important;right:12px!important;padding:7px 12px!important;font-size:14px!important}.title-login::before{font-size:12px!important}
  .title-settings{top:8px!important;left:12px!important;width:32px!important;height:32px!important;font-size:19px!important}
  .settings-panel{top:46px!important;left:10px!important;width:218px!important;max-height:calc(100vh - 52px);overflow:auto;padding:10px;font-size:11px}
  .settings-panel label{margin:6px 0}.settings-heading{margin-bottom:7px;font-size:14px}
  /* タイトル右端は、アカウント・着せ替え・召喚・通貨を小さな二段構成で並べる。 */
  .token-balance{right:12px;bottom:8px;gap:5px;font-size:17px}
  .token-balance .token-coin{width:42px;height:42px}
  .summon-button{right:14px;bottom:49px;width:62px;height:70px;font-size:10px}
  .summon-button>span{left:-2px;width:66px}.summon-portal{width:62px;height:70px;transform:none}
  .dressup-button{right:91px;bottom:49px;width:62px;height:70px;font-size:10px;transform:none}
  .dressup-button>span{left:-2px;width:66px}.dressup-card{width:58px;height:70px;transform:none}

  .story-mode-panel,.item-exchange-panel,.dressup-panel,.summon-gate-panel{padding:6px}
  .story-mode-book,.item-exchange-book,.summon-gate-book{width:min(92vw,760px);max-height:94vh;overflow:auto;padding:23px 32px 20px}
  .story-mode-book h2,.summon-gate-book h2{margin:5px 0;font-size:22px}.story-mode-copy,.summon-gate-copy{margin-bottom:10px;font-size:11px}
  .story-chapters{gap:9px}.story-chapter{min-height:95px;padding:8px}.story-chapter-number{margin:10px 0 6px;font-size:17px}.story-mode-note{margin-top:9px;font-size:11px}
  .item-exchange-detail,.item-exchange-confirm-box,.summon-confirm-box,.summon-result-box{max-height:92vh;overflow:auto}
  .dressup-panel{overflow:auto}.dressup-card{transform:scale(.83);transform-origin:top center}

  .chapter-return-title{top:7px;right:9px;padding:5px 9px;font-size:10px}
  /* 両端のキャラカードと会話欄が決して重ならないよう、中央の会話領域を確保する。 */
  .chapter-dialogue{bottom:8px;width:min(60vw,760px);min-height:94px;padding:15px 20px 18px}
  .chapter-speaker{left:14px;top:-12px;min-width:88px;padding:4px 9px;font-size:11px}
  .chapter-dialogue p{margin:9px 6px 0;font-size:clamp(11px,2vh,14px);line-height:1.45;letter-spacing:.035em}
  .chapter-next-mark{right:13px;bottom:9px;transform:scale(.68)}
  .chapter-npc-card,.chapter-story-card{bottom:112px;width:min(17vw,150px);max-height:calc(100vh - 148px)}
  .story-wolf-card{right:1vw}.story-warrior-card{left:1vw}
  .story-battle-opponent-card{right:0;bottom:112px;width:min(17vw,150px);max-height:calc(100vh - 148px)}
  #tutorialBattleIntro .chapter-npc-card{right:0;bottom:112px;width:min(17vw,150px);max-height:calc(100vh - 148px)}
  #villageBattleIntro .chapter-dialogue{width:min(74vw,920px)}
  #chapterOneEndScreen span{font-size:clamp(25px,6vh,47px)}#chapterOneEndScreen small{top:63%;font-size:10px}
  .story-reward-notice{width:min(72vw,430px);padding:16px 20px}.story-reward-notice b{margin-bottom:7px;font-size:19px}.story-reward-notice span{font-size:13px}.story-reward-notice img{width:32px;height:32px}
  #resultScreen{padding-bottom:4vh}.result-word{font-size:clamp(42px,16vh,92px)}.result-actions{margin-top:2vh}.result-retry{padding:6px 10px!important;font-size:14px!important}
  .title-return-box{padding:16px;transform:scale(.88)}.title-return-box p{margin-bottom:14px;font-size:14px}.title-return-actions button{min-width:82px;padding:7px 10px;font-size:12px}
  /* 縦に長いログイン内容は、横画面でも必ず下までスクロールして操作できる。 */
  .auth-modal{display:block;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px}
  .auth-panel{width:min(86vw,410px);max-height:calc(100vh - 24px);margin:0 auto;padding:18px 22px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .auth-crown{font-size:22px}.auth-panel h2{font-size:21px}.auth-subtitle{margin-bottom:10px;font-size:10px}.auth-tabs{margin-bottom:9px}.auth-tab{padding:6px;font-size:12px}.auth-form{gap:7px}.auth-form label{font-size:11px}.auth-form input{padding:7px;font-size:13px}.auth-submit{padding:8px;font-size:13px}.auth-status{min-height:1.8em;font-size:10px}.auth-guest-note{margin-top:8px;font-size:9px}
}
`;
document.head.append(mobileLandscapeStyle);
const tutorialTargetStyle=document.createElement('style');
tutorialTargetStyle.textContent='#tutorialInputLock .tutorial-focus-button{position:absolute!important}.tutorial-focus-target{z-index:170!important;filter:brightness(1.4)!important;box-shadow:0 0 0 3px #ffe584,0 0 24px 10px rgba(255,201,67,.94)!important;animation:tutorial-card-pulse 1s ease-in-out infinite!important}.slot.tutorial-focus-target,.charge.tutorial-focus-target{position:absolute!important}.picks .tutorial-focus-target{position:relative!important}';
document.head.append(tutorialTargetStyle);
/* 擬似要素の画像待ちで背景だけ黒くなる端末向けに、場面本体にも同じ背景を持たせる。 */
chapterOneStyle.textContent+='.chapter-one-scene{background:#020509 url("assets/story-training-ground.webp") center/cover no-repeat!important}.chapter-one-scene.village-scene{background-image:url("assets/story-village.webp")!important}.chapter-one-scene.village-scene.night-village{background-image:url("assets/story-village-night.webp")!important}';
const touchLandscapeStyle=document.createElement('style');
touchLandscapeStyle.textContent=`
/* 一部のスマホが高解像度 desktop 表示を返しても、実機のタッチ領域を優先する。 */
body.touch-landscape{touch-action:manipulation;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body.touch-landscape #pBattle .picks{transform:scale(1.75)!important;transform-origin:left top!important}
body.touch-landscape #cBattle .picks{transform:scale(1.75)!important;transform-origin:right top!important}
body.touch-landscape .push-screen{position:relative;z-index:5;touch-action:manipulation}
body.touch-landscape .push-screen:before{content:"";position:absolute;z-index:-1;inset:-28px -36px}
body.touch-landscape .title-menu,.touch-landscape .push-screen,.touch-landscape .room-form,.touch-landscape .title-login{transform:none!important}
`;
document.head.append(touchLandscapeStyle);
