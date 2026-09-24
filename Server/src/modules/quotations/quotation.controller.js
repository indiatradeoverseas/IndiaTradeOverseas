const mongoose = require('mongoose');

const quotationService = require('./quotation.service');
const Quotation = require('./quotation.model');
const Lead = require('../leads/lead.model');
const User = require('../users/user.model');
const Employee = require('../employee/employee.model');
const Admin = require('../admin-auth/admin.model');
const SalesTrialUser = require('../sales-trial/salesTrialUser.model');

const { ok, fail } = require('../../utils/response');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.25C: Quotation API hardening
 *
 * Goals:
 * - expose Phase 2.25B commercial/lifecycle rules with clear API errors;
 * - accept only supported quotation inputs;
 * - validate ObjectIds and numeric fields before service calls;
 * - keep sales users scoped to Leads they own/requested;
 * - preserve management/quotation-permission access;
 * - avoid returning protected Lead identity fields from quotation lists;
 * - keep existing API paths and response envelope compatible.
 */

const ALLOWED_STATUSES = new Set(
  Array.isArray(Quotation.STATUSES)
    ? Quotation.STATUSES
    : [
        'DRAFT',
        'PENDING',
        'APPROVED',
        'REJECTED',
        'SENT_TO_CUSTOMER',
        'NEGOTIATION',
        'CLOSED',
      ]
);

function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().slice(0, maxLength);
}

function normalizeUpper(value, maxLength = 100) {
  return cleanText(value, maxLength).toUpperCase();
}

function isValidObjectId(value) {
  return Boolean(value && mongoose.isValidObjectId(value));
}

function getIdentityCandidates(user) {
  const candidates = [
    user?.employeeDbId,
    user?._id,
    user?.employeeId,
    user?.trialId,
    user?.email,
  ]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== ''
    )
    .map((value) => String(value));

  return [...new Set(candidates)];
}

function getActorObjectId(user) {
  const candidates = [
    user?.employeeDbId,
    user?._id,
  ];

  for (const candidate of candidates) {
    if (mongoose.isValidObjectId(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isManagementUser(user) {
  const role = normalizeUpper(user?.role);
  const department = normalizeUpper(user?.department);
  const position = normalizeUpper(user?.position, 150);

  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    role === 'CEO' ||
    role === 'MANAGER' ||
    role === 'SALES_MANAGER' ||
    role === 'TRANSPORT_MANAGER' ||
    role === 'LOGISTICS_MANAGER' ||
    role.includes('MANAGER') ||
    role.includes('FOUNDER') ||
    role.includes('CEO') ||
    role.includes('ADMIN') ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    position.includes('ADMIN') ||
    position.includes('FOUNDER') ||
    position.includes('CEO') ||
    position.includes('MANAGER')
  );
}

function hasQuotationPermission(user) {
  return (
    user?.quotationPermission === true ||
    user?.permissions?.quotation === true
  );
}

function identityMatches(value, candidates) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return false;
  }

  const raw =
    typeof value === 'object' && value !== null
      ? value._id ||
        value.employeeDbId ||
        value.employeeId ||
        value.trialId ||
        value.email
      : value;

  if (
    raw === undefined ||
    raw === null ||
    raw === ''
  ) {
    return false;
  }

  const normalizedRaw = String(raw);
  const lowerRaw = normalizedRaw.toLowerCase();

  return candidates.some((candidate) => {
    const normalizedCandidate = String(candidate);

    return (
      normalizedCandidate === normalizedRaw ||
      normalizedCandidate.toLowerCase() === lowerRaw
    );
  });
}

async function canAccessLeadForQuotation(user, lead) {
  if (!lead) {
    return false;
  }

  if (
    isManagementUser(user) ||
    hasQuotationPermission(user) ||
    user?.isTrial === true ||
    user?.modelName === 'SalesTrialUser'
  ) {
    return true;
  }

  const identities =
    getIdentityCandidates(user);

  return (
    identityMatches(
      lead.assignedTo,
      identities
    ) ||
    identityMatches(
      lead.createdBy,
      identities
    )
  );
}

function sendServiceError(
  res,
  error,
  req
) {
  const code = cleanText(
    error?.code ||
      error?.message,
    120
  );

  const mappings = {
    LEAD_NOT_FOUND: {
      status: 404,
      errorCode: 'LEAD_NOT_FOUND',
      message: 'Lead not found.',
    },

    QUOTATION_NOT_FOUND: {
      status: 404,
      errorCode: 'QUOTATION_NOT_FOUND',
      message: 'Quotation not found.',
    },

    QUOTATION_AMOUNT_REQUIRED: {
      status: 400,
      errorCode: 'VALIDATION_FAILED',
      message:
        error.message ||
        'Quotation amount is required.',
    },

    QUOTATION_AMOUNT_INVALID: {
      status: 400,
      errorCode: 'VALIDATION_FAILED',
      message:
        error.message ||
        'Quotation amount must be a positive number.',
    },

    QUOTATION_VALIDITY_INVALID: {
      status: 400,
      errorCode: 'VALIDATION_FAILED',
      message:
        error.message ||
        'Quotation validity is invalid.',
    },

    QUOTATION_IDS_REQUIRED: {
      status: 400,
      errorCode: 'VALIDATION_FAILED',
      message:
        'quotationIds must be a non-empty array.',
    },

    LEAD_NOT_QUALIFIED_FOR_QUOTATION: {
      status: 409,
      errorCode:
        'LEAD_NOT_QUALIFIED_FOR_QUOTATION',
      message:
        error.message ||
        'Lead must be qualified before creating a quotation.',
    },

    CRM_QUALIFICATION_REQUIRED: {
      status: 409,
      errorCode:
        'CRM_QUALIFICATION_REQUIRED',
      message:
        error.message ||
        'Lead qualification must be completed first.',
    },

    QUOTATION_NOT_APPROVED: {
      status: 409,
      errorCode:
        'QUOTATION_NOT_APPROVED',
      message:
        error.message ||
        'Quotation must be approved before it can be sent.',
    },

    QUOTATION_ALREADY_SENT: {
      status: 409,
      errorCode:
        'QUOTATION_ALREADY_SENT',
      message:
        error.message ||
        'Quotation has already been sent to the customer.',
    },

    QUOTATION_REJECTED: {
      status: 409,
      errorCode:
        'QUOTATION_REJECTED',
      message:
        error.message ||
        'Rejected quotation cannot be approved.',
    },
  };

  const mapping =
    mappings[code];

  if (mapping) {
    return fail(
      res,
      mapping.status,
      mapping.errorCode,
      mapping.message,
      [],
      req
    );
  }

  if (
    error?.name ===
    'CastError'
  ) {
    return fail(
      res,
      400,
      'INVALID_ID',
      'A supplied record ID is invalid.',
      [],
      req
    );
  }

  if (
    error?.name ===
    'ValidationError'
  ) {
    return fail(
      res,
      400,
      'VALIDATION_FAILED',
      'Quotation validation failed.',
      Object.values(
        error.errors || {}
      ).map(
        (item) =>
          item.message
      ),
      req
    );
  }

  return null;
}

function validatePositiveOptionalAmount(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return true;
  }

  const numeric =
    Number(value);

  return (
    Number.isFinite(
      numeric
    ) &&
    numeric > 0
  );
}

async function resolveStaffMap(ids) {
  const uniqueIds = [
    ...new Set(
      ids
        .filter(Boolean)
        .map(
          (value) =>
            String(value).trim()
        )
        .filter(Boolean)
    ),
  ];

  if (!uniqueIds.length) {
    return new Map();
  }

  const objectIds =
    uniqueIds
      .filter(
        (value) =>
          mongoose.isValidObjectId(
            value
          )
      )
      .map(
        (value) =>
          new mongoose.Types.ObjectId(
            value
          )
      );

  const lowerEmails =
    uniqueIds
      .filter(
        (value) =>
          value.includes('@')
      )
      .map(
        (value) =>
          value.toLowerCase()
      );

  const userOr = [];
  const employeeOr = [];
  const adminOr = [];
  const trialOr = [];

  if (objectIds.length) {
    userOr.push({
      _id: {
        $in: objectIds,
      },
    });

    employeeOr.push({
      _id: {
        $in: objectIds,
      },
    });

    adminOr.push({
      _id: {
        $in: objectIds,
      },
    });

    trialOr.push({
      _id: {
        $in: objectIds,
      },
    });
  }

  userOr.push({
    employeeId: {
      $in: uniqueIds,
    },
  });

  employeeOr.push({
    employeeId: {
      $in: uniqueIds,
    },
  });

  trialOr.push({
    trialId: {
      $in: uniqueIds,
    },
  });

  if (lowerEmails.length) {
    userOr.push({
      email: {
        $in: lowerEmails,
      },
    });

    employeeOr.push({
      email: {
        $in: lowerEmails,
      },
    });

    adminOr.push({
      email: {
        $in: lowerEmails,
      },
    });

    trialOr.push({
      email: {
        $in: lowerEmails,
      },
    });
  }

  const [
    users,
    employees,
    admins,
    trialUsers,
  ] =
    await Promise.all([
      userOr.length
        ? User.find({
            $or: userOr,
          })
            .select(
              '_id fullName name email employeeId employeeDbId role'
            )
            .lean()
        : [],

      employeeOr.length
        ? Employee.find({
            $or: employeeOr,
          })
            .select(
              '_id name fullName email employeeId role'
            )
            .lean()
        : [],

      adminOr.length
        ? Admin.find({
            $or: adminOr,
          })
            .select(
              '_id fullName name email designation role'
            )
            .lean()
        : [],

      trialOr.length
        ? SalesTrialUser.find({
            $or: trialOr,
          })
            .select(
              '_id fullName name email trialId role'
            )
            .lean()
        : [],
    ]);

  const staffMap =
    new Map();

  const add = (
    record
  ) => {
    if (!record?._id) {
      return;
    }

    const display = {
      _id:
        record._id,

      fullName:
        record.fullName ||
        record.name ||
        record.email ||
        record.employeeId ||
        record.trialId ||
        'Staff Member',

      email:
        record.email ||
        '',

      employeeId:
        record.employeeId ||
        record.trialId ||
        '',

      trialId:
        record.trialId ||
        '',

      designation:
        record.designation ||
        record.role ||
        '',
    };

    const keys = [
      record._id,
      record.employeeDbId,
      record.employeeId,
      record.trialId,
      record.email,
    ]
      .filter(Boolean)
      .map(
        (value) =>
          String(value)
      );

    keys.forEach(
      (key) => {
        if (
          !staffMap.has(
            key
          )
        ) {
          staffMap.set(
            key,
            display
          );
        }

        if (
          key.includes('@')
        ) {
          const lowerKey =
            key.toLowerCase();

          if (
            !staffMap.has(
              lowerKey
            )
          ) {
            staffMap.set(
              lowerKey,
              display
            );
          }
        }
      }
    );
  };

  users.forEach(add);
  employees.forEach(add);
  admins.forEach(add);
  trialUsers.forEach(add);

  return staffMap;
}

async function requestQuotation(
  req,
  res,
  next
) {
  try {
    const {
      leadId,
      employeeRequestedPrice,
      marginNote,
      paymentTerms,
      validityDays,
    } = req.body || {};

    if (
      !isValidObjectId(
        leadId
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'A valid leadId is required.',
        [],
        req
      );
    }

    if (
      !validatePositiveOptionalAmount(
        employeeRequestedPrice
      ) ||
      employeeRequestedPrice ===
        undefined ||
      employeeRequestedPrice ===
        null ||
      employeeRequestedPrice ===
        ''
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'employeeRequestedPrice must be a positive number.',
        [],
        req
      );
    }

    if (
      validityDays !==
        undefined &&
      validityDays !==
        null &&
      validityDays !==
        '' &&
      (
        !Number.isInteger(
          Number(
            validityDays
          )
        ) ||
        Number(
          validityDays
        ) < 1 ||
        Number(
          validityDays
        ) > 365
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'validityDays must be an integer between 1 and 365.',
        [],
        req
      );
    }

    const lead =
      await Lead.findById(
        leadId
      )
        .select(
          '_id assignedTo createdBy'
        )
        .lean();

    if (!lead) {
      return fail(
        res,
        404,
        'LEAD_NOT_FOUND',
        'Lead not found.',
        [],
        req
      );
    }

    if (
      !(
        await canAccessLeadForQuotation(
          req.user,
          lead
        )
      )
    ) {
      return fail(
        res,
        403,
        'RBAC_FORBIDDEN',
        'You do not have permission to create a quotation for this Lead.',
        [],
        req
      );
    }

    const actorId =
      getActorObjectId(
        req.user
      );

    const quotation =
      await quotationService.createQuotationRequest(
        {
          leadId,

          employeeRequestedPrice:
            Number(
              employeeRequestedPrice
            ),

          marginNote:
            cleanText(
              marginNote,
              5000
            ),

          paymentTerms:
            cleanText(
              paymentTerms,
              5000
            ),

          validityDays:
            validityDays ===
              undefined ||
            validityDays ===
              null ||
            validityDays ===
              ''
              ? undefined
              : Number(
                  validityDays
                ),

          actorId,
        }
      );

    return ok(
      res,
      {
        quotation,
      },
      'Quotation request created successfully',
      201,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

async function pendingQuotations(
  req,
  res,
  next
) {
  try {
    const requestedStatus =
      normalizeUpper(
        req.query?.status ||
        'ALL'
      );

    if (
      requestedStatus !==
        'ALL' &&
      !ALLOWED_STATUSES.has(
        requestedStatus
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        `Unsupported quotation status: ${requestedStatus}.`,
        [],
        req
      );
    }

    const filter = {};

    if (
      requestedStatus !==
      'ALL'
    ) {
      filter.status =
        requestedStatus;
    }

    if (
      !isManagementUser(
        req.user
      ) &&
      !hasQuotationPermission(
        req.user
      )
    ) {
      const identities =
        getIdentityCandidates(
          req.user
        );

      if (
        !identities.length
      ) {
        return ok(
          res,
          {
            quotations:
              [],
          },
          'Quotations retrieved successfully',
          200,
          req
        );
      }

      const myLeads =
        await Lead.find({
          $or: [
            {
              assignedTo: {
                $in:
                  identities,
              },
            },

            {
              createdBy: {
                $in:
                  identities.filter(
                    isValidObjectId
                  ),
              },
            },
          ],
        })
          .select(
            '_id'
          )
          .lean();

      filter.leadId = {
        $in:
          myLeads.map(
            (lead) =>
              lead._id
          ),
      };
    }

    const quotations =
      await Quotation.find(
        filter
      )
        .populate({
          path:
            'leadId',

          select: [
            'customerName',
            'leadCode',
            'productCategory',
            'product',
            'grade',
            'priority',
            'crmStatus',
            'stage',
            'assignedTo',
            'createdBy',
            'quoteId',
            'quoteAmount',
            'createdAt',
          ].join(
            ' '
          ),
        })
        .sort({
          createdAt:
            -1,
        })
        .lean();

    const staffIds =
      [];

    quotations.forEach(
      (quotation) => {
        if (
          quotation.requestedBy
        ) {
          staffIds.push(
            String(
              quotation.requestedBy
            )
          );
        }

        if (
          quotation.leadId
            ?.assignedTo
        ) {
          const assigned =
            quotation
              .leadId
              .assignedTo;

          const assignedId =
            typeof assigned ===
              'object' &&
            assigned !== null
              ? assigned._id ||
                assigned.employeeDbId ||
                assigned.employeeId ||
                assigned.trialId ||
                assigned.email
              : assigned;

          if (
            assignedId
          ) {
            staffIds.push(
              String(
                assignedId
              )
            );
          }
        }

        if (
          quotation.leadId
            ?.createdBy
        ) {
          staffIds.push(
            String(
              quotation
                .leadId
                .createdBy
            )
          );
        }
      }
    );

    const staffMap =
      await resolveStaffMap(
        staffIds
      );

    const formattedQuotations =
      quotations.map(
        (
          quotation
        ) => {
          const lead =
            quotation.leadId ||
            null;

          const requestedBy =
            quotation.requestedBy
              ? staffMap.get(
                  String(
                    quotation.requestedBy
                  )
                ) ||
                null
              : null;

          let assignedTo =
            null;

          if (
            lead?.assignedTo
          ) {
            const rawAssignedId =
              typeof lead.assignedTo ===
                'object' &&
              lead.assignedTo !==
                null
                ? lead
                    .assignedTo
                    ._id ||
                  lead
                    .assignedTo
                    .employeeDbId ||
                  lead
                    .assignedTo
                    .employeeId ||
                  lead
                    .assignedTo
                    .trialId ||
                  lead
                    .assignedTo
                    .email
                : lead.assignedTo;

            if (
              rawAssignedId
            ) {
              const rawKey =
                String(
                  rawAssignedId
                );

              assignedTo =
                staffMap.get(
                  rawKey
                ) ||
                (
                  rawKey.includes('@')
                    ? staffMap.get(
                        rawKey.toLowerCase()
                      )
                    : null
                ) ||
                null;
            }
          }

          const createdBy =
            lead?.createdBy
              ? staffMap.get(
                  String(
                    lead.createdBy
                  )
                ) ||
                null
              : null;

          const safeLead =
            lead
              ? {
                  ...lead,

                  assignedTo:
                    assignedTo ||
                    lead.assignedTo ||
                    null,

                  createdBy:
                    createdBy ||
                    lead.createdBy ||
                    null,
                }
              : null;

          return {
            ...quotation,

            leadId:
              safeLead,

            requestedBy:
              requestedBy ||
              assignedTo ||
              createdBy || {
                fullName:
                  'Sales Representative',
              },
          };
        }
      );

    return ok(
      res,
      {
        quotations:
          formattedQuotations,
      },
      'Quotations retrieved successfully',
      200,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

async function approveQuotation(
  req,
  res,
  next
) {
  try {
    if (
      !isValidObjectId(
        req.params.id
      )
    ) {
      return fail(
        res,
        400,
        'INVALID_ID',
        'A valid quotation ID is required.',
        [],
        req
      );
    }

    const {
      approvedPrice,
    } = req.body || {};

    if (
      !validatePositiveOptionalAmount(
        approvedPrice
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'approvedPrice must be a positive number.',
        [],
        req
      );
    }

    const quotation =
      await quotationService.approveQuotation(
        {
          id:
            req.params.id,

          approvedPrice:
            approvedPrice ===
              undefined ||
            approvedPrice ===
              null ||
            approvedPrice ===
              ''
              ? undefined
              : Number(
                  approvedPrice
                ),

          actorId:
            getActorObjectId(
              req.user
            ),
        }
      );

    return ok(
      res,
      {
        quotation,
      },
      'Quotation approved successfully',
      200,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

async function rejectQuotation(
  req,
  res,
  next
) {
  try {
    if (
      !isValidObjectId(
        req.params.id
      )
    ) {
      return fail(
        res,
        400,
        'INVALID_ID',
        'A valid quotation ID is required.',
        [],
        req
      );
    }

    const {
      marginNote,
    } = req.body || {};

    const quotation =
      await quotationService.rejectQuotation(
        {
          id:
            req.params.id,

          marginNote:
            cleanText(
              marginNote,
              5000
            ),

          actorId:
            getActorObjectId(
              req.user
            ),
        }
      );

    return ok(
      res,
      {
        quotation,
      },
      'Quotation rejected successfully',
      200,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

async function markSentToCustomer(
  req,
  res,
  next
) {
  try {
    if (
      !isValidObjectId(
        req.params.id
      )
    ) {
      return fail(
        res,
        400,
        'INVALID_ID',
        'A valid quotation ID is required.',
        [],
        req
      );
    }

    const existing =
      await Quotation.findById(
        req.params.id
      )
        .select(
          '_id leadId requestedBy'
        )
        .lean();

    if (!existing) {
      return fail(
        res,
        404,
        'QUOTATION_NOT_FOUND',
        'Quotation not found.',
        [],
        req
      );
    }

    const lead =
      await Lead.findById(
        existing.leadId
      )
        .select(
          '_id assignedTo createdBy'
        )
        .lean();

    if (!lead) {
      return fail(
        res,
        404,
        'LEAD_NOT_FOUND',
        'Lead not found.',
        [],
        req
      );
    }

    const identities =
      getIdentityCandidates(
        req.user
      );

    const allowed =
      isManagementUser(
        req.user
      ) ||
      hasQuotationPermission(
        req.user
      ) ||
      identityMatches(
        existing.requestedBy,
        identities
      ) ||
      identityMatches(
        lead.assignedTo,
        identities
      ) ||
      identityMatches(
        lead.createdBy,
        identities
      );

    if (!allowed) {
      return fail(
        res,
        403,
        'RBAC_FORBIDDEN',
        'You do not have permission to send this quotation.',
        [],
        req
      );
    }

    const quotation =
      await quotationService.sendToCustomer(
        req.params.id,
        getActorObjectId(
          req.user
        )
      );

    return ok(
      res,
      {
        quotation,
      },
      'Quotation status updated: Sent to Customer',
      200,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

async function getSummaryReport(
  req,
  res,
  next
) {
  try {
    const summary =
      await quotationService.getQuotationSummary();

    return ok(
      res,
      summary,
      'Quotation summary report retrieved',
      200,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

async function bulkApproveQuotations(
  req,
  res,
  next
) {
  try {
    const {
      quotationIds,
      approvedPrice,
    } = req.body || {};

    if (
      !Array.isArray(
        quotationIds
      ) ||
      quotationIds.length ===
        0
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'quotationIds must be a non-empty array.',
        [],
        req
      );
    }

    const invalidIds =
      quotationIds.filter(
        (id) =>
          !isValidObjectId(
            id
          )
      );

    if (
      invalidIds.length
    ) {
      return fail(
        res,
        400,
        'INVALID_ID',
        'One or more quotation IDs are invalid.',
        [],
        req
      );
    }

    if (
      !validatePositiveOptionalAmount(
        approvedPrice
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'approvedPrice must be a positive number when supplied.',
        [],
        req
      );
    }

    const result =
      await quotationService.bulkApproveQuotations(
        {
          quotationIds: [
            ...new Set(
              quotationIds.map(
                String
              )
            ),
          ],

          approvedPrice:
            approvedPrice ===
              undefined ||
            approvedPrice ===
              null ||
            approvedPrice ===
              ''
              ? undefined
              : Number(
                  approvedPrice
                ),

          actorId:
            getActorObjectId(
              req.user
            ),
        }
      );

    return ok(
      res,
      result,
      `Successfully approved ${result.approvedCount} quotation(s)`,
      200,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

async function bulkRejectQuotations(
  req,
  res,
  next
) {
  try {
    const {
      quotationIds,
      marginNote,
    } = req.body || {};

    if (
      !Array.isArray(
        quotationIds
      ) ||
      quotationIds.length ===
        0
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'quotationIds must be a non-empty array.',
        [],
        req
      );
    }

    const invalidIds =
      quotationIds.filter(
        (id) =>
          !isValidObjectId(
            id
          )
      );

    if (
      invalidIds.length
    ) {
      return fail(
        res,
        400,
        'INVALID_ID',
        'One or more quotation IDs are invalid.',
        [],
        req
      );
    }

    const result =
      await quotationService.bulkRejectQuotations(
        {
          quotationIds: [
            ...new Set(
              quotationIds.map(
                String
              )
            ),
          ],

          marginNote:
            cleanText(
              marginNote,
              5000
            ),

          actorId:
            getActorObjectId(
              req.user
            ),
        }
      );

    return ok(
      res,
      result,
      `Successfully rejected ${result.rejectedCount} quotation(s)`,
      200,
      req
    );

  } catch (error) {
    const handled =
      sendServiceError(
        res,
        error,
        req
      );

    if (handled) {
      return handled;
    }

    return next(
      error
    );
  }
}

module.exports = {
  requestQuotation,
  pendingQuotations,
  approveQuotation,
  rejectQuotation,
  bulkApproveQuotations,
  bulkRejectQuotations,
  markSentToCustomer,
  getSummaryReport,
};