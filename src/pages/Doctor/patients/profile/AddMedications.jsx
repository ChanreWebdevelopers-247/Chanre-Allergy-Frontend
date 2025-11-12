import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  createPrescription,
  fetchPatientDetails,
  fetchPrescriptions,
} from "../../../../features/doctor/doctorThunks";
import { ArrowLeft, Loader2, Printer, Save } from "lucide-react";
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

const createEmptyMedication = () => ({
  drugName: "",
  dose: "",
  duration: "",
  instructions: "",
});

const createEmptyTest = () => ({
  name: "",
  instruction: "",
});

const joinLine = (segments) => segments.filter(Boolean).join(" | ");

const getDefaultDateTime = () => {
  const now = new Date();
  return {
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
  };
};

const combineDateTime = (dateValue, timeValue) => {
  if (!dateValue) return "";
  const safeTime = timeValue && timeValue.length ? timeValue : "00:00";
  return `${dateValue}T${safeTime}`;
};

const INITIAL_MEDICATION_ROWS = 1;
const INITIAL_TEST_ROWS = 1;

export default function AddMedications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { createPrescriptionLoading, patientDetails, patientDetailsLoading } = useSelector(
    (state) => state.doctor
  );
  const { user } = useSelector((state) => state.auth);

  const patient = useMemo(() => {
    if (!patientDetails) return null;
    return patientDetails.patient || patientDetails;
  }, [patientDetails]);

  const defaultMedicalCouncilNumber =
    user?.medicalCouncilNumber || user?.kmcNumber || user?.kmc || "";
  const { date: defaultPrescribedDate, time: defaultPrescribedTime } = getDefaultDateTime();

  const [formData, setFormData] = useState({
    prescribedBy: user?.name || "",
    prescribedDate: defaultPrescribedDate,
    patientId: id,
  });

  const [diagnosis, setDiagnosis] = useState("");
  const [reportGeneratedAt, setReportGeneratedAt] = useState(
    combineDateTime(defaultPrescribedDate, defaultPrescribedTime)
  );
  const [preparedBy, setPreparedBy] = useState(user?.name || "");
  const [preparedByCredentials, setPreparedByCredentials] = useState("MD, DNB, DM");
  const [medicalCouncilNumber, setMedicalCouncilNumber] = useState(defaultMedicalCouncilNumber);
  const [printedBy, setPrintedBy] = useState(user?.name || "");
  const [followUpInstruction, setFollowUpInstruction] = useState("R/W with reports after 12 weeks");
  const [remarks, setRemarks] = useState(DEFAULT_REMARKS);
  const [prescribedTime, setPrescribedTime] = useState(defaultPrescribedTime);

  const [medications, setMedications] = useState(() =>
    Array.from({ length: INITIAL_MEDICATION_ROWS }, createEmptyMedication)
  );
  const [tests, setTests] = useState(() => Array.from({ length: INITIAL_TEST_ROWS }, createEmptyTest));

  const [feedback, setFeedback] = useState({ status: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [centerInfo, setCenterInfo] = useState(DEFAULT_CENTER_INFO);
  const [centerLoading, setCenterLoading] = useState(false);

  const resolveCenterId = () => {
    if (!user) return null;

    if (user.centerId) {
      if (typeof user.centerId === "object" && user.centerId._id) return user.centerId._id;
      if (typeof user.centerId === "string") return user.centerId;
    }

    if (user.centerID) return user.centerID;
    if (user.center_id) return user.center_id;
    if (user.center && user.center._id) return user.center._id;

    return null;
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchPatientDetails(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    const defaultNumber =
      user?.medicalCouncilNumber || user?.kmcNumber || user?.kmc || "";
    if (defaultNumber && !medicalCouncilNumber) {
      setMedicalCouncilNumber(defaultNumber);
    }
  }, [user?.medicalCouncilNumber, user?.kmcNumber, user?.kmc, medicalCouncilNumber]);

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
        const formattedAddress = [center.address, center.location].filter(Boolean).join(", ");

        setCenterInfo((prev) => ({
          ...prev,
          name: center.name || prev.name,
          subTitle: prev.subTitle,
          address: formattedAddress || prev.address,
          location: center.location || prev.location,
          email: center.email || prev.email,
          phone: center.phone || prev.phone,
          fax: center.fax || prev.fax,
          missCallNumber: center.missCallNumber || prev.missCallNumber,
          mobileNumber: center.mobileNumber || prev.mobileNumber,
          website: center.website || prev.website,
          labWebsite: center.labWebsite || prev.labWebsite,
          code: center.code || prev.code,
        }));
      } catch (error) {
        console.error("Failed to fetch center info", error);
      } finally {
        setCenterLoading(false);
      }
    };

    fetchCenterInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, patientId: id }));
  }, [id]);

  useEffect(() => {
    if (patient?.diagnosis && !diagnosis) {
      setDiagnosis(patient.diagnosis);
    }
  }, [patient, diagnosis]);

  useEffect(() => {
    if (user?.name) {
      setFormData((prev) => ({ ...prev, prescribedBy: prev.prescribedBy || user.name }));
      setPreparedBy((prev) => prev || user.name);
      setPrintedBy((prev) => prev || user.name);
    }
  }, [user?.name]);

  const updateMedication = (index, field, value) => {
    setMedications((prev) =>
      prev.map((item, rowIndex) =>
        rowIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const updateTest = (index, field, value) => {
    setTests((prev) =>
      prev.map((item, rowIndex) =>
        rowIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addMedicationRow = () => {
    setMedications((prev) => [...prev, createEmptyMedication()]);
  };

  const addTestRow = () => {
    setTests((prev) => [...prev, createEmptyTest()]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedMedications = medications
      .map((item) => ({
        drugName: item.drugName.trim(),
        dose: item.dose.trim(),
        duration: item.duration.trim(),
        instructions: item.instructions.trim(),
      }))
      .filter((item) => item.drugName || item.dose || item.duration || item.instructions);

    if (trimmedMedications.length === 0) {
      setFeedback({
        status: "error",
        message: "Please fill at least one medicine row before saving.",
      });
      return;
    }

    const invalidMedication = trimmedMedications.find(
      (item) => !item.drugName || !item.dose || !item.duration
    );

    if (invalidMedication) {
      setFeedback({
        status: "error",
        message: "Medicine name, dosage, and duration are required for each medicine row.",
      });
      return;
    }

    const trimmedTests = tests
      .map((item) => ({
        name: item.name.trim(),
        instruction: item.instruction.trim(),
      }))
      .filter((item) => item.name || item.instruction);

    const payload = {
      patientId: formData.patientId,
      doctorId: user?._id || null,
      centerId: resolveCenterId(),
      prescribedBy: formData.prescribedBy,
      prescribedDate: formData.prescribedDate,
      date: formData.prescribedDate,
      medications: trimmedMedications.map((item) => ({
        medicationName: item.drugName,
        dosage: item.dose,
        duration: item.duration,
        instructions: item.instructions,
      })),
      tests: trimmedTests,
      diagnosis: diagnosis.trim(),
      followUpInstruction: followUpInstruction.trim(),
      followUp: followUpInstruction.trim(),
      reportGeneratedAt,
      preparedBy: preparedBy.trim(),
      preparedByCredentials: preparedByCredentials.trim(),
      medicalCouncilNumber: medicalCouncilNumber.trim(),
      printedBy: printedBy.trim(),
      instructions: remarks.trim(),
      remarks: remarks.trim(),
    };

    setIsSubmitting(true);
    setFeedback({ status: "idle", message: "" });

    try {
      await dispatch(createPrescription(payload)).unwrap();
      await dispatch(fetchPrescriptions(formData.patientId));

      setFeedback({
        status: "success",
        message: "Prescription saved successfully.",
      });

      setMedications(Array.from({ length: INITIAL_MEDICATION_ROWS }, createEmptyMedication));
      setTests(Array.from({ length: INITIAL_TEST_ROWS }, createEmptyTest));
      setDiagnosis("");
      setFollowUpInstruction("R/W with reports after 12 weeks");
      setRemarks(DEFAULT_REMARKS);
      setMedicalCouncilNumber(user?.medicalCouncilNumber || user?.kmcNumber || user?.kmc || "");
      const { date: nextDate, time: nextTime } = getDefaultDateTime();
      setFormData((prev) => ({ ...prev, prescribedDate: nextDate }));
      setPrescribedTime(nextTime);
      setReportGeneratedAt(combineDateTime(nextDate, nextTime));
      setPreparedBy(user?.name || "");
      setPrintedBy(user?.name || "");

      setTimeout(() => {
        navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}?tab=Prescription`);
      }, 1200);
    } catch (error) {
      const message =
        typeof error === "string" ? error : error?.message || "Failed to save prescription.";
      setFeedback({ status: "error", message });
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
      followUpInstruction,
      remarks,
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
      followUpInstruction,
      tests,
      remarks,
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

  const contactLineOne = joinLine([
    centerInfo.phone ? `Phone: ${centerInfo.phone}` : "",
    centerInfo.fax ? `Fax: ${centerInfo.fax}` : "",
    centerInfo.code ? `Center Code: ${centerInfo.code}` : "",
  ]);
  const contactLineTwo = joinLine([
    centerInfo.email ? `Email: ${centerInfo.email}` : "",
    centerInfo.website || "",
  ]);
  const contactLineThree = joinLine([
    centerInfo.labWebsite ? `Lab: ${centerInfo.labWebsite}` : "",
    centerInfo.missCallNumber ? `Missed Call: ${centerInfo.missCallNumber}` : "",
    centerInfo.mobileNumber ? `Appointment: ${centerInfo.mobileNumber}` : "",
  ]);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}`)}
            className="inline-flex items-center gap-2 text-xs text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patient
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" />
              Print Preview
            </button>
          </div>
        </div>

        {feedback.status !== "idle" ? (
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              feedback.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-slate-400 bg-white shadow-sm">
            <div className="border-b border-slate-400 px-6 py-6">
              <div className="space-y-1 text-center">
                <h1 className="text-[16px] font-semibold uppercase tracking-[0.35em] text-slate-900">
                  {centerInfo.name}
                </h1>
                {centerInfo.address ? (
                  <div className="text-[11px] text-slate-700">{centerInfo.address}</div>
                ) : null}
                {contactLineOne ? (
                  <div className="text-[11px] text-slate-700">{contactLineOne}</div>
                ) : null}
                {contactLineTwo ? (
                  <div className="text-[11px] text-slate-700">{contactLineTwo}</div>
                ) : null}
                {contactLineThree ? (
                  <div className="text-[11px] text-slate-700">{contactLineThree}</div>
                ) : null}
                {centerLoading ? (
                  <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Refreshing center information…
                  </div>
                ) : null}
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-400 text-left text-[12px] text-slate-800">
                  <tbody>
                    <tr>
                      <td className="w-1/3 border border-slate-400 px-3 py-2 align-top">
                        <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                          Patient Name
                        </span>
                        <span className="mt-1 block font-semibold">
                          {patientDetailsLoading ? "Loading..." : patient?.name || "—"}
                        </span>
                      </td>
                      <td className="w-1/3 border border-slate-400 px-3 py-2 align-top">
                        <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                          Patient ID / UHID
                        </span>
                        <span className="mt-1 block">
                          {patient?.uhId || patient?.patientCode || patient?._id || "—"}
                        </span>
                      </td>
                      <td className="w-1/3 border border-slate-400 px-3 py-2 align-top">
                        <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                          Age / Gender
                        </span>
                        <span className="mt-1 block">
                          {patient?.age ? `${patient.age}` : "—"}
                          {patient?.gender ? ` / ${patient.gender}` : ""}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 px-3 py-2 align-top" colSpan={3}>
                        <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                          Diagnosis
                        </label>
                        <textarea
                          value={diagnosis}
                          onChange={(event) => setDiagnosis(event.target.value)}
                          rows={2}
                          placeholder="Enter diagnosis"
                          className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">
                  Medicines
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border border-slate-400 text-left text-[12px] text-slate-800">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-400 px-3 py-2 font-medium">Medicine</th>
                        <th className="border border-slate-400 px-3 py-2 font-medium">Dosage</th>
                        <th className="border border-slate-400 px-3 py-2 font-medium">Duration</th>
                        <th className="border border-slate-400 px-3 py-2 font-medium">Instruction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medications.map((item, index) => (
                        <tr key={`medication-${index}`} className="align-top">
                          <td className="border border-slate-400 px-3 py-2">
                            <input
                              type="text"
                              value={item.drugName}
                              onChange={(event) => updateMedication(index, "drugName", event.target.value)}
                              placeholder="T-Folitrax 15mg"
                              className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                          <td className="border border-slate-400 px-3 py-2">
                            <input
                              type="text"
                              value={item.dose}
                              onChange={(event) => updateMedication(index, "dose", event.target.value)}
                              placeholder="1 tab/week (Monday)"
                              className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                          <td className="border border-slate-400 px-3 py-2">
                            <input
                              type="text"
                              value={item.duration}
                              onChange={(event) => updateMedication(index, "duration", event.target.value)}
                              placeholder="12 weeks"
                              className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                          <td className="border border-slate-400 px-3 py-2">
                            <textarea
                              value={item.instructions}
                              onChange={(event) => updateMedication(index, "instructions", event.target.value)}
                              rows={2}
                              placeholder="For itching"
                              className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={addMedicationRow}
                    className="inline-flex items-center justify-center rounded-md border border-slate-400 px-4 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Add Medicine Row
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">
                  Tests &amp; Follow-up
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border border-slate-400 text-left text-[12px] text-slate-800">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-400 px-3 py-2 font-medium">Test Name</th>
                        <th className="border border-slate-400 px-3 py-2 font-medium">Instruction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tests.map((item, index) => (
                        <tr key={`test-${index}`} className="align-top">
                          <td className="border border-slate-400 px-3 py-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(event) => updateTest(index, "name", event.target.value)}
                              placeholder="RAFU"
                              className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                          <td className="border border-slate-400 px-3 py-2">
                            <textarea
                              value={item.instruction}
                              onChange={(event) => updateTest(index, "instruction", event.target.value)}
                              rows={2}
                              placeholder="R/W with reports after 12 weeks"
                              className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={addTestRow}
                    className="inline-flex items-center justify-center rounded-md border border-slate-400 px-4 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Add Test Row
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="border border-slate-400 px-3 py-3">
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    Follow-up Instruction
                  </label>
                  <textarea
                    value={followUpInstruction}
                    onChange={(event) => setFollowUpInstruction(event.target.value)}
                    rows={5}
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div className="border border-slate-400 px-3 py-3">
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    rows={5}
                    className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div className="border border-slate-400 px-3 py-3 space-y-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                      Prescribed Date &amp; Time
                    </span>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        value={formData.prescribedDate}
                        onChange={(event) => {
                          const value = event.target.value;
                          setFormData((prev) => ({ ...prev, prescribedDate: value }));
                          setReportGeneratedAt(combineDateTime(value, prescribedTime));
                        }}
                        required
                        className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <input
                        type="time"
                        value={prescribedTime}
                        onChange={(event) => {
                          const value = event.target.value;
                          setPrescribedTime(value);
                          setReportGeneratedAt(combineDateTime(formData.prescribedDate, value));
                        }}
                        className="w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                      Prescription Prepared By
                    </span>
                    <input
                      type="text"
                      value={preparedBy}
                      onChange={(event) => setPreparedBy(event.target.value)}
                      placeholder="Dr. Chandrashekara S"
                      className="mt-2 w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                    />
                    <input
                      type="text"
                      value={preparedByCredentials}
                      onChange={(event) => setPreparedByCredentials(event.target.value)}
                      placeholder="MD, DNB, DM"
                      className="mt-2 w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                    />
                    <input
                      type="text"
                      value={medicalCouncilNumber}
                      onChange={(event) => setMedicalCouncilNumber(event.target.value)}
                      placeholder="Medical Council Reg. No."
                      className="mt-2 w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-slate-500">
                      Printed By
                    </span>
                    <input
                      type="text"
                      value={printedBy}
                      onChange={(event) => setPrintedBy(event.target.value)}
                      placeholder="Dr. Devaraj Kori"
                      className="mt-2 w-full border border-slate-300 px-2 py-1 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${id}`)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-xs text-slate-700 transition-colors hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPrescriptionLoading || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-xs text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createPrescriptionLoading || isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
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