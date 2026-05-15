type FirebaseEnvSource = Partial<
  Record<
    | "NEXT_PUBLIC_FIREBASE_API_KEY"
    | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    | "NEXT_PUBLIC_FIREBASE_APP_ID"
    | "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
    string
  >
>;

function getDefaultFirebaseEnvSource(): FirebaseEnvSource {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  };
}

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type FirebaseMessagingConfig = {
  vapidKey: string;
};

const REQUIRED_APP_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function getRequiredValue(
  source: FirebaseEnvSource,
  key: keyof FirebaseEnvSource,
) {
  const value = source[key];

  if (!value) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }

  return value;
}

export function getFirebaseEnv(
  source: FirebaseEnvSource = getDefaultFirebaseEnvSource(),
): FirebaseClientConfig {
  return {
    apiKey: getRequiredValue(source, REQUIRED_APP_KEYS[0]),
    authDomain: getRequiredValue(source, REQUIRED_APP_KEYS[1]),
    projectId: getRequiredValue(source, REQUIRED_APP_KEYS[2]),
    storageBucket: getRequiredValue(source, REQUIRED_APP_KEYS[3]),
    messagingSenderId: getRequiredValue(source, REQUIRED_APP_KEYS[4]),
    appId: getRequiredValue(source, REQUIRED_APP_KEYS[5]),
  };
}

export function tryGetFirebaseEnv(
  source: FirebaseEnvSource = getDefaultFirebaseEnvSource(),
): FirebaseClientConfig | null {
  try {
    return getFirebaseEnv(source);
  } catch {
    return null;
  }
}

export function getFirebaseMessagingEnv(
  source: FirebaseEnvSource = getDefaultFirebaseEnvSource(),
): FirebaseMessagingConfig {
  return {
    vapidKey: getRequiredValue(source, "NEXT_PUBLIC_FIREBASE_VAPID_KEY"),
  };
}

export function tryGetFirebaseMessagingEnv(
  source: FirebaseEnvSource = getDefaultFirebaseEnvSource(),
): FirebaseMessagingConfig | null {
  try {
    return getFirebaseMessagingEnv(source);
  } catch {
    return null;
  }
}
