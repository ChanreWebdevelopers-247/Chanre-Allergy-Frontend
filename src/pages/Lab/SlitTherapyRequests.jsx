import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, PackageCheck, CheckCircle2, Timer, Truck, Eye, FileDown } from 'lucide-react';
import { toast } from 'react-toastify';
import API, {
  getLabSlitTherapyRequests,
  updateSlitTherapyRequestStatus
} from '../../services/api';
import { viewPDFReport } from '../../utils/pdfHandler';

const STATUS_LABELS = {
  Billing_Generated: 'Awaiting Payment',
  Billing_Paid: 'Ready for Lab Intake',
  Lab_Received: 'In Lab Queue',
  Ready: 'Ready for Patient',
  Delivered: 'Out for Delivery / Pickup',
  Received: 'Completed & Archived',
  Cancelled: 'Request Cancelled'
};

const STATUS_COLORS = {
  Billing_Generated: 'bg-amber-100 text-amber-700',
  Billing_Paid: 'bg-blue-100 text-blue-700',
  Lab_Received: 'bg-purple-100 text-purple-700',
  Ready: 'bg-green-100 text-green-700',
  Delivered: 'bg-teal-100 text-teal-700',
  Received: 'bg-slate-100 text-slate-700',
  Cancelled: 'bg-rose-100 text-rose-700'
};
const AVAILABLE_FILTERS = ['All', 'Billing_Generated', 'Billing_Paid', 'Lab_Received', 'Ready', 'Delivered', 'Received', 'Cancelled'];
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const PROFILE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'history', label: 'History' },
  { key: 'tests', label: 'Tests' },
  { key: 'medications', label: 'Medications' },
  { key: 'followups', label: 'Follow Up' },
  { key: 'allergies', label: 'Allergy Reports' },
  { key: 'prescriptions', label: 'Prescriptions' }
];

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

const getStatusDescription = (request) => {
  const status = request.status;
  switch (status) {
    case 'Billing_Generated':
      return 'Awaiting payment confirmation at reception.';
    case 'Billing_Paid':
      return 'Payment confirmed. Package queued for lab intake.';
    case 'Lab_Received':
      return 'Lab has acknowledged the request and is preparing materials.';
    case 'Ready':
      return request.deliveryMethod === 'courier'
        ? 'Package packed and ready for courier dispatch.'
        : 'Package ready for patient pickup at center.';
    case 'Delivered':
      return request.deliveryMethod === 'courier'
        ? 'Courier out for delivery / delivered to patient.'
        : 'Patient collected the package; receptionist to close once confirmed.';
    case 'Received':
      return 'Reception confirmed delivery and received the package.';
    case 'Cancelled':
      return request.billing?.cancellationReason || 'Request was cancelled by reception.';
    default:
      return 'Status update pending.';
  }
};

export default function SlitTherapyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const navigate = useNavigate();
  const [reportModal, setReportModal] = useState({
    open: false,
    loading: false,
    error: null,
    items: [],
    patient: null
  });
  const [profileModal, setProfileModal] = useState({
    open: false,
    loading: false,
    error: null,
    activeTab: 'overview',
    patient: null,
    history: [],
    tests: [],
    medications: [],
    followUps: [],
    allergies: {
      rhinitis: [],
      conjunctivitis: [],
      bronchitis: [],
      dermatitis: [],
      gpe: []
    },
    prescriptions: []
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getLabSlitTherapyRequests();
      setRequests(response?.requests || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load SLIT therapy requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    return (requests || []).filter((req) => {
      const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
      const matchesSearch = !searchTerm
        || req.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
        || req.patientPhone?.includes(searchTerm)
        || req.billing?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

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

  const confirmStatusUpdate = async (request, nextStatus) => {
    let notes = '';
    if (nextStatus === 'Ready' || nextStatus === 'Lab_Received') {
      notes = window.prompt(`Add lab notes for status "${nextStatus.replace(/_/g, ' ')}" (optional)`, request.labNotes || '') || '';
    }
    let courierTrackingNumber = request.courierTrackingNumber;
    if (nextStatus === 'Delivered' && request.deliveryMethod === 'courier') {
      courierTrackingNumber = window.prompt('Enter courier tracking number (optional)', courierTrackingNumber || '') || courierTrackingNumber;
    }

    try {
      await updateSlitTherapyRequestStatus(request._id, {
        status: nextStatus,
        labNotes: notes,
        courierTrackingNumber
      });
      toast.success(`Status updated to ${nextStatus.replace(/_/g, ' ')}`);
      fetchRequests();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleViewProfile = async (request) => {
    const patientId = request?.patientId || request?.patient?._id;
    if (!patientId) {
      toast.error('Patient record is not linked to this request.');
      return;
    }

    setProfileModal({
      open: true,
      loading: true,
      error: null,
      activeTab: 'overview',
      patient: null,
      history: [],
      tests: [],
      medications: [],
      followUps: [],
      allergies: {
        rhinitis: [],
        conjunctivitis: [],
        bronchitis: [],
        dermatitis: [],
        gpe: []
      },
      prescriptions: []
    });

    try {
      const [patientRes, historyRes, testsRes, medsRes, followRes, rhinitisRes, conjunctivitisRes, bronchitisRes, dermatitisRes, gpeRes, prescriptionsRes] = await Promise.all([
        API.get(`/patients/${patientId}`),
        API.get(`/patients/${patientId}/history`).catch(() => ({ data: [] })),
        API.get(`/patients/${patientId}/show-tests`).catch(() => ({ data: [] })),
        API.get(`/medications?patientId=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/followups?patientId=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/allergic-rhinitis?patientId=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/allergic-conjunctivitis?patientId=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/allergic-bronchitis?patientId=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/atopic-dermatitis?patientId=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/gpe?patientId=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/prescriptions?patientId=${patientId}`).catch(() => ({ data: [] }))
      ]);

      setProfileModal({
        open: true,
        loading: false,
        error: null,
        activeTab: 'overview',
        patient: patientRes.data,
        history: historyRes.data || [],
        tests: testsRes.data || [],
        medications: medsRes.data || [],
        followUps: followRes.data || [],
        allergies: {
          rhinitis: rhinitisRes.data || [],
          conjunctivitis: conjunctivitisRes.data || [],
          bronchitis: bronchitisRes.data || [],
          dermatitis: dermatitisRes.data || [],
          gpe: gpeRes.data || []
        },
        prescriptions: prescriptionsRes.data || []
      });
    } catch (error) {
      const message = error?.response?.data?.message || error.message || 'Failed to load patient profile';
      setProfileModal((prev) => ({
        ...prev,
        loading: false,
        error: message
      }));
    }
  };

  const openReportModal = async (request) => {
    const patientId = request?.patientId;

    if (!patientId) {
      toast.error('Patient record is not linked to this request.');
      return;
    }

    setReportModal({
      open: true,
      loading: true,
      error: null,
      items: [],
      patient: {
        id: patientId,
        name: request.patientName,
        invoice: request.billing?.invoiceNumber || 'N/A'
      }
    });

    try {
      const response = await API.get(`/test-requests/patient/${patientId}`);
      const items = Array.isArray(response.data) ? response.data : [];
      setReportModal((prev) => ({
        ...prev,
        loading: false,
        items,
        error: items.length === 0 ? 'No test reports were found for this patient.' : null
      }));
    } catch (error) {
      const message = error?.response?.data?.message || error.message || 'Failed to fetch test reports.';
      setReportModal((prev) => ({
        ...prev,
        loading: false,
        error: message,
        items: []
      }));
    }
  };

  const closeReportModal = () => {
    setReportModal({ open: false, loading: false, error: null, items: [], patient: null });
  };

  const handleViewReport = async (reportId) => {
    try {
      await viewPDFReport(reportId);
      toast.success('Opening test report in a new tab.');
    } catch (error) {
      toast.error(error.message || 'Failed to open test report.');
    }
  };

  const closeProfileModal = () => {
    setProfileModal({
      open: false,
      loading: false,
      error: null,
      activeTab: 'overview',
      patient: null,
      history: [],
      tests: [],
      medications: [],
      followUps: [],
      allergies: {
        rhinitis: [],
        conjunctivitis: [],
        bronchitis: [],
        dermatitis: [],
        gpe: []
      },
      prescriptions: []
    });
  };

  const setProfileTab = (tabKey) => {
    setProfileModal((prev) => ({
      ...prev,
      activeTab: tabKey
    }));
  };

  const renderActionButton = (request) => {
    switch (request.status) {
      case 'Billing_Generated':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-amber-700 bg-amber-50 rounded-full border border-amber-200">
            <Timer className="w-4 h-4" /> Awaiting Payment Confirmation
          </span>
        );
      case 'Billing_Paid':
        return (
          <button
            onClick={() => confirmStatusUpdate(request, 'Lab_Received')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700"
          >
            <PackageCheck className="w-4 h-4" />
            Mark Received
          </button>
        );
      case 'Lab_Received':
        return (
          <button
            onClick={() => confirmStatusUpdate(request, 'Ready')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-purple-700"
          >
            <Timer className="w-4 h-4" />
            Mark Ready
          </button>
        );
      case 'Ready':
        return (
          <button
            onClick={() => confirmStatusUpdate(request, 'Delivered')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-emerald-700"
          >
            <Truck className="w-4 h-4" />
            Mark Delivered
          </button>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-teal-700 bg-teal-50 rounded-full border border-teal-200">
            <CheckCircle2 className="w-4 h-4" /> Awaiting Reception Closure
          </span>
        );
      case 'Received':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-slate-600 bg-slate-100 rounded-full border border-slate-200">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-rose-700 bg-rose-50 rounded-full border border-rose-200">
            <Timer className="w-4 h-4" /> Cancelled by Reception
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">SLIT Therapy Workflow</h1>
          <p className="text-slate-500">Manage SLIT therapy preparation and delivery statuses.</p>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {AVAILABLE_FILTERS.map((filter) => (
              <option key={filter} value={filter}>{filter.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-slate-600 mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name, phone, or invoice number"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && <div className="p-6 text-center text-slate-500">Loading SLIT therapy requests...</div>}

        {!loading && filteredRequests.length === 0 && (
          <div className="p-6 text-center text-slate-500">No SLIT therapy requests found for selected filters.</div>
        )}

        {!loading && filteredRequests.length > 0 && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, filteredRequests.length)}</span>
                {' '}to{' '}
                <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, filteredRequests.length)}</span>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Workflow Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Package Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Timeline</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedRequests.map((request) => {
                    const statusClass = STATUS_COLORS[request.status] || 'bg-slate-100 text-slate-700';
                    const statusLabel = STATUS_LABELS[request.status] || formatStatus(request.status);
                    return (
                      <tr key={request._id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 align-top text-sm text-slate-700">
                          <div className="text-sm font-semibold text-slate-800">{request.patientName}</div>
                          <div className="text-xs text-slate-500">{request.patientPhone || '—'}</div>
                          {request.patientCode && (
                            <div className="text-xs text-blue-600 font-medium">{request.patientCode}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-700 space-y-2">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                            {statusLabel}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {getStatusDescription(request)}
                          </p>
                          <div className="flex flex-col gap-1 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                Billing
                              </span>
                              <span className="font-semibold text-slate-700">
                                {STATUS_LABELS[request.status] || formatStatus(request.status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                                Lab
                              </span>
                              <span className="font-semibold text-slate-700 capitalize">{request.labStatus || 'pending'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-700 space-y-2">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Package</div>
                            <div className="font-medium text-slate-800">{request.productName}</div>
                            <div className="text-xs text-slate-500">Code: {request.productCode}</div>
                            <div className="text-xs text-slate-500">Quantity: {request.quantity}</div>
                          </div>
                          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Invoice</span>
                              <span className="font-semibold text-slate-700">{request.billing?.invoiceNumber || 'Pending'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Delivery</span>
                              <span className="font-semibold text-slate-700 capitalize">{request.deliveryMethod || 'pickup'}</span>
                            </div>
                            {request.courierRequired && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Courier Fee</span>
                                <span className="font-semibold text-slate-700">{formatCurrency(request.courierFee || 0)}</span>
                              </div>
                            )}
                            {request.courierTrackingNumber && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Tracking</span>
                                <span className="font-semibold text-slate-700">{request.courierTrackingNumber}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-700">
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Last Update</div>
                              <div className="text-sm font-medium text-slate-800">{formatDateTime(request.updatedAt || request.createdAt)}</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              Created {formatDateTime(request.createdAt)}
                            </div>
                            {request.deliveryMethod === 'courier' && request.status === 'Ready' && (
                              <div className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                Awaiting courier pickup
                              </div>
                            )}
                            {request.status === 'Delivered' && (
                              <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Delivery confirmed by lab
                              </div>
                            )}
                            {request.status === 'Received' && (
                              <div className="text-xs text-slate-600 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                Workflow completed by reception
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-600">
                          {request.notes && (
                            <div className="mb-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Reception Notes</div>
                              <div className="text-slate-700 mt-1 text-sm">{request.notes}</div>
                            </div>
                          )}
                          {request.labNotes && (
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Lab Notes</div>
                              <div className="text-slate-700 mt-1 text-sm">{request.labNotes}</div>
                            </div>
                          )}
                          {!request.notes && !request.labNotes && <span className="text-slate-400">No additional notes.</span>}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => handleViewProfile(request)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-md hover:border-blue-400 hover:bg-blue-50"
                              title="View Patient Profile"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Profile
                            </button>
                            <button
                              onClick={() => openReportModal(request)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-md hover:border-indigo-400 hover:bg-indigo-50"
                              title="View Test Reports"
                            >
                              <FileDown className="w-3.5 h-3.5" /> View Reports
                            </button>
                            {renderActionButton(request)}
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

      {reportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Patient Test Reports</h2>
                <p className="text-xs text-slate-500">
                  {reportModal.patient?.name || 'Patient'} • Invoice {reportModal.patient?.invoice || 'N/A'}
                </p>
              </div>
              <button onClick={closeReportModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {reportModal.loading && (
                <div className="py-12 text-center text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  Loading reports...
                </div>
              )}

              {!reportModal.loading && reportModal.error && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  {reportModal.error}
                </div>
              )}

              {!reportModal.loading && !reportModal.error && reportModal.items.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
                  No test reports are available for this patient.
                </div>
              )}

              {!reportModal.loading && reportModal.items.length > 0 && (
                <div className="space-y-3">
                  {reportModal.items.map((item) => {
                    const canViewReport = ['Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(item.status) && !!item.reportFilePath;
                    return (
                      <div key={item._id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="space-y-1 text-sm text-slate-700">
                            <div className="font-semibold text-slate-800">{item.testType || 'Lab Test Request'}</div>
                            <div className="text-xs text-slate-500">Request ID: {item._id}</div>
                            <div className="text-xs text-slate-500">Status: <span className="font-semibold text-slate-700">{item.status?.replace(/_/g, ' ') || 'Unknown'}</span></div>
                            {item.billing && (
                              <div className="text-xs text-slate-500">Billing: {item.billing.status?.replace(/_/g, ' ') || 'N/A'} • Paid ₹{Number(item.billing.paidAmount || 0).toFixed(2)}</div>
                            )}
                            {item.reportGeneratedDate && (
                              <div className="text-xs text-slate-500">Report Generated: {formatDateTime(item.reportGeneratedDate)}</div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewReport(item._id)}
                              disabled={!canViewReport}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md ${canViewReport ? 'text-indigo-600 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50' : 'text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                            >
                              <FileDown className="w-3.5 h-3.5" /> {canViewReport ? 'Open Report' : 'Report Pending'}
                            </button>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-xs text-slate-500">Lab Notes: {item.notes}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={closeReportModal}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {profileModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Patient Medical Profile</h2>
                <p className="text-xs text-slate-500">
                  {profileModal.patient?.name || 'Patient'} • {profileModal.patient?.phone || 'No phone'}
                </p>
              </div>
              <button onClick={closeProfileModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            {profileModal.loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                Loading patient details...
              </div>
            )}

            {!profileModal.loading && profileModal.error && (
              <div className="flex-1 flex items-center justify-center px-6 py-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 max-w-xl text-center">
                  {profileModal.error}
                </div>
              </div>
            )}

            {!profileModal.loading && !profileModal.error && (
              <>
                <div className="px-6 pt-4 border-b border-slate-200 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {PROFILE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setProfileTab(tab.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${profileModal.activeTab === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {profileModal.activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-xs font-semibold uppercase text-slate-500">Patient Information</h3>
                        <div className="mt-2 space-y-1">
                          <p><span className="font-semibold text-slate-700">Name:</span> {profileModal.patient?.name || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Age:</span> {profileModal.patient?.age || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Gender:</span> {profileModal.patient?.gender || '—'}</p>
                          <p><span className="font-semibold text-slate-700">UHID:</span> {profileModal.patient?.patientCode || profileModal.patient?.uhId || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Phone:</span> {profileModal.patient?.phone || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Email:</span> {profileModal.patient?.email || '—'}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-xs font-semibold uppercase text-slate-500">Center & Tracking</h3>
                        <div className="mt-2 space-y-1">
                          <p><span className="font-semibold text-slate-700">Center:</span> {profileModal.patient?.centerName || profileModal.patient?.centerCode || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Registered At:</span> {formatDateTime(profileModal.patient?.createdAt)}</p>
                          <p><span className="font-semibold text-slate-700">Current Doctor:</span> {profileModal.patient?.currentDoctor?.name || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Assigned Doctor:</span> {profileModal.patient?.assignedDoctor?.name || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Address:</span> {profileModal.patient?.address || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {profileModal.activeTab === 'history' && (
                    <div className="space-y-3">
                      {profileModal.history.length === 0 && <div className="text-sm text-slate-500">No medical history records found.</div>}
                      {profileModal.history.map((entry) => (
                        <div key={entry._id} className="border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-slate-700">{entry.type || 'History Entry'}</div>
                            <div className="text-xs text-slate-500">{formatDateTime(entry.createdAt || entry.date)}</div>
                          </div>
                          {entry.notes && <p className="mt-2 text-slate-600">{entry.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {profileModal.activeTab === 'tests' && (
                    <div className="space-y-3">
                      {profileModal.tests.length === 0 && <div className="text-sm text-slate-500">No tests recorded.</div>}
                      {profileModal.tests.map((test, index) => (
                        <div key={test._id || index} className="border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-slate-700">{test.testType || test.name || 'Lab Test'}</div>
                            <div className="text-xs text-slate-500">{formatDateTime(test.date)}</div>
                          </div>
                          {test.notes && <p className="mt-2">Notes: {test.notes}</p>}
                          {Array.isArray(test.tests) && test.tests.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase">Parameters</p>
                              <ul className="mt-1 list-disc list-inside text-xs text-slate-600">
                                {test.tests.map((t, idx) => (
                                  <li key={idx}>{t.name || t.testName} {t.value ? `- ${t.value}` : ''}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {profileModal.activeTab === 'medications' && (
                    <div className="space-y-3">
                      {profileModal.medications.length === 0 && <div className="text-sm text-slate-500">No medications recorded.</div>}
                      {profileModal.medications.map((med) => (
                        <div key={med._id} className="border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                          <div className="font-semibold text-slate-700">{med.medicineName || med.name || 'Medication'}</div>
                          <div className="text-xs text-slate-500">Dosage: {med.dosage || '—'}</div>
                          <div className="text-xs text-slate-500">Frequency: {med.frequency || '—'}</div>
                          {med.notes && <p className="mt-2">{med.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {profileModal.activeTab === 'followups' && (
                    <div className="space-y-3">
                      {profileModal.followUps.length === 0 && <div className="text-sm text-slate-500">No follow-up visits recorded.</div>}
                      {profileModal.followUps.map((fu) => (
                        <div key={fu._id} className="border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-slate-700">{fu.type || 'Follow Up'}</div>
                            <div className="text-xs text-slate-500">{formatDateTime(fu.date || fu.createdAt)}</div>
                          </div>
                          {fu.notes && <p className="mt-2">{fu.notes}</p>}
                          {fu.updatedBy?.name && (
                            <p className="text-xs text-slate-500 mt-1">Updated By: {fu.updatedBy.name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {profileModal.activeTab === 'allergies' && (
                    <div className="space-y-4 text-sm text-slate-600">
                      {['rhinitis', 'conjunctivitis', 'bronchitis', 'dermatitis', 'gpe'].map((key) => {
                        const labelMap = {
                          rhinitis: 'Allergic Rhinitis',
                          conjunctivitis: 'Allergic Conjunctivitis',
                          bronchitis: 'Allergic Bronchitis',
                          dermatitis: 'Atopic Dermatitis',
                          gpe: 'GPE'
                        };
                        const items = profileModal.allergies[key];
                        return (
                          <div key={key} className="border border-slate-200 rounded-lg p-4">
                            <h3 className="text-xs font-semibold uppercase text-slate-500">{labelMap[key]}</h3>
                            {items && items.length > 0 ? (
                              <div className="mt-2 space-y-2">
                                {items.map((item) => (
                                  <div key={item._id} className="bg-slate-50 rounded-md px-3 py-2 text-xs">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-700">{item.type || item.condition || labelMap[key]}</span>
                                      <span className="text-slate-500">{formatDateTime(item.createdAt || item.date)}</span>
                                    </div>
                                    {item.notes && <p className="mt-1 text-slate-600">{item.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">No records.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {profileModal.activeTab === 'prescriptions' && (
                    <div className="space-y-3">
                      {profileModal.prescriptions.length === 0 && <div className="text-sm text-slate-500">No prescriptions available.</div>}
                      {profileModal.prescriptions.map((rx) => (
                        <div key={rx._id} className="border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-slate-700">Prescription</div>
                            <div className="text-xs text-slate-500">{formatDateTime(rx.createdAt)}</div>
                          </div>
                          {Array.isArray(rx.medicines) && rx.medicines.length > 0 && (
                            <ul className="mt-2 list-disc list-inside text-xs">
                              {rx.medicines.map((med, index) => (
                                <li key={index}>{med.name || med.medicineName} {med.dosage ? `- ${med.dosage}` : ''}</li>
                              ))}
                            </ul>
                          )}
                          {rx.notes && <p className="mt-2 text-xs text-slate-500">Notes: {rx.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-right">
                  <button
                    onClick={closeProfileModal}
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

