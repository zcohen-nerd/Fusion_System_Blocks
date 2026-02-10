"""Tests for fusion_addin/selection.py using mock Fusion 360 objects."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

# Use shared adsk mocks registered by conftest.py
import sys
_adsk_core = sys.modules["adsk.core"]
_adsk_fusion = sys.modules["adsk.fusion"]

import fusion_addin.selection as sel_mod
sel_mod._FUSION_AVAILABLE = True

from fusion_addin.selection import SelectionHandler


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_handler() -> SelectionHandler:
    ui = MagicMock(name="ui")
    return SelectionHandler(ui)


def _mock_occurrence(name: str = "Part1", token: str = "tok-abc"):
    occ = MagicMock()
    occ.entityToken = token
    occ.name = name
    _adsk_fusion.Occurrence.cast.return_value = occ
    return occ


# ---------------------------------------------------------------------------
# Tests: select_occurrence
# ---------------------------------------------------------------------------


class TestSelectOccurrence:
    def test_returns_none_when_fusion_unavailable(self):
        handler = _make_handler()
        with patch.object(sel_mod, "_FUSION_AVAILABLE", False):
            assert handler.select_occurrence() is None

    def test_returns_none_on_cancel(self):
        handler = _make_handler()
        handler._ui.selectEntity.return_value = None
        assert handler.select_occurrence() is None

    def test_returns_occurrence_info(self):
        handler = _make_handler()
        occ = _mock_occurrence("Motor", "tok-123")

        # Simulate selectEntity returning the occurrence
        handler._ui.selectEntity.return_value = occ

        # Mock Application.get()
        mock_app = MagicMock()
        mock_app.activeDocument.dataFile.id = "doc-42"
        _adsk_core.Application.get.return_value = mock_app

        result = handler.select_occurrence("Pick a part")
        assert result is not None
        assert result["type"] == "CAD"
        assert result["occToken"] == "tok-123"
        assert result["name"] == "Motor"
        assert result["docId"] == "doc-42"

    def test_returns_none_when_cast_fails(self):
        handler = _make_handler()
        handler._ui.selectEntity.return_value = MagicMock()
        _adsk_fusion.Occurrence.cast.return_value = None
        assert handler.select_occurrence() is None


# ---------------------------------------------------------------------------
# Tests: select_multiple_occurrences
# ---------------------------------------------------------------------------


class TestSelectMultipleOccurrences:
    def test_returns_empty_when_fusion_unavailable(self):
        handler = _make_handler()
        with patch.object(sel_mod, "_FUSION_AVAILABLE", False):
            assert handler.select_multiple_occurrences() == []

    def test_returns_empty_on_immediate_cancel(self):
        handler = _make_handler()
        handler._ui.selectEntity.return_value = None
        assert handler.select_multiple_occurrences() == []

    def test_collects_up_to_max_count(self):
        handler = _make_handler()
        occ = _mock_occurrence("Bolt", "tok-bolt")

        mock_app = MagicMock()
        mock_app.activeDocument.dataFile.id = "d1"
        _adsk_core.Application.get.return_value = mock_app

        handler._ui.selectEntity.return_value = occ
        results = handler.select_multiple_occurrences(max_count=2)
        assert len(results) == 2


# ---------------------------------------------------------------------------
# Tests: find_occurrence_by_token
# ---------------------------------------------------------------------------


class TestFindOccurrenceByToken:
    def test_returns_none_when_fusion_unavailable(self):
        handler = _make_handler()
        root = MagicMock()
        with patch.object(sel_mod, "_FUSION_AVAILABLE", False):
            assert handler.find_occurrence_by_token(root, "tok") is None

    def test_finds_matching_occurrence(self):
        handler = _make_handler()
        occ = MagicMock()
        occ.entityToken = "tok-match"

        root = MagicMock()
        root.allOccurrences = [occ]

        result = handler.find_occurrence_by_token(root, "tok-match")
        assert result is occ

    def test_returns_none_when_no_match(self):
        handler = _make_handler()
        occ = MagicMock()
        occ.entityToken = "tok-other"
        root = MagicMock()
        root.allOccurrences = [occ]

        assert handler.find_occurrence_by_token(root, "tok-wanted") is None


# ---------------------------------------------------------------------------
# Tests: get_occurrence_info
# ---------------------------------------------------------------------------


class TestGetOccurrenceInfo:
    def test_returns_empty_when_fusion_unavailable(self):
        handler = _make_handler()
        with patch.object(sel_mod, "_FUSION_AVAILABLE", False):
            assert handler.get_occurrence_info(MagicMock()) == {}

    def test_extracts_component_info(self):
        handler = _make_handler()
        occ = MagicMock()
        occ.component.name = "Resistor"
        occ.component.description = "10k"
        occ.component.material.name = "Ceramic"

        props = MagicMock()
        props.mass = 5.0  # grams internally
        props.volume = 2.0
        props.boundingBox.minPoint.x = 0
        props.boundingBox.minPoint.y = 0
        props.boundingBox.minPoint.z = 0
        props.boundingBox.maxPoint.x = 1
        props.boundingBox.maxPoint.y = 1
        props.boundingBox.maxPoint.z = 1
        occ.component.getPhysicalProperties.return_value = props

        info = handler.get_occurrence_info(occ)
        assert info["name"] == "Resistor"
        assert info["description"] == "10k"
        assert info["material"] == "Ceramic"
        assert info["boundingBox"] is not None
