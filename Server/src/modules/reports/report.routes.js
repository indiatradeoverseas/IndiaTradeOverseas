const router = require('express').Router();

const {
  authenticate,
} = require('../../middlewares/auth.middleware');

const rbac =
  require('../../middlewares/rbac.middleware');

const {
  getAdminSummary,
  getPipelineReport,
  getPerformanceReport,
} = require('./report.controller');


/*
 * Master DPR v4.0
 *
 * Reporting is management-only.
 *
 * campaignGovernance.isManagement() remains the centralized
 * Master DPR management check.
 *
 * Existing production RBAC roles are preserved as a fallback
 * so CEO / Founder / Super Admin access is not regressed.
 */
router.use(
  authenticate,

  (req, res, next) => {
    try {
      const {
        isManagement,
      } =
        require(
          '../marketing/campaignGovernance'
        );

      if (
        typeof isManagement ===
          'function' &&
        isManagement(
          req.user
        )
      ) {
        return next();
      }
    } catch (error) {
      /*
       * Governance lookup failure must not silently grant access.
       * Fall through to explicit RBAC below.
       */
    }

    return rbac(
      'ADMIN',
      'MANAGER',
      'CEO',
      'FOUNDER',
      'SUPER_ADMIN'
    )(
      req,
      res,
      next
    );
  }
);


router.get(
  '/admin-summary',
  getAdminSummary
);

router.get(
  '/employee-performance',
  getPerformanceReport
);

router.get(
  '/employee/:id/performance',
  getPerformanceReport
);

router.get(
  '/pipeline',
  getPipelineReport
);


module.exports = router;