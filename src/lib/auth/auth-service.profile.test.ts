import { describe, expect, it, vi } from "vitest";
import type { UserCredential } from "firebase/auth";
import {
  buildUserProfile,
  registerWithEmailAndPassword,
  syncUserProfile,
} from "@/lib/auth/auth-service";

describe("buildUserProfile", () => {
  it("builds a mirrored Firestore user profile with server-managed timestamps", () => {
    const timestampToken = { ".sv": "serverTimestamp" };

    expect(
      buildUserProfile(
        {
          uid: "user-1",
          email: "user@example.com",
          displayName: null,
          photoURL: null,
        },
        timestampToken,
      ),
    ).toEqual({
      uid: "user-1",
      email: "user@example.com",
      displayName: "user",
      photoURL: null,
      createdAt: timestampToken,
      updatedAt: timestampToken,
      lastSeenAt: timestampToken,
    });
  });
});

describe("syncUserProfile", () => {
  it("writes the profile document with merge semantics", async () => {
    const setDoc = vi.fn().mockResolvedValue(undefined);
    const doc = vi.fn().mockReturnValue("users/user-1");
    const timestampToken = { ".sv": "serverTimestamp" };

    await syncUserProfile(
      {
        uid: "user-1",
        email: "user@example.com",
        displayName: "User One",
        photoURL: null,
      },
      {
        db: "db-instance",
        doc,
        setDoc,
        serverTimestamp: () => timestampToken,
      },
    );

    expect(doc).toHaveBeenCalledWith("db-instance", "users", "user-1");
    expect(setDoc).toHaveBeenCalledWith(
      "users/user-1",
      {
        uid: "user-1",
        email: "user@example.com",
        displayName: "User One",
        photoURL: null,
        createdAt: timestampToken,
        updatedAt: timestampToken,
        lastSeenAt: timestampToken,
      },
      { merge: true },
    );
  });

  it("uses the Firebase auth email local part when displayName is missing", async () => {
    const setDoc = vi.fn().mockResolvedValue(undefined);
    const doc = vi.fn().mockReturnValue("users/user-2");
    const timestampToken = { ".sv": "serverTimestamp" };

    const credential = {
      user: {
        uid: "user-2",
        email: "hello.world@example.com",
        displayName: null,
        photoURL: null,
      },
    } as UserCredential;

    await syncUserProfile(credential.user, {
      db: "db-instance",
      doc,
      setDoc,
      serverTimestamp: () => timestampToken,
    });

    expect(setDoc).toHaveBeenCalledWith(
      "users/user-2",
      expect.objectContaining({
        displayName: "hello.world",
      }),
      { merge: true },
    );
  });
});

describe("registerWithEmailAndPassword", () => {
  it("stores the caller-provided display name instead of deriving it from email", async () => {
    const credential = {
      user: {
        uid: "user-3",
        email: "person@example.com",
        displayName: null,
        photoURL: null,
      },
    } as UserCredential;
    const createUser = vi.fn().mockResolvedValue(credential);
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const syncUser = vi.fn().mockResolvedValue(undefined);

    await registerWithEmailAndPassword("person@example.com", "secret123", "Captain", {
      auth: "auth-instance",
      createUserWithEmailAndPassword: createUser,
      updateProfile,
      syncUserProfile: syncUser,
    });

    expect(createUser).toHaveBeenCalledWith(
      "auth-instance",
      "person@example.com",
      "secret123",
    );
    expect(updateProfile).toHaveBeenCalledWith(credential.user, {
      displayName: "Captain",
    });
    expect(syncUser).toHaveBeenCalledWith({
      ...credential.user,
      displayName: "Captain",
    });
  });

  it("normalizes Firebase auth error codes into a friendly registration message", async () => {
    const createUser = vi.fn().mockRejectedValue({
      code: "auth/email-already-in-use",
    });

    await expect(
      registerWithEmailAndPassword("person@example.com", "secret123", "Captain", {
        auth: "auth-instance",
        createUserWithEmailAndPassword: createUser,
      }).catch((error) => error),
    ).resolves.toMatchObject({
      message: "This email address is already in use.",
    });
  });
});
