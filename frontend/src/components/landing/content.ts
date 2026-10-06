export const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-bloodaxis", label: "Why BloodAxis" },
  { href: "#who-its-for", label: "Who it's for" },
  { href: "#faq", label: "FAQ" },
];

export const STEPS = [
  { num: "1", title: "Ask", desc: "Choose the blood group, units and hospital. No account needed in an emergency." },
  { num: "2", title: "Match", desc: "Compatible donors nearby are alerted instantly, nearest first." },
  { num: "3", title: "Arrive", desc: "Watch donors accept, with distance and ETA live on the map. Contact opens only after they say yes. Mark it fulfilled and we take care of the rest." },
];

export const WHY = [
  { title: "Instant", desc: "A spatial engine ranks compatible donors by distance in seconds and reaches them by push notification." },
  { title: "Private", desc: "A donor's name and number stay hidden until they accept. Their choice, always." },
  { title: "Safe", desc: "Every donor is phone-verified and age-checked. After donating, they're paused automatically, so no one is alerted before they're ready." },
];

export const AUDIENCES = [
  { tag: "Families", title: "Get help fast.", desc: "Post a request in under a minute. Track donors live. Edit or close it any time.", cta: "I need blood", href: "/emergency" },
  { tag: "Donors", title: "Give when it matters.", desc: "One tap to accept, no commitment before. Anonymous until you say yes. Switch availability on or off whenever.", cta: "Become a donor", href: "/login" },
  { tag: "Hospitals", title: "Coordinate at scale.", desc: "Verify your facility. Manage every active request. Reach donors beyond your own registry.", cta: "Hospital portal", href: "/hospital/verify" },
];

export const COMPAT: { group: string; gives: string; gets: string }[] = [
  { group: "O−", gives: "Everyone", gets: "O−" },
  { group: "O+", gives: "O+, A+, B+, AB+", gets: "O−, O+" },
  { group: "A−", gives: "A−, A+, AB−, AB+", gets: "O−, A−" },
  { group: "A+", gives: "A+, AB+", gets: "O−, O+, A−, A+" },
  { group: "B−", gives: "B−, B+, AB−, AB+", gets: "O−, B−" },
  { group: "B+", gives: "B+, AB+", gets: "O−, O+, B−, B+" },
  { group: "AB−", gives: "AB−, AB+", gets: "O−, A−, B−, AB−" },
  { group: "AB+", gives: "AB+", gets: "Everyone" },
];

// Single source for the visible FAQ and the FAQPage JSON-LD.
export const FAQS = [
  { q: "Is BloodAxis free?", a: "Yes. Free for patients, donors and hospitals." },
  { q: "How is my privacy protected?", a: "A donor's identity and phone number stay hidden until they choose to accept a request. Nobody gets your details before you say yes." },
  { q: "Can hospitals use BloodAxis?", a: "Yes. Hospitals verify their facility, then manage incoming and active requests and reach donors beyond their own registry." },
  { q: "Who can register as a donor?", a: "Anyone who passes phone verification and the age check. Donors must be between 18 and 100 years old." },
  { q: "How far away are donors alerted?", a: "Donors within range of the hospital are alerted, nearest first. Alerts start within 5 km of the hospital and widen to 15 km, then 25 km, if more help is needed." },
  { q: "Is this a replacement for a blood bank?", a: "No. BloodAxis finds donors fast when blood is needed urgently. Keep your blood bank and your doctor in the loop." },
];
