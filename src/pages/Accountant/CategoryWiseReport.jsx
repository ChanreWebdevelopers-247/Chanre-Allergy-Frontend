import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, Tag, Building2 } from 'lucide-react';
import { getBillingData } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

const CategoryWiseReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    consultation: { count: 0, amount: 0 },
    superconsultant: { count: 0, amount: 0 },
    reassignment: { count: 0, amount: 0 },
    lab: { count: 0, amount: 0 }
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
      
      const bills = response.bills || [];
      setData(bills);
      
      const consultation = bills.filter(b => b.billType === 'Consultation' && b.status !== 'cancelled' && b.status !== 'refunded');
      const superconsultant = bills.filter(b => b.billType === 'Superconsultant' && b.status !== 'cancelled' && b.status !== 'refunded');
      const reassignment = bills.filter(b => b.billType === 'Reassignment' && b.status !== 'cancelled' && b.status !== 'refunded');
      const lab = bills.filter(b => b.billType === 'Lab/Test' && b.status !== 'cancelled' && b.status !== 'refunded');
      
      setSummary({
        consultation: {
          count: consultation.length,
          amount: consultation.reduce((sum, b) => sum + (b.amount || 0), 0)
        },
        superconsultant: {
          count: superconsultant.length,
          amount: superconsultant.reduce((sum, b) => sum + (b.amount || 0), 0)
        },
        reassignment: {
          count: reassignment.length,
          amount: reassignment.reduce((sum, b) => sum + (b.amount || 0), 0)
        },
        lab: {
          count: lab.length,
          amount: lab.reduce((sum, b) => sum + (b.amount || 0), 0)
        }
      });
    } catch (error) {
      console.error('Error fetching category wise report:', error);
      toast.error('Failed to fetch category wise report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Category Wise Report', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', ''],
      ['Date Range', `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, '', '', ''],
      ['', '', '', '', ''],
      ['Category', 'Bill Count', 'Total Amount', 'Average Amount', 'Percentage']
    ];

    const totalAmount = summary.consultation.amount + summary.superconsultant.amount + summary.reassignment.amount + summary.lab.amount;
    const totalCount = summary.consultation.count + summary.superconsultant.count + summary.reassignment.count + summary.lab.count;

    const categories = [
      { name: 'Consultation', ...summary.consultation },
      { name: 'Superconsultant', ...summary.superconsultant },
      { name: 'Reassignment', ...summary.reassignment },
      { name: 'Lab/Test', ...summary.lab }
    ];

    categories.forEach(cat => {
      const percentage = totalAmount > 0 ? ((cat.amount / totalAmount) * 100).toFixed(2) : 0;
      const avgAmount = cat.count > 0 ? (cat.amount / cat.count).toFixed(2) : 0;
      csvData.push([
        cat.name,
        cat.count,
        cat.amount,
        avgAmount,
        `${percentage}%`
      ]);
    });

    csvData.push(['', '', '', '', '']);
    csvData.push(['TOTAL', totalCount, totalAmount, '', '100%']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `category_wise_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Report exported successfully!');
  };

  const totalAmount = summary.consultation.amount + summary.superconsultant.amount + summary.reassignment.amount + summary.lab.amount;
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
          <h1 className="text-lg font-bold text-slate-800">Category Wise Report</h1>
          <p className="text-xs text-slate-600 mt-1">View billing data categorized by bill type</p>
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
          <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-6 w-6 text-blue-500" />
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                Consultation
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Bills</p>
            <p className="text-xl font-bold text-slate-800 mb-1">{summary.consultation.count}</p>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Amount</p>
            <p className="text-lg font-bold text-slate-800">₹{summary.consultation.amount.toLocaleString()}</p>
            {totalAmount > 0 && (
              <p className="text-xs text-slate-600 mt-1">
                {((summary.consultation.amount / totalAmount) * 100).toFixed(2)}% of total
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-teal-100">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-6 w-6 text-teal-500" />
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">
                Superconsultant
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Bills</p>
            <p className="text-xl font-bold text-slate-800 mb-1">{summary.superconsultant.count}</p>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Amount</p>
            <p className="text-lg font-bold text-slate-800">₹{summary.superconsultant.amount.toLocaleString()}</p>
            {totalAmount > 0 && (
              <p className="text-xs text-slate-600 mt-1">
                {((summary.superconsultant.amount / totalAmount) * 100).toFixed(2)}% of total
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-6 w-6 text-orange-500" />
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                Reassignment
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Bills</p>
            <p className="text-xl font-bold text-slate-800 mb-1">{summary.reassignment.count}</p>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Amount</p>
            <p className="text-lg font-bold text-slate-800">₹{summary.reassignment.amount.toLocaleString()}</p>
            {totalAmount > 0 && (
              <p className="text-xs text-slate-600 mt-1">
                {((summary.reassignment.amount / totalAmount) * 100).toFixed(2)}% of total
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-6 w-6 text-purple-500" />
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                Lab/Test
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Bills</p>
            <p className="text-xl font-bold text-slate-800 mb-1">{summary.lab.count}</p>
            <p className="text-xs font-medium text-slate-600 uppercase mb-1">Total Amount</p>
            <p className="text-lg font-bold text-slate-800">₹{summary.lab.amount.toLocaleString()}</p>
            {totalAmount > 0 && (
              <p className="text-xs text-slate-600 mt-1">
                {((summary.lab.amount / totalAmount) * 100).toFixed(2)}% of total
              </p>
            )}
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

        {/* Category Breakdown Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill Count</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Average Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { name: 'Consultation', ...summary.consultation, color: 'blue' },
                  { name: 'Superconsultant', ...summary.superconsultant, color: 'teal' },
                  { name: 'Reassignment', ...summary.reassignment, color: 'orange' },
                  { name: 'Lab/Test', ...summary.lab, color: 'purple' }
                ].map((cat, index) => {
                  const percentage = totalAmount > 0 ? ((cat.amount / totalAmount) * 100).toFixed(2) : 0;
                  const avgAmount = cat.count > 0 ? (cat.amount / cat.count).toFixed(2) : 0;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${cat.color}-100 text-${cat.color}-800`}>
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">{cat.count}</td>
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">₹{cat.amount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">₹{avgAmount}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`bg-${cat.color}-600 h-2 rounded-full`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-900">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-2 text-sm font-bold text-slate-900">TOTAL</td>
                  <td className="px-4 py-2 text-sm font-bold text-slate-900">
                    {summary.consultation.count + summary.superconsultant.count + summary.reassignment.count + summary.lab.count}
                  </td>
                  <td className="px-4 py-2 text-sm font-bold text-slate-900">₹{totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm font-bold text-slate-900">
                    ₹{((summary.consultation.count + summary.superconsultant.count + summary.reassignment.count + summary.lab.count) > 0 
                      ? (totalAmount / (summary.consultation.count + summary.superconsultant.count + summary.reassignment.count + summary.lab.count)).toFixed(2)
                      : 0)}
                  </td>
                  <td className="px-4 py-2 text-sm font-bold text-slate-900">100%</td>
                </tr>
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

export default CategoryWiseReport;

