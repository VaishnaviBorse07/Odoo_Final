// Razorpay order + verify — booking fee is mandatory when the class requires payment.
import api from '../api/axios.js';
import { payWithRazorpay } from './razorpayCheckout.js';

function bookingNumericId(booking) {
  return booking.id ?? booking.booking_id;
}

/**
 * @param {object} booking — row with id or booking_id and payment_status pending
 * @param {{ email?: string, description?: string }} meta
 */
export async function completeBookingPayment(booking, meta = {}) {
  const id = bookingNumericId(booking);
  const { data: ordRes } = await api.post(`/bookings/${id}/razorpay-order`);
  const o = ordRes.data;
  const key = o.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error('Payment gateway is not configured (missing key from server or VITE_RAZORPAY_KEY_ID).');
  }
  const resp = await payWithRazorpay({
    key,
    orderId: o.order_id,
    amount: o.amount,
    currency: o.currency,
    email: meta.email,
    description: meta.description
  });
  const { data: fin } = await api.post(`/bookings/${id}/razorpay-verify`, {
    razorpay_order_id: resp.razorpay_order_id,
    razorpay_payment_id: resp.razorpay_payment_id,
    razorpay_signature: resp.razorpay_signature
  });
  return fin.data;
}
