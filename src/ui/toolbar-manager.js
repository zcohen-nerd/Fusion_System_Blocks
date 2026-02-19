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
    this._initTwoTierTooltips();
  }

  /**
   * Two-tier tooltip descriptions for ribbon buttons.
   * Key: button element ID, Value: { title, detail, shortcut }
   */
  static TOOLTIP_DATA = {
    'btn-new':             { title: 'New Diagram', detail: 'Create a new empty system block diagram.', shortcut: 'Ctrl+N' },
    'btn-save':            { title: 'Save', detail: 'Save the current diagram to the active Fusion document.', shortcut: 'Ctrl+S' },
    'btn-save-as':         { title: 'Save As', detail: 'Save a copy of the diagram with a new name.', shortcut: 'Ctrl+Shift+S' },
    'btn-load':            { title: 'Open', detail: 'Open a previously saved diagram from the active document.', shortcut: 'Ctrl+O' },
    'btn-open-named':      { title: 'Open Named', detail: 'Open a specific named diagram from the document.', shortcut: 'Ctrl+Shift+O' },
    'btn-export-report':   { title: 'Export', detail: 'Export the diagram as reports (Markdown, HTML, PDF, CSV, SVG, BOM, etc.).' },
    'btn-import':          { title: 'Import', detail: 'Import a diagram from Mermaid flowchart syntax or CSV data.' },
    'btn-undo':            { title: 'Undo', detail: 'Undo the last action. View full history with the History button.', shortcut: 'Ctrl+Z' },
    'btn-redo':            { title: 'Redo', detail: 'Redo the last undone action.', shortcut: 'Ctrl+Y' },
    'btn-history':         { title: 'History', detail: 'Toggle the undo/redo history panel showing all changes with timestamps.' },
    'btn-add-block-ribbon':{ title: 'Add Block', detail: 'Add a new system block to the diagram. Choose type from the dropdown.' },
    'btn-connect':         { title: 'Connect', detail: 'Start connection mode: click a source block, then a target block to create a connection.' },
    'btn-add-text':        { title: 'Add Text', detail: 'Add a free text annotation to the canvas.' },
    'btn-add-note':        { title: 'Add Note', detail: 'Add a sticky note annotation with a coloured background.' },
    'btn-add-dimension':   { title: 'Add Dimension', detail: 'Add a dimension line between two selected blocks showing distance.' },
    'btn-add-callout':     { title: 'Add Callout', detail: 'Add a callout bubble with a leader line pointing to the selected block.' },
    'btn-link-cad':        { title: 'Link to CAD', detail: 'Link the selected block to a Fusion component for BOM and 3D integration.' },
    'btn-check-rules':     { title: 'Check Rules', detail: 'Run validation rules to check for errors and warnings in the diagram.' },
    'btn-select-all':      { title: 'Select All', detail: 'Select all blocks in the diagram for batch operations.', shortcut: 'Ctrl+A' },
    'btn-select-none':     { title: 'Clear Selection', detail: 'Deselect all blocks.', shortcut: 'Esc' },
    'btn-auto-layout':     { title: 'Auto Layout', detail: 'Automatically arrange blocks in a clean hierarchical layout.' },
    'btn-snap-grid':       { title: 'Toggle Grid', detail: 'Enable or disable snapping blocks to the grid.' },
    'btn-minimap':         { title: 'Minimap', detail: 'Toggle the minimap overview in the corner of the canvas.' },
    'btn-fit-view':        { title: 'Fit View', detail: 'Zoom and pan to fit all blocks in the viewport.', shortcut: 'Ctrl+0' },
    'btn-zoom-in':         { title: 'Zoom In', detail: 'Zoom into the canvas.', shortcut: 'Ctrl+=' },
    'btn-zoom-out':        { title: 'Zoom Out', detail: 'Zoom out of the canvas.', shortcut: 'Ctrl+−' },
    'btn-go-up':           { title: 'Navigate Up', detail: 'Return to the parent diagram from a child block diagram.' },
    'btn-drill-down':      { title: 'Drill Down', detail: 'Open the child diagram of the selected block.' },
    'btn-create-child':    { title: 'Create Child', detail: 'Create a new child diagram inside the selected block.' },
  };

  /**
   * Initialise two-tier tooltips on all ribbon buttons.
   * Tier 1 (0.5 s): brief title. Tier 2 (2 s): expanded description.
   */
  _initTwoTierTooltips() {
    // Create the tooltip element once
    let tip = document.getElementById('fusion-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'fusion-tooltip';
      tip.className = 'fusion-tooltip';
      tip.style.display = 'none';
      document.body.appendChild(tip);
    }
    this._tooltip = tip;
    this._tipTimers = { tier1: null, tier2: null };

    const show = (el, data, e) => {
      clearTimeout(this._tipTimers.tier1);
      clearTimeout(this._tipTimers.tier2);

      this._tipTimers.tier1 = setTimeout(() => {
        tip.innerHTML = `<div class="tt-title">${data.title}</div>`;
        if (data.shortcut) {
          tip.innerHTML += `<div class="tt-shortcut">${data.shortcut}</div>`;
        }
        // Position below the button
        const rect = el.getBoundingClientRect();
        tip.style.left = `${rect.left}px`;
        tip.style.top = `${rect.bottom + 6}px`;
        tip.style.display = 'block';
      }, 500);

      this._tipTimers.tier2 = setTimeout(() => {
        if (tip.style.display === 'none') return;
        let html = `<div class="tt-title">${data.title}</div>`;
        html += `<div class="tt-detail">${data.detail}</div>`;
        if (data.shortcut) html += `<div class="tt-shortcut">${data.shortcut}</div>`;
        tip.innerHTML = html;
      }, 2000);
    };

    const hide = () => {
      clearTimeout(this._tipTimers.tier1);
      clearTimeout(this._tipTimers.tier2);
      tip.style.display = 'none';  // inline 'none' overrides CSS rule
    };

    // Attach to all buttons that have tooltip data
    Object.entries(ToolbarManager.TOOLTIP_DATA).forEach(([elId, data]) => {
      const el = document.getElementById(elId);
      if (!el) return;
      // Suppress native title tooltip
      el.removeAttribute('title');
      el.addEventListener('mouseenter', (e) => show(el, data, e));
      el.addEventListener('mouseleave', hide);
      el.addEventListener('mousedown', hide);
    });
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
        buttons: ['undo', 'redo', 'link-cad', 'link-ecad', 'import', 'copy', 'paste', 'history'],
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
    const alwaysEnabled = ['new', 'load', 'open-named', 'block', 'types', 'check-rules', 'fit-view', 'zoom-in', 'zoom-out', 'snap-grid', 'minimap', 'routing-mode', 'connect', 'history', 'import', 'copy', 'paste', 'text', 'note', 'dimension', 'callout'];
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

    // Buttons enabled when blocks are selected (single or multi)
    const needsSelection = ['link-cad', 'link-ecad', 'clear-selection',
                           'align-left', 'align-center', 'align-right'];
    if (needsSelection.includes(buttonId)) {
      return this.editor.selectedBlock !== null ||
        (window.advancedFeatures && window.advancedFeatures.hasSelection());
    }

    // Create group: needs at least 1 block selected
    if (buttonId === 'create-group') {
      const multiCount = window.advancedFeatures ? window.advancedFeatures.getSelectionCount() : 0;
      return multiCount >= 1;
    }

    // Ungroup: enabled when selected blocks belong to a non-default group
    if (buttonId === 'ungroup') {
      if (!window.advancedFeatures) return false;
      const selectedIds = window.advancedFeatures.hasSelection()
        ? window.advancedFeatures.getSelectedBlocks()
        : (this.editor.selectedBlock ? [this.editor.selectedBlock] : []);
      if (selectedIds.length === 0) return false;
      const selectedSet = new Set(selectedIds);
      let found = false;
      window.advancedFeatures.groups.forEach((group, groupId) => {
        if (groupId === 'default' || found) return;
        const blockSet = group.blocks instanceof Set ? group.blocks : new Set(group.blocks);
        for (const id of selectedSet) {
          if (blockSet.has(id)) { found = true; break; }
        }
      });
      return found;
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
      'Shift+KeyP': { shift: true, handler: () => this.handleSetConnectionType('power') },
      'Shift+KeyD': { shift: true, handler: () => this.handleSetConnectionType('data') },
      'Shift+KeyM': { shift: true, handler: () => this.handleSetConnectionType('mechanical') },
      'Shift+ArrowUp': { ctrl: true, shift: true, handler: () => this.handleNavigateUp() },
      'Shift+ArrowDown': { ctrl: true, shift: true, handler: () => this.handleDrillDown() },
      'Shift+KeyN': { ctrl: true, shift: true, handler: () => this.handleCreateChild() },
      'Shift+Slash': { shift: true, handler: () => this.handleShowShortcuts() },  // ? key
      'KeyM': { handler: () => this.handleToggleMinimap() }
    };

    // Store shortcuts as an array per key code to allow multiple
    // bindings (e.g. Ctrl+C for copy AND bare C for connect).
    Object.entries(shortcuts).forEach(([code, config]) => {
      this.keyboardShortcuts.set(code, config);
    });
    // Additional bindings that share a key code with an existing entry
    // are stored in a secondary map so the primary lookup still works.
    this._extraShortcuts = new Map();
    // Ctrl+C = copy (primary KeyC above is bare-C connect)
    this._extraShortcuts.set('Ctrl+KeyC', { ctrl: true, handler: () => this.handleCopy() });
    // Bare C = connect (when Ctrl is NOT held)
    // Remap: primary KeyC is now unused, handled via _extraShortcuts below
    this.keyboardShortcuts.delete('KeyB'); // will re-add in correct order
    // Re-add bare C for connect as primary:
    this.keyboardShortcuts.set('KeyC', { handler: () => this.handleConnect() });
    this.keyboardShortcuts.set('KeyB', { handler: () => this.handleCreateBlock() });

    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleKeydown(e) {
    // Don't fire shortcuts when typing in inputs
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }

    // Build compound keys to try (most-specific first)
    const candidates = [];
    if (e.shiftKey) candidates.push('Shift+' + e.code);
    if (e.ctrlKey || e.metaKey) candidates.push('Ctrl+' + e.code);
    candidates.push(e.code);

    // Check extra shortcuts first (higher priority for Ctrl combos)
    for (const key of candidates) {
      const extra = this._extraShortcuts.get(key);
      if (extra) {
        const ctrlOk = extra.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftOk = extra.shift ? e.shiftKey : !e.shiftKey;
        const altOk = extra.alt ? e.altKey : !e.altKey;
        if (ctrlOk && shiftOk && altOk) {
          e.preventDefault();
          extra.handler();
          this.updateButtonStates();
          return;
        }
      }
    }

    // Try compound key with Shift modifier first, then plain code
    const compoundKey = e.shiftKey ? 'Shift+' + e.code : null;
    const shortcut = (compoundKey && this.keyboardShortcuts.get(compoundKey)) || this.keyboardShortcuts.get(e.code);
    if (!shortcut) return;

    const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
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
      // Clear all groups so labels don't persist into the new document
      if (window.advancedFeatures) {
        window.advancedFeatures.groups.clear();
        window.advancedFeatures.clearSelection();
        if (window.advancedFeatures._hierarchyStack) {
          window.advancedFeatures._hierarchyStack = [];
        }
      }
      this.renderer.updateAllBlocks(this.editor.diagram);
      this._updateBreadcrumb();
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
        `<span class="history-label">${this._escapeHtml(entry.label)}</span>` +
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

      // Auto-start inline rename so the user can immediately name the block
      const svg = document.getElementById('svg-canvas');
      if (svg && window.SystemBlocksMain) {
        // Use a short delay to ensure the block is fully rendered in the DOM
        setTimeout(() => {
          window.SystemBlocksMain.startInlineEdit(
            newBlock, svg, this.editor, this.renderer
          );
        }, 50);
      }
    });
  }

  /**
   * Show block type dropdown positioned at arbitrary screen coordinates.
   * Used by context menu "Add Block" so the dropdown appears near the
   * right-click location rather than near the ribbon button.
   */
  showBlockTypeDropdownAt(screenX, screenY, callback) {
    // Remove any existing dropdown
    const existing = document.getElementById('block-type-dropdown');
    if (existing) existing.remove();

    const dropdown = document.createElement('div');
    dropdown.id = 'block-type-dropdown';
    dropdown.style.cssText = `
      position: fixed; left: ${screenX}px; top: ${screenY}px;
      background: var(--fusion-panel-bg, #2b2b2b);
      border: 1px solid var(--fusion-panel-border, #555);
      border-radius: 3px; padding: 4px 0; z-index: 100000;
      min-width: 170px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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

    // Clamp to viewport
    requestAnimationFrame(() => {
      const rect = dropdown.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        dropdown.style.left = (screenX - rect.width) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        dropdown.style.top = (screenY - rect.height) + 'px';
      }
    });

    // Close on outside click
    const cleanupListener = () =>
      document.removeEventListener('mousedown', outsideClick);
    const outsideClick = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.remove();
        cleanupListener();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', outsideClick), 0);
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
      border-radius: 3px; padding: 4px 0; z-index: 100000;
      min-width: 170px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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
    const text = prompt('Enter text annotation:');
    if (!text) return;
    this._addAnnotation('text', text);
  }

  handleAddNote() {
    const text = prompt('Enter note text:');
    if (!text) return;
    this._addAnnotation('note', text);
  }

  handleAddDimension() {
    // If two blocks are already selected, create the dimension immediately
    if (window.advancedFeatures && window.advancedFeatures.getSelectionCount() >= 2) {
      const ids = window.advancedFeatures.getSelectedBlocks().slice(0, 2);
      const blockA = this.editor.diagram.blocks.find(b => b.id === ids[0]);
      const blockB = this.editor.diagram.blocks.find(b => b.id === ids[1]);
      if (blockA && blockB) {
        const label = prompt('Dimension label (leave blank for auto):', '');
        this._addAnnotation('dimension', label || '', { refBlockA: ids[0], refBlockB: ids[1] });
        return;
      }
    }
    // Otherwise enter dimension pick mode — user clicks two blocks
    if (window.SystemBlocksMain) {
      window.SystemBlocksMain.enterDimensionMode();
    } else if (window.pythonInterface) {
      window.pythonInterface.showNotification('Select exactly 2 blocks to add a dimension line', 'warning');
    }
  }

  handleAddCallout() {
    const text = prompt('Enter callout text:');
    if (!text) return;
    // If a block is selected, point the callout at it
    const targetBlockId = this.editor.selectedBlock || null;
    this._addAnnotation('callout', text, { targetBlockId });
  }

  /**
   * Create an annotation and add it to the diagram.
   * @param {'text'|'note'|'dimension'|'callout'} type
   * @param {string} text
   * @param {Object} [extra] Additional annotation-specific data.
   */
  _addAnnotation(type, text, extra = {}) {
    if (!this.editor || !this.editor.diagram) return;
    if (!this.editor.diagram.annotations) {
      this.editor.diagram.annotations = [];
    }
    // Place near viewport center
    const svg = document.getElementById('svg-canvas');
    let cx = 300, cy = 200;
    if (svg) {
      const vb = svg.viewBox.baseVal;
      cx = vb.x + vb.width / 2;
      cy = vb.y + vb.height / 2;
    }
    const annotation = {
      id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      type,
      text,
      x: cx - 60,
      y: cy - 20,
      width: type === 'note' ? 140 : 120,
      height: type === 'note' ? 80 : 30,
      ...extra,
    };
    this.editor.diagram.annotations.push(annotation);
    this.editor._markDirty();
    // Render the new annotation
    if (this.renderer && typeof this.renderer.renderAnnotation === 'function') {
      this.renderer.renderAnnotation(annotation);
    }
    if (window.pythonInterface) {
      const labels = { text: 'Text', note: 'Note', dimension: 'Dimension', callout: 'Callout' };
      window.pythonInterface.showNotification(`${labels[type] || 'Annotation'} added`, 'success');
    }
  }

  handleSelectAll() {
    // Select all blocks — add to multi-selection first, then re-render,
    // then re-apply multi-selection highlights so they are not lost.
    if (window.advancedFeatures) {
      this.editor.diagram.blocks.forEach(block => {
        window.advancedFeatures.addToSelection(block.id);
      });
    }
    this.renderer.updateAllBlocks(this.editor.diagram);
    // Re-apply highlights after the full re-render
    if (window.advancedFeatures) {
      window.advancedFeatures.selectedBlocks.forEach(blockId => {
        this.renderer.highlightBlock(blockId, true);
      });
    }
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
      // Re-render group boundaries (updateAllBlocks clears them)
      if (window.advancedFeatures) window.advancedFeatures.updateGroupBoundaries();
      this.editor.clearSelection();
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    } else if (this.editor.selectedBlock) {
      if (window.advancedFeatures) {
        this._cleanupGroupsForDeletedBlocks([this.editor.selectedBlock]);
      }
      this.editor.removeBlock(this.editor.selectedBlock);
      this.renderer.updateAllBlocks(this.editor.diagram);
      // Re-render group boundaries (updateAllBlocks clears them)
      if (window.advancedFeatures) window.advancedFeatures.updateGroupBoundaries();
      this.editor.clearSelection();
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    } else if (window.SystemBlocksMain && window.SystemBlocksMain._selectedConnection) {
      // Delete the selected connection (local or cross-diagram)
      const connId = window.SystemBlocksMain._selectedConnection;
      // Remove from current diagram
      this.editor.diagram.connections = this.editor.diagram.connections.filter(c => c.id !== connId);
      // Also purge from hierarchy stack snapshots and child diagrams
      if (window.SystemBlocksMain._purgeConnectionFromAllSources) {
        window.SystemBlocksMain._purgeConnectionFromAllSources(connId, this.editor);
      }
      this.renderer.clearConnectionHighlights();
      window.SystemBlocksMain._selectedConnection = null;
      this.renderer.updateAllBlocks(this.editor.diagram);
      // Re-render group boundaries (updateAllBlocks clears them)
      if (window.advancedFeatures) window.advancedFeatures.updateGroupBoundaries();
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
    if (ids.length < 1) return;
    const name = prompt('Group name:', 'Group') || 'Group';
    window.advancedFeatures.createGroup(ids, name);
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
    // Also update the currently-selected connection in-place (#35)
    if (window.SystemBlocksMain && window.SystemBlocksMain._selectedConnection) {
      const connId = window.SystemBlocksMain._selectedConnection;
      this.editor.updateConnection(connId, { type: type });
      const conn = this.editor.diagram.connections.find(c => c.id === connId);
      if (conn) this.renderer.renderConnection(conn);
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    }
  }

  handleImport() {
    const dialog = document.getElementById('import-dialog');
    const overlay = document.getElementById('dialog-overlay');
    if (dialog) {
      dialog.style.display = 'block';
      // Also show the backdrop overlay
      if (overlay) overlay.style.display = 'block';
    } else {
      logger.warn('Import dialog element not found');
    }
  }

  handleCheckRules() {
    // Toggle the rule panel visibility
    const panel = document.getElementById('rule-panel');
    if (!panel) return;

    if (panel.style.display === 'none') {
      // Reset to centered position each time the panel opens
      panel.style.top = '50%';
      panel.style.left = '50%';
      panel.style.transform = 'translate(-50%, -50%)';
      panel.style.display = 'block';
      this._setupRulePanelListeners();
      // Auto-run all checked rules on open so results are immediate
      this._runSelectedRules();
    } else {
      panel.style.display = 'none';
    }
  }

  /**
   * One-time setup of event listeners for the rule check panel.
   * @private
   */
  _setupRulePanelListeners() {
    if (this._rulePanelBound) return;
    this._rulePanelBound = true;

    const panel = document.getElementById('rule-panel');
    if (!panel) return;

    // Close button
    const closeBtn = document.getElementById('rule-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });
    }

    // Run button
    const runBtn = document.getElementById('rule-run-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this._runSelectedRules());
    }

    // Select All / None buttons
    const allBtn = document.getElementById('rule-select-all-btn');
    const noneBtn = document.getElementById('rule-select-none-btn');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        panel.querySelectorAll('input[data-rule]').forEach(cb => { cb.checked = true; });
      });
    }
    if (noneBtn) {
      noneBtn.addEventListener('click', () => {
        panel.querySelectorAll('input[data-rule]').forEach(cb => { cb.checked = false; });
      });
    }

    // --- Drag-to-move via title bar ---
    const header = document.getElementById('rule-panel-header');
    if (header) {
      let dragging = false;
      let offsetX = 0;
      let offsetY = 0;

      header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return; // don't drag on close btn
        dragging = true;
        const rect = panel.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        header.style.cursor = 'grabbing';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        // Switch from centered transform to explicit top/left
        panel.style.transform = 'none';
        panel.style.top = (e.clientY - offsetY) + 'px';
        panel.style.left = (e.clientX - offsetX) + 'px';
      });

      document.addEventListener('mouseup', () => {
        if (dragging) {
          dragging = false;
          header.style.cursor = 'grab';
        }
      });
    }
  }

  /**
   * Run only the rules whose checkboxes are checked in the panel,
   * then display results inline with clickable block highlights.
   * @private
   */
  _runSelectedRules() {
    if (!this.editor || !this.editor.diagram) return;
    const diagram = this.editor.diagram;

    // Determine which rules are checked
    const panel = document.getElementById('rule-panel');
    const checked = new Set();
    if (panel) {
      panel.querySelectorAll('input[data-rule]:checked').forEach(cb => {
        checked.add(cb.getAttribute('data-rule'));
      });
    }
    if (checked.size === 0) {
      const results = document.getElementById('rule-results');
      if (results) results.innerHTML = '<div style="color:var(--fusion-text-secondary);font-size:12px;padding:4px;">No rules selected. Check at least one rule above.</div>';
      return;
    }

    const results = [];

    // Rule: Connectivity — orphaned blocks
    if (checked.has('connectivity')) {
      const connectedIds = new Set();
      (diagram.connections || []).forEach(c => {
        connectedIds.add(c.fromBlock);
        connectedIds.add(c.toBlock);
      });
      const orphans = diagram.blocks.filter(b => !connectedIds.has(b.id));
      if (orphans.length > 0 && diagram.blocks.length > 1) {
        results.push({
          success: false,
          rule: 'Connectivity',
          severity: 'warning',
          message: `${orphans.length} block(s) have no connections`,
          details: orphans.map(b => b.name || b.id),
          blocks: orphans.map(b => b.id),
        });
      } else {
        results.push({ success: true, rule: 'Connectivity', message: 'All blocks are connected' });
      }
    }

    // Rule: Implementation Status
    if (checked.has('implementation_completeness')) {
      const placeholders = diagram.blocks.filter(b => (b.status || 'Placeholder') === 'Placeholder');
      if (placeholders.length > 0) {
        results.push({
          success: false,
          rule: 'Implementation Status',
          severity: 'warning',
          message: `${placeholders.length} block(s) in Placeholder status`,
          details: placeholders.map(b => b.name || b.id),
          blocks: placeholders.map(b => b.id),
        });
      } else {
        results.push({ success: true, rule: 'Implementation Status', message: 'All blocks have status set' });
      }
    }

    // Rule: Unique Names
    if (checked.has('unique_names')) {
      const nameCount = {};
      diagram.blocks.forEach(b => {
        const name = b.name || '';
        nameCount[name] = (nameCount[name] || 0) + 1;
      });
      const dupes = Object.entries(nameCount).filter(([, count]) => count > 1);
      if (dupes.length > 0) {
        const dupeBlocks = diagram.blocks.filter(b => nameCount[b.name || ''] > 1);
        results.push({
          success: false,
          rule: 'Unique Names',
          severity: 'warning',
          message: `Duplicate names found`,
          details: dupes.map(([name, count]) => `"${name}" (x${count})`),
          blocks: dupeBlocks.map(b => b.id),
        });
      } else {
        results.push({ success: true, rule: 'Unique Names', message: 'All block names are unique' });
      }
    }

    // Rule: No Self-Connections
    if (checked.has('no_self_connections')) {
      const selfConns = (diagram.connections || []).filter(c => c.fromBlock === c.toBlock);
      if (selfConns.length > 0) {
        results.push({
          success: false,
          rule: 'No Self-Connections',
          severity: 'error',
          message: `${selfConns.length} self-connection(s) detected`,
          blocks: selfConns.map(c => c.fromBlock),
        });
      } else {
        results.push({ success: true, rule: 'No Self-Connections', message: 'No self-connections found' });
      }
    }

    // Rule: Named Blocks (default names)
    if (checked.has('named_blocks')) {
      const defaultNames = diagram.blocks.filter(b => /^New \w+ Block$/.test(b.name || ''));
      if (defaultNames.length > 0) {
        results.push({
          success: false,
          rule: 'Named Blocks',
          severity: 'warning',
          message: `${defaultNames.length} block(s) with default names`,
          details: defaultNames.map(b => b.name),
          blocks: defaultNames.map(b => b.id),
        });
      } else {
        results.push({ success: true, rule: 'Named Blocks', message: 'All blocks have been renamed' });
      }
    }

    // Display results inline in the panel
    this._displayRuleResults(results);
  }

  /**
   * Render rule check results into the rule-results container with
   * clickable block highlights.
   * @private
   */
  _displayRuleResults(results) {
    const container = document.getElementById('rule-results');
    if (!container) return;
    container.innerHTML = '';

    // Clear previous highlights
    if (window.diagramRenderer) {
      window.diagramRenderer.clearConnectionHighlights();
      if (this.editor && this.editor.diagram) {
        this.editor.diagram.blocks.forEach(b => {
          window.diagramRenderer.highlightBlock(b.id, false);
        });
      }
    }

    const failures = results.filter(r => !r.success);
    const total = results.length;
    const passed = total - failures.length;

    // Summary line
    const summary = document.createElement('div');
    summary.style.cssText = 'font-size:12px;font-weight:bold;padding:4px 0;margin-bottom:4px;border-bottom:1px solid var(--fusion-panel-border);';
    summary.textContent = `${passed}/${total} rules passed` +
      (failures.length > 0 ? ` \u2014 ${failures.length} issue(s)` : ' \u2714');
    summary.style.color = failures.length > 0 ? 'var(--fusion-status-warning)' : 'var(--fusion-accent-green)';
    container.appendChild(summary);

    results.forEach(result => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;';

      const icon = result.success ? '\u2705' : (result.severity === 'error' ? '\u274C' : '\u26A0\uFE0F');
      const statusColor = result.success ? 'var(--fusion-accent-green)' : 'var(--fusion-status-warning)';

      let html = `<div style="display:flex;align-items:center;gap:4px;">
        <span>${icon}</span>
        <strong style="color:${statusColor};">${result.rule}</strong>
        <span style="color:var(--fusion-text-secondary);margin-left:auto;font-size:10px;">${result.success ? 'pass' : 'fail'}</span>
      </div>
      <div style="color:var(--fusion-text-secondary);font-size:10px;padding-left:20px;">${result.message}</div>`;

      // Add clickable detail items
      if (result.details && result.details.length > 0 && result.blocks) {
        html += '<div style="padding-left:20px;margin-top:2px;">';
        result.details.forEach((detail, i) => {
          const blockId = result.blocks[i] || '';
          html += `<span class="rule-block-link" data-block-id="${blockId}" style="color:#FF6B35;cursor:pointer;font-size:10px;text-decoration:underline;margin-right:6px;">${detail}</span>`;
        });
        html += '</div>';
      } else if (!result.success && result.blocks && result.blocks.length > 0) {
        // No details array but we have block ids — make them clickable
        const blockNames = result.blocks.map(id => {
          const b = this.editor.diagram.blocks.find(bl => bl.id === id);
          return b ? (b.name || b.id) : id;
        });
        html += '<div style="padding-left:20px;margin-top:2px;">';
        blockNames.forEach((name, i) => {
          const blockId = result.blocks[i] || '';
          html += `<span class="rule-block-link" data-block-id="${blockId}" style="color:#FF6B35;cursor:pointer;font-size:10px;text-decoration:underline;margin-right:6px;">${name}</span>`;
        });
        html += '</div>';
      }

      row.innerHTML = html;
      container.appendChild(row);
    });

    // Wire up click handlers for block links
    container.querySelectorAll('.rule-block-link').forEach(link => {
      link.addEventListener('click', () => {
        const blockId = link.getAttribute('data-block-id');
        if (!blockId) return;
        // Clear previous highlights
        if (window.diagramRenderer && this.editor && this.editor.diagram) {
          this.editor.diagram.blocks.forEach(b => {
            window.diagramRenderer.highlightBlock(b.id, false);
          });
          // Highlight this block
          window.diagramRenderer.highlightBlock(blockId, true);
        }
        // Also select the block in the editor
        if (this.editor) {
          this.editor.selectBlock(blockId);
        }
      });
    });

    // Auto-highlight all failing blocks
    failures.forEach(r => {
      (r.blocks || []).forEach(bid => {
        if (window.diagramRenderer) {
          window.diagramRenderer.highlightBlock(bid, true);
        }
      });
    });
  }

  // === HIERARCHY NAVIGATION ===

  handleNavigateUp() {
    const features = window.advancedFeatures;
    if (!features || !features._hierarchyStack || features._hierarchyStack.length === 0) {
      logger.warn('Navigate Up: already at root');
      return;
    }
    const entry = features._hierarchyStack.pop();

    // Persist the current child diagram back into the parent block's
    // childDiagram property so edits are not lost.
    const parentDiagram = entry.diagram;
    const childDiagram = JSON.parse(JSON.stringify(this.editor.diagram));
    const parentBlockId = (childDiagram.metadata && childDiagram.metadata.parentBlockId) || null;
    if (parentBlockId) {
      const parentBlock = parentDiagram.blocks.find(b => b.id === parentBlockId);
      if (parentBlock) {
        parentBlock.childDiagram = childDiagram;
      }
    }

    // Restore parent diagram
    this.editor.diagram = parentDiagram;
    this.editor.clearSelection();
    // Clear child-level groups so they don't bleed into the parent view
    if (features) features.groups.clear();
    this.renderer.updateAllBlocks(this.editor.diagram);
    this._updateBreadcrumb();
    this.updateButtonStates();
    if (features) features.saveState();
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
    // Clear parent-level groups so they don't bleed into the child view
    if (features) features.groups.clear();
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

    // Auto-navigate into the newly created child diagram
    this.handleDrillDown();
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

    const expand = (x, y, w, h) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    };

    blocks.forEach(block => {
      expand(block.x, block.y, block.width || 120, block.height || 80);
    });

    // Include cross-diagram stubs, same-level stubs, and named stubs —
    // these extend ~40px beyond the block edge and have labels that
    // extend further.  Rather than parsing each stub, query the SVG DOM
    // for all rendered stub/group/annotation elements and union their
    // bounding boxes.
    const svgEl = document.getElementById('svg-canvas');
    if (svgEl) {
      const selectors = [
        '.cross-diagram-stub',
        '.same-level-stub',
        '.named-stub',
        '[id^="group-boundary-"]'
      ];
      selectors.forEach(sel => {
        svgEl.querySelectorAll(sel).forEach(el => {
          try {
            const bb = el.getBBox();
            if (bb.width > 0 || bb.height > 0) {
              expand(bb.x, bb.y, bb.width, bb.height);
            }
          } catch (_) { /* getBBox can throw on hidden elements */ }
        });
      });
    }

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

    // Extra safety margin — compensates for Fusion's CEF webview
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
      btn.title = this.editor.snapToGridEnabled
        ? 'Snap to Grid: ON (click to disable)'
        : 'Snap to Grid: OFF (click to enable)';
    }
    if (window.pythonInterface) {
      window.pythonInterface.showNotification(
        'Snap to grid: ' + (this.editor.snapToGridEnabled ? 'ON' : 'OFF'),
        'info'
      );
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

      // Auto-start inline rename so the user can immediately name the block
      const svg = document.getElementById('svg-canvas');
      if (svg && window.SystemBlocksMain) {
        setTimeout(() => {
          window.SystemBlocksMain.startInlineEdit(
            newBlock, svg, this.editor, this.renderer
          );
        }, 50);
      }
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