import React from 'react';
import { Package } from 'lucide-react';

export const PackageMembersPage: React.FC = () => {
  const packages = [
    { name: 'Platinum Annual Wellness', price: '₹25,000/yr', members: 145 },
    { name: 'Classical Homeo Care Plan', price: '₹15,000/yr', members: 210 },
    { name: 'Pediatric Care Package', price: '₹12,000/yr', members: 98 },
    { name: 'Chronic Illness Wellness Plan', price: '₹18,000/yr', members: 175 },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Package size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Package Members & Plan Directory
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {packages.map(pkg => (
          <div key={pkg.name} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
            <h3 style={{ fontSize: '14.5px !important', fontWeight: 800, color: '#0f172a' }}>{pkg.name}</h3>
            <p style={{ fontSize: '12.5px !important', fontWeight: 700, color: '#258ec8', marginTop: '4px' }}>Price: {pkg.price}</p>
            <p style={{ fontSize: '12px !important', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>{pkg.members} Active Members</p>
          </div>
        ))}
      </div>
    </div>
  );
};
