/**
 * ADVANCED FEATURES MODULE
 * 
 * Handles advanced diagram features including:
 * - Multi-selection and lasso selection
 * - Block grouping and layer management
 * - Annotations (text, notes, dimensions, callouts)
 * - Layout algorithms and alignment tools
 * - Undo/redo system
 * 
 * Author: GitHub Copilot
 * Created: September 26, 2025
 * Module: Advanced Features
 */

class AdvancedFeatures {
  constructor(editorCore, renderer) {
    this.editor = editorCore;
    this.renderer = renderer;
    
    // Multi-selection
    this.selectedBlocks = new Set();
    this.isMultiSelectMode = false;
    
    // Lasso selection
    this.isLassoSelecting = false;
    this.lassoStart = { x: 0, y: 0 };
    this.lassoRect = null;
    
    // Groups and layers
    this.groups = new Map();
    this.layers = new Map();
    this.currentLayer = 'default';
    
    // Annotations
    this.annotations = [];
    
    // Undo/redo
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoLevels = 50;
    this.isPerformingUndoRedo = false;
    
    // Hierarchy navigation stack (pushed by toolbar drill-down)
    this._hierarchyStack = [];
    
    this.initializeAdvancedFeatures();
  }

  initializeAdvancedFeatures() {
    this.setupMultiSelection();
    this.setupGroupManagement();
    this.setupLayerManagement();
    this.setupUndoRedo();
    this.initializeDefaultLayer();
  }

  // === MULTI-SELECTION SYSTEM ===
  setupMultiSelection() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        this.isMultiSelectMode = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        this.isMultiSelectMode = false;
      }
    });
  }

  addToSelection(blockId) {
    this.selectedBlocks.add(blockId);
    this.renderer.highlightBlock(blockId, true);
    this.updateSelectionUI();
  }

  removeFromSelection(blockId) {
    this.selectedBlocks.delete(blockId);
    this.renderer.highlightBlock(blockId, false);
    this.updateSelectionUI();
  }

  toggleSelection(blockId) {
    if (this.selectedBlocks.has(blockId)) {
      this.removeFromSelection(blockId);
    } else {
      this.addToSelection(blockId);
    }
  }

  clearSelection() {
    this.selectedBlocks.forEach(blockId => {
      this.renderer.highlightBlock(blockId, false);
    });
    this.selectedBlocks.clear();
    this.updateSelectionUI();
  }

  selectAll() {
    this.editor.diagram.blocks.forEach(block => {
      this.addToSelection(block.id);
    });
  }

  invertSelection() {
    const allBlocks = new Set(this.editor.diagram.blocks.map(b => b.id));
    const currentSelection = new Set(this.selectedBlocks);
    
    this.clearSelection();
    
    allBlocks.forEach(blockId => {
      if (!currentSelection.has(blockId)) {
        this.addToSelection(blockId);
      }
    });
  }

  // === LASSO SELECTION ===
  startLassoSelection(startX, startY) {
    this.isLassoSelecting = true;
    this.lassoStart = { x: startX, y: startY };
    
    // Create lasso rectangle visual
    this.lassoRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.lassoRect.setAttribute('class', 'lasso-selection');
    this.lassoRect.setAttribute('fill', 'rgba(0, 123, 255, 0.2)');
    this.lassoRect.setAttribute('stroke', '#007bff');
    this.lassoRect.setAttribute('stroke-width', '1');
    this.lassoRect.setAttribute('stroke-dasharray', '5,5');
    
    this.renderer.svg.appendChild(this.lassoRect);
  }

  updateLassoSelection(currentX, currentY) {
    if (!this.isLassoSelecting || !this.lassoRect) return;
    
    const x = Math.min(this.lassoStart.x, currentX);
    const y = Math.min(this.lassoStart.y, currentY);
    const width = Math.abs(currentX - this.lassoStart.x);
    const height = Math.abs(currentY - this.lassoStart.y);
    
    this.lassoRect.setAttribute('x', x);
    this.lassoRect.setAttribute('y', y);
    this.lassoRect.setAttribute('width', width);
    this.lassoRect.setAttribute('height', height);
  }

  finishLassoSelection(endX, endY) {
    if (!this.isLassoSelecting) return;
    
    const selectionBounds = {
      left: Math.min(this.lassoStart.x, endX),
      top: Math.min(this.lassoStart.y, endY),
      right: Math.max(this.lassoStart.x, endX),
      bottom: Math.max(this.lassoStart.y, endY)
    };
    
    // Select blocks within lasso bounds
    if (!this.isMultiSelectMode) {
      this.clearSelection();
    }
    
    this.editor.diagram.blocks.forEach(block => {
      const blockBounds = {
        left: block.x,
        top: block.y,
        right: block.x + (block.width || 120),
        bottom: block.y + (block.height || 80)
      };
      
      // Check if block overlaps with selection bounds
      if (blockBounds.left < selectionBounds.right &&
          blockBounds.right > selectionBounds.left &&
          blockBounds.top < selectionBounds.bottom &&
          blockBounds.bottom > selectionBounds.top) {
        this.addToSelection(block.id);
      }
    });
    
    // Clean up
    if (this.lassoRect) {
      this.lassoRect.remove();
      this.lassoRect = null;
    }
    this.isLassoSelecting = false;
  }

  // === GROUP MANAGEMENT ===
  setupGroupManagement() {
    this.groups.set('default', {
      id: 'default',
      name: 'Default Group',
      blocks: new Set(),
      color: '#e0e0e0',
      visible: true
    });
  }

  createGroup(blockIds, groupName = 'New Group') {
    const groupId = 'group_' + Date.now();
    const group = {
      id: groupId,
      name: groupName,
      blocks: new Set(blockIds),
      color: this.generateGroupColor(),
      visible: true,
      bounds: this.calculateGroupBounds(blockIds)
    };
    
    this.groups.set(groupId, group);
    this.renderGroupBoundary(group);
    this.saveState(); // For undo/redo
    
    return groupId;
  }

  ungroupBlocks(groupId) {
    const group = this.groups.get(groupId);
    if (group) {
      this.removeGroupBoundary(groupId);
      this.groups.delete(groupId);
      this.saveState();
    }
  }

  calculateGroupBounds(blockIds) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    blockIds.forEach(blockId => {
      const block = this.editor.diagram.blocks.find(b => b.id === blockId);
      if (block) {
        minX = Math.min(minX, block.x);
        minY = Math.min(minY, block.y);
        maxX = Math.max(maxX, block.x + (block.width || 120));
        maxY = Math.max(maxY, block.y + (block.height || 80));
      }
    });
    
    return { x: minX - 10, y: minY - 10, width: maxX - minX + 20, height: maxY - minY + 20 };
  }

  renderGroupBoundary(group) {
    // Remove stale boundary first (idempotent re-render)
    this.removeGroupBoundary(group.id);

    const boundary = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    boundary.setAttribute('id', `group-boundary-${group.id}`);
    boundary.setAttribute('x', group.bounds.x);
    boundary.setAttribute('y', group.bounds.y);
    boundary.setAttribute('width', group.bounds.width);
    boundary.setAttribute('height', group.bounds.height);
    boundary.setAttribute('fill', 'none');
    boundary.setAttribute('stroke', group.color);
    boundary.setAttribute('stroke-width', '2');
    boundary.setAttribute('stroke-dasharray', '8,4');
    boundary.setAttribute('rx', '8');
    
    // Insert behind blocks
    this.renderer.svg.insertBefore(boundary, this.renderer.svg.firstChild);
  }

  /**
   * Recalculate and re-render boundaries for every non-default group
   * whose member blocks may have moved.
   */
  updateGroupBoundaries() {
    this.groups.forEach((group, groupId) => {
      if (groupId === 'default') return;
      const blockIds = group.blocks instanceof Set
        ? Array.from(group.blocks)
        : group.blocks;
      if (!blockIds || blockIds.length === 0) return;
      group.bounds = this.calculateGroupBounds(blockIds);
      this.renderGroupBoundary(group);
    });
  }

  removeGroupBoundary(groupId) {
    const boundary = document.getElementById(`group-boundary-${groupId}`);
    if (boundary) {
      boundary.remove();
    }
  }

  generateGroupColor() {
    const colors = ['#FF6B35', '#004E89', '#009639', '#FF9F1C', '#7209B7'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // === LAYER MANAGEMENT ===
  setupLayerManagement() {
    this.createLayer('default', 'Default Layer', true);
  }

  initializeDefaultLayer() {
    this.layers.set('default', {
      id: 'default',
      name: 'Default Layer',
      visible: true,
      locked: false,
      opacity: 1.0,
      blocks: new Set()
    });
  }

  createLayer(layerId, layerName, visible = true) {
    const layer = {
      id: layerId,
      name: layerName,
      visible: visible,
      locked: false,
      opacity: 1.0,
      blocks: new Set()
    };
    
    this.layers.set(layerId, layer);
    return layerId;
  }

  moveBlocksToLayer(blockIds, layerId) {
    const targetLayer = this.layers.get(layerId);
    if (!targetLayer) return false;
    
    // Remove blocks from current layers
    this.layers.forEach(layer => {
      blockIds.forEach(blockId => {
        layer.blocks.delete(blockId);
      });
    });
    
    // Add to target layer
    blockIds.forEach(blockId => {
      targetLayer.blocks.add(blockId);
    });
    
    this.updateLayerVisibility();
    return true;
  }

  updateLayerVisibility() {
    this.layers.forEach(layer => {
      layer.blocks.forEach(blockId => {
        const blockElement = this.renderer.blockElements.get(blockId);
        if (blockElement) {
          blockElement.style.display = layer.visible ? '' : 'none';
          blockElement.style.opacity = layer.opacity;
        }
      });
    });
  }

  // === UNDO/REDO SYSTEM ===
  setupUndoRedo() {
    this.saveState('Initial state'); // Initial state
  }

  /**
   * Save the current diagram state to the undo stack.
   * @param {string} [label] - Human-readable description of the operation.
   *   If omitted, auto-detects by comparing against previous state.
   */
  saveState(label) {
    if (this.isPerformingUndoRedo) return;

    // Deep-clone groups and layers so undo history is not corrupted
    // when the live objects are mutated later.
    const cloneMap = (map) => {
      const copy = new Map();
      map.forEach((value, key) => {
        const obj = Object.assign({}, value);
        // Deep-clone Set properties (blocks)
        if (value.blocks instanceof Set) obj.blocks = new Set(value.blocks);
        copy.set(key, obj);
      });
      return copy;
    };

    const diagramSnapshot = JSON.parse(JSON.stringify(this.editor.diagram));

    // Auto-detect label if not provided
    if (!label) {
      label = this._detectOperationLabel(diagramSnapshot);
    }

    const state = {
      diagram: diagramSnapshot,
      selectedBlocks: new Set(this.selectedBlocks),
      groups: cloneMap(this.groups),
      layers: cloneMap(this.layers),
      label: label,
      timestamp: Date.now()
    };
    
    this.undoStack.push(state);
    
    // Limit undo stack size
    if (this.undoStack.length > this.maxUndoLevels) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Notify history panel
    this._notifyHistoryUpdate();
  }

  /**
   * Auto-detect what changed by comparing with the previous state.
   * @param {Object} currentDiagram - The new diagram snapshot.
   * @returns {string} A human-readable label.
   */
  _detectOperationLabel(currentDiagram) {
    if (this.undoStack.length === 0) return 'Initial state';
    const prev = this.undoStack[this.undoStack.length - 1].diagram;
    const prevBlocks = prev.blocks.length;
    const curBlocks = currentDiagram.blocks.length;
    const prevConns = prev.connections.length;
    const curConns = currentDiagram.connections.length;

    if (curBlocks > prevBlocks) return 'Add block';
    if (curBlocks < prevBlocks) return 'Delete block';
    if (curConns > prevConns) return 'Add connection';
    if (curConns < prevConns) return 'Delete connection';

    // Check for block property changes (position, name, type, shape, status)
    for (let i = 0; i < curBlocks; i++) {
      const cb = currentDiagram.blocks[i];
      const pb = prev.blocks.find(b => b.id === cb.id);
      if (!pb) return 'Edit block';
      if (cb.x !== pb.x || cb.y !== pb.y) return 'Move block';
      if (cb.name !== pb.name) return 'Rename block';
      if (cb.type !== pb.type) return 'Change type';
      if (cb.status !== pb.status) return 'Change status';
      if (cb.shape !== pb.shape) return 'Change shape';
      if ((cb.width || 120) !== (pb.width || 120) ||
          (cb.height || 80) !== (pb.height || 80)) return 'Resize block';
    }

    // Check connection property changes
    for (let i = 0; i < curConns; i++) {
      const cc = currentDiagram.connections[i];
      const pc = prev.connections.find(c => c.id === cc.id);
      if (!pc) return 'Edit connection';
      if (cc.type !== pc.type) return 'Change connection type';
      if (cc.arrowDirection !== pc.arrowDirection) return 'Change direction';
    }

    return 'Edit';
  }

  undo() {
    if (this.undoStack.length <= 1) return false; // Keep at least one state
    
    this.isPerformingUndoRedo = true;
    
    // Move current state to redo stack
    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);
    
    // Restore previous state
    const previousState = this.undoStack[this.undoStack.length - 1];
    this.restoreState(previousState);
    
    this.isPerformingUndoRedo = false;
    this._notifyHistoryUpdate();
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    
    this.isPerformingUndoRedo = true;
    
    // Get state from redo stack
    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);
    
    // Restore next state
    this.restoreState(nextState);
    
    this.isPerformingUndoRedo = false;
    this._notifyHistoryUpdate();
    return true;
  }

  restoreState(state) {
    // Restore diagram
    this.editor.diagram = JSON.parse(JSON.stringify(state.diagram));
    
    // Restore selections
    this.clearSelection();
    state.selectedBlocks.forEach(blockId => {
      this.addToSelection(blockId);
    });
    
    // Restore groups
    this.groups = new Map(state.groups);
    
    // Restore layers
    this.layers = new Map(state.layers);
    
    // Update visuals
    this.renderer.updateAllBlocks(this.editor.diagram);
    this.updateLayerVisibility();
    
    // Re-render group boundaries
    this.groups.forEach(group => {
      if (group.id !== 'default') {
        this.renderGroupBoundary(group);
      }
    });
  }

  /**
   * Jump to a specific state in the combined undo/redo timeline.
   * Index 0 = oldest undo state, currentIndex = current state.
   * @param {number} targetIndex - Index in the combined timeline.
   */
  jumpToState(targetIndex) {
    // Build combined timeline: [...undoStack]
    // Current state is undoStack[undoStack.length - 1]
    const currentIndex = this.undoStack.length - 1;
    if (targetIndex === currentIndex) return;
    if (targetIndex < 0) return;

    this.isPerformingUndoRedo = true;

    if (targetIndex < currentIndex) {
      // Need to undo (currentIndex - targetIndex) times
      const steps = currentIndex - targetIndex;
      for (let i = 0; i < steps; i++) {
        const state = this.undoStack.pop();
        this.redoStack.push(state);
      }
    } else {
      // Need to redo (targetIndex - currentIndex) times
      const steps = targetIndex - currentIndex;
      for (let i = 0; i < steps; i++) {
        const state = this.redoStack.pop();
        this.undoStack.push(state);
      }
    }

    // Restore the state at the (new) top of undoStack
    const targetState = this.undoStack[this.undoStack.length - 1];
    this.restoreState(targetState);

    this.isPerformingUndoRedo = false;
    this._notifyHistoryUpdate();
  }

  /**
   * Return formatted history entries for the UI panel.
   * Each entry: { index, label, timestamp, isCurrent, isRedo }
   */
  getHistoryEntries() {
    const entries = [];
    const currentIndex = this.undoStack.length - 1;

    // Undo stack entries (oldest first)
    for (let i = 0; i < this.undoStack.length; i++) {
      const state = this.undoStack[i];
      entries.push({
        index: i,
        label: state.label || 'Edit',
        timestamp: state.timestamp,
        isCurrent: i === currentIndex,
        isRedo: false
      });
    }

    // Redo stack entries (in reverse — oldest redo first)
    for (let i = this.redoStack.length - 1; i >= 0; i--) {
      const state = this.redoStack[i];
      entries.push({
        index: currentIndex + (this.redoStack.length - i),
        label: state.label || 'Edit',
        timestamp: state.timestamp,
        isCurrent: false,
        isRedo: true
      });
    }

    return entries;
  }

  /**
   * Notify the history panel to refresh its display.
   */
  _notifyHistoryUpdate() {
    if (window.toolbarManager && typeof window.toolbarManager.updateHistoryPanel === 'function') {
      window.toolbarManager.updateHistoryPanel();
    }
  }

  // === UI UPDATES ===
  updateSelectionUI() {
    const count = this.selectedBlocks.size;
    const statusText = count > 0 ? `${count} block${count > 1 ? 's' : ''} selected` : '';
    
    const statusElement = document.getElementById('selection-status');
    if (statusElement) {
      statusElement.textContent = statusText;
    }
    
    // Update toolbar button states based on selection
    if (window.toolbarManager) {
      window.toolbarManager.updateButtonStates();
    }
  }

  // === PUBLIC API ===
  getSelectedBlocks() {
    return Array.from(this.selectedBlocks);
  }

  hasSelection() {
    return this.selectedBlocks.size > 0;
  }

  getSelectionCount() {
    return this.selectedBlocks.size;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedFeatures;
} else {
  window.AdvancedFeatures = AdvancedFeatures;
}