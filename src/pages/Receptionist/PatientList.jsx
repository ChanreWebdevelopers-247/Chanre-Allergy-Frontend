import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ReceptionistLayout from './ReceptionistLayout';
import { fetchReceptionistPatients } from '../../features/receptionist/receptionistThunks';
import { 
  Search, 
  Plus, 
  Users, 
  User, 
  Eye, 
  Mail,
  Phone,
  Calendar,
  UserCheck,
  MapPin,
  Edit,
  Clock,
  CalendarDays,
  UserPlus
} from 'lucide-react';
import API from '../../services/api';
import { formatRemainingTime } from '../../utils/patientPermissions';

export default function ReceptionistPatientList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { patients, loading, error } = useSelector((state) => state.receptionist);
  
  console.log('Redux state:', { patients, loading, error });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(4);

  // Removed reassign and revisit modal states

  // Function to check if patient can be edited (within 24 hours of creation)
  const canEditPatient = (patient) => {
    if (!patient || !patient.createdAt) return false;
    
    const createdAt = new Date(patient.createdAt);
    const timeDifference = currentTime - createdAt;
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    
    return hoursDifference <= 24;
  };

  // Function to get remaining time for editing
  const getRemainingEditTime = (patient) => {
    if (!patient || !patient.createdAt) return null;
    
    const createdAt = new Date(patient.createdAt);
    const timeDifference = currentTime - createdAt;
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    
    if (hoursDifference > 24) return null;
    
    const remainingHours = Math.floor(24 - hoursDifference);
    const remainingMinutes = Math.floor((24 - hoursDifference - remainingHours) * 60);
    
    return { hours: remainingHours, minutes: remainingMinutes };
  };


  useEffect(() => {
  
    dispatch(fetchReceptionistPatients());
  }, [dispatch]);

  // Removed reassign and revisit functions

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
   
    
    const filtered = patients.filter(patient =>
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm) ||
      patient.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.uhId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    setFilteredPatients(filtered);
  }, [patients, searchTerm]);



  const getGenderStats = () => {
    const maleCount = patients.filter(p => p.gender === 'male').length;
    const femaleCount = patients.filter(p => p.gender === 'female').length;
    const otherCount = patients.filter(p => p.gender === 'other').length;
    return { maleCount, femaleCount, otherCount };
  };

  const genderStats = getGenderStats();

  // Pagination functions
  const getTotalPages = () => {
    return Math.ceil(filteredPatients.length / recordsPerPage);
  };

  const getCurrentData = () => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredPatients.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
  };

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <ReceptionistLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading patients...</p>
            </div>
          </div>
        </div>
      </ReceptionistLayout>
    );
  }

  if (error) {
    return (
      <ReceptionistLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </ReceptionistLayout>
    );
  }

  return (
    <ReceptionistLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-md font-bold text-slate-800 mb-2">
              Patient List
            </h1>
            <p className="text-slate-600">
              View and manage all patients in your center
            </p>
          </div>

          {/* Success Message */}
          

          {/* Search and Add Button */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 mb-6">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patients by name, email, phone, UH ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => navigate('/dashboard/receptionist/add-patient')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Patient
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Total Patients</p>
                  <p className="text-md font-bold text-slate-800">{patients.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Male Patients</p>
                  <p className="text-md font-bold text-slate-800">{genderStats.maleCount}</p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Female Patients</p>
                  <p className="text-md font-bold text-slate-800">{genderStats.femaleCount}</p>
                </div>
                <User className="h-8 w-8 text-pink-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Other</p>
                  <p className="text-md font-bold text-slate-800">{genderStats.otherCount}</p>
                </div>
                <User className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Patients Table */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Age & Gender
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Registration Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Assigned Doctor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                       Edit Time Remaining
                     </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xs font-medium text-slate-600 mb-2">No Patients Found</h3>
                        <p className="text-slate-500 mb-4">
                          {searchTerm ? 'No patients match your search.' : 'Get started by adding your first patient.'}
                        </p>
                        {!searchTerm && (
                          <button
                            onClick={() => navigate('/dashboard/receptionist/add-patient')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                          >
                            <Plus className="h-4 w-4" />
                            Add Patient
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    getCurrentData().map((patient, index) => {
                      const globalIndex = (currentPage - 1) * recordsPerPage + index;
                      return (
                      <tr key={patient._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="ml-4">
                              <div className="text-xs font-medium text-slate-900">
                                #{globalIndex + 1} {patient.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                UH ID: {patient.uhId || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center text-xs text-slate-900">
                              <Mail className="h-3 w-3 mr-2 text-slate-400" />
                              {patient.email || 'No email'}
                            </div>
                            <div className="flex items-center text-xs text-slate-500">
                              <Phone className="h-3 w-3 mr-2 text-slate-400" />
                              {patient.phone || patient.contact || 'No phone'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-xs text-slate-900">
                            <Calendar className="h-3 w-3 mr-2 text-slate-400" />
                            {patient.age} years, {patient.gender}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-xs text-slate-900">
                            <CalendarDays className="h-3 w-3 mr-2 text-slate-400" />
                            <div>
                              <div className="font-medium">
                                {new Date(patient.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-slate-500 text-xs">
                                {new Date(patient.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-slate-900">
                            <UserCheck className="h-3 w-3 mr-2 text-slate-400" />
                            {patient.assignedDoctor?.name || (
                              <span className="text-yellow-600 font-medium">Not assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start text-xs text-slate-900 max-w-[220px]">
                            <MapPin className="h-3 w-3 mr-2 mt-0.5 text-slate-400" />
                            <span className="break-words whitespace-normal leading-snug">
                              {patient.address || 'No address'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                                                         <span className={`font-medium ${
                               formatRemainingTime(patient).includes('Expired') 
                                 ? 'text-red-600' 
                                 : 'text-green-600'
                             }`}>
                               {formatRemainingTime(patient)}
                             </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {patient._id ? (
                              <>
                                <button
                                  onClick={() => navigate(`/dashboard/receptionist/profile/${patient._id}`)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                                  title="View patient profile"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </button>
                                
                                {canEditPatient(patient) ? (
                                  <button
                                    onClick={() => navigate(`/dashboard/receptionist/edit-patient/${patient._id}`)}
                                    className="bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                                    title="Edit patient"
                                  >
                                    <Edit className="h-3 w-3" />
                                    Edit
                                  </button>
                                ) : (
                                  <div className="bg-gray-50 text-gray-500 px-2 py-1 rounded-lg font-medium flex items-center gap-1" title="Edit expired">
                                    <Clock className="h-3 w-3" />
                                    Expired
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400 px-2 py-1 rounded-lg bg-slate-50 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                No Access
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                                 </tbody>
               </table>
           </div>
           
           {/* Pagination Controls */}
           {filteredPatients.length > 0 && (
             <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-4">
                   <div className="text-sm text-gray-600">
                     Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredPatients.length)} of {filteredPatients.length} results
                   </div>
                   <div className="flex items-center space-x-2">
                     <span className="text-sm text-gray-600">Show:</span>
                     <select
                       value={recordsPerPage}
                       onChange={(e) => handleRecordsPerPageChange(e.target.value)}
                       className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     >
                       <option value={4}>4</option>
                       <option value={5}>5</option>
                       <option value={10}>10</option>
                       <option value={20}>20</option>
                     </select>
                     <span className="text-sm text-gray-600">per page</span>
                   </div>
                 </div>
                 
                 <div className="flex items-center space-x-4">
                   <div className="text-sm text-gray-600">
                     Page {currentPage} of {getTotalPages()}
                   </div>
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={() => handlePageChange(currentPage - 1)}
                       disabled={currentPage === 1}
                       className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
                     >
                       Previous
                     </button>
                     
                     <button
                       onClick={() => handlePageChange(currentPage)}
                       className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white border border-blue-600"
                     >
                       {currentPage}
                     </button>
                     
                     <button
                       onClick={() => handlePageChange(currentPage + 1)}
                       disabled={currentPage === getTotalPages()}
                       className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
                     >
                       Next
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           )}

          {/* Removed reassign and revisit modals */}
        </div>
      </div>
            </ReceptionistLayout>
  );
}
