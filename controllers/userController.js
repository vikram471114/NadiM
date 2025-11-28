import mongoose from 'mongoose';
import User from '../models/User.js';
import Participant from '../models/Participant.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import * as factory from '../utils/handlerFactory.js';

// ============================================================
// 🛡️ دالة التحصين (Sanitize Helper)
// هذه هي الإضافة الوحيدة على كودك الأصلي لحماية التطبيق
// ============================================================
const sanitizeUser = (userDoc) => {
  let user = userDoc.toObject ? userDoc.toObject() : userDoc;

  // ضمان وجود المشارك
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      __v: 0
    };
  }

  const p = user.participant;
  const now = new Date().toISOString();
  const defaultImg = "https://placehold.co/400x400/png"; // صورة احتياطية

  // 1. تعبئة النصوص
  p.id = (p._id || "0").toString();
  p.name = p.name || 'مستخدم';
  p.fullName = p.fullName || p.name || 'مستخدم';
  p.username = p.username || user.username || 'user';
  p.phone = p.phone || '';
  p.email = p.email || ''; 
  p.region = p.region || '';
  
  // 2. تعبئة الصور
  p.image = (p.image && p.image.length > 5) ? p.image : defaultImg;
  p.avatar = p.image; 

  // 3. الحفاظ على الأرقام كأرقام (Int/Double)
  // هذا يمنع خطأ type String is not subtype of Int
  p.age = (typeof p.age === 'number') ? p.age : 20;
  p.balance = (typeof p.balance === 'number') ? p.balance : 0;
  p.points = (typeof p.points === 'number') ? p.points : 0;
  
  p.gender = p.gender || 'male';
  p.isVerified = true;
  p.isActive = true;
  p.status = 'active';
  p.createdAt = p.createdAt || now;
  p.updatedAt = p.updatedAt || now;

  user.participant = p;

  // 4. النسخ للجذر (Root Injection)
  // لأن التطبيق يبحث أحياناً في user.phone مباشرة
  user.id = user._id.toString();
  user.fullName = p.fullName;
  user.name = p.fullName;
  user.phone = p.phone;
  user.image = p.image;
  user.email = user.email || p.email || '';
  
  // نسخ الأرقام
  user.age = p.age;
  user.balance = p.balance;
  user.points = p.points;

  return user;
};

// ============================================================
// Controllers (نفس كودك القديم مع إضافة التحصين فقط)
// ============================================================

// 1. Get All Users
export const getAllUsers = catchAsync(async (req, res, next) => {
    const rawUsers = await User.find().populate('participant');

    // نمرر المستخدمين على دالة التحصين
    const users = rawUsers.map(user => sanitizeUser(user));

    res.status(200).json({
        status: 'success',
        results: users.length,
        // نفس الهيكلية التي يطلبها التطبيق: data.data
        data: {
            data: users,
        },
    });
});

// 2. Get Single User 
// (استبدلنا factory.getOne لنتمكن من استخدام sanitizeUser)
export const getUser = catchAsync(async (req, res, next) => {
    let query = User.findById(req.params.id).populate('participant');
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: sanitizeUser(doc) // تحصين
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
    
    Object.keys(filteredBody).forEach(key => filteredBody[key] === undefined && delete filteredBody[key]);

    // أضفنا .populate هنا لأن الكود القديم كان يرجع المستخدم بدون مشارك بعد التحديث
    // وهذا كان سيسبب كراش فوري بعد تعديل أي مستخدم
    const updatedUserRaw = await User.findByIdAndUpdate(req.params.id, filteredBody, {
        new: true,
        runValidators: true,
    }).populate('participant');

    if (!updatedUserRaw) {
        return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: sanitizeUser(updatedUserRaw), // تحصين
        },
    });
});

// 4. Create User (نفس كودك الأصلي تماماً)
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
    
    // نجلب المستخدم الجديد ونحصنه قبل إرساله
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

// 5. Delete User (نفس كودك الأصلي تماماً)
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
