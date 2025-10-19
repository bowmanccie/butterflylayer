# /devserver.py
from pathlib import Path
from flask import Flask, send_from_directory, send_file, abort

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
PAGES = SITE / "pages"
ASSETS = SITE / "assets"
PARTIALS = SITE / "partials"
PODCAST = SITE / "podcast"

app = Flask(__name__, static_folder=None)

def _serve_index_for(directory: Path):
    index = directory / "index.html"
    if index.exists():
        return send_file(index)
    abort(404)

@app.route("/")
def home():
    # domain root → site/pages/index.html
    return send_file(PAGES / "index.html")

# Serve /pages/... with directory index support
@app.route("/pages/")
def pages_root():
    return send_file(PAGES / "index.html")

@app.route("/pages/<path:subpath>")
def pages_any(subpath):
    target = (PAGES / subpath).resolve()
    # Security: ensure path stays inside PAGES
    if not str(target).startswith(str(PAGES)):
        abort(404)
    if target.is_dir():
        return _serve_index_for(target)
    if target.suffix.lower() == ".html" and target.exists():
        return send_file(target)
    # If someone hits /pages/about (no trailing slash), try directory index
    if (target.with_suffix("")).is_dir():
        return _serve_index_for(target.with_suffix(""))
    abort(404)

# Static mounts that match your current absolute URLs
@app.route("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(ASSETS, filename)

@app.route("/site/partials/<path:filename>")
def partials(filename):
    return send_from_directory(PARTIALS, filename)

@app.route("/site/podcast/<path:filename>")
def podcast(filename):
    return send_from_directory(PODCAST, filename)

# Robots & sitemap
@app.route("/robots.txt")
def robots():
    return send_file(SITE / "robots.txt")

@app.route("/sitemap.xml")
def sitemap():
    return send_file(SITE / "sitemap.xml")

if __name__ == "__main__":
    # Run on http://127.0.0.1:5173 to feel “Vite-like”
    app.run(host="127.0.0.1", port=5173, debug=True)
