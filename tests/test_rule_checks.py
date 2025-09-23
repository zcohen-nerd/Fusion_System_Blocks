"""
Test module for rule checking functionality in diagram_data.py
"""

import pytest
import sys
import os

# Add src directory to path so we can import diagram_data
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from diagram_data import (
    check_logic_level_compatibility,
    check_power_budget,
    check_implementation_completeness,
    run_all_rule_checks,
    get_rule_failures,
    create_block,
    create_connection,
    create_empty_diagram,
)


class TestRuleChecks:

    def test_logic_level_compatibility_success(self):
        """Test compatible logic levels pass the check"""
        diagram = {
            "blocks": [
                {
                    "id": "block1",
                    "name": "MCU",
                    "interfaces": [
                        {
                            "id": "out1",
                            "name": "GPIO",
                            "kind": "data",
                            "params": {"voltage": "3.3V"},
                        }
                    ],
                },
                {
                    "id": "block2",
                    "name": "Sensor",
                    "interfaces": [
                        {"id": "in1", "name": "Data", "kind": "data", "params": {"voltage": "3.3V"}}
                    ],
                },
            ],
            "connections": [],
        }

        connection = {
            "from": {"blockId": "block1", "interfaceId": "out1"},
            "to": {"blockId": "block2", "interfaceId": "in1"},
        }

        result = check_logic_level_compatibility(connection, diagram)
        assert result["success"] is True
        assert result["rule"] == "logic_level_compatibility"
        assert "Compatible logic levels" in result["message"]

    def test_logic_level_compatibility_mismatch(self):
        """Test incompatible logic levels fail the check"""
        diagram = {
            "blocks": [
                {
                    "id": "block1",
                    "name": "MCU",
                    "interfaces": [
                        {
                            "id": "out1",
                            "name": "GPIO",
                            "kind": "data",
                            "params": {"voltage": "1.8V"},
                        }
                    ],
                },
                {
                    "id": "block2",
                    "name": "Sensor",
                    "interfaces": [
                        {"id": "in1", "name": "Data", "kind": "data", "params": {"voltage": "5V"}}
                    ],
                },
            ],
            "connections": [],
        }

        connection = {
            "from": {"blockId": "block1", "interfaceId": "out1"},
            "to": {"blockId": "block2", "interfaceId": "in1"},
        }

        result = check_logic_level_compatibility(connection, diagram)
        assert result["success"] is False
        assert result["severity"] == "warning"
        assert "mismatch" in result["message"]

    def test_power_budget_success(self):
        """Test power budget within limits passes"""
        diagram = {
            "blocks": [
                {
                    "id": "supply1",
                    "name": "Power Supply",
                    "type": "Power Supply",
                    "attributes": {"output_current": "1000mA"},
                },
                {
                    "id": "mcu1",
                    "name": "MCU",
                    "type": "Microcontroller",
                    "attributes": {"current": "100mA"},
                },
                {
                    "id": "sensor1",
                    "name": "Sensor",
                    "type": "Sensor",
                    "attributes": {"current": "50mA"},
                },
            ],
            "connections": [],
        }

        result = check_power_budget(diagram)
        assert result["success"] is True
        assert result["rule"] == "power_budget"
        assert "Power budget OK" in result["message"]

    def test_power_budget_exceeded(self):
        """Test power budget exceeded fails the check"""
        diagram = {
            "blocks": [
                {
                    "id": "supply1",
                    "name": "Small Supply",
                    "type": "Power Supply",
                    "attributes": {"output_current": "100mA"},
                },
                {
                    "id": "hungry1",
                    "name": "Power Hungry Device",
                    "type": "Motor",
                    "attributes": {"current": "200mA"},
                },
            ],
            "connections": [],
        }

        result = check_power_budget(diagram)
        assert result["success"] is False
        assert result["severity"] == "error"
        assert "exceeded" in result["message"]

    def test_power_budget_no_specs(self):
        """Test power budget with no power specifications"""
        diagram = {
            "blocks": [
                {"id": "block1", "name": "Unknown Block", "type": "Custom", "attributes": {}}
            ],
            "connections": [],
        }

        result = check_power_budget(diagram)
        assert result["success"] is True
        assert "No power specifications found" in result["message"]

    def test_implementation_completeness_success(self):
        """Test complete implementation passes the check"""
        diagram = {
            "blocks": [
                {
                    "id": "block1",
                    "name": "Complete Block",
                    "status": "Implemented",
                    "attributes": {"voltage": "3.3V", "current": "100mA"},
                    "interfaces": [
                        {"id": "vcc", "name": "VCC", "kind": "power"},
                        {"id": "gnd", "name": "GND", "kind": "power"},
                    ],
                    "links": [{"target": "cad", "occToken": "token123"}],
                }
            ],
            "connections": [],
        }

        result = check_implementation_completeness(diagram)
        assert result["success"] is True
        assert "adequate implementation details" in result["message"]

    def test_implementation_completeness_incomplete(self):
        """Test incomplete implementation fails the check"""
        diagram = {
            "blocks": [
                {
                    "id": "block1",
                    "name": "Incomplete Block",
                    "status": "Implemented",
                    "attributes": {},  # Missing attributes
                    "interfaces": [],  # Missing interfaces
                    "links": [],  # Missing links
                }
            ],
            "connections": [],
        }

        result = check_implementation_completeness(diagram)
        assert result["success"] is False
        assert result["severity"] == "warning"
        assert "Incomplete blocks" in result["message"]

    def test_run_all_rule_checks(self):
        """Test running all rule checks together"""
        diagram = create_empty_diagram()

        # Add a simple valid block
        block = create_block("Test Block", 0, 0)
        block["attributes"] = {"voltage": "3.3V"}
        diagram["blocks"].append(block)

        results = run_all_rule_checks(diagram)

        # Should have at least power budget and implementation completeness checks
        assert len(results) >= 2
        rule_names = {result["rule"] for result in results}
        assert "power_budget" in rule_names
        assert "implementation_completeness" in rule_names

    def test_get_rule_failures(self):
        """Test filtering for only failed rule checks"""
        diagram = {
            "blocks": [
                {
                    "id": "block1",
                    "name": "Bad Block",
                    "status": "Implemented",
                    "attributes": {},
                    "interfaces": [],
                    "links": [],
                }
            ],
            "connections": [],
        }

        failures = get_rule_failures(diagram)

        # Should have at least implementation completeness failure
        assert len(failures) > 0
        assert all(not result["success"] for result in failures)

    def test_logic_level_compatibility_missing_interface(self):
        """Test logic level check with missing interface references"""
        diagram = {
            "blocks": [
                {"id": "block1", "name": "Block1", "interfaces": []},
                {"id": "block2", "name": "Block2", "interfaces": []},
            ],
            "connections": [],
        }

        connection = {
            "from": {"blockId": "block1", "interfaceId": "missing"},
            "to": {"blockId": "block2", "interfaceId": "missing"},
        }

        result = check_logic_level_compatibility(connection, diagram)
        assert result["success"] is False
        assert result["severity"] == "error"
        assert "Cannot find connected interfaces" in result["message"]


if __name__ == "__main__":
    pytest.main([__file__])
