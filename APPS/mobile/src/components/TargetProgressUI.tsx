import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TargetProgressUIProps {
  monthlyTarget?: number;
  targetReached?: number;
  branchName?: string;
}

export const TargetProgressUI: React.FC<TargetProgressUIProps> = ({
  monthlyTarget = 100000,
  targetReached = 75000,
  branchName,
}) => {
  const targetNum = Number(monthlyTarget) || 0;
  const reachedNum = Number(targetReached) || 0;
  const remaining = Math.max(targetNum - reachedNum, 0);
  const percentage = targetNum > 0 ? Math.min(Math.round((reachedNum / targetNum) * 100), 100) : 0;
  const isReached = reachedNum >= targetNum;

  // Dynamic Theme Colors
  const containerBg = isReached ? '#f0fdf4' : '#ffffff';
  const borderColor = isReached ? '#4ade80' : '#e2e8f0';
  const progressColor = isReached ? '#16a34a' : '#258ec8';

  return (
    <View style={[styles.cardContainer, { backgroundColor: containerBg, borderColor }]}>
      
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="target" size={18} color={isReached ? '#16a34a' : '#258ec8'} style={{ marginRight: 6 }} />
          <Text style={[styles.cardTitle, isReached && { color: '#166534' }]}>
            {branchName ? `${branchName} Target` : 'Monthly Target'}
          </Text>
        </View>
        {isReached ? (
          <View style={styles.badgeSuccess}>
            <Feather name="award" size={12} color="#15803d" style={{ marginRight: 4 }} />
            <Text style={styles.badgeSuccessText}>Target Reached!</Text>
          </View>
        ) : (
          <View style={styles.badgeNormal}>
            <Feather name="trending-up" size={12} color="#0284c7" style={{ marginRight: 4 }} />
            <Text style={styles.badgeNormalText}>{percentage}% Achieved</Text>
          </View>
        )}
      </View>

      {/* 3 Metric Columns: Target | Reached | Remaining */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel} numberOfLines={1}>Target Goal</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            ₹{targetNum.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel} numberOfLines={1}>Target Reached</Text>
          <Text style={[styles.metricValue, { color: '#16a34a' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            ₹{reachedNum.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel} numberOfLines={1}>Remaining</Text>
          <Text style={[styles.metricValue, { color: remaining > 0 ? '#258ec8' : '#16a34a' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            ₹{remaining.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Visual Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: progressColor }]} />
      </View>

      {/* Progress Footer Subtext */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText} numberOfLines={1}>
          {isReached ? '🎉 Target achieved.' : `₹${remaining.toLocaleString('en-IN')} remaining.`}
        </Text>
        <Text style={styles.percentageText}>{percentage}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginVertical: 4,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  badgeNormal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  badgeNormalText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  divider: {
    width: 1,
    height: 26,
    backgroundColor: '#cbd5e1',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 6,
  },
});
