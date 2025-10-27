// src/features/patient/patientThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import API from '../../services/api';

// ADD PATIENT
export const createPatient = createAsyncThunk(
  'patient/createPatient',
  async (patientData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.post('/patients',
        patientData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Patient added successfully!');
      return response.data;
    } catch (err) {
      // Handle duplicate patient error with more information
      if (err.response?.status === 400 && err.response?.data?.existingPatient) {
        const existingPatient = err.response.data.existingPatient;
        const errorMsg = `Patient already exists!\nName: ${existingPatient.name}\nUH ID: ${existingPatient.uhId}\nPhone: ${existingPatient.phone}${existingPatient.email ? `\nEmail: ${existingPatient.email}` : ''}`;
        toast.error(errorMsg, {
          autoClose: 6000,
          style: { whiteSpace: 'pre-line' }
        });
        return rejectWithValue(errorMsg);
      }
      
      const errorMsg = err.response?.data?.message || 'Failed to add patient';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// SUBMIT TESTS
export const submitPatientTests = createAsyncThunk(
  'patient/submitPatientTests',
  async ({ patientId, testData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.post(`/patients/${patientId}/tests`,
        testData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      toast.success('Test results submitted successfully!');
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Test submission failed';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// GET SINGLE PATIENT
export const getSinglePatient = createAsyncThunk(
  "patient/getSinglePatient",
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await API.get(`/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch patient");
    }
  }
);

// UPDATE (EDIT) PATIENT
export const updatePatient = createAsyncThunk(
  "patient/updatePatient",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await API.put(`/patients/${id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Patient updated successfully!');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update patient";
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// ✅ ALIAS for compatibility with older imports
export const editPatient = updatePatient;

// FETCH ALL PATIENTS
export const fetchPatients = createAsyncThunk(
  'patient/fetchPatients',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/patients', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      return Array.isArray(data) ? data : data.patients || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patients');
    }
  }
);

// OPTIONAL ALIAS
export const getPatients = fetchPatients;

// DELETE PATIENT
export const deletePatient = createAsyncThunk(
  'patient/deletePatient',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await API.delete(`/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Patient deleted successfully!');
      return id;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// FETCH PATIENT + TESTS FOR SHOW-TESTS PAGE
export const fetchPatientAndTests = createAsyncThunk(
  'patient/fetchPatientAndTests',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get(`/patients/${id}/show-tests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // The backend returns just the tests array directly
      const tests = Array.isArray(response.data) ? response.data : [];
      
      return {
        patient: null, // We'll fetch patient separately if needed
        tests: tests,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load patient tests');
    }
  }
);

// ✅ Aliases for legacy component imports (AddTest.jsx & ShowTests.jsx)
export const submitTestReport = submitPatientTests;
export const fetchPatientTests = fetchPatientAndTests;

// FETCH PATIENT HISTORY
export const fetchPatientHistory = createAsyncThunk(
  'patient/fetchPatientHistory',
  async (patientId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get(`/history/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient history');
    }
  }
);
