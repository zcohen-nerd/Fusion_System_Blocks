// Palette Tabs Controller
(function () {
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));

  const tabs = [
    { id: 'home' },
    { id: 'diagram' },
    { id: 'linking' },
    { id: 'validation' },
    { id: 'reports' }
  ];

  function setActiveTab(tabId) {
    tabs.forEach(({ id }) => {
      const tabEl = q(`#tab-${id}`);
      const panel = q(`#panel-${id}`);
      if (!tabEl || !panel) return;
      const active = id === tabId;
      tabEl.setAttribute('aria-selected', active ? 'true' : 'false');
      panel.classList.toggle('show', active && id !== 'diagram');
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    const status = q('#tab-status');
    if (status) {
      status.textContent = `${tabId.charAt(0).toUpperCase() + tabId.slice(1)} tab selected`;
    }
  }

  function onClickTab(e) {
    const id = (e.target.id || '').replace('tab-', '');
    if (!id) return;
    setActiveTab(id);
  }

  function updateConnectionStatus() {
    const el = q('#status-conn');
    if (!el || !window.pythonInterface) return;
    const { connected, queuedMessages, pendingRequests } = window.pythonInterface.getConnectionStatus();
    el.textContent = `Bridge: ${connected ? 'connected' : 'offline'} (q:${queuedMessages}, p:${pendingRequests})`;
  }

  function updateLastSaved() {
    const el = q('#status-last-saved');
    if (!el) return;
    el.textContent = `Last saved: ${new Date().toLocaleString()}`;
  }

  function updateHealth(text) {
    const el = q('#status-health');
    if (!el) return;
    el.textContent = `Health: ${text}`;
    const setVariant = (variant) => {
      el.classList.remove('pill-error', 'pill-warning', 'pill-success', 'pill-info');
      el.classList.add(`pill-${variant}`);
    };
    if (/error|issue|problem|fail/i.test(text)) {
      setVariant('error');
    } else if (/warn|caution/i.test(text)) {
      setVariant('warning');
    } else if (/ok|good|healthy|linked|success/i.test(text)) {
      setVariant('success');
    } else {
      setVariant('info');
    }
  }

  function wireActions() {
    qa('.sb-tabbar .sb-tab').forEach((b) => b.addEventListener('click', onClickTab));

    const bNew = q('#action-new');
    if (bNew) bNew.addEventListener('click', () => {
      if (window.diagramEditor && typeof window.diagramEditor.createEmptyDiagram === 'function') {
        const empty = window.diagramEditor.createEmptyDiagram();
        window.diagramEditor.importDiagram(JSON.stringify(empty));
        updateHealth('New diagram');
      }
      setActiveTab('diagram');
    });

    const bLoad = q('#action-load');
    if (bLoad) bLoad.addEventListener('click', () => {
      if (window.pythonInterface) {
        window.pythonInterface.loadDiagram().then(() => setActiveTab('diagram'));
      }
    });

    const bSave = q('#action-save');
    if (bSave) bSave.addEventListener('click', () => {
      if (window.pythonInterface) {
        window.pythonInterface.saveDiagram().then(updateLastSaved);
      }
    });

    const autosaveToggle = q('#toggle-autosave');
    if (autosaveToggle) {
      let timer = null;
      autosaveToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          timer = setInterval(() => {
            if (window.pythonInterface) {
              window.pythonInterface.saveDiagram().then(updateLastSaved).catch(() => {});
            }
          }, 5000);
        } else if (timer) {
          clearInterval(timer);
          timer = null;
        }
      });
    }

    const bLinkSelected = q('#action-link-selected');
    if (bLinkSelected) bLinkSelected.addEventListener('click', () => {
      try {
        if (!window.diagramEditor) return;
        const blockId = window.diagramEditor.selectedBlock;
        if (!blockId) {
          if (window.pythonInterface) window.pythonInterface.showNotification('No block selected', 'warning');
          return;
        }
        const block = (window.diagramEditor.diagram.blocks || []).find(b => b.id === blockId) || { name: 'Block' };
        const data = { blockId, blockName: block.name };
        q('#linking-status').textContent = 'Selecting…';
        if (window.pythonInterface) {
          window.pythonInterface.sendMessage('start_cad_selection', data, true)
            .then(() => {
              q('#linking-status').textContent = 'Linked or cancelled';
              const aria = q('#linking-aria');
              if (aria) aria.textContent = 'CAD selection finished.';
            })
            .catch(() => { q('#linking-status').textContent = 'Error'; });
        }
      } catch (_) {}
    });

    const bRunChecks = q('#action-run-checks');
    if (bRunChecks) bRunChecks.addEventListener('click', () => {
      if (window.pythonInterface) {
        window.pythonInterface.checkRules().then((resp) => {
          // Optional client-side filtering
          const results = resp && resp.results ? resp.results : [];
          const showErrors = q('#filter-errors').checked;
          const showWarnings = q('#filter-warnings').checked;
          const cat = q('#filter-category').value || '';
          const filtered = results.filter(r => {
            const sevOk = (r.severity === 'error' && showErrors) || (r.severity === 'warning' && showWarnings) || (!r.severity);
            const catOk = !cat || (r.category || '').toLowerCase() === cat.toLowerCase();
            return sevOk && catOk;
          });
          renderValidationResults(filtered);
          updateHealth(filtered.some(r => r.severity === 'error') ? 'Issues detected' : 'OK');
        }).catch(() => {
          updateHealth('Rule check failed');
        });
      }
    });

    const bExport = q('#action-export');
    if (bExport) bExport.addEventListener('click', () => {
      if (window.pythonInterface) {
        window.pythonInterface.exportReports().then((resp) => {
          q('#export-status').textContent = 'Exported';
          renderExportResults(resp);
        }).catch(() => {
          q('#export-status').textContent = 'Failed';
        });
      }
    });
  }

  function renderValidationResults(results) {
    const list = q('#validation-results');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    results.forEach((r) => {
      const li = document.createElement('li');
      const text = `${(r.severity || 'info').toUpperCase()} - ${(r.category || 'general')}: ${r.message || r.description || 'Issue'}`;
      li.textContent = text;
      list.appendChild(li);
    });
    if (results.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No issues found.';
      list.appendChild(li);
    }
  }

  function renderExportResults(resp) {
    const filesList = q('#export-files');
    const pathEl = q('#export-path');
    if (!filesList || !pathEl) return;
    while (filesList.firstChild) filesList.removeChild(filesList.firstChild);
    // files may be a dict {format: filepath} or an array
    const rawFiles = (resp && resp.files) || {};
    const files = Array.isArray(rawFiles) ? rawFiles : Object.values(rawFiles);
    const path = (resp && resp.path) || '';
    pathEl.textContent = `Path: ${path || '(unknown)'}`;
    files.forEach((f) => {
      const li = document.createElement('li');
      li.textContent = f;
      filesList.appendChild(li);
    });
  }

  function init() {
    qa('.sb-panel').forEach(p => p.classList.remove('show'));
    setActiveTab('diagram');
    wireActions();
    updateConnectionStatus();
    setInterval(updateConnectionStatus, 5000);
    computeLayout();
    window.addEventListener('resize', computeLayout);
  }

  function computeLayout() {
    try {
      const header = q('header');
      const tabbar = q('.sb-tabbar');
      const status = q('.sb-status');
      const topOffset = ((header && header.offsetHeight) || 0) + ((tabbar && tabbar.offsetHeight) || 0) + 8;
      const bottomOffset = ((status && status.offsetHeight) || 0) + 8;
      qa('.sb-panel').forEach((p) => {
        if (p.id === 'panel-diagram') return; // diagram uses full canvas
        p.style.top = `${topOffset}px`;
        p.style.bottom = `${bottomOffset}px`;
        p.style.left = 'var(--fusion-spacing-sm)';
        p.style.right = 'var(--fusion-spacing-sm)';
      });
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
