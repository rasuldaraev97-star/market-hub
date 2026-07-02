from flask import Flask, render_template, request, jsonify, send_from_directory
import json
from pathlib import Path
import re
from datetime import datetime

app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
PRODUCTS_PATH = BASE_DIR / "data" / "products.json"
VENDORS_PATH = BASE_DIR / "data" / "vendors.json"
UPLOAD_FOLDER = BASE_DIR / "static" / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)

with PRODUCTS_PATH.open(encoding="utf-8") as handle:
    products = json.load(handle)

# Initialize vendors data
if not VENDORS_PATH.exists():
    VENDORS_PATH.write_text(json.dumps([], ensure_ascii=False, indent=2), encoding="utf-8")

with VENDORS_PATH.open(encoding="utf-8") as handle:
    vendors = json.load(handle)

# Content moderation blocklist
BLOCKLIST = ["спам", "мошенник", "подделка", "фейк", "запрещено", "контрафакт", "поддельный", "левый"]


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def check_content_moderation(text: str) -> dict:
    """Check if text contains forbidden words."""
    text_lower = text.lower()
    found_violations = [word for word in BLOCKLIST if word in text_lower]
    return {"approved": len(found_violations) == 0, "violations": found_violations}


def calculate_payment_split(price: int, commission_rate: float = 0.15, tax_rate: float = 0.18):
    """Calculate payment split: seller, commission, tax."""
    tax = int(price * tax_rate)
    commission = int(price * commission_rate)
    seller_amount = price - tax - commission
    return {
        "total": price,
        "seller": seller_amount,
        "commission": commission,
        "tax": tax,
    }


def resolve_product_image(product: dict) -> str:
    name_tokens = [normalize_text(product.get("name", "")), normalize_text(product.get("category", "")), normalize_text(product.get("badge", ""))]
    for file_path in sorted(UPLOAD_FOLDER.glob("*")):
        if not file_path.is_file():
            continue
        filename_tokens = normalize_text(file_path.stem)
        if any(token and token in filename_tokens for token in name_tokens):
            return f"/uploads/{file_path.name}"

    existing = (product.get("image") or "").strip()
    return existing if existing else ""


def enrich_products(items):
    enriched = []
    for product in items:
        item = dict(product)
        item["image"] = resolve_product_image(item)
        enriched.append(item)
    return enriched


def get_products(query: str = "", category: str = "", price_min: int = 0, price_max: int = 999999, rating_min: float = 0):
    """Advanced filtering with multiple parameters."""
    q = query.strip().lower()
    filtered = [
        product
        for product in products
        if (not q or q in product["name"].lower() or q in product["category"].lower() or q in product["description"].lower())
        and (not category or category == product["category"])
        and (price_min <= product["price"] <= price_max)
        and (product.get("rating", 4.5) >= rating_min)
    ]
    return enrich_products(filtered)


@app.route("/")
def index():
    return render_template("index.html", products=enrich_products(products[:6]), query="")


@app.route("/catalog")
def catalog():
    query = request.args.get("q", "").strip()
    category = request.args.get("category", "")
    price_min = int(request.args.get("price_min", 0) or 0)
    price_max = int(request.args.get("price_max", 999999) or 999999)
    rating_min = float(request.args.get("rating_min", 0) or 0)
    
    filtered_products = get_products(query, category, price_min, price_max, rating_min)
    categories = sorted(set(p["category"] for p in products))
    
    return render_template(
        "catalog.html",
        products=filtered_products,
        query=query,
        categories=categories,
        selected_category=category,
        price_min=price_min,
        price_max=price_max,
        rating_min=rating_min
    )


@app.route("/product/<int:product_id>")
def product_detail(product_id):
    product = next((item for item in products if item.get("id") == product_id), None)
    if not product:
        return render_template("404.html", message="Товар не найден"), 404
    return render_template("product.html", product=enrich_products([product])[0], query="")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/project")
def project():
    return render_template("project.html")


@app.route("/reviews")
def reviews():
    return render_template("reviews.html")


@app.route("/orders")
def orders():
    return render_template("orders.html")


@app.route("/deals")
def deals():
    return render_template("deals.html")


@app.route("/help")
def help():
    return render_template("help.html")


@app.route("/recommendations")
def recommendations():
    return render_template("recommendations.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


@app.route("/cart")
def cart():
    return render_template("cart.html")


@app.route("/favorites")
def favorites():
    return render_template("favorites.html", products=[], query="")


@app.route("/vendor-portal")
def vendor_portal():
    return render_template("vendor_portal.html", vendors=vendors)


@app.route("/api/products")
def api_products():
    query = request.args.get("q", "").strip()
    category = request.args.get("category", "")
    price_min = int(request.args.get("price_min", 0) or 0)
    price_max = int(request.args.get("price_max", 999999) or 999999)
    rating_min = float(request.args.get("rating_min", 0) or 0)
    return jsonify(get_products(query, category, price_min, price_max, rating_min))


@app.route("/api/vendor-stats")
def api_vendor_stats():
    """Get vendor statistics and payment info."""
    stats = {
        "total_vendors": len(vendors),
        "active_listings": sum(len(v.get("products", [])) for v in vendors),
        "total_revenue": sum(v.get("total_earnings", 0) for v in vendors),
    }
    return jsonify(stats)


@app.route("/api/payment-split", methods=["POST"])
def api_payment_split():
    """Calculate payment split for a purchase."""
    data = request.get_json() or {}
    amount = int(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
    
    split = calculate_payment_split(amount)
    return jsonify({"success": True, "split": split})


@app.route("/api/check-content", methods=["POST"])
def api_check_content():
    """Check if product content passes moderation."""
    data = request.get_json() or {}
    name = data.get("name", "")
    description = data.get("description", "")
    
    name_check = check_content_moderation(name)
    desc_check = check_content_moderation(description)
    
    approved = name_check["approved"] and desc_check["approved"]
    violations = name_check["violations"] + desc_check["violations"]
    
    return jsonify({"approved": approved, "violations": violations})


@app.route("/api/add_product", methods=["POST"])
def api_add_product():
    payload = request.form.to_dict()
    photo_files = request.files.getlist("photos")
    video_files = request.files.getlist("videos")

    # Check moderation
    moderation = check_content_moderation(payload.get("name", ""))
    if not moderation["approved"]:
        return jsonify({
            "success": False,
            "error": f"Контент не прошёл проверку. Запрещенные слова: {', '.join(moderation['violations'])}"
        }), 400

    if not payload:
        return jsonify({"success": False, "error": "Нет данных"}), 400

    required_fields = ["name", "price", "category"]
    if not all(payload.get(field) for field in required_fields):
        return jsonify({"success": False, "error": "Заполните обязательные поля"}), 400

    # Process main image (from URL or first uploaded photo)
    image_url = payload.get("image", "").strip()
    if not image_url and photo_files and photo_files[0].filename:
        first_photo = photo_files[0]
        filename = f"product_{max((product.get('id', 0) for product in products), default=0) + 1}_main_{first_photo.filename}".replace(" ", "_")
        image_path = Path(app.config["UPLOAD_FOLDER"]) / filename
        first_photo.save(image_path)
        image_url = f"/uploads/{filename}"

    # Process all photos
    photos = []
    for idx, photo_file in enumerate(photo_files):
        if photo_file and photo_file.filename:
            product_id = max((product.get('id', 0) for product in products), default=0) + 1
            filename = f"product_{product_id}_photo_{idx}_{photo_file.filename}".replace(" ", "_")
            image_path = Path(app.config["UPLOAD_FOLDER"]) / filename
            photo_file.save(image_path)
            photos.append(f"/uploads/{filename}")

    # Process all videos
    videos = []
    for idx, video_file in enumerate(video_files):
        if video_file and video_file.filename:
            product_id = max((product.get('id', 0) for product in products), default=0) + 1
            filename = f"product_{product_id}_video_{idx}_{video_file.filename}".replace(" ", "_")
            video_path = Path(app.config["UPLOAD_FOLDER"]) / filename
            video_file.save(video_path)
            videos.append(f"/uploads/{filename}")

    new_id = max((product.get("id", 0) for product in products), default=0) + 1
    new_product = {
        "id": new_id,
        "name": payload["name"].strip(),
        "price": int(payload["price"]),
        "old_price": int(payload.get("old_price")) if payload.get("old_price") else None,
        "category": payload["category"].strip(),
        "description": payload.get("description", "").strip(),
        "delivery": payload.get("delivery", "Завтра").strip(),
        "rating": 4.8,
        "reviews_count": 0,
        "stock": "В наличии",
        "badge": payload.get("badge", "Новинка").strip(),
        "image": image_url or "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=700&q=80",
        "photos": photos,
        "videos": videos,
        "vendor_id": payload.get("vendor_id", "unknown"),
        "created_at": datetime.now().isoformat(),
    }

    products.append(new_product)
    try:
        with PRODUCTS_PATH.open("w", encoding="utf-8") as handle:
            json.dump(products, handle, ensure_ascii=False, indent=2)
    except OSError:
        pass

    return jsonify({"success": True, "product": new_product})


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
