import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDownload, FaFilter, FaExclamationTriangle, FaBuilding } from 'react-icons/fa';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';

const PenaltyCollectionReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    totalPenalties: 0,
    totalAmount: 0,
    averagePenalty: 0
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      });
      
      // Filter bills with penalties (refunded bills where remaining amount is penalty)
      const penaltyBills = response.bills?.filter(bill => {
        if (bill.status === 'refunded' || bill.status === 'partially_refunded') {
          // Penalty is the remaining amount after refund
          const remainingAmount = bill.paidAmount || 0;
          return remainingAmount > 0;
        }
        return false;
      }) || [];
      
      setData(penaltyBills);
      
      const totalAmount = penaltyBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
      const averagePenalty = penaltyBills.length > 0 ? totalAmount / penaltyBills.length : 0;
      
      setSummary({
        totalPenalties: penaltyBills.length,
        totalAmount,
        averagePenalty
      });
    } catch (error) {
      console.error('Error fetching penalty collection report:', error);
      toast.error('Failed to fetch penalty collection report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Penalty Collection Report', '', '', '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Invoice Number', 'Patient Name', 'UH ID', 'Bill Type', 'Original Amount', 'Refunded Amount', 'Penalty Amount', 'Date']
    ];

    data.forEach(bill => {
      const originalAmount = bill.amount || 0;
      const refundedAmount = bill.refundedAmount || (bill.refunds ? bill.refunds.reduce((sum, r) => sum + (r.amount || 0), 0) : 0);
      const penaltyAmount = bill.paidAmount || 0; // Remaining amount after refund is penalty
      
      csvData.push([
        bill.invoiceNumber || bill.billNo || 'N/A',
        bill.patientName || 'N/A',
        bill.uhId || 'N/A',
        bill.billType || 'N/A',
        originalAmount,
        refundedAmount,
        penaltyAmount,
        new Date(bill.date).toLocaleDateString()
      ]);
    });

    csvData.push(['', '', '', '', '', '', '', '']);
    csvData.push(['Total Penalties', summary.totalPenalties, '', '', '', '', '', '']);
    csvData.push(['Total Penalty Amount', summary.totalAmount, '', '', '', '', '', '']);
    csvData.push(['Average Penalty', summary.averagePenalty.toFixed(2), '', '', '', '', '', '']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `penalty_collection_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Report exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Penalty Collection Report</h1>
        <p className="text-gray-600 mt-2">View penalty amounts collected from refunded bills</p>
        {user?.centerId && (
          <div className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <FaBuilding className="mr-1" />
              {user?.centerId?.name || 'Center'}
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700 uppercase">Total Penalties</p>
              <p className="text-3xl font-bold text-red-900 mt-2">{summary.totalPenalties}</p>
            </div>
            <FaExclamationTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-700 uppercase">Total Penalty Amount</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">₹{summary.totalAmount.toLocaleString()}</p>
            </div>
            <FaExclamationTriangle className="h-12 w-12 text-orange-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-700 uppercase">Average Penalty</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">₹{summary.averagePenalty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <FaExclamationTriangle className="h-12 w-12 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={fetchData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FaFilter className="mr-2" />
              Apply Filters
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FaDownload className="mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UH ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Original Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refunded Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penalty Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No penalty collections found for the selected period.
                  </td>
                </tr>
              ) : (
                data.map((bill) => {
                  const originalAmount = bill.amount || 0;
                  const refundedAmount = bill.refundedAmount || (bill.refunds ? bill.refunds.reduce((sum, r) => sum + (r.amount || 0), 0) : 0);
                  const penaltyAmount = bill.paidAmount || 0; // Remaining amount after refund
                  
                  return (
                    <tr key={bill._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {bill.invoiceNumber || bill.billNo || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{bill.patientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{bill.uhId}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {bill.billType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₹{originalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-purple-600">
                        ₹{refundedAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-red-600">
                        ₹{penaltyAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(bill.date).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PenaltyCollectionReport;

