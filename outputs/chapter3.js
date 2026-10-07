/* Chapter 3: rebuilt scene, kept independent from Chapters 1 and 2. */
(() => {
  'use strict';

  const lines = [
    'エアさん曰く、王都までは徒歩で２～３日程かかるらしい。',
    '街を出て半日ほど経っただろうか、\n辺りは気持ちの良い風が吹く草原が広がっている。'
  ];
  const assets = {
    background: 'assets/596a09e0-b35c-421f-b5f6-22caff7c813c.jpg',
    bgm: 'assets/藁の記憶.mp3'
  };
  let scene;

  function makeScene() {
    if (scene) return scene;
    scene = document.createElement('section');
    scene.id = 'chapterThreeScene';
    scene.hidden = true;
    scene.innerHTML = `
      <img class="chapter3-background" src="${assets.background}" alt="草原">
      <div class="chapter3-fade" aria-hidden="true"></div>
      <audio class="chapter3-bgm" src="${assets.bgm}" loop preload="metadata"></audio>
      <button class="chapter3-return" type="button">タイトルに戻る</button>
      <button class="chapter3-dialogue" type="button" aria-label="会話を進める"><p></p><i aria-hidden="true">▼</i></button>`;
    document.body.append(scene);
    addStyle();
    scene.querySelector('.chapter3-return').addEventListener('click', () => location.assign(location.pathname));
    return scene;
  }

  function addStyle() {
    if (document.querySelector('#chapter3Style')) return;
    const style = document.createElement('style');
    style.id = 'chapter3Style';
    style.textContent = `
      #chapterThreeScene{position:fixed;z-index:500;inset:0;overflow:hidden;background:#020409;color:#f9ead0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;isolation:isolate}
      #chapterThreeScene[hidden]{display:none}.chapter3-background{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;filter:brightness(.84) saturate(.88);transition:opacity .9s ease}.chapter3-fade{position:absolute;z-index:3;inset:0;background:#000;opacity:1;pointer-events:none;transition:opacity .8s ease}
      .chapter3-return{position:absolute;z-index:6;top:14px;right:16px;padding:10px 18px;border:1px solid #d8ae4e;border-radius:4px;background:linear-gradient(180deg,rgba(81,57,18,.94),rgba(23,14,5,.97));color:#fff0ba;font:15px Georgia,"Yu Mincho",serif;letter-spacing:.1em;cursor:pointer}
      .chapter3-dialogue{position:absolute;z-index:5;left:50%;bottom:5.5vh;width:min(88vw,920px);min-height:144px;padding:26px 42px 30px;transform:translate(-50%,16px);border:1px solid #d8ae4e;border-radius:5px;background:rgba(4,5,9,.76);box-shadow:inset 0 0 22px rgba(255,217,129,.12),0 8px 26px #000b;color:#f9ead0;opacity:0;pointer-events:none;text-align:left;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;transition:opacity .35s ease,transform .35s ease}
      .chapter3-dialogue.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}.chapter3-dialogue:before{content:"";position:absolute;inset:8px;border:1px solid rgba(225,184,77,.32);border-radius:2px;pointer-events:none}.chapter3-dialogue p{position:relative;margin:16px 20px 0;white-space:pre-line;font:clamp(16px,1.35vw,22px)/1.65 "Yu Mincho","Hiragino Mincho ProN",serif;letter-spacing:.08em;text-shadow:0 2px 4px #000}.chapter3-dialogue i{position:absolute;right:24px;bottom:16px;width:0;height:0;border-right:10px solid transparent;border-left:10px solid transparent;border-top:12px solid #f5d77c;filter:drop-shadow(0 1px 3px #000);animation:chapter3-next .82s ease-in-out infinite}.chapter3-dialogue.last i{display:none}@keyframes chapter3-next{50%{opacity:.45;transform:translateY(6px)}}
      @media(max-width:760px),(pointer:coarse) and (orientation:landscape){.chapter3-return{top:10px;right:10px;padding:8px 12px;font-size:12px}.chapter3-dialogue{bottom:3.5vh;width:94vw;min-height:122px;padding:23px 16px 26px}.chapter3-dialogue p{margin:16px 8px 0;font-size:16px}.chapter3-dialogue i{right:17px;bottom:13px}}
    `;
    document.head.append(style);
  }

  function startChapterThree() {
    document.querySelector('#titleBgm')?.pause();
    document.querySelector('#storyModePanel')?.setAttribute('hidden', '');
    const root = makeScene();
    const bg = root.querySelector('.chapter3-background');
    const fade = root.querySelector('.chapter3-fade');
    const dialogue = root.querySelector('.chapter3-dialogue');
    const text = dialogue.querySelector('p');
    const music = root.querySelector('.chapter3-bgm');
    let index = 0;
    const render = () => {
      text.textContent = lines[index];
      dialogue.classList.toggle('last', index === lines.length - 1);
    };
    dialogue.onclick = () => { if (index < lines.length - 1) { index += 1; render(); } };
    root.hidden = false;
    bg.style.opacity = '0';
    fade.style.opacity = '1';
    dialogue.classList.remove('show');
    render();
    music.pause(); music.currentTime = 0; music.volume = 0.12; music.play().catch(() => {});
    requestAnimationFrame(() => { bg.style.opacity = '1'; fade.style.opacity = '0'; });
    window.setTimeout(() => dialogue.classList.add('show'), 900);
  }

  window.startChapterThree = startChapterThree;
})();
