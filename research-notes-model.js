(function(root){'use strict';
// Quest115 (Half Finished Research Papers) adds 7200 seconds to Research[7][3].
// ResearchStuffs consumes that bank at the active Insight rate, without the EXP display multiplier.
const NOTE_HOURS=2;
function timing(observation,rate){const remaining=Math.max(0,Number(observation.insightExpREQ)-Math.max(0,Number(observation.insightExp)||0));if(!observation.found||!observation.unlocked||!observation.canLevelUp)return {remaining,hours:null,notes:null,status:!observation.found?'Not found':!observation.unlocked?'Locked':'Unlock Optical Monocle'};if(remaining===0)return {remaining,hours:0,notes:0,status:'Ready to level'};if(!(rate>0))return {remaining,hours:null,notes:null,status:'No Insight in this layout'};const hours=remaining/rate,notes=Math.max(1,Math.ceil(hours/NOTE_HOURS-1e-12));return {remaining,hours,notes,status:'Progressing'};}
function applyLenses(raw,assignments){const next=structuredClone(raw);next[5]=[...(next[5]||[])];assignments.forEach((a,i)=>{next[5][4*i]=Number(next[5][4*i])||0;next[5][4*i+1]=Number(next[5][4*i+1])||0;next[5][4*i+2]=a.obs;next[5][4*i+3]=a.type;});return next;}
function canLevel(state,o){return !!state.canLevelUpObservations&&o.found&&o.unlocked;}
function rows(state,assignments,lensModel){const per=lensModel.lensRates(state,assignments).per;return state.observations.filter(o=>o.unlocked||o.found).map(o=>{const r=per.find(x=>x.id===o.index),rate=r?.insight||0;return {index:o.index,name:o.name,found:o.found,unlocked:o.unlocked,canLevelUp:canLevel(state,o),level:o.insightLevel,progress:o.insightExp,required:o.insightExpREQ,counts:r?.count||[0,0,0],rate,...timing({...o,canLevelUp:canLevel(state,o)},rate)};});}
const api={NOTE_HOURS,timing,canLevel,applyLenses,rows};if(typeof module==='object')module.exports=api;root.ResearchNotesModel=api;
})(typeof window==='object'?window:globalThis);
