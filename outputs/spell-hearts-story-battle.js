/*
 * Story battle runtime
 *
 * Story scenes may show character art.  Battle scenes may show only the game
 * board.  Keeping those two DOM trees separate prevents a scene portrait from
 * becoming an extra card in a battle or surviving a fade to the title screen.
 */
(()=>{
  const battleKinds=new Set(['tutorial','wolf','air']);
  let activeKind=null;

  function removeLegacyBattleVisuals(){
    document.querySelectorAll(
      '#storyBattleOpponentCard,#storyAirOpponentCard,.story-battle-opponent-card,.board-flight'
    ).forEach(node=>node.remove());
  }

  function resetBoard(){
    const result=document.querySelector('#resultScreen');
    if(result){result.classList.remove('show');result.replaceChildren();result.onclick=null;}
    for(const id of ['pBattle','cBattle','pSpell','cSpell','pPlayed','cPlayed','pGrave','cGrave']){
      document.getElementById(id)?.replaceChildren();
    }
  }

  function begin(config){
    if(!battleKinds.has(config?.kind))return;
    activeKind=config.kind;
    removeLegacyBattleVisuals();
    resetBoard();
    document.body.classList.remove('story-cinematic','story-battle-tutorial','story-battle-wolf','story-battle-air');
    document.body.classList.add('story-active','story-battle-active',`story-battle-${activeKind}`);

    // The normal battle engine owns every board slot from this point onward.
    window.start?.();
    if(typeof g!=='undefined'){
      g.p.deck=[...(config.playerDeck||['scheme','block','pursuit'])];
      g.c.deck=[...(config.cpuDeck||['pursuit','scheme','block'])];
      window.render?.();
    }
    window.setBattleBackdrop?.(config.backdrop||'story-training-ground.webp');
  }

  function finish(kind){
    if(kind&&kind!==activeKind)return;
    activeKind=null;
    removeLegacyBattleVisuals();
    document.body.classList.remove('story-battle-active','story-battle-tutorial','story-battle-wolf','story-battle-air');
  }

  // A title transition or scene fade must never retain battle-only DOM.
  new MutationObserver(()=>{
    const title=document.querySelector('#titleScreen');
    if(document.body&&title&&!title.classList.contains('dismiss')){
      activeKind=null;
      removeLegacyBattleVisuals();
      document.body.classList.remove('story-battle-active','story-battle-tutorial','story-battle-wolf','story-battle-air');
    }
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});

  window.SpellHeartsStoryBattleStart=begin;
  window.SpellHeartsStoryBattleFinish=finish;
})();
