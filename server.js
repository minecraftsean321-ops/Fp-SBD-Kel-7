const express = require('express');
const mysql = require('mysql2');
const mongoose = require('mongoose');
const readline = require('readline'); 
const http = require('http');

const app = express();
app.use(express.json());

const PORT = 3000;

// =================================================================
// 🔌 1. INITIAL KONEKSI DATABASE (POOLING ARCHITECTURE)
// =================================================================

const mysqlConnection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sbd_streaming_musik',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// =================================================================
// 2. BOOT SEQUENCE: MongoDB dulu → verifikasi MySQL → baru listen
// =================================================================

mongoose.connect('mongodb://localhost:27017/sbd_streaming_nosql')
    .then(() => {
        console.log('✅ Sistem Berhasil Terkunci Fisik ke MongoDB');

        // Verifikasi MySQL pool bisa konek sebelum server dijalankan
        mysqlConnection.getConnection((err, connection) => {
            if (err) {
                console.error('❌ Koneksi MySQL Gagal:', err.message);
                process.exit(1);
            }

            connection.release(); // Kembalikan koneksi ke pool setelah verifikasi
            console.log('✅ Sistem Berhasil Terkunci Fisik ke MySQL Pool XAMPP');

            // =================================================================
            // 3. DELEGASI JALUR UTAMA (SINKRON DI DALAM DB POOL)
            // =================================================================
            const authRoutes        = require('./streaming-musik-kel-7/routes/authRoutes')(mysqlConnection);
            const catalogRoutes     = require('./streaming-musik-kel-7/routes/catalogRoutes')(mysqlConnection);
            const playlistRoutes    = require('./streaming-musik-kel-7/routes/playlistRoutes')(mysqlConnection);
            const favoriteRoutes    = require('./streaming-musik-kel-7/routes/favoriteRoutes')(mysqlConnection);
            const followRoutes      = require('./streaming-musik-kel-7/routes/followRoutes')(mysqlConnection);
            const interactionRoutes = require('./streaming-musik-kel-7/routes/interactionRoutes');

            // Daftarkan base-URL endpoint ke middleware Express
            app.use('/api/auth',         authRoutes);
            app.use('/api/catalog',      catalogRoutes);
            app.use('/api/playlists',    playlistRoutes);
            app.use('/api/favorites',    favoriteRoutes);
            app.use('/api/artists',      followRoutes);
            app.use('/api/interactions', interactionRoutes);

            // JALANKAN SERVER SETELAH SEMUA KONEKSI SIAP
            app.listen(PORT, () => {
                console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
                setTimeout(tampilkanMenuUtama, 100);
            });
        });
    })
    .catch((err) => {
        console.error('❌ Koneksi MongoDB Gagal Total:', err.message);
        process.exit(1);
    });

// =================================================================
// 🖥️ 4. INTERACTIVE TERMINAL TESTING MENU (Readline Engine)
// =================================================================
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function jalankanTembakAPI(endpoint, method, payload = null) {
    const dataString = payload ? JSON.stringify(payload) : '';
    
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: endpoint,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString)
        }
    };

    console.log(`\n⏳ Mengirim Request: ${method} http://localhost:${PORT}${endpoint}...`);

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log(`\n=================== RESPONSE TERMINAL ===================`);
            console.log(`Status Code: ${res.statusCode}`);
            try {
                console.log(JSON.stringify(JSON.parse(body), null, 2));
            } catch (e) {
                console.log(body);
            }
            console.log(`=========================================================\n`);
            
            rl.question('Tekan [ENTER] untuk kembali ke Menu Utama...', () => {
                tampilkanMenuUtama();
            });
        });
    });

    req.on('error', (err) => {
        console.error(`❌ Request Error: ${err.message}`);
        rl.question('Tekan [ENTER] untuk kembali ke Menu Utama...', () => {
            tampilkanMenuUtama();
        });
    });

    if (payload && method !== 'GET') {
        req.write(dataString);
    }
    req.end();
}

function tampilkanMenuUtama() {
    console.clear();
    console.log(`===========================================================`);
    console.log(`🎵  CLI INTERACTIVE TESTING DASHBOARD - KELOMPOK 7  🎵`);
    console.log(`===========================================================`);
    console.log(`[1]  Fungsi 1A: Register User Baru (MySQL)`);
    console.log(`[2]  Fungsi 1B: Login User (MySQL)`);
    console.log(`[3]  Fungsi 2A: Tambah Artist Baru (MySQL - Anti Duplikat)`);
    console.log(`[4]  Fungsi 3A: Tambah Lagu Baru (MySQL - Anti Duplikat)`);
    console.log(`[5]  Fungsi 4 : Cari Lagu Berdasarkan Judul/Genre/Artist (MySQL)`);
    console.log(`[6]  Fungsi 5 : Buat Playlist Baru (MySQL)`);
    console.log(`[7]  Fungsi 6 : Tambah Lagu ke Playlist (MySQL)`);
    console.log(`[8]  Fungsi 11: Simpan Preferensi Musik User (MongoDB)`);
    console.log(`[9]  Fungsi 7A: Tambah Lagu ke Favorit (Cross-Database)`);
    console.log(`[10] Fungsi 8A: Follow Artist Induk (Cross-Database)`);
    console.log(`[11] Fungsi 9 : Catat Riwayat Pemutaran Lagu (MongoDB Log)`);
    console.log(`[12] Fungsi 10: Ambil Rekomendasi Musik User (Aggregation)`);
    console.log(`[0]  Keluar dari Aplikasi`);
    console.log(`===========================================================`);
    
    rl.question('Masukkan nomor fungsi yang ingin diuji (0-12): ', (pilihan) => {
        switch (pilihan.trim()) {
            case '1':
                console.log('\n--- Form Registrasi User Baru ---');
                rl.question('Masukkan Username : ', (username) => {
                    rl.question('Masukkan Email    : ', (email) => {
                        rl.question('Masukkan Password : ', (password) => {
                            jalankanTembakAPI('/api/auth/register', 'POST', { username, email, password });
                        });
                    });
                });
                break;

            case '2':
                console.log('\n--- Form Login User ---');
                rl.question('Masukkan Email    : ', (email) => {
                    rl.question('Masukkan Password : ', (password) => {
                        jalankanTembakAPI('/api/auth/login', 'POST', { email, password });
                    });
                });
                break;

            case '3':
                console.log('\n--- Form Tambah Artist Baru ---');
                rl.question('Nama Artist       : ', (artist_name) => {
                    rl.question('Asal Negara       : ', (country) => {
                        rl.question('Tahun Debut       : ', (debut) => {
                            rl.question('Deskripsi Singkat : ', (description) => {
                                jalankanTembakAPI('/api/catalog/artists', 'POST', { 
                                    artist_name, 
                                    country, 
                                    debut_year: parseInt(debut) || 0, 
                                    description 
                                });
                            });
                        });
                    });
                });
                break;

            case '4':
                console.log('\n--- Form Tambah Lagu Baru ---');
                rl.question('ID Artist (MySQL) : ', (artist_id) => {
                    rl.question('Judul Lagu        : ', (title) => {
                        rl.question('Genre             : ', (genre) => {
                            rl.question('Durasi (Detik)    : ', (duration) => {
                                rl.question('Tanggal Rilis     : ', (release_date) => {
                                    rl.question('Audio URL         : ', (audio_url) => {
                                        jalankanTembakAPI('/api/catalog/songs', 'POST', {
                                            artist_id: parseInt(artist_id),
                                            title, genre,
                                            duration: parseInt(duration) || 0,
                                            release_date, audio_url
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
                break;

            case '5':
                console.log('\n--- Menu Pencarian Katalog Lagu ---');
                rl.question('Cari Berdasarkan (1: Judul, 2: Genre, 3: Artist Name): ', (opsi) => {
                    rl.question('Masukkan Keyword Pencarian: ', (keyword) => {
                        let queryParam = '';
                        if (opsi === '1') queryParam = `judul=${keyword}`;
                        else if (opsi === '2') queryParam = `genre=${keyword}`;
                        else if (opsi === '3') queryParam = `artist=${keyword}`;
                        
                        jalankanTembakAPI(`/api/catalog/songs/search?${queryParam}`, 'GET');
                    });
                });
                break;

            case '6':
                console.log('\n--- Form Pembuatan Playlist ---');
                rl.question('ID User Pembuat   : ', (user_id) => {
                    rl.question('Nama Playlist     : ', (playlist_name) => {
                        rl.question('Deskripsi         : ', (description) => {
                            jalankanTembakAPI('/api/playlists', 'POST', { user_id: parseInt(user_id), playlist_name, description });
                        });
                    });
                });
                break;

            case '7':
                console.log('\n--- Form Tambah Lagu ke Dalam Playlist ---');
                rl.question('ID Playlist       : ', (playlist_id) => {
                    rl.question('ID Lagu (Song ID) : ', (song_id) => {
                        jalankanTembakAPI('/api/playlists/add-song', 'POST', { playlist_id: parseInt(playlist_id), song_id: parseInt(song_id) });
                    });
                });
                break;

            case '8':
                console.log('\n--- Form Atur Preferensi Musik (MongoDB) ---');
                rl.question('ID User           : ', (user_id) => {
                    rl.question('Genre Favorit (pisahkan dengan koma, ex: Pop,Rock) : ', (genres) => {
                        rl.question('Bahasa Preferensi : ', (lang) => {
                            const arrGenres = genres.split(',').map(g => g.trim());
                            jalankanTembakAPI('/api/interactions/users/preferences', 'POST', { 
                                user_id: parseInt(user_id), 
                                preferred_genres: arrGenres, 
                                preferred_language: lang 
                            });
                        });
                    });
                });
                break;

            case '9':
                console.log('\n--- Form Tambah Lagu Favorit (Cross-DB Validation) ---');
                rl.question('ID User           : ', (user_id) => {
                    rl.question('ID Lagu (Song ID) : ', (song_id) => {
                        jalankanTembakAPI('/api/favorites', 'POST', { user_id: parseInt(user_id), song_id: parseInt(song_id) });
                    });
                });
                break;

            case '10':
                console.log('\n--- Form Follow Artist (Cross-DB Validation) ---');
                rl.question('ID User           : ', (user_id) => {
                    rl.question('ID Artist         : ', (artist_id) => {
                        jalankanTembakAPI('/api/artists/follow', 'POST', { user_id: parseInt(user_id), artist_id: parseInt(artist_id) });
                    });
                });
                break;

            case '11':
                console.log('\n--- Form Catat Riwayat Pemutaran (MongoDB Global Log) ---');
                rl.question('ID User           : ', (user_id) => {
                    rl.question('ID Lagu           : ', (song_id) => {
                        rl.question('Judul Lagu        : ', (song_title) => {
                            rl.question('Genre Lagu        : ', (genre) => {
                                rl.question('Nama Artist       : ', (artist_name) => {
                                    jalankanTembakAPI('/api/interactions/playback-history', 'POST', {
                                        user_id: parseInt(user_id),
                                        song_id: parseInt(song_id),
                                        song_title,
                                        artist_id: 1, 
                                        artist_name,
                                        genre,
                                        duration: 200,
                                        listened_duration: 200,
                                        completed: true
                                    });
                                });
                            });
                        });
                    });
                });
                break;

            case '12':
                console.log('\n--- Generate Real-time Rekomendasi Musik ---');
                rl.question('Masukkan ID User Target : ', (user_id) => {
                    jalankanTembakAPI(`/api/interactions/users/${user_id}/recommendations`, 'GET');
                });
                break;

            case '0':
                console.log('Terima kasih! Menutup sesi pengujian Terminal Kelompok 7...');
                rl.close();
                process.exit(0);
            default:
                console.log('⚠️ Pilihan tidak valid! Silakan masukkan angka 0 sampai 12.');
                setTimeout(tampilkanMenuUtama, 1500);
                break;
        }
    });
}