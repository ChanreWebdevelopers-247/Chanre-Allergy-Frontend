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
      
      // Apply date range filtering if dates are provided (frontend safety check)
      let filteredBills = allBills;
      if (dateRange.startDate || dateRange.endDate) {
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        filteredBills = allBills.filter(bill => {
          const billDate = new Date(bill.date || bill.createdAt || bill.generatedAt);
          const matchesStart = !startDate || billDate >= startDate;
          const matchesEnd = !endDate || billDate <= endDate;
          return matchesStart && matchesEnd;
        });
        console.log('🔍 Discount Report - Bills after date filtering:', filteredBills.length);
      }
      
      // Log first bill structure to debug
      if (filteredBills.length > 0) {
        console.log('🔍 Discount Report - Sample bill structure:', JSON.stringify(filteredBills[0], null, 2));
        console.log('🔍 Discount Report - Sample bill discount fields:', {
          discountAmount: filteredBills[0].discountAmount,
          discountPercentage: filteredBills[0].discountPercentage,
          discountReason: filteredBills[0].discountReason,
          customData: filteredBills[0].customData,
          services: filteredBills[0].services,
          amount: filteredBills[0].amount,
          paidAmount: filteredBills[0].paidAmount
        });
      }
      
      // Filter bills with discounts - check multiple discount fields and calculations
      const billsWithDiscount = filteredBills.filter((bill, index) => {
        const billAmount = bill.amount || 0;
        const paidAmount = bill.paidAmount || 0;
        
        // Check all possible discount field names from all billing types
        // Regular billing fields
        const discountAmount = bill.discountAmount || bill.discount || 0;
        const discountPercentage = bill.discountPercentage || 0;
        const discountReason = bill.discountReason || '';
        
        // Reassignment/Superconsultant billing fields (from customData)
        const customDiscountAmount = bill.customData?.discountAmount || bill.customData?.discount || 0;
        const customDiscountPercentage = bill.customData?.discountPercentage || 0;
        const customDiscountReason = bill.customData?.discountReason || bill.customData?.discountNotes || '';
        
        // Combined discount values (check all sources)
        const totalDiscountAmount = discountAmount || customDiscountAmount || 0;
        const totalDiscountPercentage = discountPercentage || customDiscountPercentage || 0;
        const totalDiscountReason = discountReason || customDiscountReason || '';
        
        // Log first few bills for debugging
        if (index < 3) {
          console.log(`🔍 Checking bill ${index + 1}/${filteredBills.length}:`, {
            billType: bill.billType || 'Unknown',
            invoiceNumber: bill.invoiceNumber || bill.billNo,
            discountAmount: bill.discountAmount,
            discount: bill.discount,
            discountPercentage: bill.discountPercentage,
            discountReason: bill.discountReason,
            customData: bill.customData,
            customDiscountAmount,
            customDiscountPercentage,
            customDiscountReason,
            servicesCount: bill.services?.length || 0,
            amount: bill.amount,
            paidAmount: bill.paidAmount
          });
        }
        
        // Priority 1: Check explicit discount fields (from all sources)
        if (totalDiscountAmount > 0) {
          console.log(`✅ Found explicit discount for bill ${bill.invoiceNumber || bill.billNo} (${bill.billType || 'Unknown'}):`, {
            discountAmount: totalDiscountAmount,
            source: bill.discountAmount ? 'discountAmount' : bill.customData?.discountAmount ? 'customData.discountAmount' : 'discount'
          });
          return true;
        }
        
        // Priority 2: Check discountPercentage (from all sources)
        if (totalDiscountPercentage > 0 && billAmount > 0) {
          const calculatedDiscount = billAmount * totalDiscountPercentage / 100;
          if (calculatedDiscount > 0) {
            console.log(`✅ Found discountPercentage for bill ${bill.invoiceNumber || bill.billNo} (${bill.billType || 'Unknown'}):`, {
              percentage: totalDiscountPercentage,
              calculatedDiscount,
              source: bill.discountPercentage ? 'discountPercentage' : 'customData.discountPercentage'
            });
            return true;
          }
        }
        
        // Priority 3: Check discountReason (indicates discount was applied)
        if (totalDiscountReason && totalDiscountReason.trim().length > 0) {
          console.log(`✅ Found discountReason for bill ${bill.invoiceNumber || bill.billNo} (${bill.billType || 'Unknown'}):`, totalDiscountReason);
          return true;
        }
        
        // Priority 4: Check if services total differs from invoice amount (indicates discount)
        let servicesTotal = 0;
        let servicesWithDiscount = [];
        
        // Check customData.servicesTotal first (for Lab/Test billing)
        if (bill.customData?.servicesTotal && bill.customData.servicesTotal > 0) {
          servicesTotal = bill.customData.servicesTotal;
        } else if (bill.customData?.subTotal && bill.customData.subTotal > 0) {
          // Use subTotal as servicesTotal if available
          servicesTotal = bill.customData.subTotal;
        } else if (bill.services && bill.services.length > 0) {
          // Calculate from services array
          bill.services.forEach(service => {
            const serviceAmount = service.charges || service.amount || service.unitPrice || 0;
            servicesTotal += serviceAmount;
            
            // Check if individual service has discount
            if (service.discountAmount > 0 || service.discount > 0 || service.discountPercentage > 0) {
              servicesWithDiscount.push({
                name: service.name || service.serviceName,
                discountAmount: service.discountAmount || service.discount || 0,
                discountPercentage: service.discountPercentage || 0
              });
            }
          });
        }
        
        // If any individual service has discount
        if (servicesWithDiscount.length > 0) {
          console.log(`✅ Found discounts in individual services for bill ${bill.invoiceNumber || bill.billNo} (${bill.billType || 'Unknown'}):`, servicesWithDiscount);
          return true;
        }
        
        // If services total is greater than bill amount, there's a discount
        if (servicesTotal > billAmount && servicesTotal > 0 && billAmount > 0) {
          const serviceDiscount = servicesTotal - billAmount;
          if (serviceDiscount > 0) {
            console.log(`✅ Found discount via services total for bill ${bill.invoiceNumber || bill.billNo} (${bill.billType || 'Unknown'}):`, {
              servicesTotal,
              billAmount,
              discount: serviceDiscount,
              source: bill.customData?.servicesTotal ? 'customData.servicesTotal' : bill.customData?.subTotal ? 'customData.subTotal' : 'services array'
            });
            return true;
          }
        }
        
        // Priority 5: Check if customData has a grandTotal that's less than amount
        if (bill.customData?.grandTotal && bill.customData.grandTotal < billAmount && billAmount > 0) {
          const impliedDiscount = billAmount - bill.customData.grandTotal;
          if (impliedDiscount > 0) {
            console.log(`✅ Found discount via grandTotal for bill ${bill.invoiceNumber || bill.billNo} (${bill.billType || 'Unknown'}):`, impliedDiscount);
            return true;
          }
        }
        
        return false;
      });
      
      console.log('🔍 Discount Report - Bills with discount found:', billsWithDiscount.length);
      
      // Format data for display
      const formattedData = billsWithDiscount.map(bill => {
        const totalAmount = bill.amount || 0;
        const paidAmount = bill.paidAmount || 0;
        
        // Get discount fields from all billing types (same as filter logic)
        // Regular billing fields
        const discountAmount = bill.discountAmount || bill.discount || 0;
        const discountPercentage = bill.discountPercentage || 0;
        const discountReason = bill.discountReason || '';
        
        // Reassignment/Superconsultant billing fields (from customData)
        const customDiscountAmount = bill.customData?.discountAmount || bill.customData?.discount || 0;
        const customDiscountPercentage = bill.customData?.discountPercentage || 0;
        const customDiscountReason = bill.customData?.discountReason || bill.customData?.discountNotes || '';
        
        // Combined discount values (check all sources)
        const totalDiscountAmount = discountAmount || customDiscountAmount || 0;
        const totalDiscountPercentage = discountPercentage || customDiscountPercentage || 0;
        const totalDiscountReason = discountReason || customDiscountReason || '';
        
        // Calculate services total and check for individual service discounts
        let servicesTotal = 0;
        let totalServiceDiscount = 0;
        
        // Check customData.servicesTotal first (for Lab/Test billing)
        if (bill.customData?.servicesTotal && bill.customData.servicesTotal > 0) {
          servicesTotal = bill.customData.servicesTotal;
        } else if (bill.customData?.subTotal && bill.customData.subTotal > 0) {
          // Use subTotal as servicesTotal if available
          servicesTotal = bill.customData.subTotal;
        } else if (bill.services && bill.services.length > 0) {
          // Calculate from services array
          bill.services.forEach(service => {
            const serviceAmount = service.charges || service.amount || service.unitPrice || 0;
            servicesTotal += serviceAmount;
            
            // Accumulate discounts from individual services
            const serviceDiscount = service.discountAmount || service.discount || 0;
            const serviceDiscountPercent = service.discountPercentage || 0;
            if (serviceDiscount > 0) {
              totalServiceDiscount += serviceDiscount;
            } else if (serviceDiscountPercent > 0 && serviceAmount > 0) {
              totalServiceDiscount += serviceAmount * serviceDiscountPercent / 100;
            }
          });
        }
        
        // Calculate actual discount amount (same priority as filter logic)
        let calculatedDiscount = 0;
        let discountType = '';
        
        // Priority 1: Explicit discountAmount from all sources
        if (totalDiscountAmount > 0) {
          calculatedDiscount = totalDiscountAmount;
          discountType = 'Fixed';
        }
        // Priority 2: Discounts from individual services
        else if (totalServiceDiscount > 0) {
          calculatedDiscount = totalServiceDiscount;
          discountType = 'Fixed';
        }
        // Priority 3: Percentage discount from all sources
        else if (totalDiscountPercentage > 0 && totalAmount > 0) {
          calculatedDiscount = totalAmount * totalDiscountPercentage / 100;
          discountType = `${totalDiscountPercentage}%`;
        }
        // Priority 4: Services total vs invoice amount
        else if (servicesTotal > totalAmount && servicesTotal > 0 && totalAmount > 0) {
          calculatedDiscount = servicesTotal - totalAmount;
          discountType = 'Fixed';
        }
        // Priority 5: grandTotal difference
        else if (bill.customData?.grandTotal && bill.customData.grandTotal < totalAmount) {
          calculatedDiscount = totalAmount - bill.customData.grandTotal;
          discountType = 'Fixed';
        }
        
        const finalPaidAmount = paidAmount > 0 ? paidAmount : (totalAmount - calculatedDiscount);
        
        // Extract discount reason from all sources with better priority
        let finalDiscountReason = '';
        
        // Priority 1: Check discountReason field (most reliable)
        if (totalDiscountReason && totalDiscountReason.trim().length > 0) {
          finalDiscountReason = totalDiscountReason.trim();
        }
        // Priority 2: Check customData discountReason or discountNotes
        else if (bill.customData?.discountReason && bill.customData.discountReason.trim().length > 0) {
          finalDiscountReason = bill.customData.discountReason.trim();
        }
        else if (bill.customData?.discountNotes && bill.customData.discountNotes.trim().length > 0) {
          finalDiscountReason = bill.customData.discountNotes.trim();
        }
        // Priority 3: Check billing notes (for Lab/Test)
        else if (bill.notes && bill.notes.trim().length > 0) {
          finalDiscountReason = bill.notes.trim();
        }
        else if (bill.customData?.notes && bill.customData.notes.trim().length > 0) {
          finalDiscountReason = bill.customData.notes.trim();
        }
        // Priority 4: Check customData remarks
        else if (bill.customData?.remarks && bill.customData.remarks.trim().length > 0) {
          finalDiscountReason = bill.customData.remarks.trim();
        }
        
        // If still no reason found but discount exists, try to infer from discount percentage
        if (!finalDiscountReason && totalDiscountPercentage > 0) {
          // Map common discount percentages to reasons
          const percentageReasons = {
            10: 'Staff Discount',
            20: 'Senior Citizen Discount',
            15: 'Student Discount',
            5: 'Referral Discount',
            100: 'Charity Case'
          };
          finalDiscountReason = percentageReasons[totalDiscountPercentage] || `Discount (${totalDiscountPercentage}%)`;
        }
        
        // Use uhId for patientId (prioritize uhId over MongoDB ObjectId)
        const displayPatientId = bill.uhId || (bill.patientId && typeof bill.patientId === 'string' && bill.patientId.length === 24 ? '' : bill.patientId) || '';
        
        // Extract user name from multiple sources
        let displayUserName = '';
        if (bill.createdByName && bill.createdByName !== 'N/A') {
          displayUserName = bill.createdByName;
        } else if (bill.generatedByName && bill.generatedByName !== 'N/A') {
          displayUserName = bill.generatedByName;
        } else if (bill.paymentHistory && bill.paymentHistory.length > 0) {
          // Try to get from payment history (check all entries, not just first)
          for (const payment of bill.paymentHistory) {
            if (payment.processedByName && payment.processedByName !== 'N/A') {
              displayUserName = payment.processedByName;
              break;
            } else if (payment.createdByName && payment.createdByName !== 'N/A') {
              displayUserName = payment.createdByName;
              break;
            } else if (payment.processedBy) {
              // If name not populated, try to get from ID (though this shouldn't happen if backend works)
              const processedById = typeof payment.processedBy === 'object' ? payment.processedBy._id || payment.processedBy.id : payment.processedBy;
              if (processedById) {
                // This is a fallback - ideally backend should populate names
                console.log(`⚠️ Payment has processedBy ID but no name: ${processedById}`);
              }
            }
          }
        }
        
        // Final fallback: if still empty, try to get from any user field on the bill
        if (!displayUserName && bill.generatedBy) {
          const generatedById = typeof bill.generatedBy === 'object' ? bill.generatedBy._id || bill.generatedBy.id : bill.generatedBy;
          if (generatedById) {
            console.log(`⚠️ Bill has generatedBy ID but no name: ${generatedById}`);
          }
        }
        
        // Format patient name (remove N/A)
        const displayPatientName = bill.patientName && bill.patientName !== 'N/A' ? bill.patientName : '';
        
        // Format bill number (remove N/A)
        const displayBillNumber = bill.invoiceNumber || bill.billNo || '';
        
        // Format remarks (remove N/A if empty)
        const displayRemarks = finalDiscountReason && finalDiscountReason !== 'N/A' ? finalDiscountReason : '';
        
        return {
          ...bill,
          date: bill.date || bill.createdAt,
          billNumber: displayBillNumber,
          billType: bill.billType || 'Unknown', // Include bill type for identification
          patientId: displayPatientId,
          patientName: displayPatientName,
          userName: displayUserName,
          totalAmount,
          discount: calculatedDiscount,
          discountType: discountType || 'Fixed',
          discountPercentage: totalDiscountPercentage > 0 ? totalDiscountPercentage : null,
          discountAmount: calculatedDiscount > 0 ? calculatedDiscount : null,
          paidAmount: finalPaidAmount,
          paymentStatus: bill.status === 'paid' ? 'Paid' : bill.status === 'completed' ? 'Paid' : bill.status === 'pending' ? 'Pending' : bill.status === 'partially_paid' ? 'Partially Paid' : bill.status || 'Pending',
          remarks: displayRemarks
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
      ['S.No.', 'Date', 'Bill Number', 'Bill Type', 'Patient Id', 'Patient Name', 'User', 'Total Amount', 'Discount Type', 'Discount', 'Paid Amount', 'Payment Status', 'Remarks']
    ];

    data.forEach((bill, index) => {
      const discountAmount = (bill.discount || 0).toFixed(2);
      const discountPercent = bill.discountPercentage 
        ? bill.discountPercentage 
        : bill.totalAmount > 0 
          ? ((bill.discount || 0) / bill.totalAmount * 100).toFixed(2)
          : '0';
      const discountDisplay = `${discountAmount}(${discountPercent}%)`;
      
      csvData.push([
        index + 1,
        formatDateTime(bill.date),
        bill.billNumber,
        bill.billType || 'Unknown',
        bill.patientId,
        bill.patientName,
        bill.userName,
        (bill.totalAmount || 0).toFixed(2),
        bill.discountType || 'Fixed',
        discountDisplay,
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
      <div className="w-full">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-800">Discount Report</h1>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {dateRange.startDate && dateRange.endDate 
                ? `${dateRange.startDate} to ${dateRange.endDate}`
                : 'View all bills with discounts applied'}
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
          <div className="bg-white p-3 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Total Discount Given</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">₹{summary.totalDiscount.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <Percent className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-600 uppercase">Bills with Discount</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{summary.totalBills}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Percent className="h-4 w-4 text-blue-600" />
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
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Date</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Bill Number</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Bill Type</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Patient Id</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Patient Name</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">User</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Total Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Discount Type</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Discount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Paid Amount</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Payment Status</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="border border-gray-200 px-2 py-3 text-center text-[11px] text-gray-500">
                      No bills with discounts found for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((bill, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                      <tr key={bill._id || index} className="hover:bg-blue-50/50 transition-colors">
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{globalIndex + 1}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{formatDateTime(bill.date)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700 font-medium">{bill.billNumber || '-'}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            bill.billType === 'Consultation' ? 'bg-blue-100 text-blue-800' :
                            bill.billType === 'Reassignment' ? 'bg-purple-100 text-purple-800' :
                            bill.billType === 'Superconsultant' ? 'bg-indigo-100 text-indigo-800' :
                            bill.billType === 'Lab/Test' ? 'bg-green-100 text-green-800' :
                            bill.billType === 'Slit Therapy' || bill.billType === 'slit_therapy' ? 'bg-pink-100 text-pink-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.billType || 'Unknown'}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{bill.patientId || '-'}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{bill.patientName || '-'}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">{bill.userName || '-'}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-900 font-medium">{(bill.totalAmount || 0).toFixed(2)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800 rounded">
                            {bill.discountType || 'Fixed'}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-green-600">
                          {(() => {
                            const discountAmount = (bill.discount || 0).toFixed(2);
                            const discountPercent = bill.discountPercentage 
                              ? bill.discountPercentage 
                              : bill.totalAmount > 0 
                                ? ((bill.discount || 0) / bill.totalAmount * 100).toFixed(2)
                                : '0';
                            return `${discountAmount}(${discountPercent}%)`;
                          })()}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-900 font-medium">{(bill.paidAmount || 0).toFixed(2)}</td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-700">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            bill.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                            bill.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.paymentStatus}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-[11px] text-slate-600">{bill.remarks || '-'}</td>
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

export default DiscountReport;

