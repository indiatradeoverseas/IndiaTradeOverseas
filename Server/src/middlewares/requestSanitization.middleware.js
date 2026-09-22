const {
  fail
} = require('../utils/response');


/* ============================================================
   MASTER DPR v4.0 — REQUEST INPUT SANITIZATION

   Purpose:
   - reject Mongo operator injection keys such as "$where"
   - reject prototype-pollution keys
   - reject null-byte field names
   - preserve legitimate request values exactly as received

   IMPORTANT:
   This middleware does NOT HTML-escape, trim or rewrite business
   data, so existing CRM, quotations, chat, careers, analytics,
   leads and other working flows remain unchanged.
============================================================ */


const FORBIDDEN_KEYS =
  new Set([
    '__proto__',
    'prototype',
    'constructor'
  ]);


const MAX_INPUT_DEPTH = 30;


/* ============================================================
   HELPERS
============================================================ */

function getSafePath(req) {
  return String(
    req?.originalUrl ||
    req?.url ||
    ''
  ).split('?')[0];
}


function inspectValue(
  value,
  source,
  depth = 0,
  seen = new WeakSet()
) {

  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return null;
  }


  /*
   * Buffers/files are binary data, not request object structures.
   */
  if (
    Buffer.isBuffer(value) ||
    value instanceof Date
  ) {
    return null;
  }


  if (
    depth > MAX_INPUT_DEPTH
  ) {
    return {
      code: 'INPUT_TOO_DEEP',
      source
    };
  }


  if (
    seen.has(value)
  ) {
    return null;
  }

  seen.add(value);


  if (
    Array.isArray(value)
  ) {

    for (
      let index = 0;
      index < value.length;
      index += 1
    ) {

      const issue =
        inspectValue(
          value[index],
          source,
          depth + 1,
          seen
        );

      if (issue) {
        return issue;
      }
    }

    return null;
  }


  for (
    const key of Object.keys(value)
  ) {

    /*
     * MongoDB query/update operators supplied by a client should
     * never reach application database operations directly.
     *
     * Examples:
     *   $where
     *   $ne
     *   $gt
     *   $set
     */
    if (
      key.startsWith('$')
    ) {
      return {
        code:
          'UNSAFE_FIELD_NAME',
        source
      };
    }


    /*
     * Protect against prototype-pollution style payloads.
     */
    if (
      FORBIDDEN_KEYS.has(key)
    ) {
      return {
        code:
          'UNSAFE_FIELD_NAME',
        source
      };
    }


    /*
     * Null bytes should never appear in application field names.
     */
    if (
      key.includes('\0')
    ) {
      return {
        code:
          'UNSAFE_FIELD_NAME',
        source
      };
    }


    const issue =
      inspectValue(
        value[key],
        source,
        depth + 1,
        seen
      );

    if (issue) {
      return issue;
    }
  }


  return null;
}


/* ============================================================
   REQUEST SANITIZATION MIDDLEWARE
============================================================ */

function sanitizeRequest(
  req,
  res,
  next
) {

  const sources = [
    {
      name: 'body',
      value: req.body
    },

    {
      name: 'query',
      value: req.query
    },

    {
      name: 'params',
      value: req.params
    }
  ];


  for (
    const source of sources
  ) {

    const issue =
      inspectValue(
        source.value,
        source.name
      );


    if (!issue) {
      continue;
    }


    /*
     * Privacy-safe operational logging.
     *
     * Never log the submitted request body or sensitive values.
     */
    console.warn(
      '[Request Sanitization] Request rejected',
      {
        requestId:
          req?.id || null,

        method:
          req?.method || null,

        path:
          getSafePath(req),

        source:
          issue.source,

        reason:
          issue.code
      }
    );


    if (
      issue.code ===
      'INPUT_TOO_DEEP'
    ) {
      return fail(
        res,
        400,
        'INVALID_INPUT',
        'Request structure is too deeply nested',
        [],
        req
      );
    }


    return fail(
      res,
      400,
      'INVALID_INPUT',
      'Request contains an unsupported field name',
      [],
      req
    );
  }


  return next();
}


module.exports = {
  sanitizeRequest
};