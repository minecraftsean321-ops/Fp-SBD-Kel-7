const express = require('express');
const router = express.Router();
const { ArtistFollow } = require('../models/mongoModels');

module.exports = (mysqlConnection) => {

// =================================================================
// FUNGSI 8: FOLLOW/UNFOLLOW ARTIST
// =================================================================

// --- 8A. Follow Artist (Versi Perbaikan Tanpa Kolom Genre di Artists MySQL) ---
router.post('/follow', async (req, res) => {
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
router.delete('/unfollow', async (req, res) => {
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

return router;
};