"""Tests for JSON schema validity."""

import json
import pathlib

import jsonschema


_SCHEMA_PATH = pathlib.Path(__file__).resolve().parent.parent / "docs" / "schema.json"


def test_schema_is_valid_json_schema():
    """Verify that docs/schema.json is a valid JSON Schema draft-7."""
    with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    jsonschema.Draft7Validator.check_schema(schema)


def test_valid_diagram_conforms_to_schema():
    """A minimal valid diagram should pass schema validation."""
    import diagram_data

    with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)

    diagram = diagram_data.create_empty_diagram()
    block = diagram_data.create_block("Test Block", 0, 0)
    diagram_data.add_block_to_diagram(diagram, block)

    jsonschema.validate(diagram, schema)


def test_invalid_diagram_rejected_by_schema():
    """A diagram missing required fields should fail schema validation."""
    with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)

    invalid = {"blocks": "not-a-list"}

    import jsonschema as js
    with __import__('pytest').raises(js.ValidationError):
        jsonschema.validate(invalid, schema)
