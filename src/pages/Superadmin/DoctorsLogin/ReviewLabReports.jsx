import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Eye, 
  MessageSquare, 
  FileText, 
  User, 
  Calendar,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  ExternalLink
} from 'lucide-react';
import { 
  fetchSuperAdminDoctorLabReports,
  sendFeedbackToCenterDoctor,
  clearError,
  clearSuccess 
} from '../../../features/superadmin/superAdminDoctorSlice';
import API from '../../../services/api';

const ReviewLabReports = () => {
  const dispatch = useDispatch();
  const { labReports, workingLoading, workingError, success, message } = useSelector(
    (state) => state.superAdminDoctors
  );
  const { user } = useSelector((state) => state.auth);

  const [selectedReport, setSelectedReport] = useState(null);
  const [feedback, setFeedback] = useState({
    additionalTests: '',
    patientInstructions: '',
    notes: ''
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(4);

  useEffect(() => {
    dispatch(fetchSuperAdminDoctorLabReports());
  }, [dispatch]);



  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSuccess());
    };
  }, [dispatch]);

  const handleReviewReport = (report) => {
    setSelectedReport(report);
    setShowFeedbackModal(true);
  };

  const handleSendFeedback = async () => {
    if (!selectedReport || !selectedReport._id) {
      console.error('No selected report or missing report ID');
      return;
    }

    try {
      const feedbackData = {
        reportId: selectedReport._id,
        patientId: selectedReport.patientId?._id || selectedReport.patientId,
        centerDoctorId: selectedReport.doctorId?._id || selectedReport.doctorId,
        additionalTests: feedback.additionalTests,
        patientInstructions: feedback.patientInstructions,
        notes: feedback.notes
      };

      const result = await dispatch(sendFeedbackToCenterDoctor(feedbackData));
      
      if (sendFeedbackToCenterDoctor.fulfilled.match(result)) {
        setShowFeedbackModal(false);
        setSelectedReport(null);
        setFeedback({
          additionalTests: '',
          patientInstructions: '',
          notes: ''
        });
        // Refresh the lab reports to show updated status
        dispatch(fetchSuperAdminDoctorLabReports());
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  // ✅ NEW: Check if report is accessible based on payment status
  const isReportAccessible = (report) => {
    // Check if tests are completed
    const isTestCompleted = ['Testing_Completed', 'Billing_Paid', 'Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(report.status);
    
    // Check if payment is complete
    const isPaymentComplete = report.billing ? 
      (report.billing.amount || 0) - (report.billing.paidAmount || 0) <= 0 : true;
    
    // Allow access if either tests are completed OR payment is complete
    return isTestCompleted || isPaymentComplete;
  };

  // ✅ NEW: Get lock reason for inaccessible reports
  const getLockReason = (report) => {
    const isTestCompleted = ['Testing_Completed', 'Billing_Paid', 'Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(report.status);
    const isPaymentComplete = report.billing ? 
      (report.billing.amount || 0) - (report.billing.paidAmount || 0) <= 0 : true;
    
    const reasons = [];
    if (!isTestCompleted) reasons.push('Tests not fully completed');
    if (!isPaymentComplete) reasons.push('Payment not fully completed');
    
    return reasons.join(' and ');
  };

  // PDF handling functions
  const handleViewPDF = async (report) => {
    // ✅ NEW: Check if report is accessible before attempting to view
    if (!isReportAccessible(report)) {
      alert(`Report is locked: ${getLockReason(report)}`);
      return;
    }

    try {
      let pdfUrl;
      
      // Use the API service for consistent configuration
      
      // Use the API service instead of hardcoded fetch
      const response = await API.get(`/test-requests/download-report/${report._id}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let pdfBlob;
      
      // Check if response is already a PDF blob
      const contentType = response.headers['content-type'] || response.headers['Content-Type'];
      
      if (contentType && contentType.includes('application/pdf')) {
        // Response is already a PDF blob
        pdfBlob = response.data;
      } else {
        // Handle text/JSON response that needs conversion
        const responseData = response.data;
        
        let pdfContent = responseData;
        
        // If it's a JSON response with PDF content
        if (typeof pdfContent === 'string' && pdfContent.startsWith('{')) {
          try {
            const jsonData = JSON.parse(pdfContent);
            if (jsonData.pdfContent) {
              pdfContent = jsonData.pdfContent;
            }
          } catch (e) {
            // Not JSON, use as-is
          }
        }
        
        // Clean up the PDF string (remove escape characters)
        const cleanedPdfContent = pdfContent
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"');
        
        // Convert string to binary
        const byteCharacters = cleanedPdfContent;
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Create PDF blob
        pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
      }
      
      // Create a blob URL for the PDF
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      
      // Open PDF in new tab
      const newWindow = window.open(blobUrl, '_blank');
      
      if (newWindow) {
        // PDF opened successfully
      } else {
        // Fallback: try to open in same window
        window.open(blobUrl, '_self');
      }
      
      // Clean up the blob URL after a delay to ensure the PDF loads
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error viewing PDF:', error);
      alert('Failed to load PDF report. Please try again or contact support.');
    }
      };

  const handleDownloadPDF = async (report) => {
    // ✅ NEW: Check if report is accessible before attempting to download
    if (!isReportAccessible(report)) {
      alert(`Report is locked: ${getLockReason(report)}`);
      return;
    }

    try {
      // Use the API service for consistent configuration
      const response = await API.get(`/test-requests/download-report/${report._id}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lab-report-${report.patientId?.name || 'patient'}-${report.testType || 'test'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending_review':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const matchesDoctorReference = (candidate, docId, docName) => {
    if (!candidate) return false;

    if (typeof candidate === 'string') {
      if (docId && candidate === docId) return true;
      if (docName && candidate.toLowerCase() === docName) return true;
      return false;
    }

    if (candidate?._id) {
      if (docId && candidate._id.toString() === docId) return true;
    }

    if (candidate?.id) {
      if (docId && candidate.id.toString() === docId) return true;
    }

    if (candidate?.name && docName) {
      return candidate.name.toLowerCase() === docName;
    }

    return false;
  };

  const reportBelongsToDoctor = (report, currentUser) => {
    if (!currentUser) return false;
    const docId = currentUser._id || currentUser.id || null;
    const docName = currentUser.name ? currentUser.name.toLowerCase() : null;

    const patient = report.patientId || {};

    if (matchesDoctorReference(patient.superConsultantDoctor, docId, docName)) return true;
    if (matchesDoctorReference(patient.superConsultantDoctorName, docId, docName)) return true;
    if (matchesDoctorReference(patient.superconsultantDoctor, docId, docName)) return true;
    if (matchesDoctorReference(patient.superconsultantDoctorName, docId, docName)) return true;

    if (Array.isArray(patient.appointments)) {
      for (const appointment of patient.appointments) {
        if (
          matchesDoctorReference(appointment?.doctorId, docId, docName) ||
          matchesDoctorReference(appointment?.doctorName, docId, docName)
        ) {
          return true;
        }
      }
    }

    if (matchesDoctorReference(report.doctorId, docId, docName)) return true;

    if (report.billing) {
      if (matchesDoctorReference(report.billing.superConsultantDoctor, docId, docName)) return true;
      if (matchesDoctorReference(report.billing.superConsultantDoctorName, docId, docName)) return true;
      if (matchesDoctorReference(report.billing.superconsultantDoctor, docId, docName)) return true;
      if (matchesDoctorReference(report.billing.superconsultantDoctorName, docId, docName)) return true;
      if (matchesDoctorReference(report.billing.doctorId, docId, docName)) return true;
      if (matchesDoctorReference(report.billing.assignedDoctor, docId, docName)) return true;
    }

    return false;
  };

  const filteredLabReports = useMemo(() => {
    if (!Array.isArray(labReports) || labReports.length === 0) return [];
    if (!user) return labReports;
    return labReports.filter((report) => reportBelongsToDoctor(report, user));
  }, [labReports, user]);

  // Pagination functions
  const getTotalPages = () => {
    return Math.ceil(filteredLabReports.length / recordsPerPage) || 1;
  };

  const getCurrentData = () => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredLabReports.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
  };

  if (workingLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (workingError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="text-xs">{workingError}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-md font-bold text-gray-800 mb-2">Review Lab Reports</h1>
        <p className="text-gray-600 text-xs">
          Review completed lab reports and provide feedback to center admin doctors
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
          <span className="text-green-700 text-xs">{message}</span>
        </div>
      )}

      {workingError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <span className="text-red-700 text-xs">{workingError}</span>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Lab Reports</h2>
        </div>
        <div className="p-4 sm:p-6">
          {filteredLabReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-xs">No lab reports available for review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile/Tablet View - Card Layout */}
              <div className="block lg:hidden">
                {getCurrentData().map((report, index) => {
                  const globalIndex = (currentPage - 1) * recordsPerPage + index;
                  return (
                  <div key={report._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Patient Info */}
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          #{globalIndex + 1} {report.patientId?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.patientId?.age || 'N/A'} years
                        </div>
                      </div>
                    </div>

                    {/* Test Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Test Type</p>
                        <p className="text-xs font-medium text-gray-900">{report.testType || 'N/A'}</p>
                        {report.testDescription && (
                          <p className="text-xs text-gray-600">{report.testDescription}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Requested By</p>
                        <p className="text-xs font-medium text-gray-900">Dr. {report.doctorId?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-600">{report.centerId?.name || report.centerName || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Date and Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Completed Date</p>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-xs text-gray-900">
                            {report.completedDate || report.reportGeneratedDate || report.updatedAt ? 
                              new Date(report.completedDate || report.reportGeneratedDate || report.updatedAt).toLocaleDateString() 
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {getStatusIcon(report.status)}
                          <span className="ml-1">
                            {report.status === 'completed' && 'Completed'}
                            {report.status === 'pending_review' && 'Pending Review'}
                            {report.status === 'in_progress' && 'In Progress'}
                            {report.status === 'approved' && 'Approved'}
                            {report.status === 'feedback_sent' && 'Feedback Sent'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        {isReportAccessible(report) ? (
                          <>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FileText className="w-3 h-3 mr-1" />
                              Viewable
                            </span>
                            <button
                              onClick={() => handleViewPDF(report)}
                              className="text-green-600 hover:text-green-900 flex items-center text-xs"
                              title="View PDF Report"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Locked
                            </span>
                            <span className="text-red-600 text-xs" title={getLockReason(report)}>
                              {getLockReason(report)}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReviewReport(report)}
                          className="text-blue-600 hover:text-blue-900 flex items-center text-xs"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </button>
                        
                        {report.reportFile && isReportAccessible(report) && (
                          <button
                            onClick={() => handleDownloadPDF(report)}
                            className="text-purple-600 hover:text-purple-900 flex items-center text-xs"
                            title="Download PDF Report"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Desktop View - Table Layout */}
              <div className="hidden lg:block">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PDF
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentData().map((report, index) => {
                      const globalIndex = (currentPage - 1) * recordsPerPage + index;
                      return (
                      <tr key={report._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-3 min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">
                                #{globalIndex + 1} {report.patientId?.name || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {report.patientId?.age || 'N/A'} years
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs text-gray-900">{report.testType || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{report.testDescription || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs text-gray-900">
                            Dr. {report.doctorId?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {report.centerId?.name || report.centerName || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-xs text-gray-900">
                              {report.completedDate || report.reportGeneratedDate || report.updatedAt ? 
                                new Date(report.completedDate || report.reportGeneratedDate || report.updatedAt).toLocaleDateString() 
                                : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                            {getStatusIcon(report.status)}
                            <span className="ml-1">
                              {report.status === 'completed' && 'Completed'}
                              {report.status === 'pending_review' && 'Pending Review'}
                              {report.status === 'in_progress' && 'In Progress'}
                              {report.status === 'approved' && 'Approved'}
                              {report.status === 'feedback_sent' && 'Feedback Sent'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            {isReportAccessible(report) ? (
                              <>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <FileText className="w-3 h-3 mr-1" />
                                  Viewable
                                </span>
                                <button
                                  onClick={() => handleViewPDF(report)}
                                  className="text-green-600 hover:text-green-900 flex items-center text-xs"
                                  title="View PDF Report"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Locked
                                </span>
                                <span className="text-red-600 text-xs" title={getLockReason(report)}>
                                  {getLockReason(report)}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleReviewReport(report)}
                              className="text-blue-600 hover:text-blue-900 flex items-center text-xs"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </button>
                            
                            {report.reportFile && isReportAccessible(report) && (
                              <button
                                onClick={() => handleDownloadPDF(report)}
                                className="text-purple-600 hover:text-purple-900 flex items-center text-xs"
                                title="Download PDF Report"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {filteredLabReports.length > 0 && (
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredLabReports.length)} of {filteredLabReports.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={recordsPerPage}
                    onChange={(e) => handleRecordsPerPageChange(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {getTotalPages()}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(currentPage)}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white border border-blue-600"
                  >
                    {currentPage}
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === getTotalPages()}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">
                Review Lab Report - {selectedReport.patientId?.name || 'N/A'}
              </h3>
            </div>
            
            <div className="p-4 sm:p-6">
              {/* Report Details */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Report Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Patient</p>
                    <p className="font-medium text-xs">{selectedReport.patientId?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Test Type</p>
                    <p className="font-medium text-xs">{selectedReport.testType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Requested By</p>
                    <p className="font-medium text-xs">Dr. {selectedReport.doctorId?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Center</p>
                    <p className="font-medium text-xs">{selectedReport.centerId?.name || selectedReport.centerName || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Report Results */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Test Results</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Results Summary:</p>
                      <p className="text-xs text-gray-800">{selectedReport.results || 'No results available'}</p>
                    </div>
                    {selectedReport.reportSummary && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Report Summary:</p>
                        <p className="text-xs text-gray-800">{selectedReport.reportSummary}</p>
                      </div>
                    )}
                    {selectedReport.clinicalInterpretation && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Clinical Interpretation:</p>
                        <p className="text-xs text-gray-800">{selectedReport.clinicalInterpretation}</p>
                      </div>
                    )}
                    {selectedReport.conclusion && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Conclusion:</p>
                        <p className="text-xs text-gray-800">{selectedReport.conclusion}</p>
                      </div>
                    )}
                    {selectedReport.recommendations && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Recommendations:</p>
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap">{selectedReport.recommendations}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback Form */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Provide Feedback</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Additional Tests Recommended
                    </label>
                    <textarea
                      value={feedback.additionalTests}
                      onChange={(e) => setFeedback(prev => ({ ...prev, additionalTests: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Recommend any additional tests that should be performed..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Patient Instructions
                    </label>
                    <textarea
                      value={feedback.patientInstructions}
                      onChange={(e) => setFeedback(prev => ({ ...prev, patientInstructions: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Provide specific instructions for the patient..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={feedback.notes}
                      onChange={(e) => setFeedback(prev => ({ ...prev, notes: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Any additional notes or observations..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSendFeedback}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-xs"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewLabReports;


