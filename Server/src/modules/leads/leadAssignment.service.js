const Lead = require('./lead.model');
const User = require('../users/user.model');
const Notification = require('../notifications/notification.model');
const { recordAudit } = require('../security-audit/auditLog.service');


async function autoRouteLead(lead) {
  let assignedDepartment = null;
  let assignedTo = null;
  let adminReviewRequired = false;

  const product = String(lead.productCategory).toUpperCase();

  
  if (product.includes('STONE')) {
    assignedDepartment = 'STONE';
  } else if (product.includes('COAL')) {
    assignedDepartment = 'COAL';
  } else if (product.includes('TEA')) {
    assignedDepartment = 'TEA';
  } else if (product.includes('RICE')) {
    assignedDepartment = 'RICE';
  } else if (product.includes('TRANSPORT')) {
    assignedDepartment = 'TRANSPORT';
  } else {
    
    adminReviewRequired = true;
  }

  
  if (assignedDepartment && !adminReviewRequired) {
    
    const employee = await User.findOne({
      department: assignedDepartment,
      role: 'SALES',
      isActive: true
    });

    if (employee) {
      assignedTo = employee._id;
    }
  }

  
  lead.assignedDepartment = assignedDepartment;
  lead.assignedTo = assignedTo;
  
  if (assignedTo) {
    lead.stage = 'LEAD_QUALIFICATION'; 
  }
  
  await lead.save();

  
  if (assignedTo || assignedDepartment) {
    const message = assignedTo 
      ? `A new lead ${lead.leadCode} has been automatically assigned to you.`
      : `A new lead ${lead.leadCode} has been routed to your department (${assignedDepartment}).`;

    await Notification.create({
      targetUserId: assignedTo || null,
      targetDepartment: assignedTo ? null : assignedDepartment,
      message,
      type: 'TASK_ASSIGNMENT',
      metadata: { leadId: lead._id }
    });

    try {
      const auditFn = recordAudit || require('../security-audit/auditLog.service').recordAudit;
      if (typeof auditFn === 'function') {
        await auditFn({
          actionType: 'LEAD_ASSIGNED',
          entityType: 'LEAD',
          entityId: lead._id.toString(),
          severity: 'LOW',
          metadata: { assignedTo, assignedDepartment }
        });
      }
    } catch (auditErr) {
      console.warn('[LeadAssignment Audit Notice]:', auditErr.message);
    }
  }

  return {
    assignedTo,
    assignedDepartment,
    adminReviewRequired: adminReviewRequired || (!assignedTo && !assignedDepartment)
  };
}

module.exports = { autoRouteLead };
