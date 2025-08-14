
// *****************************************************************************************************************************
// RealExperienceFlowEntry
// -----------------------------------------------------------------------------------------------------------------------------
//		ランダムスキル習得を追加するね
// -----------------------------------------------------------------------------------------------------------------------------

RealExperienceMode.SKILL = 4;
RealExperienceFlowEntry._randomSkillArray = null;

RealExperienceFlowEntry._completeMemberData = function(coreAttack) {

	if (!coreAttack.isRealBattle()) {
		return EnterResult.NOTENTER;
	}

	if (!Miscellaneous.isExperienceEnabled(this._unit, this._getExp)) {
		return EnterResult.NOTENTER;
	}

	this._growthArray = ExperienceControl.obtainExperience(this._unit, this._getExp);

	// ★追加：レベルアップした場合は覚えるスキルを計算しておく
	if (this._growthArray != null) {
		this._randomSkillArray = tona_RandomSkillControl.createSkillArray(this._unit);
	}

	if (this.isFlowSkip() || this._coreAttack.isBattleCut()) {

		// スキップ時は、直ちに経験値を与える
		this._doEndAction();
		return EnterResult.NOTENTER;
	}

	this._experienceNumberView.setExperienceNumberData(this._unit, this._getExp);
	this.changeCycleMode(RealExperienceMode.WINDOW);

	return EnterResult.OK;
};

RealExperienceFlowEntry.moveFlowEntry = function() {
	var mode = this.getCycleMode();
	var result = MoveResult.CONTINUE;

	if (mode === RealExperienceMode.WINDOW) {
		result = this._moveWindow();
	}
	else if (mode === RealExperienceMode.SCROLL) {
		result = this._moveScroll();
	}
	else if (mode === RealExperienceMode.ANIME) {
		result = this._moveAnime();
	}
	else if (mode === RealExperienceMode.LEVEL) {
		result = this._moveLevel();
	}
	else if (mode === RealExperienceMode.SKILL) {
		result = this._moveSkill();
	}

	return result;
};

RealExperienceFlowEntry.drawFlowEntry = function() {
	var mode = this.getCycleMode();

	if (mode === RealExperienceMode.WINDOW) {
		this._drawWindow();
	}
	else if (mode === RealExperienceMode.LEVEL) {
		this._drawLevel();
	}
};

RealExperienceFlowEntry._moveLevel = function() {

	if (this._levelupView.moveLevelupViewCycle() !== MoveResult.CONTINUE) {

		if (this._randomSkillArray.length > 0) {

			// ▲複雑になるのでスキル１つしか対応しない

			this._dynamicEvent = createObject(DynamicEvent);
			generator = this._dynamicEvent.acquireEventGenerator();
			generator.skillChange(this._unit, this._randomSkillArray[0], IncreaseType.INCREASE, false);
	       	this._dynamicEvent.executeDynamicEvent();
			this.changeCycleMode(RealExperienceMode.SKILL);
		}
		else {
			this._doEndAction();
			return MoveResult.END;
		}
	}

	return MoveResult.CONTINUE;
};

RealExperienceFlowEntry._moveSkill = function() {

	if (this._dynamicEvent.moveDynamicEvent() !== MoveResult.CONTINUE) {
		this._doEndAction();
		return MoveResult.END;
	}

	return MoveResult.CONTINUE;
};

RealExperienceFlowEntry._doEndAction = function() {

	if (this._growthArray !== null) {
		ExperienceControl.plusGrowth(this._unit, this._growthArray);
		ExperienceControl.obtainData(this._unit);

		// ★追加：実際にスキルを追加する

		// スキップせずに演出を入れた場合は、DynamicEvent でスキルは追加済み
		// 処理が重複するが、同じスキルは重複しないのでセーフ

		tona_RandomSkillControl.obtainSkillArray(this._unit, this._randomSkillArray);
	}
};

// *****************************************************************************************************************************
// EasyExperienceFlowEntry
// -----------------------------------------------------------------------------------------------------------------------------
//		ランダムスキル習得を追加するね
// -----------------------------------------------------------------------------------------------------------------------------

EasyExperienceMode.SKILL = 2;
EasyExperienceFlowEntry._randomSkillArray = null;

EasyExperienceFlowEntry._completeMemberData = function(coreAttack) {
	if (coreAttack.isRealBattle()) {
		return EnterResult.NOTENTER;
	}

	if (!Miscellaneous.isExperienceEnabled(this._unit, this._getExp)) {
		return EnterResult.NOTENTER;
	}

	this._growthArray = ExperienceControl.obtainExperience(this._unit, this._getExp);

	// ★追加：レベルアップした場合は覚えるスキルを計算しておく
	if (this._growthArray != null) {
		this._randomSkillArray = tona_RandomSkillControl.createSkillArray(this._unit);
	}

	if (this.isFlowSkip() || this._coreAttack.isBattleCut()) {
		// スキップ時は、直ちに経験値を与える
		this._doEndAction();
		return EnterResult.NOTENTER;
	}

	this._experienceNumberView.setExperienceNumberData(this._unit, this._getExp);
	this.changeCycleMode(EasyExperienceMode.WINDOW);

	return EnterResult.OK;
};

EasyExperienceFlowEntry.moveFlowEntry = function() {
	var mode = this.getCycleMode();
	var result = MoveResult.CONTINUE;

	if (mode === EasyExperienceMode.WINDOW) {
		result = this._moveWindow();
	}
	else if (mode === EasyExperienceMode.LEVEL) {
		result = this._moveLevel();
	}

	return result;
};

EasyExperienceFlowEntry.drawFlowEntry = function() {
	var mode = this.getCycleMode();

	if (mode === EasyExperienceMode.WINDOW) {
		this._drawWindow();
	}
	else if (mode === EasyExperienceMode.LEVEL) {
		this._drawLevel();
	}
	else if (mode === EasyExperienceMode.SKILL) {
		this._drawSkill();
	}
};

EasyExperienceFlowEntry._moveLevel = function() {

	if (this._levelupView.moveLevelupViewCycle() !== MoveResult.CONTINUE) {

		if (this._randomSkillArray.length > 0) {

			// ▲複雑になるのでスキル１つしか対応しない

			this._dynamicEvent = createObject(DynamicEvent);
			generator = this._dynamicEvent.acquireEventGenerator();
			generator.skillChange(this._unit, this._randomSkillArray[0], false);
	       	this._dynamicEvent.executeDynamicEvent();
			this.changeCycleMode(EasyExperienceMode.SKILL);
		}
		else {
			this._doEndAction();
			return MoveResult.END;
		}
	}

	return MoveResult.CONTINUE;
};

EasyExperienceFlowEntry._moveSkill = function() {

	if (this._dynamicEvent.moveDynamicEvent() !== MoveResult.CONTINUE) {
		this._doEndAction();
		return MoveResult.END;
	}

	return MoveResult.CONTINUE;
};

EasyExperienceFlowEntry._doEndAction = function() {

	if (this._growthArray !== null) {
		ExperienceControl.plusGrowth(this._unit, this._growthArray);
		ExperienceControl.obtainData(this._unit);

		// ★追加：実際にスキルを追加する

		// スキップせずに演出を入れた場合は、DynamicEvent でスキルは追加済み
		// 処理が重複するが、同じスキルは重複しないのでセーフ

		tona_RandomSkillControl.obtainSkillArray(this._randomSkillArray);
	}
};
