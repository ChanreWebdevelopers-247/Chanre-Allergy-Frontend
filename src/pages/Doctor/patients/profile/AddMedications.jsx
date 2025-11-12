import React, { useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { createPrescription, fetchPatientDetails, fetchPrescriptions } from "../../../../features/doctor/doctorThunks";
import { Save, ArrowLeft, CheckCircle, Loader2, Plus, Trash2, Printer } from "lucide-react";
import API from "../../../../services/api";
import { buildPrescriptionPrintHTML, openPrintPreview } from "../../../../utils/prescriptionPrint";

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

const DEFAULT_REMARKS = "Keep patient hydrated. Advise rest if fatigue worsens.";

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

    const normalizedMedicationsForApi = trimmedMedications.map((med) => ({
      medicationName: med.drugName,
      dosage: med.dose,
      duration: med.duration,
      frequency: med.frequency,
      instructions: med.instructions,
    }));

    const prescriptionPayload = {
      patientId: formData.patientId,
      doctorId: user?._id || null,
      centerId: resolveCenterId(),
      prescribedBy: formData.prescribedBy,
      prescribedDate: formData.prescribedDate,
      date: formData.prescribedDate,
      medications: normalizedMedicationsForApi,
      tests: trimmedTests,
      diagnosis: diagnosis.trim(),
      followUpInstruction: testFollowupInstruction.trim(),
      followUp: testFollowupInstruction.trim(),
      reportGeneratedAt,
      preparedBy: preparedBy.trim(),
      preparedByCredentials: preparedByCredentials.trim(),
      medicalCouncilNumber: medicalCouncilNumber.trim(),
      printedBy: printedBy.trim(),
      instructions: DEFAULT_REMARKS,
      remarks: DEFAULT_REMARKS,
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

  const printablePrescription = useMemo(
    () => ({
      prescribedBy: formData.prescribedBy,
      preparedBy,
      preparedByCredentials,
      medicalCouncilNumber,
      printedBy,
      prescribedDate: formData.prescribedDate,
      reportGeneratedAt,
      medications,
      tests,
      diagnosis,
      followUpInstruction: testFollowupInstruction,
      remarks: DEFAULT_REMARKS,
    }),
    [
      diagnosis,
      formData.prescribedBy,
      medicalCouncilNumber,
      medications,
      preparedBy,
      preparedByCredentials,
      printedBy,
      reportGeneratedAt,
      testFollowupInstruction,
      tests,
    ]
  );

  const handlePrint = useCallback(() => {
    try {
      const html = buildPrescriptionPrintHTML({
        centerInfo,
        patient,
        prescription: printablePrescription,
        fallbackRemarks: DEFAULT_REMARKS,
      });
      openPrintPreview(html);
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error?.message || "Unable to open print preview. Please allow pop-ups and try again.");
    }
  }, [centerInfo, patient, printablePrescription]);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            onClick={() => navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}`)}
            className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patient
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg bg-white hover:bg-slate-100 transition-colors text-xs"
            >
              <Printer className="h-4 w-4" />
              Print Preview
            </button>
          </div>
        </div>

        {submissionState.status === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center text-xs text-green-700">
            <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
            {submissionState.message}
          </div>
        )}

        {submissionState.status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center text-xs text-red-700">
            <CheckCircle className="h-4 w-4 text-red-500 mr-3" />
            {submissionState.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            ref={prescriptionRef}
            className="bg-white border border-slate-400 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-6 border-b border-slate-400 text-center space-y-1">
              <h1 className="text-[15px] sm:text-[17px] font-semibold uppercase tracking-[0.35em] text-slate-800">
                {centerInfo.name}
              </h1>
              {centerInfo.subTitle ? (
                <p className="text-[11px] text-slate-700 leading-relaxed">{centerInfo.subTitle}</p>
              ) : null}
              <p className="text-[11px] text-slate-700">
                {centerInfo.address}
                {centerInfo.location && !centerInfo.address?.includes(centerInfo.location)
                  ? `, ${centerInfo.location}`
                  : ""}
              </p>
              <p className="text-[11px] text-slate-700">
                {centerInfo.phone ? `Phone: ${centerInfo.phone}` : ""}
                {centerInfo.fax ? ` | Fax: ${centerInfo.fax}` : ""}
                {centerInfo.code ? ` | Center Code: ${centerInfo.code}` : ""}
              </p>
              <p className="text-[11px] text-slate-700">
                {centerInfo.email ? `Email: ${centerInfo.email}` : ""}
                {centerInfo.website ? ` | ${centerInfo.website}` : ""}
              </p>
              <p className="text-[11px] text-slate-700">
                {centerInfo.labWebsite ? `Lab: ${centerInfo.labWebsite}` : ""}
                {centerInfo.missCallNumber ? ` | Missed Call: ${centerInfo.missCallNumber}` : ""}
                {centerInfo.mobileNumber ? ` | Appointment: ${centerInfo.mobileNumber}` : ""}
              </p>
              {centerLoading && (
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing center details…
                </div>
              )}
            </div>

            <div className="px-6 py-5 space-y-6">
              <table className="w-full text-[12px] text-slate-800 border border-slate-400">
                <tbody>
                  <tr>
                    <td className="border border-slate-400 px-3 py-2 align-top">
                      <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        Patient Name
                      </span>
                      <span className="block mt-1 font-semibold">
                        {patientDetailsLoading ? "Loading..." : patient?.name || "—"}
                      </span>
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
                      <span className="block mt-1">
                        {patient?.age ? `${patient.age}` : "—"}
                        {patient?.gender ? ` / ${patient.gender}` : ""}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 px-3 py-2 align-top" colSpan={2}>
                      <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
                        Diagnosis
                      </label>
                      <textarea
                        value={diagnosis}
                        onChange={(event) => setDiagnosis(event.target.value)}
                        rows={2}
                        placeholder="Enter diagnosis"
                        className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-y"
                      />
                    </td>
                    <td className="border border-slate-400 px-3 py-2 align-top">
                      <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
                        Prescribed Date
                      </label>
                      <input
                        type="date"
                        name="prescribedDate"
                        value={formData.prescribedDate}
                        onChange={handleChange}
                        required
                        className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500 mt-3 mb-2">
                        Report Generated At
                      </label>
                      <input
                        type="datetime-local"
                        value={reportGeneratedAt}
                        onChange={(event) => setReportGeneratedAt(event.target.value)}
                        className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-600 font-semibold mb-2">
                  Medicines
                </div>
                <table className="w-full text-[12px] text-slate-800 border border-slate-400">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-400 px-3 py-2 text-left">Medicine</th>
                      <th className="border border-slate-400 px-3 py-2 text-left">Dosage</th>
                      <th className="border border-slate-400 px-3 py-2 text-left">Duration</th>
                      <th className="border border-slate-400 px-3 py-2 text-left">Instruction</th>
                      <th className="border border-slate-400 px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((medication, index) => (
                      <tr key={`med-${index}`} className="align-top">
                        <td className="border border-slate-400 px-3 py-2">
                          <input
                            type="text"
                            name="drugName"
                            value={medication.drugName}
                            onChange={(event) =>
                              handleMedicationChange(index, "drugName", event.target.value)
                            }
                            required
                            placeholder="T-Folitrax 15mg"
                            className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                        </td>
                        <td className="border border-slate-400 px-3 py-2">
                          <input
                            type="text"
                            name="dose"
                            value={medication.dose}
                            onChange={(event) =>
                              handleMedicationChange(index, "dose", event.target.value)
                            }
                            required
                            placeholder="1 TAB/WEEK (MONDAY)"
                            className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                        </td>
                        <td className="border border-slate-400 px-3 py-2">
                          <input
                            type="text"
                            name="duration"
                            value={medication.duration}
                            onChange={(event) =>
                              handleMedicationChange(index, "duration", event.target.value)
                            }
                            required
                            placeholder="12 weeks"
                            className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                        </td>
                        <td className="border border-slate-400 px-3 py-2">
                          <textarea
                            name="instructions"
                            value={medication.instructions}
                            onChange={(event) =>
                              handleMedicationChange(index, "instructions", event.target.value)
                            }
                            rows={2}
                            placeholder="For itching"
                            className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-y"
                          />
                        </td>
                        <td className="border border-slate-400 px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationRow(index)}
                            disabled={medications.length === 1}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-md text-[11px] hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-400 text-slate-700 rounded-md text-xs hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Medicine
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-600 font-semibold mb-2">
                  Tests & Follow-up
                </div>
                <table className="w-full text-[12px] text-slate-800 border border-slate-400">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-400 px-3 py-2 text-left">Test Name</th>
                      <th className="border border-slate-400 px-3 py-2 text-left">Instruction</th>
                      <th className="border border-slate-400 px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((test, index) => (
                      <tr key={`test-${index}`} className="align-top">
                        <td className="border border-slate-400 px-3 py-2">
                          <input
                            type="text"
                            value={test.name}
                            onChange={(event) => handleTestChange(index, "name", event.target.value)}
                            placeholder="RAFU"
                            className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                        </td>
                        <td className="border border-slate-400 px-3 py-2">
                          <textarea
                            value={test.instruction}
                            onChange={(event) =>
                              handleTestChange(index, "instruction", event.target.value)
                            }
                            rows={2}
                            placeholder="R/W with reports after 12 weeks"
                            className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-y"
                          />
                        </td>
                        <td className="border border-slate-400 px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTestRow(index)}
                            disabled={tests.length === 1}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-md text-[11px] hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={handleAddTestRow}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-400 text-slate-700 rounded-md text-xs hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Test
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-400 px-3 py-2">
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
                    Follow-up Instruction
                  </label>
                  <textarea
                    value={testFollowupInstruction}
                    onChange={(event) => setTestFollowupInstruction(event.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-y"
                  />
                </div>
                <div className="border border-slate-400 px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
                    Remarks
                  </span>
                  <div className="text-[12px] text-slate-700 leading-relaxed">
                    {DEFAULT_REMARKS}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="border border-slate-400 px-3 py-2 space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    Prescribed By
                  </label>
                  <input
                    type="text"
                    name="prescribedBy"
                    value={formData.prescribedBy}
                    readOnly
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-600 bg-slate-100 cursor-not-allowed"
                  />
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    Prepared By
                  </label>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(event) => setPreparedBy(event.target.value)}
                    placeholder="Doctor's name"
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <input
                    type="text"
                    value={preparedByCredentials}
                    onChange={(event) => setPreparedByCredentials(event.target.value)}
                    placeholder="MD, DNB, DM"
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <input
                    type="text"
                    value={medicalCouncilNumber}
                    onChange={(event) => setMedicalCouncilNumber(event.target.value)}
                    placeholder="Medical Council Reg. No."
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div className="border border-slate-400 px-3 py-2 space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    Printed By
                  </label>
                  <input
                    type="text"
                    value={printedBy}
                    onChange={(event) => setPrintedBy(event.target.value)}
                    placeholder="Name"
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <div className="border border-slate-300 px-3 py-5 text-[10px] text-slate-500 uppercase tracking-[0.4em] text-right">
                    Doctor Signature
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] text-center pt-4">
                    Lifestyle • Nutrition • Physiotherapy • Allergy Care
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold">Report Generated:</span>{" "}
                    {reportGeneratedAt ? new Date(reportGeneratedAt).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}`)}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg bg-white hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-xs"
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
                  Save Prescription
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}