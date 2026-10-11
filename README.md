# LeakPriority 💧
### Smart Water Leak Prioritization & Repair Management System

> **Hackathon Project — Heat and Water Track**

LeakPriority is a web-based decision-support tool that helps municipal water departments, utility teams, and housing societies prioritize water leak repairs based on urgency and potential impact.

---

## 🎯 Problem Statement

When many leaks are reported simultaneously, repair teams have limited time and resources. Without a structured system, decisions depend on the order complaints arrive rather than their actual impact.

LeakPriority provides a transparent, explainable scoring engine that ranks leaks by urgency — helping teams fix the right leaks first.

---

## ✨ Features

| Feature | Status |
|---|---|
| Explainable 100-point priority scoring engine | ✅ |
| Dashboard with summary cards | ✅ |
| Sortable, filterable leak report table | ✅ |
| Report creation form with validation | ✅ |
| Score breakdown visualization per report | ✅ |
| Repair status workflow (Reported → Assigned → In Progress → Resolved) | ✅ |
| Priority distribution chart | ✅ |
| Estimated water-loss and water-savings tracking | ✅ |
| localStorage persistence (prototype) | ✅ |
| AWS Lambda + DynamoDB backend | ✅ (ready) |
| AWS SAM deployment template | ✅ |

---

## 🏗 Architecture

```
Frontend (React + Vite)
│
├── src/
│   ├── engine/scoringEngine.js    ← Core scoring logic
│   ├── store/reportStore.js       ← localStorage data layer (Stage 1-3)
│   ├── api/apiClient.js           ← AWS API client (Stage 4)
│   ├── data/sampleReports.js      ← Seed data
│   └── components/                ← UI components
│
Backend (AWS SAM)
│
├── template.yaml                  ← SAM infrastructure
└── backend/functions/
    ├── scoring.js                 ← Shared scoring (mirrors frontend)
    ├── listReports.js             ← GET /reports
    ├── getReport.js               ← GET /reports/{id}
    ├── createReport.js            ← POST /reports
    ├── updateStatus.js            ← PUT /reports/{id}/status
    └── getStats.js                ← GET /stats
```

---

## 📊 Scoring Model

> **Prototype weights** — not official engineering or municipal standards.

| Factor | Max Points | Notes |
|---|---|---|
| Leak Severity | 30 | Critical=30, High=22, Medium=14, Low=6 |
| Water-Loss Rate (L/h) | 25 | 0→0 pts, ≥200 L/h→25 pts (linear) |
| Affected Households | 20 | 0→0 pts, ≥500→20 pts (linear) |
| Time Unresolved | 15 | 0→0 pts, ≥72 h→15 pts (linear) |
| Near Critical Facility | 10 | Binary: hospital, fire station, etc. |
| **Total** | **100** | |

**Priority Categories:**
- 🚨 **Critical**: 80–100
- 🔴 **High**: 60–79
- 🟡 **Medium**: 35–59
- 🟢 **Low**: 0–34

---

## 🚀 Getting Started

### Stage 1-3: Frontend with Local Data

```bash
cd leakpriority
npm install
npm run dev
# → http://localhost:5173
```

### Stage 4: AWS Backend Integration

**Prerequisites:** AWS CLI, AWS SAM CLI, configured AWS credentials.

```bash
# Deploy backend
sam build
sam deploy --guided
# Note the ApiUrl output

# Connect frontend
echo "VITE_API_URL=<your-api-url>" > .env.local

# Build and deploy frontend (Amplify or S3)
npm run build
# Upload dist/ to your hosting service
```

### Switching from localStorage to AWS

In your components, change the import from:
```js
import { getAllReports } from '../store/reportStore';
```
to:
```js
import { getAllReports } from '../api/apiClient';
```

The API interface is identical.

---

## 💧 Water-Loss Estimates

Estimated daily water loss:
```
Daily loss (L/day) = Flow rate (L/h) × 24
```

Estimated water saved by a repair:
```
Water saved (L) = Flow rate (L/h) × Hours from report to resolution
```

> **Important:** These are rough estimates based on reported values. They have not been measured and should not be quoted as verified quantities.

---

## 🔒 Disclaimer

The priority scores produced by this system are decision-support estimates. They use prototype weights and are not official engineering calculations. All repair decisions should be made by qualified maintenance professionals with access to on-site information.

---

## 📁 Project Structure

```
leakpriority/
├── src/
│   ├── api/              API client for AWS
│   ├── components/       React UI components
│   ├── data/             Sample seed data
│   ├── engine/           Scoring engine
│   └── store/            localStorage store
├── backend/
│   └── functions/        Lambda handlers
├── template.yaml         AWS SAM template
├── .env.local            API URL config
└── README.md
```

---

## 👥 Team

LeakPriority — Built for the Heat and Water Hackathon Track.
