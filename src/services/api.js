import axios from 'axios';
import { API_CONFIG } from '../config/environment';

const API = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
});



// Test function to check API connectivity
export const testAPIConnection = async () => {
  try {
    const response = await API.get('/auth/me');
    return true;
  } catch (error) {
    return false;
  }
};

API.interceptors.request.use((config) => {
  try {
    // Simplified token extraction - prioritize localStorage token
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Fallback: check user object for token
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    }
  } catch (err) {
    console.error('Error in request interceptor:', err);
  }
  
  return config;
});

// Add response interceptor to handle errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Clear stored authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Optionally redirect to login
      // window.location.href = '/login';
    } else if (error.response?.status === 403) {
      console.error('Access denied:', error.response.data?.message || 'Forbidden');
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data?.message || 'Internal server error');
    } else if (!error.response) {
      console.error('Network error:', error.message || 'Unable to connect to server');
    }
    
    return Promise.reject(error);
  }
);

// Mark patient as viewed by doctor
export const markPatientAsViewed = async (patientId) => {
  try {
    const response = await API.put(`/patients/${patientId}/mark-viewed`);
    return response.data;
  } catch (error) {
    console.error('Error marking patient as viewed:', error);
    throw error;
  }
};

// Get patient appointment data
export const getPatientAppointment = async (patientId) => {
  try {
    const response = await API.get(`/patients/${patientId}/appointment`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient appointment:', error);
    throw error;
  }
};

// Accountant API functions
export const getAccountantDashboard = async () => {
  try {
    const response = await API.get('/accountants/dashboard');
    return response.data;
  } catch (error) {
    console.error('Error fetching accountant dashboard:', error);
    throw error;
  }
};

export const getBillingData = async (params = {}) => {
  try {
    const response = await API.get('/accountants/bills-transactions', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching billing data:', error);
    throw error;
  }
};

export const getFinancialReports = async (params = {}) => {
  try {
    const response = await API.get('/accountants/reports', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching financial reports:', error);
    throw error;
  }
};

// Doctor Calendar API functions
export const getCenterDoctors = async () => {
  try {
    const response = await API.get('/doctor-calendar/doctors');
    return response.data;
  } catch (error) {
    console.error('Error fetching center doctors:', error);
    throw error;
  }
};

export const setDoctorAvailability = async (data) => {
  try {
    const response = await API.post('/doctor-calendar/availability', data);
    return response.data;
  } catch (error) {
    console.error('Error setting doctor availability:', error);
    throw error;
  }
};

export const getDoctorAvailability = async (params = {}) => {
  try {
    const response = await API.get('/doctor-calendar/availability', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    throw error;
  }
};

export const createAppointmentSlots = async (data) => {
  try {
    const response = await API.post('/doctor-calendar/slots/create', data);
    return response.data;
  } catch (error) {
    console.error('Error creating appointment slots:', error);
    throw error;
  }
};

export const getAppointmentSlots = async (params = {}) => {
  try {
    const response = await API.get('/doctor-calendar/slots', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment slots:', error);
    throw error;
  }
};

export const getDayAppointments = async (params = {}) => {
  try {
    const response = await API.get('/doctor-calendar/day-appointments', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching day appointments:', error);
    throw error;
  }
};

export const deleteAppointmentSlots = async (data) => {
  try {
    const response = await API.delete('/doctor-calendar/slots', { data });
    return response.data;
  } catch (error) {
    console.error('Error deleting appointment slots:', error);
    throw error;
  }
};

export const markSundaysAsHolidays = async (data) => {
  try {
    const response = await API.post('/doctor-calendar/mark-sundays', data);
    return response.data;
  } catch (error) {
    console.error('Error marking Sundays as holidays:', error);
    throw error;
  }
};

export const bulkSetHolidays = async (data) => {
  try {
    const response = await API.post('/doctor-calendar/bulk-holidays', data);
    return response.data;
  } catch (error) {
    console.error('Error bulk setting holidays:', error);
    throw error;
  }
};

export const getMonthRangeAvailability = async (params = {}) => {
  try {
    const response = await API.get('/doctor-calendar/month-availability', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching month range availability:', error);
    throw error;
  }
};

export const bookSlotForPatient = async (data) => {
  try {
    const response = await API.post('/doctor-calendar/slots/book', data);
    return response.data;
  } catch (error) {
    console.error('Error booking slot:', error);
    throw error;
  }
};

export const generateFinancialReport = async (data) => {
  try {
    const response = await API.get('/accountants/reports', { params: data });
    return response.data;
  } catch (error) {
    console.error('Error generating financial report:', error);
    throw error;
  }
};

// Center Admin Accountant API functions
export const getAccountantStats = async () => {
  try {
    const response = await API.get('/accountants/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching accountant stats:', error);
    throw error;
  }
};

// Patient Appointment API functions
export const getAllCentersForBooking = async () => {
  try {
    const response = await API.get('/patient-appointments/centers');
    return response.data;
  } catch (error) {
    console.error('Error fetching centers for booking:', error);
    throw error;
  }
};

export const getNearbyCenters = async (latitude, longitude, radius = 50) => {
  try {
    const response = await API.get('/patient-appointments/centers/nearby', {
      params: { latitude, longitude, radius }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nearby centers:', error);
    throw error;
  }
};

export const bookAppointment = async (appointmentData) => {
  try {
    // Create FormData to handle file uploads
    const formData = new FormData();
    
    // Add all text fields
    Object.keys(appointmentData).forEach(key => {
      if (key === 'medicalHistoryDocs' && Array.isArray(appointmentData[key])) {
        // Handle file uploads - append files to FormData
        appointmentData[key].forEach((file, index) => {
          if (file instanceof File) {
            formData.append('medicalHistoryDocs', file);
          }
        });
      } else if (key !== 'medicalHistoryDocs') {
        // Add non-file fields
        if (appointmentData[key] !== null && appointmentData[key] !== undefined) {
          if (typeof appointmentData[key] === 'object') {
            formData.append(key, JSON.stringify(appointmentData[key]));
          } else {
            formData.append(key, appointmentData[key]);
          }
        }
      }
    });

    const response = await API.post('/patient-appointments/book', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw error;
  }
};

export const getAppointmentByCode = async (confirmationCode) => {
  try {
    const response = await API.get(`/patient-appointments/confirmation/${confirmationCode}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment:', error);
    throw error;
  }
};

export const cancelAppointment = async (confirmationCode, cancellationReason) => {
  try {
    const response = await API.post(`/patient-appointments/cancel/${confirmationCode}`, {
      cancellationReason
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
};

export const approveAppointment = async (confirmationCode) => {
  try {
    const response = await API.post(`/patient-appointments/approve/${confirmationCode}`);
    return response.data;
  } catch (error) {
    console.error('Error approving appointment:', error);
    throw error;
  }
};

export const getCenterAppointments = async (centerId, status, date) => {
  try {
    const params = {};
    if (status) params.status = status;
    if (date) params.date = date;
    
    const response = await API.get(`/patient-appointments/center/${centerId}`, {
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching center appointments:', error);
    throw error;
  }
};

export const updateAppointmentStatus = async (appointmentId, status, notes) => {
  try {
    const response = await API.put(`/patient-appointments/${appointmentId}/status`, {
      status, notes
    });
    return response.data;
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
};

export const updateAppointmentDetails = async (appointmentId, appointmentData) => {
  try {
    const response = await API.put(`/patient-appointments/${appointmentId}/details`, appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error updating appointment details:', error);
    throw error;
  }
};

export const searchAppointmentsByPatientName = async (name, centerId) => {
  try {
    const response = await API.get('/patient-appointments/search', {
      params: { name, centerId }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching appointments:', error);
    throw error;
  }
};

// Payment History API functions
export const getPatientPaymentHistory = async (patientId) => {
  try {
    const response = await API.get(`/payment-logs/patient/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient payment history:', error);
    throw error;
  }
};

export const getPaymentLogsForCenter = async (params = {}) => {
  try {
    const response = await API.get('/payment-logs/center', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching payment logs for center:', error);
    throw error;
  }
};

// SLIT therapy APIs
export const getReceptionistSlitTherapyRequests = async (params = {}) => {
  try {
    const response = await API.get('/slit-therapy/receptionist', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching SLIT therapy requests for reception:', error);
    throw error;
  }
};

export const createSlitTherapyRequest = async (payload) => {
  try {
    const response = await API.post('/slit-therapy', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating SLIT therapy request:', error);
    throw error;
  }
};

export const markSlitTherapyPayment = async (id, payload) => {
  try {
    const response = await API.put(`/slit-therapy/${id}/mark-paid`, payload);
    return response.data;
  } catch (error) {
    console.error('Error marking SLIT therapy payment:', error);
    throw error;
  }
};

export const getLabSlitTherapyRequests = async (params = {}) => {
  try {
    const response = await API.get('/slit-therapy/lab', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching SLIT therapy requests for lab:', error);
    throw error;
  }
};

export const updateSlitTherapyRequestStatus = async (id, payload) => {
  try {
    const response = await API.put(`/slit-therapy/${id}/status`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating SLIT therapy status:', error);
    throw error;
  }
};

export const closeSlitTherapyRequest = async (id, payload = {}) => {
  try {
    const response = await API.put(`/slit-therapy/${id}/close`, payload);
    return response.data;
  } catch (error) {
    console.error('Error closing SLIT therapy request:', error);
    throw error;
  }
};

export const cancelSlitTherapyRequest = async (id, payload = {}) => {
  try {
    const response = await API.put(`/slit-therapy/${id}/cancel`, payload);
    return response.data;
  } catch (error) {
    console.error('Error cancelling SLIT therapy request:', error);
    throw error;
  }
};

export const refundSlitTherapyRequest = async (id, payload) => {
  try {
    const response = await API.put(`/slit-therapy/${id}/refund`, payload);
    return response.data;
  } catch (error) {
    console.error('Error refunding SLIT therapy request:', error);
    throw error;
  }
};

// SLIT Lab staff management APIs
export const getSlitLabStaff = async () => {
  try {
    const response = await API.get('/slit-lab-staff');
    return response.data;
  } catch (error) {
    console.error('Error fetching SLIT lab staff:', error);
    throw error;
  }
};

export const getSlitLabStaffById = async (id) => {
  try {
    const response = await API.get(`/slit-lab-staff/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching SLIT lab staff member:', error);
    throw error;
  }
};

export const createSlitLabStaff = async (payload) => {
  try {
    const response = await API.post('/slit-lab-staff', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating SLIT lab staff member:', error);
    throw error;
  }
};

export const updateSlitLabStaff = async (id, payload) => {
  try {
    const response = await API.put(`/slit-lab-staff/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating SLIT lab staff member:', error);
    throw error;
  }
};

export const deleteSlitLabStaff = async (id) => {
  try {
    const response = await API.delete(`/slit-lab-staff/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting SLIT lab staff member:', error);
    throw error;
  }
};

export default API;