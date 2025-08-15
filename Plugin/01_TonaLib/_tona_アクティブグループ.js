
// *****************************************************************************************************************************
// アクティブグループを更新
// -----------------------------------------------------------------------------------------------------------------------------

var tona_ActiveGroupControl = {

	update: function() {

		// 一部のアイテムをアクティブ判定から除外するためのフラグ
		tona_Temp.disableEntireWeapon = true;

		var enemyList = root.getCurrentSession().getEnemyList();
		var enemyCount = enemyList.getCount();
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
					var combination = tona_ActionControl.getCombination(enemy);
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

		// 一部のアイテムをアクティブ判定から除外するためのフラグ
		tona_Temp.disableEntireWeapon = false;
	}
};

