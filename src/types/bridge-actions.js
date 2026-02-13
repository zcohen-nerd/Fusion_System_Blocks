/**
 * BRIDGE ACTION CONSTANTS
 *
 * Shared action names for the Python ↔ JavaScript bridge.
 * These constants MUST stay in sync with fsb_core/bridge_actions.py.
 *
 * Convention:
 *   JS → Python actions use snake_case  (match Python handler names).
 *   Python → JS events  use kebab-case  (match JS conventions).
 */

// ---------------------------------------------------------------------------
// JS → Python  (sent via adsk.fusionSendData)
// ---------------------------------------------------------------------------
const BridgeAction = Object.freeze({
  SAVE_DIAGRAM:        'save_diagram',
  LOAD_DIAGRAM:        'load_diagram',
  APPLY_DELTA:         'apply_delta',
  EXPORT_REPORTS:      'export_reports',
  CHECK_RULES:         'check_rules',
  SYNC_COMPONENTS:     'sync_components',
  START_CAD_SELECTION: 'start_cad_selection',
  RESPONSE:            'response',
  BROWSE_FOLDER:       'browse_folder',
  LIST_DOCUMENTS:      'list_documents',
  SAVE_NAMED_DIAGRAM:  'save_named_diagram',
  LOAD_NAMED_DIAGRAM:  'load_named_diagram',
  DELETE_NAMED_DIAGRAM: 'delete_named_diagram',
});

// ---------------------------------------------------------------------------
// Python → JS  (received in window.fusionJavaScriptHandler)
// ---------------------------------------------------------------------------
const BridgeEvent = Object.freeze({
  NOTIFICATION:       'notification',
  CAD_LINK:           'cad-link',
  THUMBNAIL_UPDATED:  'thumbnail-updated',
  ASSEMBLY_SEQUENCE:  'assembly-sequence',
  ASSEMBLY_ERROR:     'assembly-error',
  LIVING_BOM:         'living-bom',
  BOM_ERROR:          'bom-error',
  SERVICE_MANUAL:     'service-manual',
  CHANGE_IMPACT:      'change-impact',
});
