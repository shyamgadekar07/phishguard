# PhishGuard

**PhishGuard: An Adaptive Multi-Channel Phishing Simulation and Cybersecurity Awareness Platform Using Behavioral Analytics and Machine Learning**

---

## 1. Project Overview
PhishGuard is an academic cybersecurity awareness platform designed for authorized and controlled phishing simulations, behavioral analysis, human-risk assessment, adaptive awareness training, and machine learning-assisted risk prediction.

> **Security & Ethical Notice**:
> PhishGuard is built strictly for educational, research, and authorized organizational awareness purposes. The platform enforces safe, controlled simulation links, does NOT collect real passwords, OTPs, or financial credentials, and strictly prohibits sending unsolicited phishing material.

---

## 2. Technology Stack

### Frontend
- **Framework**: React (Vite)
- **Language**: JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v6+)
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (REST API)
- **Database**: MongoDB Atlas (via Mongoose)
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs

### ML Service
- **Language**: Python 3.10+
- **Framework**: FastAPI & Uvicorn
- **Data & ML**: Pandas, NumPy, Scikit-learn, Joblib

---

## 3. Repository Architecture

```text
phishguard/
│
├── backend/                  # Node.js Express REST API
│   ├── src/
│   │   ├── config/           # Database & server configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middlewares/      # Error handling, auth, validation
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express API route declarations
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Helper functions
│   │   ├── app.js            # Express application setup
│   │   └── server.js         # Server entry point
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # React + Vite client application
│   ├── src/
│   │   ├── assets/           # Static images, icons, graphics
│   │   ├── components/       # Reusable UI components
│   │   ├── layouts/          # Page layouts (Navbar, Sidebar, Footer)
│   │   ├── pages/            # View pages (Home, Dashboard, etc.)
│   │   ├── services/         # Axios API client & services
│   │   ├── App.jsx           # Root React component & routing
│   │   ├── index.css         # Tailwind & global CSS
│   │   └── main.jsx          # React DOM entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── ml-service/               # Python FastAPI Microservice
│   ├── app/
│   │   └── main.py           # FastAPI entry point & health endpoint
│   ├── models/               # Trained ML artifacts (.joblib)
│   ├── requirements.txt      # Python dependencies
│   └── README.md
│
├── .gitignore
└── README.md
```

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) & pip
- MongoDB Atlas account or local MongoDB instance

---

### Backend Service
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   Configure `PORT`, `MONGO_URI`, and `JWT_SECRET`.
4. Start the development server:
   ```bash
   npm run dev
   ```
   The backend API will run at `http://localhost:5000`. Health check: `GET http://localhost:5000/api/health`.

---

### Frontend Application
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:5173`.

---

### ML Microservice
1. Navigate to the ml-service directory:
   ```bash
   cd ml-service
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The ML service will run at `http://localhost:8000`. Health check: `GET http://localhost:8000/health`.
