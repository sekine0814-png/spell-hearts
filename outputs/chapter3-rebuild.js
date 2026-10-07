/*
 * Chapter 3 — isolated rebuild
 * This file deliberately owns only Chapter 3.  Chapters 1/2 and the main
 * battle code are left untouched so later changes do not leak between them.
 */
(() => {
  'use strict';

  const A = 'assets/';
  const asset = {
    day: A + '596a09e0-b35c-421f-b5f6-22caff7c813c.jpg',
    evening: A + '862dbc28-ef1d-474f-becc-68ab30b979fd.jpg',
    airJourney: A + 'exec-cf1d9101-c5d6-4ddb-8aa1-e972c2f7a927.png',
    airBattle: A + 'exec-aad00cca-1829-4589-bfe0-4928ffa9b89d.png',
    delyuke: A + 'exec-ea55e498-d164-4f94-8b07-78a9d38615a8.png',
    delyukeSword: A + 'exec-de0615d8-6dfe-4ee0-af48-a7ce0210f4e2.png',
    bgm: A + '藁の記憶.mp3'
  };

  const line = (text, options = {}) => ({ text, ...options });
  const lines = [
    line('エアさん曰く、王都までは徒歩で２～３日程かかるらしい。\n街を出て半日ほど経っただろうか、\n辺りは気持ちの良い風が吹く草原が広がっている。'),
    line('夜になると魔物が出るからね。\n夕方にはキャンプを設営して、火を炊くよ。', { speaker: 'エア' }),
    line('エアさんは言う。流石に冒険者、\n知識も経験も豊富だ。'),
    line('・・・あの、聞きたいことがあるんですけど', { speaker: '主人公' }),
    line('なに？なんでも聞いてよ', { speaker: 'エア' }),
    line('夜になると魔物が活発になるのは訓練所でも習いましたし、\n事実、街の近くをうろついていたのを何度か見たこともあります', { speaker: '主人公' }),
    line('でも、昼間に魔物が人を襲うようなことってあるんでしょうか。', { speaker: '主人公' }),
    line('俺は思い出していた。そう、昨日の騒ぎのことだ。'),
    line('無くはないね。魔物の種類にもよるけど', { speaker: 'エア' }),
    line('エアさんは表情を緩めず言う。'),
    line('昨日のこと、気になってるんだね。', { speaker: 'エア' }),
    line('俺は頷く。'),
    line('昨日の魔物、覚えてる？\n狼のような見た目で、体は痩せ細っていた。\n長い間食料にありつけていなかった証拠だよ', { speaker: 'エア' }),
    line('魔物が食糧難で姿を見せるのは珍しいんだ。\n弱っているところを別の魔物に食べられてしまうからね', { speaker: 'エア' }),
    line('つまりあの魔物の出現は、あの街の周辺で少し前から、\n野生における食物連鎖が完全に停止していたことの裏返しなんだ', { speaker: 'エア' }),
    line('食物連鎖の・・・停止', { speaker: '主人公' }),
    line('そう。そして、この食物連鎖の停止なんだけど、\n私も何度か見た経験がある。', { speaker: 'エア' }),
    line('その全てが、\nたったひとつの理由で起こっているんだ', { speaker: 'エア' }),
    line('たったひとつ、ですか', { speaker: '主人公' }),
    line('そう。なんだと思う？', { speaker: 'エア' }),
    line('・・・見当もつきません', { speaker: '主人公' }),
    line('人間だよ', { speaker: 'エア' }),
    line('一瞬、息が止まる。'),
    line('・・・人間？', { speaker: '主人公' }),
    line('そう。魔物を含む食物連鎖の停止は、\n人間が特定の種を狩り尽くしたり、遺伝子操作したりすることでしか起こらないんだ。', { speaker: 'エア' }),
    line('どうしてそんなこと、わかるんですか？', { speaker: '主人公' }),
    line('現象としてはかなり珍しいよ。\nただ、いくつか報告事例があるんだ。\n逆に、魔物だけで食物連鎖が崩壊した事例は無い。', { speaker: 'エア' }),
    line('私もいくつか報告書を読んだけど、\nどれも目を覆うような凄惨な事件ばかりだったよ。', { speaker: 'エア' }),
    line('・・・そうなんですか', { speaker: '主人公' }),
    line('よく違和感を持ったね。冒険者に向いてるかもね', { speaker: 'エア' }),
    line('少し微笑んでエアさんは言う。\nしかし、その笑顔の奥に何か思うものがあるようにも感じた。'),
    line('人間・・・か', { speaker: '主人公' }),
    line('', { evening: true }),
    line('そろそろキャンプを張るよ', { speaker: 'エア', evening: true }),
    line('頷いて荷物を取り出す。\n訓練所で野営の授業はあったので、設営はスムーズだ。', { evening: true }),
    line('へえ、やるじゃん！', { speaker: 'エア', evening: true }),
    line('いえ・・・', { speaker: '主人公', evening: true }),
    line('少し照れくさい。', { evening: true }),
    line('最後の杭に手をかけた、そのときだった。', { evening: true }),
    line('お前ら、ここで何をしている', { speaker: '？？？', evening: true, delyuke: 'normal' }),
    line('声に振り向くと、そこには如何にも手練れであろう風体の男性が\nこちらを怪訝そうな眼差しで睨みつけていた。\nかなりこちらを警戒しているようだ。', { evening: true, delyuke: 'normal' }),
    line('私たちは西の村から出てきた旅の者だよ', { speaker: 'エア', evening: true, delyuke: 'normal' }),
    line('エアさんが言うが、男は表情ひとつ変えず\nこちらを見据えている。', { evening: true, delyuke: 'normal' }),
    line('ここ最近、この周辺でサイクル・ハウトが観測されている。', { speaker: '？？？', evening: true, delyuke: 'normal' }),
    line('サイクル・・・？', { speaker: '主人公', evening: true, delyuke: 'normal' }),
    line('言いかけて、フラッシュバックする。', { evening: true, delyuke: 'normal' }),
    line('（食物連鎖の――停止）', { evening: true, delyuke: 'normal' }),
    line('なるほど・・・そういうことか。', { evening: true, delyuke: 'normal' }),
    line('それは私たちも観測したよ。\n街中に飢餓状態の魔物が入り込んで来た。', { speaker: 'エア', evening: true, delyuke: 'normal' }),
    line('・・・', { speaker: '主人公', evening: true, delyuke: 'normal' }),
    line('こちらを見る男の目は変わらない。', { evening: true, delyuke: 'normal' }),
    line('私は王都騎士団のデリューク・ロイアルト。\n旅証を見せてもらおう。', { speaker: 'デリューク', evening: true, delyuke: 'normal' }),
    line('旅証ね。待って', { speaker: 'エア', evening: true, delyuke: 'normal' }),
    line('エアさんは荷物の中から写真付きの旅証を取り出し見せる。', { evening: true, delyuke: 'normal' }),
    line('はい。これでいいでしょ', { speaker: 'エア', evening: true, delyuke: 'normal' }),
    line('・・・写真、王都の印はあるな。いいだろう。', { speaker: 'デリューク', evening: true, delyuke: 'normal' }),
    line('じゃあね、お疲れ様', { speaker: 'エア', evening: true, delyuke: 'normal' }),
    line('まだだ。貴様もだ', { speaker: 'デリューク', evening: true, delyuke: 'normal' }),
    line('当然、俺に向けられた言葉だ。\nしかし、街を出てきたばかりの俺に旅証などあるはずもなかった。', { evening: true, delyuke: 'normal' }),
    line('私は・・・街から出てきたばかりで', { speaker: '主人公', evening: true, delyuke: 'normal' }),
    line('・・・怪しいな', { speaker: 'デリューク', evening: true, delyuke: 'normal' }),
    line('この人は私の連れだよ。\nそれに、アインクロッズより東のエリア以外では\n旅証の提示は義務じゃないはずだけど？', { speaker: 'エア', evening: true, delyuke: 'normal' }),
    line('デリュークと名乗った男とエアさんが睨み合う。', { evening: true, delyuke: 'normal' }),
    line('取り調べを行う。\n騎士団の前哨基地まで来てもらおう。', { speaker: 'デリューク', evening: true, delyuke: 'normal' }),
    line('はぁ？ 騎士団ごときにそんな権限あるわけないでしょ。', { speaker: 'エア', evening: true, delyuke: 'normal' }),
    line('貴様、口答えするのか', { speaker: 'デリューク', evening: true, delyuke: 'normal' }),
    line('二人のテンションがヒートアップしてきているのが伝わってくる。', { evening: true, delyuke: 'normal' }),
    line('今は緊急事態なのだ。\n無理やりにでも・・・来てもらうぞ。', { speaker: 'デリューク', evening: true, delyuke: 'normal' }),
    line('男は剣を抜いた。', { evening: true, delyuke: 'sword' }),
    line('そんな義理はないって言ってるでしょ。\nやるなら相手になるよ。\n私の方が強いと思うけど？', { speaker: 'エア', evening: true, delyuke: 'sword', airBattle: true }),
    line('抜かせ、小娘。', { speaker: 'デリューク', evening: true, delyuke: 'sword', airBattle: true }),
    line('振りかざした二人の刃が重なった・・・！', { evening: true, delyuke: 'sword', airBattle: true, battle: true })
  ];

  let scene;
  const stopLegacyScene = () => {
    const legacy = document.querySelector('#chapterThreeScene');
    if (legacy) { legacy.querySelector('audio')?.pause(); legacy.hidden = true; }
  };
  const stopTitleMusic = () => {
    const title = document.querySelector('#titleBgm');
    if (title) { title.pause(); title.currentTime = 0; }
  };
  const nameFor = speaker => speaker === '主人公' ? (window.storySpeakerName?.('主人公') || '主人公') : speaker;

  function ensureScene() {
    if (scene) return scene;
    scene = document.createElement('section');
    scene.id = 'chapterThreeRebuild';
    scene.hidden = true;
    scene.innerHTML = `
      <audio class="c3r-bgm" loop preload="metadata" src="${asset.bgm}"></audio>
      <img class="c3r-bg" alt="">
      <div class="c3r-curtain"></div>
      <button class="c3r-return" type="button">タイトルに戻る</button>
      <img class="c3r-air" alt="エア">
      <img class="c3r-delyuke" alt="デリューク" hidden>
      <button class="c3r-dialogue" type="button" aria-label="会話を進める">
        <b class="c3r-speaker" hidden></b><p></p><i aria-hidden="true">▼</i>
      </button>`;
    document.body.append(scene);
    injectStyle();
    scene.querySelector('.c3r-return').addEventListener('click', returnToTitle);
    return scene;
  }

  function injectStyle() {
    if (document.querySelector('#chapter3RebuildStyle')) return;
    const style = document.createElement('style');
    style.id = 'chapter3RebuildStyle';
    style.textContent = `
      #chapterThreeRebuild{position:fixed;z-index:500;inset:0;overflow:hidden;background:#020509;color:#f9ead0;font-family:"Yu Mincho",serif;isolation:isolate}
      #chapterThreeRebuild[hidden]{display:none}.c3r-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;filter:brightness(.82) saturate(.9);transition:opacity .85s ease}
      .c3r-curtain{position:absolute;z-index:5;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .38s ease}.c3r-curtain.on{opacity:1}
      .c3r-return{position:absolute;z-index:8;top:14px;right:16px;padding:10px 18px;border:1px solid #d8ae4e;border-radius:4px;background:linear-gradient(180deg,rgba(81,57,18,.93),rgba(23,14,5,.96));color:#fff0ba;font:15px Georgia,"Yu Mincho",serif;letter-spacing:.1em;cursor:pointer}
      .c3r-air,.c3r-delyuke{position:absolute;z-index:2;bottom:27vh;width:min(23vw,300px);max-height:58vh;object-fit:contain;opacity:0;pointer-events:none;filter:brightness(.62) saturate(.7) drop-shadow(0 10px 15px #0009);transition:opacity .38s ease,transform .34s ease,filter .34s ease}
      .c3r-air{left:19vw;transform:translateX(-14px) scale(.92)}.c3r-delyuke{right:19vw;transform:translateX(14px) scale(.92)}
      .c3r-air.visible,.c3r-delyuke.visible{opacity:.78}.c3r-air.talking,.c3r-delyuke.talking{z-index:4;opacity:1;transform:translateX(0) scale(1.08);filter:brightness(1.1) saturate(1.04) drop-shadow(0 0 12px rgba(225,205,138,.45))}
      .c3r-dialogue{position:absolute;z-index:6;left:50%;bottom:5.5vh;width:min(88vw,920px);min-height:144px;padding:26px 42px 30px;transform:translate(-50%,16px);border:1px solid #d8ae4e;border-radius:5px;background:rgba(4,5,9,.76);box-shadow:inset 0 0 22px rgba(255,217,129,.12),0 8px 26px #000b;color:#f9ead0;opacity:0;pointer-events:none;text-align:left;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;transition:opacity .35s ease,transform .35s ease}
      .c3r-dialogue.visible{opacity:1;transform:translate(-50%,0);pointer-events:auto}.c3r-dialogue:before{content:"";position:absolute;inset:8px;border:1px solid rgba(225,184,77,.32);border-radius:2px;pointer-events:none}
      .c3r-dialogue p{position:relative;margin:18px 20px 0;white-space:pre-line;font:clamp(16px,1.35vw,22px)/1.65 "Yu Mincho",serif;letter-spacing:.08em;text-shadow:0 2px 4px #000}.c3r-speaker{position:absolute;z-index:1;left:26px;top:-17px;min-width:130px;padding:7px 17px;border:1px solid #d8ae4e;border-radius:3px;background:linear-gradient(180deg,rgba(59,43,18,.97),rgba(14,10,5,.98));color:#fff0ae;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.14em;text-align:center;text-shadow:0 1px 3px #000}
      .c3r-dialogue i{position:absolute;right:24px;bottom:16px;width:0;height:0;border-right:10px solid transparent;border-left:10px solid transparent;border-top:12px solid #f5d77c;filter:drop-shadow(0 1px 3px #000);animation:c3r-next .82s ease-in-out infinite}.c3r-dialogue i:before{content:"";position:absolute;top:-18px;left:-10px;width:0;height:0;border-right:10px solid transparent;border-left:10px solid transparent;border-top:12px solid #f5d77c}@keyframes c3r-next{50%{opacity:.45;transform:translateY(6px)}}
      @media(max-width:760px),(pointer:coarse) and (orientation:landscape){.c3r-return{top:10px;right:10px;padding:8px 12px;font-size:12px}.c3r-air,.c3r-delyuke{bottom:27vh;width:min(29vw,210px);max-height:48vh}.c3r-air{left:5vw}.c3r-delyuke{right:5vw}.c3r-dialogue{bottom:3.5vh;width:94vw;min-height:122px;padding:23px 16px 26px}.c3r-dialogue p{margin:16px 8px 0;font-size:16px}.c3r-speaker{left:18px;top:-15px;min-width:104px;padding:6px 12px;font-size:13px}.c3r-dialogue i{right:17px;bottom:13px}}
      #chapter3BattleCards{position:fixed;z-index:138;inset:0;pointer-events:none}#chapter3BattleCards img{position:absolute;bottom:7vh;width:min(20vw,260px);max-height:66vh;object-fit:contain;filter:drop-shadow(0 8px 14px #0009)}#chapter3BattleCards .air{left:3vw}#chapter3BattleCards .delyuke{right:3vw}@media(max-width:760px),(pointer:coarse) and (orientation:landscape){#chapter3BattleCards img{bottom:2vh;width:min(19vw,176px);max-height:54vh}#chapter3BattleCards .air{left:1vw}#chapter3BattleCards .delyuke{right:1vw}}
    `;
    document.head.append(style);
  }

  function startChapterThreeRebuild() {
    stopLegacyScene(); stopTitleMusic();
    document.querySelector('#storyModePanel')?.setAttribute('hidden', '');
    document.body.classList.add('story-active', 'story-cinematic');
    const root = ensureScene();
    const bg = root.querySelector('.c3r-bg');
    const air = root.querySelector('.c3r-air');
    const delyuke = root.querySelector('.c3r-delyuke');
    const dialogue = root.querySelector('.c3r-dialogue');
    const speaker = root.querySelector('.c3r-speaker');
    const text = root.querySelector('.c3r-dialogue p');
    const arrow = root.querySelector('.c3r-dialogue i');
    const music = root.querySelector('.c3r-bgm');
    let index = 0, evening = false, battleAir = false, transitioning = false;

    const setVisuals = current => {
      if (current.evening && !evening) {
        evening = true; transitioning = true;
        root.querySelector('.c3r-curtain').classList.add('on');
        window.setTimeout(() => { bg.src = asset.evening; }, 390);
        const unveil = () => { root.querySelector('.c3r-curtain').classList.remove('on'); transitioning = false; };
        bg.addEventListener('load', unveil, { once: true }); bg.addEventListener('error', unveil, { once: true });
      }
      if (current.airBattle) battleAir = true;
      air.src = battleAir ? asset.airBattle : asset.airJourney;
      air.classList.add('visible');
      air.classList.toggle('talking', current.speaker === 'エア');
      if (current.delyuke) {
        delyuke.hidden = false; delyuke.src = current.delyuke === 'sword' ? asset.delyukeSword : asset.delyuke;
        delyuke.classList.add('visible'); delyuke.classList.toggle('talking', current.speaker === 'デリューク' || current.speaker === '？？？');
      } else { delyuke.hidden = true; delyuke.className = 'c3r-delyuke'; }
    };
    const render = () => {
      const current = lines[index]; setVisuals(current);
      speaker.hidden = !current.speaker; speaker.textContent = current.speaker ? nameFor(current.speaker) : '';
      text.textContent = current.speaker ? `「${current.text}」` : current.text;
      arrow.hidden = Boolean(current.battle);
    };
    const advance = () => {
      if (transitioning) return;
      if (lines[index].battle) { startBattle(root, music); return; }
      index += 1; render();
    };
    dialogue.onclick = advance;
    root.hidden = false; bg.src = asset.day; bg.style.opacity = '0'; dialogue.classList.remove('visible'); air.className = 'c3r-air'; delyuke.className = 'c3r-delyuke'; delyuke.hidden = true;
    render();
    const bgmLevel = Math.max(0, Math.min(1, Number(localStorage.getItem('spellHeartsBgmVolume') ?? 28) / 100));
    music.pause(); music.currentTime = 0; music.volume = bgmLevel * .22; music.play().catch(() => {});
    requestAnimationFrame(() => { bg.style.opacity = '1'; });
    window.setTimeout(() => air.classList.add('visible'), 900);
    window.setTimeout(() => dialogue.classList.add('visible'), 1400);
  }

  function startBattle(root, music) {
    music.pause(); root.hidden = true; document.body.classList.remove('story-active', 'story-cinematic');
    let cards = document.querySelector('#chapter3BattleCards');
    if (!cards) { cards = document.createElement('div'); cards.id = 'chapter3BattleCards'; document.body.append(cards); }
    cards.innerHTML = `<img class="air" src="${asset.airBattle}" alt="エア"><img class="delyuke" src="${asset.delyukeSword}" alt="デリューク">`;
    if (typeof window.start === 'function') window.start();
    window.dispatchEvent(new CustomEvent('spellhearts:chapter3battle'));
  }

  function returnToTitle() {
    const music = scene?.querySelector('.c3r-bgm'); if (music) { music.pause(); music.currentTime = 0; }
    if (scene) scene.hidden = true;
    document.querySelector('#chapter3BattleCards')?.remove();
    document.body.classList.remove('story-active', 'story-cinematic');
    window.returnToTitle?.();
  }

  // The old Chapter 3 launch handler is lexical to the original file.  Capture
  // the Chapter 3 button before that handler runs, then launch this isolated scene.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-story-chapter="3"]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    startChapterThreeRebuild();
  }, true);
  window.startChapterThreeRebuild = startChapterThreeRebuild;
})();
