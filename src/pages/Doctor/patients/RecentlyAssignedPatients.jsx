import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAssignedPatients } from "../../../features/doctor/doctorThunks";
import { canDoctorEditPatient, formatRemainingTime } from "../../../utils/patientPermissions";
import { toast } from "react-toastify";
import { markPatientAsViewed } from "../../../services/api";
import { 
  Users, 
  Search, 
  Eye, 
  Edit, 
  Mail,
  Phone,
  User,
  Calendar,
  MapPin,
  Clock,
  Filter,
  CalendarDays,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  DollarSign,
  Lock
} from 'lucide-react';

export default function RecentlyAssignedPatients() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [dateFilter, setDateFilter] = useState('scheduled'); // scheduled, today, last7days, last30days
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const { assignedPatients = [], loading } = useSelector((state) => state.doctor);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchAssignedPatients());
  }, [dispatch]);

  // Auto-refresh patient data every 30 seconds to keep status updated
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing assigned patients...');
      dispatch(fetchAssignedPatients());
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  // Filter patients based on assignment date and search term
  useEffect(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let filtered = [];

    // Filter by assignment date and viewed status (include reassigned patients)
    filtered = (assignedPatients || []).filter(patient => {
      // First, find the earliest scheduled appointment (all appointment types)
      let scheduledAppointment = null;
      let appointmentDate = null;
      
      if (patient.appointments && patient.appointments.length > 0) {
        // Get all appointments with scheduledAt, appointmentTime, or other date fields
        const allAppointments = patient.appointments.map(apt => {
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
        }).filter(apt => apt !== null && apt._appointmentDate);
        
        if (allAppointments.length > 0) {
          // Sort by date (earliest first)
          allAppointments.sort((a, b) => a._appointmentDate.getTime() - b._appointmentDate.getTime());
          scheduledAppointment = allAppointments[0];
          appointmentDate = new Date(scheduledAppointment._appointmentDate);
          appointmentDate.setHours(0, 0, 0, 0);
        }
      }
      
      // Priority 2: Check patient.appointmentTime directly
      if (!appointmentDate && patient.appointmentTime) {
        try {
          const directAppointmentDate = new Date(patient.appointmentTime);
          if (!isNaN(directAppointmentDate.getTime())) {
            appointmentDate = new Date(directAppointmentDate);
            appointmentDate.setHours(0, 0, 0, 0);
          }
        } catch (e) {
          // Invalid date
        }
      }
      
      // Priority 3: Check reassignedBilling records for appointmentTime
      if (!appointmentDate && patient.reassignedBilling && patient.reassignedBilling.length > 0) {
        const latestBill = patient.reassignedBilling[patient.reassignedBilling.length - 1];
        
        // Debug logging for appointment retrieval
        if (patient.name === 'Raghu' || patient.uhId === '2345009') {
          console.log('🔍 Checking billing for appointment:', {
            patientName: patient.name,
            patientId: patient._id,
            hasReassignedBilling: !!patient.reassignedBilling,
            billingLength: patient.reassignedBilling?.length,
            latestBill: latestBill,
            customData: latestBill?.customData,
            appointmentTimeInBill: latestBill?.appointmentTime,
            appointmentTimeInCustomData: latestBill?.customData?.appointmentTime,
            allBillFields: latestBill ? Object.keys(latestBill) : []
          });
        }
        
        if (latestBill.customData?.appointmentTime || latestBill.appointmentTime) {
          try {
            const billAppointmentDate = new Date(latestBill.customData?.appointmentTime || latestBill.appointmentTime);
            if (!isNaN(billAppointmentDate.getTime())) {
              appointmentDate = new Date(billAppointmentDate);
              appointmentDate.setHours(0, 0, 0, 0);
              
              if (patient.name === 'Raghu' || patient.uhId === '2345009') {
                console.log('✅ Found appointment in billing:', {
                  appointmentDate: appointmentDate.toString(),
                  appointmentDateNormalized: appointmentDate.toISOString()
                });
              }
            }
          } catch (e) {
            console.error('❌ Error parsing appointment date from billing:', e);
          }
        }
      }
      
      // Priority 4: Check regular billing records
      if (!appointmentDate && patient.billing && patient.billing.length > 0) {
        const latestBill = patient.billing[patient.billing.length - 1];
        if (latestBill.appointmentTime || latestBill.customData?.appointmentTime) {
          try {
            const billAppointmentDate = new Date(latestBill.appointmentTime || latestBill.customData?.appointmentTime);
            if (!isNaN(billAppointmentDate.getTime())) {
              appointmentDate = new Date(billAppointmentDate);
              appointmentDate.setHours(0, 0, 0, 0);
            }
          } catch (e) {
            // Invalid date
          }
        }
      }
      
      // If patient has a scheduled appointment, ONLY use appointment date for filtering
      // DO NOT fall back to assignment/reassignment date if appointment exists (even if in future)
      if (appointmentDate) {
        // Patient has a scheduled appointment - only show on that date
        const appointmentDateNormalized = new Date(appointmentDate);
        appointmentDateNormalized.setHours(0, 0, 0, 0);
        
        // Debug logging
        if (patient.name === 'Raghu' || patient.uhId === '2345009') {
          console.log('📅 Filtering decision for scheduled appointment:', {
            patientName: patient.name,
            appointmentDate: appointmentDateNormalized.toString(),
            today: today.toString(),
            dateFilter: dateFilter,
            appointmentMatchesToday: appointmentDateNormalized.getTime() === today.getTime(),
            willShow: dateFilter === 'scheduled' || dateFilter === 'today' 
              ? appointmentDateNormalized.getTime() === today.getTime()
              : true
          });
        }
        
        switch (dateFilter) {
          case 'scheduled':
          case 'today':
            // Only show if appointment date is exactly today
            return appointmentDateNormalized.getTime() === today.getTime();
          case 'last7days':
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            return appointmentDateNormalized >= sevenDaysAgo && appointmentDateNormalized <= today;
          case 'last30days':
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            return appointmentDateNormalized >= thirtyDaysAgo && appointmentDateNormalized <= today;
          default:
            return true;
        }
      }
      
      // Only fall back to assignment/reassignment date if NO scheduled appointment exists
      const relevantDate = patient.isReassigned && patient.lastReassignedAt 
        ? new Date(patient.lastReassignedAt)
        : patient.assignedAt 
          ? new Date(patient.assignedAt)
          : null;
      
      if (!relevantDate) return false; // Only show patients with a date
      
      // Normalize the date for comparison
      const relevantDateNormalized = new Date(relevantDate);
      relevantDateNormalized.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'scheduled':
        case 'today':
          return relevantDateNormalized.toDateString() === today.toDateString();
        case 'last7days':
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          return relevantDateNormalized >= sevenDaysAgo && relevantDateNormalized <= today;
        case 'last30days':
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          thirtyDaysAgo.setHours(0, 0, 0, 0);
          return relevantDateNormalized >= thirtyDaysAgo && relevantDateNormalized <= today;
        default:
          return true;
      }
    });

    // Filter by search term
    filtered = filtered.filter(patient =>
      patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.uhId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.assignedDoctor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Add appointment time to each patient for sorting
    const patientsWithAppointmentTime = filtered.map(patient => {
      // Find the earliest scheduled appointment (same logic as filtering)
      let appointmentTime = null;
      
      if (patient.appointments && patient.appointments.length > 0) {
        const allAppointments = patient.appointments.map(apt => {
          // For reassigned appointments, prefer confirmedDate/preferredDate with confirmedTime/preferredTime
          let dateField = null;
          let timeString = null;
          
          // For reassigned appointments, prefer confirmedDate/preferredDate with confirmedTime/preferredTime
          if (apt.reassignmentAppointment || apt.appointmentType === 'reassignment_consultation' || apt.type === 'reassignment_consultation') {
            if (apt.confirmedDate) {
              dateField = apt.confirmedDate;
              timeString = apt.confirmedTime;
            } else if (apt.preferredDate) {
              dateField = apt.preferredDate;
              timeString = apt.preferredTime;
            }
          }
          
          // Fallback to other date fields
          if (!dateField) {
            dateField = apt.confirmedDate || apt.preferredDate || apt.scheduledAt || apt.appointmentTime || apt.date;
            timeString = apt.confirmedTime || apt.preferredTime;
          }
          
          if (!dateField) return null;
          
          try {
            let aptDate = null;
            
            // If we have a date string (YYYY-MM-DD) and time string, combine them
            if (timeString && (dateField.includes('-') || dateField.match(/^\d{4}-\d{2}-\d{2}$/))) {
              // Parse time string (e.g., "04:30 PM" or "16:30")
              const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const ampm = timeMatch[3]?.toUpperCase();
                
                if (ampm === 'PM' && hours !== 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                
                aptDate = new Date(dateField);
                aptDate.setHours(hours, minutes, 0, 0);
              } else {
                aptDate = new Date(dateField);
              }
            } else {
              // Try parsing as ISO string or Date object
              aptDate = new Date(dateField);
            }
            
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
        }).filter(apt => apt !== null && apt._appointmentDate);
        
        if (allAppointments.length > 0) {
          // For reassigned patients, prioritize reassigned appointments (most recent first)
          // For regular patients, show earliest scheduled appointment
          const isReassigned = patient.isReassigned || patient.reassignmentHistory?.length > 0;
          
          if (isReassigned) {
            // Filter for reassigned appointments first
            const reassignedAppointments = allAppointments.filter(apt => 
              apt.reassignmentAppointment || 
              apt.appointmentType === 'reassignment_consultation' ||
              apt.type === 'reassignment_consultation'
            );
            
            if (reassignedAppointments.length > 0) {
              // Sort by date (most recent first) and take the latest reassigned appointment
              reassignedAppointments.sort((a, b) => {
                return b._appointmentDate.getTime() - a._appointmentDate.getTime();
              });
              appointmentTime = reassignedAppointments[0]._appointmentDate;
            } else {
              // No reassigned appointments found, use most recent appointment
              allAppointments.sort((a, b) => {
                return b._appointmentDate.getTime() - a._appointmentDate.getTime();
              });
              appointmentTime = allAppointments[0]._appointmentDate;
            }
          } else {
            // Regular patients: sort by date (earliest first)
            allAppointments.sort((a, b) => a._appointmentDate.getTime() - b._appointmentDate.getTime());
            appointmentTime = allAppointments[0]._appointmentDate;
          }
        }
      }
      
      // Priority 2: Fallback to patient.appointmentTime
      if (!appointmentTime && patient.appointmentTime) {
        try {
          const directAppointmentDate = new Date(patient.appointmentTime);
          if (!isNaN(directAppointmentDate.getTime())) {
            appointmentTime = directAppointmentDate;
          }
        } catch (e) {
          // Invalid date
        }
      }
      
      // Priority 3: Check reassignedBilling records
      if (!appointmentTime && patient.reassignedBilling && patient.reassignedBilling.length > 0) {
        const latestBill = patient.reassignedBilling[patient.reassignedBilling.length - 1];
        if (latestBill.customData?.appointmentTime || latestBill.appointmentTime) {
          try {
            const billAppointmentDate = new Date(latestBill.customData?.appointmentTime || latestBill.appointmentTime);
            if (!isNaN(billAppointmentDate.getTime())) {
              appointmentTime = billAppointmentDate;
            }
          } catch (e) {
            // Invalid date
          }
        }
      }
      
      // Priority 4: Check regular billing records
      if (!appointmentTime && patient.billing && patient.billing.length > 0) {
        const latestBill = patient.billing[patient.billing.length - 1];
        if (latestBill.appointmentTime || latestBill.customData?.appointmentTime) {
          try {
            const billAppointmentDate = new Date(latestBill.appointmentTime || latestBill.customData?.appointmentTime);
            if (!isNaN(billAppointmentDate.getTime())) {
              appointmentTime = billAppointmentDate;
            }
          } catch (e) {
            // Invalid date
          }
        }
      }
      
      return {
        ...patient,
        appointmentTime: appointmentTime
      };
    });

    // Sort by appointment time first (earliest first), then by assignment date
    patientsWithAppointmentTime.sort((a, b) => {
      // If both have appointment times, sort by time (earliest first - 9 AM before 10 AM)
      if (a.appointmentTime && b.appointmentTime) {
        return a.appointmentTime.getTime() - b.appointmentTime.getTime();
      }
      
      // If only one has appointment time, it comes first
      if (a.appointmentTime && !b.appointmentTime) {
        return -1;
      }
      if (!a.appointmentTime && b.appointmentTime) {
        return 1;
      }
      
      // If neither has appointment time, sort by most recently assigned/reassigned first
      const dateA = a.isReassigned && a.lastReassignedAt 
        ? new Date(a.lastReassignedAt)
        : new Date(a.assignedAt);
      const dateB = b.isReassigned && b.lastReassignedAt 
        ? new Date(b.lastReassignedAt)
        : new Date(b.assignedAt);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredPatients(patientsWithAppointmentTime);
  }, [searchTerm, assignedPatients, dateFilter]);

  const getGenderStats = () => {
    const maleCount = filteredPatients.filter(p => p?.gender === 'male').length;
    const femaleCount = filteredPatients.filter(p => p?.gender === 'female').length;
    const otherCount = filteredPatients.filter(p => p?.gender === 'other').length;
    return { maleCount, femaleCount, otherCount };
  };

  const genderStats = getGenderStats();

  // Pagination functions
  const getTotalPages = () => {
    return Math.ceil(filteredPatients.length / recordsPerPage);
  };

  const getCurrentData = () => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredPatients.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Reset pagination when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter]);

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'scheduled': return 'Scheduled for Today';
      case 'today': return 'Today';
      case 'last7days': return 'Last 7 Days';
      case 'last30days': return 'Last 30 Days';
      default: return 'All';
    }
  };

  const formatAssignmentDate = (patient) => {
    // First priority: Show scheduled appointment date/time if available
    // Use the same comprehensive logic as filtering to find appointments
    let scheduledAppointment = null;
    let appointmentDate = null;
    let appointmentTime = null;
    
    // Priority 1: Check appointments array
    if (patient.appointments && patient.appointments.length > 0) {
      // Get all appointments with any date field (don't filter by status)
      const allAppointments = patient.appointments.map(apt => {
        // For reassigned appointments, prefer confirmedDate/preferredDate with confirmedTime/preferredTime
        let dateField = null;
        let timeString = null;
        
        // For reassigned appointments, prefer confirmedDate/preferredDate with confirmedTime/preferredTime
        if (apt.reassignmentAppointment || apt.appointmentType === 'reassignment_consultation' || apt.type === 'reassignment_consultation') {
          if (apt.confirmedDate) {
            dateField = apt.confirmedDate;
            timeString = apt.confirmedTime;
          } else if (apt.preferredDate) {
            dateField = apt.preferredDate;
            timeString = apt.preferredTime;
          }
        }
        
        // Fallback to other date fields
        if (!dateField) {
          dateField = apt.confirmedDate || apt.preferredDate || apt.scheduledAt || apt.appointmentTime || apt.date;
          timeString = apt.confirmedTime || apt.preferredTime;
        }
        
        if (!dateField) return null;
        
        try {
          let aptDate = null;
          
          // If we have a date string (YYYY-MM-DD) and time string, combine them
          if (timeString && (dateField.includes('-') || dateField.match(/^\d{4}-\d{2}-\d{2}$/))) {
            // Parse time string (e.g., "04:30 PM" or "16:30")
            const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const ampm = timeMatch[3]?.toUpperCase();
              
              if (ampm === 'PM' && hours !== 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
              
              aptDate = new Date(dateField);
              aptDate.setHours(hours, minutes, 0, 0);
            } else {
              aptDate = new Date(dateField);
            }
          } else {
            // Try parsing as ISO string or Date object
            aptDate = new Date(dateField);
          }
          
          if (!isNaN(aptDate.getTime())) {
            return {
              ...apt,
              _appointmentDate: aptDate,
              _appointmentTime: timeString || apt.confirmedTime || apt.preferredTime
            };
          }
        } catch (e) {
          console.error('Error parsing appointment date:', e, apt);
        }
        return null;
      }).filter(apt => apt !== null && apt._appointmentDate);
      
      if (allAppointments.length > 0) {
        // For reassigned patients, prioritize reassigned appointments (most recent first)
        // For regular patients, show earliest scheduled appointment
        const isReassigned = patient.isReassigned || patient.reassignmentHistory?.length > 0;
        
        if (isReassigned) {
          // Filter for reassigned appointments first - this is critical for reassigned patients
          const reassignedAppointments = allAppointments.filter(apt => 
            apt.reassignmentAppointment === true || 
            apt.appointmentType === 'reassignment_consultation' ||
            apt.type === 'reassignment_consultation'
          );
          
          // Also check by invoiceNumber to identify reassigned appointments
          // Reassigned appointments should have an invoiceNumber from reassignment billing
          const reassignedByInvoice = allAppointments.filter(apt => 
            apt.invoiceNumber && !apt.reassignmentAppointment && 
            apt.appointmentType !== 'reassignment_consultation' && apt.type !== 'reassignment_consultation'
          );
          
          // Combine both filters (reassignedAppointments take priority)
          const finalReassignedAppointments = reassignedAppointments.length > 0 
            ? reassignedAppointments 
            : reassignedByInvoice;
          
          console.log('🔍 Checking appointments for reassigned patient:', {
            patientName: patient.name,
            patientUhId: patient.uhId,
            totalAppointments: allAppointments.length,
            reassignedAppointments: reassignedAppointments.length,
            reassignedByInvoice: reassignedByInvoice.length,
            finalReassignedAppointments: finalReassignedAppointments.length,
            allAppointmentsDetails: allAppointments.map(apt => ({
              appointmentType: apt.appointmentType,
              type: apt.type,
              reassignmentAppointment: apt.reassignmentAppointment,
              confirmedDate: apt.confirmedDate,
              confirmedTime: apt.confirmedTime,
              preferredDate: apt.preferredDate,
              preferredTime: apt.preferredTime,
              invoiceNumber: apt.invoiceNumber,
              scheduledAt: apt.scheduledAt,
              _appointmentDate: apt._appointmentDate?.toString()
            }))
          });
          
          if (finalReassignedAppointments.length > 0) {
            // Sort by date (most recent first) and take the latest reassigned appointment
            finalReassignedAppointments.sort((a, b) => {
              return b._appointmentDate.getTime() - a._appointmentDate.getTime();
            });
            scheduledAppointment = finalReassignedAppointments[0];
            console.log('✅ Selected reassigned appointment:', {
              appointmentType: scheduledAppointment.appointmentType,
              type: scheduledAppointment.type,
              reassignmentAppointment: scheduledAppointment.reassignmentAppointment,
              confirmedDate: scheduledAppointment.confirmedDate,
              confirmedTime: scheduledAppointment.confirmedTime,
              preferredDate: scheduledAppointment.preferredDate,
              preferredTime: scheduledAppointment.preferredTime,
              invoiceNumber: scheduledAppointment.invoiceNumber,
              _appointmentDate: scheduledAppointment._appointmentDate?.toString()
            });
          } else {
            // No reassigned appointments found in appointments array
            // This shouldn't happen - log warning and don't use old appointment
            console.warn('⚠️ No reassigned appointments found in appointments array for:', patient.name);
            console.warn('   Available appointments:', allAppointments.map(apt => ({
              appointmentType: apt.appointmentType,
              type: apt.type,
              reassignmentAppointment: apt.reassignmentAppointment,
              invoiceNumber: apt.invoiceNumber
            })));
            // Set to null so we check billing records instead
            scheduledAppointment = null;
          }
        } else {
          // Regular patients: sort by date (earliest first)
          allAppointments.sort((a, b) => a._appointmentDate.getTime() - b._appointmentDate.getTime());
          scheduledAppointment = allAppointments[0];
        }
        
        if (scheduledAppointment) {
          appointmentDate = scheduledAppointment._appointmentDate;
          // Prioritize the stored time string from the appointment
          appointmentTime = scheduledAppointment._appointmentTime || scheduledAppointment.confirmedTime || scheduledAppointment.preferredTime;
          
          // Debug logging for reassigned patients
          if (patient.isReassigned || patient.reassignmentHistory?.length > 0) {
            console.log('📅 formatAssignmentDate - Found appointment for reassigned patient:', {
              patientName: patient.name,
              patientUhId: patient.uhId,
              reassignmentAppointment: scheduledAppointment.reassignmentAppointment,
              appointmentType: scheduledAppointment.appointmentType,
              type: scheduledAppointment.type,
              confirmedDate: scheduledAppointment.confirmedDate,
              confirmedTime: scheduledAppointment.confirmedTime,
              preferredDate: scheduledAppointment.preferredDate,
              preferredTime: scheduledAppointment.preferredTime,
              scheduledAt: scheduledAppointment.scheduledAt,
              invoiceNumber: scheduledAppointment.invoiceNumber,
              appointmentDate: appointmentDate?.toString(),
              appointmentTime: appointmentTime,
              createdAt: scheduledAppointment.createdAt
            });
          }
        }
      }
    }
    
    // Priority 2: Check patient.appointmentTime directly
    if (!appointmentDate && patient.appointmentTime) {
      try {
        const directAppointmentDate = new Date(patient.appointmentTime);
        if (!isNaN(directAppointmentDate.getTime())) {
          appointmentDate = directAppointmentDate;
        }
      } catch (e) {
        // Invalid date
      }
    }
    
    // Priority 3: Check reassignedBilling records for appointmentTime
    if (!appointmentDate && patient.reassignedBilling && patient.reassignedBilling.length > 0) {
      const latestBill = patient.reassignedBilling[patient.reassignedBilling.length - 1];
      
      // Debug logging for display
      if (patient.name === 'Raghu' || patient.uhId === '2345009') {
        console.log('🔍 formatAssignmentDate - Checking billing:', {
          patientName: patient.name,
          latestBill: latestBill,
          customData: latestBill?.customData,
          appointmentTimeInBill: latestBill?.appointmentTime,
          appointmentTimeInCustomData: latestBill?.customData?.appointmentTime
        });
      }
      
      if (latestBill.customData?.appointmentTime || latestBill.appointmentTime) {
        try {
          const billAppointmentDate = new Date(latestBill.customData?.appointmentTime || latestBill.appointmentTime);
          if (!isNaN(billAppointmentDate.getTime())) {
            appointmentDate = billAppointmentDate;
            
            // Try to get formatted time from customData if available
            if (latestBill.customData?.appointmentTimeFormatted) {
              appointmentTime = latestBill.customData.appointmentTimeFormatted;
            } else if (latestBill.customData?.appointmentDate) {
              // Use appointmentDate with time extracted from appointmentTime
              const timeStr = billAppointmentDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              appointmentTime = timeStr;
            }
            
            if (patient.name === 'Raghu' || patient.name === 'Naidu') {
              console.log('✅ formatAssignmentDate - Found appointment from billing:', {
                appointmentDate: appointmentDate.toString(),
                appointmentTime: appointmentTime,
                customData: latestBill.customData
              });
            }
          }
        } catch (e) {
          if (patient.name === 'Raghu' || patient.name === 'Naidu') {
            console.error('❌ formatAssignmentDate - Error parsing date:', e);
          }
        }
      }
    }
    
    // Priority 4: Check regular billing records
    if (!appointmentDate && patient.billing && patient.billing.length > 0) {
      const latestBill = patient.billing[patient.billing.length - 1];
      if (latestBill.appointmentTime || latestBill.customData?.appointmentTime) {
        try {
          const billAppointmentDate = new Date(latestBill.appointmentTime || latestBill.customData?.appointmentTime);
          if (!isNaN(billAppointmentDate.getTime())) {
            appointmentDate = billAppointmentDate;
          }
        } catch (e) {
          // Invalid date
        }
      }
    }
    
    // If we found a scheduled appointment, show it with time
    if (appointmentDate) {
      // If we have a scheduledAppointment object, use its date/time strings directly for better accuracy
      if (scheduledAppointment) {
        // Use confirmedDate/confirmedTime or preferredDate/preferredTime if available
        const displayDate = scheduledAppointment.confirmedDate || scheduledAppointment.preferredDate;
        const displayTime = scheduledAppointment.confirmedTime || scheduledAppointment.preferredTime;
        
        if (displayDate && displayTime) {
          // Parse and format the date
          const dateObj = new Date(displayDate);
          const formattedDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          return `${formattedDate} at ${displayTime} (Appointment)`;
        }
      }
      
      // Fallback: use appointmentDate and appointmentTime
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      // Format time - use appointmentTime if available, otherwise extract from date
      let formattedTime = '';
      if (appointmentTime) {
        formattedTime = appointmentTime;
      } else {
        // Extract time from date object
        formattedTime = appointmentDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      
      return `${formattedDate} at ${formattedTime} (Appointment)`;
    }
    
    // Fallback: For reassigned patients, show lastReassignedAt; for regular patients, show assignedAt
    const dateString = patient.isReassigned && patient.lastReassignedAt 
      ? patient.lastReassignedAt
      : patient.assignedAt;
    
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Add indicator for reassigned patients
    if (patient.isReassigned) {
      return `${formattedDate} (Reassigned)`;
    }
    
    return formattedDate;
  };

  // Function to get consultation fee status display (simplified - only show paid/unpaid)
  const getConsultationFeeStatus = (patient) => {
    // Check for cancelled bills first
    const hasCancelledReassignmentBill = patient.reassignedBilling && 
      patient.reassignedBilling.some(bill => bill.status === 'cancelled');
    const hasCancelledRegularBill = patient.billing && 
      patient.billing.some(bill => bill.status === 'cancelled');
    
    if (hasCancelledReassignmentBill || hasCancelledRegularBill) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-red-600 font-medium">Bill Cancelled</span>
        </div>
      );
    }

    if (!patient.billing || patient.billing.length === 0) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-red-600 font-medium">Not Paid</span>
        </div>
      );
    }

    const consultationFee = patient.billing.find(bill => 
      bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')
    );

    if (!consultationFee) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-red-600 font-medium">Not Paid</span>
        </div>
      );
    }

    if (consultationFee.status === 'paid' || consultationFee.status === 'completed') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-green-600 font-medium">Paid</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="text-xs text-orange-600 font-medium">Pending</span>
        </div>
      );
    }
  };

  // Handle viewing a patient - just navigate without marking as viewed
  const handleViewPatient = (patientId) => {
    navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${patientId}`);
  };

  // Handle marking patient as viewed
  const handleMarkAsViewed = async (patientId) => {
    try {
      await markPatientAsViewed(patientId);
      toast.success('Patient marked as viewed');
      
      // Refresh the patient list to update the view
      dispatch(fetchAssignedPatients());
      
      // Also refresh receptionist data to update the scheduled color
      // This will be handled by the backend when the patient is marked as viewed
      
    } catch (error) {
      console.error('Error marking patient as viewed:', error);
      toast.error('Failed to mark patient as viewed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-md font-bold text-slate-800 mb-2 text-center sm:text-left">
            Scheduled Patients
          </h1>
          <p className="text-slate-600 text-xs text-center sm:text-left">
            View patients scheduled for today and check consultation payment status
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 mb-6">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, email, phone, UH ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
                  >
                    <option value="scheduled">Scheduled for Today</option>
                    <option value="today">Today</option>
                    <option value="last7days">Last 7 Days</option>
                    <option value="last30days">Last 30 Days</option>
                  </select>
                </div>
                
                <button
                  onClick={() => dispatch(fetchAssignedPatients())}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 text-xs"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">Total Assigned</p>
                <p className="text-sm font-bold text-slate-800">{filteredPatients.length}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">Filter Period</p>
                <p className="text-sm font-bold text-slate-800">{getDateFilterLabel()}</p>
              </div>
              <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">Male Patients</p>
                <p className="text-sm font-bold text-slate-800">{genderStats.maleCount}</p>
              </div>
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">Female Patients</p>
                <p className="text-sm font-bold text-slate-800">{genderStats.femaleCount}</p>
              </div>
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">With Contact</p>
                <p className="text-sm font-bold text-slate-800">
                  {filteredPatients.filter(p => p?.phone || p?.contact || p?.email).length}
                </p>
              </div>
              <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100">
          <div className="p-4 sm:p-6 border-b border-blue-100">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center justify-center sm:justify-start">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
              {getDateFilterLabel()} - {filteredPatients.length} patients
            </h2>
            <p className="text-slate-600 mt-1 text-xs text-center sm:text-left">
              {dateFilter === 'scheduled' 
                ? 'All patients scheduled for today (assigned and reassigned)'
                : `${filteredPatients.length} patients in the selected period`
              }
            </p>
          </div>
          
          {/* Mobile Card View */}
          <div className="block lg:hidden p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600 text-xs">Loading patients...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 text-xs">
                  {searchTerm 
                    ? 'No patients found matching your search.' 
                    : dateFilter === 'scheduled' 
                      ? 'No patients scheduled for today (assigned or reassigned).' 
                      : `No patients found for ${getDateFilterLabel().toLowerCase()}.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {getCurrentData().map((patient, index) => {
                  const globalIndex = (currentPage - 1) * recordsPerPage + index;
                  return (
                  <div key={patient?._id || index} className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800 text-sm">{patient?.name || 'N/A'}</h3>
                          {(patient?.isReassigned || patient?.appointmentStatus === 'reassigned') && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Reassigned
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs">#{globalIndex + 1}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        patient?.gender === 'male' ? 'bg-blue-100 text-blue-700' :
                        patient?.gender === 'female' ? 'bg-pink-100 text-pink-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {patient?.gender || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-700 text-xs font-medium">{patient?.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <Phone className="h-4 w-4 text-green-500" />
                        <span className="text-slate-700 text-xs font-medium">{patient?.phone || patient?.contact || 'No phone'}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <User className="h-4 w-4 text-indigo-500" />
                        <span className="text-slate-700 text-xs font-medium">{patient?.age || 'N/A'} years</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <MapPin className="h-4 w-4 text-purple-500" />
                        <span className="text-slate-700 text-xs font-medium">UH ID: {patient?.uhId || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <span className="text-slate-700 text-xs font-medium">
                        {patient?.isReassigned ? 'Reassigned' : 'Assigned'}: {formatAssignmentDate(patient)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        {getConsultationFeeStatus(patient)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className={`text-xs font-medium ${
                        formatRemainingTime(patient).includes('Expired') 
                          ? 'text-red-600' 
                          : 'text-slate-700'
                      }`}>
                        {formatRemainingTime(patient)}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t border-slate-200">
                      {(() => {
                        // Check for cancelled bills first
                        const hasCancelledReassignmentBill = patient.reassignedBilling && 
                          patient.reassignedBilling.some(bill => bill.status === 'cancelled');
                        const hasCancelledRegularBill = patient.billing && 
                          patient.billing.some(bill => bill.status === 'cancelled');
                        const isCancelled = hasCancelledReassignmentBill || hasCancelledRegularBill;
                        
                        if (isCancelled) {
                          return (
                            <button
                              disabled
                              className="flex-1 bg-red-50 text-red-500 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                              title="Bill cancelled - actions locked"
                            >
                              <Lock className="h-4 w-4" />
                              Bill Cancelled
                            </button>
                          );
                        }
                        
                        const hasConsultationFee = patient.billing && patient.billing.some(bill => 
                          bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')
                        );
                        const hasPaidConsultationFee = hasConsultationFee && patient.billing.some(bill => 
                          (bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')) && 
                          (bill.status === 'paid' || bill.status === 'completed')
                        );
                        
                        if (hasPaidConsultationFee) {
                          return (
                            <button
                              onClick={() => {
                                if (patient?._id) {
                                  handleViewPatient(patient._id);
                                } else {
                                  alert('Patient ID not found. Please refresh the page and try again.');
                                }
                              }}
                              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          );
                        } else {
                          return (
                            <button
                              onClick={() => {
                                alert('This patient has not paid the consultation fee yet. Please contact the receptionist to collect the fee before viewing the patient.');
                              }}
                              className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <Lock className="h-4 w-4" />
                              Fee Required
                            </button>
                          );
                        }
                      })()}
                      <button
                        onClick={() => {
                          if (patient?._id) {
                            handleMarkAsViewed(patient._id);
                          } else {
                            alert('Patient ID not found. Please refresh the page and try again.');
                          }
                        }}
                        className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark Viewed
                      </button>
                      {canDoctorEditPatient(patient, user).canEdit ? (
                        <button
                          onClick={() => navigate(`/dashboard/Doctor/patients/EditPatient/${patient?._id}`)}
                          className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 bg-gray-50 text-gray-400 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                          title={canDoctorEditPatient(patient, user).reason}
                        >
                          <Clock className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600 text-xs">Loading patients...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 text-xs">
                  {searchTerm 
                    ? 'No patients found matching your search.' 
                    : dateFilter === 'scheduled' 
                      ? 'No patients scheduled for today (assigned or reassigned).' 
                      : `No patients found for ${getDateFilterLabel().toLowerCase()}.`
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Age/Gender
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        UH ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Appointment Date / Assigned Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Consultation Fee
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Edit Time Remaining
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {getCurrentData().map((patient, index) => {
                      const globalIndex = (currentPage - 1) * recordsPerPage + index;
                      return (
                      <tr key={patient?._id || index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-800 text-xs">{patient?.name || 'N/A'}</div>
                              {(patient?.isReassigned || patient?.appointmentStatus === 'reassigned') && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  Reassigned
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">#{globalIndex + 1}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {patient?.email && (
                              <div className="flex items-center text-xs text-slate-600">
                                <Mail className="h-3 w-3 mr-2" />
                                {patient.email}
                              </div>
                            )}
                            {(patient?.phone || patient?.contact) && (
                              <div className="flex items-center text-xs text-slate-600">
                                <Phone className="h-3 w-3 mr-2" />
                                {patient.phone || patient.contact}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-slate-800">{patient?.age || 'N/A'} years</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              patient?.gender === 'male' ? 'bg-blue-100 text-blue-700' :
                              patient?.gender === 'female' ? 'bg-pink-100 text-pink-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {patient?.gender || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-xs text-slate-600">
                            <MapPin className="h-3 w-3 mr-2" />
                            {patient?.uhId || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-slate-600">
                              {formatAssignmentDate(patient)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getConsultationFeeStatus(patient)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-red-500" />
                            <span className={`text-xs font-medium ${
                              formatRemainingTime(patient).includes('Expired') 
                                ? 'text-red-600' 
                                : 'text-slate-600'
                            }`}>
                              {formatRemainingTime(patient)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              // Check for cancelled bills first
                              const hasCancelledReassignmentBill = patient.reassignedBilling && 
                                patient.reassignedBilling.some(bill => bill.status === 'cancelled');
                              const hasCancelledRegularBill = patient.billing && 
                                patient.billing.some(bill => bill.status === 'cancelled');
                              const isCancelled = hasCancelledReassignmentBill || hasCancelledRegularBill;
                              
                              if (isCancelled) {
                                return (
                                  <button
                                    disabled
                                    className="text-red-400 p-1 rounded cursor-not-allowed"
                                    title="Bill cancelled - actions locked"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </button>
                                );
                              }
                              
                              const hasConsultationFee = patient.billing && patient.billing.some(bill => 
                                bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')
                              );
                              const hasPaidConsultationFee = hasConsultationFee && patient.billing.some(bill => 
                                (bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')) && 
                                (bill.status === 'paid' || bill.status === 'completed')
                              );
                              
                              if (hasPaidConsultationFee) {
                                return (
                                  <button
                                    onClick={() => {
                                      if (patient?._id) {
                                        handleViewPatient(patient._id);
                                      } else {
                                        alert('Patient ID not found. Please refresh the page and try again.');
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                                    title="View Profile"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={() => {
                                      alert('This patient has not paid the consultation fee yet. Please contact the receptionist to collect the fee before viewing the patient.');
                                    }}
                                    className="text-gray-400 hover:text-gray-500 p-1 rounded transition-colors"
                                    title="Consultation fee not paid - Contact receptionist"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </button>
                                );
                              }
                            })()}
                            <button
                              onClick={() => {
                                if (patient?._id) {
                                  handleMarkAsViewed(patient._id);
                                } else {
                                  alert('Patient ID not found. Please refresh the page and try again.');
                                }
                              }}
                              className="text-orange-600 hover:text-orange-700 p-1 rounded transition-colors"
                              title="Mark as Viewed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            {canDoctorEditPatient(patient, user).canEdit ? (
                              <button
                                onClick={() => navigate(`/dashboard/Doctor/patients/EditPatient/${patient?._id}`)}
                                className="text-green-600 hover:text-green-700 p-1 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="text-gray-400 p-1 rounded cursor-not-allowed"
                                title={canDoctorEditPatient(patient, user).reason}
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {filteredPatients.length > 0 && (
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredPatients.length)} of {filteredPatients.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={recordsPerPage}
                      onChange={(e) => handleRecordsPerPageChange(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-sm text-gray-600">per page</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {getTotalPages()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      Previous
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(currentPage)}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white border border-blue-600"
                    >
                      {currentPage}
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === getTotalPages()}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
