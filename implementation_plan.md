# EduTech Reels — Build Implementation Plan

## Goal
Build out the full EduTech Reels project from the existing README blueprint. Data preprocessing is already complete (142 videos across 3 categories, [videos_metadata.csv](file:///d:/Ananya/VIT/TY%20s2/AI/AI%20CP/Videos%20data/videos_metadata.csv) generated). We now need to create the **backend**, **Firebase upload scripts**, and **frontend**.

## Proposed Changes

### Backend (`backend/`)

#### [NEW] [.env.example](file:///d:/Ananya/VIT/TY%20s2/AI/AI%20CP/backend/.env.example)
Firebase credential placeholders + Flask config.

#### [NEW] [firebase_config.py](file:///d:/Ananya/VIT/TY%20s2/AI/AI%20CP/backend/firebase_config.py)
Firebase Admin SDK initialization (Firestore + Cloud Storage), loads `.env` credentials.

#### [NEW] [recommendation_engine.py](file:///d:/Ananya/VIT/TY%20s2/AI/AI%20CP/backend/recommendation_engine.py)
`SimpleRecommendationEngine` class with hybrid scoring:
- Content-based filtering (50% weight)
- Collaborative filtering (30% weight)
- Trending/popularity (20% weight)
- Diversity enforcement across creators

#### [NEW] [app.py](file:///d:/Ananya/VIT/TY%20s2/AI/AI%20CP/backend/app.py)
Flask API with endpoints:
- `GET /api/health`
- `GET /api/users`
- `GET /api/recommendations?user_id=X`
- `GET /api/videos/<video_id>`
- `POST /api/interactions`
- `GET /api/analytics/<user_id>`

---

### Scripts (`scripts/`)

#### [NEW] [upload_to_firebase.py](file:///d:/Ananya/VIT/TY%20s2/AI/AI%20CP/scripts/upload_to_firebase.py)
One-time script to populate Firebase:
- Upload videos to Cloud Storage
- Upload metadata CSV to Firestore
- Create 3 test users (engineering/medical/mba)
- Create 15 creator profiles

---

### Frontend (`frontend/`)

#### [NEW] Next.js app (TypeScript + Tailwind CSS)
Initialize via `npx create-next-app@latest`.

#### [NEW] [firebase-config.js](file:///d:/Ananya/VIT/TY%20s2/AI/AI%20CP/frontend/firebase-config.js)
Frontend Firebase initialization with placeholder config.

#### [NEW] Main page — TikTok/Reels-style video feed
- Full-viewport vertical video cards with snap scrolling
- Like / Share / Save / Comment interaction buttons
- Video metadata overlay (title, creator, tags)
- Dark theme with glassmorphism, gradients, micro-animations

#### [NEW] User selector component
- Dropdown/sidebar to switch between test user profiles
- Shows aspirant type badge

#### [NEW] Analytics dashboard tab
- Watch stats, category distribution charts, engagement metrics

---

## Verification Plan

### Automated
1. **Backend health check**: Start Flask server → `curl http://localhost:5000/api/health` → expect `{"status": "ok", ...}`
2. **Frontend build**: `npm run build` in `frontend/` — verify zero errors

### Manual
1. Run `npm run dev` in `frontend/`, open `http://localhost:3000` in browser
2. Verify the video feed renders with the modern dark UI
3. Verify user selection works and feed changes per user profile
