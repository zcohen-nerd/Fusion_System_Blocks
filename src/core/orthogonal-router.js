/**
 * ORTHOGONAL CONNECTION ROUTING ENGINE (A*-based)
 *
 * Provides Manhattan (right-angle) routing for connections between blocks
 * using A* pathfinding on a Hanan grid for reliable obstacle avoidance.
 *
 * Features:
 * - A* pathfinding on a Hanan grid built from obstacle boundaries
 * - Guaranteed obstacle avoidance (routes never cross block + margin zones)
 * - Bend penalty produces clean routes with minimal direction changes
 * - User-defined waypoints honored as intermediate routing targets
 * - Configurable timeout with automatic fallback to simple routing
 * - Rounded corners on path bends (quadratic Bézier)
 * - No hard segment cap
 *
 * Performance:
 * - Hanan grid has O(n) coordinates per axis → O(n²) nodes (n = obstacles)
 * - A* with Manhattan heuristic explores a small fraction of the grid
 * - Timeout (default 100 ms) prevents pathological cases from blocking UI
 * - Handles 100+ blocks with 200+ connections at interactive speed
 *
 * Author: GitHub Copilot
 * Created: Issue #28, rewritten for Issue #195
 * Module: Orthogonal Routing
 */

var logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

class OrthogonalRouter {
  /**
   * @param {Object} [options]
   * @param {number} [options.margin=20]       Clearance around blocks (px).
   * @param {number} [options.stubLength=20]   Kept for API compat (not used by A*).
   * @param {number} [options.cornerRadius=6]  Radius for rounded corners (px).
   * @param {number} [options.timeout=100]     A* timeout in ms before fallback.
   * @param {number} [options.bendPenalty=25]   Extra cost for each direction change.
   */
  constructor(options = {}) {
    this.margin = options.margin || 20;
    this.stubLength = options.stubLength || 20;
    this.cornerRadius = (typeof options.cornerRadius === 'number')
      ? options.cornerRadius : 6;
    this.timeout = options.timeout || 100;
    this.bendPenalty = options.bendPenalty || 25;
  }

  // =========================================================================
  // PUBLIC API (backward-compatible)
  // =========================================================================

  /**
   * Compute an orthogonal (Manhattan) SVG path string between two points,
   * routing around obstacle rectangles.
   *
   * @param {number} fromX  Source X (right edge of fromBlock).
   * @param {number} fromY  Source Y.
   * @param {number} toX    Target X (left edge of toBlock).
   * @param {number} toY    Target Y.
   * @param {Array<Object>} obstacles  Array of {x, y, width, height} rects.
   * @param {Array<Object>} [waypoints=[]]  User waypoints [{x, y}, ...].
   * @returns {string} SVG path `d` attribute.
   */
  computePath(fromX, fromY, toX, toY, obstacles, waypoints) {
    waypoints = waypoints || [];

    const points = [{ x: fromX, y: fromY }];
    waypoints.forEach(wp => points.push({ x: wp.x, y: wp.y }));
    points.push({ x: toX, y: toY });

    if (points.length > 2) {
      return this._routeThroughWaypoints(points, obstacles);
    }

    return this._routeTwoPoints(fromX, fromY, toX, toY, obstacles);
  }

  /**
   * Build obstacle list from diagram blocks, excluding the source and
   * target blocks of the connection being routed.
   *
   * @param {Array<Object>} blocks       All blocks in the diagram.
   * @param {string}        fromBlockId  Source block ID (exclude).
   * @param {string}        toBlockId    Target block ID (exclude).
   * @returns {Array<Object>} Obstacles as {x, y, width, height}.
   */
  buildObstacles(blocks, fromBlockId, toBlockId) {
    return (blocks || [])
      .filter(b => b.id !== fromBlockId && b.id !== toBlockId)
      .map(b => ({
        x: b.x,
        y: b.y,
        width: b.width || 120,
        height: b.height || 80
      }));
  }

  // =========================================================================
  // INTERNAL ROUTING
  // =========================================================================

  /**
   * Route between two endpoints using A* with fallback.
   * @private
   */
  _routeTwoPoints(fromX, fromY, toX, toY, obstacles) {
    // Trivial case: same Y, left-to-right, no obstacles in the way
    if (Math.abs(fromY - toY) < 2 && toX > fromX &&
        !this._segmentBlockedRaw(fromX, fromY, toX, toY, obstacles)) {
      return `M ${fromX} ${fromY} L ${toX} ${toY}`;
    }

    // A* pathfinding
    const path = this._astarRoute(fromX, fromY, toX, toY, obstacles);
    if (path && path.length > 0) {
      let d = `M ${fromX} ${fromY}`;
      for (const pt of path) d += ` L ${pt.x} ${pt.y}`;
      return d;
    }

    // Fallback: simple 3-segment route
    return this._fallbackRoute(fromX, fromY, toX, toY);
  }

  /**
   * Route through a series of waypoints, connecting each pair with A*.
   * @private
   */
  _routeThroughWaypoints(points, obstacles) {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const seg = this._astarRoute(
        points[i].x, points[i].y,
        points[i + 1].x, points[i + 1].y,
        obstacles
      );
      if (seg) {
        for (const pt of seg) d += ` L ${pt.x} ${pt.y}`;
      } else {
        // Fallback for this leg
        d += ` L ${points[i + 1].x} ${points[i + 1].y}`;
      }
    }
    return d;
  }

  /**
   * Simple 3-segment fallback when A* fails or times out.
   * @private
   */
  _fallbackRoute(fromX, fromY, toX, toY) {
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
  }

  // =========================================================================
  // A* PATHFINDING ON HANAN GRID
  // =========================================================================

  /**
   * Run A* on a Hanan grid to find an obstacle-free orthogonal path.
   * Returns array of {x,y} points (excluding start), or null on failure/timeout.
   * @private
   */
  _astarRoute(fromX, fromY, toX, toY, obstacles) {
    obstacles = obstacles || [];
    const m = this.margin;

    // ---- Build coordinate lines for the Hanan grid ----
    const xSet = new Set();
    const ySet = new Set();

    // Source and target
    xSet.add(fromX); xSet.add(toX);
    ySet.add(fromY); ySet.add(toY);

    // Midpoints between source and target for aesthetic routing
    xSet.add(Math.round((fromX + toX) / 2));
    ySet.add(Math.round((fromY + toY) / 2));

    // Obstacle edges and margin boundaries
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      xSet.add(o.x - m);
      xSet.add(o.x + o.width + m);
      ySet.add(o.y - m);
      ySet.add(o.y + o.height + m);
    }

    const xs = Array.from(xSet).sort((a, b) => a - b);
    const ys = Array.from(ySet).sort((a, b) => a - b);
    const cols = xs.length;
    const rows = ys.length;
    const totalNodes = rows * cols;

    // Memory cap: if grid exceeds ~50 000 nodes, skip A* and fall back
    if (totalNodes > 50000) {
      logger.warn('OrthogonalRouter: grid too large (' + totalNodes + ' nodes), falling back');
      return null;
    }

    // Map coordinates → indices for O(1) lookup
    const xIdx = new Map();
    for (let i = 0; i < cols; i++) xIdx.set(xs[i], i);
    const yIdx = new Map();
    for (let i = 0; i < rows; i++) yIdx.set(ys[i], i);

    const startXI = xIdx.get(fromX);
    const startYI = yIdx.get(fromY);
    const goalXI  = xIdx.get(toX);
    const goalYI  = yIdx.get(toY);

    if (startXI === undefined || startYI === undefined ||
        goalXI  === undefined || goalYI  === undefined) {
      return null;
    }

    // ---- Precompute blocked nodes ----
    // A node is blocked if it falls strictly inside any obstacle expanded by margin
    const blocked = new Uint8Array(totalNodes);
    for (let yi = 0; yi < rows; yi++) {
      for (let xi = 0; xi < cols; xi++) {
        if (this._pointInsideExpanded(xs[xi], ys[yi], obstacles, m)) {
          blocked[yi * cols + xi] = 1;
        }
      }
    }

    // Force start/end walkable (ports sit on block edges)
    const startK = startYI * cols + startXI;
    const goalK  = goalYI  * cols + goalXI;
    blocked[startK] = 0;
    blocked[goalK]  = 0;

    // ---- A* search ----
    const gScore = new Float64Array(totalNodes).fill(Infinity);
    const cameFrom = new Int32Array(totalNodes).fill(-1);
    // Track incoming direction: 0 = horizontal, 1 = vertical, -1 = none
    const inDir = new Int8Array(totalNodes).fill(-1);
    const closed = new Uint8Array(totalNodes);

    gScore[startK] = 0;
    const startH = Math.abs(xs[goalXI] - fromX) + Math.abs(ys[goalYI] - fromY);

    // Binary-heap priority queue storing [fScore, nodeKey]
    const heap = [];
    this._heapPush(heap, startH, startK);

    const hasPerf = typeof performance !== 'undefined' && performance.now;
    const now = hasPerf ? () => performance.now() : () => Date.now();
    const t0 = now();

    // Direction deltas: right, left, down, up
    const DX = [1, -1, 0, 0];
    const DY = [0, 0, 1, -1];
    const DIR_TYPE = [0, 0, 1, 1]; // 0 = horizontal, 1 = vertical

    let iterations = 0;

    while (heap.length > 0) {
      iterations++;
      // Check timeout every 512 iterations to amortise perf.now overhead
      if ((iterations & 511) === 0 && now() - t0 > this.timeout) {
        logger.warn('OrthogonalRouter: A* timeout after', iterations, 'iterations');
        return null;
      }

      const [, curK] = this._heapPop(heap);

      if (curK === goalK) {
        return this._reconstructPath(cameFrom, curK, xs, ys, cols);
      }

      if (closed[curK]) continue;
      closed[curK] = 1;

      const cxi = curK % cols;
      const cyi = (curK - cxi) / cols;

      for (let d = 0; d < 4; d++) {
        const nxi = cxi + DX[d];
        const nyi = cyi + DY[d];
        if (nxi < 0 || nxi >= cols || nyi < 0 || nyi >= rows) continue;

        const nK = nyi * cols + nxi;
        if (blocked[nK] || closed[nK]) continue;

        // Check that the segment doesn't cross any expanded obstacle interior
        if (this._segmentCrossesExpanded(
              xs[cxi], ys[cyi], xs[nxi], ys[nyi], obstacles, m)) {
          continue;
        }

        const dist = Math.abs(xs[nxi] - xs[cxi]) + Math.abs(ys[nyi] - ys[cyi]);
        let cost = dist;

        // Bend penalty: direction change adds extra cost to encourage
        // straighter routes with fewer turns
        if (inDir[curK] >= 0 && inDir[curK] !== DIR_TYPE[d]) {
          cost += this.bendPenalty;
        }

        const tentG = gScore[curK] + cost;
        if (tentG < gScore[nK]) {
          cameFrom[nK] = curK;
          inDir[nK] = DIR_TYPE[d];
          gScore[nK] = tentG;
          const h = Math.abs(xs[goalXI] - xs[nxi]) + Math.abs(ys[goalYI] - ys[nyi]);
          this._heapPush(heap, tentG + h, nK);
        }
      }
    }

    // No path found
    return null;
  }

  // =========================================================================
  // GRID HELPERS
  // =========================================================================

  /**
   * Check if a point is strictly inside any obstacle expanded by margin.
   * Points exactly on the expanded boundary are NOT considered inside,
   * allowing routes along margin edges.
   * @private
   */
  _pointInsideExpanded(x, y, obstacles, margin) {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (x > o.x - margin && x < o.x + o.width + margin &&
          y > o.y - margin && y < o.y + o.height + margin) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if an orthogonal segment crosses the strict interior of any
   * obstacle expanded by margin.  Boundary touching is allowed (eps tolerance).
   * @private
   */
  _segmentCrossesExpanded(x1, y1, x2, y2, obstacles, margin) {
    const eps = 0.5;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const rx = o.x - margin;
      const ry = o.y - margin;
      const rw = o.width + 2 * margin;
      const rh = o.height + 2 * margin;

      if (Math.abs(y1 - y2) < 1) {
        // Horizontal segment
        if (y1 > ry + eps && y1 < ry + rh - eps) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          if (maxX > rx + eps && minX < rx + rw - eps) return true;
        }
      } else if (Math.abs(x1 - x2) < 1) {
        // Vertical segment
        if (x1 > rx + eps && x1 < rx + rw - eps) {
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          if (maxY > ry + eps && minY < ry + rh - eps) return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a straight segment crosses any raw obstacle (small inset).
   * Used for trivial same-Y checks before invoking A*.
   * @private
   */
  _segmentBlockedRaw(x1, y1, x2, y2, obstacles) {
    if (!obstacles || obstacles.length === 0) return false;
    const inset = 2;
    for (let i = 0; i < obstacles.length; i++) {
      const rect = obstacles[i];
      const rx = rect.x + inset;
      const ry = rect.y + inset;
      const rw = rect.width - 2 * inset;
      const rh = rect.height - 2 * inset;
      if (rw <= 0 || rh <= 0) continue;
      if (Math.abs(y1 - y2) < 1) {
        if (y1 > ry && y1 < ry + rh) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          if (maxX > rx && minX < rx + rw) return true;
        }
      }
    }
    return false;
  }

  // =========================================================================
  // PATH RECONSTRUCTION & SIMPLIFICATION
  // =========================================================================

  /**
   * Reconstruct the A* path and remove collinear intermediate points.
   * @private
   */
  _reconstructPath(cameFrom, goalK, xs, ys, cols) {
    const raw = [];
    let k = goalK;
    while (k >= 0) {
      const xi = k % cols;
      const yi = (k - xi) / cols;
      raw.unshift({ x: xs[xi], y: ys[yi] });
      k = cameFrom[k];
    }
    // Skip the start point (already in the SVG M command)
    raw.shift();
    return this._simplifyCollinear(raw);
  }

  /**
   * Remove intermediate collinear points from a polyline.
   * @private
   */
  _simplifyCollinear(points) {
    if (points.length <= 1) return points;
    const result = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      const next = points[i + 1];
      const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
      const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
      if (!sameX && !sameY) {
        // Direction changes here — keep this corner
        result.push(curr);
      }
      // Otherwise collinear — skip
    }
    result.push(points[points.length - 1]);
    return result;
  }

  // =========================================================================
  // BINARY HEAP (min-heap by fScore)
  // =========================================================================

  /** @private */
  _heapPush(heap, f, k) {
    heap.push([f, k]);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      const tmp = heap[parent];
      heap[parent] = heap[i];
      heap[i] = tmp;
      i = parent;
    }
  }

  /** @private */
  _heapPop(heap) {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      const n = heap.length;
      for (;;) {
        let smallest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < n && heap[l][0] < heap[smallest][0]) smallest = l;
        if (r < n && heap[r][0] < heap[smallest][0]) smallest = r;
        if (smallest === i) break;
        const tmp = heap[smallest];
        heap[smallest] = heap[i];
        heap[i] = tmp;
        i = smallest;
      }
    }
    return top;
  }

  // =========================================================================
  // CORNER ROUNDING
  // =========================================================================

  /**
   * Post-process an SVG path string composed of M and L commands,
   * replacing each sharp corner with a smooth quadratic Bézier curve.
   *
   * The curve begins `radius` pixels before the corner along the
   * incoming segment and ends `radius` pixels after it along the
   * outgoing segment.  If a segment is too short, the radius is
   * clamped so arcs never overlap.
   *
   * @param {string} pathD     SVG path `d` attribute (M…L…L… format).
   * @param {number} [radius]  Corner radius in px (default: instance cornerRadius).
   * @returns {string} Rounded SVG path string.
   */
  roundCorners(pathD, radius) {
    if (typeof radius !== 'number') radius = this.cornerRadius;
    if (radius <= 0) return pathD;

    const points = OrthogonalRouter.parseMLPoints(pathD);
    if (points.length < 3) return pathD;

    return OrthogonalRouter.roundPoints(points, radius);
  }

  /**
   * Parse an SVG path `d` string into an array of {x, y} points.
   * Only handles M and L commands (which is all orthogonal paths use).
   * @param {string} pathD
   * @returns {Array<{x: number, y: number}>}
   */
  static parseMLPoints(pathD) {
    const points = [];
    const re = /([ML])\s*([-\d.]+)[\s,]+([-\d.]+)/gi;
    let match;
    while ((match = re.exec(pathD)) !== null) {
      points.push({ x: parseFloat(match[2]), y: parseFloat(match[3]) });
    }
    return points;
  }

  /**
   * Build a rounded SVG path from an array of points, inserting
   * quadratic Bézier curves at each interior corner.
   *
   * @param {Array<{x: number, y: number}>} points  Ordered polyline points.
   * @param {number} radius  Desired corner radius.
   * @returns {string} SVG path string.
   */
  static roundPoints(points, radius) {
    if (points.length < 3) {
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
      return d;
    }

    const segLen = [];
    for (let i = 0; i < points.length - 1; i++) {
      segLen.push(Math.hypot(
        points[i + 1].x - points[i].x,
        points[i + 1].y - points[i].y
      ));
    }

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const maxR = Math.min(segLen[i - 1] / 2, segLen[i] / 2);
      const r = Math.min(radius, maxR);

      if (r < 1) {
        d += ` L ${curr.x} ${curr.y}`;
        continue;
      }

      const inDx = (curr.x - prev.x) / segLen[i - 1];
      const inDy = (curr.y - prev.y) / segLen[i - 1];
      const outDx = (next.x - curr.x) / segLen[i];
      const outDy = (next.y - curr.y) / segLen[i];

      const startX = curr.x - inDx * r;
      const startY = curr.y - inDy * r;
      const endX = curr.x + outDx * r;
      const endY = curr.y + outDy * r;

      d += ` L ${startX} ${startY}`;
      d += ` Q ${curr.x} ${curr.y} ${endX} ${endY}`;
    }

    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;

    return d;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrthogonalRouter;
} else {
  window.OrthogonalRouter = OrthogonalRouter;
}
