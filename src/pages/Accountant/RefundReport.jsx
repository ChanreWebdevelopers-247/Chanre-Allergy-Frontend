import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDownload, FaFilter, FaUndo, FaBuilding } from 'react-icons/fa';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';

const RefundReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    totalRefunded: 0,
    totalAmount: 0,
    fullyRefunded: 0,
    partiallyRefunded: 0
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
      
      const refundedBills = response.bills?.filter(bill => 
        bill.status === 'refunded' || bill.status === 'partially_refunded' || (bill.refunds && bill.refunds.length > 0)
      ) || [];
      
      setData(refundedBills);
      
      const fullyRefunded = refundedBills.filter(b => b.status === 'refunded');
      const partiallyRefunded = refundedBills.filter(b => b.status === 'partially_refunded');
      
      const totalAmount = refundedBills.reduce((sum, bill) => {
        if (bill.refunds && bill.refunds.length > 0) {
          return sum + bill.refunds.reduce((refundSum, refund) => refundSum + (refund.amount || 0), 0);
        }
        return sum + (bill.refundedAmount || 0);
      }, 0);
      
      setSummary({
        totalRefunded: refundedBills.length,
        totalAmount,
        fullyRefunded: fullyRefunded.length,
        partiallyRefunded: partiallyRefunded.length
      });
    } catch (error) {
      console.error('Error fetching refund report:', error);
      toast.error('Failed to fetch refund report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Refund Report', '', '', '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Invoice Number', 'Patient Name', 'UH ID', 'Bill Type', 'Original Amount', 'Refunded Amount', 'Remaining Amount', 'Date']
    ];

    data.forEach(bill => {
      const refundedAmount = bill.refundedAmount || (bill.refunds ? bill.refunds.reduce((sum, r) => sum + (r.amount || 0), 0) : 0);
      const remainingAmount = bill.paidAmount || 0;
      const originalAmount = bill.amount || 0;
      
      csvData.push([
        bill.invoiceNumber || bill.billNo || 'N/A',
        bill.patientName || 'N/A',
        bill.uhId || 'N/A',
        bill.billType || 'N/A',
        originalAmount,
        refundedAmount,
        remainingAmount,
        new Date(bill.date).toLocaleDateString()
      ]);
    });

    csvData.push(['', '', '', '', '', '', '', '']);
    csvData.push(['Total Refunded Bills', summary.totalRefunded, '', '', '', '', '', '']);
    csvData.push(['Total Refunded Amount', summary.totalAmount, '', '', '', '', '', '']);
    csvData.push(['Fully Refunded', summary.fullyRefunded, '', '', '', '', '', '']);
    csvData.push(['Partially Refunded', summary.partiallyRefunded, '', '', '', '', '', '']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `refund_report_${new Date().toISOString().split('T')[0]}.csv`;
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
        <h1 className="text-3xl font-bold text-gray-900">Refund Report</h1>
        <p className="text-gray-600 mt-2">View all refunded bills and transactions</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-700 uppercase">Total Refunded</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{summary.totalRefunded}</p>
            </div>
            <FaUndo className="h-12 w-12 text-purple-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700 uppercase">Total Refunded Amount</p>
              <p className="text-3xl font-bold text-red-900 mt-2">₹{summary.totalAmount.toLocaleString()}</p>
            </div>
            <FaUndo className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-700 uppercase">Fully Refunded</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{summary.fullyRefunded}</p>
            </div>
            <FaUndo className="h-12 w-12 text-orange-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-700 uppercase">Partially Refunded</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{summary.partiallyRefunded}</p>
            </div>
            <FaUndo className="h-12 w-12 text-yellow-500" />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    No refunded bills found for the selected period.
                  </td>
                </tr>
              ) : (
                data.map((bill) => {
                  const refundedAmount = bill.refundedAmount || (bill.refunds ? bill.refunds.reduce((sum, r) => sum + (r.amount || 0), 0) : 0);
                  const remainingAmount = bill.paidAmount || 0;
                  const originalAmount = bill.amount || 0;
                  
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
                      <td className="px-6 py-4 text-sm font-medium text-green-600">
                        ₹{remainingAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          bill.status === 'refunded' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {bill.status}
                        </span>
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

export default RefundReport;

