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
- Firebase Cloud Messaging push notifications for new messages

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

## Firebase Cloud Messaging Prerequisites

Push notifications in this app depend on Firebase Cloud Messaging for Web. Before testing or deploying them, make sure:

- Firebase Cloud Messaging is enabled for the project.
- Web Push certificates are configured in Firebase and you have the public VAPID key.
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is set to that public VAPID key in the app environment.
- The app origin you use in development or production is served over HTTPS, or `http://localhost` for local testing.
- Users enable notifications from the in-app prompt before expecting this device to receive pushes.

## Full Auth Flow

1. Register with display name, email, and password.
2. The app sends a verification email immediately after account creation.
3. Click the email link and let Firebase return to `/verify-email`.
4. Sign in and refresh verification status if needed.
5. Re-enter your current password and enable Google Authenticator 2-step verification from `/chat`.
6. On later sign-ins, complete the TOTP challenge with your 6-digit code.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your Firebase web app values.

3. Install the Firebase Functions workspace dependencies:

```bash
cd functions && npm install
```

4. Run the development server:

```bash
npm run dev
```

5. Run tests:

```bash
npm test
```

6. Verify production build:

```bash
npm run build
```

## Deployment & Published Link

- Deployed site (production): https://chat-application-ruby-six.vercel.app

## Database Specification

- Detailed database schema and rules: [Database specification](docs/database-spec.md)

## Completed Features (summary)

The following core features are implemented and available in this repository:

- User registration (email/password)
- User login and logout
- Email verification flow with action links
- Two-factor authentication (TOTP) support (Google Authenticator)
- Session persistence via Firebase Auth
- Multi-device sign-in support
- Protected `/chat` route requiring authentication
- Registered user directory
- Direct 1-to-1 conversations (create/open), group chat
- Realtime message updates via Firestore listeners
- Message timestamps and ordering
- Firestore security rules and indexes
- Firebase Storage image, file uploads for chat messages
- Firebase Cloud Messaging push notifications (client + Cloud Functions)

If you want these feature entries in a separate `FEATURES.md` file or linked from the project homepage, tell me and I will add it.
