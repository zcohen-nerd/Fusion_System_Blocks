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

class ToolbarManager {
  constructor(editorCore, renderer) {
    this.editor = editorCore;
    this.renderer = renderer;
    this.activeToolGroups = new Set(['File', 'Edit', 'Create', 'Select', 'Arrange']);
    this.buttonStates = new Map();
    this.keyboardShortcuts = new Map();
    
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
    const alwaysEnabled = ['new', 'load', 'block', 'types'];
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
  }

  addButtonListener(buttonId, handler) {
    const button = document.getElementById(`btn-${buttonId}`);
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
      console.error('Save failed:', error);
      alert('Failed to save diagram: ' + error.message);
    }
  }

  handleLoad() {
    try {
      // Request from Python backend
      window.sendToPython('load_diagram', {});
    } catch (error) {
      console.error('Load failed:', error);
      alert('Failed to load diagram: ' + error.message);
    }
  }

  handleExport() {
    try {
      const diagramJson = this.editor.exportDiagram();
      // Send export request to Python
      window.sendToPython('export_reports', { diagram: diagramJson });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export reports: ' + error.message);
    }
  }

  handleUndo() {
    // This would be implemented by the undo/redo system
    console.log('Undo action');
  }

  handleRedo() {
    // This would be implemented by the undo/redo system
    console.log('Redo action');
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
      console.log('Link to ECAD for block:', this.editor.selectedBlock);
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
    console.log('Add text annotation');
    // Would open text creation dialog
  }

  handleAddNote() {
    console.log('Add sticky note');
    // Would create sticky note at cursor
  }

  handleAddDimension() {
    console.log('Add dimension line');
    // Would start dimension creation mode
  }

  handleAddCallout() {
    console.log('Add callout');
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
    console.log('Auto layout');
    // Would trigger layout algorithm
  }

  handleAlignLeft() {
    console.log('Align left');
    // Would align selected blocks to left
  }

  handleAlignCenter() {
    console.log('Align center');
    // Would align selected blocks to center
  }

  handleAlignRight() {
    console.log('Align right');
    // Would align selected blocks to right
  }

  handleCreateGroup() {
    console.log('Create group');
    // Would group selected blocks
  }

  handleUngroup() {
    console.log('Ungroup');
    // Would ungroup selected group
  }

  // State management
  updateButtonStates() {
    this.buttonStates.forEach((state, buttonId) => {
      const button = document.getElementById(`btn-${buttonId}`);
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