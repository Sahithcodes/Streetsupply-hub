from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector # This is the mysql-connector-python library
from mysql.connector import Error
import os
import json
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None

# Use values from .env even if the shell already has stale variables.
load_dotenv(override=True)

app = Flask(__name__)
CORS(app)

client = None
if genai and os.getenv("GEMINI_API_KEY"):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _masked_key(key: str) -> str:
    if not key:
        return "missing"
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}...{key[-4:]}"


print(
    "[chatbot] Gemini configured:",
    "yes" if client else "no",
    "| model:",
    os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
    "| key:",
    _masked_key(os.getenv("GEMINI_API_KEY", "")),
)

def get_db_connection():
    """Returns a MySQL connection object."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_DATABASE", "ProjectX"),
    )

def get_latest_market_data():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Fetch Users
        cursor.execute("""
            SELECT id, full_name, business_name, role, created_at 
            FROM users ORDER BY id DESC LIMIT 25
        """)
        users = cursor.fetchall()

        # 2. Fetch Products
        cursor.execute("""
            SELECT p.id, p.name, p.price, p.unit, p.moq, p.category, u.business_name AS supplier_name
            FROM products p
            JOIN users u ON p.supplier_id = u.id
            ORDER BY p.id DESC LIMIT 100
        """)
        products = cursor.fetchall()

        # 3. Fetch Orders
        cursor.execute("""
            SELECT o.id, o.order_date, o.status, o.total_amount, u.business_name AS vendor_name
            FROM orders o
            JOIN users u ON o.vendor_id = u.id
            ORDER BY o.id DESC LIMIT 50
        """)
        orders = cursor.fetchall()

        return {"users": users, "products": products, "orders": orders}

    except Error as exc:
        print(f"MySQL Error: {exc}")
        return {"users": [], "products": [], "orders": []}
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

def handle_request(user_input: str):
    market_data = get_latest_market_data()

    if not client:
        return (
            "AI model is not configured. Set GEMINI_API_KEY. "
            f"Snapshot: {len(market_data['products'])} products available."
        )

    system_prompt = f"""
    You are an AI assistant for a B2B grocery marketplace.
    Use this database snapshot as source-of-truth. 
    Keep responses concise and plain text.

    DATABASE SNAPSHOT:
    {json.dumps(market_data, indent=2, default=str)}
    """

    try:
        # Default model can be overridden via GEMINI_MODEL.
        model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
        response = client.models.generate_content(
            model=model_name,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
            contents=user_input,
        )
        return response.text or "No response returned."
    except Exception as exc:
        err_text = str(exc)
        if "RESOURCE_EXHAUSTED" in err_text or "quota" in err_text.lower():
            return (
                "Model quota exceeded (HTTP 429). "
                "This usually means your Google project has no usable Gemini quota for this model "
                "(often free-tier quota = 0), or billing/tier is not enabled. "
                "Check Google AI Studio/GCP quotas for this exact project and model."
            )
        return f"Model error: {err_text}"

@app.route("/chat", methods=["POST"])
def chat():
    payload = request.get_json(silent=True) or {}
    user_msg = str(payload.get("message", "")).strip()
    if not user_msg:
        return jsonify({"reply": "Please enter a message."}), 400
    return jsonify({"reply": handle_request(user_msg)})

if __name__ == "__main__":
    port = int(os.getenv("CHATBOT_PORT", "5001"))
    app.run(host="0.0.0.0", port=port)
