# Realtime Chat Application

Core realtime chat application built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, and Cloud Firestore.

## Features

- Email/password registration
- Email/password login
- Logout
- Session persistence through Firebase Auth
- Multi-device login support through Firebase Auth
- Protected `/chat` route
- Registered user directory
- Direct 1-to-1 conversations
- Realtime message updates with Firestore listeners
- Firestore security rules and indexes
- Firebase Storage image uploads for chat messages

## Out of Scope for Core Version

- Group chat
- Two-factor authentication
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

