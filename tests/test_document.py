"""Tests for fusion_addin/document.py using mock Fusion 360 objects."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

# Use shared adsk mocks registered by conftest.py
import sys
_adsk_core = sys.modules["adsk.core"]
_adsk_fusion = sys.modules["adsk.fusion"]

import fusion_addin.document as doc_mod
doc_mod._FUSION_AVAILABLE = True

from fusion_addin.document import DocumentManager


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_manager(*, root_comp=None, design=None, document=None):
    """Return a DocumentManager with a stubbed Fusion environment."""
    app = MagicMock(name="app")

    _design = design or MagicMock(name="design")
    _design.rootComponent = root_comp or MagicMock(name="rootComponent")
    _adsk_fusion.Design.cast.return_value = _design

    app.activeProduct = _design
    app.activeDocument = document or MagicMock(name="activeDocument")

    return DocumentManager(app)


def _make_attr(group: str, name: str, value: str):
    a = MagicMock()
    a.groupName = group
    a.name = name
    a.value = value
    return a


# ---------------------------------------------------------------------------
# Tests: properties
# ---------------------------------------------------------------------------


class TestDocumentProperties:
    def test_active_document(self):
        doc = MagicMock()
        mgr = _make_manager(document=doc)
        assert mgr.active_document is doc

    def test_active_design(self):
        mgr = _make_manager()
        assert mgr.active_design is not None

    def test_root_component(self):
        rc = MagicMock()
        mgr = _make_manager(root_comp=rc)
        assert mgr.root_component is rc

    def test_active_document_none_when_unavailable(self):
        mgr = _make_manager()
        with patch.object(doc_mod, "_FUSION_AVAILABLE", False):
            assert mgr.active_document is None

    def test_active_design_none_when_unavailable(self):
        mgr = _make_manager()
        with patch.object(doc_mod, "_FUSION_AVAILABLE", False):
            assert mgr.active_design is None


# ---------------------------------------------------------------------------
# Tests: get / set / delete attribute
# ---------------------------------------------------------------------------


class TestAttributes:
    def test_get_attribute_found(self):
        rc = MagicMock()
        rc.attributes = [_make_attr("grp", "key", "val123")]
        mgr = _make_manager(root_comp=rc)
        assert mgr.get_attribute("grp", "key") == "val123"

    def test_get_attribute_not_found(self):
        rc = MagicMock()
        rc.attributes = []
        mgr = _make_manager(root_comp=rc)
        assert mgr.get_attribute("grp", "key") is None

    def test_get_attribute_no_root_comp(self):
        mgr = _make_manager()
        _adsk_fusion.Design.cast.return_value = None
        assert mgr.get_attribute("grp", "key") is None

    def test_set_attribute(self):
        rc = MagicMock()
        rc.attributes = MagicMock()
        rc.attributes.__iter__ = MagicMock(return_value=iter([]))
        rc.attributes.add = MagicMock()
        mgr = _make_manager(root_comp=rc)

        assert mgr.set_attribute("grp", "key", "newval") is True
        rc.attributes.add.assert_called_once_with("grp", "key", "newval")

    def test_set_attribute_replaces_existing(self):
        existing = _make_attr("grp", "key", "old")
        rc = MagicMock()
        rc.attributes = MagicMock()
        rc.attributes.__iter__ = MagicMock(return_value=iter([existing]))
        rc.attributes.add = MagicMock()
        mgr = _make_manager(root_comp=rc)

        assert mgr.set_attribute("grp", "key", "new") is True
        existing.deleteMe.assert_called_once()
        rc.attributes.add.assert_called_once()

    def test_set_attribute_no_root_comp(self):
        mgr = _make_manager()
        _adsk_fusion.Design.cast.return_value = None
        assert mgr.set_attribute("grp", "key", "v") is False

    def test_delete_attribute_found(self):
        existing = _make_attr("grp", "key", "v")
        rc = MagicMock()
        rc.attributes = [existing]
        mgr = _make_manager(root_comp=rc)

        assert mgr.delete_attribute("grp", "key") is True
        existing.deleteMe.assert_called_once()

    def test_delete_attribute_not_found(self):
        rc = MagicMock()
        rc.attributes = []
        mgr = _make_manager(root_comp=rc)
        assert mgr.delete_attribute("grp", "key") is False


# ---------------------------------------------------------------------------
# Tests: JSON attribute helpers
# ---------------------------------------------------------------------------


class TestJsonAttributes:
    def test_get_json_attribute(self):
        data = {"hello": "world"}
        rc = MagicMock()
        rc.attributes = [_make_attr("g", "k", json.dumps(data))]
        mgr = _make_manager(root_comp=rc)
        assert mgr.get_json_attribute("g", "k") == data

    def test_get_json_attribute_invalid_json(self):
        rc = MagicMock()
        rc.attributes = [_make_attr("g", "k", "not json")]
        mgr = _make_manager(root_comp=rc)
        assert mgr.get_json_attribute("g", "k") is None

    def test_get_json_attribute_not_found(self):
        rc = MagicMock()
        rc.attributes = []
        mgr = _make_manager(root_comp=rc)
        assert mgr.get_json_attribute("g", "k") is None

    def test_set_json_attribute(self):
        rc = MagicMock()
        rc.attributes = MagicMock()
        rc.attributes.__iter__ = MagicMock(return_value=iter([]))
        rc.attributes.add = MagicMock()
        mgr = _make_manager(root_comp=rc)

        assert mgr.set_json_attribute("g", "k", {"a": 1}) is True
        call_val = rc.attributes.add.call_args[0][2]
        assert json.loads(call_val) == {"a": 1}


# ---------------------------------------------------------------------------
# Tests: document info
# ---------------------------------------------------------------------------


class TestDocumentInfo:
    def test_get_document_info(self):
        doc = MagicMock()
        doc.name = "MyDoc"
        doc.dataFile.id = "file-123"
        doc.dataFile.versionNumber = 3

        design = MagicMock()
        design.rootComponent = MagicMock()
        design.designType = "ParametricDesignType"

        mgr = _make_manager(design=design, document=doc)
        info = mgr.get_document_info()

        assert info["name"] == "MyDoc"
        assert info["id"] == "file-123"
        assert info["has_design"] is True

    def test_get_document_info_unavailable(self):
        mgr = _make_manager()
        with patch.object(doc_mod, "_FUSION_AVAILABLE", False):
            info = mgr.get_document_info()
            assert info["name"] == ""
            assert info["has_design"] is False


# ---------------------------------------------------------------------------
# Tests: occurrence/component listing
# ---------------------------------------------------------------------------


class TestOccurrencesComponents:
    def test_get_all_occurrences(self):
        o1, o2 = MagicMock(), MagicMock()
        rc = MagicMock()
        rc.allOccurrences = [o1, o2]
        mgr = _make_manager(root_comp=rc)
        result = mgr.get_all_occurrences()
        assert len(result) == 2

    def test_get_all_occurrences_no_root(self):
        mgr = _make_manager()
        _adsk_fusion.Design.cast.return_value = None
        assert mgr.get_all_occurrences() == []

    def test_get_all_components(self):
        c1 = MagicMock()
        design = MagicMock()
        design.rootComponent = MagicMock()
        design.allComponents = [c1]
        mgr = _make_manager(design=design)
        result = mgr.get_all_components()
        assert len(result) == 1

    def test_get_all_components_no_design(self):
        mgr = _make_manager()
        _adsk_fusion.Design.cast.return_value = None
        assert mgr.get_all_components() == []
