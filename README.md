# MLA Diary — Mian Law Associates

## 👉 [Open the MLA Diary app](https://aqilnawaz-sketch.github.io/mla-diary/)

This page only stores the app's code. Open the link above, then use **Add to Home Screen** (iPhone) or **Install** (laptop Chrome) to get the app icon.

An offline, password-locked case diary and fee register (cases, clients, hearing dates, instalments, expenses, receipts, documents, reports), English/Urdu.

- **Data never leaves the device.** Everything is stored in the browser's IndexedDB, encrypted with AES-256-GCM using a key derived from the user's password (PBKDF2-SHA-256, 310,000 iterations). This repository holds only the app's code.
- **Backups** are encrypted `.json` files that open only with the password they were made under.
- Works offline after the first visit (service worker). Install: Safari → Share → Add to Home Screen, or Chrome → Install app.
- A forgotten password cannot be recovered; restore from a backup instead.

Libraries (vendored): jsPDF 2.5.1, jsPDF-AutoTable 3.8.2, SheetJS 0.18.5.

## Shared office mode (optional, free Firebase)
When `config.js` holds a Firebase web config, the advocate and the munshi share one diary:
- Sign in once per device (Firebase Authentication, email + password), then unlock with a personal app password.
- Every case and client is encrypted on the phone with an office key before upload; fee records use a separate key that only the advocate holds, and `firestore.rules` also blocks the munshi from the fee collection.
- Works offline; changes sync when online. Documents under ~700 KB are shared; larger ones stay on the device that added them.
