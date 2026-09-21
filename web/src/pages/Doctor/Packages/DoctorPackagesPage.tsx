import React from 'react';
import { Package, CheckCircle2, Sparkles, Shield, Clock, Award, ChevronRight } from 'lucide-react';

export const DoctorPackagesPage: React.FC = () => {
  const treatmentPackages = [
    {
      id: 'pkg-1',
      title: 'Annual Family Health Shield',
      price: '₹14,999',
      originalPrice: '₹22,000',
      duration: '12 Months',
      consultations: 'Unlimited Doctor Consultations',
      medicines: 'Complete Homeopathic Remedy Supply Included',
      benefits: [
        'Coverage for up to 4 family members',
        'Free door delivery of medicines',
        'Priority appointment booking at all branches',
        'Monthly spiritual wellness guidance'
      ],
      popular: true,
      badgeColor: '#0284c7'
    },
    {
      id: 'pkg-2',
      title: 'Chronic Illness Cure Package',
      price: '₹8,999',
      originalPrice: '₹12,500',
      duration: '6 Months',
      consultations: '12 Dedicated Specialist Consultations',
      medicines: 'Customized Constitutional Remedy Drops',
      benefits: [
        'Targeted treatment for Arthritis, Asthma, Psoriasis & Diabetes',
        'Bi-weekly progress monitoring by Head Doctor',
        'Spiritual healing & meditation audio guides included',
        'Free emergency consultation visits'
      ],
      popular: false,
      badgeColor: '#16a34a'
    },
    {
      id: 'pkg-3',
      title: 'Child Immunity & Growth Care',
      price: '₹5,499',
      originalPrice: '₹8,000',
      duration: '6 Months',
      consultations: '6 Pediatric Homeopathy Consultations',
      medicines: 'Sweet Pill Remedies (100% Side-effect free)',
      benefits: [
        'Immunity booster doses for seasonal allergies & cold',
        'Growth & cognitive development monitoring',
        'Zero chemical side effects for kids',
        'Pediatric diet & nutrition chart'
      ],
      popular: false,
      badgeColor: '#8b5cf6'
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Title Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package color="#0284c7" size={28} /> Treatment & Healing Packages
        </h1>
        <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '4px', margin: 0 }}>
          Comprehensive homeopathic cure packages and spiritual wellness subscriptions.
        </p>
      </div>

      {/* Package Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {treatmentPackages.map((pkg) => (
          <div
            key={pkg.id}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px 24px',
              border: pkg.popular ? '2px solid #0284c7' : '1px solid #e2e8f0',
              boxShadow: pkg.popular ? '0 10px 30px rgba(2, 132, 199, 0.12)' : '0 4px 16px rgba(0,0,0,0.03)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {pkg.popular && (
              <span style={{
                position: 'absolute',
                top: '-12px',
                right: '24px',
                background: '#0284c7',
                color: '#ffffff',
                padding: '4px 14px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}>
                MOST POPULAR
              </span>
            )}

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {pkg.title}
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Duration: <strong>{pkg.duration}</strong>
              </p>

              {/* Price Row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '16px 0 20px' }}>
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>
                  {pkg.price}
                </span>
                <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through' }}>
                  {pkg.originalPrice}
                </span>
              </div>

              {/* Feature Highlights */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '12.5px', color: '#334155', fontWeight: 700, margin: 0, marginBottom: '6px' }}>
                  👨‍⚕️ {pkg.consultations}
                </p>
                <p style={{ fontSize: '12.5px', color: '#16a34a', fontWeight: 700, margin: 0 }}>
                  💊 {pkg.medicines}
                </p>
              </div>

              {/* Benefits Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {pkg.benefits.map((benefit, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <CheckCircle2 size={16} color={pkg.badgeColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              style={{
                background: pkg.popular ? '#0284c7' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                height: '46px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
              }}
            >
              Enroll Patient in Package <ChevronRight size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
