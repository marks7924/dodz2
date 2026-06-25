'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

function MockIframeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') || 'ord-test';
  const amount = searchParams.get('amount') || '150';

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSimulatePayment = async (success: boolean) => {
    setLoading(true);

    const mockTransactionPayload = {
      type: 'TRANSACTION',
      obj: {
        id: Math.floor(10000000 + Math.random() * 90000000),
        success: success,
        pending: false,
        amount_cents: Math.round(Number(amount) * 100),
        currency: 'EGP',
        error_occured: !success,
        has_parent_transaction: false,
        integration_id: 123456,
        owner: 76543,
        created_at: new Date().toISOString(),
        order: {
          id: Math.floor(100000 + Math.random() * 900000),
          merchant_order_id: orderId,
        },
        source_data: {
          pan: cardNumber ? `xxxx-xxxx-xxxx-${cardNumber.slice(-4)}` : '5123-xxxx-xxxx-4321',
          sub_type: 'card',
          type: 'card',
        },
      },
    };

    try {
      // Trigger Webhook API route locally to simulate Paymob callback
      const webhookRes = await fetch(`/api/payment/webhook?hmac=mock-hmac`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockTransactionPayload),
      });

      if (!webhookRes.ok) {
        console.error('Webhook execution failed:', await webhookRes.text());
      }
    } catch (err) {
      console.error('Failed to notify local webhook:', err);
    }

    setLoading(false);

    if (success) {
      router.push(`/payment/success?orderId=${orderId}`);
    } else {
      router.push(`/payment/failure?orderId=${orderId}`);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-2xl p-6 text-left space-y-4 shadow-xl text-white font-sans">
      <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-extrabold uppercase tracking-wide">Paymob Simulator</h2>
        </div>
        <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded uppercase">
          Sandbox Mode
        </span>
      </div>

      <div className="bg-[#0E0E10] border border-[#27272A] rounded-xl p-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-[#A1A1AA]">Order ID:</span>
          <span className="font-mono font-bold text-white">{orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#A1A1AA]">Total Amount:</span>
          <span className="font-mono font-bold text-amber-500">{amount} EGP</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-[#A1A1AA] uppercase font-bold block mb-1">Cardholder Name</label>
          <input
            type="text"
            placeholder="e.g. Ahmed Aly"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            disabled={loading}
            className="w-full text-xs bg-[#0E0E10] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder:text-[#3F3F46] focus:outline-none focus:border-[#E11D48]"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#A1A1AA] uppercase font-bold block mb-1">Card Number</label>
          <input
            type="text"
            placeholder="4000 1234 5678 9010"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
            disabled={loading}
            className="w-full text-xs bg-[#0E0E10] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder:text-[#3F3F46] focus:outline-none focus:border-[#E11D48] font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase font-bold block mb-1">Expiration</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
              disabled={loading}
              className="w-full text-xs bg-[#0E0E10] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder:text-[#3F3F46] focus:outline-none focus:border-[#E11D48] font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase font-bold block mb-1">CVV</label>
            <input
              type="password"
              placeholder="•••"
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
              disabled={loading}
              className="w-full text-xs bg-[#0E0E10] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder:text-[#3F3F46] focus:outline-none focus:border-[#E11D48] font-mono"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-[#27272A]">
        <button
          onClick={() => handleSimulatePayment(true)}
          disabled={loading}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Simulate Success</span>
        </button>
        <button
          onClick={() => handleSimulatePayment(false)}
          disabled={loading}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          <span>Simulate Failure</span>
        </button>
      </div>

      <div className="flex items-center gap-1 text-[9px] text-[#A1A1AA] justify-center bg-[#0E0E10] p-1.5 rounded-lg border border-[#27272A] border-dashed">
        <ShieldAlert className="h-3 w-3 text-amber-500" />
        <span>For local development testing purposes only. No actual funds are charged.</span>
      </div>
    </div>
  );
}

export default function MockIframePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-white text-xs font-bold">Loading Paymob Gateway...</div>
      }>
        <MockIframeContent />
      </Suspense>
    </div>
  );
}
