/**
 * MINIMAP / OVERVIEW NAVIGATOR MODULE
 *
 * Provides a bird's-eye view of the entire diagram canvas.
 *  - Renders all blocks as coloured rectangles proportional to position
 *  - Shows the current viewport as a translucent rectangle
 *  - Click / drag on the minimap pans the main canvas
 *  - Updates in real-time (throttled to ~30 fps)
 *  - Can be toggled on / off (default: on)
 *
 * Author: GitHub Copilot
 * Created: February 2026
 * Module: Minimap
 */

/* global logger */

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: function () {},
      info: function () {},
      warn: function () {},
      error: function () {}
    };

class Minimap {
  /**
   * @param {DiagramEditorCore} editor  - Core editor instance (has .diagram, .viewBox, .setViewBox)
   */
  constructor(editor) {
    this.editor = editor;
    this.container = document.getElementById('minimap-container');
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    /** Visible flag — toggled by button / shortcut. */
    this.visible = true;

    /** Diagram-space bounding box of ALL blocks (recalculated each render). */
    this._worldBounds = { x: 0, y: 0, w: 1000, h: 1000 };

    /** Padding (in diagram units) added around blocks so they aren't flush to edges. */
    this._padding = 60;

    /** Throttle handle for requestAnimationFrame. */
    this._rafId = null;

    /** Whether the user is currently dragging inside the minimap. */
    this._dragging = false;

    // Type colour mapping (same as diagram-renderer)
    this._typeColors = {
      'Electrical': '#2196F3',
      'Mechanical': '#FF9800',
      'Software':   '#9C27B0',
      'Generic':    '#757575'
    };

    if (this.container && this.canvas && this.ctx) {
      this._bindEvents();
      this.render();
    } else {
      logger.warn('Minimap: container or canvas element not found');
    }
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /** Toggle minimap visibility. */
  toggle() {
    this.visible = !this.visible;
    if (this.container) {
      this.container.style.display = this.visible ? '' : 'none';
    }
    if (this.visible) {
      this.scheduleRender();
    }
    // Update button active state
    var btn = document.getElementById('btn-minimap');
    if (btn) {
      btn.classList.toggle('active', this.visible);
    }
    logger.info('Minimap', this.visible ? 'shown' : 'hidden');
  }

  /** Request a render on the next animation frame (debounced). */
  scheduleRender() {
    if (this._rafId || !this.visible) return;
    this._rafId = requestAnimationFrame(function () {
      this._rafId = null;
      this.render();
    }.bind(this));
  }

  /** Immediately re-render the minimap. */
  render() {
    if (!this.ctx || !this.visible) return;

    var canvas = this.canvas;
    var ctx = this.ctx;
    var cw = canvas.width;
    var ch = canvas.height;

    // Clear
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
    ctx.fillRect(0, 0, cw, ch);

    var blocks = this.editor.diagram ? this.editor.diagram.blocks : [];
    var vb = this.editor.viewBox;

    // Compute world bounds: union of all block bounding boxes + current viewport
    this._computeWorldBounds(blocks, vb);
    var wb = this._worldBounds;

    // Scale factor: diagram-coords → minimap-pixels
    var sx = cw / wb.w;
    var sy = ch / wb.h;
    var scale = Math.min(sx, sy);

    // Centre the content in the minimap canvas
    var ox = (cw - wb.w * scale) / 2;
    var oy = (ch - wb.h * scale) / 2;

    // Draw blocks
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var bx = (b.x - wb.x) * scale + ox;
      var by = (b.y - wb.y) * scale + oy;
      var bw = (b.width || 120) * scale;
      var bh = (b.height || 80) * scale;

      // Ensure minimum 2px so tiny blocks are still visible
      if (bw < 2) bw = 2;
      if (bh < 2) bh = 2;

      ctx.fillStyle = this._typeColors[b.type] || this._typeColors['Generic'];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(bx, by, bw, bh);
    }

    // Draw viewport rectangle
    ctx.globalAlpha = 1;
    var vrx = (vb.x - wb.x) * scale + ox;
    var vry = (vb.y - wb.y) * scale + oy;
    var vrw = vb.width * scale;
    var vrh = vb.height * scale;

    ctx.strokeStyle = 'rgba(0, 120, 212, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vrx, vry, vrw, vrh);

    // Semi-transparent fill inside viewport
    ctx.fillStyle = 'rgba(0, 120, 212, 0.10)';
    ctx.fillRect(vrx, vry, vrw, vrh);
  }

  // -------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------

  /** Compute the bounding box of all blocks + current viewport. */
  _computeWorldBounds(blocks, vb) {
    var minX = vb.x;
    var minY = vb.y;
    var maxX = vb.x + vb.width;
    var maxY = vb.y + vb.height;

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var bx = b.x || 0;
      var by = b.y || 0;
      var bw = b.width || 120;
      var bh = b.height || 80;

      if (bx < minX) minX = bx;
      if (by < minY) minY = by;
      if (bx + bw > maxX) maxX = bx + bw;
      if (by + bh > maxY) maxY = by + bh;
    }

    var pad = this._padding;
    this._worldBounds.x = minX - pad;
    this._worldBounds.y = minY - pad;
    this._worldBounds.w = (maxX - minX) + pad * 2;
    this._worldBounds.h = (maxY - minY) + pad * 2;
  }

  /**
   * Convert a mouse event on the minimap canvas to diagram-space
   * coordinates and pan the main canvas so that point is centred.
   */
  _panToMinimapPoint(e) {
    var rect = this.canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    var cw = this.canvas.width;
    var ch = this.canvas.height;
    var wb = this._worldBounds;

    var sx = cw / wb.w;
    var sy = ch / wb.h;
    var scale = Math.min(sx, sy);
    var ox = (cw - wb.w * scale) / 2;
    var oy = (ch - wb.h * scale) / 2;

    // Convert minimap pixel → diagram coordinate
    var dx = (mx - ox) / scale + wb.x;
    var dy = (my - oy) / scale + wb.y;

    // Centre the viewport on the clicked point
    var vb = this.editor.viewBox;
    this.editor.setViewBox(
      dx - vb.width / 2,
      dy - vb.height / 2,
      vb.width,
      vb.height
    );
    this.scheduleRender();
  }

  /** Bind mouse events on the minimap for click/drag panning. */
  _bindEvents() {
    var self = this;

    this._onContainerMouseDown = function (e) {
      e.preventDefault();
      e.stopPropagation();
      self._dragging = true;
      self._panToMinimapPoint(e);
    };

    this._onDocMouseMove = function (e) {
      if (!self._dragging) return;
      e.preventDefault();
      self._panToMinimapPoint(e);
    };

    this._onDocMouseUp = function () {
      self._dragging = false;
    };

    this.container.addEventListener('mousedown', this._onContainerMouseDown);
    document.addEventListener('mousemove', this._onDocMouseMove);
    document.addEventListener('mouseup', this._onDocMouseUp);
  }

  /** Remove all event listeners to prevent memory leaks. */
  destroy() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._onContainerMouseDown && this.container) {
      this.container.removeEventListener('mousedown', this._onContainerMouseDown);
    }
    if (this._onDocMouseMove) {
      document.removeEventListener('mousemove', this._onDocMouseMove);
    }
    if (this._onDocMouseUp) {
      document.removeEventListener('mouseup', this._onDocMouseUp);
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Minimap;
} else {
  window.Minimap = Minimap;
}
