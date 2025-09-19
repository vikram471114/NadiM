import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: [true, 'يجب ربط التوقع بمباراة'],
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // We link to the User, not the Participant for simplicity
    required: [true, 'يجب ربط التوقع بمستخدم'],
    index: true,
  },
  predictedScoreA: {
    type: Number,
    required: [true, 'توقع الفريق الأول مطلوب'],
    min: [0, 'النتيجة المتوقعة لا يمكن أن تكون سالبة'],
  },
  predictedScoreB: {
    type: Number,
    required: [true, 'توقع الفريق الثاني مطلوب'],
    min: [0, 'النتيجة المتوقعة لا يمكن أن تكون سالبة'],
  },
  pointsAwarded: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// A compound index to ensure that each user can only make one prediction per match.
// This is a critical data integrity rule for the application.
predictionSchema.index({ matchId: 1, userId: 1 }, { unique: true });

const Prediction = mongoose.model('Prediction', predictionSchema);

export default Prediction;
