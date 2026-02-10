"""Shared test fixtures and path configuration for the test suite.

This module centralizes path setup and reusable fixtures so that
individual test files do not need to manipulate sys.path themselves.
"""

import pathlib
import sys
from unittest.mock import MagicMock

import pytest

# ---------------------------------------------------------------------------
# Path setup — executed once when conftest.py is loaded by pytest
# ---------------------------------------------------------------------------
_repo_root = pathlib.Path(__file__).resolve().parent.parent
_src_path = _repo_root / "src"

# Ensure src/ is importable so that legacy `import diagram_data` works
if str(_src_path) not in sys.path:
    sys.path.insert(0, str(_src_path))

# Ensure repo root is importable for `from core import …`
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

# ---------------------------------------------------------------------------
# Mock adsk package for testing fusion_addin modules outside Fusion 360
# ---------------------------------------------------------------------------
_adsk_core_mock = MagicMock(name="adsk.core")
_adsk_fusion_mock = MagicMock(name="adsk.fusion")
_adsk_mock = MagicMock(name="adsk")
_adsk_mock.core = _adsk_core_mock
_adsk_mock.fusion = _adsk_fusion_mock

sys.modules["adsk"] = _adsk_mock
sys.modules["adsk.core"] = _adsk_core_mock
sys.modules["adsk.fusion"] = _adsk_fusion_mock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _schema_path() -> pathlib.Path:
    """Return the absolute path to docs/schema.json."""
    return _repo_root / "docs" / "schema.json"


# ---------------------------------------------------------------------------
# Fixtures — Core library
# ---------------------------------------------------------------------------
@pytest.fixture
def sample_graph():
    """Minimal valid Graph with two blocks and one connection."""
    from core.models import Block, Connection, Graph, Port, PortDirection

    block_a = Block(
        id="block_a",
        name="Sensor",
        block_type="electrical",
        x=100,
        y=100,
        ports=[
            Port(
                id="port_a_out",
                name="signal_out",
                direction=PortDirection.OUTPUT,
            ),
        ],
    )
    block_b = Block(
        id="block_b",
        name="Controller",
        block_type="software",
        x=300,
        y=100,
        ports=[
            Port(
                id="port_b_in",
                name="signal_in",
                direction=PortDirection.INPUT,
            ),
        ],
    )
    connection = Connection(
        id="conn_1",
        from_block_id="block_a",
        from_port_id="port_a_out",
        to_block_id="block_b",
        to_port_id="port_b_in",
    )
    return Graph(
        id="test_graph",
        name="Test Graph",
        blocks=[block_a, block_b],
        connections=[connection],
    )


@pytest.fixture
def empty_graph():
    """Empty graph with no blocks or connections."""
    from core.models import Graph

    return Graph(id="empty_graph", name="Empty")


# ---------------------------------------------------------------------------
# Fixtures — Legacy diagram format
# ---------------------------------------------------------------------------
@pytest.fixture
def sample_diagram():
    """Sample legacy-format diagram dict with two blocks and one connection."""
    import diagram_data

    diagram = diagram_data.create_empty_diagram()
    block1 = diagram_data.create_block(
        "Power Supply", 100, 100, "PowerSupply", "Verified"
    )
    iface1 = diagram_data.create_interface(
        "Power Output", "electrical", "output", "right", 0
    )
    block1["interfaces"].append(iface1)
    block1["links"] = [
        {"target": "cad", "occToken": "abc123", "docId": "doc1", "name": "PSU"},
        {"target": "ecad", "device": "LM3940", "footprint": "TO-220"},
    ]

    block2 = diagram_data.create_block(
        "Microcontroller", 300, 100, "Microcontroller", "Planned"
    )
    iface2 = diagram_data.create_interface(
        "Power Input", "electrical", "input", "left", 0
    )
    block2["interfaces"].append(iface2)

    diagram_data.add_block_to_diagram(diagram, block1)
    diagram_data.add_block_to_diagram(diagram, block2)

    conn = diagram_data.create_connection(
        block1["id"],
        block2["id"],
        "electrical",
        iface1["id"],
        iface2["id"],
    )
    diagram_data.add_connection_to_diagram(diagram, conn)

    return diagram


@pytest.fixture
def schema_path():
    """Absolute path to the JSON schema file."""
    return _schema_path()


@pytest.fixture
def repo_root():
    """Absolute path to the repository root."""
    return _repo_root
