(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(host,kind,plan){
 if(!plan){host.innerHTML='<section class="carry-empty"><h3>Import your account to build a To-do list</h3><p>A full export is needed for saved upgrade levels and character setups.</p></section>';return;}
 let character='all',query='',section='all';const done=new Set();
 function paint(){
  const tasks=plan.tasks.filter(t=>(character==='all'||!t.characters.length||t.characters.some(id=>String(id)===character))&&(section==='all'||t.section===section)&&JSON.stringify(t).toLowerCase().includes(query.toLowerCase()));
  host.innerHTML=`<p class="loadout-note">Next steps from your imported account. Suggested order groups setup checks and available upgrades; it does not rank exact stat gain per cost. Coverage: stamps, Vault, Arcade, bubbles, vials, banked golden food and equipped cards. Re-import after making changes.</p><div class="loadout-controls"><label>Character<select data-todo-character><option value="all">All characters</option>${plan.characters.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===character?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>Type<select data-todo-section><option value="all">All tasks</option>${[...new Set(plan.tasks.map(t=>t.section))].map(s=>`<option ${s===section?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label>Find an upgrade<input data-todo-search type="search" value="${esc(query)}" placeholder="Stamp, Vault, card…"></label></div><p>${tasks.length} matching tasks · ${done.size} checked this visit · ${plan.covered.length} capped upgrades excluded</p>${plan.unknown.length?`<p class="loadout-note">Unavailable save data: ${esc(plan.unknown.join(', '))}. These sections are not treated as missing upgrades.</p>`:''}<div class="stat-todo-list">${tasks.map(t=>`<details class="stat-todo-task" ${done.has(t.id)?'data-done="true"':''}><summary><strong>${esc(t.title)}</strong><span>${esc(t.section)} · ${esc(t.scope)}</span><span>${esc(t.current)} → ${esc(t.target)}</span></summary><div class="stat-todo-body"><p>${esc(t.reason)}</p>${t.characters.length?`<p><strong>Characters:</strong> ${esc(plan.characters.filter(c=>t.characters.includes(c.id)).map(c=>c.name).join(', '))}</p>`:''}<p><strong>Where:</strong> ${esc(t.location)}</p><ol>${t.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="loadout-note">${esc(t.gate)}</p><button type="button" class="skill-tab" data-todo-page="${esc(t.page)}">Open upgrade page</button><label class="stat-todo-check"><input type="checkbox" data-todo-done="${esc(t.id)}" ${done.has(t.id)?'checked':''}> Handled this visit</label></div></details>`).join('')||'<p>No tasks match these filters. This does not mean every possible stat upgrade is complete.</p>'}</div><p class="loadout-note">Checkboxes are temporary reminders for this visit; they do not change your save or the game.</p>`;
  host.querySelector('[data-todo-character]').onchange=e=>{character=e.target.value;paint();};
  host.querySelector('[data-todo-section]').onchange=e=>{section=e.target.value;paint();};
  host.querySelector('[data-todo-search]').onchange=e=>{query=e.target.value;paint();};
  host.querySelectorAll('[data-todo-page]').forEach(b=>b.onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:b.dataset.todoPage})));
  host.querySelectorAll('[data-todo-done]').forEach(b=>b.onchange=()=>{b.checked?done.add(b.dataset.todoDone):done.delete(b.dataset.todoDone);paint();});
 }
 paint();
}
root.StatTodo={mount};
})(typeof window!=='undefined'?window:globalThis);
