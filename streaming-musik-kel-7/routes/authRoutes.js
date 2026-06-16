const express = require('express');
const router = express.Router(); // Menggunakan router bawaan Express

module.exports = (mysqlConnection) => {

    // =================================================================
    // FUNGSI 1: REGISTRASI & LOGIN USER (MySQL Asli)
    // =================================================================

    // --- 1A. Registrasi User Baru (Proteksi Duplikat Username) ---
    router.post('/register', (req, res) => {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Gagal! Kolom username, email, dan password wajib diisi." });
        }

        const cekQuery = `SELECT user_id FROM users WHERE username = ?`;

        mysqlConnection.query(cekQuery, [username], (err, results) => {
            if (err) return res.status(500).json({ message: "Error validasi username", error: err.message });
            
            if (results.length > 0) {
                return res.status(409).json({ message: `Gagal! Username '${username}' sudah digunakan. Silakan cari nama lain.` });
            }

            const query = `INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())`;
            mysqlConnection.query(query, [username, email, password], (err, insertResults) => {
                if (err) return res.status(500).json({ message: "Gagal mendaftarkan user", error: err.message });
                res.status(201).json({ 
                    message: "User berhasil terdaftar di MySQL kelompok 7!",
                    data: { user_id: insertResults.insertId, username, email }
                }); 
            });
        });
    });

    // --- 1B. Login User ---
    // PERBAIKAN: Mengubah app menjadi router, dan path disingkat menjadi '/login'
    router.post('/login', (req, res) => { //
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Gagal! Email dan password wajib diisi." });
        }

        const query = `SELECT user_id, username, email, created_at FROM users WHERE email = ? AND password = ?`; //
        mysqlConnection.query(query, [email, password], (err, results) => {
            if (err) return res.status(500).json({ message: "Error pada server", error: err.message });
            if (results.length === 0) return res.status(401).json({ message: "Login gagal! Email atau password salah." });
            
            res.status(200).json({ message: "Login sukses!", user: results[0] });
        });
    });

    return router; // Mengembalikan objek router ke server.js
};