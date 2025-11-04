import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FaHospitalAlt,
  FaChevronDown,
  FaUserShield,
  FaUsers,
  FaUserCheck,
  FaUserMd,
  FaUserTie,
  FaVials,
  FaHome,
  FaClock,
  FaCheckCircle,
  FaBell,
  FaComments,
  FaClipboardList,
  FaUserPlus,
  FaPlus,
  FaMoneyBillWave,
  FaCalculator,
  FaCalendarCheck,
  FaCog,
  FaCalendarAlt,
  FaFileMedical,
  FaStethoscope,
} from 'react-icons/fa';

export default function Sidebar(props) {
  const propUserInfo = props.userInfo;
  const location = useLocation();
  const [centerOpen, setCenterOpen] = useState(null); // can be 'doctors', 'receptionists', or 'lab'
  // Use prop if provided, otherwise Redux
  const reduxUserInfo = useSelector((state) => state.user?.userInfo);
  const authUser = useSelector((state) => state.auth?.user);
  const userInfo = propUserInfo || authUser || reduxUserInfo;
  const role = userInfo?.role || '';
  const isActive = (path) => location.pathname === path;

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen w-[18.5rem] bg-gradient-to-br from-slate-50 to-blue-50 border-r border-blue-100 shadow-lg text-slate-700 z-60 overflow-y-auto
        transition-all duration-500 ease-[cubic-bezier(0.77,0,0.175,1)]
        ${props.drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:z-40
      `}
      style={{
        transitionProperty: 'transform, box-shadow, background-color',
      }}
    >
        {/* Close button for drawer (sm only) */}
        <button
          className="absolute top-4 right-4 md:hidden bg-white border border-blue-100 rounded-full p-2 shadow focus:outline-none"
          onClick={() => props.setDrawerOpen && props.setDrawerOpen(false)}
          aria-label="Close sidebar"
        >
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="p-5 border-b border-blue-100">
          <h2 className="text-lg font-extrabold tracking-wide text-blue-500">
            ChanRe<span className="text-blue-400">Allergy</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 capitalize">
            {role ? `${role} Panel` : 'User Panel'}
          </p>
        </div>

        <nav className="flex flex-col p-4 space-y-1 text-xs">
          {role === 'superadmin' && (
            <>
              <SidebarLink
                to="/dashboard/superadmin/dashboard"
                label="Dashboard"
                icon={<FaHospitalAlt />}
                isActive={isActive("/dashboard/superadmin/dashboard")}
              />
              <SidebarGroup
                label="Centers"
                icon={<FaUserShield />}
                open={centerOpen === 'center'}
                toggle={() => setCenterOpen(centerOpen === 'center' ? null : 'center')}
                links={[
                  { to: "/dashboard/superadmin/centers/centerslist", label: "Manage Centers" },
                  { to: "/dashboard/superadmin/centers/addcenter", label: "Add Center" },
                  { to: "/dashboard/superadmin/centers/manageadmins", label: "Manage Admins" },
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Doctors"
                icon={<FaUserMd />}
                open={centerOpen === 'doctors'}
                toggle={() => setCenterOpen(centerOpen === 'doctors' ? null : 'doctors')}
                links={[
                  { to: "/dashboard/superadmin/doctors/superadmindoctorlist", label: "Manage Doctors" },
                  { to: "/dashboard/superadmin/doctors/addsuperadmindoctor", label: "Add Doctor" },
                ]}
                currentPath={location.pathname}
              />
             
              <SidebarGroup
                label="Laboratory"
                icon={<FaVials />}
                open={centerOpen === 'lab'}
                toggle={() => setCenterOpen(centerOpen === 'lab' ? null : 'lab')}
                links={[
                  { to: "/dashboard/superadmin/lab/labstafflist", label: "Lab Staff List" },
                  { to: "/dashboard/superadmin/lab/addlabstaff", label: "Add Lab Staff" },
                
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Test Requests"
                icon={<FaClipboardList />}
                open={centerOpen === 'testrequests'}
                toggle={() => setCenterOpen(centerOpen === 'testrequests' ? null : 'testrequests')}
                links={[
                  { to: "/dashboard/superadmin/test-requests", label: "View All Requests" },
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Billing"
                icon={<FaMoneyBillWave />}
                open={centerOpen === 'billing'}
                toggle={() => setCenterOpen(centerOpen === 'billing' ? null : 'billing')}
                links={[
                  { to: "/dashboard/superadmin/billing", label: "Billing Management" },
                  { to: "/dashboard/superadmin/consultation-fee-billing", label: "Doctor Fee" },
                  { to: "/dashboard/superadmin/billing-reports", label: "Billing Reports" },
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Session Management"
                icon={<FaUsers />}
                open={centerOpen === 'sessions'}
                toggle={() => setCenterOpen(centerOpen === 'sessions' ? null : 'sessions')}
                links={[
                  { to: "/dashboard/Superadmin/Sessions/ActiveSessions", label: "Active Sessions" },
                  { to: "/dashboard/Superadmin/Sessions/LoginHistory", label: "Login History" },
                ]}
                currentPath={location.pathname}
              />
              {/* <SidebarGroup
                label="Follow Ups"
                icon={<FaUserCheck />}
                open={centerOpen === 'followup'}
                toggle={() => setCenterOpen(centerOpen === 'followup' ? null : 'followup')}
                links={[
                  { to: "/dashboard/superadmin/followups/viewfollowuppatients", label: "View FollowUp Patients" },
                  { to: "/dashboard/superadmin/followups/managefollowup", label: "Manage FollowUp" },
    
                ]}
                currentPath={location.pathname}
              /> */}
            </>
          )}

          {role === 'doctor' && userInfo?.isSuperAdminStaff === true && (
            <>
              <SidebarLink
                to="/dashboard/superadmin/doctor/dashboard"
                label="Dashboard"
                icon={<FaHome />}
                isActive={isActive("/dashboard/superadmin/doctor/dashboard")}
              />
              <SidebarLink
                to="/dashboard/superadmin/doctor/my-patients"
                label="My Patients"
                icon={<FaUsers />}
                isActive={isActive("/dashboard/superadmin/doctor/my-patients") || isActive("/dashboard/superadmin/doctor/patients")}
              />
              <SidebarLink
                to="/dashboard/superadmin/doctor/appointments"
                label="Appointments"
                icon={<FaCalendarAlt />}
                isActive={isActive("/dashboard/superadmin/doctor/appointments")}
              />
              <SidebarLink
                to="/dashboard/superadmin/doctor/lab-reports"
                label="Review Lab Reports"
                icon={<FaVials />}
                isActive={isActive("/dashboard/superadmin/doctor/lab-reports")}
              />
            </>
          )}

          {role === 'centeradmin' && (
            
              <>
              <SidebarLink
                to="/dashboard/centeradmin/dashboard"
                label="Dashboard"
                icon={<FaHome />}
                isActive={isActive("/dashboard/centeradmin/dashboard")}
              />
              <SidebarGroup
                label="Doctors"
                icon={<FaUserMd />}
                open={centerOpen === 'doctors'}
                toggle={() => setCenterOpen(centerOpen === 'doctors' ? null : 'doctors')}
                links={[
                  { to: "/dashboard/centeradmin/doctors/adddoctor", label: "Add Doctor" },
                  { to: "/dashboard/centeradmin/doctors/doctorlist", label: "Doctors List" },
                  { to: "/dashboard/centeradmin/doctor-calendar", label: "Doctor Calendar" },
                  
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Receptionists"
                icon={<FaUserTie />}
                open={centerOpen === 'receptionists'}
                toggle={() => setCenterOpen(centerOpen === 'receptionists' ? null : 'receptionists')}
                links={[
                  { to: "/dashboard/centeradmin/receptionist/addreceptionist", label: "Add Receptionist" },
                  { to: "/dashboard/centeradmin/receptionist/managereceptionists", label: "Receptionist List" },
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Accountants"
                icon={<FaCalculator />}
                open={centerOpen === 'accountants'}
                toggle={() => setCenterOpen(centerOpen === 'accountants' ? null : 'accountants')}
                links={[
                  { to: "/dashboard/centeradmin/accountant/addaccountant", label: "Add Accountant" },
                  { to: "/dashboard/centeradmin/accountant/manageaccountants", label: "Accountant List" },
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Patients"
                icon={<FaVials />}
                open={centerOpen === 'patients'}
                toggle={() => setCenterOpen(centerOpen === 'patients' ? null : 'patients')}
                links={[
                  { to: "/dashboard/centeradmin/patients/addpatient", label: "Add patients" },
                  { to: "/dashboard/centeradmin/patients/patientlist", label: "Patients List" },
                  { to: "/dashboard/centeradmin/patients/managepatients", label: "Manage patients" },
                ]}
                currentPath={location.pathname}
              />
              <SidebarGroup
                label="Test Requests"
                icon={<FaClipboardList />}
                open={centerOpen === 'testrequests'}
                toggle={() => setCenterOpen(centerOpen === 'testrequests' ? null : 'testrequests')}
                links={[
                  { to: "/dashboard/centeradmin/test-requests", label: "View All Requests" },
                ]}
                currentPath={location.pathname}
              />
              <SidebarLink
                to="/dashboard/centeradmin/center-profile"
                label="Center Profile"
                icon={<FaHospitalAlt />}
                isActive={isActive("/dashboard/centeradmin/center-profile")}
              />
              <SidebarLink
                to="/dashboard/centeradmin/settings"
                label="Settings"
                icon={<FaCog />}
                isActive={isActive("/dashboard/centeradmin/settings")}
              />
              <SidebarLink
                to="/dashboard/centeradmin/appointment-approvals"
                label="Appointment Approvals"
                icon={<FaCalendarCheck />}
                isActive={isActive("/dashboard/centeradmin/appointment-approvals")}
              />
              <SidebarGroup
                label="Billing"
                icon={<FaMoneyBillWave />}
                open={centerOpen === 'billing'}
                toggle={() => setCenterOpen(centerOpen === 'billing' ? null : 'billing')}
                links={[
                  { to: "/dashboard/centeradmin/billing", label: "Billing Management" },
                  { to: "/dashboard/centeradmin/consultation-fee-billing", label: "Doctor Fee" },
                  { to: "/dashboard/centeradmin/billing-reports", label: "Billing Reports" },
                  { to: "/dashboard/centeradmin/billing-tracker", label: "Payment Tracker" },
                ]}
                currentPath={location.pathname}
              />

            </>
          )}

          {role === 'accountant' && (
            <>
              <SidebarLink
                to="/dashboard/accountant/dashboard"
                label="Dashboard"
                icon={<FaHome />}
                isActive={isActive("/dashboard/accountant/dashboard")}
              />
              <SidebarGroup
                label="Reports"
                icon={<FaClipboardList />}
                open={centerOpen === 'accountant-reports'}
                toggle={() => setCenterOpen(centerOpen === 'accountant-reports' ? null : 'accountant-reports')}
                links={[
                  { to: "/dashboard/accountant/reports/cancellation", label: "Cancellation Report" },
                  { to: "/dashboard/accountant/reports/cancellation-regenerated", label: "Cancellation & Regenerated" },
                  { to: "/dashboard/accountant/reports/category-wise", label: "Category Wise Report" },
                  { to: "/dashboard/accountant/reports/collection", label: "Collection Report" },
                  { to: "/dashboard/accountant/reports/discount", label: "Discount Report" },
                  { to: "/dashboard/accountant/reports/pending-bills", label: "Pending Bills Report" },
                  { to: "/dashboard/accountant/reports/refund", label: "Refund Report" },
                  { to: "/dashboard/accountant/reports/transactions-summary", label: "Transactions Summary" },
                  { to: "/dashboard/accountant/reports/revenue", label: "Revenue Report" },
                  { to: "/dashboard/accountant/reports/penalty-collection", label: "Penalty Collection" }
                ]}
                currentPath={location.pathname}
              />
              <SidebarLink
                to="/dashboard/accountant/profile"
                label="Profile"
                icon={<FaUserTie />}
                isActive={isActive("/dashboard/accountant/profile")}
              />
            </>
          )}

          {role === 'receptionist' && (
            <>
              <SidebarLink
                to="/dashboard/receptionist/dashboard"
                label="Dashboard"
                icon={<FaHome />}
                isActive={isActive("/dashboard/receptionist/dashboard")}
              />
             
              <SidebarLink to="/dashboard/receptionist/patients" label="Patient List" icon={<FaUsers />} isActive={isActive("/dashboard/receptionist/patients")} />

              <SidebarLink
                to="/dashboard/receptionist/add-patient"
                label="Add Patient"
                icon={<FaUserPlus />}
                isActive={isActive("/dashboard/receptionist/add-patient")}
              />
              <SidebarLink
                to="/dashboard/receptionist/billing"
                label="Billing"
                icon={<FaClipboardList />}
                isActive={isActive("/dashboard/receptionist/billing")}
              />
              <SidebarLink
                to="/dashboard/receptionist/consultation-billing"
                label="Consultation Fee"
                icon={<FaMoneyBillWave />}
                isActive={isActive("/dashboard/receptionist/consultation-billing")}
              />
              <SidebarLink
                to="/dashboard/receptionist/superconsultant-billing"
                label="Superconsultant Billing"
                icon={<FaUserCheck />}
                isActive={isActive("/dashboard/receptionist/superconsultant-billing")}
              />
              <SidebarLink
                to="/dashboard/receptionist/reassign-patient"
                label="Reassign Patient"
                icon={<FaUserCheck />}
                isActive={isActive("/dashboard/receptionist/reassign-patient")}
              />
              <SidebarLink
                to="/dashboard/receptionist/billing-tracker"
                label="Payment Tracker"
                icon={<FaMoneyBillWave />}
                isActive={isActive("/dashboard/receptionist/billing-tracker")}
              />
              <SidebarLink
                to="/dashboard/receptionist/transactions"
                label="Transaction History"
                icon={<FaClipboardList />}
                isActive={isActive("/dashboard/receptionist/transactions")}
              />
              <SidebarLink
                to="/dashboard/receptionist/appointment-approvals"
                label="Appointment Approvals"
                icon={<FaCalendarCheck />}
                isActive={isActive("/dashboard/receptionist/appointment-approvals")}
              />
              <SidebarLink
                to="/dashboard/receptionist/book-slot"
                label="Book Appointment Slot"
                icon={<FaCalendarCheck />}
                isActive={isActive("/dashboard/receptionist/book-slot")}
              />
            </>
          )}

          {role === 'doctor' && !userInfo?.isSuperAdminStaff && (
            <>
              <SidebarLink
                to="/dashboard/doctor/dashboard"
                label="Dashboard"
                icon={<FaHome />}
                isActive={isActive("/dashboard/doctor/dashboard")}
              />
              
              <SidebarLink
                to="/dashboard/doctor/patients"
                label="Patient List"
                icon={<FaUsers />}
                isActive={isActive("/dashboard/doctor/patients")}
              />
              <SidebarLink
                to="/dashboard/doctor/recently-assigned-patients"
                label="Recently Assigned"
                icon={<FaClock />}
                isActive={isActive("/dashboard/doctor/recently-assigned-patients")}
              />
              <SidebarLink
                to="/dashboard/doctor/add-patient"
                label="Add Patient"
                icon={<FaUserPlus />}
                isActive={isActive("/dashboard/doctor/add-patient")}
              />
              <SidebarLink
                to="/dashboard/doctor/test-requests"
                label="Test Requests"
                icon={<FaClipboardList />}
                isActive={isActive("/dashboard/doctor/test-requests")}
              />
              
              
              
              <SidebarLink
                to="/dashboard/doctor/notifications"
                label="Notifications"
                icon={<FaBell />}
                isActive={isActive("/dashboard/doctor/notifications")}
              />
              
              <SidebarLink
                to="/dashboard/doctor/feedback"
                label="Feedback"
                icon={<FaComments />}
                isActive={isActive("/dashboard/doctor/feedback")}
              />
            </>
          )}

          {(role === 'Lab Technician' || role === 'Lab Assistant' || role === 'Lab Manager' || role === 'lab technician' || role === 'lab assistant' || role === 'lab manager') && (
            <>
              <SidebarLink
                to="/dashboard/lab/dashboard"
                label="Dashboard"
                icon={<FaHome />}
                isActive={isActive("/dashboard/lab/dashboard")}
              />
              <SidebarLink
                to="/dashboard/lab/test-requests"
                label="Test Requests"
                icon={<FaVials />}
                isActive={isActive("/dashboard/lab/test-requests")}
              />
              <SidebarLink
                to="/dashboard/lab/pending-requests"
                label="Pending Requests"
                icon={<FaClock />}
                isActive={isActive("/dashboard/lab/pending-requests")}
              />
              <SidebarLink
                to="/dashboard/lab/completed-requests"
                label="Completed Tests"
                icon={<FaCheckCircle />}
                isActive={isActive("/dashboard/lab/completed-requests")}
              />
            </>
          )}
        </nav>
    </aside>
  );
}

function SidebarLink({ to, label, icon, isActive, onClick }) {
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all border-l-4 font-medium shadow-none
        ${isActive
          ? 'bg-blue-100 border-blue-500 text-blue-700'
          : 'hover:bg-blue-50 border-transparent text-slate-600'}
      `}
    >
      <span className={`text-xs ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

function SidebarGroup({ label, icon, open, toggle, links, currentPath }) {
  return (
    <div className="space-y-1">
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-slate-700 hover:bg-blue-50 font-medium"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-500">{icon}</span>
          {label}
        </div>
        <FaChevronDown
          className={`text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pl-10">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`block py-1 text-xs rounded font-medium
                ${currentPath === to
                  ? 'text-blue-700'
                  : 'text-slate-500 hover:text-blue-600'}
              `}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
