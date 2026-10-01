// Razorpay Checkout is loaded only when a payment flow needs it.
// This avoids loading checkout.js on normal marketing/public pages.

let loadPromise = null;

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayScript() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise(
    (resolve, reject) => {
      const existingScript =
        document.querySelector(
          `script[src="${RAZORPAY_SCRIPT_URL}"]`
        );

      if (existingScript) {
        if (window.Razorpay) {
          resolve(true);
          return;
        }

        const cleanup = () => {
          existingScript.removeEventListener(
            "load",
            handleLoad
          );

          existingScript.removeEventListener(
            "error",
            handleError
          );
        };

        const handleLoad = () => {
          cleanup();

          if (window.Razorpay) {
            resolve(true);
          } else {
            loadPromise = null;

            reject(
              new Error(
                "Razorpay checkout script loaded but Razorpay was not initialised."
              )
            );
          }
        };

        const handleError = () => {
          cleanup();

          loadPromise = null;

          reject(
            new Error(
              "Failed to load Razorpay checkout script."
            )
          );
        };

        existingScript.addEventListener(
          "load",
          handleLoad,
          {
            once: true,
          }
        );

        existingScript.addEventListener(
          "error",
          handleError,
          {
            once: true,
          }
        );

        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.src =
        RAZORPAY_SCRIPT_URL;

      script.async = true;

      script.onload = () => {
        if (window.Razorpay) {
          resolve(true);
        } else {
          loadPromise = null;

          reject(
            new Error(
              "Razorpay checkout script loaded but Razorpay was not initialised."
            )
          );
        }
      };

      script.onerror = () => {
        loadPromise = null;

        reject(
          new Error(
            "Failed to load Razorpay checkout script."
          )
        );
      };

      document.body.appendChild(
        script
      );
    }
  );

  return loadPromise;
}