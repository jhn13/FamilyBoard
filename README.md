# Family board

An always-on kitchen display for an old iPad: the family's iCloud calendar, kids' chores with pocket money, a shared to-do list, and a photo screensaver. Phones open the same site to add to-dos and approve chores. It runs as a Cloudflare Worker.

- `public/` is the page (`index.html`, `app.css`, `app.js`, fonts and icons), served as static files.
- `src/index.js` is the Worker. Everything under `/api/` needs a connected device (a long-lived cookie set after entering the parent PIN once).
  - `src/api.js`: board state and every change (`/api/state`, `/api/do`)
  - `src/auth.js`: parent PIN (PBKDF2-hashed, locks for 10 minutes after 5 wrong tries) and connected devices
  - `src/calendar.js`: reads published iCloud calendar links (repeats, exceptions and time zones handled by `ical.js`), cached for 10 minutes
  - `src/photos.js`: reads an iCloud shared album with Public Website switched on, cached for 30 minutes
- `wrangler.jsonc` is the config. The D1 database `family-board-db` is created automatically on the first deploy.

Every push to `main` redeploys through Cloudflare Workers Builds (deploy command `npx wrangler deploy`). Open iPads reload themselves into the new version the next time the screensaver comes on.

## Setting up the iPad

1. Open the site in Safari, choose the parent PIN, then add the family and chores in Settings.
2. Share button, then Add to Home Screen. Open it from the new icon so it runs full screen.
3. Settings, Display & Brightness, Auto-Lock: Never.
4. Settings, Accessibility, Guided Access: on. Open the board, triple-click the Home button and start Guided Access so it stays on the board.
5. Optional: a Shortcuts automation to lower the brightness at bedtime and raise it in the morning.

## Pocket money

Kids tick a chore and it waits for a parent's OK. A parent approves it with the PIN on the iPad or a phone, or ticks it straight away while parent mode is on. Approved money builds up per child until a parent marks it as paid in Settings, Pocket money.
