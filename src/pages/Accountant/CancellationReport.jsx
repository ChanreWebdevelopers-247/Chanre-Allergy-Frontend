import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, Calendar, XCircle, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

const CancellationReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    totalCancelled: 0,
    totalAmount: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchData();
  }, [dateRange, currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBillingData({
        status: 'cancelled',
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        page: currentPage,
        limit: itemsPerPage
      });
      
      const cancelledBills = response.bills?.filter(bill => bill.status === 'cancelled') || [];
      setData(cancelledBills);
      
      const totalAmount = cancelledBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
      setSummary({
        totalCancelled: cancelledBills.length,
        totalAmount
      });
    } catch (error) {
      console.error('Error fetching cancellation report:', error);
      toast.error('Failed to fetch cancellation report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Cancellation Report', '', '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Invoice Number', 'Patient Name', 'UH ID', 'Bill Type', 'Amount', 'Date', 'Reason']
    ];

    data.forEach(bill => {
      csvData.push([
        bill.invoiceNumber || bill.billNo || 'N/A',
        bill.patientName || 'N/A',
        bill.uhId || 'N/A',
        bill.billType || 'N/A',
        bill.amount || 0,
        new Date(bill.date).toLocaleDateString(),
        bill.cancellationReason || 'N/A'
      ]);
    });

    csvData.push(['', '', '', '', '', '', '']);
    csvData.push(['Total Cancelled Bills', summary.totalCancelled, '', '', '', '', '']);
    csvData.push(['Total Amount', summary.totalAmount, '', '', '', '', '']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cancellation_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Report exported successfully!');
  };

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-800">Cancellation Report</h1>
          <p className="text-xs text-slate-600 mt-1">View all cancelled bills and invoices</p>
          {user?.centerId && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Building2 className="mr-1 h-3 w-3" />
                {user?.centerId?.name || 'Center'}
              </span>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Total Cancelled Bills</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalCancelled}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Total Cancelled Amount</p>
                <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.totalAmount.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchData}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Filter className="mr-1 h-4 w-4" />
                Apply
              </button>
              <button
                onClick={handleExport}
                className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UH ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">
                      No cancelled bills found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((bill) => (
                    <tr key={bill._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">
                        {bill.invoiceNumber || bill.billNo || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-700">{bill.patientName}</td>
                      <td className="px-4 py-2 text-sm text-slate-700">{bill.uhId}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                          {bill.billType}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">
                        ₹{(bill.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {new Date(bill.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {bill.cancellationReason || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {data.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={data.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CancellationReport;
