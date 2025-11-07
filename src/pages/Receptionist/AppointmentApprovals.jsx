import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getCenterAppointments, 
  updateAppointmentStatus,
  updateAppointmentDetails 
} from '../../services/api';
import { SERVER_CONFIG } from '../../config/environment';

const AppointmentApprovals = () => {
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // Only show pending by default
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    confirmedDate: '',
    confirmedTime: '',
    notes: ''
  });

  // Time slots for appointment scheduling
  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'
  ];

  const [availableTimeSlots, setAvailableTimeSlots] = useState(timeSlots);

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

  const combineDateAndTime = (dateStr, slot) => {
    if (!dateStr || !slot) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if ([year, month, day].some(Number.isNaN)) return null;

    const [time, meridiem] = slot.split(' ');
    if (!time || !meridiem) return null;

    let [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    }

    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const getFilteredSlotsForDate = (dateStr) => {
    if (!dateStr) return timeSlots;
    if (!isDateToday(dateStr)) return timeSlots;

    const now = new Date();
    return timeSlots.filter((slot) => {
      const slotDate = combineDateAndTime(dateStr, slot);
      return slotDate && slotDate > now;
    });
  };
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('bookedAt');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Search states
  const [primarySearch, setPrimarySearch] = useState('');
  const [secondarySearch, setSecondarySearch] = useState('');

  // Get center ID from user data
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const centerId = user.centerId ? (typeof user.centerId === 'object' ? user.centerId._id || user.centerId.toString() : user.centerId) : null;

  useEffect(() => {
    if (centerId) {
      fetchAppointments();
    }
  }, [centerId]);

  // Search function
  const searchAppointments = (appointments, searchTerm) => {
    if (!searchTerm.trim()) return appointments;
    
    const searchLower = searchTerm.toLowerCase();
    return appointments.filter(appointment => {
      return (
        appointment.patientName?.toLowerCase().includes(searchLower) ||
        appointment.patientEmail?.toLowerCase().includes(searchLower) ||
        appointment.patientPhone?.includes(searchTerm) ||
        appointment.confirmationCode?.includes(searchTerm) ||
        appointment.appointmentType?.toLowerCase().includes(searchLower) ||
        appointment.reasonForVisit?.toLowerCase().includes(searchLower) ||
        appointment.centerName?.toLowerCase().includes(searchLower)
      );
    });
  };

  // Filter appointments based on current filter
  const filteredAppointments = allAppointments.filter(appointment => {
    if (filter === 'all') return true;
    return appointment.status === filter;
  });

  // Apply primary search
  const primarySearchResults = searchAppointments(filteredAppointments, primarySearch);
  
  // Apply secondary search within primary results
  const finalAppointments = searchAppointments(primarySearchResults, secondarySearch);

  // Sort appointments
  const sortedAppointments = [...finalAppointments].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (sortField === 'bookedAt') {
      aValue = a.bookedAt || a.createdAt || a.preferredDate;
      bValue = b.bookedAt || b.createdAt || b.preferredDate;
    }
    
    if (sortField === 'preferredDate' || sortField === 'createdAt' || sortField === 'bookedAt') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }
    
    // Handle string sorting
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      if (aValue === bValue) return 0;
      return aValue > bValue ? 1 : -1;
    } else {
      if (aValue === bValue) return 0;
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const appointments = sortedAppointments.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      // Fetch all appointments by not passing status parameter
      const response = await getCenterAppointments(centerId);
      if (response.success) {
        setAllAppointments(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch appointment requests');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appointmentId, appointment) => {
    // Directly approve the appointment using preferred date/time
    try {
      setUpdateLoading(true);
      const response = await updateAppointmentDetails(appointment._id, {
        confirmedDate: new Date(appointment.preferredDate).toISOString(),
        confirmedTime: appointment.preferredTime,
        notes: appointment.notes || '',
        status: 'confirmed'
      });
      
      if (response.success) {
        toast.success('Appointment approved successfully!');
        setFilter('confirmed');
        setCurrentPage(1);
        fetchAppointments();
      }
    } catch (error) {
      toast.error('Failed to approve appointment');
      console.error('Error approving appointment:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDirectApprove = async () => {
    if (!editFormData.confirmedDate || !editFormData.confirmedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const appointmentDateTime = combineDateAndTime(editFormData.confirmedDate, editFormData.confirmedTime);
    if (!appointmentDateTime || appointmentDateTime <= new Date()) {
      toast.error('Selected appointment date and time must be in the future');
      return;
    }

    try {
      setEditLoading(true);
      const response = await updateAppointmentDetails(selectedAppointment._id, {
        confirmedDate: new Date(editFormData.confirmedDate).toISOString(),
        confirmedTime: editFormData.confirmedTime,
        notes: editFormData.notes,
        status: 'confirmed'
      });
      
      if (response.success) {
        toast.success('Appointment approved successfully!');
        setFilter('confirmed');
        setCurrentPage(1);
        closeEditModal();
        fetchAppointments();
      }
    } catch (error) {
      toast.error('Failed to approve appointment');
      console.error('Error approving appointment:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleReject = async (appointmentId) => {
    try {
      setUpdateLoading(true);
      const response = await updateAppointmentStatus(appointmentId, 'cancelled');
      if (response.success) {
        toast.success('Appointment rejected');
        setShowModal(false);
        setSelectedAppointment(null);
        fetchAppointments();
      }
    } catch (error) {
      toast.error('Failed to reject appointment');
      console.error('Error rejecting appointment:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  const openEditModal = (appointment) => {
    console.log('Opening edit modal for appointment:', appointment);
    setSelectedAppointment(appointment);
    // If no confirmed date exists, use preferred date as default
    let defaultDate = '';
    if (appointment.confirmedDate) {
      defaultDate = new Date(appointment.confirmedDate).toISOString().split('T')[0];
    } else if (appointment.preferredDate) {
      defaultDate = new Date(appointment.preferredDate).toISOString().split('T')[0];
    }
    
    const defaultTime = appointment.confirmedTime || appointment.preferredTime || '';
    const filteredSlots = getFilteredSlotsForDate(defaultDate);
    setAvailableTimeSlots(filteredSlots);
    
    setEditFormData({
      confirmedDate: defaultDate,
      confirmedTime: filteredSlots.includes(defaultTime) ? defaultTime : '',
      notes: appointment.notes || ''
    });
    setShowEditModal(true);
    console.log('Edit modal should now be visible');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedAppointment(null);
    setAvailableTimeSlots(timeSlots);
    setEditFormData({
      confirmedDate: '',
      confirmedTime: '',
      notes: ''
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'confirmedDate') {
      const filteredSlots = getFilteredSlotsForDate(value);
      setAvailableTimeSlots(filteredSlots);
      setEditFormData(prev => ({
        ...prev,
        confirmedDate: value,
        confirmedTime: filteredSlots.includes(prev.confirmedTime) ? prev.confirmedTime : ''
      }));

      if (isDateToday(value) && filteredSlots.length === 0) {
        toast.info('No future time slots available for today. Please select another date.');
      }
      return;
    }

    if (name === 'confirmedTime') {
      const selectedDateTime = combineDateAndTime(editFormData.confirmedDate, value);
      if (selectedDateTime && selectedDateTime <= new Date()) {
        toast.error('Please choose a future time');
        return;
      }
    }

    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateAppointment = async () => {
    if (!editFormData.confirmedDate || !editFormData.confirmedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const appointmentDateTime = combineDateAndTime(editFormData.confirmedDate, editFormData.confirmedTime);
    if (!appointmentDateTime || appointmentDateTime <= new Date()) {
      toast.error('Selected appointment date and time must be in the future');
      return;
    }

    try {
      setEditLoading(true);
      const response = await updateAppointmentDetails(selectedAppointment._id, {
        confirmedDate: new Date(editFormData.confirmedDate).toISOString(),
        confirmedTime: editFormData.confirmedTime,
        notes: editFormData.notes,
        status: 'confirmed'
      });
      
      if (response.success) {
        toast.success('Appointment updated successfully!');
        closeEditModal();
        fetchAppointments();
      }
    } catch (error) {
      toast.error('Failed to update appointment');
      console.error('Error updating appointment:', error);
    } finally {
      setEditLoading(false);
    }
  };

  // Determine if this is an approval or edit action
  const isApprovalAction = selectedAppointment && selectedAppointment.status === 'pending';

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Pagination functions
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getPriorityColor = (appointment) => {
    const appointmentDate = new Date(appointment.preferredDate);
    const today = new Date();
    const daysUntilAppointment = Math.ceil((appointmentDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilAppointment <= 1) return 'text-red-600';
    if (daysUntilAppointment <= 3) return 'text-yellow-600';
    return 'text-blue-600';
  };

  if (!centerId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">No center ID found. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Appointment Approvals</h1>
        <p className="text-gray-600">Review and approve patient appointment requests</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⏳ Pending ({allAppointments.filter(a => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'confirmed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ✅ Approved ({allAppointments.filter(a => a.status === 'confirmed').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ❌ Cancelled ({allAppointments.filter(a => a.status === 'cancelled').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 All ({allAppointments.length})
          </button>
        </div>
      </div>

      {/* Search Bars */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Primary Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by patient name, email, phone, confirmation code..."
                value={primarySearch}
                onChange={(e) => setPrimarySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {primarySearch && (
              <p className="text-xs text-gray-500 mt-1">
                Found {primarySearchResults.length} results
              </p>
            )}
          </div>

          {/* Secondary Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Refine Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search within results..."
                value={secondarySearch}
                onChange={(e) => setSecondarySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!primarySearch}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {secondarySearch && (
              <p className="text-xs text-gray-500 mt-1">
                Showing {finalAppointments.length} refined results
              </p>
            )}
          </div>
        </div>

        {/* Clear Search Buttons */}
        {(primarySearch || secondarySearch) && (
          <div className="mt-4 flex space-x-2">
            {primarySearch && (
              <button
                onClick={() => {
                  setPrimarySearch('');
                  setSecondarySearch('');
                }}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Clear All Searches
              </button>
            )}
            {secondarySearch && (
              <button
                onClick={() => setSecondarySearch('')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Refine Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading appointment requests...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointment requests</h3>
            <p className="text-gray-600">
              {filter === 'pending' 
                ? 'No pending appointments to review.' 
                : 'No appointments found for the selected filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('patientName')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Patient</span>
                        {sortField === 'patientName' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('preferredDate')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date & Time</span>
                        {sortField === 'preferredDate' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        {sortField === 'status' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.map((appointment) => (
                    <tr key={appointment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.patientName}
                          </div>
                          <div className="text-sm text-gray-500">
                            Age: {appointment.patientAge} | {appointment.patientGender}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Code: {appointment.confirmationCode}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className={`text-sm font-medium ${getPriorityColor(appointment)}`}>
                            {formatDate(appointment.preferredDate)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.preferredTime}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900">
                            {appointment.patientPhone}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.patientEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {appointment.appointmentType}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.contactMethod}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {appointment.status === 'pending' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            ⏳ PENDING
                          </span>
                        )}
                        {appointment.status === 'confirmed' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            ✅ APPROVED
                          </span>
                        )}
                        {appointment.status === 'cancelled' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            ❌ CANCELLED
                          </span>
                        )}
                      </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {appointment.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(appointment._id, appointment)}
                                  disabled={updateLoading}
                                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                                  title="Approve Appointment"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(appointment._id)}
                                  disabled={updateLoading}
                                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                                  title="Reject Appointment"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                console.log('Edit button clicked for appointment:', appointment);
                                openEditModal(appointment);
                              }}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-blue-500"
                              title="Edit Appointment"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Appointment
                            </button>
                            <button
                              onClick={() => openModal(appointment)}
                              className="inline-flex items-center px-3 py-2 bg-[#2490eb] text-white text-xs font-semibold rounded-lg hover:bg-[#14457b] transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View Details"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                          </div>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Show:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-sm text-gray-700">per page</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, sortedAppointments.length)} of {sortedAppointments.length} results
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    ←
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detailed Modal */}
      {showModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                    Appointment Details - {selectedAppointment.patientName}
                  </h3>
                  {/* Status Highlight */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {selectedAppointment.status === 'pending' && (
                      <div className="flex items-center px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-lg shadow-md">
                        <div className="animate-pulse mr-2">
                          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-yellow-800 font-bold text-base sm:text-lg">⏳ PENDING APPROVAL</span>
                      </div>
                    )}
                    {selectedAppointment.status === 'confirmed' && (
                      <div className="flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-800 font-bold text-base sm:text-lg">✅ APPROVED</span>
                      </div>
                    )}
                    {selectedAppointment.status === 'cancelled' && (
                      <div className="flex items-center px-4 py-2 bg-gradient-to-r from-red-100 to-rose-100 border-2 border-red-300 rounded-lg shadow-md">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-red-800 font-bold text-base sm:text-lg">❌ CANCELLED</span>
                      </div>
                    )}
                    <div className="text-slate-600 text-sm">
                      Confirmation Code: <span className="font-bold text-[#2490eb]">{selectedAppointment.confirmationCode}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100 self-start sm:self-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                {/* Patient Information */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Patient Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedAppointment.patientName}</p>
                      <p><strong>Age:</strong> {selectedAppointment.patientAge} years</p>
                      <p><strong>Gender:</strong> {selectedAppointment.patientGender}</p>
                      <p><strong>Phone:</strong> {selectedAppointment.patientPhone}</p>
                      <p><strong>Email:</strong> {selectedAppointment.patientEmail}</p>
                      <p><strong>Address:</strong> {selectedAppointment.patientAddress}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-4 text-lg">Appointment Details</h4>
                    
                    {/* Status Banner - Enhanced */}
                    <div className="mb-6">
                      {selectedAppointment.status === 'pending' && (
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl shadow-lg">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center mr-4 animate-pulse">
                              <svg className="w-6 h-6 text-yellow-600 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-yellow-800 font-bold text-lg mb-1">⏳ Appointment Pending Approval</h5>
                              <p className="text-yellow-700 text-sm">This appointment is currently under review by our medical staff. A receptionist will contact the patient within 24 hours to confirm the appointment details.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedAppointment.status === 'confirmed' && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-green-800 font-bold text-lg mb-1">✅ Appointment Confirmed</h5>
                              <p className="text-green-700 text-sm">This appointment has been confirmed. The patient has been notified and should arrive 15 minutes early.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedAppointment.status === 'cancelled' && (
                        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl shadow-lg">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 rounded-xl flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-red-800 font-bold text-lg mb-1">❌ Appointment Cancelled</h5>
                              <p className="text-red-700 text-sm">This appointment has been cancelled. The patient has been notified and can contact the center to reschedule.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Schedule Information */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg">
                          <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h5 className="text-lg font-bold text-slate-800">Preferred Schedule</h5>
                          </div>
                          <div className="space-y-4">
                            <div className="py-3 px-4 bg-slate-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-slate-600">Date</span>
                              </div>
                              <div className="text-sm font-bold text-slate-800 break-words">{formatDate(selectedAppointment.preferredDate)}</div>
                            </div>
                            <div className="py-3 px-4 bg-slate-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-slate-600">Time</span>
                              </div>
                              <div className="text-sm font-bold text-slate-800">{selectedAppointment.preferredTime}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg">
                          {selectedAppointment.confirmedDate ? (
                            <>
                              <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <h5 className="text-lg font-bold text-green-800">Confirmed Schedule</h5>
                              </div>
                              <div className="space-y-4">
                                <div className="py-3 px-4 bg-green-50 rounded-lg">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-medium text-green-600">Date</span>
                                  </div>
                                  <div className="text-sm font-bold text-green-800 break-words">{formatDate(selectedAppointment.confirmedDate)}</div>
                                </div>
                                <div className="py-3 px-4 bg-green-50 rounded-lg">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-medium text-green-600">Time</span>
                                  </div>
                                  <div className="text-sm font-bold text-green-800">{selectedAppointment.confirmedTime}</div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <h5 className="text-lg font-bold text-yellow-800">Confirmation Status</h5>
                              </div>
                              <div className="py-3 px-4 bg-yellow-50 rounded-lg">
                                <p className="text-yellow-700 text-sm font-medium">⏳ Awaiting confirmation</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg">
                          <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h5 className="text-lg font-bold text-slate-800">Appointment Details</h5>
                          </div>
                          <div className="space-y-4">
                            <div className="py-3 px-4 bg-slate-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-slate-600">Type</span>
                              </div>
                              <div className="text-sm font-bold text-slate-800 capitalize">{selectedAppointment.appointmentType}</div>
                            </div>
                            <div className="py-3 px-4 bg-slate-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-slate-600">Contact Method</span>
                              </div>
                              <div className="text-sm font-bold text-slate-800 capitalize">{selectedAppointment.contactMethod}</div>
                            </div>
                            <div className="py-3 px-4 bg-slate-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-slate-600">Confirmation Code</span>
                              </div>
                              <div className="text-sm font-bold text-[#2490eb] font-mono">{selectedAppointment.confirmationCode}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg">
                          <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h5 className="text-lg font-bold text-slate-800">Timeline</h5>
                          </div>
                          <div className="space-y-4">
                            <div className="py-3 px-4 bg-slate-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-slate-600">Recorded On</span>
                              </div>
                              <div className="text-sm font-bold text-slate-800 break-words">{formatDateTime(selectedAppointment.bookedAt || selectedAppointment.createdAt)}</div>
                            </div>
                            {selectedAppointment.status === 'confirmed' && selectedAppointment.confirmedAt && (
                              <div className="py-3 px-4 bg-green-50 rounded-lg">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-sm font-medium text-green-600">Confirmed On</span>
                                </div>
                                <div className="text-sm font-bold text-green-800 break-words">{formatDateTime(selectedAppointment.confirmedAt)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-4 text-lg">Medical Information</h4>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h5 className="font-semibold text-slate-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-[#2490eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Reason for Visit
                        </h5>
                        <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">{selectedAppointment.reasonForVisit}</p>
                      </div>
                      
                      {selectedAppointment.symptoms && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                          <h5 className="font-semibold text-slate-700 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-[#2490eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Symptoms
                          </h5>
                          <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">{selectedAppointment.symptoms}</p>
                        </div>
                      )}
                      
                      {selectedAppointment.previousHistory && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                          <h5 className="font-semibold text-slate-700 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-[#2490eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Medical History
                          </h5>
                          <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">{selectedAppointment.previousHistory}</p>
                        </div>
                      )}
                      
                      {selectedAppointment.notes && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                          <h5 className="font-semibold text-slate-700 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-[#2490eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Additional Notes
                          </h5>
                          <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm leading-relaxed">{selectedAppointment.notes}</p>
                        </div>
                      )}

                      {/* Uploaded Medical History Documents */}
                      {selectedAppointment.medicalHistoryDocs && selectedAppointment.medicalHistoryDocs.length > 0 && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                          <h5 className="font-semibold text-slate-700 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-[#2490eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Uploaded Medical Documents ({selectedAppointment.medicalHistoryDocs.length})
                          </h5>
                          <div className="space-y-2">
                            {selectedAppointment.medicalHistoryDocs.map((doc, index) => (
                              <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:bg-blue-50 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <svg className="w-5 h-5 text-[#2490eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{doc.originalName}</p>
                                    <p className="text-xs text-slate-500">
                                      {(doc.size / 1024).toFixed(2)} KB
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={`${SERVER_CONFIG.BACKEND_URL}/${doc.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 bg-[#2490eb] text-white text-xs font-semibold rounded-lg hover:bg-[#14457b] transition-all duration-200"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end space-x-4">
                {selectedAppointment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedAppointment._id, selectedAppointment)}
                      disabled={updateLoading}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve Appointment
                    </button>
                    <button
                      onClick={() => handleReject(selectedAppointment._id)}
                      disabled={updateLoading}
                      className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject Appointment
                    </button>
                  </>
                )}
                <button
                  onClick={closeModal}
                  className="inline-flex items-center px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 font-semibold transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-2xl rounded-xl bg-white border-slate-200">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {isApprovalAction ? 'Approve Appointment' : 'Edit Appointment'} - {selectedAppointment.patientName}
                  </h3>
                  {isApprovalAction && (
                    <p className="text-sm text-slate-600 mt-1">
                      Review and confirm the appointment schedule
                    </p>
                  )}
                </div>
                <button
                  onClick={closeEditModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                >
                  <span className="text-3xl">&times;</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Current Appointment Info */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4 text-lg">Current Appointment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong className="text-slate-700">Patient:</strong> 
                      <span className="ml-2 text-slate-600">{selectedAppointment.patientName}</span>
                    </div>
                    <div>
                      <strong className="text-slate-700">Phone:</strong> 
                      <span className="ml-2 text-slate-600">{selectedAppointment.patientPhone}</span>
                    </div>
                    <div>
                      <strong className="text-slate-700">Preferred Date:</strong> 
                      <span className="ml-2 text-slate-600">{formatDate(selectedAppointment.preferredDate)}</span>
                    </div>
                    <div>
                      <strong className="text-slate-700">Preferred Time:</strong> 
                      <span className="ml-2 text-slate-600">{selectedAppointment.preferredTime}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4 text-lg">{isApprovalAction ? 'Confirm Appointment Schedule' : 'Schedule Final Appointment'}</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirmed Date *
                        </label>
                        <input
                          type="date"
                          name="confirmedDate"
                          value={editFormData.confirmedDate}
                          onChange={handleEditInputChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirmed Time *
                        </label>
                        <select
                          name="confirmedTime"
                          value={editFormData.confirmedTime}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white"
                          disabled={availableTimeSlots.length === 0}
                          required
                        >
                          <option value="">Select Time</option>
                          {availableTimeSlots.length > 0 ? (
                            availableTimeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))
                          ) : (
                            <option value="" disabled>No future slots available today</option>
                          )}
                        </select>
                        {availableTimeSlots.length === 0 && editFormData.confirmedDate && isDateToday(editFormData.confirmedDate) && (
                          <p className="text-xs text-amber-600 mt-1">No future time slots available for today. Please select a different date.</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        name="notes"
                        value={editFormData.notes}
                        onChange={handleEditInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent"
                        placeholder="Add any notes about the appointment scheduling..."
                      />
                    </div>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-amber-800 mb-1">Important Notice</h3>
                      <p className="text-sm text-amber-700">
                        This will confirm the final appointment date and time based on doctor availability. 
                        The patient will be notified of the confirmed schedule.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={closeEditModal}
                  className="inline-flex items-center px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 font-semibold transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={isApprovalAction ? handleDirectApprove : handleUpdateAppointment}
                  disabled={editLoading}
                  className={`inline-flex items-center px-6 py-3 ${isApprovalAction ? 'bg-green-600 hover:bg-green-700' : 'bg-[#2490eb] hover:bg-[#14457b]'} text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg hover:shadow-xl`}
                >
                  {editLoading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isApprovalAction ? 'Approving...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isApprovalAction ? 'Approve Appointment' : 'Confirm Appointment'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentApprovals;
