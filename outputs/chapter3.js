/* Chapter 3: rebuilt scene, kept independent from Chapters 1 and 2. */
(() => {
  'use strict';

  const line = (text, speaker = '') => ({ text, speaker });
  const lines = [
    line('エアさん曰く、王都までは徒歩で２～３日程かかるらしい。'),
    line('街を出て半日ほど経っただろうか、\n辺りは気持ちの良い風が吹く草原が広がっている。'),
    line('夜になると魔物が出るからね。\n夕方にはキャンプを設営して、火を炊くよ。', 'エア'),
    line('エアさんは言う。流石に冒険者、\n知識も経験も豊富だ。'),
    line('・・・あの、聞きたいことがあるんですけど', '主人公'),
    line('なに？なんでも聞いてよ', 'エア'),
    line('夜になると魔物が活発になるのは訓練所でも習いましたし、\n事実、街の近くをうろついていたのを何度か見たこともあります', '主人公'),
    line('でも、昼間に魔物が人を襲うようなことってあるんでしょうか。', '主人公'),
    line('俺は思い出していた。そう、昨日の騒ぎのことだ。'),
    line('無くはないね。魔物の種類にもよるけど', 'エア'),
    line('エアさんは表情を緩めず言う。'),
    line('昨日のこと、気になってるんだね。', 'エア'),
    line('俺は頷く。'),
    line('昨日の魔物、覚えてる？\n狼のような見た目で、体は痩せ細っていた。\n長い間食料にありつけていなかった証拠だよ', 'エア'),
    line('魔物が食糧難で姿を見せるのは珍しいんだ。\n弱っているところを別の魔物に食べられてしまうからね', 'エア'),
    line('つまりあの魔物の出現は、あの街の周辺で少し前から、\n野生における食物連鎖が完全に停止していたことの裏返しなんだ', 'エア'),
    line('食物連鎖の・・・停止', '主人公'),
    line('そう。そして、この食物連鎖の停止なんだけど、\n私も何度か見た経験がある。', 'エア'),
    line('その全てが、\nたったひとつの理由で起こっているんだ', 'エア'),
    line('たったひとつ、ですか', '主人公'),
    line('そう。なんだと思う？', 'エア'),
    line('・・・見当もつきません', '主人公'),
    line('人間だよ', 'エア'),
    line('一瞬、息が止まる。'),
    line('・・・人間？', '主人公'),
    line('そう。魔物を含む食物連鎖の停止は、\n人間が特定の種を狩り尽くしたり、遺伝子操作したりすることでしか起こらないんだ。', 'エア'),
    line('どうしてそんなこと、わかるんですか？', '主人公'),
    line('現象としてはかなり珍しいよ。\nただ、いくつか報告事例があるんだ。\n逆に、魔物だけで食物連鎖が崩壊した事例は無い。', 'エア'),
    line('私もいくつか報告書を読んだけど、\nどれも目を覆うような凄惨な事件ばかりだったよ。', 'エア'),
    line('・・・そうなんですか', '主人公'),
    line('よく違和感を持ったね。冒険者に向いてるかもね', 'エア'),
    line('少し微笑んでエアさんは言う。\nしかし、その笑顔の奥に何か思うものがあるようにも感じた。'),
    line('人間・・・か', '主人公')
  ];
  const assets = {
    background: 'assets/596a09e0-b35c-421f-b5f6-22caff7c813c.jpg',
    bgm: 'assets/藁の記憶.mp3',
    air: 'assets/exec-cf1d9101-c5d6-4ddb-8aa1-e972c2f7a927.png'
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
      <img class="chapter3-air" src="${assets.air}" alt="エア" hidden>
      <button class="chapter3-dialogue" type="button" aria-label="会話を進める"><b hidden></b><p></p><i aria-hidden="true">▼</i></button>`;
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
      .chapter3-air{position:absolute;z-index:2;left:11vw;bottom:26vh;width:min(22vw,285px);max-height:59vh;object-fit:contain;opacity:0;pointer-events:none;filter:brightness(.65) saturate(.72) drop-shadow(0 10px 14px #0009);transform:translateX(-14px) scale(.92);transition:opacity .35s ease,transform .35s ease,filter .35s ease}.chapter3-air.show{opacity:.78}.chapter3-air.talking{z-index:4;opacity:1;transform:translateX(0) scale(1.06);filter:brightness(1.08) saturate(1.02) drop-shadow(0 0 12px rgba(225,205,138,.42))}
      .chapter3-dialogue{position:absolute;z-index:5;left:50%;bottom:5.5vh;width:min(88vw,920px);min-height:144px;padding:26px 42px 30px;transform:translate(-50%,16px);border:1px solid #d8ae4e;border-radius:5px;background:rgba(4,5,9,.76);box-shadow:inset 0 0 22px rgba(255,217,129,.12),0 8px 26px #000b;color:#f9ead0;opacity:0;pointer-events:none;text-align:left;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;transition:opacity .35s ease,transform .35s ease}
      .chapter3-dialogue.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}.chapter3-dialogue:before{content:"";position:absolute;inset:8px;border:1px solid rgba(225,184,77,.32);border-radius:2px;pointer-events:none}.chapter3-dialogue b{position:absolute;z-index:1;left:26px;top:-17px;min-width:120px;padding:7px 17px;border:1px solid #d8ae4e;border-radius:3px;background:linear-gradient(180deg,rgba(59,43,18,.97),rgba(14,10,5,.98));color:#fff0ae;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.14em;text-align:center}.chapter3-dialogue p{position:relative;margin:16px 20px 0;white-space:pre-line;font:clamp(16px,1.35vw,22px)/1.65 "Yu Mincho","Hiragino Mincho ProN",serif;letter-spacing:.08em;text-shadow:0 2px 4px #000}.chapter3-dialogue i{position:absolute;right:24px;bottom:16px;width:0;height:0;border-right:10px solid transparent;border-left:10px solid transparent;border-top:12px solid #f5d77c;filter:drop-shadow(0 1px 3px #000);animation:chapter3-next .82s ease-in-out infinite}.chapter3-dialogue.last i{display:none}@keyframes chapter3-next{50%{opacity:.45;transform:translateY(6px)}}
      @media(max-width:760px),(pointer:coarse) and (orientation:landscape){.chapter3-return{top:10px;right:10px;padding:8px 12px;font-size:12px}.chapter3-air{left:5vw;bottom:27vh;width:min(29vw,210px);max-height:48vh}.chapter3-dialogue{bottom:3.5vh;width:94vw;min-height:122px;padding:23px 16px 26px}.chapter3-dialogue b{left:18px;top:-15px;min-width:104px;padding:6px 12px;font-size:13px}.chapter3-dialogue p{margin:16px 8px 0;font-size:16px}.chapter3-dialogue i{right:17px;bottom:13px}}
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
    const speaker = dialogue.querySelector('b');
    const text = dialogue.querySelector('p');
    const music = root.querySelector('.chapter3-bgm');
    const air = root.querySelector('.chapter3-air');
    let index = 0;
    const render = () => {
      const current = lines[index];
      speaker.hidden = !current.speaker;
      speaker.textContent = current.speaker || '';
      text.textContent = current.speaker ? `「${current.text}」` : current.text;
      if (current.speaker === 'エア') { air.hidden = false; air.classList.add('show'); }
      air.classList.toggle('talking', current.speaker === 'エア');
      dialogue.classList.toggle('last', index === lines.length - 1);
    };
    dialogue.onclick = () => { if (index < lines.length - 1) { index += 1; render(); } };
    root.hidden = false;
    bg.style.opacity = '0';
    fade.style.opacity = '1';
    air.hidden = true;
    air.className = 'chapter3-air';
    dialogue.classList.remove('show');
    render();
    music.pause(); music.currentTime = 0; music.volume = 0.12; music.play().catch(() => {});
    requestAnimationFrame(() => { bg.style.opacity = '1'; fade.style.opacity = '0'; });
    window.setTimeout(() => dialogue.classList.add('show'), 900);
  }

  window.startChapterThree = startChapterThree;
})();
