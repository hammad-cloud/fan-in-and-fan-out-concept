"""Run the CoreCommerce scraper against a local fixture server (or a live base URL)."""

from __future__ import annotations

import argparse
import asyncio
import json

from app.scrapers.stores.corecommerce import CoreCommerceScraper


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8765",
        help="CoreCommerce storefront base URL (default: local fixture server)",
    )
    parser.add_argument("--query", default="boss")
    parser.add_argument("--max-items", type=int, default=5)
    args = parser.parse_args()

    scraper = CoreCommerceScraper(
        base_url=args.base_url,
        query=args.query,
        max_items=args.max_items,
    )
    result = await scraper.run()
    payload = result.model_dump(mode="json")
    print(json.dumps(payload, indent=2))
    raise SystemExit(0 if result.success else 1)


if __name__ == "__main__":
    asyncio.run(main())
