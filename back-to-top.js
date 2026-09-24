(function(){
  'use strict';
  const button=document.createElement('button');
  button.id='backToTop';button.className='back-to-top';button.type='button';
  button.setAttribute('aria-label','Back to top');button.title='Back to top';
  button.innerHTML='<span aria-hidden="true">↑</span><span>Top</span>';
  button.hidden=true;document.body.append(button);
  const update=()=>{button.hidden=window.scrollY<240;};
  window.addEventListener('scroll',update,{passive:true});
  button.addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  update();
})();
