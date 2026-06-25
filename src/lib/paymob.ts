import crypto from 'crypto';

interface BillingData {
  apartment?: string;
  email?: string;
  floor?: string;
  first_name?: string;
  street?: string;
  building?: string;
  phone_number?: string;
  shipping_method?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  last_name?: string;
  state?: string;
}

export function isMockMode(): boolean {
  const apiKey = process.env.PAYMOB_API_KEY;
  return !apiKey || apiKey === 'your-paymob-api-key' || apiKey.includes('your-paymob-api-key-here');
}

/**
 * Step 1: Authenticate with Paymob to get auth token
 */
export async function getAuthToken(): Promise<string> {
  if (isMockMode()) {
    console.warn('[Paymob Mock] Simulating getAuthToken');
    return 'mock-auth-token-12345';
  }

  const apiKey = process.env.PAYMOB_API_KEY;
  const response = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Paymob authentication failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Step 2: Register order in Paymob
 */
export async function createPaymobOrder(
  authToken: string,
  amountCents: number,
  merchantOrderId: string,
  currency: string = 'EGP'
): Promise<number> {
  if (isMockMode()) {
    console.warn('[Paymob Mock] Simulating createPaymobOrder for merchant order ID:', merchantOrderId);
    return Math.floor(100000 + Math.random() * 900000);
  }

  const response = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency,
      merchant_order_id: merchantOrderId,
      items: [],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Paymob order creation failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Step 3: Request payment key
 */
export async function getPaymentKey(
  authToken: string,
  paymobOrderId: number,
  amountCents: number,
  integrationId: number,
  billingData: BillingData,
  currency: string = 'EGP'
): Promise<string> {
  if (isMockMode()) {
    console.warn('[Paymob Mock] Simulating getPaymentKey for Paymob order ID:', paymobOrderId);
    return 'mock-payment-key-67890';
  }

  const defaultBilling = {
    apartment: 'NA',
    email: 'customer@dodz.com',
    floor: 'NA',
    first_name: 'Dodz',
    street: 'NA',
    building: 'NA',
    phone_number: '+20100000000',
    shipping_method: 'PKG',
    postal_code: 'NA',
    city: 'Cairo',
    country: 'EG',
    last_name: 'Customer',
    state: 'Cairo',
  };

  const response = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: paymobOrderId.toString(),
      billing_data: { ...defaultBilling, ...billingData },
      currency,
      integration_id: integrationId,
      lock_order_to_profile: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Paymob payment key request failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Step 4 (Fawry only): Execute payment to get Fawry reference code
 */
export async function payWithFawry(
  paymentKey: string,
  phoneNumber: string
): Promise<{ bill_reference: string; id: number }> {
  if (isMockMode()) {
    console.warn('[Paymob Mock] Simulating Fawry payment execution');
    return {
      bill_reference: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      id: Math.floor(1000000 + Math.random() * 9000000),
    };
  }

  const response = await fetch('https://accept.paymob.com/api/acceptance/payments/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: {
        identifier: phoneNumber,
        subtype: 'FAWRY',
      },
      payment_token: paymentKey,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Paymob Fawry payment execution failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return {
    bill_reference: data.data.bill_reference,
    id: data.id,
  };
}

/**
 * Verify Paymob HMAC signature on webhooks
 */
export function verifyHmac(hmacReceived: string, obj: any): boolean {
  if (isMockMode()) {
    // In mock mode, we accept webhook simulator requests or simple tests
    console.warn('[Paymob Mock] Bypassing HMAC verification in Mock mode');
    return true;
  }

  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  if (!hmacSecret) {
    console.error('PAYMOB_HMAC_SECRET environment variable is missing.');
    return false;
  }

  try {
    const amount_cents = String(obj.amount_cents || '');
    const created_at = String(obj.created_at || '');
    const currency = String(obj.currency || '');
    const error_occured = String(obj.error_occured ?? '');
    const has_parent_transaction = String(obj.has_parent_transaction ?? '');
    const id = String(obj.id || '');
    const integration_id = String(obj.integration_id || '');
    const is_3d_secure = String(obj.is_3d_secure ?? '');
    const is_auth = String(obj.is_auth ?? '');
    const is_capture = String(obj.is_capture ?? '');
    const is_void = String(obj.is_void ?? '');
    const is_void_refund = String(obj.is_void_refund ?? '');
    const owner = String(obj.owner || '');
    const pending = String(obj.pending ?? '');
    const source_data_pan = String(obj.source_data?.pan || '');
    const source_data_sub_type = String(obj.source_data?.sub_type || '');
    const source_data_type = String(obj.source_data?.type || '');
    const success = String(obj.success ?? '');

    const concatString =
      amount_cents +
      created_at +
      currency +
      error_occured +
      has_parent_transaction +
      id +
      integration_id +
      is_3d_secure +
      is_auth +
      is_capture +
      is_void +
      is_void_refund +
      owner +
      pending +
      source_data_pan +
      source_data_sub_type +
      source_data_type +
      success;

    const computedHmac = crypto
      .createHmac('sha512', hmacSecret)
      .update(concatString)
      .digest('hex');

    return computedHmac === hmacReceived;
  } catch (error) {
    console.error('Error verifying HMAC signature:', error);
    return false;
  }
}
