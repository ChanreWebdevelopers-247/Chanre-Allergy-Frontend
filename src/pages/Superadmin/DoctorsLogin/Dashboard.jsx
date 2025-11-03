import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSuperAdminDoctorWorkingStats, fetchSuperAdminDoctorAssignedPatients } from '../../../features/superadmin/superAdminDoctorSlice';
import { User, FileText, MessageSquare, Clock, Eye, Building, Users, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { workingStats, assignedPatients, workingLoading, workingError } = useSelector(
    (state) => state.superAdminDoctors
  );

  useEffect(() => {
    dispatch(fetchSuperAdminDoctorWorkingStats());
    dispatch(fetchSuperAdminDoctorAssignedPatients());
  }, [dispatch]);

  // Calculate today's appointments
  const todaysAppointments = useMemo(() => {
    if (!assignedPatients || assignedPatients.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return assignedPatients.filter(patient => {
      if (!patient.appointmentTime) return false;
      const appointmentDate = new Date(patient.appointmentTime);
      appointmentDate.setHours(0, 0, 0, 0);
      return appointmentDate.getTime() === today.getTime();
    });
  }, [assignedPatients]);



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
      <h1 className="text-md font-bold text-gray-800 mb-8">Superadmin Consultant Dashboard</h1>
      
      {/* Stats Cards - Superadmin Consultant Focused */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-600">Today's Appointments</p>
              <p className="text-xl font-semibold text-gray-900">
                {todaysAppointments.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Scheduled for today</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-600">Total Patients</p>
              <p className="text-xl font-semibold text-gray-900">
                {workingStats?.totalPatients || assignedPatients?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-600">Awaiting Review</p>
              <p className="text-xl font-semibold text-gray-900">
                {workingStats?.awaitingReview || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-600">Reviewed by Me</p>
              <p className="text-xl font-semibold text-gray-900">
                {workingStats?.reviewedByMe || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-600">Total Lab Reports</p>
              <p className="text-xl font-semibold text-gray-900">
                {workingStats?.totalLabReports || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-teal-100">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-600">Center Doctors</p>
              <p className="text-xl font-semibold text-gray-900">
                {workingStats?.totalDoctors || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-600">Recent Reports</p>
              <p className="text-xl font-semibold text-gray-900">
                {workingStats?.recentReports || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Appointments Section */}
      {todaysAppointments.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800">Today's Appointments ({todaysAppointments.length})</h2>
            </div>
            <button
              onClick={() => navigate('/dashboard/superadmin/doctor/patients')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysAppointments.slice(0, 6).map((patient) => (
                <div key={patient._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">{patient.name}</h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Today
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 mb-3">
                    <p><span className="font-medium">Age:</span> {patient.age} years, {patient.gender}</p>
                    <p><span className="font-medium">Phone:</span> {patient.phone}</p>
                    {patient.appointmentTime && (
                      <p className="flex items-center text-blue-600">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(patient.appointmentTime).toLocaleTimeString('en-GB', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patient._id}`)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-xs"
                  >
                    View Patient Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Actions - Superadmin Doctor Focused */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Review Lab Reports</h3>
              <p className="text-gray-600 mb-4 text-xs">
                Review completed lab reports and provide expert feedback
              </p>
              <button
                onClick={() => navigate('/dashboard/superadmin/doctor/lab-reports')}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors text-xs"
              >
                Review Reports
              </button>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Patient Management</h3>
              <p className="text-gray-600 mb-4 text-xs">
                Access patient profiles, history, and medical records
              </p>
              <button
                onClick={() => navigate('/dashboard/superadmin/doctor/patients')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-xs"
              >
                Manage Patients
              </button>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <User className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Today's Schedule</h3>
              <p className="text-gray-600 mb-4 text-xs">
                View patients scheduled for consultation today
              </p>
              <button
                onClick={() => navigate('/dashboard/superadmin/doctor/patients')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-xs"
              >
                View Schedule
              </button>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Patients with Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">All Patients</h2>
          <button
            onClick={() => navigate('/dashboard/superadmin/doctor/patients')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </button>
        </div>
        <div className="p-6">
          {assignedPatients.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-xs">No assigned patients found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedPatients.slice(0, 5).map((patient) => {
                    const isToday = patient.appointmentTime ? (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const appointmentDate = new Date(patient.appointmentTime);
                      appointmentDate.setHours(0, 0, 0, 0);
                      return appointmentDate.getTime() === today.getTime();
                    })() : false;
                    
                    return (
                      <tr key={patient._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-xs">
                                {patient.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-xs font-medium text-gray-900">{patient.name}</div>
                              <div className="text-xs text-gray-500">{patient.age} years</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{patient.phone}</div>
                          <div className="text-xs text-gray-500">{patient.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {patient.appointmentTime ? (
                            <div className="text-xs">
                              <div className="text-gray-900">
                                {new Date(patient.appointmentTime).toLocaleDateString('en-GB')}
                              </div>
                              <div className="text-gray-500">
                                {new Date(patient.appointmentTime).toLocaleTimeString('en-GB', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not scheduled</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isToday ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Today
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              patient.isActive !== false 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {patient.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patient._id}`)}
                              className="text-blue-600 hover:text-blue-900 flex items-center text-xs"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
