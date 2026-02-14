// Palette Tabs Controller
(function () {
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));

  const tabs = [
    { id: 'home' },
    { id: 'diagram' },
    { id: 'linking' },
    { id: 'validation' },
    { id: 'requirements' },
    { id: 'history' },
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

    // Show/hide canvas when switching between diagram and overlay tabs
    const canvasContainer = q('#canvas-container');
    if (canvasContainer) {
      canvasContainer.style.display = tabId === 'diagram' ? '' : 'none';
    }

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

  /** Arrow-key navigation between tabs (WAI-ARIA tabs pattern). */
  function onKeydownTab(e) {
    const tabEls = qa('.sb-tabbar .sb-tab');
    const currentIdx = tabEls.indexOf(e.target);
    if (currentIdx < 0) return;
    let nextIdx = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIdx = (currentIdx + 1) % tabEls.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIdx = (currentIdx - 1 + tabEls.length) % tabEls.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = tabEls.length - 1;
    }
    if (nextIdx >= 0) {
      e.preventDefault();
      tabEls[nextIdx].focus();
      const id = (tabEls[nextIdx].id || '').replace('tab-', '');
      if (id) setActiveTab(id);
    }
  }

  function updateConnectionStatus() {
    const el = q('#status-conn');
    if (!el || !window.pythonInterface) return;
    const { connected, queuedMessages, pendingRequests } = window.pythonInterface.getConnectionStatus();
    el.textContent = `Bridge: ${connected ? 'connected' : 'offline'} (q:${queuedMessages}, p:${pendingRequests})`;
    // Toggle pill color to match bridge state
    el.classList.remove('pill-success', 'pill-error', 'pill-warning', 'pill-info');
    el.classList.add(connected ? 'pill-success' : 'pill-error');
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
    qa('.sb-tabbar .sb-tab').forEach((b) => {
      b.addEventListener('click', onClickTab);
      b.addEventListener('keydown', onKeydownTab);
    });

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
            // Only save when there are actual unsaved changes
            const editor = window.diagramEditor;
            if (editor && typeof editor.hasUnsavedChanges === 'function' && !editor.hasUnsavedChanges()) {
              return; // nothing to save
            }
            if (window.pythonInterface) {
              window.pythonInterface.saveDiagram({ silent: true }).then(updateLastSaved).catch(() => {});
            }
          }, 5000);
          if (window.pythonInterface) {
            window.pythonInterface.showNotification('Autosave enabled (every 5 s)', 'info');
          }
        } else {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          if (window.pythonInterface) {
            window.pythonInterface.showNotification('Autosave disabled', 'info');
          }
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
          window.pythonInterface.sendMessage(BridgeAction.START_CAD_SELECTION, data, true)
            .then(() => {
              q('#linking-status').textContent = 'Linked or cancelled';
              const aria = q('#linking-aria');
              if (aria) aria.textContent = 'CAD selection finished.';
              // Poll for pending link data (push may have been missed)
              if (window.toolbarManager && window.toolbarManager._pollForPendingCADLink) {
                window.toolbarManager._pollForPendingCADLink();
              }
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
      // Delegate to the export dialog in toolbar-manager if available
      if (window.toolbarManager && window.toolbarManager.showExportDialog) {
        window.toolbarManager.showExportDialog();
      } else if (window.pythonInterface) {
        window.pythonInterface.exportReports().then((resp) => {
          q('#export-status').textContent = 'Exported';
          renderExportResults(resp);
        }).catch(() => {
          q('#export-status').textContent = 'Failed';
        });
      }
    });

    // === Requirements tab (Issue #31) ===
    const bValidateReqs = q('#action-validate-reqs');
    if (bValidateReqs) bValidateReqs.addEventListener('click', () => {
      if (window.pythonInterface) {
        q('#reqs-status').textContent = 'Checking…';
        window.pythonInterface.validateRequirements().then((results) => {
          renderRequirementResults(results);
          const allPass = results.length > 0 && results.every(r => r.passed);
          q('#reqs-status').textContent = results.length === 0 ? 'No requirements' : (allPass ? 'All pass' : 'Issues found');
        }).catch(() => {
          q('#reqs-status').textContent = 'Error';
        });
      }
    });

    // === History / Snapshot tab (Issue #31) ===
    const bCreateSnap = q('#action-create-snapshot');
    if (bCreateSnap) bCreateSnap.addEventListener('click', () => {
      if (window.pythonInterface) {
        const desc = (q('#snapshot-description') || {}).value || '';
        window.pythonInterface.createSnapshot(desc).then((resp) => {
          if (resp && resp.snapshots) renderSnapshotList(resp.snapshots);
          q('#snapshot-description').value = '';
        }).catch(() => {});
      }
    });

    const bRefreshSnaps = q('#action-refresh-snapshots');
    if (bRefreshSnaps) bRefreshSnaps.addEventListener('click', () => {
      if (window.pythonInterface) {
        window.pythonInterface.listSnapshots().then(renderSnapshotList).catch(() => {});
      }
    });
  }

  // === Requirement results renderer (Issue #31) ===
  function renderRequirementResults(results) {
    const table = q('#reqs-results-table');
    const body = q('#reqs-results-body');
    const empty = q('#reqs-empty');
    if (!body) return;
    while (body.firstChild) body.removeChild(body.firstChild);
    if (!results || results.length === 0) {
      if (table) table.style.display = 'none';
      if (empty) empty.style.display = '';
      return;
    }
    if (table) table.style.display = '';
    if (empty) empty.style.display = 'none';
    results.forEach((r) => {
      const tr = document.createElement('tr');
      const icon = r.passed ? '✅' : '❌';
      const color = r.passed ? '#2e7d32' : '#c62828';
      tr.innerHTML =
        '<td style="padding:4px 6px;color:' + color + ';">' + icon + '</td>' +
        '<td style="padding:4px 6px;">' + (r.requirementName || '—') + '</td>' +
        '<td style="padding:4px 6px;text-align:right;">' + (r.actualValue != null ? r.actualValue.toFixed(2) : '—') + '</td>' +
        '<td style="padding:4px 6px;text-align:center;">' + (r.operator || '') + '</td>' +
        '<td style="padding:4px 6px;text-align:right;">' + (r.targetValue != null ? r.targetValue.toFixed(2) : '—') + '</td>' +
        '<td style="padding:4px 6px;">' + (r.unit || '') + '</td>';
      body.appendChild(tr);
    });
  }

  // === Snapshot list renderer (Issue #31) ===
  function renderSnapshotList(snapshots) {
    const list = q('#snapshot-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    if (!snapshots || snapshots.length === 0) {
      const li = document.createElement('li');
      li.style.cssText = 'color:var(--fusion-text-secondary);font-size:11px;';
      li.textContent = 'No snapshots yet.';
      list.appendChild(li);
      return;
    }
    snapshots.slice().reverse().forEach((snap) => {
      const li = document.createElement('li');
      li.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 0;border-bottom:1px solid var(--fusion-border-color,#333);';
      const ts = snap.timestamp ? new Date(snap.timestamp).toLocaleString() : '—';
      const desc = snap.description || '(no description)';
      li.innerHTML =
        '<span style="flex:1;"><strong>' + desc + '</strong><br><span style="color:var(--fusion-text-secondary);font-size:10px;">' + ts + '</span></span>' +
        '<button class="sb-tab snap-restore-btn" data-snap-id="' + snap.id + '" style="font-size:10px;padding:2px 6px;">Restore</button>';
      list.appendChild(li);
    });
    // Wire restore buttons
    qa('.snap-restore-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const snapId = e.target.getAttribute('data-snap-id');
        if (snapId && window.pythonInterface) {
          window.pythonInterface.restoreSnapshot(snapId).catch(() => {});
        }
      });
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
