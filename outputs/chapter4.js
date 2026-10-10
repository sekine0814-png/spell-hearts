/* Chapter 4: 水辺の華 */
(() => {
  'use strict';

  const assets = {
    meadow: 'assets/596a09e0-b35c-421f-b5f6-22caff7c813c.jpg',
    river: 'assets/99d34c2a-2be3-4154-8db7-da26576829e6.jpg',
    bridge: 'assets/4301dbbc-ec0a-4d05-b72a-f6728382a200.jpg',
    cliffPath: 'assets/6b50e7c7-4a74-4727-8bad-ef1cea7f8faa.jpg',
    village: 'assets/Remove_all_smoke_coming_from_2K_20261008170311.jpg',
    bgm: 'assets/新しい季節.mp3',
    impact: 'assets/ロボットを強く殴る2.mp3',
    merielAppear: 'assets/セキ.mp3',
    meriel: 'assets/Enhance_the_image_quality_to_2K_20261008180750.jpg',
    merielHome: 'assets/meriel-home-smile-v3.png',
    lilianaAlert: 'assets/liliana-alert.png',
    lilianaHome: 'assets/9f651d54-4f40-43ae-ba68-927002b32109.jpg',
    home: 'assets/c306cbbd-f24e-4a09-ae25-00b9d922ad29.jpg',
    battleBgm: 'assets/愚直の螺旋律_2.mp3',
    aftermathBgm: 'assets/野山.mp3',
    air: 'assets/exec-cf1d9101-c5d6-4ddb-8aa1-e972c2f7a927.png',
    airBattle: 'assets/iris-battle-day.png'
  };
  const line = (text, speaker = '', options = {}) => ({ text, speaker, ...options });
  const lines = [
    line('翌朝。朝露の残る草原を、僕たちは王都へ向けて歩き始めた。'),
    line('昨日の一件があったにもかかわらず、道中は不思議なくらい穏やかだった。'),
    line('足取り、悪くないね。昨日の野営で少しは慣れた？', 'アイリス', { air: true }),
    line('はい。アイリスさんが手際よく教えてくれたおかげです。', '主人公', { air: true }),
    line('ふふっ。じゃあ、次はもう少し難しいことも任せちゃおうかな。', 'アイリス', { air: true }),
    line('冗談めかした声に、思わず笑ってしまう。昨日までの重苦しさが、少しだけ遠のいた気がした。', '', { air: true }),
    line('しばらく歩くと、草原の向こうに陽光を弾く大きな川が見えてきた。', '', { air: true, background: 'river' }),
    line('わあ……。ずいぶん大きな川ですね。', '主人公', { air: true }),
    line('あれはセルグ川。この先しばらくは、あの川沿いを進むよ。', 'アイリス', { air: true }),
    line('山の中に入ったところに橋が架かってるから、そこを渡れば王都への道に戻れる。', 'アイリス', { air: true }),
    line('地図を確かめる仕草にも、迷いはない。旅慣れた彼女が隣にいることが、今は心強かった。', '', { air: true }),
    line('川の流れを横目に、僕たちはさらに歩を進めた。', '', { air: true }),
    line('やがて山道の入口にたどり着く。そこには、谷をまたぐはずの橋が見えていた。', '', { air: true, background: 'bridge' }),
    line('……あちゃー。これは、ちょっと困ったね。', 'アイリス', { air: true }),
    line('橋は中央から大きく崩れ、向こう岸へ渡れる状態ではなかった。', '', { air: true }),
    line('このままじゃ渡れませんね。', '主人公', { air: true }),
    line('うん。もう少し進んで、もっと浅い場所を探すしかないかな。遠回りにはなるけどね。', 'アイリス', { air: true }),
    line('予定が狂ったことに焦りはしたが、立ち止まっていても仕方がない。僕たちは来た道とは別の細い道へと足を向けた。', '', { air: true }),
    line('迂回路に入るにつれて、道は徐々に険しくなっていった。', '', { air: true, background: 'cliffPath' }),
    line('足元は石で丁寧に舗装されている。それでも、柵のない崖のすぐ脇を進むたび、背中が強張った。', '', { air: true }),
    line('下を見ない方がいいですよね、これ。', '主人公', { air: true }),
    line('うん。足元だけ見て、ゆっくり行こう。急ぐ必要はないからね。', 'アイリス', { air: true }),
    line('平静を装うアイリスの声に励まされる。だが、一歩ごとに気を張り続けるせいで、心が少しずつすり減っていくのを感じた。', '', { air: true }),
    line('……あ、この先に農村があったはず。そこで少し休ませてもらおうか。', 'アイリス', { air: true }),
    line('休憩できる場所があるなら助かります。', '主人公', { air: true }),
    line('崖道を抜け、木立の間をさらに進む。しばらくして、谷あいに屋根の連なる景色が見えてきた。', '', { air: true, background: 'village' }),
    line('あった、ここだ。少しだけ寄らせてもらおう。', 'アイリス', { air: true }),
    line('山腹に構える小さな村だった。しかし、これで少しは疲れを癒せるかもしれない。', '', { air: true }),
    line('そのあたりのお宅に声をかけてみましょうか。', '主人公', { air: true }),
    line('そうだね。まずは事情を話して――', 'アイリス', { air: true }),
    line('近くの家へ、僕たちは歩みを進める。', '', { air: true }),
    line('ガキィーーン！！', '', { air: true, impact: true, stopMusic: true }),
    line('一瞬早く反応したのは、アイリスさんだった。', '', { air: true }),
    line('っ……く！', 'アイリス', { air: true, airBattle: true }),
    line('畳み掛けるように、その拳はアイリスさんの構えた盾を追撃する。', '', { air: true }),
    line('な、なに！？', 'アイリス', { air: true }),
    line('反撃を予感したであろうその少女は、身を翻すとバク宙を決めて距離を取った。', '', { air: true }),
    line('……', '？？？', { air: true, meriel: true }),
    line('アイリスさんは盾を構え、警戒を切らさず少女に向き直る。', '', { air: true, meriel: true }),
    line('慌てて剣を抜き構える。だが少女を見ると、悪意があるようには見えなかった。むしろ――', '', { air: true, meriel: true }),
    line('ハァーーーッ！！', '？？？', { air: true, meriel: true }),
    line('思うが早いか、今度は目の合った僕へ少女が飛び込んでくる。', '', { air: true, meriel: true }),
    line('いわゆるガントレットという武器だろうか。身軽な動きで、拳を主体にした戦闘スタイルのようだ。', '', { air: true, meriel: true }),
    line('ドゴオッッ！！！', '', { air: true, meriel: true }),
    line('ぐっ・・・！', '主人公', { air: true, meriel: true }),
    line('ボーッと考えている場合じゃない！ 応戦がやっとだ。この子……強い！', '', { air: true, meriel: true }),
    line('落ち着いて！ 私たちは敵じゃないよ！', 'アイリス', { air: true, meriel: true }),
    line('アイリスさんが叫んでいる。無闇に攻撃しにこないところを見ると、僕と同じく彼女の「悪意の無さ」に気づいているようだ。', '', { air: true, meriel: true }),
    line('しかし、攻撃は止まらない。拳だけでなく、四肢を駆使した体術で圧倒してくる。', '', { air: true, meriel: true }),
    line('やめて！', 'アイリス', { air: true, meriel: true }),
    line('アイリスさんが盾を構えてこちらへ向かってくる。踏み込むや、シールドバッシュで少女を押し返した。', '', { air: true, meriel: true }),
    line('反撃もこちらの意志も、少女は意に介さない。', '', { air: true, meriel: true }),
    line('シールドバッシュに押されて翻った少女が気合いを入れるような構えを取ったかと思うと、ガントレットから白いオーラのようなものが溢れ出てくる。', '', { air: true, meriel: true }),
    line('そして眼光鋭く、カタパルトのようにこちらへ一息で突っ込んでくる。', '', { air: true, meriel: true }),
    line('しょうがない、やるよ！！', 'アイリス', { air: true, meriel: true, battle: true })
  ];
  const aftermathLines = [
    line('激しく戦闘していると、村の方から鋭い声が飛んだ。', ''),
    line('やめなさい！', '？？？', { meriel: true, liliana: true, speakerCard: 'liliana' }),
    line('見ると、女性が少女に向かって半ば怒鳴るように声をかけている。', '', { meriel: true, liliana: true }),
    line('こいつら、橋を壊した奴らだよ！！', '？？？', { meriel: true, liliana: true, speakerCard: 'meriel' }),
    line('少女は、こちらを睨みつけたまま叫んだ。', '', { meriel: true, liliana: true }),
    line('よく見なさい。その方たちが、本当にそんなことをするように見えますか？', '？？？', { meriel: true, liliana: true, speakerCard: 'liliana' }),
    line('誤解だよ。僕たちは橋を渡ろうとして、壊れているのを見つけただけなんだ。', '主人公', { meriel: true, liliana: true }),
    line('私たちも困っているの。壊した人を知っているなら、話を聞かせてほしいくらいだよ。', 'アイリス', { meriel: true, liliana: true }),
    line('二人の声を聞き、少女の拳から少しずつ力が抜けていく。', '', { meriel: true, liliana: true }),
    line('……謝りなさい。', '？？？', { meriel: true, liliana: true, speakerCard: 'liliana' }),
    line('ご、ごめん……。', '？？？', { meriel: true, liliana: true, speakerCard: 'meriel' }),
    line('橋を壊した人たちだと思い込んでいたんだ。村のみんなが、すごく困ってるから……。', '？？？', { meriel: true, liliana: true, speakerCard: 'meriel' }),
    line('事情があるのは分かりました。大丈夫です。', '主人公', { meriel: true, liliana: true }),
    line('ごめんなさいね。よかったら、うちで少し休んでいって。', '？？？', { meriel: true, liliana: true, speakerCard: 'liliana' }),
    line('招きに甘え、僕たちは家の中へ通された。', '', { background: 'home', home: true, meriel: true, liliana: true }),
    line('改めて自己紹介するね。私はリリアーナ。みんなからはリリって呼ばれてるわ。', 'リリアーナ', { home: true, meriel: true, liliana: true }),
    line('メリールだよ。さっきは、本当にごめん。', 'メリール', { home: true, meriel: true, liliana: true }),
    line('ここは王都と米や野菜をやり取りして、生計を立てている農村なんです。だから橋が壊れてから、取引も通行も難しくなってしまって・・・。', 'リリアーナ', { home: true, meriel: true, liliana: true }),
    line('橋が壊れてた日、村の人が、二人の怪しい人影を見たって言ってたんだ。', 'メリール', { home: true, meriel: true, liliana: true }),
    line('なるほど、それで僕たち二人をその怪しい人影と勘違いしたのか。', '', { home: true, meriel: true, liliana: true }),
    line('とにかく今夜はゆっくり休みましょう。食事も寝床も用意しますからね。', 'リリアーナ', { home: true, meriel: true, liliana: true }),
    line('温かな夕食をいただき、久しぶりに屋根の下で床についた。', '', { home: true, meriel: true, liliana: true }),
    line('翌朝。朝食を囲みながら、アイリスさんが静かに口を開いた。', '', { home: true, meriel: true, liliana: true, morning: true }),
    line('休ませてもらったお礼に、王都に着いたら建築を生業にしている知り合いへ橋のことを頼んでみるよ。', 'アイリス', { home: true, meriel: true, liliana: true }),
    line('本当に！？', 'メリール', { home: true, meriel: true, liliana: true }),
    line('ありがとう……本当にありがとう。', 'リリアーナ', { home: true, meriel: true, liliana: true }),
    line('二人に見送られ、僕たちは再び王都への道へ歩き出した。', '', { home: true, meriel: true, liliana: true }),
    line('二人の人影、か……。', '主人公', { home: true, meriel: true, liliana: true, ending: true })
  ];
  let scene;

  function createScene() {
    if (scene) return scene;
    scene = document.createElement('section');
    scene.id = 'chapterFourScene';
    scene.hidden = true;
    scene.innerHTML = `
      <img class="chapter4-background" src="${assets.meadow}" alt="草原">
      <div class="chapter4-fade" aria-hidden="true"></div>
      <audio class="chapter4-bgm" src="${assets.bgm}" loop preload="metadata"></audio>
      <audio class="chapter4-impact" src="${assets.impact}" preload="auto"></audio>
      <audio class="chapter4-meriel-appear" src="${assets.merielAppear}" preload="auto"></audio>
      <button class="chapter4-return" type="button">タイトルに戻る</button>
      <img class="chapter4-air" src="${assets.air}" alt="アイリス" hidden>
      <img class="chapter4-meriel" src="${assets.meriel}" alt="？？？" hidden>
      <img class="chapter4-liliana" src="${assets.lilianaAlert}" alt="？？？" hidden>
      <button class="chapter4-dialogue" type="button" aria-label="会話を進める"><b hidden></b><p></p><i aria-hidden="true">▼</i></button>`;
    document.body.append(scene);
    installStyle();
    scene.querySelector('.chapter4-return').onclick = () => {
      stopChapter4AftermathBgm(scene);
      window.confirmReturnToTitle?.();
    };
    return scene;
  }

  function installStyle() {
    if (document.querySelector('#chapter4Style')) return;
    const style = document.createElement('style');
    style.id = 'chapter4Style';
    style.textContent = `
      #chapterFourScene{position:fixed;z-index:500;inset:0;overflow:hidden;background:#020409;color:#f9ead0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;isolation:isolate}#chapterFourScene[hidden]{display:none}
      .chapter4-background{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.84) saturate(.88);transition:opacity .72s ease}.chapter4-fade{position:absolute;z-index:10;inset:0;background:#000;opacity:1;pointer-events:none;transition:opacity .8s ease}
      .chapter4-return{position:absolute;z-index:6;top:14px;right:16px;padding:10px 18px;border:1px solid #d8ae4e;border-radius:4px;background:linear-gradient(180deg,rgba(81,57,18,.94),rgba(23,14,5,.97));color:#fff0ba;font:15px Georgia,"Yu Mincho",serif;letter-spacing:.1em;cursor:pointer}
      .chapter4-air{position:absolute;z-index:2;left:22vw;bottom:36vh;width:min(22vw,285px);max-height:59vh;object-fit:contain;opacity:.78;pointer-events:none;filter:brightness(.65) saturate(.72) drop-shadow(0 10px 14px #0009);transform:translateX(-14px) scale(.92);transition:opacity .35s ease,transform .35s ease,filter .35s ease}.chapter4-air[hidden]{display:none}.chapter4-air.talking{z-index:4;opacity:1;transform:translateX(0) scale(1.06);filter:brightness(1.08) saturate(1.02) drop-shadow(0 0 12px rgba(225,205,138,.42))}
      .chapter4-meriel{position:absolute;z-index:2;right:22vw;bottom:36vh;width:min(22vw,285px);max-height:59vh;object-fit:contain;opacity:.78;pointer-events:none;filter:brightness(.65) saturate(.72) drop-shadow(0 10px 14px #0009);transform:translateX(14px) scale(.92);transition:opacity .35s ease,transform .35s ease,filter .35s ease}.chapter4-meriel[hidden]{display:none}.chapter4-meriel.talking{z-index:4;opacity:1;transform:translateX(0) scale(1.06);filter:brightness(1.08) saturate(1.02) drop-shadow(0 0 12px rgba(225,205,138,.42))}
      .chapter4-liliana{position:absolute;z-index:2;right:3vw;bottom:35vh;width:min(18vw,225px);max-height:55vh;object-fit:contain;opacity:.82;pointer-events:none;filter:brightness(.7) saturate(.76) drop-shadow(0 10px 14px #0009);transform:translateX(14px) scale(.92);transition:opacity .35s ease,transform .35s ease,filter .35s ease}.chapter4-liliana[hidden]{display:none}.chapter4-liliana.talking{z-index:4;opacity:1;transform:translateX(0) scale(1.05);filter:brightness(1.07) saturate(1.02) drop-shadow(0 0 12px rgba(225,205,138,.42))}.chapter4-liliana.home{left:22vw;right:auto;bottom:36vh;width:min(22vw,285px);max-height:59vh;transform:translateX(-14px) scale(.92)}.chapter4-liliana.home.talking{transform:translateX(0) scale(1.06)}.chapter4-meriel.home{right:22vw;bottom:36vh;filter:brightness(.65) saturate(.52) drop-shadow(0 10px 14px #0009)}.chapter4-meriel.home.talking{filter:brightness(1.04) saturate(.7) drop-shadow(0 0 12px rgba(225,205,138,.42))}
      #chapter4BattleCards{position:fixed;z-index:138;inset:0;pointer-events:none}#chapter4BattleCards img{position:absolute;right:3vw;bottom:30vh;width:min(23vw,300px);max-height:66vh;object-fit:contain;filter:drop-shadow(0 8px 14px #0009)}#chapter4BattleFade{position:fixed;z-index:170;inset:0;background:#000;opacity:1;pointer-events:none;transition:opacity .7s ease}#chapter4BattleFade.out{opacity:0}
      #chapter4Ending{position:absolute;z-index:11;inset:0;display:grid;place-items:center;border:0;background:#000;color:#fff0b4;opacity:0;cursor:pointer;transition:opacity .9s ease}#chapter4Ending.show{opacity:1}#chapter4Ending span{font:clamp(32px,5vw,70px) Georgia,"Yu Mincho",serif;letter-spacing:.16em;text-shadow:0 0 20px #d99a22,0 3px 8px #000}
      .chapter4-dialogue{position:absolute;z-index:5;left:50%;bottom:5.5vh;width:min(88vw,920px);min-height:144px;padding:26px 42px 30px;transform:translate(-50%,16px);border:1px solid #d8ae4e;border-radius:5px;background:rgba(4,5,9,.76);box-shadow:inset 0 0 22px rgba(255,217,129,.12),0 8px 26px #000b;color:#f9ead0;opacity:0;pointer-events:none;text-align:left;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;transition:opacity .35s ease,transform .35s ease}.chapter4-dialogue.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}.chapter4-dialogue:before{content:"";position:absolute;inset:8px;border:1px solid rgba(225,184,77,.32);border-radius:2px;pointer-events:none}.chapter4-dialogue b{position:absolute;z-index:1;left:26px;top:-17px;min-width:120px;padding:7px 17px;border:1px solid #d8ae4e;border-radius:3px;background:linear-gradient(180deg,rgba(59,43,18,.97),rgba(14,10,5,.98));color:#fff0ae;font:16px Georgia,"Yu Mincho",serif;letter-spacing:.14em;text-align:center}.chapter4-dialogue p{position:relative;margin:16px 20px 0;white-space:pre-line;font:clamp(16px,1.35vw,22px)/1.65 "Yu Mincho","Hiragino Mincho ProN",serif;letter-spacing:.08em;text-shadow:0 2px 4px #000}.chapter4-dialogue i{position:absolute;right:24px;bottom:16px;width:0;height:0;border-right:10px solid transparent;border-left:10px solid transparent;border-top:12px solid #f5d77c;filter:drop-shadow(0 1px 3px #000);animation:chapter4-next .82s ease-in-out infinite}.chapter4-dialogue.last i{display:none}@keyframes chapter4-next{50%{opacity:.45;transform:translateY(6px)}}
      @media (pointer:coarse) and (orientation:landscape){.chapter4-return{top:7px;right:9px;padding:5px 9px;font-size:10px}.chapter4-air,.chapter4-meriel{bottom:27vh;width:min(17vw,150px);max-height:calc(100vh - 148px)}.chapter4-air{left:7vw}.chapter4-meriel{right:7vw}.chapter4-liliana{right:1vw;bottom:27vh;width:min(14vw,125px);max-height:48vh}.chapter4-liliana.home{left:7vw;right:auto;bottom:27vh;width:min(17vw,150px);max-height:calc(100vh - 148px)}#chapter4BattleCards img{right:1vw;bottom:23vh;width:min(22vw,200px);max-height:54vh}.chapter4-dialogue{bottom:8px;width:min(60vw,760px);min-height:94px;padding:15px 20px 18px}.chapter4-dialogue b{left:14px;top:-12px;min-width:88px;padding:4px 9px;font-size:11px}.chapter4-dialogue p{margin:9px 6px 0;font-size:clamp(11px,2vh,14px);line-height:1.45;letter-spacing:.035em}.chapter4-dialogue i{right:13px;bottom:9px;transform:scale(.68)}}
    `;
    document.head.append(style);
  }

  function startChapterFour() {
    document.querySelector('#titleBgm')?.pause();
    document.querySelector('#storyModePanel')?.setAttribute('hidden', '');
    const root = createScene();
    const bg = root.querySelector('.chapter4-background');
    const fade = root.querySelector('.chapter4-fade');
    const dialogue = root.querySelector('.chapter4-dialogue');
    const speaker = dialogue.querySelector('b');
    const text = dialogue.querySelector('p');
    const music = root.querySelector('.chapter4-bgm');
    const impact = root.querySelector('.chapter4-impact');
    const merielAppear = root.querySelector('.chapter4-meriel-appear');
    const air = root.querySelector('.chapter4-air');
    const meriel = root.querySelector('.chapter4-meriel');
    const liliana = root.querySelector('.chapter4-liliana');
    let index = 0;
    let changing = false;
    let merielIntroduced = false;
    let airBattle = false;

    const render = () => {
      const current = lines[index];
      const applyContent = () => {
      if (current.airBattle) airBattle = true;
      air.hidden = !current.air;
      air.src = airBattle ? assets.airBattle : assets.air;
      meriel.hidden = !current.meriel;
      liliana.hidden = true;
      speaker.hidden = !current.speaker;
      speaker.textContent = current.speaker === '主人公' ? (window.getSpellHeartsNickname?.() || '主人公') : (current.speaker || '');
      text.textContent = current.speaker ? `「${current.text}」` : current.text;
      air.classList.toggle('talking', current.speaker === 'アイリス');
      meriel.classList.toggle('talking', current.speaker === '？？？');
      if (current.impact) { impact.currentTime = 0; impact.volume = 0.34; impact.play().catch(() => {}); }
      if (current.meriel && !merielIntroduced) {
        merielIntroduced = true;
        merielAppear.currentTime = 0;
        merielAppear.volume = 0.08;
        merielAppear.play().catch(() => {});
      }
      if (current.stopMusic) { music.pause(); music.currentTime = 0; }
      dialogue.classList.toggle('last', index === lines.length - 1 && !current.battle);
      };
      if (current.background) {
        changing = true;
        dialogue.classList.remove('show');
        // 次の文章は、暗転で画面全体を覆ってから差し替える。
        fade.style.opacity = '1';
        window.setTimeout(() => {
          applyContent();
          bg.src = assets[current.background];
          const reveal = () => window.setTimeout(() => {
            fade.style.opacity = '0';
            changing = false;
            dialogue.classList.add('show');
          }, 80);
          bg.addEventListener('load', reveal, { once: true });
          bg.addEventListener('error', reveal, { once: true });
        }, 820);
        return;
      }
      applyContent();
    };
    const beginMerielBattle = () => {
      if (changing) return;
      changing = true;
      dialogue.classList.remove('show');
      fade.style.opacity = '1';
      music.pause();
      merielAppear.pause();
      merielAppear.currentTime = 0;
      // 最後の会話クリック中に起動して、モバイルでも戦闘曲の再生許可を得る。
      startMerielBattleMusic();
      window.setTimeout(() => {
        const title = document.querySelector('#titleScreen');
        if (title) {
          title.classList.add('dismiss');
          title.style.setProperty('transition', 'none', 'important');
          title.style.setProperty('opacity', '0', 'important');
          title.style.setProperty('visibility', 'hidden', 'important');
        }
        root.hidden = true;
        document.body.classList.remove('story-active', 'story-cinematic');
        setupMerielBattleBoard();
        watchMerielBattleResult(root);
        const oldFade = document.querySelector('#chapter4BattleFade');
        oldFade?.remove();
        const battleFade = document.createElement('div');
        battleFade.id = 'chapter4BattleFade';
        document.body.append(battleFade);
        requestAnimationFrame(() => requestAnimationFrame(() => battleFade.classList.add('out')));
        window.setTimeout(() => battleFade.remove(), 780);
      }, 820);
    };
    dialogue.onclick = () => {
      if (changing) return;
      if (lines[index].battle) { beginMerielBattle(); return; }
      if (index >= lines.length - 1) return;
      index += 1;
      render();
    };
    root.hidden = false;
    air.hidden = true;
    airBattle = false;
    air.src = assets.air;
    meriel.hidden = true;
    meriel.src = assets.meriel;
    meriel.classList.remove('home');
    liliana.hidden = true;
    liliana.src = assets.lilianaAlert;
    liliana.classList.remove('home');
    music.pause();
    music.currentTime = 0;
    music.volume = 0.05;
    music.play().catch(() => {});
    bg.src = assets.meadow;
    fade.style.opacity = '1';
    dialogue.classList.remove('show');
    render();
    requestAnimationFrame(() => { fade.style.opacity = '0'; });
    window.setTimeout(() => dialogue.classList.add('show'), 850);
  }

  function startMerielBattleMusic() {
    const battleMusic = document.querySelector('#battleBgm');
    if (!battleMusic) return;
    battleMusic.pause();
    battleMusic.src = assets.battleBgm;
    battleMusic.volume = 0.06;
    battleMusic.load();
    battleMusic.play().catch(() => {});
  }

  function setupMerielBattleBoard() {
    let cards = document.querySelector('#chapter4BattleCards');
    if (!cards) { cards = document.createElement('div'); cards.id = 'chapter4BattleCards'; document.body.append(cards); }
    cards.innerHTML = `<img src="${assets.meriel}" alt="メリール">`;
    const result = document.querySelector('#resultScreen');
    result?.classList.remove('show');
    if (result) delete result.dataset.chapter4Advancing;
    window.start?.();
    window.setBattleBackdrop?.(assets.village.replace(/^assets\//, ''));
  }

  function watchMerielBattleResult(root) {
    let handled = false;
    const check = () => {
      if (handled) return;
      const result = document.querySelector('#resultScreen');
      if (!result?.classList.contains('show')) return;
      const won = Boolean(result.querySelector('.result-red'));
      const lost = Boolean(result.querySelector('.result-blue, .result-draw'));
      if (!won && !lost) return;
      handled = true;
      observer.disconnect();
      window.clearInterval(poll);
      showMerielResult(result, won, root);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    const poll = window.setInterval(check, 100);
    check();
  }

  function showMerielResult(result, won, root) {
    result.classList.add('show');
    result.onclick = null;
    result.innerHTML = won
      ? '<div class="result-stack"><div class="result-word result-red">RED WIN</div></div>'
      : '<div class="result-stack"><div class="result-word result-blue">DEFEAT</div><div class="result-actions"><button class="result-retry" type="button" data-meriel-retry>もう一度戦う</button><button class="result-retry" type="button" data-meriel-give-up>諦める</button></div></div>';
    if (won) {
      result.onclick = () => {
        if (result.dataset.chapter4Advancing === 'true') return;
        result.dataset.chapter4Advancing = 'true';
        result.classList.remove('show');
        window.setTimeout(() => startMerielAftermath(root), 620);
      };
      return;
    }
    result.querySelector('[data-meriel-retry]').onclick = () => {
      startMerielBattleMusic();
      setupMerielBattleBoard();
      watchMerielBattleResult(root);
    };
    result.querySelector('[data-meriel-give-up]').onclick = () => window.returnToTitle?.();
  }

  function startMerielAftermath(root) {
    document.querySelector('#chapter4BattleCards')?.remove();
    document.querySelector('#resultScreen')?.classList.remove('show');
    const battleMusic = document.querySelector('#battleBgm');
    battleMusic?.pause();
    if (battleMusic) battleMusic.currentTime = 0;
    startChapter4AftermathBgm(root);
    document.body.classList.add('story-active', 'story-cinematic');
    const bg = root.querySelector('.chapter4-background');
    const fade = root.querySelector('.chapter4-fade');
    const dialogue = root.querySelector('.chapter4-dialogue');
    const speaker = dialogue.querySelector('b');
    const text = dialogue.querySelector('p');
    const air = root.querySelector('.chapter4-air');
    const meriel = root.querySelector('.chapter4-meriel');
    const liliana = root.querySelector('.chapter4-liliana');
    let index = 0;
    let changing = false;

    const render = () => {
      const current = aftermathLines[index];
      const applyContent = () => {
        // 決着直後の会話では、アイリスを左に残して三人の状況を見せる。
        // 室内へ入った後は、左側をリリアーナの位置として使うため隠す。
        air.hidden = Boolean(current.home);
        meriel.hidden = !current.meriel;
        liliana.hidden = !current.liliana;
        meriel.src = current.home ? assets.merielHome : assets.meriel;
        liliana.src = current.home ? assets.lilianaHome : assets.lilianaAlert;
        meriel.alt = current.home ? 'メリール' : '？？？';
        liliana.alt = current.home ? 'リリアーナ' : '？？？';
        meriel.classList.toggle('home', Boolean(current.home));
        liliana.classList.toggle('home', Boolean(current.home));
        speaker.hidden = !current.speaker;
        speaker.textContent = current.speaker === '主人公' ? (window.getSpellHeartsNickname?.() || '主人公') : (current.speaker || '');
        text.textContent = current.speaker ? `「${current.text}」` : current.text;
        air.classList.toggle('talking', current.speaker === 'アイリス');
        meriel.classList.toggle('talking', current.speaker === 'メリール' || current.speakerCard === 'meriel');
        liliana.classList.toggle('talking', current.speaker === 'リリアーナ' || current.speakerCard === 'liliana');
        dialogue.classList.toggle('last', Boolean(current.ending));
      };
      if (current.background || current.morning) {
        changing = true;
        dialogue.classList.remove('show');
        fade.style.opacity = '1';
        window.setTimeout(() => {
          applyContent();
          const reveal = () => window.setTimeout(() => {
            fade.style.opacity = '0';
            changing = false;
            dialogue.classList.add('show');
          }, 80);
          // 同じ家の背景のまま翌朝へ移る場合も、必ず一度完全に暗転させる。
          // 画像を再読み込みせずに幕だけ開くため、キャッシュ状態に左右されない。
          if (current.morning) { reveal(); return; }
          bg.addEventListener('load', reveal, { once: true });
          bg.addEventListener('error', reveal, { once: true });
          bg.src = assets[current.background];
        }, 820);
        return;
      }
      applyContent();
    };

    dialogue.onclick = () => {
      if (changing) return;
      if (aftermathLines[index].ending) { endChapterFour(root, dialogue, meriel, liliana); return; }
      index += 1;
      render();
    };
    root.querySelector('#chapter4Ending')?.remove();
    root.hidden = false;
    bg.src = assets.village;
    fade.style.opacity = '1';
    dialogue.classList.remove('show');
    render();
    requestAnimationFrame(() => { fade.style.opacity = '0'; });
    window.setTimeout(() => dialogue.classList.add('show'), 850);
  }

  function startChapter4AftermathBgm(root) {
    let music = root.querySelector('.chapter4-aftermath-bgm');
    if (!music) {
      music = document.createElement('audio');
      music.className = 'chapter4-aftermath-bgm';
      music.src = assets.aftermathBgm;
      music.loop = true;
      music.preload = 'auto';
      root.append(music);
    }
    music.pause();
    music.currentTime = 0;
    music.volume = 0.05;
    music.play().catch(() => {});
  }

  function stopChapter4AftermathBgm(root) {
    const music = root?.querySelector('.chapter4-aftermath-bgm');
    if (!music) return;
    music.pause();
    music.currentTime = 0;
  }

  function endChapterFour(root, dialogue, meriel, liliana) {
    dialogue.classList.remove('show');
    meriel.hidden = true;
    liliana.hidden = true;
    const ending = document.createElement('button');
    ending.id = 'chapter4Ending';
    ending.type = 'button';
    ending.setAttribute('aria-label', 'タイトルに戻る');
    ending.innerHTML = '<span>Chapter 4 終了</span>';
    ending.onclick = () => {
      stopChapter4AftermathBgm(root);
      window.completeStoryChapter?.('chapter-four');
      window.confirmReturnToTitle?.();
    };
    root.append(ending);
    requestAnimationFrame(() => ending.classList.add('show'));
  }

  window.startChapterFour = startChapterFour;
})();
