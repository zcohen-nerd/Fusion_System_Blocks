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

    // Set up search / filter bar
    this.setupSearchFilter(core, renderer);

    // Set up import dialog wiring
    this.setupImportDialog(core, renderer, features);
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
    let dragMoved = false; // tracks whether block actually moved during drag

    // Track whether a connection mode was JUST entered in this mousedown,
    // so the corresponding mouseup doesn't immediately complete/exit it.
    let connectionStartedThisClick = false;

    // --- Manual double-click detection state ---
    // Fusion 360's CEF may not reliably fire 'dblclick' on SVG elements,
    // so we detect double-clicks ourselves in the mousedown handler.
    let lastClickTime = 0;
    let lastClickBlockId = null;
    const DBLCLICK_THRESHOLD = 400; // ms

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

    // --- Helper: find a connection port near the given SVG coordinates ---
    // Returns { block, portType } or null.
    // Used as a fallback when e.target.closest('.connection-port') fails
    // (which can happen in Fusion 360's Chromium with opacity-0 SVG elements).
    const findPortAt = (svgX, svgY) => {
      const PORT_HIT_RADIUS = 10; // slightly larger than visual r=6
      for (let i = core.diagram.blocks.length - 1; i >= 0; i--) {
        const block = core.diagram.blocks[i];
        const w = block.width || 120;
        const h = block.height || 80;
        // Output port (right center)
        const outX = block.x + w;
        const outY = block.y + h / 2;
        if (Math.hypot(svgX - outX, svgY - outY) <= PORT_HIT_RADIUS) {
          return { block, portType: 'output' };
        }
        // Input port (left center)
        const inX = block.x;
        const inY = block.y + h / 2;
        if (Math.hypot(svgX - inX, svgY - inY) <= PORT_HIT_RADIUS) {
          return { block, portType: 'input' };
        }
      }
      return null;
    };

    // Mouse down - start drag or selection
    svg.addEventListener('mousedown', (e) => {
      // Track mouse position for ALL buttons so middle-button pan
      // (handled in mousemove, e.buttons === 4) has a valid origin.
      lastMousePos = { x: e.clientX, y: e.clientY };

      // Only handle primary (left) button for selection/drag.
      if (e.button !== 0) return;

      // Do not start drag/select while in connection drawing mode
      if (this._connectionMode && this._connectionMode.active) return;

      const { x, y } = screenToSVG(e.clientX, e.clientY);

      // --- Port click: start connection mode from that block ---
      // Primary: DOM-based detection via closest()
      let portEl = e.target.closest
        ? e.target.closest('.connection-port')
        : null;

      // Fallback: check getAttribute('class') directly — closest() may not
      // work correctly on SVG elements in Fusion 360's Chromium
      if (!portEl && e.target.getAttribute &&
          e.target.getAttribute('class') &&
          e.target.getAttribute('class').indexOf('connection-port') !== -1) {
        portEl = e.target;
      }

      if (portEl && portEl.getAttribute('data-block-id')) {
        const blockId = portEl.getAttribute('data-block-id');
        const block = core.diagram.blocks.find(b => b.id === blockId);
        if (block) {
          e.preventDefault();
          e.stopPropagation();
          connectionStartedThisClick = true;
          this.enterConnectionMode(block, core, renderer);
          return;
        }
      }

      // Second fallback: coordinate-based port detection
      const portHit = findPortAt(x, y);
      if (portHit) {
        e.preventDefault();
        e.stopPropagation();
        connectionStartedThisClick = true;
        this.enterConnectionMode(portHit.block, core, renderer);
        return;
      }

      // --- Connection click: select / highlight a connection ---
      const connEl = e.target.closest
        ? e.target.closest('[data-connection-id]')
        : null;
      if (connEl && !core.getBlockAt(x, y)) {
        const connId = connEl.getAttribute('data-connection-id');
        this._selectedConnection = connId;
        renderer.clearConnectionHighlights();
        renderer.highlightConnection(connId, true);
        features.clearSelection();
        core.clearSelection();
        e.preventDefault();
        return;
      }
      
      const clickedBlock = core.getBlockAt(x, y);
      
      if (clickedBlock) {
        // --- Manual double-click detection ---
        const now = performance.now();
        if (lastClickBlockId === clickedBlock.id &&
            (now - lastClickTime) < DBLCLICK_THRESHOLD) {
          // Double-click detected — start inline edit
          lastClickTime = 0;
          lastClickBlockId = null;
          e.preventDefault();
          this.startInlineEdit(clickedBlock, svg, core, renderer);
          return;
        }
        lastClickTime = now;
        lastClickBlockId = clickedBlock.id;

        // Block clicked — clear any connection selection
        this._selectedConnection = null;
        renderer.clearConnectionHighlights();

        if (e.ctrlKey || e.metaKey) {
          // Multi-select mode — toggle without clearing others
          features.toggleSelection(clickedBlock.id);
          // Do NOT call core.selectBlock() here — it clears multi-select
        } else {
          // Single select
          if (!features.selectedBlocks.has(clickedBlock.id)) {
            features.clearSelection();
            features.addToSelection(clickedBlock.id);
          }
          core.selectBlock(clickedBlock.id);
        }
        
        // Start drag — only when NOT in Ctrl+click multi-select
        if (!e.ctrlKey && !e.metaKey) {
          draggedBlock = clickedBlock;
          dragOffset = { x: x - clickedBlock.x, y: y - clickedBlock.y };
          dragMoved = false;
        }
        
        e.preventDefault();
      } else {
        // Empty space clicked — reset double-click tracking
        lastClickBlockId = null;

        // Clear connection selection
        this._selectedConnection = null;
        renderer.clearConnectionHighlights();

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
        // Drag block — if block is part of multi-selection, move ALL selected
        const gridPos = core.snapToGrid(x - dragOffset.x, y - dragOffset.y);

        // Smart alignment snapping (snap to edges/centers of other blocks)
        const movedIds = features.selectedBlocks.has(draggedBlock.id) && features.selectedBlocks.size > 1
          ? Array.from(features.selectedBlocks)
          : [draggedBlock.id];
        const excludeSet = new Set(movedIds);
        const snapResult = core.snapToAlignmentGuides(
          draggedBlock.id, gridPos.x, gridPos.y, excludeSet
        );
        const newPos = { x: snapResult.x, y: snapResult.y };

        // Show/clear alignment guide lines
        if (snapResult.guides.length > 0) {
          renderer.showSnapGuides(snapResult.guides);
        } else {
          renderer.clearSnapGuides();
        }

        const dx = newPos.x - draggedBlock.x;
        const dy = newPos.y - draggedBlock.y;

        if (dx !== 0 || dy !== 0) {
          dragMoved = true;
        }

        movedIds.forEach(bid => {
          const b = core.diagram.blocks.find(bl => bl.id === bid);
          if (b) {
            core.updateBlock(bid, { x: b.x + dx, y: b.y + dy });
            renderer.renderBlock(core.diagram.blocks.find(bl => bl.id === bid));
          }
        });

        // Update draggedBlock reference so next frame uses new position
        const updatedDragged = core.diagram.blocks.find(bl => bl.id === draggedBlock.id);
        if (updatedDragged) draggedBlock = updatedDragged;

        // Re-render connections attached to any moved block using batched
        // scheduling to avoid per-pixel re-renders during fast drags.
        const movedSet = new Set(movedIds);
        const affectedConns = [];
        core.diagram.connections.forEach(conn => {
          if (movedSet.has(conn.fromBlock) || movedSet.has(conn.toBlock)) {
            affectedConns.push(conn.id);
          }
        });
        if (affectedConns.length > 0 && renderer.scheduleConnectionRender) {
          renderer.scheduleConnectionRender(affectedConns);
        } else {
          // Fallback: immediate render
          core.diagram.connections.forEach(conn => {
            if (movedSet.has(conn.fromBlock) || movedSet.has(conn.toBlock)) {
              renderer.renderConnection(conn);
            }
          });
        }
      } else if (features.isLassoSelecting) {
        // Update lasso selection
        features.updateLassoSelection(x, y);
      } else if (e.buttons === 4) {
        // Middle-mouse-button pan (like Fusion 360 orbit/pan)
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
    
    // Mouse up - end drag or selection, AND complete connections
    svg.addEventListener('mouseup', (e) => {
      // Clear alignment snap guides on drag end
      renderer.clearSnapGuides();

      if (draggedBlock) {
        // End block drag — save state only if block actually moved
        if (dragMoved) {
          features.saveState();
          // Prevent the debounced auto-save (from monkey-patched
          // updateBlock) from pushing a duplicate undo state.
          this._dragSaveJustFired = true;
          setTimeout(() => { this._dragSaveJustFired = false; }, 350);
        }
        draggedBlock = null;
        dragOffset = { x: 0, y: 0 };
        dragMoved = false;
      } else if (features.isLassoSelecting) {
        // End lasso selection
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        features.finishLassoSelection(x, y);
      }

      // --- Connection mode: complete connection on mouseup ---
      // Fusion 360's Chromium may not synthesize a 'click' event
      // from mousedown+mouseup on SVG elements, so we handle the
      // connection target selection here as the primary path.
      // HOWEVER, skip if the connection mode was JUST started in this
      // same mousedown (port click) — otherwise the instant mouseup
      // would complete/exit the mode before the user can pick a target.
      if (this._connectionMode && this._connectionMode.active && !connectionStartedThisClick) {
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        // Use lenient hit detection (8px tolerance) for connection target —
        // users sometimes release just outside the block boundary.
        let targetBlock = core.getBlockAt(x, y);
        if (!targetBlock) targetBlock = core.getBlockAt(x, y, 8);

        if (targetBlock && targetBlock.id !== this._connectionMode.sourceBlock.id) {
          const connType = document.getElementById('connection-type-select');
          const type = connType ? connType.value : 'auto';
          const arrowDir = document.getElementById('arrow-direction-select');
          const direction = arrowDir ? arrowDir.value : 'forward';
          const sourceId = this._connectionMode.sourceBlock
            ? this._connectionMode.sourceBlock.id : null;
          const conn = core.addConnection(sourceId, targetBlock.id, type, direction);
          if (conn) {
            // Re-render ALL connections touching these blocks so fan
            // offsets recalculate correctly (not just the new one).
            core.diagram.connections.forEach(c => {
              if (c.fromBlock === sourceId || c.toBlock === sourceId ||
                  c.fromBlock === targetBlock.id || c.toBlock === targetBlock.id) {
                renderer.renderConnection(c);
              }
            });
            logger.info('Connection created:', conn.id,
              'from', this._connectionMode.sourceBlock.name || sourceId,
              'to', targetBlock.name || targetBlock.id);
            if (window.advancedFeatures) window.advancedFeatures.saveState();
          }
        }
        this.exitConnectionMode(svg);
        e.stopPropagation();
      }
      // Reset the flag so the NEXT mouseup can complete connections
      connectionStartedThisClick = false;
    });
    
    // Mouse wheel - zoom
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const { x: centerX, y: centerY } = screenToSVG(e.clientX, e.clientY);
      
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      core.zoomAt(zoomFactor, centerX, centerY);
    });

    // =========================================================================
    // DOUBLE-CLICK — inline rename block (native event as secondary path)
    // The manual detection in mousedown is the primary path; this fires
    // as a backup in browsers where native dblclick works on SVG.
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
    this._connectionModeEntryTime = 0;

    svg.addEventListener('mousemove', (e) => {
      if (!this._connectionMode.active || !this._connectionMode.tempLine) return;

      const { x, y } = screenToSVG(e.clientX, e.clientY);

      this._connectionMode.tempLine.setAttribute('x2', x);
      this._connectionMode.tempLine.setAttribute('y2', y);
    });

    // Keep the click handler as an additional path for connection completion.
    // In some Chromium versions the 'click' event fires after mouseup;
    // in others (Fusion CEF) it doesn't. The mouseup handler above is
    // the primary path. The addConnection() duplicate guard prevents
    // double-creation if both fire.
    svg.addEventListener('click', (e) => {
      if (!this._connectionMode.active) return;

      // If connection mode was JUST entered (e.g. port single-click),
      // the synthesized click event should NOT exit the mode.
      if (this._connectionModeEntryTime &&
          performance.now() - this._connectionModeEntryTime < 250) {
        return;
      }

      const { x, y } = screenToSVG(e.clientX, e.clientY);
      // Use lenient hit detection (8px tolerance) for connection target
      let targetBlock = core.getBlockAt(x, y);
      if (!targetBlock) targetBlock = core.getBlockAt(x, y, 8);

      if (targetBlock && targetBlock.id !== this._connectionMode.sourceBlock.id) {
        const connType = document.getElementById('connection-type-select');
        const type = connType ? connType.value : 'auto';
        const arrowDir = document.getElementById('arrow-direction-select');
        const direction = arrowDir ? arrowDir.value : 'forward';
        const sourceId = this._connectionMode.sourceBlock
          ? this._connectionMode.sourceBlock.id : null;
        const conn = core.addConnection(sourceId, targetBlock.id, type, direction);
        if (conn) {
          // Re-render ALL connections touching these blocks so fan
          // offsets recalculate correctly (not just the new one).
          core.diagram.connections.forEach(c => {
            if (c.fromBlock === sourceId || c.toBlock === sourceId ||
                c.fromBlock === targetBlock.id || c.toBlock === targetBlock.id) {
              renderer.renderConnection(c);
            }
          });
          logger.info('Connection created (via click):', conn.id);
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
    // Prevent opening multiple inline editors (both the manual double-click
    // detection in mousedown and the native dblclick handler can fire)
    if (svg.querySelector('foreignObject')) return;

    // Hide the original SVG text element so it doesn't overlap the input
    const blockGroup = svg.querySelector(`g[data-block-id="${block.id}"]`);
    const textEl = blockGroup ? blockGroup.querySelector('text') : null;
    if (textEl) textEl.style.display = 'none';

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
      } else {
        // Restore text visibility if no change
        if (textEl) textEl.style.display = '';
      }
      if (fo.parentNode) fo.remove();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') {
        if (textEl) textEl.style.display = '';
        if (fo.parentNode) fo.remove();
      }
      e.stopPropagation(); // prevent shortcuts from firing
    });

    input.addEventListener('blur', commit);
  }

  // =========================================================================
  // PROPERTY EDITOR DIALOG
  // =========================================================================
  openPropertyEditor(block, core, renderer) {
    // Remove any existing dialog
    const old = document.getElementById('property-editor-dialog');
    if (old) old.remove();

    const dialog = document.createElement('div');
    dialog.id = 'property-editor-dialog';
    dialog.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: var(--fusion-panel-bg, #2b2b2b); color: var(--fusion-text-primary, #fff);
      border: 2px solid var(--fusion-panel-border, #555); border-radius: 8px;
      padding: 20px; z-index: 100001; min-width: 360px; max-width: 480px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5); font-family: Arial, sans-serif;
    `;

    const labelStyle = 'display:block; margin: 10px 0 4px; font-size:12px; color:#aaa;';
    const inputStyle = `
      width: 100%; padding: 6px 8px; border: 1px solid #555; border-radius: 4px;
      background: #1e1e1e; color: #fff; font-size: 13px; box-sizing: border-box;
    `;
    const selectStyle = inputStyle;

    // Build attributes key-value rows
    const attrs = block.attributes || {};
    const attrKeys = Object.keys(attrs);

    dialog.innerHTML = `
      <div style="font-size:15px; font-weight:bold; margin-bottom:12px; border-bottom:1px solid #444; padding-bottom:8px;">
        Block Properties
      </div>
      <label style="${labelStyle}">Name</label>
      <input id="prop-name" style="${inputStyle}" value="${(block.name || '').replace(/"/g, '&quot;')}" />
      <label style="${labelStyle}">Type</label>
      <select id="prop-type" style="${selectStyle}">
        <option value="Generic"    ${block.type === 'Generic'    ? 'selected' : ''}>Generic</option>
        <option value="Electrical" ${block.type === 'Electrical' ? 'selected' : ''}>Electrical</option>
        <option value="Mechanical" ${block.type === 'Mechanical' ? 'selected' : ''}>Mechanical</option>
        <option value="Software"   ${block.type === 'Software'   ? 'selected' : ''}>Software</option>
      </select>
      <label style="${labelStyle}">Status</label>
      <select id="prop-status" style="${selectStyle}">
        <option value="Placeholder" ${block.status === 'Placeholder' ? 'selected' : ''}>Placeholder</option>
        <option value="In Progress" ${block.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
        <option value="Completed"   ${block.status === 'Completed'   ? 'selected' : ''}>Completed</option>
      </select>
      <label style="${labelStyle}">Shape</label>
      <select id="prop-shape" style="${selectStyle}">
        <option value="rectangle"     ${(block.shape || 'rectangle') === 'rectangle'     ? 'selected' : ''}>▭ Rectangle</option>
        <option value="rounded"       ${block.shape === 'rounded'       ? 'selected' : ''}>▢ Rounded</option>
        <option value="diamond"       ${block.shape === 'diamond'       ? 'selected' : ''}>◇ Diamond</option>
        <option value="circle"        ${block.shape === 'circle'        ? 'selected' : ''}>○ Ellipse</option>
        <option value="hexagon"       ${block.shape === 'hexagon'       ? 'selected' : ''}>⬡ Hexagon</option>
        <option value="parallelogram" ${block.shape === 'parallelogram' ? 'selected' : ''}>▱ Parallelogram</option>
        <option value="cylinder"      ${block.shape === 'cylinder'      ? 'selected' : ''}>⊙ Cylinder</option>
        <option value="triangle"      ${block.shape === 'triangle'      ? 'selected' : ''}>△ Triangle</option>
      </select>
      <label style="${labelStyle}">Attributes</label>
      <div id="prop-attrs" style="max-height:140px; overflow-y:auto;">
        ${attrKeys.map(k => `
          <div style="display:flex; gap:6px; margin-bottom:4px;" class="attr-row">
            <input class="attr-key" style="${inputStyle} width:40%;" value="${k.replace(/"/g, '&quot;')}" />
            <input class="attr-val" style="${inputStyle} width:55%;" value="${String(attrs[k]).replace(/"/g, '&quot;')}" />
            <button class="attr-del" style="background:#d32f2f; color:#fff; border:none; border-radius:4px; cursor:pointer; padding:0 8px;">✕</button>
          </div>
        `).join('')}
      </div>
      <button id="prop-add-attr" style="margin-top:4px; padding:4px 10px; font-size:12px;
        background:#333; color:#ccc; border:1px solid #555; border-radius:4px; cursor:pointer;">
        + Add Attribute
      </button>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button id="prop-cancel" style="padding:6px 16px; background:#444; color:#ccc;
          border:1px solid #555; border-radius:4px; cursor:pointer;">Cancel</button>
        <button id="prop-save" style="padding:6px 16px; background:#FF6B35; color:#fff;
          border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Save</button>
      </div>
    `;

    document.body.appendChild(dialog);

    // --- Wire events ---
    const cancel = () => dialog.remove();
    dialog.querySelector('#prop-cancel').addEventListener('click', cancel);

    // Delete attribute row buttons
    dialog.querySelectorAll('.attr-del').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.attr-row').remove());
    });

    // Add attribute row
    dialog.querySelector('#prop-add-attr').addEventListener('click', () => {
      const container = dialog.querySelector('#prop-attrs');
      const row = document.createElement('div');
      row.className = 'attr-row';
      row.style.cssText = 'display:flex; gap:6px; margin-bottom:4px;';
      row.innerHTML = `
        <input class="attr-key" style="${inputStyle} width:40%;" placeholder="key" />
        <input class="attr-val" style="${inputStyle} width:55%;" placeholder="value" />
        <button class="attr-del" style="background:#d32f2f; color:#fff; border:none; border-radius:4px; cursor:pointer; padding:0 8px;">✕</button>
      `;
      row.querySelector('.attr-del').addEventListener('click', () => row.remove());
      container.appendChild(row);
    });

    // Save
    dialog.querySelector('#prop-save').addEventListener('click', () => {
      const newAttrs = {};
      dialog.querySelectorAll('.attr-row').forEach(row => {
        const k = row.querySelector('.attr-key').value.trim();
        const v = row.querySelector('.attr-val').value.trim();
        if (k) newAttrs[k] = v;
      });

      core.updateBlock(block.id, {
        name: dialog.querySelector('#prop-name').value.trim() || block.name,
        type: dialog.querySelector('#prop-type').value,
        status: dialog.querySelector('#prop-status').value,
        shape: dialog.querySelector('#prop-shape').value,
        attributes: newAttrs
      });

      renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
      if (window.advancedFeatures) window.advancedFeatures.saveState();
      dialog.remove();
    });

    // Close on Escape
    const onKey = (e) => {
      if (e.key === 'Escape') { cancel(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
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

      this._ctxAction(freshMenu, 'ctx-properties', () => {
        this.hideContextMenu();
        this.openPropertyEditor(block, core, renderer);
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

      // Shape submenu
      freshMenu.querySelectorAll('[data-set-shape]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const newShape = item.getAttribute('data-set-shape');
          core.updateBlock(block.id, { shape: newShape });
          renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
          if (window.advancedFeatures) window.advancedFeatures.saveState();
          this.hideContextMenu();
        });
      });
    }

    // Canvas/empty-space actions
    this._ctxAction(freshMenu, 'ctx-add-block', () => {
      this.hideContextMenu();
      // Convert context-menu screen coordinates to SVG coordinates
      const svg = document.getElementById('svg-canvas');
      if (svg && window.toolbarManager) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const svgPt = pt.matrixTransform(ctm.inverse());
          window.toolbarManager.handleCreateBlockAtPosition(svgPt.x, svgPt.y);
        } else {
          window.toolbarManager.handleCreateBlock();
        }
      } else if (window.toolbarManager) {
        window.toolbarManager.handleCreateBlock();
      }
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
    this._connectionModeEntryTime = performance.now();

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
    
    // Update toolbar when diagram changes — also save undo state
    const originalAddBlock = core.addBlock.bind(core);
    core.addBlock = function(blockData) {
      const result = originalAddBlock(blockData);
      toolbar.updateButtonStates();
      // Save state for undo/redo after block creation
      if (window.advancedFeatures && !window.advancedFeatures.isPerformingUndoRedo) {
        window.advancedFeatures.saveState();
      }
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
    // IMPORTANT: only save if the redo stack is empty, otherwise the
    // debounced save fires after an undo and clears the redo stack.
    let saveTimer = null;
    const originalUpdateBlock = core.updateBlock.bind(core);
    core.updateBlock = function(blockId, updates) {
      const result = originalUpdateBlock(blockId, updates);
      if (result && !features.isPerformingUndoRedo) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          // Don't auto-save state right after an undo/redo — the restoreState
          // triggers updateBlock which would wipe the redo stack.
          // Also skip if a drag-end explicit save just fired (prevents
          // duplicate undo states for block moves).
          if (features.redoStack.length === 0 && !this._dragSaveJustFired) {
            features.saveState();
          }
        }, 250);
      }
      return result;
    };
  }

  // =========================================================================
  // SEARCH / FILTER BAR
  // =========================================================================
  setupSearchFilter(core, renderer) {
    const searchInput = document.getElementById('search-input');
    const filterAll = document.getElementById('filter-all');
    const filterPlaceholder = document.getElementById('filter-placeholder');
    const filterImplemented = document.getElementById('filter-implemented');

    if (!searchInput) return;

    // Current filter state
    let activeFilter = 'all'; // 'all' | 'placeholder' | 'implemented'

    const applyFilters = () => {
      const query = searchInput.value.trim().toLowerCase();
      const blocks = core.diagram ? core.diagram.blocks : [];
      const svg = document.getElementById('svg-canvas');
      if (!svg) return;

      blocks.forEach(block => {
        const group = svg.querySelector(`g[data-block-id="${block.id}"]`);
        if (!group) return;

        // Filter by status
        let statusMatch = true;
        if (activeFilter === 'placeholder') {
          statusMatch = (block.status || 'placeholder') === 'placeholder';
        } else if (activeFilter === 'implemented') {
          statusMatch = block.status === 'implemented';
        }

        // Filter by search text (match name, type, or status)
        let textMatch = true;
        if (query) {
          const name = (block.name || '').toLowerCase();
          const type = (block.type || '').toLowerCase();
          const status = (block.status || '').toLowerCase();
          textMatch = name.includes(query) || type.includes(query) || status.includes(query);
        }

        // Apply visibility
        const visible = statusMatch && textMatch;
        group.style.opacity = visible ? '1' : '0.15';
        group.style.pointerEvents = visible ? 'auto' : 'none';
      });
    };

    searchInput.addEventListener('input', applyFilters);

    // Filter button handlers
    const setActiveFilter = (filter, btn) => {
      activeFilter = filter;
      [filterAll, filterPlaceholder, filterImplemented].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (btn) btn.classList.add('active');
      applyFilters();
    };

    if (filterAll) filterAll.addEventListener('click', () => setActiveFilter('all', filterAll));
    if (filterPlaceholder) filterPlaceholder.addEventListener('click', () => setActiveFilter('placeholder', filterPlaceholder));
    if (filterImplemented) filterImplemented.addEventListener('click', () => setActiveFilter('implemented', filterImplemented));
  }

  // =========================================================================
  // IMPORT DIALOG
  // =========================================================================
  setupImportDialog(core, renderer, features) {
    const dialog = document.getElementById('import-dialog');
    const overlay = document.getElementById('dialog-overlay');
    const btnOk = document.getElementById('btn-import-ok');
    const btnCancel = document.getElementById('btn-import-cancel');
    const mermaidSection = document.getElementById('mermaid-import');
    const csvSection = document.getElementById('csv-import');
    if (!dialog || !btnOk) return;

    // Toggle import type sections
    document.querySelectorAll('input[name="import-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (mermaidSection) mermaidSection.style.display = radio.value === 'mermaid' ? '' : 'none';
        if (csvSection) csvSection.style.display = radio.value === 'csv' ? '' : 'none';
      });
    });

    const hideDialog = () => {
      if (dialog) dialog.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
    };

    if (btnCancel) btnCancel.addEventListener('click', hideDialog);
    if (overlay) overlay.addEventListener('click', hideDialog);

    btnOk.addEventListener('click', () => {
      const importType = document.querySelector('input[name="import-type"]:checked');
      const type = importType ? importType.value : 'mermaid';

      if (type === 'mermaid') {
        const text = (document.getElementById('mermaid-text')?.value || '').trim();
        if (!text) { this._toast('Please enter Mermaid flowchart text.', 'warning'); return; }
        this._importFromMermaid(text, core, renderer, features);
      } else {
        const blocksText = (document.getElementById('csv-blocks')?.value || '').trim();
        if (!blocksText) { this._toast('Please enter blocks CSV data.', 'warning'); return; }
        const connsText = (document.getElementById('csv-connections')?.value || '').trim();
        this._importFromCSV(blocksText, connsText, core, renderer, features);
      }

      hideDialog();
    });
  }

  /**
   * Parse a simple Mermaid flowchart and create blocks/connections.
   * Supports: A[Label], A --> B, A -->|label| B, A --- B
   */
  _importFromMermaid(text, core, renderer, features) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const nodeMap = new Map();   // id -> block
    const connections = [];
    let xPos = 100;
    let yPos = 100;

    // Regex for node definitions like A[Label] or A{Decision} or A(Rounded)
    const nodeDef = /([A-Za-z0-9_]+)\s*[\[({]([^}\])]*)[\])}]/g;
    // Regex for arrows: A -->|label| B  or  A --> B  or  A --- B
    const arrowPattern = /([A-Za-z0-9_]+)\s*(-->|---|\.-+>|==>)(\|[^|]*\|)?\s*([A-Za-z0-9_]+)/g;

    // First pass: extract all node definitions
    for (const line of lines) {
      let match;
      nodeDef.lastIndex = 0;
      while ((match = nodeDef.exec(line)) !== null) {
        const [, id, label] = match;
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { id, label: label || id });
        }
      }
    }

    // Second pass: extract connections (and implicitly defined nodes)
    for (const line of lines) {
      let match;
      arrowPattern.lastIndex = 0;
      while ((match = arrowPattern.exec(line)) !== null) {
        const [, fromId, , , toId] = match;
        if (!nodeMap.has(fromId)) nodeMap.set(fromId, { id: fromId, label: fromId });
        if (!nodeMap.has(toId)) nodeMap.set(toId, { id: toId, label: toId });
        connections.push({ from: fromId, to: toId });
      }
    }

    // Create blocks
    const blockIdMap = new Map();  // mermaid id -> real block id
    for (const [mermaidId, node] of nodeMap) {
      const block = core.addBlock({
        name: node.label,
        type: 'Generic',
        x: xPos,
        y: yPos,
        status: 'placeholder'
      });
      if (block) {
        renderer.renderBlock(block);
        blockIdMap.set(mermaidId, block.id);
      }
      xPos += 160;
      if (xPos > 700) { xPos = 100; yPos += 120; }
    }

    // Create connections
    for (const conn of connections) {
      const fromId = blockIdMap.get(conn.from);
      const toId = blockIdMap.get(conn.to);
      if (fromId && toId) {
        const c = core.addConnection(fromId, toId, 'electrical');
        if (c) renderer.renderConnection(c);
      }
    }

    if (features) features.saveState();
    this._toast(`Imported ${nodeMap.size} blocks and ${connections.length} connections`, 'success');
  }

  /**
   * Parse CSV data and create blocks/connections.
   */
  _importFromCSV(blocksText, connsText, core, renderer, features) {
    const blockLines = blocksText.split('\n').map(l => l.trim()).filter(l => l);
    const nameToId = new Map();
    let imported = 0;

    for (const line of blockLines) {
      // Skip header
      if (line.toLowerCase().startsWith('name,')) continue;
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 1) continue;
      const [name, type, xStr, yStr, status] = parts;
      const block = core.addBlock({
        name: name || 'Block',
        type: type || 'Generic',
        x: parseFloat(xStr) || 100 + imported * 160,
        y: parseFloat(yStr) || 100,
        status: (status || 'placeholder').toLowerCase()
      });
      if (block) {
        renderer.renderBlock(block);
        nameToId.set(name, block.id);
        imported++;
      }
    }

    let connCount = 0;
    if (connsText) {
      const connLines = connsText.split('\n').map(l => l.trim()).filter(l => l);
      for (const line of connLines) {
        if (line.toLowerCase().startsWith('from,')) continue;
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 2) continue;
        const [from, to, kind] = parts;
        const fromId = nameToId.get(from);
        const toId = nameToId.get(to);
        if (fromId && toId) {
          const c = core.addConnection(fromId, toId, kind || 'electrical');
          if (c) { renderer.renderConnection(c); connCount++; }
        }
      }
    }

    if (features) features.saveState();
    this._toast(`Imported ${imported} blocks and ${connCount} connections`, 'success');
  }

  _toast(message, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      logger.info(`[Toast] ${type}: ${message}`);
    }
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

    // Warn before closing palette with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      const editor = window.diagramEditor;
      if (editor && typeof editor.hasUnsavedChanges === 'function' && editor.hasUnsavedChanges()) {
        e.preventDefault();
        // Standard: some browsers require returnValue to be set
        e.returnValue = 'You have unsaved changes. Are you sure you want to close?';
        return e.returnValue;
      }
      // Normal close — clear recovery backup
      this._clearRecoveryBackup();
    });

    // Start periodic crash-recovery backup (every 30 s)
    this._startRecoveryBackup();

    // Check for leftover recovery backup from a crashed session
    this._checkRecoveryBackup();

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

  // ---------------------------------------------------------------
  // Crash Recovery via localStorage auto-backup
  // ---------------------------------------------------------------

  /** Key used in localStorage for the recovery backup. */
  static get RECOVERY_KEY() { return 'fsb_recovery_backup'; }

  /**
   * Start a periodic timer that serializes the diagram to localStorage
   * every 30 seconds, but only when there are unsaved changes.
   */
  _startRecoveryBackup() {
    this._recoveryTimer = setInterval(() => {
      try {
        const editor = window.diagramEditor;
        if (!editor || typeof editor.hasUnsavedChanges !== 'function') return;
        if (!editor.hasUnsavedChanges()) return;

        const json = editor.exportDiagram();
        if (!json) return;

        const payload = JSON.stringify({
          diagram: json,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem(SystemBlocksMain.RECOVERY_KEY, payload);
        logger.debug('Recovery backup saved to localStorage');
      } catch (err) {
        // localStorage may be full or unavailable — ignore silently
        logger.warn('Recovery backup failed:', err);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Check for a recovery backup on startup. If one exists, show the
   * recovery prompt so the user can choose to restore or discard.
   */
  _checkRecoveryBackup() {
    try {
      const raw = localStorage.getItem(SystemBlocksMain.RECOVERY_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (!data || !data.diagram) {
        localStorage.removeItem(SystemBlocksMain.RECOVERY_KEY);
        return;
      }

      // Populate timestamp in the modal
      const tsEl = document.getElementById('recovery-timestamp');
      if (tsEl && data.timestamp) {
        var d = new Date(data.timestamp);
        tsEl.textContent = 'Backup saved at: ' + d.toLocaleString();
      }

      const overlay = document.getElementById('recovery-overlay');
      if (!overlay) {
        logger.warn('Recovery overlay element not found');
        return;
      }

      overlay.style.display = 'flex';

      // Wire Recover button
      var restoreBtn = document.getElementById('recovery-restore');
      if (restoreBtn) {
        restoreBtn.onclick = () => {
          overlay.style.display = 'none';
          try {
            var editor = window.diagramEditor;
            if (editor && typeof editor.importDiagram === 'function') {
              editor.importDiagram(data.diagram);
              var renderer = window.diagramRenderer;
              if (renderer && typeof renderer.renderAll === 'function') {
                renderer.renderAll();
              }
              if (window.pythonInterface) {
                window.pythonInterface.showNotification('Diagram recovered from backup', 'success');
              }
            }
          } catch (err) {
            logger.error('Recovery restore failed:', err);
            if (window.pythonInterface) {
              window.pythonInterface.showNotification('Recovery failed: ' + err.message, 'error');
            }
          }
          localStorage.removeItem(SystemBlocksMain.RECOVERY_KEY);
        };
      }

      // Wire Discard button
      var discardBtn = document.getElementById('recovery-discard');
      if (discardBtn) {
        discardBtn.onclick = () => {
          overlay.style.display = 'none';
          localStorage.removeItem(SystemBlocksMain.RECOVERY_KEY);
          logger.info('Recovery backup discarded by user');
        };
      }

    } catch (err) {
      logger.warn('Recovery check failed:', err);
      localStorage.removeItem(SystemBlocksMain.RECOVERY_KEY);
    }
  }

  /**
   * Remove the recovery backup from localStorage.
   * Called after a successful save or a normal palette close.
   */
  _clearRecoveryBackup() {
    try {
      localStorage.removeItem(SystemBlocksMain.RECOVERY_KEY);
    } catch (_) {
      // Ignore
    }
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