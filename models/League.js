import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الدوري مطلوب'],
    unique: true,
    trim: true,
    maxlength: [100, 'اسم الدوري يجب ألا يتجاوز 100 حرف']
  },
  logo: {
    type: String, // Will store the path to the uploaded image
    default: '/uploads/default-league.png' // A default placeholder image
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'الوصف يجب ألا يتجاوز 500 حرف']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate to get all teams belonging to a specific league
leagueSchema.virtual('teams', {
  ref: 'Team',
  localField: '_id',
  foreignField: 'leagueId'
});

const League = mongoose.model('League', leagueSchema);

export default League;
