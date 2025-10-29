import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { 
  Calendar, 
  Clock, 
  User, 
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function BookSlot() {
  const { user } = useSelector((state) => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [patientAppointmentId, setPatientAppointmentId] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const response = await API.get('/doctor-calendar/doctors');
      setDoctors(response.data.doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
    }
  };

  const fetchSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    try {
      setLoading(true);
      const response = await API.get('/doctor-calendar/slots', {
        params: {
          doctorId: selectedDoctor,
          date: selectedDate
        }
      });
      setSlots(response.data.slots || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setPatients([]);
      return;
    }
    try {
      const response = await API.get('/patients', {
        params: {
          search: searchQuery,
          limit: 10
        }
      });
      setPatients(response.data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchPatients();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleBookSlot = async () => {
    if (!selectedSlot || !selectedPatient) {
      toast.error('Please select a slot and patient');
      return;
    }

    try {
      setLoading(true);
      await API.post('/doctor-calendar/slots/book', {
        slotId: selectedSlot._id,
        patientId: selectedPatient._id,
        patientAppointmentId: patientAppointmentId || null,
        notes: ''
      });
      toast.success('Slot booked successfully!');
      setShowBookingModal(false);
      setSelectedSlot(null);
      setSelectedPatient(null);
      setPatientAppointmentId(null);
      fetchSlots();
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error(error.response?.data?.message || 'Failed to book slot');
    } finally {
      setLoading(false);
    }
  };

  const openBookingModal = (slot) => {
    if (slot.isBooked) {
      toast.info('This slot is already booked');
      return;
    }
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  const getSelectedDoctorName = () => {
    const doctor = doctors.find(d => d._id === selectedDoctor);
    return doctor ? doctor.name : 'Select Doctor';
  };

  const availableSlots = slots.filter(s => !s.isBooked);
  const bookedSlots = slots.filter(s => s.isBooked);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Book Appointment Slot</h1>
        <p className="text-gray-600">Assign patients to available doctor appointment slots</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Doctor
            </label>
            <select
              value={selectedDoctor || ''}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name} {doctor.qualification ? `(${doctor.qualification})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      </div>

      {selectedDoctor && selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Slots */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">
              Available Slots ({availableSlots.length})
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading slots...</div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot._id}
                    onClick={() => openBookingModal(slot)}
                    className="p-3 bg-green-50 border-2 border-green-300 rounded-lg hover:bg-green-100 transition-all text-left"
                  >
                    <div className="font-medium text-green-700">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <div className="text-xs text-green-600 mt-1">Click to book</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No available slots for this date
              </div>
            )}
          </div>

          {/* Booked Slots */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">
              Booked Slots ({bookedSlots.length})
            </h2>
            {bookedSlots.length > 0 ? (
              <div className="space-y-3">
                {bookedSlots.map((slot) => (
                  <div
                    key={slot._id}
                    className="p-3 bg-red-50 border-2 border-red-300 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-red-700">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-sm text-red-600 mt-1">
                          {slot.patientId?.name || 'Unknown Patient'}
                        </div>
                        {slot.patientId?.uhId && (
                          <div className="text-xs text-gray-600 mt-1">
                            UH ID: {slot.patientId.uhId}
                          </div>
                        )}
                        {slot.bookedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            Booked by: {slot.bookedBy.name}
                          </div>
                        )}
                      </div>
                      <CheckCircle className="h-5 w-5 text-red-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No booked slots for this date
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Book Appointment Slot</h3>
            
            <div className="mb-4">
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <div className="font-medium text-blue-700">
                  {getSelectedDoctorName()}
                </div>
                <div className="text-sm text-blue-600">
                  {new Date(selectedDate).toLocaleDateString()} at {selectedSlot.startTime} - {selectedSlot.endTime}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Patient
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or UH ID"
                    className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                {searchQuery && patients.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        key={patient._id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setSearchQuery(patient.name);
                          setPatients([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100"
                      >
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-xs text-gray-600">
                          UH ID: {patient.uhId || 'N/A'} | Phone: {patient.phone || 'N/A'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="bg-green-50 p-3 rounded-lg mb-4">
                  <div className="font-medium text-green-700">
                    Selected: {selectedPatient.name}
                  </div>
                  <div className="text-sm text-green-600">
                    UH ID: {selectedPatient.uhId || 'N/A'}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Appointment ID (Optional)
                </label>
                <input
                  type="text"
                  value={patientAppointmentId || ''}
                  onChange={(e) => setPatientAppointmentId(e.target.value)}
                  placeholder="Link to online appointment if applicable"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleBookSlot}
                disabled={loading || !selectedPatient}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Book Slot'}
              </button>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedSlot(null);
                  setSelectedPatient(null);
                  setSearchQuery('');
                  setPatientAppointmentId(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

