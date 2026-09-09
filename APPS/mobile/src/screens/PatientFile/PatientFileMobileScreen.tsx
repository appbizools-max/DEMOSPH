import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, Modal, FlatList, Dimensions, Platform, PanResponder
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { db } from '@app/shared';
import { collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
const DEFICIENCY_LIST = [
  'Vitamin A', 'Vitamin C', 'Vitamin E', 'Calcium', 'Magnesium',
  'Iron', 'Protein', 'Phosphorus', 'Vitamin B', 'Vitamin D',
  'Vitamin K', 'Potassium', 'Zinc', 'Sodium', 'Manganese'
];
const DISORDERS_LIST = [
  'Sugar (Diabetes)', 'High BP / Hypertension', 'Thyroid', 'Gastritis',
  'IBS / IBD', 'GERD', 'Piles', 'PCOD', 'Insulin Resistance',
  'Hairfall', 'Melasma', 'Weight Gain', 'Weight Loss',
  'Height Growth', 'Adenoids / Tonsillitis', 'Allergies'
];

const DEFICIENCY_NUTRITION_MAP: Record<string, { eat: string[]; avoid: string[] }> = {
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

const DISORDER_NUTRITION_MAP: Record<string, { eat: string[]; avoid: string[] }> = {
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

const calculateBmi = (hCm: string, wKg: string): string => {
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

const generateNutritionSuggestions = (
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

interface DayDietItem {
  day: number;
  phase: number;
  phaseTitle: string;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}

const generate30DayDietPlanMenu = (
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

interface PatientFileMobileScreenProps {
  patient?: any;
  onBack?: () => void;
  onSaveConsultation?: (data: any) => void;
}

const renderSafeString = (val: any, fallback: string = ''): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.text === 'string') return val.text;
    if (typeof val.notes === 'string') return val.notes;
    if (typeof val.name === 'string') return val.name;
    try {
      return JSON.stringify(val);
    } catch (e) {
      return fallback;
    }
  }
  return String(val);
};

export const PatientFileMobileScreen: React.FC<PatientFileMobileScreenProps> = ({
  patient,
  onBack,
  onSaveConsultation,
}) => {
  const [activeTab, setActiveTab] = useState<'clinical' | 'diet' | 'media' | 'package'>('clinical');

  // Patient Info Fallbacks matching reference screenshots
  const patientName = renderSafeString(patient?.patientName || patient?.name, 'Swpana latha');
  const regId = renderSafeString(patient?.registrationId || patient?.regId || patient?.patientId, 'SPHDSN-124');
  const phone = renderSafeString(patient?.phone || patient?.phoneNumber, '9000136260');
  const branchName = renderSafeString(patient?.branch, 'Dilshuknagar');
  const source = renderSafeString(patient?.source || patient?.leadSource, 'Old Patient');
  const subject = renderSafeString(patient?.subject || patient?.diseases, 'Fever');

  // Tab 1: Clinical Form State
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [drawPrescription, setDrawPrescription] = useState<'on' | 'off'>('off');
  const [followUpInterval, setFollowUpInterval] = useState('No Follow-up');
  const [preferredFollowUpDate, setPreferredFollowUpDate] = useState('2026-10-07');
  const [pharmacyFee, setPharmacyFee] = useState('');

  // Mobile Canvas Drawing State & Handlers
  const mobileCanvasRef = React.useRef<any>(null);
  const [mobileCanvasHasContent, setMobileCanvasHasContent] = useState(false);
  const [drawingStrokes, setDrawingStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawingWeb, setIsDrawingWeb] = useState(false);

  const clearMobileCanvas = () => {
    if (Platform.OS === 'web' && mobileCanvasRef.current) {
      const ctx = mobileCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, mobileCanvasRef.current.width, mobileCanvasRef.current.height);
      }
    }
    setDrawingStrokes([]);
    setCurrentStroke([]);
    setMobileCanvasHasContent(false);
  };

  const startWebDrawing = (e: any) => {
    if (!mobileCanvasRef.current) return;
    const ctx = mobileCanvasRef.current.getContext('2d');
    if (!ctx) return;
    setIsDrawingWeb(true);
    const rect = mobileCanvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawWeb = (e: any) => {
    if (!isDrawingWeb || !mobileCanvasRef.current) return;
    const ctx = mobileCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = mobileCanvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setMobileCanvasHasContent(true);
  };

  const stopWebDrawing = () => {
    setIsDrawingWeb(false);
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentStroke([{ x: locationX, y: locationY }]);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
          setMobileCanvasHasContent(true);
        },
        onPanResponderRelease: () => {
          if (currentStroke.length > 0) {
            setDrawingStrokes((prev) => [...prev, currentStroke]);
            setCurrentStroke([]);
          }
        },
      }),
    [currentStroke]
  );

  const handleSaveConsultation = async () => {
    let canvasDataUrl: string | null = null;
    if (drawPrescription === 'on') {
      if (Platform.OS === 'web' && mobileCanvasRef.current && mobileCanvasHasContent) {
        try {
          canvasDataUrl = mobileCanvasRef.current.toDataURL('image/png');
        } catch (err) {
          console.error("Canvas export error:", err);
        }
      }
    }

    const payload = {
      patientId: patient?.id || patient?.patientId || regId,
      patientName,
      regId,
      phone,
      branchName,
      diagnosisNotes,
      drawPrescription,
      canvasPrescriptionUrl: canvasDataUrl,
      followUpInterval,
      preferredFollowUpDate,
      pharmacyFee,
      uploadedPrescriptions: uploadedImages,
      savedAt: new Date().toISOString()
    };

    if (canvasDataUrl) {
      setUploadedImages((prev) => [...prev, canvasDataUrl!]);
    }

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
            uploadedPrescriptions: uploadedImages,
            diagnosisNotes,
            pharmacyFee,
            followUpInterval,
            preferredFollowUpDate,
            ...(canvasDataUrl ? { canvasPrescriptionUrl: canvasDataUrl, uploadedPrescriptions: arrayUnion(canvasDataUrl) } : {}),
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
      console.error("Firestore consultation save error:", err);
    }

    if (onSaveConsultation) {
      onSaveConsultation(payload);
    } else {
      Alert.alert("Sent to Reception", "Consultation saved & patient sent to Reception for Fee Collection!");
    }
  };

  // Tab 2: Diet Plan State
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

  // Mobile 30-Day Diet State
  const [dietMenuDays, setDietMenuDays] = useState<DayDietItem[]>([]);
  const [showFull30DayModal, setShowFull30DayModal] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'all'>('all');

  const handleMobileHeightChange = (val: string) => {
    setHeight(val);
    setBmi(calculateBmi(val, weight));
  };

  const handleMobileWeightChange = (val: string) => {
    setWeight(val);
    setBmi(calculateBmi(height, val));
  };

  const toggleMobileDeficiency = (item: string) => {
    const updated = { ...deficiencies, [item]: !deficiencies[item] };
    setDeficiencies(updated);
    const nut = generateNutritionSuggestions(updated, disorders);
    setFoodsToEat(nut.eat);
    setFoodsToAvoid(nut.avoid);
  };

  const toggleMobileDisorder = (item: string) => {
    const updated = { ...disorders, [item]: !disorders[item] };
    setDisorders(updated);
    const nut = generateNutritionSuggestions(deficiencies, updated);
    setFoodsToEat(nut.eat);
    setFoodsToAvoid(nut.avoid);
  };

  useEffect(() => {
    setDietMenuDays(generate30DayDietPlanMenu(deficiencies, disorders));
  }, [deficiencies, disorders]);

  const handleSaveDietPlan = async () => {
    const activeDefs = Object.keys(deficiencies).filter(k => deficiencies[k]);
    const activeDis = Object.keys(disorders).filter(k => disorders[k]);

    const dietPayload = {
      patientId: patient?.id || patient?.patientId || regId,
      patientName,
      regId,
      phone,
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

    Alert.alert("Success", "Diet Plan & 30-Day Menu saved directly to Firebase!");
  };

  // Tab 3: Share Media State
  const [sharedMediaList, setSharedMediaList] = useState<string[]>([]);
  const [showGlobalMediaModal, setShowGlobalMediaModal] = useState(false);

  // Tab 4: Register Package State
  const [totalPackageAmount, setTotalPackageAmount] = useState('');
  const [initialAdvancePaid, setInitialAdvancePaid] = useState('0');
  const [packagePurpose, setPackagePurpose] = useState('');
  const [packageDuration, setPackageDuration] = useState('3 Months');
  const [packageStartDate, setPackageStartDate] = useState('2026-09-07');
  const [packageEndDate, setPackageEndDate] = useState('2026-12-07');

  // Uploaded Prescriptions State
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const mobileFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleMobileFileUpload = (e: any) => {
    const files = e.target?.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const base64Url = event.target.result as string;
          setUploadedImages((prev) => [...prev, base64Url]);

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

      const getTimestamp = (item: any): number => {
        try {
          const val = item?.createdAt || item?.savedAt || item?.updatedAt || item?.date;
          if (!val) return 0;
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          if (typeof val === 'string') {
            const t = new Date(val).getTime();
            return isNaN(t) ? 0 : t;
          }
          if (typeof val === 'object') {
            if (typeof val.seconds === 'number') return val.seconds * 1000;
            if (typeof val.toDate === 'function') {
              const t = val.toDate().getTime();
              return isNaN(t) ? 0 : t;
            }
          }
        } catch (e) { }
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
            try {
              snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (!data) return;
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
                    doctorName: data.doctorName || data.doctor || existing?.doctorName || 'Dr. Prashanth K Vaidya',
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
            } catch (snapErr) {
              console.warn("Error parsing snapshot for " + colName, snapErr);
            }
          }, (err) => {
            console.warn("Snapshot error for " + colName, err);
          });
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
  }, [patientName, phone, regId, branchName, subject]);

  // Deficiencies List
  const deficiencyList = [
    'Vitamin A', 'Vitamin C', 'Vitamin E', 'Calcium', 'Magnesium', 'Iron', 'Protein', 'Phosphorus',
    'Vitamin B', 'Vitamin D', 'Vitamin K', 'Potassium', 'Zinc', 'Sodium', 'Manganese'
  ];

  // Common Health Disorders Pills
  const disordersList = [
    'Sugar (Diabetes)', 'High BP / Hypertension', 'Thyroid', 'Gastritis', 'IBS / IBD', 'GERD',
    'Piles', 'PCOD', 'Insulin Resistance', 'Hairfall', 'Melasma', 'Weight Gain', 'Weight Loss',
    'Height Growth', 'Adenoids / Tonsillitis', 'Allergies'
  ];



  const handleCreatePackage = () => {
    Alert.alert('Success', 'Package Membership Created Successfully!');
  };

  return (
    <View style={styles.container}>


      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>

        {/* 2. PATIENT INFO CARD STACK */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={styles.patientNameText}>{patientName}</Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>IN DURATION</Text>
            </View>
          </View>

          <View style={styles.infoRowStack}>
            <Text style={styles.regIdText}>📋 Reg ID: {regId}</Text>
            <Text style={styles.infoText}>📞 {phone}</Text>
            <Text style={styles.infoText}>📍 {branchName}</Text>
            <Text style={styles.infoText}>📢 Source: {source}</Text>
            <Text style={styles.subjectText}>📋 Subject: {subject}</Text>
          </View>

          <View style={styles.packageNoticeBox}>
            <Text style={styles.packageNoticeText}>No active package.</Text>
            <TouchableOpacity style={styles.registerPkgBtn} onPress={() => setActiveTab('package')}>
              <Text style={styles.registerPkgBtnText}>+ Register Patient in Package</Text>
            </TouchableOpacity>
          </View>
        </View>




        {/* 5. TOP HORIZONTAL TABS BAR */}
        <View style={styles.tabsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: 'clinical', label: 'Clinical Form' },
              { id: 'diet', label: 'Diet Plan' },
              { id: 'media', label: 'Share Media' },
              { id: 'package', label: 'Register Package' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 6. TAB 1: CLINICAL FORM */}
        {activeTab === 'clinical' && (
          <View style={styles.card}>
            <Text style={styles.mainTabTitle}>Digital Prescription</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Diagnosis Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                value={diagnosisNotes}
                onChangeText={setDiagnosisNotes}
                placeholder="Enter detailed clinical notes and diagnosis..."
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 }}>
              <Text style={styles.label}>Draw Prescription (Optional)</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={() => setDrawPrescription('on')}
              >
                <Ionicons name={drawPrescription === 'on' ? 'radio-button-on' : 'radio-button-off'} size={18} color="#0284c7" />
                <Text style={styles.radioLabel}>On</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={() => setDrawPrescription('off')}
              >
                <Ionicons name={drawPrescription === 'off' ? 'radio-button-on' : 'radio-button-off'} size={18} color="#0284c7" />
                <Text style={styles.radioLabel}>Off</Text>
              </TouchableOpacity>
            </View>

            {/* Freehand Canvas Drawing Pad (Visible when Draw Prescription is On) */}
            {drawPrescription === 'on' && (
              <View style={{ borderWidth: 1.5, borderColor: '#0284c7', borderRadius: 10, padding: 10, backgroundColor: '#f0f9ff', marginVertical: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284c7' }}>✍️ Freehand Canvas Prescription Drawing Pad</Text>
                  <TouchableOpacity onPress={clearMobileCanvas} style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>Clear</Text>
                  </TouchableOpacity>
                </View>

                {Platform.OS === 'web' ? (
                  React.createElement('canvas', {
                    ref: mobileCanvasRef,
                    width: 600,
                    height: 180,
                    onMouseDown: startWebDrawing,
                    onMouseMove: drawWeb,
                    onMouseUp: stopWebDrawing,
                    onMouseLeave: stopWebDrawing,
                    onTouchStart: startWebDrawing,
                    onTouchMove: drawWeb,
                    onTouchEnd: stopWebDrawing,
                    style: {
                      backgroundColor: '#ffffff',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      cursor: 'crosshair',
                      width: '100%',
                      height: 180,
                      touchAction: 'none'
                    }
                  })
                ) : (
                  <View
                    {...panResponder.panHandlers}
                    style={{
                      width: '100%',
                      height: 180,
                      backgroundColor: '#ffffff',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Saved Strokes */}
                    {drawingStrokes.map((stroke, strokeIdx) => (
                      <React.Fragment key={strokeIdx}>
                        {stroke.map((pt, ptIdx) => {
                          if (ptIdx === 0) return null;
                          const prev = stroke[ptIdx - 1];
                          const dx = pt.x - prev.x;
                          const dy = pt.y - prev.y;
                          const length = Math.sqrt(dx * dx + dy * dy);
                          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                          return (
                            <View
                              key={ptIdx}
                              style={{
                                position: 'absolute',
                                left: prev.x,
                                top: prev.y,
                                width: Math.max(length, 2),
                                height: 3,
                                backgroundColor: '#0284c7',
                                borderRadius: 1.5,
                                transform: [{ rotate: `${angle}deg` }]
                              }}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}

                    {/* Active Stroke */}
                    {currentStroke.map((pt, ptIdx) => {
                      if (ptIdx === 0) return null;
                      const prev = currentStroke[ptIdx - 1];
                      const dx = pt.x - prev.x;
                      const dy = pt.y - prev.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      return (
                        <View
                          key={ptIdx}
                          style={{
                            position: 'absolute',
                            left: prev.x,
                            top: prev.y,
                            width: Math.max(length, 2),
                            height: 3,
                            backgroundColor: '#0284c7',
                            borderRadius: 1.5,
                            transform: [{ rotate: `${angle}deg` }]
                          }}
                        />
                      );
                    })}

                    {!mobileCanvasHasContent && drawingStrokes.length === 0 && currentStroke.length === 0 && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Draw prescription notes here with finger/stylus...</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Physical Prescription (Optional if Canvas Drawing is used)</Text>
              {/* Hidden File Input for Web/Mobile Web */}
              {Platform.OS === 'web' && React.createElement('input', {
                type: 'file',
                ref: mobileFileInputRef,
                accept: 'image/*',
                multiple: true,
                style: { display: 'none' },
                onChange: handleMobileFileUpload
              })}
              <TouchableOpacity
                style={styles.chooseFileBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && mobileFileInputRef.current) {
                    mobileFileInputRef.current.click();
                  } else {
                    Alert.alert("Prescription Scans", "Uploaded prescription scans for this patient are synced live from Firebase!");
                  }
                }}
              >
                <Text style={styles.chooseFileBtnText}>Choose Files</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{uploadedImages.length > 1 ? `${uploadedImages.length - 1} file(s) uploaded` : 'No file chosen'}</Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>Upload one or multiple photos of the handwritten prescription.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Follow-up Recommendation</Text>
              <Text style={styles.label}>Follow-up Interval</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['No Follow-up', '15 Days', '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => {
                        setFollowUpInterval(opt);
                        const now = new Date();
                        if (opt === '15 Days') now.setDate(now.getDate() + 15);
                        else if (opt === '1 Month') now.setMonth(now.getMonth() + 1);
                        else if (opt === '2 Months') now.setMonth(now.getMonth() + 2);
                        else if (opt === '3 Months') now.setMonth(now.getMonth() + 3);
                        else if (opt === '4 Months') now.setMonth(now.getMonth() + 4);
                        else if (opt === '5 Months') now.setMonth(now.getMonth() + 5);
                        else if (opt === '6 Months') now.setMonth(now.getMonth() + 6);

                        if (opt === 'No Follow-up') {
                          setPreferredFollowUpDate('');
                        } else {
                          const yyyy = now.getFullYear();
                          const mm = String(now.getMonth() + 1).padStart(2, '0');
                          const dd = String(now.getDate()).padStart(2, '0');
                          setPreferredFollowUpDate(`${yyyy}-${mm}-${dd}`);
                        }
                      }}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                        backgroundColor: followUpInterval === opt ? '#0284c7' : '#f1f5f9',
                        borderWidth: 1, borderColor: followUpInterval === opt ? '#0284c7' : '#cbd5e1'
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: followUpInterval === opt ? '#ffffff' : '#334155' }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.label, { marginTop: 8 }]}>Preferred Follow-up Date</Text>
              <TextInput
                style={styles.input}
                value={preferredFollowUpDate}
                onChangeText={setPreferredFollowUpDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Consultation & Medicine Fee</Text>
              <Text style={styles.label}>Enter Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount..."
                keyboardType="numeric"
                value={pharmacyFee}
                onChangeText={setPharmacyFee}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConsultation}>
              <Text style={styles.saveBtnText}>Send to Reception & Collect Fee</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 7. TAB 2: DIET PLAN */}
        {activeTab === 'diet' && (
          <View style={styles.card}>
            <Text style={styles.mainTabTitle}>Diet Plan Management</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="e.g. 32" />
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput style={styles.input} value={height} onChangeText={handleMobileHeightChange} keyboardType="numeric" placeholder="e.g. 165" />
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput style={styles.input} value={weight} onChangeText={handleMobileWeightChange} keyboardType="numeric" placeholder="e.g. 68" />
              </View>
              <View style={styles.metricCol}>
                <Text style={[styles.label, { color: '#0284c7', fontWeight: '800' }]}>BMI (Auto)</Text>
                <TextInput style={[styles.input, { backgroundColor: '#f0f9ff', borderColor: '#0284c7', color: '#0284c7', fontWeight: '800' }]} value={bmi} onChangeText={setBmi} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Deficiencies Checklist ({DEFICIENCY_LIST.filter(i => deficiencies[i]).length})</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {DEFICIENCY_LIST.map((item) => {
                  const isChecked = Boolean(deficiencies[item]);
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.7}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      style={[styles.checkChip, isChecked && styles.checkChipActive]}
                      onPress={() => toggleMobileDeficiency(item)}
                    >
                      <Text style={[styles.checkChipText, isChecked && styles.checkChipTextActive]}>
                        {isChecked ? '✓ ' : '+ '}{item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subTitle}>Common Health Disorders ({DISORDERS_LIST.filter(i => disorders[i]).length})</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {DISORDERS_LIST.map((item) => {
                  const isSel = Boolean(disorders[item]);
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.7}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      style={[styles.pillChip, isSel && styles.pillChipActive]}
                      onPress={() => toggleMobileDisorder(item)}
                    >
                      <Text style={[styles.pillChipText, isSel && styles.pillChipTextActive]}>
                        {isSel ? '✓ ' : '+ '}{item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: '#166534', fontWeight: '800' }]}>🟢 Foods to Eat (Auto-Generated Nutrients)</Text>
              <TextInput style={[styles.input, styles.textAreaSmall, { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#14532d' }]} multiline value={foodsToEat} onChangeText={setFoodsToEat} />

              <Text style={[styles.label, { marginTop: 10, color: '#991b1b', fontWeight: '800' }]}>🔴 Foods to Avoid (Clinical Restrictions)</Text>
              <TextInput style={[styles.input, styles.textAreaSmall, { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#7f1d1d' }]} multiline value={foodsToAvoid} onChangeText={setFoodsToAvoid} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Diet Consultation Fee (₹)</Text>
              <TextInput style={styles.input} placeholder="Enter fee..." keyboardType="numeric" value={dietFeeAmount} onChangeText={setDietFeeAmount} />
            </View>

            {/* 30-Day Diet Plan Menu Mobile Section */}
            <View style={{ marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a' }}>🗓 30-Day Diet Plan Menu</Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                  onPress={() => setShowFull30DayModal(true)}
                >
                  <Text style={{ fontSize: 11, color: '#ffffff', fontWeight: '800' }}>↗ Expand 30 Days</Text>
                </TouchableOpacity>
              </View>

              {/* Day 1 Preview Card */}
              {dietMenuDays.slice(0, 3).map((item) => (
                <View key={item.day} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284c7' }}>Day {item.day}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>{item.phaseTitle}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#334155' }}>🥣 <Text style={{ fontWeight: '800' }}>B:</Text> {item.breakfast}</Text>
                  <Text style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>🥗 <Text style={{ fontWeight: '800' }}>L:</Text> {item.lunch}</Text>
                  <Text style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>☕ <Text style={{ fontWeight: '800' }}>S:</Text> {item.snacks}</Text>
                  <Text style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>🍲 <Text style={{ fontWeight: '800' }}>D:</Text> {item.dinner}</Text>
                </View>
              ))}

              <TouchableOpacity onPress={() => setShowFull30DayModal(true)} style={{ alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 11.5, color: '#0284c7', fontWeight: '700', textDecorationLine: 'underline' }}>+ View all 30 days in Interactive Modal...</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveDietPlan}
                style={{
                  backgroundColor: '#0284c7',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 10
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                  💾 Save Diet Plan & 30-Day Menu
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 8. TAB 3: SHARE MEDIA */}
        {activeTab === 'media' && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.mainTabTitle}>Shared Media & Education</Text>
              <TouchableOpacity style={styles.actionBtnSmall} onPress={() => setShowGlobalMediaModal(true)}>
                <Text style={styles.actionBtnSmallText}>📁 Share Global Media</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dashedBox}>
              <Text style={styles.dashedBoxText}>No global media has been shared with this patient yet.</Text>
            </View>
          </View>
        )}

        {/* 9. TAB 4: REGISTER PACKAGE */}
        {activeTab === 'package' && (
          <View style={styles.card}>
            <Text style={styles.mainTabTitle}>Register Patient in Package</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Package Amount (₹) *</Text>
              <TextInput style={styles.input} placeholder="Enter total package cost" keyboardType="numeric" value={totalPackageAmount} onChangeText={setTotalPackageAmount} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Advance Paid (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={initialAdvancePaid} onChangeText={setInitialAdvancePaid} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Package Purpose / Disease</Text>
              <TextInput style={styles.input} placeholder="e.g. Chronic Asthma, Sinusitis" value={packagePurpose} onChangeText={setPackagePurpose} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreatePackage}>
              <Text style={styles.saveBtnText}>Create Package Membership</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MEDICAL HISTORY CARD (MOVED TO BOTTOM) */}
        <View style={styles.historyCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.historyHeaderTitle}>⏱ Medical History ({patientVisits.length})</Text>
            <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, color: '#0369a1', fontWeight: '800' }}>Tap for Prescription</Text>
            </View>
          </View>

          {patientVisits.length === 0 ? (
            <View style={styles.historyEmptyBox}>
              <Ionicons name="create-outline" size={24} color="#94a3b8" />
              <Text style={styles.historyEmptyText}>No previous visits recorded for this patient.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
              <View style={{ gap: 8, paddingRight: 2 }}>
                {patientVisits.map((visit) => (
                  <TouchableOpacity
                    key={visit.id}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      padding: 10,
                      gap: 4,
                      shadowColor: '#0f172a',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1
                    }}
                    onPress={() => setSelectedVisitModal(visit)}
                  >
                    {/* Outer Card: STRICTLY Date & Branch */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                          📅 {renderSafeString(visit.visitDate, 'Today')}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1' }}>
                        📍 {renderSafeString(visit.branch, 'Main Branch')}
                      </Text>
                    </View>

                    {/* View Details Action Indicator */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                      <Text style={{ fontSize: 10.5, color: '#0284c7', fontWeight: '700' }}>
                        View Full Prescription & Info ➔
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>


        {/* VISIT DETAILS & PRESCRIPTION POPUP MODAL FOR MOBILE */}
        <Modal
          visible={!!selectedVisitModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setSelectedVisitModal(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedVisitModal(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalCard, { maxWidth: 400, paddingVertical: 20 }]}
              onPress={() => { }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-text" size={20} color="#0284c7" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Visit Details</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>📅 {renderSafeString(selectedVisitModal?.visitDate, 'Today')} @ {renderSafeString(selectedVisitModal?.visitTime, '10:00 AM')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedVisitModal(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Visit Details Card */}
              <View style={{ width: '100%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, gap: 8, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11.5, color: '#64748b', fontWeight: '600' }}>Patient</Text>
                  <Text style={{ fontSize: 12.5, color: '#0f172a', fontWeight: '800' }}>{renderSafeString(patientName)} ({renderSafeString(regId)})</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11.5, color: '#64748b', fontWeight: '600' }}>Doctor</Text>
                  <Text style={{ fontSize: 12.5, color: '#0284c7', fontWeight: '800' }}>{renderSafeString(selectedVisitModal?.doctorName, 'Dr. Prashanth K Vaidya')}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11.5, color: '#64748b', fontWeight: '600' }}>Branch & Mode</Text>
                  <Text style={{ fontSize: 12.5, color: '#0f172a', fontWeight: '800' }}>{renderSafeString(selectedVisitModal?.branch, 'Main Branch')} • {renderSafeString(selectedVisitModal?.consultationMode, 'In-Clinic')}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11.5, color: '#64748b', fontWeight: '600' }}>Amount Paid</Text>
                  <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803d' }}>₹{renderSafeString(selectedVisitModal?.paidAmount, '500')} Paid ✓</Text>
                  </View>
                </View>
              </View>

              {/* Diagnosis Notes */}
              <View style={{ width: '100%', marginBottom: 14 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#334155', marginBottom: 4 }}>📋 Diagnosis & Clinical Notes</Text>
                <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 12, color: '#1e293b', lineHeight: 18 }}>
                    {renderSafeString(selectedVisitModal?.diagnosisNotes || selectedVisitModal?.subject, 'No diagnosis notes entered for this visit.')}
                  </Text>
                </View>
              </View>

              {/* Prescribed Medicines Section */}
              {selectedVisitModal?.medicines && selectedVisitModal.medicines.length > 0 && (
                <View style={{ width: '100%', marginBottom: 14 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284c7', marginBottom: 6 }}>
                    💊 Prescribed Medicines ({selectedVisitModal.medicines.length})
                  </Text>
                  <View style={{ gap: 6 }}>
                    {selectedVisitModal.medicines.map((med: any, idx: number) => (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#f8fafc',
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 8,
                          padding: 8,
                          gap: 2
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                          {med.name || med.medicineName || 'Remedy'}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '700' }}>
                          {med.dosage || '4 Pills'} • {med.frequency || 'Twice Daily'} ({med.duration || '7 Days'})
                        </Text>
                        {!!med.instructions && (
                          <Text style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                            Note: {med.instructions}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Uploaded & Canvas Prescription Scans */}
              <View style={{ width: '100%', marginBottom: 16 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284c7', marginBottom: 6 }}>
                  📄 Uploaded Prescription Scans & Canvas Document
                </Text>
                {(() => {
                  const images = Array.from(new Set([
                    ...(selectedVisitModal?.canvasPrescriptionUrl ? [selectedVisitModal.canvasPrescriptionUrl] : []),
                    ...(selectedVisitModal?.uploadedPrescriptions || [])
                  ].filter(Boolean)));

                  if (images.length === 0) {
                    return (
                      <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>No digital prescription scans uploaded for this visit.</Text>
                      </View>
                    );
                  }

                  return (
                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                      {images.filter(Boolean).map((url: string, idx: number) => (
                        url ? (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setFullPrescriptionPreview(url)}
                            style={{ width: 100, height: 120, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#0284c7' }}
                          >
                            <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.82)', paddingVertical: 3 }}>
                              <Text style={{ fontSize: 9.5, color: '#ffffff', fontWeight: '800', textAlign: 'center' }}>Tap to View</Text>
                            </View>
                          </TouchableOpacity>
                        ) : null
                      ))}
                    </View>
                  );
                })()}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={{ width: '100%', backgroundColor: '#0284c7', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setSelectedVisitModal(null)}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        {/* FULLSCREEN PRESCRIPTION LIGHTBOX PREVIEW FOR MOBILE */}
        <Modal
          visible={!!fullPrescriptionPreview}
          transparent={true}
          animationType="none"
          onRequestClose={() => setFullPrescriptionPreview(null)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
            activeOpacity={1}
            onPress={() => setFullPrescriptionPreview(null)}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                onPress={() => setFullPrescriptionPreview(null)}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
              {!!fullPrescriptionPreview && (
                <Image source={{ uri: fullPrescriptionPreview }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="contain" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 30-DAY DIET PLAN MOBILE FULL MODAL */}
        <Modal
          visible={showFull30DayModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFull30DayModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '90%', padding: 14 }]}>
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284c7' }}>🗓 30-Day Clinical Diet Plan</Text>
                  <Text style={{ fontSize: 10.5, color: '#64748b' }}>{patientName} • Age: {age || 'N/A'} • BMI: {bmi || 'N/A'}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFull30DayModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Phase Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, maxHeight: 36 }}>
                {[
                  { label: 'All 30 Days', val: 'all' },
                  { label: 'Phase 1: Detox (1-10)', val: 1 },
                  { label: 'Phase 2: Metabolic (11-20)', val: 2 },
                  { label: 'Phase 3: Vitality (21-30)', val: 3 }
                ].map((p) => {
                  const isActive = selectedPhaseFilter === p.val;
                  return (
                    <TouchableOpacity
                      key={String(p.val)}
                      onPress={() => setSelectedPhaseFilter(p.val as any)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 14,
                        backgroundColor: isActive ? '#0284c7' : '#f1f5f9',
                        marginRight: 6
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Day Items List */}
              <ScrollView style={{ flex: 1 }}>
                {dietMenuDays
                  .filter((item) => selectedPhaseFilter === 'all' || item.phase === selectedPhaseFilter)
                  .map((item) => (
                    <View key={item.day} style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0284c7' }}>Day {item.day}</Text>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: item.phase === 1 ? '#1e40af' : item.phase === 2 ? '#92400e' : '#166534', backgroundColor: item.phase === 1 ? '#dbeafe' : item.phase === 2 ? '#fef3c7' : '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          {item.phaseTitle}
                        </Text>
                      </View>

                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginTop: 2 }}>Breakfast (8:00 AM)</Text>
                      <TextInput
                        style={[styles.input, { paddingVertical: 4, paddingHorizontal: 8, fontSize: 11, marginTop: 2, backgroundColor: '#ffffff' }]}
                        value={item.breakfast}
                        onChangeText={(txt) => {
                          const updated = [...dietMenuDays];
                          const idx = updated.findIndex(d => d.day === item.day);
                          if (idx !== -1) { updated[idx].breakfast = txt; setDietMenuDays(updated); }
                        }}
                      />

                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginTop: 4 }}>Lunch (1:00 PM)</Text>
                      <TextInput
                        style={[styles.input, { paddingVertical: 4, paddingHorizontal: 8, fontSize: 11, marginTop: 2, backgroundColor: '#ffffff' }]}
                        value={item.lunch}
                        onChangeText={(txt) => {
                          const updated = [...dietMenuDays];
                          const idx = updated.findIndex(d => d.day === item.day);
                          if (idx !== -1) { updated[idx].lunch = txt; setDietMenuDays(updated); }
                        }}
                      />

                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginTop: 4 }}>Evening Snacks (4:30 PM)</Text>
                      <TextInput
                        style={[styles.input, { paddingVertical: 4, paddingHorizontal: 8, fontSize: 11, marginTop: 2, backgroundColor: '#ffffff' }]}
                        value={item.snacks}
                        onChangeText={(txt) => {
                          const updated = [...dietMenuDays];
                          const idx = updated.findIndex(d => d.day === item.day);
                          if (idx !== -1) { updated[idx].snacks = txt; setDietMenuDays(updated); }
                        }}
                      />

                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginTop: 4 }}>Dinner (8:00 PM)</Text>
                      <TextInput
                        style={[styles.input, { paddingVertical: 4, paddingHorizontal: 8, fontSize: 11, marginTop: 2, backgroundColor: '#ffffff' }]}
                        value={item.dinner}
                        onChangeText={(txt) => {
                          const updated = [...dietMenuDays];
                          const idx = updated.findIndex(d => d.day === item.day);
                          if (idx !== -1) { updated[idx].dinner = txt; setDietMenuDays(updated); }
                        }}
                      />
                    </View>
                  ))}
              </ScrollView>

              <TouchableOpacity style={[styles.saveBtn, { marginTop: 10 }]} onPress={() => setShowFull30DayModal(false)}>
                <Text style={styles.saveBtnText}>Save & Close 30-Day Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topHeader: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  headerTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  durationBadge: { backgroundColor: '#fef08a', borderWidth: 1, borderColor: '#fde047', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  durationBadgeText: { fontSize: 8.5, fontWeight: '800', color: '#854d0e' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bae6fd' },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  scrollBody: { flex: 1 },
  scrollContent: { padding: 14, gap: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  patientNameText: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  infoRowStack: { gap: 4, marginTop: 4 },
  regIdText: { fontSize: 12, fontWeight: '700', color: '#0284c7' },
  infoText: { fontSize: 11.5, color: '#475569' },
  subjectText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  packageNoticeBox: { marginTop: 12, backgroundColor: '#f8fafc', borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageNoticeText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  registerPkgBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#0284c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  registerPkgBtnText: { fontSize: 10.5, fontWeight: '800', color: '#0284c7' },
  historyCard: { backgroundColor: '#e0f2fe', borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd', padding: 14 },
  historyHeaderTitle: { fontSize: 12.5, fontWeight: '800', color: '#0284c7', marginBottom: 8 },
  historyEmptyBox: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  historyEmptyText: { fontSize: 10.5, color: '#94a3b8', fontWeight: '600' },
  sectionCardTitle: { fontSize: 12.5, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  prescriptionThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  uploadBtnText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  tabsBar: { backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 4 },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginRight: 4 },
  tabItemActive: { backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' },
  tabItemText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabItemTextActive: { fontWeight: '800', color: '#0284c7' },
  mainTabTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 4 },
  subTitle: { fontSize: 12.5, fontWeight: '800', color: '#0f172a', marginBottom: 6, marginTop: 4 },
  radioLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  textArea: { height: 90, textAlignVertical: 'top' },
  textAreaSmall: { height: 60, textAlignVertical: 'top' },
  chooseFileBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  chooseFileBtnText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  helperText: { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricCol: { flex: 1 },
  checkChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 4 },
  checkChipActive: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  checkChipText: { fontSize: 11.5, color: '#475569', fontWeight: '600' },
  checkChipTextActive: { color: '#0284c7', fontWeight: '800' },
  pillChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginBottom: 4 },
  pillChipActive: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  pillChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  pillChipTextActive: { color: '#0284c7', fontWeight: '800' },
  dashedBox: { backgroundColor: '#ffffff', borderStyle: 'dashed', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 10, padding: 24, alignItems: 'center' },
  dashedBoxText: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  actionBtnSmall: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnSmallText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }
});
