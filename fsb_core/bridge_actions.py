"""Shared action constants for the Python ↔ JavaScript bridge.

These constants define the contract between the Python backend and the
JavaScript frontend.  Both sides MUST reference these names so that a
rename in one place automatically surfaces as a lint / import error in
the other — eliminating the "magic string" class of bugs.

Convention
----------
* **JS → Python** actions use snake_case  (match Python handler names).
* **Python → JS** actions use kebab-case  (match JavaScript conventions).
"""

from __future__ import annotations

from enum import Enum


class BridgeAction(str, Enum):
    """Actions sent from JavaScript to Python via ``adsk.fusionSendData``.

    Each value maps to a ``_handle_<value>`` method on
    ``PaletteHTMLEventHandler`` in ``Fusion_System_Blocks.py``.
    """

    SAVE_DIAGRAM = "save_diagram"
    LOAD_DIAGRAM = "load_diagram"
    APPLY_DELTA = "apply_delta"
    EXPORT_REPORTS = "export_reports"
    CHECK_RULES = "check_rules"
    SYNC_COMPONENTS = "sync_components"
    START_CAD_SELECTION = "start_cad_selection"
    RESPONSE = "response"
    BROWSE_FOLDER = "browse_folder"
    GET_PENDING_CAD_LINK = "get_pending_cad_link"
    LIST_DOCUMENTS = "list_documents"
    SAVE_NAMED_DIAGRAM = "save_named_diagram"
    LOAD_NAMED_DIAGRAM = "load_named_diagram"
    DELETE_NAMED_DIAGRAM = "delete_named_diagram"
    VALIDATE_REQUIREMENTS = "validate_requirements"
    CREATE_SNAPSHOT = "create_snapshot"
    LIST_SNAPSHOTS = "list_snapshots"
    RESTORE_SNAPSHOT = "restore_snapshot"
    COMPARE_SNAPSHOTS = "compare_snapshots"


class BridgeEvent(str, Enum):
    """Events sent from Python to JavaScript via ``palette.sendInfoToHTML``.

    Contract:
    * ``sendInfoToHTML`` always carries a JSON payload with the shape
      ``{"type": <event-name>, "data": {...}}``.
    * The ``action`` parameter mirrors ``payload.type`` for logging only.
    * JavaScript routes exclusively by ``payload.type``.
    """

    NOTIFICATION = "notification"
    CAD_LINK = "cad-link"
    THUMBNAIL_UPDATE = "thumbnail-update"
    BOM_UPDATE = "bom-update"
    SERVICE_MANUAL_UPDATE = "service-manual-update"
    CHANGE_IMPACT = "change-impact"
