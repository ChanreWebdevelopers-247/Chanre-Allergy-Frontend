import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDownload, FaFilter, FaClock, FaBuilding } from 'react-icons/fa';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';

const PendingBillsReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    totalPending: 0,
    totalAmount: 0,
    partiallyPaid: 0,
    partiallyPaidAmount: 0
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
      
      const pendingBills = response.bills?.filter(bill => 
        bill.status === 'pending' || bill.status === 'partially_paid'
      ) || [];
      
      setData(pendingBills);
      
      const fullyPending = pendingBills.filter(b => b.status === 'pending');
      const partiallyPaid = pendingBills.filter(b => b.status === 'partially_paid');
      
      const totalAmount = pendingBills.reduce((sum, bill) => sum + (bill.balance || (bill.amount - (bill.paidAmount || 0))), 0);
      const partiallyPaidAmount = partiallyPaid.reduce((sum, bill) => sum + (bill.balance || (bill.amount - (bill.paidAmount || 0))), 0);
      
      setSummary({
        totalPending: pendingBills.length,
        totalAmount,
        partiallyPaid: partiallyPaid.length,
        partiallyPaidAmount
      });
    } catch (error) {
      console.error('Error fetching pending bills report:', error);
      toast.error('Failed to fetch pending bills report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Pending Bills Report', '', '', '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Invoice Number', 'Patient Name', 'UH ID', 'Bill Type', 'Total Amount', 'Paid Amount', 'Pending Amount', 'Date']
    ];

    data.forEach(bill => {
      const pendingAmount = bill.balance || (bill.amount - (bill.paidAmount || 0));
      csvData.push([
        bill.invoiceNumber || bill.billNo || 'N/A',
        bill.patientName || 'N/A',
        bill.uhId || 'N/A',
        bill.billType || 'N/A',
        bill.amount || 0,
        bill.paidAmount || 0,
        pendingAmount,
        new Date(bill.date).toLocaleDateString()
      ]);
    });

    csvData.push(['', '', '', '', '', '', '', '']);
    csvData.push(['Total Pending Bills', summary.totalPending, '', '', '', '', '', '']);
    csvData.push(['Total Pending Amount', summary.totalAmount, '', '', '', '', '', '']);
    csvData.push(['Partially Paid Bills', summary.partiallyPaid, '', '', '', '', '', '']);
    csvData.push(['Partially Paid Amount', summary.partiallyPaidAmount, '', '', '', '', '', '']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pending_bills_report_${new Date().toISOString().split('T')[0]}.csv`;
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
        <h1 className="text-3xl font-bold text-gray-900">Pending Bills Report</h1>
        <p className="text-gray-600 mt-2">View all pending and partially paid bills</p>
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
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-700 uppercase">Total Pending Bills</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{summary.totalPending}</p>
            </div>
            <FaClock className="h-12 w-12 text-yellow-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-700 uppercase">Total Pending Amount</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">₹{summary.totalAmount.toLocaleString()}</p>
            </div>
            <FaClock className="h-12 w-12 text-orange-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700 uppercase">Partially Paid</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{summary.partiallyPaid}</p>
            </div>
            <FaClock className="h-12 w-12 text-blue-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700 uppercase">Partially Paid Amount</p>
              <p className="text-3xl font-bold text-red-900 mt-2">₹{summary.partiallyPaidAmount.toLocaleString()}</p>
            </div>
            <FaClock className="h-12 w-12 text-red-500" />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    No pending bills found for the selected period.
                  </td>
                </tr>
              ) : (
                data.map((bill) => {
                  const pendingAmount = bill.balance || (bill.amount - (bill.paidAmount || 0));
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
                        ₹{(bill.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600">
                        ₹{(bill.paidAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-orange-600">
                        ₹{pendingAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          bill.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-orange-100 text-orange-800'
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

export default PendingBillsReport;

