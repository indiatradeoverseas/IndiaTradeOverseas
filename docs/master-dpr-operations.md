# Master DPR operating and verification guide

This guide separates implementation from production activation and observed outcomes. No campaign was launched, account contacted, database backfilled, payment processed or production system changed by this task.

## Responsibility and production release

- Operations records real product/source/market/MOQ/economics/delivery facts, serviceability, quotation terms and fulfillment evidence. A normal campaign edit cannot confirm Operations inputs.
- Marketing records campaign identity, creative copy/assets, audience decisions, actual advertising statements and external delivery observations. An observation does not execute a Meta launch, stop or audience sync.
- Management approves markets/budgets/commercial decisions, customer account identity linkage and response policies. Scaling requires recorded evidence, ready pre-launch checks, observed qualified leads, actual spend/CPQL and explicit acceptance of economics.
- Sales owns response/follow-up, canonical lifecycle transitions, actual quotation sharing and WON/LOST decisions. A quote approval is not a quote sent. An uploaded payment proof is not payment received.
- Finance records actual revenue/profit and verifies payment or approved credit. Unknown money remains null; currencies remain separate. Gross profit is not inferred from revenue or campaign budget.
- IT verifies the release checklist, attribution, consent, persistence/recovery, access and reporting. Evidence includes an actual reference, factual notes, server timestamp and authenticated verifier.

Grant each staff member the appropriate existing CRM permissions as well as their department. In particular, Operations needs access to the relevant lead/quotation workspace; assignment and evidence access checks still apply. Customer Orders also has its own CRM navigation entry.

## Real configuration still required

Local inspection found the following integration values missing. Deployment secrets were not inspected. Secret values must stay in server environment/secret management; do not paste them into frontend configuration, Git, logs or reports.

| Exact current name | Purpose and where obtained | Blocking level | Development without it |
| --- | --- | --- | --- |
| `META_CAPI_ACCESS_TOKEN` | Dataset's Conversions API token from Meta Events Manager / authorized business integration | Production activation and live CAPI verification | Yes |
| `META_GRAPH_API_VERSION` | Supported Graph API version selected for the business Meta app; consult its dashboard/documentation | Production CAPI and Lead Ads requests | Yes; local tests use isolated fixtures |
| `META_CAPI_ENABLED` | Operator activation switch; set true only after approved configuration | Production activation | Yes; currently disabled |
| `META_CAPI_TEST_EVENT_CODE` | Events Manager Test Events code | Optional controlled provider verification; remove for normal production delivery | Yes |
| `META_LEAD_ADS_ENABLED` | Operator activation switch | Production Lead Ads activation | Yes; currently disabled |
| `META_LEAD_ADS_VERIFY_TOKEN` | Company-chosen webhook verification secret, entered identically in the Meta app webhook setup | Production webhook handshake | Yes |
| `META_LEAD_ADS_APP_SECRET` | App secret from Meta app settings | Production raw-body signature verification | Yes |
| `META_LEAD_ADS_PAGE_ACCESS_TOKEN` | Authorized Page access token with real lead-retrieval permissions | Production Graph lead fetch | Yes |
| `META_LEAD_ADS_PAGE_ID` | Actual subscribed business Page ID | Production Page validation | Yes |
| `META_LEAD_ADS_FORM_IDS` | Comma-separated actual Instant Form IDs from the Page/forms setup | Production allowlist for the explicit mapping | Yes |
| `META_LEAD_ADS_FIELD_MAP_JSON` | Canonical-to-exact-field mapping from the actual form's field data; at least `phone` | Production normalization; no custom names are guessed | Yes |
| `META_LEAD_ADS_PRIVACY_VERSION` | Company's approved privacy notice/version associated with that form | Production enquiry consent evidence | Yes |
| `META_LEAD_ADS_CONTACT_CONSENT_FIELD`, `META_LEAD_ADS_CONTACT_CONSENT_VALUE` | Exact separate enquiry-contact consent field and affirmative value from the approved form | Production form ingestion | Yes |
| `META_LEAD_ADS_MARKETING_CONSENT_FIELD`, `META_LEAD_ADS_MARKETING_CONSENT_VALUE` | Separate optional marketing permission mapping from the form | Optional; both required if this permission is used | Yes; absence means no permission |
| `META_LEAD_ADS_ANALYTICS_CONSENT_FIELD`, `META_LEAD_ADS_ANALYTICS_CONSENT_VALUE` | Separate optional analytics permission mapping from the form | Optional; both required if this permission is used | Yes |
| `META_LEAD_ADS_ADVERTISING_CONSENT_FIELD`, `META_LEAD_ADS_ADVERTISING_CONSENT_VALUE` | Separate optional advertising permission mapping from the form | Optional; needed for consented advertising measurement of those leads | Yes |

The supplied Pixel/Dataset ID and WhatsApp destination are already in `Server/src/config/publicBusiness.json`. Optional overrides are `META_PIXEL_ID` (server), `VITE_META_PIXEL_ID` (client) and `VITE_WHATSAPP_NUMBER` (client). They are not missing requirements. If overriding the dataset, keep client and server on the same dataset.

The existing GTM container is retained. GA4 is managed through that container; no GA4 measurement-ID environment variable is required by this code. The company's GTM/GA4 administrator must verify the actual tags and event mapping, consent behavior and real-property receipt. Remove any independently configured duplicate browser Pixel tag when using the application-owned Pixel. No provider verification was claimed from local tests. Attempts to read Meta's online documentation returned HTTP 429 during this task.

The DPR buyer WhatsApp path uses click-to-WhatsApp. No WABA ID, WhatsApp Phone Number ID, Cloud API token or template credential is required by this path. Existing unused mock notification helpers are not proof of provider delivery. CRM notifications/recovery are separate from executing a WhatsApp Cloud send.

`CRM_SYNC_MODE` defaults to the existing internal CRM. `CRM_SYNC_WEBHOOK_URL` and `CRM_SYNC_WEBHOOK_TOKEN` are needed only if the company chooses the existing optional external webhook adapter; they are not required to activate the internal CRM.

## Business inputs and evidence

Use the current governed forms/APIs, not environment variables, for:

- Campaign `marketSelection`: product, source, targetMarket type/name, minimumCommercialQuantity value/unit, materialEconomics, freightEconomics, expectedSellingRange, marginBand, deliveryCapability and priority. Values come from Operations. Its confirmation is a separate authenticated action.
- Campaign `managementBudget`: approved currency, amount and basis; approved market and commercial review come from Management. Planned budget is never actual spend.
- `creatives`, `campaignPromise`, landingPage, buyerContext, `utm.campaign`, creative `utmContent`, and real Meta campaign/ad-set/ad/creative IDs come from Marketing and the live Meta configuration.
- `actualPerformance`: real cumulative spend/currency/through date, optional real impressions/clicks, statement reference and notes. `observedDelivery` records a real RUNNING/PAUSED/STOPPED observation and its time; it does not control Meta.
- `releaseChecks` and pre-launch verification need actual device, tracking, CRM, attribution, consent, commercial and recovery evidence. Do not populate these with this report or a button click as a substitute for the check.
- Lead serviceability review needs actual status, Operations market priority if known, evidence and notes. Campaign targeting alone does not establish buyer serviceability.
- Sales policy needs Management-approved hot/warm response minutes, nurture follow-up days, elapsed-time basis and a reference. No thresholds were invented. Business-hours SLA interpretation is not asserted by the elapsed-time policy.
- Quotation `commercialTerms` needs actual product/source/destination, quantity/unit, currency/unitPrice/freight/tax, delivery/payment terms, validUntil and Operations evidence. Management approval must match the confirmed total. Shared quotations require a new revision for changed terms.
- Customer account linkage needs an actual account ID/type and identity-verification reference. Matching an unverified email does not grant portal access.
- Order acceptance/PO, Finance payment/credit evidence, Operations fulfillment/document links, Sales WON/LOST and actual lead `commercialOutcome` remain human/business inputs. Secure external document URLs must be customer-accessible and appropriately protected by the company's document system.

## Local and live verification

Run server regressions with `node --test scripts/masterDpr.regression.test.js` from `Server`. Run `npm run build` from `Client`. Where Puppeteer's bundled browser is absent, set `PUPPETEER_EXECUTABLE_PATH` to the installed Chrome executable. The build must report prerender failure rather than silently claiming success.

`Client/scripts/master-dpr-browser-check.mjs` serves the local build and blocks all external requests. Its lead response is a local fixture. It tests browser behavior, not MongoDB durability or Meta delivery.

Before production activation, use a non-production database and real provider test facilities to verify signed webhook delivery/retries, actual form mappings, exact consent records, duplicate lead delivery, CRM queue recovery, quote approval/PDF/customer isolation, account relinking, Finance/Operations separation, and purchase/repeat-order analytics retry. Do not run fixture tests against the production database.

Test Android/iPhone layouts, loading speed and accessibility on representative devices. Verify browser Pixel/CAPI Event IDs in Events Manager, dataset receipt and deduplication, and GA4 canonical events. Verify existing GTM tags respect revoked/denied consent. A local script queue is not a provider receipt.

## Privacy, backup, retention and incident operations

- Keep HTTPS and the intended CORS origins configured in production. Internal writes use authenticated Bearer tokens; do not introduce ambient cookie authentication without CSRF protection. Never expose server credentials through Vite variables.
- Preserve encrypted lead contact fields and masked CRM display/access rules. Do not place form PII or tokens in logging, evidence references, analytics or public URLs. Audit entries use governed actions; report exports contain aggregate data.
- Management must approve data-retention periods and legal/business holds. Until those real decisions exist, do not invent a TTL or delete records. Handle access/correction/withdrawal/deletion requests through authenticated ownership review and the company's privacy contact; retain only legitimately required evidence.
- The database/hosting owner must configure production backups, access restrictions, recovery objectives and storage location. Restore into an isolated environment and verify lead/contact/quotation/order relationships and recovery queues. Record the actual restore-drill reference in release evidence. This code task did not configure infrastructure or run a production backup/restore.
- Assign incident ownership and escalation contacts. On suspected exposure, restrict the affected integration/access, preserve audit evidence, rotate the affected real credentials, investigate scope, and perform legally required notifications with company/legal approval. Do not log or paste secrets while investigating.

## Outcome boundaries

Implementation, configuration, pre-launch readiness, observed traffic and outcomes are distinct. Phase 4 exits only when real qualified leads are observed. Phase 5 needs actual acceptable economics and controlled optimization evidence. Later phases need real channel performance, approved commercial operation and customer adoption. This implementation does not establish any of those outcomes.
