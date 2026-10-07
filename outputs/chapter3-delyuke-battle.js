/*
 * Chapter 3: デリューク戦
 * spell-hearts-auth.js の後に読み込む追加モジュール。
 * 物語の最後の「振りかざした二人の刃が重なった・・・！」を押すと戦闘へ移行する。
 */
(() => {
  const AIR_CARD = 'assets/exec-aad00cca-1829-4589-bfe0-4928ffa9b89d.png';
  const DELYUKE_CARD = 'assets/exec-de0615d8-6dfe-4ee0-af48-a7ce0210f4e2.png';
  const EVENING_BG = 'assets/862dbc28-ef1d-474f-becc-68ab30b979fd.jpg';
  let chapterScene = null;

  function addStyle() {
    if (document.querySelector('#chapter3DelyukeBattleStyle')) return;
    const style = document.createElement('style');
    style.id = 'chapter3DelyukeBattleStyle';
    style.textContent = `
      #chapter3BattleAir,#chapter3BattleDelyuke{
        position:fixed;z-index:140;bottom:10vh;width:min(19vw,285px);max-height:62vh;
        object-fit:contain;filter:drop-shadow(0 10px 16px #000b);pointer-events:none;
      }
      #chapter3BattleAir{left:max(1.2vw,calc(50% - 770px));}
      #chapter3BattleDelyuke{right:max(1.2vw,calc(50% - 770px));}
      #chapter3BattleAir[hidden],#chapter3BattleDelyuke[hidden]{display:none!important;}
      #chapter3DelyukeContinue{position:fixed;z-index:300;inset:0;display:grid;place-items:center;
        background:rgba(0,0,0,.82);color:#fff0b4;text-align:center;}
      #chapter3DelyukeContinue[hidden]{display:none;}
      #chapter3DelyukeContinue button{border:0;background:transparent;color:#fff0b4;cursor:pointer;}
      #chapter3DelyukeContinue b{display:block;font:clamp(38px,6vw,76px) Georgia,"Yu Mincho",serif;
        letter-spacing:.16em;text-shadow:0 0 20px #d99a22,0 3px 8px #000;}
      #chapter3DelyukeContinue small{display:block;margin-top:18px;font:14px "Yu Gothic",sans-serif;
        letter-spacing:.12em;color:#d8c58d;}
      @media(max-width:760px),(pointer:coarse) and (orientation:landscape){
        #chapter3BattleAir,#chapter3BattleDelyuke{bottom:12vh;width:min(18vw,175px);max-height:52vh;}
        #chapter3BattleAir{left:0;}#chapter3BattleDelyuke{right:0;}
      }
    `;
    document.head.append(style);
  }

  function battleCards(show) {
    let air = document.querySelector('#chapter3BattleAir');
    let delyuke = document.querySelector('#chapter3BattleDelyuke');
    if (!air) {
      air = document.createElement('img');
      air.id = 'chapter3BattleAir';
      air.alt = 'エア';
      air.src = AIR_CARD;
      document.body.append(air);
    }
    if (!delyuke) {
      delyuke = document.createElement('img');
      delyuke.id = 'chapter3BattleDelyuke';
      delyuke.alt = 'デリューク';
      delyuke.src = DELYUKE_CARD;
      document.body.append(delyuke);
    }
    air.hidden = !show;
    delyuke.hidden = !show;
  }

  function clearBattleResult() {
    const result = document.querySelector('#resultScreen');
    if (result) {
      result.classList.remove('show');
      result.innerHTML = '';
      result.onclick = null;
    }
  }

  function restoreChapterScene() {
    window.storyDelyukeBattleActive = false;
    battleCards(false);
    document.querySelector('#battleBgm')?.pause();
    const scene = chapterScene || document.querySelector('#chapterThreeScene');
    if (!scene) return;
    document.body.classList.add('story-active', 'story-cinematic');
    scene.hidden = false;
    scene.classList.add('scene-intro', 'scene-backdrop-visible', 'scene-dialogue', 'scene-present');
    scene.style.opacity = '1';
    const dialogue = scene.querySelector('.chapter-three-dialogue');
    const speaker = dialogue?.querySelector('.chapter-three-speaker');
    const body = dialogue?.querySelector('p');
    if (speaker) speaker.hidden = true;
    if (body) body.textContent = 'デリュークとの戦いに勝利した。';
    if (dialogue) {
      dialogue.style.opacity = '1';
      dialogue.style.pointerEvents = 'auto';
    }
  }

  function showVictoryContinue() {
    let end = document.querySelector('#chapter3DelyukeContinue');
    if (!end) {
      end = document.createElement('section');
      end.id = 'chapter3DelyukeContinue';
      end.innerHTML = '<button type="button"><b>VICTORY</b><small>続ける</small></button>';
      document.body.append(end);
      end.querySelector('button').onclick = () => {
        end.hidden = true;
        if (typeof window.continueChapterThreeAfterDelyukeBattle === 'function') {
          window.continueChapterThreeAfterDelyukeBattle();
        } else {
          restoreChapterScene();
        }
      };
    }
    end.hidden = false;
  }

  function beginDelyukeBattle(scene) {
    if (window.storyDelyukeBattleActive) return;
    chapterScene = scene;
    window.storyDelyukeBattleActive = true;
    scene.querySelector('#chapterThreeBgm')?.pause();
    scene.hidden = true;
    document.body.classList.remove('story-cinematic');
    document.querySelector('main')?.style.removeProperty('visibility');
    document.querySelector('#storyAirOpponentCard')?.setAttribute('hidden', '');
    document.querySelector('#storyBattleOpponentCard')?.setAttribute('hidden', '');
    window.start?.();
    if (typeof g !== 'undefined') {
      g.p.deck = ['pursuit', 'scheme', 'block'];
      g.c.deck = ['block', 'pursuit', 'scheme'];
    }
    window.setBattleBackdrop?.('862dbc28-ef1d-474f-becc-68ab30b979fd.jpg');
    document.body.style.setProperty('background-color', '#08070a', 'important');
    document.body.style.setProperty('background-image', `linear-gradient(rgba(3,4,9,.26),rgba(3,4,9,.48)),url("${EVENING_BG}")`, 'important');
    document.body.style.setProperty('background-position', 'center', 'important');
    document.body.style.setProperty('background-size', 'cover', 'important');
    document.body.style.setProperty('background-attachment', 'fixed', 'important');
    document.body.style.setProperty('background-repeat', 'no-repeat', 'important');
    battleCards(true);
    window.startBgm?.();
    window.render?.();
  }

  function showDefeatChoices() {
    const result = document.querySelector('#resultScreen');
    if (!result) return;
    result.innerHTML = `
      <div class="result-stack">
        <div class="result-word result-blue">DEFEAT</div>
        <div class="result-actions">
          <button class="result-retry" type="button" data-delyuke-retry>もう一度戦う</button>
          <button class="result-retry" type="button" data-delyuke-give-up>諦める</button>
        </div>
      </div>`;
    result.querySelector('[data-delyuke-retry]').onclick = () => {
      clearBattleResult();
      window.storyDelyukeBattleActive = false;
      beginDelyukeBattle(chapterScene);
    };
    result.querySelector('[data-delyuke-give-up]').onclick = () => {
      window.storyDelyukeBattleActive = false;
      battleCards(false);
      clearBattleResult();
      window.returnToTitle?.();
    };
    requestAnimationFrame(() => result.classList.add('show'));
  }

  function installResultHandler() {
    const original = window.render;
    if (typeof original !== 'function' || original.chapter3DelyukeResultInstalled) return false;
    const wrapped = function (...args) {
      const rendered = original.apply(this, args);
      if (window.storyDelyukeBattleActive && typeof g !== 'undefined' && g?.phase === 'end') {
        const playerWon = Number(g.p?.hp || 0) > Number(g.c?.hp || 0);
        if (playerWon) {
          clearBattleResult();
          battleCards(false);
          showVictoryContinue();
        } else {
          showDefeatChoices();
        }
      }
      return rendered;
    };
    wrapped.chapter3DelyukeResultInstalled = true;
    window.render = wrapped;
    return true;
  }

  function attachClashTrigger() {
    const scene = document.querySelector('#chapterThreeScene');
    const dialogue = scene?.querySelector('.chapter-three-dialogue');
    if (!dialogue || dialogue.dataset.delyukeBattleHook === '1') return;
    dialogue.dataset.delyukeBattleHook = '1';
    dialogue.addEventListener('click', event => {
      const text = dialogue.querySelector('p')?.textContent?.replace(/\s/g, '') || '';
      if (!text.includes('振りかざした二人の刃が重なった・・・！')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      beginDelyukeBattle(scene);
    }, true);
  }

  function install() {
    addStyle();
    installResultHandler();
    const originalStart = window.startChapterThree;
    if (typeof originalStart === 'function' && !originalStart.chapter3DelyukeBattleInstalled) {
      const wrappedStart = function (...args) {
        const result = originalStart.apply(this, args);
        setTimeout(attachClashTrigger, 0);
        return result;
      };
      wrappedStart.chapter3DelyukeBattleInstalled = true;
      window.startChapterThree = wrappedStart;
    }
  }

  const timer = setInterval(() => {
    install();
    if (window.startChapterThree && window.render) clearInterval(timer);
  }, 100);
})();
