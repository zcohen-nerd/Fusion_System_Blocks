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

const logger = window.getSystemBlocksLogger
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
      'import': 'btn-import'
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
    const alwaysEnabled = ['new', 'load', 'block', 'types', 'check-rules'];
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
      const diagramJson = this.editor.exportDiagram();
      // Send to Python backend
      window.sendToPython('save_diagram', { diagram: diagramJson });
    } catch (error) {
      logger.error('Save failed:', error);
      alert('Failed to save diagram: ' + error.message);
    }
  }

  handleLoad() {
    try {
      // Request from Python backend
      window.sendToPython('load_diagram', {});
    } catch (error) {
      logger.error('Load failed:', error);
      alert('Failed to load diagram: ' + error.message);
    }
  }

  handleExport() {
    try {
      const diagramJson = this.editor.exportDiagram();
      // Send export request to Python
      window.sendToPython('export_reports', { diagram: diagramJson });
    } catch (error) {
      logger.error('Export failed:', error);
      alert('Failed to export reports: ' + error.message);
    }
  }

  handleUndo() {
    // This would be implemented by the undo/redo system
    logger.debug('Undo action');
  }

  handleRedo() {
    // This would be implemented by the undo/redo system
    logger.debug('Redo action');
  }

  handleLinkCAD() {
    if (this.editor.selectedBlock) {
      const block = this.editor.diagram.blocks.find(b => b.id === this.editor.selectedBlock);
      if (block) {
        window.sendToPython('start_cad_selection', { 
          blockId: block.id, 
          blockName: block.name 
        });
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
    logger.debug('Auto layout');
    // Would trigger layout algorithm
  }

  handleAlignLeft() {
    logger.debug('Align left');
    // Would align selected blocks to left
  }

  handleAlignCenter() {
    logger.debug('Align center');
    // Would align selected blocks to center
  }

  handleAlignRight() {
    logger.debug('Align right');
    // Would align selected blocks to right
  }

  handleCreateGroup() {
    logger.debug('Create group');
    // Would group selected blocks
  }

  handleUngroup() {
    logger.debug('Ungroup');
    // Would ungroup selected group
  }

  handleCheckRules() {
    try {
      const diagramJson = this.editor.exportDiagram();
      window.sendToPython('check_rules', { diagram: diagramJson });
    } catch (error) {
      logger.error('Check rules failed:', error);
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