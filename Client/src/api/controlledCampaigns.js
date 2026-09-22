import axiosInstance from './axiosInstance';

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.26: Controlled campaign client API
 *
 * Purpose:
 * Provide the authenticated internal UI with one governed client interface
 * for the Phase 4 controlled Stone campaign workflow.
 *
 * This module only calls existing backend endpoints. It does NOT:
 * - choose a market/product;
 * - invent commercial inputs;
 * - launch Meta ads;
 * - create fake performance results;
 * - mark Phase 4 complete.
 */

const BASE_PATH =
  '/marketing/controlled-campaigns';

function requireCampaignId(campaignId) {
  const value =
    String(
      campaignId || ''
    ).trim();

  if (!value) {
    throw new Error(
      'campaignId is required.'
    );
  }

  return encodeURIComponent(
    value
  );
}

export const controlledCampaignApi = {
  async list(params = {}) {
    const response =
      await axiosInstance.get(
        BASE_PATH,
        {
          params,
        }
      );

    return response.data;
  },

  async get(campaignId) {
    const id =
      requireCampaignId(
        campaignId
      );

    const response =
      await axiosInstance.get(
        `${BASE_PATH}/${id}`
      );

    return response.data;
  },

  async create(payload) {
    const response =
      await axiosInstance.post(
        BASE_PATH,
        payload
      );

    return response.data;
  },

  async update(
    campaignId,
    payload
  ) {
    const id =
      requireCampaignId(
        campaignId
      );

    const response =
      await axiosInstance.patch(
        `${BASE_PATH}/${id}`,
        payload
      );

    return response.data;
  },

  async confirmOperationsInputs(
    campaignId
  ) {
    const id =
      requireCampaignId(
        campaignId
      );

    const response =
      await axiosInstance.patch(
        `${BASE_PATH}/${id}/operations-confirmation`
      );

    return response.data;
  },

  async recordManagementApproval(
    campaignId, payload
  ) {
    const id =
      requireCampaignId(
        campaignId
      );

    const response =
      await axiosInstance.patch(
        `${BASE_PATH}/${id}/management-approval`, payload
      );

    return response.data;
  },

  async getMetrics(campaignId) {
    const id =
      requireCampaignId(
        campaignId
      );

    const response =
      await axiosInstance.get(
        `${BASE_PATH}/${id}/metrics`
      );

    return response.data;
  },

  async getAudienceReview(
    campaignId
  ) {
    const id =
      requireCampaignId(
        campaignId
      );

    const response =
      await axiosInstance.get(
        `${BASE_PATH}/${id}/audience-review`
      );

    return response.data;
  },

  async getPrelaunchReview(
    campaignId
  ) {
    const id =
      requireCampaignId(
        campaignId
      );

    const response =
      await axiosInstance.get(
        `${BASE_PATH}/${id}/prelaunch-review`
      );

    return response.data;
  },
};

export default controlledCampaignApi;
