# 🌾 CropSense
### AI-Powered Agricultural Intelligence Platform

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/License-ISC-blue?style=for-the-badge" />
</p>

---

CropSense is a full-stack, AI-driven agricultural management platform built for modern Indian farmers. It bridges the gap between traditional farming and cutting-edge data science by providing real-time crop health monitoring, satellite-simulated NDVI analysis, hyper-local market price predictions, and a multilingual AI voice assistant — all within a sleek, glassmorphism-styled web interface.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Smart Field Management** | Register and monitor multiple fields with crop type, stage, area, and GPS location |
| 🌿 **Plant Doctor (Vision AI)** | Upload crop images for AI-powered disease, pest, and nutrient deficiency diagnosis |
| 📈 **Market Price Predictor** | 7-day hyper-local Mandi price trend predictions with HOLD / SELL recommendations |
| 🛰️ **NDVI Simulation Insights** | Satellite-level vegetative index simulation with yield forecasting and confidence scores |
| 📅 **AI Crop Calendar** | Gemini-generated 6-month milestone schedule tailored to the specific crop and growth stage |
| 💰 **Profit Simulator** | Compare current crop profitability vs. an alternative crop with a financial breakdown |
| 🔔 **Smart Predictive Alerts** | AI-generated farm-wide critical alerts (weather, soil, market) with 5-min caching |
| 📋 **Daily Action Engine** | Single most-critical daily task identified by the AI across all registered fields |
| 🌐 **Community Hub** | Broadcast pest/weather alerts to the local farming community |
| 🔐 **Secure Authentication** | JWT-based login/registration with bcrypt password hashing |

---

## 🛠️ Tech Stack

### Frontend
- **HTML5, CSS3, Vanilla JavaScript (ES6+)**
- **Chart.js** — Crop growth and market trend visualizations
- **Leaflet.js** — Interactive map for field selection and geographic monitoring
- **FontAwesome** — Modern iconography
- **Google Fonts (Outfit)** — Premium typography
- **Design:** Glassmorphism UI with micro-animations and responsive layouts

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js v5 (REST API)
- **Authentication:** JSON Web Tokens (JWT) — 7-day expiry
- **Password Security:** bcryptjs (salt rounds: 10)

### Database
- **MongoDB Atlas** (Cloud) / Local MongoDB fallback
- **Mongoose** ODM for structured data modeling and validation

### AI Engine
- **Google Gemini 2.5 Flash** via `@google/genai` SDK
- **Capabilities:** NLP Chat, Computer Vision (image analysis), Predictive Modeling

---

## 📁 Project Structure

```
cropsense/
│
├── index.html              # Login / Registration page
├── 1st.html                # Main Dashboard (field overview, alerts, daily action)
├── 2nd.html                # Field Analysis (NDVI simulation, AI Scheduler)
├── 3rd.html                # Plant Doctor (Vision AI - crop disease detection)
├── 4th.html                # Market Predictor (7-day Mandi price trends)
├── 5th.html                # Crop Progression & NDVI deep-dive
├── 6th.html                # Analytics & Charts
├── 7th.html                # Alerts & Notifications center
├── 8th.html                # Community Hub (broadcasts, profit simulator, crop calendar)
│
├── global-alerts.js        # Shared alert rendering logic across pages
├── server.js               # Express backend (all API routes)
├── models/
│   ├── Field.js            # Mongoose Field schema
│   └── User.js             # Mongoose User schema
│
├── .env                    # Environment variables (not committed)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) running locally **or** a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/aaadityagupta07/cropsense.git
cd cropsense
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/cropsense_advanced
GEMINI_API_KEY=your_google_gemini_api_key_here
JWT_SECRET=your_custom_jwt_secret_here
PORT=5000
```

> **Note:** If `GEMINI_API_KEY` is missing or invalid, the app will gracefully fall back to hardcoded dummy data so the UI remains fully functional for demos.

### 4. Start the Server

```bash
node server.js
```

The server will start on **http://localhost:5000**

### 5. Open the App

Navigate to **http://localhost:5000** in your browser. You will be redirected to the login page.

---

## 🔌 API Reference

All protected routes require a JWT token in the `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new farmer account |
| `POST` | `/api/auth/login` | Login and receive a JWT token |

### Fields
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/fields` | Get all fields for the logged-in user |
| `GET` | `/api/fields/:id` | Get a specific field by ID |
| `POST` | `/api/fields` | Create a new field (auto-generates history) |
| `PUT` | `/api/fields/:id` | Update field details |
| `PUT` | `/api/fields/:id/environment` | Update temperature & humidity |
| `POST` | `/api/fields/:id/history` | Log a new daily environmental entry |
| `PUT` | `/api/fields/:id/tasks/:taskId` | Toggle a task's completion status |
| `POST` | `/api/fields/:id/generate-plan` | Generate an AI task plan for a field |

### AI Features
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | AI chatbot (field-context aware) |
| `POST` | `/api/ai/voice-assistant` | Kisan AI voice assistant (Hindi/English) |
| `POST` | `/api/ai/plant-doctor` | Vision AI for crop disease detection |
| `POST` | `/api/ai/market-predictor` | 7-day Mandi price trend prediction |
| `POST` | `/api/ai/ndvi-insights` | NDVI simulation insights & yield forecast |
| `GET` | `/api/ai/daily-action` | Get the single most critical farm action for today |
| `GET` | `/api/ai/smart-alerts` | Get 3 predictive farm alerts (cached 5 min) |
| `POST` | `/api/ai/crop-calendar` | Generate a 6-month crop milestone calendar |
| `POST` | `/api/ai/profit-simulator` | Compare current vs. alternative crop profitability |

### Community
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/community/alerts` | Fetch recent community broadcasts |
| `POST` | `/api/community/broadcast` | Post a new community alert |

---

## 🔑 Key Implementation Details

- **Auto-History Generation:** When a new field is created with a `plantingDate`, the server automatically generates realistic daily temperature and humidity logs from the planting date to today.
- **Gemini Fallbacks:** Every AI endpoint has a fallback to prevent UI breakage — either hardcoded dummy data or rule-based logic — ensuring the app is always demo-ready.
- **JWT Middleware:** All sensitive routes are protected by the `authenticateToken` middleware, which validates the Bearer token on every request.
- **Smart Alert Caching:** The `/api/ai/smart-alerts` endpoint caches responses for 5 minutes to avoid hitting Gemini API rate limits (5 requests/minute on the free tier).
- **Responsive Design:** The frontend is optimized for both desktop monitoring stations and mobile field use.

---

## 🌐 Deployment

The application is deployed on **Render**: [https://cropsense-xam6.onrender.com](https://cropsense-xam6.onrender.com)

To deploy your own instance on Render:
1. Push the repository to GitHub.
2. Create a new **Web Service** on Render, connected to your repo.
3. Set the **Start Command** to `node server.js`.
4. Add your environment variables (`MONGO_URI`, `GEMINI_API_KEY`, `JWT_SECRET`) in the Render dashboard.

---

## 🔮 Future Scope

- **IoT Integration** — Direct connectivity with hardware soil and air sensors for real-time data ingestion.
- **Multilingual UI** — Expanding the entire interface to regional Indian languages (Marathi, Punjabi, Telugu, etc.).
- **Blockchain Supply Chain** — Transparent farm-to-market tracking to ensure fair pricing for farmers.
- **Offline PWA Support** — Service workers to enable core features without internet connectivity.

---

## 📄 License

This project is licensed under the **ISC License**.

---

*Built with ❤️ for Indian farmers — CropSense is an intelligent companion for the modern agriculturist.*