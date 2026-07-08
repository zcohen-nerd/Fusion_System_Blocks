"""Regression tests for named-document slug resolution in the add-in bridge.

Slugging is lossy — distinct labels like "My Design!" and "My Design?"
both slug to "My_Design_" — so a Save As could silently overwrite an
unrelated document. These tests pin the collision-avoidance behaviour
of _resolve_unique_slug and the save/load round-trip built on it.

adsk is mocked by conftest.py; Fusion attribute storage is replaced
with an in-memory fake.
"""

from __future__ import annotations

import pytest

import Fusion_System_Blocks as fsb


class _FakeAttr:
    def __init__(self, owner, group_name, name, value):
        self._owner = owner
        self.groupName = group_name
        self.name = name
        self.value = value

    def deleteMe(self):
        self._owner._items.remove(self)


class _FakeAttributes:
    def __init__(self):
        self._items = []

    def __iter__(self):
        return iter(list(self._items))

    def add(self, group_name, name, value):
        attr = _FakeAttr(self, group_name, name, value)
        self._items.append(attr)
        return attr


class _FakeRootComponent:
    def __init__(self):
        self.attributes = _FakeAttributes()


@pytest.fixture
def fake_root(monkeypatch):
    root = _FakeRootComponent()
    monkeypatch.setattr(fsb, "get_root_component", lambda: root)
    return root


class TestResolveUniqueSlug:
    def test_fresh_label_uses_base_slug(self, fake_root):
        assert fsb._resolve_unique_slug("My Design") == "My_Design"

    def test_same_label_keeps_existing_slug(self, fake_root):
        """Saving over a document with the identical label is an
        intentional overwrite — the slug must not change."""
        fsb.save_named_diagram("My Design!", "{}")
        assert fsb._resolve_unique_slug("My Design!") == "My_Design_"

    def test_colliding_label_gets_suffixed_slug(self, fake_root):
        fsb.save_named_diagram("My Design!", "{}")
        assert fsb._resolve_unique_slug("My Design?") == "My_Design__2"

    def test_multiple_collisions_increment_suffix(self, fake_root):
        fsb.save_named_diagram("My Design!", "{}")
        fsb.save_named_diagram(
            "My Design?", "{}", slug=fsb._resolve_unique_slug("My Design?")
        )
        assert fsb._resolve_unique_slug("My Design*") == "My_Design__3"

    def test_suffixed_slug_stays_within_length_limit(self, fake_root):
        # Both labels truncate to the same 64-char slug, but differ as labels
        label_a = "X" * 70
        label_b = "X" * 70 + "Y"
        fsb.save_named_diagram(label_a, "{}")

        suffixed = fsb._resolve_unique_slug(label_b)
        assert suffixed != fsb._slug_from_label(label_a)
        assert len(suffixed) <= 64


class TestSaveAsCollisionEndToEnd:
    def test_colliding_labels_save_as_separate_documents(self, fake_root):
        """Two labels that slug identically must become two documents,
        each loading back its own content."""
        fsb.save_named_diagram("My Design!", '{"rev": 1}')
        slug_b = fsb._resolve_unique_slug("My Design?")
        fsb.save_named_diagram("My Design?", '{"rev": 2}', slug=slug_b)

        docs = fsb.list_named_diagrams()
        assert len(docs) == 2
        slugs = {d["slug"] for d in docs}
        assert slugs == {"My_Design_", "My_Design__2"}

        assert fsb.load_named_diagram("My_Design_") == '{"rev": 1}'
        assert fsb.load_named_diagram("My_Design__2") == '{"rev": 2}'
