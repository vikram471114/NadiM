import mongoose from 'mongoose';
import User from '../models/User.js';
import Participant from '../models/Participant.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import * as factory from '../utils/handlerFactory.js';

// ============================================================
// ✅ الدالة السحرية: تنظيف وتكميل بيانات المستخدم لمنع الانهيار
// ============================================================
const sanitizeUser = (userDoc) => {
  // 1. تحويل مستند المونجو إلى كائن JavaScript عادي قابل للتعديل
  let user = userDoc.toObject ? userDoc.toObject() : userDoc;

  // 2. إذا لم يكن هناك كائن مشارك نهائياً، ننشئ واحداً فارغاً
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000", // ID وهمي
      userId: user._id,
    };
  }

  // 3. (مهم جداً) ملء الحقول الناقصة حتى لو كان المشارك موجوداً
  // نستخدم (||) للتأكد: إذا القيمة موجودة اتركها، وإلا ضع نصاً فارغاً
  const p = user.participant;

  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.phone = p.phone || '';
  p.region = p.region || '';
  
  // حقول إضافية يتوقعها التطبيق عادة وتسبب الكراش
  p.email = p.email || ''; 
  p.image = p.image || ''; 
  p.avatar = p.avatar || ''; 
  p.city = p.city || ''; 
  p.address = p.address || ''; 

  // تحديث الكائن الرئيسي
  user.participant = p;

  return user;
};

// ============================================================
// Controllers
// ============================================================

// 1. Get All Users (للقائمة التي تسبب المشكلة)
export const getAllUsers = catchAsync(async (req, res, next) => {
    // نجلب البيانات الخام
    const rawUsers = await User.find().populate('participant');

    // نمررهم على الفلتر لتنظيفهم جميعاً (الـ 100 مستخدم)
    const users = rawUsers.map(user => sanitizeUser(user));

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            data: users,
        },
    });
});

// 2. Get Single User
export const getUser = catchAsync(async (req, res, next) => {
    let query = User.findById(req.params.id).populate('participant');
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    // تنظيف المستخدم قبل الإرسال
    const safeUser = sanitizeUser(doc);

    res.status(200).json({
      status: 'success',
      data: {
        data: safeUser
      }
    });
});

// 3. Update User
export const updateUser = catchAsync(async (req, res, next) => {
    const filteredBody = {
        username: req.body.username,
        role: req.body.role,
        isActive: req.body.isActive
    };
    
    // حذف الحقول غير المعرفة
    Object.keys(filteredBody).forEach(key => filteredBody[key] === undefined && delete filteredBody[key]);

    const updatedUserRaw = await User.findByIdAndUpdate(req.params.id, filteredBody, {
        new: true,
        runValidators: true,
    }).populate('participant');

    if (!updatedUserRaw) {
        return next(new AppError('No user found with that ID', 404));
    }

    // تنظيف البيانات
    const updatedUser = sanitizeUser(updatedUserRaw);

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

// 4. Create User (مع المعاملة البنكية - Transaction)
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
      // إنشاء المشارك
      await Participant.create([{ userId: newUser._id, fullName, phone, region }], { session });
    }

    await session.commitTransaction();
    
    // جلب المستخدم النهائي وإعداده للإرسال
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

// 5. Delete User
export const deleteUser = catchAsync(async (req, res, next) => {
    // نحذف المشارك أولاً
    await Participant.deleteOne({ userId: req.params.id });
    
    // ثم نحذف المستخدم
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});
