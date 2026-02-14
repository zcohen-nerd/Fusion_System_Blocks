/**
 * ORTHOGONAL CONNECTION ROUTING ENGINE
 *
 * Provides Manhattan (right-angle) routing for connections between blocks,
 * with obstacle avoidance and waypoint support.
 *
 * Features:
 * - Routes connections using only horizontal and vertical segments
 * - Avoids routing through block bounding boxes
 * - Supports user-defined waypoints (bend points)
 * - Falls back to direct route if orthogonal path is excessively long
 * - Recalculates when blocks are moved
 *
 * Author: GitHub Copilot
 * Created: Issue #28
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
   * @param {number} [options.margin=20]       Clearance around blocks.
   * @param {number} [options.maxSegments=12]   Max segments before fallback.
   * @param {number} [options.stubLength=20]    Horizontal stub out of port.
   */
  constructor(options = {}) {
    this.margin = options.margin || 20;
    this.maxSegments = options.maxSegments || 12;
    this.stubLength = options.stubLength || 20;
  }

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

    // Build the ordered list of points to route through
    const points = [{ x: fromX, y: fromY }];
    waypoints.forEach(wp => points.push({ x: wp.x, y: wp.y }));
    points.push({ x: toX, y: toY });

    // If waypoints are specified, route segment-by-segment
    if (points.length > 2) {
      return this._routeThroughWaypoints(points, obstacles);
    }

    // Standard two-point routing
    return this._routeTwoPoints(fromX, fromY, toX, toY, obstacles);
  }

  /**
   * Route through a series of waypoints, connecting each consecutive pair.
   * @private
   */
  _routeThroughWaypoints(points, obstacles) {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const segments = this._computeSegments(
        points[i].x, points[i].y,
        points[i + 1].x, points[i + 1].y,
        obstacles,
        i === 0 // addStub only for first segment
      );
      // Append line-to commands (skip the first M for subsequent segments)
      segments.forEach(pt => {
        d += ` L ${pt.x} ${pt.y}`;
      });
    }
    return d;
  }

  /**
   * Standard two-point orthogonal routing with obstacle avoidance.
   * @private
   */
  _routeTwoPoints(fromX, fromY, toX, toY, obstacles) {
    const segments = this._computeSegments(fromX, fromY, toX, toY, obstacles, true);
    let d = `M ${fromX} ${fromY}`;
    segments.forEach(pt => {
      d += ` L ${pt.x} ${pt.y}`;
    });
    return d;
  }

  /**
   * Compute intermediate points for an orthogonal route between two points.
   * Returns array of {x, y} points (excluding the start point).
   * @private
   */
  _computeSegments(fromX, fromY, toX, toY, obstacles, addStub) {
    const m = this.margin;
    const stub = addStub ? this.stubLength : 0;

    // Simple case: horizontal connection (same Y, going left-to-right)
    if (Math.abs(fromY - toY) < 2 && toX > fromX) {
      return [{ x: toX, y: toY }];
    }

    // Standard case: source on right edge, target on left edge
    // Try the simplest 3-segment route: stub right, vertical, horizontal to target
    if (toX - fromX > stub * 2) {
      // Plenty of horizontal room — simple S-route
      const midX = (fromX + toX) / 2;
      const route = [
        { x: midX, y: fromY },
        { x: midX, y: toY },
        { x: toX, y: toY }
      ];
      if (!this._routeIntersectsAny(fromX, fromY, route, obstacles)) {
        return route;
      }
    }

    // Try stub + detour: go right from source, then up/down, across, down/up to target
    const stubX = fromX + stub;
    const backStubX = toX - stub;

    if (toX > fromX) {
      // Forward direction — try routing above or below obstacles
      const bestRoute = this._tryVerticalDetour(
        stubX, fromY, backStubX, toY, obstacles, m
      );
      if (bestRoute) {
        const route = [{ x: stubX, y: fromY }];
        bestRoute.forEach(pt => route.push(pt));
        route.push({ x: toX, y: toY });
        return route;
      }
    }

    // Backward connection (target to the left of source) — wrap around
    if (toX <= fromX) {
      const route = this._backwardRoute(fromX, fromY, toX, toY, obstacles, m, stub);
      if (route) return route;
    }

    // Fallback: simple three-segment route ignoring obstacles
    const midX = (fromX + toX) / 2;
    return [
      { x: midX, y: fromY },
      { x: midX, y: toY },
      { x: toX, y: toY }
    ];
  }

  /**
   * Try routing through a vertical detour between stubX and backStubX.
   * @private
   */
  _tryVerticalDetour(stubX, fromY, backStubX, toY, obstacles, margin) {
    // Try direct vertical at midpoint
    const midX = (stubX + backStubX) / 2;
    const directRoute = [
      { x: midX, y: fromY },
      { x: midX, y: toY },
      { x: backStubX, y: toY }
    ];
    if (!this._routeIntersectsAny(stubX, fromY, directRoute, obstacles)) {
      return directRoute;
    }

    // Try shifting the vertical segment left/right to avoid obstacles
    const shifts = [-40, 40, -80, 80, -120, 120];
    for (const shift of shifts) {
      const shiftedX = midX + shift;
      const route = [
        { x: shiftedX, y: fromY },
        { x: shiftedX, y: toY },
        { x: backStubX, y: toY }
      ];
      if (!this._routeIntersectsAny(stubX, fromY, route, obstacles)) {
        return route;
      }
    }

    // Try routing above or below all obstacles
    const allObs = obstacles || [];
    if (allObs.length > 0) {
      const minY = Math.min(...allObs.map(o => o.y)) - margin;
      const maxY = Math.max(...allObs.map(o => o.y + o.height)) + margin;

      // Try above
      const aboveY = Math.min(fromY, toY, minY) - margin;
      const aboveRoute = [
        { x: stubX, y: aboveY },
        { x: backStubX, y: aboveY },
        { x: backStubX, y: toY }
      ];
      if (!this._routeIntersectsAny(stubX, fromY, aboveRoute, obstacles)) {
        return aboveRoute;
      }

      // Try below
      const belowY = Math.max(fromY, toY, maxY) + margin;
      const belowRoute = [
        { x: stubX, y: belowY },
        { x: backStubX, y: belowY },
        { x: backStubX, y: toY }
      ];
      if (!this._routeIntersectsAny(stubX, fromY, belowRoute, obstacles)) {
        return belowRoute;
      }
    }

    return null;
  }

  /**
   * Route a backward connection (target left of source) around blocks.
   * @private
   */
  _backwardRoute(fromX, fromY, toX, toY, obstacles, margin, stub) {
    const allObs = obstacles || [];
    const stubX = fromX + stub;
    const backStubX = toX - stub;

    // Find bounds of all obstacles to route around them
    let topY, bottomY;
    if (allObs.length > 0) {
      topY = Math.min(...allObs.map(o => o.y)) - margin;
      bottomY = Math.max(...allObs.map(o => o.y + o.height)) + margin;
    } else {
      topY = Math.min(fromY, toY) - 60;
      bottomY = Math.max(fromY, toY) + 60;
    }

    // Choose whether to go above or below based on which is shorter
    const goAbove = Math.abs(fromY - topY) + Math.abs(toY - topY)
      < Math.abs(fromY - bottomY) + Math.abs(toY - bottomY);

    const detourY = goAbove ? topY : bottomY;

    const route = [
      { x: stubX, y: fromY },
      { x: stubX, y: detourY },
      { x: backStubX, y: detourY },
      { x: backStubX, y: toY },
      { x: toX, y: toY }
    ];

    return route;
  }

  /**
   * Check whether a route (sequence of points) intersects any obstacle rect.
   * Tests each segment of the polyline against each obstacle.
   * @private
   */
  _routeIntersectsAny(startX, startY, points, obstacles) {
    if (!obstacles || obstacles.length === 0) return false;
    let prevX = startX;
    let prevY = startY;
    for (const pt of points) {
      for (const obs of obstacles) {
        if (this._segmentIntersectsRect(prevX, prevY, pt.x, pt.y, obs)) {
          return true;
        }
      }
      prevX = pt.x;
      prevY = pt.y;
    }
    return false;
  }

  /**
   * Test whether a horizontal or vertical line segment intersects a rectangle.
   * The segment connects (x1,y1)→(x2,y2).
   * The rectangle is {x, y, width, height}.
   * @private
   */
  _segmentIntersectsRect(x1, y1, x2, y2, rect) {
    const m = 2; // small inset so touching edges don't count
    const rx = rect.x + m;
    const ry = rect.y + m;
    const rw = rect.width - 2 * m;
    const rh = rect.height - 2 * m;
    if (rw <= 0 || rh <= 0) return false;

    // Horizontal segment
    if (Math.abs(y1 - y2) < 1) {
      const segY = y1;
      const segMinX = Math.min(x1, x2);
      const segMaxX = Math.max(x1, x2);
      // Segment crosses rect vertically?
      if (segY > ry && segY < ry + rh) {
        // Segment overlaps rect horizontally?
        if (segMaxX > rx && segMinX < rx + rw) {
          return true;
        }
      }
      return false;
    }

    // Vertical segment
    if (Math.abs(x1 - x2) < 1) {
      const segX = x1;
      const segMinY = Math.min(y1, y2);
      const segMaxY = Math.max(y1, y2);
      if (segX > rx && segX < rx + rw) {
        if (segMaxY > ry && segMinY < ry + rh) {
          return true;
        }
      }
      return false;
    }

    // Diagonal segment — use AABB overlap as conservative check
    const segMinX = Math.min(x1, x2);
    const segMaxX = Math.max(x1, x2);
    const segMinY = Math.min(y1, y2);
    const segMaxY = Math.max(y1, y2);
    return !(segMaxX < rx || segMinX > rx + rw || segMaxY < ry || segMinY > ry + rh);
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrthogonalRouter;
} else {
  window.OrthogonalRouter = OrthogonalRouter;
}
