import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { fetchPatientDetails, fetchPatientMedications, fetchPatientHistory, fetchFollowUps, fetchAllergicRhinitis, fetchAllergicConjunctivitis, fetchAllergicBronchitis, fetchAtopicDermatitis, fetchGPE, fetchPrescriptions, fetchTests, updatePatient, deletePatient } from '../../../../features/centerAdmin/centerAdminThunks';
import { 
  ArrowLeft, User, Phone, Calendar, MapPin, Activity, Pill, FileText, Eye, Edit, Plus, AlertCircle, Mail, UserCheck, Trash2
} from 'lucide-react';

const TABS = ["Overview", "Follow Up", "Prescription", "History", "Medications"];

const ViewProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);



  const { 
    patientDetails,
    patientMedications: medications, 
    patientHistory: history, 
    tests,
    followUps,
    allergicRhinitis,
    atopicDermatitis,
    allergicConjunctivitis,
    allergicBronchitis,
    gpe,
    prescriptions,
    loading, error, medLoading, medError, historyLoading, historyError
  } = useSelector(state => state.centerAdmin);

  // Extract patient data from the new structure
  const patient = patientDetails?.patient || patientDetails;
  
  // Transform tests data for display
  const processedTests = React.useMemo(() => {
    if (!tests || !Array.isArray(tests)) {
      return [];
    }
    
    // Filter out tests that have actual data (not just _id and date)
    const validTests = tests.filter(test => {
      return test.CBC || test.Hb || test.TC || test.DC || test.Neutrophils || 
             test.Eosinophil || test.Lymphocytes || test.Monocytes || test.Platelets || 
             test.ESR || test.SerumCreatinine || test.SerumIgELevels || test.C3C4Levels || 
             test.ANA_IF || test.UrineRoutine || test.AllergyPanel;
    });
    
    // Sort by date (newest first) and return
    return validTests.sort((a, b) => 
      new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
  }, [tests]);
  


  // Handle patient deletion
  const handleDeletePatient = async () => {
    if (!patient?._id) return;
    
    setDeleteLoading(true);
    try {
      await dispatch(deletePatient(patient._id)).unwrap();
      toast.success('Patient deleted successfully!');
      navigate('/dashboard/CenterAdmin/patients/PatientList');
    } catch (error) {
      toast.error(error || 'Failed to delete patient');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    // Check if ID is valid (not undefined, null, or empty string)
    if (!id || id === 'undefined' || id === 'null' || id === '') {
      return;
    }
    
    if (id) {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Check for refresh parameter (from successful test submission)
      const urlParams = new URLSearchParams(location.search);
      const refreshParam = urlParams.get('refresh');
      const tabParam = urlParams.get('tab');
      
      if (refreshParam) {
        // Clear the refresh parameter from URL
        window.history.replaceState({}, '', `/dashboard/CenterAdmin/patients/profile/ViewProfile/${id}`);
      }
      
      // Handle tab parameter
      if (tabParam && TABS.includes(tabParam)) {
        setActiveTab(tabParam);
        // Clear the tab parameter from URL after setting it
        window.history.replaceState({}, '', `/dashboard/CenterAdmin/patients/profile/ViewProfile/${id}`);
      }

      dispatch(fetchPatientDetails(id));
      dispatch(fetchPatientMedications(id));
      dispatch(fetchPatientHistory(id));
      dispatch(fetchTests(id));
      dispatch(fetchFollowUps(id));
      dispatch(fetchAllergicRhinitis(id));
      dispatch(fetchAllergicConjunctivitis(id));
      dispatch(fetchAllergicBronchitis(id));
      dispatch(fetchAtopicDermatitis(id));
      dispatch(fetchGPE(id));
      dispatch(fetchPrescriptions(id));
    }
  }, [dispatch, id, navigate, location.search]);



  if (!id) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-xs">No patient ID provided in the URL.</p>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 sm:p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600 text-xs">Loading patient information...</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      </div>
    </div>
  );

  if (!patient) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-xs">
            {loading ? 'Loading patient information...' : 'Patient not found or failed to load.'}
          </p>
          {error && <p className="text-red-500 mt-2 text-xs">Error: {error}</p>}
        </div>
      </div>
    </div>
  );

  // Ensure patient is an object with expected properties
  if (typeof patient !== 'object' || patient === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-xs">Invalid patient data format.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
              <button
                              onClick={() => navigate('/dashboard/CenterAdmin/patients/PatientList')}
              className="flex items-center text-slate-600 hover:text-slate-800 mb-3 sm:mb-4 transition-colors text-xs sm:text-sm"
              >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back to Patients List
              </button>
          </div>

          {/* Patient Header */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 lg:gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 mb-2">{patient?.name || 'Patient Name'}</h1>
                                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4 text-slate-600 text-xs sm:text-sm">
                      {patient?.gender && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.gender}
                        </span>
                      )}
                      {patient?.age && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.age} years
                        </span>
                      )}
                      {patient?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.phone}
                        </span>
                      )}
                      {patient?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.email}
                        </span>
                      )}
                      {patient?.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.address}
                        </span>
                      )}
                    </div>
                </div>
            </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto mt-3 lg:mt-0">
                <button
                  onClick={() => navigate(`/dashboard/CenterAdmin/patients/EditPatient/${patient?._id}`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 justify-center text-xs sm:text-sm"
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  Edit Patient
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 justify-center text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  Delete Patient
                </button>
              </div>
            </div>
          </div>



          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-2 sm:p-3 mb-4 sm:mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex-1 text-xs sm:text-sm ${
                    activeTab === tab
                      ? "bg-blue-500 text-white"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
          </div>
        </div>

          {/* Tab Content */}
          {activeTab === "Overview" && (
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Patient Details Card */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-3 sm:p-4 lg:p-6 border-b border-blue-100">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-800 flex items-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Patient Details
            </h2>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    Complete patient information and contact details
                  </p>
                </div>
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                        <p className="text-slate-800 font-medium text-xs sm:text-sm">{patient.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Mobile</label>
                        <p className="text-slate-800 text-xs sm:text-sm">
                          {typeof patient.phone === 'string' ? patient.phone :
                           typeof patient.contact === 'string' ? patient.contact : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                        <p className="text-slate-800 text-xs sm:text-sm">{typeof patient.email === 'string' ? patient.email : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                        <p className="text-slate-800 text-xs sm:text-sm">{typeof patient.address === 'string' ? patient.address : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Assigned Doctor</label>
                        <p className="text-slate-800 text-xs sm:text-sm">
                          {patient.assignedDoctor?.name || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                        <p className="text-slate-800 capitalize text-xs sm:text-sm">{patient.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Age</label>
                        <p className="text-slate-800 text-xs sm:text-sm">{patient.age ? `${patient.age} years` : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Center</label>
                        <p className="text-slate-800 text-xs sm:text-sm">
                          {patient.centerId?.name ||
                           (typeof patient.centerCode === 'string' ? patient.centerCode : 'N/A')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Investigations */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-3 sm:p-4 lg:p-6 border-b border-blue-100">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-800 flex items-center">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Investigations
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    Laboratory test results and medical investigations
                  </p>
                </div>
                <div className="p-3 sm:p-4 lg:p-6">
                  
                  

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CBC</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hb</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">TC</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">DC</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">N</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">E</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">L</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">M</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Platelets</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ESR</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serum Creatinine</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serum IgE</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">C3, C4</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ANA</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Urine</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Allergy Panel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {processedTests && processedTests.length > 0 ? (
                          processedTests.map((test, idx) => (
                            <tr key={test._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                {test.date ? new Date(test.date).toLocaleDateString() : 
                                 test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 
                                 'N/A'}
                              </td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.CBC || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Hb || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.TC || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.DC || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Neutrophils || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Eosinophil || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Lymphocytes || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Monocytes || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Platelets || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.ESR || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.SerumCreatinine || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.SerumIgELevels || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.C3C4Levels || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.ANA_IF || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.UrineRoutine || ''}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.AllergyPanel || ''}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={17} className="px-4 py-8 text-center text-slate-500">
                              <Activity className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs sm:text-sm">No investigations found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-3 sm:p-4 lg:p-6 border-b border-blue-100">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-800 flex items-center">
                    <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Medications
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                    Current and past medications prescribed
                  </p>
                </div>
                <div className="p-3 sm:p-4 lg:p-6">
                  {medLoading ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-slate-600 text-xs sm:text-sm">Loading medications...</p>
                    </div>
                  ) : medError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                      <p className="text-red-600 text-xs sm:text-sm">{medError}</p>
                    </div>
                  ) : medications.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <Pill className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500 text-xs sm:text-sm">No medications found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Drug Name</th>
                            <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dose</th>
                            <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                            <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Frequency</th>
                            <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed By</th>
                            <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Adverse Effect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {medications.map((med, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs font-medium text-slate-800">{med.drugName}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.dose}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.duration}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.frequency || 'N/A'}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                {typeof med.prescribedBy === 'string' ? med.prescribedBy : 
                                 typeof med.prescribedBy === 'object' && med.prescribedBy?.name ? med.prescribedBy.name : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.adverseEvent || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
          {activeTab === "Follow Up" && (
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Allergic Rhinitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-3 sm:p-4 lg:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-800">Allergic Rhinitis</h2>
                  <button
                                                onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/AddAllergicRhinitis/${patient._id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm w-full sm:w-auto"
                  >
                    Add Follow Up
                  </button>
                </div>
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {allergicRhinitis && allergicRhinitis.length > 0 ? (
                          allergicRhinitis.map((rhinitis, idx) => (
                            <tr key={rhinitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {rhinitis.updatedAt ? new Date(rhinitis.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                <button
                                  onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/ViewAllergicRhinitis/${rhinitis._id}`)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 sm:py-8 text-center text-slate-500">
                              <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs sm:text-sm">No allergic rhinitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
            </div>
          </div>
              </div>

              {/* Atopic Dermatitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">Atopic Dermatitis</h2>
                                <button
                onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/AtopicDermatitis/${patient._id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
              >
                Add Follow Up
              </button>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Symptoms</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient ID</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated By</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {atopicDermatitis && atopicDermatitis.length > 0 ? (
                          atopicDermatitis.map((dermatitis, idx) => (
                            <tr key={dermatitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {dermatitis.createdAt ? new Date(dermatitis.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{dermatitis.symptoms || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerId?.name || patient.centerName || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient._id?.toString() || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {dermatitis.updatedBy?.name ? 
                                  `${dermatitis.updatedBy.name} (${dermatitis.updatedBy.role || 'User'})` : 
                                  (typeof dermatitis.updatedBy === 'string' ? dermatitis.updatedBy : 'N/A')
                                }
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                <button
                                  onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/ViewAtopicDermatitis/${dermatitis._id}`)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No atopic dermatitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Allergic Conjunctivitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">Allergic Conjunctivitis</h2>
                                <button
                onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/AddAllergicConjunctivitis/${patient._id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
              >
                Add Follow Up
              </button>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {allergicConjunctivitis && allergicConjunctivitis.length > 0 ? (
                          allergicConjunctivitis.map((conjunctivitis, idx) => (
                            <tr key={conjunctivitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {conjunctivitis.updatedAt ? new Date(conjunctivitis.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                <button
                                  onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/ViewAllergicConjunctivitis/${conjunctivitis._id}`)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No allergic conjunctivitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
              </div>
            </div>
          </div>

              {/* Allergic Bronchitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">Allergic Bronchitis</h2>
                            <button
                onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/AddAllergicBronchitis/${patient._id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
              >
                Add Follow Up
              </button>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {allergicBronchitis && allergicBronchitis.length > 0 ? (
                          allergicBronchitis.map((bronchitis, idx) => (
                            <tr key={bronchitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {bronchitis.updatedAt ? new Date(bronchitis.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                            <button
                onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/ViewAllergicBronchitis/${bronchitis._id}`)}
                className="text-blue-600 hover:text-blue-900 font-medium"
              >
                View
              </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No allergic bronchitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
            </div>
          </div>
        </div>

              {/* GPE */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">GPE</h2>
                        <button
              onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/AddGPE/${patient._id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
            >
              Add Follow Up
            </button>
          </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {gpe && gpe.length > 0 ? (
                          gpe.map((gpe, idx) => (
                            <tr key={gpe._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {gpe.updatedAt ? new Date(gpe.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                        <button
                      onClick={() => navigate(`/dashboard/CenterAdmin/patients/FollowUp/ViewGPE/${gpe._id}`)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View
                    </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                                                    <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No GPE records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
            </div>
          )}
          {activeTab === "Prescription" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                  <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                  Prescription & Medications
                </h2>
                <p className="text-slate-600 mt-1 text-xs">
                  Current and past medications prescribed to the patient
                </p>
              </div>
              <div className="p-4 sm:p-6">
                {medLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs">Loading medications...</p>
                  </div>
                ) : medError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-xs">{medError}</p>
                  </div>
                ) : medications.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-xs">No medications found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Drug Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dose</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Frequency</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed By</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Adverse Effect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {medications.map((med, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs font-medium text-slate-800">{med.drugName}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.dose}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.duration}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.frequency || 'N/A'}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                              {typeof med.prescribedBy === 'string' ? med.prescribedBy : 
                               typeof med.prescribedBy === 'object' && med.prescribedBy?.name ? med.prescribedBy.name : 'N/A'}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{med.adverseEvent || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "History" && (
            <div className="space-y-6 sm:space-y-8">
              {/* History */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                      Medical History
                    </h2>
                    <p className="text-slate-600 mt-1 text-xs">
                      Complete patient medical history and examination records
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Store patient ID in localStorage as backup
                      localStorage.setItem('currentPatientId', patient._id);
                      navigate(`/dashboard/CenterAdmin/patients/AddHistory/${patient._id}`);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                  >
                    Add History
                  </button>
                </div>
                <div className="p-4 sm:p-6">
                  {historyLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-slate-600 text-xs">Loading history...</p>
                    </div>
                  ) : historyError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-xs">{historyError}</p>
                    </div>
                  ) : !Array.isArray(history) || history.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500 text-xs mb-4">No history found</p>
                      <button
                        onClick={() => {
                          // Store patient ID in localStorage as backup
                          localStorage.setItem('currentPatientId', patient._id);
                          navigate(`/dashboard/CenterAdmin/patients/AddHistory/${patient._id}`);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-xs"
                      >
                        Add First History
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hay Fever</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Asthma</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Breathing Problems</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hives/Swelling</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sinus Trouble</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Eczema/Rashes</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Food Allergies</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Drug Allergy</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {history.map((h, idx) => (
                            <tr key={h._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.hayFever || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.asthma || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.breathingProblems || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.hivesSwelling || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.sinusTrouble || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.eczemaRashes || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.foodAllergies || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{h.drugAllergy || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => navigate(`/dashboard/CenterAdmin/patients/ViewHistory/${h._id}`)}
                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => navigate(`/dashboard/CenterAdmin/patients/AddHistory/EditHistory/${patient._id}/${h._id}`)}
                                    className="text-green-600 hover:text-green-900 font-medium"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === "Medications" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Medications
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">Current and past medications prescribed to the patient</p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/CenterAdmin/patients/profile/AddMedications/${patient._id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Create / Print Prescription
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {medLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs">Loading medications...</p>
                  </div>
                ) : medError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-xs">{medError}</p>
                  </div>
                ) : (medications || []).length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-xs mb-4">No medications found</p>
                    <button
                      onClick={() => navigate(`/dashboard/CenterAdmin/patients/profile/AddMedications/${patient._id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-xs"
                    >
                      Create / Print Prescription
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medications.map((med, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-all duration-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Pill className="h-4 w-4 text-blue-500" />
                              <h3 className="font-semibold text-slate-800 text-sm">{med.drugName}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-600">Dosage:</span>
                                <span className="ml-2 text-slate-800 font-medium">{med.dose}</span>
                              </div>
                              <div>
                                <span className="text-slate-600">Frequency:</span>
                                <span className="ml-2 text-slate-800 font-medium">{med.frequency}</span>
                              </div>
                              <div>
                                <span className="text-slate-600">Duration:</span>
                                <span className="ml-2 text-slate-800 font-medium">{med.duration}</span>
                              </div>
                              <div>
                                <span className="text-slate-600">Prescribed By:</span>
                                <span className="ml-2 text-slate-800 font-medium">{med.prescribedBy}</span>
                              </div>
                              <div>
                                <span className="text-slate-600">Prescribed Date:</span>
                                <span className="ml-2 text-slate-800 font-medium">
                                  {med.prescribedDate ? new Date(med.prescribedDate).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                            {med.instructions && (
                              <div className="mt-2">
                                <span className="text-slate-600 text-xs">Instructions:</span>
                                <p className="text-slate-800 text-xs mt-1">{med.instructions}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs">
                              {med.prescribedDate ? new Date(med.prescribedDate).toLocaleDateString() : 
                               med.createdAt ? new Date(med.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default ViewProfile; 