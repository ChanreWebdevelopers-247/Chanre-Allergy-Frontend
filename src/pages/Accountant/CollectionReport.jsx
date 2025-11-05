import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, DollarSign, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

const CollectionReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [consultationType, setConsultationType] = useState('both'); // 'OP', 'IP', 'both'
  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalTransactions: 0,
    // Payment method breakdowns
    amountCollectedInCash: 0,
    amountCollectedInCard: 0,
    amountCollectedInUPI: 0,
    amountCollectedInNEFT: 0,
    duesCollectedInCash: 0,
    duesCollectedInCard: 0,
    duesCollectedInUPI: 0,
    duesCollectedInNEFT: 0,
    totalRefund: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours).padStart(2, '0');
    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const formatPayMode = (paymentMethod, reference) => {
    if (!paymentMethod) return 'N/A';
    const methodMap = {
      'cash': 'Cash',
      'credit_card': 'CARD',
      'debit_card': 'CARD',
      'upi': 'UPI',
      'net_banking': 'NET BANKING',
      'neft': 'NEFT/IMPS',
      'imps': 'NEFT/IMPS',
      'cheque': 'CHEQUE',
      'nft': 'NFT',
      'other': 'OTHER'
    };
    const method = methodMap[paymentMethod.toLowerCase()] || paymentMethod.toUpperCase();
    if (reference) {
      return `${method} ${reference}`;
    }
    return method;
  };

  const getPaymentMethodType = (paymentMethod) => {
    if (!paymentMethod) return 'other';
    const method = paymentMethod.toLowerCase();
    if (method === 'cash') return 'cash';
    if (method === 'credit_card' || method === 'debit_card') return 'card';
    if (method === 'upi') return 'upi';
    if (method === 'neft' || method === 'imps' || method === 'net_banking') return 'neft';
    return 'other';
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationType, currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        consultationType: consultationType === 'both' ? undefined : consultationType
      });
      
      const allBills = response.bills || [];
      
      // Define date range for filtering
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Extract individual payment transactions from payment history
      const paymentTransactions = [];
      
      // Payment method summary counters
      let amountCollectedInCash = 0;
      let amountCollectedInCard = 0;
      let amountCollectedInUPI = 0;
      let amountCollectedInNEFT = 0;
      let duesCollectedInCash = 0;
      let duesCollectedInCard = 0;
      let duesCollectedInUPI = 0;
      let duesCollectedInNEFT = 0;
      let totalRefund = 0;
      
      allBills.forEach(bill => {
        // Check consultation type filter
        const billConsultationType = bill.consultationType || 'OP';
        if (consultationType !== 'both' && billConsultationType !== consultationType) {
          return;
        }

        const billDate = new Date(bill.date || bill.createdAt);
        const isOldBill = startDate && billDate < startDate;

        // Track refunds - check multiple sources
        if (bill.refunds && bill.refunds.length > 0) {
          bill.refunds.forEach(refund => {
            totalRefund += refund.amount || 0;
          });
        } else if (bill.refundedAmount && bill.refundedAmount > 0) {
          totalRefund += bill.refundedAmount;
        } else if (bill.refundAmount && bill.refundAmount > 0) {
          totalRefund += bill.refundAmount;
        } else if (bill.status === 'refunded' || bill.status === 'partially_refunded') {
          totalRefund += bill.refundedAmount || bill.refundAmount || 0;
        } else if (bill.status === 'cancelled' && bill.paidAmount > 0) {
          // If bill is cancelled and was paid, calculate refund
          const potentialRefund = bill.paidAmount - (bill.balance || 0);
          if (potentialRefund > 0) {
            totalRefund += potentialRefund;
          }
        }

        // If bill has payment history, extract individual payments
        if (bill.paymentHistory && bill.paymentHistory.length > 0) {
          bill.paymentHistory.forEach((payment, index) => {
            // Only include completed payments
            if (payment.status === 'completed' || payment.status === 'paid' || !payment.status) {
              const paymentDate = new Date(payment.date || payment.paidAt || payment.createdAt || bill.date);
              const isInRange = !startDate || !endDate || (paymentDate >= startDate && paymentDate <= endDate);
              
              if (isInRange) {
                const paymentMethod = payment.paymentMethod || bill.paymentMethod;
                const methodType = getPaymentMethodType(paymentMethod);
                const amount = payment.amount || 0;
                
                // Track payment method breakdown
                if (isOldBill) {
                  // Old due collection
                  if (methodType === 'cash') duesCollectedInCash += amount;
                  else if (methodType === 'card') duesCollectedInCard += amount;
                  else if (methodType === 'upi') duesCollectedInUPI += amount;
                  else if (methodType === 'neft') duesCollectedInNEFT += amount;
                } else {
                  // Current bill collection
                  if (methodType === 'cash') amountCollectedInCash += amount;
                  else if (methodType === 'card') amountCollectedInCard += amount;
                  else if (methodType === 'upi') amountCollectedInUPI += amount;
                  else if (methodType === 'neft') amountCollectedInNEFT += amount;
                }
                
                paymentTransactions.push({
                  date: paymentDate,
                  invoiceNumber: bill.invoiceNumber || bill.billNo || 'N/A',
                  patientName: bill.patientName || 'N/A',
                  category: bill.billType || 'N/A',
                  uhId: bill.uhId || 'N/A',
                  payMode: formatPayMode(paymentMethod, payment.reference || payment.paymentReference),
                  amount: amount,
                  consultationType: billConsultationType,
                  paymentMethodType: methodType,
                  isOldDue: isOldBill
                });
              }
            }
          });
        } else if (bill.status === 'paid' || bill.status === 'completed') {
          // If no payment history but bill is paid, create a single transaction entry
          const billConsultationType = bill.consultationType || 'OP';
          if (consultationType === 'both' || billConsultationType === consultationType) {
            const paymentDate = new Date(bill.date || bill.createdAt || bill.paidAt);
            const isInRange = !startDate || !endDate || (paymentDate >= startDate && paymentDate <= endDate);
            
            if (isInRange) {
              const paymentMethod = bill.paymentMethod;
              const methodType = getPaymentMethodType(paymentMethod);
              const amount = bill.paidAmount || bill.amount || 0;
              
              // Track payment method breakdown
              if (isOldBill) {
                // Old due collection
                if (methodType === 'cash') duesCollectedInCash += amount;
                else if (methodType === 'card') duesCollectedInCard += amount;
                else if (methodType === 'upi') duesCollectedInUPI += amount;
                else if (methodType === 'neft') duesCollectedInNEFT += amount;
              } else {
                // Current bill collection
                if (methodType === 'cash') amountCollectedInCash += amount;
                else if (methodType === 'card') amountCollectedInCard += amount;
                else if (methodType === 'upi') amountCollectedInUPI += amount;
                else if (methodType === 'neft') amountCollectedInNEFT += amount;
              }
              
              paymentTransactions.push({
                date: paymentDate,
                invoiceNumber: bill.invoiceNumber || bill.billNo || 'N/A',
                patientName: bill.patientName || 'N/A',
                category: bill.billType || 'N/A',
                uhId: bill.uhId || 'N/A',
                payMode: formatPayMode(paymentMethod, bill.paymentReference),
                amount: amount,
                consultationType: billConsultationType,
                paymentMethodType: methodType,
                isOldDue: isOldBill
              });
            }
          }
        }
      });
      
      // Sort by date
      paymentTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setData(paymentTransactions);
      
      const totalCollected = paymentTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);
      
      setSummary({
        totalCollected,
        totalTransactions: paymentTransactions.length,
        amountCollectedInCash,
        amountCollectedInCard,
        amountCollectedInUPI,
        amountCollectedInNEFT,
        duesCollectedInCash,
        duesCollectedInCard,
        duesCollectedInUPI,
        duesCollectedInNEFT,
        totalRefund
      });
    } catch (error) {
      console.error('Error fetching collection report:', error);
      toast.error('Failed to fetch collection report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dateRangeText = dateRange.startDate && dateRange.endDate 
      ? `${dateRange.startDate} to ${dateRange.endDate}`
      : 'All';
    const consultationText = consultationType === 'both' ? 'Both IP & OP' : consultationType;
    
    const csvData = [
      ['Daily Collection', dateRangeText, 'for', consultationText],
      ['', '', '', ''],
      ['S.No.', 'Date', 'Invoice Number', 'Patient Name', 'Category', 'UHID', 'Pay Mode', 'Amount']
    ];

    data.forEach((txn, index) => {
      csvData.push([
        index + 1,
        formatDateTime(txn.date),
        txn.invoiceNumber,
        txn.patientName,
        txn.category,
        txn.uhId,
        txn.payMode,
        (txn.amount || 0).toFixed(2)
      ]);
    });

    // Add summary section
    csvData.push(['', '', '', '', '', '', '', '']);
    csvData.push(['Summary', '', '', '', '', '', '', '']);
    csvData.push([
      'Amount Collected In Cash',
      'Amount Collected In Card',
      'Amount Collected In UPI',
      'Amount Collected In NEFT/IMPS',
      'Dues Collected In Cash',
      'Dues Collected In Card',
      'Dues Collected In UPI',
      'Dues Collected In NEFT/IMPS',
      'Total Amount Collected By Card',
      'Total Amount By Cash',
      'Total Amount By UPI',
      'Total Amount By NEFT/IMPS',
      'Refund(Total)',
      'Total (Exclud Refu)'
    ]);
    csvData.push([
      summary.amountCollectedInCash.toFixed(2),
      summary.amountCollectedInCard.toFixed(2),
      summary.amountCollectedInUPI.toFixed(2),
      summary.amountCollectedInNEFT.toFixed(2),
      summary.duesCollectedInCash.toFixed(2),
      summary.duesCollectedInCard.toFixed(2),
      summary.duesCollectedInUPI.toFixed(2),
      summary.duesCollectedInNEFT.toFixed(2),
      summary.amountCollectedInCard.toFixed(2),
      (summary.amountCollectedInCash + summary.duesCollectedInCash).toFixed(2),
      (summary.amountCollectedInUPI + summary.duesCollectedInUPI).toFixed(2),
      (summary.amountCollectedInNEFT + summary.duesCollectedInNEFT).toFixed(2),
      summary.totalRefund.toFixed(2),
      (summary.totalCollected - summary.totalRefund).toFixed(2)
    ]);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `daily_collection_report_${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-lg font-bold text-slate-800">Daily Collection</h1>
          <p className="text-xs text-slate-600 mt-1">
            {dateRange.startDate && dateRange.endDate 
              ? `${dateRange.startDate} to ${dateRange.endDate}`
              : 'View all collected payments'}
            {' '}for {consultationType === 'both' ? 'Both IP & OP' : consultationType}
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
          <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Total Collected</p>
                <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.totalCollected.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Total Transactions</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalTransactions}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Consultation Type</label>
              <select
                value={consultationType}
                onChange={(e) => setConsultationType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Both IP & OP</option>
                <option value="OP">OP</option>
                <option value="IP">IP</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  fetchData();
                }}
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice Number</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UHID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pay Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                      No collection data found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((txn, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{globalIndex + 1}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(txn.date)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{txn.invoiceNumber}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{txn.patientName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{txn.category}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{txn.uhId}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{txn.payMode}</td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          {(txn.amount || 0).toFixed(2)}
                        </td>
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

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100 mt-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-md font-semibold text-slate-800">Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Collected In Cash</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Collected In Card</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Collected In UPI</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Collected In NEFT/IMPS</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dues Collected In Cash</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dues Collected In Card</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dues Collected In UPI</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dues Collected In NEFT/IMPS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-green-600">{summary.amountCollectedInCash.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-green-600">{summary.amountCollectedInCard.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-green-600">{summary.amountCollectedInUPI.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-green-600">{summary.amountCollectedInNEFT.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-blue-600">{summary.duesCollectedInCash.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-blue-600">{summary.duesCollectedInCard.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-blue-600">{summary.duesCollectedInUPI.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-blue-600">{summary.duesCollectedInNEFT.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-slate-600">Total Amount Collected By Card</p>
                <p className="text-sm font-semibold text-green-600">{summary.amountCollectedInCard.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Total Amount By Cash</p>
                <p className="text-sm font-semibold text-green-600">{(summary.amountCollectedInCash + summary.duesCollectedInCash).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Total Amount By UPI</p>
                <p className="text-sm font-semibold text-green-600">{(summary.amountCollectedInUPI + summary.duesCollectedInUPI).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Total Amount By NEFT/IMPS</p>
                <p className="text-sm font-semibold text-green-600">{(summary.amountCollectedInNEFT + summary.duesCollectedInNEFT).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Refund(Total)</p>
                <p className="text-sm font-semibold text-red-600">{summary.totalRefund.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Total (Exclud Refu)</p>
                <p className="text-sm font-semibold text-green-700">{(summary.totalCollected - summary.totalRefund).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionReport;

