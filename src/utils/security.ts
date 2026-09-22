/**
 * Comprehensive Security Utilities for Don Bosco Da Lat Catechism Management System
 * 
 * Includes:
 * 1. XSS / HTML Injection prevention (escapeHtml, sanitizeUrl)
 * 2. Input sanitization (sanitizeText, sanitizeNumber)
 * 3. Prototype pollution protection (cleanObject, safeJsonParse)
 * 4. Brute-force login rate limiting & temporary lockout
 * 5. Password security policy & validation
 */

/**
 * Escapes characters for safe inclusion in HTML strings to prevent XSS.
 */
export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes URLs to prevent javascript: or malicious protocol injection.
 */
export function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  // Allow safe web URLs and data image URLs
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }
  return '';
}

/**
 * Strips dangerous control characters and caps length to prevent buffer/DoS.
 */
export function sanitizeText(text: unknown, maxLength: number = 250): string {
  if (typeof text !== 'string') return '';
  // Remove ASCII control characters (0-31 except tab and newline), and trim
  const cleaned = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Safely parses and clamps numeric values.
 */
export function sanitizeNumber(
  val: unknown, 
  min: number = 0, 
  max: number = 10, 
  fallback: number = 0
): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100));
}

/**
 * Recursively removes prototype pollution keys: __proto__, constructor, prototype
 */
export function cleanObject<T>(item: T): T {
  if (item === null || typeof item !== 'object') {
    return item;
  }

  if (Array.isArray(item)) {
    return item.map(cleanObject) as unknown as T;
  }

  const output: Record<string, any> = {};
  for (const [key, value] of Object.entries(item)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    output[key] = cleanObject(value);
  }
  return output as T;
}

/**
 * Safe JSON parsing with prototype pollution stripping
 */
export function safeJsonParse<T>(jsonStr: string, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonStr);
    return cleanObject(parsed) as T;
  } catch {
    return fallback;
  }
}

/**
 * Password Policy Enforcement
 */
export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  message: string;
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      score: 1,
      message: 'Mật khẩu phải có tối thiểu 6 ký tự.'
    };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let message = 'Mật khẩu bảo mật tốt.';
  if (score < 2) {
    message = 'Mật khẩu yếu. Khuyến khích thêm chữ hoa, số hoặc ký tự đặc biệt.';
  } else if (score < 4) {
    message = 'Mật khẩu mức độ trung bình.';
  }

  return {
    isValid: password.length >= 6,
    score: Math.min(4, score),
    message
  };
}

/**
 * Login Rate Limiting & Brute-force Prevention Store
 */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds temporary lockout
const RATE_LIMIT_STORAGE_KEY = 'donbosco_auth_rate_limit';

interface RateLimitRecord {
  failedAttempts: number;
  lockoutUntil: number; // timestamp ms
}

export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  attemptsLeft: number;
}

export function getRateLimitStatus(): RateLimitStatus {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attempts: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
    
    const record: RateLimitRecord = JSON.parse(raw);
    const now = Date.now();
    const attempts = record.failedAttempts || 0;
    const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - attempts);
    
    if (record.lockoutUntil && record.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attempts, attemptsLeft: 0 };
    }
    
    return { isLocked: false, remainingSeconds: 0, attempts, attemptsLeft };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attempts: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }
}

export function recordFailedLoginAttempt(): RateLimitStatus {
  try {
    const current = getRateLimitStatus();
    const newAttempts = current.attempts + 1;
    const now = Date.now();

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = now + LOCKOUT_DURATION_MS;
      localStorage.setItem(
        RATE_LIMIT_STORAGE_KEY,
        JSON.stringify({ failedAttempts: newAttempts, lockoutUntil })
      );
      return {
        isLocked: true,
        remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        attempts: newAttempts,
        attemptsLeft: 0,
      };
    }

    localStorage.setItem(
      RATE_LIMIT_STORAGE_KEY,
      JSON.stringify({ failedAttempts: newAttempts, lockoutUntil: 0 })
    );

    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: newAttempts,
      attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts),
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attempts: 1, attemptsLeft: 3 };
  }
}

export function resetFailedLoginAttempts(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
