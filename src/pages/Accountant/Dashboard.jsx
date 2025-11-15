import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import AccountantLayout from './AccountantLayout';
import { fetchReceptionistBillingRequests } from '../../features/receptionist/receptionistThunks';
import API from '../../services/api';
import { 
  XCircle, 
  RotateCcw, 
  Tag, 
  DollarSign, 
  Percent, 
  Clock, 
  Undo2, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Building2,
  FileText,
  Receipt,
  Stethoscope,
  UserCheck,
  Wallet,
  CreditCard,
  CheckCircle,
  X,
  RefreshCw,
  Calendar,
  TrendingDown
} from 'lucide-react';
import { toast } from 'react-toastify';

const currencySymbol = '₹';

const AccountantDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { billingRequests } = useSelector((state) => state.receptionist);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    testRequest: {
      total: 0,
      pending: 0,
      generated: 0,
      paid: 0,
      revenue: 0,
      todayRevenue: 0
    },
    consultation: {
      total: 0,
      pending: 0,
      generated: 0,
      paid: 0,
      revenue: 0,
      todayRevenue: 0
    },
    superConsultant: {
      total: 0,
      pending: 0,
      generated: 0,
      paid: 0,
      revenue: 0,
      todayRevenue: 0
    },
    slitTherapy: {
      total: 0,
      pending: 0,
      generated: 0,
      paid: 0,
      revenue: 0,
      todayRevenue: 0
    }
  });

  const [overallStats, setOverallStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    totalBills: 0,
    pendingBills: 0,
    paidBills: 0,
    cancelledBills: 0,
    refundedAmount: 0
  });

  useEffect(() => {
    fetchAllBillingData();
  }, []);

  // Recalculate stats when billingRequests change
  useEffect(() => {
    if (billingRequests && billingRequests.length >= 0) {
      // Recalculate with current data
      calculateStats(billingRequests || [], [], [], []);
    }
  }, [billingRequests]);

  const fetchAllBillingData = async () => {
    setLoading(true);
    try {
      // Fetch Test Request Billing data
      const testRequestResult = await dispatch(fetchReceptionistBillingRequests()).unwrap();
      const testRequestData = testRequestResult || billingRequests || [];
      
      let consultationData = [];
      let superConsultantData = [];
      let slitTherapyData = [];

      // Fetch Consultation Billing data using the accountant bills-transactions endpoint
      // Note: Backend route is /api/accountants (plural)
      try {
        const consultationResponse = await API.get('/accountants/bills-transactions', {
          params: { billType: 'consultation', limit: 10000 } // Get all consultation bills
        });
        consultationData = consultationResponse.data?.bills || consultationResponse.data?.data || [];
      } catch (error) {
        console.warn('Failed to fetch consultation billing data:', error.message);
      }
      
      // Fetch Super Consultant Billing data using the accountant bills-transactions endpoint
      try {
        const superConsultantResponse = await API.get('/accountants/bills-transactions', {
          params: { billType: 'superconsultant', limit: 10000 } // Get all superconsultant bills
        });
        superConsultantData = superConsultantResponse.data?.bills || superConsultantResponse.data?.data || [];
      } catch (error) {
        console.warn('Failed to fetch super consultant billing data:', error.message);
      }
      
      // Fetch SLIT Therapy Billing data
      // Fetch all bills and filter for SLIT therapy on frontend to ensure we get the data
      try {
        const allBillsResponse = await API.get('/accountants/bills-transactions', {
          params: { limit: 10000 } // Fetch all bills without billType filter
        });
        const allBills = allBillsResponse.data?.bills || allBillsResponse.data?.data || [];
        
        // Filter for SLIT therapy bills by billType or description
        slitTherapyData = allBills.filter(bill => {
          const billType = bill.billType || '';
          const description = (bill.description || '').toLowerCase();
          return (
            billType === 'Slit Therapy' || 
            billType === 'slit_therapy' ||
            billType === 'SLIT Therapy' ||
            description.includes('slit therapy') ||
            description.includes('slit-therapy')
          );
        });
        
        console.log('Total bills fetched:', allBills.length);
        console.log('SLIT Therapy bills found:', slitTherapyData.length);
        if (slitTherapyData.length > 0) {
          console.log('Sample SLIT Therapy bill:', JSON.stringify(slitTherapyData[0], null, 2));
          console.log('SLIT Therapy revenue:', slitTherapyData.reduce((sum, b) => sum + (b.paidAmount || 0), 0));
        }
      } catch (error) {
        console.error('Failed to fetch SLIT therapy billing data:', error);
        console.error('Error details:', error.response?.data || error.message);
        slitTherapyData = [];
      }

      // Calculate statistics with fetched data
      calculateStats(testRequestData, consultationData, superConsultantData, slitTherapyData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load some billing statistics. Showing available data.');
      // Still calculate stats with available data
      calculateStats(billingRequests || [], [], [], []);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (testRequests, consultations, superConsultants, slitTherapies) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Test Request Billing Stats
    const testRequestStats = {
      total: testRequests.length,
      pending: testRequests.filter(r => r.status === 'Pending' || r.status === 'Billing_Pending').length,
      generated: testRequests.filter(r => r.status === 'Billing_Generated').length,
      paid: testRequests.filter(r => r.status === 'Billing_Paid' || r.status === 'Report_Sent' || r.status === 'Completed').length,
      revenue: testRequests.reduce((sum, r) => sum + (r.billing?.paidAmount || 0), 0),
      todayRevenue: testRequests.reduce((sum, r) => {
        const paymentDate = r.billing?.payments?.[0]?.createdAt || r.billing?.updatedAt;
        if (paymentDate && new Date(paymentDate) >= today) {
          return sum + (r.billing?.paidAmount || 0);
        }
        return sum;
      }, 0)
    };

    // Consultation Billing Stats
    // Data from /accountant/bills-transactions returns bills directly, not patient records
    const consultationStats = {
      total: consultations.length,
      pending: consultations.filter(c => {
        const status = c.status || c.billing?.status;
        return !status || status === 'pending';
      }).length,
      generated: consultations.filter(c => {
        const status = c.status || c.billing?.status;
        return status === 'generated';
      }).length,
      paid: consultations.filter(c => {
        const status = c.status || c.billing?.status;
        return status === 'paid' || status === 'verified';
      }).length,
      revenue: consultations.reduce((sum, c) => sum + (c.paidAmount || c.billing?.paidAmount || 0), 0),
      todayRevenue: consultations.reduce((sum, c) => {
        const paymentDate = c.paidAt || c.updatedAt || c.billing?.payments?.[0]?.createdAt || c.billing?.updatedAt;
        const paidAmount = c.paidAmount || c.billing?.paidAmount || 0;
        if (paymentDate && new Date(paymentDate) >= today && paidAmount > 0) {
          return sum + paidAmount;
        }
        return sum;
      }, 0)
    };

    // Super Consultant Billing Stats
    // Data from /accountant/bills-transactions returns bills directly, not patient records
    const superConsultantStats = {
      total: superConsultants.length,
      pending: superConsultants.filter(sc => {
        const status = sc.status || sc.billing?.status;
        return !status || status === 'pending';
      }).length,
      generated: superConsultants.filter(sc => {
        const status = sc.status || sc.billing?.status;
        return status === 'generated';
      }).length,
      paid: superConsultants.filter(sc => {
        const status = sc.status || sc.billing?.status;
        return status === 'paid' || status === 'verified';
      }).length,
      revenue: superConsultants.reduce((sum, sc) => sum + (sc.paidAmount || sc.billing?.paidAmount || 0), 0),
      todayRevenue: superConsultants.reduce((sum, sc) => {
        const paymentDate = sc.paidAt || sc.updatedAt || sc.billing?.payments?.[0]?.createdAt || sc.billing?.updatedAt;
        const paidAmount = sc.paidAmount || sc.billing?.paidAmount || 0;
        if (paymentDate && new Date(paymentDate) >= today && paidAmount > 0) {
          return sum + paidAmount;
        }
        return sum;
      }, 0)
    };

    // SLIT Therapy Billing Stats
    // Data from /accountants/bills-transactions returns bills directly
    const slitTherapyStats = {
      total: slitTherapies.length,
      pending: slitTherapies.filter(st => {
        const status = st.status || st.billing?.status || st.billingStatus;
        return !status || status === 'pending' || status === 'generated'; // Generated bills are also pending payment
      }).length,
      generated: slitTherapies.filter(st => {
        const status = st.status || st.billing?.status || st.billingStatus;
        return status === 'generated';
      }).length,
      paid: slitTherapies.filter(st => {
        const status = st.status || st.billing?.status || st.billingStatus;
        return status === 'paid' || status === 'verified';
      }).length,
      revenue: slitTherapies.reduce((sum, st) => {
        // Use paidAmount for revenue (amount actually collected)
        const paid = st.paidAmount || st.billing?.paidAmount || 0;
        return sum + paid;
      }, 0),
      todayRevenue: slitTherapies.reduce((sum, st) => {
        // Check multiple possible date fields for payment date
        const paymentDate = st.paidAt || st.date || st.billing?.paidAt || st.billing?.updatedAt || st.updatedAt || st.createdAt;
        const paidAmount = st.paidAmount || st.billing?.paidAmount || 0;
        if (paymentDate) {
          const paymentDateObj = new Date(paymentDate);
          if (paymentDateObj >= today && paidAmount > 0) {
            return sum + paidAmount;
          }
        }
        return sum;
      }, 0)
    };
    
    // Debug logging for SLIT therapy
    if (slitTherapies.length > 0) {
      console.log('SLIT Therapy Stats calculated:', {
        total: slitTherapyStats.total,
        pending: slitTherapyStats.pending,
        generated: slitTherapyStats.generated,
        paid: slitTherapyStats.paid,
        revenue: slitTherapyStats.revenue,
        todayRevenue: slitTherapyStats.todayRevenue
      });
    }

    setStats({
      testRequest: testRequestStats,
      consultation: consultationStats,
      superConsultant: superConsultantStats,
      slitTherapy: slitTherapyStats
    });

    // Overall Stats
    const totalRevenue = testRequestStats.revenue + consultationStats.revenue + superConsultantStats.revenue + slitTherapyStats.revenue;
    const todayRevenue = testRequestStats.todayRevenue + consultationStats.todayRevenue + superConsultantStats.todayRevenue + slitTherapyStats.todayRevenue;
    const totalBills = testRequestStats.total + consultationStats.total + superConsultantStats.total + slitTherapyStats.total;
    const pendingBills = testRequestStats.pending + consultationStats.pending + superConsultantStats.pending + slitTherapyStats.pending;
    const paidBills = testRequestStats.paid + consultationStats.paid + superConsultantStats.paid + slitTherapyStats.paid;
    
    const cancelledBills = [...testRequests, ...consultations, ...superConsultants, ...slitTherapies].filter(
      item => {
        const status = item.status || item.billing?.status || item.billingStatus;
        return status === 'cancelled';
      }
    ).length;
    
    const refundedAmount = [...testRequests, ...consultations, ...superConsultants, ...slitTherapies].reduce(
      (sum, item) => sum + (item.billing?.refundAmount || item.refundAmount || 0), 0
    );

    setOverallStats({
      totalRevenue,
      todayRevenue,
      totalBills,
      pendingBills,
      paidBills,
      cancelledBills,
      refundedAmount
    });
  };

  const reportLinks = [
    {
      title: 'Cancellation Report',
      description: 'View cancelled bills',
      icon: XCircle,
      color: 'from-red-500 to-red-600',
      route: '/dashboard/accountant/reports/cancellation'
    },
    {
      title: 'Cancellation & Regenerated',
      description: 'Bills cancelled and regenerated',
      icon: RotateCcw,
      color: 'from-orange-500 to-orange-600',
      route: '/dashboard/accountant/reports/cancellation-regenerated'
    },
    {
      title: 'Category Wise Report',
      description: 'Billing by bill type',
      icon: Tag,
      color: 'from-blue-500 to-blue-600',
      route: '/dashboard/accountant/reports/category-wise'
    },
    {
      title: 'Collection Report',
      description: 'Collected payments',
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      route: '/dashboard/accountant/reports/collection'
    },
    {
      title: 'Discount Report',
      description: 'Bills with discounts',
      icon: Percent,
      color: 'from-purple-500 to-purple-600',
      route: '/dashboard/accountant/reports/discount'
    },
    {
      title: 'Pending Bills',
      description: 'Unpaid bills',
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      route: '/dashboard/accountant/reports/pending-bills'
    },
    {
      title: 'Refund Report',
      description: 'Refunded transactions',
      icon: Undo2,
      color: 'from-pink-500 to-pink-600',
      route: '/dashboard/accountant/reports/refund'
    },
    {
      title: 'Transactions Summary',
      description: 'All transactions overview',
      icon: BarChart3,
      color: 'from-indigo-500 to-indigo-600',
      route: '/dashboard/accountant/reports/transactions-summary'
    },
    {
      title: 'Revenue Report',
      description: 'Revenue breakdown',
      icon: TrendingUp,
      color: 'from-cyan-500 to-cyan-600',
      route: '/dashboard/accountant/reports/revenue'
    },
    {
      title: 'Penalty Collection',
      description: 'Penalty amounts',
      icon: AlertTriangle,
      color: 'from-red-600 to-red-700',
      route: '/dashboard/accountant/reports/penalty-collection'
    }
  ];

  const billingTypes = [
    {
      title: 'Test Request Billing',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      stats: stats.testRequest,
      route: '/dashboard/accountant/billing'
    },
    {
      title: 'Consultation Billing',
      icon: Stethoscope,
      color: 'from-green-500 to-green-600',
      stats: stats.consultation,
      route: '/dashboard/accountant/consultation-billing'
    },
    {
      title: 'Super Consultant Billing',
      icon: UserCheck,
      color: 'from-purple-500 to-purple-600',
      stats: stats.superConsultant,
      route: '/dashboard/accountant/super-consultant-billing'
    },
    {
      title: 'SLIT Therapy Billing',
      icon: Receipt,
      color: 'from-orange-500 to-orange-600',
      stats: stats.slitTherapy,
      route: '/dashboard/accountant/slit-therapy-billing'
    }
  ];

  if (loading) {
    return (
      <AccountantLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading billing statistics...</p>
          </div>
        </div>
      </AccountantLayout>
    );
  }

  return (
    <AccountantLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Professional Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Accountant Dashboard
                </h1>
                <p className="text-slate-600 text-sm">
                  Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Overview of all billing operations and financial data.
                </p>
                {user?.centerId && (
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 shadow-sm">
                      <Building2 className="mr-2 h-4 w-4" />
                      {user?.centerId?.name || 'Center'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={fetchAllBillingData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-5 w-5 opacity-90" />
                <TrendingUp className="h-4 w-4 opacity-75" />
              </div>
              <div className="text-xs opacity-90 mb-1">Total Revenue</div>
              <div className="text-xl font-bold">{currencySymbol}{overallStats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-5 w-5 opacity-90" />
                <TrendingUp className="h-4 w-4 opacity-75" />
              </div>
              <div className="text-xs opacity-90 mb-1">Today's Revenue</div>
              <div className="text-xl font-bold">{currencySymbol}{overallStats.todayRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-5 w-5 opacity-90" />
                <BarChart3 className="h-4 w-4 opacity-75" />
              </div>
              <div className="text-xs opacity-90 mb-1">Total Bills</div>
              <div className="text-xl font-bold">{overallStats.totalBills}</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-md p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 opacity-90" />
                <AlertTriangle className="h-4 w-4 opacity-75" />
              </div>
              <div className="text-xs opacity-90 mb-1">Pending Bills</div>
              <div className="text-xl font-bold">{overallStats.pendingBills}</div>
            </div>
          </div>

          {/* Billing Type Statistics */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Billing Statistics by Type</h2>
                <p className="text-xs text-slate-600">Detailed breakdown of all billing operations</p>
              </div>
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {billingTypes.map((type, index) => {
                const IconComponent = type.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-sm border border-slate-200"
                  >
                    <div className={`bg-gradient-to-br ${type.color} p-3 text-white rounded-t-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="bg-white/20 rounded p-1.5">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-bold">{type.title}</h3>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Total Bills</div>
                          <div className="text-base font-bold text-slate-800">{type.stats.total}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Revenue</div>
                          <div className="text-base font-bold text-green-600">{currencySymbol}{type.stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Pending</div>
                          <div className="text-sm font-semibold text-yellow-600">{type.stats.pending}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Paid</div>
                          <div className="text-sm font-semibold text-green-600">{type.stats.paid}</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Today's Collection</span>
                          <span className="font-bold text-blue-600">{currencySymbol}{type.stats.todayRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="text-xl font-bold text-slate-800">{overallStats.paidBills}</div>
              </div>
              <div className="text-xs text-slate-600">Paid Bills</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <X className="h-5 w-5 text-red-500" />
                <div className="text-xl font-bold text-slate-800">{overallStats.cancelledBills}</div>
              </div>
              <div className="text-xs text-slate-600">Cancelled Bills</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <Undo2 className="h-5 w-5 text-pink-500" />
                <div className="text-xl font-bold text-slate-800">{currencySymbol}{overallStats.refundedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="text-xs text-slate-600">Refunded Amount</div>
            </div>
          </div>

          {/* Reports Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Financial Reports</h2>
                <p className="text-xs text-slate-600">View and analyze financial data and reports</p>
              </div>
              <BarChart3 className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {reportLinks.map((report, index) => {
                const IconComponent = report.icon;
                return (
                  <div
                    key={index}
                    onClick={() => navigate(report.route)}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden group border border-slate-200 hover:border-blue-300 transform hover:-translate-y-0.5"
                  >
                    <div className={`bg-gradient-to-br ${report.color} p-3 text-white relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-12 h-12 bg-white opacity-10 rounded-full -mr-6 -mt-6"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1.5">
                          <IconComponent className="h-4 w-4" />
                          <span className="text-xs font-medium opacity-80">Report</span>
                        </div>
                        <h3 className="text-xs font-bold mb-0.5">{report.title}</h3>
                        <p className="text-xs opacity-90 leading-tight">{report.description}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-gradient-to-r from-slate-50 to-white group-hover:from-blue-50 group-hover:to-white transition-all duration-300">
                      <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 flex items-center">
                        View Report
                        <span className="ml-auto group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AccountantLayout>
  );
};

export default AccountantDashboard;
