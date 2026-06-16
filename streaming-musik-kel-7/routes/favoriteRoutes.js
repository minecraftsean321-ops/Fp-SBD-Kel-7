const express = require('express');
const router = express.Router();

// Ambil model MongoDB secara aman
const mongoModels = require('../models/mongoModels');
const Favorite = mongoModels.Favorite;

module.exports = (mysqlConnection) => {

// =================================================================
// FUNGSI 7: TAMBAH/HAPUS FAVORIT LAGU (Cross-Database Architecture)
// =================================================================

// --- 7A. Menambahkan Lagu ke Favorit (Murni Async-Await) ---
router.post('/', async (req, res) => {
    try {
        const { user_id, song_id } = req.body;

        if (!user_id || !song_id) {
            return res.status(400).json({ message: "Gagal! user_id dan song_id wajib diisi." });
        }

        // TAHAP 1: Mampir ke MySQL menggunakan Promise agar tidak merusak scope asinkronus
        const cekMySQLQuery = `
            SELECT songs.title, songs.artist_id, songs.genre, songs.duration, artists.artist_name 
            FROM songs 
            JOIN artists ON songs.artist_id = artists.artist_id 
            WHERE songs.song_id = ?
        `;

        // Bungkus ke dalam Promise agar bisa di-await secara linear
        const mysqlResults = await new Promise((resolve, reject) => {
            mysqlConnection.query(cekMySQLQuery, [song_id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Jika lagu tidak terdaftar di database MySQL
        if (!mysqlResults || mysqlResults.length === 0) {
            return res.status(404).json({ 
                message: `Gagal menambah favorit! Lagu dengan ID ${song_id} tidak valid atau tidak terdaftar di MySQL.` 
            });
        }

        // Ekstraksi data atribut lagu dari baris MySQL
        const title = mysqlResults[0].title;
        const artist_id = mysqlResults[0].artist_id;
        const artist_name = mysqlResults[0].artist_name;
        const genre = mysqlResults[0].genre;
        const duration = mysqlResults[0].duration;

        // TAHAP 2: Eksekusi embedding data ke MongoDB di scope utama rute
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

    } catch (err) {
        res.status(500).json({ message: "Error internal server", error: err.message });
    }
});

// --- 7B. Menghapus Lagu dari Favorit ($pull) ---
router.delete('/', async (req, res) => {
    try {
        const { user_id, song_id } = req.body;

        const hasil = await Favorite.findOneAndUpdate(
            { user_id: user_id, "songs.song_id": song_id },
            {
                $pull: { songs: { song_id: song_id } }, 
                $inc: { total_favorites: -1 }, 
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
router.get('/users/:userId', async (req, res) => {
    try {
        const user_id = req.params.userId;
        const hasil = await Favorite.findOne({ user_id: user_id }, { songs: 1, total_favorites: 1, _id: 0 });
        res.status(200).json({ data: hasil || { songs: [], total_favorites: 0 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

 return router;
};