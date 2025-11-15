import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, AlertTriangle, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      });
      
      // Filter cancelled bills with penalties
      // For consultation bills, penalty is ₹150 (registration fee)
      const penaltyBills = response.bills?.filter(bill => {
        // Check if bill is cancelled
        return bill.status === 'cancelled';
      }).map(bill => {
        // Extract penalty amount
        const penaltyFromInfo = bill.penaltyInfo?.penaltyAmount || 0;
        const paidAmount = bill.paidAmount || 0;
        const totalAmount = bill.amount || bill.totalAmount || 0;
        
        // For consultation bills, penalty is ₹150 (registration fee)
        // Use penalty from info if available, otherwise default to 150 for consultation
        let penaltyAmount = 0;
        if (penaltyFromInfo > 0) {
          penaltyAmount = penaltyFromInfo;
        } else if (bill.billType === 'Consultation' && bill.status === 'cancelled') {
          // Default penalty for consultation is ₹150
          penaltyAmount = 150;
        }
        
        // Calculate refunded amount
        let refundedAmount = 0;
        
        // First, check if there are actual refunds recorded
        const refundsFromArray = bill.refunds ? bill.refunds.reduce((sum, r) => sum + (r.amount || 0), 0) : 0;
        const refundedAmountField = bill.refundedAmount || 0;
        
        if (refundsFromArray > 0) {
          // Use refunds from array if available
          refundedAmount = refundsFromArray;
        } else if (refundedAmountField > 0) {
          // Use refundedAmount field if available
          refundedAmount = refundedAmountField;
        } else if (paidAmount > 0 && penaltyAmount > 0) {
          // If bill was paid and has penalty, calculate refunded = paid - penalty
          refundedAmount = Math.max(0, paidAmount - penaltyAmount);
        }
        
        return {
          ...bill,
          penaltyAmount: penaltyAmount > 0 ? penaltyAmount : 0,
          calculatedRefundedAmount: refundedAmount
        };
      }).filter(bill => bill.penaltyAmount > 0) || [];
      
      setData(penaltyBills);
      
      const totalAmount = penaltyBills.reduce((sum, bill) => sum + (bill.penaltyAmount || 0), 0);
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
      const refundedAmount = bill.calculatedRefundedAmount || bill.refundedAmount || (bill.refunds ? bill.refunds.reduce((sum, r) => sum + (r.amount || 0), 0) : 0);
      const penaltyAmount = bill.penaltyAmount || 0;
      
      csvData.push([
        bill.invoiceNumber || bill.billNo || 'N/A',
        bill.patientName || 'N/A',
        bill.uhId || 'N/A',
        bill.billType || 'N/A',
        originalAmount,
        refundedAmount,
        penaltyAmount,
        new Date(bill.date || bill.createdAt).toLocaleDateString()
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
            <h1 className="text-sm font-bold text-slate-800">Penalty Collection Report</h1>
            <p className="text-[10px] text-slate-600 mt-0.5">View penalty amounts collected from cancelled bills</p>
          </div>
          {user?.centerId && (
            <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200">
              <Building2 className="mr-1 h-2.5 w-2.5" />
              {user?.centerId?.name || 'Center'}
            </span>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 mt-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Total Penalties</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{summary.totalPenalties}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Total Penalty Amount</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">₹{summary.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Average Penalty</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">₹{summary.averagePenalty.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-full">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
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
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Original Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Refunded Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Penalty Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="border border-gray-200 px-2 py-3 text-center text-[11px] text-gray-500">
                      No penalty collections found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((bill) => {
                    const originalAmount = bill.amount || 0;
                    const refundedAmount = bill.calculatedRefundedAmount || bill.refundedAmount || (bill.refunds ? bill.refunds.reduce((sum, r) => sum + (r.amount || 0), 0) : 0);
                    const penaltyAmount = bill.penaltyAmount || 0;
                    
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
                          ₹{originalAmount.toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-purple-600 font-medium">
                          ₹{refundedAmount.toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-red-600">
                          ₹{penaltyAmount.toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">
                          {formatDate(bill.date || bill.createdAt || bill.cancelledAt)}
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

export default PenaltyCollectionReport;

