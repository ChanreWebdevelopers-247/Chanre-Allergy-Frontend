import API from './api';

const HTTP_METHOD_WITH_BODY = new Set(['post', 'put', 'patch']);

const isFallbackEligible = (error) => {
  const status = error?.response?.status;
  return status === 404 || status === 405 || status === 410;
};

const requestWithFallback = async (method, paths, { data, params } = {}) => {
  let lastError = null;
  for (const path of paths) {
    try {
      if (HTTP_METHOD_WITH_BODY.has(method)) {
        const response = await API[method](path, data, { params });
        return { data: response.data, path };
      }

      const response = await API[method](path, { params });
      return { data: response.data, path };
    } catch (error) {
      lastError = error;
      if (!isFallbackEligible(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};

const RECEPTIONIST_LIST_PATHS = [
  '/slit-therapy/receptionist',
  '/slitTherapy/receptionist',
  '/slit-therapy/reception',
  '/slitTherapy/reception',
];

const LAB_LIST_PATHS = [
  '/slit-therapy/lab',
  '/slitTherapy/lab',
  '/slit-therapy/lab/requests',
  '/slitTherapy/lab/requests',
  '/slit-therapy/requests/lab',
  '/slitTherapy/requests/lab',
];

const CREATE_PATHS = [
  '/slit-therapy',
  '/slitTherapy',
  '/slit-therapy/create',
  '/slitTherapy/create',
];

const requestPathsForId = (id, suffixes) =>
  suffixes.map((suffix) => suffix.replace('{id}', id));

const MARK_PAID_PATHS = (id) =>
  requestPathsForId(id, [
    '/slit-therapy/{id}/mark-paid',
    '/slitTherapy/{id}/mark-paid',
    '/slit-therapy/{id}/markPaid',
    '/slitTherapy/{id}/markPaid',
    '/slit-therapy/{id}/billing/mark-paid',
    '/slitTherapy/{id}/billing/mark-paid',
  ]);

const CLOSE_PATHS = (id) =>
  requestPathsForId(id, [
    '/slit-therapy/{id}/close',
    '/slitTherapy/{id}/close',
    '/slit-therapy/{id}/receive',
    '/slitTherapy/{id}/receive',
  ]);

const CANCEL_PATHS = (id) =>
  requestPathsForId(id, [
    '/slit-therapy/{id}/cancel',
    '/slitTherapy/{id}/cancel',
    '/slit-therapy/{id}/billing/cancel',
    '/slitTherapy/{id}/billing/cancel',
  ]);

const REFUND_PATHS = (id) =>
  requestPathsForId(id, [
    '/slit-therapy/{id}/refund',
    '/slitTherapy/{id}/refund',
    '/slit-therapy/{id}/billing/refund',
    '/slitTherapy/{id}/billing/refund',
  ]);

const STATUS_PATHS = (id) =>
  requestPathsForId(id, [
    '/slit-therapy/{id}/status',
    '/slitTherapy/{id}/status',
    '/slit-therapy/{id}/lab/status',
    '/slitTherapy/{id}/lab/status',
  ]);

const unwrapRequests = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.requests)) return payload.requests;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return payload.requests || payload.data || [];
};

export const fetchReceptionistRequests = async (params = {}) => {
  const { data } = await requestWithFallback('get', RECEPTIONIST_LIST_PATHS, { params });
  return unwrapRequests(data);
};

export const fetchLabRequests = async (params = {}) => {
  const { data } = await requestWithFallback('get', LAB_LIST_PATHS, { params });
  return unwrapRequests(data);
};

export const createReceptionistRequest = async (payload) => {
  const { data } = await requestWithFallback('post', CREATE_PATHS, { data: payload });
  return data?.request || data;
};

export const markReceptionistRequestPaid = async (id, payload) => {
  const { data } = await requestWithFallback('put', MARK_PAID_PATHS(id), { data: payload });
  return data?.request || data;
};

export const closeReceptionistRequest = async (id, payload) => {
  const { data } = await requestWithFallback('put', CLOSE_PATHS(id), { data: payload });
  return data?.request || data;
};

export const cancelReceptionistRequest = async (id, payload) => {
  const { data } = await requestWithFallback('put', CANCEL_PATHS(id), { data: payload });
  return data?.request || data;
};

export const refundReceptionistRequest = async (id, payload) => {
  const { data } = await requestWithFallback('put', REFUND_PATHS(id), { data: payload });
  return data?.request || data;
};

export const updateLabRequestStatus = async (id, payload) => {
  const { data } = await requestWithFallback('put', STATUS_PATHS(id), { data: payload });
  return data?.request || data;
};

export default {
  fetchReceptionistRequests,
  fetchLabRequests,
  createReceptionistRequest,
  markReceptionistRequestPaid,
  closeReceptionistRequest,
  cancelReceptionistRequest,
  refundReceptionistRequest,
  updateLabRequestStatus,
};

