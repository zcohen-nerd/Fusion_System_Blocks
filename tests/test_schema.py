import json, os
import jsonschema

def test_schema_is_valid_json_schema():
    schema_file = os.path.join("docs", "schema.json")
    with open(schema_file, "r", encoding="utf-8") as f:
        schema = json.load(f)
    jsonschema.Draft7Validator.check_schema(schema)
