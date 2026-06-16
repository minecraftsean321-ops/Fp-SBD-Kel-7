const express = require('express');
const router = express.Router();

module.exports = (mysqlConnection) => {

    // =================================================================
    // FUNGSI 5: KELOLA PLAYLIST UTAMA (MySQL Asli)
    // =================================================================

   // --- 5A. Membuat Playlist Baru (Anti-Duplicate Per User) ---
    router.post('/', (req, res) => { 
        const { user_id, playlist_name, description } = req.body;

        if (!user_id || !playlist_name) return res.status(400).json({ message: "Gagal! user_id dan nama playlist wajib diisi." });

        // TAHAP 1: Cek apakah user_id ini sudah pernah membuat playlist dengan nama yang sama
        const cekQuery = `SELECT playlist_id FROM playlists WHERE user_id = ? AND playlist_name = ?`;

        mysqlConnection.query(cekQuery, [user_id, playlist_name], (err, results) => {
            if (err) return res.status(500).json({ message: "Error validasi playlist", error: err.message });

            if (results.length > 0) {
                return res.status(409).json({ 
                    message: `Gagal membuat playlist! Kamu sudah memiliki playlist bernama '${playlist_name}'.` 
                });
            }

            // TAHAP 2: Jika lolos, baru INSERT
            const query = `INSERT INTO playlists (user_id, playlist_name, description, created_at) VALUES (?, ?, ?, NOW())`;
            mysqlConnection.query(query, [user_id, playlist_name, description], (err, insertResults) => {
                if (err) return res.status(500).json({ message: "Gagal membuat playlist baru", error: err.message });
                res.status(201).json({ message: "Playlist baru berhasil dibuat!", playlist_id: insertResults.insertId });
            });
        });
    });

    // --- 5B. Menampilkan Semua Playlist Milik User ---
    // PERBAIKAN: Jalur disesuaikan agar bisa diakses lewat /api/playlists/users/:userId
    router.get('/users/:userId', (req, res) => { 
        const user_id = req.params.userId;
        const query = `SELECT playlists.playlist_id, playlists.playlist_name, playlists.description, playlists.created_at, users.username FROM playlists JOIN users ON playlists.user_id = users.user_id WHERE users.user_id = ?`;

        mysqlConnection.query(query, [user_id], (err, results) => {
            if (err) return res.status(500).json({ message: "Gagal memuat playlist user", error: err.message });
            res.status(200).json({ data: results });
        });
    });

    // --- 5C. Menghapus Playlist Utama ---
    // PERBAIKAN: Jalur disingkat dari '/playlists/:id' menjadi '/:id'
    router.delete('/:id', (req, res) => { 
        const playlist_id = req.params.id;
        const query = `DELETE FROM playlists WHERE playlist_id = ?`;

        mysqlConnection.query(query, [playlist_id], (err, results) => {
            if (err) return res.status(500).json({ message: "Gagal menghapus playlist", error: err.message });
            res.status(200).json({ message: `Playlist dengan ID ${playlist_id} resmi dihapus!` });
        });
    });


    // =================================================================
    // FUNGSI 6: KELOLA LAGU DI DALAM PLAYLIST (MySQL Asli Junction Table)
    // =================================================================

    // --- 6A. Menambahkan Lagu ke Playlist ---
    // PERBAIKAN: Jalur disingkat dari '/playlists/add-song' menjadi '/add-song'
    router.post('/add-song', (req, res) => { 
        const { playlist_id, song_id } = req.body;

        if (!playlist_id || !song_id) return res.status(400).json({ message: "Gagal! playlist_id dan song_id wajib diisi." });

        const query = `INSERT INTO playlist_songs (playlist_id, song_id, added_at) VALUES (?, ?, NOW())`;

        mysqlConnection.query(query, [playlist_id, song_id], (err, results) => {
            if (err) return res.status(500).json({ message: "Gagal menambahkan lagu ke playlist", error: err.message });
            res.status(201).json({ message: "Lagu sukses ditambahkan ke dalam playlist!" });
        });
    });

    // --- 6B. Menampilkan Seluruh Isi Konten dari Suatu Playlist ---
    // PERBAIKAN: Jalur disingkat dari '/playlists/:id/songs' menjadi '/:id/songs'
    router.get('/:id/songs', (req, res) => { 
        const playlist_id = req.params.id;
        const query = `
            SELECT playlists.playlist_name, songs.song_id, songs.title, artists.artist_name, songs.genre, songs.duration, playlist_songs.added_at 
            FROM playlist_songs 
            JOIN playlists ON playlist_songs.playlist_id = playlists.playlist_id 
            JOIN songs ON playlist_songs.song_id = songs.song_id 
            JOIN artists ON songs.artist_id = artists.artist_id 
            WHERE playlists.playlist_id = ?
        `;

        mysqlConnection.query(query, [playlist_id], (err, results) => {
            if (err) return res.status(500).json({ message: "Gagal memuat isi lagu playlist", error: err.message });
            res.status(200).json({ data: results });
        });
    });

    // --- 6C. Menghapus Lagu Tertentu dari Playlist ---
    // PERBAIKAN: Jalur disingkat dari '/playlists/remove-song' menjadi '/remove-song'
    router.delete('/remove-song', (req, res) => { 
        const { playlist_id, song_id } = req.body;

        const query = `DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?`;

        mysqlConnection.query(query, [playlist_id, song_id], (err, results) => {
            if (err) return res.status(500).json({ message: "Gagal menghapus lagu dari playlist", error: err.message });
            res.status(200).json({ message: "Lagu berhasil didelete dari playlist tersebut!" });
        });
    });

    return router;
};