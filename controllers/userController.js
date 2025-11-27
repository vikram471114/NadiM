import mongoose from 'mongoose';
import User from '../models/User.js';
import Participant from '../models/Participant.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import * as factory from '../utils/handlerFactory.js';

// ============================================================
// ✅ دالة التنظيف (User Helper)
// تعالج الـ 100 مستخدم وتضيف التواريخ والحقول الناقصة
// ============================================================
const sanitizeUser = (userDoc) => {
  // تحويل مستند المونجو إلى كائن JS عادي
  let user = userDoc.toObject ? userDoc.toObject() : userDoc;

  // 1. إنشاء مشارك وهمي إذا لم يوجد
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0
    };
  }

  // 2. تعبئة الحقول الناقصة بقيم فارغة (وليست null)
  const p = user.participant;

  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.phone = p.phone || '';
  p.region = p.region || '';
  
  // حقول إضافية تسبب الكراش
  p.email = p.email || ''; 
  p.image = p.image || ''; 
  p.avatar = p.avatar || ''; 
  p.city = p.city || ''; 
  p.address = p.address || ''; 

  // 3. (الحل النهائي) ضمان وجود التواريخ
  p.createdAt = p.createdAt || new Date().toISOString();
  p.updatedAt = p.updatedAt || new Date().toISOString();

  user.participant = p;
  return user;
};

// ------------------------------------------------------------
// GET ALL USERS
// ------------------------------------------------------------
export const getAllUsers = catchAsync(async (req, res, next) => {
    // جلب البيانات الخام
    const rawUsers = await User.find().populate('participant');

    // تمرير جميع المستخدمين على فلتر التنظيف
    const users = rawUsers.map(user => sanitizeUser(user));

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            data: users,
        },
    });
});

// ------------------------------------------------------------
// GET SINGLE USER
// ------------------------------------------------------------
export const getUser = catchAsync(async (req, res, next) => {
    let query = User.findById(req.params.id).populate('participant');
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    const safeUser = sanitizeUser(doc);

    res.status(200).json({
      status: 'success',
      data: {
        data: safeUser
      }
    });
});

// ------------------------------------------------------------
// UPDATE USER
// ------------------------------------------------------------
export const updateUser = catchAsync(async (req, res, next) => {
    const filteredBody = {
        username: req.body.username,
        role: req.body.role,
        isActive: req.body.isActive
    };
    
    Object.keys(filteredBody).forEach(key => filteredBody[key] === undefined && delete filteredBody[key]);

    const updatedUserRaw = await User.findByIdAndUpdate(req.params.id, filteredBody, {
        new: true,
        runValidators: true,
    }).populate('participant');

    if (!updatedUserRaw) {
        return next(new AppError('No user found with that ID', 404));
    }

    const updatedUser = sanitizeUser(updatedUserRaw);

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

// ------------------------------------------------------------
// CREATE USER
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// DELETE USER
// ------------------------------------------------------------
export const deleteUser = catchAsync(async (req, res, next) => {
    // حذف المشارك أولاً
    await Participant.deleteOne({ userId: req.params.id });
    
    // ثم حذف المستخدم
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});
