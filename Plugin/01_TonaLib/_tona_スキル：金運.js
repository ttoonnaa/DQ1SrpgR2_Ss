
// *****************************************************************************************************************************
// スキル：金運
// -----------------------------------------------------------------------------------------------------------------------------

tona_RichQuickEndFlow = defineObject(BaseFlowEntry, { __dummy: null

	// **************************************************************************************************************************
	// 金運の処理開始
	// --------------------------------------------------------------------------------------------------------------------------

	, enterFlowEntry: function(preAttack) {
		var attackParam = preAttack.getAttackParam(preAttack);

		this._unit = attackParam.unit;
		this._targetUnit = attackParam.targetUnit;
		this._state = 1;

		// ユニットが生きているか
		if (this._unit.getHp() == 0) {
			return EnterResult.NOTENTER;
		}

		// 相手を倒したか
		if (this._targetUnit.getHp() > 0) {
			return EnterResult.NOTENTER;
		}

		// ユニットが金運スキルを持っているか
		var skill = SkillControl.getPossessionCustomSkill(this._unit, tona_SkillKeyword['スキル：金運']);
		if (skill === null) {
			return false;
		}

		// 金運が発動するか
		if (!Probability.getInvocationProbabilityFromSkill(this._unit, skill)) {
			return false;
		}

		return EnterResult.OK;
	}

	// **************************************************************************************************************************
	// 金運の動作
	// --------------------------------------------------------------------------------------------------------------------------

	, moveFlowEntry: function() {

		if (this._state == 1) {

	        // イベントを作成
			this._dynamicEvent = createObject(DynamicEvent);
			generator = this._dynamicEvent.acquireEventGenerator();
			generator.goldChange(tona_Setting.richQuickValue, IncreaseType.INCREASE, false);
	       	this._dynamicEvent.executeDynamicEvent();
			this._state = 2;

			return MoveResult.CONTINUE;
        }
		else if (this._state == 2) {

			if (this._dynamicEvent.moveDynamicEvent() !== MoveResult.CONTINUE) {
				return MoveResult.END;
			}

			return MoveResult.CONTINUE;
		}
	}

	// **************************************************************************************************************************
	// 金運の描画
	// --------------------------------------------------------------------------------------------------------------------------

	, drawFlowEntry: function() {
	}
});

