import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@app/shared';

const DEFAULT_BRANCH_TARGETS = [
  { id: 'kphb', name: 'KPHB Branch', monthlyTarget: 1200000, targetReached: 980000 },
  { id: 'nallagandla', name: 'Nallagandla Branch', monthlyTarget: 1000000, targetReached: 840000 },
  { id: 'dilshuknagar', name: 'Dilshuknagar Branch', monthlyTarget: 1400000, targetReached: 1150000 },
  { id: 'chandanagar', name: 'Chandanagar Branch', monthlyTarget: 900000, targetReached: 720000 },
];

export const BranchTargetsScreen: React.FC = () => {
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
              const live = liveMap[b.id] || liveMap[b.name.toLowerCase()];
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
      <Text style={styles.title}>Branch Target Management</Text>
      <Text style={styles.subTitle}>Monthly revenue targets and branch progress.</Text>

      {branchTargets.map(b => (
        <View key={b.name} style={styles.card}>
          <Text style={styles.cardTitle}>{b.name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={styles.infoText}>Target: <Text style={{ fontWeight: '800', color: '#258ec8' }}>{formatCurrency(b.monthlyTarget)}</Text></Text>
            <Text style={styles.infoText}>Achieved: <Text style={{ fontWeight: '800', color: '#a8ce3a' }}>{formatCurrency(b.targetReached)}</Text></Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  infoText: { fontSize: 12, color: '#475569' },
});
