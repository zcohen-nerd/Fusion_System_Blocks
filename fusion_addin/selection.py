"""Selection handling for Fusion.

This module provides utilities for handling user selections in Fusion,
translating them into core library inputs.

BOUNDARY: This module ONLY contains Fusion specific code.

Classes:
    SelectionHandler: Handles user selection workflows.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

try:
    from fusion_addin.logging_util import get_logger

    _LOGGER = get_logger("selection")
except Exception:
    _LOGGER = None

# Fusion imports - only in this adapter layer
try:
    import adsk.core
    import adsk.fusion

    _FUSION_AVAILABLE = True
except ImportError:
    _FUSION_AVAILABLE = False

if TYPE_CHECKING:
    import adsk.core
    import adsk.fusion


def _log_selection_error(message: str, exc: Exception | None = None) -> None:
    """Log selection adapter failures instead of silently returning None."""
    full_message = f"Selection adapter error: {message}"

    if _LOGGER is not None:
        if exc is None:
            _LOGGER.error(full_message)
        else:
            _LOGGER.exception("%s: %s", full_message, exc)

    if _FUSION_AVAILABLE:
        try:
            app = adsk.core.Application.get()
            if app and hasattr(app, "log"):
                app.log(full_message if exc is None else f"{full_message}: {exc}")
        except Exception:
            pass


class SelectionHandler:
    """Handles user selection workflows in Fusion.

    Provides methods for prompting users to select components,
    occurrences, and other Fusion entities, then translating
    those selections into core library compatible formats.

    Attributes:
        ui: The Fusion UserInterface object.
    """

    def __init__(self, ui: adsk.core.UserInterface) -> None:
        """Initialize the SelectionHandler.

        Args:
            ui: The Fusion UserInterface object.
        """
        self._ui = ui

    def select_occurrence(
        self,
        prompt: str = "Select a component",
    ) -> dict[str, Any] | None:
        """Prompt user to select an occurrence.

        Opens a selection dialog for the user to select a component
        occurrence from the active design.

        Args:
            prompt: The prompt message to display.

        Returns:
            Dictionary with occurrence info, or None if cancelled.
            Contains: type, occToken, name, docId
        """
        if not _FUSION_AVAILABLE:
            return None

        try:
            selection = self._ui.selectEntity(prompt, "Occurrences")
            if not selection:
                return None

            # selectEntity returns a Selection wrapper; unwrap via .entity
            entity = getattr(selection, "entity", selection)
            occurrence = adsk.fusion.Occurrence.cast(entity)
            if not occurrence:
                return None

            # Get document info
            app = adsk.core.Application.get()
            doc_id = None
            if app.activeDocument:
                doc_file = app.activeDocument.dataFile
                doc_id = doc_file.id if doc_file else None

            return {
                "type": "CAD",
                "occToken": occurrence.entityToken,
                "name": occurrence.name,
                "docId": doc_id,
            }

        except Exception as exc:
            _log_selection_error("select_occurrence failed", exc)
            return None

    def select_multiple_occurrences(
        self,
        prompt: str = "Select components",
        max_count: int = 0,
    ) -> list[dict[str, Any]]:
        """Prompt user to select multiple occurrences.

        Opens a selection dialog for the user to select multiple
        component occurrences from the active design.

        Args:
            prompt: The prompt message to display.
            max_count: Maximum number of selections (0 = unlimited).

        Returns:
            List of dictionaries with occurrence info.
        """
        if not _FUSION_AVAILABLE:
            return []

        selections = []
        try:
            # Create a selection input for multiple selections
            app = adsk.core.Application.get()
            doc_id = None
            if app.activeDocument:
                doc_file = app.activeDocument.dataFile
                doc_id = doc_file.id if doc_file else None

            # For now, use single selection in a loop
            # A more sophisticated implementation would use CommandInputs
            while True:
                if max_count > 0 and len(selections) >= max_count:
                    break

                selection = self._ui.selectEntity(
                    f"{prompt} ({len(selections)} selected, ESC to finish)",
                    "Occurrences",
                )
                if not selection:
                    break

                # selectEntity returns a Selection wrapper; unwrap via .entity
                entity = getattr(selection, "entity", selection)
                occurrence = adsk.fusion.Occurrence.cast(entity)
                if occurrence:
                    selections.append(
                        {
                            "type": "CAD",
                            "occToken": occurrence.entityToken,
                            "name": occurrence.name,
                            "docId": doc_id,
                        }
                    )

        except Exception as exc:
            _log_selection_error("select_multiple_occurrences failed", exc)

        return selections

    def find_occurrence_by_token(
        self,
        root_component: adsk.fusion.Component,
        token: str,
    ) -> adsk.fusion.Occurrence | None:
        """Find an occurrence by its entity token.

        Searches the component hierarchy for an occurrence matching
        the given entity token.

        Args:
            root_component: The root component to search from.
            token: The entity token to search for.

        Returns:
            The matching Occurrence, or None if not found.
        """
        if not _FUSION_AVAILABLE:
            return None

        try:
            # Try to find using allOccurrencesByComponent
            for occurrence in root_component.allOccurrences:
                if occurrence.entityToken == token:
                    return occurrence
        except Exception as exc:
            _log_selection_error("find_occurrence_by_token failed", exc)

        return None

    def get_occurrence_info(
        self,
        occurrence: adsk.fusion.Occurrence,
    ) -> dict[str, Any]:
        """Get detailed information about an occurrence.

        Extracts component properties, physical properties, and
        other metadata from an occurrence.

        Args:
            occurrence: The occurrence to get info for.

        Returns:
            Dictionary with component information.
        """
        if not _FUSION_AVAILABLE:
            return {}

        try:
            component = occurrence.component
            info = {
                "name": component.name,
                "description": component.description or "",
                "material": "",
                "mass": 0.0,
                "volume": 0.0,
                "boundingBox": None,
            }

            # Get physical properties
            try:
                props = component.getPhysicalProperties(
                    adsk.fusion.CalculationAccuracy.LowCalculationAccuracy
                )
                if props:
                    # Fusion's PhysicalProperties API already reports mass
                    # in kilograms and volume in cubic centimetres.
                    info["mass"] = props.mass
                    info["volume"] = props.volume

                    # Bounding box comes from the occurrence —
                    # PhysicalProperties has no boundingBox property.
                    bbox = occurrence.boundingBox
                    if bbox:
                        info["boundingBox"] = {
                            "min": [bbox.minPoint.x, bbox.minPoint.y, bbox.minPoint.z],
                            "max": [bbox.maxPoint.x, bbox.maxPoint.y, bbox.maxPoint.z],
                        }
            except Exception as exc:
                _log_selection_error("Failed to read physical properties", exc)

            # Get material
            try:
                if component.material:
                    info["material"] = component.material.name
            except Exception as exc:
                _log_selection_error("Failed to read component material", exc)

            return info

        except Exception as exc:
            _log_selection_error("get_occurrence_info failed", exc)
            return {}
