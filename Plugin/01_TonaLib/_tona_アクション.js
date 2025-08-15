
// *****************************************************************************************************************************
// カスタムアクション：キーワード
// -----------------------------------------------------------------------------------------------------------------------------

var tona_ActionKeyword = {
	__dummy: null

	, 'アクション：盗賊': 'tona_アクション：盗賊'
};

// *****************************************************************************************************************************
// エネミーターン：オートアクションを作成
// -----------------------------------------------------------------------------------------------------------------------------

EnemyTurn._createAutoAction = function() {
	var keyword;
	var patternType = this._orderUnit.getAIPattern().getPatternType();

	this._autoActionArray = [];

    // ★追加：グループが非アクティブなら行動しない
    if (this._orderUnit.custom.tona_unitGroupId > 0) {
    	if (this._orderUnit.custom.tona_isGroupActive == 0) {
			AutoActionBuilder._buildEmptyAction();
			return true;
        }
    }

	if (patternType === PatternType.APPROACH) {
		AutoActionBuilder.buildApproachAction(this._orderUnit, this._autoActionArray);
	}
	else if (patternType === PatternType.WAIT) {
		AutoActionBuilder.buildWaitAction(this._orderUnit, this._autoActionArray);
	}
	else if (patternType === PatternType.MOVE) {
		AutoActionBuilder.buildMoveAction(this._orderUnit, this._autoActionArray);
	}
	else if (patternType === PatternType.CUSTOM) {
		keyword = this._orderUnit.getAIPattern().getCustomKeyword();
		AutoActionBuilder.buildCustomAction(this._orderUnit, this._autoActionArray, keyword);
	}

	return true;
};

// *****************************************************************************************************************************
// AutoActionBuilder
// -----------------------------------------------------------------------------------------------------------------------------

AutoActionBuilder.buildCustomAction = function(unit, autoActionArray, keyword) {

	if (keyword == tona_ActionKeyword['アクション：盗賊']) {
		return this.tona_buildThiefAction(unit, autoActionArray);
	}
	else {
		return false;
	}
};

// *****************************************************************************************************************************
// WeaponAutoAction
// -----------------------------------------------------------------------------------------------------------------------------
//		エネミーターンでも PosMenu を表示するための処理を追加
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

// ****************************************************************************************************
// アイテムの有効判定
// ----------------------------------------------------------------------------------------------------

CombinationCollector.Item._isItemEnabled = function(unit, item, misc) {

	if (misc.disableFlag & AIDisableFlag.ITEM) {
		return false;
	}

	// ★追加：一部のアイテムをアクティブ判定に入れないためのフラグ
	if (tona_Temp.disableEntireWeapon) {

		// 味方に使うアイテムはアクティブ判定から除外
		if (item.getFilterFlag() & UnitFilterFlag.PLAYER) {
			return false;
		}

		// 一部のアイテムはアクティブ判定から除外
		if (item.custom.tona_excludeActiveCheck) {
			return false;
		}
	}

	// AI時では、ItemPackageControl.getItemAvailabilityObjectを使用しない
	return ItemControl.isItemUsable(unit, item);
}

// *****************************************************************************************************************************
// アクションコントローラー
// -----------------------------------------------------------------------------------------------------------------------------

var tona_ActionControl = { __dummy: null

	// *****************************************************************************************************************************
	// AI のコンビネーションを取得
	// -----------------------------------------------------------------------------------------------------------------------------

	, getCombination: function(unit) {
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

	// *****************************************************************************************************************************
	// 最優先行動に、レベルを考慮した乱数で優先度をつける
	// -----------------------------------------------------------------------------------------------------------------------------

	, getMaxRandomScoreWithLevel : function(targetUnit) {

		// 優先度最大
		// 乱数で幅を持たせることでターゲットをランダムにする
		// ただしレベルが高い方が少し選ばれやすい

		return 800 + root.getRandomNumber() % 20 + targetUnit.getLv();
	}
};






