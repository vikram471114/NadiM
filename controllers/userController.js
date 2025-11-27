import mongoose from 'mongoose';
import User from '../models/User.js';
import Participant from '../models/Participant.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import * as factory from '../utils/handlerFactory.js';

// ✅ دالة مساعدة لتنظيف المستخدم (تضيف بيانات وهمية لو ناقصة)
const sanitizeUser = (userDoc) => {
  // تحويل مستند المونجو إلى كائن عادي للتعديل عليه
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;

  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      name: 'غير محدد',
      fullName: 'غير محدد', // مهم جداً
      phone: '',            // قيمة فارغة تمنع الكراش
      region: '',
      email: '',
      image: ''
    };
  }
  return user;
};

// Get all users and populate participant data
export const getAllUsers = catchAsync(async (req, res, next) => {
    const rawUsers = await User.find().populate('participant');

    // ✅ التعديل هنا: نمر على كل المستخدمين ونصلح الناقص منهم
    const users = rawUsers.map(user => sanitizeUser(user));

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            data: users, // نرسل القائمة النظيفة
        },
    });
});

// Get a single user
// نحتاج لتعديل هذه أيضاً يدوياً لأن factory.getOne لا تدعم التعديل المباشر بسهولة
// سنستبدلها بدالة مخصصة للأمان
export const getUser = catchAsync(async (req, res, next) => {
    let query = User.findById(req.params.id).populate('participant');
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    // ✅ إصلاح المستخدم الفردي
    const safeUser = sanitizeUser(doc);

    res.status(200).json({
      status: 'success',
      data: {
        data: safeUser
      }
    });
});

// Update user
export const updateUser = catchAsync(async (req, res, next) => {
    const filteredBody = {
        username: req.body.username,
        role: req.body.role,
        isActive: req.body.isActive
    };
    
    Object.keys(filteredBody).forEach(key => filteredBody[key] === undefined && delete filteredBody[key]);

    // نستخدم findByIdAndUpdate ثم نجلب البيانات مرة أخرى للتأكد
    const updatedUserRaw = await User.findByIdAndUpdate(req.params.id, filteredBody, {
        new: true,
        runValidators: true,
    }).populate('participant');

    // ✅ إصلاح البيانات المرتجعة
    const updatedUser = sanitizeUser(updatedUserRaw);

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

// Create a new user with participant data if role is Predictor
export const createUser = catchAsync(async (req, res, next) => {
  const { username, password, role, fullName, phone, region } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = new User({ username, password, role });
    const newUser = await user.save({ session });

    if (role === 'Predictor') {
      if (!fullName || !phone || !region) {
        throw new AppError('Predictors require fullName, phone, and region.', 400);
      }
      await Participant.create([{ userId: newUser._id, fullName, phone, region }], { session });
    }

    await session.commitTransaction();
    
    // جلب المستخدم كاملاً مع المشارك لإرجاعه
    const finalUserRaw = await User.findById(newUser._id).populate('participant');
    const finalUser = sanitizeUser(finalUserRaw);
    finalUser.password = undefined;

    res.status(201).json({
      status: 'success',
      data: {
        user: finalUser,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// Hard delete user
export const deleteUser = catchAsync(async (req, res, next) => {
    // Delete participant first if exists
    await Participant.deleteOne({ userId: req.params.id });
    
    // Delete user permanently
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});
