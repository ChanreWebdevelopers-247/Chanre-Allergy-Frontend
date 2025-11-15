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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Refund Report - Fetching data with dateRange:', dateRange);
      
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        // Don't pass pagination params to get all bills
      });
      
      console.log('🔍 Refund Report - API Response:', {
        billsCount: response.bills?.length || 0,
        firstFewBills: response.bills?.slice(0, 3)
      });
      
      if (!response || !response.bills) {
        console.warn('⚠️ Refund Report - No bills in response:', response);
        setData([]);
        setSummary({ totalRefunded: 0, totalRefundAmount: 0 });
        return;
      }
      
      const allBills = response.bills || [];
      console.log('🔍 Refund Report - Total bills received:', allBills.length);
      
      // Parse date range for filtering
      let startDate = null;
      let endDate = null;
      if (dateRange.startDate) {
        startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (dateRange.endDate) {
        endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Log first bill structure to debug
      if (allBills.length > 0) {
        console.log('🔍 Refund Report - Sample bill structure:', JSON.stringify(allBills[0], null, 2));
        console.log('🔍 Refund Report - Sample bill refund fields:', {
          refunds: allBills[0].refunds,
          status: allBills[0].status,
          refundedAmount: allBills[0].refundedAmount,
          refundAmount: allBills[0].refundAmount
        });
      }
      
      // Extract individual refund entries
      const refundEntries = [];
      
      allBills.forEach(bill => {
        // Check if bill has refunds array (most reliable source)
        if (bill.refunds && bill.refunds.length > 0) {
          console.log(`✅ Found refunds array for bill ${bill.invoiceNumber || bill.billNo}:`, bill.refunds.length);
          bill.refunds.forEach(refund => {
            const refundDate = refund.refundedAt || refund.date || refund.createdAt || bill.date || bill.cancelledAt;
            const refundDateObj = new Date(refundDate);
            
            // Filter by date range if dates are provided
            const isInRange = !startDate || !endDate || 
              (refundDateObj >= startDate && refundDateObj <= endDate);
            
            if (isInRange) {
              refundEntries.push({
                refundedDate: refundDate,
                patientId: bill.patientId || bill.uhId || 'N/A',
                patientName: bill.patientName || 'N/A',
                billNumber: bill.invoiceNumber || bill.billNo || 'N/A',
                receiptNumber: refund.receiptNumber || bill.receiptNumber || 'N/A',
                approvedBy: refund.approvedByName || refund.approvedBy || refund.refundedByName || refund.refundedBy || bill.refundedByName || bill.cancelledByName || bill.cancelledBy || 'N/A',
                refundedBy: refund.refundedByName || refund.refundedBy || bill.refundedByName || bill.refundedBy || bill.cancelledByName || bill.cancelledBy || 'N/A',
                totalAmount: bill.amount || 0,
                paidAmount: bill.paidAmount || bill.amount || 0,
                discount: bill.discountAmount || bill.discount || bill.discounts || 0,
                refundAmount: refund.amount || 0,
                comments: refund.refundReason || refund.notes || refund.refundNotes || refund.reason || bill.cancellationReason || ''
              });
            }
          });
        } 
        // Check if bill has refundedAmount > 0 (even if status is 'cancelled' or 'refunded')
        else if ((bill.refundedAmount && bill.refundedAmount > 0) || (bill.refundAmount && bill.refundAmount > 0)) {
          const refundAmt = bill.refundedAmount || bill.refundAmount || 0;
          const refundDate = bill.refundedAt || bill.cancelledAt || bill.date || bill.createdAt;
          const refundDateObj = new Date(refundDate);
          
          // Filter by date range if dates are provided
          const isInRange = !startDate || !endDate || 
            (refundDateObj >= startDate && refundDateObj <= endDate);
          
          if (isInRange) {
            console.log(`✅ Found refundedAmount for bill ${bill.invoiceNumber || bill.billNo}:`, refundAmt, 'Status:', bill.status);
            refundEntries.push({
              refundedDate: refundDate,
              patientId: bill.patientId || bill.uhId || 'N/A',
              patientName: bill.patientName || 'N/A',
              billNumber: bill.invoiceNumber || bill.billNo || 'N/A',
              receiptNumber: bill.receiptNumber || 'N/A',
              approvedBy: bill.refundedByName || bill.refundedBy || bill.cancelledByName || bill.cancelledBy || 'N/A',
              refundedBy: bill.refundedByName || bill.refundedBy || bill.cancelledByName || bill.cancelledBy || 'N/A',
              totalAmount: bill.amount || 0,
              paidAmount: bill.paidAmount || bill.amount || 0,
              discount: bill.discountAmount || bill.discount || bill.discounts || 0,
              refundAmount: refundAmt,
              comments: bill.refundReason || bill.refundNotes || bill.cancellationReason || bill.notes || ''
            });
          }
        }
        // Check if bill status is refunded or partially_refunded
        else if (bill.status === 'refunded' || bill.status === 'partially_refunded') {
          const refundDate = bill.refundedAt || bill.cancelledAt || bill.date || bill.createdAt;
          const refundDateObj = new Date(refundDate);
          
          // Filter by date range if dates are provided
          const isInRange = !startDate || !endDate || 
            (refundDateObj >= startDate && refundDateObj <= endDate);
          
          if (isInRange) {
            console.log(`✅ Found refund status for bill ${bill.invoiceNumber || bill.billNo}:`, bill.status);
            refundEntries.push({
              refundedDate: refundDate,
              patientId: bill.patientId || bill.uhId || 'N/A',
              patientName: bill.patientName || 'N/A',
              billNumber: bill.invoiceNumber || bill.billNo || 'N/A',
              receiptNumber: bill.receiptNumber || 'N/A',
              approvedBy: bill.refundedByName || bill.refundedBy || bill.cancelledByName || bill.cancelledBy || 'N/A',
              refundedBy: bill.refundedByName || bill.refundedBy || bill.cancelledByName || bill.cancelledBy || 'N/A',
              totalAmount: bill.amount || 0,
              paidAmount: bill.paidAmount || bill.amount || 0,
              discount: bill.discountAmount || bill.discount || bill.discounts || 0,
              refundAmount: bill.refundedAmount || bill.refundAmount || 0,
              comments: bill.refundReason || bill.refundNotes || bill.cancellationReason || bill.notes || ''
            });
          }
        }
        // Check if bill is cancelled and has paidAmount > 0 (might indicate refund)
        else if (bill.status === 'cancelled' && bill.paidAmount > 0) {
          // Calculate refund as the difference between paid amount and any balance
          // If bill was cancelled and fully paid, refund should be the paid amount
          const potentialRefund = bill.paidAmount - (bill.balance || 0);
          if (potentialRefund > 0) {
            const refundDate = bill.refundedAt || bill.cancelledAt || bill.date || bill.createdAt;
            const refundDateObj = new Date(refundDate);
            
            // Filter by date range if dates are provided
            const isInRange = !startDate || !endDate || 
              (refundDateObj >= startDate && refundDateObj <= endDate);
            
            if (isInRange) {
              console.log(`✅ Found potential refund for cancelled bill ${bill.invoiceNumber || bill.billNo}:`, potentialRefund);
              refundEntries.push({
                refundedDate: refundDate,
                patientId: bill.patientId || bill.uhId || 'N/A',
                patientName: bill.patientName || 'N/A',
                billNumber: bill.invoiceNumber || bill.billNo || 'N/A',
                receiptNumber: bill.receiptNumber || 'N/A',
                approvedBy: bill.refundedByName || bill.refundedBy || bill.cancelledByName || bill.cancelledBy || 'N/A',
                refundedBy: bill.refundedByName || bill.refundedBy || bill.cancelledByName || bill.cancelledBy || 'N/A',
                totalAmount: bill.amount || 0,
                paidAmount: bill.paidAmount || bill.amount || 0,
                discount: bill.discountAmount || bill.discount || bill.discounts || 0,
                refundAmount: potentialRefund,
                comments: bill.refundReason || bill.refundNotes || bill.cancellationReason || bill.notes || ''
              });
            }
          }
        }
      });
      
      console.log('🔍 Refund Report - Refund entries found:', refundEntries.length);
      console.log('🔍 Refund Report - Sample refund entry:', refundEntries[0]);
      
      // Sort by refunded date
      refundEntries.sort((a, b) => new Date(a.refundedDate) - new Date(b.refundedDate));
      
      setData(refundEntries);
      
      const totalRefundAmount = refundEntries.reduce((sum, entry) => sum + (entry.refundAmount || 0), 0);
      
      setSummary({
        totalRefunded: refundEntries.length,
        totalRefundAmount
      });
      
      console.log('🔍 Refund Report - Final summary:', {
        totalRefunded: refundEntries.length,
        totalRefundAmount
      });
    } catch (error) {
      console.error('❌ Error fetching refund report:', error);
      toast.error('Failed to fetch refund report: ' + (error.message || 'Unknown error'));
      setData([]);
      setSummary({ totalRefunded: 0, totalRefundAmount: 0 });
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
      <div className="w-full">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-800">Refund Report</h1>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {dateRange.startDate && dateRange.endDate 
                ? `From ${dateRange.startDate} to ${dateRange.endDate}`
                : 'View all refunded transactions'}
            </p>
          </div>
          {user?.centerId && (
            <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200">
              <Building2 className="mr-1 h-2.5 w-2.5" />
              {user?.centerId?.name || 'Center'}
            </span>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 mt-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Total Refunded</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{summary.totalRefunded}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <RotateCcw className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Total Refund Amount</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">₹{summary.totalRefundAmount.toFixed(2)}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <RotateCcw className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 mb-3 rounded-lg shadow-sm border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                Apply
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
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">S.No.</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Refunded Date</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Patient Name</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Bill Number</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Approved By</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Refunded By</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Total Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Paid Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Discount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Refund Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Comments</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="border border-gray-200 px-2 py-3 text-center text-[11px] text-gray-500">
                      No refunded transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((entry, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                      <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{globalIndex + 1}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{formatDate(entry.refundedDate)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{entry.patientName}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700 font-medium">{entry.billNumber}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{entry.approvedBy}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{entry.refundedBy}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-900 font-medium">{(entry.totalAmount || 0).toFixed(2)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-900 font-medium">{(entry.paidAmount || 0).toFixed(2)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-900 font-medium">{(entry.discount || 0).toFixed(2)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-red-600">{(entry.refundAmount || 0).toFixed(2)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-600">{entry.comments}</td>
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

export default RefundReport;
