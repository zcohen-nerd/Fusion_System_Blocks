"""Core adapter for translating between Fusion and the core library.

This module provides the primary interface for converting Fusion
selections and document state into core library inputs, and applying
core library outputs back to the Fusion document.

BOUNDARY: This module ONLY contains Fusion specific code. All business
logic is delegated to the core library.

Classes:
    FusionAdapter: Main adapter for Fusion ↔ Core interaction.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

# Fusion imports - only in this adapter layer
try:
    import adsk.core
    import adsk.fusion

    _FUSION_AVAILABLE = True
except ImportError:
    _FUSION_AVAILABLE = False

# Core library imports
from fsb_core.action_plan import ActionPlan, ActionType, build_action_plan
from fsb_core.models import Graph
from fsb_core.serialization import dict_to_graph, graph_to_dict
from fsb_core.validation import ValidationError, get_error_summary, validate_graph

if TYPE_CHECKING:
    import adsk.core
    import adsk.fusion


ATTR_GROUP = "systemBlocks"
ATTR_NAME = "diagramJson"


class FusionAdapter:
    """Adapter for translating between Fusion and the core library.

    This class provides methods to:
    - Load graph data from Fusion document attributes
    - Save graph data to Fusion document attributes
    - Execute action plans to modify the Fusion document
    - Display validation errors to the user
    - Handle CAD component selection and linking

    The adapter is intentionally thin, delegating all business logic to
    the core library while handling Fusion-specific IO operations.

    Attributes:
        app: The Fusion Application object.
        ui: The Fusion UserInterface object.
    """

    def __init__(
        self,
        app: adsk.core.Application,
        ui: adsk.core.UserInterface,
    ) -> None:
        """Initialize the FusionAdapter.

        Args:
            app: The Fusion Application object.
            ui: The Fusion UserInterface object.
        """
        self._app = app
        self._ui = ui

    @property
    def app(self) -> adsk.core.Application:
        """Get the Fusion Application object."""
        return self._app

    @property
    def ui(self) -> adsk.core.UserInterface:
        """Get the Fusion UserInterface object."""
        return self._ui

    def get_root_component(self) -> adsk.fusion.Component | None:
        """Get the root component of the active design.

        Returns:
            The root component, or None if no design is active.
        """
        if not _FUSION_AVAILABLE:
            return None

        try:
            design = adsk.fusion.Design.cast(self._app.activeProduct)
            if design:
                return design.rootComponent
        except Exception:
            pass
        return None

    def load_graph(self) -> Graph | None:
        """Load the graph from Fusion document attributes.

        Reads the serialized diagram JSON from the document's custom
        attributes and deserializes it into a Graph instance.

        Returns:
            The loaded Graph, or None if no diagram is stored.
        """
        root_comp = self.get_root_component()
        if not root_comp:
            return None

        try:
            for attr in root_comp.attributes:
                if attr.groupName == ATTR_GROUP and attr.name == ATTR_NAME:
                    data = json.loads(attr.value)
                    return dict_to_graph(data)
        except Exception:
            pass

        return None

    def save_graph(self, graph: Graph) -> bool:
        """Save the graph to Fusion document attributes.

        Serializes the Graph to JSON and stores it in the document's
        custom attributes. Performs validation before saving.

        Args:
            graph: The Graph to save.

        Returns:
            True if save succeeded, False otherwise.
        """
        root_comp = self.get_root_component()
        if not root_comp:
            self.show_error("No active design found")
            return False

        # Validate before saving
        errors = validate_graph(graph)
        if errors:
            self.show_validation_errors(errors)
            return False

        try:
            # Serialize graph
            data = graph_to_dict(graph)
            json_data = json.dumps(data, indent=2)

            # Remove existing attribute if it exists
            attrs = root_comp.attributes
            for attr in attrs:
                if attr.groupName == ATTR_GROUP and attr.name == ATTR_NAME:
                    attr.deleteMe()
                    break

            # Add new attribute
            attrs.add(ATTR_GROUP, ATTR_NAME, json_data)
            return True

        except Exception as e:
            self.show_error(f"Failed to save diagram: {str(e)}")
            return False

    def validate_and_get_errors(self, graph: Graph) -> list[ValidationError]:
        """Validate a graph and return any errors.

        Delegates to the core validation function.

        Args:
            graph: The Graph to validate.

        Returns:
            List of validation errors (empty if valid).
        """
        return validate_graph(graph)

    def build_action_plan_for_graph(
        self,
        graph: Graph,
        previous_graph: Graph | None = None,
    ) -> list[ActionPlan]:
        """Build an action plan for synchronizing the Fusion document.

        Delegates to the core action plan builder.

        Args:
            graph: The current graph state.
            previous_graph: Optional previous graph state for delta mode.

        Returns:
            Ordered list of actions to execute.
        """
        return build_action_plan(graph, previous_graph)

    def execute_action_plan(self, actions: list[ActionPlan]) -> bool:
        """Execute an action plan to modify the Fusion document.

        Iterates through the action plan and executes each action
        against the Fusion document.

        Args:
            actions: List of actions to execute.

        Returns:
            True if all actions succeeded, False if any failed.
        """
        success = True

        for action in actions:
            try:
                result = self._execute_single_action(action)
                if not result:
                    success = False
            except Exception as e:
                self.show_error(f"Action '{action.action_type.value}' failed: {str(e)}")
                success = False

        return success

    def _execute_single_action(self, action: ActionPlan) -> bool:
        """Execute a single action from the action plan.

        Args:
            action: The action to execute.

        Returns:
            True if the action succeeded.
        """
        action_handlers = {
            ActionType.CREATE_BLOCK: self._handle_create_block,
            ActionType.UPDATE_BLOCK: self._handle_update_block,
            ActionType.DELETE_BLOCK: self._handle_delete_block,
            ActionType.CREATE_CONNECTION: self._handle_create_connection,
            ActionType.DELETE_CONNECTION: self._handle_delete_connection,
            ActionType.SYNC_CAD_PROPERTIES: self._handle_sync_cad,
            ActionType.SAVE_ATTRIBUTES: self._handle_save_attributes,
            ActionType.REFRESH_DISPLAY: self._handle_refresh_display,
            ActionType.SHOW_WARNING: self._handle_show_warning,
            ActionType.SHOW_ERROR: self._handle_show_error,
        }

        handler = action_handlers.get(action.action_type)
        if handler:
            return handler(action)

        # Unknown action type - skip but log
        return True

    def _handle_create_block(self, action: ActionPlan) -> bool:
        """Handle CREATE_BLOCK action. Currently a placeholder."""
        # In a full implementation, this would create visual elements
        # For now, block creation is handled by the HTML palette
        return True

    def _handle_update_block(self, action: ActionPlan) -> bool:
        """Handle UPDATE_BLOCK action. Currently a placeholder."""
        return True

    def _handle_delete_block(self, action: ActionPlan) -> bool:
        """Handle DELETE_BLOCK action. Currently a placeholder."""
        return True

    def _handle_create_connection(self, action: ActionPlan) -> bool:
        """Handle CREATE_CONNECTION action. Currently a placeholder."""
        return True

    def _handle_delete_connection(self, action: ActionPlan) -> bool:
        """Handle DELETE_CONNECTION action. Currently a placeholder."""
        return True

    def _handle_sync_cad(self, action: ActionPlan) -> bool:
        """Handle SYNC_CAD_PROPERTIES action."""
        # Get component from Fusion and sync properties
        occ_token = action.params.get("occ_token")
        if not occ_token:
            return True  # Nothing to sync

        root_comp = self.get_root_component()
        if not root_comp:
            return False

        # Find occurrence and sync - implementation would go here
        return True

    def _handle_save_attributes(self, action: ActionPlan) -> bool:
        """Handle SAVE_ATTRIBUTES action."""
        # Attributes are saved by save_graph(), nothing else needed here
        return True

    def _handle_refresh_display(self, action: ActionPlan) -> bool:
        """Handle REFRESH_DISPLAY action."""
        # Trigger palette refresh if needed
        return True

    def _handle_show_warning(self, action: ActionPlan) -> bool:
        """Handle SHOW_WARNING action."""
        message = action.params.get("message", action.description)
        self.show_warning(message)
        return True

    def _handle_show_error(self, action: ActionPlan) -> bool:
        """Handle SHOW_ERROR action."""
        message = action.params.get("message", action.description)
        self.show_error(message)
        return True

    def show_validation_errors(self, errors: list[ValidationError]) -> None:
        """Display validation errors to the user.

        Shows a message box with a summary of all validation errors.

        Args:
            errors: List of validation errors to display.
        """
        if not errors:
            return

        summary = get_error_summary(errors)
        self.show_error(f"Graph validation failed:\n\n{summary}")

    def show_error(self, message: str) -> None:
        """Display an error message to the user.

        Args:
            message: The error message to display.
        """
        if _FUSION_AVAILABLE and self._ui:
            self._ui.messageBox(message, "Error")

    def show_warning(self, message: str) -> None:
        """Display a warning message to the user.

        Args:
            message: The warning message to display.
        """
        if _FUSION_AVAILABLE and self._ui:
            self._ui.messageBox(message, "Warning")

    def show_info(self, message: str) -> None:
        """Display an info message to the user.

        Args:
            message: The info message to display.
        """
        if _FUSION_AVAILABLE and self._ui:
            self._ui.messageBox(message, "Information")


def create_adapter_from_globals() -> FusionAdapter | None:
    """Create an adapter using global Fusion Application.

    Convenience function for use in Fusion add-in entry points.

    Returns:
        FusionAdapter if Fusion is available, None otherwise.
    """
    if not _FUSION_AVAILABLE:
        return None

    try:
        app = adsk.core.Application.get()
        ui = app.userInterface
        return FusionAdapter(app, ui)
    except Exception:
        return None
