import React from 'react';
import { Target, Award, TrendingUp } from 'lucide-react';

interface TargetProgressWebUIProps {
  monthlyTarget?: number;
  targetReached?: number;
  branchName?: string;
}

export const TargetProgressWebUI: React.FC<TargetProgressWebUIProps> = ({
  monthlyTarget = 100000,
  targetReached = 75000,
  branchName,
}) => {
  const targetNum = Number(monthlyTarget) || 0;
  const reachedNum = Number(targetReached) || 0;
  const remaining = Math.max(targetNum - reachedNum, 0);
  const percentage = targetNum > 0 ? Math.min(Math.round((reachedNum / targetNum) * 100), 100) : 0;
  const isReached = reachedNum >= targetNum;

  return (
    <div style={{
      width: '100%',
      backgroundColor: isReached ? '#f0fdf4' : '#ffffff',
      border: `1px solid ${isReached ? '#4ade80' : '#e2e8f0'}`,
      borderRadius: '14px',
      padding: '16px 18px',
      margin: '12px 0 6px 0',
      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Target size={20} color={isReached ? '#16a34a' : '#258ec8'} style={{ flexShrink: 0 }} />
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: isReached ? '#166534' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {branchName ? `${branchName} Target` : 'Monthly Target'}
          </h3>
        </div>
        {isReached ? (
          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <Award size={14} /> 🏆 Target Reached!
          </span>
        ) : (
          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <TrendingUp size={14} /> {percentage}% Achieved
          </span>
        )}
      </div>

      {/* Numbers Breakdown - Clean Edge-to-Edge Grid with zero overflow */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: '12px 10px',
        borderRadius: '10px',
        marginBottom: '12px',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box',
        gap: '4px'
      }}>
        <div style={{ textAlign: 'center', minWidth: 0, padding: '0 2px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Target Goal</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>₹{targetNum.toLocaleString('en-IN')}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 0, padding: '0 2px', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Target Reached</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>₹{reachedNum.toLocaleString('en-IN')}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 0, padding: '0 2px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Remaining</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: remaining > 0 ? '#258ec8' : '#16a34a', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>₹{remaining.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: isReached ? '#16a34a' : '#258ec8', borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>

      {/* Subtext */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isReached ? '🎉 Target achieved!' : `₹${remaining.toLocaleString('en-IN')} needed to complete target.`}</span>
        <strong style={{ color: '#0f172a', marginLeft: '6px', flexShrink: 0 }}>{percentage}%</strong>
      </div>
    </div>
  );
};
