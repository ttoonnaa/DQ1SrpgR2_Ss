
// *****************************************************************************************************************************
// AI コントローラー
// -----------------------------------------------------------------------------------------------------------------------------

var tona_AiControl = {

	getCombination: function(unit) {
		var combination = null;
		var patternType = unit.getAIPattern().getPatternType();

		if (patternType === PatternType.APPROACH) {
			combination = CombinationManager.getApproachCombination(unit, true);
		}
		else if (patternType === PatternType.WAIT) {
			combination = CombinationManager.getWaitCombination(unit, true);
		}

		return combination;
	}
};



