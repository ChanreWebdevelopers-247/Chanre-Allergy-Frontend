import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, RefreshCw, CalendarRange, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';
import { getBillingData, getAllCentersForBooking } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (value) => {
  if (!value) return 'All Dates';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
};

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return 'N/A';

  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  let hours = dt.getHours();
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const seconds = String(dt.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours || 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${day}-${month}-${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

// Format date for CSV export (Excel-compatible format: YYYY-MM-DD HH:MM:SS)
// Using ISO-like format that Excel recognizes, or tab-prefixed text format
const formatDateForCSV = (date) => {
  if (!date) return 'N/A';
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return 'N/A';

  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  let hours = dt.getHours();
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const seconds = String(dt.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours || 12;
  const formattedHours = String(hours).padStart(2, '0');
  // Use format that Excel recognizes: YYYY-MM-DD HH:MM:SS AM/PM
  // Format as text by using a format Excel can parse
  return `${year}-${month}-${day} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

const formatPrintedTimestamp = (date) => {
  if (!date) return 'N/A';
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return 'N/A';
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  let hours = dt.getHours();
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const seconds = String(dt.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours || 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

const PAYMENT_METHOD_MAP = {
  cash: 'Cash',
  credit_card: 'Card',
  debit_card: 'Card',
  card: 'Card',
  upi: 'UPI',
  neft: 'NEFT/IMPS',
  imps: 'NEFT/IMPS',
  net_banking: 'NET BANKING',
  cheque: 'Cheque',
  other: 'Other'
};

const getPaymentBucket = (method) => {
  const normalized = (method || '').toLowerCase();
  if (normalized.includes('cash')) return 'cash';
  if (normalized.includes('card') || normalized.includes('credit') || normalized.includes('debit')) return 'card';
  if (normalized.includes('upi')) return 'upi';
  if (normalized.includes('neft') || normalized.includes('imps') || normalized.includes('net')) return 'neft';
  return 'other';
};

const formatPayMode = (method, reference) => {
  if (!method) return 'N/A';
  const normalized = (method || '').toLowerCase();
  const friendly = PAYMENT_METHOD_MAP[normalized] || method.toUpperCase();
  return reference ? `${friendly} ${reference}` : friendly;
};

const getSafeDate = (value, fallback) => {
  if (!value) return fallback || null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return fallback || null;
  return dt;
};

const CollectionReport = () => {
  const { user } = useSelector((state) => state.auth);
  const today = useMemo(() => new Date(), []);
  
  // Report type: 'daily', 'weekly', 'monthly', 'yearly', 'custom'
  const [reportType, setReportType] = useState('custom');
  const [dateRange, setDateRange] = useState(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(today)
    };
  });
  const [consultationType, setConsultationType] = useState('both');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState([]);
  const [refundData, setRefundData] = useState([]);
  const [summary, setSummary] = useState({
    amountCollectedInCash: 0,
    amountCollectedInCard: 0,
    amountCollectedInUPI: 0,
    amountCollectedInNEFT: 0,
    totalRefund: 0,
    totalCollected: 0,
    cancelledCount: 0,
    cancelledAmount: 0,
    refundedCount: 0,
    refundedAmount: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [collectionPage, setCollectionPage] = useState(1);
  const [collectionItemsPerPage, setCollectionItemsPerPage] = useState(25);
  const [refundPage, setRefundPage] = useState(1);
  const [refundItemsPerPage, setRefundItemsPerPage] = useState(25);

  // Fetch centers on component mount
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const centersData = await getAllCentersForBooking();
        // Handle different response structures
        let centersArray = [];
        if (Array.isArray(centersData)) {
          centersArray = centersData;
        } else if (centersData?.centers && Array.isArray(centersData.centers)) {
          centersArray = centersData.centers;
        } else if (centersData?.data && Array.isArray(centersData.data)) {
          centersArray = centersData.data;
        }
        setCenters(centersArray);
      } catch (error) {
        console.error('Error fetching centers:', error);
        toast.error('Failed to load centers');
        setCenters([]); // Ensure it's always an array
      }
    };
    fetchCenters();
  }, []);

  // Calculate date range based on report type
  const calculateDateRange = useCallback((type) => {
    const now = new Date();
    let startDate, endDate;

    switch (type) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = new Date(now);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now);
        break;
      case 'custom':
      default:
        // Keep existing date range
        return null;
    }

    return {
      startDate: formatDateInput(startDate),
      endDate: formatDateInput(endDate)
    };
  }, []);

  // Update date range when report type changes
  useEffect(() => {
    if (reportType !== 'custom') {
      const newRange = calculateDateRange(reportType);
      if (newRange) {
        setDateRange(newRange);
      }
    }
  }, [reportType, calculateDateRange]);

  const consultationLabel = useMemo(() => {
    if (consultationType === 'both') return 'Both IP & OP';
    if (!consultationType) return 'All';
    return consultationType;
  }, [consultationType]);

  const reportTypeLabel = useMemo(() => {
    switch (reportType) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      case 'custom': return 'Custom Range';
      default: return 'Custom Range';
    }
  }, [reportType]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        consultationType: consultationType === 'both' ? undefined : consultationType,
        centerId: selectedCenter !== 'all' ? selectedCenter : undefined
      };

      console.log('🔍 Fetching report with params:', params);
      console.log('🔍 Selected center:', selectedCenter);

      const response = await getBillingData(params);
      const bills = response?.bills || [];
      const transactions = response?.transactions || [];

      // Debug: Check for refunded bills
      const refundedBills = bills.filter(b => 
        b.status?.toLowerCase() === 'refunded' || 
        b.refundedAmount > 0 || 
        (Array.isArray(b.refunds) && b.refunds.length > 0)
      );
      console.log('🔍 Total bills received:', bills.length);
      console.log('🔍 Bills with refunds:', refundedBills.length);
      if (refundedBills.length > 0) {
        console.log('🔍 Sample refunded bill:', {
          status: refundedBills[0].status,
          refundedAmount: refundedBills[0].refundedAmount,
          refunds: refundedBills[0].refunds,
          refundedAt: refundedBills[0].refundedAt,
          date: refundedBills[0].date
        });
      }

      const startDateObj = dateRange.startDate ? new Date(`${dateRange.startDate}T00:00:00`) : null;
      const endDateObj = dateRange.endDate ? new Date(`${dateRange.endDate}T23:59:59`) : null;

      const payments = [];
      const refunds = [];

      let amountCollectedInCash = 0;
      let amountCollectedInCard = 0;
      let amountCollectedInUPI = 0;
      let amountCollectedInNEFT = 0;
      let totalRefund = 0;
      let cancelledCount = 0;
      let cancelledAmount = 0;
      let refundedCount = 0;
      let refundedAmount = 0;

      const isWithinRange = (date) => {
        if (!date) return true;
        const dt = getSafeDate(date);
        if (!dt) return false;
        if (startDateObj && dt < startDateObj) return false;
        if (endDateObj && dt > endDateObj) return false;
        return true;
      };

      const getBillType = (billItem) => {
        if (!billItem) return 'Consultation';
        
        if (billItem.billType) {
          if (billItem.billType === 'Lab/Test') return 'Lab/Test';
          if (billItem.billType === 'Reassignment') return 'Reassignment';
          if (billItem.billType === 'Superconsultant') return 'Superconsultant';
          if (billItem.billType === 'Slit Therapy') return 'Slit Therapy';
          return billItem.billType;
        }
        
        if (billItem.isReassignment || billItem.reassignmentId || billItem.reassignedBilling) {
          return 'Reassignment';
        }
        
        if (billItem.consultationType && billItem.consultationType.startsWith('superconsultant')) {
          return 'Superconsultant';
        }
        
        if (billItem.description && billItem.description.toLowerCase().includes('slit')) {
          return 'Slit Therapy';
        }
        if (billItem.type === 'slit_therapy' || billItem.type === 'slitTherapy') {
          return 'Slit Therapy';
        }
        
        if (billItem.consultationType === 'followup') return 'Followup';
        if (billItem.consultationType === 'IP') return 'IP Consultation';
        if (billItem.consultationType === 'OP') return 'OP Consultation';
        
        if (billItem.type === 'service' || billItem.description?.toLowerCase().includes('service')) {
          return 'Service Charge';
        }
        if (billItem.type === 'registration' || billItem.description?.toLowerCase().includes('registration')) {
          return 'Registration';
        }
        if (billItem.type === 'consultation') return 'Consultation';
        
        return 'Consultation';
      };

      bills.forEach((bill) => {
        const billDate = getSafeDate(bill.date || bill.createdAt || bill.generatedAt);
        const patientUhId = bill.uhId || bill.patient?.uhId || bill.patientUHID || bill.patient?.patientUHID || bill.patient?.patientId || bill.patient?.uhid || bill.patientId?.uhId || bill.patientId || 'N/A';
        const patientName = bill.patientName || bill.patient?.name || bill.patient?.fullName || bill.patientId?.name || 'N/A';
        const billConsultationType = bill.consultationType || 'OP';
        const billType = getBillType(bill);
        let hasPaymentEntry = false;

        // Check for cancelled bills - only count if cancellation date is within selected range
        const billStatus = bill.status?.toLowerCase() || '';
        if (billStatus === 'cancelled') {
          const cancelledDate = bill.cancelledAt || bill.cancelledDate || bill.updatedAt || bill.date || bill.createdAt;
          // Only count cancelled bills if the cancellation date is within the selected date range
          if (isWithinRange(cancelledDate)) {
            const billAmount = Number(bill.amount || bill.paidAmount || 0);
            cancelledCount++;
            cancelledAmount += billAmount;
          }
        }
        // Note: Don't count refunded bills here - we'll count them when we actually add them to the refunds array

        if (consultationType !== 'both' && consultationType) {
          if (billType === 'Consultation' || billType === 'OP Consultation' || billType === 'IP Consultation' || billType === 'Superconsultant') {
            if (billConsultationType !== consultationType && consultationType !== 'both') {
              return;
            }
          }
        }

        const pushPayment = (payment, fallbackDate) => {
          const paymentDate = payment?.date || payment?.paidAt || payment?.createdAt || payment?.timestamp || fallbackDate;
          if (!isWithinRange(paymentDate)) return;

          const method = payment?.paymentMethod || payment?.method || payment?.paymentMode || bill.paymentMethod || 'cash';
          const bucket = getPaymentBucket(method);
          const amount = Number(payment?.amount || payment?.paidAmount || payment?.total || payment?.paymentAmount || bill?.paidAmount || 0);
          if (amount === undefined || amount === null || amount <= 0) return;

          // Get receptionist name from multiple possible sources (prioritize generatedBy, then processedBy)
          const paymentUserName = payment?.generatedBy || 
                                  payment?.invoice?.generatedBy ||
                                  payment?.bill?.generatedBy ||
                                  payment?.billing?.generatedBy ||
                                  (payment?.generatedBy && typeof payment.generatedBy === 'object' ? payment.generatedBy.name : null) ||
                                  payment?.processedByName || 
                                  payment?.processedBy?.name || 
                                  payment?.createdByName || 
                                  payment?.createdBy?.name || 
                                  payment?.collectedByName || 
                                  payment?.collectedBy?.name || 
                                  payment?.handledByName || 
                                  payment?.handledBy?.name || 
                                  payment?.recordedBy;
          
          let billUserName = null;
          if (bill.generatedBy) {
            if (typeof bill.generatedBy === 'string') {
              billUserName = bill.generatedBy.match(/^[0-9a-fA-F]{24}$/) 
                ? (bill.generatedByUser?.name || bill.generatedByUser?.userName || null)
                : bill.generatedBy;
            } else if (typeof bill.generatedBy === 'object' && bill.generatedBy !== null) {
              billUserName = bill.generatedBy.name || bill.generatedBy.userName || bill.generatedBy.fullName || null;
            }
          }
          if (!billUserName) {
            billUserName = bill.invoice?.generatedBy || bill.billing?.generatedBy ||
                          (bill.invoice?.generatedBy && typeof bill.invoice.generatedBy === 'object' ? bill.invoice.generatedBy.name : null) ||
                          (bill.billing?.generatedBy && typeof bill.billing.generatedBy === 'object' ? bill.billing.generatedBy.name : null);
          }
          if (!billUserName && bill.createdBy) {
            if (typeof bill.createdBy === 'string' && !bill.createdBy.match(/^[0-9a-fA-F]{24}$/)) {
              billUserName = bill.createdBy;
            } else if (typeof bill.createdBy === 'object') {
              billUserName = bill.createdBy.name || bill.createdBy.userName || bill.createdBy.fullName || null;
            }
          }
          if (!billUserName) {
            billUserName = (bill.user && typeof bill.user === 'object' ? (bill.user.name || bill.user.userName) : null) ||
                          (bill.userId && typeof bill.userId === 'object' ? (bill.userId.name || bill.userId.userName) : null) ||
                          bill.processedByName || bill.processedBy?.name || bill.createdByName || bill.generatedByName || 
                          bill.collectedByName || bill.collectedBy?.name || bill.handledByName || bill.createdBy?.name || bill.paidBy?.name || 'N/A';
          }

          // Get receipt number from multiple possible sources
          const receiptNumber = payment?.receiptNumber || payment?.receiptNo || payment?.receipt_no || payment?.invoiceNumber || payment?.reference || bill.invoiceNumber || bill.billNo || bill._id?.toString().slice(-8) || 'N/A';
          const transactionRef = payment?.paymentReference || payment?.referenceId || payment?.transactionId || payment?.reference || payment?.transactionRef || '';

          if (bucket === 'cash') amountCollectedInCash += amount;
          else if (bucket === 'card') amountCollectedInCard += amount;
          else if (bucket === 'upi') amountCollectedInUPI += amount;
          else if (bucket === 'neft') amountCollectedInNEFT += amount;

          payments.push({
            date: paymentDate,
            patientId: patientUhId,
            patientName,
            userName: paymentUserName || billUserName || 'N/A',
            receiptNumber,
            payMode: formatPayMode(method, transactionRef),
            amount,
            billType
          });
          hasPaymentEntry = true;
        };

        // Process payment history (most accurate source)
        if (Array.isArray(bill.paymentHistory) && bill.paymentHistory.length > 0) {
          bill.paymentHistory.forEach((payment) => {
            const paymentStatus = payment?.status?.toLowerCase() || '';
            
            // Process refunds from payment history
            if (paymentStatus === 'refunded' || (payment?.refund && payment?.refund?.refundedAmount > 0)) {
              const refundAmount = Number(payment?.refund?.refundedAmount || payment?.refundAmount || payment?.amount || 0);
              if (refundAmount > 0) {
                const refundDate = payment?.refund?.refundedAt || payment?.refundedAt || payment?.updatedAt || payment?.date || payment?.createdAt;
                
                // IMPORTANT: Only show refund if the REFUND DATE is within the selected range
                // Do NOT show refund based on bill date - refunds should appear on the date they were refunded
                if (!refundDate || !isWithinRange(refundDate)) {
                  // Skip this refund - it's not within the selected date range
                  return; // Skip to next payment
                }
                
                const finalRefundDate = refundDate;
                
                // Include the refund
                const refundUserName = bill.generatedBy || payment?.generatedBy || payment?.refund?.refundedBy?.name || payment?.refundedBy?.name || payment?.processedBy?.name || payment?.processedByName || bill.processedByName || bill.processedBy?.name || bill.refundedByName || bill.refundedBy?.name || 'N/A';
                const refundMethod = payment?.refund?.refundMethod || payment?.refundMethod || payment?.paymentMethod || payment?.method || bill.refundMethod || bill.paymentMethod || 'cash';
                const receiptNumber = payment?.receiptNumber || payment?.invoiceNumber || bill.invoiceNumber || bill.billNo || bill._id?.toString().slice(-8) || '-';
                const transactionRef = payment?.refund?.externalRefundId || payment?.transactionId || payment?.reference || '';

                totalRefund += refundAmount;
                refundedAmount += refundAmount;
                refundedCount++;

                refunds.push({
                  date: finalRefundDate,
                  patientId: patientUhId,
                  patientName,
                  userName: refundUserName || 'N/A',
                  receiptNumber,
                  payMode: formatPayMode(refundMethod, transactionRef),
                  amount: refundAmount,
                  billType
                });
              }
            } else if (paymentStatus !== 'cancelled') {
              // Process regular payments (not refunds or cancelled)
              pushPayment(payment, billDate || bill.createdAt || bill.generatedAt);
            }
          });
        }
        
        if (!hasPaymentEntry && (bill.status === 'paid' || bill.status === 'completed' || bill.status === 'payment_received' || bill.billing?.status === 'paid')) {
          const paidAmount = Number(bill.paidAmount || bill.amount || 0);
          if (paidAmount > 0) {
            pushPayment({ 
              ...bill, 
              amount: paidAmount,
              date: bill.paidAt || bill.date || bill.createdAt || bill.generatedAt
            }, billDate);
          }
        }

        if (!hasPaymentEntry && isWithinRange(billDate)) {
          const fallbackAmount = Number(bill.paidAmount || 0);
          const fallbackMethod = bill.paymentMethod || bill.billing?.paymentMethod || 'cash';
          const fallbackUserName = bill.generatedBy || bill.processedByName || bill.processedBy?.name || bill.createdByName || bill.generatedByName || bill.collectedByName || bill.collectedBy?.name || bill.handledByName || bill.createdBy?.name || bill.paidBy?.name || 'N/A';

          if (fallbackAmount > 0) {
            const bucket = getPaymentBucket(fallbackMethod);
            if (bucket === 'cash') amountCollectedInCash += fallbackAmount;
            else if (bucket === 'card') amountCollectedInCard += fallbackAmount;
            else if (bucket === 'upi') amountCollectedInUPI += fallbackAmount;
            else if (bucket === 'neft') amountCollectedInNEFT += fallbackAmount;

            payments.push({
              date: billDate,
              patientId: patientUhId,
              patientName,
              userName: fallbackUserName,
              receiptNumber: bill.invoiceNumber || bill.billNo || bill._id?.toString().slice(-8) || 'N/A',
              payMode: formatPayMode(fallbackMethod, bill.paymentReference || bill.transactionId),
              amount: fallbackAmount,
              billType
            });
            hasPaymentEntry = true;
          }
        }

        const handleRefundEntry = (refund, refundBill = bill) => {
          const refundAmount = Number(refund?.refund?.refundedAmount || refund?.refundAmount || refund?.amount || refundBill?.refundedAmount || refundBill?.billing?.refundAmount || 0);
          if (!refundAmount || refundAmount <= 0) {
            console.log('⚠️ Skipping refund entry - invalid amount:', refundAmount);
            return false;
          }
          
          // Extract refund date from multiple possible sources
          const refundDate = refund?.refund?.refundedAt || refund?.refundedAt || refund?.processedAt || refund?.date || refund?.createdAt || refund?.updatedAt || refund?.timestamp || refundBill?.refundedAt || refundBill?.billing?.refundedAt || refundBill?.updatedAt;
          
          // IMPORTANT: Only show refund if the REFUND DATE is within the selected range
          // Do NOT show refund based on bill date - refunds should appear on the date they were refunded
          if (!refundDate || !isWithinRange(refundDate)) {
            // Skip this refund - it's not within the selected date range
            console.log('❌ Skipping refund - refund date is not within selected range:', {
              refundDate: refundDate ? new Date(refundDate).toISOString() : null,
              startDate: startDateObj?.toISOString(),
              endDate: endDateObj?.toISOString()
            });
            return false;
          }
          
          const finalRefundDate = refundDate;
          
          console.log('✅ Refund will be shown - refund date is within range:', {
            refundAmount,
            refundDate: new Date(refundDate).toISOString(),
            startDate: startDateObj?.toISOString(),
            endDate: endDateObj?.toISOString()
          });
          
          totalRefund += refundAmount;
          refundedAmount += refundAmount;

          // Extract receptionist name (person who processed the refund) from multiple sources
          // Check generatedBy first (most reliable for invoices), then refundedByName, then try to extract from refundedBy object
          const refundUserName = refundBill?.generatedBy ||
                                refund?.generatedBy ||
                                refund?.refundedByName || 
                                refund?.processedByName || 
                                refund?.refund?.refundedBy?.name || 
                                refund?.refundedBy?.name || 
                                (typeof refund?.refundedBy === 'object' && refund?.refundedBy?.name) ||
                                refund?.processedBy?.name || 
                                refund?.handledByName || 
                                refund?.handledBy?.name || 
                                refund?.approvedByName || 
                                refundBill?.refundedByName || 
                                (typeof refundBill?.refundedBy === 'object' && refundBill?.refundedBy?.name) ||
                                refundBill?.refundedBy?.name || 
                                refundBill?.billing?.refundedByName || 
                                refundBill?.processedByName || 
                                refundBill?.processedBy?.name || 
                                refundBill?.paidBy?.name || 
                                'N/A';

          // Extract refund payment method (how the refund was processed)
          const refundMethod = refund?.refund?.refundMethod || refund?.refundMethod || refund?.paymentMethod || refund?.method || refund?.mode || refundBill?.refundMethod || refundBill?.billing?.refundMethod || refundBill?.paymentMethod || 'cash';
          
          // Extract receipt/invoice number
          const receiptNumber = refund?.receiptNumber || refund?.invoiceNumber || refund?.refundReceiptNumber || refund?.transactionId || refundBill?.invoiceNumber || refundBill?.billNo || refundBill?._id?.toString().slice(-8) || '-';

          // Extract transaction reference for refund
          const transactionRef = refund?.refund?.externalRefundId || refund?.externalRefundId || refund?.transactionId || refund?.reference || refundBill?.transactionId || '';

          refunds.push({
            date: finalRefundDate,
            patientId: patientUhId,
            patientName,
            userName: refundUserName || 'N/A',
            receiptNumber,
            payMode: formatPayMode(refundMethod, transactionRef),
            amount: refundAmount,
            billType
          });
          
          return true; // Indicate that refund was added
        };

        // Process refunds - check all possible sources
        console.log(`🔍 Processing bill ${bill.invoiceNumber || bill.billNo}:`, {
          status: bill.status,
          refundedAmount: bill.refundedAmount,
          refundsArray: bill.refunds?.length || 0,
          hasBillingRefund: bill.billing?.refundAmount > 0
        });

        // 1. Process refunds array first
        if (Array.isArray(bill.refunds) && bill.refunds.length > 0) {
          console.log(`  📋 Found ${bill.refunds.length} refunds in array`);
          bill.refunds.forEach((refund, idx) => {
            console.log(`  Processing refund ${idx + 1}:`, {
              amount: refund?.amount || refund?.refundAmount,
              refundedAt: refund?.refundedAt || refund?.processedAt
            });
            if (handleRefundEntry(refund)) {
              refundedCount++;
              console.log(`  ✅ Refund ${idx + 1} added to report`);
            } else {
              console.log(`  ❌ Refund ${idx + 1} skipped`);
            }
          });
        }

        // 2. Process bill-level refund information (even if refunds array exists, as it might be additional)
        const billRefundAmount = Number(bill.refundedAmount || bill.billing?.refundAmount || 0);
        if (billRefundAmount > 0) {
          // Check if this refund amount was already processed in the refunds array
          const alreadyProcessed = Array.isArray(bill.refunds) && bill.refunds.some(r => 
            Math.abs((r?.amount || r?.refundAmount || 0) - billRefundAmount) < 0.01
          );
          
          if (!alreadyProcessed) {
            console.log(`  💰 Found bill-level refund amount: ${billRefundAmount} (not in array)`);
            if (handleRefundEntry({
              refund: {
                refundedAmount: billRefundAmount,
                refundedAt: bill.refundProcessedAt || bill.refundedAt || bill.billing?.refundedAt || bill.updatedAt,
                refundedBy: bill.refundedBy || bill.billing?.refundedBy
              },
              refundedAmount: billRefundAmount,
              refundedAt: bill.refundProcessedAt || bill.refundedAt || bill.billing?.refundedAt || bill.updatedAt,
              refundedByName: bill.refundedByName || bill.billing?.refundedByName,
              refundedBy: bill.refundedBy || bill.billing?.refundedBy, // Also pass refundedBy object for name extraction
              refundMethod: bill.refundMethod || bill.billing?.refundMethod,
              invoiceNumber: bill.invoiceNumber || bill.billNo
            }, bill)) {
              refundedCount++;
              console.log(`  ✅ Bill-level refund added to report`);
            } else {
              console.log(`  ❌ Bill-level refund skipped`);
            }
          } else {
            console.log(`  ⏭️ Bill-level refund already processed in array`);
          }
        }

        // 3. Also check if bill status is refunded (fallback for bills without explicit refund data)
        if (bill.status?.toLowerCase() === 'refunded') {
          const billAmount = Number(bill.paidAmount || bill.amount || 0);
          // Only process if we haven't already processed this amount
          const alreadyProcessedInArray = Array.isArray(bill.refunds) && bill.refunds.some(r => 
            Math.abs((r?.amount || r?.refundAmount || 0) - billAmount) < 0.01
          );
          const alreadyProcessedAsBillLevel = Math.abs(billRefundAmount - billAmount) < 0.01;
          
          if (billAmount > 0 && !alreadyProcessedInArray && !alreadyProcessedAsBillLevel) {
            console.log(`  🔄 Bill status is refunded, using paid amount: ${billAmount}`);
            if (handleRefundEntry({
              refund: {
                refundedAmount: billAmount,
                refundedAt: bill.refundedAt || bill.updatedAt,
                refundedBy: bill.refundedBy
              },
              refundedAmount: billAmount,
              refundedAt: bill.refundedAt || bill.updatedAt,
              refundedByName: bill.refundedByName,
              refundMethod: bill.refundMethod,
              invoiceNumber: bill.invoiceNumber || bill.billNo
            })) {
              refundedCount++;
              console.log(`  ✅ Status-based refund added to report`);
            } else {
              console.log(`  ❌ Status-based refund skipped`);
            }
          }
        }
      });

      // Process refunded transactions from the transactions array
      // Create a map of invoice numbers to bills for matching refunds
      const invoiceToBillMap = new Map();
      bills.forEach(bill => {
        const invoiceNum = bill.invoiceNumber || bill.billNo;
        if (invoiceNum) {
          invoiceToBillMap.set(invoiceNum, bill);
        }
      });

      transactions.forEach((transaction) => {
        const transactionStatus = transaction?.status?.toLowerCase() || '';
        if (transactionStatus === 'refunded' || (transaction?.refund && transaction?.refund?.refundedAmount > 0)) {
          const refundAmount = Number(transaction?.refund?.refundedAmount || transaction?.refund?.amount || transaction?.amount || 0);
          if (refundAmount <= 0) return;

          // Extract refund date - use refundedAt, updatedAt when status is refunded, or createdAt
          const refundDate = transaction?.refund?.refundedAt || 
                           (transactionStatus === 'refunded' ? transaction?.updatedAt : null) ||
                           transaction?.date || 
                           transaction?.createdAt;
          
          // IMPORTANT: Only show refund if the REFUND DATE is within the selected range
          // Do NOT show refund based on transaction date - refunds should appear on the date they were refunded
          if (!refundDate || !isWithinRange(refundDate)) {
            // Skip this refund - it's not within the selected date range
            return; // Skip this refund
          }
          
          const finalRefundDate = refundDate;

          const patientUhId = transaction?.uhId || transaction?.patientId || 'N/A';
          const patientName = transaction?.patientName || 'N/A';
          
          // Extract receptionist name (person who processed the refund)
          const refundUserName = transaction?.generatedBy ||
                                transaction?.refund?.refundedBy?.name || 
                                transaction?.refundedBy?.name || 
                                (typeof transaction?.refundedBy === 'object' ? transaction?.refundedBy?.name : null) ||
                                transaction?.processedBy?.name || 
                                (typeof transaction?.processedBy === 'object' ? transaction?.processedBy?.name : null) ||
                                transaction?.doctor || 
                                'N/A';
          
          // Extract refund payment method - use refund method or original payment method
          const refundMethod = transaction?.refund?.refundMethod || 
                              transaction?.refundMethod || 
                              transaction?.paymentMethod || 
                              transaction?.method || 
                              'cash';
          
          const receiptNumber = transaction?.invoiceNumber || transaction?.receiptNumber || transaction?.transactionId || '-';
          const transactionRef = transaction?.refund?.externalRefundId || transaction?.refund?.transactionId || transaction?.transactionId || '';

          // Determine bill type from transaction or matching bill
          let transactionBillType = 'Consultation';
          const matchingBill = invoiceToBillMap.get(receiptNumber);
          if (matchingBill) {
            transactionBillType = getBillType(matchingBill);
          } else {
            transactionBillType = transaction?.transactionType === 'test' || transaction?.transactionType === 'lab_test' ? 'Lab/Test' : 
                                 transaction?.description?.toLowerCase().includes('slit') ? 'Slit Therapy' :
                                 transaction?.description?.toLowerCase().includes('reassignment') ? 'Reassignment' :
                                 'Consultation';
          }

          totalRefund += refundAmount;
          refundedAmount += refundAmount;
          refundedCount++;

          refunds.push({
            date: finalRefundDate,
            patientId: patientUhId,
            patientName,
            userName: refundUserName || 'N/A',
            receiptNumber,
            payMode: formatPayMode(refundMethod, transactionRef),
            amount: refundAmount,
            billType: transactionBillType
          });
        }
      });

      payments.sort((a, b) => new Date(a.date) - new Date(b.date));
      refunds.sort((a, b) => new Date(a.date) - new Date(b.date));

      const totalCollected = payments.reduce((sum, item) => sum + (item.amount || 0), 0);

      setCollectionData(payments);
      setRefundData(refunds);
      setSummary({
        amountCollectedInCash,
        amountCollectedInCard,
        amountCollectedInUPI,
        amountCollectedInNEFT,
        totalRefund,
        totalCollected,
        cancelledCount,
        cancelledAmount,
        refundedCount,
        refundedAmount
      });
      setLastUpdated(new Date());
      setCollectionPage(1);
      setRefundPage(1);
    } catch (error) {
      console.error('Error fetching collection report:', error);
      toast.error('Failed to load collection report');
    } finally {
      setLoading(false);
    }
  }, [consultationType, dateRange.endDate, dateRange.startDate, selectedCenter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const collectionPaginated = useMemo(() => {
    const start = (collectionPage - 1) * collectionItemsPerPage;
    return collectionData.slice(start, start + collectionItemsPerPage);
  }, [collectionData, collectionItemsPerPage, collectionPage]);

  const refundPaginated = useMemo(() => {
    const start = (refundPage - 1) * refundItemsPerPage;
    return refundData.slice(start, start + refundItemsPerPage);
  }, [refundData, refundItemsPerPage, refundPage]);

  const collectionTotalPages = Math.max(1, Math.ceil(collectionData.length / collectionItemsPerPage));
  const refundTotalPages = Math.max(1, Math.ceil(refundData.length / refundItemsPerPage));

  const handleExportCSV = () => {
    const headerTitle = `${reportTypeLabel} Collection Report ${formatDateDisplay(dateRange.startDate)} to ${formatDateDisplay(dateRange.endDate)} ${consultationLabel}`;
    const refundTitle = `${reportTypeLabel} Refund Report ${formatDateDisplay(dateRange.startDate)} to ${formatDateDisplay(dateRange.endDate)} ${consultationLabel}`;

    const csvRows = [];
    csvRows.push([headerTitle]);
    csvRows.push([]);
    csvRows.push(['S.No.', 'Date', 'Patient Id', 'Patient Name', 'Receptionist', 'Receipt Number', 'Pay Mode', 'Bill Type', 'Amount']);
    collectionData.forEach((item, index) => {
      csvRows.push([
        index + 1,
        formatDateForCSV(item.date), // Use Excel-compatible date format
        item.patientId,
        item.patientName,
        item.userName,
        item.receiptNumber,
        item.payMode,
        item.billType || 'Consultation',
        (item.amount || 0).toFixed(2)
      ]);
    });

    csvRows.push([]);
    csvRows.push([refundTitle]);
    csvRows.push([]);
    csvRows.push(['S.No.', 'Date', 'Patient Id', 'Patient Name', 'Receptionist', 'Receipt Number', 'Pay Mode', 'Bill Type', 'Amount']);
    refundData.forEach((item, index) => {
      csvRows.push([
        index + 1,
        item.date ? formatDateForCSV(item.date) : 'N/A', // Use Excel-compatible date format
        item.patientId,
        item.patientName,
        item.userName,
        item.receiptNumber,
        item.payMode || 'N/A',
        item.billType || 'Consultation',
        (item.amount || 0).toFixed(2)
      ]);
    });

    csvRows.push([]);
    csvRows.push(['Summary']);
    csvRows.push([
      'Amount Collected In Cash',
      'Amount Collected In Card',
      'Amount Collected In UPI',
      'Amount Collected In NEFT/IMPS',
      'Refund (Total)',
      'Total (Exclud Refu)',
      'Cancelled Bills Count',
      'Cancelled Bills Amount',
      'Refunded Bills Count',
      'Refunded Bills Amount'
    ]);
    csvRows.push([
      summary.amountCollectedInCash.toFixed(2),
      summary.amountCollectedInCard.toFixed(2),
      summary.amountCollectedInUPI.toFixed(2),
      summary.amountCollectedInNEFT.toFixed(2),
      summary.totalRefund.toFixed(2),
      (summary.totalCollected - summary.totalRefund).toFixed(2),
      summary.cancelledCount,
      summary.cancelledAmount.toFixed(2),
      summary.refundedCount,
      summary.refundedAmount.toFixed(2)
    ]);

    const csvContent = csvRows
      .map((row) => row.map((cell) => typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const centerName = selectedCenter !== 'all' && Array.isArray(centers)
      ? (centers.find(c => (c._id || c.id) === selectedCenter)?.name || centers.find(c => (c._id || c.id) === selectedCenter)?.centername || 'center').replace(/\s+/g, '_').toLowerCase()
      : 'all_centers';
    link.download = `superadmin_${reportType}_collection_${centerName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('CSV report exported successfully');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const centerName = selectedCenter !== 'all' && Array.isArray(centers)
      ? (centers.find(c => (c._id || c.id) === selectedCenter)?.name || centers.find(c => (c._id || c.id) === selectedCenter)?.centername || 'All Centers')
      : 'All Centers';
    
    const headerTitle = `${reportTypeLabel} Collection Report`;
    const dateRangeText = `${formatDateDisplay(dateRange.startDate)} to ${formatDateDisplay(dateRange.endDate)}`;
    const subtitle = `${dateRangeText} - ${consultationLabel} - ${centerName}`;

    // Add header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(headerTitle, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(subtitle, 14, 22);
    doc.text(`Printed at: ${formatPrintedTimestamp(new Date())} by ${user?.name || 'Super Admin'}`, 14, 27);

    let yPos = 35;

    // Collection Report Table
    if (collectionData.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Collection Report', 14, yPos);
      yPos += 5;

      const collectionTableData = collectionData.map((item, index) => [
        index + 1,
        formatDateForCSV(item.date),
        item.patientId,
        item.patientName,
        item.userName,
        item.receiptNumber,
        item.payMode,
        item.billType || 'Consultation',
        `₹${(item.amount || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['S.No.', 'Date', 'Patient Id', 'Patient Name', 'Receptionist', 'Receipt Number', 'Pay Mode', 'Bill Type', 'Amount']],
        body: collectionTableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
          // Add page numbers
          doc.setFontSize(8);
          doc.text(
            `Page ${doc.internal.getNumberOfPages()}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Refund Report Table
    if (refundData.length > 0) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Refund Report', 14, yPos);
      yPos += 5;

      const refundTableData = refundData.map((item, index) => [
        index + 1,
        item.date ? formatDateForCSV(item.date) : 'N/A',
        item.patientId,
        item.patientName,
        item.userName,
        item.receiptNumber,
        item.payMode || 'N/A',
        item.billType || 'Consultation',
        `₹${(item.amount || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['S.No.', 'Date', 'Patient Id', 'Patient Name', 'Receptionist', 'Receipt Number', 'Pay Mode', 'Bill Type', 'Amount']],
        body: refundTableData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
          doc.setFontSize(8);
          doc.text(
            `Page ${doc.internal.getNumberOfPages()}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Summary Section
    if (yPos > 200) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 14, yPos);
    yPos += 8;

    const summaryData = [
      ['Amount Collected In Cash', `₹${summary.amountCollectedInCash.toFixed(2)}`],
      ['Amount Collected In Card', `₹${summary.amountCollectedInCard.toFixed(2)}`],
      ['Amount Collected In UPI', `₹${summary.amountCollectedInUPI.toFixed(2)}`],
      ['Amount Collected In NEFT/IMPS', `₹${summary.amountCollectedInNEFT.toFixed(2)}`],
      ['Refund (Total)', `₹${summary.totalRefund.toFixed(2)}`],
      ['Total (Exclud Refu)', `₹${(summary.totalCollected - summary.totalRefund).toFixed(2)}`],
      ['Cancelled Bills Count', summary.cancelledCount],
      ['Cancelled Bills Amount', `₹${summary.cancelledAmount.toFixed(2)}`],
      ['Refunded Bills Count', summary.refundedCount],
      ['Refunded Bills Amount', `₹${summary.refundedAmount.toFixed(2)}`]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    // Add page number to last page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const centerNameForFile = selectedCenter !== 'all' && Array.isArray(centers)
      ? (centers.find(c => (c._id || c.id) === selectedCenter)?.name || centers.find(c => (c._id || c.id) === selectedCenter)?.centername || 'center').replace(/\s+/g, '_').toLowerCase()
      : 'all_centers';
    doc.save(`superadmin_${reportType}_collection_${centerNameForFile}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report exported successfully');
  };

  const totalCollectionAmount = useMemo(() => {
    return collectionData.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [collectionData]);

  const totalRefundAmount = useMemo(() => {
    return refundData.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [refundData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800">Superadmin Collection Report</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {reportTypeLabel} Collection {formatDateDisplay(dateRange.startDate)} {dateRange.startDate !== dateRange.endDate ? `to ${formatDateDisplay(dateRange.endDate)}` : ''} ({consultationLabel})
                {selectedCenter !== 'all' && Array.isArray(centers) && ` - ${centers.find(c => (c._id || c.id) === selectedCenter)?.name || centers.find(c => (c._id || c.id) === selectedCenter)?.centername || 'Selected Center'}`}
              </p>
              {lastUpdated && (
                <p className="text-xs text-slate-500 mt-1">
                  Last refreshed: {formatPrintedTimestamp(lastUpdated)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => fetchReport()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  if (e.target.value !== 'custom') {
                    const newRange = calculateDateRange(e.target.value);
                    if (newRange) {
                      setDateRange(newRange);
                    }
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Last 7 Days)</option>
                <option value="monthly">Monthly (This Month)</option>
                <option value="yearly">Yearly (This Year)</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }));
                  setReportType('custom');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }));
                  setReportType('custom');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Center</label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Centers</option>
                {Array.isArray(centers) && centers.map((center) => (
                  <option key={center._id || center.id} value={center._id || center.id}>
                    {center.name || center.centername || center.centerName || center.code || 'Unknown Center'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Consultation Type</label>
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
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchReport()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-2 text-xs text-slate-500 bg-slate-100 rounded-lg">
              <CalendarRange className="h-4 w-4" />
              <span>
                {formatDateDisplay(dateRange.startDate)} - {formatDateDisplay(dateRange.endDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-blue-100 bg-blue-50">
            <h2 className="text-sm sm:text-base font-semibold text-slate-800">
              {reportTypeLabel} Collection {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)} ({consultationLabel})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">S.No.</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Patient Id</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Patient Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receptionist</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receipt Number</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Pay Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Bill Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading collection data...
                    </td>
                  </tr>
                ) : collectionPaginated.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-sm text-slate-500">
                      No collection entries found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  collectionPaginated.map((item, index) => {
                    const serial = (collectionPage - 1) * collectionItemsPerPage + index + 1;
                    return (
                      <tr key={`${item.receiptNumber}-${index}`} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{serial}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(item.date)}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.patientId}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 capitalize">{item.patientName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 capitalize">{item.userName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.receiptNumber}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.payMode}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 capitalize">{item.billType || 'Consultation'}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">{(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {collectionData.length > collectionItemsPerPage && (
            <Pagination
              currentPage={collectionPage}
              totalPages={collectionTotalPages}
              totalItems={collectionData.length}
              itemsPerPage={collectionItemsPerPage}
              onPageChange={setCollectionPage}
              onItemsPerPageChange={(value) => {
                setCollectionItemsPerPage(value);
                setCollectionPage(1);
              }}
            />
          )}
          <div className="px-4 sm:px-6 py-3 border-t border-blue-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-slate-700">
            <span>Total Collection Records: {collectionData.length}</span>
            <span>Total Amount Collected: <strong className="text-green-600">{totalCollectionAmount.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-blue-100 bg-red-50">
            <h2 className="text-sm sm:text-base font-semibold text-slate-800">
              {reportTypeLabel} Refund Report {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)} ({consultationLabel})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">S.No.</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Patient Id</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Patient Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receptionist</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receipt Number</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Pay Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Bill Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading refund data...
                    </td>
                  </tr>
                ) : refundPaginated.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-sm text-slate-500">
                      No refund entries found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  refundPaginated.map((item, index) => {
                    const serial = (refundPage - 1) * refundItemsPerPage + index + 1;
                    return (
                      <tr key={`${item.receiptNumber}-${index}`} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{serial}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.date ? formatDateTime(item.date) : 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.patientId}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 capitalize">{item.patientName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 capitalize">{item.userName}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.receiptNumber}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{item.payMode || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 capitalize">{item.billType || 'Consultation'}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-red-600">{(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {refundData.length > refundItemsPerPage && (
            <Pagination
              currentPage={refundPage}
              totalPages={refundTotalPages}
              totalItems={refundData.length}
              itemsPerPage={refundItemsPerPage}
              onPageChange={setRefundPage}
              onItemsPerPageChange={(value) => {
                setRefundItemsPerPage(value);
                setRefundPage(1);
              }}
            />
          )}
          <div className="px-4 sm:px-6 py-3 border-t border-blue-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-slate-700">
            <span>Total Refund Records: {refundData.length}</span>
            <span>Total Refund Amount: <strong className="text-red-600">{totalRefundAmount.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-blue-100 bg-gray-50">
            <h2 className="text-sm sm:text-base font-semibold text-slate-800">Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount Collected In Cash</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount Collected In Card</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount Collected In UPI</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount Collected In NEFT/IMPS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInCash.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInCard.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInUPI.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInNEFT.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white">
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Refund (Total)</p>
              <p className="text-base font-semibold text-red-600">{summary.totalRefund.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">({summary.refundedCount} transactions)</p>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Total Amount Collected</p>
              <p className="text-base font-semibold text-green-600">{summary.totalCollected.toFixed(2)}</p>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Total (Exclud Refu)</p>
              <p className="text-base font-semibold text-green-700">{(summary.totalCollected - summary.totalRefund).toFixed(2)}</p>
            </div>
            <div className="p-3 border border-red-200 rounded-lg bg-red-50">
              <p className="text-xs text-slate-500">Cancelled Bills</p>
              <p className="text-base font-semibold text-red-700">{summary.cancelledCount}</p>
              <p className="text-xs text-slate-400 mt-1">Amount: ₹{summary.cancelledAmount.toFixed(2)}</p>
            </div>
            <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
              <p className="text-xs text-slate-500">Refunded Bills</p>
              <p className="text-base font-semibold text-orange-700">{summary.refundedCount}</p>
              <p className="text-xs text-slate-400 mt-1">Amount: ₹{summary.refundedAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-right">
          Printed at {formatPrintedTimestamp(lastUpdated)} by {user?.name || user?.fullName || user?.email || 'User'}
        </div>
      </div>
    </div>
  );
};

export default CollectionReport;

