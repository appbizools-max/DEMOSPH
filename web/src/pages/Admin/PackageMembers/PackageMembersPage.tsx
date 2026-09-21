import React, { useState, useEffect } from 'react';
import {
  Package, Search, Calendar, Phone, Building2, CheckCircle2,
  AlertCircle, MessageCircle, X, ChevronRight, Filter, IndianRupee,
  Clock, ShieldCheck
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@app/shared';

export interface PackageMember {
  id: string;
  patientDocId?: string;
  patientId?: string;
  patientName?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  branch?: string;
  branchName?: string;
  doctorName?: string;
  doctor?: string;
  packageName?: string;
  purpose?: string;
  duration?: string;
  durationMonths?: number;
  startDate?: string;
  paymentDate?: string;
  expiryDate?: string;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  status?: string;
  paymentHistory?: Array<{
    date: string;
    amount: number;
    paymentMode?: string;
    note?: string;
    invoiceId?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export const PackageMembersPage: React.FC = () => {
  const [members, setMembers] = useState<PackageMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'due' | 'paid_full' | 'expired'>('all');
  const [selectedMemberModal, setSelectedMemberModal] = useState<PackageMember | null>(null);
  const [patientDirectory, setPatientDirectory] = useState<Record<string, any>>({});

  // Real-time Firestore sync
  useEffect(() => {
    if (!db) return;
    let unsubPkg: (() => void) | null = null;
    let unsubPat: (() => void) | null = null;

    try {
      const q = collection(db, 'package_members');
      unsubPkg = onSnapshot(q, (snapshot) => {
        const list: PackageMember[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data
          } as PackageMember);
        });

        // Sort by startDate or createdAt desc
        list.sort((a, b) => {
          const tA = new Date(a.startDate || a.paymentDate || a.createdAt || 0).getTime();
          const tB = new Date(b.startDate || b.paymentDate || b.createdAt || 0).getTime();
          return tB - tA;
        });

        setMembers(list);
        setLoading(false);
      }, (err) => {
        console.error("Error subscribing to package_members:", err);
        setLoading(false);
      });
    } catch (err) {
      console.error("Firestore init error in PackageMembersPage:", err);
      setLoading(false);
    }

    try {
      unsubPat = onSnapshot(collection(db, 'allpatients'), (snapshot) => {
        const dir: Record<string, any> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          dir[docSnap.id] = data;
          if (data.patientName) dir[String(data.patientName).toLowerCase().trim()] = data;
          if (data.name) dir[String(data.name).toLowerCase().trim()] = data;
          const ph = (data.phone || data.phoneNumber || data.mobile || '').replace(/\D/g, '').slice(-10);
          if (ph) dir[ph] = data;
        });
        setPatientDirectory(dir);
      }, (err) => {
        console.warn("Allpatients lookup notice:", err);
      });
    } catch (e) {
      console.warn("Allpatients setup notice:", e);
    }

    return () => {
      if (unsubPkg) unsubPkg();
      if (unsubPat) unsubPat();
    };
  }, []);

  const computeEffectiveExpiry = (m: PackageMember): Date | null => {
    if (m.expiryDate) {
      const d = new Date(m.expiryDate);
      if (!isNaN(d.getTime())) return d;
    }
    const startStr = m.startDate || m.paymentDate || m.createdAt;
    if (!startStr) return null;
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return null;

    let months = Number(m.durationMonths) || 0;
    if (!months && m.duration) {
      const match = String(m.duration).match(/(\d+)\s*(month|year)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        months = match[2].toLowerCase().startsWith('year') ? num * 12 : num;
      }
    }
    if (!months) months = 3;

    const exp = new Date(start);
    exp.setMonth(exp.getMonth() + months);
    return exp;
  };

  const getCleanMemberDetails = (m: PackageMember, index: number) => {
    const matched = (m.patientDocId && patientDirectory[m.patientDocId]) ||
                    patientDirectory[m.id] ||
                    (m.patientName && patientDirectory[String(m.patientName).toLowerCase().trim()]) ||
                    (m.name && patientDirectory[String(m.name).toLowerCase().trim()]) ||
                    (m.phone && patientDirectory[String(m.phone).replace(/\D/g, '').slice(-10)]);

    // Clean Phone
    let rawPhone = m.phone || m.phoneNumber || '';
    if ((!rawPhone || rawPhone.trim().length === 0) && matched) {
      rawPhone = matched.phone || matched.phoneNumber || matched.mobile || '';
    }
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    // Clean Reg ID
    let rawReg = m.patientId || (matched && (matched.registrationId || matched.regId || matched.regID || matched.patientId || matched.uhid));
    let cleanRegId = '';
    if (rawReg && typeof rawReg === 'string' && rawReg.trim().length > 0 && rawReg.trim().length <= 18 && !/^[a-zA-Z0-9]{19,32}$/.test(rawReg.trim())) {
      cleanRegId = rawReg.trim().toUpperCase();
    } else {
      const branchStr = (m.branch || m.branchName || (matched && matched.branch) || 'KPHB').toUpperCase();
      let shortcut = 'KPB';
      if (branchStr.includes('KPHB') || branchStr === 'KPB') shortcut = 'KPB';
      else if (branchStr.includes('CHANDANAGAR') || branchStr === 'CHN') shortcut = 'CHN';
      else if (branchStr.includes('NALLAGANDLA') || branchStr === 'NGL') shortcut = 'NGL';
      else if (branchStr.includes('DILSHUKNAGAR') || branchStr === 'DIL') shortcut = 'DIL';
      else shortcut = branchStr.replace(/[^A-Z]/g, '').substring(0, 3) || 'GEN';

      cleanRegId = `SPH-${shortcut}-${String(index + 1).padStart(4, '0')}`;
    }

    return { cleanPhone, cleanRegId };
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    // Branch Filter
    if (selectedBranch !== 'All Branches') {
      const mBranch = (m.branch || m.branchName || '').toLowerCase();
      const sBranch = selectedBranch.toLowerCase();
      if (!mBranch.includes(sBranch) && !sBranch.includes(mBranch)) return false;
    }

    // Status Filter
    const total = Number(m.totalAmount) || 0;
    const paid = Number(m.paidAmount) || 0;
    const remaining = Number(m.remainingAmount ?? (total - paid));
    const expDate = computeEffectiveExpiry(m);
    const isExpired = expDate ? expDate.getTime() < Date.now() : false;

    if (selectedStatusFilter === 'expired') {
      if (!isExpired) return false;
    } else if (selectedStatusFilter === 'active') {
      if (isExpired) return false;
    } else if (selectedStatusFilter === 'due') {
      if (remaining <= 0 || isExpired) return false;
    } else if (selectedStatusFilter === 'paid_full') {
      if (remaining > 0 || isExpired) return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const pName = (m.patientName || m.name || '').toLowerCase();
      const pPhone = (m.phone || m.phoneNumber || '').toLowerCase();
      const pId = (m.patientId || '').toLowerCase();
      const pBranch = (m.branch || m.branchName || '').toLowerCase();
      return pName.includes(term) || pPhone.includes(term) || pId.includes(term) || pBranch.includes(term);
    }

    return true;
  });

  // Summary Metrics
  const totalCount = members.length;
  const activeCount = members.filter(m => {
    const exp = computeEffectiveExpiry(m);
    return !exp || exp.getTime() >= Date.now();
  }).length;
  const totalPackageValue = members.reduce((sum, m) => sum + (Number(m.totalAmount) || 0), 0);
  const totalCollectedRevenue = members.reduce((sum, m) => sum + (Number(m.paidAmount) || 0), 0);
  const totalRemainingDues = members.reduce((sum, m) => {
    const tot = Number(m.totalAmount) || 0;
    const pd = Number(m.paidAmount) || 0;
    return sum + Math.max(0, Number(m.remainingAmount ?? (tot - pd)));
  }, 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
          }}>
            <Package size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              Package Members & Subscriptions
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', fontWeight: 500 }}>
              Live real-time directory of homeopathic package members, payments, and durations
            </p>
          </div>
        </div>

        {/* Branch Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 12px' }}>
            <Building2 size={15} color="#0284c7" style={{ marginRight: '6px' }} />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
            >
              <option value="All Branches">All Branches</option>
              <option value="KPHB">KPHB Branch</option>
              <option value="Dilshuknagar">Dilshuknagar Branch</option>
              <option value="Nallagandla">Nallagandla Branch</option>
              <option value="Chandanagar">Chandanagar Branch</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        {/* Card 1: Total Package Members */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Total Members</span>
            <Package size={17} color="#0284c7" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>{totalCount}</div>
          <div style={{ fontSize: '11.5px', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#16a34a', fontWeight: 800 }}>● {activeCount} Active</span>
            <span style={{ color: '#dc2626', fontWeight: 800 }}>● {totalCount - activeCount} Inactive (Expired)</span>
          </div>
        </div>

        {/* Card 2: Total Package Value */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Total Package Value</span>
            <IndianRupee size={17} color="#258ec8" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
            ₹{totalPackageValue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
            Total contracted revenue
          </div>
        </div>

        {/* Card 3: Collected Revenue */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Collected Revenue</span>
            <CheckCircle2 size={17} color="#16a34a" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a' }}>
            ₹{totalCollectedRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            {totalPackageValue > 0 ? `${Math.round((totalCollectedRevenue / totalPackageValue) * 100)}% Collected` : '0%'}
          </div>
        </div>

        {/* Card 4: Remaining Balance / Dues */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Pending Balance / Dues</span>
            <AlertCircle size={17} color="#ef4444" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: totalRemainingDues > 0 ? '#ef4444' : '#16a34a' }}>
            ₹{totalRemainingDues.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: totalRemainingDues > 0 ? '#ef4444' : '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            {totalRemainingDues > 0 ? 'To be collected on next visits' : 'All accounts fully clear ✓'}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All Members (${totalCount})` },
              { id: 'active', label: `Active (${activeCount})` },
              { id: 'due', label: 'Due Pending' },
              { id: 'paid_full', label: 'Paid in Full' },
              { id: 'expired', label: `Inactive (Expired) (${totalCount - activeCount})` }
            ].map(tab => {
              const isActive = selectedStatusFilter === tab.id;
              const isExpiredTab = tab.id === 'expired';
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatusFilter(tab.id as any)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: isActive
                      ? (isExpiredTab ? '1.5px solid #dc2626' : '1.5px solid #0284c7')
                      : '1px solid #e2e8f0',
                    background: isActive
                      ? (isExpiredTab ? '#fef2f2' : '#f0f9ff')
                      : '#ffffff',
                    color: isActive
                      ? (isExpiredTab ? '#dc2626' : '#0284c7')
                      : '#475569',
                    fontSize: '12px',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search by patient, phone, reg ID, branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
          </div>
        </div>

        {/* Members Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            Loading package members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <Package size={44} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#334155' }}>No Package Members Found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              {searchTerm ? 'No results matched your search term.' : 'No patient packages match the selected criteria.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 800, textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px' }}>PATIENT NAME</th>
                  <th style={{ padding: '12px 10px' }}>PHONE</th>
                  <th style={{ padding: '12px 10px' }}>BRANCH</th>
                  <th style={{ padding: '12px 10px' }}>PACKAGE JOIN DATE</th>
                  <th style={{ padding: '12px 10px' }}>DURATION & EXPIRY</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>TOTAL AMOUNT</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>PAID AMOUNT</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>REMAINING AMOUNT</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, index) => {
                  const total = Number(m.totalAmount) || 0;
                  const paid = Number(m.paidAmount) || 0;
                  const remaining = Math.max(0, Number(m.remainingAmount ?? (total - paid)));
                  const expDate = computeEffectiveExpiry(m);
                  const isExpired = expDate ? expDate.getTime() < Date.now() : false;
                  const { cleanPhone, cleanRegId } = getCleanMemberDetails(m, index);

                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}>
                      {/* Patient Details */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>
                            {m.patientName || m.name || 'Unnamed'}
                          </span>
                          <span style={{
                            background: isExpired ? '#fef2f2' : '#ecfdf5',
                            color: isExpired ? '#dc2626' : '#059669',
                            border: isExpired ? '1px solid #fca5a5' : '1px solid #10b981',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 800
                          }}>
                            PKG
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 800, marginTop: '2px' }}>
                          {cleanRegId}
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '12px 10px' }}>
                        {cleanPhone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <a
                              href={`tel:${cleanPhone}`}
                              style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
                            >
                              +91 {cleanPhone}
                            </a>
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${m.patientName || 'Patient'}, this is regarding your Package at Spiritual Homeopathy.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp Chat"
                              style={{ color: '#16a34a', display: 'flex', alignItems: 'center' }}
                            >
                              <MessageCircle size={14} />
                            </a>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      {/* Branch */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700
                        }}>
                          {m.branch || m.branchName || 'Main Branch'}
                        </span>
                      </td>

                      {/* Join Date (Payment Date) */}
                      <td style={{ padding: '12px 10px', color: '#475569', fontWeight: 600 }}>
                        {formatDate(m.startDate || m.paymentDate || m.createdAt)}
                      </td>

                      {/* Duration & Expiry */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>
                          {m.duration || `${m.durationMonths || 3} Months`}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: isExpired ? '#dc2626' : '#64748b',
                          fontWeight: isExpired ? 800 : 500,
                          marginTop: '2px'
                        }}>
                          Exp: {formatDate(expDate?.toISOString())} {isExpired ? '(Expired)' : ''}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        ₹{total.toLocaleString('en-IN')}
                      </td>

                      {/* Paid Amount */}
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        ₹{paid.toLocaleString('en-IN')}
                      </td>

                      {/* Remaining Amount */}
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800 }}>
                        {remaining > 0 ? (
                          <span style={{ color: '#dc2626' }}>₹{remaining.toLocaleString('en-IN')}</span>
                        ) : (
                          <span style={{ color: '#16a34a', fontSize: '11.5px' }}>₹0 (Cleared)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {isExpired ? (
                          <span style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1.5px solid #fca5a5',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '0.2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ● INACTIVE (EXPIRED)
                          </span>
                        ) : remaining > 0 ? (
                          <span style={{
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1.5px solid #fde68a',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ● ACTIVE (DUE PENDING)
                          </span>
                        ) : (
                          <span style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1.5px solid #86efac',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ● ACTIVE (PAID)
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedMemberModal(m)}
                          style={{
                            background: '#eff6ff',
                            color: '#0284c7',
                            border: '1px solid #bae6fd',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          View Log
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History Log Modal */}
      {selectedMemberModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Package Log & Payment History
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemberModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedMemberModal.patientName || selectedMemberModal.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  Reg ID: <strong style={{ color: '#0284c7' }}>{getCleanMemberDetails(selectedMemberModal, 0).cleanRegId}</strong> • Branch: {selectedMemberModal.branch || selectedMemberModal.branchName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total Package:</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(selectedMemberModal.totalAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total Paid:</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>
                      ₹{Number(selectedMemberModal.paidAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Remaining Due:</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: Number(selectedMemberModal.remainingAmount || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                      ₹{Number(selectedMemberModal.remainingAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Installment History Log */}
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                Payment Installment Transactions
              </div>
              {Array.isArray(selectedMemberModal.paymentHistory) && selectedMemberModal.paymentHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {selectedMemberModal.paymentHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>
                          {entry.note || `Installment #${idx + 1}`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {formatDate(entry.date)} • Mode: {entry.paymentMode || 'Cash'}
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>
                        +₹{Number(entry.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>
                      Initial Package Advance
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {formatDate(selectedMemberModal.startDate || selectedMemberModal.paymentDate)}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>
                    +₹{Number(selectedMemberModal.paidAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setSelectedMemberModal(null)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageMembersPage;
