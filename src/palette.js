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
    document.getElementById('btn-add-block').addEventListener('click', () => this.promptAddBlock());
    document.getElementById('btn-snap-grid').addEventListener('click', () => this.toggleSnapToGrid());
    document.getElementById('btn-link-cad').addEventListener('click', () => this.linkSelectedBlockToCAD());
    document.getElementById('btn-link-ecad').addEventListener('click', () => this.linkSelectedBlockToECAD());
    
    // SVG pan/zoom
    this.svg.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.svg.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.svg.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.svg.addEventListener('wheel', (e) => this.onWheel(e));
    
    // Prevent context menu
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
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
    text.setAttribute('y', block.height / 2);
    text.textContent = block.name;
    g.appendChild(text);
    
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
    
    // Add selection to new block
    const blockElement = document.querySelector(`[data-block-id="${block.id}"] .block`);
    if (blockElement) {
      blockElement.classList.add('selected');
    }
    
    // Update context buttons
    this.updateContextButtons(block);
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
  
  newDiagram() {
    this.diagram = this.createEmptyDiagram();
    this.blocksLayer.innerHTML = '';
    this.connectionsLayer.innerHTML = '';
    console.log("New diagram created");
  }
  
  saveDiagram() {
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
