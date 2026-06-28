/**
 * Utility functions for input validation and sanitization.
 */

/**
 * Validates an email address.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates Egyptian phone numbers.
 * Supports:
 * - 01xxxxxxxx (11 digits starting with 010, 011, 012, or 015)
 * - +201xxxxxxxx (with country code)
 * - 201xxxxxxxx (with country code, no plus)
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const egPhoneRegex = /^(?:\+?20|0)?1[0125]\d{8}$/;
  return egPhoneRegex.test(cleanPhone);
}

/**
 * Format Egyptian phone number to standard local 11-digit or +20 international format.
 */
export function formatEgyptianPhone(phone: string, international = false): string {
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleanPhone.startsWith('+20')) {
    cleanPhone = cleanPhone.substring(3);
  } else if (cleanPhone.startsWith('20') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.substring(2);
  } else if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }

  return international ? `+20${cleanPhone}` : `0${cleanPhone}`;
}

/**
 * Basic HTML sanitization to prevent XSS (Cross Site Scripting).
 * Escapes characters like <, >, &, ", '
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates order item inputs.
 */
export function isValidOrderItem(item: any): boolean {
  return (
    item &&
    typeof item.productId === 'string' &&
    typeof item.productNameEn === 'string' &&
    typeof item.productNameAr === 'string' &&
    ['SINGLE', 'DOUBLE', 'TRIPLE', 'SMALL', 'MEDIUM', 'LARGE', 'FAMILY', 'NONE'].includes(item.size) &&
    typeof item.quantity === 'number' &&
    item.quantity > 0 &&
    typeof item.price === 'number' &&
    item.price >= 0
  );
}

/**
 * Validates checkouts or orders inputs.
 */
export function validateOrderPayload(body: any): { isValid: boolean; error?: string } {
  if (!body) {
    return { isValid: false, error: 'Request body is empty' };
  }

  const { userName, userPhone, type, address, paymentMethod, total, items } = body;

  if (!userName || typeof userName !== 'string' || userName.trim().length < 2) {
    return { isValid: false, error: 'Invalid name (must be at least 2 characters)' };
  }

  if (!userPhone || !isValidEgyptianPhone(userPhone)) {
    return { isValid: false, error: 'Invalid Egyptian phone number' };
  }

  if (!['DELIVERY', 'PICKUP'].includes(type)) {
    return { isValid: false, error: 'Invalid order type (DELIVERY or PICKUP)' };
  }

  if (type === 'DELIVERY' && (!address || typeof address !== 'string' || address.trim().length < 5)) {
    return { isValid: false, error: 'Invalid delivery address (must be at least 5 characters)' };
  }

  if (!['COD', 'FAWRY', 'CARD'].includes(paymentMethod)) {
    return { isValid: false, error: 'Invalid payment method (COD, FAWRY, or CARD)' };
  }

  if (typeof total !== 'number' || total <= 0) {
    return { isValid: false, error: 'Total order amount must be greater than 0' };
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'Order must contain at least one menu item' };
  }

  for (let i = 0; i < items.length; i++) {
    if (!isValidOrderItem(items[i])) {
      return { isValid: false, error: `Invalid item details at index ${i}` };
    }
  }

  return { isValid: true };
}
