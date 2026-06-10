const express = require('express');
const mysql = require('mysql2');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// =================================================================
// 1. KONEKSI KE MYSQL (Katalog Utama)
// =================================================================
// Catatan: Ganti 'password_kamu' dengan password MySQL di laptopmu jika ada
const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'sbd_streaming_musik'
});

mysqlConnection.connect((err) => {
    if (err) {
        console.error('❌ Koneksi MySQL Gagal: ' + err.message);
        return;
    }
    console.log('✅ Berhasil terhubung ke MySQL (Data Terstruktur)');
});

// =================================================================
// 2. KONEKSI KE MONGODB (Data Dinamis & Log)
// =================================================================
mongoose.connect('mongodb://localhost:27017/sbd_streaming_nosql')
    .then(() => console.log('✅ Berhasil terhubung ke MongoDB (Data Dinamis)'))
    .catch((err) => console.error('❌ Koneksi MongoDB Gagal:', err.message));


// =================================================================
// JALUR FITUR (ROUTES) - UJI COBA
// =================================================================
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: "Server Nyala & Siap Terhubung ke Dua Database!" 
    });
});

// =================================================================
// FUNGSI 1: REGISTRASI & LOGIN USER (MySQL Asli)
// =================================================================

// --- 1A. Registrasi User Baru ---
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Gagal! Kolom username, email, dan password wajib diisi." });
    }

    const query = `INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())`; // [cite: 3]

    mysqlConnection.query(query, [username, email, password], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mendaftarkan user", error: err.message });
        res.status(201).json({ 
            message: "User berhasil terdaftar di MySQL kelompok 7!",
            data: { user_id: results.insertId, username, email }
        }); 
    });
});

// --- 1B. Login User ---
app.post('/api/login', (req, res) => { // [cite: 4]
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Gagal! Email dan password wajib diisi." });
    }

    const query = `SELECT user_id, username, email, created_at FROM users WHERE email = ? AND password = ?`; // [cite: 5]
    mysqlConnection.query(query, [email, password], (err, results) => {
        if (err) return res.status(500).json({ message: "Error pada server", error: err.message });
        if (results.length === 0) return res.status(401).json({ message: "Login gagal! Email atau password salah." });
        
        res.status(200).json({ message: "Login sukses!", user: results[0] });
    });
});


// =================================================================
// FUNGSI 2: CRUD ARTIST (MySQL Asli)
// =================================================================

// --- 2A. Menambah Artist (Create) ---
app.post('/api/artists', (req, res) => { // [cite: 7]
    const { artist_name, country, debut_year, description } = req.body;

    if (!artist_name) return res.status(400).json({ message: "Gagal! Nama artist wajib diisi." });

    const query = `INSERT INTO artists (artist_name, country, debut_year, description) VALUES (?, ?, ?, ?)`; // [cite: 8]

    mysqlConnection.query(query, [artist_name, country, debut_year, description], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal menambah artist", error: err.message });
        res.status(201).json({ message: "Artist baru berhasil ditambahkan!", artist_id: results.insertId });
    });
});

// --- 2B. Menampilkan Semua Artist (Read) ---
app.get('/api/artists', (req, res) => {
    const query = `SELECT * FROM artists`;
    mysqlConnection.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data artist", error: err.message });
        res.status(200).json({ data: results });
    });
});

// --- 2C. Update Data Artist (Update) ---
app.put('/api/artists/:id', (req, res) => { // [cite: 9]
    const artist_id = req.params.id;
    const { artist_name, country, debut_year, description } = req.body;

    const query = `UPDATE artists SET artist_name = ?, country = ?, debut_year = ?, description = ? WHERE artist_id = ?`; // [cite: 10]

    mysqlConnection.query(query, [artist_name, country, debut_year, description, artist_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengupdate artist", error: err.message });
        res.status(200).json({ message: `Data artist dengan ID ${artist_id} berhasil diubah!` });
    });
});

// --- 2D. Delete Data Artist (Delete) ---
app.delete('/api/artists/:id', (req, res) => { // [cite: 11]
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

// --- 3A. Menambahkan Lagu Baru (Create) ---
app.post('/api/songs', (req, res) => { // [cite: 14]
    const { artist_id, title, genre, duration, release_date, audio_url } = req.body;

    if (!title || !artist_id) return res.status(400).json({ message: "Gagal! Judul lagu dan artist_id wajib diisi." });

    const query = `INSERT INTO songs (artist_id, title, genre, duration, release_date, audio_url, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`; // [cite: 15]

    mysqlConnection.query(query, [artist_id, title, genre, duration, release_date, audio_url], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal menambah lagu baru", error: err.message });
        res.status(201).json({ message: "Lagu baru berhasil ditambahkan!", song_id: results.insertId });
    });
});

// --- 3B. Menampilkan Semua Lagu (Read) ---
app.get('/api/songs', (req, res) => {
    const query = `SELECT * FROM songs`;
    mysqlConnection.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data lagu", error: err.message });
        res.status(200).json({ data: results });
    });
});

// --- 3C. Update Data Lagu (Update) ---
app.put('/api/songs/:id', (req, res) => { // [cite: 16]
    const song_id = req.params.id;
    const { artist_id, title, genre, duration, release_date, audio_url } = req.body;

    const query = `UPDATE songs SET artist_id = ?, title = ?, genre = ?, duration = ?, release_date = ?, audio_url = ? WHERE song_id = ?`; // [cite: 17]

    mysqlConnection.query(query, [artist_id, title, genre, duration, release_date, audio_url, song_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal memperbarui data lagu", error: err.message });
        res.status(200).json({ message: `Data lagu dengan ID ${song_id} berhasil diperbarui!` });
    });
});

// --- 3D. Delete Data Lagu (Delete) ---
app.delete('/api/songs/:id', (req, res) => { // [cite: 18]
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
app.get('/api/songs/search', (req, res) => {
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


// =================================================================
// FUNGSI 5: KELOLA PLAYLIST UTAMA (MySQL Asli)
// =================================================================

// --- 5A. Membuat Playlist Baru ---
app.post('/api/playlists', (req, res) => { // [cite: 30]
    const { user_id, playlist_name, description } = req.body;

    if (!user_id || !playlist_name) return res.status(400).json({ message: "Gagal! user_id dan nama playlist wajib diisi." });

    const query = `INSERT INTO playlists (user_id, playlist_name, description, created_at) VALUES (?, ?, ?, NOW())`; // [cite: 31]

    mysqlConnection.query(query, [user_id, playlist_name, description], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal membuat playlist", error: err.message });
        res.status(201).json({ message: "Playlist baru berhasil dibuat!", playlist_id: results.insertId });
    });
});

// --- 5B. Menampilkan Semua Playlist Milik User ---
app.get('/api/users/:userId/playlists', (req, res) => { // [cite: 32]
    const user_id = req.params.userId;
    const query = `SELECT playlists.playlist_id, playlists.playlist_name, playlists.description, playlists.created_at, users.username FROM playlists JOIN users ON playlists.user_id = users.user_id WHERE users.user_id = ?`; // [cite: 33]

    mysqlConnection.query(query, [user_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal memuat playlist user", error: err.message });
        res.status(200).json({ data: results });
    });
});

// --- 5C. Menghapus Playlist Utama ---
app.delete('/api/playlists/:id', (req, res) => { // [cite: 43]
    const playlist_id = req.params.id;
    const query = `DELETE FROM playlists WHERE playlist_id = ?`; // [cite: 44]

    mysqlConnection.query(query, [playlist_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus playlist", error: err.message });
        res.status(200).json({ message: `Playlist dengan ID ${playlist_id} resmi dihapus!` });
    });
});


// =================================================================
// FUNGSI 6: KELOLA LAGU DI DALAM PLAYLIST (MySQL Asli Junction Table)
// =================================================================

// --- 6A. Menambahkan Lagu ke Playlist ---
app.post('/api/playlists/add-song', (req, res) => { // [cite: 35]
    const { playlist_id, song_id } = req.body;

    if (!playlist_id || !song_id) return res.status(400).json({ message: "Gagal! playlist_id dan song_id wajib diisi." });

    const query = `INSERT INTO playlist_songs (playlist_id, song_id, added_at) VALUES (?, ?, NOW())`; // [cite: 36]

    mysqlConnection.query(query, [playlist_id, song_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal menambahkan lagu ke playlist", error: err.message });
        res.status(201).json({ message: "Lagu sukses ditambahkan ke dalam playlist!" });
    });
});

// --- 6B. Menampilkan Seluruh Isi Konten dari Suatu Playlist ---
app.get('/api/playlists/:id/songs', (req, res) => { // [cite: 39]
    const playlist_id = req.params.id;
    const query = `
        SELECT playlists.playlist_name, songs.song_id, songs.title, artists.artist_name, songs.genre, songs.duration, playlist_songs.added_at 
        FROM playlist_songs 
        JOIN playlists ON playlist_songs.playlist_id = playlists.playlist_id 
        JOIN songs ON playlist_songs.song_id = songs.song_id 
        JOIN artists ON songs.artist_id = artists.artist_id 
        WHERE playlists.playlist_id = ?
    `; // [cite: 40]

    mysqlConnection.query(query, [playlist_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal memuat isi lagu playlist", error: err.message });
        res.status(200).json({ data: results });
    });
});

// --- 6C. Menghapus Lagu Tertentu dari Playlist ---
app.delete('/api/playlists/remove-song', (req, res) => { // [cite: 41]
    const { playlist_id, song_id } = req.body;

    const query = `DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?`; // [cite: 42]

    mysqlConnection.query(query, [playlist_id, song_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus lagu dari playlist", error: err.message });
        res.status(200).json({ message: "Lagu berhasil didelete dari playlist tersebut!" });
    });
});

// =================================================================
// FUNGSI 7: TAMBAH LAGU KE FAVORIT (MongoDB Embedding Mock)
// =================================================================
app.post('/api/favorites', (req, res) => {
    const { id_user, id_song, title, artist_name } = req.body;

    if (!id_user || !id_song) {
        return res.status(400).json({ message: "Gagal! ID User dan ID Song wajib ada." });
    }

    res.status(200).json({
        message: "MOCK TEST: Lagu berhasil di-embed ke dalam array Favorit User di MongoDB!",
        data: {
            id_user: id_user,
            songs: [
                { id_song, title, artist_name, added_at: new Date() }
            ]
        }
    });
});

// =================================================================
// FUNGSI 8: FOLLOW ARTIST (MongoDB Embedding Mock)
// =================================================================
app.post('/api/artists/follow', (req, res) => {
    const { id_user, id_artist, artist_name } = req.body;

    if (!id_user || !id_artist) {
        return res.status(400).json({ message: "Gagal! ID User dan ID Artist wajib ada." });
    }

    res.status(200).json({
        message: `MOCK TEST: Berhasil mengikuti artist '${artist_name}' di MongoDB!`,
        data: {
            id_user: id_user,
            followed_artists: [
                { id_artist, artist_name, followed_at: new Date() }
            ]
        }
    });
});

// =================================================================
// FUNGSI 9: RIWAYAT PEMUTARAN LAGU (MongoDB Log Mock)
// =================================================================
app.post('/api/playback-history', (req, res) => {
    const { id_user, id_song, title, artist_name } = req.body;

    if (!id_user || !id_song) {
        return res.status(400).json({ message: "Gagal! ID User dan ID Song wajib diisi." });
    }

    res.status(201).json({
        message: "MOCK TEST: Riwayat pemutaran lagu berhasil dicatat ke MongoDB log!",
        data: {
            _id: "666abc12399f9fa", // Simulasi Objectid bawaan MongoDB
            id_user,
            id_song,
            title,
            artist_name,
            played_at: new Date()
        }
    });
});

// =================================================================
// FUNGSI 10 & 11: PREFERENSI & REKOMENDASI LAGU (MongoDB Mock)
// =================================================================
app.get('/api/users/:id/recommendations', (req, res) => {
    const id_user = req.params.id; // Mengambil ID User dari URL (misal: /api/users/17/recommendations)

    // MOCK DATA: Anggap saja ini data preferensi genre & artist yang ditarik Anggota 2 dari MongoDB user_preferences
    const mockUserPreference = {
        id_user: id_user,
        favorite_genres: ["Grunge", "Rock"],
        preferred_artists: ["Nirvana", "Artis Tiruan 2"]
    };

    // LOGIKA FILTERING:
    // Pura-puranya backend menyaring katalog musik berdasarkan genre preferensi di atas
    const laguRekomendasiTiruan = [
        { id_song: 101, title: "Smells Like Teen Spirit", genre: "Grunge", artist_name: "Nirvana" },
        { id_song: 102, title: "Drain You", genre: "Grunge", artist_name: "Nirvana" },
        { id_song: 103, title: "Lagu Rock Mantap", genre: "Rock", artist_name: "Artis Tiruan 2" }
    ];

    res.status(200).json({
        message: `MOCK TEST: Berhasil menampilkan rekomendasi sederhana untuk User ID ${id_user}`,
        user_preferences: mockUserPreference,
        recommendations: laguRekomendasiTiruan
    });
});

// =================================================================
// MENYALAKAN SERVER
// =================================================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});