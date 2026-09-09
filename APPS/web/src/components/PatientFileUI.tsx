import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Clock, MapPin, Phone, Megaphone, AlertCircle, Plus,
  Upload, Trash2, ArrowLeft, Calendar, Check, ExternalLink, RefreshCcw,
  Sparkles, Stethoscope, Apple, Share2, Award, FolderPlus, X, CheckCircle2,
  Printer, Eye, CreditCard, ChevronRight
} from 'lucide-react';
import { db } from '@app/shared';
import { collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';

export const DEFICIENCY_LIST = [
  'Vitamin A', 'Vitamin C', 'Vitamin E', 'Calcium', 'Magnesium',
  'Iron', 'Protein', 'Phosphorus', 'Vitamin B', 'Vitamin D',
  'Vitamin K', 'Potassium', 'Zinc', 'Sodium', 'Manganese'
];

export const DISORDERS_LIST = [
  'Sugar (Diabetes)', 'High BP / Hypertension', 'Thyroid', 'Gastritis',
  'IBS / IBD', 'GERD', 'Piles', 'PCOD', 'Insulin Resistance',
  'Hairfall', 'Melasma', 'Weight Gain', 'Weight Loss',
  'Height Growth', 'Adenoids / Tonsillitis', 'Allergies'
];

export const DEFICIENCY_NUTRITION_MAP: Record<string, { eat: string[]; avoid: string[] }> = {
  'Vitamin A': {
    eat: ['Carrots, Sweet Potatoes, Spinach, Papaya, Pumpkin', 'Desi Ghee (in moderation), Cow Milk, Cantaloupe'],
    avoid: ['Deep fried foods, Excess alcohol']
  },
  'Vitamin C': {
    eat: ['Amla (Indian Gooseberry), Oranges, Lemons, Guava', 'Kiwi, Bell Peppers, Tomatoes, Strawberries'],
    avoid: ['Overcooking vegetables (destroys Vit C), Carbonated soft drinks']
  },
  'Vitamin E': {
    eat: ['Almonds, Sunflower seeds, Spinach, Avocado', 'Olive oil, Hazelnuts, Peanuts'],
    avoid: ['Rancid re-used oils, Highly processed fried snacks']
  },
  'Calcium': {
    eat: ['Cow Milk, Ragi (Finger Millet), Paneer, Sesame Seeds', 'Tofu, Broccoli, Almonds, Fresh Curd'],
    avoid: ['Excess caffeine/tea, High sodium foods (leaches calcium), Carbonated sodas']
  },
  'Magnesium': {
    eat: ['Pumpkin seeds, Almonds, Dark leafy greens (Spinach/Methi)', 'Bananas, Dark Chocolate (70%+), Beans & Lentils'],
    avoid: ['Refined sugar, Excess alcohol, White maida products']
  },
  'Iron': {
    eat: ['Beetroot, Pomegranate, Dates, Jaggery (Gud)', 'Spinach, Rajma, Chana, Sesame seeds, Garden cress seeds'],
    avoid: ['Tea/Coffee immediately after meals (inhibits iron absorption), Taking calcium with iron']
  },
  'Protein': {
    eat: ['Moong Sprouts, Paneer, Boiled Egg Whites, Soya Chunks', 'Yellow/Green Moong Dal, Greek Yogurt, Chana, Almonds'],
    avoid: ['Junk food, Ultra-processed meats, Empty-calorie sweets']
  },
  'Phosphorus': {
    eat: ['Nuts & Seeds, Whole Grains (Brown Rice, Oats)', 'Cow Milk, Paneer, Lentils, Pumpkin seeds'],
    avoid: ['Phosphoric acid in colas/sodas, Processed cheese slices']
  },
  'Vitamin B': {
    eat: ['Whole Grains, Moong Sprouts, Bananas, Cow Milk', 'Curd, Green Peas, Peanuts, Leafy greens'],
    avoid: ['Refined flour (Maida), Excessive alcohol, High sugar intake']
  },
  'Vitamin D': {
    eat: ['Sunlight exposure (15-20 min early morning)', 'Egg Yolks, Fortified Milk, Mushrooms, Paneer'],
    avoid: ['Sedentary indoor lifestyle, High sugar & trans-fats']
  },
  'Vitamin K': {
    eat: ['Green Leafy Vegetables (Kale, Spinach, Methi)', 'Cabbage, Broccoli, Green Peas, Mustard greens'],
    avoid: ['Ultra-processed junk food']
  },
  'Potassium': {
    eat: ['Tender Coconut Water, Bananas, Sweet Potatoes', 'Spinach, Oranges, Pomegranate, Muskmelon'],
    avoid: ['High-sodium canned foods, Salty packaged chips']
  },
  'Zinc': {
    eat: ['Pumpkin seeds, Sesame seeds, Chickpeas (Kabuli Chana)', 'Cashews, Watermelon seeds, Whole grains'],
    avoid: ['Alcohol, Excessive refined carbohydrates']
  },
  'Sodium': {
    eat: ['Pink Himalayan Salt (in moderation), Tender Coconut Water', 'Celery, Natural soups, Spinach'],
    avoid: ['Excess table salt, Salted chips, Commercial pickles, Canned soups']
  },
  'Manganese': {
    eat: ['Whole Grains (Oats, Barley), Pineapples, Nuts', 'Leafy greens, Black tea, Legumes'],
    avoid: ['Refined processed foods']
  }
};

export const DISORDER_NUTRITION_MAP: Record<string, { eat: string[]; avoid: string[] }> = {
  'Sugar (Diabetes)': {
    eat: ['Jamun, Methi (Fenugreek) seeds water, Cinnamon water', 'Whole oats, Ragi, Barley, Bitter Gourd (Karela) juice', 'High-fiber salads, Sprouts'],
    avoid: ['White Sugar, Maida, Sweets, Bakery items', 'Carbonated drinks, White Rice, Fruit juices with added sugar', 'High GI fruits (Mangoes/Chiku in excess)']
  },
  'High BP / Hypertension': {
    eat: ['Tender Coconut Water, Garlic (1 clove on empty stomach)', 'Flaxseeds, Bananas, Beetroot juice, Cucumber', 'Watermelon, Oats'],
    avoid: ['Extra raw table salt, Commercial Pickles, Papad', 'Salted chips, Processed meats, Canned foods, Soy sauce']
  },
  'Thyroid': {
    eat: ['Brazil Nuts (Selenium), Sunflower seeds, Whole Grains', 'Iodized salt (moderate), Mushrooms, Eggs, Pumpkins'],
    avoid: ['Raw cruciferous veggies (Raw Cabbage/Cauliflower in large excess)', 'Excessive Soy products, Refined sugar, Fried foods']
  },
  'Gastritis': {
    eat: ['Warm Buttermilk with Roasted Cumin & Curry leaves', 'Soft Moong Dal Khichdi, Oats porridge, Aloe Vera juice', 'Boiled Lauki (Bottle Gourd), Steamed Apple'],
    avoid: ['Extremely spicy red/green chillies, Deep-fried snacks', 'Coffee, Tea, Alcohol, Carbonated drinks, Citrus fruits on empty stomach']
  },
  'IBS / IBD': {
    eat: ['Low-FODMAP foods, Soft Boiled Rice with Curd', 'Steamed Carrots, Pumpkin, Peppermint tea, Oats'],
    avoid: ['Spicy food, Raw salads (hard to digest), Fried foods', 'Artificial sweeteners, Milk (if lactose sensitive), Alcohol']
  },
  'GERD': {
    eat: ['Cold Milk (2 tbsp), Fennel seed (Saunf) water', 'Bananas, Oatmeal, Ginger tea (mild), Alkaline green veggies'],
    avoid: ['Late night heavy meals, Mint/Peppermint (relaxes sphincter)', 'Chocolate, Citrus fruits, Tomatoes, Spicy & oily foods']
  },
  'Piles': {
    eat: ['High-Fiber foods: Fig (Anjeer soaked), Prunes, Isabgol (Psyllium husk)', 'Tender Coconut water, Curd rice, Oats, Plenty of warm water (3L/day)'],
    avoid: ['Spicy chilies, Maida, Fast food, Red meat', 'Astringent green unripened bananas, Bakery products']
  },
  'PCOD': {
    eat: ['Cinnamon infusion, Spearmint tea (reduces androgens)', 'Flaxseeds, Sprouts, Quinoa, Oats, Green leafy veggies'],
    avoid: ['Refined sugar, Maida, Trans-fats, Dairy excess', 'Sugary beverages, Processed fast food']
  },
  'Insulin Resistance': {
    eat: ['Apple Cider Vinegar (1 tsp in warm water before meals)', 'Methi water, Chia seeds, Sprouts, High-protein meals'],
    avoid: ['Refined carbs, Maida, Fruit juices, Sweets', 'Frequent snacking without protein/fiber balance']
  },
  'Hairfall': {
    eat: ['Fresh Curry Leaves, Amla, Almonds, Walnuts', 'Flaxseeds, Spinach, Eggs, Black Sesame seeds, Coconut water'],
    avoid: ['Junk food, Excess sugar, Alcohol, Excessive caffeine', 'Refined oils']
  },
  'Melasma': {
    eat: ['Antioxidant-rich Berries, Tomatoes (Lycopene), Carrots', 'Green Tea, Citrus fruits, Spinach, Vitamin E nuts'],
    avoid: ['Processed fried food, Excessive sugar, Inflammatory seed oils']
  },
  'Weight Gain': {
    eat: ['Banana-Date Shake with Almonds, Paneer, Peanut butter', 'Soaked Almonds & Raisins, Ragi malt, Whole Milk, Avocado'],
    avoid: ['Junk calories, Empty sugary drinks, Skipping meals']
  },
  'Weight Loss': {
    eat: ['Warm Lemon-Honey Water (morning), High-fiber salads', 'Sprouts, Green Tea, Moong Dal Soup, Cucumbers, Bottle Gourd juice'],
    avoid: ['Deep fried foods, Maida, Sweets, Sugar sodas', 'Late night heavy dinners, Bakery items, Trans-fats']
  },
  'Height Growth': {
    eat: ['Cow Milk, Paneer, Eggs, Ragi, Moong Sprouts', 'Soybeans, Sesame seeds, Fresh fruits, Pumpkin seeds'],
    avoid: ['Carbonated colas (depletes calcium), Junk fast food', 'Irregular sleep schedule']
  },
  'Adenoids / Tonsillitis': {
    eat: ['Warm Golden Turmeric Milk, Ginger-Honey Tea', 'Warm Vegetable Soups, Tulsi infusion, Soft lukewarm porridge'],
    avoid: ['Ice creams, Cold refrigerated drinks, Deep fried crispy food', 'Excess sour curd at night, Carbonated beverages']
  },
  'Allergies': {
    eat: ['Warm Water throughout the day, Turmeric, Ginger, Tulsi', 'Amla, Citrus fruits (Vit C), Local Raw Honey, Garlic'],
    avoid: ['Cold refrigerated items, Preservatives & Artificial colors', 'Junk food, Excess dairy if mucous-producing']
  }
};

export const calculateBmi = (hCm: string, wKg: string): string => {
  const h = parseFloat(hCm);
  const w = parseFloat(wKg);
  if (!h || !w || h <= 0 || w <= 0) return '';
  const hM = h / 100;
  const val = w / (hM * hM);
  let category = '';
  if (val < 18.5) category = 'Underweight';
  else if (val <= 24.9) category = 'Normal';
  else if (val <= 29.9) category = 'Overweight';
  else category = 'Obese';
  return `${val.toFixed(1)} (${category})`;
};

export const generateNutritionSuggestions = (
  selectedDefs: Record<string, boolean>,
  selectedDis: Record<string, boolean>
) => {
  const eatSet = new Set<string>();
  const avoidSet = new Set<string>();

  Object.keys(selectedDefs).forEach(key => {
    if (selectedDefs[key] && DEFICIENCY_NUTRITION_MAP[key]) {
      DEFICIENCY_NUTRITION_MAP[key].eat.forEach(item => eatSet.add(item));
      DEFICIENCY_NUTRITION_MAP[key].avoid.forEach(item => avoidSet.add(item));
    }
  });

  Object.keys(selectedDis).forEach(key => {
    if (selectedDis[key] && DISORDER_NUTRITION_MAP[key]) {
      DISORDER_NUTRITION_MAP[key].eat.forEach(item => eatSet.add(item));
      DISORDER_NUTRITION_MAP[key].avoid.forEach(item => avoidSet.add(item));
    }
  });

  if (eatSet.size === 0) {
    eatSet.add('Fresh green leafy vegetables, Moong Sprouts, Fresh fruits (Amla, Papaya, Oranges)');
    eatSet.add('Whole grains (Ragi, Oats, Brown rice), Tender coconut water, Soaked almonds & seeds');
  }
  if (avoidSet.size === 0) {
    avoidSet.add('White Sugar, Maida, Deep-fried & oily snacks, Carbonated drinks, Excessive tea/coffee');
  }

  return {
    eat: Array.from(eatSet).map(s => `• ${s}`).join('\n'),
    avoid: Array.from(avoidSet).map(s => `• ${s}`).join('\n')
  };
};

export interface DayDietItem {
  day: number;
  phase: number;
  phaseTitle: string;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}

export const generate30DayDietPlanMenu = (
  selectedDefs: Record<string, boolean> = {},
  selectedDis: Record<string, boolean> = {}
): DayDietItem[] => {
  const activeDefs = Object.keys(selectedDefs).filter(k => selectedDefs[k]);
  const activeDis = Object.keys(selectedDis).filter(k => selectedDis[k]);

  // Extract condition flags
  const hasDiabetes = Boolean(selectedDis['Sugar (Diabetes)'] || selectedDis['Insulin Resistance']);
  const hasBP = Boolean(selectedDis['High BP / Hypertension']);
  const hasThyroid = Boolean(selectedDis['Thyroid']);
  const hasGastritis = Boolean(selectedDis['Gastritis'] || selectedDis['GERD'] || selectedDis['IBS / IBD']);
  const hasPiles = Boolean(selectedDis['Piles']);
  const hasPCOD = Boolean(selectedDis['PCOD']);
  const hasHairfall = Boolean(selectedDis['Hairfall'] || selectedDis['Melasma']);
  const hasWeightLoss = Boolean(selectedDis['Weight Loss']);
  const hasWeightGain = Boolean(selectedDis['Weight Gain']);
  const hasHeightGrowth = Boolean(selectedDis['Height Growth']);
  const hasTonsillitis = Boolean(selectedDis['Adenoids / Tonsillitis'] || selectedDis['Allergies']);

  const hasVitA = Boolean(selectedDefs['Vitamin A']);
  const hasVitC = Boolean(selectedDefs['Vitamin C']);
  const hasVitE = Boolean(selectedDefs['Vitamin E']);
  const hasCalcium = Boolean(selectedDefs['Calcium'] || selectedDefs['Vitamin D']);
  const hasIron = Boolean(selectedDefs['Iron']);
  const hasProtein = Boolean(selectedDefs['Protein']);
  const hasMagnesium = Boolean(selectedDefs['Magnesium'] || selectedDefs['Potassium'] || selectedDefs['Zinc']);

  // Morning drink boosters based on active conditions
  const morningDrinks: string[] = [];
  if (hasGastritis) morningDrinks.push('Saunf Water');
  if (hasDiabetes) morningDrinks.push('Methi Water');
  if (hasBP) morningDrinks.push('Coconut Water');
  if (hasIron || hasVitC) morningDrinks.push('Amla Shot');
  if (hasPCOD) morningDrinks.push('Cinnamon Tea');
  if (hasHairfall) morningDrinks.push('Curry Leaves Juice');
  if (hasWeightLoss) morningDrinks.push('Warm Lemon Honey Water');
  if (hasWeightGain) morningDrinks.push('Warm Milk with Soaked Almonds');
  if (hasTonsillitis) morningDrinks.push('Golden Turmeric Water');
  if (morningDrinks.length === 0) morningDrinks.push('Warm Saunf Water');

  return Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    let phase = 1;
    let phaseTitle = 'Phase 1: Detox & Gut Reset';
    if (day > 10 && day <= 20) {
      phase = 2;
      phaseTitle = 'Phase 2: Metabolic Correction';
    } else if (day > 20) {
      phase = 3;
      phaseTitle = 'Phase 3: Sustained Vitality';
    }

    const drink = morningDrinks[(day - 1) % morningDrinks.length];

    // Base meals
    let breakfast = '';
    let lunch = '';
    let snacks = '';
    let dinner = '';

    // Day-based variations
    if (day % 3 === 1) {
      breakfast = `${drink} + Steamed Oats Idli with Mint Chutney`;
      lunch = `2 Jowar Rotis + Yellow Moong Dal + Sautéed Lauki`;
      snacks = `Roasted Makhana + Green Tea`;
      dinner = `Light Moong Dal Khichdi + Cucumber Raita`;
    } else if (day % 3 === 2) {
      breakfast = `${drink} + Moong Sprouts Salad with Pomegranate`;
      lunch = `1 Cup Brown Rice / Ragi Roti + Palak Dal + Sautéed Bhindi`;
      snacks = `Soaked Almonds (5) & Walnuts (2) + Coconut Water`;
      dinner = `Mixed Vegetable Soup + Oats Upma`;
    } else {
      breakfast = `${drink} + Ragi Dosa with Vegetable Sambhar`;
      lunch = `2 Bajra Rotis + Methi Dal + Turmeric Sautéed Pumpkin`;
      snacks = `Roasted Chana + Cinnamon Lemon Tea`;
      dinner = `Dalia Khichdi with Carrots & Peas`;
    }

    // Apply Deficiencies & Disorders Boosters dynamically to Meals
    if (hasDiabetes) {
      breakfast = breakfast.replace('Idli', 'Oats Methi Idli').replace('Dosa', 'Besan Oats Chilla');
      lunch = lunch.replace('Brown Rice', 'Brown Rice / Barley').concat(' + Jamun / Karela Juice');
      dinner += ' + Cinnamon Infusion';
    }

    if (hasBP) {
      lunch += ' + Garlic Cucumbers (Low Salt)';
      snacks = snacks.replace('Green Tea', 'Coconut Water & Flaxseeds');
    }

    if (hasGastritis) {
      breakfast = breakfast.replace('Mint Chutney', 'Mild Saunf Dip');
      lunch += ' + Fresh Cumin Buttermilk';
      dinner = 'Soft Moong Dal Khichdi + Lauki Raita (Gentle on stomach)';
    }

    if (hasPiles) {
      breakfast += ' + 2 Soaked Figs (Anjeer)';
      snacks += ' + Isabgol Warm Water';
    }

    if (hasIron) {
      breakfast += ' + Soaked Dates & Jaggery';
      lunch += ' + Beetroot & Pomegranate Salad';
    }

    if (hasVitA) {
      breakfast += ' + Steamed Papaya / Carrots';
      dinner += ' + Pumpkin Soup';
    }

    if (hasCalcium) {
      breakfast += ' + Cow Milk / Ragi Malt';
      dinner += ' + Golden Turmeric Milk before bed';
    }

    if (hasProtein) {
      breakfast = breakfast.replace('Salad', 'Salad + Paneer / Boiled Egg Whites');
      lunch += ' + Soya Chunks / Sprouts';
    }

    if (hasHairfall) {
      snacks += ' + Black Sesame & Flaxseeds';
    }

    if (hasWeightLoss) {
      lunch = lunch.replace('2 ', '1.5 ');
      snacks = 'High-Fiber Salad / Roasted Makhana + Green Tea';
    }

    if (hasWeightGain) {
      snacks = 'Banana Date Shake with Peanut Butter & Almonds';
    }

    if (hasTonsillitis) {
      breakfast = breakfast.replace('Salad', 'Warm Porridge');
      dinner += ' + Warm Tulsi Ginger Tea';
    }

    return {
      day,
      phase,
      phaseTitle,
      breakfast,
      lunch,
      snacks,
      dinner
    };
  });
};

export interface PatientFileUIProps {
  patient: any;
  doctorName?: string;
  onClose?: () => void;
  onSubmitConsultation?: (data: any) => Promise<void>;
  onRegisterPackage?: (packageInfo: any) => void;
  isStandalonePage?: boolean;
  userRoleTitle?: string;
}

export const PatientFileUI: React.FC<PatientFileUIProps> = ({
  patient,
  doctorName = 'Dr. Prashanth K Vaidya',
  onClose,
  onSubmitConsultation,
  onRegisterPackage,
  isStandalonePage = false,
  userRoleTitle = 'Dilshuknagar Receptionist',
}) => {
  const [activeTab, setActiveTab] = useState<'clinical' | 'diet' | 'media' | 'package'>('clinical');

  // Patient Info Values (with fallbacks matching reference screenshots)
  const patientName = patient?.patientName || patient?.name || 'Swpana latha';
  const regId = patient?.registrationId || patient?.regId || 'SPHDSN-124';
  const phone = patient?.phone || patient?.phoneNumber || '9000136260';
  const branchName = patient?.branch || 'Dilshuknagar';
  const source = patient?.source || patient?.leadSource || 'Old Patient';
  const subject = patient?.subject || patient?.diseases || 'Fever';

  // --- TAB 1: CLINICAL FORM STATE ---
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [drawPrescription, setDrawPrescription] = useState<'on' | 'off'>('off');
  const [physicalFile, setPhysicalFile] = useState<File | null>(null);
  const [followUpInterval, setFollowUpInterval] = useState('No Follow-up');
  const [preferredFollowUpDate, setPreferredFollowUpDate] = useState('2026-10-07');
  const [pharmacyFee, setPharmacyFee] = useState('');

  // Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHasContent, setCanvasHasContent] = useState(false);

  // --- TAB 2: DIET PLAN STATE ---
  const [selectedDietPlan, setSelectedDietPlan] = useState('+ Create New Diet Plan');
  const [age, setAge] = useState(patient?.age || patient?.patientAge || '');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState('');
  const [deficiencies, setDeficiencies] = useState<Record<string, boolean>>({});
  const [disorders, setDisorders] = useState<Record<string, boolean>>({});
  const [otherDisorders, setOtherDisorders] = useState('');
  const [symptomsSigns, setSymptomsSigns] = useState('');
  const [foodsToEat, setFoodsToEat] = useState('');
  const [foodsToAvoid, setFoodsToAvoid] = useState('');
  const [dietFeeAmount, setDietFeeAmount] = useState('');

  // 30-Day Diet Plan State
  const [dietMenuDays, setDietMenuDays] = useState<DayDietItem[]>([]);
  const [showFull30DayModal, setShowFull30DayModal] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'all'>('all');

  const handleHeightChange = (val: string) => {
    setHeight(val);
    setBmi(calculateBmi(val, weight));
  };

  const handleWeightChange = (val: string) => {
    setWeight(val);
    setBmi(calculateBmi(height, val));
  };

  const toggleDeficiency = (item: string) => {
    const updated = { ...deficiencies, [item]: !deficiencies[item] };
    setDeficiencies(updated);
    const nut = generateNutritionSuggestions(updated, disorders);
    setFoodsToEat(nut.eat);
    setFoodsToAvoid(nut.avoid);
  };

  const toggleDisorder = (item: string) => {
    const updated = { ...disorders, [item]: !disorders[item] };
    setDisorders(updated);
    const nut = generateNutritionSuggestions(deficiencies, updated);
    setFoodsToEat(nut.eat);
    setFoodsToAvoid(nut.avoid);
  };

  useEffect(() => {
    setDietMenuDays(generate30DayDietPlanMenu(deficiencies, disorders));
  }, [deficiencies, disorders]);

  // --- TAB 3: SHARE MEDIA STATE ---
  const [sharedMediaList, setSharedMediaList] = useState<string[]>([]);
  const [showGlobalMediaModal, setShowGlobalMediaModal] = useState(false);

  // --- TAB 4: REGISTER PACKAGE STATE ---
  const [totalPackageAmount, setTotalPackageAmount] = useState('');
  const [initialAdvancePaid, setInitialAdvancePaid] = useState('0');
  const [packagePurpose, setPackagePurpose] = useState('');
  const [packageDuration, setPackageDuration] = useState('3 Months');
  const [packageStartDate, setPackageStartDate] = useState('2026-09-07');
  const [packageEndDate, setPackageEndDate] = useState('2026-12-07');

  // Uploaded Prescriptions State
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const base64Url = event.target.result as string;
          setUploadedImages((prev) => [...prev, base64Url]);

          // Save directly to Firebase Firestore if patient appointment document exists
          if (patient?.id) {
            try {
              const appRef = doc(db, 'appointments', patient.id);
              await updateDoc(appRef, {
                uploadedPrescriptions: arrayUnion(base64Url),
                updatedAt: new Date().toISOString()
              }).catch(() => { });
            } catch (err) {
              console.log('Firebase upload note:', err);
            }
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // --- MEDICAL HISTORY & PAST VISITS FETCHING ---
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [selectedVisitModal, setSelectedVisitModal] = useState<any | null>(null);
  const [fullPrescriptionPreview, setFullPrescriptionPreview] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const phoneCandidates = [
      patient?.phone, patient?.phoneNumber, patient?.mobile, patient?.mobileNumber,
      patient?.contact, patient?.contactNumber, phone
    ].map(p => String(p || '').replace(/\D/g, '').slice(-10)).filter(p => p.length === 10);

    const regCandidates = [
      patient?.registrationId, patient?.regId, patient?.patientId, patient?.regNo,
      patient?.registrationNo, patient?.uhid, patient?.id, regId
    ].map(r => String(r || '').trim().toLowerCase()).filter(Boolean);

    const nameCandidates = [
      patient?.patientName, patient?.name, patient?.fullName, patientName
    ].map(n => String(n || '').trim().toLowerCase()).filter(Boolean);
    const firstName = nameCandidates[0]?.split(' ')[0] || '';

    const formatFirebaseStorageUrl = (url: string | null | undefined): string => {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('blob:')
      ) {
        return trimmed;
      }
      if (trimmed.startsWith('gs://')) {
        const parts = trimmed.replace('gs://', '').split('/');
        const bucket = parts.shift();
        const filePath = parts.join('/');
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
      }
      const bucketName = 'spiritual-homeopathy-3b552.appspot.com';
      const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(cleanPath)}?alt=media`;
    };

    const fetchLiveVisits = async () => {
      if (!db) return;
      const collectionsToListen = ['appointments', 'medicine_requests', 'prescriptions', 'allpatients', 'patients'];
      const unsubs: Array<() => void> = [];
      const storeMap = new Map<string, any>();

      const getTimestamp = (item: any) => {
        const val = item?.createdAt;
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return new Date(val).getTime() || 0;
        if (typeof val === 'object') {
          if (typeof val.seconds === 'number') return val.seconds * 1000;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
        }
        return 0;
      };

      const updateVisitsState = () => {
        if (!isMounted) return;
        const allList = Array.from(storeMap.values());
        allList.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        setPatientVisits(allList);
      };

      collectionsToListen.forEach((colName) => {
        try {
          const colRef = collection(db, colName);
          const unsub = onSnapshot(colRef, (snapshot) => {
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const docPhone = String(data.phone || data.phoneNumber || data.mobile || data.mobileNumber || data.contact || data.contactNumber || data.phoneNo || '').replace(/\D/g, '').slice(-10);

              const docRegs = [
                data.registrationId, data.regId, data.patientId, data.regNo,
                data.registrationNo, data.uhid, data.patient_id, data.appointmentId, docSnap.id
              ].map(r => String(r || '').trim().toLowerCase()).filter(Boolean);

              const docName = String(data.patientName || data.name || data.fullName || data.patient_name || data.patient || '').trim().toLowerCase();

              const isPhoneMatch = docPhone && phoneCandidates.includes(docPhone);
              const isRegMatch = docRegs.some(r => regCandidates.includes(r));
              const isIdMatch = regCandidates.some(r => r === docSnap.id || r === String(data.appointmentId || '').toLowerCase() || r === String(data.patientId || '').toLowerCase());

              const isNameMatch = nameCandidates.some(n =>
                (n && docName && (n.includes(docName) || docName.includes(n))) ||
                (firstName && firstName.length >= 3 && docName.includes(firstName))
              );

              const isMatch = isPhoneMatch || isRegMatch || isIdMatch || isNameMatch;

              if (isMatch) {
                const visitKey = data.appointmentId || docSnap.id;
                const existing = storeMap.get(visitKey);

                const rawImages: string[] = [];
                if (Array.isArray(data.uploadedPrescriptions)) rawImages.push(...data.uploadedPrescriptions);
                if (Array.isArray(data.prescriptions)) rawImages.push(...data.prescriptions);
                if (Array.isArray(data.prescriptionImages)) rawImages.push(...data.prescriptionImages);
                if (Array.isArray(data.reports)) rawImages.push(...data.reports);
                if (Array.isArray(data.media)) rawImages.push(...data.media);
                if (Array.isArray(data.images)) rawImages.push(...data.images);
                if (Array.isArray(data.documents)) rawImages.push(...data.documents);
                if (Array.isArray(data.attachments)) rawImages.push(...data.attachments);

                if (typeof data.prescriptionImage === 'string' && data.prescriptionImage) rawImages.push(data.prescriptionImage);
                if (typeof data.prescriptionUrl === 'string' && data.prescriptionUrl) rawImages.push(data.prescriptionUrl);
                if (typeof data.reportUrl === 'string' && data.reportUrl) rawImages.push(data.reportUrl);
                if (typeof data.imageUrl === 'string' && data.imageUrl) rawImages.push(data.imageUrl);
                if (typeof data.canvasPrescriptionUrl === 'string' && data.canvasPrescriptionUrl) rawImages.push(data.canvasPrescriptionUrl);
                if (typeof data.canvasUrl === 'string' && data.canvasUrl) rawImages.push(data.canvasUrl);
                if (typeof data.fileUrl === 'string' && data.fileUrl) rawImages.push(data.fileUrl);
                if (typeof data.documentUrl === 'string' && data.documentUrl) rawImages.push(data.documentUrl);

                const canvasUrl = formatFirebaseStorageUrl(data.canvasPrescriptionUrl || data.canvasUrl || existing?.canvasPrescriptionUrl || null);
                const docMedicines = data.items || data.medicines || data.remedies || data.prescribedMedicines || data.prescriptionItems || data.medications || data.rx || data.typedPrescriptions || [];

                const combinedMedicines = [
                  ...(existing?.medicines || []),
                  ...(Array.isArray(docMedicines) ? docMedicines : [])
                ];
                const medicineMap = new Map();
                combinedMedicines.forEach((m) => {
                  if (m) {
                    const mName = m.name || m.medicineName || m.remedyName || (typeof m === 'string' ? m : null);
                    if (mName && mName !== '[object Object]') {
                      medicineMap.set(mName, typeof m === 'object' ? m : { name: mName, dosage: '4 Pills', frequency: 'Twice Daily', duration: '7 Days', instructions: 'After food' });
                    }
                  }
                });
                const mergedMedicines = Array.from(medicineMap.values());

                const formattedRawImages = rawImages.filter(Boolean).map(formatFirebaseStorageUrl).filter(Boolean);

                const combinedPrescriptions = Array.from(new Set([
                  ...(existing?.uploadedPrescriptions || []),
                  ...formattedRawImages
                ]));

                storeMap.set(visitKey, {
                  id: visitKey,
                  visitDate: data.appointmentDate || data.date || data.scheduledDate || existing?.visitDate || 'Today',
                  visitTime: data.appointmentTime || data.time || existing?.visitTime || '10:00 AM',
                  doctorName: data.doctorName || data.doctor || existing?.doctorName || doctorName || 'Dr. Prashanth K Vaidya',
                  branch: data.branch || data.branchName || existing?.branch || branchName || 'Main Branch',
                  consultationMode: data.consultationMode || existing?.consultationMode || 'In-Clinic',
                  paidAmount: data.paidAmount || data.amountPaid || data.totalMedicineFee || data.consultationFee || data.totalAmount || existing?.paidAmount || '500',
                  paymentStatus: data.paymentStatus || existing?.paymentStatus || 'paid',
                  subject: data.diseases || data.subject || existing?.subject || 'General Consultation',
                  diseases: data.diseases || data.subject || existing?.diseases || '',
                  diagnosisNotes: (data.diagnosisNotes && data.diagnosisNotes !== 'Clinical consultation & prescription recorded.') ? data.diagnosisNotes : (existing?.diagnosisNotes || data.notes || data.prescriptionNotes || data.chiefComplaints || 'Clinical consultation & prescription recorded.'),
                  medicines: mergedMedicines,
                  canvasPrescriptionUrl: canvasUrl,
                  uploadedPrescriptions: combinedPrescriptions,
                  createdAt: data.createdAt || existing?.createdAt || new Date().toISOString()
                });
              }
            });
            updateVisitsState();
          }, () => { });
          unsubs.push(unsub);
        } catch (err) {
          console.error("Error subscribing to " + colName, err);
        }
      });

      return () => {
        unsubs.forEach(unsub => unsub());
      };
    };

    fetchLiveVisits();

    return () => {
      isMounted = false;
    };
  }, [patientName, phone, regId, doctorName, branchName, subject]);

  // Deficiency items checklist
  const deficiencyList = [
    'Vitamin A', 'Vitamin C', 'Vitamin E', 'Calcium', 'Magnesium', 'Iron', 'Protein', 'Phosphorus',
    'Vitamin B', 'Vitamin D', 'Vitamin K', 'Potassium', 'Zinc', 'Sodium', 'Manganese'
  ];

  // Common Health Disorders pills
  const disordersList = [
    'Sugar (Diabetes)', 'High BP / Hypertension', 'Thyroid', 'Gastritis', 'IBS / IBD', 'GERD',
    'Piles', 'PCOD', 'Insulin Resistance', 'Hairfall', 'Melasma', 'Weight Gain', 'Weight Loss',
    'Height Growth', 'Adenoids / Tonsillitis', 'Allergies'
  ];

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setCanvasHasContent(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHasContent(false);
  };

  const handleSaveConsultation = async () => {
    setSaving(true);

    // Save canvas drawing if present
    let canvasDataUrl: string | null = null;
    if (canvasRef.current && canvasHasContent) {
      try {
        canvasDataUrl = canvasRef.current.toDataURL('image/png');
      } catch (err) {
        console.error("Canvas export error:", err);
      }
    }

    const finalUploadedList = [...uploadedImages];
    if (canvasDataUrl) {
      finalUploadedList.unshift(canvasDataUrl);
    }

    const payload = {
      patientId: patient?.id || patient?.patientId || regId,
      patientName,
      regId,
      phone,
      diagnosisNotes,
      followUpInterval,
      preferredFollowUpDate,
      pharmacyFee,
      drawPrescription,
      uploadedPrescriptions: finalUploadedList,
      canvasPrescriptionUrl: canvasDataUrl,
    };

    // Save directly into Firebase Firestore (prescriptions & appointments)
    try {
      if (db) {
        await addDoc(collection(db, 'prescriptions'), {
          ...payload,
          createdAt: new Date().toISOString()
        });

        const targetDocId = patient?.id || patient?.appointmentId || patient?.patientId;
        const targetCol = patient?.collectionName || 'appointments';

        if (targetDocId) {
          const updatePayload = {
            uploadedPrescriptions: finalUploadedList,
            diagnosisNotes,
            pharmacyFee,
            followUpInterval,
            preferredFollowUpDate,
            status: 'collect_fee',
            paymentStatus: pharmacyFee ? 'pending' : 'paid',
            feeCollectionNeeded: true,
            updatedAt: new Date().toISOString()
          };

          const colsToUpdate = Array.from(new Set([targetCol, 'appointments', 'allpatients', 'patients']));
          for (const col of colsToUpdate) {
            try {
              await updateDoc(doc(db, col, targetDocId), updatePayload);
            } catch (e) { }
          }
        }
      }
    } catch (err) {
      console.error("Firestore save error:", err);
    }

    if (onSubmitConsultation) {
      await onSubmitConsultation(payload);
    }
    setToastMessage('Sent to Reception! Consultation saved & patient sent to Reception for Fee Collection.');
    setTimeout(() => {
      setToastMessage('');
      if (onClose) onClose();
    }, 1800);
    setSaving(false);
  };

  const handleSaveDietPlan = async () => {
    setSaving(true);
    const activeDefs = Object.keys(deficiencies).filter(k => deficiencies[k]);
    const activeDis = Object.keys(disorders).filter(k => disorders[k]);

    const dietPayload = {
      patientId: patient?.id || patient?.patientId || regId,
      patientName,
      regId,
      phone,
      doctorName,
      branchName,
      age,
      height,
      weight,
      bmi,
      selectedDietPlan,
      deficiencies: activeDefs,
      disorders: activeDis,
      otherDisorders,
      symptomsSigns,
      foodsToEat,
      foodsToAvoid,
      dietFeeAmount,
      dietMenuDays,
      savedAt: new Date().toISOString()
    };

    try {
      if (db) {
        await addDoc(collection(db, 'diet_plans'), {
          ...dietPayload,
          createdAt: new Date().toISOString()
        });

        if (patient?.id) {
          const appRef = doc(db, 'appointments', patient.id);
          await updateDoc(appRef, {
            dietPlan: dietPayload,
            updatedAt: new Date().toISOString()
          }).catch(() => { });
        }
      }
    } catch (err) {
      console.error("Firestore diet plan save error:", err);
    }

    setToastMessage('Diet Plan & 30-Day Menu saved directly to Firebase!');
    setTimeout(() => {
      setToastMessage('');
    }, 2500);
    setSaving(false);
  };

  const handleCreatePackage = () => {
    const pkgData = {
      totalPackageAmount,
      initialAdvancePaid,
      packagePurpose,
      packageDuration,
      packageStartDate,
      packageEndDate,
    };
    if (onRegisterPackage) onRegisterPackage(pkgData);
    setToastMessage('Package Membership Created Successfully!');
    setTimeout(() => setToastMessage(''), 2500);
  };

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: isStandalonePage ? '100vh' : 'auto',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#0f172a',
      fontSize: '12px'
    }}>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(2, 132, 199, 0.3)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* 1. TOP HEADER BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '8px',
                color: '#334155',
                fontWeight: 700,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ‹ Back to Dashboard
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Patient File: {patientName} ({regId})
            </h1>
            <span style={{
              backgroundColor: '#fef08a',
              color: '#854d0e',
              border: '1px solid #fde047',
              fontSize: '9.5px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 800,
              letterSpacing: '0.4px'
            }}>
              IN DURATION
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{userRoleTitle}</div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            border: '1px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '13px'
          }}>
            D
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER: 2 COLUMN GRID */}
      <div style={{
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '20px',
        maxWidth: '1440px',
        margin: '0 auto'
      }}>

        {/* LEFT COLUMN: PATIENT INFO & STACK CARDS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* CARD 1: PATIENT INFORMATION CARD */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {patientName}
              </h2>
              <span style={{
                backgroundColor: '#fef08a',
                color: '#854d0e',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 800
              }}>
                IN DURATION
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#475569', fontSize: '11.5px' }}>
              <div style={{ color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                📋 Reg ID: {regId}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📞 {phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📍 {branchName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📢 Source: {source}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a' }}>
                📋 Subject: {subject}
              </div>
            </div>

            {/* Sub-Card: Register Patient in Package Box */}
            <div style={{
              marginTop: '16px',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>No active package.</span>
              <button
                onClick={() => setActiveTab('package')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #0284c7',
                  color: '#0284c7',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                + Register Patient in Package
              </button>
            </div>
          </div>

          {/* CARD 2: MEDICAL HISTORY & PAST VISITS */}
          <div style={{
            backgroundColor: '#f0f9ff',
            borderRadius: '14px',
            border: '1px solid #bae6fd',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⏱ Medical History ({patientVisits.length})
              </h3>
              <span style={{ fontSize: '10.5px', color: '#0369a1', fontWeight: 700, background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                Click visit for prescription
              </span>
            </div>

            {patientVisits.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '24px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '100px'
              }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  No previous visits recorded for this patient.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                {patientVisits.map((visit) => (
                  <div
                    key={visit.id}
                    onClick={() => setSelectedVisitModal(visit)}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                  >
                    {/* Outer Card: STRICTLY Date & Branch */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        📅 {visit.visitDate}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1' }}>
                        📍 {visit.branch}
                      </span>
                    </div>

                    {/* View Details Action Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 700 }}>
                        View Full Prescription & Info ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARD 3: UPLOADED PRESCRIPTIONS & CANVAS */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '18px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📤 Uploaded Prescriptions & Canvas
            </h3>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {uploadedImages.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <img src={img} alt="Prescription Scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: '#0284c7',
                border: 'none',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: 'fit-content',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
              }}
            >
              + Upload Image
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: TABS & MAIN CONTENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* TOP TABS NAVIGATION BAR */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '6px 12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            {[
              { id: 'clinical', label: 'Clinical Form' },
              { id: 'diet', label: 'Diet Plan' },
              { id: 'media', label: 'Share Media' },
              { id: 'package', label: 'Register Package' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                    color: isActive ? '#0284c7' : '#64748b',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '12.5px',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: CLINICAL FORM CONTENT */}
          {activeTab === 'clinical' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Digital Prescription
              </h2>

              {/* Diagnosis Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Diagnosis Notes
                </label>
                <textarea
                  rows={5}
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="Enter detailed clinical notes and diagnosis..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Draw Prescription (Optional) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  Draw Prescription (Optional)
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="drawPrescription"
                    checked={drawPrescription === 'on'}
                    onChange={() => setDrawPrescription('on')}
                  /> On
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="drawPrescription"
                    checked={drawPrescription === 'off'}
                    onChange={() => setDrawPrescription('off')}
                  /> Off
                </label>
              </div>

              {/* Canvas Pad (Visible if Draw Prescription is On) */}
              {drawPrescription === 'on' && (
                <div style={{ border: '2px dashed #0284c7', borderRadius: '10px', padding: '10px', backgroundColor: '#f0f9ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>✍️ Freehand Canvas Prescription Drawing Pad</span>
                    <button onClick={clearCanvas} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Clear</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={750}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ backgroundColor: '#ffffff', width: '100%', borderRadius: '6px', cursor: 'crosshair' }}
                  />
                </div>
              )}

              {/* Physical Prescription File Upload Input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Physical Prescription (Optional if Canvas Drawing is used)
                </label>
                <div style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFileUpload}
                    style={{ fontSize: '11.5px' }}
                  />
                </div>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Upload one or multiple photos of the handwritten prescription.
                </span>
              </div>

              {/* Follow-up Recommendation */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Follow-up Recommendation
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Follow-up Interval
                    </label>
                    <select
                      value={followUpInterval}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFollowUpInterval(val);
                        const now = new Date();
                        if (val === '15 Days') now.setDate(now.getDate() + 15);
                        else if (val === '1 Month') now.setMonth(now.getMonth() + 1);
                        else if (val === '2 Months') now.setMonth(now.getMonth() + 2);
                        else if (val === '3 Months') now.setMonth(now.getMonth() + 3);
                        else if (val === '4 Months') now.setMonth(now.getMonth() + 4);
                        else if (val === '5 Months') now.setMonth(now.getMonth() + 5);
                        else if (val === '6 Months') now.setMonth(now.getMonth() + 6);
                        
                        if (val === 'No Follow-up') {
                          setPreferredFollowUpDate('');
                        } else {
                          const yyyy = now.getFullYear();
                          const mm = String(now.getMonth() + 1).padStart(2, '0');
                          const dd = String(now.getDate()).padStart(2, '0');
                          setPreferredFollowUpDate(`${yyyy}-${mm}-${dd}`);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        backgroundColor: '#ffffff',
                        outline: 'none'
                      }}
                    >
                      <option value="No Follow-up">No Follow-up</option>
                      <option value="15 Days">15 Days</option>
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="4 Months">4 Months</option>
                      <option value="5 Months">5 Months</option>
                      <option value="6 Months">6 Months</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Preferred Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={preferredFollowUpDate}
                      onChange={(e) => setPreferredFollowUpDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Consultation & Medicine Fee */}
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Consultation & Medicine Fee
                </h3>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Enter Amount (₹)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter amount..."
                    value={pharmacyFee}
                    onChange={(e) => setPharmacyFee(e.target.value)}
                    style={{
                      width: '260px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Save Consultation Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  onClick={handleSaveConsultation}
                  disabled={saving}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {saving ? 'Sending to Reception...' : 'Send to Reception & Collect Fee'}
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: DIET PLAN CONTENT */}
          {activeTab === 'diet' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              {/* Select Plan Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Select Plan:</span>
                <select
                  value={selectedDietPlan}
                  onChange={(e) => setSelectedDietPlan(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    minWidth: '220px'
                  }}
                >
                  <option value="+ Create New Diet Plan">+ Create New Diet Plan</option>
                  <option value="General Homeopathy Plan">General Homeopathy Plan</option>
                  <option value="Gastric & Weight Loss">Gastric & Weight Loss</option>
                </select>
              </div>

              {/* Vitals / Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Age</label>
                  <input type="text" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 32" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Height (cm)</label>
                  <input type="text" value={height} onChange={(e) => handleHeightChange(e.target.value)} placeholder="e.g. 165" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Weight (kg)</label>
                  <input type="text" value={weight} onChange={(e) => handleWeightChange(e.target.value)} placeholder="e.g. 68" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>BMI (Auto)</label>
                  <input type="text" value={bmi} onChange={(e) => setBmi(e.target.value)} placeholder="Auto calculated" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #0284c7', fontSize: '12px', fontWeight: 800, backgroundColor: '#f0f9ff', color: '#0284c7' }} />
                </div>
              </div>

              {/* Grid: Deficiencies checklist & Common Health Disorders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Deficiencies Checklist */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                      Deficiencies checklist ({DEFICIENCY_LIST.filter(i => deficiencies[i]).length} Selected)
                    </h4>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>15 Essential Nutrients</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                    {DEFICIENCY_LIST.map((item) => {
                      const isChecked = Boolean(deficiencies[item]);
                      return (
                        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: isChecked ? '#0284c7' : '#475569', fontWeight: isChecked ? 700 : 500 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDeficiency(item)}
                            style={{ cursor: 'pointer', accentColor: '#0284c7' }}
                          />
                          {item}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Common Health Disorders */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                      Common Health Disorders ({DISORDERS_LIST.filter(i => disorders[i]).length} Active)
                    </h4>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>16 Clinical Conditions</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {DISORDERS_LIST.map((item) => {
                      const isSel = Boolean(disorders[item]);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleDisorder(item)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: isSel ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                            backgroundColor: isSel ? '#e0f2fe' : '#ffffff',
                            color: isSel ? '#0284c7' : '#475569',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSel ? '0 1px 4px rgba(2, 132, 199, 0.2)' : 'none'
                          }}
                        >
                          {isSel ? '✓ ' : '+ '}{item}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Other Diseases / Disorders & Symptoms/Signs Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Other Diseases/Disorders</label>
                  <input type="text" placeholder="e.g. Asthma, Sinusitis..." value={otherDisorders} onChange={(e) => setOtherDisorders(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Symptoms/Signs</label>
                  <input type="text" placeholder="e.g. Fatigue, Bloating..." value={symptomsSigns} onChange={(e) => setSymptomsSigns(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                </div>
              </div>

              {/* Foods to Eat & Foods to Avoid Textareas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#166534', display: 'block', marginBottom: '4px' }}>🟢 Foods to Eat (Auto-Generated Nutrients)</label>
                  <textarea rows={4} value={foodsToEat} onChange={(e) => setFoodsToEat(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', fontSize: '11.5px', color: '#14532d', lineHeight: 1.4 }} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#991b1b', display: 'block', marginBottom: '4px' }}>🔴 Foods to Avoid (Clinical Restrictions)</label>
                  <textarea rows={4} value={foodsToAvoid} onChange={(e) => setFoodsToAvoid(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', fontSize: '11.5px', color: '#7f1d1d', lineHeight: 1.4 }} />
                </div>
              </div>

              {/* Fee Amount (₹) */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Diet Consultation Fee (₹)</label>
                <input type="text" placeholder="Enter fee..." value={dietFeeAmount} onChange={(e) => setDietFeeAmount(e.target.value)} style={{ width: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              </div>

              {/* 30-Day Diet Plan Menu */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🗓 30-Day Diet Plan Menu
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Customized into 3 Phases (Detox, Metabolic Correction, Sustained Vitality)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFull30DayModal(true)}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)'
                    }}
                  >
                    ↗ Expand / Full 30-Day Diet Plan Modal
                  </button>
                </div>

                {/* Preview Table Showing Days 1 to 5 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: 800 }}>
                      <th style={{ padding: '8px 10px', width: '50px' }}>DAY</th>
                      <th style={{ padding: '8px 10px' }}>BREAKFAST (8:00 AM)</th>
                      <th style={{ padding: '8px 10px' }}>LUNCH (1:00 PM)</th>
                      <th style={{ padding: '8px 10px' }}>SNACKS (4:30 PM)</th>
                      <th style={{ padding: '8px 10px' }}>DINNER (8:00 PM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dietMenuDays.slice(0, 5).map((item) => (
                      <tr key={item.day} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0284c7' }}>Day {item.day}</td>
                        <td style={{ padding: '8px 10px', color: '#1e293b' }}>{item.breakfast}</td>
                        <td style={{ padding: '8px 10px', color: '#1e293b' }}>{item.lunch}</td>
                        <td style={{ padding: '8px 10px', color: '#1e293b' }}>{item.snacks}</td>
                        <td style={{ padding: '8px 10px', color: '#1e293b' }}>{item.dinner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span
                    onClick={() => setShowFull30DayModal(true)}
                    style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    + View remaining 25 days in Full 30-Day Modal...
                  </span>
                </div>
              </div>

              {/* Save & Print Diet Plan Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={16} /> Print Diet Chart
                </button>
                <button
                  type="button"
                  onClick={handleSaveDietPlan}
                  disabled={saving}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {saving ? 'Saving...' : '💾 Save Diet Plan & 30-Day Menu'}
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: SHARE MEDIA CONTENT */}
          {activeTab === 'media' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Shared Media & Education
                </h2>
                <button
                  onClick={() => setShowGlobalMediaModal(true)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📁 Share Global Library Media
                </button>
              </div>

              {sharedMediaList.length === 0 ? (
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px dashed #bae6fd',
                  borderRadius: '10px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '12px'
                }}>
                  No global media has been shared with this patient yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sharedMediaList.map((item, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }}>
                      📄 {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REGISTER PACKAGE CONTENT */}
          {activeTab === 'package' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Register Patient in Package
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Total Package Amount (₹) *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter total package cost"
                    value={totalPackageAmount}
                    onChange={(e) => setTotalPackageAmount(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Initial Advance Paid (₹)
                  </label>
                  <input
                    type="text"
                    value={initialAdvancePaid}
                    onChange={(e) => setInitialAdvancePaid(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Package Purpose / Disease
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chronic Asthma, Sinusitis"
                  value={packagePurpose}
                  onChange={(e) => setPackagePurpose(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Package Duration
                  </label>
                  <select
                    value={packageDuration}
                    onChange={(e) => setPackageDuration(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff' }}
                  >
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={packageStartDate}
                    onChange={(e) => setPackageStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={packageEndDate}
                    onChange={(e) => setPackageEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  onClick={handleCreatePackage}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  Create Package Membership
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* SHARE GLOBAL MEDIA MODAL */}
      {showGlobalMediaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Select Media to Share</h3>
              <button onClick={() => setShowGlobalMediaModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Homeopathy Guidelines & Food Care PDF', 'Diet Routine Video Series', 'Skin & Hair Awareness Guide'].map(item => (
                <button
                  key={item}
                  onClick={() => {
                    if (!sharedMediaList.includes(item)) setSharedMediaList([...sharedMediaList, item]);
                    setShowGlobalMediaModal(false);
                  }}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISIT DETAILS & PRESCRIPTION POPUP MODAL */}
      {selectedVisitModal && (
        <div
          onClick={() => setSelectedVisitModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: '1px solid #e2e8f0',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedVisitModal(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Visit Details & Prescription
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Visited on {selectedVisitModal.visitDate} @ {selectedVisitModal.visitTime}
                </p>
              </div>
            </div>

            {/* Visit Info Details Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Patient Name</span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>{patientName} ({regId})</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Attending Doctor</span>
                <span style={{ fontSize: '13px', color: '#0284c7', fontWeight: 800 }}>{selectedVisitModal.doctorName}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Branch & Mode</span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>
                  {selectedVisitModal.branch} • {selectedVisitModal.consultationMode}
                </span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Amount Paid</span>
                <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 900, background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                  ₹{selectedVisitModal.paidAmount} Paid ✓
                </span>
              </div>
            </div>

            {/* Diagnosis / Notes Box */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                📋 Diagnosis & Clinical Notes
              </label>
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '12.5px',
                color: '#1e293b',
                lineHeight: '1.5'
              }}>
                {selectedVisitModal.diagnosisNotes || selectedVisitModal.subject || 'No diagnosis notes entered for this visit.'}
              </div>
            </div>

            {/* DIGITAL PRESCRIPTION MEDICINES SECTION */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                💊 Prescribed Medicines ({selectedVisitModal.medicines?.length || 0})
              </label>

              {selectedVisitModal.medicines && selectedVisitModal.medicines.length > 0 ? (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#e0f2fe', color: '#0369a1', textAlign: 'left', fontWeight: 800, fontSize: '11px' }}>
                        <th style={{ padding: '8px 12px' }}>REMEDY / MEDICINE</th>
                        <th style={{ padding: '8px 12px' }}>DOSAGE & FREQUENCY</th>
                        <th style={{ padding: '8px 12px' }}>DURATION & TIMING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVisitModal.medicines.map((med: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 800, color: '#0f172a' }}>
                            {med.name || med.medicineName || 'Homeopathic Remedy'}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#0284c7', fontWeight: 700 }}>
                            {med.dosage || '4 Pills'} • {med.frequency || 'Twice Daily'}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>
                            {med.duration || '7 Days'} ({med.instructions || 'After meals'})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '11.5px', color: '#64748b' }}>
                  No digital medicine items added. View handwritten prescription scan below.
                </div>
              )}
            </div>

            {/* UPLOADED PRESCRIPTION SCANS & CANVAS */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                📄 Uploaded Prescription Scans & Canvas Document
              </label>

              {(() => {
                const images = Array.from(new Set([
                  ...(selectedVisitModal.canvasPrescriptionUrl ? [selectedVisitModal.canvasPrescriptionUrl] : []),
                  ...(selectedVisitModal.uploadedPrescriptions || [])
                ].filter(Boolean)));

                if (images.length === 0) {
                  return (
                    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                      No digital prescription scans uploaded for this visit.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {images.map((url: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setFullPrescriptionPreview(url)}
                        style={{
                          position: 'relative',
                          width: '130px',
                          height: '150px',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          border: '2px solid #0284c7',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.18)'
                        }}
                      >
                        <img src={url} alt="Prescription Document" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(15, 23, 42, 0.82)',
                          color: '#ffffff',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '4px',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}>
                          <Eye size={12} /> View Full
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={16} /> Print Record
              </button>
              <button
                type="button"
                onClick={() => setSelectedVisitModal(null)}
                style={{
                  flex: 1.5,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE 30-DAY DIET PLAN MODAL */}
      {showFull30DayModal && (
        <div
          onClick={() => setShowFull30DayModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1200px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🗓 30-Day Customized Clinical Diet Plan Menu
                </h2>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', display: 'flex', gap: '12px' }}>
                  <span>Patient: <strong>{patientName}</strong> ({regId})</span>
                  <span>Age: <strong>{age || 'N/A'}</strong></span>
                  <span>BMI: <strong>{bmi || 'N/A'}</strong></span>
                  <span>Deficiencies: <strong>{Object.keys(deficiencies).filter(k => deficiencies[k]).length}</strong></span>
                  <span>Disorders: <strong>{Object.keys(disorders).filter(k => disorders[k]).length}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={14} /> Print Plan
                </button>
                <button
                  type="button"
                  onClick={() => setShowFull30DayModal(false)}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0284c7',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Phase Filters Row */}
            <div style={{ padding: '12px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginRight: '8px' }}>Phase Filter:</span>
              {[
                { label: 'All 30 Days', val: 'all' },
                { label: 'Phase 1: Detox (Days 1-10)', val: 1 },
                { label: 'Phase 2: Metabolic (Days 11-20)', val: 2 },
                { label: 'Phase 3: Vitality (Days 21-30)', val: 3 }
              ].map((p) => {
                const isActive = selectedPhaseFilter === p.val;
                return (
                  <button
                    key={String(p.val)}
                    type="button"
                    onClick={() => setSelectedPhaseFilter(p.val as any)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: isActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: isActive ? '#0284c7' : '#ffffff',
                      color: isActive ? '#ffffff' : '#475569',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body Table */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', color: '#334155', fontWeight: 800 }}>
                    <th style={{ padding: '10px 12px', width: '65px' }}>DAY</th>
                    <th style={{ padding: '10px 12px', width: '140px' }}>PHASE</th>
                    <th style={{ padding: '10px 12px' }}>BREAKFAST (8:00 AM)</th>
                    <th style={{ padding: '10px 12px' }}>LUNCH (1:00 PM)</th>
                    <th style={{ padding: '10px 12px' }}>EVENING SNACKS (4:30 PM)</th>
                    <th style={{ padding: '10px 12px' }}>DINNER (8:00 PM)</th>
                  </tr>
                </thead>
                <tbody>
                  {dietMenuDays
                    .filter((item) => selectedPhaseFilter === 'all' || item.phase === selectedPhaseFilter)
                    .map((item, idx) => (
                      <tr key={item.day} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 900, color: '#0284c7' }}>Day {item.day}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: item.phase === 1 ? '#dbeafe' : item.phase === 2 ? '#fef3c7' : '#dcfce7',
                            color: item.phase === 1 ? '#1e40af' : item.phase === 2 ? '#92400e' : '#166534'
                          }}>
                            {item.phaseTitle}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            value={item.breakfast}
                            onChange={(e) => {
                              const updated = [...dietMenuDays];
                              const targetIdx = updated.findIndex(d => d.day === item.day);
                              if (targetIdx !== -1) {
                                updated[targetIdx].breakfast = e.target.value;
                                setDietMenuDays(updated);
                              }
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            value={item.lunch}
                            onChange={(e) => {
                              const updated = [...dietMenuDays];
                              const targetIdx = updated.findIndex(d => d.day === item.day);
                              if (targetIdx !== -1) {
                                updated[targetIdx].lunch = e.target.value;
                                setDietMenuDays(updated);
                              }
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            value={item.snacks}
                            onChange={(e) => {
                              const updated = [...dietMenuDays];
                              const targetIdx = updated.findIndex(d => d.day === item.day);
                              if (targetIdx !== -1) {
                                updated[targetIdx].snacks = e.target.value;
                                setDietMenuDays(updated);
                              }
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            value={item.dinner}
                            onChange={(e) => {
                              const updated = [...dietMenuDays];
                              const targetIdx = updated.findIndex(d => d.day === item.day);
                              if (targetIdx !== -1) {
                                updated[targetIdx].dinner = e.target.value;
                                setDietMenuDays(updated);
                              }
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>💡 Tip: You can directly edit any meal box above before saving or printing.</span>
              <button
                type="button"
                onClick={() => setShowFull30DayModal(false)}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 24px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Save & Close 30-Day Plan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRINT-ONLY CLINICAL DIET CHART & 30-DAY MENU */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-diet-chart, #printable-diet-chart * {
            visibility: visible !important;
          }
          #printable-diet-chart {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: Arial, sans-serif !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          .print-table tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .print-table thead {
            display: table-header-group !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #94a3b8 !important;
            padding: 5px 7px !important;
            font-size: 9.5px !important;
            text-align: left !important;
          }
        }
      `}</style>

      <div id="printable-diet-chart" style={{ display: 'none' }}>
        {/* Clinic Print Header */}
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '10px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#0284c7', fontWeight: 900 }}>SPIRITUAL HOMEOPATHY</h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#475569', fontWeight: 700 }}>Customized Clinical Nutrition & 30-Day Diet Plan</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#334155' }}>
            <div><strong>Branch:</strong> {branchName}</div>
            <div><strong>Doctor:</strong> {doctorName}</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {/* Patient Vitals Summary */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
          <span><strong>Patient:</strong> {patientName} ({regId})</span>
          <span><strong>Phone:</strong> {phone}</span>
          <span><strong>Age:</strong> {age || 'N/A'}</span>
          <span><strong>Height:</strong> {height ? `${height} cm` : 'N/A'}</span>
          <span><strong>Weight:</strong> {weight ? `${weight} kg` : 'N/A'}</span>
          <span><strong>BMI:</strong> {bmi || 'N/A'}</span>
        </div>

        {/* Foods to Eat & Foods to Avoid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div style={{ border: '1px solid #86efac', backgroundColor: '#f0fdf4', borderRadius: '6px', padding: '8px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '10.5px', color: '#166534', fontWeight: 800 }}>🟢 Foods to Eat (Prescribed Nutrients)</h4>
            <div style={{ fontSize: '9.5px', color: '#14532d', whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>{foodsToEat}</div>
          </div>

          <div style={{ border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '6px', padding: '8px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '10.5px', color: '#991b1b', fontWeight: 800 }}>🔴 Foods to Avoid (Clinical Restrictions)</h4>
            <div style={{ fontSize: '9.5px', color: '#7f1d1d', whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>{foodsToAvoid}</div>
          </div>
        </div>

        {/* 30-Day Diet Plan Menu Table */}
        <h3 style={{ fontSize: '11.5px', margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800 }}>🗓 30-Day Customized Meal Menu Schedule</h3>
        <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a', fontWeight: 800 }}>
              <th style={{ width: '45px' }}>DAY</th>
              <th style={{ width: '120px' }}>PHASE</th>
              <th>BREAKFAST (8:00 AM)</th>
              <th>LUNCH (1:00 PM)</th>
              <th>SNACKS (4:30 PM)</th>
              <th>DINNER (8:00 PM)</th>
            </tr>
          </thead>
          <tbody>
            {dietMenuDays.map((item) => (
              <tr key={item.day}>
                <td style={{ fontWeight: 800, color: '#0284c7' }}>Day {item.day}</td>
                <td style={{ fontWeight: 700 }}>{item.phaseTitle}</td>
                <td>{item.breakfast}</td>
                <td>{item.lunch}</td>
                <td>{item.snacks}</td>
                <td>{item.dinner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
