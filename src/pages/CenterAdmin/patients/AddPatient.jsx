import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPatient } from "../../../features/patient/patientThunks";
import { resetPatientState } from "../../../features/patient/patientSlice";
import { useNavigate } from "react-router-dom";
import { fetchAllDoctors } from "../../../features/doctor/doctorThunks";
import { getCenterById } from "../../../features/center/centerThunks";
import API from "../../../services/api";
import { Users, ArrowLeft, User, Mail, Phone, MapPin, Building, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { validatePatientForm, hasFormErrors } from "../../../utils/formValidation";
const AddPatient = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, success, error } = useSelector((state) => state.patient);
  const doctorState = useSelector((state) => state.doctor);
  const { loading: doctorLoading, error: doctorError, doctors = [] } = doctorState;
  const { user } = useSelector((state) => state.auth);
  const { currentCenter } = useSelector((state) => state.center);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    address: "",
    contact: "",
    email: "",
    centerCode: "",
    assignedDoctor: "",
  });
  
  const [centerInfo, setCenterInfo] = useState({
    name: "Loading...",
    code: "Loading..."
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Get center ID from user
  const getCenterId = () => {
    if (!user) return null;
    
    if (user.centerId) {
      if (typeof user.centerId === 'object' && user.centerId._id) {
        return user.centerId._id;
      }
      if (typeof user.centerId === 'string') {
        return user.centerId;
      }
    }
    
    if (user.centerID) return user.centerID;
    if (user.center_id) return user.center_id;
    if (user.center && user.center._id) return user.center._id;
    
    return null;
  };

  useEffect(() => {
    dispatch(fetchAllDoctors());
    
    // Fetch center information and auto-populate
    const fetchCenterInfo = async () => {
      const centerId = getCenterId();
      
      if (centerId) {
        try {
          const response = await API.get(`/centers/${centerId}`);
          const center = response.data;
          
          setCenterInfo({
            name: center.name,
            code: center.code
          });
          
          // Auto-populate centerCode in form
          setFormData(prev => ({
            ...prev,
            centerCode: center.code
          }));
          
        } catch (error) {
          
          // Fallback to user's centerCode if available
          if (user.centerCode) {

            setFormData(prev => ({
              ...prev,
              centerCode: user.centerCode
            }));
            setCenterInfo(prev => ({
              ...prev,
              code: user.centerCode,
              name: user.hospitalName || 'Center'
            }));
          }
        }
      } else {

        
        // Alternative approach: Try to fetch center by admin ID
        if (user && user.id) {
          try {
            const response = await API.get(`/centers/by-admin/${user.id}`);
            const center = response.data;
            
            setCenterInfo({
              name: center.name,
              code: center.code
            });
            
            setFormData(prev => ({
              ...prev,
              centerCode: center.code
            }));
            
          } catch (altError) {
            console.error('❌ Alternative approach failed:', altError);
            
            // Final fallback to user fields
            if (user.centerCode) {
      
              setFormData(prev => ({
                ...prev,
                centerCode: user.centerCode
              }));
              setCenterInfo({
                code: user.centerCode,
                name: user.hospitalName || 'Center'
              });
            } else {
      
              setCenterInfo({
                name: 'Error: No center data',
                code: 'N/A'
              });
            }
          }
        } else {
  
          setCenterInfo({
            name: 'Error: No user data',
            code: 'N/A'
          });
        }
      }
    };
    
    fetchCenterInfo();
  }, [dispatch, user]);

  // Validate form whenever formData changes
  useEffect(() => {
    const validationErrors = validatePatientForm(formData);
    setErrors(validationErrors);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    // Mark field as touched
    setTouched({ ...touched, [name]: true });
    
    // Validate the entire form
    const validationErrors = validatePatientForm(newFormData);
    setErrors(validationErrors);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched({ ...touched, [name]: true });
    
    // Validate the entire form
    const validationErrors = validatePatientForm(formData);
    setErrors(validationErrors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
    
    // Validate the entire form
    const validationErrors = validatePatientForm(formData);
    setErrors(validationErrors);
    
    // Check if there are any errors
    if (hasFormErrors(validationErrors)) {
      return; // Don't submit if there are validation errors
    }
    
    dispatch(createPatient(formData));
  };

  useEffect(() => {
    if (success) {
      dispatch(resetPatientState());
      navigate("/dashboard/centeradmin/patients/patientlist");
    }
    
    // Display error if it exists and handle duplicate patient case
    if (error) {
      console.log('Patient creation error:', error);
    }
  }, [success, error, dispatch, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/centeradmin/patients/patientlist')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients List
          </button>
          <h1 className="text-md font-bold text-slate-800 mb-2">
            Add New Patient
          </h1>
          <p className="text-slate-600 text-xs">
            Register a new patient to your center
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100">
          <div className="p-6 border-b border-blue-100">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Patient Information
            </h2>
            <p className="text-slate-600 mt-1 text-xs">
              Fill in the details to register a new patient
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-800 mb-4">Personal Information</h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter patient name"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                      touched.name && errors.name 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-200'
                    }`}
                    required
                  />
                  {touched.name && errors.name && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Age *
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter age"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                        touched.age && errors.age 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-200'
                      }`}
                      required
                    />
                    {touched.age && errors.age && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.age}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                        touched.gender && errors.gender 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-200'
                      }`}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {touched.gender && errors.gender && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter address"
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none text-xs ${
                      touched.address && errors.address 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-200'
                    }`}
                    required
                  ></textarea>
                  {touched.address && errors.address && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-800 mb-4">Contact Information</h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter 10-digit phone number"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                      touched.contact && errors.contact 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-200'
                    }`}
                    required
                  />
                  {touched.contact && errors.contact && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.contact}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter email address"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                      touched.email && errors.email 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-200'
                    }`}
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Center Information
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Center Name
                      </label>
                      <input
                        type="text"
                        value={centerInfo.name || 'Loading center...'}
                        readOnly
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 cursor-not-allowed text-xs"
                        placeholder="Center name will be auto-filled"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Center Code
                      </label>
                      <input
                        type="text"
                        value={centerInfo.code || 'Loading...'}
                        readOnly
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 cursor-not-allowed text-xs"
                        placeholder="Center code will be auto-filled"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        UH ID (Auto-generated)
                      </label>
                      <input
                        type="text"
                        value={`${centerInfo.code || 'Loading'}001`}
                        readOnly
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-blue-50 text-blue-700 cursor-not-allowed text-xs font-medium"
                        placeholder="UH ID will be auto-generated"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Format: Center Code + Serial Number (e.g., 223344001)
                      </p>
                    </div>
                  </div>
                  <input
                    type="hidden"
                    name="centerCode"
                    value={formData.centerCode}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Assign Doctor *
                  </label>
                  {doctorLoading ? (
                    <div className="flex items-center text-blue-600 text-xs">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading doctors...
                    </div>
                  ) : doctorError ? (
                    <div className="text-red-600 text-xs">Failed to load doctors</div>
                  ) : (
                    <select
                      name="assignedDoctor"
                      value={formData.assignedDoctor}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs ${
                        touched.assignedDoctor && errors.assignedDoctor 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-200'
                      }`}
                      required
                    >
                      <option value="">Select Doctor</option>
                      {doctors && doctors.length > 0 && doctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>{doc.name}</option>
                      ))}
                    </select>
                  )}
                  {touched.assignedDoctor && errors.assignedDoctor && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.assignedDoctor}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={loading || hasFormErrors(errors)}
                className={`w-full text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-xs ${
                  loading || hasFormErrors(errors)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding Patient...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Add Patient
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPatient;
