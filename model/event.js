const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image_url: {
    type: String,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["Concert", "Conference", "Sports", "Festival", "Workshop"],
    default: "Conference",
  },
  price: {
    type: Number,
    required: true,
  },
  available_tickets: {
    type: Number,
    required: true,
  },
  organizer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Event', eventSchema);