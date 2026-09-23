const RELEASE_CHECKS = Object.freeze([
  'REAL_LANDING_URL', 'UTM_PERSISTENCE', 'ANDROID_LAYOUT', 'IPHONE_LAYOUT',
  'MOBILE_SPEED', 'PUBLIC_PRODUCT_CONTENT', 'REQUIREMENT_BUILDER', 'PRODUCT_EVENT',
  'QUANTITY_EVENT', 'DESTINATION_VALIDATION', 'TIMELINE_SELECTION', 'ELIGIBILITY',
  'SOFT_GATE_TIMING', 'CONSENT_PRIVACY_LINK', 'PHONE_VALIDATION', 'PERSIST_BEFORE_SUCCESS',
  'UNIQUE_LEAD_ID', 'CRM_SYNC', 'CRM_OUTAGE_RETRY', 'SALES_NOTIFICATION',
  'WHATSAPP_CONTINUATION', 'GA4_EVENTS', 'META_PIXEL_EVENTS', 'META_CAPI_EVENTS',
  'PIXEL_CAPI_DEDUPLICATION', 'DASHBOARD_ATTRIBUTION', 'QUALIFIED_STATUS',
  'QUOTATION_FLOW', 'WON_LOST_FLOW', 'MANDATORY_LOST_REASON', 'CONTACT_RESOLUTION',
  'BACKUP_RECOVERY', 'LEAD_SCORING',
]);
const isManagement = user => ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN'].includes(String(user?.role || '').toUpperCase()) || ['ADMIN', 'MANAGEMENT'].includes(String(user?.department || '').toUpperCase());
const department = (user, value) => String(user?.department || '').toUpperCase() === value;
const actor = user => user?.employeeDbId || user?._id;
function releaseBlockers(campaign) {
  return RELEASE_CHECKS.filter(key => !(campaign.releaseChecks || []).some(c => c.key === key && c.verifiedAt && c.verifiedBy && c.reference && c.notes));
}
module.exports = { RELEASE_CHECKS, isManagement, department, actor, releaseBlockers };
