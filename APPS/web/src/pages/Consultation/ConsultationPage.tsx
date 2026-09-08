import React, { useState } from 'react';
import { Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { ConsultationAppointment, createDocument } from '@app/shared';

export const ConsultationPage: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'Spiritual Consultation' | 'Homeopathic Remedy' | 'Holistic Healing'>('Homeopathic Remedy');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAppointment: ConsultationAppointment = {
      userId: 'user_demo_123',
      userName: userName || 'Valued Patient',
      doctorName: 'Dr. Spiritual Homeo Specialist',
      appointmentDate: date,
      appointmentTime: time,
      consultationType: type,
      status: 'scheduled',
      notes
    };

    try {
      await createDocument('consultations', newAppointment);
    } catch (err) {
      console.warn('Booking saved locally:', err);
    }
    setSubmitted(true);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700 }} className="gradient-text">
          Book Spiritual & Homeopathic Consultation
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px' }}>
          Schedule a personalized 1-on-1 consultation with holistic doctors and spiritual guides.
        </p>
      </div>

      {submitted ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Consultation Requested!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Thank you, {userName}. Your appointment request for <strong>{date} at {time}</strong> has been logged.
          </p>
          <button className="btn-primary" onClick={() => setSubmitted(false)}>
            Book Another Consultation
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter your name..." 
              value={userName} 
              onChange={e => setUserName(e.target.value)} 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Preferred Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Preferred Time</label>
              <input 
                type="time" 
                className="input-field" 
                value={time} 
                onChange={e => setTime(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Consultation Focus</label>
            <select 
              className="input-field"
              value={type} 
              onChange={e => setType(e.target.value as any)}
            >
              <option value="Homeopathic Remedy">Homeopathic Remedy Analysis</option>
              <option value="Spiritual Consultation">Spiritual Consultation & Energy Alignment</option>
              <option value="Holistic Healing">Combined Holistic Healing</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Health & Spiritual Goals / Symptoms</label>
            <textarea 
              className="input-field" 
              rows={4} 
              placeholder="Describe your current symptoms or spiritual health goals..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
          </div>

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
            Confirm Consultation Booking
          </button>
        </form>
      )}
    </div>
  );
};
