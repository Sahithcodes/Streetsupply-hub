# StreetSupply Hub

A B2B grocery marketplace web app for suppliers and vendors. It supports OTP-based login, a vendor marketplace with search and trends, supplier inventory management, bargaining, group orders, and support/chat.

# Features

Vendor marketplace with product search, category filtering, and price trends.

Supplier dashboard for inventory management, bargains, and customer insights.

OTP-based registration and login for vendors and suppliers to ensure secure and fast access.

Bargaining flows for real-time price negotiations on bulk orders.

Group orders to aggregate demand and unlock supplier discounts.

Support/chat interface powered by an AI-integrated backend.

# Tech Stack

Frontend: HTML, CSS, JavaScript (vanilla)

Backend: Node.js (Express) + MySQL

AI Chat Service: Flask (Python) + Gemini API

#Project Structure

index.html - Main UI

style.css - Styling

script.js - Frontend behavior

server.js - Express API server

app1.py - AI chat backend

data.sql - Database schema and seed data

requirements.txt - Python dependencies

package.json - Node.js dependencies

# Prerequisites

Node.js 18+

MySQL 8+

Python 3.10+ (for the chat service)

# Setup

-Install dependencies

For the main server: npm install

For the chat service (using a virtual environment):

python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
pip install -r requirements.txt


# Configure environment variables
Create a .env file in the project root:

- DB_HOST=localhost
- DB_USER=root
- DB_PASSWORD=your_password
- DB_DATABASE=ProjectX
- CHATBOT_BACKEND_URL=[http://127.0.0.1:5001/chat](http://127.0.0.1:5001/chat)
- GEMINI_API_KEY=your_gemini_api_key
- GEMINI_MODEL=gemini-2.0-flash
- CHATBOT_PORT=5001


Initialize the database

Create a database named ProjectX.

Import data.sql into MySQL:

mysql -u root -p ProjectX < data.sql


Run the app

Start the API server: node server.js

Start the chat server: python app1.py (Ensure virtual environment is active)

Open the app

Visit http://localhost:5000 in your browser.

License

Private/internal use.
