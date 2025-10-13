const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["attendee", "organizer"],
    default: "attendee",
  },
  purchased_tickets: [
    {
      ticket_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ticket",
      },
    },
  ],
  cart_items: [
    {
      event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
      quantity: {
        type: Number,
        default: 1,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model('User', userSchema);