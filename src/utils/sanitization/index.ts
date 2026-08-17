/**
 * Sanitization Utilities
 * Prevents XSS attacks by sanitizing user input
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * Removes dangerous tags and attributes
 */
export const sanitizeHtml = (input: string): string => {
  if (!input) return '';
  
  // Create a temporary DOM element
  const div = document.createElement('div');
  div.textContent = input;
  
  return div.innerHTML;
};

/**
 * Sanitize object properties recursively
 * Removes dangerous content from all string fields
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }
  
  return sanitized as T;
};

/**
 * Escape special characters for safe HTML rendering
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Validate and sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Remove potentially dangerous URL protocols
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '#';
    }
    
    return url;
  } catch {
    return '#';
  }
};

/**
 * Sanitize text content (remove extra whitespace, trim)
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
};
