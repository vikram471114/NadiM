import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Each user can only have one participant profile
    index: true,   // Improves query performance for this field
  },
  fullName: {
    type: String,
    required: [true, 'الاسم الكامل مطلوب'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'رقم الجوال مطلوب'],
    trim: true,
    unique: true, // Each participant should have a unique phone number
  },
  region: {
    type: String,
    required: [true, 'المنطقة مطلوبة'],
    trim: true,
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const Participant = mongoose.model('Participant', participantSchema);

export default Participant;
