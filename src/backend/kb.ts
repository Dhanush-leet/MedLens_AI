import { UrgencyLevel } from '../frontend/types';

export interface KBChunk {
  id: string;
  topic: string;
  text: string;
  source: string;
  urgencyHint?: UrgencyLevel;
}

export const medicalKB: KBChunk[] = [
  {
    id: 'kb_chest_pain',
    topic: 'Chest Pain and Cardiac Symptoms',
    text: 'Chest pain, tightness, pressure, or squeezing in the chest that may radiate to the jaw, neck, back, or one or both arms is a key sign of myocardial infarction (heart attack). Associated symptoms include shortness of breath, cold sweats, dizziness, lightheadedness, or nausea. Sudden onset of these symptoms is an absolute medical emergency. Immediate emergency medical services (911 or local emergency) should be contacted.',
    source: 'American Heart Association Guidelines',
    urgencyHint: 'Emergency'
  },
  {
    id: 'kb_stroke',
    topic: 'Stroke Symptoms (FAST)',
    text: 'Stroke symptoms occur suddenly and are categorized by the FAST acronym: Facial drooping (one side of face droops or is numb), Arm weakness (one arm drifts downward when raised), Speech difficulty (slurred or incoherent speech), and Time to call emergency services. Numbness or weakness on one side of the body, sudden confusion, difficulty seeing in one or both eyes, or sudden severe headache with no known cause are emergency red flags requiring immediate hospital evaluation.',
    source: 'American Stroke Association',
    urgencyHint: 'Emergency'
  },
  {
    id: 'kb_dyspnea',
    topic: 'Difficulty Breathing (Dyspnea)',
    text: 'Severe shortness of breath, gasping for air, inability to speak in full sentences, or a blueish tint on the lips or fingernails (cyanosis) indicate severe hypoxia (low oxygen). This is a critical medical emergency. Causes include anaphylaxis (severe allergic reaction), acute asthma exacerbation, pulmonary embolism, or acute heart failure. Emergency intervention is required.',
    source: 'American Lung Association',
    urgencyHint: 'Emergency'
  },
  {
    id: 'kb_severe_bleeding',
    topic: 'Severe Bleeding and Hemorrhage',
    text: 'Uncontrolled bleeding that spurts, pools, or does not stop after applying direct, firm pressure for 10 minutes represents a major hemorrhagic emergency. Symptoms of hypovolemic shock like rapid heart rate, confusion, pale clammy skin, or fainting may accompany severe blood loss. Emergency treatment is essential to prevent life-threatening shock.',
    source: 'ACS Committee on Trauma',
    urgencyHint: 'Emergency'
  },
  {
    id: 'kb_migraine',
    topic: 'Migraine and Severe Headache',
    text: 'Migraine is a common neurological condition characterized by intense, throbbing head pain, usually on one side. Associated symptoms include sensitivity to light (photophobia) and sound (phonophobia), nausea, vomiting, or visual disturbances known as auras (e.g., flashing lights, temporary blind spots). While painful, routine migraines are classified as Urgent or Routine. However, a sudden, explosive headache (thunderclap headache) described as the "worst headache of your life" can indicate a ruptured aneurysm and is a medical emergency.',
    source: 'National Institute of Neurological Disorders',
    urgencyHint: 'Routine'
  },
  {
    id: 'kb_contact_dermatitis',
    topic: 'Contact Dermatitis and Rashes',
    text: 'Contact dermatitis is a red, itchy skin rash caused by direct contact with a substance or an allergic reaction to it (e.g., poison ivy, soaps, cosmetics, nickel). It is not contagious or life-threatening. Symptoms include dry, cracked, scaly skin, bumps, blisters, swelling, or burning. Treatment involves identifying the trigger, applying cool compresses, using anti-itch creams (hydrocortisone), or oral antihistamines. Severe rashes with facial swelling, breathing issues, or rapid spread are urgent/emergency hives.',
    source: 'American Academy of Dermatology',
    urgencyHint: 'Self-care'
  },
  {
    id: 'kb_eczema',
    topic: 'Atopic Dermatitis (Eczema)',
    text: 'Eczema is a chronic inflammatory skin condition characterized by dry, itchy, red patches of skin, commonly on the elbows, knees, or face. It is treated with routine moisturizing, avoiding harsh soaps, topical corticosteroids, or immunomodulators. It is a long-term condition that rarely requires urgent care unless signs of bacterial infection (pus, yellow crusting, increased warmth or swelling) develop.',
    source: 'National Eczema Association',
    urgencyHint: 'Routine'
  },
  {
    id: 'kb_common_cold',
    topic: 'Common Cold and Influenza',
    text: 'The common cold is a mild viral upper respiratory infection. Symptoms include sore throat, runny or stuffy nose, mild cough, sneezing, congestion, and low-grade fever. Recovery occurs within 7-10 days. Influenza (flu) presents with sudden onset of high fever, muscle aches, chills, fatigue, dry cough, and headache. Both are managed with rest, hydration, and over-the-counter fever reducers or decongestants. Shortness of breath or high fever unresponsive to medication are red flags.',
    source: 'CDC Respiratory Viruses Guide',
    urgencyHint: 'Self-care'
  },
  {
    id: 'kb_acid_reflux',
    topic: 'Gastroesophageal Reflux Disease (GERD)',
    text: 'Acid reflux or heartburn is characterized by a burning sensation in the chest (behind the breastbone) that often occurs after eating and may be worse when lying down. It is caused by stomach acid flowing back into the esophagus. Over-the-counter antacids, H2 blockers, or proton pump inhibitors (PPIs) provide relief. GERD is routine, but if chest pain radiates to the arm/jaw or is accompanied by shortness of breath, it must be triaged as a potential cardiac emergency.',
    source: 'American College of Gastroenterology',
    urgencyHint: 'Self-care'
  },
  {
    id: 'kb_sprain',
    topic: 'Sprains and Strains',
    text: 'A sprain is a stretching or tearing of ligaments (e.g., ankle sprain), while a strain is an injury to a muscle or tendon. Symptoms include localized pain, swelling, bruising, and limited joint mobility. Acute care follows the RICE protocol: Rest, Ice, Compression, and Elevation. Minor sprains are self-care or routine. Red flags include complete inability to bear weight, visible joint deformity, or numbness/tingling, which suggest a fracture or nerve damage requiring Urgent evaluation.',
    source: 'American Academy of Orthopaedic Surgeons',
    urgencyHint: 'Self-care'
  },
  {
    id: 'kb_conjunctivitis',
    topic: 'Conjunctivitis (Pink Eye)',
    text: 'Pink eye is an inflammation of the conjunctiva (membrane lining the eyelid). Symptoms include redness, itching, burning, gritty feeling, or discharge (watery or yellow-green pus) in one or both eyes. Viral or bacterial pink eye is highly contagious. It is usually a routine condition requiring primary care assessment for antibiotic drops or cold compresses. Extreme eye pain, changes in vision, or extreme light sensitivity are red flags requiring urgent ophthalmic care.',
    source: 'American Academy of Ophthalmology',
    urgencyHint: 'Routine'
  },
  {
    id: 'kb_hypertension',
    topic: 'Hypertension and Hypertensive Crisis',
    text: 'Hypertension (high blood pressure) is typically asymptomatic ("the silent killer"). Routine management involves medication and lifestyle changes. However, a hypertensive crisis occurs when blood pressure rises suddenly above 180/120 mmHg. If accompanied by chest pain, shortness of breath, back pain, numbness, weakness, change in vision, or difficulty speaking, it indicates end-organ damage and is a medical Emergency.',
    source: 'American Heart Association',
    urgencyHint: 'Routine'
  },
  {
    id: 'kb_food_poisoning',
    topic: 'Gastroenteritis and Food Poisoning',
    text: 'Gastroenteritis is inflammation of the stomach and intestines, caused by viral, bacterial, or parasitic infections. Symptoms include nausea, vomiting, watery diarrhea, abdominal cramps, and low-grade fever. The primary risk is dehydration. Management includes small, frequent sips of oral rehydration solutions. Red flags include high fever, severe constant abdominal pain, bloody stools, or signs of severe dehydration (no urine for 8+ hours, extreme lethargy).',
    source: 'CDC Digestive Diseases',
    urgencyHint: 'Routine'
  },
  {
    id: 'kb_dehydration',
    topic: 'Dehydration and Heat Exhaustion',
    text: 'Mild dehydration causes dry mouth, dark urine, and mild headache. It is corrected by drinking water or electrolyte solutions. Heat exhaustion is more severe, presenting with heavy sweating, rapid pulse, dizziness, nausea, muscle cramps, and cool clammy skin. Immediate cooling and rehydration are needed. If the person is confused, loses consciousness, or stops sweating while running a high body temperature, it is Heat Stroke, which is an Emergency.',
    source: 'National Institutes of Health',
    urgencyHint: 'Urgent'
  },
  {
    id: 'kb_uti',
    topic: 'Urinary Tract Infection (UTI)',
    text: 'UTI is an infection of the urinary system, typically the bladder. Symptoms include strong, persistent urge to urinate, burning sensation when urinating, cloudy or strong-smelling urine, or pelvic pain. UTIs require an appointment with a general practitioner for prescription antibiotics. If symptoms include back pain, side pain (flank pain), high fever, chills, nausea, or vomiting, the infection may have spread to the kidneys (pyelonephritis), which is Urgent.',
    source: 'Urology Care Foundation',
    urgencyHint: 'Routine'
  }
];
