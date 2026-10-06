/** Minimal FCM HTTP v1 client (service-account auth) using only Web Crypto. */

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function config() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

async function accessToken(cfg: NonNullable<ReturnType<typeof config>>) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: cfg.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = cfg.privateKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status}`);
  return (await res.json()).access_token as string;
}

export type PushResult = { token: string; ok: boolean; invalid: boolean; error?: string };

/** Returns null when FCM isn't configured. */
export async function sendFcm(
  tokens: string[],
  msg: { title: string; body: string; url?: string },
): Promise<PushResult[] | null> {
  const cfg = config();
  if (!cfg) return null;
  const bearer = await accessToken(cfg);
  return Promise.all(
    tokens.map(async (token): Promise<PushResult> => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${cfg.projectId}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: msg.title, body: msg.body },
            data: msg.url ? { url: msg.url } : {},
            webpush: msg.url ? { fcm_options: { link: msg.url } } : undefined,
          },
        }),
      });
      if (res.ok) return { token, ok: true, invalid: false };
      const text = await res.text();
      return { token, ok: false, invalid: res.status === 404 || text.includes("UNREGISTERED"), error: `${res.status}` };
    }),
  );
}
