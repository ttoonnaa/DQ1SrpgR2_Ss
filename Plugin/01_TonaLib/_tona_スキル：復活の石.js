
// **************************************************************************************************************************
// 復活の石
// --------------------------------------------------------------------------------------------------------------------------

// **************************************************************************************************************************
// 復活の石：フロー
// --------------------------------------------------------------------------------------------------------------------------

var tona_RevivalFlow = defineObject(BaseFlowEntry, { __dummy: null

	, _state: 0
	, _unit: null
	, _unitList: null
	, _unitIndex: 0
	, _dynamicAnime: null
	, _recoveryWindow: null
	, _recoveryValue: 99

	// **************************************************************************************************************************
	// 復活の石の最初の処理
	// --------------------------------------------------------------------------------------------------------------------------

	, enterFlowEntry: function() {
        root.log('復活の石');

		if (!this._isEnterRevivalEvent()) {
			return EnterResult.NOTENTER;
		}

		this._state = 1;

		return EnterResult.OK;
	}

	// **************************************************************************************************************************
	// 復活の石の動作
	// --------------------------------------------------------------------------------------------------------------------------

	, moveFlowEntry: function() {

		// ステート１：処理開始
		if (this._state == 1) {

			var playerList = root.getCurrentSession().getPlayerList();
			var playerCount = playerList.getCount();
			var enemyList = root.getCurrentSession().getEnemyList();
			var enemyCount = enemyList.getCount();
			var allyList = root.getCurrentSession().getAllyList();
			var allyCount = allyList.getCount();

			// 復活するユニットリストを作る
			this._unitList = [];

			for (var i = 0; i < playerCount; i++) {
				if (this._isRevivalUnit(playerList.getData(i))) {
					this._unitList.push(playerList.getData(i));
				}
			}
			for (var i = 0; i < enemyCount; i++) {
				if (this._isRevivalUnit(enemyList.getData(i))) {
					this._unitList.push(enemyList.getData(i));
				}
			}
			for (var i = 0; i < allyCount; i++) {
				if (this._isRevivalUnit(allyList.getData(i))) {
					this._unitList.push(allyList.getData(i));
				}
			}

			// ユニットがいない
			if (this._unitList.length == 0) {
				return MoveResult.END;
			}

			// 最初のユニットから開始
			this._unitIndex = 0;
			this._state = 2;

			return MoveResult.CONTINUE;
		}

		// ステート２：ループ処理とユニット開始処理
		else if (this._state == 2) {

			// 処理するユニットを取り出す
			this._unit = this._unitList[this._unitIndex];

			// アニメを開始する
			var x = LayoutControl.getPixelX(this._unit.getMapX());
			var y = LayoutControl.getPixelY(this._unit.getMapY());
			var anime = root.queryAnime('reaction');
			var pos = LayoutControl.getMapAnimationPos(x, y, anime);
			this._dynamicAnime = createObject(DynamicAnime);
			this._dynamicAnime.startDynamicAnime(anime, pos.x, pos.y);
			this._state = 3;

			return MoveResult.CONTINUE;
		}

		// ステート３：アニメ待ちとウィンドウ開始処理
		else if (this._state == 3) {

			if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
				this._dynamicAnime = null;

				// 実際に復活する
				this._unit.setAliveState(AliveType.ALIVE);
				this._unit.setHp(ParamBonus.getMhp(this._unit));
				this._unit.setInvisible(false);

				// スキルを減らす
				this._decreaseUnitRevival(this._unit);

				// ウィンドウを開始する
				this._recoveryWindow = createWindowObject(RecoveryWindow, this);
				this._recoveryWindow.setRecoveryUnit(this._unit);
				this._recoveryWindow.startRecovery(this._recoveryValue);
				this._state = 4;
			}

			return MoveResult.CONTINUE;
		}

		// ステート４：ウィンドウ待ちとユニット終了処理
		else if (this._state == 4) {

			if (this._recoveryWindow.moveWindow() !== MoveResult.CONTINUE) {
				this._recoveryWindow = null;

				// 次のユニットへ
				this._unitIndex ++;
				if (this._unitIndex >= this._unitList.length) {
					return MoveResult.END;
				}

				this._state = 2;
			}

			return MoveResult.CONTINUE;
		}
	}

	// **************************************************************************************************************************
	// 復活の石の描画
	// --------------------------------------------------------------------------------------------------------------------------

	, drawFlowEntry: function() {

		if (this._dynamicAnime != null) {
			this._dynamicAnime.drawDynamicAnime();
		}
		if (this._recoveryWindow != null) {
			var width = this._recoveryWindow.getWindowWidth();
			var height = this._recoveryWindow.getWindowHeight();
			var x = LayoutControl.getUnitBaseX(this._unit, width);
			var y = LayoutControl.getUnitBaseY(this._unit, height);
			this._recoveryWindow.drawWindow(x, y);
		}
	}

	// **************************************************************************************************************************
	// 復活イベントが必要かを判定
	// --------------------------------------------------------------------------------------------------------------------------

	, _isEnterRevivalEvent: function() {

		var playerList = root.getCurrentSession().getPlayerList();
		var playerCount = playerList.getCount();
		var enemyList = root.getCurrentSession().getEnemyList();
		var enemyCount = enemyList.getCount();
		var allyList = root.getCurrentSession().getAllyList();
		var allyCount = allyList.getCount();

		for (var i = 0; i < playerCount; i++) {
			if (this._isRevivalUnit(playerList.getData(i))) {
				return true;
			}
		}
		for (var i = 0; i < enemyCount; i++) {
			if (this._isRevivalUnit(enemyList.getData(i))) {
				return true;
			}
		}
		for (var i = 0; i < allyCount; i++) {
			if (this._isRevivalUnit(allyList.getData(i))) {
				return true;
			}
		}

		return false;
	}

	// **************************************************************************************************************************
	// ユニットが復活条件を満たしているかを判定
	// --------------------------------------------------------------------------------------------------------------------------

	, _isRevivalUnit: function(unit) {

		if (unit.getSortieState() != SortieType.SORTIE) {
			return false;
		}

		if (unit.getAliveState() != AliveType.DEATH) {
			return false;
		}

		var skillList = unit.getSkillReferenceList();
		for (var i = 0; i < skillList.getTypeCount(); i++) {
			var skill = skillList.getTypeData(i);
			if (skill.getCustomKeyword() == tona_SkillKeyword['スキル：復活の石']) {
				return true;
			}
		}

		return false;
	}

	// **************************************************************************************************************************
	// ユニットの復活カウントを１つ減らす
	// --------------------------------------------------------------------------------------------------------------------------

	, _decreaseUnitRevival: function(unit) {

		var skillList = unit.getSkillReferenceList();
		for (var i = 0; i < skillList.getTypeCount(); i++) {
			var skill = skillList.getTypeData(i);
			if (skill.getCustomKeyword() == tona_SkillKeyword['スキル：復活の石']) {
				var editor = root.getDataEditor();
				editor.deleteSkillData(skillList, skill);
				return;
			}
		}
	}
});

