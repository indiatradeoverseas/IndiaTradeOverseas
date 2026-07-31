const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema(
  {
    truckNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transporter: {
      type: String,
      default: "",
    },
    capacity: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "ASSIGNED", "MAINTENANCE"],
      default: "AVAILABLE",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Truck", truckSchema);