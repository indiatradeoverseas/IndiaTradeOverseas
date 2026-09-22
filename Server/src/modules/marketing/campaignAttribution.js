// Resolve all observed identifiers together. Missing identifiers are never invented.
const text = value => String(value || '').trim();
function assessAttribution(attribution = {}, campaigns = []) {
  const observed = {
    utmCampaign: text(attribution.utmCampaign).toLowerCase(),
    utmContent: text(attribution.utmContent).toLowerCase(),
    campaignId: text(attribution.campaignId), adSetId: text(attribution.adSetId),
    adId: text(attribution.adId), creativeId: text(attribution.creativeId),
  };
  const candidates = campaigns.filter(c =>
    (observed.utmCampaign && observed.utmCampaign === c.utm?.campaign) ||
    (observed.campaignId && observed.campaignId === c.metaCampaignId) ||
    (observed.adSetId && observed.adSetId === c.metaAdSetId) ||
    (c.creatives || []).some(k => (observed.adId && k.metaAdId === observed.adId) || (observed.creativeId && k.metaCreativeId === observed.creativeId)));
  if (candidates.length !== 1) return { trusted: false, conflicts: [candidates.length ? 'AMBIGUOUS_CAMPAIGN' : 'UNMATCHED_CAMPAIGN'], creative: null };
  const campaign = candidates[0];
  const conflicts = [];
  if (observed.utmCampaign && (observed.utmCampaign !== campaign.utm?.campaign || text(attribution.utmSource).toLowerCase() !== 'facebook' || text(attribution.utmMedium).toLowerCase() !== 'paid_social')) conflicts.push('UTM_CONFLICT');
  for (const [key, field] of [['campaignId', 'metaCampaignId'], ['adSetId', 'metaAdSetId']]) {
    if (observed[key] && campaign[field] && observed[key] !== campaign[field]) conflicts.push(`${key}_CONFLICT`);
  }
  const creativeMatches = [];
  for (const [key, field] of [['utmContent', 'utmContent'], ['adId', 'metaAdId'], ['creativeId', 'metaCreativeId']]) {
    if (!observed[key]) continue;
    const rows = (campaign.creatives || []).filter(c => text(c[field]) === observed[key]);
    if (rows.length > 1) conflicts.push(`${key}_AMBIGUOUS`);
    if (!rows.length && (campaign.creatives || []).some(c => text(c[field]))) conflicts.push(`${key}_CONFLICT`);
    creativeMatches.push(...rows);
  }
  if (new Set(creativeMatches.map(c => c.utmContent)).size > 1) conflicts.push('CREATIVE_CONFLICT');
  return { trusted: !conflicts.length, campaign, creative: conflicts.length ? null : creativeMatches[0] || null, conflicts };
}
module.exports = { assessAttribution };
