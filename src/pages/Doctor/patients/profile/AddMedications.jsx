import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { addPatientMedication, fetchPatientDetails } from "../../../../features/doctor/doctorThunks";
import { resetDoctorState } from "../../../../features/doctor/doctorSlice";
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

  const { loading, addMedicationSuccess, patientDetails, patientDetailsLoading } = useSelector(
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
    if (addMedicationSuccess) {
      dispatch(resetDoctorState());
    }
  }, [addMedicationSuccess, dispatch]);

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

    const trimmedMedications = medications.map((med) => ({
      ...med,
      drugName: med.drugName.trim(),
      dose: med.dose.trim(),
      frequency: med.frequency.trim(),
      duration: med.duration.trim(),
      instructions: med.instructions.trim(),
    }));

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

    const payloads = trimmedMedications.map((medication) => ({
      ...medication,
      patientId: formData.patientId,
      prescribedBy: formData.prescribedBy,
      prescribedDate: formData.prescribedDate,
    }));

    setIsSubmitting(true);
    setSubmissionState({ status: "idle", message: "" });

    try {
      await Promise.all(
        payloads.map((payload) => dispatch(addPatientMedication(payload)).unwrap())
      );

      setSubmissionState({
        status: "success",
        message:
          payloads.length > 1
            ? `${payloads.length} medications added successfully!`
            : "Medication added successfully!",
      });

      setMedications([
        { drugName: "", dose: "", frequency: "", duration: "", instructions: "" },
      ]);

      setTests([{ name: "", instruction: "" }]);

      setTimeout(() => {
        dispatch(resetDoctorState());
        navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}`);
      }, 1500);
    } catch (submitError) {
      const errorMessage =
        typeof submitError === "string"
          ? submitError
          : submitError?.message || "Failed to add medications. Please try again.";

      setSubmissionState({ status: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
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
                    <th className="border-b border-slate-200 px-3 py-3 text-left">Dose</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left">Frequency</th>
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
                          placeholder="1 tab / week"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                        />
                      </td>
                      <td className="border-t border-slate-200 px-3 py-2 align-top">
                        <input
                          type="text"
                          name="frequency"
                          value={medication.frequency}
                          onChange={(event) =>
                            handleMedicationChange(index, "frequency", event.target.value)
                          }
                          placeholder="Every Monday"
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
              disabled={loading || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-xs"
            >
              {loading || isSubmitting ? (
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
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.25em] text-center">
              Lifestyle • Nutrition • Physiotherapy • Allergy Care
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}