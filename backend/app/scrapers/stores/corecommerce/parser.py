"""HTML parsers for CoreCommerce public product and listing pages."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from app.scrapers.exceptions import ScraperParseError
from app.scrapers.results import ScrapedAvailability, ScrapedItem

_PRODUCT_ID_RE = re.compile(r"-p(\d+)\.html(?:$|\?)", re.IGNORECASE)
_MONEY_RE = re.compile(r"([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)")


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = " ".join(value.split()).strip()
    return text or None


def _parse_money(raw: str | None) -> Decimal | None:
    if not raw:
        return None
    match = _MONEY_RE.search(raw.replace("\xa0", " "))
    if not match:
        return None
    try:
        return Decimal(match.group(1).replace(",", ""))
    except InvalidOperation:
        return None


def _availability_from_schema(href: str | None, fallback_text: str | None = None) -> ScrapedAvailability:
    token = (href or "").lower()
    text = (fallback_text or "").lower()
    if "outofstock" in token or "out of stock" in text:
        return ScrapedAvailability.OUT_OF_STOCK
    if "instock" in token or "in stock" in text:
        return ScrapedAvailability.IN_STOCK
    if "out of stock" in text:
        return ScrapedAvailability.OUT_OF_STOCK
    return ScrapedAvailability.UNKNOWN


def extract_product_id(url: str, soup: BeautifulSoup | None = None) -> str | None:
    if soup is not None:
        node = soup.select_one("form[name=productForm] input[name=productID], input[name=productID]")
        if node and node.get("value"):
            return str(node["value"]).strip()
    match = _PRODUCT_ID_RE.search(url)
    return match.group(1) if match else None


def parse_product_detail(html: str, *, page_url: str) -> ScrapedItem:
    """Parse a CoreCommerce product detail page (`#productDetail`)."""
    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one("#productDetail")
    if root is None:
        raise ScraperParseError(
            "CoreCommerce product detail marker #productDetail not found",
            store_slug="corecommerce",
        )

    title_el = root.select_one("h2[itemprop=name]")
    title = _clean_text(title_el.get_text(" ", strip=True) if title_el else None)
    if not title:
        raise ScraperParseError("Product title missing", store_slug="corecommerce")

    url_meta = root.select_one("meta[itemprop=url]")
    product_url = (url_meta.get("content") if url_meta else None) or page_url

    image_meta = root.select_one("meta[itemprop=image]")
    image_url = image_meta.get("content") if image_meta else None

    price_meta = root.select_one("#extraDetails meta[itemprop=price], meta[itemprop=price]")
    price_text = price_meta.get("content") if price_meta else None
    if not price_text:
        price_node = root.select_one("#price, .item-price--product")
        price_text = price_node.get_text(" ", strip=True) if price_node else None
    price = _parse_money(price_text)
    if price is None:
        raise ScraperParseError("Product price missing or invalid", store_slug="corecommerce")

    currency_meta = root.select_one(
        "#extraDetails meta[itemprop=priceCurrency], meta[itemprop=priceCurrency]"
    )
    currency = (currency_meta.get("content") if currency_meta else None) or "USD"

    brand_el = root.select_one("[itemprop=brand] meta[itemprop=name], [itemprop=brand] [itemprop=name]")
    brand = None
    if brand_el is not None:
        brand = _clean_text(brand_el.get("content") or brand_el.get_text(" ", strip=True))

    availability_el = root.select_one("link[itemprop=availability]")
    availability = _availability_from_schema(
        availability_el.get("href") if availability_el else None,
        fallback_text=_clean_text(root.select_one("#price") and root.select_one("#price").get_text()),
    )

    crumbs = [
        _clean_text(a.get_text(" ", strip=True))
        for a in soup.select(".breadcrumb a, #breadcrumbs a, .breadcrumbs a")
    ]
    crumbs = [c for c in crumbs if c]
    category = crumbs[-1] if crumbs else None

    sku = extract_product_id(product_url, soup)

    return ScrapedItem(
        title=title,
        price=price,
        currency=currency,
        url=product_url,
        image_url=image_url,
        brand=brand,
        category=category,
        sku=sku,
        availability=availability,
        raw={
            "source": "product_detail",
            "product_id": sku,
        },
    )


def parse_listing_page(html: str, *, base_url: str) -> list[ScrapedItem]:
    """Parse CoreCommerce product grids (search results / category listings)."""
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(".grid--product .grid__item, .grid__item")
    items: list[ScrapedItem] = []

    for card in cards:
        if not isinstance(card, Tag):
            continue
        link = card.select_one(".item-name--product a, a.thumb, a.btn--details")
        if link is None or not link.get("href"):
            continue

        href = urljoin(base_url.rstrip("/") + "/", link["href"])
        title = _clean_text(link.get_text(" ", strip=True))
        if not title or title.lower() == "details":
            name_link = card.select_one(".item-name--product a")
            title = _clean_text(name_link.get_text(" ", strip=True) if name_link else None)
        if not title:
            continue

        price_node = card.select_one(".item-price--product")
        price_text = _clean_text(price_node.get_text(" ", strip=True) if price_node else None)
        availability = ScrapedAvailability.UNKNOWN
        if price_text and "out of stock" in price_text.lower():
            availability = ScrapedAvailability.OUT_OF_STOCK
            price = Decimal("0")
        else:
            price = _parse_money(price_text)
            if price is None:
                continue
            availability = ScrapedAvailability.IN_STOCK

        img = card.select_one("img")
        image_url = img.get("src") if img and img.get("src") else None
        if image_url:
            image_url = urljoin(base_url.rstrip("/") + "/", image_url)

        sku = extract_product_id(href)
        brand = title.split(" ", 1)[0] if title else None

        items.append(
            ScrapedItem(
                title=title,
                price=price,
                currency="USD",
                url=href,
                image_url=image_url,
                brand=brand,
                category=None,
                sku=sku,
                availability=availability,
                raw={"source": "listing", "product_id": sku},
            )
        )

    return items
