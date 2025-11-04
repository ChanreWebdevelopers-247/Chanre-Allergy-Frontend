import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDownload, FaFilter, FaChartLine, FaBuilding } from 'react-icons/fa';
import { getFinancialReports } from '../../services/api';
import { toast } from 'react-toastify';

const RevenueReport = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchData();
  }, [reportType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        reportType,
        ...(reportType === 'custom' && dateRange.startDate && dateRange.endDate
          ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
          : {})
      };
      
      const response = await getFinancialReports(params);
      setData(response);
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      toast.error('Failed to fetch revenue report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) {
      toast.error('No data to export');
      return;
    }

    const csvData = [
      ['Revenue Report', '', '', '', '', '', ''],
      ['Report Type', reportType, '', '', '', '', ''],
      ['Generated On', new Date().toLocaleString(), '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Category', 'Revenue', 'Transaction Count', 'Percentage', '', '', ''],
      ['Consultation', data.summary?.consultationRevenue || 0, data.summary?.consultationCount || 0, `${data.breakdown?.consultation?.percentage || 0}%`, '', '', ''],
      ['Reassignment', data.summary?.reassignmentRevenue || 0, data.summary?.reassignmentCount || 0, `${data.breakdown?.reassignment?.percentage || 0}%`, '', '', ''],
      ['Lab/Test', data.summary?.labRevenue || 0, data.summary?.labCount || 0, `${data.breakdown?.lab?.percentage || 0}%`, '', '', ''],
      ['TOTAL', data.summary?.totalRevenue || 0, data.summary?.totalTransactions || 0, '100%', '', '', '']
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenue_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Report exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Report</h1>
        <p className="text-gray-600 mt-2">View revenue breakdown by category and time period</p>
        {user?.centerId && (
          <div className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <FaBuilding className="mr-1" />
              {user?.centerId?.name || 'Center'}
            </span>
          </div>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                reportType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {reportType === 'custom' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={fetchData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FaFilter className="mr-2" />
                Generate Report
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700 uppercase">Total Revenue</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">₹{data.summary?.totalRevenue?.toLocaleString() || 0}</p>
                </div>
                <FaChartLine className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-700 uppercase">Consultation</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">₹{data.summary?.consultationRevenue?.toLocaleString() || 0}</p>
                </div>
                <FaChartLine className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-700 uppercase">Reassignment</p>
                  <p className="text-3xl font-bold text-orange-900 mt-2">₹{data.summary?.reassignmentRevenue?.toLocaleString() || 0}</p>
                </div>
                <FaChartLine className="h-12 w-12 text-orange-500" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-700 uppercase">Lab/Test</p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">₹{data.summary?.labRevenue?.toLocaleString() || 0}</p>
                </div>
                <FaChartLine className="h-12 w-12 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Revenue Breakdown</h2>
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FaDownload className="mr-2" />
                Export
              </button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Consultation', ...data.breakdown?.consultation, color: 'blue' },
                { name: 'Reassignment', ...data.breakdown?.reassignment, color: 'orange' },
                { name: 'Lab/Test', ...data.breakdown?.lab, color: 'purple' }
              ].map((cat, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">{cat.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      ₹{cat.revenue?.toLocaleString() || 0} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`bg-${cat.color}-600 h-3 rounded-full`}
                      style={{ width: `${cat.percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueReport;

