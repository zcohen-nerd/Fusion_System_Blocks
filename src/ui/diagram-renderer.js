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
    
    /**
     * Connection routing mode: 'bezier' (default curves) or 'orthogonal'
     * (right-angle Manhattan routing). Toggle via setRoutingMode().
     */
    this.routingMode = 'bezier';

    /** Orthogonal routing engine instance (created lazily). */
    this._orthogonalRouter = null;

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

    // Get or create the snap-guides layer (above blocks)
    this.guidesLayer = this.svg.querySelector('#guides-layer');
    if (!this.guidesLayer) {
      this.guidesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.guidesLayer.id = 'guides-layer';
      this.svg.appendChild(this.guidesLayer);
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
    
    // Create arrowhead markers for each connection color.
    // SVG markers don't inherit stroke from the referencing path,
    // so we need a separate marker per colour.
    const arrowColors = {
      'arrowhead':            '#666',     // default
      'arrowhead-power':      '#dc3545',  // power → red
      'arrowhead-data':       '#007bff',  // data → blue
      'arrowhead-mechanical': '#6c757d',  // mechanical → gray
    };

    for (const [markerId, color] of Object.entries(arrowColors)) {
      if (!defs.querySelector('#' + markerId)) {
        const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        arrowMarker.setAttribute('id', markerId);
        arrowMarker.setAttribute('markerWidth', '10');
        arrowMarker.setAttribute('markerHeight', '7');
        arrowMarker.setAttribute('refX', '10');
        arrowMarker.setAttribute('refY', '3.5');
        arrowMarker.setAttribute('orient', 'auto');
        arrowMarker.setAttribute('markerUnits', 'userSpaceOnUse');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', color);
        
        arrowMarker.appendChild(polygon);
        defs.appendChild(arrowMarker);
      }
    }

    // Only create drop shadow filter if one doesn't already exist
    if (!defs.querySelector('#drop-shadow')) {
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

      case 'parallelogram': {
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const skew = width * 0.18;
        mainShape.setAttribute('points',
          `${x + skew},${y} ${x + width},${y} ${x + width - skew},${y + height} ${x},${y + height}`);
        break;
      }

      case 'cylinder': {
        // Cylinder / database shape — rect body with elliptical caps.
        // The main path draws the body (front face) as a closed shape,
        // then a subpath draws the back arc of the top ellipse so the
        // "lid" of the cylinder is visible.  The subpath is open so it
        // receives stroke but not fill.
        const capRy = height * 0.12;
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainShape.setAttribute('d',
          // Body (closed)
          `M ${x},${y + capRy}` +
          ` A ${width / 2},${capRy} 0 0,1 ${x + width},${y + capRy}` +
          ` L ${x + width},${y + height - capRy}` +
          ` A ${width / 2},${capRy} 0 0,1 ${x},${y + height - capRy}` +
          ` Z` +
          // Top cap — back arc (open subpath, stroke-only)
          ` M ${x},${y + capRy}` +
          ` A ${width / 2},${capRy} 0 0,0 ${x + width},${y + capRy}`);
        break;
      }

      case 'triangle': {
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        mainShape.setAttribute('points',
          `${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`);
        break;
      }
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

    // Transparent hit rect ensures pointer events fire consistently across
    // the entire block area (prevents gaps between child SVG elements).
    const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hitRect.setAttribute('x', 0);
    hitRect.setAttribute('y', 0);
    hitRect.setAttribute('width', block.width || 120);
    hitRect.setAttribute('height', block.height || 80);
    hitRect.setAttribute('fill', 'transparent');
    hitRect.setAttribute('stroke', 'none');
    blockGroup.appendChild(hitRect);

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
        (block.width || 120) + 8,
        (block.height || 80) + 8,
        -4, -4,
        true // isHalo
      );
      const highlightShape = highlight.firstChild;
      highlightShape.setAttribute('fill', 'none');
      highlightShape.setAttribute('stroke', '#FF6B35');
      highlightShape.setAttribute('stroke-width', '3');
      highlightShape.setAttribute('opacity', '0.85');
      
      blockGroup.insertBefore(highlight, blockGroup.firstChild);
    }

    // Add text label — explicitly reset stroke/fill to prevent inheritance
    // from the parent <g class="block"> which has CSS stroke set on it.
    const blockW = block.width || 120;
    const blockH = block.height || 80;
    const textPadding = 10; // px padding on each side
    const maxTextWidth = blockW - textPadding * 2;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', blockW / 2);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', styling.textColor);
    text.setAttribute('stroke', 'none');           // prevent inherited outline
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('pointer-events', 'none');   // clicks pass through to block

    // Word-wrap the label into multiple lines that fit the block width.
    // SVG <text> doesn't support native wrapping, so we use <tspan> elements.
    const label = block.name || 'Block';
    const fontSize = 12;
    text.setAttribute('font-size', String(fontSize));
    const words = label.split(/\s+/);
    const lines = [];
    let currentLine = '';

    // Approximate character width: 0.6 * fontSize for Arial bold
    const charWidth = fontSize * 0.6;
    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length * charWidth > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    // Limit to 3 lines max; truncate with ellipsis if needed
    const maxLines = 3;
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
    }

    const lineHeight = fontSize * 1.3;
    const totalTextHeight = lines.length * lineHeight;
    // For triangle shapes the usable text area is the lower 2/3 of the
    // block (the top is a narrow point), so shift text downward.
    const shapeOffset = (block.shape === 'triangle') ? blockH * 0.2 : 0;
    const startY = (blockH - totalTextHeight) / 2 + lineHeight * 0.75 + shapeOffset;

    lines.forEach((line, i) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', blockW / 2);
      tspan.setAttribute('dy', i === 0 ? String(startY) : String(lineHeight));
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    blockGroup.appendChild(text);

    // Add status indicator
    this.addStatusIndicator(blockGroup, block);

    // Add connection port dots (left = input, right = output)
    this.addConnectionPorts(blockGroup, block);

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
    
    // Status modifications — aligned with the 5 canonical statuses used
    // by the legend sidebar, context menu, and Python hierarchy module.
    const statusModifications = {
      'Placeholder':  { fillOpacity: 0.4, strokeWidth: 1 },
      'Planned':      { fillOpacity: 0.6, strokeWidth: 1.5 },
      'In-Work':      { fillOpacity: 0.8, strokeWidth: 2 },
      'Implemented':  { fillOpacity: 1.0, strokeWidth: 3 },
      'Verified':     { fillOpacity: 1.0, strokeWidth: 3 }
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
    // Colors aligned with fusion-theme.css CSS variables
    const colors = {
      'Placeholder':  '#969696',   // --fusion-status-placeholder
      'Planned':      '#87ceeb',   // --fusion-status-planned
      'In-Work':      '#ffc107',   // --fusion-status-in-work
      'Implemented':  '#4caf50',   // --fusion-status-implemented
      'Verified':     '#006064',   // --fusion-status-verified (teal)
      'Error':        '#F44336'
    };
    
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    indicator.setAttribute('cx', (block.width || 120) - 10);
    indicator.setAttribute('cy', 10);
    indicator.setAttribute('r', 6);
    indicator.setAttribute('fill', colors[status] || colors['Placeholder']);
    indicator.setAttribute('stroke', 'rgba(0,0,0,0.3)');
    indicator.setAttribute('stroke-width', '1');
    
    blockGroup.appendChild(indicator);

    // CAD link badge — prominent banner at top of block when linked.
    if (block.links && block.links.some(l => l.target === 'cad')) {
      const blockW = block.width || 120;
      const cadLink = block.links.find(l => l.target === 'cad');
      const compName = (block.attributes && block.attributes.linkedComponent) || 'Linked';

      // Blue banner bar across the top of the block
      const banner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      banner.setAttribute('x', '0');
      banner.setAttribute('y', '-16');
      banner.setAttribute('width', String(blockW));
      banner.setAttribute('height', '14');
      banner.setAttribute('rx', '3');
      banner.setAttribute('fill', '#2196F3');
      banner.setAttribute('opacity', '0.9');
      banner.setAttribute('pointer-events', 'none');
      blockGroup.appendChild(banner);

      // Chain-link icon + component name label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(blockW / 2));
      label.setAttribute('y', '-6');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#ffffff');
      label.setAttribute('stroke', 'none');
      label.setAttribute('font-size', '9');
      label.setAttribute('font-family', 'Arial, sans-serif');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('pointer-events', 'none');
      // Truncate long component names
      const maxChars = Math.floor(blockW / 6);
      const displayName = compName.length > maxChars
        ? '\u{1F517} ' + compName.substring(0, maxChars - 3) + '\u2026'
        : '\u{1F517} ' + compName;
      label.textContent = displayName;
      blockGroup.appendChild(label);

      logger.debug('CAD link badge rendered for block', block.id, 'component:', compName);
    }

    // Child-diagram indicator — small nested-squares icon at bottom-left
    if (block.childDiagram) {
      const childBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      childBadge.setAttribute('transform', 'translate(4,' + ((block.height || 80) - 16) + ')');
      childBadge.setAttribute('pointer-events', 'none');
      // Outer square
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      outer.setAttribute('x', '0'); outer.setAttribute('y', '0');
      outer.setAttribute('width', '10'); outer.setAttribute('height', '10');
      outer.setAttribute('rx', '1');
      outer.setAttribute('fill', 'none'); outer.setAttribute('stroke', '#FF6B35');
      outer.setAttribute('stroke-width', '1.5');
      childBadge.appendChild(outer);
      // Inner square (nested)
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      inner.setAttribute('x', '3'); inner.setAttribute('y', '3');
      inner.setAttribute('width', '6'); inner.setAttribute('height', '6');
      inner.setAttribute('rx', '1');
      inner.setAttribute('fill', '#FF6B35'); inner.setAttribute('stroke', 'none');
      inner.setAttribute('opacity', '0.5');
      childBadge.appendChild(inner);
      blockGroup.appendChild(childBadge);
    }
  }

  addConnectionPorts(blockGroup, block) {
    const w = block.width || 120;
    const h = block.height || 80;

    const createPort = (cx, cy, portType) => {
      const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      port.setAttribute('cx', cx);
      port.setAttribute('cy', cy);
      port.setAttribute('r', 6);
      port.setAttribute('fill', '#fff');
      port.setAttribute('stroke', '#FF6B35');
      port.setAttribute('stroke-width', '2');
      port.setAttribute('class', 'connection-port');
      port.setAttribute('data-block-id', block.id);
      port.setAttribute('data-port-type', portType);
      port.setAttribute('opacity', '0');
      // Ensure the port is always hittable even at opacity 0.
      // Without this, some Chromium builds (including Fusion's CEF)
      // skip opacity-0 elements during hit testing.
      port.setAttribute('pointer-events', 'all');
      port.style.cursor = 'crosshair';
      blockGroup.appendChild(port);
    };

    // Input port (left center)
    createPort(0, h / 2, 'input');

    // Output port (right center)
    createPort(w, h / 2, 'output');

    // Top-center port
    createPort(w / 2, 0, 'top');

    // Bottom-center port
    createPort(w / 2, h, 'bottom');
  }

  renderConnection(connection) {
    const existing = this.connectionElements.get(connection.id);
    if (existing) {
      existing.remove();
    }

    const fromBlock = this.editor.diagram.blocks.find(b => b.id === connection.fromBlock);
    const toBlock = this.editor.diagram.blocks.find(b => b.id === connection.toBlock);
    
    if (!fromBlock || !toBlock) {
      logger.warn('renderConnection: missing block(s) for', connection.id,
        'from:', connection.fromBlock, !!fromBlock,
        'to:', connection.toBlock, !!toBlock);
      return null;
    }

    // --- Connection type styling ---
    const connType = (connection.type || 'auto').toLowerCase();
    const styling = this.getConnectionStyling(connType);

    // --- Arrow direction ---
    const direction = (connection.arrowDirection || 'forward').toLowerCase();
    // Use a type-specific arrowhead marker so the arrowhead colour
    // matches the connection line colour.
    const markerSuffix = ['power', 'data', 'mechanical'].includes(connType)
      ? '-' + connType : (connType === 'electrical' ? '-power' : '');
    const fwdMarker = `url(#arrowhead${markerSuffix})`;

    // --- Resolve port-aware endpoints ---
    const fromPort = connection.fromPort || 'output';
    const toPort   = connection.toPort   || 'input';
    const fromW = fromBlock.width  || 120;
    const fromH = fromBlock.height || 80;
    const toW   = toBlock.width    || 120;
    const toH   = toBlock.height   || 80;

    // Fan offset: distribute connections sharing the same port side
    const outConns = this.editor.diagram.connections.filter(
      c => c.fromBlock === connection.fromBlock && (c.fromPort || 'output') === fromPort
    );
    const inConns = this.editor.diagram.connections.filter(
      c => c.toBlock === connection.toBlock && (c.toPort || 'input') === toPort
    );
    const outIdx = outConns.indexOf(connection);
    const inIdx  = inConns.indexOf(connection);

    let fromX, fromY, toX, toY;

    // Source endpoint
    switch (fromPort) {
      case 'input':
        fromX = fromBlock.x;
        fromY = fromBlock.y + this._fanOffset(outIdx, outConns.length, fromH);
        break;
      case 'top':
        fromX = fromBlock.x + this._fanOffset(outIdx, outConns.length, fromW);
        fromY = fromBlock.y;
        break;
      case 'bottom':
        fromX = fromBlock.x + this._fanOffset(outIdx, outConns.length, fromW);
        fromY = fromBlock.y + fromH;
        break;
      default: // 'output'
        fromX = fromBlock.x + fromW;
        fromY = fromBlock.y + this._fanOffset(outIdx, outConns.length, fromH);
        break;
    }

    // Target endpoint
    switch (toPort) {
      case 'output':
        toX = toBlock.x + toW;
        toY = toBlock.y + this._fanOffset(inIdx, inConns.length, toH);
        break;
      case 'top':
        toX = toBlock.x + this._fanOffset(inIdx, inConns.length, toW);
        toY = toBlock.y;
        break;
      case 'bottom':
        toX = toBlock.x + this._fanOffset(inIdx, inConns.length, toW);
        toY = toBlock.y + toH;
        break;
      default: // 'input'
        toX = toBlock.x;
        toY = toBlock.y + this._fanOffset(inIdx, inConns.length, toH);
        break;
    }

    // Determine whether this is a vertical connection (top/bottom ports)
    const isVerticalFrom = (fromPort === 'top' || fromPort === 'bottom');
    const isVerticalTo   = (toPort === 'top' || toPort === 'bottom');
    const isVertical = isVerticalFrom || isVerticalTo;

    // Choose path based on routing mode
    let d;
    if (this.routingMode === 'orthogonal') {
      if (isVertical) {
        d = this._computeVerticalOrthogonalPath(fromX, fromY, toX, toY, fromPort, toPort);
      } else {
        d = this._computeOrthogonalPath(fromX, fromY, toX, toY, connection);
      }
    } else {
      if (isVertical) {
        // Vertical Bezier: stubs go up/down then curve across
        const dy = Math.abs(toY - fromY);
        const dx = toX - fromX;
        const xBulge = Math.abs(dx) < 10 ? Math.max(30, dy * 0.15) : 0;
        const midY = (fromY + toY) / 2;
        d = `M ${fromX} ${fromY} C ${fromX - xBulge} ${midY} ${toX - xBulge} ${midY} ${toX} ${toY}`;
      } else {
        // Default horizontal Bezier curve
        const dx = Math.abs(toX - fromX);
        const dy = toY - fromY;
        const yBulge = Math.abs(dy) < 10 ? Math.max(30, dx * 0.15) : 0;
        const midX = (fromX + toX) / 2;
        d = `M ${fromX} ${fromY} C ${midX} ${fromY - yBulge} ${midX} ${toY - yBulge} ${toX} ${toY}`;
      }
    }

    // Group element for the connection (hit area + visible stroke)
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'connection-group');
    group.setAttribute('data-connection-id', connection.id);
    group.setAttribute('data-connection-type', connType);

    // Wide invisible hit area for easier clicking / selection
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '14');
    hitPath.setAttribute('pointer-events', 'stroke');
    hitPath.setAttribute('cursor', 'pointer');
    group.appendChild(hitPath);

    // Visible path — type-specific color, width, and dash
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', styling.stroke);
    path.setAttribute('stroke-width', String(styling.strokeWidth));
    if (styling.dashArray) {
      path.setAttribute('stroke-dasharray', styling.dashArray);
    }
    path.setAttribute('class', 'connection-line');

    // Apply directional markers
    if (direction === 'forward') {
      path.setAttribute('marker-end', fwdMarker);
    } else if (direction === 'bidirectional') {
      path.setAttribute('marker-end', fwdMarker);
    } else if (direction === 'backward') {
      // No marker-end for backward — only start arrow
    }
    // direction === 'none' → no markers

    // Append path BEFORE manual arrows so the arrow polygon renders
    // on top of the connection line (correct SVG stacking order).
    group.appendChild(path);

    // CEF workaround: marker-start is unreliable in Fusion's
    // Chromium, so render a manual reverse arrow polygon instead.
    // Appended after the path so the arrow sits visually on top.
    if (direction === 'bidirectional' || direction === 'backward') {
      this._addManualStartArrow(group, fromX, fromY, toX, toY, styling.stroke, styling.strokeWidth);
    }

    // --- Waypoint handles (orthogonal mode only) ---
    if (this.routingMode === 'orthogonal' && connection.waypoints && connection.waypoints.length > 0) {
      this._renderWaypointHandles(group, connection);
    }

    // --- Double-click to add a waypoint (orthogonal mode only) ---
    group.addEventListener('dblclick', (e) => {
      if (this.routingMode !== 'orthogonal') return;
      e.stopPropagation();
      const svgPt = this._clientToSVG(e.clientX, e.clientY);
      if (!svgPt) return;
      if (!connection.waypoints) connection.waypoints = [];
      connection.waypoints.push({ x: svgPt.x, y: svgPt.y });
      // Persist the waypoints on the editor's connection object
      if (this.editor) {
        this.editor.updateConnection(connection.id, { waypoints: connection.waypoints });
      }
      this.renderConnection(connection);
    });

    // Ensure connectionsLayer is still in the DOM (defensive)
    const target = this.connectionsLayer && this.connectionsLayer.parentNode
      ? this.connectionsLayer
      : (this.svg.querySelector('#connections-layer') || this.svg);
    target.appendChild(group);
    this.connectionElements.set(connection.id, group);

    logger.debug('renderConnection: rendered', connection.id,
      'type:', connType, 'direction:', direction,
      'path:', d.substring(0, 60) + '...');

    return group;
  }

  /**
   * Convert browser client coordinates to SVG (diagram) coordinates.
   * Re-usable utility matching main-coordinator.js screenToSVG logic.
   */
  _clientToSVG(clientX, clientY) {
    if (!this.svg) return null;
    const ctm = this.svg.getScreenCTM();
    if (ctm) {
      const pt = this.svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      return pt.matrixTransform(ctm.inverse());
    }
    // Fallback
    const rect = this.svg.getBoundingClientRect();
    const vb = this.svg.viewBox.baseVal;
    return {
      x: (clientX - rect.left) * (vb.width / rect.width) + vb.x,
      y: (clientY - rect.top) * (vb.height / rect.height) + vb.y
    };
  }

  /**
   * Render draggable circles for each waypoint of a connection.
   * Right-click on a handle removes the waypoint.
   */
  _renderWaypointHandles(group, connection) {
    const waypoints = connection.waypoints || [];
    waypoints.forEach((wp, idx) => {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', wp.x);
      handle.setAttribute('cy', wp.y);
      handle.setAttribute('r', '5');
      handle.setAttribute('fill', '#FF6B35');
      handle.setAttribute('stroke', '#fff');
      handle.setAttribute('stroke-width', '1.5');
      handle.setAttribute('cursor', 'grab');
      handle.setAttribute('class', 'waypoint-handle');
      handle.setAttribute('data-wp-index', String(idx));

      // --- Drag behaviour ---
      let dragging = false;
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        dragging = true;
        handle.setAttribute('cursor', 'grabbing');

        const onMove = (me) => {
          if (!dragging) return;
          const pt = this._clientToSVG(me.clientX, me.clientY);
          if (!pt) return;
          wp.x = pt.x;
          wp.y = pt.y;
          handle.setAttribute('cx', pt.x);
          handle.setAttribute('cy', pt.y);
          // Live re-route the path (lightweight — just update d attribute)
          const pathD = this._computeOrthogonalPath(
            parseFloat(group.querySelector('.connection-line')?.getAttribute('d')?.split(' ')[1]) || 0,
            0, 0, 0, connection
          );
          // Full re-render for accurate routing
          this.renderConnection(connection);
        };

        const onUp = () => {
          dragging = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          // Persist final position
          if (this.editor) {
            this.editor.updateConnection(connection.id, { waypoints: connection.waypoints });
          }
          this.renderConnection(connection);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // --- Right-click to remove waypoint ---
      handle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        connection.waypoints.splice(idx, 1);
        if (this.editor) {
          this.editor.updateConnection(connection.id, { waypoints: connection.waypoints });
        }
        this.renderConnection(connection);
      });

      group.appendChild(handle);
    });
  }

  /**
   * Return stroke color, width, and optional dash pattern for a connection type.
   */
  getConnectionStyling(connType) {
    const styles = {
      'power':      { stroke: '#dc3545', strokeWidth: 3, dashArray: null },
      'data':       { stroke: '#007bff', strokeWidth: 2, dashArray: '8,4' },
      'electrical': { stroke: '#dc3545', strokeWidth: 3, dashArray: null }, // alias → power
      'mechanical': { stroke: '#6c757d', strokeWidth: 2, dashArray: '12,6' }
    };
    return styles[connType] || { stroke: '#666', strokeWidth: 2, dashArray: null };
  }

  // ---- Smart alignment snap guides ----

  /**
   * Render alignment guide lines onto the guides layer.
   * @param {Array<{axis:'h'|'v', pos:number, from:number, to:number}>} guides
   */
  showSnapGuides(guides) {
    this.clearSnapGuides();
    if (!this.guidesLayer || !guides || guides.length === 0) return;

    // De-duplicate guides that are very close to each other
    const seen = new Set();
    for (const g of guides) {
      const key = g.axis + ':' + Math.round(g.pos);
      if (seen.has(key)) continue;
      seen.add(key);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      if (g.axis === 'v') {
        line.setAttribute('x1', g.pos);
        line.setAttribute('y1', g.from);
        line.setAttribute('x2', g.pos);
        line.setAttribute('y2', g.to);
      } else {
        line.setAttribute('x1', g.from);
        line.setAttribute('y1', g.pos);
        line.setAttribute('x2', g.to);
        line.setAttribute('y2', g.pos);
      }
      line.setAttribute('stroke', '#FF6B35');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '4,3');
      line.setAttribute('pointer-events', 'none');
      this.guidesLayer.appendChild(line);
    }
  }

  /** Remove all alignment guide lines. */
  clearSnapGuides() {
    if (this.guidesLayer) {
      while (this.guidesLayer.firstChild) {
        this.guidesLayer.removeChild(this.guidesLayer.firstChild);
      }
    }
  }

  /**
   * Compute a vertical offset for the i-th connection out of total,
   * distributed symmetrically around the block's vertical center.
   * Keeps a 10 px margin from top/bottom edges.
   */
  _fanOffset(index, total, blockHeight) {
    if (total <= 1) return blockHeight / 2;
    const margin = 10;
    const usable = blockHeight - 2 * margin;
    const step = usable / (total - 1);
    return margin + index * step;
  }

  /**
   * CEF workaround — render a small reverse-arrow triangle at the start
   * of a connection path. Fusion's Chromium does not reliably render
   * SVG marker-start, so we draw a manual polygon instead.
   *
   * The arrow tip always sits at (fromX, fromY) and points AWAY from
   * the path's first segment direction (i.e. back toward the source
   * block).  For orthogonal routes this means the arrow points along
   * the first segment axis rather than using a raw start→end angle.
   */
  _addManualStartArrow(group, fromX, fromY, toX, toY, fillColor, strokeWidth = 2) {
    const size = 10;

    // Determine the path's first-segment direction.
    // Prefer the actual SVG path data (orthogonal routing produces L
    // segments that differ from the straight-line angle).
    let segDx = toX - fromX;
    let segDy = toY - fromY;
    const pathEl = group.querySelector('.connection-line');
    if (pathEl) {
      const d = pathEl.getAttribute('d') || '';
      // Parse the second point from the path: "M x0 y0 L x1 y1 ..."
      // or Bezier: "M x0 y0 C cx1 cy1 cx2 cy2 x1 y1"
      const tokens = d.replace(/[MLCQZmlcqz,]/g, ' ').trim().split(/\s+/).map(Number);
      if (tokens.length >= 4) {
        const x1 = tokens[2];
        const y1 = tokens[3];
        if (!(isNaN(x1) || isNaN(y1))) {
          segDx = x1 - fromX;
          segDy = y1 - fromY;
        }
      }
    }

    // Angle of the first segment (source → first bend/control point)
    const segAngle = Math.atan2(segDy, segDx);
    // Arrow tip points BACKWARD (away from path direction)
    const tipAngle = segAngle + Math.PI;

    const tipX = fromX;
    const tipY = fromY;

    const halfSpread = Math.atan2(3.5, 10); // ~19°
    // Base extends along the path direction (away from tip)
    const baseX1 = tipX + Math.cos(segAngle + halfSpread) * size;
    const baseY1 = tipY + Math.sin(segAngle + halfSpread) * size;
    const baseX2 = tipX + Math.cos(segAngle - halfSpread) * size;
    const baseY2 = tipY + Math.sin(segAngle - halfSpread) * size;

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points',
      `${tipX},${tipY} ${baseX1},${baseY1} ${baseX2},${baseY2}`);
    arrow.setAttribute('fill', fillColor);
    arrow.setAttribute('stroke', fillColor);
    arrow.setAttribute('stroke-width', '0.5');
    arrow.setAttribute('stroke-linejoin', 'round');
    arrow.setAttribute('class', 'manual-start-arrow');
    group.appendChild(arrow);
  }

  /**
   * Compute an orthogonal (Manhattan) SVG path string for a connection.
   * Delegates to the OrthogonalRouter engine for obstacle avoidance.
   * @private
   */
  _computeOrthogonalPath(fromX, fromY, toX, toY, connection) {
    if (!this._orthogonalRouter) {
      this._orthogonalRouter = typeof OrthogonalRouter !== 'undefined'
        ? new OrthogonalRouter()
        : null;
    }
    if (!this._orthogonalRouter) {
      // Fallback if router not loaded — simple 3-segment path
      const midX = (fromX + toX) / 2;
      return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
    }

    const blocks = this.editor.diagram.blocks || [];
    const obstacles = this._orthogonalRouter.buildObstacles(
      blocks, connection.fromBlock, connection.toBlock
    );
    const waypoints = connection.waypoints || [];
    return this._orthogonalRouter.computePath(
      fromX, fromY, toX, toY, obstacles, waypoints
    );
  }

  /**
   * Compute an orthogonal (Manhattan) SVG path for connections using
   * top/bottom ports. Routes vertically out of the source port, across
   * horizontally, then vertically into the target port.
   * @private
   */
  _computeVerticalOrthogonalPath(fromX, fromY, toX, toY, fromPort, toPort) {
    const STUB = 20; // px to extend out of port before turning

    // Determine stub directions (positive Y = downward in SVG)
    const fromDir = fromPort === 'bottom' ? 1 : -1; // bottom→down, top→up
    const toDir   = toPort   === 'bottom' ? 1 : -1;

    const stubFromY = fromY + STUB * fromDir;
    const stubToY   = toY   + STUB * toDir;

    // Simple case: ports face each other (e.g. bottom→top) and there is
    // enough vertical room — route via a single horizontal midpoint.
    const facingEachOther =
      (fromPort === 'bottom' && toPort === 'top'  && fromY < toY) ||
      (fromPort === 'top'    && toPort === 'bottom' && fromY > toY);

    if (facingEachOther) {
      const midY = (fromY + toY) / 2;
      return `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;
    }

    // General case: ports face the same direction or away from each other.
    // Route: stub out → horizontal jog → vertical span → stub in.
    // Pick the midY that is safely beyond both stubs.
    const midY = fromDir === toDir
      ? (fromDir > 0
          ? Math.max(stubFromY, stubToY) + STUB
          : Math.min(stubFromY, stubToY) - STUB)
      : (stubFromY + stubToY) / 2;

    return `M ${fromX} ${fromY} L ${fromX} ${midY} ` +
           `L ${toX} ${midY} L ${toX} ${toY}`;
  }

  /**
   * Set the connection routing mode and re-render all connections.
   * @param {'bezier'|'orthogonal'} mode
   */
  setRoutingMode(mode) {
    if (mode !== 'bezier' && mode !== 'orthogonal') return;
    if (this.routingMode === mode) return;
    this.routingMode = mode;
    logger.info('Routing mode changed to:', mode);
    // Re-render all connections with the new mode
    if (this.editor && this.editor.diagram) {
      this.editor.diagram.connections.forEach(conn => {
        this.renderConnection(conn);
      });
    }
  }

  /**
   * Toggle between Bezier and orthogonal routing modes.
   * @returns {string} The new active mode.
   */
  toggleRoutingMode() {
    const newMode = this.routingMode === 'bezier' ? 'orthogonal' : 'bezier';
    this.setRoutingMode(newMode);
    return newMode;
  }

  highlightConnection(connectionId, highlight = true) {
    const group = this.connectionElements.get(connectionId);
    if (!group) return;
    const line = group.querySelector('.connection-line');
    if (!line) return;
    if (highlight) {
      line.setAttribute('stroke', '#FF6B35');
      line.setAttribute('stroke-width', '3');
    } else {
      // Restore type-specific styling
      const connType = group.getAttribute('data-connection-type') || 'auto';
      const styling = this.getConnectionStyling(connType);
      line.setAttribute('stroke', styling.stroke);
      line.setAttribute('stroke-width', String(styling.strokeWidth));
    }
  }

  clearConnectionHighlights() {
    this.connectionElements.forEach((group, id) => {
      this.highlightConnection(id, false);
    });
  }

  updateAllBlocks(diagram) {
    // Clear existing renders
    this.blockElements.forEach(element => element.remove());
    this.connectionElements.forEach(element => element.remove());
    this.blockElements.clear();
    this.connectionElements.clear();
    // Clear annotation elements
    if (this._annotationElements) {
      this._annotationElements.forEach(el => el.remove());
      this._annotationElements.clear();
    }
    // Clear group boundary overlays so they don't persist across
    // drill-down, navigate-up, or new-document operations.
    const svg = this.svg;
    if (svg) {
      svg.querySelectorAll('[id^="group-boundary-"]').forEach(el => el.remove());
    }

    // Batch render using documentFragment for fewer reflows
    const blocksTarget = this.blocksLayer || this.svg;
    const connsTarget = this.connectionsLayer || this.svg;

    // Render all blocks
    diagram.blocks.forEach(block => {
      this.renderBlock(block);
    });

    // Render all connections
    diagram.connections.forEach(connection => {
      this.renderConnection(connection);
    });

    // Render all annotations
    if (diagram.annotations) {
      diagram.annotations.forEach(ann => this.renderAnnotation(ann));
    }
  }

  // ---- Annotation rendering ----

  /**
   * Render a single annotation onto the SVG canvas.
   * Supported types: text, note, dimension, callout.
   */
  renderAnnotation(annotation) {
    if (!this._annotationElements) this._annotationElements = new Map();
    // Remove previous render
    const prev = this._annotationElements.get(annotation.id);
    if (prev) prev.remove();

    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'annotation annotation-' + annotation.type);
    g.setAttribute('data-annotation-id', annotation.id);

    const x = annotation.x || 0;
    const y = annotation.y || 0;
    const w = annotation.width || 120;
    const h = annotation.height || 30;

    switch (annotation.type) {
      case 'text': {
        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', x);
        txt.setAttribute('y', y + 14);
        txt.setAttribute('font-size', '12');
        txt.setAttribute('fill', '#ccc');
        txt.setAttribute('font-family', 'Segoe UI, sans-serif');
        txt.textContent = annotation.text;
        g.appendChild(txt);
        break;
      }
      case 'note': {
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('rx', '4');
        rect.setAttribute('fill', '#fff8c4');
        rect.setAttribute('stroke', '#e6d96c');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('opacity', '0.9');
        g.appendChild(rect);
        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', x + 8);
        txt.setAttribute('y', y + 18);
        txt.setAttribute('font-size', '11');
        txt.setAttribute('fill', '#333');
        txt.setAttribute('font-family', 'Segoe UI, sans-serif');
        // Word-wrap approximation
        const lines = annotation.text.match(/.{1,22}/g) || [annotation.text];
        lines.forEach((line, i) => {
          const tspan = document.createElementNS(ns, 'tspan');
          tspan.setAttribute('x', x + 8);
          tspan.setAttribute('dy', i === 0 ? '0' : '14');
          tspan.textContent = line;
          txt.appendChild(tspan);
        });
        g.appendChild(txt);
        break;
      }
      case 'dimension': {
        const blockA = this.editor && this.editor.diagram.blocks.find(b => b.id === annotation.refBlockA);
        const blockB = this.editor && this.editor.diagram.blocks.find(b => b.id === annotation.refBlockB);
        if (!blockA || !blockB) break;
        const ax = blockA.x + (blockA.width || 120) / 2;
        const ay = blockA.y + (blockA.height || 80) / 2;
        const bx = blockB.x + (blockB.width || 120) / 2;
        const by = blockB.y + (blockB.height || 80) / 2;
        const dist = Math.round(Math.hypot(bx - ax, by - ay));
        const label = annotation.text || `${dist}px`;

        // Keep annotation x/y/width/height in sync with blocks
        // so the hit rect and selection outline track correctly.
        annotation.x = Math.min(ax, bx) - 5;
        annotation.y = Math.min(ay, by) - 15;
        annotation.width = Math.abs(bx - ax) + 10;
        annotation.height = Math.abs(by - ay) + 30;

        // Dimension line
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', ax);
        line.setAttribute('y1', ay);
        line.setAttribute('x2', bx);
        line.setAttribute('y2', by);
        line.setAttribute('stroke', '#4fc3f7');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '5,3');
        g.appendChild(line);
        // End ticks
        [{ cx: ax, cy: ay }, { cx: bx, cy: by }].forEach(({ cx, cy }) => {
          const tick = document.createElementNS(ns, 'circle');
          tick.setAttribute('cx', cx);
          tick.setAttribute('cy', cy);
          tick.setAttribute('r', '3');
          tick.setAttribute('fill', '#4fc3f7');
          g.appendChild(tick);
        });
        // Label at midpoint
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const bg = document.createElementNS(ns, 'rect');
        bg.setAttribute('x', mx - 20);
        bg.setAttribute('y', my - 10);
        bg.setAttribute('width', '40');
        bg.setAttribute('height', '16');
        bg.setAttribute('rx', '3');
        bg.setAttribute('fill', '#263238');
        bg.setAttribute('stroke', '#4fc3f7');
        bg.setAttribute('stroke-width', '0.5');
        g.appendChild(bg);
        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', mx);
        txt.setAttribute('y', my + 3);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', '10');
        txt.setAttribute('fill', '#4fc3f7');
        txt.setAttribute('font-family', 'Segoe UI, sans-serif');
        txt.textContent = label;
        g.appendChild(txt);
        break;
      }
      case 'callout': {
        // Callout box
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('rx', '6');
        rect.setAttribute('fill', '#37474f');
        rect.setAttribute('stroke', '#ff9800');
        rect.setAttribute('stroke-width', '1.5');
        g.appendChild(rect);
        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', x + w / 2);
        txt.setAttribute('y', y + h / 2 + 4);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', '11');
        txt.setAttribute('fill', '#fff');
        txt.setAttribute('font-family', 'Segoe UI, sans-serif');
        txt.textContent = annotation.text;
        g.appendChild(txt);
        // Leader line to target block (if set)
        if (annotation.targetBlockId && this.editor) {
          const target = this.editor.diagram.blocks.find(b => b.id === annotation.targetBlockId);
          if (target) {
            const tx = target.x + (target.width || 120) / 2;
            const ty = target.y;
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', x + w / 2);
            line.setAttribute('y1', y + h);
            line.setAttribute('x2', tx);
            line.setAttribute('y2', ty);
            line.setAttribute('stroke', '#ff9800');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-dasharray', '4,2');
            g.appendChild(line);
          }
        }
        break;
      }
    }

    const target = this.blocksLayer || this.svg;
    target.appendChild(g);
    this._annotationElements.set(annotation.id, g);

    // --- Annotation interactivity: select, drag, edit, delete ---
    this._setupAnnotationInteractivity(g, annotation);
  }

  /**
   * Wire up selection, drag, double-click-to-edit, and Delete-key
   * removal for an annotation SVG group element.
   * @private
   */
  _setupAnnotationInteractivity(g, annotation) {
    g.style.cursor = annotation.type === 'dimension' ? 'pointer' : 'move';
    g.setAttribute('pointer-events', 'all');

    // Add a transparent hit rect so clicks register everywhere in the group
    const ns = 'http://www.w3.org/2000/svg';
    const hitRect = document.createElementNS(ns, 'rect');
    const x = annotation.x || 0;
    const y = annotation.y || 0;
    const w = annotation.width || 120;
    const h = annotation.height || 30;
    hitRect.setAttribute('x', x);
    hitRect.setAttribute('y', y);
    hitRect.setAttribute('width', w);
    hitRect.setAttribute('height', h);
    hitRect.setAttribute('fill', 'transparent');
    hitRect.setAttribute('stroke', 'none');
    g.insertBefore(hitRect, g.firstChild);

    let isDraggingAnn = false;
    let dragStartX = 0, dragStartY = 0;
    let annStartX = 0, annStartY = 0;

    // --- SELECT on click ---
    g.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      // Deselect other annotations
      if (this._annotationElements) {
        this._annotationElements.forEach(el => el.classList.remove('annotation-selected'));
      }
      g.classList.add('annotation-selected');
      this._selectedAnnotation = annotation;

      // Show selection outline
      g.querySelectorAll('.ann-select-outline').forEach(el => el.remove());
      const outline = document.createElementNS(ns, 'rect');
      outline.setAttribute('x', (annotation.x || 0) - 3);
      outline.setAttribute('y', (annotation.y || 0) - 3);
      outline.setAttribute('width', (annotation.width || 120) + 6);
      outline.setAttribute('height', (annotation.height || 30) + 6);
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', '#FF6B35');
      outline.setAttribute('stroke-width', '2');
      outline.setAttribute('stroke-dasharray', '4,3');
      outline.setAttribute('class', 'ann-select-outline');
      outline.setAttribute('pointer-events', 'none');
      g.insertBefore(outline, g.firstChild);

      // Drag initialisation (not for dimensions — they track blocks)
      if (annotation.type !== 'dimension') {
        isDraggingAnn = true;
        const svgPt = this._clientToSVG(e.clientX, e.clientY);
        if (svgPt) {
          dragStartX = svgPt.x;
          dragStartY = svgPt.y;
        }
        annStartX = annotation.x || 0;
        annStartY = annotation.y || 0;
      }
    });

    // --- DRAG on mousemove ---
    const onMouseMove = (e) => {
      if (!isDraggingAnn) return;
      const svgPt = this._clientToSVG(e.clientX, e.clientY);
      if (!svgPt) return;
      const dx = svgPt.x - dragStartX;
      const dy = svgPt.y - dragStartY;
      annotation.x = annStartX + dx;
      annotation.y = annStartY + dy;
      // Re-render to reflect new position
      this.renderAnnotation(annotation);
    };
    const onMouseUp = () => {
      if (isDraggingAnn) {
        isDraggingAnn = false;
        if (this.editor) this.editor._markDirty();
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    g.addEventListener('mousedown', () => {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // --- DOUBLE-CLICK to edit text ---
    g.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (annotation.type === 'dimension') return; // dimensions auto-compute text
      const newText = prompt('Edit annotation:', annotation.text || '');
      if (newText !== null) {
        annotation.text = newText;
        this.renderAnnotation(annotation);
        if (this.editor) this.editor._markDirty();
      }
    });

    // --- DELETE key ---
    // We use a global keydown listener scoped to this annotation's
    // selected state via _selectedAnnotation.
    if (!this._annotationDeleteListenerInstalled) {
      this._annotationDeleteListenerInstalled = true;
      document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this._selectedAnnotation) {
          // Don't delete if an input / textarea is focused
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
          e.preventDefault();
          const annId = this._selectedAnnotation.id;
          // Remove from data model
          if (this.editor && this.editor.diagram && this.editor.diagram.annotations) {
            this.editor.diagram.annotations = this.editor.diagram.annotations.filter(
              a => a.id !== annId
            );
            this.editor._markDirty();
          }
          // Remove from DOM
          const el = this._annotationElements.get(annId);
          if (el) el.remove();
          this._annotationElements.delete(annId);
          this._selectedAnnotation = null;
        }
      });
    }
  }

  /**
   * Schedule a batched connection re-render for the given connection IDs.
   * Uses requestAnimationFrame to coalesce multiple updates in a single
   * frame, avoiding per-pixel re-renders during block drags.
   */
  scheduleConnectionRender(connectionIds) {
    if (!this._pendingConnRender) {
      this._pendingConnRender = new Set();
    }
    connectionIds.forEach(id => this._pendingConnRender.add(id));

    if (!this._connRenderRaf) {
      this._connRenderRaf = requestAnimationFrame(() => {
        this._connRenderRaf = null;
        const pending = this._pendingConnRender;
        this._pendingConnRender = null;
        if (!pending || !this.editor) return;
        pending.forEach(connId => {
          const conn = this.editor.diagram.connections.find(c => c.id === connId);
          if (conn) this.renderConnection(conn);
        });
      });
    }
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