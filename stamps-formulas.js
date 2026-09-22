(function(){'use strict';
  window.STAMP_FORMULAS={};
  fetch('beanstalk-engine.js?v=5').then(response=>response.text()).then(source=>{
    const pattern=/new i\("Stamp([ABC]\d+)",\{item:\{[\s\S]{0,900}?stampData:\{([^}]*)\}/g;
    for(const match of source.matchAll(pattern)){
      const read=name=>{const found=match[2].match(new RegExp(`${name}:([^,}]+)`));return found?Number(found[1]):0;};
      const fn=(match[2].match(/function:"([^"]+)"/)||[])[1];
      if(fn)window.STAMP_FORMULAS[match[1]]={fn,x1:read('x1'),x2:read('x2'),interval:read('upgradeInterval')||1};
    }
  }).catch(()=>{});
})();
