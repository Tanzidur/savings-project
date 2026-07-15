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
├── css/
│   ├── variables.css   ← shared colors/fonts, import this FIRST on every page
│   └── style.css       ← landing page styles
├── js/
│   └── script.js
├── assets/images/
├── pages/               ← every new page goes here
├── data/                ← mock JSON "database" files
└── README.md
## Shared Conventions (read before coding)
- Always link `css/variables.css` before your own page's stylesheet.
- Use `var(--color-primary)` etc. instead of hardcoding hex colors.
- One CSS file per page (e.g. `login.css`, `dashboard.css`) — don't dump everything into one giant stylesheet.
- Class naming: lowercase, hyphenated (`.feature-card`, not `.FeatureCard` or `.feature_card`).
- Every new page file goes inside `pages/`, and mock data goes inside `data/` as `.json`.

## Pages & Ownership
1. **Landing Page** ✅ done — Tanzidur Rahman
2. **Login / Register Page** ✅ done — Tanzidur Rahman
3. **Profile Management** — assigned to: ___
4. **Card Selection Page** — assigned to: ___
5. **Benefits/Offer Page** — assigned to: ___
6. **Merchant Directory Page** — assigned to: ___
7. **Financial Education Page** — assigned to: ___
8. **Dashboard Page** (spending pie chart + transaction history) — assigned to: ___
9. **Admin Panel** (manage banks, cards, offers, users) — assigned to: ___

*(Fill in names once you all agree — page count may still grow as we refine features.)*

## Update 1 – Goals (Database Connection + Spending Chart)
Instructor requirement for this milestone: show the frontend actually pulling 
from a database (mocked as JSON for the prototype) and display a spending/
transaction visualization.

- [ ] Create `data/banks.json` — mock "database" with a few banks, each 
      listing available card types (network: Visa/Mastercard/NPSB, 
      type: Debit/Credit, tier: Classic/Gold/Platinum/Signature) and their 
      benefits (cashback %, reward points, EMI availability).
- [ ] Use JavaScript `fetch()` to load `banks.json` and dynamically render 
      bank + card info onto the page (DOM manipulation, not hardcoded HTML) 
      — this is the "database connection" part.
- [ ] Create `data/transactions.json` — mock transaction history with 
      category + amount fields.
- [ ] Add Chart.js pie chart on the Dashboard page, fed by 
      `transactions.json`, to visualize spending by category.
- [ ] Demo: page loads → JS fetches JSON → banks/cards list renders → 
      pie chart renders — proves data-driven UI end to end.

## Update 2 – Planned (Backend Migration: Flask + MySQL)
Not started yet. To be tackled as a deliberate, team-wide milestone once 
more pages exist and data shape is settled — not page-by-page.

- [ ] Install & set up MySQL, design real schema (Users, Banks, Cards, 
      Card Types, Merchant Offers, Cashback Offers, Reward Points).
- [ ] Set up Flask project (separate from frontend files) with API routes 
      (e.g. `/api/profile`, `/api/banks`, `/api/cards`).
- [ ] Migrate mock JSON files (`data/*.json`) into actual MySQL tables — 
      same data shape, just swapping "read from file" for "query DB."
- [ ] Rewire frontend JS to use `fetch()` calls to Flask endpoints instead 
      of only updating the DOM locally (currently used in Profile, Login).
- [ ] Handle CORS + run frontend and Flask backend concurrently during dev.
- Until this is done: all pages continue using mock JSON / in-memory JS 
  updates only. Avoid building anything that assumes a live backend.

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
     only). Decided backend (Flask + MySQL) is a separate future 
     milestone — see Update 2 above. Staying on mock JSON/in-JS data 
     for all pages until then.
