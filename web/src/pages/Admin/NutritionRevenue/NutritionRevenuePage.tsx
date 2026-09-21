import React from 'react';
import { Pill } from 'lucide-react';

export const NutritionRevenuePage: React.FC = () => {
  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Pill size={24} color="#16a34a" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Nutrition & Supplement Revenue
        </h1>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #86efac', borderRadius: '16px', padding: '20px', maxWidth: '480px' }}>
        <span style={{ fontSize: '12px !important', fontWeight: 800, color: '#16a34a' }}>TOTAL NUTRITION SALES</span>
        <span style={{ display: 'block', fontSize: '24px !important', fontWeight: 800, color: '#16a34a', margin: '6px 0' }}>₹4,85,000</span>
        <p style={{ fontSize: '12px !important', color: '#64748b' }}>
          Revenue from Homeopathic Wellness Supplements & Nutritional Tinctures.
        </p>
      </div>
    </div>
  );
};
