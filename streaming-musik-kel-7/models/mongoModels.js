const mongoose = require('mongoose');

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
module.exports = { Favorite, ArtistFollow, PlaybackHistory, UserPreference };