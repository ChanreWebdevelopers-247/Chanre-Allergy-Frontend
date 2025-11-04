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
    totalCancelled: 0,
    totalRegenerated: 0,
    cancelledAmount: 0,
    regeneratedAmount: 0
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
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      });
      
      const allBills = response.bills || [];
      
      // Find bills that were cancelled and then regenerated
      const cancelledBills = allBills.filter(bill => bill.status === 'cancelled');
      const regeneratedBills = allBills.filter(bill => 
        bill.status === 'paid' || bill.status === 'pending' || bill.status === 'partially_paid'
      );
      
      // Match cancelled bills with regenerated ones (same patient, similar date)
      const matchedBills = [];
      
      cancelledBills.forEach(cancelled => {
        const regenerated = regeneratedBills.find(reg => 
          reg.patientId?.toString() === cancelled.patientId?.toString() &&
          Math.abs(new Date(reg.date) - new Date(cancelled.date)) < 7 * 24 * 60 * 60 * 1000 // Within 7 days
        );
        
        if (regenerated) {
          matchedBills.push({
            cancelledBill: cancelled,
            regeneratedBill: regenerated,
            patientName: cancelled.patientName,
            uhId: cancelled.uhId
          });
        }
      });
      
      setData(matchedBills);
      
      const cancelledAmount = cancelledBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
      const regeneratedAmount = matchedBills.reduce((sum, item) => sum + (item.regeneratedBill.amount || 0), 0);
      
      setSummary({
        totalCancelled: cancelledBills.length,
        totalRegenerated: matchedBills.length,
        cancelledAmount,
        regeneratedAmount
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
      ['Cancellation and Regenerated Report', '', '', '', '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['Patient Name', 'UH ID', 'Cancelled Invoice', 'Cancelled Amount', 'Cancelled Date', 'Regenerated Invoice', 'Regenerated Amount', 'Regenerated Date', 'Net Difference']
    ];

    data.forEach(item => {
      const netDiff = (item.regeneratedBill.amount || 0) - (item.cancelledBill.amount || 0);
      csvData.push([
        item.patientName || 'N/A',
        item.uhId || 'N/A',
        item.cancelledBill.invoiceNumber || item.cancelledBill.billNo || 'N/A',
        item.cancelledBill.amount || 0,
        new Date(item.cancelledBill.date).toLocaleDateString(),
        item.regeneratedBill.invoiceNumber || item.regeneratedBill.billNo || 'N/A',
        item.regeneratedBill.amount || 0,
        new Date(item.regeneratedBill.date).toLocaleDateString(),
        netDiff
      ]);
    });

    csvData.push(['', '', '', '', '', '', '', '', '']);
    csvData.push(['Total Cancelled Bills', summary.totalCancelled, '', '', '', '', '', '', '']);
    csvData.push(['Total Regenerated Bills', summary.totalRegenerated, '', '', '', '', '', '', '']);
    csvData.push(['Total Cancelled Amount', summary.cancelledAmount, '', '', '', '', '', '', '']);
    csvData.push(['Total Regenerated Amount', summary.regeneratedAmount, '', '', '', '', '', '', '']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cancellation_regenerated_report_${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-lg font-bold text-slate-800">Cancellation and Regenerated Report</h1>
          <p className="text-xs text-slate-600 mt-1">View bills that were cancelled and then regenerated</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-red-100">
            <p className="text-xs font-medium text-slate-600 uppercase">Cancelled Bills</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalCancelled}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
            <p className="text-xs font-medium text-slate-600 uppercase">Regenerated Bills</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalRegenerated}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-orange-100">
            <p className="text-xs font-medium text-slate-600 uppercase">Cancelled Amount</p>
            <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.cancelledAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
            <p className="text-xs font-medium text-slate-600 uppercase">Regenerated Amount</p>
            <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.regeneratedAmount.toLocaleString()}</p>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UH ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cancelled Invoice</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cancelled Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Regenerated Invoice</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Regenerated Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Difference</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">
                      No cancelled and regenerated bills found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                    const netDiff = (item.regeneratedBill.amount || 0) - (item.cancelledBill.amount || 0);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-slate-900">{item.patientName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.uhId}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {item.cancelledBill.invoiceNumber || item.cancelledBill.billNo || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-red-600">
                          ₹{(item.cancelledBill.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {item.regeneratedBill.invoiceNumber || item.regeneratedBill.billNo || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          ₹{(item.regeneratedBill.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          <span className={netDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ₹{netDiff.toLocaleString()}
                          </span>
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
      </div>
    </div>
  );
};

export default CancellationAndRegeneratedReport;
