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
      'create-group': 'btn-group-create',
      'ungroup': 'btn-group-ungroup',
      'check-rules': 'btn-check-rules',
      'snap-grid': 'btn-snap-grid',
      'import': 'btn-import',
      'fit-view': 'btn-fit-view',
      'zoom-in': 'btn-zoom-in',
      'zoom-out': 'btn-zoom-out'
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
        buttons: ['new', 'save', 'load', 'export'],
        order: 1
      },
      'Edit': {
        buttons: ['undo', 'redo', 'link-cad', 'link-ecad'],
        order: 2
      },
      'Create': {
        buttons: ['block', 'types', 'text', 'note', 'dimension', 'callout'],
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
      'View': {
        buttons: ['fit-view', 'zoom-in', 'zoom-out', 'snap-grid'],
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
    const alwaysEnabled = ['new', 'load', 'block', 'types', 'check-rules', 'fit-view', 'zoom-in', 'zoom-out', 'snap-grid'];
    if (alwaysEnabled.includes(buttonId)) return true;

    // Buttons enabled when diagram has content
    const needsContent = ['save', 'export', 'select-all'];
    if (needsContent.includes(buttonId)) {
      return this.editor.diagram.blocks.length > 0;
    }

    // Buttons enabled when blocks are selected
    const needsSelection = ['link-cad', 'link-ecad', 'clear-selection', 'auto-layout', 
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
    this.addButtonListener('load', () => this.handleLoad());
    this.addButtonListener('export', () => this.handleExport());

    // Edit operations
    this.addButtonListener('undo', () => this.handleUndo());
    this.addButtonListener('redo', () => this.handleRedo());
    this.addButtonListener('link-cad', () => this.handleLinkCAD());
    this.addButtonListener('link-ecad', () => this.handleLinkECAD());

    // Create operations
    this.addButtonListener('block', () => this.handleCreateBlock());
    this.addButtonListener('types', () => this.handleShowBlockTypes());
    this.addButtonListener('text', () => this.handleAddText());
    this.addButtonListener('note', () => this.handleAddNote());
    this.addButtonListener('dimension', () => this.handleAddDimension());
    this.addButtonListener('callout', () => this.handleAddCallout());

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
      'KeyO': { ctrl: true, handler: () => this.handleLoad() },
      'KeyZ': { ctrl: true, handler: () => this.handleUndo() },
      'KeyY': { ctrl: true, handler: () => this.handleRedo() },
      'KeyA': { ctrl: true, handler: () => this.handleSelectAll() },
      'Escape': { handler: () => this.handleClearSelection() },
      'Delete': { handler: () => this.handleDeleteSelected() },
      'KeyB': { handler: () => this.handleCreateBlock() }
    };

    Object.entries(shortcuts).forEach(([code, config]) => {
      this.keyboardShortcuts.set(code, config);
    });

    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleKeydown(e) {
    const shortcut = this.keyboardShortcuts.get(e.code);
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
        window.pythonInterface.saveDiagram();
      } else {
        logger.error('Save failed: Python interface not available');
      }
    } catch (error) {
      logger.error('Save failed:', error);
    }
  }

  handleLoad() {
    try {
      if (window.pythonInterface) {
        window.pythonInterface.loadDiagram();
      } else {
        logger.error('Load failed: Python interface not available');
      }
    } catch (error) {
      logger.error('Load failed:', error);
    }
  }

  handleExport() {
    try {
      if (window.pythonInterface) {
        window.pythonInterface.exportReports();
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

  handleLinkCAD() {
    if (this.editor.selectedBlock) {
      const block = this.editor.diagram.blocks.find(b => b.id === this.editor.selectedBlock);
      if (block) {
        if (window.pythonInterface) {
          window.pythonInterface.sendMessage('start_cad_selection', {
            blockId: block.id,
            blockName: block.name
          }, true).catch(error => {
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

  handleLinkECAD() {
    if (this.editor.selectedBlock) {
      logger.debug('Link to ECAD for block:', this.editor.selectedBlock);
      // Implementation would show ECAD link dialog
    }
  }

  handleCreateBlock() {
    const newBlock = this.editor.addBlock({
      name: 'New Block',
      type: 'Generic',
      x: Math.random() * 300 + 100,
      y: Math.random() * 200 + 100
    });
    
    this.renderer.renderBlock(newBlock);
    this.editor.selectBlock(newBlock.id);

    // Hide the empty-canvas overlay once a block exists
    const emptyState = document.getElementById('empty-canvas-state');
    if (emptyState) {
      emptyState.classList.add('hidden');
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
    logger.debug('Add text annotation');
    // Would open text creation dialog
  }

  handleAddNote() {
    logger.debug('Add sticky note');
    // Would create sticky note at cursor
  }

  handleAddDimension() {
    logger.debug('Add dimension line');
    // Would start dimension creation mode
  }

  handleAddCallout() {
    logger.debug('Add callout');
    // Would start callout creation mode
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
    if (this.editor.selectedBlock) {
      this.editor.removeBlock(this.editor.selectedBlock);
      this.renderer.updateAllBlocks(this.editor.diagram);
      this.editor.clearSelection();
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
    // Would need to identify which group is selected
    logger.debug('Ungroup: not yet implemented for selected group');
  }

  handleCheckRules() {
    try {
      if (window.pythonInterface) {
        window.pythonInterface.checkRules();
      } else {
        logger.error('Check rules failed: Python interface not available');
      }
    } catch (error) {
      logger.error('Check rules failed:', error);
    }
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

    // Add padding (10% of content size, min 50px in viewBox units)
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padX = Math.max(50, contentWidth * 0.1);
    const padY = Math.max(50, contentHeight * 0.1);

    this.editor.setViewBox(
      minX - padX,
      minY - padY,
      contentWidth + padX * 2,
      contentHeight + padY * 2
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