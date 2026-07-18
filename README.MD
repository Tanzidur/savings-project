# Savings – Smart Bank Card Benefit Discovery

## Description
A web-based fintech platform helping debit/credit card users in Bangladesh 
discover cashback, discounts, reward points, EMI facilities, and partner 
merchant offers. Manually maintained (no AI/ML) via a mock/hardcoded 
database for the prototype phase.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python (Flask) / PHP
- Database: MySQL (mocked with JSON/JS data for prototype)
- IDE: VS Code

## Folder Structure
savings-project/
├── index.html
├── app.py               ← Flask backend, all /api/* routes
├── venv/                ← local only, not pushed (see .gitignore)
├── css/
│   ├── variables.css   ← shared colors/fonts, import this FIRST on every page
│   └── style.css       ← landing page styles
├── js/
│   └── script.js
├── assets/images/
├── pages/               ← every new page goes here
├── data/                ← legacy mock JSON (unused by DB-connected pages)
└── README.md
## Shared Conventions (read before coding)
- Always link `css/variables.css` before your own page's stylesheet.
- Use `var(--color-primary)` etc. instead of hardcoding hex colors.
- One CSS file per page (e.g. `login.css`, `dashboard.css`) — don't dump everything into one giant stylesheet.
- Class naming: lowercase, hyphenated (`.feature-card`, not `.FeatureCard` or `.feature_card`).
- Every new page file goes inside `pages/`, and mock data goes inside `data/` as `.json`.

## Pages & Ownership
1. **Landing Page** ✅ done — Tanzidur Rahman
2. **Login / Register Page** — ✅ done — Tanzidur Rahman
3. **Profile Management** — assigned to: ___
4. **Card Selection Page** — assigned to: ___
5. **Benefits/Offer Page** — assigned to: ___
6. **Merchant Directory Page** — assigned to: ___
7. **Financial Education Page** — assigned to: ___
8. **Dashboard Page** (spending pie chart + transaction history) — assigned to: ___
9. **Admin Panel** (manage banks, cards, offers, users) — assigned to: ___

*(Fill in names once you all agree — page count may still grow as we refine features.)*

## Update 1 – Submission Scope
Faculty asked for 4-5 pages with real database connectivity for this round. 
These are the pages being submitted:

1. **Landing Page** — static, sets context (no DB needed)
2. **Card Selection** — Flask + MySQL (`banks`, `cards` tables, joined)
3. **Benefits/Offers** — Flask + MySQL (`offers` table, joined with `banks`)
4. **Merchant Directory** — Flask + MySQL (`merchants` table)
5. **Financial Education** — Flask + MySQL (`articles` table)

All four data-driven pages fetch live from Flask API endpoints 
(`/api/banks`, `/api/offers`, `/api/merchants`, `/api/articles`), which 
query real MySQL tables in `savings_db` — no hardcoded/mock JSON in the 
final submission pages.

**Not part of this submission (in progress, later phase):**
- Login/Register, Profile Management — currently UI-only (in-memory JS), 
  no backend auth yet. Intentional — auth typically comes after core 
  data-driven pages are proven out.
- Dashboard, Admin Panel — not built yet.

## Progress Log
- [14/07] Set up project structure (index.html, css/, js/, assets/).
  Built landing page: navbar, hero section, features grid (4 cards), 
  footer. Fully styled, static (no JS interactivity yet).
- [14/07] Added shared css/variables.css for consistent colors/fonts 
  across all pages. Divided remaining pages among 3 team members 
  (see Pages & Ownership above).
- [14/07] Connected variables.css to landing page, moved hardcoded 
     hex colors to CSS variables. Landing page complete and stable.
- [15/07] Planned Update 1: mock JSON "database" (banks.json, 
     transactions.json) + JS fetch to render bank/card data dynamically 
     + Chart.js pie chart for spending on Dashboard page.
- [15/07] Built Login/Register page (toggle-based, one page). Built 
     Profile Management page (editable info + password change, in-memory 
     only). Decided backend (Flask + MySQL) would come later rather than 
     per-page. Staying on mock JSON/in-JS data for all pages until then.
- [16/07] Installed Python + XAMPP (MySQL). Created `savings_db` with 
     `banks` and `cards` tables (foreign key relationship). Built Flask 
     backend (`app.py`) with `/api/banks` endpoint. Migrated Card 
     Selection page from `banks.json` to the real Flask/MySQL endpoint — 
     first page with a real, working database connection.
- [16/07] Built Benefits/Offers page — new `offers` table (joined with 
     `banks`), `/api/offers` endpoint, category filter UI. Built Merchant 
     Directory page — new `merchants` table, `/api/merchants` endpoint, 
     live search. Built Financial Education page — new `articles` table, 
     `/api/articles` endpoint, expandable article cards. All three 
     connected to real MySQL via Flask from the start.
- [16/07] Confirmed with faculty: 4-5 DB-connected pages is the target 
     for this submission round. Updated README with Update 1 Submission 
     Scope (Landing + 4 DB-connected pages: Card Selection, Benefits, 
     Merchant Directory, Financial Education). Login/Register and Profile 
     explicitly scoped out of this round — UI-only, no backend yet.
- [16/07] Fixed `.gitignore`/venv tracking issue — venv had already been 
     committed before `.gitignore` was added, so the ignore rule wasn't 
     taking effect. Ran `git rm -r --cached venv` to untrack it; 
     `.gitignore` now correctly keeps it out going forward.