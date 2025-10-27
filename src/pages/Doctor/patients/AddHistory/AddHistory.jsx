import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { addPatientHistory, fetchPatientHistory } from "../../../../features/doctor/doctorThunks";
import { resetDoctorState } from "../../../../features/doctor/doctorSlice";
import { FileText, Save, ArrowLeft, CheckCircle } from "lucide-react";

export default function AddHistory() {
  const { patientId, id } = useParams();
  // Use patientId if available, otherwise fall back to id for compatibility
  const finalPatientId = patientId || id;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, addHistorySuccess, patientHistory: history, patientHistoryLoading: historyLoading, patientHistoryError: historyError } = useSelector((state) => state.doctor);
  

  
  const [formData, setFormData] = useState({
    // Medical Conditions
    hayFever: "",
    hayFeverDuration: "",
    asthma: "",
    asthmaDuration: "",
    breathingProblems: "",
    breathingProblemsDuration: "",
    hivesSwelling: "",
    hivesSwellingDuration: "",
    sinusTrouble: "",
    sinusTroubleDuration: "",
    eczemaRashes: "",
    eczemaRashesDuration: "",
    foodAllergies: "",
    foodAllergiesDuration: "",
    arthriticDiseases: "",
    arthriticDiseasesDuration: "",
    immuneDefect: "",
    immuneDefectDuration: "",
    drugAllergy: "",
    drugAllergyDuration: "",
    beeStingHypersensitivity: "",
    beeStingHypersensitivityDuration: "",
    
    // Hay Fever Details
    feverGrade: "",
    itchingSoreThroat: "",
    specificDayExposure: "",
    
    // Asthma Details
    asthmaType: "",
    exacerbationsFrequency: "",
    
    // Medical Events
    hospitalAdmission: "",
    hospitalAdmissionDuration: "",
    gpAttendances: "",
    gpAttendancesDuration: "",
    aeAttendances: "",
    aeAttendancesDuration: "",
    ituAdmissions: "",
    ituAdmissionsDuration: "",
    coughWheezeFrequency: "",
    coughWheezeFrequencyDuration: "",
    intervalSymptoms: "",
    intervalSymptomsDuration: "",
    nightCoughFrequency: "",
    nightCoughFrequencyDuration: "",
    earlyMorningCough: "",
    earlyMorningCoughDuration: "",
    exerciseInducedSymptoms: "",
    exerciseInducedSymptomsDuration: "",
    familySmoking: "",
    familySmokingDuration: "",
    petsAtHome: "",
    petsAtHomeDuration: "",
    
    // Triggers (flattened)
    triggersUrtis: false,
    triggersColdWeather: false,
    triggersPollen: false,
    triggersSmoke: false,
    triggersExercise: false,
    triggersPets: false,
    triggersOthers: "",
    
    // Allergic Rhinitis (flattened)
    allergicRhinitisType: "",
    rhinitisSneezing: "",
    rhinitisNasalCongestion: "",
    rhinitisRunningNose: "",
    rhinitisItchingNose: "",
    rhinitisItchingEyes: "",
    rhinitisCoughing: "",
    rhinitisWheezing: "",
    rhinitisCoughingWheezing: "",
    rhinitisWithExercise: "",
    rhinitisHeadaches: "",
    rhinitisPostNasalDrip: "",
    
    // Skin Allergy (flattened)
    skinAllergyType: "",
    skinHeavesPresent: "",
    skinHeavesDuration: "",
    skinHeavesDistribution: "",
    skinEczemaPresent: "",
    skinEczemaDuration: "",
    skinEczemaDistribution: "",
    skinUlcerPresent: "",
    skinUlcerDuration: "",
    skinUlcerDistribution: "",
    skinPapuloSquamousRashesPresent: "",
    skinPapuloSquamousRashesDuration: "",
    skinPapuloSquamousRashesDistribution: "",
    skinItchingNoRashesPresent: "",
    skinItchingNoRashesDuration: "",
    skinItchingNoRashesDistribution: "",
    
    // Medical History
    hypertension: "",
    hypertensionDuration: "",
    diabetes: "",
    diabetesDuration: "",
    epilepsy: "",
    epilepsyDuration: "",
    ihd: "",
    ihdDuration: "",
    
    // New Drugs
    drugAllergyKnown: "",
    probable: "",
    definite: "",
    
    // Occupation and Exposure
    occupation: "",
    probableChemicalExposure: "",
    location: "",
    familyHistory: "",
    
    // Examination
    oralCavity: "",
    skin: "",
    ent: "",
    eye: "",
    respiratorySystem: "",
    cvs: "",
    cns: "",
    abdomen: "",
    otherFindings: "",
    
    // Report File
    reportFile: null
  });

  // Fetch existing history data if available
  useEffect(() => {
    if (finalPatientId) {
      dispatch(fetchPatientHistory(finalPatientId));
    }
  }, [dispatch, finalPatientId]);

  // Populate form with existing data when history is loaded
  useEffect(() => {
    if (history && Object.keys(history).length > 0) {
      setFormData(prevData => ({
        ...prevData,
        ...history
      }));
    }
  }, [history]);

  React.useEffect(() => {
    if (addHistorySuccess) {
      setTimeout(() => {
        dispatch(resetDoctorState());
        navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${finalPatientId}`);
      }, 1500);
    }
  }, [addHistorySuccess, dispatch, navigate, finalPatientId]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!finalPatientId) {
      console.error('Patient ID is required');
      return;
    }
    
    console.log('Submitting history for patient:', finalPatientId);
    console.log('Form data:', formData);
    
    // Add patientId to the form data
    const historyDataWithPatientId = {
      ...formData,
      patientId: finalPatientId
    };
    
    console.log('History data with patient ID:', historyDataWithPatientId);
    
    try {
      const result = await dispatch(addPatientHistory(historyDataWithPatientId));
      console.log('History submission result:', result);
    } catch (error) {
      console.error('Error submitting history:', error);
    }
  };

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
                              onClick={() => navigate(`/dashboard/Doctor/patients/PatientList`)}
              className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patient
            </button>
            <h1 className="text-md font-bold text-slate-800 mb-2">
              Add Medical History (Doctor)
            </h1>
            <p className="text-slate-600 text-xs">
              Comprehensive medical history form
            </p>
          </div>

          {/* Alert Messages */}
          {addHistorySuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <span className="text-green-700 text-xs">Medical history added successfully!</span>
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-700 text-xs">{error}</span>
            </div>
          )}
          {historyError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-700 text-xs">{historyError}</span>
            </div>
          )}

          {/* Form */}
          {historyLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600 text-xs">Loading existing history data...</p>
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <div className="p-6 border-b border-blue-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                Medical History Information
              </h2>
              <p className="text-slate-600 mt-1 text-xs">
                Fill in the comprehensive medical history details below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* 1. Medical Conditions */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  1. Have you ever had the following conditions:
                </h3>
                
                <div className="space-y-4">
                  {[
                    { name: 'hayFever', label: 'Hay fever (itching of nose, sneezing, stuffy nose, running nose)' },
                    { name: 'asthma', label: 'Asthma (wheezing)' },
                    { name: 'breathingProblems', label: 'Other Breathing Problems - Shortness of Breath' },
                    { name: 'hivesSwelling', label: 'Hives or Swelling (urticarial angioedema)' },
                    { name: 'sinusTrouble', label: 'Sinus Trouble - Frequent Colds' },
                    { name: 'eczemaRashes', label: 'Eczema or other rashes ' },
                    { name: 'foodAllergies', label: 'Food Allergies' },
                    { name: 'arthriticDiseases', label: 'Arthritic Diseases' },
                    { name: 'immuneDefect', label: 'Immune Defect (frequent or recurrent infections)' },
                    { name: 'drugAllergy', label: 'Drug Allergy (Penicillin, Sulpha Aspirin, other)' },
                    { name: 'beeStingHypersensitivity', label: 'Bee Sting or Insect Hypersensitivity (large swelling, hives, shock)' }
                  ].map((condition) => (
                    <div key={condition.name} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <div className="mb-3">
                        <span className="text-sm text-slate-700 font-medium">{condition.label}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={condition.name}
                              value="yes"
                              checked={formData[condition.name] === "yes"}
                              onChange={handleChange}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Yes</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={condition.name}
                              value="no"
                              checked={formData[condition.name] === "no"}
                              onChange={handleChange}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">No</span>
                          </label>
                        </div>
                        <div className="text-center">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Duration (Months)</label>
                          <input
                            type="number"
                            name={`${condition.name}Duration`}
                            value={formData[`${condition.name}Duration`] || ''}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            step="1"
                            className="w-24 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                          />
                        </div>
                        <div className="text-center">
                          
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Hay Fever Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  2. Details of Hay fever:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-3">Fever grade:</label>
                    <div className="flex space-x-6">
                      {['Mild', 'Moderate', 'Severe'].map((grade) => (
                        <label key={grade} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="feverGrade"
                            value={grade.toLowerCase()}
                            checked={formData.feverGrade === grade.toLowerCase()}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700">{grade}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-3">Itching sore throat and other symptoms if any:</label>
                    <div className="flex space-x-6">
                      {['Yes', 'No'].map((option) => (
                        <label key={option} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="itchingSoreThroat"
                            value={option.toLowerCase()}
                            checked={formData.itchingSoreThroat === option.toLowerCase()}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Any specific day exposure/cycles of fever if noted:
                  </label>
                  <input
                    type="text"
                    name="specificDayExposure"
                    value={formData.specificDayExposure}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    placeholder="Any specific day"
                  />
                </div>
              </div>

              {/* 3. Asthma */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  3. Asthma:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-3">Select:</label>
                    <select
                      name="asthmaType"
                      value={formData.asthmaType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    >
                      <option value="">Select</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-3">
                      How often have exacerbations occurred in the last year?:
                    </label>
                    <textarea
                      name="exacerbationsFrequency"
                      value={formData.exacerbationsFrequency}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here."
                    />
                  </div>
                </div>
              </div>

              {/* 4. Medical Events */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  4. Have these required any of the following and if so how frequently?:
                </h3>
                
                <div className="space-y-4">
                  {[
                    { name: 'hospitalAdmission', label: 'Admission to hospital' },
                    { name: 'gpAttendances', label: 'GP attendances' },
                    { name: 'aeAttendances', label: 'A&E attendances' },
                    { name: 'ituAdmissions', label: 'Any ICU admissions in the past?' }
                  ].map((event) => (
                    <div key={event.name} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <div className="mb-3">
                        <span className="text-sm text-slate-700 font-medium">{event.label}</span>
                      </div>
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={event.name}
                            value="yes"
                            checked={formData[event.name] === "yes"}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={event.name}
                            value="no"
                            checked={formData[event.name] === "no"}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">No</span>
                        </label>
                      </div>
                    </div>
                  ))}
                  
                  {/* Special case for cough/wheeze frequency - text input instead of yes/no */}
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <div className="mb-3">
                      <span className="text-sm text-slate-700 font-medium">How many times are cough/wheeze present in a week</span>
                    </div>
                    <div className="text-left">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Number of times per week</label>
                      <input
                        type="text"
                        name="coughWheezeFrequency"
                        value={formData.coughWheezeFrequency || ''}
                        onChange={handleChange}
                        placeholder="Enter frequency"
                        className="w-32 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                      />
                    </div>
                  </div>

                  {/* Special case for night cough frequency - text input instead of yes/no */}
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <div className="mb-3">
                      <span className="text-sm text-slate-700 font-medium">Coughing at night how often does this wake the person</span>
                    </div>
                    <div className="text-left">
                      <label className="block text-sm font-medium text-slate-700 mb-2">No of times</label>
                      <input
                        type="text"
                        name="nightCoughFrequency"
                        value={formData.nightCoughFrequency || ''}
                        onChange={handleChange}
                        placeholder="Enter frequency"
                        className="w-32 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                      />
                    </div>
                  </div>

                  {[
                    { name: 'intervalSymptoms', label: 'Are interval symptoms present?' },
                    { name: 'earlyMorningCough', label: 'Early morning cough' },
                    { name: 'exerciseInducedSymptoms', label: 'Exercise induced symptoms?' },
                    { name: 'familySmoking', label: 'Does anyone in the family smoke?' },
                    { name: 'petsAtHome', label: 'Are there any pets at home' }
                  ].map((event) => (
                    <div key={event.name} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <div className="mb-3">
                        <span className="text-sm text-slate-700 font-medium">{event.label}</span>
                      </div>
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={event.name}
                            value="yes"
                            checked={formData[event.name] === "yes"}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={event.name}
                            value="no"
                            checked={formData[event.name] === "no"}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">No</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Triggers */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  5. What triggers exacerbations?:
                </h3>
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {[
                      { name: 'triggersUrtis', label: 'URTIs' },
                      { name: 'triggersColdWeather', label: 'Cold weather' },
                      { name: 'triggersPollen', label: 'Pollen' },
                      { name: 'triggersSmoke', label: 'Smoke' },
                      { name: 'triggersExercise', label: 'Exercise' },
                      { name: 'triggersPets', label: 'Pets' }
                    ].map((trigger) => (
                      <label key={trigger.name} className="flex items-center p-2 bg-white rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          name={trigger.name}
                          checked={formData[trigger.name]}
                          onChange={handleChange}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-slate-700">{trigger.label}</span>
                      </label>
                    ))}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Others, please specify:
                    </label>
                    <input
                      type="text"
                      name="triggersOthers"
                      value={formData.triggersOthers}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Others, please specify"
                    />
                  </div>
                </div>
              </div>

              {/* 6. Allergic Rhinitis */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  6. Allergic Rhinitis:
                </h3>
                
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-2">Select:</label>
                  <select
                    name="allergicRhinitisType"
                    value={formData.allergicRhinitisType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    <option value="">Select</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="perennial">Perennial</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border border-slate-200 rounded-lg">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 border-r border-slate-200">Symptoms</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 border-r border-slate-200">Not So Much</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 border-r border-slate-200">Mild</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 border-r border-slate-200">Mod</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-700">Severe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        'rhinitisSneezing', 'rhinitisNasalCongestion', 'rhinitisRunningNose', 'rhinitisItchingNose', 'rhinitisItchingEyes',
                        'rhinitisCoughing', 'rhinitisWheezing', 'rhinitisCoughingWheezing', 'rhinitisWithExercise', 'rhinitisHeadaches', 'rhinitisPostNasalDrip'
                      ].map((symptom) => (
                        <tr key={symptom} className="border-t border-slate-200">
                          <td className="px-4 py-2 text-xs text-slate-700 border-r border-slate-200 capitalize">
                            {symptom.replace(/([A-Z])/g, ' $1').trim()}
                          </td>
                          {['notSoMuch', 'mild', 'mod', 'severe'].map((severity) => (
                            <td key={severity} className="px-4 py-2 text-center border-r border-slate-200">
                              <input
                                type="radio"
                                name={symptom}
                                value={severity}
                                checked={formData[symptom] === severity}
                                onChange={handleChange}
                                className="mr-1"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. Skin Allergy */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  7. Skin Allergy:
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select:</label>
                  <select
                    name="skinAllergyType"
                    value={formData.skinAllergyType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="contact">Contact Dermatitis</option>
                    <option value="atopic">Atopic Dermatitis</option>
                    <option value="urticaria">Urticaria</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="space-y-4">
                  {[
                    { key: 'skinHeavesPresent', label: 'Heaves' },
                    { key: 'skinEczemaPresent', label: 'Eczema' },
                    { key: 'skinUlcerPresent', label: 'Ulcer' },
                    { key: 'skinPapuloSquamousRashesPresent', label: 'Papulo-squamous rashes' },
                    { key: 'skinItchingNoRashesPresent', label: 'Itching with no rashes' }
                  ].map((condition) => (
                    <div key={condition.key} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1">
                          <span className="text-sm font-medium text-slate-700">{condition.label}</span>
                        </div>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={condition.key}
                              value="yes"
                              checked={formData[condition.key] === "yes"}
                              onChange={handleChange}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Yes</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={condition.key}
                              value="no"
                              checked={formData[condition.key] === "no"}
                              onChange={handleChange}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">No</span>
                          </label>
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Distribution</label>
                          <input
                            type="text"
                            placeholder={`${condition.label} Distribution`}
                            name={`${condition.key}Distribution`}
                            value={formData[`${condition.key}Distribution`]}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Medical History */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  8. History:
                </h3>
                
                <div className="space-y-4">
                  {[
                    { name: 'hypertension', label: 'Hypertension' },
                    { name: 'diabetes', label: 'Diabetes' },
                    { name: 'epilepsy', label: 'Epilepsy' },
                    { name: 'ihd', label: 'IHD (Ischemic Heart Disease)' }
                  ].map((condition) => (
                    <div key={condition.name} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <div className="mb-3">
                        <span className="text-sm text-slate-700 font-medium">{condition.label}</span>
                      </div>
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={condition.name}
                            value="yes"
                            checked={formData[condition.name] === "yes"}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={condition.name}
                            value="no"
                            checked={formData[condition.name] === "no"}
                            onChange={handleChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">No</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 9. New Drugs */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  9. Any New Drugs recently prescribed before the onset:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Drug Allergy Known:</label>
                    <input
                      type="text"
                      name="drugAllergyKnown"
                      value={formData.drugAllergyKnown}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Probable:</label>
                    <input
                      type="text"
                      name="probable"
                      value={formData.probable}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Definite:</label>
                    <input
                      type="text"
                      name="definite"
                      value={formData.definite}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here"
                    />
                  </div>
                </div>
              </div>

              {/* 10. Occupation and Exposure */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  10. Occupation and Exposure possibility:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Occupation:</label>
                    <input
                      type="text"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Probable Chemical Exposure:</label>
                    <input
                      type="text"
                      name="probableChemicalExposure"
                      value={formData.probableChemicalExposure}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Location:</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Family History:</label>
                    <input
                      type="text"
                      name="familyHistory"
                      value={formData.familyHistory}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Write here"
                    />
                  </div>
                </div>
              </div>

              {/* 11. Examination */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  11. Examination:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'oralCavity', label: 'Oral Cavity' },
                    { name: 'skin', label: 'Skin' },
                    { name: 'ent', label: 'ENT' },
                    { name: 'eye', label: 'Eye' },
                    { name: 'respiratorySystem', label: 'Respiratory System' },
                    { name: 'cvs', label: 'CVS (Cardiovascular System)' },
                    { name: 'cns', label: 'CNS (Central Nervous System)' },
                    { name: 'abdomen', label: 'Abdomen' }
                  ].map((system) => (
                    <div key={system.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-medium text-slate-700 mb-2">{system.label}:</label>
                      <textarea
                        name={system.name}
                        value={formData[system.name]}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        placeholder="Write here"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-xs font-medium text-slate-700 mb-2">Any Other Findings:</label>
                  <textarea
                    name="otherFindings"
                    value={formData.otherFindings}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    placeholder="Write here"
                  />
                </div>
              </div>

              {/* 12. Report */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  12. Report:
                </h3>
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-xs font-medium text-slate-700 mb-2">Upload Report File:</label>
                  <input
                    type="file"
                    name="reportFile"
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  />
                  <p className="text-xs text-slate-500 mt-1">No file chosen</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/Doctor/patients/profile/ViewProfile/${finalPatientId}`)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => {}}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-xs"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding History...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
      </div>
    
  );
}