import React, { useState } from 'react';
import { Pill, Printer, Plus, Trash2, RotateCcw, Check, Save } from 'lucide-react';
import { db } from '@app/shared';
import { collection, addDoc } from 'firebase/firestore';
import { SH_LOGO_BASE64 } from '../../../utils/logoBase64';

export interface MedicineItem {
  name: string;
  timing: string;
  duration: string;
}

export interface MedicineRequest {
  id?: string;
  patientName: string;
  phone: string;
  age: string;
  gender: string;
  branchName: string;
  condition: string;
  duration?: string;
  medicines: MedicineItem[];
  deliveryAddress?: string;
  status?: 'pending' | 'completed' | 'dispatched';
  requestedAt?: string;
}

interface MedicineRequestsPageProps {
  currentBranch?: string;
  onNavigate?: (tab: string, data?: any) => void;
}

export const MedicineRequestsPage: React.FC<MedicineRequestsPageProps> = ({ currentBranch = 'KPHB Branch' }) => {
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Mr.');
  const [branch, setBranch] = useState(currentBranch);
  const [condition, setCondition] = useState('');
  const [duration, setDuration] = useState('');
  const [address, setAddress] = useState('');
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    { name: '', timing: '', duration: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddMedicineRow = () => {
    setMedicines(prev => [...prev, { name: '', timing: '', duration: '' }]);
  };

  const handleRemoveMedicineRow = (idx: number) => {
    if (medicines.length <= 1) return;
    setMedicines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMedicineRow = (idx: number, field: keyof MedicineItem, val: string) => {
    setMedicines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleClearForm = () => {
    setPatientName('');
    setPhone('');
    setAge('');
    setGender('Mr.');
    setBranch(currentBranch);
    setCondition('');
    setDuration('');
    setAddress('');
    setMedicines([{ name: '', timing: '', duration: '' }]);
    setSaveSuccess(false);
  };

  // --- Print PDF Function matching Official Clinic Certificate & Letterhead ---
  const printMedicinePDF = (req: MedicineRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups to print the certificate.');
      return;
    }

    const resolveTitle = (genderOrTitle?: string) => {
      const g = (genderOrTitle || '').trim();
      if (g.toLowerCase().startsWith('mr.')) return 'MR.';
      if (g.toLowerCase().startsWith('mrs.')) return 'MRS.';
      if (g.toLowerCase().startsWith('ms.')) return 'MS.';
      if (g.toLowerCase().startsWith('master')) return 'MASTER';
      if (g.toLowerCase().startsWith('dr.')) return 'DR.';
      return g.toUpperCase() || 'MR.';
    };

    const resolvePronoun = (genderOrTitle?: string) => {
      const g = (genderOrTitle || '').toLowerCase().trim();
      if (g.includes('mr') || g.includes('male') || g.includes('master') || g.includes('boy')) return 'HE';
      if (g.includes('mrs') || g.includes('ms') || g.includes('female') || g.includes('miss') || g.includes('girl')) return 'SHE';
      return 'HE/SHE';
    };

    const title = resolveTitle(req.gender);
    const pronoun = resolvePronoun(req.gender);
    const patUpper = (req.patientName || 'PATIENT').toUpperCase();
    const ageVal = req.age ? req.age.trim() : '';
    const conditionVal = (req.condition || 'GENERAL HEALTH CONSULTATION').toUpperCase();
    const branchDisplay = (req.branchName || currentBranch || 'KPHB Branch').toUpperCase();
    
    const rawDuration = (req.duration || req.medicines?.[0]?.duration || '').replace(/months?/gi, '').trim();
    const durationDisplay = rawDuration;
    const formattedDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY e.g. 10/09/2026

    const validMedicines = (req.medicines && req.medicines.length > 0)
      ? req.medicines.filter(m => m.name && m.name.trim().length > 0)
      : [];
    const displayMedicines = validMedicines.length > 0 ? validMedicines : (req.medicines || []);

    const rowsHtml = displayMedicines.map((m, idx) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e293b; width: 8%; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b; font-size: 13.5px;">${m.name || '-'}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569;">${m.timing || '-'}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0284c7; font-weight: 600;">${m.duration || '-'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Medical Certificate - ${patUpper}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          
          @page {
            size: A4;
            margin: 0;
          }
          
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          /* TOP BLUE BANNER */
          .top-banner {
            background: #1d8ecd;
            height: 60px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 32px 0 0;
            position: relative;
          }

          .logo-container {
            background: #ffffff;
            height: 72px;
            padding: 8px 24px 8px 20px;
            display: flex;
            align-items: center;
            box-shadow: 2px 3px 10px rgba(0,0,0,0.12);
            border-bottom-right-radius: 4px;
          }

          .logo-img {
            height: 52px;
            object-fit: contain;
          }

          .top-web-link {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ffffff;
            font-weight: 800;
            font-size: 13px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }

          .globe-circle {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 1.5px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* MAIN CONTENT */
          .cert-content {
            padding: 36px 50px;
            flex: 1;
          }

          .date-row {
            text-align: right;
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 24px;
            letter-spacing: 0.3px;
          }

          .cert-title {
            text-align: center;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 1.2px;
            text-decoration: underline;
            text-underline-offset: 4px;
            margin: 20px 0 28px 0;
            color: #0f172a;
            text-transform: uppercase;
          }

          .cert-para {
            font-size: 14.5px;
            line-height: 1.9;
            color: #1e293b;
            text-align: justify;
            margin-bottom: 20px;
          }

          .med-heading {
            margin-top: 28px;
            margin-bottom: 12px;
            font-weight: 800;
            font-size: 13.5px;
            letter-spacing: 1px;
            color: #1d8ecd;
            text-transform: uppercase;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
          }

          table.med-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 6px;
          }

          table.med-table th {
            background: #f8fafc;
            padding: 9px 12px;
            text-align: left;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1.5px solid #cbd5e1;
          }

          table.med-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }

          /* BOTTOM GREEN FOOTER BANNER */
          .bottom-banner {
            background: #a3cf3b;
            height: 48px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 0 16px;
          }

          .footer-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .icon-circle {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 1.5px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .footer-v-divider {
            width: 1.5px;
            height: 24px;
            background: rgba(255, 255, 255, 0.8);
          }

          @media print {
            body {
              min-height: 100vh;
            }
            .cert-content {
              padding: 30px 45px;
            }
          }
        </style>
      </head>
      <body>
        <!-- TOP BLUE BANNER WITH LOGO BADGE & WEB LINK -->
        <div class="top-banner">
          <div class="logo-container">
            <img class="logo-img" src="data:image/png;base64,${SH_LOGO_BASE64}" alt="Spiritual Homeopathy" />
          </div>
          <div class="top-web-link">
            <div class="globe-circle">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="white" stroke-width="2.5" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <span>WWW.SPIRITUALHOMEO.COM</span>
          </div>
        </div>

        <!-- CERTIFICATE BODY CONTENT -->
        <div class="cert-content">
          <div class="date-row">
            DATE: ${formattedDate}
          </div>

          <div class="cert-title">
            TO WHOM SO EVER IT MAY CONCERN
          </div>

          <div class="cert-para">
            THIS IS TO CERTIFY THAT <strong>${title} ${patUpper}</strong>${ageVal ? ` AGED ABOUT <strong>${ageVal} YEARS</strong>,` : ''} HAS BEEN UNDER OUR TREATMENT AT SPIRITUAL HOMEOPATHY FOR THE MANAGEMENT OF <strong>${conditionVal}</strong>.
          </div>

          <div class="cert-para">
            ${durationDisplay ? `<strong>${pronoun}</strong> NEEDED TO TAKE HOMEOPATHY MEDICINE FOR <strong>${durationDisplay} MONTHS</strong>. ` : ''}WE RECOMMENDED THAT <strong>${title} ${patUpper}</strong> CONTINUES TO FOLLOW THE PRESCRIBED MEDICATIONS.
          </div>

          <div class="med-heading">PRESCRIBED MEDICINES</div>

          <table class="med-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">#</th>
                <th style="width: 42%;">Remedy / Medicine Name</th>
                <th style="width: 30%;">Dosage & Timing</th>
                <th style="width: 20%;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          ${req.deliveryAddress ? `
            <div style="margin-top: 18px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; color: #166534;">
              <strong>Home Delivery Address:</strong> ${req.deliveryAddress}
            </div>
          ` : ''}

          <div style="margin-top: 50px; text-align: center; font-size: 11.5px; color: #64748b; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 14px;">
            This is a computer-generated document. No signature required.
          </div>
        </div>

        <!-- BOTTOM GREEN FOOTER BANNER -->
        <div class="bottom-banner">
          <div class="footer-item">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="white" stroke-width="2.5" fill="none">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <span>9095 176 176</span>
          </div>

          <div class="footer-v-divider"></div>

          <div class="footer-item">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="white" stroke-width="2.5" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <span>SUPPORT@SPH.COM</span>
          </div>

          <div class="footer-v-divider"></div>

          <div class="footer-item">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="white" stroke-width="2.5" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <span>${branchDisplay}</span>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const buildCurrentRequest = (): MedicineRequest => {
    const cleanDuration = (duration || '').replace(/months?/gi, '').trim();
    return {
      id: `MED-${Math.floor(100 + Math.random() * 900)}`,
      patientName: patientName.trim(),
      phone: phone.trim(),
      age: age.trim(),
      gender: gender,
      branchName: (branch || currentBranch).trim(),
      condition: condition.trim() || 'General Consultation Follow-up',
      duration: cleanDuration,
      status: 'pending',
      deliveryAddress: address.trim(),
      requestedAt: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      medicines: medicines.filter(m => m.name.trim().length > 0)
    };
  };

  const handlePrintClick = () => {
    if (!patientName.trim()) {
      alert('Please enter Patient Name before printing.');
      return;
    }
    const req = buildCurrentRequest();
    printMedicinePDF(req);
  };

  const handleSaveClick = async () => {
    if (!patientName.trim() || !phone.trim()) {
      alert('Please enter Patient Name and Phone Number.');
      return;
    }
    setIsSaving(true);
    const req = buildCurrentRequest();
    if (db) {
      try {
        await addDoc(collection(db, 'medicine_requests'), {
          ...req,
          createdAt: new Date().toISOString()
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        console.error('Error saving request:', err);
      }
    }
    setIsSaving(false);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'rgba(168, 206, 58, 0.18)', padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill color="#638012" size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Reception • Medicine Request & PDF Certificate
            </h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '2px 0 0 0' }}>
              Create medicine request, prescribe remedies & generate official clinic letterhead certificate
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleClearForm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: saveSuccess ? '#15803d' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
            }}
          >
            {saveSuccess ? <Check size={16} /> : <Save size={16} />}
            <span>{saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save Request'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#258ec8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 20px',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 142, 200, 0.35)'
            }}
          >
            <Printer size={17} />
            <span>Generate & Print PDF</span>
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        
        {/* Section 1: Patient & Certificate Details */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '8px' }}>
            Patient & Certificate Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '90px 1.4fr 1.1fr 90px', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Prefix</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', outline: 'none' }}
              >
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Master">Master</option>
                <option value="Dr.">Dr.</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Patient Full Name *</label>
              <input
                type="text"
                placeholder="Enter patient full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Phone Number *</label>
              <input
                type="text"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Age</label>
              <input
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 110px', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Branch Name</label>
              <input
                type="text"
                placeholder="e.g. KPHB Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Condition / Diagnosis / Subject</label>
              <input
                type="text"
                placeholder="e.g. Chronic Allergy & Asthma"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Duration (Months)</label>
              <input
                type="text"
                placeholder="e.g. 1 or 2"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '5px' }}>Courier / Home Delivery Address (Optional)</label>
            <input
              type="text"
              placeholder="Plot / Flat, Street, Landmark, Area, Hyderabad"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        </div>

        {/* Section 2: Prescribed Remedies */}
        <div style={{ marginTop: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Prescribed Remedies & Dosage
            </h3>
            <button
              type="button"
              onClick={handleAddMedicineRow}
              style={{
                background: '#e0f2fe',
                color: '#0284c7',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={14} /> Add Remedy
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {medicines.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', width: '20px' }}>
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  placeholder="Remedy / Medicine Name (e.g. Arnica 200C)"
                  value={m.name}
                  onChange={(e) => handleUpdateMedicineRow(idx, 'name', e.target.value)}
                  style={{ flex: 1.5, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Dosage & Timing (e.g. 4 Drops Twice Daily)"
                  value={m.timing}
                  onChange={(e) => handleUpdateMedicineRow(idx, 'timing', e.target.value)}
                  style={{ flex: 1.2, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 1 Month)"
                  value={m.duration}
                  onChange={(e) => handleUpdateMedicineRow(idx, 'duration', e.target.value)}
                  style={{ flex: 0.9, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', outline: 'none' }}
                />
                {medicines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicineRow(idx)}
                    title="Remove Remedy"
                    style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}
                  >
                    <Trash2 size={15} color="#ef4444" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1.5px solid #f1f5f9', paddingTop: '18px' }}>
          <button
            type="button"
            onClick={handleClearForm}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>

          <button
            type="button"
            onClick={handlePrintClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: '#258ec8',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 142, 200, 0.35)'
            }}
          >
            <Printer size={18} />
            <span>Generate & Print Certificate PDF</span>
          </button>
        </div>

      </div>

    </div>
  );
};
