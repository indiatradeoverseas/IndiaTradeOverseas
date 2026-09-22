import React, {
  useState
} from 'react';

import {
  leadsApi
} from '../api/leads';

import {
  getAnalyticsConsent,
  getFirstPartyAttribution,
  pushDprEvent,
  DPR_EVENTS
} from '../utils/analytics';


export default function QuickEnquiry() {

  const [
    form,
    setForm
  ] = useState({
    productCategory: '',
    product: '',
    destination: '',
    phone: '',
    contact: false
  });

  const [
    submissionId
  ] = useState(
    () => crypto.randomUUID()
  );

  const [
    message,
    setMessage
  ] = useState('');

  const [
    busy,
    setBusy
  ] = useState(false);

  const [
    saved,
    setSaved
  ] = useState(false);


  async function submit(event) {

    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setMessage('');


    try {

      const consent =
        getAnalyticsConsent();

      const attribution =
        getFirstPartyAttribution();


      const response =
        await leadsApi.createWebsiteLead({
          ...form,

          captureMode:
            'QUICK',

          submissionId,

          consent: {
            contactAllowed:
              form.contact === true,

            marketingAllowed:
              false,

            analyticsAllowed:
              consent.analytics === true,

            advertisingAllowed:
              consent.advertising === true,

            privacyVersion:
              'privacy-policy-2026-09'
          },

          attribution
        });


      const lead =
        response?.data;


      if (
        !lead?.persisted ||
        !lead?.leadId ||
        !lead?.leadCode
      ) {
        throw new Error(
          'Persistence not confirmed. Please retry.'
        );
      }


      pushDprEvent(
        DPR_EVENTS.LEAD_CREATED,
        {
          product_category:
            form.productCategory,

          lead_id:
            lead.leadCode,

          submission_id:
            submissionId,

          capture_mode:
            'QUICK'
        },
        {
          eventId:
            lead.leadCreatedEventId
        }
      );


      setMessage(
        `Enquiry saved: ${lead.leadCode}. Sales will confirm the remaining requirement details.`
      );

      setSaved(true);

    } catch (error) {

      setMessage(
        error?.message ||
        'Unable to save your enquiry. Please retry.'
      );

    } finally {

      setBusy(false);
    }
  }


  return (
    <section
      id="quick-enquiry"
      className="max-w-3xl mx-auto px-6 py-12"
    >

      <h2 className="text-2xl">
        Quick commercial enquiry
      </h2>

      <p>
        Share your product, location and phone.
        Sales will confirm quantities and other
        details with you.
      </p>


      {!saved && (

        <form
          className="grid gap-3 mt-4"
          onSubmit={submit}
        >

          <label>

            Product division

            <select
              required
              value={
                form.productCategory
              }
              onChange={event =>
                setForm(current => ({
                  ...current,
                  productCategory:
                    event.target.value
                }))
              }
              className="border p-2 bg-transparent"
            >

              <option value="">
                Select
              </option>

              {[
                'STONE',
                'RICE',
                'TEA',
                'ITO_ADS'
              ].map(value => (

                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>

              ))}

            </select>

          </label>


          {[
            [
              'product',
              'Product / service required'
            ],

            [
              'destination',
              'City / destination'
            ],

            [
              'phone',
              'Phone / WhatsApp including country code'
            ]
          ].map(
            ([key, label]) => (

              <label key={key}>

                {label}

                <input
                  required
                  className="block w-full border p-2 bg-transparent"
                  type={
                    key === 'phone'
                      ? 'tel'
                      : 'text'
                  }
                  value={form[key]}
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        [key]:
                          event.target.value
                      })
                    )
                  }
                />

              </label>

            )
          )}


          <label>

            <input
              type="checkbox"
              required
              checked={
                form.contact
              }
              onChange={event =>
                setForm(
                  current => ({
                    ...current,
                    contact:
                      event.target.checked
                  })
                )
              }
            />

            {' '}
            I consent to contact about this
            enquiry and acknowledge the{' '}

            <a
              className="underline"
              href="/privacy-policy"
            >
              Privacy Policy
            </a>.

          </label>


          <button
            disabled={busy}
            className="border p-3"
          >
            {busy
              ? 'Saving…'
              : 'Request a sales response'}
          </button>

        </form>

      )}


      <p
        role="status"
        aria-live="polite"
      >
        {message}
      </p>

    </section>
  );
}