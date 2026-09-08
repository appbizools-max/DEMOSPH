import React, { useState } from 'react';

export const DoctorTotalRevenuePage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  const summaryCards = [
    { title: 'Total Collections', amount: '₹3,85,000', growth: '+18.5%', color: 'from-emerald-500 to-teal-600', icon: '💰' },
    { title: 'Consultation Fees', amount: '₹1,45,000', growth: '+12.0%', color: 'from-sky-500 to-blue-600', icon: '🩺' },
    { title: 'Remedy / Dispensing', amount: '₹1,60,000', growth: '+22.4%', color: 'from-indigo-500 to-purple-600', icon: '💊' },
    { title: 'Package Enrollments', amount: '₹80,000', growth: '+15.8%', color: 'from-amber-500 to-orange-600', icon: '📦' },
  ];

  const paymentModes = [
    { mode: 'UPI & QR Code', amount: '₹2,10,000', share: '54.5%', color: 'bg-emerald-500' },
    { mode: 'Credit / Debit Cards', amount: '₹95,000', share: '24.7%', color: 'bg-sky-500' },
    { mode: 'Cash Payments', amount: '₹55,000', share: '14.3%', color: 'bg-amber-500' },
    { mode: 'Direct Bank Transfer', amount: '₹25,000', share: '6.5%', color: 'bg-purple-500' },
  ];

  const recentTransactions = [
    { id: 'TXN-901', patient: 'Sarah Jenkins', type: 'Constitutional Package', amount: '₹12,500', mode: 'UPI (GPay)', date: 'Today, 02:45 PM', status: 'Completed' },
    { id: 'TXN-902', patient: 'Rajesh Kumar', type: 'Consultation & Remedy', amount: '₹2,400', mode: 'Credit Card', date: 'Today, 01:15 PM', status: 'Completed' },
    { id: 'TXN-903', patient: 'Anita Sharma', type: 'Acute Remedy Dispense', amount: '₹1,800', mode: 'Cash', date: 'Today, 11:30 AM', status: 'Completed' },
    { id: 'TXN-904', patient: 'David Miller', type: 'Spiritual Mind Care', amount: '₹8,000', mode: 'UPI (PhonePe)', date: 'Yesterday', status: 'Completed' },
    { id: 'TXN-905', patient: 'Priya Reddy', type: 'Follow-up Consultation', amount: '₹1,200', mode: 'UPI (Paytm)', date: 'Yesterday', status: 'Completed' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Total Revenue Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              HEAD DOCTOR EXCLUSIVE
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Real-time revenue analytics, consultation earnings & package performance.</p>
        </div>

        {/* Timeframe Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['month', 'quarter', 'year'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                timeframe === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This {t}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {card.growth}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.title}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{card.amount}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Modes Share */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>💳</span> Payment Methods
          </h2>
          <div className="space-y-4 pt-2">
            {paymentModes.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{item.mode}</span>
                  <span>{item.amount} ({item.share})</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: item.share }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Performance Graph Mock */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📈</span> Monthly Growth Trend
              </h2>
              <span className="text-xs text-slate-500 font-medium">Updated 5 mins ago</span>
            </div>

            {/* Visual Bar Chart */}
            <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4 border-b border-slate-100 pb-2">
              {[
                { month: 'Apr', height: 'h-24', val: '₹2.8L' },
                { month: 'May', height: 'h-28', val: '₹3.1L' },
                { month: 'Jun', height: 'h-32', val: '₹3.3L' },
                { month: 'Jul', height: 'h-36', val: '₹3.5L' },
                { month: 'Aug', height: 'h-40', val: '₹3.7L' },
                { month: 'Sep', height: 'h-44 bg-sky-600', val: '₹3.85L' },
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-extrabold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.val}
                  </span>
                  <div className={`w-full ${bar.height.includes('bg-') ? bar.height : 'bg-sky-200'} rounded-t-lg transition-all group-hover:bg-sky-500`}></div>
                  <span className="text-xs font-bold text-slate-600">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
            <span>Highest month: September (₹3.85L)</span>
            <span className="font-bold text-sky-600">Average Monthly Revenue: ₹3.37L</span>
          </div>
        </div>

      </div>

      {/* Recent Revenue Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🧾</span> Recent Revenue Receipts
          </h2>
          <span className="text-xs font-semibold text-slate-500">Showing last 5 transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Transaction ID</th>
                <th className="px-5 py-3.5">Patient Name</th>
                <th className="px-5 py-3.5">Service / Package</th>
                <th className="px-5 py-3.5">Payment Method</th>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">{tx.id}</td>
                  <td className="px-5 py-4 font-bold text-slate-800">{tx.patient}</td>
                  <td className="px-5 py-4 text-slate-600">{tx.type}</td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                      {tx.mode}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{tx.date}</td>
                  <td className="px-5 py-4 text-right font-black text-slate-900 text-sm">{tx.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
