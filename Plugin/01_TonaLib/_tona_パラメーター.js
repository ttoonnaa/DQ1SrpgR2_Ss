
// *****************************************************************************************************************************
// パラメーター
//		パラメーターを独自に計算する
//		obj から objectType を取得する方法が分からないので、
//		クラスの getParameterBonus、getGrowthBonus を使う場所全てを変更する必要がある
//		BaseUnitParameter と ParamGroup の２つ存在する
//
//	成長率について
//		ParamGroup.getGrowthBonus			ユニットのみ
//		ParamGroup.getUnitTotalGrowthBonus	クラス、装備、アイテム
//		ユニットの成長率はこの２つを足す必要がある
//
//	新規ユニットについて
//		ツール → オプションで、データ作成時の初期値を 0 にしておかないと
//		マップに配置したユニットにデフォルトのクラス成長値が設定されてしまう
//		その場合は ParamGroup.getGrowthBonus は使ってはいけない（getUnitGrowthBonus を使う）
// -----------------------------------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------------------------------
// BaseUnitParameter のユニットの成長率

BaseUnitParameter.getUnitGrowthBonus = function(unit) {

	var paramType = this.getParameterType();
	var unitId = unit.getId();
	var value = 0;

	// 独自のユニットボーナスを加算する
	if (unitId in z_master.playerById) {
		var masterPlayer = z_master.playerById[unitId];
		value += masterPlayer.growth[paramType];
	}

	return value;
};

// -----------------------------------------------------------------------------------------------------------------------------
// BaseUnitParameter：ユニットの成長率ボーナス（クラス、武器、…）

BaseUnitParameter.getUnitTotalGrowthBonus = function(unit, weapon) {

	var d = this.getClassGrowthBonus(unit.getClass());				// ★改造：クラス特殊

	if (weapon !== null) {
		d += this.getGrowthBonus(weapon);
	}

	return d + this._getItemBonus(unit, false);
};

// -----------------------------------------------------------------------------------------------------------------------------
// BaseUnitParameter：クラスのパラメーターボーナス

BaseUnitParameter.getClassParameterBonus = function(klass) {

	var paramType = this.getParameterType();
	var klassId = klass.getId();
	var value = 0;

	// 独自のクラスボーナスを加算する
	if (klassId in z_master.klassById) {
		var masterKlass = z_master.klassById[klassId];
		value += masterKlass.paramsBonus[paramType];
	}

	return value;
};

// -----------------------------------------------------------------------------------------------------------------------------
// BaseUnitParameter：クラスの成長率ボーナス

BaseUnitParameter.getClassGrowthBonus = function(klass) {

	var paramType = this.getParameterType();
	var klassId = klass.getId();
	var value = 0;

	// 独自のクラスボーナスを加算する
	if (klassId in z_master.klassById) {
		var masterKlass = z_master.klassById[klassId];
		value += masterKlass.growthBonus[paramType];
	}

	return value;
};

// -----------------------------------------------------------------------------------------------------------------------------
// BaseUnitParameter：パラメーターを表示するか

BaseUnitParameter.isParameterDisplayableForUnit = function(unit, unitStatusType) {

	return this.isParameterDisplayable(unitStatusType);
};

// *****************************************************************************************************************************
// ParamGroup
// -----------------------------------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------------------------------
// ParamGroup：ユニット＋クラスのパラメーター

ParamGroup.getClassUnitValue = function(unit, i) {

	var value = this._objectArray[i].getUnitValue(unit) + this._objectArray[i].getClassParameterBonus(unit.getClass());		// ★改造：クラス特殊

	return this.getValidValue(unit, value, i);
};

// -----------------------------------------------------------------------------------------------------------------------------
// ParamGroup：ユニットの成長率ボーナス

ParamGroup.getUnitGrowthBonus = function(unit, i) {

	return this._objectArray[i].getUnitGrowthBonus(unit);			// ★改造：ユニット特殊
}

// -----------------------------------------------------------------------------------------------------------------------------
// ParamGroup：クラスのパラメーターボーナス

ParamGroup.getClassParameterBonus = function(klass, i) {

	return this._objectArray[i].getClassParameterBonus(klass);		// ★改造：クラス特殊
};

// -----------------------------------------------------------------------------------------------------------------------------
// ParamGroup：クラスの成長率ボーナス

ParamGroup.getClassGrowthBonus = function(klass, i) {

	return this._objectArray[i].getClassGrowthBonus(klass);			// ★改造：クラス特殊
};

// -----------------------------------------------------------------------------------------------------------------------------
// ParamGroup：パラメーターを表示するか

ParamGroup.isParameterDisplayableForUnit = function(unit, unitStatusType, i) {

	return this._objectArray[i].isParameterDisplayableForUnit(unit, unitStatusType);
};


