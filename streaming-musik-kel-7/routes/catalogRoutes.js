const express = require('express');
const router = express.Router();

module.exports = (mysqlConnection) => {

// =================================================================
// FUNGSI 2: CRUD ARTIST (MySQL Asli)
// =================================================================

// --- 2A. Menambah Artist (Dengan Proteksi Anti-Duplicate Data) ---
    router.post('/artists', (req, res) => { //
        const { artist_name, country, debut_year, description } = req.body; //

        if (!artist_name) {
            return res.status(400).json({ message: "Gagal! Nama artist wajib diisi." });
        }

        // TAHAP 1: Cek ke database apakah nama musisi ini sudah pernah terdaftar atau belum
        const cekQuery = `SELECT artist_id FROM artists WHERE artist_name = ?`; //

        mysqlConnection.query(cekQuery, [artist_name], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Error saat memeriksa validasi data", error: err.message });
            }

            // Jika hasil query SELECT menemukan baris data (panjang array > 0)
            if (results.length > 0) {
                return res.status(409).json({ 
                    message: `Gagal menambah data! Musisi dengan nama '${artist_name}' sudah terdaftar di database kelompok 7.` 
                });
            }

            // TAHAP 2: Jika nama belum ada di database, baru eksekusi query INSERT
            const insertQuery = `INSERT INTO artists (artist_name, country, debut_year, description) VALUES (?, ?, ?, ?)`; //
            
            mysqlConnection.query(insertQuery, [artist_name, country, debut_year, description], (err, insertResults) => { //
                if (err) {
                    return res.status(500).json({ message: "Gagal menambah artist", error: err.message });
                }
                res.status(201).json({ 
                    message: "Artist baru berhasil ditambahkan!", 
                    artist_id: insertResults.insertId 
                });
            });
        });
    });

// --- 2B. Menampilkan Semua Artist (Read) ---
router.get('/artists', (req, res) => {
    const query = `SELECT * FROM artists`;
    mysqlConnection.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data artist", error: err.message });
        res.status(200).json({ data: results });
    });
});

// --- 2C. Update Data Artist (Update) ---
router.put('/artists/:id', (req, res) => { // [cite: 9]
    const artist_id = req.params.id;
    const { artist_name, country, debut_year, description } = req.body;

    const query = `UPDATE artists SET artist_name = ?, country = ?, debut_year = ?, description = ? WHERE artist_id = ?`; // [cite: 10]

    mysqlConnection.query(query, [artist_name, country, debut_year, description, artist_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengupdate artist", error: err.message });
        res.status(200).json({ message: `Data artist dengan ID ${artist_id} berhasil diubah!` });
    });
});

// --- 2D. Delete Data Artist (Delete) ---
router.delete('/artists/:id', (req, res) => { // [cite: 11]
    const artist_id = req.params.id;
    const query = `DELETE FROM artists WHERE artist_id = ?`; // [cite: 12]

    mysqlConnection.query(query, [artist_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus artist", error: err.message });
        res.status(200).json({ message: `Artist dengan ID ${artist_id} resmi dihapus!` });
    });
});


// =================================================================
// FUNGSI 3: CRUD LAGU (MySQL Asli)
// =================================================================

// --- 3A. Menambahkan Lagu Baru (Dengan Proteksi Anti-Duplicate Data) ---
    router.post('/songs', (req, res) => {
        const { artist_id, title, genre, duration, release_date, audio_url } = req.body;

        if (!title || !artist_id) {
            return res.status(400).json({ message: "Gagal! Judul lagu dan artist_id wajib diisi." });
        }

        // TAHAP 1: Cek apakah musisi tersebut sudah memiliki lagu dengan judul yang sama
        const cekQuery = `SELECT song_id FROM songs WHERE artist_id = ? AND title = ?`;

        mysqlConnection.query(cekQuery, [artist_id, title], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Error saat validasi duplikasi lagu", error: err.message });
            }

            // Jika kombinasi artist_id dan title sudah ada di database (panjang array > 0)
            if (results.length > 0) {
                return res.status(409).json({ 
                    message: `Gagal menambah lagu! Lagu berjudul '${title}' untuk Artist ID ${artist_id} sudah terdaftar sebelumnya.` 
                });
            }

            // TAHAP 2: Jika lolos validasi, baru jalankan query INSERT ke MySQL
            const insertQuery = `INSERT INTO songs (artist_id, title, genre, duration, release_date, audio_url, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`;
            
            mysqlConnection.query(insertQuery, [artist_id, title, genre, duration, release_date, audio_url], (err, insertResults) => {
                if (err) {
                    return res.status(500).json({ message: "Gagal menambah lagu baru", error: err.message });
                }
                res.status(201).json({ 
                    message: "Lagu baru berhasil ditambahkan!", 
                    song_id: insertResults.insertId 
                });
            });
        });
    });

// --- 3B. Menampilkan Semua Lagu (Read) ---
router.get('/songs', (req, res) => {
    const query = `SELECT * FROM songs`;
    mysqlConnection.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data lagu", error: err.message });
        res.status(200).json({ data: results });
    });
});

// --- 3C. Update Data Lagu (Update) ---
router.put('/songs/:id', (req, res) => { // [cite: 16]
    const song_id = req.params.id;
    const { artist_id, title, genre, duration, release_date, audio_url } = req.body;

    const query = `UPDATE songs SET artist_id = ?, title = ?, genre = ?, duration = ?, release_date = ?, audio_url = ? WHERE song_id = ?`; // [cite: 17]

    mysqlConnection.query(query, [artist_id, title, genre, duration, release_date, audio_url, song_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal memperbarui data lagu", error: err.message });
        res.status(200).json({ message: `Data lagu dengan ID ${song_id} berhasil diperbarui!` });
    });
});

// --- 3D. Delete Data Lagu (Delete) ---
router.delete('/songs/:id', (req, res) => { // [cite: 18]
    const song_id = req.params.id;
    const query = `DELETE FROM songs WHERE song_id = ?`; // [cite: 19]

    mysqlConnection.query(query, [song_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus lagu", error: err.message });
        res.status(200).json({ message: `Lagu dengan ID ${song_id} resmi dihapus!` });
    });
});


// =================================================================
// FUNGSI 4: LIHAT & CARI LAGU (MySQL Asli - Multi Parameter)
// =================================================================
router.get('/songs/search', (req, res) => {
    const { judul, genre, artist } = req.query;
    let query = ``;
    let param = [];

    // Mengadaptasi Query Fleksibel dari Dokumen Anggota 1
    if (judul) {
        query = `SELECT songs.song_id, songs.title, songs.genre, songs.duration, artists.artist_name FROM songs JOIN artists ON songs.artist_id = artists.artist_id WHERE songs.title LIKE ?`; // [cite: 21, 22]
        param.push(`%${judul}%`); // [cite: 22]
    } else if (genre) {
        query = `SELECT songs.song_id, songs.title, songs.genre, songs.duration, artists.artist_name FROM songs JOIN artists ON songs.artist_id = artists.artist_id WHERE songs.genre LIKE ?`; // [cite: 23, 24]
        param.push(`%${genre}%`); // [cite: 24]
    } else if (artist) {
        query = `SELECT songs.song_id, songs.title, songs.genre, songs.duration, artists.artist_name FROM songs JOIN artists ON songs.artist_id = artists.artist_id WHERE artists.artist_name LIKE ?`; // [cite: 25, 26]
        param.push(`%${artist}%`); // [cite: 26]
    } else {
        // Default menampilkan seluruh lagu jika tidak ada keyword pencarian khusus
        query = `SELECT songs.song_id, songs.title, songs.genre, songs.duration, artists.artist_name FROM songs JOIN artists ON songs.artist_id = artists.artist_id`; // [cite: 22]
    }

    mysqlConnection.query(query, param, (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal melakukan pencarian lagu", error: err.message });
        res.status(200).json({ message: "Pencarian berhasil", data: results });
    });
});

return router;
};