"""
Test module for status tracking functionality in diagram_data.py
"""

import pytest
import sys
import os

# Add src directory to path so we can import diagram_data
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from diagram_data import (
    compute_block_status,
    update_block_statuses,
    get_status_color,
    create_block,
    create_empty_diagram,
)


class TestStatusTracking:

    def test_compute_block_status_placeholder(self):
        """Test that empty blocks get Placeholder status"""
        # Empty block
        block = {}
        assert compute_block_status(block) == "Placeholder"

        # Block with empty arrays
        block = {
            "id": "test-1",
            "name": "Test Block",
            "attributes": {},
            "interfaces": [],
            "links": [],
        }
        assert compute_block_status(block) == "Placeholder"

    def test_compute_block_status_planned(self):
        """Test that blocks with attributes but no links get Planned status"""
        block = {
            "id": "test-1",
            "name": "Test Block",
            "attributes": {"voltage": "5V", "current": "100mA"},
            "interfaces": [],
            "links": [],
        }
        assert compute_block_status(block) == "Planned"

    def test_compute_block_status_in_work(self):
        """Test that blocks with links but incomplete get In-Work status"""
        block = {
            "id": "test-1",
            "name": "Test Block",
            "attributes": {},
            "interfaces": [],
            "links": [{"target": "cad", "occToken": "token123"}],
        }
        assert compute_block_status(block) == "In-Work"

    def test_compute_block_status_implemented(self):
        """Test that blocks with attributes, interfaces, and links get Implemented status"""
        block = {
            "id": "test-1",
            "name": "Test Block",
            "attributes": {"voltage": "5V"},
            "interfaces": [{"id": "intf-1", "name": "VCC", "kind": "power"}],
            "links": [{"target": "cad", "occToken": "token123"}],
        }
        assert compute_block_status(block) == "Implemented"

    def test_update_block_statuses(self):
        """Test updating statuses for all blocks in a diagram"""
        diagram = {
            "blocks": [
                {
                    "id": "block-1",
                    "name": "Empty Block",
                    "status": "Verified",  # Should be updated
                    "attributes": {},
                    "interfaces": [],
                    "links": [],
                },
                {
                    "id": "block-2",
                    "name": "Planned Block",
                    "status": "Placeholder",  # Should be updated
                    "attributes": {"voltage": "3.3V"},
                    "interfaces": [],
                    "links": [],
                },
            ],
            "connections": [],
        }

        updated_diagram = update_block_statuses(diagram)

        assert updated_diagram["blocks"][0]["status"] == "Placeholder"
        assert updated_diagram["blocks"][1]["status"] == "Planned"

    def test_get_status_color(self):
        """Test status color mapping"""
        assert get_status_color("Placeholder") == "#cccccc"
        assert get_status_color("Planned") == "#87ceeb"
        assert get_status_color("In-Work") == "#ffd700"
        assert get_status_color("Implemented") == "#90ee90"
        assert get_status_color("Verified") == "#00ff00"
        assert get_status_color("Unknown") == "#cccccc"  # Default fallback

    def test_create_block_default_status(self):
        """Test that new blocks have default Placeholder status"""
        block = create_block("Test Block", 100, 200)
        assert block["status"] == "Placeholder"

    def test_status_with_empty_attributes(self):
        """Test status computation with empty string attributes"""
        block = {
            "id": "test-1",
            "name": "Test Block",
            "attributes": {"voltage": "", "current": ""},  # Empty strings
            "interfaces": [],
            "links": [],
        }
        assert compute_block_status(block) == "Placeholder"

    def test_status_progression_scenario(self):
        """Test a realistic status progression scenario"""
        # Start with basic block
        block = create_block("MCU", 0, 0)
        assert compute_block_status(block) == "Placeholder"

        # Add some attributes - should become Planned
        block["attributes"] = {"model": "STM32F4", "voltage": "3.3V"}
        assert compute_block_status(block) == "Planned"

        # Add a CAD link - should become In-Work
        block["links"] = [{"target": "cad", "occToken": "token123", "docId": "doc456"}]
        assert compute_block_status(block) == "In-Work"

        # Add interfaces - should become Implemented
        block["interfaces"] = [
            {"id": "vcc", "name": "VCC", "kind": "power"},
            {"id": "gnd", "name": "GND", "kind": "power"},
        ]
        assert compute_block_status(block) == "Implemented"


if __name__ == "__main__":
    pytest.main([__file__])
