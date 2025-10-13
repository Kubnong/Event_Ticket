const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  purchase_date: {
    type: Date,
    default: Date.now,
  },
  ticket_code: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["active", "used", "cancelled"],
    default: "active",
  },
  quantity: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model('Ticket', ticketSchema);