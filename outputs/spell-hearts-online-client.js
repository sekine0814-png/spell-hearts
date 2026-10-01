/* Online battle adapter. It never creates, moves, or reuses a card element. */
(()=>{
  const $=id=>document.getElementById(id), overlay=$('overlay');
  let socket=null, assignedSide=null, ownName='';
  const send=(type,extra={})=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,...extra}));};
  const close=()=>{if(socket){socket.onclose=null;socket.close();socket=null;}};
  function showNote(text){const note=$('note');if(note)note.textContent=text;}
  function receive(state){
    const ownSide=state.red.nickname===ownName?'p':state.blue.nickname===ownName?'c':(state.side||assignedSide);
    document.body.dataset.me=ownSide==='p'?'r':'b'; document.body.dataset.online='1';
    window.SHOnlineSide=ownSide==='p'?'r':'b'; window.SHOnlineController=window.SHOnline.controller;
    const toSide=data=>({hp:data.hp,spell:data.spell,deck:Array.from({length:data.deckCount},()=>null),name:data.nickname});
    g={r:toSide(state.red),b:toSide(state.blue),me:ownSide==='p'?'r':'b',online:true,phase:state.phase==='opening'?'open':state.phase,round:state.round,rp:state.battle?.a||null,bp:state.battle?.b||null,hand:state.hand||[],canUse:!!state.canUse,canOk:!!state.canOk,msg:state.message};
    $('title').classList.add('hide');$('app').classList.remove('hide');overlay.classList.add('hide');window.SHRender();
  }
  function connect(room,nickname){
    close();ownName=nickname||`ゲスト${Math.random().toString(36).slice(2,7)}`;showNote('接続しています…');
    const protocol=location.protocol==='https:'?'wss':'ws';socket=new WebSocket(`${protocol}://${location.host}`);
    socket.onopen=()=>send('join',{room,nickname:ownName});
    socket.onmessage=event=>{let packet;try{packet=JSON.parse(event.data);}catch{return;}if(packet.type==='joined')assignedSide=packet.side;else if(packet.type==='state')receive(packet.state);else if(packet.type==='error')showNote(packet.message||'接続できませんでした。');};
    socket.onerror=()=>showNote('サーバーへ接続できませんでした。');
    socket.onclose=()=>{if(!$('title').classList.contains('hide'))return;if(g){g.msg='接続が切れました。タイトルに戻って再入室してください。';window.SHRender();}};
  }
  window.SHOnline={
    open(){
      overlay.innerHTML='
オンライン対戦

同じ合言葉の二人で入室してください。

入室戻る

';
      overlay.classList.remove('hide');$('cancel').onclick=()=>overlay.classList.add('hide');$('join').onclick=()=>{const room=$('room').value.trim(),name=$('nickname').value.trim();if(!room){showNote('合言葉を入力してください。');return;}connect(room,name);};
    },
    controller:{draw(){send('draw');},pick(card){send('pick',{card});},use(){send('use');},ok(){send('ok');},close}
  };
})();
