import Team from '../models/Team.js';
import * as factory from '../utils/handlerFactory.js';
import catchAsync from '../utils/catchAsync.js';

// Middleware to process the uploaded file path before creating/updating
export const processTeamLogo = catchAsync(async (req, res, next) => {
  if (req.file) {
    // The path should be accessible from the frontend, e.g., /uploads/filename.jpg
    req.body.logo = `/uploads/${req.file.filename}`;
  }
  next();
});

// Middleware for nested routes (e.g., GET /leagues/:leagueId/teams)
// This sets a filter to get only teams for a specific league if the leagueId is present
export const setLeagueIdForFilter = (req, res, next) => {
  if (req.params.leagueId) {
    req.filter = { leagueId: req.params.leagueId };
  } else if (req.query.leagueId) {
    req.filter = { leagueId: req.query.leagueId };
  }
  next();
};

// Middleware to automatically set leagueId from URL params when creating a team
export const setLeagueIdOnBody = (req, res, next) => {
  // Allow nested routes
  if (!req.body.leagueId) req.body.leagueId = req.params.leagueId;
  next();
};

// Use the factory functions for all standard CRUD operations
export const getAllTeams = factory.getAll(Team);
export const getTeam = factory.getOne(Team, { path: 'leagueId', select: 'name' });
export const createTeam = factory.createOne(Team);
export const updateTeam = factory.updateOne(Team);
export const deleteTeam = factory.deleteOne(Team);
