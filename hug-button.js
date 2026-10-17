(() => {
  'use strict';
  const button = document.getElementById('hugButton');
  const output = document.getElementById('hugCount');
  if (!button || !output) return;
  const key = 'idleon-planner:hugs';
  const cooldownKey = `${key}:next-allowed`;
  const cooldownMs = 1000;
  const parse = value => {
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : 0;
  };
  let count = 0;
  let nextAllowed = 0;
  let timer;
  const readCooldown = () => {
    try { nextAllowed = Math.max(nextAllowed, parse(localStorage.getItem(cooldownKey))); } catch (_) {}
  };
  try { count = parse(localStorage.getItem(key)); } catch (_) { /* Storage may be disabled. */ }
  const render = () => {
    clearTimeout(timer);
    const seconds = Math.max(0, Math.ceil((nextAllowed - Date.now()) / 1000));
    output.textContent = count.toLocaleString();
    button.setAttribute('aria-disabled', String(seconds > 0));
    button.title = seconds ? `Wait ${seconds}s before sending another hug` : 'Send a hug — saved in this browser';
    button.setAttribute('aria-label', `${seconds ? `Wait ${seconds} seconds before sending another hug.` : 'Send a hug.'} ${count.toLocaleString()} hugs sent in this browser.`);
    button.querySelector('.hug-label').textContent = seconds ? `Wait ${seconds}s` : 'Hug';
    if (seconds) timer = setTimeout(render, 250);
  };
  button.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  button.addEventListener('click', event => {
    if (!event.isTrusted) return;
    readCooldown();
    try { count = Math.max(count, parse(localStorage.getItem(key))); } catch (_) {}
    if (Date.now() < nextAllowed) { render(); return; }
    nextAllowed = Date.now() + cooldownMs;
    try { localStorage.setItem(cooldownKey, String(nextAllowed)); } catch (_) {}
    count = Math.min(Number.MAX_SAFE_INTEGER, count + 1);
    try { localStorage.setItem(key, String(count)); } catch (_) { /* Still works for this visit. */ }
    render();
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      count = parse(event.newValue);
      render();
    }
    if (event.key === cooldownKey || event.key === null) {
      readCooldown();
      render();
    }
  });
  readCooldown();
  render();
})();
