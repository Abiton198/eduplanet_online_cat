// utils/examUploadUtils.js

/**
 * Supported MIME types mapped to their extension label.
 * Covers Windows (doc/docx), Linux/Ubuntu (odt + LibreOffice variants),
 * and universal PDF.
 */
export const ALLOWED_EXAM_TYPES = {
    // PDF
    'application/pdf': '.pdf',

    // Microsoft Word
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',

    // OpenDocument Text — LibreOffice / Ubuntu default
    'application/vnd.oasis.opendocument.text': '.odt',

    // Some Linux browsers report these MIME types for the same formats
    'application/x-vnd.oasis.opendocument.text': '.odt',
    'application/vnd.oasis.opendocument.text-template': '.ott',

    // LibreOffice sometimes saves .docx with this type
    'application/zip': '.docx',

    // Fallback — some browsers send this for unknown binary files
    'application/octet-stream': null, // extension check handles it
};

export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.odt', '.ott'];

// Used in the HTML file input's accept attribute
export const ACCEPT_STRING = [
    '.pdf',
    '.doc',
    '.docx',
    '.odt',
    '.ott',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/x-vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.text-template',
].join(',');

/**
 * Validates that a file is one of the allowed exam formats.
 * Checks MIME type first, then falls back to file extension —
 * Linux/Ubuntu browsers often report generic MIME types for ODT/DOCX.
 *
 * @param {File}   file  - the File object from the input
 * @param {string} label - display name used in the error message
 * @returns {string|null} error message, or null if valid
 */
export const validateExamFile = (file, label = 'File') => {
    if (!file) return `${label} is required.`;

    const ext = '.' + file.name.split('.').pop().toLowerCase();

    const validByMime = Object.prototype.hasOwnProperty.call(ALLOWED_EXAM_TYPES, file.type)
        && ALLOWED_EXAM_TYPES[file.type] !== null;

    // For 'application/octet-stream' or missing MIME, fall back to extension
    const validByExt = ALLOWED_EXTENSIONS.includes(ext);

    if (!validByMime && !validByExt) {
        return `${label} must be a PDF, DOC, DOCX, or ODT file. Got: "${file.name}"`;
    }

    if (file.size > 50 * 1024 * 1024) {
        return `${label} must be under 50 MB.`;
    }

    return null;
};

/**
 * Returns a clean uppercase label for the file format.
 * Derived from the extension, not the MIME type, for reliability on Linux.
 *
 * @param {File} file
 * @returns {string} e.g. "PDF", "DOCX", "ODT"
 */
export const getFileTypeLabel = (file) => {
    if (!file) return 'FILE';
    return file.name.split('.').pop().toUpperCase();
};

/**
 * Returns true if the file is an ODT or OTT (LibreOffice format).
 * Useful so the backend knows to run a LibreOffice conversion before AI extraction.
 *
 * @param {File} file
 * @returns {boolean}
 */
export const isOpenDocumentFormat = (file) => {
    if (!file) return false;
    const ext = file.name.split('.').pop().toLowerCase();
    return ['odt', 'ott'].includes(ext);
};