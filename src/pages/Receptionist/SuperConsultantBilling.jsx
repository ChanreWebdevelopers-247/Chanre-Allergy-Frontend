import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchReceptionistPatients } from '../../features/receptionist/receptionistThunks';
import ReceptionistLayout from './ReceptionistLayout';
import { 
  Users, 
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

  // Cancel and Refund state
  const [showCancelBillModal, setShowCancelBillModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundData, setRefundData] = useState({
    reason: '',
    refundMethod: 'cash',
    refundType: 'withPenalty' // 'withPenalty' or 'full'
  });

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
      if (patients.length === 0) return;
      
      try {
        const testRequestsMap = {};
        
        // Fetch test requests for each patient
        const promises = patients.map(async (patient) => {
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

  // Filter patients - show all patients to allow creating superconsultant consultations for any patient
  useEffect(() => {
    if (searchTerm.trim()) {
      // When searching, filter by search term
      const filtered = patients.filter(patient => 
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.uhId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.assignedDoctor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setFilteredPatients(filtered);
    } else {
      // No search - show ALL patients to allow creating superconsultant consultations
      setFilteredPatients(patients);
    }
  }, [patients, searchTerm]);

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

  // Get superconsultant appointment display data
  // For superconsultant billing, we specifically look for appointmentTime set during payment processing
  const getSuperconsultantAppointmentData = (patient) => {
    // Check if patient has superconsultant billing
    const superconsultantBill = patient.billing?.find(bill => 
      bill.type === 'consultation' && 
      bill.consultationType?.startsWith('superconsultant_')
    );

    if (!superconsultantBill) {
      return null;
    }

    // Priority: Use appointmentTime from patient (set during superconsultant payment processing)
    if (patient.appointmentTime) {
      return {
        date: patient.appointmentTime,
        status: patient.appointmentStatus || 'scheduled',
        notes: patient.appointmentNotes
      };
    }

    // Check appointments array for superconsultant appointments
    if (patient.appointments && patient.appointments.length > 0) {
      // Find appointments related to superconsultant consultation
      const superconsultantAppointments = patient.appointments
        .map(apt => {
          const dateField = apt.scheduledAt || apt.appointmentTime || apt.date;
          if (!dateField) return null;
          
          try {
            const aptDate = new Date(dateField);
            if (!isNaN(aptDate.getTime())) {
              return {
                ...apt,
                _appointmentDate: aptDate
              };
            }
          } catch (e) {
            // Invalid date
          }
          return null;
        })
        .filter(apt => apt !== null && apt._appointmentDate);
      
      if (superconsultantAppointments.length > 0) {
        // Sort by date (earliest first)
        superconsultantAppointments.sort((a, b) => a._appointmentDate.getTime() - b._appointmentDate.getTime());
        const earliestAppointment = superconsultantAppointments[0];
        
        return {
          date: earliestAppointment._appointmentDate,
          status: earliestAppointment.status || patient.appointmentStatus || 'scheduled',
          notes: earliestAppointment.notes
        };
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
  const handleProcessPayment = (patient) => {
    const consultationBill = patient.billing?.find(bill => 
      bill.type === 'consultation' && 
      bill.consultationType?.startsWith('superconsultant_')
    );

    if (!consultationBill) {
      toast.error('No superconsultant invoice found');
      return;
    }

    setSelectedPatient(patient);
    
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

    if (!paymentData.appointmentTime) {
      toast.error('Please schedule an appointment date and time');
      return;
    }

    const appointmentDate = new Date(paymentData.appointmentTime);
    const now = new Date();
    if (appointmentDate <= now) {
      toast.error('Appointment must be scheduled for a future date and time');
      return;
    }

    try {
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
        consultationType: paymentData.consultationType
      };

      const response = await API.post('/billing/process-payment', paymentPayload);
      
      if (response.data.success) {
        toast.success('Payment processed successfully! Report sent to Superconsultant for review.');
        setShowPaymentModal(false);
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error(response.data.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
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
              <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-blue-500" />
                All Patients ({filteredPatients.length})
              </h2>
              <p className="text-slate-600 mt-1 text-xs">
                Create invoices for any patient to set up superconsultant consultation
              </p>
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
                    {filteredPatients.map((patient) => {
                        const statusInfo = getPatientStatus(patient);
                      const consultationBill = patient.billing?.find(bill => 
                        bill.type === 'consultation' && 
                        bill.consultationType?.startsWith('superconsultant_')
                      );
                      const totalAmount = consultationBill?.amount || 0;
                      const paidAmount = consultationBill?.paidAmount || 0;
                      const hasBilling = consultationBill !== undefined;
                      const appointmentData = getSuperconsultantAppointmentData(patient);
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
                                        <span className="text-slate-400">No appointment</span>
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
                onClick={() => setShowPaymentModal(false)}
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
                      <input
                        type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                      />
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
                      </select>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Consultation Type *
                </label>
                  <select
                    value={paymentData.consultationType}
                    onChange={(e) => setPaymentData({...paymentData, consultationType: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="superconsultant_normal">Normal Consultation</option>
                    <option value="superconsultant_audio">Audio Consultation</option>
                    <option value="superconsultant_video">Video Consultation</option>
                  </select>
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
                    onChange={(e) => setPaymentData({...paymentData, appointmentTime: e.target.value})}
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
                    onClick={() => setShowPaymentModal(false)}
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
                                  <span className={`font-medium ${serviceStatusColor}`}>{serviceStatus}</span>
                                </td>
                              </tr>
                            );
                          });
                          
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary and Amount in Words */}
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    {/* Left Column - Amount in Words */}
                    <div>
                      {(() => {
                        // CRITICAL: Only calculate refunds from THIS invoice (not all bills)
                        const invoiceNumber = invoiceData.invoiceNumber;
                        const invoiceBills = selectedPatient.billing?.filter(bill => 
                          bill.invoiceNumber === invoiceNumber
                        ) || [];
                        
                        const totalRefunded = invoiceBills.reduce((sum, bill) => {
                          // Sum refundAmount and also check refunds array
                          let refundTotal = bill.refundAmount || 0;
                          if (bill.refunds && Array.isArray(bill.refunds)) {
                            refundTotal += bill.refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
                          }
                          return sum + refundTotal;
                        }, 0);
                        
                        const hasCancelledBills = invoiceBills.some(bill => bill.status === 'cancelled');
                        
                        return (
                          <div className="text-xs">
                            {hasCancelledBills && (() => {
                              // Get cancellation reason from the cancelled bill in THIS invoice
                              const cancelledBill = invoiceBills.find(bill => bill.status === 'cancelled');
                              const cancellationReason = cancelledBill?.cancellationReason || 'No reason provided';
                              
                              return (
                                <div className="mb-2">
                                  <div className="font-medium text-red-600 mb-1">Bill Status: CANCELLED</div>
                                  {cancellationReason && (
                                    <div className="text-red-700 mt-1">
                                      <span className="font-medium">Cancellation Reason:</span> {cancellationReason}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {invoiceData.totalPaid > 0 && (
                              <div className="mb-1">
                                <span className="font-medium">Amount Paid:</span> (Rs.) {numberToWords(Math.round(invoiceData.totalPaid))} Only
                              </div>
                            )}
                            {totalRefunded > 0 && (
                              <div className="mb-1">
                                <span className="font-medium">Amount Refunded:</span> (Rs.) {numberToWords(Math.round(totalRefunded))} Only
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Right Column - Summary */}
                    <div className="flex justify-end">
                      <div className="w-72">
                        <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span>₹{invoiceData.totals.subtotal.toFixed(2)}</span>
                        </div>
                          {invoiceData.totals.discount > 0 && (
                        <div className="flex justify-between">
                          <span>Discount(-):</span>
                          <span>₹{invoiceData.totals.discount.toFixed(2)}</span>
                        </div>
                          )}
                        <div className="flex justify-between">
                          <span>Tax Amount:</span>
                          <span>₹{invoiceData.totals.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-300 pt-1">
                          <span>Grand Total:</span>
                          <span>₹{invoiceData.totals.total.toFixed(2)}</span>
                        </div>
                          <div className="flex justify-between border-t border-slate-300 pt-1">
                            <span>Amount Paid:</span>
                            <span className="text-green-600 font-medium">₹{invoiceData.totalPaid.toFixed(2)}</span>
                          </div>
                        {(() => {
                          // CRITICAL: Only calculate refunds from THIS invoice (not all bills)
                          const invoiceNumber = invoiceData.invoiceNumber;
                          const invoiceBills = selectedPatient.billing?.filter(bill => 
                            bill.invoiceNumber === invoiceNumber
                          ) || [];
                          
                          const totalRefunded = invoiceBills.reduce((sum, bill) => {
                            // Sum refundAmount and also check refunds array
                            let refundTotal = bill.refundAmount || 0;
                            if (bill.refunds && Array.isArray(bill.refunds)) {
                              refundTotal += bill.refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
                            }
                            return sum + refundTotal;
                          }, 0);
                          
                          const hasCancelledBills = invoiceBills.some(bill => bill.status === 'cancelled');
                          const outstandingAmount = invoiceData.totals.total - invoiceData.totalPaid;
                          
                          return (
                            <>
                                {totalRefunded > 0 && (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Amount Refunded:</span>
                                      <span className="text-orange-600 font-medium">₹{totalRefunded.toFixed(2)}</span>
                                    </div>
                                    {hasCancelledBills && (() => {
                                      const penalty = invoiceData.totalPaid - totalRefunded;
                                      if (penalty > 0) {
                                        return (
                                      <>
                                        <div className="flex justify-between">
                                          <span>Penalty Deducted:</span>
                                          <span className="text-red-600 font-medium">₹{penalty.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600 mt-1">
                                          <span>Penalty Reason:</span>
                                          <span>Registration Fee (₹150) held as penalty</span>
                                        </div>
                                      </>
                                        );
                                      }
                                      return null;
                                    })()}
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                      <span>Payment Method:</span>
                                      <span className="capitalize">{invoiceBills.find(bill => bill.paidAmount > 0)?.paymentMethod || 'cash'}</span>
                                    </div>
                                    {totalRefunded > 0 && (
                                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>Refund Method:</span>
                                        <span className="capitalize">{invoiceBills.find(bill => {
                                          if (bill.refundAmount > 0) return true;
                                          if (bill.refunds && Array.isArray(bill.refunds) && bill.refunds.length > 0) return true;
                                          return false;
                                        })?.refundMethod || invoiceBills.find(bill => bill.refunds?.[0]?.method)?.refunds?.[0]?.method || 'cash'}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              {outstandingAmount > 0 && !hasCancelledBills && (
                                <div className="flex justify-between">
                                  <span>Outstanding:</span>
                                  <span className="text-orange-600 font-medium">₹{outstandingAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {hasCancelledBills && (() => {
                                // Get cancellation reason from the cancelled bill in THIS invoice
                                const cancelledBill = invoiceBills.find(bill => bill.status === 'cancelled');
                                const cancellationReason = cancelledBill?.cancellationReason || 'No reason provided';
                                
                                return (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Status:</span>
                                      <span className="text-red-600 font-bold">BILL CANCELLED</span>
                                    </div>
                                    {cancellationReason && (
                                      <div className="flex justify-between text-xs text-slate-600 mt-1">
                                        <span>Reason:</span>
                                        <span className="text-red-700">{cancellationReason}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                                {!hasCancelledBills && outstandingAmount === 0 && invoiceData.totalPaid > 0 && (
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="text-green-600 font-bold">FULLY PAID</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Transaction History */}
                  {(() => {
                    const transactions = [];
                    const invoiceNumber = invoiceData.invoiceNumber;
                    
                    // Get all bills related to this invoice
                    const relatedBills = selectedPatient.billing?.filter(bill => 
                      bill.invoiceNumber === invoiceNumber
                    ) || [];
                    
                    // Collect transactions from billing records
                    relatedBills.forEach(bill => {
                      // Add payment transactions
                      if (bill.paidAmount > 0) {
                        transactions.push({
                          type: 'payment',
                          amount: bill.paidAmount,
                          method: bill.paymentMethod || 'cash',
                          date: bill.paidAt || bill.createdAt || bill.updatedAt,
                          description: bill.description || `${bill.type === 'consultation' ? 'Consultation' : 'Service'} Payment`,
                          source: 'billing'
                        });
                      }
                      
                      // Add refund transactions
                      if (bill.refundAmount > 0) {
                        transactions.push({
                          type: 'refund',
                          amount: bill.refundAmount,
                          method: bill.refundMethod || 'cash',
                          date: bill.refundAt || bill.updatedAt || bill.createdAt,
                          description: bill.refundReason || bill.description || 'Refund',
                          source: 'billing'
                        });
                      }
                      
                      // Also check refunds array if it exists
                      if (bill.refunds && Array.isArray(bill.refunds) && bill.refunds.length > 0) {
                        bill.refunds.forEach(refund => {
                          transactions.push({
                            type: 'refund',
                            amount: refund.amount || 0,
                            method: refund.method || bill.refundMethod || 'cash',
                            date: refund.date || refund.createdAt || bill.updatedAt || bill.createdAt,
                            description: refund.reason || refund.description || 'Refund',
                            source: 'billing_refunds'
                          });
                        });
                      }
                    });
                    
                    // Include payment history from payment logs
                    if (paymentHistory && Array.isArray(paymentHistory)) {
                      paymentHistory.forEach(log => {
                        // Match by invoice number or billing ID
                        const matchesInvoice = log.invoiceNumber === invoiceNumber;
                        const matchesBillingId = log.billingId && relatedBills.some(b => 
                          b._id?.toString() === log.billingId?.toString()
                        );
                        
                        if (matchesInvoice || matchesBillingId) {
                          // Avoid duplicates by checking if we already have this transaction
                          const isDuplicate = transactions.some(t => 
                            t.source === 'payment_log' &&
                            t.date === (log.createdAt || log.date) &&
                            t.amount === log.amount
                          );
                          
                          if (!isDuplicate) {
                            transactions.push({
                              type: 'payment',
                              amount: log.amount || 0,
                              method: log.paymentMethod || 'cash',
                              date: log.createdAt || log.date || new Date(),
                              description: log.description || log.notes || 'Payment',
                              source: 'payment_log'
                            });
                          }
                        }
                      });
                    }
                    
                    // Sort by date (most recent first)
                    transactions.sort((a, b) => {
                      const dateA = new Date(a.date || 0);
                      const dateB = new Date(b.date || 0);
                      return dateB.getTime() - dateA.getTime();
                    });
                    
                    // Always show transaction history section, even if empty
                    return (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-800 mb-3">Transaction History</h4>
                        {transactions.length > 0 ? (
                          <table className="min-w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Date & Time</th>
                                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Type</th>
                                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Description</th>
                                <th className="border border-slate-300 px-3 py-2 text-right text-xs font-medium text-slate-700 uppercase">Amount</th>
                                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Method</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((transaction, index) => (
                                <tr key={`${transaction.source}-${index}-${transaction.date}`} className={transaction.type === 'refund' ? 'bg-orange-50' : 'bg-white'}>
                                  <td className="border border-slate-300 px-3 py-2 text-xs">
                                    {transaction.date ? (
                                      <>
                                        {new Date(transaction.date).toLocaleDateString('en-GB')} {new Date(transaction.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                      </>
                                    ) : (
                                      'N/A'
                                    )}
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2 text-xs">
                                    <span className={`px-2 py-1 rounded-full font-medium ${
                                      transaction.type === 'payment' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {transaction.type === 'payment' ? 'Payment' : 'Refund'}
                                    </span>
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2 text-xs">
                                    <div className="font-medium">{transaction.description || 'Transaction'}</div>
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2 text-right text-xs font-medium">
                                    <span className={transaction.type === 'payment' ? 'text-green-600' : 'text-orange-600'}>
                                      {transaction.type === 'payment' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2 text-xs capitalize">
                                    {transaction.method || 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                            <p className="text-slate-500 text-sm">No transaction history available for this invoice.</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Generation Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Left - Generation Info */}
                    <div className="text-xs">
                      <div><span className="font-medium">Generated By:</span> {invoiceData.generatedBy}</div>
                      <div><span className="font-medium">Date:</span> {new Date(invoiceData.date).toLocaleDateString('en-GB')}</div>
                      <div><span className="font-medium">Time:</span> {new Date(invoiceData.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
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

                  {/* Footer */}
                  <div className="text-center text-xs text-slate-600">
                    <div className="mb-1">
                      <strong>"For Home Sample Collection"</strong>
                    </div>
                    <div>
                      <span className="font-medium">Miss Call:</span> {centerInfo.missCallNumber} 
                      <span className="mx-2">|</span>
                      <span className="font-medium">Mobile:</span> {centerInfo.mobileNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowInvoicePreviewModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
              </div>
                    </div>
                  )}

      {/* Cancel Bill Modal */}
      {showCancelBillModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">
                Cancel Bill - {selectedPatient.name}
              </h3>
              <button
                onClick={() => setShowCancelBillModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleCancelBillSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cancellation Reason *
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="Please provide a reason for cancelling this bill..."
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-xs text-red-700">
                      <p className="font-medium mb-1">Warning:</p>
                      <p>This action will cancel the bill and cancel the superconsultant appointment. This action cannot be undone.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCancelBillModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Cancel Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {showRefundModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">
                Process Refund - {selectedPatient.name}
              </h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleRefundSubmit} className="space-y-4">
                {/* Payment Summary */}
                {(() => {
                  const superconsultantBill = selectedPatient.billing?.find(bill => 
                    bill.type === 'consultation' && 
                    bill.consultationType?.startsWith('superconsultant_')
                  );
                  
                  if (!superconsultantBill) return null;
                  
                  const invoiceNumber = superconsultantBill.invoiceNumber;
                  const relatedBills = selectedPatient.billing?.filter(bill => 
                    bill.invoiceNumber === invoiceNumber
                  ) || [];
                  
                  const totalPaid = relatedBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
                  const totalRefunded = relatedBills.reduce((sum, bill) => sum + (bill.refundAmount || 0), 0);
                  const availableForRefund = totalPaid - totalRefunded;
                  
                  return (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <h4 className="text-sm font-semibold text-orange-800 mb-2">Refund Summary</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-orange-700">Total Paid:</span>
                          <span className="font-semibold">₹{totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-700">Already Refunded:</span>
                          <span className="font-semibold text-red-600">₹{totalRefunded.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-orange-300 pt-1">
                          <span className="text-orange-700 font-semibold">Available for Refund:</span>
                          <span className="font-bold text-green-600">₹{availableForRefund.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Refund Method *
                  </label>
                  <select
                    value={refundData.refundMethod}
                    onChange={(e) => setRefundData({...refundData, refundMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Refund Reason *
                  </label>
                  <textarea
                    value={refundData.reason}
                    onChange={(e) => setRefundData({...refundData, reason: e.target.value})}
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    placeholder="Please provide a reason for this refund..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    Process Refund
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


