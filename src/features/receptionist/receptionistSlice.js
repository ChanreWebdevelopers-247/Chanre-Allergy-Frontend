import { createSlice } from '@reduxjs/toolkit';
import { 
  fetchReceptionistAllergicRhinitis, 
  fetchReceptionistAtopicDermatitis, 
  fetchReceptionistAllergicConjunctivitis, 
  fetchReceptionistAllergicBronchitis, 
  fetchReceptionistGPE,
  fetchReceptionistPrescription,
  deleteReceptionistPrescription,
  fetchReceptionistPrescriptions,
  fetchReceptionistPatientHistory,
  fetchReceptionistPatientMedications,
  fetchReceptionistPatientTests,
  fetchReceptionistTestRequests,
  fetchPatient,
  fetchReceptionistBillingRequests,
  generateReceptionistBill,
  markReceptionistBillPaid
} from './receptionistThunks';

const initialState = {
  patients: [],
  loading: false,
  error: null,
  stats: {
    totalPatients: 0,
    todayPatients: 0,
    pendingTests: 0,
    completedTests: 0
  },
  followUps: [],
  prescriptions: [],
  prescription: null,
  medications: [],
  history: null,
  tests: [],
  testRequests: [],
  billingRequests: [],
  allergicRhinitis: null,
  atopicDermatitis: null,
  allergicConjunctivitis: null,
  allergicBronchitis: null,
  gpe: null,
  singlePatient: null,
  patientLoading: false,
  patientError: null,
  addSuccess: false,
  addTestSuccess: false,
  addHistorySuccess: false,
  addMedicationSuccess: false,
  addAllergicRhinitisSuccess: false,
  addAtopicDermatitisSuccess: false,
  addAllergicConjunctivitisSuccess: false,
  addAllergicBronchitisSuccess: false,
  addGPESuccess: false,
  updateSuccess: false,
  deleteSuccess: false,
  historyLoading: false,
  historyError: null
};

const receptionistSlice = createSlice({
  name: 'receptionist',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setPatients: (state, action) => {
      state.patients = action.payload;
      state.loading = false;
      state.error = null;
    },
    setStats: (state, action) => {
      state.stats = action.payload;
    },
    setFollowUps: (state, action) => {
      state.followUps = action.payload;
    },
    setPrescriptions: (state, action) => {
      state.prescriptions = action.payload;
    },
    setPrescription: (state, action) => {
      state.prescription = action.payload;
      state.loading = false;
      state.error = null;
    },
    setMedications: (state, action) => {
      state.medications = action.payload;
    },
    setHistory: (state, action) => {
      state.history = action.payload;
    },
    setTests: (state, action) => {
      state.tests = action.payload;
    },
    setTestRequests: (state, action) => {
      state.testRequests = action.payload;
    },
    setSinglePatient: (state, action) => {
      state.singlePatient = action.payload;
      state.patientLoading = false;
      state.patientError = null;
    },
    setPatientLoading: (state, action) => {
      state.patientLoading = action.payload;
    },
    setPatientError: (state, action) => {
      state.patientError = action.payload;
      state.patientLoading = false;
    },
    setAddSuccess: (state, action) => {
      state.addSuccess = action.payload;
    },
    setAddTestSuccess: (state, action) => {
      state.addTestSuccess = action.payload;
    },
    setAddHistorySuccess: (state, action) => {
      state.addHistorySuccess = action.payload;
    },
    setAddMedicationSuccess: (state, action) => {
      state.addMedicationSuccess = action.payload;
    },
    setAddAllergicRhinitisSuccess: (state, action) => {
      state.addAllergicRhinitisSuccess = action.payload;
    },
    setAddAtopicDermatitisSuccess: (state, action) => {
      state.addAtopicDermatitisSuccess = action.payload;
    },
    setAddAllergicConjunctivitisSuccess: (state, action) => {
      state.addAllergicConjunctivitisSuccess = action.payload;
    },
    setAddAllergicBronchitisSuccess: (state, action) => {
      state.addAllergicBronchitisSuccess = action.payload;
    },
    setAddGPESuccess: (state, action) => {
      state.addGPESuccess = action.payload;
    },
    setUpdateSuccess: (state, action) => {
      state.updateSuccess = action.payload;
    },
    setDeleteSuccess: (state, action) => {
      state.deleteSuccess = action.payload;
    },
    resetReceptionistState: (state) => {
      state.addSuccess = false;
      state.addTestSuccess = false;
      state.addHistorySuccess = false;
      state.addMedicationSuccess = false;
      state.addAllergicRhinitisSuccess = false;
      state.addAtopicDermatitisSuccess = false;
      state.addAllergicConjunctivitisSuccess = false;
      state.addAllergicBronchitisSuccess = false;
      state.addGPESuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
      state.error = null;
      state.patientError = null;
    },
    resetState: (state) => {
      state.addSuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
      state.error = null;
      state.patientError = null;
      state.loading = false;
      state.patientLoading = false;
    },
    addPatient: (state, action) => {
      state.patients.push(action.payload);
    },
    updatePatient: (state, action) => {
      console.log('Redux updatePatient called with:', action.payload);
      const index = state.patients.findIndex(p => p._id === action.payload._id);
      console.log('Found patient at index:', index);
      if (index !== -1) {
        console.log('Updating patient at index', index);
        state.patients[index] = action.payload;
        console.log('Patient updated successfully');
      } else {
        console.log('Patient not found in Redux store');
      }
    },
    deletePatient: (state, action) => {
      state.patients = state.patients.filter(p => p._id !== action.payload);
    },
    addFollowUp: (state, action) => {
      state.followUps.push(action.payload);
    },
    addPrescription: (state, action) => {
      state.prescriptions.push(action.payload);
    },
    addMedication: (state, action) => {
      state.medications.push(action.payload);
    },
    addTest: (state, action) => {
      state.tests.push(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      // Billing requests
      .addCase(fetchReceptionistBillingRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistBillingRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.billingRequests = action.payload || [];
      })
      .addCase(fetchReceptionistBillingRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Generate bill
      .addCase(generateReceptionistBill.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReceptionistBill.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload?.testRequest;
        if (updated) {
          const idx = state.billingRequests.findIndex(r => r._id === updated._id);
          if (idx !== -1) state.billingRequests[idx] = updated;
        }
      })
      .addCase(generateReceptionistBill.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark paid
      .addCase(markReceptionistBillPaid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markReceptionistBillPaid.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload?.testRequest;
        if (updated) {
          const idx = state.billingRequests.findIndex(r => r._id === updated._id);
          if (idx !== -1) state.billingRequests[idx] = updated;
        }
      })
      .addCase(markReceptionistBillPaid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch allergic rhinitis
      .addCase(fetchReceptionistAllergicRhinitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistAllergicRhinitis.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicRhinitis = action.payload;
      })
      .addCase(fetchReceptionistAllergicRhinitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch atopic dermatitis
      .addCase(fetchReceptionistAtopicDermatitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistAtopicDermatitis.fulfilled, (state, action) => {
        state.loading = false;
        state.atopicDermatitis = action.payload;
      })
      .addCase(fetchReceptionistAtopicDermatitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch allergic conjunctivitis
      .addCase(fetchReceptionistAllergicConjunctivitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistAllergicConjunctivitis.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicConjunctivitis = action.payload;
      })
      .addCase(fetchReceptionistAllergicConjunctivitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch allergic bronchitis
      .addCase(fetchReceptionistAllergicBronchitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistAllergicBronchitis.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicBronchitis = action.payload;
      })
      .addCase(fetchReceptionistAllergicBronchitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch GPE
      .addCase(fetchReceptionistGPE.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistGPE.fulfilled, (state, action) => {
        state.loading = false;
        state.gpe = action.payload;
      })
      .addCase(fetchReceptionistGPE.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch single prescription
      .addCase(fetchReceptionistPrescription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistPrescription.fulfilled, (state, action) => {
        state.loading = false;
        state.prescription = action.payload;
      })
      .addCase(fetchReceptionistPrescription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete prescription
      .addCase(deleteReceptionistPrescription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReceptionistPrescription.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the deleted prescription from the prescriptions array
        state.prescriptions = state.prescriptions.filter(p => p._id !== action.payload);
        // Also clear the single prescription if it was the one deleted
        if (state.prescription && state.prescription._id === action.payload) {
          state.prescription = null;
        }
      })
      .addCase(deleteReceptionistPrescription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch prescriptions
      .addCase(fetchReceptionistPrescriptions.pending, (state) => {
  
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistPrescriptions.fulfilled, (state, action) => {

        state.loading = false;
        state.prescriptions = action.payload;
      })
      .addCase(fetchReceptionistPrescriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch patient medications
      .addCase(fetchReceptionistPatientMedications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistPatientMedications.fulfilled, (state, action) => {
        state.loading = false;
        state.medications = action.payload;
      })
      .addCase(fetchReceptionistPatientMedications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch patient history
      .addCase(fetchReceptionistPatientHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchReceptionistPatientHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchReceptionistPatientHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload;
      })
      
      // Fetch patient tests
      .addCase(fetchReceptionistPatientTests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistPatientTests.fulfilled, (state, action) => {
        state.loading = false;
        state.tests = action.payload;
      })
      .addCase(fetchReceptionistPatientTests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch test requests
      .addCase(fetchReceptionistTestRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionistTestRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.testRequests = action.payload;
      })
      .addCase(fetchReceptionistTestRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch single patient
      .addCase(fetchPatient.pending, (state) => {

        state.patientLoading = true;
        state.patientError = null;
      })
      .addCase(fetchPatient.fulfilled, (state, action) => {

        state.patientLoading = false;
        state.singlePatient = action.payload;
      })
      .addCase(fetchPatient.rejected, (state, action) => {
        state.patientLoading = false;
        state.patientError = action.payload;
      });
  }
});

export const {
  setLoading,
  setError,
  clearError,
  setPatients,
  setStats,
  setFollowUps,
  setPrescriptions,
  setPrescription,
  setMedications,
  setHistory,
  setTests,
  setTestRequests,
  setAllergicRhinitis,
  setAllergicConjunctivitis,
  setAllergicBronchitis,
  setAtopicDermatitis,
  setGPE,
  setSinglePatient,
  setPatientLoading,
  setPatientError,
  setAddSuccess,
  setAddTestSuccess,
  setAddHistorySuccess,
  setAddMedicationSuccess,
  setAddAllergicRhinitisSuccess,
  setAddAtopicDermatitisSuccess,
  setAddAllergicConjunctivitisSuccess,
  setAddAllergicBronchitisSuccess,
  setAddGPESuccess,
  setUpdateSuccess,
  setDeleteSuccess,
  resetReceptionistState,
  resetState,
  addPatient,
  updatePatient,
  deletePatient,
  addFollowUp,
  addPrescription,
  addMedication,
  addTest
} = receptionistSlice.actions;

export default receptionistSlice.reducer; 