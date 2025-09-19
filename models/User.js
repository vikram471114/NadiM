import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'اسم المستخدم مطلوب'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'اسم المستخدم يجب أن يكون على الأقل 3 أحرف'],
    maxlength: [30, 'اسم المستخدم يجب أن لا يتجاوز 30 حرفاً']
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [6, 'كلمة المرور يجب أن تكون على الأقل 6 أحرف'],
    select: false // Crucial for security: never return password by default
  },
  role: {
    type: String,
    enum: {
      values: ['Admin', 'Manager', 'Predictor'],
      message: 'الدور يجب أن يكون: Admin, Manager, أو Predictor'
    },
    required: [true, 'دور المستخدم مطلوب']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate to connect User with Participant data
userSchema.virtual('participant', {
  ref: 'Participant',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Middleware: Hash password before saving the user document
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with a cost factor of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance Method: To compare candidate password with the hashed password in DB
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

export default User;
