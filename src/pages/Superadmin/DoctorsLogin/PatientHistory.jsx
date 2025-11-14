import React, { useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Activity,
  AlertCircle,
  RefreshCw,
  Eye,
  Download
} from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchSuperAdminDoctorPatientHistory,
  fetchSuperAdminDoctorPatientLabReports,
  fetchSuperAdminDoctorPatientMedications,
  fetchSuperAdminDoctorPatientFollowups
} from "../../../features/superadmin/superAdminDoctorSlice";
import { fetchPatientHistory as fetchPatientHistoryDetailed } from "../../../features/superadmin/superadminThunks";
import { openDocumentWithFallback } from "../../../utils/documentHelpers";
import { downloadPDFReport, viewPDFReport } from "../../../utils/pdfHandler";

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

  const medicalConditionsFields = [
    { label: "Hay Fever", value: flattened.hayFever, duration: formatDuration(flattened.hayFeverDuration) },
    { label: "Asthma", value: flattened.asthma, duration: formatDuration(flattened.asthmaDuration) },
    { label: "Breathing Problems", value: flattened.breathingProblems, duration: formatDuration(flattened.breathingProblemsDuration) },
    { label: "Hives/Swelling", value: flattened.hivesSwelling, duration: formatDuration(flattened.hivesSwellingDuration) },
    { label: "Sinus Trouble", value: flattened.sinusTrouble, duration: formatDuration(flattened.sinusTroubleDuration) },
    { label: "Eczema/Rashes", value: flattened.eczemaRashes, duration: formatDuration(flattened.eczemaRashesDuration) },
    { label: "Food Allergies", value: flattened.foodAllergies, duration: formatDuration(flattened.foodAllergiesDuration) },
    { label: "Drug Allergy", value: flattened.drugAllergy, duration: formatDuration(flattened.drugAllergyDuration) },
    { label: "Arthritic Diseases", value: flattened.arthriticDiseases, duration: formatDuration(flattened.arthriticDiseasesDuration) },
    { label: "Immune Defect", value: flattened.immuneDefect, duration: formatDuration(flattened.immuneDefectDuration) },
    { label: "Bee Sting Hypersensitivity", value: flattened.beeStingHypersensitivity, duration: formatDuration(flattened.beeStingHypersensitivityDuration) }
  ];

  const hayFeverDetails = [
    { label: "Fever Grade", value: flattened.feverGrade },
    { label: "Itching/Sore Throat", value: flattened.itchingSoreThroat },
    { label: "Specific Day Exposure", value: flattened.specificDayExposure }
  ];

  const asthmaDetails = [
    { label: "Asthma Type", value: flattened.asthmaType },
    { label: "Exacerbations Frequency", value: flattened.exacerbationsFrequency },
    { label: "Hospital Admission", value: flattened.hospitalAdmission },
    { label: "GP Attendances", value: flattened.gpAttendances },
    { label: "AE Attendances", value: flattened.aeAttendances },
    { label: "ITU Admissions", value: flattened.ituAdmissions },
    { label: "Cough/Wheeze Frequency", value: flattened.coughWheezeFrequency }
  ];

  const medicalEvents = [
    { label: "Interval Symptoms", value: flattened.intervalSymptoms },
    { label: "Night Cough Frequency", value: flattened.nightCoughFrequency },
    { label: "Early Morning Cough", value: flattened.earlyMorningCough },
    { label: "Exercise Induced Symptoms", value: flattened.exerciseInducedSymptoms },
    { label: "Family Smoking", value: flattened.familySmoking },
    { label: "Pets at Home", value: flattened.petsAtHome }
  ];

  const allergicRhinitisDetails = [
    { label: "Type", value: flattened.allergicRhinitisType },
    { label: "Sneezing", value: flattened.rhinitisSneezing },
    { label: "Nasal Congestion", value: flattened.rhinitisNasalCongestion },
    { label: "Running Nose", value: flattened.rhinitisRunningNose },
    { label: "Itching Nose", value: flattened.rhinitisItchingNose },
    { label: "Itching Eyes", value: flattened.rhinitisItchingEyes },
    { label: "Coughing", value: flattened.rhinitisCoughing },
    { label: "Wheezing", value: flattened.rhinitisWheezing },
    { label: "Coughing/Wheezing", value: flattened.rhinitisCoughingWheezing },
    { label: "With Exercise", value: flattened.rhinitisWithExercise },
    { label: "Headaches", value: flattened.rhinitisHeadaches },
    { label: "Post Nasal Drip", value: flattened.rhinitisPostNasalDrip }
  ];

  const skinAllergyDetails = [
    { label: "Type", value: flattened.skinAllergyType },
    { label: "Hives Present", value: flattened.skinHeavesPresent },
    { label: "Hives Distribution", value: flattened.skinHeavesDistribution },
    { label: "Eczema Present", value: flattened.skinEczemaPresent },
    { label: "Eczema Distribution", value: flattened.skinEczemaDistribution },
    { label: "Ulcer Present", value: flattened.skinUlcerPresent },
    { label: "Ulcer Distribution", value: flattened.skinUlcerDistribution },
    { label: "Papulo-Squamous Rashes", value: flattened.skinPapuloSquamousRashesPresent },
    { label: "Rashes Distribution", value: flattened.skinPapuloSquamousRashesDistribution },
    { label: "Itching (No Rashes)", value: flattened.skinItchingNoRashesPresent },
    { label: "Itching Distribution", value: flattened.skinItchingNoRashesDistribution }
  ];

  const chronicMedicalHistory = [
    { label: "Hypertension", value: flattened.hypertension },
    { label: "Diabetes", value: flattened.diabetes },
    { label: "Epilepsy", value: flattened.epilepsy },
    { label: "IHD", value: flattened.ihd }
  ];

  const drugAllergySection = [
    { label: "Known Allergies", value: flattened.drugAllergyKnown },
    { label: "Probable", value: flattened.probable },
    { label: "Definite", value: flattened.definite }
  ];

  const occupationExposure = [
    { label: "Occupation", value: flattened.occupation },
    { label: "Chemical Exposure", value: flattened.probableChemicalExposure },
    { label: "Location", value: flattened.location },
    { label: "Family History", value: flattened.familyHistory }
  ];

  const examinationFindings = [
    { label: "Oral Cavity", value: flattened.oralCavity },
    { label: "Skin", value: flattened.skin },
    { label: "ENT", value: flattened.ent },
    { label: "Eye", value: flattened.eye },
    { label: "Respiratory System", value: flattened.respiratorySystem },
    { label: "CVS", value: flattened.cvs },
    { label: "CNS", value: flattened.cns },
    { label: "Abdomen", value: flattened.abdomen },
    { label: "Other Findings", value: flattened.otherFindings }
  ];

  const clinicalNotes = [
    { label: "Clinical Notes", value: flattened.notes || flattened.additionalNotes },
    { label: "Treatment Plan", value: flattened.treatmentPlan },
    { label: "Summary", value: flattened.summary },
    { label: "Details", value: flattened.details }
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

  const triggerBadges = [
    flattened.triggersUrtis !== undefined && { label: "URTIs", value: flattened.triggersUrtis },
    flattened.triggersColdWeather !== undefined && { label: "Cold Weather", value: flattened.triggersColdWeather },
    flattened.triggersPollen !== undefined && { label: "Pollen", value: flattened.triggersPollen },
    flattened.triggersSmoke !== undefined && { label: "Smoke", value: flattened.triggersSmoke },
    flattened.triggersExercise !== undefined && { label: "Exercise", value: flattened.triggersExercise },
    flattened.triggersPets !== undefined && { label: "Pets", value: flattened.triggersPets },
    flattened.triggersOthers && { label: flattened.triggersOthers, value: true, custom: true }
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

  const sections = [
    renderSection("Medical Conditions", medicalConditionsFields),
    renderSection("Hay Fever Details", hayFeverDetails),
    renderSection("Asthma Details", asthmaDetails),
    renderSection("Medical Events & Symptoms", medicalEvents),
    renderSection("Allergic Rhinitis", allergicRhinitisDetails),
    renderSection("Skin Allergy", skinAllergyDetails),
    renderSection("Medical History", chronicMedicalHistory),
    renderSection("Drug Allergies", drugAllergySection),
    renderSection("Occupation & Exposure", occupationExposure),
    renderSection("Examination Findings", examinationFindings),
    renderSection("Clinical Notes", clinicalNotes, "grid grid-cols-1 sm:grid-cols-2 gap-3")
  ].filter(Boolean);

  const hasStructuredData = sections.length > 0 || triggerBadges.length > 0;
  const hasAttachments = attachments.length > 0;

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Medical History Record #{index + 1}</h3>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {triggerBadges.map((badge, badgeIdx) => (
                  <div key={badgeIdx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">
                        {badge.custom ? "Other" : badge.label}:
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          badge.custom
                            ? "text-slate-800"
                            : badge.value
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {badge.custom ? badge.label : badge.value ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
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
                <div
                  key={`${doc.documentId || doc.filename || attachmentIdx}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                >
                  <div className="flex-1">
                    <div className="font-medium truncate" title={label}>
                      {`${attachmentIdx + 1}) ${label}`}
                    </div>
                    {doc.size ? <div className="text-[11px] text-slate-500">{formatFileSize(doc.size)}</div> : null}
                    {doc.path ? (
                      <div className="text-[11px] text-slate-500 break-all">{doc.path}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadDocument(doc)}
                    className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    View File
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const PatientHistory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { patientId } = useParams();

  const {
    patientHistory,
    patientLabReports,
    patientMedications,
    patientFollowups,
    workingLoading,
    workingError,
    dataLoading,
    dataError,
    singlePatient
  } = useSelector((state) => state.superAdminDoctors);
  const {
    patientData,
    patientDataLoading,
    patientDataError
  } = useSelector((state) => state.superadmin);

  const historyRecords = useMemo(() => {
    if (Array.isArray(patientData?.history) && patientData.history.length > 0) {
      return patientData.history;
    }
    if (Array.isArray(patientHistory?.historyData) && patientHistory.historyData.length > 0) {
      return patientHistory.historyData;
    }
    if (Array.isArray(patientHistory) && patientHistory.length > 0) {
      return patientHistory;
    }
    return [];
  }, [patientData?.history, patientHistory]);

  const medications = useMemo(() => {
    if (Array.isArray(patientHistory?.medications) && patientHistory.medications.length > 0) {
      return patientHistory.medications;
    }
    if (Array.isArray(patientMedications) && patientMedications.length > 0) {
      return patientMedications;
    }
    return [];
  }, [patientHistory?.medications, patientMedications]);

  const followups = useMemo(() => {
    if (Array.isArray(patientHistory?.followups) && patientHistory.followups.length > 0) {
      return patientHistory.followups;
    }
    if (Array.isArray(patientFollowups) && patientFollowups.length > 0) {
      return patientFollowups;
    }
    return [];
  }, [patientHistory?.followups, patientFollowups]);

  const allergicRhinitis = useMemo(
    () => (Array.isArray(patientHistory?.allergicRhinitis) ? patientHistory.allergicRhinitis : []),
    [patientHistory?.allergicRhinitis]
  );

  const allergicConjunctivitis = useMemo(
    () => (Array.isArray(patientHistory?.allergicConjunctivitis) ? patientHistory.allergicConjunctivitis : []),
    [patientHistory?.allergicConjunctivitis]
  );

  const allergicBronchitis = useMemo(
    () => (Array.isArray(patientHistory?.allergicBronchitis) ? patientHistory.allergicBronchitis : []),
    [patientHistory?.allergicBronchitis]
  );

  const atopicDermatitis = useMemo(
    () => (Array.isArray(patientHistory?.atopicDermatitis) ? patientHistory.atopicDermatitis : []),
    [patientHistory?.atopicDermatitis]
  );

  const gpe = useMemo(
    () => (Array.isArray(patientHistory?.gpe) ? patientHistory.gpe : []),
    [patientHistory?.gpe]
  );

  const prescriptions = useMemo(
    () => (Array.isArray(patientHistory?.prescriptions) ? patientHistory.prescriptions : []),
    [patientHistory?.prescriptions]
  );

  const labReports = useMemo(() => {
    if (Array.isArray(patientLabReports) && patientLabReports.length > 0) {
      return patientLabReports;
    }
    if (Array.isArray(patientHistory?.labReports) && patientHistory.labReports.length > 0) {
      return patientHistory.labReports;
    }
    return [];
  }, [patientLabReports, patientHistory?.labReports]);

  const patientName = useMemo(() => {
    if (!singlePatient) return "";
    if (singlePatient.patient) {
      return singlePatient.patient.name || "";
    }
    if (singlePatient.name) {
      return singlePatient.name;
    }
    return "";
  }, [singlePatient]);

  const downloadDocument = useCallback(async (doc) => {
    await openDocumentWithFallback({ doc, toast });
  }, []);

  const handleViewReport = useCallback(async (report) => {
    if (!report?._id) {
      toast.error("Report ID not found. Cannot view PDF.");
      return;
    }

    try {
      await viewPDFReport(report._id);
    } catch (error) {
      console.error("Error viewing PDF report:", error);
      toast.error(error?.message || "Failed to view PDF report. Please try again.");
    }
  }, []);

  const handleDownloadReport = useCallback(async (report) => {
    if (!report?._id) {
      toast.error("Report ID not found. Cannot download PDF.");
      return;
    }

    const fileName = `Lab_Report_${report.testType || "Test"}_${new Date(report.createdAt).toLocaleDateString()}.pdf`;

    try {
      await downloadPDFReport(report._id, fileName);
      toast.success("PDF report downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF report:", error);
      toast.error(error?.message || "Failed to download PDF report. Please try again.");
    }
  }, []);

  const refreshData = useCallback(() => {
    if (!patientId) {
      toast.error("Invalid patient ID. Unable to refresh.");
      return;
    }
    dispatch(fetchPatientHistoryDetailed(patientId));
  }, [dispatch, patientId]);

  useEffect(() => {
    if (!patientId) return;
    dispatch(fetchSuperAdminDoctorPatientHistory(patientId));
    dispatch(fetchSuperAdminDoctorPatientLabReports(patientId));
    dispatch(fetchSuperAdminDoctorPatientMedications(patientId));
    dispatch(fetchSuperAdminDoctorPatientFollowups(patientId));
    dispatch(fetchPatientHistoryDetailed(patientId));
  }, [dispatch, patientId]);

  const isInitialLoading =
    !patientHistory && !patientData?.history && (workingLoading || dataLoading || patientDataLoading);
  const errorMessage = workingError || dataError || patientDataError;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-slate-600 text-xs">Loading history details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-600 hover:text-slate-800 transition-colors text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient
          </button>
          <button
            onClick={refreshData}
            disabled={workingLoading || dataLoading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${workingLoading || dataLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="text-xs text-red-700">{errorMessage}</div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="px-6 md:px-8 py-6 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Comprehensive Patient History{patientName ? ` — ${patientName}` : ""}
                </h2>
                <p className="text-slate-600 mt-1 text-xs">
                  Detailed clinical history, follow-ups, medications, and supporting documents
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "History Records", value: historyRecords.length },
                  { label: "Medications", value: medications.length },
                  { label: "Follow-ups", value: followups.length },
                  { label: "Lab Reports", value: labReports.length }
                ].map((card) => (
                  <div key={card.label} className="bg-white border border-blue-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="text-sm font-semibold text-blue-600">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-8 space-y-10">
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-semibold">Medical History Records</h3>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {historyRecords.length} record{historyRecords.length === 1 ? "" : "s"}
                </span>
              </div>

              {historyRecords.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs">
                  No medical history records found for this patient.
                </div>
              ) : (
                <div className="space-y-4">
                  {historyRecords.map((historyItem, index) => (
                    <HistoryCard
                      key={historyItem._id || index}
                      historyItem={historyItem}
                      index={index}
                      downloadDocument={downloadDocument}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-3">
                <Activity className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-semibold">Medications</h3>
              </div>

              {medications.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs">
                  No medications recorded for this patient.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {medications.map((medication, index) => (
                    <div
                      key={medication._id || index}
                      className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h4 className="text-sm font-semibold text-emerald-800">
                          {medication.drugName || medication.medicine || "Medicine"}
                        </h4>
                        <span className="text-xs text-emerald-700">
                          {medication.prescribedDate
                            ? new Date(medication.prescribedDate).toLocaleDateString()
                            : medication.createdAt
                            ? new Date(medication.createdAt).toLocaleDateString()
                            : "Date N/A"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                        {medication.dose && (
                          <div>
                            <span className="font-medium text-slate-600">Dose:</span> {medication.dose}
                          </div>
                        )}
                        {medication.frequency && (
                          <div>
                            <span className="font-medium text-slate-600">Frequency:</span> {medication.frequency}
                          </div>
                        )}
                        {medication.duration && (
                          <div>
                            <span className="font-medium text-slate-600">Duration:</span> {medication.duration}
                          </div>
                        )}
                        {medication.prescribedBy && (
                          <div>
                            <span className="font-medium text-slate-600">Prescribed By:</span> {medication.prescribedBy}
                          </div>
                        )}
                        {medication.instructions && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-slate-600">Instructions:</span>{" "}
                            <span className="whitespace-pre-line">{medication.instructions}</span>
                          </div>
                        )}
                        {medication.adverseEvent && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-slate-600">Adverse Event:</span>{" "}
                            {medication.adverseEvent}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-3">
                <Calendar className="h-5 w-5 text-purple-500" />
                <h3 className="text-sm font-semibold">Follow-ups</h3>
              </div>

              {followups.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs">
                  No follow-up records found for this patient.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {followups.map((followup, index) => (
                    <div
                      key={followup._id || index}
                      className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h4 className="text-sm font-semibold text-purple-800">
                          {followup.type || followup.title || `Follow-up #${index + 1}`}
                        </h4>
                        <span className="text-xs text-purple-700">
                          {followup.createdAt
                            ? new Date(followup.createdAt).toLocaleDateString()
                            : followup.date
                            ? new Date(followup.date).toLocaleDateString()
                            : "Date N/A"}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-slate-700">
                        {followup.notes && (
                          <div>
                            <span className="font-medium text-slate-600">Notes:</span>{" "}
                            <span className="whitespace-pre-line">{followup.notes}</span>
                          </div>
                        )}
                        {followup.updatedBy?.name && (
                          <div>
                            <span className="font-medium text-slate-600">Updated By:</span>{" "}
                            {followup.updatedBy.name}
                          </div>
                        )}
                        {followup.followUpInstruction && (
                          <div>
                            <span className="font-medium text-slate-600">Instructions:</span>{" "}
                            <span className="whitespace-pre-line">{followup.followUpInstruction}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-3">
                <User className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-semibold">Allergic Conditions & GPE</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Allergic Rhinitis", data: allergicRhinitis },
                  { title: "Allergic Conjunctivitis", data: allergicConjunctivitis },
                  { title: "Allergic Bronchitis", data: allergicBronchitis },
                  { title: "Atopic Dermatitis", data: atopicDermatitis },
                  { title: "GPE", data: gpe }
                ]
                  .filter((section) => Array.isArray(section.data) && section.data.length > 0)
                  .map((section) => (
                    <div key={section.title} className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-orange-800">{section.title}</h4>
                        <span className="text-xs text-orange-700">{section.data.length} record(s)</span>
                      </div>
                      <div className="space-y-2 text-xs text-slate-700">
                        {section.data.map((item, index) => (
                          <div key={item._id || index} className="border border-orange-100 rounded-md p-2 bg-white">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                              <span>Entry #{index + 1}</span>
                              <span>
                                {item.createdAt
                                  ? new Date(item.createdAt).toLocaleDateString()
                                  : item.updatedAt
                                  ? new Date(item.updatedAt).toLocaleDateString()
                                  : "Date N/A"}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-slate-700 whitespace-pre-line">{item.notes}</p>
                            )}
                            {item.symptoms && (
                              <p className="text-xs text-slate-700 whitespace-pre-line">
                                <span className="font-medium text-slate-600">Symptoms:</span> {item.symptoms}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              {[allergicRhinitis, allergicConjunctivitis, allergicBronchitis, atopicDermatitis, gpe].every(
                (group) => !group || group.length === 0
              ) && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs">
                  No allergic condition or general examination records found.
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-3">
                <FileText className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-semibold">Prescriptions</h3>
              </div>

              {prescriptions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs">
                  No prescriptions available for this patient.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {prescriptions.map((prescription, index) => (
                    <div
                      key={prescription._id || index}
                      className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h4 className="text-sm font-semibold text-indigo-800">
                          Prescription #{index + 1}
                        </h4>
                        <span className="text-xs text-indigo-700">
                          {prescription.createdAt
                            ? new Date(prescription.createdAt).toLocaleDateString()
                            : prescription.prescribedDate
                            ? new Date(prescription.prescribedDate).toLocaleDateString()
                            : "Date N/A"}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-slate-700">
                        {prescription.prescribedBy && (
                          <div>
                            <span className="font-medium text-slate-600">Prescribed By:</span>{" "}
                            {prescription.prescribedBy}
                          </div>
                        )}
                        {prescription.medications && prescription.medications.length > 0 && (
                          <div>
                            <span className="font-medium text-slate-600">Medicines:</span>{" "}
                            {prescription.medications
                              .map((med) => med.drugName || med.name)
                              .filter(Boolean)
                              .join(", ") || "N/A"}
                          </div>
                        )}
                        {prescription.notes && (
                          <div>
                            <span className="font-medium text-slate-600">Notes:</span>{" "}
                            <span className="whitespace-pre-line">{prescription.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-3">
                <FileText className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-semibold">Lab Reports</h3>
              </div>

              {labReports.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs">
                  No lab reports available for this patient.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {labReports.map((report, index) => {
                    const reportReady =
                      report._id &&
                      ["Report_Generated", "Report_Sent", "Completed", "feedback_sent"].includes(report.status);

                    return (
                      <div
                        key={report._id || index}
                        className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-red-800">
                              {report.testType || "Lab Test"}
                            </h4>
                            <p className="text-xs text-red-700 mt-1">
                              {report.testDescription || "No description available"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-red-600">
                            <span>
                              {report.createdAt
                                ? new Date(report.createdAt).toLocaleDateString()
                                : "Date N/A"}
                            </span>
                            {reportReady ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewReport(report)}
                                  className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
                                >
                                  <Eye className="h-3 w-3" />
                                  View PDF
                                </button>
                                <button
                                  onClick={() => handleDownloadReport(report)}
                                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </button>
                              </div>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                {report.status === "Cancelled" ? "Cancelled" : "Report Not Ready"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                          <div>
                            <span className="font-medium text-slate-600">Status:</span>{" "}
                            <span
                              className={`px-2 py-1 rounded-full ${
                                reportReady ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {report.status || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Urgency:</span>{" "}
                            {report.urgency || "Normal"}
                          </div>
                          {report.doctorId?.name && (
                            <div>
                              <span className="font-medium text-slate-600">Requested By:</span>{" "}
                              Dr. {report.doctorId.name}
                            </div>
                          )}
                          {report.assignedLabStaffId?.name && (
                            <div>
                              <span className="font-medium text-slate-600">Lab Staff:</span>{" "}
                              {report.assignedLabStaffId.name}
                            </div>
                          )}
                          {report.reportGeneratedDate && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-slate-600">Report Generated:</span>{" "}
                              {new Date(report.reportGeneratedDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHistory;

