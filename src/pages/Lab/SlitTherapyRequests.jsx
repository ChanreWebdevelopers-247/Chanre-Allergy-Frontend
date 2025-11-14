import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, PackageCheck, CheckCircle2, Timer, Truck, Eye, FileDown, Download, Printer, X, UserCheck, Activity, Stethoscope, Pill, CheckCircle, XCircle, Clock, FileText, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../services/api';
import {
  fetchLabSlitTherapyRequests,
  updateLabSlitTherapyStatus,
} from '../../features/slitTherapy/slitTherapyThunks';
import { viewPDFReport } from '../../utils/pdfHandler';
import { openDocumentWithFallback } from '../../utils/documentHelpers';
import { buildPrescriptionPrintHTML, openPrintPreview } from '../../utils/prescriptionPrint';
import { API_CONFIG } from '../../config/environment';

const STATUS_LABELS = {
  Billing_Generated: 'Awaiting Payment',
  Billing_Paid: 'Ready for SLIT Therapy Intake',
  Lab_Received: 'In SLIT Therapy Queue',
  Ready: 'Ready for Patient',
  Delivered: 'Out for Delivery / Pickup',
  Received: 'Completed & Archived',
  Cancelled: 'Request Cancelled'
};

const STATUS_COLORS = {
  Billing_Generated: 'bg-amber-100 text-amber-700',
  Billing_Paid: 'bg-blue-100 text-blue-700',
  Lab_Received: 'bg-purple-100 text-purple-700',
  Ready: 'bg-green-100 text-green-700',
  Delivered: 'bg-teal-100 text-teal-700',
  Received: 'bg-slate-100 text-slate-700',
  Cancelled: 'bg-rose-100 text-rose-700'
};
const AVAILABLE_FILTERS = ['All', 'Billing_Generated', 'Billing_Paid', 'Lab_Received', 'Ready', 'Delivered', 'Received', 'Cancelled'];
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const PROFILE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'followups', label: 'Follow Up' },
  { key: 'history', label: 'History' },
  { key: 'medications', label: 'Medications' }
];

const formatCurrency = (value = 0) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
};

const formatStatus = (value) => (value ? value.replace(/_/g, ' ') : '—');

const DEFAULT_CENTER_INFO = {
  name: "CHANRE RHEUMATOLOGY & IMMUNOLOGY CENTER & RESEARCH",
  subTitle: "Specialists in Rheumatology, Autoimmune Disease, Allergy, Immune Defiency, Rheumatoid Immunology, Vasculitis and Rare Infections & Infertility",
  address: "No. 414/5&6, 20th Main, West of Chord Road, 1st Block, Rajajinagar, Bengaluru - 560 010.",
  email: "info@chanreclinic.com",
  phone: "080-42516699",
  fax: "080-42516600",
  missCallNumber: "080-42516666",
  mobileNumber: "9532333122",
  website: "www.chanreicr.com | www.mychanreclinic.com",
  labWebsite: "www.chanrelabresults.com",
  code: "",
  logoUrl: ""
};

const DEFAULT_REMARKS = "Keep patient hydrated. Advise rest if fatigue worsens.";

const displayValue = (value, fallback = "N/A") => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value;
};

const formatDuration = (duration, unit = "months") => {
  if (duration === undefined || duration === null || duration === "") return null;
  return `Duration: ${duration} ${unit}`;
};

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
};

const formatRecordDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const renderHistoryField = (label, value, duration) => (
  <div key={label} className="p-3 bg-slate-50 rounded-lg">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-medium text-slate-600">{label}:</span>
      <span className="text-sm text-slate-800 font-medium">{displayValue(value)}</span>
    </div>
    {duration ? <div className="text-xs text-slate-500">{duration}</div> : null}
  </div>
);

const resolvePrescriptionDate = (prescription) =>
  prescription?.prescribedDate || prescription?.date || prescription?.createdAt || null;

const resolvePrescribedBy = (prescription) =>
  prescription?.prescribedBy ||
  prescription?.doctorName ||
  prescription?.doctor ||
  prescription?.doctorId?.name ||
  prescription?.updatedBy?.name ||
  "";

const resolvePreparedBy = (prescription) =>
  prescription?.preparedBy || prescription?.prepared_by || resolvePrescribedBy(prescription) || "";

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
        name: item.drugName || item.medicine || item.name || item.medicationName || "—",
        dosage: [item.dose || item.dosage || item.dosageDetails || item.medicineDose || "", item.frequency || item.freq || item.medicineFrequency || ""]
          .filter(Boolean)
          .join(" ")
          .trim(),
        duration: item.duration || item.period || item.medicineDuration || item.course || "—",
        instruction: item.instructions || item.instruction || "—"
      }))
    : [];

const normalizePrescriptionTests = (prescription) => {
  const possibleSources = [
    prescription?.tests,
    prescription?.test,
    prescription?.testDetails,
    prescription?.testList,
    prescription?.selectedTests,
    prescription?.testsRequested,
    prescription?.requestedTests,
    prescription?.testItems,
    prescription?.orderedTests,
    prescription?.testOrders,
    prescription?.testRequest?.selectedTests,
    prescription?.testRequestDetails?.tests,
    prescription?.testRequestDetails?.selectedTests,
    prescription?.testRequestData?.selectedTests
  ];

  const coerceToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return Object.values(value);
    return [value];
  };

  const rawList = coerceToArray(possibleSources.find((value) => value && (Array.isArray(value) ? value.length : true)));

  return rawList
    .map((item) => {
      if (!item || typeof item !== "object") {
        const stringValue = String(item || "").trim();
        return stringValue ? { name: stringValue, instruction: "—" } : null;
      }

      const name = item.name || item.testName || item.test_name || item.test || item.title || "—";
      const instruction = item.instruction || item.instructions || item.note || item.description || item.details || "—";

      return { name: name || "—", instruction: instruction || "—" };
    })
    .filter(Boolean);
};

const coerceRequestList = (input) => {
  const results = [];
  const pushCandidate = (candidate) => {
    if (!candidate) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => pushCandidate(item));
      return;
    }
    if (typeof candidate === "object") {
      results.push(candidate);
      const nestedCandidates = [
        candidate.testRequests,
        candidate.requests,
        candidate.data,
        candidate.items,
        candidate.results,
        candidate.list,
        candidate.records,
        candidate.rows,
        candidate.entries
      ];
      nestedCandidates.forEach((nested) => pushCandidate(nested));
    }
  };
  pushCandidate(input);
  return results;
};

const normalizePatientTestRequests = (requests = [], { fallbackInstruction } = {}) => {
  const requestList = coerceRequestList(requests);
  const instructionSet = new Set();
  const items = [];

  const recordInstruction = (value) => {
    if (!value) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    instructionSet.add(normalized);
  };

  const coerceToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return Object.values(value);
    if (typeof value === "string") {
      return value.split(/[\n,;]+/).map((segment) => segment.trim()).filter(Boolean);
    }
    return [value];
  };

  const pushItem = (name, instruction, fallback) => {
    const resolvedName = name && String(name).trim() ? String(name).trim() : "—";
    const resolvedInstruction =
      instruction && String(instruction).trim()
        ? String(instruction).trim()
        : fallback && String(fallback).trim()
        ? String(fallback).trim()
        : "";
    recordInstruction(resolvedInstruction);
    items.push({ name: resolvedName, instruction: resolvedInstruction || "—" });
  };

  requestList.forEach((request) => {
    if (!request || typeof request !== "object") return;

    const perRequestFallback =
      request.testDescription ||
      request.followUpInstruction ||
      request.instructions ||
      request.notes ||
      request.remark ||
      request.remarks ||
      fallbackInstruction ||
      "";

    if (Array.isArray(request.selectedTests) && request.selectedTests.length > 0) {
      request.selectedTests.forEach((test) => {
        if (!test) return;
        pushItem(test.testName || test.name || test.testCode || test.code || "—", test.instructions || test.instruction, perRequestFallback);
      });
      return;
    }

    const possibleSources = [
      request.tests,
      request.testList,
      request.testDetails,
      request.testInfo,
      request.testNames,
      request.testsRequested,
      request.requestedTests,
      request.testsRequestedExtended,
      request.testOrder,
      request.testOrderDetails
    ];

    let rawSource = possibleSources.find((value) => value && (Array.isArray(value) ? value.length > 0 : typeof value === "object" || value));
    let normalizedEntries = coerceToArray(rawSource);

    if (normalizedEntries.length === 0) normalizedEntries = coerceToArray(request.testType);
    if (normalizedEntries.length === 0 && request.testNamesString) normalizedEntries = coerceToArray(request.testNamesString);
    if (normalizedEntries.length === 0 && request.testName) normalizedEntries = coerceToArray(request.testName);

    if (normalizedEntries.length === 0 && perRequestFallback) {
      pushItem(request.testType || request.testName || "—", "", perRequestFallback);
      return;
    }

    normalizedEntries.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === "object") {
        pushItem(
          entry.name || entry.testName || entry.test_name || entry.title || entry.test || entry.testCode || entry.code || "—",
          entry.instruction || entry.instructions || entry.note || entry.description || entry.details,
          perRequestFallback
        );
      } else {
        pushItem(entry, "", perRequestFallback);
      }
    });
  });

  return { items, instructions: Array.from(instructionSet) };
};

const summarizeMedications = (medications) => {
  if (!Array.isArray(medications) || medications.length === 0) {
    return { firstName: "—", count: 0, instructionsPreview: "—" };
  }
  const first = medications[0];
  const name = first.name;
  const instructionPreview = medications.map((med) => med.instruction).filter(Boolean).join("; ");
  return { firstName: name || "—", count: medications.length, instructionsPreview: instructionPreview || "—" };
};

const isFileLike = (value) => {
  if (typeof File !== "undefined" && value instanceof File) return true;
  if (typeof Blob !== "undefined" && value instanceof Blob) return true;
  return false;
};

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !isFileLike(value);

const flattenHistoryItem = (item) => {
  if (!item || typeof item !== "object") return item || {};
  const result = { ...item };
  const stack = [item];
  const seen = new Set();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!isPlainObject(current) || seen.has(current)) continue;
    seen.add(current);
    Object.entries(current).forEach(([key, value]) => {
      if (isPlainObject(value)) stack.push(value);
      if (result[key] === undefined || result[key] === null || result[key] === "" || (isPlainObject(result[key]) && Object.keys(result[key]).length === 0)) {
        result[key] = value;
      }
    });
  }
  return result;
};

const getStatusDescription = (request) => {
  const status = request.status;
  switch (status) {
    case 'Billing_Generated':
      return 'Awaiting payment confirmation at reception.';
    case 'Billing_Paid':
      return 'Payment confirmed. Package queued for SLIT therapy intake.';
    case 'Lab_Received':
      return 'SLIT therapy has acknowledged the request and is preparing materials.';
    case 'Ready':
      return request.deliveryMethod === 'courier'
        ? 'Package packed and ready for courier dispatch.'
        : 'Package ready for patient pickup at center.';
    case 'Delivered':
      return request.deliveryMethod === 'courier'
        ? 'Courier out for delivery / delivered to patient.'
        : 'Patient collected the package; receptionist to close once confirmed.';
    case 'Received':
      return 'Reception confirmed delivery and received the package.';
    case 'Cancelled':
      return request.billing?.cancellationReason || 'Request was cancelled by reception.';
    default:
      return 'Status update pending.';
  }
};

const PrescriptionPreviewCard = ({ centerInfo = {}, patient, prescription, testRequests = [] }) => {
  const mergedCenter = { ...DEFAULT_CENTER_INFO, ...centerInfo };
  const ageGender = [patient?.age ? `${patient.age}` : null, patient?.gender || null].filter(Boolean).join(" / ");

  const toDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value, withTime = false) => {
    const date = toDate(value);
    if (!date) return "—";
    return withTime
      ? date.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("en-GB");
  };

  const contactLine = (segments) => segments.filter(Boolean).join(" | ");

  const medications = normalizePrescriptionMedications(prescription);
  const prescriptionTests = useMemo(() => normalizePrescriptionTests(prescription), [prescription]);
  const requestDerived = useMemo(() => {
    const normalized = normalizePatientTestRequests(testRequests, { fallbackInstruction: resolveFollowUpInstruction(prescription) });
    return normalized;
  }, [testRequests, prescription]);
  const tests = prescriptionTests.length > 0 ? prescriptionTests : requestDerived.items;
  const followUpInstruction = resolveFollowUpInstruction(prescription) || (requestDerived.instructions.length > 0 ? requestDerived.instructions.join("\n") : "") || "—";
  const remarks = resolveRemarks(prescription) || "—";
  const prescribedBy = resolvePrescribedBy(prescription) || "—";
  const preparedBy = resolvePreparedBy(prescription) || "—";
  const printedBy = resolvePrintedBy(prescription) || "—";
  const prescribedDate = formatDate(resolvePrescriptionDate(prescription));
  const reportGenerated = formatDate(prescription?.reportGeneratedAt || prescription?.updatedAt, true);
  const printedOn = formatDate(new Date(), true);

  return (
    <div className="bg-white border border-slate-400 rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-slate-400 px-6 py-6 text-center space-y-1">
        <h2 className="text-[16px] font-semibold uppercase tracking-[0.35em] text-slate-900">{mergedCenter.name}</h2>
        {mergedCenter.address ? <p className="text-[11px] text-slate-700">{mergedCenter.address}</p> : null}
        {contactLine([mergedCenter.phone ? `Phone: ${mergedCenter.phone}` : "", mergedCenter.fax ? `Fax: ${mergedCenter.fax}` : "", mergedCenter.code ? `Center Code: ${mergedCenter.code}` : ""]) ? (
          <p className="text-[11px] text-slate-700">{contactLine([mergedCenter.phone ? `Phone: ${mergedCenter.phone}` : "", mergedCenter.fax ? `Fax: ${mergedCenter.fax}` : "", mergedCenter.code ? `Center Code: ${mergedCenter.code}` : ""])}</p>
        ) : null}
        {contactLine([mergedCenter.email ? `Email: ${mergedCenter.email}` : "", mergedCenter.website || ""]) ? (
          <p className="text-[11px] text-slate-700">{contactLine([mergedCenter.email ? `Email: ${mergedCenter.email}` : "", mergedCenter.website || ""])}</p>
        ) : null}
        {contactLine([mergedCenter.labWebsite ? `SLIT Therapy: ${mergedCenter.labWebsite}` : "", mergedCenter.missCallNumber ? `Missed Call: ${mergedCenter.missCallNumber}` : "", mergedCenter.mobileNumber ? `Appointment: ${mergedCenter.mobileNumber}` : ""]) ? (
          <p className="text-[11px] text-slate-700">{contactLine([mergedCenter.labWebsite ? `SLIT Therapy: ${mergedCenter.labWebsite}` : "", mergedCenter.missCallNumber ? `Missed Call: ${mergedCenter.missCallNumber}` : "", mergedCenter.mobileNumber ? `Appointment: ${mergedCenter.mobileNumber}` : ""])}</p>
        ) : null}
      </div>

      <div className="px-6 py-5 text-[12px] text-slate-800 space-y-6">
        <table className="w-full border border-slate-400">
          <tbody>
            <tr>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Patient Name</span>
                <span className="block mt-1 font-semibold">{patient?.name || "—"}</span>
              </td>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Patient ID / UHID</span>
                <span className="block mt-1">{patient?.uhId || patient?.patientCode || patient?._id || "—"}</span>
              </td>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Age / Gender</span>
                <span className="block mt-1">{ageGender || "—"}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Diagnosis</span>
                <span className="block mt-1 whitespace-pre-line">{prescription?.diagnosis || "—"}</span>
              </td>
              <td className="border border-slate-400 px-3 py-2 align-top">
                <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Prescribed Date</span>
                <span className="block mt-1">{prescribedDate}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">Medicines</div>
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
                  <td colSpan={4} className="border border-slate-400 px-3 py-3 text-center text-slate-500">No medicines added.</td>
                </tr>
              ) : (
                medications.map((med, idx) => (
                  <tr key={`preview-med-${idx}`} className="align-top">
                    <td className="border border-slate-400 px-3 py-2 text-slate-800 font-medium">{med.name || "—"}</td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">{[med.dosage || "", med.frequency || ""].filter(Boolean).join(" ") || "—"}</td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">{med.duration || "—"}</td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">{med.instruction || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">Tests &amp; Follow-up</div>
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
                  <td colSpan={2} className="border border-slate-400 px-3 py-3 text-center text-slate-500">No tests prescribed.</td>
                </tr>
              ) : (
                tests.map((test, idx) => (
                  <tr key={`preview-test-${idx}`} className="align-top">
                    <td className="border border-slate-400 px-3 py-2 text-slate-800 font-medium">{test.name || "—"}</td>
                    <td className="border border-slate-400 px-3 py-2 text-slate-800">{test.instruction || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-300 px-3 py-3">
            <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Follow-up Instruction</span>
            <div className="mt-2 leading-relaxed text-slate-800 whitespace-pre-line">{followUpInstruction || "—"}</div>
          </div>
          <div className="border border-slate-300 px-3 py-3">
            <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Remarks</span>
            <div className="mt-2 leading-relaxed text-slate-800 whitespace-pre-line">{remarks || "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-300 px-3 py-3 space-y-1">
            <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Prescription Details</span>
            <div className="leading-relaxed text-slate-800">
              <div><strong>Prescribed By:</strong> {prescribedBy}</div>
              <div><strong>Prepared By:</strong> {preparedBy}</div>
              {prescription?.preparedByCredentials ? <div>{prescription.preparedByCredentials}</div> : null}
              {prescription?.medicalCouncilNumber ? <div>Medical Council Reg. No.: {prescription.medicalCouncilNumber}</div> : null}
            </div>
          </div>
          <div className="border border-slate-300 px-3 py-3 space-y-2">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Printed By</span>
              <div className="mt-2 leading-relaxed text-slate-800">{printedBy}</div>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Report Generated</span>
              <div className="mt-2 leading-relaxed text-slate-800">{reportGenerated}</div>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">Printed On</span>
              <div className="mt-2 leading-relaxed text-slate-800">{printedOn}</div>
            </div>
            <div className="border-t border-slate-200 pt-4 text-[10px] uppercase tracking-[0.4em] text-right text-slate-500">Doctor Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SlitTherapyRequests() {
  const dispatch = useDispatch();
  const {
    lab: { requests: labRequests = [], loading: labLoading, error: labError },
    mutation: { loading: mutationLoading, error: mutationError },
  } = useSelector((state) => state.slitTherapy);
  const loading = labLoading || mutationLoading;
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const navigate = useNavigate();
  const [reportModal, setReportModal] = useState({
    open: false,
    loading: false,
    error: null,
    items: [],
    patient: null
  });
  const [profileModal, setProfileModal] = useState({
    open: false,
    loading: false,
    error: null,
    activeTab: 'overview',
    patient: null,
    history: [],
    tests: [],
    medications: [],
    followUps: [],
    allergies: {
      rhinitis: [],
      conjunctivitis: [],
      bronchitis: [],
      dermatitis: [],
      gpe: []
    },
    prescriptions: [],
    testRequests: [],
    centerInfo: DEFAULT_CENTER_INFO
  });
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [selectedAllergy, setSelectedAllergy] = useState(null);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);

  useEffect(() => {
    dispatch(fetchLabSlitTherapyRequests());
  }, [dispatch]);

  useEffect(() => {
    if (labError) {
      toast.error(labError);
    }
  }, [labError]);

  useEffect(() => {
    if (mutationError) {
      toast.error(mutationError);
    }
  }, [mutationError]);

  const filteredRequests = useMemo(() => {
    return (labRequests || []).filter((req) => {
      const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
      const matchesSearch = !searchTerm
        || req.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
        || req.patientPhone?.includes(searchTerm)
        || req.billing?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [labRequests, statusFilter, searchTerm]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil((filteredRequests.length || 0) / pageSize);
    return pages > 0 ? pages : 1;
  }, [filteredRequests.length, pageSize]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const confirmStatusUpdate = async (request, nextStatus) => {
    let notes = '';
    if (nextStatus === 'Ready' || nextStatus === 'Lab_Received') {
      notes = window.prompt(`Add SLIT therapy notes for status "${nextStatus.replace(/_/g, ' ')}" (optional)`, request.labNotes || '') || '';
    }
    let courierTrackingNumber = request.courierTrackingNumber;
    if (nextStatus === 'Delivered' && request.deliveryMethod === 'courier') {
      courierTrackingNumber = window.prompt('Enter courier tracking number (optional)', courierTrackingNumber || '') || courierTrackingNumber;
    }

    try {
      await dispatch(
        updateLabSlitTherapyStatus({
          id: request._id,
          payload: {
            status: nextStatus,
            labNotes: notes,
            courierTrackingNumber,
          },
        })
      ).unwrap();
      toast.success(`Status updated to ${nextStatus.replace(/_/g, ' ')}`);
    } catch (error) {
      const message = error?.message || error || 'Failed to update status';
      toast.error(message);
    }
  };

  const handleViewProfile = async (request) => {
    const patientId = request?.patientId || request?.patient?._id;
    if (!patientId) {
      toast.error('Patient record is not linked to this request.');
      return;
    }

    setProfileModal({
      open: true,
      loading: true,
      error: null,
      activeTab: 'overview',
      patient: null,
      history: [],
      tests: [],
      medications: [],
      followUps: [],
      allergies: {
        rhinitis: [],
        conjunctivitis: [],
        bronchitis: [],
        dermatitis: [],
        gpe: []
      },
      prescriptions: [],
      testRequests: [],
      centerInfo: DEFAULT_CENTER_INFO
    });

    try {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const [patientRes, historyRes, testsRes, medsRes, followRes, rhinitisRes, conjunctivitisRes, bronchitisRes, dermatitisRes, gpeRes, prescriptionsRes, testRequestsRes] = await Promise.all([
        API.get(`/patients/${patientId}`, authHeaders),
        API.get(`/patients/${patientId}/history`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/patients/${patientId}/show-tests`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/medications?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/followups?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/allergic-rhinitis?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/allergic-conjunctivitis?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/allergic-bronchitis?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/atopic-dermatitis?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/gpe?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/prescriptions?patientId=${patientId}`, authHeaders).catch(() => ({ data: [] })),
        API.get(`/test-requests/patient/${patientId}`, authHeaders).catch(() => ({ data: [] }))
      ]);

      const patient = patientRes.data?.patient || patientRes.data;
      let centerInfo = DEFAULT_CENTER_INFO;

      if (patient?.centerId) {
        try {
          const centerId = typeof patient.centerId === 'object' ? patient.centerId._id : patient.centerId;
          if (centerId) {
            const centerRes = await API.get(`/centers/${centerId}`).catch(() => null);
            if (centerRes?.data) {
              const center = centerRes.data?.data || centerRes.data;
              centerInfo = {
                name: center.name || DEFAULT_CENTER_INFO.name,
                address: [center.address, center.location].filter(Boolean).join(", ") || DEFAULT_CENTER_INFO.address,
                phone: center.phone || DEFAULT_CENTER_INFO.phone,
                fax: center.fax || DEFAULT_CENTER_INFO.fax,
                email: center.email || DEFAULT_CENTER_INFO.email,
                website: center.website || DEFAULT_CENTER_INFO.website,
                labWebsite: center.labWebsite || DEFAULT_CENTER_INFO.labWebsite,
                missCallNumber: center.missCallNumber || DEFAULT_CENTER_INFO.missCallNumber,
                mobileNumber: center.mobileNumber || DEFAULT_CENTER_INFO.mobileNumber,
                code: center.code || DEFAULT_CENTER_INFO.code,
                logoUrl: center.logoUrl || DEFAULT_CENTER_INFO.logoUrl
              };
            }
          }
        } catch (centerError) {
          console.error('Failed to fetch center info', centerError);
        }
      }

      setProfileModal({
        open: true,
        loading: false,
        error: null,
        activeTab: 'overview',
        patient: patient,
        history: historyRes.data || [],
        tests: testsRes.data || [],
        medications: medsRes.data || [],
        followUps: followRes.data || [],
        allergies: {
          rhinitis: rhinitisRes.data || [],
          conjunctivitis: conjunctivitisRes.data || [],
          bronchitis: bronchitisRes.data || [],
          dermatitis: dermatitisRes.data || [],
          gpe: gpeRes.data || []
        },
        prescriptions: prescriptionsRes.data || [],
        testRequests: testRequestsRes.data || [],
        centerInfo: centerInfo
      });
    } catch (error) {
      const message = error?.response?.data?.message || error.message || 'Failed to load patient profile';
      setProfileModal((prev) => ({
        ...prev,
        loading: false,
        error: message
      }));
    }
  };

  const downloadDocument = useCallback(async (doc) => {
    await openDocumentWithFallback({ doc, toast });
  }, []);

  const preparePrescriptionForContext = useCallback((prescription) => {
    if (!prescription) return null;
    const normalizedTests = normalizePrescriptionTests(prescription);
    const allRequests = coerceRequestList(profileModal.testRequests || []);

    const resolveRequestId = (value) => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "object") return value._id || value.id || value.requestId || null;
      return null;
    };

    const prescriptionRequestId =
      resolveRequestId(prescription.testRequestId) ||
      resolveRequestId(prescription.latestTestRequest) ||
      resolveRequestId(prescription.testRequest);

    const relevantRequests = allRequests.filter((request) => {
      if (!request || typeof request !== "object") return false;
      const requestId = request._id || request.id || request.requestId || (request.testRequest && (request.testRequest._id || request.testRequest.id));
      if (prescriptionRequestId && requestId) return requestId === prescriptionRequestId;
      if (prescription.visit && request.visit) return String(request.visit).toLowerCase() === String(prescription.visit).toLowerCase();
      if (request.patientId && prescription.patientId) {
        const reqPatientId = typeof request.patientId === "object" ? request.patientId._id || request.patientId.id : request.patientId;
        const presPatientId = typeof prescription.patientId === "object" ? prescription.patientId._id || prescription.patientId.id : prescription.patientId;
        if (reqPatientId && presPatientId && reqPatientId === presPatientId) return true;
      }
      return !prescriptionRequestId;
    });

    const matchableRequests = relevantRequests && relevantRequests.length > 0 ? relevantRequests : allRequests;
    const derivedRequests = normalizePatientTestRequests(matchableRequests, { fallbackInstruction: resolveFollowUpInstruction(prescription) });
    const combinedTests = normalizedTests.length > 0 ? normalizedTests : derivedRequests.items;
    const followUpFromPrescription = resolveFollowUpInstruction(prescription);
    const fallbackFollowUp = derivedRequests.instructions.length > 0 ? derivedRequests.instructions.join("\n") : "";

    return {
      ...prescription,
      tests: combinedTests,
      followUpInstruction: (followUpFromPrescription && followUpFromPrescription.trim()) || fallbackFollowUp || prescription.followUpInstruction || "",
      remarks: resolveRemarks(prescription)
    };
  }, [profileModal.testRequests]);

  const handleViewPrescription = (prescription) => {
    const prepared = preparePrescriptionForContext(prescription);
    if (!prepared) return;
    setSelectedPrescription(prepared);
    setShowPrescriptionModal(true);
  };

  const handleClosePrescriptionPreview = () => {
    setShowPrescriptionModal(false);
    setSelectedPrescription(null);
  };

  const handleViewAllergy = (allergyItem, allergyType) => {
    setSelectedAllergy({ ...allergyItem, allergyType });
    setShowAllergyModal(true);
  };

  const handleCloseAllergyModal = () => {
    setShowAllergyModal(false);
    setSelectedAllergy(null);
  };

  const handleDownloadPrescription = (prescription) => {
    if (!prescription) return;
    if (!profileModal.patient) {
      toast.warn('Patient details are still loading. Please try again.');
      return;
    }

    try {
      const prepared = preparePrescriptionForContext(prescription);
      if (!prepared) {
        toast.error('Unable to prepare prescription for printing.');
        return;
      }

      const html = buildPrescriptionPrintHTML({
        centerInfo: profileModal.centerInfo,
        patient: profileModal.patient,
        prescription: { ...prepared, remarks: prepared.remarks || DEFAULT_REMARKS },
        fallbackRemarks: DEFAULT_REMARKS,
        hideHeaderFooter: false
      });
      openPrintPreview(html);
    } catch (error) {
      toast.error(error?.message || 'Unable to open print preview. Please allow pop-ups and try again.');
    }
  };

  const openReportModal = async (request) => {
    const patientId = request?.patientId;

    if (!patientId) {
      toast.error('Patient record is not linked to this request.');
      return;
    }

    setReportModal({
      open: true,
      loading: true,
      error: null,
      items: [],
      patient: {
        id: patientId,
        name: request.patientName,
        invoice: request.billing?.invoiceNumber || 'N/A'
      }
    });

    try {
      const response = await API.get(`/test-requests/patient/${patientId}`);
      const items = Array.isArray(response.data) ? response.data : [];
      setReportModal((prev) => ({
        ...prev,
        loading: false,
        items,
        error: items.length === 0 ? 'No test reports were found for this patient.' : null
      }));
    } catch (error) {
      const message = error?.response?.data?.message || error.message || 'Failed to fetch test reports.';
      setReportModal((prev) => ({
        ...prev,
        loading: false,
        error: message,
        items: []
      }));
    }
  };

  const closeReportModal = () => {
    setReportModal({ open: false, loading: false, error: null, items: [], patient: null });
  };

  const handleViewReport = async (reportId) => {
    try {
      await viewPDFReport(reportId);
      toast.success('Opening test report in a new tab.');
    } catch (error) {
      toast.error(error.message || 'Failed to open test report.');
    }
  };

  const closeProfileModal = () => {
    setProfileModal({
      open: false,
      loading: false,
      error: null,
      activeTab: 'overview',
      patient: null,
      history: [],
      tests: [],
      medications: [],
      followUps: [],
      allergies: {
        rhinitis: [],
        conjunctivitis: [],
        bronchitis: [],
        dermatitis: [],
        gpe: []
      },
      prescriptions: [],
      testRequests: [],
      centerInfo: DEFAULT_CENTER_INFO
    });
    setShowPrescriptionModal(false);
    setSelectedPrescription(null);
  };

  const setProfileTab = (tabKey) => {
    setProfileModal((prev) => ({
      ...prev,
      activeTab: tabKey
    }));
  };

  const renderActionButton = (request) => {
    switch (request.status) {
      case 'Billing_Generated':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-amber-700 bg-amber-50 rounded-full border border-amber-200">
            <Timer className="w-4 h-4" /> Awaiting Payment Confirmation
          </span>
        );
      case 'Billing_Paid':
        return (
          <button
            onClick={() => confirmStatusUpdate(request, 'Lab_Received')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700"
          >
            <PackageCheck className="w-4 h-4" />
            Mark Received
          </button>
        );
      case 'Lab_Received':
        return (
          <button
            onClick={() => confirmStatusUpdate(request, 'Ready')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-purple-700"
          >
            <Timer className="w-4 h-4" />
            Mark Ready
          </button>
        );
      case 'Ready':
        return (
          <button
            onClick={() => confirmStatusUpdate(request, 'Delivered')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-emerald-700"
          >
            <Truck className="w-4 h-4" />
            Mark Delivered
          </button>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-teal-700 bg-teal-50 rounded-full border border-teal-200">
            <CheckCircle2 className="w-4 h-4" /> Awaiting Reception Closure
          </span>
        );
      case 'Received':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-slate-600 bg-slate-100 rounded-full border border-slate-200">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 text-sm text-rose-700 bg-rose-50 rounded-full border border-rose-200">
            <Timer className="w-4 h-4" /> Cancelled by Reception
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">SLIT Therapy Workflow</h1>
          <p className="text-slate-500">Manage SLIT therapy preparation and delivery statuses.</p>
        </div>
        <button
          onClick={() => dispatch(fetchLabSlitTherapyRequests())}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {AVAILABLE_FILTERS.map((filter) => (
              <option key={filter} value={filter}>{filter.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-slate-600 mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name, phone, or invoice number"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && <div className="p-6 text-center text-slate-500">Loading SLIT therapy requests...</div>}

        {!loading && filteredRequests.length === 0 && (
          <div className="p-6 text-center text-slate-500">No SLIT therapy requests found for selected filters.</div>
        )}

        {!loading && filteredRequests.length > 0 && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, filteredRequests.length)}</span>
                {' '}to{' '}
                <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, filteredRequests.length)}</span>
                {' '}of{' '}
                <span className="font-semibold text-slate-800">{filteredRequests.length}</span> requests
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Workflow Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Package Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Timeline</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedRequests.map((request) => {
                    const statusClass = STATUS_COLORS[request.status] || 'bg-slate-100 text-slate-700';
                    const statusLabel = STATUS_LABELS[request.status] || formatStatus(request.status);
                    return (
                      <tr key={request._id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 align-top text-sm text-slate-700">
                          <div className="text-sm font-semibold text-slate-800">{request.patientName}</div>
                          <div className="text-xs text-slate-500">{request.patientPhone || '—'}</div>
                          {request.patientCode && (
                            <div className="text-xs text-blue-600 font-medium">{request.patientCode}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-700 space-y-2">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                            {statusLabel}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {getStatusDescription(request)}
                          </p>
                          <div className="flex flex-col gap-1 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                Billing
                              </span>
                              <span className="font-semibold text-slate-700">
                                {STATUS_LABELS[request.status] || formatStatus(request.status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                                SLIT Therapy
                              </span>
                              <span className="font-semibold text-slate-700 capitalize">{request.labStatus || 'pending'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-700 space-y-2">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Package</div>
                            <div className="font-medium text-slate-800">{request.productName}</div>
                            <div className="text-xs text-slate-500">Code: {request.productCode}</div>
                            <div className="text-xs text-slate-500">Quantity: {request.quantity}</div>
                          </div>
                          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Invoice</span>
                              <span className="font-semibold text-slate-700">{request.billing?.invoiceNumber || 'Pending'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Delivery</span>
                              <span className="font-semibold text-slate-700 capitalize">{request.deliveryMethod || 'pickup'}</span>
                            </div>
                            {request.courierRequired && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Courier Fee</span>
                                <span className="font-semibold text-slate-700">{formatCurrency(request.courierFee || 0)}</span>
                              </div>
                            )}
                            {request.courierTrackingNumber && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Tracking</span>
                                <span className="font-semibold text-slate-700">{request.courierTrackingNumber}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-700">
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Last Update</div>
                              <div className="text-sm font-medium text-slate-800">{formatDateTime(request.updatedAt || request.createdAt)}</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              Created {formatDateTime(request.createdAt)}
                            </div>
                            {request.deliveryMethod === 'courier' && request.status === 'Ready' && (
                              <div className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                Awaiting courier pickup
                              </div>
                            )}
                            {request.status === 'Delivered' && (
                              <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Delivery confirmed by SLIT therapy
                              </div>
                            )}
                            {request.status === 'Received' && (
                              <div className="text-xs text-slate-600 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                Workflow completed by reception
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-600">
                          {request.notes && (
                            <div className="mb-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Reception Notes</div>
                              <div className="text-slate-700 mt-1 text-sm">{request.notes}</div>
                            </div>
                          )}
                          {request.labNotes && (
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">SLIT Therapy Notes</div>
                              <div className="text-slate-700 mt-1 text-sm">{request.labNotes}</div>
                            </div>
                          )}
                          {!request.notes && !request.labNotes && <span className="text-slate-400">No additional notes.</span>}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => handleViewProfile(request)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-md hover:border-blue-400 hover:bg-blue-50"
                              title="View Patient Profile"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Profile
                            </button>
                            <button
                              onClick={() => openReportModal(request)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-md hover:border-indigo-400 hover:bg-indigo-50"
                              title="View Test Reports"
                            >
                              <FileDown className="w-3.5 h-3.5" /> View Reports
                            </button>
                            {renderActionButton(request)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-800">{currentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md border ${currentPage === 1 ? 'text-slate-400 border-slate-200 cursor-not-allowed bg-white' : 'text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                >
                  Prev
                </button>
                <span className="text-sm text-slate-500">{filteredRequests.length ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredRequests.length)}` : '0 - 0'}</span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md border ${currentPage === totalPages ? 'text-slate-400 border-slate-200 cursor-not-allowed bg-white' : 'text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {reportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Patient Test Reports</h2>
                <p className="text-xs text-slate-500">
                  {reportModal.patient?.name || 'Patient'} • Invoice {reportModal.patient?.invoice || 'N/A'}
                </p>
              </div>
              <button onClick={closeReportModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {reportModal.loading && (
                <div className="py-12 text-center text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  Loading reports...
                </div>
              )}

              {!reportModal.loading && reportModal.error && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  {reportModal.error}
                </div>
              )}

              {!reportModal.loading && !reportModal.error && reportModal.items.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
                  No test reports are available for this patient.
                </div>
              )}

              {!reportModal.loading && reportModal.items.length > 0 && (
                <div className="space-y-3">
                  {reportModal.items.map((item) => {
                    const canViewReport = ['Report_Generated', 'Report_Sent', 'Completed', 'feedback_sent'].includes(item.status) && !!item.reportFilePath;
                    return (
                      <div key={item._id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="space-y-1 text-sm text-slate-700">
                            <div className="font-semibold text-slate-800">{item.testType || 'SLIT Therapy Test Request'}</div>
                            <div className="text-xs text-slate-500">Request ID: {item._id}</div>
                            <div className="text-xs text-slate-500">Status: <span className="font-semibold text-slate-700">{item.status?.replace(/_/g, ' ') || 'Unknown'}</span></div>
                            {item.billing && (
                              <div className="text-xs text-slate-500">Billing: {item.billing.status?.replace(/_/g, ' ') || 'N/A'} • Paid ₹{Number(item.billing.paidAmount || 0).toFixed(2)}</div>
                            )}
                            {item.reportGeneratedDate && (
                              <div className="text-xs text-slate-500">Report Generated: {formatDateTime(item.reportGeneratedDate)}</div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewReport(item._id)}
                              disabled={!canViewReport}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md ${canViewReport ? 'text-indigo-600 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50' : 'text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                            >
                              <FileDown className="w-3.5 h-3.5" /> {canViewReport ? 'Open Report' : 'Report Pending'}
                            </button>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-xs text-slate-500">SLIT Therapy Notes: {item.notes}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={closeReportModal}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {profileModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Patient Medical Profile</h2>
                <p className="text-xs text-slate-500">
                  {profileModal.patient?.name || 'Patient'} • {profileModal.patient?.phone || 'No phone'}
                </p>
              </div>
              <button onClick={closeProfileModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            {profileModal.loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                Loading patient details...
              </div>
            )}

            {!profileModal.loading && profileModal.error && (
              <div className="flex-1 flex items-center justify-center px-6 py-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 max-w-xl text-center">
                  {profileModal.error}
                </div>
              </div>
            )}

            {!profileModal.loading && !profileModal.error && (
              <>
                <div className="px-6 pt-4 border-b border-slate-200 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {PROFILE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setProfileTab(tab.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${profileModal.activeTab === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {profileModal.activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-xs font-semibold uppercase text-slate-500">Patient Information</h3>
                        <div className="mt-2 space-y-1">
                          <p><span className="font-semibold text-slate-700">Name:</span> {profileModal.patient?.name || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Age:</span> {profileModal.patient?.age || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Gender:</span> {profileModal.patient?.gender || '—'}</p>
                          <p><span className="font-semibold text-slate-700">UHID:</span> {profileModal.patient?.patientCode || profileModal.patient?.uhId || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Phone:</span> {profileModal.patient?.phone || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Email:</span> {profileModal.patient?.email || '—'}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-xs font-semibold uppercase text-slate-500">Center & Tracking</h3>
                        <div className="mt-2 space-y-1">
                          <p><span className="font-semibold text-slate-700">Center:</span> {profileModal.patient?.centerName || profileModal.patient?.centerCode || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Registered At:</span> {formatDateTime(profileModal.patient?.createdAt)}</p>
                          <p><span className="font-semibold text-slate-700">Current Doctor:</span> {profileModal.patient?.currentDoctor?.name || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Assigned Doctor:</span> {profileModal.patient?.assignedDoctor?.name || '—'}</p>
                          <p><span className="font-semibold text-slate-700">Address:</span> {profileModal.patient?.address || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {profileModal.activeTab === 'history' && (
                    <div className="space-y-4">
                      {profileModal.history.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-sm text-slate-500">No medical history records found.</div>
                        </div>
                      ) : (
                        profileModal.history.map((historyItem, idx) => {
                          const normalizeAttachment = (doc) => {
                            if (!doc) return null;
                            if (typeof doc === "string") {
                              const inferredName = doc.split(/[\\/]/).pop() || doc;
                              // Check if it's a document ID (MongoDB ObjectId format)
                              if (/^[0-9a-fA-F]{24}$/.test(doc)) {
                                return { documentId: doc, filename: inferredName, originalName: inferredName };
                              }
                              return { filename: inferredName, originalName: inferredName, path: doc };
                            }
                            const normalized = { ...doc };
                            // Preserve document ID fields (critical for authenticated access)
                            if (doc._id && !normalized.documentId) normalized.documentId = doc._id;
                            if (doc.documentId && !normalized.documentId) normalized.documentId = doc.documentId;
                            if (doc.id && !normalized.documentId && !normalized._id) normalized.documentId = doc.id;
                            if (normalized.url && !normalized.path && !normalized.downloadPath) normalized.path = normalized.url;
                            if (!normalized.filename) normalized.filename = doc.filename || doc.fileName || doc.name || doc.documentName || doc.originalName || "";
                            if (!normalized.originalName) normalized.originalName = doc.originalName || doc.name || doc.fileName || doc.filename || doc.documentName || normalized.filename || "";
                            const derivedPath = doc.path || doc.downloadPath || doc.url || (typeof normalized.filename === "string" && normalized.filename.includes("/") ? normalized.filename : undefined);
                            if (!normalized.path && derivedPath) normalized.path = derivedPath;
                            if (!normalized.size) normalized.size = doc.size || doc.fileSize || doc.sizeInBytes;
                            return normalized.documentId || normalized._id || normalized.filename || normalized.path || normalized.downloadPath ? normalized : null;
                          };

                          const attachments = [
                            ...(Array.isArray(historyItem.attachments) ? historyItem.attachments : []),
                            ...(Array.isArray(historyItem.medicalHistoryDocs) ? historyItem.medicalHistoryDocs : [])
                          ]
                            .map(normalizeAttachment)
                            .filter(Boolean);

                          if (attachments.length === 0 && historyItem.reportFile) {
                            attachments.push(normalizeAttachment({ 
                              filename: historyItem.reportFile, 
                              originalName: historyItem.originalName || "Medical Report",
                              _id: historyItem.reportFileId || historyItem.documentId,
                              documentId: historyItem.reportFileId || historyItem.documentId
                            }));
                          }

                          const flattened = flattenHistoryItem(historyItem);
                          const allergicFields = [
                            { label: "Hay Fever", value: flattened.hayFever, duration: formatDuration(flattened.hayFeverDuration) },
                            { label: "Asthma", value: flattened.asthma, duration: formatDuration(flattened.asthmaDuration) },
                            { label: "Food Allergies", value: flattened.foodAllergies, duration: formatDuration(flattened.foodAllergiesDuration) },
                            { label: "Drug Allergy", value: flattened.drugAllergy, duration: formatDuration(flattened.drugAllergyDuration) },
                            { label: "Eczema/Rashes", value: flattened.eczemaRashes, duration: formatDuration(flattened.eczemaRashesDuration) }
                          ];

                          const respiratoryFields = [
                            { label: "Breathing Problems", value: flattened.breathingProblems, duration: formatDuration(flattened.breathingProblemsDuration) },
                            { label: "Sinus Trouble", value: flattened.sinusTrouble, duration: formatDuration(flattened.sinusTroubleDuration) },
                            { label: "Hives/Swelling", value: flattened.hivesSwelling, duration: formatDuration(flattened.hivesSwellingDuration) },
                            { label: "Asthma Type", value: flattened.asthmaType },
                            { label: "Exercise Induced", value: flattened.exerciseInducedSymptoms }
                          ];

                          const medicalHistoryFields = [
                            { label: "Hypertension", value: flattened.hypertension, duration: formatDuration(flattened.hypertensionDuration) },
                            { label: "Diabetes", value: flattened.diabetes, duration: formatDuration(flattened.diabetesDuration) },
                            { label: "Hospital Admissions", value: flattened.hospitalAdmission, duration: formatDuration(flattened.hospitalAdmissionDuration) },
                            { label: "Family Smoking", value: flattened.familySmoking, duration: formatDuration(flattened.familySmokingDuration) },
                            { label: "Pets at Home", value: flattened.petsAtHome, duration: formatDuration(flattened.petsAtHomeDuration) }
                          ];

                          const generalExaminationFields = [
                            { label: "Blood Pressure", value: flattened.bloodPressure },
                            { label: "Pulse Rate", value: flattened.pulseRate },
                            { label: "SpO2", value: flattened.spo2 }
                          ];

                          const clinicalFields = [
                            { label: "Family History", value: flattened.familyHistory },
                            { label: "Other Findings", value: flattened.otherFindings },
                            { label: "Clinical Notes", value: flattened.notes || flattened.additionalNotes },
                            { label: "Treatment Plan", value: flattened.treatmentPlan },
                            { label: "Occupation", value: flattened.occupation }
                          ];

                          const renderSection = (title, fields, gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3") => {
                            const visibleFields = fields.filter(({ value, duration }) => {
                              const hasValue = value !== undefined && value !== null && value !== "" && value !== "N/A";
                              const hasDuration = duration !== undefined && duration !== null && duration !== "";
                              return hasValue || hasDuration;
                            });
                            if (visibleFields.length === 0) return null;
                            return (
                              <div key={title}>
                                <h4 className="font-medium text-slate-700 mb-2">{title}</h4>
                                <div className={gridClass}>
                                  {visibleFields.map(({ label, value, duration }) => renderHistoryField(label, value, duration))}
                                </div>
                              </div>
                            );
                          };

                          const sections = [
                            renderSection("General Examination", generalExaminationFields, "grid grid-cols-1 sm:grid-cols-3 gap-3"),
                            renderSection("Allergic Conditions", allergicFields),
                            renderSection("Respiratory & Triggers", respiratoryFields),
                            renderSection("Medical History", medicalHistoryFields),
                            renderSection("Clinical Notes", clinicalFields, "grid grid-cols-1 sm:grid-cols-2 gap-3")
                          ].filter(Boolean);

                          const triggerBadges = [
                            flattened.triggersUrtis && { label: "URTI", className: "bg-red-100 text-red-800" },
                            flattened.triggersColdWeather && { label: "Cold Weather", className: "bg-blue-100 text-blue-800" },
                            flattened.triggersPollen && { label: "Pollen", className: "bg-yellow-100 text-yellow-800" },
                            flattened.triggersSmoke && { label: "Smoke", className: "bg-gray-100 text-gray-800" },
                            flattened.triggersExercise && { label: "Exercise", className: "bg-green-100 text-green-800" },
                            flattened.triggersPets && { label: "Pets", className: "bg-purple-100 text-purple-800" },
                            flattened.triggersOthers && { label: flattened.triggersOthers, className: "bg-orange-100 text-orange-800" }
                          ].filter(Boolean);

                          const hasStructuredData = sections.length > 0 || triggerBadges.length > 0;
                          const hasAttachments = attachments.length > 0;

                          return (
                            <div key={historyItem._id || idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                  <h3 className="text-sm font-medium text-slate-800">Medical History Record #{idx + 1}</h3>
                                  <span className="text-xs text-slate-500">{formatRecordDate(historyItem.createdAt || historyItem.date)}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedHistoryRecord(historyItem);
                                    setShowFullHistoryModal(true);
                                  }}
                                  className="inline-flex items-center justify-center px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs font-medium"
                                >
                                  View Full History
                                </button>
                              </div>

                              {hasStructuredData ? (
                                <>
                                  {sections}
                                  {triggerBadges.length > 0 && (
                                    <div className="pt-3 border-t border-slate-200">
                                      <h4 className="font-medium text-slate-700 mb-2">Triggers</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {triggerBadges.map((badge, badgeIdx) => (
                                          <span key={badgeIdx} className={`${badge.className} px-2 py-1 rounded-full text-xs`}>
                                            {badge.label}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-slate-500">No structured history data recorded. Use the supporting documents below to review the details.</p>
                              )}

                              {hasAttachments && (
                                <div className="pt-3 border-t border-slate-200">
                                  <h4 className="font-medium text-slate-700 mb-2">Supporting Documents</h4>
                                  <div className="space-y-2">
                                    {attachments.map((doc, attachmentIdx) => {
                                      const label = doc.originalName || doc.filename || `Document ${attachmentIdx + 1}`;
                                      return (
                                        <button
                                          type="button"
                                          key={`${doc.documentId || doc.filename || attachmentIdx}`}
                                          onClick={() => downloadDocument(doc)}
                                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-left text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors w-full"
                                        >
                                          <span className="flex items-center gap-2 truncate">
                                            <Download className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium truncate max-w-[200px]" title={label}>
                                              {label}
                                            </span>
                                          </span>
                                          <span className="text-slate-500">{doc.size ? formatFileSize(doc.size) : ""}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}


                  {profileModal.activeTab === 'medications' && (
                    <div className="space-y-3">
                      {profileModal.prescriptions && profileModal.prescriptions.length > 0 ? (
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
                              {profileModal.prescriptions.map((prescription, idx) => {
                                const meds = normalizePrescriptionMedications(prescription);
                                const { firstName, count, instructionsPreview } = summarizeMedications(meds);
                                const displayDateRaw = resolvePrescriptionDate(prescription);
                                const displayDate = displayDateRaw ? new Date(displayDateRaw).toLocaleDateString() : 'N/A';
                                const prescribedBy = resolvePrescribedBy(prescription) || 'N/A';
                                return (
                                  <tr key={`prescription-${idx}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{displayDate}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{prescribedBy}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                      <div className="font-semibold text-slate-800">{firstName}</div>
                                      {count > 1 && <div className="text-slate-500 text-[11px]">+ {count - 1} more medicine{count - 1 === 1 ? '' : 's'}</div>}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{instructionsPreview}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                                        <button
                                          onClick={() => handleViewPrescription(prescription)}
                                          className="inline-flex items-center justify-center px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs"
                                        >
                                          View
                                        </button>
                                        <button
                                          onClick={() => handleDownloadPrescription(prescription)}
                                          className="inline-flex items-center justify-center px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors text-xs"
                                        >
                                          Print
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-sm text-slate-500">No prescriptions available.</div>
                        </div>
                      )}
                    </div>
                  )}

                  {profileModal.activeTab === 'followups' && (
                    <div className="space-y-4">
                      {/* Follow Up Visits */}
                      {profileModal.followUps && profileModal.followUps.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700 mb-3">Follow Up Visits</h3>
                          <div className="space-y-3">
                            {profileModal.followUps.map((fu, idx) => (
                              <div key={fu._id || idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                  <div>
                                    <div className="font-semibold text-slate-800">{fu.type || fu.followUpType || 'Follow Up'}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {formatDateTime(fu.date || fu.followUpDate || fu.createdAt || fu.scheduledAt)}
                                    </div>
                                  </div>
                                  {fu.status && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      fu.status === 'completed' || fu.status === 'Completed' 
                                        ? 'bg-green-100 text-green-700' 
                                        : fu.status === 'scheduled' || fu.status === 'Scheduled'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {fu.status}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  {fu.notes && (
                                    <div className="sm:col-span-2">
                                      <span className="font-semibold text-slate-700">Notes: </span>
                                      <span className="text-slate-600 whitespace-pre-line">{fu.notes}</span>
                                    </div>
                                  )}
                                  {fu.followUpInstruction && (
                                    <div className="sm:col-span-2">
                                      <span className="font-semibold text-slate-700">Follow-up Instructions: </span>
                                      <span className="text-slate-600 whitespace-pre-line">{fu.followUpInstruction}</span>
                                    </div>
                                  )}
                                  {fu.recommendations && (
                                    <div className="sm:col-span-2">
                                      <span className="font-semibold text-slate-700">Recommendations: </span>
                                      <span className="text-slate-600 whitespace-pre-line">{fu.recommendations}</span>
                                    </div>
                                  )}
                                  {fu.nextVisitDate && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Next Visit: </span>
                                      <span className="text-slate-600">{formatDateTime(fu.nextVisitDate)}</span>
                                    </div>
                                  )}
                                  {fu.duration && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Duration: </span>
                                      <span className="text-slate-600">{fu.duration}</span>
                                    </div>
                                  )}
                                  {fu.updatedBy?.name && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Updated By: </span>
                                      <span className="text-slate-600">{fu.updatedBy.name}</span>
                                    </div>
                                  )}
                                  {fu.createdBy?.name && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Created By: </span>
                                      <span className="text-slate-600">{fu.createdBy.name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Allergy Reports */}
                      {['rhinitis', 'conjunctivitis', 'bronchitis', 'dermatitis', 'gpe'].map((key) => {
                        const labelMap = {
                          rhinitis: 'Allergic Rhinitis',
                          conjunctivitis: 'Allergic Conjunctivitis',
                          bronchitis: 'Allergic Bronchitis',
                          dermatitis: 'Atopic Dermatitis',
                          gpe: 'GPE'
                        };
                        const items = profileModal.allergies?.[key] || [];
                        if (!items || items.length === 0) return null;
                        
                        return (
                          <div key={key}>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">{labelMap[key]}</h3>
                            <div className="space-y-3">
                              {items.map((item, itemIdx) => (
                                <div key={item._id || itemIdx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                    <div>
                                      <div className="font-semibold text-slate-800">{item.type || item.condition || labelMap[key]}</div>
                                      <div className="text-xs text-slate-500 mt-1">{formatDateTime(item.createdAt || item.date)}</div>
                                    </div>
                                    <button
                                      onClick={() => handleViewAllergy(item, labelMap[key])}
                                      className="inline-flex items-center justify-center px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs font-medium"
                                    >
                                      View
                                    </button>
                                  </div>
                                  <div className="mt-3 space-y-2 text-sm">
                                    {item.notes && (
                                      <div>
                                        <span className="font-semibold text-slate-700">Notes: </span>
                                        <span className="text-slate-600 whitespace-pre-line line-clamp-2">{item.notes}</span>
                                      </div>
                                    )}
                                    {item.severity && (
                                      <div>
                                        <span className="font-semibold text-slate-700">Severity: </span>
                                        <span className="text-slate-600">{item.severity}</span>
                                      </div>
                                    )}
                                    {item.duration && (
                                      <div>
                                        <span className="font-semibold text-slate-700">Duration: </span>
                                        <span className="text-slate-600">{item.duration}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Show message if no data */}
                      {(!profileModal.followUps || profileModal.followUps.length === 0) && 
                       (!profileModal.allergies?.rhinitis || profileModal.allergies.rhinitis.length === 0) &&
                       (!profileModal.allergies?.conjunctivitis || profileModal.allergies.conjunctivitis.length === 0) &&
                       (!profileModal.allergies?.bronchitis || profileModal.allergies.bronchitis.length === 0) &&
                       (!profileModal.allergies?.dermatitis || profileModal.allergies.dermatitis.length === 0) &&
                       (!profileModal.allergies?.gpe || profileModal.allergies.gpe.length === 0) && (
                        <div className="text-center py-8">
                          <div className="text-sm text-slate-500">No follow-up visits or allergy reports recorded.</div>
                        </div>
                      )}
                    </div>
                  )}


                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-right">
                  <button
                    onClick={closeProfileModal}
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showPrescriptionModal && selectedPrescription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8"
          onClick={handleClosePrescriptionPreview}
        >
          <div
            className="relative flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Prescription Preview</h3>
                <p className="text-xs text-slate-500">
                  {profileModal.patient?.name ? `Patient: ${profileModal.patient.name}` : "Patient details"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPrescription(selectedPrescription)}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={handleClosePrescriptionPreview}
                  className="rounded-full p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                  aria-label="Close prescription preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
              <PrescriptionPreviewCard
                centerInfo={profileModal.centerInfo}
                patient={profileModal.patient}
                prescription={selectedPrescription}
                testRequests={profileModal.testRequests}
              />
            </div>
          </div>
        </div>
      )}

      {showAllergyModal && selectedAllergy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8"
          onClick={handleCloseAllergyModal}
        >
          <div
            className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{selectedAllergy.allergyType || 'Allergy Report'}</h3>
                <p className="text-xs text-slate-500">
                  {profileModal.patient?.name ? `Patient: ${profileModal.patient.name}` : "Patient details"}
                </p>
              </div>
              <button
                onClick={handleCloseAllergyModal}
                className="rounded-full p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Close allergy details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
              <div className="space-y-6">
                {/* Patient Information */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                    <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                    Patient Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Patient Name</label>
                      <p className="text-gray-900 font-medium text-xs">{profileModal.patient?.name || selectedAllergy.patientId?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Patient ID</label>
                      <p className="text-gray-900 font-medium text-xs">{profileModal.patient?._id || selectedAllergy.patientId?._id || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Assessment Date</label>
                      <p className="text-gray-900 font-medium text-xs">
                        {formatDateTime(selectedAllergy.createdAt || selectedAllergy.date)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Allergic Rhinitis Specific */}
                {selectedAllergy.allergyType === 'Allergic Rhinitis' && (
                  <>
                    {selectedAllergy.type && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Eye className="h-5 w-5 mr-2 text-blue-600" />
                          Clinical Diagnosis
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <span className="text-xs font-semibold text-blue-600 capitalize">
                            {selectedAllergy.type || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.nasalSymptoms && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-blue-600" />
                          Nasal Symptom Severity
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(selectedAllergy.nasalSymptoms).map(([symptom, value]) => (
                              <div key={symptom} className="flex items-center justify-between">
                                <span className="font-medium text-gray-700 capitalize text-xs">
                                  {symptom.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  Score: {value}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="font-medium text-gray-700 text-xs">
                              Total Nasal Symptoms: {Object.values(selectedAllergy.nasalSymptoms).reduce((sum, val) => sum + (parseInt(val) || 0), 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.nonNasalSymptoms && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-blue-600" />
                          Non-Nasal Symptom Severity
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(selectedAllergy.nonNasalSymptoms).map(([symptom, value]) => (
                              <div key={symptom} className="flex items-center justify-between">
                                <span className="font-medium text-gray-700 capitalize text-xs">
                                  {symptom.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  Score: {value}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="font-medium text-gray-700 text-xs">
                              Total Non-Nasal Symptoms: {Object.values(selectedAllergy.nonNasalSymptoms).reduce((sum, val) => sum + (parseInt(val) || 0), 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.qualityOfLife !== undefined && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Quality of Life Assessment</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <p className="font-medium text-gray-700 text-xs">
                            Severity Score: <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">{selectedAllergy.qualityOfLife}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.medications && typeof selectedAllergy.medications === 'object' && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Pill className="h-5 w-5 mr-2 text-blue-600" />
                          Medications
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(selectedAllergy.medications).map(([type, medication]) => (
                              <div key={type}>
                                <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                                  {type.replace(/([A-Z])/g, ' $1').trim()}:
                                </label>
                                <p className="text-gray-800 text-xs">{medication || 'Not specified'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.entExamination && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Stethoscope className="h-5 w-5 mr-2 text-blue-600" />
                          ENT Examination
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <p className="text-gray-800 text-xs whitespace-pre-line">{selectedAllergy.entExamination}</p>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.gpe && typeof selectedAllergy.gpe === 'object' && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">General Physical Examination (GPE)</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(selectedAllergy.gpe).map(([vital, value]) => (
                              <div key={vital}>
                                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">
                                  {vital}:
                                </label>
                                <p className="text-gray-800 text-xs">{value || 'Not recorded'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.systematicExamination && typeof selectedAllergy.systematicExamination === 'object' && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Systematic Examination</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            {Object.entries(selectedAllergy.systematicExamination).map(([system, value]) => {
                              if (system === 'followUpAdvice') return null;
                              return (
                                <div key={system}>
                                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">
                                    {system}:
                                  </label>
                                  <p className="text-gray-800 text-xs">{value || 'Not recorded'}</p>
                                </div>
                              );
                            })}
                          </div>
                          {selectedAllergy.systematicExamination.followUpAdvice && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <label className="block text-xs font-medium text-gray-700 mb-2">Follow-up Advice:</label>
                              <p className="text-gray-800 text-xs">{selectedAllergy.systematicExamination.followUpAdvice}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Allergic Conjunctivitis Specific */}
                {selectedAllergy.allergyType === 'Allergic Conjunctivitis' && (
                  <>
                    {selectedAllergy.type && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Eye className="h-5 w-5 mr-2 text-blue-600" />
                          Clinical Diagnosis
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <span className="text-xs font-semibold text-blue-600 capitalize">
                            {selectedAllergy.type || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.symptoms && typeof selectedAllergy.symptoms === 'object' && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Presenting Symptoms</h2>
                        {(() => {
                          const presentSymptoms = Object.entries(selectedAllergy.symptoms)
                            .filter(([_, value]) => value === 'yes' || value === true)
                            .map(([symptom, _]) => symptom);
                          return presentSymptoms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {presentSymptoms.map((symptom, index) => (
                                <div key={index} className="bg-white rounded-lg p-3 border-l-4 border-green-500">
                                  <div className="flex items-center space-x-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-gray-800 font-medium text-xs capitalize">{symptom.replace(/([A-Z])/g, ' $1').trim()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                              <div className="flex items-center space-x-2">
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 text-xs">No symptoms reported</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {selectedAllergy.grading && typeof selectedAllergy.grading === 'object' && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Severity Assessment</h2>
                        {(() => {
                          const severitySummary = Object.entries(selectedAllergy.grading)
                            .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
                            .map(([criterion, severity]) => ({ criterion, severity: String(severity || '') }));
                          return severitySummary.length > 0 ? (
                            <div className="space-y-4">
                              {severitySummary.map(({ criterion, severity }, index) => (
                                <div key={index} className="bg-white rounded-lg p-4 border">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-800 font-medium text-xs capitalize">{criterion.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      severity.toLowerCase() === 'mild' ? 'bg-green-100 text-green-800' :
                                      severity.toLowerCase() === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                              <div className="flex items-center space-x-2">
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 text-xs">No severity assessment completed</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}

                {/* Allergic Bronchitis Specific */}
                {selectedAllergy.allergyType === 'Allergic Bronchitis' && (
                  <>
                    {selectedAllergy.type && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Eye className="h-5 w-5 mr-2 text-blue-600" />
                          Clinical Diagnosis
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <span className="text-xs font-semibold text-blue-600 capitalize">
                            {selectedAllergy.type || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.symptoms && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Presenting Symptoms</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <p className="text-gray-800 whitespace-pre-wrap text-xs">
                            {typeof selectedAllergy.symptoms === 'object' 
                              ? JSON.stringify(selectedAllergy.symptoms, null, 2)
                              : selectedAllergy.symptoms || 'No symptoms recorded'}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.ginaGrading && typeof selectedAllergy.ginaGrading === 'object' && Object.keys(selectedAllergy.ginaGrading).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-blue-600" />
                          GINA Grading of Asthma
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="space-y-3">
                            {Object.entries(selectedAllergy.ginaGrading).map(([question, value]) => (
                              <div key={question} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-700 font-medium text-xs capitalize">{question.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  value === 'Controlled' ? 'bg-green-100 text-green-800' :
                                  value === 'Partially Controlled' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.pftGrading && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-blue-600" />
                          PFT Grading
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <span className={`px-3 py-2 rounded-full text-xs font-medium ${
                            selectedAllergy.pftGrading === 'Mild' ? 'bg-green-100 text-green-800' :
                            selectedAllergy.pftGrading === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                            selectedAllergy.pftGrading === 'Severe' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedAllergy.pftGrading}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.habits && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Patient Habits</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <span className={`px-3 py-2 rounded-full text-xs font-medium ${
                            selectedAllergy.habits === 'Smoker' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {selectedAllergy.habits}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Atopic Dermatitis Specific */}
                {selectedAllergy.allergyType === 'Atopic Dermatitis' && (
                  <>
                    {selectedAllergy.symptoms && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Symptoms</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <p className="text-gray-900 text-xs">{selectedAllergy.symptoms || 'No symptoms recorded'}</p>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.affectedAreas && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Affected Areas/Surface of the body</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <p className="text-gray-900 text-xs">{selectedAllergy.affectedAreas || 'No affected areas recorded'}</p>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.intensity && typeof selectedAllergy.intensity === 'object' && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Intensity</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(selectedAllergy.intensity).map(([key, value]) => (
                              <div key={key} className="flex flex-col">
                                <label className="text-xs font-medium text-gray-700 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                <div className="bg-gray-50 rounded-md p-2 border">
                                  <span className="text-gray-900 text-xs">{value || 'Not specified'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAllergy.drynessWithoutEczema && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">On skin without eczema</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <label className="block text-xs font-medium text-gray-700 mb-3">Dryness</label>
                          <div className="bg-gray-50 rounded-md p-3 border">
                            <span className="text-gray-900 text-xs">{selectedAllergy.drynessWithoutEczema || 'Not specified'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(selectedAllergy.redness || selectedAllergy.swelling || selectedAllergy.oozing || selectedAllergy.scratching || selectedAllergy.thickenedSkin) && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">On skin with eczema</h2>
                        <div className="bg-white rounded-lg p-4 border space-y-4">
                          {[
                            { key: "redness", label: "Redness" },
                            { key: "swelling", label: "Swelling" },
                            { key: "oozing", label: "Oozing" },
                            { key: "scratching", label: "Traces of scratching" },
                            { key: "thickenedSkin", label: "Thickened Skin" }
                          ].map(({ key, label }) => selectedAllergy[key] && (
                            <div key={key}>
                              <label className="block text-xs font-medium text-gray-700 mb-3">{label}</label>
                              <div className="bg-gray-50 rounded-md p-3 border">
                                <span className="text-gray-900 text-xs">{selectedAllergy[key] || 'Not specified'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedAllergy.itching !== undefined || selectedAllergy.sleepDisturbance !== undefined) && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Severity Assessment</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedAllergy.itching !== undefined && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-3">Severity of Itching</label>
                                <div className="bg-gray-50 rounded-md p-3 border">
                                  <span className="text-gray-900 text-xs">Value: {selectedAllergy.itching || 0}</span>
                                </div>
                              </div>
                            )}
                            {selectedAllergy.sleepDisturbance !== undefined && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-3">Severity of Sleep Disturbance</label>
                                <div className="bg-gray-50 rounded-md p-3 border">
                                  <span className="text-gray-900 text-xs">Value: {selectedAllergy.sleepDisturbance || 0}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {(selectedAllergy.presentMedications || selectedAllergy.localApplications || selectedAllergy.otherMedications) && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Medications</h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedAllergy.presentMedications && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Present Medications</label>
                                <div className="bg-gray-50 rounded-md p-3 border">
                                  <p className="text-gray-900 text-xs">{selectedAllergy.presentMedications}</p>
                                </div>
                              </div>
                            )}
                            {selectedAllergy.localApplications && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Local Applications</label>
                                <div className="bg-gray-50 rounded-md p-3 border">
                                  <p className="text-gray-900 text-xs">{selectedAllergy.localApplications}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          {selectedAllergy.otherMedications && (
                            <div className="mt-4">
                              <label className="block text-xs font-medium text-gray-700 mb-2">Other Medications</label>
                              <div className="bg-gray-50 rounded-md p-3 border">
                                <p className="text-gray-900 text-xs">{selectedAllergy.otherMedications}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* GPE Specific */}
                {selectedAllergy.allergyType === 'GPE' && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                        <Stethoscope className="h-5 w-5 mr-2 text-blue-600" />
                        GPE
                      </h2>
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {selectedAllergy.weight && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Weight (kg)</label>
                                  <p className="text-gray-900 font-medium text-xs">{selectedAllergy.weight}</p>
                                </div>
                              )}
                              {selectedAllergy.height && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Height (cm)</label>
                                  <p className="text-gray-900 font-medium text-xs">{selectedAllergy.height}</p>
                                </div>
                              )}
                              {selectedAllergy.bmi && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">BMI</label>
                                  <p className="text-blue-600 font-semibold text-xs">{selectedAllergy.bmi}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedAllergy.pulse && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">Pulse</label>
                              <p className="text-gray-900 font-medium text-xs">{selectedAllergy.pulse}</p>
                            </div>
                          )}
                          {selectedAllergy.bp && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">BP</label>
                              <p className="text-gray-900 font-medium text-xs">{selectedAllergy.bp}</p>
                            </div>
                          )}
                          {selectedAllergy.rr && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">RR</label>
                              <p className="text-gray-900 font-medium text-xs">{selectedAllergy.rr}</p>
                            </div>
                          )}
                          {selectedAllergy.temp && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">Temp</label>
                              <p className="text-gray-900 font-medium text-xs">{selectedAllergy.temp}</p>
                            </div>
                          )}
                          {selectedAllergy.spo2 && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">SPO2%</label>
                              <p className="text-gray-900 font-medium text-xs">{selectedAllergy.spo2}</p>
                            </div>
                          )}
                          {selectedAllergy.entExamination && (
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500">ENT Examination</label>
                              <p className="text-gray-900 font-medium text-xs">{selectedAllergy.entExamination}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {(selectedAllergy.cns || selectedAllergy.cvs || selectedAllergy.rs || selectedAllergy.pa || selectedAllergy.drugAdverseNotion || selectedAllergy.drugCompliance || selectedAllergy.adviseFollowUp || selectedAllergy.otherMedications) && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-blue-600" />
                          Systematic Examination
                        </h2>
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedAllergy.cns && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">CNS</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.cns}</p>
                              </div>
                            )}
                            {selectedAllergy.cvs && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">CVS</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.cvs}</p>
                              </div>
                            )}
                            {selectedAllergy.rs && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">RS</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.rs}</p>
                              </div>
                            )}
                            {selectedAllergy.pa && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">P/A</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.pa}</p>
                              </div>
                            )}
                            {selectedAllergy.drugAdverseNotion && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Drug Adverse Notion</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.drugAdverseNotion}</p>
                              </div>
                            )}
                            {selectedAllergy.drugCompliance && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Drug Compliance</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.drugCompliance}</p>
                              </div>
                            )}
                            {selectedAllergy.adviseFollowUp && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Advise to be followed up till next visit</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.adviseFollowUp}</p>
                              </div>
                            )}
                            {selectedAllergy.otherMedications && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Other Medications</label>
                                <p className="text-gray-900 font-medium text-xs">{selectedAllergy.otherMedications}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Generic fields for any allergy type */}
                {selectedAllergy.notes && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-sm font-semibold text-gray-800 mb-4">Notes</h2>
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-gray-800 whitespace-pre-line text-xs">{selectedAllergy.notes}</p>
                    </div>
                  </div>
                )}

                {/* Record Metadata */}
                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Record Created:</span>
                      <span className="text-gray-900">
                        {selectedAllergy.createdAt ? formatDateTime(selectedAllergy.createdAt) : 'N/A'}
                      </span>
                    </div>
                    {selectedAllergy.updatedAt && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Last Updated:</span>
                        <span className="text-gray-900">
                          {formatDateTime(selectedAllergy.updatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full History Modal */}
      {showFullHistoryModal && selectedHistoryRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8"
          onClick={() => {
            setShowFullHistoryModal(false);
            setSelectedHistoryRecord(null);
          }}
        >
          <div
            className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Medical History Details</h3>
                <p className="text-xs text-slate-500">
                  {profileModal.patient?.name ? `Patient: ${profileModal.patient.name}` : "Patient details"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFullHistoryModal(false);
                  setSelectedHistoryRecord(null);
                }}
                className="rounded-full p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Close history details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-br from-slate-50 to-blue-50">
              <div className="bg-white rounded-xl shadow-sm border border-blue-100">
                <div className="p-6 border-b border-blue-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-500" />
                        History Record
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-blue-500 mt-2">
                        <Calendar className="h-4 w-4" />
                        {selectedHistoryRecord.createdAt ? new Date(selectedHistoryRecord.createdAt).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Medical Conditions */}
                  {(selectedHistoryRecord.hayFever || selectedHistoryRecord.asthma || selectedHistoryRecord.breathingProblems || selectedHistoryRecord.hivesSwelling || 
                    selectedHistoryRecord.sinusTrouble || selectedHistoryRecord.eczemaRashes || selectedHistoryRecord.foodAllergies || selectedHistoryRecord.arthriticDiseases || 
                    selectedHistoryRecord.immuneDefect || selectedHistoryRecord.drugAllergy || selectedHistoryRecord.beeStingHypersensitivity) && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                        Medical Conditions
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedHistoryRecord.hayFever && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Hay Fever:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.hayFever}</span>
                            </div>
                            {selectedHistoryRecord.hayFeverDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.hayFeverDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.asthma && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Asthma:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.asthma}</span>
                            </div>
                            {selectedHistoryRecord.asthmaDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.asthmaDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.breathingProblems && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Breathing Problems:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.breathingProblems}</span>
                            </div>
                            {selectedHistoryRecord.breathingProblemsDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.breathingProblemsDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.hivesSwelling && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Hives/Swelling:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.hivesSwelling}</span>
                            </div>
                            {selectedHistoryRecord.hivesSwellingDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.hivesSwellingDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.sinusTrouble && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Sinus Trouble:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.sinusTrouble}</span>
                            </div>
                            {selectedHistoryRecord.sinusTroubleDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.sinusTroubleDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.eczemaRashes && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Eczema/Rashes:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.eczemaRashes}</span>
                            </div>
                            {selectedHistoryRecord.eczemaRashesDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.eczemaRashesDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.foodAllergies && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Food Allergies:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.foodAllergies}</span>
                            </div>
                            {selectedHistoryRecord.foodAllergiesDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.foodAllergiesDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.drugAllergy && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Drug Allergy:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.drugAllergy}</span>
                            </div>
                            {selectedHistoryRecord.drugAllergyDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.drugAllergyDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.arthriticDiseases && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Arthritic Diseases:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.arthriticDiseases}</span>
                            </div>
                            {selectedHistoryRecord.arthriticDiseasesDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.arthriticDiseasesDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.immuneDefect && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Immune Defect:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.immuneDefect}</span>
                            </div>
                            {selectedHistoryRecord.immuneDefectDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.immuneDefectDuration} months
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHistoryRecord.beeStingHypersensitivity && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Bee Sting Hypersensitivity:</span>
                              <span className="text-sm text-slate-800 font-medium">{selectedHistoryRecord.beeStingHypersensitivity}</span>
                            </div>
                            {selectedHistoryRecord.beeStingHypersensitivityDuration && (
                              <div className="text-xs text-slate-500">
                                Duration: {selectedHistoryRecord.beeStingHypersensitivityDuration} months
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Triggers */}
                  {(selectedHistoryRecord.triggersUrtis !== undefined || selectedHistoryRecord.triggersColdWeather !== undefined || selectedHistoryRecord.triggersPollen !== undefined || selectedHistoryRecord.triggersSmoke !== undefined || selectedHistoryRecord.triggersExercise !== undefined || selectedHistoryRecord.triggersPets !== undefined || selectedHistoryRecord.triggersOthers) && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                        Triggers
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedHistoryRecord.triggersUrtis !== undefined && (
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-slate-600">URTIs:</span>
                            <span className={`text-xs font-medium ${selectedHistoryRecord.triggersUrtis ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedHistoryRecord.triggersUrtis ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {selectedHistoryRecord.triggersColdWeather !== undefined && (
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-slate-600">Cold Weather:</span>
                            <span className={`text-xs font-medium ${selectedHistoryRecord.triggersColdWeather ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedHistoryRecord.triggersColdWeather ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {selectedHistoryRecord.triggersPollen !== undefined && (
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-slate-600">Pollen:</span>
                            <span className={`text-xs font-medium ${selectedHistoryRecord.triggersPollen ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedHistoryRecord.triggersPollen ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {selectedHistoryRecord.triggersSmoke !== undefined && (
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-slate-600">Smoke:</span>
                            <span className={`text-xs font-medium ${selectedHistoryRecord.triggersSmoke ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedHistoryRecord.triggersSmoke ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {selectedHistoryRecord.triggersExercise !== undefined && (
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-slate-600">Exercise:</span>
                            <span className={`text-xs font-medium ${selectedHistoryRecord.triggersExercise ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedHistoryRecord.triggersExercise ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {selectedHistoryRecord.triggersPets !== undefined && (
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-slate-600">Pets:</span>
                            <span className={`text-xs font-medium ${selectedHistoryRecord.triggersPets ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedHistoryRecord.triggersPets ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {selectedHistoryRecord.triggersOthers && (
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-slate-600">Other Triggers:</span>
                            <span className="text-xs text-slate-800 font-medium">{selectedHistoryRecord.triggersOthers}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Report File */}
                  {(() => {
                    const normalizeAttachment = (doc) => {
                      if (!doc) return null;
                      if (typeof doc === "string") {
                        const inferredName = doc.split(/[\\/]/).pop() || doc;
                        // Check if it's a document ID (MongoDB ObjectId format)
                        if (/^[0-9a-fA-F]{24}$/.test(doc)) {
                          return { documentId: doc, filename: inferredName, originalName: inferredName };
                        }
                        return { filename: inferredName, originalName: inferredName, path: doc };
                      }
                      const normalized = { ...doc };
                      // Preserve document ID fields (critical for authenticated access)
                      if (doc._id && !normalized.documentId) normalized.documentId = doc._id;
                      if (doc.documentId && !normalized.documentId) normalized.documentId = doc.documentId;
                      if (doc.id && !normalized.documentId && !normalized._id) normalized.documentId = doc.id;
                      if (normalized.url && !normalized.path && !normalized.downloadPath) normalized.path = normalized.url;
                      if (!normalized.filename) normalized.filename = doc.filename || doc.fileName || doc.name || doc.documentName || doc.originalName || "";
                      if (!normalized.originalName) normalized.originalName = doc.originalName || doc.name || doc.fileName || doc.filename || doc.documentName || normalized.filename || "";
                      const derivedPath = doc.path || doc.downloadPath || doc.url || (typeof normalized.filename === "string" && normalized.filename.includes("/") ? normalized.filename : undefined);
                      if (!normalized.path && derivedPath) normalized.path = derivedPath;
                      if (!normalized.size) normalized.size = doc.size || doc.fileSize || doc.sizeInBytes;
                      return normalized.documentId || normalized._id || normalized.filename || normalized.path || normalized.downloadPath ? normalized : null;
                    };

                    const attachments = [
                      ...(Array.isArray(selectedHistoryRecord.attachments) ? selectedHistoryRecord.attachments : []),
                      ...(Array.isArray(selectedHistoryRecord.medicalHistoryDocs) ? selectedHistoryRecord.medicalHistoryDocs : [])
                    ]
                      .map(normalizeAttachment)
                      .filter(Boolean);

                    if (attachments.length === 0 && selectedHistoryRecord.reportFile) {
                      attachments.push(normalizeAttachment({ 
                        filename: selectedHistoryRecord.reportFile, 
                        originalName: selectedHistoryRecord.originalName || "Medical Report",
                        _id: selectedHistoryRecord.reportFileId || selectedHistoryRecord.documentId,
                        documentId: selectedHistoryRecord.reportFileId || selectedHistoryRecord.documentId
                      }));
                    }

                    return attachments.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                          Attached Report
                        </h3>
                        <div className="space-y-2">
                          {attachments.map((doc, attachmentIdx) => {
                            const label = doc.originalName || doc.filename || `Document ${attachmentIdx + 1}`;
                            return (
                              <div key={`${doc.documentId || doc._id || doc.filename || attachmentIdx}`} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <span className="text-xs font-medium text-blue-800 flex-1">{label}</span>
                                <button
                                  onClick={() => downloadDocument(doc)}
                                  className="ml-auto bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                                >
                                  View File
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

