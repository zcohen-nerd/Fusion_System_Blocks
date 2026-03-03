/**
 * SHAPE PALETTE MODULE
 *
 * Drag-and-drop shape sidebar for adding blocks to the diagram canvas.
 *   – Categorized shape library (Generic, Electrical, Mechanical, Software)
 *   – Collapsible category sections
 *   – Shape thumbnails with SVG previews
 *   – HTML5 drag-and-drop onto the SVG canvas
 *   – Search / filter across all shapes
 *   – Remembers collapsed state in sessionStorage
 *
 * Issue: #180
 * Author: GitHub Copilot
 * Created: March 2026
 * Module: Shape Palette
 */

/* global logger, ElectricalBlockTypes, MechanicalBlockTypes, SoftwareBlockTypes */

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: function () {},
      info: function () {},
      warn: function () {},
      error: function () {}
    };

class ShapePalette {
  /**
   * @param {DiagramEditorCore} editor      – Core editor (has .addBlock, .gridSize, .snapToGridEnabled)
   * @param {DiagramRenderer}   renderer    – Renderer (has .renderBlock, .renderAllConnections)
   */
  constructor(editor, renderer) {
    this.editor = editor;
    this.renderer = renderer;

    /** Root container element */
    this.container = document.getElementById('shape-palette');

    /** Search input element */
    this.searchInput = document.getElementById('shape-palette-search');

    /** Currently visible after filtering */
    this._allItems = [];

    /** Collapsed state per category (persisted to sessionStorage) */
    this._collapsed = this._loadCollapsed();

    /** Whether the sidebar is open */
    this.visible = true;

    if (this.container) {
      this._buildPalette();
      this._bindEvents();
    } else {
      logger.warn('ShapePalette: #shape-palette container not found');
    }
  }

  // -------------------------------------------------------------------
  // Shape registry — defines every item available in the palette.
  // Each entry: { id, name, category, subcategory, type, shape, color,
  //               description, width, height }
  // -------------------------------------------------------------------

  static get SHAPES() {
    if (ShapePalette._shapesCache) return ShapePalette._shapesCache;

    const shapes = [];

    // ── Generic shapes ──
    const genericShapes = [
      { id: 'generic-rect',      name: 'Block',           shape: 'rectangle', color: '#757575', description: 'Generic rectangular block' },
      { id: 'generic-rounded',   name: 'Rounded Block',   shape: 'rounded',   color: '#757575', description: 'Rounded rectangle block' },
      { id: 'generic-circle',    name: 'Circle',          shape: 'circle',    color: '#757575', description: 'Circular block' },
      { id: 'generic-diamond',   name: 'Decision',        shape: 'diamond',   color: '#757575', description: 'Diamond / decision block' },
      { id: 'generic-hexagon',   name: 'Hexagon',         shape: 'hexagon',   color: '#757575', description: 'Hexagonal process block' },
      { id: 'generic-triangle',  name: 'Triangle',        shape: 'triangle',  color: '#757575', description: 'Triangular block' },
      { id: 'generic-parallelogram', name: 'Parallelogram', shape: 'parallelogram', color: '#757575', description: 'I/O parallelogram block' },
      { id: 'generic-cylinder',  name: 'Cylinder',        shape: 'cylinder',  color: '#757575', description: 'Database / storage cylinder' },
    ];
    genericShapes.forEach(s => shapes.push({
      ...s,
      category: 'Generic',
      subcategory: 'shapes',
      type: 'Generic',
      width: 160,
      height: 100
    }));

    // ── Electrical blocks (from ElectricalBlockTypes registry) ──
    if (typeof ElectricalBlockTypes !== 'undefined') {
      const cats = ElectricalBlockTypes.getCategories();
      for (const cat of cats) {
        const entries = ElectricalBlockTypes.getTypesByCategory(cat);
        for (const [key, def] of Object.entries(entries)) {
          shapes.push({
            id: key,
            name: def.name,
            category: 'Electrical',
            subcategory: cat,
            type: 'Electrical',
            shape: 'rectangle',
            color: def.color || '#2196F3',
            description: def.description || '',
            width: 160,
            height: 100
          });
        }
      }
    }

    // ── Mechanical blocks ──
    if (typeof MechanicalBlockTypes !== 'undefined') {
      const all = MechanicalBlockTypes.getAll();
      for (const [key, def] of Object.entries(all)) {
        shapes.push({
          id: key,
          name: def.name,
          category: 'Mechanical',
          subcategory: def.subcategory || 'general',
          type: 'Mechanical',
          shape: 'rectangle',
          color: def.color || '#FF9800',
          description: def.description || '',
          width: 160,
          height: 100
        });
      }
    }

    // ── Software blocks ──
    if (typeof SoftwareBlockTypes !== 'undefined') {
      const all = SoftwareBlockTypes.getAll();
      for (const [key, def] of Object.entries(all)) {
        shapes.push({
          id: key,
          name: def.name,
          category: 'Software',
          subcategory: def.subcategory || 'general',
          type: 'Software',
          shape: 'rectangle',
          color: def.color || '#9C27B0',
          description: def.description || '',
          width: 160,
          height: 100
        });
      }
    }

    ShapePalette._shapesCache = shapes;
    return shapes;
  }

  // -------------------------------------------------------------------
  // Category metadata
  // -------------------------------------------------------------------

  static get CATEGORIES() {
    return [
      { id: 'Generic',    label: 'Generic',    icon: '▢', accentColor: '#757575' },
      { id: 'Electrical', label: 'Electrical',  icon: '⚡', accentColor: '#2196F3' },
      { id: 'Mechanical', label: 'Mechanical', icon: '⚙', accentColor: '#FF9800' },
      { id: 'Software',   label: 'Software',   icon: '💻', accentColor: '#9C27B0' }
    ];
  }

  // -------------------------------------------------------------------
  // Build DOM
  // -------------------------------------------------------------------

  _buildPalette() {
    const shapes = ShapePalette.SHAPES;
    this.container.innerHTML = '';

    for (const cat of ShapePalette.CATEGORIES) {
      const items = shapes.filter(s => s.category === cat.id);
      if (items.length === 0) continue;

      const section = document.createElement('div');
      section.className = 'sp-category';
      section.dataset.category = cat.id;

      // Header
      const header = document.createElement('button');
      header.className = 'sp-category-header';
      header.setAttribute('aria-expanded', this._collapsed[cat.id] ? 'false' : 'true');
      header.innerHTML =
        '<span class="sp-cat-icon" style="color:' + cat.accentColor + '">' + cat.icon + '</span>' +
        '<span class="sp-cat-label">' + cat.label + '</span>' +
        '<span class="sp-cat-count">' + items.length + '</span>' +
        '<span class="sp-cat-chevron">' + (this._collapsed[cat.id] ? '▸' : '▾') + '</span>';
      section.appendChild(header);

      // Items grid
      const grid = document.createElement('div');
      grid.className = 'sp-items-grid';
      if (this._collapsed[cat.id]) {
        grid.style.display = 'none';
      }

      // Group by subcategory
      const subcats = [...new Set(items.map(i => i.subcategory))];
      for (const sub of subcats) {
        const subItems = items.filter(i => i.subcategory === sub);
        if (subcats.length > 1) {
          const subLabel = document.createElement('div');
          subLabel.className = 'sp-subcategory-label';
          subLabel.textContent = sub.charAt(0).toUpperCase() + sub.slice(1).replace(/_/g, ' ');
          grid.appendChild(subLabel);
        }
        for (const item of subItems) {
          grid.appendChild(this._createShapeItem(item));
        }
      }

      section.appendChild(grid);
      this.container.appendChild(section);

      // Track items for filtering
      this._allItems.push(...items.map(item => ({ item, el: grid.querySelector('[data-shape-id="' + item.id + '"]') })));
    }
  }

  /**
   * Create a single draggable shape item element.
   */
  _createShapeItem(item) {
    const el = document.createElement('div');
    el.className = 'sp-shape-item';
    el.setAttribute('draggable', 'true');
    el.dataset.shapeId = item.id;
    el.title = item.description || item.name;

    // SVG thumbnail
    const thumbSize = 40;
    const pad = 4;
    const w = thumbSize - pad * 2;
    const h = (thumbSize * 0.625) - pad; // aspect ≈ 160:100
    const svg = this._createThumbnailSVG(item, w, h, pad, thumbSize);

    // Label
    const label = document.createElement('span');
    label.className = 'sp-shape-label';
    label.textContent = item.name;

    el.appendChild(svg);
    el.appendChild(label);

    // Drag start
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/x-fsb-shape', JSON.stringify(item));
      // Also set text for CEF compatibility
      e.dataTransfer.setData('text/plain', item.id);
      el.classList.add('sp-dragging');
      logger.debug('ShapePalette: drag start', item.id);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('sp-dragging');
    });

    return el;
  }

  /**
   * Generate a small SVG thumbnail for a shape item.
   */
  _createThumbnailSVG(item, w, h, pad, size) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'sp-shape-thumb');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('aria-hidden', 'true');

    const fill = item.color + '33'; // ~20% opacity
    const stroke = item.color;

    let shape;
    switch (item.shape) {
      case 'circle':
        shape = document.createElementNS(ns, 'ellipse');
        shape.setAttribute('cx', size / 2);
        shape.setAttribute('cy', size / 2);
        shape.setAttribute('rx', w / 2);
        shape.setAttribute('ry', h / 2);
        break;

      case 'diamond': {
        shape = document.createElementNS(ns, 'polygon');
        const mx = size / 2, my = size / 2;
        shape.setAttribute('points',
          mx + ',' + pad + ' ' + (pad + w) + ',' + my + ' ' +
          mx + ',' + (pad + h) + ' ' + pad + ',' + my);
        break;
      }

      case 'hexagon': {
        shape = document.createElementNS(ns, 'polygon');
        const off = w * 0.2;
        shape.setAttribute('points',
          (pad + off) + ',' + pad + ' ' + (pad + w - off) + ',' + pad + ' ' +
          (pad + w) + ',' + (size / 2) + ' ' + (pad + w - off) + ',' + (pad + h) + ' ' +
          (pad + off) + ',' + (pad + h) + ' ' + pad + ',' + (size / 2));
        break;
      }

      case 'triangle': {
        shape = document.createElementNS(ns, 'polygon');
        shape.setAttribute('points',
          (size / 2) + ',' + pad + ' ' + (pad + w) + ',' + (pad + h) + ' ' +
          pad + ',' + (pad + h));
        break;
      }

      case 'parallelogram': {
        shape = document.createElementNS(ns, 'polygon');
        const skew = w * 0.18;
        shape.setAttribute('points',
          (pad + skew) + ',' + pad + ' ' + (pad + w) + ',' + pad + ' ' +
          (pad + w - skew) + ',' + (pad + h) + ' ' + pad + ',' + (pad + h));
        break;
      }

      case 'cylinder': {
        // Rect + ellipse top
        const g = document.createElementNS(ns, 'g');
        const ey = 5;
        const body = document.createElementNS(ns, 'rect');
        body.setAttribute('x', pad);
        body.setAttribute('y', pad + ey);
        body.setAttribute('width', w);
        body.setAttribute('height', h - ey);
        body.setAttribute('rx', 2);
        body.setAttribute('fill', fill);
        body.setAttribute('stroke', stroke);
        body.setAttribute('stroke-width', '1.5');
        g.appendChild(body);
        const top = document.createElementNS(ns, 'ellipse');
        top.setAttribute('cx', pad + w / 2);
        top.setAttribute('cy', pad + ey);
        top.setAttribute('rx', w / 2);
        top.setAttribute('ry', ey);
        top.setAttribute('fill', fill);
        top.setAttribute('stroke', stroke);
        top.setAttribute('stroke-width', '1.5');
        g.appendChild(top);
        svg.appendChild(g);
        return svg;
      }

      case 'rounded':
        shape = document.createElementNS(ns, 'rect');
        shape.setAttribute('x', pad);
        shape.setAttribute('y', pad);
        shape.setAttribute('width', w);
        shape.setAttribute('height', h);
        shape.setAttribute('rx', Math.min(w, h) * 0.35);
        break;

      case 'rectangle':
      default:
        shape = document.createElementNS(ns, 'rect');
        shape.setAttribute('x', pad);
        shape.setAttribute('y', pad);
        shape.setAttribute('width', w);
        shape.setAttribute('height', h);
        shape.setAttribute('rx', 4);
        break;
    }

    if (shape) {
      shape.setAttribute('fill', fill);
      shape.setAttribute('stroke', stroke);
      shape.setAttribute('stroke-width', '1.5');
      svg.appendChild(shape);
    }

    return svg;
  }

  // -------------------------------------------------------------------
  // Event binding
  // -------------------------------------------------------------------

  _bindEvents() {
    // Category collapse toggle
    this.container.addEventListener('click', (e) => {
      const header = e.target.closest('.sp-category-header');
      if (!header) return;
      const section = header.closest('.sp-category');
      if (!section) return;
      const catId = section.dataset.category;
      const grid = section.querySelector('.sp-items-grid');
      if (!grid) return;

      const isCollapsed = grid.style.display === 'none';
      grid.style.display = isCollapsed ? '' : 'none';
      this._collapsed[catId] = !isCollapsed;
      header.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
      const chevron = header.querySelector('.sp-cat-chevron');
      if (chevron) chevron.textContent = isCollapsed ? '▾' : '▸';
      this._saveCollapsed();
    });

    // Search
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this._applyFilter());
    }

    // SVG canvas — drop target
    this._bindCanvasDrop();
  }

  /**
   * Wire drag-over and drop events on the SVG canvas.
   */
  _bindCanvasDrop() {
    const svg = document.getElementById('svg-canvas');
    if (!svg) return;

    svg.addEventListener('dragover', (e) => {
      // Must prevent default to allow drop
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    svg.addEventListener('dragenter', (e) => {
      e.preventDefault();
      svg.classList.add('sp-drop-active');
    });

    svg.addEventListener('dragleave', (e) => {
      // Only remove highlight when leaving the SVG entirely
      if (!svg.contains(e.relatedTarget)) {
        svg.classList.remove('sp-drop-active');
      }
    });

    svg.addEventListener('drop', (e) => {
      e.preventDefault();
      svg.classList.remove('sp-drop-active');

      let shapeData;
      try {
        const raw = e.dataTransfer.getData('application/x-fsb-shape');
        if (!raw) return;
        shapeData = JSON.parse(raw);
      } catch (_) {
        logger.warn('ShapePalette: invalid drop data');
        return;
      }

      // Convert drop position to SVG coordinates
      const svgPoint = this._screenToSVG(svg, e.clientX, e.clientY);
      if (!svgPoint) return;

      // Snap to grid
      let dropX = svgPoint.x - (shapeData.width || 160) / 2;
      let dropY = svgPoint.y - (shapeData.height || 100) / 2;
      if (this.editor.snapToGridEnabled) {
        const gs = this.editor.gridSize || 20;
        dropX = Math.round(dropX / gs) * gs;
        dropY = Math.round(dropY / gs) * gs;
      }

      // Create the block via the editor core (respects default attributes)
      const block = this.editor.addBlock({
        name: shapeData.name || 'New Block',
        type: shapeData.type || 'Generic',
        shape: shapeData.shape || 'rectangle',
        x: dropX,
        y: dropY,
        width: shapeData.width || 160,
        height: shapeData.height || 100
      });

      // Render and select
      this.renderer.renderBlock(block);
      this.renderer.renderAllConnections();
      this.editor.selectBlock(block.id);

      // Push undo state
      if (window.advancedFeatures && typeof window.advancedFeatures.saveState === 'function') {
        window.advancedFeatures.saveState('Add block: ' + block.name);
      }

      // Hide empty canvas state if shown
      const emptyState = document.getElementById('empty-canvas-state');
      if (emptyState) emptyState.style.display = 'none';

      // Update minimap
      if (window.minimapInstance) window.minimapInstance.scheduleRender();

      // Notification
      if (window.pythonInterface && typeof window.pythonInterface.showNotification === 'function') {
        window.pythonInterface.showNotification('Added: ' + block.name, 'success');
      }

      logger.info('ShapePalette: dropped block', block.id, shapeData.name);
    });
  }

  /**
   * Convert screen (client) coordinates to SVG/diagram coordinates.
   * Mirrors the approach in main-coordinator.js.
   */
  _screenToSVG(svg, clientX, clientY) {
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      return point.matrixTransform(ctm.inverse());
    }
    // Fallback
    const rect = svg.getBoundingClientRect();
    const vb = this.editor.viewBox;
    return {
      x: (clientX - rect.left) * (vb.width / rect.width) + vb.x,
      y: (clientY - rect.top) * (vb.height / rect.height) + vb.y
    };
  }

  // -------------------------------------------------------------------
  // Search / filter
  // -------------------------------------------------------------------

  _applyFilter() {
    const query = (this.searchInput ? this.searchInput.value : '').trim().toLowerCase();
    const items = this.container.querySelectorAll('.sp-shape-item');
    const categories = this.container.querySelectorAll('.sp-category');

    items.forEach(el => {
      const id = el.dataset.shapeId || '';
      const shapeDef = ShapePalette.SHAPES.find(s => s.id === id);
      if (!shapeDef) { el.style.display = 'none'; return; }

      const searchText = (shapeDef.name + ' ' + shapeDef.category + ' ' +
        shapeDef.subcategory + ' ' + (shapeDef.description || '')).toLowerCase();
      const match = !query || searchText.includes(query);
      el.style.display = match ? '' : 'none';
    });

    // Hide categories with zero visible items
    categories.forEach(cat => {
      const visibleItems = cat.querySelectorAll('.sp-shape-item:not([style*="display: none"])');
      cat.style.display = visibleItems.length > 0 ? '' : 'none';
      // Auto-expand when searching
      if (query && visibleItems.length > 0) {
        const grid = cat.querySelector('.sp-items-grid');
        if (grid) grid.style.display = '';
        const chevron = cat.querySelector('.sp-cat-chevron');
        if (chevron) chevron.textContent = '▾';
      }
    });

    // Show subcategory labels only when subcategory has visible items
    this.container.querySelectorAll('.sp-subcategory-label').forEach(label => {
      const next = label.nextElementSibling;
      // Hide label if the next sibling item (and subsequent items in the same subcategory) are hidden
      let hasVisible = false;
      let sibling = label.nextElementSibling;
      while (sibling && !sibling.classList.contains('sp-subcategory-label')) {
        if (sibling.style.display !== 'none') { hasVisible = true; break; }
        sibling = sibling.nextElementSibling;
      }
      label.style.display = hasVisible ? '' : 'none';
    });
  }

  // -------------------------------------------------------------------
  // Sidebar toggle
  // -------------------------------------------------------------------

  toggle() {
    this.visible = !this.visible;
    if (this.container) {
      const wrapper = this.container.closest('#shape-palette-wrapper');
      if (wrapper) {
        wrapper.classList.toggle('sp-hidden', !this.visible);
      }
    }
    document.documentElement.style.setProperty(
      '--fusion-sidebar-width', this.visible ? '200px' : '0px'
    );
  }

  show() { this.visible = true; this._setVisibility(true); }
  hide() { this.visible = false; this._setVisibility(false); }

  _setVisibility(visible) {
    const wrapper = this.container && this.container.closest('#shape-palette-wrapper');
    if (wrapper) wrapper.classList.toggle('sp-hidden', !visible);
    document.documentElement.style.setProperty(
      '--fusion-sidebar-width', visible ? '200px' : '0px'
    );
  }

  // -------------------------------------------------------------------
  // Collapsed state persistence
  // -------------------------------------------------------------------

  _loadCollapsed() {
    try {
      const raw = sessionStorage.getItem('fsb-palette-collapsed');
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  _saveCollapsed() {
    try {
      sessionStorage.setItem('fsb-palette-collapsed', JSON.stringify(this._collapsed));
    } catch (_) { /* storage full or unavailable */ }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ShapePalette };
} else {
  window.ShapePalette = ShapePalette;
}
