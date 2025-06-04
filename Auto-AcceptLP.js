(function() {
  const BUTTON_SELECTOR =
    '#agent-workspace-app > div.main-layout.le-theme-background > div:nth-child(5) > div > div.manual-queue-area > div > button';
  const BADGE_ID = '_lpBadge';
  const BADGE_COLOR = '#040134';
  const BADGE_BORDER_COLOR = '#000';

  let autoAcceptObserver = null;
  let hotkeyRegistered = false;

  function getRandomDelay() {
    return 200 + Math.random() * 1300;
  }

  function enableAutoAccept() {
    if (autoAcceptObserver) return;

    autoAcceptObserver = new MutationObserver(() => {
      const button = document.querySelector(BUTTON_SELECTOR);
      if (button && !button.disabled && !button.dataset.lpClicked) {
        setTimeout(() => {
          button.click();
          button.dataset.lpClicked = 'true';
        }, getRandomDelay());
      }
    });

    autoAcceptObserver.observe(document.body, { childList: true, subtree: true });

    let badge = document.getElementById(BADGE_ID);
    if (!badge) {
      badge = document.createElement('div');
      badge.id = BADGE_ID;
      badge.onclick = toggleAutoAccept;
      document.body.appendChild(badge);
    }
    Object.assign(badge.style, {
      position:     'fixed',
      right:        '12px',
      bottom:       '12px',
      width:        '14px',
      height:       '14px',
      background:   BADGE_COLOR,
      border:       `2px solid ${BADGE_BORDER_COLOR}`,
      borderRadius: '50%',
      boxShadow:    '0 0 4px rgba(0, 0, 0, 0.4)',
      zIndex:       99999,
      cursor:       'pointer'
    });
    badge.title = 'Auto-accept ON – click to disable';
    console.info('Auto-accept ON');
  }

  function disableAutoAccept() {
    if (autoAcceptObserver) {
      autoAcceptObserver.disconnect();
      autoAcceptObserver = null;
    }
    const badge = document.getElementById(BADGE_ID);
    if (badge) badge.remove();
    console.info('Auto-accept OFF');
  }

  function toggleAutoAccept() {
    if (autoAcceptObserver) {
      disableAutoAccept();
    } else {
      enableAutoAccept();
    }
  }

  function registerHotkey() {
    if (hotkeyRegistered) return;
    window.addEventListener('keydown', e => {
      if (e.altKey && e.code === 'KeyX') {
        e.preventDefault();
        e.stopPropagation();
        toggleAutoAccept();
      }
    });
    hotkeyRegistered = true;
  }

  toggleAutoAccept();
  registerHotkey();
})();
