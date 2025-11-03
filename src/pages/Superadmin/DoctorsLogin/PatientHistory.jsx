import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar, 
  Activity,
  AlertCircle,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';
import { fetchSuperAdminDoctorPatientHistory, fetchSuperAdminDoctorPatientLabReports } from '../../../features/superadmin/superAdminDoctorSlice';
import { downloadPDFReport, viewPDFReport } from '../../../utils/pdfHandler';
import { toast } from 'react-toastify';

const PatientHistory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { patientId } = useParams();
  
  const { 
    patientHistory,
    dataLoading,
    dataError
  } = useSelector((state) => state.superAdminDoctors);

  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      dispatch(fetchSuperAdminDoctorPatientHistory(patientId));
      fetchLabReports();
    }
  }, [dispatch, patientId]);

  const fetchLabReports = async () => {
    if (!patientId) return;
    
    setLabReportsLoading(true);
    try {
      const response = await fetch(`/api/superadmin/doctors/working/patient/${patientId}/lab-reports`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLabReports(data);
      }
    } catch (error) {
      console.error('Error fetching lab reports:', error);
    } finally {
      setLabReportsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard/superadmin/doctor/patients');
  };

  const handleViewReport = async (report) => {
    if (!report._id) {
      toast.error('Report ID not found. Cannot view PDF.');
      return;
    }

    try {
      await viewPDFReport(report._id);
    } catch (error) {
      console.error('Error viewing PDF report:', error);
      toast.error(error.message || 'Failed to view PDF report. Please try again.');
    }
  };

  const handleDownloadReport = async (report) => {
    if (!report._id) {
      toast.error('Report ID not found. Cannot download PDF.');
      return;
    }

    const fileName = `Lab_Report_${report.testType || 'Test'}_${new Date(report.createdAt).toLocaleDateString()}.pdf`;
    
    try {
      await downloadPDFReport(report._id, fileName);
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF report:', error);
      toast.error(error.message || 'Failed to download PDF report. Please try again.');
    }
  };

  if (dataLoading || labReportsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-md font-bold text-gray-900">Patient History</h1>
                <p className="text-gray-600 mt-1 text-xs">Comprehensive medical history and records</p>
              </div>
            </div>
            <button
              onClick={() => {
                dispatch(fetchSuperAdminDoctorPatientHistory(patientId));
                fetchLabReports();
              }}
              disabled={dataLoading || labReportsLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${dataLoading || labReportsLoading ? 'animate-spin' : ''}`} />
              <span className="text-xs">Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {dataError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 rounded-lg p-4 flex items-center shadow-sm">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
            <span className="text-red-700 font-medium text-xs">{dataError}</span>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Comprehensive Patient History</h2>
                <p className="text-gray-600 mt-1 text-xs">All medical records, conditions, and examination findings</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  {patientHistory?.historyData?.length || 0} Records
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {!patientHistory ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">No History Available</h3>
                <p className="text-gray-500 max-w-md mx-auto text-xs">
                  No patient history records found. History will appear here once records are added.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Patient History Section */}
                {patientHistory.historyData && patientHistory.historyData.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      Medical History Records
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {patientHistory.historyData.map((history, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-semibold text-gray-800 text-xs">{history.type}</h6>
                            <span className="text-xs text-gray-500">{new Date(history.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-700">{history.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medications Section */}
                {patientHistory.medications && patientHistory.medications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-green-600" />
                      Medications
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {patientHistory.medications.map((medication, index) => (
                        <div key={index} className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="font-semibold text-gray-800 text-xs">{medication.drugName}</h6>
                            <span className="text-xs text-gray-500">{new Date(medication.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div><span className="font-medium">Dose:</span> {medication.dose}</div>
                            <div><span className="font-medium">Duration:</span> {medication.duration}</div>
                            {medication.frequency && <div><span className="font-medium">Frequency:</span> {medication.frequency}</div>}
                            {medication.prescribedBy && <div><span className="font-medium">Prescribed By:</span> {medication.prescribedBy}</div>}
                            {medication.prescribedDate && <div><span className="font-medium">Prescribed Date:</span> {new Date(medication.prescribedDate).toLocaleDateString()}</div>}
                            {medication.adverseEvent && <div className="md:col-span-2"><span className="font-medium">Adverse Event:</span> {medication.adverseEvent}</div>}
                            {medication.instructions && <div className="md:col-span-2"><span className="font-medium">Instructions:</span> {medication.instructions}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Followups Section */}
                {patientHistory.followups && patientHistory.followups.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                      Followups
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {patientHistory.followups.map((followup, index) => (
                        <div key={index} className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="font-semibold text-gray-800 text-xs">{followup.type}</h6>
                            <span className="text-xs text-gray-500">{new Date(followup.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {followup.notes && <div><span className="font-medium">Notes:</span> {followup.notes}</div>}
                            {followup.updatedBy && <div><span className="font-medium">Updated By:</span> {followup.updatedBy.name}</div>}
                            {followup.allergicRhinitisId && <div><span className="font-medium">Related Condition:</span> Allergic Rhinitis</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergic Conditions Section */}
                {(patientHistory.allergicRhinitis?.length > 0 || 
                  patientHistory.allergicConjunctivitis?.length > 0 || 
                  patientHistory.allergicBronchitis?.length > 0 || 
                  patientHistory.atopicDermatitis?.length > 0 || 
                  patientHistory.gpe?.length > 0) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-orange-600" />
                      Allergic Conditions
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {patientHistory.allergicRhinitis?.map((condition, index) => (
                        <div key={index} className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                          <h6 className="font-semibold text-gray-800 mb-2 text-xs">Allergic Rhinitis</h6>
                          <p className="text-xs text-gray-700">{new Date(condition.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                      {patientHistory.allergicConjunctivitis?.map((condition, index) => (
                        <div key={index} className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                          <h6 className="font-semibold text-gray-800 mb-2 text-xs">Allergic Conjunctivitis</h6>
                          <p className="text-xs text-gray-700">{new Date(condition.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                      {patientHistory.allergicBronchitis?.map((condition, index) => (
                        <div key={index} className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                          <h6 className="font-semibold text-gray-800 mb-2 text-xs">Allergic Bronchitis</h6>
                          <p className="text-xs text-gray-700">{new Date(condition.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                      {patientHistory.atopicDermatitis?.map((condition, index) => (
                        <div key={index} className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                          <h6 className="font-semibold text-gray-800 mb-2 text-xs">Atopic Dermatitis</h6>
                          <p className="text-xs text-gray-700">{new Date(condition.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                      {patientHistory.gpe?.map((condition, index) => (
                        <div key={index} className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                          <h6 className="font-semibold text-gray-800 mb-2 text-xs">GPE</h6>
                          <p className="text-xs text-gray-700">{new Date(condition.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prescriptions Section */}
                {patientHistory.prescriptions && patientHistory.prescriptions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                      Prescriptions
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {patientHistory.prescriptions.map((prescription, index) => (
                        <div key={index} className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-semibold text-gray-800 text-xs">Prescription {index + 1}</h6>
                            <span className="text-xs text-gray-500">{new Date(prescription.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-700">{prescription.notes || 'No details available'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lab Reports Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-red-600" />
                    Lab Reports
                  </h3>
                  {labReports && labReports.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {labReports.map((report, index) => (
                        <div key={index} className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h6 className="font-semibold text-gray-800 text-xs">{report.testType || 'Lab Test'}</h6>
                              <p className="text-xs text-gray-600 mt-1">{report.testDescription || 'No description available'}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                              {(() => {
                                // Check if report is available (has valid status and _id)
                                const isAvailable = report._id && (
                                  report.status === 'Report_Generated' || 
                                  report.status === 'Report_Sent' || 
                                  report.status === 'Completed' ||
                                  report.status === 'feedback_sent'
                                );

                                if (isAvailable) {
                                  return (
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleViewReport(report)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                        title="View PDF Report"
                                      >
                                        <Eye className="w-3 h-3" />
                                        View PDF
                                      </button>
                                      <button
                                        onClick={() => handleDownloadReport(report)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                        title="Download PDF Report"
                                      >
                                        <Download className="w-3 h-3" />
                                        Download
                                      </button>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                      {report.status === 'Cancelled' ? 'Cancelled' : 'Report Not Ready'}
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div><span className="font-medium">Status:</span> 
                              <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                report.status === 'Completed' || report.status === 'Report_Generated' || report.status === 'Report_Sent' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {report.status}
                              </span>
                            </div>
                            <div><span className="font-medium">Urgency:</span> {report.urgency || 'Normal'}</div>
                            {report.doctorId?.name && <div><span className="font-medium">Requested By:</span> Dr. {report.doctorId.name}</div>}
                            {report.assignedLabStaffId?.name && <div><span className="font-medium">Lab Staff:</span> {report.assignedLabStaffId.name}</div>}
                            {report.reportGeneratedDate && <div className="md:col-span-2"><span className="font-medium">Report Generated:</span> {new Date(report.reportGeneratedDate).toLocaleDateString()}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">No Lab Reports Available</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        No lab test reports have been generated for this patient yet. Reports will appear here once they are completed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHistory;


