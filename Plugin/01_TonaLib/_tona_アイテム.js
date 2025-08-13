
// *****************************************************************************************************************************
// アイテムコントロール
// -----------------------------------------------------------------------------------------------------------------------------

ItemControl.isItemUsable = function(unit, item) {

	// 武器は使用できない
	if (item.isWeapon()) {
		return false;
	}

	// アイテムの使用が禁止されているか調べる
	if (StateControl.isBadStateFlag(unit, BadStateFlag.ITEM)) {
		return false;
	}

	if (item.isWand()) {

		// アイテムが杖の場合は、クラスが杖を使用できなければならない
		if (!(unit.getClass().getClassOption() & ClassOptionFlag.WAND)) {

			// ★追加：杖が使えなくても、代わりのフラグがあれば使える
			if (!tona_CustomFlagControl.isCustomFlagLowLevel(unit, ItemControl.getEquippedWeapon(unit), ObjectFlag.ITEM, tona_CustomFlag.canUseWand)) {
				return false;
			}
		}

		// 杖の使用が禁止されているか調べる
		if (StateControl.isBadStateFlag(unit, BadStateFlag.WAND)) {
			return false;
		}
	}

	if (!this._isItemTypeAllowed(unit, item)) {
		return false;
	}

	// 「専用データ」を調べる
	if (!this.isOnlyData(unit, item)) {
		return false;
	}

	return true;
};

