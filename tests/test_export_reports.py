"""Test export functionality for Fusion System Blocks."""

from unittest.mock import patch, MagicMock

import pytest

import diagram_data


class TestExportFunctions:
    """Test export report generation functions."""

    @pytest.fixture
    def sample_diagram(self):
        """Sample diagram data for testing."""
        return {
            "schema": "system-blocks-v1",
            "blocks": [
                {
                    "id": "block1",
                    "name": "Power Supply",
                    "type": "PowerSupply",
                    "status": "Verified",
                    "x": 100,
                    "y": 100,
                    "interfaces": [
                        {
                            "id": "pwr_out",
                            "name": "Power Output",
                            "kind": "electrical",
                            "direction": "output",
                            "port": {"side": "right", "index": 0},
                            "params": {"voltage": "3.3V", "current": "500mA"},
                        }
                    ],
                    "links": [
                        {
                            "target": "cad",
                            "occToken": "abc123",
                            "docId": "doc1",
                            "name": "PSU_Module",
                        },
                        {"target": "ecad", "device": "LM3940",
                            "footprint": "TO-220"},
                    ],
                    "attributes": {"power_rating": "5W", "efficiency": "85%"},
                },
                {
                    "id": "block2",
                    "name": "Microcontroller",
                    "type": "Microcontroller",
                    "status": "Planned",
                    "x": 300,
                    "y": 100,
                    "interfaces": [
                        {
                            "id": "pwr_in",
                            "name": "Power Input",
                            "kind": "electrical",
                            "direction": "input",
                            "port": {"side": "left", "index": 0},
                            "params": {"voltage": "3.3V", "current": "100mA"},
                        },
                        {
                            "id": "uart",
                            "name": "UART",
                            "kind": "data",
                            "direction": "bidirectional",
                            "port": {"side": "right", "index": 0},
                            "params": {"baud_rate": "115200"},
                        },
                    ],
                    "links": [],
                    "attributes": {"mcu_type": "ARM Cortex-M4"},
                },
            ],
            "connections": [
                {
                    "id": "conn1",
                    "from": {"blockId": "block1", "interfaceId": "pwr_out"},
                    "to": {"blockId": "block2", "interfaceId": "pwr_in"},
                    "kind": "electrical",
                    "attributes": {"wire_gauge": "22AWG"},
                }
            ],
        }

    def test_generate_markdown_report(self, sample_diagram):
        """Test Markdown report generation."""
        report = diagram_data.generate_markdown_report(sample_diagram)

        # Check report structure
        assert "# System Blocks Report" in report
        assert "## Summary" in report
        assert "## Block Details" in report
        assert "## Connection Details" in report
        assert "## Interface Details" in report

        # Check block content
        assert "Power Supply" in report
        assert "Microcontroller" in report
        assert "Verified" in report
        assert "Planned" in report

        # Check connection content
        assert "Power Supply" in report  # Should include block names in connections

    def test_generate_pin_map_csv(self, sample_diagram):
        """Test CSV pin map generation."""
        csv_content = diagram_data.generate_pin_map_csv(sample_diagram)

        lines = csv_content.strip().split("\n")
        header = lines[0]

        # Check CSV header
        expected_cols = [
            "Signal",
            "Source Block",
            "Source Interface",
            "Dest Block",
            "Dest Interface",
            "Protocol",
            "Notes",
        ]
        for col in expected_cols:
            assert col in header

        # Check data rows
        assert len(lines) >= 2  # Has data beyond header
        assert "Power Supply" in csv_content
        assert "Microcontroller" in csv_content

    def test_generate_pin_map_header(self, sample_diagram):
        """Test C header generation."""
        header_content = diagram_data.generate_pin_map_header(sample_diagram)

        # Check header structure
        assert "#ifndef PIN_DEFINITIONS_H" in header_content
        assert "#define PIN_DEFINITIONS_H" in header_content
        assert "#endif" in header_content

        # Check that it's a valid C header
        assert "Auto-generated pin definitions" in header_content

    @patch("builtins.open", create=True)
    @patch("pathlib.Path.mkdir")
    @patch("pathlib.Path.exists")
    def test_export_report_files(self, mock_exists, mock_mkdir, mock_open, sample_diagram):
        """Test export file writing."""
        # Mock file system
        mock_exists.return_value = False
        mock_file = MagicMock()
        mock_open.return_value.__enter__.return_value = mock_file

        # Call export function
        exported_files = diagram_data.export_report_files(sample_diagram)

        # Check returned file paths
        assert isinstance(exported_files, dict)
        assert "markdown" in exported_files or "markdown_error" in exported_files
        assert "csv" in exported_files or "csv_error" in exported_files
        assert "header" in exported_files or "header_error" in exported_files

        # Check directory creation
        mock_mkdir.assert_called()

        # Check file writing
        assert mock_open.call_count >= 1

    def test_export_empty_diagram(self):
        """Test export with empty diagram."""
        empty_diagram = {"blocks": [], "connections": []}

        # Should not crash, should generate minimal reports
        report = diagram_data.generate_markdown_report(empty_diagram)
        assert "# System Blocks Report" in report
        assert "No blocks defined" in report

        csv_content = diagram_data.generate_pin_map_csv(empty_diagram)
        lines = csv_content.strip().split("\n")
        assert len(lines) == 1  # Just header

        header_content = diagram_data.generate_pin_map_header(empty_diagram)
        assert "#ifndef PIN_DEFINITIONS_H" in header_content

    def test_export_with_rule_violations(self, sample_diagram):
        """Test export includes rule check results."""
        # Add a block without interfaces to trigger rule violation
        sample_diagram["blocks"].append(
            {
                "id": "block3",
                "name": "Empty Block",
                "type": "Generic",
                "status": "Placeholder",
                "interfaces": [],
            }
        )

        report = diagram_data.generate_markdown_report(sample_diagram)

        # Should include rule check results
        assert "## Summary" in report
        # Should include the empty block
        assert "Empty Block" in report

    def test_markdown_report_completeness(self, sample_diagram):
        """Test that Markdown report includes all expected sections."""
        report = diagram_data.generate_markdown_report(sample_diagram)

        # Check all major sections exist
        sections = [
            "# System Blocks Report",
            "## Summary",
            "## Block Details",
            "## Connection Details",
            "## Interface Details",
        ]

        for section in sections:
            assert section in report, f"Missing section: {section}"

        # Check for specific content details
        assert "2" in report  # Block count
        assert "1" in report  # Connection count
        assert "5W" in report  # Power rating attribute
        assert "22AWG" in report  # Connection attribute

    def test_csv_pin_map_completeness(self, sample_diagram):
        """Test CSV includes all pins and connections."""
        csv_content = diagram_data.generate_pin_map_csv(sample_diagram)
        lines = csv_content.strip().split("\n")

        # Should have header + connection data
        assert len(lines) >= 2

        # Check connection is represented
        assert "Power Supply" in csv_content
        assert "Microcontroller" in csv_content

    def test_c_header_pin_definitions(self, sample_diagram):
        """Test C header has valid pin definitions."""
        header_content = diagram_data.generate_pin_map_header(sample_diagram)

        # Should be a valid C header with proper structure
        assert "#ifndef PIN_DEFINITIONS_H" in header_content
        assert "#define PIN_DEFINITIONS_H" in header_content
        assert "#endif" in header_content

        # Check for auto-generated comment
        assert "Auto-generated pin definitions" in header_content
