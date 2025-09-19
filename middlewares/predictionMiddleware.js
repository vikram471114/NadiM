import Match from '../models/Match.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const checkIfPredictionAllowed = catchAsync(async (req, res, next) => {
  let matchId;

  // تحديد matchId سواء للتوقع الجديد (من body) أو للتحديث (من params)
  if (req.body.matchId) {
    matchId = req.body.matchId;
  } else {
    const prediction = await Prediction.findById(req.params.id);
    if (prediction) matchId = prediction.matchId;
  }

  if (!matchId) {
    return next(new AppError('Match ID is required.', 400));
  }

  const match = await Match.findById(matchId);

  if (!match) {
    return next(new AppError('No match found with that ID.', 404));
  }

  // تحويل الوقت إلى local time
  const matchTimeLocal = new Date(match.matchDateTime).getTime();

  // اغلاق التوقع إذا انتهى الوقت أو الحالة ليست Scheduled
  const now = Date.now();
  if (match.status !== 'Scheduled' || now >= matchTimeLocal) {
    return next(new AppError('Prediction window is closed for this match.', 403));
  }

  // إضافة النجوم في object الـ match لتسهيل الاستخدام في Frontend
  match.stars = '★'.repeat(match.weight || 1);

  // تمرير المباراة للميدل وير/الكونترولر التالي
  req.match = match;
  next();
});
