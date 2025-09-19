import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الفريق مطلوب'],
    trim: true,
    maxlength: [100, 'اسم الفريق يجب ألا يتجاوز 100 حرف']
  },
  logo: {
    type: String, // Path to the uploaded image
    default: '/uploads/default-team.png' // Default placeholder image
  },
  leagueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: [true, 'يجب ربط الفريق بدوري معين'],
    index: true // Speeds up queries that filter teams by league
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true
});

// Compound index to ensure that a team name is unique within a single league.
// This allows two different leagues to have a team with the same name.
teamSchema.index({ leagueId: 1, name: 1 }, { unique: true });

const Team = mongoose.model('Team', teamSchema);

export default Team;
