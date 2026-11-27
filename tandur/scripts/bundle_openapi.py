#!/usr/bin/env python3
import glob
import json
import os
import yaml

def bundle():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    openapi_path = os.path.join(base_dir, 'contract', 'openapi', 'openapi.yaml')
    schemas_dir = os.path.join(base_dir, 'contract', 'openapi', 'schemas')
    out_dir = os.path.join(base_dir, 'apps', 'api', 'internal', 'adapter', 'http', 'docs')

    with open(openapi_path, 'r', encoding='utf-8') as f:
        doc = yaml.safe_load(f)

    schemas = {}
    for sf in sorted(glob.glob(os.path.join(schemas_dir, '*.yaml'))):
        with open(sf, 'r', encoding='utf-8') as f:
            sdata = yaml.safe_load(f)
            if sdata:
                schemas.update(sdata)

    def replace_refs(obj):
        if isinstance(obj, dict):
            new_dict = {}
            for k, v in obj.items():
                if k == '$ref' and isinstance(v, str):
                    schema_name = v.split('/')[-1]
                    new_dict[k] = f"#/components/schemas/{schema_name}"
                else:
                    new_dict[k] = replace_refs(v)
            return new_dict
        elif isinstance(obj, list):
            return [replace_refs(elem) for elem in obj]
        else:
            return obj

    doc = replace_refs(doc)
    schemas = replace_refs(schemas)

    if 'components' not in doc:
        doc['components'] = {}
    if 'schemas' not in doc['components']:
        doc['components']['schemas'] = {}

    doc['components']['schemas'].update(schemas)

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, 'openapi.json'), 'w', encoding='utf-8') as f:
        json.dump(doc, f, indent=2)

    with open(os.path.join(out_dir, 'openapi.yaml'), 'w', encoding='utf-8') as f:
        yaml.dump(doc, f, sort_keys=False)

    print(f"OpenAPI bundled successfully with {len(doc['components']['schemas'])} schemas.")

if __name__ == '__main__':
    bundle()
