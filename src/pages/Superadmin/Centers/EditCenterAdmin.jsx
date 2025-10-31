import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCenterAdmin, createCenterAdmin, updateCenterAdmin } from '../../../features/superadmin/superadminThunks';
import { resetSuperadminState } from '../../../features/superadmin/superadminSlice';
import { getCenterById } from '../../../features/center/centerThunks';
import { User, GraduationCap, Badge, Building2, Hash, Phone, Mail, Save, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

export default function EditCenterAdmin() {
  const { id } = useParams(); // id is centerId when assigning
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { centerAdmin, loading, error, isNewAdmin, addSuccess, updateSuccess } = useSelector((state) => state.superadmin);
  const { currentCenter: center } = useSelector((state) => state.center || { currentCenter: null });

  const [admin, setAdmin] = useState({
    name: '',
    qualification: '',
    designation: '',
    kmcNumber: '',
    hospitalName: '',
    centerCode: '',
    phone: '',
    email: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchCenterAdmin(id));
      // Always try to fetch center data with id initially
      // This will work if id is a centerId (new admin case)
      dispatch(getCenterById(id));
    }
    return () => {
      dispatch(resetSuperadminState());
    };
  }, [dispatch, id]);

  // Fetch center data when we confirm it's a new admin (fallback)
  useEffect(() => {
    if (id && isNewAdmin === true && !center) {
      // For new admin, id is the centerId - ensure center data is fetched
      dispatch(getCenterById(id));
    }
  }, [dispatch, id, isNewAdmin, center]);

  // When centerAdmin is loaded and it's an existing admin, fetch center data using centerId
  useEffect(() => {
    if (centerAdmin && isNewAdmin === false && centerAdmin.centerId && !center) {
      // For existing admin, get centerId from centerAdmin and fetch center data
      dispatch(getCenterById(centerAdmin.centerId));
    }
  }, [dispatch, centerAdmin, isNewAdmin, center]);

  useEffect(() => {
    if (centerAdmin) {
      setAdmin(prev => {
        const adminData = { 
          ...centerAdmin, 
          password: '',
          qualification: centerAdmin.qualification || '',
          designation: centerAdmin.designation || '',
          kmcNumber: centerAdmin.kmcNumber || '',
          username: centerAdmin.username || '',
          phone: centerAdmin.phone || '',
          email: centerAdmin.email || '',
          name: centerAdmin.name || '',
          // Always preserve hospitalName and centerCode from center data (not from centerAdmin)
          // If center data hasn't loaded yet, these will be empty until center loads
          hospitalName: prev.hospitalName || '',
          centerCode: prev.centerCode || ''
        };
        return adminData;
      });
    }
  }, [centerAdmin]);

  // Auto-fill hospitalName and centerCode from center data - this ALWAYS overrides stored values
  useEffect(() => {
    if (center) {
      const centerName = center.name || center.centername || '';
      const centerCode = center.code || '';
      console.log('🔄 Auto-filling from center:', { centerName, centerCode, center }); // Debug log
      setAdmin(prev => ({
        ...prev,
        hospitalName: centerName, // Use name field from center (backend model field)
        centerCode: centerCode // Always use center code from center data
      }));
    }
  }, [center]);

  useEffect(() => {
    if (addSuccess) {
      toast.success('Admin created successfully!');
      setTimeout(() => {
        dispatch(resetSuperadminState());
        navigate('/dashboard/Superadmin/Centers/ManageAdmins');
      }, 1500);
    }
  }, [addSuccess, dispatch, navigate]);

  useEffect(() => {
    if (updateSuccess) {
      toast.success('Admin updated successfully!');
      setTimeout(() => {
        dispatch(resetSuperadminState());
        navigate('/dashboard/Superadmin/Centers/ManageAdmins');
      }, 1500);
    }
  }, [updateSuccess, dispatch, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleAdminChange = (e) => {
    setAdmin({ ...admin, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNewAdmin) {
      dispatch(createCenterAdmin({ ...admin, centerId: id }));
    } else {
      dispatch(updateCenterAdmin({ id, adminData: admin }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 sm:p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600 text-xs">Loading admin details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/dashboard/Superadmin/Centers/ManageAdmins')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-3 sm:mb-4 transition-colors text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admins
          </button>
          <h1 className="text-md font-bold text-slate-800 mb-2">
            {isNewAdmin ? 'Assign Center Admin' : 'Edit Center Admin'}
          </h1>
          <p className="text-xs text-slate-600">
            {isNewAdmin ? 'Create a new administrator for this center' : 'Update administrator information'}
          </p>
        </div>

        {/* Alert Messages */}
        {addSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-green-700 text-xs">Admin created successfully</span>
          </div>
        )}
        {updateSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-green-700 text-xs">Admin updated successfully</span>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-700 text-xs">{error}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100">
          <div className="p-4 sm:p-6 border-b border-blue-100">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              Administrator Information
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {isNewAdmin ? 'Fill in the details for the new administrator' : 'Update the administrator details below'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={admin.name || ''}
                  onChange={handleAdminChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-500" />
                  Qualification *
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={admin.qualification || ''}
                  onChange={handleAdminChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  placeholder="Enter qualification"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Badge className="h-4 w-4 text-blue-500" />
                  Designation *
                </label>
                <input
                  type="text"
                  name="designation"
                  value={admin.designation}
                  onChange={handleAdminChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  placeholder="Enter designation"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Badge className="h-4 w-4 text-blue-500" />
                  KMC Number
                </label>
                <input
                  type="text"
                  name="kmcNumber"
                  value={admin.kmcNumber}
                  onChange={handleAdminChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  placeholder="Enter KMC number (optional)"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Hospital Name * <span className="text-blue-600 text-xs font-normal">(Auto-filled from Center)</span>
                </label>
                <input
                  type="text"
                  name="hospitalName"
                  value={admin.hospitalName}
                  readOnly
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed text-xs"
                  placeholder="Auto-filled from center name"
                />
                <p className="mt-1 text-xs text-slate-500 italic">
                  Automatically synchronized with the center name
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-blue-500" />
                  Center Code * <span className="text-blue-600 text-xs font-normal">(Auto-filled from Center)</span>
                </label>
                <input
                  type="text"
                  name="centerCode"
                  value={admin.centerCode}
                  readOnly
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed text-xs"
                  placeholder="Auto-filled from center code"
                />
                <p className="mt-1 text-xs text-slate-500 italic">
                  Automatically synchronized with the center code
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" />
                  Phone *
                </label>
                <input
                  type="text"
                  name="phone"
                  value={admin.phone}
                  onChange={handleAdminChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={admin.email}
                  onChange={handleAdminChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={admin.username}
                  onChange={handleAdminChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Badge className="h-4 w-4 text-blue-500" />
                  Password {!isNewAdmin && '(Leave blank to keep current)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={admin.password}
                    onChange={handleAdminChange}
                    required={isNewAdmin}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                    placeholder={isNewAdmin ? "Enter password" : "Enter new password (optional)"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2 sm:top-3 text-slate-400 hover:text-blue-500 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isNewAdmin ? 'Creating Admin...' : 'Saving Changes...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isNewAdmin ? 'Assign Admin' : 'Save Changes'}
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
