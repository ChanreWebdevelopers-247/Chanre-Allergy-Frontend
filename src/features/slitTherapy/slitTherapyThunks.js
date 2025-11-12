import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchReceptionistRequests,
  fetchLabRequests,
  createReceptionistRequest,
  markReceptionistRequestPaid,
  closeReceptionistRequest,
  cancelReceptionistRequest,
  refundReceptionistRequest,
  updateLabRequestStatus,
} from '../../services/slitTherapyService';

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchReceptionistSlitTherapyRequests = createAsyncThunk(
  'slitTherapy/fetchReceptionistRequests',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchReceptionistRequests(params);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch SLIT therapy requests'));
    }
  }
);

export const createReceptionistSlitTherapyRequest = createAsyncThunk(
  'slitTherapy/createReceptionistRequest',
  async (payload, { rejectWithValue }) => {
    try {
      return await createReceptionistRequest(payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to create SLIT therapy request'));
    }
  }
);

export const markReceptionistSlitTherapyPaid = createAsyncThunk(
  'slitTherapy/markReceptionistPaid',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await markReceptionistRequestPaid(id, payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to record payment'));
    }
  }
);

export const closeReceptionistSlitTherapyRequest = createAsyncThunk(
  'slitTherapy/closeReceptionistRequest',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await closeReceptionistRequest(id, payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to close SLIT therapy request'));
    }
  }
);

export const cancelReceptionistSlitTherapyRequest = createAsyncThunk(
  'slitTherapy/cancelReceptionistRequest',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await cancelReceptionistRequest(id, payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to cancel SLIT therapy request'));
    }
  }
);

export const refundReceptionistSlitTherapyRequest = createAsyncThunk(
  'slitTherapy/refundReceptionistRequest',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await refundReceptionistRequest(id, payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to process SLIT therapy refund'));
    }
  }
);

export const fetchLabSlitTherapyRequests = createAsyncThunk(
  'slitTherapy/fetchLabRequests',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchLabRequests(params);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch SLIT therapy lab requests'));
    }
  }
);

export const updateLabSlitTherapyStatus = createAsyncThunk(
  'slitTherapy/updateLabStatus',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateLabRequestStatus(id, payload);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update SLIT therapy status'));
    }
  }
);

