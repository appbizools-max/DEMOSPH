import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@app/shared';

import { receptionDataStore } from '../../../utils/receptionDataStore';
import { calculateRealBranchRevenue, syncBranchTargetToFirestore } from '../../../utils/branchRevenueCalculator';

const DEFAULT_BRANCH_TARGETS = [
  { id: 'kphb', name: 'KPHB Branch Target', monthlyTarget: 1200000, targetReached: 0 },
  { id: 'nallagandla', name: 'Nallagandla Branch Target', monthlyTarget: 1000000, targetReached: 0 },
  { id: 'dilshuknagar', name: 'Dilshuknagar Branch Target', monthlyTarget: 1400000, targetReached: 0 },
  { id: 'chandanagar', name: 'Chandanagar Branch Target', monthlyTarget: 900000, targetReached: 0 },
];

export const BranchTargetsPage: React.FC = () => {
  const [branchTargets, setBranchTargets] = useState(DEFAULT_BRANCH_TARGETS);

  // Subscribe to real-time collections via receptionDataStore to calculate live revenue
  useEffect(() => {
    receptionDataStore.startListeners();
    const unsub = receptionDataStore.subscribe((state) => {
      const appts = state.appointments;
      const pkgs = state.packageMembersList;

      setBranchTargets((prev) =>
        prev.map((b) => {
          const res = calculateRealBranchRevenue(b.name, appts, pkgs, b.monthlyTarget);
          syncBranchTargetToFirestore(db, b.name, res.targetReached, res.monthlyTarget).catch(() => {});
          return {
            ...b,
            monthlyTarget: res.monthlyTarget,
            targetReached: res.targetReached,
          };
        })
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      const colRef = collection(db, 'branchTargets');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const liveMap: Record<string, any> = {};
          snapshot.forEach((docSnap) => {
            liveMap[docSnap.id.toLowerCase()] = docSnap.data();
          });

          setBranchTargets((prev) =>
            prev.map((b) => {
              const live = liveMap[b.id] || liveMap[b.name.toLowerCase().replace(/\s*branch\s*target$/i, '')];
              if (live) {
                return {
                  ...b,
                  monthlyTarget: Number(live.monthlyTarget) || b.monthlyTarget,
                  targetReached: Number(live.targetReached) ?? b.targetReached,
                };
              }
              return b;
            })
          );
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Error listening to branch targets:', err);
    }
  }, []);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Target size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Branch Target Management
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {branchTargets.map(b => {
          const pct = Math.round((b.targetReached / (b.monthlyTarget || 1)) * 100);
          const statusText = `${pct >= 82 ? 'Ahead' : 'On Track'} (${pct}%)`;
          return (
            <div key={b.name} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
              <h3 style={{ fontSize: '14.5px !important', fontWeight: 800, color: '#0f172a' }}>{b.name}</h3>
              <p style={{ fontSize: '12px !important', color: '#64748b', margin: '4px 0' }}>Target: <b>{formatCurrency(b.monthlyTarget)}</b> | Achieved: <b style={{ color: '#16a34a' }}>{formatCurrency(b.targetReached)}</b></p>
              <span style={{ fontSize: '11px !important', fontWeight: 700, color: '#258ec8' }}>{statusText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
