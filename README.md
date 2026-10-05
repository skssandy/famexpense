# FamExpenses — personal family expense tracker (for you + your wife)

Standalone personal app. 100% free. PWA installable on Android + iPhone, offline-first, shared auto-sync via Google Sheets (like shared Excel).

## What you got (V1 locked)
- ➕ Add income/expense: date, ₹ amount, category, UPI/Cash/Card/Bank, note, by Me/Wife
- 🏠 Monthly dashboard: income, expense, balance, savings %, Me vs Wife split
- 🎯 Monthly category budgets with 80%/100% alerts
- 🐷 Savings goals with target + deadline + contributions
- 💡 Rule-based save-money tips (food %, fun %, tiny UPI leaks, over-budget)
- 📊 Month-end report + CSV + WhatsApp share + Print/PDF
- 🔄 Shared sync: both phones → same Google Sheet → Sync now + auto-push
- 📴 Offline: works without internet, syncs later. Backup/Restore JSON.

## Run locally (2 min)
```powershell
cd family-expense-tracker
python -m http.server 8080
# open http://localhost:8080
```

## Free hosting (pick one, both free forever)
### Option A — GitHub Pages (recommended)
1. Create free GitHub account → New repo `famexpenses` (public)
2. Upload all files in this folder to repo root
3. Repo Settings → Pages → Deploy from branch → `main` / root → Save
4. You get `https://YOURNAME.github.io/famexpenses/` — open on both phones → Share → Add to Home Screen

### Option B — Cloudflare Pages (also free)
1. dash.cloudflare.com → Pages → Upload assets → drag this folder
2. You get `https://famexpenses.pages.dev` — same install step

> Why not S3? S3 static hosting is NOT free forever + needs AWS card + no auto-sync. GitHub/Cloudflare Pages = free forever + HTTPS + installable link. Code stays yours.

## Shared sync setup (5 min, once, free)
You wanted "like Google sheets, 2 users same sheet":
1. Go to sheets.new (login with your Gmail) → name it `FamExpenses`
2. Extensions → Apps Script → delete default code → paste `apps-script/Code.gs`
3. Change `SECRET = 'CHANGE-ME...'` to your own word, e.g. `sandy-family-2026` → Save
4. Deploy → New deployment → type Web app → Execute as: Me → Who has access: **Anyone** → Deploy → Authorize → Copy Web App URL (`.../exec`)
5. Open app → More → paste Web App URL + same secret on YOUR phone → Save → Sync now
6. Share Sheet with wife's Gmail (Editor) + give her same URL + secret → she taps Sync now
7. Done — both add expenses, both see same data. Sheet tabs Entries/Budgets/Goals auto-created.

## Daily use
- Top bar: switch Me/Wife before adding. Rename to your names in More → Data.
- Add tab → Expense/Income → Save. Works offline.
- Home → switch month ‹ ›. Budgets tab → set Food 10000 etc. Goals tab → Emergency fund.
- Month end → More → WhatsApp / Print report.

## Privacy
Data lives on your phones + your Google Sheet. No third-party server. Secret blocks random writes.

## Next ideas (V2, say the word)
Recurring rent/EMI auto-add, bill photo to Drive, per-person budgets, yearly view, Tamil/Hindi labels, PIN lock.
