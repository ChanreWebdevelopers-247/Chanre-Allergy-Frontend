import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';
import { 
  Settings, 
  ArrowLeft, 
  Save,
  DollarSign,
  Building,
  Phone,
  Mail,
  Info
} from 'lucide-react';

const CenterSettings = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    fees: {
      registrationFee: 150,
      consultationFee: 850,
      serviceFee: 150,
      superconsultantFees: {
        normal: 850,
        audio: 950,
        video: 1050,
        reviewReports: 750
      }
    },
    discountSettings: {
      staff: 10,
      senior: 20,
      student: 15,
      employee: 10,
      insurance: 0,
      referral: 5,
      promotion: 10,
      charity: 100
    },
    fax: '080-42516600',
    missCallNumber: '080-42516666',
    mobileNumber: '9686197153'
  });

  // Get center ID from user
  const getCenterId = () => {
    if (!user) return null;
    
    if (user.centerId) {
      if (typeof user.centerId === 'object' && user.centerId._id) {
        return user.centerId._id;
      }
      return user.centerId;
    }
    
    return null;
  };

  const centerId = getCenterId();

  // Fetch current settings
  useEffect(() => {
    if (centerId) {
      fetchSettings();
    }
  }, [centerId]);

  const fetchSettings = async () => {
    try {
      const response = await API.get(`/centers/${centerId}/fees`);
      if (response.data) {
        setSettings({
          fees: {
            ...settings.fees,
            ...response.data.fees,
            superconsultantFees: {
              ...settings.fees.superconsultantFees,
              ...(response.data.fees?.superconsultantFees || {})
            }
          },
          discountSettings: response.data.discountSettings || settings.discountSettings,
          fax: response.data.fax || settings.fax,
          missCallNumber: response.data.missCallNumber || settings.missCallNumber,
          mobileNumber: response.data.mobileNumber || settings.mobileNumber
        });
      }
    } catch (error) {
      console.error('Error fetching center settings:', error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.startsWith('fees.')) {
      const parts = field.split('.');
      if (parts.length === 2) {
        // Regular fee field (registrationFee, consultationFee, serviceFee)
        const feeField = parts[1];
        setSettings(prev => ({
          ...prev,
          fees: {
            ...prev.fees,
            [feeField]: value
          }
        }));
      } else if (parts.length === 3 && parts[1] === 'superconsultantFees') {
        // Superconsultant fee field (fees.superconsultantFees.normal, etc.)
        const superconsultantFeeField = parts[2];
        setSettings(prev => ({
          ...prev,
          fees: {
            ...prev.fees,
            superconsultantFees: {
              ...prev.fees.superconsultantFees,
              [superconsultantFeeField]: value
            }
          }
        }));
      }
    } else if (field.startsWith('discountSettings.')) {
      const discountField = field.split('.')[1];
      setSettings(prev => ({
        ...prev,
        discountSettings: {
          ...prev.discountSettings,
          [discountField]: value
        }
      }));
    } else {
      // Handle regular fields
      if (field === 'mobileNumber') {
        // When mobile number is updated, also update miss call number
        setSettings(prev => ({
          ...prev,
          mobileNumber: value,
          missCallNumber: value
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          [field]: value
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!centerId) {
      toast.error('Center ID not found');
      return;
    }

    setLoading(true);
    try {
      await API.put(`/centers/${centerId}/fees`, settings);
      toast.success('Center settings updated successfully!');
    } catch (error) {
      console.error('Error updating center settings:', error);
      toast.error('Failed to update center settings');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'centeradmin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 text-sm">Access denied. Only center admins can view this page.</p>
            <button
              onClick={() => navigate('/dashboard/centeradmin/dashboard')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/centeradmin/dashboard')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Center Settings
          </h1>
          <p className="text-slate-600 text-sm">
            Manage fees and contact information for your center
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fee Management Section */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                Fee Management
              </h2>
              <p className="text-slate-600 mt-1 text-sm">
                Set standard fees for your center. These will be used for all patient billing.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Registration Fee (₹) *
                  </label>
                  <input
                    type="number"
                    value={settings.fees.registrationFee}
                    onChange={(e) => handleInputChange('fees.registrationFee', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    required
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Charged to new patients
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Consultation Fee (₹) *
                  </label>
                  <input
                    type="number"
                    value={settings.fees.consultationFee}
                    onChange={(e) => handleInputChange('fees.consultationFee', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    required
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Standard consultation charge
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Service Fee (₹) *
                  </label>
                  <input
                    type="number"
                    value={settings.fees.serviceFee}
                    onChange={(e) => handleInputChange('fees.serviceFee', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    required
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Additional service charges
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Fee Information</p>
                    <p>These fees will be automatically applied when creating invoices for patients. Receptionists can still override these amounts on a per-invoice basis if needed.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Superconsultant Fee Management Section */}
          <div className="bg-white rounded-xl shadow-sm border border-purple-100">
            <div className="p-6 border-b border-purple-100">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-purple-500" />
                Superconsultant Consultation Fees
              </h2>
              <p className="text-slate-600 mt-1 text-sm">
                Set fees for different types of superconsultant consultations. These will be used when creating invoices in the Superconsultant Billing page.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Normal Consultation Fee (₹) *
                  </label>
                  <input
                    type="number"
                    value={settings.fees.superconsultantFees.normal}
                    onChange={(e) => handleInputChange('fees.superconsultantFees.normal', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    required
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Standard superconsultant consultation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Audio Consultation Fee (₹) *
                  </label>
                  <input
                    type="number"
                    value={settings.fees.superconsultantFees.audio}
                    onChange={(e) => handleInputChange('fees.superconsultantFees.audio', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    required
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Audio/telephonic consultation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Video Consultation Fee (₹) *
                  </label>
                  <input
                    type="number"
                    value={settings.fees.superconsultantFees.video}
                    onChange={(e) => handleInputChange('fees.superconsultantFees.video', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    required
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Video consultation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Review Reports Fee (₹) *
                  </label>
                  <input
                    type="number"
                    value={settings.fees.superconsultantFees.reviewReports}
                    onChange={(e) => handleInputChange('fees.superconsultantFees.reviewReports', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    required
                    min="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Review existing lab reports
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-purple-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-purple-700">
                    <p className="font-medium mb-1">Superconsultant Fee Information</p>
                    <p>These fees will be used as default values when creating superconsultant invoices. Receptionists can still override these amounts on a per-invoice basis if needed.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Discount Management Section */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                Discount Settings
              </h2>
              <p className="text-slate-600 mt-1 text-sm">
                Set discount percentages for different patient types. These will be automatically applied when a discount reason is selected during invoice creation.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Staff Discount (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.staff}
                    onChange={(e) => handleInputChange('discountSettings.staff', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Senior Citizen Discount (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.senior}
                    onChange={(e) => handleInputChange('discountSettings.senior', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Student Discount (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.student}
                    onChange={(e) => handleInputChange('discountSettings.student', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Employee Discount (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.employee}
                    onChange={(e) => handleInputChange('discountSettings.employee', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Insurance Coverage (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.insurance}
                    onChange={(e) => handleInputChange('discountSettings.insurance', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Referral Discount (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.referral}
                    onChange={(e) => handleInputChange('discountSettings.referral', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Promotional Discount (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.promotion}
                    onChange={(e) => handleInputChange('discountSettings.promotion', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Charity Discount (%)
                  </label>
                  <input
                    type="number"
                    value={settings.discountSettings.charity}
                    onChange={(e) => handleInputChange('discountSettings.charity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Discount Information</p>
                    <p>When receptionists create invoices and select a discount reason, the corresponding percentage will be automatically applied. Receptionists can still manually adjust the discount if needed.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <Building className="h-5 w-5 mr-2 text-blue-500" />
                Contact Information
              </h2>
              <p className="text-slate-600 mt-1 text-sm">
                Update center contact details that appear on invoices and reports.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Fax Number
                  </label>
                  <input
                    type="text"
                    value={settings.fax}
                    onChange={(e) => handleInputChange('fax', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="080-42516600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Miss Call Number
                  </label>
                  <input
                    type="text"
                    value={settings.missCallNumber}
                    onChange={(e) => handleInputChange('missCallNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="内有-42516666"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={settings.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="9686197153"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard/centeradmin/dashboard')}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CenterSettings;

