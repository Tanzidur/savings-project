# Savings – Smart Bank Card Benefit Discovery

A web app for discovering cashback, discounts, reward points, EMI offers, and merchant deals across banks in Bangladesh. Built as a course project — currently a working prototype, no AI/ML involved.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python (Flask)
- Database: MySQL (via XAMPP)
- IDE: VS Code

## Folder Structure
```
savings-project/
├── index.html
├── app.py               ← Flask backend, all /api/* routes
├── venv/                ← local only, not pushed (see .gitignore)
├── css/
│   ├── variables.css    ← shared colors/fonts, import this FIRST on every page
│   ├── nav.css           ← shared navbar
│   └── style.css        ← landing page styles
├── js/
│   └── script.js
├── assets/images/
├── pages/                ← every new page goes here
├── data/                 ← old mock JSON, not used anymore
└── README.md
```

## Conventions
- Link `css/variables.css` and `css/nav.css` before your own page's stylesheet.
- Use `var(--color-primary)` etc. instead of hardcoding hex colors.
- One CSS file per page (e.g. `login.css`, `dashboard.css`).
- Class naming: lowercase, hyphenated (`.feature-card`, not `.FeatureCard`).
- New pages go in `pages/`, linked via the shared navbar in `css/nav.css`.

## Pages & Ownership
1. Landing Page ✅ — Tanzidur
2. Login / Register ✅ — Tanzidur (UI done, real auth pending)
3. Profile Management ✅ — Tanzidur (UI done, not connected to DB yet)
4. Card Selection ✅ — Tanzidur (connected to MySQL)
5. Benefits/Offers ✅ — Tanzidur (connected to MySQL)
6. Merchant Directory ✅ — Tanzidur (connected to MySQL)
7. Financial Education ✅ — Tanzidur (connected to MySQL)
8. Dashboard — not started
9. Admin Panel — not started

## Update 1 (submitted)
4 pages connected to a real MySQL database through Flask: Card Selection, Benefits, Merchant Directory, Financial Education. Each fetches from its own API route (`/api/banks`, `/api/offers`, `/api/merchants`, `/api/articles`). Landing page included as static context. Login/Register and Profile are built but not DB-connected yet — that's Update 2.

## Update 2 (planned)
Right now the site is a catalog — anyone can browse everything, but nothing is tied to an actual logged-in user. Update 2 is about fixing that:

- **Real accounts** — `users` table, hashed passwords, actual `/api/login` and `/api/register` routes with sessions (replacing the current fake in-browser login).
- **Linking users to cards** — `user_cards` table so a user can save which card(s) they actually hold.
- **Personalized Dashboard** — new page, shows offers relevant to *your* cards instead of everything, plus a spending pie chart (Chart.js).
- **Route protection** — Dashboard and "My Cards" should require login.

Bigger than any single page so far, so it's its own milestone rather than rushed into Update 1.

## Progress Log
- 14/07 — Project structure set up. Landing page built and styled.
- 14/07 — Added `variables.css`, divided remaining pages among the team.
- 15/07 — Built Login/Register (toggle UI) and Profile pages, in-memory only.
- 16/07 — Installed MySQL (XAMPP) + Flask. Connected Card Selection to real DB.
- 16/07 — Connected Benefits, Merchant Directory, and Financial Education pages to MySQL.
- 16/07 — Scoped Update 1 to the 4 DB-connected pages + landing.
- 16/07 — Fixed venv being tracked in git.
- 19/07 — Added shared navbar to all pages. Fixed font mismatch, navbar spacing, and login page layout bug. Planned Update 2 (real auth + personalization).