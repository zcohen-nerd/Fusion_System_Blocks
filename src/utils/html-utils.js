/**
 * HTML UTILITY FUNCTIONS
 *
 * Shared helpers for safe HTML string handling used across the
 * System Blocks editor modules.
 *
 * @module HtmlUtils
 */

/**
 * Escape HTML special characters to prevent XSS when inserting
 * user-provided text into the DOM via innerHTML.
 *
 * @param {*} text - Value to escape (coerced to string).
 * @returns {string} The escaped string.
 */
function _escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================================
// CUSTOM DIALOG UTILITIES
// =========================================================================
// Replace native prompt() / confirm() / alert() with styled in-app dialogs
// that blend with the Fusion dark theme and don't block the JS thread.
// =========================================================================

/**
 * Show a custom prompt dialog styled to match the Fusion theme.
 * Returns a Promise that resolves to the entered string, or null if cancelled.
 *
 * @param {string} message  - Prompt text shown to the user.
 * @param {string} [defaultValue=''] - Pre-filled input value.
 * @returns {Promise<string|null>}
 */
function _fusionPrompt(message, defaultValue) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'fusion-dialog-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:var(--z-modal,600);display:flex;' +
      'align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--fusion-panel-bg,#1e1e2e);border:1px solid var(--fusion-panel-border,#555);' +
      'border-radius:4px;padding:18px;width:340px;color:var(--fusion-text-primary,#ccc);' +
      'font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-family:var(--fusion-font-family,Arial,sans-serif);';

    const msg = document.createElement('div');
    msg.style.cssText = 'margin-bottom:12px;white-space:pre-wrap;line-height:1.5;';
    msg.textContent = message;
    card.appendChild(msg);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue || '';
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:6px 8px;' +
      'background:var(--fusion-input-bg,#2a2a3e);border:1px solid var(--fusion-input-border,#555);' +
      'border-radius:4px;color:var(--fusion-text-primary,#eee);font-size:13px;';
    card.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:14px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:6px 14px;border:1px solid var(--fusion-border-primary,#555);' +
      'border-radius:4px;background:var(--fusion-bg-tertiary,#333);color:var(--fusion-text-primary,#ccc);cursor:pointer;font-size:13px;';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = 'padding:6px 14px;border:none;border-radius:4px;' +
      'background:var(--fusion-accent-blue,#0078d4);color:#fff;cursor:pointer;font-weight:600;font-size:13px;';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    input.focus();
    input.select();

    const cleanup = (value) => {
      overlay.remove();
      resolve(value);
    };

    okBtn.addEventListener('click', () => cleanup(input.value));
    cancelBtn.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); cleanup(input.value); }
      if (e.key === 'Escape') { e.preventDefault(); cleanup(null); }
    });
  });
}

/**
 * Show a custom confirmation dialog styled to match the Fusion theme.
 * Returns a Promise that resolves to true (OK) or false (Cancel).
 *
 * @param {string} message - Confirmation text shown to the user.
 * @returns {Promise<boolean>}
 */
function _fusionConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'fusion-dialog-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:var(--z-modal,600);display:flex;' +
      'align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--fusion-panel-bg,#1e1e2e);border:1px solid var(--fusion-panel-border,#555);' +
      'border-radius:4px;padding:18px;width:340px;color:var(--fusion-text-primary,#ccc);' +
      'font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-family:var(--fusion-font-family,Arial,sans-serif);';

    const msg = document.createElement('div');
    msg.style.cssText = 'margin-bottom:14px;white-space:pre-wrap;line-height:1.5;';
    msg.textContent = message;
    card.appendChild(msg);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:6px 14px;border:1px solid var(--fusion-border-primary,#555);' +
      'border-radius:4px;background:var(--fusion-bg-tertiary,#333);color:var(--fusion-text-primary,#ccc);cursor:pointer;font-size:13px;';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = 'padding:6px 14px;border:none;border-radius:4px;' +
      'background:var(--fusion-accent-blue,#0078d4);color:#fff;cursor:pointer;font-weight:600;font-size:13px;';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    okBtn.focus();

    const cleanup = (value) => {
      overlay.remove();
      resolve(value);
    };

    okBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter') { e.preventDefault(); document.removeEventListener('keydown', handler); cleanup(true); }
      if (e.key === 'Escape') { e.preventDefault(); document.removeEventListener('keydown', handler); cleanup(false); }
    });
  });
}

/**
 * Show a custom alert dialog styled to match the Fusion theme.
 * Returns a Promise that resolves when the user dismisses it.
 *
 * @param {string} message - Alert text shown to the user.
 * @returns {Promise<void>}
 */
function _fusionAlert(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'fusion-dialog-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:var(--z-modal,600);display:flex;' +
      'align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--fusion-panel-bg,#1e1e2e);border:1px solid var(--fusion-panel-border,#555);' +
      'border-radius:4px;padding:18px;width:340px;color:var(--fusion-text-primary,#ccc);' +
      'font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-family:var(--fusion-font-family,Arial,sans-serif);';

    const msg = document.createElement('div');
    msg.style.cssText = 'margin-bottom:14px;white-space:pre-wrap;line-height:1.5;';
    msg.textContent = message;
    card.appendChild(msg);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = 'padding:6px 14px;border:none;border-radius:4px;' +
      'background:var(--fusion-accent-blue,#0078d4);color:#fff;cursor:pointer;font-weight:600;font-size:13px;';

    btnRow.appendChild(okBtn);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    okBtn.focus();

    const cleanup = () => {
      overlay.remove();
      resolve();
    };

    okBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        document.removeEventListener('keydown', handler);
        cleanup();
      }
    });
  });
}
