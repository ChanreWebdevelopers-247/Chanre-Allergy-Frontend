import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchReceptionistPatients } from '../../features/receptionist/receptionistThunks';
import { updatePatient } from '../../features/receptionist/receptionistSlice';
import ReceptionistLayout from './ReceptionistLayout';
import PendingBillsNotification from '../../components/PendingBillsNotification';
// InvoiceDisplay component removed - now integrated inline
import { 
  Users, 
  Search, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye, 
  Plus,
  Receipt,
  UserCheck,
  X,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Download,
  Calendar,
  CreditCard,
  Settings,
  UserPlus,
  Bell,
  Edit3,
  Trash2,
  Ban,
  RotateCcw,
  Calculator,
  FileCheck,
  Receipt as ReceiptIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { getPatientAppointment, getPatientPaymentHistory } from '../../services/api';

export default function ConsultationBilling() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { patients, loading } = useSelector((state) => state.receptionist);
  const { user } = useSelector((state) => state.auth);

  // Center information state
  const [centerInfo, setCenterInfo] = useState({
    name: 'Chanre Hospital',
    address: 'Rajajinagar, Bengaluru',
    phone: '08040810611',
    fax: '080-42516600',
    website: 'www.chanreallergy.com',
    labWebsite: 'www.chanrelabresults.com',
    missCallNumber: '080-42516666',
    mobileNumber: '9686197153'
  });
  
  // Invoice creation time state
  const [invoiceCreationTime, setInvoiceCreationTime] = useState(null);

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

  const combineDateAndTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if ([year, month, day].some(Number.isNaN)) return null;

    let hours = 0;
    let minutes = 0;
    const trimmedTime = timeStr.trim();

    if (trimmedTime.toUpperCase().includes('AM') || trimmedTime.toUpperCase().includes('PM')) {
      const [timePart, periodRaw] = trimmedTime.split(' ');
      const period = periodRaw?.toUpperCase();
      const [h = '0', m = '0'] = timePart.split(':');
      hours = parseInt(h, 10);
      minutes = parseInt(m, 10) || 0;
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      }
      if (period === 'AM' && hours === 12) {
        hours = 0;
      }
    } else {
      const [h = '0', m = '0'] = trimmedTime.split(':');
      hours = parseInt(h, 10) || 0;
      minutes = parseInt(m, 10) || 0;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const filterFutureSlots = (slots, dateStr) => {
    if (!Array.isArray(slots) || slots.length === 0) return [];
    const now = new Date();
    return slots.filter((slot) => {
      const slotDateTime = combineDateAndTime(dateStr, slot.startTime);
      if (!slotDateTime) return false;
      return slotDateTime > now;
    });
  };

  // Function to fetch appointment data for a patient
  const fetchPatientAppointmentData = async (patient) => {
    if (!patient.fromAppointment || !patient.appointmentId) return null;
    
    try {
      const response = await getPatientAppointment(patient._id);
      if (response.success && response.data.appointmentId) {
        return response.data.appointmentId;
      }
    } catch (error) {
      console.error('Error fetching patient appointment data:', error);
    }
    return null;
  };

  // Enhanced function to get appointment display data
  // Priority: 1) Confirmed online booking 2) Scheduled appointments 3) Manual/payment appointmentTime
  const getAppointmentDisplayData = (patient) => {
    // Debug logging for Ajay
    if (patient.name === 'Ajay' || patient.uhId === '2345003') {
      console.log('🔍 getAppointmentDisplayData for Ajay:', {
        appointmentId: patient.appointmentId,
        appointmentIdType: typeof patient.appointmentId,
        fromAppointment: patient.fromAppointment,
        appointments: patient.appointments,
        appointmentTime: patient.appointmentTime,
        allPatientKeys: Object.keys(patient)
      });
    }
    
    // Priority 1: If patient has populated appointmentId (online booking), use confirmed date
    if (patient.appointmentId) {
      let appointmentObj = patient.appointmentId;
      
      // If appointmentId is just an ID string, we can't use it directly
      // But if it's an object with appointment data, use it
      if (typeof appointmentObj === 'object' && appointmentObj !== null) {
        // Prefer confirmed date/time, fall back to preferred if not confirmed
        const confirmedDate = appointmentObj.confirmedDate;
        const confirmedTime = appointmentObj.confirmedTime;
        const preferredDate = appointmentObj.preferredDate;
        const preferredTime = appointmentObj.preferredTime;
        
        // Use confirmed date if available, otherwise preferred date
        const appointmentDate = confirmedDate || preferredDate;
        const appointmentTime = confirmedTime || preferredTime;
        
        if (appointmentDate) {
          if (patient.name === 'Ajay' || patient.uhId === '2345003') {
            console.log('✅ Found appointment in appointmentId object:', {
              confirmedDate,
              preferredDate,
              appointmentDate,
              confirmedTime,
              preferredTime,
              appointmentTime
            });
          }
          
          return {
            type: 'online',
            date: appointmentDate,
            time: appointmentTime,
            status: appointmentObj.status,
            code: appointmentObj.confirmationCode,
            reason: appointmentObj.reasonForVisit,
            symptoms: appointmentObj.symptoms,
            fromAppointment: true
          };
        }
      }
    }
    
    // Also check if patient.fromAppointment is true and try to fetch appointment data
    if (patient.fromAppointment && !patient.appointmentId) {
      // This might need to be fetched separately, but for now skip
      if (patient.name === 'Ajay' || patient.uhId === '2345003') {
        console.log('⚠️ Patient has fromAppointment=true but appointmentId is not populated');
      }
    }
    
    // Priority 2: Check appointments array for scheduled appointments (from payment processing)
    if (patient.appointments && patient.appointments.length > 0) {
      // Find the earliest scheduled appointment
      const scheduledAppointments = patient.appointments
        .map(apt => {
          const dateField = apt.scheduledAt || apt.appointmentTime || apt.confirmedDate || apt.preferredDate || apt.date;
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
      
      if (scheduledAppointments.length > 0) {
        // Sort by date (earliest first)
        scheduledAppointments.sort((a, b) => a._appointmentDate.getTime() - b._appointmentDate.getTime());
        const earliestAppointment = scheduledAppointments[0];
        
        return {
          type: 'manual',
          date: earliestAppointment._appointmentDate,
          status: earliestAppointment.status || patient.appointmentStatus || 'scheduled',
          notes: earliestAppointment.notes,
          fromAppointment: patient.fromAppointment || false
        };
      }
    }
    
    // Priority 3: If patient has appointmentTime (manual appointment or payment scheduled)
    if (patient.appointmentTime) {
      return {
        type: 'manual',
        date: patient.appointmentTime,
        status: patient.appointmentStatus,
        notes: patient.appointmentNotes,
        fromAppointment: patient.fromAppointment
      };
    }
    
    // If patient is from appointment but no data, indicate that
    if (patient.fromAppointment) {
      return {
        type: 'linked',
        fromAppointment: true
      };
    }
    
    return null;
  };

  // Function to get center ID
  const getCenterId = () => {
    if (!user) return null;
    
    if (user.centerId) {
      if (typeof user.centerId === 'object' && user.centerId._id) {
        return user.centerId._id;
      }
      return user.centerId;
    }
    
    // Try to get from localStorage
    const storedCenterId = localStorage.getItem('centerId');
    if (storedCenterId) {
      return storedCenterId;
    }
    
    return null;
  };

  // Fetch center information
  const fetchCenterInfo = async () => {
    const centerId = getCenterId();
    console.log('🔄 Fetching center info for centerId:', centerId);
    
    if (!centerId) {
      console.warn('⚠️ No center ID found, using default values');
      return;
    }
    
    try {
      const response = await API.get(`/centers/${centerId}`);
      console.log('📋 Center API response:', response);
      
      // Handle different response structures
      const center = response.data?.data || response.data || response;
      
      console.log('🏥 Parsed center data:', center);
      
      if (center) {
        setCenterInfo({
          name: center.name || 'Chanre Hospital',
          address: center.address || 'Rajajinagar, Bengaluru',
          phone: center.phone || '08040810611',
          fax: center.fax || '080-42516600',
          website: center.website || 'www.chanreallergy.com',
          labWebsite: center.labWebsite || 'www.chanrelabresults.com',
          missCallNumber: center.missCallNumber || '080-42516666',
          mobileNumber: center.mobileNumber || '9686197153'
        });
        console.log('✅ Center info updated successfully');
      } else {
        console.warn('⚠️ Center data not found in response, using default values');
      }
    } catch (error) {
      console.error('❌ Error fetching center info:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Keep default values if API fails
    }
  };

  // Fetch center fees and discount settings
  const fetchCenterFees = async () => {
    const centerId = getCenterId();
    if (centerId) {
      try {
        const response = await API.get(`/centers/${centerId}/fees`);
        if (response.data?.fees) {
          setCenterFees({
            registrationFee: response.data.fees.registrationFee || 150,
            consultationFee: response.data.fees.consultationFee || 850,
            serviceFee: response.data.fees.serviceFee || 150
          });
        }
        if (response.data?.discountSettings) {
          setCenterDiscountSettings(response.data.discountSettings);
        }
      } catch (error) {
        console.error('Error fetching center fees:', error);
        // Keep default values if API fails
      }
    }
  };

  // Search and filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [finalFilteredPatients, setFinalFilteredPatients] = useState([]);
  const [subSearchTerm, setSubSearchTerm] = useState('');
  const [showSubSearch, setShowSubSearch] = useState(false);
  const [searchField, setSearchField] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage, setPatientsPerPage] = useState(10);

  // Patient selection and workflow states
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPendingBillsNotification, setShowPendingBillsNotification] = useState(false);

  // NEW WORKFLOW STATES
  // Center fees management
  const [centerFees, setCenterFees] = useState({
    registrationFee: 150,
    consultationFee: 850,
    serviceFee: 150
  });
  
  // Center discount settings
  const [centerDiscountSettings, setCenterDiscountSettings] = useState({
    staff: 10,
    senior: 20,
    student: 15,
    employee: 10,
    insurance: 0,
    referral: 5,
    promotion: 10,
    charity: 100
  });
  
  // Step 1: Create Invoice
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    registrationFee: 150,
    consultationFee: 850,
    serviceCharges: [{ name: '', amount: '', description: '' }],
    notes: '',
    taxPercentage: 0,
    discountType: 'percentage', // 'percentage' or 'amount'
    discountPercentage: 0,
    discountAmount: 0,
    discountReason: '',
    appointmentTime: ''
  });

  // Step 2: Invoice Preview & Payment
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    notes: '',
    appointmentTime: '',
    consultationType: 'OP' // OP, IP, or followup
  });
  
  // Appointment autocomplete states
  const [patientAppointment, setPatientAppointment] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  
  // Available slots states for appointment booking
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  // Step 3: Bill Management
  const [showCancelBillModal, setShowCancelBillModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState(150); // Default penalty amount
  const [patientBehavior, setPatientBehavior] = useState('okay'); // 'okay' or 'rude'
  const [refundType, setRefundType] = useState('partial'); // 'partial' or 'full'
  const [refundData, setRefundData] = useState({
    amount: '',
    refundMethod: 'cash',
    refundType: 'withPenalty', // 'withPenalty' or 'full' 
    reason: '',
    notes: '',
    patientBehavior: 'okay' // 'okay' or 'rude' - determines penalty policy
  });

  // Invoice editing states
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editedInvoiceData, setEditedInvoiceData] = useState(null);

  // Invoice data for InvoiceDisplay component
  const [invoiceData, setInvoiceData] = useState(null);

  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

  // Function to fetch payment history for a patient
  const fetchPaymentHistory = async (patientId) => {
    if (!patientId) return;
    
    setLoadingPaymentHistory(true);
    try {
      const response = await getPatientPaymentHistory(patientId);
      if (response.success) {
        setPaymentHistory(response.paymentLogs || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  useEffect(() => {
    dispatch(fetchReceptionistPatients());
  }, [dispatch]);

  // Fetch center info and fees when user is available
  useEffect(() => {
    if (user) {
      fetchCenterInfo(); // Fetch center information when user is available
      fetchCenterFees(); // Fetch center fees when user is available
    }
  }, [user]);

  // Refresh center info when invoice modal opens (to ensure we have latest data)
  useEffect(() => {
    if (showInvoicePreviewModal && invoiceData && user) {
      console.log('🔄 Invoice modal opened, refreshing center info...');
      fetchCenterInfo(); // Refresh center info when viewing invoice
    }
  }, [showInvoicePreviewModal, invoiceData, user]);

  // Set default appointment date when payment modal opens (only if not already set)
  useEffect(() => {
    if (showPaymentModal && !selectedAppointmentDate && selectedPatient) {
      // Don't set default if patient has existing appointment that will be auto-filled
      // This prevents overwriting appointment dates
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDate = tomorrow.toISOString().split('T')[0];
      setSelectedAppointmentDate(defaultDate);
    }
  }, [showPaymentModal, selectedPatient]);

  // Fetch available slots when appointment date or assigned doctor changes
  useEffect(() => {
    if (showPaymentModal && selectedPatient && selectedAppointmentDate) {
      const assignedDoctorId = selectedPatient.assignedDoctor?._id || selectedPatient.assignedDoctor;
      if (assignedDoctorId) {
        fetchAvailableSlots(assignedDoctorId, selectedAppointmentDate);
      } else {
        setAvailableSlots([]);
        setSelectedSlotId(null);
      }
    } else {
      setAvailableSlots([]);
      setSelectedSlotId(null);
    }
  }, [showPaymentModal, selectedPatient, selectedAppointmentDate]);

  // Function to fetch available slots for assigned doctor and date
  const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      return;
    }
    try {
      setSlotsLoading(true);
      
      // First, try to fetch existing slots
      const response = await API.get('/doctor-calendar/slots', {
        params: {
          doctorId: doctorId,
          date: date
        }
      });
      const slots = response.data.slots || [];
      
      // If no slots exist, try to auto-create them using doctor's availability
      if (slots.length === 0) {
        try {
          // Fetch doctor's availability for this date to get default times
          const availabilityResponse = await API.get('/doctor-calendar/month-availability', {
            params: {
              doctorId: doctorId,
              startDate: date,
              endDate: date
            }
          });
          
          const availabilities = availabilityResponse.data.availabilities || [];
          // Helper to format date consistently (YYYY-MM-DD)
          const formatDateString = (dateValue) => {
            if (!dateValue) return null;
            if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              return dateValue;
            }
            const d = new Date(dateValue);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          const dateAvailability = availabilities.find(avail => {
            const availDate = formatDateString(avail.date);
            return availDate === date;
          });
          
          // Check if availability times are set
          if (!dateAvailability || !dateAvailability.startTime || !dateAvailability.endTime) {
            console.log('No availability times set for date:', date);
            setAvailableSlots([]);
            setSelectedSlotId(null);
            setPaymentData(prev => ({...prev, appointmentTime: ''}));
            return;
          }
          
          // Check if doctor is explicitly unavailable or on holiday
          if (dateAvailability.isHoliday) {
            console.log('Doctor is on holiday on date:', date);
            setAvailableSlots([]);
            setSelectedSlotId(null);
            setPaymentData(prev => ({...prev, appointmentTime: ''}));
            return;
          }
          
          if (dateAvailability.isAvailable === false) {
            console.log('Doctor is marked as unavailable on date:', date);
            setAvailableSlots([]);
            setSelectedSlotId(null);
            setPaymentData(prev => ({...prev, appointmentTime: ''}));
            return;
          }
          
          // Use availability times to create slots
          const startTime = dateAvailability.startTime;
          const endTime = dateAvailability.endTime;
          const breakStartTime = dateAvailability.breakStartTime || null;
          const breakEndTime = dateAvailability.breakEndTime || null;
          
          console.log('Auto-creating slots for date:', date, 'with times:', { startTime, endTime, breakStartTime, breakEndTime });
          
          // Auto-create slots
          await API.post('/doctor-calendar/slots/create', {
            doctorId: doctorId,
            date: date,
            slotDuration: 30,
            startTime: startTime,
            endTime: endTime,
            breakStartTime: breakStartTime,
            breakEndTime: breakEndTime
          });
          
          // Wait a moment for database to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fetch slots again after creation
          const newResponse = await API.get('/doctor-calendar/slots', {
            params: {
              doctorId: doctorId,
              date: date
            }
          });
          const newSlots = newResponse.data.slots || [];
          console.log(`Fetched ${newSlots.length} slots after creation`);
          
          const available = newSlots
            .filter(slot => !slot.isBooked)
            .map(slot => ({
              value: `${slot.startTime} - ${slot.endTime}`,
              display: `${slot.startTime} - ${slot.endTime}`,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotId: slot._id
            }));
          const futureSlots = filterFutureSlots(available, date);
          if (available.length > 0 && futureSlots.length === 0) {
            toast.info('No future time slots available for this date. Please select another date.');
          }
          setAvailableSlots(futureSlots);
          setSelectedSlotId(null);
          setPaymentData(prev => ({...prev, appointmentTime: ''}));
          return;
        } catch (createError) {
          console.error('Error auto-creating slots:', createError);
          console.error('Error response:', createError.response?.data);
          console.error('Error status:', createError.response?.status);
          
          // If creation fails, show error but continue with empty slots
          if (createError.response?.status === 400) {
            toast.error(createError.response?.data?.message || 'Cannot create slots for this date. Please check availability times.');
          } else if (createError.response?.status === 403) {
            toast.error('You do not have permission to create slots. Please contact the center administrator.');
          } else {
            toast.error('Failed to create slots. Please try again.');
          }
          
          setAvailableSlots([]);
          setSelectedSlotId(null);
          setPaymentData(prev => ({...prev, appointmentTime: ''}));
          return;
        }
      }
      
      // Filter only available slots and format them
      const available = slots
        .filter(slot => !slot.isBooked)
        .map(slot => ({
          value: `${slot.startTime} - ${slot.endTime}`,
          display: `${slot.startTime} - ${slot.endTime}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotId: slot._id
        }));
      const futureSlots = filterFutureSlots(available, date);
      if (available.length > 0 && futureSlots.length === 0) {
        toast.info('No future time slots available for this date. Please select another date.');
      }
      setAvailableSlots(futureSlots);
      // Reset selected slot when fetching new slots
      setSelectedSlotId(null);
      setPaymentData(prev => ({...prev, appointmentTime: ''}));
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
      setSelectedSlotId(null);
      setPaymentData(prev => ({...prev, appointmentTime: ''}));
    } finally {
      setSlotsLoading(false);
    }
  };

  // Removed auto-selection logic for reassigned patients

  // Primary search filter - show both regular and reassigned patients separately
  useEffect(() => {
    let filtered = [];
    
    // Add regular patients (including original patients who have been reassigned)
    const regularPatients = patients.filter(patient => {
      const matchesSearch = !searchTerm || 
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.uhId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.assignedDoctor?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Include all patients (both regular and reassigned) as regular entries
      return matchesSearch;
    });
    
    // Only show regular patients (no reassigned patients on this page)
    filtered = regularPatients;
    setFilteredPatients(filtered);
    setShowSubSearch(filtered.length > 0 && searchTerm.trim() !== '');
    setCurrentPage(1); // Reset to first page when search changes
  }, [patients, searchTerm]);

  // Sub-search filter - simplified without reassignment logic
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
        case 'status':
          const status = getPatientStatus(patient);
          return status.toLowerCase().includes(searchLower);
        case 'all':
        default:
          return patient.name?.toLowerCase().includes(searchLower) ||
                 patient.email?.toLowerCase().includes(searchLower) ||
                 patient.phone?.toLowerCase().includes(searchLower) ||
                 patient.uhId?.toLowerCase().includes(searchLower) ||
                 patient.assignedDoctor?.name?.toLowerCase().includes(searchLower) ||
                 getPatientStatus(patient).toLowerCase().includes(searchLower);
      }
    });
    
    setFinalFilteredPatients(subFiltered);
    setCurrentPage(1); // Reset to first page when sub-search changes
  }, [filteredPatients, subSearchTerm, searchField]);

  // Removed reassignment-related helper functions

  // NEW WORKFLOW STATUS LOGIC
  const getPatientStatus = (patient) => {
    if (!patient.billing || patient.billing.length === 0) {
      return { status: 'No Invoice', color: 'text-red-600 bg-red-100', icon: <FileText className="h-4 w-4" /> };
    }

    // Filter out superconsultation billing - only use consultation billing
    const consultationBilling = filterConsultationBilling(patient.billing);
    
    if (consultationBilling.length === 0) {
      return { status: 'No Invoice', color: 'text-red-600 bg-red-100', icon: <FileText className="h-4 w-4" /> };
    }

    // Check if any bills are cancelled (only consultation bills)
    const hasCancelledBills = consultationBilling.some(bill => bill.status === 'cancelled');
    if (hasCancelledBills) {
      return { status: 'Bill Cancelled', color: 'text-red-600 bg-red-100', icon: <Ban className="h-4 w-4" /> };
    }

    // Enhanced refund status checking - check both status and refund amounts
    let hasRefundedBills = false;
    let hasPartiallyRefundedBills = false;
    
    // Check each bill for refunds (only consultation bills)
    for (const bill of consultationBilling) {
      if (bill.refunds && bill.refunds.length > 0) {
        const totalAmount = bill.amount || 0;
        const refundedAmount = bill.refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
        
        if (refundedAmount >= totalAmount) {
          hasRefundedBills = true;
        } else if (refundedAmount > 0) {
          hasPartiallyRefundedBills = true;
        }
      } else {
        // Fallback to status-based checking
        if (bill.status === 'refunded') {
          hasRefundedBills = true;
        } else if (bill.status === 'partially_refunded') {
          hasPartiallyRefundedBills = true;
        }
      }
    }
    
    if (hasRefundedBills && !hasPartiallyRefundedBills) {
      return { status: 'Refunded', color: 'text-orange-600 bg-orange-100', icon: <RotateCcw className="h-4 w-4" /> };
    }
    
    if (hasPartiallyRefundedBills) {
      return { status: 'Partially Refunded', color: 'text-yellow-600 bg-yellow-100', icon: <RotateCcw className="h-4 w-4" /> };
    }

    // Check payment statuses (only from consultation billing)
    const consultationFee = consultationBilling.find(bill => 
      bill.type === 'consultation' && !bill.consultationType?.startsWith('superconsultant_')
    );
    const registrationFee = consultationBilling.find(bill => bill.type === 'registration');
    const serviceCharges = consultationBilling.filter(bill => bill.type === 'service');

    const getPaymentStatus = (bill) => {
      if (!bill) return { paidAmount: 0, status: 'unpaid', totalAmount: 0 };
      const paidAmount = bill.paidAmount || 0;
      const totalAmount = bill.amount || 0;
      
      // Check if the bill was originally marked as partial in the database
      if (bill.status === 'partial' || (paidAmount > 0 && paidAmount < totalAmount)) {
        return { paidAmount, status: 'partial', totalAmount };
      }
      if (paidAmount >= totalAmount && totalAmount > 0) return { paidAmount, status: 'paid', totalAmount };
      if (paidAmount > 0) return { paidAmount, status: 'partial', totalAmount };
      return { paidAmount, status: 'unpaid', totalAmount };
    };

    const consultationPayment = getPaymentStatus(consultationFee);
    const registrationPayment = getPaymentStatus(registrationFee);
    const servicePayments = serviceCharges.map(s => getPaymentStatus(s));

    // Check if all services are paid
    const allServiceChargesPaid = servicePayments.length === 0 || servicePayments.every(p => p.status === 'paid');
    const hasPartialServiceCharges = servicePayments.some(p => p.status === 'partial');
    const hasUnpaidServiceCharges = servicePayments.some(p => p.status === 'unpaid');
    const hasServiceCharges = serviceCharges.length > 0;

    // Determine if patient is new (within 24 hours)
    const isNewPatient = isPatientNew(patient);

    // Check if registration fee is required (new patients only)
    if (isNewPatient && !registrationFee) {
      return { status: 'Registration Required', color: 'text-purple-600 bg-purple-100', icon: <UserPlus className="h-4 w-4" /> };
    }
    
    // Check if consultation fee is required
    if (!consultationFee) {
      return { status: 'Consultation Required', color: 'text-blue-600 bg-blue-100', icon: <DollarSign className="h-4 w-4" /> };
    }

    // Check payment statuses
    const needsConsultationPayment = consultationPayment.status === 'unpaid';
    const needsPartialConsultationPayment = consultationPayment.status === 'partial';
    const needsRegistrationPayment = registrationFee && registrationPayment.status === 'unpaid';
    const needsPartialRegistrationPayment = registrationFee && registrationPayment.status === 'partial';

    if (needsConsultationPayment || needsRegistrationPayment) {
      return { status: 'Pending Payment', color: 'text-orange-600 bg-orange-100', icon: <Clock className="h-4 w-4" /> };
    }

    if (needsPartialConsultationPayment || needsPartialRegistrationPayment || hasPartialServiceCharges) {
      return { status: 'Partial Payment', color: 'text-yellow-600 bg-yellow-100', icon: <CreditCard className="h-4 w-4" /> };
    }

    if (hasServiceCharges && hasUnpaidServiceCharges) {
      return { status: 'Service Charges Pending', color: 'text-green-600 bg-green-100', icon: <Settings className="h-4 w-4" /> };
    }
    
    // Check if there are any partial payments
    const hasPartialPayments = consultationPayment.status === 'partial' || 
                              (registrationFee && registrationPayment.status === 'partial') ||
                              hasPartialServiceCharges;
    
    // All payments completed (fully paid, not partial)
    const allPaid = consultationPayment.status === 'paid' && 
                  (registrationFee ? registrationPayment.status === 'paid' : true) &&
                  allServiceChargesPaid &&
                  !hasPartialPayments;
    
    if (allPaid) {
      return { status: 'Fully Paid', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="h-4 w-4" /> };
    }

    return { status: 'Processing', color: 'text-gray-600 bg-gray-100', icon: <Clock className="h-4 w-4" /> };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'All Paid': return 'text-green-600 bg-green-100';
      case 'Consultation Pending Payment': return 'text-blue-600 bg-blue-100';
      case 'Registration Pending Payment': return 'text-blue-600 bg-blue-100';
      case 'Service Charges Pending': return 'text-orange-600 bg-orange-100';
      case 'Service Charges Partial': return 'text-orange-600 bg-orange-100';
      case 'Consultation Partial Payment': return 'text-yellow-600 bg-yellow-100';
      case 'Registration Partial Payment': return 'text-yellow-600 bg-yellow-100';
      case 'Partial Payment Received': return 'text-yellow-600 bg-yellow-100';
      case 'Consultation Fee Required': return 'text-red-600 bg-red-100';
      case 'Registration Fee Required': return 'text-red-600 bg-red-100';
      case 'Invoice Required': return 'text-red-600 bg-red-100';
      case 'Pending Payment': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'All Paid': return <CheckCircle className="h-4 w-4" />;
      case 'Consultation Pending Payment': return <DollarSign className="h-4 w-4" />;
      case 'Registration Pending Payment': return <UserPlus className="h-4 w-4" />;
      case 'Service Charges Pending': return <Clock className="h-4 w-4" />;
      case 'Service Charges Partial': return <Clock className="h-4 w-4" />;
      case 'Consultation Partial Payment': return <CreditCard className="h-4 w-4" />;
      case 'Registration Partial Payment': return <CreditCard className="h-4 w-4" />;
      case 'Partial Payment Received': return <CreditCard className="h-4 w-4" />;
      case 'Consultation Fee Required': return <AlertCircle className="h-4 w-4" />;
      case 'Registration Fee Required': return <UserPlus className="h-4 w-4" />;
      case 'Invoice Required': return <FileText className="h-4 w-4" />;
      case 'Pending Payment': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Helper function to check if patient is new (within 24 hours)
  const isPatientNew = (patient) => {
    const registrationDate = new Date(patient.createdAt);
    const now = new Date();
    const hoursDifference = (now - registrationDate) / (1000 * 60 * 60);
    return hoursDifference <= 24;
  };

  // NEW WORKFLOW FUNCTIONS

  // Step 1: Create Invoice
  const handleCreateInvoice = (patient) => {
    setSelectedPatient(patient);
    const isNew = isPatientNew(patient);
    
    // Set invoice creation time
    setInvoiceCreationTime(new Date());
    
    // Pre-populate form based on patient status and center fees
    setInvoiceFormData({
      registrationFee: isNew ? centerFees.registrationFee : 0,
      consultationFee: centerFees.consultationFee,
      serviceCharges: [{ 
        name: 'Service Charges', 
        amount: centerFees.serviceFee.toString(), 
        description: 'Standard service charges' 
      }],
      notes: `Invoice for ${patient.name}`,
      taxPercentage: 0,
      discountType: 'percentage',
      discountPercentage: 0,
      discountAmount: 0,
      discountReason: ''
    });
    
    setShowCreateInvoiceModal(true);
  };

  const handleInvoiceFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) return;

    try {
      const invoiceData = {
        patientId: selectedPatient._id,
        doctorId: selectedPatient.assignedDoctor?._id || selectedPatient.assignedDoctor,
        registrationFee: invoiceFormData.registrationFee,
        consultationFee: invoiceFormData.consultationFee,
        serviceCharges: invoiceFormData.serviceCharges.filter(s => s.name && s.amount),
        notes: invoiceFormData.notes,
        taxPercentage: invoiceFormData.taxPercentage,
        discountType: invoiceFormData.discountType,
        discountPercentage: invoiceFormData.discountPercentage,
        discountAmount: invoiceFormData.discountAmount,
        discountReason: invoiceFormData.discountReason
      };

      console.log('Creating invoice:', invoiceData);

      const response = await API.post('/billing/create-invoice', invoiceData);
      
      if (response.data.success) {
        toast.success('Invoice created successfully!');
        setGeneratedInvoice(response.data.invoice);
        setShowCreateInvoiceModal(false);
        setShowInvoicePreviewModal(true);
        
        // Refresh patient data
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error('Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  // Step 2: Payment Processing
  const handleProcessPayment = (invoice) => {
    setGeneratedInvoice(invoice);
    
    // Calculate total amount for payment
    const totalAmount = invoice.totals?.total || 0;
    
    setPaymentData({
      amount: totalAmount.toString(),
      paymentMethod: 'cash',
      paymentType: 'full',
      notes: ''
    });
    
    setShowPaymentModal(true);
    
    // Fetch appointment details for the selected patient
    if (selectedPatient) {
      fetchPatientAppointment(selectedPatient);
    }
  };

  // Fetch appointment details for selected patient
  const fetchPatientAppointment = async (patient) => {
    if (!patient) return;
    
    setAppointmentLoading(true);
    try {
      console.log('Searching for appointment for patient:', patient.name, patient.phone, patient.email);
      
      // First, check if patient has a linked appointment (from online booking)
      if (patient.fromAppointment && patient.appointmentId) {
        console.log('Patient has linked appointment, fetching appointment data...');
        try {
          const appointmentResponse = await getPatientAppointment(patient._id);
          if (appointmentResponse.success && appointmentResponse.data.appointmentId) {
            const appointment = appointmentResponse.data.appointmentId;
            console.log('Found linked appointment:', appointment);
            setPatientAppointment(appointment);
            
            // Auto-fill appointment time if available
            let appointmentDateTime = null;
            
            // Helper function to parse time string (handles both 24h and 12h formats)
            const parseTime = (timeStr) => {
              if (!timeStr) return null;
              
              // Handle 12-hour format (e.g., "04:30 PM")
              if (timeStr.includes('PM') || timeStr.includes('AM')) {
                const [time, period] = timeStr.trim().split(' ');
                const [hours, minutes] = time.split(':');
                let hour24 = parseInt(hours);
                if (period === 'PM' && hour24 !== 12) hour24 += 12;
                if (period === 'AM' && hour24 === 12) hour24 = 0;
                return { hours: hour24, minutes: parseInt(minutes) || 0 };
              }
              
              // Handle 24-hour format (e.g., "16:30")
              const [hours, minutes] = timeStr.split(':');
              return { hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0 };
            };
            
            // Helper function to format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
            const formatDateTimeLocal = (date, time) => {
              if (!date || !time) return null;
              
              const dateObj = new Date(date);
              const timeObj = parseTime(time);
              
              if (!timeObj) return null;
              
              // Create date in local timezone (don't convert to UTC)
              const localDate = new Date(dateObj);
              localDate.setHours(timeObj.hours, timeObj.minutes, 0, 0);
              
              // Format as YYYY-MM-DDTHH:mm for datetime-local input (local time, not UTC)
              const year = localDate.getFullYear();
              const month = String(localDate.getMonth() + 1).padStart(2, '0');
              const day = String(localDate.getDate()).padStart(2, '0');
              const hours = String(localDate.getHours()).padStart(2, '0');
              const minutes = String(localDate.getMinutes()).padStart(2, '0');
              
              return `${year}-${month}-${day}T${hours}:${minutes}`;
            };
            
            if (appointment.confirmedDate && appointment.confirmedTime) {
              console.log('Using confirmed date/time:', appointment.confirmedDate, appointment.confirmedTime);
              const formattedDateTime = formatDateTimeLocal(appointment.confirmedDate, appointment.confirmedTime);
              if (formattedDateTime) {
                appointmentDateTime = formattedDateTime;
              }
            } else if (appointment.preferredDate && appointment.preferredTime) {
              console.log('Using preferred date/time:', appointment.preferredDate, appointment.preferredTime);
              const formattedDateTime = formatDateTimeLocal(appointment.preferredDate, appointment.preferredTime);
              if (formattedDateTime) {
                appointmentDateTime = formattedDateTime;
              }
            }
            
            if (appointmentDateTime) {
              console.log('Setting appointment time to:', appointmentDateTime);
              
              // Extract date part (YYYY-MM-DD) for selectedAppointmentDate
              const datePart = appointmentDateTime.split('T')[0];
              setSelectedAppointmentDate(datePart);
              
              setPaymentData(prev => ({
                ...prev,
                appointmentTime: appointmentDateTime
              }));
            } else if (appointment.confirmedDate || appointment.preferredDate) {
              // If no time but we have a date, set just the date
              const appointmentDate = appointment.confirmedDate || appointment.preferredDate;
              const dateObj = new Date(appointmentDate);
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const datePart = `${year}-${month}-${day}`;
              setSelectedAppointmentDate(datePart);
            }
            
            // Show success message
            const displayDate = appointmentDateTime ? new Date(appointmentDateTime.replace('T', ' ')).toLocaleDateString() : 'TBD';
            toast.success(`Found linked appointment: ${appointment.appointmentType} on ${displayDate}`);
            return; // Exit early since we found the appointment
          }
        } catch (appointmentError) {
          console.error('Error fetching linked appointment:', appointmentError);
          // Continue with regular search if linked appointment fetch fails
        }
      }
      
      // If no linked appointment found, proceed with regular search
      console.log('No linked appointment found, proceeding with regular search...');
      
      // Try multiple search approaches with enhanced criteria
      let response = null;
      let searchAttempts = [];
      
      // First try: Search by name and phone together (most accurate)
      if (patient.name && patient.phone) {
        searchAttempts.push('name + phone');
        try {
          response = await API.get('/patient-appointments/search', {
            params: { 
              name: patient.name.trim(),
              phone: patient.phone.trim()
            }
          });
          console.log('Search attempt (name + phone):', response?.data);
        } catch (err) {
          console.log('Search failed (name + phone):', err.message);
        }
      }
      
      // Second try: Search by name and email if first search fails
      if ((!response || !response.data.success || response.data.data.length === 0) && patient.name && patient.email) {
        searchAttempts.push('name + email');
        try {
          console.log('Trying name + email search...');
          response = await API.get('/patient-appointments/search', {
            params: { 
              name: patient.name.trim(),
              email: patient.email.trim()
            }
          });
          console.log('Search attempt (name + email):', response?.data);
        } catch (err) {
          console.log('Search failed (name + email):', err.message);
        }
      }
      
      // Third try: Search by name only if previous searches fail
      if ((!response || !response.data.success || response.data.data.length === 0) && patient.name) {
        searchAttempts.push('name only');
        try {
          console.log('Trying name-only search...');
          response = await API.get('/patient-appointments/search', {
            params: { 
              name: patient.name.trim()
            }
          });
          console.log('Search attempt (name only):', response?.data);
        } catch (err) {
          console.log('Search failed (name only):', err.message);
        }
      }
      
      // Fourth try: Search by phone only if previous searches fail
      if ((!response || !response.data.success || response.data.data.length === 0) && patient.phone) {
        searchAttempts.push('phone only');
        try {
          console.log('Trying phone-only search...');
          response = await API.get('/patient-appointments/search', {
            params: { 
              phone: patient.phone.trim()
            }
          });
          console.log('Search attempt (phone only):', response?.data);
        } catch (err) {
          console.log('Search failed (phone only):', err.message);
        }
      }
      
      // Fifth try: Search by email only if previous searches fail
      if ((!response || !response.data.success || response.data.data.length === 0) && patient.email) {
        searchAttempts.push('email only');
        try {
          console.log('Trying email-only search...');
          response = await API.get('/patient-appointments/search', {
            params: { 
              email: patient.email.trim()
            }
          });
          console.log('Search attempt (email only):', response?.data);
        } catch (err) {
          console.log('Search failed (email only):', err.message);
        }
      }
      
      console.log('All search attempts:', searchAttempts);
      console.log('Final appointment search response:', response?.data);
      
      if (response?.data.success && response.data.data.length > 0) {
        // Find the most recent appointment or best match
        let appointment = response.data.data[0];
        
        // If multiple appointments found, try to find the best match
        if (response.data.data.length > 1) {
          console.log(`Found ${response.data.data.length} appointments, selecting best match`);
          
          // Prioritize confirmed appointments
          const confirmedAppointment = response.data.data.find(apt => 
            apt.status === 'confirmed' || apt.status === 'pending'
          );
          
          if (confirmedAppointment) {
            appointment = confirmedAppointment;
            console.log('Selected confirmed appointment:', appointment);
          } else {
            // Select the most recent one
            appointment = response.data.data.sort((a, b) => 
              new Date(b.bookedAt || b.createdAt) - new Date(a.bookedAt || a.createdAt)
            )[0];
            console.log('Selected most recent appointment:', appointment);
          }
        }
        
        console.log('Selected appointment:', appointment);
        setPatientAppointment(appointment);
        
        // Auto-fill appointment time if available
        let appointmentDateTime = null;
        
        // Helper function to parse time string (handles both 24h and 12h formats)
        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          
          // Handle 12-hour format (e.g., "04:30 PM")
          if (timeStr.includes('PM') || timeStr.includes('AM')) {
            const [time, period] = timeStr.trim().split(' ');
            const [hours, minutes] = time.split(':');
            let hour24 = parseInt(hours);
            if (period === 'PM' && hour24 !== 12) hour24 += 12;
            if (period === 'AM' && hour24 === 12) hour24 = 0;
            return { hours: hour24, minutes: parseInt(minutes) || 0 };
          }
          
          // Handle 24-hour format (e.g., "16:30")
          const [hours, minutes] = timeStr.split(':');
          return { hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0 };
        };
        
        // Helper function to format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
        const formatDateTimeLocal = (date, time) => {
          if (!date || !time) return null;
          
          const dateObj = new Date(date);
          const timeObj = parseTime(time);
          
          if (!timeObj) return null;
          
          // Create date in local timezone (don't convert to UTC)
          const localDate = new Date(dateObj);
          localDate.setHours(timeObj.hours, timeObj.minutes, 0, 0);
          
          // Format as YYYY-MM-DDTHH:mm for datetime-local input (local time, not UTC)
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          const hours = String(localDate.getHours()).padStart(2, '0');
          const minutes = String(localDate.getMinutes()).padStart(2, '0');
          
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        
        if (appointment.confirmedDate && appointment.confirmedTime) {
          console.log('Using confirmed date/time:', appointment.confirmedDate, appointment.confirmedTime);
          const formattedDateTime = formatDateTimeLocal(appointment.confirmedDate, appointment.confirmedTime);
          if (formattedDateTime) {
            appointmentDateTime = formattedDateTime;
          }
        } else if (appointment.preferredDate && appointment.preferredTime) {
          console.log('Using preferred date/time:', appointment.preferredDate, appointment.preferredTime);
          const formattedDateTime = formatDateTimeLocal(appointment.preferredDate, appointment.preferredTime);
          if (formattedDateTime) {
            appointmentDateTime = formattedDateTime;
          }
        }
        
        if (appointmentDateTime) {
          console.log('Setting appointment time to:', appointmentDateTime);
          
          // Extract date part (YYYY-MM-DD) for selectedAppointmentDate
          const datePart = appointmentDateTime.split('T')[0];
          setSelectedAppointmentDate(datePart);
          
          setPaymentData(prev => ({
            ...prev,
            appointmentTime: appointmentDateTime
          }));
        } else if (appointment.confirmedDate || appointment.preferredDate) {
          // If no time but we have a date, set just the date
          const appointmentDate = appointment.confirmedDate || appointment.preferredDate;
          const dateObj = new Date(appointmentDate);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const datePart = `${year}-${month}-${day}`;
          setSelectedAppointmentDate(datePart);
        }
        
        // Show success message
        const displayDate = appointmentDateTime ? new Date(appointmentDateTime.replace('T', ' ')).toLocaleDateString() : 'TBD';
        toast.success(`Found appointment: ${appointment.appointmentType} on ${displayDate}`);
        
      } else {
        console.log('No appointment found for patient after all search attempts');
        setPatientAppointment(null);
        
        // Show informative message
        if (searchAttempts.length > 0) {
          toast.info(`No appointment found for ${patient.name}. Searched by: ${searchAttempts.join(', ')}`);
        } else {
          toast.info(`No appointment found for ${patient.name}. No search criteria available.`);
        }
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      setPatientAppointment(null);
      toast.error('Failed to search for appointments. Please try again.');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast.error('No patient selected');
      return;
    }

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    // Validate appointment time is set
    if (!paymentData.appointmentTime || !selectedSlotId) {
      toast.error('Please select an appointment date and time slot');
      return;
    }

    // Validate assigned doctor exists
    const assignedDoctorId = selectedPatient.assignedDoctor?._id || selectedPatient.assignedDoctor;
    if (!assignedDoctorId) {
      toast.error('Patient must have an assigned doctor to book an appointment');
      return;
    }
    
    // Validate appointment time is in the future (can be same day if time is in future)
    // Parse the datetime string (YYYY-MM-DDTHH:mm) in local timezone
    const [datePart, timePart] = paymentData.appointmentTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
    const appointmentDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    
    if (appointmentDate <= now) {
      toast.error('Appointment must be scheduled for a future date and time.');
      return;
    }

    try {
      // First, book the selected slot
      try {
        const bookSlotResponse = await API.post('/doctor-calendar/slots/book', {
          slotId: selectedSlotId,
          patientId: selectedPatient._id,
          notes: `Consultation billing appointment - ${paymentData.consultationType}`
        });
        
        if (!bookSlotResponse.data.success) {
          throw new Error(bookSlotResponse.data.message || 'Failed to book slot');
        }
      } catch (slotError) {
        console.error('Error booking slot:', slotError);
        toast.error(slotError.response?.data?.message || 'Failed to book appointment slot. Please select another slot.');
        return;
      }

      // Filter out superconsultation billing - only use consultation billing
      const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
      // Get invoice number from generatedInvoice or from patient's consultation billing
      const invoiceNumber = generatedInvoice?.invoiceNumber || consultationBilling[0]?.invoiceNumber || `INV-${selectedPatient._id.toString().slice(-6)}`;
      
      const paymentPayload = {
        patientId: selectedPatient._id,
        invoiceId: invoiceNumber,
        amount: parseFloat(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        paymentType: 'full',
        notes: paymentData.notes,
        appointmentTime: paymentData.appointmentTime,
        consultationType: paymentData.consultationType,
        slotId: selectedSlotId // Include slot ID in payment payload
      };

      console.log('Processing payment:', paymentPayload);
      console.log('Selected patient before payment:', selectedPatient);

      const response = await API.post('/billing/process-payment', paymentPayload);
      
      console.log('Payment response:', response.data);
      
      if (response.data.success) {
        toast.success('Payment processed successfully!');
        setShowPaymentModal(false);
        setShowInvoicePreviewModal(false);
        
        // Clear payment data and slot selection
        setPaymentData({
          amount: '',
          paymentMethod: 'cash',
          notes: '',
          appointmentTime: '',
          consultationType: 'OP'
        });
        setSelectedAppointmentDate('');
        setSelectedSlotId(null);
        setAvailableSlots([]);
        
        // Update the specific patient in Redux store with the returned data
        if (response.data.patient) {
          console.log('Updating patient in Redux store:', response.data.patient);
          dispatch(updatePatient(response.data.patient));
        }
        
        // Also refresh the entire patient list to ensure consistency
        console.log('Refreshing patient list...');
        await dispatch(fetchReceptionistPatients());
        console.log('Patient list refreshed');
      } else {
        toast.error(response.data.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
    }
  };

  // Step 3: Bill Management
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
      // Filter out superconsultation billing - only use consultation billing
      const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
      const latestBill = consultationBilling.length > 0 ? consultationBilling[consultationBilling.length - 1] : null;
      if (!latestBill) {
        toast.error('No consultation bill found for this patient');
        return;
      }

      const totalAmount = latestBill.customData?.totals?.total || latestBill.amount || 0;
      const paidAmount = latestBill.customData?.totals?.paid || latestBill.paidAmount || 0;
      
      // Calculate refund amount based on policy
      let refundAmount = 0;
      if (paidAmount > 0) {
        if (refundType === 'full') {
          refundAmount = paidAmount;
        } else {
          // Partial refund with penalty
          refundAmount = Math.max(0, paidAmount - penaltyAmount);
        }
      }

      const cancelPayload = {
        patientId: selectedPatient._id,
        reason: cancelReason.trim(),
        patientBehavior: patientBehavior,
        refundType: refundType,
        penaltyAmount: penaltyAmount,
        refundAmount: refundAmount,
        initiateRefund: paidAmount > 0 // Auto-initiate refund if payment was made
      };

      console.log('Cancelling bill with penalty policy:', cancelPayload);

      const response = await API.post('/billing/cancel-bill', cancelPayload);
      
      if (response.data.success) {
        const successMessage = refundType === 'full' 
          ? 'Bill cancelled and full refund processed successfully!' 
          : `Bill cancelled and partial refund processed (₹${penaltyAmount} penalty applied)!`;
        
        toast.success(successMessage);
        
        if (patientBehavior === 'rude') {
          toast.warning('Patient marked as rude - they have been asked not to return to the clinic.');
        }
        
        setShowCancelBillModal(false);
        setCancelReason('');
        setPenaltyAmount(150);
        setPatientBehavior('okay');
        setRefundType('partial');
        
        // Refresh patient data
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error(response.data.message || 'Failed to cancel bill');
      }
    } catch (error) {
      console.error('Error cancelling bill:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel bill');
    }
  };

  const handleProcessRefund = (patient) => {
    setSelectedPatient(patient);
    
    // Get total paid amount for refund
    const totalPaid = patient.billing.reduce((sum, bill) => {
      return sum + (bill.paidAmount || 0);
    }, 0);
    
    // Get total already refunded amount
    const totalRefunded = patient.billing.reduce((sum, bill) => {
      return sum + (bill.refundAmount || 0);
    }, 0);
    
    const availableForRefund = totalPaid - totalRefunded;
    
    setRefundData({
      amount: availableForRefund.toString(),
      refundMethod: 'cash',
      refundType: 'partial',
      reason: '',
      notes: '',
      patientBehavior: 'okay' // Default to okay behavior
    });
    
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient || !refundData.reason.trim()) {
      toast.error('Please provide a refund reason');
      return;
    }

    // Filter out superconsultation billing - only use consultation billing
    const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
    // Calculate refund amount based on type (only from consultation billing)
    const availableAmount = consultationBilling.reduce((sum, bill) => 
      sum + (bill.paidAmount || 0) - (bill.refundAmount || 0), 0);
    
    let calculatedRefundAmount = 0;
    if (refundData.refundType === 'withPenalty') {
      calculatedRefundAmount = Math.max(0, availableAmount - penaltyAmount);
    } else {
      calculatedRefundAmount = availableAmount;
    }

    if (calculatedRefundAmount <= 0) {
      toast.error('No amount available for refund');
      return;
    }

    try {
      const refundPayload = {
        patientId: selectedPatient._id,
        amount: calculatedRefundAmount,
        refundMethod: refundData.refundMethod,
        refundType: refundData.refundType,
        reason: refundData.reason.trim(),
        notes: refundData.notes,
        patientBehavior: refundData.patientBehavior, // Include patient behavior for penalty policy
        penaltyAmount: refundData.refundType === 'withPenalty' ? penaltyAmount : 0
      };

      console.log('Processing refund:', refundPayload);

      const response = await API.post('/billing/process-refund', refundPayload);
      
      if (response.data.success) {
        toast.success(`${refundData.refundType === 'withPenalty' ? 'Refund with penalty' : 'Full'} refund processed successfully!`);
        setShowRefundModal(false);
        
        // Refresh patient data
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error('Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    }
  };

  const getConsultationFeeDetails = (patient) => {
    if (!patient.billing || patient.billing.length === 0) {
      return null;
    }

    // Find any consultation fee
    const consultationFee = patient.billing.find(bill => {
      const isConsultationFee = bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation');
      return isConsultationFee;
    });

    if (!consultationFee) {
      return null;
    }

    return {
      amount: consultationFee.amount,
      status: consultationFee.status,
      paidBy: consultationFee.paidBy,
      paidAt: consultationFee.paidAt || consultationFee.createdAt,
      paymentMethod: consultationFee.paymentMethod,
      description: consultationFee.description,
      invoiceNumber: consultationFee.invoiceNumber
    };
  };

  const getRegistrationFeeDetails = (patient) => {
    if (!patient.billing || patient.billing.length === 0) {
      return null;
    }

    const registrationFee = patient.billing.find(bill => bill.type === 'registration');
    return registrationFee ? {
      amount: registrationFee.amount,
      status: registrationFee.status,
      paidBy: registrationFee.paidBy,
      paidAt: registrationFee.paidAt || registrationFee.createdAt,
      paymentMethod: registrationFee.paymentMethod,
      description: registrationFee.description,
      invoiceNumber: registrationFee.invoiceNumber
    } : null;
  };

  const getServiceChargesDetails = (patient) => {
    if (!patient.billing || patient.billing.length === 0) {
      return [];
    }
    
    const serviceBills = patient.billing.filter(bill => bill.type === 'service');

    return serviceBills.map(bill => ({
      amount: bill.amount,
      status: bill.status,
      paidBy: bill.paidBy,
      paidAt: bill.paidAt || bill.createdAt,
      paymentMethod: bill.paymentMethod,
      description: bill.description,
      serviceDetails: bill.serviceDetails,
      invoiceNumber: bill.invoiceNumber
    }));
  };

  // New helper function to get outstanding payments for a patient
  const getOutstandingPayments = (patient) => {
    if (!patient.billing || patient.billing.length === 0) {
      return { totalOutstanding: 0, breakdown: {} };
    }

    let totalOutstanding = 0;
    const breakdown = {
      consultation: 0,
      registration: 0,
      services: 0
    };

    // Check consultancy fee
    const consultationFee = patient.billing.find(bill => {
      const isConsultationFee = bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation');
      return isConsultationFee;
    });
    
    if (consultationFee) {
      const consultationAmount = parseFloat(consultationFee.amount) || 0;
      const consultationPaid = parseFloat(consultationFee.paidAmount) || 0;
      const outstanding = consultationAmount - consultationPaid;
      if (outstanding > 0) {
        breakdown.consultation = outstanding;
        totalOutstanding += outstanding;
      }
    }

    // Check registration fee
    const registrationFee = patient.billing.find(bill => bill.type === 'registration');
    if (registrationFee) {
      const registrationAmount = parseFloat(registrationFee.amount) || 0;
      const registrationPaid = parseFloat(registrationFee.paidAmount) || 0;
      const outstanding = registrationAmount - registrationPaid;
      if (outstanding > 0) {
        breakdown.registration = outstanding;
        totalOutstanding += outstanding;
      }
    }

    // Check service charges
    const serviceBills = patient.billing.filter(bill => bill.type === 'service');
    let serviceOutstanding = 0;
    serviceBills.forEach(service => {
      const serviceAmount = parseFloat(service.amount) || 0;
      const servicePaid = parseFloat(service.paidAmount) || 0;
      const outstanding = serviceAmount - servicePaid;
      if (outstanding > 0) {
        serviceOutstanding += outstanding;
      }
    });
    
    if (serviceOutstanding > 0) {
      breakdown.services = serviceOutstanding;
      totalOutstanding += serviceOutstanding;
    }

    return { totalOutstanding, breakdown };
  };

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
    setCurrentPage(1); // Reset to first page when changing per page
  };

  const handleCreateConsultationBill = (patient) => {
    setSelectedPatient(patient);
    setPaymentData({
      amount: '850', // Default consultation fee (OP rate)
      notes: `Doctor consultation fee for ${patient.name}`
    });
    setShowConsultationModal(true);
  };

  const handleRecordPayment = (patient) => {
    setSelectedPatient(patient);
    
    // Get outstanding payments to pre-populate amount
    const outstanding = getOutstandingPayments(patient);
    const suggestedAmount = outstanding.totalOutstanding > 0 ? outstanding.totalOutstanding : '';
    
    // Create a mock invoice object for payment processing
    const mockInvoice = {
      invoiceNumber: patient.billing?.[0]?.invoiceNumber || `INV-${patient._id.toString().slice(-6)}`,
      patientId: patient._id,
      total: outstanding.totalAmount,
      paid: outstanding.totalPaid,
      outstanding: outstanding.totalOutstanding
    };
    
    // Set the generated invoice for payment processing
    setGeneratedInvoice(mockInvoice);
    
    setPaymentData({
      amount: suggestedAmount.toString(),
      paymentMethod: 'cash',
      paymentType: outstanding.totalOutstanding > 0 ? 'full' : 'partial',
      notes: '',
      appointmentTime: '',
      consultationType: 'OP'
    });
    setShowPaymentModal(true);
  };

  const handleRecordPartialPayment = (patient) => {
    setSelectedPatient(patient);
    
    // Get current payment details
    const consultationFee = getConsultationFeeDetails(patient);
    const registrationFee = getRegistrationFeeDetails(patient);
    const serviceCharges = getServiceChargesDetails(patient);
    
    setPartialPaymentData({
      consultationPaid: consultationFee?.status === 'paid' ? consultationFee.amount : '',
      registrationPaid: registrationFee?.status === 'paid' ? registrationFee.amount : '',
      servicePaid: serviceCharges.reduce((sum, s) => sum + (s.amount || 0), 0).toString(),
      totalPaid: '',
      paymentMethod: 'cash',
      notes: ''
    });
    setShowPartialPaymentModal(true);
  };

  const handleCreateRegistrationBill = (patient) => {
    setSelectedPatient(patient);
    setRegistrationData({
      registrationFee: '150',
      serviceCharges: '150',
      amount: '300',
      notes: `Registration fee and Service charges for new patient ${patient.name}`
    });
    setShowRegistrationModal(true);
  };

  const handleCreateServiceCharges = (patient) => {
    setSelectedPatient(patient);
    setServiceData({
      services: [{ name: '', amount: '', description: '', details: '' }],
      notes: ''
    });
    setShowServiceModal(true);
  };

  const handleGenerateInvoice = async (patient) => {
    try {
      // Always refresh invoice data to get the latest billing information
      console.log('🔄 Generating/Refreshing invoice for patient:', patient.name);
      
      const invoicePayload = {
        patientId: patient._id
      };
      
      // Use regular invoice endpoint for normal patients
      const response = await API.post('/billing/generate-invoice', invoicePayload);
      
      if (response.data.success) {
        console.log('✅ Invoice data loaded successfully');
        setInvoiceData(response.data.invoice);
        setShowInvoiceModal(true);
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  // Helper function to filter out superconsultation billing entries
  const filterConsultationBilling = (billing) => {
    if (!billing || billing.length === 0) return [];
    
    // Step 1: Find all invoice numbers that belong to superconsultation bills
    const superconsultationInvoiceNumbers = new Set();
    billing.forEach(bill => {
      if (bill.consultationType?.startsWith('superconsultant_') && bill.invoiceNumber) {
        superconsultationInvoiceNumbers.add(bill.invoiceNumber);
      }
    });
    
    // Step 2: Filter out any billing entries that:
    // - Have consultationType starting with 'superconsultant_', OR
    // - Belong to a superconsultation invoice (same invoiceNumber)
    return billing.filter(bill => {
      // Exclude superconsultation entries directly
      if (bill.consultationType?.startsWith('superconsultant_')) {
        return false;
      }
      
      // Exclude any bill (including service charges) that belongs to a superconsultation invoice
      if (bill.invoiceNumber && superconsultationInvoiceNumbers.has(bill.invoiceNumber)) {
        return false;
      }
      
      return true;
    });
  };

  // Function to prepare invoice data for InvoiceDisplay component
  const prepareInvoiceData = (patient) => {
    if (!patient || !patient.billing || patient.billing.length === 0) {
      return null;
    }

    // Filter out superconsultation billing entries - only show consultation billing
    const consultationBilling = filterConsultationBilling(patient.billing);
    
    if (consultationBilling.length === 0) {
      return null;
    }

    // Debug: Log doctor data to check specializations
    console.log('Patient assignedDoctor:', patient.assignedDoctor);
    console.log('Doctor specializations:', patient.assignedDoctor?.specializations);
    console.log('Doctor specializations type:', typeof patient.assignedDoctor?.specializations);
    console.log('Doctor specializations isArray:', Array.isArray(patient.assignedDoctor?.specializations));
    console.log('Doctor specialization (singular):', patient.assignedDoctor?.specialization);

    // Calculate totals using filtered billing
    const totalAmount = consultationBilling.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const totalPaid = consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
    
    // Get discount information from billing records
    const firstBill = consultationBilling[0];
    const discountType = firstBill?.discountType || 'percentage';
    const discountPercentage = firstBill?.discountPercentage || 0;
    const discountAmount = firstBill?.discountAmount || 0;
    const discountReason = firstBill?.discountReason || '';
    
    // Calculate discount based on type
    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = totalAmount * (discountPercentage / 100);
    } else if (discountType === 'amount') {
      calculatedDiscount = discountAmount;
    }
    
    // Prepare service charges - only from consultation billing
    const serviceCharges = consultationBilling
      .filter(bill => bill.type === 'service')
      .map(bill => ({
        name: bill.description || 'Service Charge',
        amount: bill.amount || 0,
        description: bill.description || 'Medical service provided'
      }));

    // Get registration and consultation fees - only from consultation billing
    const registrationFee = consultationBilling.find(bill => bill.type === 'registration')?.amount || 0;
    const consultationFee = consultationBilling.find(bill => 
      bill.type === 'consultation' && !bill.consultationType?.startsWith('superconsultant_')
    )?.amount || 0;

    return {
      patient: {
        name: patient.name,
        gender: patient.gender,
        age: patient.age,
        uhId: patient.uhId,
        fileNo: patient.uhId,
        phone: patient.phone,
        email: patient.email,
        address: patient.address
      },
      doctor: {
        name: patient.assignedDoctor?.name || 'Not Assigned',
        specializations: (() => {
          const doctor = patient.assignedDoctor;
          console.log('🔍 Processing specializations for doctor:', doctor?.name);
          console.log('🔍 Specializations value:', doctor?.specializations);
          console.log('🔍 Specializations type:', typeof doctor?.specializations);
          console.log('🔍 Is array:', Array.isArray(doctor?.specializations));
          
          // Handle array format
          if (doctor?.specializations && Array.isArray(doctor.specializations) && doctor.specializations.length > 0) {
            const result = doctor.specializations.join(', ');
            console.log('🔍 Using array format, result:', result);
            return result;
          }
          // Handle string format (comma-separated)
          if (doctor?.specializations && typeof doctor.specializations === 'string' && doctor.specializations.trim()) {
            console.log('🔍 Using string format, result:', doctor.specializations);
            return doctor.specializations;
          }
          // Handle singular specialization field
          if (doctor?.specialization) {
            console.log('🔍 Using singular specialization, result:', doctor.specialization);
            return doctor.specialization;
          }
          // Default fallback
          console.log('🔍 Using default fallback: General');
          return 'General';
        })()
      },
      registrationFee,
      consultationFee,
      serviceCharges,
      totals: {
        subtotal: totalAmount,
        discount: calculatedDiscount,
        tax: 0,
        total: totalAmount - calculatedDiscount
      },
      discountType,
      discountPercentage,
      discountAmount,
      discountReason,
      invoiceNumber: consultationBilling[0]?.invoiceNumber || `INV-${patient._id.slice(-6)}`,
      date: new Date(),
      generatedBy: user?.name || 'Receptionist',
      password: patient.uhId ? `${patient.uhId}${patient.gender?.charAt(0) || 'P'}` : 'N/A'
    };
  };

  // Refresh invoice data from API
  const refreshInvoiceData = async (patient) => {
    try {
      console.log('🔄 Refreshing invoice data for patient:', patient.name);
      
      const invoicePayload = {
        patientId: patient._id
      };
      
      // Use regular invoice endpoint for normal patients
      const response = await API.post('/billing/generate-invoice', invoicePayload);
      
      if (response.data.success) {
        console.log('✅ Invoice data refreshed successfully');
        setInvoiceData(response.data.invoice);
        return response.data.invoice;
      } else {
        console.error('❌ Failed to refresh invoice data');
        return null;
      }
    } catch (error) {
      console.error('❌ Error refreshing invoice data:', error);
      return null;
    }
  };

  const handleEditInvoice = () => {
    setIsEditingInvoice(true);
    setEditedInvoiceData({
      ...invoiceData,
      tax: invoiceData.tax || 0,
      discount: invoiceData.discount || 0,
      taxPercentage: invoiceData.taxPercentage || 0,
      discountPercentage: invoiceData.discountPercentage || 0,
      notes: invoiceData.notes || ''
    });
  };

  const handleSaveInvoice = () => {
    // Calculate new totals with tax and discount
    const subtotal = editedInvoiceData.totals.total;
    const taxAmount = editedInvoiceData.taxPercentage > 0 
      ? (subtotal * editedInvoiceData.taxPercentage / 100)
      : editedInvoiceData.tax;
    const discountAmount = editedInvoiceData.discountPercentage > 0
      ? (subtotal * editedInvoiceData.discountPercentage / 100)
      : editedInvoiceData.discount;
    
    const finalTotal = subtotal + taxAmount - discountAmount;

    const updatedInvoice = {
      ...editedInvoiceData,
      tax: taxAmount,
      discount: discountAmount,
      subtotal: subtotal,
      finalTotal: finalTotal,
      totals: {
        ...editedInvoiceData.totals,
        subtotal: subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total: finalTotal
      }
    };

    setInvoiceData(updatedInvoice);
    setIsEditingInvoice(false);
    toast.success('Invoice updated successfully!');
  };

  const handleCancelEdit = () => {
    setIsEditingInvoice(false);
    setEditedInvoiceData(null);
  };

  const handleUpdateMissingInvoiceNumbers = async () => {
    try {
      const response = await API.post('/billing/update-missing-invoice-numbers');
      
      if (response.data.success) {
        toast.success(`Updated ${response.data.updatedRecords} billing records with invoice numbers`);
        // Refresh the patient list to show updated invoice numbers
        fetchPatients();
      } else {
        toast.error('Failed to update invoice numbers');
      }
    } catch (error) {
      console.error('Error updating invoice numbers:', error);
      toast.error('Failed to update invoice numbers');
    }
  };

  const addServiceField = () => {
    setServiceData(prev => ({
      ...prev,
      services: [...prev.services, { name: '', amount: '', description: '', details: '' }]
    }));
  };

  const removeServiceField = (index) => {
    setServiceData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const updateServiceField = (index, field, value) => {
    setServiceData(prev => ({
      ...prev,
      services: prev.services.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      )
    }));
  };

  const handleConsultationFeeSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) return;

    try {
      // For regular patients, use assignedDoctor
      const currentDoctor = selectedPatient.assignedDoctor;
      
      const billData = {
        patientId: selectedPatient._id,
        doctorId: currentDoctor?._id || currentDoctor,
        amount: parseFloat(paymentData.amount),
        notes: paymentData.notes,
        // Create billing entry without marking as paid
        markAsPaid: false
      };

      console.log('🔍 Consultation fee bill data:', {
        patientId: billData.patientId,
        patientIdType: typeof billData.patientId,
        doctorId: billData.doctorId
      });

      // Creating consultation fee billing entry
      const response = await API.post('/billing/consultation-fee', billData);
      
      if (response.status === 201) {
        toast.success('Consultation fee billing entry created! Patient invoice is now available.');
        
        // Close modal immediately
        setShowConsultationModal(false);
        setSelectedPatient(null);
        
        // Refresh patient data to show updated billing status
        console.log('🔄 Refreshing patient data after consultation fee creation');
        await dispatch(fetchReceptionistPatients());
        
        // Force a re-render by updating the search term slightly
        setSearchTerm(prev => prev + ' ');
        setTimeout(() => setSearchTerm(prev => prev.trim()), 100);
      } else {
        toast.error('Failed to create billing entry. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error creating consultation billing:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error('Failed to create consultation billing. Please try again.');
    }
  };


  const handlePartialPaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) return;

    try {
      // Record partial payment
      const partialPayload = {
        patientId: selectedPatient._id,
        payments: {
          consultation: parseFloat(partialPaymentData.consultationPaid) || 0,
          registration: parseFloat(partialPaymentData.registrationPaid) || 0,
          service: parseFloat(partialPaymentData.servicePaid) || 0
        },
        paymentMethod: partialPaymentData.paymentMethod,
        notes: partialPaymentData.notes
      };

      console.log('🔍 Recording partial payment:', partialPayload);

      // Record partial payment against billing entries
      const response = await API.post('/billing/record-partial-payment', partialPayload);
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Partial payment recorded successfully! Invoice updated with remaining balance.');
        
        // Close modal immediately
        setShowPartialPaymentModal(false);
        setSelectedPatient(null);
        
        // Refresh patient data to show updated payment status
        await dispatch(fetchReceptionistPatients());
      } else {
        toast.error('Failed to record partial payment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error recording partial payment:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error('Failed to record partial payment. Please try again.');
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) return;

    try {
      const billData = {
        patientId: selectedPatient._id,
        registrationFee: parseFloat(registrationData.registrationFee),
        serviceCharges: parseFloat(registrationData.serviceCharges),
        amount: parseFloat(registrationData.amount),
        notes: registrationData.notes
      };

      const response = await API.post('/billing/registration-fee', billData);
      
      if (response.status === 201) {
        toast.success('Registration fee and service charges billing created successfully!');
        
        // Close modal immediately
        setShowRegistrationModal(false);
        setSelectedPatient(null);
        
        // Refresh patient data to show updated payment status
        dispatch(fetchReceptionistPatients());
      } else {
        toast.error('Failed to create registration and service charges billing. Please try again.');
      }
    } catch (error) {
      console.error('Error creating registration fee and service charges:', error);
      toast.error('Failed to create registration fee and service charges billing. Please try again.');
    }
  };

  const handleServiceChargesSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) return;

    // Validate services
    const validServices = serviceData.services.filter(service => 
      service.name.trim() && service.amount && parseFloat(service.amount) > 0
    );

    if (validServices.length === 0) {
      toast.error('Please add at least one valid service');
      return;
    }

    try {
      // For regular patients, use assignedDoctor
      const currentDoctor = selectedPatient.assignedDoctor;
      
      const billData = {
        patientId: selectedPatient._id,
        doctorId: currentDoctor?._id || currentDoctor,
        services: validServices,
        notes: serviceData.notes
      };

      // Submitting service charges billing
      const response = await API.post('/billing/service-charges', billData);
      
      if (response.status === 201) {
        toast.success('Service charges billing created successfully!');
        
        // Close modal immediately
        setShowServiceModal(false);
        setSelectedPatient(null);
        
        // Refresh patient data to show updated payment status
        dispatch(fetchReceptionistPatients());
      } else {
        toast.error('Failed to create service charges billing. Please try again.');
      }
    } catch (error) {
      console.error('Error creating service charges:', error);
      toast.error('Failed to create service charges billing. Please try again.');
    }
  };

  // NEW WORKFLOW STATS
  const getStats = () => {
    const totalPatients = patients.length;
    const noInvoice = patients.filter(p => !p.billing || p.billing.length === 0).length;
    const pendingPayment = patients.filter(p => {
      const status = getPatientStatus(p);
      return status.status === 'Pending Payment' || status.status === 'Partial Payment';
    }).length;
    const fullyPaid = patients.filter(p => {
      const status = getPatientStatus(p);
      return status.status === 'Fully Paid';
    }).length;
    const cancelledBills = patients.filter(p => {
      const status = getPatientStatus(p);
      return status.status === 'Bill Cancelled';
    }).length;
    const refunded = patients.filter(p => {
      const status = getPatientStatus(p);
      return status.status === 'Refunded' || status.status === 'Partially Refunded';
    }).length;
    
    return { 
      totalPatients, 
      noInvoice, 
      pendingPayment, 
      fullyPaid, 
      cancelledBills, 
      refunded 
    };
  };

  const stats = getStats();

  // Helper function to convert numbers to words
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    const convertHundreds = (n) => {
      let result = '';
      if (n > 99) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n > 19) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n > 9) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };

    let result = '';
    let scaleIndex = 0;
    
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        const chunkWords = convertHundreds(chunk);
        result = chunkWords + scales[scaleIndex] + ' ' + result;
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }

    return result.trim();
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
                  Consultation Billing Workflow
                </h1>
                <p className="text-slate-600 text-sm">
                  Create invoices, process payments, and manage billing with full tracking
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    console.log('Manual pending bills check triggered');
                    setShowPendingBillsNotification(true);
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                  title="Check for pending bills"
                >
                  <Bell className="h-4 w-4" />
                  Pending Bills ({stats.pendingPayment})
                </button>
                <button
                  onClick={() => dispatch(fetchReceptionistPatients())}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Reassignment functionality moved to separate page */}

          {/* NEW WORKFLOW STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Total Patients</p>
                  <p className="text-lg font-bold text-slate-800">{stats.totalPatients}</p>
                </div>
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">No Invoice</p>
                  <p className="text-lg font-bold text-red-600">{stats.noInvoice}</p>
                </div>
                <FileText className="h-6 w-6 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Pending Payment</p>
                  <p className="text-lg font-bold text-orange-600">{stats.pendingPayment}</p>
                </div>
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Fully Paid</p>
                  <p className="text-lg font-bold text-green-600">{stats.fullyPaid}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Cancelled</p>
                  <p className="text-lg font-bold text-red-600">{stats.cancelledBills}</p>
                </div>
                <Ban className="h-6 w-6 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Refunded</p>
                  <p className="text-lg font-bold text-orange-600">{stats.refunded}</p>
                </div>
                <RotateCcw className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 mb-6">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                {/* Primary Search */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search patients by name, email, phone, UH ID, assigned doctor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    />
                  </div>
                  {/* Reassigned filter removed - functionality moved to separate page */}
                  {(searchTerm || subSearchTerm) && (
                    <button
                      onClick={clearAllSearches}
                      className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Clear All
                    </button>
                  )}
                </div>

                {/* Sub-search Panel */}
                {showSubSearch && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">
                        Refine search in {filteredPatients.length} results:
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="all">All Fields</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="uhId">UH ID</option>
                        <option value="assignedDoctor">Assigned Doctor</option>
                        <option value="status">Status</option>
                      </select>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={`Search in ${searchField}...`}
                          value={subSearchTerm}
                          onChange={(e) => setSubSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        />
                      </div>
                      {subSearchTerm && (
                        <button
                          onClick={clearSubSearch}
                          className="px-2 py-2 text-slate-500 hover:text-slate-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Reassigned filter removed - functionality moved to separate page */}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Patients List */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-4 sm:p-6 border-b border-blue-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                <ReceiptIcon className="h-5 w-5 mr-2 text-blue-500" />
                Patient Billing Workflow
              </h2>
              <p className="text-slate-600 mt-1 text-xs">
                {finalFilteredPatients.length} patients total - Create invoices, process payments, manage billing
              </p>
            </div>

            <div className="overflow-x-auto">
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
                    {searchTerm || subSearchTerm ? 'No patients match your search criteria.' : 'No patients found in the system.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* NEW WORKFLOW TABLE */}
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">UH ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Appointment</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Billing Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice Details</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Workflow Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {currentPatients.map((patient) => {
                        const statusInfo = getPatientStatus(patient);
                        // Filter out superconsultation billing - only use consultation billing
                        const consultationBilling = filterConsultationBilling(patient.billing || []);
                        const hasBilling = consultationBilling.length > 0;
                        const totalAmount = hasBilling ? consultationBilling.reduce((sum, bill) => sum + (bill.amount || 0), 0) : 0;
                        const totalPaid = hasBilling ? consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0) : 0;
                        const appointmentDisplayData = getAppointmentDisplayData(patient);
                        const appointmentStatusLower = appointmentDisplayData?.status?.toLowerCase?.();
                        const hasDoctorViewedConsultation =
                          appointmentStatusLower === 'viewed' ||
                          patient.consultationStatus?.toLowerCase?.() === 'viewed' ||
                          patient.appointmentStatus?.toLowerCase?.() === 'viewed' ||
                          (Array.isArray(patient.appointments) && patient.appointments.some((apt) => apt.status?.toLowerCase?.() === 'viewed'));
                        
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
                              <div className="text-xs text-slate-900">
                                {patient.assignedDoctor?.name || 'Not Assigned'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-xs text-slate-600 space-y-1">
                                {(() => {
                                  const appointmentData = appointmentDisplayData;
                                  
                                  if (!appointmentData) {
                                    return (
                                      <div className="space-y-1">
                                        <span className="text-slate-400">No appointment</span>
                                      </div>
                                    );
                                  }
                                  
                                  if (appointmentData.type === 'manual') {
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
                                          appointmentData.status === 'viewed' ? 'bg-green-100 text-green-700' :
                                          appointmentData.status === 'missed' ? 'bg-red-100 text-red-700' :
                                          appointmentData.status === 'reassigned' ? 'bg-orange-100 text-orange-700' :
                                          appointmentData.status === 'working_hours_violation' ? 'bg-purple-100 text-purple-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {appointmentData.status || 'scheduled'}
                                        </div>
                                        {appointmentData.notes && (
                                          <div className="text-slate-400 text-xs mt-1 max-w-32 truncate" title={appointmentData.notes}>
                                            📝 {appointmentData.notes}
                                          </div>
                                        )}
                                        {appointmentData.fromAppointment && (
                                          <div className="text-green-600 text-xs mt-1">
                                            🌐 Online Booking
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                  
                                  if (appointmentData.type === 'online') {
                                    return (
                                      <>
                                        <div className="font-medium text-slate-900">
                                          {new Date(appointmentData.date).toLocaleDateString('en-GB')}
                                        </div>
                                        <div className="text-slate-500">
                                          {appointmentData.time}
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                                          appointmentData.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                          appointmentData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                          appointmentData.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {appointmentData.status?.toUpperCase() || 'UNKNOWN'}
                                        </div>
                                        <div className="text-green-600 text-xs">
                                          🌐 Online Booking
                                        </div>
                                        {appointmentData.code && (
                                          <div className="text-slate-400 text-xs">
                                            Code: {appointmentData.code}
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                  
                                  if (appointmentData.type === 'linked') {
                                    return (
                                      <div className="space-y-1">
                                        <div className="text-slate-400">Appointment Linked</div>
                                        <div className="text-green-600 text-xs">
                                          🌐 From Online Booking
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return null;
                                })()}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {statusInfo.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-xs text-slate-600 space-y-1">
                                {hasBilling ? (
                                  <>
                                    <div className="font-medium">
                                      Total: ₹{totalAmount.toLocaleString()}
                                    </div>
                                    <div className="text-slate-500">
                                      Paid: ₹{totalPaid.toLocaleString()}
                                    </div>
                                    {(() => {
                                      // Calculate total refunded amount from consultation bills only
                                      const totalRefunded = consultationBilling.reduce((sum, bill) => {
                                        if (bill.refunds && bill.refunds.length > 0) {
                                          return sum + bill.refunds.reduce((refundSum, refund) => refundSum + (refund.amount || 0), 0);
                                        }
                                        return sum + (bill.refundAmount || 0);
                                      }, 0);
                                      
                                      if (totalRefunded > 0) {
                                        return (
                                          <div className="text-purple-600 font-medium">
                                            Refunded: ₹{totalRefunded.toLocaleString()}
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                    {totalAmount > totalPaid && (
                                      <div className="text-orange-600 font-medium">
                                        Due: ₹{(totalAmount - totalPaid).toLocaleString()}
                                </div>
                                      )}
                                    {consultationBilling[0]?.invoiceNumber && (
                                      <div className="text-slate-400 text-xs">
                                        INV: {consultationBilling[0].invoiceNumber}
                                        </div>
                                      )}
                                    </>
                                ) : (
                                  <span className="text-slate-400">No billing</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs font-medium">
                              <div className="flex items-center gap-1 flex-wrap">
                                {/* View Profile */}
                                <button
                                  onClick={() => navigate(`/dashboard/receptionist/profile/${patient._id}`)}
                                  className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                                  title="View Profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                
                                {/* NEW WORKFLOW ACTIONS */}
                                
                                {/* Create Invoice - for patients without billing */}
                                {!hasBilling && (
                                <button
                                    onClick={() => handleCreateInvoice(patient)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                                    title="Create Invoice"
                                  >
                                    <Calculator className="h-3 w-3" />
                                    Create Invoice
                                </button>
                                )}


                                {/* Record Payment - for pending payments */}
                                {(statusInfo.status === 'Pending Payment' || statusInfo.status === 'Partial Payment') && (
                                  <button
                                    onClick={() => handleRecordPayment(patient)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                                    title="Record Payment"
                                  >
                                    <ReceiptIcon className="h-3 w-3" />
                                    Record Payment
                                  </button>
                                )}

                                {/* View Invoice - for patients with billing */}
                                {hasBilling && (
                                <button
                                    onClick={() => {
                                      setSelectedPatient(patient);
                                      const invoiceData = prepareInvoiceData(patient);
                                      if (invoiceData) {
                                        setInvoiceData(invoiceData);
                                        setShowInvoicePreviewModal(true);
                                        // Fetch payment history for this patient
                                        fetchPaymentHistory(patient._id);
                                      } else {
                                        toast.error('Unable to generate invoice data');
                                      }
                                    }}
                                    className="text-purple-600 hover:text-purple-700 p-1 rounded transition-colors"
                                    title="View Invoice"
                                  >
                                    <FileCheck className="h-4 w-4" />
                                </button>
                                )}

                                {/* Cancel Bill - for any patient with billing */}
                                {hasBilling && statusInfo.status !== 'Bill Cancelled' && statusInfo.status !== 'Refunded' && !hasDoctorViewedConsultation && (
                                  <button
                                    onClick={() => handleCancelBill(patient)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                                    title="Cancel Bill"
                                  >
                                    <Ban className="h-3 w-3" />
                                    Cancel
                                  </button>
                                )}

                                {/* Process Refund - for cancelled bills with payments or partially refunded bills */}
                                {(statusInfo.status === 'Bill Cancelled' && totalPaid > 0) || statusInfo.status === 'Partially Refunded' ? (
                                  <button
                                    onClick={() => handleProcessRefund(patient)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                                    title="Process Refund"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Refund
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 || finalFilteredPatients.length > 0 ? (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
                      {/* Left side - Results info and per page selector */}
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-700">
                          Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                          <span className="font-medium">{Math.min(endIndex, finalFilteredPatients.length)}</span> of{' '}
                          <span className="font-medium">{finalFilteredPatients.length}</span> results
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-700">Show:</label>
                          <select
                            value={patientsPerPage}
                            onChange={(e) => handlePatientsPerPageChange(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <span className="text-sm text-slate-700">per page</span>
                        </div>
                      </div>

                      {/* Right side - Page navigation */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700">
                          Page <span className="font-medium">{currentPage}</span> of{' '}
                          <span className="font-medium">{totalPages}</span>
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Previous
                          </button>
                          
                          <button
                            onClick={() => handlePageChange(currentPage)}
                            className="px-3 py-1 text-sm border border-purple-500 rounded text-white bg-purple-500 font-medium"
                          >
                            {currentPage}
                          </button>
                          
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW WORKFLOW MODALS */}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col my-4">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">
                Create Invoice for {selectedPatient.name}
              </h3>
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
            
            <form id="invoice-form" onSubmit={handleInvoiceFormSubmit} className="space-y-4">
              {/* Registration Fee - Frozen/Read-Only */}
              {isPatientNew(selectedPatient) && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                    Registration Fee (₹)
                </label>
                <input
                  type="number"
                  value={invoiceFormData.registrationFee}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed text-xs"
                  placeholder="150"
                />
                <p className="text-xs text-slate-500 mt-1">
                  💡 This fee is set by your center administrator and cannot be modified
                </p>
              </div>
              )}

              {/* Consultation Fee - Frozen/Read-Only */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  value={invoiceFormData.consultationFee}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed text-xs"
                  placeholder="850"
                />
                <p className="text-xs text-slate-500 mt-1">
                  💡 This fee is set by your center administrator and cannot be modified
                </p>
              </div>

              {/* Service Charges */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Service Charges
                </label>
                <div className="space-y-3">
                  {invoiceFormData.serviceCharges.map((service, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-3">
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => {
                            const newServices = [...invoiceFormData.serviceCharges];
                            newServices[index].name = e.target.value;
                            setInvoiceFormData({...invoiceFormData, serviceCharges: newServices});
                          }}
                          placeholder="Service name"
                          className="px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                        <input
                          type="number"
                          value={service.amount}
                          onChange={(e) => {
                            const newServices = [...invoiceFormData.serviceCharges];
                            newServices[index].amount = e.target.value;
                            setInvoiceFormData({...invoiceFormData, serviceCharges: newServices});
                          }}
                          placeholder="Amount"
                          className="px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                <button
                  type="button"
                          onClick={() => {
                            const newServices = invoiceFormData.serviceCharges.filter((_, i) => i !== index);
                            setInvoiceFormData({...invoiceFormData, serviceCharges: newServices});
                          }}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          <X className="h-4 w-4" />
                </button>
              </div>
                      <input
                        type="text"
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...invoiceFormData.serviceCharges];
                          newServices[index].description = e.target.value;
                          setInvoiceFormData({...invoiceFormData, serviceCharges: newServices});
                        }}
                        placeholder="Description"
                        className="w-full mt-2 px-2 py-1 border border-slate-200 rounded text-xs"
                      />
          </div>
                  ))}
              <button
                    type="button"
                    onClick={() => {
                      setInvoiceFormData({
                        ...invoiceFormData,
                        serviceCharges: [...invoiceFormData.serviceCharges, { name: '', amount: '', description: '' }]
                      });
                    }}
                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-green-400 hover:text-green-600 transition-colors text-xs"
                  >
                    <Plus className="h-4 w-4 inline mr-1" />
                    Add Service Charge
              </button>
            </div>
            </div>

              {/* Tax */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                    Tax Percentage (%)
                </label>
                <input
                  type="number"
                    value={invoiceFormData.taxPercentage}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, taxPercentage: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    placeholder="0"
                    min="0"
                    max="100"
                />
              </div>

              {/* Discount Type Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Discount Type
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="discountType"
                      value="percentage"
                      checked={invoiceFormData.discountType === 'percentage'}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, discountType: e.target.value, discountReason: '', discountPercentage: 0})}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">By Percentage (%)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="discountType"
                      value="amount"
                      checked={invoiceFormData.discountType === 'amount'}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, discountType: e.target.value, discountReason: '', discountAmount: 0})}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">By Amount (₹)</span>
                  </label>
                </div>

                {/* Discount by Percentage */}
                {invoiceFormData.discountType === 'percentage' && (
                  <div className="space-y-3">
                    {/* Discount Reason - Show first for easy selection */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Select Discount Reason
                      </label>
                      <select
                        value={invoiceFormData.discountReason}
                        onChange={(e) => {
                          const selectedReason = e.target.value;
                          if (selectedReason) {
                            // Auto-apply the discount percentage based on selected reason
                            const discountPercentage = selectedReason === 'other' ? 0 : centerDiscountSettings[selectedReason] || 0;
                            setInvoiceFormData({
                              ...invoiceFormData, 
                              discountReason: selectedReason,
                              discountPercentage: discountPercentage
                            });
                          } else {
                            setInvoiceFormData({...invoiceFormData, discountReason: '', discountPercentage: 0});
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select discount reason or enter custom %...</option>
                        <option value="staff">Staff Discount ({centerDiscountSettings.staff}%)</option>
                        <option value="senior">Senior Citizen Discount ({centerDiscountSettings.senior}%)</option>
                        <option value="student">Student Discount ({centerDiscountSettings.student}%)</option>
                        <option value="employee">Employee Discount ({centerDiscountSettings.employee}%)</option>
                        <option value="insurance">Insurance Coverage ({centerDiscountSettings.insurance}%)</option>
                        <option value="referral">Referral Discount ({centerDiscountSettings.referral}%)</option>
                        <option value="promotion">Promotional Discount ({centerDiscountSettings.promotion}%)</option>
                        <option value="charity">Charity Case ({centerDiscountSettings.charity}%)</option>
                        <option value="other">Custom Discount (Enter manually below)</option>
                      </select>
                      {invoiceFormData.discountReason && invoiceFormData.discountReason !== 'other' && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Discount percentage automatically set to {invoiceFormData.discountPercentage}%
                        </p>
                      )}
                      {invoiceFormData.discountReason === 'other' && (
                        <p className="text-xs text-orange-600 mt-1">
                          📝 Enter custom discount percentage below
                        </p>
                      )}
                    </div>

                    {/* Manual Discount Percentage Input */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Discount Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={invoiceFormData.discountPercentage}
                        onChange={(e) => setInvoiceFormData({...invoiceFormData, discountPercentage: parseFloat(e.target.value) || 0})}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs ${
                          invoiceFormData.discountReason && invoiceFormData.discountReason !== 'other' 
                            ? 'bg-blue-50 border-blue-300' 
                            : ''
                        }`}
                        placeholder={invoiceFormData.discountReason ? 'Auto-filled from reason' : '0'}
                        min="0"
                        max="100"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {invoiceFormData.discountReason 
                          ? `💡 Auto-filled from selected reason - you can edit this value if needed`
                          : '💡 Select a reason above to auto-fill, or enter a custom percentage'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Discount by Amount */}
                {invoiceFormData.discountType === 'amount' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Discount Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={invoiceFormData.discountAmount}
                        onChange={(e) => setInvoiceFormData({...invoiceFormData, discountAmount: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    {/* Discount Reason - Only show if discount amount > 0 */}
                    {invoiceFormData.discountAmount > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Discount Reason *
                      </label>
                      <select
                        value={invoiceFormData.discountReason}
                        onChange={(e) => setInvoiceFormData({...invoiceFormData, discountReason: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        required
                      >
                        <option value="">Select reason...</option>
                        <option value="staff">Staff Discount</option>
                        <option value="senior">Senior Citizen Discount</option>
                        <option value="student">Student Discount</option>
                        <option value="employee">Employee Discount</option>
                        <option value="insurance">Insurance Coverage</option>
                        <option value="referral">Referral Discount</option>
                        <option value="promotion">Promotional Discount</option>
                        <option value="charity">Charity Case</option>
                        <option value="other">Other (Please specify in notes)</option>
                      </select>
                      {invoiceFormData.discountReason === 'other' && (
                        <p className="text-xs text-orange-600 mt-1">
                          📝 Please specify the reason in the notes field below
                        </p>
                      )}
                    </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData({...invoiceFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Appointment Confirmation Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                  <h4 className="font-medium text-blue-800 text-sm">Appointment Confirmation</h4>
                </div>
                
                {/* Search for existing appointment */}
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => fetchPatientAppointment(selectedPatient)}
                    disabled={appointmentLoading}
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-2"
                  >
                    {appointmentLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Searching for appointments...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        Search for Existing Appointment
                      </>
                    )}
                  </button>
                </div>

                {/* Display found appointment */}
                {patientAppointment && (
                  <div className="mb-3 bg-white border border-blue-300 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-700 font-semibold text-sm">Found Appointment</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        patientAppointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-700' 
                          : patientAppointment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {patientAppointment.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-blue-600">Date:</span>
                        <span className="font-medium ml-1">
                          {patientAppointment.confirmedDate 
                            ? new Date(patientAppointment.confirmedDate).toLocaleDateString('en-GB')
                            : new Date(patientAppointment.preferredDate).toLocaleDateString('en-GB')
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-600">Time:</span>
                        <span className="font-medium ml-1">
                          {patientAppointment.confirmedTime || patientAppointment.preferredTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-600">Code:</span>
                        <span className="font-mono font-semibold text-blue-600 ml-1">{patientAppointment.confirmationCode}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Type:</span>
                        <span className="font-medium ml-1 capitalize">
                          {patientAppointment.appointmentType || 'consultation'}
                        </span>
                      </div>
                    </div>
                    {patientAppointment.status === 'pending' && (
                      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                        ⚠️ This appointment needs confirmation. Consider confirming it after invoice creation.
                      </div>
                    )}
                  </div>
                )}

                {/* Manual appointment scheduling */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Schedule New Appointment (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={invoiceFormData.appointmentTime || ''}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, appointmentTime: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    📅 This will schedule a new appointment for the patient after invoice creation
                  </p>
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-700 mb-2">Invoice Preview</h4>
                <div className="space-y-1 text-xs">
                  {invoiceFormData.registrationFee > 0 && (
                    <div className="flex justify-between">
                      <span>Registration Fee:</span>
                      <span>₹{invoiceFormData.registrationFee}</span>
        </div>
      )}
                  <div className="flex justify-between">
                    <span>Consultation Fee:</span>
                    <span>₹{invoiceFormData.consultationFee}</span>
            </div>
                  {invoiceFormData.serviceCharges.filter(s => s.name && s.amount).map((service, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{service.name}:</span>
                      <span>₹{service.amount}</span>
            </div>
                  ))}
                  {(() => {
                    const subtotal = invoiceFormData.registrationFee + invoiceFormData.consultationFee + 
                      invoiceFormData.serviceCharges.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                    const taxAmount = subtotal * (invoiceFormData.taxPercentage / 100);
                    
                    // Calculate discount based on type
                    let discountAmount = 0;
                    let discountLabel = '';
                    if (invoiceFormData.discountType === 'percentage') {
                      discountAmount = subtotal * (invoiceFormData.discountPercentage / 100);
                      discountLabel = `Discount (${invoiceFormData.discountPercentage}%)`;
                    } else if (invoiceFormData.discountType === 'amount') {
                      discountAmount = invoiceFormData.discountAmount || 0;
                      discountLabel = 'Discount Amount';
                    }
                    
                    const total = subtotal + taxAmount - discountAmount;
                    
                    return (
                      <>
                        <div className="flex justify-between border-t border-slate-300 pt-1">
                          <span>Subtotal:</span>
                          <span>₹{subtotal}</span>
                </div>
                        {taxAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Tax:</span>
                            <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                        )}
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>{discountLabel}:</span>
                            <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-slate-300 pt-1">
                          <span>Total:</span>
                          <span>₹{total.toFixed(2)}</span>
              </div>
                      </>
                    );
                  })()}
              </div>
              </div>

            </form>
            </div>
            
            {/* Footer - Fixed */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0 bg-slate-50 sticky bottom-0">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  📄 Invoice will be generated and previewed after creation
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateInvoiceModal(false)}
                    className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="invoice-form"
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    Create Invoice & Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview & Payment Modal */}
      {showInvoicePreviewModal && selectedPatient && invoiceData && (
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
                      // Filter out superconsultation billing - only use consultation billing
                      const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                      // Calculate outstanding amount (only from consultation billing)
                      const totalAmount = consultationBilling.reduce((sum, bill) => sum + (bill.amount || 0), 0);
                      const totalPaid = consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
                      const outstandingAmount = totalAmount - totalPaid;
                      
                      // Create a mock invoice object for payment processing
                      const mockInvoice = {
                        invoiceNumber: consultationBilling[0]?.invoiceNumber || `INV-${selectedPatient._id.toString().slice(-6)}`,
                        patientId: selectedPatient._id,
                        total: totalAmount,
                        paid: totalPaid,
                        outstanding: outstandingAmount
                      };
                      
                      // Set the generated invoice for payment processing
                      setGeneratedInvoice(mockInvoice);
                      
      // Pre-populate payment data
      setPaymentData({
        amount: outstandingAmount > 0 ? outstandingAmount.toString() : '',
        paymentMethod: 'cash',
        notes: `Payment for patient: ${selectedPatient.name}`,
        appointmentTime: '',
        consultationType: 'OP'
      });
                      
                      setShowInvoicePreviewModal(false);
                      setShowPaymentModal(true);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Process Payment
                  </button>
                  
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
                              
                              /* Removed DUPLICA watermark */
                              
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
              {invoiceData && (
                <div className="bg-white p-6 max-w-4xl mx-auto relative">
                  {/* Content - Watermark removed */}
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
                        <div><span className="font-medium">Ref. Doctor:</span> {selectedPatient.referenceDoctor || 'N/A'}</div>
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
                          
                          // Filter out superconsultation billing - only use consultation billing
                          const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                          
                          // Add registration fee if exists
                          if (invoiceData.registrationFee > 0) {
                            const regBill = consultationBilling.find(bill => bill.type === 'registration');
                            const regPaid = regBill?.paidAmount || 0;
                            const regRefunded = regBill?.refundAmount || 0;
                            const regBalance = invoiceData.registrationFee - regPaid;
                            let regStatus, regStatusColor;
                            
                            if (regBill?.status === 'cancelled') {
                              regStatus = 'Cancelled';
                              regStatusColor = 'text-red-600';
                            } else if (regBill?.status === 'refunded') {
                              regStatus = 'Refunded';
                              regStatusColor = 'text-orange-600';
                            } else if (regBill?.status === 'partially_refunded') {
                              regStatus = 'Partially Refunded';
                              regStatusColor = 'text-yellow-600';
                            } else {
                              regStatus = regPaid >= invoiceData.registrationFee ? 'Paid' : regPaid > 0 ? 'Partial' : 'Unpaid';
                              regStatusColor = regStatus === 'Paid' ? 'text-green-600' : regStatus === 'Partial' ? 'text-orange-600' : 'text-red-600';
                            }
                            
                            rows.push(
                              <tr key="reg">
                                <td className="border border-slate-300 px-3 py-2 text-xs">{serialNumber++}</td>
                                <td className="border border-slate-300 px-3 py-2 text-xs">Registration Fee</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">1</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{invoiceData.registrationFee.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{regPaid.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{regBalance.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                                  <span className={`font-medium ${regStatusColor}`}>
                                    {regStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                          
                          // Add consultation fee if exists
                          if (invoiceData.consultationFee > 0) {
                            const consultBill = consultationBilling.find(bill => 
                              bill.type === 'consultation' && !bill.consultationType?.startsWith('superconsultant_')
                            );
                            const consultPaid = consultBill?.paidAmount || 0;
                            const consultRefunded = consultBill?.refundAmount || 0;
                            const consultBalance = invoiceData.consultationFee - consultPaid;
                            let consultStatus, consultStatusColor;
                            
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
                                <td className="border border-slate-300 px-3 py-2 text-xs">{serialNumber++}</td>
                                <td className="border border-slate-300 px-3 py-2 text-xs">
                                  {(() => {
                                    const consultBill = consultationBilling.find(b => b.type === 'consultation' && !b.consultationType?.startsWith('superconsultant_'));
                                    if (consultBill?.consultationType === 'followup') return 'Followup Consultation (Free)';
                                    if (consultBill?.consultationType === 'IP') return 'IP Consultation Fee';
                                    return 'OP Consultation Fee';
                                  })()}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">1</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{invoiceData.consultationFee.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{consultPaid.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{consultBalance.toFixed(2)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                                  <span className={`font-medium ${consultStatusColor}`}>
                                    {consultStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                          
                          // Add service charges - only from consultation billing
                          invoiceData.serviceCharges.forEach((service, index) => {
                            const serviceBill = consultationBilling.find(bill => 
                              bill.type === 'service' && bill.description === service.name
                            );
                            const servicePaid = serviceBill?.paidAmount || 0;
                            const serviceRefunded = serviceBill?.refundAmount || 0;
                            const serviceBalance = service.amount - servicePaid;
                            let serviceStatus, serviceStatusColor;
                            
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
                                <td className="border border-slate-300 px-3 py-2 text-xs">{serialNumber++}</td>
                                <td className="border border-slate-300 px-3 py-2 text-xs">{service.name}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center text-xs">1</td>
                                <td className="border border-slate-300 px-3 py-2 text-right text-xs">{service.amount.toFixed(2)}</td>
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
                        // Filter out superconsultation billing - only use consultation billing
                        const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                        const totalPaid = consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
                        const totalRefunded = consultationBilling.reduce((sum, bill) => sum + (bill.refundAmount || 0), 0);
                        const hasCancelledBills = consultationBilling.some(bill => bill.status === 'cancelled');
                        
                        return (
                          <div className="text-xs">
                            {hasCancelledBills && (
                              <div className="mb-2">
                                <div className="font-medium text-red-600 mb-1">Bill Status: CANCELLED</div>
                              </div>
                            )}
                            {totalPaid > 0 && (
                              <div className="mb-1">
                                <span className="font-medium">Amount Paid:</span> (Rs.) {numberToWords(totalPaid)} Only
                              </div>
                            )}
                            {totalRefunded > 0 && (
                              <div className="mb-1">
                                <span className="font-medium">Amount Refunded:</span> (Rs.) {numberToWords(totalRefunded)} Only
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
                        <div className="flex justify-between">
                          <span>Discount(-):</span>
                          <span>₹{invoiceData.totals.discount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax Amount:</span>
                          <span>₹{invoiceData.totals.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-300 pt-1">
                          <span>Grand Total:</span>
                          <span>₹{invoiceData.totals.total.toFixed(2)}</span>
                        </div>
                        {(() => {
                          // Filter out superconsultation billing - only use consultation billing
                          const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                          const totalPaid = consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
                          const totalRefunded = consultationBilling.reduce((sum, bill) => sum + (bill.refundAmount || 0), 0);
                          const hasCancelledBills = consultationBilling.some(bill => bill.status === 'cancelled');
                          const hasRefundedBills = consultationBilling.some(bill => bill.status === 'refunded');
                          const outstandingAmount = invoiceData.totals.total - totalPaid;
                          
                          return (
                            <>
                              <div className="flex justify-between border-t border-slate-300 pt-1">
                                <span>Amount Paid:</span>
                                <span className="text-green-600 font-medium">₹{totalPaid.toFixed(2)}</span>
                              </div>
                              {totalRefunded > 0 && (() => {
                                // Check if there's a penalty deducted (for cancelled bills)
                                const hasCancelled = consultationBilling.some(bill => bill.status === 'cancelled');
                                const totalPaid = consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
                                const penalty = totalPaid - totalRefunded;
                                // Get payment method from first paid bill
                                const paymentMethod = consultationBilling.find(bill => bill.paidAmount > 0)?.paymentMethod || 'Cash';
                                const refundMethod = consultationBilling.find(bill => bill.refundAmount > 0)?.refunds?.[0]?.method || 'Cash';
                                
                                return (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Amount Refunded:</span>
                                      <span className="text-orange-600 font-medium">₹{totalRefunded.toFixed(2)}</span>
                                    </div>
                                    {hasCancelled && penalty > 0 && (
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
                                    )}
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                      <span>Payment Method:</span>
                                      <span className="capitalize">{paymentMethod}</span>
                                    </div>
                                    {totalRefunded > 0 && (
                                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>Refund Method:</span>
                                        <span className="capitalize">{refundMethod}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                              {outstandingAmount > 0 && !hasCancelledBills && (
                                <div className="flex justify-between">
                                  <span>Outstanding:</span>
                                  <span className="text-orange-600 font-medium">₹{outstandingAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {hasCancelledBills && (
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="text-red-600 font-bold">BILL CANCELLED</span>
                                </div>
                              )}
                              {hasRefundedBills && !hasCancelledBills && (
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="text-orange-600 font-bold">REFUNDED</span>
                                </div>
                              )}
                              {outstandingAmount === 0 && totalPaid > 0 && !hasCancelledBills && !hasRefundedBills && (
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

                  {/* Transaction History - Shows all payments and refunds */}
                  {(() => {
                    // Filter out superconsultation billing - only use consultation billing
                    const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                    
                    // Get all billing records with payments/refunds
                    const transactions = [];
                    
                    consultationBilling.forEach(bill => {
                      // Add payment transaction if paid
                      if (bill.paidAmount > 0) {
                        transactions.push({
                          type: 'payment',
                          amount: bill.paidAmount,
                          method: bill.paymentMethod || 'cash',
                          date: bill.paidAt || bill.createdAt,
                          transactionId: bill.transactionId,
                          description: bill.description || 'Payment'
                        });
                      }
                      
                      // Add refund transactions
                      if (bill.refunds && bill.refunds.length > 0) {
                        bill.refunds.forEach(refund => {
                          transactions.push({
                            type: 'refund',
                            amount: refund.amount || 0,
                            method: refund.method || 'cash',
                            date: refund.processedAt || refund.createdAt,
                            reason: refund.reason,
                            description: bill.description || 'Refund'
                          });
                        });
                      } else if (bill.refundAmount > 0) {
                        transactions.push({
                          type: 'refund',
                          amount: bill.refundAmount,
                          method: bill.refundMethod || 'cash',
                          date: bill.refundAt || bill.updatedAt || bill.createdAt,
                          description: bill.description || 'Refund'
                        });
                      }
                    });
                    
                    // Sort by date (newest first)
                    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                    if (transactions.length > 0) {
                      return (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-slate-800 mb-3">Transaction History</h4>
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
                                <tr key={index} className={transaction.type === 'refund' ? 'bg-orange-50' : 'bg-white'}>
                                  <td className="border border-slate-300 px-3 py-2 text-xs">
                                    {new Date(transaction.date).toLocaleDateString('en-GB')} {new Date(transaction.date).toLocaleTimeString('en-GB')}
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
                                    <div className="font-medium">{transaction.description}</div>
                                    {transaction.reason && (
                                      <div className="text-slate-500 text-xs mt-1">{transaction.reason}</div>
                                    )}
                                    {transaction.transactionId && (
                                      <div className="text-slate-400 text-xs mt-1">ID: {transaction.transactionId}</div>
                                    )}
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2 text-right text-xs font-medium">
                                    <span className={transaction.type === 'payment' ? 'text-green-600' : 'text-orange-600'}>
                                      {transaction.type === 'payment' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2 text-xs capitalize">
                                    {transaction.method}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return null;
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

                  {/* Footer - Compact */}
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
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {showPaymentModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">
                Process Payment - {selectedPatient.name}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPatientAppointment(null);
                  setSelectedAppointmentDate('');
                  setSelectedSlotId(null);
                  setAvailableSlots([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Outstanding Amount Display */}
              {(() => {
                // Filter out superconsultation billing - only use consultation billing
                const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                if (consultationBilling.length === 0) return null;
                
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Payment Summary</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Total Amount:</span>
                        <span className="font-semibold">₹{consultationBilling.reduce((sum, bill) => sum + (bill.amount || 0), 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Amount Paid:</span>
                        <span className="font-semibold text-green-600">₹{consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-300 pt-1">
                        <span className="text-blue-700 font-semibold">Amount Due:</span>
                        <span className="font-bold text-orange-600">₹{consultationBilling.reduce((sum, bill) => sum + (bill.amount || 0) - (bill.paidAmount || 0), 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

                      <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Payment Amount (₹) *
                        </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed text-xs"
                  placeholder="Payment amount"
                />
                <p className="text-xs text-slate-500 mt-1">
                  💡 This amount represents the outstanding balance and cannot be edited
                </p>
              </div>


                      <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Payment Method *
                        </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                </select>
                      </div>

                      <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Schedule Appointment <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Appointment Details Display */}
                    {patientAppointment && (
                      <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-blue-700 font-semibold text-sm">Existing Appointment Found</span>
                          <div className="ml-auto">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              patientAppointment.status === 'confirmed' 
                                ? 'bg-green-100 text-green-700' 
                                : patientAppointment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : patientAppointment.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {patientAppointment.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-600">Date:</span>
                            <span className="font-medium">
                              {patientAppointment.confirmedDate 
                                ? new Date(patientAppointment.confirmedDate).toLocaleDateString('en-GB')
                                : new Date(patientAppointment.preferredDate).toLocaleDateString('en-GB')
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">Time:</span>
                            <span className="font-medium">
                              {patientAppointment.confirmedTime || patientAppointment.preferredTime}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">Type:</span>
                            <span className="font-medium capitalize">
                              {patientAppointment.appointmentType || 'consultation'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">Code:</span>
                            <span className="font-mono font-semibold text-blue-600">{patientAppointment.confirmationCode}</span>
                          </div>
                          {patientAppointment.reasonForVisit && (
                            <div className="flex justify-between">
                              <span className="text-blue-600">Reason:</span>
                              <span className="font-medium text-right max-w-32 truncate" title={patientAppointment.reasonForVisit}>
                                {patientAppointment.reasonForVisit}
                              </span>
                            </div>
                          )}
                          {patientAppointment.symptoms && (
                            <div className="flex justify-between">
                              <span className="text-blue-600">Symptoms:</span>
                              <span className="font-medium text-right max-w-32 truncate" title={patientAppointment.symptoms}>
                                {patientAppointment.symptoms}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-300">
                          <p className="text-blue-800 text-xs font-medium">
                            ✅ Appointment time has been auto-filled below
                          </p>
                          {patientAppointment.status === 'pending' && (
                            <p className="text-yellow-700 text-xs mt-1">
                              ⚠️ This appointment needs confirmation
                            </p>
                          )}
                          {patientAppointment.status === 'cancelled' && (
                            <p className="text-red-700 text-xs mt-1">
                              ❌ This appointment was cancelled
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {appointmentLoading && (
                      <div className="mb-3 flex items-center text-blue-600 text-xs">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Searching for appointment details...
                      </div>
                    )}
                    
                    {!patientAppointment && !appointmentLoading && (
                      <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-gray-700 font-medium text-sm">
                              {selectedPatient.fromAppointment ? 'Appointment Linked' : 'No appointment found'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => fetchPatientAppointment(selectedPatient)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                          >
                            🔍 Search Again
                          </button>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">
                          {selectedPatient.fromAppointment ? (
                            <>
                              This patient was created from an online booking. 
                              {selectedPatient.appointmentId ? ' Appointment data is linked but not populated.' : ' No appointment data available.'}
                              <br />
                              You can manually set the appointment time below or search for existing appointments.
                            </>
                          ) : (
                            'You can manually set the appointment time below or search for existing appointments.'
                          )}
                        </p>
                        {selectedPatient.fromAppointment && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                            🌐 This patient was created from an online appointment booking
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Date Picker */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Appointment Date *
                      </label>
                      <input
                        type="date"
                        value={selectedAppointmentDate || ''}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          console.log('Date changed by user to:', newDate);
                          if (newDate) {
                            setSelectedAppointmentDate(newDate);
                            setSelectedSlotId(null);
                            setPaymentData(prev => ({...prev, appointmentTime: ''}));
                          }
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        required
                        disabled={!selectedPatient?.assignedDoctor}
                      />
                      {!selectedPatient?.assignedDoctor && (
                        <p className="text-xs text-amber-600 mt-1">
                          Please assign a doctor to the patient first
                        </p>
                      )}
                    </div>

                    {/* Slot Selector */}
                    {selectedPatient?.assignedDoctor ? (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Available Time Slots *
                        </label>
                        <select
                          value={selectedSlotId || ''}
                          onChange={(e) => {
                            const slotId = e.target.value;
                            setSelectedSlotId(slotId);
                            // Find the selected slot and set appointmentTime
                            const selectedSlot = availableSlots.find(slot => slot.slotId === slotId);
                            if (selectedSlot && selectedAppointmentDate) {
              const slotDateTime = combineDateAndTime(selectedAppointmentDate, selectedSlot.startTime);
              if (!slotDateTime || slotDateTime <= new Date()) {
                toast.error('Please choose a future time slot');
                setSelectedSlotId(null);
                setPaymentData(prev => ({...prev, appointmentTime: ''}));
                return;
              }
                              // Combine date and time into datetime format (local time, no timezone conversion)
                              const [hours, minutes] = selectedSlot.startTime.split(':');
                              // Parse date string (YYYY-MM-DD) and create date in local timezone
                              const [year, month, day] = selectedAppointmentDate.split('-').map(Number);
                              const appointmentDateTime = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);
                              // Format as YYYY-MM-DDTHH:mm for datetime-local input
                              const formattedDateTime = `${selectedAppointmentDate}T${selectedSlot.startTime}:00`;
                              setPaymentData(prev => ({
                                ...prev,
                                appointmentTime: formattedDateTime
                              }));
                            }
                          }}
                          disabled={!selectedAppointmentDate || slotsLoading || availableSlots.length === 0}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                          required
                        >
                          <option value="">
                            {slotsLoading 
                              ? 'Loading slots...' 
                              : !selectedAppointmentDate 
                              ? 'Select date first' 
                              : availableSlots.length === 0 
                              ? 'No slots available for this date' 
                              : 'Select a time slot'}
                          </option>
                          {availableSlots.map((slot, idx) => (
                            <option key={idx} value={slot.slotId}>
                              {slot.display}
                            </option>
                          ))}
                        </select>
                        {slotsLoading && (
                          <p className="text-xs text-slate-500 mt-1">Loading available slots...</p>
                        )}
                        {!slotsLoading && selectedAppointmentDate && availableSlots.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No slots available for {selectedPatient.assignedDoctor?.name || 'the assigned doctor'} on this date. 
                            {(() => {
                              const today = new Date().toISOString().split('T')[0];
                              const selectedDate = selectedAppointmentDate;
                              if (selectedDate >= today) {
                                return ' Slots may need to be created first. Please ensure default working hours are set for this doctor in the Doctor Calendar.';
                              }
                              return ' Please select another date.';
                            })()}
                          </p>
                        )}
                        {selectedSlotId && paymentData.appointmentTime && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            ✅ Appointment scheduled for: {(() => {
                              // Parse the datetime string (YYYY-MM-DDTHH:mm) and display in local format
                              const [datePart, timePart] = paymentData.appointmentTime.split('T');
                              const [year, month, day] = datePart.split('-').map(Number);
                              const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
                              const appointmentDate = new Date(year, month - 1, day, hours, minutes);
                              return appointmentDate.toLocaleString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                            })()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700">
                          ⚠️ Patient does not have an assigned doctor. Please assign a doctor first to book appointments.
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Doctor will only see this patient on the scheduled appointment date. Appointments can be scheduled for today or any future date.
                    </p>
                  </div>
                  
                  <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Consultation Type
                    </label>
                    <select
                  value={paymentData.consultationType}
                  onChange={(e) => setPaymentData({...paymentData, consultationType: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    >
                      <option value="OP">OP (Outpatient) - ₹850</option>
                      <option value="IP">IP (Inpatient) - ₹1050</option>
                      <option value="followup" disabled={!selectedPatient?.followupEligible || selectedPatient?.followupUsed}>
                        Followup (Free within 7 days) - ₹0
                      </option>
                    </select>
                    {selectedPatient?.followupEligible && !selectedPatient?.followupUsed && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Patient is eligible for free followup consultation
                      </p>
                    )}
                    {selectedPatient?.followupUsed && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠ Free followup consultation already used
                      </p>
                    )}
                  </div>

                      <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Notes
                    </label>
                    <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                      rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  placeholder="Additional notes..."
                    />
                  </div>

              <div className="flex gap-3 pt-4">
                    <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPatientAppointment(null);
                    setSelectedAppointmentDate('');
                    setSelectedSlotId(null);
                    setAvailableSlots([]);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                    >
                  Cancel
                    </button>
                    <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-medium"
                    >
                  Record Payment
                    </button>
                  </div>
              </form>
            </div>
            
            {/* Footer - Fixed */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="text-xs text-gray-500 text-center">
                💡 Tip: You can schedule an appointment after payment processing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Bill Modal */}
      {showCancelBillModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Fixed */}
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
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
            
            <form onSubmit={handleCancelBillSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs"
                  placeholder="Please provide a reason for cancelling this bill..."
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
                      checked={patientBehavior === 'okay'}
                      onChange={(e) => setPatientBehavior(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">Patient is okay with penalty (₹150 registration fee)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="patientBehavior"
                      value="rude"
                      checked={patientBehavior === 'rude'}
                      onChange={(e) => setPatientBehavior(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">Patient is rude - Full refund + ask not to return</span>
                  </label>
                </div>
              </div>

              {/* Refund Type Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Refund Type *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="refundType"
                      value="partial"
                      checked={refundType === 'partial'}
                      onChange={(e) => setRefundType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">Partial Refund (₹{penaltyAmount} penalty)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="refundType"
                      value="full"
                      checked={refundType === 'full'}
                      onChange={(e) => setRefundType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">Full Refund (No penalty)</span>
                  </label>
                </div>
              </div>

              {/* Penalty Amount Input */}
              {refundType === 'partial' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Penalty Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="1000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs"
                    placeholder="Enter penalty amount"
                  />
                </div>
              )}

              {/* Refund Summary */}
              {selectedPatient && (() => {
                // Filter out superconsultation billing - only use consultation billing
                const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                const latestBill = consultationBilling.length > 0 ? consultationBilling[consultationBilling.length - 1] : null;
                if (!latestBill) return null;
                
                const totalAmount = latestBill.customData?.totals?.total || latestBill.amount || 0;
                const paidAmount = latestBill.customData?.totals?.paid || latestBill.paidAmount || 0;
                const refundAmount = refundType === 'full' ? paidAmount : Math.max(0, paidAmount - penaltyAmount);
                
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-slate-800 mb-2">Refund Summary</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Total Bill Amount:</span>
                        <span>₹{totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span>₹{paidAmount.toFixed(2)}</span>
                      </div>
                      {refundType === 'partial' && (
                        <div className="flex justify-between text-red-600">
                          <span>Penalty (Registration Fee):</span>
                          <span>-₹{penaltyAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t border-slate-300 pt-1">
                        <span>Refund Amount:</span>
                        <span className="text-green-600">₹{refundAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-xs text-red-700">
                    <p className="font-medium mb-1">Warning:</p>
                    <p>This action will cancel the bill and process the selected refund. This action cannot be undone.</p>
                    {patientBehavior === 'rude' && (
                      <p className="mt-1 font-medium text-red-800">Patient will be asked not to return to the clinic.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelBillModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium"
                >
                  Cancel Bill
                </button>
              </div>
            </form>
            </div>
            
            {/* Footer - Fixed */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="text-xs text-gray-500 text-center">
                ⚠️ This action cannot be undone
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {showRefundModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Fixed */}
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
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
            
            <form onSubmit={handleRefundSubmit} className="space-y-4">
              {/* Payment Summary */}
              {(() => {
                // Filter out superconsultation billing - only use consultation billing
                const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                if (consultationBilling.length === 0) return null;
                
                return (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-semibold text-orange-800 mb-2">Refund Summary</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-orange-700">Total Paid:</span>
                        <span className="font-semibold">₹{consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">Already Refunded:</span>
                        <span className="font-semibold text-red-600">₹{consultationBilling.reduce((sum, bill) => sum + (bill.refundAmount || 0), 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-t border-orange-300 pt-1">
                        <span className="text-orange-700 font-semibold">Available for Refund:</span>
                        <span className="font-bold text-green-600">₹{consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0) - (bill.refundAmount || 0), 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Refund Type Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Refund Type *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="refundType"
                      value="withPenalty"
                      checked={refundData.refundType === 'withPenalty'}
                      onChange={(e) => setRefundData({...refundData, refundType: e.target.value})}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">
                      With Penalty (₹{penaltyAmount} deducted) - Refund: Registration fee held as penalty
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="refundType"
                      value="full"
                      checked={refundData.refundType === 'full'}
                      onChange={(e) => setRefundData({...refundData, refundType: e.target.value})}
                      className="mr-2"
                    />
                    <span className="text-xs text-slate-700">
                      Full Refund (₹0 deducted) - Refund: All amounts including registration fee
                    </span>
                  </label>
                </div>
              </div>

              {/* Refund Amount Calculation */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  value={(() => {
                    // Filter out superconsultation billing - only use consultation billing
                    const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                    const availableAmount = consultationBilling.reduce((sum, bill) => 
                      sum + (bill.paidAmount || 0) - (bill.refundAmount || 0), 0);
                    if (refundData.refundType === 'withPenalty') {
                      return Math.max(0, availableAmount - penaltyAmount);
                    }
                    return availableAmount;
                  })()}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed text-xs"
                />
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                  {(() => {
                    // Filter out superconsultation billing - only use consultation billing
                    const consultationBilling = filterConsultationBilling(selectedPatient.billing || []);
                    const availableAmount = consultationBilling.reduce((sum, bill) => sum + (bill.paidAmount || 0) - (bill.refundAmount || 0), 0);
                    
                    return refundData.refundType === 'withPenalty' ? (
                      <div>
                        <p className="font-medium mb-1">Refund Calculation (With Penalty):</p>
                        <p>• Total Paid: ₹{availableAmount.toLocaleString()}</p>
                        <p>• Penalty: -₹{penaltyAmount}</p>
                        <p className="font-semibold mt-1">• Final Refund: ₹{Math.max(0, availableAmount - penaltyAmount).toLocaleString()}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium mb-1">Refund Calculation (Full Refund):</p>
                        <p>• Total Paid: ₹{availableAmount.toLocaleString()}</p>
                        <p>• Penalty: ₹0 (No penalty)</p>
                        <p className="font-semibold mt-1">• Final Refund: ₹{availableAmount.toLocaleString()}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Refund Method */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Refund Method *
                </label>
                <select
                  value={refundData.refundMethod}
                  onChange={(e) => setRefundData({...refundData, refundMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="neft">NEFT</option>
                </select>
              </div>

              {/* Refund Reason */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Refund Reason *
                </label>
                <textarea
                  value={refundData.reason}
                  onChange={(e) => setRefundData({...refundData, reason: e.target.value})}
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                  placeholder="Please provide a reason for the refund..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={refundData.notes}
                  onChange={(e) => setRefundData({...refundData, notes: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-medium"
                >
                  Process {refundData.refundType === 'withPenalty' ? 'With Penalty' : 'Full'} Refund
                </button>
              </div>
            </form>
            </div>
            
            {/* Footer - Fixed */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="text-xs text-gray-500 text-center">
                💰 Refund will be processed immediately
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Pending Bills Notification */}
      <PendingBillsNotification 
        isOpen={showPendingBillsNotification} 
        onClose={() => setShowPendingBillsNotification(false)} 
      />
    </ReceptionistLayout>
  );
}
