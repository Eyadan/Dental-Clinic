export interface RxPresetMedication {
  id: string;
  category: "Antibiotics" | "Analgesics" | "Antiseptics";
  medicationName: string;
  genericName: string;
  dosage: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export const RX_PRESET_TEMPLATES: RxPresetMedication[] = [
  // ANTIBIOTICS
  {
    id: "amox-500",
    category: "Antibiotics",
    medicationName: "Amoxicillin 500mg Capsule",
    genericName: "Amoxicillin",
    dosage: "1 capsule 3x daily (every 8 hours)",
    duration: "7 days",
    quantity: 21,
    instructions: "Take after meals. Complete the full 7-day course.",
  },
  {
    id: "co-amox-625",
    category: "Antibiotics",
    medicationName: "Co-Amoxiclav (Augmentin) 625mg Tablet",
    genericName: "Amoxicillin + Clavulanic Acid",
    dosage: "1 tablet 2x daily (every 12 hours)",
    duration: "7 days",
    quantity: 14,
    instructions: "Take with food or at the start of a meal.",
  },
  {
    id: "clinda-300",
    category: "Antibiotics",
    medicationName: "Clindamycin 300mg Capsule",
    genericName: "Clindamycin",
    dosage: "1 capsule 3x daily (every 8 hours)",
    duration: "7 days",
    quantity: 21,
    instructions: "Take with a full glass of water. Complete full course.",
  },

  // ANALGESICS / PAIN MANAGEMENT
  {
    id: "mefenamic-500",
    category: "Analgesics",
    medicationName: "Mefenamic Acid 500mg Capsule",
    genericName: "Mefenamic Acid",
    dosage: "1 capsule every 8 hours as needed for severe pain",
    duration: "3 to 5 days",
    quantity: 10,
    instructions: "Take immediately after meals with a full glass of water.",
  },
  {
    id: "ibuprofen-400",
    category: "Analgesics",
    medicationName: "Ibuprofen 400mg Tablet",
    genericName: "Ibuprofen",
    dosage: "1 tablet every 6 to 8 hours as needed for pain and swelling",
    duration: "5 days",
    quantity: 10,
    instructions: "Take after meals to prevent stomach irritation.",
  },
  {
    id: "paracetamol-500",
    category: "Analgesics",
    medicationName: "Paracetamol 500mg Tablet",
    genericName: "Paracetamol / Acetaminophen",
    dosage: "1 to 2 tablets every 4 to 6 hours as needed",
    duration: "3 days",
    quantity: 10,
    instructions: "Do not exceed 4000mg (8 tablets) in 24 hours.",
  },
  {
    id: "celecoxib-200",
    category: "Analgesics",
    medicationName: "Celecoxib 200mg Capsule",
    genericName: "Celecoxib",
    dosage: "1 capsule once daily post-surgery",
    duration: "5 days",
    quantity: 5,
    instructions: "Take after food. Discontinue if gastric discomfort occurs.",
  },

  // ANTISEPTICS & TOPICAL
  {
    id: "chlorhexidine-mouthwash",
    category: "Antiseptics",
    medicationName: "Chlorhexidine Gluconate 0.12% Oral Rinse",
    genericName: "Chlorhexidine Gluconate",
    dosage: "Swish 15ml for 30 seconds 2x daily after toothbrushing",
    duration: "7 days",
    quantity: 1,
    instructions: "Do not rinse with water, eat, or drink for 30 minutes after swishing.",
  },
  {
    id: "kenalog-orabase",
    category: "Antiseptics",
    medicationName: "Kenalog in Orabase Oral Paste",
    genericName: "Triamcinolone Acetonide",
    dosage: "Apply thin dab to oral lesion 2 to 3 times daily",
    duration: "5 days",
    quantity: 1,
    instructions: "Apply after meals and at bedtime. Do not rub in.",
  },
];
