// Apply the saved theme before first paint so dark-mode users don't see a light flash.
// Loaded as a plain blocking script (not inline) so the Content-Security-Policy can stay script-src 'self'.
try {
  if (localStorage.getItem('theme') === 'dark') document.documentElement.dataset.theme = 'dark'
} catch {
  // storage blocked (private mode): fall back to light
}
