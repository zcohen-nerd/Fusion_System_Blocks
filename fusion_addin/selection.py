"""Selection handling for Fusion 360.

This module provides utilities for handling user selections in Fusion 360,
translating them into core library inputs.

BOUNDARY: This module ONLY contains Fusion 360 specific code.

Classes:
    SelectionHandler: Handles user selection workflows.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

# Fusion 360 imports - only in this adapter layer
try:
    import adsk.core
    import adsk.fusion

    _FUSION_AVAILABLE = True
except ImportError:
    _FUSION_AVAILABLE = False

if TYPE_CHECKING:
    import adsk.core
    import adsk.fusion


class SelectionHandler:
    """Handles user selection workflows in Fusion 360.

    Provides methods for prompting users to select components,
    occurrences, and other Fusion entities, then translating
    those selections into core library compatible formats.

    Attributes:
        ui: The Fusion 360 UserInterface object.
    """

    def __init__(self, ui: adsk.core.UserInterface) -> None:
        """Initialize the SelectionHandler.

        Args:
            ui: The Fusion 360 UserInterface object.
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

        except Exception:
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

        except Exception:
            pass

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
        except Exception:
            pass

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
                    info["mass"] = props.mass / 1000.0  # kg
                    info["volume"] = props.volume / 1000.0  # cm³

                    # Bounding box
                    bbox = props.boundingBox
                    if bbox:
                        info["boundingBox"] = {
                            "min": [bbox.minPoint.x, bbox.minPoint.y, bbox.minPoint.z],
                            "max": [bbox.maxPoint.x, bbox.maxPoint.y, bbox.maxPoint.z],
                        }
            except Exception:
                pass

            # Get material
            try:
                if component.material:
                    info["material"] = component.material.name
            except Exception:
                pass

            return info

        except Exception:
            return {}
