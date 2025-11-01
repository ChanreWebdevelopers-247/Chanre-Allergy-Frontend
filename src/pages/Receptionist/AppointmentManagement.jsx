import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getCenterAppointments, 
  updateAppointmentStatus 
} from '../../services/api';
import { SERVER_CONFIG } from '../../config/environment';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Get center ID from user data (assuming it's stored in localStorage)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const centerId = user.centerId;

  useEffect(() => {
    if (centerId) {
      fetchAppointments();
    }
  }, [centerId, selectedDate, statusFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await getCenterAppointments(centerId, statusFilter, selectedDate);
      if (response.success) {
        setAppointments(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus, notes = '') => {
    try {
      setUpdateLoading(true);
      
      // Optimistically update the appointment in the list
      setAppointments(prevAppointments => 
        prevAppointments.map(apt => {
          if (apt._id === appointmentId) {
            const updatedApt = {
              ...apt,
              status: newStatus
            };
            
            // If confirming, set confirmedDate and confirmedTime
            if (newStatus === 'confirmed') {
              updatedApt.confirmedDate = apt.confirmedDate || apt.preferredDate;
              updatedApt.confirmedTime = apt.confirmedTime || apt.preferredTime;
              updatedApt.confirmedAt = new Date().toISOString();
            }
            
            return updatedApt;
          }
          return apt;
        })
      );
      
      // Update the selected appointment in the modal too
      if (selectedAppointment && selectedAppointment._id === appointmentId) {
        const updatedSelected = {
          ...selectedAppointment,
          status: newStatus
        };
        
        if (newStatus === 'confirmed') {
          updatedSelected.confirmedDate = selectedAppointment.confirmedDate || selectedAppointment.preferredDate;
          updatedSelected.confirmedTime = selectedAppointment.confirmedTime || selectedAppointment.preferredTime;
          updatedSelected.confirmedAt = new Date().toISOString();
        }
        
        setSelectedAppointment(updatedSelected);
      }
      
      // Call the API to persist the change
      const response = await updateAppointmentStatus(appointmentId, newStatus, notes);
      
      if (response.success && response.data) {
        // Update with the actual data from server
        const updatedAppointment = response.data;
        
        setAppointments(prevAppointments => 
          prevAppointments.map(apt => 
            apt._id === appointmentId ? updatedAppointment : apt
          )
        );
        
        // Update selected appointment if modal is open
        if (selectedAppointment && selectedAppointment._id === appointmentId) {
          setSelectedAppointment(updatedAppointment);
        }
        
        toast.success('Appointment status updated successfully');
        
        // Wait a moment before closing modal to show the success
        setTimeout(() => {
          setShowModal(false);
          setSelectedAppointment(null);
          
          // Refetch appointments to ensure we have the latest data from server
          fetchAppointments();
        }, 500);
      } else {
        // If API call failed, revert the optimistic update
        fetchAppointments();
        toast.error(response.message || 'Failed to update appointment status');
      }
    } catch (error) {
      // If API call failed, revert the optimistic update
      fetchAppointments();
      toast.error('Failed to update appointment status');
      console.error('Error updating appointment status:', error);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString;
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Appointment Management</h1>
        <p className="text-gray-600">Manage patient appointments for your center</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Appointments</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchAppointments}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Appointments ({appointments.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No appointments found for the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.patientName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Age: {appointment.patientAge}, {appointment.patientGender}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.patientPhone}</div>
                      <div className="text-sm text-gray-500">{appointment.patientEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {appointment.confirmedDate 
                          ? formatDate(appointment.confirmedDate)
                          : formatDate(appointment.preferredDate)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.confirmedTime 
                          ? formatTime(appointment.confirmedTime)
                          : formatTime(appointment.preferredTime)}
                        {appointment.confirmedDate && (
                          <span className="ml-1 text-green-600 text-xs">(Confirmed)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {appointment.appointmentType}
                      </div>
                      <div className="text-sm text-gray-500">
                        Code: {appointment.confirmationCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                        {appointment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openModal(appointment)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for managing appointment */}
      {showModal && selectedAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Manage Appointment
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Patient:</strong> {selectedAppointment.patientName}</p>
                  <p><strong>Phone:</strong> {selectedAppointment.patientPhone}</p>
                  <p><strong>Email:</strong> {selectedAppointment.patientEmail}</p>
                  <p><strong>Preferred Date:</strong> {formatDate(selectedAppointment.preferredDate)}</p>
                  <p><strong>Preferred Time:</strong> {formatTime(selectedAppointment.preferredTime)}</p>
                  {selectedAppointment.confirmedDate && (
                    <>
                      <p><strong>Confirmed Date:</strong> {formatDate(selectedAppointment.confirmedDate)}</p>
                      <p><strong>Confirmed Time:</strong> {formatTime(selectedAppointment.confirmedTime || selectedAppointment.preferredTime)}</p>
                    </>
                  )}
                  <p><strong>Reason:</strong> {selectedAppointment.reasonForVisit}</p>
                  {selectedAppointment.symptoms && (
                    <p><strong>Symptoms:</strong> {selectedAppointment.symptoms}</p>
                  )}
                  {selectedAppointment.previousHistory && (
                    <p><strong>Medical History:</strong> {selectedAppointment.previousHistory}</p>
                  )}
                </div>

                {/* Uploaded Medical History Documents */}
                {selectedAppointment.medicalHistoryDocs && selectedAppointment.medicalHistoryDocs.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Uploaded Documents ({selectedAppointment.medicalHistoryDocs.length})
                    </h5>
                    <div className="space-y-2">
                      {selectedAppointment.medicalHistoryDocs.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-700 truncate">{doc.originalName}</span>
                            <span className="text-xs text-gray-500">({(doc.size / 1024).toFixed(2)} KB)</span>
                          </div>
                          <a
                            href={`${SERVER_CONFIG.BACKEND_URL}/${doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800 text-xs font-semibold whitespace-nowrap"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status: <span className={`font-semibold ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status.toUpperCase()}
                  </span>
                </label>
                
                {selectedAppointment.status === 'pending' && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">⚠️ Action Required</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      This appointment needs approval. Review the details and confirm with the patient.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedAppointment.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedAppointment._id, 'confirmed')}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        ✅ Approve & Confirm
                      </button>
                    )}
                    
                    {selectedAppointment.status !== 'cancelled' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedAppointment._id, 'cancelled')}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ❌ Cancel
                      </button>
                    )}
                    
                    {selectedAppointment.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedAppointment._id, 'completed')}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🏥 Mark Complete
                      </button>
                    )}
                    
                    {selectedAppointment.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedAppointment._id, 'no_show')}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        👤 No Show
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentManagement;
