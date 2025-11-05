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
    totalBills: 0
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
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
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
      
      // Filter bills with discounts
      const billsWithDiscount = response.bills?.filter(bill => {
        const discountAmount = bill.discountAmount || bill.discount || 0;
        const discountPercentage = bill.customData?.discountPercentage || 0;
        const billAmount = bill.amount || 0;
        const calculatedDiscount = discountPercentage > 0 ? (billAmount * discountPercentage / 100) : discountAmount;
        return calculatedDiscount > 0;
      }) || [];
      
      // Format data for display
      const formattedData = billsWithDiscount.map(bill => {
        const discountAmount = bill.discountAmount || bill.discount || 0;
        const discountPercentage = bill.customData?.discountPercentage || 0;
        const totalAmount = bill.amount || 0;
        const calculatedDiscount = discountPercentage > 0 ? (totalAmount * discountPercentage / 100) : discountAmount;
        const paidAmount = bill.paidAmount || (totalAmount - calculatedDiscount);
        
        return {
          ...bill,
          date: bill.date || bill.createdAt,
          patientId: bill.patientId || bill.uhId || 'N/A',
          patientName: bill.patientName || 'N/A',
          userName: bill.createdByName || bill.generatedByName || 'N/A',
          totalAmount,
          discount: calculatedDiscount,
          paidAmount,
          paymentStatus: bill.status === 'paid' ? 'Paid' : bill.status === 'pending' ? 'Pending' : bill.status === 'partially_paid' ? 'Partially Paid' : bill.status || 'Pending',
          remarks: bill.notes || bill.customData?.discountReason || bill.discountReason || ''
        };
      });
      
      setData(formattedData);
      
      const totalDiscount = formattedData.reduce((sum, bill) => sum + (bill.discount || 0), 0);
      
      setSummary({
        totalDiscount,
        totalBills: formattedData.length
      });
    } catch (error) {
      console.error('Error fetching discount report:', error);
      toast.error('Failed to fetch discount report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dateRangeText = dateRange.startDate && dateRange.endDate 
      ? `${dateRange.startDate} to ${dateRange.endDate}`
      : 'All';
    
    const csvData = [
      ['Discount Report', dateRangeText],
      ['', ''],
      ['S.No.', 'Date', 'Patient Id', 'Patient Name', 'User', 'Total Amount', 'Discount', 'Paid Amount', 'Payment Status', 'Remarks']
    ];

    data.forEach((bill, index) => {
      csvData.push([
        index + 1,
        formatDateTime(bill.date),
        bill.patientId,
        bill.patientName,
        bill.userName,
        (bill.totalAmount || 0).toFixed(2),
        (bill.discount || 0).toFixed(2),
        (bill.paidAmount || 0).toFixed(2),
        bill.paymentStatus,
        bill.remarks
      ]);
    });

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
          <p className="text-xs text-slate-600 mt-1">
            {dateRange.startDate && dateRange.endDate 
              ? `${dateRange.startDate} to ${dateRange.endDate}`
              : 'View all bills with discounts applied'}
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
                <p className="text-xs font-medium text-slate-600 uppercase">Total Discount Given</p>
                <p className="text-xl font-bold text-slate-800 mt-1">₹{summary.totalDiscount.toFixed(2)}</p>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Id</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-8 text-center text-sm text-gray-500">
                      No bills with discounts found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((bill, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                      <tr key={bill._id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{globalIndex + 1}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(bill.date)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{bill.patientId}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{bill.patientName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{bill.userName}</td>
                        <td className="px-4 py-2 text-sm text-slate-900">{(bill.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          {(bill.discount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900">{(bill.paidAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            bill.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                            bill.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600">{bill.remarks}</td>
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

