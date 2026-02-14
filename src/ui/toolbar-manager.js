/**
 * TOOLBAR AND CONTROLS MODULE
 * 
 * Handles all toolbar interactions and UI controls including:
 * - Ribbon interface management
 * - Button state management
 * - Context-sensitive controls
 * - Keyboard shortcuts
 * - Action dispatch
 * 
 * Author: GitHub Copilot
 * Created: September 26, 2025
 * Module: Toolbar Controls
 */

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

class ToolbarManager {
  constructor(editorCore, renderer) {
    this.editor = editorCore;
    this.renderer = renderer;
    this.activeToolGroups = new Set(['File', 'Edit', 'Create', 'Select', 'Arrange']);
    this.buttonStates = new Map();
    this.keyboardShortcuts = new Map();

    // Map logical button names to actual HTML element IDs
    this.buttonIdMap = {
      'new': 'btn-new',
      'save': 'btn-save',
      'load': 'btn-load',
      'export': 'btn-export-report',
      'undo': 'btn-undo',
      'redo': 'btn-redo',
      'link-cad': 'btn-link-cad',
      'link-ecad': 'btn-link-ecad',
      'block': 'btn-add-block-ribbon',
      'text': 'btn-add-text',
      'note': 'btn-add-note',
      'dimension': 'btn-add-dimension',
      'callout': 'btn-add-callout',
      'select-all': 'btn-select-all',
      'clear-selection': 'btn-select-none',
      'auto-layout': 'btn-auto-layout',
      'align-left': 'btn-align-left',
      'align-center': 'btn-align-center',
      'align-right': 'btn-align-right',
      'create-group': 'btn-group-create',
      'ungroup': 'btn-group-ungroup',
      'check-rules': 'btn-check-rules',
      'snap-grid': 'btn-snap-grid',
      'import': 'btn-import',
      'fit-view': 'btn-fit-view',
      'zoom-in': 'btn-zoom-in',
      'zoom-out': 'btn-zoom-out',
      'connect': 'btn-connect',
      'save-as': 'btn-save-as',
      'open-named': 'btn-open-named',
      'go-up': 'btn-go-up',
      'drill-down': 'btn-drill-down',
      'create-child': 'btn-create-child',
      'history': 'btn-history'
    };

    this.initializeToolbar();
    this.setupKeyboardShortcuts();
  }

  initializeToolbar() {
    this.setupRibbonGroups();
    this.setupButtonEventListeners();
    this.updateButtonStates();
  }

  setupRibbonGroups() {
    const ribbonGroups = {
      'File': {
        buttons: ['new', 'save', 'save-as', 'load', 'open-named', 'export'],
        order: 1
      },
      'Edit': {
        buttons: ['undo', 'redo', 'link-cad', 'link-ecad'],
        order: 2
      },
      'Create': {
        buttons: ['block', 'connect', 'types', 'text', 'note', 'dimension', 'callout'],
        order: 3
      },
      'Select': {
        buttons: ['select-all', 'clear-selection', 'invert-selection'],
        order: 4
      },
      'Arrange': {
        buttons: ['auto-layout', 'align-left', 'align-center', 'align-right', 'create-group', 'ungroup'],
        order: 5
      },
      'Validate': {
        buttons: ['check-rules'],
        order: 6
      },
      'Navigate': {
        buttons: ['go-up', 'drill-down', 'create-child'],
        order: 7
      },
      'View': {
        buttons: ['fit-view', 'zoom-in', 'zoom-out', 'snap-grid', 'minimap', 'routing-mode'],
        order: 7
      }
    };

    // Initialize button states for each group
    Object.entries(ribbonGroups).forEach(([groupName, groupData]) => {
      groupData.buttons.forEach(buttonId => {
        this.buttonStates.set(buttonId, {
          enabled: this.getDefaultButtonState(buttonId),
          active: false,
          visible: true
        });
      });
    });
  }

  getDefaultButtonState(buttonId) {
    // Buttons that are always enabled
    const alwaysEnabled = ['new', 'load', 'open-named', 'block', 'types', 'check-rules', 'fit-view', 'zoom-in', 'zoom-out', 'snap-grid', 'minimap', 'routing-mode', 'connect', 'history'];
    if (alwaysEnabled.includes(buttonId)) return true;

    // Undo/redo: enabled when there are states to restore
    if (buttonId === 'undo') {
      return window.advancedFeatures && window.advancedFeatures.undoStack && window.advancedFeatures.undoStack.length > 1;
    }
    if (buttonId === 'redo') {
      return window.advancedFeatures && window.advancedFeatures.redoStack && window.advancedFeatures.redoStack.length > 0;
    }

    // Navigation buttons — enabled based on hierarchy state
    if (buttonId === 'go-up') {
      return window.advancedFeatures && window.advancedFeatures._hierarchyStack
        && window.advancedFeatures._hierarchyStack.length > 0;
    }
    if (buttonId === 'drill-down') {
      // Enabled when a selected block has a child diagram
      if (!this.editor.selectedBlock) return false;
      const block = this.editor.diagram.blocks.find(
        b => b.id === this.editor.selectedBlock);
      return block && block.childDiagram &&
        block.childDiagram.blocks !== undefined;
    }
    if (buttonId === 'create-child') {
      // Enabled when a block is selected and doesn't already have child
      if (!this.editor.selectedBlock) return false;
      const blk = this.editor.diagram.blocks.find(
        b => b.id === this.editor.selectedBlock);
      return blk && !(blk.childDiagram &&
        blk.childDiagram.blocks !== undefined);
    }

    // Buttons enabled when diagram has content
    const needsContent = ['save', 'save-as', 'export', 'select-all', 'auto-layout'];
    if (needsContent.includes(buttonId)) {
      return this.editor.diagram.blocks.length > 0;
    }

    // Buttons enabled when blocks are selected
    const needsSelection = ['link-cad', 'link-ecad', 'clear-selection',
                           'align-left', 'align-center', 'align-right', 'create-group'];
    if (needsSelection.includes(buttonId)) {
      return this.editor.selectedBlock !== null;
    }

    return false;
  }

  setupButtonEventListeners() {
    // File operations
    this.addButtonListener('new', () => this.handleNewDiagram());
    this.addButtonListener('save', () => this.handleSave());
    this.addButtonListener('save-as', () => this.handleSaveAs());
    this.addButtonListener('load', () => this.handleLoad());
    this.addButtonListener('open-named', () => this.handleOpenNamed());
    this.addButtonListener('export', () => this.handleExport());

    // Edit operations
    this.addButtonListener('undo', () => this.handleUndo());
    this.addButtonListener('redo', () => this.handleRedo());
    this.addButtonListener('link-cad', () => this.handleLinkCAD());
    this.addButtonListener('link-ecad', () => this.handleLinkECAD());
    this.addButtonListener('import', () => this.handleImport());
    this.addButtonListener('copy', () => this.handleCopy());
    this.addButtonListener('paste', () => this.handlePaste());
    this.addButtonListener('history', () => this.handleToggleHistory());

    // Wire history panel close button
    const historyClose = document.getElementById('history-close');
    if (historyClose) {
      historyClose.addEventListener('click', () => this.handleToggleHistory());
    }

    // Create operations
    this.addButtonListener('block', () => this.handleCreateBlock());
    this.addButtonListener('connect', () => this.handleConnect());
    this.addButtonListener('types', () => this.handleShowBlockTypes());
    this.addButtonListener('text', () => this.handleAddText());
    this.addButtonListener('note', () => this.handleAddNote());
    this.addButtonListener('dimension', () => this.handleAddDimension());
    this.addButtonListener('callout', () => this.handleAddCallout());

    // Navigation operations
    this.addButtonListener('go-up', () => this.handleNavigateUp());
    this.addButtonListener('drill-down', () => this.handleDrillDown());
    this.addButtonListener('create-child', () => this.handleCreateChild());

    // Selection operations
    this.addButtonListener('select-all', () => this.handleSelectAll());
    this.addButtonListener('clear-selection', () => this.handleClearSelection());
    this.addButtonListener('invert-selection', () => this.handleInvertSelection());

    // Arrangement operations
    this.addButtonListener('auto-layout', () => this.handleAutoLayout());
    this.addButtonListener('align-left', () => this.handleAlignLeft());
    this.addButtonListener('align-center', () => this.handleAlignCenter());
    this.addButtonListener('align-right', () => this.handleAlignRight());
    this.addButtonListener('create-group', () => this.handleCreateGroup());
    this.addButtonListener('ungroup', () => this.handleUngroup());

    // Validation operations
    this.addButtonListener('check-rules', () => this.handleCheckRules());

    // View operations
    this.addButtonListener('fit-view', () => this.handleFitView());
    this.addButtonListener('zoom-in', () => this.handleZoomIn());
    this.addButtonListener('zoom-out', () => this.handleZoomOut());
    this.addButtonListener('snap-grid', () => this.handleToggleSnapGrid());
    this.addButtonListener('minimap', () => this.handleToggleMinimap());
    this.addButtonListener('routing-mode', () => this.handleToggleRoutingMode());
  }

  addButtonListener(buttonId, handler) {
    const elementId = this.buttonIdMap[buttonId] || `btn-${buttonId}`;
    const button = document.getElementById(elementId);
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const state = this.buttonStates.get(buttonId);
        if (state && state.enabled) {
          handler();
          this.updateButtonStates();
        }
      });
    }
  }

  setupKeyboardShortcuts() {
    const shortcuts = {
      'KeyN': { ctrl: true, handler: () => this.handleNewDiagram() },
      'KeyS': { ctrl: true, handler: () => this.handleSave() },
      'Shift+KeyS': { ctrl: true, shift: true, handler: () => this.handleSaveAs() },
      'KeyO': { ctrl: true, handler: () => this.handleLoad() },
      'Shift+KeyO': { ctrl: true, shift: true, handler: () => this.handleOpenNamed() },
      'KeyZ': { ctrl: true, handler: () => this.handleUndo() },
      'Shift+KeyZ': { ctrl: true, shift: true, handler: () => this.handleRedo() },
      'KeyY': { ctrl: true, handler: () => this.handleRedo() },
      'KeyA': { ctrl: true, handler: () => this.handleSelectAll() },
      'KeyC': { ctrl: true, handler: () => this.handleCopy() },
      'KeyV': { ctrl: true, handler: () => this.handlePaste() },
      'KeyD': { ctrl: true, handler: () => this.handleDuplicate() },
      'KeyF': { ctrl: true, handler: () => this.handleFocusSearch() },
      'Equal': { ctrl: true, handler: () => this.handleZoomIn() },
      'Minus': { ctrl: true, handler: () => this.handleZoomOut() },
      'Digit0': { ctrl: true, handler: () => this.handleFitView() },
      'Escape': { handler: () => this.handleClearSelection() },
      'Delete': { handler: () => this.handleDeleteSelected() },
      'Backspace': { handler: () => this.handleDeleteSelected() },
      'Insert': { handler: () => this.handleCreateBlock() },
      'KeyB': { handler: () => this.handleCreateBlock() },
      'KeyC': { handler: () => this.handleConnect() },  // bare C = connect mode
      'Shift+KeyP': { shift: true, handler: () => this.handleSetConnectionType('power') },
      'Shift+KeyD': { shift: true, handler: () => this.handleSetConnectionType('data') },
      'Shift+KeyE': { shift: true, handler: () => this.handleSetConnectionType('electrical') },
      'Shift+KeyM': { shift: true, handler: () => this.handleSetConnectionType('mechanical') },
      'Shift+ArrowUp': { ctrl: true, shift: true, handler: () => this.handleNavigateUp() },
      'Shift+ArrowDown': { ctrl: true, shift: true, handler: () => this.handleDrillDown() },
      'Shift+KeyN': { ctrl: true, shift: true, handler: () => this.handleCreateChild() },
      'Shift+Slash': { shift: true, handler: () => this.handleShowShortcuts() },  // ? key
      'KeyM': { handler: () => this.handleToggleMinimap() }
    };

    Object.entries(shortcuts).forEach(([code, config]) => {
      this.keyboardShortcuts.set(code, config);
    });

    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleKeydown(e) {
    // Don't fire shortcuts when typing in inputs
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }

    // Try compound key with Shift modifier first, then plain code
    const compoundKey = e.shiftKey ? 'Shift+' + e.code : null;
    const shortcut = (compoundKey && this.keyboardShortcuts.get(compoundKey)) || this.keyboardShortcuts.get(e.code);
    if (!shortcut) return;

    const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
    const altMatch = shortcut.alt ? e.altKey : !e.altKey;
    const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

    if (ctrlMatch && altMatch && shiftMatch) {
      e.preventDefault();
      shortcut.handler();
      this.updateButtonStates();
    }
  }

  // ---- Keyboard shortcuts help dialog ----
  handleShowShortcuts() {
    const overlay = document.getElementById('shortcuts-overlay');
    if (!overlay) return;
    const isOpen = overlay.style.display !== 'none';
    overlay.style.display = isOpen ? 'none' : 'flex';
    if (!overlay._wired) {
      overlay._wired = true;
      // Close on backdrop click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
      // Close button
      const closeBtn = document.getElementById('shortcuts-close');
      if (closeBtn) closeBtn.addEventListener('click', () => overlay.style.display = 'none');
    }
  }

  // Button action handlers
  handleNewDiagram() {
    if (confirm('Create new diagram? Unsaved changes will be lost.')) {
      this.editor.diagram = this.editor.createEmptyDiagram();
      this.editor.clearSelection();
      this.renderer.updateAllBlocks(this.editor.diagram);
    }
  }

  handleSave() {
    try {
      if (window.pythonInterface) {
        window.pythonInterface.saveDiagram().then(() => {
          // Update the "Last saved" footer pill
          const el = document.getElementById('status-last-saved');
          if (el) el.textContent = 'Last saved: ' + new Date().toLocaleString();
        });
      } else {
        logger.error('Save failed: Python interface not available');
      }
    } catch (error) {
      logger.error('Save failed:', error);
    }
  }

  handleLoad() {
    try {
      // Warn about unsaved changes before loading a new diagram
      if (this.editor && typeof this.editor.hasUnsavedChanges === 'function' && this.editor.hasUnsavedChanges()) {
        if (!confirm('You have unsaved changes. Load a new diagram anyway?')) {
          return;
        }
      }
      if (window.pythonInterface) {
        if (window.showLoadingSpinner) window.showLoadingSpinner('Loading diagram\u2026');
        window.pythonInterface.loadDiagram()
          .finally(() => { if (window.hideLoadingSpinner) window.hideLoadingSpinner(); });
      } else {
        logger.error('Load failed: Python interface not available');
      }
    } catch (error) {
      if (window.hideLoadingSpinner) window.hideLoadingSpinner();
      logger.error('Load failed:', error);
    }
  }

  handleSaveAs() {
    const overlay = document.getElementById('save-as-overlay');
    const nameInput = document.getElementById('save-as-name');
    if (!overlay || !nameInput) return;

    nameInput.value = '';
    overlay.style.display = 'flex';
    nameInput.focus();

    // Wire confirm/cancel (remove old listeners via clone trick)
    const confirmBtn = document.getElementById('save-as-confirm');
    const cancelBtn = document.getElementById('save-as-cancel');

    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newCancel.addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    newConfirm.addEventListener('click', () => {
      const label = nameInput.value.trim();
      if (!label) {
        nameInput.style.borderColor = '#dc3545';
        return;
      }
      nameInput.style.borderColor = '';
      overlay.style.display = 'none';
      if (window.pythonInterface) {
        window.pythonInterface.saveNamedDiagram(label);
      }
    });

    // Allow Enter to confirm
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        newConfirm.click();
      }
    });
  }

  handleOpenNamed() {
    const overlay = document.getElementById('open-doc-overlay');
    const listContainer = document.getElementById('open-doc-list');
    const cancelBtn = document.getElementById('open-doc-cancel');
    if (!overlay || !listContainer) return;

    listContainer.innerHTML = '<div style="text-align:center;color:#999;padding:16px;">Loading…</div>';
    overlay.style.display = 'flex';

    // Wire cancel
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newCancel.addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    if (!window.pythonInterface) return;

    window.pythonInterface.listDocuments().then(docs => {
      listContainer.innerHTML = '';
      if (!docs || docs.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center;color:#999;padding:16px;">No saved documents.</div>';
        return;
      }
      docs.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'doc-list-item';
        item.innerHTML =
          '<div style="flex:1;cursor:pointer;">' +
            '<strong>' + this._escapeHtml(doc.label) + '</strong>' +
            '<div style="font-size:11px;color:#999;">' + (doc.modified || '') + '</div>' +
          '</div>' +
          '<button class="doc-delete-btn" title="Delete" style="background:none;border:none;color:#dc3545;cursor:pointer;font-size:16px;">✕</button>';

        // Click to open
        item.querySelector('div').addEventListener('click', () => {
          overlay.style.display = 'none';
          window.pythonInterface.loadNamedDiagram(doc.slug);
        });

        // Click to delete
        item.querySelector('.doc-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          // Decode any HTML entities that may have been escaped by the backend
          const decodedLabel = doc.label.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          if (confirm('Delete "' + decodedLabel + '"?')) {
            window.pythonInterface.deleteNamedDiagram(doc.slug).then(() => {
              item.remove();
              if (listContainer.children.length === 0) {
                listContainer.innerHTML = '<div style="text-align:center;color:#999;padding:16px;">No saved documents.</div>';
              }
            });
          }
        });

        listContainer.appendChild(item);
      });
    });
  }

  _escapeHtml(text) {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  handleExport() {
    this.showExportDialog();
  }

  /**
   * Show the export options dialog. Lets the user pick which formats
   * to export and optionally choose a destination folder.
   */
  showExportDialog() {
    const overlay = document.getElementById('export-overlay');
    if (!overlay) {
      // Fallback if dialog HTML not present — direct export
      this._executeExport();
      return;
    }

    overlay.style.display = 'flex';

    // Wire up select-all / select-none
    const allBtn = document.getElementById('exp-select-all');
    const noneBtn = document.getElementById('exp-select-none');
    const checkboxes = overlay.querySelectorAll('input[type="checkbox"]');

    const selectAll = () => checkboxes.forEach(cb => cb.checked = true);
    const selectNone = () => checkboxes.forEach(cb => cb.checked = false);

    if (allBtn) allBtn.onclick = selectAll;
    if (noneBtn) noneBtn.onclick = selectNone;

    // Browse folder button — asks Python for a folder dialog
    const browseBtn = document.getElementById('exp-browse-folder');
    const folderInput = document.getElementById('exp-folder-path');
    if (browseBtn) {
      browseBtn.onclick = () => {
        if (window.pythonInterface) {
          window.pythonInterface.sendMessage('browse_folder', {}, true)
            .then(resp => {
              if (resp && resp.path) {
                folderInput.value = resp.path;
                folderInput.dataset.customPath = resp.path;
              }
            })
            .catch(() => {
              // User cancelled or Python bridge unavailable — keep default
            });
        }
      };
    }

    // Cancel
    const cancelBtn = document.getElementById('exp-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => { overlay.style.display = 'none'; };
    }

    // Confirm export
    const confirmBtn = document.getElementById('exp-confirm');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        // Gather selected format keys
        const formatMap = {
          'exp-markdown': 'markdown',
          'exp-html': 'html',
          'exp-csv': 'csv',
          'exp-header': 'header',
          'exp-bom-csv': 'bom_csv',
          'exp-bom-json': 'bom_json',
          'exp-assembly-md': 'assembly_md',
          'exp-assembly-json': 'assembly_json',
          'exp-connection-matrix': 'connection_matrix',
          'exp-svg': 'svg',
          'exp-pdf': 'pdf'
        };

        const selected = [];
        for (const [elemId, key] of Object.entries(formatMap)) {
          const cb = document.getElementById(elemId);
          if (cb && cb.checked) selected.push(key);
        }

        if (selected.length === 0) {
          if (window.pythonInterface) {
            window.pythonInterface.showNotification('Select at least one export format', 'warning');
          }
          return;
        }

        const customPath = folderInput && folderInput.dataset.customPath
          ? folderInput.dataset.customPath
          : null;

        overlay.style.display = 'none';
        this._executeExport(selected, customPath);
      };
    }
  }

  /**
   * Run the actual export with optional format list and output path.
   */
  _executeExport(formats, outputPath) {
    try {
      if (window.pythonInterface) {
        if (window.showLoadingSpinner) window.showLoadingSpinner('Exporting reports\u2026');
        window.pythonInterface.exportReports(formats, outputPath)
          .catch(error => {
            logger.error('Export failed:', error);
          })
          .finally(() => { if (window.hideLoadingSpinner) window.hideLoadingSpinner(); });
      } else {
        logger.error('Export failed: Python interface not available');
        if (window.pythonInterface) {
          window.pythonInterface.showNotification(
            'Export failed — Python interface not available',
            'error'
          );
        }
      }
    } catch (error) {
      logger.error('Export failed:', error);
    }
  }

  handleUndo() {
    if (window.advancedFeatures) {
      const success = window.advancedFeatures.undo();
      if (!success) {
        logger.debug('Nothing to undo');
      }
    }
  }

  handleRedo() {
    if (window.advancedFeatures) {
      const success = window.advancedFeatures.redo();
      if (!success) {
        logger.debug('Nothing to redo');
      }
    }
  }

  handleToggleHistory() {
    const panel = document.getElementById('history-panel');
    if (!panel) return;
    const isVisible = panel.classList.contains('show');
    if (isVisible) {
      panel.classList.remove('show');
    } else {
      this.updateHistoryPanel();
      panel.classList.add('show');
    }
  }

  /**
   * Refresh the undo history panel with current entries.
   * Called by AdvancedFeatures._notifyHistoryUpdate() after every
   * saveState(), undo(), redo(), and jumpToState().
   */
  updateHistoryPanel() {
    const list = document.getElementById('history-list');
    const countEl = document.getElementById('history-count');
    const panel = document.getElementById('history-panel');
    if (!list || !panel) return;

    // Only refresh if panel is visible
    if (!panel.classList.contains('show')) return;

    if (!window.advancedFeatures) {
      list.innerHTML = '<div style="padding:12px;color:#888;font-size:11px;">No history available</div>';
      return;
    }

    const entries = window.advancedFeatures.getHistoryEntries();
    if (countEl) {
      const total = entries.length;
      const max = window.advancedFeatures.maxUndoLevels || 50;
      countEl.textContent = `(${total}/${max})`;
    }

    // Build HTML — most recent at top
    const iconMap = {
      'Initial state': '🏁',
      'Add block': '➕',
      'Delete block': '🗑️',
      'Move block': '↕️',
      'Rename block': '✏️',
      'Change type': '🔷',
      'Change status': '📊',
      'Change shape': '⬡',
      'Resize block': '↔️',
      'Add connection': '🔗',
      'Delete connection': '✂️',
      'Change connection type': '🔌',
      'Change direction': '➡️',
      'Edit block': '📝',
      'Edit connection': '📝',
      'Edit': '📝'
    };

    list.innerHTML = '';
    // Display entries in reverse order (most recent first)
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const div = document.createElement('div');
      div.className = 'history-entry' +
        (entry.isCurrent ? ' current' : '') +
        (entry.isRedo ? ' redo-entry' : '');
      div.setAttribute('data-history-index', entry.index);

      const icon = iconMap[entry.label] || '📝';
      const timeAgo = this._formatTimeAgo(entry.timestamp);

      div.innerHTML =
        `<span class="history-icon">${icon}</span>` +
        `<span class="history-label">${entry.label}</span>` +
        `<span class="history-time">${timeAgo}</span>`;

      div.addEventListener('click', () => {
        window.advancedFeatures.jumpToState(entry.index);
      });

      list.appendChild(div);
    }

    // Scroll current entry into view
    const currentEl = list.querySelector('.current');
    if (currentEl) currentEl.scrollIntoView({ block: 'nearest' });
  }

  _formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 5000) return 'now';
    if (diff < 60000) return Math.floor(diff / 1000) + 's ago';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    return Math.floor(diff / 3600000) + 'h ago';
  }

  handleLinkCAD() {
    if (this.editor.selectedBlock) {
      const block = this.editor.diagram.blocks.find(b => b.id === this.editor.selectedBlock);
      if (block) {
        if (window.pythonInterface) {
          window.pythonInterface.sendMessage(BridgeAction.START_CAD_SELECTION, {
            blockId: block.id,
            blockName: block.name
          }, true).then(() => {
            // The palette is hidden during CAD selection.  When it
            // reappears the Python side pushes the link data via
            // sendInfoToHTML, but the web-view may not be ready yet.
            // Poll as a fallback to retrieve pending data.
            this._pollForPendingCADLink();
          }).catch(error => {
            logger.error('CAD link failed:', error);
          });
        }
      }
    } else {
      if (window.pythonInterface) {
        window.pythonInterface.showNotification('Select a block first to link CAD', 'warning');
      }
    }
  }

  /**
   * Poll the Python backend for pending CAD link data that may have
   * been missed when the palette was restored after CAD selection.
   * Stops automatically after 30 seconds or when data arrives.
   */
  _pollForPendingCADLink() {
    if (this._cadLinkPoll) clearInterval(this._cadLinkPoll);

    const startTime = Date.now();
    this._cadLinkPoll = setInterval(() => {
      // Safety timeout — stop polling after 30 s
      if (Date.now() - startTime > 30000) {
        clearInterval(this._cadLinkPoll);
        this._cadLinkPoll = null;
        return;
      }
      if (!window.pythonInterface || !window.pythonInterface.isConnected) return;

      window.pythonInterface
        .sendMessage(BridgeAction.GET_PENDING_CAD_LINK, {}, true)
        .then(resp => {
          if (resp && resp.success && resp.linkData) {
            clearInterval(this._cadLinkPoll);
            this._cadLinkPoll = null;
            window.pythonInterface.handleCADLinkPayload(resp.linkData);
          }
        })
        .catch(() => {
          // Ignore transient errors during polling
        });
    }, 800);
  }

  handleLinkECAD() {
    if (this.editor.selectedBlock) {
      logger.debug('Link to ECAD for block:', this.editor.selectedBlock);
      // Implementation would show ECAD link dialog
    }
  }

  handleCreateBlock() {
    // Track how many blocks have been created in this session so each new
    // block cascades diagonally instead of stacking on the same spot.
    if (this._blockCreationCount === undefined) this._blockCreationCount = 0;

    this.showBlockTypeDropdown((type) => {
      // Place new block at center of current viewport (not random)
      const cx = this.editor.viewBox.x + this.editor.viewBox.width / 2;
      const cy = this.editor.viewBox.y + this.editor.viewBox.height / 2;

      // Cascade offset: each successive block shifts right+down by one
      // grid step (20px).  After 8 blocks the offset wraps so blocks
      // don't march off-screen.
      const step = this.editor.gridSize || 20;
      const idx  = this._blockCreationCount % 8;
      this._blockCreationCount++;

      const offsetX = idx * step;
      const offsetY = idx * step;
      const snapped = this.editor.snapToGrid(
        cx - 60 + offsetX,
        cy - 40 + offsetY
      );

      const newBlock = this.editor.addBlock({
        name: 'New ' + type + ' Block',
        type: type,
        x: snapped.x,
        y: snapped.y
      });

      this.renderer.renderBlock(newBlock);
      this.editor.selectBlock(newBlock.id);

      // Hide the empty-canvas overlay once a block exists
      const emptyState = document.getElementById('empty-canvas-state');
      if (emptyState) {
        emptyState.classList.add('hidden');
      }
    });
  }

  showBlockTypeDropdown(callback) {
    // Remove any existing dropdown
    const existing = document.getElementById('block-type-dropdown');
    if (existing) existing.remove();

    const btn = document.getElementById(this.buttonIdMap['block']);
    if (!btn) { callback('Generic'); return; }
    const rect = btn.getBoundingClientRect();

    const dropdown = document.createElement('div');
    dropdown.id = 'block-type-dropdown';
    dropdown.style.cssText = `
      position: fixed; left: ${rect.left}px; top: ${rect.bottom + 4}px;
      background: var(--fusion-panel-bg, #2b2b2b);
      border: 1px solid var(--fusion-panel-border, #555);
      border-radius: 6px; padding: 4px 0; z-index: 100000;
      min-width: 170px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      color: var(--fusion-text-primary, #fff);
    `;

    const types = [
      { name: 'Generic',    icon: '\u2B1C' },
      { name: 'Electrical', icon: '\u26A1' },
      { name: 'Mechanical', icon: '\u2699\uFE0F' },
      { name: 'Software',   icon: '\uD83D\uDCBB' }
    ];

    types.forEach(t => {
      const item = document.createElement('div');
      item.textContent = t.icon + '  ' + t.name;
      item.style.cssText = 'padding: 8px 16px; cursor: pointer; font-size: 13px;';
      item.addEventListener('mouseenter', () =>
        item.style.background = 'var(--fusion-hover-bg, #3a3a3a)');
      item.addEventListener('mouseleave', () =>
        item.style.background = '');
      item.addEventListener('click', () => {
        dropdown.remove();
        cleanupListener();
        callback(t.name);
      });
      dropdown.appendChild(item);
    });

    document.body.appendChild(dropdown);

    // Close on outside click
    const cleanupListener = () =>
      document.removeEventListener('mousedown', outsideClick);
    const outsideClick = (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) {
        dropdown.remove();
        cleanupListener();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', outsideClick), 0);
  }

  handleConnect() {
    // Enter connection mode: if a block is selected, start from it;
    // otherwise prompt user to select a source block first.
    if (this.editor.selectedBlock) {
      const block = this.editor.diagram.blocks.find(b => b.id === this.editor.selectedBlock);
      if (block && window.SystemBlocksMain) {
        window.SystemBlocksMain.enterConnectionMode(block, this.editor, this.renderer);
      }
    } else {
      logger.info('Select a block first, then click Connect');
      if (window.pythonInterface) {
        window.pythonInterface.showNotification('Select a block first, then click Connect', 'warning');
      }
    }
  }

  handleShowBlockTypes() {
    // Toggle block types dropdown/panel
    const typesPanel = document.getElementById('block-types-panel');
    if (typesPanel) {
      typesPanel.style.display = typesPanel.style.display === 'block' ? 'none' : 'block';
    }
  }

  handleAddText() {
    logger.debug('Add text annotation — not yet implemented');
    if (window.pythonInterface) {
      window.pythonInterface.showNotification('Text annotations coming soon', 'info');
    }
  }

  handleAddNote() {
    logger.debug('Add sticky note — not yet implemented');
    if (window.pythonInterface) {
      window.pythonInterface.showNotification('Sticky notes coming soon', 'info');
    }
  }

  handleAddDimension() {
    logger.debug('Add dimension line — not yet implemented');
    if (window.pythonInterface) {
      window.pythonInterface.showNotification('Dimension lines coming soon', 'info');
    }
  }

  handleAddCallout() {
    logger.debug('Add callout — not yet implemented');
    if (window.pythonInterface) {
      window.pythonInterface.showNotification('Callouts coming soon', 'info');
    }
  }

  handleSelectAll() {
    // Select all blocks
    this.editor.diagram.blocks.forEach(block => {
      if (window.advancedFeatures) {
        window.advancedFeatures.addToSelection(block.id);
      }
    });
    this.renderer.updateAllBlocks(this.editor.diagram);
  }

  handleClearSelection() {
    // Close the shortcuts help dialog if it's open
    const shortcutsOverlay = document.getElementById('shortcuts-overlay');
    if (shortcutsOverlay && shortcutsOverlay.style.display !== 'none') {
      shortcutsOverlay.style.display = 'none';
      return;
    }
    this.editor.clearSelection();
    if (window.advancedFeatures) {
      window.advancedFeatures.clearSelection();
    }
  }

  handleInvertSelection() {
    if (window.advancedFeatures) {
      window.advancedFeatures.invertSelection();
    }
  }

  handleDeleteSelected() {
    // Delete all blocks in the multi-selection (advancedFeatures), or
    // fall back to the single-selected block from the core editor,
    // or delete the currently-selected connection.
    const multiIds = window.advancedFeatures && window.advancedFeatures.hasSelection()
      ? window.advancedFeatures.getSelectedBlocks()
      : [];

    if (multiIds.length > 0) {
      // Clean up groups that contain deleted blocks
      if (window.advancedFeatures) {
        this._cleanupGroupsForDeletedBlocks(multiIds);
      }
      multiIds.forEach(id => this.editor.removeBlock(id));
      if (window.advancedFeatures) window.advancedFeatures.clearSelection();
      this.renderer.updateAllBlocks(this.editor.diagram);
      this.editor.clearSelection();
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    } else if (this.editor.selectedBlock) {
      if (window.advancedFeatures) {
        this._cleanupGroupsForDeletedBlocks([this.editor.selectedBlock]);
      }
      this.editor.removeBlock(this.editor.selectedBlock);
      this.renderer.updateAllBlocks(this.editor.diagram);
      this.editor.clearSelection();
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    } else if (window.SystemBlocksMain && window.SystemBlocksMain._selectedConnection) {
      // Delete the selected connection
      const connId = window.SystemBlocksMain._selectedConnection;
      this.editor.removeConnection(connId);
      this.renderer.clearConnectionHighlights();
      window.SystemBlocksMain._selectedConnection = null;
      this.renderer.updateAllBlocks(this.editor.diagram);
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    }
  }

  handleAutoLayout() {
    // Simple grid layout for all blocks
    const blocks = this.editor.diagram.blocks;
    if (blocks.length === 0) return;
    const cols = Math.max(1, Math.ceil(Math.sqrt(blocks.length)));
    blocks.forEach((block, i) => {
      block.x = 50 + (i % cols) * 160;
      block.y = 50 + Math.floor(i / cols) * 120;
    });
    this.editor.diagram.metadata.modified = new Date().toISOString();
    this.renderer.updateAllBlocks(this.editor.diagram);
    if (window.advancedFeatures) window.advancedFeatures.saveState();
  }

  handleAlignLeft() {
    if (!window.advancedFeatures || !window.advancedFeatures.hasSelection()) return;
    const ids = window.advancedFeatures.getSelectedBlocks();
    const blocks = this.editor.diagram.blocks.filter(b => ids.includes(b.id));
    if (blocks.length < 2) return;
    const minX = Math.min(...blocks.map(b => b.x));
    blocks.forEach(b => { b.x = minX; });
    this.renderer.updateAllBlocks(this.editor.diagram);
    window.advancedFeatures.saveState();
  }

  handleAlignCenter() {
    if (!window.advancedFeatures || !window.advancedFeatures.hasSelection()) return;
    const ids = window.advancedFeatures.getSelectedBlocks();
    const blocks = this.editor.diagram.blocks.filter(b => ids.includes(b.id));
    if (blocks.length < 2) return;
    const avgX = blocks.reduce((sum, b) => sum + b.x + (b.width || 120) / 2, 0) / blocks.length;
    blocks.forEach(b => { b.x = avgX - (b.width || 120) / 2; });
    this.renderer.updateAllBlocks(this.editor.diagram);
    window.advancedFeatures.saveState();
  }

  handleAlignRight() {
    if (!window.advancedFeatures || !window.advancedFeatures.hasSelection()) return;
    const ids = window.advancedFeatures.getSelectedBlocks();
    const blocks = this.editor.diagram.blocks.filter(b => ids.includes(b.id));
    if (blocks.length < 2) return;
    const maxRight = Math.max(...blocks.map(b => b.x + (b.width || 120)));
    blocks.forEach(b => { b.x = maxRight - (b.width || 120); });
    this.renderer.updateAllBlocks(this.editor.diagram);
    window.advancedFeatures.saveState();
  }

  handleCreateGroup() {
    if (!window.advancedFeatures || !window.advancedFeatures.hasSelection()) return;
    const ids = window.advancedFeatures.getSelectedBlocks();
    if (ids.length < 2) return;
    window.advancedFeatures.createGroup(ids, 'Group');
  }

  handleUngroup() {
    if (!window.advancedFeatures) return;
    // Find groups that contain any of the currently-selected blocks
    const selectedIds = window.advancedFeatures.hasSelection()
      ? window.advancedFeatures.getSelectedBlocks()
      : (this.editor.selectedBlock ? [this.editor.selectedBlock] : []);
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const groupsToRemove = [];
    window.advancedFeatures.groups.forEach((group, groupId) => {
      if (groupId === 'default') return;
      const blockSet = group.blocks instanceof Set ? group.blocks : new Set(group.blocks);
      for (const id of selectedSet) {
        if (blockSet.has(id)) { groupsToRemove.push(groupId); break; }
      }
    });
    groupsToRemove.forEach(gid => window.advancedFeatures.ungroupBlocks(gid));
  }

  handleCopy() {
    const selectedIds = window.advancedFeatures && window.advancedFeatures.hasSelection()
      ? window.advancedFeatures.getSelectedBlocks()
      : (this.editor.selectedBlock ? [this.editor.selectedBlock] : []);
    if (selectedIds.length === 0) {
      if (window.pythonInterface) {
        window.pythonInterface.showNotification('Select block(s) to copy', 'warning');
      }
      return;
    }
    // Deep-copy selected blocks into internal clipboard
    this._clipboard = selectedIds.map(id => {
      const b = this.editor.diagram.blocks.find(bl => bl.id === id);
      return b ? JSON.parse(JSON.stringify(b)) : null;
    }).filter(Boolean);
    // Also copy connections that exist entirely within the selection
    const idSet = new Set(selectedIds);
    this._clipboardConnections = this.editor.diagram.connections
      .filter(c => idSet.has(c.fromBlock) && idSet.has(c.toBlock))
      .map(c => JSON.parse(JSON.stringify(c)));
    logger.debug(`Copied ${this._clipboard.length} block(s) and ${this._clipboardConnections.length} connection(s)`);
    if (window.pythonInterface) {
      window.pythonInterface.showNotification(
        `Copied ${this._clipboard.length} block(s)`, 'success'
      );
    }
  }

  handlePaste() {
    if (!this._clipboard || this._clipboard.length === 0) {
      if (window.pythonInterface) {
        window.pythonInterface.showNotification('Nothing to paste — copy blocks first', 'warning');
      }
      return;
    }
    const step = this.editor.gridSize || 20;
    const idMap = new Map(); // old id → new id
    // Paste blocks with offset
    this._clipboard.forEach(orig => {
      const clone = this.editor.addBlock({
        name: orig.name + ' (copy)',
        type: orig.type || 'Generic',
        x: orig.x + step,
        y: orig.y + step,
        width: orig.width,
        height: orig.height,
        status: orig.status,
        shape: orig.shape
      });
      idMap.set(orig.id, clone.id);
      this.renderer.renderBlock(clone);
    });
    // Recreate connections between pasted blocks
    if (this._clipboardConnections) {
      this._clipboardConnections.forEach(conn => {
        const newFrom = idMap.get(conn.fromBlock);
        const newTo = idMap.get(conn.toBlock);
        if (newFrom && newTo) {
          const newConn = this.editor.addConnection(
            newFrom, newTo, conn.type, conn.arrowDirection
          );
          if (newConn) {
            this.renderer.renderConnection(newConn);
          }
        }
      });
    }
    logger.debug(`Pasted ${this._clipboard.length} block(s)`);
    if (window.pythonInterface) {
      window.pythonInterface.showNotification(
        `Pasted ${this._clipboard.length} block(s)`, 'success'
      );
    }
  }

  handleDuplicate() {
    // Duplicate selected block(s) — shortcut Ctrl+D
    const selectedIds = window.advancedFeatures && window.advancedFeatures.hasSelection()
      ? window.advancedFeatures.getSelectedBlocks()
      : (this.editor.selectedBlock ? [this.editor.selectedBlock] : []);
    if (selectedIds.length === 0) return;
    const step = this.editor.gridSize || 20;
    selectedIds.forEach(id => {
      const orig = this.editor.diagram.blocks.find(b => b.id === id);
      if (!orig) return;
      const clone = this.editor.addBlock({
        name: orig.name + ' (copy)',
        type: orig.type || 'Generic',
        x: orig.x + step,
        y: orig.y + step,
        status: orig.status,
        shape: orig.shape
      });
      this.renderer.renderBlock(clone);
    });
  }

  handleFocusSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  handleSetConnectionType(type) {
    const select = document.getElementById('connection-type-select');
    if (select) {
      select.value = type;
      select.dispatchEvent(new Event('change'));
    }
  }

  handleImport() {
    const overlay = document.getElementById('import-dialog');
    if (overlay) {
      overlay.style.display = 'flex';
    } else {
      logger.warn('Import dialog element not found');
    }
  }

  handleCheckRules() {
    try {
      if (window.pythonInterface) {
        window.pythonInterface.checkRules()
          .catch(error => {
            logger.error('Check rules failed:', error);
            // Show inline fallback so the user sees feedback
            window.pythonInterface.showNotification(
              'Check rules failed — ensure the Python bridge is connected',
              'error'
            );
          });
      } else {
        logger.error('Check rules failed: Python interface not available');
      }
    } catch (error) {
      logger.error('Check rules failed:', error);
    }
  }

  // === HIERARCHY NAVIGATION ===

  handleNavigateUp() {
    const features = window.advancedFeatures;
    if (!features || !features._hierarchyStack || features._hierarchyStack.length === 0) {
      logger.warn('Navigate Up: already at root');
      return;
    }
    const entry = features._hierarchyStack.pop();
    // Restore parent diagram
    this.editor.diagram = entry.diagram;
    this.editor.clearSelection();
    this.renderer.updateAllBlocks(this.editor.diagram);
    this._updateBreadcrumb();
    this.updateButtonStates();
    logger.info('Navigated up to', entry.name || 'Root');
  }

  handleDrillDown() {
    if (!this.editor.selectedBlock) return;
    const block = this.editor.diagram.blocks.find(
      b => b.id === this.editor.selectedBlock);
    if (!block || !block.childDiagram) return;

    const features = window.advancedFeatures;
    if (!features) return;
    if (!features._hierarchyStack) features._hierarchyStack = [];

    // Push current diagram onto hierarchy stack
    features._hierarchyStack.push({
      diagram: JSON.parse(JSON.stringify(this.editor.diagram)),
      name: block.name || block.id
    });

    // Load child diagram
    this.editor.diagram = block.childDiagram;
    this.editor.clearSelection();
    this.renderer.updateAllBlocks(this.editor.diagram);
    this._updateBreadcrumb();
    this.updateButtonStates();
    logger.info('Drilled down into', block.name || block.id);
  }

  handleCreateChild() {
    if (!this.editor.selectedBlock) return;
    const block = this.editor.diagram.blocks.find(
      b => b.id === this.editor.selectedBlock);
    if (!block) return;
    if (block.childDiagram && block.childDiagram.blocks !== undefined) {
      logger.warn('Block already has a child diagram');
      return;
    }
    // Create empty child diagram
    block.childDiagram = {
      blocks: [],
      connections: [],
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: '2.0',
        parentBlockId: block.id
      }
    };
    // Re-render the block to show visual hint (could add an icon)
    this.renderer.renderBlock(block);
    this.updateButtonStates();
    if (window.advancedFeatures) window.advancedFeatures.saveState();
    logger.info('Created child diagram for', block.name || block.id);
  }

  _updateBreadcrumb() {
    const crumb = document.getElementById('breadcrumb-path');
    if (!crumb) return;
    const features = window.advancedFeatures;
    if (!features || !features._hierarchyStack || features._hierarchyStack.length === 0) {
      crumb.textContent = 'Root';
      return;
    }
    const path = ['Root'].concat(
      features._hierarchyStack.map(e => e.name));
    crumb.textContent = path.join(' › ');
  }

  handleFitView() {
    const blocks = this.editor.diagram.blocks;
    if (blocks.length === 0) {
      // Reset to default view
      this.editor.setViewBox(0, 0, 1000, 1000);
      return;
    }

    // Calculate bounding box of all blocks
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    blocks.forEach(block => {
      minX = Math.min(minX, block.x);
      minY = Math.min(minY, block.y);
      maxX = Math.max(maxX, block.x + (block.width || 120));
      maxY = Math.max(maxY, block.y + (block.height || 80));
    });

    // Add generous padding (25% of content size, min 100px)
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padX = Math.max(100, contentWidth * 0.25);
    const padY = Math.max(100, contentHeight * 0.25);

    let fitW = contentWidth + padX * 2;
    let fitH = contentHeight + padY * 2;

    // Match the SVG container's actual visible aspect ratio so the
    // viewBox maps 1:1 to pixels.  SVG defaults to preserveAspectRatio
    // "xMidYMid meet" which uniformly scales and centres the viewBox,
    // but that can clip content along one axis when the AR doesn't match.
    const svgEl = document.getElementById('svg-canvas');
    if (svgEl) {
      const rect = svgEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const containerAR = rect.width / rect.height;
        const fitAR = fitW / fitH;
        if (fitAR > containerAR) {
          // Content wider than container — expand height
          fitH = fitW / containerAR;
        } else {
          // Content taller than container — expand width
          fitW = fitH * containerAR;
        }
      }
    }

    // Extra safety margin — compensates for Fusion 360's CEF webview
    // where getBoundingClientRect can under-report height, especially
    // near the bottom edge occupied by the ribbon/toolbar/status bar.
    // Use 15% horizontal + 20% vertical (ribbon steals vertical space).
    fitW *= 1.15;
    fitH *= 1.20;

    // Enforce a minimum viewBox size so we never zoom in too aggressively
    const MIN_VB_W = 600;
    const MIN_VB_H = 500;
    if (fitW < MIN_VB_W) { fitW = MIN_VB_W; }
    if (fitH < MIN_VB_H) { fitH = MIN_VB_H; }

    // Keep the content centred within the (possibly enlarged) viewBox
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    this.editor.setViewBox(
      cx - fitW / 2,
      cy - fitH / 2,
      fitW,
      fitH
    );
  }

  handleZoomIn() {
    // Zoom towards center of current view
    const cx = this.editor.viewBox.x + this.editor.viewBox.width / 2;
    const cy = this.editor.viewBox.y + this.editor.viewBox.height / 2;
    this.editor.zoomAt(0.8, cx, cy); // factor < 1 = zoom in (smaller viewBox)
  }

  handleZoomOut() {
    const cx = this.editor.viewBox.x + this.editor.viewBox.width / 2;
    const cy = this.editor.viewBox.y + this.editor.viewBox.height / 2;
    this.editor.zoomAt(1.25, cx, cy); // factor > 1 = zoom out (larger viewBox)
  }

  handleToggleSnapGrid() {
    this.editor.snapToGridEnabled = !this.editor.snapToGridEnabled;
    const btn = document.getElementById('btn-snap-grid');
    if (btn) {
      btn.classList.toggle('active', this.editor.snapToGridEnabled);
    }
    logger.info('Snap to grid:', this.editor.snapToGridEnabled ? 'enabled' : 'disabled');
  }

  handleToggleMinimap() {
    if (window.Minimap && window.minimapInstance) {
      window.minimapInstance.toggle();
    } else {
      // Fallback: toggle container directly
      const container = document.getElementById('minimap-container');
      if (container) {
        const hidden = container.style.display === 'none';
        container.style.display = hidden ? '' : 'none';
        const btn = document.getElementById('btn-minimap');
        if (btn) btn.classList.toggle('active', hidden);
      }
    }
  }

  /**
   * Toggle connection routing between Bezier curves and orthogonal
   * (Manhattan / right-angle) routing with obstacle avoidance.
   */
  handleToggleRoutingMode() {
    if (!window.diagramRenderer) return;
    const newMode = window.diagramRenderer.toggleRoutingMode();
    const btn = document.getElementById('btn-routing-mode');
    if (btn) {
      btn.classList.toggle('active', newMode === 'orthogonal');
      btn.title = newMode === 'orthogonal'
        ? 'Switch to curved connections'
        : 'Switch to orthogonal connections';
    }
    if (window.pythonInterface) {
      window.pythonInterface.showNotification(
        `Routing: ${newMode === 'orthogonal' ? 'Orthogonal' : 'Bezier'}`,
        'info'
      );
    }
  }

  // State management
  updateButtonStates() {
    this.buttonStates.forEach((state, buttonId) => {
      const elementId = this.buttonIdMap[buttonId] || `btn-${buttonId}`;
      const button = document.getElementById(elementId);
      if (button) {
        // Update enabled state
        state.enabled = this.getDefaultButtonState(buttonId);
        
        if (state.enabled) {
          button.removeAttribute('disabled');
          button.classList.remove('disabled');
        } else {
          button.setAttribute('disabled', 'true');
          button.classList.add('disabled');
        }

        // Update active state
        if (state.active) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }

        // Update visibility
        button.style.display = state.visible ? '' : 'none';
      }
    });
  }

  setButtonState(buttonId, enabled, active = false, visible = true) {
    const state = this.buttonStates.get(buttonId);
    if (state) {
      state.enabled = enabled;
      state.active = active;
      state.visible = visible;
      this.updateButtonStates();
    }
  }

  getButtonState(buttonId) {
    return this.buttonStates.get(buttonId);
  }

  /**
   * Remove groups whose blocks have all been deleted, and clean up the
   * SVG group boundary for any affected group.
   */
  _cleanupGroupsForDeletedBlocks(deletedIds) {
    if (!window.advancedFeatures) return;
    const deletedSet = new Set(deletedIds);
    const groupsToRemove = [];
    window.advancedFeatures.groups.forEach((group, groupId) => {
      if (groupId === 'default') return;
      const blockSet = group.blocks instanceof Set ? group.blocks : new Set(group.blocks);
      // Remove deleted blocks from the group
      for (const id of deletedSet) { blockSet.delete(id); }
      group.blocks = blockSet;
      // If group is now empty, mark for removal
      if (blockSet.size === 0) {
        groupsToRemove.push(groupId);
      } else {
        // Recalculate bounds for remaining blocks
        group.bounds = window.advancedFeatures.calculateGroupBounds(Array.from(blockSet));
      }
    });
    groupsToRemove.forEach(gid => window.advancedFeatures.ungroupBlocks(gid));
  }

  /**
   * Create a block at a specific SVG position (used by context menu "Add Block").
   */
  handleCreateBlockAtPosition(svgX, svgY) {
    this.showBlockTypeDropdown((type) => {
      const snapped = this.editor.snapToGrid(svgX - 60, svgY - 40);
      const newBlock = this.editor.addBlock({
        name: 'New ' + type + ' Block',
        type: type,
        x: snapped.x,
        y: snapped.y
      });
      this.renderer.renderBlock(newBlock);
      this.editor.selectBlock(newBlock.id);
      const emptyState = document.getElementById('empty-canvas-state');
      if (emptyState) emptyState.classList.add('hidden');
    });
  }

  // Responsive toolbar handling
  handleResize() {
    const toolbar = document.querySelector('.fusion-ribbon');
    if (!toolbar) return;

    const containerWidth = toolbar.offsetWidth;
    const groups = toolbar.querySelectorAll('.toolbar-group');
    
    // Adjust group visibility based on available space
    let totalWidth = 0;
    groups.forEach((group, index) => {
      const groupWidth = group.offsetWidth;
      totalWidth += groupWidth;
      
      if (totalWidth > containerWidth - 100) { // Reserve space for overflow menu
        group.style.display = 'none';
      } else {
        group.style.display = 'flex';
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToolbarManager;
} else {
  window.ToolbarManager = ToolbarManager;
}