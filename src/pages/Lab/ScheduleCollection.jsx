import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import API from '../../services/api';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin,
  Save,
  AlertCircle,
  CheckCircle,
  CalendarDays,
  Users
} from 'lucide-react';

const toLocalISODate = (date) => {
  const offsetMillis = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMillis).toISOString().split('T')[0];
};

const getCurrentTimeHHMM = () => new Date().toTimeString().slice(0, 5);

export default function ScheduleCollection() {
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
    sampleCollectorId: '',
    sampleCollectorName: '',
    sampleCollectionScheduledDate: '',
    sampleCollectionScheduledTime: '',
    sampleCollectionNotes: ''
  });

  // Available collectors (lab staff)
  const [availableCollectors, setAvailableCollectors] = useState([]);

  const minSelectableDate = toLocalISODate(new Date());
  const minSelectableTime = formData.sampleCollectionScheduledDate === minSelectableDate
    ? getCurrentTimeHHMM()
    : undefined;

  useEffect(() => {
    if (id) {
      fetchTestRequestDetails();
      fetchAvailableCollectors();
    }
  }, [id]);

  const fetchTestRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/test-requests/${id}`);
      setTestRequest(response.data);
      
      
      // Pre-fill form with existing data if available
      if (response.data.sampleCollectorId) {
        setFormData(prev => ({
          ...prev,
          sampleCollectorId: response.data.sampleCollectorId,
          sampleCollectorName: response.data.sampleCollectorName || '',
          sampleCollectionScheduledDate: response.data.sampleCollectionScheduledDate ? 
            new Date(response.data.sampleCollectionScheduledDate).toISOString().split('T')[0] : '',
          sampleCollectionScheduledTime: response.data.sampleCollectionScheduledDate ? 
            new Date(response.data.sampleCollectionScheduledDate).toTimeString().slice(0, 5) : '',
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

  const fetchAvailableCollectors = async () => {
    try {
      const response = await API.get('/lab-staff');
      const collectors = response.data.filter(staff => 
        staff.role === 'Lab Staff' || 
        staff.role === 'lab staff'
      );
      setAvailableCollectors(collectors);
    } catch (error) {
      console.error('Error fetching available collectors:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill collector name when collector ID is selected
    if (name === 'sampleCollectorId') {
      const selectedCollector = availableCollectors.find(collector => collector._id === value);
      if (selectedCollector) {
        setFormData(prev => ({
          ...prev,
          sampleCollectorName: selectedCollector.staffName
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced form validation
    const validationErrors = [];
    
    if (!formData.sampleCollectorId) {
      validationErrors.push('Sample collector is required');
    }
    
    if (!formData.sampleCollectionScheduledDate) {
      validationErrors.push('Collection date is required');
    }
    
    if (!formData.sampleCollectionScheduledTime) {
      validationErrors.push('Collection time is required');
    }
    
    if (validationErrors.length > 0) {
      setError(`Please fill in all required fields: ${validationErrors.join(', ')}`);
      return;
    }

    const selectedDate = new Date(`${formData.sampleCollectionScheduledDate}T${formData.sampleCollectionScheduledTime}`);
    const now = new Date();

    if (Number.isNaN(selectedDate.getTime())) {
      setError('Invalid collection date or time. Please select a valid future slot.');
      return;
    }

    if (selectedDate <= now) {
      setError('Collection date and time cannot be in the past. Please choose a future slot.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Combine date and time
      const scheduledDateTime = new Date(`${formData.sampleCollectionScheduledDate}T${formData.sampleCollectionScheduledTime}`);
      
      const requestData = {
        sampleCollectorId: formData.sampleCollectorId,
        sampleCollectorName: formData.sampleCollectorName,
        sampleCollectionScheduledDate: scheduledDateTime.toISOString(),
        sampleCollectionNotes: formData.sampleCollectionNotes
      };


      const response = await API.put(`/test-requests/${id}/schedule-collection`, requestData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/dashboard/lab/test-request/${id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error scheduling collection:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      }
      
      // Set user-friendly error message
      let errorMessage = 'Failed to schedule collection';
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
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading test request details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !testRequest) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-2">Error Loading Test Request</h3>
            <p className="text-slate-600">{error}</p>
            <button
              onClick={() => navigate('/dashboard/lab/test-requests')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Test Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/dashboard/lab/test-request/${id}`)}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Test Request Details
          </button>
          
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Schedule Sample Collection
          </h1>
          <p className="text-slate-600">
            Schedule a sample collection appointment for this test request
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-800">
                Sample collection scheduled successfully! Redirecting to test request details...
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
        {testRequest && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Test Request Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(testRequest.status)}`}>
                    {testRequest.status.replace(/_/g, ' ')}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(testRequest.urgency)}`}>
                    {testRequest.urgency}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p><strong>Test Type:</strong> {testRequest.testType}</p>
                  <p><strong>Description:</strong> {testRequest.testDescription}</p>
                  <p><strong>Patient:</strong> {testRequest.patientName || testRequest.patientId?.name || 'N/A'}</p>
                  <p><strong>Doctor:</strong> {testRequest.doctorName}</p>
                </div>
              </div>
              
              <div>
                <div className="flex items-center mb-3">
                  <MapPin className="h-4 w-4 text-slate-500 mr-2" />
                  <span className="text-slate-600 font-medium">Patient Address</span>
                </div>
                <p className="text-slate-600 mb-3">{testRequest.patientAddress}</p>
                
                <div className="flex items-center mb-3">
                  <Phone className="h-4 w-4 text-slate-500 mr-2" />
                  <span className="text-slate-600 font-medium">Patient Phone</span>
                </div>
                <p className="text-slate-600">{testRequest.patientPhone}</p>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Form */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Schedule Collection Appointment</h2>
          
          {/* Requirements Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Requirements for Scheduling Collection</h3>
            <div className="space-y-1 text-xs text-yellow-700">
              <p>• Billing must be completed (status: generated, payment_received, or paid)</p>
              <p>• Lab staff must be assigned to the test request</p>
              <p>• Test request must be in a valid status for collection scheduling</p>
              <p>• Collection appointments must be scheduled for a future date and time</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sample Collector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Sample Collector <span className="text-red-500">*</span>
              </label>
              <select
                name="sampleCollectorId"
                value={formData.sampleCollectorId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a sample collector</option>
                {availableCollectors.map(collector => (
                  <option key={collector._id} value={collector._id}>
                    {collector.staffName} - {collector.role}
                  </option>
                ))}
              </select>
              {formData.sampleCollectorName && (
                <p className="text-xs text-slate-500 mt-1">
                  Selected: {formData.sampleCollectorName}
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Collection Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="sampleCollectionScheduledDate"
                  value={formData.sampleCollectionScheduledDate}
                  onChange={handleInputChange}
                  min={minSelectableDate}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Select a future date. Past dates are not allowed.
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Collection Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="sampleCollectionScheduledTime"
                  value={formData.sampleCollectionScheduledTime}
                  onChange={handleInputChange}
                  min={minSelectableTime}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Collection Notes
              </label>
              <textarea
                name="sampleCollectionNotes"
                value={formData.sampleCollectionNotes}
                onChange={handleInputChange}
                rows={4}
                placeholder="Enter any special instructions or notes for the sample collector..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Scheduled Appointment Summary */}
            {formData.sampleCollectionScheduledDate && formData.sampleCollectionScheduledTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Appointment Summary</h3>
                <div className="space-y-1 text-xs text-blue-800">
                  <p><strong>Date:</strong> {new Date(formData.sampleCollectionScheduledDate).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {formData.sampleCollectionScheduledTime}</p>
                  <p><strong>Collector:</strong> {formData.sampleCollectorName || 'Not selected'}</p>
                  <p><strong>Patient:</strong> {testRequest?.patientName}</p>
                  <p><strong>Address:</strong> {testRequest?.patientAddress}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/lab/test-request/${id}`)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.sampleCollectorId || !formData.sampleCollectionScheduledDate || !formData.sampleCollectionScheduledTime}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Schedule Collection
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 