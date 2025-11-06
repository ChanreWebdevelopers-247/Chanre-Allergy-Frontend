import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import API from '../../services/api';
import { 
  ArrowLeft, 
  Activity,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  MapPin,
  Phone,
  Stethoscope,
  TestTube,
  Save,
  Play
} from 'lucide-react';

const toLocalISODate = (date) => {
  const offsetMillis = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMillis).toISOString().split('T')[0];
};

const UpdateStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [testRequest, setTestRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    sampleCollectionStatus: 'In_Progress',
    sampleCollectionActualDate: '',
    sampleCollectionNotes: ''
  });

  const minActualDate = toLocalISODate(new Date());

  useEffect(() => {
    if (id) {
      fetchTestRequestDetails();
    }
  }, [id]);

  const fetchTestRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/test-requests/${id}`);
      setTestRequest(response.data);
      
      // Pre-fill form with existing data if available
      if (response.data.sampleCollectionActualDate) {
        setFormData(prev => ({
          ...prev,
          sampleCollectionStatus: response.data.sampleCollectionStatus || 'In_Progress',
          sampleCollectionActualDate: toLocalISODate(new Date(response.data.sampleCollectionActualDate)),
          sampleCollectionNotes: response.data.sampleCollectionNotes || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching test request details:', error);
      setError('Failed to load test request details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.sampleCollectionStatus) {
      setError('Please select a collection status');
      return;
    }

    // Validate date if provided
    if (formData.sampleCollectionActualDate) {
      const selectedDate = new Date(formData.sampleCollectionActualDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(selectedDate.getTime())) {
        setError('Invalid collection date. Please select a valid future date.');
        return;
      }

      if (selectedDate < today) {
        setError('Actual collection date cannot be in the past. Please choose today or a future date.');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      
      const requestData = {
        sampleCollectionStatus: formData.sampleCollectionStatus,
        sampleCollectionActualDate: formData.sampleCollectionActualDate ? 
          new Date(formData.sampleCollectionActualDate).toISOString() : new Date().toISOString(),
        sampleCollectionNotes: formData.sampleCollectionNotes
      };


      const response = await API.put(`/test-requests/${id}/collection-status`, requestData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/dashboard/lab/test-request/${id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error updating collection status:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      }
      
      // Set user-friendly error message
      let errorMessage = 'Failed to update collection status';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Assigned':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Sample_Collection_Scheduled':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Sample_Collected':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'In_Lab_Testing':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Testing_Completed':
        return 'text-teal-600 bg-teal-50 border-teal-200';
      case 'Report_Generated':
        return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      case 'Report_Sent':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'Emergency':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'Urgent':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Normal':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !testRequest) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Test Request</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => navigate('/dashboard/lab/test-requests')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Test Requests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!testRequest) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 mb-2">No Test Request Found</h2>
              <p className="text-gray-600 mb-4">The requested test request could not be found.</p>
              <button
                onClick={() => navigate('/dashboard/lab/test-requests')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Test Requests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/dashboard/lab/test-request/${id}`)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <h1 className="text-xl font-bold text-gray-800">Update Sample Collection Status</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Record Header */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-gray-800 mb-2">SAMPLE COLLECTION STATUS</h1>
            <p className="text-gray-600">Update Sample Collection Progress</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-800">
                  Sample collection status updated successfully! Redirecting to test request details...
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
          
          {/* Test Request Information */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
              Test Request Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">Request ID</label>
                <p className="text-gray-900 font-medium">{testRequest._id || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Patient Name</label>
                <p className="text-gray-900 font-medium">{testRequest.patientName || testRequest.patientId?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Test Type</label>
                <p className="text-gray-900 font-medium">{testRequest.testType || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Status and Urgency */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              Current Status & Priority
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Current Status</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(testRequest.status)}`}>
                  {testRequest.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Urgency Level</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(testRequest.urgency)}`}>
                  {testRequest.urgency}
                </span>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Patient Name</label>
                    <p className="text-gray-900 font-medium">{testRequest.patientName || testRequest.patientId?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Patient Phone</label>
                    <p className="text-gray-900 font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {testRequest.patientPhone || testRequest.patientId?.phone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Patient Address</label>
                    <p className="text-gray-900 font-medium flex items-start">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                      {testRequest.patientAddress || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Scheduled Collection</label>
                    <p className="text-gray-900 font-medium">
                      {testRequest.sampleCollectionScheduledDate ? 
                        new Date(testRequest.sampleCollectionScheduledDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collection Status Form */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Play className="h-5 w-5 mr-2 text-blue-600" />
              Update Collection Status
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Collection Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Collection Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="sampleCollectionStatus"
                  value={formData.sampleCollectionStatus}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="In_Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                  <option value="Rescheduled">Rescheduled</option>
                </select>
              </div>

              {/* Actual Collection Date */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2">
                  Actual Collection Date
                </label>
                <input
                  type="date"
                  name="sampleCollectionActualDate"
                  value={formData.sampleCollectionActualDate}
                  onChange={handleInputChange}
                  min={minActualDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select today or a future date. Past dates are not allowed.
                </p>
              </div>

              {/* Collection Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Collection Notes
                </label>
                <textarea
                  name="sampleCollectionNotes"
                  value={formData.sampleCollectionNotes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Enter any notes about the sample collection process..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/lab/test-request/${id}`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatus; 