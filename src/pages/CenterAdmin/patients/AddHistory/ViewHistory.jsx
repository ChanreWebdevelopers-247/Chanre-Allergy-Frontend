import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Calendar, FileText, User, CheckCircle, AlertCircle, Edit, Paperclip, Download } from "lucide-react";
import { toast } from "react-toastify";
import { openDocumentWithFallback } from "../../../../utils/documentHelpers";
import { fetchHistory } from "../../../../features/centerAdmin/centerAdminThunks";

const ViewHistory = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { history, historyLoading, historyError } = useSelector((state) => state.centerAdmin);

  const formatFileSize = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return "";
    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
  };

  const openDocument = async (doc) => {
    await openDocumentWithFallback({ doc, toast });
  };

  useEffect(() => {
    if (patientId) {
      dispatch(fetchHistory(patientId));
    }
  }, [dispatch, patientId]);

  if (historyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600 text-xs">Loading history details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (historyError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-xs">{historyError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patient Profile
            </button>
            <h1 className="text-md font-bold text-slate-800 mb-2">
              Medical History Details
            </h1>
            <p className="text-slate-600 text-xs">
              No history records found for this patient
            </p>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8">
            <div className="text-center">
              <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                No Medical History Found
              </h3>
              <p className="text-slate-500 mb-6 text-xs">
                This patient doesn't have any medical history records yet. 
                History records will appear here once they are added.
              </p>
              <button
                onClick={() => navigate(-1)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient Profile
          </button>
          <h1 className="text-md font-bold text-slate-800 mb-2">
            Medical History Details
          </h1>
          <p className="text-slate-600 text-xs">
            Complete medical history and examination records ({history.length} records)
          </p>
        </div>

        {/* History Records */}
        <div className="space-y-6">
          {history.map((historyRecord, index) => (
            <div key={historyRecord._id || index} className="bg-white rounded-xl shadow-sm border border-blue-100">
          <div className="p-6 border-b border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      History Record #{index + 1}
                </h2>
                <div className="flex items-center gap-2 text-xs text-blue-500 mt-2">
                  <Calendar className="h-4 w-4" />
                      {historyRecord.createdAt ? new Date(historyRecord.createdAt).toLocaleDateString() : "N/A"}
                </div>
              </div>
              <button
                onClick={() => navigate(`/dashboard/CenterAdmin/patients/AddHistory/EditHistory/${patientId}/${historyRecord._id}`)}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
              >
                <Edit className="h-3 w-3" />
                Edit History
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Medical Conditions */}
            {(historyRecord.hayFever || historyRecord.asthma || historyRecord.breathingProblems || historyRecord.hivesSwelling || 
              historyRecord.sinusTrouble || historyRecord.eczemaRashes || historyRecord.foodAllergies || historyRecord.arthriticDiseases || 
              historyRecord.immuneDefect || historyRecord.drugAllergy || historyRecord.beeStingHypersensitivity) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Medical Conditions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historyRecord.hayFever && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Hay Fever:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.hayFever}</span>
                      </div>
                      {historyRecord.hayFeverDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.hayFeverDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.asthma && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Asthma:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.asthma}</span>
                      </div>
                      {historyRecord.asthmaDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.asthmaDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.breathingProblems && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Breathing Problems:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.breathingProblems}</span>
                      </div>
                      {historyRecord.breathingProblemsDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.breathingProblemsDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.hivesSwelling && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Hives/Swelling:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.hivesSwelling}</span>
                      </div>
                      {historyRecord.hivesSwellingDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.hivesSwellingDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.sinusTrouble && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Sinus Trouble:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.sinusTrouble}</span>
                      </div>
                      {historyRecord.sinusTroubleDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.sinusTroubleDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.eczemaRashes && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Eczema/Rashes:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.eczemaRashes}</span>
                      </div>
                      {historyRecord.eczemaRashesDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.eczemaRashesDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.foodAllergies && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Food Allergies:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.foodAllergies}</span>
                      </div>
                      {historyRecord.foodAllergiesDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.foodAllergiesDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.drugAllergy && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Drug Allergy:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.drugAllergy}</span>
                      </div>
                      {historyRecord.drugAllergyDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.drugAllergyDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.arthriticDiseases && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Arthritic Diseases:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.arthriticDiseases}</span>
                      </div>
                      {historyRecord.arthriticDiseasesDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.arthriticDiseasesDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.immuneDefect && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Immune Defect:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.immuneDefect}</span>
                      </div>
                      {historyRecord.immuneDefectDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.immuneDefectDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {historyRecord.beeStingHypersensitivity && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Bee Sting Hypersensitivity:</span>
                        <span className="text-sm text-slate-800 font-medium">{historyRecord.beeStingHypersensitivity}</span>
                      </div>
                      {historyRecord.beeStingHypersensitivityDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {historyRecord.beeStingHypersensitivityDuration} months
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hay Fever Details */}
                {(historyRecord.feverGrade || historyRecord.itchingSoreThroat || historyRecord.specificDayExposure) && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Hay Fever Details
                </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.feverGrade && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-600">Fever Grade:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.feverGrade}</span>
                    </div>
                  )}
                      {historyRecord.itchingSoreThroat && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-600">Itching/Sore Throat:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.itchingSoreThroat}</span>
                    </div>
                  )}
                      {historyRecord.specificDayExposure && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-600">Specific Day Exposure:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.specificDayExposure}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Asthma Details */}
                {(historyRecord.asthmaType || historyRecord.exacerbationsFrequency || historyRecord.hospitalAdmission || historyRecord.gpAttendances || historyRecord.aeAttendances || historyRecord.ituAdmissions || historyRecord.coughWheezeFrequency) && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Asthma Details
                </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.asthmaType && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-600">Asthma Type:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.asthmaType}</span>
                    </div>
                  )}
                      {historyRecord.exacerbationsFrequency && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-600">Exacerbations Frequency:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.exacerbationsFrequency}</span>
                        </div>
                      )}
                      {historyRecord.hospitalAdmission && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Hospital Admission:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.hospitalAdmission}</span>
                        </div>
                      )}
                      {historyRecord.gpAttendances && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">GP Attendances:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.gpAttendances}</span>
                        </div>
                      )}
                      {historyRecord.aeAttendances && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">AE Attendances:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.aeAttendances}</span>
                        </div>
                      )}
                      {historyRecord.ituAdmissions && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">ITU Admissions:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.ituAdmissions}</span>
                        </div>
                      )}
                      {historyRecord.coughWheezeFrequency && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Cough/Wheeze Frequency:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.coughWheezeFrequency}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

                {/* Medical Events */}
                {(historyRecord.intervalSymptoms || historyRecord.nightCoughFrequency || historyRecord.earlyMorningCough || historyRecord.exerciseInducedSymptoms || historyRecord.familySmoking || historyRecord.petsAtHome) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Medical Events & Symptoms
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.intervalSymptoms && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Interval Symptoms:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.intervalSymptoms}</span>
                        </div>
                      )}
                      {historyRecord.nightCoughFrequency && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Night Cough Frequency:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.nightCoughFrequency}</span>
                        </div>
                      )}
                      {historyRecord.earlyMorningCough && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Early Morning Cough:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.earlyMorningCough}</span>
                        </div>
                      )}
                      {historyRecord.exerciseInducedSymptoms && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Exercise Induced Symptoms:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.exerciseInducedSymptoms}</span>
                        </div>
                      )}
                      {historyRecord.familySmoking && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Family Smoking:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.familySmoking}</span>
                        </div>
                      )}
                      {historyRecord.petsAtHome && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Pets at Home:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.petsAtHome}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Triggers */}
                {(historyRecord.triggersUrtis !== undefined || historyRecord.triggersColdWeather !== undefined || historyRecord.triggersPollen !== undefined || historyRecord.triggersSmoke !== undefined || historyRecord.triggersExercise !== undefined || historyRecord.triggersPets !== undefined || historyRecord.triggersOthers) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Triggers
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.triggersUrtis !== undefined && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">URTIs:</span>
                          <span className={`text-xs font-medium ${historyRecord.triggersUrtis ? 'text-green-600' : 'text-red-600'}`}>
                            {historyRecord.triggersUrtis ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {historyRecord.triggersColdWeather !== undefined && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Cold Weather:</span>
                          <span className={`text-xs font-medium ${historyRecord.triggersColdWeather ? 'text-green-600' : 'text-red-600'}`}>
                            {historyRecord.triggersColdWeather ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {historyRecord.triggersPollen !== undefined && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Pollen:</span>
                          <span className={`text-xs font-medium ${historyRecord.triggersPollen ? 'text-green-600' : 'text-red-600'}`}>
                            {historyRecord.triggersPollen ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {historyRecord.triggersSmoke !== undefined && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Smoke:</span>
                          <span className={`text-xs font-medium ${historyRecord.triggersSmoke ? 'text-green-600' : 'text-red-600'}`}>
                            {historyRecord.triggersSmoke ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {historyRecord.triggersExercise !== undefined && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Exercise:</span>
                          <span className={`text-xs font-medium ${historyRecord.triggersExercise ? 'text-green-600' : 'text-red-600'}`}>
                            {historyRecord.triggersExercise ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {historyRecord.triggersPets !== undefined && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Pets:</span>
                          <span className={`text-xs font-medium ${historyRecord.triggersPets ? 'text-green-600' : 'text-red-600'}`}>
                            {historyRecord.triggersPets ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {historyRecord.triggersOthers && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Other Triggers:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.triggersOthers}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Allergic Rhinitis */}
                {(historyRecord.allergicRhinitisType || historyRecord.rhinitisSneezing || historyRecord.rhinitisNasalCongestion || historyRecord.rhinitisRunningNose || historyRecord.rhinitisItchingNose || historyRecord.rhinitisItchingEyes || historyRecord.rhinitisCoughing || historyRecord.rhinitisWheezing || historyRecord.rhinitisCoughingWheezing || historyRecord.rhinitisWithExercise || historyRecord.rhinitisHeadaches || historyRecord.rhinitisPostNasalDrip) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Allergic Rhinitis
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.allergicRhinitisType && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Type:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.allergicRhinitisType}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisSneezing && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Sneezing:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisSneezing}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisNasalCongestion && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Nasal Congestion:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisNasalCongestion}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisRunningNose && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Running Nose:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisRunningNose}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisItchingNose && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Itching Nose:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisItchingNose}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisItchingEyes && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Itching Eyes:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisItchingEyes}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisCoughing && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Coughing:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisCoughing}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisWheezing && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Wheezing:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisWheezing}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisCoughingWheezing && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Coughing/Wheezing:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisCoughingWheezing}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisWithExercise && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">With Exercise:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisWithExercise}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisHeadaches && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Headaches:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisHeadaches}</span>
                        </div>
                      )}
                      {historyRecord.rhinitisPostNasalDrip && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Post Nasal Drip:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.rhinitisPostNasalDrip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skin Allergy */}
                {(historyRecord.skinAllergyType || historyRecord.skinHeavesPresent || historyRecord.skinEczemaPresent || historyRecord.skinUlcerPresent || historyRecord.skinPapuloSquamousRashesPresent || historyRecord.skinItchingNoRashesPresent) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Skin Allergy
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.skinAllergyType && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Type:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinAllergyType}</span>
                        </div>
                      )}
                      {historyRecord.skinHeavesPresent && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Hives Present:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinHeavesPresent}</span>
                        </div>
                      )}
                      {historyRecord.skinHeavesDistribution && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Hives Distribution:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinHeavesDistribution}</span>
                        </div>
                      )}
                      {historyRecord.skinEczemaPresent && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Eczema Present:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinEczemaPresent}</span>
                        </div>
                      )}
                      {historyRecord.skinEczemaDistribution && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Eczema Distribution:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinEczemaDistribution}</span>
                        </div>
                      )}
                      {historyRecord.skinUlcerPresent && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Ulcer Present:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinUlcerPresent}</span>
                        </div>
                      )}
                      {historyRecord.skinUlcerDistribution && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Ulcer Distribution:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinUlcerDistribution}</span>
                        </div>
                      )}
                      {historyRecord.skinPapuloSquamousRashesPresent && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Papulo-Squamous Rashes:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinPapuloSquamousRashesPresent}</span>
                        </div>
                      )}
                      {historyRecord.skinPapuloSquamousRashesDistribution && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Rashes Distribution:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinPapuloSquamousRashesDistribution}</span>
                        </div>
                      )}
                      {historyRecord.skinItchingNoRashesPresent && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Itching (No Rashes):</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinItchingNoRashesPresent}</span>
                        </div>
                      )}
                      {historyRecord.skinItchingNoRashesDistribution && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Itching Distribution:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skinItchingNoRashesDistribution}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medical History */}
                {(historyRecord.hypertension || historyRecord.diabetes || historyRecord.epilepsy || historyRecord.ihd) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Medical History
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.hypertension && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Hypertension:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.hypertension}</span>
                        </div>
                      )}
                      {historyRecord.diabetes && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Diabetes:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.diabetes}</span>
                        </div>
                      )}
                      {historyRecord.epilepsy && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Epilepsy:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.epilepsy}</span>
                        </div>
                      )}
                      {historyRecord.ihd && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">IHD:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.ihd}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Drug Allergies */}
                {(historyRecord.drugAllergyKnown || historyRecord.probable || historyRecord.definite) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Drug Allergies
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.drugAllergyKnown && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Known Allergies:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.drugAllergyKnown}</span>
                        </div>
                      )}
                      {historyRecord.probable && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Probable:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.probable}</span>
                        </div>
                      )}
                      {historyRecord.definite && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Definite:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.definite}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Occupation and Exposure */}
                {(historyRecord.occupation || historyRecord.probableChemicalExposure || historyRecord.location || historyRecord.familyHistory) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Occupation & Exposure
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.occupation && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Occupation:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.occupation}</span>
                        </div>
                      )}
                      {historyRecord.probableChemicalExposure && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Chemical Exposure:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.probableChemicalExposure}</span>
                        </div>
                      )}
                      {historyRecord.location && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Location:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.location}</span>
                        </div>
                      )}
                      {historyRecord.familyHistory && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Family History:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.familyHistory}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Examination */}
                {(historyRecord.oralCavity || historyRecord.skin || historyRecord.ent || historyRecord.eye || historyRecord.respiratorySystem || historyRecord.cvs || historyRecord.cns || historyRecord.abdomen || historyRecord.otherFindings) && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Examination Findings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyRecord.oralCavity && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Oral Cavity:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.oralCavity}</span>
                        </div>
                      )}
                      {historyRecord.skin && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Skin:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.skin}</span>
                        </div>
                      )}
                      {historyRecord.ent && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">ENT:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.ent}</span>
                        </div>
                      )}
                      {historyRecord.eye && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Eye:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.eye}</span>
                        </div>
                      )}
                      {historyRecord.respiratorySystem && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Respiratory System:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.respiratorySystem}</span>
                        </div>
                      )}
                      {historyRecord.cvs && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">CVS:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.cvs}</span>
                        </div>
                      )}
                      {historyRecord.cns && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">CNS:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.cns}</span>
                        </div>
                      )}
                      {historyRecord.abdomen && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Abdomen:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.abdomen}</span>
                        </div>
                      )}
                      {historyRecord.otherFindings && (
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs font-medium text-slate-600">Other Findings:</span>
                          <span className="text-xs text-slate-800 font-medium">{historyRecord.otherFindings}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Supporting Documents */}
                {(() => {
                  const attachments = [
                    ...(Array.isArray(historyRecord.attachments) ? historyRecord.attachments : []),
                    ...(Array.isArray(historyRecord.medicalHistoryDocs) ? historyRecord.medicalHistoryDocs : []),
                  ];
                  if (attachments.length === 0 && historyRecord.reportFile) {
                    attachments.push({
                      filename: historyRecord.reportFile,
                      originalName: historyRecord.reportFile,
                    });
                  }

                  if (attachments.length === 0) {
                    return null;
                  }

                  return (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                        Supporting Documents
                      </h3>
                      <div className="space-y-2">
                        {attachments.map((doc, idx) => {
                          const label = doc.originalName || doc.filename || `Document ${idx + 1}`;
                          return (
                            <button
                              key={`${doc.documentId || doc.filename || idx}`}
                              type="button"
                              onClick={() => openDocument(doc)}
                              className="flex items-center justify-between gap-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <Paperclip className="h-4 w-4 text-blue-500" />
                                <span className="font-medium truncate max-w-[220px]" title={label}>
                                  {label}
                                </span>
                              </span>
                              <span className="flex items-center gap-2 text-slate-500">
                                {formatFileSize(doc.size)}
                                <Download className="h-4 w-4 text-blue-500" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

          </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ViewHistory; 