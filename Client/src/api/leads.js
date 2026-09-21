import axiosInstance from './axiosInstance';
import { API_URL } from '../config/env';

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1.6J: Lead API integration
 *
 * The existing CRM API methods continue to use axiosInstance because they
 * belong to authenticated employee/customer workflows.
 *
 * createWebsiteLead() is deliberately different:
 * - it is a public acquisition endpoint;
 * - it does not attach employee/customer Authorization headers;
 * - it reuses submissionId for safe idempotent retry;
 * - it only resolves successfully when the backend explicitly confirms
 *   persisted: true;
 * - it returns the trusted leadCreatedEventId generated from the persisted
 *   backend lead so browser/server conversion events can later deduplicate.
 */

const WEBSITE_LEAD_TIMEOUT_MS = 20 * 1000;
const WEBSITE_LEAD_MAX_ATTEMPTS = 2;
const WEBSITE_LEAD_RETRY_DELAY_MS = 750;

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createWebsiteLeadError(message, options = {}) {
  const error = new Error(message);

  error.code =
    options.code ||
    'WEBSITE_LEAD_SUBMISSION_FAILED';

  error.status =
    options.status ||
    0;

  error.details =
    Array.isArray(options.details)
      ? options.details
      : [];

  error.requestId =
    options.requestId ||
    null;

  error.retryable =
    options.retryable === true;

  return error;
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRetryableStatus(status) {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

async function submitWebsiteLeadOnce(leadData) {
  const controller =
    new AbortController();

  const timeoutId =
    window.setTimeout(() => {
      controller.abort();
    }, WEBSITE_LEAD_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_URL}/leads/website`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        /**
         * Public acquisition request.
         *
         * Do not attach employee/customer cookies or bearer tokens.
         */
        credentials: 'omit',

        signal:
          controller.signal,

        body:
          JSON.stringify(leadData)
      }
    );

    const body =
      await parseJsonSafely(
        response
      );

    if (!response.ok) {
      throw createWebsiteLeadError(
        body?.message ||
          `Lead submission failed with HTTP ${response.status}.`,
        {
          code:
            body?.errorCode ||
            'WEBSITE_LEAD_HTTP_ERROR',

          status:
            response.status,

          details:
            body?.details,

          requestId:
            body?.meta?.requestId,

          retryable:
            isRetryableStatus(
              response.status
            )
        }
      );
    }

    if (
      !body ||
      body.success !== true
    ) {
      throw createWebsiteLeadError(
        'Lead submission response was invalid.',
        {
          code:
            'WEBSITE_LEAD_INVALID_RESPONSE',

          status:
            response.status,

          requestId:
            body?.meta?.requestId,

          retryable:
            true
        }
      );
    }

    const data =
      body.data;

    /**
     * 100% Workable Engineering Standard:
     *
     * The UI must never treat an enquiry as successful unless the backend
     * explicitly confirms that the Lead is already persisted.
     */
    if (
      !data ||
      data.persisted !== true ||
      !data.leadId ||
      !data.leadCode ||
      !data.leadCreatedEventId
    ) {
      throw createWebsiteLeadError(
        'The server did not confirm durable lead persistence.',
        {
          code:
            'WEBSITE_LEAD_NOT_CONFIRMED',

          status:
            response.status,

          requestId:
            body?.meta?.requestId,

          retryable:
            true
        }
      );
    }

    return body;

  } catch (error) {
    if (
      error?.name ===
      'AbortError'
    ) {
      throw createWebsiteLeadError(
        'Lead submission timed out before confirmation. The same submission can be retried safely.',
        {
          code:
            'WEBSITE_LEAD_TIMEOUT',

          retryable:
            true
        }
      );
    }

    if (
      error?.code ===
      'WEBSITE_LEAD_SUBMISSION_FAILED' ||
      error?.code ===
      'WEBSITE_LEAD_HTTP_ERROR' ||
      error?.code ===
      'WEBSITE_LEAD_INVALID_RESPONSE' ||
      error?.code ===
      'WEBSITE_LEAD_NOT_CONFIRMED'
    ) {
      throw error;
    }

    /**
     * fetch() throws TypeError for common network/CORS failures.
     * Because submissionId is mandatory server-side, retrying the exact same
     * payload cannot create a second commercial opportunity accidentally.
     */
    throw createWebsiteLeadError(
      'Unable to confirm lead persistence because of a network error.',
      {
        code:
          'WEBSITE_LEAD_NETWORK_ERROR',

        retryable:
          true
      }
    );

  } finally {
    window.clearTimeout(
      timeoutId
    );
  }
}

async function submitWebsiteLeadWithRetry(leadData) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= WEBSITE_LEAD_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await submitWebsiteLeadOnce(
        leadData
      );
    } catch (error) {
      lastError = error;

      const canRetry =
        error?.retryable === true &&
        attempt < WEBSITE_LEAD_MAX_ATTEMPTS;

      if (!canRetry) {
        throw error;
      }

      await sleep(
        WEBSITE_LEAD_RETRY_DELAY_MS
      );
    }
  }

  throw lastError ||
    createWebsiteLeadError(
      'Lead submission failed.'
    );
}

async function updateWebsiteLeadProfileOnce(profileData) {
  const controller =
    new AbortController();

  const timeoutId =
    window.setTimeout(() => {
      controller.abort();
    }, WEBSITE_LEAD_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_URL}/leads/website/profile`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type': 'application/json'
        },

        /**
         * Public progressive-capture request.
         *
         * Do not attach employee/customer cookies or bearer tokens.
         * The backend matches the already-persisted Lead using the
         * immutable Lead ID + original submissionId pair.
         */
        credentials: 'omit',

        signal:
          controller.signal,

        body:
          JSON.stringify(profileData)
      }
    );

    const body =
      await parseJsonSafely(
        response
      );

    if (!response.ok) {
      throw createWebsiteLeadError(
        body?.message ||
          `Lead profile update failed with HTTP ${response.status}.`,
        {
          code:
            body?.errorCode ||
            'WEBSITE_LEAD_PROFILE_HTTP_ERROR',

          status:
            response.status,

          details:
            body?.details,

          requestId:
            body?.meta?.requestId,

          retryable:
            isRetryableStatus(
              response.status
            )
        }
      );
    }

    if (
      !body ||
      body.success !== true
    ) {
      throw createWebsiteLeadError(
        'Lead profile update response was invalid.',
        {
          code:
            'WEBSITE_LEAD_PROFILE_INVALID_RESPONSE',

          status:
            response.status,

          requestId:
            body?.meta?.requestId,

          retryable:
            true
        }
      );
    }

    const data =
      body.data;

    /**
     * The original Lead must remain the system of record.
     * Treat the profile update as successful only when the backend
     * confirms that same Lead is still persisted and updated.
     */
    if (
      !data ||
      data.persisted !== true ||
      data.profileUpdated !== true ||
      !data.leadId ||
      String(data.leadId) !==
        String(profileData.leadId)
    ) {
      throw createWebsiteLeadError(
        'The server did not confirm the progressive Lead profile update.',
        {
          code:
            'WEBSITE_LEAD_PROFILE_NOT_CONFIRMED',

          status:
            response.status,

          requestId:
            body?.meta?.requestId,

          retryable:
            true
        }
      );
    }

    return body;

  } catch (error) {
    if (
      error?.name ===
      'AbortError'
    ) {
      throw createWebsiteLeadError(
        'Lead profile update timed out before confirmation. The same update can be retried safely.',
        {
          code:
            'WEBSITE_LEAD_PROFILE_TIMEOUT',

          retryable:
            true
        }
      );
    }

    if (
      error?.code ===
        'WEBSITE_LEAD_PROFILE_HTTP_ERROR' ||
      error?.code ===
        'WEBSITE_LEAD_PROFILE_INVALID_RESPONSE' ||
      error?.code ===
        'WEBSITE_LEAD_PROFILE_NOT_CONFIRMED' ||
      error?.code ===
        'WEBSITE_LEAD_PROFILE_TIMEOUT'
    ) {
      throw error;
    }

    throw createWebsiteLeadError(
      'Unable to confirm the Lead profile update because of a network error.',
      {
        code:
          'WEBSITE_LEAD_PROFILE_NETWORK_ERROR',

        retryable:
          true
      }
    );

  } finally {
    window.clearTimeout(
      timeoutId
    );
  }
}

async function updateWebsiteLeadProfileWithRetry(
  profileData
) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= WEBSITE_LEAD_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await updateWebsiteLeadProfileOnce(
        profileData
      );
    } catch (error) {
      lastError = error;

      const canRetry =
        error?.retryable === true &&
        attempt <
          WEBSITE_LEAD_MAX_ATTEMPTS;

      if (!canRetry) {
        throw error;
      }

      await sleep(
        WEBSITE_LEAD_RETRY_DELAY_MS
      );
    }
  }

  throw lastError ||
    createWebsiteLeadError(
      'Lead profile update failed.',
      {
        code:
          'WEBSITE_LEAD_PROFILE_UPDATE_FAILED'
      }
    );
}

export const leadsApi = {
  /**
   * Existing chat/manual lead creation flow.
   * Preserved unchanged for current CRM/chat functionality.
   */
  async createLead(leadData) {
    const response = await axiosInstance.post(
      '/leads/from-chat',
      leadData
    );

    return response.data;
  },

  /**
   * Master DPR v4.0 public requirement-builder lead persistence.
   *
   * Required caller behavior:
   * - Generate submissionId once and keep the same value for retries.
   * - Do not show success until this method resolves.
   * - Read result.data.persisted === true.
   * - Reuse result.data.leadCreatedEventId for the browser-side canonical
   *   lead_created event.
   */
  async createWebsiteLead(leadData) {
    if (
      !leadData ||
      typeof leadData !== 'object' ||
      Array.isArray(leadData)
    ) {
      throw createWebsiteLeadError(
        'Website lead payload is required.',
        {
          code:
            'WEBSITE_LEAD_PAYLOAD_REQUIRED'
        }
      );
    }

    if (
      !leadData.submissionId ||
      !/^[a-zA-Z0-9_-]{8,128}$/.test(
        String(
          leadData.submissionId
        ).trim()
      )
    ) {
      throw createWebsiteLeadError(
        'A valid submissionId is required before sending the lead.',
        {
          code:
            'WEBSITE_LEAD_SUBMISSION_ID_REQUIRED'
        }
      );
    }

    return submitWebsiteLeadWithRetry(
      leadData
    );
  },

  /**
   * Master DPR v4.0 progressive capture.
   *
   * Call only AFTER createWebsiteLead() confirms persisted === true.
   * Name / Company / Email remain optional and update the same Lead.
   */
  async updateWebsiteLeadProfile(profileData) {
    if (
      !profileData ||
      typeof profileData !== 'object' ||
      Array.isArray(profileData)
    ) {
      throw createWebsiteLeadError(
        'Lead profile payload is required.',
        {
          code:
            'WEBSITE_LEAD_PROFILE_PAYLOAD_REQUIRED'
        }
      );
    }

    const leadId =
      String(
        profileData.leadId ||
        ''
      ).trim();

    const submissionId =
      String(
        profileData.submissionId ||
        ''
      ).trim();

    if (!leadId) {
      throw createWebsiteLeadError(
        'Persisted Lead ID is required.',
        {
          code:
            'WEBSITE_LEAD_ID_REQUIRED'
        }
      );
    }

    if (
      !submissionId ||
      !/^[a-zA-Z0-9_-]{8,128}$/.test(
        submissionId
      )
    ) {
      throw createWebsiteLeadError(
        'The original submissionId is required.',
        {
          code:
            'WEBSITE_LEAD_SUBMISSION_ID_REQUIRED'
        }
      );
    }

    const customerName =
      String(
        profileData.customerName ||
        profileData.name ||
        ''
      ).trim();

    const companyName =
      String(
        profileData.companyName ||
        profileData.company ||
        ''
      ).trim();

    const email =
      String(
        profileData.email ||
        ''
      ).trim();

    if (
      !customerName &&
      !companyName &&
      !email
    ) {
      throw createWebsiteLeadError(
        'Provide at least one optional profile field.',
        {
          code:
            'WEBSITE_LEAD_PROFILE_EMPTY'
        }
      );
    }

    return updateWebsiteLeadProfileWithRetry({
      leadId,
      submissionId,
      customerName,
      companyName,
      email
    });
  },

  async getLeads(params = {}) {
    const queryString =
      new URLSearchParams(
        params
      ).toString();

    const response =
      await axiosInstance.get(
        `/leads${
          queryString
            ? `?${queryString}`
            : ''
        }`
      );

    return response.data;
  },

  async getLeadById(id) {
    const response =
      await axiosInstance.get(
        `/leads/${id}`
      );

    return response.data;
  },

  async addActivity(
    leadId,
    activityData
  ) {
    const response =
      await axiosInstance.post(
        `/leads/${leadId}/activity`,
        activityData
      );

    return response.data;
  },

  async updateStage(
    leadId,
    stageData
  ) {
    const response =
      await axiosInstance.patch(
        `/leads/${leadId}/stage`,
        stageData
      );

    return response.data;
  },

  async updatePriority(
    leadId,
    priority,
    leadValue
  ) {
    const response =
      await axiosInstance.patch(
        `/leads/${leadId}/priority`,
        {
          priority,
          leadValue
        }
      );

    return response.data;
  },

  async assignLead(
    leadId,
    assignData
  ) {
    const response =
      await axiosInstance.post(
        `/leads/${leadId}/assign`,
        assignData
      );

    return response.data;
  },

  async deleteLead(leadId) {
    const response =
      await axiosInstance.delete(
        `/admin/leads/${leadId}`
      );

    return response.data;
  },

  async getDueReminders() {
    const response =
      await axiosInstance.get(
        '/leads/reminders/due'
      );

    return response.data;
  },

  async logWhatsAppActivity(
    leadId,
    message
  ) {
    const response =
      await axiosInstance.post(
        `/leads/${leadId}/log-whatsapp`,
        { message }
      );

    return response.data;
  },

  async sendEmailActivity(
    leadId,
    subject,
    body
  ) {
    const response =
      await axiosInstance.post(
        `/leads/${leadId}/send-email`,
        {
          subject,
          body
        }
      );

    return response.data;
  },

  async assignLeadsBulk(
    bulkData
  ) {
    const response =
      await axiosInstance.post(
        '/leads/assign',
        bulkData
      );

    return response.data;
  },

  async getLeadsCount(
    params = {}
  ) {
    const queryString =
      new URLSearchParams(
        params
      ).toString();

    const response =
      await axiosInstance.get(
        `/leads/count${
          queryString
            ? `?${queryString}`
            : ''
        }`
      );

    return response.data;
  },

  async bulkImportLeads(leads) {
    const response =
      await axiosInstance.post(
        '/leads/bulk-import',
        { leads }
      );

    return response.data;
  },

  async uploadCallRecording(
    formData
  ) {
    const response =
      await axiosInstance.post(
        '/leads/call-recordings',
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      );

    return response.data;
  },

  async getCallRecordings(
    params = {}
  ) {
    const queryString =
      new URLSearchParams(
        params
      ).toString();

    const response =
      await axiosInstance.get(
        `/leads/call-recordings${
          queryString
            ? `?${queryString}`
            : ''
        }`
      );

    return response.data;
  },

  async updateCallRecordingRemark(
    recordingId,
    managerRemark
  ) {
    const response =
      await axiosInstance.patch(
        `/leads/call-recordings/${recordingId}/remark`,
        { managerRemark }
      );

    return response.data;
  },

  async updateCallRecordingStatus(
    recordingId,
    status
  ) {
    const response =
      await axiosInstance.patch(
        `/leads/call-recordings/${recordingId}/status`,
        { status }
      );

    return response.data;
  },

  async uploadLOIDocument(
    leadId,
    formData
  ) {
    const response =
      await axiosInstance.post(
        `/leads/${leadId}/loi`,
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      );

    return response.data;
  }
};