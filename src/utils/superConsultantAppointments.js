const toDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSuperConsultantType = (type) =>
  typeof type === 'string' && type.toLowerCase().startsWith('superconsultant_');

const hasSuperConsultantContext = (patient) => {
  if (!patient) return false;

  if (isSuperConsultantType(patient?.consultationType)) {
    return true;
  }

  if (
    Array.isArray(patient?.billing) &&
    patient.billing.some(
      (bill) =>
        bill?.type === 'consultation' && isSuperConsultantType(bill?.consultationType)
    )
  ) {
    return true;
  }

  if (
    Array.isArray(patient?.appointments) &&
    patient.appointments.some((apt) => isSuperConsultantType(apt?.consultationType))
  ) {
    return true;
  }

  if (
    Array.isArray(patient?.superConsultantAppointments) &&
    patient.superConsultantAppointments.length > 0
  ) {
    return true;
  }

  return Boolean(
    patient?.superConsultantAppointmentTime ||
      patient?.superconsultantAppointmentTime ||
      patient?.superConsultantAppointmentStatus ||
      patient?.superconsultantAppointmentStatus
  );
};

const addCandidate = (candidates, rawDate, { status, notes, source, priority = 0 } = {}) => {
  const date = toDate(rawDate);
  if (!date) return;

  candidates.push({
    date,
    status: status || 'scheduled',
    notes: notes || '',
    source,
    priority,
  });
};

export const getSuperConsultantAppointmentInfo = (patient) => {
  if (!patient) return null;

  const candidates = [];
  const statusFallback =
    patient.superConsultantAppointmentStatus ||
    patient.superconsultantAppointmentStatus ||
    patient.appointmentStatus;
  const notesFallback =
    patient.superConsultantAppointmentNotes ||
    patient.superconsultantAppointmentNotes ||
    patient.appointmentNotes;

  // Billing records first (highest priority - 4)
  if (Array.isArray(patient.billing)) {
    patient.billing.forEach((bill) => {
      if (!(bill?.type === 'consultation' && isSuperConsultantType(bill?.consultationType))) {
        return;
      }

      const billStatus = bill.appointmentStatus || bill.status || statusFallback;
      const billNotes = bill.paymentNotes || bill.notes || notesFallback;

      const possibleDates = [
        bill.customData?.appointmentTime,
        bill.customData?.preferredDate,
        bill.customData?.scheduledAt,
        bill.customData?.slotStart,
        bill.customData?.slotStartTime,
        bill.customData?.slot?.start,
        bill.customData?.slot?.startTime,
        bill.customData?.appointment,
        bill.customData?.appointmentDate,
        bill.customData?.date,
        bill.customData?.startTime,
        bill.customData?.scheduledDate,
        bill.customData?.scheduledTime,
        bill.appointmentTime,
        bill.appointmentDate,
        bill.appointment,
        bill.scheduledAt,
        bill.scheduledTime,
        bill.scheduledDate,
        bill.slot?.start,
        bill.slot?.startTime,
        bill.preferredDate,
        bill.preferredTime,
        bill.confirmedDate,
        bill.confirmedTime,
        bill.createdAt,
      ];

      possibleDates.forEach((rawDate, index) => {
        addCandidate(candidates, rawDate, {
          status: billStatus,
          notes: billNotes,
          source: `billing-${index}`,
          priority: 4,
        });
      });
    });
  }

  // Direct patient fields (priority 3)
  const directPatientDate =
    patient.superConsultantAppointmentTime ||
    patient.superconsultantAppointmentTime ||
    patient.latestSuperConsultantAppointment ||
    patient.lastSuperConsultantAppointment;

  addCandidate(candidates, directPatientDate, {
    status: statusFallback,
    notes: notesFallback,
    source: 'patient-direct',
    priority: 3,
  });

  // Primary appointment field when context matches (priority 2)
  if (patient.appointmentTime && (hasSuperConsultantContext(patient) || isSuperConsultantType(patient.consultationType))) {
    addCandidate(candidates, patient.appointmentTime, {
      status: patient.appointmentStatus || statusFallback,
      notes: patient.appointmentNotes || notesFallback,
      source: 'patient-appointment',
      priority: 2,
    });
  }

  // Appointments array (priority 2 for superconsultant, 1 otherwise if context exists)
  if (Array.isArray(patient.appointments)) {
    patient.appointments.forEach((apt, index) => {
      const aptStatus = apt.status || apt.appointmentStatus || statusFallback;
      const aptNotes = apt.notes || notesFallback;
      const rawDate =
        apt.scheduledAt ||
        apt.appointmentTime ||
        apt.confirmedDate ||
        apt.preferredDate ||
        apt.date;

      const priority = isSuperConsultantType(apt.consultationType || apt.type || apt.appointmentType)
        ? 2
        : hasSuperConsultantContext(patient)
          ? 1
          : 0;

      addCandidate(candidates, rawDate, {
        status: aptStatus,
        notes: aptNotes,
        source: `patient-appointments-${index}`,
        priority,
      });
    });
  }

  // Explicit superconsultant appointments array (priority 3)
  if (Array.isArray(patient.superConsultantAppointments)) {
    patient.superConsultantAppointments.forEach((apt, index) => {
      addCandidate(candidates, apt?.appointmentTime || apt?.date || apt, {
        status: apt?.status || apt?.appointmentStatus || statusFallback,
        notes: apt?.notes || notesFallback,
        source: `patient-super-list-${index}`,
        priority: 3,
      });
    });
  }

  if (!candidates.length) {
    return null;
  }

  // Determine best candidate
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.date.getTime() - b.date.getTime();
  });

  const highestPriority = candidates[0].priority;
  const samePriority = candidates.filter((candidate) => candidate.priority === highestPriority);
  const now = new Date();

  const upcoming = samePriority
    .filter((candidate) => candidate.date.getTime() >= now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length > 0) {
    return upcoming[0];
  }

  const past = samePriority
    .filter((candidate) => candidate.date.getTime() < now.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  if (past.length > 0) {
    return past[0];
  }

  return samePriority[0];
};

export const getSuperConsultantAppointmentsWithMeta = (patients) => {
  if (!Array.isArray(patients)) return [];

  return patients.map((patient) => ({
    patient,
    appointment: getSuperConsultantAppointmentInfo(patient),
  }));
};


