import axios from "axios";

/*
 * Production backend
 *
 * All frontend API requests will use:
 * https://indiatradeoverseas-ito.onrender.com/api
 *
 * You can still override this during local development by
 * defining VITE_API_URL in your .env file.
 */
const API_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://indiatradeoverseas-ito.onrender.com/api";

const axiosInstance = axios.create({
  baseURL: API_URL.replace(/\/+$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * REQUEST INTERCEPTOR
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname
        : "";

    const requestUrl =
      config.url || "";

    /*
     * Safely read custom portal context.
     */
    const portalContext =
      config.headers?.["X-Portal-Context"] ||
      null;

    let isCustomerAction = false;

    /*
     * Customer / public actions
     */
    if (
      portalContext === "customer"
    ) {
      isCustomerAction = true;
    }

    /*
     * Admin / employee actions
     */
    else if (
      portalContext === "admin"
    ) {
      isCustomerAction = false;
    }

    /*
     * Automatically identify public/customer
     * endpoints.
     */
    else {
      isCustomerAction =
        currentPath.includes(
          "/prakriti"
        ) ||
        currentPath.includes(
          "/nashik-onion"
        ) ||
        currentPath.includes(
          "/coal"
        ) ||
        requestUrl.includes(
          "/distributors/verify-otp"
        ) ||
        requestUrl.includes(
          "/distributors/resend-otp"
        ) ||
        requestUrl.includes(
          "/distributors/status/"
        ) ||
        requestUrl.includes(
          "/distributors/payments/"
        ) ||
        requestUrl.includes(
          "/payments/ito-ads/"
        ) ||
        requestUrl.includes(
          "/onion-visitors"
        ) ||
        requestUrl.includes(
          "/coal-visitors"
        );
    }

    /*
     * Never send the internal portal-context
     * header to the backend.
     */
    if (
      config.headers?.["X-Portal-Context"]
    ) {
      delete config.headers[
        "X-Portal-Context"
      ];
    }

    /*
     * Authentication token.
     */
    let token = null;

    if (isCustomerAction) {
      token =
        typeof window !== "undefined"
          ? localStorage.getItem(
              "distributor_token"
            )
          : null;
    } else {
      token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;
    }

    /*
     * Attach Authorization header.
     */
    if (token) {
      if (
        config.headers &&
        typeof config.headers.set ===
          "function"
      ) {
        config.headers.set(
          "Authorization",
          `Bearer ${token}`
        );
      } else {
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${token}`,
        };
      }
    }

    /*
     * Device hash.
     */
    if (
      typeof window !== "undefined"
    ) {
      let deviceHash =
        localStorage.getItem(
          "deviceHash"
        );

      if (!deviceHash) {
        deviceHash =
          "dev_" +
          Math.random()
            .toString(36)
            .substring(2, 15) +
          Math.random()
            .toString(36)
            .substring(2, 15);

        localStorage.setItem(
          "deviceHash",
          deviceHash
        );
      }

      if (
        config.headers &&
        typeof config.headers.set ===
          "function"
      ) {
        config.headers.set(
          "x-device-hash",
          deviceHash
        );
      } else {
        config.headers = {
          ...(config.headers || {}),
          "x-device-hash": deviceHash,
        };
      }
    }

    /*
     * IMPORTANT:
     *
     * When FormData is used, browser must set
     * Content-Type including the multipart boundary.
     */
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      if (
        config.headers &&
        typeof config.headers.delete ===
          "function"
      ) {
        config.headers.delete(
          "Content-Type"
        );
      } else if (config.headers) {
        delete config.headers[
          "Content-Type"
        ];
      }
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

/*
 * RESPONSE INTERCEPTOR
 */
axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error.response?.status === 401
    ) {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname
          : "";

      const requestUrl =
        error.config?.url || "";

      /*
       * Never redirect/clear authentication
       * during customer/public purchasing flows.
       */
      const isCustomerFlow =
        currentPath.includes(
          "/prakriti"
        ) ||
        currentPath.includes(
          "/nashik-onion"
        ) ||
        currentPath.includes(
          "/coal"
        ) ||
        requestUrl.includes(
          "/onion-visitors"
        ) ||
        requestUrl.includes(
          "/coal-visitors"
        ) ||
        requestUrl.includes(
          "/distributors/payments/"
        );

      if (isCustomerFlow) {
        console.warn(
          "[Axios] 401 suppressed for customer/public flow:",
          requestUrl
        );

        return Promise.reject(error);
      }

      /*
       * Explicit suppression requested by caller.
       */
      if (
        error.config?._suppressAutoLogout
      ) {
        return Promise.reject(error);
      }

      const authPaths = [
        "/login",
        "/signup",
        "/client-login",
        "/employee-login",
        "/admin-login",
        "/client-signup",
        "/employee-signup",
        "/verify-email",
        "/forgot-password",
      ];

      if (
        authPaths.includes(
          currentPath
        ) ||
        currentPath.startsWith(
          "/verify-email"
        ) ||
        currentPath.startsWith(
          "/forgot-password"
        )
      ) {
        return Promise.reject(error);
      }

      /*
       * Only these endpoints prove that the
       * current authentication session is invalid.
       */
      const authVerifyEndpoints = [
        "/auth/me",
        "/employee/me",
        "/admin-auth/me",
      ];

      const isAuthVerifyCall =
        authVerifyEndpoints.some(
          (endpoint) =>
            requestUrl.includes(endpoint)
        );

      if (isAuthVerifyCall) {
        if (
          typeof window !==
          "undefined"
        ) {
          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          localStorage.removeItem(
            "isEmployeeAuth"
          );

          window.location.href =
            "/login";
        }
      } else {
        /*
         * Do not destroy an otherwise valid
         * admin/employee session because some
         * unrelated endpoint returned 401.
         */
        console.warn(
          `[Axios] 401 on non-auth endpoint "${requestUrl}" — suppressing auto-logout.`
        );
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;