"""Serve CoreCommerce HTML fixtures locally for scraper smoke tests."""

from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

FIXTURES = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "corecommerce"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        print(f"[fixture-server] {self.address_string()} - {format % args}")

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        if parsed.path == "/cart.php" and qs.get("m", [""])[0] == "search_results":
            body = (FIXTURES / "search_results.html").read_bytes()
        elif parsed.path.endswith(".html") and "-p" in parsed.path:
            body = (FIXTURES / "product_detail.html").read_bytes()
        elif parsed.path in {"/", "/health"}:
            body = b"ok"
        else:
            self.send_error(404, "Not Found")
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"CoreCommerce fixture server on http://{args.host}:{args.port}")
    print("Search: /cart.php?m=search_results&headerSearch=Y&search=boss")
    server.serve_forever()


if __name__ == "__main__":
    main()
