"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from 'next/navigation';
import { motion, type Variants } from "motion/react";
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { getCurrentPosition } from '@/lib/geolocation';
import { Droplet, Phone, MapPin, Heart, Check, Calendar } from 'lucide-react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircleIcon,
  Mail01Icon,
  LockPasswordIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { BubbleBackground } from "@/components/animate-ui/components/backgrounds/bubble";

// Social SVGs
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="currentColor"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
      fill="currentColor"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
      fill="currentColor"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="currentColor"
    />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const GitlabIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.918 1.263c-.137-.423-.73-.423-.866 0L1.388 9.452.045 13.587c-.12.37.014.787.318 1.005l11.637 8.448 11.637-8.448c.304-.218.438-.635.318-1.005z" />
  </svg>
);

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Common
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sign up state
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isAvailableDonor, setIsAvailableDonor] = useState(true);

  const router = useRouter();
  const { signIn } = useAuthActions();
  const updateProfile = useMutation(api.users.update);

  const friendlyError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (/InvalidAccountId|InvalidSecret|Invalid password/i.test(msg)) return "Incorrect email or password.";
    if (/already exists|AccountAlreadyExists/i.test(msg)) return "An account with this email already exists. Try signing in.";
    if (/8 characters|password/i.test(msg)) return "Password must be at least 8 characters.";
    return msg.length > 160 ? "Something went wrong. Please try again." : msg;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error("Full name is required");
        if (!age || parseInt(age) < 18 || parseInt(age) > 100) {
          throw new Error("You must be between 18 and 100 years old to register");
        }
        if (!bloodGroup) throw new Error("Please select a blood group");
        if (phone.length !== 10) throw new Error("Please enter a valid 10-digit mobile number");
        if (!location) throw new Error("Please enter your current city");

        let lat = latitude;
        let lng = longitude;
        if (!lat || !lng) {
          try {
            const pos = await getCurrentPosition();
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch (gpsErr) {
            console.warn('GPS resolve failed, proceeding with city name matching only', gpsErr);
          }
        }

        await signIn("password", {
          flow: "signUp",
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        });

        await updateProfile({
          fullName: fullName.trim(),
          bloodGroup: bloodGroup as (typeof bloodGroups)[number],
          phone,
          city: location,
          isAvailableDonor,
          ...(lat && lng ? { lat, lng, location: `POINT(${lng} ${lat})` } : {}),
          age: parseInt(age),
          profileCompleted: true,
        });

        router.push('/dashboard');
      } else {
        await signIn("password", { flow: "signIn", email: email.trim(), password });
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <BubbleBackground 
      interactive={true}
      colors={{
        first: '220,38,38',
        second: '153,27,27',
        third: '239,68,68',
        fourth: '127,29,29',
        fifth: '185,28,28',
        sixth: '248,113,113',
      }}
      className="flex min-h-screen w-full items-center justify-center font-sans text-white antialiased selection:bg-red-500/30 selection:text-white relative bg-[#050505]"
    >
      <div className="relative z-10 w-full flex justify-center p-4 sm:p-8 max-h-screen overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md xl:max-w-lg bg-[#050505]/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-2xl my-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
             <div className="flex h-14 w-14 items-center justify-center bg-[#DC2626]/10 rounded-full mb-4 border border-[#DC2626]/20">
               <Droplet className="w-7 h-7 text-[#DC2626] fill-[#DC2626]" strokeWidth={1} />
             </div>
             <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Blood Axis</h1>
             <p className="text-center text-sm text-neutral-400">Join the emergency blood coordination network.</p>
          </motion.div>

          {error && (
            <motion.div variants={itemVariants} className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm text-center mb-6">
                {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div variants={itemVariants} className="bg-green-500/10 text-green-400 border border-green-500/20 p-4 rounded-xl text-sm text-center mb-6">
                {successMsg}
            </motion.div>
          )}

          {/* Social Register */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 border border-white/5"
              >
                <GoogleIcon className="size-4" />
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 border border-white/5"
              >
                <GithubIcon className="size-4" />
                Github
              </button>
            </div>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="relative mb-8 flex items-center"
          >
            <div className="grow border-t border-white/10"></div>
            <span className="px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Or {isSignUp ? 'register' : 'continue'} with email</span>
            <div className="grow border-t border-white/10"></div>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {isSignUp && (
              <>
                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="fullName" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
                      <HugeiconsIcon icon={UserCircleIcon} className="size-5" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      required={isSignUp}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                    />
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants} className="flex flex-col gap-2">
                      <label htmlFor="age" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Age
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <input
                          id="age"
                          type="number"
                          required={isSignUp}
                          min="18"
                          max="100"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="25"
                          className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex flex-col gap-2">
                      <label htmlFor="phone" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
                          <Phone className="w-5 h-5" />
                        </div>
                        <input
                          id="phone"
                          type="tel"
                          required={isSignUp}
                          minLength={10}
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit number"
                          className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                        />
                      </div>
                    </motion.div>
                </div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2 z-10">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Current City
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500 z-10">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <LocationAutocomplete
                      value={location}
                      onChange={(val) => setLocation(val)}
                      onSelect={(details) => {
                          setLatitude(details.lat);
                          setLongitude(details.lng);
                      }}
                      placeholder="e.g. Bangalore"
                      className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Blood Group</label>
                    <div className="grid grid-cols-4 gap-2">
                        {bloodGroups.map((bg) => {
                            const isSelected = bloodGroup === bg;
                            return (
                                <button
                                    key={bg}
                                    type="button"
                                    onClick={() => setBloodGroup(bg)}
                                    className={`h-11 rounded-xl font-bold text-sm transition-all border ${isSelected ? 'bg-[#DC2626] border-[#DC2626] text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'}`}
                                >
                                    {bg}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-1">
                    <div
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isAvailableDonor ? 'border-[#DC2626]/40 bg-[#DC2626]/10' : 'border-white/5 bg-white/5'}`}
                        onClick={() => setIsAvailableDonor(!isAvailableDonor)}
                    >
                        <div className="flex items-center gap-3">
                            <Heart className={`w-5 h-5 ${isAvailableDonor ? 'text-[#DC2626] fill-[#DC2626]' : 'text-neutral-500'}`} />
                            <div>
                                <h3 className="font-semibold text-sm text-white">Available for Deployment</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">Alert me for emergency requests in my city</p>
                            </div>
                        </div>
                        <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isAvailableDonor ? 'bg-[#DC2626]' : 'bg-white/20'}`}>
                            <span className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isAvailableDonor ? 'translate-x-[22px]' : 'translate-x-[4px]'}`}>
                                {isAvailableDonor && <Check className="w-3 h-3 text-[#DC2626]" strokeWidth={3} />}
                            </span>
                        </div>
                    </div>
                </motion.div>
              </>
            )}

            {/* Email */}
            <motion.div variants={itemVariants} className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-neutral-400 uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
                  <HugeiconsIcon icon={Mail01Icon} className="size-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={itemVariants} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold text-neutral-400 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  {!isSignUp && (
                      <a href="#" className="text-xs font-medium text-[#DC2626] hover:text-red-400 transition-colors">
                          Forgot password?
                      </a>
                  )}
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
                  <HugeiconsIcon icon={LockPasswordIcon} className="size-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-500 hover:text-neutral-300 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  <HugeiconsIcon icon={showPassword ? ViewIcon : ViewOffIcon} className="size-5" />
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants} className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#DC2626] py-3.5 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(220,38,38,0.39)]"
              >
                {loading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
              </button>
            </motion.div>
          </form>

          {/* Bottom Login Link */}
          <motion.div
            variants={itemVariants}
            className="mt-8 text-center text-sm text-neutral-400"
          >
            {isSignUp ? "Already have an account?" : "Don't have an account?"} {" "}
            <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                className="font-bold text-white hover:text-red-400 transition-colors"
            >
              {isSignUp ? "Log in" : "Sign up"}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </BubbleBackground>
  );
}
