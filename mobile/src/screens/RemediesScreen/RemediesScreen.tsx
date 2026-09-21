import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput } from 'react-native';
import { Remedy } from '@app/shared';

const initialRemedies: Remedy[] = [
  {
    id: '1',
    name: 'Arnica Montana',
    latinName: 'Leopard\'s Bane',
    category: 'Acute',
    symptoms: ['Physical trauma', 'Bruising', 'Shock'],
    potencyOptions: ['30C', '200C'],
    description: 'First remedy for trauma, soreness, and physical injuries.',
    spiritualInsight: 'Restores the subtle energy field after emotional shock.'
  },
  {
    id: '2',
    name: 'Ignatia Amara',
    latinName: 'St. Ignatius Bean',
    category: 'Spiritual',
    symptoms: ['Grief', 'Emotional heartbreak', 'Sorrows'],
    potencyOptions: ['200C', '1M'],
    description: 'Essential remedy for acute grief and silent emotional sorrow.',
    spiritualInsight: 'Releases emotional tension and brings inner tranquility.'
  }
];

export const RemediesScreen: React.FC = () => {
  const [query, setQuery] = useState('');

  const filtered = initialRemedies.filter(r => 
    r.name.toLowerCase().includes(query.toLowerCase()) || 
    r.symptoms.some(s => s.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Homeopathic Directory</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Search remedy or symptom..." 
        placeholderTextColor="#94a3b8"
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id!}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.remedyName}>{item.name}</Text>
              <Text style={styles.badge}>{item.category}</Text>
            </View>
            <Text style={styles.latin}>{item.latinName}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            {item.spiritualInsight && (
              <View style={styles.insightBox}>
                <Text style={styles.insightTitle}>Spiritual Insight</Text>
                <Text style={styles.insightText}>{item.spiritualInsight}</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    color: '#0f172a',
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remedyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#258ec8',
  },
  badge: {
    color: '#a8ce3a',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#f4f9e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  latin: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748b',
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  insightBox: {
    backgroundColor: '#eef5fc',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  insightTitle: {
    color: '#258ec8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  insightText: {
    color: '#475569',
    fontSize: 12,
  },
});
