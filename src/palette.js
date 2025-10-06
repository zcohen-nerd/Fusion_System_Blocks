// Modular palette bootstrap shim
(function () {
  const logger = window.getSystemBlocksLogger
    ? window.getSystemBlocksLogger()
    : {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      };
  const READY_EVENT = 'system-blocks:ready';

  function bindLegacyGlobals() {
    if (!window.diagramEditor) {
      return;
    }

    window.editor = window.diagramEditor;
    window.systemBlocksEditor = window.diagramEditor;

    if (window.toolbarManager && typeof window.toolbarManager.updateButtonStates === 'function') {
      window.toolbarManager.updateButtonStates();
    }
  }

  function handleReadyEvent() {
    bindLegacyGlobals();
    document.body.classList.add('system-blocks-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLegacyGlobals, { once: true });
  } else {
    bindLegacyGlobals();
  }

  window.addEventListener(READY_EVENT, handleReadyEvent, { once: true });

  let retries = 0;
  const maxRetries = 40;
  const interval = setInterval(() => {
    if (window.diagramEditor) {
      bindLegacyGlobals();
      clearInterval(interval);
    } else if (++retries >= maxRetries) {
      clearInterval(interval);
      logger.warn('System Blocks: diagram editor not detected during bootstrap.');
    }
  }, 100);
})();

