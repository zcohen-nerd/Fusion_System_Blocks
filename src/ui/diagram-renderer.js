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
    
    // Only create arrowhead marker if one doesn't already exist in the HTML.
    // palette.html ships its own <marker id="arrowhead">; creating a duplicate
    // produces undefined url(#arrowhead) behaviour in some Chromium builds.
    if (!defs.querySelector('#arrowhead')) {
      const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      arrowMarker.setAttribute('id', 'arrowhead');
      arrowMarker.setAttribute('markerWidth', '10');
      arrowMarker.setAttribute('markerHeight', '7');
      arrowMarker.setAttribute('refX', '10');
      arrowMarker.setAttribute('refY', '3.5');
      arrowMarker.setAttribute('orient', 'auto');
      arrowMarker.setAttribute('markerUnits', 'userSpaceOnUse');
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
      polygon.setAttribute('fill', '#666');
      
      arrowMarker.appendChild(polygon);
      defs.appendChild(arrowMarker);
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
        // Cylinder / database shape — rect body with elliptical caps
        const capRy = height * 0.12;
        mainShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // Top ellipse arc, right side, bottom ellipse arc, left side, close
        mainShape.setAttribute('d',
          `M ${x},${y + capRy}` +
          ` A ${width / 2},${capRy} 0 0,1 ${x + width},${y + capRy}` +
          ` L ${x + width},${y + height - capRy}` +
          ` A ${width / 2},${capRy} 0 0,1 ${x},${y + height - capRy}` +
          ` Z`);
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
    const startY = (blockH - totalTextHeight) / 2 + lineHeight * 0.75;

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
      // Without this, some Chromium builds (including Fusion 360's CEF)
      // skip opacity-0 elements during hit testing.
      port.setAttribute('pointer-events', 'all');
      port.style.cursor = 'crosshair';
      blockGroup.appendChild(port);
    };

    // Input port (left center)
    createPort(0, h / 2, 'input');

    // Output port (right center)
    createPort(w, h / 2, 'output');
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
    const markerSuffix = connType === 'auto' ? '' : '-' + connType;
    const fwdMarker = 'url(#arrowhead' + markerSuffix + ')';
    const revMarker = 'url(#arrowhead' + markerSuffix + '-reverse)';

    // --- Fan-in / fan-out port offsets ---
    // Count how many connections attach to the output side of fromBlock
    // and the input side of toBlock so we can distribute vertically.
    const outConns = this.editor.diagram.connections.filter(
      c => c.fromBlock === connection.fromBlock
    );
    const inConns = this.editor.diagram.connections.filter(
      c => c.toBlock === connection.toBlock
    );
    const outIdx = outConns.indexOf(connection);
    const inIdx = inConns.indexOf(connection);
    const fromH = fromBlock.height || 80;
    const toH = toBlock.height || 80;
    const fromYOffset = this._fanOffset(outIdx, outConns.length, fromH);
    const toYOffset = this._fanOffset(inIdx, inConns.length, toH);

    // Calculate connection points with fan offsets
    const fromX = fromBlock.x + (fromBlock.width || 120);
    const fromY = fromBlock.y + fromYOffset;
    const toX = toBlock.x;
    const toY = toBlock.y + toYOffset;

    // Choose path based on routing mode
    let d;
    if (this.routingMode === 'orthogonal') {
      d = this._computeOrthogonalPath(fromX, fromY, toX, toY, connection);
    } else {
      // Default Bezier curve
      const dx = Math.abs(toX - fromX);
      const dy = toY - fromY;
      const yBulge = Math.abs(dy) < 10 ? Math.max(30, dx * 0.15) : 0;
      const midX = (fromX + toX) / 2;
      d = `M ${fromX} ${fromY} C ${midX} ${fromY - yBulge} ${midX} ${toY - yBulge} ${toX} ${toY}`;
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
      // CEF workaround: marker-start is unreliable in Fusion 360's
      // Chromium, so render a manual reverse arrow polygon instead.
      this._addManualStartArrow(group, fromX, fromY, toX, toY, styling.stroke, styling.strokeWidth);
    } else if (direction === 'backward') {
      // CEF workaround: use a manual polygon for the start arrow
      this._addManualStartArrow(group, fromX, fromY, toX, toY, styling.stroke, styling.strokeWidth);
    }
    // direction === 'none' → no markers
    group.appendChild(path);

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
      'electrical': { stroke: '#28a745', strokeWidth: 2, dashArray: '4,2' },
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
   * of a connection path. Fusion 360's Chromium does not reliably render
   * SVG marker-start, so we draw a manual polygon instead.
   * strokeWidth scales the arrow to match the SVG marker (markerUnits=strokeWidth).
   */
  _addManualStartArrow(group, fromX, fromY, toX, toY, fillColor, strokeWidth = 2) {
    // SVG markers now use fixed size (userSpaceOnUse) to prevent
    // scaling issues with thick lines. Length=10px.
    const size = 10;
    // Angle from start toward end (approximate — ignores bezier curvature)
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    // Arrow points backward (opposite the path direction)
    const tipX = fromX;
    const tipY = fromY;
    const halfSpread = Math.atan2(3.5, 10); // ~19° — matches forward marker polygon (0 0, 10 3.5, 0 7)
    const baseX1 = fromX + Math.cos(angle + halfSpread) * size;
    const baseY1 = fromY + Math.sin(angle + halfSpread) * size;
    const baseX2 = fromX + Math.cos(angle - halfSpread) * size;
    const baseY2 = fromY + Math.sin(angle - halfSpread) * size;

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points',
      `${tipX},${tipY} ${baseX1},${baseY1} ${baseX2},${baseY2}`);
    arrow.setAttribute('fill', fillColor);
    arrow.setAttribute('stroke', 'none');
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