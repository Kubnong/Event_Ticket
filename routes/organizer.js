const express = require("express");
const router = express.Router();
const Event = require("../model/event");
const Ticket = require("../model/ticket");
const authMiddleware = require("../auth/auth");

const role = "organizer";

// Dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== role) {
      return res.redirect("/signin");
    }

    const events = await Event.find({ organizer_id: user._id });
    res.render("dashboard_organizer", { pageTitle: "แดชบอร์ด", events });
  } catch (err) {
    res.status(500).send("เกิดข้อผิดพลาด: " + err.message);
  }
});

// Create Event Page
router.get("/create-event", authMiddleware, (req, res) => {
  const user = req.user;
  if (user.role !== role) {
    return res.redirect("/signin");
  }
  res.render("create_event", { pageTitle: "สร้างกิจกรรม" });
});

// Create Event
router.post("/create-event", authMiddleware, async (req, res) => {
  try {
    const { title, description, image_url, date, time, location, category, price, available_tickets } = req.body;
    
    const event = new Event({
      title,
      description,
      image_url,
      date,
      time,
      location,
      category,
      price: parseFloat(price),
      available_tickets: parseInt(available_tickets),
      organizer_id: req.user._id,
    });

    await event.save();
    res.status(201).json({
      msg: "สร้างกิจกรรมสำเร็จ",
      event: event,
    });
  } catch (err) {
    res.status(500).json({ msg: "สร้างกิจกรรมล้มเหลว", error: err.message });
  }
});

// Get Event
router.get("/event/:id", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== role) {
      return res.redirect("/signin");
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "ไม่พบกิจกรรม" });
    
    res.json(event);
  } catch (err) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาด", err });
  }
});

// Update Event
router.put("/event/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description, image_url, date, time, location, category, price, available_tickets } = req.body;
    
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        image_url,
        date,
        time,
        location,
        category,
        price,
        available_tickets,
      },
      { new: true }
    );

    if (!event) return res.status(404).json({ msg: "ไม่พบกิจกรรม" });
    
    res.json({ msg: "แก้ไขกิจกรรมสำเร็จ", event });
  } catch (err) {
    res.status(500).json({ msg: "แก้ไขกิจกรรมล้มเหลว", error: err.message });
  }
});

// Delete Event
router.delete("/event/:id", authMiddleware, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    
    if (!event) {
      return res.status(404).json({ msg: "ไม่พบกิจกรรม" });
    }

    res.json({ msg: "ลบกิจกรรมสำเร็จ", event });
  } catch (err) {
    res.status(500).json({ msg: "ลบกิจกรรมล้มเหลว", error: err.message });
  }
});

module.exports = router;