import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { fetchPatientDetails, fetchPatientMedications, fetchPatientHistory, fetchPatientFollowUps, fetchAllergicRhinitis, fetchAllergicConjunctivitis, fetchAllergicBronchitis, fetchAtopicDermatitis, fetchGPE, fetchPrescriptions, fetchTests, fetchPatientTestRequests, updatePatient } from '../../../../features/doctor/doctorThunks';
import { canDoctorEditPatient, getEditRestrictionMessage } from '../../../../utils/patientPermissions';
import {
  ArrowLeft, User, Phone, Calendar, MapPin, Activity, Pill, FileText, Eye, Edit, Plus, AlertCircle, Mail, UserCheck, Clock, Download, Printer, X
} from 'lucide-react';
import API from '../../../../services/api';
import { openDocumentWithFallback } from '../../../../utils/documentHelpers';
import { buildPrescriptionPrintHTML, openPrintPreview } from "../../../../utils/prescriptionPrint";
import { API_CONFIG } from "../../../../config/environment";

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
  logoUrl: "",
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

const resolveLogoUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${API_CONFIG.BASE_URL}${normalized}`;
};

const resolveCenterLogo = (entity, previous = "") => {
  if (!entity || !Object.prototype.hasOwnProperty.call(entity, "logoUrl")) {
    return previous;
  }
  return entity.logoUrl ? resolveLogoUrl(entity.logoUrl) : "";
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
    day: "numeric",
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
  prescription?.prescribedDate ||
  prescription?.date ||
  prescription?.createdAt ||
  null;

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
  prescription?.remarks ||
  prescription?.notes ||
  prescription?.instructions ||
  DEFAULT_REMARKS;

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
        duration:
          item.duration ||
          item.period ||
          item.medicineDuration ||
          item.course ||
          "—",
        instruction: item.instructions || item.instruction || "—",
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
    prescription?.testRequestData?.selectedTests,
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
        candidate.entries,
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
      return value
        .split(/[\n,;]+/)
        .map((segment) => segment.trim())
        .filter(Boolean);
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
    items.push({
      name: resolvedName,
      instruction: resolvedInstruction || "—",
    });
  };

  requestList.forEach((request) => {
    if (!request || typeof request !== "object") {
      return;
    }

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
        pushItem(
          test.testName || test.name || test.testCode || test.code || "—",
          test.instructions || test.instruction,
          perRequestFallback
        );
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
      request.testOrderDetails,
    ];

    let rawSource = possibleSources.find((value) =>
      value && (Array.isArray(value) ? value.length > 0 : typeof value === "object" || value)
    );

    let normalizedEntries = coerceToArray(rawSource);

    if (normalizedEntries.length === 0) {
      normalizedEntries = coerceToArray(request.testType);
    }

    if (normalizedEntries.length === 0 && request.testNamesString) {
      normalizedEntries = coerceToArray(request.testNamesString);
    }

    if (normalizedEntries.length === 0 && request.testName) {
      normalizedEntries = coerceToArray(request.testName);
    }

    if (normalizedEntries.length === 0 && perRequestFallback) {
      pushItem(request.testType || request.testName || "—", "", perRequestFallback);
      return;
    }

    normalizedEntries.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === "object") {
        pushItem(
          entry.name ||
            entry.testName ||
            entry.test_name ||
            entry.title ||
            entry.test ||
            entry.testCode ||
            entry.code ||
            "—",
          entry.instruction || entry.instructions || entry.note || entry.description || entry.details,
          perRequestFallback
        );
      } else {
        pushItem(entry, "", perRequestFallback);
      }
    });
  });

  return {
    items,
    instructions: Array.from(instructionSet),
  };
};

const summarizeMedications = (medications) => {
  if (!Array.isArray(medications) || medications.length === 0) {
    return {
      firstName: "—",
      count: 0,
      instructionsPreview: "—",
    };
  }

  const first = medications[0];
  const name = first.name;
  const instructionPreview = medications
    .map((med) => med.instruction)
    .filter(Boolean)
    .join("; ");

  return {
    firstName: name || "—",
    count: medications.length,
    instructionsPreview: instructionPreview || "—",
  };
};

const PrescriptionPreviewCard = ({ centerInfo = {}, patient, prescription, testRequests = [] }) => {
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
  const prescriptionTests = useMemo(() => normalizePrescriptionTests(prescription), [prescription]);
  const requestDerived = useMemo(() => {
    const normalized = normalizePatientTestRequests(testRequests, {
      fallbackInstruction: resolveFollowUpInstruction(prescription),
    });
    return normalized;
  }, [testRequests, prescription]);
  const tests = prescriptionTests.length > 0 ? prescriptionTests : requestDerived.items;
  const followUpInstruction =
    resolveFollowUpInstruction(prescription) ||
    (requestDerived.instructions.length > 0 ? requestDerived.instructions.join("\n") : "") ||
    "—";
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
        {contactLine([mergedCenter.email ? `Email: ${mergedCenter.email}` : "", mergedCenter.website || ""]) ? (
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
                      {[med.dosage || "", med.frequency || ""].filter(Boolean).join(" ") || "—"}
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

const TABS = ["Overview", "Follow Up", "History", "Medications"];

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

  const downloadDocument = useCallback(
    async (doc) => {
      await openDocumentWithFallback({ doc, toast });
    },
    []
  );



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
    labWebsite: center.labWebsite || DEFAULT_CENTER_INFO.labWebsite,
    missCallNumber: center.missCallNumber || DEFAULT_CENTER_INFO.missCallNumber,
    mobileNumber: center.mobileNumber || DEFAULT_CENTER_INFO.mobileNumber,
    code: center.code || DEFAULT_CENTER_INFO.code,
    logoUrl: resolveCenterLogo(center, DEFAULT_CENTER_INFO.logoUrl),
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
            logoUrl:
              typeof user.centerLogo !== "undefined"
                ? user.centerLogo
                  ? resolveLogoUrl(user.centerLogo)
                  : ""
                : prev.logoUrl,
          }));
        }
        return;
      }

      setCenterLoading(true);
      try {
        const response = await API.get(`/centers/${centerId}`);
        const center = response.data?.data || response.data || {};
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
          logoUrl: resolveCenterLogo(center, prev.logoUrl),
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

  const preparePrescriptionForContext = useCallback(
    (prescription) => {
      if (!prescription) return null;

      const normalizedTests = normalizePrescriptionTests(prescription);
      const allRequests = coerceRequestList(testRequests);

      const resolveRequestId = (value) => {
        if (!value) return null;
        if (typeof value === "string") return value;
        if (typeof value === "object") {
          return value._id || value.id || value.requestId || null;
        }
        return null;
      };

      const prescriptionRequestId =
        resolveRequestId(prescription.testRequestId) ||
        resolveRequestId(prescription.latestTestRequest) ||
        resolveRequestId(prescription.testRequest);

      const relevantRequests = allRequests.filter((request) => {
        if (!request || typeof request !== "object") return false;

        const requestId =
          request._id ||
          request.id ||
          request.requestId ||
          (request.testRequest && (request.testRequest._id || request.testRequest.id));

        if (prescriptionRequestId && requestId) {
          return requestId === prescriptionRequestId;
        }

        if (prescription.visit && request.visit) {
          return String(request.visit).toLowerCase() === String(prescription.visit).toLowerCase();
        }

        if (request.patientId && prescription.patientId) {
          const reqPatientId =
            typeof request.patientId === "object"
              ? request.patientId._id || request.patientId.id
              : request.patientId;
          const presPatientId =
            typeof prescription.patientId === "object"
              ? prescription.patientId._id || prescription.patientId.id
              : prescription.patientId;
          if (reqPatientId && presPatientId && reqPatientId === presPatientId) {
            return true;
          }
        }

        return !prescriptionRequestId;
      });

      const matchableRequests =
        relevantRequests && relevantRequests.length > 0 ? relevantRequests : allRequests;

      const derivedRequests = normalizePatientTestRequests(matchableRequests, {
        fallbackInstruction: resolveFollowUpInstruction(prescription),
      });
      const combinedTests = normalizedTests.length > 0 ? normalizedTests : derivedRequests.items;

      const followUpFromPrescription = resolveFollowUpInstruction(prescription);
      const fallbackFollowUp =
        derivedRequests.instructions.length > 0 ? derivedRequests.instructions.join("\n") : "";

      return {
        ...prescription,
        tests: combinedTests,
        followUpInstruction:
          (followUpFromPrescription && followUpFromPrescription.trim()) ||
          fallbackFollowUp ||
          prescription.followUpInstruction ||
          "",
        remarks: resolveRemarks(prescription),
      };
    },
    [testRequests]
  );

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

  const handleDownloadPrescription = (prescription) => {
    if (!prescription) return;
    if (!patient) {
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
        centerInfo: centerInfo,
        patient,
        prescription: {
          ...prepared,
          remarks: prepared.remarks || DEFAULT_REMARKS,
        },
        fallbackRemarks: DEFAULT_REMARKS,
      });
      openPrintPreview(html);
    } catch (error) {
      toast.error(error?.message || 'Unable to open print preview. Please allow pop-ups and try again.');
    }
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
                    {(history || []).map((historyItem, idx) => {
                      const normalizeAttachment = (doc) => {
                        if (!doc) return null;
                        if (typeof doc === "string") {
                          const inferredName = doc.split(/[\\/]/).pop() || doc;
                          return {
                            filename: inferredName,
                            originalName: inferredName,
                            path: doc,
                          };
                        }

                        const normalized = { ...doc };

                        if (normalized.url && !normalized.path && !normalized.downloadPath) {
                          normalized.path = normalized.url;
                        }

                        if (!normalized.filename) {
                          normalized.filename =
                            doc.filename ||
                            doc.fileName ||
                            doc.name ||
                            doc.documentName ||
                            doc.originalName ||
                            "";
                        }

                        if (!normalized.originalName) {
                          normalized.originalName =
                            doc.originalName ||
                            doc.name ||
                            doc.fileName ||
                            doc.filename ||
                            doc.documentName ||
                            normalized.filename ||
                            "";
                        }

                        const derivedPath =
                          doc.path ||
                          doc.downloadPath ||
                          doc.url ||
                          (typeof normalized.filename === "string" && normalized.filename.includes("/") ? normalized.filename : undefined);

                        if (!normalized.path && derivedPath) {
                          normalized.path = derivedPath;
                        }

                        if (!normalized.size) {
                          normalized.size = doc.size || doc.fileSize || doc.sizeInBytes;
                        }

                        return normalized.filename || normalized.path || normalized.downloadPath ? normalized : null;
                      };

                      const attachments = [
                        ...(Array.isArray(historyItem.attachments) ? historyItem.attachments : []),
                        ...(Array.isArray(historyItem.medicalHistoryDocs) ? historyItem.medicalHistoryDocs : []),
                      ]
                        .map(normalizeAttachment)
                        .filter(Boolean);

                      if (attachments.length === 0 && historyItem.reportFile) {
                        attachments.push(
                          normalizeAttachment({
                            filename: historyItem.reportFile,
                            originalName: historyItem.originalName || "Medical Report",
                          })
                        );
                      }

                      const allergicFields = [
                        { label: "Hay Fever", value: historyItem.hayFever, duration: formatDuration(historyItem.hayFeverDuration) },
                        { label: "Asthma", value: historyItem.asthma, duration: formatDuration(historyItem.asthmaDuration) },
                        { label: "Food Allergies", value: historyItem.foodAllergies, duration: formatDuration(historyItem.foodAllergiesDuration) },
                        { label: "Drug Allergy", value: historyItem.drugAllergy, duration: formatDuration(historyItem.drugAllergyDuration) },
                        { label: "Eczema/Rashes", value: historyItem.eczemaRashes, duration: formatDuration(historyItem.eczemaRashesDuration) },
                      ];

                        const respiratoryFields = [
                        { label: "Breathing Problems", value: historyItem.breathingProblems, duration: formatDuration(historyItem.breathingProblemsDuration) },
                        { label: "Sinus Trouble", value: historyItem.sinusTrouble, duration: formatDuration(historyItem.sinusTroubleDuration) },
                        { label: "Hives/Swelling", value: historyItem.hivesSwelling, duration: formatDuration(historyItem.hivesSwellingDuration) },
                        { label: "Asthma Type", value: historyItem.asthmaType },
                        { label: "Exercise Induced", value: historyItem.exerciseInducedSymptoms },
                      ];

                      const medicalHistoryFields = [
                        { label: "Hypertension", value: historyItem.hypertension, duration: formatDuration(historyItem.hypertensionDuration) },
                        { label: "Diabetes", value: historyItem.diabetes, duration: formatDuration(historyItem.diabetesDuration) },
                        { label: "Hospital Admissions", value: historyItem.hospitalAdmission, duration: formatDuration(historyItem.hospitalAdmissionDuration) },
                        { label: "Family Smoking", value: historyItem.familySmoking, duration: formatDuration(historyItem.familySmokingDuration) },
                        { label: "Pets at Home", value: historyItem.petsAtHome, duration: formatDuration(historyItem.petsAtHomeDuration) },
                      ];

                      const generalExaminationFields = [
                        { label: "Blood Pressure", value: historyItem.bloodPressure },
                        { label: "Pulse Rate", value: historyItem.pulseRate },
                        { label: "SpO2", value: historyItem.spo2 },
                      ];

                      const clinicalFields = [
                        { label: "Family History", value: historyItem.familyHistory },
                        { label: "Other Findings", value: historyItem.otherFindings },
                        { label: "Clinical Notes", value: historyItem.notes || historyItem.additionalNotes },
                        { label: "Treatment Plan", value: historyItem.treatmentPlan },
                        { label: "Occupation", value: historyItem.occupation },
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
                        renderSection("Clinical Notes", clinicalFields, "grid grid-cols-1 sm:grid-cols-2 gap-3"),
                      ].filter(Boolean);

                      const triggerBadges = [
                        historyItem.triggersUrtis && { label: "URTI", className: "bg-red-100 text-red-800" },
                        historyItem.triggersColdWeather && { label: "Cold Weather", className: "bg-blue-100 text-blue-800" },
                        historyItem.triggersPollen && { label: "Pollen", className: "bg-yellow-100 text-yellow-800" },
                        historyItem.triggersSmoke && { label: "Smoke", className: "bg-gray-100 text-gray-800" },
                        historyItem.triggersExercise && { label: "Exercise", className: "bg-green-100 text-green-800" },
                        historyItem.triggersPets && { label: "Pets", className: "bg-purple-100 text-purple-800" },
                        historyItem.triggersOthers && { label: historyItem.triggersOthers, className: "bg-orange-100 text-orange-800" },
                      ].filter(Boolean);

                      const hasStructuredData = sections.length > 0 || triggerBadges.length > 0;
                      const hasAttachments = attachments.length > 0;

                      return (
                        <div key={historyItem._id || idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <h3 className="text-sm font-medium text-slate-800">
                                Medical History Record #{idx + 1}
                              </h3>
                              <span className="text-xs text-slate-500">
                                {formatRecordDate(historyItem.createdAt || historyItem.date)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {hasStructuredData && (
                                <button
                                  onClick={() => navigate(`/dashboard/Doctor/patients/AddHistory/ViewHistory/${patient._id}`)}
                                  className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                >
                                  View Full History
                                </button>
                              )}
                              {hasStructuredData && historyItem._id && (
                                <button
                                  onClick={() => navigate(`/dashboard/Doctor/patients/AddHistory/EditHistory/${patient._id}/${historyItem._id}`)}
                                  className="text-green-600 hover:text-green-900 text-xs font-medium"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
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
                            <p className="text-xs text-slate-500">
                              No structured history data recorded. Use the supporting documents below to review the details.
                            </p>
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
                                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-left text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                    >
                                      <span className="flex items-center gap-2 truncate">
                                        <Download className="h-4 w-4 text-blue-500" />
                                        <span className="font-medium truncate max-w-[200px]" title={label}>
                                          {label}
                                        </span>
                                      </span>
                                      <span className="text-slate-500">
                                        {doc.size ? formatFileSize(doc.size) : ""}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                          const meds = normalizePrescriptionMedications(prescription);
                          const { firstName, count, instructionsPreview } = summarizeMedications(meds);
                          const displayDateRaw = resolvePrescriptionDate(prescription);
                          const displayDate = displayDateRaw
                            ? new Date(displayDateRaw).toLocaleDateString()
                            : 'N/A';
                          const prescribedBy = resolvePrescribedBy(prescription) || 'N/A';
                          return (
                            <tr key={`prescription-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{displayDate}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">{prescribedBy}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                <div className="font-semibold text-slate-800">{firstName}</div>
                                {count > 1 && (
                                  <div className="text-slate-500 text-[11px]">+ {count - 1} more medicine{count - 1 === 1 ? '' : 's'}</div>
                                )}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-600">
                                {instructionsPreview}
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
                  {patient?.name ? `Patient: ${patient.name}` : "Patient details"}
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
            <div className="bg-slate-100/80 px-6 py-3 text-xs text-slate-600 border-b border-slate-200 flex items-center gap-2">
              {centerLoading ? (
                <span>Refreshing center information…</span>
              ) : (
                <span>Center information auto-filled from registered profile.</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
              <PrescriptionPreviewCard
                centerInfo={centerInfo}
                patient={patient}
                prescription={selectedPrescription}
                testRequests={testRequests}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewProfile; 