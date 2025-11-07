import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchSuperAdminDoctorAssignedPatients, fetchSuperAdminDoctorPatients } from '../../../features/superadmin/superAdminDoctorSlice';
import { markPatientAsViewed } from '../../../services/api';
import { normalizePatientsArray } from '../../../utils/normalizePatientsArray';
import { getSuperConsultantAppointmentsWithMeta } from '../../../utils/superConsultantAppointments';
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  User, 
  Phone, 
  Mail, 
  Video, 
  PhoneCall, 
  FileText, 
  Stethoscope, 
  Eye,
  CheckCircle
} from 'lucide-react';

const Appointments = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    assignedPatients,
    patients: allPatients,
    workingLoading,
    workingError,
    patientsLoading,
  } = useSelector((state) => state.superAdminDoctors);
  const normalizedPatients = useMemo(
    () => normalizePatientsArray(assignedPatients),
    [assignedPatients]
  );
  const normalizedPatientFallback = useMemo(
    () => normalizePatientsArray(allPatients),
    [allPatients]
  );

  const myPatients = normalizedPatients.length > 0 ? normalizedPatients : normalizedPatientFallback;

  const getConsultationTypeValue = (patient) => {
    if (!patient) return 'other';

    const superconsultantBill = patient.billing?.find(
      (bill) => bill?.type === 'consultation' && bill?.consultationType?.startsWith('superconsultant_')
    );

    const rawType = (
      superconsultantBill?.consultationType ||
      patient.consultationType ||
      ''
    ).toLowerCase();

    if (rawType.includes('video')) return 'video';
    if (rawType.includes('audio')) return 'audio';
    if (rawType.includes('review')) return 'review_reports';
    if (rawType.includes('normal') || rawType.includes('consultation')) return 'normal';

    return 'other';
  };

  const appointmentEntries = useMemo(
    () => getSuperConsultantAppointmentsWithMeta(myPatients),
    [myPatients]
  );

  const totalWithAppointmentDates = useMemo(
    () =>
      appointmentEntries.filter(({ appointment }) => Boolean(appointment?.date)).length,
    [appointmentEntries]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'upcoming', 'past'
  const [consultFilter, setConsultFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'type'
  const [markingAsViewed, setMarkingAsViewed] = useState({}); // Track which patients are being marked as viewed

  useEffect(() => {
    dispatch(fetchSuperAdminDoctorAssignedPatients());
    dispatch(fetchSuperAdminDoctorPatients());
  }, [dispatch]);

  // Filter and sort appointments
  const appointments = useMemo(() => {
    let entries = appointmentEntries;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterType !== 'all') {
      entries = entries.filter(({ appointment }) => Boolean(appointment?.date));
    }

    if (filterType === 'today') {
      entries = entries.filter(({ appointment }) => {
        if (!appointment?.date) return false;
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() === today.getTime();
      });
    } else if (filterType === 'upcoming') {
      entries = entries.filter(({ appointment }) => {
        if (!appointment?.date) return false;
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() > today.getTime();
      });
    } else if (filterType === 'past') {
      entries = entries.filter(({ appointment }) => {
        if (!appointment?.date) return false;
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() < today.getTime();
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      entries = entries.filter(({ patient }) =>
        patient.name?.toLowerCase().includes(searchLower) ||
        String(patient.phone || '').toLowerCase().includes(searchLower) ||
        patient.email?.toLowerCase().includes(searchLower) ||
        patient.uhId?.toLowerCase().includes(searchLower)
      );
    }

    if (consultFilter !== 'all') {
      entries = entries.filter(({ patient }) => getConsultationTypeValue(patient) === consultFilter);
    }

    const sorted = [...entries];
    sorted.sort((aEntry, bEntry) => {
      const { patient: a, appointment: aptA } = aEntry;
      const { patient: b, appointment: aptB } = bEntry;

      if (sortBy === 'date') {
        const timeA = aptA?.date ? new Date(aptA.date).getTime() : Number.POSITIVE_INFINITY;
        const timeB = aptB?.date ? new Date(aptB.date).getTime() : Number.POSITIVE_INFINITY;
        return timeA - timeB;
      }

      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }

      if (sortBy === 'type') {
        const getTypeOrder = (patient) => {
          const type = getConsultationTypeValue(patient);
          switch (type) {
            case 'video':
              return 1;
            case 'audio':
              return 2;
            case 'review_reports':
              return 3;
            case 'normal':
              return 4;
            default:
              return 5;
          }
        };
        return getTypeOrder(a) - getTypeOrder(b);
      }

      return 0;
    });

    return sorted;
  }, [appointmentEntries, filterType, consultFilter, searchTerm, sortBy]);

  const getAppointmentTypeBadge = (patient) => {
    const typeValue = getConsultationTypeValue(patient);

    switch (typeValue) {
      case 'video':
        return { label: 'Video Consultation', icon: <Video className="w-3 h-3" />, color: 'bg-purple-100 text-purple-800' };
      case 'audio':
        return { label: 'Audio Consultation', icon: <PhoneCall className="w-3 h-3" />, color: 'bg-green-100 text-green-800' };
      case 'review_reports':
        return { label: 'Review Reports', icon: <FileText className="w-3 h-3" />, color: 'bg-orange-100 text-orange-800' };
      case 'normal':
        return { label: 'Normal Consultation', icon: <Stethoscope className="w-3 h-3" />, color: 'bg-blue-100 text-blue-800' };
      default:
        return { label: 'Consultation', icon: <Stethoscope className="w-3 h-3" />, color: 'bg-slate-100 text-slate-800' };
    }
  };

  // Get appointment status badge
  const getAppointmentStatus = (appointmentInfo, patient) => {
    const statusRaw = (
      appointmentInfo?.status ||
      patient.superConsultantAppointmentStatus ||
      patient.appointmentStatus ||
      ''
    ).toLowerCase();

    if (patient.viewedByDoctor || statusRaw === 'viewed') {
      return {
        label: 'Viewed',
        color: 'bg-purple-100 text-purple-800 border border-purple-300',
      };
    }

    if (['completed', 'done', 'finished'].includes(statusRaw)) {
      return {
        label: 'Completed',
        color: 'bg-green-100 text-green-700 border border-green-200',
      };
    }

    if (['cancelled', 'canceled'].includes(statusRaw)) {
      return {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-700 border border-red-200',
      };
    }

    if (['missed', 'no_show', 'no-show'].includes(statusRaw)) {
      return {
        label: 'Missed',
        color: 'bg-orange-100 text-orange-700 border border-orange-200',
      };
    }

    if (['confirmed', 'scheduled', 'approved'].includes(statusRaw)) {
      return {
        label: 'Scheduled',
        color: 'bg-blue-100 text-blue-700 border border-blue-200',
      };
    }

    if (!appointmentInfo?.date) {
      return {
        label: 'Not Scheduled',
        color: 'bg-gray-100 text-gray-600 border border-gray-200',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointmentInfo.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      return {
        label: 'Today',
        color: 'bg-blue-100 text-blue-800 border border-blue-300',
      };
    }

    if (appointmentDate.getTime() < today.getTime()) {
      return {
        label: 'Past',
        color: 'bg-gray-100 text-gray-800 border border-gray-200',
      };
    }

    return {
      label: 'Upcoming',
      color: 'bg-green-100 text-green-800 border border-green-200',
    };
  };

  // Handle mark as viewed
  const handleMarkAsViewed = async (patientId, patientName) => {
    try {
      setMarkingAsViewed(prev => ({ ...prev, [patientId]: true }));
      
      const response = await markPatientAsViewed(patientId);
      
      if (response.success) {
        toast.success(`Appointment for ${patientName} marked as viewed`);
        // Refresh the patient list
        dispatch(fetchSuperAdminDoctorAssignedPatients());
      } else {
        toast.error(response.message || 'Failed to mark appointment as viewed');
      }
    } catch (error) {
      console.error('Error marking appointment as viewed:', error);
      toast.error('Failed to mark appointment as viewed. Please try again.');
    } finally {
      setMarkingAsViewed(prev => ({ ...prev, [patientId]: false }));
    }
  };

  if (workingLoading || patientsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <div>
          <h1 className="text-lg font-bold text-gray-800">Appointments</h1>
          <p className="text-xs text-gray-500 mt-1">
            View and manage all scheduled appointments
          </p>
        </div>
        <div className="text-xs text-gray-500">
          Total: {appointments.length}{' '}
          {(filterType !== 'all' || consultFilter !== 'all') && `(${totalWithAppointmentDates} total)`}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Appointments</option>
              <option value="today">Today's Appointments</option>
              <option value="upcoming">Upcoming Appointments</option>
              <option value="past">Past Appointments</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="date">Date & Time</option>
              <option value="name">Patient Name</option>
              <option value="type">Appointment Type</option>
            </select>
          </div>

          {/* Consultation Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Consultation</span>
            <select
              value={consultFilter}
              onChange={(e) => setConsultFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="normal">Normal</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
              <option value="review_reports">Review Reports</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
      
      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            {searchTerm || filterType !== 'all' 
              ? 'No appointments found matching your criteria.' 
              : 'No appointments scheduled.'}
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
                    Appointment Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Center
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map(({ patient, appointment }) => {
                  const typeBadge = getAppointmentTypeBadge(patient);
                  const statusBadge = getAppointmentStatus(appointment, patient);
                  const appointmentDate = appointment?.date ? new Date(appointment.date) : null;
                  const isViewed =
                    patient.viewedByDoctor ||
                    patient.appointmentStatus === 'viewed' ||
                    appointment?.status === 'viewed';
                  const isMarking = markingAsViewed[patient._id];

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
                        {appointmentDate ? (
                          <div className="text-xs">
                            <div className="text-gray-900 font-medium">
                              {appointmentDate.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-blue-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {appointmentDate.toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 w-fit ${typeBadge.color}`}>
                          {typeBadge.icon}
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">{patient.phone}</div>
                        {patient.email && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{patient.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">{patient.centerId?.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isViewed && (
                            <button
                              onClick={() => handleMarkAsViewed(patient._id, patient.name)}
                              disabled={isMarking}
                              className="text-purple-600 hover:text-purple-900 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark as Viewed"
                            >
                              {isMarking ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Viewed
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patient._id}`)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patient._id}/profile`)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            title="View Profile"
                          >
                            <User className="w-4 h-4" />
                            Profile
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

export default Appointments;

