# CareBridge AI — Backend

Healthcare portal backend for reducing patient readmissions.

## Quick Start

```bash
cd backend
npm install
# Edit .env — set MONGODB_URI and optionally OPENAI_API_KEY
npm run dev
```

Server runs at **http://localhost:5001**

## .env Configuration

```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/carebridge
JWT_SECRET=your_secret_key
OPENAI_API_KEY=          # optional — enables real GPT responses
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user (patient/doctor/nurse/admin) |
| POST | `/api/auth/login` | Login and get JWT token |

**Register body:**
```json
{
  "name": "Dr. Sarah Johnson",
  "email": "sarah@hospital.com",
  "password": "Doctor@123",
  "role": "doctor",
  "specialization": "Cardiology"
}
```

---

### Patient APIs  *(role: patient)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patient/profile` | Get patient profile |
| GET | `/api/patient/medical-history` | Get all records, prescriptions, admissions |
| GET | `/api/patient/appointments` | List appointments |
| POST | `/api/patient/book-appointment` | Book appointment |
| GET | `/api/patient/discharge-summary` | Get latest discharge summary |
| POST | `/api/patient/confirm-followup` | Confirm follow-up |

---

### Doctor APIs  *(role: doctor)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/patients` | List assigned patients |
| GET | `/api/doctor/patient/:id` | Full patient detail |
| POST | `/api/doctor/add-record` | Add medical record |
| POST | `/api/doctor/prescribe` | Create prescription |
| POST | `/api/doctor/discharge` | Discharge patient |
| POST | `/api/doctor/admit-patient` | Admit patient |
| GET | `/api/doctor/readmission-risk/:patientId` | Get readmission risk score |

---

### Nurse APIs  *(role: nurse)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nurse/assigned-patients` | Get patients with tasks |
| GET | `/api/nurse/tasks` | List tasks (filter by ?status=pending) |
| POST | `/api/nurse/update-task` | Update task status |

---

### Admin APIs  *(role: admin)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Full dashboard stats |
| GET | `/api/admin/readmission-stats` | Readmission stats (?days=30) |
| GET | `/api/admin/high-risk-patients` | High-risk unconfirmed patients |
| GET | `/api/admin/staff-overtime` | Staff workload analysis |
| GET | `/api/admin/all-patients` | All patients list |
| GET | `/api/admin/all-staff` | All staff list |
| POST | `/api/admin/assign-nurse-task` | Assign task to nurse |

---

### AI APIs  *(any authenticated user)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/summarize-history` | Summarize patient history for doctors |
| POST | `/api/ai/simplify-discharge` | Rewrite discharge notes in plain English |
| POST | `/api/ai/predict-risk` | Predict readmission risk score |
| POST | `/api/ai/generate-nurse-tasks` | Generate monitoring tasks from diagnosis |

**Predict Risk:**
```json
{
  "age": 58,
  "conditions": ["hypertension", "diabetes"],
  "previous_admissions": 2,
  "medication_count": 4
}
```
Response:
```json
{
  "risk_score": 0.54,
  "risk_level": "Medium",
  "recommendation": "Schedule follow-up within 1 week."
}
```

---

## Authentication

All routes except `/api/auth/*` require a Bearer token:
```
Authorization: Bearer <token>
```

## AI Engine

- **With `OPENAI_API_KEY`**: Uses GPT-3.5-turbo for intelligent responses
- **Without key**: Falls back to built-in rule-based logic (works offline, no cost)
