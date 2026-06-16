const express = require('express');
const router = express.Router();


const mongoModels = require('../models/mongoModels');
const PlaybackHistory = mongoModels.PlaybackHistory;
const UserPreference = mongoModels.UserPreference;
const Favorite = mongoModels.Favorite;
const ArtistFollow = mongoModels.ArtistFollow;

// =================================================================
// FUNGSI 9: RIWAYAT PEMUTARAN LAGU
// =================================================================
router.post('/playback-history', async (req, res) => {
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
router.get('/users/:userId/recommendations', async (req, res) => {
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
router.get('/users/:userId/preferences', async (req, res) => {
    try {
        const user_id = parseInt(req.params.userId);
        const hasil = await UserPreference.findOne({ user_id: user_id }, { _id: 0 });
        if (!hasil) return res.status(404).json({ message: "Preferensi user belum diatur." });
        res.status(200).json({ data: hasil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11B. Otomasi Sinkronisasi Preferensi Berdasarkan Perilaku User ---
router.post('/users/preferences', async (req, res) => {
    try {
        const user_id = parseInt(req.body.user_id);
        if (!user_id) return res.status(400).json({ message: "Gagal! user_id wajib diisi." });

        // TAHAP 1: Ambil data genre dari koleksi Favorites milik user
        const dataFavorit = await Favorite.findOne({ user_id: user_id });
        let genreDariFavorit = dataFavorit ? dataFavorit.songs.map(s => s.genre) : [];

        // TAHAP 2: Agregasi PlaybackHistory untuk mencari Top Genre & Total Menit Putar user
        const statistikPutar = await PlaybackHistory.aggregate([
            { $match: { user_id: user_id } },
            {
                $group: {
                    _id: "$genre",
                    total_putar: { $sum: 1 },
                    total_durasi: { $sum: "$listened_duration" },
                    top_artist: { $first: "$artist_name" } // Mengambil sampel salah satu nama musisi
                }
            },
            { $sort: { total_putar: -1 } } // Urutkan dari genre yang paling sering diputar
        ]);

        // Ekstraksi data hasil agregasi riwayat pemutaran
        let genreDariRiwayat = statistikPutar.map(item => item._id);
        let totalMenitDengar = statistikPutar.reduce((acc, item) => acc + item.total_durasi, 0) / 60;
        let topGenreNama = statistikPutar.length > 0 ? statistikPutar[0]._id : "Unknown";
        let topArtistNama = statistikPutar.length > 0 ? statistikPutar[0].top_artist : "Unknown";

        // TAHAP 3: Ambil data musisi yang di-follow user dari ArtistFollow
        const dataFollow = await ArtistFollow.findOne({ user_id: user_id });
        let totalMusisiDiFollow = dataFollow ? dataFollow.artists.length : 0;

        // TAHAP 4: Satukan & Hilangkan Duplikasi Genre (Gabungan data Favorit + Riwayat Putar)
        const semuaGenreGabungan = [...new Set([...genreDariFavorit, ...genreDariRiwayat])];

        // TAHAP 5: UPSERT (Update/Insert) otomatis profil preferensi musik di MongoDB
        const preferensiTerupdate = await UserPreference.findOneAndUpdate(
            { user_id: user_id },
            {
                preferred_genres: semuaGenreGabungan.length > 0 ? semuaGenreGabungan : ["General"],
                preferred_language: "Indonesian/English",
                settings: {
                    audio_quality: "High",
                    autoplay: true,
                    explicit_content: false,
                    discovery_mode: true
                },
                listening_stats: {
                    total_minutes: Math.round(totalMenitDengar),
                    most_played_genre: topGenreNama,
                    most_played_artist: topArtistNama,
                    avg_daily_minutes: Math.round(totalMenitDengar / 7) || 0, // Estimasi rata-rata harian seminggu
                    peak_hour: new Date().getHours() // Mengambil jam saat tombol sinkronisasi ditekan
                },
                updated_at: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ 
            message: `Sukses! Sistem berhasil memanen data dari Favorites, History, & Follower untuk mengotomatisasi preferensi User ${user_id}.`, 
            data: preferensiTerupdate 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;