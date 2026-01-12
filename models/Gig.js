const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      required: true,
      maxlength: 2000
    },

    budget: {
      type: Number,
      required: true,
      min: 1
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ['open', 'assigned'],
      default: 'open',
      index: true
    }
  },
  { timestamps: true }
);

// Enables search by title
gigSchema.index({ title: 'text' });

module.exports = mongoose.model('Gig', gigSchema);
