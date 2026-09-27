(() => {
  const button = document.getElementById('analyticsOptOut');
  const status = document.getElementById('analyticsStatus');
  function render() {
    try {
      const disabled = localStorage.getItem('umami.disabled') === '1';
      button.textContent = disabled ? 'Allow anonymous analytics in this browser' : 'Disable analytics in this browser';
      status.textContent = disabled ? 'Analytics is disabled. Reload any open planner tabs to apply.' : 'Analytics is allowed when configured, subject to your browser privacy settings.';
    } catch (_) { status.textContent = 'Browser storage is unavailable. You can use Do Not Track or Global Privacy Control instead.'; }
  }
  button.addEventListener('click', () => {
    try { localStorage.setItem('umami.disabled', localStorage.getItem('umami.disabled') === '1' ? '0' : '1'); } catch (_) {}
    render();
  });
  render();
})();
