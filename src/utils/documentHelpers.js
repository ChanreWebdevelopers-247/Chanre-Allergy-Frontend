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
    const trimmed = filename.trim();
    if (trimmed.startsWith('http')) {
      return { url: trimmed, isApi: false };
    }
    if (trimmed.startsWith('/api/') || trimmed.startsWith('api/')) {
      const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      const requiresAuthApi = path.startsWith('/api/documents/') || path.startsWith('/api/files/');
      const encodedPath = path
        .split('/')
        .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
        .join('/');
      return {
        url: `${SERVER_CONFIG.BACKEND_URL}${encodedPath}`,
        isApi: requiresAuthApi,
        apiPath: requiresAuthApi ? encodedPath : undefined,
      };
    }
    if (trimmed.startsWith('/')) {
      return { url: `${SERVER_CONFIG.BACKEND_URL}${trimmed}`, isApi: false };
    }
    const encoded = encodePathSegments(trimmed);
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
  if (doc && typeof doc === 'string') {
    doc = { path: doc, filename: doc, originalName: doc.split(/[\\/]/).pop() };
  }

  const { url, isApi, apiPath } = buildDocumentUrl(doc);

  if (!url) {
    toast?.error?.('File not available');
    return;
  }

  const showPreviewOverlay = (resourceUrl, { revoke, title } = {}) => {
    const doc = window.document;
    const existingOverlay = doc.getElementById('document-preview-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlay = doc.createElement('div');
    overlay.id = 'document-preview-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 24px;
    `;

    const container = doc.createElement('div');
    container.style.cssText = `
      position: relative;
      width: 100%;
      max-width: 960px;
      height: 100%;
      max-height: 90vh;
      background: #0f172a;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(30, 41, 59, 0.65);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.25);
    `;

    const header = doc.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(30, 41, 59, 0.85);
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      color: #e2e8f0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;
    header.innerHTML = `
      <span style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
        Document Preview${title ? ` · ${title}` : ''}
      </span>
    `;

    const closeButton = doc.createElement('button');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close preview');
    closeButton.style.cssText = `
      background: rgba(100, 116, 139, 0.2);
      border: 1px solid rgba(148, 163, 184, 0.25);
      color: #e2e8f0;
      border-radius: 9999px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(148, 163, 184, 0.35)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(100, 116, 139, 0.2)';
    });
    header.appendChild(closeButton);

    const frame = doc.createElement('iframe');
    frame.src = resourceUrl;
    frame.setAttribute('title', 'Document preview');
    frame.style.cssText = `
      flex: 1;
      border: none;
      background: #fff;
    `;

    const footer = doc.createElement('div');
    footer.style.cssText = `
      padding: 12px 16px;
      background: rgba(30, 41, 59, 0.85);
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;
    footer.innerHTML = `
      <span style="color: rgba(226, 232, 240, 0.75); font-size: 12px;">
        Press <strong>Esc</strong> or click outside to close
      </span>
      <a href="${resourceUrl}" target="_blank" rel="noopener noreferrer"
        style="
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #38bdf8;
        ">
        Open in New Tab
      </a>
    `;

    container.appendChild(header);
    container.appendChild(frame);
    container.appendChild(footer);
    overlay.appendChild(container);
    doc.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
      doc.removeEventListener('keydown', handleKeydown);
      if (revoke) {
        setTimeout(() => revoke(), 60 * 1000);
      }
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        cleanup();
      }
    };

    closeButton.addEventListener('click', cleanup);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup();
      }
    });
    doc.addEventListener('keydown', handleKeydown);
  };

  const tryOpenViaApi = async (path) => {
    try {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const backendBase = (SERVER_CONFIG.BACKEND_URL || '').replace(/\/+$/, '');
      const requestUrl = normalizedPath.startsWith('http')
        ? normalizedPath
        : `${backendBase}${normalizedPath}`;

      const response = await API.get(requestUrl, {
        responseType: 'blob',
        preserveAuthOn401: true,
      });
      const contentType = response.headers['content-type'] || 'application/pdf';
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });
      const blobUrl = window.URL.createObjectURL(blob);
      showPreviewOverlay(blobUrl, {
        revoke: () => window.URL.revokeObjectURL(blobUrl),
        title: doc?.originalName || doc?.filename,
      });
      return true;
    } catch (apiError) {
      console.error('Error opening document via authenticated API request:', apiError);
      if (apiError?.response?.status === 401) {
        toast?.error?.('Session expired. Please log in again to access documents.');
        return true; // prevent fallback to avoid repeated errors
      }
      return false;
    }
  };

  const stripBackendPrefix = (targetUrl = '') => {
    if (!targetUrl) return null;
    const backendBase = (SERVER_CONFIG.BACKEND_URL || '').replace(/\/+$/, '');
    if (!backendBase) return null;
    if (!targetUrl.startsWith(backendBase)) return null;
    const remainder = targetUrl.substring(backendBase.length);
    return remainder.startsWith('/') ? remainder : `/${remainder}`;
  };

  if (!isApi) {
    const relativePath = stripBackendPrefix(url);
    if (relativePath) {
      const opened = await tryOpenViaApi(relativePath);
      if (opened) return;
    }

    showPreviewOverlay(url, { title: doc?.originalName || doc?.filename });
    return;
  }

  try {
    const normalizedApiPath = apiPath || stripBackendPrefix(url) || url;
    const pathWithSlash = normalizedApiPath.startsWith('/') ? normalizedApiPath : `/${normalizedApiPath}`;
    const opened = await tryOpenViaApi(pathWithSlash);
    if (opened) return;
    throw new Error('Failed to open via API helper');
  } catch (error) {
    console.error('Error opening document via API:', error);
    const fallbackUrl = buildLegacyFallbackUrl(doc);
    if (fallbackUrl) {
      const relativeFallbackPath = stripBackendPrefix(fallbackUrl);
      if (relativeFallbackPath) {
        const openedFallback = await tryOpenViaApi(relativeFallbackPath);
        if (openedFallback) return;
      }

      showPreviewOverlay(fallbackUrl, { title: doc?.originalName || doc?.filename });
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

