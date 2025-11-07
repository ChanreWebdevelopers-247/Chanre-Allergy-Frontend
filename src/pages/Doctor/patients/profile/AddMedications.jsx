import React, { useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { createPrescription, fetchPatientDetails, fetchPrescriptions } from "../../../../features/doctor/doctorThunks";
import { Pill, Save, ArrowLeft, CheckCircle, Loader2, Plus, Trash2, ClipboardList } from "lucide-react";
import API from "../../../../services/api";

const DEFAULT_CENTER_INFO = {
  name: "CHANRE RHEUMATOLOGY & IMMUNOLOGY CENTER & RESEARCH",
  subTitle:
    "Specialists in Rheumatology, Autoimmune Disease, Allergy, Immune Defiency, Rheumatoid Immunology, Vasculitis and Rare Infections & Infertility",
  address: "No. 414/5&6, 20th Main, West of Chord Road, 1st Block, Rajajinagar, Bengaluru - 560 010.",
  location: "Bengaluru",
  email: "info@chanreclinic.com",
  phone: "080-42516699",
  fax: "080-42516600",
  missCallNumber: "080-42516666",
  mobileNumber: "9532333122",
  website: "www.chanreicr.com | www.mychanreclinic.com",
  labWebsite: "www.chanrelabresults.com",
  code: "",
};

export default function AddMedications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    createPrescriptionLoading,
    patientDetails,
    patientDetailsLoading,
  } = useSelector(
    (state) => state.doctor
  );
  const { user } = useSelector((state) => state.auth);

  const patient = useMemo(() => {
    if (!patientDetails) return null;
    return patientDetails?.patient || patientDetails;
  }, [patientDetails]);

  const [formData, setFormData] = useState({
    prescribedBy: user?.name || "",
    prescribedDate: new Date().toISOString().split("T")[0],
    patientId: id,
  });

  const [medications, setMedications] = useState([
    {
      drugName: "",
      dose: "",
      frequency: "",
      duration: "",
      instructions: "",
    },
  ]);

  const [tests, setTests] = useState([
    {
      name: "",
      instruction: "",
    },
  ]);

  const [diagnosis, setDiagnosis] = useState("");
  const [testFollowupInstruction, setTestFollowupInstruction] = useState(
    "R/W with reports after 12 weeks"
  );
  const [reportGeneratedAt, setReportGeneratedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [preparedBy, setPreparedBy] = useState(user?.name || "");
  const [preparedByCredentials, setPreparedByCredentials] = useState("MD, DNB, DM");
  const [medicalCouncilNumber, setMedicalCouncilNumber] = useState("");
  const [printedBy, setPrintedBy] = useState(user?.name || "");

  const [submissionState, setSubmissionState] = useState({ status: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prescriptionRef = useRef(null);

  const [centerInfo, setCenterInfo] = useState(DEFAULT_CENTER_INFO);
  const [centerLoading, setCenterLoading] = useState(false);

  const resolveCenterId = () => {
    if (!user) return null;

    if (user.centerId) {
      if (typeof user.centerId === "object" && user.centerId._id) {
        return user.centerId._id;
      }
      if (typeof user.centerId === "string") {
        return user.centerId;
      }
    }

    if (user.centerID) return user.centerID;
    if (user.center_id) return user.center_id;
    if (user.center && user.center._id) return user.center._id;

    return null;
  };

  React.useEffect(() => {
    if (id) {
      dispatch(fetchPatientDetails(id));
    }
  }, [dispatch, id]);

  React.useEffect(() => {
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
          .join(", ");

        setCenterInfo((prev) => ({
          ...prev,
          name: center.name || prev.name,
          subTitle: prev.subTitle,
          address: formattedAddress || prev.address,
          location: center.location || prev.location || prev.address,
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
        console.error("Failed to fetch center info", centerError);
      } finally {
        setCenterLoading(false);
      }
    };

    fetchCenterInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  React.useEffect(() => {
    setFormData((prev) => ({ ...prev, patientId: id }));
  }, [id]);

  React.useEffect(() => {
    if (user?.name && !formData.prescribedBy) {
      setFormData((prev) => ({ ...prev, prescribedBy: user.name }));
    }
    if (user?.name && !preparedBy) {
      setPreparedBy(user.name);
    }
    if (user?.name && !printedBy) {
      setPrintedBy(user.name);
    }
  }, [user?.name, formData.prescribedBy, preparedBy, printedBy]);

  React.useEffect(() => {
    if (patient?.diagnosis && !diagnosis) {
      setDiagnosis(patient.diagnosis);
    }
  }, [patient, diagnosis]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMedicationChange = (index, field, value) => {
    setMedications((prev) =>
      prev.map((med, medIndex) =>
        medIndex === index
          ? {
              ...med,
              [field]: value,
            }
          : med
      )
    );
  };

  const handleAddMedicationRow = () => {
    setMedications((prev) => [
      ...prev,
      { drugName: "", dose: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const handleRemoveMedicationRow = (index) => {
    setMedications((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, medIndex) => medIndex !== index);
    });
  };

  const handleTestChange = (index, field, value) => {
    setTests((prev) =>
      prev.map((test, testIndex) =>
        testIndex === index
          ? {
              ...test,
              [field]: value,
            }
          : test
      )
    );
  };

  const handleAddTestRow = () => {
    setTests((prev) => [...prev, { name: "", instruction: "" }]);
  };

  const handleRemoveTestRow = (index) => {
    setTests((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, testIndex) => testIndex !== index);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedMedications = medications
      .map((med) => ({
        ...med,
        drugName: med.drugName.trim(),
        dose: med.dose.trim(),
        frequency: med.frequency.trim(),
        duration: med.duration.trim(),
        instructions: med.instructions.trim(),
      }))
      .filter((med) => med.drugName || med.dose || med.duration || med.instructions);

    if (trimmedMedications.length === 0) {
      setSubmissionState({
        status: "error",
        message: "Add at least one medication before saving the prescription.",
      });
      return;
    }

    const invalidMedication = trimmedMedications.find(
      (med) => !med.drugName || !med.dose || !med.duration
    );

    if (invalidMedication) {
      setSubmissionState({
        status: "error",
        message: "Please fill in the medicine name, dose, and duration for each entry.",
      });
      return;
    }

    const trimmedTests = tests
      .map((test) => ({
        name: test.name.trim(),
        instruction: test.instruction.trim(),
      }))
      .filter((test) => test.name || test.instruction);

    const prescriptionPayload = {
      patientId: formData.patientId,
      doctorId: user?._id || null,
      prescribedBy: formData.prescribedBy,
      prescribedDate: formData.prescribedDate,
      medications: trimmedMedications,
      tests: trimmedTests,
      diagnosis: diagnosis.trim(),
      followUpInstruction: testFollowupInstruction.trim(),
      reportGeneratedAt,
      preparedBy: preparedBy.trim(),
      preparedByCredentials: preparedByCredentials.trim(),
      medicalCouncilNumber: medicalCouncilNumber.trim(),
      printedBy: printedBy.trim(),
    };

    setIsSubmitting(true);
    setSubmissionState({ status: "idle", message: "" });

    try {
      await dispatch(createPrescription(prescriptionPayload)).unwrap();
      await dispatch(fetchPrescriptions(formData.patientId));

      setSubmissionState({
        status: "success",
        message: "Prescription created successfully!",
      });

      setMedications([
        { drugName: "", dose: "", frequency: "", duration: "", instructions: "" },
      ]);

      setTests([{ name: "", instruction: "" }]);

      setDiagnosis("");
      setTestFollowupInstruction("R/W with reports after 12 weeks");
      setReportGeneratedAt(new Date().toISOString().slice(0, 16));
      setPreparedBy(user?.name || "");
      setPreparedByCredentials("MD, DNB, DM");
      setMedicalCouncilNumber("");
      setPrintedBy(user?.name || "");

      setTimeout(() => {
        navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}?tab=Prescription`);
      }, 1500);
    } catch (submitError) {
      const errorMessage =
        typeof submitError === "string"
          ? submitError
          : submitError?.message || "Failed to create prescription. Please try again.";

      setSubmissionState({ status: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildPrintableHTML = () => {
    const formatDate = (value, withTime = false) => {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
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

    const printableMedications = medications.filter(
      (med) => med.drugName?.trim() || med.dose?.trim() || med.duration?.trim() || med.instructions?.trim()
    );

    const printableTests = tests.filter((test) => test.name?.trim() || test.instruction?.trim());

    const patientName = patient?.name || "—";
    const patientIdValue = patient?.uhId || patient?._id || formData.patientId || "—";
    const patientAgeGender = [patient?.age ? `${patient.age}Y` : "", patient?.gender || ""].filter(Boolean).join(" ");

    const medicationsRows = printableMedications
      .map((med, index) => `
        <tr>
          <td>${index + 1}. ${med.drugName || ""}</td>
          <td>${med.dose || ""}${med.frequency ? ` ${med.frequency}` : ""}</td>
          <td>${med.duration || ""}</td>
          <td>${med.instructions || ""}</td>
        </tr>
      `)
      .join("");

    const testsRows = printableTests
      .map((test, index) => `
        <tr>
          <td>${index + 1}. ${test.name || ""}</td>
          <td>${test.instruction || ""}</td>
        </tr>
      `)
      .join("");

    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Prescription - ${patientName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 32px; color: #1f2933; }
            h1, h2, h3 { margin: 0; }
            .header { text-align: center; margin-bottom: 16px; }
            .header h1 { font-size: 18px; letter-spacing: 3px; }
            .header p { font-size: 11px; margin: 2px 0; }
            .section { margin-top: 16px; font-size: 12px; }
            .section strong { text-transform: uppercase; letter-spacing: 2px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            table thead { background: #f1f5f9; text-transform: uppercase; letter-spacing: 1px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
            .footer { margin-top: 24px; font-size: 11px; display: flex; justify-content: space-between; }
            .signature { text-align: right; margin-top: 40px; font-size: 10px; letter-spacing: 3px; }
            .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; font-size: 11px; }
            .meta div { padding: 8px 10px; border: 1px dashed #cbd5e1; border-radius: 8px; }
            .tests-table th:nth-child(1) { width: 60%; }
            .tests-table th:nth-child(2) { width: 40%; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${centerInfo.name || "CHANRE RHEUMATOLOGY & IMMUNOLOGY CENTER & RESEARCH"}</h1>
            <p>${centerInfo.subTitle || ""}</p>
            <p>${centerInfo.address || ""}</p>
            <p>
              ${centerInfo.phone ? `Phone: ${centerInfo.phone}` : ""}
              ${centerInfo.fax ? ` | Fax: ${centerInfo.fax}` : ""}
            </p>
            <p>
              ${centerInfo.email ? `Email: ${centerInfo.email}` : ""}
              ${centerInfo.website ? ` | ${centerInfo.website}` : ""}
            </p>
          </div>

          <div class="section">
            <div class="meta">
              <div><strong>Patient Name</strong><br/>${patientName}</div>
              <div><strong>Patient ID</strong><br/>${patientIdValue}</div>
              <div><strong>Age / Gender</strong><br/>${patientAgeGender || "—"}</div>
              <div><strong>Diagnosis</strong><br/>${diagnosis || "—"}</div>
              <div><strong>Date</strong><br/>${formatDate(formData.prescribedDate)}</div>
              <div><strong>Report Generated</strong><br/>${formatDate(reportGeneratedAt, true)}</div>
            </div>
          </div>

          <div class="section">
            <strong>Medicines</strong>
            <table>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Duration</th>
                  <th>Instruction</th>
                </tr>
              </thead>
              <tbody>
                ${medicationsRows || '<tr><td colspan="4">No medicines added.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <strong>Tests</strong>
            <table class="tests-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Instruction</th>
                </tr>
              </thead>
              <tbody>
                ${testsRows || '<tr><td colspan="2">No tests prescribed.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <strong>Follow-up Instruction</strong>
            <p>${testFollowupInstruction || "—"}</p>
          </div>

          <div class="footer">
            <div>
              <div><strong>Prescription Prepared By</strong><br/>${preparedBy || ""}</div>
              <div>${preparedByCredentials || ""}</div>
              <div>${medicalCouncilNumber ? `Medical Council Reg. No.: ${medicalCouncilNumber}` : ""}</div>
            </div>
            <div>
              <div><strong>Printed By</strong><br/>${printedBy || ""}</div>
            </div>
          </div>

          <div class="signature">DOCTOR SIGNATURE</div>
        </body>
      </html>`;
  };

  const handlePrint = () => {
    const printableHTML = buildPrintableHTML();
    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to print the prescription.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(printableHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}`)}
              className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patient
            </button>
            <h1 className="text-md font-bold text-slate-800 mb-2 uppercase tracking-wide">
              Prescription Builder
            </h1>
            <p className="text-slate-600 text-xs max-w-xl">
              Craft a ChanRe-styled prescription sheet. The preview updates live so you can verify details before saving.
            </p>
          </div>

          <div className="bg-white/90 border border-blue-100 rounded-xl shadow-sm px-4 py-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 mb-1 uppercase tracking-wide">
              Patient Snapshot
            </div>
            {patientDetailsLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading patient...
              </div>
            ) : patient ? (
              <div className="space-y-1">
                <div><span className="font-medium text-slate-700">Name:</span> {patient?.name || "—"}</div>
                <div>
                  <span className="font-medium text-slate-700">Age/Gender:</span> {patient?.age || "—"}
                  {patient?.gender ? ` / ${patient.gender}` : ""}
                </div>
                <div><span className="font-medium text-slate-700">UHID:</span> {patient?.uhId || patient?._id || "—"}</div>
              </div>
            ) : (
              <div className="text-slate-500">Patient details not available.</div>
            )}
          </div>
        </div>

        {submissionState.status === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center text-xs text-green-700">
            <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
            {submissionState.message}
          </div>
        )}

        {submissionState.status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-xs text-red-700">
            <CheckCircle className="h-4 w-4 text-red-500 mr-3" />
            {submissionState.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div ref={prescriptionRef} className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-white px-6 py-6 text-center border-b border-blue-100">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-[0.12em] uppercase">
                {centerInfo.name}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-600 mt-2 max-w-3xl mx-auto leading-relaxed">
                {centerInfo.subTitle}
              </p>
              <div className="mt-3 space-y-1 text-[11px] text-slate-700">
                <p>{centerInfo.address}</p>
                <p>
                  <span className="font-medium">Phone:</span> {centerInfo.phone}
                  {centerInfo.fax ? ` | Fax: ${centerInfo.fax}` : ""}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {centerInfo.email}
                  {centerInfo.website ? ` | ${centerInfo.website}` : ""}
                </p>
                <p>
                  <span className="font-medium">Lab:</span> {centerInfo.labWebsite}
                  {centerInfo.missCallNumber ? ` | Missed Call: ${centerInfo.missCallNumber}` : ""}
                  {centerInfo.mobileNumber ? ` | Appointment: ${centerInfo.mobileNumber}` : ""}
                </p>
                {centerInfo.code && (
                  <p className="uppercase tracking-[0.3em] text-slate-500">Center Code: {centerInfo.code}</p>
                )}
                {centerLoading && (
                  <div className="flex justify-center items-center gap-2 text-slate-500 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Refreshing center details…
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500">Patient Name</span>
                    <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800 font-semibold">
                      {patientDetailsLoading ? "Loading..." : patient?.name || "—"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500">UHID / Patient ID</span>
                    <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800">
                      {patient?.uhId || patient?._id || "—"}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500">Age / Gender</span>
                    <div className="mt-1 min-h-[38px] px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800">
                      {patient?.age ? `${patient.age}` : "—"}
                      {patient?.gender ? ` / ${patient.gender}` : ""}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500">Diagnosis</span>
                    <textarea
                      value={diagnosis}
                      onChange={(event) => setDiagnosis(event.target.value)}
                      rows={2}
                      placeholder="Enter diagnosis"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400 resize-y"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-slate-500">Date</span>
                      <input
                        type="date"
                        name="prescribedDate"
                        value={formData.prescribedDate}
                        onChange={handleChange}
                        required
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-slate-500">Report Generated At</span>
                      <input
                        type="datetime-local"
                        value={reportGeneratedAt}
                        onChange={(event) => setReportGeneratedAt(event.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 overflow-x-auto">
              <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-xs">
                <thead className="bg-slate-100 uppercase tracking-widest text-[10px] text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-3 text-left">Medicine</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left">Dosage</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left">Duration</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left">Instructions</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((medication, index) => (
                    <tr key={`medication-${index}`} className="bg-white">
                      <td className="border-t border-slate-200 px-3 py-2 align-top">
                        <input
                          type="text"
                          name="drugName"
                          value={medication.drugName}
                          onChange={(event) =>
                            handleMedicationChange(index, "drugName", event.target.value)
                          }
                          required
                          placeholder="e.g., T-Folitrax 15mg"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                        />
                      </td>
                      <td className="border-t border-slate-200 px-3 py-2 align-top">
                        <input
                          type="text"
                          name="dose"
                          value={medication.dose}
                          onChange={(event) =>
                            handleMedicationChange(index, "dose", event.target.value)
                          }
                          required
                          placeholder="1 TAB/WEEK (MONDAY)"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                        />
                      </td>
                      <td className="border-t border-slate-200 px-3 py-2 align-top">
                        <input
                          type="text"
                          name="duration"
                          value={medication.duration}
                          onChange={(event) =>
                            handleMedicationChange(index, "duration", event.target.value)
                          }
                          required
                          placeholder="12 weeks"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                        />
                      </td>
                      <td className="border-t border-slate-200 px-3 py-2 align-top">
                        <textarea
                          name="instructions"
                          value={medication.instructions}
                          onChange={(event) =>
                            handleMedicationChange(index, "instructions", event.target.value)
                          }
                          rows={2}
                          placeholder="Enter specific instructions (e.g., For pain)"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400 resize-y"
                        />
                      </td>
                      <td className="border-t border-slate-200 px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicationRow(index)}
                          className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={medications.length === 1}
                          aria-label="Remove medicine"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddMedicationRow}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Medicine
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-[0.2em] mb-3">
                <ClipboardList className="h-3.5 w-3.5" /> Tests & Follow-up
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <thead className="bg-slate-100 uppercase tracking-widest text-[10px] text-slate-600">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3 text-left">Test Name</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-left">Instruction</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((test, index) => (
                      <tr key={`test-${index}`} className="bg-white">
                        <td className="border-t border-slate-200 px-3 py-2 align-top">
                          <input
                            type="text"
                            value={test.name}
                            onChange={(event) => handleTestChange(index, "name", event.target.value)}
                            placeholder="e.g., RAFU, CRP"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                          />
                        </td>
                        <td className="border-t border-slate-200 px-3 py-2 align-top">
                          <textarea
                            value={test.instruction}
                            onChange={(event) => handleTestChange(index, "instruction", event.target.value)}
                            rows={2}
                            placeholder="e.g., SOS if required"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400 resize-y"
                          />
                        </td>
                        <td className="border-t border-slate-200 px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => handleRemoveTestRow(index)}
                            className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={tests.length === 1}
                            aria-label="Remove test"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddTestRow}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Test
                </button>
              </div>
              <div className="mt-6">
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Instruction</span>
                <textarea
                  value={testFollowupInstruction}
                  onChange={(event) => setTestFollowupInstruction(event.target.value)}
                  rows={2}
                  placeholder="Enter follow-up instruction"
                  className="w-full border border-dashed border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400 resize-y"
                />
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Prescribed By</span>
                  <input
                    type="text"
                    name="prescribedBy"
                    value={formData.prescribedBy}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600 cursor-not-allowed"
                    placeholder="Auto-filled with logged-in user"
                  />
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Remarks</span>
                  <div className="px-3 py-2 min-h-[38px] rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600">
                    Keep patient hydrated. Advise rest if fatigue worsens.
                  </div>
                </div>
              </div>
              <div className="mt-4 h-px bg-slate-200" />
              <div className="mt-4 text-[10px] text-slate-500 uppercase tracking-[0.4em] text-right">
                Doctor Signature
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden text-xs text-slate-700">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold uppercase tracking-[0.3em] text-slate-500 block mb-1">
                    Prescription Prepared By
                  </span>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(event) => setPreparedBy(event.target.value)}
                    placeholder="Enter doctor's name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={preparedByCredentials}
                    onChange={(event) => setPreparedByCredentials(event.target.value)}
                    placeholder="Credentials"
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={medicalCouncilNumber}
                    onChange={(event) => setMedicalCouncilNumber(event.target.value)}
                    placeholder="Medical Council Reg. No."
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <span className="font-semibold uppercase tracking-[0.3em] text-slate-500 block mb-1">
                    Printed By
                  </span>
                  <input
                    type="text"
                    value={printedBy}
                    onChange={(event) => setPrintedBy(event.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                  <div className="mt-4 text-[10px] uppercase tracking-[0.4em] text-right text-slate-500">
                    Doctor Signature
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-white text-[11px] text-slate-600 space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <span className="font-semibold">Diagnosis:</span> {diagnosis || "—"}
                </div>
                <div>
                  <span className="font-semibold">Report Generated:</span>{" "}
                  {reportGeneratedAt ? new Date(reportGeneratedAt).toLocaleString() : "—"}
                </div>
              </div>
              <div>
                <span className="font-semibold">Follow-up Instruction:</span> {testFollowupInstruction || "—"}
              </div>
              <div>
                <span className="font-semibold">Tests:</span>
                {tests.filter((test) => test.name || test.instruction).length === 0 ? (
                  " —"
                ) : (
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {tests
                      .filter((test) => test.name || test.instruction)
                      .map((test, index) => (
                        <li key={`summary-test-${index}`}>
                          <span className="font-semibold text-slate-700">{test.name || "—"}</span>
                          {test.instruction ? ` — ${test.instruction}` : ""}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 text-center sm:text-left">
                  Lifestyle • Nutrition • Physiotherapy • Allergy Care
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs self-center sm:self-end"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  View & Print Prescription
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}`)}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPrescriptionLoading || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-xs"
            >
              {createPrescriptionLoading || isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Prescription…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Medications
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}