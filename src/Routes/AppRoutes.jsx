import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import Home from '../pages/Homepage';
import BookAppointment from '../pages/BookAppointment';
import CheckAppointment from '../pages/CheckAppointment';
import Contact from '../pages/Contact';
import About from '../pages/About';
import DashboardLayout from '../layouts/DashboardLayout';
import PrivateRoute from '../components/PrivateRoute';
import ErrorBoundary from '../components/ErrorBoundary';
import AccountantRouteProtection from '../components/AccountantRouteProtection';

// Superadmin Pages
import SuperadminDashboard from '../pages/Superadmin/Dashboard';
import SuperadminBilling from '../pages/Superadmin/Billing';
import SuperadminConsultationFeeBilling from '../pages/Superadmin/ConsultationFeeBilling';
import BillingDetails from '../pages/Superadmin/BillingDetails';
import CenterAdminBillingDetails from '../pages/CenterAdmin/BillingDetails';
import SuperadminBillingReports from '../pages/Superadmin/BillingReports';
import CentersList from '../pages/Superadmin/Centers/CentersList';
import AddCenter from '../pages/Superadmin/Centers/AddCenter';
import EditCenter from '../pages/Superadmin/Centers/EditCenter';
import ViewCenterInfo from '../pages/Superadmin/Centers/ViewCenterInfo';
import ManageAdmins from '../pages/Superadmin/Centers/ManageAdmins';
import EditCenterAdmin from '../pages/Superadmin/Centers/EditCenterAdmin';
import ViewFollowUpPatients from '../pages/Superadmin/Followups/ViewFollowUpPatients';
import ViewPatientFollowUps from '../pages/Superadmin/Followups/ViewPatientFollowUps';
import ManageFollowUp from '../pages/Superadmin/Followups/ManageFollowUp';
import SuperadminAllergicRhinitisList from '../pages/Superadmin/Followups/AllergicRhinitisList';
import SuperadminAtopicDermatitisList from '../pages/Superadmin/Followups/AtopicDermatitisList';
import SuperadminAllergicConjunctivitisList from '../pages/Superadmin/Followups/AllergicConjunctivitisList';
import SuperadminAllergicBronchitisList from '../pages/Superadmin/Followups/AllergicBronchitisList';
import GPEList from '../pages/Superadmin/Followups/GPEList';
import ViewAllergicRhinitis from '../pages/Superadmin/Followups/ViewAllergicRhinitis';
import ViewAtopicDermatitis from '../pages/Superadmin/Followups/ViewAtopicDermatitis';
import ViewAllergicConjunctivitis from '../pages/Superadmin/Followups/ViewAllergicConjunctivitis';
import ViewAllergicBronchitis from '../pages/Superadmin/Followups/ViewAllergicBronchitis';
import ViewGPE from '../pages/Superadmin/Followups/ViewGPE';
import PatientProfile from '../pages/Superadmin/Followups/PatientProfile';
import PatientHistory from '../pages/Superadmin/Followups/PatientHistory';
import PatientMedications from '../pages/Superadmin/Followups/PatientMedications';
import FollowupsPatientLabReports from '../pages/Superadmin/Followups/PatientLabReports';
import LabStaffList from '../pages/Superadmin/Lab/LabStaffList';
import AddLabStaff from '../pages/Superadmin/Lab/AddLabStaff';
import EditLabStaff from '../pages/Superadmin/Lab/EditLabStaff';
import LabReports from '../pages/Superadmin/Lab/LabReports';
import SlitLabStaffList from '../pages/Superadmin/Lab/SlitLabStaffList';
import AddSlitLabStaff from '../pages/Superadmin/Lab/AddSlitLabStaff';
import EditSlitLabStaff from '../pages/Superadmin/Lab/EditSlitLabStaff';
import SuperAdminDoctorList from '../pages/Superadmin/Docters/SuperadminDoctorList';
import AddSuperAdminDoctor from '../pages/Superadmin/Docters/AddSuperadminDoctor';
import ViewSuperadminDoctor from '../pages/Superadmin/Docters/ViewSuperadminDoctor';
import EditSuperadminDoctor from '../pages/Superadmin/Docters/EditSuperadminDoctor';

import AllTestReports from '../pages/Superadmin/Docters/AllTestReports';
import ActiveSessions from '../pages/Superadmin/Sessions/ActiveSessions';
import LoginHistory from '../pages/Superadmin/Sessions/LoginHistory';
import OldSuperadminTestRequestDetails from '../pages/Superadmin/Docters/SuperadminTestRequestDetails';

// Test Request Pages
import TestRequestsList from '../pages/Superadmin/TestRequests/TestRequestsList';
import SuperadminTestRequestDetails from '../pages/Superadmin/TestRequests/TestRequestDetails';
import TestRequestReview from '../pages/Superadmin/DoctorsLogin/TestRequestReview';
import TestRequestReviewDetails from '../pages/Superadmin/DoctorsLogin/TestRequestReviewDetails';

// Superadmin Consultant Working Pages
import SuperadminDoctorDashboard from '../pages/Superadmin/DoctorsLogin/Dashboard';
import SuperadminDoctorMyPatients from '../pages/Superadmin/DoctorsLogin/MyPatients';
import PatientDetails from '../pages/Superadmin/DoctorsLogin/PatientDetails';
import PatientLabReports from '../pages/Superadmin/DoctorsLogin/PatientLabReports';
import SuperadminDoctorReviewLabReports from '../pages/Superadmin/DoctorsLogin/ReviewLabReports';
import SuperadminDoctorPatientHistory from '../pages/Superadmin/DoctorsLogin/PatientHistory';
import SuperadminDoctorPatientProfile from '../pages/Superadmin/DoctorsLogin/PatientProfile';
import SuperadminDoctorAppointments from '../pages/Superadmin/DoctorsLogin/Appointments';

// Superadmin Consultant Followups View Pages
import SuperadminDoctorViewAllergicRhinitis from '../pages/Superadmin/DoctorsLogin/Followups/ViewAllergicRhinitis';
import SuperadminDoctorViewAtopicDermatitis from '../pages/Superadmin/DoctorsLogin/Followups/ViewAtopicDermatitis';
import SuperadminDoctorViewAllergicConjunctivitis from '../pages/Superadmin/DoctorsLogin/Followups/ViewAllergicConjunctivitis';
import SuperadminDoctorViewAllergicBronchitis from '../pages/Superadmin/DoctorsLogin/Followups/ViewAllergicBronchitis';
import SuperadminDoctorViewGPE from '../pages/Superadmin/DoctorsLogin/Followups/ViewGPE';


// Lab Pages
import LabDashboard from '../pages/Lab/Dashboard';
import LabTestRequests from '../pages/Lab/TestRequests';
import LabPendingRequests from '../pages/Lab/PendingRequests';
import LabCompletedRequests from '../pages/Lab/CompletedRequests';
import LabTestRequestDetails from '../pages/Lab/TestRequestDetails';
import LabUpdateStatus from '../pages/Lab/UpdateStatus';
import LabScheduleCollection from '../pages/Lab/ScheduleCollection';
import LabStartTesting from '../pages/Lab/StartTesting';
import LabCompleteTesting from '../pages/Lab/CompleteTesting';
import LabGenerateReport from '../pages/Lab/GenerateReport';
import LabSendReport from '../pages/Lab/SendReport';
import LabRouteProtection from '../components/LabRouteProtection';
import SlitLabRouteProtection from '../components/SlitLabRouteProtection';
import LabSlitTherapyRequests from '../pages/Lab/SlitTherapyRequests';

// Center Admin Pages
import CenterAdminDashboard from '../pages/CenterAdmin/Dashboard';
import CenterAdminBilling from '../pages/CenterAdmin/Billing';
import CenterAdminConsultationFeeBilling from '../pages/CenterAdmin/ConsultationFeeBilling';
import CenterAdminBillingReports from '../pages/CenterAdmin/BillingReports';
import CenterAdminBillingTracker from '../pages/CenterAdmin/BillingTracker';
import CenterProfile from '../pages/CenterAdmin/CenterProfile';
import CenterSettings from '../pages/CenterAdmin/CenterSettings';
import CenterAdminAddPatient from '../pages/CenterAdmin/patients/AddPatient';
import CenterAdminPatientList from '../pages/CenterAdmin/patients/PatientList';
import CenterAdminManagePatients from '../pages/CenterAdmin/patients/ManagePatients';
import CenterAdminEditPatient from '../pages/CenterAdmin/patients/EditPatient';
import CenterAdminViewProfile from '../pages/CenterAdmin/patients/profile/ViewProfile';
import CenterAdminAddTest from '../pages/CenterAdmin/patients/AddTest';
import CenterAdminShowTests from '../pages/CenterAdmin/patients/ShowTests';
import CenterAdminAddHistory from '../pages/CenterAdmin/patients/AddHistory/AddHistory';
import CenterAdminViewHistory from '../pages/CenterAdmin/patients/AddHistory/ViewHistory';
import CenterAdminEditHistory from '../pages/CenterAdmin/patients/AddHistory/EditHistory';
import CenterAdminAddMedications from '../pages/CenterAdmin/patients/profile/AddMedications';
import CenterAdminAddDoctor from '../pages/CenterAdmin/Docters/AddDocter';
import CenterAdminDoctorList from '../pages/CenterAdmin/Docters/DoctorList';
import CenterAdminEditDoctor from '../pages/CenterAdmin/Docters/EditDoctor';
import CenterAdminViewDoctor from '../pages/CenterAdmin/Docters/ViewDoctor';
import ManageReceptionists from '../pages/CenterAdmin/Receptionist/ManageReceptionists';
import CenterAdminAddReceptionist from '../pages/CenterAdmin/Receptionist/AddReceptionist';
import EditReceptionist from '../pages/CenterAdmin/Receptionist/EditReceptionist';
import CenterAdminViewReceptionist from '../pages/CenterAdmin/Receptionist/ViewReceptionist';
import FollowUp from '../pages/CenterAdmin/patients/FollowUp/FollowUp';
import AddFollowUp from '../pages/CenterAdmin/patients/FollowUp/AddFollowUp';
import AddAllergicRhinitis from '../pages/CenterAdmin/patients/FollowUp/Allergic Rhinitis/AddAllergicRhinitis';
import AddAllergicConjunctivitis from '../pages/CenterAdmin/patients/FollowUp/Allergic Conjunctivitis/AddAllergicConjunctivitis';
import AddAllergicBronchitis from '../pages/CenterAdmin/patients/FollowUp/Allergic Bronchitis/AddAllergicBronchitis';
import AtopicDermatitis from '../pages/CenterAdmin/patients/FollowUp/Atopic Dermatitis/AtopicDermatitis';
import AddGPE from '../pages/CenterAdmin/patients/FollowUp/GPE/AddGPE';
import PrescriptionList from '../pages/CenterAdmin/patients/FollowUp/Prescription/PrescriptionList';
import AddPrescription from '../pages/CenterAdmin/patients/FollowUp/Prescription/AddPrescription';
import ViewPrescription from '../pages/CenterAdmin/patients/FollowUp/Prescription/ViewPrescription';

// Center Admin View Components
import CenterAdminViewAllergicRhinitis from '../pages/CenterAdmin/patients/FollowUp/Allergic Rhinitis/ViewAllergicRhinitis';
import CenterAdminViewAllergicConjunctivitis from '../pages/CenterAdmin/patients/FollowUp/Allergic Conjunctivitis/ViewAllergicConjunctivitis';
import CenterAdminViewAtopicDermatitis from '../pages/CenterAdmin/patients/FollowUp/Atopic Dermatitis/ViewAtopicDermatitis';
import CenterAdminViewAllergicBronchitis from '../pages/CenterAdmin/patients/FollowUp/Allergic Bronchitis/ViewAllergicBronchitis';
import CenterAdminViewGPE from '../pages/CenterAdmin/patients/FollowUp/GPE/ViewGPE';

// Center Admin Test Request Pages
import CenterAdminTestRequestsList from '../pages/CenterAdmin/TestRequests/TestRequestsList';
import CenterAdminTestRequestDetails from '../pages/CenterAdmin/TestRequests/TestRequestDetails';
import DoctorCalendar from '../pages/CenterAdmin/DoctorCalendar';


// Receptionist Pages - Only essential functionality
import ReceptionistDashboard from '../pages/Receptionist/Dashboard';
import ReceptionistPatientList from '../pages/Receptionist/PatientList';
import ReceptionistViewProfile from '../pages/Receptionist/profile/ViewProfile';
import ReceptionistPatientHistory from '../pages/Receptionist/PatientHistory';
import ReceptionistViewAllergicRhinitis from '../pages/Receptionist/FollowUp/Allergic Rhinitis/ViewAllergicRhinitis';
import ReceptionistViewAtopicDermatitis from '../pages/Receptionist/FollowUp/Atopic Dermatitis/ViewAtopicDermatitis';
import ReceptionistViewAllergicConjunctivitis from '../pages/Receptionist/FollowUp/Allergic Conjunctivitis/ViewAllergicConjunctivitis';
import ReceptionistViewAllergicBronchitis from '../pages/Receptionist/FollowUp/Allergic Bronchitis/ViewAllergicBronchitis';
import ReceptionistViewGPE from '../pages/Receptionist/FollowUp/GPE/ViewGPE';
import ReceptionistViewPrescription from '../pages/Receptionist/FollowUp/Prescription/ViewPrescription';
import ReceptionistLayout from '../pages/Receptionist/ReceptionistLayout';
import ReceptionistBilling from '../pages/Receptionist/Billing';
import ConsultationBilling from '../pages/Receptionist/ConsultationBilling';
import SuperConsultantBilling from '../pages/Receptionist/SuperConsultantBilling';
import SlitTherapyBilling from '../pages/Receptionist/SlitTherapyBilling';
import ReassignPatient from '../pages/Receptionist/ReassignPatient';
import ReceptionistBillingTracker from '../pages/Receptionist/BillingTracker';
import TransactionView from '../pages/Receptionist/TransactionView';
import ReceptionistCollectionReport from '../pages/Receptionist/CollectionReport';
import AddReceptionistPatient from '../pages/Receptionist/AddPatient';
import ReceptionistEditPatient from '../pages/Receptionist/EditPatient';
import AppointmentManagement from '../pages/Receptionist/AppointmentManagement';
import ReceptionistAppointmentApprovals from '../pages/Receptionist/AppointmentApprovals';
import BookSlot from '../pages/Receptionist/BookSlot';
import CenterAdminAppointmentApprovals from '../pages/CenterAdmin/AppointmentApprovals';

// Doctor Pages
import DoctorDashboard from '../pages/Doctor/Dashboard';

import DoctorPatientList from '../pages/Doctor/patients/PatientList';
import DoctorAddPatient from '../pages/Doctor/patients/AddPatient';
import DoctorEditPatient from '../pages/Doctor/patients/EditPatient';
import DoctorAddTest from '../pages/Doctor/patients/AddTest';
import DoctorShowTests from '../pages/Doctor/patients/ShowTests';
import DoctorAddHistory from '../pages/Doctor/patients/AddHistory/AddHistory';
import DoctorViewHistoryPatients from '../pages/Doctor/patients/AddHistory/ViewHistory';
import DoctorEditHistory from '../pages/Doctor/patients/AddHistory/EditHistory';
import DoctorAddMedications from '../pages/Doctor/patients/profile/AddMedications';
import DoctorViewProfile from '../pages/Doctor/patients/profile/ViewProfile';
import DoctorFollowUp from '../pages/Doctor/patients/FollowUp/FollowUp';
import DoctorAddFollowUp from '../pages/Doctor/patients/FollowUp/AddFollowUp';
import DoctorAddAllergicRhinitis from '../pages/Doctor/patients/FollowUp/Allergic Rhinitis/AddAllergicRhinitis';
import DoctorViewAllergicRhinitis from '../pages/Doctor/patients/FollowUp/Allergic Rhinitis/ViewAllergicRhinitis';
import DoctorAddAllergicConjunctivitis from '../pages/Doctor/patients/FollowUp/Allergic Conjunctivitis/AddAllergicConjunctivitis';
import DoctorViewAllergicConjunctivitis from '../pages/Doctor/patients/FollowUp/Allergic Conjunctivitis/ViewAllergicConjunctivitis';
import DoctorAddAllergicBronchitis from '../pages/Doctor/patients/FollowUp/Allergic Bronchitis/AddAllergicBronchitis';
import DoctorViewAllergicBronchitis from '../pages/Doctor/patients/FollowUp/Allergic Bronchitis/ViewAllergicBronchitis';
import DoctorAtopicDermatitis from '../pages/Doctor/patients/FollowUp/Atopic Dermatitis/AtopicDermatitis';
import DoctorViewAtopicDermatitis from '../pages/Doctor/patients/FollowUp/Atopic Dermatitis/ViewAtopicDermatitis';
import DoctorAddGPE from '../pages/Doctor/patients/FollowUp/GPE/AddGPE';
import DoctorViewGPE from '../pages/Doctor/patients/FollowUp/GPE/ViewGPE';
import DoctorPrescriptionList from '../pages/Doctor/patients/FollowUp/Prescription/PrescriptionList';
import DoctorAddPrescription from '../pages/Doctor/patients/FollowUp/Prescription/AddPrescription';
import DoctorViewPrescription from '../pages/Doctor/patients/FollowUp/Prescription/ViewPrescription';
import TestRequests from '../pages/Doctor/TestRequests';
import AddTestRequest from '../pages/Doctor/AddTestRequest';
import CompletedReports from '../pages/Doctor/CompletedReports';
import TestRequestDetails from '../pages/Doctor/TestRequestDetails';

import DoctorViewHistory from '../pages/Doctor/ViewHistory';
import Notifications from '../pages/Doctor/Notifications';
import Feedback from '../pages/Doctor/Feedback';
import RecentlyAssignedPatients from '../pages/Doctor/patients/RecentlyAssignedPatients';

// Accountant Pages
import AccountantDashboard from '../pages/Accountant/Dashboard';
import AccountantProfile from '../pages/Accountant/Profile';
import CancellationReport from '../pages/Accountant/CancellationReport';
import CancellationAndRegeneratedReport from '../pages/Accountant/CancellationAndRegeneratedReport';
import CategoryWiseReport from '../pages/Accountant/CategoryWiseReport';
import CollectionReport from '../pages/Accountant/CollectionReport';
import DiscountReport from '../pages/Accountant/DiscountReport';
import PendingBillsReport from '../pages/Accountant/PendingBillsReport';
import RefundReport from '../pages/Accountant/RefundReport';
import TransactionsSummaryReport from '../pages/Accountant/TransactionsSummaryReport';
import RevenueReport from '../pages/Accountant/RevenueReport';
import PenaltyCollectionReport from '../pages/Accountant/PenaltyCollectionReport';

// Center Admin Accountant Pages
import ManageAccountants from '../pages/CenterAdmin/Accountant/ManageAccountants';
import AddAccountant from '../pages/CenterAdmin/Accountant/AddAccountant';
import EditAccountant from '../pages/CenterAdmin/Accountant/EditAccountant';
import ViewAccountant from '../pages/CenterAdmin/Accountant/ViewAccountant';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/book-appointment" element={<BookAppointment />} />
      <Route path="/check-appointment" element={<CheckAppointment />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/about" element={<About />} />

      {/* CenterAdmin Routes at Root Level (for direct navigation) */}
      <Route path="/CenterAdmin/patients/EditPatient/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminEditPatient /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/ViewProfile/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminViewProfile /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/AddPatient" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminAddPatient /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/PatientList" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminPatientList /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/ManagePatients" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminManagePatients /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/AddTest/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminAddTest /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/ShowTests/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminShowTests /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/AddHistory/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminAddHistory /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/AddHistory/AddHistory/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminAddHistory /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/ViewHistory/:patientId" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminViewHistory /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/AddMedications/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminAddMedications /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/profile/AddMedications/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminAddMedications /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/profile/ViewProfile/:id" element={<PrivateRoute><DashboardLayout><CenterAdminViewProfile /></DashboardLayout></PrivateRoute>} />
      
      {/* Receptionist Routes at Root Level (for direct navigation) */}
<Route path="/receptionist/profile/:id" element={<PrivateRoute><ReceptionistLayout><ReceptionistViewProfile /></ReceptionistLayout></PrivateRoute>} />
<Route path="/receptionist/edit-patient/:id" element={<PrivateRoute><ReceptionistLayout><ReceptionistEditPatient /></ReceptionistLayout></PrivateRoute>} />
<Route path="/receptionist/patients" element={<PrivateRoute><ReceptionistLayout><ReceptionistPatientList /></ReceptionistLayout></PrivateRoute>} />
<Route path="/dashboard/receptionist/edit-patient/:id" element={<PrivateRoute><ReceptionistLayout><ReceptionistEditPatient /></ReceptionistLayout></PrivateRoute>} />
<Route path="/receptionist/slit-therapy-billing" element={<PrivateRoute><ReceptionistLayout><SlitTherapyBilling /></ReceptionistLayout></PrivateRoute>} />
<Route path="/receptionist/collection-report" element={<PrivateRoute><ReceptionistLayout><ReceptionistCollectionReport /></ReceptionistLayout></PrivateRoute>} />

      {/* Superadmin Billing Details Route at Root Level (for direct navigation) */}
      <Route path="/superadmin/billing/:billingId" element={<PrivateRoute><DashboardLayout><ErrorBoundary><BillingDetails /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      
      {/* Center Admin Billing Details Route at Root Level (for direct navigation) */}
      <Route path="/centeradmin/billing/:billingId" element={<PrivateRoute><DashboardLayout><ErrorBoundary><CenterAdminBillingDetails /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
      
      {/* CenterAdmin FollowUp Routes at Root Level */}
      <Route path="/CenterAdmin/patients/FollowUp/:id" element={<PrivateRoute><DashboardLayout><FollowUp /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/add/:id" element={<PrivateRoute><DashboardLayout><FollowUp /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/AddAllergicRhinitis/:patientId" element={<PrivateRoute><DashboardLayout><AddAllergicRhinitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/ViewAllergicRhinitis/:allergicRhinitisId" element={<PrivateRoute><DashboardLayout><CenterAdminViewAllergicRhinitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/AddAllergicConjunctivitis/:patientId" element={<PrivateRoute><DashboardLayout><AddAllergicConjunctivitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/ViewAllergicConjunctivitis/:id" element={<PrivateRoute><DashboardLayout><CenterAdminViewAllergicConjunctivitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/AtopicDermatitis/:patientId" element={<PrivateRoute><DashboardLayout><AtopicDermatitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/ViewAtopicDermatitis/:atopicDermatitisId" element={<PrivateRoute><DashboardLayout><CenterAdminViewAtopicDermatitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/AddAllergicBronchitis/:patientId" element={<PrivateRoute><DashboardLayout><AddAllergicBronchitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/ViewAllergicBronchitis/:id" element={<PrivateRoute><DashboardLayout><CenterAdminViewAllergicBronchitis /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/AddGPE/:patientId" element={<PrivateRoute><DashboardLayout><AddGPE /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/ViewGPE/:id" element={<PrivateRoute><DashboardLayout><CenterAdminViewGPE /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/AddPrescription/:patientId" element={<PrivateRoute><DashboardLayout><AddPrescription /></DashboardLayout></PrivateRoute>} />
      <Route path="/CenterAdmin/patients/FollowUp/ViewPrescription/:id" element={<PrivateRoute><DashboardLayout><ViewPrescription /></DashboardLayout></PrivateRoute>} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        {/* Superadmin Routes */}
        <Route path="superadmin/dashboard" element={<SuperadminDashboard />} />
        
        {/* Route to match navigation pattern with capital S - moved to be more specific */}
        <Route path="Superadmin/dashboard" element={<SuperadminDashboard />} />
        <Route path="Superadmin" element={<SuperadminDashboard />} />
        
        {/* Superadmin Consultant Working Routes */}
        <Route path="superadmin/doctor/dashboard" element={<SuperadminDoctorDashboard />} />
        <Route path="superadmin/doctor/patients" element={<SuperadminDoctorMyPatients />} />
        <Route path="superadmin/doctor/my-patients" element={<SuperadminDoctorMyPatients />} />
        <Route path="superadmin/doctor/appointments" element={<SuperadminDoctorAppointments />} />
        <Route path="superadmin/doctor/lab-reports" element={<SuperadminDoctorReviewLabReports />} />
        <Route path="superadmin/doctor/patient/:patientId" element={<PatientDetails />} />
        <Route path="superadmin/doctor/patient/:patientId/profile" element={<SuperadminDoctorPatientProfile />} />
        <Route path="superadmin/doctor/patient/:patientId/lab-reports" element={<PatientLabReports />} />
        <Route path="superadmin/doctor/patient/:patientId/history" element={<SuperadminDoctorPatientHistory />} />
        {/* Superadmin Consultant Followups view routes */}
        <Route path="superadmin/doctor/followups/ViewAllergicRhinitis/:patientId" element={<SuperadminDoctorViewAllergicRhinitis />} />
        <Route path="superadmin/doctor/followups/ViewAtopicDermatitis/:patientId" element={<SuperadminDoctorViewAtopicDermatitis />} />
        <Route path="superadmin/doctor/followups/ViewAllergicConjunctivitis/:patientId" element={<SuperadminDoctorViewAllergicConjunctivitis />} />
        <Route path="superadmin/doctor/followups/ViewAllergicBronchitis/:patientId" element={<SuperadminDoctorViewAllergicBronchitis />} />
        <Route path="superadmin/doctor/followups/ViewGPE/:patientId" element={<SuperadminDoctorViewGPE />} />
        

        
        {/* Superadmin Centers Routes with capital S */}
        <Route path="Superadmin/Centers/AddCenter" element={<AddCenter />} />
        <Route path="Superadmin/Centers/CentersList" element={<CentersList />} />
        <Route path="Superadmin/Centers/EditCenter/:id" element={<EditCenter />} />
        <Route path="Superadmin/Centers/EditCenterAdmin/:id" element={<EditCenterAdmin />} />
        <Route path="Superadmin/Centers/ManageAdmins" element={<ManageAdmins />} />
        <Route path="Superadmin/Centers/ViewCenterInfo/:id" element={<ViewCenterInfo />} />
        
        {/* Superadmin Consultants Routes with capital S */}
        <Route path="Superadmin/Docters/SuperAdminDoctorList" element={<SuperAdminDoctorList />} />
        <Route path="Superadmin/Docters/AddSuperadminDoctor" element={<AddSuperAdminDoctor />} />
        <Route path="Superadmin/Docters/ViewSuperadminDoctor/:id" element={<ViewSuperadminDoctor />} />
        <Route path="Superadmin/Docters/EditSuperadminDoctor/:id" element={<EditSuperadminDoctor />} />
        

        
        {/* Superadmin Lab Routes with capital S */}
        <Route path="Superadmin/Lab/LabStaffList" element={<LabStaffList />} />
        <Route path="Superadmin/Lab/AddLabStaff" element={<AddLabStaff />} />
        <Route path="Superadmin/Lab/EditLabStaff/:id" element={<EditLabStaff />} />
        <Route path="Superadmin/Lab/LabReports" element={<LabReports />} />
        <Route path="Superadmin/Lab/SlitLabStaffList" element={<SlitLabStaffList />} />
        <Route path="Superadmin/Lab/AddSlitLabStaff" element={<AddSlitLabStaff />} />
        <Route path="Superadmin/Lab/EditSlitLabStaff/:id" element={<EditSlitLabStaff />} />
        
        {/* Superadmin Followups Routes with capital S */}
        <Route path="Superadmin/Followups/ManageFollowUp" element={<ManageFollowUp />} />
        <Route path="Superadmin/Followups/ViewFollowUpPatients" element={<ViewFollowUpPatients />} />
        <Route path="Superadmin/Followups/ViewPatientFollowUps/:patientId" element={<ViewPatientFollowUps />} />
        <Route path="Superadmin/Followups/AllergicBronchitisList" element={<SuperadminAllergicBronchitisList />} />
        <Route path="Superadmin/Followups/AllergicConjunctivitisList" element={<SuperadminAllergicConjunctivitisList />} />
        <Route path="Superadmin/Followups/AllergicRhinitisList" element={<SuperadminAllergicRhinitisList />} />
        <Route path="Superadmin/Followups/AtopicDermatitisList" element={<SuperadminAtopicDermatitisList />} />
        <Route path="Superadmin/Followups/GPEList" element={<GPEList />} />
        <Route path="Superadmin/Followups/ViewAllergicBronchitis/:patientId" element={<ViewAllergicBronchitis />} />
        <Route path="Superadmin/Followups/ViewAllergicConjunctivitis/:patientId" element={<ViewAllergicConjunctivitis />} />
        <Route path="Superadmin/Followups/ViewAllergicRhinitis/:patientId" element={<ViewAllergicRhinitis />} />
        <Route path="Superadmin/Followups/ViewAtopicDermatitis/:patientId" element={<ViewAtopicDermatitis />} />
        <Route path="Superadmin/Followups/ViewGPE/:patientId" element={<ViewGPE />} />
        <Route path="Superadmin/Followups/PatientProfile/:patientId" element={<PatientProfile />} />
        <Route path="Superadmin/Followups/PatientHistory/:patientId" element={<PatientHistory />} />
        <Route path="Superadmin/Followups/PatientMedications/:patientId" element={<PatientMedications />} />
        <Route path="Superadmin/Followups/PatientLabReports/:patientId" element={<FollowupsPatientLabReports />} />
        
        {/* Centers Routes */}
        <Route path="superadmin/centers/centerslist" element={<CentersList />} />
        <Route path="superadmin/centers/addcenter" element={<AddCenter />} />
        <Route path="superadmin/centers/editcenter/:id" element={<EditCenter />} />
        <Route path="superadmin/centers/viewcenterinfo/:id" element={<ViewCenterInfo />} />
        <Route path="superadmin/centers/manageadmins" element={<ManageAdmins />} />
        <Route path="superadmin/centers/editcenteradmin/:id" element={<EditCenterAdmin />} />
        
        {/* Followups Routes */}
        <Route path="superadmin/followups/viewfollowuppatients" element={<ViewFollowUpPatients />} />
        <Route path="superadmin/followups/viewpatientfollowups/:patientId" element={<ViewPatientFollowUps />} />
        <Route path="superadmin/followups/managefollowup" element={<ManageFollowUp />} />
        <Route path="superadmin/followups/allergicrhinitislist" element={<SuperadminAllergicRhinitisList />} />
        <Route path="superadmin/followups/atopicdermatitislist" element={<SuperadminAtopicDermatitisList />} />
        <Route path="superadmin/followups/allergicconjunctivitislist" element={<SuperadminAllergicConjunctivitisList />} />
        <Route path="superadmin/followups/allergicbronchitislist" element={<SuperadminAllergicBronchitisList />} />
        <Route path="superadmin/followups/gpelist" element={<GPEList />} />
        <Route path="superadmin/followups/viewallergicrhinitis/:patientId" element={<ViewAllergicRhinitis />} />
        <Route path="superadmin/followups/viewatopicdermatitis/:patientId" element={<ViewAtopicDermatitis />} />
        <Route path="superadmin/followups/viewallergicconjunctivitis/:patientId" element={<ViewAllergicConjunctivitis />} />
        <Route path="superadmin/followups/viewallergicbronchitis/:patientId" element={<ViewAllergicBronchitis />} />
        <Route path="superadmin/followups/viewgpe/:patientId" element={<ViewGPE />} />
        <Route path="superadmin/followups/PatientProfile/:patientId" element={<PatientProfile />} />
        <Route path="superadmin/followups/PatientHistory/:patientId" element={<PatientHistory />} />
        <Route path="superadmin/followups/PatientMedications/:patientId" element={<PatientMedications />} />
        <Route path="superadmin/followups/PatientLabReports/:patientId" element={<FollowupsPatientLabReports />} />
        
        {/* Lab Routes */}
        <Route path="superadmin/lab/labstafflist" element={<LabStaffList />} />
        <Route path="superadmin/lab/addlabstaff" element={<AddLabStaff />} />
        <Route path="superadmin/lab/editlabstaff/:id" element={<EditLabStaff />} />
        <Route path="superadmin/lab/labreports" element={<LabReports />} />
        <Route path="superadmin/lab/slitlabstafflist" element={<SlitLabStaffList />} />
        <Route path="superadmin/lab/addslitlabstaff" element={<AddSlitLabStaff />} />
        <Route path="superadmin/lab/editslitlabstaff/:id" element={<EditSlitLabStaff />} />
        
        {/* Test Request Routes */}
        <Route path="superadmin/test-requests" element={<TestRequestsList />} />
        <Route path="superadmin/test-requests/:id" element={<SuperadminTestRequestDetails />} />
        
        {/* Session Management Routes */}
        <Route path="Superadmin/Sessions/ActiveSessions" element={<ActiveSessions />} />
        <Route path="Superadmin/Sessions/LoginHistory" element={<LoginHistory />} />
        
        {/* Billing Routes */}
        <Route path="superadmin/billing" element={<SuperadminBilling />} />
        <Route path="superadmin/consultation-fee-billing" element={<SuperadminConsultationFeeBilling />} />
        <Route path="superadmin/billing/:billingId" element={<BillingDetails />} />
        <Route path="superadmin/billing-reports" element={<SuperadminBillingReports />} />
        
        {/* Doctors Routes */}
        <Route path="superadmin/doctors/superadmindoctorlist" element={<SuperAdminDoctorList />} />
        <Route path="superadmin/doctors/addsuperadmindoctor" element={<AddSuperAdminDoctor />} />
        <Route path="superadmin/doctors/viewsuperadmindoctor/:id" element={<ViewSuperadminDoctor />} />
        <Route path="superadmin/doctors/editsuperadmindoctor/:id" element={<EditSuperadminDoctor />} />
        <Route path="superadmin/doctors/all-test-reports" element={<AllTestReports />} />
        <Route path="superadmin/doctors/test-request/:id" element={<OldSuperadminTestRequestDetails />} />
        
        {/* Additional routes to match navigation patterns */}
        <Route path="Superadmin/Docters/SuperAdminDoctorList" element={<SuperAdminDoctorList />} />
        <Route path="Superadmin/Docters/AddSuperadminDoctor" element={<AddSuperAdminDoctor />} />
        <Route path="Superadmin/Docters/ViewSuperadminDoctor/:id" element={<ViewSuperadminDoctor />} />
        <Route path="Superadmin/Docters/EditSuperadminDoctor/:id" element={<EditSuperadminDoctor />} />
        


        {/* Center Admin Routes */}
        <Route path="centeradmin/dashboard" element={<CenterAdminDashboard />} />
        <Route path="centeradmin/center-profile" element={<CenterProfile />} />
        <Route path="centeradmin/settings" element={<CenterSettings />} />
        <Route path='centeradmin/patients/addpatient' element={<ErrorBoundary><CenterAdminAddPatient /></ErrorBoundary>} />
        <Route path='centeradmin/patients/patientlist' element={<ErrorBoundary><CenterAdminPatientList /></ErrorBoundary>} />
        <Route path='centeradmin/patients/managepatients' element={<ErrorBoundary><CenterAdminManagePatients /></ErrorBoundary>} />
        <Route path='centeradmin/patients/editpatient/:id' element={<ErrorBoundary><CenterAdminEditPatient /></ErrorBoundary>} />
        <Route path="centeradmin/patients/viewprofile/:id" element={<ErrorBoundary><CenterAdminViewProfile /></ErrorBoundary>} />
        <Route path="centeradmin/patients/addtest/:id" element={<ErrorBoundary><CenterAdminAddTest /></ErrorBoundary>} />
        <Route path="centeradmin/patients/show-tests/:id" element={<ErrorBoundary><CenterAdminShowTests /></ErrorBoundary>} />
        <Route path="centeradmin/patients/addhistory/:id" element={<ErrorBoundary><CenterAdminAddHistory /></ErrorBoundary>} />
        <Route path="centeradmin/patients/viewhistory/:patientId" element={<ErrorBoundary><CenterAdminViewHistory /></ErrorBoundary>} />
        <Route path="centeradmin/patients/edithistory/:patientId/:historyId" element={<ErrorBoundary><CenterAdminEditHistory /></ErrorBoundary>} />
        <Route path="centeradmin/patients/addmedications/:id" element={<ErrorBoundary><CenterAdminAddMedications /></ErrorBoundary>} />
        
        {/* Additional routes to match navigation patterns with capital C and A */}
        <Route path="CenterAdmin/patients/EditPatient/:id" element={<ErrorBoundary><CenterAdminEditPatient /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/ViewProfile/:id" element={<ErrorBoundary><CenterAdminViewProfile /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/AddPatient" element={<ErrorBoundary><CenterAdminAddPatient /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/PatientList" element={<ErrorBoundary><CenterAdminPatientList /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/ManagePatients" element={<ErrorBoundary><CenterAdminManagePatients /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/AddTest/:id" element={<ErrorBoundary><CenterAdminAddTest /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/ShowTests/:id" element={<ErrorBoundary><CenterAdminShowTests /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/AddHistory/:id" element={<ErrorBoundary><CenterAdminAddHistory /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/AddHistory/AddHistory/:id" element={<ErrorBoundary><CenterAdminAddHistory /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/ViewHistory/:patientId" element={<ErrorBoundary><CenterAdminViewHistory /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/AddHistory/ViewHistory/:patientId" element={<ErrorBoundary><CenterAdminViewHistory /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/EditHistory/:patientId/:historyId" element={<ErrorBoundary><CenterAdminEditHistory /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/AddHistory/EditHistory/:patientId/:historyId" element={<ErrorBoundary><CenterAdminEditHistory /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/AddMedications/:id" element={<ErrorBoundary><CenterAdminAddMedications /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/profile/AddMedications/:id" element={<ErrorBoundary><CenterAdminAddMedications /></ErrorBoundary>} />
        <Route path="CenterAdmin/patients/profile/ViewProfile/:id" element={<CenterAdminViewProfile />} />
        
        {/* CenterAdmin FollowUp Routes with capital C and A */}
        <Route path="CenterAdmin/patients/FollowUp/:id" element={<FollowUp />} />
        <Route path="CenterAdmin/patients/FollowUp/add/:id" element={<FollowUp />} />
        <Route path="CenterAdmin/patients/FollowUp/AddAllergicRhinitis/:patientId" element={<AddAllergicRhinitis />} />
        <Route path="CenterAdmin/patients/FollowUp/ViewAllergicRhinitis/:allergicRhinitisId" element={<CenterAdminViewAllergicRhinitis />} />
        <Route path="CenterAdmin/patients/FollowUp/AddAllergicConjunctivitis/:patientId" element={<AddAllergicConjunctivitis />} />
        <Route path="CenterAdmin/patients/FollowUp/ViewAllergicConjunctivitis/:id" element={<CenterAdminViewAllergicConjunctivitis />} />
        <Route path="CenterAdmin/patients/FollowUp/AtopicDermatitis/:patientId" element={<AtopicDermatitis />} />
        <Route path="CenterAdmin/patients/FollowUp/ViewAtopicDermatitis/:atopicDermatitisId" element={<CenterAdminViewAtopicDermatitis />} />
        <Route path="CenterAdmin/patients/FollowUp/AddAllergicBronchitis/:patientId" element={<AddAllergicBronchitis />} />
        <Route path="CenterAdmin/patients/FollowUp/ViewAllergicBronchitis/:id" element={<CenterAdminViewAllergicBronchitis />} />
        <Route path="CenterAdmin/patients/FollowUp/AddGPE/:patientId" element={<AddGPE />} />
        <Route path="CenterAdmin/patients/FollowUp/ViewGPE/:id" element={<CenterAdminViewGPE />} />
        <Route path="CenterAdmin/patients/FollowUp/AddPrescription/:patientId" element={<AddPrescription />} />
        <Route path="CenterAdmin/patients/FollowUp/ViewPrescription/:id" element={<ViewPrescription />} />
        
        {/* Center Admin Doctor Routes */}
        <Route path="centeradmin/doctors/adddoctor" element={<CenterAdminAddDoctor />} />
        <Route path="centeradmin/doctors/doctorlist" element={<CenterAdminDoctorList />} />
        <Route path="centeradmin/doctors/viewdoctor/:id" element={<CenterAdminViewDoctor />} />
        <Route path="centeradmin/doctors/editdoctor/:id" element={<CenterAdminEditDoctor />} />
        
        {/* Center Admin Receptionist Routes */}
        <Route path="centeradmin/receptionist/managereceptionists" element={<ManageReceptionists />} />
        <Route path="centeradmin/receptionist/addreceptionist" element={<CenterAdminAddReceptionist />} />
        <Route path="centeradmin/receptionist/viewreceptionist/:id" element={<CenterAdminViewReceptionist />} />
        <Route path="centeradmin/receptionist/editreceptionist/:id" element={<EditReceptionist />} />

        {/* Center Admin Accountant Routes */}
        <Route path="centeradmin/accountant/manageaccountants" element={<ManageAccountants />} />
        <Route path="centeradmin/accountant/addaccountant" element={<AddAccountant />} />
        <Route path="centeradmin/accountant/viewaccountant/:id" element={<ViewAccountant />} />
        <Route path="centeradmin/accountant/editaccountant/:id" element={<EditAccountant />} />
        
        {/* Center Admin Test Request Routes */}
        <Route path="centeradmin/test-requests" element={<ErrorBoundary><CenterAdminTestRequestsList /></ErrorBoundary>} />
        <Route path="centeradmin/test-requests/:id" element={<ErrorBoundary><CenterAdminTestRequestDetails /></ErrorBoundary>} />

        {/* Center Admin Appointment Approvals */}
        <Route path="centeradmin/appointment-approvals" element={<ErrorBoundary><CenterAdminAppointmentApprovals /></ErrorBoundary>} />

        {/* Center Admin Doctor Calendar */}
        <Route path="centeradmin/doctor-calendar" element={<ErrorBoundary><DoctorCalendar /></ErrorBoundary>} />

        {/* Center Admin Billing Routes */}
        <Route path="centeradmin/billing" element={<ErrorBoundary><CenterAdminBilling /></ErrorBoundary>} />
        <Route path="centeradmin/consultation-fee-billing" element={<ErrorBoundary><CenterAdminConsultationFeeBilling /></ErrorBoundary>} />
        <Route path="centeradmin/billing/:billingId" element={<ErrorBoundary><CenterAdminBillingDetails /></ErrorBoundary>} />
        <Route path="centeradmin/billing-reports" element={<ErrorBoundary><CenterAdminBillingReports /></ErrorBoundary>} />
        <Route path="centeradmin/billing-tracker" element={<ErrorBoundary><CenterAdminBillingTracker /></ErrorBoundary>} />
        
        {/* Center Admin Followup Routes (lowercase) */}
        <Route path="centeradmin/patients/followup/:id" element={<FollowUp />} />
        <Route path="centeradmin/patients/followup/addallergicrhinitis/:patientId" element={<AddAllergicRhinitis />} />
        <Route path="centeradmin/patients/followup/viewallergicrhinitis/:allergicRhinitisId" element={<CenterAdminViewAllergicRhinitis />} />
        <Route path="centeradmin/patients/followup/addallergicconjunctivitis/:patientId" element={<AddAllergicConjunctivitis />} />
        <Route path="centeradmin/patients/followup/viewallergicconjunctivitis/:id" element={<CenterAdminViewAllergicConjunctivitis />} />
        <Route path="centeradmin/patients/followup/atopicdermatitis/:patientId" element={<AtopicDermatitis />} />
        <Route path="centeradmin/patients/followup/viewatopicdermatitis/:atopicDermatitisId" element={<CenterAdminViewAtopicDermatitis />} />
        <Route path="centeradmin/patients/followup/addallergicbronchitis/:patientId" element={<AddAllergicBronchitis />} />
        <Route path="centeradmin/patients/followup/viewallergicbronchitis/:id" element={<CenterAdminViewAllergicBronchitis />} />
        <Route path="centeradmin/patients/followup/addgpe/:patientId" element={<AddGPE />} />
        <Route path="centeradmin/patients/followup/viewgpe/:id" element={<CenterAdminViewGPE />} />
        <Route path="centeradmin/patients/followup/prescriptionlist/:patientId" element={<PrescriptionList />} />
        <Route path="CenterAdmin/patients/FollowUp/prescriptionlist/:patientId" element={<PrescriptionList />} />
        <Route path="centeradmin/patients/followup/addprescription/:patientId" element={<AddPrescription />} />
        <Route path="centeradmin/patients/followup/viewprescription/:id" element={<ViewPrescription />} />
        
        {/* Receptionist Routes */}
        <Route path="receptionist/dashboard" element={<ReceptionistDashboard />} />
        <Route path="receptionist/patients" element={<ReceptionistPatientList />} />
        <Route path="receptionist/add-patient" element={<AddReceptionistPatient />} />
<Route path="receptionist/edit-patient/:id" element={<ReceptionistLayout><ReceptionistEditPatient /></ReceptionistLayout>} />
<Route path="receptionist/profile/:id" element={<ReceptionistLayout><ReceptionistViewProfile /></ReceptionistLayout>} />
        <Route path="receptionist/patient-history/:id" element={<ReceptionistLayout><ReceptionistPatientHistory /></ReceptionistLayout>} />
        <Route path="receptionist/view-allergic-rhinitis/:id" element={<ReceptionistLayout><ReceptionistViewAllergicRhinitis /></ReceptionistLayout>} />
        <Route path="receptionist/view-atopic-dermatitis/:id" element={<ReceptionistLayout><ReceptionistViewAtopicDermatitis /></ReceptionistLayout>} />
        <Route path="receptionist/view-allergic-conjunctivitis/:id" element={<ReceptionistLayout><ReceptionistViewAllergicConjunctivitis /></ReceptionistLayout>} />
        <Route path="receptionist/view-allergic-bronchitis/:id" element={<ReceptionistLayout><ReceptionistViewAllergicBronchitis /></ReceptionistLayout>} />
        <Route path="receptionist/view-gpe/:id" element={<ReceptionistLayout><ReceptionistViewGPE /></ReceptionistLayout>} />
        <Route path="receptionist/view-prescription/:id" element={<ReceptionistLayout><ReceptionistViewPrescription /></ReceptionistLayout>} />
        <Route path="receptionist/billing" element={<ReceptionistLayout><ReceptionistBilling /></ReceptionistLayout>} />
        <Route path="receptionist/consultation-billing" element={<ReceptionistLayout><ConsultationBilling /></ReceptionistLayout>} />
        <Route path="receptionist/superconsultant-billing" element={<ReceptionistLayout><SuperConsultantBilling /></ReceptionistLayout>} />
        <Route path="receptionist/slit-therapy-billing" element={<ReceptionistLayout><SlitTherapyBilling /></ReceptionistLayout>} />
        <Route path="receptionist/reassign-patient" element={<ReceptionistLayout><ReassignPatient /></ReceptionistLayout>} />
        <Route path="receptionist/billing-tracker" element={<ReceptionistLayout><ReceptionistBillingTracker /></ReceptionistLayout>} />
        <Route path="receptionist/transactions" element={<ReceptionistLayout><TransactionView /></ReceptionistLayout>} />
        <Route path="receptionist/collection-report" element={<ReceptionistLayout><ReceptionistCollectionReport /></ReceptionistLayout>} />
        <Route path="receptionist/appointment-management" element={<ReceptionistLayout><AppointmentManagement /></ReceptionistLayout>} />
        <Route path="receptionist/appointment-approvals" element={<ReceptionistLayout><ReceptionistAppointmentApprovals /></ReceptionistLayout>} />
        <Route path="receptionist/book-slot" element={<BookSlot />} />

        {/* Doctor Routes */}
        <Route path="doctor/dashboard" element={<DoctorDashboard />} />
        
        {/* Doctor Patient Management */}
        <Route path="doctor/patients" element={<DoctorPatientList />} />
        <Route path="doctor/recently-assigned-patients" element={<RecentlyAssignedPatients />} />
        <Route path="doctor/patients/add-patient" element={<DoctorAddPatient />} />
        <Route path="doctor/patients/edit-patient/:id" element={<DoctorEditPatient />} />
        <Route path="doctor/patients/show-tests/:id" element={<DoctorShowTests />} />
        <Route path="doctor/patients/add-test/:id" element={<DoctorAddTest />} />
        <Route path="doctor/patients/profile/:id" element={<DoctorViewProfile />} />
        <Route path="doctor/patients/profile/add-medications/:id" element={<DoctorAddMedications />} />
        <Route path="doctor/patients/add-history/:patientId" element={<DoctorAddHistory />} />
        <Route path="doctor/patients/viewhistory/:patientId" element={<DoctorViewHistory />} />
        <Route path="doctor/patients/edithistory/:patientId/:historyId" element={<DoctorEditHistory />} />
        
        {/* Doctor Routes with Capital D (to match navigation patterns) */}
        <Route path="Doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="Doctor/patients/PatientList" element={<DoctorPatientList />} />
        <Route path="Doctor/patients/AddPatient" element={<DoctorAddPatient />} />
        <Route path="Doctor/patients/EditPatient/:id" element={<DoctorEditPatient />} />
        <Route path="Doctor/patients/ShowTests/:id" element={<DoctorShowTests />} />
        <Route path="Doctor/patients/AddTest/:id" element={<DoctorAddTest />} />
        <Route path="Doctor/patients/profile/ViewProfile/:id" element={<DoctorViewProfile />} />
        <Route path="Doctor/patients/profile/AddMedications/:id" element={<DoctorAddMedications />} />
        <Route path="Doctor/patients/AddHistory/:patientId" element={<DoctorAddHistory />} />
        <Route path="Doctor/patients/AddHistory/ViewHistory/:patientId" element={<DoctorViewHistoryPatients />} />
        <Route path="Doctor/patients/AddHistory/EditHistory/:patientId/:historyId" element={<DoctorEditHistory />} />
        <Route path="Doctor/AddTestRequest" element={<AddTestRequest />} />
        <Route path="Doctor/TestRequests" element={<TestRequests />} />
        
        {/* Doctor Followup Management */}
        <Route path="doctor/patients/followup/:id" element={<DoctorFollowUp />} />
        <Route path="doctor/patients/followup/add/:id" element={<DoctorAddFollowUp />} />
        <Route path="doctor/patients/followup/view/:id" element={<DoctorFollowUp />} />
        <Route path="doctor/patients/followup/addallergicrhinitis/:patientId" element={<DoctorAddAllergicRhinitis />} />
        <Route path="doctor/patients/followup/viewallergicrhinitis/:id" element={<DoctorViewAllergicRhinitis />} />
        <Route path="doctor/patients/followup/addallergicconjunctivitis/:patientId" element={<DoctorAddAllergicConjunctivitis />} />
        <Route path="doctor/patients/followup/viewallergicconjunctivitis/:id" element={<DoctorViewAllergicConjunctivitis />} />
        <Route path="doctor/patients/followup/atopicdermatitis/:patientId" element={<DoctorAtopicDermatitis />} />
        <Route path="doctor/patients/followup/viewatopicdermatitis/:id" element={<DoctorViewAtopicDermatitis />} />
        <Route path="doctor/patients/followup/addallergicbronchitis/:patientId" element={<DoctorAddAllergicBronchitis />} />
        <Route path="doctor/patients/followup/viewallergicbronchitis/:id" element={<DoctorViewAllergicBronchitis />} />
        <Route path="doctor/patients/followup/addgpe/:patientId" element={<DoctorAddGPE />} />
        <Route path="doctor/patients/followup/viewgpe/:id" element={<DoctorViewGPE />} />
        <Route path="doctor/patients/followup/prescriptionlist/:patientId" element={<DoctorPrescriptionList />} />
        <Route path="doctor/patients/followup/addprescription/:patientId" element={<DoctorAddPrescription />} />
        <Route path="doctor/patients/followup/viewprescription/:id" element={<DoctorViewPrescription />} />
        
        {/* Doctor FollowUp Routes with Capital D (to match navigation patterns) */}
        <Route path="Doctor/patients/FollowUp/:id" element={<DoctorFollowUp />} />
        <Route path="Doctor/patients/FollowUp/add/:id" element={<DoctorAddFollowUp />} />
        <Route path="Doctor/patients/FollowUp/view/:id" element={<DoctorFollowUp />} />
        <Route path="Doctor/patients/FollowUp/AddAllergicRhinitis/:patientId" element={<DoctorAddAllergicRhinitis />} />
        <Route path="Doctor/patients/FollowUp/ViewAllergicRhinitis/:id" element={<DoctorViewAllergicRhinitis />} />
        <Route path="Doctor/patients/FollowUp/AddAllergicConjunctivitis/:patientId" element={<DoctorAddAllergicConjunctivitis />} />
        <Route path="Doctor/patients/FollowUp/ViewAllergicConjunctivitis/:id" element={<DoctorViewAllergicConjunctivitis />} />
        <Route path="Doctor/patients/FollowUp/AtopicDermatitis/:patientId" element={<DoctorAtopicDermatitis />} />
        <Route path="Doctor/patients/FollowUp/ViewAtopicDermatitis/:id" element={<DoctorViewAtopicDermatitis />} />
        <Route path="Doctor/patients/FollowUp/AddAllergicBronchitis/:patientId" element={<DoctorAddAllergicBronchitis />} />
        <Route path="Doctor/patients/FollowUp/ViewAllergicBronchitis/:id" element={<DoctorViewAllergicBronchitis />} />
        <Route path="Doctor/patients/FollowUp/AddGPE/:patientId" element={<DoctorAddGPE />} />
        <Route path="Doctor/patients/FollowUp/ViewGPE/:id" element={<DoctorViewGPE />} />
        <Route path="Doctor/patients/FollowUp/PrescriptionList/:patientId" element={<DoctorPrescriptionList />} />
        <Route path="Doctor/patients/FollowUp/AddPrescription/:patientId" element={<DoctorAddPrescription />} />
        <Route path="Doctor/patients/FollowUp/ViewPrescription/:id" element={<DoctorViewPrescription />} />
        
        {/* Doctor History Management */}
        <Route path="doctor/patients/view-history/:id" element={<DoctorViewHistory />} />
        <Route path="Doctor/patients/ViewHistory/:id" element={<DoctorViewHistory />} />
        
        {/* Doctor Test Request Management */}
        <Route path="doctor/patients/add-test-request/:id" element={<AddTestRequest />} />
        <Route path="doctor/patients/test-request/:id" element={<TestRequests />} />
        <Route path="doctor/add-test-request" element={<AddTestRequest />} />
        <Route path="doctor/test-request-details/:id" element={<TestRequestDetails />} />
        
        {/* Doctor Legacy Routes (for backward compatibility) */}
        <Route path="doctor/add-patient" element={<DoctorAddPatient />} />
        <Route path="doctor/edit-patient/:id" element={<DoctorEditPatient />} />
        <Route path="doctor/add-history/:patientId" element={<DoctorAddHistory />} />
        <Route path="doctor/add-medications/:patientId" element={<DoctorAddMedications />} />
        <Route path="doctor/add-followup/:patientId" element={<DoctorAddFollowUp />} />
        
        {/* Doctor Test Management */}
        <Route path="doctor/test-requests" element={<TestRequests />} />
        <Route path="doctor/completed-reports" element={<CompletedReports />} />
        <Route path="doctor/test-request/:id" element={<TestRequests />} />
        <Route path="doctor/ViewHistory/:patientId" element={<DoctorViewHistory />} />
        
        {/* Doctor Other Features */}
        <Route path="doctor/notifications" element={<Notifications />} />
        <Route path="doctor/feedback" element={<Feedback />} />

        {/* Lab Routes */}
        <Route path="lab/dashboard" element={<LabRouteProtection><LabDashboard /></LabRouteProtection>} />
        <Route path="lab/test-requests" element={<LabRouteProtection><LabTestRequests /></LabRouteProtection>} />
        <Route path="lab/pending-requests" element={<LabRouteProtection><LabPendingRequests /></LabRouteProtection>} />
        <Route path="lab/completed-requests" element={<LabRouteProtection><LabCompletedRequests /></LabRouteProtection>} />
        <Route path="lab/test-request/:id" element={<LabRouteProtection><LabTestRequestDetails /></LabRouteProtection>} />
        <Route path="lab/update-status/:id" element={<LabRouteProtection><LabUpdateStatus /></LabRouteProtection>} />
        <Route path="lab/schedule-collection/:id" element={<LabRouteProtection><LabScheduleCollection /></LabRouteProtection>} />
        <Route path="lab/start-testing/:id" element={<LabRouteProtection><LabStartTesting /></LabRouteProtection>} />
        <Route path="lab/complete-testing/:id" element={<LabRouteProtection><LabCompleteTesting /></LabRouteProtection>} />
        <Route path="lab/generate-report/:id" element={<LabRouteProtection><LabGenerateReport /></LabRouteProtection>} />
        <Route path="lab/send-report/:id" element={<LabRouteProtection><LabSendReport /></LabRouteProtection>} />
        <Route path="slit-lab/slit-therapy" element={<SlitLabRouteProtection><LabSlitTherapyRequests /></SlitLabRouteProtection>} />

        {/* Accountant Routes */}
        <Route path="accountant/dashboard" element={<AccountantRouteProtection><AccountantDashboard /></AccountantRouteProtection>} />
        <Route path="accountant/profile" element={<AccountantRouteProtection><AccountantProfile /></AccountantRouteProtection>} />
        
        {/* Accountant Report Routes */}
        <Route path="accountant/reports/cancellation" element={<AccountantRouteProtection><CancellationReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/cancellation-regenerated" element={<AccountantRouteProtection><CancellationAndRegeneratedReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/category-wise" element={<AccountantRouteProtection><CategoryWiseReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/collection" element={<AccountantRouteProtection><CollectionReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/discount" element={<AccountantRouteProtection><DiscountReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/pending-bills" element={<AccountantRouteProtection><PendingBillsReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/refund" element={<AccountantRouteProtection><RefundReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/transactions-summary" element={<AccountantRouteProtection><TransactionsSummaryReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/revenue" element={<AccountantRouteProtection><RevenueReport /></AccountantRouteProtection>} />
        <Route path="accountant/reports/penalty-collection" element={<AccountantRouteProtection><PenaltyCollectionReport /></AccountantRouteProtection>} />
      </Route>
    </Routes>
  );
}