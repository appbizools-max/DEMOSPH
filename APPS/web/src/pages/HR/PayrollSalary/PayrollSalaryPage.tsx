import React from 'react';
import { DollarSign } from 'lucide-react';

export const PayrollSalaryPage: React.FC = () => {
  const payrollList = [
    { name: 'Anil Kumar M', branch: 'KPHB', salary: '₹22,000', status: 'Processed' },
    { name: 'Ashwini Begari', branch: 'Chandanagar', salary: '₹17,000', status: 'Processed' },
    { name: 'Vaishnavi Peri', branch: 'Nallagandla', salary: '₹17,000', status: 'Processed' },
    { name: 'Nandini Gottelli', branch: 'Dilshuknagar', salary: '₹15,000', status: 'Pending' },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <DollarSign size={24} color="#258ec8" />
        <h1 style={{ fontSize: '18px !important', fontWeight: 800, color: '#0f172a' }}>
          Staff Payroll & Base Salaries
        </h1>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>STAFF NAME</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>BRANCH</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>BASE SALARY</th>
              <th style={{ padding: '10px', fontSize: '12px !important' }}>PAYOUT STATUS</th>
            </tr>
          </thead>
          <tbody>
            {payrollList.map(p => (
              <tr key={p.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontSize: '13px !important', fontWeight: 700 }}>{p.name}</td>
                <td style={{ padding: '10px', fontSize: '12px !important' }}>{p.branch}</td>
                <td style={{ padding: '10px', fontSize: '13px !important', fontWeight: 800, color: '#0f172a' }}>{p.salary}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ 
                    background: p.status === 'Processed' ? '#f0fdf4' : '#fef2f2', 
                    color: p.status === 'Processed' ? '#16a34a' : '#ef4444', 
                    padding: '3px 8px', 
                    borderRadius: '8px', 
                    fontSize: '11px !important', 
                    fontWeight: 700 
                  }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
