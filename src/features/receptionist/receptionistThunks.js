import { createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';
import {
  setLoading,
  setError,
  setPatients,
  setStats,
  setFollowUps,
  setPrescriptions,
  setPrescription,
  setMedications,
  setHistory,
  setTests,
  setSinglePatient,
  setPatientLoading,
  setPatientError,
  setAddSuccess,
  setAddTestSuccess,
  setAddAllergicRhinitisSuccess,
  setAddAtopicDermatitisSuccess,
  setAddAllergicConjunctivitisSuccess,
  setAddAllergicBronchitisSuccess,
  setAddGPESuccess,
  setUpdateSuccess,
  setDeleteSuccess,
  addPatient,
  updatePatient,
  deletePatient,
  addFollowUp,
  addPrescription,
  addMedication,
  addTest,
  resetState,
  setAddHistorySuccess,
  setAddMedicationSuccess
} from './receptionistSlice';
// Billing: fetch test requests for billing
export const fetchReceptionistBillingRequests = createAsyncThunk(
  'receptionist/fetchBillingRequests',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const res = await API.get('/test-requests/billing/mine');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch billing requests');
    }
  }
);

// SLIT Therapy: fetch requests for receptionist
export const fetchReceptionistSlitTherapyRequests = createAsyncThunk(
  'receptionist/fetchSlitTherapyRequests',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await API.get('/slit-therapy/receptionist', { params });
      return res.data?.requests || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch SLIT therapy requests');
    }
  }
);

// SLIT Therapy: create new request
export const createReceptionistSlitTherapyRequest = createAsyncThunk(
  'receptionist/createSlitTherapyRequest',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await API.post('/slit-therapy', payload);
      return res.data?.request;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create SLIT therapy request');
    }
  }
);

// SLIT Therapy: mark as paid
export const markReceptionistSlitTherapyPaid = createAsyncThunk(
  'receptionist/markSlitTherapyPaid',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/slit-therapy/${id}/mark-paid`, payload);
      return res.data?.request;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to record payment');
    }
  }
);

// SLIT Therapy: close request after delivery
export const closeReceptionistSlitTherapyRequest = createAsyncThunk(
  'receptionist/closeSlitTherapyRequest',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/slit-therapy/${id}/close`, payload);
      return res.data?.request;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to close SLIT therapy request');
    }
  }
);

// Billing: generate bill
export const generateReceptionistBill = createAsyncThunk(
  'receptionist/generateBill',
  async ({ requestId, payload }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/billing/test-requests/${requestId}/generate`, payload);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate bill');
    }
  }
);

// Billing: mark paid
export const markReceptionistBillPaid = createAsyncThunk(
  'receptionist/markBillPaid',
  async ({ requestId, paymentNotes, paymentMethod, transactionId, receiptUpload }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/billing/test-requests/${requestId}/mark-paid`, { 
        paymentNotes, 
        paymentMethod, 
        transactionId, 
        receiptUpload 
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark bill paid');
    }
  }
);

// Billing: verify payment
export const verifyReceptionistPayment = createAsyncThunk(
  'receptionist/verifyPayment',
  async ({ requestId, verificationNotes }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/billing/test-requests/${requestId}/verify`, { verificationNotes });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to verify payment');
    }
  }
);

// Billing: update paid bill and process refund
export const updatePaidBill = createAsyncThunk(
  'receptionist/updatePaidBill',
  async ({ requestId, payload }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/billing/test-requests/${requestId}/update-paid-bill`, payload);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update bill and process refund');
    }
  }
);

// Fetch patients for receptionist
export const fetchReceptionistPatients = createAsyncThunk(
  'receptionist/fetchPatients',
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      // Use the main patients endpoint to get all patients in the center
      // Request a high limit to get all patients (backend defaults to 10 per page)
      const res = await API.get('/patients?limit=10000&page=1');
      
      // Extract patients from response (handle both array and paginated response)
      const patients = res.data.patients || res.data;
      console.log('API response:', res.data);
      console.log('Extracted patients:', patients);
      dispatch(setPatients(patients));
      
      // Calculate stats
      const today = new Date().toDateString();
      const todayPatients = patients.filter(p => 
        new Date(p.createdAt).toDateString() === today
      ).length;
      
      // Fetch additional stats
      try {
        const statsResponse = await API.get('/dashboard/receptionist/stats');
        dispatch(setStats(statsResponse.data));
      } catch (error) {
        // Fallback to calculated stats
        dispatch(setStats({
          totalPatients: patients.length,
          todayPatients,
          pendingTests: 0,
          completedTests: 0
        }));
      }
      
      return patients;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to fetch patients'));
      throw error;
    }
  }
);

// Add new patient
export const createReceptionistPatient = createAsyncThunk(
  'receptionist/createPatient',
  async (patientData, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const res = await API.post('/patients', patientData);
      dispatch(addPatient(res.data.patient));
      dispatch(setAddSuccess(true));
      return res.data.patient;
    } catch (error) {

      const errorMessage = error.response?.data?.message || 'Failed to add patient';
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// Update patient
export const updateReceptionistPatient = createAsyncThunk(
  'receptionist/updatePatient',
  async ({ id, patientData }, { dispatch }) => {
    try {
      dispatch(setPatientLoading(true));
      const res = await API.put(`/patients/${id}`, patientData);
      dispatch(updatePatient(res.data.patient));
      dispatch(setUpdateSuccess(true));
      return res.data.patient;
    } catch (error) {
      dispatch(setPatientError(error.response?.data?.message || 'Failed to update patient'));
      throw error;
    }
  }
);

// Delete patient
export const deleteReceptionistPatient = createAsyncThunk(
  'receptionist/deletePatient',
  async (id, { dispatch }) => {
    try {
      await API.delete(`/patients/${id}`);
      dispatch(deletePatient(id));
      dispatch(setDeleteSuccess(true));
      return id;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to delete patient'));
      throw error;
    }
  }
);

// Fetch single patient
export const fetchReceptionistSinglePatient = createAsyncThunk(
  'receptionist/fetchSinglePatient',
  async (id, { dispatch }) => {
    try {
      dispatch(setPatientLoading(true));
      const res = await API.get(`/patients/${id}`);
      
      // Extract patient from response structure
      const patient = res.data.patient || res.data;
      
      dispatch(setSinglePatient(patient));
      return patient;
    } catch (error) {

      dispatch(setPatientError(error.response?.data?.message || 'Failed to fetch patient'));
      throw error;
    }
  }
);

// Fetch patient medications
export const fetchReceptionistPatientMedications = createAsyncThunk(
  'receptionist/fetchPatientMedications',
  async (patientId, { dispatch }) => {
    try {
      const res = await API.get(`/medications?patientId=${patientId}`);
      dispatch(setMedications(res.data));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to fetch patient medications'));
      throw error;
    }
  }
);

// Fetch patient history
export const fetchReceptionistPatientHistory = createAsyncThunk(
  'receptionist/fetchPatientHistory',
  async (patientId, { dispatch }) => {
    try {
      const res = await API.get(`/history/${patientId}`);
      dispatch(setHistory(res.data));
      return res.data;
    } catch (error) {

      dispatch(setError(error.response?.data?.message || 'Failed to fetch patient history'));
      throw error;
    }
  }
);

// Add patient history
export const createReceptionistPatientHistory = createAsyncThunk(
  'receptionist/createPatientHistory',
  async (historyData, { dispatch }) => {
    try {
      const formData = new FormData();
      const formCopy = { ...historyData };
      const file = formCopy.reportFile;
      delete formCopy.reportFile;

      formData.append('formData', JSON.stringify(formCopy));
      if (file) formData.append('reportFile', file);

      const res = await API.post('/history/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      dispatch(setAddHistorySuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add patient history'));
      throw error;
    }
  }
);

// Fetch patient tests
export const fetchReceptionistPatientTests = createAsyncThunk(
  'receptionist/fetchPatientTests',
  async (patientId, { dispatch }) => {
    try {
      const res = await API.get(`/patients/${patientId}/show-tests`);
      // The backend returns just the tests array directly
      dispatch(setTests(res.data));
      return res.data;
    } catch (error) {

      dispatch(setError(error.response?.data?.message || 'Failed to fetch patient tests'));
      throw error;
    }
  }
);

// Add patient tests
export const createReceptionistPatientTests = createAsyncThunk(
  'receptionist/createPatientTests',
  async ({ patientId, testData }, { dispatch }) => {
    try {
      const res = await API.post(`/patients/${patientId}/tests`, testData);
      dispatch(addTest(res.data));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add patient tests'));
      throw error;
    }
  }
);

// Add receptionist test
export const createReceptionistTest = createAsyncThunk(
  'receptionist/createTest',
  async (testData, { dispatch }) => {
    try {
      const res = await API.post('/tests', testData);
      dispatch(addTest(res.data));
      dispatch(setAddTestSuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add test'));
      throw error;
    }
  }
);

// Fetch follow-ups
export const fetchReceptionistFollowUps = createAsyncThunk(
  'receptionist/fetchFollowUps',
  async (patientId, { dispatch }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      const res = await API.get(`/followups?patientId=${patientId}`);
      dispatch(setFollowUps(res.data));
      return res.data;
    } catch (error) {
      
      dispatch(setError(error.response?.data?.message || 'Failed to fetch follow-ups'));
      throw error;
    }
  }
);

// Add follow-up
export const createReceptionistFollowUp = createAsyncThunk(
  'receptionist/createFollowUp',
  async (followUpData, { dispatch }) => {
    try {
      const res = await API.post('/followups', followUpData);
      dispatch(addFollowUp(res.data));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add follow-up'));
      throw error;
    }
  }
);

// Fetch prescriptions
export const fetchReceptionistPrescriptions = createAsyncThunk(
  'receptionist/fetchPrescriptions',
  async (patientId, { rejectWithValue }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      const res = await API.get(`/prescriptions?patientId=${patientId}`);
      
      return res.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch prescriptions');
    }
  }
);

// Add prescription
export const createReceptionistPrescription = createAsyncThunk(
  'receptionist/createPrescription',
  async (prescriptionData, { dispatch }) => {
    try {
      const res = await API.post('/prescriptions', prescriptionData);
      dispatch(addPrescription(res.data));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add prescription'));
      throw error;
    }
  }
);

// Fetch medications
export const fetchReceptionistMedications = createAsyncThunk(
  'receptionist/fetchMedications',
  async (patientId, { dispatch }) => {
    try {
      const res = await API.get(`/medications?patientId=${patientId}`);
      dispatch(setMedications(res.data));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to fetch medications'));
      throw error;
    }
  }
);

// Add medication
export const createReceptionistMedication = createAsyncThunk(
  'receptionist/createMedication',
  async (medicationData, { dispatch }) => {
    try {
      const res = await API.post('/medications', medicationData);
      dispatch(addMedication(res.data));
      dispatch(setAddMedicationSuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add medication'));
      throw error;
    }
  }
);

// Specific follow-up type thunks
export const createAllergicRhinitis = createAsyncThunk(
  'receptionist/createAllergicRhinitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/allergic-rhinitis', data);
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add allergic rhinitis'));
      throw error;
    }
  }
);

// Add receptionist allergic rhinitis
export const addReceptionistAllergicRhinitis = createAsyncThunk(
  'receptionist/addAllergicRhinitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/allergic-rhinitis', data);
      dispatch(setAddAllergicRhinitisSuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add allergic rhinitis'));
      throw error;
    }
  }
);

// Fetch receptionist allergic rhinitis
export const fetchReceptionistAllergicRhinitis = createAsyncThunk(
  'receptionist/fetchAllergicRhinitis',
  async (patientId, { dispatch }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      const res = await API.get(`/allergic-rhinitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      
      dispatch(setError(error.response?.data?.message || 'Failed to fetch allergic rhinitis'));
      throw error;
    }
  }
);

export const createAllergicConjunctivitis = createAsyncThunk(
  'receptionist/createAllergicConjunctivitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/allergic-conjunctivitis', data);
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add allergic conjunctivitis'));
      throw error;
    }
  }
);

// Add receptionist allergic conjunctivitis
export const addReceptionistAllergicConjunctivitis = createAsyncThunk(
  'receptionist/addAllergicConjunctivitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/allergic-conjunctivitis', data);
      dispatch(setAddAllergicConjunctivitisSuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add allergic conjunctivitis'));
      throw error;
    }
  }
);

// Fetch receptionist allergic conjunctivitis
export const fetchReceptionistAllergicConjunctivitis = createAsyncThunk(
  'receptionist/fetchAllergicConjunctivitis',
  async (patientId, { dispatch }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      const res = await API.get(`/allergic-conjunctivitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      
      dispatch(setError(error.response?.data?.message || 'Failed to fetch allergic conjunctivitis'));
      throw error;
    }
  }
);

export const createAllergicBronchitis = createAsyncThunk(
  'receptionist/createAllergicBronchitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/allergic-bronchitis', data);
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add allergic bronchitis'));
      throw error;
    }
  }
);

// Add receptionist allergic bronchitis
export const addReceptionistAllergicBronchitis = createAsyncThunk(
  'receptionist/addAllergicBronchitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/allergic-bronchitis', data);
      dispatch(setAddAllergicBronchitisSuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add allergic bronchitis'));
      throw error;
    }
  }
);

// Fetch receptionist allergic bronchitis
export const fetchReceptionistAllergicBronchitis = createAsyncThunk(
  'receptionist/fetchAllergicBronchitis',
  async (patientId, { dispatch }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      const res = await API.get(`/allergic-bronchitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      
      dispatch(setError(error.response?.data?.message || 'Failed to fetch allergic bronchitis'));
      throw error;
    }
  }
);

export const createAtopicDermatitis = createAsyncThunk(
  'receptionist/createAtopicDermatitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/atopic-dermatitis', data);
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add atopic dermatitis'));
      throw error;
    }
  }
);

// Add receptionist atopic dermatitis
export const addReceptionistAtopicDermatitis = createAsyncThunk(
  'receptionist/addAtopicDermatitis',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/atopic-dermatitis', data);
      dispatch(setAddAtopicDermatitisSuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add atopic dermatitis'));
      throw error;
    }
  }
);

// Fetch receptionist atopic dermatitis
export const fetchReceptionistAtopicDermatitis = createAsyncThunk(
  'receptionist/fetchAtopicDermatitis',
  async (patientId, { dispatch }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      const res = await API.get(`/atopic-dermatitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      
      dispatch(setError(error.response?.data?.message || 'Failed to fetch atopic dermatitis'));
      throw error;
    }
  }
);

export const createGPE = createAsyncThunk(
  'receptionist/createGPE',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/gpe', data);
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add GPE'));
      throw error;
    }
  }
);

// Add receptionist GPE
export const addReceptionistGPE = createAsyncThunk(
  'receptionist/addGPE',
  async (data, { dispatch }) => {
    try {
      const res = await API.post('/gpe', data);
      dispatch(setAddGPESuccess(true));
      return res.data;
    } catch (error) {
      dispatch(setError(error.response?.data?.message || 'Failed to add GPE'));
      throw error;
    }
  }
);

// Fetch receptionist GPE
export const fetchReceptionistGPE = createAsyncThunk(
  'receptionist/fetchGPE',
  async (patientId, { dispatch }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      const res = await API.get(`/gpe?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      
      dispatch(setError(error.response?.data?.message || 'Failed to fetch GPE'));
      throw error;
    }
  }
);

// Fetch test requests for a specific patient
export const fetchReceptionistTestRequests = createAsyncThunk(
  'receptionist/fetchTestRequests',
  async (patientId, { dispatch }) => {
    try {
      if (!patientId) {

        return [];
      }
      
      // Use the correct endpoint for getting test requests by patient
      const res = await API.get(`/test-requests/patient/${patientId}`);
      return res.data;
    } catch (error) {
      console.error('❌ Test requests fetch error:', error.response?.data || error.message);
      dispatch(setError(error.response?.data?.message || 'Failed to fetch test requests'));
      throw error;
    }
  }
); 

// Fetch single prescription
export const fetchReceptionistPrescription = createAsyncThunk(
  'receptionist/fetchPrescription',
  async (prescriptionId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/prescriptions/${prescriptionId}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch prescription');
    }
  }
);

// Delete prescription
export const deleteReceptionistPrescription = createAsyncThunk(
  'receptionist/deletePrescription',
  async (prescriptionId, { rejectWithValue }) => {
    try {
      const res = await API.delete(`/prescriptions/${prescriptionId}`);
      return prescriptionId; // Return the ID so we can remove it from state
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete prescription');
    }
  }
);

// Reset receptionist state
export const resetReceptionistState = createAsyncThunk(
  'receptionist/resetState',
  async (_, { dispatch }) => {
    dispatch(resetState());
  }
); 

// Fetch single patient
export const fetchPatient = createAsyncThunk(
  'receptionist/fetchPatient',
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/patients/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Patient fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient');
    }
  }
); 