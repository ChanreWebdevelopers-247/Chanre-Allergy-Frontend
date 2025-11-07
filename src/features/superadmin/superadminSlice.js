import { createSlice } from '@reduxjs/toolkit';
import { 
  fetchCenterInfo, 
  fetchFollowUpPatients, 
  fetchDetailedFollowUps,
  fetchPatientFollowUps,
  fetchAllergicRhinitisList,
  fetchAllergicConjunctivitisList,
  fetchAllergicBronchitisList,
  fetchAtopicDermatitisList,
  fetchGPEList,
  fetchGPE,
  fetchAllergicRhinitis,
  fetchAllergicConjunctivitis,
  fetchAtopicDermatitis,
  fetchAllergicBronchitis,
  fetchCenterAdmin,
  createCenterAdmin,
  updateCenterAdmin,
  deleteCenterAdmin,
  fetchDashboardStats,
  fetchCenters,
  fetchCenterAdmins,
  fetchLabStaff,
  createLabStaff,
  updateLabStaff,
  deleteLabStaff,
  fetchSlitLabStaff,
  fetchSlitLabStaffById,
  createSlitLabStaff,
  updateSlitLabStaff,
  deleteSlitLabStaff,
  fetchPatientComprehensiveData,
  fetchPatientTestHistory,
  fetchPatientMedications,
  fetchPatientPrescriptions,
  fetchPatientHistory,
  fetchPatientGeneralFollowUps,
  fetchCenterDetailedInfo,
  fetchCenterPatients,
  fetchCenterDoctors,
  fetchCenterReceptionists
} from './superadminThunks';

const initialState = {
  center: null,
  centerLoading: false,
  centerError: null,
  centerAdmin: null,
  isNewAdmin: false,
  followUpPatients: [],
  patientFollowUps: [],
  allergicRhinitisList: [],
  allergicConjunctivitisList: [],
  allergicBronchitisList: [],
  atopicDermatitisList: [],
  gpeList: [],
  gpe: null,
  allergicRhinitis: null,
  allergicConjunctivitis: null,
  atopicDermatitis: null,
  allergicBronchitis: null,
  dashboardStats: {
    totalCenters: 0,
    totalAdmins: 0,
    totalPatients: 0,
    totalTests: 0
  },
  centers: [],
  centerAdmins: [],
  labStaff: [],
  slitLabStaff: [],
  slitLabStaffMember: null,
  loading: false,
  error: null,
  success: false, // Added for general success state
  addSuccess: false,
  updateSuccess: false,
  deleteSuccess: false,
  addLabStaffSuccess: false,
  addSlitLabStaffSuccess: false,
  updateSlitLabStaffSuccess: false,
  deleteSlitLabStaffSuccess: false,
  // New patient data state
  patientData: {
    patient: null,
    history: [],
    medications: [],
    labReports: [],
    testRequests: [],
    prescriptions: []
  },
  patientDataLoading: false,
  patientDataError: null,
  // Detailed center information state
  centerDetailedInfo: {
    center: null,
    patients: [],
    doctors: [],
    receptionists: []
  },
  centerDetailedLoading: false,
  centerDetailedError: null
};

const superadminSlice = createSlice({
  name: 'superadmin',
  initialState,
  reducers: {
    resetSuperadminState: (state) => {
      state.addSuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
      state.success = false;
      state.error = null;
      state.centerError = null;
      state.centerAdmin = null;
      state.isNewAdmin = false;
      state.addLabStaffSuccess = false;
      state.addSlitLabStaffSuccess = false;
      state.updateSlitLabStaffSuccess = false;
      state.deleteSlitLabStaffSuccess = false;
      state.slitLabStaffMember = null;
    },
    clearError: (state) => {
      state.error = null;
      state.centerError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardStats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch centers
      .addCase(fetchCenters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCenters.fulfilled, (state, action) => {
        state.loading = false;
        state.centers = action.payload;
        state.error = null;
      })
      .addCase(fetchCenters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch center admins
      .addCase(fetchCenterAdmins.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCenterAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.centerAdmins = action.payload;
        state.error = null;
      })
      .addCase(fetchCenterAdmins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch center info
      .addCase(fetchCenterInfo.pending, (state) => {
        state.centerLoading = true;
        state.centerError = null;
      })
      .addCase(fetchCenterInfo.fulfilled, (state, action) => {
        state.centerLoading = false;
        state.center = action.payload;
        state.centerError = null;
      })
      .addCase(fetchCenterInfo.rejected, (state, action) => {
        state.centerLoading = false;
        state.centerError = action.payload;
      })
      
      // Fetch follow-up patients
      .addCase(fetchFollowUpPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowUpPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.followUpPatients = action.payload;
        state.error = null;
      })
      .addCase(fetchFollowUpPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch patient follow-ups
      .addCase(fetchPatientFollowUps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientFollowUps.fulfilled, (state, action) => {
        state.loading = false;
        state.patientFollowUps = action.payload;
        state.error = null;
      })
      .addCase(fetchPatientFollowUps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch patient general follow-ups
      .addCase(fetchPatientGeneralFollowUps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientGeneralFollowUps.fulfilled, (state, action) => {
        state.loading = false;
        state.patientFollowUps = action.payload;
        state.error = null;
      })
      .addCase(fetchPatientGeneralFollowUps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch detailed follow-ups
      .addCase(fetchDetailedFollowUps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDetailedFollowUps.fulfilled, (state, action) => {
        state.loading = false;
        // Assuming action.payload is an array of detailed follow-ups
        // You might need to adjust this based on the actual structure of detailed follow-ups
        // For now, we'll just set it to the payload
        state.patientFollowUps = action.payload; // Assuming patientFollowUps is the correct state for detailed follow-ups
        state.error = null;
      })
      .addCase(fetchDetailedFollowUps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch allergic rhinitis list
      .addCase(fetchAllergicRhinitisList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllergicRhinitisList.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicRhinitisList = action.payload;
        state.error = null;
      })
      .addCase(fetchAllergicRhinitisList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch allergic conjunctivitis list
      .addCase(fetchAllergicConjunctivitisList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllergicConjunctivitisList.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicConjunctivitisList = action.payload;
        state.error = null;
      })
      .addCase(fetchAllergicConjunctivitisList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch allergic bronchitis list
      .addCase(fetchAllergicBronchitisList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllergicBronchitisList.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicBronchitisList = action.payload;
        state.error = null;
      })
      .addCase(fetchAllergicBronchitisList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch atopic dermatitis list
      .addCase(fetchAtopicDermatitisList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAtopicDermatitisList.fulfilled, (state, action) => {
        state.loading = false;
        state.atopicDermatitisList = action.payload;
        state.error = null;
      })
      .addCase(fetchAtopicDermatitisList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch GPE list
      .addCase(fetchGPEList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGPEList.fulfilled, (state, action) => {
        state.loading = false;
        state.gpeList = action.payload;
        state.error = null;
      })
      .addCase(fetchGPEList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch GPE
      .addCase(fetchGPE.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGPE.fulfilled, (state, action) => {
        state.loading = false;
        state.gpe = action.payload;
        state.error = null;
      })
      .addCase(fetchGPE.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Allergic Rhinitis
      .addCase(fetchAllergicRhinitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllergicRhinitis.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicRhinitis = action.payload;
        state.error = null;
      })
      .addCase(fetchAllergicRhinitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Allergic Conjunctivitis
      .addCase(fetchAllergicConjunctivitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllergicConjunctivitis.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicConjunctivitis = action.payload;
        state.error = null;
      })
      .addCase(fetchAllergicConjunctivitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Atopic Dermatitis
      .addCase(fetchAtopicDermatitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAtopicDermatitis.fulfilled, (state, action) => {
        state.loading = false;
        state.atopicDermatitis = action.payload;
        state.error = null;
      })
      .addCase(fetchAtopicDermatitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Allergic Bronchitis
      .addCase(fetchAllergicBronchitis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllergicBronchitis.fulfilled, (state, action) => {
        state.loading = false;
        state.allergicBronchitis = action.payload;
        state.error = null;
      })
      .addCase(fetchAllergicBronchitis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch center admin
      .addCase(fetchCenterAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCenterAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.centerAdmin = action.payload;
        state.isNewAdmin = !action.payload; // Set to true if no admin found (null), false if admin exists
        state.error = null;
      })
      .addCase(fetchCenterAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isNewAdmin = true; // If error occurs, assume we're creating a new one
      })
      
      // Create center admin
      .addCase(createCenterAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCenterAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.centerAdmin = action.payload;
        state.isNewAdmin = false;
        state.addSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(createCenterAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update center admin
      .addCase(updateCenterAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCenterAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.centerAdmin = action.payload;
        state.updateSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(updateCenterAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete center admin
      .addCase(deleteCenterAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCenterAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.deleteSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(deleteCenterAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch lab staff
      .addCase(fetchLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.labStaff = action.payload;
        state.error = null;
      })
      .addCase(fetchLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create lab staff
      .addCase(createLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.addLabStaffSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(createLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update lab staff
      .addCase(updateLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.updateSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(updateLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete lab staff
      .addCase(deleteLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.deleteSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(deleteLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch SLIT lab staff
      .addCase(fetchSlitLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSlitLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.slitLabStaff = action.payload;
        state.error = null;
      })
      .addCase(fetchSlitLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch SLIT lab staff by ID
      .addCase(fetchSlitLabStaffById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSlitLabStaffById.fulfilled, (state, action) => {
        state.loading = false;
        state.slitLabStaffMember = action.payload;
        state.error = null;
      })
      .addCase(fetchSlitLabStaffById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create SLIT lab staff
      .addCase(createSlitLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSlitLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        const newStaff = action.payload?.staff || null;
        if (newStaff) {
          state.slitLabStaff = [newStaff, ...state.slitLabStaff];
          state.slitLabStaffMember = newStaff;
        }
        state.addSlitLabStaffSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(createSlitLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update SLIT lab staff
      .addCase(updateSlitLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSlitLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        const updatedStaff = action.payload?.staff || null;
        if (updatedStaff) {
          state.slitLabStaff = state.slitLabStaff.map((staff) =>
            staff._id === updatedStaff._id ? updatedStaff : staff
          );
          state.slitLabStaffMember = updatedStaff;
        }
        state.updateSlitLabStaffSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(updateSlitLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete SLIT lab staff
      .addCase(deleteSlitLabStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSlitLabStaff.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload?.id;
        if (deletedId) {
          state.slitLabStaff = state.slitLabStaff.filter((staff) => staff._id !== deletedId);
        }
        state.deleteSlitLabStaffSuccess = true;
        state.success = true;
        state.error = null;
      })
      .addCase(deleteSlitLabStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch comprehensive patient data
      .addCase(fetchPatientComprehensiveData.pending, (state) => {
        state.patientDataLoading = true;
        state.patientDataError = null;
      })
      .addCase(fetchPatientComprehensiveData.fulfilled, (state, action) => {
        state.patientDataLoading = false;
        state.patientData = action.payload;
        state.patientDataError = null;
      })
      .addCase(fetchPatientComprehensiveData.rejected, (state, action) => {
        state.patientDataLoading = false;
        state.patientDataError = action.payload;
      })

      // Fetch patient test history
      .addCase(fetchPatientTestHistory.pending, (state) => {
        state.patientDataLoading = true;
        state.patientDataError = null;
      })
      .addCase(fetchPatientTestHistory.fulfilled, (state, action) => {
        state.patientDataLoading = false;
        state.patientData.testRequests = action.payload;
        state.patientDataError = null;
      })
      .addCase(fetchPatientTestHistory.rejected, (state, action) => {
        state.patientDataLoading = false;
        state.patientDataError = action.payload;
      })

      // Fetch patient medications
      .addCase(fetchPatientMedications.pending, (state) => {
        state.patientDataLoading = true;
        state.patientDataError = null;
      })
      .addCase(fetchPatientMedications.fulfilled, (state, action) => {
        state.patientDataLoading = false;
        state.patientData.medications = action.payload;
        state.patientDataError = null;
      })
      .addCase(fetchPatientMedications.rejected, (state, action) => {
        state.patientDataLoading = false;
        state.patientDataError = action.payload;
      })

      // Fetch patient prescriptions
      .addCase(fetchPatientPrescriptions.pending, (state) => {
        state.patientDataLoading = true;
        state.patientDataError = null;
      })
      .addCase(fetchPatientPrescriptions.fulfilled, (state, action) => {
        state.patientDataLoading = false;
        state.patientData.prescriptions = action.payload;
        state.patientDataError = null;
      })
      .addCase(fetchPatientPrescriptions.rejected, (state, action) => {
        state.patientDataLoading = false;
        state.patientDataError = action.payload;
      })

      // Fetch patient medical history
      .addCase(fetchPatientHistory.pending, (state) => {
        state.patientDataLoading = true;
        state.patientDataError = null;
      })
      .addCase(fetchPatientHistory.fulfilled, (state, action) => {
        state.patientDataLoading = false;
        state.patientData.history = action.payload;
        state.patientDataError = null;
      })
      .addCase(fetchPatientHistory.rejected, (state, action) => {
        state.patientDataLoading = false;
        state.patientDataError = action.payload;
      })

      // Fetch detailed center information
      .addCase(fetchCenterDetailedInfo.pending, (state) => {
        state.centerDetailedLoading = true;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterDetailedInfo.fulfilled, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedInfo = action.payload;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterDetailedInfo.rejected, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedError = action.payload;
      })

      // Fetch center patients
      .addCase(fetchCenterPatients.pending, (state) => {
        state.centerDetailedLoading = true;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterPatients.fulfilled, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedInfo.patients = action.payload;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterPatients.rejected, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedError = action.payload;
      })

      // Fetch center doctors
      .addCase(fetchCenterDoctors.pending, (state) => {
        state.centerDetailedLoading = true;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterDoctors.fulfilled, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedInfo.doctors = action.payload;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterDoctors.rejected, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedError = action.payload;
      })

      // Fetch center receptionists
      .addCase(fetchCenterReceptionists.pending, (state) => {
        state.centerDetailedLoading = true;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterReceptionists.fulfilled, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedInfo.receptionists = action.payload;
        state.centerDetailedError = null;
      })
      .addCase(fetchCenterReceptionists.rejected, (state, action) => {
        state.centerDetailedLoading = false;
        state.centerDetailedError = action.payload;
      });
  }
});

export const {
  resetSuperadminState,
  clearError
} = superadminSlice.actions;

export default superadminSlice.reducer; 