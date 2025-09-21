import Prediction from '../models/Prediction.js';
import Match from '../models/Match.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import mongoose from 'mongoose';

// --- Existing Functions (No changes needed here) ---
export const createOrUpdatePrediction = catchAsync(async (req, res, next) => {
    const { matchId, predictedScoreA, predictedScoreB } = req.body;
    const prediction = await Prediction.findOneAndUpdate(
        { matchId: matchId, userId: req.user.id },
        { predictedScoreA, predictedScoreB },
        { new: true, runValidators: true, upsert: true }
    );
    res.status(200).json({ status: 'success', data: { data: prediction } });
});

export const getMatchPredictions = catchAsync(async (req, res, next) => {
    const predictions = await Prediction.find({ matchId: req.params.matchId })
        .populate({ path: 'userId', select: 'username', populate: { path: 'participant', select: 'fullName' } });
    res.status(200).json({ status: 'success', results: predictions.length, data: { data: predictions } });
});

export const getMyPredictions = catchAsync(async (req, res, next) => {
    const predictions = await Prediction.find({ userId: req.user.id })
        .populate({
            path: 'matchId',
            select: 'teamA teamB matchDateTime scoreA scoreB status leagueId weight',
            populate: [
                { path: 'teamA', select: 'name' },
                { path: 'teamB', select: 'name' },
                { path: 'leagueId', select: 'name' }
            ],
        })
        .sort({ 'matchId.matchDateTime': -1 });
    res.status(200).json({ status: 'success', results: predictions.length, data: { data: predictions } });
});

export const getLeaderboard = catchAsync(async (req, res, next) => {
    const { leagueId, matchId } = req.query;
    const matchFilter = {};
    if (matchId) {
        matchFilter.matchId = new mongoose.Types.ObjectId(matchId);
    } else if (leagueId) {
        const matchesInLeague = await Match.find({ leagueId: new mongoose.Types.ObjectId(leagueId) }).select('_id');
        const matchIds = matchesInLeague.map(m => m._id);
        matchFilter.matchId = { $in: matchIds };
    }
    const leaderboard = await Prediction.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$userId', totalPoints: { $sum: '$pointsAwarded' } } },
        { $sort: { totalPoints: -1 } },
        //{ $limit: 100 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $lookup: { from: 'participants', localField: '_id', foreignField: 'userId', as: 'participant' } },
        { $unwind: { path: '$participant', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, userId: '$_id', username: '$user.username', fullName: '$participant.fullName', totalPoints: 1 } },
    ]);
    res.status(200).json({ status: 'success', results: leaderboard.length, data: { data: leaderboard } });
});

// --- NEW Function for Detailed Participant Reports ---
export const getUserPredictionDetails = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    if (!userId) {
        return next(new AppError('User ID is required.', 400));
    }

    const predictions = await Prediction.find({ userId: userId })
        .populate({
            path: 'matchId',
            select: 'teamA teamB matchDateTime scoreA scoreB status leagueId',
            populate: [
                { path: 'teamA', select: 'name' },
                { path: 'teamB', select: 'name' },
                { path: 'leagueId', select: 'name' }
            ]
        })
        .sort({ 'matchId.matchDateTime': -1 });

    res.status(200).json({
        status: 'success',
        results: predictions.length,
        data: { data: predictions }
    });
});

