import mongoose from 'mongoose';
import User from '../models/User.js';
import Participant from '../models/Participant.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import * as factory from '../utils/handlerFactory.js';

// Get all users and populate participant data
export const getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find().populate('participant');

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            data: users,
        },
    });
});

// Get a single user
export const getUser = factory.getOne(User, { path: 'participant' });

// Update user
export const updateUser = catchAsync(async (req, res, next) => {
    const filteredBody = {
        username: req.body.username,
        role: req.body.role,
        isActive: req.body.isActive
    };
    
    Object.keys(filteredBody).forEach(key => filteredBody[key] === undefined && delete filteredBody[key]);

    const updatedUser = await User.findByIdAndUpdate(req.params.id, filteredBody, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

// Create a new user with participant data if role is Predictor
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
    newUser.password = undefined;
    res.status(201).json({
      status: 'success',
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// Hard delete user
export const deleteUser = catchAsync(async (req, res, next) => {
    // Delete participant first if exists
    await Participant.deleteOne({ userId: req.params.id });
    
    // Delete user permanently
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});
