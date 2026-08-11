// Razorpay's checkout.js used to be loaded unconditionally in index.html on
// every single page (including marketing pages with no payment flow at
// all). It's only ever needed on Stone/Rice/Prakriti's order checkout, so
// it's loaded on demand instead, right before a payment is opened.
let loadPromise = null;

export function loadRazorpayScript() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Razorpay checkout script.'));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
