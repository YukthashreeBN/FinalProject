# LiveLearn Plus – Frontend

A modern, responsive web learning platform frontend connecting teachers and students.

## Project Structure

```
livelearn-plus/
├── index.html                  # Landing page
├── login.html                  # Login page
├── register.html               # Registration page
├── student-dashboard.html      # Student dashboard
├── teacher-dashboard.html      # Teacher dashboard
├── admin-dashboard.html        # Admin dashboard
├── payment.html                # Payment page
│
├── css/
│   └── styles.css              # Custom styles (Tailwind + utilities)
│
├── js/
│   ├── main.js                 # Global utilities, sidebar, cookie banner
│   ├── auth.js                 # Login & register logic + validation
│   ├── student.js              # Student dashboard logic & mock data
│   ├── teacher.js              # Teacher dashboard logic
│   ├── admin.js                # Admin dashboard logic
│   ├── payment.js              # Payment flow logic
│   └── api.js                  # Axios config & all API endpoint wrappers
│
└── components/
    ├── navbar.js               # Reusable navbar component
    ├── sidebar.js              # Reusable sidebar component
    ├── card.js                 # Reusable card helpers
    ├── modal.js                # Modal dialog component
    ├── quiz.js                 # Full MCQ quiz component
    ├── videoPlayer.js          # Video player helpers
```

## Tech Stack

- **HTML5** – Semantic markup
- **Tailwind CSS** (CDN) – Utility-first styling
- **Vanilla JavaScript ES6** – Modular, no frameworks
- **Axios** (CDN) – HTTP requests
- **Google Fonts** – Plus Jakarta Sans + DM Serif Display

## Features

### Pages
| Page | Description |
|------|-------------|
| `index.html` | Landing page with hero, features, testimonials |
| `login.html` | Email/password login with demo account buttons |
| `register.html` | Name, email, password, role registration |
| `student-dashboard.html` | Classes, videos, notes, quiz, doubts, payments |
| `teacher-dashboard.html` | Create class, upload, quiz builder, doubts, books |
| `admin-dashboard.html` | Stats, user management, teacher approvals, payments |
| `payment.html` | Course checkout with card/UPI/net banking UI |

### Demo Login Accounts
| Role | Email | Password |
|------|-------|----------|
| Student | student@demo.com | demo123 |
| Teacher | teacher@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

### Key Features
- **Cookie Consent Banner** – Stored in localStorage
- **Teacher Doubt Resolution** – Post doubts and get answers from teachers
- **Quiz Module** – MCQ with scoring, feedback, retry
- **Payment Simulation** – Card/UPI/Net Banking UI, success/failure flow
- **Responsive Sidebar** – Mobile-friendly with overlay
- **Form Validation** – All forms validated before submission

## Backend Integration

All API calls are in `js/api.js`. Update `API_BASE` to your backend URL:

```js
const API_BASE = 'http://localhost:5000/api';
```

### API Endpoints Expected
```
POST /api/login
POST /api/register
GET  /api/classes
POST /api/classes
GET  /api/videos
POST /api/videos (multipart)
GET  /api/notes
POST /api/notes (multipart)
GET  /api/quizzes
POST /api/quizzes
POST /api/doubts
POST /api/ask-doubt
POST /api/create-order
POST /api/verify-payment
POST /api/book-request
POST /api/recommend-book
GET  /api/admin/users
POST /api/admin/approve-teacher/:id
POST /api/admin/reject-teacher/:id
GET  /api/admin/payments
```

## Getting Started

1. Open `index.html` in a browser (no build step required)
2. Click **Log In** and use a demo account, or register a new one
3. Explore the dashboard based on your role

> All data is currently mocked. Connect your backend by updating `API_BASE` in `js/api.js` and uncommenting the real API calls in `js/student.js`, `js/teacher.js`.

## Design

- **Theme**: Blue (#1D4ED8) + White
- **Fonts**: DM Serif Display (headings) + Plus Jakarta Sans (body)
- **Layout**: Card-based, sidebar navigation, mobile responsive
- **Style**: Clean, minimal, professional academic UI
