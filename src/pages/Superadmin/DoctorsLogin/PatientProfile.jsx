import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchSuperAdminDoctorPatientById,
  fetchSuperAdminDoctorPatientHistory,
  fetchSuperAdminDoctorPatientMedications,
  fetchSuperAdminDoctorPatientLabReports
} from "../../../features/superadmin/superAdminDoctorSlice";
import {
  fetchPatientGeneralFollowUps,
  fetchPatientPrescriptions,
  fetchAllergicRhinitis,
  fetchAllergicConjunctivitis,
  fetchAllergicBronchitis,
  fetchAtopicDermatitis,
  fetchGPE,
  fetchPatientHistory
} from "../../../features/superadmin/superadminThunks";
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  MapPin,
  Pill,
  FileText,
  Eye,
  Mail,
  UserCheck,
  Download,
  Printer,
  X,
  AlertCircle
} from "lucide-react";
import { openDocumentWithFallback } from "../../../utils/documentHelpers";
import { buildPrescriptionPrintHTML, openPrintPreview } from "../../../utils/prescriptionPrint";
import { API_CONFIG } from "../../../config/environment";

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
          item.frequency || item.freq || item.medicineFrequency || ""
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
              instruction: "—"
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
        instruction: instruction || "—"
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
      instruction: resolvedInstruction || "—"
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
      request.testOrderDetails
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
    instructions: Array.from(instructionSet)
  };
};

const summarizeMedications = (medications) => {
  if (!Array.isArray(medications) || medications.length === 0) {
    return {
      firstName: "—",
      count: 0,
      instructionsPreview: "—"
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
    instructionsPreview: instructionPreview || "—"
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
          minute: "2-digit"
        })
      : date.toLocaleDateString("en-GB");
  };

  const contactLine = (segments) => segments.filter(Boolean).join(" | ");

  const medications = normalizePrescriptionMedications(prescription);
  const prescriptionTests = useMemo(() => normalizePrescriptionTests(prescription), [prescription]);
  const requestDerived = useMemo(() => {
    const normalized = normalizePatientTestRequests(testRequests, {
      fallbackInstruction: resolveFollowUpInstruction(prescription)
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
          mergedCenter.code ? `Center Code: ${mergedCenter.code}` : ""
        ]) ? (
          <p className="text-[11px] text-slate-700">
            {contactLine([
              mergedCenter.phone ? `Phone: ${mergedCenter.phone}` : "",
              mergedCenter.fax ? `Fax: ${mergedCenter.fax}` : "",
              mergedCenter.code ? `Center Code: ${mergedCenter.code}` : ""
            ])}
          </p>
        ) : null}
        {contactLine([mergedCenter.email ? `Email: ${mergedCenter.email}` : "", mergedCenter.website || ""]) ? (
          <p className="text-[11px] text-slate-700">
            {contactLine([
              mergedCenter.email ? `Email: ${mergedCenter.email}` : "",
              mergedCenter.website || ""
            ])}
          </p>
        ) : null}
        {contactLine([
          mergedCenter.labWebsite ? `Lab: ${mergedCenter.labWebsite}` : "",
          mergedCenter.missCallNumber ? `Missed Call: ${mergedCenter.missCallNumber}` : "",
          mergedCenter.mobileNumber ? `Appointment: ${mergedCenter.mobileNumber}` : ""
        ]) ? (
          <p className="text-[11px] text-slate-700">
            {contactLine([
              mergedCenter.labWebsite ? `Lab: ${mergedCenter.labWebsite}` : "",
              mergedCenter.missCallNumber ? `Missed Call: ${mergedCenter.missCallNumber}` : "",
              mergedCenter.mobileNumber ? `Appointment: ${mergedCenter.mobileNumber}` : ""
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

const PatientProfile = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Overview");
  const [centerInfo, setCenterInfo] = useState(DEFAULT_CENTER_INFO);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const {
    singlePatient,
    patientHistory,
    patientMedications,
    patientLabReports,
    dataLoading,
    dataError
  } = useSelector((state) => state.superAdminDoctors);

  const {
    patientFollowUps: generalFollowUps,
    allergicRhinitis,
    allergicConjunctivitis,
    allergicBronchitis,
    atopicDermatitis,
    gpe,
    patientData,
    patientDataLoading,
    patientDataError
  } = useSelector((state) => state.superadmin);

  const patient = useMemo(() => {
    if (!singlePatient) return null;
    if (typeof singlePatient === "object" && singlePatient !== null) {
      return singlePatient.patient || singlePatient;
    }
    return null;
  }, [singlePatient]);

  const testRequests = useMemo(() => {
    if (Array.isArray(patientLabReports) && patientLabReports.length > 0) {
      return patientLabReports;
    }
    if (Array.isArray(patientData?.testRequests) && patientData.testRequests.length > 0) {
      return patientData.testRequests;
    }
    return [];
  }, [patientLabReports, patientData?.testRequests]);

  const prescriptionList = useMemo(() => {
    if (Array.isArray(patientData?.prescriptions) && patientData.prescriptions.length > 0) {
      return patientData.prescriptions;
    }
    if (Array.isArray(patientHistory?.prescriptions) && patientHistory.prescriptions.length > 0) {
      return patientHistory.prescriptions;
    }
    if (Array.isArray(patientMedications) && patientMedications.length > 0) {
      return patientMedications.map((medication, index) => ({
        _id: medication._id || `generated-${index}`,
        createdAt: medication.prescribedDate || medication.createdAt,
        prescribedBy: medication.prescribedBy,
        notes: medication.instructions,
        medications: [
          {
            drugName: medication.drugName,
            dose: medication.dose,
            duration: medication.duration,
            frequency: medication.frequency,
            instructions: medication.instructions
          }
        ]
      }));
    }
    return [];
  }, [patientData?.prescriptions, patientHistory?.prescriptions, patientMedications]);

  const allergicRhinitisData = useMemo(
    () => (Array.isArray(allergicRhinitis) && allergicRhinitis.length > 0
      ? allergicRhinitis
      : Array.isArray(patientHistory?.allergicRhinitis)
      ? patientHistory.allergicRhinitis
      : []),
    [allergicRhinitis, patientHistory?.allergicRhinitis]
  );

  const allergicConjunctivitisData = useMemo(
    () => (Array.isArray(allergicConjunctivitis) && allergicConjunctivitis.length > 0
      ? allergicConjunctivitis
      : Array.isArray(patientHistory?.allergicConjunctivitis)
      ? patientHistory.allergicConjunctivitis
      : []),
    [allergicConjunctivitis, patientHistory?.allergicConjunctivitis]
  );

  const allergicBronchitisData = useMemo(
    () => (Array.isArray(allergicBronchitis) && allergicBronchitis.length > 0
      ? allergicBronchitis
      : Array.isArray(patientHistory?.allergicBronchitis)
      ? patientHistory.allergicBronchitis
      : []),
    [allergicBronchitis, patientHistory?.allergicBronchitis]
  );

  const atopicDermatitisData = useMemo(
    () => (Array.isArray(atopicDermatitis) && atopicDermatitis.length > 0
      ? atopicDermatitis
      : Array.isArray(patientHistory?.atopicDermatitis)
      ? patientHistory.atopicDermatitis
      : []),
    [atopicDermatitis, patientHistory?.atopicDermatitis]
  );

  const gpeData = useMemo(
    () => (Array.isArray(gpe) && gpe.length > 0
      ? gpe
      : Array.isArray(patientHistory?.gpe)
      ? patientHistory.gpe
      : []),
    [gpe, patientHistory?.gpe]
  );

  const followUpsList = useMemo(
    () => (Array.isArray(generalFollowUps) && generalFollowUps.length > 0
      ? generalFollowUps
      : Array.isArray(patientHistory?.followups)
      ? patientHistory.followups
      : []),
    [generalFollowUps, patientHistory?.followups]
  );

  const historyRecords = useMemo(() => {
    if (Array.isArray(patientData?.history) && patientData.history.length > 0) {
      return patientData.history;
    }
    if (Array.isArray(patientHistory?.historyData)) {
      return patientHistory.historyData;
    }
    return [];
  }, [patientData?.history, patientHistory?.historyData]);

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
      logoUrl: resolveCenterLogo(center, DEFAULT_CENTER_INFO.logoUrl)
    };
  }, [patient?.centerId]);

  useEffect(() => {
    setCenterInfo((prev) => ({
      ...prev,
      ...resolvedCenterInfo
    }));
  }, [resolvedCenterInfo]);

  useEffect(() => {
    if (!patientId || ["undefined", "null", ""].includes(String(patientId))) {
      return;
    }

    dispatch(fetchSuperAdminDoctorPatientById(patientId));
    dispatch(fetchSuperAdminDoctorPatientHistory(patientId));
    dispatch(fetchSuperAdminDoctorPatientMedications(patientId));
    dispatch(fetchSuperAdminDoctorPatientLabReports(patientId));
    dispatch(fetchPatientGeneralFollowUps(patientId));
    dispatch(fetchPatientPrescriptions(patientId));
    dispatch(fetchAllergicRhinitis(patientId));
    dispatch(fetchAllergicConjunctivitis(patientId));
    dispatch(fetchAllergicBronchitis(patientId));
    dispatch(fetchAtopicDermatitis(patientId));
    dispatch(fetchGPE(patientId));
    dispatch(fetchPatientHistory(patientId));
  }, [dispatch, patientId]);

  const downloadDocument = useCallback(
    async (doc) => {
      await openDocumentWithFallback({ doc, toast });
    },
    []
  );

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
        fallbackInstruction: resolveFollowUpInstruction(prescription)
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
        remarks: resolveRemarks(prescription)
      };
    },
    [testRequests]
  );

  const handleViewPrescription = useCallback(
    (prescription) => {
      const prepared = preparePrescriptionForContext(prescription);
      if (!prepared) return;
      setSelectedPrescription(prepared);
      setShowPrescriptionModal(true);
    },
    [preparePrescriptionForContext]
  );

  const handleClosePrescriptionPreview = useCallback(() => {
    setShowPrescriptionModal(false);
    setSelectedPrescription(null);
  }, []);

  const handleDownloadPrescription = useCallback(
    (prescription) => {
      if (!prescription) return;
      if (!patient) {
        toast.warn("Patient details are still loading. Please try again.");
        return;
      }

      try {
        const prepared = preparePrescriptionForContext(prescription);
        if (!prepared) {
          toast.error("Unable to prepare prescription for printing.");
          return;
        }

        const html = buildPrescriptionPrintHTML({
          centerInfo,
          patient,
          prescription: {
            ...prepared,
            remarks: prepared.remarks || DEFAULT_REMARKS,
          },
          fallbackRemarks: DEFAULT_REMARKS,
          hideHeaderFooter: true
        });
        openPrintPreview(html);
      } catch (error) {
        toast.error(error?.message || "Unable to open print preview. Please allow pop-ups and try again.");
      }
    },
    [preparePrescriptionForContext, patient, centerInfo]
  );

  const isInitialLoading = (dataLoading || patientDataLoading) && !patient;
  const errorMessage = dataError || patientDataError;

  if (!patientId || ["undefined", "null", ""].includes(String(patientId))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-xs">No patient ID provided in the URL.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600 text-xs">Loading patient information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-sm font-semibold text-red-800">Error Loading Patient Data</h3>
            </div>
            <p className="text-red-700 mb-4 text-xs">{errorMessage}</p>
            <button
              onClick={() => navigate("/dashboard/superadmin/doctor/patients")}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
              <h3 className="text-sm font-semibold text-yellow-800">Patient Not Found</h3>
            </div>
            <p className="text-yellow-700 mb-4 text-xs">
              The patient with ID "{patientId}" was not found. Please check the URL and try again.
            </p>
            <button
              onClick={() => navigate("/dashboard/superadmin/doctor/patients")}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-xs"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const summaryCards = [
    { label: "Medications", value: prescriptionList.length },
    { label: "Follow-ups", value: followUpsList.length },
    { label: "Allergic Records", value: allergicRhinitisData.length + allergicConjunctivitisData.length + allergicBronchitisData.length + atopicDermatitisData.length },
    { label: "History Records", value: historyRecords.length }
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => navigate("/dashboard/superadmin/doctor/patients")}
              className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients List
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-md font-bold text-slate-800 mb-2 break-words">{patient?.name || "Patient Name"}</h1>
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-slate-600 text-xs">
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
              <div className="flex flex-col items-end space-y-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  Read Only
                </span>
              </div>
            </div>
          </div>

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

          {activeTab === "Overview" && (
            <div className="space-y-6 sm:space-y-8">
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
                        <p className="text-slate-800 font-medium text-xs break-words">{patient.name || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Mobile</label>
                        <p className="text-slate-800 text-xs break-words">
                          {typeof patient.phone === "string"
                            ? patient.phone
                            : typeof patient.contact === "string"
                            ? patient.contact
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                        <p className="text-slate-800 text-xs break-words">
                          {typeof patient.email === "string" ? patient.email : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                        <p className="text-slate-800 text-xs break-words">
                          {typeof patient.address === "string" ? patient.address : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Assigned Doctor</label>
                        <p className="text-slate-800 text-xs break-words">
                          {patient.assignedDoctor?.name || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                        <p className="text-slate-800 capitalize text-xs">{patient.gender || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Age</label>
                        <p className="text-slate-800 text-xs">{patient.age ? `${patient.age} years` : "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Center</label>
                        <p className="text-slate-800 text-xs break-words">
                          {patient.centerId?.name || (typeof patient.centerCode === "string" ? patient.centerCode : "N/A")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card) => (
                  <div key={card.label} className="bg-white border border-blue-100 rounded-lg p-4">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                      {card.label}
                    </p>
                    <p className="text-xl font-semibold text-blue-600">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Follow Up" && (
            <div className="space-y-6 sm:space-y-8">
              <FollowUpSection
                title="Allergic Rhinitis"
                records={allergicRhinitisData}
                patient={patient}
                onView={() => navigate(`/dashboard/superadmin/doctor/followups/ViewAllergicRhinitis/${patient._id}`)}
              />
              <FollowUpSection
                title="Atopic Dermatitis"
                records={atopicDermatitisData}
                patient={patient}
                onView={() => navigate(`/dashboard/superadmin/doctor/followups/ViewAtopicDermatitis/${patient._id}`)}
                showSymptoms
              />
              <FollowUpSection
                title="Allergic Conjunctivitis"
                records={allergicConjunctivitisData}
                patient={patient}
                onView={() => navigate(`/dashboard/superadmin/doctor/followups/ViewAllergicConjunctivitis/${patient._id}`)}
              />
              <FollowUpSection
                title="Allergic Bronchitis"
                records={allergicBronchitisData}
                patient={patient}
                onView={() => navigate(`/dashboard/superadmin/doctor/followups/ViewAllergicBronchitis/${patient._id}`)}
              />
              <FollowUpSection
                title="GPE"
                records={gpeData}
                patient={patient}
                onView={() => navigate(`/dashboard/superadmin/doctor/followups/ViewGPE/${patient._id}`)}
              />
            </div>
          )}

          {activeTab === "History" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Patient History
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Medical history, family history, and clinical notes
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/superadmin/doctor/patient/${patientId}/history`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Full History
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {historyRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-xs">No history records found</p>
                  </div>
                ) : (
                  historyRecords.map((historyItem, idx) => (
                    <HistoryCard
                      key={historyItem._id || idx}
                      historyItem={historyItem}
                      index={idx}
                      downloadDocument={downloadDocument}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "Medications" && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100">
              <div className="p-4 sm:p-6 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    Medications
                  </h2>
                  <p className="text-slate-600 mt-1 text-xs">
                    Current and past medications prescribed to the patient
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!patient?._id) return;
                    const redirectPath = encodeURIComponent(`/dashboard/superadmin/doctor/patient/${patient._id}/profile`);
                    navigate(`/dashboard/Doctor/patients/profile/AddMedications/${patient._id}?redirectPath=${redirectPath}&redirectTab=Medications`);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs"
                >
                  Create / Print Prescription
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {(patientDataLoading || dataLoading) && prescriptionList.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs">Loading medications...</p>
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prescribed By</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Medicines</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Instructions</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {prescriptionList.map((prescription, idx) => {
                          const meds = normalizePrescriptionMedications(prescription);
                          const { firstName, count, instructionsPreview } = summarizeMedications(meds);
                          const displayDateRaw = resolvePrescriptionDate(prescription);
                          const displayDate = displayDateRaw
                            ? new Date(displayDateRaw).toLocaleDateString()
                            : "N/A";
                          const prescribedBy = resolvePrescribedBy(prescription) || "N/A";
                          return (
                            <tr key={`prescription-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-600">{displayDate}</td>
                              <td className="px-4 py-3 text-xs text-slate-600">{prescribedBy}</td>
                              <td className="px-4 py-3 text-xs text-slate-600">
                                <div className="font-semibold text-slate-800">{firstName}</div>
                                {count > 1 && (
                                  <div className="text-slate-500 text-[11px]">+ {count - 1} more medicine{count - 1 === 1 ? "" : "s"}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">
                                {instructionsPreview}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">
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
            <div className="bg-slate-100/80 px-6 py-3 text-xs text-slate-600 border-b border-slate-200">
              <span>Center information auto-filled from patient profile.</span>
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

const FollowUpSection = ({ title, records, patient, onView, showSymptoms = false }) => (
  <div className="bg-white rounded-xl shadow-sm border border-blue-100">
    <div className="p-4 sm:p-6 border-b border-blue-100">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
    </div>
    <div className="p-4 sm:p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient Name</th>
              {showSymptoms ? (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Symptoms</th>
              ) : (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Center Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Updated Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {Array.isArray(records) && records.length > 0 ? (
              records.map((record, idx) => (
                <tr key={record._id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-800">{patient.name}</td>
                  {showSymptoms ? (
                    <td className="px-4 py-3 text-xs text-slate-800">{record.symptoms || "N/A"}</td>
                  ) : (
                    <td className="px-4 py-3 text-xs text-slate-800">{patient.age || "N/A"}</td>
                  )}
                  <td className="px-4 py-3 text-xs text-slate-800">{patient.centerId?.code || "N/A"}</td>
                  <td className="px-4 py-3 text-xs text-slate-800">{patient.phone || "N/A"}</td>
                  <td className="px-4 py-3 text-xs text-slate-800">
                    {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-800">
                    <button onClick={onView} className="text-blue-600 hover:text-blue-900 font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showSymptoms ? 6 : 6} className="px-4 py-8 text-center text-slate-500">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-xs">No {title.toLowerCase()} records found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const isFileLike = (value) => {
  if (typeof File !== "undefined" && value instanceof File) return true;
  if (typeof Blob !== "undefined" && value instanceof Blob) return true;
  return false;
};

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !isFileLike(value);

const flattenHistoryItem = (item) => {
  if (!item || typeof item !== "object") {
    return item || {};
  }

  const result = { ...item };
  const stack = [item];
  const seen = new Set();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!isPlainObject(current) || seen.has(current)) continue;
    seen.add(current);

    Object.entries(current).forEach(([key, value]) => {
      if (isPlainObject(value)) {
        stack.push(value);
      }

      if (
        result[key] === undefined ||
        result[key] === null ||
        result[key] === "" ||
        (isPlainObject(result[key]) && Object.keys(result[key]).length === 0)
      ) {
        result[key] = value;
      }
    });
  }

  return result;
};

const HistoryCard = ({ historyItem, index, downloadDocument }) => {
  const normalizeAttachment = (doc) => {
    if (!doc) return null;
    if (typeof doc === "string") {
      const inferredName = doc.split(/[\\/]/).pop() || doc;
      return {
        filename: inferredName,
        originalName: inferredName,
        path: doc
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
      (typeof normalized.filename === "string" && normalized.filename.includes("/")
        ? normalized.filename
        : undefined);

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
    ...(Array.isArray(historyItem.supportingDocuments) ? historyItem.supportingDocuments : []),
    ...(Array.isArray(historyItem.documents) ? historyItem.documents : []),
    ...(Array.isArray(historyItem.historyDocuments) ? historyItem.historyDocuments : []),
    ...(Array.isArray(historyItem.files) ? historyItem.files : [])
  ]
    .map(normalizeAttachment)
    .filter(Boolean);

  if (attachments.length === 0 && historyItem.reportFile) {
    attachments.push(
      normalizeAttachment({
        filename: historyItem.reportFile,
        originalName: historyItem.originalName || "Medical Report"
      })
    );
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

  const fallbackDetails = [
    flattened.description,
    flattened.notes,
    flattened.additionalNotes,
    flattened.treatmentPlan,
    flattened.summary,
    flattened.details
  ]
    .filter((detail) => detail && typeof detail === "string" && detail.trim().length > 0);

  const hasStructuredData = sections.length > 0 || triggerBadges.length > 0;
  const hasAttachments = attachments.length > 0;

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-800">
            Medical History Record #{index + 1}
          </h3>
          <span className="text-xs text-slate-500">
            {formatRecordDate(historyItem.createdAt || historyItem.date)}
          </span>
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
        <div className="space-y-2 text-xs text-slate-600">
          {fallbackDetails.length > 0 ? (
            fallbackDetails.map((detail, idx) => (
              <p key={idx} className="leading-relaxed whitespace-pre-line">
                {detail}
              </p>
            ))
          ) : (
            <p>No structured history data recorded. Use the supporting documents and full history view for details.</p>
          )}
        </div>
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
};

export default PatientProfile;

