const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["LEAD", "USER", "QUOTATION", "DISPATCH", "PAYMENT", "PUBLIC"],
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.ownerType !== "PUBLIC";
      },
      default: null,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: "",
    },
    storagePath: {
      type: String,
      required: true,
    },
    fileData: {
      type: Buffer,
      select: false,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    accessLevel: {
      type: String,
      enum: [
        "PUBLIC",
        "INTERNAL",
        "RESTRICTED",
        "ADMIN",
        // Roles
        "MANAGER",
        "SALES",
        "PROCUREMENT",
        "ACCOUNTS",
        "HR",
        "IT",
        "FINANCE",
        "SOFTWARE_ENGINEER",
        // Departments / Products
        "STONE",
        "COAL",
        "TEA",
        "RICE",
        "TRANSPORT",
      ],
      default: "RESTRICTED",
    },
    checksum: {
      type: String,
      default: "",
    },
    virusScanStatus: {
      type: String,
      enum: ["PENDING", "CLEAN", "FLAGGED"],
      default: "PENDING",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    checksum: { type: String, default: '' },
    virusScanStatus: { type: String, enum: ['PENDING', 'CLEAN', 'FLAGGED'], default: 'PENDING' },
    isDeleted: { type: Boolean, default: false },
    exportDocType: {
      type: String,
      enum: [
        'SCO', 'FCO', 'ICPO', 'LOI', 'NCNDA', 'IMFPA',
        'PURCHASE_ORDER', 'PROFORMA_INVOICE', 'COMMERCIAL_INVOICE', 'PACKING_LIST',
        'COO', 'PHYTOSANITARY_CERTIFICATE', 'TEST_REPORT', 'BL', 'AWB', 'INSURANCE', 'OTHER'
      ],
      default: 'OTHER'
    },
    approvalStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    approvalNote: { type: String, default: '' },
    version: { type: Number, default: 1 },
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null }
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ ownerType: 1, ownerId: 1, accessLevel: 1 });

module.exports = mongoose.model("Document", documentSchema);