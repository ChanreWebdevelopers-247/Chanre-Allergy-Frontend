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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Discount Report - Fetching data with dateRange:', dateRange);
      
      const response = await getBillingData({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        // Don't pass pagination params to get all bills
      });
      
      console.log('🔍 Discount Report - API Response:', {
        billsCount: response.bills?.length || 0,
        firstFewBills: response.bills?.slice(0, 3)
      });
      
      if (!response || !response.bills) {
        console.warn('⚠️ Discount Report - No bills in response:', response);
        setData([]);
        setSummary({ totalDiscount: 0, totalBills: 0 });
        return;
      }
      
      const allBills = response.bills || [];
      console.log('🔍 Discount Report - Total bills received:', allBills.length);
      
      // Log first bill structure to debug
      if (allBills.length > 0) {
        console.log('🔍 Discount Report - Sample bill structure:', JSON.stringify(allBills[0], null, 2));
        console.log('🔍 Discount Report - Sample bill discount fields:', {
          discountAmount: allBills[0].discountAmount,
          discount: allBills[0].discount,
          customData: allBills[0].customData,
          services: allBills[0].services,
          amount: allBills[0].amount,
          paidAmount: allBills[0].paidAmount
        });
      }
      
      // Filter bills with discounts - check multiple discount fields and calculations
      const billsWithDiscount = allBills.filter(bill => {
        // Check all possible discount field names
        const discountAmount = bill.discountAmount || bill.discount || bill.discounts || 0;
        const discountPercentage = bill.customData?.discountPercentage || bill.discountPercentage || 0;
        const billAmount = bill.amount || 0;
        const paidAmount = bill.paidAmount || 0;
        
        // Calculate discount if percentage is provided
        const calculatedDiscount = discountPercentage > 0 ? (billAmount * discountPercentage / 100) : discountAmount;
        
        // Also check if there's a discount based on difference between amount and what should be paid
        // Some invoices might have discount stored as difference: amount - (actual charged amount)
        // Check if customData has discount information
        const customDiscount = bill.customData?.discount || bill.customData?.discountAmount || bill.customData?.discounts || 0;
        
        // Check if the discount is stored in the invoice-level discount field (singular or plural)
        const invoiceDiscount = bill.discount || bill.discounts || 0;
        
        // Check if services total differs from invoice amount (indicates discount)
        let servicesTotal = 0;
        if (bill.services && bill.services.length > 0) {
          servicesTotal = bill.services.reduce((sum, service) => {
            return sum + (service.charges || service.amount || service.unitPrice || 0);
          }, 0);
        }
        
        // If services total is greater than invoice amount, there's a discount
        const impliedDiscountFromServices = servicesTotal > billAmount ? servicesTotal - billAmount : 0;
        
        // Calculate total possible discount from all sources
        const totalDiscount = Math.max(
          calculatedDiscount,
          discountAmount,
          customDiscount,
          invoiceDiscount,
          impliedDiscountFromServices
        );
        
        // Also check if there's a discount by comparing amount vs a calculated grand total
        // If customData has a grandTotal that's less than amount, that's a discount
        if (bill.customData?.grandTotal && bill.customData.grandTotal < billAmount) {
          const impliedDiscount = billAmount - bill.customData.grandTotal;
          if (impliedDiscount > 0) {
            console.log(`✅ Found discount via grandTotal for bill ${bill.invoiceNumber || bill.billNo}:`, impliedDiscount);
            return true;
          }
        }
        
        // Check if services total is greater than bill amount (indicates discount was applied)
        // This is the most common case: services add up to more than the invoice amount
        if (servicesTotal > billAmount && servicesTotal > 0 && billAmount > 0) {
          const serviceDiscount = servicesTotal - billAmount;
          if (serviceDiscount > 0.01) { // Use 0.01 to account for rounding
            console.log(`✅ Found discount via services total for bill ${bill.invoiceNumber || bill.billNo}:`, {
              servicesTotal,
              billAmount,
              discount: serviceDiscount
            });
            return true;
          }
        }
        
        // Also check if there's a discount in the invoice structure
        // Sometimes discount is stored as: amount - (amount after discount)
        // If paidAmount is less than amount, that could indicate a discount was applied
        if (paidAmount > 0 && paidAmount < billAmount) {
          const differenceDiscount = billAmount - paidAmount;
          if (differenceDiscount > 0.01) { // Use 0.01 to account for rounding
            console.log(`✅ Found discount via paidAmount difference for bill ${bill.invoiceNumber || bill.billNo}:`, differenceDiscount);
            return true;
          }
        }
        
        // Check if bill has any discount applied (explicit discount fields)
        if (totalDiscount > 0.01) { // Use 0.01 to account for rounding
          console.log(`✅ Found discount for bill ${bill.invoiceNumber || bill.billNo}:`, {
            discountAmount,
            invoiceDiscount,
            customDiscount,
            calculatedDiscount,
            impliedDiscountFromServices,
            totalDiscount
          });
          return true;
        }
        
        return false;
      });
      
      console.log('🔍 Discount Report - Bills with discount found:', billsWithDiscount.length);
      
      // Format data for display
      const formattedData = billsWithDiscount.map(bill => {
        // Check all possible discount field names (singular and plural)
        const discountAmount = bill.discountAmount || bill.discount || bill.discounts || 0;
        const discountPercentage = bill.customData?.discountPercentage || bill.discountPercentage || 0;
        const customDiscount = bill.customData?.discount || bill.customData?.discountAmount || bill.customData?.discounts || 0;
        const invoiceDiscount = bill.discount || bill.discounts || 0;
        const totalAmount = bill.amount || 0;
        const paidAmount = bill.paidAmount || 0;
        
        // Calculate services total
        let servicesTotal = 0;
        if (bill.services && bill.services.length > 0) {
          servicesTotal = bill.services.reduce((sum, service) => {
            return sum + (service.charges || service.amount || service.unitPrice || 0);
          }, 0);
        }
        
        // Calculate actual discount amount from all possible sources
        let calculatedDiscount = 0;
        let discountType = '';
        
        // Priority 1: Check if services total differs from invoice amount (most reliable)
        if (servicesTotal > totalAmount && servicesTotal > 0 && totalAmount > 0) {
          calculatedDiscount = servicesTotal - totalAmount;
          discountType = 'Fixed';
        }
        // Priority 2: Check if there's a grandTotal in customData that indicates discount
        else if (bill.customData?.grandTotal && bill.customData.grandTotal < totalAmount) {
          calculatedDiscount = totalAmount - bill.customData.grandTotal;
          discountType = 'Fixed';
        }
        // Priority 3: Check percentage discount
        else if (discountPercentage > 0) {
          calculatedDiscount = totalAmount * discountPercentage / 100;
          discountType = `${discountPercentage}%`;
        }
        // Priority 4: Check fixed discount amounts (take the largest)
        else {
          calculatedDiscount = Math.max(discountAmount || 0, customDiscount || 0, invoiceDiscount || 0);
          discountType = 'Fixed';
        }
        
        // Priority 5: If still no discount found but paidAmount is less than amount, calculate difference
        if (calculatedDiscount === 0 && paidAmount > 0 && paidAmount < totalAmount) {
          calculatedDiscount = totalAmount - paidAmount;
          discountType = 'Fixed';
        }
        
        // Priority 6: If still no discount, check if amount doesn't match a calculated grand total
        // This handles cases where discount is applied but not explicitly stored
        if (calculatedDiscount === 0) {
          // Try to find discount from invoice structure
          // If there's a tax field, sometimes grandTotal = amount - discount - tax
          // But we'll use the explicit discount fields first
          const explicitDiscount = Math.max(
            discountAmount || 0,
            customDiscount || 0,
            invoiceDiscount || 0
          );
          if (explicitDiscount > 0) {
            calculatedDiscount = explicitDiscount;
            discountType = 'Fixed';
          }
        }
        
        const finalPaidAmount = paidAmount || (totalAmount - calculatedDiscount);
        
        // Extract discount reason from multiple possible fields
        const discountReason = 
          bill.customData?.discountReason || 
          bill.discountReason || 
          bill.customData?.remarks ||
          bill.notes || 
          bill.customData?.notes ||
          bill.customData?.discountNotes ||
          '';
        
        return {
          ...bill,
          date: bill.date || bill.createdAt,
          billNumber: bill.invoiceNumber || bill.billNo || 'N/A',
          patientId: bill.patientId || bill.uhId || 'N/A',
          patientName: bill.patientName || 'N/A',
          userName: bill.createdByName || bill.generatedByName || 'N/A',
          totalAmount,
          discount: calculatedDiscount,
          discountType,
          discountPercentage: discountPercentage > 0 ? discountPercentage : null,
          discountAmount: calculatedDiscount > 0 ? calculatedDiscount : null,
          paidAmount: finalPaidAmount,
          paymentStatus: bill.status === 'paid' ? 'Paid' : bill.status === 'completed' ? 'Paid' : bill.status === 'pending' ? 'Pending' : bill.status === 'partially_paid' ? 'Partially Paid' : bill.status || 'Pending',
          remarks: discountReason
        };
      });
      
      // Sort by date (newest first)
      formattedData.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log('🔍 Discount Report - Formatted data count:', formattedData.length);
      console.log('🔍 Discount Report - Sample formatted bill:', formattedData[0]);
      
      setData(formattedData);
      
      const totalDiscount = formattedData.reduce((sum, bill) => sum + (bill.discount || 0), 0);
      
      setSummary({
        totalDiscount,
        totalBills: formattedData.length
      });
      
      console.log('🔍 Discount Report - Final summary:', {
        totalBills: formattedData.length,
        totalDiscount
      });
    } catch (error) {
      console.error('❌ Error fetching discount report:', error);
      toast.error('Failed to fetch discount report: ' + (error.message || 'Unknown error'));
      setData([]);
      setSummary({ totalDiscount: 0, totalBills: 0 });
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
      ['S.No.', 'Date', 'Bill Number', 'Patient Id', 'Patient Name', 'User', 'Total Amount', 'Discount Type', 'Discount', 'Paid Amount', 'Payment Status', 'Remarks']
    ];

    data.forEach((bill, index) => {
      csvData.push([
        index + 1,
        formatDateTime(bill.date),
        bill.billNumber,
        bill.patientId,
        bill.patientName,
        bill.userName,
        (bill.totalAmount || 0).toFixed(2),
        bill.discountType || 'Fixed',
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Id</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-8 text-center text-sm text-gray-500">
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
                        <td className="px-4 py-2 text-sm text-slate-700 font-medium">{bill.billNumber}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{bill.patientId}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{bill.patientName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{bill.userName}</td>
                        <td className="px-4 py-2 text-sm text-slate-900">{(bill.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {bill.discountType || 'Fixed'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          {(bill.discount || 0).toFixed(2)}
                          {bill.discountPercentage && (
                            <span className="text-xs text-slate-500 ml-1">({bill.discountPercentage}%)</span>
                          )}
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
                        <td className="px-4 py-2 text-sm text-slate-600">{bill.remarks || 'N/A'}</td>
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

