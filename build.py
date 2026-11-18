#!/usr/bin/env python3
"""Render the Alfredo site from src/templates into the repository root.

GitHub Pages serves the rendered files at the root, so the output is committed
alongside the templates. .github/workflows/build-check.yml re-runs this with
--check on every push and fails if the two have drifted apart.

Three kinds of file come out of here:

  the pages          rendered from src/templates by Jinja
  the structured     built as Python dicts from the same YAML the pages
  data               read, then handed to the shell as JSON text
  the machine files  robots.txt, sitemap.xml and llms.txt, written through
                     the same path so --check guards them too

Nothing below is generated from the clock or the filesystem, so two runs of
this script on the same source produce the same bytes.

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


# --------------------------------------------------------------- the numbers

def resolve_faq(data):
    """Fill the braces in the FAQ answers from the one place each number lives.

    A price is written once, in pages.yaml, and the count of open founding
    places once, in site.yaml. The answers reference them rather than
    repeating them, so a price change cannot leave a stale number in an
    answer. An unfilled or unknown brace is a build failure, not a typo
    that ships.
    """
    pricing = data["pages"]["pricing"]
    tiers = {t["name"].lower(): t["price"] for t in pricing["tiers"]}
    fill = {
        "{counter}": tiers["counter"],
        "{house}": tiers["house"],
        "{group}": tiers["group"],
        "{unit}": pricing["price_unit"],
        "{spots}": str(data["site"]["founding_spots_open"]),
    }
    for entry in data["faq"]["entries"]:
        text = entry["a"]
        for token, value in fill.items():
            text = text.replace(token, value)
        if "{" in text or "}" in text:
            raise SystemExit(
                "faq.yaml: an answer still has a brace in it after"
                f" substitution, so a token is misspelt:\n  {text}"
            )
        entry["a"] = text


def amount(price):
    """'$99' as the number schema.org wants: 99."""
    return price.replace("$", "").replace(",", "").strip()


# The story order, which is the order a reader meets the pages in and the
# order both machine files list them in. The questions page is not part of
# the story, so it comes last.
STORY = ["index", "product", "honesty", "pilot", "pricing", "faq"]


def in_story_order(site):
    by_key = {p["key"]: p for p in site["pages"]}
    missing = set(by_key) ^ set(STORY)
    if missing:
        raise SystemExit(f"build.py: STORY and site.yaml pages disagree: {sorted(missing)}")
    return [by_key[k] for k in STORY]


def page_url(site, page):
    """The absolute address of a page. The home page is the bare domain."""
    base = site["site_url"].rstrip("/")
    return base + "/" if page["output"] == "index.html" else f"{base}/{page['output']}"


# -------------------------------------------------------- the structured data

def ld(obj):
    """A dict as the text that goes inside a ld+json script element.

    Escaping < means the string "</script>" can never appear in the output,
    whatever a future answer contains, so the element cannot be closed early.
    """
    return json.dumps(obj, ensure_ascii=False, indent=2).replace("<", "\\u003c")


def organization_ld(site):
    base = site["site_url"].rstrip("/")
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": site["brand_name"],
        "alternateName": "BakingInsightsAI",
        "url": base + "/",
        "logo": base + "/alfredo_logo_cream.svg",
        "email": site["contact"]["email"],
        "contactPoint": [{
            "@type": "ContactPoint",
            "contactType": "sales",
            "email": site["contact"]["email"],
            "availableLanguage": "English",
        }],
        "sameAs": [
            site["contact"]["instagram_href"],
            site["contact"]["facebook_href"],
        ],
    }


def software_ld(site, pricing, pricing_url):
    """The product itself, with the three plans as offers.

    No aggregateRating, no review and no customer count: the site does not
    publish any of those, and structured data is not the place to start.
    """
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": site["brand_name"],
        "alternateName": "Alfredo",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "url": site["site_url"].rstrip("/") + "/",
        "description": site["plain_sentence"],
        "publisher": {
            "@type": "Organization",
            "name": site["brand_name"],
            "url": site["site_url"].rstrip("/") + "/",
        },
        "offers": [
            {
                "@type": "Offer",
                "name": tier["name"],
                "description": tier["who"],
                "price": amount(tier["price"]),
                "priceCurrency": "USD",
                "url": pricing_url,
                "availability": "https://schema.org/InStock",
                "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "price": amount(tier["price"]),
                    "priceCurrency": "USD",
                    "referenceQuantity": {
                        "@type": "QuantitativeValue",
                        "value": 1,
                        "unitCode": "MON",
                    },
                },
            }
            for tier in pricing["tiers"]
        ],
    }


def faq_ld(faq):
    """The same questions and answers the page shows, from the same list."""
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": entry["q"],
                "acceptedAnswer": {"@type": "Answer", "text": entry["a"]},
            }
            for entry in faq["entries"]
        ],
    }


def blocks_for(key, data, page):
    """Which structured data each page carries.

    Organization everywhere, because every page should identify who is
    speaking. The product and its prices on the three pages that describe
    them. The questions only where the questions actually are.
    """
    site = data["site"]
    out = [organization_ld(site)]
    if key in ("index", "product", "pricing"):
        pricing_page = next(p for p in site["pages"] if p["key"] == "pricing")
        out.append(software_ld(site, data["pages"]["pricing"], page_url(site, pricing_page)))
    if key == "faq":
        out.append(faq_ld(data["faq"]))
    return [ld(b) for b in out]


# ----------------------------------------------------------- the machine files

def robots_txt(site):
    """Staging stays shut. Production opens, and points at the sitemap."""
    if site.get("staging"):
        return "User-agent: *\nDisallow: /\n"
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        f"Sitemap: {site['site_url'].rstrip('/')}/sitemap.xml\n"
    )


def sitemap_xml(site):
    """The six pages a reader can land on.

    The redirect stubs are left out on purpose: board.html, menu.html and
    intel.html exist so old links keep working, and listing a redirect in a
    sitemap asks a crawler to index a page that is not there. No lastmod,
    because a date from the clock would make this file drift on its own and
    the --check run would fail tomorrow for no reason.
    """
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for page in in_story_order(site):
        lines.append("  <url>")
        lines.append(f"    <loc>{page_url(site, page)}</loc>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def llms_txt(data):
    """A short plain reading of the site, for a model that wants the gist.

    Same sentence, same prices, same pages as everything else here.
    """
    site = data["site"]
    pricing = data["pages"]["pricing"]
    blurb = {
        "index": "The opening: what Alfredo is, and a week of suggestions as an owner would see them.",
        "product": "What it does: how a suggestion is put together, and what comes back after you try one.",
        "honesty": "Why you can trust the numbers: what Alfredo will and will not say about a result.",
        "pricing": "Pricing: the three plans, what is in each, and the founding offer.",
        "pilot": "About us: why Alfredo exists and where it is today.",
        "faq": "Questions and answers about Alfredo, in short.",
    }
    out = [
        f"# {site['brand_name']}",
        "",
        f"> {site['plain_sentence']}",
        "",
        "Alfredo is for restaurants, bars, breweries, cafes and bakeries that ring",
        "their sales through a POS. It reads your sales data and gives the owner a",
        "short weekly list of changes worth trying. You decide what to try. Alfredo",
        "then reports whether it worked, did nothing, or backfired. It recommends and",
        "you decide: nothing on your menu or your prices moves on its own.",
        "",
        "Toast and Clover are connected today. Other POS systems on request.",
        "",
        "## Pages",
        "",
    ]
    for page in in_story_order(site):
        key = page["key"]
        out.append(f"- [{page['title'].split(' | ')[0]}]({page_url(site, page)}): {blurb[key]}")
    out += [
        "",
        "## Pricing",
        "",
    ]
    for tier in pricing["tiers"]:
        out.append(f"- {tier['name']}: {tier['price']} {pricing['price_unit']}. {tier['who']}.")
    out += [
        "",
        "One price for the whole business, not per location and not per user. No setup",
        "fee, month to month. More than ten locations is arranged directly.",
        f"The first 10 businesses get everything free for six months,"
        f" and {site['founding_spots_open']} of 10 spots are still open.",
        "",
        "## Contact",
        "",
        f"- Email: {site['contact']['email']}",
        f"- Instagram: {site['contact']['instagram_href']}",
        f"- Facebook: {site['contact']['facebook_href']}",
        f"- Request a demo: {site['site_url'].rstrip('/')}/{site['cta']['href']}",
        "",
        "## Notes",
        "",
        "Every example on the site is labeled as an illustrative example.",
        site["image_disclosure"],
        "",
    ]
    return "\n".join(out)


# --------------------------------------------------------------- the rendering

def render_all(data):
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        trim_blocks=False,
        lstrip_blocks=False,
    )
    site = data["site"]
    rendered = {}
    for page in site["pages"]:
        template = env.get_template(page["template"])
        rendered[page["output"]] = template.render(
            page=page,
            canonical=page_url(site, page),
            jsonld=blocks_for(page["key"], data, page),
            **data,
        )
    rendered["robots.txt"] = robots_txt(site)
    rendered["sitemap.xml"] = sitemap_xml(site)
    rendered["llms.txt"] = llms_txt(data)
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
    resolve_faq(data)
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
