/**
 * CORE DIAGRAM EDITOR MODULE
 * 
 * Core diagram editing functionality including:
 * - Basic diagram operations (create, delete, modify blocks)
 * - Canvas management (pan, zoom, viewBox)
 * - Grid system and snapping
 * - Basic selection and dragging
 * 
 * Author: GitHub Copilot
 * Created: September 26, 2025
 * Module: Core Editor
 */

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

class DiagramEditorCore {
  constructor() {
    this.diagram = this.createEmptyDiagram();
    this.selectedBlock = null;
    this.isDragging = false;
    this.isPanning = false;
    this.dragStart = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };
    this.viewBox = { x: 0, y: 0, width: 1000, height: 1000 };
    this.viewBoxStart = { x: 0, y: 0 };
    this.scale = 1;
    
    // Grid configuration
    this.gridSize = 20;
    this.snapToGridEnabled = true;
    
    // Performance optimization
    this.lastMouseMoveTime = 0;
    this.mouseMoveThreshold = 16; // ~60fps throttling

    // Delta serialization — snapshot of the last-saved diagram state so
    // we can compute minimal diffs for incremental bridge updates.
    this._lastSavedSnapshot = null;
  }

  createEmptyDiagram() {
    return {
      schemaVersion: DiagramEditorCore.SCHEMA_VERSION,
      blocks: [],
      connections: [],
      groups: [],
      namedStubs: [],
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: "2.0"
      }
    };
  }

  // Core diagram operations
  addBlock(blockData) {
    // Guard: reject null/undefined input
    if (!blockData || typeof blockData !== 'object') {
      logger.warn('addBlock: invalid blockData', blockData);
      return null;
    }

    // Default attribute fields — empty slots for common engineering metadata.
    // Users can fill these in via the property editor or side panel.
    const defaultAttributes = {
      'Manufacturer': '',
      'Part Number': '',
      'Datasheet URL': '',
      'Rating / Specification': '',
      'Cost': '',
      'Lead Time': '',
      'Notes': ''
    };

    // Strip protected keys from blockData to prevent overwriting generated ID
    const { id: _discardedId, attributes: callerAttrs, ...safeBlockData } = blockData;

    const block = {
      id: this.generateId(),
      name: safeBlockData.name || 'New Block',
      type: safeBlockData.type || 'Generic',
      x: safeBlockData.x ?? 100,
      y: safeBlockData.y ?? 100,
      width: safeBlockData.width ?? 160,
      height: safeBlockData.height ?? 100,
      rotation: safeBlockData.rotation ?? 0,
      status: safeBlockData.status || 'Placeholder',
      attributes: { ...defaultAttributes, ...(callerAttrs || {}) },
      ...safeBlockData
    };
    // Re-merge attributes so defaults are always present even if
    // safeBlockData spread overwrote them with caller-supplied values
    block.attributes = { ...defaultAttributes, ...(callerAttrs || {}) };
    
    this.diagram.blocks.push(block);
    this.diagram.metadata.modified = new Date().toISOString();
    this._markDirty();
    return block;
  }

  removeBlock(blockId) {
    // Bug #231: Clear selection if the removed block is currently selected
    if (this.selectedBlock === blockId) {
      this.selectedBlock = null;
    }

    // Only mark dirty if the block actually exists
    const originalLength = this.diagram.blocks.length;

    // Remove block
    this.diagram.blocks = this.diagram.blocks.filter(block => block.id !== blockId);

    if (this.diagram.blocks.length === originalLength) {
      // Block not found — nothing to do
      return;
    }
    
    // Remove connected connections
    this.diagram.connections = this.diagram.connections.filter(
      conn => conn.fromBlock !== blockId && conn.toBlock !== blockId
    );

    // Remove named stubs attached to this block
    if (this.diagram.namedStubs) {
      this.diagram.namedStubs = this.diagram.namedStubs.filter(
        s => s.blockId !== blockId
      );
    }

    // Bug #232: Remove block from any groups it belongs to
    if (this.diagram.groups) {
      for (const group of this.diagram.groups) {
        if (group.blockIds) {
          group.blockIds = group.blockIds.filter(id => id !== blockId);
        }
      }
    }
    
    this.diagram.metadata.modified = new Date().toISOString();
    this._markDirty();
  }

  addConnection(fromBlockId, toBlockId, connectionType = 'auto', arrowDirection = 'forward', options = {}) {
    // Prevent connections with missing block IDs
    if (!fromBlockId || !toBlockId) return null;

    // Prevent self-connections
    if (fromBlockId === toBlockId) return null;

    // Verify referenced blocks (or groups) actually exist
    const blockExists = id => this.diagram.blocks.some(b => b.id === id);
    const groupExists = id => (this.diagram.groups || []).some(g => g.id === id);
    if (!blockExists(fromBlockId) && !groupExists(fromBlockId)) return null;
    if (!blockExists(toBlockId) && !groupExists(toBlockId)) return null;

    // Prevent duplicate connections of the same type between the same blocks.
    // Different types (e.g. power AND data) between the same pair are allowed.
    const exists = this.diagram.connections.some(
      c => c.fromBlock === fromBlockId && c.toBlock === toBlockId
           && c.type === connectionType
    );
    if (exists) return null;

    const connection = {
      id: this.generateEntityId('conn'),
      fromBlock: fromBlockId,
      toBlock: toBlockId,
      type: connectionType,
      arrowDirection: arrowDirection,
      waypoints: []
    };

    // Same-level stub connection: renders as short stubs on each block
    // edge rather than a full line spanning the canvas.
    if (options.renderAsStub) {
      connection.renderAsStub = true;
    }

    this.diagram.connections.push(connection);
    this.diagram.metadata.modified = new Date().toISOString();
    this._markDirty();
    return connection;
  }

  removeConnection(connectionId) {
    this.diagram.connections = this.diagram.connections.filter(c => c.id !== connectionId);
    this.diagram.metadata.modified = new Date().toISOString();
    this._markDirty();
  }

  // ----- Named stubs (net labels) -----

  /**
   * Add a named stub (net label) to a block port.
   * Blocks sharing the same netName are implicitly connected.
   *
   * @param {string} netName - Net/label name (e.g. "5V", "CLK").
   * @param {string} blockId - Block to attach the stub to.
   * @param {string} [portSide='output'] - Side of the block.
   * @param {string} [type='auto'] - Connection type for styling.
   * @param {string} [direction='forward'] - Arrow direction.
   * @returns {object|null} The created stub, or null on failure.
   */
  addNamedStub(netName, blockId, portSide = 'output', type = 'auto', direction = 'forward') {
    if (!netName || !blockId) return null;

    // Prevent duplicate: same block + same net + same side
    if (!this.diagram.namedStubs) this.diagram.namedStubs = [];
    const dup = this.diagram.namedStubs.some(
      s => s.netName === netName && s.blockId === blockId && s.portSide === portSide
    );
    if (dup) return null;

    const stub = {
      id: this.generateEntityId('stub'),
      netName: netName,
      blockId: blockId,
      portSide: portSide,
      type: type,
      direction: direction
    };
    this.diagram.namedStubs.push(stub);
    this.diagram.metadata.modified = new Date().toISOString();
    this._markDirty();
    return stub;
  }

  /**
   * Remove a named stub by its ID.
   * @param {string} stubId - ID of the stub to remove.
   */
  removeNamedStub(stubId) {
    if (!this.diagram.namedStubs) return;
    this.diagram.namedStubs = this.diagram.namedStubs.filter(s => s.id !== stubId);
    this.diagram.metadata.modified = new Date().toISOString();
    this._markDirty();
  }

  /**
   * Get a list of unique net names currently in the diagram.
   * @returns {string[]} Array of distinct net names.
   */
  getNetNames() {
    if (!this.diagram.namedStubs) return [];
    return [...new Set(this.diagram.namedStubs.map(s => s.netName))];
  }

  /**
   * Get all named stubs for a given net name.
   * @param {string} netName - The net name to look up.
   * @returns {object[]} Array of stub objects.
   */
  getStubsByNet(netName) {
    if (!this.diagram.namedStubs) return [];
    return this.diagram.namedStubs.filter(s => s.netName === netName);
  }

  updateConnection(connectionId, updates) {
    const connection = this.diagram.connections.find(c => c.id === connectionId);
    if (connection) {
      // Strip protected keys to prevent identity corruption
      const { id: _id, fromBlock: _fb, toBlock: _tb, ...safeUpdates } = updates;
      Object.assign(connection, safeUpdates);
      this.diagram.metadata.modified = new Date().toISOString();
      this._markDirty();
      return connection;
    }
    return null;
  }

  updateBlock(blockId, updates) {
    const block = this.diagram.blocks.find(b => b.id === blockId);
    if (block) {
      // Strip protected key to prevent identity corruption
      const { id: _id, ...safeUpdates } = updates;
      Object.assign(block, safeUpdates);
      this.diagram.metadata.modified = new Date().toISOString();
      this._markDirty();
      return block;
    }
    return null;
  }

  /**
   * Rotate a block by 90° clockwise, cycling through 0 → 90 → 180 → 270 → 0.
   * @param {string} blockId  Block to rotate.
   * @returns {object|null}   Updated block, or null if not found.
   */
  rotateBlock(blockId) {
    const block = this.diagram.blocks.find(b => b.id === blockId);
    if (!block) return null;
    const current = block.rotation || 0;
    block.rotation = (current + 90) % 360;
    this.diagram.metadata.modified = new Date().toISOString();
    this._markDirty();
    return block;
  }

  // Canvas management
  setViewBox(x, y, width, height) {
    this.viewBox = { x, y, width, height };
    const svg = document.getElementById('svg-canvas');
    if (svg) {
      svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }
  }

  /**
   * Smoothly animate the viewBox from its current value to a target.
   * @param {number} tx  Target viewBox x.
   * @param {number} ty  Target viewBox y.
   * @param {number} tw  Target viewBox width.
   * @param {number} th  Target viewBox height.
   * @param {number} [duration=280]  Animation duration in ms.
   */
  animateViewBox(tx, ty, tw, th, duration = 280) {
    // Cancel any in-flight animation
    if (this._viewBoxAnimId) {
      cancelAnimationFrame(this._viewBoxAnimId);
      this._viewBoxAnimId = null;
    }

    const startVB = { ...this.viewBox };
    const startTime = performance.now();

    const step = (now) => {
      let t = Math.min((now - startTime) / duration, 1);
      // Ease-out cubic
      t = 1 - Math.pow(1 - t, 3);

      const cx = startVB.x      + (tx - startVB.x)      * t;
      const cy = startVB.y      + (ty - startVB.y)      * t;
      const cw = startVB.width  + (tw - startVB.width)  * t;
      const ch = startVB.height + (th - startVB.height) * t;

      this.setViewBox(cx, cy, cw, ch);

      if (t < 1) {
        this._viewBoxAnimId = requestAnimationFrame(step);
      } else {
        this._viewBoxAnimId = null;
      }
    };

    this._viewBoxAnimId = requestAnimationFrame(step);
  }

  panBy(deltaX, deltaY) {
    this.viewBox.x -= deltaX;
    this.viewBox.y -= deltaY;
    this.setViewBox(this.viewBox.x, this.viewBox.y, this.viewBox.width, this.viewBox.height);
  }

  zoomAt(factor, centerX, centerY) {
    const newWidth = this.viewBox.width * factor;
    const newHeight = this.viewBox.height * factor;

    // Enforce min/max zoom limits (viewBox width controls zoom level)
    const MIN_VB_WIDTH = 200;   // max zoom-in
    const MAX_VB_WIDTH = 10000; // max zoom-out
    if (newWidth < MIN_VB_WIDTH || newWidth > MAX_VB_WIDTH) return;
    
    // Zoom towards the center point
    const deltaX = (newWidth - this.viewBox.width) * ((centerX - this.viewBox.x) / this.viewBox.width);
    const deltaY = (newHeight - this.viewBox.height) * ((centerY - this.viewBox.y) / this.viewBox.height);
    
    this.viewBox.x -= deltaX;
    this.viewBox.y -= deltaY;
    this.viewBox.width = newWidth;
    this.viewBox.height = newHeight;
    this.scale = 1000 / this.viewBox.width; // Base scale reference
    
    this.setViewBox(this.viewBox.x, this.viewBox.y, this.viewBox.width, this.viewBox.height);
  }

  /**
   * Smooth focal-point zoom driven by wheel events.  Accumulates scroll
   * deltas and animates the viewBox via requestAnimationFrame so rapid
   * wheel ticks merge into a single fluid motion.
   *
   * @param {number} delta    Wheel deltaY (positive = zoom out).
   * @param {number} centerX  SVG x-coordinate under the cursor.
   * @param {number} centerY  SVG y-coordinate under the cursor.
   */
  smoothZoomAt(delta, centerX, centerY) {
    // Accumulate scroll impulse
    if (!this._zoomAcc) this._zoomAcc = 0;
    this._zoomAcc += delta;

    // Store the most recent cursor focus point
    this._zoomCenter = { x: centerX, y: centerY };

    // If an animation frame is already queued, skip — it will pick up
    // the accumulated delta.
    if (this._zoomRaf) return;

    const start = { ...this.viewBox };

    this._zoomRaf = requestAnimationFrame(() => {
      // Compute aggregate zoom factor from accumulated scroll
      const factor = Math.pow(1.0015, this._zoomAcc);
      this._zoomAcc = 0;
      this._zoomRaf = null;

      // Compute target viewBox
      const cx = this._zoomCenter.x;
      const cy = this._zoomCenter.y;

      let tw = start.width * factor;
      let th = start.height * factor;

      // Enforce limits
      const MIN_VB_WIDTH = 200;
      const MAX_VB_WIDTH = 10000;
      if (tw < MIN_VB_WIDTH) { tw = MIN_VB_WIDTH; th = tw * (start.height / start.width); }
      if (tw > MAX_VB_WIDTH) { tw = MAX_VB_WIDTH; th = tw * (start.height / start.width); }

      const dx = (tw - start.width) * ((cx - start.x) / start.width);
      const dy = (th - start.height) * ((cy - start.y) / start.height);

      this.viewBox.x = start.x - dx;
      this.viewBox.y = start.y - dy;
      this.viewBox.width = tw;
      this.viewBox.height = th;
      this.scale = 1000 / tw;

      this.setViewBox(this.viewBox.x, this.viewBox.y, this.viewBox.width, this.viewBox.height);
    });
  }

  // Grid and snapping
  snapToGrid(x, y) {
    if (!this.snapToGridEnabled) return { x, y };
    
    const snappedX = Math.round(x / this.gridSize) * this.gridSize;
    const snappedY = Math.round(y / this.gridSize) * this.gridSize;
    return { x: snappedX, y: snappedY };
  }

  /**
   * Compute smart alignment snap guides for a block being dragged.
   * Checks edges and centers against all other blocks.
   *
   * @param {string} blockId - ID of the block being dragged.
   * @param {number} proposedX - Proposed x after grid snap.
   * @param {number} proposedY - Proposed y after grid snap.
   * @param {Set<string>} [excludeIds] - IDs to exclude (e.g. multi-selection).
   * @param {number} [tolerance=5] - Pixel tolerance for alignment.
   * @returns {{ x: number, y: number, guides: Array<{axis:'h'|'v', pos:number, from:number, to:number}> }}
   */
  snapToAlignmentGuides(blockId, proposedX, proposedY, excludeIds, tolerance = 5) {
    const block = this.diagram.blocks.find(b => b.id === blockId);
    if (!block) return { x: proposedX, y: proposedY, guides: [] };

    const bw = block.width || 120;
    const bh = block.height || 80;

    // Edges and center of the dragged block at proposed position
    const dragEdges = {
      left: proposedX,
      right: proposedX + bw,
      cx: proposedX + bw / 2,
      top: proposedY,
      bottom: proposedY + bh,
      cy: proposedY + bh / 2,
    };

    const guides = [];
    let snapX = proposedX;
    let snapY = proposedY;
    let bestDx = tolerance + 1;
    let bestDy = tolerance + 1;

    const skip = new Set(excludeIds);
    skip.add(blockId);

    for (const other of this.diagram.blocks) {
      if (skip.has(other.id)) continue;
      const ow = other.width || 120;
      const oh = other.height || 80;
      const otherEdges = {
        left: other.x,
        right: other.x + ow,
        cx: other.x + ow / 2,
        top: other.y,
        bottom: other.y + oh,
        cy: other.y + oh / 2,
      };

      // Vertical guide checks (x-axis alignment)
      const xPairs = [
        [dragEdges.left, otherEdges.left],
        [dragEdges.left, otherEdges.right],
        [dragEdges.left, otherEdges.cx],
        [dragEdges.right, otherEdges.left],
        [dragEdges.right, otherEdges.right],
        [dragEdges.right, otherEdges.cx],
        [dragEdges.cx, otherEdges.left],
        [dragEdges.cx, otherEdges.right],
        [dragEdges.cx, otherEdges.cx],
      ];
      for (const [dragVal, otherVal] of xPairs) {
        const d = Math.abs(dragVal - otherVal);
        if (d < tolerance && d < bestDx) {
          bestDx = d;
          snapX = proposedX + (otherVal - dragVal);
        }
      }

      // Horizontal guide checks (y-axis alignment)
      const yPairs = [
        [dragEdges.top, otherEdges.top],
        [dragEdges.top, otherEdges.bottom],
        [dragEdges.top, otherEdges.cy],
        [dragEdges.bottom, otherEdges.top],
        [dragEdges.bottom, otherEdges.bottom],
        [dragEdges.bottom, otherEdges.cy],
        [dragEdges.cy, otherEdges.top],
        [dragEdges.cy, otherEdges.bottom],
        [dragEdges.cy, otherEdges.cy],
      ];
      for (const [dragVal, otherVal] of yPairs) {
        const d = Math.abs(dragVal - otherVal);
        if (d < tolerance && d < bestDy) {
          bestDy = d;
          snapY = proposedY + (otherVal - dragVal);
        }
      }
    }

    // Build guide lines for all matches at snapped position
    const snappedEdges = {
      left: snapX, right: snapX + bw, cx: snapX + bw / 2,
      top: snapY, bottom: snapY + bh, cy: snapY + bh / 2,
    };
    for (const other of this.diagram.blocks) {
      if (skip.has(other.id)) continue;
      const ow = other.width || 120;
      const oh = other.height || 80;
      const oEdges = {
        left: other.x, right: other.x + ow, cx: other.x + ow / 2,
        top: other.y, bottom: other.y + oh, cy: other.y + oh / 2,
      };

      // Vertical guides (x matches) — tag center vs edge
      for (const xVal of [oEdges.left, oEdges.right, oEdges.cx]) {
        for (const sxVal of [snappedEdges.left, snappedEdges.right, snappedEdges.cx]) {
          if (Math.abs(sxVal - xVal) < 1) {
            const minY = Math.min(snapY, other.y);
            const maxY = Math.max(snapY + bh, other.y + oh);
            const isCenterAlign = (sxVal === snappedEdges.cx && xVal === oEdges.cx);
            guides.push({ axis: 'v', pos: xVal, from: minY - 10, to: maxY + 10,
                          type: isCenterAlign ? 'center' : 'edge' });
          }
        }
      }
      // Horizontal guides (y matches) — tag center vs edge
      for (const yVal of [oEdges.top, oEdges.bottom, oEdges.cy]) {
        for (const syVal of [snappedEdges.top, snappedEdges.bottom, snappedEdges.cy]) {
          if (Math.abs(syVal - yVal) < 1) {
            const minX = Math.min(snapX, other.x);
            const maxX = Math.max(snapX + bw, other.x + ow);
            const isCenterAlign = (syVal === snappedEdges.cy && yVal === oEdges.cy);
            guides.push({ axis: 'h', pos: yVal, from: minX - 10, to: maxX + 10,
                          type: isCenterAlign ? 'center' : 'edge' });
          }
        }
      }
    }

    // ── Equal-spacing detection ────────────────────────────────────────
    // Look for 3+ blocks in a row (horizontally or vertically) with equal
    // gaps.  If the dragged block can slot in with matching spacing, add
    // spacing guides and optionally snap to that position.
    this._detectEqualSpacing(
      snapX, snapY, bw, bh, skip, tolerance, guides
    );

    return { x: snapX, y: snapY, guides };
  }

  /**
   * Detect equal spacing opportunities between blocks and emit spacing
   * guide objects.  Mutates the `guides` array in place.
   * @private
   */
  _detectEqualSpacing(snapX, snapY, bw, bh, skipIds, tolerance, guides) {
    const others = this.diagram.blocks.filter(b => !skipIds.has(b.id));
    if (others.length < 2) return; // need at least 2 neighbours

    const dragged = { x: snapX, y: snapY, w: bw, h: bh };

    // --- Horizontal row check (blocks sharing similar cy) ---
    const dragCY = snapY + bh / 2;
    const rowBlocks = others.filter(b => {
      const cy = b.y + (b.height || 80) / 2;
      return Math.abs(cy - dragCY) < (bh / 2 + (b.height || 80) / 2);
    });
    this._checkSpacingAxis(rowBlocks, dragged, 'x', guides, tolerance);

    // --- Vertical column check (blocks sharing similar cx) ---
    const dragCX = snapX + bw / 2;
    const colBlocks = others.filter(b => {
      const cx = b.x + (b.width || 120) / 2;
      return Math.abs(cx - dragCX) < (bw / 2 + (b.width || 120) / 2);
    });
    this._checkSpacingAxis(colBlocks, dragged, 'y', guides, tolerance);
  }

  /**
   * For a set of blocks roughly aligned on one axis, check if inserting
   * the dragged block would create equal spacing between consecutive pairs.
   * @private
   */
  _checkSpacingAxis(neighbours, dragged, axis, guides, tolerance) {
    if (neighbours.length < 2) return;

    const isX = axis === 'x';
    const posKey = isX ? 'x' : 'y';
    const sizeKey = isX ? 'w' : 'h';
    const blockSizeKey = isX ? 'width' : 'height';
    const defaultSize = isX ? 120 : 80;

    // Build sorted list of {start, end} ranges including the dragged block
    const ranges = neighbours.map(b => ({
      start: b[posKey],
      end:   b[posKey] + (b[blockSizeKey] || defaultSize),
      cy:    isX ? (b.y + (b.height || 80) / 2) : (b.x + (b.width || 120) / 2),
    }));
    ranges.push({
      start: dragged[posKey],
      end:   dragged[posKey] + dragged[sizeKey],
      cy:    isX ? (dragged.y + dragged.h / 2) : (dragged.x + dragged.w / 2),
    });
    ranges.sort((a, b) => a.start - b.start);

    // Compute gaps between consecutive blocks
    const gaps = [];
    for (let i = 0; i < ranges.length - 1; i++) {
      gaps.push(ranges[i + 1].start - ranges[i].end);
    }
    if (gaps.length < 2) return; // need at least 2 gaps

    // Check if all gaps are approximately equal
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avg < 5) return; // blocks overlap or nearly touching — skip
    const allEqual = gaps.every(g => Math.abs(g - avg) < tolerance);
    if (!allEqual) return;

    // Emit spacing guides between each consecutive pair
    for (let i = 0; i < ranges.length - 1; i++) {
      const gapStart = ranges[i].end;
      const gapEnd   = ranges[i + 1].start;
      const mid = (gapStart + gapEnd) / 2;

      if (isX) {
        // Vertical tick marks at gap boundaries and a label in between
        const minY = Math.min(...ranges.map(r => r.cy)) - 20;
        const maxY = Math.max(...ranges.map(r => r.cy)) + 20;
        guides.push({ axis: 'v', pos: gapStart, from: minY, to: maxY, type: 'spacing' });
        guides.push({ axis: 'v', pos: gapEnd,   from: minY, to: maxY, type: 'spacing' });
        guides.push({ axis: 'spacing-label', x: mid, y: minY - 6,
                       label: Math.round(avg) + 'px', type: 'spacing' });
      } else {
        const minX = Math.min(...ranges.map(r => r.cy)) - 20;
        const maxX = Math.max(...ranges.map(r => r.cy)) + 20;
        guides.push({ axis: 'h', pos: gapStart, from: minX, to: maxX, type: 'spacing' });
        guides.push({ axis: 'h', pos: gapEnd,   from: minX, to: maxX, type: 'spacing' });
        guides.push({ axis: 'spacing-label', x: minX - 6, y: mid,
                       label: Math.round(avg) + 'px', type: 'spacing' });
      }
    }
  }

  // Utility functions
  generateEntityId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return prefix + '_' + crypto.randomUUID();
    }
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
  }

  generateId() {
    return this.generateEntityId('block');
  }

  getBlockAt(x, y, tolerance = 0) {
    // x, y are already in diagram/viewBox coordinates (converted by caller)
    // Find block at coordinates (reverse order for top-most)
    // tolerance: extra margin in user units for lenient hit detection
    for (let i = this.diagram.blocks.length - 1; i >= 0; i--) {
      const block = this.diagram.blocks[i];
      if (x >= block.x - tolerance &&
          x <= block.x + (block.width || 120) + tolerance &&
          y >= block.y - tolerance &&
          y <= block.y + (block.height || 80) + tolerance) {
        return block;
      }
    }
    return null;
  }

  // Selection management
  selectBlock(blockId) {
    const previousBlock = this.selectedBlock;
    this.selectedBlock = blockId;

    // Only re-render the two affected blocks instead of the entire diagram.
    if (window.diagramRenderer) {
      if (previousBlock && previousBlock !== blockId) {
        const prev = this.diagram.blocks.find(b => b.id === previousBlock);
        if (prev) window.diagramRenderer.renderBlock(prev);
      }
      if (blockId) {
        const next = this.diagram.blocks.find(b => b.id === blockId);
        if (next) window.diagramRenderer.renderBlock(next);
      }
    }
  }

  clearSelection() {
    const previousBlock = this.selectedBlock;
    this.selectedBlock = null;

    if (previousBlock && window.diagramRenderer) {
      const prev = this.diagram.blocks.find(b => b.id === previousBlock);
      if (prev) window.diagramRenderer.renderBlock(prev);
    }
  }

  // Visual updates — full re-render, used by importDiagram only
  updateBlockVisuals() {
    if (window.diagramRenderer) {
      window.diagramRenderer.updateAllBlocks(this.diagram);
    }
  }

  // Data export/import
  exportDiagram() {
    // Ensure current schema version is always stamped
    this.diagram.schemaVersion = DiagramEditorCore.SCHEMA_VERSION;

    // Sanitize: strip connections with missing/empty source or target.
    // This guards against corrupt data that slipped through earlier versions.
    this.diagram.connections = this.diagram.connections.filter(
      c => c.fromBlock && c.toBlock
    );
    return JSON.stringify(this.diagram, null, 2);
  }

  // ---------------------------------------------------------------
  // Delta serialization helpers
  // ---------------------------------------------------------------

  /**
   * Take a snapshot of the current diagram as the "last-saved" baseline.
   * Call this after a successful full save or load so that future
   * calls to {@link getDelta} produce minimal diffs.
   */
  markSaved() {
    this._lastSavedSnapshot = typeof DeltaUtils !== 'undefined'
      ? DeltaUtils.deepClone(this.diagram)
      : JSON.parse(JSON.stringify(this.diagram));
    this._dirty = false;
  }

  /**
   * Mark the diagram as modified.  Called automatically by addBlock,
   * removeBlock, updateBlock, etc.
   */
  _markDirty() {
    this._dirty = true;
  }

  /**
   * Compute a JSON-Patch array describing changes since the last
   * {@link markSaved} call.  Returns ``null`` if DeltaUtils is not
   * loaded (graceful degradation) or if no snapshot exists yet.
   *
   * @returns {Array|null} Patch operations, or null if delta is unavailable.
   */
  getDelta() {
    if (typeof DeltaUtils === 'undefined' || !this._lastSavedSnapshot) {
      return null;
    }
    return DeltaUtils.computePatch(this._lastSavedSnapshot, this.diagram);
  }

  /**
   * Return ``true`` if the diagram has unsaved changes relative to
   * the last snapshot.
   */
  hasUnsavedChanges() {
    var delta = this.getDelta();
    if (delta !== null) {
      return delta.length > 0;
    }
    // Fallback when DeltaUtils is unavailable: use simple dirty flag +
    // check whether the diagram has any content (blocks/connections).
    if (this._dirty !== undefined) {
      return this._dirty;
    }
    // No snapshot and no dirty flag — assume unsaved if diagram has content
    return this.diagram.blocks.length > 0;
  }

  importDiagram(jsonData) {
    try {
      const importedDiagram = JSON.parse(jsonData);
      
      // Validate diagram structure
      if (!importedDiagram.blocks || !Array.isArray(importedDiagram.blocks)) {
        throw new Error('Invalid diagram format: missing blocks array');
      }

      // Validate connections is an array if present
      if (importedDiagram.connections && !Array.isArray(importedDiagram.connections)) {
        throw new Error('Invalid diagram format: connections must be an array');
      }

      // Ensure required fields have safe defaults
      if (!importedDiagram.connections) {
        importedDiagram.connections = [];
      }
      if (!importedDiagram.groups) {
        importedDiagram.groups = [];
      }
      if (!importedDiagram.namedStubs) {
        importedDiagram.namedStubs = [];
      }
      if (!importedDiagram.metadata) {
        importedDiagram.metadata = { created: new Date().toISOString() };
      }

      // Merge default attribute keys into imported blocks so property
      // editor always shows the standard engineering metadata slots.
      const defaultAttributes = {
        'Manufacturer': '', 'Part Number': '', 'Datasheet URL': '',
        'Rating / Specification': '', 'Cost': '', 'Lead Time': '', 'Notes': ''
      };
      for (const block of importedDiagram.blocks) {
        block.attributes = { ...defaultAttributes, ...(block.attributes || {}) };
      }

      // Apply schema migrations (0.9 → 1.0, etc.)
      DiagramEditorCore.migrateDiagram(importedDiagram);

      // Sanitize connections: remove those with missing/empty source/target IDs,
      // or references to blocks/groups not present in the imported diagram.
      const blockIds = new Set(importedDiagram.blocks.map(b => b.id));
      const groupIds = new Set((importedDiagram.groups || []).map(g => g.id));
      importedDiagram.connections = importedDiagram.connections.filter(c => {
        return c.fromBlock && c.toBlock &&
               (blockIds.has(c.fromBlock) || groupIds.has(c.fromBlock)) &&
               (blockIds.has(c.toBlock) || groupIds.has(c.toBlock));
      });
      
      this.diagram = importedDiagram;
      this.diagram.metadata.modified = new Date().toISOString();
      this.clearSelection();
      this.updateBlockVisuals();
      this.markSaved();  // Snapshot after import for delta tracking
      
      return true;
    } catch (error) {
      logger.error('Failed to import diagram:', error);
      return false;
    }
  }

  // ---------------------------------------------------------------
  // Schema versioning & migration
  // ---------------------------------------------------------------

  /**
   * Migrate a diagram object from its current schemaVersion to the
   * latest version.  Migrations are applied sequentially.
   *
   * Missing schemaVersion is treated as "0.9" (pre-versioning).
   *
   * @param {object} diagram - Parsed diagram object (mutated in place).
   * @returns {object} The migrated diagram.
   */
  static migrateDiagram(diagram) {
    var version = diagram.schemaVersion || '0.9';

    // 0.9 → 1.0: add requirements array, schemaVersion field
    if (version === '0.9') {
      (diagram.blocks || []).forEach(function (block) {
        if (!block.requirements) {
          block.requirements = [];
        }
      });
      diagram.schemaVersion = '1.0';
      version = '1.0';
      logger.info('Migrated diagram from 0.9 → 1.0');
    }

    // Future migrations would chain here:
    // if (version === '1.0') { ... version = '1.1'; }

    return diagram;
  }
}

/** Current schema version written to all new / saved diagrams. */
DiagramEditorCore.SCHEMA_VERSION = '1.0';

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagramEditorCore;
} else {
  window.DiagramEditorCore = DiagramEditorCore;
}