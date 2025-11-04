import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../../services/api';
import { toast } from 'react-toastify';
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
  CalendarX,
  Info,
  ChevronLeft,
  ChevronRight
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
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'defaultHours', 'slots'
  
  // Default working hours state
  const [defaultHours, setDefaultHours] = useState({
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    maxAppointments: 50,
    slotDuration: 30,
    excludeSundays: true,
    overrideExisting: false
  });
  
  // Bulk availability management states
  const [bulkAvailabilityView, setBulkAvailabilityView] = useState(false);
  const [selectedHolidayMonths, setSelectedHolidayMonths] = useState([]);
  const [selectedUnavailableMonths, setSelectedUnavailableMonths] = useState([]);
  const [selectedHolidayWeeks, setSelectedHolidayWeeks] = useState([]);
  const [selectedUnavailableWeeks, setSelectedUnavailableWeeks] = useState([]);
  const [selectedHolidayDays, setSelectedHolidayDays] = useState([]);
  const [selectedUnavailableDays, setSelectedUnavailableDays] = useState([]);
  const [bulkHolidayNameBulk, setBulkHolidayNameBulk] = useState('');
  const [expandedMonthForDays, setExpandedMonthForDays] = useState(null); // Track which month is expanded for day selection
  const [selectedDaysInMonth, setSelectedDaysInMonth] = useState({}); // Track selected days per month: { monthIndex: [dates] }

  // Helper function to format dates consistently (YYYY-MM-DD)
  const formatDateString = (date) => {
    if (!date) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && currentYear) {
      fetchYearAvailability();
    }
  }, [selectedDoctor, currentYear]);

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
      toast.error('Failed to fetch doctors');
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
      
      // Organize by date for easy lookup using formatDateString
      const dateMap = {};
      response.data.availabilities.forEach(avail => {
        const dateStr = formatDateString(avail.date);
        if (dateStr) {
          dateMap[dateStr] = avail;
        }
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
        isAvailable: dateData.isAvailable !== undefined ? dateData.isAvailable : true,
        isHoliday: dateData.isHoliday || false,
        holidayName: dateData.holidayName || '',
        startTime: (dateData.startTime && typeof dateData.startTime === 'string' && dateData.startTime.trim() !== '') ? dateData.startTime : '09:00',
        endTime: (dateData.endTime && typeof dateData.endTime === 'string' && dateData.endTime.trim() !== '') ? dateData.endTime : '17:00',
        breakStartTime: (dateData.breakStartTime && typeof dateData.breakStartTime === 'string' && dateData.breakStartTime.trim() !== '') ? dateData.breakStartTime : '13:00',
        breakEndTime: (dateData.breakEndTime && typeof dateData.breakEndTime === 'string' && dateData.breakEndTime.trim() !== '') ? dateData.breakEndTime : '14:00',
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
  };

  const handleSaveAvailability = async () => {
    if (!selectedDoctor || !editingDate) {
      toast.error('Please select a doctor and date');
      return;
    }
    try {
      setLoading(true);
      await API.post('/doctor-calendar/availability', {
        doctorId: selectedDoctor,
        date: editingDate,
        ...availability
      });
      toast.success('Availability saved successfully');
      setShowEditModal(false);
      fetchYearAvailability();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultHours = async () => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }
    
    // Validate required fields
    if (!defaultHours.startTime || !defaultHours.endTime) {
      toast.error('Please set start time and end time');
      return;
    }
    
    try {
      setLoading(true);
      
      const payload = {
        doctorId: selectedDoctor,
        year: currentYear,
        startTime: defaultHours.startTime,
        endTime: defaultHours.endTime,
        breakStartTime: defaultHours.breakStartTime || null,
        breakEndTime: defaultHours.breakEndTime || null,
        maxAppointments: defaultHours.maxAppointments || 50,
        slotDuration: defaultHours.slotDuration || 30,
        excludeSundays: defaultHours.excludeSundays !== undefined ? defaultHours.excludeSundays : true,
        overrideExisting: defaultHours.overrideExisting !== undefined ? defaultHours.overrideExisting : false
      };
      
      console.log('Sending default working hours request:', payload);
      
      const response = await API.post('/doctor-calendar/default-working-hours', payload);
      
      console.log('Default working hours response:', response.data);
      
      if (response.data.success) {
        toast.success(`Default working hours set successfully for ${response.data.count || 'all'} days in ${currentYear}`);
        // Refresh availability data after a short delay to ensure backend has processed
        setTimeout(() => {
          fetchYearAvailability();
        }, 1000);
      } else {
        toast.error(response.data.message || 'Failed to set default working hours');
      }
    } catch (error) {
      console.error('Error setting default hours:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to set default working hours. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const getAllWeeksInYear = (year) => {
    const weeks = [];
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // Find first Monday of the year
    let currentDate = new Date(firstDay);
    const dayOfWeek = currentDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    if (daysToMonday > 0) {
      currentDate.setDate(currentDate.getDate() + daysToMonday);
    }
    
    let weekNum = 1;
    while (currentDate <= lastDay) {
      const weekStart = new Date(currentDate);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      if (weekEnd > lastDay) {
        weekEnd.setTime(lastDay.getTime());
      }
      
      weeks.push({
        weekNum,
        startDate: formatDateString(weekStart),
        endDate: formatDateString(weekEnd),
        label: `Week ${weekNum} (${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
      weekNum++;
    }
    
    return weeks;
  };

  const handleBulkSetAvailability = async (type, availabilityType) => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }
    
    let dates = [];
    
    if (type === 'month') {
      // Use combined selection for months - selected months can be used for either holiday or unavailable
      const selectedMonths = [...new Set([...selectedHolidayMonths, ...selectedUnavailableMonths])];
      selectedMonths.forEach(monthIndex => {
        const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentYear, monthIndex, day);
          dates.push(formatDateString(date));
        }
      });
    } else if (type === 'week') {
      // Use combined selection for weeks - selected weeks can be used for holiday, available, or unavailable
      const selectedWeeks = [...new Set([...selectedHolidayWeeks, ...selectedUnavailableWeeks])];
      const allWeeks = getAllWeeksInYear(currentYear);
      selectedWeeks.forEach(weekNum => {
        const week = allWeeks.find(w => w.weekNum === weekNum);
        if (week) {
          const start = new Date(week.startDate);
          const end = new Date(week.endDate);
          const current = new Date(start);
          current.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          
          while (current <= end) {
            dates.push(formatDateString(current));
            current.setDate(current.getDate() + 1);
          }
        }
      });
    } else if (type === 'day') {
      dates = availabilityType === 'holiday' ? selectedHolidayDays : selectedUnavailableDays;
    }
    
    if (dates.length === 0) {
      toast.error('Please select at least one date');
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        doctorId: selectedDoctor,
        dates: dates,
        year: currentYear
      };
      
      if (availabilityType === 'holiday') {
        if (!bulkHolidayNameBulk.trim()) {
          toast.error('Please provide a holiday name');
          return;
        }
        payload.holidayName = bulkHolidayNameBulk;
        await API.post('/doctor-calendar/bulk-holidays', payload);
      } else {
        // Set isAvailable based on availabilityType
        payload.isAvailable = availabilityType === 'available';
        await API.post('/doctor-calendar/bulk-availability', payload);
      }
      
      toast.success(`Successfully set ${dates.length} dates as ${availabilityType === 'holiday' ? 'holidays' : availabilityType === 'available' ? 'available' : 'unavailable'}`);
      
      // Reset selections
      if (type === 'month') {
        setSelectedHolidayMonths([]);
        setSelectedUnavailableMonths([]);
        setSelectedDaysInMonth({});
        setExpandedMonthForDays(null);
      } else if (type === 'week') {
        setSelectedHolidayWeeks([]);
        setSelectedUnavailableWeeks([]);
      } else {
        if (availabilityType === 'holiday') {
          setSelectedHolidayDays([]);
        } else {
          setSelectedUnavailableDays([]);
        }
      }
      
      if (availabilityType === 'holiday') {
        setBulkHolidayNameBulk('');
      }
      
      fetchYearAvailability();
    } catch (error) {
      console.error('Error setting bulk availability:', error);
      toast.error(error.response?.data?.message || 'Failed to set bulk availability');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSetHolidays = async () => {
    if (!selectedDoctor || selectedDates.length === 0 || !bulkHolidayName) {
      toast.error('Please select dates and provide a holiday name');
      return;
    }
    try {
      setLoading(true);
      await API.post('/doctor-calendar/bulk-holidays', {
        doctorId: selectedDoctor,
        dates: selectedDates,
        holidayName: bulkHolidayName
      });
      toast.success(`Successfully set ${selectedDates.length} holidays`);
      setShowHolidayModal(false);
      setSelectedDates([]);
      setBulkHolidayName('');
      fetchYearAvailability();
    } catch (error) {
      console.error('Error setting holidays:', error);
      toast.error('Failed to set holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlots = async () => {
    if (!selectedDoctor || !selectedDate) {
      toast.error('Please select a doctor and date');
      return;
    }
    try {
      setLoading(true);
      const response = await API.post('/doctor-calendar/slots/create', {
        doctorId: selectedDoctor,
        date: selectedDate,
        ...slotSettings
      });
      toast.success(`Successfully created ${response.data.slotsCreated} appointment slots`);
      fetchSlots();
    } catch (error) {
      console.error('Error creating slots:', error);
      toast.error(error.response?.data?.message || 'Failed to create slots');
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
        const dateStr = formatDateString(date);
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
    if (data.isAvailable === false) return 'unavailable';
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
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const allWeeks = getAllWeeksInYear(currentYear);

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
          onClick={() => setActiveTab('defaultHours')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'defaultHours'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Default Working Hours
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

      {/* Default Working Hours Tab */}
      {activeTab === 'defaultHours' && selectedDoctor && (
        <div className="space-y-6">
          {/* Default Working Hours Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Set Default Working Hours
              </h2>
              <p className="text-gray-600">Set default working hours for <span className="font-semibold text-blue-600">{getSelectedDoctorName()}</span> for all days in <span className="font-semibold text-blue-600">{currentYear}</span></p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={defaultHours.startTime}
                      onChange={(e) => setDefaultHours({ ...defaultHours, startTime: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={defaultHours.endTime}
                      onChange={(e) => setDefaultHours({ ...defaultHours, endTime: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Break Start Time
                    </label>
                    <input
                      type="time"
                      value={defaultHours.breakStartTime}
                      onChange={(e) => setDefaultHours({ ...defaultHours, breakStartTime: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Break End Time
                    </label>
                    <input
                      type="time"
                      value={defaultHours.breakEndTime}
                      onChange={(e) => setDefaultHours({ ...defaultHours, breakEndTime: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Appointments per Day
                  </label>
                  <input
                    type="number"
                    value={defaultHours.maxAppointments}
                    onChange={(e) => setDefaultHours({ ...defaultHours, maxAppointments: parseInt(e.target.value) })}
                    className="w-full md:w-48 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    min="1"
                  />
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Minimum Consultation Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={defaultHours.slotDuration}
                    onChange={(e) => setDefaultHours({ ...defaultHours, slotDuration: parseInt(e.target.value) })}
                    className="w-full md:w-48 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    min="15"
                    step="15"
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 30 minutes. This determines the duration of each appointment slot.</p>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={defaultHours.excludeSundays}
                      onChange={(e) => setDefaultHours({ ...defaultHours, excludeSundays: e.target.checked })}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Exclude Sundays (keep Sundays as holidays)</span>
                  </label>
                  <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={defaultHours.overrideExisting}
                      onChange={(e) => setDefaultHours({ ...defaultHours, overrideExisting: e.target.checked })}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Override existing custom settings (if unchecked, only unset days will be updated)</span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5">
                <div className="flex items-start">
                  <Info className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-bold mb-2 text-base">Important Information</p>
                    <ul className="list-disc list-inside space-y-1.5 text-gray-700">
                      <li>This will set default working hours for all weekdays in <strong>{currentYear}</strong></li>
                      <li>Sundays will remain as holidays (if "Exclude Sundays" is checked)</li>
                      <li>Existing holidays will be preserved unless "Override existing" is checked</li>
                      <li>You can edit individual days from the Calendar view if you need to customize specific dates</li>
                      <li>After setting defaults, you can mark holidays using the bulk options below</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSetDefaultHours}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                {loading ? 'Applying...' : `Apply Default Hours to All Days in ${currentYear}`}
              </button>
            </div>
          </div>

          {/* Bulk Availability Management Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Bulk Set Holidays or Unavailable Days
              </h2>
              <p className="text-gray-600">Quickly set multiple dates as holidays or unavailable for <span className="font-semibold text-blue-600">{getSelectedDoctorName()}</span></p>
            </div>
            <div className="space-y-8">
              {/* Month-wise */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  By Month
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                  {monthNames.map((month, idx) => {
                    const isSelected = selectedHolidayMonths.includes(idx) || selectedUnavailableMonths.includes(idx);
                    const isExpanded = expandedMonthForDays === idx;
                    return (
                      <div key={idx} className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all">
                        <label className="flex items-center space-x-2 p-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Add to holiday months list (default), user will choose holiday/unavailable later
                                if (!selectedHolidayMonths.includes(idx) && !selectedUnavailableMonths.includes(idx)) {
                                  setSelectedHolidayMonths([...selectedHolidayMonths, idx]);
                                }
                              } else {
                                setSelectedHolidayMonths(selectedHolidayMonths.filter(m => m !== idx));
                                setSelectedUnavailableMonths(selectedUnavailableMonths.filter(m => m !== idx));
                                // Clear selected days for this month
                                const updated = { ...selectedDaysInMonth };
                                delete updated[idx];
                                setSelectedDaysInMonth(updated);
                                if (expandedMonthForDays === idx) {
                                  setExpandedMonthForDays(null);
                                }
                              }
                            }}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700 flex-1">{month}</span>
                          {isSelected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedMonthForDays(isExpanded ? null : idx);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1"
                            >
                              {isExpanded ? 'Hide Days' : 'Select Days'}
                            </button>
                          )}
                        </label>
                        {/* Day selection grid for expanded month */}
                        {isExpanded && isSelected && (
                          <div className="p-3 border-t border-gray-200 bg-gray-50">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Select individual days:</p>
                            <div className="grid grid-cols-7 gap-1">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <div key={i} className="text-xs font-medium text-center text-gray-500 py-1">
                                  {day}
                                </div>
                              ))}
                              {(() => {
                                const firstDay = new Date(currentYear, idx, 1);
                                const lastDay = new Date(currentYear, idx + 1, 0);
                                const daysInMonth = lastDay.getDate();
                                const startingDayOfWeek = firstDay.getDay();
                                const days = [];
                                // Add empty cells for days before month starts
                                for (let i = 0; i < startingDayOfWeek; i++) {
                                  days.push(null);
                                }
                                // Add days of month
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const date = new Date(currentYear, idx, day);
                                  days.push(formatDateString(date));
                                }
                                const monthSelectedDays = selectedDaysInMonth[idx] || [];
                                return days.map((dateStr, dayIdx) => {
                                  if (!dateStr) {
                                    return <div key={dayIdx} className="h-6"></div>;
                                  }
                                  const isDaySelected = monthSelectedDays.includes(dateStr);
                                  return (
                                    <button
                                      key={dayIdx}
                                      onClick={() => {
                                        const current = monthSelectedDays;
                                        const updated = isDaySelected
                                          ? current.filter(d => d !== dateStr)
                                          : [...current, dateStr];
                                        setSelectedDaysInMonth({
                                          ...selectedDaysInMonth,
                                          [idx]: updated
                                        });
                                      }}
                                      className={`h-6 text-xs rounded transition-all ${
                                        isDaySelected
                                          ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                          : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-200'
                                      }`}
                                      title={new Date(dateStr).toLocaleDateString()}
                                    >
                                      {new Date(dateStr).getDate()}
                                    </button>
                                  );
                                                                 });
                               })()}
                             </div>
                             {(selectedDaysInMonth[idx] || []).length > 0 && (
                               <p className="text-xs text-blue-600 mt-2 font-medium">
                                 {(selectedDaysInMonth[idx] || []).length} day(s) selected
                               </p>
                             )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(selectedHolidayMonths.length > 0 || selectedUnavailableMonths.length > 0 || Object.values(selectedDaysInMonth).some(days => days.length > 0)) && (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        value={bulkHolidayNameBulk}
                        onChange={(e) => setBulkHolidayNameBulk(e.target.value)}
                        placeholder="Holiday name (required for holidays)"
                        className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={async () => {
                          // Check if any month has selected days, if so use those, otherwise use entire months
                          const hasSelectedDays = Object.values(selectedDaysInMonth).some(days => days.length > 0);
                          if (hasSelectedDays) {
                            // Use selected days from expanded months
                            const allSelectedDays = Object.values(selectedDaysInMonth).flat();
                            if (allSelectedDays.length === 0) {
                              toast.error('Please select at least one day');
                              return;
                            }
                            try {
                              setLoading(true);
                              await API.post('/doctor-calendar/bulk-holidays', {
                                doctorId: selectedDoctor,
                                dates: allSelectedDays,
                                holidayName: bulkHolidayNameBulk,
                                year: currentYear
                              });
                              toast.success(`Successfully set ${allSelectedDays.length} days as holidays`);
                              setSelectedDaysInMonth({});
                              setSelectedHolidayMonths([]);
                              setSelectedUnavailableMonths([]);
                              setBulkHolidayNameBulk('');
                              fetchYearAvailability();
                            } catch (error) {
                              console.error('Error setting holidays:', error);
                              toast.error(error.response?.data?.message || 'Failed to set holidays');
                            } finally {
                              setLoading(false);
                            }
                          } else {
                            // Use entire selected months
                            handleBulkSetAvailability('month', 'holiday');
                          }
                        }}
                        disabled={loading || (selectedHolidayMonths.length === 0 && selectedUnavailableMonths.length === 0 && Object.values(selectedDaysInMonth).every(days => days.length === 0)) || !bulkHolidayNameBulk.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Set as Holidays
                      </button>
                      <button
                        onClick={async () => {
                          // Check if any month has selected days, if so use those, otherwise use entire months
                          const hasSelectedDays = Object.values(selectedDaysInMonth).some(days => days.length > 0);
                          if (hasSelectedDays) {
                            // Use selected days from expanded months
                            const allSelectedDays = Object.values(selectedDaysInMonth).flat();
                            if (allSelectedDays.length === 0) {
                              toast.error('Please select at least one day');
                              return;
                            }
                            try {
                              setLoading(true);
                              await API.post('/doctor-calendar/bulk-availability', {
                                doctorId: selectedDoctor,
                                dates: allSelectedDays,
                                isAvailable: false,
                                year: currentYear
                              });
                              toast.success(`Successfully set ${allSelectedDays.length} days as unavailable`);
                              setSelectedDaysInMonth({});
                              setSelectedHolidayMonths([]);
                              setSelectedUnavailableMonths([]);
                              fetchYearAvailability();
                            } catch (error) {
                              console.error('Error setting unavailable:', error);
                              toast.error(error.response?.data?.message || 'Failed to set unavailable');
                            } finally {
                              setLoading(false);
                            }
                          } else {
                            // Use entire selected months
                            handleBulkSetAvailability('month', 'unavailable');
                          }
                        }}
                        disabled={loading || (selectedHolidayMonths.length === 0 && selectedUnavailableMonths.length === 0 && Object.values(selectedDaysInMonth).every(days => days.length === 0))}
                        className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Set as Unavailable
                      </button>
                      <button
                        onClick={async () => {
                          // Check if any month has selected days, if so use those, otherwise use entire months
                          const hasSelectedDays = Object.values(selectedDaysInMonth).some(days => days.length > 0);
                          if (hasSelectedDays) {
                            // Use selected days from expanded months
                            const allSelectedDays = Object.values(selectedDaysInMonth).flat();
                            if (allSelectedDays.length === 0) {
                              toast.error('Please select at least one day');
                              return;
                            }
                            try {
                              setLoading(true);
                              await API.post('/doctor-calendar/bulk-availability', {
                                doctorId: selectedDoctor,
                                dates: allSelectedDays,
                                isAvailable: true,
                                year: currentYear
                              });
                              toast.success(`Successfully set ${allSelectedDays.length} days as available`);
                              setSelectedDaysInMonth({});
                              setSelectedHolidayMonths([]);
                              setSelectedUnavailableMonths([]);
                              fetchYearAvailability();
                            } catch (error) {
                              console.error('Error setting available:', error);
                              toast.error(error.response?.data?.message || 'Failed to set available');
                            } finally {
                              setLoading(false);
                            }
                          } else {
                            // Use entire selected months
                            handleBulkSetAvailability('month', 'available');
                          }
                        }}
                        disabled={loading || (selectedHolidayMonths.length === 0 && selectedUnavailableMonths.length === 0 && Object.values(selectedDaysInMonth).every(days => days.length === 0))}
                        className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Set as Available
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Week-wise */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  By Week
                </h4>
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto mb-4 shadow-inner">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {allWeeks.map((week) => (
                      <label key={week.weekNum} className="flex items-center space-x-2 p-2 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={
                            (selectedHolidayWeeks.includes(week.weekNum) || selectedUnavailableWeeks.includes(week.weekNum))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (!selectedHolidayWeeks.includes(week.weekNum) && !selectedUnavailableWeeks.includes(week.weekNum)) {
                                setSelectedHolidayWeeks([...selectedHolidayWeeks, week.weekNum]);
                              }
                            } else {
                              setSelectedHolidayWeeks(selectedHolidayWeeks.filter(w => w !== week.weekNum));
                              setSelectedUnavailableWeeks(selectedUnavailableWeeks.filter(w => w !== week.weekNum));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{week.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {(selectedHolidayWeeks.length > 0 || selectedUnavailableWeeks.length > 0) && (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        value={bulkHolidayNameBulk}
                        onChange={(e) => setBulkHolidayNameBulk(e.target.value)}
                        placeholder="Holiday name (required for holidays)"
                        className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleBulkSetAvailability('week', 'holiday')}
                        disabled={loading || selectedHolidayWeeks.length === 0 || !bulkHolidayNameBulk.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Set as Holidays
                      </button>
                      <button
                        onClick={() => handleBulkSetAvailability('week', 'unavailable')}
                        disabled={loading || (selectedHolidayWeeks.length === 0 && selectedUnavailableWeeks.length === 0)}
                        className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Set as Unavailable
                      </button>
                      <button
                        onClick={() => handleBulkSetAvailability('week', 'available')}
                        disabled={loading || (selectedHolidayWeeks.length === 0 && selectedUnavailableWeeks.length === 0)}
                        className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Set as Available
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Day-wise */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <CalendarX className="h-5 w-5 mr-2 text-blue-600" />
                  By Individual Days
                </h4>
                <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-4">
                    Select individual dates from the calendar view below or use the calendar to pick specific dates, then use the "Bulk Set Holidays" button above to set them as holidays.
                  </p>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">Quick Selection</p>
                      <p className="text-sm text-blue-700">Go to the "12-Month Calendar" tab to select specific dates</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('calendar');
                        setShowHolidayModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      Open Calendar
                    </button>
                  </div>
                  {selectedDates.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Selected Dates ({selectedDates.length}):
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                        {selectedDates.map((date, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-2"
                          >
                            {new Date(date).toLocaleDateString()}
                            <button
                              onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))}
                              className="hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        title={data?.isHoliday ? data.holidayName : data?.isAvailable === false ? 'Unavailable' : data?.isAvailable ? 'Available' : 'Not Set'}
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
              {/* Radio buttons for availability status */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="availabilityStatus"
                    checked={availability.isAvailable && !availability.isHoliday}
                    onChange={() => setAvailability({ ...availability, isAvailable: true, isHoliday: false })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Available on this date</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="availabilityStatus"
                    checked={availability.isHoliday}
                    onChange={() => setAvailability({ ...availability, isHoliday: true, isAvailable: false })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Mark as Holiday</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="availabilityStatus"
                    checked={!availability.isAvailable && !availability.isHoliday}
                    onChange={() => setAvailability({ ...availability, isAvailable: false, isHoliday: false })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Unavailable</span>
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

              {!availability.isHoliday && !availability.isAvailable && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time (optional, saved for future use)
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
                        End Time (optional, saved for future use)
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
                        Break Start (optional)
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
                        Break End (optional)
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
                      Max Appointments (optional)
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

      {/* Slots Tab */}
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
