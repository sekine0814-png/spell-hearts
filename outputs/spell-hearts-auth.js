import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged,
  signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  linkWithCredential, EmailAuthProvider, signOut, sendPasswordResetEmail, updateProfile
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';

const firebaseConfig={
  apiKey:'AIzaSyCP3E5ojlmFo9cp0sT4GY_MN81bMV4eSSc',
  authDomain:'spellhearts-3579a.firebaseapp.com',
  projectId:'spellhearts-3579a',
  storageBucket:'spellhearts-3579a.firebasestorage.app',
  messagingSenderId:'652447743725',
  appId:'1:652447743725:web:bd8066c0f16d3554d756e4',
  measurementId:'G-XH0X45FXF8'
};

const auth=getAuth(initializeApp(firebaseConfig));
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

const style=document.createElement('style');
style.textContent=`
.auth-modal{position:fixed;inset:0;z-index:240;display:grid;place-items:center;padding:20px;background:rgba(1,4,9,.78);backdrop-filter:blur(5px);animation:auth-fade .2s ease-out both}.auth-panel{position:relative;width:min(92vw,410px);padding:30px 34px 26px;border:1px solid #d8af4b;border-radius:8px;background:linear-gradient(145deg,rgba(27,28,41,.98),rgba(9,9,16,.99));box-shadow:inset 0 0 32px rgba(226,169,52,.16),0 18px 60px #000;color:#fff0bc;text-align:center}.auth-panel:before{content:'';position:absolute;inset:7px;border:1px solid rgba(219,181,84,.35);border-radius:4px;pointer-events:none}.auth-crown{position:relative;color:#ffe28a;font-size:29px;text-shadow:0 0 18px #e1a126}.auth-panel h2{position:relative;margin:3px 0 1px;font:27px Georgia,"Yu Mincho",serif;letter-spacing:.1em;text-shadow:0 0 12px #d99b27}.auth-subtitle{position:relative;margin:0 0 20px;color:#cbb879;font:13px Georgia,"Yu Mincho",serif;letter-spacing:.22em}.auth-close{position:absolute;z-index:1;right:14px;top:10px;border:0;background:transparent;color:#d9c27f;font:28px/1 Georgia,serif;cursor:pointer}.auth-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;margin-bottom:16px;border-bottom:1px solid #735d2b}.auth-tab{border:0;background:transparent;color:#b8a66b;padding:9px;font:15px Georgia,"Yu Mincho",serif;cursor:pointer}.auth-tab.active{color:#fff3b2;border-bottom:2px solid #f0c85c;text-shadow:0 0 8px #e6ac2b}.auth-form{position:relative;display:grid;gap:12px;text-align:left}.auth-form label{display:grid;gap:5px;color:#e5d29a;font:13px "Yu Gothic",sans-serif}.auth-form input{width:100%;padding:11px;border:1px solid #80652d;border-radius:3px;outline:0;background:#080911;color:#fff2c6;font:15px Georgia,"Yu Mincho",serif}.auth-form input:focus{border-color:#ffe287;box-shadow:0 0 13px rgba(255,205,77,.35)}.auth-status{min-height:2.6em;margin:0;color:#ffe59a;font:12px "Yu Gothic",sans-serif;line-height:1.35}.auth-submit{padding:11px;border:1px solid #e5b64a;border-radius:3px;background:linear-gradient(#75541a,#291806);color:#fff2b0;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.12em;cursor:pointer}.auth-submit:disabled{opacity:.55;cursor:wait}.auth-reset{position:relative;margin-top:13px;border:0;background:transparent;color:#d6c184;font:12px "Yu Gothic",sans-serif;text-decoration:underline;cursor:pointer}.auth-guest-note{position:relative;margin:14px 0 0;color:#a5adbc;font:11px "Yu Gothic",sans-serif}@keyframes auth-fade{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}`;
document.head.append(style);
style.textContent+='.auth-form .auth-nickname{display:none}.auth-form.registering .auth-nickname{display:grid}';
