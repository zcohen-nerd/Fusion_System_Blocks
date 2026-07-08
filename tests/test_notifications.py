"""Regression tests for palette notification fallback behaviour.

When the palette web-view is unavailable, only warnings and errors may
fall back to Fusion's blocking message box — transient info/success
toasts must never interrupt the user with a modal dialog.

adsk is mocked by conftest.py.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

import Fusion_System_Blocks as fsb


@pytest.fixture
def ui_without_palette(monkeypatch):
    """A fake UI whose palette lookup fails, forcing the fallback path."""
    ui = MagicMock(name="ui")
    ui.palettes.itemById.return_value = None
    monkeypatch.setattr(fsb, "UI", ui)
    return ui


class TestNotificationFallback:
    def test_error_falls_back_to_message_box(self, ui_without_palette):
        fsb.send_palette_notification("boom", level="error")
        ui_without_palette.messageBox.assert_called_once_with("boom")

    def test_warning_falls_back_to_message_box(self, ui_without_palette):
        fsb.send_palette_notification("careful", level="warning")
        ui_without_palette.messageBox.assert_called_once_with("careful")

    def test_info_does_not_block(self, ui_without_palette):
        fsb.send_palette_notification("fyi", level="info")
        ui_without_palette.messageBox.assert_not_called()

    def test_success_does_not_block(self, ui_without_palette):
        fsb.send_palette_notification("saved", level="success")
        ui_without_palette.messageBox.assert_not_called()

    def test_palette_present_sends_bridge_event(self, monkeypatch):
        ui = MagicMock(name="ui")
        palette = MagicMock(name="palette")
        ui.palettes.itemById.return_value = palette
        monkeypatch.setattr(fsb, "UI", ui)

        fsb.send_palette_notification("hello", level="info")
        palette.sendInfoToHTML.assert_called_once()
        ui.messageBox.assert_not_called()
