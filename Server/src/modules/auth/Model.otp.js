
const mongoose = require("mongoose");
const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is required"]
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: false
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: false
    },
    otpHash: {
        type: String,
        required: [true, "OTP hash is required"]
    }
}, {
    timestamps: true
})

const otpModel = mongoose.model("otps", otpSchema)

module.exports = otpModel;