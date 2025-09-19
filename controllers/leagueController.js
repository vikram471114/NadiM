import League from '../models/League.js';
import * as factory from '../utils/handlerFactory.js';
import catchAsync from '../utils/catchAsync.js';

// Middleware to process the uploaded file path before creating/updating
export const processLeagueLogo = catchAsync(async (req, res, next) => {
  if (req.file) {
    req.body.logo = `/uploads/${req.file.filename}`;
  }
  next();
});

// Use the factory functions for all standard CRUD operations
export const getAllLeagues = factory.getAll(League);

// For getLeague, we also want to see all the teams in that league
export const getLeague = factory.getOne(League, { path: 'teams' });

export const createLeague = factory.createOne(League);

export const updateLeague = factory.updateOne(League);

// Hard delete: remove league completely
export const deleteLeague = factory.deleteOne(League);
