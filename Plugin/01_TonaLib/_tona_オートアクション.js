
// *****************************************************************************************************************************
// オートアクション
//		エネミーターンでも PosMenu を表示するための改造をガンガン入れて行くよ
// -----------------------------------------------------------------------------------------------------------------------------

var WeaponAutoActionMode = {
	CURSORSHOW: 0,
   	PREATTACK: 1,
    POSMENUSHOW: 2							// ★追加
};

WeaponAutoAction._posMenu = null;			// ★追加
WeaponAutoAction._posMenuCounter = null;	// ★追加

WeaponAutoAction.moveAutoAction = function() {
	var result = MoveResult.CONTINUE;
	var mode = this.getCycleMode();
	
	if (mode === WeaponAutoActionMode.CURSORSHOW) {
		result = this._moveCursorShow();
	}
	else if (mode === WeaponAutoActionMode.POSMENUSHOW) {		// ★追加
		result = this._movePosMenuShow();
	}
	else if (mode === WeaponAutoActionMode.PREATTACK) {
		result = this._movePreAttack();
	}
	
	return result;
},

WeaponAutoAction.drawAutoAction = function() {
	var mode = this.getCycleMode();

	if (mode === WeaponAutoActionMode.CURSORSHOW) {
		this._drawCurosrShow();
	}
	else if (mode === WeaponAutoActionMode.POSMENUSHOW) {		// ★追加
		result = this._drawPosMenuShow();
	}
	else if (mode === WeaponAutoActionMode.PREATTACK) {
		this._drawPreAttack();
	}
};

WeaponAutoAction._moveCursorShow = function() {

	var isSkipMode = this.isSkipMode();

	if (isSkipMode || this._autoActionCursor.moveAutoActionCursor() !== MoveResult.CONTINUE) {
		if (isSkipMode) {
			this._autoActionCursor.endAutoActionCursor();
		}

		if (this._enterAttack() === EnterResult.NOTENTER) {
			return MoveResult.END;
		}

		// ★改造：PREATTACK に移動してたのを POSMENUSHOW に変更
		this._posMenu = createObject(PosMenu);
		this._posMenu.createPosMenuWindow(this._unit, this._weapon, PosMenuType.Attack);
		this._posMenu.changePosTarget(this._targetUnit);
		this._posMenuCounter = createObject(CycleCounter);
		this._posMenuCounter.setCounterInfo(60);

		this.changeCycleMode(WeaponAutoActionMode.POSMENUSHOW);
	}

	return MoveResult.CONTINUE;
};

WeaponAutoAction._movePosMenuShow = function() {
    var isSkipMode = this.isSkipMode();

    if (isSkipMode || this._posMenuCounter.moveCycleCounter() !== MoveResult.CONTINUE) {

		// ★改造：POSMENUSHOW の後に PREATTACK に移動
		this.changeCycleMode(WeaponAutoActionMode.PREATTACK);
	}

	return MoveResult.CONTINUE;
};

WeaponAutoAction._drawPosMenuShow = function() {
	this._posMenu.drawWindowManager();
};







