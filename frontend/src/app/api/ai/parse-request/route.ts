import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VALID_URGENCY = ["immediate", "high", "medium"];
const VALID_RELATIONS = ["father", "mother", "brother", "sister", "wife", "husband", "friend", "self", "child", "relative", "other"];

const SYSTEM_PROMPT = `You are a deterministic field extractor for a blood donation emergency platform.

You are a parser. Not a chatbot. Not a summarizer. Not a medical advisor.
Never hallucinate. Incorrect information is worse than missing information.
Missing information is acceptable. Wrong information is unacceptable.

OUTPUT: Return ONLY a JSON object with exactly these keys. No markdown. No explanation. No extra keys.
{
  "blood_group": null,
  "units": 1,
  "urgency_level": "high",
  "hospital_name": null,
  "requester_relation": "other",
  "city": null,
  "contact_phone": null,
  "patient_name": null
}

RULES:

1. blood_group
   - Valid values only: A+, A-, B+, B-, AB+, AB-, O+, O-
   - Normalize: "o positive" → "O+", "a negative" → "A-", "ab positive" → "AB+"
   - Ignore case. Never infer. If absent: null

2. units
   - Convert words to numbers: "two bags" → 2, "three units" → 3
   - Default: 1. Minimum: 1. Maximum: 10. Never return 0.

3. urgency_level
   - "immediate" — urgent, immediately, critical, life threatening, emergency, asap
   - "high" — soon, important
   - "medium" — normal, whenever possible
   - Default: "high"

4. hospital_name
   - Extract ONLY the institution name. Strip all context words.
   - "need blood urgently for my father at Manipal Hospital Bangalore" → "Manipal Hospital"
   - "need O+ blood at Apollo Hospitals Chennai" → "Apollo Hospitals"
   - Remove words: urgent, need, for my father, immediately, please
   - Recognize: Manipal Hospital, Apollo Hospitals, Fortis, Narayana Health, St John's Hospital, Aster, KIMS, Sakra World Hospital, Rainbow Children's Hospital, AIIMS, NIMHANS, Yashoda Hospital, Care Hospitals, Max Healthcare
   - Tolerate minor spelling mistakes in hospital names.
   - If not mentioned: null

5. requester_relation
   - Map to one of: father, mother, brother, sister, wife, husband, friend, self, child, relative, other
   - dad → father, mom → mother, daughter → child, son → child, me → self, myself → self
   - Unknown or not mentioned: "other"
   - Never output "for". Only one relation.

6. city
   - Extract city name. Normalize: Bangalore → Bengaluru, Bombay → Mumbai
   - Recognize: Bengaluru, Chennai, Mumbai, Delhi, Hyderabad, Pune, Mysore, Mangalore, Kolkata
   - If uncertain: null. Never assume.

7. contact_phone
   - Accept: 9876543210 or +91 9876543210 or 91-9876543210
   - Normalize to exactly 10 digits. Strip +91 prefix.
   - Never invent. If absent: null

8. patient_name
   - "Patient Rahul Sharma needs blood" → "Rahul Sharma"
   - "My father Rajesh Hegde requires blood" → "Rajesh Hegde"
   - Relation words are NOT names. Hospital names are NOT names.
   - If unavailable: null

Strict JSON only.`;

// Public endpoint (the emergency page parses before sign-in), so cap its cost:
// best-effort per-IP limit (per server instance) and a bounded input size.
const WINDOW_MS = 60_000;
const MAX_CALLS = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_CALLS;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
    }
    const body = await request.json();
    const { text } = body;

    if (typeof text !== "string" || text.length > 1000) {
      return NextResponse.json({ error: "Please keep your description under 1000 characters." }, { status: 400 });
    }
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: "Please describe your blood requirement in more detail." }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith("gsk_mock")) {
      const mockData = runLocalExtractor(text);
      await new Promise(resolve => setTimeout(resolve, 800));
      return NextResponse.json({ data: mockData });
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.trim() },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "AI returned no data." }, { status: 500 });
    }

    const parsed = JSON.parse(raw);
    const data = sanitize(parsed);
    return NextResponse.json({ data });

  } catch (err: any) {
    console.error("[Groq Error]", err);
    return NextResponse.json({ error: "AI service failed. Please try again or fill the form manually." }, { status: 500 });
  }
}

function sanitize(parsed: any) {
  const rawUrgency = parsed.urgency_level?.toLowerCase();
  const rawRelation = parsed.requester_relation?.toLowerCase();
  const rawPhone = parsed.contact_phone?.replace(/[\s\-]/g, "").replace(/^\+91/, "");

  return {
    blood_group: VALID_BLOOD_GROUPS.includes(parsed.blood_group?.toUpperCase()) ? parsed.blood_group.toUpperCase() : null,
    units: Math.min(10, Math.max(1, parseInt(parsed.units) || 1)),
    urgency_level: VALID_URGENCY.includes(rawUrgency) ? rawUrgency : "high",
    hospital_name: parsed.hospital_name || null,
    requester_relation: VALID_RELATIONS.includes(rawRelation) ? rawRelation : "other",
    city: parsed.city || null,
    contact_phone: rawPhone && /^\d{10}$/.test(rawPhone) ? rawPhone : null,
    patient_name: parsed.patient_name || null,
  };
}

function runLocalExtractor(text: string) {
  const lower = text.toLowerCase();

  // Blood group
  let blood_group: string | null = null;
  const bgMatch = text.match(/\b(AB|A|B|O)[+-]\b/i) || text.match(/\b(AB|A|B|O)\s+(positive|negative)\b/i);
  if (bgMatch) {
    let raw = bgMatch[0].toUpperCase().replace(/\s+/, "");
    raw = raw.replace("POSITIVE", "+").replace("NEGATIVE", "-");
    if (VALID_BLOOD_GROUPS.includes(raw)) blood_group = raw;
  }

  // Units
  let units = 1;
  const unitMatch = text.match(/\b(\d+)\s*(?:unit|bottle|bag|pack)s?\b/i) ||
    text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:unit|bottle|bag|pack)s?\b/i);
  if (unitMatch) {
    const wordMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    units = parseInt(unitMatch[1]) || wordMap[unitMatch[1]?.toLowerCase()] || 1;
    units = Math.min(10, Math.max(1, units));
  }

  // Urgency
  let urgency_level = "high";
  if (/urgent|urgently|critical|immediately|emergency|asap|life.?threat/i.test(text)) {
    urgency_level = "immediate";
  } else if (/\bnormal\b|whenever possible/i.test(text)) {
    urgency_level = "medium";
  } else if (/\bsoon\b|\bimportant\b/i.test(text)) {
    urgency_level = "high";
  }

  // Hospital
  let hospital_name: string | null = null;
  const hospMatch = text.match(/\b([A-Za-z0-9'\s]{2,30}?)\s+(?:hospital|hosp|clinic|medical\s+cent(?:er|re)|medicity)\b/i);
  if (hospMatch) {
    let name = hospMatch[1].trim();
    const stopWords = /^(at|in|the|for|my|to|a|need|urgent|urgently|please|require|require)\s+/i;
    name = name.replace(stopWords, "").trim();
    name = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    if (name.length >= 2) {
      const suffix = hospMatch[0].match(/hospital|hosp|clinic|medical\s+cent(?:er|re)|medicity/i)?.[0] || "Hospital";
      hospital_name = `${name} ${suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase()}`;
    }
  }

  // City
  const CITY_MAP: Record<string, string> = {
    bangalore: "Bengaluru", bengaluru: "Bengaluru",
    bombay: "Mumbai", mumbai: "Mumbai",
    delhi: "Delhi", "new delhi": "Delhi",
    chennai: "Chennai", madras: "Chennai",
    hyderabad: "Hyderabad",
    pune: "Pune",
    kolkata: "Kolkata", calcutta: "Kolkata",
    mysore: "Mysore", mysuru: "Mysore",
    mangalore: "Mangalore", mangaluru: "Mangalore",
    kochi: "Kochi", cochin: "Kochi",
    ahmedabad: "Ahmedabad",
    coimbatore: "Coimbatore",
  };
  let city: string | null = null;
  for (const [key, normalized] of Object.entries(CITY_MAP)) {
    if (lower.includes(key)) { city = normalized; break; }
  }

  // Phone
  let contact_phone: string | null = null;
  const phoneMatch = text.match(/(?:\+91[\s-]?)?([6-9]\d{9})\b/);
  if (phoneMatch) contact_phone = phoneMatch[1];

  // Relation
  let requester_relation = "other";
  const relationMap: [RegExp, string][] = [
    [/\b(my\s+)?father\b|\bdad\b|\bpapa\b/i, "father"],
    [/\b(my\s+)?mother\b|\bmom\b|\bmummy\b|\bmama\b/i, "mother"],
    [/\b(my\s+)?brother\b/i, "brother"],
    [/\b(my\s+)?sister\b/i, "sister"],
    [/\b(my\s+)?wife\b/i, "wife"],
    [/\b(my\s+)?husband\b/i, "husband"],
    [/\b(a\s+)?friend\b/i, "friend"],
    [/\b(my\s+)?(?:child|son|daughter|kid)\b/i, "child"],
    [/\bI\s+need\b|\bfor\s+me\b|\bmyself\b/i, "self"],
    [/\brelative\b/i, "relative"],
  ];
  for (const [pattern, rel] of relationMap) {
    if (pattern.test(text)) { requester_relation = rel; break; }
  }

  // Patient name — simple heuristic: capitalized words after known relation words
  let patient_name: string | null = null;
  const nameMatch = text.match(/(?:patient|for\s+(?:my\s+)?(?:father|mother|brother|sister|wife|husband|friend|son|daughter))\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  if (nameMatch) patient_name = nameMatch[1];

  return {
    blood_group,
    units,
    urgency_level,
    hospital_name,
    requester_relation,
    city,
    contact_phone,
    patient_name,
  };
}
