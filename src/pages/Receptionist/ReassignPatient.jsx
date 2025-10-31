import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchReceptionistPatients } from '../../features/receptionist/receptionistThunks';
import ReceptionistLayout from './ReceptionistLayout';
import { 
  Users, 
  Search, 
  UserPlus, 
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Settings,
  FileText,
  Plus,
  Calculator,
  CreditCard,
  FileCheck,
  Download,
  Edit3,
  Trash2,
  Ban,
  RotateCcw,
  Receipt
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../services/api';

export default function ReassignPatient() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { patients, loading } = useSelector((state) => state.receptionist);
  const { user } = useSelector((state) => state.auth);
  
  // Center information state
  const [centerInfo, setCenterInfo] = useState({
    name: 'CHANRE ALLERGY CENTER',
    address: 'No.414/65, 20th Main, West of Chord Road, 1st Block, Rajajinagara, Bangalore-560010',
    phone: '080-42516699',
    fax: '080-42516600',
    website: 'www.chanreallergy.com',
    labWebsite: 'www.chanrelabresults.com',
    missCallNumber: '080-42516666',
    mobileNumber: '9686197153'
  });
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [finalFilteredPatients, setFinalFilteredPatients] = useState([]);
  const [subSearchTerm, setSubSearchTerm] = useState('');
  const [showSubSearch, setShowSubSearch] = useState(false);
  const [searchField, setSearchField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage, setPatientsPerPage] = useState(10);

  // Patient selection and reassignment states
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [reassignData, setReassignData] = useState({
    newDoctorId: '',
    reason: '',
    notes: ''
  });

  // Billing workflow states - Same as ConsultationBilling
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelBillModal, setShowCancelBillModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showWorkingHoursReassignModal, setShowWorkingHoursReassignModal] = useState(false);
  
  const [invoiceFormData, setInvoiceFormData] = useState({
    registrationFee: 0,
    consultationFee: 1050,
    serviceCharges: [{ name: '', amount: '', description: '' }],
    taxPercentage: 0,
    discountPercentage: 0,
    notes: '',
    consultationType: 'IP'
  });
  
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    receiptNumber: '',
    paymentMethod: 'cash',
    paymentType: 'full',
    notes: '',
    appointmentTime: '',
    consultationType: 'IP',
    markAsPaid: true
  });
  
  const [cancelReason, setCancelReason] = useState('');
  const [refundData, setRefundData] = useState({
    amount: '',
    refundMethod: 'cash',
    refundType: 'partial', // 'partial' or 'full'
    reason: '',
    paymentReference: '',
    notes: '',
    patientBehavior: 'okay' // 'okay' or 'rude' - determines penalty policy
  });
  
  const [workingHoursReassignData, setWorkingHoursReassignData] = useState({
    newDoctorId: '',
    nextConsultationDate: '',
    reason: 'Working hours violation - not viewed within 7 AM to 8 PM',
    notes: ''
  });

  useEffect(() => {
    dispatch(fetchReceptionistPatients());
    fetchCenterInfo();
  }, [dispatch]);

  // Auto-refresh patient data every 30 seconds to keep doctor status updated
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing patient data to update doctor status...');
      dispatch(fetchReceptionistPatients());
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  // Function to get center ID
  const getCenterId = () => {
    if (!user) return null;
    
    if (user.centerId) {
      if (typeof user.centerId === 'object' && user.centerId._id) {
        return user.centerId._id;
      }
      return user.centerId;
    }
    
    const storedCenterId = localStorage.getItem('centerId');
    if (storedCenterId) {
      return storedCenterId;
    }
    
    return null;
  };

  // Fetch center information
  const fetchCenterInfo = async () => {
    const centerId = getCenterId();
    if (centerId) {
      try {
        const response = await API.get(`/centers/${centerId}`);
        const center = response.data;
        
        setCenterInfo({
          name: center.name || 'CHANRE ALLERGY CENTER',
          address: center.address || 'No.414/65, 20th Main, West of Chord Road, 1st Block, Rajajinagara, Bangalore-560010',
          phone: center.phone || '080-42516699',
          fax: center.fax || '080-42516600',
          website: center.website || 'www.chanreallergy.com',
          labWebsite: center.labWebsite || 'www.chanrelabresults.com',
          missCallNumber: center.missCallNumber || '080-42516666',
          mobileNumber: center.mobileNumber || '9686197153'
        });
      } catch (error) {
        console.error('Error fetching center info:', error);
      }
    }
  };

  const fetchAvailableDoctors = async () => {
    console.log('🔄 === FETCHING AVAILABLE DOCTORS ===');
    console.log('Selected patient for filtering:', selectedPatient);
    setDoctorsLoading(true);
    try {
      const response = await API.get('/doctors');
      console.log('🔍 Doctors API response status:', response.status);
      console.log('🔍 Doctors API response data:', response.data);
      const allDoctors = response.data || [];
      console.log('🔍 Total doctors from API:', allDoctors.length);
      console.log('🔍 All doctors list:', allDoctors.map(d => ({ id: d._id, name: d.name, centerId: d.centerId })));
      
      if (allDoctors.length === 0) {
        console.log('❌ No doctors found in API response');
        setAvailableDoctors([]);
        return;
      }
      
      // TEMPORARILY DISABLE FILTERING TO TEST
      console.log('🔍 TEMPORARILY SHOWING ALL DOCTORS (NO FILTERING)');
      setAvailableDoctors(allDoctors);
      
      // Only filter if we have a selected patient
      // const filtered = selectedPatient ? allDoctors.filter(doctor => {
      //   console.log('🔍 Checking doctor:', doctor.name, '(ID:', doctor._id, ')');
      //   console.log('🔍 Against assigned doctor:', selectedPatient?.assignedDoctor?.name, '(ID:', selectedPatient?.assignedDoctor?._id, ')');
        
      //   if (selectedPatient?.assignedDoctor?._id === doctor._id) {
      //     console.log('❌ Filtering out assigned doctor:', doctor.name);
      //     return false;
      //   }
      //   console.log('✅ Keeping doctor:', doctor.name);
      //   return true;
      // }) : allDoctors;
      
      // console.log('🔍 Filtered doctors count:', filtered.length);
      // console.log('🔍 Filtered doctors list:', filtered.map(d => ({ id: d._id, name: d.name })));
      // console.log('🔍 Setting available doctors to:', filtered);
      // setAvailableDoctors(filtered);
    } catch (error) {
      console.error('❌ Error fetching doctors:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error('Failed to fetch available doctors');
      setAvailableDoctors([]);
    } finally {
      setDoctorsLoading(false);
      console.log('🔄 === DOCTORS FETCH COMPLETE ===');
    }
  };

  // Fetch doctors when reassign modal opens
  useEffect(() => {
    if (showReassignModal && selectedPatient) {
      console.log('🔄 Modal opened, fetching doctors...');
      fetchAvailableDoctors();
    }
  }, [showReassignModal, selectedPatient]);

  // Primary search filter - Only show patients who completed first consultation
  useEffect(() => {
    let filtered = patients.filter(patient => {
      // Only show patients who have completed their first consultation (have billing records)
      const hasCompletedFirstConsultation = patient.billing && patient.billing.length > 0;
      
      if (!hasCompletedFirstConsultation) {
        return false;
      }
      
      const matchesSearch = !searchTerm || 
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.uhId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.assignedDoctor?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    setFilteredPatients(filtered);
    setShowSubSearch(filtered.length > 0 && searchTerm.trim() !== '');
    setCurrentPage(1);
  }, [patients, searchTerm]);

  // Status filter effect
  useEffect(() => {
    let statusFiltered = filteredPatients.filter(patient => {
      if (statusFilter === 'all') return true;
      
      const statusInfo = getReassignmentStatus(patient);
      return statusInfo.status.toLowerCase().includes(statusFilter.toLowerCase());
    });

    setFinalFilteredPatients(statusFiltered);
    setCurrentPage(1);
  }, [filteredPatients, statusFilter]);

  // Sub-search filter
  useEffect(() => {
    let subFiltered = filteredPatients.filter(patient => {
      if (!subSearchTerm) return true;
      
      const searchLower = subSearchTerm.toLowerCase();
      
      switch (searchField) {
        case 'name':
          return patient.name?.toLowerCase().includes(searchLower);
        case 'email':
          return patient.email?.toLowerCase().includes(searchLower);
        case 'phone':
          return patient.phone?.toLowerCase().includes(searchLower);
        case 'uhId':
          return patient.uhId?.toLowerCase().includes(searchLower);
        case 'assignedDoctor':
          return patient.assignedDoctor?.name?.toLowerCase().includes(searchLower);
        case 'all':
        default:
          return patient.name?.toLowerCase().includes(searchLower) ||
                 patient.email?.toLowerCase().includes(searchLower) ||
                 patient.phone?.toLowerCase().includes(searchLower) ||
                 patient.uhId?.toLowerCase().includes(searchLower) ||
                 patient.assignedDoctor?.name?.toLowerCase().includes(searchLower);
      }
    });
    
    setFinalFilteredPatients(subFiltered);
    setCurrentPage(1);
  }, [filteredPatients, subSearchTerm, searchField]);

  // Pagination logic
  const totalPages = Math.ceil(finalFilteredPatients.length / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const endIndex = startIndex + patientsPerPage;
  const currentPatients = finalFilteredPatients.slice(startIndex, endIndex);

  // Helper functions
  const clearAllSearches = () => {
    setSearchTerm('');
    setSubSearchTerm('');
    setSearchField('all');
    setStatusFilter('all');
    setShowSubSearch(false);
    setCurrentPage(1);
  };

  const clearSubSearch = () => {
    setSubSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePatientsPerPageChange = (newPerPage) => {
    setPatientsPerPage(parseInt(newPerPage));
    setCurrentPage(1);
  };

  // Check if patient is eligible for free reassignment (within 7 days of first consultation)
  const isEligibleForFreeReassignment = (patient) => {
    console.log('🔍 === ELIGIBILITY TRACE START ===');
    console.log('🔍 Patient:', patient.name, '(UH ID:', patient.uhId, ')');
    
    if (!patient.billing || patient.billing.length === 0) {
      console.log('❌ No billing history found');
      return false;
    }

    // Check if patient has already been reassigned
    const hasBeenReassigned = patient.isReassigned || patient.reassignmentHistory?.length > 0;
    console.log('🔍 Has been reassigned before:', hasBeenReassigned);
    console.log('🔍 Reassignment history:', patient.reassignmentHistory?.length || 0, 'entries');

    if (hasBeenReassigned) {
      console.log('❌ Patient already reassigned - not eligible for free reassignment');
      return false;
    }

    // Find the first consultation that was completed (paid) - exclude reassignment bills
    const firstPaidConsultation = patient.billing.find(bill => 
      (bill.status === 'paid' || bill.status === 'completed' || 
      (bill.customData?.totals?.paid > 0) || (bill.paidAmount > 0)) &&
      !bill.isReassignedEntry // Exclude reassignment bills
    );

    console.log('🔍 Billing history:', patient.billing.length, 'entries');
    console.log('🔍 First paid consultation:', firstPaidConsultation ? 'Found' : 'Not found');

    if (!firstPaidConsultation) {
      console.log('❌ No completed consultation found');
      return false;
    }

    // Get the first consultation date
    const firstConsultationDate = new Date(firstPaidConsultation.createdAt);
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate - firstConsultationDate) / (1000 * 60 * 60 * 24));

    console.log('🔍 First consultation date:', firstConsultationDate.toLocaleDateString());
    console.log('🔍 Current date:', currentDate.toLocaleDateString());
    console.log('🔍 Days difference:', daysDifference);
    console.log('🔍 Within 7 days:', daysDifference <= 7);

    const isEligible = daysDifference <= 7;
    console.log('🔍 === FINAL RESULT ===');
    console.log(isEligible ? '✅ ELIGIBLE for free reassignment' : '❌ NOT ELIGIBLE for free reassignment');
    console.log('🔍 === ELIGIBILITY TRACE END ===');

    return isEligible;
  };

  // Get consultation fee based on reassignment eligibility
  const getConsultationFee = (patient, consultationType) => {
    if (consultationType === 'followup') {
      return 0; // Free followup consultation
    }
    
    if (consultationType === 'IP') {
      return 1050;
    }
    
    return 850; // Default OP consultation fee
  };

  const handleReassignPatient = (patient) => {
    console.log('🔄 Opening reassignment modal for patient:', patient);
    setSelectedPatient(patient);
    setReassignData({
      newDoctorId: '',
      reason: '',
      notes: ''
    });
    // Clear previous doctors list to force refresh
    setAvailableDoctors([]);
    setShowReassignModal(true);
    // Fetch doctors when opening the modal
    fetchAvailableDoctors();
  };

  const handleWorkingHoursReassign = (patient) => {
    console.log('🔄 Opening working hours reassignment modal for patient:', patient);
    setSelectedPatient(patient);
    setWorkingHoursReassignData({
      newDoctorId: '',
      nextConsultationDate: '',
      reason: 'Working hours violation - not viewed within 7 AM to 8 PM',
      notes: ''
    });
    // Clear previous doctors list to force refresh
    setAvailableDoctors([]);
    setShowWorkingHoursReassignModal(true);
    // Fetch doctors when opening the modal
    fetchAvailableDoctors();
  };

  // Create invoice for reassigned patient
  const handleCreateInvoice = (patient) => {
    setSelectedPatient(patient);
    
    // Check if eligible for free reassignment
    const isFree = isEligibleForFreeReassignment(patient);
    
    // Determine default consultation type and fee
    let defaultConsultationType = isFree ? 'followup' : 'IP';
    let defaultConsultationFee = getConsultationFee(patient, defaultConsultationType);
    
    setInvoiceFormData({
      registrationFee: 0, // Reassigned patients don't pay registration fee again
      consultationFee: defaultConsultationFee,
      serviceCharges: [{ name: '', amount: '', description: '' }],
      taxPercentage: 0,
      discountPercentage: 0,
      notes: isFree ? `Free reassignment for ${patient.name} (within 7 days)` : `Invoice for reassigned patient: ${patient.name}`,
      consultationType: defaultConsultationType
    });
    
    setShowCreateInvoiceModal(true);
  };

  // Get reassignment status for patient
  const getReassignmentStatus = (patient) => {
    const hasReassignmentBilling = patient.reassignedBilling && patient.reassignedBilling.length > 0;
    const isReassigned = patient.isReassigned || patient.reassignmentHistory?.length > 0;
    
    if (!isReassigned) {
      return { status: 'Not Reassigned', color: 'text-slate-600 bg-slate-100', icon: <Clock className="h-4 w-4" /> };
    }

    if (!hasReassignmentBilling) {
      const isFree = isEligibleForFreeReassignment(patient);
      if (isFree) {
        return { status: 'Free Reassignment Available', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="h-4 w-4" /> };
      } else {
      return { status: 'No Invoice', color: 'text-orange-600 bg-orange-100', icon: <AlertCircle className="h-4 w-4" /> };
    }
    }

    // Check billing status for reassigned entries
    const reassignmentBills = patient.reassignedBilling || [];
    const latestBill = reassignmentBills[reassignmentBills.length - 1];
    
    // Debug logging for bill status
    if (latestBill) {
      console.log('🔍 Bill Status Debug:', {
        patientName: patient.name,
        billStatus: latestBill.status,
        billId: latestBill._id,
        invoiceNumber: latestBill.invoiceNumber,
        cancelledAt: latestBill.cancelledAt,
        refundedAt: latestBill.refundedAt,
        customData: latestBill.customData
      });
    }
    
    // Check if the latest bill is cancelled
    if (latestBill && latestBill.status === 'cancelled') {
      console.log('✅ Bill is cancelled, showing cancelled status');
      return { status: 'Bill Cancelled', color: 'text-red-600 bg-red-100', icon: <X className="h-4 w-4" /> };
    }
    
    // Enhanced refund status checking - check both status and refund amounts
    if (latestBill) {
      const totalAmount = latestBill.customData?.totals?.total || latestBill.amount || 0;
      const paidAmount = latestBill.customData?.totals?.paid || latestBill.paidAmount || 0;
      const refundedAmount = latestBill.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
      
      console.log('🔍 Enhanced Refund Check:', {
        patientName: patient.name,
        billStatus: latestBill.status,
        totalAmount,
        paidAmount,
        refundedAmount,
        hasRefunds: latestBill.refunds && latestBill.refunds.length > 0
      });
      
      // Check if there are refunds and determine if it's full or partial
      if (latestBill.refunds && latestBill.refunds.length > 0) {
        // If refunded amount equals the total amount, it's a full refund
        if (refundedAmount >= totalAmount) {
          console.log('✅ Full refund detected based on refund amount');
          return { status: 'Bill Refunded', color: 'text-purple-600 bg-purple-100', icon: <RotateCcw className="h-4 w-4" /> };
        }
        // If there are refunds but amount is less than total, it's partial
        else if (refundedAmount > 0) {
          console.log('✅ Partial refund detected based on refund amount');
          return { status: 'Partially Refunded', color: 'text-yellow-600 bg-yellow-100', icon: <RotateCcw className="h-4 w-4" /> };
        }
      }
      
      // Fallback to status-based checking
      if (latestBill.status === 'refunded') {
        console.log('✅ Bill is refunded, showing refunded status');
        return { status: 'Bill Refunded', color: 'text-purple-600 bg-purple-100', icon: <RotateCcw className="h-4 w-4" /> };
      }
      
      if (latestBill.status === 'partially_refunded') {
        console.log('✅ Bill is partially refunded, showing partially refunded status');
        return { status: 'Partially Refunded', color: 'text-yellow-600 bg-yellow-100', icon: <RotateCcw className="h-4 w-4" /> };
      }
    }
    
    const totalAmount = reassignmentBills.reduce((sum, bill) => sum + (bill.totals?.total || bill.amount || 0), 0);
    const totalPaid = reassignmentBills.reduce((sum, bill) => sum + (bill.totals?.paid || bill.paidAmount || 0), 0);
    
    if (totalAmount === 0) {
      return { status: 'Free Consultation', color: 'text-blue-600 bg-blue-100', icon: <CheckCircle className="h-4 w-4" /> };
    } else if (totalPaid === 0) {
      return { status: 'Pending Payment', color: 'text-orange-600 bg-orange-100', icon: <AlertCircle className="h-4 w-4" /> };
    } else if (totalPaid < totalAmount) {
      return { status: 'Partial Payment', color: 'text-yellow-600 bg-yellow-100', icon: <Clock className="h-4 w-4" /> };
    } else {
      return { status: 'Fully Paid', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="h-4 w-4" /> };
    }
  };

  const getStats = () => {
    const totalPatients = finalFilteredPatients.length;
    const eligibleForFree = finalFilteredPatients.filter(p => isEligibleForFreeReassignment(p)).length;
    const alreadyReassigned = finalFilteredPatients.filter(p => p.isReassigned || p.reassignmentHistory?.length > 0).length;
    const pendingBilling = finalFilteredPatients.filter(p => {
      const status = getReassignmentStatus(p);
      return status.status === 'No Invoice' || status.status === 'Pending Payment';
    }).length;
    
    const refunded = finalFilteredPatients.filter(p => {
      const status = getReassignmentStatus(p);
      return status.status === 'Bill Refunded' || status.status === 'Partially Refunded';
    }).length;
    
    return { 
      totalPatients, 
      eligibleForFree,
      alreadyReassigned, 
      pendingBilling,
      refunded
    };
  };

  const stats = getStats();

  return (
    <ReceptionistLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-md font-bold text-slate-800 mb-2">
                  Patient Reassignment & Billing
                </h1>
                <p className="text-slate-600 text-sm">
                  Reassign patients who have completed their first consultation. First reassignment within 7 days is free.
                </p>
              </div>
              <div className="flex items-center gap-3">
                    <button
                  onClick={() => dispatch(fetchReceptionistPatients())} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                  <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 mb-6">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search patients by name, UH ID, phone, email, or doctor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Filter */}
                <div className="lg:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="not reassigned">Not Reassigned</option>
                    <option value="free reassignment available">Free Reassignment Available</option>
                    <option value="no invoice">No Invoice</option>
                    <option value="pending payment">Pending Payment</option>
                    <option value="partial payment">Partial Payment</option>
                    <option value="fully paid">Fully Paid</option>
                    <option value="free consultation">Free Consultation</option>
                    <option value="bill cancelled">Bill Cancelled</option>
                    <option value="bill refunded">Bill Refunded</option>
                    <option value="partially refunded">Partially Refunded</option>
                  </select>
                </div>

                {/* Clear Filters */}
                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    onClick={clearAllSearches}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>

              {/* Results Summary */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span>Total: {finalFilteredPatients.length} patients</span>
                {searchTerm && (
                  <span className="text-blue-600">Search: "{searchTerm}"</span>
                )}
                {statusFilter !== 'all' && (
                  <span className="text-blue-600">Status: {statusFilter}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Total Patients</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.totalPatients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Free Reassignment</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.eligibleForFree}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Pending Billing</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.pendingBilling}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Already Reassigned</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.alreadyReassigned}</p>
                </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <RotateCcw className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Refunded</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.refunded}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Patients List */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-4 sm:p-6 border-b border-blue-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                  <UserPlus className="h-5 w-5 mr-2 text-blue-500" /> Patient Reassignment & Billing
              </h2>
              <p className="text-slate-600 mt-1 text-xs">
                {finalFilteredPatients.length} patients available for reassignment
              </p>
            </div>

            <div className="overflow-x-auto min-w-[1200px]">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-slate-600 text-xs">Loading patients...</p>
                </div>
              ) : finalFilteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-slate-600 mb-2">No Patients Found</h3>
                  <p className="text-slate-500 text-xs">
                    {searchTerm || subSearchTerm ? 'No patients match your search criteria.' : 'No patients with completed consultations found.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <table className="w-full min-w-[1200px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">UH ID</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Doctor</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Doctor</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor Status</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">First Consultation</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reassignment Status</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice Details</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {currentPatients.map((patient) => {
                        const statusInfo = getReassignmentStatus(patient);
                        const firstConsultationDate = patient.billing?.[0]?.createdAt ? new Date(patient.billing[0].createdAt) : null;
                        const isFree = isEligibleForFreeReassignment(patient);
                        const hasReassignmentBilling = patient.reassignedBilling && patient.reassignedBilling.length > 0;
                        
                        // Debug logging for patient data
                        if (patient.isReassigned) {
                          console.log('Reassigned patient data:', {
                            name: patient.name,
                            isReassigned: patient.isReassigned,
                            assignedDoctor: patient.assignedDoctor,
                            currentDoctor: patient.currentDoctor,
                            reassignmentHistory: patient.reassignmentHistory,
                            reassignedBilling: patient.reassignedBilling,
                            hasReassignmentBilling: hasReassignmentBilling
                          });
                        }
                        
                        return (
                          <tr key={patient._id} className="hover:bg-slate-50">
                            <td className="px-2 py-3 whitespace-nowrap">
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
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="text-xs text-slate-900">
                                <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-slate-400" /> {patient.email || 'No email'}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <Phone className="h-3 w-3 text-slate-400" /> {patient.phone || 'No phone'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-900">
                              {patient.uhId || 'No UH ID'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="text-xs text-slate-900">
                                {patient.assignedDoctor?.name || 'Not Assigned'}
                              </div>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="text-xs text-slate-900">
                                {patient.isReassigned ? (
                                  <div className="flex items-center gap-1">
                                    {patient.currentDoctor?.name ? (
                                      <>
                                        <span className="text-blue-600 font-medium">{patient.currentDoctor.name}</span>
                                        <span className="text-xs text-slate-500">(Reassigned)</span>
                                      </>
                                    ) : (
                                      <span className="text-orange-600 font-medium">Reassigned (Doctor not loaded)</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500">Same as Assigned</span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="text-xs">
                                {(() => {
                                  const isWorkingHoursViolation = patient.workingHoursViolation && patient.requiresReassignment;
                                  const isViewed = patient.viewedByDoctor;
                                  const appointmentStatus = patient.appointmentStatus;
                                  
                                  if (isWorkingHoursViolation) {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Working Hours Violation
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  if (isViewed) {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Viewed
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  if (appointmentStatus === 'scheduled') {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Scheduled
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="text-xs">
                                {firstConsultationDate ? (
                                  <>
                                    <div className="text-slate-900 font-medium">
                                      {firstConsultationDate.toLocaleDateString('en-GB')}
                                    </div>
                                    <div className="text-slate-500">
                                      {firstConsultationDate.toLocaleTimeString('en-GB', { 
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true 
                                      })}
                                    </div>
                                    {isFree && (
                                      <div className="text-xs text-green-600 font-medium mt-1">
                                        Free reassignment available
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-400">No consultation date</span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.icon}
                                  {statusInfo.status}
                                </span>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="text-xs text-slate-600">
                                {hasReassignmentBilling ? (
                                  <div className="space-y-0.5">
                                    {(() => {
                                      const latestBill = patient.reassignedBilling?.[patient.reassignedBilling.length - 1];
                                      if (!latestBill) return null;
                                      
                                      const totalAmount = latestBill.customData?.totals?.total || latestBill.amount || 0;
                                      const remainingPaidAmount = latestBill.customData?.totals?.paid || latestBill.paidAmount || 0;
                                      const refundedAmountFromRefunds = latestBill.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
                                      
                                      // For reassign patients, calculate refunded amount as: Total - Remaining
                                      const calculatedRefundedAmount = totalAmount - remainingPaidAmount;
                                      const refundedAmount = refundedAmountFromRefunds > 0 ? refundedAmountFromRefunds : calculatedRefundedAmount;
                                      
                                      const isRefunded = latestBill.status === 'refunded';
                                      const isPartiallyRefunded = latestBill.status === 'partially_refunded';
                                      const isCancelled = latestBill.status === 'cancelled';
                                      
                                      // For cancelled/refunded bills, show the actual current state
                                      let paidAmount = remainingPaidAmount;
                                      let balance = totalAmount - remainingPaidAmount;
                                      
                                      if (isRefunded) {
                                        // Fully refunded: no amount paid, full balance
                                        paidAmount = 0;
                                        balance = totalAmount;
                                      } else if (isPartiallyRefunded) {
                                        // Partially refunded: no amount paid (all refunded), balance is penalty amount
                                        paidAmount = 0;
                                        balance = totalAmount - refundedAmount; // This gives us the penalty amount
                                      } else if (isCancelled) {
                                        // Cancelled: no amount paid, full balance
                                        paidAmount = 0;
                                        balance = totalAmount;
                                      }
                                      
                                      const availableForRefund = paidAmount;
                                      
                                      return (
                                        <>
                                          <div className="font-medium text-slate-800 text-xs">
                                            {latestBill.invoiceNumber}
                                          </div>
                                          <div className="text-slate-600 text-xs">
                                            ₹{totalAmount.toFixed(0)}
                                          </div>
                                          {/* Show appropriate payment/refund information */}
                                          {isRefunded || isPartiallyRefunded ? (
                                            <div className="text-purple-600 text-xs font-medium">
                                              Refunded: ₹{refundedAmount.toFixed(0)}
                                            </div>
                                          ) : (
                                            <div className="text-slate-600 text-xs">
                                              Paid: ₹{paidAmount.toFixed(0)}
                                            </div>
                                          )}
                                          {isRefunded ? (
                                            <div className="text-purple-600 text-xs font-medium">
                                              Status: Fully Refunded
                                            </div>
                                          ) : isPartiallyRefunded ? (
                                            <div className="text-yellow-600 text-xs font-medium">
                                              Status: Partially Refunded
                                            </div>
                                          ) : isCancelled ? (
                                            <div className="text-red-600 text-xs font-medium">
                                              Status: Cancelled
                                            </div>
                                          ) : balance > 0 ? (
                                            <div className="text-orange-600 text-xs font-medium">
                                              Balance: ₹{balance.toFixed(0)}
                                            </div>
                                          ) : (
                                            <div className="text-green-600 text-xs font-medium">
                                              Status: Fully Paid
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="text-slate-400 text-xs">
                                    No invoice
                                  </div>
                                )}
                              </div>
                            </td>
                              <td className="px-2 py-3 whitespace-nowrap">
                                <div className="text-xs flex flex-col gap-0.5">
                                  {(() => {
                                    const isReassigned = patient.isReassigned || patient.reassignmentHistory?.length > 0;
                                    const latestBill = patient.reassignedBilling?.[patient.reassignedBilling.length - 1];
                                    const isCancelled = latestBill?.status === 'cancelled';
                                    
                                    // Enhanced refund status checking
                                    let isRefunded = latestBill?.status === 'refunded';
                                    let isPartiallyRefunded = latestBill?.status === 'partially_refunded';
                                    
                                    if (latestBill?.refunds && latestBill.refunds.length > 0) {
                                      const totalAmount = latestBill.customData?.totals?.total || latestBill.amount || 0;
                                      const refundedAmount = latestBill.refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
                                      if (refundedAmount >= totalAmount) {
                                        isRefunded = true;
                                        isPartiallyRefunded = false;
                                      } else if (refundedAmount > 0) {
                                        isRefunded = false;
                                        isPartiallyRefunded = true;
                                      }
                                    }
                                    
                                    const hasPayment = latestBill && (latestBill.customData?.totals?.paid || latestBill.paidAmount || 0) > 0;
                                    
                                    // Step 1: Show appropriate reassign button based on working hours violation
                                    const isWorkingHoursViolation = patient.workingHoursViolation && patient.requiresReassignment;
                                    const buttons = [];
                                    
                                    if (isWorkingHoursViolation) {
                                      buttons.push(
                                  <button
                                          key="working-hours-reassign"
                                          onClick={() => handleWorkingHoursReassign(patient)}
                                          className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors flex items-center justify-center gap-1 border border-red-200"
                                        >
                                          <AlertCircle className="h-3 w-3" /> Reassign (No Bill)
                                        </button>
                                      );
                                    } else {
                                      buttons.push(
                                        <button
                                          key="reassign"
                                    onClick={() => handleReassignPatient(patient)}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1 border border-blue-200"
                                  >
                                    <UserPlus className="h-3 w-3" /> Reassign
                                  </button>
                                      );
                                    }

                                    // Step 2: If reassigned, show Create Bill (skip for working hours violations)
                                    // Allow multiple reassignment invoices - only hide if latest bill is not cancelled/refunded
                                    const latestBillStatus = latestBill?.status;
                                    const canCreateNewBill = !latestBillStatus || 
                                      latestBillStatus === 'cancelled' || 
                                      latestBillStatus === 'refunded' || 
                                      latestBillStatus === 'partially_refunded';
                                    
                                    if (isReassigned && canCreateNewBill && !isWorkingHoursViolation) {
                                      buttons.push(
                                    <button
                                          key="create-bill"
                                          onClick={() => handleCreateInvoice(patient)}
                                      className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1 border border-green-200"
                                    >
                                      <Calculator className="h-3 w-3" /> Create Bill
                                    </button>
                                      );
                                    }

                                    // Step 3: Show View Bill button for any bill that exists (except cancelled bills)
                                    const isFullyRefunded = isRefunded;
                                    const canViewBill = hasReassignmentBilling && !isCancelled;
                                    const canPay = hasReassignmentBilling && !isCancelled && !isFullyRefunded && !isPartiallyRefunded;
                                    
                                    // Always show View Bill button if bill exists and not cancelled
                                    if (canViewBill) {
                                      buttons.push(
                                    <button
                                          key="view-bill"
                                      onClick={() => {
                                        setSelectedPatient(patient);
                                        setShowInvoicePreviewModal(true);
                                      }}
                                      className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1 border border-blue-200"
                                    >
                                      <Eye className="h-3 w-3" /> View Bill
                                    </button>
                                      );
                                    }
                                    
                                    // Show Pay button only if bill can be paid and has balance
                                    if (canPay) {
                                      // Only show Pay button if there's actually a balance to pay
                                      const totalAmount = latestBill?.customData?.totals?.total || latestBill?.amount || 0;
                                      const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
                                      const balance = totalAmount - paidAmount;
                                      
                                      if (balance > 0) {
                                        buttons.push(
                                      <button
                                            key="pay"
                                            onClick={() => {
                                              console.log('💳 Process Payment clicked from table for:', patient.name);
                                              const latestBill = patient.reassignedBilling?.[patient.reassignedBilling.length - 1];
                                              setGeneratedInvoice(latestBill);
                                              setSelectedPatient(patient);
                                              setShowPaymentModal(true);
                                            }}
                                            className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1 border border-green-200"
                                          >
                                            <CreditCard className="h-3 w-3" /> Pay
                                          </button>
                                        );
                                      }
                                    }

                                    // Step 4: If bill is paid and not cancelled/refunded, show Cancel button
                                    if (hasReassignmentBilling && hasPayment && !isCancelled && !isFullyRefunded && !isPartiallyRefunded) {
                                      buttons.push(
                                        <button
                                          key="cancel-bill"
                                      onClick={() => {
                                        setSelectedPatient(patient);
                                        setShowCancelBillModal(true);
                                      }}
                                      className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors flex items-center justify-center gap-1 border border-red-200"
                                    >
                                      <Ban className="h-3 w-3" /> Cancel Bill
                                    </button>
                                      );
                                    }

                                    // Step 5: Show Refund button for cancelled bills with payments OR partially refunded bills
                                    const hasAvailableRefund = (() => {
                                      const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
                                      const refundedAmount = latestBill?.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
                                      return paidAmount - refundedAmount > 0;
                                    })();
                                    
                                    if (hasReassignmentBilling && hasAvailableRefund && (isCancelled || isPartiallyRefunded)) {
                                      buttons.push(
                                    <button
                                          key="refund"
                                      onClick={() => {
                                        setSelectedPatient(patient);
                                        setShowRefundModal(true);
                                      }}
                                      className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200 transition-colors flex items-center justify-center gap-1 border border-orange-200"
                                    >
                                      <RotateCcw className="h-3 w-3" /> 
                                      {isPartiallyRefunded ? 'Refund More' : 'Refund'}
                                    </button>
                                      );
                                    }

                                    return buttons;
                                  })()}
                              </div>
                            </td>
                          </tr>
                          )
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Pagination */}
            {finalFilteredPatients.length > 0 && (
              <div className="flex justify-between items-center p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, finalFilteredPatients.length)} of {finalFilteredPatients.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Show:</span>
                    <select
                      value={patientsPerPage}
                      onChange={(e) => handlePatientsPerPageChange(e.target.value)}
                      className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-sm text-slate-600">per page</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50 bg-white"
                    >
                      Previous
                    </button>
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium"
                    >
                      {currentPage}
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50 bg-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reassign Patient Modal */}
      {showReassignModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 overflow-y-auto" onClick={() => setShowReassignModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowReassignModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-blue-500" /> Reassign Patient
              </h2>
              
              <p className="text-sm text-slate-600 mb-4">
                Reassigning patient <span className="font-semibold text-blue-600">{selectedPatient.name}</span> (UH ID: {selectedPatient.uhId}) from Dr. {selectedPatient.assignedDoctor?.name || 'Not Assigned'}.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                console.log('🔄 Starting reassignment process...');
                console.log('Selected patient:', selectedPatient);
                console.log('Reassign data:', reassignData);
                console.log('Center ID:', getCenterId());
                
                try {
                  const requestData = {
                    patientId: selectedPatient._id,
                    newDoctorId: reassignData.newDoctorId,
                    reason: reassignData.reason,
                    notes: reassignData.notes,
                    centerId: getCenterId()
                  };
                  
                  console.log('Sending request to /patients/reassign with data:', requestData);
                  
                  const response = await API.post('/patients/reassign', requestData);
                  
                  console.log('Reassignment response:', response.data);
                  
                  if (response.data.success) {
                    toast.success('Patient reassigned successfully');
                    dispatch(fetchReceptionistPatients());
                    setShowReassignModal(false);
                    setReassignData({ newDoctorId: '', reason: '', notes: '' });
                  } else {
                    toast.error(response.data.message || 'Failed to reassign patient');
                  }
                } catch (error) {
                  console.error('Reassignment error:', error);
                  console.error('Error response:', error.response?.data);
                  toast.error(error.response?.data?.message || 'Failed to reassign patient');
                }
              }} className="space-y-4">
                {/* Current Doctor */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Current Doctor
                  </label>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedPatient.currentDoctor?.name || selectedPatient.assignedDoctor?.name || 'Not Assigned'}
                  </p>
                </div>

                {/* New Doctor Selection */}
                <div>
                  <label htmlFor="newDoctor" className="block text-sm font-medium text-slate-700 mb-2">
                    New Doctor *
                  </label>
                  <select
                    id="newDoctor"
                    value={reassignData.newDoctorId}
                    onChange={(e) => setReassignData({...reassignData, newDoctorId: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select a Doctor</option>
                    {doctorsLoading ? (
                      <option disabled>Loading doctors...</option>
                    ) : (
                      availableDoctors.map(doctor => (
                        <option key={doctor._id} value={doctor._id}>
                          Dr. {doctor.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Reason for Reassignment */}
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
                    Reason for Reassignment *
                  </label>
                  <input
                    id="reason"
                    type="text"
                    value={reassignData.reason}
                    onChange={(e) => setReassignData({...reassignData, reason: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., Doctor A is on leave, Specialist referral"
                  />
                </div>
                
                {/* Notes (Optional) */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                    Internal Notes
                  </label>
                  <textarea
                    id="notes"
                    value={reassignData.notes}
                    onChange={(e) => setReassignData({...reassignData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Any additional details for the record"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReassignModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!reassignData.newDoctorId || !reassignData.reason}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserCheck className="h-5 w-5" />
                    Confirm Reassignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal - Updated 2025-01-16 15:00 */}
      {showInvoicePreviewModal && selectedPatient && (() => {
        const latestBill = selectedPatient.reassignedBilling?.[selectedPatient.reassignedBilling.length - 1];
        if (!latestBill) return null;
        
        // Extract data from backend
        const totalAmount = latestBill.amount || 0;
        const refundedAmount = latestBill.refundAmount || 0;
        const remainingPaidAmount = latestBill.paidAmount || 0;
        
        // Get custom data if available
        const customTotalAmount = latestBill.customData?.totals?.total || 0;
        const customPaidAmount = latestBill.customData?.totals?.paid || 0;
        const customRefundedAmount = latestBill.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
        
        // Determine which data source to use
        const finalTotalAmount = customTotalAmount || totalAmount;
        const finalRefundedAmount = customRefundedAmount || refundedAmount;
        const finalRemainingPaidAmount = customPaidAmount || remainingPaidAmount;
        
        // For reassign patients, the logic is different:
        // - totalAmount: Total bill amount (1050)
        // - paidAmount: Amount remaining after refund (450 - this is the penalty)
        // - refundAmount: Amount that was refunded (600)
        // - originalPaidAmount: Original payment before refund (1050)
        const originalPaidAmount = finalTotalAmount; // For reassign patients, original payment = total amount
        
        const isCancelled = latestBill.status === 'cancelled';
        
        // Enhanced refund status checking - check both status and refund amounts
        let isRefunded = latestBill.status === 'refunded';
        let isPartiallyRefunded = latestBill.status === 'partially_refunded';
        
        // Check refund amounts to determine actual status
        if (latestBill.refunds && latestBill.refunds.length > 0) {
          const refundedAmount = latestBill.refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
          if (refundedAmount >= finalTotalAmount) {
            isRefunded = true;
            isPartiallyRefunded = false;
          } else if (refundedAmount > 0) {
            isRefunded = false;
            isPartiallyRefunded = true;
          }
        }
        
        // For invoice display - show the correct amounts
        const displayPaidAmount = finalRemainingPaidAmount;     // Show actual paid amount
        const displayRefundedAmount = finalRefundedAmount;      // Show refunded amount
        const displayBalance = finalTotalAmount - finalRemainingPaidAmount; // Show balance due
        
        const isFullyPaid = displayBalance <= 0;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-xl" id="invoice-print">
              {/* Modal Header with Actions */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Invoice</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Action Buttons */}
                    
                    
                    <button
                      onClick={() => {
                        // Generate optimized PDF invoice for A4 printing
                        const printWindow = window.open('', '_blank');
                        const invoiceContent = document.getElementById('invoice-print').innerHTML;
                        
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Invoice - ${selectedPatient.name}</title>
                              <style>
                                * {
                                  box-sizing: border-box;
                                  margin: 0;
                                  padding: 0;
                                }
                                
                                body { 
                                  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; 
                                  margin: 0;
                                  padding: 5mm;
                                  color: #000;
                                  background: white;
                                  font-size: 12px;
                                  line-height: 1.3;
                                }
                                
                                .invoice-container {
                                  max-width: 190mm;
                                  margin: 0 auto;
                                  background: white;
                                  position: relative;
                                  height: 277mm; /* A4 height */
                                  overflow: hidden;
                                }
                                
                                /* A4 Optimized Styles with Medium Fonts */
                                .text-center { text-align: center; }
                                .font-bold { font-weight: bold; }
                                .text-base { font-size: 16px; }
                                .text-sm { font-size: 14px; }
                                .text-xs { font-size: 11px; }
                                .leading-tight { line-height: 1.2; }
                                .mb-6 { margin-bottom: 12px; }
                                .mb-4 { margin-bottom: 8px; }
                                .mb-3 { margin-bottom: 6px; }
                                .mb-2 { margin-bottom: 4px; }
                                .mb-1 { margin-bottom: 2px; }
                                .mt-1 { margin-top: 2px; }
                                .mt-10 { margin-top: 15px; }
                                .pt-4 { padding-top: 8px; }
                                .pb-4 { padding-bottom: 8px; }
                                .p-6 { padding: 12px; }
                                .p-3 { padding: 6px; }
                                .p-2 { padding: 4px; }
                                .border-b { border-bottom: 1px solid #000; }
                                .border-t { border-top: 1px solid #000; }
                                .border-slate-300 { border-color: #000; }
                                .border-slate-400 { border-color: #000; }
                                .border-slate-200 { border-color: #000; }
                                .text-slate-900 { color: #000; }
                                .text-slate-700 { color: #000; }
                                .text-slate-600 { color: #000; }
                                .text-slate-500 { color: #333; }
                                .text-blue-600 { color: #000; }
                                .text-green-600 { color: #000; }
                                .text-orange-600 { color: #000; }
                                .text-red-600 { color: #000; }
                                .underline { text-decoration: underline; }
                                .uppercase { text-transform: uppercase; }
                                .grid { display: grid; }
                                .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
                                .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
                                .gap-6 { gap: 8px; }
                                .gap-4 { gap: 6px; }
                                .gap-x-8 { column-gap: 8px; }
                                .flex { display: flex; }
                                .justify-between { justify-content: space-between; }
                                .justify-end { justify-content: flex-end; }
                                .items-end { align-items: flex-end; }
                                .w-80 { width: 200px; }
                                .w-20 { width: 40px; }
                                .w-28 { width: 60px; }
                                .w-32 { width: 70px; }
                                .w-12 { width: 30px; }
                                .w-24 { width: 50px; }
                                .flex-1 { flex: 1; }
                                .font-medium { font-weight: 500; }
                                .font-semibold { font-weight: 600; }
                                .min-w-full { min-width: 100%; }
                                .border-collapse { border-collapse: collapse; }
                                .border { border: 1px solid #000; }
                                .px-3 { padding-left: 6px; padding-right: 6px; }
                                .py-2 { padding-top: 3px; padding-bottom: 3px; }
                                .text-left { text-align: left; }
                                .text-right { text-align: right; }
                                .bg-slate-100 { background-color: #f5f5f5; }
                                .bg-slate-50 { background-color: #f9f9f9; }
                                .max-w-xs { max-width: 200px; }
                                .border-b-2 { border-bottom-width: 2px; }
                                .border-t-2 { border-top-width: 2px; }
                                .pt-2 { padding-top: 4px; }
                                .py-1 { padding-top: 2px; padding-bottom: 2px; }
                                .pt-1 { padding-top: 2px; }
                                .space-y-1 > * + * { margin-top: 2px; }
                                .space-y-3 > * + * { margin-top: 6px; }
                                
                                /* A4 Optimized Table styles with Medium Fonts */
                                table { 
                                  width: 100%; 
                                  border-collapse: collapse; 
                                  margin: 8px 0;
                                  font-size: 11px;
                                }
                                
                                th, td { 
                                  border: 1px solid #000; 
                                  padding: 4px 6px; 
                                  text-align: left; 
                                  font-size: 11px;
                                  vertical-align: top;
                                }
                                
                                th { 
                                  background-color: #f5f5f5; 
                                  font-weight: bold; 
                                  text-align: center;
                                }
                                
                                /* Hide elements that shouldn't print */
                                .no-print,
                                button,
                                .action-buttons {
                                  display: none !important;
                                }
                                
                                @media print {
                                  body {
                                    margin: 0;
                                    padding: 5mm;
                                    font-size: 11px;
                                  }
                                  
                                  .invoice-container {
                                    max-width: none;
                                    margin: 0;
                                    height: auto;
                                    overflow: visible;
                                  }
                                  
                                  table {
                                    page-break-inside: avoid;
                                  }
                                  
                                  .no-page-break {
                                    page-break-inside: avoid;
                                  }
                                  
                                  @page {
                                    size: A4;
                                    margin: 5mm;
                                  }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="invoice-container">
                                <div class="invoice-content">
                                  ${invoiceContent}
                                </div>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        
                        // Wait for content to load then print
                        setTimeout(() => {
                          printWindow.print();
                        }, 500);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                    
              <button
                onClick={() => setShowInvoicePreviewModal(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                      <X className="h-4 w-4" />
                      Close
              </button>
                  </div>
                </div>
              </div>

              {/* Invoice Content - Inline Implementation */}
              <div className="overflow-y-auto max-h-[calc(95vh-80px)] p-6">
                <div className="bg-white p-6 max-w-4xl mx-auto relative">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        {centerInfo.name}
                      </h1>
                      <p className="text-sm text-slate-700 mb-0.5">
                        {centerInfo.address}
                      </p>
                      <p className="text-sm text-slate-700 mb-0.5">
                        <span className="font-medium">Phone:</span> {centerInfo.phone} | <span className="font-medium">Fax:</span> {centerInfo.fax}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Website:</span> {centerInfo.website}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        <span className="font-bold">Bill No:</span> {latestBill.invoiceNumber}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        <span className="font-bold">BILL</span> Date: {new Date(latestBill.createdAt).toLocaleDateString('en-GB')}, {new Date(latestBill.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>

                  {/* Patient and Consultant Information */}
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">Patient Information</h3>
                      <div className="space-y-1 text-xs text-slate-700">
                        <div><span className="font-medium">Name:</span> {selectedPatient.name}</div>
                        <div><span className="font-medium">Age:</span> {selectedPatient.age} | <span className="font-medium">Gender:</span> {selectedPatient.gender || 'Not specified'}</div>
                        <div><span className="font-medium">Contact:</span> {selectedPatient.phone || 'N/A'}</div>
                        <div><span className="font-medium">File No:</span> {selectedPatient.uhId || 'N/A'}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">Consultant Information</h3>
                      <div className="space-y-1 text-xs text-slate-700">
                        <div><span className="font-medium">Doctor:</span> {selectedPatient.currentDoctor?.name || selectedPatient.assignedDoctor?.name || 'Not Assigned'}</div>
                        <div><span className="font-medium">Department:</span> {selectedPatient.currentDoctor?.specializations || selectedPatient.assignedDoctor?.specializations || 'General Medicine'}</div>
                        <div><span className="font-medium">User ID:</span> {selectedPatient.uhId || 'N/A'}</div>
                        <div><span className="font-medium">Ref. Doctor:</span> N/A</div>
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
                          
                          // Add consultation fee if exists
                          let consultationFee = latestBill.customData?.consultationFee || 0;
                          
                          // Fallback for old invoices without customData or with consultationFee = 0
                          if (consultationFee === 0 && latestBill.customData?.serviceCharges && latestBill.customData.serviceCharges.length > 0) {
                            // If service charges exist but consultation fee is 0, calculate it from total
                            const serviceTotal = latestBill.customData.serviceCharges.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                            consultationFee = finalTotalAmount - serviceTotal;
                          } else if (consultationFee === 0 && (!latestBill.customData || !latestBill.customData.serviceCharges || latestBill.customData.serviceCharges.length === 0)) {
                            // If no customData or no service charges, use the total as consultation fee
                            consultationFee = finalTotalAmount;
                          }
                          
                          if (consultationFee > 0) {
                            const consultationPaid = displayPaidAmount > 0 ? Math.min(consultationFee, displayPaidAmount) : 0;
                            const consultationBalance = consultationFee - consultationPaid;
                            let consultationStatus, consultationStatusColor;
                            
                            if (isCancelled) {
                              consultationStatus = 'Cancelled';
                              consultationStatusColor = 'text-red-600';
                            } else if (isRefunded) {
                              consultationStatus = 'Refunded';
                              consultationStatusColor = 'text-purple-600';
                            } else if (isPartiallyRefunded) {
                              consultationStatus = 'Partially Refunded';
                              consultationStatusColor = 'text-yellow-600';
                            } else {
                              consultationStatus = consultationPaid >= consultationFee ? 'Paid' : consultationPaid > 0 ? 'Partial' : 'Unpaid';
                              consultationStatusColor = consultationStatus === 'Paid' ? 'text-green-600' : consultationStatus === 'Partial' ? 'text-orange-600' : 'text-red-600';
                            }
                            
                            rows.push(
                              <tr key="consult">
                                <td className="border border-slate-300 px-3 py-2 text-xs">{serialNumber++}</td>
                                <td className="border border-slate-300 px-3 py-2 text-xs">
                                  {latestBill.consultationType || 'OP'} Consultation Fee
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">1</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{consultationFee.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{consultationPaid.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{consultationBalance.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                                  <span className={`font-medium ${consultationStatusColor}`}>
                                    {consultationStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                          
                          // Add service charges
                          if (latestBill.customData?.serviceCharges && latestBill.customData.serviceCharges.length > 0) {
                            latestBill.customData.serviceCharges.forEach((service, index) => {
                              const serviceAmount = parseFloat(service.amount);
                              const consultationTotal = consultationFee;
                              const servicePaid = displayPaidAmount > consultationTotal ? Math.min(serviceAmount, displayPaidAmount - consultationTotal) : 0;
                              const serviceBalance = serviceAmount - servicePaid;
                              let serviceStatus, serviceStatusColor;
                              
                              if (isCancelled) {
                                serviceStatus = 'Cancelled';
                                serviceStatusColor = 'text-red-600';
                              } else if (isRefunded) {
                                serviceStatus = 'Refunded';
                                serviceStatusColor = 'text-purple-600';
                              } else if (isPartiallyRefunded) {
                                serviceStatus = 'Partially Refunded';
                                serviceStatusColor = 'text-yellow-600';
                              } else {
                                serviceStatus = servicePaid >= serviceAmount ? 'Paid' : servicePaid > 0 ? 'Partial' : 'Unpaid';
                                serviceStatusColor = serviceStatus === 'Paid' ? 'text-green-600' : serviceStatus === 'Partial' ? 'text-orange-600' : 'text-red-600';
                              }
                              
                              rows.push(
                                <tr key={`service-${index}`}>
                                  <td className="border border-slate-300 px-3 py-2 text-xs">{serialNumber++}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-xs">{service.name}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-center text-xs">1</td>
                                  <td className="border border-slate-300 px-3 py-2 text-right text-xs">{serviceAmount.toFixed(2)}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-right text-xs">{servicePaid.toFixed(2)}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-right text-xs">{serviceBalance.toFixed(2)}</td>
                                  <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                                    <span className={`font-medium ${serviceStatusColor}`}>
                                      {serviceStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          }
                          
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="flex justify-end mb-4">
                    <div className="w-72">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span>₹{finalTotalAmount.toFixed(2)}</span>
                        </div>
                        {latestBill.customData?.totals?.discountAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Discount(-):</span>
                            <span>₹{(latestBill.customData.totals.discountAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {latestBill.customData?.totals?.taxAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Tax Amount:</span>
                            <span>₹{(latestBill.customData.totals.taxAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-300 pt-1">
                          <span>Grand Total:</span>
                          <span>₹{finalTotalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-300 pt-1">
                          <span>Amount Paid:</span>
                          <span className="text-green-600 font-medium">₹{displayPaidAmount.toFixed(2)}</span>
                        </div>
                        {(isRefunded || isPartiallyRefunded) && (
                          <div className="flex justify-between">
                            <span>Amount Refunded:</span>
                            <span className="text-purple-600 font-medium">₹{displayRefundedAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {displayBalance > 0 && (
                          <div className="flex justify-between">
                            <span>Outstanding:</span>
                            <span className="text-orange-600 font-medium">₹{displayBalance.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-bold ${
                            isCancelled ? 'text-red-600' :
                            isRefunded ? 'text-purple-600' :
                            isPartiallyRefunded ? 'text-yellow-600' :
                            isFullyPaid ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {isCancelled ? 'CANCELLED' :
                             isRefunded ? 'FULLY REFUNDED' :
                             isPartiallyRefunded ? 'PARTIALLY REFUNDED' :
                             isFullyPaid ? 'FULLY PAID' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="mb-6">
                    <div className="text-xs">
                      <div><span className="font-medium">Paid Amount:</span> (Rs.) {displayPaidAmount > 0 ? `${displayPaidAmount.toFixed(0)} Only` : 'Zero Only'}</div>
                      {(isRefunded || isPartiallyRefunded) && (
                        <div className="mt-1"><span className="font-medium">Refunded Amount:</span> (Rs.) {displayRefundedAmount > 0 ? `${displayRefundedAmount.toFixed(0)} Only` : 'Zero Only'}</div>
                      )}
                      <div className="mt-1"><span className="font-medium">Payment Status:</span> {
                        isCancelled ? 'Cancelled' :
                        isRefunded ? 'Fully Refunded' :
                        isPartiallyRefunded ? 'Partially Refunded' :
                        isFullyPaid ? 'Fully Paid' : 'Pending'
                      }</div>
                    </div>
                  </div>

                  {/* Payment History Table */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Payment History</h4>
                    <div className="space-y-2">
                        {/* Show complete transaction history */}
                        
                        {/* 1. Initial Payment Transaction */}
                        {displayPaidAmount > 0 && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                1
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-800">₹{displayPaidAmount.toFixed(2)}</div>
                                <div className="text-xs text-slate-500">
                                  {latestBill.paidAt ? new Date(latestBill.paidAt).toLocaleDateString('en-GB') : 
                                   latestBill.createdAt ? new Date(latestBill.createdAt).toLocaleDateString('en-GB') : 
                                   'N/A'} at {latestBill.paidAt ? new Date(latestBill.paidAt).toLocaleTimeString('en-GB') : 
                                   latestBill.createdAt ? new Date(latestBill.createdAt).toLocaleTimeString('en-GB') : 
                                   'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">#1</div>
                              <div className="text-xs text-slate-400">
                                {latestBill.paymentMethod ? latestBill.paymentMethod.charAt(0).toUpperCase() + latestBill.paymentMethod.slice(1) : 'Cash'}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 2. Cancellation Transaction */}
                        {isCancelled && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium">
                                C
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-800">Bill Cancelled</div>
                                <div className="text-xs text-slate-500">
                                  {latestBill.cancelledAt ? new Date(latestBill.cancelledAt).toLocaleDateString('en-GB') : 
                                   latestBill.createdAt ? new Date(latestBill.createdAt).toLocaleDateString('en-GB') : 
                                   'N/A'} at {latestBill.cancelledAt ? new Date(latestBill.cancelledAt).toLocaleTimeString('en-GB') : 
                                   latestBill.createdAt ? new Date(latestBill.createdAt).toLocaleTimeString('en-GB') : 
                                   'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Cancelled</div>
                              <div className="text-xs text-slate-400">
                                Status: Cancelled
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 3. Refund Transaction */}
                        {(isRefunded || isPartiallyRefunded) && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                                R
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-800">₹{displayRefundedAmount.toFixed(2)} (Refund)</div>
                                <div className="text-xs text-slate-500">
                                  {latestBill.refundedAt ? new Date(latestBill.refundedAt).toLocaleDateString('en-GB') : 
                                   latestBill.createdAt ? new Date(latestBill.createdAt).toLocaleDateString('en-GB') : 
                                   'N/A'} at {latestBill.refundedAt ? new Date(latestBill.refundedAt).toLocaleTimeString('en-GB') : 
                                   latestBill.createdAt ? new Date(latestBill.createdAt).toLocaleTimeString('en-GB') : 
                                   'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Refund</div>
                              <div className="text-xs text-slate-400">
                                {isRefunded ? 'Full Refund' : 'Partial Refund'}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 4. Current State (if no payment history) */}
                        {displayPaidAmount === 0 && !isCancelled && !isRefunded && !isPartiallyRefunded && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                                P
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-800">₹{finalTotalAmount.toFixed(2)} (Pending)</div>
                                <div className="text-xs text-slate-500">
                                  {new Date(latestBill.createdAt).toLocaleDateString('en-GB')} at {new Date(latestBill.createdAt).toLocaleTimeString('en-GB')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Pending</div>
                              <div className="text-xs text-slate-400">
                                Status: Unpaid
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                </div>

                  {/* Payment Summary */}
                  <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Payment Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Total Bill Amount:</span>
                          <span className="font-medium">₹{finalTotalAmount.toFixed(2)}</span>
                  </div>
                        <div className="flex justify-between mb-1">
                          <span>Amount Paid:</span>
                          <span className="font-medium text-green-600">₹{displayPaidAmount.toFixed(2)}</span>
                        </div>
                        {(isRefunded || isPartiallyRefunded) && (
                          <div className="flex justify-between mb-1">
                            <span>Amount Refunded:</span>
                            <span className="font-medium text-purple-600">₹{displayRefundedAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Bill Status:</span>
                          <span className={`font-medium ${
                            isCancelled ? 'text-red-600' : 
                            isRefunded ? 'text-purple-600' : 
                            isFullyPaid ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {isCancelled ? 'Cancelled' : 
                             isRefunded ? 'Fully Refunded' : 
                             isPartiallyRefunded ? 'Partially Refunded' :
                             isFullyPaid ? 'Fully Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
              </div>

                  {/* Generation Details - Compact for A4 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Left - Generation Info */}
                    <div className="text-xs">
                      <div><span className="font-medium">Generated By:</span> {user?.name || 'System'}</div>
                      <div><span className="font-medium">Date:</span> {new Date().toLocaleDateString('en-GB')}</div>
                      <div><span className="font-medium">Time:</span> {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
              </div>
                    
                    {/* Right - Invoice Terms & Signature */}
                    <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2">
                      <div className="font-semibold text-slate-800 mb-1 text-center">Invoice Terms</div>
                      <div className="space-y-1 text-slate-700 mb-2">
                        <div>• Original invoice document</div>
                        <div>• Payment due upon receipt</div>
                        <div>• Keep for your records</div>
                        <div>• No refunds after 7 days</div>
            </div>
                      <div className="border-t border-slate-200 pt-1">
                        <div className="font-medium">Signature:</div>
                        <div className="text-center mt-2">For {centerInfo.name}</div>
          </div>
        </div>
                  </div>

                  {/* Footer - Compact */}
                  <div className="text-center text-xs text-slate-600">
                    <div className="mb-1">
                      <strong>"For Home Sample Collection"</strong>
                    </div>
                    <div>
                      <span className="font-medium">Miss Call:</span> {centerInfo.missCallNumber || '080-42516666'} 
                      <span className="mx-2">|</span>
                      <span className="font-medium">Mobile:</span> {centerInfo.mobileNumber || '9686197153'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 overflow-y-auto" onClick={() => setShowCreateInvoiceModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-green-500" /> Create Invoice for Reassigned Patient
              </h2>
              
              <p className="text-sm text-slate-600 mb-4">
                Patient: <span className="font-semibold text-blue-600">{selectedPatient.name}</span> (UH ID: {selectedPatient.uhId})
                <br />
                Doctor: <span className="font-semibold text-blue-600">{selectedPatient.assignedDoctor?.name || 'Not Assigned'}</span>
                {isEligibleForFreeReassignment(selectedPatient) && (
                  <span className="text-green-600 font-medium ml-2">- Free reassignment within 7 days</span>
                )}
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  // Calculate totals
                  const serviceTotal = invoiceFormData.serviceCharges.reduce((sum, service) => 
                    sum + (parseFloat(service.amount) || 0), 0
                  );
                  const subtotal = (parseFloat(invoiceFormData.consultationFee) || 0) + serviceTotal;
                  const taxAmount = (subtotal * (parseFloat(invoiceFormData.taxPercentage) || 0)) / 100;
                  const discountAmount = (subtotal * (parseFloat(invoiceFormData.discountPercentage) || 0)) / 100;
                  const total = subtotal + taxAmount - discountAmount;

                  const invoiceData = {
                    patientId: selectedPatient._id,
                    doctorId: selectedPatient.assignedDoctor?._id,
                    centerId: getCenterId(),
                    consultationType: invoiceFormData.consultationType,
                    consultationFee: parseFloat(invoiceFormData.consultationFee) || 0,
                    serviceCharges: invoiceFormData.serviceCharges.filter(s => s.name && s.amount),
                    taxPercentage: parseFloat(invoiceFormData.taxPercentage) || 0,
                    discountPercentage: parseFloat(invoiceFormData.discountPercentage) || 0,
                    notes: invoiceFormData.notes,
                    isReassignedEntry: true,
                    totals: {
                      subtotal,
                      taxAmount,
                      discountAmount,
                      total,
                      paid: 0,
                      due: total
                    }
                  };

                  const response = await API.post('/reassignment-billing/create-invoice', invoiceData);
                  
                  if (response.data.success) {
                    setGeneratedInvoice(response.data.invoice);
                    setShowCreateInvoiceModal(false);
                    setShowInvoicePreviewModal(true);
                    toast.success('Invoice created successfully');
                    // Refresh patient data
                    dispatch(fetchReceptionistPatients());
                  } else {
                    toast.error(response.data.message || 'Failed to create invoice');
                  }
                } catch (error) {
                  console.error('Invoice creation error:', error);
                  toast.error(error.response?.data?.message || 'Failed to create invoice');
                }
              }} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                
                {/* Consultation Type and Fee */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="consultationType" className="block text-sm font-medium text-slate-700 mb-2">
                      Consultation Type *
                    </label>
                    <select
                      id="consultationType"
                      value={invoiceFormData.consultationType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const newFee = getConsultationFee(selectedPatient, newType);
                        setInvoiceFormData(prev => ({ 
                          ...prev, 
                          consultationType: newType, 
                          consultationFee: newFee
                        }));
                      }}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    >
                      <option value="IP">IP Consultation (₹1050)</option>
                      <option value="followup">Free Follow-up Visit (₹0)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="consultationFee" className="block text-sm font-medium text-slate-700 mb-2">
                      Consultation Fee (System Calculated)
                    </label>
                    <input
                      id="consultationFee"
                      type="number"
                      value={invoiceFormData.consultationFee}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 text-sm"
                    />
                  </div>
                </div>

                {/* Service Charges */}
                <div className="border border-slate-200 p-4 rounded-lg space-y-3">
                  <h3 className="text-md font-semibold text-slate-800">Additional Service Charges</h3>
                  {invoiceFormData.serviceCharges.map((service, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Service Name</label>
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => {
                            const newServiceCharges = [...invoiceFormData.serviceCharges];
                            newServiceCharges[index] = { ...newServiceCharges[index], name: e.target.value };
                            setInvoiceFormData(prev => ({ ...prev, serviceCharges: newServiceCharges }));
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                          placeholder="e.g., Injection, Dressings"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
                        <input
                          type="number"
                          value={service.amount}
                          onChange={(e) => {
                            const newServiceCharges = [...invoiceFormData.serviceCharges];
                            newServiceCharges[index] = { ...newServiceCharges[index], amount: e.target.value };
                            setInvoiceFormData(prev => ({ ...prev, serviceCharges: newServiceCharges }));
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                          placeholder="0.00"
                        />
                      </div>
                      {invoiceFormData.serviceCharges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newServiceCharges = invoiceFormData.serviceCharges.filter((_, i) => i !== index);
                            setInvoiceFormData(prev => ({ ...prev, serviceCharges: newServiceCharges }));
                          }}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceFormData(prev => ({
                        ...prev,
                        serviceCharges: [...prev.serviceCharges, { name: '', amount: '', description: '' }]
                      }));
                    }}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 mt-3"
                  >
                    <Plus className="h-3 w-3" /> Add Service
                  </button>
                </div>
                
                {/* Tax and Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tax" className="block text-sm font-medium text-slate-700 mb-2">
                      Tax Percentage (%)
                    </label>
                    <input
                      id="tax"
                      type="number"
                      min="0"
                      value={invoiceFormData.taxPercentage}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, taxPercentage: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="discount" className="block text-sm font-medium text-slate-700 mb-2">
                      Discount Percentage (%)
                    </label>
                    <input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={invoiceFormData.discountPercentage}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, discountPercentage: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                    Invoice Notes (for patient)
                  </label>
                  <textarea
                    id="notes"
                    value={invoiceFormData.notes}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, notes: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="e.g., Payment due immediately. Thank you for your visit."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateInvoiceModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    Generate & Preview Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPatient && generatedInvoice && (() => {
        // Auto-populate payment data when modal opens
        const amountDue = generatedInvoice.customData?.totals?.due || (generatedInvoice.amount - (generatedInvoice.paidAmount || 0)) || 0;
        if (paymentData.amount === '' && paymentData.paymentType === 'full') {
          setPaymentData(prev => ({...prev, amount: amountDue.toFixed(2)}));
        }
        return null;
      })()}
      {showPaymentModal && selectedPatient && generatedInvoice && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 overflow-y-auto" onClick={() => setShowPaymentModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-blue-500" /> Process Payment
              </h2>
              
              <p className="text-sm text-slate-600 mb-4">
                Patient: <span className="font-semibold text-blue-600">{selectedPatient.name}</span>
              </p>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <p className="text-xs font-medium text-blue-700">Invoice Total: ₹{(generatedInvoice.customData?.totals?.total || generatedInvoice.amount || 0).toFixed(2)}</p>
                <p className="text-xs font-medium text-blue-700">Total Paid: ₹{(generatedInvoice.customData?.totals?.paid || generatedInvoice.paidAmount || 0).toFixed(2)}</p>
                <p className="text-lg font-bold text-blue-800 mt-2">Amount Due: ₹{(generatedInvoice.customData?.totals?.due || (generatedInvoice.amount - (generatedInvoice.paidAmount || 0)) || 0).toFixed(2)}</p>
              </div>

              {/* Payment Type Selection */}
              <div className="mb-4">
                <label htmlFor="paymentType" className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Type *
                </label>
                <select
                  id="paymentType"
                  value={paymentData.paymentType}
                  onChange={(e) => {
                    const newPaymentType = e.target.value;
                    if (newPaymentType === 'full') {
                      const amountDue = generatedInvoice.customData?.totals?.due || (generatedInvoice.amount - (generatedInvoice.paidAmount || 0)) || 0;
                      setPaymentData({...paymentData, amount: amountDue.toFixed(2), paymentType: newPaymentType});
                    } else {
                      setPaymentData({...paymentData, amount: '', paymentType: newPaymentType});
                    }
                  }}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="full">Pay Full Amount</option>
                  <option value="partial">Partial Payment</option>
                </select>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const paymentDataToSubmit = {
                    invoiceId: generatedInvoice._id,
                    patientId: selectedPatient._id,
                    amount: parseFloat(paymentData.amount),
                    paymentMethod: paymentData.paymentMethod,
                    paymentType: paymentData.paymentType || 'full',
                    notes: paymentData.notes,
                    appointmentTime: paymentData.appointmentTime || null,
                    centerId: getCenterId()
                  };

                  const response = await API.post('/reassignment-billing/process-payment', paymentDataToSubmit);
                  
                  if (response.data.success) {
                    toast.success('Payment processed successfully');
                    dispatch(fetchReceptionistPatients());
                    setShowPaymentModal(false);
                    setPaymentData({ amount: '', paymentMethod: 'cash', paymentType: 'full', notes: '', appointmentTime: '' });
                    
                    // If appointment was scheduled, show success message
                    if (paymentData.appointmentTime) {
                      toast.info('Appointment scheduled successfully');
                    }
                    
                    // Close invoice preview modal
                    setShowInvoicePreviewModal(false);
                  } else {
                    toast.error(response.data.message || 'Failed to process payment');
                  }
                } catch (error) {
                  console.error('Payment processing error:', error);
                  toast.error(error.response?.data?.message || 'Failed to process payment');
                }
              }} className="space-y-4">
                
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Amount *
                  </label>
                  <input
                    id="amount"
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    required
                    min="0.01"
                    step="0.01"
                    max={generatedInvoice.customData?.totals?.due || (generatedInvoice.amount - (generatedInvoice.paidAmount || 0)) || 0}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${paymentData.paymentType === 'full' ? 'bg-slate-50' : ''}`}
                    placeholder="e.g., 850.00"
                    readOnly={paymentData.paymentType === 'full'}
                  />
                  {paymentData.paymentType === 'full' && (
                    <p className="text-xs text-slate-500 mt-1">Amount automatically set to full amount due</p>
                  )}
                  {paymentData.paymentType === 'partial' && (
                    <p className="text-xs text-slate-500 mt-1">Enter amount to pay (max: ₹{(generatedInvoice.customData?.totals?.due || (generatedInvoice.amount - (generatedInvoice.paidAmount || 0)) || 0).toFixed(2)})</p>
                  )}
                </div>

                <div>
                  <label htmlFor="method" className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    id="method"
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI/Online Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Notes
                  </label>
                  <textarea
                    id="notes"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., Payment received by Riya"
                  />
                </div>

                <div>
                  <label htmlFor="appointmentTime" className="block text-sm font-medium text-slate-700 mb-2">
                    Schedule Appointment (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="appointmentTime"
                    value={paymentData.appointmentTime}
                    onChange={(e) => setPaymentData({...paymentData, appointmentTime: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will schedule the patient's appointment after payment is processed
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <DollarSign className="h-5 w-5" />
                    Process Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Bill Modal */}
      {showCancelBillModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 overflow-y-auto" onClick={() => setShowCancelBillModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCancelBillModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Ban className="h-6 w-6 text-red-500" /> Cancel Bill
              </h2>
              
              <p className="text-sm text-slate-600 mb-4">
                Patient: <span className="font-semibold text-blue-600">{selectedPatient.name}</span>
              </p>

              <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-4">
                <p className="text-xs font-medium text-red-700">⚠️ This action will cancel the bill and make it non-billable.</p>
                <p className="text-xs text-red-600 mt-1">If payments were made, you may need to process a refund.</p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const centerId = getCenterId();
                  console.log('🔍 Center ID check:', {
                    user: user,
                    userCenterId: user?.centerId,
                    storedCenterId: localStorage.getItem('centerId'),
                    finalCenterId: centerId
                  });
                  
                  if (!centerId) {
                    toast.error('Center ID not found. Please log in again.');
                    return;
                  }
                  
                  const requestData = {
                    patientId: selectedPatient._id,
                    reason: cancelReason,
                    centerId: centerId
                  };
                  
                  console.log('🚀 Sending cancel bill request:', requestData);
                  console.log('🔍 Request validation:', {
                    patientId: requestData.patientId,
                    reason: requestData.reason,
                    centerId: requestData.centerId,
                    patientIdType: typeof requestData.patientId,
                    reasonType: typeof requestData.reason,
                    centerIdType: typeof requestData.centerId,
                    patientIdExists: !!requestData.patientId,
                    reasonExists: !!requestData.reason,
                    centerIdExists: !!requestData.centerId
                  });
                  
                  const response = await API.post('/reassignment-billing/cancel-bill', requestData);
                  
                  if (response.data.success) {
                    console.log('✅ Cancel bill response:', response.data);
                    toast.success('Bill cancelled successfully');
                    console.log('🔄 Refreshing patient data...');
                    dispatch(fetchReceptionistPatients());
                    setShowCancelBillModal(false);
                    setCancelReason('');
                    console.log('✅ Cancel bill modal closed and form reset');
                  } else {
                    console.log('❌ Cancel bill failed:', response.data);
                    toast.error(response.data.message || 'Failed to cancel bill');
                  }
                } catch (error) {
                  console.error('Bill cancellation error:', error);
                  toast.error(error.response?.data?.message || 'Failed to cancel bill');
                }
              }} className="space-y-4">
                
                <div>
                  <label htmlFor="cancelReason" className="block text-sm font-medium text-slate-700 mb-2">
                    Reason for Cancellation *
                  </label>
                  <textarea
                    id="cancelReason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="e.g., Patient requested cancellation, Doctor unavailable, etc."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCancelBillModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Keep Bill
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Ban className="h-5 w-5" />
                    Cancel Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPatient && (() => {
        // Auto-populate refund amount when modal opens
        const latestBill = selectedPatient.reassignedBilling?.[selectedPatient.reassignedBilling.length - 1];
        const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
        const refundedAmount = latestBill?.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
        const availableForRefund = paidAmount - refundedAmount;
        
        if (refundData.amount === '' && availableForRefund > 0) {
          setRefundData(prev => ({
            ...prev, 
            amount: availableForRefund.toFixed(2),
            refundType: 'partial',
            patientBehavior: 'okay' // Default to okay behavior
          }));
        }
        return null;
      })()}
      {showRefundModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 overflow-y-auto" onClick={() => setShowRefundModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowRefundModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-orange-500" /> Process Refund
              </h2>
              
              <p className="text-sm text-slate-600 mb-4">
                Patient: <span className="font-semibold text-blue-600">{selectedPatient.name}</span>
              </p>

              {(() => {
                const latestBill = selectedPatient.reassignedBilling?.[selectedPatient.reassignedBilling.length - 1];
                const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
                const totalAmount = latestBill?.customData?.totals?.total || latestBill?.amount || 0;
                const refundedAmount = latestBill?.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
                const availableForRefund = paidAmount - refundedAmount;
                
                return (
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mb-4">
                    <p className="text-xs font-medium text-orange-700">💰 Refund Summary:</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <p className="text-orange-600">Total Paid: ₹{paidAmount.toFixed(2)}</p>
                        <p className="text-orange-600">Already Refunded: ₹{refundedAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-orange-600">Available for Refund: ₹{availableForRefund.toFixed(2)}</p>
                        <p className="text-orange-600">Total Bill: ₹{totalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                <p className="text-xs text-orange-600 mt-2 font-medium">⚠️ This action cannot be undone.</p>
              </div>
                );
              })()}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!refundData.reason.trim()) {
                  toast.error('Please provide a refund reason');
                  return;
                }
                if (!refundData.amount || parseFloat(refundData.amount) <= 0) {
                  toast.error('Please enter a valid refund amount');
                  return;
                }
                try {
                  const refundPayload = {
                    patientId: selectedPatient._id,
                    amount: parseFloat(refundData.amount),
                    refundMethod: refundData.refundMethod,
                    refundType: refundData.refundType,
                    reason: refundData.reason.trim(),
                    notes: refundData.notes,
                    patientBehavior: refundData.patientBehavior, // Include patient behavior for penalty policy
                    centerId: getCenterId()
                  };
                  console.log('Processing refund:', refundPayload);
                  const response = await API.post('/reassignment-billing/process-refund', refundPayload);
                  
                  if (response.data.success) {
                    toast.success(`${refundData.refundType === 'full' ? 'Full' : 'Partial'} refund processed successfully!`);
                    dispatch(fetchReceptionistPatients());
                    setShowRefundModal(false);
                    setRefundData({ amount: '', refundMethod: 'cash', refundType: 'partial', reason: '', notes: '', patientBehavior: 'okay' });
                  } else {
                    toast.error(response.data.message || 'Failed to process refund');
                  }
                } catch (error) {
                  console.error('Refund processing error:', error);
                  toast.error(error.response?.data?.message || 'Failed to process refund');
                }
              }} className="space-y-4">
                
                {/* Refund Type Selection */}
                <div>
                  <label htmlFor="refundType" className="block text-sm font-medium text-slate-700 mb-2">
                    Refund Type *
                  </label>
                  <select
                    id="refundType"
                    value={refundData.refundType}
                    onChange={(e) => {
                      const newRefundType = e.target.value;
                      const latestBill = selectedPatient.reassignedBilling?.[selectedPatient.reassignedBilling.length - 1];
                      const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
                      const refundedAmount = latestBill?.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
                      const availableForRefund = paidAmount - refundedAmount;
                      
                      setRefundData(prev => ({
                        ...prev,
                        refundType: newRefundType,
                        amount: newRefundType === 'full' ? availableForRefund.toFixed(2) : prev.amount,
                        patientBehavior: 'okay' // Default to okay behavior
                      }));
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  >
                    <option value="partial">Partial Refund</option>
                    <option value="full">Full Refund</option>
                  </select>
                </div>

                {/* Refund Amount */}
                <div>
                  <label htmlFor="refundAmount" className="block text-sm font-medium text-slate-700 mb-2">
                    Refund Amount *
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="refundAmount"
                      type="number"
                      value={refundData.amount}
                      onChange={(e) => setRefundData({...refundData, amount: e.target.value})}
                      required
                      min="0.01"
                      step="0.01"
                      max={(() => {
                        const latestBill = selectedPatient.reassignedBilling?.[selectedPatient.reassignedBilling.length - 1];
                        const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
                        const refundedAmount = latestBill?.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
                        return paidAmount - refundedAmount;
                      })()}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      placeholder="e.g., 850.00"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const latestBill = selectedPatient.reassignedBilling?.[selectedPatient.reassignedBilling.length - 1];
                        const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
                        const refundedAmount = latestBill?.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
                        const availableForRefund = paidAmount - refundedAmount;
                        setRefundData(prev => ({...prev, amount: availableForRefund.toFixed(2), patientBehavior: 'okay'}));
                      }}
                      className="px-3 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 transition-colors text-xs font-medium"
                    >
                      Refund All
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Available for refund: ₹{(() => {
                      const latestBill = selectedPatient.reassignedBilling?.[selectedPatient.reassignedBilling.length - 1];
                      const paidAmount = latestBill?.customData?.totals?.paid || latestBill?.paidAmount || 0;
                      const refundedAmount = latestBill?.refunds?.reduce((sum, refund) => sum + (refund.amount || 0), 0) || 0;
                      return (paidAmount - refundedAmount).toFixed(2);
                    })()}
                  </p>
                </div>

                <div>
                  <label htmlFor="refundMethod" className="block text-sm font-medium text-slate-700 mb-2">
                    Refund Method *
                  </label>
                  <select
                    id="refundMethod"
                    value={refundData.refundMethod}
                    onChange={(e) => setRefundData({...refundData, refundMethod: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card Refund</option>
                    <option value="upi">UPI/Online Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="refundReason" className="block text-sm font-medium text-slate-700 mb-2">
                    Reason for Refund *
                  </label>
                  <textarea
                    id="refundReason"
                    value={refundData.reason}
                    onChange={(e) => setRefundData({...refundData, reason: e.target.value})}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    placeholder="e.g., Service not provided, Patient cancellation, etc."
                  />
                </div>

                {/* Patient Behavior Assessment */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Patient Behavior Assessment *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="patientBehavior"
                        value="okay"
                        checked={refundData.patientBehavior === 'okay'}
                        onChange={(e) => setRefundData({...refundData, patientBehavior: e.target.value})}
                        className="mr-2"
                      />
                      <span className="text-xs text-slate-700">Patient is okay - Registration fee (₹150) will be held as penalty</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="patientBehavior"
                        value="rude"
                        checked={refundData.patientBehavior === 'rude'}
                        onChange={(e) => setRefundData({...refundData, patientBehavior: e.target.value})}
                        className="mr-2"
                      />
                      <span className="text-xs text-slate-700">Patient is rude - Full refund including registration fee</span>
                    </label>
                  </div>
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                    <p><strong>Penalty Policy:</strong></p>
                    <p>• <strong>Okay Patient:</strong> Registration fee (₹150) held as penalty, only consultation/service fees refunded</p>
                    <p>• <strong>Rude Patient:</strong> Full refund including registration fee (no penalty)</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="refundNotes" className="block text-sm font-medium text-slate-700 mb-2">
                    Internal Notes
                  </label>
                  <textarea
                    id="refundNotes"
                    value={refundData.notes}
                    onChange={(e) => setRefundData({...refundData, notes: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    placeholder="e.g., Refund processed by Riya, Reference: REF123"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-5 w-5" />
                    {refundData.refundType === 'full' ? 'Process Full Refund' : 'Process Partial Refund'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Working Hours Reassignment Modal */}
      {showWorkingHoursReassignModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 overflow-y-auto" onClick={() => setShowWorkingHoursReassignModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowWorkingHoursReassignModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" /> Working Hours Reassignment
              </h2>
              
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-4">
                <p className="text-sm text-red-700 font-medium">⚠️ Working Hours Violation</p>
                <p className="text-xs text-red-600 mt-1">
                  Patient <span className="font-semibold">{selectedPatient.name}</span> was not viewed within working hours (7 AM - 8 PM).
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This reassignment will not generate a bill and requires a custom consultation date.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                console.log('🔄 Starting working hours reassignment process...');
                console.log('Selected patient:', selectedPatient);
                console.log('Reassign data:', workingHoursReassignData);
                
                try {
                  const requestData = {
                    patientId: selectedPatient._id,
                    newDoctorId: workingHoursReassignData.newDoctorId,
                    nextConsultationDate: workingHoursReassignData.nextConsultationDate,
                    reason: workingHoursReassignData.reason,
                    notes: workingHoursReassignData.notes,
                    centerId: getCenterId()
                  };
                  
                  console.log('Sending request to /working-hours/reassign-custom-date with data:', requestData);
                  
                  const response = await API.post('/working-hours/reassign-custom-date', requestData);
                  
                  console.log('Working hours reassignment response:', response.data);
                  
                  if (response.data.success) {
                    toast.success('Patient reassigned successfully with custom consultation date');
                    dispatch(fetchReceptionistPatients());
                    setShowWorkingHoursReassignModal(false);
                    setWorkingHoursReassignData({ 
                      newDoctorId: '', 
                      nextConsultationDate: '', 
                      reason: 'Working hours violation - not viewed within 7 AM to 8 PM', 
                      notes: '' 
                    });
                  } else {
                    toast.error(response.data.message || 'Failed to reassign patient');
                  }
                } catch (error) {
                  console.error('Working hours reassignment error:', error);
                  console.error('Error response:', error.response?.data);
                  toast.error(error.response?.data?.message || 'Failed to reassign patient');
                }
              }} className="space-y-4">
                
                {/* Current Doctor */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Current Doctor
                  </label>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedPatient.currentDoctor?.name || selectedPatient.assignedDoctor?.name || 'Not Assigned'}
                  </p>
                </div>

                {/* New Doctor Selection */}
                <div>
                  <label htmlFor="newDoctor" className="block text-sm font-medium text-slate-700 mb-2">
                    New Doctor *
                  </label>
                  <select
                    id="newDoctor"
                    value={workingHoursReassignData.newDoctorId}
                    onChange={(e) => setWorkingHoursReassignData({...workingHoursReassignData, newDoctorId: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select a Doctor</option>
                    {doctorsLoading ? (
                      <option disabled>Loading doctors...</option>
                    ) : (
                      availableDoctors.map(doctor => (
                        <option key={doctor._id} value={doctor._id}>
                          Dr. {doctor.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Next Consultation Date */}
                <div>
                  <label htmlFor="nextConsultationDate" className="block text-sm font-medium text-slate-700 mb-2">
                    Next Consultation Date *
                  </label>
                  <input
                    id="nextConsultationDate"
                    type="datetime-local"
                    value={workingHoursReassignData.nextConsultationDate}
                    onChange={(e) => setWorkingHoursReassignData({...workingHoursReassignData, nextConsultationDate: e.target.value})}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Select the date and time for the patient's next consultation
                  </p>
                </div>

                {/* Reason for Reassignment */}
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
                    Reason for Reassignment *
                  </label>
                  <input
                    id="reason"
                    type="text"
                    value={workingHoursReassignData.reason}
                    onChange={(e) => setWorkingHoursReassignData({...workingHoursReassignData, reason: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="e.g., Working hours violation - not viewed within 7 AM to 8 PM"
                  />
                </div>
                
                {/* Notes (Optional) */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                    Internal Notes
                  </label>
                  <textarea
                    id="notes"
                    value={workingHoursReassignData.notes}
                    onChange={(e) => setWorkingHoursReassignData({...workingHoursReassignData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="Any additional details for the record"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWorkingHoursReassignModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!workingHoursReassignData.newDoctorId || !workingHoursReassignData.nextConsultationDate || !workingHoursReassignData.reason}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserCheck className="h-5 w-5" />
                    Reassign (No Bill)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ReceptionistLayout>
  );
}
