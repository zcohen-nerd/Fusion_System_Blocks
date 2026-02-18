"""Tests for Group model, serialization, validation, and builder.

Covers the Group dataclass, Graph group management methods,
serialization round-trips, validation error detection, and
GraphBuilder group support.
"""

import pytest

from fsb_core.graph_builder import GraphBuilder
from fsb_core.models import (
    Block,
    Connection,
    Graph,
    Group,
    PortDirection,
)
from fsb_core.serialization import (
    deserialize_graph,
    dict_to_graph,
    graph_to_dict,
    serialize_graph,
)
from fsb_core.validation import (
    ValidationErrorCode,
    filter_by_code,
    validate_graph,
)


# =========================================================================
# Group dataclass basics
# =========================================================================
class TestGroupDataclass:
    """Test Group dataclass construction and defaults."""

    def test_default_fields(self):
        """Group with no arguments has sensible defaults."""
        group = Group()
        assert group.id  # auto-generated UUID
        assert group.name == ""
        assert group.description == ""
        assert group.block_ids == []
        assert group.metadata == {}
        assert group.parent_group_id is None

    def test_custom_fields(self):
        """Group accepts all fields at construction."""
        group = Group(
            id="g1",
            name="Power Subsystem",
            description="All power-related blocks",
            block_ids=["b1", "b2"],
            metadata={"owner": "alice", "status": "active"},
            parent_group_id="g0",
        )
        assert group.id == "g1"
        assert group.name == "Power Subsystem"
        assert group.description == "All power-related blocks"
        assert group.block_ids == ["b1", "b2"]
        assert group.metadata["owner"] == "alice"
        assert group.parent_group_id == "g0"

    def test_unique_ids(self):
        """Two default groups get different IDs."""
        g1 = Group()
        g2 = Group()
        assert g1.id != g2.id


# =========================================================================
# Graph group management methods
# =========================================================================
class TestGraphGroupMethods:
    """Test Graph add/get/remove group methods."""

    def _make_graph_with_groups(self):
        """Create a graph with blocks and groups."""
        b1 = Block(id="b1", name="Sensor")
        b2 = Block(id="b2", name="MCU")
        g1 = Group(id="g1", name="Sensing", block_ids=["b1"])
        g2 = Group(id="g2", name="Control", block_ids=["b2"])
        return Graph(
            id="graph1",
            blocks=[b1, b2],
            groups=[g1, g2],
        )

    def test_add_group(self):
        """add_group appends a group to the graph."""
        graph = Graph(id="g")
        group = Group(id="g1", name="Test")
        graph.add_group(group)
        assert len(graph.groups) == 1
        assert graph.groups[0].name == "Test"

    def test_get_group_by_id(self):
        """get_group_by_id returns the matching group."""
        graph = self._make_graph_with_groups()
        assert graph.get_group_by_id("g1").name == "Sensing"

    def test_get_group_by_id_not_found(self):
        """get_group_by_id returns None for missing ID."""
        graph = self._make_graph_with_groups()
        assert graph.get_group_by_id("missing") is None

    def test_get_group_by_name(self):
        """get_group_by_name returns the matching group."""
        graph = self._make_graph_with_groups()
        assert graph.get_group_by_name("Control").id == "g2"

    def test_get_group_by_name_not_found(self):
        """get_group_by_name returns None for missing name."""
        graph = self._make_graph_with_groups()
        assert graph.get_group_by_name("missing") is None

    def test_remove_group(self):
        """remove_group removes the group and returns True."""
        graph = self._make_graph_with_groups()
        removed = graph.remove_group("g1")
        assert removed is True
        assert len(graph.groups) == 1
        assert graph.groups[0].id == "g2"

    def test_remove_group_not_found(self):
        """remove_group returns False for missing ID."""
        graph = self._make_graph_with_groups()
        assert graph.remove_group("missing") is False
        assert len(graph.groups) == 2

    def test_remove_group_clears_child_parent_ref(self):
        """Removing a parent group clears child parent_group_id."""
        parent = Group(id="gp", name="Parent")
        child = Group(id="gc", name="Child", parent_group_id="gp")
        graph = Graph(id="g", groups=[parent, child])
        graph.remove_group("gp")
        assert child.parent_group_id is None

    def test_get_child_groups(self):
        """get_child_groups returns direct children."""
        parent = Group(id="gp", name="Parent")
        child1 = Group(id="gc1", name="C1", parent_group_id="gp")
        child2 = Group(id="gc2", name="C2", parent_group_id="gp")
        other = Group(id="go", name="Other")
        graph = Graph(
            id="g",
            groups=[parent, child1, child2, other],
        )
        children = graph.get_child_groups("gp")
        assert len(children) == 2
        names = {c.name for c in children}
        assert names == {"C1", "C2"}

    def test_get_child_groups_empty(self):
        """get_child_groups returns empty list when none exist."""
        graph = Graph(
            id="g",
            groups=[Group(id="gp", name="Leaf")],
        )
        assert graph.get_child_groups("gp") == []


# =========================================================================
# Nested groups (hierarchical)
# =========================================================================
class TestNestedGroups:
    """Test nested group support."""

    def test_nested_group_creation(self):
        """Groups can reference a parent group for nesting."""
        Group(id="gp", name="System")
        child = Group(
            id="gc",
            name="Subsystem",
            parent_group_id="gp",
        )
        assert child.parent_group_id == "gp"

    def test_multi_level_nesting(self):
        """Groups can nest multiple levels deep."""
        level0 = Group(id="g0", name="Top")
        level1 = Group(id="g1", name="Mid", parent_group_id="g0")
        level2 = Group(id="g2", name="Low", parent_group_id="g1")
        graph = Graph(id="g", groups=[level0, level1, level2])
        assert graph.get_child_groups("g0") == [level1]
        assert graph.get_child_groups("g1") == [level2]
        assert graph.get_child_groups("g2") == []


# =========================================================================
# Group-level connections
# =========================================================================
class TestGroupConnections:
    """Test that connections can reference group IDs.

    Group-level connections represent high-level interfaces
    between subsystems. They use the existing Connection model
    with group IDs in place of block IDs.
    """

    def test_connection_between_groups(self):
        """A Connection can link two group IDs."""
        g1 = Group(id="g1", name="Sensors", block_ids=["b1"])
        g2 = Group(id="g2", name="Control", block_ids=["b2"])
        conn = Connection(
            id="c1",
            from_block_id="g1",
            to_block_id="g2",
            kind="data",
        )
        b1 = Block(id="b1", name="Sensor")
        b2 = Block(id="b2", name="MCU")
        graph = Graph(
            id="g",
            blocks=[b1, b2],
            connections=[conn],
            groups=[g1, g2],
        )
        # Connection exists and references group IDs
        assert len(graph.connections) == 1
        assert graph.connections[0].from_block_id == "g1"
        assert graph.connections[0].to_block_id == "g2"

    def test_connection_group_to_block(self):
        """A Connection can link a group to a block."""
        g1 = Group(id="g1", name="Sensors")
        b1 = Block(id="b1", name="MCU")
        conn = Connection(
            id="c1",
            from_block_id="g1",
            to_block_id="b1",
            kind="interface",
        )
        graph = Graph(
            id="g",
            blocks=[b1],
            connections=[conn],
            groups=[g1],
        )
        assert graph.connections[0].from_block_id == "g1"
        assert graph.connections[0].to_block_id == "b1"


# =========================================================================
# Group metadata
# =========================================================================
class TestGroupMetadata:
    """Test group custom metadata properties."""

    def test_metadata_properties(self):
        """Group metadata supports arbitrary key-value pairs."""
        group = Group(
            id="g1",
            name="Power",
            metadata={
                "owner": "bob",
                "status": "in-review",
                "subsystem_category": "electrical",
                "priority": 1,
            },
        )
        assert group.metadata["owner"] == "bob"
        assert group.metadata["status"] == "in-review"
        assert group.metadata["priority"] == 1

    def test_metadata_empty_by_default(self):
        """Group metadata defaults to empty dict."""
        group = Group()
        assert group.metadata == {}


# =========================================================================
# Serialization round-trip
# =========================================================================
class TestGroupSerialization:
    """Test Group serialization and deserialization."""

    def _make_graph_with_groups(self):
        """Build a graph with groups for testing."""
        b1 = Block(id="b1", name="Sensor")
        b2 = Block(id="b2", name="MCU")
        g1 = Group(
            id="g1",
            name="Sensing Subsystem",
            description="Temperature and pressure sensors",
            block_ids=["b1"],
            metadata={"owner": "alice"},
        )
        g2 = Group(
            id="g2",
            name="Control Subsystem",
            description="Main control loop",
            block_ids=["b2"],
            metadata={"status": "active"},
            parent_group_id="g1",
        )
        return Graph(
            id="test_g",
            blocks=[b1, b2],
            groups=[g1, g2],
        )

    def test_round_trip(self):
        """Groups survive Graph → JSON → Graph round-trip."""
        graph = self._make_graph_with_groups()
        json_str = serialize_graph(graph)
        restored = deserialize_graph(json_str)

        assert len(restored.groups) == 2

        rg1 = restored.get_group_by_id("g1")
        assert rg1.name == "Sensing Subsystem"
        assert rg1.description == ("Temperature and pressure sensors")
        assert rg1.block_ids == ["b1"]
        assert rg1.metadata == {"owner": "alice"}
        assert rg1.parent_group_id is None

        rg2 = restored.get_group_by_id("g2")
        assert rg2.name == "Control Subsystem"
        assert rg2.parent_group_id == "g1"

    def test_graph_to_dict_includes_groups(self):
        """graph_to_dict includes 'groups' key."""
        graph = self._make_graph_with_groups()
        d = graph_to_dict(graph)
        assert "groups" in d
        assert len(d["groups"]) == 2
        assert d["groups"][0]["name"] == "Sensing Subsystem"
        assert d["groups"][0]["blockIds"] == ["b1"]
        assert d["groups"][0]["description"] == ("Temperature and pressure sensors")

    def test_dict_to_graph_parses_groups(self):
        """dict_to_graph parses groups from dict."""
        data = {
            "id": "g1",
            "blocks": [
                {"id": "b1", "name": "A"},
            ],
            "connections": [],
            "groups": [
                {
                    "id": "grp1",
                    "name": "My Group",
                    "description": "A test group",
                    "blockIds": ["b1"],
                    "metadata": {"tag": "v1"},
                }
            ],
        }
        graph = dict_to_graph(data)
        assert len(graph.groups) == 1
        grp = graph.groups[0]
        assert grp.id == "grp1"
        assert grp.name == "My Group"
        assert grp.description == "A test group"
        assert grp.block_ids == ["b1"]
        assert grp.metadata == {"tag": "v1"}
        assert grp.parent_group_id is None

    def test_dict_to_graph_parses_parent_group(self):
        """dict_to_graph correctly parses parentGroupId."""
        data = {
            "id": "g1",
            "blocks": [],
            "connections": [],
            "groups": [
                {"id": "gp", "name": "Parent"},
                {
                    "id": "gc",
                    "name": "Child",
                    "parentGroupId": "gp",
                },
            ],
        }
        graph = dict_to_graph(data)
        child = graph.get_group_by_id("gc")
        assert child.parent_group_id == "gp"

    def test_no_groups_key_defaults_to_empty(self):
        """Missing 'groups' key defaults to empty list."""
        data = {
            "id": "g1",
            "blocks": [],
            "connections": [],
        }
        graph = dict_to_graph(data)
        assert graph.groups == []

    def test_empty_graph_groups_round_trip(self):
        """Graph with no groups round-trips cleanly."""
        graph = Graph(id="g1", name="Empty Groups")
        restored = deserialize_graph(serialize_graph(graph))
        assert restored.groups == []

    def test_parent_group_id_none_not_serialized(self):
        """parentGroupId is omitted when None."""
        group = Group(id="g1", name="Top")
        graph = Graph(id="g", groups=[group])
        d = graph_to_dict(graph)
        assert "parentGroupId" not in d["groups"][0]

    def test_parent_group_id_serialized_when_set(self):
        """parentGroupId is included when set."""
        group = Group(id="gc", name="Child", parent_group_id="gp")
        graph = Graph(id="g", groups=[group])
        d = graph_to_dict(graph)
        assert d["groups"][0]["parentGroupId"] == "gp"

    def test_snake_case_fallback(self):
        """dict_to_graph handles snake_case keys as fallback."""
        data = {
            "id": "g1",
            "blocks": [],
            "connections": [],
            "groups": [
                {
                    "id": "grp1",
                    "name": "G",
                    "block_ids": ["b1"],
                    "parent_group_id": "gp",
                }
            ],
        }
        graph = dict_to_graph(data)
        grp = graph.groups[0]
        assert grp.block_ids == ["b1"]
        assert grp.parent_group_id == "gp"


# =========================================================================
# Validation
# =========================================================================
class TestGroupValidation:
    """Test group-related validation error detection."""

    def test_valid_graph_with_groups(self):
        """Graph with properly referenced groups passes validation."""
        b1 = Block(id="b1", name="Sensor")
        g1 = Group(id="g1", name="Sensors", block_ids=["b1"])
        graph = Graph(id="g", blocks=[b1], groups=[g1])
        errors = validate_graph(graph)
        assert len(errors) == 0

    def test_duplicate_group_id(self):
        """Duplicate group IDs produce a validation error."""
        g1 = Group(id="g1", name="A")
        g2 = Group(id="g1", name="B")
        graph = Graph(id="g", groups=[g1, g2])
        errors = validate_graph(graph)
        dup_errors = filter_by_code(errors, ValidationErrorCode.DUPLICATE_GROUP_ID)
        assert len(dup_errors) == 1
        assert "g1" in dup_errors[0].message

    def test_invalid_block_reference_in_group(self):
        """Group referencing non-existent block produces error."""
        g1 = Group(
            id="g1",
            name="Bad Refs",
            block_ids=["no_such_block"],
        )
        graph = Graph(id="g", groups=[g1])
        errors = validate_graph(graph)
        ref_errors = filter_by_code(
            errors,
            ValidationErrorCode.INVALID_GROUP_BLOCK_REFERENCE,
        )
        assert len(ref_errors) == 1
        assert "no_such_block" in ref_errors[0].message

    def test_invalid_parent_group_reference(self):
        """Group referencing non-existent parent produces error."""
        g1 = Group(
            id="g1",
            name="Orphan",
            parent_group_id="no_such_group",
        )
        graph = Graph(id="g", groups=[g1])
        errors = validate_graph(graph)
        parent_errors = filter_by_code(
            errors,
            ValidationErrorCode.INVALID_GROUP_PARENT_REFERENCE,
        )
        assert len(parent_errors) == 1
        assert "no_such_group" in parent_errors[0].message

    def test_valid_nested_groups(self):
        """Properly nested groups pass validation."""
        parent = Group(id="gp", name="Parent")
        child = Group(
            id="gc",
            name="Child",
            parent_group_id="gp",
        )
        graph = Graph(id="g", groups=[parent, child])
        errors = validate_graph(graph)
        assert len(errors) == 0

    def test_empty_groups_valid(self):
        """Graph with no groups passes validation."""
        graph = Graph(id="g")
        errors = validate_graph(graph)
        assert len(errors) == 0


# =========================================================================
# GraphBuilder group support
# =========================================================================
class TestGraphBuilderGroups:
    """Test GraphBuilder add_group method."""

    def test_add_group_basic(self):
        """Can add a group with blocks via builder."""
        graph = (
            GraphBuilder("Test")
            .add_block("Sensor")
            .add_block("MCU")
            .add_group(
                "Control",
                block_names=["Sensor", "MCU"],
            )
            .build()
        )
        assert len(graph.groups) == 1
        grp = graph.groups[0]
        assert grp.name == "Control"
        sensor = graph.get_block_by_name("Sensor")
        mcu = graph.get_block_by_name("MCU")
        assert sensor.id in grp.block_ids
        assert mcu.id in grp.block_ids

    def test_add_group_with_description(self):
        """Group description is set via builder."""
        graph = (
            GraphBuilder()
            .add_block("A")
            .add_group(
                "G",
                block_names=["A"],
                description="My notes",
            )
            .build()
        )
        assert graph.groups[0].description == "My notes"

    def test_add_group_with_metadata(self):
        """Group metadata is set via builder."""
        graph = (
            GraphBuilder()
            .add_block("A")
            .add_group(
                "G",
                block_names=["A"],
                metadata={"owner": "bob"},
            )
            .build()
        )
        assert graph.groups[0].metadata == {"owner": "bob"}

    def test_add_nested_group(self):
        """Can nest groups via builder."""
        graph = (
            GraphBuilder()
            .add_block("A")
            .add_block("B")
            .add_group("Parent", block_names=["A"])
            .add_group(
                "Child",
                block_names=["B"],
                parent_group_name="Parent",
            )
            .build()
        )
        assert len(graph.groups) == 2
        child = graph.get_group_by_name("Child")
        parent = graph.get_group_by_name("Parent")
        assert child.parent_group_id == parent.id

    def test_add_group_missing_block_raises(self):
        """Referencing a non-existent block raises ValueError."""
        builder = GraphBuilder().add_block("A")
        with pytest.raises(ValueError, match="Block 'Missing' not found"):
            builder.add_group("G", block_names=["Missing"])

    def test_add_group_missing_parent_raises(self):
        """Referencing a non-existent parent group raises."""
        builder = GraphBuilder().add_block("A")
        with pytest.raises(
            ValueError,
            match="Parent group 'NoParent' not found",
        ):
            builder.add_group(
                "G",
                block_names=["A"],
                parent_group_name="NoParent",
            )

    def test_add_group_empty_blocks(self):
        """Group with no blocks is allowed."""
        graph = GraphBuilder().add_group("Empty").build()
        assert len(graph.groups) == 1
        assert graph.groups[0].block_ids == []

    def test_add_group_returns_self(self):
        """add_group returns the builder for chaining."""
        builder = GraphBuilder()
        result = builder.add_group("G")
        assert result is builder

    def test_full_fluent_chain_with_groups(self):
        """Full builder chain with blocks, connections, and groups."""
        graph = (
            GraphBuilder("Complex System")
            .add_block("Sensor1", block_type="Temp")
            .add_port("OUT", direction=PortDirection.OUTPUT)
            .add_block("Sensor2", block_type="Pressure")
            .add_port("OUT", direction=PortDirection.OUTPUT)
            .add_block("MCU", block_type="Controller")
            .add_port("IN1", direction=PortDirection.INPUT)
            .add_port("IN2", direction=PortDirection.INPUT)
            .connect(
                "Sensor1",
                "MCU",
                from_port_name="OUT",
                to_port_name="IN1",
            )
            .connect(
                "Sensor2",
                "MCU",
                from_port_name="OUT",
                to_port_name="IN2",
            )
            .add_group(
                "Sensors",
                block_names=["Sensor1", "Sensor2"],
                description="All sensing elements",
                metadata={"subsystem": "input"},
            )
            .add_group(
                "Processing",
                block_names=["MCU"],
                description="Main processing unit",
            )
            .build()
        )
        assert graph.name == "Complex System"
        assert len(graph.blocks) == 3
        assert len(graph.connections) == 2
        assert len(graph.groups) == 2
        sensors = graph.get_group_by_name("Sensors")
        assert len(sensors.block_ids) == 2
        assert sensors.metadata["subsystem"] == "input"


# =========================================================================
# Dynamic group membership (add/remove blocks)
# =========================================================================
class TestGraphAddRemoveBlockFromGroup:
    """Test Graph add_block_to_group and remove_block_from_group."""

    def _make_graph(self):
        """Create a graph with blocks and a group."""
        b1 = Block(id="b1", name="Sensor")
        b2 = Block(id="b2", name="MCU")
        b3 = Block(id="b3", name="Motor")
        g1 = Group(id="g1", name="Control", block_ids=["b1"])
        return Graph(
            id="graph1",
            blocks=[b1, b2, b3],
            groups=[g1],
        )

    def test_add_block_to_group(self):
        """add_block_to_group appends a block ID."""
        graph = self._make_graph()
        result = graph.add_block_to_group("g1", "b2")
        assert result is True
        assert "b2" in graph.groups[0].block_ids
        assert len(graph.groups[0].block_ids) == 2

    def test_add_block_to_group_already_present(self):
        """add_block_to_group returns False for duplicate."""
        graph = self._make_graph()
        result = graph.add_block_to_group("g1", "b1")
        assert result is False
        assert len(graph.groups[0].block_ids) == 1

    def test_add_block_to_group_missing_group(self):
        """add_block_to_group returns False for missing group."""
        graph = self._make_graph()
        result = graph.add_block_to_group("missing", "b1")
        assert result is False

    def test_remove_block_from_group(self):
        """remove_block_from_group removes the block ID."""
        graph = self._make_graph()
        result = graph.remove_block_from_group("g1", "b1")
        assert result is True
        assert "b1" not in graph.groups[0].block_ids
        assert len(graph.groups[0].block_ids) == 0

    def test_remove_block_from_group_not_present(self):
        """remove_block_from_group returns False if absent."""
        graph = self._make_graph()
        result = graph.remove_block_from_group("g1", "b2")
        assert result is False

    def test_remove_block_from_group_missing_group(self):
        """remove_block_from_group returns False for missing."""
        graph = self._make_graph()
        result = graph.remove_block_from_group("missing", "b1")
        assert result is False

    def test_add_then_remove_round_trip(self):
        """Adding then removing a block restores original."""
        graph = self._make_graph()
        graph.add_block_to_group("g1", "b2")
        assert len(graph.groups[0].block_ids) == 2
        graph.remove_block_from_group("g1", "b2")
        assert graph.groups[0].block_ids == ["b1"]

    def test_single_block_group_creation(self):
        """A group can be created with a single block."""
        b1 = Block(id="b1", name="Solo")
        g1 = Group(id="g1", name="SoloGroup", block_ids=["b1"])
        graph = Graph(id="g", blocks=[b1], groups=[g1])
        errors = validate_graph(graph)
        assert len(errors) == 0
        assert len(graph.groups[0].block_ids) == 1


class TestGraphBuilderAddRemoveBlock:
    """Test GraphBuilder add_block_to_group, remove_block_from_group."""

    def test_add_block_to_group_builder(self):
        """Can add a block to an existing group via builder."""
        graph = (
            GraphBuilder("Test")
            .add_block("Sensor")
            .add_block("MCU")
            .add_group("Control", block_names=["Sensor"])
            .add_block_to_group("Control", "MCU")
            .build()
        )
        grp = graph.get_group_by_name("Control")
        mcu = graph.get_block_by_name("MCU")
        assert mcu.id in grp.block_ids
        assert len(grp.block_ids) == 2

    def test_remove_block_from_group_builder(self):
        """Can remove a block from a group via builder."""
        graph = (
            GraphBuilder("Test")
            .add_block("Sensor")
            .add_block("MCU")
            .add_group("Control", block_names=["Sensor", "MCU"])
            .remove_block_from_group("Control", "Sensor")
            .build()
        )
        grp = graph.get_group_by_name("Control")
        sensor = graph.get_block_by_name("Sensor")
        assert sensor.id not in grp.block_ids
        assert len(grp.block_ids) == 1

    def test_add_block_to_group_missing_group_raises(self):
        """Referencing non-existent group raises ValueError."""
        builder = GraphBuilder().add_block("A")
        with pytest.raises(ValueError, match="Group 'Missing' not found"):
            builder.add_block_to_group("Missing", "A")

    def test_add_block_to_group_missing_block_raises(self):
        """Referencing non-existent block raises ValueError."""
        builder = GraphBuilder().add_block("A").add_group("G")
        with pytest.raises(ValueError, match="Block 'Missing' not found"):
            builder.add_block_to_group("G", "Missing")

    def test_remove_block_from_group_missing_group_raises(
        self,
    ):
        """Referencing non-existent group raises ValueError."""
        builder = GraphBuilder().add_block("A")
        with pytest.raises(ValueError, match="Group 'Missing' not found"):
            builder.remove_block_from_group("Missing", "A")

    def test_remove_block_from_group_missing_block_raises(
        self,
    ):
        """Referencing non-existent block raises ValueError."""
        builder = GraphBuilder().add_block("A").add_group("G")
        with pytest.raises(ValueError, match="Block 'Missing' not found"):
            builder.remove_block_from_group("G", "Missing")

    def test_add_block_to_group_returns_self(self):
        """add_block_to_group returns builder for chaining."""
        builder = GraphBuilder().add_block("A").add_group("G", block_names=["A"])
        result = builder.add_block_to_group("G", "A")
        assert result is builder

    def test_remove_block_from_group_returns_self(self):
        """remove_block_from_group returns builder for chaining."""
        builder = GraphBuilder().add_block("A").add_group("G", block_names=["A"])
        result = builder.remove_block_from_group("G", "A")
        assert result is builder

    def test_single_block_group_via_builder(self):
        """Can create a group with one block via builder."""
        graph = (
            GraphBuilder("Test")
            .add_block("Solo")
            .add_group("SoloGroup", block_names=["Solo"])
            .build()
        )
        grp = graph.get_group_by_name("SoloGroup")
        assert len(grp.block_ids) == 1
