import API from '../services/api';
import { SERVER_CONFIG } from '../config/environment';
import axios from 'axios';

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

  const tryOpenViaApi = async (path, isApiPath = true) => {
    try {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast?.error?.('Authentication required. Please log in again.');
        return false;
      }

      let response;
      
      if (isApiPath) {
        // For API paths, use relative path with API.get() to ensure baseURL and interceptors work
        // The API interceptor will automatically add the Authorization header
        // If path is a full URL, extract just the path portion
        let apiPath = normalizedPath;
        if (normalizedPath.startsWith('http')) {
          try {
            const url = new URL(normalizedPath);
            apiPath = url.pathname + url.search;
          } catch (e) {
            // If URL parsing fails, use the path as-is
            apiPath = normalizedPath;
          }
        }

        // Remove /api prefix if present, since API baseURL already includes /api
        if (apiPath.startsWith('/api/')) {
          apiPath = apiPath.substring(4); // Remove '/api' prefix
        }

        // Ensure the path starts with / for API.get()
        if (!apiPath.startsWith('/')) {
          apiPath = `/${apiPath}`;
        }

        // Use API.get() - the interceptor will add the token automatically
        // This ensures the request goes through the API instance with proper baseURL and interceptors
        // Always use API.get() for API paths to ensure proper authentication
        try {
          response = await API.get(apiPath, {
            responseType: 'blob',
            preserveAuthOn401: true,
          });
        } catch (apiGetError) {
          // If API.get() fails, re-throw to be handled by outer catch
          throw apiGetError;
        }
      } else {
        // For non-API paths (like /uploads/...), construct full URL and use axios directly
        // We need to explicitly add the token since we're not using the API instance
        const backendBase = (SERVER_CONFIG.BACKEND_URL || '').replace(/\/+$/, '');
        const fullUrl = normalizedPath.startsWith('http')
          ? normalizedPath
          : `${backendBase}${normalizedPath}`;

        // Use axios directly for non-API paths to avoid baseURL issues
        // Explicitly add token since we're bypassing the API interceptor
        response = await axios.get(fullUrl, {
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
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
      const status = apiError?.response?.status;
      if (status === 401) {
        toast?.error?.('Session expired. Please log in again to access documents.');
        return false; // Don't prevent fallback, but show error
      } else if (status === 403) {
        toast?.error?.('Access denied. You do not have permission to view this document.');
        return false;
      } else if (status === 404) {
        toast?.error?.('Document not found. The file may have been moved or deleted.');
        return false;
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
      // For non-API paths (like /uploads/...), pass isApiPath = false
      const opened = await tryOpenViaApi(relativePath, false);
      if (opened) return;
    }

    // Only fall back to direct URL loading for non-authenticated, non-API paths
    // (e.g., external URLs or public static files)
    if (url.startsWith('http') && !url.includes(SERVER_CONFIG.BACKEND_URL)) {
      showPreviewOverlay(url, { title: doc?.originalName || doc?.filename });
      return;
    } else {
      toast?.error?.('Unable to open document. The file may not be accessible.');
      return;
    }
  }

  try {
    // For API paths, always use the apiPath if available, otherwise construct from url
    let pathToUse = apiPath;
    if (!pathToUse) {
      const stripped = stripBackendPrefix(url);
      if (stripped) {
        pathToUse = stripped;
      } else if (url.startsWith('/api/')) {
        pathToUse = url;
      } else {
        pathToUse = url;
      }
    }
    
    const pathWithSlash = pathToUse.startsWith('/') ? pathToUse : `/${pathToUse}`;
    
    // Always use API.get() for API paths - never fall back to axios.get() for API endpoints
    const opened = await tryOpenViaApi(pathWithSlash, true);
    if (opened) return;
    
    // If the API path failed with 403, it's a permission issue - don't try fallback
    // The error message is already shown in tryOpenViaApi
    toast?.error?.(errorMessage || 'Unable to access document. Please check your permissions.');
  } catch (error) {
    console.error('Error opening document via API:', error);
    toast?.error?.(errorMessage || 'Failed to open document. Please try again.');
  }
};

export default {
  buildDocumentUrl,
  buildLegacyFallbackUrl,
  openDocumentWithFallback,
};

