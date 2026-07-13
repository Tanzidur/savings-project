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
2. **Login / Register Page** — assigned to: ___
3. **Profile Management** — assigned to: ___
4. **Card Selection Page** — assigned to: ___
5. **Benefits/Offer Page** — assigned to: ___
6. **Merchant Directory Page** — assigned to: ___
7. **Financial Education Page** — assigned to: ___
8. **Dashboard Page** (spending pie chart + transaction history) — assigned to: ___
9. **Admin Panel** (manage banks, cards, offers, users) — assigned to: ___

*(Fill in names once you all agree — page count may still grow as we refine features.)*

## Progress Log
- [14/07] Set up project structure (index.html, css/, js/, assets/).
  Built landing page: navbar, hero section, features grid (4 cards), 
  footer. Fully styled, static (no JS interactivity yet).
- [14/07] Added shared css/variables.css for consistent colors/fonts 
  across all pages. Divided remaining pages among 3 team members 
  (see Pages & Ownership above).
- [14/07] Connected variables.css to landing page, moved hardcoded 
     hex colors to CSS variables. Landing page complete and stable.