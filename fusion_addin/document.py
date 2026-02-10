"""Document operations for Fusion 360.

This module provides utilities for interacting with Fusion 360 documents,
including attribute storage, design access, and document metadata.

BOUNDARY: This module ONLY contains Fusion 360 specific code.

Classes:
    DocumentManager: Manages Fusion document interactions.
"""

from __future__ import annotations

import json
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


class DocumentManager:
    """Manages Fusion 360 document interactions.

    Provides methods for reading and writing document attributes,
    accessing design structure, and managing document metadata.

    Attributes:
        app: The Fusion 360 Application object.
    """

    def __init__(self, app: adsk.core.Application) -> None:
        """Initialize the DocumentManager.

        Args:
            app: The Fusion 360 Application object.
        """
        self._app = app

    @property
    def active_document(self) -> adsk.core.Document | None:
        """Get the active Fusion document."""
        if not _FUSION_AVAILABLE:
            return None
        return self._app.activeDocument

    @property
    def active_design(self) -> adsk.fusion.Design | None:
        """Get the active Fusion design."""
        if not _FUSION_AVAILABLE:
            return None
        return adsk.fusion.Design.cast(self._app.activeProduct)

    @property
    def root_component(self) -> adsk.fusion.Component | None:
        """Get the root component of the active design."""
        design = self.active_design
        return design.rootComponent if design else None

    def get_attribute(
        self,
        group_name: str,
        attr_name: str,
    ) -> str | None:
        """Get an attribute value from the root component.

        Args:
            group_name: The attribute group name.
            attr_name: The attribute name.

        Returns:
            The attribute value string, or None if not found.
        """
        root_comp = self.root_component
        if not root_comp:
            return None

        try:
            for attr in root_comp.attributes:
                if attr.groupName == group_name and attr.name == attr_name:
                    return attr.value
        except Exception:
            pass

        return None

    def set_attribute(
        self,
        group_name: str,
        attr_name: str,
        value: str,
    ) -> bool:
        """Set an attribute value on the root component.

        Args:
            group_name: The attribute group name.
            attr_name: The attribute name.
            value: The value to store.

        Returns:
            True if successful, False otherwise.
        """
        root_comp = self.root_component
        if not root_comp:
            return False

        try:
            # Remove existing attribute if it exists
            for attr in root_comp.attributes:
                if attr.groupName == group_name and attr.name == attr_name:
                    attr.deleteMe()
                    break

            # Add new attribute
            root_comp.attributes.add(group_name, attr_name, value)
            return True

        except Exception:
            return False

    def delete_attribute(
        self,
        group_name: str,
        attr_name: str,
    ) -> bool:
        """Delete an attribute from the root component.

        Args:
            group_name: The attribute group name.
            attr_name: The attribute name.

        Returns:
            True if found and deleted, False otherwise.
        """
        root_comp = self.root_component
        if not root_comp:
            return False

        try:
            for attr in root_comp.attributes:
                if attr.groupName == group_name and attr.name == attr_name:
                    attr.deleteMe()
                    return True
        except Exception:
            pass

        return False

    def get_json_attribute(
        self,
        group_name: str,
        attr_name: str,
    ) -> dict[str, Any] | None:
        """Get a JSON-encoded attribute value.

        Args:
            group_name: The attribute group name.
            attr_name: The attribute name.

        Returns:
            Parsed JSON as dictionary, or None if not found/invalid.
        """
        value = self.get_attribute(group_name, attr_name)
        if value is None:
            return None

        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None

    def set_json_attribute(
        self,
        group_name: str,
        attr_name: str,
        data: dict[str, Any],
    ) -> bool:
        """Set a JSON-encoded attribute value.

        Args:
            group_name: The attribute group name.
            attr_name: The attribute name.
            data: Dictionary to encode as JSON.

        Returns:
            True if successful, False otherwise.
        """
        try:
            value = json.dumps(data, indent=2)
            return self.set_attribute(group_name, attr_name, value)
        except (TypeError, ValueError):
            return False

    def get_document_info(self) -> dict[str, Any]:
        """Get information about the active document.

        Returns:
            Dictionary with document metadata.
        """
        info = {
            "name": "",
            "id": None,
            "version": None,
            "has_design": False,
        }

        if not _FUSION_AVAILABLE:
            return info

        doc = self.active_document
        if doc:
            info["name"] = doc.name
            if doc.dataFile:
                info["id"] = doc.dataFile.id
                info["version"] = doc.dataFile.versionNumber

        design = self.active_design
        if design:
            info["has_design"] = True
            info["design_type"] = design.designType

        return info

    def get_all_occurrences(self) -> list[adsk.fusion.Occurrence]:
        """Get all occurrences in the active design.

        Returns:
            List of all occurrences.
        """
        root_comp = self.root_component
        if not root_comp:
            return []

        try:
            return list(root_comp.allOccurrences)
        except Exception:
            return []

    def get_all_components(self) -> list[adsk.fusion.Component]:
        """Get all unique components in the active design.

        Returns:
            List of all components.
        """
        design = self.active_design
        if not design:
            return []

        try:
            return list(design.allComponents)
        except Exception:
            return []
