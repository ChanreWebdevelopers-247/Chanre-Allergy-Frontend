import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Download, Filter, RefreshCw, CalendarRange } from 'lucide-react';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';
import { getBillingData } from '../../services/api';

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
  const [dateRange, setDateRange] = useState(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 2);
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(today)
    };
  });
  const [consultationType, setConsultationType] = useState('OP');
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState([]);
  const [refundData, setRefundData] = useState([]);
  const [summary, setSummary] = useState({
    amountCollectedInCash: 0,
    amountCollectedInCard: 0,
    amountCollectedInUPI: 0,
    amountCollectedInNEFT: 0,
    duesCollectedInCash: 0,
    duesCollectedInCard: 0,
    duesCollectedInUPI: 0,
    duesCollectedInNEFT: 0,
    totalRefund: 0,
    totalCollected: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [collectionPage, setCollectionPage] = useState(1);
  const [collectionItemsPerPage, setCollectionItemsPerPage] = useState(25);
  const [refundPage, setRefundPage] = useState(1);
  const [refundItemsPerPage, setRefundItemsPerPage] = useState(25);

  const consultationLabel = useMemo(() => {
    if (consultationType === 'both') return 'Both IP & OP';
    if (!consultationType) return 'All';
    return consultationType;
  }, [consultationType]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        consultationType: consultationType === 'both' ? undefined : consultationType
      };

      const response = await getBillingData(params);
      const bills = response?.bills || [];

      const startDateObj = dateRange.startDate ? new Date(`${dateRange.startDate}T00:00:00`) : null;
      const endDateObj = dateRange.endDate ? new Date(`${dateRange.endDate}T23:59:59`) : null;

      const payments = [];
      const refunds = [];

      let amountCollectedInCash = 0;
      let amountCollectedInCard = 0;
      let amountCollectedInUPI = 0;
      let amountCollectedInNEFT = 0;
      let duesCollectedInCash = 0;
      let duesCollectedInCard = 0;
      let duesCollectedInUPI = 0;
      let duesCollectedInNEFT = 0;
      let totalRefund = 0;

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
        if (billItem.billType) return billItem.billType;
        if (billItem.isReassignment || billItem.reassignmentId) return 'Reassignment';
        if (billItem.consultationType && billItem.consultationType.startsWith('superconsultant')) return 'Superconsultant';
        if (billItem.consultationType === 'followup') return 'Followup';
        if (billItem.consultationType === 'IP') return 'IP Consultation';
        if (billItem.consultationType === 'OP') return 'OP Consultation';
        if (billItem.type === 'service') return 'Service Charge';
        if (billItem.type === 'registration') return 'Registration';
        if (billItem.type === 'consultation') return 'Consultation';
        return 'Consultation';
      };

      bills.forEach((bill) => {
        const billDate = getSafeDate(bill.date || bill.createdAt);
        const isOldBill = startDateObj && billDate && billDate < startDateObj;
        const patientUhId = bill.uhId || bill.patient?.uhId || bill.patientUHID || bill.patient?.patientUHID || bill.patient?.patientId || bill.patient?.uhid || bill.patientId?.uhId || bill.patientId || 'N/A';
        const patientName = bill.patientName || bill.patient?.name || bill.patient?.fullName || bill.patientId?.name || 'N/A';
        const billConsultationType = bill.consultationType || 'OP';
        const billType = getBillType(bill);
        let hasPaymentEntry = false;

        if (consultationType !== 'both' && consultationType && billConsultationType !== consultationType) {
          return;
        }

        const pushPayment = (payment, fallbackDate) => {
          const paymentDate = payment?.date || payment?.paidAt || payment?.createdAt || fallbackDate;
          if (!isWithinRange(paymentDate)) return;

          const method = payment?.paymentMethod || payment?.method || bill.paymentMethod;
          const bucket = getPaymentBucket(method);
          const amount = Number(payment?.amount || payment?.paidAmount || payment?.total || bill?.paidAmount || 0);
          if (amount === undefined || amount === null) return;

          const paymentUserName = payment?.processedByName || payment?.processedBy?.name || payment?.createdByName || payment?.createdBy?.name || payment?.collectedByName || payment?.collectedBy?.name || payment?.handledBy?.name;
          const billUserName = bill.createdByName || bill.generatedByName || bill.collectedByName || bill.collectedBy?.name || bill.handledByName || bill.processedByName || bill.createdBy?.name;

          if (isOldBill) {
            if (bucket === 'cash') duesCollectedInCash += amount;
            else if (bucket === 'card') duesCollectedInCard += amount;
            else if (bucket === 'upi') duesCollectedInUPI += amount;
            else if (bucket === 'neft') duesCollectedInNEFT += amount;
          } else {
            if (bucket === 'cash') amountCollectedInCash += amount;
            else if (bucket === 'card') amountCollectedInCard += amount;
            else if (bucket === 'upi') amountCollectedInUPI += amount;
            else if (bucket === 'neft') amountCollectedInNEFT += amount;
          }

          payments.push({
            date: paymentDate,
            patientId: patientUhId,
            patientName,
            userName: paymentUserName || billUserName || 'N/A',
            receiptNumber: payment?.receiptNumber || payment?.receiptNo || payment?.receipt_no || payment?.reference || bill.invoiceNumber || bill.billNo || 'N/A',
            payMode: formatPayMode(method, payment?.paymentReference || payment?.referenceId || payment?.transactionId || payment?.reference),
            amount,
            billType
          });
          hasPaymentEntry = true;
        };

        if (Array.isArray(bill.paymentHistory) && bill.paymentHistory.length > 0) {
          bill.paymentHistory.forEach((payment) => pushPayment(payment, billDate || bill.createdAt));
        } else if (bill.status === 'paid' || bill.status === 'completed') {
          pushPayment({ ...bill, amount: bill.paidAmount || bill.amount }, billDate);
        }

        if (!hasPaymentEntry && isWithinRange(billDate)) {
          const fallbackAmount = Number(bill.paidAmount || 0);
          const fallbackMethod = bill.paymentMethod || 'cash';
          const fallbackUserName = bill.createdByName || bill.generatedByName || bill.collectedByName || bill.collectedBy?.name || bill.handledByName || bill.processedByName || bill.createdBy?.name || 'N/A';

          if (fallbackAmount > 0) {
            const bucket = getPaymentBucket(fallbackMethod);
            if (isOldBill) {
              if (bucket === 'cash') duesCollectedInCash += fallbackAmount;
              else if (bucket === 'card') duesCollectedInCard += fallbackAmount;
              else if (bucket === 'upi') duesCollectedInUPI += fallbackAmount;
              else if (bucket === 'neft') duesCollectedInNEFT += fallbackAmount;
            } else {
              if (bucket === 'cash') amountCollectedInCash += fallbackAmount;
              else if (bucket === 'card') amountCollectedInCard += fallbackAmount;
              else if (bucket === 'upi') amountCollectedInUPI += fallbackAmount;
              else if (bucket === 'neft') amountCollectedInNEFT += fallbackAmount;
            }

            payments.push({
              date: billDate,
              patientId: patientUhId,
              patientName,
              userName: fallbackUserName,
              receiptNumber: bill.invoiceNumber || bill.billNo || 'N/A',
              payMode: formatPayMode(fallbackMethod, bill.paymentReference),
              amount: fallbackAmount,
              billType
            });
            hasPaymentEntry = true;
          } else if (['cancelled', 'refunded', 'partially_refunded'].includes(bill.status)) {
            payments.push({
              date: billDate,
              patientId: patientUhId,
              patientName,
              userName: fallbackUserName,
              receiptNumber: bill.invoiceNumber || bill.billNo || 'N/A',
              payMode: formatPayMode(fallbackMethod, bill.paymentReference),
              amount: 0,
              billType
            });
          }
        }

        const handleRefundEntry = (refund) => {
          const refundDate = refund?.processedAt || refund?.date || refund?.createdAt;
          if (!isWithinRange(refundDate)) return;
          const refundAmount = Number(refund?.amount || refund?.refundAmount || 0);
          if (!refundAmount) return;
          totalRefund += refundAmount;

          const refundUserName = refund?.processedByName || refund?.refundedByName || refund?.handledByName || refund?.processedBy?.name || refund?.refundedBy?.name || bill.refundedByName || bill.refundedBy?.name;

          refunds.push({
            date: refundDate,
            patientId: patientUhId,
            patientName,
            userName: refundUserName || 'N/A',
            receiptNumber: refund?.receiptNumber || refund?.refundReceiptNumber || refund?.reference || refund?.transactionId || '-',
            payMode: formatPayMode(refund?.paymentMethod || refund?.mode || refund?.refundMethod, refund?.reference || refund?.transactionId),
            amount: refundAmount,
            billType
          });
        };

        if (Array.isArray(bill.refunds) && bill.refunds.length > 0) {
          bill.refunds.forEach(handleRefundEntry);
        }

        if (!Array.isArray(bill.refunds) && bill.refundedAmount) {
          handleRefundEntry({
            amount: bill.refundedAmount,
            processedAt: bill.refundProcessedAt || bill.updatedAt,
            processedByName: bill.refundedByName,
            paymentMethod: bill.refundMethod
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
        duesCollectedInCash,
        duesCollectedInCard,
        duesCollectedInUPI,
        duesCollectedInNEFT,
        totalRefund,
        totalCollected
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
  }, [consultationType, dateRange.endDate, dateRange.startDate]);

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

  const handleExport = () => {
    const headerTitle = `Daily Collection ${formatDateDisplay(dateRange.startDate)} to ${formatDateDisplay(dateRange.endDate)} ${consultationLabel}`;
    const refundTitle = `Today's Refund Report ${formatDateDisplay(dateRange.startDate)} to ${formatDateDisplay(dateRange.endDate)} ${consultationLabel}`;

    const csvRows = [];
    csvRows.push([headerTitle]);
    csvRows.push([]);
    csvRows.push(['S.No.', 'Date', 'Patient Id', 'Patient Name', 'User Name', 'Receipt Number', 'Pay Mode', 'Bill Type', 'Amount']);
    collectionData.forEach((item, index) => {
      csvRows.push([
        index + 1,
        formatDateTime(item.date),
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
    csvRows.push(['S.No.', 'Date', 'Patient Id', 'Patient Name', 'User Name', 'Receipt Number', 'Pay Mode', 'Bill Type', 'Amount']);
    refundData.forEach((item, index) => {
      csvRows.push([
        index + 1,
        formatDateTime(item.date),
        item.patientId,
        item.patientName,
        item.userName,
        item.receiptNumber,
        item.payMode,
        item.billType,
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
      'Dues Collected In Cash',
      'Dues Collected In Card',
      'Dues Collected In UPI',
      'Dues Collected In NEFT/IMPS',
      'Refund (Total)',
      'Total (Exclud Refu)'
    ]);
    csvRows.push([
      summary.amountCollectedInCash.toFixed(2),
      summary.amountCollectedInCard.toFixed(2),
      summary.amountCollectedInUPI.toFixed(2),
      summary.amountCollectedInNEFT.toFixed(2),
      summary.duesCollectedInCash.toFixed(2),
      summary.duesCollectedInCard.toFixed(2),
      summary.duesCollectedInUPI.toFixed(2),
      summary.duesCollectedInNEFT.toFixed(2),
      summary.totalRefund.toFixed(2),
      (summary.totalCollected - summary.totalRefund).toFixed(2)
    ]);

    const csvContent = csvRows
      .map((row) => row.map((cell) => typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receptionist_daily_collection_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Report exported successfully');
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
              <h1 className="text-lg sm:text-xl font-bold text-slate-800">Receptionist Collection Report</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Daily Collection {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)} ({consultationLabel})
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
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
              Daily Collection {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)} ({consultationLabel})
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">User Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receipt Number</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Pay Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Bill Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading collection data...
                    </td>
                  </tr>
                ) : collectionPaginated.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-sm text-slate-500">
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
              Today's Refund Report {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)} ({consultationLabel})
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">User Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receipt Number</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Pay Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Bill Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading refund data...
                    </td>
                  </tr>
                ) : refundPaginated.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-sm text-slate-500">
                      No refund entries found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  refundPaginated.map((item, index) => {
                    const serial = (refundPage - 1) * refundItemsPerPage + index + 1;
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Dues Collected In Cash</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Dues Collected In Card</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Dues Collected In UPI</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Dues Collected In NEFT/IMPS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInCash.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInCard.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInUPI.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-green-600">{summary.amountCollectedInNEFT.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-blue-600">{summary.duesCollectedInCash.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-blue-600">{summary.duesCollectedInCard.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-blue-600">{summary.duesCollectedInUPI.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-blue-600">{summary.duesCollectedInNEFT.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Refund (Total)</p>
              <p className="text-base font-semibold text-red-600">{summary.totalRefund.toFixed(2)}</p>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Total Amount Collected</p>
              <p className="text-base font-semibold text-green-600">{summary.totalCollected.toFixed(2)}</p>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Total (Exclud Refu)</p>
              <p className="text-base font-semibold text-green-700">{(summary.totalCollected - summary.totalRefund).toFixed(2)}</p>
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

