import Match from '../models/Match.js';
import Prediction from '../models/Prediction.js';
import * as factory from '../utils/handlerFactory.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { calculateMatchPoints } from '../utils/scorer.js';

// --- Helper function to convert local time string to UTC Date ---
const convertToUTC = (localDateTimeString) => {
    if (!localDateTimeString) return null;
    // Create a date object. JS assumes the string is local to the server (UTC).
    const date = new Date(localDateTimeString);
    // We know the admin entered it in UTC+3, so we subtract 3 hours to get the correct UTC time.
    return new Date(date.getTime() - (3 * 60 * 60 * 1000));
};

// Custom createMatch function to handle timezone conversion
export const createMatch = catchAsync(async (req, res, next) => {
    const body = { ...req.body };
    body.matchDateTime = convertToUTC(body.matchDateTime);
    const doc = await Match.create(body);
    res.status(201).json({ status: 'success', data: { data: doc } });
});

// Custom updateMatch function to handle timezone conversion
export const updateMatch = catchAsync(async (req, res, next) => {
    const body = { ...req.body };
    if (body.matchDateTime) {
        body.matchDateTime = convertToUTC(body.matchDateTime);
    }
    const doc = await Match.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true,
    });
    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { data: doc } });
});

export const deleteMatch = factory.deleteOne(Match); // This is the original SOFT delete

export const deleteManyMatches = catchAsync(async (req, res, next) => {
  const { ids } = req.body; 

  if (!ids || ids.length === 0) {
    return next(new AppError('Please provide match IDs to delete.', 400));
  }

  await Prediction.deleteMany({ matchId: { $in: ids } });
  await Match.deleteMany({ _id: { $in: ids } });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

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

export const getAllMatches = catchAsync(async (req, res, next) => {
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

export const getOpenMatches = catchAsync(async (req, res, next) => {
  const matches = await Match.find({ 
      status: 'Scheduled',
      matchDateTime: { $gt: new Date() },
      isActive: { $ne: false } 
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

export const enterResult = catchAsync(async (req, res, next) => {
  const { scoreA, scoreB } = req.body;

  if (scoreA === undefined || scoreB === undefined) {
    return next(new AppError('Please provide scoreA and scoreB.', 400));
  }

  const match = await Match.findById(req.params.id);
  
  if (!match) {
    return next(new AppError('No match found with that ID', 404));
  }



  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.status = 'Finished';
  const updatedMatch = await match.save();

  calculateMatchPoints(updatedMatch._id);

  res.status(200).json({
    status: 'success',
    data: {
      data: updatedMatch,
    },
  });
});

