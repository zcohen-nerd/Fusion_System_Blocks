/**
 * HTML UTILITY FUNCTIONS
 *
 * Shared helpers for safe HTML string handling used across the
 * System Blocks editor modules.
 *
 * @module HtmlUtils
 */

/**
 * Escape HTML special characters to prevent XSS when inserting
 * user-provided text into the DOM via innerHTML.
 *
 * @param {*} text - Value to escape (coerced to string).
 * @returns {string} The escaped string.
 */
function _escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
