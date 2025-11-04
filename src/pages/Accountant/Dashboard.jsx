import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
  Building2
} from 'lucide-react';

const AccountantDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800 mb-1">
            Accountant Dashboard
          </h1>
          <p className="text-xs text-slate-600">
            Welcome back, {user?.name}. Access all financial reports and analytics.
          </p>
          {user?.centerId && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Building2 className="mr-1 h-3 w-3" />
                {user?.centerId?.name || 'Center'}
              </span>
            </div>
          )}
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {reportLinks.map((report, index) => {
            const IconComponent = report.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(report.route)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group border border-gray-100"
              >
                <div className={`bg-gradient-to-br ${report.color} p-4 text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className="h-5 w-5" />
                    <span className="text-xs font-medium opacity-80">Report</span>
                  </div>
                  <h3 className="text-sm font-bold mb-1">{report.title}</h3>
                  <p className="text-xs opacity-90 leading-tight">{report.description}</p>
                </div>
                <div className="p-3 bg-gray-50 group-hover:bg-gray-100 transition-colors">
                  <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600">
                    View Report →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;
