/* Anonymous, explicitly selected analytics. No save data or DOM text is read. */
(() => {
  'use strict';
  const config = window.PLANNER_ANALYTICS_CONFIG || {};
  const noop = () => {};
  window.PlannerAnalytics = { page: noop, event: noop };
  if (typeof location === 'undefined' || typeof document === 'undefined') return;
  const host = location.hostname;
  if (!config.websiteId || !config.domains?.includes(host) ||
      ['localhost', '127.0.0.1', '[::1]'].includes(host) ||
      navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  try { if (localStorage.getItem('umami.disabled') === '1') return; } catch (_) {}
  let scriptUrl;
  try { scriptUrl = new URL(config.scriptUrl); } catch (_) { return; }
  if (scriptUrl.protocol !== 'https:') return;
  let current = 'home', ready = false, failed = false, queue = [], errors = 0;
  let lastTick = performance.now(), lastInput = lastTick, activeMs = 0, visible = !document.hidden;
  const allowedEvents = new Set(['save_import_succeeded', 'save_import_failed',
    'optimizer_started', 'optimizer_completed', 'optimizer_failed', 'optimizer_cancelled',
    'application_error', 'active_time']);
  const safeKey = value => typeof value === 'string' && /^[a-zA-Z0-9_/-]{1,80}$/.test(value);
  let referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch (_) {}
  function send(payload) {
    if (failed) return;
    if (!ready) { if (queue.length < 100) queue.push(payload); return; }
    try { Promise.resolve(window.umami.track(payload)).catch(noop); } catch (_) {}
  }
  function payload(page) {
    return { website: config.websiteId, hostname: host, url: '/planner/' + page,
      title: 'Planner / ' + page, referrer, language: navigator.language,
      screen: `${screen.width}x${screen.height}` };
  }
  function event(name, data = {}) {
    if (!allowedEvents.has(name)) return;
    const clean = { page: current };
    if (safeKey(data.tool)) clean.tool = data.tool;
    if (name === 'active_time' && Number.isFinite(data.seconds)) clean.seconds = Math.max(0, Math.min(3600, data.seconds));
    send({ ...payload(current), name, data: clean });
  }
  function tick() {
    const now = performance.now();
    // Count only visible time within 60 seconds of user input; cap suspended timers.
    if (visible) activeMs += Math.max(0, Math.min(now, lastInput + 60000) - Math.max(lastTick, now - 30000));
    lastTick = now;
  }
  function flush() {
    const seconds = Math.floor(activeMs / 1000);
    if (seconds > 0) { event('active_time', { seconds }); activeMs -= seconds * 1000; }
  }
  function page(name) {
    if (!safeKey(name) || name === current) return;
    tick(); flush(); current = name; activeMs = 0;
    send(payload(current));
  }
  window.PlannerAnalytics = { page, event };
  for (const type of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
    document.addEventListener(type, () => { tick(); lastInput = performance.now(); }, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    tick(); flush(); visible = !document.hidden;
    if (!document.hidden) lastInput = performance.now();
  });
  window.addEventListener('pagehide', () => { tick(); flush(); });
  setInterval(() => { tick(); flush(); }, 30000);
  function reportError() { if (errors++ < 5) event('application_error'); }
  window.addEventListener('error', reportError);
  window.addEventListener('unhandledrejection', reportError);
  send(payload(current));
  const script = document.createElement('script');
  script.src = scriptUrl.href; script.async = true;
  script.setAttribute('data-website-id', config.websiteId);
  script.setAttribute('data-auto-track', 'false');
  script.setAttribute('data-exclude-search', 'true');
  script.setAttribute('data-exclude-hash', 'true');
  script.onload = () => { ready = true; const pending = queue; queue = []; pending.forEach(send); };
  script.onerror = () => { failed = true; queue = []; };
  document.head.appendChild(script);
})();
