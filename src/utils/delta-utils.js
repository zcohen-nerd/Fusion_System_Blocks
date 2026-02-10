/**
 * DELTA SERIALIZATION UTILITIES
 *
 * Computes JSON-Patch–style diffs between diagram snapshots and applies
 * patches received from the Python backend. This eliminates the need to
 * send the entire diagram JSON for every incremental update across the
 * Fusion 360 palette bridge.
 *
 * The patch format mirrors fsb_core/delta.py and uses RFC 6902 semantics:
 *   { op: "add"|"remove"|"replace", path: "/blocks/0/x", value: 20 }
 *
 * For arrays of objects with unique "id" keys (blocks, connections), the
 * diff matches elements by id rather than index so that reordering does
 * not produce spurious operations.
 *
 * @module DeltaUtils
 */

// eslint-disable-next-line no-unused-vars
var DeltaUtils = (function () {
  'use strict';

  /**
   * Deep-clone a value (JSON-safe).
   * @param {*} obj
   * @returns {*}
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -------------------------------------------------------------------
  // Patch computation
  // -------------------------------------------------------------------

  /**
   * Compute a JSON-Patch style diff between two plain objects.
   *
   * @param {Object} oldObj - The previous state.
   * @param {Object} newObj - The current state.
   * @returns {Array<{op: string, path: string, value?: *}>}
   */
  function computePatch(oldObj, newObj) {
    var ops = [];
    _diff(oldObj, newObj, '', ops);
    return ops;
  }

  function _diff(old, cur, path, ops) {
    if (_deepEqual(old, cur)) return;

    if (_isObject(old) && _isObject(cur)) {
      _diffDict(old, cur, path, ops);
    } else if (Array.isArray(old) && Array.isArray(cur)) {
      _diffList(old, cur, path, ops);
    } else {
      ops.push({ op: 'replace', path: path, value: cur });
    }
  }

  function _diffDict(old, cur, path, ops) {
    var keys = _union(Object.keys(old), Object.keys(cur));
    keys.sort();
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var childPath = path + '/' + key;
      if (!(key in old)) {
        ops.push({ op: 'add', path: childPath, value: cur[key] });
      } else if (!(key in cur)) {
        ops.push({ op: 'remove', path: childPath });
      } else {
        _diff(old[key], cur[key], childPath, ops);
      }
    }
  }

  function _diffList(old, cur, path, ops) {
    if (_isIdKeyed(old) && _isIdKeyed(cur)) {
      _diffListById(old, cur, path, ops);
    } else {
      _diffListByIndex(old, cur, path, ops);
    }
  }

  function _isIdKeyed(arr) {
    if (arr.length === 0) return false;
    var ids = {};
    for (var i = 0; i < arr.length; i++) {
      if (!_isObject(arr[i]) || !arr[i].id) return false;
      if (ids[arr[i].id]) return false; // duplicate
      ids[arr[i].id] = true;
    }
    return true;
  }

  function _diffListById(old, cur, path, ops) {
    var oldMap = {};
    var curMap = {};
    for (var i = 0; i < old.length; i++) oldMap[old[i].id] = { idx: i, item: old[i] };
    for (var j = 0; j < cur.length; j++) curMap[cur[j].id] = { idx: j, item: cur[j] };

    // Removed
    for (var id in oldMap) {
      if (!(id in curMap)) {
        ops.push({ op: 'remove', path: path + '/' + oldMap[id].idx });
      }
    }
    // Added
    for (var id2 in curMap) {
      if (!(id2 in oldMap)) {
        ops.push({ op: 'add', path: path + '/' + curMap[id2].idx, value: curMap[id2].item });
      }
    }
    // Modified
    for (var id3 in oldMap) {
      if (id3 in curMap) {
        _diff(oldMap[id3].item, curMap[id3].item, path + '/' + oldMap[id3].idx, ops);
      }
    }
  }

  function _diffListByIndex(old, cur, path, ops) {
    var max = Math.max(old.length, cur.length);
    for (var i = 0; i < max; i++) {
      var childPath = path + '/' + i;
      if (i >= old.length) {
        ops.push({ op: 'add', path: childPath, value: cur[i] });
      } else if (i >= cur.length) {
        ops.push({ op: 'remove', path: childPath });
      } else {
        _diff(old[i], cur[i], childPath, ops);
      }
    }
  }

  // -------------------------------------------------------------------
  // Patch application
  // -------------------------------------------------------------------

  /**
   * Apply a JSON-Patch array to a document. Returns a new object
   * (the original is not mutated).
   *
   * @param {Object} doc - The document to patch.
   * @param {Array} patch - Array of patch operations.
   * @returns {Object} The patched document.
   */
  function applyPatch(doc, patch) {
    var result = deepClone(doc);
    for (var i = 0; i < patch.length; i++) {
      _applyOp(result, patch[i]);
    }
    return result;
  }

  function _applyOp(doc, op) {
    var parts = op.path ? op.path.replace(/^\//, '').split('/') : [];
    if (parts.length === 0) return;

    var target = doc;
    for (var i = 0; i < parts.length - 1; i++) {
      target = Array.isArray(target) ? target[parseInt(parts[i], 10)] : target[parts[i]];
    }

    var finalKey = parts[parts.length - 1];

    if (Array.isArray(target)) {
      var idx = parseInt(finalKey, 10);
      if (op.op === 'add') {
        target.splice(idx, 0, op.value);
      } else if (op.op === 'remove') {
        if (idx < target.length) target.splice(idx, 1);
      } else if (op.op === 'replace') {
        target[idx] = op.value;
      }
    } else {
      if (op.op === 'add' || op.op === 'replace') {
        target[finalKey] = op.value;
      } else if (op.op === 'remove') {
        delete target[finalKey];
      }
    }
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  function _isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  function _deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function _union(a, b) {
    var set = {};
    var result = [];
    for (var i = 0; i < a.length; i++) { if (!set[a[i]]) { set[a[i]] = true; result.push(a[i]); } }
    for (var j = 0; j < b.length; j++) { if (!set[b[j]]) { set[b[j]] = true; result.push(b[j]); } }
    return result;
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  return {
    computePatch: computePatch,
    applyPatch: applyPatch,
    deepClone: deepClone
  };
})();
