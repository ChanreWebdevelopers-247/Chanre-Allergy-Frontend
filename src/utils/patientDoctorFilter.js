const extractId = (value) => {
  if (!value) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    if (typeof value._id === 'string' || typeof value._id === 'number') {
      return String(value._id);
    }

    if (typeof value.id === 'string' || typeof value.id === 'number') {
      return String(value.id);
    }
  }

  return null;
};

export const deriveDoctorId = (user) => {
  if (!user) return null;

  const possibleSources = [
    user.doctorId,
    user.superConsultantId,
    user.superconsultantId,
    user.associatedDoctor,
    user.userId,
    user._id,
    user.id,
  ];

  for (const source of possibleSources) {
    const id = extractId(source);
    if (id) {
      return id;
    }
  }

  return null;
};

const isCandidateMatch = (candidate, doctorId) => {
  if (!doctorId) return false;

  if (Array.isArray(candidate)) {
    return candidate.some((entry) => extractId(entry) === doctorId);
  }

  return extractId(candidate) === doctorId;
};

export const isPatientAssignedToDoctor = (patient, doctorId) => {
  if (!patient || !doctorId) return false;

  const candidates = [
    patient.assignedDoctor,
    patient.assignedDoctorId,
    patient.assignedSuperConsultant,
    patient.assignedSuperConsultantId,
    patient.superConsultantDoctor,
    patient.superconsultantDoctor,
    patient.superConsultantDoctorId,
    patient.superconsultantDoctorId,
    patient.superConsultantDoctorID,
    patient.superConsultant,
    patient.superconsultant,
    patient.consultantDoctor,
    patient.consultant,
    patient.doctor,
    patient.doctorId,
    patient.primaryDoctor,
    patient.primaryDoctorId,
    patient.centerDoctor,
    patient.centerDoctorId,
    patient.superDoctor,
  ];

  for (const candidate of candidates) {
    if (isCandidateMatch(candidate, doctorId)) {
      return true;
    }
  }

  if (Array.isArray(patient.assignedDoctors) && patient.assignedDoctors.length > 0) {
    if (patient.assignedDoctors.some((doc) => extractId(doc) === doctorId)) {
      return true;
    }
  }

  if (Array.isArray(patient.billing) && patient.billing.length > 0) {
    for (const bill of patient.billing) {
      if (bill?.consultationType?.startsWith?.('superconsultant_')) {
        const billDoctorCandidates = [
          bill.assignedDoctor,
          bill.doctor,
          bill.doctorId,
          bill.superConsultantDoctor,
          bill.superconsultantDoctor,
          bill.superConsultantDoctorId,
          bill.superconsultantDoctorId,
          bill.superConsultantDoctorID,
          bill.superConsultant,
          bill.superconsultant,
        ];

        if (billDoctorCandidates.some((candidate) => isCandidateMatch(candidate, doctorId))) {
          return true;
        }
      }
    }
  }

  return false;
};

export const filterPatientsForDoctor = (patients, doctorId) => {
  if (!Array.isArray(patients) || patients.length === 0) {
    return Array.isArray(patients) ? patients : [];
  }

  if (!doctorId) {
    return patients;
  }

  return patients.filter((patient) => isPatientAssignedToDoctor(patient, doctorId));
};

export default filterPatientsForDoctor;

