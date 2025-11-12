const DEFAULT_CENTER_INFO = {
  name: "CHANRE RHEUMATOLOGY & IMMUNOLOGY CENTER & RESEARCH",
  subTitle:
    "Specialists in Rheumatology, Autoimmune Disease, Allergy, Immune Defiency, Rheumatoid Immunology, Vasculitis and Rare Infections & Infertility",
  address: "No. 414/5&6, 20th Main, West of Chord Road, 1st Block, Rajajinagar, Bengaluru - 560 010.",
  location: "Bengaluru",
  phone: "080-42516699",
  fax: "080-42516600",
  email: "info@chanreclinic.com",
  website: "www.chanreicr.com | www.mychanreclinic.com",
  labWebsite: "www.chanrelabresults.com",
  missCallNumber: "080-42516666",
  appointmentNumber: "9532333122",
  code: "",
};

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

const normalizeMedications = (list) =>
  (Array.isArray(list) ? list : []).map((item, index) => ({
    index: index + 1,
    name:
      item.drugName ||
      item.medicine ||
      item.name ||
      item.medicationName ||
      "—",
    dosage:
      item.dose ||
      item.dosage ||
      item.dosageDetails ||
      item.medicineDose ||
      "",
    frequency: item.frequency || item.freq || item.medicineFrequency || "",
    duration:
      item.duration ||
      item.period ||
      item.medicineDuration ||
      item.course ||
      "",
    instructions: item.instructions || item.instruction || "",
  }));

const normalizeTests = (list) =>
  (Array.isArray(list) ? list : []).map((item, index) => ({
    index: index + 1,
    name: item.name || item.testName || "—",
    instruction: item.instruction || item.instructions || "",
  }));

export const buildPrescriptionPrintHTML = ({
  centerInfo = {},
  patient = {},
  prescription = {},
  fallbackRemarks,
}) => {
  const mergedCenter = { ...DEFAULT_CENTER_INFO, ...centerInfo };
  const medications = normalizeMedications(prescription.medications);
  const tests = normalizeTests(prescription.tests);

  const patientAgeGender = [
    patient?.age ? `${patient.age}` : null,
    patient?.gender || null,
  ]
    .filter(Boolean)
    .join(" / ");

  const diagnosis =
    prescription.diagnosis ||
    prescription.diagnosisSummary ||
    prescription.diagnosisNotes ||
    prescription.primaryDiagnosis ||
    "—";

  const followUpInstruction =
    prescription.followUpInstruction ||
    prescription.testFollowupInstruction ||
    prescription.followUp ||
    prescription.instructions ||
    "—";

  const remarks =
    prescription.remarks ||
    prescription.notes ||
    prescription.instructions ||
    fallbackRemarks ||
    "";

  const testsSummary = tests
    .filter((test) => test.name || test.instruction)
    .map(
      (test) =>
        `${test.name}${test.instruction ? ` — ${test.instruction}` : ""}`
    );

const medicationsRows =
    medications.length > 0
      ? medications
          .map(
            (med) => `
            <tr>
              <td>${med.name}</td>
              <td>${[med.dosage, med.frequency].filter(Boolean).join(" ")}</td>
              <td>${med.duration}</td>
              <td>${med.instructions}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="empty-cell">No medicines added.</td></tr>`;

  const testsRows =
    tests.length > 0
      ? tests
          .map(
            (test) => `
            <tr>
              <td>${test.name}</td>
              <td>${test.instruction}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="2" class="empty-cell">No tests prescribed.</td></tr>`;

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Prescription - ${patient?.name || "Patient"}</title>
        <style>
          @media print {
            body {
              -webkit-print-color-adjust: exact;
            }
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 24px 32px;
            color: #1f2933;
          }
          .sheet {
            border: 1px solid #475569;
            padding: 24px 28px;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #475569;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .header h1 {
            font-size: 18px;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin: 0 0 4px;
          }
          .header p {
            font-size: 11px;
            margin: 2px 0;
            line-height: 1.4;
          }
          .patient-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 18px;
          }
          .patient-table td {
            border: 1px solid #475569;
            padding: 8px 10px;
            vertical-align: top;
          }
          .patient-label {
            display: block;
            text-transform: uppercase;
            letter-spacing: 3px;
            font-size: 10px;
            color: #475569;
            margin-bottom: 4px;
          }
          .section-title {
            font-size: 11px;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: 600;
            color: #334155;
            margin: 18px 0 8px;
          }
          table.detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          table.detail-table th,
          table.detail-table td {
            border: 1px solid #475569;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
          }
          table.detail-table thead th {
            background: #f1f5f9;
            font-size: 10px;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .empty-cell {
            text-align: center;
            color: #64748b;
            padding: 14px 10px;
          }
          .followup-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            margin-top: 16px;
          }
          .followup-card {
            border: 1px solid #475569;
            padding: 10px 12px;
            font-size: 11px;
            min-height: 78px;
            line-height: 1.5;
          }
          .followup-card span {
            display: block;
            text-transform: uppercase;
            letter-spacing: 3px;
            font-size: 10px;
            color: #475569;
            margin-bottom: 6px;
          }
          .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            margin-top: 20px;
          }
          .signature {
            text-align: right;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-top: 32px;
            color: #475569;
          }
          .footer-note {
            text-align: center;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-top: 24px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <h1>${mergedCenter.name}</h1>
            ${mergedCenter.subTitle ? `<p>${mergedCenter.subTitle}</p>` : ""}
            ${mergedCenter.address ? `<p>${mergedCenter.address}</p>` : ""}
            <p>
              ${mergedCenter.phone ? `Phone: ${mergedCenter.phone}` : ""}
              ${mergedCenter.fax ? ` | Fax: ${mergedCenter.fax}` : ""}
              ${mergedCenter.code ? ` | Center Code: ${mergedCenter.code}` : ""}
            </p>
            <p>
              ${mergedCenter.email ? `Email: ${mergedCenter.email}` : ""}
              ${mergedCenter.website ? ` | ${mergedCenter.website}` : ""}
            </p>
            <p>
              ${mergedCenter.labWebsite ? `Lab: ${mergedCenter.labWebsite}` : ""}
              ${mergedCenter.missCallNumber ? ` | Missed Call: ${mergedCenter.missCallNumber}` : ""}
              ${mergedCenter.appointmentNumber ? ` | Appointment: ${mergedCenter.appointmentNumber}` : ""}
            </p>
          </div>

          <table class="patient-table">
            <tr>
              <td>
                <span class="patient-label">Patient Name</span>
                ${patient?.name || "—"}
              </td>
              <td>
                <span class="patient-label">Patient ID / UHID</span>
                ${patient?.uhId || patient?.patientCode || patient?._id || "—"}
              </td>
              <td>
                <span class="patient-label">Age / Gender</span>
                ${patientAgeGender || "—"}
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <span class="patient-label">Diagnosis</span>
                ${diagnosis}
              </td>
              <td>
                <span class="patient-label">Prescribed Date</span>
            ${formatDate(
              prescription.prescribedDate ||
                prescription.date ||
                prescription.createdAt
            )}
                <span class="patient-label" style="margin-top:10px;">Report Generated</span>
            ${formatDate(
              prescription.reportGeneratedAt || prescription.updatedAt,
              true
            )}
              </td>
            </tr>
          </table>

          <div class="section-title">Medicines</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Duration</th>
                <th>Instruction</th>
              </tr>
            </thead>
            <tbody>
              ${medicationsRows}
            </tbody>
          </table>

          <div class="section-title">Tests & Follow-up</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Instruction</th>
              </tr>
            </thead>
            <tbody>
              ${testsRows}
            </tbody>
          </table>

          <div class="followup-grid">
            <div class="followup-card">
              <span>Follow-up Instruction</span>
              ${followUpInstruction}
            </div>
            <div class="followup-card">
              <span>Tests Summary</span>
              ${testsSummary.length > 0 ? testsSummary.join("<br/>") : "—"}
            </div>
            <div class="followup-card">
              <span>Remarks</span>
              ${remarks || "—"}
            </div>
            <div class="followup-card">
              <span>Report Generated</span>
              ${formatDate(prescription.reportGeneratedAt, true)}
            </div>
          </div>

          <div class="footer-grid">
            <div class="followup-card">
              <span>Prescribed By</span>
              ${
                prescription.prescribedBy ||
                prescription.doctorName ||
                prescription.doctor ||
                prescription.doctorId?.name ||
                prescription.updatedBy?.name ||
                "—"
              }
            </div>
            <div class="followup-card">
              <span>Prepared By</span>
              ${
                prescription.preparedBy ||
                prescription.prepared_by ||
                prescription.prescribedBy ||
                prescription.doctorId?.name ||
                "—"
              }<br/>
              ${prescription.preparedByCredentials || ""}<br/>
              ${
                prescription.medicalCouncilNumber
                  ? `Medical Council Reg. No.: ${prescription.medicalCouncilNumber}`
                  : ""
              }
            </div>
            <div class="followup-card">
              <span>Printed By</span>
              ${
                prescription.printedBy ||
                prescription.printed_by ||
                prescription.preparedBy ||
                prescription.updatedBy?.name ||
                prescription.doctorId?.name ||
                "—"
              }
            </div>
          </div>

          <div class="signature">Doctor Signature</div>
          <div class="footer-note">Lifestyle • Nutrition • Physiotherapy • Allergy Care</div>
        </div>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>`;
};

export const openPrintPreview = (htmlString, { onClose } = {}) => {
  const blob = new Blob([htmlString], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, "_blank", "noopener,width=900,height=650");

  if (!printWindow) {
    window.location.assign(blobUrl);
    if (typeof onClose === "function") onClose();
    return;
  }

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
    if (typeof onClose === "function") onClose();
  };

  printWindow.addEventListener("beforeunload", cleanup, { once: true });
};

export default {
  buildPrescriptionPrintHTML,
  openPrintPreview,
};

