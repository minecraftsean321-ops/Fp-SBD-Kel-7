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
// DEFINISI SKEMA & MODEL MONGOOSE (NON-RELATIONAL DATABASE)
// =================================================================

// 1. Skema Favorites (Array Embedding)
const FavoritesSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    songs: [{
        song_id: Number,
        title: String,
        artist_id: Number,
        artist_name: String,
        genre: String,
        duration: Number,
        added_at: { type: Date, default: Date.now }
    }],
    total_favorites: { type: Number, default: 0 },
    updated_at: { type: Date, default: Date.now }
});
const Favorite = mongoose.model('Favorite', FavoritesSchema, 'favorites');

// 2. Skema Artist Follows (Array Embedding)
const ArtistFollowsSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    artists: [{
        artist_id: Number,
        artist_name: String,
        country: String,
        genre: String,
        followed_at: { type: Date, default: Date.now }
    }],
    total_following: { type: Number, default: 0 },
    updated_at: { type: Date, default: Date.now }
});
const ArtistFollow = mongoose.model('ArtistFollow', ArtistFollowsSchema, 'artist_follows');

// 3. Skema Playback History (1 Dokumen per Pemutaran)
const PlaybackHistorySchema = new mongoose.Schema({
    user_id: Number,
    song_id: Number,
    song_title: String,
    artist_id: Number,
    artist_name: String,
    genre: String,
    duration: Number,
    listened_duration: Number,
    completed: Boolean,
    played_at: { type: Date, default: Date.now },
    device: String,
    source: String
});
const PlaybackHistory = mongoose.model('PlaybackHistory', PlaybackHistorySchema, 'playback_history');

// 4. Skema User Preferences (Embedded Subdocument)
const UserPreferencesSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    preferred_genres: [String],
    preferred_language: String,
    settings: {
        audio_quality: String,
        autoplay: Boolean,
        explicit_content: Boolean,
        discovery_mode: Boolean
    },
    listening_stats: {
        total_minutes: Number,
        most_played_genre: String,
        most_played_artist: String,
        avg_daily_minutes: Number,
        peak_hour: Number
    },
    updated_at: { type: Date, default: Date.now }
});
const UserPreference = mongoose.model('UserPreference', UserPreferencesSchema, 'user_preferences');


// =================================================================
// FUNGSI 7: TAMBAH/HAPUS FAVORIT LAGU
// =================================================================

// --- 7A. Menambahkan Lagu ke Favorit (Dengan Pengecekan Validitas ID ke MySQL) ---
app.post('/api/favorites', async (req, res) => {
    try {
        const { user_id, song_id } = req.body;

        if (!user_id || !song_id) {
            return res.status(400).json({ message: "Gagal! user_id dan song_id wajib diisi." });
        }

        // TAHAP 1: Mampir ke MySQL dulu untuk memastikan song_id beneran ada di katalog lagu kelompok 7
        // Kita gunakan JOIN ke tabel artists sekaligus untuk menarik data nama musisi secara otomatis
        const cekMySQLQuery = `
            SELECT songs.title, songs.artist_id, songs.genre, songs.duration, artists.artist_name 
            FROM songs 
            JOIN artists ON songs.artist_id = artists.artist_id 
            WHERE songs.song_id = ?
        `;

        mysqlConnection.query(cekMySQLQuery, [song_id], async (err, mysqlResults) => {
            if (err) {
                return res.status(500).json({ message: "Error saat verifikasi ke database MySQL", error: err.message });
            }

            // Jika lagu tidak ditemukan di tabel MySQL (panjang array hasil = 0)
            if (mysqlResults.length === 0) {
                return res.status(404).json({ 
                    message: `Gagal menambah favorit! Lagu dengan ID ${song_id} tidak valid atau tidak terdaftar di MySQL.` 
                });
            }

            // Ambil semua data atribut lagu yang asli langsung dari baris database MySQL
            const title = mysqlResults[0].title;
            const artist_id = mysqlResults[0].artist_id;
            const artist_name = mysqlResults[0].artist_name;
            const genre = mysqlResults[0].genre;
            const duration = mysqlResults[0].duration;

            // TAHAP 2: Jika lolos validasi MySQL, baru lakukan operasi embedding data ke MongoDB
            const hasilMongo = await Favorite.findOneAndUpdate(
                { user_id: user_id, "songs.song_id": { $ne: song_id } },
                {
                    $push: {
                        songs: { song_id, title, artist_id, artist_name, genre, duration, added_at: new Date() }
                    },
                    $inc: { total_favorites: 1 },
                    $set: { updated_at: new Date() }
                },
                { upsert: true, new: true }
            );

            if (!hasilMongo) {
                return res.status(400).json({ message: "Lagu ini sudah ada di dalam daftar favorit user!" });
            }

            res.status(200).json({ 
                message: `Berhasil! Lagu '${title}' - ${artist_name} tervalidasi di MySQL dan sukses disimpan ke favorit MongoDB.`, 
                data: hasilMongo 
            });
        });

    } catch (err) {
        res.status(500).json({ message: "Error internal server", error: err.message });
    }
});

// --- 7B. Menghapus Lagu dari Favorit ($pull) ---
app.delete('/api/favorites', async (req, res) => {
    try {
        const { user_id, song_id } = req.body;

        // Logika query: Mencari dokumen berdasarkan user_id dan memastikan song_id tersebut eksis di dalam array.
        const hasil = await Favorite.findOneAndUpdate(
            { user_id: user_id, "songs.song_id": song_id },
            {
                $pull: { songs: { song_id: song_id } }, // Mengeluarkan objek lagu dari array songs
                $inc: { total_favorites: -1 }, // Mengurangi counter total favorit
                $set: { updated_at: new Date() }
            },
            { new: true }
        );

        if (!hasil) return res.status(404).json({ message: "Data tidak ditemukan atau lagu memang tidak ada di favorit." });
        res.status(200).json({ message: "Lagu berhasil dihapus dari favorit!", data: hasil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7C. Menampilkan Semua Lagu Favorit User ---
app.get('/api/users/:userId/favorites', async (req, res) => {
    try {
        const user_id = req.params.userId;
        // Proyeksi { songs: 1, total_favorites: 1, _id: 0 } digunakan untuk menghemat bandwidth
        // dengan hanya mengambil properti array songs tanpa mengikutkan properti _id bawaan Mongo.
        const hasil = await Favorite.findOne({ user_id: user_id }, { songs: 1, total_favorites: 1, _id: 0 });
        res.status(200).json({ data: hasil || { songs: [], total_favorites: 0 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =================================================================
// FUNGSI 8: FOLLOW/UNFOLLOW ARTIST
// =================================================================

// --- 8A. Follow Artist (Versi Perbaikan Tanpa Kolom Genre di Artists MySQL) ---
app.post('/api/artists/follow', async (req, res) => {
    try {
        const { user_id, artist_id } = req.body;

        if (!user_id || !artist_id) {
            return res.status(400).json({ message: "Gagal! user_id and artist_id wajib diisi." });
        }

        // PERBAIKAN: Menghapus kolom 'genre' karena tidak ada di skema DDL tabel artists MySQL
        const cekMySQLQuery = `SELECT artist_name, country FROM artists WHERE artist_id = ?`;

        mysqlConnection.query(cekMySQLQuery, [artist_id], async (err, mysqlResults) => {
            if (err) {
                return res.status(500).json({ message: "Error saat mengecek database MySQL", error: err.message });
            }

            if (mysqlResults.length === 0) {
                return res.status(404).json({ 
                    message: `Gagal mem-follow! Artist dengan ID ${artist_id} tidak terdaftar di katalog MySQL kelompok 7.` 
                });
            }

            // Ambil data asli dari MySQL yang tersedia
            const artist_name = mysqlResults[0].artist_name;
            const country = mysqlResults[0].country;

            // Lanjutkan proses insert data embedding ke MongoDB
            const hasilMongo = await ArtistFollow.findOneAndUpdate(
                { user_id: user_id, "artists.artist_id": { $ne: artist_id } },
                {
                    $push: {
                        artists: { artist_id, artist_name, country, followed_at: new Date() } // Kolom genre dihilangkan agar aman
                    },
                    $inc: { total_following: 1 },
                    $set: { updated_at: new Date() }
                },
                { upsert: true, new: true }
            );

            if (!hasilMongo) {
                return res.status(400).json({ message: "Kamu sudah mem-follow artis ini!" });
            }

            res.status(200).json({ 
                message: `Berhasil! Musisi '${artist_name}' tervalidasi di MySQL dan sukses di-follow di MongoDB.`, 
                data: hasilMongo 
            });
        });

    } catch (err) {
        res.status(500).json({ message: "Error internal server", error: err.message });
    }
});

// --- 8B. Unfollow Artist (Versi Efisien Murni MongoDB) ---
app.delete('/api/artists/unfollow', async (req, res) => {
    try {
        const { user_id, artist_id } = req.body;

        if (!user_id || !artist_id) {
            return res.status(400).json({ message: "Gagal! user_id dan artist_id wajib diisi." });
        }

        // Langsung cari dokumen di MongoDB berdasarkan user_id dan pastikan artist_id eksis di array
        const hasilMongo = await ArtistFollow.findOneAndUpdate(
            { user_id: user_id, "artists.artist_id": artist_id }, // Validasi langsung di Mongo
            {
                $pull: { artists: { artist_id: artist_id } }, // Mengeluarkan objek artist dari array
                $inc: { total_following: -1 }, // Mengurangi counter jumlah following
                $set: { updated_at: new Date() }
            },
            { new: true }
        );

        // Jika user ternyata belum pernah mem-follow artist tersebut di MongoDB
        if (!hasilMongo) {
            return res.status(404).json({ 
                message: "Gagal unfollow! Data tidak ditemukan atau kamu memang belum mem-follow musisi ini." 
            });
        }

        res.status(200).json({ 
            message: "Berhasil! Sukses unfollow musisi dari daftar MongoDB.", 
            data: hasilMongo 
        });

    } catch (err) {
        res.status(500).json({ message: "Error internal server", error: err.message });
    }
});


// =================================================================
// FUNGSI 9: RIWAYAT PEMUTARAN LAGU
// =================================================================
app.post('/api/playback-history', async (req, res) => {
    try {
        // Logika skema: Menggunakan pendekatan 1 dokumen per pemutaran (bukan array embedding besar).
        // Hal ini dirancang karena data log transaksi pemutaran bertambah dengan intensitas tinggi (High-Frequency).
        const logBaru = new PlaybackHistory(req.body);
        await logBaru.save();
        res.status(201).json({ message: "Riwayat pemutaran lagu berhasil dicatat!", data: logBaru });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =================================================================
// FUNGSI 10: REKOMENDASI MUSIK UTAMA
// =================================================================
app.get('/api/users/:userId/recommendations', async (req, res) => {
    try {
        const user_id = parseInt(req.params.userId);

        // Tahap 1: Menarik data genre minat milik user dari koleksi user_preferences
        const preferensiUser = await UserPreference.findOne({ user_id: user_id }, { preferred_genres: 1, _id: 0 });

        if (!preferensiUser || !preferensiUser.preferred_genres) {
            return res.status(200).json({ message: "Belum ada preferensi terdaftar.", recommendations: [] });
        }

        // Tahap 2: Pipeline Agregasi untuk menyaring log riwayat pemutaran global
        const rekomendasi = await PlaybackHistory.aggregate([
            {
                $match: {
                    user_id: { $ne: user_id }, // Collaborative Filtering: Mencari data dari tren dengar user lain
                    genre: { $in: preferensiUser.preferred_genres } // Menyaring agar genrenya sesuai dengan preferensi user aktif
                }
            },
            {
                $group: {
                    _id: {
                        song_id: "$song_id",
                        title: "$song_title",
                        artist_name: "$artist_name",
                        genre: "$genre"
                    },
                    total_play: { $sum: 1 } // Mengakumulasi total pemutaran lagu global sebagai indikator popularitas
                }
            },
            { $sort: { total_play: -1 } }, // Mengurutkan berdasarkan total putar terbanyak
            { $limit: 10 } // Membatasi output sistem rekomendasi sebanyak 10 lagu teratas
        ]);

        res.status(200).json({
            message: "Rekomendasi musik berhasil digenerate melalui pipeline agregasi!",
            preferred_genres: preferensiUser.preferred_genres,
            recommendations: rekomendasi
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =================================================================
// FUNGSI 11: PREFERENSI MUSIK USER
// =================================================================

// --- 11A. Menampilkan Profil Preferensi & Statistik ---
app.get('/api/users/:userId/preferences', async (req, res) => {
    try {
        const user_id = parseInt(req.params.userId);
        const hasil = await UserPreference.findOne({ user_id: user_id }, { _id: 0 });
        if (!hasil) return res.status(404).json({ message: "Preferensi user belum diatur." });
        res.status(200).json({ data: hasil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11B. Mengatur / Menyimpan Preferensi Baru ---
app.post('/api/users/preferences', async (req, res) => {
    try {
        const { user_id, preferred_genres, preferred_language, settings, listening_stats } = req.body;
        // Menggunakan findOneAndUpdate dengan opsi { upsert: true }
        // untuk melakukan operasi insert otomatis jika data belum ada, atau update jika sudah ada.
        const hasil = await UserPreference.findOneAndUpdate(
            { user_id: user_id },
            { preferred_genres, preferred_language, settings, listening_stats, updated_at: new Date() },
            { upsert: true, new: true }
        );
        res.status(200).json({ message: "Preferensi musik berhasil diperbarui!", data: hasil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =================================================================
// MENYALAKAN SERVER
// =================================================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});