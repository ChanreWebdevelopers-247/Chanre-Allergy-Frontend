import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, RotateCcw, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

const CancellationAndRegeneratedReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    totalCancelledAmount: 0,
    totalRegeneratedAmount: 0,
    difference: 0
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
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      });
      
      const allBills = response.bills || [];
      
      // Find cancelled bills
      const cancelledBills = allBills.filter(bill => bill.status === 'cancelled');
      
      // Find regenerated bills (bills created after cancellation for same patient)
      const regeneratedBills = allBills.filter(bill => 
        bill.status !== 'cancelled' && bill.status !== 'refunded'
      );
      
      // Match cancelled bills with regenerated ones
      const matchedBills = [];
      
      cancelledBills.forEach(cancelled => {
        // Find regenerated bills for same patient created after cancellation
        const regenerated = regeneratedBills
          .filter(reg => {
            const samePatient = reg.patientId?.toString() === cancelled.patientId?.toString();
            const afterCancellation = cancelled.cancelledAt 
              ? new Date(reg.createdAt || reg.date) >= new Date(cancelled.cancelledAt)
              : new Date(reg.createdAt || reg.date) >= new Date(cancelled.date);
            const withinReasonableTime = Math.abs(
              new Date(reg.createdAt || reg.date) - new Date(cancelled.cancelledAt || cancelled.date)
            ) < 30 * 24 * 60 * 60 * 1000; // Within 30 days
            
            return samePatient && afterCancellation && withinReasonableTime;
          })
          .sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date))[0]; // Get earliest regenerated bill
        
        if (regenerated) {
          // Format service items
          const oldItems = cancelled.services?.map(s => s.name || s.serviceName || s.description || '').join(', ') || cancelled.description || 'N/A';
          const newItems = regenerated.services?.map(s => s.name || s.serviceName || s.description || '').join(', ') || regenerated.description || 'N/A';
          
          matchedBills.push({
            cancelledBill: {
              ...cancelled,
              orderDate: cancelled.createdAt || cancelled.date,
              canDate: cancelled.cancelledAt || cancelled.date,
              canBillNo: cancelled.invoiceNumber || cancelled.billNo || 'N/A',
              canBy: cancelled.cancelledByName || 'N/A',
              comments: cancelled.cancellationReason || '',
              oldItems
            },
            regeneratedBill: {
              ...regenerated,
              orderDate: regenerated.createdAt || regenerated.date,
              newBillNo: regenerated.invoiceNumber || regenerated.billNo || 'N/A',
              createdBy: regenerated.createdByName || 'N/A',
              newItems
            },
            patientName: cancelled.patientName,
            uhId: cancelled.uhId
          });
        }
      });
      
      setData(matchedBills);
      
      const totalCancelledAmount = matchedBills.reduce((sum, item) => sum + (item.cancelledBill.amount || 0), 0);
      const totalRegeneratedAmount = matchedBills.reduce((sum, item) => sum + (item.regeneratedBill.amount || 0), 0);
      const difference = totalRegeneratedAmount - totalCancelledAmount;
      
      setSummary({
        totalCancelledAmount,
        totalRegeneratedAmount,
        difference
      });
    } catch (error) {
      console.error('Error fetching cancellation and regenerated report:', error);
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Cancel & Regenerate Report', '', '', '', '', '', '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['Cancelled Bill Details', '', '', '', '', '', 'New Bill Details', '', '', '', ''],
      ['S.No.', 'Order Date', 'Can. Date', 'Can. Bill No', 'Can. By', 'Comments', 'Order Date', 'New Bill No', 'Created by', 'Old Items', 'New Items']
    ];

    data.forEach((item, index) => {
      csvData.push([
        index + 1,
        formatDate(item.cancelledBill.orderDate),
        formatDate(item.cancelledBill.canDate),
        item.cancelledBill.canBillNo,
        item.cancelledBill.canBy,
        item.cancelledBill.comments,
        formatDate(item.regeneratedBill.orderDate),
        item.regeneratedBill.newBillNo,
        item.regeneratedBill.createdBy,
        item.cancelledBill.oldItems,
        item.regeneratedBill.newItems
      ]);
    });

    csvData.push(['', '', '', '', '', '', '', '', '', '', '']);
    csvData.push(['Grand Total', summary.totalCancelledAmount.toFixed(2), '', '', '', '', summary.totalRegeneratedAmount.toFixed(2), '', '', '', '']);
    csvData.push(['Difference', summary.difference.toFixed(2), '', '', '', '', '', '', '', '', '']);
    csvData.push(['', '', '', '', '', '', '', '', '', '', '']);
    csvData.push(['## - Bill Amount inclusive of Discount', '', '', '', '', '', '', '', '', '', '']);
    csvData.push(['Printed at', new Date().toLocaleString(), 'by', user?.name || 'User', '', '', '', '', '', '', '']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cancel_regenerate_report_${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-lg font-bold text-slate-800">Cancel & Regenerate Report</h1>
          <p className="text-xs text-slate-600 mt-1">
            {dateRange.startDate && dateRange.endDate 
              ? `from ${dateRange.startDate} to ${dateRange.endDate}`
              : 'View bills that were cancelled and then regenerated'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-red-100">
            <p className="text-xs font-medium text-slate-600 uppercase">Total Cancelled Amount</p>
            <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.totalCancelledAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
            <p className="text-xs font-medium text-slate-600 uppercase">Total Regenerated Amount</p>
            <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.totalRegeneratedAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
            <p className="text-xs font-medium text-slate-600 uppercase">Difference</p>
            <p className={`text-xl font-bold mt-1 ${summary.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{summary.difference.toFixed(2)}
            </p>
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
                  <th colSpan="6" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-red-50 border-r-2 border-gray-300">
                    Cancelled Bill Details
                  </th>
                  <th colSpan="5" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">
                    New Bill Details
                  </th>
                </tr>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Can. Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Can. Bill No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Can. By</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r-2 border-gray-300">Comments</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Bill No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created by</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Old Items</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Items</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-center text-sm text-gray-500">
                      No cancelled and regenerated bills found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{globalIndex + 1}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{formatDate(item.cancelledBill.orderDate)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{formatDate(item.cancelledBill.canDate)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.cancelledBill.canBillNo}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.cancelledBill.canBy}</td>
                        <td className="px-4 py-2 text-sm text-slate-600 border-r-2 border-gray-300">{item.cancelledBill.comments}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{formatDate(item.regeneratedBill.orderDate)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.regeneratedBill.newBillNo}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.regeneratedBill.createdBy}</td>
                        <td className="px-4 py-2 text-sm text-slate-600 max-w-xs truncate" title={item.cancelledBill.oldItems}>
                          {item.cancelledBill.oldItems}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600 max-w-xs truncate" title={item.regeneratedBill.newItems}>
                          {item.regeneratedBill.newItems}
                        </td>
                      </tr>
                    );
                  })
                )}
                {paginatedData.length > 0 && (
                  <>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan="5" className="px-4 py-2 text-sm font-bold text-slate-900 text-right">Grand Total</td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-900 border-r-2 border-gray-300">
                        {(summary.totalCancelledAmount || 0).toFixed(2)}
                      </td>
                      <td colSpan="4" className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-900">
                        {(summary.totalRegeneratedAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan="5" className="px-4 py-2 text-sm font-bold text-slate-900 text-right">Difference</td>
                      <td className={`px-4 py-2 text-sm font-bold border-r-2 border-gray-300 ${summary.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.difference.toFixed(2)}
                      </td>
                      <td colSpan="5" className="px-4 py-2"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer */}
          {paginatedData.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-center">
                ## - Bill Amount inclusive of Discount
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">
                Printed at {new Date().toLocaleString()} by {user?.name || 'User'}
              </p>
            </div>
          )}
          
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

export default CancellationAndRegeneratedReport;
