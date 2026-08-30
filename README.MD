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
├── .env                  ← Gemini API keys (GEMINI_API_KEYS=key1,key2,...), NOT pushed to git
├── .gitignore
├── venv/                ← local only, not pushed (see .gitignore)
├── database/
│   └── savings_db.sql   ← full schema + sample data (import this file only)
├── images/
│   └── hero-bg.jpg      ← landing-page hero background (Unsplash)
├── css/
│   ├── variables.css        ← shared colors/fonts, import this FIRST on every page
│   ├── nav.css               ← shared navbar, spinner/loading-state styles
│   ├── toast.css             ← toast notification styling
│   ├── style.css             ← landing page styles
│   ├── login.css
│   ├── card-selection.css
│   ├── card-picker.css
│   ├── benefits.css
│   ├── financial-education.css
│   ├── dashboard.css
│   ├── offer-detail.css
│   ├── payout.css
│   ├── profile.css
│   ├── receipt-upload.css
│   └── transaction-detail.css
├── js/
│   ├── nav-auth.js           ← shows Login or [Name]/Logout in navbar based on session
│   ├── toast.js               ← showToast() helper, used instead of alert()
│   ├── script.js
│   ├── login.js
│   ├── card-selection.js
│   ├── card-picker.js
│   ├── benefits.js
│   ├── financial-education.js
│   ├── dashboard.js
│   ├── offer-detail.js
│   ├── payout.js
│   ├── profile.js
│   ├── receipt-upload.js
│   └── transaction-detail.js
├── pages/                    ← every new page goes here
│   ├── login.html
│   ├── card-selection.html
│   ├── card-picker.html
│   ├── benefits.html
│   ├── financial-education.html
│   ├── dashboard.html
│   ├── offer-detail.html
│   ├── payout.html
│   ├── profile.html
│   ├── receipt-upload.html
│   ├── transaction-detail.html
│   └── 404.html
├── admin/                    ← Admin Panel — deliberately grouped by feature, not type (breaks the pages/css/js convention above, kept as-is since it was already built this way and remerging would cost more than it's worth at this point)
│   ├── login.html, dashboard.html, banks.html, cards.html, offers.html, merchants.html, articles.html
│   ├── css/admin.css
│   └── js/ (admin-auth.js, admin-login.js, dashboard.js, banks.js, cards.js, offers.js, merchants.js, articles.js)
└── README.md
```
Note: early plans mentioned a `data/` folder that was never used once MySQL was set up. Hero art lives in `images/`.

⚠️ **Anyone pulling this repo needs their own `.env` file** — it's git-ignored on purpose (API keys shouldn't be committed). Ask Tanzidur for keys, or register your own free Gemini API keys at aistudio.google.com/app/apikey and add them as `GEMINI_API_KEYS=key1,key2,key3` in a `.env` file at the project root. Receipt upload won't work without this, but the rest of the site is unaffected.

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
- If `savings_db` already exists from an older import, drop it first (or the import will replace tables)
- Click **New**, name it `savings_db`, click **Create**
- Click the **Import** tab, choose `database/savings_db.sql`, click **Go**
- That one file is the full current schema (watchlist, monthly savings, profile verification columns, sample banks/cards/offers).

**5. Set up Python packages**
In VS Code's terminal, from the project folder:
```
python -m venv venv
venv\Scripts\activate
pip install flask flask-mysqldb flask-cors werkzeug requests python-dotenv
```

**6. Run the backend**
Still in that terminal (with `(venv)` showing):
```
python app.py
```
Should say `Running on http://127.0.0.1:5000`. Leave this terminal open.

**7. Open the site**
Go to **http://127.0.0.1:5000/** in your browser (not Live Server — Flask serves the whole site, frontend included). After editing any HTML/CSS/JS, refresh the browser manually — no auto-reload.

## Conventions
- Link `css/variables.css` and `css/nav.css` before your own page's stylesheet. Add `css/toast.css` too if the page uses `showToast()`.
- Use `var(--color-primary)` etc. instead of hardcoding hex colors.
- One CSS file per page (e.g. `login.css`, `dashboard.css`).
- Class naming: lowercase, hyphenated (`.feature-card`, not `.FeatureCard`).
- New pages go in `pages/`, linked via the shared navbar in `css/nav.css`.
- Fetch calls use relative paths (`/api/...`), not full URLs — Flask serves everything from one origin now.
- Use `showToast(message, 'success' | 'error')` instead of `alert()` for user feedback.

## Pages & Ownership
1. Landing Page ✅ — Tanzidur
2. Login / Register ✅ — Tanzidur (real auth, hashed passwords, persistent sessions)
3. Profile Management ✅ — Tanzidur (edit name/email, change password, account verification)
4. Card Perks (was Card Selection) ✅ — Tanzidur — connected to MySQL, filterable grid, save/remove cards, side-by-side compare (up to 3 cards)
5. Deals & Offers ✅ — Tanzidur — connected to MySQL, "Browse by Merchant", search, For You, watchlist (star + Watchlist tab), hide expired by default
6. Best Card Picker ✅ — Tanzidur — ranks saved cards (or the full catalog) by estimated savings; merchant/category must match a real purchase
7. Offer Detail ✅ — Tanzidur — full offer info, watchlist, "Pay / Redeem" → Payout
8. Payout ✅ — Tanzidur — pick a saved card, enter amount spent, writes a real transaction with estimated savings
9. Financial Education ✅ — Tanzidur — MySQL articles, topic filters, glossary, extra guides
10. Dashboard ✅ — Tanzidur — spending pie chart, monthly savings, watchlist expiry strip (14 days), recent transactions, My Cards, Settings
11. Receipt Upload ✅ — Tanzidur — upload a photo, Gemini AI extracts category/amount/description, user confirms before saving
12. Transaction Detail ✅ — Tanzidur — click any transaction on Dashboard to see its full description
13. Admin Panel ✅ — Afid & Tarif — full CRUD for banks, cards, offers (with expiry), merchants, and articles. Hardcoded admin login, separate session flag from customer accounts. Admin link in the footer hides itself when a customer is logged in.

For a more detailed record of changes, **refer to the git commits** (`git log`).

## Update 1 (submitted)
4 pages connected to a real MySQL database through Flask: Card Selection, Benefits, Merchant Directory, Financial Education. Each fetches from its own API route. Landing page included as static context.

## Update 2 (submitted)
Faculty feedback after Update 1: add real login, and make offers actually actionable (not just browsable).

- **Renamed pages** — Card Selection → Card Perks, Benefits/Offers → Deals & Offers. Merchant Directory merged into Deals & Offers as a "Browse by Merchant" tab.
- **Real user login** — `users` table, hashed passwords, real Flask sessions (permanent, 24hr). Navbar reflects login state site-wide (`nav-auth.js`).
- **Dashboard** — spending pie chart, transaction list, saved cards ("My Cards"). Handles new users with no data gracefully.
- **Save cards to account** — `user_cards` table, working from Card Perks.
- **Card Perks rebuilt** as a filterable grid (Debit/Credit) to handle 20+ cards.
- **Single-server architecture** — Flask now serves the frontend directly, not just `/api/*`. Removed CORS complexity, all fetches use relative paths. Tradeoff: no more Live Server auto-refresh.
- **Offer → detail → pay → success flow** — click a deal → separate detail page → Pay/Redeem → payout page → pick saved card, enter amount → confirms and writes a real row to `transactions`, tagged with the offer's name so Dashboard can show "via [Offer Name]". Still no real payment gateway — amount is self-reported, not verified.
- **Polish pass** — toast notifications replacing `alert()`, loading spinners, inline form validation (email, amount), custom 404 page wired into Flask's catch-all route. Mobile responsiveness skipped for this round.

## Update 3 (submitted)

Faculty feedback: add receipt OCR for automatic transaction logging, build out the full Admin Panel, and round out the product with profile/card editing and real-time offer expiry.

### 1. Receipt OCR → auto-add transaction
- New page `pages/receipt-upload.html`, linked from Dashboard. User uploads a photo, it's sent to `/api/ocr-receipt`.
- Uses Google Gemini (`gemini-3.5-flash-lite` — free tier, vision-capable). Model name needed updating once already when Google deprecated `gemini-2.5-flash-lite` mid-project — worth expecting this to happen again occasionally, it's normal for AI APIs.
- Multi-key rotation: `.env` holds `GEMINI_API_KEYS=key1,key2,key3,...` (comma-separated, any number of keys). Backend tries each key in order on a 429/failure before giving up — solves the free-tier rate-limit problem directly.
- Extracted category (from a fixed list matching the app's existing categories), amount, and description are shown in an editable form — user confirms before anything is saved, rather than auto-inserting blindly (OCR can misread things).
- Confirmed save goes through a new generic `/api/add-transaction` route (separate from `/api/redeem`, which is specifically for offer redemptions).
- `transactions` table gained a `description` column. Redeemed offers now also populate `description` (using the offer's title) so both OCR'd and redeemed transactions look consistent when viewed.

### 2. Admin Panel
- Login page (hardcoded credentials, no separate `admins` table), protected panel with a sidebar layout, all under `/api/admin/...` routes guarded by an `@admin_required` decorator (separate session flag from customer login — the two don't conflict).
- Banks, Cards, Merchants, and Articles/Financial Education — full add/edit/delete for each, with foreign-key-aware delete protection (e.g. can't delete a bank still referenced by cards or offers).
- Offers CRUD (including validity date) + real-time expiry — an offer's `is_expired` status is computed server-side (`valid_until < CURDATE()`) so it's consistent regardless of a visitor's local clock. Expired offers show grayed out with a red "Expired" badge on Deals & Offers (sorted to the bottom, not hidden), and their detail page shows a disabled "Offer Expired" button instead of the Pay/Redeem link.
- Admin footer link on the landing page now hides itself when a customer session is active (UX only — the actual admin password check is what gates real access, not the link's visibility).
- Added more sample offers with a mix of past and future `valid_until` dates so expiry is visibly demonstrable, not just theoretical.

### 3. Rounding out the product
- Profile Management built from scratch (`/api/profile` GET/PUT, `/api/profile/password` PUT) — edit name/email, change password (requires current password to confirm). Settings on Dashboard links to Profile; clicking your name in the navbar goes to Dashboard.
- Saved cards can now be removed, not just added — `DELETE /api/my-cards/<card_id>` on Dashboard's "My Cards" section.
- Dashboard transactions are now clickable — go to a Transaction Detail page showing the full description (from OCR or a redeemed offer's title), with a visible hover state on each row.

**Merge notes:** The admin work was built independently and somewhat differently structured — merging required standardizing on one shared `admin_required` decorator/session pattern and folding offers-specific routes/UI into that same structure rather than keeping two separate admin systems.

## Update 4
Faculty feedback after Update 3: more product features (92/100). This update turns the catalog into a decision tool.

- **Best Card Picker** — `GET /api/recommend` ranks saved cards (fallback: all cards) by estimated savings. Matching non-expired offers beat a card's cashback rate when the discount parses higher. BOGO is counted as 50% of spend for ranking (documented demo assumption); Free Item is a labeled bonus, not a fake percent.
- **Personalized deals** — search by title/merchant/bank, For You (offers for banks of saved cards), ending-soon sort, expired hidden unless "Show expired" is checked.
- **Card compare** — select up to 3 cards on Card Perks; table includes estimated yearly cashback minus annual fee from a sample monthly spend (default 20,000 BDT).
- **Watchlist** — `offer_watchlist` table; star on deal cards and Offer Detail. Dashboard lists watched offers expiring within 14 days.
- **Monthly savings** — redeem writes `transactions.savings_amount`. Dashboard shows "This month you saved … BDT". A fresh install should import `database/savings_db.sql` only.

## Update 5
Logic and polish before faculty review.

- **Best Card Picker matching** — merchant + category must both fit a real purchase (e.g. Dining + Apex is rejected because Apex is Shopping). Category-only with no live deals shows an empty state instead of ranking every card by cashback.
- **Watchlist list** — Deals & Offers has a Watchlist tab and filter so starred offers have a place to be viewed, not only a star icon.
- **Account verification fix** — larger Settings button on Dashboard; 3-step verification (phone → NID → confirm). After confirm, the account stays **Verified** and the wizard does not loop.
- **Single database dump** — `database/savings_db.sql` is the only file to import (watchlist, savings_amount, verification columns, sample data). Patch SQL files removed.
- **Landing page background** — Unsplash hero photo behind the home headline (`images/hero-bg.jpg`).
- **Financial Education** — habit cards, redeem checklist, topic filters, glossary, extra guides (debit vs credit, fee vs cashback, reading offers, OTP safety).

## Update 6
Receipt-to-offer matching and savings insights.

- **Receipt-to-Offer Matching** — after Gemini reads a receipt, the user can confirm the merchant, amount, category, and card used. The app checks active merchant offers server-side, including expiry, minimum spend, eligible bank/card type, and discount caps.
- **Clear outcome** — the receipt flow now says either “Eligible offer used” with the estimated saving, or “You could have saved…” with the qualifying card and offer. Only a server-verified eligible match is saved as an offer saving.
- **Attribution for insights** — matched receipt and redeem transactions store their offer and card IDs, so savings are linked to the category, partner bank, and actual saved card that produced them.
- **Monthly Savings Goal** — Dashboard users can set a BDT target, see month-to-date progress, and update the goal at any time.
- **Savings Insights** — Dashboard shows savings by category, by bank, and the user’s most valuable card for the current month. Transaction details also show recorded savings.

## Progress Log
For a more detailed timeline, refer to the git commits (`git log`).

- 14/07 — Project structure set up, landing page built, `variables.css` added, pages divided among the team.
- 15/07 — Login/Register page built (UI only, in-memory). Profile Management planned but not started at this point.
- 16/07 — MySQL + Flask set up. Card Selection, Benefits, Merchant Directory, Financial Education connected to real DB. Update 1 scoped and submitted.
- 19/07 — Shared navbar added site-wide, layout/font bugs fixed. Update 2 planned with faculty feedback: real auth, page renames, offer→pay flow.
- 19/07 — Real login/register built (hashed passwords, sessions). Dashboard built with spending chart. Cards can be saved to account. Merchant Directory merged into Deals & Offers.
- 20/07 — Switched to single-server architecture (Flask serves frontend + API). Session persistence fixed. Cleaned up debug code from a teammate's CORS fix.
- 09/08 — Card Perks rebuilt as a filterable grid. Offer Detail and Payout pages built (redeem flow, static success screen). "My Cards" added to Dashboard.
- 09/08 — Redemptions now write real transactions, tagged with the offer name. Added toast notifications, loading spinners, form validation, and a custom 404 page. Update 2 submitted.
- 09/08 — Planned Update 3 with faculty feedback: receipt OCR, full Admin Panel, profile/card editing, real-time offer expiry. Work divided among the team.
- 22/08 — Receipt OCR built end-to-end: upload page, Gemini API integration with multi-key rotation, editable confirm step, saves to a real transaction. Profile Management built from scratch. Saved cards can now be removed. Transactions are clickable, showing full details on their own page.
- 22/08 — Moved Profile access from navbar name-click to a dedicated Settings control on Dashboard — clicking your name goes back to Dashboard. Fixed Dashboard's missing `.btn-primary` style (Upload Receipt button was rendering as a plain unstyled link). Update 3 customer-facing work complete — Admin Panel remains for this update.
- 23/08 — Independently-built Admin Panels merged into one, standardizing on a shared `admin_required`/session pattern and sidebar layout. Full CRUD live for banks, cards, merchants, articles, and offers. Real-time offer expiry built and demonstrable (added sample offers with past/future dates). Admin footer link now hides for logged-in customers. Update 3 submitted — all three faculty-requested items complete.
- 28/08 — Update 4: Best Card Picker, For You + search on Deals, side-by-side card compare, offer watchlist with 14-day expiry strip, and monthly savings on Dashboard.
- 28/08 — Best Card Picker: merchant and category must both match a real purchase (Dining + Apex no longer ranks). Category-only with no live deals shows an empty state. Watchlist tab/filter added on Deals & Offers.
- 28/08 — Dashboard Settings enlarged; 3-step account verification (phone, NID, confirm). After verify, the wizard stops and the account stays marked Verified.
- 29/08 — Update 5: single `savings_db.sql` dump (patch SQL files removed), Unsplash landing-page hero background, Financial Education expanded (tips, checklist, filters, glossary, extra guides).
- 31/08 — Update 6: Receipt-to-Offer Matching added to the OCR flow. It verifies active offer conditions against the receipt and selected card, identifies used versus missed savings, and stores verified savings with offer/card attribution.
- 31/08 — Dashboard expanded with a monthly savings goal and progress bar, savings by category and bank, and “most valuable card” insight based on recorded savings.
