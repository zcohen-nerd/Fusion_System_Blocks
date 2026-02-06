"""Tests for core action plan builder functionality.

This module tests the build_action_plan function with various scenarios
including full creation, delta updates, and action ordering.

Test coverage:
    - Full creation from empty previous state
    - Delta mode with added/removed/updated blocks
    - Action ordering by priority
    - CAD sync actions
"""

import pytest
from core.models import (
    Block,
    BlockStatus,
    Connection,
    Graph,
    Port,
    PortDirection,
    PortKind,
)
from core.action_plan import (
    ActionPlan,
    ActionType,
    build_action_plan,
    get_action_plan_summary,
)
from core.graph_builder import GraphBuilder


class TestBuildActionPlanCreation:
    """Tests for full creation action plans (no previous state)."""

    def test_empty_graph_minimal_actions(self):
        """An empty graph should produce only save and refresh actions."""
        graph = Graph(name="Empty Graph")
        
        actions = build_action_plan(graph)
        
        # Should have SAVE_ATTRIBUTES and REFRESH_DISPLAY
        action_types = {a.action_type for a in actions}
        assert ActionType.SAVE_ATTRIBUTES in action_types
        assert ActionType.REFRESH_DISPLAY in action_types
        assert len(actions) == 2

    def test_single_block_creates_block_action(self):
        """A single block should produce a CREATE_BLOCK action."""
        graph = Graph(name="Single Block")
        block = Block(name="MCU", block_type="Microcontroller", x=100, y=50)
        graph.add_block(block)
        
        actions = build_action_plan(graph)
        
        create_actions = [a for a in actions if a.action_type == ActionType.CREATE_BLOCK]
        assert len(create_actions) == 1
        
        action = create_actions[0]
        assert action.target_id == block.id
        assert action.params["name"] == "MCU"
        assert action.params["block_type"] == "Microcontroller"
        assert action.params["x"] == 100
        assert action.params["y"] == 50

    def test_block_with_ports_creates_port_actions(self):
        """Blocks with ports should produce CREATE_PORT actions."""
        graph = (
            GraphBuilder("Block with Ports")
            .add_block("MCU")
            .add_port("TX", direction=PortDirection.OUTPUT)
            .add_port("RX", direction=PortDirection.INPUT)
            .add_port("SDA", direction=PortDirection.BIDIRECTIONAL)
            .build()
        )
        
        actions = build_action_plan(graph)
        
        port_actions = [a for a in actions if a.action_type == ActionType.CREATE_PORT]
        assert len(port_actions) == 3
        
        port_names = {a.params["name"] for a in port_actions}
        assert port_names == {"TX", "RX", "SDA"}

    def test_connection_creates_connection_action(self):
        """Connections should produce CREATE_CONNECTION actions."""
        graph = (
            GraphBuilder("Connected Blocks")
            .add_block("MCU")
            .add_block("Sensor")
            .connect("MCU", "Sensor", kind="I2C")
            .build()
        )
        
        actions = build_action_plan(graph)
        
        conn_actions = [
            a for a in actions if a.action_type == ActionType.CREATE_CONNECTION
        ]
        assert len(conn_actions) == 1
        
        action = conn_actions[0]
        assert action.params["kind"] == "I2C"
        assert "MCU" in action.description
        assert "Sensor" in action.description

    def test_multiple_blocks_and_connections(self):
        """Complex graph should produce all expected actions."""
        graph = (
            GraphBuilder("Complex Graph")
            .add_block("MCU", block_type="Controller")
            .add_port("SPI_MOSI")
            .add_port("I2C_SDA")
            .add_block("Flash", block_type="Memory")
            .add_port("SPI_MISO")
            .add_block("Sensor", block_type="ADC")
            .add_port("I2C_SDA")
            .connect("MCU", "Flash", kind="SPI")
            .connect("MCU", "Sensor", kind="I2C")
            .build()
        )
        
        actions = build_action_plan(graph)
        
        block_actions = [a for a in actions if a.action_type == ActionType.CREATE_BLOCK]
        port_actions = [a for a in actions if a.action_type == ActionType.CREATE_PORT]
        conn_actions = [a for a in actions if a.action_type == ActionType.CREATE_CONNECTION]
        
        assert len(block_actions) == 3
        assert len(port_actions) == 4
        assert len(conn_actions) == 2


class TestBuildActionPlanDelta:
    """Tests for delta action plans (with previous state)."""

    def test_added_block_produces_create_action(self):
        """Adding a new block should produce a CREATE_BLOCK action."""
        # Previous state: one block
        previous = Graph(name="Previous")
        block_a = Block(name="BlockA")
        previous.add_block(block_a)
        
        # Current state: two blocks
        current = Graph(name="Current")
        current.add_block(Block(id=block_a.id, name="BlockA"))  # Same block
        block_b = Block(name="BlockB")  # New block
        current.add_block(block_b)
        
        actions = build_action_plan(current, previous_graph=previous)
        
        create_actions = [
            a for a in actions
            if a.action_type == ActionType.CREATE_BLOCK and a.target_id == block_b.id
        ]
        assert len(create_actions) == 1

    def test_removed_block_produces_delete_action(self):
        """Removing a block should produce a DELETE_BLOCK action."""
        # Previous state: two blocks
        previous = Graph(name="Previous")
        block_a = Block(name="BlockA")
        block_b = Block(name="BlockB")
        previous.add_block(block_a)
        previous.add_block(block_b)
        
        # Current state: one block
        current = Graph(name="Current")
        current.add_block(Block(id=block_a.id, name="BlockA"))
        # block_b removed
        
        actions = build_action_plan(current, previous_graph=previous)
        
        delete_actions = [
            a for a in actions
            if a.action_type == ActionType.DELETE_BLOCK and a.target_id == block_b.id
        ]
        assert len(delete_actions) == 1

    def test_updated_block_produces_update_action(self):
        """Modifying a block should produce an UPDATE_BLOCK action."""
        block_id = "shared-block-id"
        
        # Previous state
        previous = Graph(name="Previous")
        previous.add_block(Block(id=block_id, name="OldName", block_type="OldType"))
        
        # Current state with changes
        current = Graph(name="Current")
        current.add_block(Block(id=block_id, name="NewName", block_type="NewType"))
        
        actions = build_action_plan(current, previous_graph=previous)
        
        update_actions = [
            a for a in actions
            if a.action_type == ActionType.UPDATE_BLOCK and a.target_id == block_id
        ]
        assert len(update_actions) == 1
        
        changes = update_actions[0].params["changes"]
        assert changes["name"]["old"] == "OldName"
        assert changes["name"]["new"] == "NewName"

    def test_moved_block_produces_move_action(self):
        """Moving a block should produce a MOVE_BLOCK action."""
        block_id = "shared-block-id"
        
        # Previous state at position (0, 0)
        previous = Graph(name="Previous")
        previous.add_block(Block(id=block_id, name="Block", x=0, y=0))
        
        # Current state at position (100, 200)
        current = Graph(name="Current")
        current.add_block(Block(id=block_id, name="Block", x=100, y=200))
        
        actions = build_action_plan(current, previous_graph=previous)
        
        move_actions = [
            a for a in actions
            if a.action_type == ActionType.MOVE_BLOCK and a.target_id == block_id
        ]
        assert len(move_actions) == 1
        
        params = move_actions[0].params
        assert params["from_x"] == 0
        assert params["from_y"] == 0
        assert params["to_x"] == 100
        assert params["to_y"] == 200

    def test_added_connection_produces_create_action(self):
        """Adding a connection should produce a CREATE_CONNECTION action."""
        block_a = Block(name="A")
        block_b = Block(name="B")
        
        # Previous state: two blocks, no connection
        previous = Graph(name="Previous")
        previous.add_block(Block(id=block_a.id, name="A"))
        previous.add_block(Block(id=block_b.id, name="B"))
        
        # Current state: two blocks with connection
        current = Graph(name="Current")
        current.add_block(Block(id=block_a.id, name="A"))
        current.add_block(Block(id=block_b.id, name="B"))
        
        conn = Connection(from_block_id=block_a.id, to_block_id=block_b.id)
        current.add_connection(conn)
        
        actions = build_action_plan(current, previous_graph=previous)
        
        create_conn = [
            a for a in actions if a.action_type == ActionType.CREATE_CONNECTION
        ]
        assert len(create_conn) == 1

    def test_removed_connection_produces_delete_action(self):
        """Removing a connection should produce a DELETE_CONNECTION action."""
        block_a = Block(name="A")
        block_b = Block(name="B")
        conn = Connection(from_block_id=block_a.id, to_block_id=block_b.id)
        
        # Previous state: two blocks with connection
        previous = Graph(name="Previous")
        previous.add_block(Block(id=block_a.id, name="A"))
        previous.add_block(Block(id=block_b.id, name="B"))
        previous.add_connection(Connection(
            id=conn.id,
            from_block_id=block_a.id,
            to_block_id=block_b.id,
        ))
        
        # Current state: two blocks, no connection
        current = Graph(name="Current")
        current.add_block(Block(id=block_a.id, name="A"))
        current.add_block(Block(id=block_b.id, name="B"))
        # Connection removed
        
        actions = build_action_plan(current, previous_graph=previous)
        
        delete_conn = [
            a for a in actions
            if a.action_type == ActionType.DELETE_CONNECTION and a.target_id == conn.id
        ]
        assert len(delete_conn) == 1

    def test_no_changes_minimal_actions(self):
        """Identical graphs should produce only save and refresh actions."""
        block = Block(name="Block")
        
        previous = Graph(name="Same")
        previous.add_block(Block(id=block.id, name="Block"))
        
        current = Graph(name="Same")
        current.add_block(Block(id=block.id, name="Block"))
        
        actions = build_action_plan(current, previous_graph=previous)
        
        # Should only have SAVE_ATTRIBUTES and REFRESH_DISPLAY
        action_types = {a.action_type for a in actions}
        create_delete = {ActionType.CREATE_BLOCK, ActionType.DELETE_BLOCK}
        assert action_types.isdisjoint(create_delete)


class TestBuildActionPlanOrdering:
    """Tests for action ordering and priority."""

    def test_deletes_before_creates(self):
        """Delete actions should come before create actions."""
        # This tests proper ordering when replacing blocks
        previous = Graph(name="Previous")
        previous.add_block(Block(id="old-block", name="OldBlock"))
        
        current = Graph(name="Current")
        current.add_block(Block(id="new-block", name="NewBlock"))
        
        actions = build_action_plan(current, previous_graph=previous)
        
        delete_idx = None
        create_idx = None
        
        for i, action in enumerate(actions):
            if action.action_type == ActionType.DELETE_BLOCK:
                delete_idx = i
            elif action.action_type == ActionType.CREATE_BLOCK:
                create_idx = i
        
        assert delete_idx is not None
        assert create_idx is not None
        assert delete_idx < create_idx

    def test_blocks_before_ports(self):
        """Block creation should come before port creation."""
        graph = (
            GraphBuilder("Ordered")
            .add_block("MCU")
            .add_port("TX")
            .build()
        )
        
        actions = build_action_plan(graph)
        
        block_priority = None
        port_priority = None
        
        for action in actions:
            if action.action_type == ActionType.CREATE_BLOCK:
                block_priority = action.priority
            elif action.action_type == ActionType.CREATE_PORT:
                port_priority = action.priority
        
        assert block_priority is not None
        assert port_priority is not None
        assert block_priority < port_priority

    def test_ports_before_connections(self):
        """Port creation should come before connection creation."""
        graph = (
            GraphBuilder("Ordered")
            .add_block("A")
            .add_port("OUT")
            .add_block("B")
            .add_port("IN")
            .connect("A", "B")
            .build()
        )
        
        actions = build_action_plan(graph)
        
        max_port_priority = 0
        min_conn_priority = float("inf")
        
        for action in actions:
            if action.action_type == ActionType.CREATE_PORT:
                max_port_priority = max(max_port_priority, action.priority)
            elif action.action_type == ActionType.CREATE_CONNECTION:
                min_conn_priority = min(min_conn_priority, action.priority)
        
        assert max_port_priority < min_conn_priority

    def test_actions_sorted_by_priority(self):
        """Actions should be returned sorted by priority."""
        graph = (
            GraphBuilder("Multi")
            .add_block("MCU")
            .add_port("TX")
            .add_block("Sensor")
            .add_port("RX")
            .connect("MCU", "Sensor")
            .build()
        )
        
        actions = build_action_plan(graph)
        
        priorities = [a.priority for a in actions]
        assert priorities == sorted(priorities)


class TestBuildActionPlanCADSync:
    """Tests for CAD synchronization actions."""

    def test_cad_link_produces_sync_action(self):
        """Blocks with CAD links should produce SYNC_CAD_PROPERTIES actions."""
        graph = Graph(name="CAD Linked")
        
        block = Block(name="Motor")
        block.links = [
            {
                "target": "cad",
                "occToken": "token-123",
                "docId": "doc-456",
            }
        ]
        graph.add_block(block)
        
        actions = build_action_plan(graph)
        
        sync_actions = [
            a for a in actions if a.action_type == ActionType.SYNC_CAD_PROPERTIES
        ]
        assert len(sync_actions) == 1
        assert sync_actions[0].params["occ_token"] == "token-123"
        assert sync_actions[0].params["doc_id"] == "doc-456"

    def test_multiple_cad_links_produce_multiple_actions(self):
        """Multiple CAD links should produce multiple sync actions."""
        graph = Graph(name="Multi CAD")
        
        block = Block(name="Assembly")
        block.links = [
            {"target": "cad", "occToken": "token-1", "docId": "doc-1"},
            {"target": "cad", "occToken": "token-2", "docId": "doc-2"},
        ]
        graph.add_block(block)
        
        actions = build_action_plan(graph)
        
        sync_actions = [
            a for a in actions if a.action_type == ActionType.SYNC_CAD_PROPERTIES
        ]
        assert len(sync_actions) == 2

    def test_non_cad_links_ignored_for_sync(self):
        """Non-CAD links should not produce sync actions."""
        graph = Graph(name="ECAD Only")
        
        block = Block(name="MCU")
        block.links = [
            {"target": "ecad", "device": "STM32F4"},
            {"target": "external", "docPath": "/path/to/spec.pdf"},
        ]
        graph.add_block(block)
        
        actions = build_action_plan(graph)
        
        sync_actions = [
            a for a in actions if a.action_type == ActionType.SYNC_CAD_PROPERTIES
        ]
        assert len(sync_actions) == 0


class TestBuildActionPlanOptions:
    """Tests for action plan builder options."""

    def test_include_refresh_true(self):
        """include_refresh=True should include REFRESH_DISPLAY action."""
        graph = Graph(name="Test")
        
        actions = build_action_plan(graph, include_refresh=True)
        
        refresh_actions = [
            a for a in actions if a.action_type == ActionType.REFRESH_DISPLAY
        ]
        assert len(refresh_actions) == 1

    def test_include_refresh_false(self):
        """include_refresh=False should exclude REFRESH_DISPLAY action."""
        graph = Graph(name="Test")
        
        actions = build_action_plan(graph, include_refresh=False)
        
        refresh_actions = [
            a for a in actions if a.action_type == ActionType.REFRESH_DISPLAY
        ]
        assert len(refresh_actions) == 0


class TestActionPlanUtilities:
    """Tests for action plan utility functions."""

    def test_action_to_dict(self):
        """ActionPlan.to_dict should produce proper dictionary."""
        action = ActionPlan(
            action_type=ActionType.CREATE_BLOCK,
            target_id="block-123",
            target_type="block",
            description="Create block 'MCU'",
            params={"name": "MCU", "x": 100},
            priority=10,
            depends_on=["other-block"],
        )
        
        result = action.to_dict()
        
        assert result["action_type"] == "CREATE_BLOCK"
        assert result["target_id"] == "block-123"
        assert result["target_type"] == "block"
        assert result["description"] == "Create block 'MCU'"
        assert result["params"]["name"] == "MCU"
        assert result["priority"] == 10
        assert result["depends_on"] == ["other-block"]

    def test_get_action_plan_summary_empty(self):
        """get_action_plan_summary should handle empty list."""
        summary = get_action_plan_summary([])
        assert "No actions" in summary

    def test_get_action_plan_summary_grouped(self):
        """get_action_plan_summary should group by action type."""
        actions = [
            ActionPlan(action_type=ActionType.CREATE_BLOCK, target_id="1"),
            ActionPlan(action_type=ActionType.CREATE_BLOCK, target_id="2"),
            ActionPlan(action_type=ActionType.CREATE_PORT, target_id="3"),
            ActionPlan(action_type=ActionType.CREATE_CONNECTION, target_id="4"),
        ]
        
        summary = get_action_plan_summary(actions)
        
        assert "4 action" in summary
        assert "CREATE_BLOCK" in summary
        assert "CREATE_PORT" in summary
        assert "CREATE_CONNECTION" in summary
