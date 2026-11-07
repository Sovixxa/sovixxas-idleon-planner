(() => {
  'use strict';
  const button = document.getElementById('hugButton');
  const output = document.getElementById('hugCount');
  if (!button || !output) return;
  const key = 'idleon-planner:hugs';
  const parse = value => {
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : 0;
  };
  let count = 0;
  try { count = parse(localStorage.getItem(key)); } catch (_) { /* Storage may be disabled. */ }
  const render = () => {
    output.textContent = count.toLocaleString();
    button.title = 'Send a hug — saved in this browser';
    button.setAttribute('aria-label', `Send a hug. ${count.toLocaleString()} hugs sent in this browser.`);
    button.querySelector('.hug-label').textContent = 'Hug';
  };
  button.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  button.addEventListener('click', event => {
    if (!event.isTrusted) return;
    try { count = Math.max(count, parse(localStorage.getItem(key))); } catch (_) {}
    count = Math.min(Number.MAX_SAFE_INTEGER, count + 1);
    try { localStorage.setItem(key, String(count)); } catch (_) { /* Still works for this visit. */ }
    render();
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      count = parse(event.newValue);
      render();
    }
  });
  render();
})();
