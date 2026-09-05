# ToTally 📊

**ToTally** is an AI-powered Finance Operations (FinOps) web application designed to close finance-ops loops for businesses. It automates reconciliation, explains mismatches, spots risks, forecasts cash, tracks foreign exchange (FX) drift, and allows natural language queries over financial data.

## 🚀 Features

- **Automated Reconciliation Engine (3-way Match):** Matches Bank Statements, Ledger Entries, and Payment Gateway Settlements automatically.
- **FX Tracker & Multi-Currency:** Tracks foreign exchange (FX) drift accurately based on the transaction dates across multiple currencies (USD, EUR, GBP, AED, SGD).
- **Tax Matcher Engine:** Automatically classifies transactions into appropriate GST slabs (e.g. 5%, 12%, 18%) using heuristics, with the ability to manually resolve ambiguous items.
- **Vendor Alerts & Reminders:** Profiles vendor behavior, flags anomalies (e.g. amount spikes), tracks overdue payments, and generates scannable **Razorpay Payment Links (QR Code)** inside an automated email reminder flow.
- **Ask AI (Voice Enabled):** A multilingual finance assistant. Speak to it in English, Hindi, or Hinglish via voice input to query your database and receive insights, complete with Text-to-Speech playback!
- **Cash Forecasting:** Predicts cash flows and runway using risk-adjusted projections.
- **Zero-Setup Demo Mode:** Uses an in-memory ephemeral MongoDB and dynamic seed scripts to instantly generate hundreds of mocked financial records, allowing you to demo the app with zero external database dependencies.

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Recharts for data visualization, `qrcode.react` for payment links, and Web Speech API for voice I/O.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (Mongoose) — configured to use `mongodb-memory-server` for instant demos.
- **Integrations:** 
  - **Razorpay** (Test Mode API for Settlements & Payment Links)
  - **Nodemailer** (Vendor Reminders)
  - **LLM APIs** (for AI-driven insights and natural language processing)

## 📦 Project Structure

```text
ToTally/
├── client/              # React Frontend (Vite)
│   ├── src/
│   │   ├── api/         # Axios API configuration & endpoints
│   │   ├── components/  # Reusable UI components (Sidebar, Topbar)
│   │   ├── pages/       # Page views (Dashboard, FX Tracker, Ask AI, Vendors, etc.)
│   │   └── ...
├── server/              # Node.js/Express Backend
│   ├── engines/         # Business logic (fxEngine, matchEngine, taxEngine)
│   ├── integrations/    # External services (Razorpay, Nodemailer, AI)
│   ├── models/          # MongoDB Mongoose schemas
│   ├── routes/          # Express API routes
│   └── seed/            # Mock data generation scripts
├── .env                 # Environment variables (Keys)
└── .gitignore           # Ignored files for git
```

## ⚙️ How to Run Locally

### Prerequisites
- Node.js (v16+)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/vardaagachake/ToTally.git
cd ToTally
```

### 2. Setup Environment Variables
Create a `.env` file in the root directory (you can copy `.env.example` if available). 
```env
# Example .env configuration
PORT=5000
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
# Optional: GEMINI_API_KEY, OPENAI_API_KEY, or CLAUDE_API_KEY for the Ask AI feature
```

### 3. Install Dependencies

Install root dependencies (if any):
```bash
npm install
```

Install backend and frontend dependencies:
```bash
cd server && npm install
cd ../client && npm install
```

### 4. Run the Application

The app requires both the backend and frontend to be running simultaneously.

**Start the Backend:**
```bash
cd server
node index.js
```
*(The backend will automatically start an in-memory MongoDB and seed it with realistic test data).*

**Start the Frontend:**
```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite provides) and the backend API at `http://localhost:5000`.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is open-source and available under the MIT License.
