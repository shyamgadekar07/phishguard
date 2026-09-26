# PhishGuard

**PhishGuard: An Adaptive Multi-Channel Phishing Simulation and Cybersecurity Awareness Platform Using Behavioral Analytics and Machine Learning**

---

## 1. Project Overview
PhishGuard is an academic cybersecurity awareness platform designed for authorized and controlled phishing simulations, behavioral analysis, human-risk assessment, adaptive awareness training, and machine learning-assisted risk prediction.

> **Security & Ethical Compliance Notice**:
> This project is an authorized academic cybersecurity-awareness simulation platform. It does not collect real credentials.
> - The platform enforces strictly safe, controlled simulation links.
> - NEVER collects real passwords, OTPs, banking information, or credit card details.
> - NEVER creates real credential-harvesting phishing landing pages.
> - Simulation links point exclusively to local/controlled awareness debrief pages educating users on observed red flags.
> - Does NOT send unauthorized external phishing material.

---

## 2. Technology Stack

### Frontend
- **Framework**: React (Vite)
- **Language**: JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v6+)
- **HTTP Client**: Axios with Authorization Bearer Interceptor

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

## 3. Platform Capabilities (Phases 1 — 3)

### Phase 1: Modular Foundation & Health Probes
- Microservice monorepo structure.
- Health check probes (`GET /api/health` and FastAPI `GET /health`).
- Frontend connection status monitoring with real-time indicators.

### Phase 2: Schema & Role-Based Authentication
- Mongoose `User` model with `bcryptjs` password hashing and `select: false`.
- JWT token generation with 24-hour expiration.
- Role-based authorization (`ADMIN`, `SECURITY_OFFICER`, `TRAINEE`).
- Automated administrator seed mechanism.
- Frontend Auth UI with protected route wrappers (`/dashboard`).

### Phase 3: Safe Simulation & Campaign Architecture
- **Phishing Template Management**: Multi-channel templates (`EMAIL`, `SMS`, `WHATSAPP`) with difficulty rating and educational debrief descriptions.
- **Campaign Management**: Campaign orchestration targeting active trainees, ensuring channel parity with templates, and tracking campaign state transitions (`DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `CANCELLED`).
- **Safe Simulation Tracking**: Cryptographically secure, unguessable tracking IDs (`/api/simulation/:trackingId`) that record interaction timestamps without credential inputs.
- **Controlled Awareness Landing Page**: Provides instant feedback displaying detected red flags, psychological hooks (urgency, authority), and defensive guidelines.
- **Simulation Reporting**: Allows trainees to practice reporting suspicious messages directly to security staff.
- **Campaign Analytics & Metrics**: Aggregates delivered, opened, clicked, and reported metrics with percentage calculations.

---

## 4. Repository Architecture

```text
phishguard/
│
├── backend/                  # Node.js Express REST API
│   ├── src/
│   │   ├── config/           # Database & server configuration
│   │   ├── controllers/      # Auth, Template, Campaign, Simulation controllers
│   │   ├── middlewares/      # Error handling, JWT auth, role validation
│   │   ├── models/           # User, Template, Campaign, SimulationEvent
│   │   ├── routes/           # Express API route declarations
│   │   ├── scripts/          # Seed scripts and automated test suites
│   │   ├── services/         # Business logic
│   │   ├── utils/            # JWT generator, tracking ID generator
│   │   ├── app.js            # Express application setup
│   │   └── server.js         # Server entry point
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # React + Vite client application
│   ├── src/
│   │   ├── assets/           # Static graphics
│   │   ├── components/       # ProtectedRoute, UI widgets
│   │   ├── layouts/          # Responsive MainLayout with navigation
│   │   ├── pages/            # Home, Login, Register, Dashboard, Templates, Campaigns, Simulation
│   │   ├── services/         # Axios API clients (auth, template, campaign, simulation)
│   │   ├── App.jsx           # Root React component & routing
│   │   ├── index.css         # Tailwind & global styles
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

## 5. API Reference Summary

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register a new trainee account.
* `POST /api/auth/login` — Authenticate and receive JWT token.
* `GET /api/auth/me` — Retrieve verified user profile (`Bearer <token>`).

### Templates (`/api/templates`) — *Restricted to ADMIN, SECURITY_OFFICER*
* `POST /api/templates` — Create a simulation template.
* `GET /api/templates` — List all templates (supports `?channel=&difficulty=&isActive=` filters).
* `GET /api/templates/:id` — Get single template details.
* `PUT /api/templates/:id` — Update template parameters.
* `DELETE /api/templates/:id` — Soft-deactivate a template.

### Campaigns (`/api/campaigns`) — *Restricted to ADMIN, SECURITY_OFFICER*
* `POST /api/campaigns` — Create and configure a simulation campaign.
* `GET /api/campaigns` — List campaigns.
* `GET /api/campaigns/:id` — Get single campaign details.
* `PUT /api/campaigns/:id` — Update campaign status or targets.
* `DELETE /api/campaigns/:id` — Cancel simulation campaign.
* `GET /api/campaigns/:id/metrics` — Aggregate simulation event metrics and click/report rates.

### Safe Simulation Engine (`/api/simulation`) — *Public Educational Link*
* `GET /api/simulation/:trackingId` — Records simulation click safely and displays educational red flags.
* `POST /api/simulation/:trackingId/report` — Trainee reports suspected phishing probe.

---

## 6. Setup & Verification

### 1. Backend Service
```bash
cd backend
npm install
npm run seed:admin   # Seed initial administrator account
npm run test:auth    # Run Phase 2 authentication test suite
npm run test:phase3  # Run Phase 3 simulation & campaign test suite
npm run dev          # Start development API server (Port 5000)
```

### 2. Frontend Application
```bash
cd frontend
npm install
npm run build        # Verify production build compilation
npm run dev          # Start Vite dev server (Port 5173)
```

### 3. ML Microservice
```bash
cd ml-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
