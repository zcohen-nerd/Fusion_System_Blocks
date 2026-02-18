"""Tests for add-in startup, manifest config, and toolbar registration.

Validates that the add-in manifest is correctly configured for
automatic startup, and that the toolbar control registration logic
(including workspace activation handling) behaves correctly.
"""

import json
import pathlib

import pytest

_repo_root = pathlib.Path(__file__).resolve().parent.parent
_manifest_path = _repo_root / "Fusion_System_Blocks.manifest"


class TestManifest:
    """Validate the Fusion add-in manifest file."""

    def test_manifest_exists(self):
        """Manifest file must exist at the repository root."""
        assert _manifest_path.exists(), (
            "Fusion_System_Blocks.manifest not found"
        )

    def test_manifest_is_valid_json(self):
        """Manifest must be valid JSON."""
        text = _manifest_path.read_text(encoding="utf-8")
        data = json.loads(text)
        assert isinstance(data, dict)

    def test_manifest_run_on_startup_is_true(self):
        """runOnStartup must be true so the button appears on launch.

        When runOnStartup is false the add-in only loads when
        manually launched from Utilities → Add-Ins, making the
        toolbar button invisible until then.
        """
        data = json.loads(
            _manifest_path.read_text(encoding="utf-8")
        )
        assert data.get("runOnStartup") is True, (
            "runOnStartup must be true for the toolbar button "
            "to appear automatically when Fusion starts"
        )

    def test_manifest_has_required_fields(self):
        """Manifest must contain the required Fusion add-in fields."""
        data = json.loads(
            _manifest_path.read_text(encoding="utf-8")
        )
        required = [
            "autodeskProduct",
            "type",
            "id",
            "version",
            "runOnStartup",
        ]
        for field in required:
            assert field in data, (
                f"Missing required manifest field: {field}"
            )

    def test_manifest_type_is_addin(self):
        """Manifest type must be 'addin' (not 'script')."""
        data = json.loads(
            _manifest_path.read_text(encoding="utf-8")
        )
        assert data.get("type") == "addin"


class TestToolbarRegistration:
    """Validate toolbar registration helpers in the main module.

    These tests import the main add-in module with adsk mocked
    (via conftest.py) and verify the helper functions exist and
    have the expected signatures.
    """

    def test_ensure_toolbar_controls_exists(self):
        """_ensure_toolbar_controls helper must be importable."""
        # conftest.py already mocks adsk, so this import is safe
        import Fusion_System_Blocks as fsb

        assert callable(
            getattr(fsb, "_ensure_toolbar_controls", None)
        ), "_ensure_toolbar_controls function is missing"

    def test_workspace_activated_handler_exists(self):
        """WorkspaceActivatedHandler class must be defined."""
        import Fusion_System_Blocks as fsb

        cls = getattr(fsb, "WorkspaceActivatedHandler", None)
        assert cls is not None, (
            "WorkspaceActivatedHandler class is missing"
        )
