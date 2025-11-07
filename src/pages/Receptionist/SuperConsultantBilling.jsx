import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchReceptionistPatients } from '../../features/receptionist/receptionistThunks';
import ReceptionistLayout from './ReceptionistLayout';
import { 
  Users,
  User,
  Search, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Eye, 
  Plus,
  X,
  Filter,
  RefreshCw,
  FileText,
  Calculator,
  CreditCard,
  Calendar,
  Receipt,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Ban,
  RotateCcw
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { store } from '../../redux/store';
import Pagination from '../../components/Pagination';

export default function SuperConsultantBilling() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { patients, loading } = useSelector((state) => state.receptionist);
  const { user } = useSelector((state) => state.auth);

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientTestRequests, setPatientTestRequests] = useState({}); // Store test requests by patient ID
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pageInput, setPageInput] = useState('1');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending Payment', 'Paid', 'Partial Payment', 'No Invoice', etc.
  const [appointmentDateFilter, setAppointmentDateFilter] = useState('all'); // 'all', 'past', 'upcoming', 'today'
  
  // Invoice creation state
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    consultationFee: 850,
    consultationType: 'superconsultant_normal', // normal, audio, video
    serviceCharges: [{ name: '', amount: '' }],
    notes: ''
  });

  // Payment processing state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    consultationType: 'superconsultant_normal', // normal, audio, or video
    appointmentTime: '',
    notes: ''
  });

  // Invoice preview state
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

  // Doctor assignment state
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Cancel and Refund state
  const [showCancelBillModal, setShowCancelBillModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundData, setRefundData] = useState({
    reason: '',
    refundMethod: 'cash',
    refundType: 'withPenalty' // 'withPenalty' or 'full'
  });

  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if ([year, month, day].some(Number.isNaN)) return false;
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month - 1 &&
      today.getDate() === day
    );
  };

  const parseDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    const parsed = new Date(dateTimeStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // Function to fetch payment history for a patient
  const fetchPaymentHistory = async (patientId) => {
    if (!patientId) return;
    
    setLoadingPaymentHistory(true);
    try {
      const response = await API.get(`/payment-logs/patient/${patientId}`);
      if (response.data && response.data.success) {
        setPaymentHistory(response.data.paymentLogs || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const fetchDoctorsList = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const response = await API.get('/superadmin/doctors/available', {
        params: {
          search: ''
        }
      });

      if (Array.isArray(response.data?.doctors)) {
        setDoctors(response.data.doctors);
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching superconsultants:', error);
      toast.error('Failed to load superconsultants. Please try again.');
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  const getConsultationTypeLabel = (type) => {
    if (!type) return 'Superconsultant Consultation';
    const map = {
      superconsultant_normal: 'Normal Consultation',
      superconsultant_audio: 'Audio Consultation',
      superconsultant_video: 'Video Consultation',
      superconsultant_review_reports: 'Review Reports'
    };

    if (map[type]) {
      return map[type];
    }

    return type
      .replace('superconsultant_', '')
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (showPaymentModal && !loadingDoctors && doctors.length > 0) {
      setSelectedDoctorId((prev) => {
        if (prev && doctors.some((doc) => doc._id === prev)) {
          return prev;
        }
        return doctors[0]._id;
      });
    }
  }, [showPaymentModal, loadingDoctors, doctors]);

  // Convert number to words
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '');
  };

  // Center info
  const [centerInfo, setCenterInfo] = useState({
    name: '',
    address: '',
    phone: '',
    fax: '',
    website: '',
    missCallNumber: '',
    mobileNumber: ''
  });

  // Get center ID from user
  const getCenterId = () => {
    if (!user) return null;
    if (user.centerId) {
      if (typeof user.centerId === 'object' && user.centerId._id) {
        return user.centerId._id;
      }
      return user.centerId;
    }
    return null;
  };

  // Fetch center information
  useEffect(() => {
  const fetchCenterInfo = async () => {
    const centerId = getCenterId();
      if (!centerId) return;

      try {
        const response = await API.get(`/centers/${centerId}`);
        const center = response.data;
        
        if (center) {
        setCenterInfo({
          name: center.name || 'Chanre Hospital',
          address: center.address || 'Rajajinagar, Bengaluru',
          phone: center.phone || '08040810611',
          fax: center.fax || '080-42516600',
          website: center.website || 'www.chanreallergy.com',
          missCallNumber: center.missCallNumber || '080-42516666',
          mobileNumber: center.mobileNumber || '9686197153'
        });
        }
      } catch (error) {
        console.error('Error fetching center info:', error);
        // Set default values on error
        setCenterInfo({
          name: 'Chanre Hospital',
          address: 'Rajajinagar, Bengaluru',
          phone: '08040810611',
          fax: '080-42516600',
          website: 'www.chanreallergy.com',
          missCallNumber: '080-42516666',
          mobileNumber: '9686197153'
        });
      }
    };

    if (user) {
      fetchCenterInfo();
    }
  }, [user]);

  // Center fees for superconsultant
  const [centerFees, setCenterFees] = useState({
    superconsultantFees: {
      normal: 850,
      audio: 950,
      video: 1050,
      reviewReports: 750
    }
  });

  // Fetch center fees
  useEffect(() => {
  const fetchCenterFees = async () => {
    const centerId = getCenterId();
      if (!centerId) return;

      try {
        const response = await API.get(`/centers/${centerId}/fees`);
        if (response.data && response.data.fees && response.data.fees.superconsultantFees) {
          setCenterFees({
            superconsultantFees: response.data.fees.superconsultantFees
          });
        }
      } catch (error) {
        console.error('Error fetching center fees:', error);
      }
    };

    fetchCenterFees();
  }, [user]);

  // Fetch patients
  useEffect(() => {
    dispatch(fetchReceptionistPatients());
  }, [dispatch]);

  // Fetch test requests for all patients
  useEffect(() => {
    const fetchTestRequests = async () => {
      const patientList = Array.isArray(patients) ? patients : [];
      if (patientList.length === 0) return;

      try {
        const testRequestsMap = {};
        
        // Fetch test requests for each patient
        const promises = patientList.map(async (patient) => {
          try {
            const response = await API.get(`/test-requests/patient/${patient._id}`);
            if (response.data && Array.isArray(response.data)) {
              testRequestsMap[patient._id] = response.data;
      }
    } catch (error) {
            // Patient might not have test requests, which is okay
            testRequestsMap[patient._id] = [];
          }
        });
        
        await Promise.all(promises);
        setPatientTestRequests(testRequestsMap);
      } catch (error) {
        console.error('Error fetching test requests:', error);
      }
    };

    fetchTestRequests();
  }, [patients]);

  // Get patient status for superconsultant billing
  const getPatientStatus = (patient) => {
    if (!patient.billing || patient.billing.length === 0) {
      return { status: 'No Invoice', color: 'text-red-600 bg-red-100', icon: <FileText className="h-4 w-4" /> };
    }

    // CRITICAL: Only check superconsultant bills, NOT regular consultation bills
    const superconsultantBills = patient.billing.filter(bill => 
      bill.type === 'consultation' && 
      bill.consultationType?.startsWith('superconsultant_')
    );

    if (superconsultantBills.length === 0) {
      return { status: 'No Superconsultant Invoice', color: 'text-red-600 bg-red-100', icon: <FileText className="h-4 w-4" /> };
    }

    // Check if any SUPERCONSULTANT bills are cancelled (not regular consultation bills)
    const hasCancelledSuperconsultantBills = superconsultantBills.some(bill => bill.status === 'cancelled');
    if (hasCancelledSuperconsultantBills) {
      return { status: 'Bill Cancelled', color: 'text-red-600 bg-red-100', icon: <Ban className="h-4 w-4" /> };
    }

    // Get the main superconsultant bill (prefer non-cancelled, otherwise most recent)
    const consultationBill = superconsultantBills.find(bill => bill.status !== 'cancelled') || 
                             superconsultantBills.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

    if (!consultationBill) {
      return { status: 'No Superconsultant Invoice', color: 'text-red-600 bg-red-100', icon: <FileText className="h-4 w-4" /> };
    }

    const totalAmount = consultationBill.amount || 0;
    const paidAmount = consultationBill.paidAmount || 0;

    // Check for refunds - only in SUPERCONSULTANT bills
    let hasRefundedBills = false;
    let hasPartiallyRefundedBills = false;

    superconsultantBills.forEach(bill => {
      if (bill.refunds && bill.refunds.length > 0) {
        const refundedAmount = bill.refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
        if (refundedAmount >= bill.amount) {
          hasRefundedBills = true;
        } else if (refundedAmount > 0) {
          hasPartiallyRefundedBills = true;
        }
      }
      if (bill.status === 'refunded') {
        hasRefundedBills = true;
      } else if (bill.status === 'partially_refunded') {
        hasPartiallyRefundedBills = true;
      }
    });

    if (hasRefundedBills && !hasPartiallyRefundedBills) {
      return { status: 'Refunded', color: 'text-orange-600 bg-orange-100', icon: <RotateCcw className="h-4 w-4" /> };
    }

    if (hasPartiallyRefundedBills) {
      return { status: 'Partially Refunded', color: 'text-yellow-600 bg-yellow-100', icon: <RotateCcw className="h-4 w-4" /> };
    }

    if (paidAmount >= totalAmount && totalAmount > 0) {
      return { status: 'Paid', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="h-4 w-4" /> };
    }

    if (paidAmount > 0) {
      return { status: 'Partial Payment', color: 'text-yellow-600 bg-yellow-100', icon: <Clock className="h-4 w-4" /> };
    }

    return { status: 'Pending Payment', color: 'text-orange-600 bg-orange-100', icon: <Clock className="h-4 w-4" /> };
  };

  // Filter patients - show all patients to allow creating superconsultant consultations for any patient.
  // (⚠️ Do NOT filter by lab tests – patients without lab reports must still appear.)
  useEffect(() => {
    const patientList = Array.isArray(patients) ? patients : [];
    let filtered = [...patientList];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(patient => {
        const name = patient.name ? patient.name.toLowerCase() : '';
        const email = patient.email ? patient.email.toLowerCase() : '';
        const phone = patient.phone ? String(patient.phone).toLowerCase() : '';
        const uhId = patient.uhId ? String(patient.uhId).toLowerCase() : '';
        const doctorName = patient.assignedDoctor?.name ? patient.assignedDoctor.name.toLowerCase() : '';

        return (
          name.includes(normalizedSearch) ||
          email.includes(normalizedSearch) ||
          phone.includes(normalizedSearch) ||
          uhId.includes(normalizedSearch) ||
          doctorName.includes(normalizedSearch)
        );
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(patient => {
        const statusInfo = getPatientStatus(patient);
        return statusInfo.status === statusFilter;
      });
    }
    
    // Apply appointment date filter
    if (appointmentDateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      filtered = filtered.filter(patient => {
        const appointmentData = getSuperconsultantAppointmentData(patient);
        if (!appointmentData || !appointmentData.date) {
          // Patients without appointments - include only if filter is 'all'
          return appointmentDateFilter === 'all';
        }
        
        const appointmentDate = new Date(appointmentData.date);
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDateFilter === 'past') {
          return appointmentDate < today;
        } else if (appointmentDateFilter === 'upcoming') {
          return appointmentDate >= tomorrow;
        } else if (appointmentDateFilter === 'today') {
          return appointmentDate.getTime() === today.getTime();
        }
        
        return true;
      });
    }
    
    setFilteredPatients(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
    setPageInput('1');
  }, [patients, searchTerm, statusFilter, appointmentDateFilter]);
  
  // Calculate paginated patients
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const startItem = filteredPatients.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredPatients.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setPageInput(String(totalPages));
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageChange = (page) => {
    if (Number.isNaN(page)) return;
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(clampedPage);
    setPageInput(String(clampedPage));
  };

  const handleItemsPerPageChange = (value) => {
    const parsed = parseInt(value, 10);
    if (!parsed || parsed <= 0) return;
    setItemsPerPage(parsed);
    setCurrentPage(1);
    setPageInput('1');
  };

  const handleGoToPage = () => {
    if (!pageInput) return;
    const parsed = parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      toast.error('Please enter a valid page number');
      return;
    }
    handlePageChange(parsed);
  };

  // Get superconsultant appointment display data
  // For superconsultant billing we prioritise those appointments, but we also support regular consultation slots
  const getSuperconsultantAppointmentData = (patient) => {
    const candidates = [];

    const hasSuperconsultantContext = Boolean(
      patient.superConsultantAppointmentTime ||
      patient.superConsultantAppointmentStatus ||
      (Array.isArray(patient.billing) && patient.billing.some((bill) =>
        bill?.type === 'consultation' && bill.consultationType?.startsWith('superconsultant_')
      )) ||
      patient.consultationType?.startsWith('superconsultant_')
    );

    const addCandidate = (rawDate, status, notes, priority = 0) => {
      if (!rawDate) return;

      let parsedDate = null;

      if (rawDate instanceof Date) {
        parsedDate = rawDate;
      } else {
        parsedDate = parseDateTime(rawDate);
        if (!parsedDate) {
          try {
            parsedDate = new Date(rawDate);
          } catch (e) {
            parsedDate = null;
          }
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) return;

      candidates.push({
        date: parsedDate,
        status: status || 'scheduled',
        notes,
        priority
      });
    };

    const superconsultantBill = patient.billing?.find(bill =>
      bill.type === 'consultation' &&
      bill.consultationType?.startsWith('superconsultant_')
    );

    if (superconsultantBill) {
      addCandidate(
        superconsultantBill.customData?.appointmentTime || superconsultantBill.appointmentTime,
        superconsultantBill.appointmentStatus || patient.appointmentStatus,
        superconsultantBill.paymentNotes,
        3
      );
    }

    if (patient.superConsultantAppointmentTime) {
      addCandidate(
        patient.superConsultantAppointmentTime,
        patient.superConsultantAppointmentStatus || patient.appointmentStatus,
        patient.superConsultantAppointmentNotes || patient.appointmentNotes,
        2
      );
    }

    if (patient.appointmentTime && hasSuperconsultantContext) {
      addCandidate(
        patient.appointmentTime,
        patient.appointmentStatus,
        patient.appointmentNotes,
        patient.consultationType?.startsWith('superconsultant_') ? 2 : 1
      );
    }

    if (Array.isArray(patient.appointments) && patient.appointments.length > 0) {
      patient.appointments.forEach((apt) => {
        const rawDate = apt.scheduledAt || apt.appointmentTime || apt.confirmedDate || apt.preferredDate || apt.date;
        if (!rawDate) return;

        const isSuperAppointment =
          apt.consultationType?.startsWith('superconsultant_') ||
          apt.type === 'superconsultant_consultation' ||
          apt.appointmentType === 'superconsultant_consultation';

        if (!isSuperAppointment && !hasSuperconsultantContext) {
          return;
        }

        addCandidate(
          rawDate,
          apt.status || apt.appointmentStatus || patient.appointmentStatus,
          apt.notes,
          isSuperAppointment ? 2 : 1
        );
      });
    }

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.date.getTime() - b.date.getTime();
    });

    const highestPriority = candidates[0].priority;
    const now = new Date();
    const samePriority = candidates.filter((candidate) => candidate.priority === highestPriority);

    const upcoming = samePriority
      .filter((candidate) => candidate.date.getTime() >= now.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcoming.length > 0) {
      return upcoming[0];
    }

    const past = samePriority
      .filter((candidate) => candidate.date.getTime() < now.getTime())
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (past.length > 0) {
      return past[0];
    }

    return candidates[0];
  };

  const getAssignedDoctorName = (patient) => {
    if (!patient) return null;

    const extractName = (candidate) => {
      if (!candidate) return null;
      if (typeof candidate === 'string') return candidate;
      if (typeof candidate === 'object') {
        if (candidate.name) return candidate.name;
        if (candidate.fullName) return candidate.fullName;
        if (candidate.firstName || candidate.lastName) {
          return [candidate.firstName, candidate.lastName].filter(Boolean).join(' ');
        }
      }
      return null;
    };

    const candidates = [
      patient.assignedDoctor,
      patient.assignedDoctorId,
      patient.assignedDoctorInfo,
      patient.superConsultantDoctor,
      patient.superconsultantDoctor,
      patient.superConsultant,
      patient.superconsultant,
      patient.doctor,
      patient.doctorDetails,
    ];

    for (const candidate of candidates) {
      const name = extractName(candidate);
      if (name) return name;
    }

    return null;
  };

  const getAssignedDoctorNameFromBilling = (patient) => {
    if (!patient?.billing) return null;

    const extractName = (candidate) => {
      if (!candidate) return null;
      if (typeof candidate === 'string') return candidate;
      if (typeof candidate === 'object') {
        if (candidate.name) return candidate.name;
        if (candidate.fullName) return candidate.fullName;
        if (candidate.firstName || candidate.lastName) {
          return [candidate.firstName, candidate.lastName].filter(Boolean).join(' ');
        }
      }
      return null;
    };

    const superconsultantBills = patient.billing.filter(
      (bill) => bill?.type === 'consultation' && bill?.consultationType?.startsWith('superconsultant_')
    );

    for (const bill of superconsultantBills) {
      const billCandidates = [
        bill.superConsultantName,
        bill.superconsultantName,
        bill.consultantName,
        bill.doctorName,
        bill.assignedDoctorName,
        bill.customData?.doctorName,
        bill.customData?.consultantName,
        bill.assignedDoctor,
        bill.doctor,
        bill.superConsultantDoctor,
        bill.superconsultantDoctor,
      ];

      for (const candidate of billCandidates) {
        const name = extractName(candidate);
        if (name) return name;
      }
    }

    return null;
  };

  // Get lab status for a patient based on their test requests
  const getLabStatus = (patient) => {
    const testRequests = patientTestRequests[patient._id] || [];
    
    if (testRequests.length === 0) {
      return { 
        status: 'No Lab Tests', 
        color: 'text-slate-500 bg-slate-100', 
        icon: <FlaskConical className="h-4 w-4" /> 
      };
    }

    // Get the most recent test request
    const latestTestRequest = testRequests.sort((a, b) => 
      new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt)
    )[0];

    if (!latestTestRequest) {
      return { 
        status: 'No Lab Tests', 
        color: 'text-slate-500 bg-slate-100', 
        icon: <FlaskConical className="h-4 w-4" /> 
      };
    }

    const status = latestTestRequest.status;

    // Map test request statuses to display status
    if (status === 'Completed' || status === 'Report_Sent' || status === 'Report_Generated') {
      return { 
        status: 'Report Ready', 
        color: 'text-green-600 bg-green-100', 
        icon: <CheckCircle2 className="h-4 w-4" /> 
      };
    }

    if (status === 'Testing_Completed' || status === 'In_Lab_Testing') {
      return { 
        status: 'Testing', 
        color: 'text-blue-600 bg-blue-100', 
        icon: <FlaskConical className="h-4 w-4" /> 
      };
    }

    if (status === 'Sample_Collected' || status === 'Sample_Collection_Scheduled') {
      return { 
        status: 'Sample Collected', 
        color: 'text-purple-600 bg-purple-100', 
        icon: <Clock className="h-4 w-4" /> 
      };
    }

    if (status === 'Assigned' || status === 'Superadmin_Approved' || status === 'Billing_Paid') {
      return { 
        status: 'Assigned', 
        color: 'text-yellow-600 bg-yellow-100', 
        icon: <Clock className="h-4 w-4" /> 
      };
    }

    if (status === 'Billing_Pending' || status === 'Billing_Generated') {
      return { 
        status: 'Billing Pending', 
        color: 'text-orange-600 bg-orange-100', 
        icon: <DollarSign className="h-4 w-4" /> 
      };
    }

    // Default status
    return { 
      status: status || 'Pending', 
      color: 'text-slate-600 bg-slate-100', 
      icon: <AlertCircle className="h-4 w-4" /> 
    };
  };

  // Create invoice for superconsultant
  const handleCreateInvoice = (patient) => {
    setSelectedPatient(patient);
    
    // Get the default fee for normal consultation
    const defaultFee = centerFees.superconsultantFees?.normal || 850;
    
    setInvoiceFormData({
      consultationFee: defaultFee,
      consultationType: 'superconsultant_normal', // Default to normal consultation
      serviceCharges: [{ name: 'Service Charges', amount: '150' }],
      notes: `Superconsultant consultation for ${patient.name}`
    });
    setShowCreateInvoiceModal(true);
  };

  // Prepare invoice data for viewing
  const prepareInvoiceData = (patient) => {
    if (!patient || !patient.billing || patient.billing.length === 0) {
      console.error('No billing data found for patient:', patient?._id);
      return null;
    }

    // Find all superconsultant billing entries and get the most recent one (not cancelled if possible)
    const superconsultantBills = patient.billing.filter(bill => 
      bill.type === 'consultation' && 
      bill.consultationType?.startsWith('superconsultant_')
    );

    if (superconsultantBills.length === 0) {
      console.error('No superconsultant billing found for patient:', patient?._id);
      return null;
    }

    // Try to find a non-cancelled bill first, otherwise use the latest one
    let superconsultantBill = superconsultantBills.find(bill => bill.status !== 'cancelled');
    if (!superconsultantBill) {
      // If all are cancelled, use the most recent one
      superconsultantBill = superconsultantBills.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )[0];
    }

    if (!superconsultantBill) {
      console.error('Could not find valid superconsultant bill for patient:', patient?._id);
      return null;
    }

    // Calculate totals - include consultation and related service charges
    const relatedBills = patient.billing.filter(bill => {
      if (bill.type === 'consultation' && bill.consultationType?.startsWith('superconsultant_') && bill.invoiceNumber === superconsultantBill.invoiceNumber) {
        return true;
      }
      if (bill.type === 'service' && bill.invoiceNumber === superconsultantBill.invoiceNumber) {
        return true;
      }
      return false;
    });

    const totalAmount = relatedBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const totalPaid = relatedBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);

    // Get service charges related to this superconsultant invoice
    const serviceCharges = patient.billing
      .filter(bill => 
        bill.type === 'service' && 
        bill.invoiceNumber === superconsultantBill.invoiceNumber
      )
      .map(bill => ({
        name: bill.description || 'Service Charge',
        amount: bill.amount || 0,
        description: bill.serviceDetails || bill.description || ''
      }));

    // Get discount information
    const discountType = superconsultantBill.discountType || 'percentage';
    const discountPercentage = superconsultantBill.discountPercentage || 0;
    const discountAmount = superconsultantBill.discountAmount || 0;
    const discountReason = superconsultantBill.discountReason || '';

    // Calculate discount
    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = totalAmount * (discountPercentage / 100);
    } else if (discountType === 'amount') {
      calculatedDiscount = discountAmount;
    }
    
    // Format consultation type name
    const consultationTypeName = superconsultantBill.consultationType
      ?.replace('superconsultant_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()) || 'Superconsultant Consultation';

    // Get doctor information
    const doctor = patient.assignedDoctor || {};
    const doctorSpecializations = doctor.specializations || doctor.specialization || 'N/A';

    return {
      patient: {
        name: patient.name,
        gender: patient.gender,
        age: patient.age,
        phone: patient.phone,
        email: patient.email,
        uhId: patient.uhId,
        fileNo: patient.uhId,
        address: patient.address
      },
      doctor: {
        name: doctor.name || 'Not Assigned',
        specializations: doctorSpecializations,
        userId: patient.uhId || 'N/A'
      },
      invoiceNumber: superconsultantBill.invoiceNumber || 'N/A',
      consultationFee: superconsultantBill.amount || 0,
      consultationType: consultationTypeName,
      consultationTypeCode: superconsultantBill.consultationType,
      serviceCharges: serviceCharges,
      registrationFee: 0, // No registration fee for superconsultant
      totalAmount: totalAmount,
      totalPaid: totalPaid,
      outstanding: totalAmount - totalPaid,
      discountType: discountType,
      discountPercentage: discountPercentage,
      discountAmount: discountAmount,
      calculatedDiscount: calculatedDiscount,
      discountReason: discountReason,
      notes: superconsultantBill.paymentNotes || '',
      billing: relatedBills,
      createdAt: superconsultantBill.createdAt || patient.createdAt,
      date: superconsultantBill.createdAt || patient.createdAt,
      generatedBy: user?.name || 'Receptionist',
      referenceDoctor: patient.referenceDoctor || 'N/A',
      totals: {
        subtotal: totalAmount,
        discount: calculatedDiscount,
        tax: 0,
        total: totalAmount - calculatedDiscount
      }
    };
  };

  // Update consultation fee when consultation type changes
  const handleConsultationTypeChange = (consultationType) => {
    let fee = 850; // Default fallback
    
    // Map consultation type to fee
    switch (consultationType) {
      case 'superconsultant_normal':
        fee = centerFees.superconsultantFees?.normal || 850;
        break;
      case 'superconsultant_audio':
        fee = centerFees.superconsultantFees?.audio || 950;
        break;
      case 'superconsultant_video':
        fee = centerFees.superconsultantFees?.video || 1050;
        break;
      case 'superconsultant_review_reports':
        fee = centerFees.superconsultantFees?.reviewReports || 750;
        break;
      default:
        fee = centerFees.superconsultantFees?.normal || 850;
    }
    
    setInvoiceFormData(prev => ({
      ...prev,
      consultationType,
      consultationFee: fee
    }));
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    // Validate required fields
    if (!selectedPatient._id) {
      toast.error('Patient ID is missing. Please refresh and try again.');
      return;
    }

    const doctorId = selectedPatient.assignedDoctor?._id || selectedPatient.assignedDoctor;
    if (!doctorId) {
      toast.error('Patient does not have an assigned doctor. Please assign a doctor first.');
      return;
    }

    const consultationFee = parseFloat(invoiceFormData.consultationFee) || 0;
    if (consultationFee <= 0) {
      toast.error('Consultation fee must be greater than 0');
      return;
    }

    if (!invoiceFormData.consultationType) {
      toast.error('Please select a consultation type');
      return;
    }

    try {
      const invoiceData = {
        patientId: selectedPatient._id,
        doctorId: doctorId,
        registrationFee: 0, // No registration fee for superconsultant
        consultationFee: consultationFee,
        serviceCharges: invoiceFormData.serviceCharges.filter(s => s.name && s.amount && parseFloat(s.amount) > 0).map(s => ({
          name: s.name.trim(),
          amount: parseFloat(s.amount)
        })),
        notes: invoiceFormData.notes || '',
        consultationType: invoiceFormData.consultationType // Use selected consultation type
      };

      console.log('Submitting invoice data:', invoiceData);

      const response = await API.post('/billing/create-invoice', invoiceData);
      
      if (response.data.success) {
        toast.success('Superconsultant invoice created successfully!');
        setShowCreateInvoiceModal(false);
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error('Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create invoice';
      
      // Provide more specific error messages
      if (errorMessage.includes('already has billing records')) {
        toast.error('Patient already has billing records. Please use the payment processing feature instead.');
      } else if (errorMessage.includes('Patient ID and Doctor ID are required')) {
        toast.error('Patient or Doctor information is missing. Please select a valid patient.');
      } else if (errorMessage.includes('Patient not found')) {
        toast.error('Patient not found. Please refresh and try again.');
      } else {
        toast.error(`Failed to create invoice: ${errorMessage}`);
      }
    }
  };

  // Process payment for superconsultant
  const handleProcessPayment = async (patient) => {
    const consultationBill = patient.billing?.find(bill => 
      bill.type === 'consultation' && 
      bill.consultationType?.startsWith('superconsultant_')
    );

    if (!consultationBill) {
      toast.error('No superconsultant invoice found');
      return;
    }

    setSelectedPatient(patient);
    const assignedDoctor = patient.assignedDoctor;
    const currentDoctorId = typeof assignedDoctor === 'object' && assignedDoctor?._id
      ? assignedDoctor._id
      : assignedDoctor || '';
    setSelectedDoctorId(currentDoctorId);

    await fetchDoctorsList();
    
    // Calculate total outstanding amount (consultation + all service charges for this invoice)
    const invoiceNumber = consultationBill.invoiceNumber;
    const relatedBills = patient.billing?.filter(bill => 
      bill.invoiceNumber === invoiceNumber
    ) || [];
    
    const totalAmount = relatedBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const totalPaid = relatedBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
    const fullOutstanding = totalAmount - totalPaid;

    // Set default appointment to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const defaultDate = tomorrow.toISOString().slice(0, 16);

    setPaymentData({
      amount: fullOutstanding.toString(), // Always set to full outstanding amount
      paymentMethod: 'cash',
      consultationType: consultationBill.consultationType || 'superconsultant_normal',
      appointmentTime: defaultDate,
      notes: ''
    });

    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (!selectedDoctorId) {
      toast.error('Please assign a doctor before scheduling the appointment');
      return;
    }

    if (!paymentData.appointmentTime) {
      toast.error('Please schedule an appointment date and time');
      return;
    }

    const appointmentDate = parseDateTime(paymentData.appointmentTime);
    const now = new Date();
    if (!appointmentDate || appointmentDate <= now) {
      toast.error('Appointment must be scheduled for a future date and time');
      return;
    }

    try {
      const assignedDoctor = selectedPatient.assignedDoctor;
      const currentDoctorId = typeof assignedDoctor === 'object' && assignedDoctor?._id
        ? assignedDoctor._id
        : assignedDoctor || '';

      if (selectedDoctorId !== currentDoctorId) {
        await API.put(`/patients/${selectedPatient._id}`, {
          assignedDoctor: selectedDoctorId
        });
      }

      const consultationBill = selectedPatient.billing?.find(bill => 
        bill.type === 'consultation' && 
        bill.consultationType?.startsWith('superconsultant_')
      );

      const paymentPayload = {
        patientId: selectedPatient._id,
        invoiceId: consultationBill?.invoiceNumber || `INV-${selectedPatient._id.toString().slice(-6)}`,
        amount: parseFloat(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        paymentType: 'full',
        notes: paymentData.notes,
        appointmentTime: paymentData.appointmentTime,
        consultationType: paymentData.consultationType,
        superConsultantId: selectedDoctorId || null
      };

      const response = await API.post('/billing/process-payment', paymentPayload);
      
      if (response.data.success) {
        toast.success('Payment processed successfully! Report sent to Superconsultant for review.');
        setShowPaymentModal(false);
        setSelectedDoctorId('');
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error(response.data.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      if (error.response?.data?.message?.toLowerCase()?.includes('assign doctor')) {
        toast.error(error.response.data.message);
      } else if (error.config?.url?.includes('/patients/')) {
        toast.error(error.response?.data?.message || 'Failed to assign doctor. Please try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to process payment');
      }
    }
  };

  // Cancel bill handler
  const handleCancelBill = (patient) => {
    setSelectedPatient(patient);
    setCancelReason('');
    setShowCancelBillModal(true);
  };

  const handleCancelBillSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient || !cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    try {
      const superconsultantBill = selectedPatient.billing?.find(bill => 
        bill.type === 'consultation' && 
        bill.consultationType?.startsWith('superconsultant_')
      );

      if (!superconsultantBill) {
        toast.error('No superconsultant bill found');
        return;
      }

      // Calculate total amounts
      const invoiceNumber = superconsultantBill.invoiceNumber;
      const relatedBills = selectedPatient.billing?.filter(bill => 
        bill.invoiceNumber === invoiceNumber
      ) || [];
      
      const totalAmount = relatedBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
      const totalPaid = relatedBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);

      const cancelPayload = {
        patientId: selectedPatient._id,
        reason: cancelReason.trim(),
        initiateRefund: totalPaid > 0,
        invoiceNumber: invoiceNumber, // Send invoice number to cancel only this invoice
        billingType: 'superconsultant' // Specify this is superconsultant billing (not regular consultation)
      };

      const response = await API.post('/billing/cancel-bill', cancelPayload);
      
      if (response.data.success) {
        toast.success('Bill cancelled successfully!');
        setShowCancelBillModal(false);
        setCancelReason('');
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error(response.data.message || 'Failed to cancel bill');
      }
    } catch (error) {
      console.error('Error cancelling bill:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel bill');
    }
  };

  // Refund handler
  const handleProcessRefund = (patient) => {
    setSelectedPatient(patient);
    
    // Get total paid amount for refund
    const superconsultantBill = patient.billing?.find(bill => 
      bill.type === 'consultation' && 
      bill.consultationType?.startsWith('superconsultant_')
    );

    if (!superconsultantBill) {
      toast.error('No superconsultant bill found');
      return;
    }

    const invoiceNumber = superconsultantBill.invoiceNumber;
    const relatedBills = patient.billing?.filter(bill => 
      bill.invoiceNumber === invoiceNumber
    ) || [];
    
    const totalPaid = relatedBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
    const totalRefunded = relatedBills.reduce((sum, bill) => sum + (bill.refundAmount || 0), 0);
    
    const availableForRefund = totalPaid - totalRefunded;
    
    setRefundData({
      reason: '',
      refundMethod: 'cash',
      refundType: 'withPenalty'
    });
    
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient || !refundData.reason.trim()) {
      toast.error('Please provide a refund reason');
      return;
    }

    try {
      const superconsultantBill = selectedPatient.billing?.find(bill => 
        bill.type === 'consultation' && 
        bill.consultationType?.startsWith('superconsultant_')
      );

      if (!superconsultantBill) {
        toast.error('No superconsultant bill found');
        return;
      }

      const invoiceNumber = superconsultantBill.invoiceNumber;
      const relatedBills = selectedPatient.billing?.filter(bill => 
        bill.invoiceNumber === invoiceNumber
      ) || [];
      
      const totalPaid = relatedBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
      const totalRefunded = relatedBills.reduce((sum, bill) => sum + (bill.refundAmount || 0), 0);
      const availableAmount = totalPaid - totalRefunded;

      const refundPayload = {
        patientId: selectedPatient._id,
        amount: availableAmount,
        refundMethod: refundData.refundMethod,
        reason: refundData.reason.trim()
      };

      const response = await API.post('/billing/process-refund', refundPayload);
      
      if (response.data.success) {
        toast.success('Refund processed successfully!');
        setShowRefundModal(false);
        setRefundData({
          reason: '',
          refundMethod: 'cash',
          refundType: 'withPenalty'
        });
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error('Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    }
  };

  // Get stats for superconsultant patients (only count those with superconsultant billing)
  const stats = {
    total: filteredPatients.filter(p => {
      const hasSuperconsultant = p.billing?.some(bill => 
        bill.type === 'consultation' && 
        (bill.consultationType === 'superconsultant_normal' || 
         bill.consultationType === 'superconsultant_audio' || 
         bill.consultationType === 'superconsultant_video')
      ) || p.consultationType?.startsWith('superconsultant_');
      return hasSuperconsultant;
    }).length,
    pending: filteredPatients.filter(p => {
      const status = getPatientStatus(p);
      return status.status === 'Pending Payment';
    }).length,
    paid: filteredPatients.filter(p => {
      const status = getPatientStatus(p);
      return status.status === 'Paid';
    }).length
  };

  return (
    <ReceptionistLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  Superconsultant Billing
                </h1>
                <p className="text-slate-600 text-sm">
                  Manage billing for Superconsultant consultations. Reports are sent to Superconsultant for review after payment.
                </p>
              </div>
                <button
                  onClick={() => dispatch(fetchReceptionistPatients())}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Total Superconsultant Patients</p>
                  <p className="text-lg font-bold text-slate-800">{stats.total}</p>
                </div>
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Pending Payment</p>
                  <p className="text-lg font-bold text-orange-600">{stats.pending}</p>
                </div>
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Paid</p>
                  <p className="text-lg font-bold text-green-600">{stats.paid}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 mb-6 p-4 sm:p-6">
            <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                placeholder="Search patients by name, email, phone, UH ID to create superconsultant consultation..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
            {searchTerm && (
              <p className="text-xs text-slate-500 mt-2">
                💡 Searching shows all patients. Create invoice to set up superconsultant consultation.
              </p>
            )}
          </div>

          {/* Patients List */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-4 sm:p-6 border-b border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Receipt className="h-5 w-5 mr-2 text-blue-500" />
                    All Patients ({filteredPatients.length})
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Create invoices for any patient to set up superconsultant consultation
                  </p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="No Invoice">No Invoice</option>
                    <option value="No Superconsultant Invoice">No Superconsultant Invoice</option>
                    <option value="Pending Payment">Pending Payment</option>
                    <option value="Partial Payment">Partial Payment</option>
                    <option value="Paid">Paid</option>
                    <option value="Bill Cancelled">Bill Cancelled</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Partially Refunded">Partially Refunded</option>
                  </select>
                  <select
                    value={appointmentDateFilter}
                    onChange={(e) => setAppointmentDateFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Appointments</option>
                    <option value="past">Past Appointments</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming Appointments</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {filteredPatients.length === 0 ? (
                    'No patients to display'
                  ) : (
                    <span>
                      Showing <span className="font-semibold text-slate-700">{startItem}</span> to{' '}
                      <span className="font-semibold text-slate-700">{endItem}</span> of{' '}
                      <span className="font-semibold text-slate-700">{filteredPatients.length}</span> patients
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || filteredPatients.length === 0}
                      className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages || filteredPatients.length === 0}
                      className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Page</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleGoToPage();
                        }
                      }}
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-xs text-slate-500">of {totalPages}</span>
                    <button
                      onClick={handleGoToPage}
                      className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                    >
                      Go
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Rows:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-slate-600 text-sm">Loading patients...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-slate-600 mb-2">No Patients Found</h3>
                  <p className="text-slate-500 text-xs">
                    {searchTerm ? 'No patients match your search. Try a different search term.' : 'No patients found. Patients will appear here once loaded. Use the search bar to find a patient and create a superconsultant consultation.'}
                  </p>
                </div>
              ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">UH ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Appointment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lab Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedPatients.map((patient) => {
                        const statusInfo = getPatientStatus(patient);
                      const consultationBill = patient.billing?.find(bill => 
                        bill.type === 'consultation' && 
                        bill.consultationType?.startsWith('superconsultant_')
                      );
                      const totalAmount = consultationBill?.amount || 0;
                      const paidAmount = consultationBill?.paidAmount || 0;
                      const hasBilling = consultationBill !== undefined;
                      const appointmentData = getSuperconsultantAppointmentData(patient);
                      const assignedDoctorName =
                        getAssignedDoctorName(patient) || getAssignedDoctorNameFromBilling(patient);
                      const isAppointmentViewed = appointmentData?.status === 'viewed';
                      const isAppointmentCompleted = appointmentData?.status === 'viewed' || appointmentData?.status === 'completed';
                      const isBillCancelled = statusInfo.status === 'Bill Cancelled';
                      const canReassign = isBillCancelled || isAppointmentCompleted;
                        
                        return (
                          <tr key={patient._id} className="hover:bg-slate-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <Users className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{patient.name}</div>
                                  <div className="text-xs text-slate-500">{patient.age} years, {patient.gender}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-xs text-slate-900">
                                <div>{patient.email || 'No email'}</div>
                                <div className="text-slate-500">{patient.phone || 'No phone'}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-900">
                              {patient.uhId || 'No UH ID'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-xs text-slate-600 space-y-1">
                                {(() => {
                                  const appointmentData = getSuperconsultantAppointmentData(patient);
                                  
                                  if (!appointmentData) {
                                    return (
                                      <div className="space-y-1">
                                        <span className="text-slate-400">No superconsultant appointment</span>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <>
                                      <div className="font-medium text-slate-900">
                                        {new Date(appointmentData.date).toLocaleDateString('en-GB')}
                                      </div>
                                      <div className="text-slate-500">
                                        {new Date(appointmentData.date).toLocaleTimeString('en-GB', { 
                                          hour: '2-digit', 
                                          minute: '2-digit',
                                          hour12: true 
                                        })}
                                      </div>
                                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                                        appointmentData.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        appointmentData.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                        appointmentData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        appointmentData.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        appointmentData.status === 'viewed' ? 'bg-green-100 text-green-700' :
                                        appointmentData.status === 'missed' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {appointmentData.status || 'scheduled'}
                                      </div>
                                      {appointmentData.notes && (
                                        <div className="text-slate-400 text-xs mt-1 max-w-32 truncate" title={appointmentData.notes}>
                                          📝 {appointmentData.notes}
                                        </div>
                                      )}
                                      {assignedDoctorName && (
                                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                                          <User className="w-3 h-3 text-blue-400" />
                                          <span>Doctor: {assignedDoctorName}</span>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {statusInfo.status}
                              </span>
                            {hasBilling && (
                              <div className="text-xs text-slate-500 mt-1">
                                ₹{paidAmount}/{totalAmount}
                              </div>
                            )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                                    {(() => {
                              const labStatusInfo = getLabStatus(patient);
                                        return (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${labStatusInfo.color}`}>
                                  {labStatusInfo.icon}
                                  {labStatusInfo.status}
                                </span>
                              );
                                    })()}
                            </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <button
                                  onClick={() => navigate(`/dashboard/receptionist/profile/${patient._id}`)}
                                  className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                                  title="View Profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                
                                {!hasBilling && (
                                <button
                                    onClick={() => handleCreateInvoice(patient)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                  title="Create Superconsultant Invoice"
                                  >
                                    <Calculator className="h-3 w-3" />
                                    Create Invoice
                                </button>
                                )}

                              {hasBilling && statusInfo.status === 'Pending Payment' && (
                                <button
                                  onClick={() => handleProcessPayment(patient)}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                  title="Process Payment"
                                >
                                  <CreditCard className="h-3 w-3" />
                                  Process Payment
                                </button>
                              )}

                              {hasBilling && statusInfo.status === 'Partial Payment' && (
                                  <button
                                  onClick={() => handleProcessPayment(patient)}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                  title="Complete Payment"
                                >
                                  <DollarSign className="h-3 w-3" />
                                  Complete Payment
                                  </button>
                                )}

                              {/* View Invoice - for patients with superconsultant billing */}
                                {hasBilling && (
                                <button
                                    onClick={async () => {
                                      try {
                                        // Refresh patient data first to get latest billing information
                                        await dispatch(fetchReceptionistPatients());
                                        
                                        // Wait a bit for Redux state to update
                                        setTimeout(async () => {
                                          try {
                                            // Get fresh patient data from current Redux state
                                            const currentState = store.getState();
                                            const freshPatients = currentState.receptionist.patients || [];
                                            const freshPatient = freshPatients.find(p => p._id === patient._id) || patient;
                                            
                                            const invoice = prepareInvoiceData(freshPatient);
                                            if (invoice) {
                                              setInvoiceData(invoice);
                                              setSelectedPatient(freshPatient);
                                              setShowInvoicePreviewModal(true);
                                              // Fetch payment history for this patient
                                              await fetchPaymentHistory(freshPatient._id);
                                            } else {
                                              console.error('Failed to prepare invoice data for patient:', freshPatient._id, freshPatient);
                                              toast.error('Unable to generate invoice data. Please ensure the patient has superconsultant billing.');
                                            }
                                          } catch (error) {
                                            console.error('Error preparing invoice:', error);
                                            toast.error('Failed to prepare invoice. Please try again.');
                                          }
                                        }, 300);
                                      } catch (error) {
                                        console.error('Error opening invoice:', error);
                                        toast.error('Failed to open invoice. Please try again.');
                                      }
                                    }}
                                    className="text-purple-600 hover:text-purple-700 p-1 rounded transition-colors"
                                    title="View Invoice"
                                  >
                                    <FileCheck className="h-4 w-4" />
                                </button>
                                )}

                                {/* Cancel Bill - for any patient with billing, but not if appointment is viewed */}
                                {hasBilling && statusInfo.status !== 'Bill Cancelled' && statusInfo.status !== 'Refunded' && !isAppointmentViewed && (
                                  <button
                                    onClick={() => handleCancelBill(patient)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                    title="Cancel Bill"
                                  >
                                    <Ban className="h-3 w-3" />
                                    Cancel
                                  </button>
                                )}

                                {/* Process Refund - for cancelled bills with payments or partially refunded bills */}
                                {(statusInfo.status === 'Bill Cancelled' && totalAmount > 0 && paidAmount > 0) || statusInfo.status === 'Partially Refunded' ? (
                                  <button
                                    onClick={() => handleProcessRefund(patient)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                    title="Process Refund"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Refund
                                  </button>
                                ) : null}

                                {/* Reassign - Create new consultation when bill is cancelled or appointment is completed */}
                                {canReassign && (
                                  <button
                                    onClick={() => handleCreateInvoice(patient)}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                    title={isBillCancelled ? "Create New Consultation (Bill Cancelled)" : "Create New Consultation (Appointment Completed)"}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Reassign
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              )}
            </div>
            
            {/* Pagination */}
            {!loading && filteredPatients.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredPatients.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
                showItemsPerPage={true}
                showPageInfo={true}
              />
            )}
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Create Superconsultant Invoice - {selectedPatient.name}
              </h3>
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleInvoiceSubmit} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Consultation Type
                </label>
                  <select
                    value={invoiceFormData.consultationType}
                    onChange={(e) => handleConsultationTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="superconsultant_normal">Normal Consultation (₹{centerFees.superconsultantFees?.normal || 850})</option>
                    <option value="superconsultant_audio">Audio Consultation (₹{centerFees.superconsultantFees?.audio || 950})</option>
                    <option value="superconsultant_video">Video Consultation (₹{centerFees.superconsultantFees?.video || 1050})</option>
                    <option value="superconsultant_review_reports">Review Reports (₹{centerFees.superconsultantFees?.reviewReports || 750})</option>
                  </select>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Select the type of superconsultant consultation. Fee will be auto-filled from center settings.
                </p>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                  Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  value={invoiceFormData.consultationFee}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, consultationFee: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="0"
                    step="0.01"
                  />
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                  Service Charges
                </label>
                  {invoiceFormData.serviceCharges.map((service, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                        placeholder="Service name"
                          value={service.name}
                          onChange={(e) => {
                            const newServices = [...invoiceFormData.serviceCharges];
                            newServices[index].name = e.target.value;
                            setInvoiceFormData({...invoiceFormData, serviceCharges: newServices});
                          }}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                        placeholder="Amount"
                          value={service.amount}
                          onChange={(e) => {
                            const newServices = [...invoiceFormData.serviceCharges];
                            newServices[index].amount = e.target.value;
                            setInvoiceFormData({...invoiceFormData, serviceCharges: newServices});
                          }}
                        className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                <button
                  type="button"
                          onClick={() => {
                            const newServices = invoiceFormData.serviceCharges.filter((_, i) => i !== index);
                            setInvoiceFormData({...invoiceFormData, serviceCharges: newServices});
                          }}
                        className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                </button>
          </div>
                  ))}
              <button
                    type="button"
                    onClick={() => setInvoiceFormData({
                        ...invoiceFormData,
                      serviceCharges: [...invoiceFormData.serviceCharges, { name: '', amount: '' }]
                    })}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Service Charge
              </button>
            </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                </label>
                  <textarea
                    value={invoiceFormData.notes}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes..."
                />
              </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateInvoiceModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Create Invoice
                  </button>
                    </div>
              </form>
            </div>
                    </div>
                  </div>
                )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Process Payment - {selectedPatient.name}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedDoctorId('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Amount (₹) *
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-700 text-sm">
                    ₹{Number(paymentData.amount || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Outstanding amount is auto-calculated from the superconsultant invoice.
                  </p>
                </div>

                    <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Method *
                      </label>
                      <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="neft">NEFT</option>
                      </select>
              </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assign Superconsultant *
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loadingDoctors}
                  >
                    <option value="" disabled>
                      {loadingDoctors ? 'Loading superconsultants...' : 'Select superconsultant'}
                    </option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}
                        {doctor.specialization || doctor.specializations
                          ? ` (${doctor.specialization || doctor.specializations})`
                          : ''}
                      </option>
                    ))}
                  </select>
                  {!loadingDoctors && doctors.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No superconsultants found. Please add superconsultants before scheduling the appointment.
                    </p>
                  )}
                  {selectedPatient?.assignedDoctor && selectedDoctorId && selectedDoctorId === (typeof selectedPatient.assignedDoctor === 'object' ? selectedPatient.assignedDoctor._id : selectedPatient.assignedDoctor) && (
                    <p className="text-xs text-slate-500 mt-1">
                      Currently assigned superconsultant will be notified about this appointment.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Consultation Type
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-700 text-sm">
                    {getConsultationTypeLabel(paymentData.consultationType)}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Report will be sent to Superconsultant for review after payment
                  </p>
                </div>

                      <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Schedule Appointment * <Calendar className="h-4 w-4 inline ml-1" />
                  </label>
                  <input
                    type="datetime-local"
                    value={paymentData.appointmentTime}
            onChange={(e) => {
              const value = e.target.value;
              const parsed = parseDateTime(value);
              if (!parsed || parsed <= new Date()) {
                toast.error('Please choose a future date and time');
                return;
              }
              setPaymentData({...paymentData, appointmentTime: value});
            }}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    📅 Appointment date and time for Superconsultant consultation
                  </p>
              </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
        </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedDoctorId('');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Process Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreviewModal && invoiceData && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">
                Invoice Preview - {invoiceData.patient.name}
              </h3>
              <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                    const invoiceContent = document.getElementById('invoice-print-content').innerHTML;
                      
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                          <title>Invoice - ${invoiceData.patient.name}</title>
                            <style>
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                              body { 
                              font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; 
                              margin: 0; padding: 5mm; color: #000; background: white;
                              font-size: 12px; line-height: 1.3;
                            }
                            .invoice-container { max-width: 190mm; margin: 0 auto; background: white; }
                            table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
                            th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 11px; }
                            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
                              .text-center { text-align: center; }
                            .text-right { text-align: right; }
                              .font-bold { font-weight: bold; }
                              .text-sm { font-size: 14px; }
                              .text-xs { font-size: 11px; }
                              @media print {
                              @page { size: A4; margin: 5mm; }
                              body { margin: 0; padding: 5mm; }
                              }
                            </style>
                          </head>
                          <body>
                          <div class="invoice-container">${invoiceContent}</div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    setTimeout(() => printWindow.print(), 500);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 text-sm"
                >
                  <FileCheck className="h-4 w-4" />
                  Print
                  </button>
                  <button
                    onClick={() => setShowInvoicePreviewModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                  >
                  <X className="h-5 w-5" />
                  </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {invoiceData && (
                <div id="invoice-print-content" className="bg-white p-6 max-w-4xl mx-auto">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 mb-1">Invoice</h1>
                      <h2 className="text-xl font-bold text-slate-900 mb-1">{centerInfo.name}</h2>
                      <p className="text-sm text-slate-700 mb-0.5">{centerInfo.address}</p>
                      <p className="text-sm text-slate-700 mb-0.5">
                        <span className="font-medium">Phone:</span> {centerInfo.phone} | <span className="font-medium">Fax:</span> {centerInfo.fax}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Website:</span> {centerInfo.website}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        <span className="font-bold">Bill No:</span> {invoiceData.invoiceNumber}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        <span className="font-bold">BILL</span> Date: {new Date(invoiceData.date).toLocaleDateString('en-GB')}, {new Date(invoiceData.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>

                  {/* Patient and Consultant Information */}
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">Patient Information</h3>
                      <div className="space-y-1 text-xs text-slate-700">
                        <div><span className="font-medium">Name:</span> {invoiceData.patient.name}</div>
                        <div><span className="font-medium">Age:</span> {invoiceData.patient.age} | <span className="font-medium">Gender:</span> {invoiceData.patient.gender}</div>
                        <div><span className="font-medium">Contact:</span> {invoiceData.patient.phone}</div>
                        <div><span className="font-medium">File No:</span> {invoiceData.patient.fileNo || invoiceData.patient.uhId}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">Consultant Information</h3>
                      <div className="space-y-1 text-xs text-slate-700">
                        <div><span className="font-medium">Doctor:</span> {invoiceData.doctor.name}</div>
                        <div><span className="font-medium">Department:</span> {invoiceData.doctor.specializations}</div>
                        <div><span className="font-medium">User ID:</span> {invoiceData.patient.uhId}</div>
                        <div><span className="font-medium">Ref. Doctor:</span> {invoiceData.referenceDoctor || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Current Services Billed Table */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Current Services Billed</h3>
                    <table className="min-w-full border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-700 uppercase">S.NO</th>
                          <th className="border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">SERVICE NAME</th>
                          <th className="border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-700 uppercase">QTY</th>
                          <th className="border border-slate-300 px-3 py-2 text-right text-xs font-medium text-slate-700 uppercase">CHARGES</th>
                          <th className="border border-slate-300 px-3 py-2 text-right text-xs font-medium text-slate-700 uppercase">PAID</th>
                          <th className="border border-slate-300 px-3 py-2 text-right text-xs font-medium text-slate-700 uppercase">BAL</th>
                          <th className="border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let serialNumber = 1;
                          const rows = [];
                          
                          // Add consultation fee
                          const consultBill = invoiceData.billing.find(b => b.type === 'consultation');
                            const consultPaid = consultBill?.paidAmount || 0;
                            const consultBalance = invoiceData.consultationFee - consultPaid;
                          let consultStatus = 'Unpaid';
                          let consultStatusColor = 'text-red-600';
                            
                            if (consultBill?.status === 'cancelled') {
                              consultStatus = 'Cancelled';
                              consultStatusColor = 'text-red-600';
                            } else if (consultBill?.status === 'refunded') {
                              consultStatus = 'Refunded';
                              consultStatusColor = 'text-orange-600';
                            } else if (consultBill?.status === 'partially_refunded') {
                              consultStatus = 'Partially Refunded';
                              consultStatusColor = 'text-yellow-600';
                            } else {
                              consultStatus = consultPaid >= invoiceData.consultationFee ? 'Paid' : consultPaid > 0 ? 'Partial' : 'Unpaid';
                              consultStatusColor = consultStatus === 'Paid' ? 'text-green-600' : consultStatus === 'Partial' ? 'text-orange-600' : 'text-red-600';
                            }
                            
                            rows.push(
                              <tr key="consult">
                              <td className="border border-slate-300 px-3 py-2 text-xs text-center">{serialNumber++}</td>
                              <td className="border border-slate-300 px-3 py-2 text-xs">{invoiceData.consultationType} Fee</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">1</td>
                              <td className="border border-slate-300 px-3 py-2 text-right text-xs">₹{invoiceData.consultationFee.toFixed(2)}</td>
                              <td className="border border-slate-300 px-3 py-2 text-right text-xs">₹{consultPaid.toFixed(2)}</td>
                              <td className="border border-slate-300 px-3 py-2 text-right text-xs">₹{consultBalance.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                                <span className={`font-medium ${consultStatusColor}`}>{consultStatus}</span>
                                </td>
                              </tr>
                            );
                          
                          // Add service charges
                          invoiceData.serviceCharges.forEach((service, index) => {
                            const serviceBill = invoiceData.billing.find(b => 
                              b.type === 'service' && b.description === service.name
                            );
                            const servicePaid = serviceBill?.paidAmount || 0;
                            const serviceBalance = service.amount - servicePaid;
                            let serviceStatus = 'Unpaid';
                            let serviceStatusColor = 'text-red-600';
                            
                            if (serviceBill?.status === 'cancelled') {
                              serviceStatus = 'Cancelled';
                              serviceStatusColor = 'text-red-600';
                            } else if (serviceBill?.status === 'refunded') {
                              serviceStatus = 'Refunded';
                              serviceStatusColor = 'text-orange-600';
                            } else if (serviceBill?.status === 'partially_refunded') {
                              serviceStatus = 'Partially Refunded';
                              serviceStatusColor = 'text-yellow-600';
                            } else {
                              serviceStatus = servicePaid >= service.amount ? 'Paid' : servicePaid > 0 ? 'Partial' : 'Unpaid';
                              serviceStatusColor = serviceStatus === 'Paid' ? 'text-green-600' : serviceStatus === 'Partial' ? 'text-orange-600' : 'text-red-600';
                            }
                            
                            rows.push(
                              <tr key={`service-${index}`}>
                                <td className="border border-slate-300 px-3 py-2 text-xs text-center">{serialNumber++}</td>
                                <td className="border border-slate-300 px-3 py-2 text-xs">{service.name}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">1</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">₹{service.amount.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">₹{servicePaid.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">₹{serviceBalance.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                                  <span className={`font-medium ${serviceStatusColor}`}>
                                    {serviceStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          });

                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Invoice Summary */}
                  {(() => {
                    const billingRecords = invoiceData.billing || [];
                    const totals = billingRecords.reduce(
                      (acc, bill) => {
                        const amount = bill.amount || 0;
                        const paid = bill.paidAmount || 0;
                        return {
                          amount: acc.amount + amount,
                          paid: acc.paid + paid
                        };
                      },
                      { amount: 0, paid: 0 }
                    );

                    const balance = Math.max(0, totals.amount - totals.paid);

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-100 rounded-lg p-4 text-xs text-slate-700 space-y-2">
                          <div className="font-semibold text-slate-900 text-sm">Notes</div>
                          <p className="whitespace-pre-wrap text-slate-600">
                            {invoiceData.notes?.trim() || 'No additional notes provided.'}
                          </p>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-4 text-xs text-slate-700 space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">Total Charges</span>
                            <span>₹{totals.amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Total Paid</span>
                            <span className="text-green-600 font-semibold">₹{totals.paid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-300 pt-2">
                            <span className="font-semibold">Outstanding Balance</span>
                            <span className={balance === 0 ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                              ₹{balance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ReceptionistLayout>
  );
}