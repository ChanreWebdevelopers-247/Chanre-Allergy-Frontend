import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, Percent, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

const DiscountReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    totalDiscount: 0,
    totalBills: 0,
    averageDiscount: 0
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
      
      // Filter bills with discounts
      const billsWithDiscount = response.bills?.filter(bill => 
        (bill.discount && bill.discount > 0) || 
        (bill.customData?.discountPercentage && bill.customData.discountPercentage > 0)
      ) || [];
      
      setData(billsWithDiscount);
      
      const totalDiscount = billsWithDiscount.reduce((sum, bill) => {
        const discountAmount = bill.discount || 0;
        const discountPercentage = bill.customData?.discountPercentage || 0;
        const billAmount = bill.amount || 0;
        
        if (discountPercentage > 0) {
          return sum + (billAmount * discountPercentage / 100);
        }
        return sum + discountAmount;
      }, 0);
      
      const averageDiscount = billsWithDiscount.length > 0 ? totalDiscount / billsWithDiscount.length : 0;
      
      setSummary({
        totalDiscount,
        totalBills: billsWithDiscount.length,
        averageDiscount
      });
    } catch (error) {
      console.error('Error fetching discount report:', error);
      toast.error('Failed to fetch discount report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Discount Report', '', '', '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Invoice Number', 'Patient Name', 'UH ID', 'Bill Type', 'Original Amount', 'Discount Amount', 'Final Amount', 'Date']
    ];

    data.forEach(bill => {
      const discountAmount = bill.discount || 0;
      const discountPercentage = bill.customData?.discountPercentage || 0;
      const billAmount = bill.amount || 0;
      const finalDiscount = discountPercentage > 0 ? (billAmount * discountPercentage / 100) : discountAmount;
      const finalAmount = billAmount - finalDiscount;
      
      csvData.push([
        bill.invoiceNumber || bill.billNo || 'N/A',
        bill.patientName || 'N/A',
        bill.uhId || 'N/A',
        bill.billType || 'N/A',
        billAmount,
        finalDiscount,
        finalAmount,
        new Date(bill.date).toLocaleDateString()
      ]);
    });

    csvData.push(['', '', '', '', '', '', '', '']);
    csvData.push(['Total Bills with Discount', summary.totalBills, '', '', '', '', '', '']);
    csvData.push(['Total Discount Given', summary.totalDiscount, '', '', '', '', '', '']);
    csvData.push(['Average Discount', summary.averageDiscount.toFixed(2), '', '', '', '', '', '']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `discount_report_${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-lg font-bold text-slate-800">Discount Report</h1>
          <p className="text-xs text-slate-600 mt-1">View all bills with discounts applied</p>
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
          <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Total Discount Given</p>
                <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <Percent className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Bills with Discount</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalBills}</p>
              </div>
              <Percent className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Average Discount</p>
                <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.averageDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <Percent className="h-8 w-8 text-purple-500" />
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Final Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                      No bills with discounts found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((bill) => {
                    const discountAmount = bill.discount || 0;
                    const discountPercentage = bill.customData?.discountPercentage || 0;
                    const billAmount = bill.amount || 0;
                    const finalDiscount = discountPercentage > 0 ? (billAmount * discountPercentage / 100) : discountAmount;
                    const finalAmount = billAmount - finalDiscount;
                    
                    return (
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
                        <td className="px-4 py-2 text-sm text-slate-900">
                          ₹{billAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          {discountPercentage > 0 ? `${discountPercentage}%` : ''} ₹{finalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-slate-900">
                          ₹{finalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600">
                          {new Date(bill.date).toLocaleDateString()}
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

export default DiscountReport;

