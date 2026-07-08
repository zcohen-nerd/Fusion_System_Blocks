from __future__ import annotations

import datetime
import json
import os
import sys
import traceback
from typing import Any

import adsk.core
import adsk.fusion

# Add src directory to path so we can import our modules
SRC_PATH = os.path.join(os.path.dirname(__file__), "src")
if SRC_PATH not in sys.path:
    sys.path.insert(0, SRC_PATH)
import diagram_data  # noqa: E402

# Add repo root to path for core library
REPO_ROOT = os.path.dirname(__file__)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Import the core library for validation and action planning (hard dependency)
from fsb_core.bridge_actions import BridgeAction, BridgeEvent  # noqa: E402
from fsb_core.delta import apply_patch, is_trivial_patch  # noqa: E402
from fsb_core.requirements import validate_requirements  # noqa: E402
from fsb_core.serialization import (  # noqa: E402
    dict_to_graph,
    flatten_connections_for_js,
)
from fsb_core.version_control import SnapshotStore  # noqa: E402

# Import logging utilities
try:
    from fusion_addin.logging_util import (
        cleanup_old_logs,
        get_log_file_path,
        get_logger,
        log_environment_info,
        setup_logging,
    )

    _logger = get_logger("main")
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False
    _logger = None

# Import diagnostics module
try:
    from fusion_addin.diagnostics import (
        cleanup_any_remaining_temp_objects,
        run_diagnostics_and_show_result,
    )

    DIAGNOSTICS_AVAILABLE = True
except ImportError:
    DIAGNOSTICS_AVAILABLE = False

APP = adsk.core.Application.get()
UI = APP.userInterface
ATTR_GROUP = "systemBlocks"
SNAPSHOT_ATTR_NAME = "snapshots"

# Keep handler references on the owning Fusion object so command-scoped
# handlers are released with the command instead of leaking for the full session.
_handler_fallback_refs: dict[int, list[Any]] = {}

# Pending CAD link data — stored when sendInfoToHTML may arrive
# before the palette web-view is ready after being restored.
_pending_cad_link: dict | None = None

# Global snapshot store for version control (Issue #31).
# _snapshot_store_scope records which document scope the store was loaded
# for (None = default slot, otherwise the named-document slug) so that
# _persist_snapshot_store can refuse to write one document's history into
# another document's attribute.
_snapshot_store = SnapshotStore(max_snapshots=50)
_snapshot_store_scope: str | None = None

# Conservative cap for the serialized snapshot store. Fusion attribute
# values have finite size limits; exceeding them makes the write fail and
# silently drops the whole history, so we trim oldest snapshots instead.
_SNAPSHOT_STORE_MAX_BYTES = 1_500_000

# Workspace-activation handler reference so stop() can unregister it from
# Fusion's event (releasing only the Python reference leaves the handler
# registered, stacking duplicates across add-in restarts).
_workspace_activated_handler: Any | None = None


def _log_runtime_error(message: str, exc: Exception | None = None) -> None:
    """Log backend errors to both the add-in logger and Fusion, when available."""
    if LOGGING_AVAILABLE:
        if exc is None:
            _logger.error(message)
        else:
            _logger.exception("%s: %s", message, exc)

    try:
        if APP and hasattr(APP, "log"):
            APP.log(f"[FusionSystemBlocks] {message}")
    except Exception:
        pass


def _retain_handler(owner: Any, handler: Any) -> Any:
    """Keep a handler alive for the lifetime of its owning Fusion object."""
    if owner is None or handler is None:
        return handler

    try:
        handlers = getattr(owner, "_system_blocks_handlers", None)
        if handlers is None:
            handlers = []
            owner._system_blocks_handlers = handlers
        handlers.append(handler)
    except Exception:
        # Some Fusion proxy objects reject Python attributes; fall back to a
        # per-owner registry and clear it on the owner's destroy event.
        _handler_fallback_refs.setdefault(id(owner), []).append(handler)
    return handler


def _release_handlers(owner: Any) -> None:
    """Drop retained handlers when their owner command or UI object is done."""
    if owner is None:
        return

    try:
        handlers = getattr(owner, "_system_blocks_handlers", None)
        if handlers is not None:
            handlers.clear()
    except Exception:
        pass

    _handler_fallback_refs.pop(id(owner), None)


def _bridge_event_name(event_type: BridgeEvent | str) -> str:
    """Normalize bridge event names to the canonical payload.type string."""
    return event_type.value if isinstance(event_type, BridgeEvent) else str(event_type)


def _send_bridge_event(
    event_type: BridgeEvent | str,
    data: dict[str, Any] | None = None,
) -> bool:
    """Send a structured Python → JS event payload through Fusion's bridge."""
    event_name = _bridge_event_name(event_type)

    try:
        palette = UI.palettes.itemById("SystemBlocksPalette")
    except Exception:
        palette = None

    if not palette:
        return False

    payload = {
        "type": event_name,
        "data": data or {},
    }
    palette.sendInfoToHTML(event_name, json.dumps(payload))
    return True


def _snapshot_attr_name(slug: str | None = None) -> str:
    """Return the Fusion attribute name for the current snapshot scope."""
    if slug:
        return f"{SNAPSHOT_ATTR_NAME}_{_slug_from_label(slug)}"
    return SNAPSHOT_ATTR_NAME


def _load_snapshot_store(slug: str | None = None) -> SnapshotStore:
    """Restore persisted snapshots for the current Fusion document scope."""
    root_comp = get_root_component()
    if not root_comp:
        return SnapshotStore(max_snapshots=50)

    attr_name = _snapshot_attr_name(slug)

    try:
        for attr in root_comp.attributes:
            if attr.groupName == ATTR_GROUP and attr.name == attr_name:
                data = json.loads(attr.value)
                if isinstance(data, list):
                    return SnapshotStore.from_list(data, max_snapshots=50)
                break
    except Exception as exc:
        _log_runtime_error(
            f"Failed to load snapshot store for scope '{attr_name}'",
            exc,
        )

    return SnapshotStore(max_snapshots=50)


def _set_snapshot_store(slug: str | None = None) -> SnapshotStore:
    """Load and activate the snapshot store for the given document scope.

    All handlers must go through this helper (rather than assigning
    ``_snapshot_store`` directly) so ``_snapshot_store_scope`` stays in
    sync with the store's actual origin.
    """
    global _snapshot_store, _snapshot_store_scope
    _snapshot_store = _load_snapshot_store(slug)
    _snapshot_store_scope = _slug_from_label(slug) if slug else None
    return _snapshot_store


def _persist_snapshot_store(slug: str | None = None) -> bool:
    """Persist the current snapshot store with the active Fusion document."""
    # Guard against cross-scope writes: the in-memory store may hold a
    # different document's history (e.g. loaded for named doc "A" while
    # a save targets the default slot). Persisting it would overwrite
    # that scope's history with unrelated snapshots.
    target_scope = _slug_from_label(slug) if slug else None
    if target_scope != _snapshot_store_scope:
        _log_runtime_error(
            f"Refusing to persist snapshot store loaded for scope "
            f"'{_snapshot_store_scope}' into scope '{target_scope}'"
        )
        return False

    root_comp = get_root_component()
    if not root_comp:
        return False

    # Fusion attribute values have finite size limits — trim oldest
    # snapshots until the serialized store fits rather than letting the
    # whole write fail and lose the history.
    trimmed = _snapshot_store.trim_to_json_size(_SNAPSHOT_STORE_MAX_BYTES)
    if trimmed:
        _log_runtime_error(
            f"Snapshot store exceeded {_SNAPSHOT_STORE_MAX_BYTES} bytes; "
            f"dropped {trimmed} oldest snapshot(s) to fit"
        )
        notify_warning(
            f"Snapshot history was trimmed ({trimmed} oldest snapshot(s) "
            "removed) to fit document storage limits"
        )

    payload = json.dumps(_snapshot_store.to_list())
    if len(payload) > _SNAPSHOT_STORE_MAX_BYTES:
        # Even a single snapshot exceeds the budget — refuse rather than
        # attempt a write that Fusion may truncate or reject.
        _log_runtime_error(
            f"Refusing to persist snapshot store: a single snapshot exceeds "
            f"{_SNAPSHOT_STORE_MAX_BYTES} bytes"
        )
        return False

    attr_name = _snapshot_attr_name(slug)
    attrs = root_comp.attributes

    try:
        for attr in attrs:
            if attr.groupName == ATTR_GROUP and attr.name == attr_name:
                attr.deleteMe()
                break

        # Persist snapshots alongside the document so version history survives
        # add-in reloads and document switches.
        attrs.add(ATTR_GROUP, attr_name, payload)
        return True
    except Exception as exc:
        _log_runtime_error(
            f"Failed to persist snapshot store for scope '{attr_name}'",
            exc,
        )
        return False


def _iter_documents() -> list[Any]:
    """Enumerate open Fusion documents across API variants."""
    documents = getattr(APP, "documents", None)
    if not documents:
        return []

    try:
        count = getattr(documents, "count", None)
        if isinstance(count, int) and hasattr(documents, "item"):
            return [documents.item(index) for index in range(count)]
    except Exception:
        pass

    try:
        return list(documents)
    except Exception:
        return []


def _resolve_design_for_doc(doc_id: str) -> adsk.fusion.Design | None:
    """Resolve a Fusion design by document ID, with active-product fallback."""
    normalized_doc_id = str(doc_id or "").strip()

    if normalized_doc_id:
        for document in _iter_documents():
            try:
                data_file = getattr(document, "dataFile", None)
                if not data_file or getattr(data_file, "id", "") != normalized_doc_id:
                    continue

                products = getattr(document, "products", None)
                if products and hasattr(products, "itemByProductType"):
                    product = products.itemByProductType("DesignProductType")
                    design = adsk.fusion.Design.cast(product)
                    if design:
                        return design

                # Fallback: some API variants only expose the design of the
                # active document. Temporarily activate the target document,
                # grab its design, then restore the user's original document
                # — resolving a link must never permanently switch their
                # workspace.
                original_document = getattr(APP, "activeDocument", None)
                if original_document != document and hasattr(document, "activate"):
                    document.activate()
                    try:
                        adsk.doEvents()
                    except Exception:
                        pass

                design = adsk.fusion.Design.cast(APP.activeProduct)

                if (
                    original_document is not None
                    and original_document != document
                    and hasattr(original_document, "activate")
                ):
                    try:
                        original_document.activate()
                        adsk.doEvents()
                    except Exception:
                        _log_runtime_error(
                            "Failed to restore the previously active document "
                            "after design lookup"
                        )

                if design:
                    return design
            except Exception as exc:
                _log_runtime_error(
                    f"Failed to inspect Fusion document '{normalized_doc_id}'",
                    exc,
                )

        _log_runtime_error(
            f"Document '{normalized_doc_id}' not found; falling back to active design"
        )

    return adsk.fusion.Design.cast(APP.activeProduct)


class CommandScopeCleanupHandler(adsk.core.CommandEventHandler):
    """Release retained command handlers when the Fusion command is destroyed."""

    def __init__(self, owner: Any):
        super().__init__()
        self._owner = owner

    def notify(self, args):
        _release_handlers(self._owner)


def send_palette_notification(message: str, level: str = "info") -> None:
    """Send a non-blocking notification to the HTML palette.

    Args:
        message: The message to display.
        level: The severity level ('info', 'success', 'warning', 'error').
    """

    if _send_bridge_event(
        BridgeEvent.NOTIFICATION,
        {"message": message, "level": level},
    ):
        return

    else:
        UI.messageBox(message)


def notify_error(message: str) -> None:
    send_palette_notification(message, level="error")


def notify_warning(message: str) -> None:
    send_palette_notification(message, level="warning")


def notify_success(message: str) -> None:
    send_palette_notification(message, level="success")


def notify_info(message: str) -> None:
    send_palette_notification(message, level="info")


def _show_validation_errors_dialog(errors: list) -> None:
    """Display validation errors in a message box.

    Shows a formatted list of validation errors from the core library
    in a Fusion message box for user visibility.

    Args:
        errors: List of ValidationError instances from fsb_core.validation.
    """
    if not errors:
        return

    # Format errors for display
    lines = [f"Found {len(errors)} validation error(s):\n"]
    for i, error in enumerate(errors[:10], 1):  # Limit to first 10 errors
        code = error.code.value if hasattr(error.code, "value") else str(error.code)
        lines.append(f"{i}. [{code}] {error.message}")

    if len(errors) > 10:
        lines.append(f"\n... and {len(errors) - 10} more errors")

    error_text = "\n".join(lines)

    # Show in Fusion message box
    try:
        UI.messageBox(
            error_text,
            "Graph Validation Errors",
            adsk.core.MessageBoxButtonTypes.OKButtonType,
            adsk.core.MessageBoxIconTypes.WarningIconType,
        )
    except Exception:
        # Fallback to simple notification
        notify_error(error_text)


def get_root_component() -> adsk.fusion.Component | None:
    """Get the root component of the active design."""
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if design:
            return design.rootComponent
    except Exception:
        pass
    return None


def save_diagram_json(json_data: str | dict) -> bool:
    """Save diagram JSON to Fusion attributes.

    Does NOT validate on save — validation is only triggered by the
    explicit "Validate" / "Check Rules" button.  This lets users persist
    work-in-progress freely without being interrupted by warnings.

    Args:
        json_data: JSON string or already-parsed dict of the diagram.

    Returns:
        True if successful, False otherwise.
    """
    try:
        # Normalise: accept both dict and str so callers from the
        # JS bridge (which may pass either type) never crash.
        if isinstance(json_data, dict):
            json_data = json.dumps(json_data)
        else:
            json.loads(json_data)

        root_comp = get_root_component()
        if not root_comp:
            notify_error("No active design found")
            return False

        attrs = root_comp.attributes

        # Remove existing attribute if it exists
        for attr in attrs:
            if attr.groupName == ATTR_GROUP and attr.name == "diagramJson":
                attr.deleteMe()
                break

        # Add new attribute
        attrs.add(ATTR_GROUP, "diagramJson", json_data)
        return True

    except Exception as e:
        notify_error(f"Failed to save diagram: {str(e)}")
        return False


def load_diagram_json():
    """Load diagram JSON from Fusion attributes."""
    try:
        root_comp = get_root_component()
        if not root_comp:
            return None

        attrs = root_comp.attributes

        for attr in attrs:
            if attr.groupName == ATTR_GROUP and attr.name == "diagramJson":
                return attr.value

        return None

    except Exception as e:
        notify_error(f"Failed to load diagram: {str(e)}")
        return None


def load_diagram_data():
    """Return the current diagram as a Python dictionary."""
    diagram_json = load_diagram_json()
    if not diagram_json:
        return None

    if isinstance(diagram_json, dict):
        return diagram_json

    try:
        return json.loads(diagram_json)
    except (json.JSONDecodeError, TypeError) as exc:
        notify_error(f"Invalid diagram data: {exc}")
        return None


# ── Named document helpers ──────────────────────────────────────────────
# Each named document is stored as an attribute:
#   group = ATTR_GROUP, name = "doc_<slug>"
# A manifest attribute "docIndex" holds a JSON list of
# { "slug": "<slug>", "label": "<user name>", "modified": "<ISO>" }.


def _doc_attr_name(slug: str) -> str:
    """Return the Fusion attribute name for a named document."""
    return f"doc_{slug}"


def _slug_from_label(label: str) -> str:
    """Derive a filesystem-safe slug from a user-visible label."""
    import re

    slug = re.sub(r"[^a-zA-Z0-9_-]", "_", label.strip())[:64]
    return slug or "untitled"


def _resolve_unique_slug(label: str) -> str:
    """Resolve a slug for a Save As, avoiding cross-document collisions.

    Slugging is lossy ("My Design!" and "My Design?" both become
    "My_Design_"), so a new document could silently overwrite an
    unrelated existing one. If the derived slug is taken by a document
    with a *different* label, append a numeric suffix until free.
    Saving with the same label as an existing document keeps its slug
    (intentional overwrite of the same-named document).
    """
    base = _slug_from_label(label)
    taken = {entry.get("slug"): entry.get("label") for entry in list_named_diagrams()}

    if base not in taken or taken[base] == label:
        return base

    suffix = 2
    while True:
        candidate = f"{base[:60]}_{suffix}"
        if candidate not in taken or taken[candidate] == label:
            return candidate
        suffix += 1


def list_named_diagrams() -> list[dict[str, str]]:
    """Return the list of named documents stored on the root component.

    Returns:
        List of dicts with keys 'slug', 'label', 'modified'.
    """
    try:
        root_comp = get_root_component()
        if not root_comp:
            return []
        for attr in root_comp.attributes:
            if attr.groupName == ATTR_GROUP and attr.name == "docIndex":
                return json.loads(attr.value)
    except Exception:
        pass
    return []


def _save_doc_index(index: list[dict[str, str]]) -> None:
    """Persist the document manifest to a Fusion attribute."""
    root_comp = get_root_component()
    if not root_comp:
        return
    attrs = root_comp.attributes
    for attr in attrs:
        if attr.groupName == ATTR_GROUP and attr.name == "docIndex":
            attr.deleteMe()
            break
    attrs.add(ATTR_GROUP, "docIndex", json.dumps(index))


def save_named_diagram(
    label: str,
    json_data: str | dict,
    slug: str | None = None,
) -> bool:
    """Save a diagram under a user-chosen name.

    Args:
        label: User-visible name for the document.
        json_data: JSON string or already-parsed dict of the diagram.

    Returns:
        True on success.
    """
    # Normalise to string for attribute storage
    if isinstance(json_data, dict):
        json_data = json.dumps(json_data)
    try:
        resolved_slug = _slug_from_label(slug) if slug else _slug_from_label(label)
        root_comp = get_root_component()
        if not root_comp:
            notify_error("No active design found")
            return False

        attr_name = _doc_attr_name(resolved_slug)
        attrs = root_comp.attributes
        # Remove existing attribute with same name
        for attr in attrs:
            if attr.groupName == ATTR_GROUP and attr.name == attr_name:
                attr.deleteMe()
                break
        attrs.add(ATTR_GROUP, attr_name, json_data)

        # Update manifest
        index = list_named_diagrams()
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        entry = next((e for e in index if e["slug"] == resolved_slug), None)
        if entry:
            entry["modified"] = now
            entry["label"] = label
        else:
            index.append(
                {
                    "slug": resolved_slug,
                    "label": label,
                    "modified": now,
                }
            )
        _save_doc_index(index)
        return True
    except Exception as e:
        notify_error(f"Failed to save named diagram: {e}")
        return False


def load_named_diagram(slug: str) -> str | None:
    """Load a named diagram's JSON by slug.

    Args:
        slug: The document slug.

    Returns:
        JSON string or None.
    """
    try:
        root_comp = get_root_component()
        if not root_comp:
            return None
        attr_name = _doc_attr_name(slug)
        for attr in root_comp.attributes:
            if attr.groupName == ATTR_GROUP and attr.name == attr_name:
                return attr.value
    except Exception as e:
        notify_error(f"Failed to load named diagram: {e}")
    return None


def delete_named_diagram(slug: str) -> bool:
    """Delete a named diagram.

    Args:
        slug: The document slug to remove.

    Returns:
        True on success.
    """
    try:
        root_comp = get_root_component()
        if not root_comp:
            return False
        attr_name = _doc_attr_name(slug)
        for attr in root_comp.attributes:
            if attr.groupName == ATTR_GROUP and attr.name == attr_name:
                attr.deleteMe()
                break
        index = [e for e in list_named_diagrams() if e["slug"] != slug]
        _save_doc_index(index)
        return True
    except Exception as e:
        notify_error(f"Failed to delete named diagram: {e}")
        return False


class DiagnosticsCommandHandler(adsk.core.CommandCreatedEventHandler):
    """Handler for the Run Diagnostics command.

    When the command is executed, runs all diagnostic tests and
    displays a summary in a message box.
    """

    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            if LOGGING_AVAILABLE:
                _logger.debug("DiagnosticsCommandHandler.notify() called")

            command = args.command
            # Keep execute handlers attached to the command lifetime.
            on_execute = DiagnosticsExecuteHandler()
            command.execute.add(on_execute)
            _retain_handler(command, on_execute)

            cleanup_handler = CommandScopeCleanupHandler(command)
            command.destroy.add(cleanup_handler)
            _retain_handler(command, cleanup_handler)

        except Exception as e:
            if LOGGING_AVAILABLE:
                _logger.exception(f"Error in DiagnosticsCommandHandler: {e}")
            notify_error(f"Error in diagnostics command: {str(e)}")


class DiagnosticsExecuteHandler(adsk.core.CommandEventHandler):
    """Execute handler that runs the diagnostics suite."""

    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            if LOGGING_AVAILABLE:
                _logger.info("Running diagnostics suite...")

            if DIAGNOSTICS_AVAILABLE:
                run_diagnostics_and_show_result()
            else:
                notify_warning(
                    "Diagnostics module not available. "
                    "Check that fusion_addin/diagnostics.py exists."
                )

        except Exception as e:
            if LOGGING_AVAILABLE:
                _logger.exception(f"Error running diagnostics: {e}")
            notify_error(f"Diagnostics failed: {str(e)}")


class SystemBlocksPaletteShowCommandHandler(adsk.core.CommandCreatedEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            if LOGGING_AVAILABLE:
                _logger.debug("SystemBlocksPaletteShowCommandHandler.notify() called")

            # Get the command created event args
            command = args.command

            # Keep execute handlers attached to the command lifetime.
            on_execute = CommandExecuteHandler()
            command.execute.add(on_execute)
            _retain_handler(command, on_execute)

            cleanup_handler = CommandScopeCleanupHandler(command)
            command.destroy.add(cleanup_handler)
            _retain_handler(command, cleanup_handler)

            if LOGGING_AVAILABLE:
                _logger.debug("CommandExecuteHandler added successfully")

        except Exception as e:
            if LOGGING_AVAILABLE:
                _logger.exception(
                    f"Error in SystemBlocksPaletteShowCommandHandler: {e}"
                )
            notify_error(f"Error in command created handler: {str(e)}")


class CommandExecuteHandler(adsk.core.CommandEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            # Get the palette
            palette = UI.palettes.itemById("SystemBlocksPalette")
            if not palette:
                palette = _create_palette()

            if palette:
                palette.isVisible = True

        except Exception as e:
            notify_error(f"Error showing palette: {str(e)}")


class PaletteHTMLEventHandler(adsk.core.HTMLEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            htmlArgs = adsk.core.HTMLEventArgs.cast(args)
            data = json.loads(htmlArgs.data) if htmlArgs.data else {}
            action = htmlArgs.action

            if LOGGING_AVAILABLE:
                _logger.debug(f"HTML event received: action='{action}'")

            try:
                action_enum = BridgeAction(action)
            except ValueError:
                if LOGGING_AVAILABLE:
                    _logger.warning(
                        f"Action '{action}' is not in BridgeAction enum — "
                        "update fsb_core/bridge_actions.py and src/types/bridge-actions.js"
                    )
                htmlArgs.returnData = json.dumps(
                    {
                        "success": False,
                        "error": f"Unknown action: {action}",
                    }
                )
                return

            handler_name = f"_handle_{action_enum.value}"
            if hasattr(self, handler_name):
                handler = getattr(self, handler_name)
                response = handler(data)
                htmlArgs.returnData = json.dumps(response)
                if LOGGING_AVAILABLE:
                    _logger.debug(
                        f"HTML event handled: action='{action}', "
                        f"success={response.get('success', 'N/A')}"
                    )
            else:
                if LOGGING_AVAILABLE:
                    _logger.warning(f"Unknown HTML action: '{action}'")
                htmlArgs.returnData = json.dumps(
                    {"success": False, "error": f"Unknown action: {action}"}
                )

        except Exception as e:
            if LOGGING_AVAILABLE:
                _logger.exception(f"Error in PaletteHTMLEventHandler: {e}")
            notify_error(f"Error in HTML event handler: {str(e)}")
            if args:
                args.returnData = json.dumps({"success": False, "error": str(e)})

    def _handle_save_diagram(self, data: dict[str, Any]) -> dict[str, Any]:
        json_data = data.get("diagram", "{}")
        success = save_diagram_json(json_data)
        if success:
            # A plain save targets the default document scope. If the
            # active store was loaded for a named document, reload the
            # default-scope store first so its history is never
            # overwritten with another document's snapshots.
            if _snapshot_store_scope is not None:
                _set_snapshot_store()
            _persist_snapshot_store()
            return {
                "success": True,
                "snapshots": _snapshot_store.list_snapshots(),
            }
        return {"success": False, "error": "Diagram validation or save failed"}

    def _handle_load_diagram(self, data: dict[str, Any]) -> dict[str, Any]:
        diagram_json = load_diagram_json()
        if diagram_json:
            try:
                diagram_dict = (
                    diagram_json
                    if isinstance(diagram_json, dict)
                    else json.loads(diagram_json)
                )
            except json.JSONDecodeError as exc:
                notify_error(f"Invalid diagram data: {str(exc)}")
                diagram_dict = diagram_data.create_empty_diagram()
        else:
            diagram_dict = diagram_data.create_empty_diagram()

        # Reload persisted history whenever the active diagram is opened.
        _set_snapshot_store()
        return {
            "success": True,
            "diagram": diagram_dict,
            "snapshots": _snapshot_store.list_snapshots(),
        }

    def _validate_patch_ops(self, patch: list[Any]) -> str | None:
        """Validate patch operation structure and allowed target roots.

        Returns an error string when invalid, otherwise ``None``.
        """
        allowed_ops = {"add", "remove", "replace"}
        allowed_roots = {
            "blocks",
            "connections",
            "groups",
            "namedStubs",
            "metadata",
        }

        for idx, op in enumerate(patch):
            if not isinstance(op, dict):
                return f"Invalid patch op at index {idx}: expected object"

            operation = op.get("op")
            path = op.get("path")

            if operation not in allowed_ops:
                return f"Invalid patch op at index {idx}: unsupported op '{operation}'"

            if not isinstance(path, str) or not path.startswith("/"):
                return f"Invalid patch op at index {idx}: path must start with '/'"

            parts = [part for part in path.split("/") if part]
            if not parts:
                return (
                    f"Invalid patch op at index {idx}: root-path operations "
                    "are not allowed"
                )

            if parts[0] not in allowed_roots:
                return (
                    f"Invalid patch op at index {idx}: root '{parts[0]}' "
                    "is not patchable"
                )

            if operation in {"add", "replace"} and "value" not in op:
                return (
                    f"Invalid patch op at index {idx}: '{operation}' requires 'value'"
                )

        return None

    def _handle_apply_delta(self, data: dict[str, Any]) -> dict[str, Any]:
        """Apply a JSON-Patch delta to the persisted diagram.

        Expects ``data`` to contain a ``patch`` list of RFC 6902
        operations.  The current diagram is loaded from Fusion
        attributes, the patch is applied, and the result is saved back.

        If the patch is trivial (empty), we skip I/O entirely and
        return early.
        """
        patch = data.get("patch", [])
        if not isinstance(patch, list):
            return {"success": False, "error": "Patch must be a list of operations"}

        validation_error = self._validate_patch_ops(patch)
        if validation_error:
            return {"success": False, "error": validation_error}

        if is_trivial_patch(patch):
            return {"success": True, "patched": False}

        diagram_json = load_diagram_json()
        if not diagram_json:
            return {"success": False, "error": "No diagram to patch"}

        try:
            current = (
                diagram_json
                if isinstance(diagram_json, dict)
                else json.loads(diagram_json)
            )
        except json.JSONDecodeError as exc:
            return {"success": False, "error": f"Invalid stored diagram: {exc}"}

        try:
            updated = apply_patch(current, patch)
        except Exception as exc:
            return {"success": False, "error": f"Patch failed: {exc}"}

        success = save_diagram_json(json.dumps(updated))
        if success:
            return {"success": True, "patched": True}
        return {"success": False, "error": "Save after patching failed"}

    def _handle_export_reports(self, data: dict[str, Any]) -> dict[str, Any]:
        """Export diagram report files in selected formats."""
        try:
            diagram_json = data.get("diagram", "{}")
            diagram = (
                diagram_json
                if isinstance(diagram_json, dict)
                else json.loads(diagram_json)
            )
        except (json.JSONDecodeError, TypeError) as exc:
            return {
                "success": False,
                "error": f"Invalid diagram data: {exc}",
            }

        profile = data.get("profile", "full")

        # Support custom output path from the export dialog
        custom_path = data.get("outputPath", "")
        addin_path = os.path.dirname(__file__)
        if custom_path and os.path.isabs(custom_path):
            exports_path = custom_path
        else:
            exports_path = os.path.join(addin_path, "exports")

        try:
            os.makedirs(exports_path, exist_ok=True)
        except OSError as exc:
            return {
                "success": False,
                "error": f"Cannot create export folder: {exc}",
            }

        # Support selective format list from the export dialog
        selected_formats = data.get("formats", None)

        if LOGGING_AVAILABLE:
            _logger.debug(
                f"Export: profile={profile}, formats={selected_formats}, "
                f"path={exports_path}"
            )

        try:
            files_created = diagram_data.export_report_files(
                diagram,
                exports_path,
                profile=profile,
                selected_formats=selected_formats,
            )
        except Exception as exc:
            if LOGGING_AVAILABLE:
                _logger.exception(f"export_report_files failed: {exc}")
            return {
                "success": False,
                "error": f"Export generation failed: {exc}",
            }

        # Convert dict to list of file paths for consistent JS handling
        if isinstance(files_created, dict):
            error = files_created.pop("error", None)
            file_list = list(files_created.values())
            if error:
                return {
                    "success": False,
                    "error": error,
                    "files": file_list,
                    "path": exports_path,
                }
            return {
                "success": True,
                "files": file_list,
                "path": exports_path,
            }
        return {
            "success": True,
            "files": files_created,
            "path": exports_path,
        }

    def _handle_check_rules(self, data: dict[str, Any]) -> dict[str, Any]:
        diagram_json = data.get("diagram", "{}")
        diagram = (
            diagram_json if isinstance(diagram_json, dict) else json.loads(diagram_json)
        )
        rule_results = diagram_data.run_all_rule_checks(diagram)
        return {"success": True, "results": rule_results}

    def _handle_sync_components(self, data: dict[str, Any]) -> dict[str, Any]:
        diagram_json = data.get("diagram", "{}")
        diagram = (
            diagram_json if isinstance(diagram_json, dict) else json.loads(diagram_json)
        )
        sync_results = sync_all_components_in_fusion(diagram)
        # Return the updated diagram so JS receives synced component data
        sync_results["diagram"] = diagram
        return sync_results

    def _handle_start_cad_selection(self, data: dict[str, Any]) -> dict[str, Any]:
        block_id = data.get("blockId", "")
        block_name = data.get("blockName", "Unknown Block")
        start_cad_selection(block_id, block_name)
        return {"success": True}

    def _handle_get_pending_cad_link(self, data: dict[str, Any]) -> dict[str, Any]:
        """Return and clear any pending CAD link data.

        The JS side polls this after ``start_cad_selection`` to
        retrieve the result if the push via ``sendInfoToHTML``
        was missed due to web-view reload timing.
        """
        global _pending_cad_link
        if _pending_cad_link is not None:
            result = _pending_cad_link
            _pending_cad_link = None
            return {"success": True, "linkData": result}
        return {"success": False, "pending": True}

    def _handle_browse_folder(self, data: dict[str, Any]) -> dict[str, Any]:
        """Open a native folder-picker dialog so the user can choose
        an export destination."""
        try:
            folder_dlg = UI.createFolderDialog()
            folder_dlg.title = "Select Export Destination"
            result = folder_dlg.showDialog()
            if result == adsk.core.DialogResults.DialogOK:
                return {"success": True, "path": folder_dlg.folder}
            return {"success": False, "error": "Cancelled"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _handle_response(self, data: dict[str, Any]) -> dict[str, Any]:
        """Acknowledge response events from Fusion's palette bridge."""
        return {"success": True}

    # ── Named document handlers ──────────────────────────────────────

    def _handle_list_documents(self, data: dict[str, Any]) -> dict[str, Any]:
        """Return the manifest of all saved named diagrams."""
        docs = list_named_diagrams()
        return {"success": True, "documents": docs}

    def _handle_save_named_diagram(self, data: dict[str, Any]) -> dict[str, Any]:
        """Save diagram under a user-chosen name."""
        slug = str(data.get("slug", "") or "").strip()
        label = str(data.get("label", "") or "").strip()
        json_data = data.get("diagram", "{}")

        # If caller passed only slug (regular Save on an opened named doc),
        # recover the existing label from the manifest.
        if not label and slug:
            docs = list_named_diagrams()
            existing = next((d for d in docs if d.get("slug") == slug), None)
            label = existing.get("label", slug) if existing else slug
        if not label:
            label = "Untitled"

        # Explicit slug = regular Save on an opened document (overwrite is
        # intended). Label-only = Save As: pick a collision-free slug so a
        # new document can never silently overwrite an unrelated one whose
        # label happens to produce the same slug.
        resolved_slug = _slug_from_label(slug) if slug else _resolve_unique_slug(label)
        ok = save_named_diagram(label, json_data, slug=resolved_slug)
        if ok:
            # Keep the default open/load slot in sync with the latest saved
            # named document so plain "Open" returns the newest content.
            save_diagram_json(json_data)
            # Activate the named document's own snapshot history. Saving a
            # named diagram creates no snapshots, so nothing is persisted
            # here — persisting the previously-loaded store could write one
            # document's history into another's scope.
            _set_snapshot_store(resolved_slug)
            return {
                "success": True,
                "documents": list_named_diagrams(),
                "slug": resolved_slug,
                "label": label,
                "snapshots": _snapshot_store.list_snapshots(),
            }
        return {"success": False, "error": "Save failed"}

    def _handle_load_named_diagram(self, data: dict[str, Any]) -> dict[str, Any]:
        """Load a named diagram by slug."""
        slug = data.get("slug", "")
        json_str = load_named_diagram(slug)
        if json_str:
            try:
                diagram = json.loads(json_str)
            except json.JSONDecodeError:
                diagram = diagram_data.create_empty_diagram()
            _set_snapshot_store(slug)
            docs = list_named_diagrams()
            existing = next((d for d in docs if d.get("slug") == slug), None)
            label = existing.get("label", slug) if existing else slug
            return {
                "success": True,
                "diagram": diagram,
                "slug": slug,
                "label": label,
                "snapshots": _snapshot_store.list_snapshots(),
            }
        return {"success": False, "error": "Document not found"}

    def _handle_delete_named_diagram(self, data: dict[str, Any]) -> dict[str, Any]:
        """Delete a named document."""
        slug = data.get("slug", "")
        ok = delete_named_diagram(slug)
        if ok:
            return {"success": True, "documents": list_named_diagrams()}
        return {"success": False, "error": "Delete failed"}

    # ── Requirements & Version Control (Issue #31) ───────────────────

    def _handle_validate_requirements(self, data: dict[str, Any]) -> dict[str, Any]:
        """Evaluate all requirements on the current diagram.

        Returns pass/fail results for every requirement defined
        on the graph.
        """
        try:
            diagram_json = data.get("diagram", "{}")
            diagram = (
                diagram_json
                if isinstance(diagram_json, dict)
                else json.loads(diagram_json)
            )
            graph = dict_to_graph(diagram)
            results = validate_requirements(graph)
            return {
                "success": True,
                "results": [r.to_dict() for r in results],
            }
        except Exception as exc:
            return {
                "success": False,
                "error": f"Requirement validation failed: {exc}",
            }

    def _handle_create_snapshot(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create a version-control snapshot of the current diagram.

        The diagram is stored verbatim (no Graph round-trip) so that
        JS-side fields — block sizes/shapes, child diagrams, annotations,
        connection waypoints — survive a later restore unchanged.
        """
        try:
            slug = str(data.get("slug", "") or "").strip() or None
            _set_snapshot_store(slug)
            diagram_json = data.get("diagram", "{}")
            diagram = (
                diagram_json
                if isinstance(diagram_json, dict)
                else json.loads(diagram_json)
            )
            author = data.get("author", "")
            description = data.get("description", "")
            snap = _snapshot_store.add_document(
                diagram,
                author=author,
                description=description,
            )
            _persist_snapshot_store(slug)
            return {
                "success": True,
                "snapshotId": snap.id,
                "snapshots": _snapshot_store.list_snapshots(),
            }
        except Exception as exc:
            return {
                "success": False,
                "error": f"Snapshot creation failed: {exc}",
            }

    def _handle_list_snapshots(self, data: dict[str, Any]) -> dict[str, Any]:
        """Return the list of stored snapshots."""
        slug = str(data.get("slug", "") or "").strip() or None
        _set_snapshot_store(slug)
        return {
            "success": True,
            "snapshots": _snapshot_store.list_snapshots(),
        }

    def _handle_restore_snapshot(self, data: dict[str, Any]) -> dict[str, Any]:
        """Restore the diagram to a previous snapshot.

        Snapshots are stored as verbatim documents, so restore returns
        them unchanged. Legacy snapshots that were captured through the
        Graph model carry nested-format connections, which the JS editor
        would drop — flatten those before returning.
        """
        slug = str(data.get("slug", "") or "").strip() or None
        _set_snapshot_store(slug)
        snapshot_id = data.get("snapshotId", "")
        try:
            diagram = _snapshot_store.restore_document(snapshot_id)
            diagram = flatten_connections_for_js(diagram)
            return {
                "success": True,
                "diagram": diagram,
                "snapshots": _snapshot_store.list_snapshots(),
            }
        except KeyError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {
                "success": False,
                "error": f"Snapshot restore failed: {exc}",
            }

    def _handle_compare_snapshots(self, data: dict[str, Any]) -> dict[str, Any]:
        """Compare two snapshots and return a structured diff."""
        slug = str(data.get("slug", "") or "").strip() or None
        _set_snapshot_store(slug)
        old_id = data.get("oldId", "")
        new_id = data.get("newId", "")
        try:
            diff = _snapshot_store.compare(old_id, new_id)
            return {
                "success": True,
                "diff": {
                    "addedBlockIds": diff.added_block_ids,
                    "removedBlockIds": diff.removed_block_ids,
                    "modifiedBlockIds": diff.modified_block_ids,
                    "connectionChanges": [
                        {
                            "connectionId": c.connection_id,
                            "changeType": c.change_type,
                            "details": c.details,
                        }
                        for c in diff.connection_changes
                    ],
                },
            }
        except KeyError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {
                "success": False,
                "error": f"Snapshot comparison failed: {exc}",
            }


def _create_palette() -> adsk.core.Palette | None:
    """Create the System Blocks palette."""
    try:
        addin_path = os.path.dirname(__file__)
        html_file = os.path.join(addin_path, "src", "palette.html")

        # Convert Windows path to file URL format
        html_file = html_file.replace("\\", "/")
        if not html_file.startswith("file:///"):
            html_file = "file:///" + html_file

        palette = UI.palettes.add(
            "SystemBlocksPalette",
            "System Blocks Diagram",
            html_file,
            True,  # isVisible
            True,  # showCloseButton
            True,  # isResizable
            300,  # width
            600,  # height
            True,  # useNewWebBrowser
        )

        # Add HTML event handler
        on_html_event = PaletteHTMLEventHandler()
        palette.incomingFromHTML.add(on_html_event)
        _retain_handler(palette, on_html_event)

        return palette
    except Exception as e:
        notify_error(f"Failed to create palette: {str(e)}")
        return None


# ============================================================================
# MILESTONE 12: ENHANCED CAD LINKING SYSTEM - Fusion INTEGRATION
# ============================================================================


def sync_all_components_in_fusion(diagram):
    """
    Sync all CAD components in the diagram with Fusion.

    Args:
        diagram: The diagram dictionary containing blocks with CAD links

    Returns:
        Dictionary with sync results
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return {
                "total_blocks": len(diagram.get("blocks", [])),
                "blocks_with_cad": 0,
                "total_components": 0,
                "sync_successful": 0,
                "sync_failed": 0,
                "errors": ["No active Fusion design found"],
            }

        results = {
            "total_blocks": len(diagram.get("blocks", [])),
            "blocks_with_cad": 0,
            "total_components": 0,
            "sync_successful": 0,
            "sync_failed": 0,
            "errors": [],
        }

        for block in diagram.get("blocks", []):
            cad_links = [
                link for link in block.get("links", []) if link.get("target") == "cad"
            ]

            if cad_links:
                results["blocks_with_cad"] += 1
                results["total_components"] += len(cad_links)

                for link in cad_links:
                    try:
                        # Get component from Fusion
                        component_info = get_component_info_from_fusion(
                            link.get("docId", ""), link.get("occToken", "")
                        )

                        if component_info:
                            # Update component properties in the link
                            link = diagram_data.update_component_properties(
                                link,
                                material=component_info.get("material", ""),
                                mass=component_info.get("mass", 0.0),
                                volume=component_info.get("volume", 0.0),
                                boundingBox=component_info.get("boundingBox"),
                                customProperties=component_info.get(
                                    "customProperties",
                                    {},
                                ),
                            )

                            # Generate thumbnail if needed
                            if "thumbnail" not in link:
                                link["thumbnail"] = (
                                    diagram_data.generate_component_thumbnail_placeholder(
                                        component_name=component_info.get(
                                            "name",
                                            "Component",
                                        )
                                    )
                                )

                            results["sync_successful"] += 1
                        else:
                            # Component not found - mark as missing
                            link = diagram_data.mark_component_as_missing(
                                link,
                                "Component not found in active Fusion design",
                            )
                            results["sync_failed"] += 1

                    except Exception as e:
                        results["sync_failed"] += 1
                        results["errors"].append(f"Failed to sync component: {str(e)}")

        return results

    except Exception as e:
        return {
            "total_blocks": 0,
            "blocks_with_cad": 0,
            "total_components": 0,
            "sync_successful": 0,
            "sync_failed": 0,
            "errors": [f"Sync operation failed: {str(e)}"],
        }


def get_component_info_from_fusion(doc_id, occ_token):
    """
    Get component information from Fusion.

    Args:
        doc_id: Document ID
        occ_token: Occurrence token

    Returns:
        Dictionary with component information or None if not found
    """
    try:
        # Respect the stored document ID first so links survive document switches.
        design = _resolve_design_for_doc(doc_id)
        if not design:
            return None

        # Find the occurrence by token
        occurrence = find_occurrence_by_token(design.rootComponent, occ_token)
        if not occurrence:
            return None

        # Get component properties
        component = occurrence.component
        info = {
            "name": component.name,
            "material": "",
            "mass": 0.0,
            "volume": 0.0,
            "boundingBox": None,
            "customProperties": {},
        }

        # Get physical properties if available
        try:
            physical_props = component.getPhysicalProperties(
                adsk.fusion.CalculationAccuracy.LowCalculationAccuracy
            )
            if physical_props:
                # Fusion's PhysicalProperties API already reports mass in
                # kilograms and volume in cubic centimetres — no conversion.
                info["mass"] = physical_props.mass
                info["volume"] = physical_props.volume

                # Get bounding box from the occurrence (not physical_props)
                bbox = occurrence.boundingBox if occurrence else None
                if bbox:
                    info["boundingBox"] = {
                        "min": [bbox.minPoint.x, bbox.minPoint.y, bbox.minPoint.z],
                        "max": [bbox.maxPoint.x, bbox.maxPoint.y, bbox.maxPoint.z],
                    }
        except Exception:
            pass  # Physical properties might not be available

        # Get material information
        try:
            if hasattr(component, "material") and component.material:
                info["material"] = component.material.name
        except Exception:
            pass  # Material might not be assigned

        # Get custom properties (Attributes collection is flat)
        try:
            if hasattr(component, "attributes"):
                for attr in component.attributes:
                    info["customProperties"][f"{attr.groupName}:{attr.name}"] = (
                        attr.value
                    )
        except Exception:
            pass  # Custom properties might not exist

        return info

    except Exception:
        return None


def find_occurrence_by_token(component, target_token):
    """
    Find an occurrence by its entity token.

    Uses ``allOccurrences`` which returns a flat list of every occurrence
    in the component hierarchy, avoiding the pitfall of recursing via
    ``occurrence.component`` (which refers to the Component *Definition*,
    not the assembly instance context).

    Args:
        component: Root component to search in.
        target_token: Entity token to find.

    Returns:
        Occurrence if found, None otherwise.
    """
    try:
        for occurrence in component.allOccurrences:
            if occurrence.entityToken == target_token:
                return occurrence
        return None
    except Exception:
        return None


def start_cad_selection(block_id, block_name):
    """Start CAD component selection for linking to a block.

    Minimises the palette so the user can easily click on a component
    in the Fusion viewport, then restores it after the command
    completes (the execute handler re-shows the palette).
    """
    try:
        # Minimise the palette to expose the viewport for picking
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            palette.isVisible = False

        # Delete any previous command definition to prevent handler
        # accumulation — each call needs exactly one handler with the
        # current block_id / block_name.
        old_cmd = UI.commandDefinitions.itemById("selectCADForBlock")
        if old_cmd:
            _release_handlers(old_cmd)
            old_cmd.deleteMe()

        selection_cmd = UI.commandDefinitions.addButtonDefinition(
            "selectCADForBlock",
            f'Select CAD for "{block_name}"',
            f'Select a Fusion occurrence to link to block "{block_name}"',
        )

        # Set up command handler
        handler = CADSelectionHandler(block_id, block_name)
        selection_cmd.commandCreated.add(handler)
        _retain_handler(selection_cmd, handler)

        # Execute the command
        selection_cmd.execute()

    except Exception as e:
        notify_error(f"CAD selection failed: {str(e)}")


class CADSelectionHandler(adsk.core.CommandCreatedEventHandler):
    """Handle CAD component selection for linking."""

    def __init__(self, block_id, block_name):
        super().__init__()
        self.block_id = block_id
        self.block_name = block_name

    def notify(self, args):
        try:
            cmd = args.command
            cmd.isRepeatable = False

            # Set up selection input
            inputs = cmd.commandInputs
            selection_input = inputs.addSelectionInput(
                "cadSelection",
                "Select CAD Component",
                f'Select a component or occurrence to link to "{self.block_name}"',
            )
            selection_input.addSelectionFilter("Occurrences")
            selection_input.setSelectionLimits(1, 1)

            # Set up event handlers
            execute_handler = CADSelectionExecuteHandler(
                self.block_id,
                self.block_name,
            )
            cmd.execute.add(execute_handler)
            _retain_handler(cmd, execute_handler)

            # Destroy handler fires on Cancel/Escape AND after Execute,
            # guaranteeing palette is restored regardless of how the
            # command ends.
            destroy_handler = CADSelectionDestroyHandler(cmd)
            cmd.destroy.add(destroy_handler)
            _retain_handler(cmd, destroy_handler)

        except Exception as e:
            notify_error(f"CAD selection setup failed: {str(e)}")


class CADSelectionDestroyHandler(adsk.core.CommandEventHandler):
    """Restore the palette when the CAD selection command ends.

    This fires on *every* termination path — Execute, Cancel (Escape),
    and error — so the palette is never left hidden.
    """

    def __init__(self, owner: Any):
        super().__init__()
        self._owner = owner

    def notify(self, args):
        try:
            palette = UI.palettes.itemById("SystemBlocksPalette")
            if palette and not palette.isVisible:
                palette.isVisible = True
        except Exception:
            pass  # best-effort palette restore
        finally:
            _release_handlers(self._owner)


class CADSelectionExecuteHandler(adsk.core.CommandEventHandler):
    """Handle execution of CAD selection command."""

    def __init__(self, block_id, block_name):
        super().__init__()
        self.block_id = block_id
        self.block_name = block_name

    def _send_cad_link_payload(self, palette, payload):
        global _pending_cad_link
        # Store data so JS can retrieve it via get_pending_cad_link
        # if the push via sendInfoToHTML arrives before the web-view
        # is fully ready after being restored.
        _pending_cad_link = payload

        # Restore palette visibility BEFORE sending data.
        try:
            if not palette.isVisible:
                palette.isVisible = True
        except Exception:
            pass

        # Flush pending UI events so the web-view finishes loading
        # before we dispatch the message.
        try:
            adsk.doEvents()
        except Exception:
            pass

        # Send a structured payload so the JS bridge routes by payload.type.
        _send_bridge_event(BridgeEvent.CAD_LINK, payload)

    def notify(self, args):
        try:
            cmd = args.command
            inputs = cmd.commandInputs
            selection_input = inputs.itemById("cadSelection")

            if selection_input.selectionCount > 0:
                selected_occurrence = selection_input.selection(0).entity
                if selected_occurrence:
                    # Get occurrence data
                    doc_id = ""
                    doc_name = ""
                    if APP.activeDocument and APP.activeDocument.dataFile:
                        doc_id = APP.activeDocument.dataFile.id or ""
                        doc_name = APP.activeDocument.dataFile.name or ""

                    link_data = {
                        "success": True,
                        "occToken": selected_occurrence.entityToken,
                        "componentName": selected_occurrence.component.name,
                        "docId": doc_id,
                        "docName": doc_name,
                        "blockId": self.block_id,
                        "blockName": self.block_name,
                    }

                    # Send data back to JavaScript
                    palette = UI.palettes.itemById("SystemBlocksPalette")
                    if palette:
                        self._send_cad_link_payload(palette, link_data)
                else:
                    palette = UI.palettes.itemById("SystemBlocksPalette")
                    if palette:
                        self._send_cad_link_payload(
                            palette,
                            {
                                "success": False,
                                "blockId": self.block_id,
                                "error": "No component selected",
                            },
                        )
            else:
                palette = UI.palettes.itemById("SystemBlocksPalette")
                if palette:
                    self._send_cad_link_payload(
                        palette,
                        {
                            "success": False,
                            "blockId": self.block_id,
                            "error": "No selection made",
                        },
                    )

        except Exception as e:
            palette = UI.palettes.itemById("SystemBlocksPalette")
            if palette:
                self._send_cad_link_payload(
                    palette,
                    {
                        "success": False,
                        "blockId": self.block_id,
                        "error": f"CAD selection failed: {str(e)}",
                    },
                )
            notify_error(f"CAD selection execution failed: {str(e)}")
        finally:
            # Always restore the palette after CAD selection completes
            try:
                palette = UI.palettes.itemById("SystemBlocksPalette")
                if palette:
                    palette.isVisible = True
            except Exception:
                pass  # palette restore is best-effort


def _ensure_toolbar_controls() -> None:
    """Add System Blocks commands to the active workspace toolbar.

    Ensures the main "System Blocks" button and the "Run Diagnostics"
    button are present in the design workspace's Add-Ins panel. This
    is safe to call multiple times — it checks for existing controls
    before adding new ones.

    Called during initial startup and again whenever the workspace
    changes so the buttons remain visible after workspace switches.
    """
    try:
        designWorkspace = UI.workspaces.itemById("FusionSolidEnvironment")
        if not designWorkspace:
            return

        addInsPanel = designWorkspace.toolbarPanels.itemById("SolidScriptsAddinsPanel")
        if not addInsPanel:
            addInsPanel = designWorkspace.toolbarPanels.add(
                "SolidScriptsAddinsPanel", "Add-Ins"
            )

        # Add main command control
        cmdDef = UI.commandDefinitions.itemById("SystemBlocksPaletteShowCommand")
        if cmdDef:
            ctrl = addInsPanel.controls.itemById("SystemBlocksPaletteShowCommand")
            if not ctrl:
                addInsPanel.controls.addCommand(cmdDef)

        # Add diagnostics command control
        diagCmdDef = UI.commandDefinitions.itemById("SystemBlocksDiagnosticsCommand")
        if diagCmdDef:
            diagCtrl = addInsPanel.controls.itemById("SystemBlocksDiagnosticsCommand")
            if not diagCtrl:
                addInsPanel.controls.addCommand(diagCmdDef)

        if LOGGING_AVAILABLE:
            _logger.info("Toolbar controls ensured in workspace")

    except Exception:
        if LOGGING_AVAILABLE:
            _logger.exception("Failed to ensure toolbar controls")


class WorkspaceActivatedHandler(adsk.core.WorkspaceEventHandler):
    """Re-register toolbar controls when the workspace changes.

    Fusion may discard toolbar controls when switching between
    workspaces (e.g. Design ↔ Manufacture). This handler ensures
    the System Blocks buttons are re-added whenever the user
    returns to the Design workspace.
    """

    def __init__(self):
        """Initialize the workspace activation handler."""
        super().__init__()

    def notify(self, args):
        """Handle workspace activated event.

        Args:
            args: The workspace event arguments.
        """
        try:
            _ensure_toolbar_controls()
        except Exception:
            if LOGGING_AVAILABLE:
                _logger.exception("Error in WorkspaceActivatedHandler")


def run(context):
    """Entry point called by Fusion when the add-in starts.

    Args:
        context: Fusion add-in context (unused).
    """
    try:
        # Initialize logging
        if LOGGING_AVAILABLE:
            setup_logging()
            _logger.info("=" * 60)
            _logger.info("STARTUP BEGIN - System Blocks Add-in")
            _logger.info("=" * 60)
            log_environment_info(_logger)
            cleanup_old_logs()

        # Create command definition for showing palette
        cmdDef = UI.commandDefinitions.itemById("SystemBlocksPaletteShowCommand")
        if not cmdDef:
            addin_path = os.path.dirname(__file__)
            resource_folder = os.path.join(addin_path, "resources")
            cmdDef = UI.commandDefinitions.addButtonDefinition(
                "SystemBlocksPaletteShowCommand",
                "System Blocks",
                "Show the System Blocks Diagram Editor",
                resource_folder,
            )

        # Create the event handler
        on_command_created = SystemBlocksPaletteShowCommandHandler()
        cmdDef.commandCreated.add(on_command_created)
        _retain_handler(cmdDef, on_command_created)

        if LOGGING_AVAILABLE:
            _logger.info(
                "Command definition registered: SystemBlocksPaletteShowCommand"
            )

        # Create the palette
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if not palette:
            # Get the HTML file path and convert to proper file URL
            addin_path = os.path.dirname(__file__)
            html_file = os.path.join(addin_path, "src", "palette.html")

            # Convert Windows path to file URL format
            html_file = html_file.replace("\\", "/")
            if not html_file.startswith("file:///"):
                html_file = "file:///" + html_file

            if LOGGING_AVAILABLE:
                _logger.debug(f"Creating palette with HTML: {html_file}")

            palette = UI.palettes.add(
                "SystemBlocksPalette",
                "System Blocks Diagram",
                html_file,
                True,  # isVisible
                True,  # showCloseButton
                True,  # isResizable
                300,  # width
                600,  # height
                True,  # useNewWebBrowser
            )

            # Add HTML event handler
            on_html_event = PaletteHTMLEventHandler()
            palette.incomingFromHTML.add(on_html_event)
            _retain_handler(palette, on_html_event)

            if LOGGING_AVAILABLE:
                _logger.info("Palette created: SystemBlocksPalette")

        # Create diagnostics command
        diagCmdDef = UI.commandDefinitions.itemById("SystemBlocksDiagnosticsCommand")
        if not diagCmdDef:
            diagCmdDef = UI.commandDefinitions.addButtonDefinition(
                "SystemBlocksDiagnosticsCommand",
                "Run Diagnostics",
                "Run self-tests to verify add-in health",
            )

        on_diag_created = DiagnosticsCommandHandler()
        diagCmdDef.commandCreated.add(on_diag_created)
        _retain_handler(diagCmdDef, on_diag_created)

        if LOGGING_AVAILABLE:
            _logger.info(
                "Command definition registered: SystemBlocksDiagnosticsCommand"
            )

        # Add toolbar controls to the design workspace
        _ensure_toolbar_controls()

        # Register workspace activation handler so toolbar controls
        # are re-added when the user switches workspaces. Unregister any
        # handler left over from a previous run first so restarts don't
        # stack duplicates.
        global _workspace_activated_handler
        if _workspace_activated_handler is not None:
            try:
                UI.workspaceActivated.remove(_workspace_activated_handler)
            except Exception:
                pass
        _workspace_activated_handler = WorkspaceActivatedHandler()
        UI.workspaceActivated.add(_workspace_activated_handler)
        _retain_handler(UI, _workspace_activated_handler)

        _set_snapshot_store()

        if LOGGING_AVAILABLE:
            _logger.info("=" * 60)
            _logger.info("STARTUP COMPLETE - System Blocks Add-in ready")
            _logger.info(f"Log file: {get_log_file_path()}")
            _logger.info("=" * 60)

        # Startup notification removed — Fusion add-ins load silently.
        if LOGGING_AVAILABLE:
            _logger.info("System Blocks add-in loaded successfully!")

    except Exception as e:
        if LOGGING_AVAILABLE:
            _logger.exception(f"STARTUP FAILED: {e}")
        notify_error(
            f"Failed to run System Blocks add-in: {str(e)}\n{traceback.format_exc()}"
        )


def stop(context):
    """Entry point called by Fusion when the add-in stops.

    Args:
        context: Fusion add-in context (unused).
    """
    try:
        if LOGGING_AVAILABLE:
            _logger.info("SHUTDOWN BEGIN - System Blocks Add-in")

        # Clean up any leftover diagnostic temp objects
        if DIAGNOSTICS_AVAILABLE:
            try:
                cleanup_any_remaining_temp_objects()
            except Exception:
                pass

        cmdDef = UI.commandDefinitions.itemById("SystemBlocksPaletteShowCommand")
        if cmdDef:
            _release_handlers(cmdDef)
            cmdDef.deleteMe()

        # Clean up diagnostics command
        diagCmdDef = UI.commandDefinitions.itemById("SystemBlocksDiagnosticsCommand")
        if diagCmdDef:
            _release_handlers(diagCmdDef)
            diagCmdDef.deleteMe()

        # Remove from workspace
        workspaces = UI.workspaces
        designWorkspace = workspaces.itemById("FusionSolidEnvironment")
        if designWorkspace:
            addInsPanel = designWorkspace.toolbarPanels.itemById(
                "SolidScriptsAddinsPanel"
            )
            if addInsPanel:
                systemBlocksControl = addInsPanel.controls.itemById(
                    "SystemBlocksPaletteShowCommand"
                )
                if systemBlocksControl:
                    systemBlocksControl.deleteMe()

                diagControl = addInsPanel.controls.itemById(
                    "SystemBlocksDiagnosticsCommand"
                )
                if diagControl:
                    diagControl.deleteMe()

        # Remove palette
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            _release_handlers(palette)
            palette.deleteMe()

        # Unregister the workspace-activation handler from Fusion's event —
        # dropping only the Python reference would leave it registered.
        global _workspace_activated_handler
        if _workspace_activated_handler is not None:
            try:
                UI.workspaceActivated.remove(_workspace_activated_handler)
            except Exception:
                pass
            _workspace_activated_handler = None

        _release_handlers(UI)
        _handler_fallback_refs.clear()

        if LOGGING_AVAILABLE:
            _logger.info("SHUTDOWN COMPLETE - System Blocks Add-in")

    except Exception as e:
        if LOGGING_AVAILABLE:
            _logger.exception(f"Error during shutdown: {e}")
        notify_error(f"Failed to stop System Blocks add-in: {str(e)}")
