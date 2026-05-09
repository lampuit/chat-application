type FirebaseEnvSource = Partial<
  Record<
    | "NEXT_PUBLIC_FIREBASE_API_KEY"
    | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    | "NEXT_PUBLIC_FIREBASE_APP_ID",
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

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function getRequiredValue(
  source: FirebaseEnvSource,
  key: (typeof REQUIRED_KEYS)[number],
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
    apiKey: getRequiredValue(source, "NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getRequiredValue(source, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getRequiredValue(source, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getRequiredValue(source, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getRequiredValue(
      source,
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    ),
    appId: getRequiredValue(source, "NEXT_PUBLIC_FIREBASE_APP_ID"),
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
