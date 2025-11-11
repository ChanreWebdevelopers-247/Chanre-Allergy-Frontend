import API from '../services/api';
import { SERVER_CONFIG } from '../config/environment';

const trimSlashes = (value = '') => value.replace(/^\/+|\/+$/g, '');

const encodePathSegments = (raw = '') => {
  if (!raw) return raw;
  return trimSlashes(raw)
    .split(/[\\/]+/)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
};

export const buildDocumentUrl = (doc = {}) => {
  if (!doc) return { url: null, isApi: false };

  const rawPath = doc.path || doc.downloadPath;
  if (rawPath) {
    if (rawPath.startsWith('http')) {
      return { url: rawPath, isApi: false };
    }
    const encoded = encodePathSegments(rawPath);
    return {
      url: `${SERVER_CONFIG.BACKEND_URL}/${encoded}`,
      isApi: false,
    };
  }

  const documentId = doc.documentId || doc._id;
  if (documentId && documentId !== 'null' && documentId !== 'undefined') {
    const path = `/api/documents/${documentId}/download`;
    return {
      url: `${SERVER_CONFIG.BACKEND_URL}${path}`,
      isApi: true,
      apiPath: path,
    };
  }

  const filename = doc.filename || doc.originalName;
  if (typeof filename === 'string' && filename.length > 0) {
    if (filename.startsWith('http')) {
      return { url: filename, isApi: false };
    }
    if (filename.startsWith('/')) {
      return { url: `${SERVER_CONFIG.BACKEND_URL}${filename}`, isApi: false };
    }
    const encoded = encodePathSegments(filename);
    return {
      url: `${SERVER_CONFIG.BACKEND_URL}/api/files/${encoded}`,
      isApi: false,
    };
  }

  return { url: null, isApi: false };
};

export const buildLegacyFallbackUrl = (doc = {}) => {
  if (!doc) return null;

  const rawPath = doc.path;
  if (rawPath && typeof rawPath === 'string') {
    if (rawPath.startsWith('http')) return rawPath;
    const encoded = encodePathSegments(rawPath);
    return `${SERVER_CONFIG.BACKEND_URL}/${encoded}`;
  }

  const filename = doc.filename || doc.originalName;
  if (typeof filename === 'string' && filename.length > 0) {
    if (filename.startsWith('http')) return filename;
    if (filename.startsWith('/')) return `${SERVER_CONFIG.BACKEND_URL}${filename}`;
    const encoded = encodePathSegments(filename);
    return `${SERVER_CONFIG.BACKEND_URL}/api/files/${encoded}`;
  }

  return null;
};

export const openDocumentWithFallback = async ({ doc, toast, errorMessage = 'Failed to open document. Please try again.' }) => {
  const { url, isApi, apiPath } = buildDocumentUrl(doc);

  if (!url) {
    toast?.error?.('File not available');
    return;
  }

  if (!isApi) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const normalizedApiPath = apiPath || url.replace(SERVER_CONFIG.BACKEND_URL, '');
    const pathWithSlash = normalizedApiPath.startsWith('/') ? normalizedApiPath : `/${normalizedApiPath}`;
    const response = await API.get(pathWithSlash, { responseType: 'blob' });
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/pdf',
    });
    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60 * 1000);
  } catch (error) {
    console.error('Error opening document via API:', error);
    const fallbackUrl = buildLegacyFallbackUrl(doc);
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    toast?.error?.(errorMessage);
  }
};

export default {
  buildDocumentUrl,
  buildLegacyFallbackUrl,
  openDocumentWithFallback,
};

