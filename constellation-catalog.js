(function(){'use strict';
  window.CONSTELLATION_CATALOG=[];
  fetch('beanstalk-engine.js?v=5').then(response=>response.text()).then(source=>{
    const pattern=/new he\((\d+),\{name:"([^"]+)",area:"([^"]*)",[\s\S]{0,360}?starChartPoints:(\d+),requirement:"([^"]*)"/g;
    window.CONSTELLATION_CATALOG=[...source.matchAll(pattern)].map(match=>({index:Number(match[1]),name:match[2],area:match[3],points:Number(match[4]),requirement:match[5].replace(/ @ Progress:\{\/\}/g,'')})).filter(row=>row.name!=='Filler');
    window.dispatchEvent(new CustomEvent('constellation-catalog-ready'));
  }).catch(()=>{});
})();
