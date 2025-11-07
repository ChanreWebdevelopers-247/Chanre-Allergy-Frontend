import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { loginUser } from '../features/auth/authThunks';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  const { user, loading, error } = useSelector((state) => state.auth);


  useEffect(() => {
    if (user && !hasNavigated.current) {
      hasNavigated.current = true;
      
      // Debug: Log user object to see what we're working with
      
      
      // Store centerId for centeradmin
      if (user.role && user.role.toLowerCase() === 'centeradmin' && user.centerId) {
        localStorage.setItem('centerId', user.centerId);
      }
      const role = user.role.toLowerCase();
      
      if (role === 'superadmin') {
        navigate('/dashboard/superadmin/dashboard');
      }
      else if (role === 'centeradmin') {
        navigate('/dashboard/centeradmin/dashboard');
      }
      else if (role === 'doctor') {
        // Check if it's a superadmin consultant
        if (user.isSuperAdminStaff === true) {
          navigate('/dashboard/superadmin/doctor/dashboard');
        } else {
          navigate('/dashboard/doctor/dashboard');
        }
      }
      else if (role === 'receptionist') {
        navigate('/dashboard/receptionist/dashboard');
      }
      else if (role === 'accountant') {
        navigate('/dashboard/accountant/dashboard');
      }
      else if (role === 'slitlab') {
        navigate('/dashboard/slit-lab/slit-therapy');
      }
      else if (role === 'lab technician' || role === 'lab assistant' || role === 'lab manager') {
        navigate('/dashboard/lab/dashboard');
      }
      else if (role === 'lab staff') {
        // Lab Staff can only be used for sample collection, not dashboard access
        toast.warning('Lab Staff accounts are for sample collection only. Please contact your administrator for dashboard access.');
        return;
      }
     
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(form));
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl space-y-7 border border-blue-100"
      >
        <h2 className="text-3xl font-extrabold text-center text-blue-500 mb-2 tracking-tight">Login</h2>

        <input
          name="emailOrUsername"
          type="text"
                          placeholder="Email or Username"
          value={form.emailOrUsername}
          onChange={handleChange}
          className="w-full p-3 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 text-blue-700 placeholder-blue-400 transition"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full p-3 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 text-blue-700 placeholder-blue-400 transition"
          required
        />


        {error && <p className="text-red-600 text-sm text-center font-medium">{error}</p>}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white py-3 rounded-xl shadow-lg font-semibold text-lg transition-all duration-200 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full bg-white border-2 border-blue-400 text-blue-500 hover:bg-blue-50 py-3 rounded-xl shadow-md font-semibold text-lg transition-all duration-200 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Return to Homepage
        </button>
      </form>
    </div>
  );
}
