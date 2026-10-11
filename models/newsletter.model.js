const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    source: {
        type: String,
        enum: ['footer', 'blog'],
        default: 'footer'
    },
    isActive: {
        type: Boolean,
        default: false
    },
    confirmationTokenHash: { type: String, select: false },
    confirmationExpiresAt: { type: Date, select: false },
    unsubscribeNonce: { type: String },
    subscribedAt: {
        type: Date,
        default: Date.now
    },
    unsubscribedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for faster queries (email index already created by unique: true)
newsletterSchema.index({ isActive: 1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

module.exports = Newsletter;
