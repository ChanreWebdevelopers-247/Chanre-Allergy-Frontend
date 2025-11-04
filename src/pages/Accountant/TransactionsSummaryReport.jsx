import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDownload, FaFilter, FaChartBar, FaBuilding } from 'react-icons/fa';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';

const TransactionsSummaryReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    totalCancelled: 0,
    totalRefunded: 0
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
      
      const bills = response.bills || [];
      setData(bills);
      
      const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
      const totalPaid = bills
        .filter(b => b.status === 'paid' || b.status === 'completed')
        .reduce((sum, bill) => sum + (bill.paidAmount || bill.amount || 0), 0);
      const totalPending = bills
        .filter(b => b.status === 'pending' || b.status === 'partially_paid')
        .reduce((sum, bill) => sum + (bill.balance || (bill.amount - (bill.paidAmount || 0))), 0);
      const totalCancelled = bills
        .filter(b => b.status === 'cancelled')
        .reduce((sum, bill) => sum + (bill.amount || 0), 0);
      const totalRefunded = bills
        .filter(b => b.status === 'refunded' || b.status === 'partially_refunded')
        .reduce((sum, bill) => sum + (bill.refundedAmount || 0), 0);
      
      setSummary({
        totalTransactions: bills.length,
        totalAmount,
        totalPaid,
        totalPending,
        totalCancelled,
        totalRefunded
      });
    } catch (error) {
      console.error('Error fetching transactions summary report:', error);
      toast.error('Failed to fetch transactions summary report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Transactions Summary Report', '', '', '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['SUMMARY', '', '', '', '', '', '', ''],
      ['Total Transactions', summary.totalTransactions, '', '', '', '', '', ''],
      ['Total Amount', summary.totalAmount, '', '', '', '', '', ''],
      ['Total Paid', summary.totalPaid, '', '', '', '', '', ''],
      ['Total Pending', summary.totalPending, '', '', '', '', '', ''],
      ['Total Cancelled', summary.totalCancelled, '', '', '', '', '', ''],
      ['Total Refunded', summary.totalRefunded, '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['DETAILED TRANSACTIONS', '', '', '', '', '', '', ''],
      ['Invoice Number', 'Patient Name', 'UH ID', 'Bill Type', 'Amount', 'Paid Amount', 'Status', 'Date']
    ];

    data.forEach(bill => {
      csvData.push([
        bill.invoiceNumber || bill.billNo || 'N/A',
        bill.patientName || 'N/A',
        bill.uhId || 'N/A',
        bill.billType || 'N/A',
        bill.amount || 0,
        bill.paidAmount || 0,
        bill.status || 'N/A',
        new Date(bill.date).toLocaleDateString()
      ]);
    });

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_summary_report_${new Date().toISOString().split('T')[0]}.csv`;
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
        <h1 className="text-3xl font-bold text-gray-900">Transactions Summary Report</h1>
        <p className="text-gray-600 mt-2">Comprehensive overview of all transactions</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase">Total Transactions</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{summary.totalTransactions}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-4 border border-green-200">
          <p className="text-xs font-semibold text-green-700 uppercase">Total Paid</p>
          <p className="text-2xl font-bold text-green-900 mt-1">₹{summary.totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-4 border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-700 uppercase">Total Pending</p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">₹{summary.totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-4 border border-red-200">
          <p className="text-xs font-semibold text-red-700 uppercase">Total Cancelled</p>
          <p className="text-2xl font-bold text-red-900 mt-1">₹{summary.totalCancelled.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-4 border border-purple-200">
          <p className="text-xs font-semibold text-purple-700 uppercase">Total Refunded</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">₹{summary.totalRefunded.toLocaleString()}</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No transactions found for the selected period.
                  </td>
                </tr>
              ) : (
                data.map((bill) => (
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
                      ₹{(bill.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₹{(bill.paidAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        bill.status === 'paid' || bill.status === 'completed' ? 'bg-green-100 text-green-800' :
                        bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        bill.status === 'partially_paid' ? 'bg-orange-100 text-orange-800' :
                        bill.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        bill.status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(bill.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionsSummaryReport;

