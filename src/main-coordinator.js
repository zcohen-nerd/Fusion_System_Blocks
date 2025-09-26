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

// Module loading order and dependencies
const MODULES = [
  { name: 'DiagramEditorCore', path: 'core/diagram-editor.js' },
  { name: 'DiagramRenderer', path: 'ui/diagram-renderer.js' },
  { name: 'ToolbarManager', path: 'ui/toolbar-manager.js' },
  { name: 'AdvancedFeatures', path: 'features/advanced-features.js' },
  { name: 'PythonInterface', path: 'interface/python-bridge.js' }
];

class SystemBlocksMain {
  constructor() {
    this.modules = new Map();
    this.isInitialized = false;
    this.moduleLoadPromises = [];
    
    console.log('=== System Blocks Editor Starting ===');
    this.initialize();
  }

  async initialize() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
      }

      console.log('DOM ready, initializing modules...');
      
      // Initialize core modules in order
      await this.initializeModules();
      
      // Set up inter-module communication
      this.setupModuleCommunication();
      
      // Set up global API
      this.setupGlobalAPI();
      
      // Final initialization
      this.finalizeInitialization();
      
      this.isInitialized = true;
      console.log('=== System Blocks Editor Ready ===');
      
    } catch (error) {
      console.error('Failed to initialize System Blocks Editor:', error);
      this.showErrorMessage('Failed to initialize editor: ' + error.message);
    }
  }

  async initializeModules() {
    // Initialize core editor first
    console.log('Initializing core editor...');
    this.modules.set('core', new DiagramEditorCore());
    
    // Initialize renderer
    console.log('Initializing renderer...');
    this.modules.set('renderer', new DiagramRenderer(this.modules.get('core')));
    
    // Initialize toolbar manager
    console.log('Initializing toolbar...');
    this.modules.set('toolbar', new ToolbarManager(
      this.modules.get('core'),
      this.modules.get('renderer')
    ));
    
    // Initialize advanced features
    console.log('Initializing advanced features...');
    this.modules.set('features', new AdvancedFeatures(
      this.modules.get('core'),
      this.modules.get('renderer')
    ));
    
    // Python interface is already initialized globally
    this.modules.set('python', window.pythonInterface);
    
    console.log('All modules initialized successfully');
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
    const svg = document.getElementById('diagram-svg');
    if (!svg) {
      console.error('SVG canvas not found!');
      return;
    }

    let lastMousePos = { x: 0, y: 0 };
    let draggedBlock = null;
    let dragOffset = { x: 0, y: 0 };

    // Mouse down - start drag or selection
    svg.addEventListener('mousedown', (e) => {
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (core.viewBox.width / rect.width) + core.viewBox.x;
      const y = (e.clientY - rect.top) * (core.viewBox.height / rect.height) + core.viewBox.y;
      
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
      
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (core.viewBox.width / rect.width) + core.viewBox.x;
      const y = (e.clientY - rect.top) * (core.viewBox.height / rect.height) + core.viewBox.y;
      
      if (draggedBlock) {
        // Drag block
        const newPos = core.snapToGrid(x - dragOffset.x, y - dragOffset.y);
        core.updateBlock(draggedBlock.id, { x: newPos.x, y: newPos.y });
        renderer.renderBlock(core.diagram.blocks.find(b => b.id === draggedBlock.id));
      } else if (features.isLassoSelecting) {
        // Update lasso selection
        features.updateLassoSelection(x, y);
      } else if (e.buttons === 1 && !draggedBlock) {
        // Pan canvas
        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;
        
        core.panBy(deltaX * (core.viewBox.width / rect.width), 
                   deltaY * (core.viewBox.height / rect.height));
        
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
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (core.viewBox.width / rect.width) + core.viewBox.x;
        const y = (e.clientY - rect.top) * (core.viewBox.height / rect.height) + core.viewBox.y;
        
        features.finishLassoSelection(x, y);
      }
    });
    
    // Mouse wheel - zoom
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const rect = svg.getBoundingClientRect();
      const centerX = (e.clientX - rect.left) * (core.viewBox.width / rect.width) + core.viewBox.x;
      const centerY = (e.clientY - rect.top) * (core.viewBox.height / rect.height) + core.viewBox.y;
      
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      core.zoomAt(zoomFactor, centerX, centerY);
    });
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
    // Save state when blocks are modified
    const originalUpdateBlock = core.updateBlock.bind(core);
    core.updateBlock = function(blockId, updates) {
      const result = originalUpdateBlock(blockId, updates);
      if (result && !features.isPerformingUndoRedo) {
        // Only save state if not in undo/redo operation
        setTimeout(() => features.saveState(), 100); // Debounce saves
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
    
    console.log('Global API available as window.SystemBlocks');
  }

  finalizeInitialization() {
    // Set up window resize handler for responsive design
    window.addEventListener('resize', () => {
      this.modules.get('toolbar').handleResize();
    });
    
    // Initial toolbar state update
    this.modules.get('toolbar').updateButtonStates();
    
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
    console.log('Reinitializing System Blocks Editor...');
    this.isInitialized = false;
    this.modules.clear();
    this.initialize();
  }
}

// Initialize when script loads
const systemBlocksMain = new SystemBlocksMain();

// Export for debugging
window.SystemBlocksMain = systemBlocksMain;