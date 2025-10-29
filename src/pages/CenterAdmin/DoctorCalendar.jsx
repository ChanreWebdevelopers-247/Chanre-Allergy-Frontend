import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../../services/api';
import { 
  Calendar, 
  Clock, 
  User, 
  Users, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash2,
  Save,
  Edit,
  X,
  CalendarX
} from 'lucide-react';

export default function DoctorCalendar() {
  const { user } = useSelector((state) => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({
    isAvailable: true,
    isHoliday: false,
    holidayName: '',
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    notes: '',
    maxAppointments: 50
  });
  const [slots, setSlots] = useState([]);
  const [slotSettings, setSlotSettings] = useState({
    slotDuration: 30,
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00'
  });
  const [monthData, setMonthData] = useState({});
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [bulkHolidayName, setBulkHolidayName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'availability', 'slots', 'view'

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && currentYear) {
      fetchYearAvailability();
      // Automatically mark Sundays as holidays when doctor/year changes
      markSundaysForYear();
    }
  }, [selectedDoctor, currentYear]);

  const markSundaysForYear = async () => {
    if (!selectedDoctor || !currentYear) return;
    try {
      await API.post('/doctor-calendar/mark-sundays', {
        doctorId: selectedDoctor,
        year: currentYear
      });
      // Refresh availability after marking Sundays
      fetchYearAvailability();
    } catch (error) {
      // Silently fail - might already be marked
      console.log('Sundays may already be marked or error occurred:', error);
    }
  };

  useEffect(() => {
    if (selectedDoctor && selectedDate && activeTab === 'slots') {
      fetchSlots();
    }
  }, [selectedDoctor, selectedDate, activeTab]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await API.get('/doctor-calendar/doctors');
      setDoctors(response.data.doctors);
      if (response.data.doctors.length > 0 && !selectedDoctor) {
        setSelectedDoctor(response.data.doctors[0]._id);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      alert('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  const fetchYearAvailability = async () => {
    if (!selectedDoctor || !currentYear) return;
    try {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      const response = await API.get('/doctor-calendar/month-availability', {
        params: {
          doctorId: selectedDoctor,
          startDate,
          endDate
        }
      });
      
      // Organize by date for easy lookup
      const dateMap = {};
      response.data.availabilities.forEach(avail => {
        const dateStr = new Date(avail.date).toISOString().split('T')[0];
        dateMap[dateStr] = avail;
      });
      setMonthData(dateMap);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const fetchSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    try {
      const response = await API.get('/doctor-calendar/slots', {
        params: {
          doctorId: selectedDoctor,
          date: selectedDate
        }
      });
      setSlots(response.data.slots || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const handleDateClick = (date, event) => {
    // If bulk holiday modal is open, allow multi-select
    if (showHolidayModal) {
      if (event && event.ctrlKey || event && event.metaKey) {
        // Multi-select with Ctrl/Cmd
        if (selectedDates.includes(date)) {
          setSelectedDates(selectedDates.filter(d => d !== date));
        } else {
          setSelectedDates([...selectedDates, date]);
        }
      } else {
        // Toggle single date
        if (selectedDates.includes(date)) {
          setSelectedDates(selectedDates.filter(d => d !== date));
        } else {
          setSelectedDates([...selectedDates, date]);
        }
      }
      return;
    }

    // Normal edit mode
    setSelectedDate(date);
    const dateData = monthData[date];
    if (dateData) {
      setAvailability({
        isAvailable: dateData.isAvailable,
        isHoliday: dateData.isHoliday || false,
        holidayName: dateData.holidayName || '',
        startTime: dateData.startTime || '09:00',
        endTime: dateData.endTime || '17:00',
        breakStartTime: dateData.breakStartTime || '13:00',
        breakEndTime: dateData.breakEndTime || '14:00',
        notes: dateData.notes || '',
        maxAppointments: dateData.maxAppointments || 50
      });
      setEditingDate(date);
    } else {
      setAvailability({
        isAvailable: true,
        isHoliday: false,
        holidayName: '',
        startTime: '09:00',
        endTime: '17:00',
        breakStartTime: '13:00',
        breakEndTime: '14:00',
        notes: '',
        maxAppointments: 50
      });
      setEditingDate(date);
    }
    setShowEditModal(true);
    setActiveTab('availability');
  };

  const handleSaveAvailability = async () => {
    if (!selectedDoctor || !editingDate) {
      alert('Please select a doctor and date');
      return;
    }
    try {
      setLoading(true);
      await API.post('/doctor-calendar/availability', {
        doctorId: selectedDoctor,
        date: editingDate,
        ...availability
      });
      alert('Availability saved successfully');
      setShowEditModal(false);
      fetchYearAvailability();
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSetHolidays = async () => {
    if (!selectedDoctor || selectedDates.length === 0 || !bulkHolidayName) {
      alert('Please select dates and provide a holiday name');
      return;
    }
    try {
      setLoading(true);
      await API.post('/doctor-calendar/bulk-holidays', {
        doctorId: selectedDoctor,
        dates: selectedDates,
        holidayName: bulkHolidayName
      });
      alert(`Successfully set ${selectedDates.length} holidays`);
      setShowHolidayModal(false);
      setSelectedDates([]);
      setBulkHolidayName('');
      fetchYearAvailability();
    } catch (error) {
      console.error('Error setting holidays:', error);
      alert('Failed to set holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlots = async () => {
    if (!selectedDoctor || !selectedDate) {
      alert('Please select a doctor and date');
      return;
    }
    try {
      setLoading(true);
      const response = await API.post('/doctor-calendar/slots/create', {
        doctorId: selectedDoctor,
        date: selectedDate,
        ...slotSettings
      });
      alert(`Successfully created ${response.data.slotsCreated} appointment slots`);
      fetchSlots();
    } catch (error) {
      console.error('Error creating slots:', error);
      alert(error.response?.data?.message || 'Failed to create slots');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarMonths = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(currentYear, month, 1);
      const lastDay = new Date(currentYear, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      const days = [];
      // Add empty cells for days before month starts
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      // Add days of month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const dateStr = date.toISOString().split('T')[0];
        days.push(dateStr);
      }
      
      months.push({
        monthIndex: month,
        monthName: firstDay.toLocaleString('default', { month: 'long' }),
        days
      });
    }
    return months;
  };

  const getDateStatus = (dateStr) => {
    if (!dateStr) return null;
    const data = monthData[dateStr];
    if (!data) return 'unset';
    if (data.isHoliday) return 'holiday';
    if (!data.isAvailable) return 'unavailable';
    return 'available';
  };

  const getDateStatusClass = (status) => {
    switch (status) {
      case 'holiday':
        return 'bg-red-500 text-white';
      case 'unavailable':
        return 'bg-gray-400 text-white';
      case 'available':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  };

  const months = generateCalendarMonths();

  const getSelectedDoctorName = () => {
    const doctor = doctors.find(d => d._id === selectedDoctor);
    return doctor ? doctor.name : 'Select Doctor';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Doctor Appointment Calendar</h1>
        <p className="text-gray-600">Manage doctor availability, holidays, and appointment slots</p>
      </div>

      {/* Controls */}
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
              Year
            </label>
            <input
              type="number"
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              min="2020"
              max="2100"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowHolidayModal(true)}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              <CalendarX className="inline-block mr-2 h-4 w-4" />
              Bulk Set Holidays
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'calendar'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          12-Month Calendar
        </button>
        <button
          onClick={() => setActiveTab('availability')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'availability'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Edit Availability
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'slots'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Create Slots
        </button>
      </div>

      {/* 12-Month Calendar View */}
      {activeTab === 'calendar' && selectedDoctor && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6">
            {currentYear} - {getSelectedDoctorName()}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {months.map((month, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-center">{month.monthName}</h3>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-xs font-medium text-center text-gray-600 py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {month.days.map((dateStr, dayIdx) => {
                    const status = getDateStatus(dateStr);
                    const statusClass = getDateStatusClass(status);
                    const data = dateStr ? monthData[dateStr] : null;
                    
                    const isSelected = selectedDates.includes(dateStr);
                    const selectedClass = isSelected ? 'ring-4 ring-orange-500' : '';
                    return (
                      <button
                        key={dayIdx}
                        onClick={(e) => dateStr && handleDateClick(dateStr, e)}
                        className={`h-8 text-xs rounded cursor-pointer transition-all ${statusClass} ${selectedClass} ${
                          dateStr ? 'hover:ring-2 hover:ring-blue-500' : ''
                        }`}
                        disabled={!dateStr}
                        title={data?.isHoliday ? data.holidayName : data?.isAvailable ? 'Available' : 'Unavailable'}
                      >
                        {dateStr ? new Date(dateStr).getDate() : ''}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                    Available
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                    Holiday
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded mr-1"></div>
                    Unavailable
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-100 rounded mr-1"></div>
                    Not Set
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Availability Modal */}
      {showEditModal && editingDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Edit Availability - {new Date(editingDate).toLocaleDateString()}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={availability.isHoliday}
                    onChange={(e) => setAvailability({ ...availability, isHoliday: e.target.checked, isAvailable: !e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Mark as Holiday</span>
                </label>
              </div>

              {availability.isHoliday && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Name
                  </label>
                  <input
                    type="text"
                    value={availability.holidayName}
                    onChange={(e) => setAvailability({ ...availability, holidayName: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Christmas, New Year"
                  />
                </div>
              )}

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={availability.isAvailable && !availability.isHoliday}
                    onChange={(e) => setAvailability({ ...availability, isAvailable: e.target.checked, isHoliday: false })}
                    disabled={availability.isHoliday}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Available on this date</span>
                </label>
              </div>

              {availability.isAvailable && !availability.isHoliday && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={availability.startTime}
                        onChange={(e) => setAvailability({ ...availability, startTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={availability.endTime}
                        onChange={(e) => setAvailability({ ...availability, endTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Break Start
                      </label>
                      <input
                        type="time"
                        value={availability.breakStartTime}
                        onChange={(e) => setAvailability({ ...availability, breakStartTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Break End
                      </label>
                      <input
                        type="time"
                        value={availability.breakEndTime}
                        onChange={(e) => setAvailability({ ...availability, breakEndTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Appointments
                    </label>
                    <input
                      type="number"
                      value={availability.maxAppointments}
                      onChange={(e) => setAvailability({ ...availability, maxAppointments: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="1"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={availability.notes}
                  onChange={(e) => setAvailability({ ...availability, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleSaveAvailability}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Bulk Set Holidays</h3>
              <button onClick={() => setShowHolidayModal(false)} className="text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={bulkHolidayName}
                  onChange={(e) => setBulkHolidayName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Christmas, New Year, Diwali"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Dates (Click dates in calendar to select multiple)
                </label>
                <div className="border rounded-md p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                  {selectedDates.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      Click on dates in the calendar to select them, then come back here to set them as holidays.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDates.map((date, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span>{new Date(date).toLocaleDateString()}</span>
                          <button
                            onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))}
                            className="text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleBulkSetHolidays}
                  disabled={loading || selectedDates.length === 0 || !bulkHolidayName}
                  className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  Set Holidays
                </button>
                <button
                  onClick={() => setShowHolidayModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slots Tab - keeping existing slots functionality */}
      {activeTab === 'slots' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          {selectedDoctor && selectedDate && (
            <>
              <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Slot Settings</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slot Duration (min)
                    </label>
                    <input
                      type="number"
                      value={slotSettings.slotDuration}
                      onChange={(e) => setSlotSettings({ ...slotSettings, slotDuration: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="15"
                      step="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={slotSettings.startTime}
                      onChange={(e) => setSlotSettings({ ...slotSettings, startTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={slotSettings.endTime}
                      onChange={(e) => setSlotSettings({ ...slotSettings, endTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Break
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="time"
                        value={slotSettings.breakStartTime}
                        onChange={(e) => setSlotSettings({ ...slotSettings, breakStartTime: e.target.value })}
                        className="w-1/2 border border-gray-300 rounded-md px-2 py-2"
                      />
                      <input
                        type="time"
                        value={slotSettings.breakEndTime}
                        onChange={(e) => setSlotSettings({ ...slotSettings, breakEndTime: e.target.value })}
                        className="w-1/2 border border-gray-300 rounded-md px-2 py-2"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateSlots}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="inline-block mr-2 h-4 w-4" />
                  Create Slots
                </button>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Slots for {getSelectedDoctorName()} - {new Date(selectedDate).toLocaleDateString()}
                </h3>
                {slots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {slots.map((slot) => (
                      <div
                        key={slot._id}
                        className={`p-3 rounded-md border-2 ${
                          slot.isBooked
                            ? 'bg-red-50 border-red-300'
                            : 'bg-green-50 border-green-300'
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-xs mt-1">
                          {slot.isBooked ? (
                            <span className="text-red-600">
                              {slot.patientId?.name || 'Booked'}
                            </span>
                          ) : (
                            <span className="text-green-600">Available</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No slots created yet. Create slots using the settings above.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
