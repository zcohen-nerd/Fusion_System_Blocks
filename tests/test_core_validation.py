"""Tests for core graph validation functionality.

This module tests the validate_graph function with various scenarios
including valid graphs, missing ports, cycles, and duplicate block IDs.

Test coverage:
    - Valid graph case
    - Missing port case
    - Cycle detection case
    - Duplicate block ID case
    - Missing source/target block case
    - Self-connection case
    - Invalid port direction case
"""

from core.models import (
    Block,
    Connection,
    Graph,
    Port,
    PortDirection,
)
from core.validation import (
    ValidationError,
    ValidationErrorCode,
    validate_graph,
    filter_by_code,
    get_error_summary,
    has_errors,
)
from core.graph_builder import GraphBuilder


class TestValidateGraphValidCases:
    """Tests for valid graph scenarios."""

    def test_empty_graph_is_valid(self):
        """An empty graph with no blocks or connections should be valid."""
        graph = Graph(name="Empty Graph")

        errors = validate_graph(graph)

        assert len(errors) == 0

    def test_single_block_no_connections_is_valid(self):
        """A single block with no connections should be valid."""
        graph = Graph(name="Single Block")
        block = Block(name="MCU", block_type="Microcontroller")
        graph.add_block(block)

        errors = validate_graph(graph)

        assert len(errors) == 0

    def test_two_blocks_one_connection_is_valid(self):
        """Two blocks with a valid connection should be valid."""
        graph = (
            GraphBuilder("Valid Connection")
            .add_block("MCU", block_type="Microcontroller")
            .add_port("TX", direction=PortDirection.OUTPUT)
            .add_block("Sensor", block_type="ADC")
            .add_port("RX", direction=PortDirection.INPUT)
            .build()
        )

        # Add a valid connection
        mcu = graph.get_block_by_name("MCU")
        sensor = graph.get_block_by_name("Sensor")
        mcu_port = mcu.get_port_by_name("TX")
        sensor_port = sensor.get_port_by_name("RX")

        connection = Connection(
            from_block_id=mcu.id,
            from_port_id=mcu_port.id,
            to_block_id=sensor.id,
            to_port_id=sensor_port.id,
            kind="UART",
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        assert len(errors) == 0

    def test_multiple_blocks_chain_is_valid(self):
        """A chain of blocks A -> B -> C should be valid."""
        graph = (
            GraphBuilder("Chain")
            .add_block("A")
            .add_block("B")
            .add_block("C")
            .connect("A", "B")
            .connect("B", "C")
            .build()
        )

        errors = validate_graph(graph)

        assert len(errors) == 0

    def test_bidirectional_ports_are_valid(self):
        """Bidirectional ports should work as both source and target."""
        graph = Graph(name="Bidirectional Test")

        block_a = Block(name="A")
        port_a = Port(name="BiDi", direction=PortDirection.BIDIRECTIONAL)
        block_a.add_port(port_a)
        graph.add_block(block_a)

        block_b = Block(name="B")
        port_b = Port(name="BiDi", direction=PortDirection.BIDIRECTIONAL)
        block_b.add_port(port_b)
        graph.add_block(block_b)

        connection = Connection(
            from_block_id=block_a.id,
            from_port_id=port_a.id,
            to_block_id=block_b.id,
            to_port_id=port_b.id,
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        assert len(errors) == 0


class TestValidateGraphMissingPort:
    """Tests for missing port scenarios."""

    def test_missing_source_port(self):
        """Connection referencing non-existent source port should fail."""
        graph = Graph(name="Missing Source Port")

        block_a = Block(name="A")
        port_a = Port(name="OUT", direction=PortDirection.OUTPUT)
        block_a.add_port(port_a)
        graph.add_block(block_a)

        block_b = Block(name="B")
        port_b = Port(name="IN", direction=PortDirection.INPUT)
        block_b.add_port(port_b)
        graph.add_block(block_b)

        # Create connection with non-existent source port ID
        connection = Connection(
            from_block_id=block_a.id,
            from_port_id="non-existent-port-id",  # Invalid!
            to_block_id=block_b.id,
            to_port_id=port_b.id,
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        assert has_errors(errors)
        port_errors = filter_by_code(errors, ValidationErrorCode.MISSING_SOURCE_PORT)
        assert len(port_errors) == 1
        assert "non-existent-port-id" in port_errors[0].message

    def test_missing_target_port(self):
        """Connection referencing non-existent target port should fail."""
        graph = Graph(name="Missing Target Port")

        block_a = Block(name="A")
        port_a = Port(name="OUT", direction=PortDirection.OUTPUT)
        block_a.add_port(port_a)
        graph.add_block(block_a)

        block_b = Block(name="B")
        port_b = Port(name="IN", direction=PortDirection.INPUT)
        block_b.add_port(port_b)
        graph.add_block(block_b)

        # Create connection with non-existent target port ID
        connection = Connection(
            from_block_id=block_a.id,
            from_port_id=port_a.id,
            to_block_id=block_b.id,
            to_port_id="non-existent-target-port",  # Invalid!
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        assert has_errors(errors)
        port_errors = filter_by_code(errors, ValidationErrorCode.MISSING_TARGET_PORT)
        assert len(port_errors) == 1

    def test_both_ports_missing(self):
        """Connection with both ports missing should report both errors."""
        graph = Graph(name="Both Ports Missing")

        block_a = Block(name="A")
        graph.add_block(block_a)

        block_b = Block(name="B")
        graph.add_block(block_b)

        # Create connection with non-existent ports
        connection = Connection(
            from_block_id=block_a.id,
            from_port_id="missing-from",
            to_block_id=block_b.id,
            to_port_id="missing-to",
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        assert has_errors(errors)
        source_errors = filter_by_code(errors, ValidationErrorCode.MISSING_SOURCE_PORT)
        target_errors = filter_by_code(errors, ValidationErrorCode.MISSING_TARGET_PORT)
        assert len(source_errors) == 1
        assert len(target_errors) == 1


class TestValidateGraphCycleDetection:
    """Tests for cycle detection in graphs."""

    def test_simple_cycle_detected(self):
        """A simple A -> B -> A cycle should be detected."""
        graph = (
            GraphBuilder("Simple Cycle")
            .add_block("A")
            .add_block("B")
            .connect("A", "B")
            .connect("B", "A")
            .build()
        )

        errors = validate_graph(graph)

        cycle_errors = filter_by_code(errors, ValidationErrorCode.CYCLE_DETECTED)
        assert len(cycle_errors) >= 1

    def test_three_node_cycle_detected(self):
        """A -> B -> C -> A cycle should be detected."""
        graph = (
            GraphBuilder("Three Node Cycle")
            .add_block("A")
            .add_block("B")
            .add_block("C")
            .connect("A", "B")
            .connect("B", "C")
            .connect("C", "A")
            .build()
        )

        errors = validate_graph(graph)

        cycle_errors = filter_by_code(errors, ValidationErrorCode.CYCLE_DETECTED)
        assert len(cycle_errors) >= 1
        assert "A" in cycle_errors[0].message or "B" in cycle_errors[0].message

    def test_dag_no_cycle(self):
        """A directed acyclic graph should not report cycles."""
        graph = (
            GraphBuilder("DAG")
            .add_block("A")
            .add_block("B")
            .add_block("C")
            .add_block("D")
            .connect("A", "B")
            .connect("A", "C")
            .connect("B", "D")
            .connect("C", "D")
            .build()
        )

        errors = validate_graph(graph)

        cycle_errors = filter_by_code(errors, ValidationErrorCode.CYCLE_DETECTED)
        assert len(cycle_errors) == 0


class TestValidateGraphDuplicateBlockId:
    """Tests for duplicate block ID detection."""

    def test_duplicate_block_id_detected(self):
        """Two blocks with the same ID should be detected."""
        graph = Graph(name="Duplicate IDs")

        block_a = Block(id="same-id", name="First Block")
        block_b = Block(id="same-id", name="Second Block")  # Duplicate!

        graph.add_block(block_a)
        graph.add_block(block_b)

        errors = validate_graph(graph)

        assert has_errors(errors)
        dup_errors = filter_by_code(errors, ValidationErrorCode.DUPLICATE_BLOCK_ID)
        assert len(dup_errors) == 1
        assert "same-id" in dup_errors[0].message
        assert "First Block" in dup_errors[0].message
        assert "Second Block" in dup_errors[0].message

    def test_unique_block_ids_valid(self):
        """Blocks with unique IDs should be valid."""
        graph = Graph(name="Unique IDs")

        block_a = Block(id="id-1", name="First")
        block_b = Block(id="id-2", name="Second")
        block_c = Block(id="id-3", name="Third")

        graph.add_block(block_a)
        graph.add_block(block_b)
        graph.add_block(block_c)

        errors = validate_graph(graph)

        dup_errors = filter_by_code(errors, ValidationErrorCode.DUPLICATE_BLOCK_ID)
        assert len(dup_errors) == 0


class TestValidateGraphMissingBlock:
    """Tests for missing block reference detection."""

    def test_missing_source_block(self):
        """Connection referencing non-existent source block should fail."""
        graph = Graph(name="Missing Source Block")

        block_b = Block(name="B")
        graph.add_block(block_b)

        connection = Connection(
            from_block_id="non-existent-block",  # Invalid!
            to_block_id=block_b.id,
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        block_errors = filter_by_code(errors, ValidationErrorCode.MISSING_SOURCE_BLOCK)
        assert len(block_errors) == 1

    def test_missing_target_block(self):
        """Connection referencing non-existent target block should fail."""
        graph = Graph(name="Missing Target Block")

        block_a = Block(name="A")
        graph.add_block(block_a)

        connection = Connection(
            from_block_id=block_a.id,
            to_block_id="non-existent-target",  # Invalid!
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        block_errors = filter_by_code(errors, ValidationErrorCode.MISSING_TARGET_BLOCK)
        assert len(block_errors) == 1


class TestValidateGraphSelfConnection:
    """Tests for self-connection detection."""

    def test_self_connection_detected(self):
        """A block connected to itself should be detected."""
        graph = Graph(name="Self Connection")

        block = Block(name="SelfLoop")
        graph.add_block(block)

        connection = Connection(
            from_block_id=block.id,
            to_block_id=block.id,  # Same block!
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        self_errors = filter_by_code(errors, ValidationErrorCode.SELF_CONNECTION)
        assert len(self_errors) == 1


class TestValidateGraphPortDirection:
    """Tests for port direction compatibility."""

    def test_input_port_as_source_invalid(self):
        """An INPUT port should not be valid as a connection source."""
        graph = Graph(name="Invalid Source Direction")

        block_a = Block(name="A")
        port_a = Port(name="IN", direction=PortDirection.INPUT)  # Can't be source!
        block_a.add_port(port_a)
        graph.add_block(block_a)

        block_b = Block(name="B")
        port_b = Port(name="IN", direction=PortDirection.INPUT)
        block_b.add_port(port_b)
        graph.add_block(block_b)

        connection = Connection(
            from_block_id=block_a.id,
            from_port_id=port_a.id,
            to_block_id=block_b.id,
            to_port_id=port_b.id,
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        dir_errors = filter_by_code(
            errors, ValidationErrorCode.INVALID_CONNECTION_DIRECTION
        )
        assert len(dir_errors) >= 1

    def test_output_port_as_target_invalid(self):
        """An OUTPUT port should not be valid as a connection target."""
        graph = Graph(name="Invalid Target Direction")

        block_a = Block(name="A")
        port_a = Port(name="OUT", direction=PortDirection.OUTPUT)
        block_a.add_port(port_a)
        graph.add_block(block_a)

        block_b = Block(name="B")
        port_b = Port(name="OUT", direction=PortDirection.OUTPUT)  # Can't be target!
        block_b.add_port(port_b)
        graph.add_block(block_b)

        connection = Connection(
            from_block_id=block_a.id,
            from_port_id=port_a.id,
            to_block_id=block_b.id,
            to_port_id=port_b.id,
        )
        graph.add_connection(connection)

        errors = validate_graph(graph)

        dir_errors = filter_by_code(
            errors, ValidationErrorCode.INVALID_CONNECTION_DIRECTION
        )
        assert len(dir_errors) >= 1


class TestValidationUtilities:
    """Tests for validation utility functions."""

    def test_has_errors_with_errors(self):
        """has_errors should return True when there are errors."""
        errors = [
            ValidationError(
                code=ValidationErrorCode.DUPLICATE_BLOCK_ID,
                message="Test error",
            )
        ]
        assert has_errors(errors) is True

    def test_has_errors_no_errors(self):
        """has_errors should return False with empty list."""
        assert has_errors([]) is False

    def test_filter_by_code(self):
        """filter_by_code should filter correctly."""
        errors = [
            ValidationError(
                code=ValidationErrorCode.DUPLICATE_BLOCK_ID,
                message="Dup 1",
            ),
            ValidationError(
                code=ValidationErrorCode.MISSING_PORT,
                message="Missing",
            ),
            ValidationError(
                code=ValidationErrorCode.DUPLICATE_BLOCK_ID,
                message="Dup 2",
            ),
        ]

        filtered = filter_by_code(errors, ValidationErrorCode.DUPLICATE_BLOCK_ID)

        assert len(filtered) == 2
        assert all(e.code == ValidationErrorCode.DUPLICATE_BLOCK_ID for e in filtered)

    def test_get_error_summary_no_errors(self):
        """get_error_summary should handle empty list."""
        summary = get_error_summary([])
        assert "No validation errors" in summary

    def test_get_error_summary_with_errors(self):
        """get_error_summary should include all error messages."""
        errors = [
            ValidationError(
                code=ValidationErrorCode.DUPLICATE_BLOCK_ID,
                message="Duplicate block found",
            ),
            ValidationError(
                code=ValidationErrorCode.CYCLE_DETECTED,
                message="Cycle in graph",
            ),
        ]

        summary = get_error_summary(errors)

        assert "2 validation error" in summary
        assert "Duplicate block found" in summary
        assert "Cycle in graph" in summary

    def test_error_to_dict(self):
        """ValidationError.to_dict should produce proper dictionary."""
        error = ValidationError(
            code=ValidationErrorCode.MISSING_PORT,
            message="Port not found",
            block_id="block-123",
            port_id="port-456",
            details={"expected": "OUT", "got": "IN"},
        )

        result = error.to_dict()

        assert result["code"] == "MISSING_PORT"
        assert result["message"] == "Port not found"
        assert result["block_id"] == "block-123"
        assert result["port_id"] == "port-456"
        assert result["details"]["expected"] == "OUT"
