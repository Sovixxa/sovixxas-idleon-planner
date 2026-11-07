'use strict';
const assert=require('node:assert/strict');
const {estimateLineup}=require('./shiny-planner');
const threshold=level=>Math.floor((1+(level-1)**1.6)*1.7**(level-1));
// Independent fixed-timestep integration, rather than the planner's event solver.
for(let trial=0;trial<12;trial++){
 const pets=Array.from({length:3},(_,i)=>{const level=20+(trial+i)%3;return {level,maxLevel:30,progress:threshold(level)*1.01,copies:1+(trial+i)%3,bonusId:i===0?16:1,perLevel:'+10%'};});
 const targets=pets.map(p=>p.level+2),speed=1e11,additive=2.8;
 const prediction=estimateLineup(pets,targets,speed,10200,true,additive);
 const levels=pets.map(p=>p.level),progress=pets.map(p=>p.progress),arrival=Array(3).fill(null);
 const initialOver=levels.reduce((n,l)=>n+Math.max(0,l-20),0),dt=.001;
 let elapsed=0;
 for(let step=0;arrival.some(v=>v===null)&&step<1000000;step++){
  const over=levels.reduce((n,l)=>n+Math.max(0,l-20),0);
  const multi=speed*(1+over/10)/(1+initialOver/10)*(1+(levels[0]-pets[0].level)*.1/additive);
  elapsed+=dt;
  for(let i=0;i<3;i++){
   if(levels[i]<30)progress[i]+=dt*multi*pets[i].copies/86400;
   while(levels[i]<30&&progress[i]>threshold(levels[i]+1))levels[i]++;
   if(arrival[i]===null&&levels[i]>=targets[i])arrival[i]=elapsed;
  }
 }
 for(let i=0;i<3;i++){
  assert.notEqual(arrival[i],null);
  assert(Math.abs(prediction[i].passive-arrival[i])<.03,`Trial ${trial}, pet ${i}: ${prediction[i].passive} vs ${arrival[i]}`);
  assert(Math.abs(prediction[i].active-arrival[i]/5.25)<.03);
 }
}
console.log('Independent integration: 36 target arrivals, mixed copies, simultaneous pets, shiny-speed gains and overlevels agree within 0.03 seconds.');
