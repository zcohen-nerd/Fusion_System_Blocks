"""
Tests for src/diagram/cad.py — CAD linking, 3D visualization,
and living documentation functions.
"""

import pytest

from diagram_data import (
    CADLinkingError,
    create_enhanced_cad_link,
    update_component_properties,
    mark_component_as_missing,
    mark_component_as_error,
    validate_enhanced_cad_link,
    calculate_component_completion_percentage,
    get_component_health_status,
    generate_component_thumbnail_placeholder,
    generate_component_thumbnail_data,
    sync_all_components_in_diagram,
    create_component_dashboard_data,
    initialize_3d_visualization,
    update_3d_overlay_position,
    set_component_highlight_color,
    enable_system_grouping,
    create_3d_connection_route,
    update_live_thumbnail,
    initialize_living_documentation,
    generate_assembly_sequence,
    estimate_assembly_time,
    determine_complexity,
    generate_assembly_instructions,
    generate_living_bom,
    track_change_impact,
    update_manufacturing_progress,
    create_empty_diagram,
    create_block,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def basic_cad_link():
    """A minimal valid CAD link."""
    return create_enhanced_cad_link(
        doc_id="doc-123",
        occ_token="tok-456",
        component_name="MotorBracket",
    )


@pytest.fixture
def full_cad_link():
    """A fully-populated CAD link."""
    return create_enhanced_cad_link(
        doc_id="doc-123",
        occ_token="tok-456",
        component_name="MotorBracket",
        material="Aluminum 6061",
        mass=0.45,
        volume=150.0,
        bounding_box={"min": [0, 0, 0], "max": [10, 20, 30]},
        custom_properties={"finish": "anodized"},
    )


@pytest.fixture
def block_with_cad_link(full_cad_link):
    """A block that has one fully-populated CAD link."""
    block = create_block("Motor", 0, 0)
    block["links"] = [full_cad_link]
    return block


@pytest.fixture
def diagram_with_cad(block_with_cad_link):
    """A diagram containing one CAD-linked block."""
    diagram = create_empty_diagram()
    diagram["blocks"].append(block_with_cad_link)
    return diagram


# ===================================================================
# create_enhanced_cad_link
# ===================================================================

class TestCreateEnhancedCADLink:

    def test_minimal_args(self):
        link = create_enhanced_cad_link("d1", "t1")
        assert link["target"] == "cad"
        assert link["docId"] == "d1"
        assert link["occToken"] == "t1"
        assert link["syncStatus"]["status"] == "synchronized"
        assert link["componentProperties"]["material"] == ""
        assert link["componentProperties"]["mass"] == 0.0

    def test_all_args_populated(self, full_cad_link):
        link = full_cad_link
        assert link["componentProperties"]["material"] == "Aluminum 6061"
        assert link["componentProperties"]["mass"] == 0.45
        assert link["componentProperties"]["volume"] == 150.0
        assert link["componentProperties"]["boundingBox"]["max"] == [10, 20, 30]
        assert link["componentProperties"]["customProperties"]["finish"] == "anodized"

    def test_bounding_box_absent_when_not_given(self):
        link = create_enhanced_cad_link("d1", "t1")
        assert "boundingBox" not in link["componentProperties"]

    def test_sync_timestamps_are_isoformat(self, basic_cad_link):
        # ISO format contains 'T' separator
        assert "T" in basic_cad_link["syncStatus"]["lastSync"]
        assert "T" in basic_cad_link["syncStatus"]["lastModified"]


# ===================================================================
# update_component_properties
# ===================================================================

class TestUpdateComponentProperties:

    def test_update_material(self, basic_cad_link):
        updated = update_component_properties(basic_cad_link, material="Steel")
        assert updated["componentProperties"]["material"] == "Steel"

    def test_update_mass_and_volume(self, basic_cad_link):
        updated = update_component_properties(basic_cad_link, mass=1.5, volume=200.0)
        assert updated["componentProperties"]["mass"] == 1.5
        assert updated["componentProperties"]["volume"] == 200.0

    def test_changes_tracked_in_sync_status(self, basic_cad_link):
        updated = update_component_properties(basic_cad_link, material="Titanium")
        assert updated["syncStatus"]["status"] == "modified"
        assert len(updated["syncStatus"]["changesSinceSync"]) >= 1

    def test_custom_properties_merged(self, basic_cad_link):
        updated = update_component_properties(
            basic_cad_link, customProperties={"color": "red"}
        )
        assert updated["componentProperties"]["customProperties"]["color"] == "red"

    def test_bounding_box_update(self, basic_cad_link):
        bb = {"min": [0, 0, 0], "max": [5, 5, 5]}
        updated = update_component_properties(basic_cad_link, boundingBox=bb)
        assert updated["componentProperties"]["boundingBox"] == bb

    def test_non_cad_link_raises(self):
        non_cad = {"target": "ecad"}
        with pytest.raises(CADLinkingError):
            update_component_properties(non_cad, material="X")

    def test_no_changes_keeps_status(self, basic_cad_link):
        original_status = basic_cad_link["syncStatus"]["status"]
        update_component_properties(basic_cad_link)
        assert basic_cad_link["syncStatus"]["status"] == original_status


# ===================================================================
# mark_component_as_missing / mark_component_as_error
# ===================================================================

class TestMarkComponentStatus:

    def test_mark_missing(self, basic_cad_link):
        updated = mark_component_as_missing(basic_cad_link, "Not found in assembly")
        assert updated["syncStatus"]["status"] == "missing"
        assert "Not found in assembly" in updated["syncStatus"]["syncErrors"]

    def test_mark_missing_no_message(self, basic_cad_link):
        updated = mark_component_as_missing(basic_cad_link)
        assert updated["syncStatus"]["status"] == "missing"

    def test_mark_missing_creates_sync_status(self):
        link = {"target": "cad"}
        updated = mark_component_as_missing(link, "gone")
        assert updated["syncStatus"]["status"] == "missing"

    def test_mark_error(self, basic_cad_link):
        updated = mark_component_as_error(basic_cad_link, "Broken reference")
        assert updated["syncStatus"]["status"] == "error"
        assert "Broken reference" in updated["syncStatus"]["syncErrors"]

    def test_mark_error_none_link(self):
        assert mark_component_as_error(None, "err") is None


# ===================================================================
# validate_enhanced_cad_link
# ===================================================================

class TestValidateEnhancedCADLink:

    def test_valid_link(self, full_cad_link):
        result = validate_enhanced_cad_link(full_cad_link)
        assert result["valid"] is True
        assert result["errors"] == []

    def test_none_link(self):
        result = validate_enhanced_cad_link(None)
        assert result["valid"] is False

    def test_empty_dict(self):
        result = validate_enhanced_cad_link({})
        assert result["valid"] is False
        assert len(result["errors"]) >= 1  # Missing required fields

    def test_missing_required_fields(self):
        result = validate_enhanced_cad_link({"target": "cad"})
        assert result["valid"] is False
        assert any("docId" in e for e in result["errors"])
        assert any("occToken" in e for e in result["errors"])

    def test_invalid_sync_status_string(self):
        link = create_enhanced_cad_link("d1", "t1")
        link["syncStatus"]["status"] = "banana"
        result = validate_enhanced_cad_link(link)
        assert result["valid"] is False
        assert any("banana" in e for e in result["errors"])

    def test_missing_sync_status_warning(self):
        link = create_enhanced_cad_link("d1", "t1")
        del link["syncStatus"]
        result = validate_enhanced_cad_link(link)
        # missing syncStatus is a warning, not error
        assert result["valid"] is True
        assert any("syncStatus" in w for w in result["warnings"])

    def test_missing_thumbnail_warning(self, basic_cad_link):
        result = validate_enhanced_cad_link(basic_cad_link)
        assert any("thumbnail" in w for w in result["warnings"])


# ===================================================================
# calculate_component_completion_percentage
# ===================================================================

class TestCompletionPercentage:

    def test_no_cad_links(self):
        block = create_block("Empty", 0, 0)
        assert calculate_component_completion_percentage(block) == 0.0

    def test_fully_populated_link(self, block_with_cad_link):
        pct = calculate_component_completion_percentage(block_with_cad_link)
        assert pct > 80.0  # Has material, mass, volume, boundingBox, synchronized

    def test_minimal_link_low_score(self):
        block = create_block("X", 0, 0)
        block["links"] = [{"target": "cad"}]  # bare minimum
        pct = calculate_component_completion_percentage(block)
        # Only gets base 20 + unknown sync 10 = 30 out of 100
        assert 25 <= pct <= 35

    def test_missing_sync_status_lowers_score(self):
        block = create_block("X", 0, 0)
        link = create_enhanced_cad_link("d", "t", material="Al", mass=1.0, volume=50.0)
        link["syncStatus"]["status"] = "missing"
        block["links"] = [link]
        pct = calculate_component_completion_percentage(block)
        # "missing" gets 0 sync points vs "synchronized" gets 30
        assert pct < 80


# ===================================================================
# get_component_health_status
# ===================================================================

class TestComponentHealthStatus:

    def test_no_components(self):
        block = create_block("Empty", 0, 0)
        health = get_component_health_status(block)
        assert health["overall_status"] == "no_components"
        assert health["component_count"] == 0

    def test_all_synchronized(self, block_with_cad_link):
        health = get_component_health_status(block_with_cad_link)
        assert health["overall_status"] == "healthy"
        assert health["status_breakdown"]["synchronized"] == 1

    def test_modified_needs_sync(self):
        block = create_block("X", 0, 0)
        link = create_enhanced_cad_link("d", "t")
        link["syncStatus"]["status"] = "modified"
        link["syncStatus"]["changesSinceSync"] = ["mass changed"]
        block["links"] = [link]
        health = get_component_health_status(block)
        assert health["overall_status"] == "needs_sync"

    def test_error_is_warning(self):
        block = create_block("X", 0, 0)
        link = create_enhanced_cad_link("d", "t")
        link["syncStatus"]["status"] = "error"
        link["syncStatus"]["syncErrors"] = ["corrupt ref"]
        block["links"] = [link]
        health = get_component_health_status(block)
        assert health["overall_status"] == "warning"
        assert len(health["issues"]) >= 1

    def test_mostly_missing_is_critical(self):
        block = create_block("X", 0, 0)
        links = []
        for i in range(3):
            link = create_enhanced_cad_link("d", f"t{i}")
            link["syncStatus"]["status"] = "missing"
            links.append(link)
        block["links"] = links
        health = get_component_health_status(block)
        assert health["overall_status"] == "critical"


# ===================================================================
# Thumbnails
# ===================================================================

class TestThumbnails:

    def test_placeholder_returns_data_url(self):
        thumb = generate_component_thumbnail_placeholder()
        assert thumb["dataUrl"].startswith("data:image/svg+xml;base64,")
        assert thumb["width"] == 64
        assert thumb["height"] == 64

    def test_placeholder_custom_size(self):
        thumb = generate_component_thumbnail_placeholder(width=128, height=128)
        assert thumb["width"] == 128

    def test_thumbnail_data_with_bytes(self):
        fake_png = b"\x89PNG_fake_data"
        thumb = generate_component_thumbnail_data("Motor", fake_png)
        assert thumb["type"] == "image"
        assert "base64," in thumb["data"]

    def test_thumbnail_data_without_bytes_falls_back(self):
        thumb = generate_component_thumbnail_data("Motor")
        assert thumb["dataUrl"].startswith("data:image/svg+xml;base64,")


# ===================================================================
# sync_all_components_in_diagram
# ===================================================================

class TestSyncAllComponents:

    def test_empty_diagram(self):
        diagram = create_empty_diagram()
        results = sync_all_components_in_diagram(diagram)
        assert results["total_blocks"] == 0
        assert results["sync_successful"] == 0

    def test_diagram_with_cad_links(self, diagram_with_cad):
        results = sync_all_components_in_diagram(diagram_with_cad)
        assert results["blocks_with_cad"] == 1
        assert results["total_components"] == 1
        assert results["sync_successful"] == 1
        assert results["sync_failed"] == 0

    def test_blocks_without_cad_ignored(self):
        diagram = create_empty_diagram()
        block = create_block("No CAD", 0, 0)
        diagram["blocks"].append(block)
        results = sync_all_components_in_diagram(diagram)
        assert results["blocks_with_cad"] == 0


# ===================================================================
# create_component_dashboard_data
# ===================================================================

class TestDashboard:

    def test_empty_diagram(self):
        dashboard = create_component_dashboard_data(create_empty_diagram())
        assert dashboard["overview"]["total_blocks"] == 0
        assert dashboard["overview"]["overall_health"] == "unknown"

    def test_diagram_with_healthy_cad(self, diagram_with_cad):
        dashboard = create_component_dashboard_data(diagram_with_cad)
        assert dashboard["overview"]["blocks_with_cad"] == 1
        assert dashboard["overview"]["overall_health"] == "healthy"
        assert dashboard["completion_stats"]["average_completion"] > 0

    def test_completion_bucketing(self):
        diagram = create_empty_diagram()
        # Block with minimal link → 0-25% or 26-50%
        block = create_block("Minimal", 0, 0)
        block["links"] = [{"target": "cad"}]
        diagram["blocks"].append(block)
        dashboard = create_component_dashboard_data(diagram)
        buckets = dashboard["completion_stats"]["blocks_by_completion"]
        assert buckets["0-25%"] + buckets["26-50%"] >= 1


# ===================================================================
# 3D Visualization
# ===================================================================

class TestVisualization3D:

    def test_initialize_adds_key(self):
        block = create_block("Motor", 0, 0)
        assert "visualization3D" not in block
        updated = initialize_3d_visualization(block)
        assert "visualization3D" in updated
        assert updated["visualization3D"]["highlightColor"] == "#4CAF50"

    def test_initialize_idempotent(self):
        block = create_block("Motor", 0, 0)
        initialize_3d_visualization(block)
        block["visualization3D"]["highlightColor"] = "#FF0000"
        initialize_3d_visualization(block)
        assert block["visualization3D"]["highlightColor"] == "#FF0000"

    def test_initialize_none_block(self):
        assert initialize_3d_visualization(None) is None

    def test_update_overlay_position(self):
        block = create_block("Motor", 0, 0)
        updated = update_3d_overlay_position(block, 1.0, 2.0, 3.0)
        pos = updated["visualization3D"]["overlayPosition"]
        assert pos == {"x": 1.0, "y": 2.0, "z": 3.0}

    def test_update_overlay_none_block(self):
        assert update_3d_overlay_position(None, 0, 0, 0) is None

    def test_set_highlight_color_valid(self):
        block = create_block("Motor", 0, 0)
        updated = set_component_highlight_color(block, "#FF5722")
        assert updated["visualization3D"]["highlightColor"] == "#FF5722"

    def test_set_highlight_color_invalid_format(self):
        block = create_block("Motor", 0, 0)
        initialize_3d_visualization(block)
        original = block["visualization3D"]["highlightColor"]
        set_component_highlight_color(block, "red")  # not hex
        assert block["visualization3D"]["highlightColor"] == original

    def test_set_highlight_none_block(self):
        assert set_component_highlight_color(None, "#FFF") is None

    def test_enable_system_grouping(self):
        blocks = [create_block(f"B{i}", 0, 0) for i in range(3)]
        updated = enable_system_grouping(blocks, "#00FF00")
        for b in updated:
            assert b["visualization3D"]["groupBoundary"]["enabled"] is True
            assert b["visualization3D"]["groupBoundary"]["color"] == "#00FF00"

    def test_enable_system_grouping_empty(self):
        assert enable_system_grouping([]) == []

    def test_create_3d_connection_route(self):
        conn = {"id": "c1", "from": {}, "to": {}}
        waypoints = [
            {"x": 0, "y": 0, "z": 0},
            {"x": 3, "y": 4, "z": 0},  # distance = 5
        ]
        updated = create_3d_connection_route(conn, waypoints)
        assert updated["visualization3D"]["routingStatus"] == "routed"
        assert updated["visualization3D"]["cableProperties"]["length"] == pytest.approx(5.0)

    def test_create_3d_route_none_connection(self):
        assert create_3d_connection_route(None, [{"x": 0, "y": 0, "z": 0}]) is None

    def test_create_3d_route_no_waypoints(self):
        conn = {"id": "c1"}
        assert create_3d_connection_route(conn, []) == conn

    def test_update_live_thumbnail(self):
        block = create_block("Motor", 0, 0)
        link = create_enhanced_cad_link("d", "t")
        block["links"] = [link]
        updated = update_live_thumbnail(block, "data:image/png;base64,abc")
        assert block["links"][0]["thumbnail"]["dataUrl"] == "data:image/png;base64,abc"

    def test_update_live_thumbnail_none_block(self):
        assert update_live_thumbnail(None, "data") is None

    def test_update_live_thumbnail_no_data(self):
        block = create_block("Motor", 0, 0)
        result = update_live_thumbnail(block, "")
        # empty string is falsy, should return block unchanged
        assert result == block


# ===================================================================
# Living Documentation
# ===================================================================

class TestLivingDocumentation:

    def test_initialize_adds_key(self):
        block = create_block("Motor", 0, 0)
        updated = initialize_living_documentation(block)
        assert "livingDocumentation" in updated
        assert "assemblySequence" in updated["livingDocumentation"]
        assert "bomEntry" in updated["livingDocumentation"]

    def test_initialize_idempotent(self):
        block = create_block("Motor", 0, 0)
        initialize_living_documentation(block)
        block["livingDocumentation"]["bomEntry"]["cost"] = 99.99
        initialize_living_documentation(block)
        assert block["livingDocumentation"]["bomEntry"]["cost"] == 99.99

    def test_initialize_none_block(self):
        assert initialize_living_documentation(None) is None

    def test_estimate_assembly_time_basic(self):
        block = create_block("Simple", 0, 0)
        time_min = estimate_assembly_time(block)
        assert time_min >= 10.0  # base time

    def test_estimate_assembly_time_with_interfaces(self):
        block = create_block("Complex", 0, 0)
        block["interfaces"] = [{"id": f"i{i}"} for i in range(5)]
        time_min = estimate_assembly_time(block)
        assert time_min >= 20.0  # 10 base + 5*2

    def test_determine_complexity_simple(self):
        block = create_block("X", 0, 0)
        assert determine_complexity(block) in ("simple", "moderate")

    def test_determine_complexity_complex(self):
        block = create_block("X", 0, 0)
        block["interfaces"] = [{"id": f"i{i}"} for i in range(4)]
        block["links"] = [{"target": "cad"}, {"target": "cad"}]
        assert determine_complexity(block) in ("complex", "critical")

    def test_determine_complexity_child_diagram(self):
        block = create_block("X", 0, 0)
        block["childDiagram"] = {"blocks": []}
        # childDiagram adds 5 to score → score=5 → "moderate" boundary
        # Adding an interface pushes it to "complex"
        block["interfaces"] = [{"id": "i1"}]
        assert determine_complexity(block) in ("complex", "critical")

    def test_generate_assembly_instructions(self):
        block = create_block("Motor", 0, 0)
        block["interfaces"] = [{"id": "i1", "name": "Power", "kind": "power"}]
        instructions = generate_assembly_instructions(block)
        assert len(instructions) >= 3
        assert any("Motor" in s for s in instructions)
        assert any("interface" in s.lower() or "Connect" in s for s in instructions)


# ===================================================================
# generate_assembly_sequence
# ===================================================================

class TestAssemblySequence:

    def test_empty_diagram(self):
        diagram = create_empty_diagram()
        seq = generate_assembly_sequence(diagram)
        assert seq == []

    def test_no_connections_all_independent(self):
        diagram = create_empty_diagram()
        for i in range(3):
            diagram["blocks"].append(create_block(f"Block{i}", 0, 0))
        seq = generate_assembly_sequence(diagram)
        assert len(seq) == 3
        # All should have order 1-3
        orders = [s["order"] for s in seq]
        assert orders == [1, 2, 3]

    def test_dependencies_respected(self):
        diagram = create_empty_diagram()
        b1 = create_block("Power Supply", 0, 0)
        b2 = create_block("Controller", 100, 0)
        diagram["blocks"] = [b1, b2]
        diagram["connections"] = [{
            "id": "c1",
            "from": {"blockId": b1["id"], "interfaceId": None},
            "to": {"blockId": b2["id"], "interfaceId": None},
        }]
        seq = generate_assembly_sequence(diagram)
        assert len(seq) == 2
        # Power Supply (no deps) should come before Controller
        names_in_order = [s["blockName"] for s in seq]
        assert names_in_order.index("Power Supply") < names_in_order.index("Controller")

    def test_circular_dependency_handled(self):
        diagram = create_empty_diagram()
        b1 = create_block("A", 0, 0)
        b2 = create_block("B", 100, 0)
        diagram["blocks"] = [b1, b2]
        diagram["connections"] = [
            {"id": "c1", "from": {"blockId": b1["id"]}, "to": {"blockId": b2["id"]}},
            {"id": "c2", "from": {"blockId": b2["id"]}, "to": {"blockId": b1["id"]}},
        ]
        seq = generate_assembly_sequence(diagram)
        # Should still produce steps (with "critical" complexity for circular)
        assert len(seq) == 2


# ===================================================================
# generate_living_bom
# ===================================================================

class TestLivingBOM:

    def test_empty_diagram(self):
        bom = generate_living_bom(create_empty_diagram())
        assert bom["items"] == []
        assert bom["summary"] == {}

    def test_bom_item_count_matches_blocks(self):
        diagram = create_empty_diagram()
        for i in range(3):
            diagram["blocks"].append(create_block(f"Part{i}", 0, 0))
        bom = generate_living_bom(diagram)
        assert len(bom["items"]) == 3
        assert bom["summary"]["totalItems"] == 3

    def test_bom_includes_cad_info(self, diagram_with_cad):
        bom = generate_living_bom(diagram_with_cad)
        item = bom["items"][0]
        assert "cadComponents" in item

    def test_bom_cost_accumulation(self):
        diagram = create_empty_diagram()
        block = create_block("Expensive", 0, 0)
        initialize_living_documentation(block)
        block["livingDocumentation"]["bomEntry"]["cost"] = 25.0
        block["livingDocumentation"]["bomEntry"]["quantity"] = 4
        diagram["blocks"].append(block)
        bom = generate_living_bom(diagram)
        assert bom["items"][0]["totalCost"] == 100.0
        assert bom["summary"]["totalCost"] == 100.0


# ===================================================================
# track_change_impact
# ===================================================================

class TestChangeImpact:

    def test_no_connections_low_impact(self):
        diagram = create_empty_diagram()
        block = create_block("Isolated", 0, 0)
        diagram["blocks"].append(block)
        result = track_change_impact(diagram, block["id"], "Updated spec")
        assert result["impactLevel"] == "low"
        assert result["affectedBlocks"] == []

    def test_connected_blocks_detected(self):
        diagram = create_empty_diagram()
        b1 = create_block("Hub", 0, 0)
        b2 = create_block("Leaf", 100, 0)
        diagram["blocks"] = [b1, b2]
        diagram["connections"] = [{
            "id": "c1",
            "from": {"blockId": b1["id"]},
            "to": {"blockId": b2["id"]},
        }]
        result = track_change_impact(diagram, b1["id"], "Redesign")
        assert b2["id"] in result["affectedBlocks"]
        assert result["impactLevel"] in ("medium", "high", "critical")

    def test_many_connections_high_impact(self):
        diagram = create_empty_diagram()
        hub = create_block("Hub", 0, 0)
        diagram["blocks"].append(hub)
        for i in range(6):
            leaf = create_block(f"Leaf{i}", i * 100, 0)
            diagram["blocks"].append(leaf)
            diagram["connections"].append({
                "id": f"c{i}",
                "from": {"blockId": hub["id"]},
                "to": {"blockId": leaf["id"]},
            })
        result = track_change_impact(diagram, hub["id"], "Major change")
        assert result["impactLevel"] == "critical"

    def test_missing_block_returns_unknown(self):
        diagram = create_empty_diagram()
        result = track_change_impact(diagram, "nonexistent", "x")
        assert result["impactLevel"] == "unknown"

    def test_empty_diagram_returns_unknown(self):
        result = track_change_impact(None, "x", "y")
        assert result["impactLevel"] == "unknown"


# ===================================================================
# update_manufacturing_progress
# ===================================================================

class TestManufacturingProgress:

    def test_update_stage_and_completion(self):
        block = create_block("Part", 0, 0)
        updated = update_manufacturing_progress(block, "prototype", 45.0)
        progress = updated["livingDocumentation"]["manufacturingProgress"]
        assert progress["stage"] == "prototype"
        assert progress["completionPercentage"] == 45.0

    def test_completion_clamped_to_100(self):
        block = create_block("Part", 0, 0)
        updated = update_manufacturing_progress(block, "complete", 150.0)
        assert updated["livingDocumentation"]["manufacturingProgress"]["completionPercentage"] == 100.0

    def test_completion_clamped_to_0(self):
        block = create_block("Part", 0, 0)
        updated = update_manufacturing_progress(block, "design", -10.0)
        assert updated["livingDocumentation"]["manufacturingProgress"]["completionPercentage"] == 0.0

    def test_none_block(self):
        assert update_manufacturing_progress(None, "x", 50) is None
