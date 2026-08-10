const mongoose = require("mongoose");

const DistributorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },

    // Compliance Documents
    doc1Path: {
      type: String,
      required: false,
    }, // GST Certificate (optional initially)
    doc2Path: {
      type: String,
    }, // Udyam Certificate (Optional)

    doc1Data: {
      type: Buffer,
      required: false,
    },
    doc1Name: {
      type: String,
      required: false,
    },
    doc1MimeType: {
      type: String,
      required: false,
    },
    doc2Data: {
      type: Buffer,
      required: false,
    },
    doc2Name: {
      type: String,
      required: false,
    },
    doc2MimeType: {
      type: String,
      required: false,
    },

    city: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      default: "India",
    },

    // Optional Sourcing Parameters for Admin CRM panel compatibility.
    // No division-specific default here: the lightweight quick-gate signup
    // (Tea/Rice/Stone) never collects a company name, and a Tea-flavored
    // fallback previously leaked into Rice/Stone records. A division-aware
    // fallback is applied in the controller instead, at creation time.
    company: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    teaType: {
      type: String,
    },
    monthlyReq: {
      type: Number,
      default: 0,
    },
    purpose: {
      type: String,
      default: "Wholesale Sourcing",
    },
    businessType: {
      type: String,
      default: "1",
    },
    // Distinguishes the new lightweight name/email/phone/location + OTP entry
    // gate (auto-approved on OTP verify) from the legacy full KYC registration
    // flow (GST/Udyam certificate upload, manual staff approval in the CRM).
    registrationSource: {
      type: String,
      default: "STANDARD_KYC",
      enum: ["STANDARD_KYC", "QUICK_GATE"],
    },
    division: {
      type: String,
      default: "TEA",
      enum: ["TEA", "RICE", "COAL", "STONE"],
    },

    // Security Tokens & Lifecycles
    otpToken: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },

    // Layer 4 & 5 Verification States
    approvalStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Distributor", DistributorSchema);