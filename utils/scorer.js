import Match from '../models/Match.js';
import Prediction from '../models/Prediction.js';

export const calculateMatchPoints = async (matchId) => {
  try {
    // 1. Get the official match result and its weight
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'Finished' || match.scoreA === null || match.scoreB === null) {
      console.log(`Scoring skipped: Match ${matchId} is not finished or has no score.`);
      return;
    }

    // 2. Get all predictions for this match
    const predictions = await Prediction.find({ matchId });
    if (predictions.length === 0) {
      console.log(`Scoring skipped: No predictions found for match ${matchId}.`);
      return;
    }

    // --- الخطوة الجديدة التي تم إضافتها ---
    // إعادة تعيين (تصفير) كل النقاط السابقة لهذه المباراة قبل البدء في إعادة الحساب.
    // هذا السطر حاسم لضمان أن تعديل النتيجة يعمل بشكل صحيح.
    await Prediction.updateMany({ matchId: matchId }, { $set: { pointsAwarded: 0 } });
    console.log(`Points reset for match ${matchId}. Starting recalculation...`);

    // 3. Find all correct predictions
    const correctPredictions = predictions.filter(
      p => p.predictedScoreA === match.scoreA && p.predictedScoreB === match.scoreB
    );

    if (correctPredictions.length === 0) {
      console.log(`Scoring finished: No correct predictions for match ${matchId}.`);
      return;
    }

    // 4. Determine if there is an exclusive winner
    const isExclusiveWinner = correctPredictions.length === 1;

    // 5. Define points based on match weight and exclusivity
    const pointsMap = {
      // weight: [normal_points, exclusive_points]
      1: [1, 2], // 1 Star
      2: [3, 4], // 2 Stars
      3: [6, 7], // 3 Stars
    };
    
    const points = isExclusiveWinner 
      ? pointsMap[match.weight][1] 
      : pointsMap[match.weight][0];

    // 6. Update all correct predictions with the calculated points
    const updatePromises = correctPredictions.map(prediction => 
      Prediction.findByIdAndUpdate(prediction._id, { pointsAwarded: points })
    );

    await Promise.all(updatePromises);

    console.log(`✅ Scoring complete for match ${matchId}. Awarded ${points} points to ${correctPredictions.length} users.`);

  } catch (error) {
    console.error(`❌ Error during scoring for match ${matchId}:`, error);
  }
};
