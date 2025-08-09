
// *****************************************************************************************************************************
// シーンコントロール
// -----------------------------------------------------------------------------------------------------------------------------

var tona_SceneControl = {
	__dummy: null

	// *****************************************************************************************************************************
	// ステージをセットアップする
	// -----------------------------------------------------------------------------------------------------------------------------

	, setupStage: function() {

		this.setupStageUnit();
	}

	// *****************************************************************************************************************************
	// ステージの全てのユニットをセットアップする
	// -----------------------------------------------------------------------------------------------------------------------------

	, setupStageUnit: function() {
		var playerList = root.getCurrentSession().getPlayerList();
		var playerCount = playerList.getCount();
		var enemyList = root.getCurrentSession().getEnemyList();
		var enemyCount = enemyList.getCount();
		var allyList = root.getCurrentSession().getAllyList();
		var allyCount = allyList.getCount();

		// プレイヤーをセットアップ
		for (var i = 0; i < playerCount; i++) {
			this._setupPlayer(playerList.getData(i));
		}

		// エネミーをセットアップ
		for (var i = 0; i < enemyCount; i++) {
			this._setupEnemy(enemyList.getData(i));
		}

		// 同盟をセットアップ
		for (var i = 0; i < allyCount; i++) {
			this._setupAlly(allyList.getData(i));
		}
	}

	// *****************************************************************************************************************************
	// ステージのプレイヤーをセットアップする
	// -----------------------------------------------------------------------------------------------------------------------------
	, _setupPlayer: function(unit) {

		// セットアップ済みなら何もしない
		if (unit.custom.tona_isSetupDone > 0) { return; }

		root.log('セットアップ: ' + unit.getName());

		// ユニット情報を取得
		var unitId = tona_UnitControl.getPlayerId(unit);
		var masterPlayer = Master.playerById[unitId];
		var level = 1;

		// クラス情報を取得
		var klassId = unit.getClass().getId();
		var masterKlass = Master.klassById[klassId];

		// レベルを設定
		unit.setLv(level);

	    // パラメーターを設定
	    for (var pi = 0; pi <= 10; pi++) {
			var value = masterPlayer.params[pi];
			value += (masterPlayer.growths[pi] + masterKlass.growths[pi]) * (level - 1) / 100;
			unit.setParamValue(pi, Math.floor(value + 0.5));
		}

		// HPを設定
		unit.setHp(ParamBonus.getMhp(unit));

		// セットアップ済みにする
		unit.custom.tona_isSetupDone = 1;
	}

	// *****************************************************************************************************************************
	// ステージのエネミーをセットアップする
	// -----------------------------------------------------------------------------------------------------------------------------
	, _setupEnemy: function(unit) {

		// セットアップ済みなら何もしない
		if (unit.custom.tona_isSetupDone > 0) { return; }

		root.log('セットアップ: ' + unit.getName());

		// セットアップ済みにする
		unit.custom.tona_isSetupDone = 1;
	}

	// *****************************************************************************************************************************
	// ステージの同盟をセットアップする
	// -----------------------------------------------------------------------------------------------------------------------------
	, _setupAlly: function(unit) {

		// セットアップ済みなら何もしない
		if (unit.custom.tona_isSetupDone > 0) { return; }

		root.log('セットアップ: ' + unit.getName());

		// セットアップ済みにする
		unit.custom.tona_isSetupDone = 1;
	}
};
















