# Database Specification

## Authentication

- Provider: Firebase Authentication
- Methods: email and password
- Session persistence: managed by Firebase Auth
- Multi-device support: allowed by default

## Collections

### `users/{uid}`

```ts
{
  uid: string; // document id
  email: string; // email used for auth
  displayName?: string | null;
  photoURL?: string | null;

  // FCM tokens for push notifications. Stored as an array of strings.
  // Keep tokens deduplicated. Consider a `devices/` subcollection for richer device metadata.
  fcmTokens?: string[];

  // Timestamps
  createdAt: serverTimestamp();
  updatedAt: serverTimestamp();
  lastSeenAt?: serverTimestamp();
}
```

### `conversations/{conversationId}`

```ts
{
  // type: behavior and validation vary by type
  // - "direct": one-to-one conversation between exactly two members
  // - "group": multi-member conversation (3+)
  type: "direct" | "group";

  // IDs of members (uids). For `direct` conversations length === 2.
  memberIds: string[];

  // For `direct` conversations a canonical memberKey (e.g. sorted pair) helps dedupe creation.
  memberKey?: string;

  // Optional group metadata
  title?: string | null;
  adminIds?: string[]; // uids with moderation privileges in group chats

  // Denormalized last-message fields for fast listing.
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: serverTimestamp();

  createdAt: serverTimestamp();
  updatedAt: serverTimestamp();
}
```

### `conversations/{conversationId}/messages/{messageId}`

```ts
{
  conversationId: string; // optional redundancy
  senderId: string; // uid of the sender

  // Message type guides rendering and validation
  type: "text" | "image" | "system" | "attachment";

  // Text payload (for text/system messages)
  text?: string;

  // Attachments array for images/files
  attachments?: Array<{
    id: string; // storage id or reference
    url?: string; // optional pre-signed url or storage path
    contentType?: string;
    name?: string;
    size?: number;
  }>;

  // Optional edit / delete metadata
  editedAt?: serverTimestamp();
  deleted?: boolean;

  createdAt: serverTimestamp();
}
```

## Indexes

- `conversations.memberIds array-contains + lastMessageAt desc` — used for listing a user's conversations ordered by recent activity.
- `messages.createdAt asc` — used for message history pagination.

Notes on indexing:
- If using collection-group queries for messages across conversations, include `conversationId` and `createdAt` ordering as needed.
- Keep composite indexes minimal and add only as query patterns demand.

## Security Rules Summary

- `users/{uid}`
  - Read: authenticated users may read public profile fields (displayName, photoURL).
  - Write: only the authenticated user may update their own profile document.
  - `fcmTokens` updates should be restricted so clients only add/remove tokens on their own user document; server-side cleanup should remove permanently invalid tokens.

- `conversations/{conversationId}`
  - Read: only members listed in `memberIds` may read the conversation document.
  - Create:
    - `direct` conversations must include exactly two member ids and the authenticated user must be one of them. Server-side dedupe via `memberKey` is recommended.
    - `group` conversations must include at least 3 member ids and should include the creator in `adminIds`.
  - Update: member and admin modifications should be restricted to `adminIds` for groups; `lastMessage*` fields may be updated by server-side functions when messages are written.

- `conversations/{conversationId}/messages/{messageId}`
  - Create: only authenticated users whose uid is in the parent conversation's `memberIds` may create a message, and `senderId` must equal the authenticated uid.
  - Validation: enforce allowed `type` values and attachment field shapes; prevent clients from setting `createdAt` other than via server `serverTimestamp()` where possible.

Additional operational notes:

- Keep `fcmTokens` sized reasonably; for richer device metadata and per-device control, prefer a `users/{uid}/devices/{deviceId}` subcollection with one document per device.
- Denormalize `lastMessage*` fields in `conversations/` to avoid expensive reads when listing conversations.
- Use Cloud Functions for token hygiene (removing invalid FCM tokens on send failures) and to enforce invariants that are hard to express in security rules.


