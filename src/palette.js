// IMMEDIATE TEST - This should appear in console if JS is loading
console.log("=== JAVASCRIPT FILE LOADING ===");
console.error("=== JS ERROR TEST ===");

// Visual debug function for when console doesn't work
function debugLog(message) {
  // Disabled for performance - only enable for debugging
  // try {
  //   const debugDiv = document.getElementById('debug-log');
  //   if (debugDiv) {
  //     debugDiv.innerHTML += message + '<br>';
  //     debugDiv.scrollTop = debugDiv.scrollHeight;
  //   }
  // } catch (e) {
  //   // Ignore errors if debug div doesn't exist yet
  // }
}

debugLog("=== JAVASCRIPT FILE LOADED ===");
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
    this.viewBoxStart = { x: 0, y: 0 }; // For smooth panning
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
    
    // MILESTONE 14: Advanced Diagram Features
    this.selectedBlocks = new Set(); // Multi-selection support
    this.isMultiSelectMode = false; // Multi-select with Ctrl+click
    this.selectionBox = null; // Selection box for lasso selection
    this.isDrawingSelectionBox = false;
    this.selectionStart = { x: 0, y: 0 };
    this.groups = new Map(); // Block groups management
    this.annotations = []; // Text labels, notes, dimensions, callouts
    this.layers = new Map(); // Layer management system
    this.currentLayer = 'default'; // Current active layer
    this.layoutEngine = null; // Auto-layout algorithms
    
    // Performance optimization
    this.lastMouseMoveTime = 0;
    this.mouseMoveThreshold = 16; // ~60fps throttling - balance between smooth and performance
    
    // Lasso selection
    this.isLassoSelecting = false;
    this.lassoStart = { x: 0, y: 0 };
    this.lassoStartMouse = { x: 0, y: 0 }; // Mouse coordinates for threshold check
    this.lassoRect = null;
    this.lassoThreshold = 5; // Minimum pixels to drag before lasso activates
    this.potentialLasso = false; // Track if we might start lasso selection
    
    this.initializeUI();
    this.setupEventListeners();
    this.initializeSearch();
    this.initializeProfessionalUI();
    this.initializeAdvancedFeatures();
  }

  // === MILESTONE 10: PROFESSIONAL UI ENHANCEMENTS ===
  initializeProfessionalUI() {
    // Initialize tooltip system
    this.setupTooltips();
    
    // Initialize context menus
    this.setupContextMenus();
    
    // Initialize loading states
    this.setupLoadingStates();
    
    // Initialize keyboard shortcuts visual feedback
    this.setupKeyboardHints();
    
    // Smooth animations disabled for performance
  }

  // === BLOCK SHAPE SYSTEM ===
  // Create different block shapes for different purposes
  createBlockShape(shape, width, height, x, y, isHalo) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 2;
    
    switch (shape) {
      case 'rectangle':
      case 'process':
        return this.createRectangleBlock(width, height, x, y, isHalo);
        
      case 'circle':
      case 'connector':
        return this.createCircleBlock(radius, centerX, centerY, isHalo);
        
      case 'diamond':
      case 'decision':
        return this.createDiamondBlock(width, height, centerX, centerY, isHalo);
        
      case 'hexagon':
      case 'preparation':
        return this.createHexagonBlock(width, height, centerX, centerY, isHalo);
        
      case 'parallelogram':
      case 'data':
        return this.createParallelogramBlock(width, height, x, y, isHalo);
        
      case 'oval':
      case 'terminal':
        return this.createOvalBlock(width, height, centerX, centerY, isHalo);
        
      case 'trapezoid':
      case 'manual':
        return this.createTrapezoidBlock(width, height, x, y, isHalo);
        
      case 'cylinder':
      case 'database':
        return this.createCylinderBlock(width, height, centerX, centerY, isHalo);
        
      case 'cloud':
      case 'service':
        return this.createCloudBlock(width, height, centerX, centerY, isHalo);
        
      case 'star':
      case 'checkpoint':
        return this.createStarBlock(radius, centerX, centerY, isHalo);
        
      default:
        return this.createRectangleBlock(width, height, x, y, isHalo);
    }
  }
  
  createRectangleBlock(width, height, x, y, isHalo) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('rx', isHalo ? '8' : '4');
    return rect;
  }
  
  createCircleBlock(radius, centerX, centerY, isHalo) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', radius + (isHalo ? 3 : 0));
    circle.setAttribute('cx', centerX);
    circle.setAttribute('cy', centerY);
    return circle;
  }
  
  createDiamondBlock(width, height, centerX, centerY, isHalo) {
    const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const w = width / 2 + (isHalo ? 3 : 0);
    const h = height / 2 + (isHalo ? 3 : 0);
    const points = [
      `${centerX},${centerY - h}`,      // top
      `${centerX + w},${centerY}`,      // right
      `${centerX},${centerY + h}`,      // bottom
      `${centerX - w},${centerY}`       // left
    ].join(' ');
    diamond.setAttribute('points', points);
    return diamond;
  }
  
  createHexagonBlock(width, height, centerX, centerY, isHalo) {
    const hexagon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const w = width / 2 + (isHalo ? 3 : 0);
    const h = height / 2 + (isHalo ? 3 : 0);
    const offset = w * 0.25; // 25% offset for hexagon shape
    const points = [
      `${centerX - w + offset},${centerY - h}`,    // top-left
      `${centerX + w - offset},${centerY - h}`,    // top-right
      `${centerX + w},${centerY}`,                 // right
      `${centerX + w - offset},${centerY + h}`,    // bottom-right
      `${centerX - w + offset},${centerY + h}`,    // bottom-left
      `${centerX - w},${centerY}`                  // left
    ].join(' ');
    hexagon.setAttribute('points', points);
    return hexagon;
  }
  
  createParallelogramBlock(width, height, x, y, isHalo) {
    const parallelogram = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const offset = width * 0.15; // 15% skew
    const w = width + (isHalo ? 6 : 0);
    const h = height + (isHalo ? 6 : 0);
    const startX = x - (isHalo ? 3 : 0);
    const startY = y - (isHalo ? 3 : 0);
    const points = [
      `${startX + offset},${startY}`,           // top-left
      `${startX + w},${startY}`,                // top-right
      `${startX + w - offset},${startY + h}`,   // bottom-right
      `${startX},${startY + h}`                 // bottom-left
    ].join(' ');
    parallelogram.setAttribute('points', points);
    return parallelogram;
  }
  
  createOvalBlock(width, height, centerX, centerY, isHalo) {
    const oval = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    oval.setAttribute('rx', width / 2 + (isHalo ? 3 : 0));
    oval.setAttribute('ry', height / 2 + (isHalo ? 3 : 0));
    oval.setAttribute('cx', centerX);
    oval.setAttribute('cy', centerY);
    return oval;
  }
  
  createTrapezoidBlock(width, height, x, y, isHalo) {
    const trapezoid = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const offset = width * 0.2; // 20% inset for trapezoid
    const w = width + (isHalo ? 6 : 0);
    const h = height + (isHalo ? 6 : 0);
    const startX = x - (isHalo ? 3 : 0);
    const startY = y - (isHalo ? 3 : 0);
    const points = [
      `${startX + offset},${startY}`,           // top-left
      `${startX + w - offset},${startY}`,       // top-right
      `${startX + w},${startY + h}`,            // bottom-right
      `${startX},${startY + h}`                 // bottom-left
    ].join(' ');
    trapezoid.setAttribute('points', points);
    return trapezoid;
  }
  
  createCylinderBlock(width, height, centerX, centerY, isHalo) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const w = width / 2 + (isHalo ? 3 : 0);
    const h = height / 2 + (isHalo ? 3 : 0);
    const ellipseH = h * 0.15; // Height of cylinder top/bottom
    
    // Main cylinder body
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', w * 2);
    rect.setAttribute('height', h * 2 - ellipseH * 2);
    rect.setAttribute('x', centerX - w);
    rect.setAttribute('y', centerY - h + ellipseH);
    group.appendChild(rect);
    
    // Top ellipse
    const topEllipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    topEllipse.setAttribute('rx', w);
    topEllipse.setAttribute('ry', ellipseH);
    topEllipse.setAttribute('cx', centerX);
    topEllipse.setAttribute('cy', centerY - h + ellipseH);
    group.appendChild(topEllipse);
    
    // Bottom ellipse
    const bottomEllipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    bottomEllipse.setAttribute('rx', w);
    bottomEllipse.setAttribute('ry', ellipseH);
    bottomEllipse.setAttribute('cx', centerX);
    bottomEllipse.setAttribute('cy', centerY + h - ellipseH);
    bottomEllipse.setAttribute('fill', 'none');
    bottomEllipse.setAttribute('stroke', 'currentColor');
    bottomEllipse.setAttribute('stroke-width', '1');
    group.appendChild(bottomEllipse);
    
    return group;
  }
  
  createCloudBlock(width, height, centerX, centerY, isHalo) {
    const cloud = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const w = width / 2 + (isHalo ? 3 : 0);
    const h = height / 2 + (isHalo ? 3 : 0);
    
    // Create cloud shape using bezier curves
    const pathData = [
      `M ${centerX - w * 0.6} ${centerY}`,
      `C ${centerX - w} ${centerY - h * 0.6} ${centerX - w * 0.2} ${centerY - h} ${centerX + w * 0.2} ${centerY - h * 0.8}`,
      `C ${centerX + w * 0.4} ${centerY - h} ${centerX + w} ${centerY - h * 0.6} ${centerX + w * 0.8} ${centerY - h * 0.2}`,
      `C ${centerX + w} ${centerY} ${centerX + w * 0.8} ${centerY + h * 0.4} ${centerX + w * 0.4} ${centerY + h * 0.6}`,
      `C ${centerX + w * 0.2} ${centerY + h} ${centerX - w * 0.2} ${centerY + h} ${centerX - w * 0.4} ${centerY + h * 0.6}`,
      `C ${centerX - w * 0.8} ${centerY + h * 0.4} ${centerX - w} ${centerY + h * 0.2} ${centerX - w * 0.6} ${centerY}`,
      'Z'
    ].join(' ');
    
    cloud.setAttribute('d', pathData);
    return cloud;
  }
  
  createStarBlock(radius, centerX, centerY, isHalo) {
    const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const r = radius + (isHalo ? 3 : 0);
    const innerR = r * 0.4; // Inner radius for star points
    const points = [];
    
    // Create 5-pointed star
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const currentR = i % 2 === 0 ? r : innerR;
      const x = centerX + Math.cos(angle) * currentR;
      const y = centerY + Math.sin(angle) * currentR;
      points.push(`${x},${y}`);
    }
    
    star.setAttribute('points', points.join(' '));
    return star;
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
    this.contextMenu.id = 'fusion-context-menu';  // Add ID for debugging
    document.body.appendChild(this.contextMenu);

    // Add context menu to blocks
    document.addEventListener('contextmenu', (e) => {
      const blockGroup = e.target.closest('.block-group');
      if (blockGroup) {
        e.preventDefault();
        this.selectedBlock = blockGroup;  // Store the selected block
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
        { label: 'Change Shape', action: 'change-shape', icon: 'icon-blocks' },
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
    
    if (!this.selectedBlock) {
      debugLog('No block selected for context menu action');
      return;
    }
    
    const blockId = this.selectedBlock.getAttribute('data-block-id');
    const block = this.diagram.blocks.find(b => b.id === blockId);
    
    if (!block) {
      debugLog('Block not found for context menu action');
      return;
    }
    
    switch (action) {
      case 'edit':
        this.showBlockPropertiesDialog(block);
        break;
      case 'change-shape':
        this.showShapeChangeDialog(block);
        break;
      case 'duplicate':
        this.duplicateBlock(block);
        break;
      case 'link-cad':
        this.showCADLinkDialog(block);
        break;
      case 'status':
        this.showStatusChangeDialog(block);
        break;
      case 'delete':
        this.deleteBlock(block);
        break;
      default:
        debugLog(`Unknown context menu action: ${action}`);
    }
  }

  hideContextMenu() {
    this.contextMenu.classList.remove('show');
  }

  // Context menu action implementations
  showBlockPropertiesDialog(block) {
    this.showNotification(`Editing properties for ${block.name}`, 'info');
    // Future implementation: Show properties dialog
  }

  duplicateBlock(block) {
    const newBlock = {
      ...block,
      id: this.generateId(),
      x: block.x + 20,
      y: block.y + 20,
      name: `${block.name} Copy`
    };
    this.diagram.blocks.push(newBlock);
    this.renderDiagram();
    this.showNotification(`Duplicated ${block.name}`, 'success');
  }

  showCADLinkDialog(block) {
    this.showNotification(`CAD linking for ${block.name} coming soon`, 'info');
    // Future implementation: Show CAD link dialog
  }

  showStatusChangeDialog(block) {
    const statuses = ['Placeholder', 'Planning', 'In Progress', 'Review', 'Complete'];
    const currentIndex = statuses.indexOf(block.status || 'Placeholder');
    const nextIndex = (currentIndex + 1) % statuses.length;
    block.status = statuses[nextIndex];
    this.renderDiagram();
    this.showNotification(`Status changed to ${block.status}`, 'success');
  }

  showShapeChangeDialog(block) {
    // Create shape change dialog - OPTIMIZED
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #2d2d30;
      border: 1px solid #464646;
      border-radius: 8px;
      padding: 24px;
      min-width: 400px;
      max-width: 500px;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 18px;">Change Block Shape</h3>
      
      <div style="margin-bottom: 16px;">
        <p style="color: #d0d0d0; margin: 0 0 12px 0;">Current block: <strong>${block.name}</strong></p>
        <p style="color: #d0d0d0; margin: 0 0 16px 0;">Current shape: <strong>${this.getShapeDisplayName(block.shape || 'rectangle')}</strong></p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 12px; color: #f0f0f0; font-weight: 500;">New Shape:</label>
        <select id="shape-change-selector" style="width: 100%; padding: 8px; background: #383838; color: #f0f0f0; border: 1px solid #464646; border-radius: 4px;">
          <option value="rectangle">Rectangle - Process/Component</option>
          <option value="circle">Circle - Connector/Node</option>
          <option value="diamond">Diamond - Decision/Logic</option>
          <option value="hexagon">Hexagon - Preparation/Setup</option>
          <option value="parallelogram">Parallelogram - Data/Input/Output</option>
          <option value="oval">Oval - Terminal/Start/End</option>
          <option value="trapezoid">Trapezoid - Manual Operation</option>
          <option value="cylinder">Cylinder - Database/Storage</option>
          <option value="cloud">Cloud - Cloud Service/External</option>
          <option value="star">Star - Checkpoint/Important</option>
        </select>
      </div>
      
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="cancel-shape-btn" style="padding: 8px 16px; border: 1px solid #464646; 
                background: #383838; color: #f0f0f0; border-radius: 4px; cursor: pointer;">
          Cancel
        </button>
        <button id="apply-shape-btn" style="padding: 8px 16px; border: none; 
                background: #007acc; color: white; border-radius: 4px; cursor: pointer;">
          Apply Shape
        </button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Set current shape
    const selector = document.getElementById('shape-change-selector');
    selector.value = block.shape || 'rectangle';
    
    const closeDialog = () => {
      document.body.removeChild(overlay);
    };
    
    // Event listeners
    document.getElementById('cancel-shape-btn').addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });
    
    document.getElementById('apply-shape-btn').addEventListener('click', () => {
      const selectedShape = selector.value;
      if (selectedShape !== block.shape) {
        this.saveState(); // Save for undo
        const oldShape = block.shape || 'rectangle';
        block.shape = selectedShape;
        
        // Adjust dimensions for the new shape
        const newDimensions = this.getOptimalDimensionsForShape(selectedShape);
        block.width = newDimensions.width;
        block.height = newDimensions.height;
        
        this.renderDiagram();
        this.showNotification(`Changed shape from ${this.getShapeDisplayName(oldShape)} to ${this.getShapeDisplayName(selectedShape)}`, 'success');
      }
      closeDialog();
    });
  }



  getShapeDisplayName(shape) {
    const shapeNames = {
      'rectangle': 'Rectangle',
      'circle': 'Circle',
      'diamond': 'Diamond',
      'hexagon': 'Hexagon',
      'parallelogram': 'Parallelogram',
      'oval': 'Oval',
      'trapezoid': 'Trapezoid',
      'cylinder': 'Cylinder',
      'cloud': 'Cloud',
      'star': 'Star'
    };
    return shapeNames[shape] || 'Rectangle';
  }

  deleteBlock(block) {
    if (confirm(`Delete ${block.name}?`)) {
      this.diagram.blocks = this.diagram.blocks.filter(b => b.id !== block.id);
      this.renderDiagram();
      this.showNotification(`Deleted ${block.name}`, 'success');
    }
  }

  // Simple notification system
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // For now, just use console.log - could implement toast notifications later
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
      background: rgba(45, 45, 48, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      display: none;
    `;
    document.body.appendChild(this.loadingOverlay);
  }

  showLoading(message = 'Loading...') {
    this.loadingOverlay.querySelector('span').textContent = message;
    this.loadingOverlay.style.display = 'flex';
  }

  hideLoading() {
    this.loadingOverlay.style.display = 'none';
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

  // Disabled for performance
  enableSmoothAnimations() {
    // Animations disabled to improve performance
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
    
    // SVG pan/zoom with optimized event handling
    this.svg.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.svg.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.svg.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.svg.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.svg.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    
    // Handle right-click for panning
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Right-click can be used for panning
      this.onMouseDown(e);
    });
    
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
    return this.addBlockWithShape(name, x, y, type, "rectangle");
  }
  
  addBlockWithShape(name, x, y, type = "Custom", shape = "rectangle") {
    try {
      // Save for undo
      this.saveState();
      
      // Snap initial position to grid
      const snappedPos = this.snapPointToGrid(x, y);
      
      // Adjust dimensions based on shape for better visual appearance
      const dimensions = this.getOptimalDimensionsForShape(shape);
      
      const block = {
        id: this.generateId(),
        name: name,
        type: type,
        shape: shape,
        status: "Placeholder",
        x: snappedPos.x,
        y: snappedPos.y,
        width: dimensions.width,
        height: dimensions.height,
        interfaces: [],
        links: [],
        attributes: {},
        _isNewBlock: true  // Flag for animation
      };
      
      // Add default interfaces
      block.interfaces.push(this.createInterface("VCC", "power", "input", "left", 0));
      block.interfaces.push(this.createInterface("GND", "power", "input", "left", 1));
      block.interfaces.push(this.createInterface("OUT", "data", "output", "right", 0));
      
      // Add to diagram
      this.diagram.blocks.push(block);
      
      // Optimize: Only render the new block instead of full diagram re-render
      this.renderBlock(block);
      
      return block;
    } catch (e) {
      console.error("Error in addBlockWithShape:", e.message);
      throw e;
    }
  }
  
  getOptimalDimensionsForShape(shape) {
    // Return optimal width/height for different shapes
    switch (shape) {
      case 'circle':
      case 'star':
        return { width: 80, height: 80 }; // Square for circular shapes
      case 'diamond':
        return { width: 100, height: 80 }; // Slightly wider for diamond
      case 'hexagon':
        return { width: 140, height: 80 }; // Wider for hexagon
      case 'parallelogram':
      case 'trapezoid':
        return { width: 140, height: 70 }; // Wider and shorter for skewed shapes
      case 'oval':
        return { width: 140, height: 70 }; // Wider oval
      case 'cylinder':
        return { width: 100, height: 90 }; // Taller for cylinder
      case 'cloud':
        return { width: 140, height: 90 }; // Larger for cloud
      case 'rectangle':
      default:
        return { width: 120, height: 60 }; // Default rectangular
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
    
    // Get block shape (default to rectangle if not specified)
    const shape = block.shape || 'rectangle';
    
    // Status halo (background border) - shape-aware
    const statusHalo = this.createBlockShape(shape, block.width + 6, block.height + 6, -3, -3, true);
    statusHalo.setAttribute('class', 'status-halo');
    statusHalo.setAttribute('fill', this.getStatusColor(block.status || 'Placeholder'));
    statusHalo.setAttribute('opacity', '0.3');
    g.appendChild(statusHalo);
    
    // Block shape (main visual element)
    const blockShape = this.createBlockShape(shape, block.width, block.height, 0, 0, false);
    blockShape.setAttribute('class', 'block');
    g.appendChild(blockShape);
    
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
        }, 400); // Match animation duration
      }
      
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
    // Handle different mouse buttons
    if (e.button === 1 || e.button === 2) {
      // Middle/Right mouse button - panning
      if (e.target === this.svg || e.target.closest('.block-group') === null) {
        e.preventDefault();
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.viewBoxStart = { x: this.viewBox.x, y: this.viewBox.y };
        this.svg.style.cursor = 'grabbing';
      }
    } else if (e.button === 0) {
      // Left mouse button - selection or potential lasso
      if (e.target === this.svg || e.target.closest('.block-group') === null) {
        // Clicking on empty space - prepare for potential lasso selection
        this.prepareForLasso(e);
      }
    }
  }
  
  onMouseMove(e) {
    // Throttle mouse move events for better performance
    const now = Date.now();
    if (now - this.lastMouseMoveTime < this.mouseMoveThreshold) {
      return;
    }
    this.lastMouseMoveTime = now;
    
    if (this.isPanning) {
      // Use smooth, optimized panning calculation
      const dx = (e.clientX - this.panStart.x) / this.scale;
      const dy = (e.clientY - this.panStart.y) / this.scale;
      
      this.viewBox.x = this.viewBoxStart.x - dx;
      this.viewBox.y = this.viewBoxStart.y - dy;
      
      this.updateViewBox();
    } else if (this.potentialLasso) {
      // Check if we've moved enough to start lasso selection
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - this.lassoStartMouse.x, 2) + 
        Math.pow(e.clientY - this.lassoStartMouse.y, 2)
      );
      
      if (dragDistance > this.lassoThreshold) {
        this.startLassoSelection();
        this.updateLassoSelection(e);
      }
    } else if (this.isLassoSelecting) {
      // Update lasso selection rectangle
      this.updateLassoSelection(e);
    } else if (this.isDragging && this.selectedBlock) {
      // Use the same coordinate transformation as lasso for consistency
      const rect = this.svg.getBoundingClientRect();
      const currentViewWidth = this.viewBox.width / this.scale;
      const currentViewHeight = this.viewBox.height / this.scale;
      
      const svgX = this.viewBox.x + ((e.clientX - rect.left) / rect.width) * currentViewWidth;
      const svgY = this.viewBox.y + ((e.clientY - rect.top) / rect.height) * currentViewHeight;
      
      const rawX = svgX - this.dragStart.x;
      const rawY = svgY - this.dragStart.y;
      
      // Direct position update for performance - snap to grid on mouse up
      this.selectedBlock.x = rawX;
      this.selectedBlock.y = rawY;
      this.updateBlockPosition(this.selectedBlock);
    }
  }
  
  onMouseUp(e) {
    // Handle different states
    if (this.isPanning) {
      this.isPanning = false;
      this.svg.style.cursor = 'grab';
      return;
    }
    
    if (this.isLassoSelecting) {
      this.completeLassoSelection();
      return;
    }
    
    if (this.potentialLasso) {
      // Was preparing for lasso but didn't drag enough - treat as regular click
      this.potentialLasso = false;
    }
    
    // Snap to grid when drag ends
    if (this.isDragging && this.selectedBlock) {
      const snappedPos = this.snapPointToGrid(this.selectedBlock.x, this.selectedBlock.y);
      this.selectedBlock.x = snappedPos.x;
      this.selectedBlock.y = snappedPos.y;
      this.updateBlockPosition(this.selectedBlock);
    }
    
    this.isDragging = false;
    
    // Clear selection if LEFT clicking on empty space (not middle or right click)
    if (e.button === 0 && (e.target === this.svg || e.target.closest('.block-group') === null)) {
      // Only clear if we didn't just complete a lasso selection and weren't preparing for one
      if (!this.isLassoSelecting && !this.potentialLasso) {
        this.clearSelection();
      }
    }
    
    this.svg.style.cursor = 'grab';
  }
  
  onBlockMouseDown(e, block) {
    e.stopPropagation();
    
    // Only handle LEFT mouse button for block selection/dragging
    if (e.button !== 0) return;
    
    // MILESTONE 14: Enhanced multi-selection support
    if (e.ctrlKey) {
      // Multi-selection with Ctrl+click
      this.toggleMultiSelect(block, true);
      return; // Don't start dragging in multi-select mode
    } else {
      // Single selection or drag operation
      if (!this.selectedBlocks.has(block)) {
        // If clicking on a non-selected block, select only this one
        this.saveState(); // Save for undo before starting drag
        this.toggleMultiSelect(block, false);
      }
    }
    
    this.selectedBlock = block;
    this.isDragging = true;
    
    // Use consistent coordinate transformation
    const rect = this.svg.getBoundingClientRect();
    const currentViewWidth = this.viewBox.width / this.scale;
    const currentViewHeight = this.viewBox.height / this.scale;
    
    const svgX = this.viewBox.x + ((e.clientX - rect.left) / rect.width) * currentViewWidth;
    const svgY = this.viewBox.y + ((e.clientY - rect.top) / rect.height) * currentViewHeight;
    
    this.dragStart = {
      x: svgX - block.x,
      y: svgY - block.y
    };
    
    // Legacy support - also call the old selectBlock method
    this.selectBlock(block);
  }
  
  selectBlock(block) {
    // MILESTONE 14: Enhanced to work with multi-selection
    // This method maintains legacy compatibility while supporting new features
    
    this.selectedBlock = block;
    
    // Update visual selection indicators (handled by updateSelectionVisuals)
    this.updateSelectionVisuals();
    
    // Update context buttons
    this.updateContextButtons(block);
    this.updateHierarchyButtons();
    this.updateToolbarButtonStates();
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
    // Direct DOM update for better performance during dragging
    const blockGroup = document.querySelector(`[data-block-id="${block.id}"]`);
    if (blockGroup) {
      blockGroup.setAttribute('transform', `translate(${block.x}, ${block.y})`);
    }
  }

  // Clear all selections
  clearSelection() {
    this.selectedBlock = null;
    this.selectedBlocks.clear();
    this.updateContextButtons(null);
    this.updateSelectionVisuals();
    
    // Remove visual selection indicators
    document.querySelectorAll('.block-selected').forEach(el => {
      el.classList.remove('block-selected');
    });
  }

  // Check for collision between blocks
  checkBlockCollision(movingBlock, newX, newY) {
    const margin = 10; // Minimum distance between blocks
    
    for (const block of this.diagram.blocks) {
      if (block.id === movingBlock.id) continue; // Skip self
      
      // Check if rectangles overlap with margin
      const movingRight = newX + movingBlock.width + margin;
      const movingBottom = newY + movingBlock.height + margin;
      const movingLeft = newX - margin;
      const movingTop = newY - margin;
      
      const blockRight = block.x + block.width;
      const blockBottom = block.y + block.height;
      const blockLeft = block.x;
      const blockTop = block.y;
      
      // Check for overlap
      if (!(movingRight < blockLeft || 
            movingLeft > blockRight || 
            movingBottom < blockTop || 
            movingTop > blockBottom)) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  }

  // === LASSO SELECTION METHODS ===
  prepareForLasso(e) {
    this.potentialLasso = true;
    
    // Store initial mouse position for threshold check
    const rect = this.svg.getBoundingClientRect();
    const currentViewWidth = this.viewBox.width / this.scale;
    const currentViewHeight = this.viewBox.height / this.scale;
    
    const svgX = this.viewBox.x + ((e.clientX - rect.left) / rect.width) * currentViewWidth;
    const svgY = this.viewBox.y + ((e.clientY - rect.top) / rect.height) * currentViewHeight;
    
    this.lassoStart = { x: svgX, y: svgY };
    this.lassoStartMouse = { x: e.clientX, y: e.clientY }; // Track mouse position for threshold
  }

  startLassoSelection() {
    this.isLassoSelecting = true;
    this.potentialLasso = false;
    
    // Create selection rectangle
    this.lassoRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.lassoRect.setAttribute('class', 'lasso-selection');
    this.lassoRect.setAttribute('x', this.lassoStart.x);
    this.lassoRect.setAttribute('y', this.lassoStart.y);
    this.lassoRect.setAttribute('width', '0');
    this.lassoRect.setAttribute('height', '0');
    this.lassoRect.setAttribute('fill', 'rgba(0, 122, 204, 0.1)');
    this.lassoRect.setAttribute('stroke', '#007acc');
    this.lassoRect.setAttribute('stroke-width', '1');
    this.lassoRect.setAttribute('stroke-dasharray', '3,3');
    
    this.svg.appendChild(this.lassoRect);
    this.svg.style.cursor = 'crosshair';
  }

  updateLassoSelection(e) {
    if (!this.isLassoSelecting || !this.lassoRect) return;
    
    // Convert mouse position to SVG coordinates using proper transformation
    const rect = this.svg.getBoundingClientRect();
    const currentViewWidth = this.viewBox.width / this.scale;
    const currentViewHeight = this.viewBox.height / this.scale;
    
    const svgX = this.viewBox.x + ((e.clientX - rect.left) / rect.width) * currentViewWidth;
    const svgY = this.viewBox.y + ((e.clientY - rect.top) / rect.height) * currentViewHeight;
    
    // Calculate rectangle bounds
    const x = Math.min(this.lassoStart.x, svgX);
    const y = Math.min(this.lassoStart.y, svgY);
    const width = Math.abs(svgX - this.lassoStart.x);
    const height = Math.abs(svgY - this.lassoStart.y);
    
    // Update selection rectangle
    this.lassoRect.setAttribute('x', x);
    this.lassoRect.setAttribute('y', y);
    this.lassoRect.setAttribute('width', width);
    this.lassoRect.setAttribute('height', height);
  }

  completeLassoSelection() {
    if (!this.isLassoSelecting || !this.lassoRect) return;
    
    // Get selection bounds
    const x = parseFloat(this.lassoRect.getAttribute('x'));
    const y = parseFloat(this.lassoRect.getAttribute('y'));
    const width = parseFloat(this.lassoRect.getAttribute('width'));
    const height = parseFloat(this.lassoRect.getAttribute('height'));
    
    // Find blocks within selection area
    const selectedBlocks = this.diagram.blocks.filter(block => {
      const blockRight = block.x + block.width;
      const blockBottom = block.y + block.height;
      const selectionRight = x + width;
      const selectionBottom = y + height;
      
      // Check if block overlaps with selection rectangle
      return !(block.x > selectionRight || 
               blockRight < x || 
               block.y > selectionBottom || 
               blockBottom < y);
    });
    
    // Update selection
    if (selectedBlocks.length > 0) {
      this.selectedBlocks.clear();
      selectedBlocks.forEach(block => this.selectedBlocks.add(block));
      this.selectedBlock = selectedBlocks[0]; // Set primary selection
      this.updateSelectionVisuals();
      this.updateContextButtons(this.selectedBlock);
    }
    
    // Clean up
    this.svg.removeChild(this.lassoRect);
    this.lassoRect = null;
    this.isLassoSelecting = false;
    this.potentialLasso = false;
    this.svg.style.cursor = 'grab';
  }
  
  onWheel(e) {
    e.preventDefault();
    
    // Fix zoom direction to match Fusion 360 (scroll up = zoom in)
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const oldScale = this.scale;
    
    // Get mouse position relative to SVG before scaling
    const rect = this.svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert mouse position to world coordinates before zoom
    const currentViewWidth = this.viewBox.width / oldScale;
    const currentViewHeight = this.viewBox.height / oldScale;
    const worldX = this.viewBox.x + (mouseX / rect.width) * currentViewWidth;
    const worldY = this.viewBox.y + (mouseY / rect.height) * currentViewHeight;
    
    // Apply zoom
    this.scale *= zoomFactor;
    
    // Constrain zoom
    this.scale = Math.max(0.1, Math.min(5, this.scale));
    
    // Calculate new view dimensions
    const newViewWidth = this.viewBox.width / this.scale;
    const newViewHeight = this.viewBox.height / this.scale;
    
    // Adjust viewBox to keep world coordinates under mouse
    this.viewBox.x = worldX - (mouseX / rect.width) * newViewWidth;
    this.viewBox.y = worldY - (mouseY / rect.height) * newViewHeight;
    
    this.updateViewBox();
  }
  
  updateViewBox() {
    // Simplified viewBox update for better performance
    this.svg.setAttribute('viewBox', 
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width / this.scale} ${this.viewBox.height / this.scale}`
    );
  }
  
  promptAddBlock() {
    debugLog("promptAddBlock called");
    this.showBlockCreationDialog();
  }
  
  showBlockCreationDialog() {
    // Create lightweight dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    // Create ultra-lightweight dialog
    const dialog = document.createElement('div');
    dialog.className = 'block-creation-dialog';
    dialog.style.cssText = `
      background: #2d2d30;
      border: 1px solid #464646;
      border-radius: 4px;
      padding: 20px;
      width: 320px;
    `;
    
    // Ultra-simplified dialog content with minimal styling
    dialog.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #f0f0f0;">Create New Block</h3>
      
      <div style="margin-bottom: 12px;">
        <label style="color: #f0f0f0;">Name:</label><br>
        <input type="text" id="block-name-input" value="New Block" 
               style="width: 100%; padding: 6px; margin-top: 4px; border: 1px solid #555; 
                      background: #383838; color: #f0f0f0; box-sizing: border-box;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="color: #f0f0f0;">Shape:</label><br>
        <select id="shape-select" style="width: 100%; padding: 6px; margin-top: 4px; border: 1px solid #555; 
                background: #383838; color: #f0f0f0;">
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="diamond">Diamond</option>
          <option value="hexagon">Hexagon</option>
          <option value="parallelogram">Parallelogram</option>
          <option value="oval">Oval</option>
          <option value="trapezoid">Trapezoid</option>
          <option value="cylinder">Cylinder</option>
          <option value="cloud">Cloud</option>
          <option value="star">Star</option>
        </select>
      </div>
      
      <div style="text-align: right;">
        <button id="cancel-block-btn" style="padding: 6px 12px; margin-right: 8px; border: 1px solid #555; 
                background: #383838; color: #f0f0f0; cursor: pointer;">
          Cancel
        </button>
        <button id="create-block-btn" style="padding: 6px 12px; border: none; 
                background: #007acc; color: white; cursor: pointer;">
          Create
        </button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Set up lightweight event listeners
    const nameInput = document.getElementById('block-name-input');
    const shapeSelect = document.getElementById('shape-select');
    const cancelBtn = document.getElementById('cancel-block-btn');
    const createBtn = document.getElementById('create-block-btn');
    
    nameInput.focus();
    nameInput.select();
    
    const closeDialog = () => {
      document.body.removeChild(overlay);
    };
    
    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });
    
    createBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (name) {
        // Calculate position with offset to avoid overlap
        const blockCount = this.diagram.blocks.length;
        const offsetX = 100 + (blockCount * 30);
        const offsetY = 100 + (blockCount * 30);
        
        this.addBlockWithShape(name, offsetX, offsetY, "Custom", shapeSelect.value);
        closeDialog();
      }
    });
    
    // Handle Enter key
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        createBtn.click();
      } else if (e.key === 'Escape') {
        closeDialog();
      }
    });
  }
  
  // Removed populateShapeSelector - using lightweight dropdown instead
  
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

  // ========== MILESTONE 14: ADVANCED DIAGRAM FEATURES ==========
  
  // Initialize all advanced diagram features
  initializeAdvancedFeatures() {
    debugLog("Initializing advanced diagram features...");
    
    // Initialize multi-selection system
    this.initializeMultiSelection();
    
    // Initialize layout and alignment tools
    this.initializeLayoutTools();
    
    // Initialize annotation system
    this.initializeAnnotationSystem();
    
    // Initialize group management
    this.initializeGroupSystem();
    
    // Initialize layer management
    this.initializeLayerSystem();
    
    // Setup advanced event listeners
    this.setupAdvancedEventListeners();
    
    debugLog("Advanced diagram features initialized!");
  }

  // === MULTI-SELECTION SYSTEM ===
  initializeMultiSelection() {
    this.selectedBlocks = new Set();
    this.isMultiSelectMode = false;
    this.selectionBox = null;
    this.isDrawingSelectionBox = false;
    this.selectionStart = { x: 0, y: 0 };
  }

  toggleMultiSelect(block, ctrlKey = false) {
    if (!ctrlKey) {
      // Single selection - clear all others
      this.clearSelection();
      this.selectedBlocks.add(block);
    } else {
      // Multi-selection - toggle this block
      if (this.selectedBlocks.has(block)) {
        this.selectedBlocks.delete(block);
      } else {
        this.selectedBlocks.add(block);
      }
    }
    this.updateSelectionVisuals();
    this.updateToolbarButtonStates();
  }

  clearSelection() {
    this.selectedBlocks.clear();
    this.updateSelectionVisuals();
    this.updateToolbarButtonStates();
  }

  selectAll() {
    this.selectedBlocks.clear();
    this.diagram.blocks.forEach(block => {
      this.selectedBlocks.add(block);
    });
    this.updateSelectionVisuals();
    this.updateToolbarButtonStates();
  }

  updateSelectionVisuals() {
    // Remove existing selection indicators
    document.querySelectorAll('.block-selected').forEach(el => {
      el.classList.remove('block-selected');
    });

    // Add selection indicators to selected blocks
    this.selectedBlocks.forEach(block => {
      const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
      if (blockElement) {
        blockElement.classList.add('block-selected');
      }
    });
  }

  // === LAYOUT AND ALIGNMENT TOOLS ===
  initializeLayoutTools() {
    this.layoutEngine = new LayoutEngine();
  }

  autoLayout() {
    if (this.diagram.blocks.length === 0) return;
    
    const layoutedBlocks = this.layoutEngine.hierarchicalLayout(this.diagram.blocks, this.diagram.connections);
    
    // Save state for undo
    this.saveState();
    
    // Update block positions
    layoutedBlocks.forEach(layoutBlock => {
      const block = this.diagram.blocks.find(b => b.id === layoutBlock.id);
      if (block) {
        block.x = layoutBlock.x;
        block.y = layoutBlock.y;
      }
    });
    
    this.renderDiagram();
    debugLog("Auto-layout applied successfully");
  }

  alignBlocks(alignType) {
    const selectedArray = Array.from(this.selectedBlocks);
    if (selectedArray.length < 2) {
      this.showNotification("Please select at least 2 blocks to align", "warning");
      return;
    }

    this.saveState();

    switch (alignType) {
      case 'left':
        const leftX = Math.min(...selectedArray.map(b => b.x));
        selectedArray.forEach(block => block.x = leftX);
        break;
      case 'center':
        const centerX = selectedArray.reduce((sum, b) => sum + b.x + b.width/2, 0) / selectedArray.length;
        selectedArray.forEach(block => block.x = centerX - block.width/2);
        break;
      case 'right':
        const rightX = Math.max(...selectedArray.map(b => b.x + b.width));
        selectedArray.forEach(block => block.x = rightX - block.width);
        break;
    }

    this.renderDiagram();
    this.showNotification(`Aligned ${selectedArray.length} blocks to ${alignType}`, "success");
  }

  distributeBlocks(direction) {
    const selectedArray = Array.from(this.selectedBlocks);
    if (selectedArray.length < 3) {
      this.showNotification("Please select at least 3 blocks to distribute", "warning");
      return;
    }

    this.saveState();

    if (direction === 'horizontal') {
      selectedArray.sort((a, b) => a.x - b.x);
      const totalWidth = selectedArray[selectedArray.length - 1].x - selectedArray[0].x;
      const spacing = totalWidth / (selectedArray.length - 1);
      
      selectedArray.forEach((block, index) => {
        if (index > 0 && index < selectedArray.length - 1) {
          block.x = selectedArray[0].x + spacing * index;
        }
      });
    } else if (direction === 'vertical') {
      selectedArray.sort((a, b) => a.y - b.y);
      const totalHeight = selectedArray[selectedArray.length - 1].y - selectedArray[0].y;
      const spacing = totalHeight / (selectedArray.length - 1);
      
      selectedArray.forEach((block, index) => {
        if (index > 0 && index < selectedArray.length - 1) {
          block.y = selectedArray[0].y + spacing * index;
        }
      });
    }

    this.renderDiagram();
    this.showNotification(`Distributed ${selectedArray.length} blocks ${direction}ly`, "success");
  }

  // === ANNOTATION SYSTEM ===
  initializeAnnotationSystem() {
    this.annotations = [];
    this.annotationCounter = 1;
  }

  addTextAnnotation(x, y, text = "Text Label") {
    const annotation = {
      id: `annotation-${this.annotationCounter++}`,
      type: 'text',
      x: x || 100,
      y: y || 100,
      text: text,
      fontSize: 14,
      color: '#ffffff',
      backgroundColor: 'transparent',
      borderColor: 'transparent'
    };

    this.annotations.push(annotation);
    this.renderAnnotation(annotation);
    this.saveState();
    
    return annotation;
  }

  addStickyNote(x, y, text = "Note") {
    const annotation = {
      id: `annotation-${this.annotationCounter++}`,
      type: 'note',
      x: x || 150,
      y: y || 150,
      text: text,
      width: 120,
      height: 80,
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#ffeb3b',
      borderColor: '#fbc02d'
    };

    this.annotations.push(annotation);
    this.renderAnnotation(annotation);
    this.saveState();
    
    return annotation;
  }

  addDimensionLine(x1, y1, x2, y2, label = "100mm") {
    const annotation = {
      id: `annotation-${this.annotationCounter++}`,
      type: 'dimension',
      x1: x1 || 100,
      y1: y1 || 100,
      x2: x2 || 200,
      y2: y2 || 100,
      label: label,
      fontSize: 12,
      color: '#00ff00',
      offset: 20
    };

    this.annotations.push(annotation);
    this.renderAnnotation(annotation);
    this.saveState();
    
    return annotation;
  }

  addCallout(x, y, targetX, targetY, text = "Callout") {
    const annotation = {
      id: `annotation-${this.annotationCounter++}`,
      type: 'callout',
      x: x || 200,
      y: y || 200,
      targetX: targetX || 100,
      targetY: targetY || 100,
      text: text,
      width: 100,
      height: 60,
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#ffffff',
      borderColor: '#cccccc'
    };

    this.annotations.push(annotation);
    this.renderAnnotation(annotation);
    this.saveState();
    
    return annotation;
  }

  renderAnnotation(annotation) {
    const svg = document.getElementById('svg-canvas');
    const annotationsLayer = svg.querySelector('#annotations-layer') || this.createAnnotationsLayer();

    let element;
    
    switch (annotation.type) {
      case 'text':
        element = this.createTextElement(annotation);
        break;
      case 'note':
        element = this.createNoteElement(annotation);
        break;
      case 'dimension':
        element = this.createDimensionElement(annotation);
        break;
      case 'callout':
        element = this.createCalloutElement(annotation);
        break;
    }

    if (element) {
      element.setAttribute('data-annotation-id', annotation.id);
      annotationsLayer.appendChild(element);
    }
  }

  createAnnotationsLayer() {
    const svg = document.getElementById('svg-canvas');
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.id = 'annotations-layer';
    layer.style.pointerEvents = 'none'; // Don't interfere with block interactions
    svg.appendChild(layer);
    return layer;
  }

  createTextElement(annotation) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', annotation.x);
    text.setAttribute('y', annotation.y);
    text.setAttribute('fill', annotation.color);
    text.setAttribute('font-size', annotation.fontSize);
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.textContent = annotation.text;
    return text;
  }

  createNoteElement(annotation) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Note background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', annotation.x);
    rect.setAttribute('y', annotation.y);
    rect.setAttribute('width', annotation.width);
    rect.setAttribute('height', annotation.height);
    rect.setAttribute('fill', annotation.backgroundColor);
    rect.setAttribute('stroke', annotation.borderColor);
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('rx', '4');
    
    // Note text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', annotation.x + 8);
    text.setAttribute('y', annotation.y + 20);
    text.setAttribute('fill', annotation.color);
    text.setAttribute('font-size', annotation.fontSize);
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.textContent = annotation.text;
    
    group.appendChild(rect);
    group.appendChild(text);
    return group;
  }

  createDimensionElement(annotation) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Dimension line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', annotation.x1);
    line.setAttribute('y1', annotation.y1 - annotation.offset);
    line.setAttribute('x2', annotation.x2);
    line.setAttribute('y2', annotation.y2 - annotation.offset);
    line.setAttribute('stroke', annotation.color);
    line.setAttribute('stroke-width', '1');
    
    // Extension lines
    const ext1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ext1.setAttribute('x1', annotation.x1);
    ext1.setAttribute('y1', annotation.y1);
    ext1.setAttribute('x2', annotation.x1);
    ext1.setAttribute('y2', annotation.y1 - annotation.offset - 5);
    ext1.setAttribute('stroke', annotation.color);
    ext1.setAttribute('stroke-width', '1');
    
    const ext2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ext2.setAttribute('x1', annotation.x2);
    ext2.setAttribute('y1', annotation.y2);
    ext2.setAttribute('x2', annotation.x2);
    ext2.setAttribute('y2', annotation.y2 - annotation.offset - 5);
    ext2.setAttribute('stroke', annotation.color);
    ext2.setAttribute('stroke-width', '1');
    
    // Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const midX = (annotation.x1 + annotation.x2) / 2;
    const midY = annotation.y1 - annotation.offset - 8;
    text.setAttribute('x', midX);
    text.setAttribute('y', midY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', annotation.color);
    text.setAttribute('font-size', annotation.fontSize);
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.textContent = annotation.label;
    
    group.appendChild(line);
    group.appendChild(ext1);
    group.appendChild(ext2);
    group.appendChild(text);
    return group;
  }

  createCalloutElement(annotation) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Leader line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', annotation.targetX);
    line.setAttribute('y1', annotation.targetY);
    line.setAttribute('x2', annotation.x);
    line.setAttribute('y2', annotation.y + annotation.height / 2);
    line.setAttribute('stroke', annotation.borderColor);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    
    // Callout box
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', annotation.x);
    rect.setAttribute('y', annotation.y);
    rect.setAttribute('width', annotation.width);
    rect.setAttribute('height', annotation.height);
    rect.setAttribute('fill', annotation.backgroundColor);
    rect.setAttribute('stroke', annotation.borderColor);
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('rx', '4');
    
    // Callout text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', annotation.x + 8);
    text.setAttribute('y', annotation.y + 20);
    text.setAttribute('fill', annotation.color);
    text.setAttribute('font-size', annotation.fontSize);
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.textContent = annotation.text;
    
    group.appendChild(line);
    group.appendChild(rect);
    group.appendChild(text);
    return group;
  }

  // === GROUP MANAGEMENT SYSTEM ===
  initializeGroupSystem() {
    this.groups = new Map();
    this.groupCounter = 1;
  }

  createGroup() {
    const selectedArray = Array.from(this.selectedBlocks);
    if (selectedArray.length < 2) {
      this.showNotification("Please select at least 2 blocks to create a group", "warning");
      return;
    }

    const groupId = `group-${this.groupCounter++}`;
    const group = {
      id: groupId,
      name: `Group ${this.groupCounter - 1}`,
      blocks: selectedArray.map(b => b.id),
      locked: false,
      visible: true
    };

    this.groups.set(groupId, group);
    
    // Mark blocks as grouped
    selectedArray.forEach(block => {
      block.groupId = groupId;
    });

    this.updateGroupVisuals(group);
    this.saveState();
    this.showNotification(`Created group with ${selectedArray.length} blocks`, "success");
  }

  ungroupSelected() {
    const groupIds = new Set();
    this.selectedBlocks.forEach(block => {
      if (block.groupId) {
        groupIds.add(block.groupId);
      }
    });

    if (groupIds.size === 0) {
      this.showNotification("No groups selected to ungroup", "warning");
      return;
    }

    groupIds.forEach(groupId => {
      const group = this.groups.get(groupId);
      if (group) {
        // Remove group marking from blocks
        group.blocks.forEach(blockId => {
          const block = this.diagram.blocks.find(b => b.id === blockId);
          if (block) {
            delete block.groupId;
          }
        });
        
        // Remove group
        this.groups.delete(groupId);
        this.removeGroupVisuals(groupId);
      }
    });

    this.saveState();
    this.showNotification(`Ungrouped ${groupIds.size} group(s)`, "success");
  }

  updateGroupVisuals(group) {
    // Add visual indicators for grouped blocks
    const groupBlocks = group.blocks.map(id => this.diagram.blocks.find(b => b.id === id)).filter(b => b);
    
    // Calculate group bounds
    const bounds = this.calculateGroupBounds(groupBlocks);
    
    // Create group visual indicator
    this.createGroupIndicator(group.id, bounds);
  }

  calculateGroupBounds(blocks) {
    const minX = Math.min(...blocks.map(b => b.x));
    const minY = Math.min(...blocks.map(b => b.y));
    const maxX = Math.max(...blocks.map(b => b.x + b.width));
    const maxY = Math.max(...blocks.map(b => b.y + b.height));
    
    return {
      x: minX - 10,
      y: minY - 10,
      width: maxX - minX + 20,
      height: maxY - minY + 20
    };
  }

  createGroupIndicator(groupId, bounds) {
    const svg = document.getElementById('svg-canvas');
    const groupsLayer = svg.querySelector('#groups-layer') || this.createGroupsLayer();
    
    // Remove existing indicator
    const existing = groupsLayer.querySelector(`[data-group-id="${groupId}"]`);
    if (existing) existing.remove();
    
    // Create group boundary rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('data-group-id', groupId);
    rect.setAttribute('x', bounds.x);
    rect.setAttribute('y', bounds.y);
    rect.setAttribute('width', bounds.width);
    rect.setAttribute('height', bounds.height);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', '#ffeb3b');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('stroke-dasharray', '5,5');
    rect.setAttribute('opacity', '0.7');
    rect.setAttribute('pointer-events', 'none');
    
    groupsLayer.appendChild(rect);
  }

  createGroupsLayer() {
    const svg = document.getElementById('svg-canvas');
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.id = 'groups-layer';
    layer.style.pointerEvents = 'none';
    svg.insertBefore(layer, svg.querySelector('#blocks-layer'));
    return layer;
  }

  removeGroupVisuals(groupId) {
    const groupsLayer = document.getElementById('groups-layer');
    if (groupsLayer) {
      const indicator = groupsLayer.querySelector(`[data-group-id="${groupId}"]`);
      if (indicator) indicator.remove();
    }
  }

  // === LAYER MANAGEMENT SYSTEM ===
  initializeLayerSystem() {
    this.layers = new Map();
    this.currentLayer = 'default';
    
    // Create default layer
    this.layers.set('default', {
      id: 'default',
      name: 'Default',
      visible: true,
      locked: false,
      color: '#ffffff'
    });
  }

  // === ADVANCED EVENT LISTENERS ===
  setupAdvancedEventListeners() {
    // Layout and alignment buttons
    document.getElementById('btn-auto-layout')?.addEventListener('click', () => this.autoLayout());
    document.getElementById('btn-align-left')?.addEventListener('click', () => this.alignBlocks('left'));
    document.getElementById('btn-align-center')?.addEventListener('click', () => this.alignBlocks('center'));
    document.getElementById('btn-align-right')?.addEventListener('click', () => this.alignBlocks('right'));
    document.getElementById('btn-distribute-h')?.addEventListener('click', () => this.distributeBlocks('horizontal'));
    document.getElementById('btn-distribute-v')?.addEventListener('click', () => this.distributeBlocks('vertical'));

    // Selection buttons
    document.getElementById('btn-select-all')?.addEventListener('click', () => this.selectAll());
    document.getElementById('btn-select-none')?.addEventListener('click', () => this.clearSelection());
    document.getElementById('btn-group-create')?.addEventListener('click', () => this.createGroup());
    document.getElementById('btn-group-ungroup')?.addEventListener('click', () => this.ungroupSelected());

    // Annotation buttons
    document.getElementById('btn-add-text')?.addEventListener('click', () => this.addTextAnnotation());
    document.getElementById('btn-add-note')?.addEventListener('click', () => this.addStickyNote());
    document.getElementById('btn-add-dimension')?.addEventListener('click', () => this.addDimensionLine());
    document.getElementById('btn-add-callout')?.addEventListener('click', () => this.addCallout());

    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        this.selectAll();
      } else if (e.key === 'Escape') {
        this.clearSelection();
      } else if (e.key === 'Delete' && this.selectedBlocks.size > 0) {
        this.deleteSelectedBlocks();
      }
    });
  }

  updateToolbarButtonStates() {
    const selectedCount = this.selectedBlocks.size;
    
    // Alignment buttons - need at least 2 blocks
    const alignButtons = ['btn-align-left', 'btn-align-center', 'btn-align-right'];
    alignButtons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) btn.disabled = selectedCount < 2;
    });
    
    // Distribution buttons - need at least 3 blocks
    const distributeButtons = ['btn-distribute-h', 'btn-distribute-v'];
    distributeButtons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) btn.disabled = selectedCount < 3;
    });
    
    // Group buttons
    const groupBtn = document.getElementById('btn-group-create');
    if (groupBtn) groupBtn.disabled = selectedCount < 2;
    
    const ungroupBtn = document.getElementById('btn-group-ungroup');
    if (ungroupBtn) {
      const hasGroupedBlocks = Array.from(this.selectedBlocks).some(block => block.groupId);
      ungroupBtn.disabled = !hasGroupedBlocks;
    }
  }

  deleteSelectedBlocks() {
    if (this.selectedBlocks.size === 0) return;
    
    this.saveState();
    
    const selectedIds = Array.from(this.selectedBlocks).map(block => block.id);
    
    // Remove blocks from diagram
    this.diagram.blocks = this.diagram.blocks.filter(block => !selectedIds.includes(block.id));
    
    // Remove connections involving deleted blocks
    this.diagram.connections = this.diagram.connections.filter(conn => 
      !selectedIds.includes(conn.from) && !selectedIds.includes(conn.to)
    );
    
    // Clear selection
    this.clearSelection();
    
    // Re-render
    this.renderDiagram();
    
    this.showNotification(`Deleted ${selectedIds.length} block(s)`, "success");
  }

  // Enhanced notification system
  showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '80px',
      right: '20px',
      background: type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: '10000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      maxWidth: '300px',
      wordWrap: 'break-word'
    });
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// === LAYOUT ENGINE ===
class LayoutEngine {
  hierarchicalLayout(blocks, connections) {
    // Simple hierarchical layout algorithm
    const positioned = new Set();
    const result = [];
    
    // Find root nodes (no incoming connections)
    const incomingCounts = new Map();
    blocks.forEach(block => incomingCounts.set(block.id, 0));
    connections.forEach(conn => {
      incomingCounts.set(conn.to, (incomingCounts.get(conn.to) || 0) + 1);
    });
    
    const roots = blocks.filter(block => incomingCounts.get(block.id) === 0);
    
    let currentX = 50;
    let currentY = 50;
    const levelHeight = 150;
    const blockSpacing = 200;
    
    // Layout root nodes
    roots.forEach((block, index) => {
      result.push({
        id: block.id,
        x: currentX + index * blockSpacing,
        y: currentY
      });
      positioned.add(block.id);
    });
    
    // Layout remaining blocks level by level
    let level = 1;
    while (positioned.size < blocks.length && level < 20) { // Prevent infinite loops
      const levelBlocks = [];
      
      blocks.forEach(block => {
        if (positioned.has(block.id)) return;
        
        // Check if all dependencies are positioned
        const dependencies = connections
          .filter(conn => conn.to === block.id)
          .map(conn => conn.from);
        
        if (dependencies.every(dep => positioned.has(dep))) {
          levelBlocks.push(block);
        }
      });
      
      if (levelBlocks.length === 0) break; // No more blocks can be positioned
      
      // Position blocks in this level
      levelBlocks.forEach((block, index) => {
        result.push({
          id: block.id,
          x: currentX + index * blockSpacing,
          y: currentY + level * levelHeight
        });
        positioned.add(block.id);
      });
      
      level++;
    }
    
    // Position any remaining blocks (in case of cycles)
    blocks.forEach(block => {
      if (!positioned.has(block.id)) {
        result.push({
          id: block.id,
          x: block.x || (50 + Math.random() * 500),
          y: block.y || (50 + Math.random() * 500)
        });
      }
    });
    
    return result;
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
    window.editor = editor; // Make editor globally accessible
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

// ============================================================================
// MILESTONE 12: ENHANCED CAD LINKING SYSTEM - JAVASCRIPT INTEGRATION
// Revolutionary living integration between block diagrams and Fusion 360
// ============================================================================

// Enhanced CAD Linking Methods
SystemBlocksEditor.prototype.initializeEnhancedCADLinking = function() {
  debugLog("Initializing Enhanced CAD Linking System...");
  
  // Initialize component status tracking
  this.componentStatusCache = new Map();
  this.componentSyncInProgress = false;
  
  // Add CAD sync controls to toolbar
  this.addCADSyncControls();
  
  // Start periodic component status checking (every 30 seconds)
  this.startComponentStatusMonitoring();
  
  debugLog("Enhanced CAD Linking System initialized!");
};

SystemBlocksEditor.prototype.addCADSyncControls = function() {
  // Find toolbar or create CAD section
  const toolbar = document.querySelector('.toolbar') || document.querySelector('.fusion-toolbar');
  if (!toolbar) return;
  
  // Create CAD sync section
  const cadSection = document.createElement('div');
  cadSection.className = 'cad-sync-section';
  cadSection.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0 12px;
    border-left: 1px solid var(--fusion-border);
    margin-left: 12px;
  `;
  
  // Sync All Components button
  const syncAllBtn = document.createElement('button');
  syncAllBtn.className = 'fusion-btn fusion-btn-secondary';
  syncAllBtn.innerHTML = `
    <span class="icon-refresh"></span>
    <span>Sync All</span>
  `;
  syncAllBtn.title = 'Synchronize all CAD components';
  syncAllBtn.addEventListener('click', () => this.syncAllComponents());
  
  // Component Health Dashboard button
  const dashboardBtn = document.createElement('button');
  dashboardBtn.className = 'fusion-btn fusion-btn-secondary';
  dashboardBtn.innerHTML = `
    <span class="icon-chart"></span>
    <span>Dashboard</span>
  `;
  dashboardBtn.title = 'Show component health dashboard';
  dashboardBtn.addEventListener('click', () => this.showComponentDashboard());
  
  // Component status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'component-status-indicator';
  statusIndicator.className = 'component-status-indicator';
  statusIndicator.style.cssText = `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--fusion-text-secondary);
    position: relative;
    cursor: pointer;
  `;
  statusIndicator.title = 'Overall component health status';
  statusIndicator.addEventListener('click', () => this.showComponentDashboard());
  
  cadSection.appendChild(syncAllBtn);
  cadSection.appendChild(dashboardBtn);
  cadSection.appendChild(statusIndicator);
  toolbar.appendChild(cadSection);
};

SystemBlocksEditor.prototype.syncAllComponents = function() {
  if (this.componentSyncInProgress) {
    this.showNotification('Component sync already in progress', 'warning');
    return;
  }
  
  debugLog("Starting component sync for all blocks...");
  this.componentSyncInProgress = true;
  this.updateSyncButtonState(true);
  
  // Send sync request to Python
  const message = {
    action: 'sync-all-components',
    diagram: this.diagram
  };
  
  if (window.adsk && window.adsk.fusion && window.adsk.fusion.palettes) {
    window.adsk.fusion.palettes.sendMessage('palette-message', JSON.stringify(message));
  } else {
    // Development mode - simulate sync
    setTimeout(() => {
      this.handleComponentSyncResponse({
        success: true,
        results: {
          total_blocks: this.diagram.blocks.length,
          blocks_with_cad: this.diagram.blocks.filter(b => 
            b.links && b.links.some(l => l.target === 'cad')).length,
          total_components: this.diagram.blocks.reduce((sum, b) => 
            sum + (b.links ? b.links.filter(l => l.target === 'cad').length : 0), 0),
          sync_successful: 5,
          sync_failed: 0,
          errors: []
        }
      });
    }, 2000);
  }
};

SystemBlocksEditor.prototype.handleComponentSyncResponse = function(response) {
  this.componentSyncInProgress = false;
  this.updateSyncButtonState(false);
  
  if (response.success) {
    const results = response.results;
    this.showNotification(
      `Sync complete: ${results.sync_successful}/${results.total_components} components synchronized`,
      'success'
    );
    
    // Update component status cache
    this.updateComponentStatusCache(response.componentStatuses || {});
    
    // Refresh diagram to show updated status
    this.renderDiagram();
    
    // Update status indicator
    this.updateComponentStatusIndicator();
    
  } else {
    this.showNotification(`Component sync failed: ${response.error}`, 'error');
  }
  
  debugLog("Component sync response handled");
};

SystemBlocksEditor.prototype.updateSyncButtonState = function(syncing) {
  const syncBtn = document.querySelector('.cad-sync-section button');
  if (syncBtn) {
    if (syncing) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = `
        <span class="icon-loading spinning"></span>
        <span>Syncing...</span>
      `;
    } else {
      syncBtn.disabled = false;
      syncBtn.innerHTML = `
        <span class="icon-refresh"></span>
        <span>Sync All</span>
      `;
    }
  }
};

SystemBlocksEditor.prototype.updateComponentStatusCache = function(statuses) {
  // Update our local cache with latest component statuses
  Object.entries(statuses).forEach(([blockId, status]) => {
    this.componentStatusCache.set(blockId, status);
  });
};

SystemBlocksEditor.prototype.updateComponentStatusIndicator = function() {
  const indicator = document.getElementById('component-status-indicator');
  if (!indicator) return;
  
  // Calculate overall health from all blocks
  let totalComponents = 0;
  let healthyComponents = 0;
  let warningComponents = 0;
  let criticalComponents = 0;
  
  this.diagram.blocks.forEach(block => {
    const cadLinks = (block.links || []).filter(link => link.target === 'cad');
    totalComponents += cadLinks.length;
    
    cadLinks.forEach(link => {
      const syncStatus = link.syncStatus?.status || 'unknown';
      if (syncStatus === 'synchronized') {
        healthyComponents++;
      } else if (syncStatus === 'modified' || syncStatus === 'unknown') {
        warningComponents++;
      } else {
        criticalComponents++;
      }
    });
  });
  
  let statusColor = 'var(--fusion-text-secondary)';
  let statusTitle = 'No CAD components';
  
  if (totalComponents > 0) {
    if (criticalComponents > totalComponents * 0.3) {
      statusColor = '#ff4444';
      statusTitle = `Critical: ${criticalComponents}/${totalComponents} components need attention`;
    } else if (warningComponents > 0 || criticalComponents > 0) {
      statusColor = '#ffaa00';
      statusTitle = `Warning: ${warningComponents + criticalComponents}/${totalComponents} components need sync`;
    } else {
      statusColor = '#00cc66';
      statusTitle = `Healthy: All ${totalComponents} components synchronized`;
    }
  }
  
  indicator.style.background = statusColor;
  indicator.title = statusTitle;
  
  // Add pulse animation for critical status
  if (criticalComponents > totalComponents * 0.3) {
    indicator.style.animation = 'pulse 2s infinite';
  } else {
    indicator.style.animation = 'none';
  }
};

SystemBlocksEditor.prototype.showComponentDashboard = function() {
  debugLog("Showing component health dashboard...");
  
  // Create dashboard overlay
  const overlay = document.createElement('div');
  overlay.className = 'dashboard-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(3px);
  `;
  
  // Create dashboard dialog
  const dashboard = document.createElement('div');
  dashboard.className = 'component-dashboard';
  dashboard.style.cssText = `
    background: var(--fusion-bg-primary);
    border: 1px solid var(--fusion-border);
    border-radius: 12px;
    padding: 24px;
    min-width: 600px;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  `;
  
  // Generate dashboard content
  const dashboardData = this.generateDashboardData();
  dashboard.innerHTML = this.createDashboardHTML(dashboardData);
  
  overlay.appendChild(dashboard);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
  
  // Add close button handler
  const closeBtn = dashboard.querySelector('.close-dashboard');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }
};

SystemBlocksEditor.prototype.generateDashboardData = function() {
  // Generate dashboard data from current diagram
  const data = {
    overview: {
      total_blocks: this.diagram.blocks.length,
      blocks_with_cad: 0,
      total_components: 0,
      overall_health: 'unknown'
    },
    status_summary: {
      synchronized: 0,
      modified: 0,
      missing: 0,
      error: 0,
      unknown: 0
    },
    completion_stats: {
      average_completion: 0.0,
      blocks_by_completion: {
        '0-25%': 0,
        '26-50%': 0,
        '51-75%': 0,
        '76-100%': 0
      }
    },
    block_details: [],
    issues: [],
    recommendations: []
  };
  
  let totalCompletion = 0;
  
  this.diagram.blocks.forEach(block => {
    const cadLinks = (block.links || []).filter(link => link.target === 'cad');
    
    if (cadLinks.length > 0) {
      data.overview.blocks_with_cad++;
      data.overview.total_components += cadLinks.length;
      
      // Calculate completion for this block
      let blockCompletion = 0;
      cadLinks.forEach(link => {
        const syncStatus = link.syncStatus?.status || 'unknown';
        data.status_summary[syncStatus]++;
        
        // Simple completion calculation
        if (syncStatus === 'synchronized') blockCompletion += 100;
        else if (syncStatus === 'modified') blockCompletion += 75;
        else if (syncStatus === 'unknown') blockCompletion += 25;
      });
      
      blockCompletion = cadLinks.length > 0 ? blockCompletion / cadLinks.length : 0;
      totalCompletion += blockCompletion;
      
      // Categorize by completion
      if (blockCompletion <= 25) data.completion_stats.blocks_by_completion['0-25%']++;
      else if (blockCompletion <= 50) data.completion_stats.blocks_by_completion['26-50%']++;
      else if (blockCompletion <= 75) data.completion_stats.blocks_by_completion['51-75%']++;
      else data.completion_stats.blocks_by_completion['76-100%']++;
      
      // Add block details
      data.block_details.push({
        name: block.name,
        component_count: cadLinks.length,
        completion: blockCompletion,
        status: this.getBlockOverallStatus(cadLinks)
      });
    }
  });
  
  // Calculate averages and overall health
  if (data.overview.blocks_with_cad > 0) {
    data.completion_stats.average_completion = totalCompletion / data.overview.blocks_with_cad;
    
    const totalComponents = data.overview.total_components;
    if (data.status_summary.missing > totalComponents * 0.3) {
      data.overview.overall_health = 'critical';
    } else if (data.status_summary.error > 0 || data.status_summary.missing > 0) {
      data.overview.overall_health = 'warning';
    } else if (data.status_summary.synchronized === totalComponents) {
      data.overview.overall_health = 'healthy';
    } else {
      data.overview.overall_health = 'needs_attention';
    }
  }
  
  return data;
};

SystemBlocksEditor.prototype.getBlockOverallStatus = function(cadLinks) {
  const statuses = cadLinks.map(link => link.syncStatus?.status || 'unknown');
  
  if (statuses.includes('missing') || statuses.includes('error')) return 'critical';
  if (statuses.includes('modified')) return 'warning';
  if (statuses.every(s => s === 'synchronized')) return 'healthy';
  return 'unknown';
};

SystemBlocksEditor.prototype.createDashboardHTML = function(data) {
  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return '#00cc66';
      case 'warning': return '#ffaa00';
      case 'critical': return '#ff4444';
      default: return 'var(--fusion-text-secondary)';
    }
  };
  
  return `
    <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: var(--fusion-text-primary); font-size: 24px;">
        🔧 Component Health Dashboard
      </h2>
      <button class="close-dashboard fusion-btn fusion-btn-secondary" style="padding: 8px 12px;">
        ✕ Close
      </button>
    </div>
    
    <div class="dashboard-overview" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="stat-card" style="background: var(--fusion-bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: var(--fusion-accent);">${data.overview.total_blocks}</div>
        <div style="color: var(--fusion-text-secondary); font-size: 14px;">Total Blocks</div>
      </div>
      <div class="stat-card" style="background: var(--fusion-bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: var(--fusion-accent);">${data.overview.blocks_with_cad}</div>
        <div style="color: var(--fusion-text-secondary); font-size: 14px;">With CAD Links</div>
      </div>
      <div class="stat-card" style="background: var(--fusion-bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: var(--fusion-accent);">${data.overview.total_components}</div>
        <div style="color: var(--fusion-text-secondary); font-size: 14px;">Components</div>
      </div>
      <div class="stat-card" style="background: var(--fusion-bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: ${getHealthColor(data.overview.overall_health)};">
          ${data.completion_stats.average_completion.toFixed(0)}%
        </div>
        <div style="color: var(--fusion-text-secondary); font-size: 14px;">Avg Completion</div>
      </div>
    </div>
    
    <div class="dashboard-charts" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <div class="status-chart" style="background: var(--fusion-bg-secondary); padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 16px 0; color: var(--fusion-text-primary);">Component Status</h3>
        <div class="status-bars">
          ${Object.entries(data.status_summary).map(([status, count]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
              <span style="color: var(--fusion-text-primary); text-transform: capitalize;">${status}</span>
              <div style="flex: 1; margin: 0 12px; height: 8px; background: var(--fusion-bg-primary); border-radius: 4px; overflow: hidden;">
                <div style="width: ${data.overview.total_components > 0 ? (count / data.overview.total_components) * 100 : 0}%; height: 100%; background: ${getHealthColor(status === 'synchronized' ? 'healthy' : status === 'modified' ? 'warning' : 'critical')}; transition: width 0.3s ease;"></div>
              </div>
              <span style="color: var(--fusion-text-secondary); font-weight: bold; min-width: 30px; text-align: right;">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="completion-chart" style="background: var(--fusion-bg-secondary); padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 16px 0; color: var(--fusion-text-primary);">Completion Distribution</h3>
        <div class="completion-bars">
          ${Object.entries(data.completion_stats.blocks_by_completion).map(([range, count]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
              <span style="color: var(--fusion-text-primary);">${range}</span>
              <div style="flex: 1; margin: 0 12px; height: 8px; background: var(--fusion-bg-primary); border-radius: 4px; overflow: hidden;">
                <div style="width: ${data.overview.blocks_with_cad > 0 ? (count / data.overview.blocks_with_cad) * 100 : 0}%; height: 100%; background: var(--fusion-accent); transition: width 0.3s ease;"></div>
              </div>
              <span style="color: var(--fusion-text-secondary); font-weight: bold; min-width: 30px; text-align: right;">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    ${data.block_details.length > 0 ? `
    <div class="block-details" style="background: var(--fusion-bg-secondary); padding: 20px; border-radius: 8px;">
      <h3 style="margin: 0 0 16px 0; color: var(--fusion-text-primary);">Block Details</h3>
      <div class="block-list" style="max-height: 200px; overflow-y: auto;">
        ${data.block_details.map(block => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--fusion-border);">
            <div>
              <div style="color: var(--fusion-text-primary); font-weight: 500;">${block.name}</div>
              <div style="color: var(--fusion-text-secondary); font-size: 12px;">${block.component_count} component${block.component_count !== 1 ? 's' : ''}</div>
            </div>
            <div style="text-align: right;">
              <div style="color: ${getHealthColor(block.status)}; font-weight: bold;">${block.completion.toFixed(0)}%</div>
              <div style="color: var(--fusion-text-secondary); font-size: 12px; text-transform: capitalize;">${block.status}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;
};

SystemBlocksEditor.prototype.startComponentStatusMonitoring = function() {
  // Check component status every 30 seconds
  setInterval(() => {
    if (!this.componentSyncInProgress) {
      this.updateComponentStatusIndicator();
    }
  }, 30000);
};

// Enhanced block rendering with component status
SystemBlocksEditor.prototype.renderBlockWithComponentStatus = function(block) {
  // Get original block group
  const originalGroup = this.renderBlock(block);
  
  // Add component status indicators if block has CAD links
  const cadLinks = (block.links || []).filter(link => link.target === 'cad');
  
  if (cadLinks.length > 0) {
    // Add component count badge
    const badge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    badge.setAttribute('class', 'component-badge');
    
    const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    badgeBg.setAttribute('cx', block.width - 10);
    badgeBg.setAttribute('cy', 10);
    badgeBg.setAttribute('r', 8);
    badgeBg.setAttribute('fill', 'var(--fusion-accent)');
    badgeBg.setAttribute('stroke', 'var(--fusion-bg-primary)');
    badgeBg.setAttribute('stroke-width', '1');
    
    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', block.width - 10);
    badgeText.setAttribute('y', 10);
    badgeText.setAttribute('text-anchor', 'middle');
    badgeText.setAttribute('dominant-baseline', 'middle');
    badgeText.setAttribute('font-size', '10');
    badgeText.setAttribute('font-weight', 'bold');
    badgeText.setAttribute('fill', 'white');
    badgeText.textContent = cadLinks.length;
    
    badge.appendChild(badgeBg);
    badge.appendChild(badgeText);
    originalGroup.appendChild(badge);
    
    // Add status indicator
    const hasIssues = cadLinks.some(link => {
      const status = link.syncStatus?.status || 'unknown';
      return status === 'missing' || status === 'error';
    });
    
    if (hasIssues) {
      const warningIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      warningIcon.setAttribute('x', block.width - 30);
      warningIcon.setAttribute('y', 15);
      warningIcon.setAttribute('font-size', '12');
      warningIcon.setAttribute('fill', '#ff4444');
      warningIcon.textContent = '⚠️';
      originalGroup.appendChild(warningIcon);
    }
  }
  
  return originalGroup;
};

// Initialize Enhanced CAD Linking when editor is created
if (typeof SystemBlocksEditor !== 'undefined') {
  const originalConstructor = SystemBlocksEditor;
  const originalInitializeUI = SystemBlocksEditor.prototype.initializeUI;
  
  SystemBlocksEditor.prototype.initializeUI = function() {
    originalInitializeUI.call(this);
    this.initializeEnhancedCADLinking();
    this.initializeVisualIntegration(); // MILESTONE 13
  };
}

// ============================================================================
// MILESTONE 13: VISUAL INTEGRATION & LIVING DOCUMENTATION - JAVASCRIPT
// ============================================================================

// Extend SystemBlocksEditor with 3D visualization and living documentation
SystemBlocksEditor.prototype.initializeVisualIntegration = function() {
  debugLog("Initializing Visual Integration & Living Documentation...");
  
  // Initialize 3D visualization state
  this.visualization3D = {
    overlayMode: false,
    highlightedBlocks: new Set(),
    groupColors: new Map(),
    connectionRoutes: new Map(),
    liveThumbnailsEnabled: true,
    lastThumbnailUpdate: new Map()
  };
  
  // Initialize living documentation state
  this.livingDocumentation = {
    assemblySequence: [],
    currentBOM: null,
    changeTracking: new Map(),
    manufacturingProgress: new Map()
  };
  
  // Add 3D visualization controls to UI
  this.add3DVisualizationControls();
  
  // Add living documentation panel
  this.addLivingDocumentationPanel();
  
  debugLog("Visual Integration & Living Documentation initialized!");
};

// 3D Visualization Methods
SystemBlocksEditor.prototype.add3DVisualizationControls = function() {
  const controlsContainer = document.getElementById('controls-container') || 
                           document.createElement('div');
  
  if (!document.getElementById('controls-container')) {
    controlsContainer.id = 'controls-container';
    document.body.appendChild(controlsContainer);
  }
  
  const visualizationPanel = document.createElement('div');
  visualizationPanel.className = 'visualization-panel';
  visualizationPanel.innerHTML = `
    <div class="panel-header">
      <h3>🎨 3D Visualization</h3>
      <button onclick="window.systemBlocksEditor.toggleVisualizationPanel()" class="collapse-btn">−</button>
    </div>
    <div class="panel-content">
      <div class="control-group">
        <label>
          <input type="checkbox" id="overlay-mode" onchange="window.systemBlocksEditor.toggleOverlayMode(this.checked)">
          3D Overlay Mode
        </label>
      </div>
      
      <div class="control-group">
        <label>
          <input type="checkbox" id="live-thumbnails" checked onchange="window.systemBlocksEditor.toggleLiveThumbnails(this.checked)">
          Live 3D Thumbnails
        </label>
      </div>
      
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.highlightSelectedComponents()" class="action-btn">
          Highlight Components
        </button>
      </div>
      
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.showConnectionRoutes()" class="action-btn">
          Show Connection Routes
        </button>
      </div>
      
      <div class="control-group">
        <label for="group-color">Group Color:</label>
        <input type="color" id="group-color" value="#2196F3" onchange="window.systemBlocksEditor.updateGroupColor(this.value)">
      </div>
      
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.createSystemGrouping()" class="action-btn">
          Create System Group
        </button>
      </div>
    </div>
  `;
  
  controlsContainer.appendChild(visualizationPanel);
};

SystemBlocksEditor.prototype.toggleOverlayMode = function(enabled) {
  this.visualization3D.overlayMode = enabled;
  debugLog(`3D Overlay Mode: ${enabled ? 'ON' : 'OFF'}`);
  
  if (enabled) {
    // Enable 3D overlay visualization
    this.sendMessage('enable-3d-overlay', {
      diagram: this.diagram,
      viewBox: this.viewBox
    });
  } else {
    // Disable 3D overlay
    this.sendMessage('disable-3d-overlay', {});
  }
};

SystemBlocksEditor.prototype.toggleLiveThumbnails = function(enabled) {
  this.visualization3D.liveThumbnailsEnabled = enabled;
  debugLog(`Live 3D Thumbnails: ${enabled ? 'ON' : 'OFF'}`);
  
  if (enabled) {
    this.updateAllLiveThumbnails();
  }
};

SystemBlocksEditor.prototype.highlightSelectedComponents = function() {
  if (this.selectedBlock) {
    const blockId = this.selectedBlock.id;
    this.visualization3D.highlightedBlocks.add(blockId);
    
    // Send highlight request to Fusion 360
    this.sendMessage('highlight-components', {
      blockId: blockId,
      highlightColor: '#4CAF50'
    });
    
    debugLog(`Highlighting components for block: ${this.selectedBlock.name}`);
  } else {
    debugLog("No block selected for highlighting");
  }
};

SystemBlocksEditor.prototype.showConnectionRoutes = function() {
  const connections = this.diagram.connections || [];
  
  for (const connection of connections) {
    // Generate 3D route path for connection
    this.sendMessage('create-connection-route', {
      connectionId: connection.id,
      fromBlockId: connection.from.blockId,
      toBlockId: connection.to.blockId,
      routeStyle: {
        color: '#757575',
        thickness: 2.0,
        animated: true
      }
    });
  }
  
  debugLog(`Showing routes for ${connections.length} connections`);
};

SystemBlocksEditor.prototype.updateGroupColor = function(color) {
  const selectedBlocks = this.getSelectedBlocks();
  if (selectedBlocks.length > 0) {
    for (const block of selectedBlocks) {
      this.visualization3D.groupColors.set(block.id, color);
    }
    
    // Apply grouping in Fusion 360
    this.sendMessage('create-system-group', {
      blockIds: selectedBlocks.map(b => b.id),
      groupColor: color
    });
    
    debugLog(`Applied group color ${color} to ${selectedBlocks.length} blocks`);
  }
};

SystemBlocksEditor.prototype.createSystemGrouping = function() {
  const selectedBlocks = this.getSelectedBlocks();
  if (selectedBlocks.length < 2) {
    debugLog("Select at least 2 blocks to create a system group");
    return;
  }
  
  const groupColor = document.getElementById('group-color').value;
  this.updateGroupColor(groupColor);
};

SystemBlocksEditor.prototype.updateAllLiveThumbnails = function() {
  if (!this.visualization3D.liveThumbnailsEnabled) return;
  
  const blocks = this.diagram.blocks || [];
  const blocksWithCAD = blocks.filter(block => 
    block.links && block.links.some(link => link.target === 'cad')
  );
  
  for (const block of blocksWithCAD) {
    this.requestLiveThumbnail(block.id);
  }
  
  debugLog(`Updating live thumbnails for ${blocksWithCAD.length} blocks`);
};

SystemBlocksEditor.prototype.requestLiveThumbnail = function(blockId) {
  this.sendMessage('generate-live-thumbnail', {
    blockId: blockId,
    viewAngle: 'iso',
    size: { width: 150, height: 150 }
  });
};

// Living Documentation Methods
SystemBlocksEditor.prototype.addLivingDocumentationPanel = function() {
  const controlsContainer = document.getElementById('controls-container');
  
  const documentationPanel = document.createElement('div');
  documentationPanel.className = 'documentation-panel';
  documentationPanel.innerHTML = `
    <div class="panel-header">
      <h3>📋 Living Documentation</h3>
      <button onclick="window.systemBlocksEditor.toggleDocumentationPanel()" class="collapse-btn">−</button>
    </div>
    <div class="panel-content">
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.generateAssemblySequence()" class="action-btn">
          Generate Assembly Sequence
        </button>
      </div>
      
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.generateLivingBOM()" class="action-btn">
          Generate Living BOM
        </button>
      </div>
      
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.showServiceManual()" class="action-btn">
          Service Manual
        </button>
      </div>
      
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.showChangeImpact()" class="action-btn">
          Change Impact Analysis
        </button>
      </div>
      
      <div class="control-group">
        <button onclick="window.systemBlocksEditor.showManufacturingProgress()" class="action-btn">
          Manufacturing Progress
        </button>
      </div>
      
      <div id="documentation-results" class="results-panel"></div>
    </div>
  `;
  
  controlsContainer.appendChild(documentationPanel);
};

SystemBlocksEditor.prototype.generateAssemblySequence = function() {
  debugLog("Generating assembly sequence...");
  
  this.sendMessage('generate-assembly-sequence', {
    diagram: this.diagram
  }, (result) => {
    if (result && result.success) {
      this.livingDocumentation.assemblySequence = result.sequence;
      this.displayAssemblySequence(result.sequence);
    } else {
      debugLog("Failed to generate assembly sequence");
    }
  });
};

SystemBlocksEditor.prototype.displayAssemblySequence = function(sequence) {
  const resultsPanel = document.getElementById('documentation-results');
  
  let html = `
    <h4>🔧 Assembly Sequence</h4>
    <div class="sequence-list">
  `;
  
  for (const step of sequence) {
    const complexityColor = {
      'simple': '#4CAF50',
      'moderate': '#FF9800', 
      'complex': '#FF5722',
      'critical': '#F44336'
    }[step.complexity] || '#757575';
    
    html += `
      <div class="sequence-step">
        <div class="step-header">
          <span class="step-number">${step.order}</span>
          <span class="step-name">${step.blockName}</span>
          <span class="complexity-badge" style="background-color: ${complexityColor}">
            ${step.complexity}
          </span>
        </div>
        <div class="step-details">
          <div class="step-time">⏱ ${step.estimatedTime.toFixed(1)} min</div>
          ${step.dependencies.length > 0 ? 
            `<div class="step-deps">📋 Depends on: ${step.dependencies.join(', ')}</div>` : ''
          }
          <div class="step-instructions">
            ${step.instructions.map(instruction => `<div>• ${instruction}</div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  resultsPanel.innerHTML = html;
};

SystemBlocksEditor.prototype.generateLivingBOM = function() {
  debugLog("Generating living BOM...");
  
  this.sendMessage('generate-living-bom', {
    diagram: this.diagram
  }, (result) => {
    if (result && result.success) {
      this.livingDocumentation.currentBOM = result.bom;
      this.displayLivingBOM(result.bom);
    } else {
      debugLog("Failed to generate living BOM");
    }
  });
};

SystemBlocksEditor.prototype.displayLivingBOM = function(bom) {
  const resultsPanel = document.getElementById('documentation-results');
  
  let html = `
    <h4>📦 Living Bill of Materials</h4>
    <div class="bom-summary">
      <div class="bom-stat">
        <span class="stat-label">Total Items:</span>
        <span class="stat-value">${bom.summary.totalItems}</span>
      </div>
      <div class="bom-stat">
        <span class="stat-label">Total Cost:</span>
        <span class="stat-value">$${bom.summary.totalCost.toFixed(2)}</span>
      </div>
      <div class="bom-stat">
        <span class="stat-label">Max Lead Time:</span>
        <span class="stat-value">${bom.summary.maxLeadTime} days</span>
      </div>
    </div>
    
    <div class="bom-items">
      <table class="bom-table">
        <thead>
          <tr>
            <th>Part Number</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total Cost</th>
            <th>Lead Time</th>
            <th>Supplier</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  for (const item of bom.items) {
    html += `
      <tr>
        <td>${item.partNumber}</td>
        <td>${item.blockName}</td>
        <td>${item.quantity}</td>
        <td>$${item.cost.toFixed(2)}</td>
        <td>$${item.totalCost.toFixed(2)}</td>
        <td>${item.leadTime} days</td>
        <td>${item.supplier}</td>
      </tr>
    `;
  }
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  resultsPanel.innerHTML = html;
};

SystemBlocksEditor.prototype.showServiceManual = function() {
  if (this.selectedBlock) {
    this.sendMessage('generate-service-manual', {
      blockId: this.selectedBlock.id,
      diagram: this.diagram
    }, (result) => {
      if (result && result.success) {
        this.displayServiceManual(result.manual);
      }
    });
  } else {
    debugLog("Select a block to generate service manual");
  }
};

SystemBlocksEditor.prototype.showChangeImpact = function() {
  if (this.selectedBlock) {
    this.sendMessage('analyze-change-impact', {
      blockId: this.selectedBlock.id,
      diagram: this.diagram
    }, (result) => {
      if (result && result.success) {
        this.displayChangeImpact(result.impact);
      }
    });
  } else {
    debugLog("Select a block to analyze change impact");
  }
};

SystemBlocksEditor.prototype.displayChangeImpact = function(impact) {
  const resultsPanel = document.getElementById('documentation-results');
  
  const impactColors = {
    'low': '#4CAF50',
    'medium': '#FF9800',
    'high': '#FF5722',
    'critical': '#F44336'
  };
  
  let html = `
    <h4>⚡ Change Impact Analysis</h4>
    <div class="impact-summary">
      <div class="impact-level" style="background-color: ${impactColors[impact.impactLevel]}">
        Impact Level: ${impact.impactLevel.toUpperCase()}
      </div>
      <div class="affected-count">
        Affected Blocks: ${impact.affectedBlocks.length}
      </div>
    </div>
    
    <div class="impact-details">
      <div class="change-reason">
        <strong>Change Reason:</strong> ${impact.changeReason}
      </div>
      <div class="timestamp">
        <strong>Analysis Time:</strong> ${new Date(impact.timestamp).toLocaleString()}
      </div>
      
      ${impact.affectedBlocks.length > 0 ? `
        <div class="affected-blocks">
          <h5>Affected Blocks:</h5>
          <ul>
            ${impact.affectedBlocks.map(blockId => {
              const block = this.diagram.blocks.find(b => b.id === blockId);
              return `<li>${block ? block.name : blockId}</li>`;
            }).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  resultsPanel.innerHTML = html;
};

SystemBlocksEditor.prototype.showManufacturingProgress = function() {
  const blocks = this.diagram.blocks || [];
  
  let html = `
    <h4>🏭 Manufacturing Progress</h4>
    <div class="progress-overview">
  `;
  
  for (const block of blocks) {
    const progress = block.livingDocumentation?.manufacturingProgress || {
      stage: 'design',
      completionPercentage: 0
    };
    
    const stageColors = {
      'design': '#2196F3',
      'prototype': '#FF9800', 
      'production': '#FF5722',
      'complete': '#4CAF50'
    };
    
    html += `
      <div class="progress-item">
        <div class="progress-header">
          <span class="block-name">${block.name}</span>
          <span class="stage-badge" style="background-color: ${stageColors[progress.stage]}">
            ${progress.stage}
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress.completionPercentage}%; background-color: ${stageColors[progress.stage]}"></div>
          <span class="progress-text">${progress.completionPercentage.toFixed(1)}%</span>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  
  const resultsPanel = document.getElementById('documentation-results');
  resultsPanel.innerHTML = html;
};

// Utility Methods
SystemBlocksEditor.prototype.getSelectedBlocks = function() {
  // For now, return selected block as array, but this could be extended for multi-select
  if (this.selectedBlock) {
    return [this.selectedBlock];
  }
  return [];
};

SystemBlocksEditor.prototype.toggleVisualizationPanel = function() {
  const panel = document.querySelector('.visualization-panel .panel-content');
  const button = document.querySelector('.visualization-panel .collapse-btn');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    button.textContent = '−';
  } else {
    panel.style.display = 'none';
    button.textContent = '+';
  }
};

SystemBlocksEditor.prototype.toggleDocumentationPanel = function() {
  const panel = document.querySelector('.documentation-panel .panel-content');
  const button = document.querySelector('.documentation-panel .collapse-btn');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    button.textContent = '−';
  } else {
    panel.style.display = 'none';
    button.textContent = '+';
  }
};

// CSS for 3D Visualization and Living Documentation panels
const visualIntegrationCSS = `
  .visualization-panel, .documentation-panel {
    background: #2b2b2b;
    border: 1px solid #555;
    border-radius: 6px;
    margin: 10px 0;
    color: #ffffff;
  }
  
  .panel-header {
    background: #404040;
    padding: 8px 12px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .panel-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  .collapse-btn {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
  }
  
  .panel-content {
    padding: 12px;
  }
  
  .control-group {
    margin: 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .action-btn {
    background: #0078d4;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  
  .action-btn:hover {
    background: #106ebe;
  }
  
  .results-panel {
    margin-top: 12px;
    padding: 12px;
    background: #1e1e1e;
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .sequence-step {
    margin: 8px 0;
    padding: 8px;
    background: #333;
    border-radius: 4px;
  }
  
  .step-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  
  .step-number {
    background: #0078d4;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  
  .complexity-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: bold;
    color: white;
  }
  
  .bom-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  
  .bom-table th, .bom-table td {
    padding: 4px 8px;
    border: 1px solid #555;
    text-align: left;
  }
  
  .bom-table th {
    background: #404040;
  }
  
  .progress-item {
    margin: 8px 0;
    padding: 8px;
    background: #333;
    border-radius: 4px;
  }
  
  .progress-bar {
    position: relative;
    background: #555;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 4px;
  }
  
  .progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 10px;
    font-weight: bold;
    color: white;
  }
`;

// Inject CSS for visual integration
const styleSheet = document.createElement('style');
styleSheet.textContent = visualIntegrationCSS;
document.head.appendChild(styleSheet);
