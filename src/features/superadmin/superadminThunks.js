import { createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// Fetch dashboard stats
export const fetchDashboardStats = createAsyncThunk(
  'superadmin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/dashboard/superadmin/stats');
      return res.data;
    } catch (error) {
      console.error('Dashboard stats error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }
);

// Fetch all centers
export const fetchCenters = createAsyncThunk(
  'superadmin/fetchCenters',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/centers');
      return res.data;
    } catch (error) {
      console.error('Centers fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch centers');
    }
  }
);

// Fetch center admins
export const fetchCenterAdmins = createAsyncThunk(
  'superadmin/fetchCenterAdmins',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/center-admins');
      return res.data;
    } catch (error) {
      console.error('Center admins fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch center admins');
    }
  }
);

// Fetch center info with stats
export const fetchCenterInfo = createAsyncThunk(
  'superadmin/fetchCenterInfo',
  async (centerId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/centers/${centerId}/stats`);
      return res.data;
    } catch (error) {
      console.error('Center info error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch center info');
    }
  }
);

// Fetch follow-up patients
export const fetchFollowUpPatients = createAsyncThunk(
  'superadmin/fetchFollowUpPatients',
  async (_, { rejectWithValue }) => {
    try {
  
      const res = await API.get('/followups/patients');

      return res.data;
    } catch (error) {
     
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch follow-up patients');
    }
  }
);

// Fetch detailed follow-up data
export const fetchDetailedFollowUps = createAsyncThunk(
  'superadmin/fetchDetailedFollowUps',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/followups/detailed');
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch detailed follow-ups');
    }
  }
);



// Fetch comprehensive patient data
export const fetchPatientComprehensiveData = createAsyncThunk(
  'superadmin/fetchPatientComprehensiveData',
  async (patientId, { rejectWithValue }) => {
    try {
      // Fetch all patient data in parallel using working endpoints
      const [patientRes, historyRes, medicationsRes, prescriptionsRes, testRequestsRes] = await Promise.all([
        API.get(`/patients/${patientId}`),
        API.get(`/history/${patientId}`),
        API.get(`/medications?patientId=${patientId}`),
        API.get(`/prescriptions?patientId=${patientId}`),
        API.get(`/test-requests/patient/${patientId}`)
      ]);

      return {
        patient: patientRes.data,
        history: historyRes.data,
        medications: medicationsRes.data,
        prescriptions: prescriptionsRes.data,
        testRequests: testRequestsRes.data
      };
    } catch (error) {
      console.error('Error fetching patient data:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient data');
    }
  }
);

// Fetch patient test history
export const fetchPatientTestHistory = createAsyncThunk(
  'superadmin/fetchPatientTestHistory',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/test-requests/patient/${patientId}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch test history');
    }
  }
);

// Fetch patient medications
export const fetchPatientMedications = createAsyncThunk(
  'superadmin/fetchPatientMedications',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/medications?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch medications');
    }
  }
);

// Fetch patient prescriptions
export const fetchPatientPrescriptions = createAsyncThunk(
  'superadmin/fetchPatientPrescriptions',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/prescriptions?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch prescriptions');
    }
  }
);

// Fetch patient medical history
export const fetchPatientHistory = createAsyncThunk(
  'superadmin/fetchPatientHistory',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/history/${patientId}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch medical history');
    }
  }
);

// Fetch patient follow-ups by type
export const fetchPatientFollowUps = createAsyncThunk(
  'superadmin/fetchPatientFollowUps',
  async ({ patientId, type }, { rejectWithValue }) => {
    try {
      let url = '';
      switch (type) {
        case 'Allergic Rhinitis':
          url = '/allergic-rhinitis';
          break;
        case 'Atopic Dermatitis':
          url = '/atopic-dermatitis';
          break;
        case 'Allergic Conjunctivitis':
          url = '/allergic-conjunctivitis';
          break;
        case 'Allergic Bronchitis':
          url = '/allergic-bronchitis';
          break;
        default:
          url = '/followups';
      }
      
      const res = await API.get(`${url}?patientId=${patientId}`);
      return res.data;
    } catch (error) {
   
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient follow-ups');
    }
  }
);

// Fetch general patient follow-ups
export const fetchPatientGeneralFollowUps = createAsyncThunk(
  'superadmin/fetchPatientGeneralFollowUps',
  async (patientId, { rejectWithValue }) => {
    try {
      // Validate patientId before making API call
      if (!patientId || patientId === 'undefined' || patientId === 'null' || patientId === '') {
        console.error('❌ fetchPatientGeneralFollowUps: Invalid patientId:', patientId);
        return rejectWithValue('Invalid patient ID provided');
      }
      
      const res = await API.get(`/followups/detailed`);
      
      // Filter the detailed follow-ups by patientId
      const patientFollowUps = res.data.filter(followUp => 
        followUp.patientId?._id === patientId || followUp.patientId === patientId
      );
      
      return patientFollowUps;
    } catch (error) {
      console.error('❌ Error fetching patient general follow-ups:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient follow-ups');
    }
  }
);

// Fetch allergic rhinitis list
export const fetchAllergicRhinitisList = createAsyncThunk(
  'superadmin/fetchAllergicRhinitisList',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/allergic-rhinitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Allergic rhinitis error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch allergic rhinitis list');
    }
  }
);

// Fetch allergic conjunctivitis list
export const fetchAllergicConjunctivitisList = createAsyncThunk(
  'superadmin/fetchAllergicConjunctivitisList',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/allergic-conjunctivitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Allergic conjunctivitis error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch allergic conjunctivitis list');
    }
  }
);

// Fetch allergic bronchitis list
export const fetchAllergicBronchitisList = createAsyncThunk(
  'superadmin/fetchAllergicBronchitisList',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/allergic-bronchitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Allergic bronchitis error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch allergic bronchitis list');
    }
  }
);

// Fetch atopic dermatitis list
export const fetchAtopicDermatitisList = createAsyncThunk(
  'superadmin/fetchAtopicDermatitisList',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/atopic-dermatitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Atopic dermatitis error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch atopic dermatitis list');
    }
  }
);

// Fetch GPE list
export const fetchGPEList = createAsyncThunk(
  'superadmin/fetchGPEList',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/gpe?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('GPE error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch GPE list');
    }
  }
);

// Fetch GPE
export const fetchGPE = createAsyncThunk(
  'superadmin/fetchGPE',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/gpe?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('GPE fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch GPE');
    }
  }
);

// Fetch Allergic Rhinitis
export const fetchAllergicRhinitis = createAsyncThunk(
  'superadmin/fetchAllergicRhinitis',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/allergic-rhinitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Allergic rhinitis fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch allergic rhinitis');
    }
  }
);

// Fetch Allergic Conjunctivitis
export const fetchAllergicConjunctivitis = createAsyncThunk(
  'superadmin/fetchAllergicConjunctivitis',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/allergic-conjunctivitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Allergic conjunctivitis fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch allergic conjunctivitis');
    }
  }
);

// Fetch Atopic Dermatitis
export const fetchAtopicDermatitis = createAsyncThunk(
  'superadmin/fetchAtopicDermatitis',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/atopic-dermatitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Atopic dermatitis fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch atopic dermatitis');
    }
  }
);

// Fetch Allergic Bronchitis
export const fetchAllergicBronchitis = createAsyncThunk(
  'superadmin/fetchAllergicBronchitis',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/allergic-bronchitis?patientId=${patientId}`);
      return res.data;
    } catch (error) {
      console.error('Allergic bronchitis fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch allergic bronchitis');
    }
  }
); 

// Fetch center admin
export const fetchCenterAdmin = createAsyncThunk(
  'superadmin/fetchCenterAdmin',
  async (centerId, { rejectWithValue }) => {
    try {
      // First, let's get all centers to see what we're working with
      const centersRes = await API.get('/centers');
      
      // Try to get all center admins and find the one for this center
      const res = await API.get('/center-admins');
      
      // First try to find by centerId (normal case)
      let centerAdmin = res.data.find(admin => 
        admin.centerId && admin.centerId.toString() === centerId.toString()
      );
      
      // If not found, try to find by admin ID (in case someone passed admin ID instead of center ID)
      if (!centerAdmin) {
        centerAdmin = res.data.find(admin => 
          admin._id && admin._id.toString() === centerId.toString()
        );
      }
      
      if (centerAdmin) {
        // Get the complete admin data using getCenterAdminById
        const completeAdminRes = await API.get(`/center-admins/${centerAdmin._id}`);
        const completeAdmin = completeAdminRes.data;
        
        return completeAdmin;
      }
      
      // If no admin exists, return null (this will trigger isNewAdmin = true)
      return null;
    } catch (error) {
      console.error('Center admin error:', error.response?.data || error.message);
      // If it's a 404 or any other error, it means no admin exists, so return null
      return null;
    }
  }
);

// Create center admin
export const createCenterAdmin = createAsyncThunk(
  'superadmin/createCenterAdmin',
  async (adminData, { rejectWithValue }) => {
    try {
      const res = await API.post('/center-admins', adminData);
      return res.data;
    } catch (error) {
      console.error('Create center admin error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to create center admin');
    }
  }
);

// Update center admin
export const updateCenterAdmin = createAsyncThunk(
  'superadmin/updateCenterAdmin',
  async ({ id, adminData }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/center-admins/${id}`, adminData);
      return res.data;
    } catch (error) {
      console.error('Update center admin error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to update center admin');
    }
  }
);

// Delete center admin
export const deleteCenterAdmin = createAsyncThunk(
  'superadmin/deleteCenterAdmin',
  async (adminId, { rejectWithValue }) => {
    try {
      const res = await API.delete(`/center-admins/${adminId}`);
      return { adminId, message: res.data.message };
    } catch (error) {
      console.error('Delete center admin error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete center admin');
    }
  }
);

// Fetch lab staff
export const fetchLabStaff = createAsyncThunk(
  'superadmin/fetchLabStaff',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/lab-staff');
      return res.data;
    } catch (error) {
      console.error('Lab staff fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lab staff');
    }
  }
);

// Fetch single lab staff by ID
export const fetchLabStaffById = createAsyncThunk(
  'superadmin/fetchLabStaffById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.get(`/lab-staff/${id}`);
      return res.data;
    } catch (error) {
      console.error('Lab staff fetch by ID error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lab staff');
    }
  }
);

// Create lab staff
export const createLabStaff = createAsyncThunk(
  'superadmin/createLabStaff',
  async (staffData, { rejectWithValue }) => {
    try {
      const res = await API.post('/lab-staff', staffData);
      return res.data;
    } catch (error) {
      console.error('Create lab staff error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to create lab staff');
    }
  }
);

// SLIT Lab staff management
export const fetchSlitLabStaff = createAsyncThunk(
  'superadmin/fetchSlitLabStaff',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/slit-lab-staff');
      return res.data;
    } catch (error) {
      if (error?.response?.status === 404) {
        console.warn('SLIT lab staff endpoint returned 404. Falling back to empty list.');
        return [];
      }
      console.error('Fetch SLIT lab staff error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch SLIT lab staff');
    }
  }
);

export const fetchSlitLabStaffById = createAsyncThunk(
  'superadmin/fetchSlitLabStaffById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.get(`/slit-lab-staff/${id}`);
      return res.data;
    } catch (error) {
      console.error('Fetch SLIT lab staff by ID error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch SLIT lab staff member');
    }
  }
);

export const createSlitLabStaff = createAsyncThunk(
  'superadmin/createSlitLabStaff',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await API.post('/slit-lab-staff', payload);
      return res.data;
    } catch (error) {
      console.error('Create SLIT lab staff error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to create SLIT lab staff member');
    }
  }
);

export const updateSlitLabStaff = createAsyncThunk(
  'superadmin/updateSlitLabStaff',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/slit-lab-staff/${id}`, payload);
      return res.data;
    } catch (error) {
      console.error('Update SLIT lab staff error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to update SLIT lab staff member');
    }
  }
);

export const deleteSlitLabStaff = createAsyncThunk(
  'superadmin/deleteSlitLabStaff',
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.delete(`/slit-lab-staff/${id}`);
      return { id, message: res.data?.message };
    } catch (error) {
      console.error('Delete SLIT lab staff error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete SLIT lab staff member');
    }
  }
);

// Update lab staff
export const updateLabStaff = createAsyncThunk(
  'superadmin/updateLabStaff',
  async ({ id, staffData }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/lab-staff/${id}`, staffData);
      return res.data;
    } catch (error) {
      console.error('Update lab staff error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to update lab staff');
    }
  }
);

// Delete lab staff
export const deleteLabStaff = createAsyncThunk(
  'superadmin/deleteLabStaff',
  async (staffId, { rejectWithValue }) => {
    try {
      const res = await API.delete(`/lab-staff/${staffId}`);
      return { staffId, message: res.data.message };
    } catch (error) {
      console.error('Delete lab staff error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete lab staff');
    }
  }
); 

// ===============================
// BILLING APIS
// ===============================

// Fetch all billing data for superadmin
export const fetchSuperadminBillingData = createAsyncThunk(
  'superadmin/fetchBillingData',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/billing/all');
      return res.data;
    } catch (error) {
      console.error('Billing data fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch billing data');
    }
  }
);

// Fetch billing data for a specific center (for center admin)
export const fetchCenterBillingData = createAsyncThunk(
  'superadmin/fetchCenterBillingData',
  async (centerId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/billing/center`);
      return res.data;
    } catch (error) {
      console.error('Center billing data fetch error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch center billing data');
    }
  }
);

// Generate bill for a test request
export const generateBillForTestRequest = createAsyncThunk(
  'superadmin/generateBill',
  async ({ requestId, billData }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/billing/test-requests/${requestId}/generate`, billData);
      return res.data;
    } catch (error) {
      console.error('Generate bill error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to generate bill');
    }
  }
);

// Mark bill as paid
export const markBillAsPaid = createAsyncThunk(
  'superadmin/markBillPaid',
  async ({ requestId, paymentData }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/billing/test-requests/${requestId}/mark-paid`, paymentData);
      return res.data;
    } catch (error) {
      console.error('Mark bill paid error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to mark bill as paid');
    }
  }
);

// Verify payment and approve for lab
export const verifyPaymentAndApprove = createAsyncThunk(
  'superadmin/verifyPaymentAndApprove',
  async ({ requestId, verificationNotes }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/billing/test-requests/${requestId}/verify`, { verificationNotes });
      return res.data;
    } catch (error) {
      console.error('Verify payment error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to verify payment');
    }
  }
);

// ===============================
// DETAILED CENTER INFORMATION APIS
// ===============================

// Fetch detailed center information including all patients, doctors, and receptionists
export const fetchCenterDetailedInfo = createAsyncThunk(
  'superadmin/fetchCenterDetailedInfo',
  async (centerId, { rejectWithValue }) => {
    try {
      // Fetch all data in parallel
      const [centerRes, patientsRes, doctorsRes, receptionistsRes] = await Promise.all([
        API.get(`/centers/${centerId}/stats`),
        API.get(`/patients?centerId=${centerId}`),
        API.get(`/doctors?centerId=${centerId}`),
        API.get(`/receptionists?centerId=${centerId}`)
      ]);

      console.log('🔍 API Responses:', {
        center: centerRes.data,
        patients: patientsRes.data,
        doctors: doctorsRes.data,
        receptionists: receptionistsRes.data
      });

      return {
        center: centerRes.data,
        patients: patientsRes.data.patients || patientsRes.data,
        doctors: doctorsRes.data,
        receptionists: receptionistsRes.data
      };
    } catch (error) {
      console.error('Center detailed info error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch detailed center information');
    }
  }
);

// Fetch center patients
export const fetchCenterPatients = createAsyncThunk(
  'superadmin/fetchCenterPatients',
  async (centerId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/patients?centerId=${centerId}`);
      return res.data;
    } catch (error) {
      console.error('Center patients error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch center patients');
    }
  }
);

// Fetch center doctors
export const fetchCenterDoctors = createAsyncThunk(
  'superadmin/fetchCenterDoctors',
  async (centerId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/doctors?centerId=${centerId}`);
      return res.data;
    } catch (error) {
      console.error('Center doctors error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch center doctors');
    }
  }
);

// Fetch center receptionists
export const fetchCenterReceptionists = createAsyncThunk(
  'superadmin/fetchCenterReceptionists',
  async (centerId, { rejectWithValue }) => {
    try {
      const res = await API.get(`/receptionists?centerId=${centerId}`);
      return res.data;
    } catch (error) {
      console.error('Center receptionists error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch center receptionists');
    }
  }
);

