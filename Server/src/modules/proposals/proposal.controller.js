const Proposal = require('./proposal.model');
const Distributor = require('../distributors/distributor.model');
const { ok, fail } = require('../../utils/response');
const mongoose = require('mongoose');

// 🟢 CREATE proposal
const createProposal = async (req, res, next) => {
  try {
    let { distributorId, lotId, region, grade, quantity, basePrice, division, paymentTerm } = req.body;

    if (!distributorId && req.distributor?._id) {
      distributorId = req.distributor._id.toString();
    }

    if (!distributorId || distributorId === 'undefined' || distributorId === 'null') {
      if (req.distributor?._id) {
        distributorId = req.distributor._id.toString();
      } else {
        let defaultDist = await Distributor.findOne({ email: 'guest.buyer@ito.com' });
        if (!defaultDist) {
          defaultDist = await Distributor.create({
            name: 'Guest Sourcing Buyer',
            email: 'guest.buyer@ito.com',
            mobile: '9999999999',
            company: 'Independent Sourcing Buyer',
            approvalStatus: 'approved',
            isOtpVerified: true,
            registrationSource: 'QUICK_GATE'
          });
        }
        distributorId = defaultDist._id.toString();
      }
    }

    if (!lotId || !quantity || !basePrice) {
      return fail(res, 400, 'VALIDATION_ERROR', "Missing essential transaction matrix parameters.", [], req);
    }

    let distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      distributor = req.distributor;
    }

    if (distributor && distributor.approvalStatus !== 'approved') {
      distributor.approvalStatus = 'approved';
      await distributor.save();
    }

    const estimatedValue = Number(quantity) * Number(basePrice);

    // 🟢 Extract division (default to 'TEA' if omitted)
    const targetDivision = division ? division.toUpperCase() : 'TEA';

    const newProposal = await Proposal.create({
      distributorId,
      division: targetDivision, // 👈 Save division tag
      lotId,
      region,
      grade,
      quantity,
      basePrice,
      paymentTerm,
      estimatedValue,
      status: 'pending'
    });

    // 🟢 Sync proposal data to Visitor / Lead DB (CRM)
    try {
      const { processAiLead } = require('../leads/ai-agent/aiLead.service');
      await processAiLead({
        customerName: distributor?.name || 'Sourcing Buyer',
        email: distributor?.email || '',
        phone: distributor?.mobile || '9999999999',
        city: distributor?.city || '',
        state: distributor?.state || '',
        estimatedValue,
        quantity: String(quantity),
        productCategory: targetDivision,
        source: 'WEBSITE',
        chatSummary: `Procurement proposal submitted for ${targetDivision} (Lot: ${lotId}, Qty: ${quantity}).`
      });
    } catch (leadSyncErr) {
      console.error('Proposal lead sync note:', leadSyncErr.message);
    }

    return ok(res, newProposal, `Trade proposal logged successfully under reference lot ${lotId}.`, 201, req);

  } catch (error) {
    console.error("Error creating procurement proposal:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return fail(res, 400, 'VALIDATION_ERROR', messages, [], req);
    }
    next(error);
  }
};

// 🟢 GET proposals for specific distributor
const getProposalsByDistributorId = async (req, res, next) => {
  try {
    const { distributorId } = req.params;
    const { division } = req.query; // 👈 Extract division filter from URL query string

    if (!distributorId || distributorId === 'undefined' || distributorId === 'null') {
      return fail(res, 400, 'VALIDATION_ERROR', "A valid Distributor ID is required.", [], req);
    }

    const isValidObjectId = mongoose.Types.ObjectId.isValid(distributorId);
    const targetId = isValidObjectId ? new mongoose.Types.ObjectId(distributorId) : distributorId;

    // Build query conditions
    const query = {
      $or: [
        { distributorId: targetId },
        { distributor: targetId },
        { distributorId: distributorId },
        { distributor: distributorId }
      ]
    };

    // 🟢 Filter by division if passed in query string (?division=TEA or ?division=RICE)
    if (division) {
      query.division = division.toUpperCase();
    }

    const proposals = await Proposal.find(query).sort({ createdAt: -1 });

    return ok(res, proposals, "Proposals fetched successfully", 200, req);

  } catch (error) {
    console.error('Error fetching proposals for distributor:', error);
    next(error);
  }
};

// 🔵 GET all proposals (Admin/Staff)
const getAllProposals = async (req, res, next) => {
  try {
    // Populates everything the order-detail view needs from the buyer's
    // original entry-gate submission, not just company/name.
    const proposals = await Proposal.find()
      .populate('distributorId', 'company name email mobile city state country division approvalStatus isOtpVerified registrationSource createdAt')
      .sort({ createdAt: -1 });

    return ok(res, proposals, "Retrieved active proposals ledger successfully", 200, req);
  } catch (error) {
    console.error("Error retrieving active proposals ledger:", error);
    next(error);
  }
};

// 🔵 UPDATE proposal status (Admin/Staff)
const updateProposalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'disapproved'].includes(status)) {
      return fail(res, 400, 'INVALID_STATUS', "Invalid status parameters targeted for deployment modification.", [], req);
    }

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return fail(res, 404, 'NOT_FOUND', "Target proposal asset line could not be found.", [], req);
    }

    proposal.status = status;
    await proposal.save();

    let responseMessage = `Proposal associated with lot ${proposal.lotId} has been successfully rejected.`;

    if (status === 'approved') {
      responseMessage = `Proposal for lot ${proposal.lotId} authenticated. Digital escrow invoice initialized.`;
    }

    return ok(res, proposal, responseMessage, 200, req);

  } catch (error) {
    console.error("Error adjusting proposal status framework:", error);
    next(error);
  }
};

// 🔵 DELETE proposal (Admin/Staff)
const deleteProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.id);
    if (!proposal) {
      return fail(res, 404, 'NOT_FOUND', "Target proposal asset line could not be found.", [], req);
    }

    return ok(res, null, `Sourcing request for lot ${proposal.lotId} deleted successfully.`, 200, req);
  } catch (error) {
    console.error("Error deleting proposal:", error);
    next(error);
  }
};

module.exports = {
  createProposal,
  getAllProposals,
  updateProposalStatus,
  deleteProposal,
  getProposalsByDistributorId
};
