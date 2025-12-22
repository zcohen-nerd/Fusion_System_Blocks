"""Test import functionality for Fusion System Blocks."""

import sys
import pathlib

# Add src to path
src_path = pathlib.Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

import diagram_data  # noqa: E402


class TestImportFunctions:
    """Test import functionality from various sources."""

    def test_parse_mermaid_basic(self):
        """Test basic Mermaid flowchart parsing."""
        mermaid_text = """
        flowchart TD
            A --> B
            B --> C
        """

        diagram = diagram_data.parse_mermaid_flowchart(mermaid_text)

        # Should have 3 blocks
        assert len(diagram["blocks"]) == 3

        # Should have 2 connections
        assert len(diagram["connections"]) == 2

        # Check block IDs
        block_ids = {block["id"] for block in diagram["blocks"]}
        assert "A" in block_ids
        assert "B" in block_ids
        assert "C" in block_ids

    def test_parse_mermaid_with_labels(self):
        """Test Mermaid parsing with connection labels."""
        mermaid_text = """
        flowchart TD
            A -->|power| B
            B -->|data| C[Controller]
        """

        diagram = diagram_data.parse_mermaid_flowchart(mermaid_text)

        # Check connections have attributes
        connections = diagram["connections"]
        assert len(connections) == 2

        # Find power connection
        power_conn = next(
            c for c in connections if c["attributes"].get("protocol") == "power")
        assert power_conn is not None

        # Find data connection
        data_conn = next(
            c for c in connections if c["attributes"].get("protocol") == "data")
        assert data_conn is not None

    def test_parse_mermaid_with_node_shapes(self):
        """Test Mermaid parsing with different node shapes."""
        mermaid_text = """
        flowchart TD
            A[Process Block]
            B{Decision Block}
            C(Round Block)
            A --> B
            B --> C
        """

        diagram = diagram_data.parse_mermaid_flowchart(mermaid_text)

        # Check block types are assigned based on shape
        blocks = {block["id"]: block for block in diagram["blocks"]}

        assert blocks["A"]["type"] == "Generic"
        assert blocks["B"]["type"] == "Decision"
        assert blocks["C"]["type"] == "Process"

        # Check display names
        assert blocks["A"]["name"] == "Process Block"
        assert blocks["B"]["name"] == "Decision Block"
        assert blocks["C"]["name"] == "Round Block"

    def test_parse_mermaid_positioning(self):
        """Test that Mermaid parser creates reasonable positions."""
        mermaid_text = """
        flowchart TD
            A --> B
            B --> C
            B --> D
            C --> E
            D --> E
        """

        diagram = diagram_data.parse_mermaid_flowchart(mermaid_text)

        # Check all blocks have valid positions
        for block in diagram["blocks"]:
            assert "x" in block
            assert "y" in block
            assert block["x"] >= 0
            assert block["y"] >= 0

    def test_import_from_csv_blocks_only(self):
        """Test CSV import with just blocks."""
        csv_blocks = """name,type,x,y,status
Power Supply,PowerSupply,100,100,Verified
Microcontroller,Microcontroller,300,100,Planned
Sensor,Sensor,500,100,Placeholder"""

        diagram = diagram_data.import_from_csv(csv_blocks)

        # Should have 3 blocks
        assert len(diagram["blocks"]) == 3

        # Check block details
        blocks = {block["name"]: block for block in diagram["blocks"]}

        psu = blocks["Power Supply"]
        assert psu["type"] == "PowerSupply"
        assert psu["x"] == 100
        assert psu["y"] == 100
        assert psu["status"] == "Verified"

        mcu = blocks["Microcontroller"]
        assert mcu["type"] == "Microcontroller"
        assert mcu["status"] == "Planned"

    def test_import_from_csv_with_connections(self):
        """Test CSV import with blocks and connections."""
        csv_blocks = """name,type,x,y,status
Power Supply,PowerSupply,100,100,Verified
Microcontroller,Microcontroller,300,100,Planned"""

        csv_connections = """from,to,kind,protocol
Power Supply,Microcontroller,electrical,3.3V"""

        diagram = diagram_data.import_from_csv(csv_blocks, csv_connections)

        # Should have 2 blocks and 1 connection
        assert len(diagram["blocks"]) == 2
        assert len(diagram["connections"]) == 1

        # Check connection
        conn = diagram["connections"][0]
        assert conn["kind"] == "electrical"
        assert conn["attributes"]["protocol"] == "3.3V"

    def test_import_from_csv_with_attributes(self):
        """Test CSV import with additional attributes."""
        csv_blocks = """name,type,x,y,status,voltage,current,notes
Power Supply,PowerSupply,100,100,Verified,3.3V,1000mA,Main power
Microcontroller,Microcontroller,300,100,Planned,3.3V,200mA,ARM Cortex-M4"""

        diagram = diagram_data.import_from_csv(csv_blocks)

        # Check attributes are preserved
        blocks = {block["name"]: block for block in diagram["blocks"]}

        psu = blocks["Power Supply"]
        assert psu["attributes"]["voltage"] == "3.3V"
        assert psu["attributes"]["current"] == "1000mA"
        assert psu["attributes"]["notes"] == "Main power"

    def test_validate_imported_diagram_success(self):
        """Test validation of a good imported diagram."""
        # Create a valid diagram
        diagram = diagram_data.create_empty_diagram()

        block = diagram_data.create_block(
            "Test Block", 100, 100, "Generic", "Placeholder")
        interface = diagram_data.create_interface(
            "Test Interface", "data", "bidirectional", "right", 0
        )
        block["interfaces"].append(interface)
        diagram_data.add_block_to_diagram(diagram, block)

        is_valid, message = diagram_data.validate_imported_diagram(diagram)
        assert is_valid
        assert "successful" in message.lower()

    def test_validate_imported_diagram_empty(self):
        """Test validation fails for empty diagram."""
        diagram = diagram_data.create_empty_diagram()

        is_valid, message = diagram_data.validate_imported_diagram(diagram)
        assert not is_valid
        assert "at least one block" in message

    def test_validate_imported_diagram_duplicate_names(self):
        """Test validation fails for duplicate block names."""
        diagram = diagram_data.create_empty_diagram()

        # Add two blocks with same name
        block1 = diagram_data.create_block(
            "Duplicate", 100, 100, "Generic", "Placeholder")
        block2 = diagram_data.create_block(
            "Duplicate", 200, 100, "Generic", "Placeholder")

        diagram_data.add_block_to_diagram(diagram, block1)
        diagram_data.add_block_to_diagram(diagram, block2)

        is_valid, message = diagram_data.validate_imported_diagram(diagram)
        assert not is_valid
        assert "unique" in message.lower()

    def test_validate_imported_diagram_invalid_connections(self):
        """Test validation fails for connections to non-existent blocks."""
        diagram = diagram_data.create_empty_diagram()

        # Add a block
        block = diagram_data.create_block(
            "Test Block", 100, 100, "Generic", "Placeholder")
        interface = diagram_data.create_interface(
            "Test Interface", "data", "bidirectional", "right", 0
        )
        block["interfaces"].append(interface)
        diagram_data.add_block_to_diagram(diagram, block)

        # Add connection to non-existent block
        bad_connection = {
            "id": "bad_conn",
            "from": {"blockId": block["id"], "interfaceId": interface["id"]},
            "to": {"blockId": "nonexistent", "interfaceId": "fake"},
            "kind": "data",
            "attributes": {},
        }
        diagram["connections"].append(bad_connection)

        is_valid, message = diagram_data.validate_imported_diagram(diagram)
        assert not is_valid
        assert "unknown block" in message.lower()

    def test_parse_mermaid_empty_input(self):
        """Test Mermaid parser with empty input."""
        diagram = diagram_data.parse_mermaid_flowchart("")

        # Should return empty but valid diagram
        assert len(diagram["blocks"]) == 0
        assert len(diagram["connections"]) == 0

    def test_import_from_csv_empty_input(self):
        """Test CSV import with empty input."""
        diagram = diagram_data.import_from_csv("")

        # Should return empty but valid diagram
        assert len(diagram["blocks"]) == 0
        assert len(diagram["connections"]) == 0

    def test_mermaid_complex_diagram(self):
        """Test parsing a more complex Mermaid diagram."""
        mermaid_text = """
        flowchart TD
            START[System Start] --> INIT{Initialize?}
            INIT -->|Yes| POWER[Power On]
            INIT -->|No| ERROR[Error State]
            POWER --> SENSOR[Read Sensors]
            SENSOR --> PROCESS{Process Data}
            PROCESS -->|Valid| ACTUATE[Actuate Motors]
            PROCESS -->|Invalid| ERROR
            ACTUATE --> SENSOR
            ERROR --> INIT
        """

        diagram = diagram_data.parse_mermaid_flowchart(mermaid_text)

        # Check we got all the nodes
        expected_nodes = {"START", "INIT", "POWER",
                          "ERROR", "SENSOR", "PROCESS", "ACTUATE"}
        actual_nodes = {block["id"] for block in diagram["blocks"]}
        assert expected_nodes.issubset(actual_nodes)

        # Check we have the right number of connections
        # Should have multiple connections
        assert len(diagram["connections"]) >= 8

        # Check some specific node types
        blocks = {block["id"]: block for block in diagram["blocks"]}
        assert blocks["INIT"]["type"] == "Decision"  # {Initialize?}
        assert blocks["PROCESS"]["type"] == "Decision"  # {Process Data}
        assert blocks["START"]["type"] == "Generic"  # [System Start]

    def test_csv_import_error_handling(self):
        """Test CSV import handles malformed data gracefully."""
        # Malformed CSV (missing columns)
        csv_blocks = """name,type
Power Supply,PowerSupply
Incomplete Block"""

        # Should not crash, should use defaults
        diagram = diagram_data.import_from_csv(csv_blocks)
        assert len(diagram["blocks"]) == 2

        # Blocks should have default positions
        for block in diagram["blocks"]:
            assert "x" in block
            assert "y" in block
