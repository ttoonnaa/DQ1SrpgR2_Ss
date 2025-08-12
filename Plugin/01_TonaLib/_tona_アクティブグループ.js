
// *****************************************************************************************************************************
// アクティブグループを更新
// -----------------------------------------------------------------------------------------------------------------------------

var tona_ActiveGroupControl = {

	update: function() {

		var enemyList = root.getCurrentSession().getEnemyList();
		var enemyCount = enemyList.getCount();

		// 全域武器を一時的に無効にする
		//__Data.disableEntireWeapon = 1;

		var isGroupActive = [];

		// グループのユニットが１体でもアクティブならグループ自体をアクティブにする
		for (var i = 0; i < enemyCount; i++) {
			var enemy = enemyList.getData(i);
			var enemyGroupId = enemy.custom.tona_unitGroupId;
			if (enemyGroupId > 0) {

				// 毎ターン初期化する
				enemy.custom.tona_isGroupActive = 0;

				// 現在位置から攻撃可能なユニットの中で、最も優れた組み合わせを取得する
				if (enemy.createAIPattern()) {
					var combination = tona_AiControl.getCombination(enemy);
					if (combination !== null) {
						isGroupActive[enemyGroupId] = 1;
					}
				}
			}
		}

		// グループに属するユニットをアクティブにする
		for (var i = 0; i < enemyCount; i++) {
			var enemy = enemyList.getData(i);
			var enemyGroupId = enemy.custom.tona_unitGroupId;
			if (enemyGroupId > 0) {
				if (isGroupActive[enemyGroupId] === 1) {
					enemy.custom.tona_isGroupActive = 1;
				}
			}
		}

		// （ログ）
		for (var i = 0; i < isGroupActive.length; i++) {
			if (isGroupActive[i] != null) {
				root.log('グループ' + i + ': ' + isGroupActive[i]);
			}
		}

		//__Data.disableEntireWeapon = 0;
	}
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



