import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  leagueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: [true, 'يجب ربط المباراة بدوري'],
    index: true,
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'الفريق الأول مطلوب'],
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'الفريق الثاني مطلوب'],
  },
  matchDateTime: {
    type: Date,
    required: [true, 'تاريخ ووقت المباراة مطلوب'],
    index: true,
  },
  weight: {
    type: Number,
    enum: {
      values: [1, 2, 3], // Represents 1-star, 2-star, 3-star
      message: 'وزن المباراة يجب أن يكون 1 أو 2 أو 3'
    },
    default: 1,
  },
  scoreA: {
    type: Number,
    min: [0, 'النتيجة لا يمكن أن تكون سالبة'],
    default: null,
  },
  scoreB: {
    type: Number,
    min: [0, 'النتيجة لا يمكن أن تكون سالبة'],
    default: null,
  },
  status: {
    type: String,
    enum: {
      values: ['Scheduled', 'Finished', 'Cancelled', 'Postponed'],
      message: 'الحالة غير صالحة'
    },
    default: 'Scheduled',
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Validator: Ensure Team A and Team B are not the same team.
matchSchema.pre('validate', function(next) {
  if (this.teamA && this.teamB && this.teamA.equals(this.teamB)) {
    this.invalidate('teamB', 'الفريق الأول والفريق الثاني لا يمكن أن يكونا نفس الفريق.');
  }
  next();
});

// Virtual property: To dynamically check if predictions are still open
matchSchema.virtual('isPredictionOpen').get(function() {
  // Predictions are open if the match is scheduled AND the current time is before the match time
  return this.status === 'Scheduled' && new Date() < this.matchDateTime;
});

const Match = mongoose.model('Match', matchSchema);

export default Match;
