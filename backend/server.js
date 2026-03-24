const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const crypto = require('crypto');

// Fungsi pembantu untuk hash password
function hashPasswordServer(password) {
    if (!password) return '';
    return crypto.createHash('sha256').update(password).digest('hex');
}

const app = express();
const port = 3000;

// --- 1. MIDDLEWARE ---
// Mengizinkan frontend (Live Server) mengakses backend tanpa diblokir browser
app.use(cors());
// Agar backend bisa membaca data yang dikirim dari frontend dalam format JSON
app.use(express.json());

// --- 2. KONFIGURASI DATABASE ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'budget_db', // Pastikan nama database lokalmu benar
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,

});

// Cek apakah database berhasil terhubung
db.getConnection((err, connection) => {
    if (err) {
        console.error('Ups! Gagal terhubung ke MySQL. Pastikan XAMPP menyala.', err.message);
        const tables = ['transactions', 'goals', 'bills', 'shifts', 'tasks', 'remittances', 'documents', 'nenkin'];
        tables.forEach(table => {
            connection.query(`ALTER TABLE ${table} ADD COLUMN user_id VARCHAR(255) DEFAULT 'default_user'`, () => { });
        });
        console.log('Yeay! Berhasil terhubung ke database MySQL dan melakukan pengecekan Schema!');
        connection.release();
    });

// --- 3. API ENDPOINTS (Rute Data) ---

// Route Tes: Untuk memastikan server jalan
app.get('/', (req, res) => {
    res.send('Backend Budget Management App berjalan lancar! 🚀');
});

// GET: Mengambil semua data transaksi dari database
app.get('/api/transactions', (req, res) => {
    const userId = req.query.user_id;
    const sql = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// POST: Menambahkan data transaksi baru ke database
app.post('/api/transactions', (req, res) => {
    const { user_id, type, amount, category, date, description } = req.body;
    const sql = 'INSERT INTO transactions (user_id, type, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)';

    db.query(sql, [user_id, type, amount, category, date, description], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaksi berhasil disimpan!', id: result.insertId });
    });
});

// DELETE: Menghapus transaksi dari database berdasarkan ID
app.delete('/api/transactions/:id', (req, res) => {
    const transactionId = req.params.id;
    const userId = req.query.user_id;
    const sql = 'DELETE FROM transactions WHERE id = ? AND user_id = ?';

    db.query(sql, [transactionId, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Transaksi tidak ditemukan atau Anda tidak memiliki akses!' });
        res.json({ message: 'Transaksi berhasil dihapus dari database!' });
    });
});

// ==========================================
// 🎯 API UNTUK GOALS
// ==========================================
app.get('/api/goals', (req, res) => {
    const userId = req.query.user_id;
    db.query('SELECT * FROM goals WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/goals', (req, res) => {
    const { user_id, name, target, saved, deadline, color, icon } = req.body;
    const sql = 'INSERT INTO goals (user_id, name, target, saved, deadline, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [user_id, name, target, saved, deadline, color, icon], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Goal tersimpan!', id: result.insertId });
    });
});

// PUT: Update jumlah tabungan (saved) pada Goal
app.put('/api/goals/:id', (req, res) => {
    const { saved, user_id } = req.body;
    const sql = 'UPDATE goals SET saved = ? WHERE id = ? AND user_id = ?';

    db.query(sql, [saved, req.params.id, user_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tabungan goal berhasil diupdate!' });
    });
});

app.delete('/api/goals/:id', (req, res) => {
    const userId = req.query.user_id;
    db.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Goal dihapus!' });
    });
});

// ==========================================
// 🧾 API UNTUK BILLS (TAGIHAN)
// ==========================================
app.get('/api/bills', (req, res) => {
    const userId = req.query.user_id;
    db.query('SELECT * FROM bills WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/bills', (req, res) => {
    const { user_id, name, amount, due_date, category, paid } = req.body;
    const sql = 'INSERT INTO bills (user_id, name, amount, due_date, category, paid) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [user_id, name, amount, due_date, category, paid], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tagihan tersimpan!', id: result.insertId });
    });
});

app.delete('/api/bills/:id', (req, res) => {
    const userId = req.query.user_id;
    db.query('DELETE FROM bills WHERE id = ? AND user_id = ?', [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tagihan dihapus!' });
    });
});

// ==========================================
// ⏰ API UNTUK SHIFT KERJA
// ==========================================
app.get('/api/shifts', (req, res) => {
    const userId = req.query.user_id;
    db.query('SELECT * FROM shifts WHERE user_id = ? ORDER BY date DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Rute untuk menambah Shift Baru
app.post('/api/shifts', (req, res) => {
    const { user_id, date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings } = req.body;
    const query = `INSERT INTO shifts (user_id, date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [user_id, date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings], (err, results) => {
        if (err) { console.error("Gagal insert shift:", err); return res.status(500).json({ error: err.message }); }
        res.json({ id: results.insertId, message: "Shift berhasil disimpan dengan detail gaji!" });
    });
});

// PUT: Mengubah status shift menjadi sudah dicatat (recorded = true)
app.put('/api/shifts/:id/record', (req, res) => {
    const sql = 'UPDATE shifts SET recorded = true WHERE id = ?';
    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status shift berhasil diupdate!' });
    });
});

app.delete('/api/shifts/:id', (req, res) => {
    const userId = req.query.user_id;
    db.query('DELETE FROM shifts WHERE id = ? AND user_id = ?', [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Shift dihapus!' });
    });
});

// ==========================================
// ✅ API UNTUK TASKS
// ==========================================
app.get('/api/tasks', (req, res) => {
    const userId = req.query.user_id;
    db.query('SELECT * FROM tasks WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/tasks', (req, res) => {
    const { user_id, title, status, due_date, priority, tag } = req.body;
    const query = `INSERT INTO tasks (user_id, title, status, due_date, priority, tag) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(query, [user_id, title, status, due_date, priority, tag], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: results.insertId, message: "Task disimpan!" });
    });
});
// PUT: Update status task (misal dari pending -> completed)
app.put('/api/tasks/:id/status', (req, res) => {
    const { status } = req.body;
    const sql = 'UPDATE tasks SET status = ? WHERE id = ?';
    db.query(sql, [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status task berhasil diupdate!' });
    });
});

app.delete('/api/tasks/:id', (req, res) => {
    const userId = req.query.user_id;
    db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Task dihapus!' });
    });
});

// ==========================================
// 💸 API UNTUK REMITTANCE (KIRIM UANG)
// ==========================================
app.get('/api/remittances', (req, res) => {
    const userId = req.query.user_id;
    db.query('SELECT * FROM remittances WHERE user_id = ? ORDER BY date DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/remittances', (req, res) => {
    const { user_id, date, amount_jpy, exchange_rate, amount_idr, provider, notes } = req.body;
    const sql = 'INSERT INTO remittances (user_id, date, amount_jpy, exchange_rate, amount_idr, provider, notes) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [user_id, date, amount_jpy, exchange_rate, amount_idr, provider, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data kirim uang tersimpan!', id: result.insertId });
    });
});

app.delete('/api/remittances/:id', (req, res) => {
    const userId = req.query.user_id;
    db.query('DELETE FROM remittances WHERE id = ? AND user_id = ?', [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data kirim uang dihapus!' });
    });
});

// ==========================================
// 🚨 API UNTUK DOKUMEN PENTING (ZAIRYU/KONTRAK)
// ==========================================
app.get('/api/documents', (req, res) => {
    const userId = req.query.user_id;
    db.query('SELECT * FROM documents WHERE user_id = ? ORDER BY expiry_date ASC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/documents', (req, res) => {
    const { user_id, title, type, expiry_date, notes } = req.body;
    const sql = 'INSERT INTO documents (user_id, title, type, expiry_date, notes) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [user_id, title, type, expiry_date, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Dokumen berhasil dicatat!', id: result.insertId });
    });
});

app.delete('/api/documents/:id', (req, res) => {
    const userId = req.query.user_id;
    db.query('DELETE FROM documents WHERE id = ? AND user_id = ?', [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Dokumen dihapus!' });
    });
});

// ==========================================
// 👤 API UNTUK USER (AUTHENTICATION)
// ==========================================

// 1. Register User Baru
app.post('/api/auth/register', (req, res) => {
    const { id, name, email, password } = req.body;
    const hashedPassword = hashPasswordServer(password);
    const sql = 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)';
    db.query(sql, [id, name, email, hashedPassword], (err) => {
        if (err) {
            // Jika email sudah ada di database
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email sudah terdaftar!' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Registrasi berhasil!' });
    });
});

// 2. Login User
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = hashPasswordServer(password);
    // Cek kedua hash: Hash baru (SHA256) untuk akun baru, dan hash lama (plain dari frontend) untuk akun lama
    const sql = 'SELECT * FROM users WHERE email = ? AND (password = ? OR password = ?)';
    db.query(sql, [email, hashedPassword, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Email atau password salah!' });
        res.json({ user: results[0] });
    });
});

// 3. Update Profil (Nama, Password, Foto)
app.put('/api/auth/profile/:id', (req, res) => {
    const { name, password, photo } = req.body;
    // Jika password disediakan (tidak kosong/sama), hash kembali.
    // Asumsi: frontend mengirim password plain text juka diubah, atau sudah di-hash (tergantung implementasi saat ini)
    // Di aplikasi saat ini, frontend juga melakukan hashing sendiri tapi kita akan timpa di backend
    let passToSave = password;
    if (password && password.length < 32) { // 32 bukan panjang hash SHA256 (64 hex). Jika length pendek, itu plaintext
        passToSave = hashPasswordServer(password);
    }
    const sql = 'UPDATE users SET name = ?, password = ?, photo = ? WHERE id = ?';
    db.query(sql, [name, passToSave, photo, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Profil berhasil diperbarui!' });
    });
});

// 4. Hapus Akun
app.delete('/api/auth/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Akun berhasil dihapus!' });
    });
});

// ==========================================
// 🛑 API UNTUK RESET SEMUA DATA
// ==========================================
app.delete('/api/reset', (req, res) => {
    const tables = ['transactions', 'goals', 'bills', 'shifts', 'tasks'];
    let completed = 0;
    let hasError = false;

    tables.forEach(table => {
        db.query(`DELETE FROM ${table}`, (err) => {
            if (hasError) return; // Hentikan jika sudah ada error

            if (err) {
                hasError = true;
                console.error(`🚨 Error saat menghapus tabel ${table}:`, err.message);
                return res.status(500).json({ error: err.message });
            }

            completed++;
            if (completed === tables.length) {
                console.log("✅ Semua tabel berhasil direset!");
                res.json({ message: 'Semua database berhasil dikosongkan!' });
            }
        });
    });
});

// ==========================================
// 🏦 API UNTUK KALKULATOR NENKIN
// ==========================================
app.get('/api/nenkin', (req, res) => {
    const userId = req.query.user_id;
    db.query('SELECT * FROM nenkin WHERE user_id = ? ORDER BY date DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/nenkin', (req, res) => {
    const { user_id, date, avg_salary, months, estimated_amount, notes } = req.body;
    const sql = 'INSERT INTO nenkin (user_id, date, avg_salary, months, estimated_amount, notes) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [user_id, date, avg_salary, months, estimated_amount, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Estimasi Nenkin tersimpan!', id: result.insertId });
    });
});

app.delete('/api/nenkin/:id', (req, res) => {
    const userId = req.query.user_id;
    db.query('DELETE FROM nenkin WHERE id = ? AND user_id = ?', [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data dihapus!' });
    });
});

// --- 4. JALANKAN SERVER ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server siap melayani di port http://localhost:${PORT}`);
});

// ==========================================
// 📋 API TAMBAHAN UNTUK SUB-TASKS
// ==========================================

// Route untuk memperbarui subtasks pada sebuah task tertentu
app.put('/api/tasks/:id/subtasks', (req, res) => {
    const taskId = req.params.id;
    const { subtasks } = req.body; // Ini adalah string JSON dari frontend

    const sql = 'UPDATE tasks SET subtasks = ? WHERE id = ?';

    db.query(sql, [subtasks, taskId], (err, result) => {
        if (err) {
            console.error("Gagal update subtasks:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Subtasks berhasil diperbarui!' });
    });
});

// UNTUK DEPLOY DI VERCEL 👇
module.exports = app;