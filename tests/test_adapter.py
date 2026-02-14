"""Tests for fusion_addin/adapter.py using mock Fusion objects.

Since the real adsk module is only available inside Fusion, every
Fusion-specific touchpoint is replaced with unittest.mock objects.
"""

from __future__ import annotations

import json

# Use shared adsk mocks registered by conftest.py
import sys
from unittest.mock import MagicMock, patch

_adsk_core = sys.modules["adsk.core"]
_adsk_fusion = sys.modules["adsk.fusion"]

# Force _FUSION_AVAILABLE to True for testing
import fusion_addin.adapter as adapter_mod  # noqa: E402

adapter_mod._FUSION_AVAILABLE = True

from fsb_core.action_plan import ActionPlan, ActionType  # noqa: E402
from fsb_core.models import Block, Graph  # noqa: E402
from fsb_core.serialization import graph_to_dict  # noqa: E402
from fusion_addin.adapter import ATTR_GROUP, ATTR_NAME, FusionAdapter  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_adapter(*, root_comp=None) -> FusionAdapter:
    """Return a FusionAdapter with a stubbed Fusion environment."""
    app = MagicMock(name="app")
    ui = MagicMock(name="ui")

    # By default Design.cast returns a design with the given root_comp
    design = MagicMock(name="design")
    design.rootComponent = root_comp or MagicMock(name="rootComponent")
    _adsk_fusion.Design.cast.return_value = design

    return FusionAdapter(app, ui)


def _make_attr(group: str, name: str, value: str):
    """Return a mock Fusion attribute."""
    a = MagicMock()
    a.groupName = group
    a.name = name
    a.value = value
    return a


def _simple_graph() -> Graph:
    b = Block(id="b1", name="MCU", x=0, y=0)
    return Graph(blocks=[b], connections=[])


# ---------------------------------------------------------------------------
# Tests: properties & initialization
# ---------------------------------------------------------------------------


class TestAdapterInit:
    def test_properties(self):
        app = MagicMock()
        ui = MagicMock()
        adapter = FusionAdapter(app, ui)
        assert adapter.app is app
        assert adapter.ui is ui


class TestGetRootComponent:
    def test_returns_root_component(self):
        adapter = _make_adapter()
        root = adapter.get_root_component()
        assert root is not None

    def test_returns_none_when_fusion_unavailable(self):
        adapter = _make_adapter()
        with patch.object(adapter_mod, "_FUSION_AVAILABLE", False):
            assert adapter.get_root_component() is None

    def test_returns_none_when_no_design(self):
        adapter = _make_adapter()
        _adsk_fusion.Design.cast.return_value = None
        assert adapter.get_root_component() is None


# ---------------------------------------------------------------------------
# Tests: load / save graph
# ---------------------------------------------------------------------------


class TestLoadGraph:
    def test_loads_graph_from_attributes(self):
        g = _simple_graph()
        data = graph_to_dict(g)
        json_str = json.dumps(data)

        root_comp = MagicMock()
        root_comp.attributes = [_make_attr(ATTR_GROUP, ATTR_NAME, json_str)]

        adapter = _make_adapter(root_comp=root_comp)
        loaded = adapter.load_graph()

        assert loaded is not None
        assert len(loaded.blocks) == 1
        assert loaded.blocks[0].name == "MCU"

    def test_returns_none_when_no_root_comp(self):
        adapter = _make_adapter()
        _adsk_fusion.Design.cast.return_value = None
        assert adapter.load_graph() is None

    def test_returns_none_on_bad_json(self):
        root_comp = MagicMock()
        root_comp.attributes = [_make_attr(ATTR_GROUP, ATTR_NAME, "not json")]
        adapter = _make_adapter(root_comp=root_comp)
        assert adapter.load_graph() is None


class TestSaveGraph:
    def test_saves_valid_graph(self):
        root_comp = MagicMock()
        root_comp.attributes = MagicMock()
        root_comp.attributes.__iter__ = MagicMock(return_value=iter([]))
        root_comp.attributes.add = MagicMock()

        adapter = _make_adapter(root_comp=root_comp)
        g = _simple_graph()

        assert adapter.save_graph(g) is True
        root_comp.attributes.add.assert_called_once()
        call_args = root_comp.attributes.add.call_args
        assert call_args[0][0] == ATTR_GROUP
        assert call_args[0][1] == ATTR_NAME

    def test_fails_when_no_root_comp(self):
        adapter = _make_adapter()
        _adsk_fusion.Design.cast.return_value = None
        g = _simple_graph()
        assert adapter.save_graph(g) is False

    def test_fails_on_validation_errors(self):
        root_comp = MagicMock()
        root_comp.attributes = []
        adapter = _make_adapter(root_comp=root_comp)

        # Create a graph that triggers validation errors
        bad_graph = Graph(
            blocks=[
                Block(id="dup", name="A", x=0, y=0),
                Block(id="dup", name="B", x=1, y=1),  # duplicate id
            ],
            connections=[],
        )
        result = adapter.save_graph(bad_graph)
        assert result is False


# ---------------------------------------------------------------------------
# Tests: validate_and_get_errors
# ---------------------------------------------------------------------------


class TestValidateAndGetErrors:
    def test_returns_empty_for_valid_graph(self):
        adapter = _make_adapter()
        g = _simple_graph()
        errors = adapter.validate_and_get_errors(g)
        assert errors == []

    def test_returns_errors_for_duplicate_ids(self):
        adapter = _make_adapter()
        bad_graph = Graph(
            blocks=[
                Block(id="dup", name="A", x=0, y=0),
                Block(id="dup", name="B", x=1, y=1),
            ],
            connections=[],
        )
        errors = adapter.validate_and_get_errors(bad_graph)
        assert len(errors) > 0


# ---------------------------------------------------------------------------
# Tests: action plan execution
# ---------------------------------------------------------------------------


class TestExecuteActionPlan:
    def _make_action(self, action_type: ActionType, **params) -> ActionPlan:
        return ActionPlan(
            action_type=action_type,
            target_id="t1",
            description="test action",
            params=params,
        )

    def test_empty_plan_succeeds(self):
        adapter = _make_adapter()
        assert adapter.execute_action_plan([]) is True

    def test_all_handler_types_execute(self):
        """Each known ActionType should succeed (handlers are stubs)."""
        adapter = _make_adapter()
        for at in ActionType:
            action = self._make_action(at)
            result = adapter.execute_action_plan([action])
            assert result is True, f"{at} handler failed"

    def test_show_warning_calls_ui(self):
        adapter = _make_adapter()
        action = self._make_action(ActionType.SHOW_WARNING, message="watch out")
        adapter.execute_action_plan([action])
        adapter.ui.messageBox.assert_called()

    def test_show_error_calls_ui(self):
        adapter = _make_adapter()
        action = self._make_action(ActionType.SHOW_ERROR, message="broken")
        adapter.execute_action_plan([action])
        adapter.ui.messageBox.assert_called()


# ---------------------------------------------------------------------------
# Tests: message helpers
# ---------------------------------------------------------------------------


class TestMessageHelpers:
    def test_show_error(self):
        adapter = _make_adapter()
        adapter.show_error("oops")
        adapter.ui.messageBox.assert_called_once_with("oops", "Error")

    def test_show_warning(self):
        adapter = _make_adapter()
        adapter.show_warning("heads up")
        adapter.ui.messageBox.assert_called_once_with("heads up", "Warning")

    def test_show_info(self):
        adapter = _make_adapter()
        adapter.show_info("FYI")
        adapter.ui.messageBox.assert_called_once_with("FYI", "Information")

    def test_show_validation_errors_display(self):
        adapter = _make_adapter()
        bad_graph = Graph(
            blocks=[
                Block(id="dup", name="A", x=0, y=0),
                Block(id="dup", name="B", x=1, y=1),
            ],
            connections=[],
        )
        errors = adapter.validate_and_get_errors(bad_graph)
        adapter.show_validation_errors(errors)
        adapter.ui.messageBox.assert_called()

    def test_show_validation_errors_no_errors(self):
        adapter = _make_adapter()
        adapter.show_validation_errors([])
        adapter.ui.messageBox.assert_not_called()


# ---------------------------------------------------------------------------
# Tests: create_adapter_from_globals
# ---------------------------------------------------------------------------


class TestCreateAdapterFromGlobals:
    def test_returns_none_when_fusion_unavailable(self):
        with patch.object(adapter_mod, "_FUSION_AVAILABLE", False):
            assert adapter_mod.create_adapter_from_globals() is None
