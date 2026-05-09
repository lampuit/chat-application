import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { tryGetFirebaseEnv } from "@/lib/firebase/config";

export function getFirebaseServices() {
  const config = tryGetFirebaseEnv();

  if (!config) {
    return null;
  }

  const firebaseApp = getApps().length ? getApp() : initializeApp(config);

  return {
    app: firebaseApp,
    auth: getAuth(firebaseApp),
    db: getFirestore(firebaseApp),
  };
}
