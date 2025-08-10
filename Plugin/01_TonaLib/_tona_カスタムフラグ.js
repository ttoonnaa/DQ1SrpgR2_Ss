
// *****************************************************************************************************************************
// カスタムフラグ一覧
// -----------------------------------------------------------------------------------------------------------------------------
//
//	'tona_canCritical'
//		クリティカルが可能になる
//		難易度設定でクリティカルが規定で有効でない場合に使う
//
//	'tona_canRoundAttack'
//		追撃が可能になる
//		難易度設定で追撃が規定で有効でない場合に使う

// *****************************************************************************************************************************
// カスタムフラグ
// -----------------------------------------------------------------------------------------------------------------------------

var tona_CustomFlag = {
	__dummy: null

	, canCritical: 'tona_canCritical'
	, canRoundAttack: 'tona_canRoundAttack'
};

// *****************************************************************************************************************************
// カスタムフラグコントロール
// -----------------------------------------------------------------------------------------------------------------------------

var tona_CustomFlagControl = {

	// *****************************************************************************************************************************
	// カスタムフラグを持つかどうかを調べる
	// 1つでも true なら true を返す
	// -----------------------------------------------------------------------------------------------------------------------------

	isCustomFlag: function(unit, weapon, objectFlag, flagName) {

		if (objectFlag & ObjectFlag.UNIT) {
			if (this._isCustomFlag(unit, flagName)) {
				return true;
			}
		}

		if (objectFlag & ObjectFlag.CLASS) {
			if (this._isCustomFlag(unit.getClass(), flagName)) {
				return true;
			}
		}

		if (objectFlag & ObjectFlag.WEAPON) {
			if (weapon !== null) {
				if (this._isCustomFlag(weapon, flagName)) {
					return true;
				}
			}
		}

		if (objectFlag & ObjectFlag.ITEM) {
			var count = UnitItemControl.getPossessionItemCount(unit);
			for (var i = 0; i < count; i++) {
				var checkerArray = [];
				var item = UnitItemControl.getItem(unit, i);
				if (!ItemIdentityChecker.isItemReused(checkerArray, item)) {
					continue;
				}
				if (item !== null && ItemControl.isItemUsable(unit, item)) {
					if (this._isCustomFlag(item, flagName)) {
						return true;
					}
				}
			}
		}

		if (objectFlag & ObjectFlag.SKILL) {
			var arr = SkillControl.getSkillObjectArray(unit, weapon, -1, null, objectFlag);
			var count = arr.length;
			for (var i = 0; i < count; i++) {
				if (this._isCustomFlag(arr[i].skill, flagName)) {
					return true;
				}
			}
		}

		if (objectFlag & ObjectFlag.STATE) {
			var list = unit.getTurnStateList();
			var count = list.getCount();
			for (var i = 0; i < count; i++) {
				if (this._isCustomFlag(list.getData(i).getState(), flagName)) {
					return true;
				}
			}
		}

		return false;
	}

	// *****************************************************************************************************************************
	// カスタムフラグを持つかどうかを調べる（データ）
	// -----------------------------------------------------------------------------------------------------------------------------

	, _isCustomFlag: function(data, keyword) {

		if (keyword in data.custom) {
			if (data.custom[keyword]) {
				return true;
			}
		}

		return false;
	}
};

