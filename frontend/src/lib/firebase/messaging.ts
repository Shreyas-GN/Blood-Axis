import { getToken } from "firebase/messaging";
import { messaging } from "./config";

/**
 * Registers the current device for push notifications.
 * Hands the FCM token to `saveToken` (the Convex `users.registerFcmToken` mutation).
 */
export async function registerForPushNotifications(saveToken: (token: string) => Promise<unknown>) {
    try {
        const msg = await messaging();
        if (!msg) {
            console.warn("[FCM] Messaging not supported in this browser");
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("[FCM] Notification permission denied");
            return null;
        }

        // Get FCM Token
        // Note: You need a VAPID key from Firebase Console -> Project Settings -> Cloud Messaging
        const token = await getToken(msg, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });

        if (token) {
            
            await saveToken(token);

            return token;
        }
        
        return null;
    } catch (error) {
        console.error("[FCM] Registration failed:", error);
        return null;
    }
}
