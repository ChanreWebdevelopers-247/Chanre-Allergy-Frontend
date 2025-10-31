// src/pages/superadmin/AddCenterWithAdmin.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createCenterWithAdmin } from "../../../features/center/centerThunks";
import { resetStatus } from "../../../features/center/centerSlice";
import { useNavigate } from "react-router-dom";
import {
  Building2, MapPin, Mail, Phone, Plus, User, GraduationCap, 
  Badge, Hash, Eye, EyeOff, Save, ArrowLeft, CheckCircle, AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";
import { validateCenterForm, validateDoctorForm, hasFormErrors, hasTouchedFormErrors } from "../../../utils/formValidation";

export default function AddCenterWithAdmin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { loading, success, error } = useSelector((state) => state.center);

  const [center, setCenter] = useState({
    centername: "", location: "", fulladdress: "", email: "", phone: "", code: ""
  });

  const [admin, setAdmin] = useState({
    name: "", qualification: "", designation: "", kmcNumber: "", hospitalName: "",
    phone: "", email: "", username: "", password: "", userType: "centeradmin", centerCode: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [centerErrors, setCenterErrors] = useState({});
  const [adminErrors, setAdminErrors] = useState({});
  const [centerTouched, setCenterTouched] = useState({});
  const [adminTouched, setAdminTouched] = useState({});

  const handleCenterChange = (e) => {
    const { name, value } = e.target;
    setCenter((prev) => ({ ...prev, [name]: value }));
    
    // Mark field as touched
    setCenterTouched({ ...centerTouched, [name]: true });
    
    // Validate the field
    const validationErrors = validateCenterForm({ ...center, [name]: value });
    setCenterErrors({ ...centerErrors, [name]: validationErrors[name] });
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdmin((prev) => ({ ...prev, [name]: value }));
    
    // Mark field as touched
    setAdminTouched({ ...adminTouched, [name]: true });
    
    // Validate the field
    const validationErrors = validateDoctorForm({ ...admin, [name]: value });
    setAdminErrors({ ...adminErrors, [name]: validationErrors[name] });
  };

  const handleCenterBlur = (e) => {
    const { name } = e.target;
    setCenterTouched({ ...centerTouched, [name]: true });
    
    // Validate the field
    const validationErrors = validateCenterForm(center);
    setCenterErrors({ ...centerErrors, [name]: validationErrors[name] });
  };

  const handleAdminBlur = (e) => {
    const { name } = e.target;
    setAdminTouched({ ...adminTouched, [name]: true });
    
    // Validate the field
    const validationErrors = validateDoctorForm(admin);
    setAdminErrors({ ...adminErrors, [name]: validationErrors[name] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allCenterTouched = {};
    Object.keys(center).forEach(key => {
      allCenterTouched[key] = true;
    });
    setCenterTouched(allCenterTouched);
    
    const allAdminTouched = {};
    Object.keys(admin).forEach(key => {
      allAdminTouched[key] = true;
    });
    setAdminTouched(allAdminTouched);
    
    // Validate both forms
    const centerValidationErrors = validateCenterForm(center);
    const adminValidationErrors = validateDoctorForm(admin);
    
    setCenterErrors(centerValidationErrors);
    setAdminErrors(adminValidationErrors);
    
    // Check if there are any errors
    if (hasFormErrors(centerValidationErrors) || hasFormErrors(adminValidationErrors)) {
      console.log('❌ Center Validation Errors:', centerValidationErrors);
      console.log('❌ Admin Validation Errors:', adminValidationErrors);
      toast.error('Please fix validation errors before submitting');
      return; // Don't submit if there are validation errors
    }
    
    dispatch(createCenterWithAdmin({ center, admin }));
  };

  useEffect(() => {
    if (success) {
      toast.success("Successfully added center and admin!");
      setCenter({ centername: "", location: "", fulladdress: "", email: "", phone: "", code: "" });
      setAdmin({
        name: "", qualification: "", designation: "", kmcNumber: "", hospitalName: "",
        phone: "", email: "", username: "", password: "", userType: "centeradmin", centerCode: ""
      });

      setTimeout(() => {
        dispatch(resetStatus());
        navigate("/dashboard/Superadmin/Centers/CentersList");
      }, 1500);
    }
  }, [success, navigate, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Sync admin centerCode and hospitalName with center information
  useEffect(() => {
    const centerName = center.name || center.centername || '';
    console.log('🔄 Syncing admin with center:', { centerName, centerCode: center.code, center }); // Debug log
    setAdmin(prev => ({ 
      ...prev, 
      centerCode: center.code,
      hospitalName: centerName // Use name field from center (backend model field)
    }));
  }, [center.code, center.name, center.centername]);

  return (
    <div className="min-h-screen  p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/dashboard/Superadmin/Centers/CentersList')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-3 sm:mb-4 transition-colors text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Centers
          </button>
          <h1 className="text-md font-bold text-slate-800 mb-2">
            Add Healthcare Center & Admin
          </h1>
          <p className="text-xs text-slate-600">
            Create a new healthcare center with its administrator
          </p>
        </div>

        {/* Alert Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-green-700 text-xs">Successfully added center and admin!</span>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-700 text-xs">{error}</span>
          </div>
        )}

        {/* Debug Panel - Shows validation errors */}
        {(Object.keys(centerTouched).length > 0 || Object.keys(adminTouched).length > 0) && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs font-semibold text-yellow-800 mb-2">Validation Debug Info:</p>
            <div className="text-xs text-yellow-700">
              <p>Center Errors: {Object.entries(centerErrors).filter(([key, val]) => val !== null).map(([key, val]) => `${key}: ${val}`).join(', ') || 'None'}</p>
              <p>Admin Errors: {Object.entries(adminErrors).filter(([key, val]) => val !== null).map(([key, val]) => `${key}: ${val}`).join(', ') || 'None'}</p>
              <p className="mt-2">Button disabled: {loading || hasTouchedFormErrors(centerErrors, centerTouched) || hasTouchedFormErrors(adminErrors, adminTouched) ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Center Information Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-blue-500" />
                Center Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
                <Input 
                  label="Center Name" 
                  name="centername" 
                  value={center.centername} 
                  onChange={handleCenterChange} 
                  onBlur={handleCenterBlur}
                  icon={<Building2 className="h-4 w-4 text-blue-500" />}
                  errors={centerErrors.centername}
                  touched={centerTouched.centername}
                />
                <Input 
                  label="Location (City)" 
                  name="location" 
                  value={center.location} 
                  onChange={handleCenterChange} 
                  onBlur={handleCenterBlur}
                  icon={<MapPin className="h-4 w-4 text-blue-500" />}
                  errors={centerErrors.location}
                  touched={centerTouched.location}
                />
                <Input 
                  label="Center Code" 
                  name="code" 
                  value={center.code} 
                  onChange={handleCenterChange} 
                  onBlur={handleCenterBlur}
                  icon={<Hash className="h-4 w-4 text-blue-500" />}
                  errors={centerErrors.code}
                  touched={centerTouched.code}
                />
                <div className="sm:col-span-2">
                  <TextArea 
                    label="Full Address" 
                    name="fulladdress" 
                    value={center.fulladdress} 
                    onChange={handleCenterChange} 
                    onBlur={handleCenterBlur}
                    icon={<MapPin className="h-4 w-4 text-blue-500" />}
                    errors={centerErrors.fulladdress}
                    touched={centerTouched.fulladdress}
                  />
                </div>
                <Input 
                  label="Email" 
                  name="email" 
                  type="email" 
                  value={center.email} 
                  onChange={handleCenterChange} 
                  onBlur={handleCenterBlur}
                  icon={<Mail className="h-4 w-4 text-blue-500" />}
                  errors={centerErrors.email}
                  touched={centerTouched.email}
                />
                <Input 
                  label="Phone" 
                  name="phone" 
                  value={center.phone} 
                  onChange={handleCenterChange} 
                  onBlur={handleCenterBlur}
                  icon={<Phone className="h-4 w-4 text-blue-500" />}
                  errors={centerErrors.phone}
                  touched={centerTouched.phone}
                />
              </div>
            </div>

            {/* Admin Information Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-500" />
                Administrator Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
                <Input 
                  label="Full Name" 
                  name="name" 
                  value={admin.name} 
                  onChange={handleAdminChange} 
                  onBlur={handleAdminBlur}
                  icon={<User className="h-4 w-4 text-blue-500" />}
                  errors={adminErrors.name}
                  touched={adminTouched.name}
                />
                <Input 
                  label="Qualification" 
                  name="qualification" 
                  value={admin.qualification} 
                  onChange={handleAdminChange} 
                  onBlur={handleAdminBlur}
                  icon={<GraduationCap className="h-4 w-4 text-blue-500" />}
                  errors={adminErrors.qualification}
                  touched={adminTouched.qualification}
                />
                <Input 
                  label="Designation" 
                  name="designation" 
                  value={admin.designation} 
                  onChange={handleAdminChange} 
                  onBlur={handleAdminBlur}
                  icon={<Badge className="h-4 w-4 text-blue-500" />}
                  errors={adminErrors.designation}
                  touched={adminTouched.designation}
                />
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Badge className="h-4 w-4 text-blue-500" />
                    KMC Number
                  </label>
                  <input
                    name="kmcNumber"
                    type="text"
                    value={admin.kmcNumber}
                    onChange={handleAdminChange}
                    onBlur={handleAdminBlur}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                      adminTouched.kmcNumber && adminErrors.kmcNumber 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-200'
                    }`}
                    placeholder="Enter KMC number (optional)"
                  />
                  {adminTouched.kmcNumber && adminErrors.kmcNumber && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {adminErrors.kmcNumber}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Hospital Name * <span className="text-blue-600 text-xs font-normal">(Auto-filled from Center Name)</span>
                  </label>
                  <input
                    name="hospitalName"
                    type="text"
                    value={admin.hospitalName}
                    readOnly
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed text-xs"
                    placeholder="Auto-filled from center name"
                  />
                  <p className="mt-1 text-xs text-slate-500 italic">
                    Automatically synchronized with the center name above
                  </p>
                </div>
                <Input 
                  label="Phone" 
                  name="phone" 
                  value={admin.phone} 
                  onChange={handleAdminChange} 
                  onBlur={handleAdminBlur}
                  icon={<Phone className="h-4 w-4 text-blue-500" />}
                  errors={adminErrors.phone}
                  touched={adminTouched.phone}
                />
                <Input 
                  label="Email" 
                  name="email" 
                  type="email" 
                  value={admin.email} 
                  onChange={handleAdminChange} 
                  onBlur={handleAdminBlur}
                  icon={<Mail className="h-4 w-4 text-blue-500" />}
                  errors={adminErrors.email}
                  touched={adminTouched.email}
                />
                <Input 
                  label="Username" 
                  name="username" 
                  value={admin.username} 
                  onChange={handleAdminChange} 
                  onBlur={handleAdminBlur}
                  icon={<User className="h-4 w-4 text-blue-500" />}
                  errors={adminErrors.username}
                  touched={adminTouched.username}
                />

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Badge className="h-4 w-4 text-blue-500" />
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={admin.password}
                      onChange={handleAdminChange}
                      onBlur={handleAdminBlur}
                      required
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                        adminTouched.password && adminErrors.password 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-200'
                      }`}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2 sm:top-3 text-slate-400 hover:text-blue-500 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {adminTouched.password && adminErrors.password && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {adminErrors.password}
                    </p>
                  )}
                </div>

                {/* User Type */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    User Type *
                  </label>
                  <select
                    name="userType"
                    value={admin.userType}
                    onChange={handleAdminChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs"
                  >
                    <option value="centeradmin">Center Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || hasTouchedFormErrors(centerErrors, centerTouched) || hasTouchedFormErrors(adminErrors, adminTouched)}
                className={`w-full py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-xs ${
                  loading || hasTouchedFormErrors(centerErrors, centerTouched) || hasTouchedFormErrors(adminErrors, adminTouched)
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Center & Admin...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Center & Admin
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

const Input = ({ label, name, value, onChange, onBlur, type = "text", icon, errors, touched }) => (
  <div>
    <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
      {icon}
      {label} *
    </label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      required
      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
        touched && errors 
          ? 'border-red-300 bg-red-50' 
          : 'border-slate-200'
      }`}
      placeholder={`Enter ${label.toLowerCase()}`}
    />
    {touched && errors && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {errors}
      </p>
    )}
  </div>
);

const TextArea = ({ label, name, value, onChange, onBlur, icon, errors, touched }) => (
  <div>
    <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
      {icon}
      {label} *
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      required
      rows={3}
      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none text-xs ${
        touched && errors 
          ? 'border-red-300 bg-red-50' 
          : 'border-slate-200'
      }`}
      placeholder={`Enter ${label.toLowerCase()}`}
    />
    {touched && errors && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {errors}
      </p>
    )}
  </div>
);
