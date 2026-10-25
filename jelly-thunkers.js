(()=>{
  'use strict';
  const get=id=>document.getElementById(id),panel=get('jellyThunkers'),content=window.JellyThunkersContent;
  if(!panel||!content)return;
  const start=get('thunkersStart'),stop=get('thunkersStop'),worse=get('thunkersWorse'),status=get('thunkersStatus'),progress=get('thunkersProgress'),verdict=get('thunkersVerdict'),board=get('thunkersBoard'),log=get('thunkersLog'),caption=get('thunkersCaption');
  const storageKey='idleon-thunkers-variety-v1';
  let saved={bags:{},last:{},round:0};
  try{const data=JSON.parse(localStorage.getItem(storageKey)||'null');if(data&&typeof data.bags==='object'&&data.bags&&typeof data.last==='object'&&data.last)saved={bags:data.bags,last:data.last,round:Number.isSafeInteger(data.round)&&data.round>=0?data.round:0};}catch(_){/* comedy works without storage */}
  function draw(name){
    const items=content[name];let bag=saved.bags[name];
    if(!Array.isArray(bag)||!bag.length||new Set(bag).size!==bag.length||bag.some(i=>!Number.isInteger(i)||i<0||i>=items.length)){
      bag=items.map((_,i)=>i);
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
      if(bag.length>1&&bag.at(-1)===saved.last[name])[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];
    }
    const index=bag.pop();saved.bags[name]=bag;saved.last[name]=index;
    try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch(_){/* retain the in-memory shuffle bags */}
    return items[index];
  }
  let timer=null,step=0,report=null,interventions=0;
  const cells=Array.from({length:16},()=>{const cell=document.createElement('span');cell.textContent='🪼';board.append(cell);return cell;});
  function announce(message){
    status.textContent=message;const item=document.createElement('li');item.textContent=message;log.append(item);
    while(log.children.length>32)log.firstElementChild.remove();
  }
  function paint(phase,chaos=false){
    const pattern=(report.theme.pattern+(chaos?interventions:0))%8;
    const focus=Math.floor(Math.random()*16);
    cells.forEach((cell,i)=>{
      const row=Math.floor(i/4),col=i%4;
      const shapes=[row===phase%4,col===phase%4,(row+col)%2===0,row===col||row+col===3,row===0||row===3||col===0||col===3,i===focus,i<phase*3,i%3===phase%3];
      cell.textContent=shapes[pattern]?report.theme.icon:(phase===5?'💤':'🪼');
    });
  }
  function finish(){clearTimeout(timer);timer=null;panel.classList.remove('is-thunking');start.disabled=false;stop.disabled=true;worse.disabled=true;start.textContent=draw('buttons');}
  function cancel(message='Thunk cancelled. Honestly, this was the strongest tactical decision so far.'){
    if(timer===null)return;finish();announce(message);
  }
  function advance(){
    progress.value=report.milestones[step];announce(report.lines[step]);paint(step);step++;
    if(step===report.lines.length){
      finish();verdict.hidden=false;
      verdict.textContent=report.theme.verdict+' '+report.footnote+(interventions?' Unsolicited interventions: '+interventions+'.':'');
      return;
    }
    timer=setTimeout(advance,1800);
  }
  start.addEventListener('click',()=>{
    if(timer!==null)return;
    step=0;interventions=0;saved.round++;const theme=draw('themes');
    report={theme,lines:[draw('openings'),draw('methods'),theme.setup,draw('disasters'),theme.payoff,draw('closings')],footnote:draw('footnotes'),milestones:[2+Math.floor(Math.random()*9),25+Math.floor(Math.random()*20),90+Math.floor(Math.random()*9),3+Math.floor(Math.random()*15),99,100]};
    caption.textContent=draw('departments')+' · ATTEMPT '+saved.round;
    log.replaceChildren();verdict.hidden=true;start.disabled=true;stop.disabled=false;worse.disabled=false;panel.classList.add('is-thunking');advance();
  });
  worse.addEventListener('click',()=>{
    if(timer===null)return;interventions++;announce(draw('sabotage'));paint(step,true);
    progress.value=Math.max(0,progress.value-7-Math.floor(Math.random()*20));
    clearTimeout(timer);timer=setTimeout(advance,1800);
  });
  stop.addEventListener('click',()=>cancel());
  const pauseWhenHidden=()=>{if(!panel.open||panel.closest('.hidden,[hidden]')||document.hidden)cancel('Thunks shelved. The jelly has gone on a very small lunch break.');};
  const observer=new MutationObserver(pauseWhenHidden);
  for(let ancestor=panel;ancestor;ancestor=ancestor.parentElement)observer.observe(ancestor,{attributes:true,attributeFilter:['class','hidden','open']});
  document.addEventListener('visibilitychange',pauseWhenHidden);
})();
