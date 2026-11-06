#!/usr/bin/env python3
"""Render the Alfredo site from src/templates into the repository root.

GitHub Pages serves the rendered files at the root, so the output is committed
alongside the templates. .github/workflows/build-check.yml re-runs this with
--check on every push and fails if the two have drifted apart.

Dependencies: jinja2, pyyaml. No bundler, no npm.
"""
import argparse
import json
import pathlib
import sys

try:
    import yaml
except ImportError:
    sys.exit("pyyaml is required: pip install pyyaml")
try:
    from jinja2 import Environment, FileSystemLoader, StrictUndefined
except ImportError:
    sys.exit("jinja2 is required: pip install jinja2")

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
TEMPLATES = SRC / "templates"
DATA = SRC / "data"


def load_data():
    """Every .yaml in src/data becomes a top level variable named after the file."""
    data = {}
    for path in sorted(DATA.glob("*.yaml")):
        with path.open(encoding="utf-8") as fh:
            data[path.stem] = yaml.safe_load(fh) or {}
    return data


def render_all(data):
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        trim_blocks=False,
        lstrip_blocks=False,
    )
    pages = data["site"]["pages"]
    rendered = {}
    for page in pages:
        template = env.get_template(page["template"])
        rendered[page["output"]] = template.render(page=page, **data)
    return rendered


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--check",
        action="store_true",
        help="do not write; exit non zero if the committed output differs",
    )
    args = ap.parse_args()

    data = load_data()
    rendered = render_all(data)

    drifted = []
    for name, text in sorted(rendered.items()):
        target = ROOT / name
        current = target.read_text(encoding="utf-8") if target.exists() else None
        if current == text:
            status = "unchanged"
        elif args.check:
            status = "DRIFTED"
            drifted.append(name)
        else:
            target.write_text(text, encoding="utf-8")
            status = "written"
        print(f"  {name:<16} {len(text):>7} bytes  {status}")

    if args.check and drifted:
        print()
        print("Rendered output does not match the committed files:")
        for name in drifted:
            print(f"  - {name}")
        print()
        print("Run `python3 build.py` and commit the result.")
        return 1
    if args.check:
        print("\nTemplates and committed output are in sync.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
