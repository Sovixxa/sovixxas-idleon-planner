'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/analytics.js', 'utf8');
function setup(overrides = {}) {
  let now = 0, timer, script;
  const sent = [], listeners = {};
  const document = { hidden: false, referrer: 'https://example.org/private?secret=save',
    addEventListener: (type, fn) => { listeners[type] = fn; },
    createElement: () => ({ setAttribute() {} }), head: { appendChild: s => { script = s; } } };
  const window = { PLANNER_ANALYTICS_CONFIG: { websiteId: 'test-id', scriptUrl: 'https://cloud.umami.is/script.js', domains: ['planner.example'] },
    addEventListener: (type, fn) => { listeners[type] = fn; }, umami: { track: p => sent.push(p) } };
  const context = { window, document, location: { hostname: 'planner.example' }, navigator: { language: 'en' },
    localStorage: { getItem: () => null }, screen: { width: 1000, height: 700 },
    performance: { now: () => now }, setInterval: fn => { timer = fn; }, URL, ...overrides };
  vm.runInNewContext(source, context);
  return { window, document, sent, listeners, get script() { return script; }, tick: n => { now += n; timer?.(); } };
}
for (const overrides of [{ navigator: { doNotTrack: '1' } }, { navigator: { globalPrivacyControl: true } },
  { localStorage: { getItem: () => '1' } }, { location: { hostname: 'localhost' } },
  { window: { PLANNER_ANALYTICS_CONFIG: {} } }]) assert.equal(setup(overrides).script, undefined);
const h = setup();
h.window.PlannerAnalytics.page('alchemy');
assert.equal(h.sent.length, 0);
h.script.onload();
assert.deepEqual(h.sent.map(p => p.url), ['/planner/home', '/planner/alchemy']);
h.window.PlannerAnalytics.page('alchemy');
assert.equal(h.sent.length, 2);
h.window.PlannerAnalytics.event('save_import_succeeded', { save: 'SECRET', character: 'SECRET', tool: 'jelly' });
assert.equal(JSON.stringify(h.sent).includes('SECRET'), false);
assert.equal(h.sent[0].referrer, 'https://example.org');
h.tick(30000); h.tick(30000); h.tick(30000);
assert.equal(h.sent.filter(p => p.name === 'active_time').reduce((sum, p) => sum + p.data.seconds, 0), 60);
h.document.hidden = true; h.listeners.visibilitychange(); h.tick(30000);
assert.equal(h.sent.filter(p => p.name === 'active_time').length, 2);
h.document.hidden = false; h.listeners.visibilitychange(); h.tick(10000);
h.window.PlannerAnalytics.page('stamps');
assert.equal(h.sent.at(-2).data.page, 'alchemy');
assert.equal(h.sent.at(-2).data.seconds, 10);
for (let i = 0; i < 10; i++) h.listeners.error({ message: 'SECRET' });
assert.equal(h.sent.filter(p => p.name === 'application_error').length, 5);
assert.equal(JSON.stringify(h.sent).includes('SECRET'), false);
const blocked = setup(); blocked.script.onerror();
assert.doesNotThrow(() => blocked.window.PlannerAnalytics.page('stamps'));
assert.equal(blocked.sent.length, 0);
console.log('Analytics: privacy filters, opt-out, queue, navigation, idle/hidden timing and tracker failure passed.');
