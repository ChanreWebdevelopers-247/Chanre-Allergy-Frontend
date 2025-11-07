import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getAllCentersForBooking, 
  getNearbyCenters, 
  bookAppointment 
} from '../services/api';
import HomeHeader from '../components/HomeHeader';
import TopHeader from '../components/TopHeader';
const BookAppointment = () => {
  const [step, setStep] = useState(1);
  const [centers, setCenters] = useState([]);
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationAddress, setUserLocationAddress] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    patientAge: '',
    patientGender: '',
    patientAddress: '',
    preferredDate: '',
    preferredTime: '',
    appointmentType: 'consultation',
    reasonForVisit: '',
    symptoms: '',
    previousHistory: '',
    contactMethod: 'phone',
    preferredContactTime: '',
    notes: '',
    medicalHistoryDocs: [],
    patientLocation: {
      latitude: null,
      longitude: null,
      city: '',
      state: '',
      pincode: ''
    }
  });

  // Time slots
  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'
  ];

  const [availableTimeSlots, setAvailableTimeSlots] = useState(timeSlots);

  const toRadians = (value) => (value * Math.PI) / 180;

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (
      [lat1, lon1, lat2, lon2].some(
        (coordinate) => typeof coordinate !== 'number' || Number.isNaN(coordinate)
      )
    ) {
      return null;
    }

    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const parseDistanceValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
      return Number.isNaN(numeric) ? null : numeric;
    }
    return null;
  };

  const getCenterCoordinates = (center) => {
    if (!center || typeof center !== 'object') return null;

    const possibleCoordinates = [
      { lat: center.latitude, lng: center.longitude },
      { lat: center.lat, lng: center.lng },
      center.location,
      center.locationDetails,
      center.geoLocation,
      center.geoCoordinates,
      center.coordinates,
      center.geolocation,
    ];

    for (const entry of possibleCoordinates) {
      if (!entry) continue;

      if (Array.isArray(entry.coordinates) && entry.coordinates.length >= 2) {
        const [lng, lat] = entry.coordinates;
        if (typeof lat === 'number' && typeof lng === 'number') {
          return { latitude: lat, longitude: lng };
        }
      }

      if (Array.isArray(entry) && entry.length >= 2) {
        const [lng, lat] = entry;
        if (typeof lat === 'number' && typeof lng === 'number') {
          return { latitude: lat, longitude: lng };
        }
      }

      const { latitude, longitude, lat, lng } = entry;
      if (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        !Number.isNaN(latitude) &&
        !Number.isNaN(longitude)
      ) {
        return { latitude, longitude };
      }

      if (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !Number.isNaN(lat) &&
        !Number.isNaN(lng)
      ) {
        return { latitude: lat, longitude: lng };
      }
    }

    return null;
  };

  const sortCentersByDistance = (centersList, location) => {
    if (!Array.isArray(centersList)) return [];
    if (!location || typeof location !== 'object') return [...centersList];

    const { latitude: userLat, longitude: userLng } = location;

    if (
      typeof userLat !== 'number' ||
      typeof userLng !== 'number' ||
      Number.isNaN(userLat) ||
      Number.isNaN(userLng)
    ) {
      return [...centersList];
    }

    return [...centersList].sort((a, b) => {
      const distanceA =
        parseDistanceValue(a?.distance) ??
        parseDistanceValue(a?.distanceInKm) ??
        parseDistanceValue(a?.distanceKm) ??
        parseDistanceValue(a?.dist);
      const distanceB =
        parseDistanceValue(b?.distance) ??
        parseDistanceValue(b?.distanceInKm) ??
        parseDistanceValue(b?.distanceKm) ??
        parseDistanceValue(b?.dist);

      if (distanceA !== null && distanceB !== null) return distanceA - distanceB;
      if (distanceA !== null) return -1;
      if (distanceB !== null) return 1;

      const coordsA = getCenterCoordinates(a);
      const coordsB = getCenterCoordinates(b);

      const computedA = coordsA
        ? calculateDistance(userLat, userLng, coordsA.latitude, coordsA.longitude)
        : null;
      const computedB = coordsB
        ? calculateDistance(userLat, userLng, coordsB.latitude, coordsB.longitude)
        : null;

      if (computedA !== null && computedB !== null) return computedA - computedB;
      if (computedA !== null) return -1;
      if (computedB !== null) return 1;

      return (a?.name || '').localeCompare(b?.name || '');
    });
  };

  const fetchLocationDetails = async (latitude, longitude) => {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return;
    }

    setResolvingAddress(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve address');
      }

      const data = await response.json();
      const address = data.address || {};

      const locality =
        address.neighbourhood ||
        address.suburb ||
        address.village ||
        address.town ||
        address.city ||
        address.state_district;

      const formattedAddress =
        data.display_name ||
        [locality, address.state, address.country]
          .filter(Boolean)
          .join(', ');

      if (formattedAddress) {
        setUserLocationAddress(formattedAddress);
      }

      setFormData((prev) => ({
        ...prev,
        patientLocation: {
          ...prev.patientLocation,
          latitude,
          longitude,
          city: locality || prev.patientLocation.city,
          state: address.state || prev.patientLocation.state,
          pincode: address.postcode || prev.patientLocation.pincode
        },
        patientAddress: prev.patientAddress || formattedAddress || prev.patientAddress
      }));
    } catch (error) {
      console.error('Error resolving user address:', error);
    } finally {
      setResolvingAddress(false);
    }
  };

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

  useEffect(() => {
    fetchCenters();
    getUserLocation();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const response = await getAllCentersForBooking();
      if (response.success) {
        setCenters(response.data);
        setFilteredCenters(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch centers');
      console.error('Error fetching centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          fetchLocationDetails(position.coords.latitude, position.coords.longitude);
          setFormData(prev => ({
            ...prev,
            patientLocation: {
              ...prev.patientLocation,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }));
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'preferredDate') {
      const filteredSlots = getFilteredSlotsForDate(value);
      setAvailableTimeSlots(filteredSlots);
      setFormData(prev => ({
        ...prev,
        preferredDate: value,
        preferredTime: filteredSlots.includes(prev.preferredTime) ? prev.preferredTime : ''
      }));

      if (isDateToday(value) && filteredSlots.length === 0) {
        toast.info('No future time slots available for today. Please select another date.');
      }
      return;
    }

    if (name === 'preferredTime') {
      const selectedDateTime = combineDateAndTime(formData.preferredDate, value);
      if (selectedDateTime && selectedDateTime <= new Date()) {
        toast.error('Please choose a future time');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      patientLocation: {
        ...prev.patientLocation,
        [name]: value
      }
    }));
  };

  const handlePhoneChange = (e) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '');
    // Limit to 10 digits
    const limitedValue = value.slice(0, 10);
    setFormData(prev => ({
      ...prev,
      patientPhone: limitedValue
    }));
  };

  const handleCenterSelect = (center) => {
    setSelectedCenter(center);
    setStep(2);
  };

  const handleSearchCenters = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = centers.filter(center => 
      center.name.toLowerCase().includes(searchTerm) ||
      center.location.toLowerCase().includes(searchTerm) ||
      center.address.toLowerCase().includes(searchTerm)
    );
    setFilteredCenters(filtered);
  };

  const handleNearbySearch = async () => {
    if (!userLocation) {
      toast.error('Location access is required for nearby search');
      return;
    }

    try {
      setLoading(true);
      const response = await getNearbyCenters(
        userLocation.latitude, 
        userLocation.longitude
      );
      if (response.success) {
        const sortedCenters = sortCentersByDistance(response.data, userLocation);
        setFilteredCenters(sortedCenters);
        toast.success('Found nearby centers');
      }
    } catch (error) {
      toast.error('Failed to find nearby centers');
      console.error('Error fetching nearby centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      medicalHistoryDocs: [...prev.medicalHistoryDocs, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      medicalHistoryDocs: prev.medicalHistoryDocs.filter((_, i) => i !== index)
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const requiredFields = [
      'patientName', 'patientPhone', 'patientAge', 
      'patientGender', 'patientAddress', 'preferredDate', 'preferredTime'
    ];
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        toast.error(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`);
        return;
      }
    }

    // Validate phone number - must be exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.patientPhone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    if (!selectedCenter) {
      toast.error('Please select a center');
      return;
    }

    const appointmentDateTime = combineDateAndTime(formData.preferredDate, formData.preferredTime);
    if (!appointmentDateTime || appointmentDateTime <= new Date()) {
      toast.error('Selected appointment date and time must be in the future');
      return;
    }

    try {
      setLoading(true);
      const appointmentData = {
        ...formData,
        centerId: selectedCenter._id,
        preferredDate: new Date(formData.preferredDate).toISOString()
      };

      const response = await bookAppointment(appointmentData);
      
      if (response.success) {
        toast.success('Appointment booked successfully!');
        setStep(3);
        // Store confirmation details for display
        setFormData(prev => ({
          ...prev,
          confirmationCode: response.data.confirmationCode,
          appointmentId: response.data.appointmentId
        }));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to book appointment';
      
      // Check if there's an existing appointment
      if (error.response?.data?.existingAppointment) {
        const existing = error.response.data.existingAppointment;
        toast.error(
          errorMessage + '\n' + 
          `Your current appointment: ${existing.confirmationCode} at ${existing.centerName}`
        );
      } else {
        toast.error(errorMessage);
      }
      
      console.error('Error booking appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
     <TopHeader />

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-22 mt-10">
        <div className="w-4/5 mx-auto px-2 sm:px-4">
          <div className="text-center mb-6 sm:mb-8">
            {/* Clinic Badge */}
            <div className="inline-block mb-3 sm:mb-4 mt-8 sm:mt-10">
              <div
                className="bg-[#e0f2fe] text-[#2490eb] px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'Quicksand, sans-serif' }}
              >
                BOOK YOUR APPOINTMENT
              </div>
            </div>

            {/* Main Heading */}
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-[#18100f] mb-3 sm:mb-4"
              style={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'capitalize' }}
            >
              Choose Your<br />
              <span className="text-[#2490eb]">Preferred Center</span>
            </h1>

            {/* Description */}
            <p
              className="text-[#666666] text-sm sm:text-base leading-relaxed max-w-xl mx-auto px-2"
              style={{ fontFamily: 'Quicksand, sans-serif' }}
            >
              Select from our network of specialized allergy centers. Find the most convenient location for your consultation.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Search Centers
                </label>
                <input
                  type="text"
                  placeholder="Search by center name, location, or address..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent text-sm sm:text-base"
                  onChange={handleSearchCenters}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleNearbySearch}
                  disabled={!userLocation || loading}
                  className="w-full sm:w-auto px-4 py-2 bg-[#2490eb] hover:bg-[#14457b] text-white font-semibold uppercase rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs sm:text-sm"
                  style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: '600' }}
                >
                  {loading ? 'Searching...' : 'Find Nearby'}
                </button>
              </div>
            </div>
            
            {userLocation && (
              <div className="bg-[#e0f2fe] p-2 sm:p-3 rounded-lg">
                <p className="text-[#2490eb] font-medium text-xs sm:text-sm">
                  📍 Location detected:{' '}
                  {resolvingAddress
                    ? 'Detecting area...'
                    : userLocationAddress ||
                      `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
                </p>
              </div>
            )}
          </div>

          {/* Centers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCenters.map((center) => (
              <div
                key={center._id}
                className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:border-[#2490eb] transition-all duration-300 cursor-pointer group"
              >
                <div className="text-center mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#e0f2fe] rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:bg-[#2490eb] transition-colors">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#2490eb] group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1 sm:mb-2">{center.name}</h3>
                </div>
                
                <div className="space-y-1 sm:space-y-2 text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
                  <div className="flex items-start">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#2490eb] mr-1 sm:mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs sm:text-xs">{center.location}</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#2490eb] mr-1 sm:mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs sm:text-xs">{center.address}</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#2490eb] mr-1 sm:mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span className="text-xs sm:text-xs">{center.email}</span>
                  </div>
                  {center.phone && (
                    <div className="flex items-start">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#2490eb] mr-1 sm:mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      <span className="text-xs sm:text-xs">{center.phone}</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleCenterSelect(center)}
                  className="w-full bg-[#2490eb] hover:bg-[#14457b] text-white font-semibold uppercase py-2 px-3 sm:px-4 rounded-lg transition-all duration-300 shadow-sm text-xs sm:text-sm"
                  style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: '600' }}
                >
                  Select This Center
                </button>
              </div>
            ))}
          </div>

          {filteredCenters.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No centers found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderStep2 = () => (
    <div className="font-sans bg-gray-50 text-slate-800">
     
     <TopHeader />
      <section className="relative pt-20 sm:pt-32 pb-8 sm:pb-12">
        <div className="w-4/5 mx-auto px-2 sm:px-4">
          <div className="text-center mb-6 sm:mb-8">
            {/* Clinic Badge */}
            <div className="inline-block mb-3 sm:mb-4">
              <div
                className="bg-[#e0f2fe] text-[#2490eb] px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'Quicksand, sans-serif' }}
              >
                APPOINTMENT DETAILS
              </div>
            </div>

            {/* Main Heading */}
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-[#18100f] mb-3 sm:mb-4"
              style={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'capitalize' }}
            >
              Complete Your<br />
              <span className="text-[#2490eb]">Appointment Booking</span>
            </h1>

            {/* Selected Center Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6 max-w-xl mx-auto">
              <h3 className="font-bold text-[#2490eb] text-sm sm:text-base mb-1">Selected Center</h3>
              <p className="text-gray-700 font-semibold text-xs sm:text-sm">{selectedCenter?.name}</p>
              <p className="text-gray-600 text-xs sm:text-sm">{selectedCenter?.location}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Main Form Layout - Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Left Column - Patient Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#e0f2fe] rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#2490eb]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">Patient Information</h2>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="patientName"
                        value={formData.patientName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white text-sm sm:text-base"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Email Address <span className="text-gray-500 text-xs font-normal">(Optional)</span></label>
                      <input
                        type="email"
                        name="patientEmail"
                        value={formData.patientEmail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="patientPhone"
                        value={formData.patientPhone}
                        onChange={handlePhoneChange}
                        placeholder="Enter 10 digit phone number"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white text-sm sm:text-base"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter 10 digits only (numbers)</p>
                      <p className="text-xs text-amber-600 mt-1">⚠️ You can only book one appointment at a time with this phone number</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Age *</label>
                      <input
                        type="number"
                        name="patientAge"
                        value={formData.patientAge}
                        onChange={handleInputChange}
                        min="1"
                        max="120"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Gender *</label>
                    <select
                      name="patientGender"
                      value={formData.patientGender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent text-sm sm:text-base"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Address *</label>
                    <textarea
                      name="patientAddress"
                      value={formData.patientAddress}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Appointment Details */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-[#e0f2fe] rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-[#2490eb]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Appointment Details</h2>
                </div>
                
                {/* Important Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-amber-800 mb-1">Important Notice</h3>
                      <p className="text-sm text-amber-700">
                        The appointment you book is not final. You are requesting your preferred date and time. 
                        The final appointment date and time will be confirmed based on doctor availability and 
                        you will be contacted to confirm the exact schedule.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Date *</label>
                      <input
                        type="date"
                        name="preferredDate"
                        value={formData.preferredDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Time *</label>
                      <select
                        name="preferredTime"
                        value={formData.preferredTime}
                        onChange={handleInputChange}
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
                      {availableTimeSlots.length === 0 && formData.preferredDate && isDateToday(formData.preferredDate) && (
                        <p className="text-xs text-amber-600 mt-1">No future time slots available for today. Please select a different date.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Appointment Type</label>
                      <select
                        name="appointmentType"
                        value={formData.appointmentType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="followup">Follow-up</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Method</label>
                      <select
                        name="contactMethod"
                        value={formData.contactMethod}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-[#2490eb] bg-white"
                      >
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Information - Full Width */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-[#e0f2fe] rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-[#2490eb]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Medical Information</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Visit <span className="text-gray-500 text-xs font-normal">(Optional)</span></label>
                    <textarea
                      name="reasonForVisit"
                      value={formData.reasonForVisit}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent"
                      placeholder="Describe your main concern or reason for the appointment (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Current Symptoms</label>
                    <textarea
                      name="symptoms"
                      value={formData.symptoms}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent"
                      placeholder="Describe any current symptoms you're experiencing"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Previous Medical History</label>
                    <textarea
                      name="previousHistory"
                      value={formData.previousHistory}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent"
                      placeholder="Any relevant medical history, allergies, or previous treatments"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2490eb] focus:border-transparent"
                      placeholder="Any additional information you'd like to share"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="mt-6">
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Medical History Documents <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Upload previous medical reports, prescriptions, test results, or any relevant documents (PDF, Word, Images). Max 5 files, 10MB each.
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#2490eb] transition-colors">
                    <div className="flex flex-col items-center justify-center">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                        id="fileUpload"
                      />
                      <label
                        htmlFor="fileUpload"
                        className="cursor-pointer flex flex-col items-center justify-center w-full"
                      >
                        <svg className="w-10 h-10 text-[#2490eb] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600 font-medium">
                          Click to upload files or drag and drop
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          PDF, DOC, DOCX, JPG, PNG, TXT (Max 10MB each)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Display uploaded files */}
                  {formData.medicalHistoryDocs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-gray-700">Uploaded Files:</p>
                      {formData.medicalHistoryDocs.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-[#2490eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-300"
                style={{ fontFamily: 'Quicksand, sans-serif', fontSize: '14px', fontWeight: '600' }}
              >
                Back to Centers
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#2490eb] hover:bg-[#14457b] text-white font-semibold uppercase rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm"
                style={{ fontFamily: 'Quicksand, sans-serif', fontSize: '14px', fontWeight: '600' }}
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );

  const renderStep3 = () => (
    <div className="font-sans bg-gray-50 text-slate-800">
      <section className="relative pt-20 sm:pt-32 pb-8 sm:pb-12">
        <div className="w-4/5 mx-auto px-2 sm:px-4 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Success Message */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="inline-block mb-3 sm:mb-4">
              <div
                className="bg-green-100 text-green-800 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'Quicksand, sans-serif' }}
              >
                APPOINTMENT CONFIRMED
              </div>
            </div>
            
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-[#18100f] mb-3 sm:mb-4"
              style={{ fontFamily: 'Quicksand, sans-serif', textTransform: 'capitalize' }}
            >
              Appointment Booked<br />
              <span className="text-green-600">Successfully!</span>
            </h1>
            
            <div className="bg-[#e0f2fe] rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-left max-w-xl mx-auto">
              <h2 className="text-base sm:text-lg font-bold text-[#2490eb] mb-2 sm:mb-3">Appointment Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-gray-700 text-xs sm:text-sm">
                <div>
                  <p><strong>Confirmation Code:</strong></p>
                  <p className="font-mono text-[#2490eb] text-base font-bold">{formData.confirmationCode}</p>
                </div>
                <div>
                  <p><strong>Center:</strong> {selectedCenter?.name}</p>
                </div>
                <div>
                  <p><strong>Date:</strong> {new Date(formData.preferredDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><strong>Time:</strong> {formData.preferredTime}</p>
                </div>
                <div>
                  <p><strong>Patient:</strong> {formData.patientName}</p>
                </div>
                <div>
                  <p><strong>Contact:</strong> {formData.patientPhone}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-800 mb-3">What happens next?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-blue-700 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span>Confirmation email sent</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span>Receptionist will contact you</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Arrive 15 minutes early</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H6a1 1 0 01-1-1V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Bring ID and medical documents</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedCenter(null);
                  setAvailableTimeSlots(timeSlots);
                  setFormData({
                    patientName: '',
                    patientEmail: '',
                    patientPhone: '',
                    patientAge: '',
                    patientGender: '',
                    patientAddress: '',
                    preferredDate: '',
                    preferredTime: '',
                    appointmentType: 'consultation',
                    reasonForVisit: '',
                    symptoms: '',
                    previousHistory: '',
                    contactMethod: 'phone',
                    preferredContactTime: '',
                    notes: '',
                    medicalHistoryDocs: [],
                    patientLocation: {
                      latitude: null,
                      longitude: null,
                      city: '',
                      state: '',
                      pincode: ''
                    }
                  });
                }}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[#2490eb] hover:bg-[#14457b] text-white font-semibold uppercase rounded-lg transition-all duration-300 text-xs sm:text-sm"
                style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: '600' }}
              >
                Book Another Appointment
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-300 text-xs sm:text-sm"
                style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: '600' }}
              >
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen">
      <HomeHeader />
      <div className="font-sans bg-gray-50 text-slate-800 mt-10">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default BookAppointment;