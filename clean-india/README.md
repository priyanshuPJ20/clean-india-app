# ♻️ Clean India — Gamified Waste Disposal App

A full-stack web application that rewards users for properly disposing waste. Upload photo/video proof, get AI-verified, earn points, build streaks, and compete on leaderboards.

---

## 🗂️ Folder Structure

```
clean-india/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js        # MongoDB connection
│   │   │   └── cloudinary.js      # Cloudinary + Multer config
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register, login, profile
│   │   │   ├── uploadController.js# Upload CRUD + AI trigger
│   │   │   ├── leaderboardController.js
│   │   │   └── adminController.js # Admin panel APIs
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT middleware
│   │   ├── models/
│   │   │   ├── User.js            # User schema + gamification
│   │   │   └── Upload.js          # Upload schema + geo index
│   │   ├── routes/
│   │   │   └── index.js           # All API routes
│   │   ├── utils/
│   │   │   └── aiVerification.js  # Claude Vision AI + points logic
│   │   └── server.js              # Express + Socket.IO entry
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── shared/
│   │   │       ├── Navbar.js / .css
│   │   │       └── Footer.js / .css
│   │   ├── pages/
│   │   │   ├── HomePage.js / .css
│   │   │   ├── AuthPages.js / .css  (Login + Register)
│   │   │   ├── DashboardPage.js / .css
│   │   │   ├── UploadPage.js / .css
│   │   │   ├── LeaderboardPage.js / .css
│   │   │   ├── FeedPage.js / .css
│   │   │   ├── ProfilePage.js / .css
│   │   │   └── AdminPage.js / .css
│   │   ├── store/
│   │   │   └── authStore.js       # Zustand auth state
│   │   ├── utils/
│   │   │   └── api.js             # Axios instance with interceptors
│   │   ├── styles/
│   │   │   └── global.css         # Design system + utilities
│   │   ├── App.js                 # Router + route guards
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
├── package.json                   # Root convenience scripts
└── README.md
```

---

## ⚡ Quick Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com) free tier)
- [Cloudinary](https://cloudinary.com) free account (for media storage)
- [Anthropic API key](https://console.anthropic.com) (for AI verification)

---

### 1. Clone & Install

```bash
# Install all dependencies
npm run install:all
# Or manually:
cd backend && npm install
cd ../frontend && npm install
```

---

### 2. Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development

# MongoDB — use Atlas URI for production
MONGODB_URI=mongodb://localhost:27017/clean-india

# JWT — change this secret!
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# Cloudinary (get from cloudinary.com > Dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Anthropic Claude API (for AI image verification)
ANTHROPIC_API_KEY=sk-ant-...

# Frontend URL for CORS
CLIENT_URL=http://localhost:3000

# Points configuration
POINTS_PER_UPLOAD=10
POINTS_STREAK_BONUS=5
POINTS_FIRST_UPLOAD=50
```

---

### 3. Frontend Environment

```bash
cd frontend
cp .env.example .env
```

`frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

### 4. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# API running at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# App running at http://localhost:3000
```

---

### 5. Create Admin User

After registering via the UI, update the user role in MongoDB:

```js
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

---

## 🛠️ API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |
| GET | `/api/auth/notifications` | Get notifications |

### Uploads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uploads` | Submit upload (multipart) |
| GET | `/api/uploads/feed` | Public approved feed |
| GET | `/api/uploads/me` | My uploads |
| GET | `/api/uploads/stats` | Platform stats |
| POST | `/api/uploads/:id/like` | Like/unlike |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard/global` | Global rankings (`?filter=points\|uploads\|streaks`) |
| GET | `/api/leaderboard/monthly` | Monthly rankings |
| GET | `/api/leaderboard/city/:city` | City rankings |
| GET | `/api/leaderboard/my-rank` | Current user's rank |
| GET | `/api/leaderboard/cities` | List all cities |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Stats + trend |
| GET | `/api/admin/uploads/pending` | Pending reviews |
| PATCH | `/api/admin/uploads/:id/review` | Approve/reject |
| GET | `/api/admin/users` | All users |
| PATCH | `/api/admin/users/:id/ban` | Ban user |
| PATCH | `/api/admin/users/:id/unban` | Unban user |

---

## 🗄️ Database Schema

### User
- `username`, `email`, `password` (bcrypt)
- `profilePicture`, `city`, `country`, `role`
- **Gamification:** `points`, `totalUploads`, `approvedUploads`, `currentStreak`, `longestStreak`, `lastUploadDate`, `badges[]`, `monthlyPoints`
- **Anti-cheat:** `uploadHashes[]`
- **Social:** `referralCode`, `referredBy`, `referralCount`, `notifications[]`

### Upload
- `user` (ref), `mediaUrl`, `mediaPublicId`, `mediaType`
- `location` (GeoJSON Point with city/country)
- **AI:** `aiVerification` { status, confidence, dustbinDetected, garbageDetected }
- **Admin:** `adminReview` { status, reviewedBy, reason }
- `status` (pending/approved/rejected), `pointsAwarded`
- **Anti-cheat:** `imageHash`, `ipAddress`, `isDuplicate`
- **Social:** `likes[]`, `comments[]`, `caption`

---

## 🎮 Gamification Rules

| Action | Points |
|--------|--------|
| Valid upload (base) | +10 pts |
| First ever upload | +50 pts bonus |
| Streak day 2+ | +5 × streak days (max 50) |
| 10 approved uploads | +20 pts milestone |
| 50 approved uploads | +100 pts milestone |
| 100 approved uploads | +250 pts milestone |
| Referral signup | +25 pts |

### Badges
| Badge | Condition |
|-------|-----------|
| 🌱 First Step | 1st approved upload |
| 🔥 3-Day Streak | 3 consecutive days |
| ⚡ Week Warrior | 7-day streak |
| 🏆 Month Master | 30-day streak |
| ♻️ Eco Starter | 10 approved uploads |
| 🌍 Clean Champion | 50 approved uploads |
| 🦸 Planet Hero | 100 approved uploads |
| ⭐ Point Collector | 500 points |
| 💎 Eco Elite | 1000 points |

---

## 🔒 Security Features

- JWT authentication with 7-day expiry
- Bcrypt password hashing (12 rounds)
- Rate limiting: 10 auth attempts / 15 min, 10 uploads / hour
- Daily upload cap: 5 per user
- Image hash-based duplicate detection
- IP address logging
- Helmet.js HTTP security headers
- CORS restricted to frontend URL
- Admin-only routes with role middleware

---

## 🚀 Production Deployment

### Backend (Railway / Render / EC2)
1. Set all environment variables
2. Set `NODE_ENV=production`
3. Use MongoDB Atlas connection string
4. `npm start`

### Frontend (Vercel / Netlify)
1. Set `REACT_APP_API_URL=https://your-backend.com/api`
2. `npm run build`
3. Deploy `build/` folder

### Nginx reverse proxy (optional)
```nginx
location /api {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Zustand, Axios |
| Styling | Custom CSS design system (no framework) |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Media Storage | Cloudinary |
| AI Verification | Anthropic Claude Vision API |
| Real-time | Socket.IO |
| File Upload | Multer + react-dropzone |
| Scheduling | node-cron |

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

*Built with ❤️ for Swachh Bharat Abhiyan 🇮🇳*
