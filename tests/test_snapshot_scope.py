"""Regression tests for snapshot-store scope handling in the add-in bridge.

The global snapshot store is loaded per document scope (default slot or a
named-document slug). Persisting it into a *different* scope's attribute
would overwrite that document's history with unrelated snapshots — these
tests pin the guard that prevents exactly that.

adsk is mocked by conftest.py, and Fusion attribute storage is replaced
with an in-memory fake so load/persist round-trips can be exercised.
"""

from __future__ import annotations

import json

import pytest

import Fusion_System_Blocks as fsb
from fsb_core.version_control import SnapshotStore


class _FakeAttr:
    def __init__(self, owner, group_name, name, value):
        self._owner = owner
        self.groupName = group_name
        self.name = name
        self.value = value

    def deleteMe(self):
        self._owner._items.remove(self)


class _FakeAttributes:
    """Minimal stand-in for a Fusion Attributes collection."""

    def __init__(self):
        self._items = []

    def __iter__(self):
        return iter(list(self._items))

    def add(self, group_name, name, value):
        attr = _FakeAttr(self, group_name, name, value)
        self._items.append(attr)
        return attr

    def get(self, group_name, name):
        for attr in self._items:
            if attr.groupName == group_name and attr.name == name:
                return attr
        return None


class _FakeRootComponent:
    def __init__(self):
        self.attributes = _FakeAttributes()


@pytest.fixture
def fake_root(monkeypatch):
    """Patch the add-in's root-component accessor with an in-memory fake."""
    root = _FakeRootComponent()
    monkeypatch.setattr(fsb, "get_root_component", lambda: root)
    # Reset module-level store state so tests are order-independent
    monkeypatch.setattr(fsb, "_snapshot_store", SnapshotStore(max_snapshots=50))
    monkeypatch.setattr(fsb, "_snapshot_store_scope", None)
    return root


class TestSnapshotScopeGuard:
    def test_persist_matching_scope_succeeds(self, fake_root):
        fsb._set_snapshot_store("docA")
        fsb._snapshot_store.add_document({"blocks": [], "connections": []})

        assert fsb._persist_snapshot_store("docA") is True
        attr = fake_root.attributes.get(fsb.ATTR_GROUP, "snapshots_docA")
        assert attr is not None
        assert len(json.loads(attr.value)) == 1

    def test_persist_refuses_cross_scope_write(self, fake_root):
        """A store loaded for a named doc must never land in the default
        scope (the original P0 bug in _handle_save_named_diagram)."""
        fsb._set_snapshot_store("docA")
        fsb._snapshot_store.add_document({"blocks": [], "connections": []})

        assert fsb._persist_snapshot_store() is False
        assert fake_root.attributes.get(fsb.ATTR_GROUP, "snapshots") is None

    def test_persist_refuses_write_into_other_named_scope(self, fake_root):
        fsb._set_snapshot_store("docA")
        fsb._snapshot_store.add_document({"blocks": [], "connections": []})

        assert fsb._persist_snapshot_store("docB") is False
        assert fake_root.attributes.get(fsb.ATTR_GROUP, "snapshots_docB") is None

    def test_default_scope_persist_succeeds(self, fake_root):
        fsb._set_snapshot_store()
        assert fsb._persist_snapshot_store() is True
        assert fake_root.attributes.get(fsb.ATTR_GROUP, "snapshots") is not None

    def test_scoped_history_roundtrips_through_attributes(self, fake_root):
        # Persist one snapshot under docA
        fsb._set_snapshot_store("docA")
        fsb._snapshot_store.add_document({"blocks": [{"id": "b1"}]})
        assert fsb._persist_snapshot_store("docA") is True

        # Switch to the default scope, then back — docA's history reloads
        fsb._set_snapshot_store()
        assert fsb._snapshot_store.count == 0

        store = fsb._set_snapshot_store("docA")
        assert store.count == 1

    def test_set_snapshot_store_normalizes_slug(self, fake_root):
        fsb._set_snapshot_store("My Design!")
        # Persisting with the same raw label must match the stored scope
        assert fsb._persist_snapshot_store("My Design!") is True
