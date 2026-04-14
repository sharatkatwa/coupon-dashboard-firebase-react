# Pry's Lucky Draw Admin

Admin dashboard for managing customer coupon entries, selecting lucky draw winners, and opening WhatsApp-ready messages.

## Tech Stack

- React + Vite
- Firebase Authentication
- Firestore
- Tailwind CSS
- Vercel for hosting

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from `.env.example`.

3. Start the app:
```bash
npm run dev
```

## Environment Variables

Add these variables locally and in Vercel Project Settings:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Firebase Production Checklist

Before deploying, confirm all of these in Firebase:

1. Enable Email/Password sign-in in Authentication.
2. Create the admin user account you will use to log in.
3. Add your Vercel production domain to Firebase Authentication Authorized Domains.
4. Create Firestore Security Rules so only authenticated admins can read and write sensitive data.
5. Make sure the `customers` and `winners` collections exist or can be created by your rules.

Example Firestore rules starter:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{document=**} {
      allow read, write: if request.auth != null;
    }

    match /winners/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Deploy To Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Add all `VITE_FIREBASE_*` environment variables in Vercel.
6. Deploy.

This repo includes `vercel.json` so React routes like `/add-customer` and `/pickwinner` correctly resolve to `index.html`.

## Production Notes

- Firebase keys are loaded from environment variables now.
- Firestore is initialized with `experimentalAutoDetectLongPolling` for better browser/network compatibility.
- The customer entry form enforces the Rs. 2400 minimum purchase rule.
- WhatsApp sending still uses `wa.me`, which opens WhatsApp with a prefilled message. It does not send messages automatically from a backend service.
