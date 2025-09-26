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
    const svg = document.getElementById('diagram-svg');
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

  getBlockAt(x, y) {
    // Convert screen coordinates to diagram coordinates
    const diagramX = x * (this.viewBox.width / 1000) + this.viewBox.x;
    const diagramY = y * (this.viewBox.height / 1000) + this.viewBox.y;
    
    // Find block at coordinates (reverse order for top-most)
    for (let i = this.diagram.blocks.length - 1; i >= 0; i--) {
      const block = this.diagram.blocks[i];
      if (diagramX >= block.x && diagramX <= block.x + (block.width || 120) &&
          diagramY >= block.y && diagramY <= block.y + (block.height || 80)) {
        return block;
      }
    }
    return null;
  }

  // Selection management
  selectBlock(blockId) {
    this.selectedBlock = blockId;
    this.updateBlockVisuals();
  }

  clearSelection() {
    this.selectedBlock = null;
    this.updateBlockVisuals();
  }

  // Visual updates
  updateBlockVisuals() {
    // This would be implemented by the UI renderer module
    if (window.diagramRenderer) {
      window.diagramRenderer.updateAllBlocks(this.diagram);
    }
  }

  // Data export/import
  exportDiagram() {
    return JSON.stringify(this.diagram, null, 2);
  }

  importDiagram(jsonData) {
    try {
      const importedDiagram = JSON.parse(jsonData);
      
      // Validate diagram structure
      if (!importedDiagram.blocks || !Array.isArray(importedDiagram.blocks)) {
        throw new Error('Invalid diagram format: missing blocks array');
      }
      
      this.diagram = importedDiagram;
      this.diagram.metadata.modified = new Date().toISOString();
      this.clearSelection();
      this.updateBlockVisuals();
      
      return true;
    } catch (error) {
      console.error('Failed to import diagram:', error);
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