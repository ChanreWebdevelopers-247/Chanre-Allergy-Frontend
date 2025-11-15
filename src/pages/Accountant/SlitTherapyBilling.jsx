import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import AccountantLayout from './AccountantLayout';
import API from '../../services/api';
import { API_CONFIG } from '../../config/environment';
import {
  fetchReceptionistSlitTherapyRequests,
  createReceptionistSlitTherapyRequest,
  markReceptionistSlitTherapyPaid,
  closeReceptionistSlitTherapyRequest,
  cancelReceptionistSlitTherapyRequest,
  refundReceptionistSlitTherapyRequest
} from '../../features/slitTherapy/slitTherapyThunks';
import {
  fetchReceptionistPatients
} from '../../features/receptionist/receptionistThunks';
import { roundToNearestTen } from '../../utils/rounding';

const resolveInvoiceTimestamp = (invoice, fallback) => {
  if (!invoice) return fallback || null;

  const billingEntry = invoice.billing || invoice.currentBilling || {};
  const billingArray = Array.isArray(invoice.billing) ? invoice.billing : [];
  const firstWithGeneratedAt = billingArray.find((entry) => entry?.generatedAt);
  const firstEntry = billingArray[0];

  return (
    invoice.generatedAt ||
    invoice.createdAt ||
    billingEntry?.generatedAt ||
    billingEntry?.createdAt ||
    billingEntry?.updatedAt ||
    firstWithGeneratedAt?.generatedAt ||
    firstEntry?.createdAt ||
    fallback ||
    null
  );
};

const SLIT_PRODUCTS = [
  { code: 'SLIT001', name: 'SLIT001', description: 'SLIT Therapy Product 001', price: 6000 },
  { code: 'SLIT002', name: 'SLIT002', description: 'SLIT Therapy Product 002', price: 10000 },
  { code: 'SLIT003', name: 'SLIT003', description: 'SLIT Therapy Product 003', price: 7000 }
];

const DEFAULT_COURIER_FEE = 100;

const paymentMethods = ['Cash', 'Card', 'UPI', 'Net Banking', 'NEFT'];
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const formatCurrency = (value = 0) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
};

const formatStatus = (value) => (value ? value.replace(/_/g, ' ') : '—');

const resolveLogoUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${API_CONFIG.BASE_URL}${normalized}`;
};

const resolveCenterLogo = (data, previous = '') => {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'logoUrl')) {
    return previous;
  }
  return data.logoUrl ? resolveLogoUrl(data.logoUrl) : '';
};

const defaultNewRequest = {
  patientId: '',
  patientName: '',
  patientPhone: '',
  patientEmail: '',
  patientCode: '',
  productCode: SLIT_PRODUCTS[0].code,
  quantity: 1,
  courierRequired: false,
  courierFee: DEFAULT_COURIER_FEE,
  deliveryMethod: 'pickup',
  notes: ''
};

const defaultPaymentDetails = {
  paymentMethod: 'Cash',
  transactionId: '',
  paymentNotes: '',
  paymentAmount: ''
};

export default function SlitTherapyBilling() {
  const dispatch = useDispatch();
  const {
    receptionist: {
      requests: slitTherapyRequests = [],
      loading: slitRequestsLoading,
      error: slitError,
    },
    mutation: {
      loading: mutationLoading,
      error: mutationError,
    },
  } = useSelector((state) => state.slitTherapy);
  const { patients = [], loading: receptionistLoading } = useSelector((state) => state.receptionist);
  const { user } = useSelector((state) => state.auth);
  const loading = slitRequestsLoading || mutationLoading || receptionistLoading;

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [newRequest, setNewRequest] = useState(defaultNewRequest);

  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(defaultPaymentDetails);

  const [selectedForClose, setSelectedForClose] = useState(null);
  const [closeRemarks, setCloseRemarks] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);
  const [invoiceRequest, setInvoiceRequest] = useState(null);
  const [centerInfo, setCenterInfo] = useState({
    name: 'ChanRe Allergy Center',
    address: 'Rajajinagar, Bengaluru',
    phone: '080-42516699',
    fax: '080-42516600',
    website: 'www.chanreallergy.com',
    labWebsite: 'www.chanrelabresults.com',
    missCallNumber: '080-42516666',
    mobileNumber: '9686197153',
    logoUrl: ''
  });

  const getCenterId = () => {
    if (user?.centerId) {
      if (typeof user.centerId === 'object' && user.centerId._id) {
        return user.centerId._id;
      }
      if (typeof user.centerId === 'string') {
        return user.centerId;
      }
    }
    const storedCenterId = typeof window !== 'undefined' ? localStorage.getItem('centerId') : null;
    if (storedCenterId) return storedCenterId;
    return null;
  };

  useEffect(() => {
    const fetchCenterInfo = async () => {
      const centerId = getCenterId();
      if (!centerId) return;

      try {
        const response = await API.get(`/centers/${centerId}`);
        const center = response.data?.data || response.data || response;
        setCenterInfo((prev) => ({
          ...prev,
          name: center?.name || prev.name,
          address: center?.address || prev.address,
          phone: center?.phone || prev.phone,
          fax: center?.fax || prev.fax,
          website: center?.website || prev.website,
          labWebsite: center?.labWebsite || prev.labWebsite,
          missCallNumber: center?.missCallNumber || prev.missCallNumber,
          mobileNumber: center?.mobileNumber || prev.mobileNumber,
          logoUrl: resolveCenterLogo(center, prev.logoUrl)
        }));
      } catch (error) {
        console.error('Error fetching center info:', error);
      }
    };

    fetchCenterInfo();
  }, [user]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedForCancel, setSelectedForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedForRefund, setSelectedForRefund] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [refundNotes, setRefundNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  const selectedProduct = useMemo(
    () => SLIT_PRODUCTS.find((product) => product.code === newRequest.productCode) || SLIT_PRODUCTS[0],
    [newRequest.productCode]
  );

  const computedTotal = useMemo(() => {
    const base = selectedProduct.price * Number(newRequest.quantity || 1);
    const courier = newRequest.courierRequired ? Number(newRequest.courierFee || DEFAULT_COURIER_FEE) : 0;
    return base + courier;
  }, [newRequest.quantity, newRequest.courierRequired, newRequest.courierFee, selectedProduct.price]);

  useEffect(() => {
    dispatch(fetchReceptionistSlitTherapyRequests());
    if (!patients || patients.length === 0) {
      dispatch(fetchReceptionistPatients());
    }
  }, [dispatch]);

  useEffect(() => {
    if (slitError) {
      toast.error(slitError);
    }
  }, [slitError]);

  useEffect(() => {
    if (mutationError) {
      toast.error(mutationError);
    }
  }, [mutationError]);

  const filteredRequests = useMemo(() => {
    const list = slitTherapyRequests || [];
    return list.filter((req) => {
      const matchStatus = statusFilter === 'all' || req.status === statusFilter;
      const matchSearch = !searchTerm
        || req.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
        || req.patientPhone?.includes(searchTerm)
        || req.billing?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [slitTherapyRequests, statusFilter, searchTerm]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil((filteredRequests.length || 0) / pageSize);
    return pages > 0 ? pages : 1;
  }, [filteredRequests.length, pageSize]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetNewRequest = () => {
    setNewRequest(defaultNewRequest);
    setPatientSuggestions([]);
    setSelectedPatientId('');
    setActiveSuggestionField(null);
  };

  const handleSelectPatient = (patient) => {
    if (!patient) return;
    setSelectedPatientId(patient._id || '');
    setNewRequest((prev) => ({
      ...prev,
      patientId: patient._id || '',
      patientName: patient.name || '',
      patientPhone: patient.phone || '',
      patientEmail: patient.email || '',
      patientCode: patient.uhId || patient.patientCode || prev.patientCode || ''
    }));
    setPatientSuggestions([]);
    setActiveSuggestionField(null);
  };

  const buildPatientSuggestions = (value) => {
    const query = value?.trim().toLowerCase();
    if (!query || query.length < 3) {
      setPatientSuggestions([]);
      return;
    }

    const matches = (patients || []).filter((patient) => {
      const nameMatch = patient.name?.toLowerCase().includes(query);
      const phoneMatch = patient.phone?.toLowerCase().includes(query);
      const codeMatch = patient.uhId?.toLowerCase().includes(query) || patient.patientCode?.toLowerCase().includes(query);
      const idMatch = patient._id?.toLowerCase().includes(query);
      return nameMatch || phoneMatch || codeMatch || idMatch;
    });

    setPatientSuggestions(matches.slice(0, 10));
  };

  const handlePatientNameChange = (e) => {
    const value = e.target.value;
    setNewRequest((prev) => ({ ...prev, patientName: value }));

    if (selectedPatientId && patients.find((p) => p._id === selectedPatientId)?.name !== value) {
      setSelectedPatientId('');
    }

    setActiveSuggestionField('name');
    buildPatientSuggestions(value);
  };

  const handlePatientIdChange = (e) => {
    const value = e.target.value.trim();
    setNewRequest((prev) => ({ ...prev, patientId: value }));
    setSelectedPatientId('');
    setActiveSuggestionField('id');
    buildPatientSuggestions(value);

    if (value.length === 24) {
      const exact = patients.find((patient) => patient._id?.toLowerCase() === value.toLowerCase());
      if (exact) {
        handleSelectPatient(exact);
      }
    }
  };

  const handlePatientCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    setNewRequest((prev) => ({ ...prev, patientCode: value }));
    setSelectedPatientId('');
    setActiveSuggestionField('code');
    buildPatientSuggestions(value);

    if (value.length >= 3) {
      const exact = patients.find((patient) => patient.uhId?.toLowerCase() === value.toLowerCase() || patient.patientCode?.toLowerCase() === value.toLowerCase());
      if (exact && exact._id !== selectedPatientId) {
        handleSelectPatient(exact);
      }
    }
  };

  const handlePatientPhoneChange = (e) => {
    const value = e.target.value;
    setNewRequest((prev) => ({ ...prev, patientPhone: value }));
    if (!selectedPatientId) {
      setActiveSuggestionField('phone');
      buildPatientSuggestions(value);
    }
  };

  const handlePatientEmailChange = (e) => {
    const value = e.target.value;
    setNewRequest((prev) => ({ ...prev, patientEmail: value }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!newRequest.patientName.trim()) {
      toast.error('Please enter patient name');
      return;
    }

    if (!newRequest.patientPhone.trim()) {
      toast.error('Please enter patient phone number');
      return;
    }

    try {
      await dispatch(createReceptionistSlitTherapyRequest({
        ...newRequest,
        quantity: Number(newRequest.quantity || 1),
        courierFee: newRequest.courierRequired ? Number(newRequest.courierFee || DEFAULT_COURIER_FEE) : 0
      })).unwrap();

      toast.success('SLIT therapy billing created');
      setShowNewRequestModal(false);
      resetNewRequest();
    } catch (error) {
      toast.error(error || 'Failed to create SLIT therapy request');
    }
  };

  const openPaymentModal = (request) => {
    const roundedAmount = roundToNearestTen(Number(request.billing?.amount || 0));
    setSelectedForPayment(request);
    setPaymentDetails({
      paymentMethod: 'Cash',
      transactionId: '',
      paymentNotes: '',
      paymentAmount: roundedAmount.toFixed(2)
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedForPayment) return;

    try {
      const totalAmount = roundToNearestTen(Number(selectedForPayment.billing?.amount || 0));
      await dispatch(markReceptionistSlitTherapyPaid({
        id: selectedForPayment._id,
        payload: {
          paymentMethod: paymentDetails.paymentMethod,
          transactionId: paymentDetails.transactionId,
          paymentNotes: paymentDetails.paymentNotes,
          paymentAmount: totalAmount
        }
      })).unwrap();

      toast.success('Payment recorded successfully');
      setSelectedForPayment(null);
      setPaymentDetails(defaultPaymentDetails);
    } catch (error) {
      toast.error(error || 'Failed to record payment');
    }
  };

  const openCloseModal = (request) => {
    setSelectedForClose(request);
    setCloseRemarks('');
  };

  const handleCloseRequest = async (e) => {
    e.preventDefault();
    if (!selectedForClose) return;

    try {
      await dispatch(closeReceptionistSlitTherapyRequest({
        id: selectedForClose._id,
        payload: { remarks: closeRemarks }
      })).unwrap();

      toast.success('SLIT therapy request received');
      setSelectedForClose(null);
      setCloseRemarks('');
    } catch (error) {
      toast.error(error || 'Failed to receive SLIT therapy request');
    }
  };

  const openInvoiceModal = (request) => {
    setInvoiceRequest(request);
    setShowInvoiceModal(true);
  };

  const closeInvoiceModal = () => {
    setInvoiceRequest(null);
    setShowInvoiceModal(false);
  };

  const buildInvoiceItems = (request) => {
    if (!request) return [];
    const items = Array.isArray(request.billing?.items) ? request.billing.items : [];
    if (items.length > 0) {
      return items;
    }

    const total = request.billing?.amount || (Number(request.productPrice) || 0) * Number(request.quantity || 1);
    return [{
      name: request.productName || request.productCode,
      code: request.productCode,
      quantity: request.quantity || 1,
      unitPrice: request.productPrice || total,
      total
    }];
  };

  const handleDownloadInvoice = (request) => {
    const invoiceData = request || invoiceRequest;
    if (!invoiceData) {
      toast.error('No invoice data available');
      return;
    }

    const invoiceWindow = window.open('', 'PRINT', 'height=720,width=1024');
    if (!invoiceWindow) {
      toast.error('Please allow pop-ups to download the invoice');
      return;
    }

    const items = buildInvoiceItems(invoiceData);
    const rows = items.map((item, index) => `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:14px;">${index + 1}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:14px;">${item.name || '-'}<br/><small>${item.code || ''}</small></td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-size:14px;">${item.quantity || 1}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-size:14px;">₹${Number(item.unitPrice || 0).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-size:14px;">₹${Number(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const createdTimestamp = resolveInvoiceTimestamp(invoiceData);
    const createdAt = createdTimestamp ? new Date(createdTimestamp).toLocaleString() : 'Not Available';
    const paidAt = invoiceData.billing?.paidAt ? new Date(invoiceData.billing.paidAt).toLocaleString() : 'Not Paid';
    const courierText = invoiceData.courierRequired ? `Yes (₹${Number(invoiceData.courierFee || DEFAULT_COURIER_FEE).toFixed(2)})` : 'No';
    const rawTotalAmount = Number(invoiceData.billing?.amount || 0);
    const rawPaidAmount = Number(invoiceData.billing?.paidAmount || 0);
    const totalAmount = roundToNearestTen(rawTotalAmount).toFixed(2);
    const paidAmount = roundToNearestTen(rawPaidAmount).toFixed(2);
    const balance = Math.max(0, roundToNearestTen(rawTotalAmount) - roundToNearestTen(rawPaidAmount)).toFixed(2);

    const centerName = centerInfo.name || 'ChanRe Allergy Center';
    const centerAddress = centerInfo.address || '';
    const centerPhone = centerInfo.phone || '';
    const centerFax = centerInfo.fax || '';
    const centerWebsite = centerInfo.website || '';
    const centerMissCall = centerInfo.missCallNumber || '';
    const centerMobile = centerInfo.mobileNumber || '';
    const logoTag = centerInfo.logoUrl
      ? `<img src="${centerInfo.logoUrl}" alt="${centerName} logo" style="height:64px;width:64px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;padding:6px;background:#fff;" />`
      : '';

    invoiceWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceData.billing?.invoiceNumber || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin-bottom: 4px; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            .section { margin-top: 16px; }
          </style>
        </head>
        <body style="font-family: Arial, sans-serif;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:16px;">
              ${logoTag}
              <div>
                <h1 style="margin:0;font-size:22px;color:#0f172a;text-transform:uppercase;letter-spacing:1px;">${centerName}</h1>
                ${centerAddress ? `<p style="margin:4px 0;font-size:14px;color:#475569;">${centerAddress}</p>` : ''}
                <p style="margin:2px 0;font-size:12px;color:#475569;">
                  <strong>Phone:</strong> ${centerPhone || '—'}${centerFax ? ` | <strong>Fax:</strong> ${centerFax}` : ''}
                </p>
                ${centerWebsite ? `<p style="margin:2px 0;font-size:12px;color:#475569;"><strong>Website:</strong> ${centerWebsite}</p>` : ''}
              </div>
            </div>
            <div style="text-align:right;font-size:12px;color:#1f2937;">
              <p style="margin:0;font-size:18px;font-weight:600;text-transform:uppercase;color:#2563eb;">SLIT Therapy Invoice</p>
              <p style="margin:4px 0;"><strong>No:</strong> ${invoiceData.billing?.invoiceNumber || 'Pending'}</p>
              <p style="margin:4px 0;"><strong>Created:</strong> ${createdAt}</p>
              <p style="margin:4px 0;"><strong>Status:</strong> ${invoiceData.status || 'Billing_Generated'}</p>
            </div>
          </div>
          <div class="section" style="margin-top:16px;">
            <h2 style="font-size:16px;margin-bottom:8px;color:#0f172a;">Patient Details</h2>
            <p style="margin:2px 0;font-size:13px;color:#1f2937;"><strong>Name:</strong> ${invoiceData.patientName || '-'}</p>
            <p style="margin:2px 0;font-size:13px;color:#1f2937;"><strong>Phone:</strong> ${invoiceData.patientPhone || '-'}</p>
            <p style="margin:2px 0;font-size:13px;color:#1f2937;"><strong>Email:</strong> ${invoiceData.patientEmail || '-'}</p>
            <p style="margin:2px 0;font-size:13px;color:#1f2937;"><strong>Patient Code:</strong> ${invoiceData.patientCode || '-'}</p>
          </div>
          <div class="section" style="margin-top:16px;">
            <h2 style="font-size:16px;margin-bottom:8px;color:#0f172a;">Order Details</h2>
            <p style="margin:2px 0;font-size:13px;color:#1f2937;"><strong>Delivery Method:</strong> ${invoiceData.deliveryMethod || 'pickup'}</p>
            <p style="margin:2px 0;font-size:13px;color:#1f2937;"><strong>Courier Required:</strong> ${courierText}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">#</th>
                <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:left;">Item</th>
                <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:center;">Qty</th>
                <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:right;">Unit Price</th>
                <th style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="section" style="margin-top:16px;font-size:13px;color:#1f2937;">
            <p style="margin:2px 0;"><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <p style="margin:2px 0;"><strong>Paid Amount:</strong> ₹${paidAmount}</p>
            <p style="margin:2px 0;"><strong>Balance:</strong> ₹${balance}</p>
            <p style="margin:2px 0;"><strong>Paid At:</strong> ${paidAt}</p>
            <p style="margin:2px 0;"><strong>Payment Method:</strong> ${invoiceData.billing?.paymentMethod || '-'}</p>
            <p style="margin:2px 0;"><strong>Transaction ID:</strong> ${invoiceData.billing?.transactionId || '-'}</p>
          </div>
          ${invoiceData.billing?.refundAmount ? `<div class="section"><h2>Refund Details</h2><p><strong>Refund Amount:</strong> ₹${Number(invoiceData.billing.refundAmount).toFixed(2)}</p><p><strong>Refund Method:</strong> ${invoiceData.billing?.refundMethod || '-'}</p><p><strong>Refund Notes:</strong> ${invoiceData.billing?.refundNotes || '-'}</p><p><strong>Refunded At:</strong> ${invoiceData.billing?.refundedAt ? new Date(invoiceData.billing.refundedAt).toLocaleString() : '-'}</p></div>` : ''}
          <div class="section" style="margin-top:32px;font-size:12px;color:#475569;">
            <p>Generated by ${centerName}</p>
            ${(centerMissCall || centerMobile) ? `<p style="margin-top:4px;">Missed Call: ${centerMissCall || '—'}${centerMobile ? ` | Mobile: ${centerMobile}` : ''}</p>` : ''}
          </div>
        </body>
      </html>`);

    invoiceWindow.document.close();
    invoiceWindow.focus();
    setTimeout(() => {
      invoiceWindow.print();
      invoiceWindow.close();
    }, 200);
  };

  const openCancelModal = (request) => {
    setSelectedForCancel(request);
    setCancelReason(request.billing?.cancellationReason || '');
  };

  const closeCancelModal = () => {
    setSelectedForCancel(null);
    setCancelReason('');
    setProcessingAction(false);
  };

  const handleCancelRequest = async (e) => {
    e.preventDefault();
    if (!selectedForCancel) return;

    try {
      setProcessingAction(true);
      await dispatch(
        cancelReceptionistSlitTherapyRequest({
          id: selectedForCancel._id,
          payload: { reason: cancelReason },
        })
      ).unwrap();
      toast.success('SLIT therapy billing cancelled');
      closeCancelModal();
    } catch (error) {
      const message = error?.message || error || 'Failed to cancel billing';
      toast.error(message);
    } finally {
      setProcessingAction(false);
    }
  };

  const openRefundModal = (request) => {
    setSelectedForRefund(request);
    const paid = Number(request?.billing?.paidAmount || 0);
    setRefundAmount(paid ? paid.toFixed(2) : '');
    setRefundMethod('Cash');
    setRefundNotes('');
  };

  const closeRefundModal = () => {
    setSelectedForRefund(null);
    setRefundAmount('');
    setRefundMethod('Cash');
    setRefundNotes('');
    setProcessingAction(false);
  };

  const handleRefundRequest = async (e) => {
    e.preventDefault();
    if (!selectedForRefund) return;

    const amountValue = Number(refundAmount);
    if (!amountValue || amountValue <= 0) {
      toast.error('Enter a valid refund amount');
      return;
    }

    try {
      setProcessingAction(true);
      await dispatch(
        refundReceptionistSlitTherapyRequest({
          id: selectedForRefund._id,
          payload: {
            amount: amountValue,
            method: refundMethod,
            notes: refundNotes,
          },
        })
      ).unwrap();
      toast.success('Refund processed successfully');
      closeRefundModal();
    } catch (error) {
      const message = error?.message || error || 'Failed to process refund';
      toast.error(message);
    } finally {
      setProcessingAction(false);
    }
  };

  const renderStatusBadge = (status) => {
    if (!status) return null;
    const styles = {
      Billing_Generated: 'bg-yellow-100 text-yellow-800',
      Billing_Paid: 'bg-blue-100 text-blue-800',
      Lab_Received: 'bg-purple-100 text-purple-800',
      Ready: 'bg-green-100 text-green-800',
      Delivered: 'bg-teal-100 text-teal-800',
      Received: 'bg-gray-100 text-gray-800',
      Cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const renderLabStatus = (labStatus) => (
    <span className="text-sm text-slate-600">
      SLIT Therapy Status: <span className="font-medium capitalize">{labStatus || 'pending'}</span>
    </span>
  );

  return (
    <AccountantLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            {centerInfo.logoUrl && (
              <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
                <img
                  src={centerInfo.logoUrl}
                  alt={`${centerInfo.name || 'Center'} logo`}
                  className="object-contain max-h-full max-w-full p-1"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-800">SLIT Therapy Billing</h1>
              <p className="text-slate-500">Create and track SLIT therapy billing requests and deliveries.</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
          >
            + New SLIT Therapy Request
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-slate-600 mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="Billing_Generated">Billing Generated</option>
              <option value="Billing_Paid">Billing Paid</option>
              <option value="Lab_Received">SLIT Therapy Received</option>
              <option value="Ready">Ready</option>
              <option value="Delivered">Delivered</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-600 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by patient, phone, or invoice number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading && (
            <div className="p-6 text-center text-slate-500">Loading SLIT therapy requests...</div>
          )}

          {!loading && filteredRequests.length === 0 && (
            <div className="p-6 text-center text-slate-500">No SLIT therapy requests found.</div>
          )}

          {!loading && filteredRequests.length > 0 && (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold text-slate-800">
                    {Math.min((currentPage - 1) * pageSize + 1, filteredRequests.length)}
                  </span>
                  {' '}to{' '}
                  <span className="font-semibold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredRequests.length)}
                  </span>
                  {' '}of{' '}
                  <span className="font-semibold text-slate-800">{filteredRequests.length}</span> requests
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statuses</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {paginatedRequests.map((request) => {
                      const totalAmount = roundToNearestTen(request.billing?.amount || 0);
                      const paidAmount = roundToNearestTen(request.billing?.paidAmount || 0);
                      const balance = Math.max(0, totalAmount - paidAmount);

                      return (
                        <tr key={request._id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 align-top">
                            <div className="text-sm font-semibold text-slate-800">{request.patientName}</div>
                            <div className="text-xs text-slate-500">{request.patientPhone || '—'}</div>
                            {request.patientCode && (
                              <div className="text-xs text-blue-600 font-medium">{request.patientCode}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-700">
                            <div className="font-medium text-slate-800">{request.billing?.invoiceNumber || 'Pending'}</div>
                            <div className="text-xs text-slate-500">Courier: {request.courierRequired ? `Yes (₹${request.courierFee})` : 'No'}</div>
                            {request.courierTrackingNumber && (
                              <div className="text-xs text-slate-500">Tracking: {request.courierTrackingNumber}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-700">
                            <div className="font-medium text-slate-800">{request.productName}</div>
                            <div className="text-xs text-slate-500">Code: {request.productCode}</div>
                            <div className="text-xs text-slate-500">Qty: {request.quantity}</div>
                          </td>
                          <td className="px-4 py-3 align-top text-right text-sm text-slate-700">
                            <div className="font-semibold text-slate-800">₹{totalAmount.toFixed(2)}</div>
                            <div className="text-xs text-emerald-600">Paid: ₹{paidAmount.toFixed(2)}</div>
                            {balance > 0 && (
                              <div className="text-xs text-rose-500">Due: ₹{balance.toFixed(2)}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-700 space-y-1">
                            {renderStatusBadge(request.status)}
                            <div className="text-xs text-slate-500">SLIT Therapy: <span className="font-semibold capitalize">{request.labStatus || 'pending'}</span></div>
                            <div className="text-xs text-slate-500">Billing: <span className="font-semibold">{request.billing?.status || 'generated'}</span></div>
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-slate-700">
                            <div>{new Date(request.createdAt).toLocaleString()}</div>
                            <div className="text-xs text-slate-500">Updated {new Date(request.updatedAt || request.createdAt).toLocaleString()}</div>
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-600">
                            {request.notes && (
                              <div className="mb-1">
                                <span className="font-semibold text-slate-700">Notes:</span> {request.notes}
                              </div>
                            )}
                            {request.labNotes && (
                              <div>
                                <span className="font-semibold text-slate-700">SLIT Therapy:</span> {request.labNotes}
                              </div>
                            )}
                            {!request.notes && !request.labNotes && <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  onClick={() => openInvoiceModal(request)}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownloadInvoice(request)}
                                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-md hover:border-indigo-400 hover:bg-indigo-50"
                                >
                                  Download
                                </button>
                                {request.status === 'Billing_Generated' && (
                                  <button
                                    onClick={() => openPaymentModal(request)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
                                  >
                                    Payment
                                  </button>
                                )}
                                {request.billing?.paidAmount > 0 && request.billing?.status === 'paid' && (request.status === 'Billing_Generated' || request.status === 'Billing_Paid') && (
                                  <button
                                    onClick={() => openRefundModal(request)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-md hover:bg-amber-600"
                                  >
                                    Refund
                                  </button>
                                )}
                                {(request.status === 'Billing_Generated' || request.status === 'Billing_Paid') && (
                                  <button
                                    onClick={() => openCancelModal(request)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 rounded-md hover:bg-rose-600"
                                  >
                                    Cancel
                                  </button>
                                )}
                                {request.status === 'Delivered' && (
                                  <button
                                    onClick={() => openCloseModal(request)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700"
                                  >
                                    Received
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                <div className="text-sm text-slate-600">
                  Page <span className="font-semibold text-slate-800">{currentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md border ${currentPage === 1 ? 'text-slate-400 border-slate-200 cursor-not-allowed bg-white' : 'text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-500">{filteredRequests.length ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredRequests.length)}` : '0 - 0'}</span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md border ${currentPage === totalPages ? 'text-slate-400 border-slate-200 cursor-not-allowed bg-white' : 'text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">Create SLIT Therapy Billing</h2>
              <button
                onClick={() => {
                  setShowNewRequestModal(false);
                  resetNewRequest();
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateRequest}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Patient ID (optional)</label>
                  <input
                    type="text"
                    value={newRequest.patientId}
                    onChange={handlePatientIdChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Link to existing patient"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Patient Code (optional)</label>
                  <input
                    type="text"
                    value={newRequest.patientCode}
                    onChange={handlePatientCodeChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Patient code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    value={newRequest.patientName}
                    onChange={handlePatientNameChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Patient Phone *</label>
                  <input
                    type="tel"
                    value={newRequest.patientPhone}
                    onChange={handlePatientPhoneChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Patient Email</label>
                  <input
                    type="email"
                    value={newRequest.patientEmail}
                    onChange={handlePatientEmailChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newRequest.quantity}
                    onChange={(e) => setNewRequest((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {patientSuggestions.length > 0 && (
                <div className="border border-blue-200 rounded-lg bg-blue-50/70 p-3 max-h-56 overflow-y-auto">
                  <p className="text-xs font-semibold text-blue-700 mb-2">
                    {activeSuggestionField === 'code'
                      ? 'Matching patients by code'
                      : activeSuggestionField === 'id'
                        ? 'Matching patients by ID'
                        : activeSuggestionField === 'phone'
                          ? 'Matching patients by phone'
                          : 'Matching patients'}
                  </p>
                  <div className="space-y-2">
                    {patientSuggestions.map((patient) => (
                      <button
                        key={patient._id}
                        type="button"
                        onClick={() => handleSelectPatient(patient)}
                        className="w-full text-left bg-white border border-blue-100 rounded-lg px-3 py-2 hover:border-blue-300 hover:bg-blue-100/70 transition"
                      >
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                          <span>{patient.name || 'Unnamed Patient'}</span>
                          {patient.uhId && <span className="text-blue-600">{patient.uhId}</span>}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-3">
                          {patient.phone && <span>📞 {patient.phone}</span>}
                          {patient.email && <span>✉️ {patient.email}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">SLIT Product</label>
                  <select
                    value={newRequest.productCode}
                    onChange={(e) => setNewRequest((prev) => ({ ...prev, productCode: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {SLIT_PRODUCTS.map((product) => (
                      <option key={product.code} value={product.code}>
                        {product.name} (₹{product.price})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Price auto-calculated based on selection.</p>
                </div>
                <div className="flex items-center space-x-3 border border-slate-200 rounded-lg px-3 py-2">
                  <input
                    id="courierRequired"
                    type="checkbox"
                    checked={newRequest.courierRequired}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNewRequest((prev) => ({
                        ...prev,
                        courierRequired: checked,
                        deliveryMethod: checked ? 'courier' : 'pickup'
                      }));
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <label htmlFor="courierRequired" className="text-sm font-medium text-slate-600">
                      Courier Delivery Required
                    </label>
                    {newRequest.courierRequired && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">Courier Fee:</span>
                        <input
                          type="number"
                          min="0"
                          value={newRequest.courierFee}
                          onChange={(e) => setNewRequest((prev) => ({ ...prev, courierFee: e.target.value }))}
                          className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
                <textarea
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any special instructions or details for SLIT therapy"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-slate-600">
                  <div>Product Price: <span className="font-semibold text-slate-800">₹{selectedProduct.price.toFixed(2)}</span></div>
                  <div>Quantity: <span className="font-semibold text-slate-800">{newRequest.quantity}</span></div>
                  {newRequest.courierRequired && (
                    <div>Courier Fee: <span className="font-semibold text-slate-800">₹{Number(newRequest.courierFee || DEFAULT_COURIER_FEE).toFixed(2)}</span></div>
                  )}
                </div>
                <div className="text-lg font-bold text-blue-600">Total: ₹{computedTotal.toFixed(2)}</div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRequestModal(false);
                    resetNewRequest();
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Create & Generate Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceRequest && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                {/* {centerInfo.logoUrl && (
                  <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
                    <img
                      src={centerInfo.logoUrl}
                      alt={`${centerInfo.name || 'Center'} logo`}
                      className="object-contain max-h-full max-w-full p-1"
                    />
                  </div>
                )} */}
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800">
                    {centerInfo.name || 'Invoice Details'}
                  </h2>
                  {centerInfo.address && (
                    <p className="text-xs text-slate-500 mt-1">{centerInfo.address}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Phone: {centerInfo.phone || '—'}
                    {centerInfo.fax ? ` • Fax: ${centerInfo.fax}` : ''}
                    {centerInfo.website ? ` • ${centerInfo.website}` : ''}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Invoice {invoiceRequest.billing?.invoiceNumber || 'Pending'} • Created{' '}
                    {formatDateTime(resolveInvoiceTimestamp(invoiceRequest, invoiceRequest?.createdAt))}
                  </p>
                </div>
              </div>
              <button onClick={closeInvoiceModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Patient Details</h3>
                <p className="mt-2 text-sm text-slate-700">{invoiceRequest.patientName || '-'}</p>
                <p className="text-sm text-slate-500">Phone: {invoiceRequest.patientPhone || '-'}</p>
                <p className="text-sm text-slate-500">Email: {invoiceRequest.patientEmail || '-'}</p>
                <p className="text-sm text-slate-500">Patient Code: {invoiceRequest.patientCode || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Billing Summary</h3>
                <p className="mt-2 text-sm text-slate-700">Status: {invoiceRequest.status?.replace(/_/g, ' ') || 'Billing Generated'}</p>
                <p className="text-sm text-slate-500">Payment Status: {invoiceRequest.billing?.status || 'generated'}</p>
                <p className="text-sm text-slate-500">Payment Method: {invoiceRequest.billing?.paymentMethod || '-'}</p>
                <p className="text-sm text-slate-500">Transaction ID: {invoiceRequest.billing?.transactionId || '-'}</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {buildInvoiceItems(invoiceRequest).map((item, index) => (
                    <tr key={`${item.code}-${index}`} className="border-t border-slate-200">
                      <td className="px-4 py-2 text-sm text-slate-600">{index + 1}</td>
                      <td className="px-4 py-2 text-sm text-slate-700">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.code}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700">₹{Number(item.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Amount</p>
                <p className="mt-1 text-lg font-bold text-slate-800">₹{Number(invoiceRequest.billing?.amount || 0).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-semibold">Paid Amount</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">₹{Number(invoiceRequest.billing?.paidAmount || 0).toFixed(2)}</p>
                <p className="text-xs text-slate-500">Paid At: {invoiceRequest.billing?.paidAt ? new Date(invoiceRequest.billing.paidAt).toLocaleString() : 'Not Paid'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-semibold">Balance</p>
                <p className="mt-1 text-lg font-bold text-amber-600">
                  ₹{Math.max(0, Number(invoiceRequest.billing?.amount || 0) - Number(invoiceRequest.billing?.paidAmount || 0)).toFixed(2)}
                </p>
              </div>
            </div>

            {invoiceRequest.billing?.refundAmount > 0 && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-emerald-700 uppercase">Refund Summary</h3>
                <p className="mt-1 text-sm text-emerald-700">Refund Amount: ₹{Number(invoiceRequest.billing.refundAmount).toFixed(2)}</p>
                <p className="text-xs text-emerald-600">Method: {invoiceRequest.billing?.refundMethod || '-'}</p>
                <p className="text-xs text-emerald-600">Notes: {invoiceRequest.billing?.refundNotes || '-'}</p>
                <p className="text-xs text-emerald-600">Refunded At: {invoiceRequest.billing?.refundedAt ? new Date(invoiceRequest.billing.refundedAt).toLocaleString() : '-'}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col md:flex-row md:justify-between gap-3">
              <div className="text-xs text-slate-500">
                Generated by {centerInfo.name || 'ChanRe Allergy Center'} • This invoice is valid without signature.
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeInvoiceModal}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownloadInvoice(invoiceRequest)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Download & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedForPayment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Record Payment</h2>
                <p className="text-sm text-slate-500">{selectedForPayment.patientName} • Invoice {selectedForPayment.billing?.invoiceNumber}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedForPayment(null);
                  setPaymentDetails(defaultPaymentDetails);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleRecordPayment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Payment Method</label>
                  <select
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentDetails.transactionId}
                    onChange={(e) => setPaymentDetails((prev) => ({ ...prev, transactionId: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional reference number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Payment Amount</label>
                  <input
                    type="text"
                    value={`₹${paymentDetails.paymentAmount}`}
                    readOnly
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700"
                  />
                  <p className="text-xs text-slate-500 mt-1">Partial payments are disabled for SLIT therapy. Collect the full billed amount at reception.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Payment Notes</label>
                  <input
                    type="text"
                    value={paymentDetails.paymentNotes}
                    onChange={(e) => setPaymentDetails((prev) => ({ ...prev, paymentNotes: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Any remarks"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedForPayment(null);
                    setPaymentDetails(defaultPaymentDetails);
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {selectedForCancel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Cancel SLIT Therapy Billing</h2>
                <p className="text-sm text-slate-500">Invoice {selectedForCancel.billing?.invoiceNumber || 'Pending'} • {selectedForCancel.patientName}</p>
              </div>
              <button onClick={closeCancelModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <form className="space-y-4" onSubmit={handleCancelRequest}>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cancellation Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Provide a brief reason for cancellation"
                  required
                />
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                Cancelling this billing will update the status for both receptionist and SLIT therapy dashboards. This action cannot be undone without creating a new billing.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCancelModal}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Keep Billing
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className={`px-4 py-2 rounded-lg font-semibold text-white ${processingAction ? 'bg-rose-300 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'}`}
                >
                  {processingAction ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {selectedForRefund && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Process Refund</h2>
                <p className="text-sm text-slate-500">Invoice {selectedForRefund.billing?.invoiceNumber || 'Pending'} • {selectedForRefund.patientName}</p>
              </div>
              <button onClick={closeRefundModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <form className="space-y-4" onSubmit={handleRefundRequest}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Refund Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">Paid amount: ₹{Number(selectedForRefund.billing?.paidAmount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Refund Notes</label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any remarks shared with the patient"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Processing a refund will update the billing status to refunded and record the transaction for audit purposes. Courier fees are refundable only if courier was not used.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRefundModal}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className={`px-4 py-2 rounded-lg font-semibold text-white ${processingAction ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}
                >
                  {processingAction ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {selectedForClose && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Close SLIT Therapy Request</h2>
                <p className="text-sm text-slate-500">Confirm delivery for {selectedForClose.patientName}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedForClose(null);
                  setCloseRemarks('');
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCloseRequest}>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Remarks</label>
                <textarea
                  value={closeRemarks}
                  onChange={(e) => setCloseRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional notes to store with closure"
                />
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                Confirm that the patient has collected the SLIT therapy package. This will mark the bill as Received in receptionist records.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedForClose(null);
                    setCloseRemarks('');
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700"
                >
                  Confirm & Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AccountantLayout>
  );
}

