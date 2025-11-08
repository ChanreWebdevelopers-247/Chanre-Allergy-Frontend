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
  XCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  CalendarCheck,
  Phone
} from 'lucide-react';

export default function BookSlot() {
  const { user } = useSelector((state) => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [patientAppointmentId, setPatientAppointmentId] = useState(null);
  
  // Calendar view states
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthAvailability, setMonthAvailability] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [onlineAppointments, setOnlineAppointments] = useState([]);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [expandedDates, setExpandedDates] = useState({}); // Track which dates have expanded slots
  const [dateSlots, setDateSlots] = useState({}); // Store slots for multiple dates
  const [loadingDates, setLoadingDates] = useState({}); // Track loading state per date
  const [cancelingSlotId, setCancelingSlotId] = useState(null);

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
    if (selectedDoctor) {
      const loadData = async () => {
        const availabilityMap = await fetchMonthAvailability();
        if (viewMode === 'list') {
          await fetchAvailableDatesWithSlots();
        } else if (viewMode === 'calendar') {
          // Use the availabilityMap we just fetched
          await fetchSlotsForCurrentMonth(availabilityMap);
        }
      };
      loadData();
    }
  }, [selectedDoctor, currentMonth, currentYear, viewMode]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const centerId = user?.centerId?._id || user?.centerId;
      const response = await API.get('/doctor-calendar/doctors', {
        params: { centerId }
      });
      setDoctors(response.data.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
    }
  };

  const fetchMonthAvailability = async () => {
    if (!selectedDoctor) return;
    try {
      setAvailabilityLoading(true);
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
      
      const response = await API.get('/doctor-calendar/month-availability', {
        params: {
          doctorId: selectedDoctor,
          startDate,
          endDate
        }
      });
      
      const dateMap = {};
      response.data.availabilities.forEach(avail => {
        const dateStr = formatDateString(avail.date);
        if (dateStr) {
          dateMap[dateStr] = avail;
        }
      });
      
      console.log(`Fetched ${response.data.availabilities.length} availability records for ${startDate} to ${endDate}`);
      
      // Log first record from raw response
      if (response.data.availabilities.length > 0) {
        console.log('First raw availability record:', JSON.stringify(response.data.availabilities[0], null, 2));
      }
      
      const sampleRecords = Object.values(dateMap).slice(0, 5);
      console.log('Sample availability records from dateMap:', sampleRecords);
      
      // Check if records have startTime and endTime
      const recordsWithTimes = sampleRecords.filter(avail => avail.startTime && avail.endTime);
      console.log(`Records with startTime/endTime: ${recordsWithTimes.length} out of ${sampleRecords.length}`);
      
      if (recordsWithTimes.length > 0) {
        console.log('Sample record with times:', recordsWithTimes[0]);
      } else if (sampleRecords.length > 0) {
        console.log('Sample record without times (showing all fields):', sampleRecords[0]);
        console.log('Available fields:', Object.keys(sampleRecords[0]));
      }
      
      setMonthAvailability(dateMap);
      return dateMap; // Return the dateMap so it can be used immediately
    } catch (error) {
      console.error('Error fetching availability:', error);
      return {};
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const fetchDayAppointments = async () => {
    if (!selectedDoctor || !selectedDate) return [];
    try {
      const response = await API.get('/doctor-calendar/day-appointments', {
        params: {
          doctorId: selectedDoctor,
          date: selectedDate
        }
      });
      setOnlineAppointments(response.data.appointments || []);
      return response.data.appointments || [];
    } catch (error) {
      console.error('Error fetching day appointments:', error);
      setOnlineAppointments([]);
      return [];
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
      // Also store in dateSlots for list view
      if (response.data.slots) {
        setDateSlots(prev => ({
          ...prev,
          [selectedDate]: response.data.slots
        }));
      }
      await fetchDayAppointments();
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlotsForDate = async (dateStr) => {
    if (!selectedDoctor || !dateStr) return;
    try {
      setLoadingDates(prev => ({ ...prev, [dateStr]: true }));
      const response = await API.get('/doctor-calendar/slots', {
        params: {
          doctorId: selectedDoctor,
          date: dateStr
        }
      });
      const slots = response.data.slots || [];
      setDateSlots(prev => ({
        ...prev,
        [dateStr]: slots
      }));
      return slots;
    } catch (error) {
      console.error(`Error fetching slots for ${dateStr}:`, error);
      return [];
    } finally {
      setLoadingDates(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  const fetchSlotsForCurrentMonth = async (availabilityMap) => {
    if (!selectedDoctor) return;
    
    try {
      // Get all dates in the current month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const today = new Date().toISOString().split('T')[0];
      
      const datesToFetch = [];
      const current = new Date(firstDay);
      
      while (current <= lastDay) {
        const dateStr = formatDateString(current);
        if (dateStr >= today) {
          const avail = availabilityMap?.[dateStr] || monthAvailability[dateStr];
          // Only fetch for available dates (or dates without explicit unavailability)
          if (!avail || (avail.isAvailable !== false && !avail.isHoliday)) {
            datesToFetch.push(dateStr);
          }
        }
        current.setDate(current.getDate() + 1);
      }
      
      // Fetch slots for all dates in parallel (batch requests)
      const batchSize = 10; // Process 10 dates at a time to avoid overwhelming the server
      for (let i = 0; i < datesToFetch.length; i += batchSize) {
        const batch = datesToFetch.slice(i, i + batchSize);
        await Promise.all(batch.map(dateStr => fetchSlotsForDate(dateStr)));
      }
    } catch (error) {
      console.error('Error fetching slots for current month:', error);
    }
  };

  const fetchAvailableDatesWithSlots = async () => {
    if (!selectedDoctor) return;
    try {
      setAvailabilityLoading(true);
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
      
      const response = await API.get('/doctor-calendar/month-availability', {
        params: {
          doctorId: selectedDoctor,
          startDate,
          endDate
        }
      });
      
      const dateMap = {};
      const availableDates = [];
      response.data.availabilities.forEach(avail => {
        const dateStr = formatDateString(avail.date);
        if (dateStr) {
          dateMap[dateStr] = avail;
          if (avail.isAvailable && !avail.isHoliday) {
            const today = new Date().toISOString().split('T')[0];
            if (dateStr >= today) {
              availableDates.push(dateStr);
            }
          }
        }
      });
      setMonthAvailability(dateMap);

      // Fetch slots for all available dates
      const today = new Date().toISOString().split('T')[0];
      const datesToFetch = availableDates.filter(d => d >= today).slice(0, 30); // Limit to first 30 dates
      
      for (const dateStr of datesToFetch) {
        await fetchSlotsForDate(dateStr);
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Calculate expected slots based on availability times
  const calculateExpectedSlots = (dateStr) => {
    const availability = monthAvailability[dateStr];
    if (!availability || !availability.startTime || !availability.endTime) {
      return null; // Can't calculate without times
    }

    const startTime = availability.startTime;
    const endTime = availability.endTime;
    const breakStartTime = availability.breakStartTime;
    const breakEndTime = availability.breakEndTime;
    const slotDuration = 30; // 30 minutes per slot

    // Parse times
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes; // Convert to minutes
    };

    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const breakStartMinutes = breakStartTime ? parseTime(breakStartTime) : null;
    const breakEndMinutes = breakEndTime ? parseTime(breakEndTime) : null;

    let currentMinutes = startMinutes;
    let slotCount = 0;

    while (currentMinutes + slotDuration <= endMinutes) {
      // Skip break time if exists
      if (breakStartMinutes && breakEndMinutes) {
        if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
          currentMinutes = breakEndMinutes;
          continue;
        }
      }
      slotCount++;
      currentMinutes += slotDuration;
    }

    return slotCount;
  };

  // Generate expected time slots based on availability times
  const generateExpectedTimeSlots = (dateStr) => {
    const availability = monthAvailability[dateStr];
    
    // If no availability record exists, check if we can use default times
    // For dates without explicit records, we can't generate expected slots
    if (!availability) {
      console.log(`No availability record for ${dateStr}`);
      return [];
    }
    
    if (!availability.startTime || !availability.endTime) {
      console.log(`Availability record for ${dateStr} missing times:`, {
        startTime: availability.startTime,
        endTime: availability.endTime,
        isAvailable: availability.isAvailable
      });
      return [];
    }
    
    console.log(`Generating expected slots for ${dateStr}:`, {
      startTime: availability.startTime,
      endTime: availability.endTime,
      breakStartTime: availability.breakStartTime,
      breakEndTime: availability.breakEndTime
    });

    const startTime = availability.startTime;
    const endTime = availability.endTime;
    const breakStartTime = availability.breakStartTime;
    const breakEndTime = availability.breakEndTime;
    const slotDuration = 30; // 30 minutes per slot

    // Parse times
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes; // Convert to minutes
    };

    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const breakStartMinutes = breakStartTime ? parseTime(breakStartTime) : null;
    const breakEndMinutes = breakEndTime ? parseTime(breakEndTime) : null;

    const slots = [];
    let currentMinutes = startMinutes;

    while (currentMinutes + slotDuration <= endMinutes) {
      // Skip break time if exists
      if (breakStartMinutes && breakEndMinutes) {
        if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
          currentMinutes = breakEndMinutes;
          continue;
        }
      }

      const slotStartTime = formatTime(currentMinutes);
      const slotEndTime = formatTime(currentMinutes + slotDuration);

      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        isBooked: false,
        isExpected: true // Mark as expected slot
      });

      currentMinutes += slotDuration;
    }

    console.log(`Generated ${slots.length} expected slots for ${dateStr}`);
    return slots;
  };

  const getExpectedSlotsCount = (dateStr) => {
    const availability = monthAvailability[dateStr];
    if (!availability || availability.isHoliday || availability.isAvailable === false) {
      return null;
    }
    // Check if availability has startTime and endTime
    if (!availability.startTime || !availability.endTime) {
      return null;
    }
    return calculateExpectedSlots(dateStr);
  };

  const getDateStatus = (dateStr) => {
    const availability = monthAvailability[dateStr];
    const today = new Date().toISOString().split('T')[0];
    
    // Past dates are always unavailable
    if (dateStr < today) {
      return 'past';
    }
    
    // If no availability record exists, treat as available (default working hours)
    if (!availability) {
      return 'available';
    }
    
    // If it's explicitly marked as holiday or unavailable
    if (availability.isHoliday) return 'holiday';
    if (availability.isAvailable === false) return 'unavailable';
    
    // Otherwise, it's available
    return 'available';
  };

  const isDateAvailable = (dateStr) => {
    const status = getDateStatus(dateStr);
    return status === 'available';
  };

  const handleDateClick = async (dateStr) => {
    if (!dateStr) return;
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) {
      toast.error('Cannot select past dates');
      return;
    }
    
    const status = getDateStatus(dateStr);
    if (status === 'holiday' || status === 'unavailable') {
      toast.error('Doctor is not available on this date');
      return;
    }
    
    // If same date is clicked, don't do anything
    if (dateStr === selectedDate) {
      return;
    }
    
    // Set the selected date - this will trigger useEffect to fetch slots
    setSelectedDate(dateStr);
  };

  const toggleDateExpansion = async (dateStr) => {
    if (!dateStr) return;
    
    // Toggle expansion state
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));

    // If expanding and slots not loaded, fetch them
    if (!expandedDates[dateStr] && !dateSlots[dateStr]) {
      await fetchSlotsForDate(dateStr);
    }
  };

  const getAvailableSlotsCount = (dateStr) => {
    const slots = dateSlots[dateStr];
    if (!slots) return null;
    return slots.filter(s => !s.isBooked).length;
  };

  const getBookedSlotsCount = (dateStr) => {
    const slots = dateSlots[dateStr];
    if (!slots) return null;
    return slots.filter(s => s.isBooked).length;
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    const days = [];
    const current = new Date(startDate);
    
    while (days.length < 42) { // 6 weeks
      const dateStr = formatDateString(current);
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        isCurrentMonth: current.getMonth() === currentMonth,
        isToday: dateStr === formatDateString(new Date())
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleExpectedSlotClick = async (expectedSlot) => {
    if (!selectedDoctor || !selectedDate) {
      console.error('Missing doctor or date:', { selectedDoctor, selectedDate });
      return;
    }
    
    console.log('handleExpectedSlotClick called with:', expectedSlot);
    
    try {
      setLoading(true);
      
      // First, refresh slots to check if they were created in the background
      console.log('Fetching slots for:', { doctorId: selectedDoctor, date: selectedDate });
      const response = await API.get('/doctor-calendar/slots', {
        params: {
          doctorId: selectedDoctor,
          date: selectedDate
        }
      });
      const fetchedSlots = response.data.slots || [];
      console.log(`Fetched ${fetchedSlots.length} slots from API`);
      setSlots(fetchedSlots);
      
      // Also update dateSlots for list view
      setDateSlots(prev => ({
        ...prev,
        [selectedDate]: fetchedSlots
      }));
      
      // If slots still don't exist, try to create them (for both centeradmin and receptionist)
      if (fetchedSlots.length === 0) {
        console.log('No slots found, attempting to create them...');
        const availability = monthAvailability[selectedDate];
        
        // Check if availability times are set
        if (!availability || !availability.startTime || !availability.endTime) {
          toast.error('Availability times not set for this date. Please contact the center administrator.');
          setLoading(false);
          return;
        }
        
        // Check if doctor is explicitly unavailable or on holiday
        if (availability.isHoliday) {
          toast.error('Doctor is on holiday on this date.');
          setLoading(false);
          return;
        }
        
        if (availability.isAvailable === false) {
          toast.error('Doctor is marked as unavailable on this date.');
          setLoading(false);
          return;
        }
        
        const startTime = availability.startTime;
        const endTime = availability.endTime;
        const breakStartTime = availability.breakStartTime || null;
        const breakEndTime = availability.breakEndTime || null;
        
        try {
          console.log('Creating slots with:', { 
            doctorId: selectedDoctor, 
            date: selectedDate,
            startTime, 
            endTime, 
            breakStartTime, 
            breakEndTime 
          });
          
          const createSlotResponse = await API.post('/doctor-calendar/slots/create', {
            doctorId: selectedDoctor,
            date: selectedDate,
            slotDuration: 30,
            startTime: startTime,
            endTime: endTime,
            breakStartTime: breakStartTime,
            breakEndTime: breakEndTime
          });
          
          console.log('Slots created successfully:', createSlotResponse.data);
          
          // Wait a moment for database to update, then refresh slots
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh slots after creation
          const fetchResponse = await API.get('/doctor-calendar/slots', {
            params: {
              doctorId: selectedDoctor,
              date: selectedDate
            }
          });
          const newSlots = fetchResponse.data.slots || [];
          console.log(`Fetched ${newSlots.length} slots after creation`);
          console.log('All created slots:', newSlots.map(s => `${s.startTime}-${s.endTime}`));
          
          setSlots(newSlots);
          setDateSlots(prev => ({
            ...prev,
            [selectedDate]: newSlots
          }));
          
          // Find the matching slot
          const matchingSlot = newSlots.find(s => 
            s.startTime === expectedSlot.startTime && 
            s.endTime === expectedSlot.endTime && 
            !s.isBooked
          );
          
          if (matchingSlot) {
            console.log('Found matching slot, opening booking modal:', matchingSlot);
            setLoading(false); // Stop loading before opening modal
            openBookingModal(matchingSlot);
            return;
          } else {
            console.error('Slot created but not found. Expected:', `${expectedSlot.startTime}-${expectedSlot.endTime}`);
            console.error('All created slots:', newSlots.map(s => `${s.startTime}-${s.endTime}`));
            toast.error('Slot created but not found. Please try clicking the slot again.');
            setLoading(false);
            return;
          }
        } catch (createError) {
          console.error('Error creating slots:', createError);
          console.error('Error response:', createError.response?.data);
          console.error('Error status:', createError.response?.status);
          
          if (createError.response?.status === 403) {
            toast.error('You do not have permission to create slots. Please contact the center administrator.');
            setLoading(false);
            return;
          }
          
          if (createError.response?.status === 400) {
            toast.error(createError.response?.data?.message || 'Cannot create slots: ' + createError.message);
            setLoading(false);
            return;
          }
          
          toast.error(createError.response?.data?.message || 'Failed to create slots. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // If we reach here, slots already exist - find matching one
      console.log('Slots already exist, finding matching slot...');
      const currentSlots = dateSlots[selectedDate] || fetchedSlots;
      console.log('Looking for matching slot:', {
        expectedSlot: expectedSlot,
        currentSlotsCount: currentSlots.length,
        expectedTime: `${expectedSlot.startTime}-${expectedSlot.endTime}`,
        currentSlots: currentSlots.slice(0, 5).map(s => `${s.startTime}-${s.endTime}`)
      });
      
      const matchingSlot = currentSlots.find(s => 
        s.startTime === expectedSlot.startTime && 
        s.endTime === expectedSlot.endTime && 
        !s.isBooked
      );
      
      console.log('Matching slot found:', matchingSlot);
      
      if (matchingSlot) {
        console.log('Opening booking modal with slot:', matchingSlot);
        setLoading(false); // Stop loading before opening modal
        openBookingModal(matchingSlot);
      } else {
        console.error('No matching slot found. Expected:', `${expectedSlot.startTime}-${expectedSlot.endTime}`);
        console.error('Available slots:', currentSlots.map(s => `${s.startTime}-${s.endTime}`));
        toast.error('Slot not found. It may have been booked or removed. Please select another slot.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error handling expected slot click:', error);
      toast.error(error.response?.data?.message || 'Failed to process slot. Please try again.');
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
      const bookedDate = selectedDate;
      setSelectedSlot(null);
      setSelectedPatient(null);
      setPatientAppointmentId(null);
      setSearchQuery('');
      
      // Refresh slots for the booked date
      if (viewMode === 'calendar') {
        await fetchSlots();
      } else {
        // Refresh slots in list view
        await fetchSlotsForDate(bookedDate);
      }
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error(error.response?.data?.message || 'Failed to book slot');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSlot = async (slot) => {
    if (!slot?._id) {
      toast.error('Slot information is missing');
      return;
    }

    const dateStr = slot.date ? formatDateString(slot.date) : selectedDate;

    const confirmCancel = window.confirm('Cancel this appointment and restore the slot?');
    if (!confirmCancel) return;

    try {
      setCancelingSlotId(slot._id);

      await API.post('/doctor-calendar/slots/cancel', {
        slotId: slot._id,
        cancellationReason: ''
      });

      toast.success('Appointment cancelled and slot restored');

      if (dateStr === selectedDate) {
        await fetchSlots();
      } else if (dateStr) {
        await fetchSlotsForDate(dateStr);
      } else if (selectedDate) {
        await fetchSlots();
      }
    } catch (error) {
      console.error('Error cancelling slot:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancelingSlotId(null);
    }
  };

  const openBookingModal = (slot) => {
    console.log('openBookingModal called with:', slot);
    if (!slot) {
      console.error('No slot provided to openBookingModal');
      toast.error('Slot information is missing');
      return;
    }
    if (slot.isBooked) {
      toast.info('This slot is already booked');
      return;
    }
    // Only require _id for actual slots (not expected slots)
    if (!slot._id) {
      console.error('Slot missing _id:', slot);
      toast.error('Slot not found. Please try again.');
      return;
    }
    console.log('Setting selected slot and opening modal');
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  const getSelectedDoctorName = () => {
    const doctor = doctors.find(d => d._id === selectedDoctor);
    return doctor ? doctor.name : 'Select Doctor';
  };

  const availableSlots = slots.filter(s => !s.isBooked);
  const bookedSlots = slots.filter(s => s.isBooked);
  const calendarDays = generateCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get all available dates for list view
  const getAvailableDatesList = () => {
    const today = new Date().toISOString().split('T')[0];
    const availableDates = [];
    const seenDates = new Set();
    
    // Add dates with explicit availability records
    Object.keys(monthAvailability).forEach(dateStr => {
      const avail = monthAvailability[dateStr];
      if (dateStr >= today && avail.isAvailable && !avail.isHoliday) {
        availableDates.push(dateStr);
        seenDates.add(dateStr);
      }
    });
    
    // Also generate dates for the next 60 days that don't have explicit records
    // These are treated as available by default
    const startDate = new Date(today);
    for (let i = 0; i < 60; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateString(date);
      
      if (!seenDates.has(dateStr)) {
        // Check if this date is explicitly unavailable or holiday
        const avail = monthAvailability[dateStr];
        if (!avail || (avail.isAvailable !== false && !avail.isHoliday)) {
          availableDates.push(dateStr);
          seenDates.add(dateStr);
        }
      }
    }
    
    return availableDates.sort().slice(0, 60);
  };

  return (
    <div className="px-1 py-2 w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
            <CalendarCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Book Appointment Slot</h1>
            <p className="text-gray-600 text-sm">Assign patients to available doctor appointment slots</p>
          </div>
        </div>
      </div>

      {/* Doctor Selection Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-blue-600" />
          Select Doctor
        </label>
        <select
          value={selectedDoctor || ''}
          onChange={(e) => {
            setSelectedDoctor(e.target.value);
            setSelectedDate(null);
            setSlots([]);
          }}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
        >
          <option value="">Select a doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor._id} value={doctor._id}>
              {doctor.name} {doctor.qualification ? `(${doctor.qualification})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedDoctor && (
        <>
          {/* View Mode Toggle */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">View Mode:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Calendar View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  List View (All Dates)
                </button>
              </div>
            </div>
          </div>

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Available Dates & Slots</h2>
                  <p className="text-xs text-gray-500">Click on any date to expand and view available slots</p>
                </div>
              </div>

              {availabilityLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading available dates...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {getAvailableDatesList().length > 0 ? (
                    getAvailableDatesList().map((dateStr) => {
                      const avail = monthAvailability[dateStr];
                      const slotsForDate = dateSlots[dateStr] || [];
                      const availableCount = getAvailableSlotsCount(dateStr);
                      const bookedCount = getBookedSlotsCount(dateStr);
                      const expectedSlotsCount = getExpectedSlotsCount(dateStr);
                      // Show expected slots if actual slots haven't been fetched
                      const displayAvailableCount = slotsForDate.length > 0 
                        ? availableCount 
                        : (expectedSlotsCount !== null ? expectedSlotsCount : null);
                      const isExpanded = expandedDates[dateStr];
                      const isLoading = loadingDates[dateStr];

                      return (
                        <div
                          key={dateStr}
                          className="border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                        >
                          <button
                            onClick={() => toggleDateExpansion(dateStr)}
                            className="w-full p-4 text-left hover:bg-gray-50 rounded-lg transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center min-w-[60px]">
                                  <div className="text-xs text-gray-500 uppercase">
                                    {dayNames[new Date(dateStr).getDay()]}
                                  </div>
                                  <div className="text-2xl font-bold text-gray-800">
                                    {new Date(dateStr).getDate()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {monthNames[new Date(dateStr).getMonth()]}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800 mb-1">
                                    {new Date(dateStr).toLocaleDateString('en-GB', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  {avail && (
                                    <div className="text-sm text-gray-600">
                                      <span className="font-medium">Working Hours:</span>{' '}
                                      {avail.startTime} - {avail.endTime}
                                      {avail.breakStartTime && (
                                        <span className="ml-2">
                                          (Break: {avail.breakStartTime} - {avail.breakEndTime})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {(displayAvailableCount !== null || bookedCount !== null) && (
                                    <div className="flex gap-4 mt-2">
                                      {displayAvailableCount !== null && (
                                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                          {displayAvailableCount} {slotsForDate.length > 0 ? 'Available' : 'Expected Slots'}
                                        </span>
                                      )}
                                      {bookedCount !== null && bookedCount > 0 && (
                                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                                          {bookedCount} Booked
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronRight
                                className={`h-5 w-5 text-gray-400 transition-transform ${
                                  isExpanded ? 'transform rotate-90' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-gray-200 p-4 bg-gray-50">
                              {isLoading ? (
                                <div className="text-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                              ) : slotsForDate.length > 0 ? (
                                <div>
                                  <div className="mb-3">
                                    <h4 className="font-semibold text-gray-700 mb-2">Available Slots:</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                      {slotsForDate
                                        .filter(s => !s.isBooked)
                                        .map((slot) => (
                                          <button
                                            key={slot._id}
                                            onClick={() => {
                                              setSelectedDate(dateStr);
                                              setSelectedSlot(slot);
                                              setShowBookingModal(true);
                                            }}
                                            className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg hover:from-green-100 hover:to-green-200 hover:border-green-400 transition-all text-left transform hover:scale-105 hover:shadow-md"
                                          >
                                            <div className="font-bold text-green-700 text-sm">
                                              {slot.startTime} - {slot.endTime}
                                            </div>
                                            <div className="text-xs text-green-600 mt-1 font-medium">Click to book</div>
                                          </button>
                                        ))}
                                    </div>
                                  </div>
                                  {slotsForDate.filter(s => s.isBooked).length > 0 && (
                                    <div className="mt-3">
                                      <h4 className="font-semibold text-gray-700 mb-2">Booked Slots:</h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {slotsForDate
                                          .filter(s => s.isBooked)
                                          .map((slot) => (
                                            <div
                                              key={slot._id}
                                              className="p-3 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <div className="font-bold text-red-700 text-sm">
                                                    {slot.startTime} - {slot.endTime}
                                                  </div>
                                                  <div className="text-sm font-semibold text-red-800 mt-1">
                                                    {slot.patientId?.name || 'Unknown Patient'}
                                                  </div>
                                                  {slot.patientId?.uhId && (
                                                    <div className="text-xs text-gray-600 mt-1">
                                                      UH ID: {slot.patientId.uhId}
                                                    </div>
                                                  )}
                                                </div>
                                                <CheckCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (() => {
                                // Show expected slots if availability times are set
                                const expectedSlots = generateExpectedTimeSlots(dateStr);
                                return expectedSlots.length > 0 ? (
                                  <div>
                                    <div className="mb-3">
                                      <h4 className="font-semibold text-gray-700 mb-2">Available Slots (Auto-created based on working hours):</h4>
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {expectedSlots.map((slot, idx) => (
                                          <button
                                            key={`expected-${idx}`}
                                            onClick={() => {
                                              setSelectedDate(dateStr);
                                              const expectedSlot = { ...slot, startTime: slot.startTime, endTime: slot.endTime };
                                              handleExpectedSlotClick(expectedSlot);
                                            }}
                                            className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg hover:from-green-100 hover:to-green-200 hover:border-green-400 transition-all text-left transform hover:scale-105 hover:shadow-md"
                                          >
                                            <div className="font-bold text-green-700 text-sm">
                                              {slot.startTime} - {slot.endTime}
                                            </div>
                                            <div className="text-xs text-green-600 mt-1 font-medium">Click to book</div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 mb-3">
                                      Slots will be automatically created when center administrator sets availability times for this date.
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No available dates found for this doctor</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Calendar View Card */}
          {viewMode === 'calendar' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:shadow-md"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
              </div>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:shadow-md"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-bold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const status = getDateStatus(day.dateStr);
                const availability = monthAvailability[day.dateStr];
                const isPast = status === 'past';
                const isClickableDate = day.isCurrentMonth && !isPast && (status === 'available' || !availability);
                const isSelected = day.dateStr === selectedDate;
                const slotsForDay = dateSlots[day.dateStr] || [];
                const availableCount = slotsForDay.filter(s => !s.isBooked).length;
                const bookedCount = slotsForDay.filter(s => s.isBooked).length;
                
                // Get expected slots count based on availability times
                const expectedSlotsCount = getExpectedSlotsCount(day.dateStr);
                // If slots haven't been fetched but date is available, show expected count
                const displayAvailableCount = slotsForDay.length > 0 
                  ? availableCount 
                  : (expectedSlotsCount !== null ? expectedSlotsCount : null);
                
                let bgColor = 'bg-gray-50';
                let textColor = 'text-gray-400';
                let borderColor = 'border-gray-200';
                if (!day.isCurrentMonth) {
                  bgColor = 'bg-gray-50';
                  textColor = 'text-gray-300';
                  borderColor = 'border-gray-100';
                } else if (isSelected) {
                  bgColor = 'bg-gradient-to-br from-blue-500 to-blue-600';
                  textColor = 'text-white';
                  borderColor = 'border-blue-500';
                } else if (status === 'holiday') {
                  bgColor = 'bg-red-50';
                  textColor = 'text-red-700';
                  borderColor = 'border-red-200';
                } else if (status === 'unavailable') {
                  bgColor = 'bg-gray-200';
                  textColor = 'text-gray-600';
                  borderColor = 'border-gray-300';
                } else if (status === 'available') {
                  bgColor = 'bg-green-50';
                  textColor = 'text-green-700';
                  borderColor = 'border-green-200';
                } else if (status === 'past') {
                  bgColor = 'bg-gray-100';
                  textColor = 'text-gray-400';
                  borderColor = 'border-gray-200';
                } else if (day.isToday && status === 'available') {
                  bgColor = 'bg-blue-100';
                  textColor = 'text-blue-800';
                  borderColor = 'border-blue-300';
                } else {
                  bgColor = 'bg-white';
                  textColor = 'text-gray-700';
                  borderColor = 'border-gray-200';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isClickableDate) {
                        handleDateClick(day.dateStr);
                        // Also fetch slots for this date if not already loaded
                        if (!dateSlots[day.dateStr]) {
                          fetchSlotsForDate(day.dateStr);
                        }
                      }
                    }}
                    disabled={!isClickableDate}
                    className={`h-auto min-h-[60px] rounded-lg text-sm font-semibold transition-all border-2 ${borderColor} ${bgColor} ${textColor} ${
                      isClickableDate ? 'hover:ring-2 hover:ring-blue-300 hover:shadow-md cursor-pointer transform hover:scale-105' : 'cursor-not-allowed opacity-50'
                    } flex flex-col items-center justify-center p-1`}
                  >
                    <span className="text-base">{day.date.getDate()}</span>
                    {isClickableDate && (displayAvailableCount !== null || bookedCount > 0) && (
                      <div className="text-xs mt-1 flex flex-col items-center gap-0.5">
                        {displayAvailableCount !== null && displayAvailableCount > 0 && (
                          <span className={`${isSelected ? 'text-green-100' : 'text-green-600'} font-bold`}>
                            {displayAvailableCount} {slotsForDay.length > 0 ? 'avail' : 'slots'}
                          </span>
                        )}
                        {bookedCount > 0 && (
                          <span className={`${isSelected ? 'text-red-100' : 'text-red-600'} font-bold`}>
                            {bookedCount} booked
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-green-300 bg-green-50"></div>
                <span className="text-xs font-medium text-gray-700">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-red-300 bg-red-100"></div>
                <span className="text-xs font-medium text-gray-700">Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-gray-300 bg-gray-200"></div>
                <span className="text-xs font-medium text-gray-700">Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-blue-500 bg-gradient-to-br from-blue-500 to-blue-600"></div>
                <span className="text-xs font-medium text-gray-700">Selected</span>
              </div>
            </div>
          </div>
          )}

          {/* Slots Display - Only show in Calendar View */}
          {viewMode === 'calendar' && selectedDate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Slots Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">
                      Available Slots
                    </h2>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        const expectedSlots = generateExpectedTimeSlots(selectedDate);
                        const displayCount = slots.length > 0 ? availableSlots.length : expectedSlots.length;
                        return `${displayCount} ${slots.length > 0 ? 'slots available' : 'expected slots'}`;
                      })()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4 bg-green-50 p-2 rounded-lg border border-green-200">
                  Slots are 30-minute intervals. Click any slot to book an appointment.
                </p>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading slots...</p>
                  </div>
                ) : (() => {
                  const expectedSlots = generateExpectedTimeSlots(selectedDate);
                  const slotsToShow = slots.length > 0 ? availableSlots : expectedSlots;
                  
                  console.log(`Displaying slots for ${selectedDate}:`, {
                    actualSlotsCount: slots.length,
                    availableSlotsCount: availableSlots.length,
                    expectedSlotsCount: expectedSlots.length,
                    slotsToShowCount: slotsToShow.length,
                    willShowExpected: slots.length === 0
                  });
                  
                  if (slotsToShow.length > 0) {
                    console.log(`Rendering ${slotsToShow.length} slots (first 3):`, slotsToShow.slice(0, 3));
                    return (
                      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                        {slotsToShow.map((slot, idx) => {
                          const isExpected = slot.isExpected || !slot._id;
                          console.log(`Rendering slot ${idx}:`, { startTime: slot.startTime, endTime: slot.endTime, isExpected, hasId: !!slot._id });
                          return (
                            <button
                              key={slot._id || `expected-${idx}`}
                              onClick={async () => {
                                console.log(`Slot clicked:`, slot);
                                if (isExpected) {
                                  // Auto-create slots and open booking modal
                                  await handleExpectedSlotClick(slot);
                                } else {
                                  openBookingModal(slot);
                                }
                              }}
                              className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg hover:from-green-100 hover:to-green-200 hover:border-green-400 transition-all text-left transform hover:scale-105 hover:shadow-md cursor-pointer disabled:opacity-50"
                              disabled={loading}
                              style={{ display: 'block' }}
                            >
                              <div className="font-bold text-green-700 text-sm">
                                {slot.startTime} - {slot.endTime}
                              </div>
                              <div className="text-xs text-green-600 mt-1 font-medium">
                                {loading ? 'Creating slots...' : 'Click to book'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-4">
                          No availability times set for this date. Please contact the center administrator.
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Booked Appointments Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">
                      Booked Appointments
                    </h2>
                    <p className="text-xs text-gray-500">
                      {bookedSlots.length + onlineAppointments.length} appointments
                    </p>
                  </div>
                </div>
                {(bookedSlots.length > 0 || onlineAppointments.length > 0) ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {/* Booked Slots */}
                    {bookedSlots.map((slot) => (
                      <div
                        key={slot._id}
                        className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-4 w-4 text-red-600" />
                              <span className="font-bold text-red-700 text-sm">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-red-800 mt-1">
                              {slot.patientId?.name || 'Unknown Patient'}
                            </div>
                            {slot.patientId?.uhId && (
                              <div className="text-xs text-gray-600 mt-1">
                                UH ID: {slot.patientId.uhId}
                              </div>
                            )}
                            {slot.patientId?.phone && (
                              <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-gray-500" />
                                <span>Phone: {slot.patientId.phone}</span>
                              </div>
                            )}
                            {slot.bookedBy && (
                              <div className="text-xs text-gray-500 mt-1">
                                Booked by: {slot.bookedBy.name}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <CheckCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <button
                              onClick={() => handleCancelSlot(slot)}
                              disabled={cancelingSlotId === slot._id}
                              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <XCircle className="h-4 w-4" />
                              {cancelingSlotId === slot._id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Online Appointments */}
                    {onlineAppointments.map((apt, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="font-bold text-orange-700 text-sm">
                                {apt.confirmedTime || apt.preferredTime || 'Time TBD'}
                              </span>
                              <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full font-bold">
                                Online
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-orange-800 mt-1">
                              {apt.patientName || 'Unknown Patient'}
                            </div>
                            {apt.patientPhone && (
                              <div className="text-xs text-gray-600 mt-1">
                                Phone: {apt.patientPhone}
                              </div>
                            )}
                            {apt.confirmationCode && (
                              <div className="text-xs text-gray-500 mt-1 font-mono bg-white px-2 py-1 rounded inline-block">
                                Code: {apt.confirmationCode}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              Status: <span className="capitalize font-semibold">{apt.status}</span>
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No booked appointments for this date</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <CalendarCheck className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Book Appointment Slot</h3>
            </div>
            
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border-2 border-blue-200">
                <div className="font-bold text-blue-700 mb-1">
                  {getSelectedDoctorName()}
                </div>
                <div className="text-sm text-blue-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                </div>
                <div className="text-sm text-blue-600 flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4" />
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-600" />
                  Search Patient
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or UH ID"
                    className="w-full pl-10 border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                {searchQuery && patients.length > 0 && (
                  <div className="mt-2 border-2 border-gray-200 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                    {patients.map((patient) => (
                      <button
                        key={patient._id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setSearchQuery(patient.name);
                          setPatients([]);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition-all first:rounded-t-lg last:rounded-b-lg last:border-b-0"
                      >
                        <div className="font-semibold text-gray-800">{patient.name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          UH ID: {patient.uhId || 'N/A'} | Phone: {patient.phone || 'N/A'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg mb-4 border-2 border-green-200">
                  <div className="font-bold text-green-700 mb-1 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Selected: {selectedPatient.name}
                  </div>
                  <div className="text-sm text-green-600">
                    UH ID: {selectedPatient.uhId || 'N/A'}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient Appointment ID (Optional)
                </label>
                <input
                  type="text"
                  value={patientAppointmentId || ''}
                  onChange={(e) => setPatientAppointmentId(e.target.value)}
                  placeholder="Link to online appointment if applicable"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBookSlot}
                disabled={loading || !selectedPatient}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
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
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all"
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

