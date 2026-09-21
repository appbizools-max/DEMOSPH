import React from 'react';
import { Heart, Feather, Sparkles, BookOpen, Calendar } from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '60px', padding: '40px 20px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', color: '#34d399', fontSize: '13px', marginBottom: '20px' }}>
          <Sparkles size={14} /> Welcome to Spiritual Homeo
        </div>
        <h1 style={{ fontSize: '46px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }} className="gradient-text">
          Natural Homeopathic Healing & Spiritual Wellness
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '720px', margin: '0 auto 32px' }}>
          Combining classical homeopathy with spiritual wisdom to treat the mind, body, and soul. Discover remedies, book practitioner consultations, and track your wellness.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => onNavigate('remedies')}>
            <BookOpen size={18} /> Explore Remedies Directory
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('consultation')}>
            <Calendar size={18} /> Book a Consultation
          </button>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div className="glass-card">
          <Feather color="#34d399" size={32} style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Homeopathic Remedy Directory</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            Browse curated remedies for acute and chronic conditions with precise potency guidance and physical/emotional symptom matching.
          </p>
        </div>

        <div className="glass-card">
          <Heart color="#38bdf8" size={32} style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Spiritual Healing Consultations</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            Connect with experienced homeopathic doctors and spiritual wellness practitioners for customized treatment plans.
          </p>
        </div>

        <div className="glass-card">
          <Sparkles color="#a855f7" size={32} style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Personalized Wellness Records</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            Keep track of your remedies, daily symptoms, and consultation history stored securely in your private profile.
          </p>
        </div>
      </div>
    </div>
  );
};
