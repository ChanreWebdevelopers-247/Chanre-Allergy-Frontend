import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
  fetchSuperAdminDoctorPatientById,
  fetchSuperAdminDoctorPatientMedications, 
  fetchSuperAdminDoctorPatientHistory, 
  fetchSuperAdminDoctorPatientLabReports,
  fetchSuperAdminDoctorPatientFollowups
} from '../../../features/superadmin/superAdminDoctorSlice';
import { fetchPatientGeneralFollowUps } from '../../../features/superadmin/superadminThunks';
import { downloadPDFReport, viewPDFReport } from '../../../utils/pdfHandler';
import { 
  ArrowLeft, User, Phone, Calendar, MapPin, Activity, Pill, FileText, Eye, Mail, UserCheck, Building, Stethoscope,
  Download, ExternalLink, Image, Video, Music, File, AlertCircle, RefreshCw
} from 'lucide-react';

const PatientProfile = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [dataError, setDataError] = useState(null);

  const { 
    singlePatient: patient,
    patientMedications: medications, 
    patientHistory: history, 
    patientLabReports: labReports,
    dataLoading, 
    dataError: apiDataError
  } = useSelector(state => state.superAdminDoctors);
  
  // Get followups from superadmin state (same as Superadmin Followups PatientProfile)
  const superadminState = useSelector(state => state.superadmin);
  const { 
    patientFollowUps: followUps,
    loading: followUpsLoading,
    error: followUpsError
  } = superadminState;

  useEffect(() => {
    if (patientId && patientId !== 'undefined' && patientId !== 'null' && patientId !== '') {
      // Fetch all patient data
      const fetchData = async () => {
        try {
          // Fetch follow-ups using the same method as Superadmin Followups PatientProfile
          await dispatch(fetchPatientGeneralFollowUps(patientId));
          
          // Then fetch other data
          await Promise.all([
            dispatch(fetchSuperAdminDoctorPatientById(patientId)),
            dispatch(fetchSuperAdminDoctorPatientMedications(patientId)),
            dispatch(fetchSuperAdminDoctorPatientHistory(patientId)),
            dispatch(fetchSuperAdminDoctorPatientLabReports(patientId))
          ]);
        } catch (error) {
          console.error('Error fetching patient data:', error);
        }
      };

      fetchData();
    }
  }, [dispatch, patientId]);



  // Sync local error state with Redux state
  useEffect(() => {
    if (apiDataError) {
      setDataError(apiDataError);
    }
  }, [apiDataError]);

  // Helper function to safely render field values (handles both strings and objects)
  const renderFieldValue = (value) => {
    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.join(', ');
      } else {
        // Convert object to readable string
        const result = Object.entries(value)
          .filter(([key, val]) => val !== null && val !== undefined && val !== '')
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');
        return result;
      }
    }
    return 'N/A';
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <File className="h-4 w-4" />;
    if (fileType?.includes('image')) return <Image className="h-4 w-4" />;
    if (fileType?.includes('video')) return <Video className="h-4 w-4" />;
    if (fileType?.includes('audio')) return <Music className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleViewFile = (fileUrl, fileName) => {
    if (fileUrl) {
      // For PDF reports, use the download endpoint
      if (fileName && fileName.includes('_report.pdf')) {
        // Extract test request ID from the file URL or use a different approach
        // For now, we'll try to open the file URL directly
        window.open(fileUrl, '_blank');
      } else {
        window.open(`https://api.chanreallergyclinic.com/api/files/${fileUrl}`, '_blank');
      }
    }
  };

  const handleDownloadFile = (fileUrl, fileName) => {
    if (fileUrl) {
      // For PDF reports, use the download endpoint
      if (fileName && fileName.includes('_report.pdf')) {
        // For now, we'll try to download the file URL directly
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const link = document.createElement('a');
        link.href = `/api/files/${fileUrl}`;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // Helper functions for payment status checking
  const isReportAccessible = (report) => {
    const isTestCompleted = ['Testing_Completed', 'Billing_Paid', 'Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(report.status);
    const isPaymentComplete = report.billing ?
      (report.billing.amount || 0) - (report.billing.paidAmount || 0) <= 0 : true;

    // Allow access if either tests are completed OR payment is complete
    return isTestCompleted || isPaymentComplete;
  };

  const getLockReason = (report) => {
    const isTestCompleted = ['Testing_Completed', 'Billing_Paid', 'Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(report.status);
    const isPaymentComplete = report.billing ?
      (report.billing.amount || 0) - (report.billing.paidAmount || 0) <= 0 : true;

    const reasons = [];
    if (!isTestCompleted) reasons.push('Tests not fully completed');
    if (!isPaymentComplete) reasons.push('Payment not fully completed');

    return reasons.join(' and ');
  };

  // New functions for handling PDF reports using test request ID
  const handleViewPDFReport = async (testRequestId, fileName) => {
    try {
      await viewPDFReport(testRequestId);
    } catch (error) {
      console.error('Error viewing PDF report:', error);
      alert('Failed to view PDF report: ' + error.message);
    }
  };

  const handleDownloadPDFReport = async (testRequestId, fileName) => {
    try {
      await downloadPDFReport(testRequestId, fileName);
    } catch (error) {
      console.error('Error downloading PDF report:', error);
      alert('Failed to download PDF report: ' + error.message);
    }
  };

  if (!patientId) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-xs">No patient ID provided in the URL.</p>
        </div>
      </div>
    </div>
  );

  if (dataLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600 text-xs">Loading patient information...</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (apiDataError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-sm font-semibold text-red-800">Error Loading Patient Data</h3>
            </div>
            <p className="text-red-700 mb-4 text-xs">{apiDataError}</p>
            <button
              onClick={() => navigate('/dashboard/superadmin/doctor/patients')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
              <h3 className="text-sm font-semibold text-yellow-800">Patient Not Found</h3>
            </div>
            <p className="text-yellow-700 mb-4 text-xs">
              The patient with ID "{patientId}" was not found. Please check the URL and try again.
            </p>
            <button
              onClick={() => navigate('/dashboard/superadmin/doctor/patients')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-xs"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/superadmin/doctor/patients')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients List
          </button>
        </div>

        {/* Patient Header */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h1 className="text-md font-bold text-slate-800 mb-2">{patient?.name || 'Patient Name'}</h1>
                <div className="flex flex-wrap gap-4 text-slate-600">
                  {patient?.gender && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4" />
                      {patient.gender}
                    </span>
                  )}
                  {patient?.age && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {patient.age} years
                    </span>
                  )}
                  {patient?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {patient.phone}
                    </span>
                  )}
                  {patient?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {patient.email}
                    </span>
                  )}
                  {patient?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {patient.address}
                    </span>
                  )}
                  {patient?.appointmentTime && (
                    <span className="flex items-center gap-1 text-blue-600 font-semibold">
                      <Calendar className="h-4 w-4" />
                      Appointment: {new Date(patient.appointmentTime).toLocaleDateString('en-GB')} at {new Date(patient.appointmentTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {patient?.appointmentTime && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const appointmentDate = new Date(patient.appointmentTime);
                appointmentDate.setHours(0, 0, 0, 0);
                const isToday = appointmentDate.getTime() === today.getTime();
                
                return (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isToday 
                      ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isToday ? '📅 Scheduled for Today' : `📅 ${new Date(patient.appointmentTime).toLocaleDateString('en-GB')}`}
                  </span>
                );
              })()}
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                Read Only
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-2 mb-8">
          <div className="flex gap-2">
            {["Overview", "Follow-ups", "Medical History", "Medications", ].map((tab) => (
              <button
                key={tab}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex-1 text-xs ${
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
          <div className="space-y-8">
            {/* Patient Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-500" />
                  Patient Details
                </h2>
                <p className="text-slate-600 mt-1 text-xs">
                  Complete patient information and contact details
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                      <p className="text-slate-800 font-medium break-words text-xs">{patient.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Mobile</label>
                      <p className="text-slate-800 break-words text-xs">
                        {typeof patient.phone === 'string' ? patient.phone :
                         typeof patient.contact === 'string' ? patient.contact : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                      <p className="text-slate-800 break-words text-xs">{typeof patient.email === 'string' ? patient.email : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                      <p className="text-slate-800 break-words text-xs">{typeof patient.address === 'string' ? patient.address : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Assigned Doctor</label>
                      <p className="text-slate-800 break-words flex items-center text-xs">
                        <Stethoscope className="h-4 w-4 mr-2 text-blue-500" />
                        {patient.assignedDoctor?.name || 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                      <p className="text-slate-800 capitalize break-words text-xs">{patient.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Age</label>
                      <p className="text-slate-800 break-words text-xs">{patient.age ? `${patient.age} years` : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Center</label>
                      <p className="text-slate-800 break-words flex items-center text-xs">
                        <Building className="h-4 w-4 mr-2 text-blue-500" />
                        {patient.centerId?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment & Billing Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Appointment Card */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-6 border-b border-blue-100">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    Appointment Information
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Consultation schedule and appointment details
                  </p>
                </div>
                <div className="p-6">
                  {patient?.appointmentTime ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Appointment Date</label>
                        <p className="text-slate-800 font-medium text-xs">
                          {new Date(patient.appointmentTime).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Appointment Time</label>
                        <p className="text-slate-800 font-medium text-xs">
                          {new Date(patient.appointmentTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const appointmentDate = new Date(patient.appointmentTime);
                        appointmentDate.setHours(0, 0, 0, 0);
                        const isToday = appointmentDate.getTime() === today.getTime();
                        const isPast = appointmentDate.getTime() < today.getTime();
                        
                        return (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              isToday 
                                ? 'bg-blue-100 text-blue-800' 
                                : isPast
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {isToday ? 'Scheduled for Today' : isPast ? 'Past Appointment' : 'Upcoming'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs">No appointment scheduled</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-green-100">
                <div className="p-6 border-b border-green-100">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-green-500" />
                    Billing Information
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Superconsultant consultation billing status
                  </p>
                </div>
                <div className="p-6">
                  {patient?.billing && patient.billing.length > 0 ? (() => {
                    const superconsultantBill = patient.billing.find(bill => 
                      bill.type === 'consultation' && 
                      bill.consultationType?.startsWith('superconsultant_')
                    );
                    
                    if (!superconsultantBill) {
                      return (
                        <div className="text-center py-8">
                          <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-xs">No superconsultant billing found</p>
                        </div>
                      );
                    }
                    
                    const totalAmount = superconsultantBill.amount || 0;
                    const paidAmount = superconsultantBill.paidAmount || 0;
                    const outstanding = totalAmount - paidAmount;
                    const isPaid = paidAmount >= totalAmount && totalAmount > 0;
                    
                    // Format consultation type
                    const consultationType = superconsultantBill.consultationType
                      ?.replace('superconsultant_', '')
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase()) || 'Superconsultant Consultation';
                    
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Consultation Type</label>
                          <p className="text-slate-800 font-medium text-xs">{consultationType}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Total Amount</label>
                          <p className="text-slate-800 font-medium text-xs">₹{totalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Amount Paid</label>
                          <p className="text-green-600 font-medium text-xs">₹{paidAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Outstanding</label>
                          <p className={`font-medium text-xs ${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            ₹{outstanding.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Payment Status</label>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            isPaid 
                              ? 'bg-green-100 text-green-800' 
                              : paidAmount > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isPaid ? 'Fully Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending Payment'}
                          </span>
                        </div>
                        {superconsultantBill.invoiceNumber && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Invoice Number</label>
                            <p className="text-slate-800 font-mono text-xs">{superconsultantBill.invoiceNumber}</p>
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs">No billing information available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <div className="flex items-center justify-between">
                  
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Medications</p>
                    <p className="text-xl font-bold text-green-600">{medications?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Pill className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">History Records</p>
                    <p className="text-xl font-bold text-purple-600">{history?.historyData?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Follow-ups</p>
                    <p className="text-xl font-bold text-indigo-600">{followUps?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Registration Date</p>
                    <p className="text-xs font-bold text-orange-600">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Medical History" && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Medical History
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Complete patient medical history and examination records
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patientId}/history`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Full History
                </button>
              </div>
            </div>
            <div className="p-6">
              {!history || !history.historyData || history.historyData.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 text-xs">No medical history found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {history.historyData.map((record, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-3">
                        <h6 className="font-semibold text-gray-800 text-xs">{record.type}</h6>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mb-3">{renderFieldValue(record.description)}</p>
                      
                      {/* File attachments if any */}
                      {record.attachments && record.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {record.attachments.map((file, fileIndex) => (
                              <div key={fileIndex} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                                {getFileIcon(file.type)}
                                <span className="text-xs text-gray-700 truncate max-w-24">{file.name}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleViewFile(file.url, file.name)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="View file"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadFile(file.url, file.name)}
                                    className="text-green-600 hover:text-green-800 p-1"
                                    title="Download file"
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "Medications" && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                <Pill className="h-5 w-5 mr-2 text-blue-500" />
                Medications
              </h2>
              <p className="text-slate-600 mt-1 text-xs">
                Current and past medications prescribed
              </p>
            </div>
            <div className="p-6">
              {!medications || medications.length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 text-xs">No medications found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Drug Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dose</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Frequency</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {medications.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-slate-800">{med.drugName}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{med.dose}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{med.duration}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{med.frequency || 'N/A'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{med.prescribedBy || 'N/A'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {med.prescriptionFile && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleViewFile(med.prescriptionFile, `${med.drugName}_prescription`)}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownloadFile(med.prescriptionFile, `${med.drugName}_prescription`)}
                                  className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

       

                      

        {activeTab === "Follow-ups" && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Patient Follow-ups
                  </h2>
                  <p className="text-slate-600 mt-1">
                    All follow-up records and treatment plans for this patient
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {followUpsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading follow-ups...</p>
                </div>
              ) : followUpsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-500">Error loading follow-ups</p>
                  <p className="text-red-400 text-sm mt-2">{followUpsError}</p>
                </div>
              ) : !followUps || followUps.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No follow-ups found</p>
                  <p className="text-slate-400 text-sm mt-2">This patient has no follow-up records yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followUps.map((followUp, index) => {
                    return (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                        <div className="flex items-center justify-between mb-3">
                          <h6 className="font-semibold text-gray-800 text-sm">
                            {followUp.type || 'Follow-up'}
                          </h6>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                              {followUp.date ? new Date(followUp.date).toLocaleDateString() : 
                               followUp.createdAt ? new Date(followUp.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                            <div className="flex gap-2">
                              {/* View Details Button based on follow-up type */}
                              {followUp.type && (
                                <button
                                  onClick={() => {
                                    // Map follow-up types to their view routes
                                    const viewRoutes = {
                                      "Allergic Rhinitis": (patientId) => `/dashboard/superadmin/doctor/followups/ViewAllergicRhinitis/${patientId}`,
                                      "Atopic Dermatitis": (patientId) => `/dashboard/superadmin/doctor/followups/ViewAtopicDermatitis/${patientId}`,
                                      "Allergic Conjunctivitis": (patientId) => `/dashboard/superadmin/doctor/followups/ViewAllergicConjunctivitis/${patientId}`,
                                      "Allergic Bronchitis": (patientId) => `/dashboard/superadmin/doctor/followups/ViewAllergicBronchitis/${patientId}`,
                                      "GPE": (patientId) => `/dashboard/superadmin/doctor/followups/ViewGPE/${patientId}`,
                                    };
                                    
                                    const route = viewRoutes[followUp.type];
                                    if (route) {
                                      const fullRoute = route(patientId);
                                      navigate(fullRoute);
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                                  title={`View ${followUp.type} Details`}
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>View Details</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Basic Info (Always Visible) */}
                        <div className="space-y-2 mb-3">
                          {/* Patient Info */}
                          {followUp.patientId && (
                            <div className="bg-white p-2 rounded text-xs">
                              <span className="text-gray-600">Patient: </span>
                              <span className="text-gray-800 font-medium">{followUp.patientId.name}</span>
                              {followUp.patientId.centerId && (
                                <span className="text-gray-500 ml-2">({followUp.patientId.centerId.name})</span>
                              )}
                            </div>
                          )}
                          
                          {/* Quality of Life */}
                          {followUp.qualityOfLife && (
                            <div className="bg-white p-2 rounded text-xs">
                              <span className="text-gray-600">Quality of Life Impact: </span>
                              <span className="text-gray-800 font-medium">{followUp.qualityOfLife}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientProfile;
