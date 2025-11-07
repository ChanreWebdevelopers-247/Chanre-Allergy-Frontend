import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchPatients } from "../../../features/patient/patientThunks";
import { useNavigate } from "react-router-dom";

export default function ManagePatients() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { patients = [], loading, error } = useSelector((state) => state.patient);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    dispatch(fetchPatients());
  }, [dispatch]);

  if (loading) return <div className="text-center py-10 text-xs">Loading patients...</div>;
  if (error) return <div className="text-center py-10 text-red-600 text-xs">{error}</div>;

  return (
    <div className="mt-6 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-md font-bold mb-8 text-gray-700 tracking-tight text-center sm:text-left">
          Manage Patients
        </h1>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <tr>
                <th className="px-6 py-4 text-gray-700 font-semibold text-left text-xs uppercase tracking-wider">S.No</th>
                <th className="px-6 py-4 text-gray-700 font-semibold text-left text-xs uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-gray-700 font-semibold text-left text-xs uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-gray-700 font-semibold text-left text-xs uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-gray-700 font-semibold text-left text-xs uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-gray-700 font-semibold text-left text-xs uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 text-gray-700 font-semibold text-center text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-500 text-sm">
                    No patients found.
                  </td>
                </tr>
              ) : (
                (patients || []).map((patient, index) => (
                  <tr key={patient?._id || index} className="hover:bg-blue-50/50 transition-colors duration-200">
                    <td className="px-6 py-4 text-xs font-medium text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 text-xs text-gray-900 font-medium">{patient?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{patient?.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{patient?.contact || patient?.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{patient?.age || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs text-gray-600 capitalize">{patient?.gender || 'N/A'}</td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/CenterAdmin/patients/AddTest/${patient?._id}`)}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Add Test
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/CenterAdmin/patients/AddHistory/${patient?._id}`)}
                        className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Add History
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/CenterAdmin/patients/profile/AddMedications/${patient?._id}`)}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Create / Print Prescription
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {patients.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm bg-white rounded-2xl shadow-lg">
              No patients found.
            </div>
          ) : (
            (patients || []).map((patient, index) => (
              <div key={patient?._id || index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{patient?.name || 'N/A'}</h3>
                      <p className="text-xs text-gray-500">{patient?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium text-gray-900">{patient?.contact || patient?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span>
                    <p className="font-medium text-gray-900">{patient?.age || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <p className="font-medium text-gray-900 capitalize">{patient?.gender || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => navigate(`/dashboard/CenterAdmin/patients/AddTest/${patient?._id}`)}
                    className="w-full px-4 py-3 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Add Test
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/CenterAdmin/patients/AddHistory/${patient?._id}`)}
                    className="w-full px-4 py-3 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Add History
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/CenterAdmin/patients/profile/AddMedications/${patient?._id}`)}
                    className="w-full px-4 py-3 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Create / Print Prescription
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
