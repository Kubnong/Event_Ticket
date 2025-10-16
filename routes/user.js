const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../model/user");
const Event = require("../model/event");
const Ticket = require("../model/ticket");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../auth/auth");
const QRCode = require('qrcode');

// Home Page
router.get("/", async (req, res) => {
  let user;
  const token = req.cookies.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id);
    } catch (err) {
      user = undefined;
    }
  }

  const q = req.query.q;
  let events;
  
  if (q) {
    const regex = new RegExp(q, "i");
    events = await Event.find({
      $or: [
        { title: regex },
        { category: regex },
        { location: regex },
        { description: regex },
      ],
    }).populate("organizer_id");
  } else {
    events = await Event.find().populate("organizer_id");
  }

  res.render("home_page", { pageTitle: "หน้าหลัก", events, user });
});

// Sign Up Page
router.get("/signup", (req, res) => {
  res.render("sign_up", { pageTitle: "สมัครสมาชิก" });
});

// Create User
router.post("/create_user", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const checkEmail = await User.findOne({ email });
    
    if (checkEmail) {
      return res.status(400).json({ msg: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashPassword,
      role: role || "attendee",
    });

    await user.save();

    res.status(201).json({
      msg: "สมัครสมาชิกสำเร็จ",
      user: { email: user.email },
    });
  } catch (error) {
    res.status(500).json({ msg: "สมัครสมาชิกล้มเหลว", error: error.message });
  }
});

// Event Detail
router.get("/event/:id", async (req, res) => {
  let user;
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id);
    } catch (err) {
      user = undefined;
    }
  }

  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId).populate("organizer_id");

    if (!event) {
      return res.status(404).render("404", { pageTitle: "ไม่พบกิจกรรม" });
    }

    res.render("event_detail", { pageTitle: event.title, event, user });
  } catch (error) {
    res.status(500).send("เกิดข้อผิดพลาดในเซิร์ฟเวอร์");
  }
});

// Add to Cart
router.post("/add-to-cart/:id", authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { quantity } = req.body;
    const user = req.user;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ msg: "ไม่พบกิจกรรม" });
    }

    const alreadyInCart = user.cart_items.some(
      (item) => item.event_id.toString() === eventId
    );

    if (alreadyInCart) {
      return res.status(400).json({ msg: "กิจกรรมนี้อยู่ในตะกร้าแล้ว" });
    }

    user.cart_items.push({
      event_id: event._id,
      quantity: quantity || 1,
      price: event.price * (quantity || 1),
    });

    await user.save();
    res.json({ msg: "เพิ่มเข้าตะกร้าสำเร็จ" });
  } catch (err) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาด" });
  }
});

// View Cart
router.get("/cart", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const userWithCart = await User.findById(user._id).populate(
      "cart_items.event_id"
    );

    const cartItems = userWithCart.cart_items;
    const totalItems = cartItems.length;
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

    res.render("cart", {
      pageTitle: "ตะกร้าสินค้า",
      cartItems,
      totalItems,
      totalPrice,
    });
  } catch (err) {
    res.status(500).send("Server Error!");
  }
});

// Remove from Cart
router.delete("/cart/remove/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const cartItemId = req.params.id;

    await User.findByIdAndUpdate(userId, {
      $pull: { cart_items: { _id: cartItemId } },
    });

    const userWithCart = await User.findById(userId).populate(
      "cart_items.event_id"
    );

    const cartItems = userWithCart.cart_items;
    const totalItems = cartItems.length;
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

    res.json({
      cartItems,
      totalItems,
      totalPrice,
    });
  } catch (err) {
    res.status(500).send("Server Error!");
  }
});

// Checkout
router.post("/cart/checkout", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("cart_items.event_id");

    if (user.cart_items.length === 0) {
      return res.status(400).json({ msg: "ตะกร้าว่างเปล่า" });
    }

    // Create tickets for each cart item
    for (const item of user.cart_items) {
      const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const ticket = new Ticket({
        event_id: item.event_id._id,
        user_id: userId,
        ticket_code: ticketCode,
        quantity: item.quantity,
      });

      await ticket.save();

      // Update event available tickets
      await Event.findByIdAndUpdate(item.event_id._id, {
        $inc: { available_tickets: -item.quantity },
      });

      user.purchased_tickets.push({ ticket_id: ticket._id });
    }

    user.cart_items = [];
    await user.save();

    res.json({ msg: "ซื้อตั๋วสำเร็จ!" });
  } catch (err) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// My Tickets
router.get("/my-tickets", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "purchased_tickets.ticket_id",
      populate: { path: "event_id" },
    });

    // ดึงเฉพาะ ticket object
    const myTickets = user.purchased_tickets.map(item => item.ticket_id);

    // ✅ เพิ่ม QR Code ให้แต่ละ ticket
    const ticketsWithQR = await Promise.all(
      myTickets.map(async (tk) => {
        const qrText = `https://webhook.site/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/${tk.ticket_code}`;
        const qrDataURL = await QRCode.toDataURL(qrText, {
          width: 200,
          margin: 2,
          color: {
            dark: '#e50914',
            light: '#00000000'
          }
        });
        return { ...tk.toObject(), qrDataURL };
      })
    );

    res.render("my_ticket", { pageTitle: "ตั๋วของฉัน", myTickets: ticketsWithQR });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error!");
  }
});

// View Profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.render("profile", {
      pageTitle: "โปรไฟล์ของฉัน",
      user,
    });
  } catch (err) {
    res.status(500).send("Server Error!");
  }
});

// Update password
router.post("/profile/update-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "รหัสผ่านเดิมไม่ถูกต้อง" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ msg: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (err) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาดในการอัปเดต" });
  }
});

// Ticket history
router.get("/ticket-history", authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user_id: req.user._id })
      .populate("event_id")
      .sort({ createdAt: -1 });

    res.render("ticket_history", {
      pageTitle: "ประวัติบัตรของฉัน",
      tickets,
    });
  } catch (err) {
    res.status(500).send("Server Error!");
  }
});

module.exports = router;