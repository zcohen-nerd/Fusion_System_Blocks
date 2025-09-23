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
    
    // SVG pan/zoom
    this.svg.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.svg.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.svg.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.svg.addEventListener('wheel', (e) => this.onWheel(e));
    
    // Prevent context menu
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  addBlock(name, x, y, type = "Custom") {
    const block = {
      id: this.generateId(),
      name: name,
      type: type,
      status: "Placeholder",
      x: x,
      y: y,
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
      
      this.selectedBlock.x = svgX - this.dragStart.x;
      this.selectedBlock.y = svgY - this.dragStart.y;
      
      this.updateBlockPosition(this.selectedBlock);
    }
  }
  
  onMouseUp(e) {
    this.isPanning = false;
    this.isDragging = false;
    this.selectedBlock = null;
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
  
  newDiagram() {
    this.diagram = this.createEmptyDiagram();
    this.blocksLayer.innerHTML = '';
    this.connectionsLayer.innerHTML = '';
    console.log("New diagram created");
  }
  
  saveDiagram() {
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
  
  renderDiagram() {
    this.blocksLayer.innerHTML = '';
    this.connectionsLayer.innerHTML = '';
    
    this.diagram.blocks.forEach(block => {
      this.renderBlock(block);
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
