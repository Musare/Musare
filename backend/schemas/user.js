module.exports = mongoose => {

    const Schema = mongoose.Schema;

    const userSchema = new Schema({
        username: String,
        email: {
            verified: { type: Boolean, default: false },
            verificationToken: String,
            address: String
        },
        services: {
            password: {
                token: String
            },
            github: {
                token: String
            },
            discord: {
                token: String
            }
        },
        ban: {
            banned: { type: Boolean, default: false },
            reason: String,
            bannedAt: Date,
            bannedUntil: Date
        },
        mute: {
            muted: { type: Boolean, default: false },
            reason: String,
            mutedAt: Date,
            mutedUntil: Date
        },
        statistics: {
            songsRequested: { type: Number, default: 0 },
            songsAccepted: { type: Number, default: 0 }
        },
        createdAt: { type: Date, default: Date.now() }
    });

    return mongoose.model('user', userSchema);
}
