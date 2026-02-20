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

function _escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

    // Initialize minimap (overview navigator)
    if (typeof Minimap !== 'undefined') {
      logger.debug('Initializing minimap...');
      const minimapInst = new Minimap(this.modules.get('core'));
      this.modules.set('minimap', minimapInst);
      window.minimapInstance = minimapInst;
    }

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

    // Wire ribbon connection-type and arrow-direction dropdowns so that
    // changing them while a connection is selected updates it in-place.
    this.setupConnectionControlSync(core, renderer);
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
    // Track the screen coordinates where connection mode was started,
    // so we can detect drag-to-connect gestures (significant movement
    // between mousedown and mouseup).
    let connectionStartPos = { x: 0, y: 0 };

    // --- Manual double-click detection state ---
    // Fusion's CEF may not reliably fire 'dblclick' on SVG elements,
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
    // (which can happen in Fusion's Chromium with opacity-0 SVG elements).
    const findPortAt = (svgX, svgY) => {
      const PORT_HIT_RADIUS = 10; // slightly larger than visual r=6
      let bestHit = null;
      let bestDist = Infinity;
      for (let i = core.diagram.blocks.length - 1; i >= 0; i--) {
        const block = core.diagram.blocks[i];
        const w = block.width || 120;
        const h = block.height || 80;
        // All four ports
        const ports = [
          { x: block.x + w,     y: block.y + h / 2, type: 'output' },
          { x: block.x,         y: block.y + h / 2, type: 'input' },
          { x: block.x + w / 2, y: block.y,         type: 'top' },
          { x: block.x + w / 2, y: block.y + h,     type: 'bottom' },
        ];
        for (const p of ports) {
          const dist = Math.hypot(svgX - p.x, svgY - p.y);
          if (dist <= PORT_HIT_RADIUS && dist < bestDist) {
            bestDist = dist;
            bestHit = { block, portType: p.type };
          }
        }
      }
      return bestHit;
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
      // Do not start drag/select while in stub-target-pick mode
      if (this._stubTargetMode && this._stubTargetMode.active) return;

      // Dimension pick mode — capture block clicks
      if (this._dimensionMode && this._dimensionMode.active) return;

      const { x, y } = screenToSVG(e.clientX, e.clientY);

      // --- Port click: start connection mode from that block ---
      // Primary: DOM-based detection via closest()
      let portEl = e.target.closest
        ? e.target.closest('.connection-port')
        : null;

      // Fallback: check getAttribute('class') directly — closest() may not
      // work correctly on SVG elements in Fusion's Chromium
      if (!portEl && e.target.getAttribute &&
          e.target.getAttribute('class') &&
          e.target.getAttribute('class').indexOf('connection-port') !== -1) {
        portEl = e.target;
      }

      if (portEl && portEl.getAttribute('data-block-id')) {
        const blockId = portEl.getAttribute('data-block-id');
        const portType = portEl.getAttribute('data-port-type') || 'output';
        const block = core.diagram.blocks.find(b => b.id === blockId);
        if (block) {
          e.preventDefault();
          e.stopPropagation();
          connectionStartedThisClick = true;
          connectionStartPos = { x: e.clientX, y: e.clientY };
          this.enterConnectionMode(block, core, renderer, portType);
          return;
        }
      }

      // Second fallback: coordinate-based port detection
      const portHit = findPortAt(x, y);
      if (portHit) {
        e.preventDefault();
        e.stopPropagation();
        connectionStartedThisClick = true;
        connectionStartPos = { x: e.clientX, y: e.clientY };
        this.enterConnectionMode(portHit.block, core, renderer, portHit.portType);
        return;
      }

      // --- Group boundary click: start connection mode from group ---
      // Only fire when clicking the boundary rect itself, not blocks inside.
      const groupEl = e.target.closest
        ? e.target.closest('[data-group-id]')
        : null;
      if (groupEl && !core.getBlockAt(x, y) && window.advancedFeatures) {
        const groupId = groupEl.getAttribute('data-group-id');
        const group = window.advancedFeatures.groups.get(groupId);
        if (group && group.bounds) {
          // Treat group as a pseudo-block for connection mode
          const pseudoBlock = {
            id: group.id,
            name: group.name,
            x: group.bounds.x,
            y: group.bounds.y,
            width: group.bounds.width,
            height: group.bounds.height
          };
          e.preventDefault();
          e.stopPropagation();
          connectionStartedThisClick = true;
          connectionStartPos = { x: e.clientX, y: e.clientY };
          this.enterConnectionMode(pseudoBlock, core, renderer, 'output');
          return;
        }
      }

      // --- Connection click: select / highlight a connection ---
      const connEl = e.target.closest
        ? e.target.closest('[data-connection-id]')
        : null;
      if (connEl && !core.getBlockAt(x, y)) {
        const connId = connEl.getAttribute('data-connection-id');
        this._selectedConnection = connId;
        this._selectedStub = null;
        renderer.clearConnectionHighlights();
        renderer.highlightConnection(connId, true);
        // Sync ribbon dropdowns with connection properties
        const conn = core.diagram.connections.find(c => c.id === connId);
        if (conn) {
          const typeSelect = document.getElementById('connection-type-select');
          const connType = (conn.type || '').toLowerCase();
          if (typeSelect && connType && connType !== 'auto') typeSelect.value = connType;
          const dirSelect = document.getElementById('arrow-direction-select');
          if (dirSelect) dirSelect.value = (conn.arrowDirection || 'forward').toLowerCase();
        }
        features.clearSelection();
        core.clearSelection();
        this.hidePropertiesPanel();
        e.preventDefault();
        return;
      }

      // --- Named stub click: select / highlight a named stub ---
      const stubEl = e.target.closest
        ? e.target.closest('[data-stub-id]')
        : null;
      if (stubEl && !core.getBlockAt(x, y)) {
        const stubId = stubEl.getAttribute('data-stub-id');
        this._selectedStub = stubId;
        this._selectedConnection = null;
        renderer.clearConnectionHighlights();
        renderer.highlightNamedStub(stubId, true);
        // Sync ribbon dropdowns with stub properties
        const stub = (core.diagram.namedStubs || []).find(s => s.id === stubId);
        if (stub) {
          const typeSelect = document.getElementById('connection-type-select');
          const stubType = (stub.type || '').toLowerCase();
          if (typeSelect && stubType && stubType !== 'auto') typeSelect.value = stubType;
          const dirSelect = document.getElementById('arrow-direction-select');
          if (dirSelect) dirSelect.value = (stub.direction || 'forward').toLowerCase();
        }
        features.clearSelection();
        core.clearSelection();
        this.hidePropertiesPanel();
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

        // Block clicked — clear any connection/stub selection
        this._selectedConnection = null;
        this._selectedStub = null;
        renderer.clearConnectionHighlights();

        if (e.ctrlKey || e.metaKey) {
          // Multi-select mode — toggle without clearing others
          features.toggleSelection(clickedBlock.id);
          // Do NOT call core.selectBlock() here — it clears multi-select
          this.hidePropertiesPanel();
        } else {
          // Single select
          if (!features.selectedBlocks.has(clickedBlock.id)) {
            features.clearSelection();
            features.addToSelection(clickedBlock.id);
          }
          core.selectBlock(clickedBlock.id);
          this.updatePropertiesPanel(clickedBlock, core, renderer);
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

        // Clear connection and stub selection
        this._selectedConnection = null;
        this._selectedStub = null;
        renderer.clearConnectionHighlights();

        if (!e.ctrlKey && !e.metaKey) {
          features.clearSelection();
          core.clearSelection();
          this.hidePropertiesPanel();
          // Dismiss the group-offer bar when clicking off blocks
          const groupBar = document.getElementById('lasso-group-bar');
          if (groupBar) groupBar.remove();
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
      // Track last known SVG-space mouse position for keyboard-triggered
      // actions (e.g. B-key block creation at cursor location).
      this._lastMouseSVG = { x, y };
      
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
        // In orthogonal mode, re-render ALL connections because any moved
        // block may now be an obstacle for unrelated connections.
        const movedSet = new Set(movedIds);
        const affectedConns = [];
        const rerouteAll = renderer.routingMode === 'orthogonal';
        core.diagram.connections.forEach(conn => {
          if (rerouteAll || movedSet.has(conn.fromBlock) || movedSet.has(conn.toBlock)) {
            affectedConns.push(conn.id);
          }
        });
        if (affectedConns.length > 0 && renderer.scheduleConnectionRender) {
          renderer.scheduleConnectionRender(affectedConns);
        } else {
          // Fallback: immediate render
          core.diagram.connections.forEach(conn => {
            if (rerouteAll || movedSet.has(conn.fromBlock) || movedSet.has(conn.toBlock)) {
              renderer.renderConnection(conn);
            }
          });
        }

        // Update group boundaries so the dashed rectangle follows its blocks
        if (features.updateGroupBoundaries) {
          features.updateGroupBoundaries();
        }

        // Re-render dimension annotations that reference any moved block
        // so the measurement line follows block positions.
        if (core.diagram.annotations && renderer.renderAnnotation) {
          core.diagram.annotations.forEach(ann => {
            if (ann.type === 'dimension' &&
                (movedSet.has(ann.refBlockA) || movedSet.has(ann.refBlockB))) {
              renderer.renderAnnotation(ann);
            }
          });
        }

        // Re-render all stub types so they follow the moved block(s).
        if (renderer.renderNamedStubs) {
          renderer.renderNamedStubs(core.diagram);
        }
        if (renderer.renderSameLevelStubs) {
          renderer.renderSameLevelStubs(core.diagram);
        }
        if (renderer.renderCrossDiagramStubs) {
          renderer.renderCrossDiagramStubs(core.diagram);
        }

        // Move the inline rename foreignObject so it follows the dragged
        // block instead of staying at its original creation position.
        movedIds.forEach(bid => {
          const fo = svg.querySelector(`foreignObject[data-inline-edit-block="${bid}"]`);
          if (fo) {
            const b = core.diagram.blocks.find(bl => bl.id === bid);
            if (b) {
              const bw = b.width || 120;
              const bh = b.height || 80;
              fo.setAttribute('x', b.x + 4);
              fo.setAttribute('y', b.y + bh / 2 - 14);
              fo.setAttribute('width', bw - 8);
            }
          }
        });
      } else if (features.isLassoSelecting) {
        // Update lasso selection
        features.updateLassoSelection(x, y);
      } else if (e.buttons === 4) {
        // Middle-mouse-button pan (like Fusion orbit/pan)
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
        this._updateMinimap();
        
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
          this._updateMinimap();
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
        const selected = features.finishLassoSelection(x, y);
        // Offer to group the selected blocks if ≥2 were lasso-selected
        if (selected && selected.length >= 2) {
          this._offerGroupFromLasso(selected, features);
        }
      }

      // --- Connection mode: complete connection on mouseup ---
      // Fusion's Chromium may not synthesize a 'click' event
      // from mousedown+mouseup on SVG elements, so we handle the
      // connection target selection here as the primary path.
      // HOWEVER, skip if the connection mode was JUST started in this
      // same mousedown (port click) — UNLESS the user dragged a
      // significant distance, indicating a drag-to-connect or
      // drag-to-stub gesture.
      const dragDist = Math.hypot(
        e.clientX - connectionStartPos.x,
        e.clientY - connectionStartPos.y
      );
      const isDragGesture = connectionStartedThisClick && dragDist > 20;
      if (this._connectionMode && this._connectionMode.active &&
          (!connectionStartedThisClick || isDragGesture)) {
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        // Use lenient hit detection (8px tolerance) for connection target —
        // users sometimes release just outside the block boundary.
        let targetBlock = core.getBlockAt(x, y);
        if (!targetBlock) targetBlock = core.getBlockAt(x, y, 8);

        // NOTE: group-boundary connections removed from drag-drop path.
        // Dropping on empty space inside a group should offer stub creation,
        // same as empty space elsewhere.  Group connections can still be
        // created via the context menu.
        const targetGroup = null;

        const sourceId = this._connectionMode.sourceBlock
          ? this._connectionMode.sourceBlock.id : null;

        if (targetBlock && targetBlock.id !== sourceId) {
          const connType = document.getElementById('connection-type-select');
          const type = connType ? connType.value : 'auto';
          const arrowDir = document.getElementById('arrow-direction-select');
          const direction = arrowDir ? arrowDir.value : 'forward';

          // Determine which port the connection originates from and
          // find the closest target port for the drop position.
          const sourcePort = this._connectionMode.sourcePort || 'output';
          const tw = targetBlock.width || 120;
          const th = targetBlock.height || 80;
          const targetPorts = [
            { x: targetBlock.x,          y: targetBlock.y + th / 2, type: 'input' },
            { x: targetBlock.x + tw,     y: targetBlock.y + th / 2, type: 'output' },
            { x: targetBlock.x + tw / 2, y: targetBlock.y,          type: 'top' },
            { x: targetBlock.x + tw / 2, y: targetBlock.y + th,     type: 'bottom' },
          ];
          let bestPort = 'input';
          let bestDist = Infinity;
          for (const p of targetPorts) {
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < bestDist) { bestDist = d; bestPort = p.type; }
          }

          // Normalize so Forward/Backward always means left-to-right.
          // When the user starts from an input (left) port, the drawing
          // direction is right-to-left. Swap from/to so the data model
          // stores the connection in left-to-right order and the arrow
          // direction label stays intuitive.
          let fromId = sourceId;
          let toId = targetBlock.id;
          let fromPort = sourcePort;
          let toPort = bestPort;
          if (sourcePort === 'input') {
            fromId = targetBlock.id;
            toId = sourceId;
            fromPort = bestPort;
            toPort = sourcePort;
          }

          const conn = core.addConnection(fromId, toId, type, direction);
          if (conn) {
            // Store port sides on the connection for rendering
            conn.fromPort = fromPort;
            conn.toPort = toPort;

            // Invalidate the fan map so the new connection is included
            // in the offset calculation.
            renderer._cachedFanMap = null;
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
              '(' + sourcePort + ')',
              'to', targetBlock.name || targetBlock.id,
              '(' + bestPort + ')');
            if (window.advancedFeatures) window.advancedFeatures.saveState();
          }
          this.exitConnectionMode(svg);
        } else if (targetGroup && targetGroup.id !== sourceId) {
          // --- Dropped on a group boundary → group-level connection ---
          const connType = document.getElementById('connection-type-select');
          const type = connType ? connType.value : 'auto';
          const arrowDir = document.getElementById('arrow-direction-select');
          const direction = arrowDir ? arrowDir.value : 'forward';
          const sourcePort = this._connectionMode.sourcePort || 'output';

          // Use closest port on group boundary
          const gb = targetGroup.bounds;
          const gPorts = [
            { x: gb.x,              y: gb.y + gb.height / 2, type: 'input' },
            { x: gb.x + gb.width,   y: gb.y + gb.height / 2, type: 'output' },
            { x: gb.x + gb.width / 2, y: gb.y,                type: 'top' },
            { x: gb.x + gb.width / 2, y: gb.y + gb.height,    type: 'bottom' },
          ];
          let bestPort = 'input';
          let bestDist = Infinity;
          for (const p of gPorts) {
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < bestDist) { bestDist = d; bestPort = p.type; }
          }

          // Normalize so Forward/Backward always means left-to-right.
          let gFromId = sourceId;
          let gToId = targetGroup.id;
          let gFromPort = sourcePort;
          let gToPort = bestPort;
          if (sourcePort === 'input') {
            gFromId = targetGroup.id;
            gToId = sourceId;
            gFromPort = bestPort;
            gToPort = sourcePort;
          }

          const conn = core.addConnection(gFromId, gToId, type, direction);
          if (conn) {
            conn.fromPort = gFromPort;
            conn.toPort = gToPort;
            renderer._cachedFanMap = null;
            renderer.renderConnection(conn);
            logger.info('Group connection created:', conn.id,
              'from', this._connectionMode.sourceBlock.name || sourceId,
              'to group', targetGroup.name || targetGroup.id);
            if (window.advancedFeatures) window.advancedFeatures.saveState();
          }
          this.exitConnectionMode(svg);
        } else if (!targetBlock && !targetGroup) {
          // --- Dropped on empty canvas: offer stub creation ---
          this._offerStubCreation(svg, core, renderer, features);
        } else {
          // Dropped on the same source block — just cancel
          this.exitConnectionMode(svg);
        }
        e.stopPropagation();
      }

      // --- Stub-target-pick mode: complete stub on block click ---
      if (this._stubTargetMode && this._stubTargetMode.active) {
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        let hitBlock = core.getBlockAt(x, y);
        if (!hitBlock) hitBlock = core.getBlockAt(x, y, 8);

        if (hitBlock && hitBlock.id !== this._stubTargetMode.sourceBlock.id) {
          this._completeStubConnection(hitBlock, core, renderer, features);
        } else if (!hitBlock) {
          // Clicked empty space again — cancel stub-target-pick
          this._toast('Stub connection cancelled', 'info');
          this.exitStubTargetMode(svg);
        }
        // Record exit time so the immediately-following click event
        // doesn't re-enter stub handling.
        this._stubExitTime = performance.now();
        e.stopPropagation();
      }

      // --- Dimension pick mode: pick blocks on mouseup ---
      if (this._dimensionMode && this._dimensionMode.active) {
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        let hitBlock = core.getBlockAt(x, y);
        if (!hitBlock) hitBlock = core.getBlockAt(x, y, 8);

        if (hitBlock) {
          if (!this._dimensionMode.firstBlock) {
            // First block picked
            this._dimensionMode.firstBlock = hitBlock;
            renderer.highlightBlock(hitBlock.id, true);
            this._toast('Now click the second block for the dimension', 'info');

            // Create temp dashed line from first block center
            const w1 = hitBlock.width || 120;
            const h1 = hitBlock.height || 80;
            const cx = hitBlock.x + w1 / 2;
            const cy = hitBlock.y + h1 / 2;
            const tmpLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tmpLine.setAttribute('x1', cx);
            tmpLine.setAttribute('y1', cy);
            tmpLine.setAttribute('x2', cx);
            tmpLine.setAttribute('y2', cy);
            tmpLine.setAttribute('stroke', '#FF6B35');
            tmpLine.setAttribute('stroke-width', '1.5');
            tmpLine.setAttribute('stroke-dasharray', '4,3');
            tmpLine.setAttribute('pointer-events', 'none');
            svg.appendChild(tmpLine);
            this._dimensionMode.tempLine = tmpLine;
          } else if (hitBlock.id !== this._dimensionMode.firstBlock.id) {
            // Second block picked — create the dimension
            const firstId = this._dimensionMode.firstBlock.id;
            const secondId = hitBlock.id;
            const label = prompt('Dimension label (leave blank for auto):', '');
            if (window.toolbarManager) {
              window.toolbarManager._addAnnotation('dimension', label || '', {
                refBlockA: firstId,
                refBlockB: secondId,
              });
            }
            this.exitDimensionMode(svg);
          }
          e.stopPropagation();
        }
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
      this._updateMinimap();
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

      if (block) {
        this.showContextMenu(e.clientX, e.clientY, block, core, renderer, features);
      } else {
        // Check if right-clicked on a named stub (net label)
        const namedStubGroup = e.target.closest('.named-stub[data-stub-id]');
        if (namedStubGroup) {
          const stubId = namedStubGroup.getAttribute('data-stub-id');
          const netName = namedStubGroup.getAttribute('data-net-name');
          this._showNamedStubContextMenu(e.clientX, e.clientY, stubId, netName, core, renderer, features);
          return;
        }
        // Check if right-clicked on a connection (via SVG DOM hit path)
        const connGroup = e.target.closest('[data-connection-id]');
        if (connGroup) {
          const connectionId = connGroup.getAttribute('data-connection-id');
          // Search current diagram first, then cross-diagram
          let connection = core.diagram.connections.find(c => c.id === connectionId);
          let homeDiagram = null;
          if (!connection) {
            const match = this._findCrossDiagramConnection(connectionId, core);
            if (match) {
              connection = match.connection;
              homeDiagram = match.diagram;
            }
          }
          if (connection) {
            this.showConnectionContextMenu(e.clientX, e.clientY, connection, core, renderer, features, homeDiagram);
            return;
          }
        }
        this.showContextMenu(e.clientX, e.clientY, null, core, renderer, features);
      }
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
        const connMenu = document.getElementById('connection-context-menu');
        if (!connMenu || !connMenu.contains(e.target)) {
          this.hideConnectionContextMenu();
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

    // =========================================================================
    // STUB-TARGET-PICK MODE — after dropping on empty canvas, user picks
    // the target block to create a same-level stub connection.
    // =========================================================================
    this._stubTargetMode = {
      active: false,
      sourceBlock: null,
      sourcePort: null
    };
    this._stubExitTime = 0;

    // =========================================================================
    // DIMENSION PICK MODE — click first block, then second block
    // =========================================================================
    this._dimensionMode = {
      active: false,
      firstBlock: null,
      tempLine: null
    };

    svg.addEventListener('mousemove', (e) => {
      if (this._connectionMode.active && this._connectionMode.tempLine) {
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        this._connectionMode.tempLine.setAttribute('x2', x);
        this._connectionMode.tempLine.setAttribute('y2', y);
      }
      // Update dimension pick temp line
      if (this._dimensionMode.active && this._dimensionMode.tempLine) {
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        this._dimensionMode.tempLine.setAttribute('x2', x);
        this._dimensionMode.tempLine.setAttribute('y2', y);
      }
    });

    // Keep the click handler as an additional path for connection completion.
    // In some Chromium versions the 'click' event fires after mouseup;
    // in others (Fusion CEF) it doesn't. The mouseup handler above is
    // the primary path. The addConnection() duplicate guard prevents
    // double-creation if both fire.
    svg.addEventListener('click', (e) => {
      // --- Stub-target-pick mode (click path) ---
      if (this._stubTargetMode && this._stubTargetMode.active) {
        // Skip if the mouseup handler already handled this interaction.
        if (this._stubExitTime && performance.now() - this._stubExitTime < 300) {
          e.stopPropagation();
          return;
        }
        const { x, y } = screenToSVG(e.clientX, e.clientY);
        let hitBlock = core.getBlockAt(x, y);
        if (!hitBlock) hitBlock = core.getBlockAt(x, y, 8);
        if (hitBlock && hitBlock.id !== this._stubTargetMode.sourceBlock.id) {
          this._completeStubConnection(hitBlock, core, renderer, features);
        } else if (!hitBlock) {
          this._toast('Stub connection cancelled', 'info');
          this.exitStubTargetMode(svg);
        }
        e.stopPropagation();
        return;
      }

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
          // Invalidate the fan map so the new connection is included
          // in the offset calculation.
          renderer._cachedFanMap = null;
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
        this.exitConnectionMode(svg);
      } else if (!targetBlock) {
        // Dropped on empty canvas — offer stub creation (click path)
        this._offerStubCreation(svg, core, renderer, features);
      } else {
        this.exitConnectionMode(svg);
      }
      e.stopPropagation();
    });

    // Escape to cancel connection mode, stub-target-pick, or dimension mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._stubTargetMode.active) {
        this._toast('Stub connection cancelled', 'info');
        this.exitStubTargetMode(svg);
        return;
      }
      if (e.key === 'Escape' && this._connectionMode.active) {
        this.exitConnectionMode(svg);
      }
      if (e.key === 'Escape' && this._dimensionMode.active) {
        this.exitDimensionMode(svg);
      }
      // Escape closes open modal dialogs
      if (e.key === 'Escape') {
        const importDialog = document.getElementById('import-dialog');
        const overlay = document.getElementById('dialog-overlay');
        if (importDialog && importDialog.style.display !== 'none') {
          importDialog.style.display = 'none';
          if (overlay) overlay.style.display = 'none';
          e.preventDefault();
          return;
        }
        const historyPanel = document.getElementById('history-panel');
        if (historyPanel && historyPanel.classList.contains('show')) {
          historyPanel.classList.remove('show');
          e.preventDefault();
        }
      }

      // --- Keyboard shortcuts (skip when focused in an input/textarea) ---
      // NOTE: Most shortcuts are handled by ToolbarManager.setupKeyboardShortcuts().
      // Only shortcuts that need access to coordinator-local state live here.
      // Do NOT duplicate shortcuts that ToolbarManager already handles
      // (Ctrl+Z, Ctrl+Y, Delete, Ctrl+D, Ctrl+A, B, etc.) — both handlers
      // fire on the same keydown event, causing double-execution.
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      // Ctrl+G — group selected blocks (unique to coordinator)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'g') {
        const sel = features.selectedBlocks;
        if (sel && sel.size >= 2) {
          e.preventDefault();
          const blockIds = Array.from(sel);
          const name = prompt('Group name:', 'Group');
          if (name !== null) {
            features.createGroup(blockIds, name || 'Group');
            this._toast('Created group "' + (name || 'Group') + '"', 'success');
          }
        }
        return;
      }
    });
  }

  /**
   * Show a keyboard-driven quick-pick overlay for block creation.
   * Press B to open, then G/E/M/S to pick category and create block.
   * @private
   */
  _showQuickBlockMenu(core, renderer, features, svg) {
    // Remove any existing menu
    const existing = document.getElementById('quick-block-menu');
    if (existing) existing.remove();

    const categories = [
      { key: 'G', name: 'Generic',    icon: '\u2B1C' },
      { key: 'E', name: 'Electrical', icon: '\u26A1' },
      { key: 'M', name: 'Mechanical', icon: '\u2699\uFE0F' },
      { key: 'S', name: 'Software',   icon: '\uD83D\uDCBB' }
    ];

    const menu = document.createElement('div');
    menu.id = 'quick-block-menu';
    menu.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: var(--fusion-panel-bg, #2b2b2b);
      border: 2px solid var(--fusion-accent, #FF6B35);
      border-radius: 3px; padding: 16px 20px; z-index: 100001;
      min-width: 220px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      color: var(--fusion-text-primary, #fff); font-family: Arial, sans-serif;
    `;

    const title = document.createElement('div');
    title.textContent = 'New Block';
    title.style.cssText = 'font-size: 14px; font-weight: bold; margin-bottom: 10px; text-align: center; color: #FF6B35;';
    menu.appendChild(title);

    let focusIdx = 0;
    const items = [];

    categories.forEach((cat, idx) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 14px; cursor: pointer; font-size: 13px;
        border-radius: 4px; display: flex; align-items: center; gap: 8px;
      `;
      item.innerHTML = `
        <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;
          background:var(--fusion-accent,#FF6B35);color:#fff;border-radius:4px;font-size:11px;font-weight:bold;">
          ${cat.key}
        </span>
        <span>${cat.icon}  ${cat.name}</span>
      `;
      item.addEventListener('mouseenter', () => {
        focusIdx = idx;
        highlightItem();
      });
      item.addEventListener('click', () => pickCategory(cat));
      menu.appendChild(item);
      items.push(item);
    });

    const hint = document.createElement('div');
    hint.textContent = 'Press letter key or click • Esc to cancel';
    hint.style.cssText = 'font-size: 10px; color: #777; text-align: center; margin-top: 10px;';
    menu.appendChild(hint);

    document.body.appendChild(menu);

    const highlightItem = () => {
      items.forEach((el, i) => {
        el.style.background = i === focusIdx ? 'var(--fusion-hover-bg, #3a3a3a)' : '';
      });
    };
    highlightItem();

    const cleanup = () => {
      menu.remove();
      document.removeEventListener('keydown', onKey, true);
    };

    const pickCategory = (cat) => {
      cleanup();
      // Place block at the last known mouse position on the canvas,
      // falling back to viewport center if the mouse hasn't moved.
      const mouse = this._lastMouseSVG;
      let spawnX, spawnY;
      if (mouse) {
        spawnX = mouse.x - 60;
        spawnY = mouse.y - 40;
      } else {
        const vb = svg.viewBox.baseVal;
        spawnX = vb.x + vb.width / 2 - 60;
        spawnY = vb.y + vb.height / 2 - 40;
      }
      const snapped = core.snapToGrid(spawnX, spawnY);
      const newBlock = core.addBlock({
        name: 'New ' + cat.name + ' Block',
        type: cat.name,
        x: snapped.x,
        y: snapped.y
      });
      renderer.renderBlock(newBlock);
      core.selectBlock(newBlock.id);
      features.clearSelection();
      features.addToSelection(newBlock.id);
      this.updatePropertiesPanel(newBlock, core, renderer);
      if (features.saveState) features.saveState();
      this._updateMinimap();
      // Auto inline-edit for naming
      setTimeout(() => this.startInlineEdit(newBlock, svg, core, renderer), 50);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        return;
      }
      const upper = e.key.toUpperCase();
      const match = categories.find(c => c.key === upper);
      if (match) {
        e.preventDefault();
        e.stopPropagation();
        pickCategory(match);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        focusIdx = (focusIdx + 1) % items.length;
        highlightItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        focusIdx = (focusIdx - 1 + items.length) % items.length;
        highlightItem();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        pickCategory(categories[focusIdx]);
      }
    };

    document.addEventListener('keydown', onKey, true);

    // Close on outside click
    const outsideClick = (e) => {
      if (!menu.contains(e.target)) {
        cleanup();
        document.removeEventListener('mousedown', outsideClick);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', outsideClick), 0);
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

    // Store block ID on the foreignObject so the drag handler can find it
    fo.setAttribute('data-inline-edit-block', block.id);

    fo.appendChild(input);
    svg.appendChild(fo);

    // Prevent mouse events on the input/foreignObject from bubbling up
    // to the SVG canvas, which would start block dragging and prevent
    // normal text cursor placement and selection.
    const stopBubble = (e) => { e.stopPropagation(); };
    fo.addEventListener('mousedown', stopBubble);
    fo.addEventListener('mouseup', stopBubble);
    fo.addEventListener('click', stopBubble);
    fo.addEventListener('dblclick', stopBubble);
    fo.addEventListener('pointerdown', stopBubble);

    // Select all text for easy replacement
    input.focus();
    input.select();

    const commit = () => {
      const newName = input.value.trim();
      if (newName && newName !== block.name) {
        core.updateBlock(block.id, { name: newName });
        renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
        if (window.advancedFeatures) window.advancedFeatures.saveState();
        // Re-render stub connections so labels reflect the new name
        if (renderer.renderSameLevelStubs) {
          renderer.renderSameLevelStubs(core.diagram);
        }
        if (renderer.renderCrossDiagramStubs) {
          renderer.renderCrossDiagramStubs(core.diagram);
        }
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

    // Also stop propagation on input-level mouse events so clicks
    // to position the text cursor work normally
    input.addEventListener('mousedown', stopBubble);
    input.addEventListener('mouseup', stopBubble);
    input.addEventListener('click', stopBubble);

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
      border: 1px solid var(--fusion-panel-border, #555); border-radius: 3px;
      padding: 20px; z-index: 100001; min-width: 360px; max-width: 480px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4); font-family: Arial, sans-serif;
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
      <input id="prop-name" style="${inputStyle}" value="${_escapeHtml(block.name || '')}" />
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
            <input class="attr-key" style="${inputStyle} width:40%;" value="${_escapeHtml(k)}" />
            <input class="attr-val" style="${inputStyle} width:55%;" value="${_escapeHtml(String(attrs[k]))}" />
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
      // Refresh the properties side panel so it reflects updated values
      const updatedBlock = core.diagram.blocks.find(b => b.id === block.id);
      if (updatedBlock) this.updatePropertiesPanel(updatedBlock, core, renderer);
      dialog.remove();
    });

    // Close on Escape
    const onKey = (e) => {
      if (e.key === 'Escape') { cancel(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
  }

  // =========================================================================
  // PROPERTIES SIDE PANEL
  // =========================================================================

  /**
   * Populate and show the properties side panel for the given block.
   */
  updatePropertiesPanel(block, core, renderer) {
    const panel = document.getElementById('properties-panel');
    const content = document.getElementById('pp-content');
    if (!panel || !content) return;

    // Track the currently-shown block so callers can refresh it later.
    this._propertiesPanelBlockId = block.id;

    // --- Connections summary (includes stubs in counts) ---
    const outgoing = core.diagram.connections.filter(c => c.fromBlock === block.id);
    const incoming = core.diagram.connections.filter(c => c.toBlock === block.id);
    const stubs = (core.diagram.namedStubs || []).filter(s => s.blockId === block.id);
    const stubsOut = stubs.filter(s => s.portSide === 'output' || (!s.portSide && true));
    const stubsIn  = stubs.filter(s => s.portSide === 'input');
    const totalOut = outgoing.length + stubsOut.length;
    const totalIn  = incoming.length + stubsIn.length;

    const connHtml = (list, direction) => {
      if (!list.length) return `<div style="color:#777; font-size:11px; padding:2px 0;">None</div>`;
      return list.map(c => {
        const otherId = direction === 'out' ? c.toBlock : c.fromBlock;
        const other = core.diagram.blocks.find(b => b.id === otherId);
        const otherName = other ? _escapeHtml(other.name) : '(deleted)';
        const typeLabel = c.connectionType || 'Signal';
        return `<div class="pp-conn-item">
          <span class="pp-conn-type">${_escapeHtml(typeLabel)}</span>
          <span>${direction === 'out' ? '→' : '←'} ${otherName}</span>
        </div>`;
      }).join('');
    };

    const stubsHtml = stubs.length
      ? stubs.map(s => `<div class="pp-conn-item">
          <span class="pp-conn-type">stub</span>
          <span>${_escapeHtml(s.netName || s.id)}</span>
        </div>`).join('')
      : '';

    // --- Attributes (editable inline) ---
    const attrs = block.attributes || {};
    const attrKeys = Object.keys(attrs);
    const attrRows = attrKeys.map(k => {
      const v = attrs[k];
      const isEmpty = v === '' || v === null || v === undefined;
      return `<div class="pp-row pp-attr-row" data-attr-key="${_escapeHtml(k)}">
        <input class="pp-attr-key-input" value="${_escapeHtml(k)}" title="Attribute name" />
        <input class="pp-attr-val-input" value="${isEmpty ? '' : _escapeHtml(String(v))}" placeholder="—" title="Attribute value" />
        <button class="pp-attr-del" title="Remove attribute">&times;</button>
      </div>`;
    }).join('');

    const attrSection = `
      ${attrRows || '<div style="color:#777; font-size:11px; padding:2px 0;">No attributes</div>'}
      <button id="pp-add-attr" class="pp-add-attr-btn">+ Add Attribute</button>
    `;

    // --- Helper to build inline <select> for a property ---
    const inlineSelect = (id, options, currentVal) => {
      return `<select id="${id}" class="pp-inline-select">${
        options.map(o => {
          const val = typeof o === 'string' ? o : o.value;
          const label = typeof o === 'string' ? o : o.label;
          return `<option value="${_escapeHtml(val)}"${val === currentVal ? ' selected' : ''}>${_escapeHtml(label)}</option>`;
        }).join('')
      }</select>`;
    };

    // --- Status badge class ---
    const statusSlug = (block.status || 'Placeholder').toLowerCase().replace(/\s+/g, '-');

    content.innerHTML = `
      <div class="pp-section">
        <div class="pp-section-title">General</div>
        <div class="pp-row">
          <span class="pp-label">Name</span>
          <span class="pp-value pp-name-editable" id="pp-name" title="Double-click to rename">${_escapeHtml(block.name || '')}</span>
        </div>
        <div class="pp-row">
          <span class="pp-label">Type</span>
          ${inlineSelect('pp-type', ['Generic', 'Electrical', 'Mechanical', 'Software'], block.type || 'Generic')}
        </div>
        <div class="pp-row">
          <span class="pp-label">Status</span>
          ${inlineSelect('pp-status', ['Placeholder', 'In Progress', 'Completed'], block.status || 'Placeholder')}
        </div>
        <div class="pp-row">
          <span class="pp-label">Shape</span>
          ${inlineSelect('pp-shape', [
            { value: 'rectangle',     label: '▭ Rectangle' },
            { value: 'rounded',       label: '▢ Rounded' },
            { value: 'diamond',       label: '◇ Diamond' },
            { value: 'circle',        label: '○ Ellipse' },
            { value: 'hexagon',       label: '⬡ Hexagon' },
            { value: 'parallelogram', label: '▱ Parallelogram' },
            { value: 'cylinder',      label: '⊙ Cylinder' },
            { value: 'triangle',      label: '△ Triangle' },
          ], block.shape || 'rectangle')}
        </div>
      </div>
      <div class="pp-section">
        <div class="pp-section-title">Attributes</div>
        ${attrSection}
      </div>
      <div class="pp-section">
        <div class="pp-section-title">Connections</div>
        <div style="font-size:11px; color:#aaa; margin-bottom:4px;">Outgoing (${totalOut})</div>
        ${connHtml(outgoing, 'out')}
        <div style="font-size:11px; color:#aaa; margin:6px 0 4px;">Incoming (${totalIn})</div>
        ${connHtml(incoming, 'in')}
        ${stubs.length ? `<div style="font-size:11px; color:#aaa; margin:6px 0 4px;">Named Stubs (${stubs.length})</div>${stubsHtml}` : ''}
      </div>
      <button class="pp-edit-btn" id="pp-edit-btn">Edit Properties</button>
    `;

    // --- Wire inline select change handlers ---
    const applyInlineChange = (prop, value) => {
      core.updateBlock(block.id, { [prop]: value });
      renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
      if (window.advancedFeatures) window.advancedFeatures.saveState();
      // Refresh panel with fresh data (re-read the block)
      const fresh = core.diagram.blocks.find(b => b.id === block.id);
      if (fresh) this.updatePropertiesPanel(fresh, core, renderer);
    };
    const typeSelect = content.querySelector('#pp-type');
    if (typeSelect) typeSelect.addEventListener('change', () => applyInlineChange('type', typeSelect.value));
    const statusSelect = content.querySelector('#pp-status');
    if (statusSelect) statusSelect.addEventListener('change', () => applyInlineChange('status', statusSelect.value));
    const shapeSelect = content.querySelector('#pp-shape');
    if (shapeSelect) shapeSelect.addEventListener('change', () => applyInlineChange('shape', shapeSelect.value));

    // --- Double-click on name to rename ---
    const nameEl = content.querySelector('#pp-name');
    if (nameEl) {
      nameEl.addEventListener('dblclick', () => {
        const currentName = block.name || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'pp-inline-input';
        input.style.cssText = 'width:100%;box-sizing:border-box;';
        nameEl.textContent = '';
        nameEl.appendChild(input);
        input.focus();
        input.select();
        const commit = () => {
          const newName = input.value.trim() || currentName;
          core.updateBlock(block.id, { name: newName });
          renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
          if (window.advancedFeatures) window.advancedFeatures.saveState();
          const fresh = core.diagram.blocks.find(b => b.id === block.id);
          if (fresh) this.updatePropertiesPanel(fresh, core, renderer);
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') { input.value = currentName; input.blur(); }
        });
      });
    }

    // --- Wire attribute inline editing ---
    const commitAttrs = () => {
      const newAttrs = {};
      content.querySelectorAll('.pp-attr-row').forEach(row => {
        const key = row.querySelector('.pp-attr-key-input').value.trim();
        const val = row.querySelector('.pp-attr-val-input').value.trim();
        if (key) newAttrs[key] = val;
      });
      core.updateBlock(block.id, { attributes: newAttrs });
      renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    };
    content.querySelectorAll('.pp-attr-key-input, .pp-attr-val-input').forEach(inp => {
      inp.addEventListener('change', commitAttrs);
    });
    content.querySelectorAll('.pp-attr-del').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.pp-attr-row').remove();
        commitAttrs();
        // Refresh panel
        const fresh = core.diagram.blocks.find(b => b.id === block.id);
        if (fresh) this.updatePropertiesPanel(fresh, core, renderer);
      });
    });

    // Add Attribute button
    const addAttrBtn = content.querySelector('#pp-add-attr');
    if (addAttrBtn) {
      addAttrBtn.addEventListener('click', () => {
        const currentAttrs = Object.assign({}, block.attributes || {});
        currentAttrs[''] = '';
        core.updateBlock(block.id, { attributes: currentAttrs });
        const fresh = core.diagram.blocks.find(b => b.id === block.id);
        if (fresh) this.updatePropertiesPanel(fresh, core, renderer);
        // Focus the new empty key input
        setTimeout(() => {
          const rows = content.querySelectorAll('.pp-attr-key-input');
          if (rows.length > 0) rows[rows.length - 1].focus();
        }, 50);
      });
    }

    // Wire Edit button (for full property editor with attributes)
    const editBtn = content.querySelector('#pp-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const freshBlock = core.diagram.blocks.find(b => b.id === block.id);
        if (freshBlock) this.openPropertyEditor(freshBlock, core, renderer);
      });
    }

    // Wire close button (re-wire each time to avoid stale listeners)
    const closeBtn = document.getElementById('pp-close-btn');
    if (closeBtn) {
      const freshClose = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(freshClose, closeBtn);
      freshClose.id = 'pp-close-btn';
      freshClose.addEventListener('click', () => this.hidePropertiesPanel());
    }

    panel.classList.add('visible');
  }

  /**
   * Hide the properties side panel (show empty state).
   */
  hidePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    const content = document.getElementById('pp-content');
    if (content) {
      content.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: #666; font-size: 12px;">
          <div style="font-size: 28px; margin-bottom: 8px; opacity: 0.4;">□</div>
          <div>Select a block to view its properties</div>
        </div>
      `;
    }
    if (panel) panel.classList.remove('visible');
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
        this._updateMinimap();
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

      // Cross-hierarchy connection — show a block picker dialog
      this._ctxAction(freshMenu, 'ctx-cross-connect', () => {
        this.hideContextMenu();
        this._showCrossConnectDialog(block, core, renderer, features);
      });

      // Named stub (net label) — prompt for net name via context menu
      this._ctxAction(freshMenu, 'ctx-named-stub', () => {
        this.hideContextMenu();
        this._showNamedStubDialog(block, core, renderer, features);
      });

      // Type submenu
      freshMenu.querySelectorAll('[data-set-type]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const newType = item.getAttribute('data-set-type');
          core.updateBlock(block.id, { type: newType });
          renderer.renderBlock(core.diagram.blocks.find(b => b.id === block.id));
          if (window.advancedFeatures) window.advancedFeatures.saveState();
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
          if (window.advancedFeatures) window.advancedFeatures.saveState();
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

      // Add to Group / Remove from Group
      if (window.advancedFeatures) {
        const groups = window.advancedFeatures.getGroupList();
        const currentGroupId = window.advancedFeatures.getGroupForBlock(block.id);

        // Populate "Add to Group" submenu
        const submenu = freshMenu.querySelector('#ctx-add-to-group-submenu');
        const addItem = freshMenu.querySelector('#ctx-add-to-group');
        if (submenu) {
          submenu.innerHTML = '';
          const available = groups.filter(g => g.id !== currentGroupId);
          if (available.length === 0) {
            if (addItem) addItem.style.display = 'none';
          } else {
            available.forEach(g => {
              const opt = document.createElement('div');
              opt.className = 'fusion-context-menu-item';
              opt.textContent = g.name;
              opt.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentGroupId) {
                  window.advancedFeatures.removeBlockFromGroup(currentGroupId, block.id);
                }
                window.advancedFeatures.addBlockToGroup(g.id, block.id);
                this.hideContextMenu();
              });
              submenu.appendChild(opt);
            });
          }
        }

        // Show/hide "Remove from Group"
        const removeItem = freshMenu.querySelector('#ctx-remove-from-group');
        if (removeItem) {
          if (currentGroupId) {
            removeItem.style.display = '';
            removeItem.addEventListener('click', (e) => {
              e.stopPropagation();
              window.advancedFeatures.removeBlockFromGroup(currentGroupId, block.id);
              this.hideContextMenu();
            });
          } else {
            removeItem.style.display = 'none';
          }
        }
      }
    }

    // Canvas/empty-space actions — Add Block at the right-click position
    this._ctxAction(freshMenu, 'ctx-add-block', () => {
      this.hideContextMenu();
      const svg = document.getElementById('svg-canvas');
      if (!svg || !window.toolbarManager) {
        if (window.toolbarManager) window.toolbarManager.handleCreateBlock();
        return;
      }
      // Convert the original right-click screen coordinates to SVG space
      const ctm = svg.getScreenCTM();
      let svgX, svgY;
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgPt = pt.matrixTransform(ctm.inverse());
        svgX = svgPt.x;
        svgY = svgPt.y;
      } else {
        svgX = clientX;
        svgY = clientY;
      }
      // Show the type dropdown positioned near the context-menu location
      // so the user doesn't lose spatial context.
      window.toolbarManager.showBlockTypeDropdownAt(clientX, clientY, (type) => {
        const core = window.diagramEditor;
        const renderer = window.diagramRenderer;
        if (!core || !renderer) return;
        const snapped = core.snapToGrid(svgX - 60, svgY - 40);
        const newBlock = core.addBlock({
          name: 'New ' + type + ' Block',
          type: type,
          x: snapped.x,
          y: snapped.y
        });
        renderer.renderBlock(newBlock);
        core.selectBlock(newBlock.id);
        const emptyState = document.getElementById('empty-canvas-state');
        if (emptyState) emptyState.classList.add('hidden');

        // Auto-start inline rename so the user can immediately name the block
        const svgEl = document.getElementById('svg-canvas');
        if (svgEl) {
          setTimeout(() => {
            this.startInlineEdit(newBlock, svgEl, core, renderer);
          }, 50);
        }
      });
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

  // =========================================================================
  // CONNECTION CONTEXT MENU
  // =========================================================================

  /**
   * Find a cross-diagram connection object and its owning diagram.
   * Searches the current diagram, child diagrams, and ancestor diagrams.
   * @returns {{ connection, diagram }|null}
   */
  /**
   * Remove a connection ID from every diagram in the hierarchy:
   * current diagram's children and all ancestor stack snapshots.
   * This prevents "ghost" stubs from reappearing after deletion.
   */
  _purgeConnectionFromAllSources(connectionId, core) {
    const purgeFromChildren = (blocks) => {
      for (const b of (blocks || [])) {
        if (b.childDiagram) {
          b.childDiagram.connections = (b.childDiagram.connections || []).filter(c => c.id !== connectionId);
          purgeFromChildren(b.childDiagram.blocks);
        }
      }
    };
    purgeFromChildren(core.diagram.blocks);
    if (window.advancedFeatures && window.advancedFeatures._hierarchyStack) {
      for (const entry of window.advancedFeatures._hierarchyStack) {
        entry.diagram.connections = (entry.diagram.connections || []).filter(c => c.id !== connectionId);
        purgeFromChildren(entry.diagram.blocks);
      }
    }
  }

  _findCrossDiagramConnection(connectionId, core) {
    // 1. Current diagram
    const local = core.diagram.connections.find(c => c.id === connectionId);
    if (local) return { connection: local, diagram: core.diagram };

    // 2. Child diagrams (recursive)
    const searchChildren = (blocks) => {
      for (const b of (blocks || [])) {
        if (b.childDiagram) {
          const found = (b.childDiagram.connections || []).find(c => c.id === connectionId);
          if (found) return { connection: found, diagram: b.childDiagram };
          const deeper = searchChildren(b.childDiagram.blocks);
          if (deeper) return deeper;
        }
      }
      return null;
    };
    const fromChild = searchChildren(core.diagram.blocks);
    if (fromChild) return fromChild;

    // 3. Ancestor diagrams in the hierarchy stack
    if (window.advancedFeatures && window.advancedFeatures._hierarchyStack) {
      for (const entry of window.advancedFeatures._hierarchyStack) {
        const found = (entry.diagram.connections || []).find(c => c.id === connectionId);
        if (found) return { connection: found, diagram: entry.diagram };
        const fromAncChild = searchChildren(entry.diagram.blocks);
        if (fromAncChild) return fromAncChild;
      }
    }
    return null;
  }

  showConnectionContextMenu(clientX, clientY, connection, core, renderer, features, homeDiagram = null) {
    this.hideContextMenu();
    this.hideConnectionContextMenu();

    // Highlight the targeted connection while menu is open
    renderer.highlightConnection(connection.id, true);
    this._highlightedConnectionId = connection.id;

    // Determine if this is a cross-diagram connection
    const isCross = !core.diagram.connections.some(c => c.id === connection.id);

    const menu = document.getElementById('connection-context-menu');
    if (!menu) return;

    // Wire up handlers (cloneNode trick to replace previous listeners)
    const freshMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(freshMenu, menu);
    freshMenu.id = 'connection-context-menu';

    // Helper: update a connection (local or cross-diagram) and re-render.
    // Always uses updateAllBlocks because renderConnection can't render
    // cross-diagram stubs (it fails when one block is in another diagram).
    const updateConn = (updates) => {
      // Clear highlight tracking BEFORE re-render — updateAllBlocks
      // destroys and recreates all SVG elements, so the subsequent
      // hideConnectionContextMenu must NOT try to un-highlight the
      // freshly-created stub (it would overwrite type-specific styling
      // with defaults because data-orig-stroke is absent on new elements).
      this._highlightedConnectionId = null;

      // Directly modify the connection reference (already the real object)
      Object.assign(connection, updates);
      // Also update via core for local connections (marks metadata modified)
      if (!isCross) {
        core.updateConnection(connection.id, updates);
      } else if (homeDiagram) {
        // For cross-diagram connections, also update the connection
        // in its home diagram so changes persist across navigation.
        const homeConn = (homeDiagram.connections || []).find(c => c.id === connection.id);
        if (homeConn && homeConn !== connection) {
          Object.assign(homeConn, updates);
        }
        // Mark home diagram modified so save picks up the change
        homeDiagram._modified = true;
      }
      // Always full re-render so stubs reflect type/direction changes
      renderer.updateAllBlocks(core.diagram);
      this._selectedConnection = null;
      if (window.advancedFeatures) window.advancedFeatures.saveState();
    };

    // --- Type submenu ---
    freshMenu.querySelectorAll('[data-conn-type]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        updateConn({ type: item.getAttribute('data-conn-type') });
        this.hideConnectionContextMenu();
      });
    });

    // --- Direction submenu ---
    freshMenu.querySelectorAll('[data-conn-direction]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        updateConn({ arrowDirection: item.getAttribute('data-conn-direction') });
        this.hideConnectionContextMenu();
      });
    });

    // --- Toggle Stub Display ---
    this._ctxAction(freshMenu, 'ctx-conn-toggle-stub', () => {
      this.hideConnectionContextMenu();
      updateConn({ renderAsStub: !connection.renderAsStub });
    });

    // --- Select Connected Blocks ---
    this._ctxAction(freshMenu, 'ctx-conn-select-blocks', () => {
      this.hideConnectionContextMenu();
      if (window.advancedFeatures) {
        window.advancedFeatures.clearSelection();
        // Only select blocks that exist in the current diagram
        const blockIds = new Set(core.diagram.blocks.map(b => b.id));
        if (blockIds.has(connection.fromBlock)) window.advancedFeatures.addToSelection(connection.fromBlock);
        if (blockIds.has(connection.toBlock)) window.advancedFeatures.addToSelection(connection.toBlock);
      }
      renderer.updateAllBlocks(core.diagram);
    });

    // --- Delete Connection ---
    this._ctxAction(freshMenu, 'ctx-conn-delete', () => {
      this.hideConnectionContextMenu();
      if (window.advancedFeatures) window.advancedFeatures.saveState();
      // Remove from the current diagram
      core.diagram.connections = core.diagram.connections.filter(c => c.id !== connection.id);
      // Also purge from hierarchy stack snapshots and child diagrams
      this._purgeConnectionFromAllSources(connection.id, core);
      this._selectedConnection = null;
      renderer.updateAllBlocks(core.diagram);
      this._updateMinimap();
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

  hideConnectionContextMenu() {
    const menu = document.getElementById('connection-context-menu');
    if (menu) menu.classList.remove('show');
    // Clear connection highlight
    if (this._highlightedConnectionId && window.diagramRenderer) {
      window.diagramRenderer.highlightConnection(this._highlightedConnectionId, false);
      this._highlightedConnectionId = null;
    }
  }

  /**
   * Right-click context menu for named stubs (net labels).
   * Offers rename and delete actions.
   * @private
   */
  _showNamedStubContextMenu(clientX, clientY, stubId, netName, core, renderer, features) {
    // Build a tiny floating context menu on the fly
    let menu = document.getElementById('named-stub-context-menu');
    if (menu) menu.remove();

    menu = document.createElement('div');
    menu.id = 'named-stub-context-menu';
    menu.className = 'fusion-context-menu show';
    menu.style.cssText = 'position:fixed;z-index:1000000;left:' + clientX + 'px;top:' + clientY + 'px;';

    // Rename option
    const renameItem = document.createElement('div');
    renameItem.className = 'fusion-context-menu-item';
    renameItem.innerHTML = '<span class="ctx-icon">✏️</span> Rename Net…';
    renameItem.addEventListener('click', () => {
      menu.remove();
      const newName = prompt('Rename net "' + netName + '" to:', netName);
      if (!newName || !newName.trim() || newName.trim() === netName) return;
      // Rename all stubs with this net name
      const stubs = core.getStubsByNet ? core.getStubsByNet(netName) : [];
      stubs.forEach(s => { s.netName = newName.trim(); });
      renderer.updateAllBlocks(core.diagram);
      if (features) features.saveState();
      this._toast('Renamed net to "' + newName.trim() + '"', 'success');
    });
    menu.appendChild(renameItem);

    // Delete this stub
    const deleteItem = document.createElement('div');
    deleteItem.className = 'fusion-context-menu-item danger';
    deleteItem.innerHTML = '<span class="ctx-icon">🗑️</span> Remove This Stub';
    deleteItem.addEventListener('click', () => {
      menu.remove();
      core.removeNamedStub(stubId);
      renderer.updateAllBlocks(core.diagram);
      if (features) features.saveState();
      this._toast('Removed net stub', 'success');
    });
    menu.appendChild(deleteItem);

    // --- Stub property editing options ---
    const stub = (core.diagram.namedStubs || []).find(s => s.id === stubId);

    if (stub) {
      // Separator
      const sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid #444;margin:4px 0;';
      menu.appendChild(sep);

      // Change direction
      const dirItem = document.createElement('div');
      dirItem.className = 'fusion-context-menu-item';
      const curDir = stub.direction || 'forward';
      const dirLabel = curDir === 'forward' ? '→ Forward'
        : curDir === 'backward' ? '← Backward' : '↔ Bidirectional';
      dirItem.innerHTML = '<span class="ctx-icon">🔄</span> Direction: ' + dirLabel;
      dirItem.addEventListener('click', () => {
        menu.remove();
        const next = curDir === 'forward' ? 'backward'
          : curDir === 'backward' ? 'bidirectional' : 'forward';
        stub.direction = next;
        renderer.updateAllBlocks(core.diagram);
        if (features) {
          features.updateGroupBoundaries();
          features.saveState();
        }
        const labels = { forward: '→ Forward', backward: '← Backward', bidirectional: '↔ Bidirectional' };
        this._toast('Stub direction: ' + labels[next], 'success');
      });
      menu.appendChild(dirItem);

      // Change port side
      const sideItem = document.createElement('div');
      sideItem.className = 'fusion-context-menu-item';
      const curSide = stub.portSide || 'output';
      sideItem.innerHTML = '<span class="ctx-icon">📐</span> Port Side: ' + curSide;
      sideItem.addEventListener('click', () => {
        menu.remove();
        const sides = ['output', 'input', 'top', 'bottom'];
        const idx = sides.indexOf(curSide);
        const next = sides[(idx + 1) % sides.length];
        stub.portSide = next;
        renderer.updateAllBlocks(core.diagram);
        if (features) {
          features.updateGroupBoundaries();
          features.saveState();
        }
        this._toast('Stub moved to ' + next + ' side', 'success');
      });
      menu.appendChild(sideItem);

      // Change connection type (styling)
      const typeItem = document.createElement('div');
      typeItem.className = 'fusion-context-menu-item';
      const curType = stub.type || 'auto';
      typeItem.innerHTML = '<span class="ctx-icon">🎨</span> Type: ' + curType;
      typeItem.addEventListener('click', () => {
        menu.remove();
        const types = ['auto', 'power', 'data', 'signal', 'mechanical', 'software', 'optical', 'thermal'];
        const idx = types.indexOf(curType);
        const next = types[(idx + 1) % types.length];
        stub.type = next;
        renderer.updateAllBlocks(core.diagram);
        if (features) {
          features.updateGroupBoundaries();
          features.saveState();
        }
        this._toast('Stub type: ' + next, 'success');
      });
      menu.appendChild(typeItem);
    }

    // Delete entire net (all stubs with this name)
    const netBlocks = core.getStubsByNet ? core.getStubsByNet(netName) : [];
    if (netBlocks.length > 1) {
      const deleteNetItem = document.createElement('div');
      deleteNetItem.className = 'fusion-context-menu-item danger';
      deleteNetItem.innerHTML = '<span class="ctx-icon">⛔</span> Delete Entire Net "' + netName + '" (' + netBlocks.length + ')';
      deleteNetItem.addEventListener('click', () => {
        menu.remove();
        const ok = confirm('Delete all ' + netBlocks.length + ' stubs on net "' + netName + '"?');
        if (!ok) return;
        // Remove all stubs in this net
        const toRemove = netBlocks.map(s => s.id);
        toRemove.forEach(id => core.removeNamedStub(id));
        renderer.updateAllBlocks(core.diagram);
        if (features) features.saveState();
        this._toast('Deleted net "' + netName + '"', 'success');
      });
      menu.appendChild(deleteNetItem);
    }

    document.body.appendChild(menu);

    // Close on outside click
    const closer = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('mousedown', closer);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closer), 0);
  }

  _ctxAction(menu, id, handler) {
    const el = menu.querySelector('#' + id);
    if (el) el.addEventListener('click', handler);
  }

  /**
   * Show a dialog that lists all blocks across the hierarchy (parent,
   * children, siblings) so the user can create a cross-branch connection.
   * @private
   */
  _showCrossConnectDialog(sourceBlock, core, renderer, features) {
    // Collect all blocks from the hierarchy
    const allBlocks = [];

    // Helper: recursively collect blocks from a diagram and its children
    const collectFromDiagram = (diagram, path) => {
      (diagram.blocks || []).forEach(b => {
        allBlocks.push({ block: b, path: path, diagram: diagram });
        if (b.childDiagram) {
          collectFromDiagram(b.childDiagram, path + ' › ' + (b.name || b.id));
        }
      });
    };

    // Start from root — walk up the hierarchy stack first
    let rootDiagram = core.diagram;
    let rootPath = 'Current';
    if (features && features._hierarchyStack && features._hierarchyStack.length > 0) {
      rootDiagram = features._hierarchyStack[0].diagram;
      rootPath = 'Root';
    }
    collectFromDiagram(rootDiagram, rootPath);

    // Also include current-level blocks that might not be in the root walk
    // (they already are if we walked from root, so deduplicate by id)
    const seen = new Set(allBlocks.map(e => e.block.id));
    (core.diagram.blocks || []).forEach(b => {
      if (!seen.has(b.id)) {
        allBlocks.push({ block: b, path: 'Current', diagram: core.diagram });
      }
    });

    // Filter out the source block itself
    const candidates = allBlocks.filter(e => e.block.id !== sourceBlock.id);

    if (candidates.length === 0) {
      if (window.pythonInterface) {
        window.pythonInterface.showNotification('No other blocks found in the hierarchy', 'warning');
      }
      return;
    }

    // Build a simple selection prompt
    const lines = candidates.map((e, i) =>
      `${i + 1}. [${e.path}] ${e.block.name || e.block.id} (${e.block.type || 'generic'})`
    );
    const choice = prompt(
      'Connect [' + (sourceBlock.name || sourceBlock.id) + '] to which block?\n\n' +
      lines.join('\n') +
      '\n\nEnter number:',
      '1'
    );
    if (!choice) return;
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= candidates.length) return;

    const target = candidates[idx];
    const connType = document.getElementById('connection-type-select');
    const type = connType ? connType.value : 'data';
    const dirSelect = document.getElementById('arrow-direction-select');
    const direction = dirSelect ? dirSelect.value : 'forward';

    const conn = core.addConnection(sourceBlock.id, target.block.id, type, direction);
    if (conn) {
      renderer._cachedFanMap = null;
      renderer.renderConnection(conn);
      // Re-render cross-diagram stubs so the new connection shows its flag
      renderer.renderCrossDiagramStubs(core.diagram);
      if (features) features.saveState();
      if (window.pythonInterface) {
        window.pythonInterface.showNotification(
          `Connected to "${target.block.name || target.block.id}" (${target.path})`,
          'success'
        );
      }
    }
  }

  /**
   * Context-menu action: prompt for a net name and create a named stub on this block.
   * @private
   */
  _showNamedStubDialog(block, core, renderer, features) {
    const existingNets = core.getNetNames ? core.getNetNames() : [];

    this._promptWithAutocomplete(
      'Net name for "' + (block.name || block.id) + '"',
      existingNets,
      ''
    ).then(netName => {
      if (!netName || !netName.trim()) return;

      const connType = document.getElementById('connection-type-select');
      const type = connType ? connType.value : 'auto';
      const arrowDir = document.getElementById('arrow-direction-select');
      const direction = arrowDir ? arrowDir.value : 'forward';

      const stub = core.addNamedStub(netName.trim(), block.id, 'output', type, direction);
      if (stub) {
        renderer.updateAllBlocks(core.diagram);
        if (features && features.updateGroupBoundaries) {
          features.updateGroupBoundaries();
        }
        if (features) features.saveState();
        const netBlocks = core.getStubsByNet ? core.getStubsByNet(netName.trim()) : [];
        this._toast('Net stub "' + netName.trim() + '" (' + netBlocks.length + ' block' +
          (netBlocks.length !== 1 ? 's' : '') + ')', 'success');
      } else {
        this._toast('Net "' + netName.trim() + '" already exists on this block/port', 'warning');
      }
    });
  }

  // =========================================================================
  // CONNECTION DRAWING MODE
  // =========================================================================
  enterConnectionMode(sourceBlock, core, renderer, sourcePortType = 'output') {
    const svg = document.getElementById('svg-canvas');
    if (!svg) return;

    this._connectionMode.active = true;
    this._connectionMode.sourceBlock = sourceBlock;
    this._connectionMode.sourcePort = sourcePortType;
    this._connectionModeEntryTime = performance.now();

    // Highlight source block
    renderer.highlightBlock(sourceBlock.id, true);

    // Compute temp line start based on which port was clicked
    const w = sourceBlock.width || 120;
    const h = sourceBlock.height || 80;
    let fromX, fromY;
    switch (sourcePortType) {
      case 'input':  fromX = sourceBlock.x;         fromY = sourceBlock.y + h / 2; break;
      case 'top':    fromX = sourceBlock.x + w / 2;  fromY = sourceBlock.y;         break;
      case 'bottom': fromX = sourceBlock.x + w / 2;  fromY = sourceBlock.y + h;     break;
      case 'output':
      default:       fromX = sourceBlock.x + w;       fromY = sourceBlock.y + h / 2; break;
    }

    // Create temporary line from the clicked port
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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

  // =========================================================================
  // STUB-TARGET-PICK MODE — draw-to-empty → click target block for stub
  // =========================================================================

  /**
   * Called when the user drops a connection line on empty canvas.
   * Prompts for a net name:
   *   - Enter a name → creates a named stub (net label).
   *     Blocks sharing the same name are implicitly connected.
   *   - Leave blank and click OK → enters stub-target-pick mode
   *     so the next block click creates a paired stub connection.
   *   - Cancel → abort.
   * @private
   */
  _offerStubCreation(svg, core, renderer, features) {
    const sourceBlock = this._connectionMode.sourceBlock;
    const sourcePort = this._connectionMode.sourcePort || 'output';
    // Clean up connection mode visuals but keep source info
    if (this._connectionMode.tempLine) {
      this._connectionMode.tempLine.remove();
    }
    this._connectionMode.active = false;
    this._connectionMode.tempLine = null;
    this._connectionModeExitTime = performance.now();

    const sourceName = sourceBlock.name || sourceBlock.id;

    // Build autocomplete suggestions from existing net names
    const existingNets = core.getNetNames ? core.getNetNames() : [];

    this._promptWithAutocomplete(
      'Stub from "' + sourceName + '" — enter net name or leave blank to pick a target',
      existingNets,
      ''
    ).then(netName => {
      // null = user clicked Cancel
      if (netName === null) {
        if (window.diagramRenderer) {
          window.diagramRenderer.highlightBlock(sourceBlock.id, false);
        }
        if (svg) svg.style.cursor = '';
        this._connectionMode.sourceBlock = null;
        return;
      }

    const trimmedName = netName.trim();

    if (trimmedName) {
      // --- Named stub (net label) ---
      const connType = document.getElementById('connection-type-select');
      const type = connType ? connType.value : 'auto';
      const arrowDir = document.getElementById('arrow-direction-select');
      const direction = arrowDir ? arrowDir.value : 'forward';

      const stub = core.addNamedStub(trimmedName, sourceBlock.id, sourcePort, type, direction);
      if (stub) {
        renderer.updateAllBlocks(core.diagram);
        // Re-render group boundaries (updateAllBlocks clears them)
        if (features && features.updateGroupBoundaries) {
          features.updateGroupBoundaries();
        }
        if (features) features.saveState();

        // Count how many blocks are on this net
        const netBlocks = core.getStubsByNet
          ? core.getStubsByNet(trimmedName)
          : [];
        if (netBlocks.length > 1) {
          this._toast('Added to net "' + trimmedName + '" (' + netBlocks.length + ' blocks)', 'success');
        } else {
          this._toast('Created net stub "' + trimmedName + '"', 'success');
        }
        logger.info('Named stub created:', stub.id, 'net:', trimmedName,
          'on block:', sourceName);
      } else {
        this._toast('Stub "' + trimmedName + '" already exists on this port', 'warning');
      }

      if (window.diagramRenderer) {
        window.diagramRenderer.highlightBlock(sourceBlock.id, false);
      }
      if (svg) svg.style.cursor = '';
      this._connectionMode.sourceBlock = null;
    } else {
      // --- Blank name: enter stub-target-pick mode ---
      this._stubTargetMode.active = true;
      this._stubTargetMode.sourceBlock = sourceBlock;
      this._stubTargetMode.sourcePort = sourcePort;
      this._connectionMode.sourceBlock = null;
      if (svg) svg.style.cursor = 'crosshair';

      this._toast('Click the target block for the stub connection (Esc to cancel)', 'info');
      logger.info('Stub-target-pick mode: click a block or press Escape');
    }
    }); // end _promptWithAutocomplete .then()
  }

  /**
   * Complete the stub connection to the target block.
   * @private
   */
  _completeStubConnection(targetBlock, core, renderer, features) {
    const svg = document.getElementById('svg-canvas');
    const sourceBlock = this._stubTargetMode.sourceBlock;
    const sourcePort = this._stubTargetMode.sourcePort || 'output';
    const sourceId = sourceBlock ? sourceBlock.id : null;

    // Validate both blocks still exist in the diagram
    if (!sourceId || !core.diagram.blocks.find(b => b.id === sourceId)) {
      this._toast('Source block no longer exists', 'warning');
      this.exitStubTargetMode(svg);
      return;
    }
    if (!core.diagram.blocks.find(b => b.id === targetBlock.id)) {
      this._toast('Target block no longer exists', 'warning');
      this.exitStubTargetMode(svg);
      return;
    }

    const connType = document.getElementById('connection-type-select');
    const type = connType ? connType.value : 'auto';
    const arrowDir = document.getElementById('arrow-direction-select');
    const direction = arrowDir ? arrowDir.value : 'forward';

    // Determine target port by finding the closest target port to
    // the actual source port position (not block center).
    const tw = targetBlock.width || 120;
    const th = targetBlock.height || 80;
    const sw = sourceBlock.width || 120;
    const sh = sourceBlock.height || 80;

    // Compute source port position
    let srcPX, srcPY;
    switch (sourcePort) {
      case 'input':  srcPX = sourceBlock.x;          srcPY = sourceBlock.y + sh / 2; break;
      case 'top':    srcPX = sourceBlock.x + sw / 2;  srcPY = sourceBlock.y;          break;
      case 'bottom': srcPX = sourceBlock.x + sw / 2;  srcPY = sourceBlock.y + sh;     break;
      case 'output': default:
                     srcPX = sourceBlock.x + sw;       srcPY = sourceBlock.y + sh / 2; break;
    }

    // Find closest port on target block
    const targetPorts = [
      { x: targetBlock.x,          y: targetBlock.y + th / 2, type: 'input' },
      { x: targetBlock.x + tw,     y: targetBlock.y + th / 2, type: 'output' },
      { x: targetBlock.x + tw / 2, y: targetBlock.y,          type: 'top' },
      { x: targetBlock.x + tw / 2, y: targetBlock.y + th,     type: 'bottom' },
    ];
    let bestStubPort = 'input';
    let bestDist = Infinity;
    for (const p of targetPorts) {
      const d = Math.hypot(srcPX - p.x, srcPY - p.y);
      if (d < bestDist) { bestDist = d; bestStubPort = p.type; }
    }

    // Normalize so Forward/Backward always means left-to-right.
    let sFromId = sourceId;
    let sToId = targetBlock.id;
    let sFromPort = sourcePort;
    let sToPort = bestStubPort;
    if (sourcePort === 'input') {
      sFromId = targetBlock.id;
      sToId = sourceId;
      sFromPort = bestStubPort;
      sToPort = sourcePort;
    }

    const conn = core.addConnection(sFromId, sToId, type, direction, { renderAsStub: true });
    if (conn) {
      conn.fromPort = sFromPort;
      conn.toPort = sToPort;

      renderer.updateAllBlocks(core.diagram);
      // Re-render group boundaries (updateAllBlocks clears them)
      if (features && features.updateGroupBoundaries) {
        features.updateGroupBoundaries();
      }
      if (features) features.saveState();

      const targetName = targetBlock.name || targetBlock.id;
      this._toast('Stub connection created to "' + targetName + '"', 'success');
      logger.info('Stub connection created:', conn.id,
        'from', sourceBlock.name || sourceId,
        'to', targetName);
    }

    this.exitStubTargetMode(svg);
  }

  /**
   * Exit stub-target-pick mode and clean up visuals.
   */
  exitStubTargetMode(svg) {
    if (!svg) svg = document.getElementById('svg-canvas');
    if (this._stubTargetMode.sourceBlock && window.diagramRenderer) {
      window.diagramRenderer.highlightBlock(this._stubTargetMode.sourceBlock.id, false);
    }
    this._stubTargetMode.active = false;
    this._stubTargetMode.sourceBlock = null;
    this._stubTargetMode.sourcePort = null;
    if (svg) svg.style.cursor = '';
  }

  // ---- Dimension pick mode (issue #87) ----

  /**
   * Enter dimension-pick mode: user clicks first block, then second block
   * to create a dimension annotation between them.
   */
  enterDimensionMode() {
    const svg = document.getElementById('svg-canvas');
    if (!svg) return;
    this._dimensionMode.active = true;
    this._dimensionMode.firstBlock = null;
    this._dimensionMode.tempLine = null;
    svg.style.cursor = 'crosshair';
    this._toast('Click the first block for the dimension line', 'info');
    logger.info('Dimension pick mode: click two blocks or press Escape');
  }

  exitDimensionMode(svg) {
    if (!svg) svg = document.getElementById('svg-canvas');
    if (this._dimensionMode.tempLine) {
      this._dimensionMode.tempLine.remove();
    }
    if (this._dimensionMode.firstBlock && window.diagramRenderer) {
      window.diagramRenderer.highlightBlock(this._dimensionMode.firstBlock.id, false);
    }
    this._dimensionMode.active = false;
    this._dimensionMode.firstBlock = null;
    this._dimensionMode.tempLine = null;
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
    // Capture a reference to the coordinator so the debounced callback
    // can check _dragSaveJustFired on the correct object (not `core`).
    const coordinator = this;
    const originalUpdateBlock = core.updateBlock.bind(core);

    // Track explicit saveState calls to prevent the debounced auto-save
    // from pushing a duplicate state right after an explicit save.
    const originalSaveState = features.saveState.bind(features);
    let explicitSaveTime = 0;
    features.saveState = function(label) {
      explicitSaveTime = Date.now();
      // Cancel any pending debounced save — the explicit save supersedes it.
      clearTimeout(saveTimer);
      return originalSaveState(label);
    };

    core.updateBlock = function(blockId, updates) {
      const result = originalUpdateBlock(blockId, updates);
      if (result && !features.isPerformingUndoRedo) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          // Skip if a drag-end explicit save just fired (prevents
          // duplicate undo states for block moves).
          // Also skip if an explicit saveState was called recently (within
          // the debounce window) — that save already captured this change.
          // NOTE: The isPerformingUndoRedo guard above prevents the timer
          // from being set during undo/redo, so we don't need to check
          // the redoStack here. Removing that guard also ensures new
          // user actions after an undo are correctly recorded.
          const timeSinceExplicit = Date.now() - explicitSaveTime;
          if (!coordinator._dragSaveJustFired &&
              timeSinceExplicit > 300) {
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

        // Filter by status — matches the 5 canonical statuses (case-insensitive)
        let statusMatch = true;
        if (activeFilter !== 'all') {
          const blockStatus = (block.status || 'Placeholder').toLowerCase();
          statusMatch = blockStatus === activeFilter.toLowerCase();
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
      // Deactivate all filter buttons, then activate the chosen one
      const allFilterBtns = document.querySelectorAll('.filter-btn');
      allFilterBtns.forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      applyFilters();
    };

    if (filterAll) filterAll.addEventListener('click', () => setActiveFilter('all', filterAll));
    if (filterPlaceholder) filterPlaceholder.addEventListener('click', () => setActiveFilter('placeholder', filterPlaceholder));
    if (filterImplemented) filterImplemented.addEventListener('click', () => setActiveFilter('implemented', filterImplemented));

    // Additional status filter buttons (#43) — wire any extra filter
    // buttons that match [data-filter-status] in the HTML.
    document.querySelectorAll('[data-filter-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.getAttribute('data-filter-status');
        setActiveFilter(status, btn);
      });
    });
  }

  // =========================================================================
  // CONNECTION CONTROL SYNC
  // =========================================================================
  /**
   * Wire the ribbon connection-type and arrow-direction <select> elements
   * so that changing them while a connection is selected updates that
   * connection in-place.
   */
  setupConnectionControlSync(core, renderer) {
    const typeSelect = document.getElementById('connection-type-select');
    const dirSelect = document.getElementById('arrow-direction-select');

    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        // Update selected connection
        const connId = this._selectedConnection;
        if (connId) {
          core.updateConnection(connId, { type: typeSelect.value });
          const conn = core.diagram.connections.find(c => c.id === connId);
          if (conn) {
            renderer.renderConnection(conn);
            renderer.highlightConnection(connId, true);
          }
          if (window.advancedFeatures) window.advancedFeatures.saveState();
          return;
        }
        // Update selected named stub
        const stubId = this._selectedStub;
        if (stubId) {
          const stub = (core.diagram.namedStubs || []).find(s => s.id === stubId);
          if (stub) {
            stub.type = typeSelect.value;
            core.diagram.metadata.modified = new Date().toISOString();
            if (core._markDirty) core._markDirty();
            renderer.updateAllBlocks(core.diagram);
            renderer.highlightNamedStub(stubId, true);
            if (window.advancedFeatures) window.advancedFeatures.saveState();
          }
        }
      });
    }

    if (dirSelect) {
      dirSelect.addEventListener('change', () => {
        // Update selected connection
        const connId = this._selectedConnection;
        if (connId) {
          core.updateConnection(connId, { arrowDirection: dirSelect.value });
          const conn = core.diagram.connections.find(c => c.id === connId);
          if (conn) {
            renderer.renderConnection(conn);
            renderer.highlightConnection(connId, true);
          }
          if (window.advancedFeatures) window.advancedFeatures.saveState();
          return;
        }
        // Update selected named stub
        const stubId = this._selectedStub;
        if (stubId) {
          const stub = (core.diagram.namedStubs || []).find(s => s.id === stubId);
          if (stub) {
            stub.direction = dirSelect.value;
            core.diagram.metadata.modified = new Date().toISOString();
            if (core._markDirty) core._markDirty();
            renderer.updateAllBlocks(core.diagram);
            renderer.highlightNamedStub(stubId, true);
            if (window.advancedFeatures) window.advancedFeatures.saveState();
          }
        }
      });
    }
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
        const c = core.addConnection(fromId, toId, 'power');
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
          const c = core.addConnection(fromId, toId, kind || 'power');
          if (c) { renderer.renderConnection(c); connCount++; }
        }
      }
    }

    if (features) features.saveState();
    this._toast(`Imported ${imported} blocks and ${connCount} connections`, 'success');
  }

  /**
   * After a lasso selection captures ≥2 blocks, show a floating action
   * bar offering to create a group from the selected blocks.
   * @private
   */
  _offerGroupFromLasso(blockIds, features) {
    // Remove any previous group-offer bar
    const prev = document.getElementById('lasso-group-bar');
    if (prev) prev.remove();

    const bar = document.createElement('div');
    bar.id = 'lasso-group-bar';
    bar.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);' +
      'display:flex;align-items:center;gap:8px;padding:6px 14px;' +
      'background:#1e1e2e;border:1px solid #444;border-radius:3px;' +
      'color:#ccc;font-size:13px;z-index:10010;box-shadow:0 2px 6px rgba(0,0,0,0.3);';

    const label = document.createElement('span');
    label.textContent = blockIds.length + ' blocks selected';
    bar.appendChild(label);

    const groupBtn = document.createElement('button');
    groupBtn.textContent = 'Group';
    groupBtn.style.cssText = 'padding:4px 12px;border:none;border-radius:4px;' +
      'background:#4fc3f7;color:#111;font-weight:600;cursor:pointer;font-size:13px;';
    groupBtn.addEventListener('click', () => {
      const name = prompt('Group name:', 'Group');
      if (name !== null) {
        features.createGroup(blockIds, name || 'Group');
        this._toast('Created group "' + (name || 'Group') + '"', 'success');
      }
      bar.remove();
    });
    bar.appendChild(groupBtn);

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '\u2715';
    dismissBtn.title = 'Dismiss';
    dismissBtn.style.cssText = 'padding:2px 6px;border:none;border-radius:4px;' +
      'background:transparent;color:#888;cursor:pointer;font-size:15px;';
    dismissBtn.addEventListener('click', () => bar.remove());
    bar.appendChild(dismissBtn);

    document.body.appendChild(bar);

    // Auto-dismiss after 8 seconds
    setTimeout(() => { if (bar.parentNode) bar.remove(); }, 8000);
  }

  /**
   * Show a custom inline prompt with autocomplete suggestions.
   * Returns a Promise that resolves with the entered text, or null if
   * cancelled. The suggestions array provides autocomplete options that
   * filter as the user types.
   * @param {string} title    Title of the dialog.
   * @param {string[]} suggestions  Autocomplete options.
   * @param {string} [defaultValue='']  Initial input value.
   * @returns {Promise<string|null>}
   * @private
   */
  _promptWithAutocomplete(title, suggestions, defaultValue) {
    return new Promise(resolve => {
      // Remove any existing autocomplete dialog
      const prev = document.getElementById('autocomplete-dialog');
      if (prev) prev.remove();

      const overlay = document.createElement('div');
      overlay.id = 'autocomplete-dialog';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;' +
        'align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

      const card = document.createElement('div');
      card.style.cssText = 'background:#1e1e2e;border:1px solid #555;border-radius:3px;' +
        'padding:16px;width:320px;color:#ccc;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.4);';

      const heading = document.createElement('div');
      heading.textContent = title;
      heading.style.cssText = 'font-weight:600;margin-bottom:10px;font-size:14px;';
      card.appendChild(heading);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue || '';
      input.style.cssText = 'width:100%;box-sizing:border-box;padding:6px 8px;' +
        'background:#2a2a3e;border:1px solid #555;border-radius:4px;color:#eee;font-size:13px;';
      input.setAttribute('autocomplete', 'off');
      card.appendChild(input);

      const listEl = document.createElement('div');
      listEl.style.cssText = 'max-height:150px;overflow-y:auto;margin-top:6px;';
      card.appendChild(listEl);

      // Track keyboard-highlighted suggestion index (-1 = none)
      let highlightedIdx = -1;
      let currentMatches = [];

      const clearHighlight = () => {
        const items = listEl.children;
        for (let i = 0; i < items.length; i++) {
          items[i].style.background = 'transparent';
        }
      };

      const applyHighlight = (idx) => {
        clearHighlight();
        if (idx >= 0 && idx < listEl.children.length) {
          listEl.children[idx].style.background = '#3a3a5e';
          // Scroll into view if needed
          listEl.children[idx].scrollIntoView({ block: 'nearest' });
        }
      };

      const renderSuggestions = (filter) => {
        listEl.innerHTML = '';
        highlightedIdx = -1;
        const lf = (filter || '').toLowerCase();
        currentMatches = suggestions.filter(s => s.toLowerCase().includes(lf));
        currentMatches.forEach((s, idx) => {
          const item = document.createElement('div');
          item.textContent = s;
          item.style.cssText = 'padding:4px 8px;cursor:pointer;border-radius:3px;';
          item.addEventListener('mouseenter', () => {
            highlightedIdx = idx;
            applyHighlight(idx);
          });
          item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
          });
          item.addEventListener('click', () => {
            input.value = s;
            renderSuggestions(s);
          });
          listEl.appendChild(item);
        });
      };
      renderSuggestions(defaultValue || '');

      input.addEventListener('input', () => renderSuggestions(input.value));

      // Buttons
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:5px 14px;border:1px solid #555;border-radius:4px;' +
        'background:transparent;color:#ccc;cursor:pointer;font-size:13px;';
      cancelBtn.addEventListener('click', () => { overlay.remove(); resolve(null); });
      btnRow.appendChild(cancelBtn);

      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;' +
        'background:#4fc3f7;color:#111;font-weight:600;cursor:pointer;font-size:13px;';
      okBtn.addEventListener('click', () => { overlay.remove(); resolve(input.value); });
      btnRow.appendChild(okBtn);

      card.appendChild(btnRow);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Block canvas interactions (pan/zoom) while the dialog is open.
      // The overlay covers the viewport, but wheel/middle-mouse events
      // can still bubble in some CEF versions — stop them explicitly.
      const blockEvent = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      overlay.addEventListener('wheel', blockEvent, { passive: false });
      overlay.addEventListener('mousedown', (ev) => {
        // Allow clicks on the card/buttons; block everything else
        if (!card.contains(ev.target)) {
          ev.stopPropagation();
          ev.preventDefault();
        }
      });

      // Focus input and select text
      setTimeout(() => { input.focus(); input.select(); }, 0);

      // Keyboard navigation: arrows, Enter, Escape
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          if (currentMatches.length > 0) {
            highlightedIdx = (highlightedIdx + 1) % currentMatches.length;
            applyHighlight(highlightedIdx);
          }
          return;
        }
        if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (currentMatches.length > 0) {
            highlightedIdx = highlightedIdx <= 0
              ? currentMatches.length - 1
              : highlightedIdx - 1;
            applyHighlight(highlightedIdx);
          }
          return;
        }
        if (ev.key === 'Enter') {
          ev.preventDefault();
          // If a suggestion is highlighted, use it; otherwise use typed text
          if (highlightedIdx >= 0 && highlightedIdx < currentMatches.length) {
            input.value = currentMatches[highlightedIdx];
          }
          overlay.remove();
          resolve(input.value);
          return;
        }
        if (ev.key === 'Escape') { ev.preventDefault(); overlay.remove(); resolve(null); }
      });
    });
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
        this._updateMinimap();
        return block;
      },
      
      deleteBlock: (blockId) => {
        this.modules.get('core').removeBlock(blockId);
        this.modules.get('renderer').updateAllBlocks(this.modules.get('core').diagram);
        this._updateMinimap();
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
          this._updateMinimap();
        }
        return success;
      },
      
      // Advanced features
      undo: () => this.modules.get('features').undo(),
      redo: () => this.modules.get('features').redo(),
      
      createGroup: (blockIds, name) => this.modules.get('features').createGroup(blockIds, name),
      addBlockToGroup: (groupId, blockId) => this.modules.get('features').addBlockToGroup(groupId, blockId),
      removeBlockFromGroup: (groupId, blockId) => this.modules.get('features').removeBlockFromGroup(groupId, blockId),
      
      // Python interface
      save: () => this.modules.get('python').saveDiagram(),
      load: () => this.modules.get('python').loadDiagram(),
      exportReports: () => this.modules.get('python').exportReports(),
      
      // Module access (for advanced users)
      getModule: (name) => this.modules.get(name),
      
      // Status
      isReady: () => this.isInitialized,
      getVersion: () => '0.1.1'
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

  /** Schedule a minimap re-render (safe no-op if minimap is absent). */
  _updateMinimap() {
    const minimap = this.modules.get('minimap');
    if (minimap) minimap.scheduleRender();
  }

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
      border-radius: 3px;
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