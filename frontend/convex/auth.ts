import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Phone } from "@convex-dev/auth/providers/Phone";
import { sendSms } from "./lib/sms";

const PhoneOtp = Phone({
  id: "phone",
  maxAge: 60 * 10,
  async generateVerificationToken() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return String(buf[0] % 1_000_000).padStart(6, "0");
  },
  normalizeIdentifier: (phone) => phone.replace(/[^\d+]/g, ""),
  async sendVerificationRequest({ identifier, token }) {
    await sendSms(identifier, `Your Blood Axis verification code is ${token}. It expires in 10 minutes.`);
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        const fullName = typeof params.fullName === "string" ? params.fullName.trim() : undefined;
        return {
          email,
          ...(fullName ? { name: fullName, fullName } : {}),
          ...(typeof params.phone === "string" && params.phone ? { phone: params.phone } : {}),
        };
      },
    }),
    PhoneOtp,
  ],
});
