import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSuperAdminDoctorAssignedPatients } from '../../../features/superadmin/superAdminDoctorSlice';
import { Calendar, Clock, Search, Filter, User, Phone, Mail, Eye, FileText } from 'lucide-react';

const MyPatients = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { assignedPatients, workingLoading, workingError } = useSelector(
    (state) => state.superAdminDoctors
  );

  const [searchTerm, setSearchTerm] = useState('');
  // Initialize filter from URL parameter or default to 'all'
  const [filterType, setFilterType] = useState(() => {
    const filterParam = searchParams.get('filter');
    return filterParam === 'today' ? 'today' : filterParam === 'upcoming' ? 'upcoming' : filterParam === 'past' ? 'past' : 'all';
  });

  useEffect(() => {
    dispatch(fetchSuperAdminDoctorAssignedPatients());
  }, [dispatch]);

  // Sync filter state with URL parameter on mount and when URL changes
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'today' && filterType !== 'today') {
      setFilterType('today');
    } else if (filterParam === 'upcoming' && filterType !== 'upcoming') {
      setFilterType('upcoming');
    } else if (filterParam === 'past' && filterType !== 'past') {
      setFilterType('past');
    } else if (!filterParam && filterType !== 'all') {
      setFilterType('all');
    }
  }, [searchParams]);

  // Update URL when filter changes (but not on initial load from URL)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const currentFilter = filterType;
    
    if (currentFilter === 'all' && filterParam) {
      searchParams.delete('filter');
      setSearchParams(searchParams, { replace: true });
    } else if (currentFilter !== 'all' && filterParam !== currentFilter) {
      searchParams.set('filter', currentFilter);
      setSearchParams(searchParams, { replace: true });
    }
  }, [filterType]);

  // Filter patients based on search and appointment filter
  const filteredPatients = useMemo(() => {
    let filtered = assignedPatients || [];

    // Apply appointment filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterType === 'today') {
      filtered = filtered.filter(patient => {
        if (!patient.appointmentTime) return false;
        const appointmentDate = new Date(patient.appointmentTime);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() === today.getTime();
      });
    } else if (filterType === 'upcoming') {
      filtered = filtered.filter(patient => {
        if (!patient.appointmentTime) return false;
        const appointmentDate = new Date(patient.appointmentTime);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() > today.getTime();
      });
    } else if (filterType === 'past') {
      filtered = filtered.filter(patient => {
        if (!patient.appointmentTime) return false;
        const appointmentDate = new Date(patient.appointmentTime);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() < today.getTime();
      });
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(patient =>
        patient.name?.toLowerCase().includes(searchLower) ||
        patient.phone?.toLowerCase().includes(searchLower) ||
        patient.email?.toLowerCase().includes(searchLower) ||
        patient.uhId?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [assignedPatients, filterType, searchTerm]);

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">My Patients</h1>
        <div className="text-xs text-gray-500">
          Total: {filteredPatients.length} {filterType !== 'all' && `(${assignedPatients.length} total)`}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, phone, email, UH ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => {
                const newFilter = e.target.value;
                setFilterType(newFilter);
                // Update URL immediately
                const newParams = new URLSearchParams(searchParams);
                if (newFilter === 'all') {
                  newParams.delete('filter');
                } else {
                  newParams.set('filter', newFilter);
                }
                setSearchParams(newParams, { replace: true });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Patients</option>
              <option value="today">Today's Appointments</option>
              <option value="upcoming">Upcoming Appointments</option>
              <option value="past">Past Appointments</option>
            </select>
          </div>
        </div>
      </div>
      
      {workingLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            {searchTerm || filterType !== 'all' 
              ? 'No patients found matching your criteria.' 
              : 'No patients assigned to you yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Center
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => {
                  const isToday = patient.appointmentTime ? (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const appointmentDate = new Date(patient.appointmentTime);
                    appointmentDate.setHours(0, 0, 0, 0);
                    return appointmentDate.getTime() === today.getTime();
                  })() : false;

                  const isUpcoming = patient.appointmentTime ? (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const appointmentDate = new Date(patient.appointmentTime);
                    appointmentDate.setHours(0, 0, 0, 0);
                    return appointmentDate.getTime() > today.getTime();
                  })() : false;

                  return (
                    <tr key={patient._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-xs">
                              {patient.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-xs font-medium text-gray-900">{patient.name}</div>
                            <div className="text-xs text-gray-500">{patient.age} years, {patient.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">{patient.phone}</div>
                        {patient.email && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{patient.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {patient.appointmentTime ? (
                          <div className="text-xs">
                            <div className="text-gray-900 font-medium">
                              {new Date(patient.appointmentTime).toLocaleDateString('en-GB')}
                            </div>
                            <div className="text-blue-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(patient.appointmentTime).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {isToday && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Today
                              </span>
                            )}
                            {isUpcoming && !isToday && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Upcoming
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">{patient.centerId?.name || 'N/A'}</div>
                        {patient.centerId?.code && (
                          <div className="text-xs text-gray-500">{patient.centerId.code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">{patient.assignedDoctor?.name || 'Not assigned'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patient._id}`)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </button>
                          <button
                            onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patient._id}/history`)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            title="View History"
                          >
                            <FileText className="w-4 h-4" />
                            History
                          </button>
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
  );
};

export default MyPatients;
