const mongoose = require("mongoose");

const dailyReportSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    completedWork: {
      type: String,
      default: "",
    },
    callsMade: {
      type: Number,
      default: 0,
    },
    followupsCompleted: {
      type: Number,
      default: 0,
    },
    hotLeadsHandled: {
      type: Number,
      default: 0,
    },
    pendingWork: {
      type: String,
      default: "",
    },
    problemsEncountered: {
      type: String,
      default: "",
    },
    tomorrowPlan: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

dailyReportSchema.index({ employeeId: 1, date: 1 });

module.exports = mongoose.model("DailyReport", dailyReportSchema);