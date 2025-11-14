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


export const buildPrescriptionPrintHTML = ({
  centerInfo = {},
  patient = {},
  prescription = {},
  fallbackRemarks = DEFAULT_REMARKS,
  hideHeaderFooter = false,
}) => {
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

  const pageClass = hideHeaderFooter ? "page minimal" : "page";

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Prescription - ${patient?.name || "Patient"}</title>
        <style>
          * {
            box-sizing: border-box;
          }
          html, body {
            width: 100%;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
            margin: ${hideHeaderFooter ? "0" : "10px"};
            color: #111;
            font-size: 16px;
            width: 100%;
          }
          .page {
            width: 100%;
            line-height: 1.25;
            margin: 0;
            padding: 0;
          }
          .page.minimal {
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 15mm 5mm 15mm;
            box-sizing: border-box;
          }
          .page.minimal .info-table td {
            padding: 8px 12px;
            font-size: 16px;
          }
          .page.minimal .section-title {
            margin: 16px 0 8px;
            font-size: 16px;
          }
          .page.minimal .data-table th,
          .page.minimal .data-table td {
            padding: 8px 12px;
            font-size: 16px;
          }
          .page.minimal .data-table th {
            font-size: 15px;
          }
          .page.minimal .note-block {
            padding: 10px 12px;
            font-size: 16px;
          }
          .page.minimal .footer-block {
            padding: 10px 12px;
            line-height: 1.8;
            font-size: 16px;
          }
          .page.minimal .footer-block > div {
            margin-bottom: 4px;
            line-height: 1.8;
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
            padding: 8px 12px;
            vertical-align: top;
            font-size: 16px;
          }
          .info-label {
            font-weight: 600;
            text-transform: uppercase;
            font-size: 13px;
            display: block;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          .section-title {
            margin: 16px 0 8px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 16px;
            letter-spacing: 0.7px;
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
            margin-top: 3px;
            margin-bottom: 8px;
          }
          .data-table th,
          .data-table td {
            padding: 8px 12px;
            vertical-align: middle;
            text-align: left;
            font-size: 16px;
          }
          .data-table th {
            text-transform: uppercase;
            font-size: 15px;
            letter-spacing: 0.3px;
            background: #f4f4f4;
            font-weight: 600;
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
            margin-top: 8px;
            margin-bottom: 8px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .note-block {
            padding: 10px 12px;
            min-height: 50px;
            font-size: 16px;
          }
          .note-block .info-label {
            margin-bottom: 4px;
          }
          .footer-grid {
            margin-top: 16px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .footer-block {
            padding: 10px 12px;
            line-height: 1.8;
            font-size: 16px;
          }
          .footer-block strong {
            display: inline-block;
            min-width: auto;
            font-weight: 600;
            margin-right: 4px;
          }
          .footer-block > div {
            margin-bottom: 4px;
            line-height: 1.8;
          }
          .footer-credentials {
            font-size: 12px;
            font-weight: normal;
            margin-left: 4px;
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
            html, body {
              width: 100%;
              margin: 0;
              padding: 0;
            }
            body {
              margin: ${hideHeaderFooter ? "0" : "0"};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              width: 100%;
            }
            .page {
              page-break-inside: avoid;
              width: 100%;
              max-width: 100%;
              margin: 0;
              padding: 0;
            }
            .page.minimal {
              width: 100%;
              max-width: 100%;
              margin: 0;
              padding: 15mm 5mm 15mm;
            }
            .footer-grid {
              page-break-inside: avoid;
            }
            .data-table {
              page-break-inside: avoid;
            }
            .notes-grid {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="${pageClass}">
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
              <div><strong>Printed By:</strong> ${printedByDisplay}</div>
              <div><strong>Printed On:</strong> ${printedOnDisplay}</div>
            </div>
            <div class="footer-block">
              <div><strong>Prescription Prepared By:</strong> ${prescribedByDisplay}${prescription.preparedByCredentials ? `<span class="footer-credentials">${prescription.preparedByCredentials}</span>` : ""}</div>
              ${prescription.medicalCouncilNumber ? `<div>Medical Council Reg. No.: ${prescription.medicalCouncilNumber}</div>` : ""}
            </div>
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

