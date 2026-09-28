(function(root){
'use strict';
let stack=[],latest=new Map();
const numeric=v=>typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean';
root.ConnectedTrace={
 reset(){stack=[];latest=new Map();},
 enter(name){const frame={name,rows:[],byId:new Map(),result:null};stack.push(frame);return frame;},
 value(id,name,value,formula,deps=[]){const frame=stack[stack.length-1];if(frame&&numeric(value)){
  if(formula==='Input value'&&frame.byId.has(id)&&frame.rows[frame.byId.get(id)].value===Number(value))return value;
  const parents=[...new Set(deps.map(k=>frame.byId.get(k)).filter(x=>x!==undefined))];
  const row={name,value:Number(value),formula,parents,id};frame.byId.set(id,frame.rows.length);frame.rows.push(row);
 }return value;},
 leave(frame){if(stack.pop()!==frame)throw Error('Calculation trace stack mismatch');latest.set(frame.name,frame);},
 get(name,field='result'){
  const frame=latest.get(name);if(!frame)return null;const end=frame.byId.get(field);
  if(end===undefined)return null;
  const keep=new Set();function visit(i){if(keep.has(i))return;keep.add(i);for(const p of frame.rows[i].parents)visit(p);}visit(end);for(let i=0;i<frame.rows.length;i++)if(frame.rows[i].id.startsWith("?"))visit(i);
  const indexes=[...keep].sort((a,b)=>a-b),mapping=new Map(indexes.map((old,i)=>[old,i]));
  return {name,value:frame.rows[end].value,rows:indexes.map(i=>({...frame.rows[i],parents:frame.rows[i].parents.map(p=>mapping.get(p)).filter(p=>p!==undefined)})),formula:frame.rows[end].formula};
 }
};
})(typeof self!=='undefined'?self:globalThis);
