import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, UserCheck, Mail, Phone, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchSlitLabStaff,
  deleteSlitLabStaff
} from '../../../features/superadmin/superadminThunks';
import { resetSuperadminState } from '../../../features/superadmin/superadminSlice';

export default function SlitLabStaffList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    slitLabStaff = [],
    loading,
    deleteSlitLabStaffSuccess,
    addSlitLabStaffSuccess,
    updateSlitLabStaffSuccess
  } = useSelector((state) => state.superadmin);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);

  useEffect(() => {
    dispatch(fetchSlitLabStaff());
  }, [dispatch]);

  useEffect(() => {
    if (addSlitLabStaffSuccess) {
      toast.success('SLIT lab staff member created successfully');
      dispatch(resetSuperadminState());
      dispatch(fetchSlitLabStaff());
    }
  }, [addSlitLabStaffSuccess, dispatch]);

  useEffect(() => {
    if (updateSlitLabStaffSuccess) {
      toast.success('SLIT lab staff member updated successfully');
      dispatch(resetSuperadminState());
      dispatch(fetchSlitLabStaff());
    }
  }, [updateSlitLabStaffSuccess, dispatch]);

  useEffect(() => {
    if (deleteSlitLabStaffSuccess) {
      toast.success('SLIT lab staff member removed');
      dispatch(resetSuperadminState());
    }
  }, [deleteSlitLabStaffSuccess, dispatch]);

  const totalPages = Math.ceil(slitLabStaff.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStaff = slitLabStaff.slice(startIndex, endIndex);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this SLIT lab staff member?')) {
      dispatch(deleteSlitLabStaff(id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">SLIT Lab Staff</h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Manage specialists responsible for SLIT therapy preparation and delivery.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 mb-6">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                Team Overview
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Total Staff: <span className="font-semibold text-blue-600">{slitLabStaff.length}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/Superadmin/Lab/AddSlitLabStaff')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 sm:px-5 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Add SLIT Lab Staff
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center text-slate-600">
              <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-3" />
              Loading SLIT lab staff...
            </div>
          ) : currentStaff.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No SLIT lab staff records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Credentials</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {currentStaff.map((staff) => (
                    <tr key={staff._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-800">{staff.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs text-slate-600 gap-1">
                          <span className="flex items-center gap-2"><Mail className="h-3 w-3" /> {staff.email?.replace(/^deleted-\d+-/, '')}</span>
                          <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> {staff.phone || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div>Username: {staff.username || '—'}</div>
                        <div>Status: <span className="font-medium capitalize">{staff.status || 'active'}</span></div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/Superadmin/Lab/EditSlitLabStaff/${staff._id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(staff._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {slitLabStaff.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-blue-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-600">
            <div>
              Showing {startIndex + 1} to {Math.min(endIndex, slitLabStaff.length)} of {slitLabStaff.length} results
            </div>
            <div className="flex items-center gap-2">
              <label>Show: </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded-md px-2 py-1"
              >
                {[5, 7, 10, 15, 20].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <span>per page</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md border ${currentPage === 1 ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                Prev
              </button>
              <span className="px-2">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md border ${currentPage === totalPages ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

