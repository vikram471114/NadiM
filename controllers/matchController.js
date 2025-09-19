import Match from '../models/Match.js';
import Prediction from '../models/Prediction.js'; // <<<--- 1. أضفنا استيراد موديل التوقعات
import * as factory from '../utils/handlerFactory.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { calculateMatchPoints } from '../utils/scorer.js';

// Factory handlers for basic operations
export const createMatch = factory.createOne(Match);
export const updateMatch = factory.updateOne(Match);
export const deleteMatch = factory.deleteOne(Match); // This is the original SOFT delete

// <<<--- 2. أضفنا هذه الدالة الجديدة للحذف النهائي والمتتالي ---
export const deleteManyMatches = catchAsync(async (req, res, next) => {
  const { ids } = req.body; // استلام قائمة المعرفات من الطلب

  if (!ids || ids.length === 0) {
    return next(new AppError('Please provide match IDs to delete.', 400));
  }

  // الخطوة 1: حذف كل التوقعات والنقاط المرتبطة بهذه المباريات
  await Prediction.deleteMany({ matchId: { $in: ids } });

  // الخطوة 2: حذف المباريات نفسها بشكل نهائي
  await Match.deleteMany({ _id: { $in: ids } });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
// -----------------------------------------------------------


// Custom handler to get a single match and populate all related data
export const getMatch = catchAsync(async (req, res, next) => {
  const match = await Match.findById(req.params.id)
    .populate({ path: 'leagueId', select: 'name logo' })
    .populate({ path: 'teamA', select: 'name logo' })
    .populate({ path: 'teamB', select: 'name logo' });

  if (!match) {
    return next(new AppError('No match found with that ID', 404));
  }
  res.status(200).json({ status: 'success', data: { data: match } });
});


// Custom handler to get all matches with populated data
export const getAllMatches = catchAsync(async (req, res, next) => {
  // We apply the soft-delete filter here as well
  const matches = await Match.find({ isActive: { $ne: false } })
    .populate({ path: 'leagueId', select: 'name logo' })
    .populate({ path: 'teamA', select: 'name logo' })
    .populate({ path: 'teamB', select: 'name logo' })
    .sort({ matchDateTime: -1 });

  res.status(200).json({
    status: 'success',
    results: matches.length,
    data: { data: matches },
  });
});


// Custom handler for getting matches that are open for prediction
export const getOpenMatches = catchAsync(async (req, res, next) => {
  const matches = await Match.find({ 
      status: 'Scheduled',
      matchDateTime: { $gt: new Date() },
      isActive: { $ne: false } // Also respect soft-delete
    })
    .populate({ path: 'leagueId', select: 'name logo' })
    .populate({ path: 'teamA', select: 'name logo' })
    .populate({ path: 'teamB', select: 'name logo' })
    .sort({ matchDateTime: 1 });

  res.status(200).json({
    status: 'success',
    results: matches.length,
    data: { data: matches },
  });
});

// Custom handler for entering a match result and triggering the scoring engine
export const enterResult = catchAsync(async (req, res, next) => {
  const { scoreA, scoreB } = req.body;

  if (scoreA === undefined || scoreB === undefined) {
    return next(new AppError('Please provide scoreA and scoreB.', 400));
  }

  const match = await Match.findById(req.params.id);
  
  if (!match) {
    return next(new AppError('No match found with that ID', 404));
  }

  if (match.status === 'Finished') {
    return next(new AppError('Result for this match has already been entered.', 400));
  }

  // Update the match with the result
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.status = 'Finished';
  const updatedMatch = await match.save();

  // IMPORTANT: Trigger the scoring process
  calculateMatchPoints(updatedMatch._id);

  res.status(200).json({
    status: 'success',
    data: {
      data: updatedMatch,
    },
  });
});