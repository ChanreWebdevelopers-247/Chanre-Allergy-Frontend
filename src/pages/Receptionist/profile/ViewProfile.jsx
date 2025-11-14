import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReceptionistSinglePatient,
  fetchReceptionistPatientMedications,
  fetchReceptionistPatientHistory,
  fetchReceptionistPatientTests,
  fetchReceptionistFollowUps,
  fetchReceptionistAllergicRhinitis,
  fetchReceptionistAllergicConjunctivitis,
  fetchReceptionistAllergicBronchitis,
  fetchReceptionistAtopicDermatitis,
  fetchReceptionistGPE,
  fetchReceptionistPrescriptions,
  fetchReceptionistTestRequests
} from '../../../features/receptionist/receptionistThunks';
import { setTestRequests } from '../../../features/receptionist/receptionistSlice';
import ReceptionistLayout from '../ReceptionistLayout';
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  MapPin,
  Activity,
  Pill,
  FileText,
  Eye,
  Plus,
  AlertCircle,
  Mail,
  UserCheck,
  Edit,
  Clock,
  Paperclip,
  Download,
  Printer,
  X
} from 'lucide-react';
import { SERVER_CONFIG } from '../../../config/environment';
import API from '../../../services/api';
import { toast } from 'react-toastify';
import { openDocumentWithFallback } from '../../../utils/documentHelpers';
import { buildPrescriptionPrintHTML, openPrintPreview } from '../../../utils/prescriptionPrint';

const TABS = ["Overview", "Tests",  "Lab Reports", "Follow Up", "Prescription"];

const DEFAULT_CENTER_INFO = {
  name: "CHANRE RHEUMATOLOGY & IMMUNOLOGY CENTER & RESEARCH",
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

const DEFAULT_REMARKS = "Keep patient hydrated. Advise rest if fatigue worsens.";

const resolvePrescriptionDate = (prescription) =>
  prescription?.prescribedDate || prescription?.date || prescription?.createdAt || null;

const resolveReportGenerated = (prescription) =>
  prescription?.reportGeneratedAt || prescription?.updatedAt || null;

const resolvePrescribedBy = (prescription) =>
  prescription?.prescribedBy ||
  prescription?.doctorName ||
  prescription?.doctor ||
  prescription?.doctorId?.name ||
  prescription?.updatedBy?.name ||
  "";

const resolvePreparedBy = (prescription) =>
  prescription?.preparedBy ||
  prescription?.prepared_by ||
  resolvePrescribedBy(prescription) ||
  "";

const resolvePrintedBy = (prescription) =>
  prescription?.printedBy ||
  prescription?.printed_by ||
  prescription?.preparedBy ||
  prescription?.updatedBy?.name ||
  prescription?.doctorId?.name ||
  "";

const resolveFollowUpInstruction = (prescription) =>
  prescription?.followUpInstruction ||
  prescription?.testFollowupInstruction ||
  prescription?.followUp ||
  prescription?.instructions ||
  "";

const resolveRemarks = (prescription) =>
  prescription?.remarks || prescription?.notes || prescription?.instructions || DEFAULT_REMARKS;

const normalizePrescriptionMedications = (prescription) =>
  Array.isArray(prescription?.medications)
    ? prescription.medications.map((item) => ({
        name:
          item.drugName ||
          item.medicine ||
          item.name ||
          item.medicationName ||
          "—",
        dosage: [
          item.dose ||
            item.dosage ||
            item.dosageDetails ||
            item.medicineDose ||
            "",
          item.frequency || item.freq || item.medicineFrequency || "",
        ]
          .filter(Boolean)
          .join(" ")
          .trim(),
        duration: item.duration || item.period || item.medicineDuration || item.course || "—",
        instruction: item.instructions || item.instruction || "—",
      }))
    : [];

const normalizePrescriptionTests = (prescription) => {
  const possibleSources = [
    prescription?.tests,
    prescription?.test,
    prescription?.testDetails,
    prescription?.testList,
  ];

  const coerceToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return Object.values(value);
    return [value];
  };

  const rawList = coerceToArray(
    possibleSources.find((value) =>
      value && (Array.isArray(value) ? value.length > 0 : typeof value === "object" || value)
    )
  );

  return rawList
    .map((item) => {
      if (!item || typeof item !== "object") {
        const stringValue = String(item || "").trim();
        return stringValue
          ? {
              name: stringValue,
              instruction: "—",
            }
          : null;
      }

      const name =
        item.name ||
        item.testName ||
        item.test_name ||
        item.test ||
        item.title ||
        "—";

      const instruction =
        item.instruction ||
        item.instructions ||
        item.note ||
        item.description ||
        item.details ||
        "—";

      return {
        name: name || "—",
        instruction: instruction || "—",
      };
    })
    .filter(Boolean);
};

const PrescriptionPreviewCard = ({ centerInfo = {}, patient, prescription }) => {
  const mergedCenter = { ...DEFAULT_CENTER_INFO, ...centerInfo };
  const ageGender = [patient?.age ? `${patient.age}` : null, patient?.gender || null]
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

  const contactLine = (segments) => segments.filter(Boolean).join(" | ");

  const medications = normalizePrescriptionMedications(prescription);
  const tests = normalizePrescriptionTests(prescription);
  const followUpInstruction = resolveFollowUpInstruction(prescription) || "—";
  const remarks = resolveRemarks(prescription) || "—";
  const prescribedBy = resolvePrescribedBy(prescription) || "—";
  const preparedBy = resolvePreparedBy(prescription) || "—";
  const printedBy = resolvePrintedBy(prescription) || "—";
  const prescribedDate = formatDate(resolvePrescriptionDate(prescription));
  const reportGenerated = formatDate(resolveReportGenerated(prescription), true);
  const printedOn = formatDate(new Date(), true);

  return (
    <div className="bg-white border border-slate-400 rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-slate-400 px-6 py-6 text-center space-y-1">
        <h2 className="text-[16px] font-semibold uppercase tracking-[0.35em] text-slate-900">
          {mergedCenter.name}
        </h2>
        {mergedCenter.address ? (
          <p className="text-[11px] text-slate-700">{mergedCenter.address}</p>
        ) : null}
        {contactLine([
          mergedCenter.phone ? `Phone: ${mergedCenter.phone}` : "",
          mergedCenter.fax ? `Fax: ${mergedCenter.fax}` : "",
          mergedCenter.code ? `Center Code: ${mergedCenter.code}` : "",
        ]) ? (
          <p className="text-[11px] text-slate-700">
            {contactLine([
              mergedCenter.phone ? `Phone: ${mergedCenter.phone}` : "",
              mergedCenter.fax ? `Fax: ${mergedCenter.fax}` : "",
              mergedCenter.code ? `Center Code: ${mergedCenter.code}` : "",
            ])}
          </p>
        ) : null}
        {contactLine([
          mergedCenter.email ? `Email: ${mergedCenter.email}` : "",
          mergedCenter.website || "",
        ]) ? (
          <p className="text-[11px] text-slate-700">
            {contactLine([
              mergedCenter.email ? `Email: ${mergedCenter.email}` : "",
              mergedCenter.website || "",
            ])}
          </p>
        ) : null}
        {contactLine([
          mergedCenter.labWebsite ? `Lab: ${mergedCenter.labWebsite}` : "",
          mergedCenter.missCallNumber ? `Missed Call: ${mergedCenter.missCallNumber}` : "",
          mergedCenter.mobileNumber ? `Appointment: ${mergedCenter.mobileNumber}` : "",
        ]) ? (
          <p className="text-[11px] text-slate-700">
            {contactLine([
              mergedCenter.labWebsite ? `Lab: ${mergedCenter.labWebsite}` : "",
              mergedCenter.missCallNumber ? `Missed Call: ${mergedCenter.missCallNumber}` : "",
              mergedCenter.mobileNumber ? `Appointment: ${mergedCenter.mobileNumber}` : "",
            ])}
          </p>
        ) : null}
      </div>

      <div className="px-6 py-5 text-[12px] text-slate-800 space-y-6">
        <table className="w-full border border-slate-400">
          <tbody>
            <tr>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Patient Name
                </span>
                <span className="block mt-1 font-semibold">{patient?.name || "—"}</span>
              </td>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Patient ID / UHID
                </span>
                <span className="block mt-1">
                  {patient?.uhId || patient?.patientCode || patient?._id || "—"}
                </span>
              </td>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Age / Gender
                </span>
                <span className="block mt-1">{ageGender || "—"}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Diagnosis
                </span>
                <span className="block mt-1 whitespace-pre-line">
                  {prescription?.diagnosis || "—"}
                </span>
              </td>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Prescribed Date
                </span>
                <span className="block mt-1">{prescribedDate}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">
            Medicines
          </div>
          <table className="w-full border border-slate-400">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-400 px-3 py-2 text-left">Medicine</th>
                <th className="border border-slate-400 px-3 py-2 text-left">Dosage</th>
                <th className="border border-slate-400 px-3 py-2 text-left">Duration</th>
                <th className="border border-slate-400 px-3 py-2 text-left">Instruction</th>
              </tr>
            </thead>
            <tbody>
              {medications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border border-slate-400 px-3 py-3 text-center text-slate-500">
                    No medicines added.
                  </td>
                </tr>
              ) : (
                medications.map((med, idx) => (
                  <tr key={`preview-med-${idx}`} className="align-top">
                    <td className="border border-slate-400 px-3 py-2 text-slate-800 font-medium">
                      {med.name || "—"}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">
                      {med.dosage || "—"}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">
                      {med.duration || "—"}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">
                      {med.instruction || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">
            Tests &amp; Follow-up
          </div>
          <table className="w-full border border-slate-400">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-400 px-3 py-2 text-left">Test Name</th>
                <th className="border border-slate-400 px-3 py-2 text-left">Instruction</th>
              </tr>
            </thead>
            <tbody>
              {tests.length === 0 ? (
                <tr>
                  <td colSpan={2} className="border border-slate-400 px-3 py-3 text-center text-slate-500">
                    No tests prescribed.
                  </td>
                </tr>
              ) : (
                tests.map((test, idx) => (
                  <tr key={`preview-test-${idx}`} className="align-top">
                    <td className="border border-slate-400 px-3 py-2 text-slate-800 font-medium">
                      {test.name || "—"}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">
                      {test.instruction || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-300 px-3 py-3">
            <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Follow-up Instruction
            </span>
            <div className="mt-2 leading-relaxed text-slate-800 whitespace-pre-line">
              {followUpInstruction || "—"}
            </div>
          </div>
          <div className="border border-slate-300 px-3 py-3">
            <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Remarks
            </span>
            <div className="mt-2 leading-relaxed text-slate-800 whitespace-pre-line">
              {remarks || "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-300 px-3 py-3 space-y-1">
            <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Prescription Details
            </span>
            <div className="leading-relaxed text-slate-800">
              <div><strong>Prescribed By:</strong> {prescribedBy}</div>
              <div><strong>Prepared By:</strong> {preparedBy}</div>
              {prescription?.preparedByCredentials ? (
                <div>{prescription.preparedByCredentials}</div>
              ) : null}
              {prescription?.medicalCouncilNumber ? (
                <div>Medical Council Reg. No.: {prescription.medicalCouncilNumber}</div>
              ) : null}
            </div>
          </div>
          <div className="border border-slate-300 px-3 py-3 space-y-2">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Printed By
              </span>
              <div className="mt-2 leading-relaxed text-slate-800">{printedBy}</div>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Report Generated
              </span>
              <div className="mt-2 leading-relaxed text-slate-800">{reportGenerated}</div>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Printed On
              </span>
              <div className="mt-2 leading-relaxed text-slate-800">{printedOn}</div>
            </div>
            <div className="border-t border-slate-200 pt-4 text-[10px] uppercase tracking-[0.4em] text-right text-slate-500">
              Doctor Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Overview");
  const [dataFetched, setDataFetched] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const formatFileSize = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
  };

  const displayValue = (value, fallback = 'N/A') => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value;
  };

  const formatDuration = (duration, unit = 'months') => {
    if (duration === undefined || duration === null || duration === '') return null;
    return `Duration: ${duration} ${unit}`;
  };

  const formatRecordDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderHistoryField = (label, value, duration) => (
    <div className="p-3 bg-slate-50 rounded-lg" key={label}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-600">{label}:</span>
        <span className="text-sm text-slate-800 font-medium">{displayValue(value)}</span>
      </div>
      {duration ? (
        <div className="text-xs text-slate-500">
          {duration}
        </div>
      ) : null}
    </div>
  );

  const downloadDocument = async (doc) => {
    await openDocumentWithFallback({ doc, toast });
  };

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

  const {
    singlePatient: patient,
    medications,
    history,
    tests,
    testRequests,
    followUps,
    allergicRhinitis,
    atopicDermatitis,
    allergicConjunctivitis,
    allergicBronchitis,
    gpe,
    prescriptions,
    loading,
    error,
    patientLoading,
    patientError,
    historyLoading,
    historyError
  } = useSelector(state => state.receptionist);
  const { user } = useSelector((state) => state.auth);

  const resolvedCenterInfo = useMemo(() => {
    const center = patient?.centerId;
    if (!center || typeof center !== "object") {
      return DEFAULT_CENTER_INFO;
    }

    const formattedAddress = [center.address, center.location].filter(Boolean).join(", ");

    return {
      name: center.name || DEFAULT_CENTER_INFO.name,
      address: formattedAddress || DEFAULT_CENTER_INFO.address,
      email: center.email || DEFAULT_CENTER_INFO.email,
      phone: center.phone || DEFAULT_CENTER_INFO.phone,
      fax: center.fax || DEFAULT_CENTER_INFO.fax,
      missCallNumber: center.missCallNumber || DEFAULT_CENTER_INFO.missCallNumber,
      mobileNumber: center.mobileNumber || DEFAULT_CENTER_INFO.mobileNumber,
      website: center.website || DEFAULT_CENTER_INFO.website,
      labWebsite: center.labWebsite || DEFAULT_CENTER_INFO.labWebsite,
      code: center.code || DEFAULT_CENTER_INFO.code,
    };
  }, [patient?.centerId]);

  const printedByName = useMemo(() => {
    if (!user || typeof user !== "object") return null;
    return (
      user.name ||
      user.fullName ||
      user.username ||
      user.email ||
      (typeof user.getFullName === "function" ? user.getFullName() : null) ||
      null
    );
  }, [user]);

  const enrichPrescriptionForPrint = useCallback(
    (prescription) => {
      if (!prescription) return null;
      if (!printedByName) return prescription;

      const updatedBy =
        prescription.updatedBy && typeof prescription.updatedBy === "object"
          ? prescription.updatedBy
          : prescription.updatedBy
          ? { name: prescription.updatedBy }
          : undefined;

      return {
        ...prescription,
        printedBy: printedByName,
        printed_by: printedByName,
        printedByOverride: true,
        updatedBy,
      };
    },
    [printedByName]
  );

  const handleViewPrescription = useCallback(
    (prescription) => {
      if (!prescription) {
        toast.error("Unable to open this prescription. Please try again.");
        return;
      }

      const prepared = enrichPrescriptionForPrint(prescription) || prescription;
      setSelectedPrescription(prepared);
      setShowPrescriptionModal(true);
    },
    [enrichPrescriptionForPrint]
  );

  const handleClosePrescriptionModal = useCallback(() => {
    setShowPrescriptionModal(false);
    setSelectedPrescription(null);
  }, [setSelectedPrescription, setShowPrescriptionModal]);

  const handleDownloadPrescription = useCallback(
    (prescription) => {
      if (!prescription) {
        toast.error("Prescription data unavailable for printing.");
        return;
      }

      try {
        const prepared = enrichPrescriptionForPrint(prescription) || prescription;
        const html = buildPrescriptionPrintHTML({
          centerInfo: resolvedCenterInfo,
          patient,
          prescription: prepared,
          fallbackRemarks: DEFAULT_REMARKS,
          hideHeaderFooter: true,
        });

        openPrintPreview(html, {
          onClose: () => {
            console.log("🖨️ Print preview closed");
          },
        });
      } catch (printError) {
        console.error("❌ Failed to open prescription print preview:", printError);
        toast.error("Unable to open the print preview. Please try again.");
      }
    },
    [patient, resolvedCenterInfo, enrichPrescriptionForPrint]
  );

  useEffect(() => {
    // Check if ID is valid (not undefined, null, or empty string)
    if (!id || id === 'undefined' || id === 'null' || id === '') {
      console.log('❌ Invalid patient ID:', id);
      return;
    }

    console.log('🔍 ViewProfile mounted with patient ID:', id);

    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ No authentication token found');
      navigate('/login');
      return;
    }

    // Fetch all patient data
    const fetchData = async () => {
      try {
        console.log('🔍 Starting to fetch patient data for ID:', id);
        
        // Fetch patient data first
        const patientResult = await dispatch(fetchReceptionistSinglePatient(id));
        console.log('✅ Patient fetch result:', patientResult);
        
        // Then fetch all related data
        await Promise.all([
          dispatch(fetchReceptionistPatientMedications(id)),
          dispatch(fetchReceptionistPatientHistory(id)),
          dispatch(fetchReceptionistPatientTests(id)),
          dispatch(fetchReceptionistTestRequests(id)),
          dispatch(fetchReceptionistFollowUps(id)),
          dispatch(fetchReceptionistAllergicRhinitis(id)),
          dispatch(fetchReceptionistAllergicConjunctivitis(id)),
          dispatch(fetchReceptionistAllergicBronchitis(id)),
          dispatch(fetchReceptionistAtopicDermatitis(id)),
          dispatch(fetchReceptionistGPE(id)),
          dispatch(fetchReceptionistPrescriptions(id))
        ]);

        console.log('✅ All patient data fetched successfully');
        setDataFetched(true);
      } catch (error) {
        console.error('❌ Error fetching patient data:', error);
      }
    };

    fetchData();
  }, [dispatch, id, navigate]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 ViewProfile Debug Info:', {
      patientId: id,
      patient,
      patientType: typeof patient,
      patientKeys: patient ? Object.keys(patient) : null,
      loading,
      error,
      medications: medications?.length || 0,
      history: history ? (Array.isArray(history) ? history.length : 1) : 0,
      historyLoading,
      historyError,
      tests: tests?.length || 0,
      testRequests: testRequests?.length || 0,
      testRequestsData: testRequests,
      followUps: followUps?.length || 0,
      allergicRhinitis: allergicRhinitis?.length || 0,
      atopicDermatitis: atopicDermatitis?.length || 0,
      allergicConjunctivitis: allergicConjunctivitis?.length || 0,
      allergicBronchitis: allergicBronchitis?.length || 0,
      gpe: gpe?.length || 0,
      prescriptions: prescriptions?.length || 0,
      dataFetched
    });
  }, [patient, loading, error, medications, history, historyLoading, historyError, tests, testRequests, followUps, allergicRhinitis, atopicDermatitis, allergicConjunctivitis, allergicBronchitis, gpe, prescriptions, dataFetched, id]);

  // Monitor testRequests specifically
  useEffect(() => {
    console.log('🔍 TestRequests State Change:', {
      testRequests,
      testRequestsLength: testRequests?.length,
      testRequestsType: typeof testRequests,
      testRequestsIsArray: Array.isArray(testRequests)
    });
  }, [testRequests]);

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!id) return (
    <ReceptionistLayout>
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">No patient ID provided in the URL.</p>
          </div>
        </div>
      </div>
    </ReceptionistLayout>
  );

  if (patientLoading || !dataFetched) return (
    <ReceptionistLayout>
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading patient information...</p>
            </div>
          </div>
        </div>
      </div>
    </ReceptionistLayout>
  );

  if (patientError) return (
    <ReceptionistLayout>
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{patientError}</p>
          </div>
        </div>
      </div>
    </ReceptionistLayout>
  );

  if (!patient) return (
    <ReceptionistLayout>
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-600">Patient not found.</p>
          </div>
        </div>
      </div>
    </ReceptionistLayout>
  );

  // Ensure patient is an object with expected properties
  if (typeof patient !== 'object' || patient === null) {
    return (
      <ReceptionistLayout>
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Invalid patient data format.</p>
            </div>
          </div>
        </div>
      </ReceptionistLayout>
    );
  }

  return (
    <ReceptionistLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard/receptionist/patients')}
              className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients List
            </button>
          </div>

        {/* Patient Header */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 mb-2">{patient?.name || 'Patient Name'}</h1>
                <div className="flex flex-wrap gap-4 text-slate-600">
                  {patient?.gender && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4" />
                      {patient.gender}
                    </span>
                  )}
                  {patient?.age && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {patient.age} years
                    </span>
                  )}
                  {patient?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {patient.phone}
                    </span>
                  )}
                  {patient?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {patient.email}
                    </span>
                  )}
                  {patient?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {patient.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="flex flex-col items-end gap-2">
              {canEditPatient(patient) ? (
                <button
                  onClick={() => navigate(`/dashboard/receptionist/edit-patient/${patient._id}`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Patient
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Edit Expired
                </div>
              )}
              
              {canEditPatient(patient) && getRemainingEditTime(patient) && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getRemainingEditTime(patient).hours}h {getRemainingEditTime(patient).minutes}m remaining
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-2 mb-8">
          <div className="grid grid-cols-7 gap-1 w-full">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`px-2 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs ${activeTab === tab
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
          <div className="space-y-8">
            {/* Patient Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-500" />
                  Patient Details
                </h2>
                <p className="text-slate-600 mt-1">
                  Complete patient information and contact details
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                      <p className="text-slate-800 font-medium break-words">{patient.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Mobile</label>
                      <p className="text-slate-800 break-words">
                        {typeof patient.phone === 'string' ? patient.phone :
                          typeof patient.contact === 'string' ? patient.contact : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                      <p className="text-slate-800 break-words">{typeof patient.email === 'string' ? patient.email : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Location</label>
                      <p className="text-slate-800 break-words">{typeof patient.address === 'string' ? patient.address : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Assigned Doctor</label>
                      <p className="text-slate-800 break-words">
                        {patient.assignedDoctor?.name || 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Gender</label>
                      <p className="text-slate-800 capitalize break-words">{patient.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Age</label>
                      <p className="text-slate-800 break-words">{patient.age ? `${patient.age} years` : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Center</label>
                      <p className="text-slate-800 break-words">
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

        {activeTab === "History" && (
          <div className="space-y-8">
            {/* Medical History */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-6 border-b border-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Medical History
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Complete patient medical history and examination records
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/receptionist/patient-history/${patient._id}`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-xs md:text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add History
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/receptionist/patient-history/${patient._id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-xs md:text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    View Full History
                  </button>
                </div>
              </div>
              <div className="p-6">
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading history...</p>
                  </div>
                ) : historyError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{historyError}</p>
                  </div>
                ) : !history || (Array.isArray(history) && history.length === 0) || (typeof history === 'object' && Object.keys(history).length === 0) ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No history found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(Array.isArray(history) ? history : [history]).map((record, idx) => {
                      const attachments = [
                        ...(Array.isArray(record.attachments) ? record.attachments : []),
                        ...(Array.isArray(record.medicalHistoryDocs) ? record.medicalHistoryDocs : [])
                      ];
                      if ((!attachments || attachments.length === 0) && record.reportFile) {
                        attachments.push({ filename: record.reportFile, originalName: 'Medical Report' });
                      }

                      const renderSection = (title, fields, gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3') => {
                        const visibleFields = fields.filter(({ value, duration }) => {
                          const hasValue = value !== undefined && value !== null && value !== '';
                          const hasDuration = duration !== undefined && duration !== null && duration !== '';
                          return hasValue || hasDuration;
                        });

                        if (visibleFields.length === 0) {
                          return null;
                        }

                        return (
                          <div key={title}>
                            <h4 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-1">
                              {title}
                            </h4>
                            <div className={gridClass}>
                              {visibleFields.map(({ label, value, duration }) =>
                                renderHistoryField(label, value, duration)
                              )}
                            </div>
                          </div>
                        );
                      };

                      const allergicFields = [
                        { label: 'Hay Fever', value: record.hayFever, duration: formatDuration(record.hayFeverDuration) },
                        { label: 'Asthma', value: record.asthma, duration: formatDuration(record.asthmaDuration) },
                        { label: 'Food Allergies', value: record.foodAllergies, duration: formatDuration(record.foodAllergiesDuration) },
                        { label: 'Drug Allergy', value: record.drugAllergy, duration: formatDuration(record.drugAllergyDuration) },
                        { label: 'Eczema/Rashes', value: record.eczemaRashes, duration: formatDuration(record.eczemaRashesDuration) }
                      ];

                      const respiratoryFields = [
                        { label: 'Breathing Problems', value: record.breathingProblems, duration: formatDuration(record.breathingProblemsDuration) },
                        { label: 'Sinus Trouble', value: record.sinusTrouble, duration: formatDuration(record.sinusTroubleDuration) },
                        { label: 'Hives/Swelling', value: record.hivesSwelling, duration: formatDuration(record.hivesSwellingDuration) },
                        { label: 'Asthma Type', value: record.asthmaType },
                        { label: 'Exercise Induced', value: record.exerciseInducedSymptoms }
                      ];

                      const medicalHistoryFields = [
                        { label: 'Hypertension', value: record.hypertension, duration: formatDuration(record.hypertensionDuration) },
                        { label: 'Diabetes', value: record.diabetes, duration: formatDuration(record.diabetesDuration) },
                        { label: 'Hospital Admissions', value: record.hospitalAdmission, duration: formatDuration(record.hospitalAdmissionDuration) },
                        { label: 'Family Smoking', value: record.familySmoking, duration: formatDuration(record.familySmokingDuration) },
                        { label: 'Pets at Home', value: record.petsAtHome, duration: formatDuration(record.petsAtHomeDuration) }
                      ];

                      const clinicalFields = [
                        { label: 'Family History', value: record.familyHistory },
                        { label: 'Other Findings', value: record.otherFindings },
                        { label: 'Clinical Notes', value: record.notes || record.additionalNotes },
                        { label: 'Treatment Plan', value: record.treatmentPlan },
                        { label: 'Occupation', value: record.occupation }
                      ];

                      return (
                        <div key={record._id || idx} className="border border-slate-200 rounded-xl p-6 shadow-sm">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-800">
                                Medical History Record #{idx + 1}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-blue-500 mt-2">
                                <Calendar className="h-4 w-4" />
                                {formatRecordDate(record.createdAt)}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/receptionist/patient-history/${patient._id}`)}
                                className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/receptionist/patient-history/${patient._id}`)}
                                className="px-4 py-2 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {renderSection('Allergic Conditions', allergicFields)}
                            {renderSection('Respiratory & Triggers', respiratoryFields)}
                            {renderSection('Medical History', medicalHistoryFields)}
                            {renderSection('Clinical Notes', clinicalFields, 'grid grid-cols-1 sm:grid-cols-2 gap-3')}

                            <div>
                              <h4 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-1">
                                Supporting Documents
                              </h4>
                              {attachments.length > 0 ? (
                                <div className="space-y-2">
                                  {attachments.map((doc, attachmentIdx) => {
                                    const label = doc.originalName || doc.filename || `Document ${attachmentIdx + 1}`;
                                    return (
                                      <button
                                        type="button"
                                        key={`${doc.documentId || doc.filename || attachmentIdx}`}
                                        onClick={() => downloadDocument(doc, label)}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                      >
                                        <span className="flex items-center gap-2 text-slate-700">
                                          <Paperclip className="h-4 w-4 text-blue-500" />
                                          <span className="font-medium truncate max-w-[200px]" title={label}>{label}</span>
                                        </span>
                                        <span className="flex items-center gap-2 text-slate-500">
                                          {doc.size ? formatFileSize(doc.size) : null}
                                          <Download className="h-4 w-4 text-blue-500" />
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  No documents attached to this history record.
                                </p>
                              )}
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
        )}

        {activeTab === "Tests" && (
          <div className="space-y-8">
            {/* Investigations */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-500" />
                  Investigations
                </h2>
                <p className="text-slate-600 mt-1">
                  Laboratory test results and medical investigations
                </p>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading investigations...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                  </div>
                ) : !tests || tests.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No investigations found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full min-w-max">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">CBC</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Hb</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">TC</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">DC</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">N</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">E</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">L</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">M</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Platelets</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">ESR</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Serum Creatinine</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Serum IgE</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">C3, C4</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">ANA</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Urine</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Allergy Panel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {tests && Array.isArray(tests) && tests.length > 0 ? (
                          tests.map((test, idx) => (
                            <tr key={test._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {test.date ? new Date(test.date).toLocaleDateString() : ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.CBC || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.Hb || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.TC || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.DC || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.Neutrophils || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.Eosinophil || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.Lymphocytes || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.Monocytes || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.Platelets || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.ESR || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.SerumCreatinine || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.SerumIgELevels || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.C3C4Levels || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.ANA_IF || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.UrineRoutine || ''}</td>
                              <td className="px-4 py-3 text-sm text-slate-800">{test.AllergyPanel || ''}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={17} className="px-4 py-8 text-center text-slate-500">
                              <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p>No investigations found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Medications" && (
          <div className="space-y-8">
            {/* Medications */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <Pill className="h-5 w-5 mr-2 text-blue-500" />
                  Medications
                </h2>
                <p className="text-slate-600 mt-1">
                  Current and past medications prescribed
                </p>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading medications...</p>
                  </div>
                ) : !medications || medications.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No medications found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Drug Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dose</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Frequency</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed By</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Adverse Effect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {medications.map((med, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{med.drugName}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{med.dose}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{med.duration}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{med.frequency || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {typeof med.prescribedBy === 'string' ? med.prescribedBy : 
                               (typeof med.prescribedBy === 'object' && med.prescribedBy?.name ? med.prescribedBy.name : 'N/A')}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{med.adverseEvent || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Lab Reports" && (
          <div className="space-y-8">
            {/* Lab Report Status */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-500" />
                  Lab Report Status
                </h2>
                <p className="text-slate-600 mt-1">
                  Current status of laboratory tests and reports
                </p>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading lab reports...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                  </div>
                ) : !testRequests || testRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No lab reports found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Test Request ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Test Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lab Staff</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Completion Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {testRequests && Array.isArray(testRequests) && testRequests.length > 0 ? (
                          testRequests.map((request, idx) => (
                            <tr key={request._id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-800">
                                {request._id ? request._id.slice(-6) : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800">
                                {request.testType || request.testName || 'General Test'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800">
                                {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  request.status === 'completed' || request.status === 'Completed' || request.status === 'Report_Sent'
                                    ? 'bg-green-100 text-green-800'
                                    : request.status === 'in_progress' || request.status === 'In Progress' || request.status === 'In_Lab_Testing'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : request.status === 'pending' || request.status === 'Pending'
                                    ? 'bg-blue-100 text-blue-800'
                                    : request.status === 'Billing_Pending'
                                    ? 'bg-orange-100 text-orange-800'
                                    : request.status === 'Billing_Generated'
                                    ? 'bg-purple-100 text-purple-800'
                                    : request.status === 'Billing_Paid'
                                    ? 'bg-green-100 text-green-800'
                                    : request.status === 'Sample_Collected'
                                    ? 'bg-blue-100 text-blue-800'
                                    : request.status === 'Report_Generated'
                                    ? 'bg-green-100 text-green-800'
                                    : request.status === 'Assigned'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {request.status === 'completed' || request.status === 'Completed' || request.status === 'Report_Sent' ? 'Completed' :
                                   request.status === 'in_progress' || request.status === 'In Progress' || request.status === 'In_Lab_Testing' ? 'In Progress' :
                                   request.status === 'pending' || request.status === 'Pending' ? 'Pending' :
                                   request.status === 'Billing_Pending' ? 'Billing Pending' :
                                   request.status === 'Billing_Generated' ? 'Bill Generated' :
                                   request.status === 'Billing_Paid' ? 'Bill Paid' :
                                   request.status === 'Sample_Collected' ? 'Sample Collected' :
                                   request.status === 'Report_Generated' ? 'Report Ready' :
                                   request.status === 'Assigned' ? 'Assigned to Lab' :
                                   request.status || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800">
                                {request.assignedLabStaffId?.staffName || 
                                 request.sampleCollectorId?.staffName || 
                                 request.labTechnicianId?.staffName || 
                                 request.reportGeneratedBy?.staffName || 
                                 'Not Assigned'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800">
                                {request.labTestingCompletedDate ? new Date(request.labTestingCompletedDate).toLocaleDateString() :
                                 request.reportGeneratedDate ? new Date(request.reportGeneratedDate).toLocaleDateString() :
                                 request.reportSentDate ? new Date(request.reportSentDate).toLocaleDateString() :
                                 request.testingEndDate ? new Date(request.testingEndDate).toLocaleDateString() :
                                 request.status === 'completed' || request.status === 'Completed' || 
                                 request.status === 'Report_Generated' || request.status === 'Report_Sent' ? 'Completed' : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800">
                                <span className="text-slate-400">Read Only</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                              <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p>No lab reports found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Follow Up" && (
          <div className="space-y-8">
            {/* Allergic Rhinitis */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800">Allergic Rhinitis</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allergicRhinitis && allergicRhinitis.length > 0 ? (
                        allergicRhinitis.map((rhinitis, idx) => (
                          <tr key={rhinitis._id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.age}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.centerCode || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.phone || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {rhinitis.updatedAt ? new Date(rhinitis.updatedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              <button
                                onClick={() => navigate(`/dashboard/receptionist/view-allergic-rhinitis/${rhinitis._id}`)}
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
                            <p>No allergic rhinitis records found</p>
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
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800">Atopic Dermatitis</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Symptoms</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {atopicDermatitis && atopicDermatitis.length > 0 ? (
                        atopicDermatitis.map((dermatitis, idx) => (
                          <tr key={dermatitis._id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {dermatitis.createdAt ? new Date(dermatitis.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-800">{dermatitis.symptoms || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.centerCode || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.centerId?.name || patient.centerName || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient._id?.toString() || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {typeof dermatitis.updatedBy === 'string' ? dermatitis.updatedBy : 
                               (typeof dermatitis.updatedBy === 'object' && dermatitis.updatedBy?.name ? dermatitis.updatedBy.name : 'N/A')}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              <button
                                onClick={() => navigate(`/dashboard/receptionist/view-atopic-dermatitis/${dermatitis._id}`)}
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
                            <p>No atopic dermatitis records found</p>
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
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800">Allergic Conjunctivitis</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allergicConjunctivitis && allergicConjunctivitis.length > 0 ? (
                        allergicConjunctivitis.map((conjunctivitis, idx) => (
                          <tr key={conjunctivitis._id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.age}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.centerCode || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.phone || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {conjunctivitis.updatedAt ? new Date(conjunctivitis.updatedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              <button
                                onClick={() => navigate(`/dashboard/receptionist/view-allergic-conjunctivitis/${conjunctivitis._id}`)}
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
                            <p>No allergic conjunctivitis records found</p>
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
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800">Allergic Bronchitis</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allergicBronchitis && allergicBronchitis.length > 0 ? (
                        allergicBronchitis.map((bronchitis, idx) => (
                          <tr key={bronchitis._id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.age}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.centerCode || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.phone || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {bronchitis.updatedAt ? new Date(bronchitis.updatedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              <button
                                onClick={() => navigate(`/dashboard/receptionist/view-allergic-bronchitis/${bronchitis._id}`)}
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
                            <p>No allergic bronchitis records found</p>
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
              <div className="p-6 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-slate-800">GPE</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {gpe && gpe.length > 0 ? (
                        gpe.map((gpe, idx) => (
                          <tr key={gpe._id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.age}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.centerCode || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">{patient.phone || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {gpe.updatedAt ? new Date(gpe.updatedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              <button
                                onClick={() => navigate(`/dashboard/receptionist/view-gpe/${gpe._id}`)}
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
                            <p>No GPE records found</p>
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
            <div className="p-6 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-slate-800">Prescription</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading prescriptions...</p>
                </div>
              ) : !prescriptions || prescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No prescriptions found</p>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Visit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Medications</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {prescriptions && prescriptions.length > 0 ? (
                      prescriptions.map((prescription, idx) => (
                        <tr key={prescription._id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-800">
                            {prescription.date ? new Date(prescription.date).toLocaleDateString() : 
                             prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-800">{prescription.visit || 'N/A'}</td>
                          <td className="px-4 py-3 text-xs text-slate-800">
                            {prescription.medications && prescription.medications.length > 0 ? (
                              <div className="space-y-1">
                                {prescription.medications.map((med, medIdx) => (
                                  <div key={medIdx} className="text-xs">
                                    <span className="font-medium">{med.medicationName}</span>
                                    <span className="text-slate-600"> - {med.dosage}mg, {med.duration} days</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              'No medications'
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-800">
                            {typeof prescription.updatedBy === 'string' ? prescription.updatedBy :
                              typeof prescription.updatedBy === 'object' && prescription.updatedBy?.name ? prescription.updatedBy.name : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-800">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <button
                                type="button"
                                onClick={() => handleViewPrescription(prescription)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPrescription(prescription)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                              >
                                <Printer className="h-4 w-4" />
                                Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          <Pill className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p>No prescriptions found</p>
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
      </div>
    </div>
      {showPrescriptionModal && selectedPrescription ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8"
          onClick={handleClosePrescriptionModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClosePrescriptionModal}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow hover:text-slate-900 focus:outline-none focus:ring focus:ring-blue-200"
            >
              <X className="h-4 w-4" />
            </button>

            <PrescriptionPreviewCard
              centerInfo={resolvedCenterInfo}
              patient={patient}
              prescription={selectedPrescription}
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleDownloadPrescription(selectedPrescription)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handleClosePrescriptionModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring focus:ring-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ReceptionistLayout>
  );
};

export default ViewProfile; 