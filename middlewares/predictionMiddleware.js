import Match from '../models/Match.js';
import Prediction from '../models/Prediction.js'; // تم إضافة هذا السطر لضمان اكتمال الكود
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const checkIfPredictionAllowed = catchAsync(async (req, res, next) => {
    // 1. نحن نهتم فقط بـ matchId القادم من الطلب
    const { matchId } = req.body;

    if (!matchId) {
        return next(new AppError('Match ID is required to make a prediction.', 400));
    }

    // 2. نبحث عن المباراة في قاعدة البيانات
    const match = await Match.findById(matchId);

    if (!match) {
        return next(new AppError('No match found with that ID.', 404));
    }

    // --- 3. الفحص الأمني الحاسم (قلب الحل) ---
    // نقارن وقت المباراة (المحفوظ بالتوقيت العالمي) بالوقت الحالي للخادم (وهو أيضًا بالتوقيت العالمي).
    // ساعة الخادم هي الحكم الموثوق، وليس ساعة جوال المستخدم.
    if (match.matchDateTime <= new Date()) {
        return next(new AppError('Prediction window for this match is closed.', 403));
    }
  
    // 4. إذا كان كل شيء سليمًا، نسمح للطلب بالمرور إلى الخطوة التالية
    next();
});

