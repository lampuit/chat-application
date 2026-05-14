# Realtime Chat Application

Core realtime chat application built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, and Cloud Firestore.

## Features

- Email/password registration
- Email/password login
- Email verification with resend and in-app verification handling
- Google Authenticator-based 2-step verification with Firebase TOTP MFA
- Logout
- Session persistence through Firebase Auth
- Multi-device login support through Firebase Auth
- Protected `/chat` route
- Registered user directory
- Direct 1-to-1 conversations
- Realtime message updates with Firestore listeners
- Firestore security rules and indexes
- Firebase Storage image uploads for chat messages

## Firebase MFA Prerequisites

Google Authenticator setup in this app depends on Firebase TOTP multi-factor authentication. Before testing or deploying the feature, make sure all of the following are true:

- The Firebase project uses `Firebase Authentication with Identity Platform`.
- TOTP MFA is enabled in the Firebase Authentication project configuration.
- Users verify their email address before attempting to enable 2-step verification.

If TOTP MFA is not enabled in Firebase, the app can still run, but Google Authenticator enrollment will fail when users try to start setup.

## Firebase Email Verification Prerequisites

The full verification flow in this app uses Firebase email action links. Before testing it, make sure:

- The app domain is added to Firebase Authentication `Authorized Domains`.
- Firebase email verification links are allowed to return to this app's `/verify-email` route.
- Your local development origin is also authorized if you test verification emails locally.
- `NEXT_PUBLIC_APP_URL` points to the exact web origin you want Firebase to use for the verification return URL, for example `http://localhost:3000`.

If verification emails still do not send, the most common Firebase cause is an unauthorized continue URL. In Firebase Authentication, add the app domain to `Authorized Domains`. For local development, Firebase notes that in projects created after April 28, 2025, `localhost` is no longer authorized by default and must be added manually.

## Full Auth Flow

1. Register with display name, email, and password.
2. The app sends a verification email immediately after account creation.
3. Click the email link and let Firebase return to `/verify-email`.
4. Sign in and refresh verification status if needed.
5. Re-enter your current password and enable Google Authenticator 2-step verification from `/chat`.
6. On later sign-ins, complete the TOTP challenge with your 6-digit code.

## Out of Scope for Core Version

- Group chat
- Push notifications

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your Firebase web app values.

3. Run the development server:

```bash
npm run dev
```

4. Run tests:

```bash
npm test
```

5. Verify production build:

```bash
npm run build
```

Additional delivery docs:

- [Database spec](/Users/lamp04/project/chat-app/docs/database-spec.md)
- [Deployment guide](/Users/lamp04/project/chat-app/docs/deployment-guide.md)
- [Feature checklist](/Users/lamp04/project/chat-app/docs/feature-checklist.md)
