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

onAuthStateChanged(auth,user=>{currentUser=user;updateLoginButton();});

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
makeRecordButton();
makeTutorialButton();
makeBattleSettings();

const style=document.createElement('style');
style.textContent=`
.auth-modal{position:fixed;inset:0;z-index:240;display:grid;place-items:center;padding:20px;background:rgba(1,4,9,.78);backdrop-filter:blur(5px);animation:auth-fade .2s ease-out both}.auth-panel{position:relative;width:min(92vw,410px);padding:30px 34px 26px;border:1px solid #d8af4b;border-radius:8px;background:linear-gradient(145deg,rgba(27,28,41,.98),rgba(9,9,16,.99));box-shadow:inset 0 0 32px rgba(226,169,52,.16),0 18px 60px #000;color:#fff0bc;text-align:center}.auth-panel:before{content:'';position:absolute;inset:7px;border:1px solid rgba(219,181,84,.35);border-radius:4px;pointer-events:none}.auth-crown{position:relative;color:#ffe28a;font-size:29px;text-shadow:0 0 18px #e1a126}.auth-panel h2{position:relative;margin:3px 0 1px;font:27px Georgia,"Yu Mincho",serif;letter-spacing:.1em;text-shadow:0 0 12px #d99b27}.auth-subtitle{position:relative;margin:0 0 20px;color:#cbb879;font:13px Georgia,"Yu Mincho",serif;letter-spacing:.22em}.auth-close{position:absolute;z-index:1;right:14px;top:10px;border:0;background:transparent;color:#d9c27f;font:28px/1 Georgia,serif;cursor:pointer}.auth-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;margin-bottom:16px;border-bottom:1px solid #735d2b}.auth-tab{border:0;background:transparent;color:#b8a66b;padding:9px;font:15px Georgia,"Yu Mincho",serif;cursor:pointer}.auth-tab.active{color:#fff3b2;border-bottom:2px solid #f0c85c;text-shadow:0 0 8px #e6ac2b}.auth-form{position:relative;display:grid;gap:12px;text-align:left}.auth-form label{display:grid;gap:5px;color:#e5d29a;font:13px "Yu Gothic",sans-serif}.auth-form input{width:100%;padding:11px;border:1px solid #80652d;border-radius:3px;outline:0;background:#080911;color:#fff2c6;font:15px Georgia,"Yu Mincho",serif}.auth-form input:focus{border-color:#ffe287;box-shadow:0 0 13px rgba(255,205,77,.35)}.auth-status{min-height:2.6em;margin:0;color:#ffe59a;font:12px "Yu Gothic",sans-serif;line-height:1.35}.auth-submit{padding:11px;border:1px solid #e5b64a;border-radius:3px;background:linear-gradient(#75541a,#291806);color:#fff2b0;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.12em;cursor:pointer}.auth-submit:disabled{opacity:.55;cursor:wait}.auth-reset{position:relative;margin-top:13px;border:0;background:transparent;color:#d6c184;font:12px "Yu Gothic",sans-serif;text-decoration:underline;cursor:pointer}.auth-guest-note{position:relative;margin:14px 0 0;color:#a5adbc;font:11px "Yu Gothic",sans-serif}@keyframes auth-fade{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}`;
document.head.append(style);
const settingsTweaks=document.createElement('style');
settingsTweaks.textContent='.title-settings{top:58px;background:#050508;transition:filter .2s}.title-settings.open{transform:none}.settings-panel{top:108px}.push-screen{margin-bottom:42px}@media(max-width:600px){.title-settings{top:45px}.settings-panel{top:87px}.push-screen{margin-bottom:24px}}';
document.head.append(settingsTweaks);
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
