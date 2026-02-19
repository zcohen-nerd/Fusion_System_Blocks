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
    if (!this.isLassoSelecting) return [];
    
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
    
    const newlySelected = [];
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
        newlySelected.push(block.id);
      }
    });
    
    // Clean up
    if (this.lassoRect) {
      this.lassoRect.remove();
      this.lassoRect = null;
    }
    this.isLassoSelecting = false;
    return newlySelected;
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

  /**
   * Create a group and sync it to the diagram model for persistence.
   * @param {string[]} blockIds
   * @param {string} groupName
   * @param {object} [opts] Optional fields: description, metadata, parentGroupId, color
   * @returns {string} The new group ID.
   */
  createGroup(blockIds, groupName = 'New Group', opts = {}) {
    const groupId = 'group_' + Date.now();
    const group = {
      id: groupId,
      name: groupName,
      description: opts.description || '',
      blocks: new Set(blockIds),
      color: opts.color || this.generateGroupColor(),
      visible: true,
      bounds: this.calculateGroupBounds(blockIds),
      metadata: opts.metadata || {},
      parentGroupId: opts.parentGroupId || null
    };
    
    this.groups.set(groupId, group);
    this.renderGroupBoundary(group);
    this._syncGroupsToDiagram();
    this.saveState();
    
    return groupId;
  }

  ungroupBlocks(groupId) {
    const group = this.groups.get(groupId);
    if (group) {
      this.removeGroupBoundary(groupId);
      this.groups.delete(groupId);
      // Clear parent references from child groups
      this.groups.forEach(g => {
        if (g.parentGroupId === groupId) g.parentGroupId = null;
      });
      this._syncGroupsToDiagram();
      this.saveState();
    }
  }

  addBlockToGroup(groupId, blockId) {
    const group = this.groups.get(groupId);
    if (!group) return false;
    if (group.blocks instanceof Set) {
      if (group.blocks.has(blockId)) return false;
      group.blocks.add(blockId);
    } else {
      if (group.blocks.includes(blockId)) return false;
      group.blocks.push(blockId);
    }
    const blockIds = group.blocks instanceof Set
      ? Array.from(group.blocks)
      : group.blocks;
    group.bounds = this.calculateGroupBounds(blockIds);
    this.renderGroupBoundary(group);
    this._syncGroupsToDiagram();
    this.saveState();
    return true;
  }

  removeBlockFromGroup(groupId, blockId) {
    const group = this.groups.get(groupId);
    if (!group) return false;
    if (group.blocks instanceof Set) {
      if (!group.blocks.has(blockId)) return false;
      group.blocks.delete(blockId);
    } else {
      const idx = group.blocks.indexOf(blockId);
      if (idx === -1) return false;
      group.blocks.splice(idx, 1);
    }
    const blockIds = group.blocks instanceof Set
      ? Array.from(group.blocks)
      : group.blocks;
    if (blockIds.length === 0) {
      this.removeGroupBoundary(groupId);
      this.groups.delete(groupId);
    } else {
      group.bounds = this.calculateGroupBounds(blockIds);
      this.renderGroupBoundary(group);
    }
    this._syncGroupsToDiagram();
    this.saveState();
    return true;
  }

  /**
   * Return non-default groups as an array with full detail.
   */
  getGroupList() {
    const result = [];
    this.groups.forEach((group, groupId) => {
      if (groupId === 'default') return;
      const blockIds = group.blocks instanceof Set
        ? Array.from(group.blocks)
        : (group.blocks || []);
      result.push({
        id: groupId,
        name: group.name,
        description: group.description || '',
        blockIds,
        metadata: group.metadata || {},
        parentGroupId: group.parentGroupId || null,
        color: group.color || ''
      });
    });
    return result;
  }

  /**
   * Return the group ID that contains the given block, or null.
   */
  getGroupForBlock(blockId) {
    for (const [groupId, group] of this.groups) {
      if (groupId === 'default') continue;
      const blocks = group.blocks instanceof Set
        ? group.blocks
        : new Set(group.blocks);
      if (blocks.has(blockId)) return groupId;
    }
    return null;
  }

  /**
   * Hit-test: return the group whose boundary rectangle contains (x, y),
   * or null. Used to allow connecting to/from group boundaries.
   */
  getGroupAtPoint(x, y) {
    for (const [groupId, group] of this.groups) {
      if (groupId === 'default') continue;
      const b = group.bounds;
      if (!b) continue;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        return group;
      }
    }
    return null;
  }

  calculateGroupBounds(blockIds) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    const blockIdSet = new Set(blockIds);

    blockIds.forEach(blockId => {
      const block = this.editor.diagram.blocks.find(b => b.id === blockId);
      if (block) {
        minX = Math.min(minX, block.x);
        minY = Math.min(minY, block.y);
        maxX = Math.max(maxX, block.x + (block.width || 120));
        maxY = Math.max(maxY, block.y + (block.height || 80));
      }
    });

    // Extend bounds to include named stubs attached to member blocks
    const stubs = this.editor.diagram.namedStubs || [];
    const STUB_LEN = 30;
    const STUB_LABEL_PAD = 50; // extra padding for the stub label text
    stubs.forEach(stub => {
      if (!blockIdSet.has(stub.blockId)) return;
      const block = this.editor.diagram.blocks.find(b => b.id === stub.blockId);
      if (!block) return;
      const w = block.width || 120;
      const h = block.height || 80;
      switch (stub.portSide) {
        case 'input':
          minX = Math.min(minX, block.x - STUB_LEN - STUB_LABEL_PAD);
          break;
        case 'top':
          minY = Math.min(minY, block.y - STUB_LEN - STUB_LABEL_PAD);
          break;
        case 'bottom':
          maxY = Math.max(maxY, block.y + h + STUB_LEN + STUB_LABEL_PAD);
          break;
        case 'output':
        default:
          maxX = Math.max(maxX, block.x + w + STUB_LEN + STUB_LABEL_PAD);
          break;
      }
    });

    // Also extend for same-level stub connections
    const stubConns = (this.editor.diagram.connections || []).filter(c => c.renderAsStub);
    stubConns.forEach(conn => {
      const fromInGroup = blockIdSet.has(conn.fromBlock);
      const toInGroup = blockIdSet.has(conn.toBlock);
      if (fromInGroup) {
        const block = this.editor.diagram.blocks.find(b => b.id === conn.fromBlock);
        if (block) {
          const w = block.width || 120;
          const h = block.height || 80;
          const port = conn.fromPort || 'output';
          if (port === 'output') maxX = Math.max(maxX, block.x + w + STUB_LEN + STUB_LABEL_PAD);
          if (port === 'input') minX = Math.min(minX, block.x - STUB_LEN - STUB_LABEL_PAD);
          if (port === 'bottom') maxY = Math.max(maxY, block.y + h + STUB_LEN + STUB_LABEL_PAD);
          if (port === 'top') minY = Math.min(minY, block.y - STUB_LEN - STUB_LABEL_PAD);
        }
      }
      if (toInGroup) {
        const block = this.editor.diagram.blocks.find(b => b.id === conn.toBlock);
        if (block) {
          const w = block.width || 120;
          const h = block.height || 80;
          const port = conn.toPort || 'input';
          if (port === 'output') maxX = Math.max(maxX, block.x + w + STUB_LEN + STUB_LABEL_PAD);
          if (port === 'input') minX = Math.min(minX, block.x - STUB_LEN - STUB_LABEL_PAD);
          if (port === 'bottom') maxY = Math.max(maxY, block.y + h + STUB_LEN + STUB_LABEL_PAD);
          if (port === 'top') minY = Math.min(minY, block.y - STUB_LEN - STUB_LABEL_PAD);
        }
      }
    });
    
    return { x: minX - 10, y: minY - 10, width: maxX - minX + 20, height: maxY - minY + 20 };
  }

  renderGroupBoundary(group) {
    // Remove stale boundary first (idempotent re-render)
    this.removeGroupBoundary(group.id);

    const ns = 'http://www.w3.org/2000/svg';
    const gEl = document.createElementNS(ns, 'g');
    gEl.setAttribute('id', `group-boundary-${group.id}`);
    gEl.setAttribute('data-group-id', group.id);

    // Compute nesting depth for visual inset
    let depth = 0;
    let pid = group.parentGroupId;
    const seen = new Set();
    while (pid && !seen.has(pid)) {
      seen.add(pid);
      const parent = this.groups.get(pid);
      if (parent) { depth++; pid = parent.parentGroupId; }
      else break;
    }
    const inset = depth * 6; // nested groups get slight padding increase

    const bounds = group.bounds || { x: 0, y: 0, width: 100, height: 60 };
    const bx = bounds.x - inset;
    const by = bounds.y - inset;
    const bw = bounds.width + inset * 2;
    const bh = bounds.height + inset * 2;

    const boundary = document.createElementNS(ns, 'rect');
    boundary.setAttribute('x', bx);
    boundary.setAttribute('y', by);
    boundary.setAttribute('width', bw);
    boundary.setAttribute('height', bh);
    boundary.setAttribute('fill', 'none');
    boundary.setAttribute('stroke', group.color);
    boundary.setAttribute('stroke-width', depth > 0 ? '1.5' : '2');
    boundary.setAttribute('stroke-dasharray', depth > 0 ? '4,3' : '8,4');
    boundary.setAttribute('rx', '8');
    gEl.appendChild(boundary);

    // Wide invisible hit area around the boundary so it's easier to click
    const hitRect = document.createElementNS(ns, 'rect');
    hitRect.setAttribute('x', bx - 6);
    hitRect.setAttribute('y', by - 6);
    hitRect.setAttribute('width', bw + 12);
    hitRect.setAttribute('height', bh + 12);
    hitRect.setAttribute('fill', 'transparent');
    hitRect.setAttribute('stroke', 'transparent');
    hitRect.setAttribute('stroke-width', '12');
    hitRect.setAttribute('rx', '10');
    hitRect.setAttribute('pointer-events', 'stroke');
    hitRect.setAttribute('cursor', 'pointer');
    gEl.appendChild(hitRect);

    // Render group label above the boundary
    let labelY = by - 6;
    if (group.name && group.name !== 'default') {
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', String(bx + 8));
      label.setAttribute('y', String(labelY));
      label.setAttribute('fill', group.color);
      label.setAttribute('stroke', 'none');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
      label.setAttribute('pointer-events', 'none');

      // Show parent indicator for nested groups
      let labelText = group.name;
      if (group.parentGroupId) {
        const parent = this.groups.get(group.parentGroupId);
        if (parent) labelText = parent.name + ' › ' + group.name;
      }

      // Metadata badge: show count of metadata keys
      const metaKeys = group.metadata ? Object.keys(group.metadata) : [];
      if (metaKeys.length > 0) {
        labelText += '  ⚙' + metaKeys.length;
      }

      label.textContent = labelText;
      gEl.appendChild(label);
      labelY -= 14;
    }

    // Render description below the group name
    if (group.description) {
      const descEl = document.createElementNS(ns, 'text');
      descEl.setAttribute('x', String(bx + 8));
      descEl.setAttribute('y', String(by - 6 + 14));
      descEl.setAttribute('fill', group.color);
      descEl.setAttribute('stroke', 'none');
      descEl.setAttribute('font-size', '10');
      descEl.setAttribute('font-style', 'italic');
      descEl.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
      descEl.setAttribute('pointer-events', 'none');
      descEl.setAttribute('opacity', '0.8');
      // Truncate long descriptions
      const maxLen = 60;
      descEl.textContent = group.description.length > maxLen
        ? group.description.substring(0, maxLen) + '…'
        : group.description;
      gEl.appendChild(descEl);
    }

    // Double-click on the boundary group for a properties dialog
    gEl.style.cursor = 'pointer';
    gEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this._showGroupPropertiesDialog(group);
    });

    // Right-click for context menu
    gEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._showGroupContextMenu(e.clientX, e.clientY, group);
    });
    
    // Insert behind blocks
    this.renderer.svg.insertBefore(gEl, this.renderer.svg.firstChild);
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

  /**
   * Show a visual color picker popup for changing a group's boundary color.
   * Offers preset swatches and a native HTML color input for custom colors.
   * @private
   */
  _showGroupColorPicker(group) {
    const prev = document.getElementById('group-color-picker');
    if (prev) prev.remove();

    const overlay = document.createElement('div');
    overlay.id = 'group-color-picker';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;' +
      'align-items:center;justify-content:center;background:rgba(0,0,0,0.45);';

    const card = document.createElement('div');
    card.style.cssText = 'background:#1e1e2e;border:1px solid #555;border-radius:10px;' +
      'padding:18px;width:280px;color:#ccc;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,0.5);';

    const heading = document.createElement('div');
    heading.textContent = 'Group Color: ' + (group.name || group.id);
    heading.style.cssText = 'font-weight:600;margin-bottom:12px;font-size:14px;';
    card.appendChild(heading);

    // Preset swatches
    const presets = [
      '#FF6B35', '#004E89', '#009639', '#FF9F1C', '#7209B7',
      '#E63946', '#2A9D8F', '#F4A261', '#264653', '#E76F51',
      '#6A4C93', '#1982C4', '#8AC926', '#FFCA3A', '#FF595E'
    ];

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px;';

    let selectedColor = group.color || '#FF6B35';

    presets.forEach(color => {
      const swatch = document.createElement('div');
      swatch.style.cssText = 'width:36px;height:36px;border-radius:6px;cursor:pointer;' +
        'border:2px solid ' + (color === selectedColor ? '#fff' : 'transparent') + ';' +
        'background:' + color + ';transition:border-color 0.15s;';
      swatch.addEventListener('click', () => {
        selectedColor = color;
        // Update borders on all swatches
        grid.querySelectorAll('div').forEach(s => {
          s.style.borderColor = 'transparent';
        });
        swatch.style.borderColor = '#fff';
        colorInput.value = color;
        preview.style.background = color;
      });
      grid.appendChild(swatch);
    });
    card.appendChild(grid);

    // Custom color row
    const customRow = document.createElement('div');
    customRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = selectedColor;
    colorInput.style.cssText = 'width:40px;height:32px;border:none;cursor:pointer;' +
      'background:transparent;padding:0;';
    colorInput.addEventListener('input', () => {
      selectedColor = colorInput.value;
      preview.style.background = selectedColor;
      grid.querySelectorAll('div').forEach(s => {
        s.style.borderColor = 'transparent';
      });
    });
    customRow.appendChild(colorInput);

    const customLabel = document.createElement('span');
    customLabel.textContent = 'Custom color';
    customLabel.style.cssText = 'flex:1;';
    customRow.appendChild(customLabel);

    const preview = document.createElement('div');
    preview.style.cssText = 'width:28px;height:28px;border-radius:4px;border:1px solid #666;' +
      'background:' + selectedColor + ';';
    customRow.appendChild(preview);
    card.appendChild(customRow);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:5px 14px;border:1px solid #555;border-radius:4px;' +
      'background:transparent;color:#ccc;cursor:pointer;font-size:13px;';
    cancelBtn.addEventListener('click', () => overlay.remove());
    btnRow.appendChild(cancelBtn);

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;' +
      'background:#4fc3f7;color:#111;font-weight:600;cursor:pointer;font-size:13px;';
    applyBtn.addEventListener('click', () => {
      group.color = selectedColor;
      this.renderGroupBoundary(group);
      this._syncGroupsToDiagram();
      this.saveState();
      overlay.remove();
    });
    btnRow.appendChild(applyBtn);
    card.appendChild(btnRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Click on overlay background dismisses
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // === GROUP PERSISTENCE ===

  /**
   * Sync the JS groups Map → diagram.groups array for JSON serialization.
   * Called after every group mutation so the diagram model stays up-to-date.
   */
  _syncGroupsToDiagram() {
    if (!this.editor.diagram) return;
    const arr = [];
    this.groups.forEach((group, gid) => {
      if (gid === 'default') return;
      const blockIds = group.blocks instanceof Set
        ? Array.from(group.blocks)
        : (group.blocks || []);
      arr.push({
        id: group.id,
        name: group.name || '',
        description: group.description || '',
        blockIds: blockIds,
        metadata: group.metadata || {},
        parentGroupId: group.parentGroupId || null,
        color: group.color || ''
      });
    });
    this.editor.diagram.groups = arr;
  }

  /**
   * Reconstruct the JS groups Map from diagram.groups array after load.
   * Call this from the bridge after importDiagram() succeeds.
   */
  _restoreGroupsFromDiagram() {
    // Clear existing non-default groups and their SVG boundaries
    this.groups.forEach((group, gid) => {
      if (gid !== 'default') {
        this.removeGroupBoundary(gid);
      }
    });
    // Keep default, wipe the rest
    const defaultGroup = this.groups.get('default');
    this.groups.clear();
    if (defaultGroup) this.groups.set('default', defaultGroup);

    const diagramGroups = (this.editor.diagram && this.editor.diagram.groups) || [];
    for (const g of diagramGroups) {
      const blockIds = g.blockIds || g.block_ids || [];
      const group = {
        id: g.id,
        name: g.name || '',
        description: g.description || '',
        blocks: new Set(blockIds),
        color: g.color || this.generateGroupColor(),
        visible: true,
        metadata: g.metadata || {},
        parentGroupId: g.parentGroupId || g.parent_group_id || null,
        bounds: null
      };
      // Compute bounds from current block positions
      if (blockIds.length > 0) {
        group.bounds = this.calculateGroupBounds(blockIds);
      }
      this.groups.set(g.id, group);
    }
    // Render all group boundaries
    this.groups.forEach((group, gid) => {
      if (gid !== 'default' && group.bounds) {
        this.renderGroupBoundary(group);
      }
    });
  }

  // === GROUP CONTEXT MENU ===

  /**
   * Show a right-click context menu on a group boundary.
   */
  _showGroupContextMenu(clientX, clientY, group) {
    // Remove any existing context menu
    const existing = document.getElementById('group-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'group-context-menu';
    Object.assign(menu.style, {
      position: 'fixed', left: clientX + 'px', top: clientY + 'px',
      background: '#2d2d30', border: '1px solid #3e3e42', borderRadius: '4px',
      padding: '4px 0', zIndex: '10000', minWidth: '180px',
      boxShadow: '0 4px 12px rgba(0,0,0,.4)', fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px', color: '#ccc'
    });

    const addItem = (label, handler) => {
      const item = document.createElement('div');
      item.textContent = label;
      Object.assign(item.style, {
        padding: '6px 16px', cursor: 'pointer', whiteSpace: 'nowrap'
      });
      item.addEventListener('mouseenter', () => { item.style.background = '#094771'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
      item.addEventListener('click', () => { menu.remove(); handler(); });
      menu.appendChild(item);
    };

    const addSep = () => {
      const sep = document.createElement('div');
      sep.style.borderTop = '1px solid #444';
      sep.style.margin = '4px 0';
      menu.appendChild(sep);
    };

    addItem('✏️ Properties…', () => this._showGroupPropertiesDialog(group));
    addItem('🔤 Rename…', () => {
      const newName = prompt('Rename group:', group.name || '');
      if (newName !== null && newName.trim()) {
        group.name = newName.trim();
        this.renderGroupBoundary(group);
        this._syncGroupsToDiagram();
        this.saveState();
      }
    });

    addSep();

    // Set as child of… (nesting)
    const otherGroups = this.getGroupList().filter(g => g.id !== group.id);
    if (otherGroups.length > 0) {
      addItem('📂 Set Parent Group…', () => {
        const options = otherGroups.map(g => g.name).join(', ');
        const choice = prompt(
          `Set parent group for "${group.name}".\nAvailable: ${options}\n\nEnter parent group name (or leave empty to clear):`,
          group.parentGroupId ? (this.groups.get(group.parentGroupId)?.name || '') : ''
        );
        if (choice === null) return;
        if (choice.trim() === '') {
          group.parentGroupId = null;
        } else {
          const parent = otherGroups.find(g => g.name === choice.trim());
          if (parent) {
            // Prevent circular: parent can't be self or descendant of self
            let pid = parent.id;
            const chain = new Set();
            let circular = false;
            while (pid) {
              if (pid === group.id) { circular = true; break; }
              if (chain.has(pid)) break;
              chain.add(pid);
              const p = this.groups.get(pid);
              pid = p ? p.parentGroupId : null;
            }
            if (circular) {
              alert('Cannot set parent: would create a circular reference.');
              return;
            }
            group.parentGroupId = parent.id;
          } else {
            alert('Group not found: ' + choice.trim());
            return;
          }
        }
        this.renderGroupBoundary(group);
        this._syncGroupsToDiagram();
        this.saveState();
      });
    }

    addSep();

    addItem('🎨 Change Color…', () => {
      menu.remove();
      this._showGroupColorPicker(group);
    });

    addItem('🗑️ Ungroup', () => this.ungroupBlocks(group.id));

    // Dismiss on outside click
    const dismiss = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('mousedown', dismiss, true);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', dismiss, true), 0);

    document.body.appendChild(menu);
  }

  // === GROUP PROPERTIES DIALOG ===

  /**
   * Show a modal dialog for editing all group properties:
   * name, description, color, parentGroupId, metadata key/value pairs.
   */
  _showGroupPropertiesDialog(group) {
    // Remove any existing dialog
    const existing = document.getElementById('group-props-dialog-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'group-props-dialog-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '10001', fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#ccc'
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      background: '#1e1e1e', border: '1px solid #3e3e42', borderRadius: '8px',
      padding: '20px', width: '380px', maxHeight: '90vh', overflowY: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,.6)'
    });

    const h2 = document.createElement('h3');
    h2.textContent = 'Group Properties';
    h2.style.margin = '0 0 14px 0'; h2.style.color = '#e0e0e0';
    dialog.appendChild(h2);

    const inputStyle = 'background:#2d2d30;border:1px solid #3e3e42;border-radius:4px;color:#ccc;padding:6px 8px;width:100%;box-sizing:border-box;font-size:13px;';

    const addField = (labelText, value, type = 'text') => {
      const label = document.createElement('label');
      label.textContent = labelText;
      label.style.display = 'block';
      label.style.marginBottom = '2px';
      label.style.marginTop = '10px';
      label.style.color = '#999';
      dialog.appendChild(label);

      if (type === 'textarea') {
        const ta = document.createElement('textarea');
        ta.style.cssText = inputStyle + 'resize:vertical;min-height:50px;';
        ta.value = value || '';
        dialog.appendChild(ta);
        return ta;
      }
      const inp = document.createElement('input');
      inp.type = type;
      inp.style.cssText = inputStyle;
      inp.value = value || '';
      dialog.appendChild(inp);
      return inp;
    };

    const nameInput = addField('Name', group.name);
    const descInput = addField('Description', group.description, 'textarea');
    const colorInput = addField('Color', group.color, 'color');

    // Parent group selector
    const parentLabel = document.createElement('label');
    parentLabel.textContent = 'Parent Group';
    parentLabel.style.display = 'block';
    parentLabel.style.marginBottom = '2px';
    parentLabel.style.marginTop = '10px';
    parentLabel.style.color = '#999';
    dialog.appendChild(parentLabel);

    const parentSelect = document.createElement('select');
    parentSelect.style.cssText = inputStyle;
    const noneOpt = document.createElement('option');
    noneOpt.value = ''; noneOpt.textContent = '(none)';
    parentSelect.appendChild(noneOpt);
    this.groups.forEach((g, gid) => {
      if (gid === 'default' || gid === group.id) return;
      const opt = document.createElement('option');
      opt.value = gid;
      opt.textContent = g.name || gid;
      if (gid === group.parentGroupId) opt.selected = true;
      parentSelect.appendChild(opt);
    });
    dialog.appendChild(parentSelect);

    // Metadata key/value editor
    const metaHeader = document.createElement('label');
    metaHeader.textContent = 'Metadata';
    metaHeader.style.display = 'block';
    metaHeader.style.marginBottom = '4px';
    metaHeader.style.marginTop = '14px';
    metaHeader.style.color = '#999';
    dialog.appendChild(metaHeader);

    const metaContainer = document.createElement('div');
    metaContainer.style.cssText = 'margin-bottom:8px;';
    dialog.appendChild(metaContainer);

    const metaPairs = Object.entries(group.metadata || {}).map(([k, v]) => ({ key: k, value: String(v) }));
    if (metaPairs.length === 0) metaPairs.push({ key: '', value: '' });

    const renderMetaRows = () => {
      metaContainer.innerHTML = '';
      metaPairs.forEach((pair, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '4px';
        row.style.marginBottom = '4px';

        const ki = document.createElement('input');
        ki.placeholder = 'key';
        ki.value = pair.key;
        ki.style.cssText = inputStyle + 'width:40%;';
        ki.addEventListener('input', () => { pair.key = ki.value; });

        const vi = document.createElement('input');
        vi.placeholder = 'value';
        vi.value = pair.value;
        vi.style.cssText = inputStyle + 'width:50%;';
        vi.addEventListener('input', () => { pair.value = vi.value; });

        const delBtn = document.createElement('button');
        delBtn.textContent = '×'; delBtn.title = 'Remove';
        delBtn.style.cssText = 'background:#3e3e42;border:none;color:#ccc;cursor:pointer;border-radius:4px;padding:4px 8px;font-size:14px;';
        delBtn.addEventListener('click', () => { metaPairs.splice(idx, 1); if (metaPairs.length === 0) metaPairs.push({ key: '', value: '' }); renderMetaRows(); });

        row.appendChild(ki); row.appendChild(vi); row.appendChild(delBtn);
        metaContainer.appendChild(row);
      });
    };
    renderMetaRows();

    const addMetaBtn = document.createElement('button');
    addMetaBtn.textContent = '+ Add Metadata';
    addMetaBtn.style.cssText = 'background:#094771;border:none;color:#ccc;cursor:pointer;border-radius:4px;padding:4px 10px;font-size:12px;margin-bottom:14px;';
    addMetaBtn.addEventListener('click', () => { metaPairs.push({ key: '', value: '' }); renderMetaRows(); });
    dialog.appendChild(addMetaBtn);

    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:14px;';
    const btnStyle = 'border:none;cursor:pointer;border-radius:4px;padding:6px 16px;font-size:13px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = btnStyle + 'background:#3e3e42;color:#ccc;';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = btnStyle + 'background:#0e639c;color:#fff;';
    saveBtn.addEventListener('click', () => {
      group.name = nameInput.value.trim() || group.name;
      group.description = descInput.value.trim();
      const newColor = colorInput.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(newColor)) group.color = newColor;

      // Parent group (with circular check)
      const newParentId = parentSelect.value || null;
      if (newParentId) {
        let pid = newParentId;
        const chain = new Set();
        let circular = false;
        while (pid) {
          if (pid === group.id) { circular = true; break; }
          if (chain.has(pid)) break;
          chain.add(pid);
          const p = this.groups.get(pid);
          pid = p ? p.parentGroupId : null;
        }
        if (circular) {
          alert('Cannot set parent: would create a circular reference.');
          return;
        }
      }
      group.parentGroupId = newParentId;

      // Metadata
      const newMeta = {};
      for (const pair of metaPairs) {
        const k = pair.key.trim();
        if (k) newMeta[k] = pair.value;
      }
      group.metadata = newMeta;

      this.renderGroupBoundary(group);
      this._syncGroupsToDiagram();
      this.saveState();
      overlay.remove();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    dialog.appendChild(btnRow);

    overlay.appendChild(dialog);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
    nameInput.focus();
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