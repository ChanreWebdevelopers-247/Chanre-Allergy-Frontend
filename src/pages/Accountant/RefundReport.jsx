import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, RotateCcw, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

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
    totalRefundAmount: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      });
      
      const allBills = response.bills || [];
      
      // Extract individual refund entries
      const refundEntries = [];
      
      allBills.forEach(bill => {
        // Check if bill has refunds array
        if (bill.refunds && bill.refunds.length > 0) {
          bill.refunds.forEach(refund => {
            refundEntries.push({
              refundedDate: refund.refundedAt || bill.date,
              patientId: bill.patientId || bill.uhId || 'N/A',
              patientName: bill.patientName || 'N/A',
              billNumber: bill.invoiceNumber || bill.billNo || 'N/A',
              receiptNumber: refund.receiptNumber || bill.receiptNumber || 'N/A',
              approvedBy: refund.approvedBy || refund.approvedByName || refund.refundedBy || refund.refundedByName || 'N/A',
              refundedBy: refund.refundedBy || refund.refundedByName || 'N/A',
              totalAmount: bill.amount || 0,
              paidAmount: bill.paidAmount || bill.amount || 0,
              discount: bill.discountAmount || bill.discount || 0,
              refundAmount: refund.amount || 0,
              comments: refund.refundReason || refund.notes || refund.refundNotes || ''
            });
          });
        } else if (bill.status === 'refunded' || bill.status === 'partially_refunded') {
          // If no refunds array but status indicates refund, create entry from bill level data
          refundEntries.push({
            refundedDate: bill.refundedAt || bill.date,
            patientId: bill.patientId || bill.uhId || 'N/A',
            patientName: bill.patientName || 'N/A',
            billNumber: bill.invoiceNumber || bill.billNo || 'N/A',
            receiptNumber: bill.receiptNumber || 'N/A',
            approvedBy: bill.refundedBy || bill.refundedByName || 'N/A',
            refundedBy: bill.refundedBy || bill.refundedByName || 'N/A',
            totalAmount: bill.amount || 0,
            paidAmount: bill.paidAmount || bill.amount || 0,
            discount: bill.discountAmount || bill.discount || 0,
            refundAmount: bill.refundedAmount || bill.refundAmount || 0,
            comments: bill.refundReason || bill.refundNotes || bill.notes || ''
          });
        }
      });
      
      // Sort by refunded date
      refundEntries.sort((a, b) => new Date(a.refundedDate) - new Date(b.refundedDate));
      
      setData(refundEntries);
      
      const totalRefundAmount = refundEntries.reduce((sum, entry) => sum + (entry.refundAmount || 0), 0);
      
      setSummary({
        totalRefunded: refundEntries.length,
        totalRefundAmount
      });
    } catch (error) {
      console.error('Error fetching refund report:', error);
      toast.error('Failed to fetch refund report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dateRangeText = dateRange.startDate && dateRange.endDate 
      ? `${dateRange.startDate} to ${dateRange.endDate}`
      : 'All';
    
    const csvData = [
      ['Refund Report', 'From', dateRangeText],
      ['', '', ''],
      ['S.No.', 'Refunded Date', 'Patient Name', 'Bill Number', 'Approved By', 'Refunded By', 'Total Amount', 'Paid Amount', 'Discount', 'Refund Amount', 'Comments']
    ];

    data.forEach((entry, index) => {
      csvData.push([
        index + 1,
        formatDate(entry.refundedDate),
        entry.patientName,
        entry.billNumber,
        entry.approvedBy,
        entry.refundedBy,
        (entry.totalAmount || 0).toFixed(2),
        (entry.paidAmount || 0).toFixed(2),
        (entry.discount || 0).toFixed(2),
        (entry.refundAmount || 0).toFixed(2),
        entry.comments
      ]);
    });

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
          <h1 className="text-lg font-bold text-slate-800">Refund Report</h1>
          <p className="text-xs text-slate-600 mt-1">
            {dateRange.startDate && dateRange.endDate 
              ? `From ${dateRange.startDate} to ${dateRange.endDate}`
              : 'View all refunded transactions'}
          </p>
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
                <p className="text-xs font-medium text-slate-600 uppercase">Total Refunded</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalRefunded}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Total Refund Amount</p>
                <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.totalRefundAmount.toFixed(2)}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-orange-500" />
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Refunded Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Approved By</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Refunded By</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Refund Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comments</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-center text-sm text-gray-500">
                      No refunded transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((entry, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{globalIndex + 1}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{formatDate(entry.refundedDate)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{entry.patientName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{entry.billNumber}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{entry.approvedBy}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{entry.refundedBy}</td>
                        <td className="px-4 py-2 text-sm text-slate-900">{(entry.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-slate-900">{(entry.paidAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-slate-900">{(entry.discount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm font-medium text-red-600">{(entry.refundAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{entry.comments}</td>
                      </tr>
                    );
                  })
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

export default RefundReport;
