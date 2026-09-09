import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@app/shared';

const DEFAULT_BRANCH_TARGETS = [
  { id: 'kphb', name: 'KPHB Branch Target', monthlyTarget: 1200000, targetReached: 980000 },
  { id: 'nallagandla', name: 'Nallagandla Branch Target', monthlyTarget: 1000000, targetReached: 840000 },
  { id: 'dilshuknagar', name: 'Dilshuknagar Branch Target', monthlyTarget: 1400000, targetReached: 1150000 },
  { id: 'chandanagar', name: 'Chandanagar Branch Target', monthlyTarget: 900000, targetReached: 720000 },
];

export const BranchTargetHRScreen: React.FC = () => {
  const [branchTargets, setBranchTargets] = useState(DEFAULT_BRANCH_TARGETS);

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
                  targetReached: Number(live.targetReached) || b.targetReached,
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>HR Branch Target Management</Text>
      <Text style={styles.subTitle}>Branch revenue performance and staff targets.</Text>

      {branchTargets.map(b => {
        const pct = Math.round((b.targetReached / (b.monthlyTarget || 1)) * 100);
        const statusText = `${pct >= 82 ? 'Ahead' : 'On Track'} (${pct}%)`;
        return (
          <View key={b.name} style={styles.card}>
            <Text style={styles.cardTitle}>{b.name}</Text>
            <Text style={styles.cardSub}>Target: {formatCurrency(b.monthlyTarget)} | Current: {formatCurrency(b.targetReached)}</Text>
            <Text style={styles.cardStatus}>{statusText}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cardStatus: { fontSize: 12, fontWeight: '700', color: '#258ec8', marginTop: 4 },
});
