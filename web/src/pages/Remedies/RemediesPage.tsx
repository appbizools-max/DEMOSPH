import React, { useState } from 'react';
import { Search, Filter, Feather, Sparkles } from 'lucide-react';
import { Remedy } from '@app/shared';

const initialRemedies: Remedy[] = [
  {
    id: '1',
    name: 'Arnica Montana',
    latinName: 'Leopard\'s Bane',
    category: 'Acute',
    symptoms: ['Physical trauma', 'Muscle soreness', 'Shock', 'Bruising'],
    potencyOptions: ['30C', '200C', '1M'],
    description: 'First remedy for physical trauma, injuries, and soreness.',
    spiritualInsight: 'Restores the subtle energy field after emotional or physical shock.'
  },
  {
    id: '2',
    name: 'Ignatia Amara',
    latinName: 'St. Ignatius Bean',
    category: 'Spiritual',
    symptoms: ['Grief', 'Emotional distress', 'Mood swings', 'Silent sorrow'],
    potencyOptions: ['200C', '1M', '10M'],
    description: 'Essential remedy for acute grief, emotional heartbreak, and deep emotional distress.',
    spiritualInsight: 'Helps release trapped emotional sorrow and restores inner tranquility.'
  },
  {
    id: '3',
    name: 'Nux Vomica',
    latinName: 'Poison Nut',
    category: 'General',
    symptoms: ['Digestive strain', 'Stress', 'Irritability', 'Overwork'],
    potencyOptions: ['30C', '200C'],
    description: 'Relieves digestive discomfort caused by overindulgence, stress, and busy lifestyles.',
    spiritualInsight: 'Grounds overactive mental energy and calms perfectionist tendencies.'
  }
];

export const RemediesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredRemedies = initialRemedies.filter(remedy => {
    const matchesSearch = remedy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          remedy.symptoms.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || remedy.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700 }} className="gradient-text">
          Homeopathic & Spiritual Remedies
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px' }}>
          Explore natural remedies curated for body, mind, and spirit.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ marginBottom: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by remedy name or symptom..."
            style={{ paddingLeft: '44px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-secondary)" />
          {['All', 'Spiritual', 'Acute', 'General'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: selectedCategory === cat ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid var(--border-color)',
                color: selectedCategory === cat ? '#38bdf8' : 'var(--text-secondary)',
                padding: '10px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Remedies List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {filteredRemedies.map(remedy => (
          <div key={remedy.id} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '20px', color: '#f8fafc' }}>{remedy.name}</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{remedy.latinName}</span>
              </div>
              <span className={`badge ${remedy.category === 'Spiritual' ? 'badge-warning' : 'badge-success'}`}>
                {remedy.category}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.5 }}>
              {remedy.description}
            </p>

            {remedy.spiritualInsight && (
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  <Sparkles size={14} /> Spiritual Healing Insight
                </div>
                <p style={{ color: '#e9d5ff', fontSize: '13px' }}>{remedy.spiritualInsight}</p>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {remedy.symptoms.map((symptom, idx) => (
                <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
