// Theme management
function setTheme(theme) {
  // Set the theme on the document element
  document.documentElement.setAttribute('data-theme', theme);
  
  // Save the theme preference
  localStorage.setItem('theme', theme);
  
  // Dispatch an event in case other scripts need to react to theme changes
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}

// Initialize theme from localStorage or system preference
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme(prefersDark ? 'dark' : 'light');
  }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('theme')) {
    setTheme(e.matches ? 'dark' : 'light');
  }
});

// Initialize theme when the script loads
initTheme();

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setTheme, initTheme };
}
