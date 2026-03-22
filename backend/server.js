const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

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
    } else {
        console.log('Yeay! Berhasil terhubung ke database MySQL!');
        connection.release();
    }
});

// --- 3. API ENDPOINTS (Rute Data) ---

// Route Tes: Untuk memastikan server jalan
app.get('/', (req, res) => {
    res.send('Backend Budget Management App berjalan lancar! 🚀');
});

// GET: Mengambil semua data transaksi dari database
app.get('/api/transactions', (req, res) => {
    const sql = 'SELECT * FROM transactions ORDER BY date DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// POST: Menambahkan data transaksi baru ke database
app.post('/api/transactions', (req, res) => {
    const { type, amount, category, date, description } = req.body;
    const sql = 'INSERT INTO transactions (type, amount, category, date, description) VALUES (?, ?, ?, ?, ?)';

    db.query(sql, [type, amount, category, date, description], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaksi berhasil disimpan!', id: result.insertId });
    });
});

// DELETE: Menghapus transaksi dari database berdasarkan ID
app.delete('/api/transactions/:id', (req, res) => {
    const transactionId = req.params.id;
    const sql = 'DELETE FROM transactions WHERE id = ?';

    db.query(sql, [transactionId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // Cek apakah ada baris yang benar-benar terhapus
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan!' });
        }

        res.json({ message: 'Transaksi berhasil dihapus dari database!' });
    });
});

// ==========================================
// 🎯 API UNTUK GOALS
// ==========================================
app.get('/api/goals', (req, res) => {
    db.query('SELECT * FROM goals', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/goals', (req, res) => {
    const { name, target, saved, deadline, color, icon } = req.body;
    const sql = 'INSERT INTO goals (name, target, saved, deadline, color, icon) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, target, saved, deadline, color, icon], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Goal tersimpan!', id: result.insertId });
    });
});

// PUT: Update jumlah tabungan (saved) pada Goal
app.put('/api/goals/:id', (req, res) => {
    const { saved } = req.body; // Mengambil nominal tabungan baru
    const sql = 'UPDATE goals SET saved = ? WHERE id = ?';

    db.query(sql, [saved, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tabungan goal berhasil diupdate!' });
    });
});

app.delete('/api/goals/:id', (req, res) => {
    db.query('DELETE FROM goals WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Goal dihapus!' });
    });
});

// ==========================================
// 🧾 API UNTUK BILLS (TAGIHAN)
// ==========================================
app.get('/api/bills', (req, res) => {
    db.query('SELECT * FROM bills', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/bills', (req, res) => {
    const { name, amount, due_date, category, paid } = req.body;
    const sql = 'INSERT INTO bills (name, amount, due_date, category, paid) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, amount, due_date, category, paid], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tagihan tersimpan!', id: result.insertId });
    });
});

app.delete('/api/bills/:id', (req, res) => {
    db.query('DELETE FROM bills WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tagihan dihapus!' });
    });
});

// ==========================================
// ⏰ API UNTUK SHIFT KERJA
// ==========================================
app.get('/api/shifts', (req, res) => {
    db.query('SELECT * FROM shifts ORDER BY date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Rute untuk menambah Shift Baru
app.post('/api/shifts', (req, res) => {
    // 1. Tangkap SEMUA data yang dikirim dari frontend (termasuk data gaji & lembur baru)
    const {
        date,
        type,
        start_time,
        end_time,
        hours,
        normal_hours,
        overtime_hours,
        hourly_rate,
        earnings
    } = req.body;

    // 2. Query INSERT yang sudah diperbarui dengan kolom-kolom baru
    const query = `
    INSERT INTO shifts 
    (date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    // 3. Eksekusi ke database
    db.query(
        query,
        [date, type, start_time, end_time, hours, normal_hours, overtime_hours, hourly_rate, earnings],
        (err, results) => {
            if (err) {
                console.error("Gagal insert shift:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json({
                id: results.insertId,
                message: "Shift berhasil disimpan dengan detail gaji!"
            });
        }
    );
});

// PUT: Mengubah status shift menjadi sudah dicatat (recorded = true)
app.put('/api/shifts/:id/record', (req, res) => {
    const sql = 'UPDATE shifts SET recorded = true WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status shift berhasil diupdate!' });
    });
});

app.delete('/api/shifts/:id', (req, res) => {
    db.query('DELETE FROM shifts WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Shift dihapus!' });
    });
});

// ==========================================
// ✅ API UNTUK TASKS
// ==========================================
app.get('/api/tasks', (req, res) => {
    db.query('SELECT * FROM tasks', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/tasks', (req, res) => {
    // Tangkap data tag tambahan
    const { title, status, due_date, priority, tag } = req.body;

    const query = `INSERT INTO tasks (title, status, due_date, priority, tag) VALUES (?, ?, ?, ?, ?)`;
    db.query(query, [title, status, due_date, priority, tag], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: results.insertId, message: "Task disimpan!" });
    });
});
// PUT: Update status task (misal dari pending -> completed)
app.put('/api/tasks/:id/status', (req, res) => {
    const { status } = req.body;
    const sql = 'UPDATE tasks SET status = ? WHERE id = ?';

    db.query(sql, [status, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status task berhasil diupdate!' });
    });
});

app.delete('/api/tasks/:id', (req, res) => {
    db.query('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Task dihapus!' });
    });
});

// ==========================================
// 💸 API UNTUK REMITTANCE (KIRIM UANG)
// ==========================================
app.get('/api/remittances', (req, res) => {
    db.query('SELECT * FROM remittances ORDER BY date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/remittances', (req, res) => {
    const { date, amount_jpy, exchange_rate, amount_idr, provider, notes } = req.body;
    const sql = 'INSERT INTO remittances (date, amount_jpy, exchange_rate, amount_idr, provider, notes) VALUES (?, ?, ?, ?, ?, ?)';

    db.query(sql, [date, amount_jpy, exchange_rate, amount_idr, provider, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data kirim uang tersimpan!', id: result.insertId });
    });
});

app.delete('/api/remittances/:id', (req, res) => {
    db.query('DELETE FROM remittances WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data kirim uang dihapus!' });
    });
});

// ==========================================
// 🚨 API UNTUK DOKUMEN PENTING (ZAIRYU/KONTRAK)
// ==========================================
app.get('/api/documents', (req, res) => {
    // Kita urutkan dari tanggal kedaluwarsa yang paling dekat (ASC)
    db.query('SELECT * FROM documents ORDER BY expiry_date ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/documents', (req, res) => {
    const { title, type, expiry_date, notes } = req.body;
    const sql = 'INSERT INTO documents (title, type, expiry_date, notes) VALUES (?, ?, ?, ?)';

    db.query(sql, [title, type, expiry_date, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Dokumen berhasil dicatat!', id: result.insertId });
    });
});

app.delete('/api/documents/:id', (req, res) => {
    db.query('DELETE FROM documents WHERE id = ?', [req.params.id], (err) => {
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
    const sql = 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)';
    db.query(sql, [id, name, email, password], (err) => {
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
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Email atau password salah!' });
        res.json({ user: results[0] });
    });
});

// 3. Update Profil (Nama, Password, Foto)
app.put('/api/auth/profile/:id', (req, res) => {
    const { name, password, photo } = req.body;
    const sql = 'UPDATE users SET name = ?, password = ?, photo = ? WHERE id = ?';
    db.query(sql, [name, password, photo, req.params.id], (err) => {
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
    db.query('SELECT * FROM nenkin ORDER BY date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/nenkin', (req, res) => {
    const { date, avg_salary, months, estimated_amount, notes } = req.body;
    const sql = 'INSERT INTO nenkin (date, avg_salary, months, estimated_amount, notes) VALUES (?, ?, ?, ?, ?)';

    db.query(sql, [date, avg_salary, months, estimated_amount, notes], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Estimasi Nenkin tersimpan!', id: result.insertId });
    });
});

app.delete('/api/nenkin/:id', (req, res) => {
    db.query('DELETE FROM nenkin WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data dihapus!' });
    });
});

// --- 4. JALANKAN SERVER ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server siap melayani di port http://localhost:${PORT}`);
});

// UNTUK DEPLOY DI VERCEL 👇
module.exports = app;