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


class BridgeEvent(str, Enum):
    """Events sent from Python to JavaScript via ``palette.sendInfoToHTML``.

    These are the ``action`` parameter passed to ``sendInfoToHTML``
    and received by ``window.fusionJavaScriptHandler`` on the JS side.
    """

    NOTIFICATION = "notification"
    CAD_LINK = "cad-link"
    THUMBNAIL_UPDATED = "thumbnail-updated"
    ASSEMBLY_SEQUENCE = "assembly-sequence"
    ASSEMBLY_ERROR = "assembly-error"
    LIVING_BOM = "living-bom"
    BOM_ERROR = "bom-error"
    SERVICE_MANUAL = "service-manual"
    CHANGE_IMPACT = "change-impact"
