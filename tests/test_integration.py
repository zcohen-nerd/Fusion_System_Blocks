"""End-to-end integration tests that exercise multiple diagram subsystems together.

Each test builds a realistic diagram and verifies that create → validate →
status → rules → export → serialize/deserialize round-trip all produce
consistent, correct results.
"""

import pytest

import diagram_data

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_power_system_diagram():
    """Return a small but realistic power-system diagram."""
    d = diagram_data.create_empty_diagram()

    psu = diagram_data.create_block("PSU", 0, 0)
    psu["attributes"] = {"output_current": "500mA", "voltage": "3.3V"}
    vout = diagram_data.create_interface("VOUT", "power")
    vout["params"] = {"voltage": "3.3V"}
    psu["interfaces"] = [vout]
    psu["links"] = [{"target": "cad", "occToken": "t1", "docId": "d1"}]

    mcu = diagram_data.create_block("MCU", 200, 0)
    mcu["attributes"] = {"current": "120mA", "model": "STM32F4"}
    vin = diagram_data.create_interface("VIN", "power")
    vin["params"] = {"voltage": "3.3V"}
    gpio = diagram_data.create_interface("GPIO", "data")
    gpio["params"] = {"voltage": "3.3V"}
    mcu["interfaces"] = [vin, gpio]
    mcu["links"] = [
        {"target": "cad", "occToken": "t2", "docId": "d2"},
        {"target": "ecad", "device": "U1"},
    ]

    sensor = diagram_data.create_block("Sensor", 400, 0)
    sensor["attributes"] = {"current": "30mA"}
    sdata = diagram_data.create_interface("DATA", "data")
    sdata["params"] = {"voltage": "3.3V"}
    sensor["interfaces"] = [sdata]
    sensor["links"] = [{"target": "cad", "occToken": "t3", "docId": "d3"}]

    for b in (psu, mcu, sensor):
        diagram_data.add_block_to_diagram(d, b)

    conn1 = diagram_data.create_connection(
        psu["id"],
        mcu["id"],
        from_interface=vout["id"],
        to_interface=vin["id"],
    )
    conn2 = diagram_data.create_connection(
        mcu["id"],
        sensor["id"],
        from_interface=gpio["id"],
        to_interface=sdata["id"],
    )
    diagram_data.add_connection_to_diagram(d, conn1)
    diagram_data.add_connection_to_diagram(d, conn2)
    return d, psu, mcu, sensor


# ---------------------------------------------------------------------------
# Integration tests
# ---------------------------------------------------------------------------


class TestEndToEnd:
    """Full lifecycle: create → validate → status → rules → export → roundtrip."""

    def test_create_validate_serialize_roundtrip(self):
        """Diagram survives JSON serialization round-trip intact."""
        d, *_ = _build_power_system_diagram()

        json_str = diagram_data.serialize_diagram(d, validate=True)
        restored = diagram_data.deserialize_diagram(json_str, validate=True)

        assert len(restored["blocks"]) == 3
        assert len(restored["connections"]) == 2
        names = {b["name"] for b in restored["blocks"]}
        assert names == {"PSU", "MCU", "Sensor"}

    def test_status_updates_consistent(self):
        """update_block_statuses produces expected statuses for a realistic diagram."""
        d, psu, mcu, sensor = _build_power_system_diagram()

        updated = diagram_data.update_block_statuses(d)
        statuses = {b["name"]: b["status"] for b in updated["blocks"]}
        # MCU has attrs + interfaces + cad link + ecad link → Verified
        assert statuses["MCU"] == "Verified"
        # PSU and Sensor have attrs + interfaces + cad link → Implemented
        assert statuses["PSU"] == "Implemented"
        assert statuses["Sensor"] == "Implemented"

    def test_power_budget_within_limits(self):
        """Power budget passes when supply exceeds consumption."""
        d, *_ = _build_power_system_diagram()
        # Supply: 500mA * 3.3V = 1650 mW
        # Consumption: 120mA * 3.3 + 30mA * 3.3 = 495 mW — within limits
        result = diagram_data.check_power_budget(d)
        assert result["success"] is True

    def test_power_budget_exceeds_limits(self):
        """Power budget fails when consumption > supply."""
        d, psu, *_ = _build_power_system_diagram()
        # Shrink supply drastically
        psu["attributes"]["output_current"] = "10mA"
        result = diagram_data.check_power_budget(d)
        assert result["success"] is False

    def test_logic_level_check_across_connection(self):
        """Logic levels are verified across a specific connection."""
        d, psu, mcu, sensor = _build_power_system_diagram()
        conn = d["connections"][1]  # MCU→Sensor
        result = diagram_data.check_logic_level_compatibility(conn, d)
        assert result["success"] is True

    def test_rule_checks_run_all(self):
        """run_all_rule_checks returns a list of results with no crashes."""
        d, *_ = _build_power_system_diagram()
        results = diagram_data.run_all_rule_checks(d)
        assert isinstance(results, list)
        assert len(results) >= 1
        for r in results:
            assert "rule" in r
            assert "success" in r

    def test_get_rule_failures_returns_only_failures(self):
        """get_rule_failures filters to only failed checks."""
        d, *_ = _build_power_system_diagram()
        failures = diagram_data.get_rule_failures(d)
        for f in failures:
            assert f["success"] is False

    def test_markdown_report_generation(self):
        """Markdown export includes block names and connection count."""
        d, *_ = _build_power_system_diagram()
        md = diagram_data.generate_markdown_report(d)
        assert "PSU" in md
        assert "MCU" in md
        assert "Sensor" in md

    def test_pin_map_csv_generation(self):
        """CSV pin map contains block names and connection data."""
        d, *_ = _build_power_system_diagram()
        csv_text = diagram_data.generate_pin_map_csv(d)
        assert "PSU" in csv_text
        assert "MCU" in csv_text
        assert "Signal" in csv_text  # header row

    def test_hierarchy_child_diagram(self):
        """A block with a child diagram reports correct hierarchical status."""
        d, _, mcu, _ = _build_power_system_diagram()
        child = diagram_data.create_child_diagram(mcu)
        assert diagram_data.has_child_diagram(mcu) is True
        assert child is not None
        # Hierarchical status aggregates child statuses
        status = diagram_data.compute_hierarchical_status(mcu)
        assert isinstance(status, str)

    def test_find_and_remove_block(self):
        """find_block_by_id + remove_block_from_diagram work together."""
        d, psu, *_ = _build_power_system_diagram()
        found = diagram_data.find_block_by_id(d, psu["id"])
        assert found is not None
        assert found["name"] == "PSU"

        removed = diagram_data.remove_block_from_diagram(d, psu["id"])
        assert removed is True
        assert diagram_data.find_block_by_id(d, psu["id"]) is None
        assert len(d["blocks"]) == 2


class TestCADIntegration:
    """Integration tests combining CAD linking with other subsystems."""

    def test_cad_link_validation_with_valid_diagram(self):
        """Validate CAD links across the whole diagram."""
        d, *_ = _build_power_system_diagram()
        all_valid, errors = diagram_data.validate_diagram_links(d)
        assert all_valid is True
        assert errors == []

    def test_cad_link_validation_with_bad_link(self):
        """Missing occToken triggers a link validation error."""
        d, psu, *_ = _build_power_system_diagram()
        psu["links"] = [{"target": "cad"}]  # missing occToken
        all_valid, errors = diagram_data.validate_diagram_links(d)
        assert all_valid is False
        assert any("PSU" in e for e in errors)


if __name__ == "__main__":
    pytest.main([__file__])
