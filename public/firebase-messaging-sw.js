importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js");

function getFirebaseConfig() {
  const searchParams = new URL(self.location.href).searchParams;

  return {
    apiKey: searchParams.get("apiKey"),
    authDomain: searchParams.get("authDomain"),
    projectId: searchParams.get("projectId"),
    storageBucket: searchParams.get("storageBucket"),
    messagingSenderId: searchParams.get("messagingSenderId"),
    appId: searchParams.get("appId"),
  };
}

function hasFirebaseConfig(firebaseConfig) {
  return Object.values(firebaseConfig).every(Boolean);
}

const firebaseConfig = getFirebaseConfig();

if (hasFirebaseConfig(firebaseConfig)) {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification ?? {};
    const data = payload.data ?? {};
    const title = notification.title ?? data.title ?? "New message";
    const options = {
      body: notification.body ?? data.body ?? "",
      icon: notification.icon ?? data.icon,
      image: notification.image ?? data.image,
      data: {
        ...data,
        conversationId: data.conversationId ?? null,
        messageId: data.messageId ?? null,
        senderId: data.senderId ?? null,
      },
    };

    return self.registration.showNotification(title, options);
  });
}
