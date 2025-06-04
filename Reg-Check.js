<script>
(function() {
  // Base URL for Stellantis &You used-vehicles lookup
  const CHECKER_BASE =
    'https://www.stellantisandyou.co.uk/used-vehicles/results?maxPayment=1900&registration=';

  // Prevent re-installing the hotkey if this script runs more than once
  if (window._stellantisHotkey) return;
  window._stellantisHotkey = true;

  // Listen for Alt + R anywhere on the page
  document.addEventListener('keydown', function(e) {
    // Only proceed if Alt is held and the key is “R” (case-insensitive)
    if (!e.altKey || e.key.toLowerCase() !== 'r') return;

    // Grab the user’s current text selection, trim whitespace
    let sel = window.getSelection().toString().trim();
    if (!sel) {
      alert('Highlight a registration first.');
      return;
    }

    // Remove any spaces from the highlighted text and URL-encode it
    let reg = sel.replace(/\s+/g, '');
    let url = CHECKER_BASE + encodeURIComponent(reg);

    // Open the Stellantis &You search in a new tab/window
    window.open(url, '_blank');
  });

  // Notify the user that the hotkey has been installed
  alert(
    'REG hotkey installed.\n\n' +
    'Highlight a REG and press Alt + R.'
  );
})();
</script>
