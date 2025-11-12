import { createSlice } from '@reduxjs/toolkit';
import {
  fetchReceptionistSlitTherapyRequests,
  createReceptionistSlitTherapyRequest,
  markReceptionistSlitTherapyPaid,
  closeReceptionistSlitTherapyRequest,
  cancelReceptionistSlitTherapyRequest,
  refundReceptionistSlitTherapyRequest,
  fetchLabSlitTherapyRequests,
  updateLabSlitTherapyStatus,
} from './slitTherapyThunks';

const initialMutationState = {
  loading: false,
  error: null,
  success: false,
};

const initialState = {
  receptionist: {
    loading: false,
    error: null,
    requests: [],
    lastLoadedAt: null,
  },
  lab: {
    loading: false,
    error: null,
    requests: [],
    lastLoadedAt: null,
  },
  mutation: initialMutationState,
};

const findRequestIndex = (collection, id) =>
  collection.findIndex((item) => item?._id === id);

const slitTherapySlice = createSlice({
  name: 'slitTherapy',
  initialState,
  reducers: {
    resetSlitTherapyMutationState(state) {
      state.mutation = { ...initialMutationState };
    },
    clearReceptionistSlitTherapyError(state) {
      state.receptionist.error = null;
    },
    clearLabSlitTherapyError(state) {
      state.lab.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceptionistSlitTherapyRequests.pending, (state) => {
        state.receptionist.loading = true;
        state.receptionist.error = null;
      })
      .addCase(fetchReceptionistSlitTherapyRequests.fulfilled, (state, action) => {
        state.receptionist.loading = false;
        state.receptionist.requests = action.payload || [];
        state.receptionist.lastLoadedAt = Date.now();
      })
      .addCase(fetchReceptionistSlitTherapyRequests.rejected, (state, action) => {
        state.receptionist.loading = false;
        state.receptionist.error = action.payload || action.error?.message || 'Failed to fetch requests';
      })

      .addCase(createReceptionistSlitTherapyRequest.pending, (state) => {
        state.mutation = { loading: true, error: null, success: false };
      })
      .addCase(createReceptionistSlitTherapyRequest.fulfilled, (state, action) => {
        state.mutation = { loading: false, error: null, success: true };
        state.receptionist.requests = [action.payload, ...state.receptionist.requests];
      })
      .addCase(createReceptionistSlitTherapyRequest.rejected, (state, action) => {
        state.mutation = {
          loading: false,
          error: action.payload || action.error?.message || 'Failed to create request',
          success: false,
        };
      })

      .addCase(markReceptionistSlitTherapyPaid.pending, (state) => {
        state.mutation = { loading: true, error: null, success: false };
      })
      .addCase(markReceptionistSlitTherapyPaid.fulfilled, (state, action) => {
        state.mutation = { loading: false, error: null, success: true };
        const idx = findRequestIndex(state.receptionist.requests, action.payload?._id);
        if (idx !== -1) {
          state.receptionist.requests[idx] = {
            ...state.receptionist.requests[idx],
            ...action.payload,
          };
        }
      })
      .addCase(markReceptionistSlitTherapyPaid.rejected, (state, action) => {
        state.mutation = {
          loading: false,
          error: action.payload || action.error?.message || 'Failed to record payment',
          success: false,
        };
      })

      .addCase(closeReceptionistSlitTherapyRequest.pending, (state) => {
        state.mutation = { loading: true, error: null, success: false };
      })
      .addCase(closeReceptionistSlitTherapyRequest.fulfilled, (state, action) => {
        state.mutation = { loading: false, error: null, success: true };
        const idx = findRequestIndex(state.receptionist.requests, action.payload?._id);
        if (idx !== -1) {
          state.receptionist.requests[idx] = {
            ...state.receptionist.requests[idx],
            ...action.payload,
          };
        }
      })
      .addCase(closeReceptionistSlitTherapyRequest.rejected, (state, action) => {
        state.mutation = {
          loading: false,
          error: action.payload || action.error?.message || 'Failed to close request',
          success: false,
        };
      })

      .addCase(cancelReceptionistSlitTherapyRequest.pending, (state) => {
        state.mutation = { loading: true, error: null, success: false };
      })
      .addCase(cancelReceptionistSlitTherapyRequest.fulfilled, (state, action) => {
        state.mutation = { loading: false, error: null, success: true };
        const idx = findRequestIndex(state.receptionist.requests, action.payload?._id);
        if (idx !== -1) {
          state.receptionist.requests[idx] = {
            ...state.receptionist.requests[idx],
            ...action.payload,
          };
        }
      })
      .addCase(cancelReceptionistSlitTherapyRequest.rejected, (state, action) => {
        state.mutation = {
          loading: false,
          error: action.payload || action.error?.message || 'Failed to cancel request',
          success: false,
        };
      })

      .addCase(refundReceptionistSlitTherapyRequest.pending, (state) => {
        state.mutation = { loading: true, error: null, success: false };
      })
      .addCase(refundReceptionistSlitTherapyRequest.fulfilled, (state, action) => {
        state.mutation = { loading: false, error: null, success: true };
        const idx = findRequestIndex(state.receptionist.requests, action.payload?._id);
        if (idx !== -1) {
          state.receptionist.requests[idx] = {
            ...state.receptionist.requests[idx],
            ...action.payload,
          };
        }
      })
      .addCase(refundReceptionistSlitTherapyRequest.rejected, (state, action) => {
        state.mutation = {
          loading: false,
          error: action.payload || action.error?.message || 'Failed to process refund',
          success: false,
        };
      })

      .addCase(fetchLabSlitTherapyRequests.pending, (state) => {
        state.lab.loading = true;
        state.lab.error = null;
      })
      .addCase(fetchLabSlitTherapyRequests.fulfilled, (state, action) => {
        state.lab.loading = false;
        state.lab.requests = action.payload || [];
        state.lab.lastLoadedAt = Date.now();
      })
      .addCase(fetchLabSlitTherapyRequests.rejected, (state, action) => {
        state.lab.loading = false;
        state.lab.error = action.payload || action.error?.message || 'Failed to fetch lab requests';
      })

      .addCase(updateLabSlitTherapyStatus.pending, (state) => {
        state.mutation = { loading: true, error: null, success: false };
      })
      .addCase(updateLabSlitTherapyStatus.fulfilled, (state, action) => {
        state.mutation = { loading: false, error: null, success: true };
        const idx = findRequestIndex(state.lab.requests, action.payload?._id);
        if (idx !== -1) {
          state.lab.requests[idx] = {
            ...state.lab.requests[idx],
            ...action.payload,
          };
        }
      })
      .addCase(updateLabSlitTherapyStatus.rejected, (state, action) => {
        state.mutation = {
          loading: false,
          error: action.payload || action.error?.message || 'Failed to update status',
          success: false,
        };
      });
  },
});

export const {
  resetSlitTherapyMutationState,
  clearReceptionistSlitTherapyError,
  clearLabSlitTherapyError,
} = slitTherapySlice.actions;

export default slitTherapySlice.reducer;

