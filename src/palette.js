console.log("System Blocks palette loaded");

// SVG-based node editor with pan/zoom, grid, and draggable blocks with ports
class SystemBlocksEditor {
  constructor() {
    this.diagram = this.createEmptyDiagram();
    this.selectedBlock = null;
    this.isDragging = false;
    this.isPanning = false;
    this.dragStart = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };
    this.viewBox = { x: 0, y: 0, width: 1000, height: 1000 };
    this.scale = 1;
    
    // Grid configuration
    this.gridSize = 20;
    this.snapToGrid = true;
    
    // Hierarchy navigation
    this.hierarchyStack = []; // Stack of parent diagrams
    this.currentPath = []; // Current breadcrumb path
    this.rootDiagram = null; // Reference to the root diagram
    
    this.initializeUI();
    this.setupEventListeners();
  }
  
  createEmptyDiagram() {
    return {
      schema: "system-blocks-v1",
      blocks: [],
      connections: []
    };
  }
  
  generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  }
  
  snapToGrid(value) {
    if (!this.snapToGrid) {
      return value;
    }
    return Math.round(value / this.gridSize) * this.gridSize;
  }
  
  snapPointToGrid(x, y) {
    return {
      x: this.snapToGrid(x),
      y: this.snapToGrid(y)
    };
  }
  
  getStatusColor(status) {
    const statusColors = {
      "Placeholder": "#cccccc",  // Light gray
      "Planned": "#87ceeb",      // Sky blue
      "In-Work": "#ffd700",      // Gold/yellow
      "Implemented": "#90ee90",  // Light green
      "Verified": "#00ff00"      // Green
    };
    return statusColors[status] || "#cccccc";
  }
  
  initializeUI() {
    this.svg = document.getElementById('svg-canvas');
    this.blocksLayer = document.getElementById('blocks-layer');
    this.connectionsLayer = document.getElementById('connections-layer');
    
    // Initialize with a sample block
    this.addBlock("Sample MCU", 200, 150, "MCU");
  }
  
  setupEventListeners() {
    // Toolbar buttons
    document.getElementById('btn-new').addEventListener('click', () => this.newDiagram());
    document.getElementById('btn-save').addEventListener('click', () => this.saveDiagram());
    document.getElementById('btn-load').addEventListener('click', () => this.loadDiagram());
    
    // Hierarchy navigation buttons
    document.getElementById('btn-go-up').addEventListener('click', () => this.goUpInHierarchy());
    document.getElementById('btn-drill-down').addEventListener('click', () => this.drillDownIntoBlock());
    document.getElementById('btn-create-child').addEventListener('click', () => this.createChildDiagram());
    
    document.getElementById('btn-add-block').addEventListener('click', () => this.promptAddBlock());
    document.getElementById('btn-snap-grid').addEventListener('click', () => this.toggleSnapToGrid());
    document.getElementById('btn-check-rules').addEventListener('click', () => this.checkAndDisplayRules());
    document.getElementById('btn-export-report').addEventListener('click', () => this.exportReport());
    document.getElementById('btn-import').addEventListener('click', () => this.showImportDialog());
    document.getElementById('btn-link-cad').addEventListener('click', () => this.linkSelectedBlockToCAD());
    document.getElementById('btn-link-ecad').addEventListener('click', () => this.linkSelectedBlockToECAD());
    
    // SVG pan/zoom
    this.svg.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.svg.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.svg.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.svg.addEventListener('wheel', (e) => this.onWheel(e));
    this.svg.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    
    // Prevent context menu
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Import dialog events
    document.querySelectorAll('input[name="import-type"]').forEach(radio => {
      radio.addEventListener('change', () => this.updateImportUI());
    });
    document.getElementById('btn-import-cancel').addEventListener('click', () => this.hideImportDialog());
    document.getElementById('btn-import-ok').addEventListener('click', () => this.performImport());
    document.getElementById('dialog-overlay').addEventListener('click', () => this.hideImportDialog());
  }
  
  addBlock(name, x, y, type = "Custom") {
    // Snap initial position to grid
    const snappedPos = this.snapPointToGrid(x, y);
    
    const block = {
      id: this.generateId(),
      name: name,
      type: type,
      status: "Placeholder",
      x: snappedPos.x,
      y: snappedPos.y,
      width: 120,
      height: 60,
      interfaces: [],
      links: [],
      attributes: {}
    };
    
    // Add default interfaces
    block.interfaces.push(this.createInterface("VCC", "power", "input", "left", 0));
    block.interfaces.push(this.createInterface("GND", "power", "input", "left", 1));
    block.interfaces.push(this.createInterface("OUT", "data", "output", "right", 0));
    
    this.diagram.blocks.push(block);
    this.renderBlock(block);
    return block;
  }
  
  createInterface(name, kind, direction, side, index) {
    return {
      id: this.generateId(),
      name: name,
      kind: kind,
      direction: direction,
      port: { side: side, index: index },
      params: {}
    };
  }
  
  renderBlock(block) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'block-group');
    g.setAttribute('data-block-id', block.id);
    g.setAttribute('transform', `translate(${block.x}, ${block.y})`);
    
    // Status halo (background border)
    const statusHalo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    statusHalo.setAttribute('class', 'status-halo');
    statusHalo.setAttribute('width', block.width + 6);
    statusHalo.setAttribute('height', block.height + 6);
    statusHalo.setAttribute('x', -3);
    statusHalo.setAttribute('y', -3);
    statusHalo.setAttribute('rx', '6');
    statusHalo.setAttribute('fill', this.getStatusColor(block.status || 'Placeholder'));
    statusHalo.setAttribute('opacity', '0.3');
    g.appendChild(statusHalo);
    
    // Block rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'block');
    rect.setAttribute('width', block.width);
    rect.setAttribute('height', block.height);
    rect.setAttribute('rx', '4');
    g.appendChild(rect);
    
    // Block text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'block-text');
    text.setAttribute('x', block.width / 2);
    text.setAttribute('y', block.height / 2 - 5);
    text.textContent = block.name;
    g.appendChild(text);
    
    // Status text
    const statusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    statusText.setAttribute('class', 'status-text');
    statusText.setAttribute('x', block.width / 2);
    statusText.setAttribute('y', block.height / 2 + 12);
    statusText.textContent = block.status || 'Placeholder';
    statusText.setAttribute('font-size', '10');
    statusText.setAttribute('opacity', '0.7');
    g.appendChild(statusText);
    
    // Child diagram indicator
    if (this.hasChildDiagram(block)) {
      // Add dashed border
      rect.setAttribute('stroke-dasharray', '5,5');
      rect.setAttribute('stroke-width', '3');
      
      // Add folder icon
      const childIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      childIcon.setAttribute('class', 'child-indicator');
      childIcon.setAttribute('x', block.width - 15);
      childIcon.setAttribute('y', 15);
      childIcon.textContent = '📁';
      childIcon.setAttribute('font-size', '12');
      g.appendChild(childIcon);
    }
    
    // Render ports
    block.interfaces.forEach((intf, idx) => {
      const port = this.renderPort(block, intf, idx);
      g.appendChild(port);
    });
    
    // Add event listeners
    g.addEventListener('mousedown', (e) => this.onBlockMouseDown(e, block));
    
    this.blocksLayer.appendChild(g);
  }
  
  renderPort(block, intf, index) {
    const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    port.setAttribute('class', 'port');
    port.setAttribute('r', '4');
    port.setAttribute('data-interface-id', intf.id);
    
    const side = intf.port.side;
    const portIndex = intf.port.index;
    
    let x, y;
    if (side === 'left') {
      x = 0;
      y = 20 + portIndex * 20;
    } else if (side === 'right') {
      x = block.width;
      y = 20 + portIndex * 20;
    } else if (side === 'top') {
      x = 20 + portIndex * 20;
      y = 0;
    } else { // bottom
      x = 20 + portIndex * 20;
      y = block.height;
    }
    
    port.setAttribute('cx', x);
    port.setAttribute('cy', y);
    
    return port;
  }
  
  onMouseDown(e) {
    if (e.target === this.svg || e.target.closest('.block-group') === null) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.svg.style.cursor = 'grabbing';
    }
  }
  
  onMouseMove(e) {
    if (this.isPanning) {
      const dx = (e.clientX - this.panStart.x) / this.scale;
      const dy = (e.clientY - this.panStart.y) / this.scale;
      
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      
      this.updateViewBox();
      this.panStart = { x: e.clientX, y: e.clientY };
    } else if (this.isDragging && this.selectedBlock) {
      const rect = this.svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / this.scale) + this.viewBox.x;
      const svgY = ((e.clientY - rect.top) / this.scale) + this.viewBox.y;
      
      const rawX = svgX - this.dragStart.x;
      const rawY = svgY - this.dragStart.y;
      
      // Apply snap-to-grid
      const snappedPos = this.snapPointToGrid(rawX, rawY);
      this.selectedBlock.x = snappedPos.x;
      this.selectedBlock.y = snappedPos.y;
      
      this.updateBlockPosition(this.selectedBlock);
    }
  }
  
  onMouseUp(e) {
    this.isPanning = false;
    this.isDragging = false;
    
    // Clear selection if clicking on empty space
    if (e.target === this.svg || e.target.closest('.block-group') === null) {
      this.selectedBlock = null;
      this.updateContextButtons(null);
      document.querySelectorAll('.block.selected').forEach(el => {
        el.classList.remove('selected');
      });
    }
    
    this.svg.style.cursor = 'grab';
  }
  
  onBlockMouseDown(e, block) {
    e.stopPropagation();
    this.selectedBlock = block;
    this.isDragging = true;
    
    const rect = this.svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / this.scale) + this.viewBox.x;
    const svgY = ((e.clientY - rect.top) / this.scale) + this.viewBox.y;
    
    this.dragStart = {
      x: svgX - block.x,
      y: svgY - block.y
    };
    
    this.selectBlock(block);
  }
  
  selectBlock(block) {
    // Remove previous selection
    document.querySelectorAll('.block.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    this.selectedBlock = block;
    
    // Add selection to new block
    if (block) {
      const blockElement = document.querySelector(`[data-block-id="${block.id}"] .block`);
      if (blockElement) {
        blockElement.classList.add('selected');
      }
    }
    
    // Update context buttons
    this.updateContextButtons(block);
    this.updateHierarchyButtons();
  }
  
  updateContextButtons(selectedBlock) {
    const cadBtn = document.getElementById('btn-link-cad');
    const ecadBtn = document.getElementById('btn-link-ecad');
    
    if (selectedBlock) {
      cadBtn.disabled = false;
      ecadBtn.disabled = false;
    } else {
      cadBtn.disabled = true;
      ecadBtn.disabled = true;
    }
  }
  
  updateBlockPosition(block) {
    const blockGroup = document.querySelector(`[data-block-id="${block.id}"]`);
    if (blockGroup) {
      blockGroup.setAttribute('transform', `translate(${block.x}, ${block.y})`);
    }
  }
  
  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.scale *= zoomFactor;
    
    // Constrain zoom
    this.scale = Math.max(0.1, Math.min(5, this.scale));
    
    this.updateViewBox();
  }
  
  updateViewBox() {
    this.svg.setAttribute('viewBox', 
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width / this.scale} ${this.viewBox.height / this.scale}`
    );
  }
  
  promptAddBlock() {
    const name = prompt("Enter block name:", "New Block");
    if (name) {
      this.addBlock(name, 100, 100);
    }
  }
  
  toggleSnapToGrid() {
    this.snapToGrid = !this.snapToGrid;
    const btn = document.getElementById('btn-snap-grid');
    if (this.snapToGrid) {
      btn.classList.add('active');
      btn.textContent = 'Snap to Grid';
    } else {
      btn.classList.remove('active');
      btn.textContent = 'Snap Off';
    }
    console.log(`Snap to grid: ${this.snapToGrid ? 'ON' : 'OFF'}`);
  }
  
  linkSelectedBlockToCAD() {
    if (!this.selectedBlock) {
      console.warn("No block selected for CAD linking");
      return;
    }
    
    console.log(`Linking block "${this.selectedBlock.name}" to CAD...`);
    
    // Send message to Python to start CAD selection
    if (window.adsk && window.adsk.fusion && window.adsk.fusion.palettes) {
      const message = JSON.stringify({
        action: 'link-to-cad',
        data: {
          blockId: this.selectedBlock.id,
          blockName: this.selectedBlock.name
        }
      });
      window.adsk.fusion.palettes.sendInfoToParent('palette-message', message);
    } else {
      console.warn("Fusion palette messaging not available - simulating CAD link");
      this.simulateCADLink(this.selectedBlock);
    }
  }
  
  linkSelectedBlockToECAD() {
    if (!this.selectedBlock) {
      console.warn("No block selected for ECAD linking");
      return;
    }
    
    console.log(`Linking block "${this.selectedBlock.name}" to ECAD...`);
    
    // For ECAD, we can prompt for device and footprint directly
    const device = prompt("Enter device name:", this.selectedBlock.name);
    const footprint = prompt("Enter footprint:", "");
    
    if (device) {
      this.addECADLink(this.selectedBlock, device, footprint);
    }
  }
  
  simulateCADLink(block) {
    // For testing without Fusion, create a mock CAD link
    const mockOccToken = `mock_occ_${Date.now()}`;
    const mockDocId = `mock_doc_${Date.now()}`;
    
    this.addCADLink(block, mockOccToken, mockDocId);
    console.log("Mock CAD link created");
  }
  
  addCADLink(block, occToken, docId, docPath = "") {
    const cadLink = {
      target: "cad",
      occToken: occToken,
      docId: docId,
      docPath: docPath
    };
    
    // Remove existing CAD links
    block.links = block.links.filter(link => link.target !== "cad");
    
    // Add new CAD link
    block.links.push(cadLink);
    
    console.log(`Added CAD link to block "${block.name}":`, cadLink);
    this.updateBlockVisuals(block);
  }
  
  addECADLink(block, device, footprint) {
    const ecadLink = {
      target: "ecad", 
      device: device,
      footprint: footprint || ""
    };
    
    // Remove existing ECAD links
    block.links = block.links.filter(link => link.target !== "ecad");
    
    // Add new ECAD link
    block.links.push(ecadLink);
    
    console.log(`Added ECAD link to block "${block.name}":`, ecadLink);
    this.updateBlockVisuals(block);
  }
  
  updateBlockVisuals(block) {
    // Update block status first
    this.updateBlockStatus(block);
    
    // Add visual indicators for linked blocks (small badge/icon)
    const blockGroup = document.querySelector(`[data-block-id="${block.id}"]`);
    if (!blockGroup) return;
    
    // Remove existing link indicators
    blockGroup.querySelectorAll('.link-indicator').forEach(el => el.remove());
    
    // Add link indicators
    const hasCAD = block.links.some(link => link.target === "cad");
    const hasECAD = block.links.some(link => link.target === "ecad");
    
    if (hasCAD || hasECAD) {
      const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      indicator.setAttribute('class', 'link-indicator');
      indicator.setAttribute('cx', block.width - 8);
      indicator.setAttribute('cy', 8);
      indicator.setAttribute('r', 4);
      indicator.setAttribute('fill', hasCAD ? '#00aa00' : '#0066cc');
      indicator.setAttribute('stroke', '#fff');
      indicator.setAttribute('stroke-width', 1);
      blockGroup.appendChild(indicator);
    }
  }
  
  validateDiagramLinks() {
    const errors = [];
    
    this.diagram.blocks.forEach(block => {
      const blockErrors = this.validateBlockLinks(block);
      errors.push(...blockErrors);
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  validateBlockLinks(block) {
    const errors = [];
    const blockName = block.name || "Unnamed Block";
    
    block.links.forEach((link, index) => {
      const target = link.target;
      
      if (target === "cad") {
        if (!link.occToken) {
          errors.push(`${blockName}: CAD link ${index + 1} missing occToken`);
        }
        if (!link.docId) {
          errors.push(`${blockName}: CAD link ${index + 1} missing docId`);
        }
      } else if (target === "ecad") {
        if (!link.device) {
          errors.push(`${blockName}: ECAD link ${index + 1} missing device`);
        }
      } else if (target === "external") {
        if (!link.device && !link.docPath && !link.docId) {
          errors.push(`${blockName}: External link ${index + 1} needs at least one identifier`);
        }
      } else {
        errors.push(`${blockName}: Link ${index + 1} has invalid target '${target}'`);
      }
    });
    
    return errors;
  }
  
  computeBlockStatus(block) {
    // Auto-compute the status of a block based on its content and links
    if (!block) {
      return "Placeholder";
    }
    
    // Check if block has meaningful attributes
    const attributes = block.attributes || {};
    const hasAttributes = Object.keys(attributes).length > 0 && 
      Object.values(attributes).some(v => v && v !== "");
    
    // Check links
    const links = block.links || [];
    const hasLinks = links.length > 0;
    
    // Check if block has interfaces defined
    const interfaces = block.interfaces || [];
    const hasInterfaces = interfaces.length > 0;
    
    // Status computation logic
    if (!hasAttributes && !hasLinks && !hasInterfaces) {
      return "Placeholder";
    } else if (hasAttributes && !hasLinks) {
      return "Planned";
    } else if (hasLinks) {
      // Could add more sophisticated logic here to determine if "complete"
      if (hasInterfaces && hasAttributes) {
        return "Implemented";
      } else {
        return "In-Work";
      }
    } else {
      return "Planned";
    }
  }
  
  updateBlockStatus(block) {
    // Update a single block's status and re-render
    const newStatus = this.computeBlockStatus(block);
    if (block.status !== newStatus) {
      block.status = newStatus;
      this.redrawBlock(block);
    }
  }
  
  updateAllBlockStatuses() {
    // Update status for all blocks
    this.diagram.blocks.forEach(block => {
      const newStatus = this.computeBlockStatus(block);
      block.status = newStatus;
    });
    
    // Re-render all blocks to show updated status
    this.renderDiagram();
  }
  
  redrawBlock(block) {
    // Remove existing block element
    const existingElement = document.querySelector(`[data-block-id="${block.id}"]`);
    if (existingElement) {
      existingElement.remove();
    }
    
    // Re-render the block
    this.renderBlock(block);
  }
  
  checkLogicLevelCompatibility(connection) {
    // Check if connected interfaces have compatible logic levels
    const fromBlock = this.diagram.blocks.find(b => b.id === connection.from.blockId);
    const toBlock = this.diagram.blocks.find(b => b.id === connection.to.blockId);
    
    if (!fromBlock || !toBlock) {
      return {
        rule: "logic_level_compatibility",
        success: false,
        severity: "error",
        message: "Cannot find connected blocks"
      };
    }
    
    const fromIntf = fromBlock.interfaces.find(i => i.id === connection.from.interfaceId);
    const toIntf = toBlock.interfaces.find(i => i.id === connection.to.interfaceId);
    
    if (!fromIntf || !toIntf) {
      return {
        rule: "logic_level_compatibility", 
        success: false,
        severity: "error",
        message: "Cannot find connected interfaces"
      };
    }
    
    // Check logic levels from interface parameters
    const fromVoltage = fromIntf.params?.voltage || "3.3V";
    const toVoltage = toIntf.params?.voltage || "3.3V";
    
    // Simple voltage compatibility check
    const compatibleVoltages = [
      ["3.3V", "3.3V"], ["5V", "5V"], ["1.8V", "1.8V"],
      ["5V", "3.3V"]  // 5V can drive 3.3V (with appropriate logic)
    ];
    
    const isCompatible = compatibleVoltages.some(([from, to]) => 
      from === fromVoltage && to === toVoltage
    );
    
    if (isCompatible) {
      return {
        rule: "logic_level_compatibility",
        success: true,
        severity: "info",
        message: `Compatible logic levels: ${fromVoltage} → ${toVoltage}`
      };
    } else {
      return {
        rule: "logic_level_compatibility",
        success: false,
        severity: "warning", 
        message: `Potential logic level mismatch: ${fromVoltage} → ${toVoltage}`
      };
    }
  }
  
  checkPowerBudget() {
    // Check if power consumption doesn't exceed power supply capacity
    let totalSupply = 0;
    let totalConsumption = 0;
    
    this.diagram.blocks.forEach(block => {
      const blockType = (block.type || "").toLowerCase();
      const attributes = block.attributes || {};
      
      // Check if block is a power supply
      if (blockType.includes("power") || blockType.includes("supply") || blockType.includes("regulator")) {
        try {
          const currentStr = attributes.output_current || "0mA";
          const currentVal = parseFloat(currentStr.replace(/[mA]/g, ""));
          if (currentStr.includes("A") && !currentStr.includes("mA")) {
            totalSupply += currentVal * 1000; // Convert A to mA
          } else {
            totalSupply += currentVal;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Check power consumption
      try {
        const currentStr = attributes.current || attributes.power_consumption || "0mA";
        if (currentStr && currentStr !== "0mA") {
          const currentVal = parseFloat(currentStr.replace(/[mA]/g, ""));
          if (currentStr.includes("A") && !currentStr.includes("mA")) {
            totalConsumption += currentVal * 1000; // Convert A to mA  
          } else {
            totalConsumption += currentVal;
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    // Add 20% safety margin
    const safeSupply = totalSupply * 0.8;
    
    if (totalConsumption === 0 && totalSupply === 0) {
      return {
        rule: "power_budget",
        success: true,
        severity: "info",
        message: "No power specifications found - unable to verify budget"
      };
    } else if (totalConsumption <= safeSupply) {
      return {
        rule: "power_budget",
        success: true,
        severity: "info", 
        message: `Power budget OK: ${totalConsumption}mA used / ${totalSupply}mA available`
      };
    } else {
      return {
        rule: "power_budget",
        success: false,
        severity: "error",
        message: `Power budget exceeded: ${totalConsumption}mA needed > ${safeSupply}mA available (with 20% margin)`
      };
    }
  }
  
  checkImplementationCompleteness() {
    // Check if all blocks have sufficient implementation details
    const incompleteBlocks = [];
    
    this.diagram.blocks.forEach(block => {
      const blockName = block.name || "Unnamed";
      const issues = [];
      const status = block.status || "Placeholder";
      
      // Check for CAD/ECAD links for non-placeholder blocks
      if (!["Placeholder", "Planned"].includes(status)) {
        const links = block.links || [];
        const hasCAD = links.some(link => link.target === "cad");
        const hasECAD = links.some(link => link.target === "ecad");
        
        if (!hasCAD && !hasECAD) {
          issues.push("missing CAD/ECAD links");
        }
      }
      
      // Check for interface definitions
      const interfaces = block.interfaces || [];
      if (["Implemented", "Verified"].includes(status) && interfaces.length < 2) {
        issues.push("insufficient interfaces defined");
      }
      
      // Check for attributes
      const attributes = block.attributes || {};
      const meaningfulAttrs = Object.entries(attributes).filter(([k, v]) => v && String(v).trim());
      if (["Planned", "In-Work", "Implemented", "Verified"].includes(status) && meaningfulAttrs.length < 1) {
        issues.push("missing key attributes");
      }
      
      if (issues.length > 0) {
        incompleteBlocks.push(`${blockName}: ${issues.join(', ')}`);
      }
    });
    
    if (incompleteBlocks.length === 0) {
      return {
        rule: "implementation_completeness",
        success: true,
        severity: "info",
        message: `All ${this.diagram.blocks.length} blocks have adequate implementation details`
      };
    } else {
      return {
        rule: "implementation_completeness",
        success: false,
        severity: "warning",
        message: `Incomplete blocks: ${incompleteBlocks.join('; ')}`
      };
    }
  }
  
  runAllRuleChecks() {
    // Run all rule checks on the current diagram
    const results = [];
    
    // Check power budget (diagram-level rule)
    results.push(this.checkPowerBudget());
    
    // Check implementation completeness (diagram-level rule)
    results.push(this.checkImplementationCompleteness());
    
    // Check logic level compatibility for each connection
    this.diagram.connections.forEach(connection => {
      const logicResult = this.checkLogicLevelCompatibility(connection);
      results.push(logicResult);
    });
    
    return results;
  }
  
  getRuleFailures() {
    // Get only the failed rule checks
    const allResults = this.runAllRuleChecks();
    return allResults.filter(result => !result.success);
  }
  
  updateRuleWarnings() {
    // Update visual warning indicators for rule failures
    this.clearRuleWarnings();
    
    const failures = this.getRuleFailures();
    
    failures.forEach(failure => {
      if (failure.rule === "logic_level_compatibility") {
        // Add warning badge to connection
        // This would require connection identification - simplified for now
        console.warn("Logic level issue:", failure.message);
      } else if (failure.rule === "power_budget") {
        // Show power budget warning in UI
        this.showPowerBudgetWarning(failure.message);
      } else if (failure.rule === "implementation_completeness") {
        // Mark incomplete blocks with warning badges
        this.markIncompleteBlocks(failure.message);
      }
    });
  }
  
  clearRuleWarnings() {
    // Clear existing warning indicators
    document.querySelectorAll('.rule-warning').forEach(el => el.remove());
    document.querySelectorAll('.power-warning').forEach(el => el.remove());
  }
  
  showPowerBudgetWarning(message) {
    // Show power budget warning in the UI
    const warningDiv = document.createElement('div');
    warningDiv.className = 'power-warning';
    warningDiv.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: #ffeeee;
      border: 1px solid #ff6666;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      max-width: 300px;
      z-index: 200;
    `;
    warningDiv.textContent = `⚠️ ${message}`;
    document.getElementById('canvas-container').appendChild(warningDiv);
  }
  
  markIncompleteBlocks(message) {
    // Add visual indicators to incomplete blocks
    console.warn("Implementation completeness issues:", message);
    // Additional visual marking could be added here
  }
  
  checkAndDisplayRules() {
    // Run all rule checks and display results in the rule panel
    console.log("Running rule checks...");
    const results = this.runAllRuleChecks();
    this.updateRulePanel(results);
    
    // Also update visual warning indicators
    this.updateRuleWarnings();
  }
  
  updateRulePanel(results) {
    // Update the rule results panel with check results
    const resultsContainer = document.getElementById('rule-results');
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="rule-result info">
          <span class="rule-icon">ℹ️</span>
          <span class="rule-message">No rules to check</span>
        </div>
      `;
      return;
    }
    
    results.forEach(result => {
      const resultDiv = document.createElement('div');
      resultDiv.className = `rule-result ${result.severity}`;
      
      const icon = result.severity === 'error' ? '❌' : 
                  result.severity === 'warning' ? '⚠️' : '✅';
      
      resultDiv.innerHTML = `
        <span class="rule-icon">${icon}</span>
        <span class="rule-message">${result.message}</span>
      `;
      
      resultsContainer.appendChild(resultDiv);
    });
  }
  
  // Import functionality
  showImportDialog() {
    document.getElementById('import-dialog').style.display = 'block';
    document.getElementById('dialog-overlay').style.display = 'block';
    this.updateImportUI();
  }
  
  hideImportDialog() {
    document.getElementById('import-dialog').style.display = 'none';
    document.getElementById('dialog-overlay').style.display = 'none';
    
    // Clear form
    document.getElementById('mermaid-text').value = '';
    document.getElementById('csv-blocks').value = '';
    document.getElementById('csv-connections').value = '';
    document.querySelector('input[name="import-type"][value="mermaid"]').checked = true;
    this.updateImportUI();
  }
  
  updateImportUI() {
    const importType = document.querySelector('input[name="import-type"]:checked').value;
    
    if (importType === 'mermaid') {
      document.getElementById('mermaid-import').style.display = 'block';
      document.getElementById('csv-import').style.display = 'none';
    } else {
      document.getElementById('mermaid-import').style.display = 'none';
      document.getElementById('csv-import').style.display = 'block';
    }
  }
  
  performImport() {
    const importType = document.querySelector('input[name="import-type"]:checked').value;
    
    try {
      if (importType === 'mermaid') {
        this.importFromMermaid();
      } else if (importType === 'csv') {
        this.importFromCSV();
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error.message}`);
    }
  }
  
  importFromMermaid() {
    const mermaidText = document.getElementById('mermaid-text').value.trim();
    
    if (!mermaidText) {
      alert('Please enter Mermaid flowchart text');
      return;
    }
    
    console.log('Importing from Mermaid:', mermaidText);
    
    // Send to Python for parsing
    const message = {
      action: 'import-mermaid',
      data: { mermaidText: mermaidText }
    };
    
    adsk.fusionSendData('import-request', JSON.stringify(message));
  }
  
  importFromCSV() {
    const csvBlocks = document.getElementById('csv-blocks').value.trim();
    const csvConnections = document.getElementById('csv-connections').value.trim();
    
    if (!csvBlocks) {
      alert('Please enter blocks CSV data');
      return;
    }
    
    console.log('Importing from CSV:', { blocks: csvBlocks, connections: csvConnections });
    
    // Send to Python for parsing
    const message = {
      action: 'import-csv',
      data: { 
        csvBlocks: csvBlocks,
        csvConnections: csvConnections
      }
    };
    
    adsk.fusionSendData('import-request', JSON.stringify(message));
  }
  
  // Handle import response from Python
  handleImportResponse(response) {
    console.log('Import response:', response);
    
    if (response.success) {
      // Load the imported diagram
      this.diagram = response.diagram;
      this.renderDiagram();
      this.hideImportDialog();
      
      if (response.warnings) {
        alert(`Import successful!\n\nWarnings:\n${response.warnings}`);
      } else {
        alert('Import successful!');
      }
    } else {
      alert(`Import failed: ${response.error}`);
    }
  }
  
  exportReport() {
    // Export comprehensive report files
    console.log("Exporting report files...");
    
    // Update block statuses before export
    this.updateAllBlockStatuses();
    
    const jsonData = JSON.stringify(this.diagram, null, 2);
    
    // Send export request to Python via Fusion's palette messaging
    if (window.adsk && window.adsk.fusion && window.adsk.fusion.palettes) {
      const message = JSON.stringify({
        action: 'export-report',
        data: jsonData
      });
      window.adsk.fusion.palettes.sendInfoToParent('palette-message', message);
    } else {
      // Fallback for testing - generate client-side reports
      console.warn("Fusion palette messaging not available - generating client-side reports");
      this.generateClientSideReports();
    }
  }
  
  generateClientSideReports() {
    // Generate reports directly in JavaScript for testing
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport();
    this.downloadFile(`system_blocks_report_${timestamp}.md`, markdownReport, 'text/markdown');
    
    // Generate CSV pin map
    const csvPinMap = this.generateCsvPinMap();
    this.downloadFile(`system_blocks_pinmap_${timestamp}.csv`, csvPinMap, 'text/csv');
    
    // Generate C header
    const headerFile = this.generateCHeader();
    this.downloadFile(`system_blocks_pins_${timestamp}.h`, headerFile, 'text/plain');
    
    console.log("Client-side reports generated and downloaded");
  }
  
  generateMarkdownReport() {
    // Generate a comprehensive Markdown report
    const now = new Date().toLocaleString();
    const blocks = this.diagram.blocks || [];
    const connections = this.diagram.connections || [];
    
    let report = `# System Blocks Report

**Generated:** ${now}  
**Schema Version:** ${this.diagram.schema || 'system-blocks-v1'}

---

## Summary

- **Total Blocks:** ${blocks.length}
- **Total Connections:** ${connections.length}

`;
    
    // Status breakdown
    const statusCounts = {};
    blocks.forEach(block => {
      const status = block.status || 'Placeholder';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    if (Object.keys(statusCounts).length > 0) {
      report += "\n### Block Status Distribution\n\n";
      Object.entries(statusCounts).sort().forEach(([status, count]) => {
        report += `- **${status}:** ${count}\n`;
      });
    }
    
    // Rule check results
    const ruleResults = this.runAllRuleChecks();
    const failures = ruleResults.filter(r => !r.success);
    
    report += `\n### Rule Check Summary\n\n`;
    report += `- **Total Checks:** ${ruleResults.length}\n`;
    report += `- **Passed:** ${ruleResults.length - failures.length}\n`;
    report += `- **Failed:** ${failures.length}\n`;
    
    if (failures.length > 0) {
      report += "\n#### Rule Failures\n\n";
      failures.forEach(failure => {
        const icon = failure.severity === 'error' ? '❌' : '⚠️';
        report += `- ${icon} **${failure.rule}:** ${failure.message}\n`;
      });
    }
    
    // Block table
    report += "\n---\n\n## Block Details\n\n";
    
    if (blocks.length > 0) {
      report += "| Name | Type | Status | Attributes | Interfaces | Links |\n";
      report += "|------|------|--------|------------|------------|-------|\n";
      
      blocks.forEach(block => {
        const name = block.name || 'Unnamed';
        const type = block.type || 'Custom';
        const status = block.status || 'Placeholder';
        
        const attrs = block.attributes || {};
        const attrStr = Object.entries(attrs)
          .filter(([k, v]) => v)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ') || 'None';
        
        const intfCount = (block.interfaces || []).length;
        const linkCount = (block.links || []).length;
        
        report += `| ${name} | ${type} | ${status} | ${attrStr} | ${intfCount} | ${linkCount} |\n`;
      });
    } else {
      report += "*No blocks defined*\n";
    }
    
    // Connection table
    report += "\n---\n\n## Connection Details\n\n";
    
    if (connections.length > 0) {
      report += "| From Block | From Interface | To Block | To Interface | Protocol | Attributes |\n";
      report += "|------------|----------------|----------|--------------|----------|------------|\n";
      
      const blockNames = {};
      blocks.forEach(block => {
        blockNames[block.id] = block.name || 'Unnamed';
      });
      
      connections.forEach(conn => {
        const fromBlockId = conn.from?.blockId || '';
        const toBlockId = conn.to?.blockId || '';
        const fromIntfId = conn.from?.interfaceId || '';
        const toIntfId = conn.to?.interfaceId || '';
        
        const fromBlockName = blockNames[fromBlockId] || fromBlockId;
        const toBlockName = blockNames[toBlockId] || toBlockId;
        
        const protocol = conn.protocol || 'N/A';
        const attrs = conn.attributes || {};
        const attrStr = Object.entries(attrs)
          .filter(([k, v]) => v)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ') || 'None';
        
        report += `| ${fromBlockName} | ${fromIntfId} | ${toBlockName} | ${toIntfId} | ${protocol} | ${attrStr} |\n`;
      });
    } else {
      report += "*No connections defined*\n";
    }
    
    return report;
  }
  
  generateCsvPinMap() {
    // Generate CSV pin map from connections
    const lines = ["Signal,Source Block,Source Interface,Dest Block,Dest Interface,Protocol,Notes"];
    
    const blocks = this.diagram.blocks || [];
    const connections = this.diagram.connections || [];
    
    const blockLookup = {};
    blocks.forEach(block => {
      blockLookup[block.id] = block;
    });
    
    connections.forEach(conn => {
      const fromBlockId = conn.from?.blockId || '';
      const toBlockId = conn.to?.blockId || '';
      const fromIntfId = conn.from?.interfaceId || '';
      const toIntfId = conn.to?.interfaceId || '';
      
      const fromBlock = blockLookup[fromBlockId] || {};
      const toBlock = blockLookup[toBlockId] || {};
      
      const fromBlockName = fromBlock.name || fromBlockId;
      const toBlockName = toBlock.name || toBlockId;
      
      // Find interface names
      let fromIntfName = fromIntfId;
      let toIntfName = toIntfId;
      
      (fromBlock.interfaces || []).forEach(intf => {
        if (intf.id === fromIntfId) {
          fromIntfName = intf.name || fromIntfId;
        }
      });
      
      (toBlock.interfaces || []).forEach(intf => {
        if (intf.id === toIntfId) {
          toIntfName = intf.name || toIntfId;
        }
      });
      
      const protocol = conn.protocol || '';
      const signalName = `${fromIntfName}_to_${toIntfName}`;
      
      const attrs = conn.attributes || {};
      const notes = Object.entries(attrs)
        .filter(([k, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      
      lines.push(`"${signalName}","${fromBlockName}","${fromIntfName}","${toBlockName}","${toIntfName}","${protocol}","${notes}"`);
    });
    
    return lines.join('\n');
  }
  
  generateCHeader() {
    // Generate C header file with pin definitions
    const headerName = "pin_definitions";
    const headerGuard = `${headerName.toUpperCase()}_H`;
    const now = new Date().toLocaleString();
    
    let header = `#ifndef ${headerGuard}
#define ${headerGuard}

/*
 * Auto-generated pin definitions from System Blocks diagram
 * Generated: ${now}
 */

`;
    
    const blocks = this.diagram.blocks || [];
    const pinDefinitions = [];
    const interfaceDefinitions = [];
    
    // Extract pin definitions from block attributes
    blocks.forEach(block => {
      const blockName = (block.name || 'UNNAMED').toUpperCase().replace(/\s+/g, '_');
      const attributes = block.attributes || {};
      
      Object.entries(attributes).forEach(([attrName, attrValue]) => {
        if (attrName.toLowerCase().includes('pin') && attrValue) {
          const defineName = `${blockName}_${attrName.toUpperCase()}`;
          const value = isNaN(attrValue) ? `"${attrValue}"` : attrValue;
          pinDefinitions.push([defineName, value]);
        }
      });
      
      // Extract from interfaces
      (block.interfaces || []).forEach(intf => {
        const intfName = (intf.name || 'UNNAMED').toUpperCase().replace(/\s+/g, '_');
        const params = intf.params || {};
        
        if (params.pin) {
          const defineName = `${blockName}_${intfName}_PIN`;
          const value = isNaN(params.pin) ? `"${params.pin}"` : params.pin;
          interfaceDefinitions.push([defineName, value]);
        }
      });
    });
    
    // Add pin definitions to header
    if (pinDefinitions.length > 0) {
      header += "/* Block Pin Definitions */\n";
      pinDefinitions.forEach(([name, value]) => {
        header += `#define ${name.padEnd(30)} ${value}\n`;
      });
      header += "\n";
    }
    
    if (interfaceDefinitions.length > 0) {
      header += "/* Interface Pin Definitions */\n";
      interfaceDefinitions.forEach(([name, value]) => {
        header += `#define ${name.padEnd(30)} ${value}\n`;
      });
      header += "\n";
    }
    
    header += `#endif /* ${headerGuard} */\n`;
    
    return header;
  }
  
  downloadFile(filename, content, mimeType) {
    // Create and trigger download of a file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
  
  newDiagram() {
    this.diagram = this.createEmptyDiagram();
    this.blocksLayer.innerHTML = '';
    this.connectionsLayer.innerHTML = '';
    console.log("New diagram created");
  }
  
  saveDiagram() {
    // Update block statuses before saving
    this.updateAllBlockStatuses();
    
    // Validate links before saving
    const validation = this.validateDiagramLinks();
    if (!validation.isValid) {
      const proceed = confirm(
        `Diagram has validation errors:\n\n${validation.errors.join('\n')}\n\nSave anyway?`
      );
      if (!proceed) {
        return;
      }
    }
    
    const jsonData = JSON.stringify(this.diagram, null, 2);
    console.log("Saving diagram:", jsonData);
    
    // Send to Python via Fusion's palette messaging
    if (window.adsk && window.adsk.fusion && window.adsk.fusion.palettes) {
      const message = JSON.stringify({
        action: 'save-diagram',
        data: jsonData
      });
      window.adsk.fusion.palettes.sendInfoToParent('palette-message', message);
    } else {
      console.warn("Fusion palette messaging not available - using console log");
    }
  }
  
  loadDiagram() {
    console.log("Loading diagram...");
    
    // Request from Python via Fusion's palette messaging
    if (window.adsk && window.adsk.fusion && window.adsk.fusion.palettes) {
      const message = JSON.stringify({
        action: 'load-diagram',
        data: ''
      });
      window.adsk.fusion.palettes.sendInfoToParent('palette-message', message);
    } else {
      console.warn("Fusion palette messaging not available");
      // For testing without Fusion, load a sample diagram
      this.loadSampleDiagram();
    }
  }
  
  loadSampleDiagram() {
    this.newDiagram();
    this.addBlock("Power Supply", 50, 100, "Power");
    this.addBlock("Microcontroller", 250, 100, "MCU");
    this.addBlock("Sensor", 450, 100, "Sensor");
    console.log("Sample diagram loaded");
  }
  
  // Method to receive data from Python
  receiveDiagramData(jsonData) {
    try {
      this.diagram = JSON.parse(jsonData);
      this.renderDiagram();
      console.log("Diagram loaded from Python");
    } catch (error) {
      console.error("Error loading diagram:", error);
    }
  }
  
  // Method to receive CAD link data from Python
  receiveCADLink(blockId, occToken, docId, docPath) {
    const block = this.diagram.blocks.find(b => b.id === blockId);
    if (block) {
      this.addCADLink(block, occToken, docId, docPath);
      console.log(`CAD link received for block "${block.name}"`);
    } else {
      console.error(`Block with ID ${blockId} not found`);
    }
  }
  
  // Method to receive CAD link data from Python
  receiveCADLink(blockId, occToken, docId, docPath) {
    const block = this.diagram.blocks.find(b => b.id === blockId);
    if (block) {
      this.addCADLink(block, occToken, docId, docPath);
      console.log("CAD link received from Python");
    } else {
      console.error("Block not found for CAD linking:", blockId);
    }
  }
  
  renderDiagram() {
    this.blocksLayer.innerHTML = '';
    this.connectionsLayer.innerHTML = '';
    
    this.diagram.blocks.forEach(block => {
      this.renderBlock(block);
      // Update visuals to show any existing links
      this.updateBlockVisuals(block);
    });
    
    // Update hierarchy UI
    this.updateBreadcrumb();
    this.updateHierarchyButtons();
    
    // TODO: Render connections
  }
}

// Initialize the editor when the DOM is loaded
let editor;
document.addEventListener('DOMContentLoaded', () => {
  editor = new SystemBlocksEditor();
});

// Global function for Python to call
function loadDiagramFromPython(jsonData) {
  if (editor) {
    editor.receiveDiagramData(jsonData);
  }
}

// Global function for Python to call when CAD selection is complete
function receiveCADLinkFromPython(blockId, occToken, docId, docPath) {
  if (editor) {
    editor.receiveCADLink(blockId, occToken, docId, docPath);
  }
}

// ==================== HIERARCHY METHODS ====================

// Add hierarchy methods to the SystemBlocksEditor class
SystemBlocksEditor.prototype.updateBreadcrumb = function() {
  const breadcrumbElement = document.getElementById('breadcrumb-path');
  const path = this.currentPath.length > 0 ? this.currentPath.join(' > ') : 'Root';
  breadcrumbElement.textContent = path;
};

SystemBlocksEditor.prototype.updateHierarchyButtons = function() {
  const goUpBtn = document.getElementById('btn-go-up');
  const drillDownBtn = document.getElementById('btn-drill-down');
  const createChildBtn = document.getElementById('btn-create-child');
  
  // Enable go up if we're not at root level
  goUpBtn.disabled = this.hierarchyStack.length === 0;
  
  // Enable drill down if selected block has child diagram
  drillDownBtn.disabled = !this.selectedBlock || !this.hasChildDiagram(this.selectedBlock);
  
  // Enable create child if block is selected
  createChildBtn.disabled = !this.selectedBlock;
};

SystemBlocksEditor.prototype.hasChildDiagram = function(block) {
  return block && block.childDiagram && block.childDiagram.blocks;
};

SystemBlocksEditor.prototype.goUpInHierarchy = function() {
  if (this.hierarchyStack.length === 0) {
    console.log("Already at root level");
    return;
  }
  
  // Restore parent diagram
  const parentContext = this.hierarchyStack.pop();
  this.diagram = parentContext.diagram;
  this.selectedBlock = parentContext.selectedBlock;
  this.currentPath.pop();
  
  this.renderDiagram();
  this.updateBreadcrumb();
  this.updateHierarchyButtons();
  
  console.log(`Navigated up to: ${this.currentPath.join(' > ') || 'Root'}`);
};

SystemBlocksEditor.prototype.drillDownIntoBlock = function() {
  if (!this.selectedBlock) {
    alert("Please select a block first");
    return;
  }
  
  if (!this.hasChildDiagram(this.selectedBlock)) {
    alert("Selected block has no child diagram");
    return;
  }
  
  // Save current context
  this.hierarchyStack.push({
    diagram: this.diagram,
    selectedBlock: this.selectedBlock
  });
  
  // Navigate to child diagram
  this.currentPath.push(this.selectedBlock.name);
  this.diagram = this.selectedBlock.childDiagram;
  this.selectedBlock = null;
  
  this.renderDiagram();
  this.updateBreadcrumb();
  this.updateHierarchyButtons();
  
  console.log(`Navigated down to: ${this.currentPath.join(' > ')}`);
};

SystemBlocksEditor.prototype.createChildDiagram = function() {
  if (!this.selectedBlock) {
    alert("Please select a block first");
    return;
  }
  
  if (this.hasChildDiagram(this.selectedBlock)) {
    const proceed = confirm("This block already has a child diagram. Replace it?");
    if (!proceed) return;
  }
  
  // Create empty child diagram
  this.selectedBlock.childDiagram = this.createEmptyDiagram();
  
  // Immediately drill down into it
  this.drillDownIntoBlock();
  
  // Add visual indicator for parent block (we'll need to re-render parent later)
  console.log(`Created child diagram for block: ${this.selectedBlock ? this.selectedBlock.name : 'unknown'}`);
};

SystemBlocksEditor.prototype.onDoubleClick = function(e) {
  // Double-click to drill down into blocks
  const target = e.target;
  if (target.classList.contains('block') || target.parentElement.classList.contains('block')) {
    const blockElement = target.classList.contains('block') ? target : target.parentElement;
    const blockId = blockElement.getAttribute('data-block-id');
    const block = this.diagram.blocks.find(b => b.id === blockId);
    
    if (block && this.hasChildDiagram(block)) {
      this.selectedBlock = block;
      this.drillDownIntoBlock();
    }
  }
};

SystemBlocksEditor.prototype.newDiagram = function() {
  this.diagram = this.createEmptyDiagram();
  this.selectedBlock = null;
  this.hierarchyStack = [];
  this.currentPath = [];
  this.rootDiagram = this.diagram;
  
  this.renderDiagram();
  this.updateBreadcrumb();
  this.updateHierarchyButtons();
};

// Global function for Python to call with import results
function receiveImportFromPython(responseData) {
  if (editor) {
    editor.handleImportResponse(responseData);
  }
}
