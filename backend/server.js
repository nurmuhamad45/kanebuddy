const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Constants
const HASH_LENGTH = 64; // SHA256 hex length

// Fungsi pembantu untuk hash password
function hashPasswordServer(password) {
  if (!password) return "";
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Constants
const SALT_ROUNDS = 10;
const MAX_REQUESTS_PER_HOUR = 100;
const MAX_REQUESTS_PER_MINUTE = 10;

// Simple rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

// Fungsi untuk validasi input
function validateTransaction(data) {
  const errors = [];
  // user_id sekarang didapat dari JWT token, bukan dari body
  if (!data.type || !["income", "expense"].includes(data.type)) errors.push("type must be income or expense");
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) errors.push("amount must be positive number");
  if (!data.category || typeof data.category !== "string") errors.push("category required");
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push("date must be YYYY-MM-DD format");
  return errors;
}

function validateGoal(data) {
  const errors = [];
  // user_id sekarang didapat dari JWT token, bukan dari body
  if (!data.name || typeof data.name !== "string") errors.push("name required");
  if (!data.target || isNaN(data.target) || data.target <= 0) errors.push("target must be positive number");
  return errors;
}

function validateBill(data) {
  const errors = [];
  if (!data.name || data.name.length < 3) errors.push("name min 3 chars");
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) errors.push("amount must be positive number");
  if (!data.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.due_date)) errors.push("invalid date format");
  return errors;
}

function validateTask(data) {
  const errors = [];
  if (!data.title || data.title.length < 3) errors.push("title min 3 chars");
  return errors;
}

// Fungsi rate limiting sederhana
function checkRateLimit(ip, endpoint) {
  const key = `${ip}-${endpoint}`;
  const now = Date.now();
  const windowMs = endpoint.includes("auth") ? 60000 : 3600000; // 1 min for auth, 1 hour for others
  const maxRequests = endpoint.includes("auth") ? MAX_REQUESTS_PER_MINUTE : MAX_REQUESTS_PER_HOUR;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimitStore.get(key);
  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Middleware rate limiting
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRateLimit(ip, req.path)) {
    return res.status(429).json({ error: "Too many requests, please try again later" });
  }
  next();
}

// Logging function
function logRequest(method, path, status, duration) {
  console.log(`[${new Date().toISOString()}] ${method} ${path} - ${status} - ${duration}ms`);
}

const app = express();
const port = process.env.PORT || 3000;

// JWT Secret (harus di .env file)
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_change_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// --- MIDDLEWARE: JWT Authentication ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Token tidak ditemukan. Silakan login terlebih dahulu." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token tidak valid atau sudah expired." });
    }
    req.user = user;
    next();
  });
}

// Middleware to check admin status
function adminOnly(req, res, next) {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ error: "Hanya admin yang dapat mengakses endpoint ini." });
  }
}

// --- 1. MIDDLEWARE ---
// Mengizinkan frontend (Live Server) mengakses backend tanpa diblokir browser
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests) or local file protocol ("null")
      if (!origin || origin === "null" || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }

      const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
// Agar backend bisa membaca data yang dikirim dari frontend dalam format JSON
app.use(express.json());

// Global rate limiting untuk semua API endpoints
app.use("/api/", rateLimitMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logRequest(req.method, req.path, res.statusCode, duration);
  });
  next();
});

// --- 2. KONFIGURASI DATABASE ---
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "budget_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Cek apakah database berhasil terhubung dan setup schema
db.getConnection((err, connection) => {
  if (err) {
    console.error("Ups! Gagal terhubung ke MySQL. Pastikan XAMPP menyala.", err.message);
    return;
  }
  const tables = ["transactions", "goals", "bills", "shifts", "tasks", "remittances", "documents", "nenkin"];
  let completed = 0;

  tables.forEach((table) => {
    // Cek apakah kolom user_id sudah ada
    connection.query(`SHOW COLUMNS FROM ${table} LIKE 'user_id'`, (err, results) => {
      if (err || results.length === 0) {
        // Kolom belum ada, tambahkan
        connection.query(`ALTER TABLE ${table} ADD COLUMN user_id VARCHAR(255) DEFAULT 'default_user'`, (alterErr) => {
          if (alterErr) console.warn(`Warning: Could not add user_id to ${table}:`, alterErr.message);
        });
      }
      completed++;
      if (completed === tables.length) {
        console.log("Yeay! Berhasil terhubung ke database ");
      }
    });
  });
  connection.release();
});

// --- 3. API ENDPOINTS (Rute Data) ---

// Route Tes: Untuk memastikan server jalan
app.get("/", (req, res) => {
  res.send("Backend Budget Management App berjalan lancar! 🚀");
});

// GET: Mengambil semua data transaksi dari database
app.get("/api/transactions", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const sql = "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST: Menambahkan data transaksi baru ke database
app.post("/api/transactions", authenticateToken, (req, res) => {
  const validationErrors = validateTransaction(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: validationErrors });
  }

  const userId = req.user.id; // ✅ Dari token
  const { type, amount, category, date, description } = req.body;
  const sql = "INSERT INTO transactions (user_id, type, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)";

  db.query(sql, [userId, type, amount, category, date, description], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Transaksi berhasil disimpan!", id: result.insertId });
  });
});

// DELETE: Menghapus transaksi dari database berdasarkan ID
app.delete("/api/transactions/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified token
  const transactionId = req.params.id;
  const sql = "DELETE FROM transactions WHERE id = ? AND user_id = ?";

  db.query(sql, [transactionId, userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Transaksi tidak ditemukan atau Anda tidak memiliki akses!" });
    res.json({ message: "Transaksi berhasil dihapus dari database!" });
  });
});

// ==========================================
// 🎯 API UNTUK GOALS
// ==========================================
app.get("/api/goals", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("SELECT * FROM goals WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/goals", authenticateToken, (req, res) => {
  const validationErrors = validateGoal(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: validationErrors });
  }

  const userId = req.user.id; // ✅ Dari token
  const { name, target, saved, deadline, color, icon } = req.body;
  const sql = "INSERT INTO goals (user_id, name, target, saved, deadline, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [userId, name, target, saved, deadline, color, icon], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Goal tersimpan!", id: result.insertId });
  });
});

// PUT: Update jumlah tabungan (saved) pada Goal
app.put("/api/goals/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  const { saved } = req.body;
  const sql = "UPDATE goals SET saved = ? WHERE id = ? AND user_id = ?";

  db.query(sql, [saved, req.params.id, userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Tabungan goal berhasil diupdate!" });
  });
});

app.delete("/api/goals/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("DELETE FROM goals WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Goal dihapus!" });
  });
});

// 🧾 API UNTUK BILLS (TAGIHAN)
// ==========================================
app.get("/api/bills", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("SELECT * FROM bills WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/bills", authenticateToken, (req, res) => {
  const validationErrors = validateBill(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: validationErrors });
  }

  const userId = req.user.id; // ✅ Dari token
  const { name, amount, due_date, category, paid } = req.body;
  const sql = "INSERT INTO bills (user_id, name, amount, due_date, category, paid) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [userId, name, amount, due_date, category, paid], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Tagihan tersimpan!", id: result.insertId });
  });
});

app.delete("/api/bills/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("DELETE FROM bills WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Tagihan dihapus!" });
  });
});

// ==========================================
// ⏰ API UNTUK SHIFT KERJA
// ⏰ API UNTUK SHIFT KERJA
// ==========================================
app.get("/api/shifts", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("SELECT * FROM shifts WHERE user_id = ? ORDER BY date DESC", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Rute untuk menambah Shift Baru
app.post("/api/shifts", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  const { date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings } = req.body;
  const query = `INSERT INTO shifts (user_id, date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(query, [userId, date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings], (err, results) => {
    if (err) {
      console.error("Gagal insert shift:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: results.insertId, message: "Shift berhasil disimpan dengan detail gaji!" });
  });
});

// PUT: Mengubah status shift menjadi sudah dicatat (recorded = true)
app.put("/api/shifts/:id/record", authenticateToken, (req, res) => {
  const sql = "UPDATE shifts SET recorded = true WHERE id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Status shift berhasil diupdate!" });
  });
});

app.delete("/api/shifts/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("DELETE FROM shifts WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Shift dihapus!" });
  });
});

// ==========================================
// ✅ API UNTUK TASKS
// ==========================================
app.get("/api/tasks", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("SELECT * FROM tasks WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/tasks", authenticateToken, (req, res) => {
  const validationErrors = validateTask(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: validationErrors });
  }

  const userId = req.user.id; // ✅ Dari token
  const { title, status, due_date, priority, tag } = req.body;
  const query = `INSERT INTO tasks (user_id, title, status, due_date, priority, tag) VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(query, [userId, title, status, due_date, priority, tag], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: results.insertId, message: "Task disimpan!" });
  });
});
// PUT: Update status task (misal dari pending -> completed)
app.put("/api/tasks/:id/status", authenticateToken, (req, res) => {
  const { status } = req.body;
  const sql = "UPDATE tasks SET status = ? WHERE id = ?";
  db.query(sql, [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Status task berhasil diupdate!" });
  });
});

app.delete("/api/tasks/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari token
  db.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Task dihapus!" });
  });
});

// ==========================================
// 💸 API UNTUK REMITTANCE (KIRIM UANG)
// ==========================================
app.get("/api/remittances", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM remittances WHERE user_id = ? ORDER BY date DESC", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/remittances", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { date, amount_jpy, exchange_rate, amount_idr, provider, notes } = req.body;
  const sql = "INSERT INTO remittances (user_id, date, amount_jpy, exchange_rate, amount_idr, provider, notes) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [userId, date, amount_jpy, exchange_rate, amount_idr, provider, notes], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Data kirim uang tersimpan!", id: result.insertId });
  });
});

app.delete("/api/remittances/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM remittances WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Data kirim uang dihapus!" });
  });
});

// ==========================================
// 🚨 API UNTUK DOKUMEN PENTING (ZAIRYU/KONTRAK)
// ==========================================
app.get("/api/documents", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM documents WHERE user_id = ? ORDER BY expiry_date ASC", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/documents", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { title, type, expiry_date, notes } = req.body;
  const sql = "INSERT INTO documents (user_id, title, type, expiry_date, notes) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [userId, title, type, expiry_date, notes], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Dokumen berhasil dicatat!", id: result.insertId });
  });
});

app.delete("/api/documents/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM documents WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Dokumen dihapus!" });
  });
});

// ==========================================
// 👤 API UNTUK USER (AUTHENTICATION)
// ==========================================

// 1. Register User Baru
app.post("/api/auth/register", async (req, res) => {
  const { id, name, email, password } = req.body;

  if (!id || !name || !email || !password) {
    return res.status(400).json({ error: "Semua field diperlukan!" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password minimal 6 karakter!" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Format email tidak valid!" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const sql = "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)";
    db.query(sql, [id, name, email, hashedPassword], (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Email sudah terdaftar!" });
        return res.status(500).json({ error: err.message });
      }

      // Generate JWT token after successful registration
      const token = jwt.sign({ id, email, name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.json({
        message: "Registrasi berhasil!",
        token,
        user: { id, name, email },
      });
    });
  } catch (hashError) {
    return res.status(500).json({ error: "Gagal memproses password." });
  }
});

// 2. Login User
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password diperlukan!" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: "Email atau password salah!" });

    const user = results[0];

    // Helper to issue token after successful verification
    function issueToken() {
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, password: undefined },
      });
    }

    // Detect if stored password is bcrypt (starts with $2)
    const isBcrypt = user.password && user.password.startsWith("$2");

    if (!isBcrypt) {
      // Legacy: plain text or sha256 comparison
      const sha256Hash = hashPasswordServer(password);
      if (password !== user.password && sha256Hash !== user.password) {
        return res.status(401).json({ error: "Email atau password salah!" });
      }
      // Upgrade legacy password to bcrypt silently
      bcrypt.hash(password, SALT_ROUNDS).then((newHash) => {
        db.query("UPDATE users SET password = ? WHERE id = ?", [newHash, user.id], (updateErr) => {
          if (updateErr) console.warn("Warning: Could not upgrade password hash:", updateErr.message);
        });
      });
      return issueToken();
    }

    // Standard bcrypt path
    bcrypt.compare(password, user.password, (compareErr, isMatch) => {
      if (compareErr) return res.status(500).json({ error: "Server error saat login." });
      if (!isMatch) return res.status(401).json({ error: "Email atau password salah!" });
      issueToken();
    });
  });
});

// 3. Update Profil (Nama, Password, Foto)
app.put("/api/auth/profile/:id", authenticateToken, (req, res) => {
  const { name, password, photo } = req.body;
  const userId = req.user.id; // ✅ Dari JWT token

  // Verify user is updating their own profile
  if (userId !== req.params.id) {
    return res.status(403).json({ error: "Anda hanya bisa update profil sendiri!" });
  }

  if (!name && !password && !photo) {
    return res.status(400).json({ error: "Setidaknya satu field harus diupdate!" });
  }

  let passToSave = password;
  if (password) {
    if (password.length < HASH_LENGTH) {
      // Plain text, hash it dengan bcrypt
      bcrypt.hash(password, SALT_ROUNDS, (hashErr, hashedPassword) => {
        if (hashErr) return res.status(500).json({ error: "Gagal hash password" });
        execProfileUpdate(hashedPassword);
      });
      return;
    }
    passToSave = password;
  }

  execProfileUpdate(passToSave);

  function execProfileUpdate(finalPassword) {
    const sql = "UPDATE users SET name = ?, password = ?, photo = ? WHERE id = ?";
    db.query(sql, [name, finalPassword, photo, userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Profil berhasil diperbarui!", success: true });
    });
  }
});

// 4. Hapus Akun
app.delete("/api/auth/:id", authenticateToken, (req, res) => {
  // Hanya boleh hapus akun sendiri
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Anda hanya bisa menghapus akun sendiri!" });
  }
  db.query("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Akun berhasil dihapus!" });
  });
});

// ==========================================
// 🛑 API UNTUK RESET SEMUA DATA
// ==========================================
// ⚠️ PROTECTED: Endpoint ini HANYA boleh diakses dengan confirmation password
// Untuk production, gunakan admin dashboard dengan MFA
app.delete("/api/reset", authenticateToken, adminOnly, (req, res) => {
  // Require a confirmation password for safety
  const { confirmPassword } = req.body;
  const ADMIN_RESET_PASSWORD = process.env.ADMIN_RESET_PASSWORD || "admin_reset_password_1234";

  if (!confirmPassword || confirmPassword !== ADMIN_RESET_PASSWORD) {
    return res.status(403).json({ error: "Confirmation password salah atau tidak diberikan!" });
  }

  // Log the reset action for audit trail
  console.log(`[AUDIT] User ${req.user.id} melakukan reset database pada ${new Date().toISOString()}`);

  const tables = ["transactions", "goals", "bills", "shifts", "tasks"];
  let completed = 0;
  let hasError = false;

  tables.forEach((table) => {
    db.query(`DELETE FROM ${table}`, (err) => {
      if (hasError) return;

      if (err) {
        hasError = true;
        console.error(`🚨 Error saat menghapus tabel ${table}:`, err.message);
        return res.status(500).json({ error: err.message });
      }

      completed++;
      if (completed === tables.length) {
        console.log("✅ Semua tabel berhasil direset!");
        res.json({ message: "Semua database berhasil dikosongkan!" });
      }
    });
  });
});

// ==========================================
// 🏦 API UNTUK KALKULATOR NENKIN
// ==========================================
app.get("/api/nenkin", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM nenkin WHERE user_id = ? ORDER BY date DESC", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/nenkin", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { date, avg_salary, months, estimated_amount, notes } = req.body;
  const sql = "INSERT INTO nenkin (user_id, date, avg_salary, months, estimated_amount, notes) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [userId, date, avg_salary, months, estimated_amount, notes], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Estimasi Nenkin tersimpan!", id: result.insertId });
  });
});

app.delete("/api/nenkin/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM nenkin WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Data dihapus!" });
  });
});

// --- 4. JALANKAN SERVER ---
app.listen(port, () => {
  console.log(`Server siap melayani di port http://localhost:${port}`);
});

// ==========================================
// 📋 API TAMBAHAN UNTUK SUB-TASKS
// ==========================================

// Route untuk memperbarui subtasks pada sebuah task tertentu
app.put("/api/tasks/:id/subtasks", authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { subtasks } = req.body;
  const sql = "UPDATE tasks SET subtasks = ? WHERE id = ?";
  db.query(sql, [subtasks, taskId], (err, result) => {
    if (err) {
      console.error("Gagal update subtasks:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Subtasks berhasil diperbarui!" });
  });
});

// ==========================================
// 🏷️ API UNTUK CATEGORIES
// ==========================================
app.get("/api/categories", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM categories WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/categories", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { name, color } = req.body;
  const sql = "INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)";
  db.query(sql, [userId, name, color], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Kategori tersimpan!", id: result.insertId });
  });
});

app.delete("/api/categories/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM categories WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Kategori dihapus!" });
  });
});

// ==========================================
// 🔁 API UNTUK RECURRING (TAGIHAN RUTIN)
// ==========================================
app.get("/api/recurring", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM recurring WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/recurring", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { name, amount, type, category, date, lastProcessedMonth } = req.body;
  const sql = "INSERT INTO recurring (user_id, name, amount, type, category, date, lastProcessedMonth) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [userId, name, amount, type, category, date, lastProcessedMonth || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Tagihan rutin tersimpan!", id: result.insertId });
  });
});

app.put("/api/recurring/:id", authenticateToken, (req, res) => {
  const { lastProcessedMonth } = req.body;
  db.query("UPDATE recurring SET lastProcessedMonth = ? WHERE id = ?", [lastProcessedMonth, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Tagihan rutin diupdate!" });
  });
});

app.delete("/api/recurring/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM recurring WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Tagihan rutin dihapus!" });
  });
});

// ==========================================
// 💳 API UNTUK DEBTS (UTANG/PIUTANG)
// ==========================================
app.get("/api/debts", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM debts WHERE user_id = ? ORDER BY date DESC", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/debts", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { type, name, amount, date, due_date, notes, paid } = req.body;
  const sql = "INSERT INTO debts (user_id, type, name, amount, date, due_date, notes, paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [userId, type, name, amount, date, due_date || null, notes || null, paid || 0], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Data hutang tersimpan!", id: result.insertId });
  });
});

app.put("/api/debts/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { paid, paid_amount } = req.body;
  db.query("UPDATE debts SET paid = ?, paid_amount = ? WHERE id = ? AND user_id = ?", [paid, paid_amount, req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Status hutang diupdate!" });
  });
});

app.delete("/api/debts/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM debts WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Data hutang dihapus!" });
  });
});

// ==========================================
// 📊 API UNTUK BUDGETS (ANGGARAN)
// ==========================================
app.get("/api/budgets", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM budgets WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/budgets", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { category, amount, month } = req.body;
  const sql = "INSERT INTO budgets (user_id, category, amount, month) VALUES (?, ?, ?, ?)";
  db.query(sql, [userId, category, amount, month], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Budget tersimpan!", id: result.insertId });
  });
});

app.put("/api/budgets/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { amount } = req.body;
  db.query("UPDATE budgets SET amount = ? WHERE id = ? AND user_id = ?", [amount, req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Budget diupdate!" });
  });
});

app.delete("/api/budgets/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM budgets WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Budget dihapus!" });
  });
});

// ==========================================
// 💰 API UNTUK ASSETS (KEKAYAAN)
// ==========================================
app.get("/api/assets", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/assets", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { name, type, value, purchase_date, notes } = req.body;
  const sql = "INSERT INTO assets (user_id, name, type, value, purchase_date, notes) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [userId, name, type, value, purchase_date || null, notes || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Asset tersimpan!", id: result.insertId });
  });
});

app.put("/api/assets/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  const { name, type, value, purchase_date, notes } = req.body;
  db.query("UPDATE assets SET name = ?, type = ?, value = ?, purchase_date = ?, notes = ? WHERE id = ? AND user_id = ?", [name, type, value, purchase_date, notes, req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Asset diupdate!" });
  });
});

app.delete("/api/assets/:id", authenticateToken, (req, res) => {
  const userId = req.user.id; // ✅ Dari verified JWT token
  db.query("DELETE FROM assets WHERE id = ? AND user_id = ?", [req.params.id, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Asset dihapus!" });
  });
});




// UNTUK DEPLOY DI VERCEL 👇
module.exports = app;

