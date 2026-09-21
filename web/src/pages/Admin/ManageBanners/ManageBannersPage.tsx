import React, { useState } from 'react';
import { Image, Plus, Trash2, CheckCircle2, Eye, Upload, Tag, Globe, Smartphone, Sparkles } from 'lucide-react';

export const ManageBannersPage: React.FC = () => {
  const [banners, setBanners] = useState([
    {
      id: 'BAN-101',
      title: '🌟 Spiritual Homeopathy Festival Special',
      subtitle: 'Get 20% OFF on Annual Classical Homeo Wellness Packages',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60',
      target: 'Mobile & Web',
      status: 'Active',
      clickUrl: '/packages'
    },
    {
      id: 'BAN-102',
      title: '🌿 Free First Homeo Consultation',
      subtitle: 'Book your initial consultation with Head Doctors at zero cost',
      image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60',
      target: 'Mobile App',
      status: 'Active',
      clickUrl: '/book'
    },
    {
      id: 'BAN-103',
      title: '🌧️ Monsoon Immunity Boost Remedies',
      subtitle: 'Specialized Ayurvedic & Homeopathic preventive remedies',
      image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=800&auto=format&fit=crop&q=60',
      target: 'Web Portal',
      status: 'Inactive',
      clickUrl: '/medicines'
    }
  ]);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('Mobile & Web');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subtitle) return;

    const newBanner = {
      id: `BAN-${Date.now().toString().slice(-3)}`,
      title,
      subtitle,
      image: imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60',
      target: targetPlatform,
      status: 'Active',
      clickUrl: '/promotions'
    };

    setBanners([newBanner, ...banners]);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  const handleToggleStatus = (id: string) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, status: b.status === 'Active' ? 'Inactive' : 'Active' } : b));
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '12px', color: '#0284c7' }}>
            <Image size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
              App & Web Banner Management
            </h1>
            <p style={{ fontSize: '12px !important', color: '#64748b' }}>
              Upload and publish promotional banners displayed on the mobile app home screen & website.
            </p>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '10px', fontSize: '12px !important', fontWeight: 700, color: '#334155' }}>
          Total Banners: <span style={{ color: '#0284c7' }}>{banners.length}</span> ({banners.filter(b => b.status === 'Active').length} Active)
        </div>
      </div>

      {showSuccessMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: '12px', marginBottom: '20px', fontSize: '12.5px !important', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> Promotional Banner Added & Published Successfully!
        </div>
      )}

      {/* Banner Creation Form */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} color="#0284c7" /> Create New Promotional Banner
        </h3>

        <form onSubmit={handleAddBanner} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px !important', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Banner Title *
            </label>
            <input
              type="text"
              placeholder="e.g. 🌟 Annual Wellness Discount"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px !important', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px !important', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Subtitle / Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Get 20% OFF on all consultation packages"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px !important', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px !important', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Image URL (Optional)
            </label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px !important', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px !important', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Target Platform
            </label>
            <select
              value={targetPlatform}
              onChange={e => setTargetPlatform(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px !important', outline: 'none', background: '#ffffff' }}
            >
              <option value="Mobile & Web">Mobile & Web (Both)</option>
              <option value="Mobile App">Mobile App Only</option>
              <option value="Web Portal">Web Portal Only</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
            <button
              type="submit"
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '12.5px !important',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Add Promotional Banner
            </button>
          </div>
        </form>
      </div>

      {/* Active Banners Grid */}
      <h3 style={{ fontSize: '14px !important', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
        Live Published Banners
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {banners.map(b => (
          <div key={b.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ height: '140px', width: '100%', position: 'relative', background: '#f1f5f9' }}>
              <img src={b.image} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: b.status === 'Active' ? '#16a34a' : '#64748b',
                color: '#ffffff',
                fontSize: '10.5px !important',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {b.status}
              </span>
              <span style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                fontSize: '10.5px !important',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {b.target.includes('Mobile') ? <Smartphone size={12} /> : <Globe size={12} />} {b.target}
              </span>
            </div>

            <div style={{ padding: '14px' }}>
              <h4 style={{ fontSize: '13.5px !important', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{b.title}</h4>
              <p style={{ fontSize: '11.5px !important', color: '#64748b', marginBottom: '12px' }}>{b.subtitle}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => handleToggleStatus(b.id)}
                  style={{
                    background: b.status === 'Active' ? '#fef2f2' : '#f0fdf4',
                    color: b.status === 'Active' ? '#ef4444' : '#16a34a',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px !important',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {b.status === 'Active' ? 'Deactivate' : 'Activate Banner'}
                </button>

                <button
                  onClick={() => handleDeleteBanner(b.id)}
                  style={{
                    background: 'transparent',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title="Delete Banner"
                >
                  <Trash2 size={16} color="#ef4444" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
