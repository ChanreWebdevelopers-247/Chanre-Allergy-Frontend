import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { fetchPatientDetails, fetchPatientMedications, fetchPatientHistory, fetchPatientFollowUps, fetchAllergicRhinitis, fetchAllergicConjunctivitis, fetchAllergicBronchitis, fetchAtopicDermatitis, fetchGPE, fetchPrescriptions, fetchTests, fetchPatientTestRequests, updatePatient } from '../../../../features/doctor/doctorThunks';
import { canDoctorEditPatient, getEditRestrictionMessage } from '../../../../utils/patientPermissions';
import { 
  ArrowLeft, User, Phone, Calendar, MapPin, Activity, Pill, FileText, Eye, Edit, Plus, AlertCircle, Mail, UserCheck, Clock, Download, X
} from 'lucide-react';
import API from '../../../../services/api';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DEFAULT_CENTER_INFO = {
  name: "CHANRE RHEUMATOLOGY & IMMUNOLOGY CENTER & RESEARCH",
  subTitle:
    "Specialists in Rheumatology, Autoimmune Disease, Allergy, Immune Defiency, Rheumatoid Immunology, Vasculitis and Rare Infections & Infertility",
  address: "No. 414/5&6, 20th Main, West of Chord Road, 1st Block, Rajajinagar, Bengaluru - 560 010.",
  email: "info@chanreclinic.com",
  phone: "080-42516699",
  fax: "080-42516600",
  missCallNumber: "080-42516666",
  mobileNumber: "9532333122",
  website: "www.chanreicr.com | www.mychanreclinic.com",
  labWebsite: "www.chanrelabresults.com",
  code: "",
};

const PrescriptionPreviewCard = ({ centerInfo = {}, patient, prescription }) => {
  const mergedCenter = { ...DEFAULT_CENTER_INFO, ...centerInfo };
  const ageGender = [
    patient?.age ? `${patient.age}` : null,
    patient?.gender || null,
  ]
    .filter(Boolean)
    .join(" / ");

  const toDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value, withTime = false) => {
    const date = toDate(value);
    if (!date) return "—";
    return withTime
      ? date.toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : date.toLocaleDateString("en-GB");
  };

  const prescribedDate = formatDate(prescription?.prescribedDate);
  const reportGenerated = formatDate(prescription?.reportGeneratedAt, true);
  const medications = Array.isArray(prescription?.medications)
    ? prescription.medications
    : [];
  const tests = Array.isArray(prescription?.tests) ? prescription.tests : [];

  return (
    <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-blue-50 to-white px-6 py-6 text-center border-b border-blue-100">
        <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-[0.12em] uppercase">
          {mergedCenter.name}
        </h2>
        <p className="text-[10px] sm:text-[11px] text-slate-600 mt-2 max-w-3xl mx-auto leading-relaxed">
          {mergedCenter.subTitle}
        </p>
        <div className="mt-3 space-y-1 text-[11px] text-slate-700">
          <p>{mergedCenter.address}</p>
          <p>
            <span className="font-medium">Phone:</span> {mergedCenter.phone}
            {mergedCenter.fax ? ` | Fax: ${mergedCenter.fax}` : ""}
          </p>
          <p>
            <span className="font-medium">Email:</span> {mergedCenter.email}
            {mergedCenter.website ? ` | ${mergedCenter.website}` : ""}
          </p>
          <p>
            <span className="font-medium">Lab:</span> {mergedCenter.labWebsite}
            {mergedCenter.missCallNumber ? ` | Missed Call: ${mergedCenter.missCallNumber}` : ""}
            {mergedCenter.mobileNumber ? ` | Appointment: ${mergedCenter.mobileNumber}` : ""}
          </p>
          {mergedCenter.code && (
            <p className="uppercase tracking-[0.3em] text-slate-500">Center Code: {mergedCenter.code}</p>
          )}
        </div>
      </div>

      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500">Patient Name</span>
            <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800 font-medium">
              {patient?.name || "—"}
            </div>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500">Patient ID</span>
            <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800">
              {patient?.uhId || patient?._id || "—"}
            </div>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500">Age / Gender</span>
            <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800">
              {ageGender || "—"}
            </div>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500">Prescribed Date</span>
            <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800">
              {prescribedDate}
            </div>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500">Diagnosis</span>
            <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800">
              {prescription?.diagnosis || "—"}
            </div>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500">Report Generated</span>
            <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800">
              {reportGenerated}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 overflow-x-auto">
        <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-xs">
          <thead className="bg-slate-100 uppercase tracking-widest text-[10px] text-slate-600">
            <tr>
              <th className="border-b border-slate-200 px-3 py-3 text-left">Medicine</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left">Dose</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left">Frequency</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left">Duration</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {medications.length === 0 ? (
              <tr>
                <td colSpan={5} className="border-t border-slate-200 px-3 py-3 text-center text-slate-500">
                  No medicines added.
                </td>
              </tr>
            ) : medications.map((med, idx) => {
              const name = med.drugName || med.name || med.medicine || "—";
              const dose = med.dose || med.dosage || "—";
              const frequency = med.frequency || med.frequncy || med.freq || "—";
              const duration = med.duration || med.course || "—";
              const instruction = med.instructions || med.instruction || "—";
              return (
              <tr key={`preview-med-${idx}`} className="bg-white">
                <td className="border-t border-slate-200 px-3 py-3 text-slate-800 font-medium">
                    {name}
                </td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-800">
                    {dose}
                </td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-800">
                    {frequency}
                </td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-800">
                    {duration}
                </td>
                <td className="border-t border-slate-200 px-3 py-3 text-slate-800">
                    {instruction}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-[0.2em] mb-3">
          Tests & Follow-up
        </div>
        {tests.length === 0 ? (
          <div className="text-xs text-slate-500">No tests prescribed.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-xs">
              <thead className="bg-slate-100 uppercase tracking-widest text-[10px] text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3 text-left">Test Name</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left">Instruction</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test, idx) => (
                  <tr key={`preview-test-${idx}`} className="bg-white">
                    <td className="border-t border-slate-200 px-3 py-3 text-slate-800 font-medium">
                      {test.name || "—"}
                    </td>
                    <td className="border-t border-slate-200 px-3 py-3 text-slate-800">
                      {test.instruction || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Follow-up Instruction</span>
          <div className="px-3 py-2 min-h-[38px] rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600">
            {prescription?.followUpInstruction || "—"}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Prescribed By</span>
            <div className="px-3 py-2 min-h-[38px] rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600">
              {prescription?.prescribedBy || "—"}
            </div>
            {(prescription?.preparedByCredentials || prescription?.medicalCouncilNumber) && (
              <div className="mt-2 px-3 py-2 min-h-[38px] rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600 space-y-1">
                {prescription?.preparedByCredentials && (
                  <div>Credentials: {prescription.preparedByCredentials}</div>
                )}
                {prescription?.medicalCouncilNumber && (
                  <div>Medical Council Reg. No.: {prescription.medicalCouncilNumber}</div>
                )}
              </div>
            )}
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Notes</span>
            <div className="px-3 py-2 min-h-[38px] rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600">
              {prescription?.notes || prescription?.followUpInstruction || "—"}
            </div>
            <div className="mt-2">
              <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Printed By</span>
              <div className="px-3 py-2 min-h-[38px] rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600">
                {prescription?.printedBy || prescription?.preparedBy || "—"}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 h-px bg-slate-200" />
        <div className="mt-4 text-[10px] text-slate-500 uppercase tracking-[0.4em] text-right">
          Doctor Signature
        </div>
        <div className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Lifestyle • Nutrition • Physiotherapy • Allergy Care
        </div>
      </div>
    </div>
  );
};

const TABS = ["Overview", "Follow Up", "Prescription", "History", "Medications"];

const ViewProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [centerInfo, setCenterInfo] = useState(DEFAULT_CENTER_INFO);
  const [centerLoading, setCenterLoading] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);



    const { 
    patientDetails, 
    patientHistory: history, 
    tests,
    patientTestRequests: testRequests,
    patientFollowUps: followUps,
    allergicRhinitis,
    atopicDermatitis,
    allergicConjunctivitis,
    allergicBronchitis,
    gpe,
    prescriptions,
    prescriptionsLoading,
    prescriptionsError,
    loading,
    error,
    patientHistoryLoading: historyLoading,
    patientHistoryError: historyError,
    testsLoading,
    testsError
  } = useSelector(state => state.doctor);

  // Extract patient data from the new structure
  const patient = patientDetails?.patient || patientDetails;

  const prescriptionList = useMemo(
    () => (Array.isArray(prescriptions) ? prescriptions : []),
    [prescriptions]
  );

  const resolvedCenterInfo = useMemo(() => {
    const center = patient?.centerId;
    if (!center) return DEFAULT_CENTER_INFO;
    return {
      name: center.name || DEFAULT_CENTER_INFO.name,
      subTitle: DEFAULT_CENTER_INFO.subTitle,
      address:
        [center.address, center.location]
          .filter(Boolean)
          .join(", ") || DEFAULT_CENTER_INFO.address,
      phone: center.phone || DEFAULT_CENTER_INFO.phone,
      fax: center.fax || DEFAULT_CENTER_INFO.fax,
      email: center.email || DEFAULT_CENTER_INFO.email,
      website: center.website || DEFAULT_CENTER_INFO.website,
    };
  }, [patient?.centerId]);

  // Helper functions for payment status checking
  const isReportAccessible = (request) => {
    const isTestCompleted = ['Testing_Completed', 'Billing_Paid', 'Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(request.status);
    const isPaymentComplete = request.billing ?
      (request.billing.amount || 0) - (request.billing.paidAmount || 0) <= 0 : true;

    // Allow access if either tests are completed OR payment is complete
    return isTestCompleted || isPaymentComplete;
  };

  const getLockReason = (request) => {
    const isTestCompleted = ['Testing_Completed', 'Billing_Paid', 'Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(request.status);
    const isPaymentComplete = request.billing ?
      (request.billing.amount || 0) - (request.billing.paidAmount || 0) <= 0 : true;

    const reasons = [];
    if (!isTestCompleted) reasons.push('Tests not fully completed');
    if (!isPaymentComplete) reasons.push('Payment not fully completed');

    return reasons.join(' and ');
  };
  

  
  // Handle assigning doctor to patient
  const handleAssignDoctor = async () => {
    if (!user || !user._id || !patient || !patient._id) {
      toast.error('Unable to assign doctor. Please try again.');
      return;
    }

    try {
      const response = await API.put(`/patients/${patient._id}`, {
        assignedDoctor: user._id
      });

      if (response.status === 200) {
        toast.success('Successfully assigned as doctor to this patient!');
        // Refresh patient data
        dispatch(fetchPatientDetails(id));
      } else {
        toast.error(response.data?.message || 'Failed to assign doctor');
      }
    } catch (error) {
      toast.error('Failed to assign doctor. Please try again.');
    }
  };
  
  // Get current user from auth state
  const { user } = useSelector((state) => state.auth);
  const resolveCenterId = () => {
    if (!user) return null;

    if (user.centerId) {
      if (typeof user.centerId === 'object' && user.centerId._id) {
        return user.centerId._id;
      }
      if (typeof user.centerId === 'string') {
        return user.centerId;
      }
    }

    if (user.centerID) return user.centerID;
    if (user.center_id) return user.center_id;
    if (user.center && user.center._id) return user.center._id;

    return null;
  };

  useEffect(() => {
    const fetchCenterInfo = async () => {
      if (!user) return;

      const centerId = resolveCenterId();

      if (!centerId) {
        if (user.centerCode || user.hospitalName) {
          setCenterInfo((prev) => ({
            ...prev,
            code: user.centerCode || prev.code,
            name: user.hospitalName || prev.name,
          }));
        }
        return;
      }

      setCenterLoading(true);
      try {
        const response = await API.get(`/centers/${centerId}`);
        const center = response.data || {};
        const formattedAddress = [center.address, center.location]
          .filter(Boolean)
          .join(', ');

        setCenterInfo((prev) => ({
          ...prev,
          name: center.name || prev.name,
          address: formattedAddress || prev.address,
          email: center.email || prev.email,
          phone: center.phone || prev.phone,
          fax: center.fax || prev.fax,
          missCallNumber: center.missCallNumber || prev.missCallNumber,
          mobileNumber: center.mobileNumber || prev.mobileNumber,
          website: center.website || prev.website,
          labWebsite: center.labWebsite || prev.labWebsite,
          code: center.code || prev.code,
        }));
      } catch (centerError) {
        console.error('Failed to fetch center info', centerError);
      } finally {
        setCenterLoading(false);
      }
    };

    fetchCenterInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleViewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionModal(true);
  };

  const handleClosePrescriptionPreview = () => {
    setShowPrescriptionModal(false);
    setSelectedPrescription(null);
  };

  const handleDownloadPrescription = (prescription) => {
    if (!prescription) return;
    if (!patient) {
      toast.warn('Patient details are still loading. Please try again.');
      return;
    }

    const mergedCenter = { ...DEFAULT_CENTER_INFO, ...centerInfo };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    let cursorY = 60;

    const toDate = (value) => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const formatDate = (value, withTime = false) => {
      const date = toDate(value);
      if (!date) return '-';
      return withTime
        ? date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : date.toLocaleDateString('en-GB');
    };

    const medications = Array.isArray(prescription.medications) ? prescription.medications : [];
    const tests = Array.isArray(prescription.tests) ? prescription.tests : [];

    const firstFollowUp = prescription.followUpInstruction || '-';
    const preparedBy = prescription.preparedBy || prescription.prescribedBy || '-';
    const printedBy = prescription.printedBy || preparedBy || '-';
    const credentials = prescription.preparedByCredentials || '';
    const councilNumber = prescription.medicalCouncilNumber || '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(mergedCenter.name, 40, cursorY);
    cursorY += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const subTitleLines = doc.splitTextToSize(mergedCenter.subTitle, 520);
    subTitleLines.forEach((line) => {
      doc.text(line, 40, cursorY);
      cursorY += 14;
    });
    cursorY += 6;

    const contactLines = [
      mergedCenter.address,
      `Phone: ${mergedCenter.phone || '-'}${mergedCenter.fax ? ` | Fax: ${mergedCenter.fax}` : ''}`,
      `Email: ${mergedCenter.email || '-'}${mergedCenter.website ? ` | ${mergedCenter.website}` : ''}`,
      `Lab: ${mergedCenter.labWebsite || '-'}${mergedCenter.missCallNumber ? ` | Missed Call: ${mergedCenter.missCallNumber}` : ''}${mergedCenter.mobileNumber ? ` | Appointment: ${mergedCenter.mobileNumber}` : ''}`,
    ];

    contactLines.forEach((line) => {
      if (!line) return;
      const wrapped = doc.splitTextToSize(line, 520);
      wrapped.forEach((wrappedLine) => {
        doc.text(wrappedLine, 40, cursorY);
        cursorY += 14;
      });
    });
    cursorY += 10;

    doc.setFont('helvetica', 'bold');
    const patientInfo = [
      `Patient Name: ${patient?.name || '-'}`,
      `Patient ID: ${patient?.uhId || patient?._id || '-'}`,
      `Age/Gender: ${patient?.age || '-'} ${patient?.gender ? '/ ' + patient.gender : ''}`,
      `Diagnosis: ${prescription?.diagnosis || '-'}`,
      `Prescribed By: ${prescription?.prescribedBy || '-'}`,
      `Prescribed Date: ${formatDate(prescription?.prescribedDate)}`,
      `Report Generated: ${formatDate(prescription?.reportGeneratedAt, true)}`,
    ];
    patientInfo.forEach((info) => {
      doc.text(info, 40, cursorY);
      cursorY += 16;
    });

    const head = [['Drug Name', 'Dose', 'Duration', 'Frequency', 'Instructions', 'Adverse Effect']];
    const medsBody = medications.length > 0
      ? medications.map((med) => [
          med.drugName || med.name || med.medicine || '-',
          med.dose || med.dosage || '-',
          med.duration || '-',
          med.frequency || med.freq || '-',
          med.instructions || med.instruction || '-',
          med.adverseEvent || med.adverseEffect || '-',
        ])
      : [['-', '-', '-', '-', '-', '-']];

    autoTable(doc, {
      head,
      body: medsBody,
      startY: cursorY + 10,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [226, 232, 240], textColor: 15, fontStyle: 'bold' },
    });

    let currentY = doc.lastAutoTable?.finalY || cursorY + 60;

    if (tests.length > 0) {
      currentY += 24;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Prescribed Tests', 40, currentY);

      const testsBody = tests.map((test) => [test.name || '-', test.instruction || '-']);
      autoTable(doc, {
        head: [['Test Name', 'Instruction']],
        body: testsBody,
        startY: currentY + 10,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [226, 232, 240], textColor: 15, fontStyle: 'bold' },
      });
      currentY = doc.lastAutoTable?.finalY || currentY + 40;
    }

    currentY += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Follow-up Instruction', 40, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const followUpLines = doc.splitTextToSize(firstFollowUp, 520);
    followUpLines.forEach((line) => {
      currentY += 14;
      doc.text(line, 40, currentY);
    });

    currentY += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Prepared By', 40, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    currentY += 14;
    doc.text(`Prepared By: ${preparedBy}`, 40, currentY);
    if (credentials) {
      currentY += 14;
      doc.text(`Credentials: ${credentials}`, 40, currentY);
    }
    if (councilNumber) {
      currentY += 14;
      doc.text(`Medical Council Reg. No.: ${councilNumber}`, 40, currentY);
    }
    currentY += 18;
    doc.text(`Printed By: ${printedBy}`, 40, currentY);

    currentY += 28;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(`For ${mergedCenter.name}`, 40, currentY);
    doc.text('Doctor Signature', 420, currentY);

    currentY += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Lifestyle • Nutrition • Physiotherapy • Allergy Care', 150, currentY + 12);

    const fileName = `${(patient?.name || 'patient').replace(/\s+/g, '_')}_prescription.pdf`;
    doc.save(fileName);
  };
  
  // Check if doctor can edit this patient
  const editPermission = canDoctorEditPatient(patient, user);
  const editRestrictionMessage = getEditRestrictionMessage(patient, user);

  // Debug logging
  console.log('🔍 Doctor ViewProfile Debug:', {
    patientId: patient?._id,
    patient: patient,
    user: user,
    editPermission: editPermission,
    patientRegisteredBy: patient?.registeredBy,
    patientAssignedDoctor: patient?.assignedDoctor,
    userRole: user?.role,
    userId: user?._id
  });




  


  // Doctors typically can't delete patients - this functionality is removed

  useEffect(() => {
    // Check if ID is valid (not undefined, null, or empty string)
    if (!id || id === 'undefined' || id === 'null' || id === '') {
      return;
    }
    
    if (id) {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Check for refresh parameter (from successful test submission)
      const urlParams = new URLSearchParams(location.search);
      const refreshParam = urlParams.get('refresh');
      const tabParam = urlParams.get('tab');
      
      if (refreshParam) {
        // Clear the refresh parameter from URL
        window.history.replaceState({}, '', `/dashboard/Doctor/patients/profile/ViewProfile/${id}`);
      }
      
      // Handle tab parameter
      if (tabParam && TABS.includes(tabParam)) {
        setActiveTab(tabParam);
        // Clear the tab parameter from URL after setting it
        window.history.replaceState({}, '', `/dashboard/Doctor/patients/profile/ViewProfile/${id}`);
      }

      // Fetch patient details first (includes history, medications)
      dispatch(fetchPatientDetails(id));
      
      // Fetch test requests for Lab Report Status tab
      dispatch(fetchPatientTestRequests(id));
      
      // Fetch laboratory tests for Investigation tab
      dispatch(fetchTests(id));
      
      // Fetch additional follow-up data that's not included in patient details
      dispatch(fetchPatientFollowUps(id));
      dispatch(fetchAllergicRhinitis(id));
      dispatch(fetchAllergicConjunctivitis(id));
      dispatch(fetchAllergicBronchitis(id));
      dispatch(fetchAtopicDermatitis(id));
      dispatch(fetchGPE(id));
      dispatch(fetchPrescriptions(id));
    }
  }, [dispatch, id, navigate, location.search]);



  if (!id) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-xs">No patient ID provided in the URL.</p>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 sm:p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600 text-xs">Loading patient information...</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      </div>
    </div>
  );

  if (!patient) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-xs">
            {loading ? 'Loading patient information...' : 'Patient not found or failed to load.'}
          </p>
          {error && <p className="text-red-500 mt-2 text-xs">Error: {error}</p>}
        </div>
      </div>
    </div>
  );

  // Ensure patient is an object with expected properties
  if (typeof patient !== 'object' || patient === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-xs">Invalid patient data format.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-3 md:p-6">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
          <div className="mb-6 sm:mb-8">
              <button
                              onClick={() => navigate('/dashboard/Doctor/patients/PatientList')}
              className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
              >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients List
              </button>
          </div>

          {/* Patient Header */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-md font-bold text-slate-800 mb-2">{patient?.name || 'Patient Name'}</h1>
                                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-slate-600 text-xs">
                      {patient?.gender && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.gender}
                        </span>
                      )}
                      {patient?.age && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.age} years
                        </span>
                      )}
                      {patient?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.phone}
                        </span>
                      )}
                      {patient?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.email}
                        </span>
                      )}
                      {patient?.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                          {patient.address}
                        </span>
                      )}
                    </div>
                </div>
            </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
                {editPermission.canEdit ? (
                  <button
                    onClick={() => navigate(`/dashboard/Doctor/patients/EditPatient/${patient?._id}`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 justify-center text-xs"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Patient
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="bg-gray-400 text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center gap-2 justify-center text-xs cursor-not-allowed"
                    >
                      <Clock className="h-4 w-4" />
                      Edit Patient
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {editRestrictionMessage}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/dashboard/Doctor/AddTestRequest?patientId=${patient?._id}`)}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 justify-center text-xs"
                >
                  <FileText className="h-4 w-4" />
                  Test Request
                </button>
                {/* Delete button removed - doctors can't delete patients */}
              </div>
            </div>
          </div>




          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-2 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex-1 text-xs ${
                    activeTab === tab
                      ? "bg-blue-500 text-white"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
          </div>
        </div>

          {/* Tab Content */}
          {activeTab === "Overview" && (
            <div className="space-y-6 sm:space-y-8">
              {/* Patient Details Card */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Patient Details
            </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Complete patient information and contact details
                  </p>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                        <p className="text-slate-800 font-medium text-xs">{patient.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Mobile</label>
                        <p className="text-slate-800 text-xs">
                          {typeof patient.phone === 'string' ? patient.phone :
                           typeof patient.contact === 'string' ? patient.contact : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                        <p className="text-slate-800 text-xs">{typeof patient.email === 'string' ? patient.email : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                        <p className="text-slate-800 text-xs">{typeof patient.address === 'string' ? patient.address : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Assigned Doctor</label>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-800 text-xs">
                            {patient.assignedDoctor?.name || 'Not assigned'}
                          </p>
                          {!patient.assignedDoctor && user && (
                            <button
                              onClick={() => handleAssignDoctor()}
                              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                            >
                              Assign Me
                            </button>
                          )}
                        </div>

                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                        <p className="text-slate-800 capitalize text-xs">{patient.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Age</label>
                        <p className="text-slate-800 text-xs">{patient.age ? `${patient.age} years` : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Center</label>
                        <p className="text-slate-800 text-xs">
                          {patient.centerId?.name ||
                           (typeof patient.centerCode === 'string' ? patient.centerCode : 'N/A')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "Follow Up" && (
            <div className="space-y-6 sm:space-y-8">
              {/* Allergic Rhinitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">Allergic Rhinitis</h2>
                  <button
                    onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/AddAllergicRhinitis/${patient._id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                  >
                    Add Follow Up
                  </button>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {allergicRhinitis && allergicRhinitis.length > 0 ? (
                          allergicRhinitis.map((rhinitis, idx) => (
                            <tr key={rhinitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {rhinitis.updatedAt ? new Date(rhinitis.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                <button
                                  onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/ViewAllergicRhinitis/${patient._id}`)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No allergic rhinitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
            </div>
          </div>
              </div>

              {/* Atopic Dermatitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">Atopic Dermatitis</h2>
                                <button
                                  onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/AtopicDermatitis/${patient._id}`)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                                >
                                  Add Follow Up
                                </button>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Symptoms</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient ID</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated By</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {atopicDermatitis && atopicDermatitis.length > 0 ? (
                          atopicDermatitis.map((dermatitis, idx) => (
                            <tr key={dermatitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {dermatitis.createdAt ? new Date(dermatitis.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{dermatitis.symptoms || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerId?.name || patient.centerName || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient._id?.toString() || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {typeof dermatitis.updatedBy === 'string' ? dermatitis.updatedBy : 
                                 typeof dermatitis.updatedBy === 'object' && dermatitis.updatedBy?.name ? dermatitis.updatedBy.name : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                <button
                                  onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/ViewAtopicDermatitis/${dermatitis._id}`)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No atopic dermatitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Allergic Conjunctivitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">Allergic Conjunctivitis</h2>
                                <button
                                  onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/AddAllergicConjunctivitis/${patient._id}`)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                                >
                                  Add Follow Up
                                </button>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {allergicConjunctivitis && allergicConjunctivitis.length > 0 ? (
                          allergicConjunctivitis.map((conjunctivitis, idx) => (
                            <tr key={conjunctivitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {conjunctivitis.updatedAt ? new Date(conjunctivitis.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                <button
                                  onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/ViewAllergicConjunctivitis/${patient._id}`)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No allergic conjunctivitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
              </div>
            </div>
          </div>

              {/* Allergic Bronchitis */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">Allergic Bronchitis</h2>
                            <button
                              onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/AddAllergicBronchitis/${patient._id}`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                            >
                              Add Follow Up
                            </button>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {allergicBronchitis && allergicBronchitis.length > 0 ? (
                          allergicBronchitis.map((bronchitis, idx) => (
                            <tr key={bronchitis._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {bronchitis.updatedAt ? new Date(bronchitis.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                            <button
                onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/ViewAllergicBronchitis/${patient._id}`)}
                className="text-blue-600 hover:text-blue-900 font-medium"
              >
                View
              </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No allergic bronchitis records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
            </div>
          </div>
        </div>

              {/* GPE */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-800">GPE</h2>
                        <button
                          onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/AddGPE/${patient._id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                        >
                          Add Follow Up
                        </button>
          </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {gpe && gpe.length > 0 ? (
                          gpe.map((gpe, idx) => (
                            <tr key={gpe._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.age}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.centerCode || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{patient.phone || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                {gpe.updatedAt ? new Date(gpe.updatedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                                        <button
                      onClick={() => navigate(`/dashboard/Doctor/patients/FollowUp/ViewGPE/${patient._id}`)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View
                    </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                                                    <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-xs">No GPE records found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
            </div>
          )}
          {activeTab === "Prescription" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                  <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                  Prescription & Medications
                </h2>
                <p className="text-slate-600 mt-1 text-xs">
                  Current and past medications prescribed to the patient
                </p>
              </div>
              <div className="p-4 sm:p-6">
                {prescriptionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs">Loading medications...</p>
                  </div>
                ) : prescriptionsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-xs">{prescriptionsError}</p>
                  </div>
                ) : prescriptionList.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-xs">No medications found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed By</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Medicines</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Instructions</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {prescriptionList.map((prescription, idx) => {
                          const meds = Array.isArray(prescription.medications)
                            ? prescription.medications
                            : [];
                          const firstMed = meds[0] || {};
                          const firstMedName = firstMed.drugName || firstMed.name || firstMed.medicine || '—';
                          const medsCount = meds.length;
                          const displayDate = prescription.prescribedDate
                            ? new Date(prescription.prescribedDate).toLocaleDateString()
                            : 'N/A';
                          const instructionPreview = meds
                            .map((med) => med.instructions || med.instruction)
                            .filter(Boolean)
                            .join('; ');
                          return (
                            <tr key={`prescription-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{displayDate}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{prescription.prescribedBy || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                <div className="font-semibold text-slate-800">{firstMedName}</div>
                                {medsCount > 1 && (
                                  <div className="text-slate-500 text-[11px]">+ {medsCount - 1} more medicine{medsCount - 1 === 1 ? '' : 's'}</div>
                                )}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                {instructionPreview || '—'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                                  <button
                                    onClick={() => handleViewPrescription(prescription)}
                                    className="inline-flex items-center justify-center px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDownloadPrescription(prescription)}
                                    className="inline-flex items-center justify-center px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    Download
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lab Report Status Tab */}
          {activeTab === "Lab Report Status" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Lab Report Status
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">Track laboratory test request status and results</p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/Doctor/patients/AddTest/${patient._id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                >
                  Add Test Request
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Requested</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Test Type</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lab</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Report</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {testRequests && testRequests.length > 0 ? (
                        testRequests.map((request, idx) => (
                          <tr key={request._id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                              {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                              {request.testType || 'General Lab Test'}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                request.status === 'Completed' || request.status === 'Report_Sent'
                                  ? 'bg-green-100 text-green-800' 
                                  : request.status === 'In_Lab_Testing' || request.status === 'Testing_Completed'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : request.status === 'Billing_Pending' || request.status === 'Billing_Generated'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status?.replace(/_/g, ' ') || 'Pending'}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">
                              {request.labStaffId?.staffName || request.centerName || 'Not Assigned'}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">
                              {request.reportFilePath ? (
                                <span className="text-green-600 font-medium">Available</span>
                              ) : (
                                <span className="text-gray-500">Pending</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">
                              {request.reportFilePath ? (
                                isReportAccessible(request) ? (
                                  <button
                                    onClick={() => navigate(`/dashboard/doctor/test-request/${request._id}`)}
                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                  >
                                    Download
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Locked
                                    </span>
                                    <span className="text-red-600 text-xs" title={getLockReason(request)}>
                                      {getLockReason(request)}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-xs">No lab reports found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "History" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Patient History
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">Medical history, family history, and clinical notes</p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/Doctor/patients/AddHistory/${patient._id}`)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                >
                  Add History
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs">Loading history...</p>
                  </div>
                ) : historyError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-xs">{historyError}</p>
                  </div>
                ) : (history || []).length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-xs">No history records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(history || []).map((historyItem, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <h3 className="text-sm font-medium text-slate-800">
                            Medical History Record #{idx + 1}
                          </h3>
                          <div className="flex gap-2">
                            <span className="text-xs text-slate-500">
                              {historyItem.createdAt ? new Date(historyItem.createdAt).toLocaleDateString() : 
                               historyItem.date ? new Date(historyItem.date).toLocaleDateString() : 'N/A'}
                            </span>
                            <button
                              onClick={() => navigate(`/dashboard/Doctor/patients/AddHistory/ViewHistory/${patient._id}`)}
                              className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => navigate(`/dashboard/Doctor/patients/AddHistory/EditHistory/${patient._id}/${historyItem._id}`)}
                              className="text-green-600 hover:text-green-900 text-xs font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <h4 className="font-medium text-slate-700 mb-2">Allergic Conditions</h4>
                            <p className="text-slate-600"><span className="font-medium">Hay Fever:</span> {historyItem.hayFever || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Asthma:</span> {historyItem.asthma || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Food Allergies:</span> {historyItem.foodAllergies || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Drug Allergy:</span> {historyItem.drugAllergy || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Eczema/Rashes:</span> {historyItem.eczemaRashes || 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-700 mb-2">Respiratory</h4>
                            <p className="text-slate-600"><span className="font-medium">Breathing Problems:</span> {historyItem.breathingProblems || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Sinus Trouble:</span> {historyItem.sinusTrouble || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Hives/Swelling:</span> {historyItem.hivesSwelling || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Asthma Type:</span> {historyItem.asthmaType || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Exercise Induced:</span> {historyItem.exerciseInducedSymptoms || 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-700 mb-2">Medical History</h4>
                            <p className="text-slate-600"><span className="font-medium">Hypertension:</span> {historyItem.hypertension || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Diabetes:</span> {historyItem.diabetes || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Hospital Admissions:</span> {historyItem.hospitalAdmission || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Family Smoking:</span> {historyItem.familySmoking || 'N/A'}</p>
                            <p className="text-slate-600"><span className="font-medium">Pets at Home:</span> {historyItem.petsAtHome || 'N/A'}</p>
                          </div>
                        </div>
                        {/* Show triggers if available */}
                        {(historyItem.triggersUrtis || historyItem.triggersColdWeather || historyItem.triggersPollen || 
                          historyItem.triggersSmoke || historyItem.triggersExercise || historyItem.triggersPets || 
                          historyItem.triggersOthers) && (
                          <div className="mt-4 pt-3 border-t border-slate-200">
                            <h4 className="font-medium text-slate-700 mb-2">Triggers</h4>
                            <div className="flex flex-wrap gap-2">
                              {historyItem.triggersUrtis && <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">URTI</span>}
                              {historyItem.triggersColdWeather && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Cold Weather</span>}
                              {historyItem.triggersPollen && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pollen</span>}
                              {historyItem.triggersSmoke && <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Smoke</span>}
                              {historyItem.triggersExercise && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Exercise</span>}
                              {historyItem.triggersPets && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Pets</span>}
                              {historyItem.triggersOthers && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">{historyItem.triggersOthers}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Investigation Tab */}
          {activeTab === "Investigation" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Laboratory Investigations
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">Detailed laboratory test results and analysis</p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/Doctor/patients/AddTest/${patient._id}`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                >
                  Add Investigation
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {testsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs">Loading laboratory investigations...</p>
                  </div>
                ) : testsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-xs">{testsError}</p>
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                                          <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CBC</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hb</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">TC</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">DC</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Neutrophils</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Eosinophil</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lymphocytes</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Monocytes</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Platelets</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ESR</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serum Creatinine</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serum IgE Levels</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">C3, C4 Levels</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ANA (IF)</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Urine Routine</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Allergy Panel</th>
                        </tr>
                      </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tests && tests.length > 0 ? (
                        tests.map((test, idx) => (
                          <tr key={test._id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{test.date ? new Date(test.date).toLocaleDateString() : test.createdAt ? new Date(test.createdAt).toLocaleDateString() : ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.CBC || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Hb || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.TC || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.DC || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Neutrophils || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Eosinophil || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Lymphocytes || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Monocytes || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.Platelets || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.ESR || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.SerumCreatinine || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.SerumIgELevels || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.C3C4Levels || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.ANA_IF || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.UrineRoutine || ''}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-800">{test.AllergyPanel || ''}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={17} className="px-4 py-8 text-center text-slate-500">
                            <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-xs sm:text-sm">No investigations found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </div>
          )}

          {/* Medications Tab */}
          {activeTab === "Medications" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Medications
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">Current and past medications prescribed to the patient</p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/Doctor/patients/profile/AddMedications/${patient._id}`)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs w-full sm:w-auto"
                >
                  Create / Print Prescription
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {prescriptionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs">Loading medications...</p>
                  </div>
                ) : prescriptionsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-xs">{prescriptionsError}</p>
                  </div>
                ) : prescriptionList.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-xs">No medications found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed Date</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed By</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Medicines</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Instructions</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {prescriptionList.map((prescription, idx) => {
                          const meds = Array.isArray(prescription.medications)
                            ? prescription.medications
                            : [];
                          const firstMedName = meds[0]?.drugName || meds[0]?.name || meds[0]?.medicine || '—';
                          const medsCount = meds.length;
                          const displayDate = prescription.prescribedDate
                            ? new Date(prescription.prescribedDate).toLocaleDateString()
                            : 'N/A';
                          const instructionPreview = meds
                            .map((med) => med.instructions || med.instruction)
                            .filter(Boolean)
                            .join('; ');
                          return (
                            <tr key={`prescription-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{displayDate}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{prescription.prescribedBy || 'N/A'}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                <div className="font-semibold text-slate-800">{firstMedName}</div>
                                {medsCount > 1 && (
                                  <div className="text-slate-500 text-[11px]">+ {medsCount - 1} more medicine{medsCount - 1 === 1 ? '' : 's'}</div>
                                )}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                {instructionPreview || '—'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                                  <button
                                    onClick={() => handleViewPrescription(prescription)}
                                    className="inline-flex items-center justify-center px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDownloadPrescription(prescription)}
                                    className="inline-flex items-center justify-center px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    Download
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPrescriptionModal && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Prescription Preview</h3>
                <p className="text-xs text-slate-500">
                  {patient?.name ? `Patient: ${patient.name}` : 'Patient details'}
                </p>
              </div>
              <button
                onClick={handleClosePrescriptionPreview}
                className="rounded-full p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Close prescription preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-slate-100/80 px-6 py-3 text-xs text-slate-600 border-b border-slate-200 flex items-center gap-2">
              {centerLoading ? (
                <span>Refreshing center information…</span>
              ) : (
                <span>Center information auto-filled from registered profile.</span>
              )}
            </div>
            <div className="p-6 bg-slate-50">
              <PrescriptionPreviewCard
                centerInfo={centerInfo}
                patient={patient}
                prescription={selectedPrescription}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewProfile; 