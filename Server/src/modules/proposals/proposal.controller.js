const Proposal = require('./proposal.model');
const Distributor = require('../distributors/distributor.model');
const { ok, fail } = require('../../utils/response');
const mongoose = require('mongoose');

const createProposal = async (req, res, next) => {
  try {
    const { distributorId, lotId, region, grade, quantity, basePrice } = req.body;

    if (!distributorId || !lotId || !quantity || !basePrice) {
      return fail(res, 400, 'VALIDATION_ERROR', "Missing essential transaction matrix parameters.", [], req);
    }

    if (Number(quantity) < 200) {
      return fail(res, 400, 'COMPLIANCE_VIOLATION', "Compliance Violation: Minimum trade scale constraint is 200 Kg.", [], req);
    }

    const distributor = await Distributor.findById(distributorId);
    if (!distributor || distributor.approvalStatus !== 'approved') {
      return fail(res, 403, 'ACCESS_DENIED', "Access Denied: Sourcing terminal locked for unverified entities.", [], req);
    }

    const estimatedValue = Number(quantity) * Number(basePrice);

    const newProposal = await Proposal.create({
      distributorId,
      lotId,
      region,
      grade,
      quantity,
      basePrice,
      estimatedValue,
      status: 'pending'
    });

    return ok(res, newProposal, `Trade proposal logged successfully under reference lot ${lotId}.`, 201, req);

  } catch (error) {
    console.error("Error creating procurement proposal:", error);
    next(error);
  }
};

const getAllProposals = async (req, res, next) => {
  try {
    const proposals = await Proposal.find()
      .populate('distributorId', 'company name email approvalStatus')
      .sort({ createdAt: -1 });

    return ok(res, proposals, "Retrieved active proposals ledger successfully", 200, req);
  } catch (error) {
    console.error("Error retrieving active proposals ledger:", error);
    next(error);
  }
};

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

const getProposalsByDistributorId = async (req, res, next) => {
  try {
    const { distributorId } = req.params;

    // Validate parameter presence & sanitize corrupted string values
    if (!distributorId || distributorId === 'undefined' || distributorId === 'null') {
      return fail(res, 400, 'VALIDATION_ERROR', "A valid Distributor ID is required.", [], req);
    }

    // Safely cast to Mongoose ObjectId if valid hex format
    const isValidObjectId = mongoose.Types.ObjectId.isValid(distributorId);
    const targetId = isValidObjectId ? new mongoose.Types.ObjectId(distributorId) : distributorId;

    // Query matching proposals
    const proposals = await Proposal.find({
      $or: [
        { distributorId: targetId },
        { distributor: targetId },
        { distributorId: distributorId },
        { distributor: distributorId }
      ]
    }).sort({ createdAt: -1 });

    return ok(res, proposals, "Proposals fetched successfully", 200, req);

  } catch (error) {
    console.error('Error fetching proposals for distributor:', error);
    next(error);
  }
};

module.exports = {
  createProposal,
  getAllProposals,
  updateProposalStatus,
  getProposalsByDistributorId
};
