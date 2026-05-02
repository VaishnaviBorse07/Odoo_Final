// Mock pay or Razorpay order + verify — returns updated booking object from API data.
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
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) {
    const { data } = await api.put(`/bookings/${id}/pay`, {});
    return data.data;
  }
  const { data: ordRes } = await api.post(`/bookings/${id}/razorpay-order`);
  const o = ordRes.data;
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
