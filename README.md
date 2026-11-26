# MLA Diary — Mian Law Associates

An offline, password-locked case diary and fee register (cases, clients, hearing dates, instalments, expenses, receipts, documents, reports), English/Urdu.

- **Data never leaves the device.** Everything is stored in the browser's IndexedDB, encrypted with AES-256-GCM using a key derived from the user's password (PBKDF2-SHA-256, 310,000 iterations). This repository holds only the app's code.
- **Backups** are encrypted `.json` files that open only with the password they were made under.
- Works offline after the first visit (service worker). Install: Safari → Share → Add to Home Screen, or Chrome → Install app.
- A forgotten password cannot be recovered; restore from a backup instead.

Libraries (vendored): jsPDF 2.5.1, jsPDF-AutoTable 3.8.2, SheetJS 0.18.5.
