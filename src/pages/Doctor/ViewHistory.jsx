import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { fetchPatientHistory } from '../../features/doctor/doctorThunks';
import { ArrowLeft, FileText, Calendar, User, Activity, Download, Edit, Paperclip } from 'lucide-react';
import { openDocumentWithFallback } from "../../utils/documentHelpers";

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
};

const ViewHistory = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const openDocument = useCallback(
    async (doc) => {
      await openDocumentWithFallback({ doc, toast });
    },
    [toast]
  );

  const attachments = useMemo(() => {
    if (!history) return [];
    const docs = [];
    if (Array.isArray(history.attachments)) docs.push(...history.attachments);
    if (Array.isArray(history.medicalHistoryDocs)) docs.push(...history.medicalHistoryDocs);
    if (docs.length === 0 && history.reportFile) {
      docs.push({
        filename: history.reportFile,
        originalName: history.originalName || history.reportFile,
      });
    }
    return docs;
  }, [history]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/history/single/${patientId}`);
        setHistory(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load history details');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchHistory();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading history details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">History not found</p>
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
            onClick={() => navigate(`/dashboard/doctor/patients/${patientId}`)}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient Details
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Medical History Details
              </h1>
              <p className="text-slate-600">
                Complete medical history and examination records
              </p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/doctor/patients/edithistory/${patientId}/${history._id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit History
            </button>
          </div>
        </div>

        {/* History Details */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100">
          <div className="p-6 border-b border-blue-100">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                History Information
              </h2>
              <div className="flex items-center gap-2 text-sm text-blue-500 mt-2">
                <Calendar className="h-4 w-4" />
                {history.createdAt ? new Date(history.createdAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Medical Conditions */}
            {(history.hayFever || history.asthma || history.breathingProblems || history.hivesSwelling || 
              history.sinusTrouble || history.eczemaRashes || history.foodAllergies || history.arthriticDiseases || 
              history.immuneDefect || history.drugAllergy || history.beeStingHypersensitivity) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Medical Conditions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.hayFever && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Hay Fever:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.hayFever}</span>
                      </div>
                      {history.hayFeverDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.hayFeverDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.asthma && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Asthma:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.asthma}</span>
                      </div>
                      {history.asthmaDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.asthmaDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.breathingProblems && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Breathing Problems:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.breathingProblems}</span>
                      </div>
                      {history.breathingProblemsDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.breathingProblemsDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.hivesSwelling && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Hives/Swelling:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.hivesSwelling}</span>
                      </div>
                      {history.hivesSwellingDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.hivesSwellingDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.sinusTrouble && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Sinus Trouble:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.sinusTrouble}</span>
                      </div>
                      {history.sinusTroubleDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.sinusTroubleDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.eczemaRashes && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Eczema/Rashes:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.eczemaRashes}</span>
                      </div>
                      {history.eczemaRashesDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.eczemaRashesDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.foodAllergies && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Food Allergies:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.foodAllergies}</span>
                      </div>
                      {history.foodAllergiesDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.foodAllergiesDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.drugAllergy && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Drug Allergy:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.drugAllergy}</span>
                      </div>
                      {history.drugAllergyDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.drugAllergyDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.arthriticDiseases && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Arthritic Diseases:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.arthriticDiseases}</span>
                      </div>
                      {history.arthriticDiseasesDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.arthriticDiseasesDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.immuneDefect && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Immune Defect:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.immuneDefect}</span>
                      </div>
                      {history.immuneDefectDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.immuneDefectDuration} months
                        </div>
                      )}
                    </div>
                  )}
                  {history.beeStingHypersensitivity && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Bee Sting Hypersensitivity:</span>
                        <span className="text-sm text-slate-800 font-medium">{history.beeStingHypersensitivity}</span>
                      </div>
                      {history.beeStingHypersensitivityDuration && (
                        <div className="text-xs text-slate-500">
                          Duration: {history.beeStingHypersensitivityDuration} months
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hay Fever Details */}
            {(history.feverGrade || history.itchingSoreThroat || history.specificDayExposure) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Hay Fever Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.feverGrade && (
                    <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Fever Grade:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.feverGrade}</span>
                    </div>
                  )}
                  {history.itchingSoreThroat && (
                    <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Itching/Sore Throat:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.itchingSoreThroat}</span>
                    </div>
                  )}
                  {history.specificDayExposure && (
                    <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Specific Day Exposure:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.specificDayExposure}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Asthma Details */}
            {(history.asthmaType || history.exacerbationsFrequency) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Asthma Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.asthmaType && (
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Asthma Type:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.asthmaType}</span>
                    </div>
                  )}
                  {history.exacerbationsFrequency && (
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Exacerbations Frequency:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.exacerbationsFrequency}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medical Events */}
            {(history.hospitalAdmission || history.gpAttendances || history.aeAttendances || history.ituAdmissions || 
              history.coughWheezeFrequency || history.intervalSymptoms || history.nightCoughFrequency || 
              history.earlyMorningCough || history.exerciseInducedSymptoms || history.familySmoking || history.petsAtHome) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Medical Events & Symptoms
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.hospitalAdmission && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Hospital Admission:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.hospitalAdmission}</span>
                    </div>
                  )}
                  {history.gpAttendances && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">GP Attendances:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.gpAttendances}</span>
                    </div>
                  )}
                  {history.aeAttendances && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">AE Attendances:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.aeAttendances}</span>
                    </div>
                  )}
                  {history.ituAdmissions && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">ITU Admissions:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.ituAdmissions}</span>
                    </div>
                  )}
                  {history.coughWheezeFrequency && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Cough/Wheeze Frequency:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.coughWheezeFrequency}</span>
                    </div>
                  )}
                  {history.intervalSymptoms && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Interval Symptoms:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.intervalSymptoms}</span>
                    </div>
                  )}
                  {history.nightCoughFrequency && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Night Cough Frequency:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.nightCoughFrequency}</span>
                    </div>
                  )}
                  {history.earlyMorningCough && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Early Morning Cough:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.earlyMorningCough}</span>
                    </div>
                  )}
                  {history.exerciseInducedSymptoms && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Exercise Induced Symptoms:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.exerciseInducedSymptoms}</span>
                    </div>
                  )}
                  {history.familySmoking && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Family Smoking:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.familySmoking}</span>
                    </div>
                  )}
                  {history.petsAtHome && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Pets at Home:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.petsAtHome}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Triggers */}
            {(history.triggersUrtis !== undefined || history.triggersColdWeather !== undefined || 
              history.triggersPollen !== undefined || history.triggersSmoke !== undefined || 
              history.triggersExercise !== undefined || history.triggersPets !== undefined || history.triggersOthers) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Triggers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.triggersUrtis !== undefined && (
                    <div className="flex justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">URTIs:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.triggersUrtis ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {history.triggersColdWeather !== undefined && (
                    <div className="flex justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Cold Weather:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.triggersColdWeather ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {history.triggersPollen !== undefined && (
                    <div className="flex justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Pollen:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.triggersPollen ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {history.triggersSmoke !== undefined && (
                    <div className="flex justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Smoke:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.triggersSmoke ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {history.triggersExercise !== undefined && (
                    <div className="flex justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Exercise:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.triggersExercise ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {history.triggersPets !== undefined && (
                    <div className="flex justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Pets:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.triggersPets ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {history.triggersOthers && (
                    <div className="flex justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Others:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.triggersOthers}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allergic Rhinitis */}
            {(history.allergicRhinitisType || history.rhinitisSneezing || history.rhinitisNasalCongestion || 
              history.rhinitisRunningNose || history.rhinitisItchingNose || history.rhinitisItchingEyes || 
              history.rhinitisCoughing || history.rhinitisWheezing || history.rhinitisCoughingWheezing || 
              history.rhinitisWithExercise || history.rhinitisHeadaches || history.rhinitisPostNasalDrip) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Allergic Rhinitis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.allergicRhinitisType && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Type:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.allergicRhinitisType}</span>
                    </div>
                  )}
                  {history.rhinitisSneezing && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Sneezing:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisSneezing}</span>
                    </div>
                  )}
                  {history.rhinitisNasalCongestion && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Nasal Congestion:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisNasalCongestion}</span>
                    </div>
                  )}
                  {history.rhinitisRunningNose && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Running Nose:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisRunningNose}</span>
                    </div>
                  )}
                  {history.rhinitisItchingNose && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Itching Nose:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisItchingNose}</span>
                    </div>
                  )}
                  {history.rhinitisItchingEyes && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Itching Eyes:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisItchingEyes}</span>
                    </div>
                  )}
                  {history.rhinitisCoughing && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Coughing:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisCoughing}</span>
                    </div>
                  )}
                  {history.rhinitisWheezing && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Wheezing:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisWheezing}</span>
                    </div>
                  )}
                  {history.rhinitisCoughingWheezing && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Coughing/Wheezing:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisCoughingWheezing}</span>
                    </div>
                  )}
                  {history.rhinitisWithExercise && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">With Exercise:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisWithExercise}</span>
                    </div>
                  )}
                  {history.rhinitisHeadaches && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Headaches:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisHeadaches}</span>
                    </div>
                  )}
                  {history.rhinitisPostNasalDrip && (
                    <div className="flex justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Post Nasal Drip:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.rhinitisPostNasalDrip}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skin Allergy */}
            {(history.skinAllergyType || history.skinHeavesPresent || history.skinHeavesDistribution || 
              history.skinEczemaPresent || history.skinEczemaDistribution || history.skinUlcerPresent || 
              history.skinUlcerDistribution || history.skinPapuloSquamousRashesPresent || 
              history.skinPapuloSquamousRashesDistribution || history.skinItchingNoRashesPresent || 
              history.skinItchingNoRashesDistribution) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Skin Allergy
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.skinAllergyType && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Type:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinAllergyType}</span>
                    </div>
                  )}
                  {history.skinHeavesPresent && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Heaves Present:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinHeavesPresent}</span>
                    </div>
                  )}
                  {history.skinHeavesDistribution && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Heaves Distribution:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinHeavesDistribution}</span>
                    </div>
                  )}
                  {history.skinEczemaPresent && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Eczema Present:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinEczemaPresent}</span>
                    </div>
                  )}
                  {history.skinEczemaDistribution && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Eczema Distribution:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinEczemaDistribution}</span>
                    </div>
                  )}
                  {history.skinUlcerPresent && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Ulcer Present:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinUlcerPresent}</span>
                    </div>
                  )}
                  {history.skinUlcerDistribution && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Ulcer Distribution:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinUlcerDistribution}</span>
                    </div>
                  )}
                  {history.skinPapuloSquamousRashesPresent && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Papulo-Squamous Rashes:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinPapuloSquamousRashesPresent}</span>
                    </div>
                  )}
                  {history.skinPapuloSquamousRashesDistribution && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Rashes Distribution:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinPapuloSquamousRashesDistribution}</span>
                    </div>
                  )}
                  {history.skinItchingNoRashesPresent && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Itching (No Rashes):</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinItchingNoRashesPresent}</span>
                    </div>
                  )}
                  {history.skinItchingNoRashesDistribution && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Itching Distribution:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skinItchingNoRashesDistribution}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medical History */}
            {(history.hypertension || history.diabetes || history.epilepsy || history.ihd) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Medical History
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.hypertension && (
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Hypertension:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.hypertension}</span>
                    </div>
                  )}
                  {history.diabetes && (
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Diabetes:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.diabetes}</span>
                    </div>
                  )}
                  {history.epilepsy && (
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Epilepsy:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.epilepsy}</span>
                    </div>
                  )}
                  {history.ihd && (
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">IHD:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.ihd}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Drug Allergies */}
            {(history.drugAllergyKnown || history.probable || history.definite) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Drug Allergies
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.drugAllergyKnown && (
                    <div className="flex justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Known Allergies:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.drugAllergyKnown}</span>
                    </div>
                  )}
                  {history.probable && (
                    <div className="flex justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Probable:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.probable}</span>
                    </div>
                  )}
                  {history.definite && (
                    <div className="flex justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Definite:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.definite}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Occupation and Exposure */}
            {(history.occupation || history.probableChemicalExposure || history.location || history.familyHistory) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Occupation and Exposure
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.occupation && (
                    <div className="flex justify-between p-3 bg-teal-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Occupation:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.occupation}</span>
                    </div>
                  )}
                  {history.probableChemicalExposure && (
                    <div className="flex justify-between p-3 bg-teal-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Chemical Exposure:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.probableChemicalExposure}</span>
                    </div>
                  )}
                  {history.location && (
                    <div className="flex justify-between p-3 bg-teal-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Location:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.location}</span>
                    </div>
                  )}
                  {history.familyHistory && (
                    <div className="flex justify-between p-3 bg-teal-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Family History:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.familyHistory}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Examination */}
            {(history.oralCavity || history.skin || history.ent || history.eye || history.respiratorySystem || 
              history.cvs || history.cns || history.abdomen || history.otherFindings) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Examination Findings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.oralCavity && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Oral Cavity:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.oralCavity}</span>
                    </div>
                  )}
                  {history.skin && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Skin:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.skin}</span>
                    </div>
                  )}
                  {history.ent && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">ENT:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.ent}</span>
                    </div>
                  )}
                  {history.eye && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Eye:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.eye}</span>
                    </div>
                  )}
                  {history.respiratorySystem && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Respiratory System:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.respiratorySystem}</span>
                    </div>
                  )}
                  {history.cvs && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">CVS:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.cvs}</span>
                    </div>
                  )}
                  {history.cns && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">CNS:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.cns}</span>
                    </div>
                  )}
                  {history.abdomen && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Abdomen:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.abdomen}</span>
                    </div>
                  )}
                  {history.otherFindings && (
                    <div className="flex justify-between p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Other Findings:</span>
                      <span className="text-sm text-slate-800 font-medium">{history.otherFindings}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {history.additionalNotes && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Additional Notes
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-slate-700">{history.additionalNotes}</p>
                </div>
              </div>
            )}

            {/* Supporting Documents */}
            {attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                  Supporting Documents
                </h3>
                <div className="space-y-2">
                  {attachments.map((doc, index) => {
                    const label = doc.originalName || doc.filename || `Document ${index + 1}`;
                    return (
                      <button
                        key={`${doc.documentId || doc.filename || index}`}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewHistory; 