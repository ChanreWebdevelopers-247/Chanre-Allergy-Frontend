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

const joinLine = (segments) => segments.filter(Boolean).join(" | ");

export const buildPrescriptionPrintHTML = ({
  centerInfo = {},
  patient = {},
  prescription = {},
  fallbackRemarks,
}) => {
  const mergedCenter = { ...DEFAULT_CENTER_INFO, ...centerInfo };
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
      : `<tr><td colspan="2" class="empty-cell">No tests prescribed.</td></tr>`;

  const contactLineOne = joinLine([
    mergedCenter.phone ? `Phone: ${mergedCenter.phone}` : "",
    mergedCenter.fax ? `Fax: ${mergedCenter.fax}` : "",
    mergedCenter.code ? `Center Code: ${mergedCenter.code}` : "",
  ]);
  const contactLineTwo = joinLine([
    mergedCenter.email ? `Email: ${mergedCenter.email}` : "",
    mergedCenter.website || "",
  ]);
  const contactLineThree = joinLine([
    mergedCenter.labWebsite ? `Lab: ${mergedCenter.labWebsite}` : "",
    mergedCenter.missCallNumber ? `Missed Call: ${mergedCenter.missCallNumber}` : "",
    mergedCenter.appointmentNumber ? `Appointment: ${mergedCenter.appointmentNumber}` : "",
  ]);

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
            background: #ffffff;
          }
          .sheet {
            border: 1px solid #d0d7e3;
            border-radius: 12px;
            padding: 28px 34px;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid rgba(148, 163, 184, 0.45);
            padding-bottom: 16px;
          }
          .header h1 {
            font-size: 18px;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin: 0 0 6px;
          }
          .header-line {
            font-size: 11px;
            margin: 3px 0;
            line-height: 1.5;
          }
          .patient-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 18px;
          }
          .patient-table td {
            border: 1px solid rgba(148, 163, 184, 0.4);
            padding: 8px 10px;
            vertical-align: top;
          }
          .label {
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
            margin: 22px 0 10px;
          }
          table.detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          table.detail-table th,
          table.detail-table td {
            border: 1px solid #cbd5e1;
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
          .notes-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
            font-size: 11px;
          }
          .notes-table td {
            border: 1px solid #cbd5e1;
            padding: 12px 14px;
            vertical-align: top;
          }
          .notes-table td + td {
            width: 50%;
          }
          .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 18px;
            margin-top: 26px;
          }
          .footer-card {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 14px 16px;
            font-size: 11px;
            line-height: 1.6;
            background: #fff;
          }
          .footer-card strong {
            display: inline-block;
            min-width: 110px;
          }
          .signature-box {
            margin-top: 26px;
            padding-top: 12px;
            border-top: 1px solid #cbd5e1;
            text-align: right;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 4px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <h1>${mergedCenter.name}</h1>
            ${mergedCenter.address ? `<div class="header-line">${mergedCenter.address}</div>` : ""}
            ${contactLineOne ? `<div class="header-line">${contactLineOne}</div>` : ""}
            ${contactLineTwo ? `<div class="header-line">${contactLineTwo}</div>` : ""}
            ${contactLineThree ? `<div class="header-line">${contactLineThree}</div>` : ""}
          </div>

          <table class="patient-table">
            <tr>
              <td>
                <span class="label">Patient Name</span>
                ${patient?.name || "—"}
              </td>
              <td>
                <span class="label">Patient ID / UHID</span>
                ${patient?.uhId || patient?.patientCode || patient?._id || "—"}
              </td>
              <td>
                <span class="label">Age / Gender</span>
                ${patientAgeGender || "—"}
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <span class="label">Diagnosis</span>
                ${diagnosis}
              </td>
              <td>
                <span class="label">Prescribed Date</span>
                ${formatDate(
                  prescription.prescribedDate ||
                    prescription.date ||
                    prescription.createdAt
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

          <div class="section-title">Tests &amp; Follow-up</div>
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

          <table class="notes-table">
            <tr>
              <td>
                <span class="label">Follow-up Instruction</span>
                ${followUpInstruction || "—"}
              </td>
              <td>
                <span class="label">Remarks</span>
                ${remarks || "—"}
              </td>
            </tr>
          </table>

          <div class="footer-grid">
            <div class="footer-card">
              <div><strong>Prescribed By:</strong> ${prescribedByDisplay}</div>
              <div><strong>Prepared By:</strong> ${preparedByDisplay}</div>
              ${
                prescription.preparedByCredentials
                  ? `<div>${prescription.preparedByCredentials}</div>`
                  : ""
              }
              ${
                prescription.medicalCouncilNumber
                  ? `<div>Medical Council Reg. No.: ${prescription.medicalCouncilNumber}</div>`
                  : ""
              }
            </div>
            <div class="footer-card">
              <div><strong>Printed By:</strong> ${printedByDisplay}</div>
              <div><strong>Report Generated:</strong> ${reportGeneratedDisplay}</div>
              <div><strong>Printed On:</strong> ${printedOnDisplay}</div>
            </div>
          </div>

          <div class="signature-box">Doctor Signature</div>
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

