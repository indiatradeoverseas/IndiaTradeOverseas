const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phoneEncrypted: {
      type: String,
      required: true,
    },
    phoneMasked: {
      type: String,
      required: true,
    },
    phoneHash: {
      type: String,
      required: true,
      index: true,
    },
    licenseNo: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "ON_TRIP", "INACTIVE"],
      default: "AVAILABLE",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Driver", driverSchema);