# Savings – Smart Bank Card Benefit Discovery

A web app for discovering cashback, discounts, reward points, EMI offers, and merchant deals across banks in Bangladesh. Built as a course project — currently a working prototype, no AI/ML involved.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python (Flask) — also serves the frontend files directly
- Database: MySQL (via XAMPP)
- IDE: VS Code

## Folder Structure
```
savings-project/
├── index.html
├── app.py               ← Flask backend, serves both /api/* routes and the frontend pages
├── venv/                ← local only, not pushed (see .gitignore)
├── database/
│   └── savings_db.sql   ← DB export, import this to get all tables + data
├── css/
│   ├── variables.css    ← shared colors/fonts, import this FIRST on every page
│   ├── nav.css           ← shared navbar
│   └── style.css        ← landing page styles
├── js/
│   ├── nav-auth.js       ← shows Login or [Name]/Logout in navbar based on session
│   └── script.js
├── assets/images/
├── pages/                ← every new page goes here
├── data/                 ← old mock JSON, not used anymore
└── README.md
```

## How to Run This Project (first-time setup)

**1. Install Python**
Download from python.org, and during install check "Add Python to PATH."
Verify: `python --version` in a terminal.

**2. Install XAMPP**
Download from apachefriends.org. After installing, open the XAMPP Control Panel and click **Start** next to both **Apache** and **MySQL**.

**3. Clone the repo and open it in VS Code**
```
git clone https://github.com/Tanzidur/savings-project.git
cd savings-project
```

**4. Import the database**
- Go to http://localhost/phpmyadmin
- Click **New**, name it `savings_db`, click **Create**
- Click the **Import** tab, choose `database/savings_db.sql`, click **Go**
- ⚠️ If `savings_db.sql` hasn't been re-exported recently, it may be missing the `users`, `user_cards`, and `transactions` tables — check with Tanzidur if login/dashboard doesn't work after import.

**5. Set up Python packages**
In VS Code's terminal, from the project folder:
```
python -m venv venv
venv\Scripts\activate
pip install flask flask-mysqldb flask-cors
```

**6. Run the backend**
Still in that terminal (with `(venv)` showing):
```
python app.py
```
Should say `Running on http://127.0.0.1:5000`. Leave this terminal open.

**7. Open the site**
Go to **http://127.0.0.1:5000/** in your browser (not Live Server — Flask now serves the whole site, frontend included). Click through the navbar as normal. After editing any HTML/CSS/JS, refresh the browser manually — no auto-reload since we're not using Live Server anymore.

## Conventions
- Link `css/variables.css` and `css/nav.css` before your own page's stylesheet.
- Use `var(--color-primary)` etc. instead of hardcoding hex colors.
- One CSS file per page (e.g. `login.css`, `dashboard.css`).
- Class naming: lowercase, hyphenated (`.feature-card`, not `.FeatureCard`).
- New pages go in `pages/`, linked via the shared navbar in `css/nav.css`.
- Fetch calls use relative paths (`/api/...`), not full URLs — Flask serves everything from one origin now.

## Pages & Ownership
1. Landing Page ✅ — Tanzidur
2. Login / Register ✅ — Tanzidur (real auth, hashed passwords, persistent sessions)
3. Profile Management — on hold, not connected to real users yet
4. Card Perks (was Card Selection) ✅ — connected to MySQL, filterable grid, "Save to My Account" working
5. Deals & Offers ✅ — connected to MySQL, "Browse by Merchant" tab, links to Offer Detail page
6. Offer Detail ✅ — full offer info, "Pay / Redeem" → Payout
7. Payout ✅ — pick a saved card, static "Payment Successful" screen (no real transaction)
8. Financial Education ✅ — connected to MySQL
9. Dashboard ✅ — logged-in user's name, spending pie chart, recent transactions, saved cards ("My Cards")
10. Admin Panel ✅ — hardcoded admin login, CRUD for banks/cards/merchants (separate from user accounts)

## Update 1 (submitted)
4 pages connected to a real MySQL database through Flask: Card Selection, Benefits, Merchant Directory, Financial Education. Each fetches from its own API route. Landing page included as static context.

## Update 2 (done, submission in progress)
Faculty feedback after Update 1: add real login, and make offers actually actionable (not just browsable). Also restructured naming since Card Selection and Benefits/Offers were confusing people.

### Renaming / restructuring — done
- Card Selection → **Card Perks** (bank-side perks: cashback, points, EMI).
- Benefits/Offers → **Deals & Offers** (merchant-side discounts/BOGOs).
- Merchant Directory → merged into Deals & Offers as a "Browse by Merchant" tab. Old page/files removed.

### 1. Real user login — done
- `users` table, hashed passwords (werkzeug, not plain text).
- `/api/register`, `/api/login`, `/api/logout`, `/api/session` — real Flask sessions, now permanent (24hr) so login survives browser restarts.
- Navbar shows Login link when logged out, or [Name] + Logout when logged in, on every page (`js/nav-auth.js`).
- Dashboard page — welcome message, spending pie chart, transaction list, and a "My Cards" section showing saved cards. Pulls from a `transactions` table. Handles new users with zero transactions gracefully instead of breaking.
- `user_cards` table + "Save This Card to My Account" button on Card Perks — working.
- Card Perks rebuilt as a filterable grid (All/Debit/Credit) instead of flat buttons, to handle 20+ cards cleanly.
- Admin CRUD is separate from user accounts, already built, staying as-is.

### Architecture change: single server
- Flask now serves the frontend pages directly (not just `/api/*`), so the whole site runs from one origin (`http://127.0.0.1:5000`) instead of splitting between Live Server (5500) and Flask (5000).
- Removed the need for a CORS origin whitelist — same-origin requests don't need it.
- All fetch calls switched from full URLs to relative paths (`/api/...`).
- Tradeoff: no more Live Server auto-refresh — manual browser refresh needed after edits.

### 2. Offer → detail → pay → success flow — done
- Click a deal card on Deals & Offers → goes to `offer-detail.html?offerId=X`, a separate page (not a modal — a modal version was tried first but caused a stuck-open/broken-close-button bug that was hard to debug, so switched to a normal page load instead).
- Deal cards themselves were trimmed down to just category/title/merchant/discount + "View Details →", since the full description and validity date were redundant on the card once the detail page existed.
- Detail page → "Pay / Redeem This Offer" → `payout.html?offerId=X` → pick from saved cards (or a message prompting to add one first), enter how much was spent → "Confirm Payment" → static "Payment Successful" screen.
- Redemption now actually writes a real row to `transactions` (category + amount the user entered), tagged with `offer_title` so Dashboard can show "via [Offer Name]" under that entry — distinguishes real redeemed purchases from other spending without needing a separate list. Decided against a fully separate "redeemed offers" list since a redemption is still real spending and belongs in the spending chart.
- Still no real payment gateway — the amount is self-reported by the user, not verified by any processor. Fine for a prototype, worth stating plainly if asked.

### 3. Small polish targets — done (except mobile)
- Toast notifications (`js/toast.js`, `css/toast.css`) replacing `alert()` — used on Login/Register and Payout.
- Loading spinners (`.spinner`/`.loading-state` in `css/nav.css`) replacing plain "Loading..." text across Card Perks, Deals & Offers, Financial Education, Dashboard, Offer Detail, Payout.
- Inline form validation (red border + toast) on Login/Register email and Payout amount.
- Custom 404 page (`pages/404.html`) — wired into Flask's catch-all route directly (not `@app.errorhandler`, since the catch-all route already handles unmatched paths itself and would shadow the error handler).
- Mobile responsiveness pass — skipped for now, not a priority for this round.

## Progress Log
- 14/07 — Project structure set up. Landing page built and styled.
- 14/07 — Added `variables.css`, divided remaining pages among the team.
- 15/07 — Built Login/Register (toggle UI) and Profile pages, in-memory only.
- 16/07 — Installed MySQL (XAMPP) + Flask. Connected Card Selection to real DB.
- 16/07 — Connected Benefits, Merchant Directory, and Financial Education pages to MySQL.
- 16/07 — Scoped Update 1 to the 4 DB-connected pages + landing.
- 16/07 — Fixed venv being tracked in git.
- 19/07 — Added shared navbar to all pages. Fixed font mismatch, navbar spacing, and login page layout bug. Planned Update 2 (real auth + personalization).
- 19/07 — Exported database to `database/savings_db.sql` so teammates can set up MySQL locally. Added step-by-step setup guide to README.
- 19/07 — Faculty feedback after Update 1: add real login + make offers actionable. Planned Update 2: real auth, "Card Perks" vs "Deals & Offers" rename, folding Merchant Directory into Deals & Offers, offer→pay→success flow, small UX polish. Admin CRUD pushed to Update 3.
- 19/07 — Built real login/register (users table, hashed passwords, Flask sessions). Fixed cookie bug caused by localhost vs 127.0.0.1 mismatch. Built Dashboard page with spending pie chart and transaction list. Added `user_cards` table + "Save This Card to My Account" on Card Perks page. Added shared navbar login/logout state (`nav-auth.js`). Merged Merchant Directory into Deals & Offers as a "Browse by Merchant" tab; deleted old merchant-directory files.
- 20/07 — Teammate added static file serving to Flask and tightened CORS — switched the whole project to run through Flask as a single server instead of splitting frontend (Live Server) and backend (Flask). Updated all fetch calls to relative paths. Fixed session persistence so login survives browser restarts (permanent sessions, 24hr). Reverted an accidental security downgrade (HttpOnly cookie flag). Cleaned up debug logging left in app.py, login.js, dashboard.js. Kept useful defensive checks added for users with no transactions yet.
- 09/08 — Rebuilt Card Perks as a filterable grid (All/Debit/Credit) to handle 20+ cards. Added "My Cards" section to Dashboard. Tried a modal for offer details first — caused a stuck-open/unresponsive-close-button bug, switched to a proper separate page instead. Built Offer Detail page and Payout page (pick saved card → static "Payment Successful" screen). Trimmed offer cards on Deals & Offers down to essentials since full info is now on the detail page.