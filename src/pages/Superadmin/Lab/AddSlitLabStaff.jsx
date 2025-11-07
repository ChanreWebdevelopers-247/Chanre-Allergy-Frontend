import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { createSlitLabStaff } from '../../../features/superadmin/superadminThunks';
import { resetSuperadminState } from '../../../features/superadmin/superadminSlice';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  username: '',
  password: '',
  confirmPassword: ''
};

export default function AddSlitLabStaff() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, addSlitLabStaffSuccess } = useSelector((state) => state.superadmin);

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (addSlitLabStaffSuccess) {
      toast.success('SLIT lab staff member created successfully');
      dispatch(resetSuperadminState());
      navigate('/dashboard/Superadmin/Lab/SlitLabStaffList');
    }
  }, [addSlitLabStaffSuccess, dispatch, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const validate = (values) => {
    const validationErrors = {};

    if (!values.name.trim()) validationErrors.name = 'Name is required';

    if (!values.email.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      validationErrors.email = 'Enter a valid email address';
    }

    if (!values.phone.trim()) {
      validationErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{7,15}$/.test(values.phone.trim().replace(/\s|-/g, ''))) {
      validationErrors.phone = 'Enter a valid phone number';
    }

    if (values.password.length < 8) {
      validationErrors.password = 'Password must be at least 8 characters long';
    }

    if (values.password !== values.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }

    return validationErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(updated));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    setErrors(validationErrors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      username: true,
      password: true,
      confirmPassword: true
    });

    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      username: formData.username.trim() || undefined,
      password: formData.password
    };

    dispatch(createSlitLabStaff(payload));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/dashboard/Superadmin/Lab/SlitLabStaffList')}
            className="flex items-center text-slate-600 hover:text-slate-800 text-sm mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to SLIT Lab Staff
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-500" />
            Add SLIT Lab Staff
          </h1>
          <p className="text-slate-600 text-sm">
            Create a dedicated user for managing SLIT therapy workflows.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-blue-100">
          <div className="p-4 sm:p-6 border-b border-blue-100">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">Staff Details</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Fill out the required information to provision access for SLIT therapy operations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${touched.name && errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  placeholder="Enter staff name"
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${touched.email && errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  placeholder="name@example.com"
                />
                {touched.email && errors.email && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${touched.phone && errors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  placeholder="Contact number"
                />
                {touched.phone && errors.phone && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Username (optional)</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Use email if left blank"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${touched.password && errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  placeholder="Minimum 8 characters"
                />
                {touched.password && errors.password && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${touched.confirmPassword && errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  placeholder="Re-enter password"
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/dashboard/Superadmin/Lab/SlitLabStaffList')}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : 'Create Staff'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

