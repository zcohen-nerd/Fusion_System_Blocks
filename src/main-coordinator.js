/**
 * SYSTEM BLOCKS EDITOR - MAIN COORDINATOR
 * 
 * Main entry point that coordinates all modules:
 * - Initializes all components
 * - Manages inter-module communication
 * - Provides global API
 * - Handles module lifecycle
 * 
 * Author: GitHub Copilot
 * Created: September 26, 2025
 * Module: Main Coordinator
 */

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

// Module loading is handled by <script> tags in palette.html.
// The coordinator expects the following globals to be available:
//   DiagramEditorCore, DiagramRenderer, ToolbarManager,
//   AdvancedFeatures, PythonInterface (python-bridge.js)

class SystemBlocksMain {
  constructor() {
    this.modules = new Map();
    this.isInitialized = false;
    this.moduleLoadPromises = [];
    
  logger.info('=== System Blocks Editor Starting ===');
    this.initialize();
  }

  async initialize() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
      }

  logger.debug('DOM ready, initializing modules...');
      
      // Initialize core modules in order
      await this.initializeModules();
      
      // Set up inter-module communication
      this.setupModuleCommunication();
      
      // Set up global API
      this.setupGlobalAPI();
      
      // Final initialization
      this.finalizeInitialization();
      
      this.isInitialized = true;
      window._systemBlocksInitialized = true;
      logger.info('=== System Blocks Editor Ready ===');
      
    } catch (error) {
      logger.error('Failed to initialize System Blocks Editor:', error);
      this.showErrorMessage('Failed to initialize editor: ' + error.message);
    }
  }

  async initializeModules() {
    // Initialize core editor first
    logger.debug('Initializing core editor...');
    this.modules.set('core', new DiagramEditorCore());
    
    // Initialize renderer
    logger.debug('Initializing renderer...');
    this.modules.set('renderer', new DiagramRenderer(this.modules.get('core')));
    
    // Initialize toolbar manager
    logger.debug('Initializing toolbar...');
    this.modules.set('toolbar', new ToolbarManager(
      this.modules.get('core'),
      this.modules.get('renderer')
    ));
    
    // Initialize advanced features
    logger.debug('Initializing advanced features...');
    this.modules.set('features', new AdvancedFeatures(
      this.modules.get('core'),
      this.modules.get('renderer')
    ));
    
    // Python interface is already initialized globally
    this.modules.set('python', window.pythonInterface);
    
  logger.info('All modules initialized successfully');
  }

  setupModuleCommunication() {
    // Set up cross-references between modules
    const core = this.modules.get('core');
    const renderer = this.modules.get('renderer');
    const toolbar = this.modules.get('toolbar');
    const features = this.modules.get('features');
    const python = this.modules.get('python');
    
    // Make modules globally accessible
    window.diagramEditor = core;
    window.diagramRenderer = renderer;
    window.toolbarManager = toolbar;
    window.advancedFeatures = features;
    // python is already global as window.pythonInterface
    
    // Set up event handlers for core editor
    this.setupCanvasEventHandlers(core, renderer, features);
    
    // Set up toolbar state synchronization
    this.setupToolbarSync(core, toolbar, features);
    
    // Set up advanced features integration
    this.setupAdvancedFeaturesIntegration(core, renderer, features);
  }

  setupCanvasEventHandlers(core, renderer, features) {
    const svg = document.getElementById('svg-canvas');
    if (!svg) {
      logger.error('SVG canvas not found!');
      return;
    }

    let lastMousePos = { x: 0, y: 0 };
    let draggedBlock = null;
    let dragOffset = { x: 0, y: 0 };

    // Convert screen (client) coordinates to SVG/diagram coordinates.
    // Uses getScreenCTM() which correctly handles viewBox + preserveAspectRatio,
    // unlike manual math that breaks when the SVG aspect ratio differs from viewBox.
    const screenToSVG = (clientX, clientY) => {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        const svgPt = point.matrixTransform(ctm.inverse());
        return { x: svgPt.x, y: svgPt.y };
      }
      // Fallback for environments without getScreenCTM
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (core.viewBox.width / rect.width) + core.viewBox.x,
        y: (clientY - rect.top) * (core.viewBox.height / rect.height) + core.viewBox.y
      };
    };

    // Mouse down - start drag or selection
    svg.addEventListener('mousedown', (e) => {
      // Do not start drag/select while in connection drawing mode (handled by click)
      if (this._connectionMode && this._connectionMode.active) return;

      const { x, y } = screenToSVG(e.clientX, e.clientY);
      
      lastMousePos = { x: e.clientX, y: e.clientY };
      
      const clickedBlock = core.getBlockAt(x, y);
      
      if (clickedBlock) {
        // Block clicked
        if (e.ctrlKey || e.metaKey) {
          // Multi-select mode
          features.toggleSelection(clickedBlock.id);
        } else {
          // Single select
          if (!features.selectedBlocks.has(clickedBlock.id)) {
            features.clearSelection();
            features.addToSelection(clickedBlock.id);
          }
          core.selectBlock(clickedBlock.id);
        }
        
        // Start drag
        draggedBlock = clickedBlock;
        dragOffset = { x: x - clickedBlock.x, y: y - clickedBlock.y };
        
        e.preventDefault();
      } else {
        // Empty space clicked
        if (!e.ctrlKey && !e.metaKey) {
          features.clearSelection();
          core.clearSelection();
        }
        
        // Start lasso selection
        features.startLassoSelection(x, y);
      }
    });
    
    // Mouse move - drag or lasso
    svg.addEventListener('mousemove', (e) => {
      const currentTime = performance.now();
      if (currentTime - core.lastMouseMoveTime < core.mouseMoveThreshold) return;
      core.lastMouseMoveTime = currentTime;
      
      const { x, y } = screenToSVG(e.clientX, e.clientY);
      
      if (draggedBlock) {
        // Drag block - update position using SVG-accurate coordinates
        const newPos = core.snapToGrid(x - dragOffset.x, y - dragOffset.y);
        core.updateBlock(draggedBlock.id, { x: newPos.x, y: newPos.y });
        renderer.renderBlock(core.diagram.blocks.find(b => b.id === draggedBlock.id));
      } else if (features.isLassoSelecting) {
        // Update lasso selection
        features.updateLassoSelection(x, y);
      } else if (e.buttons === 1 && !draggedBlock) {
        // Pan canvas — but NOT while drawing a connection
        if (this._connectionMode && this._connectionMode.active) return;

        const ctm = svg.getScreenCTM();
        let scaleX, scaleY;
        if (ctm) {
          scaleX = ctm.a;
          scaleY = ctm.d;
        } else {
          const rect = svg.getBoundingClientRect();
          scaleX = rect.width / core.viewBox.width;
          scaleY = rect.height / core.viewBox.height;
        }
        const deltaX = (e.clientX - lastMousePos.x) / scaleX;
        const deltaY = (e.clientY - lastMousePos.y) / scaleY;
        
        core.panBy(deltaX, deltaY);
        
        lastMousePos = { x: e.clientX, y: e.clientY };
      }
    });
    
    // Mouse up - end drag or selection
    svg.addEventListener('mouseup', (e) => {
      if (draggedBlock) {
        // End block drag
        features.saveState(); // For undo/redo
        draggedBlock = null;
        dragOffset = { x: 0, y: 0 };
      } else if (features.isLassoSelecting) {
        // End lasso selection
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        features.finishLassoSelection(x, y);
      }
    });
    
    // Mouse wheel - zoom
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const { x: centerX, y: centerY } = screenToSVG(e.clientX, e.clientY);
      
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      core.zoomAt(zoomFactor, centerX, centerY);
    });

    // =========================================================================
    // DOUBLE-CLICK — inline rename block
    // =========================================================================
    svg.addEventListener('dblclick', (e) => {
      // Suppress rename if we just exited connection mode (click → dblclick)
      if (this._connectionModeExitTime &&
          performance.now() - this._connectionModeExitTime < 500) {
        return;
      }

      const { x, y } = screenToSVG(e.clientX, e.clientY);
      const block = core.getBlockAt(x, y);
      if (!block) return;

      e.preventDefault();
      this.startInlineEdit(block, svg, core, renderer);
    });

    // =========================================================================
    // RIGHT-CLICK — context menu
    // =========================================================================
    svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();

      const { x, y } = screenToSVG(e.clientX, e.clientY);
      const block = core.getBlockAt(x, y);

      this.showContextMenu(e.clientX, e.clientY, block, core, renderer, features);
    });

    // Close context menu on any left-click OUTSIDE the menu.
    // Do NOT hide when clicking inside — otherwise the menu becomes
    // display:none before the click event fires on the menu item,
    // preventing all context menu actions from executing.
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        const menu = document.getElementById('block-context-menu');
        if (!menu || !menu.contains(e.target)) {
          this.hideContextMenu();
        }
      }
    });

    // =========================================================================
    // CONNECTION DRAWING MODE
    // =========================================================================
    this._connectionMode = {
      active: false,
      sourceBlock: null,
      tempLine: null
    };
    this._connectionModeExitTime = 0;

    svg.addEventListener('mousemove', (e) => {
      if (!this._connectionMode.active || !this._connectionMode.tempLine) return;

      const { x, y } = screenToSVG(e.clientX, e.clientY);
      const src = this._connectionMode.sourceBlock;
      const fromX = src.x + (src.width || 120);
      const fromY = src.y + (src.height || 80) / 2;

      this._connectionMode.tempLine.setAttribute('x2', x);
      this._connectionMode.tempLine.setAttribute('y2', y);
    });

    svg.addEventListener('click', (e) => {
      if (!this._connectionMode.active) return;

      const { x, y } = screenToSVG(e.clientX, e.clientY);
      const targetBlock = core.getBlockAt(x, y);

      if (targetBlock && targetBlock.id !== this._connectionMode.sourceBlock.id) {
        // Create the connection
        const connType = document.getElementById('connection-type-select');
        const type = connType ? connType.value : 'auto';
        const conn = core.addConnection(this._connectionMode.sourceBlock.id, targetBlock.id, type);
        if (conn) {
          renderer.renderConnection(conn);
          if (window.advancedFeatures) window.advancedFeatures.saveState();
        }
      }
      this.exitConnectionMode(svg);
      e.stopPropagation();
    });

    // Escape to cancel connection mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._connectionMode.active) {
        this.exitConnectionMode(svg);
      }
    });
  }

  // =========================================================================
  // INLINE EDIT (double-click rename)
  // =========================================================================
  startInlineEdit(block, svg, core, renderer) {
    // Create a foreignObject to host an HTML input over the block
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    const bw = block.width || 120;
    const bh = block.height || 80;
    fo.setAttribute('x', block.x + 4);
    fo.setAttribute('y', block.y + bh / 2 - 14);
    fo.setAttribute('width', bw - 8);
    fo.setAttribute('height', 28);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = block.name || '';
    input.style.cssText = `
      width: 100%; height: 100%; border: 2px solid #FF6B35;
      border-radius: 4px; text-align: center; font-size: 12px;
      font-weight: bold; font-family: Arial, sans-serif;
      outline: none; padding: 2px 4px; box-sizing: border-box;
      background: white; color: #333;
    `;

    fo.appendChild(input);
    svg.appendChild(fo);

    // Select all text for easy replacement
    input.focus();
    input.select();

    const commit = () => {
      const newName = input.value.trim();
      if (newName && newName !== block.name) {
        core.updateBlock(block.id, { name: newName });
        renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
      }
      if (fo.parentNode) fo.remove();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { if (fo.parentNode) fo.remove(); }
      e.stopPropagation(); // prevent shortcuts from firing
    });

    input.addEventListener('blur', commit);
  }

  // =========================================================================
  // CONTEXT MENU
  // =========================================================================
  showContextMenu(clientX, clientY, block, core, renderer, features) {
    this.hideContextMenu();

    const menu = document.getElementById('block-context-menu');
    if (!menu) return;

    // Show/hide block-specific items
    menu.querySelectorAll('[data-needs-block]').forEach(el => {
      el.style.display = block ? '' : 'none';
    });
    menu.querySelectorAll('[data-needs-empty]').forEach(el => {
      el.style.display = block ? 'none' : '';
    });

    // Wire up handlers (replace previous listeners via cloneNode trick)
    const freshMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(freshMenu, menu);
    freshMenu.id = 'block-context-menu';

    // Block-specific actions
    if (block) {
      this._ctxAction(freshMenu, 'ctx-rename', () => {
        this.hideContextMenu();
        const svg = document.getElementById('svg-canvas');
        this.startInlineEdit(block, svg, core, renderer);
      });

      this._ctxAction(freshMenu, 'ctx-delete', () => {
        this.hideContextMenu();
        core.removeBlock(block.id);
        renderer.updateAllBlocks(core.diagram);
        core.clearSelection();
        if (window.advancedFeatures) {
          window.advancedFeatures.removeFromSelection(block.id);
          window.advancedFeatures.saveState();
        }
      });

      this._ctxAction(freshMenu, 'ctx-connect-from', () => {
        this.hideContextMenu();
        this.enterConnectionMode(block, core, renderer);
      });

      // Type submenu
      freshMenu.querySelectorAll('[data-set-type]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const newType = item.getAttribute('data-set-type');
          core.updateBlock(block.id, { type: newType });
          renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
          this.hideContextMenu();
        });
      });

      // Status submenu
      freshMenu.querySelectorAll('[data-set-status]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const newStatus = item.getAttribute('data-set-status');
          core.updateBlock(block.id, { status: newStatus });
          renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
          this.hideContextMenu();
        });
      });
    }

    // Canvas/empty-space actions
    this._ctxAction(freshMenu, 'ctx-add-block', () => {
      this.hideContextMenu();
      if (window.toolbarManager) window.toolbarManager.handleCreateBlock();
    });

    this._ctxAction(freshMenu, 'ctx-fit-view', () => {
      this.hideContextMenu();
      if (window.toolbarManager) window.toolbarManager.handleFitView();
    });

    // Position and show
    freshMenu.style.left = clientX + 'px';
    freshMenu.style.top = clientY + 'px';
    freshMenu.classList.add('show');

    // Clamp to viewport
    requestAnimationFrame(() => {
      const rect = freshMenu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        freshMenu.style.left = (clientX - rect.width) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        freshMenu.style.top = (clientY - rect.height) + 'px';
      }
    });
  }

  hideContextMenu() {
    const menu = document.getElementById('block-context-menu');
    if (menu) menu.classList.remove('show');
  }

  _ctxAction(menu, id, handler) {
    const el = menu.querySelector('#' + id);
    if (el) el.addEventListener('click', handler);
  }

  // =========================================================================
  // CONNECTION DRAWING MODE
  // =========================================================================
  enterConnectionMode(sourceBlock, core, renderer) {
    const svg = document.getElementById('svg-canvas');
    if (!svg) return;

    this._connectionMode.active = true;
    this._connectionMode.sourceBlock = sourceBlock;

    // Highlight source block
    renderer.highlightBlock(sourceBlock.id, true);

    // Create temporary line from source block center-right edge
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const fromX = sourceBlock.x + (sourceBlock.width || 120);
    const fromY = sourceBlock.y + (sourceBlock.height || 80) / 2;
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', fromX);
    line.setAttribute('y2', fromY);
    line.setAttribute('stroke', '#FF6B35');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6,3');
    line.setAttribute('pointer-events', 'none');
    svg.appendChild(line);
    this._connectionMode.tempLine = line;

    // Change cursor
    svg.style.cursor = 'crosshair';

    logger.info('Connection mode: click a target block or press Escape');
  }

  exitConnectionMode(svg) {
    if (!svg) svg = document.getElementById('svg-canvas');
    if (this._connectionMode.tempLine) {
      this._connectionMode.tempLine.remove();
    }
    if (this._connectionMode.sourceBlock && window.diagramRenderer) {
      window.diagramRenderer.highlightBlock(this._connectionMode.sourceBlock.id, false);
    }
    this._connectionMode.active = false;
    this._connectionMode.sourceBlock = null;
    this._connectionMode.tempLine = null;
    this._connectionModeExitTime = performance.now();
    if (svg) svg.style.cursor = '';
  }

  setupToolbarSync(core, toolbar, features) {
    // Update toolbar when selection changes
    const originalSelectBlock = core.selectBlock.bind(core);
    core.selectBlock = function(blockId) {
      originalSelectBlock(blockId);
      toolbar.updateButtonStates();
    };
    
    const originalClearSelection = core.clearSelection.bind(core);
    core.clearSelection = function() {
      originalClearSelection();
      toolbar.updateButtonStates();
    };
    
    // Update toolbar when diagram changes
    const originalAddBlock = core.addBlock.bind(core);
    core.addBlock = function(blockData) {
      const result = originalAddBlock(blockData);
      toolbar.updateButtonStates();
      return result;
    };
    
    const originalRemoveBlock = core.removeBlock.bind(core);
    core.removeBlock = function(blockId) {
      originalRemoveBlock(blockId);
      toolbar.updateButtonStates();
    };
  }

  setupAdvancedFeaturesIntegration(core, renderer, features) {
    // Save state when blocks are modified, with debounce to avoid flooding
    // during drag operations (~60 updateBlock calls/sec).
    let saveTimer = null;
    const originalUpdateBlock = core.updateBlock.bind(core);
    core.updateBlock = function(blockId, updates) {
      const result = originalUpdateBlock(blockId, updates);
      if (result && !features.isPerformingUndoRedo) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => features.saveState(), 250);
      }
      return result;
    };
  }

  setupGlobalAPI() {
    // Provide a clean global API
    window.SystemBlocks = {
      // Core functionality
      createBlock: (blockData) => {
        const block = this.modules.get('core').addBlock(blockData);
        this.modules.get('renderer').renderBlock(block);
        return block;
      },
      
      deleteBlock: (blockId) => {
        this.modules.get('core').removeBlock(blockId);
        this.modules.get('renderer').updateAllBlocks(this.modules.get('core').diagram);
      },
      
      connectBlocks: (fromBlockId, toBlockId, type) => {
        const conn = this.modules.get('core').addConnection(fromBlockId, toBlockId, type);
        if (conn) {
          this.modules.get('renderer').renderConnection(conn);
        }
        return conn;
      },
      
      selectBlock: (blockId) => {
        this.modules.get('core').selectBlock(blockId);
        this.modules.get('features').addToSelection(blockId);
      },
      
      clearSelection: () => {
        this.modules.get('core').clearSelection();
        this.modules.get('features').clearSelection();
      },
      
      // Diagram operations
      exportDiagram: () => this.modules.get('core').exportDiagram(),
      importDiagram: (jsonData) => {
        const success = this.modules.get('core').importDiagram(jsonData);
        if (success) {
          this.modules.get('renderer').updateAllBlocks(this.modules.get('core').diagram);
        }
        return success;
      },
      
      // Advanced features
      undo: () => this.modules.get('features').undo(),
      redo: () => this.modules.get('features').redo(),
      
      createGroup: (blockIds, name) => this.modules.get('features').createGroup(blockIds, name),
      
      // Python interface
      save: () => this.modules.get('python').saveDiagram(),
      load: () => this.modules.get('python').loadDiagram(),
      exportReports: () => this.modules.get('python').exportReports(),
      
      // Module access (for advanced users)
      getModule: (name) => this.modules.get(name),
      
      // Status
      isReady: () => this.isInitialized,
      getVersion: () => '2.0.0-modular'
    };
    
  logger.info('Global API available as window.SystemBlocks');
  }

  finalizeInitialization() {
    // Set up window resize handler for responsive design
    window.addEventListener('resize', () => {
      this.modules.get('toolbar').handleResize();
    });
    
    // Initial toolbar state update
    this.modules.get('toolbar').updateButtonStates();

    // Disable the legacy FusionKeyboardManager (palette.html fallback)
    // now that the modular ToolbarManager is active, to prevent
    // double-firing of Delete, Escape, Ctrl+Z, etc.
    if (window.fusionKeyboard && window.fusionKeyboard.destroy) {
      window.fusionKeyboard.destroy();
    }
    // Prevent deferred creation of the fallback manager
    window._systemBlocksInitialized = true;
    
    // Fire readiness event for external consumers
    const readyDetail = {
      modules: {
        core: this.modules.get('core'),
        renderer: this.modules.get('renderer'),
        toolbar: this.modules.get('toolbar'),
        features: this.modules.get('features'),
        python: this.modules.get('python')
      }
    };
    window.dispatchEvent(new CustomEvent('system-blocks:ready', { detail: readyDetail }));

    // Show ready indicator
    this.showReadyIndicator();
  }

  showReadyIndicator() {
    const indicator = document.createElement('div');
    indicator.textContent = '✓ System Blocks Ready';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(indicator);
    
    // Fade in
    setTimeout(() => indicator.style.opacity = '1', 100);
    
    // Fade out after 3 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 3000);
  }

  showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #F44336;
      color: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      text-align: center;
      z-index: 10001;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 8000);
  }

  // Public methods for debugging and maintenance
  getModuleStatus() {
    const status = {};
    this.modules.forEach((module, name) => {
      status[name] = {
        loaded: !!module,
        type: module.constructor.name
      };
    });
    return status;
  }

  reinitialize() {
  logger.info('Reinitializing System Blocks Editor...');
    this.isInitialized = false;
    this.modules.clear();
    this.initialize();
  }
}

// Initialize when script loads
const systemBlocksMain = new SystemBlocksMain();

// Export for debugging
window.SystemBlocksMain = systemBlocksMain;