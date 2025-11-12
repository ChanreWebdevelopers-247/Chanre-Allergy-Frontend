import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchReceptionistPatients } from "../../features/receptionist/receptionistThunks";
import ReceptionistLayout from './ReceptionistLayout';
import { 
  Users, 
  UserPlus, 
  FileText, 
  Calendar,
  Plus,
  Eye,
  Phone,
  Mail,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TestTube,
  MapPin,
  UserCheck,
  Activity,
  Building,
  IndianRupee
} from 'lucide-react';

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { patients, loading, error, stats } = useSelector((state) => state.receptionist);

  useEffect(() => {
    dispatch(fetchReceptionistPatients());
  }, [dispatch]);

  // Helper functions to get patient status information
  const getPatientStatus = (patient) => {
    if (!patient) return 'Unknown';
    
    // Check consultation fee payment
    const hasConsultationFee = patient.billing && patient.billing.some(bill => 
      bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')
    );
    const hasPaidConsultationFee = hasConsultationFee && patient.billing.some(bill => 
      (bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')) && 
      (bill.status === 'paid' || bill.status === 'completed')
    );
    
    // Check if patient has tests
    const hasTests = patient.tests && patient.tests.length > 0;
    const hasPendingTests = hasTests && patient.tests.some(test => 
      test.status === 'pending' || test.status === 'in-progress'
    );
    const hasCompletedTests = hasTests && patient.tests.some(test => 
      test.status === 'completed'
    );
    
    // Check other billing status (excluding consultation)
    const hasOtherBilling = patient.billing && patient.billing.some(bill => 
      bill.type !== 'consultation' && !bill.description?.toLowerCase().includes('consultation')
    );
    const hasPendingOtherPayment = hasOtherBilling && patient.billing.some(bill => 
      bill.type !== 'consultation' && 
      !bill.description?.toLowerCase().includes('consultation') &&
      (bill.status === 'pending' || bill.status === 'unpaid')
    );
    const hasPaidOtherBills = hasOtherBilling && patient.billing.some(bill => 
      bill.type !== 'consultation' && 
      !bill.description?.toLowerCase().includes('consultation') &&
      (bill.status === 'paid' || bill.status === 'completed')
    );
    
    // Determine overall status based on consultation fee priority
    if (!hasPaidConsultationFee) {
      if (hasConsultationFee) return 'Consultation Fee Pending';
      return 'Consultation Fee Required';
    }
    
    // After consultation fee is paid, check other statuses
    if (hasPendingTests && hasPendingOtherPayment) return 'Tests & Payment Pending';
    if (hasPendingTests) return 'Tests Pending';
    if (hasPendingOtherPayment) return 'Payment Pending';
    if (hasCompletedTests && hasPaidOtherBills) return 'Completed';
    if (hasCompletedTests) return 'Tests Done';
    if (hasPaidOtherBills) return 'Payment Done';
    
    return 'Consultation Paid - Ready for Tests';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Tests Done': return 'text-blue-600 bg-blue-100';
      case 'Payment Done': return 'text-purple-600 bg-purple-100';
      case 'Tests Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Payment Pending': return 'text-orange-600 bg-orange-100';
      case 'Tests & Payment Pending': return 'text-red-600 bg-red-100';
      case 'Consultation Fee Required': return 'text-red-600 bg-red-100';
      case 'Consultation Fee Pending': return 'text-orange-600 bg-orange-100';
      case 'Consultation Paid - Ready for Tests': return 'text-green-600 bg-green-100';
      case 'New Patient': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4" />;
      case 'Tests Done': return <TestTube className="h-4 w-4" />;
      case 'Payment Done': return <IndianRupee className="h-4 w-4" />;
      case 'Tests Pending': return <Clock className="h-4 w-4" />;
      case 'Payment Pending': return <AlertCircle className="h-4 w-4" />;
      case 'Tests & Payment Pending': return <AlertCircle className="h-4 w-4" />;
      case 'Consultation Fee Required': return <AlertCircle className="h-4 w-4" />;
      case 'Consultation Fee Pending': return <Clock className="h-4 w-4" />;
      case 'Consultation Paid - Ready for Tests': return <CheckCircle className="h-4 w-4" />;
      case 'New Patient': return <UserCheck className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  // Calculate enhanced stats
  const getEnhancedStats = () => {
    const totalPatients = patients.length;
    const todayPatients = patients.filter(p => {
      const today = new Date().toDateString();
      return new Date(p.createdAt).toDateString() === today;
    }).length;
    
    const consultationFeeRequired = patients.filter(p => {
      const hasConsultationFee = p.billing && p.billing.some(bill => 
        bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')
      );
      const hasPaidConsultationFee = hasConsultationFee && p.billing.some(bill => 
        (bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')) && 
        (bill.status === 'paid' || bill.status === 'completed')
      );
      return !hasPaidConsultationFee;
    }).length;
    
    const consultationFeePending = patients.filter(p => {
      const hasConsultationFee = p.billing && p.billing.some(bill => 
        bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')
      );
      const hasPaidConsultationFee = hasConsultationFee && p.billing.some(bill => 
        (bill.type === 'consultation' || bill.description?.toLowerCase().includes('consultation')) && 
        (bill.status === 'paid' || bill.status === 'completed')
      );
      return hasConsultationFee && !hasPaidConsultationFee;
    }).length;
    
    const pendingTests = patients.filter(p => 
      p.tests && p.tests.some(test => 
        test.status === 'pending' || test.status === 'in-progress'
      )
    ).length;
    
    const completedTests = patients.filter(p => 
      p.tests && p.tests.some(test => test.status === 'completed')
    ).length;
    
    const pendingPayments = patients.filter(p => 
      p.billing && p.billing.some(bill => 
        bill.type !== 'consultation' && 
        !bill.description?.toLowerCase().includes('consultation') &&
        (bill.status === 'pending' || bill.status === 'unpaid')
      )
    ).length;
    
    const completedPayments = patients.filter(p => 
      p.billing && p.billing.some(bill => 
        bill.type !== 'consultation' && 
        !bill.description?.toLowerCase().includes('consultation') &&
        (bill.status === 'paid' || bill.status === 'completed')
      )
    ).length;
    
    const newPatients = patients.filter(p => 
      (!p.tests || p.tests.length === 0) && 
      (!p.billing || p.billing.length === 0)
    ).length;
    
    return {
      totalPatients,
      todayPatients,
      consultationFeeRequired,
      consultationFeePending,
      pendingTests,
      completedTests,
      pendingPayments,
      completedPayments,
      newPatients
    };
  };

  const enhancedStats = getEnhancedStats();

  const quickActions = [
    {
      title: 'View Patients',
      description: 'Browse patient profiles',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      onClick: () => navigate('/dashboard/receptionist/patients')
    },
    {
      title: 'Consultation Fee',
      description: 'Collect doctor consultation fees',
      icon: <IndianRupee className="h-6 w-6" />,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      onClick: () => navigate('/dashboard/receptionist/consultation-billing')
    },
    {
      title: 'Billing',
      description: 'Generate invoices and mark payments',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      onClick: () => navigate('/dashboard/receptionist/billing')
    }
  ];

  const recentPatients = patients.slice(0, 5);

  if (loading) {
    return (
      <ReceptionistLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading dashboard...</p>
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
              Welcome back, {user?.name}
            </h1>
            <p className="text-slate-600 text-sm">
              Manage your patients and daily tasks
            </p>
            {user?.centerId && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <Building className="mr-1 h-4 w-4" />
                  {user?.centerId?.name || 'Center'}
                </span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Total Patients</p>
                  <p className="text-md font-bold text-slate-800">{enhancedStats.totalPatients}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Today's Patients</p>
                  <p className="text-md font-bold text-slate-800">{enhancedStats.todayPatients}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Pending Tests</p>
                  <p className="text-md font-bold text-slate-800">{enhancedStats.pendingTests}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Pending Payments</p>
                  <p className="text-md font-bold text-slate-800">{enhancedStats.pendingPayments}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Completed Tests</p>
                  <p className="text-md font-bold text-slate-800">{enhancedStats.completedTests}</p>
                </div>
                <TestTube className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">Paid Bills</p>
                  <p className="text-md font-bold text-slate-800">{enhancedStats.completedPayments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs font-medium">New Patients</p>
                  <p className="text-md font-bold text-slate-800">{enhancedStats.newPatients}</p>
                </div>
                <UserCheck className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 mb-8">
            <div className="p-6 border-b border-blue-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                <Plus className="h-5 w-5 mr-2 text-blue-500" />
                Quick Actions
              </h2>
              <p className="text-slate-600 mt-1 text-sm">
                Common tasks and shortcuts
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`${action.color} ${action.hoverColor} text-white p-6 rounded-lg transition-colors flex flex-col items-center gap-4 h-32 justify-center`}
                  >
                    {action.icon}
                    <div className="text-center">
                      <h3 className="font-semibold text-base">{action.title}</h3>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Patients */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-500" />
                    Recent Patients
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Latest registered patients
                  </p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/receptionist/patients')}
                  className="text-blue-500 hover:text-blue-600 font-medium text-sm"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              {recentPatients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-slate-600 mb-2">No Patients Yet</h3>
                  <p className="text-slate-500 mb-4 text-xs">Start by adding your first patient.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentPatients.map((patient) => {
                    const status = getPatientStatus(patient);
                    const statusColor = getStatusColor(status);
                    const statusIcon = getStatusIcon(status);
                    
                    return (
                      <div
                        key={patient._id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-800 text-sm">{patient.name}</h3>
                              <div className="flex items-center gap-4 text-xs text-slate-600">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {patient.email || 'No email'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {patient.phone || 'No phone'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/dashboard/receptionist/profile/${patient._id}`)}
                            className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </div>
                        
                        {/* Status and Details Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColor}`}>
                              {statusIcon}
                              {status}
                            </span>
                            
                            {/* Test Status */}
                            {patient.tests && patient.tests.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-slate-600">
                                <TestTube className="h-3 w-3" />
                                {patient.tests.filter(t => t.status === 'completed').length}/{patient.tests.length} Tests Done
                              </span>
                            )}
                            
                            {/* Billing Status */}
                            {patient.billing && patient.billing.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-slate-600">
                                <IndianRupee className="h-3 w-3" />
                                {patient.billing.filter(b => b.status === 'paid').length}/{patient.billing.length} Bills Paid
                              </span>
                            )}
                          </div>
                          
                          {/* UH ID */}
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {patient.uhId || 'No UH ID'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ReceptionistLayout>
  );
} 