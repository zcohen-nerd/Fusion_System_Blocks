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
  }

  createEmptyDiagram() {
    return {
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
    // Sanitize: strip connections with missing/empty source or target.
    // This guards against corrupt data that slipped through earlier versions.
    this.diagram.connections = this.diagram.connections.filter(
      c => c.fromBlock && c.toBlock
    );
    return JSON.stringify(this.diagram, null, 2);
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
      
      return true;
    } catch (error) {
      logger.error('Failed to import diagram:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagramEditorCore;
} else {
  window.DiagramEditorCore = DiagramEditorCore;
}