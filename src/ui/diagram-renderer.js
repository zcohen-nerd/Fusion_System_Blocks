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

    // Same-level stub connections are rendered by renderSameLevelStubs()
    if (connection.renderAsStub) {
      return null;
    }

    const fromBlock = this.editor.diagram.blocks.find(b => b.id === connection.fromBlock);
    const toBlock = this.editor.diagram.blocks.find(b => b.id === connection.toBlock);

    // Allow group IDs as connection endpoints — resolve to a pseudo-block
    // using the group's boundary bounds so connections render correctly.
    const resolveEndpoint = (block, endpointId) => {
      if (block) return block;
      if (window.advancedFeatures) {
        const group = window.advancedFeatures.groups.get(endpointId);
        if (group && group.bounds) {
          return {
            id: endpointId,
            x: group.bounds.x,
            y: group.bounds.y,
            width: group.bounds.width,
            height: group.bounds.height,
            _isGroup: true
          };
        }
      }
      return null;
    };
    const resolvedFrom = resolveEndpoint(fromBlock, connection.fromBlock);
    const resolvedTo = resolveEndpoint(toBlock, connection.toBlock);

    if (!resolvedFrom || !resolvedTo) {
      logger.warn('renderConnection: missing block(s) for', connection.id,
        'from:', connection.fromBlock, !!resolvedFrom,
        'to:', connection.toBlock, !!resolvedTo);
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
    const fromW = resolvedFrom.width  || 120;
    const fromH = resolvedFrom.height || 80;
    const toW   = resolvedTo.width    || 120;
    const toH   = resolvedTo.height   || 80;

    // Fan offset: use unified fan map so regular connections, stubs,
    // and named stubs all share the same slot distribution per port side.
    if (!this._cachedFanMap) {
      this._cachedFanMap = this._buildUnifiedFanMap(this.editor.diagram);
    }
    const outSlot = this._lookupFanSlot(this._cachedFanMap, connection.fromBlock, fromPort, 'conn-from', connection.id);
    const inSlot  = this._lookupFanSlot(this._cachedFanMap, connection.toBlock, toPort, 'conn-to', connection.id);
    const outIdx = outSlot.index;
    const outTotal = outSlot.total;
    const inIdx  = inSlot.index;
    const inTotal = inSlot.total;

    let fromX, fromY, toX, toY;

    // Source endpoint
    switch (fromPort) {
      case 'input':
        fromX = resolvedFrom.x;
        fromY = resolvedFrom.y + this._fanOffset(outIdx, outTotal, fromH);
        break;
      case 'top':
        fromX = resolvedFrom.x + this._fanOffset(outIdx, outTotal, fromW);
        fromY = resolvedFrom.y;
        break;
      case 'bottom':
        fromX = resolvedFrom.x + this._fanOffset(outIdx, outTotal, fromW);
        fromY = resolvedFrom.y + fromH;
        break;
      default: // 'output'
        fromX = resolvedFrom.x + fromW;
        fromY = resolvedFrom.y + this._fanOffset(outIdx, outTotal, fromH);
        break;
    }

    // Target endpoint
    switch (toPort) {
      case 'output':
        toX = resolvedTo.x + toW;
        toY = resolvedTo.y + this._fanOffset(inIdx, inTotal, toH);
        break;
      case 'top':
        toX = resolvedTo.x + this._fanOffset(inIdx, inTotal, toW);
        toY = resolvedTo.y;
        break;
      case 'bottom':
        toX = resolvedTo.x + this._fanOffset(inIdx, inTotal, toW);
        toY = resolvedTo.y + toH;
        break;
      default: // 'input'
        toX = resolvedTo.x;
        toY = resolvedTo.y + this._fanOffset(inIdx, inTotal, toH);
        break;
    }

    // Determine whether this is a vertical connection (top/bottom ports)
    const isVerticalFrom = (fromPort === 'top' || fromPort === 'bottom');
    const isVerticalTo   = (toPort === 'top' || toPort === 'bottom');
    const isMixed = isVerticalFrom !== isVerticalTo;      // one H, one V
    const isVertical = isVerticalFrom && isVerticalTo;    // both V

    // Choose path based on routing mode
    let d;
    if (this.routingMode === 'orthogonal') {
      if (isMixed) {
        d = this._computeMixedAxisPath(fromX, fromY, toX, toY, fromPort, toPort);
      } else if (isVertical) {
        d = this._computeVerticalOrthogonalPath(fromX, fromY, toX, toY, fromPort, toPort);
      } else {
        d = this._computeOrthogonalPath(fromX, fromY, toX, toY, connection);
      }
    } else {
      if (isMixed) {
        // Mixed Bezier: stub horizontally from H-port, vertically from
        // V-port, join with a smooth curve through the corner.
        d = this._computeMixedAxisBezier(fromX, fromY, toX, toY, fromPort, toPort);
      } else if (isVertical) {
        // Vertical Bezier: stubs go up/down then curve across
        d = this._computeCollisionAwareBezier(
          fromX, fromY, toX, toY, fromPort, toPort, connection, true);
      } else {
        // Default horizontal Bezier curve with collision avoidance
        d = this._computeCollisionAwareBezier(
          fromX, fromY, toX, toY, fromPort, toPort, connection, false);
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

    // Directional arrows — use manual polygon arrows for both ends.
    // SVG marker-end auto-rotates based on path tangent, which can
    // cause arrowheads to render perpendicular to the block face on
    // curved or backward connections.  Manual arrows use the port
    // direction instead, ensuring they always align with the block edge.
    // (We already use manual start arrows as a CEF workaround.)

    // Append path BEFORE manual arrows so the arrow polygon renders
    // on top of the connection line (correct SVG stacking order).
    group.appendChild(path);

    // Forward arrow at target (end) — uses toPort for alignment
    if (direction === 'forward' || direction === 'bidirectional') {
      this._addManualEndArrow(group, toX, toY, fromX, fromY, styling.stroke, styling.strokeWidth, toPort);
    }

    // Backward/bidirectional arrow at source (start)
    if (direction === 'bidirectional' || direction === 'backward') {
      this._addManualStartArrow(group, fromX, fromY, toX, toY, styling.stroke, styling.strokeWidth, fromPort);
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
   * Build a unified fan layout map for all connections on every
   * (blockId, portSide) pair.  This ensures regular connections,
   * same-level stubs, and named stubs all share the same slot
   * distribution and don't overlap.
   *
   * Returns a Map keyed by "blockId:portSide", where each value is
   * { total, items: [ { type, id, index }, ... ] }.
   *
   * Callers can look up their item by type+id to get the index and
   * total for _fanOffset.
   */
  _buildUnifiedFanMap(diagram) {
    const fanMap = {};

    const addItem = (blockId, portSide, type, id) => {
      const key = blockId + ':' + portSide;
      if (!fanMap[key]) fanMap[key] = [];
      fanMap[key].push({ type, id });
    };

    // 1. Regular connections (non-stub)
    (diagram.connections || []).forEach(conn => {
      if (conn.renderAsStub) return;
      const fromPort = conn.fromPort || 'output';
      const toPort = conn.toPort || 'input';
      addItem(conn.fromBlock, fromPort, 'conn-from', conn.id);
      addItem(conn.toBlock, toPort, 'conn-to', conn.id);
    });

    // 2. Same-level stub connections (renderAsStub)
    (diagram.connections || []).forEach(conn => {
      if (!conn.renderAsStub) return;
      const fromPort = conn.fromPort || 'output';
      const toPort = conn.toPort || 'input';
      addItem(conn.fromBlock, fromPort, 'stub-from', conn.id);
      addItem(conn.toBlock, toPort, 'stub-to', conn.id);
    });

    // 3. Named stubs (net labels)
    (diagram.namedStubs || []).forEach(stub => {
      addItem(stub.blockId, stub.portSide || 'output', 'named-stub', stub.id);
    });

    // Assign sequential indices
    const result = new Map();
    for (const key of Object.keys(fanMap)) {
      const items = fanMap[key];
      items.forEach((item, i) => { item.index = i; });
      result.set(key, { total: items.length, items });
    }
    return result;
  }

  /**
   * Look up the fan slot for a specific item in the unified fan map.
   * @param {Map} fanMap - Result of _buildUnifiedFanMap.
   * @param {string} blockId
   * @param {string} portSide
   * @param {string} type - 'conn-from', 'conn-to', 'stub-from', 'stub-to', 'named-stub'
   * @param {string} id - connection or stub ID
   * @returns {{ index: number, total: number }}
   */
  _lookupFanSlot(fanMap, blockId, portSide, type, id) {
    const key = blockId + ':' + portSide;
    const entry = fanMap.get(key);
    if (!entry) return { index: 0, total: 1 };
    const item = entry.items.find(i => i.type === type && i.id === id);
    if (!item) return { index: 0, total: entry.total || 1 };
    return { index: item.index, total: entry.total };
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
  _addManualStartArrow(group, fromX, fromY, toX, toY, fillColor, strokeWidth = 2, fromPort = 'output') {
    const size = 10;

    // Derive arrow direction from the port name so the arrowhead
    // always aligns with the port's axis, regardless of Bezier
    // control-point positions.
    let segAngle;
    switch (fromPort) {
      case 'input':
        segAngle = Math.PI; // port faces left → path goes left
        break;
      case 'top':
        segAngle = -Math.PI / 2; // port faces up → path goes up
        break;
      case 'bottom':
        segAngle = Math.PI / 2; // port faces down → path goes down
        break;
      default: // 'output'
        segAngle = 0; // port faces right → path goes right
        break;
    }

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
   * Render a manual forward-arrow polygon at the END of a connection path.
   * The arrow tip sits at (toX, toY) and points INTO the target block
   * along the port axis, so it always aligns with the block edge.
   *
   * @param {SVGGElement} group     Parent <g> to append to.
   * @param {number}      toX       Target X.
   * @param {number}      toY       Target Y.
   * @param {number}      fromX     Source X (unused, kept for symmetry).
   * @param {number}      fromY     Source Y (unused, kept for symmetry).
   * @param {string}      fillColor Arrow fill colour.
   * @param {number}      strokeWidth
   * @param {string}      toPort    Target port name.
   */
  _addManualEndArrow(group, toX, toY, fromX, fromY, fillColor, strokeWidth = 2, toPort = 'input') {
    const size = 10;

    // The arrow should point INTO the block along the port axis.
    // segAngle is the direction the arrow tip faces (into the block).
    // The base extends opposite (awayAngle = segAngle + π).
    let segAngle;
    switch (toPort) {
      case 'output':
        segAngle = Math.PI; // port on right edge → arrow points left (into block)
        break;
      case 'top':
        segAngle = Math.PI / 2; // port on top edge → arrow points down (into block)
        break;
      case 'bottom':
        segAngle = -Math.PI / 2; // port on bottom edge → arrow points up (into block)
        break;
      default: // 'input'
        segAngle = 0; // port on left edge → arrow points right (into block)
        break;
    }

    const tipX = toX;
    const tipY = toY;

    const halfSpread = Math.atan2(3.5, 10); // ~19°
    // Base extends AWAY from the block (opposite to segAngle = into block)
    // The base is along the incoming path direction, which is opposite
    // to the port's inward direction.
    const awayAngle = segAngle + Math.PI; // reverse direction
    const baseX1 = tipX + Math.cos(awayAngle + halfSpread) * size;
    const baseY1 = tipY + Math.sin(awayAngle + halfSpread) * size;
    const baseX2 = tipX + Math.cos(awayAngle - halfSpread) * size;
    const baseY2 = tipY + Math.sin(awayAngle - halfSpread) * size;

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points',
      `${tipX},${tipY} ${baseX1},${baseY1} ${baseX2},${baseY2}`);
    arrow.setAttribute('fill', fillColor);
    arrow.setAttribute('stroke', fillColor);
    arrow.setAttribute('stroke-width', '0.5');
    arrow.setAttribute('stroke-linejoin', 'round');
    arrow.setAttribute('class', 'manual-end-arrow');
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
   * Compute an orthogonal path for mixed-axis connections where one
   * port is horizontal (input/output) and the other is vertical
   * (top/bottom).  Stubs extend along each port's natural axis, then
   * join with a right-angle turn.
   * @private
   */
  _computeMixedAxisPath(fromX, fromY, toX, toY, fromPort, toPort) {
    const STUB = 20;

    // Determine stub direction for each port along its own axis
    const hDir = (port) => {
      if (port === 'output') return 1;    // right
      if (port === 'input')  return -1;   // left
      return 0;
    };
    const vDir = (port) => {
      if (port === 'bottom') return 1;    // down
      if (port === 'top')    return -1;   // up
      return 0;
    };

    const isVerticalFrom = (fromPort === 'top' || fromPort === 'bottom');

    if (isVerticalFrom) {
      // From = vertical port, To = horizontal port
      const fDir = vDir(fromPort);                       // ±1 vertical
      const tDir = hDir(toPort);                         // ±1 horizontal
      const stubFromY = fromY + STUB * fDir;
      const stubToX   = toX   + STUB * tDir;
      // Route: vertical stub → horizontal jog → vertical span → horizontal stub into target
      // Simple L-turn when stubs can reach the corner directly.
      // Use the target's X for the vertical run and the source's Y for the horizontal run via
      // a corner point at (stubToX, stubFromY).
      return `M ${fromX} ${fromY} L ${fromX} ${stubFromY} ` +
             `L ${stubToX} ${stubFromY} L ${stubToX} ${toY} L ${toX} ${toY}`;
    } else {
      // From = horizontal port, To = vertical port
      const fDir = hDir(fromPort);                       // ±1 horizontal
      const tDir = vDir(toPort);                         // ±1 vertical
      const stubFromX = fromX + STUB * fDir;
      const stubToY   = toY   + STUB * tDir;
      // Corner at (stubFromX, stubToY)
      return `M ${fromX} ${fromY} L ${stubFromX} ${fromY} ` +
             `L ${stubFromX} ${stubToY} L ${toX} ${stubToY} L ${toX} ${toY}`;
    }
  }

  /**
   * Compute a Bezier curve that avoids passing through intermediate blocks.
   * Samples the default Bezier at several points; if any sample lands inside
   * an obstacle, the control points are shifted vertically (for horizontal
   * connections) or horizontally (for vertical ones) to route around them.
   * @private
   */
  _computeCollisionAwareBezier(fromX, fromY, toX, toY, fromPort, toPort, connection, isVertical) {
    const blocks = this.editor.diagram.blocks || [];
    const obstacles = blocks
      .filter(b => b.id !== connection.fromBlock && b.id !== connection.toBlock)
      .map(b => ({ x: b.x, y: b.y, w: b.width || 120, h: b.height || 80 }));

    if (isVertical) {
      // Vertical Bezier: stubs go up/down then curve across
      const dy = Math.abs(toY - fromY);
      const dx = toX - fromX;
      const xBulge = Math.abs(dx) < 10 ? Math.max(30, dy * 0.15) : 0;
      const midY = (fromY + toY) / 2;
      let cp1x = fromX - xBulge, cp1y = midY;
      let cp2x = toX - xBulge,   cp2y = midY;

      // Check for collisions and nudge control points horizontally
      const nudge = this._bezierCollisionNudge(
        fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY, obstacles, 'x');
      cp1x += nudge;
      cp2x += nudge;

      return `M ${fromX} ${fromY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${toX} ${toY}`;
    }

    // Horizontal Bezier: stubs go left/right then curve vertically
    const dx = Math.abs(toX - fromX);
    const dy = toY - fromY;
    const yBulge = Math.abs(dy) < 10 ? Math.max(30, dx * 0.15) : 0;
    const midX = (fromX + toX) / 2;
    let cp1x = midX, cp1y = fromY - yBulge;
    let cp2x = midX, cp2y = toY - yBulge;

    // Check for collisions and nudge control points vertically
    const nudge = this._bezierCollisionNudge(
      fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY, obstacles, 'y');
    cp1y += nudge;
    cp2y += nudge;

    return `M ${fromX} ${fromY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${toX} ${toY}`;
  }

  /**
   * Sample a cubic Bezier at several t values and check for collisions
   * with obstacles. Returns an offset to apply to control points on
   * the given axis ('x' or 'y') to route the curve around obstacles.
   * @private
   */
  _bezierCollisionNudge(p0x, p0y, cp1x, cp1y, cp2x, cp2y, p3x, p3y, obstacles, axis) {
    if (obstacles.length === 0) return 0;

    // Sample the Bezier at several points
    const samples = 8;
    const margin = 6;
    let hasCollision = false;
    let collisionCenter = 0;

    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      const t2 = t * t, t3 = t2 * t;
      const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt;
      const sx = mt3 * p0x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * p3x;
      const sy = mt3 * p0y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * p3y;

      for (const obs of obstacles) {
        if (sx > obs.x - margin && sx < obs.x + obs.w + margin &&
            sy > obs.y - margin && sy < obs.y + obs.h + margin) {
          hasCollision = true;
          collisionCenter = axis === 'y'
            ? (obs.y + obs.h / 2) : (obs.x + obs.w / 2);
          break;
        }
      }
      if (hasCollision) break;
    }

    if (!hasCollision) return 0;

    // Decide nudge direction: push control points away from the obstacle
    const curveMid = axis === 'y'
      ? (p0y + p3y) / 2 : (p0x + p3x) / 2;
    const sign = curveMid < collisionCenter ? -1 : 1;

    // Nudge by enough to clear the obstacle (try increasing amounts)
    for (const amount of [40, 70, 110, 160]) {
      const nudge = sign * amount;
      let clear = true;
      for (let i = 1; i < samples; i++) {
        const t = i / samples;
        const t2 = t * t, t3 = t2 * t;
        const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt;
        let ncp1x = cp1x, ncp1y = cp1y, ncp2x = cp2x, ncp2y = cp2y;
        if (axis === 'y') { ncp1y += nudge; ncp2y += nudge; }
        else { ncp1x += nudge; ncp2x += nudge; }
        const sx = mt3 * p0x + 3 * mt2 * t * ncp1x + 3 * mt * t2 * ncp2x + t3 * p3x;
        const sy = mt3 * p0y + 3 * mt2 * t * ncp1y + 3 * mt * t2 * ncp2y + t3 * p3y;
        for (const obs of obstacles) {
          if (sx > obs.x - margin && sx < obs.x + obs.w + margin &&
              sy > obs.y - margin && sy < obs.y + obs.h + margin) {
            clear = false;
            break;
          }
        }
        if (!clear) break;
      }
      if (clear) return nudge;
    }
    // Couldn't fully clear — use largest nudge as best effort
    return sign * 160;
  }

  /**
   * Compute a smooth Bezier curve for mixed-axis connections.
   * The control points extend along each port's natural axis so the
   * curve leaves and arrives in the correct direction.
   * @private
   */
  _computeMixedAxisBezier(fromX, fromY, toX, toY, fromPort, toPort) {
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const cpLen = Math.max(40, dist * 0.35);    // control point offset

    let cp1x = fromX, cp1y = fromY;
    switch (fromPort) {
      case 'output':  cp1x += cpLen; break;
      case 'input':   cp1x -= cpLen; break;
      case 'top':     cp1y -= cpLen; break;
      case 'bottom':  cp1y += cpLen; break;
    }

    let cp2x = toX, cp2y = toY;
    switch (toPort) {
      case 'output':  cp2x += cpLen; break;
      case 'input':   cp2x -= cpLen; break;
      case 'top':     cp2y -= cpLen; break;
      case 'bottom':  cp2y += cpLen; break;
    }

    return `M ${fromX} ${fromY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${toX} ${toY}`;
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
    let group = this.connectionElements.get(connectionId);
    // Also check cross-diagram and same-level stubs which are not in connectionElements
    if (!group && this.svg) {
      group = this.svg.querySelector(`.cross-diagram-stub[data-connection-id="${connectionId}"]`) ||
              this.svg.querySelector(`.same-level-stub[data-connection-id="${connectionId}"]`);
    }
    if (!group) return;

    const line = group.querySelector('.connection-line');
    if (line) {
      // Regular connection path
      if (highlight) {
        line.setAttribute('stroke', '#FF6B35');
        line.setAttribute('stroke-width', '3');
      } else {
        const connType = group.getAttribute('data-connection-type') || 'auto';
        const styling = this.getConnectionStyling(connType);
        line.setAttribute('stroke', styling.stroke);
        line.setAttribute('stroke-width', String(styling.strokeWidth));
      }
    } else {
      // Cross-diagram stub — highlight the visible (non-transparent) line
      const stubLines = group.querySelectorAll('line');
      const stubLine = stubLines.length > 1 ? stubLines[1] : stubLines[0]; // [0]=hit area, [1]=visible
      if (stubLine) {
        if (highlight) {
          stubLine.setAttribute('data-orig-stroke', stubLine.getAttribute('stroke'));
          stubLine.setAttribute('data-orig-width', stubLine.getAttribute('stroke-width'));
          stubLine.setAttribute('stroke-width', '4');
          stubLine.setAttribute('stroke', '#FFD700');
          group.setAttribute('data-highlighted', 'true');
        } else {
          stubLine.setAttribute('stroke', stubLine.getAttribute('data-orig-stroke') || '#666');
          stubLine.setAttribute('stroke-width', stubLine.getAttribute('data-orig-width') || '2');
          group.removeAttribute('data-highlighted');
        }
      }
    }
  }

  clearConnectionHighlights() {
    this.connectionElements.forEach((group, id) => {
      this.highlightConnection(id, false);
    });
    // Also clear any highlighted cross-diagram, same-level, and named stubs
    if (this.svg) {
      this.svg.querySelectorAll('.cross-diagram-stub[data-highlighted], .same-level-stub[data-highlighted], .named-stub[data-highlighted]').forEach(g => {
        const stubLines = g.querySelectorAll('line');
        const stubLine = stubLines.length > 1 ? stubLines[1] : stubLines[0];
        if (stubLine) {
          stubLine.setAttribute('stroke', stubLine.getAttribute('data-orig-stroke') || '#666');
          stubLine.setAttribute('stroke-width', stubLine.getAttribute('data-orig-width') || '2');
        }
        g.removeAttribute('data-highlighted');
      });
    }
  }

  /**
   * Highlight or un-highlight a named stub by its stub ID.
   */
  highlightNamedStub(stubId, highlight = true) {
    if (!this.svg) return;
    const group = this.svg.querySelector(`.named-stub[data-stub-id="${stubId}"]`);
    if (!group) return;

    const stubLines = group.querySelectorAll('line');
    const stubLine = stubLines.length > 1 ? stubLines[1] : stubLines[0];
    if (!stubLine) return;

    if (highlight) {
      stubLine.setAttribute('data-orig-stroke', stubLine.getAttribute('stroke'));
      stubLine.setAttribute('data-orig-width', stubLine.getAttribute('stroke-width'));
      stubLine.setAttribute('stroke-width', '4');
      stubLine.setAttribute('stroke', '#FFD700');
      group.setAttribute('data-highlighted', 'true');
    } else {
      stubLine.setAttribute('stroke', stubLine.getAttribute('data-orig-stroke') || '#666');
      stubLine.setAttribute('stroke-width', stubLine.getAttribute('data-orig-width') || '2');
      group.removeAttribute('data-highlighted');
    }
  }

  updateAllBlocks(diagram) {
    // Invalidate the unified fan-map cache so it is rebuilt fresh
    this._cachedFanMap = null;

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

    // Render cross-diagram connection stubs for connections whose
    // remote endpoint is not in this diagram view.
    this.renderCrossDiagramStubs(diagram);

    // Render same-level stub connections (renderAsStub flag)
    this.renderSameLevelStubs(diagram);

    // Render named stubs (net labels)
    this.renderNamedStubs(diagram);

    // Render all annotations
    if (diagram.annotations) {
      diagram.annotations.forEach(ann => this.renderAnnotation(ann));
    }
  }

  // ---- Cross-diagram connection stubs ----

  /**
   * Render stub indicators for connections that reference blocks not
   * present in the current diagram (i.e. cross-diagram connections).
   * Each stub shows a short line + flag with the remote block name.
   */
  renderCrossDiagramStubs(diagram) {
    // Clear any previous stubs
    const svg = this.svg;
    if (!svg) return;
    svg.querySelectorAll('.cross-diagram-stub').forEach(el => el.remove());

    const blockIds = new Set((diagram.blocks || []).map(b => b.id));

    // Collect ALL cross-diagram connections: from this diagram, from child
    // diagrams, and from parent/ancestor diagrams in the hierarchy stack.
    const crossConns = [];
    const seen = new Set();
    const addIfCross = (conn) => {
      if (seen.has(conn.id || (conn.fromBlock + '-' + conn.toBlock))) return;
      const fromLocal = blockIds.has(conn.fromBlock);
      const toLocal   = blockIds.has(conn.toBlock);
      if (fromLocal !== toLocal) {
        seen.add(conn.id || (conn.fromBlock + '-' + conn.toBlock));
        crossConns.push(conn);
      }
    };

    // 1. Current diagram's own connections
    (diagram.connections || []).forEach(addIfCross);

    // 2. Child diagram connections that reference a block in this diagram
    const scanChildren = (blocks) => {
      for (const b of (blocks || [])) {
        if (b.childDiagram) {
          (b.childDiagram.connections || []).forEach(addIfCross);
          scanChildren(b.childDiagram.blocks);
        }
      }
    };
    scanChildren(diagram.blocks);

    // 3. Parent / ancestor diagrams from the hierarchy stack
    if (window.advancedFeatures && window.advancedFeatures._hierarchyStack) {
      for (const entry of window.advancedFeatures._hierarchyStack) {
        (entry.diagram.connections || []).forEach(addIfCross);
        scanChildren(entry.diagram.blocks);
      }
    }

    // Pre-compute fan offsets: group stubs by (localBlockId, portSide)
    // so multiple stubs sharing a port side are distributed evenly.
    const fanGroups = new Map(); // key: "blockId:portSide" → conn[]
    crossConns.forEach(conn => {
      const fromLocal = blockIds.has(conn.fromBlock);
      const localBlockId = fromLocal ? conn.fromBlock : conn.toBlock;
      const portSide = fromLocal
        ? (conn.fromPort || 'output')
        : (conn.toPort   || 'input');
      const key = `${localBlockId}:${portSide}`;
      if (!fanGroups.has(key)) fanGroups.set(key, []);
      fanGroups.get(key).push(conn);
    });

    crossConns.forEach(conn => {
      const fromLocal = blockIds.has(conn.fromBlock);
      const toLocal   = blockIds.has(conn.toBlock);

      const localBlockId = fromLocal ? conn.fromBlock : conn.toBlock;
      const remoteBlockId = fromLocal ? conn.toBlock : conn.fromBlock;
      const isOutgoing = fromLocal; // stub goes OUT from a local block

      const localBlock = diagram.blocks.find(b => b.id === localBlockId);
      if (!localBlock) return;

      // Try to resolve the remote block name from the hierarchy
      let remoteName = remoteBlockId;
      if (window.advancedFeatures && window.advancedFeatures._hierarchyStack) {
        // Walk the hierarchy to find the block
        const findInDiagram = (d) => {
          for (const b of (d.blocks || [])) {
            if (b.id === remoteBlockId) return b.name || b.id;
            if (b.childDiagram) {
              const found = findInDiagram(b.childDiagram);
              if (found) return found;
            }
          }
          return null;
        };
        // Search from root
        const stack = window.advancedFeatures._hierarchyStack;
        const root = stack.length > 0 ? stack[0].diagram : diagram;
        remoteName = findInDiagram(root) || remoteBlockId;
      }

      // Position the stub based on the actual port side, using fan
      // layout when multiple stubs share the same port.
      const w = localBlock.width || 120;
      const h = localBlock.height || 80;
      const stubLen = 30;

      const portSide = isOutgoing
        ? (conn.fromPort || 'output')
        : (conn.toPort   || 'input');
      const fanKey = `${localBlockId}:${portSide}`;
      const siblings = fanGroups.get(fanKey) || [conn];
      const fanIdx = siblings.indexOf(conn);
      const fanTotal = siblings.length;

      let startX, startY, endX, endY;
      // isStubHorizontal tracks whether the stub line extends left/right
      // (true) or up/down (false) — used later for arrow & label placement.
      let isStubHorizontal = true;

      switch (portSide) {
        case 'output':
          startX = localBlock.x + w;
          startY = localBlock.y + this._fanOffset(fanIdx, fanTotal, h);
          endX = startX + stubLen;
          endY = startY;
          break;
        case 'input':
          startX = localBlock.x;
          startY = localBlock.y + this._fanOffset(fanIdx, fanTotal, h);
          endX = startX - stubLen;
          endY = startY;
          break;
        case 'top':
          startX = localBlock.x + this._fanOffset(fanIdx, fanTotal, w);
          startY = localBlock.y;
          endX = startX;
          endY = startY - stubLen;
          isStubHorizontal = false;
          break;
        case 'bottom':
          startX = localBlock.x + this._fanOffset(fanIdx, fanTotal, w);
          startY = localBlock.y + h;
          endX = startX;
          endY = startY + stubLen;
          isStubHorizontal = false;
          break;
        default: // fallback — treat as output
          startX = localBlock.x + w;
          startY = localBlock.y + this._fanOffset(fanIdx, fanTotal, h);
          endX = startX + stubLen;
          endY = startY;
          break;
      }

      // --- Connection type styling (match regular connections) ---
      const connType = (conn.type || 'auto').toLowerCase();
      const styling = this.getConnectionStyling(connType);
      const direction = (conn.arrowDirection || 'forward').toLowerCase();

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'cross-diagram-stub connection-group');
      g.setAttribute('data-connection-id', conn.id);
      g.setAttribute('data-cross-diagram', 'true');
      g.setAttribute('data-connection-type', connType);

      // Wide invisible hit area for click / right-click
      const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hitLine.setAttribute('x1', startX);
      hitLine.setAttribute('y1', startY);
      hitLine.setAttribute('x2', endX);
      hitLine.setAttribute('y2', endY);
      hitLine.setAttribute('stroke', 'transparent');
      hitLine.setAttribute('stroke-width', '14');
      hitLine.setAttribute('pointer-events', 'stroke');
      hitLine.setAttribute('cursor', 'pointer');
      g.appendChild(hitLine);

      // Stub line — type-specific colour, width, and dash
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', endX);
      line.setAttribute('y2', endY);
      line.setAttribute('stroke', styling.stroke);
      line.setAttribute('stroke-width', String(styling.strokeWidth));
      // Overlay a short cross-diagram dash on the type dash
      line.setAttribute('stroke-dasharray', styling.dashArray || '4,2');
      g.appendChild(line);

      // --- Arrowhead ---
      // For a stub, the "forward" tip points outward (toward remote block)
      // and the "backward" tip points inward (toward local block).
      const arrowSize = 8;
      const drawArrowAt = (tipX, tipY, direction2D) => {
        // direction2D: 'right' | 'left' | 'down' | 'up'
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        let pts;
        switch (direction2D) {
          case 'right':
            pts = `${tipX},${tipY} ${tipX - arrowSize},${tipY - arrowSize / 2} ${tipX - arrowSize},${tipY + arrowSize / 2}`;
            break;
          case 'left':
            pts = `${tipX},${tipY} ${tipX + arrowSize},${tipY - arrowSize / 2} ${tipX + arrowSize},${tipY + arrowSize / 2}`;
            break;
          case 'down':
            pts = `${tipX},${tipY} ${tipX - arrowSize / 2},${tipY - arrowSize} ${tipX + arrowSize / 2},${tipY - arrowSize}`;
            break;
          case 'up':
            pts = `${tipX},${tipY} ${tipX - arrowSize / 2},${tipY + arrowSize} ${tipX + arrowSize / 2},${tipY + arrowSize}`;
            break;
          default:
            pts = `${tipX},${tipY} ${tipX - arrowSize},${tipY - arrowSize / 2} ${tipX - arrowSize},${tipY + arrowSize / 2}`;
        }
        poly.setAttribute('points', pts);
        poly.setAttribute('fill', styling.stroke);
        g.appendChild(poly);
      };

      // Map port sides to arrow directions
      const outwardDir = { output: 'right', input: 'left', top: 'up', bottom: 'down' }[portSide] || 'right';
      const inwardDir  = { output: 'left', input: 'right', top: 'down', bottom: 'up' }[portSide] || 'left';

      // Determine which end gets an arrow
      if (direction === 'forward') {
        drawArrowAt(endX, endY, outwardDir);
      } else if (direction === 'backward') {
        drawArrowAt(startX, startY, inwardDir);
      } else if (direction === 'bidirectional') {
        drawArrowAt(endX, endY, outwardDir);
        drawArrowAt(startX, startY, inwardDir);
      }
      // direction === 'none' → no arrows

      // Flag/label — position depends on horizontal vs vertical stub
      let labelX, labelY, labelAnchor, iconX, iconY;
      const arrowChar = isOutgoing ? '\u2192 ' : '\u2190 ';

      if (isStubHorizontal) {
        const isRight = (portSide === 'output');
        labelX = isRight ? endX + 4 : endX - 4;
        labelY = endY + 4;
        labelAnchor = isRight ? 'start' : 'end';
        iconX = labelX;
        iconY = endY - 8;
      } else {
        // Vertical stub — place label beside the stub end
        labelX = endX + 6;
        labelY = endY + 4;
        labelAnchor = 'start';
        iconX = endX + 6;
        iconY = endY - 8;
      }

      // Background rect (rendered after text to size it)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', labelX);
      text.setAttribute('y', labelY);
      text.setAttribute('font-size', '10');
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('fill', '#FF6B35');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', labelAnchor);
      text.textContent = arrowChar + remoteName;

      // Small circle at the end of stub (port indicator)
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', endX);
      circle.setAttribute('cy', endY);
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', '#FF6B35');
      g.appendChild(circle);

      // 🌐 icon prefix
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('x', iconX);
      icon.setAttribute('y', iconY);
      icon.setAttribute('font-size', '10');
      icon.setAttribute('text-anchor', labelAnchor);
      icon.textContent = '\uD83C\uDF10'; // 🌐
      g.appendChild(icon);

      g.appendChild(text);

      // Add tooltip via title element
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = (isOutgoing ? 'Outgoing' : 'Incoming') +
        ' cross-diagram connection ' + (isOutgoing ? 'to' : 'from') +
        ' "' + remoteName + '"';
      g.appendChild(title);

      svg.appendChild(g);
    }); // end crossConns.forEach
  }

  // ---- Same-level stub rendering ----

  /**
   * Render stub indicators for same-level connections that have
   * renderAsStub === true. Each stub connection draws a short outgoing
   * stub on the source block and a matching incoming stub on the
   * destination block, using the port fan layout to stack neatly.
   */
  renderSameLevelStubs(diagram) {
    const svg = this.svg;
    if (!svg) return;
    svg.querySelectorAll('.same-level-stub').forEach(el => el.remove());

    const stubConns = (diagram.connections || []).filter(c => c.renderAsStub);
    if (stubConns.length === 0) return;

    // Use the unified fan map so stubs share slots with regular
    // connections and named stubs on the same port side.
    if (!this._cachedFanMap) {
      this._cachedFanMap = this._buildUnifiedFanMap(diagram);
    }
    const fanMap = this._cachedFanMap;

    stubConns.forEach(conn => {
      const fromBlock = diagram.blocks.find(b => b.id === conn.fromBlock);
      const toBlock = diagram.blocks.find(b => b.id === conn.toBlock);
      if (!fromBlock || !toBlock) return;

      const connType = (conn.type || 'auto').toLowerCase();
      const styling = this.getConnectionStyling(connType);
      const direction = (conn.arrowDirection || 'forward').toLowerCase();
      const stubLen = 30;

      const fromPort = conn.fromPort || 'output';
      const toPort = conn.toPort || 'input';
      const fromW = fromBlock.width || 120;
      const fromH = fromBlock.height || 80;
      const toW = toBlock.width || 120;
      const toH = toBlock.height || 80;

      // Fan offset for source stub (unified)
      const outSlot = this._lookupFanSlot(fanMap, conn.fromBlock, fromPort, 'stub-from', conn.id);
      const outIdx = outSlot.index;

      // Fan offset for target stub (unified)
      const inSlot = this._lookupFanSlot(fanMap, conn.toBlock, toPort, 'stub-to', conn.id);
      const inIdx = inSlot.index;

      // --- Render source (outgoing) stub ---
      this._renderStubElement(svg, conn, fromBlock, fromPort, fromW, fromH,
        outIdx, outSlot.total, stubLen, styling, direction, true,
        toBlock.name || toBlock.id, connType);

      // --- Render target (incoming) stub ---
      this._renderStubElement(svg, conn, toBlock, toPort, toW, toH,
        inIdx, inSlot.total, stubLen, styling, direction, false,
        fromBlock.name || fromBlock.id, connType);
    });
  }

  /**
   * Render a single stub element (source or target side) for a
   * same-level stub connection.
   * @private
   */
  _renderStubElement(svg, conn, block, portSide, blockW, blockH,
                     fanIndex, fanTotal, stubLen, styling, direction,
                     isOutgoing, remoteName, connType) {
    let startX, startY, endX, endY;
    const fanY = this._fanOffset(fanIndex, fanTotal, blockH);
    const fanX = this._fanOffset(fanIndex, fanTotal, blockW);

    switch (portSide) {
      case 'input':
        startX = block.x;
        startY = block.y + fanY;
        endX = startX - stubLen;
        endY = startY;
        break;
      case 'top':
        startX = block.x + fanX;
        startY = block.y;
        endX = startX;
        endY = startY - stubLen;
        break;
      case 'bottom':
        startX = block.x + fanX;
        startY = block.y + blockH;
        endX = startX;
        endY = startY + stubLen;
        break;
      case 'output':
      default:
        startX = block.x + blockW;
        startY = block.y + fanY;
        endX = startX + stubLen;
        endY = startY;
        break;
    }

    const isHorizontal = (portSide === 'output' || portSide === 'input');

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'same-level-stub connection-group');
    g.setAttribute('data-connection-id', conn.id);
    g.setAttribute('data-stub-side', isOutgoing ? 'source' : 'target');
    g.setAttribute('data-connection-type', connType);

    // Wide invisible hit area
    const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hitLine.setAttribute('x1', startX);
    hitLine.setAttribute('y1', startY);
    hitLine.setAttribute('x2', endX);
    hitLine.setAttribute('y2', endY);
    hitLine.setAttribute('stroke', 'transparent');
    hitLine.setAttribute('stroke-width', '14');
    hitLine.setAttribute('pointer-events', 'stroke');
    hitLine.setAttribute('cursor', 'pointer');
    g.appendChild(hitLine);

    // Visible stub line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', styling.stroke);
    line.setAttribute('stroke-width', String(styling.strokeWidth));
    line.setAttribute('stroke-dasharray', styling.dashArray || '4,2');
    g.appendChild(line);

    // Arrowhead
    const arrowSize = 8;
    const drawArrowAt = (tipX, tipY, pointsRight) => {
      if (isHorizontal) {
        const dir = pointsRight ? 1 : -1;
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points',
          `${tipX},${tipY} ${tipX - dir * arrowSize},${tipY - arrowSize / 2} ${tipX - dir * arrowSize},${tipY + arrowSize / 2}`);
        poly.setAttribute('fill', styling.stroke);
        g.appendChild(poly);
      } else {
        const dir = pointsRight ? 1 : -1;  // reused as pointsDown
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points',
          `${tipX},${tipY} ${tipX - arrowSize / 2},${tipY - dir * arrowSize} ${tipX + arrowSize / 2},${tipY - dir * arrowSize}`);
        poly.setAttribute('fill', styling.stroke);
        g.appendChild(poly);
      }
    };

    // Arrow direction logic for stubs
    const stubPointsOutward = (portSide === 'output' || portSide === 'bottom');
    if (direction === 'forward') {
      if (isOutgoing) drawArrowAt(endX, endY, stubPointsOutward);
      else drawArrowAt(startX, startY, !stubPointsOutward);
    } else if (direction === 'backward') {
      if (isOutgoing) drawArrowAt(startX, startY, !stubPointsOutward);
      else drawArrowAt(endX, endY, stubPointsOutward);
    } else if (direction === 'bidirectional') {
      drawArrowAt(endX, endY, stubPointsOutward);
      drawArrowAt(startX, startY, !stubPointsOutward);
    }

    // Port indicator circle at stub end
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', endX);
    circle.setAttribute('cy', endY);
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', styling.stroke);
    g.appendChild(circle);

    // Label with remote block name
    const labelOffset = 4;
    let labelX, labelY, labelAnchor;
    if (isHorizontal) {
      labelX = (portSide === 'output') ? endX + labelOffset : endX - labelOffset;
      labelY = endY + 4;
      labelAnchor = (portSide === 'output') ? 'start' : 'end';
    } else {
      labelX = endX + labelOffset;
      labelY = (portSide === 'bottom') ? endY + 12 : endY - 4;
      labelAnchor = 'start';
    }

    const arrow = isOutgoing ? '\u2192 ' : '\u2190 ';
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', labelX);
    text.setAttribute('y', labelY);
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('fill', styling.stroke);
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('text-anchor', labelAnchor);
    text.textContent = arrow + remoteName;
    g.appendChild(text);

    // Tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = (isOutgoing ? 'Outgoing' : 'Incoming') +
      ' stub connection ' + (isOutgoing ? 'to' : 'from') +
      ' "' + remoteName + '"';
    g.appendChild(title);

    svg.appendChild(g);
  }

  // ---- Named stub (net label) rendering ----

  /**
   * Render net-label stubs for blocks that share a netName.
   * Each named stub draws a short line from the block edge with the
   * net name as its label.  Blocks sharing the same netName are
   * implicitly connected (like net labels in EDA schematic tools).
   */
  renderNamedStubs(diagram) {
    const svg = this.svg;
    if (!svg) return;
    svg.querySelectorAll('.named-stub').forEach(el => el.remove());

    const stubs = diagram.namedStubs || [];
    if (stubs.length === 0) return;

    // Use unified fan map so named stubs share slots with regular
    // connections and same-level stubs on the same port side.
    if (!this._cachedFanMap) {
      this._cachedFanMap = this._buildUnifiedFanMap(diagram);
    }
    const fanMap = this._cachedFanMap;

    // Assign a color to each unique net name for visual grouping
    const netNames = [...new Set(stubs.map(s => s.netName))];
    const netColors = {};
    const palette = [
      '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
      '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990'
    ];
    netNames.forEach((name, i) => {
      netColors[name] = palette[i % palette.length];
    });

    stubs.forEach(stub => {
      const block = diagram.blocks.find(b => b.id === stub.blockId);
      if (!block) return;

      const blockW = block.width || 120;
      const blockH = block.height || 80;
      const portSide = stub.portSide || 'output';
      const stubLen = 30;

      // Fan offset (unified)
      const slot = this._lookupFanSlot(fanMap, stub.blockId, portSide, 'named-stub', stub.id);
      const fanIdx = slot.index;
      const fanTotal = slot.total;

      // Get connection styling from stub type, then override color
      // with the net-specific color
      const baseStyling = this.getConnectionStyling(
        (stub.type || 'auto').toLowerCase()
      );
      const netColor = netColors[stub.netName] || baseStyling.stroke;

      // Compute position
      const fanY = this._fanOffset(fanIdx, fanTotal, blockH);
      const fanX = this._fanOffset(fanIdx, fanTotal, blockW);

      let startX, startY, endX, endY;
      switch (portSide) {
        case 'input':
          startX = block.x;
          startY = block.y + fanY;
          endX = startX - stubLen;
          endY = startY;
          break;
        case 'top':
          startX = block.x + fanX;
          startY = block.y;
          endX = startX;
          endY = startY - stubLen;
          break;
        case 'bottom':
          startX = block.x + fanX;
          startY = block.y + blockH;
          endX = startX;
          endY = startY + stubLen;
          break;
        case 'output':
        default:
          startX = block.x + blockW;
          startY = block.y + fanY;
          endX = startX + stubLen;
          endY = startY;
          break;
      }

      const isHorizontal = (portSide === 'output' || portSide === 'input');
      const direction = stub.direction || 'forward';

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'named-stub connection-group');
      g.setAttribute('data-stub-id', stub.id);
      g.setAttribute('data-net-name', stub.netName);

      // Wide invisible hit area
      const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hitLine.setAttribute('x1', startX);
      hitLine.setAttribute('y1', startY);
      hitLine.setAttribute('x2', endX);
      hitLine.setAttribute('y2', endY);
      hitLine.setAttribute('stroke', 'transparent');
      hitLine.setAttribute('stroke-width', '14');
      hitLine.setAttribute('pointer-events', 'stroke');
      hitLine.setAttribute('cursor', 'pointer');
      g.appendChild(hitLine);

      // Visible stub line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', endX);
      line.setAttribute('y2', endY);
      line.setAttribute('stroke', netColor);
      line.setAttribute('stroke-width', String(baseStyling.strokeWidth));
      line.setAttribute('stroke-dasharray', '4,2');
      g.appendChild(line);

      // Net name diamond/marker at the end
      const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const ds = 5; // diamond half-size
      diamond.setAttribute('points',
        `${endX},${endY - ds} ${endX + ds},${endY} ${endX},${endY + ds} ${endX - ds},${endY}`);
      diamond.setAttribute('fill', netColor);
      diamond.setAttribute('stroke', 'none');
      g.appendChild(diamond);

      // Arrowhead
      const arrowSize = 8;
      const stubPointsOutward = (portSide === 'output' || portSide === 'bottom');
      const drawArrow = (tipX, tipY, pointsRight) => {
        if (isHorizontal) {
          const dir = pointsRight ? 1 : -1;
          const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          poly.setAttribute('points',
            `${tipX},${tipY} ${tipX - dir * arrowSize},${tipY - arrowSize / 2} ${tipX - dir * arrowSize},${tipY + arrowSize / 2}`);
          poly.setAttribute('fill', netColor);
          g.appendChild(poly);
        } else {
          const dir = pointsRight ? 1 : -1;
          const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          poly.setAttribute('points',
            `${tipX},${tipY} ${tipX - arrowSize / 2},${tipY - dir * arrowSize} ${tipX + arrowSize / 2},${tipY - dir * arrowSize}`);
          poly.setAttribute('fill', netColor);
          g.appendChild(poly);
        }
      };

      if (direction === 'forward') {
        drawArrow(endX, endY, stubPointsOutward);
      } else if (direction === 'backward') {
        drawArrow(startX, startY, !stubPointsOutward);
      } else if (direction === 'bidirectional') {
        drawArrow(endX, endY, stubPointsOutward);
        drawArrow(startX, startY, !stubPointsOutward);
      }

      // Net name label
      const labelOffset = 4;
      let labelX, labelY, labelAnchor;
      if (isHorizontal) {
        labelX = (portSide === 'output') ? endX + labelOffset : endX - labelOffset;
        labelY = endY + 4;
        labelAnchor = (portSide === 'output') ? 'start' : 'end';
      } else {
        labelX = endX + labelOffset;
        labelY = (portSide === 'bottom') ? endY + 12 : endY - 4;
        labelAnchor = 'start';
      }

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', labelX);
      text.setAttribute('y', labelY);
      text.setAttribute('font-size', '10');
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('fill', netColor);
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', labelAnchor);
      text.textContent = stub.netName;
      g.appendChild(text);

      // Count of blocks on this net
      const netCount = stubs.filter(s => s.netName === stub.netName).length;
      if (netCount > 1) {
        const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const countX = isHorizontal ? labelX : labelX;
        const countY = labelY + 11;
        countText.setAttribute('x', countX);
        countText.setAttribute('y', countY);
        countText.setAttribute('font-size', '8');
        countText.setAttribute('font-family', 'Arial, sans-serif');
        countText.setAttribute('fill', netColor);
        countText.setAttribute('font-style', 'italic');
        countText.setAttribute('text-anchor', labelAnchor);
        countText.textContent = '(' + netCount + ' blocks)';
        g.appendChild(countText);
      }

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      const otherBlocks = stubs
        .filter(s => s.netName === stub.netName && s.blockId !== stub.blockId)
        .map(s => {
          const b = diagram.blocks.find(bl => bl.id === s.blockId);
          return b ? (b.name || b.id) : s.blockId;
        });
      title.textContent = 'Net: ' + stub.netName +
        (otherBlocks.length > 0
          ? '\nConnected to: ' + otherBlocks.join(', ')
          : '\n(no other blocks on this net yet)');
      g.appendChild(title);

      svg.appendChild(g);
    });
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