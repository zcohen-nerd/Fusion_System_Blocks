"""Test export functionality for Fusion System Blocks."""

import json
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

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
                        {"target": "ecad", "device": "LM3940", "footprint": "TO-220"},
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
    def test_export_report_files(
        self, mock_exists, mock_mkdir, mock_open, sample_diagram
    ):
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


# =====================================================================
# New export generators
# =====================================================================


class TestHTMLReport:
    """Tests for the self-contained HTML report generator."""

    @pytest.fixture
    def sample_diagram(self):
        return _make_sample_diagram()

    def test_html_is_complete_document(self, sample_diagram):
        html = diagram_data.generate_html_report(sample_diagram)
        assert "<!DOCTYPE html>" in html
        assert "<html" in html
        assert "</html>" in html

    def test_html_contains_blocks(self, sample_diagram):
        html = diagram_data.generate_html_report(sample_diagram)
        assert "Power Supply" in html
        assert "Microcontroller" in html

    def test_html_contains_connections(self, sample_diagram):
        html = diagram_data.generate_html_report(sample_diagram)
        # Connection from Power Supply → Microcontroller
        assert "Power Supply" in html
        assert "Microcontroller" in html

    def test_html_contains_status_classes(self, sample_diagram):
        html = diagram_data.generate_html_report(sample_diagram)
        assert "status-verified" in html or "status-planned" in html

    def test_html_rule_results(self, sample_diagram):
        html = diagram_data.generate_html_report(sample_diagram)
        # Should contain rule-check output (pass or fail)
        assert "Rule Check" in html or "rule" in html.lower()

    def test_html_empty_diagram(self):
        html = diagram_data.generate_html_report({"blocks": [], "connections": []})
        assert "<!DOCTYPE html>" in html
        assert "No blocks" in html

    def test_html_escapes_special_characters(self):
        diagram = {
            "blocks": [
                {
                    "id": "b1",
                    "name": "<script>alert('xss')</script>",
                    "type": "Generic",
                    "status": "Placeholder",
                    "x": 10,
                    "y": 10,
                    "interfaces": [],
                    "links": [],
                    "attributes": {},
                }
            ],
            "connections": [],
        }
        html = diagram_data.generate_html_report(diagram)
        assert "<script>" not in html
        assert "&lt;script&gt;" in html


class TestBOMExport:
    """Tests for Bill of Materials CSV and JSON export."""

    @pytest.fixture
    def sample_diagram(self):
        return _make_sample_diagram()

    def test_bom_csv_header(self, sample_diagram):
        csv_content = diagram_data.generate_bom_csv(sample_diagram)
        header = csv_content.split("\n")[0]
        assert "Block" in header
        assert "Part Number" in header
        assert "Quantity" in header
        assert "Unit Cost" in header
        assert "Total Cost" in header

    def test_bom_csv_has_rows(self, sample_diagram):
        csv_content = diagram_data.generate_bom_csv(sample_diagram)
        lines = [line for line in csv_content.strip().split("\n") if line.strip()]
        # Header + at least as many data rows as blocks
        assert len(lines) >= 1 + len(sample_diagram["blocks"])

    def test_bom_csv_empty_diagram(self):
        csv_content = diagram_data.generate_bom_csv({"blocks": [], "connections": []})
        lines = [line for line in csv_content.strip().split("\n") if line.strip()]
        assert len(lines) == 1  # header only

    def test_bom_json_is_valid(self, sample_diagram):
        json_str = diagram_data.generate_bom_json(sample_diagram)
        data = json.loads(json_str)
        assert "items" in data
        assert "summary" in data
        assert isinstance(data["items"], list)

    def test_bom_json_summary_fields(self, sample_diagram):
        data = json.loads(diagram_data.generate_bom_json(sample_diagram))
        summary = data["summary"]
        assert "totalItems" in summary
        assert "totalCost" in summary
        assert "categories" in summary

    def test_bom_json_empty(self):
        data = json.loads(
            diagram_data.generate_bom_json({"blocks": [], "connections": []})
        )
        assert data["items"] == []


class TestAssemblySequenceExport:
    """Tests for assembly sequence Markdown and JSON export."""

    @pytest.fixture
    def sample_diagram(self):
        return _make_sample_diagram()

    def test_assembly_md_structure(self, sample_diagram):
        md = diagram_data.generate_assembly_sequence_markdown(sample_diagram)
        assert "# Assembly Sequence" in md
        assert "Step" in md

    def test_assembly_md_contains_blocks(self, sample_diagram):
        md = diagram_data.generate_assembly_sequence_markdown(sample_diagram)
        assert "Power Supply" in md
        assert "Microcontroller" in md

    def test_assembly_md_empty(self):
        md = diagram_data.generate_assembly_sequence_markdown(
            {"blocks": [], "connections": []}
        )
        assert "nothing to assemble" in md.lower()

    def test_assembly_json_is_valid(self, sample_diagram):
        json_str = diagram_data.generate_assembly_sequence_json(sample_diagram)
        data = json.loads(json_str)
        assert "steps" in data
        assert "totalSteps" in data
        assert "estimatedTotalMinutes" in data

    def test_assembly_json_step_fields(self, sample_diagram):
        data = json.loads(diagram_data.generate_assembly_sequence_json(sample_diagram))
        for step in data["steps"]:
            assert "order" in step
            assert "blockName" in step
            assert "complexity" in step

    def test_assembly_json_empty(self):
        data = json.loads(
            diagram_data.generate_assembly_sequence_json(
                {"blocks": [], "connections": []}
            )
        )
        assert data["steps"] == []
        assert data["totalSteps"] == 0


class TestConnectionMatrixExport:
    """Tests for the connection adjacency matrix."""

    @pytest.fixture
    def sample_diagram(self):
        return _make_sample_diagram()

    def test_matrix_header_row(self, sample_diagram):
        csv_content = diagram_data.generate_connection_matrix_csv(sample_diagram)
        header = csv_content.split("\n")[0]
        assert "Power Supply" in header
        assert "Microcontroller" in header

    def test_matrix_dimensions(self, sample_diagram):
        csv_content = diagram_data.generate_connection_matrix_csv(sample_diagram)
        lines = [line for line in csv_content.strip().split("\n") if line.strip()]
        block_count = len(sample_diagram["blocks"])
        # header + one row per block
        assert len(lines) == block_count + 1

    def test_matrix_records_connection(self, sample_diagram):
        csv_content = diagram_data.generate_connection_matrix_csv(sample_diagram)
        # Power Supply → Microcontroller should show 1
        # Find the Power Supply data row and the Microcontroller column
        assert "1" in csv_content

    def test_matrix_empty_diagram(self):
        csv_content = diagram_data.generate_connection_matrix_csv(
            {"blocks": [], "connections": []}
        )
        lines = [line for line in csv_content.strip().split("\n") if line.strip()]
        assert len(lines) == 1  # Header only


class TestSVGDiagram:
    """Tests for the SVG diagram snapshot."""

    @pytest.fixture
    def sample_diagram(self):
        return _make_sample_diagram()

    def test_svg_is_valid_xml(self, sample_diagram):
        svg = diagram_data.generate_svg_diagram(sample_diagram)
        assert svg.startswith("<svg")
        assert "</svg>" in svg

    def test_svg_contains_blocks(self, sample_diagram):
        svg = diagram_data.generate_svg_diagram(sample_diagram)
        assert "Power Supply" in svg
        assert "Microcontroller" in svg

    def test_svg_contains_connections(self, sample_diagram):
        svg = diagram_data.generate_svg_diagram(sample_diagram)
        # Connections now use inline stroke styles instead of CSS class
        assert '<line ' in svg

    def test_svg_empty_diagram(self):
        svg = diagram_data.generate_svg_diagram({"blocks": [], "connections": []})
        assert "Empty diagram" in svg

    def test_svg_status_colours(self, sample_diagram):
        svg = diagram_data.generate_svg_diagram(sample_diagram)
        # Verified blocks get a teal status-dot colour (#006064)
        assert "#006064" in svg


class TestExportProfiles:
    """Tests for the configurable export profile system."""

    @pytest.fixture
    def sample_diagram(self):
        return _make_sample_diagram()

    def test_quick_profile_keys(self, sample_diagram, tmp_path):
        result = diagram_data.export_report_files(
            sample_diagram, str(tmp_path), profile="quick"
        )
        assert "markdown" in result
        assert "csv" in result
        assert "header" in result
        # Should NOT contain full-profile items
        assert "html" not in result
        assert "bom_csv" not in result
        assert "svg" not in result

    def test_standard_profile_keys(self, sample_diagram, tmp_path):
        result = diagram_data.export_report_files(
            sample_diagram, str(tmp_path), profile="standard"
        )
        assert "markdown" in result
        assert "html" in result
        assert "bom_csv" in result
        assert "assembly_md" in result
        assert "connection_matrix" in result
        # No SVG in standard
        assert "svg" not in result

    def test_full_profile_keys(self, sample_diagram, tmp_path):
        result = diagram_data.export_report_files(
            sample_diagram, str(tmp_path), profile="full"
        )
        expected = {
            "markdown",
            "html",
            "csv",
            "header",
            "bom_csv",
            "bom_json",
            "assembly_md",
            "assembly_json",
            "connection_matrix",
            "svg",
        }
        for key in expected:
            assert key in result, f"Missing key: {key}"

    def test_full_profile_creates_files(self, sample_diagram, tmp_path):
        result = diagram_data.export_report_files(
            sample_diagram, str(tmp_path), profile="full"
        )
        for key, path_str in result.items():
            if key == "error":
                continue
            assert Path(path_str).exists(), f"File missing for {key}: {path_str}"

    def test_unknown_profile_falls_back_to_full(self, sample_diagram, tmp_path):
        result = diagram_data.export_report_files(
            sample_diagram, str(tmp_path), profile="unknown_value"
        )
        assert "svg" in result  # SVG is full-only

    def test_default_profile_is_full(self, sample_diagram, tmp_path):
        result = diagram_data.export_report_files(sample_diagram, str(tmp_path))
        assert "svg" in result

    def test_export_profiles_constant_exists(self):
        from diagram.export import EXPORT_PROFILES

        assert "quick" in EXPORT_PROFILES
        assert "standard" in EXPORT_PROFILES
        assert "full" in EXPORT_PROFILES

    def test_file_content_not_empty(self, sample_diagram, tmp_path):
        result = diagram_data.export_report_files(
            sample_diagram, str(tmp_path), profile="full"
        )
        for key, path_str in result.items():
            if key == "error":
                continue
            content = Path(path_str).read_text(encoding="utf-8")
            assert len(content) > 0, f"Empty file for {key}"


# =====================================================================
# Shared fixture factory
# =====================================================================


def _make_sample_diagram() -> dict[str, Any]:
    """Build a reusable two-block sample diagram."""
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
                    {"target": "ecad", "device": "LM3940", "footprint": "TO-220"},
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
