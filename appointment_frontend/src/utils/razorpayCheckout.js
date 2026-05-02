// Loads Razorpay Checkout and opens payment (UPI, cards, Google Pay via UPI, etc.).
function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

/**
 * @param {object} p
 * @param {string} p.key — Key ID from dashboard (same as VITE_RAZORPAY_KEY_ID)
 * @param {string} p.orderId — order_id from your backend
 * @param {number|string} p.amount — paise (from order)
 * @param {string} p.currency — INR
 * @param {string} [p.email]
 * @param {string} [p.description]
 * @returns {Promise<{ razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string }>}
 */
export function payWithRazorpay(p) {
  return loadRazorpayScript().then(
    () =>
      new Promise((resolve, reject) => {
        const options = {
          key: p.key,
          amount: String(p.amount),
          currency: p.currency || 'INR',
          name: 'ZenFlow',
          description: p.description || 'Yoga class booking',
          order_id: p.orderId,
          prefill: {
            email: p.email || ''
          },
          theme: { color: '#0F6E56' },
          handler(response) {
            resolve({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
          },
          modal: {
            ondismiss() {
              reject(new Error('Payment window closed'));
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (res) => {
          reject(new Error(res?.error?.description || 'Payment failed'));
        });
        rzp.open();
      })
  );
}
