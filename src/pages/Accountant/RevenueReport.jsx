import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, TrendingUp, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';

const RevenueReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalDiscount: 0,
    salesAfterDiscount: 0,
    totalSalesReturn: 0,
    salesAfterReturns: 0,
    cashCollection: 0,
    cashRefund: 0,
    cashCollectionAfterRefund: 0,
    totalDuePending: 0,
    oldDueCollection: 0,
    totalCollection: 0
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
  };

  const categorizeService = (bill) => {
    // Check services array first
    if (bill.services && bill.services.length > 0) {
      const service = bill.services[0];
      const serviceName = (service.name || service.serviceName || service.description || '').toLowerCase();
      
      if (serviceName.includes('investigation') || serviceName.includes('lab') || serviceName.includes('test') || bill.billType === 'Lab/Test') {
        return 'Investigation';
      }
      if (serviceName.includes('consultation') || bill.billType === 'Consultation' || bill.billType === 'Superconsultant') {
        return 'Consultation';
      }
      if (serviceName.includes('registration') || serviceName.includes('registration fee')) {
        return 'Registration Services';
      }
      if (serviceName.includes('x-ray') || serviceName.includes('xray')) {
        return 'X-RAY';
      }
      if (serviceName.includes('physiotherapy') || serviceName.includes('physio')) {
        return 'Physiotherapy';
      }
      if (serviceName.includes('procedure')) {
        return 'Procedure';
      }
      if (serviceName.includes('package')) {
        return 'Package';
      }
      if (serviceName.includes('service') && !serviceName.includes('registration')) {
        return 'Service';
      }
      if (serviceName.includes('radiology')) {
        return 'Radiology';
      }
      if (serviceName.includes('consumable')) {
        return 'Consumables';
      }
      if (serviceName.includes('ward')) {
        return 'Ward';
      }
    }
    
    // Fallback to bill type
    if (bill.billType === 'Lab/Test') {
      return 'Investigation';
    }
    if (bill.billType === 'Consultation' || bill.billType === 'Superconsultant') {
      return 'Consultation';
    }
    
    return 'Others';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      });
      
      const allBills = response.bills || [];
      
      // Group bills by category
      const categoryMap = new Map();
      let totalSales = 0;
      let totalDiscount = 0;
      let totalSalesReturn = 0;
      let cashCollection = 0;
      let cashRefund = 0;
      let totalDuePending = 0;
      let oldDueCollection = 0;
      
      // Define date range for filtering
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      
      allBills.forEach(bill => {
        const billDate = new Date(bill.date || bill.createdAt);
        
        // Check if bill is within date range
        const isInRange = !startDate || !endDate || (billDate >= startDate && billDate <= endDate);
        
        // Categorize bill
        const category = categorizeService(bill);
        
        // Initialize category if not exists
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { categoryName: category, quantity: 0, price: 0 });
        }
        
        const categoryInfo = categoryMap.get(category);
        
        // Only count non-cancelled, non-refunded bills for sales
        if (bill.status !== 'cancelled' && bill.status !== 'refunded' && isInRange) {
          categoryInfo.quantity += 1;
          categoryInfo.price += bill.amount || 0;
          totalSales += bill.amount || 0;
          totalDiscount += bill.discountAmount || bill.discount || 0;
          
          // Calculate cash collection from payment history
          if (bill.paymentHistory && bill.paymentHistory.length > 0) {
            bill.paymentHistory.forEach(payment => {
              if (payment.status === 'completed' || payment.status === 'paid' || !payment.status) {
                cashCollection += payment.amount || 0;
              }
            });
          } else if (bill.status === 'paid' || bill.status === 'completed') {
            cashCollection += bill.paidAmount || bill.amount || 0;
          }
          
          // Calculate due pending
          if (bill.balance > 0) {
            totalDuePending += bill.balance;
          }
        }
        
        // Calculate sales return (cancelled bills)
        if (bill.status === 'cancelled' && isInRange) {
          totalSalesReturn += bill.amount || 0;
        }
        
        // Calculate refunds
        if (bill.refunds && bill.refunds.length > 0) {
          bill.refunds.forEach(refund => {
            cashRefund += refund.amount || 0;
          });
        } else if (bill.status === 'refunded' && isInRange) {
          cashRefund += bill.refundedAmount || bill.refundAmount || 0;
        }
        
        // Calculate old due collection (bills created before date range but paid within range)
        if (bill.status === 'paid' || bill.status === 'completed') {
          if (billDate < startDate && isInRange) {
            // Old bill paid in current period
            if (bill.paymentHistory && bill.paymentHistory.length > 0) {
              bill.paymentHistory.forEach(payment => {
                const paymentDate = new Date(payment.date || payment.paidAt || payment.createdAt);
                if (paymentDate >= startDate && paymentDate <= endDate) {
                  oldDueCollection += payment.amount || 0;
                }
              });
            }
          }
        }
      });
      
      // Convert map to array and sort by price descending
      const categories = Array.from(categoryMap.values()).sort((a, b) => b.price - a.price);
      
      setCategoryData(categories);
      
      const salesAfterDiscount = totalSales - totalDiscount;
      const salesAfterReturns = salesAfterDiscount - totalSalesReturn;
      const cashCollectionAfterRefund = cashCollection - cashRefund;
      const totalCollection = cashCollectionAfterRefund + oldDueCollection;
      
      setSummary({
        totalSales,
        totalDiscount,
        salesAfterDiscount,
        totalSalesReturn,
        salesAfterReturns,
        cashCollection,
        cashRefund,
        cashCollectionAfterRefund,
        totalDuePending,
        oldDueCollection,
        totalCollection
      });
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      toast.error('Failed to fetch revenue report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dateRangeText = dateRange.startDate && dateRange.endDate 
      ? `${dateRange.startDate} to ${dateRange.endDate}`
      : 'All';
    
    const csvData = [
      ['Revenue Report', 'From', dateRangeText, 'By Category'],
      ['', '', '', ''],
      ['S.No.', 'Category Name', 'Quantity', 'Price'],
    ];

    categoryData.forEach((category, index) => {
      csvData.push([
        index + 1,
        category.categoryName,
        category.quantity,
        (category.price || 0).toFixed(2)
      ]);
    });

    csvData.push(['Total', '', '', summary.totalSales.toFixed(2)]);
    csvData.push(['', '', '', '']);
    csvData.push(['Sales Summary', 'for', dateRangeText, '']);
    csvData.push(['A.', 'Sales', summary.totalSales.toFixed(2), '']);
    csvData.push(['B.', 'Sales Discount', summary.totalDiscount.toFixed(2), '']);
    csvData.push(['C.', 'Sales After Discount (A - B)', summary.salesAfterDiscount.toFixed(2), '']);
    csvData.push(['D.', 'Total Sales Return', summary.totalSalesReturn.toFixed(2), '']);
    csvData.push(['E.', 'Sales After Returns (C - D)', summary.salesAfterReturns.toFixed(2), '']);
    csvData.push(['', '', '', '']);
    csvData.push(['Cash Collection Summary', 'for', dateRangeText, '']);
    csvData.push(['F.', 'Cash Collection', summary.cashCollection.toFixed(2), '']);
    csvData.push(['G.', 'Cash/Card Refund(Excluding Refund Pending)', summary.cashRefund.toFixed(2), '']);
    csvData.push(['H.', 'Cash/Card Collection After Refund', summary.cashCollectionAfterRefund.toFixed(2), '']);
    csvData.push(['', '', '', '']);
    csvData.push(['Total Due Pending', 'for', dateRangeText, summary.totalDuePending.toFixed(2)]);
    csvData.push(['', '', '', '']);
    csvData.push(['Old Due Collection', 'for', dateRangeText, '']);
    csvData.push(['I.', 'Old Due Collection', summary.oldDueCollection.toFixed(2), '']);
    csvData.push(['J.', 'Total Collection (H + I)', summary.totalCollection.toFixed(2), '']);
    csvData.push(['', '', '', '']);
    csvData.push(['Outstanding Collection', dateRangeText, '(J - L)', summary.totalCollection.toFixed(2)]);
    csvData.push(['', '', '', '']);
    csvData.push(['Printed at', formatDateTime(new Date()), 'by', user?.name || 'User']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Report exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const dateRangeText = dateRange.startDate && dateRange.endDate 
    ? `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`
    : 'All';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-800">Revenue Report</h1>
          <p className="text-xs text-slate-600 mt-1">
            {dateRange.startDate && dateRange.endDate 
              ? `From ${dateRangeText} By Category`
              : 'View revenue breakdown by category'}
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

        {/* Revenue by Category Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100 mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-md font-semibold text-slate-800">Revenue Report {dateRangeText} By Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500">
                      No revenue data found for the selected period.
                    </td>
                  </tr>
                ) : (
                  <>
                    {categoryData.map((category, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{index + 1}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{category.categoryName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{category.quantity}</td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          {(category.price || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="3" className="px-4 py-2 text-sm text-slate-700">Total</td>
                      <td className="px-4 py-2 text-sm font-bold text-green-700">
                        {summary.totalSales.toFixed(2)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Summary */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100 mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-md font-semibold text-slate-800">Sales Summary for {dateRangeText}</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">A.</span>
                  <span className="text-sm text-slate-600">Sales</span>
                  <span className="text-sm font-medium text-slate-800">{summary.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">B.</span>
                  <span className="text-sm text-slate-600">Sales Discount</span>
                  <span className="text-sm font-medium text-slate-800">{summary.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">C.</span>
                  <span className="text-sm text-slate-600">Sales After Discount (A - B)</span>
                  <span className="text-sm font-medium text-slate-800">{summary.salesAfterDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">D.</span>
                  <span className="text-sm text-slate-600">Total Sales Return</span>
                  <span className="text-sm font-medium text-red-600">{summary.totalSalesReturn.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-slate-600">E.</span>
                  <span className="text-sm text-slate-600">Sales After Returns (C - D)</span>
                  <span className="text-sm font-medium text-slate-800">{summary.salesAfterReturns.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Collection Summary */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100 mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-md font-semibold text-slate-800">Cash Collection Summary for {dateRangeText}</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">F.</span>
                  <span className="text-sm text-slate-600">Cash Collection</span>
                  <span className="text-sm font-medium text-green-600">{summary.cashCollection.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">G.</span>
                  <span className="text-sm text-slate-600">Cash/Card Refund(Excluding Refund Pending)</span>
                  <span className="text-sm font-medium text-red-600">{summary.cashRefund.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-slate-600">H.</span>
                  <span className="text-sm text-slate-600">Cash/Card Collection After Refund</span>
                  <span className="text-sm font-medium text-green-600">{summary.cashCollectionAfterRefund.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Due Pending */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100 mb-4">
          <div className="p-4">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-700">Total Due Pending for {dateRangeText}</span>
              <span className="text-sm font-bold text-orange-600">{summary.totalDuePending.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Old Due Collection */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100 mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-md font-semibold text-slate-800">Old Due Collection for {dateRangeText}</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">I.</span>
                <span className="text-sm text-slate-600 flex-1 ml-4">Old Due Collection</span>
                <span className="text-sm font-medium text-green-600">{summary.oldDueCollection.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm text-slate-600">J.</span>
                <span className="text-sm text-slate-600 flex-1 ml-4">Total Collection (H + I)</span>
                <span className="text-sm font-medium text-green-600">{summary.totalCollection.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding Collection */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100 mb-4">
          <div className="p-4">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-700">Outstanding Collection {dateRangeText} (J - L)</span>
              <span className="text-sm font-bold text-green-700">{summary.totalCollection.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
          <p className="text-xs text-slate-500 text-center">
            Printed at {formatDateTime(new Date())} by {user?.name || 'User'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RevenueReport;
