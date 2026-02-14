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
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: "2.0"
      }
    };
  }

  // Core diagram operations
  addBlock(blockData) {
    const block = {
      id: this.generateId(),
      name: blockData.name || 'New Block',
      type: blockData.type || 'Generic',
      x: blockData.x || 100,
      y: blockData.y || 100,
      width: blockData.width || 120,
      height: blockData.height || 80,
      status: blockData.status || 'Placeholder',
      ...blockData
    };
    
    this.diagram.blocks.push(block);
    this.diagram.metadata.modified = new Date().toISOString();
    return block;
  }

  removeBlock(blockId) {
    // Remove block
    this.diagram.blocks = this.diagram.blocks.filter(block => block.id !== blockId);
    
    // Remove connected connections
    this.diagram.connections = this.diagram.connections.filter(
      conn => conn.fromBlock !== blockId && conn.toBlock !== blockId
    );
    
    this.diagram.metadata.modified = new Date().toISOString();
  }

  addConnection(fromBlockId, toBlockId, connectionType = 'auto', arrowDirection = 'forward') {
    // Prevent connections with missing block IDs
    if (!fromBlockId || !toBlockId) return null;

    // Prevent self-connections
    if (fromBlockId === toBlockId) return null;

    // Prevent duplicate connections
    const exists = this.diagram.connections.some(
      c => c.fromBlock === fromBlockId && c.toBlock === toBlockId
    );
    if (exists) return null;

    const connection = {
      id: 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      fromBlock: fromBlockId,
      toBlock: toBlockId,
      type: connectionType,
      arrowDirection: arrowDirection
    };

    this.diagram.connections.push(connection);
    this.diagram.metadata.modified = new Date().toISOString();
    return connection;
  }

  removeConnection(connectionId) {
    this.diagram.connections = this.diagram.connections.filter(c => c.id !== connectionId);
    this.diagram.metadata.modified = new Date().toISOString();
  }

  updateBlock(blockId, updates) {
    const block = this.diagram.blocks.find(b => b.id === blockId);
    if (block) {
      Object.assign(block, updates);
      this.diagram.metadata.modified = new Date().toISOString();
      return block;
    }
    return null;
  }

  // Canvas management
  setViewBox(x, y, width, height) {
    this.viewBox = { x, y, width, height };
    const svg = document.getElementById('svg-canvas');
    if (svg) {
      svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }
  }

  panBy(deltaX, deltaY) {
    this.viewBox.x -= deltaX;
    this.viewBox.y -= deltaY;
    this.setViewBox(this.viewBox.x, this.viewBox.y, this.viewBox.width, this.viewBox.height);
  }

  zoomAt(factor, centerX, centerY) {
    const newWidth = this.viewBox.width * factor;
    const newHeight = this.viewBox.height * factor;
    
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

    const skip = excludeIds || new Set();
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

      // Vertical guides (x matches)
      for (const xVal of [oEdges.left, oEdges.right, oEdges.cx]) {
        for (const sxVal of [snappedEdges.left, snappedEdges.right, snappedEdges.cx]) {
          if (Math.abs(sxVal - xVal) < 1) {
            const minY = Math.min(snapY, other.y);
            const maxY = Math.max(snapY + bh, other.y + oh);
            guides.push({ axis: 'v', pos: xVal, from: minY - 10, to: maxY + 10 });
          }
        }
      }
      // Horizontal guides (y matches)
      for (const yVal of [oEdges.top, oEdges.bottom, oEdges.cy]) {
        for (const syVal of [snappedEdges.top, snappedEdges.bottom, snappedEdges.cy]) {
          if (Math.abs(syVal - yVal) < 1) {
            const minX = Math.min(snapX, other.x);
            const maxX = Math.max(snapX + bw, other.x + ow);
            guides.push({ axis: 'h', pos: yVal, from: minX - 10, to: maxX + 10 });
          }
        }
      }
    }

    return { x: snapX, y: snapY, guides };
  }

  // Utility functions
  generateId() {
    return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    return delta !== null && delta.length > 0;
  }

  importDiagram(jsonData) {
    try {
      const importedDiagram = JSON.parse(jsonData);
      
      // Validate diagram structure
      if (!importedDiagram.blocks || !Array.isArray(importedDiagram.blocks)) {
        throw new Error('Invalid diagram format: missing blocks array');
      }

      // Ensure required fields have safe defaults
      if (!importedDiagram.connections) {
        importedDiagram.connections = [];
      }
      if (!importedDiagram.metadata) {
        importedDiagram.metadata = { created: new Date().toISOString() };
      }

      // Apply schema migrations (0.9 → 1.0, etc.)
      DiagramEditorCore.migrateDiagram(importedDiagram);

      // Sanitize connections: remove those with missing source/target IDs,
      // or references to blocks not present in the imported diagram.
      const blockIds = new Set(importedDiagram.blocks.map(b => b.id));
      importedDiagram.connections = importedDiagram.connections.filter(c => {
        return c.fromBlock && c.toBlock &&
               blockIds.has(c.fromBlock) && blockIds.has(c.toBlock);
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