const crypto = require('crypto');

const Contact = require('./contact.model');

const {
  encryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail,
} = require('../../utils/crypto');

const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.4: Contact resolution service
 *
 * DPR identity rule:
 * - normalized phone and/or VERIFIED email resolve a Contact;
 * - one Contact may own multiple independent Lead opportunities;
 * - conflicting strong identity signals are never auto-merged;
 * - raw phone/email/GST are never logged;
 * - concurrent ingestion is protected by Contact unique indexes.
 */

const CONTACT_SOURCES = new Set([
  'WEBSITE',
  'META_INSTANT_FORM',
  'AI_AGENT',
  'WHATSAPP',
  'INDIAMART',
  'MANUAL',
  'IMPORT',
  'SYSTEM',
]);

function contactResolutionError(
  message,
  code = 'CONTACT_RESOLUTION_FAILED'
) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanText(
  value,
  maxLength = 250
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeContactPhone(
  value
) {
  const raw = cleanText(
    value,
    40
  );

  if (!raw) {
    return '';
  }

  const digits =
    raw.replace(/\D/g, '');

  if (
    digits.length < 10 ||
    digits.length > 15
  ) {
    throw contactResolutionError(
      'Please provide a valid phone number including country code.',
      'CONTACT_PHONE_INVALID'
    );
  }

  return `+${digits}`;
}

function normalizeContactEmail(
  value
) {
  const email =
    cleanText(
      value,
      320
    ).toLowerCase();

  if (!email) {
    return '';
  }

  // Intentionally conservative validation.
  // Verification is represented separately by emailVerified.
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw contactResolutionError(
      'Please provide a valid email address.',
      'CONTACT_EMAIL_INVALID'
    );
  }

  return email;
}

function normalizeContactGst(
  value
) {
  const normalized =
    cleanText(
      value,
      40
    )
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        ''
      );

  return normalized.slice(
    0,
    32
  );
}

function normalizeSource(
  value
) {
  const source =
    cleanText(
      value,
      40
    ).toUpperCase();

  return CONTACT_SOURCES.has(
    source
  )
    ? source
    : 'SYSTEM';
}

function createContactCode() {
  return `CT-${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
}

function maskIdentifier(
  value
) {
  const text =
    cleanText(
      value,
      80
    );

  if (!text) {
    return '';
  }

  if (
    text.length <= 4
  ) {
    return '*'.repeat(
      text.length
    );
  }

  const visibleStart =
    text.slice(0, 2);

  const visibleEnd =
    text.slice(-2);

  return `${visibleStart}${'*'.repeat(
    Math.max(
      4,
      text.length - 4
    )
  )}${visibleEnd}`;
}

function getResolutionMethod({
  phoneHash,
  verifiedEmailHash,
}) {
  if (
    phoneHash &&
    verifiedEmailHash
  ) {
    return 'PHONE_AND_EMAIL';
  }

  if (phoneHash) {
    return 'PHONE';
  }

  if (
    verifiedEmailHash
  ) {
    return 'EMAIL';
  }

  return 'NONE';
}

function buildConsentSnapshot(
  consent = {}
) {
  return {
    contactAllowed:
      consent.contactAllowed === true,

    marketingAllowed:
      consent.marketingAllowed === true,

    privacyVersion:
      cleanText(
        consent.privacyVersion,
        80
      ),

    updatedAt:
      new Date(),
  };
}

async function findActiveContactsByKeys({
  phoneHash,
  verifiedEmailHash,
}) {
  const [
    phoneContact,
    emailContact,
  ] = await Promise.all([
    phoneHash
      ? Contact.findOne({
          status: 'ACTIVE',
          phoneHash,
        })
      : null,

    verifiedEmailHash
      ? Contact.findOne({
          status: 'ACTIVE',
          emailVerified: true,
          emailHash:
            verifiedEmailHash,
        })
      : null,
  ]);

  return {
    phoneContact,
    emailContact,
  };
}

function differentContacts(
  first,
  second
) {
  if (
    !first ||
    !second
  ) {
    return false;
  }

  return (
    String(first._id) !==
    String(second._id)
  );
}

function buildAmbiguousResult({
  phoneContact,
  emailContact,
  method,
  reason,
}) {
  const conflictContactIds =
    [
      phoneContact?._id,
      emailContact?._id,
    ]
      .filter(Boolean)
      .map(
        (id) =>
          String(id)
      );

  logger.warn(
    '[Contact Resolution] Ambiguous identity requires manual review',
    {
      reason,
      conflictContactIds,
    }
  );

  return {
    contact: null,

    status:
      'AMBIGUOUS',

    method,

    reason,

    conflictContactIds,
  };
}

function detectMatchedContactIdentityConflict({
  contact,
  phoneHash,
  verifiedEmailHash,
}) {
  if (!contact) {
    return null;
  }

  /*
   * If an already-resolved Contact has a different normalized
   * phone, never silently replace that strong identity key.
   */
  if (
    phoneHash &&
    contact.phoneHash &&
    contact.phoneHash !==
      phoneHash
  ) {
    return 'PHONE_CONFLICT';
  }

  /*
   * A different VERIFIED email is also a strong conflict.
   *
   * An unverified historic email may later be replaced by a
   * verified address.
   */
  if (
    verifiedEmailHash &&
    contact.emailVerified ===
      true &&
    contact.emailHash &&
    contact.emailHash !==
      verifiedEmailHash
  ) {
    return 'VERIFIED_EMAIL_CONFLICT';
  }

  return null;
}

async function updateMatchedContact({
  contact,
  source,
  name,
  companyName,
  country,

  normalizedPhone,
  phoneHash,
  phoneVerified,

  normalizedEmail,
  emailHash,
  emailVerified,

  normalizedGst,
  gstHash,
  gstVerified,

  consent,
  actorId,
}) {
  const now =
    new Date();

  const set = {
    lastSource:
      source,

    lastSeenAt:
      now,
  };

  if (name) {
    set.name =
      name;
  }

  if (companyName) {
    set.companyName =
      companyName;

    set.companyNameHash =
      hashCompanyName(
        companyName
      );
  }

  if (country) {
    set.country =
      country;
  }

  if (normalizedPhone) {
    /*
     * Only populate a missing phone key.
     *
     * A differing existing key is rejected by
     * detectMatchedContactIdentityConflict().
     */
    if (!contact.phoneHash) {
      set.phoneHash =
        phoneHash;

      set.phoneEncrypted =
        encryptText(
          normalizedPhone
        );

      set.phoneMasked =
        maskPhone(
          normalizedPhone
        );
    }

    if (
      phoneVerified === true
    ) {
      set.phoneVerified =
        true;

      set.phoneVerifiedAt =
        contact.phoneVerifiedAt ||
        now;
    }
  }

  if (normalizedEmail) {
    /*
     * A newly verified email may replace an old unverified
     * email snapshot.
     */
    const canReplaceEmail =
      !contact.emailHash ||
      contact.emailHash ===
        emailHash ||
      (
        emailVerified === true &&
        contact.emailVerified !==
          true
      );

    if (canReplaceEmail) {
      set.emailHash =
        emailHash;

      set.emailEncrypted =
        encryptText(
          normalizedEmail
        );

      set.emailMasked =
        maskEmail(
          normalizedEmail
        );
    }

    if (
      emailVerified === true
    ) {
      set.emailVerified =
        true;

      set.emailVerifiedAt =
        contact.emailVerifiedAt ||
        now;
    }
  }

  if (normalizedGst) {
    /*
     * GST supports business identity but is not used here as
     * the primary Contact-resolution key.
     */
    set.gstHash =
      gstHash;

    set.gstEncrypted =
      encryptText(
        normalizedGst
      );

    set.gstMasked =
      maskIdentifier(
        normalizedGst
      );

    if (
      gstVerified === true
    ) {
      set.gstVerified =
        true;

      set.gstVerifiedAt =
        contact.gstVerifiedAt ||
        now;
    }
  }

  if (
    consent &&
    typeof consent ===
      'object'
  ) {
    set.consent =
      buildConsentSnapshot(
        consent
      );
  }

  if (actorId) {
    set.updatedBy =
      actorId;
  }

  return Contact.findByIdAndUpdate(
    contact._id,

    {
      $set: set,
    },

    {
      new: true,
      runValidators: true,
    }
  );
}

async function createNewContact({
  source,
  name,
  companyName,
  country,

  normalizedPhone,
  phoneHash,
  phoneVerified,

  normalizedEmail,
  emailHash,
  emailVerified,

  normalizedGst,
  gstHash,
  gstVerified,

  consent,
  actorId,
}) {
  const now =
    new Date();

  return Contact.create({
    contactCode:
      createContactCode(),

    status:
      'ACTIVE',

    name,

    companyName,

    companyNameHash:
      companyName
        ? hashCompanyName(
            companyName
          )
        : '',

    country,

    phoneEncrypted:
      normalizedPhone
        ? encryptText(
            normalizedPhone
          )
        : '',

    phoneMasked:
      normalizedPhone
        ? maskPhone(
            normalizedPhone
          )
        : '',

    phoneHash,

    phoneVerified:
      phoneVerified === true,

    phoneVerifiedAt:
      phoneVerified === true
        ? now
        : null,

    emailEncrypted:
      normalizedEmail
        ? encryptText(
            normalizedEmail
          )
        : '',

    emailMasked:
      normalizedEmail
        ? maskEmail(
            normalizedEmail
          )
        : '',

    emailHash,

    emailVerified:
      emailVerified === true,

    emailVerifiedAt:
      emailVerified === true
        ? now
        : null,

    gstEncrypted:
      normalizedGst
        ? encryptText(
            normalizedGst
          )
        : '',

    gstMasked:
      normalizedGst
        ? maskIdentifier(
            normalizedGst
          )
        : '',

    gstHash,

    gstVerified:
      gstVerified === true,

    gstVerifiedAt:
      gstVerified === true
        ? now
        : null,

    firstSource:
      source,

    lastSource:
      source,

    firstSeenAt:
      now,

    lastSeenAt:
      now,

    opportunityCount:
      0,

    consent:
      buildConsentSnapshot(
        consent
      ),

    createdBy:
      actorId ||
      null,

    updatedBy:
      actorId ||
      null,
  });
}


/**
 * Resolve an existing Contact or create a new one.
 *
 * This function never creates a Lead.
 *
 * Therefore Contact resolution itself cannot accidentally
 * create duplicate commercial opportunities.
 */
async function resolveOrCreateContact(
  input = {}
) {
  const source =
    normalizeSource(
      input.source
    );

  const name =
    cleanText(
      input.name ||
        input.customerName ||
        input.contactPerson,
      150
    );

  const companyName =
    cleanText(
      input.companyName ||
        input.company,
      200
    );

  const country =
    cleanText(
      input.country,
      100
    );

  const normalizedPhone =
    normalizeContactPhone(
      input.phone ||
        input.mobile ||
        input.whatsapp
    );

  const normalizedEmail =
    normalizeContactEmail(
      input.email
    );

  const normalizedGst =
    normalizeContactGst(
      input.gst ||
        input.gstin
    );

  const phoneVerified =
    input.phoneVerified ===
      true;

  const emailVerified =
    input.emailVerified ===
      true;

  const gstVerified =
    input.gstVerified ===
      true;

  const phoneHash =
    normalizedPhone
      ? hashText(
          normalizedPhone
        )
      : '';

  const emailHash =
    normalizedEmail
      ? hashText(
          normalizedEmail
        )
      : '';

  const verifiedEmailHash =
    emailVerified
      ? emailHash
      : '';

  const gstHash =
    normalizedGst
      ? hashText(
          normalizedGst
        )
      : '';

  const method =
    getResolutionMethod({
      phoneHash,
      verifiedEmailHash,
    });

  if (
    method ===
    'NONE'
  ) {
    throw contactResolutionError(
      'Contact resolution requires a normalized phone number or a verified email address.',
      'CONTACT_RESOLUTION_KEY_REQUIRED'
    );
  }

  let {
    phoneContact,
    emailContact,
  } =
    await findActiveContactsByKeys({
      phoneHash,
      verifiedEmailHash,
    });

  /*
   * Strong signals resolve to different active Contacts.
   *
   * Do not auto-merge.
   */
  if (
    differentContacts(
      phoneContact,
      emailContact
    )
  ) {
    return buildAmbiguousResult({
      phoneContact,
      emailContact,
      method,

      reason:
        'PHONE_EMAIL_RESOLVE_TO_DIFFERENT_CONTACTS',
    });
  }

  let contact =
    phoneContact ||
    emailContact;

  if (contact) {
    const identityConflict =
      detectMatchedContactIdentityConflict({
        contact,
        phoneHash,
        verifiedEmailHash,
      });

    if (identityConflict) {
      return buildAmbiguousResult({
        phoneContact:
          contact,

        emailContact:
          null,

        method,

        reason:
          identityConflict,
      });
    }

    try {
      const updatedContact =
        await updateMatchedContact({
          contact,

          source,

          name,

          companyName,

          country,

          normalizedPhone,

          phoneHash,

          phoneVerified,

          normalizedEmail,

          emailHash,

          emailVerified,

          normalizedGst,

          gstHash,

          gstVerified,

          consent:
            input.consent ||
            {},

          actorId:
            input.actorId ||
            null,
        });

      return {
        contact:
          updatedContact,

        status:
          'MATCHED',

        method,

        reason:
          '',

        conflictContactIds:
          [],
      };

    } catch (error) {
      if (
        error?.code !==
        11000
      ) {
        throw error;
      }

      /*
       * A concurrent request may have claimed one of the
       * resolution keys between our lookup and update.
       *
       * Re-resolve once rather than overwriting.
       */
      ({
        phoneContact,
        emailContact,
      } =
        await findActiveContactsByKeys({
          phoneHash,
          verifiedEmailHash,
        }));

      if (
        differentContacts(
          phoneContact,
          emailContact
        )
      ) {
        return buildAmbiguousResult({
          phoneContact,
          emailContact,
          method,

          reason:
            'CONCURRENT_CONTACT_KEY_CONFLICT',
        });
      }

      contact =
        phoneContact ||
        emailContact;

      if (contact) {
        return {
          contact,

          status:
            'MATCHED',

          method,

          reason:
            'MATCHED_AFTER_CONCURRENT_UPDATE',

          conflictContactIds:
            [],
        };
      }

      throw error;
    }
  }

  /*
   * No Contact currently owns the supplied resolution keys.
   */
  try {
    const createdContact =
      await createNewContact({
        source,

        name,

        companyName,

        country,

        normalizedPhone,

        phoneHash,

        phoneVerified,

        normalizedEmail,

        emailHash,

        emailVerified,

        normalizedGst,

        gstHash,

        gstVerified,

        consent:
          input.consent ||
          {},

        actorId:
          input.actorId ||
          null,
      });

    return {
      contact:
        createdContact,

      status:
        'CREATED',

      method,

      reason:
        '',

      conflictContactIds:
        [],
    };

  } catch (error) {
    if (
      error?.code !==
      11000
    ) {
      throw error;
    }

    /*
     * Concurrency-safe recovery:
     *
     * another request created the Contact after the initial lookup.
     */
    ({
      phoneContact,
      emailContact,
    } =
      await findActiveContactsByKeys({
        phoneHash,
        verifiedEmailHash,
      }));

    if (
      differentContacts(
        phoneContact,
        emailContact
      )
    ) {
      return buildAmbiguousResult({
        phoneContact,
        emailContact,
        method,

        reason:
          'CONCURRENT_CONTACT_CREATION_CONFLICT',
      });
    }

    contact =
      phoneContact ||
      emailContact;

    if (contact) {
      return {
        contact,

        status:
          'MATCHED',

        method,

        reason:
          'MATCHED_AFTER_CONCURRENT_CREATE',

        conflictContactIds:
          [],
      };
    }

    throw error;
  }
}


/**
 * Call this only AFTER a Lead opportunity has been durably
 * persisted.
 *
 * This ensures Contact.opportunityCount stays truthful if
 * Lead.create() fails.
 */
async function markContactOpportunityCreated(
  contactId,
  {
    source = 'SYSTEM',
    occurredAt = new Date(),
  } = {}
) {
  if (!contactId) {
    return null;
  }

  const safeSource =
    normalizeSource(
      source
    );

  const at =
    occurredAt instanceof Date
      ? occurredAt
      : new Date(
          occurredAt
        );

  const safeAt =
    Number.isNaN(
      at.getTime()
    )
      ? new Date()
      : at;

  const contact =
    await Contact.findByIdAndUpdate(
      contactId,

      {
        $inc: {
          opportunityCount:
            1,
        },

        $set: {
          lastOpportunityAt:
            safeAt,

          lastSeenAt:
            safeAt,

          lastSource:
            safeSource,
        },
      },

      {
        new: true,
      }
    );

  if (!contact) {
    return null;
  }

  /*
   * Set firstOpportunityAt only once.
   *
   * The conditional update keeps concurrent opportunity creation
   * from repeatedly overwriting it.
   */
  if (
    !contact.firstOpportunityAt
  ) {
    await Contact.updateOne(
      {
        _id:
          contact._id,

        firstOpportunityAt:
          null,
      },

      {
        $set: {
          firstOpportunityAt:
            safeAt,
        },
      }
    );

    contact.firstOpportunityAt =
      safeAt;
  }

  return contact;
}


module.exports = {
  resolveOrCreateContact,
  markContactOpportunityCreated,
  normalizeContactPhone,
  normalizeContactEmail,
  normalizeContactGst,
};