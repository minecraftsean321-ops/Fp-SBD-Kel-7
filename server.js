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
    console.log(`🎵   CLI INTERACTIVE TESTING DASHBOARD - KELOMPOK 7  🎵`);
    console.log(`===========================================================`);
    console.log(`[1] SUB-MENU 1: Manajemen Akun User (Register / Login MySQL)`);
    console.log(`[2] SUB-MENU 2: Manajemen Katalog Musik (Full CRUD Artist & Lagu)`);
    console.log(`[3] SUB-MENU 3: Manajemen Playlists (Kelola Playlist & Lagu)`);
    console.log(`[4] SUB-MENU 4: Kelola Musik Favorit (Array Embedding MongoDB)`);
    console.log(`[5] SUB-MENU 5: Sistem Follow Artist (Cross-DB Validation)`);
    console.log(`[6] SUB-MENU 6: Engine Rekomendasi & Preferensi (Otomasi MongoDB)`);
    console.log(`[0] Keluar dari Aplikasi`);
    console.log(`===========================================================`);
    
    rl.question('Masukkan nomor sub-menu utama yang ingin dibuka (0-6): ', (pilihan) => {
        switch (pilihan.trim()) {
            
            case '1': // ================= SUB-MENU 1: AUTH =================
                console.log('\n--- [SUB-MENU 1: MANAJEMEN AKUN USER] ---');
                console.log('[1] Register User Baru');
                console.log('[2] Login User');
                console.log('[0] Kembali');
                rl.question('Pilih Opsi: ', (sub) => {
                    if (sub === '1') {
                        console.log('\n--- Form Registrasi User Baru ---');
                        rl.question('Masukkan Username : ', (username) => {
                            rl.question('Masukkan Email    : ', (email) => {
                                rl.question('Masukkan Password : ', (password) => {
                                    jalankanTembakAPI('/api/auth/register', 'POST', { username, email, password });
                                });
                            });
                        });
                    } else if (sub === '2') {
                        console.log('\n--- Form Login User ---');
                        rl.question('Masukkan Email    : ', (email) => {
                            rl.question('Masukkan Password : ', (password) => {
                                jalankanTembakAPI('/api/auth/login', 'POST', { email, password });
                            });
                        });
                    } else { tampilkanMenuUtama(); }
                });
                break;

            case '2': // ================= SUB-MENU 2: FULL CRUD KATALOG =================
                console.log('\n--- [SUB-MENU 2: MANAJEMEN KATALOG MUSIK] ---');
                console.log('KELOLA DATA ARTIST:');
                console.log(' [1] Create : Tambah Artist Baru');
                console.log(' [2] Read   : Tampilkan Semua Artist');
                console.log(' [3] Update : Ubah Data Artist');
                console.log(' [4] Delete : Hapus Artist dari Katalog');
                console.log('KELOLA DATA LAGU:');
                console.log(' [5] Create : Tambah Lagu Baru');
                console.log(' [6] Read   : Tampilkan Semua Lagu');
                console.log(' [7] Update : Ubah Data Lagu');
                console.log(' [8] Delete : Hapus Lagu dari Katalog');
                console.log(' [9] Search : Cari Lagu Berdasarkan Judul/Genre/Artist');
                console.log(' [0] Kembali');
                rl.question('Pilih Opsi (0-9): ', (sub) => {
                    switch (sub.trim()) {
                        case '1': // Create Artist
                            console.log('\n--- Form Tambah Artist Baru ---');
                            rl.question('Nama Artist       : ', (artist_name) => {
                                rl.question('Asal Negara       : ', (country) => {
                                    rl.question('Tahun Debut       : ', (debut) => {
                                        rl.question('Deskripsi Singkat : ', (description) => {
                                            jalankanTembakAPI('/api/catalog/artists', 'POST', { artist_name, country, debut_year: parseInt(debut) || 0, description });
                                        });
                                    });
                                });
                            });
                            break;
                        case '2': // Read Artist
                            jalankanTembakAPI('/api/catalog/artists', 'GET');
                            break;
                        case '3': // Update Artist
                            console.log('\n--- Form Update Data Artist ---');
                            rl.question('Masukkan ID Artist Target : ', (id) => {
                                rl.question('Nama Artist Baru          : ', (artist_name) => {
                                    rl.question('Asal Negara Baru          : ', (country) => {
                                        rl.question('Tahun Debut Baru          : ', (debut) => {
                                            rl.question('Deskripsi Baru            : ', (description) => {
                                                jalankanTembakAPI(`/api/catalog/artists/${id}`, 'PUT', { artist_name, country, debut_year: parseInt(debut) || 0, description });
                                            });
                                        });
                                    });
                                });
                            });
                            break;
                        case '4': // Delete Artist
                            rl.question('\nMasukkan ID Artist yang Ingin Dihapus : ', (id) => {
                                jalankanTembakAPI(`/api/catalog/artists/${id}`, 'DELETE');
                            });
                            break;
                        case '5': // Create Lagu
                            console.log('\n--- Form Tambah Lagu Baru ---');
                            rl.question('ID Artist Pemilik (MySQL) : ', (artist_id) => {
                                rl.question('Judul Lagu                : ', (title) => {
                                    rl.question('Genre                     : ', (genre) => {
                                        rl.question('Durasi (Detik)            : ', (duration) => {
                                            rl.question('Tanggal Rilis (YYYY-MM-DD): ', (release_date) => {
                                                rl.question('Audio URL                 : ', (audio_url) => {
                                                    jalankanTembakAPI('/api/catalog/songs', 'POST', { artist_id: parseInt(artist_id), title, genre, duration: parseInt(duration) || 0, release_date, audio_url });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                            break;
                        case '6': // Read Lagu
                            jalankanTembakAPI('/api/catalog/songs', 'GET');
                            break;
                        case '7': // Update Lagu
                            console.log('\n--- Form Update Data Lagu ---');
                            rl.question('Masukkan ID Lagu Target : ', (id) => {
                                rl.question('ID Artist Baru          : ', (artist_id) => {
                                    rl.question('Judul Lagu Baru         : ', (title) => {
                                        rl.question('Genre Baru              : ', (genre) => {
                                            rl.question('Durasi Baru (Detik)     : ', (duration) => {
                                                rl.question('Tanggal Rilis Baru      : ', (release_date) => {
                                                    rl.question('Audio URL Baru          : ', (audio_url) => {
                                                        jalankanTembakAPI(`/api/catalog/songs/${id}`, 'PUT', { artist_id: parseInt(artist_id), title, genre, duration: parseInt(duration) || 0, release_date, audio_url });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                            break;
                        case '8': // Delete Lagu
                            rl.question('\nMasukkan ID Lagu yang Ingin Dihapus : ', (id) => {
                                jalankanTembakAPI(`/api/catalog/songs/${id}`, 'DELETE');
                            });
                            break;
                        case '9': // Search
                            console.log('\n--- Menu Pencarian Katalog Lagu ---');
                            rl.question('Cari via (1: Judul, 2: Genre, 3: Nama Artist): ', (opsi) => {
                                rl.question('Masukkan Kata Kunci: ', (keyword) => {
                                    let param = opsi === '1' ? `judul=${keyword}` : opsi === '2' ? `genre=${keyword}` : `artist=${keyword}`;
                                    jalankanTembakAPI(`/api/catalog/songs/search?${param}`, 'GET');
                                });
                            });
                            break;
                        default:
                            tampilkanMenuUtama();
                            break;
                    }
                });
                break;

            case '3': // ================= SUB-MENU 3: PLAYLIST =================
                console.log('\n--- [SUB-MENU 3: MANAJEMEN PLAYLIST USER] ---');
                console.log('[1] Create : Buat Playlist Baru');
                console.log('[2] Add    : Masukkan Lagu ke Dalam Playlist');
                console.log('[3] Read   : Tampilkan Seluruh Isi Lagu di Playlist');
                console.log('[4] Remove : Keluarkan Lagu dari Playlist');
                console.log('[5] Delete : Hapus Playlist Utama');
                console.log('[0] Kembali');
                rl.question('Pilih Opsi (0-5): ', (sub) => {
                    if (sub === '1') {
                        console.log('\n--- Form Pembuatan Playlist ---');
                        rl.question('ID User Pembuat   : ', (user_id) => {
                            rl.question('Nama Playlist     : ', (playlist_name) => {
                                rl.question('Deskripsi         : ', (description) => {
                                    jalankanTembakAPI('/api/playlists', 'POST', { user_id: parseInt(user_id), playlist_name, description });
                                });
                            });
                        });
                    } else if (sub === '2') {
                        console.log('\n--- Form Tambah Lagu ke Playlist ---');
                        rl.question('ID Playlist       : ', (playlist_id) => {
                            rl.question('ID Lagu (Song ID) : ', (song_id) => {
                                jalankanTembakAPI('/api/playlists/add-song', 'POST', { playlist_id: parseInt(playlist_id), song_id: parseInt(song_id) });
                            });
                        });
                    } else if (sub === '3') {
                        rl.question('\nMasukkan ID Playlist Target : ', (id) => {
                            jalankanTembakAPI(`/api/playlists/${id}/songs`, 'GET');
                        });
                    } else if (sub === '4') {
                        console.log('\n--- Form Keluarkan Lagu dari Playlist ---');
                        rl.question('ID Playlist       : ', (playlist_id) => {
                            rl.question('ID Lagu (Song ID) : ', (song_id) => {
                                jalankanTembakAPI('/api/playlists/remove-song', 'DELETE', { playlist_id: parseInt(playlist_id), song_id: parseInt(song_id) });
                            });
                        });
                    } else if (sub === '5') {
                        rl.question('\nMasukkan ID Playlist Utama yang Ingin Dihapus : ', (id) => {
                            jalankanTembakAPI(`/api/playlists/${id}`, 'DELETE');
                        });
                    } else { tampilkanMenuUtama(); }
                });
                break;

            case '4': // ================= SUB-MENU 4: FAVORITES =================
                console.log('\n--- [SUB-MENU 4: KELOLA MUSIK FAVORIT (MongoDB)] ---');
                console.log('[1] Tambah Lagu ke Favorit');
                console.log('[2] Hapus Lagu dari Favorit');
                console.log('[3] Tampilkan Semua Lagu Favorit User');
                console.log('[0] Kembali');
                rl.question('Pilih Opsi: ', (sub) => {
                    if (sub === '1') {
                        console.log('\n--- Form Tambah Lagu Favorit ---');
                        rl.question('ID User           : ', (user_id) => {
                            rl.question('ID Lagu (Song ID) : ', (song_id) => {
                                jalankanTembakAPI('/api/favorites', 'POST', { user_id: parseInt(user_id), song_id: parseInt(song_id) });
                            });
                        });
                    } else if (sub === '2') {
                        console.log('\n--- Form Hapus Lagu dari Favorit ---');
                        rl.question('ID User           : ', (user_id) => {
                            rl.question('ID Lagu (Song ID) : ', (song_id) => {
                                jalankanTembakAPI('/api/favorites', 'DELETE', { user_id: parseInt(user_id), song_id: parseInt(song_id) });
                            });
                        });
                    } else if (sub === '3') {
                        rl.question('\nMasukkan ID User Target : ', (user_id) => {
                            jalankanTembakAPI(`/api/favorites/users/${user_id}`, 'GET');
                        });
                    } else { tampilkanMenuUtama(); }
                });
                break;

            case '5': // ================= SUB-MENU 5: FOLLOW ARTIST =================
                console.log('\n--- [SUB-MENU 5: SISTEM FOLLOW ARTIST] ---');
                console.log('[1] Follow Artist Baru');
                console.log('[2] Unfollow Artist');
                console.log('[3] Tampilkan Daftar Following User');
                console.log('[0] Kembali');
                rl.question('Pilih Opsi: ', (sub) => {
                    if (sub === '1') {
                        console.log('\n--- Form Follow Artist ---');
                        rl.question('ID User           : ', (user_id) => {
                            rl.question('ID Artist Target  : ', (artist_id) => {
                                jalankanTembakAPI('/api/artists/follow', 'POST', { user_id: parseInt(user_id), artist_id: parseInt(artist_id) });
                            });
                        });
                    } else if (sub === '2') {
                        console.log('\n--- Form Unfollow Artist ---');
                        rl.question('ID User           : ', (user_id) => {
                            rl.question('ID Artist Target  : ', (artist_id) => {
                                jalankanTembakAPI('/api/artists/follow', 'DELETE', { user_id: parseInt(user_id), artist_id: parseInt(artist_id) });
                            });
                        });
                    } else if (sub === '3') {
                        rl.question('\nMasukkan ID User Target : ', (user_id) => {
                            jalankanTembakAPI(`/api/artists/follow/users/${user_id}`, 'GET');
                        });
                    } else { tampilkanMenuUtama(); }
                });
                break;

            case '6': // ================= SUB-MENU 6: REKOMENDASI & PREFERENSI (SINKRON) =================
                console.log('\n--- [SUB-MENU 6: ENGINE REKOMENDASI & PREFERENSI USER (MONGODB)] ---');
                console.log('[1] Log-Transaksi : Catat Riwayat Pemutaran Lagu Baru');
                console.log('[2] Otomasi Profil : Generate Profil Preferensi & Statistik Musik');
                console.log('[3] Smart-Engine  : Ambil Rekomendasi Musik (Real-time Pipeline)');
                console.log('[4] Lihat Profil   : Tampilkan Detail Preferensi Aktif User');
                console.log('[0] Kembali');
                rl.question('Pilih Opsi (0-4): ', (sub) => {
                    if (sub === '1') {
                        console.log('\n--- Form Catat Riwayat Pemutaran ---');
                        rl.question('ID User           : ', (user_id) => {
                            rl.question('ID Lagu           : ', (song_id) => {
                                rl.question('Judul Lagu        : ', (song_title) => {
                                    rl.question('Genre Lagu        : ', (genre) => {
                                        rl.question('Nama Artist       : ', (artist_name) => {
                                            jalankanTembakAPI('/api/interactions/playback-history', 'POST', {
                                                user_id: parseInt(user_id), song_id: parseInt(song_id), song_title, artist_id: 1, artist_name, genre, duration: 240, listened_duration: 240, completed: true
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    } else if (sub === '2') {
                        console.log('\n--- Mengaktifkan Engine Pengumpul Perilaku User ---');
                        rl.question('Masukkan ID User Target : ', (user_id) => {
                            jalankanTembakAPI('/api/interactions/users/preferences', 'POST', { user_id: parseInt(user_id) });
                        });
                    } else if (sub === '3') {
                        console.log('\n--- Menjalankan MongoDB Pipeline Aggregation ---');
                        rl.question('Masukkan ID User Target : ', (user_id) => {
                            jalankanTembakAPI(`/api/interactions/users/${user_id}/recommendations`, 'GET');
                        });
                    } else if (sub === '4') {
                        rl.question('\nMasukkan ID User Target : ', (user_id) => {
                            jalankanTembakAPI(`/api/interactions/users/${user_id}/preferences`, 'GET');
                        });
                    } else { tampilkanMenuUtama(); }
                });
                break;

            case '0':
                console.log('Terima kasih! Menutup sesi pengujian Dashboard CLI Kelompok 7...');
                rl.close();
                process.exit(0);
            default:
                console.log('⚠️ Pilihan tidak valid! Masukkan angka 0 sampai 6.');
                setTimeout(tampilkanMenuUtama, 1500);
                break;
        }
    });
}