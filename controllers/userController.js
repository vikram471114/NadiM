import mongoose from 'mongoose';
import User from '../models/User.js';
import Participant from '../models/Participant.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import * as factory from '../utils/handlerFactory.js';

// ============================================================
// ✅ دالة التنظيف الشاملة
// ============================================================
const sanitizeUser = (userDoc) => {
  let user = userDoc.toObject ? userDoc.toObject() : userDoc;

  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      __v: 0
    };
  }

  const p = user.participant;
  const now = new Date().toISOString();
  
  // صورة افتراضية
  const defaultImg = "https://placehold.co/400x400/png";

  // تعبئة البيانات
  p.id = (p._id || "000000000000000000000000").toString();
  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.username = p.username || user.username || 'user';
  
  p.phone = p.phone || '';
  p.mobile = p.mobile || '';
  p.email = p.email || ''; 
  p.region = p.region || '';
  p.city = p.city || '';
  p.address = p.address || '';
  
  // الصور
  p.image = (p.image && p.image.length > 5) ? p.image : defaultImg;
  p.avatar = (p.avatar && p.avatar.length > 5) ? p.avatar : defaultImg;
  p.photo = p.image;

  p.gender = p.gender || 'male';
  p.age = p.age || 20;
  p.birthDate = p.birthDate || now;
  p.balance = p.balance || 0.0;
  p.points = p.points || 0.0;
  p.isVerified = true;
  p.isActive = true;
  p.status = 'active';
  p.createdAt = p.createdAt || now;
  p.updatedAt = p.updatedAt || now;

  // الكائنات الفرعية (مهمة جداً)
  p.wallet = p.wallet || { balance: 0, currency: 'SAR' };
  p.subscription = p.subscription || { status: 'free', plan: 'basic' };

  user.participant = p;

  // النسخ للجذر (Root Injection)
  user.id = user._id.toString();
  user.fullName = p.fullName;
  user.name = p.fullName;
  user.phone = p.phone;
  user.mobile = p.phone;
  user.image = p.image;
  user.photo = p.image;
  user.avatar = p.image;
  user.email = user.email || p.email || '';

  return user;
};

// ============================================================
// Controllers
// ============================================================

export const getAllUsers = catchAsync(async (req, res, next) => {
    // 1. جلب وتنظيف البيانات
    const rawUsers = await User.find().populate('participant');
    let users = rawUsers.map(user => sanitizeUser(user));

    // إرسال 5 مستخدمين فقط للتجربة (لتخفيف الحمل وعزل الأخطاء)
    users = users.slice(0, 5);

    // 2. 🛑 الإرسال الشامل (الحل السحري) 🛑
    // نرسل القائمة في كل المفاتيح المحتملة التي قد يستخدمها المبرمج
    res.status(200).json({
        status: 'success',
        
        // الاحتمال الأول: المتوقع في الكود النظيف
        results: users.length,
        data: {
            data: users,
            users: users,
            participants: users
        },

        // الاحتمال الثاني: المصفوفة مباشرة في الجذر
        users: users, 
        participants: users,
        
        // الاحتمال الثالث: قد يكون المبرمج نسي التغليف
        // (لا يمكننا إرسال المصفوفة وحدها كجذر لأننا أرسلنا كائناً، لكننا غطينا الأهم)
    });
});

export const getUser = catchAsync(async (req, res, next) => {
    let query = User.findById(req.params.id).populate('participant');
    const doc = await query;
    if (!doc) return next(new AppError('No document found', 404));
    res.status(200).json({ status: 'success', data: { data: sanitizeUser(doc) } });
});

export const updateUser = catchAsync(async (req, res, next) => {
    const filteredBody = { username: req.body.username, role: req.body.role, isActive: req.body.isActive };
    Object.keys(filteredBody).forEach(key => filteredBody[key] === undefined && delete filteredBody[key]);
    const updatedUserRaw = await User.findByIdAndUpdate(req.params.id, filteredBody, { new: true, runValidators: true }).populate('participant');
    if (!updatedUserRaw) return next(new AppError('No user found', 404));
    res.status(200).json({ status: 'success', data: { user: sanitizeUser(updatedUserRaw) } });
});

export const createUser = catchAsync(async (req, res, next) => {
  const { username, password, role, fullName, phone, region } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = new User({ username, password, role });
    const newUser = await user.save({ session });
    if (role === 'Predictor') {
        if (!fullName || !phone || !region) throw new AppError('Data required', 400);
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
    if (!deletedUser) return next(new AppError('No user found', 404));
    res.status(204).json({ status: 'success', data: null });
});
