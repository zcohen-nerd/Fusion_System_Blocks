import datetime
import json
import os
import sys
import traceback
from typing import Any, Optional

import adsk.core
import adsk.fusion

# Add src directory to path so we can import our modules
src_path = os.path.join(os.path.dirname(__file__), "src")
sys.path.insert(0, src_path)
import diagram_data  # noqa: E402

# Add repo root to path for core library
repo_root = os.path.dirname(__file__)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

# Import the core library for validation and action planning (hard dependency)
from fsb_core.bridge_actions import BridgeAction, BridgeEvent
from fsb_core.delta import apply_patch, is_trivial_patch
from fsb_core.serialization import dict_to_graph
from fsb_core.validation import get_error_summary, validate_graph

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

_handlers = []  # keep event handlers alive


def send_palette_notification(message: str, level: str = "info") -> None:
    """Send a non-blocking notification to the HTML palette.

    Args:
        message: The message to display.
        level: The severity level ('info', 'success', 'warning', 'error').
    """

    try:
        palette = UI.palettes.itemById("SystemBlocksPalette")
    except Exception:
        palette = None

    if palette:
        script = (
            "if(window.pythonInterface && "
            "typeof window.pythonInterface.showNotification === 'function'){"
            f"window.pythonInterface.showNotification({json.dumps(message)}, "
            f"{json.dumps(level)});"
            "}"
        )
        palette.sendInfoToHTML(BridgeEvent.NOTIFICATION, script)
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
    in a Fusion 360 message box for user visibility.

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


def get_root_component() -> Optional[adsk.fusion.Component]:
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

    Validates the diagram using the fsb_core library before saving.
    Validation errors are advisory — they show warnings but do not
    block the save to allow work-in-progress persistence.

    Args:
        json_data: JSON string or already-parsed dict of the diagram.

    Returns:
        True if successful, False otherwise.
    """
    try:
        # Normalise: accept both dict and str so callers from the
        # JS bridge (which may pass either type) never crash.
        if isinstance(json_data, dict):
            diagram = json_data
            json_data = json.dumps(json_data)
        else:
            diagram = json.loads(json_data)

        # Core library validation (advisory — does not block save)
        graph = dict_to_graph(diagram)
        validation_errors = validate_graph(graph)

        if validation_errors:
            error_summary = get_error_summary(validation_errors)
            _show_validation_errors_dialog(validation_errors)
            # Log warnings but do NOT block save — let the user persist
            # their work-in-progress and fix issues later.
            if LOGGING_AVAILABLE:
                _logger.warning(
                    "Saving diagram despite validation warnings:\n%s",
                    error_summary,
                )

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


def save_named_diagram(label: str, json_data: str | dict) -> bool:
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
        slug = _slug_from_label(label)
        root_comp = get_root_component()
        if not root_comp:
            notify_error("No active design found")
            return False

        attr_name = _doc_attr_name(slug)
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
        entry = next((e for e in index if e["slug"] == slug), None)
        if entry:
            entry["modified"] = now
            entry["label"] = label
        else:
            index.append({"slug": slug, "label": label, "modified": now})
        _save_doc_index(index)
        return True
    except Exception as e:
        notify_error(f"Failed to save named diagram: {e}")
        return False


def load_named_diagram(slug: str) -> Optional[str]:
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


def select_occurrence_for_linking():
    """Allow user to select a Fusion occurrence for CAD linking."""
    try:
        # Create selection input
        selectionInput = UI.createSelectionInput(
            "selectOccurrence",
            "Select Component",
            "Select the component to link to this block",
        )
        selectionInput.addSelectionFilter("Occurrences")
        selectionInput.setSelectionLimits(1, 1)

        # Get the selection
        result = UI.commandDefinitions.itemById("SelectOccurrenceCommand")
        if not result:
            UI.commandDefinitions.addButtonDefinition(
                "SelectOccurrenceCommand",
                "Select Component",
                "Select a component to link",
            )

        # Create and show selection dialog
        selection = UI.selectEntity(
            "Select the component to link to this block", "Occurrences"
        )

        if selection:
            occurrence = adsk.fusion.Occurrence.cast(selection)
            if occurrence:
                doc_file = None
                if APP.activeDocument:
                    doc_file = APP.activeDocument.dataFile

                return {
                    "type": "CAD",
                    "occToken": occurrence.entityToken,
                    "name": occurrence.name,
                    "docId": doc_file.id if doc_file else None,
                }

        return None

    except Exception as e:
        send_palette_notification(
            f"Failed to select occurrence: {str(e)}",
            level="error",
        )
        return None


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
            onExecute = DiagnosticsExecuteHandler()
            command.execute.add(onExecute)
            _handlers.append(onExecute)

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

            # Add a command execute handler
            onExecute = CommandExecuteHandler()
            command.execute.add(onExecute)
            _handlers.append(onExecute)

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
                notify_warning("Palette not found - creating it now")
                palette = _create_palette()

            if palette:
                palette.isVisible = True
                notify_success("Palette should now be visible")

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

            # Validate action against the shared enum to catch JS/Python mismatches early
            try:
                BridgeAction(action)
            except ValueError:
                if LOGGING_AVAILABLE:
                    _logger.warning(
                        f"Action '{action}' is not in BridgeAction enum — "
                        "update fsb_core/bridge_actions.py and src/types/bridge-actions.js"
                    )

            handler_name = f"_handle_{action}"
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
            return {"success": True}
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
        return {"success": True, "diagram": diagram_dict}

    def _handle_apply_delta(self, data: dict[str, Any]) -> dict[str, Any]:
        """Apply a JSON-Patch delta to the persisted diagram.

        Expects ``data`` to contain a ``patch`` list of RFC 6902
        operations.  The current diagram is loaded from Fusion
        attributes, the patch is applied, and the result is saved back.

        If the patch is trivial (empty), we skip I/O entirely and
        return early.
        """
        patch = data.get("patch", [])
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
        diagram_json = data.get("diagram", "{}")
        diagram = (
            diagram_json if isinstance(diagram_json, dict) else json.loads(diagram_json)
        )
        addin_path = os.path.dirname(__file__)
        exports_path = os.path.join(addin_path, "exports")
        os.makedirs(exports_path, exist_ok=True)
        files_created = diagram_data.export_report_files(diagram, exports_path)
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
            return {"success": True, "files": file_list, "path": exports_path}
        return {"success": True, "files": files_created, "path": exports_path}

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
        label = data.get("label", "Untitled")
        json_data = data.get("diagram", "{}")
        ok = save_named_diagram(label, json_data)
        if ok:
            return {"success": True, "documents": list_named_diagrams()}
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
            return {"success": True, "diagram": diagram}
        return {"success": False, "error": "Document not found"}

    def _handle_delete_named_diagram(self, data: dict[str, Any]) -> dict[str, Any]:
        """Delete a named document."""
        slug = data.get("slug", "")
        ok = delete_named_diagram(slug)
        if ok:
            return {"success": True, "documents": list_named_diagrams()}
        return {"success": False, "error": "Delete failed"}


def _create_palette() -> Optional[adsk.core.Palette]:
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
        onHTMLEvent = PaletteHTMLEventHandler()
        palette.incomingFromHTML.add(onHTMLEvent)
        _handlers.append(onHTMLEvent)

        return palette
    except Exception as e:
        notify_error(f"Failed to create palette: {str(e)}")
        return None


# ============================================================================
# MILESTONE 12: ENHANCED CAD LINKING SYSTEM - FUSION 360 INTEGRATION
# ============================================================================


def sync_all_components_in_fusion(diagram):
    """
    Sync all CAD components in the diagram with Fusion 360.

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
                "errors": ["No active Fusion 360 design found"],
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
                        # Get component from Fusion 360
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
                                "Component not found in active Fusion 360 design",
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
    Get component information from Fusion 360.

    Args:
        doc_id: Document ID
        occ_token: Occurrence token

    Returns:
        Dictionary with component information or None if not found
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
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
                info["mass"] = physical_props.mass / 1000.0  # Convert to kg
                info["volume"] = physical_props.volume / 1000.0  # Convert to cm³

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


def get_all_component_statuses(diagram):
    """
    Get status of all components in the diagram.

    Args:
        diagram: The diagram dictionary

    Returns:
        Dictionary mapping block IDs to their component status
    """
    statuses = {}

    for block in diagram.get("blocks", []):
        block_id = block.get("id", "")
        if block_id:
            health_status = diagram_data.get_component_health_status(block)
            statuses[block_id] = health_status

    return statuses


def start_cad_selection(block_id, block_name):
    """Start CAD component selection for linking to a block."""
    try:
        # Delete any previous command definition to prevent handler
        # accumulation — each call needs exactly one handler with the
        # current block_id / block_name.
        old_cmd = UI.commandDefinitions.itemById("selectCADForBlock")
        if old_cmd:
            old_cmd.deleteMe()

        selection_cmd = UI.commandDefinitions.addButtonDefinition(
            "selectCADForBlock",
            f'Select CAD for "{block_name}"',
            f'Select a Fusion occurrence to link to block "{block_name}"',
        )

        # Set up command handler
        handler = CADSelectionHandler(block_id, block_name)
        selection_cmd.commandCreated.add(handler)
        _handlers.append(handler)

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
            _handlers.append(execute_handler)

        except Exception as e:
            notify_error(f"CAD selection setup failed: {str(e)}")


class CADSelectionExecuteHandler(adsk.core.CommandEventHandler):
    """Handle execution of CAD selection command."""

    def __init__(self, block_id, block_name):
        super().__init__()
        self.block_id = block_id
        self.block_name = block_name

    def _send_cad_link_payload(self, palette, payload):
        script = (
            "if(window.receiveCADLinkFromPython){"
            f"window.receiveCADLinkFromPython({json.dumps(payload)});"
            "}"
        )
        palette.sendInfoToHTML(BridgeEvent.CAD_LINK, script)

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


def start_enhanced_cad_selection(block_id, block_name):
    """
    Start enhanced CAD component selection process.

    Args:
        block_id: ID of the block to link
        block_name: Name of the block
    """
    try:
        # For now, use the existing CAD selection process
        # In the future, this could be enhanced with additional property collection
        start_cad_selection(block_id, block_name)

    except Exception as e:
        notify_error(f"Enhanced CAD selection error: {str(e)}")


# ============================================================================
# MILESTONE 13: VISUAL INTEGRATION & LIVING DOCUMENTATION - FUSION 360 API
# ============================================================================


def enable_3d_overlay_mode(diagram, view_box):
    """
    Enable 3D overlay mode in Fusion 360 viewport.

    Args:
        diagram: The block diagram data
        view_box: Current view box coordinates
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            notify_error("No active Fusion 360 design found")
            return

        # For now, show a message that overlay mode is enabled
        # In the future, this would create actual 3D overlays in the viewport
        notify_info("3D overlay mode enabled for the current diagram.")

        # Initialize 3D visualization for all blocks
        if "blocks" in diagram:
            for block in diagram["blocks"]:
                diagram_data.initialize_3d_visualization(block)

    except Exception as e:
        notify_error(f"3D overlay enable error: {str(e)}")


def disable_3d_overlay_mode():
    """
    Disable 3D overlay mode in Fusion 360 viewport.
    """
    try:
        # Clear any 3D overlays
        notify_info("3D Overlay Mode Disabled")

    except Exception as e:
        notify_error(f"3D overlay disable error: {str(e)}")


def highlight_block_components(block_id, highlight_color):
    """
    Highlight 3D components associated with a block.

    Args:
        block_id: ID of the block whose components to highlight
        highlight_color: Color for highlighting (hex string)
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        # Load current diagram to find the block
        diagram_data_obj = load_diagram_data()
        if not diagram_data_obj:
            return

        # Find the block
        target_block = None
        for block in diagram_data_obj.get("blocks", []):
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # Find CAD links in the block
        cad_links = [
            link
            for link in target_block.get("links", [])
            if link.get("target") == "cad"
        ]

        highlighted_count = 0
        for link in cad_links:
            occ_token = link.get("occToken", "")
            if occ_token:
                # Find occurrence by token
                occurrence = find_occurrence_by_token(
                    design.rootComponent,
                    occ_token,
                )
                if occurrence:
                    # In a full implementation, this would change the appearance
                    # For now, we'll select the component to show it's highlighted
                    if highlighted_count == 0:
                        # Select first component to show highlighting
                        selection = UI.activeSelections
                        selection.clear()
                        selection.add(occurrence)
                    highlighted_count += 1

        if highlighted_count > 0:
            notify_success(
                "Highlighted "
                f"{highlighted_count} components for block: "
                f"{target_block.get('name', 'Unknown')}"
            )
        else:
            block_name = target_block.get("name", "Unknown")
            notify_warning(f"No CAD components found for block: {block_name}")

    except Exception as e:
        notify_error(f"Component highlighting error: {str(e)}")


def create_connection_route_3d(connection_id, from_block_id, to_block_id, route_style):
    """
    Create 3D route visualization for a connection.

    Args:
        connection_id: ID of the connection
        from_block_id: Source block ID
        to_block_id: Target block ID
        route_style: Visualization style properties
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        # For now, show a message about route creation
        notify_info(f"Creating 3D route from {from_block_id} to {to_block_id}")

        # In a full implementation, this would:
        # 1. Find the 3D positions of components linked to both blocks
        # 2. Calculate optimal routing path
        # 3. Create 3D curve or sketch to visualize the connection
        # 4. Apply styling (color, thickness, animation)

    except Exception as e:
        notify_error(f"Connection route error: {str(e)}")


def create_system_group_visualization(block_ids, group_color):
    """
    Create system grouping visualization for multiple blocks.

    Args:
        block_ids: List of block IDs to group
        group_color: Color for the group boundary
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        notify_info(
            "Creating system group for "
            f"{len(block_ids)} blocks with color {group_color}"
        )

        # In a full implementation, this would:
        # 1. Find all components linked to the blocks
        # 2. Calculate a bounding volume around all components
        # 3. Create a visual boundary (wireframe box, colored region, etc.)
        # 4. Apply group color and styling

    except Exception as e:
        notify_error(f"System grouping error: {str(e)}")


def generate_live_thumbnail(block_id, view_angle, size):
    """
    Generate a live 3D thumbnail for a block.

    Args:
        block_id: ID of the block
        view_angle: Camera angle ("iso", "front", "top", "side")
        size: Thumbnail dimensions {"width": 150, "height": 150}
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        # Load current diagram to find the block
        diagram_data_obj = load_diagram_data()
        if not diagram_data_obj:
            return

        # Find the block
        target_block = None
        for block in diagram_data_obj.get("blocks", []):
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # For now, update the block with a placeholder thumbnail
        # In a full implementation, this would:
        # 1. Set camera to specified view angle
        # 2. Focus on components linked to the block
        # 3. Capture viewport image at specified size
        # 4. Convert to base64 and update block data

        thumbnail_data = (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
            "AAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )

        # Update block with live thumbnail
        updated_block = diagram_data.update_live_thumbnail(
            target_block,
            thumbnail_data,
        )

        # Save updated diagram
        for i, block in enumerate(diagram_data_obj.get("blocks", [])):
            if block.get("id") == block_id:
                diagram_data_obj["blocks"][i] = updated_block
                break

        save_diagram_json(json.dumps(diagram_data_obj))

        # Notify JavaScript that thumbnail was updated
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            script = (
                "if(editor) { "
                f"editor.onThumbnailUpdated('{block_id}', '{thumbnail_data}');"
                " }"
            )
            palette.sendInfoToHTML(BridgeEvent.THUMBNAIL_UPDATED, script)

    except Exception as e:
        notify_error(f"Live thumbnail error: {str(e)}")


def generate_assembly_sequence_from_diagram(diagram):
    """
    Generate assembly sequence from diagram and send to JavaScript.

    Args:
        diagram: The complete diagram data
    """
    try:
        # Generate assembly sequence using diagram_data
        assembly_sequence = diagram_data.generate_assembly_sequence(diagram)

        # Send response to JavaScript
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            sequence_payload = json.dumps(assembly_sequence)
            script = (
                "if(editor && editor.displayAssemblySequence) { "
                f"editor.displayAssemblySequence({sequence_payload});"
                " }"
            )
            palette.sendInfoToHTML(BridgeEvent.ASSEMBLY_SEQUENCE, script)

    except Exception as e:
        # Send error response
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            error_message = f"Assembly sequence error: {str(e)}"
            safe_message = json.dumps(error_message)
            script = (
                "(function(){"
                "var getter = window.getSystemBlocksLogger;"
                "var logger = typeof getter === 'function' ? getter() : "
                "(window.SystemBlocksLogger || null);"
                f"var message = {safe_message};"
                "if (logger && typeof logger.error === 'function') {"
                "logger.error(message);"
                "return;"
                "}"
                "if (window.alert) { window.alert(message); }"
                "})();"
            )
            palette.sendInfoToHTML(BridgeEvent.ASSEMBLY_ERROR, script)


def generate_living_bom_from_diagram(diagram):
    """
    Generate living BOM from diagram and send to JavaScript.

    Args:
        diagram: The complete diagram data
    """
    try:
        # Generate living BOM using diagram_data
        living_bom = diagram_data.generate_living_bom(diagram)

        # Send response to JavaScript
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            bom_payload = json.dumps(living_bom)
            script = (
                "if(editor && editor.displayLivingBOM) { "
                f"editor.displayLivingBOM({bom_payload});"
                " }"
            )
            palette.sendInfoToHTML(BridgeEvent.LIVING_BOM, script)

    except Exception as e:
        # Send error response
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            error_message = f"Living BOM error: {str(e)}"
            safe_message = json.dumps(error_message)
            script = (
                "(function(){"
                "var getter = window.getSystemBlocksLogger;"
                "var logger = typeof getter === 'function' ? getter() : "
                "(window.SystemBlocksLogger || null);"
                f"var message = {safe_message};"
                "if (logger && typeof logger.error === 'function') {"
                "logger.error(message);"
                "return;"
                "}"
                "if (window.alert) { window.alert(message); }"
                "})();"
            )
            palette.sendInfoToHTML(BridgeEvent.BOM_ERROR, script)


def generate_service_manual_for_block(block_id, diagram):
    """
    Generate service manual for a specific block.

    Args:
        block_id: ID of the block
        diagram: The complete diagram data
    """
    try:
        from datetime import datetime

        # Find the block
        target_block = None
        for block in diagram.get("blocks", []):
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # Initialize living documentation
        target_block = diagram_data.initialize_living_documentation(target_block)

        # Generate service manual content
        service_manual_doc = target_block["livingDocumentation"]["serviceManual"]
        service_manual = {
            "blockName": target_block.get("name", "Unknown"),
            "blockId": block_id,
            "maintenanceInterval": service_manual_doc["maintenanceInterval"],
            "replacementParts": service_manual_doc["replacementParts"],
            "troubleshootingSteps": service_manual_doc["troubleshootingSteps"],
            "safetyNotes": service_manual_doc["safetyNotes"],
            "generatedAt": datetime.now().isoformat(),
        }

        # Send to JavaScript
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            payload = json.dumps(service_manual)
            script = f"if(editor) {{ editor.displayServiceManual({payload}); }}"
            palette.sendInfoToHTML(BridgeEvent.SERVICE_MANUAL, script)

    except Exception as e:
        notify_error(f"Service manual error: {str(e)}")


def analyze_change_impact_for_block(block_id, diagram):
    """
    Analyze change impact for a specific block.

    Args:
        block_id: ID of the block that changed
        diagram: The complete diagram data
    """
    try:
        # Analyze change impact using diagram_data
        impact_analysis = diagram_data.track_change_impact(
            diagram, block_id, "User-initiated analysis"
        )

        # Send to JavaScript
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            impact_payload = json.dumps(impact_analysis)
            script = (
                "if(editor && editor.displayChangeImpact) { "
                f"editor.displayChangeImpact({impact_payload});"
                " }"
            )
            palette.sendInfoToHTML(BridgeEvent.CHANGE_IMPACT, script)

    except Exception as e:
        notify_error(f"Change impact analysis error: {str(e)}")


def run(context):
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
            cmdDef = UI.commandDefinitions.addButtonDefinition(
                "SystemBlocksPaletteShowCommand",
                "System Blocks",
                "Show the System Blocks Diagram Editor",
                # Removed the resource folder path - will use default icon
            )

        # Create the event handler
        onCommandCreated = SystemBlocksPaletteShowCommandHandler()
        cmdDef.commandCreated.add(onCommandCreated)
        _handlers.append(onCommandCreated)

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
            onHTMLEvent = PaletteHTMLEventHandler()
            palette.incomingFromHTML.add(onHTMLEvent)
            _handlers.append(onHTMLEvent)

            if LOGGING_AVAILABLE:
                _logger.info("Palette created: SystemBlocksPalette")

        # Add to appropriate workspace
        workspaces = UI.workspaces
        designWorkspace = workspaces.itemById("FusionSolidEnvironment")
        if designWorkspace:
            # Add to Add-ins panel
            addInsPanel = designWorkspace.toolbarPanels.itemById(
                "SolidScriptsAddinsPanel"
            )
            if not addInsPanel:
                addInsPanel = designWorkspace.toolbarPanels.add(
                    "SolidScriptsAddinsPanel", "Add-Ins"
                )

            # Add our command to the panel
            controls = addInsPanel.controls
            systemBlocksControl = controls.itemById("SystemBlocksPaletteShowCommand")
            if not systemBlocksControl:
                systemBlocksControl = controls.addCommand(cmdDef)

            if LOGGING_AVAILABLE:
                _logger.info("Added command to workspace panel")

        # Create diagnostics command
        diagCmdDef = UI.commandDefinitions.itemById("SystemBlocksDiagnosticsCommand")
        if not diagCmdDef:
            diagCmdDef = UI.commandDefinitions.addButtonDefinition(
                "SystemBlocksDiagnosticsCommand",
                "Run Diagnostics",
                "Run self-tests to verify add-in health",
            )

        onDiagCreated = DiagnosticsCommandHandler()
        diagCmdDef.commandCreated.add(onDiagCreated)
        _handlers.append(onDiagCreated)

        if LOGGING_AVAILABLE:
            _logger.info(
                "Command definition registered: SystemBlocksDiagnosticsCommand"
            )

        # Add diagnostics command to panel
        if designWorkspace:
            addInsPanel = designWorkspace.toolbarPanels.itemById(
                "SolidScriptsAddinsPanel"
            )
            if addInsPanel:
                diagControl = addInsPanel.controls.itemById(
                    "SystemBlocksDiagnosticsCommand"
                )
                if not diagControl:
                    diagControl = addInsPanel.controls.addCommand(diagCmdDef)

        if LOGGING_AVAILABLE:
            _logger.info("=" * 60)
            _logger.info("STARTUP COMPLETE - System Blocks Add-in ready")
            _logger.info(f"Log file: {get_log_file_path()}")
            _logger.info("=" * 60)

        notify_success("System Blocks add-in loaded successfully!")

    except Exception as e:
        if LOGGING_AVAILABLE:
            _logger.exception(f"STARTUP FAILED: {e}")
        notify_error(
            f"Failed to run System Blocks add-in: {str(e)}\n{traceback.format_exc()}"
        )


def stop(context):
    try:
        if LOGGING_AVAILABLE:
            _logger.info("SHUTDOWN BEGIN - System Blocks Add-in")

        # Clean up any leftover diagnostic temp objects
        if DIAGNOSTICS_AVAILABLE:
            try:
                cleanup_any_remaining_temp_objects()
            except Exception:
                pass

        # Clean up UI elements
        cmdDef = UI.commandDefinitions.itemById("SystemBlocksPaletteShowCommand")
        if cmdDef:
            cmdDef.deleteMe()

        # Clean up diagnostics command
        diagCmdDef = UI.commandDefinitions.itemById("SystemBlocksDiagnosticsCommand")
        if diagCmdDef:
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
            palette.deleteMe()

        # Clear handlers
        _handlers.clear()

        if LOGGING_AVAILABLE:
            _logger.info("SHUTDOWN COMPLETE - System Blocks Add-in")

    except Exception as e:
        if LOGGING_AVAILABLE:
            _logger.exception(f"Error during shutdown: {e}")
        notify_error(f"Failed to stop System Blocks add-in: {str(e)}")
