import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, Clock, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
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
      <div className="w-full">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-800">Pending Bills Report</h1>
            <p className="text-[10px] text-slate-600 mt-0.5">View all pending and partially paid bills</p>
          </div>
          {user?.centerId && (
            <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200">
              <Building2 className="mr-1 h-2.5 w-2.5" />
              {user?.centerId?.name || 'Center'}
            </span>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 mt-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Total Pending Bills</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{summary.totalPending}</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Total Pending Amount</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">₹{summary.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Partially Paid</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{summary.partiallyPaid}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Partially Paid Amount</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">₹{summary.partiallyPaidAmount.toLocaleString()}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 mb-3 rounded-lg shadow-sm border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-2 py-1.5 text-[11px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-2 py-1.5 text-[11px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  fetchData();
                }}
                className="flex items-center px-3 py-1.5 text-[11px] bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Filter className="mr-1 h-3 w-3" />
                Apply Filters
              </button>
              <button
                onClick={handleExport}
                className="flex items-center px-3 py-1.5 text-[11px] bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
              >
                <Download className="mr-1 h-3 w-3" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Invoice</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Patient</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">UH ID</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Bill Type</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Total Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Paid Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Pending Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Status</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="border border-gray-200 px-2 py-3 text-center text-[11px] text-gray-500">
                      No pending bills found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((bill) => {
                    const pendingAmount = bill.balance || (bill.amount - (bill.paidAmount || 0));
                    return (
                      <tr key={bill._id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700 font-medium">
                          {bill.invoiceNumber || bill.billNo || 'N/A'}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{bill.patientName || 'N/A'}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{bill.uhId || 'N/A'}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            bill.billType === 'Consultation' ? 'bg-blue-100 text-blue-800' :
                            bill.billType === 'Reassignment' ? 'bg-purple-100 text-purple-800' :
                            bill.billType === 'Superconsultant' ? 'bg-indigo-100 text-indigo-800' :
                            bill.billType === 'Lab/Test' ? 'bg-green-100 text-green-800' :
                            bill.billType === 'Slit Therapy' || bill.billType === 'slit_therapy' ? 'bg-pink-100 text-pink-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.billType || 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-900 font-medium">
                          ₹{(bill.amount || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-green-600 font-medium">
                          ₹{(bill.paidAmount || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-orange-600">
                          ₹{pendingAmount.toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            bill.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {bill.status || 'pending'}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">
                          {formatDate(bill.date)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination - Always show when there's data */}
        {data.length > 0 && (
          <div className="mt-3 bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
            {totalPages > 1 ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={data.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            ) : (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex items-center">
                  <p className="text-sm text-gray-700 mr-2">Show:</p>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <p className="text-sm text-gray-700 ml-2">per page</p>
                </div>
                <div className="flex-1 flex justify-center">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">1</span> to{' '}
                    <span className="font-medium">{data.length}</span> of{' '}
                    <span className="font-medium">{data.length}</span> results
                  </p>
                </div>
                <div className="w-32"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingBillsReport;

