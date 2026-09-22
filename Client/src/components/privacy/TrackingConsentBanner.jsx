import React, { useEffect, useState } from 'react';

import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '../../utils/analytics';

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1: Consent management UI
 *
 * This component controls OPTIONAL measurement/advertising consent only.
 *
 * It is separate from enquiry/contact consent collected inside lead forms.
 */

const BRAND = Object.freeze({
  primaryDark: '#111214',
  secondaryDark: '#202226',
  accentGold: '#C7A24A',
  background: '#F7F4ED',
  neutralGrey: '#6A6D72',
});


function readConsent() {
  const consent =
    getAnalyticsConsent();

  return {
    analytics:
      consent.analytics === true,

    advertising:
      consent.advertising === true,

    updatedAt:
      consent.updated_at || null,
  };
}


export default function TrackingConsentBanner() {
  const [consent, setConsent] =
    useState(() =>
      readConsent()
    );

  const [
    showBanner,
    setShowBanner
  ] =
    useState(
      () =>
        !readConsent().updatedAt
    );

  const [
    showPreferences,
    setShowPreferences
  ] =
    useState(false);

  const [
    analyticsEnabled,
    setAnalyticsEnabled
  ] =
    useState(
      () =>
        readConsent().analytics
    );

  const [
    advertisingEnabled,
    setAdvertisingEnabled
  ] =
    useState(
      () =>
        readConsent().advertising
    );


  useEffect(() => {
    const current =
      readConsent();

    setConsent(current);

    setAnalyticsEnabled(
      current.analytics
    );

    setAdvertisingEnabled(
      current.advertising
    );

    setShowBanner(
      !current.updatedAt
    );
  }, []);


  const persistChoice = ({
    analytics,
    advertising,
  }) => {
    setAnalyticsConsent({
      analytics,
      advertising,
    });


    const next = {
      analytics,
      advertising,
      updatedAt:
        new Date().toISOString(),
    };


    setConsent(next);

    setAnalyticsEnabled(
      analytics
    );

    setAdvertisingEnabled(
      advertising
    );

    setShowBanner(false);

    setShowPreferences(false);
  };


  const handleSavePreferences =
    () => {
      persistChoice({
        analytics:
          analyticsEnabled,

        advertising:
          advertisingEnabled,
      });
    };


  return (
    <>
      {showBanner && (
        <div
          className="
            fixed
            inset-x-0
            bottom-0
            z-[10000]
            px-3
            pb-3
            sm:px-5
            sm:pb-5
            font-sans
          "
          role="dialog"
          aria-modal="false"
          aria-labelledby="ito-tracking-consent-title"
          aria-describedby="ito-tracking-consent-description"
        >
          <div
            className="
              mx-auto
              max-w-5xl
              overflow-hidden
              rounded-2xl
              border
              shadow-2xl
            "
            style={{
              backgroundColor:
                BRAND.background,

              borderColor:
                'rgba(199, 162, 74, 0.45)',

              color:
                BRAND.primaryDark,
            }}
          >
            <div className="p-5 sm:p-6">
              <div
                className="
                  flex
                  flex-col
                  gap-5
                  lg:flex-row
                  lg:items-start
                  lg:justify-between
                "
              >
                <div className="max-w-2xl">
                  <div
                    className="
                      mb-2
                      text-xs
                      font-semibold
                      uppercase
                      tracking-[0.18em]
                    "
                    style={{
                      color:
                        BRAND.accentGold,
                    }}
                  >
                    Privacy & measurement
                  </div>


                  <h2
                    id="ito-tracking-consent-title"
                    className="
                      text-xl
                      font-semibold
                      sm:text-2xl
                    "
                    style={{
                      color:
                        BRAND.primaryDark,
                    }}
                  >
                    Choose how optional
                    tracking is used
                  </h2>


                  <p
                    id="ito-tracking-consent-description"
                    className="
                      mt-2
                      text-sm
                      leading-6
                      sm:text-[15px]
                    "
                    style={{
                      color:
                        BRAND.neutralGrey,
                    }}
                  >
                    Essential website and
                    security functions remain
                    available. Optional analytics
                    helps us understand page and
                    enquiry-funnel performance.
                    Advertising consent allows
                    marketing measurement and
                    ad-platform features. Contact
                    details entered in enquiry
                    forms are handled separately
                    and are not sent through this
                    consent banner.
                  </p>
                </div>


                {!showPreferences && (
                  <div
                    className="
                      flex
                      w-full
                      flex-col
                      gap-2
                      sm:w-auto
                      sm:min-w-[220px]
                    "
                  >
                    <button
                      type="button"
                      onClick={() =>
                        persistChoice({
                          analytics:
                            true,

                          advertising:
                            true,
                        })
                      }
                      className="
                        min-h-11
                        rounded-xl
                        px-4
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                        hover:opacity-90
                        focus:outline-none
                        focus:ring-2
                        focus:ring-offset-2
                      "
                      style={{
                        backgroundColor:
                          BRAND.accentGold,

                        color:
                          BRAND.primaryDark,
                      }}
                    >
                      Accept all
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        persistChoice({
                          analytics:
                            true,

                          advertising:
                            false,
                        })
                      }
                      className="
                        min-h-11
                        rounded-xl
                        border
                        px-4
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                        hover:bg-black/5
                        focus:outline-none
                        focus:ring-2
                        focus:ring-offset-2
                      "
                      style={{
                        borderColor:
                          BRAND.secondaryDark,

                        color:
                          BRAND.secondaryDark,
                      }}
                    >
                      Analytics only
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        persistChoice({
                          analytics:
                            false,

                          advertising:
                            false,
                        })
                      }
                      className="
                        min-h-11
                        rounded-xl
                        px-4
                        py-2.5
                        text-sm
                        font-medium
                        transition
                        hover:bg-black/5
                        focus:outline-none
                        focus:ring-2
                        focus:ring-offset-2
                      "
                      style={{
                        color:
                          BRAND.neutralGrey,
                      }}
                    >
                      Reject optional
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        setShowPreferences(
                          true
                        )
                      }
                      className="
                        min-h-10
                        px-4
                        py-2
                        text-sm
                        font-medium
                        underline
                        underline-offset-4
                      "
                      style={{
                        color:
                          BRAND.secondaryDark,
                      }}
                    >
                      Manage preferences
                    </button>
                  </div>
                )}
              </div>


              {showPreferences && (
                <div
                  className="
                    mt-5
                    rounded-xl
                    border
                    p-4
                    sm:p-5
                  "
                  style={{
                    backgroundColor:
                      '#FFFFFF',

                    borderColor:
                      'rgba(106, 109, 114, 0.22)',
                  }}
                >
                  <div className="space-y-4">
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-5
                        border-b
                        pb-4
                      "
                    >
                      <div>
                        <div
                          className="
                            text-sm
                            font-semibold
                          "
                          style={{
                            color:
                              BRAND.primaryDark,
                          }}
                        >
                          Essential & security
                        </div>


                        <p
                          className="
                            mt-1
                            text-xs
                            leading-5
                          "
                          style={{
                            color:
                              BRAND.neutralGrey,
                          }}
                        >
                          Required for core website
                          operation, security, and
                          requested functionality.
                          This category cannot be
                          disabled here.
                        </p>
                      </div>


                      <span
                        className="
                          shrink-0
                          rounded-full
                          px-3
                          py-1
                          text-xs
                          font-semibold
                        "
                        style={{
                          backgroundColor:
                            'rgba(199, 162, 74, 0.16)',

                          color:
                            BRAND.primaryDark,
                        }}
                      >
                        Always on
                      </span>
                    </div>


                    <label
                      className="
                        flex
                        cursor-pointer
                        items-start
                        justify-between
                        gap-5
                        border-b
                        pb-4
                      "
                    >
                      <div>
                        <div
                          className="
                            text-sm
                            font-semibold
                          "
                          style={{
                            color:
                              BRAND.primaryDark,
                          }}
                        >
                          Analytics
                        </div>


                        <p
                          className="
                            mt-1
                            text-xs
                            leading-5
                          "
                          style={{
                            color:
                              BRAND.neutralGrey,
                          }}
                        >
                          Allows privacy-safe
                          measurement of public page
                          and funnel performance,
                          including first-party
                          analytics persistence.
                        </p>
                      </div>


                      <input
                        type="checkbox"
                        className="
                          mt-1
                          h-5
                          w-5
                          shrink-0
                          accent-[#C7A24A]
                        "
                        checked={
                          analyticsEnabled
                        }
                        onChange={(
                          event
                        ) =>
                          setAnalyticsEnabled(
                            event.target
                              .checked
                          )
                        }
                        aria-label="Allow analytics tracking"
                      />
                    </label>


                    <label
                      className="
                        flex
                        cursor-pointer
                        items-start
                        justify-between
                        gap-5
                      "
                    >
                      <div>
                        <div
                          className="
                            text-sm
                            font-semibold
                          "
                          style={{
                            color:
                              BRAND.primaryDark,
                          }}
                        >
                          Advertising measurement
                        </div>


                        <p
                          className="
                            mt-1
                            text-xs
                            leading-5
                          "
                          style={{
                            color:
                              BRAND.neutralGrey,
                          }}
                        >
                          Allows advertising
                          measurement and related
                          ad-platform features. This
                          tracking remains optional.
                        </p>
                      </div>


                      <input
                        type="checkbox"
                        className="
                          mt-1
                          h-5
                          w-5
                          shrink-0
                          accent-[#C7A24A]
                        "
                        checked={
                          advertisingEnabled
                        }
                        onChange={(
                          event
                        ) =>
                          setAdvertisingEnabled(
                            event.target
                              .checked
                          )
                        }
                        aria-label="Allow advertising measurement"
                      />
                    </label>
                  </div>


                  <div
                    className="
                      mt-5
                      flex
                      flex-col-reverse
                      gap-2
                      sm:flex-row
                      sm:justify-end
                    "
                  >
                    {consent.updatedAt && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowPreferences(
                            false
                          );

                          setShowBanner(
                            false
                          );
                        }}
                        className="
                          min-h-11
                          rounded-xl
                          border
                          px-4
                          py-2.5
                          text-sm
                          font-semibold
                        "
                        style={{
                          borderColor:
                            'rgba(106, 109, 114, 0.35)',

                          color:
                            BRAND.secondaryDark,
                        }}
                      >
                        Cancel
                      </button>
                    )}


                    <button
                      type="button"
                      onClick={
                        handleSavePreferences
                      }
                      className="
                        min-h-11
                        rounded-xl
                        px-5
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                        hover:opacity-90
                        focus:outline-none
                        focus:ring-2
                        focus:ring-offset-2
                      "
                      style={{
                        backgroundColor:
                          BRAND.accentGold,

                        color:
                          BRAND.primaryDark,
                      }}
                    >
                      Save preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}