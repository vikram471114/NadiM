import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// ============================================================
// ✅ دالة التنظيف والإنقاذ (Auth Sanitizer)
// هذه الدالة تضمن وجود كل الحقول الممكنة لمنع الـ Crash
// ============================================================
const prepareSafeParticipant = (user) => {
  // 1. إذا لم يكن هناك مشارك، ننشئ واحداً وهمياً
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      __v: 0
    };
  }
  
  const p = user.participant;
  const now = new Date().toISOString();

  // ---------------------------------------------------
  // حقن البيانات الشامل (تغطية كل الثغرات)
  // ---------------------------------------------------

  // 1. النصوص والأسماء
  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.username = p.username || user.username || 'user';
  p.firstName = p.firstName || 'غير محدد';
  p.lastName = p.lastName || 'غير محدد';
  p.bio = p.bio || '';
  p.about = p.about || '';
  p.description = p.description || '';

  // 2. الاتصال
  p.phone = p.phone || '';
  p.mobile = p.mobile || '';       // مسمى شائع
  p.phoneNumber = p.phoneNumber || ''; // مسمى شائع
  p.email = p.email || ''; 

  // 3. الموقع والعناوين
  p.region = p.region || '';
  p.city = p.city || '';
  p.address = p.address || '';
  p.location = p.location || '';
  p.street = p.street || '';
  p.country = p.country || '';
  
  // 4. الصور والوسائط (أخطر المسببات)
  p.image = p.image || '';
  p.imageUrl = p.image || '';
  p.photo = p.image || '';
  p.photoUrl = p.image || '';
  p.avatar = p.avatar || '';
  p.cover = p.cover || '';

  // 5. الأرقام، الجنس، والمنطق
  p.gender = p.gender || 'male';    // 👈 مهم جداً
  p.sex = p.gender || 'male';       // اسم بديل
  p.age = p.age || 20;
  p.birthDate = p.birthDate || now; // 👈 مهم جداً
  p.dob = p.birthDate || now;
  p.balance = p.balance || 0;
  p.points = p.points || 0;
  p.isVerified = (p.isVerified !== undefined) ? p.isVerified : true;
  p.isActive = (p.isActive !== undefined) ? p.isActive : true;
  p.status = p.status || 'active';
  
  // 6. التواريخ (أساسية)
  p.createdAt = p.createdAt || now;
  p.updatedAt = p.updatedAt || now;

  // حفظ التعديلات
  user.participant = p;

  // ✅ نسخ الإيميل للجذر (User Object) للأمان
  if (!user.email) {
    user.email = p.email || '';
  }

  return user;
};

// ============================================================
// LOGIN
// ============================================================
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // إخفاء كلمة المرور
  user.password = undefined;
  
  // ✅ تطبيق التنظيف الشامل قبل الإرسال
  prepareSafeParticipant(user);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1) التحقق من وجود البيانات
  if (!username || !password) {
    return next(new AppError('يرجى تقديم اسم المستخدم وكلمة المرور', 400));
  }

  // 2) البحث عن المستخدم وجلب المشارك
  const user = await User.findOne({ username: username.toLowerCase() })
    .select('+password')
    .populate('participant');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401));
  }

  // 3) إرسال التوكن والبيانات
  createAndSendToken(user, 200, res);
});

// ============================================================
// LOGOUT
// ============================================================
export const logout = (req, res) => {
  res.status(200).json({ status: 'success', message: 'تم تسجيل الخروج بنجاح' });
};

// ============================================================
// GET ME (استعادة الجلسة)
// ============================================================
export const getMe = catchAsync(async (req, res, next) => {
  // المستخدم قادم من الـ Middleware
  const currentUser = await User.findById(req.user.id).populate('participant');

  if (!currentUser) {
    return next(new AppError('المستخدم غير موجود.', 404));
  }

  // ✅ تنظيف البيانات هنا أيضاً (مهم جداً عند إعادة فتح التطبيق)
  prepareSafeParticipant(currentUser);
   
  res.status(200).json({
    status: 'success',
    data: {
      user: currentUser,
    },
  });
});
