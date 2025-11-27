import mongoose from 'mongoose';
import User from '../models/User.js';
import Participant from '../models/Participant.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import * as factory from '../utils/handlerFactory.js';

// ============================================================
// ✅ دالة التنظيف الشاملة (The Ultimate Sanitizer)
// تغطي جميع الحقول المحتملة لمنع انهيار تطبيقات فلاتر
// ============================================================
const sanitizeUser = (userDoc) => {
  // 1. تحويل المستند لكائن قابل للتعديل
  let user = userDoc.toObject ? userDoc.toObject() : userDoc;

  // 2. إنشاء كائن مشارك إذا كان مفقوداً
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      __v: 0
    };
  }

  const p = user.participant;
  const now = new Date().toISOString();
  p.id = p._id.toString();

  // ---------------------------------------------------
  // حقن البيانات (تغطية كل الاحتمالات)
  // ---------------------------------------------------

  // 1. النصوص والأسماء
  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.username = p.username || user.username || 'user'; // أحياناً يطلبونها هنا
  p.firstName = p.firstName || 'غير محدد';
  p.lastName = p.lastName || 'غير محدد';
  p.bio = p.bio || '';

  // 2. الاتصال
  p.phone = p.phone || '';
  p.mobile = p.mobile || ''; // مسمى آخر شائع
  p.phoneNumber = p.phoneNumber || ''; // مسمى آخر شائع
  p.email = p.email || ''; 

  // 3. الموقع والعناوين
  p.region = p.region || '';
  p.city = p.city || '';
  p.address = p.address || '';
  p.location = p.location || '';
  p.country = p.country || '';
  
  // 4. الصور والوسائط (أخطر المسببات)
  p.image = p.image || '';
  p.imageUrl = p.image || '';
  p.photo = p.image || '';
  p.photoUrl = p.image || '';
  p.avatar = p.avatar || '';

  // 5. الأرقام والمنطق
  p.gender = p.gender || 'male'; // مهم جداً
  p.sex = p.gender || 'male';
  p.age = p.age || 20;
  p.balance = p.balance || 0;
  p.points = p.points || 0;
  p.isVerified = (p.isVerified !== undefined) ? p.isVerified : true;
  p.isActive = (p.isActive !== undefined) ? p.isActive : true;
  p.status = p.status || 'active';
  
  // 6. التواريخ
  p.createdAt = p.createdAt || now;
  p.updatedAt = p.updatedAt || now;
  p.birthDate = p.birthDate || now;
  p.dob = p.birthDate || now; // Date of Birth

  // حفظ التعديلات في كائن المستخدم
  user.participant = p;

  // ✅ حركة إضافية للأمان: نسخ الإيميل للجذر
  if (!user.email) user.email = p.email || '';

  return user;
};

// ============================================================
// Controllers
// ============================================================

export const getAllUsers = catchAsync(async (req, res, next) => {
    const rawUsers = await User.find().populate('participant');
    
    // تنظيف القائمة بالكامل
    const users = rawUsers.map(user => sanitizeUser(user));

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            data: users,
        },
    });
});

export const getUser = catchAsync(async (req, res, next) => {
    let query = User.findById(req.params.id).populate('participant');
    const doc = await query;
    if (!doc) return next(new AppError('No document found with that ID', 404));

    const safeUser = sanitizeUser(doc);

    res.status(200).json({
      status: 'success',
      data: {
        data: safeUser
      }
    });
});

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

    if (!updatedUserRaw) return next(new AppError('No user found with that ID', 404));

    const updatedUser = sanitizeUser(updatedUserRaw);

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

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

    res.status(201).json({ status: 'success', data: { user: finalUser } });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

export const deleteUser = catchAsync(async (req, res, next) => {
    await Participant.deleteOne({ userId: req.params.id });
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return next(new AppError('No user found with that ID', 404));
    res.status(204).json({ status: 'success', data: null });
});
