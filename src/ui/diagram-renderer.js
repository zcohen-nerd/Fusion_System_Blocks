/**
 * UI RENDERER MODULE
 * 
 * Handles all visual rendering of the diagram including:
 * - SVG block rendering with different shapes
 * - Connection line rendering
 * - Grid and background rendering
 * - Visual effects (highlights, hover states)
 * - Block shape system
 * 
 * Author: GitHub Copilot
 * Created: September 26, 2025
 * Module: UI Renderer
 */

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

class DiagramRenderer {
  constructor(editorCore) {
    this.editor = editorCore;
    this.svg = null;
    this.gridPattern = null;
    this.blockElements = new Map(); // Cache block DOM elements
    this.connectionElements = new Map(); // Cache connection DOM elements
    
    this.initializeRenderer();
  }

  initializeRenderer() {
    this.svg = document.getElementById('svg-canvas');
    if (!this.svg) {
      logger.error('SVG element not found!');
      return;
    }

    // Get or create the blocks layer group
    this.blocksLayer = this.svg.querySelector('#blocks-layer');
    if (!this.blocksLayer) {
      this.blocksLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.blocksLayer.id = 'blocks-layer';
      this.svg.appendChild(this.blocksLayer);
    }

    // Get or create the connections layer group
    this.connectionsLayer = this.svg.querySelector('#connections-layer');
    if (!this.connectionsLayer) {
      this.connectionsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.connectionsLayer.id = 'connections-layer';
      this.svg.insertBefore(this.connectionsLayer, this.blocksLayer);
    }

    this.setupGrid();
    this.setupDefs();
  }

  setupGrid() {
    // Create grid pattern
    const defs = this.svg.querySelector('defs') || this.svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
    
    this.gridPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    this.gridPattern.setAttribute('id', 'grid');
    this.gridPattern.setAttribute('width', this.editor.gridSize);
    this.gridPattern.setAttribute('height', this.editor.gridSize);
    this.gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${this.editor.gridSize} 0 L 0 0 0 ${this.editor.gridSize}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#e0e0e0');
    path.setAttribute('stroke-width', '0.5');
    
    this.gridPattern.appendChild(path);
    defs.appendChild(this.gridPattern);
  }

  setupDefs() {
    const defs = this.svg.querySelector('defs') || this.svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
    
    // Add arrow markers for connections
    const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    arrowMarker.setAttribute('id', 'arrowhead');
    arrowMarker.setAttribute('markerWidth', '10');
    arrowMarker.setAttribute('markerHeight', '7');
    arrowMarker.setAttribute('refX', '9');
    arrowMarker.setAttribute('refY', '3.5');
    arrowMarker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#666');
    
    arrowMarker.appendChild(polygon);
    defs.appendChild(arrowMarker);

    // Add drop shadow filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'drop-shadow');
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');

    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '2');
    feDropShadow.setAttribute('dy', '2');
    feDropShadow.setAttribute('stdDeviation', '2');
    feDropShadow.setAttribute('flood-opacity', '0.2');

    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
  }

  // Block rendering with different shapes
  createBlockShape(shape, width, height, x, y, isHalo = false) {
    const shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    let mainShape;
    const cornerRadius = 8;
    const strokeWidth = isHalo ? 4 : 2;
    
    switch (shape) {
      case 'rectangle':
      default:
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        mainShape.setAttribute('x', x);
        mainShape.setAttribute('y', y);
        mainShape.setAttribute('width', width);
        mainShape.setAttribute('height', height);
        mainShape.setAttribute('rx', cornerRadius);
        break;
        
      case 'circle':
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        mainShape.setAttribute('cx', x + width/2);
        mainShape.setAttribute('cy', y + height/2);
        mainShape.setAttribute('rx', width/2);
        mainShape.setAttribute('ry', height/2);
        break;
        
      case 'diamond':
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const midX = x + width/2;
        const midY = y + height/2;
        mainShape.setAttribute('points', 
          `${midX},${y} ${x+width},${midY} ${midX},${y+height} ${x},${midY}`);
        break;
        
      case 'hexagon':
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const h = height;
        const w = width;
        const offset = w * 0.2; // 20% offset for hexagon sides
        mainShape.setAttribute('points', 
          `${x+offset},${y} ${x+w-offset},${y} ${x+w},${y+h/2} ${x+w-offset},${y+h} ${x+offset},${y+h} ${x},${y+h/2}`);
        break;
        
      case 'rounded':
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        mainShape.setAttribute('x', x);
        mainShape.setAttribute('y', y);
        mainShape.setAttribute('width', width);
        mainShape.setAttribute('height', height);
        mainShape.setAttribute('rx', Math.min(width, height) * 0.3);
        break;
    }
    
    mainShape.setAttribute('stroke-width', strokeWidth);
    shapeElement.appendChild(mainShape);
    
    return shapeElement;
  }

  renderBlock(block) {
    const existing = this.blockElements.get(block.id);
    if (existing) {
      existing.remove();
    }

    const blockGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    blockGroup.setAttribute('class', 'block');
    blockGroup.setAttribute('data-block-id', block.id);
    blockGroup.setAttribute('transform', `translate(${block.x}, ${block.y})`);

    // Get block styling
    const styling = this.getBlockStyling(block);
    
    // Create main shape
    const shape = this.createBlockShape(
      block.shape || 'rectangle',
      block.width || 120,
      block.height || 80,
      0, 0
    );
    
    const mainShape = shape.firstChild;
    mainShape.setAttribute('fill', styling.fill);
    mainShape.setAttribute('stroke', styling.stroke);
    mainShape.setAttribute('filter', 'url(#drop-shadow)');
    
    blockGroup.appendChild(shape);

    // Add selection highlight if selected
    if (this.editor.selectedBlock === block.id) {
      const highlight = this.createBlockShape(
        block.shape || 'rectangle',
        block.width || 120,
        block.height || 80,
        0, 0,
        true // isHalo
      );
      const highlightShape = highlight.firstChild;
      highlightShape.setAttribute('fill', 'none');
      highlightShape.setAttribute('stroke', '#FF6B35');
      highlightShape.setAttribute('stroke-width', '3');
      highlightShape.setAttribute('opacity', '0.8');
      
      blockGroup.insertBefore(highlight, blockGroup.firstChild);
    }

    // Add text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (block.width || 120) / 2);
    text.setAttribute('y', (block.height || 80) / 2);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', styling.textColor);
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', 'bold');
    text.textContent = block.name || 'Block';
    
    blockGroup.appendChild(text);

    // Add status indicator
    this.addStatusIndicator(blockGroup, block);

    // Add to blocks layer and cache
    const target = this.blocksLayer || this.svg;
    target.appendChild(blockGroup);
    this.blockElements.set(block.id, blockGroup);

    return blockGroup;
  }

  getBlockStyling(block) {
    const type = block.type || 'Generic';
    const status = block.status || 'Placeholder';
    
    // Base colors by type
    const typeColors = {
      'Electrical': { fill: '#E8F4FD', stroke: '#2196F3' },
      'Mechanical': { fill: '#FFF3E0', stroke: '#FF9800' },
      'Software': { fill: '#F3E5F5', stroke: '#9C27B0' },
      'Generic': { fill: '#F5F5F5', stroke: '#757575' }
    };
    
    // Status modifications
    const statusModifications = {
      'Completed': { fillOpacity: 1.0, strokeWidth: 3 },
      'In Progress': { fillOpacity: 0.8, strokeWidth: 2 },
      'Placeholder': { fillOpacity: 0.4, strokeWidth: 1 }
    };
    
    const baseColor = typeColors[type] || typeColors['Generic'];
    const statusMod = statusModifications[status] || statusModifications['Placeholder'];
    
    return {
      fill: baseColor.fill,
      stroke: baseColor.stroke,
      textColor: '#333333',
      ...statusMod
    };
  }

  addStatusIndicator(blockGroup, block) {
    const status = block.status || 'Placeholder';
    const colors = {
      'Completed': '#4CAF50',
      'In Progress': '#FF9800',
      'Placeholder': '#9E9E9E',
      'Error': '#F44336'
    };
    
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    indicator.setAttribute('cx', (block.width || 120) - 10);
    indicator.setAttribute('cy', 10);
    indicator.setAttribute('r', 4);
    indicator.setAttribute('fill', colors[status] || colors['Placeholder']);
    
    blockGroup.appendChild(indicator);
  }

  renderConnection(connection) {
    const existing = this.connectionElements.get(connection.id);
    if (existing) {
      existing.remove();
    }

    const fromBlock = this.editor.diagram.blocks.find(b => b.id === connection.fromBlock);
    const toBlock = this.editor.diagram.blocks.find(b => b.id === connection.toBlock);
    
    if (!fromBlock || !toBlock) return null;

    // Calculate connection points
    const fromX = fromBlock.x + (fromBlock.width || 120);
    const fromY = fromBlock.y + (fromBlock.height || 80) / 2;
    const toX = toBlock.x;
    const toY = toBlock.y + (toBlock.height || 80) / 2;

    // Create curved path
    const midX = (fromX + toX) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${fromX} ${fromY} Q ${midX} ${fromY} ${midX} ${(fromY + toY) / 2} Q ${midX} ${toY} ${toX} ${toY}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#666');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    
    const target = this.connectionsLayer || this.svg;
    target.appendChild(path);
    this.connectionElements.set(connection.id, path);

    return path;
  }

  updateAllBlocks(diagram) {
    // Clear existing renders
    this.blockElements.forEach(element => element.remove());
    this.connectionElements.forEach(element => element.remove());
    this.blockElements.clear();
    this.connectionElements.clear();

    // Render all blocks
    diagram.blocks.forEach(block => {
      this.renderBlock(block);
    });

    // Render all connections
    diagram.connections.forEach(connection => {
      this.renderConnection(connection);
    });
  }

  highlightBlock(blockId, highlight = true) {
    const blockElement = this.blockElements.get(blockId);
    if (blockElement) {
      if (highlight) {
        blockElement.classList.add('highlighted');
      } else {
        blockElement.classList.remove('highlighted');
      }
    }
  }

  // Animation utilities
  animateBlockMove(blockId, newX, newY, duration = 300) {
    const blockElement = this.blockElements.get(blockId);
    if (!blockElement) return;

    const currentTransform = blockElement.getAttribute('transform');
    const startMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!startMatch) return;

    const startX = parseFloat(startMatch[1]);
    const startY = parseFloat(startMatch[2]);
    
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentX = startX + (newX - startX) * easedProgress;
      const currentY = startY + (newY - startY) * easedProgress;
      
      blockElement.setAttribute('transform', `translate(${currentX}, ${currentY})`);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagramRenderer;
} else {
  window.DiagramRenderer = DiagramRenderer;
}