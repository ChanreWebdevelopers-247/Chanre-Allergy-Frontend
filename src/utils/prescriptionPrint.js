import { API_CONFIG } from '../config/environment';

const DEFAULT_CENTER_INFO = {
  name: "",
  subTitle:
    "",
  address: "",
  location: "",
  phone: "",
  fax: "",
  email: "",
  website: "",
  labWebsite: "",
  missCallNumber: "",
  appointmentNumber: "",
  code: "",
  logoUrl: "",
};

const DEFAULT_REMARKS = "";

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
  (Array.isArray(list) ? list : []).map((item) => ({
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

const normalizeTests = (list) => {
  const coerceToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return Object.values(value);
    return [value];
  };

  const arrayValue = coerceToArray(list);

  return arrayValue
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
        item.name || item.testName || item.test_name || item.test || item.title || "—";
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

const buildContactLines = (info = {}) =>
  [
    [
      info.phone ? `Phone: ${info.phone}` : "",
      info.fax ? `Fax: ${info.fax}` : "",
      info.code ? `Center Code: ${info.code}` : "",
    ],
    [
      info.email ? `Email: ${info.email}` : "",
      info.website || "",
    ],
    [
      info.labWebsite ? `Lab: ${info.labWebsite}` : "",
      info.missCallNumber ? `Missed Call: ${info.missCallNumber}` : "",
      info.appointmentNumber ? `Appointment: ${info.appointmentNumber}` : "",
    ],
  ]
    .map((row) => row.filter(Boolean).join(" | "))
    .filter(Boolean);

const resolveLogoUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${API_CONFIG.BASE_URL}${normalized}`;
};

const buildHeader = ({ centerInfo = {} }) => {
  const contactRows = buildContactLines(centerInfo);
  if (!centerInfo.name && contactRows.length === 0 && !centerInfo.address) {
    return "";
  }

  return `
    <div class="header">
      ${centerInfo.logoUrl ? `<img src="${centerInfo.logoUrl}" alt="Center Logo" class="header-logo" />` : ""}
      <div class="header-content">
        ${centerInfo.name ? `<h1>${centerInfo.name}</h1>` : ""}
        ${centerInfo.subTitle ? `<p class="subtitle">${centerInfo.subTitle}</p>` : ""}
        ${centerInfo.address ? `<p class="address">${centerInfo.address}</p>` : ""}
        ${contactRows
          .map((row) => row.filter(Boolean).join(" | "))
          .filter(Boolean)
          .map((line) => `<p class="contact">${line}</p>`)
          .join("")}
      </div>
    </div>
  `;
};

const buildFooter = () => `
  <div class="footer">
    <p>
      Other Services: 24/7 Inpatient & outpatient, Pharmacy x-ray, Ultrasound, Doppler, ECG, EMG, NCV, PFT,
      Diagnostic Laboratory, Home blood sample collection, Diet & Nutrition & counselling.
    </p>
    <p>
      Our Clinics: Lifestyle & Obesity, Chronic pain management, Physiotherapy & rehabilitation, Yoga & acupuncture
    </p>
    <p class="footer-contact">
      Facebook.com/ChanRelief | youtube.com/user/chanre1
    </p>
  </div>
`;

export const buildPrescriptionPrintHTML = ({
  centerInfo = {},
  patient = {},
  prescription = {},
  fallbackRemarks = DEFAULT_REMARKS,
  hideHeaderFooter = false,
}) => {
  const mergedCenter = { ...DEFAULT_CENTER_INFO, ...centerInfo };
  const centerLogoUrl = resolveLogoUrl(mergedCenter.logoUrl);
  const medications = normalizeMedications(prescription.medications);

  const possibleTestSources = [
    prescription.tests,
    prescription.test,
    prescription.testDetails,
    prescription.testList,
  ];
  const rawTestsSource = possibleTestSources.find((value) => value && (Array.isArray(value) ? value.length : true));
  const tests = normalizeTests(rawTestsSource);

  const patientAgeGender = [patient?.age ? `${patient.age}` : null, patient?.gender || null]
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

  const prescribedByDisplay =
    prescription.prescribedBy ||
    prescription.doctorName ||
    prescription.doctor ||
    prescription.doctorId?.name ||
    prescription.updatedBy?.name ||
    "—";

  const preparedByDisplay =
    prescription.preparedBy || prescription.prepared_by || prescribedByDisplay || "—";

  const printedByDisplay =
    prescription.printedBy ||
    prescription.printed_by ||
    prescription.preparedBy ||
    prescription.prepared_by ||
    prescription.updatedBy?.name ||
    prescription.doctorId?.name ||
    "—";

  const reportGeneratedDisplay = formatDate(
    prescription.reportGeneratedAt || prescription.updatedAt,
    true
  );

  const printedOnDisplay = formatDate(new Date(), true);

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
      : `<tr class="empty-row"><td>—</td><td>—</td></tr>`;

  const contactRows = buildContactLines(mergedCenter);

  const headerMarkup = hideHeaderFooter ? "" : buildHeader({ centerInfo: mergedCenter });
  const footerMarkup = hideHeaderFooter ? "" : buildFooter();

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Prescription - ${patient?.name || "Patient"}</title>
        <style>
          body {
            font-family: 'Calibri', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 25px;
            color: #111;
            font-size: 12px;
          }
          .page {
            width: 100%;
            line-height: 1.35;
          }
          .clinic-header {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
            margin-bottom: 10px;
            text-align: left;
          }
          .clinic-header h1 {
            margin: 0;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 1.6px;
            text-align: center;
          }
          .clinic-header p {
            margin: 1px 0;
            font-size: 10px;
            text-align: left;
          }
          .clinic-details {
            width: 100%;
          }
          .clinic-logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
            margin: 0 auto 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table {
            border-bottom: 1px solid #000;
          }
          .info-table td {
            padding: 6px 8px;
            vertical-align: top;
          }
          .info-label {
            font-weight: 600;
            text-transform: uppercase;
            font-size: 9px;
            display: block;
            margin-bottom: 3px;
            letter-spacing: 0.6px;
            
          }
          .section-title {
            margin: 14px 0 5px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.8px;
            
          }
          .medicines-table{
            border-bottom: 1px solid #000;
          }

          .tests-table{
            border-bottom: 1px solid #000;
          }

          .data-table {
            width: 100%;
            table-layout: fixed;
            margin-top: 6px;
          }
          .data-table th,
          .data-table td {
            
            padding: 7px 10px;
            vertical-align: middle;
            text-align: left;
          }
          .data-table th {
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.4px;
            background: #f4f4f4;
          }
          .medicines-table th:nth-child(2),
          .medicines-table th:nth-child(3),
          .medicines-table td:nth-child(2),
          .medicines-table td:nth-child(3) {
            text-align: center;
          }
          .medicines-table th:last-child,
          .medicines-table td:last-child {
            text-align: left;
          }
          .tests-table th:first-child,
          .tests-table td:first-child {
            width: 55%;
          }
          .tests-table th:last-child,
          .tests-table td:last-child {
            text-align: left;
          }
          .data-table .empty-row td {
            text-align: center;
            color: #555;
            font-style: italic;
          }
          .notes-grid {
            margin-top: 12px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .note-block {
            padding: 6px 8px;
            min-height: 64px;
          }
          .note-block .info-label {
            margin-bottom: 4px;
          }
          .footer-grid {
            margin-top: 14px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .footer-block {
            padding: 6px 8px;
            line-height: 1.45;
          }
          .footer-block strong {
            display: inline-block;
            min-width: 120px;
          }
          .signature-line {
            margin-top: 22px;
            text-align: right;
            font-size: 10px;
          }
          .signature-line span {
            display: inline-block;
            border-top: 1px solid #000;
            padding-top: 3px;
            min-width: 150px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .footer-note {
            margin-top: 20px;
            border-top: 1px solid #000;
            padding-top: 5px;
            font-size: 9px;
            text-align: center;
            line-height: 1.3;
          }
          @media print {
            body {
              margin: 18mm;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${headerMarkup}
          <table class="info-table">
            <tr>
              <td>
                <span class="info-label">Patient Name</span>
                ${patient?.name || "—"}
              </td>
              <td>
                <span class="info-label">Patient ID</span>
                ${patient?.uhId || patient?.patientCode || patient?._id || "—"}
              </td>
              <td>
                <span class="info-label">Date</span>
                ${formatDate(prescription.prescribedDate || prescription.date || prescription.createdAt)}
              </td>
            </tr>
            <tr>
              <td>
                <span class="info-label">Gender</span>
                ${patient?.gender || "—"}
              </td>
              <td>
                <span class="info-label">Age</span>
                ${patient?.age || "—"}
              </td>
              <td>
                <span class="info-label">Diagnosis</span>
                ${diagnosis}
              </td>
            </tr>
          </table>

          <div class="section-title">Medicines</div>
          <table class="data-table medicines-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Dosage</th>
                <th>Duration</th>
                <th>Instruction</th>
              </tr>
            </thead>
            <tbody>
              ${medicationsRows}
            </tbody>
          </table>

          <div class="section-title">Tests</div>
          <table class="data-table tests-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Instruction</th>
              </tr>
            </thead>
            <tbody>
              ${testsRows}
            </tbody>
          </table>

          <div class="notes-grid">
            <div class="note-block">
              <span class="info-label">Follow-up Instruction</span>
              ${followUpInstruction || "—"}
            </div>
            <div class="note-block">
              <span class="info-label">Remarks</span>
              ${remarks || "—"}
            </div>
          </div>

          <div class="footer-grid">
            <div class="footer-block">
              <div><strong>Prescribed By:</strong> ${prescribedByDisplay}</div>
              <div><strong>Prepared By:</strong> ${preparedByDisplay}</div>
              ${prescription.preparedByCredentials ? `<div>${prescription.preparedByCredentials}</div>` : ""}
              ${prescription.medicalCouncilNumber ? `<div>Medical Council Reg. No.: ${prescription.medicalCouncilNumber}</div>` : ""}
            </div>
            <div class="footer-block">
              <div><strong>Printed By:</strong> ${printedByDisplay}</div>
              <div><strong>Report Generated:</strong> ${reportGeneratedDisplay}</div>
              <div><strong>Printed On:</strong> ${printedOnDisplay}</div>
            </div>
          </div>

          <div class="signature-line"><span>Doctor Signature</span></div>

          
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

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    if (typeof onClose === "function") onClose();
  };

  iframe.onload = () => {
    try {
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) {
        cleanup();
        return;
      }

      const handleAfterPrint = () => {
        iframeWindow.removeEventListener("afterprint", handleAfterPrint);
        cleanup();
      };

      iframeWindow.addEventListener("afterprint", handleAfterPrint, { once: true });
      iframeWindow.focus();
      iframeWindow.print();
    } catch (error) {
      cleanup();
    }
  };

  iframe.src = blobUrl;
};

export default {
  buildPrescriptionPrintHTML,
  openPrintPreview,
};

