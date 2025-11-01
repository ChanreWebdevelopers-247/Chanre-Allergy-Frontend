import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAssignedPatients } from "../../../features/doctor/doctorThunks";
import { useNavigate } from "react-router-dom";
import { canDoctorEditPatient, formatRemainingTime } from "../../../utils/patientPermissions";
import { toast } from "react-toastify";
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Mail,
  Phone,
  User,
  Calendar,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Clock,
  Lock,
  Filter,
  X,
  ChevronDown,
  DollarSign,
  UserPlus
} from 'lucide-react';
import API from '../../../services/api';

export default function PatientList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(4);
  
  // Sub-search states
  const [subSearchTerm, setSubSearchTerm] = useState('');
  const [showSubSearch, setShowSubSearch] = useState(false);
  const [finalFilteredPatients, setFinalFilteredPatients] = useState([]);
  const [searchField, setSearchField] = useState('all'); // all, name, email, phone, uhId, address

  const { assignedPatients = [], loading } = useSelector((state) => state.doctor);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchAssignedPatients());
  }, [dispatch]);

  // Filter patients based on search term (show all assigned patients)
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today for date comparison
    
    const filtered = (assignedPatients || []).filter(patient => {
      // Check if patient has a scheduled appointment
      const scheduledAppointment = patient.appointments?.length > 0 
        ? patient.appointments
            .filter(apt => apt.status === 'scheduled' && (apt.type === 'reassignment_consultation' || !apt.type))
            .sort((a, b) => new Date(b.scheduledAt || b.createdAt) - new Date(a.scheduledAt || a.createdAt))[0]
        : null;
      
      // If patient has a scheduled appointment, only show if appointment date has arrived
      if (scheduledAppointment && scheduledAppointment.scheduledAt) {
        const appointmentDate = new Date(scheduledAppointment.scheduledAt);
        appointmentDate.setHours(0, 0, 0, 0);
        
        // Only show if appointment date is today or in the past
        if (appointmentDate > now) {
          return false; // Hide patient if appointment is in the future
        }
      }
      
      // Apply search filter only
      const matchesSearch = !searchTerm || 
        patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient?.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient?.uhId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient?.assignedDoctor?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    // Process patients to identify reassigned patients
    const processedPatients = filtered.map(patient => {
      // Check if patient has billing records for different doctors (indicating reassignment)
      const currentDoctorId = patient.assignedDoctor?._id || patient.assignedDoctor;
      const hasBillingForDifferentDoctor = patient.billing && patient.billing.some(bill => {
        const hasDoctorId = bill.doctorId && bill.doctorId.toString();
        return hasDoctorId && bill.doctorId.toString() !== currentDoctorId?.toString();
      });
      
      // Check if patient has multiple consultation fees (indicating reassignment)
      const consultationFees = patient.billing?.filter(bill => 
        bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')
      ) || [];
      const hasMultipleConsultationFees = consultationFees.length > 1;
      
      // Check if this patient was previously reassigned (has reassignment marker in localStorage)
      const reassignmentKey = `reassigned_${patient._id}`;
      const wasPreviouslyReassigned = localStorage.getItem(reassignmentKey) === 'true';
      
      const isReassignedPatient = hasBillingForDifferentDoctor || hasMultipleConsultationFees || wasPreviouslyReassigned;
      
      // Get scheduled appointment time for sorting
      const scheduledAppointment = patient.appointments?.length > 0 
        ? patient.appointments
            .filter(apt => apt.status === 'scheduled' && (apt.type === 'reassignment_consultation' || !apt.type))
            .sort((a, b) => new Date(b.scheduledAt || b.createdAt) - new Date(a.scheduledAt || a.createdAt))[0]
        : null;
      const appointmentTime = scheduledAppointment?.scheduledAt ? new Date(scheduledAppointment.scheduledAt) : null;
      
      return {
        ...patient,
        isReassignedPatient: isReassignedPatient,
        appointmentTime: appointmentTime // Store appointment time for sorting
      };
    });

    // Sort patients by appointment time (earliest first)
    // Patients with appointments come first, sorted by time
    // Patients without appointments come after, sorted by name or assigned date
    const sortedPatients = processedPatients.sort((a, b) => {
      // If both have appointment times, sort by time (earliest first)
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
      
      // If neither has appointment time, sort by name
      return (a.name || '').localeCompare(b.name || '');
    });

    setFilteredPatients(sortedPatients);
    
    // Show sub-search if we have results and a search term
    setShowSubSearch(sortedPatients.length > 0 && searchTerm.trim() !== '');
  }, [searchTerm, assignedPatients]);

  // Apply sub-search filter on the already filtered patients
  useEffect(() => {
    if (!showSubSearch || subSearchTerm.trim() === '') {
      setFinalFilteredPatients(filteredPatients);
      return;
    }

    const subFiltered = filteredPatients.filter(patient => {
      const term = subSearchTerm.toLowerCase();
      
      switch (searchField) {
        case 'name':
          return patient?.name?.toLowerCase().includes(term);
        case 'email':
          return patient?.email?.toLowerCase().includes(term);
        case 'phone':
          return patient?.phone?.toLowerCase().includes(term) || 
                 patient?.contact?.toLowerCase().includes(term);
        case 'uhId':
          return patient?.uhId?.toLowerCase().includes(term);
        case 'address':
          return patient?.address?.toLowerCase().includes(term);
        case 'doctor':
          return patient?.assignedDoctor?.name?.toLowerCase().includes(term);
        default: // 'all'
          return patient?.name?.toLowerCase().includes(term) ||
                 patient?.email?.toLowerCase().includes(term) ||
                 patient?.phone?.toLowerCase().includes(term) ||
                 patient?.contact?.toLowerCase().includes(term) ||
                 patient?.uhId?.toLowerCase().includes(term) ||
                 patient?.address?.toLowerCase().includes(term) ||
                 patient?.assignedDoctor?.name?.toLowerCase().includes(term);
      }
    });
    
    setFinalFilteredPatients(subFiltered);
    setCurrentPage(1); // Reset to first page when sub-search changes
  }, [filteredPatients, subSearchTerm, searchField, showSubSearch]);

  // Doctors typically can't delete patients - this functionality is removed

  const getGenderStats = () => {
    const maleCount = (assignedPatients || []).filter(p => p?.gender === 'male').length;
    const femaleCount = (assignedPatients || []).filter(p => p?.gender === 'female').length;
    const otherCount = (assignedPatients || []).filter(p => p?.gender === 'other').length;
    return { maleCount, femaleCount, otherCount };
  };

  const genderStats = getGenderStats();

  // Pagination functions
  const getTotalPages = () => {
    return Math.ceil(finalFilteredPatients.length / recordsPerPage);
  };

  const getCurrentData = () => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return finalFilteredPatients.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
  };

  // Clear search functions
  const clearAllSearches = () => {
    setSearchTerm('');
    setSubSearchTerm('');
    setShowSubSearch(false);
    setSearchField('all');
    setCurrentPage(1);
  };

  const clearSubSearch = () => {
    setSubSearchTerm('');
    setSearchField('all');
  };

  // Handle viewing a patient - just navigate without marking as viewed
  const handleViewPatient = (patientId) => {
    navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${patientId}`);
  };

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle assigning doctor to patient
  const handleAssignDoctor = async (patientId) => {
    if (!user || !user._id || !patientId) {
      toast.error('Unable to assign doctor. Please try again.');
      return;
    }

    try {
      const response = await API.put(`/patients/${patientId}`, {
        assignedDoctor: user._id
      });

      if (response.status === 200) {
        toast.success('Successfully assigned as doctor to this patient!');
        // Refresh patient list
        dispatch(fetchAssignedPatients());
      } else {
        toast.error(response.data?.message || 'Failed to assign doctor');
      }
    } catch (error) {
      toast.error('Failed to assign doctor. Please try again.');
    }
  };

  // Function to get consultation fee status display
  const getConsultationFeeStatus = (patient) => {
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
      const paidDate = new Date(consultationFee.paidAt || consultationFee.createdAt);
      const formattedDate = paidDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const formattedTime = paidDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 font-medium">Paid</span>
          </div>
          <div className="text-xs text-slate-500">
            ₹{consultationFee.amount}
          </div>
          <div className="text-xs text-slate-500">
            {formattedDate} {formattedTime}
          </div>
          {consultationFee.paidBy && (
            <div className="text-xs text-slate-500">
              by {consultationFee.paidBy}
            </div>
          )}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-md font-bold text-slate-800 mb-2 text-center sm:text-left">
            Patient List
          </h1>
          <p className="text-slate-600 text-xs text-center sm:text-left">
            View and manage your assigned patients
          </p>
        </div>

        {/* Search and Add Button */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 mb-6">
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Primary Search */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patients by name, email, phone, UH ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearAllSearches}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => navigate('/dashboard/Doctor/patients/AddPatient')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 w-full sm:w-auto justify-center text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add Patient
                </button>
              </div>

              {/* Sub-search (appears when primary search has results) */}
              {showSubSearch && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Refine search in {filteredPatients.length} results
                    </span>
                    <button
                      onClick={() => setShowSubSearch(false)}
                      className="ml-auto text-blue-400 hover:text-blue-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <select
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
                      >
                        <option value="all">All Fields</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="uhId">UH ID</option>
                        <option value="address">Address</option>
                        <option value="doctor">Assigned Doctor</option>
                      </select>
                    </div>
                    
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                      <input
                        type="text"
                        placeholder={`Search in ${searchField === 'all' ? 'all fields' : searchField}...`}
                        value={subSearchTerm}
                        onChange={(e) => setSubSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
                      />
                      {subSearchTerm && (
                        <button
                          onClick={clearSubSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {subSearchTerm && (
                    <div className="mt-2 text-xs text-blue-600">
                      Found {finalFilteredPatients.length} results in {filteredPatients.length} primary results
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">Total Patients</p>
                <p className="text-sm font-bold text-slate-800">{(assignedPatients || []).length}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
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
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">With Email</p>
                <p className="text-sm font-bold text-slate-800">
                  {(assignedPatients || []).filter(p => p?.email).length}
                </p>
              </div>
              <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs font-medium">With Phone</p>
                <p className="text-sm font-bold text-slate-800">
                  {(assignedPatients || []).filter(p => p?.phone || p?.contact).length}
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
              Patients List
            </h2>
            <p className="text-slate-600 mt-1 text-xs text-center sm:text-left">
              {finalFilteredPatients.length} of {(assignedPatients || []).length} patients
              {showSubSearch && subSearchTerm && (
                <span className="text-blue-600 ml-2">
                  (filtered from {filteredPatients.length} results)
                </span>
              )}
            </p>
          </div>
          
          {/* Mobile Card View */}
          <div className="block lg:hidden p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600 text-xs">Loading patients...</p>
              </div>
            ) : finalFilteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 text-xs">
                  {searchTerm ? (
                    subSearchTerm ? 
                      'No patients found matching your refined search.' : 
                      'No patients found matching your search.'
                  ) : 'No patients found.'}
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
                          {patient?.isReassignedPatient && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-medium rounded-full flex items-center gap-1">
                              <UserPlus className="h-3 w-3" />
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
                      <Users className="h-4 w-4 text-orange-500" />
                      <span className="text-slate-700 text-xs font-medium">
                        Dr. {patient?.assignedDoctor?.name || 'Not assigned'}
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
                      {/* Delete button removed - doctors can't delete patients */}
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
            ) : finalFilteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 text-xs">
                  {searchTerm ? (
                    subSearchTerm ? 
                      'No patients found matching your refined search.' : 
                      'No patients found matching your search.'
                  ) : 'No patients found.'}
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
                        Assigned Doctor
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
                            <div className="font-semibold text-slate-800 text-xs">{patient?.name || 'N/A'}</div>
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
                            <span className="text-xs text-slate-600">
                              {patient?.assignedDoctor?.name || 'Not assigned'}
                            </span>
                            {!patient?.assignedDoctor && user && (
                              <button
                                onClick={() => handleAssignDoctor(patient._id)}
                                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                                title="Assign yourself to this patient"
                              >
                                Assign Me
                              </button>
                            )}
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
                            {/* Delete button removed - doctors can't delete patients */}
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
          {finalFilteredPatients.length > 0 && (
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, finalFilteredPatients.length)} of {finalFilteredPatients.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={recordsPerPage}
                      onChange={(e) => handleRecordsPerPageChange(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
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
