// IMMEDIATE TEST - This should appear in console if JS is loading
console.log("=== JAVASCRIPT FILE LOADING ===");
console.error("=== JS ERROR TEST ===");

// Visual debug function for when console doesn't work
function debugLog(message) {
  try {
    const debugDiv = document.getElementById('debug-log');
    if (debugDiv) {
      debugDiv.innerHTML += message + '<br>';
      debugDiv.scrollTop = debugDiv.scrollHeight;
    }
  } catch (e) {
    // Ignore errors if debug div doesn't exist yet
  }
}

debugLog("=== JAVASCRIPT FILE LOADED ===");
console.log("System Blocks palette loaded");

// SVG-based node editor with pan/zoom, grid, and draggable blocks with ports
class SystemBlocksEditor {
  constructor() {
    debugLog("SystemBlocksEditor constructor starting...");
    this.diagram = this.createEmptyDiagram();
    debugLog("Empty diagram created");
    this.selectedBlock = null;
    this.isDragging = false;
    this.isPanning = false;
    this.dragStart = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };
    this.viewBox = { x: 0, y: 0, width: 1000, height: 1000 };
    this.scale = 1;
    
    // Grid configuration
    this.gridSize = 20;
    this.snapToGridEnabled = true;
    
    // Hierarchy navigation
    this.hierarchyStack = []; // Stack of parent diagrams
    this.currentPath = []; // Current breadcrumb path
    this.rootDiagram = null; // Reference to the root diagram
    
    // Undo/Redo system
    this.undoStack = []; // Previous diagram states
    this.redoStack = []; // Future diagram states  
    this.maxUndoLevels = 50; // Limit memory usage
    this.isPerformingUndoRedo = false; // Prevent undo/redo loops
    
    debugLog("About to initialize UI...");
    this.initializeUI();
    debugLog("UI initialized, setting up event listeners...");
    this.setupEventListeners();
    debugLog("Event listeners set up, initializing search...");
    this.initializeSearch();
    debugLog("Initializing professional UI enhancements...");
    this.initializeProfessionalUI();
    debugLog("SystemBlocksEditor constructor complete!");
  }

  // === MILESTONE 10: PROFESSIONAL UI ENHANCEMENTS ===
  initializeProfessionalUI() {
    debugLog("Setting up professional UI enhancements...");
    
    // Initialize tooltip system
    this.setupTooltips();
    
    // Initialize context menus
    this.setupContextMenus();
    
    // Initialize loading states
    this.setupLoadingStates();
    
    // Initialize keyboard shortcuts visual feedback
    this.setupKeyboardHints();
    
    // Initialize smooth animations
    this.enableSmoothAnimations();
    
    debugLog("Professional UI enhancements initialized!");
  }

  setupTooltips() {
    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'fusion-tooltip';
    document.body.appendChild(this.tooltip);

    // Add tooltips to all buttons and interactive elements
    const elements = document.querySelectorAll('[title]');
    elements.forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        this.showTooltip(e.target, e.target.getAttribute('title'));
      });
      element.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  showTooltip(element, text) {
    this.tooltip.textContent = text;
    this.tooltip.classList.add('show');
    
    const rect = element.getBoundingClientRect();
    this.tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    this.tooltip.style.top = (rect.bottom + 10) + 'px';
  }

  hideTooltip() {
    this.tooltip.classList.remove('show');
  }

  setupContextMenus() {
    // Create context menu element
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'fusion-context-menu';
    document.body.appendChild(this.contextMenu);

    // Add context menu to blocks
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.block-group')) {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY, 'block');
      }
    });

    // Hide context menu on click outside
    document.addEventListener('click', () => {
      this.hideContextMenu();
    });
  }

  showContextMenu(x, y, type) {
    const menuItems = this.getContextMenuItems(type);
    this.contextMenu.innerHTML = menuItems.map(item => 
      `<div class="fusion-context-menu-item ${item.disabled ? 'disabled' : ''}" data-action="${item.action}">
        ${item.icon ? `<div class="fusion-icon ${item.icon}"></div>` : ''}
        ${item.label}
      </div>`
    ).join('');

    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';
    this.contextMenu.classList.add('show');

    // Add click handlers
    this.contextMenu.querySelectorAll('.fusion-context-menu-item:not(.disabled)').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.target.closest('.fusion-context-menu-item').dataset.action;
        this.handleContextMenuAction(action);
        this.hideContextMenu();
      });
    });
  }

  getContextMenuItems(type) {
    if (type === 'block') {
      return [
        { label: 'Edit Properties', action: 'edit', icon: 'icon-edit' },
        { label: 'Duplicate', action: 'duplicate', icon: 'icon-add' },
        { label: 'Link to CAD', action: 'link-cad', icon: 'icon-mechanical' },
        { label: 'Change Status', action: 'status', icon: 'icon-status-planned' },
        { label: 'Delete', action: 'delete', icon: 'icon-delete' }
      ];
    }
    return [];
  }

  handleContextMenuAction(action) {
    debugLog(`Context menu action: ${action}`);
    // Implement context menu actions here
  }

  hideContextMenu() {
    this.contextMenu.classList.remove('show');
  }

  setupLoadingStates() {
    // Create loading overlay
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.innerHTML = `
      <div class="fusion-loader">
        <div class="fusion-spinner"></div>
        <span>Loading...</span>
      </div>
    `;
    this.loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(45, 45, 48, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(this.loadingOverlay);
  }

  showLoading(message = 'Loading...') {
    this.loadingOverlay.querySelector('span').textContent = message;
    this.loadingOverlay.style.opacity = '1';
    this.loadingOverlay.style.visibility = 'visible';
  }

  hideLoading() {
    this.loadingOverlay.style.opacity = '0';
    this.loadingOverlay.style.visibility = 'hidden';
  }

  setupKeyboardHints() {
    // Add keyboard shortcuts to buttons
    const shortcuts = {
      'btn-new': 'Ctrl+N',
      'btn-save': 'Ctrl+S',
      'btn-load': 'Ctrl+O',
      'btn-undo': 'Ctrl+Z',
      'btn-redo': 'Ctrl+Y'
    };

    Object.entries(shortcuts).forEach(([id, shortcut]) => {
      const element = document.getElementById(id);
      if (element) {
        const hint = document.createElement('div');
        hint.className = 'fusion-shortcut-hint';
        hint.textContent = shortcut;
        element.style.position = 'relative';
        element.appendChild(hint);
      }
    });
  }

  enableSmoothAnimations() {
    // Add smooth transitions to all buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.classList.add('interactive-element');
    });

    // Add smooth scroll to container
    const container = document.querySelector('.container');
    if (container) {
      container.style.scrollBehavior = 'smooth';
    }
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
    if (!this.snapToGridEnabled) {
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
    debugLog("initializeUI starting...");
    
    debugLog("Looking for svg-canvas...");
    this.svg = document.getElementById('svg-canvas');
    if (this.svg) {
      debugLog("Found svg-canvas!");
    } else {
      debugLog("ERROR: svg-canvas not found!");
      return;
    }
    
    debugLog("Looking for blocks-layer...");
    this.blocksLayer = document.getElementById('blocks-layer');
    if (this.blocksLayer) {
      debugLog("Found blocks-layer!");
    } else {
      debugLog("ERROR: blocks-layer not found!");
      return;
    }
    
    debugLog("Looking for connections-layer...");
    this.connectionsLayer = document.getElementById('connections-layer');
    if (this.connectionsLayer) {
      debugLog("Found connections-layer!");
    } else {
      debugLog("ERROR: connections-layer not found!");
      return;
    }
    
    // Initialize with a sample block
    debugLog("About to add sample block...");
    try {
      this.addBlock("Sample MCU", 200, 150, "MCU");
      debugLog("Sample block added successfully!");
    } catch (e) {
      debugLog("ERROR adding sample block: " + e.message);
    }
    debugLog("initializeUI complete!");
  }
  
  setupEventListeners() {
    debugLog('Setting up event listeners...');
    console.log('Setting up event listeners...');
    
    // Add a global click listener to catch all clicks
    document.addEventListener('click', (e) => {
      debugLog('CLICK: ' + (e.target.id || e.target.tagName));
      console.log('GLOBAL CLICK DETECTED:', e.target.id || e.target.tagName, e.target);
    });
    
    // Toolbar buttons
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    
    if (btnNew) {
      console.log('Adding click listener to New button');
      btnNew.addEventListener('click', () => {
        console.log('New button clicked!');
        this.newDiagram();
      });
    } else {
      console.error('btn-new element not found!');
    }
    
    if (btnSave) {
      console.log('Adding click listener to Save button');
      btnSave.addEventListener('click', () => {
        console.log('Save button clicked!');
        this.saveDiagram();
      });
    } else {
      console.error('btn-save element not found!');
    }
    
    if (btnLoad) {
      console.log('Adding click listener to Load button');
      btnLoad.addEventListener('click', () => {
        console.log('Load button clicked!');
        this.loadDiagram();
      });
    } else {
      console.error('btn-load element not found!');
    }
    
    // Undo/Redo buttons
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    
    if (btnUndo) {
      console.log('Adding click listener to Undo button');
      btnUndo.addEventListener('click', () => {
        console.log('Undo button clicked!');
        this.undo();
      });
    } else {
      console.error('btn-undo element not found!');
    }
    
    if (btnRedo) {
      console.log('Adding click listener to Redo button');
      btnRedo.addEventListener('click', () => {
        console.log('Redo button clicked!');
        this.redo();
      });
    } else {
      console.error('btn-redo element not found!');
    }
    
    // Hierarchy navigation buttons
    const btnGoUp = document.getElementById('btn-go-up');
    const btnDrillDown = document.getElementById('btn-drill-down');
    const btnCreateChild = document.getElementById('btn-create-child');
    
    if (btnGoUp) {
      console.log('Adding click listener to Go Up button');
      btnGoUp.addEventListener('click', () => {
        console.log('Go Up button clicked!');
        this.goUpInHierarchy();
      });
    } else {
      console.error('btn-go-up element not found!');
    }
    
    if (btnDrillDown) {
      console.log('Adding click listener to Drill Down button');
      btnDrillDown.addEventListener('click', () => {
        console.log('Drill Down button clicked!');
        this.drillDownIntoBlock();
      });
    } else {
      console.error('btn-drill-down element not found!');
    }
    
    if (btnCreateChild) {
      console.log('Adding click listener to Create Child button');
      btnCreateChild.addEventListener('click', () => {
        console.log('Create Child button clicked!');
        this.createChildDiagram();
      });
    } else {
      console.error('btn-create-child element not found!');
    }
    
    // Additional buttons with debugging
    const btnAddBlock = document.getElementById('btn-add-block');
    const btnSnapGrid = document.getElementById('btn-snap-grid');
    const btnCheckRules = document.getElementById('btn-check-rules');
    const btnExportReport = document.getElementById('btn-export-report');
    const btnImport = document.getElementById('btn-import');
    const btnLinkCad = document.getElementById('btn-link-cad');
    const btnLinkEcad = document.getElementById('btn-link-ecad');
    
    if (btnAddBlock) {
      console.log('Adding click listener to Add Block button');
      btnAddBlock.addEventListener('click', () => {
        console.log('Add Block button clicked!');
        this.promptAddBlock();
      });
    } else {
      console.error('btn-add-block element not found!');
    }
    
    if (btnSnapGrid) {
      console.log('Adding click listener to Snap Grid button');
      btnSnapGrid.addEventListener('click', () => {
        console.log('Snap Grid button clicked!');
        this.toggleSnapToGrid();
      });
    } else {
      console.error('btn-snap-grid element not found!');
    }
    
    if (btnCheckRules) {
      console.log('Adding click listener to Check Rules button');
      btnCheckRules.addEventListener('click', () => {
        console.log('Check Rules button clicked!');
        this.checkAndDisplayRules();
      });
    } else {
      console.error('btn-check-rules element not found!');
    }
    
    if (btnExportReport) {
      console.log('Adding click listener to Export Report button');
      btnExportReport.addEventListener('click', () => {
        console.log('Export Report button clicked!');
        this.exportReport();
      });
    } else {
      console.error('btn-export-report element not found!');
    }
    
    if (btnImport) {
      console.log('Adding click listener to Import button');
      btnImport.addEventListener('click', () => {
        console.log('Import button clicked!');
        this.showImportDialog();
      });
    } else {
      console.error('btn-import element not found!');
    }
    
    // Connection type selector
    const connectionTypeSelect = document.getElementById('connection-type-select');
    if (connectionTypeSelect) {
      console.log('Adding change listener to Connection Type selector');
      connectionTypeSelect.addEventListener('change', () => {
        this.selectedConnectionType = connectionTypeSelect.value;
        console.log('Connection type changed to:', this.selectedConnectionType);
        debugLog('Connection type set to: ' + this.selectedConnectionType);
      });
      // Initialize the connection type
      this.selectedConnectionType = connectionTypeSelect.value;
    } else {
      console.error('connection-type-select element not found!');
    }
    
    // Arrow direction selector
    const arrowDirectionSelect = document.getElementById('arrow-direction-select');
    if (arrowDirectionSelect) {
      console.log('Adding change listener to Arrow Direction selector');
      arrowDirectionSelect.addEventListener('change', () => {
        this.selectedArrowDirection = arrowDirectionSelect.value;
        console.log('Arrow direction changed to:', this.selectedArrowDirection);
        debugLog('Arrow direction set to: ' + this.selectedArrowDirection);
      });
      // Initialize the arrow direction
      this.selectedArrowDirection = arrowDirectionSelect.value;
    } else {
      console.error('arrow-direction-select element not found!');
    }
    
    // Connection templates button
    const btnConnectionTemplates = document.getElementById('btn-connection-templates');
    if (btnConnectionTemplates) {
      console.log('Adding click listener to Connection Templates button');
      btnConnectionTemplates.addEventListener('click', () => {
        console.log('Connection Templates button clicked!');
        this.showConnectionTemplates();
      });
    } else {
      console.error('btn-connection-templates element not found!');
    }
    
    // Bulk connections button
    const btnBulkConnections = document.getElementById('btn-bulk-connections');
    if (btnBulkConnections) {
      console.log('Adding click listener to Bulk Connections button');
      btnBulkConnections.addEventListener('click', () => {
        console.log('Bulk Connections button clicked!');
        this.showBulkConnectionDialog();
      });
    } else {
      console.error('btn-bulk-connections element not found!');
    }
    
    if (btnLinkCad) {
      console.log('Adding click listener to Link CAD button');
      btnLinkCad.addEventListener('click', () => {
        console.log('Link CAD button clicked!');
        this.linkSelectedBlockToCAD();
      });
    } else {
      console.error('btn-link-cad element not found!');
    }
    
    if (btnLinkEcad) {
      console.log('Adding click listener to Link ECAD button');
      btnLinkEcad.addEventListener('click', () => {
        console.log('Link ECAD button clicked!');
        this.linkSelectedBlockToECAD();
      });
    } else {
      console.error('btn-link-ecad element not found!');
    }
    
    console.log('Event listeners setup complete');
    
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
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }
  
  addBlock(name, x, y, type = "Custom") {
    debugLog("addBlock called with: " + name + " at (" + x + ", " + y + ")");
    
    try {
      debugLog("About to save state...");
      this.saveState(); // Save for undo
      debugLog("State saved");
      
      // Snap initial position to grid
      debugLog("About to snap to grid...");
      const snappedPos = this.snapPointToGrid(x, y);
      debugLog("Snapped position: " + snappedPos.x + ", " + snappedPos.y);
      
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
        attributes: {},
        _isNewBlock: true  // Flag for animation
      };
      debugLog("Block object created with ID: " + block.id);
      
      // Add default interfaces
      debugLog("Adding default interfaces...");
      block.interfaces.push(this.createInterface("VCC", "power", "input", "left", 0));
      block.interfaces.push(this.createInterface("GND", "power", "input", "left", 1));
      block.interfaces.push(this.createInterface("OUT", "data", "output", "right", 0));
      debugLog("Interfaces added: " + block.interfaces.length);
      
      debugLog("Adding block to diagram...");
      this.diagram.blocks.push(block);
      debugLog("Block added to diagram. Total blocks: " + this.diagram.blocks.length);
      
      // Trigger full diagram re-render instead of individual block render
      // This prevents duplicate rendering if renderDiagram is called elsewhere
      debugLog("Triggering full diagram re-render...");
      this.renderDiagram();
      debugLog("Diagram re-rendered successfully!");
      
      return block;
    } catch (e) {
      debugLog("ERROR in addBlock: " + e.message);
      throw e;
    }
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
    
    // Status text (only show if not Placeholder)
    if (block.status && block.status !== 'Placeholder') {
      const statusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      statusText.setAttribute('class', 'status-text');
      statusText.setAttribute('x', block.width / 2);
      statusText.setAttribute('y', block.height / 2 + 12);
      statusText.textContent = block.status;
      statusText.setAttribute('font-size', '10');
      statusText.setAttribute('opacity', '0.7');
      g.appendChild(statusText);
    }
    
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
    
      // Add new block animation class if this is a newly created block
      if (block._isNewBlock) {
        g.classList.add('new-block');
        
        // Remove animation class and flag after animation completes
        setTimeout(() => {
          g.classList.remove('new-block');
          delete block._isNewBlock;
        }, 600); // Match animation duration
      }    this.blocksLayer.appendChild(g);
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
    
    // Add click event listener for ports
    port.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent block selection
      debugLog('Port clicked: ' + intf.name + ' on block ' + block.name);
      this.onPortClick(block, intf, e);
    });
    
    return port;
  }
  
  onPortClick(block, intf, event) {
    debugLog('Port clicked: ' + intf.name + ' (' + intf.direction + ') on block ' + block.name);
    
    if (!this.connectionMode) {
      // Start connection mode
      this.connectionMode = {
        sourceBlock: block,
        sourceInterface: intf,
        isConnecting: true
      };
      debugLog('Started connection mode from ' + block.name + '.' + intf.name);
      
      // Visual feedback - highlight the source port
      event.target.style.fill = '#ff6b6b';
      event.target.style.stroke = '#ff0000';
      event.target.style.strokeWidth = '2';
      
    } else {
      // Complete the connection
      if (this.connectionMode.sourceBlock.id !== block.id) {
        debugLog('Completing connection from ' + this.connectionMode.sourceBlock.name + '.' + this.connectionMode.sourceInterface.name + ' to ' + block.name + '.' + intf.name);
        
        this.addConnection(
          this.connectionMode.sourceBlock.id,
          this.connectionMode.sourceInterface.id,
          block.id,
          intf.id
        );
        
        // Reset visual feedback
        document.querySelectorAll('.port').forEach(port => {
          port.style.fill = '';
          port.style.stroke = '';
          port.style.strokeWidth = '';
        });
        
      } else {
        debugLog('Cannot connect port to itself');
      }
      
      // Exit connection mode
      this.connectionMode = null;
    }
  }
  
  addConnection(sourceBlockId, sourceInterfaceId, targetBlockId, targetInterfaceId) {
    debugLog('Adding connection between blocks');
    
    // Find the source and target interfaces to determine connection type
    const sourceBlock = this.diagram.blocks.find(b => b.id === sourceBlockId);
    const targetBlock = this.diagram.blocks.find(b => b.id === targetBlockId);
    
    if (!sourceBlock || !targetBlock) {
      debugLog('ERROR: Could not find blocks for connection');
      return;
    }
    
    const sourceIntf = sourceBlock.interfaces.find(i => i.id === sourceInterfaceId);
    const targetIntf = targetBlock.interfaces.find(i => i.id === targetInterfaceId);
    
    if (!sourceIntf || !targetIntf) {
      debugLog('ERROR: Could not find interfaces for connection');
      return;
    }
    
    // Determine connection type based on interface kinds
    const connectionKind = this.determineConnectionKind(sourceIntf, targetIntf);
    
    // Validate the connection before creating it
    const validation = this.validateConnection(sourceIntf, targetIntf, connectionKind);
    if (!validation.valid) {
      alert(`Connection validation failed:\n${validation.errors.join('\n')}`);
      debugLog('Connection validation failed: ' + validation.errors.join(', '));
      return;
    }
    
    // Check for warnings
    if (validation.warnings.length > 0) {
      const proceed = confirm(`Connection warnings:\n${validation.warnings.join('\n')}\n\nProceed anyway?`);
      if (!proceed) {
        debugLog('Connection cancelled due to warnings');
        return;
      }
    }
    
    // Save current state for undo
    this.saveStateForUndo();
    
    // Use template protocol if available and interfaces don't have one
    let connectionProtocol = sourceIntf.protocol || targetIntf.protocol || '';
    if (!connectionProtocol && this.activeTemplate && this.activeTemplate.protocol) {
      connectionProtocol = this.activeTemplate.protocol;
    }
    
    const connection = {
      id: this.generateId(),
      kind: connectionKind,
      protocol: connectionProtocol,
      attributes: {},
      source: {
        blockId: sourceBlockId,
        interfaceId: sourceInterfaceId
      },
      target: {
        blockId: targetBlockId,
        interfaceId: targetInterfaceId
      },
      style: this.getConnectionStyle(connectionKind),
      arrowDirection: this.selectedArrowDirection || 'forward'
    };
    
    this.diagram.connections.push(connection);
    this.renderConnection(connection);
    debugLog('Connection added successfully with type: ' + connectionKind);
  }
  
  determineConnectionKind(sourceIntf, targetIntf) {
    // If user has manually selected a connection type (not auto), use it
    if (this.selectedConnectionType && this.selectedConnectionType !== 'auto') {
      debugLog('Using manually selected connection type: ' + this.selectedConnectionType);
      return this.selectedConnectionType;
    }
    
    // Auto-determine connection type based on interface kinds
    // Prioritize power connections
    if (sourceIntf.kind === 'power' || targetIntf.kind === 'power') {
      return 'power';
    }
    
    // Check for data connections
    if (sourceIntf.kind === 'data' || targetIntf.kind === 'data') {
      return 'data';
    }
    
    // Check for mechanical connections
    if (sourceIntf.kind === 'mechanical' || targetIntf.kind === 'mechanical') {
      return 'mechanical';
    }
    
    // Default to electrical
    return 'electrical';
  }
  
  getConnectionStyle(kind) {
    const styles = {
      power: {
        color: '#dc3545',        // Red for power
        width: '3',              // Thick lines for power
        dashArray: 'none',       // Solid lines
        arrowType: 'filled'      // Filled arrows
      },
      data: {
        color: '#007bff',        // Blue for data
        width: '2',              // Medium thickness
        dashArray: 'none',       // Solid lines
        arrowType: 'filled'      // Filled arrows
      },
      electrical: {
        color: '#28a745',        // Green for electrical/signal
        width: '1.5',            // Thinner lines
        dashArray: '5,3',        // Dotted lines for signals
        arrowType: 'filled'      // Filled arrows
      },
      mechanical: {
        color: '#6c757d',        // Gray for mechanical
        width: '2',              // Medium thickness
        dashArray: '8,4',        // Dashed lines
        arrowType: 'open'        // Open arrows
      }
    };
    
    return styles[kind] || styles.electrical;
  }
  
  validateConnection(sourceIntf, targetIntf, connectionKind) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    // Rule 1: Interface compatibility
    if (sourceIntf.kind && targetIntf.kind && sourceIntf.kind !== targetIntf.kind) {
      // Allow some compatible combinations
      const compatibleCombinations = [
        ['electrical', 'power'],  // Electrical can connect to power
        ['data', 'electrical']    // Data can connect to electrical
      ];
      
      const isCompatible = compatibleCombinations.some(combo => 
        (combo.includes(sourceIntf.kind) && combo.includes(targetIntf.kind))
      );
      
      if (!isCompatible) {
        result.warnings.push(`Interface type mismatch: ${sourceIntf.kind} ↔ ${targetIntf.kind}`);
      }
    }
    
    // Rule 2: Direction compatibility
    if (sourceIntf.direction === 'input' && targetIntf.direction === 'input') {
      result.errors.push('Cannot connect two input interfaces');
    }
    
    if (sourceIntf.direction === 'output' && targetIntf.direction === 'output') {
      result.warnings.push('Connecting two output interfaces - verify this is intentional');
    }
    
    // Rule 3: Protocol compatibility
    if (sourceIntf.protocol && targetIntf.protocol && sourceIntf.protocol !== targetIntf.protocol) {
      result.warnings.push(`Protocol mismatch: ${sourceIntf.protocol} ↔ ${targetIntf.protocol}`);
    }
    
    // Rule 4: Voltage level compatibility (if specified)
    if (sourceIntf.params?.voltage && targetIntf.params?.voltage) {
      const sourceVoltage = parseFloat(sourceIntf.params.voltage);
      const targetVoltage = parseFloat(targetIntf.params.voltage);
      
      if (Math.abs(sourceVoltage - targetVoltage) > 0.5) {
        result.warnings.push(`Voltage level mismatch: ${sourceVoltage}V ↔ ${targetVoltage}V`);
      }
    }
    
    // Rule 5: Power connection validation
    if (connectionKind === 'power') {
      // Power connections should have voltage specifications
      if (!sourceIntf.params?.voltage && !targetIntf.params?.voltage) {
        result.warnings.push('Power connection without voltage specifications');
      }
      
      // Check current capacity
      if (sourceIntf.params?.maxCurrent && targetIntf.params?.maxCurrent) {
        const sourceCurrent = parseFloat(sourceIntf.params.maxCurrent);
        const targetCurrent = parseFloat(targetIntf.params.maxCurrent);
        
        if (sourceCurrent < targetCurrent) {
          result.warnings.push(`Current capacity mismatch: source ${sourceCurrent}A < target ${targetCurrent}A`);
        }
      }
    }
    
    // Rule 6: Data connection validation
    if (connectionKind === 'data') {
      // Data connections should have protocol specifications
      if (!sourceIntf.protocol && !targetIntf.protocol) {
        result.warnings.push('Data connection without protocol specifications');
      }
      
      // Check data rate compatibility
      if (sourceIntf.params?.dataRate && targetIntf.params?.dataRate) {
        const sourceRate = parseFloat(sourceIntf.params.dataRate);
        const targetRate = parseFloat(targetIntf.params.dataRate);
        
        if (sourceRate < targetRate) {
          result.warnings.push(`Data rate mismatch: source ${sourceRate} < target ${targetRate}`);
        }
      }
    }
    
    // Set valid to false if there are errors
    if (result.errors.length > 0) {
      result.valid = false;
    }
    
    return result;
  }
  
  renderConnection(connection) {
    // Find source and target blocks and interfaces
    const sourceBlock = this.diagram.blocks.find(b => b.id === connection.source.blockId);
    const targetBlock = this.diagram.blocks.find(b => b.id === connection.target.blockId);
    
    if (!sourceBlock || !targetBlock) {
      debugLog('ERROR: Could not find blocks for connection');
      return;
    }
    
    const sourceIntf = sourceBlock.interfaces.find(i => i.id === connection.source.interfaceId);
    const targetIntf = targetBlock.interfaces.find(i => i.id === connection.target.interfaceId);
    
    if (!sourceIntf || !targetIntf) {
      debugLog('ERROR: Could not find interfaces for connection');
      return;
    }
    
    // Calculate port positions
    const sourcePos = this.getPortPosition(sourceBlock, sourceIntf);
    const targetPos = this.getPortPosition(targetBlock, targetIntf);
    
    // Get connection style (ensure we have style data)
    const style = connection.style || this.getConnectionStyle(connection.kind || 'electrical');
    
    // Create connection group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'connection-group');
    g.setAttribute('data-connection-id', connection.id);
    g.setAttribute('data-connection-kind', connection.kind || 'electrical');
    
    // Create curved path instead of straight line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Calculate control points for smooth curve
    const dx = targetPos.x - sourcePos.x;
    const midX = sourcePos.x + dx * 0.5;
    
    const pathData = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${sourcePos.y} ${midX} ${(sourcePos.y + targetPos.y) / 2} Q ${midX} ${targetPos.y} ${targetPos.x} ${targetPos.y}`;
    
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', style.color);
    path.setAttribute('stroke-width', style.width);
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'connection-line');
    
    // Apply dash pattern if specified
    if (style.dashArray !== 'none') {
      path.setAttribute('stroke-dasharray', style.dashArray);
    }
    
    // Create arrowhead(s) based on direction
    const arrowDirection = connection.arrowDirection || 'forward';
    const arrows = this.createArrowheads(sourcePos, targetPos, style, arrowDirection);
    
    g.appendChild(path);
    
    // Add arrow(s) to the group
    if (arrows.forward) {
      g.appendChild(arrows.forward);
    }
    if (arrows.backward) {
      g.appendChild(arrows.backward);
    }
    
    // Add connection label if there's a protocol or custom label
    if (connection.protocol || connection.label) {
      const labelText = connection.label || connection.protocol;
      const label = this.createConnectionLabel(sourcePos, targetPos, labelText, style);
      g.appendChild(label);
    }
    
    // Add click handler for connection management
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      debugLog('Connection clicked, ID: ' + connection.id);
      this.onConnectionClick(connection, e);
    });
    
    // Add hover effects with connection-type-aware highlighting
    g.addEventListener('mouseenter', () => {
      path.setAttribute('stroke', this.getBrighterColor(style.color));
      path.setAttribute('stroke-width', String(parseInt(style.width) + 1));
      // Update all arrows in the group
      const arrows = g.querySelectorAll('.connection-arrow');
      arrows.forEach(arrow => {
        if (arrow.tagName === 'polygon') {
          arrow.setAttribute('fill', this.getBrighterColor(style.color));
        } else if (arrow.tagName === 'g') {
          const lines = arrow.querySelectorAll('line');
          lines.forEach(line => line.setAttribute('stroke', this.getBrighterColor(style.color)));
        }
      });
    });
    
    g.addEventListener('mouseleave', () => {
      path.setAttribute('stroke', style.color);
      path.setAttribute('stroke-width', style.width);
      // Reset all arrows in the group
      const arrows = g.querySelectorAll('.connection-arrow');
      arrows.forEach(arrow => {
        if (arrow.tagName === 'polygon') {
          arrow.setAttribute('fill', style.color);
        } else if (arrow.tagName === 'g') {
          const lines = arrow.querySelectorAll('line');
          lines.forEach(line => line.setAttribute('stroke', style.color));
        }
      });
    });
    
    this.connectionsLayer.appendChild(g);
    debugLog(`Connection rendered with ${connection.kind || 'electrical'} styling`);
  }
  
  createArrowheads(sourcePos, targetPos, style, arrowDirection) {
    const arrows = {};
    
    if (arrowDirection === 'none') {
      return arrows; // No arrows
    }
    
    const arrowSize = parseInt(style.width) + 4; // Scale arrow with line width
    const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
    
    // Forward arrow (pointing to target)
    if (arrowDirection === 'forward' || arrowDirection === 'bidirectional') {
      const arrowTip = {
        x: targetPos.x - 4 * Math.cos(angle), // Offset from port center
        y: targetPos.y - 4 * Math.sin(angle)
      };
      
      arrows.forward = this.createSingleArrowhead(arrowTip, angle, arrowSize, style, 'forward');
    }
    
    // Backward arrow (pointing to source)
    if (arrowDirection === 'backward' || arrowDirection === 'bidirectional') {
      const backAngle = angle + Math.PI; // Reverse direction
      const arrowTip = {
        x: sourcePos.x - 4 * Math.cos(backAngle), // Offset from port center
        y: sourcePos.y - 4 * Math.sin(backAngle)
      };
      
      arrows.backward = this.createSingleArrowhead(arrowTip, backAngle, arrowSize, style, 'backward');
    }
    
    return arrows;
  }
  
  createSingleArrowhead(arrowTip, angle, arrowSize, style, direction) {
    if (style.arrowType === 'filled') {
      // Filled triangle arrow
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      
      const arrowBase1 = {
        x: arrowTip.x - arrowSize * Math.cos(angle - Math.PI/6),
        y: arrowTip.y - arrowSize * Math.sin(angle - Math.PI/6)
      };
      
      const arrowBase2 = {
        x: arrowTip.x - arrowSize * Math.cos(angle + Math.PI/6),
        y: arrowTip.y - arrowSize * Math.sin(angle + Math.PI/6)
      };
      
      arrow.setAttribute('points', `${arrowTip.x},${arrowTip.y} ${arrowBase1.x},${arrowBase1.y} ${arrowBase2.x},${arrowBase2.y}`);
      arrow.setAttribute('fill', style.color);
      arrow.setAttribute('class', `connection-arrow filled ${direction}`);
      
      return arrow;
    } else if (style.arrowType === 'open') {
      // Open arrow (just two lines)
      const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      arrowGroup.setAttribute('class', `connection-arrow open ${direction}`);
      
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      
      const arrowBase1 = {
        x: arrowTip.x - arrowSize * Math.cos(angle - Math.PI/6),
        y: arrowTip.y - arrowSize * Math.sin(angle - Math.PI/6)
      };
      
      const arrowBase2 = {
        x: arrowTip.x - arrowSize * Math.cos(angle + Math.PI/6),
        y: arrowTip.y - arrowSize * Math.sin(angle + Math.PI/6)
      };
      
      line1.setAttribute('x1', arrowTip.x);
      line1.setAttribute('y1', arrowTip.y);
      line1.setAttribute('x2', arrowBase1.x);
      line1.setAttribute('y2', arrowBase1.y);
      line1.setAttribute('stroke', style.color);
      line1.setAttribute('stroke-width', style.width);
      
      line2.setAttribute('x1', arrowTip.x);
      line2.setAttribute('y1', arrowTip.y);
      line2.setAttribute('x2', arrowBase2.x);
      line2.setAttribute('y2', arrowBase2.y);
      line2.setAttribute('stroke', style.color);
      line2.setAttribute('stroke-width', style.width);
      
      arrowGroup.appendChild(line1);
      arrowGroup.appendChild(line2);
      
      return arrowGroup;
    }
    
    return null; // No arrow
  }
  
  createConnectionLabel(sourcePos, targetPos, text, style) {
    const midX = (sourcePos.x + targetPos.x) / 2;
    const midY = (sourcePos.y + targetPos.y) / 2;
    
    // Create label background
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.setAttribute('class', 'connection-label');
    
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.setAttribute('x', midX);
    textElement.setAttribute('y', midY - 2);
    textElement.setAttribute('text-anchor', 'middle');
    textElement.setAttribute('font-size', '10');
    textElement.setAttribute('font-family', 'Arial, sans-serif');
    textElement.setAttribute('fill', style.color);
    textElement.setAttribute('font-weight', 'bold');
    textElement.textContent = text;
    
    // Add background rectangle for better readability
    const bbox = textElement.getBBox();
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', bbox.x - 2);
    background.setAttribute('y', bbox.y - 1);
    background.setAttribute('width', bbox.width + 4);
    background.setAttribute('height', bbox.height + 2);
    background.setAttribute('fill', 'white');
    background.setAttribute('fill-opacity', '0.8');
    background.setAttribute('stroke', style.color);
    background.setAttribute('stroke-width', '0.5');
    background.setAttribute('rx', '2');
    
    labelGroup.appendChild(background);
    labelGroup.appendChild(textElement);
    
    return labelGroup;
  }
  
  getBrighterColor(color) {
    // Simple color brightening for hover effects
    const brighterColors = {
      '#dc3545': '#ff6b6b',  // Red -> Bright red
      '#007bff': '#4dabf7',  // Blue -> Bright blue  
      '#28a745': '#51cf66',  // Green -> Bright green
      '#6c757d': '#adb5bd'   // Gray -> Light gray
    };
    
    return brighterColors[color] || '#ff6b6b';
  }
  
  onConnectionClick(connection, event) {
    debugLog('Connection management for ID: ' + connection.id);
    
    // Check if this is a right-click (context menu)
    if (event.button === 2 || event.ctrlKey) {
      this.showConnectionContextMenu(connection, event);
      return;
    }
    
    // Left click - show connection options
    if (confirm('Delete this connection?')) {
      this.saveStateForUndo();
      this.deleteConnection(connection.id);
    }
  }
  
  showConnectionContextMenu(connection, event) {
    // Prevent the default context menu
    event.preventDefault();
    
    // Remove any existing context menu
    const existingMenu = document.getElementById('connection-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'connection-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      min-width: 180px;
      font-size: 14px;
    `;
    
    // Menu items
    const menuItems = [
      { label: '✏️ Edit Properties', action: () => this.editConnectionProperties(connection) },
      { label: '🔄 Change Type', action: () => this.changeConnectionType(connection) },
      { label: '↔️ Change Direction', action: () => this.changeConnectionDirection(connection) },
      { label: '🏷️ Edit Label', action: () => this.editConnectionLabel(connection) },
      { label: '🗑️ Delete', action: () => this.deleteConnectionWithConfirm(connection) }
    ];
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
      `;
      menuItem.textContent = item.label;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f0f0f0';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'white';
      });
      
      menuItem.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
      
      menu.appendChild(menuItem);
    });
    
    // Add to page
    document.body.appendChild(menu);
    
    // Remove menu when clicking elsewhere
    const removeMenu = () => {
      if (menu.parentNode) {
        menu.remove();
      }
      document.removeEventListener('click', removeMenu);
    };
    
    // Delay adding the listener to prevent immediate removal
    setTimeout(() => {
      document.addEventListener('click', removeMenu);
    }, 100);
  }
  
  editConnectionProperties(connection) {
    const protocol = prompt('Enter connection protocol:', connection.protocol || '');
    if (protocol !== null) {
      this.saveStateForUndo();
      connection.protocol = protocol;
      this.refreshConnection(connection);
      debugLog('Connection protocol updated to: ' + protocol);
    }
  }
  
  changeConnectionType(connection) {
    const types = ['electrical', 'power', 'data', 'mechanical'];
    const currentType = connection.kind || 'electrical';
    const newType = prompt(`Current type: ${currentType}\nEnter new type (${types.join(', ')}):`, currentType);
    
    if (newType && types.includes(newType.toLowerCase())) {
      this.saveStateForUndo();
      connection.kind = newType.toLowerCase();
      connection.style = this.getConnectionStyle(connection.kind);
      this.refreshConnection(connection);
      debugLog('Connection type changed to: ' + connection.kind);
    } else if (newType !== null) {
      alert('Invalid connection type. Valid types: ' + types.join(', '));
    }
  }
  
  changeConnectionDirection(connection) {
    const directions = ['forward', 'backward', 'bidirectional', 'none'];
    const currentDir = connection.arrowDirection || 'forward';
    const newDir = prompt(`Current direction: ${currentDir}\nEnter new direction (${directions.join(', ')}):`, currentDir);
    
    if (newDir && directions.includes(newDir.toLowerCase())) {
      this.saveStateForUndo();
      connection.arrowDirection = newDir.toLowerCase();
      this.refreshConnection(connection);
      debugLog('Connection direction changed to: ' + connection.arrowDirection);
    } else if (newDir !== null) {
      alert('Invalid direction. Valid directions: ' + directions.join(', '));
    }
  }
  
  editConnectionLabel(connection) {
    const label = prompt('Enter connection label:', connection.label || '');
    if (label !== null) {
      this.saveStateForUndo();
      connection.label = label;
      this.refreshConnection(connection);
      debugLog('Connection label updated to: ' + label);
    }
  }
  
  deleteConnectionWithConfirm(connection) {
    if (confirm('Delete this connection?')) {
      this.saveStateForUndo();
      this.deleteConnection(connection.id);
    }
  }
  
  refreshConnection(connection) {
    // Remove the existing connection visual
    const connectionElement = this.connectionsLayer.querySelector(`[data-connection-id="${connection.id}"]`);
    if (connectionElement) {
      connectionElement.remove();
    }
    
    // Re-render the connection with updated properties
    this.renderConnection(connection);
  }
  
  showConnectionTemplates() {
    // Remove any existing template dialog
    const existingDialog = document.getElementById('connection-templates-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Create template dialog
    const dialog = document.createElement('div');
    dialog.id = 'connection-templates-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      z-index: 10000;
      min-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    dialog.innerHTML = `
      <h3 style="margin-top: 0;">Connection Templates</h3>
      <p style="color: #666; margin-bottom: 20px;">Choose a template to quickly apply connection settings:</p>
      
      <div id="template-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <!-- Templates will be added here -->
      </div>
      
      <div style="margin-top: 20px; text-align: right;">
        <button id="close-templates" style="padding: 8px 16px; margin-left: 10px; 
                border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer;">
          Close
        </button>
      </div>
    `;
    
    // Add templates to the grid
    const templateGrid = dialog.querySelector('#template-grid');
    const templates = this.getConnectionTemplates();
    
    templates.forEach(template => {
      const templateCard = document.createElement('div');
      templateCard.style.cssText = `
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 15px;
        cursor: pointer;
        background: #fafafa;
        transition: all 0.2s;
      `;
      
      templateCard.innerHTML = `
        <h4 style="margin: 0 0 8px 0; color: ${template.style.color};">${template.icon} ${template.name}</h4>
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">${template.description}</p>
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg width="60" height="20" viewBox="0 0 60 20">
            <line x1="5" y1="10" x2="45" y2="10" 
                  stroke="${template.style.color}" 
                  stroke-width="${template.style.width}"
                  ${template.style.dashArray !== 'none' ? `stroke-dasharray="${template.style.dashArray}"` : ''}/>
            ${this.getTemplateArrowSVG(template)}
          </svg>
          <span style="font-size: 11px; color: #888;">${template.kind}</span>
        </div>
      `;
      
      templateCard.addEventListener('mouseenter', () => {
        templateCard.style.background = '#f0f8ff';
        templateCard.style.borderColor = '#0066cc';
      });
      
      templateCard.addEventListener('mouseleave', () => {
        templateCard.style.background = '#fafafa';
        templateCard.style.borderColor = '#ddd';
      });
      
      templateCard.addEventListener('click', () => {
        this.applyConnectionTemplate(template);
        dialog.remove();
      });
      
      templateGrid.appendChild(templateCard);
    });
    
    // Close button handler
    dialog.querySelector('#close-templates').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Add to page
    document.body.appendChild(dialog);
    
    // Close on outside click
    const closeOnOutsideClick = (e) => {
      if (!dialog.contains(e.target)) {
        dialog.remove();
        document.removeEventListener('click', closeOnOutsideClick);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);
  }
  
  getConnectionTemplates() {
    return [
      {
        name: 'Standard Power',
        description: 'Power supply connections with voltage validation',
        icon: '🔌',
        kind: 'power',
        arrowDirection: 'forward',
        style: this.getConnectionStyle('power'),
        validation: { requireVoltage: true, requireCurrent: true }
      },
      {
        name: 'USB Data',
        description: 'USB communication with protocol labeling',
        icon: '🔌',
        kind: 'data',
        arrowDirection: 'bidirectional',
        style: this.getConnectionStyle('data'),
        protocol: 'USB',
        validation: { requireProtocol: true }
      },
      {
        name: 'SPI Bus',
        description: 'SPI serial communication interface',
        icon: '📊',
        kind: 'data',
        arrowDirection: 'bidirectional',
        style: this.getConnectionStyle('data'),
        protocol: 'SPI',
        validation: { requireProtocol: true }
      },
      {
        name: 'I2C Bus',
        description: 'I2C serial communication with addressing',
        icon: '📡',
        kind: 'data',
        arrowDirection: 'bidirectional',
        style: this.getConnectionStyle('data'),
        protocol: 'I2C',
        validation: { requireProtocol: true }
      },
      {
        name: 'GPIO Signal',
        description: 'General purpose digital signal',
        icon: '⚡',
        kind: 'electrical',
        arrowDirection: 'forward',
        style: this.getConnectionStyle('electrical'),
        validation: { requireVoltage: true }
      },
      {
        name: 'Mechanical Link',
        description: 'Physical mechanical connection',
        icon: '⚙️',
        kind: 'mechanical',
        arrowDirection: 'none',
        style: this.getConnectionStyle('mechanical'),
        validation: {}
      },
      {
        name: 'Ethernet',
        description: 'Ethernet network connection',
        icon: '🌐',
        kind: 'data',
        arrowDirection: 'bidirectional',
        style: this.getConnectionStyle('data'),
        protocol: 'Ethernet',
        validation: { requireProtocol: true }
      },
      {
        name: 'PWM Control',
        description: 'Pulse width modulation control signal',
        icon: '📈',
        kind: 'electrical',
        arrowDirection: 'forward',
        style: this.getConnectionStyle('electrical'),
        protocol: 'PWM',
        validation: { requireVoltage: true }
      }
    ];
  }
  
  getTemplateArrowSVG(template) {
    const arrows = [];
    const style = template.style;
    
    if (template.arrowDirection === 'forward' || template.arrowDirection === 'bidirectional') {
      arrows.push(`<polygon points="45,10 41,7 41,13" fill="${style.color}"/>`);
    }
    
    if (template.arrowDirection === 'backward' || template.arrowDirection === 'bidirectional') {
      arrows.push(`<polygon points="15,10 19,7 19,13" fill="${style.color}"/>`);
    }
    
    return arrows.join('');
  }
  
  applyConnectionTemplate(template) {
    // Update the UI selectors to match the template
    const connectionTypeSelect = document.getElementById('connection-type-select');
    const arrowDirectionSelect = document.getElementById('arrow-direction-select');
    
    if (connectionTypeSelect) {
      connectionTypeSelect.value = template.kind;
      this.selectedConnectionType = template.kind;
    }
    
    if (arrowDirectionSelect) {
      arrowDirectionSelect.value = template.arrowDirection;
      this.selectedArrowDirection = template.arrowDirection;
    }
    
    // Store the template for future connections
    this.activeTemplate = template;
    
    debugLog(`Applied connection template: ${template.name}`);
    alert(`Template "${template.name}" applied!\nNext connections will use these settings:\n• Type: ${template.kind}\n• Direction: ${template.arrowDirection}${template.protocol ? '\n• Protocol: ' + template.protocol : ''}`);
  }
  
  showBulkConnectionDialog() {
    // Remove any existing dialog
    const existingDialog = document.getElementById('bulk-connection-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Create bulk connection dialog
    const dialog = document.createElement('div');
    dialog.id = 'bulk-connection-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      z-index: 1000;
      min-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    dialog.innerHTML = `
      <h3 style="margin-top: 0;">Bulk Connection Operations</h3>
      
      <div style="margin-bottom: 20px;">
        <h4>Connection Statistics</h4>
        <div id="connection-stats" style="font-size: 14px; color: #666;"></div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4>Bulk Operations</h4>
        <button id="validate-all-connections" style="display: block; width: 100%; margin: 5px 0; padding: 10px; 
                border: 1px solid #0066cc; background: #f0f8ff; border-radius: 4px; cursor: pointer;">
          🔍 Validate All Connections
        </button>
        <button id="update-connection-styles" style="display: block; width: 100%; margin: 5px 0; padding: 10px; 
                border: 1px solid #28a745; background: #f0fff0; border-radius: 4px; cursor: pointer;">
          🎨 Update All Connection Styles
        </button>
        <button id="auto-organize-connections" style="display: block; width: 100%; margin: 5px 0; padding: 10px; 
                border: 1px solid #ffc107; background: #fffef0; border-radius: 4px; cursor: pointer;">
          📐 Auto-Organize Connections
        </button>
        <button id="export-connection-report" style="display: block; width: 100%; margin: 5px 0; padding: 10px; 
                border: 1px solid #6c757d; background: #f8f9fa; border-radius: 4px; cursor: pointer;">
          📊 Export Connection Report
        </button>
      </div>
      
      <div style="text-align: right;">
        <button id="close-bulk-dialog" style="padding: 8px 16px; 
                border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer;">
          Close
        </button>
      </div>
    `;
    
    // Update connection stats
    this.updateConnectionStats(dialog);
    
    // Add event listeners for bulk operations
    dialog.querySelector('#validate-all-connections').addEventListener('click', () => {
      this.validateAllConnections();
    });
    
    dialog.querySelector('#update-connection-styles').addEventListener('click', () => {
      this.updateAllConnectionStyles();
    });
    
    dialog.querySelector('#auto-organize-connections').addEventListener('click', () => {
      this.autoOrganizeConnections();
    });
    
    dialog.querySelector('#export-connection-report').addEventListener('click', () => {
      this.exportConnectionReport();
    });
    
    dialog.querySelector('#close-bulk-dialog').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Add to page
    document.body.appendChild(dialog);
  }
  
  updateConnectionStats(dialog) {
    const stats = {
      total: this.diagram.connections.length,
      byType: {},
      byDirection: {},
      withProtocols: 0,
      withWarnings: 0
    };
    
    this.diagram.connections.forEach(conn => {
      // Count by type
      const type = conn.kind || 'electrical';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      // Count by direction
      const direction = conn.arrowDirection || 'forward';
      stats.byDirection[direction] = (stats.byDirection[direction] || 0) + 1;
      
      // Count protocols
      if (conn.protocol || conn.label) {
        stats.withProtocols++;
      }
    });
    
    const statsDiv = dialog.querySelector('#connection-stats');
    statsDiv.innerHTML = `
      <p><strong>Total Connections:</strong> ${stats.total}</p>
      <p><strong>By Type:</strong> ${Object.entries(stats.byType).map(([k,v]) => `${k}: ${v}`).join(', ')}</p>
      <p><strong>By Direction:</strong> ${Object.entries(stats.byDirection).map(([k,v]) => `${k}: ${v}`).join(', ')}</p>
      <p><strong>With Labels:</strong> ${stats.withProtocols}</p>
    `;
  }
  
  validateAllConnections() {
    const results = [];
    let errorCount = 0;
    let warningCount = 0;
    
    this.diagram.connections.forEach(conn => {
      const sourceBlock = this.diagram.blocks.find(b => b.id === conn.source.blockId);
      const targetBlock = this.diagram.blocks.find(b => b.id === conn.target.blockId);
      
      if (sourceBlock && targetBlock) {
        const sourceIntf = sourceBlock.interfaces.find(i => i.id === conn.source.interfaceId);
        const targetIntf = targetBlock.interfaces.find(i => i.id === conn.target.interfaceId);
        
        if (sourceIntf && targetIntf) {
          const validation = this.validateConnection(sourceIntf, targetIntf, conn.kind);
          
          if (!validation.valid) {
            errorCount++;
            results.push(`❌ ${sourceBlock.name} → ${targetBlock.name}: ${validation.errors.join(', ')}`);
          } else if (validation.warnings.length > 0) {
            warningCount++;
            results.push(`⚠️ ${sourceBlock.name} → ${targetBlock.name}: ${validation.warnings.join(', ')}`);
          }
        }
      }
    });
    
    if (results.length === 0) {
      alert('✅ All connections are valid!');
    } else {
      const summary = `Validation Results:\n• ${errorCount} errors\n• ${warningCount} warnings\n\n${results.join('\n')}`;
      alert(summary);
    }
    
    debugLog(`Connection validation completed: ${errorCount} errors, ${warningCount} warnings`);
  }
  
  updateAllConnectionStyles() {
    this.saveStateForUndo();
    
    let updatedCount = 0;
    this.diagram.connections.forEach(conn => {
      const newStyle = this.getConnectionStyle(conn.kind || 'electrical');
      if (JSON.stringify(conn.style) !== JSON.stringify(newStyle)) {
        conn.style = newStyle;
        this.refreshConnection(conn);
        updatedCount++;
      }
    });
    
    alert(`Updated styles for ${updatedCount} connections`);
    debugLog(`Updated styles for ${updatedCount} connections`);
  }
  
  autoOrganizeConnections() {
    // This is a placeholder for auto-organization logic
    alert('Auto-organize connections feature coming soon!\n\nThis will automatically:\n• Route connections to avoid overlaps\n• Optimize connection paths\n• Group related connections');
    debugLog('Auto-organize connections requested');
  }
  
  exportConnectionReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalConnections: this.diagram.connections.length,
      connections: this.diagram.connections.map(conn => {
        const sourceBlock = this.diagram.blocks.find(b => b.id === conn.source.blockId);
        const targetBlock = this.diagram.blocks.find(b => b.id === conn.target.blockId);
        
        return {
          id: conn.id,
          source: sourceBlock ? sourceBlock.name : 'Unknown',
          target: targetBlock ? targetBlock.name : 'Unknown',
          type: conn.kind || 'electrical',
          direction: conn.arrowDirection || 'forward',
          protocol: conn.protocol || '',
          label: conn.label || ''
        };
      })
    };
    
    const reportText = JSON.stringify(report, null, 2);
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `connection-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    debugLog('Connection report exported');
    alert('Connection report exported successfully!');
  }
  
  deleteConnection(connectionId) {
    debugLog('Deleting connection: ' + connectionId);
    
    // Remove from diagram data
    this.diagram.connections = this.diagram.connections.filter(c => c.id !== connectionId);
    
    // Remove from SVG
    const connectionElement = this.connectionsLayer.querySelector(`[data-connection-id="${connectionId}"]`);
    if (connectionElement) {
      connectionElement.remove();
      debugLog('Connection deleted successfully');
    } else {
      debugLog('ERROR: Connection element not found for deletion');
    }
  }
  
  getPortPosition(block, intf) {
    const side = intf.port.side;
    const portIndex = intf.port.index;
    
    let x, y;
    if (side === 'left') {
      x = block.x;
      y = block.y + 20 + portIndex * 20;
    } else if (side === 'right') {
      x = block.x + block.width;
      y = block.y + 20 + portIndex * 20;
    } else if (side === 'top') {
      x = block.x + 20 + portIndex * 20;
      y = block.y;
    } else { // bottom
      x = block.x + 20 + portIndex * 20;
      y = block.y + block.height;
    }
    
    return { x, y };
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
    this.saveState(); // Save for undo before starting drag
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
    debugLog("promptAddBlock called");
    const name = prompt("Enter block name:", "New Block");
    debugLog("User entered name: " + name);
    if (name) {
      debugLog("About to call addBlock with name: " + name);
      try {
        // Calculate position with offset to avoid overlap
        const blockCount = this.diagram.blocks.length;
        const offsetX = 100 + (blockCount * 30); // Move right by 30px for each block
        const offsetY = 100 + (blockCount * 30); // Move down by 30px for each block
        
        const result = this.addBlock(name, offsetX, offsetY);
        debugLog("addBlock returned: " + (result ? "success" : "failed"));
      } catch (e) {
        debugLog("ERROR in addBlock: " + e.message);
      }
    } else {
      debugLog("User cancelled or entered empty name");
    }
  }
  
  toggleSnapToGrid() {
    this.snapToGridEnabled = !this.snapToGridEnabled;
    const btn = document.getElementById('btn-snap-grid');
    if (this.snapToGridEnabled) {
      btn.classList.add('active');
      btn.textContent = 'Snap to Grid';
    } else {
      btn.classList.remove('active');
      btn.textContent = 'Snap Off';
    }
    console.log(`Snap to grid: ${this.snapToGridEnabled ? 'ON' : 'OFF'}`);
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
    
    // Update tooltip events for all blocks
    this.updateBlockHoverEvents();
    
    // Update search results if search is active
    if (this.searchState && (this.searchState.query || this.searchState.activeFilter !== 'all')) {
      this.applySearchAndFilter();
    }
    
    // TODO: Render connections
  }
}

// Initialize the editor when the DOM is loaded
let editor;
document.addEventListener('DOMContentLoaded', () => {
  debugLog('DOM loaded, creating editor...');
  console.log('DOM loaded, creating editor...');
  try {
    debugLog('About to create SystemBlocksEditor...');
    editor = new SystemBlocksEditor();
    debugLog('Editor created successfully!');
    console.log('Editor created successfully:', editor);
    
    // Test button click
    setTimeout(() => {
      const addButton = document.getElementById('btn-add-block');
      if (addButton) {
        console.log('Add button found:', addButton);
      } else {
        console.log('Add button NOT found!');
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error creating editor:', error);
  }
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

// ==================== UNDO/REDO SYSTEM ====================

SystemBlocksEditor.prototype.saveState = function() {
  if (this.isPerformingUndoRedo) return; // Don't save state during undo/redo operations
  
  // Deep copy current diagram state
  const state = {
    diagram: JSON.parse(JSON.stringify(this.diagram)),
    selectedBlockId: this.selectedBlock ? this.selectedBlock.id : null,
    hierarchyStack: JSON.parse(JSON.stringify(this.hierarchyStack)),
    currentPath: [...this.currentPath]
  };
  
  // Add to undo stack
  this.undoStack.push(state);
  
  // Limit stack size
  if (this.undoStack.length > this.maxUndoLevels) {
    this.undoStack.shift();
  }
  
  // Clear redo stack when new action is performed
  this.redoStack = [];
  
  this.updateUndoRedoButtons();
};

SystemBlocksEditor.prototype.undo = function() {
  if (this.undoStack.length === 0) return;
  
  this.isPerformingUndoRedo = true;
  
  // Save current state to redo stack
  const currentState = {
    diagram: JSON.parse(JSON.stringify(this.diagram)),
    selectedBlockId: this.selectedBlock ? this.selectedBlock.id : null,
    hierarchyStack: JSON.parse(JSON.stringify(this.hierarchyStack)),
    currentPath: [...this.currentPath]
  };
  this.redoStack.push(currentState);
  
  // Restore previous state
  const previousState = this.undoStack.pop();
  this.diagram = previousState.diagram;
  this.hierarchyStack = previousState.hierarchyStack;
  this.currentPath = previousState.currentPath;
  
  // Restore selection
  this.selectedBlock = null;
  if (previousState.selectedBlockId) {
    this.selectedBlock = this.diagram.blocks.find(b => b.id === previousState.selectedBlockId);
  }
  
  this.renderDiagram();
  this.updateUndoRedoButtons();
  
  this.isPerformingUndoRedo = false;
  console.log('Undo performed');
};

SystemBlocksEditor.prototype.redo = function() {
  if (this.redoStack.length === 0) return;
  
  this.isPerformingUndoRedo = true;
  
  // Save current state to undo stack
  const currentState = {
    diagram: JSON.parse(JSON.stringify(this.diagram)),
    selectedBlockId: this.selectedBlock ? this.selectedBlock.id : null,
    hierarchyStack: JSON.parse(JSON.stringify(this.hierarchyStack)),
    currentPath: [...this.currentPath]
  };
  this.undoStack.push(currentState);
  
  // Restore future state
  const futureState = this.redoStack.pop();
  this.diagram = futureState.diagram;
  this.hierarchyStack = futureState.hierarchyStack;
  this.currentPath = futureState.currentPath;
  
  // Restore selection
  this.selectedBlock = null;
  if (futureState.selectedBlockId) {
    this.selectedBlock = this.diagram.blocks.find(b => b.id === futureState.selectedBlockId);
  }
  
  this.renderDiagram();
  this.updateUndoRedoButtons();
  
  this.isPerformingUndoRedo = false;
  console.log('Redo performed');
};

SystemBlocksEditor.prototype.updateUndoRedoButtons = function() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  
  undoBtn.disabled = this.undoStack.length === 0;
  redoBtn.disabled = this.redoStack.length === 0;
  
  // Update tooltips with action count
  undoBtn.title = `Undo (${this.undoStack.length} actions available)`;
  redoBtn.title = `Redo (${this.redoStack.length} actions available)`;
};

SystemBlocksEditor.prototype.handleKeyboardShortcuts = function(e) {
  // Check if we're in a text input - don't handle shortcuts
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return;
  }
  
  const isCtrl = e.ctrlKey || e.metaKey; // Support both Ctrl and Cmd
  
  if (isCtrl && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    this.undo();
  } else if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    this.redo();
  } else if (isCtrl && e.key === 's') {
    e.preventDefault();
    this.saveDiagram();
  } else if (isCtrl && e.key === 'n') {
    e.preventDefault();
    this.newDiagram();
  } else if (isCtrl && e.key === 'f') {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (this.selectedBlock) {
      e.preventDefault();
      this.deleteSelectedBlock();
    }
  } else if (e.key === 'Escape') {
    this.selectedBlock = null;
    this.selectBlock(null);
  }
};

SystemBlocksEditor.prototype.deleteSelectedBlock = function() {
  if (!this.selectedBlock) return;
  
  this.saveState(); // Save for undo
  
  const blockId = this.selectedBlock.id;
  
  // Remove block from diagram
  this.diagram.blocks = this.diagram.blocks.filter(b => b.id !== blockId);
  
  // Remove connections involving this block
  this.diagram.connections = this.diagram.connections.filter(c => 
    c.from.blockId !== blockId && c.to.blockId !== blockId
  );
  
  this.selectedBlock = null;
  this.renderDiagram();
  
  console.log(`Deleted block: ${blockId}`);
};

SystemBlocksEditor.prototype.newDiagram = function() {
  this.diagram = this.createEmptyDiagram();
  this.selectedBlock = null;
  this.hierarchyStack = [];
  this.currentPath = [];
  this.rootDiagram = this.diagram;
  
  // Clear undo/redo stacks for new diagram
  this.undoStack = [];
  this.redoStack = [];
  this.updateUndoRedoButtons();
  
  this.renderDiagram();
  this.updateBreadcrumb();
  this.renderDiagram();
  this.updateBreadcrumb();
  this.updateHierarchyButtons();
};

// ==================== TOOLTIP SYSTEM ====================

SystemBlocksEditor.prototype.showTooltip = function(e, block) {
  // Remove any existing tooltip
  this.hideTooltip();
  
  // Create tooltip content
  let content = `<strong>${block.name}</strong><br/>`;
  content += `Type: ${block.type}<br/>`;
  content += `Status: ${block.status || 'Placeholder'}<br/>`;
  
  // Add attributes if they exist
  const attributes = block.attributes || {};
  const attributeKeys = Object.keys(attributes);
  if (attributeKeys.length > 0) {
    content += '<br/><strong>Attributes:</strong><br/>';
    attributeKeys.forEach(key => {
      if (attributes[key]) {
        content += `${key}: ${attributes[key]}<br/>`;
      }
    });
  }
  
  // Add interfaces info
  const interfaces = block.interfaces || [];
  if (interfaces.length > 0) {
    content += `<br/><strong>Interfaces:</strong> ${interfaces.length}<br/>`;
    interfaces.slice(0, 3).forEach(intf => {
      content += `• ${intf.name} (${intf.kind})<br/>`;
    });
    if (interfaces.length > 3) {
      content += `• ... and ${interfaces.length - 3} more<br/>`;
    }
  }
  
  // Add CAD links info
  const links = block.links || [];
  if (links.length > 0) {
    content += `<br/><strong>Links:</strong> ${links.length} connected<br/>`;
  }
  
  // Add child diagram info
  if (this.hasChildDiagram && this.hasChildDiagram(block)) {
    const childBlocks = block.childDiagram?.blocks?.length || 0;
    content += `<br/><strong>Child Diagram:</strong> ${childBlocks} blocks<br/>`;
  }
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.innerHTML = content;
  tooltip.id = 'block-tooltip';
  
  // Position tooltip
  const rect = this.svg.getBoundingClientRect();
  tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
  tooltip.style.top = (e.clientY - rect.top - 30) + 'px';
  
  // Add to SVG container
  document.getElementById('canvas-container').appendChild(tooltip);
};

SystemBlocksEditor.prototype.hideTooltip = function() {
  const existingTooltip = document.getElementById('block-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
};

SystemBlocksEditor.prototype.updateBlockHoverEvents = function() {
  // Add hover events to all block groups
  document.querySelectorAll('.block-group').forEach(blockGroup => {
    const blockId = blockGroup.getAttribute('data-block-id');
    const block = this.diagram.blocks.find(b => b.id === blockId);
    
    if (block) {
      blockGroup.addEventListener('mouseenter', (e) => {
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = setTimeout(() => {
          this.showTooltip(e, block);
        }, 800); // Delay before showing tooltip
      });
      
      blockGroup.addEventListener('mouseleave', () => {
        clearTimeout(this.tooltipTimeout);
        this.hideTooltip();
      });
      
      blockGroup.addEventListener('mousemove', (e) => {
        // Update tooltip position if it exists
        const tooltip = document.getElementById('block-tooltip');
        if (tooltip) {
          const rect = this.svg.getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
          tooltip.style.top = (e.clientY - rect.top - 30) + 'px';
        }
      });
    }
  });
};

// ==================== SEARCH AND FILTER SYSTEM ====================

SystemBlocksEditor.prototype.initializeSearch = function() {
  // Initialize search state
  this.searchState = {
    query: '',
    activeFilter: 'all',
    highlightedBlocks: [],
    matchCount: 0
  };
  
  // Bind search input events
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    // Real-time search as user types
    searchInput.addEventListener('input', (e) => {
      this.performSearch(e.target.value);
    });
    
    // Clear search on Escape
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = '';
        this.performSearch('');
        e.target.blur();
      }
    });
  }
  
  // Bind filter buttons
  const filterButtons = ['filter-all', 'filter-placeholder', 'filter-implemented'];
  filterButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => {
        this.setActiveFilter(buttonId.replace('filter-', ''));
      });
    }
  });
};

SystemBlocksEditor.prototype.performSearch = function(query) {
  this.searchState.query = query.toLowerCase().trim();
  this.applySearchAndFilter();
};

SystemBlocksEditor.prototype.setActiveFilter = function(filterType) {
  // Update button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`filter-${filterType}`).classList.add('active');
  
  this.searchState.activeFilter = filterType;
  this.applySearchAndFilter();
};

SystemBlocksEditor.prototype.applySearchAndFilter = function() {
  const blocks = this.diagram.blocks;
  let visibleBlocks = [];
  let highlightedBlocks = [];
  
  blocks.forEach(block => {
    // Apply status filter
    let matchesFilter = true;
    if (this.searchState.activeFilter === 'placeholder') {
      matchesFilter = !block.status || block.status === 'Placeholder';
    } else if (this.searchState.activeFilter === 'implemented') {
      matchesFilter = block.status === 'Implemented' || block.status === 'Verified';
    }
    
    // Apply search query
    let matchesSearch = true;
    let isHighlighted = false;
    
    if (this.searchState.query) {
      const searchableText = [
        block.name || '',
        block.type || '',
        block.status || 'Placeholder',
        ...(block.interfaces || []).map(intf => intf.name || ''),
        ...Object.entries(block.attributes || {}).flat()
      ].join(' ').toLowerCase();
      
      matchesSearch = searchableText.includes(this.searchState.query);
      isHighlighted = matchesSearch;
    }
    
    if (matchesFilter && matchesSearch) {
      visibleBlocks.push(block);
      if (isHighlighted) {
        highlightedBlocks.push(block.id);
      }
    }
  });
  
  // Update search state
  this.searchState.highlightedBlocks = highlightedBlocks;
  this.searchState.matchCount = this.searchState.query ? highlightedBlocks.length : visibleBlocks.length;
  
  // Apply visual updates
  this.updateBlockVisibility(visibleBlocks, highlightedBlocks);
  this.updateSearchResultsInfo();
};

SystemBlocksEditor.prototype.updateBlockVisibility = function(visibleBlocks, highlightedBlocks) {
  const allBlocks = this.diagram.blocks;
  
  allBlocks.forEach(block => {
    const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
    if (blockElement) {
      const isVisible = visibleBlocks.find(b => b.id === block.id);
      const isHighlighted = highlightedBlocks.includes(block.id);
      
      // Remove existing search classes
      blockElement.classList.remove('search-highlight', 'search-dimmed');
      
      if (!isVisible) {
        // Hide filtered out blocks
        blockElement.style.display = 'none';
      } else {
        // Show visible blocks
        blockElement.style.display = '';
        
        if (this.searchState.query) {
          if (isHighlighted) {
            blockElement.classList.add('search-highlight');
          } else {
            blockElement.classList.add('search-dimmed');
          }
        }
      }
    }
  });
};

SystemBlocksEditor.prototype.updateSearchResultsInfo = function() {
  const resultsSpan = document.getElementById('search-results');
  if (resultsSpan) {
    if (this.searchState.query) {
      const totalBlocks = this.diagram.blocks.length;
      resultsSpan.textContent = `${this.searchState.matchCount}/${totalBlocks}`;
    } else {
      const visibleCount = this.getVisibleBlockCount();
      resultsSpan.textContent = visibleCount === this.diagram.blocks.length ? '' : `${visibleCount} shown`;
    }
  }
};

SystemBlocksEditor.prototype.getVisibleBlockCount = function() {
  let count = 0;
  this.diagram.blocks.forEach(block => {
    if (this.searchState.activeFilter === 'placeholder') {
      if (!block.status || block.status === 'Placeholder') count++;
    } else if (this.searchState.activeFilter === 'implemented') {
      if (block.status === 'Implemented' || block.status === 'Verified') count++;
    } else {
      count++;
    }
  });
  return count;
};

SystemBlocksEditor.prototype.clearSearch = function() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  this.searchState.query = '';
  this.searchState.highlightedBlocks = [];
  this.applySearchAndFilter();
};

// Global function for Python to call with import results
function receiveImportFromPython(responseData) {
  if (editor) {
    editor.handleImportResponse(responseData);
  }
}
