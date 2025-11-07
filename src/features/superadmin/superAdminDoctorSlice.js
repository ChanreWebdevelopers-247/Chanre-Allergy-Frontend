import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { normalizePatientsArray } from '../../utils/normalizePatientsArray';

// Management thunks (for superadmin to manage superadmin consultants)
export const fetchSuperAdminDoctors = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctors',
  async ({ page = 1, limit = 10, search = '', status = '' }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (page) queryParams.append('page', page);
      if (limit) queryParams.append('limit', limit);
      if (search) queryParams.append('search', search);
      if (status) queryParams.append('status', status);

      const response = await API.get(`/superadmin/doctors?${queryParams}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch superadmin consultants');
    }
  }
);

export const addSuperAdminDoctor = createAsyncThunk(
  'superAdminDoctor/addSuperAdminDoctor',
  async (doctorData, { rejectWithValue }) => {
    try {
      const response = await API.post('/superadmin/doctors', doctorData);
      toast.success('Superadmin consultant added successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to add superadmin consultant';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

export const deleteSuperAdminDoctor = createAsyncThunk(
  'superAdminDoctor/deleteSuperAdminDoctor',
  async (id, { rejectWithValue }) => {
    try {
      await API.delete(`/superadmin/doctors/${id}`);
      toast.success('Superadmin consultant deleted successfully!');
      return id;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to delete superadmin consultant';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

export const updateSuperAdminDoctor = createAsyncThunk(
  'superAdminDoctor/updateSuperAdminDoctor',
  async ({ id, doctorData }, { rejectWithValue }) => {
    try {
      const response = await API.put(`/superadmin/doctors/${id}`, doctorData);
      toast.success('Superadmin consultant updated successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to update superadmin consultant';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

export const toggleSuperAdminDoctorStatus = createAsyncThunk(
  'superAdminDoctor/toggleSuperAdminDoctorStatus',
  async (id, { rejectWithValue }) => {
    try {
      const response = await API.patch(`/superadmin/doctors/${id}/toggle-status`);
      toast.success('Doctor status updated successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to toggle superadmin consultant status';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

export const fetchSuperAdminDoctorStats = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/superadmin/doctors/stats');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch superadmin consultant stats');
    }
  }
);

export const fetchSuperAdminDoctorById = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await API.get(`/superadmin/doctors/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch superadmin consultant');
    }
  }
);

// Working thunks (for superadmin consultants to perform their duties)
export const fetchSuperAdminDoctorPatients = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorPatients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/superadmin/doctors/working/patients');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patients');
    }
  }
);

export const fetchSuperAdminDoctorPatientHistory = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorPatientHistory',
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/superadmin/doctors/working/patient/${patientId}/history`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient history');
    }
  }
);

export const fetchSuperAdminDoctorPatientFollowups = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorPatientFollowups',
  async (patientId, { rejectWithValue }) => {
    try {
      if (!patientId || patientId === 'undefined' || patientId === 'null') {
        console.error('❌ Invalid patientId:', patientId);
        return rejectWithValue('Invalid patient ID');
      }

      const response = await API.get(`/superadmin/doctors/working/patient/${patientId}/followups`);
      
      // Validate response data
      if (!response.data) {
        console.error('❌ No data in response');
        return rejectWithValue('No data received from server');
      }

      if (!Array.isArray(response.data)) {
        console.error('❌ Response data is not an array:', typeof response.data);
        return rejectWithValue('Invalid data format received');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Frontend - Error fetching followups:', error);
      console.error('❌ Frontend - Error message:', error.message);
      console.error('❌ Frontend - Error response:', error.response?.data);
      console.error('❌ Frontend - Error status:', error.response?.status);
      console.error('❌ Frontend - Error headers:', error.response?.headers);
      
      if (error.response?.status === 404) {
        return rejectWithValue('Patient not found');
      } else if (error.response?.status === 500) {
        return rejectWithValue('Server error occurred while fetching followups');
      } else if (error.code === 'NETWORK_ERROR') {
        return rejectWithValue('Network error - please check your connection');
      } else {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient followups');
      }
    }
  }
);

export const fetchSuperAdminDoctorPatientMedications = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorPatientMedications',
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/superadmin/doctors/working/patient/${patientId}/medications`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient medications');
    }
  }
);

export const fetchSuperAdminDoctorPatientLabReports = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorPatientLabReports',
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/superadmin/doctors/working/patient/${patientId}/lab-reports`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient lab reports');
    }
  }
);

export const fetchSuperAdminDoctorAssignedPatients = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorAssignedPatients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/superadmin/doctors/working/patients');
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('🔍 SuperAdmin assigned patients raw response:', response.data);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assigned patients');
    }
  }
);

export const fetchSuperAdminDoctorPatientById = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorPatientById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await API.get(`/superadmin/doctors/working/patient/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient');
    }
  }
);





export const fetchSuperAdminDoctorCompletedReports = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorCompletedReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/superadmin/doctors/working/completed-reports');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch completed reports');
    }
  }
);

export const fetchSuperAdminDoctorWorkingStats = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorWorkingStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/superadmin/doctors/working/stats');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch working stats');
    }
  }
);

// Lab Reports functionality
export const fetchSuperAdminDoctorLabReports = createAsyncThunk(
  'superAdminDoctor/fetchSuperAdminDoctorLabReports',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { status = 'all', page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      if (page) queryParams.append('page', page);
      if (limit) queryParams.append('limit', limit);

      const response = await API.get(`/superadmin/doctors/working/lab-reports?${queryParams}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lab reports');
    }
  }
);

export const sendFeedbackToCenterDoctor = createAsyncThunk(
  'superAdminDoctor/sendFeedbackToCenterDoctor',
  async (feedbackData, { rejectWithValue }) => {
    try {
      const response = await API.post('/superadmin/doctors/working/send-feedback', feedbackData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send feedback');
    }
  }
);

const initialState = {
  // Management state
  doctors: [],
  currentDoctor: null,
  stats: null,
  loading: false,
  error: null,
  success: false,
  message: '',
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  },
  filters: {
    search: '',
    status: ''
  },
  
  // Working state
  patients: [],
  patientsLoading: false,
  patientsError: null,
  assignedPatients: [],
  selectedPatient: null,
  patientHistory: null,
  patientFollowups: null,
  patientMedications: null,
  patientLabReports: null,
  completedReports: [],
  labReports: [],
  labReportsPagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  },
  workingStats: null,
  workingLoading: false,
  workingError: null,
  dataLoading: false,
  dataError: null
};

const superAdminDoctorSlice = createSlice({
  name: 'superAdminDoctor',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.workingError = null;
    },
    clearWorkingError: (state) => {
      state.workingError = null;
    },
    setSelectedPatient: (state, action) => {
      state.selectedPatient = action.payload;
    },
    clearSuccess: (state) => {
      state.success = false;
      state.message = '';
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    // Management reducers
    builder
      .addCase(fetchSuperAdminDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuperAdminDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.doctors = action.payload.doctors || action.payload;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchSuperAdminDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addSuperAdminDoctor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSuperAdminDoctor.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = 'Superadmin doctor added successfully';
        state.doctors.push(action.payload);
      })
      .addCase(addSuperAdminDoctor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteSuperAdminDoctor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSuperAdminDoctor.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = 'Superadmin doctor deleted successfully';
        state.doctors = state.doctors.filter(doctor => doctor._id !== action.payload);
      })
      .addCase(deleteSuperAdminDoctor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSuperAdminDoctor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSuperAdminDoctor.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = 'Superadmin doctor updated successfully';
        const index = state.doctors.findIndex(doctor => doctor._id === action.payload._id);
        if (index !== -1) {
          state.doctors[index] = action.payload;
        }
      })
      .addCase(updateSuperAdminDoctor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleSuperAdminDoctorStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleSuperAdminDoctorStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = 'Superadmin doctor status updated successfully';
        const index = state.doctors.findIndex(doctor => doctor._id === action.payload._id);
        if (index !== -1) {
          state.doctors[index] = action.payload;
        }
      })
      .addCase(toggleSuperAdminDoctorStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSuperAdminDoctorStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuperAdminDoctorStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchSuperAdminDoctorStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSuperAdminDoctorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuperAdminDoctorById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDoctor = action.payload;
      })
      .addCase(fetchSuperAdminDoctorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Working reducers
    builder
      .addCase(fetchSuperAdminDoctorPatients.pending, (state) => {
        state.patientsLoading = true;
        state.patientsError = null;
      })
      .addCase(fetchSuperAdminDoctorPatients.fulfilled, (state, action) => {
        state.patientsLoading = false;
        state.patients = action.payload.patients || action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatients.rejected, (state, action) => {
        state.patientsLoading = false;
        state.patientsError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorAssignedPatients.pending, (state) => {
        state.workingLoading = true;
        state.workingError = null;
      })
      .addCase(fetchSuperAdminDoctorAssignedPatients.fulfilled, (state, action) => {
        state.workingLoading = false;
        state.assignedPatients = normalizePatientsArray(action.payload);
      })
      .addCase(fetchSuperAdminDoctorAssignedPatients.rejected, (state, action) => {
        state.workingLoading = false;
        state.workingError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientById.pending, (state) => {
        state.dataLoading = true;
        state.dataError = null;
      })
      .addCase(fetchSuperAdminDoctorPatientById.fulfilled, (state, action) => {
        state.dataLoading = false;
        state.singlePatient = action.payload.patient || action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientById.rejected, (state, action) => {
        state.dataLoading = false;
        state.dataError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientHistory.pending, (state) => {
        state.workingLoading = true;
        state.workingError = null;
      })
      .addCase(fetchSuperAdminDoctorPatientHistory.fulfilled, (state, action) => {
        state.workingLoading = false;
        state.patientHistory = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientHistory.rejected, (state, action) => {
        state.workingLoading = false;
        state.workingError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientFollowups.pending, (state) => {
        state.dataLoading = true;
        state.dataError = null;
      })
      .addCase(fetchSuperAdminDoctorPatientFollowups.fulfilled, (state, action) => {
        state.dataLoading = false;
        state.patientFollowups = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientFollowups.rejected, (state, action) => {
        state.dataLoading = false;
        state.dataError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientMedications.pending, (state) => {
        state.dataLoading = true;
        state.dataError = null;
      })
      .addCase(fetchSuperAdminDoctorPatientMedications.fulfilled, (state, action) => {
        state.dataLoading = false;
        state.patientMedications = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientMedications.rejected, (state, action) => {
        state.dataLoading = false;
        state.dataError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientLabReports.pending, (state) => {
        state.dataLoading = true;
        state.dataError = null;
      })
      .addCase(fetchSuperAdminDoctorPatientLabReports.fulfilled, (state, action) => {
        state.dataLoading = false;
        state.patientLabReports = action.payload;
      })
      .addCase(fetchSuperAdminDoctorPatientLabReports.rejected, (state, action) => {
        state.dataLoading = false;
        state.dataError = action.payload;
      })

      .addCase(fetchSuperAdminDoctorCompletedReports.pending, (state) => {
        state.workingLoading = true;
        state.workingError = null;
      })
      .addCase(fetchSuperAdminDoctorCompletedReports.fulfilled, (state, action) => {
        state.workingLoading = false;
        state.completedReports = action.payload;
      })
      .addCase(fetchSuperAdminDoctorCompletedReports.rejected, (state, action) => {
        state.workingLoading = false;
        state.workingError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorWorkingStats.pending, (state) => {
        state.workingLoading = true;
        state.workingError = null;
      })
      .addCase(fetchSuperAdminDoctorWorkingStats.fulfilled, (state, action) => {
        state.workingLoading = false;
        state.workingStats = action.payload;
      })
      .addCase(fetchSuperAdminDoctorWorkingStats.rejected, (state, action) => {
        state.workingLoading = false;
        state.workingError = action.payload;
      })
      .addCase(fetchSuperAdminDoctorLabReports.pending, (state) => {
        state.workingLoading = true;
        state.workingError = null;
      })
      .addCase(fetchSuperAdminDoctorLabReports.fulfilled, (state, action) => {
        state.workingLoading = false;
        state.labReports = action.payload.reports || action.payload;
        if (action.payload.pagination) {
          state.labReportsPagination = action.payload.pagination;
        } else {
          state.labReportsPagination = {
            currentPage: action.payload.page || 1,
            totalPages: action.payload.pages || 1,
            total: action.payload.total || (Array.isArray(state.labReports) ? state.labReports.length : 0),
            limit: state.labReportsPagination.limit || 10
          };
        }
      })
      .addCase(fetchSuperAdminDoctorLabReports.rejected, (state, action) => {
        state.workingLoading = false;
        state.workingError = action.payload;
      })
      .addCase(sendFeedbackToCenterDoctor.pending, (state) => {
        state.workingLoading = true;
        state.workingError = null;
      })
      .addCase(sendFeedbackToCenterDoctor.fulfilled, (state, action) => {
        state.workingLoading = false;
        state.success = true;
        state.message = 'Feedback sent successfully to center doctor';
        // Update the report status in labReports
        const reportIndex = state.labReports.findIndex(report => report._id === action.payload.reportId);
        if (reportIndex !== -1) {
          state.labReports[reportIndex].status = 'feedback_sent';
        }
      })
      .addCase(sendFeedbackToCenterDoctor.rejected, (state, action) => {
        state.workingLoading = false;
        state.workingError = action.payload;
      });
  }
});

export const { clearError, clearWorkingError, setSelectedPatient, clearSuccess, setFilters } = superAdminDoctorSlice.actions;
export default superAdminDoctorSlice.reducer; 