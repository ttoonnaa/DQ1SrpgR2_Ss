
var ParamGroup = {
	_objectArray: null,
	
	initSingleton: function() {
		this._objectArray = [];
		this._configureUnitParameters(this._objectArray);
	},
	
	// ユニットのHPや力などのパラメータを取得する
	getUnitValue: function(unit, i) {
		return this._objectArray[i].getUnitValue(unit);
	},
	
	setUnitValue: function(unit, i, value) {
		this._objectArray[i].setUnitValue(unit, value);
	},
	
	// クラスボーナスを含んだパラメータを取得する
	getClassUnitValue: function(unit, i) {
		var value = this._objectArray[i].getUnitValue(unit) + this._objectArray[i].getParameterBonus(unit.getClass());
		
		return this.getValidValue(unit, value, i);
	},
	
	// クラスや武器、アイテムなどのパラメータボーナスを取得する
	getParameterBonus: function(obj, i) {
		return this._objectArray[i].getParameterBonus(obj);
	},
	
	// クラスや武器、アイテムなどの成長値ボーナスを取得する
	getGrowthBonus: function(obj, i) {
		return this._objectArray[i].getGrowthBonus(obj);
	},
	
	// ドーピングアイテムのドーピング値を取得する
	getDopingParameter: function(obj, i) {
		return this._objectArray[i].getDopingParameter(obj);
	},
	
	getAssistValue: function(obj, i) {
		return this._objectArray[i].getAssistValue(obj);
	},
	
	getValidValue: function(unit, value, i) {
		var max = this.getMaxValue(unit, i);
		var min = this.getMinValue(unit, i);
		
		if (value > max) {
			// パラメータの最大値を超える場合は、最大値に収める
			value = max;
		}
		else if (value < min) {
			// パラメータの最小値を下回る場合は、最小値に収める
			value = min;
		}
		
		return value;
	},
	
	// パラメータの最大値を取得する
	getMaxValue: function(unit, i) {
		return this._objectArray[i].getMaxValue(unit);
	},
	
	// パラメータの最小値を取得する
	getMinValue: function(unit, i) {
		return this._objectArray[i].getMinValue(unit);
	},
	
	// パラメータの名前を取得する
	getParameterName: function(i) {
		return this._objectArray[i].getParameterName();
	},
	
	getParameterType: function(i) {
		return this._objectArray[i].getParameterType();
	},
	
	isParameterDisplayable: function(unitStatusType, i) {
		return this._objectArray[i].isParameterDisplayable(unitStatusType);
	},
	
	isParameterRenderable: function(i) {
		return this._objectArray[i].isParameterRenderable();
	},
	
	drawUnitParameter: function(x, y, statusEntry, isSelect, i) {
		return this._objectArray[i].drawUnitParameter(x, y, statusEntry, isSelect);
	},
	
	// パラメータの総数を取得する
	getParameterCount: function(i) {
		return this._objectArray.length;
	},
	
	// 武器および所持アイテムのパラメータボーナスを取得する
	getUnitTotalParamBonus: function(unit, i, weapon) {
		return this._objectArray[i].getUnitTotalParamBonus(unit, weapon);
	},
	
	// 武器および所持アイテムの成長値ボーナスを取得する
	getUnitTotalGrowthBonus: function(unit, i, weapon) {
		return this._objectArray[i].getUnitTotalGrowthBonus(unit, weapon);
	},
	
	getParameterIndexFromType: function(type) {
		var i;
		var count = this.getParameterCount();
		
		for (i = 0; i < count; i++) {
			if (this.getParameterType(i) === type) {
				return i;
			}
		}
		
		return -1;
	},
	
	// このメソッドではgetValidValueを呼び出さないため、戻り値は「パラメータ上限」を超えることができる
	getLastValue: function(unit, index, weapon) {
		var n = this.getClassUnitValue(unit, index) + this.getUnitTotalParamBonus(unit, index, weapon) + StateControl.getStateParameter(unit, index);
		
		n = FusionControl.getLastValue(unit, index, n);
		
		n = MetamorphozeControl.getLastValue(unit, index, n);
		
		return n;
	},
	
	_configureUnitParameters: function(groupArray) {
		groupArray.appendObject(UnitParameter.MHP);
		groupArray.appendObject(UnitParameter.POW);
		groupArray.appendObject(UnitParameter.MAG);
		groupArray.appendObject(UnitParameter.SKI);
		groupArray.appendObject(UnitParameter.SPD);
		groupArray.appendObject(UnitParameter.LUK);
		groupArray.appendObject(UnitParameter.DEF);
		groupArray.appendObject(UnitParameter.MDF);
		groupArray.appendObject(UnitParameter.MOV);
		groupArray.appendObject(UnitParameter.WLV);
		groupArray.appendObject(UnitParameter.BLD);
	}
};

var BaseUnitParameter = defineObject(BaseObject,
{
	getUnitValue: function(unit) {
		return unit.getParamValue(this.getParameterType());
	},
	
	setUnitValue: function(unit, value) {
		unit.setParamValue(this.getParameterType(), value);
	},
	
	// objはユニットやクラス、武器など
	getParameterBonus: function(obj) {
		return this._getAssistValue(obj.getParameterBonus());
	},
	
	// objはユニットやクラス、武器など
	getGrowthBonus: function(obj) {
		return this._getAssistValue(obj.getGrowthBonus());
	},
	
	// objは、CommandParameterChange、Item、State、TurnStateのいずれか
	getDopingParameter: function(obj) {
		return this._getAssistValue(obj.getDopingParameter());
	},
	
	getMaxValue: function(unit) {
		if (DataConfig.isClassLimitEnabled()) {
			// クラスの「パラメータ上限」を返す
			return unit.getClass().getMaxParameter(this.getParameterType());
		}
		else {
			// コンフィグの「パラメータ上限」を返す
			return DataConfig.getMaxParameter(this.getParameterType());
		}
	},
	
	getMinValue: function(unit) {
		return 0;
	},
	
	getParameterName: function() {
		return root.queryCommand(this.getSignal() + '_param');
	},
	
	getParameterType: function() {
		return -1;
	},
	
	isParameterDisplayable: function(unitStatusType) {
		return true;
	},
	
	isParameterRenderable: function() {
		return false;
	},
	
	drawUnitParameter: function(x, y, statusEntry, isSelect) {
	},
	
	getUnitTotalParamBonus: function(unit, weapon) {
		var i, count, skill;
		var d = 0;
		var arr = [];
		
		// 武器のパラメータボーナス
		if (weapon !== null) {
			d += this.getParameterBonus(weapon);
		}
		
		// アイテムのパラメータボーナス
		d += this._getItemBonus(unit, true);
		
		// パラメータボーナスのスキルを確認する
		arr = SkillControl.getSkillObjectArray(unit, weapon, SkillType.PARAMBONUS, '', this._getParamBonusObjectFlag());
		count = arr.length;
		for (i = 0; i < count; i++) {
			skill = arr[i].skill;
			d += this.getParameterBonus(skill);
		}
		
		return d;
	},
	
	getUnitTotalGrowthBonus: function(unit, weapon) {
		var d = this.getGrowthBonus(unit.getClass());
		
		if (weapon !== null) {
			d += this.getGrowthBonus(weapon);
		}
		
		return d + this._getItemBonus(unit, false);
	},
	
	_getAssistValue: function(parameterObject) {
		return parameterObject.getAssistValue(this.getParameterType());
	},
	
	_getItemBonus: function(unit, isParameter) {
		var i, item, n;
		var d = 0;
		var checkerArray = [];
		var count = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (!ItemIdentityChecker.isItemReused(checkerArray, item)) {
				continue;
			}
			
			if (isParameter) {
				n = this.getParameterBonus(item);
			}
			else {
				n = this.getGrowthBonus(item);
			}
			
			// アイテムを使用できないユニットは、補正が加算されない
			if (n !== 0 && ItemControl.isItemUsable(unit, item)) {
				d += n;
			}
		}
		
		return d;
	},
	
	_getParamBonusObjectFlag: function() {
		// 武器、アイテムはパラメータボーナススキルではなく、
		// 直接パラメータボーナスを設定しているものとする。
		return ObjectFlag.UNIT | ObjectFlag.CLASS | ObjectFlag.STATE | ObjectFlag.TERRAIN;
	}
}
);

var UnitParameter = {};

UnitParameter.MHP = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.MHP;
	},
	
	getSignal: function() {
		return 'hp';
	},
	
	getMinValue: function(unit) {
		// 最大HPの最小値は1。
		// パラメータの変更によって、ユニットは死亡しない。
		return 1;
	},
	
	isParameterDisplayable: function(unitStatusType) {
		// ユニットメニューでない場合に表示する
		return unitStatusType !== UnitStatusType.UNITMENU;
	}
}
);

UnitParameter.POW = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.POW;
	},
	
	getSignal: function() {
		return 'pow';
	}
}
);

UnitParameter.MAG = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.MAG;
	},
	
	getSignal: function() {
		return 'mag';
	}
}
);

UnitParameter.SKI = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.SKI;
	},
	
	getSignal: function() {
		return 'ski';
	}
}
);

UnitParameter.SPD = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.SPD;
	},
	
	getSignal: function() {
		return 'spd';
	}
}
);

UnitParameter.LUK = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.LUK;
	},
	
	getSignal: function() {
		return 'luk';
	}
}
);

UnitParameter.DEF = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.DEF;
	},
	
	getSignal: function() {
		return 'def';
	}
}
);

UnitParameter.MDF = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.MDF;
	},
	
	getSignal: function() {
		return 'mdf';
	}
}
);

UnitParameter.MOV = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.MOV;
	},
	
	getSignal: function() {
		return 'mov';
	}
}
);

UnitParameter.WLV = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.WLV;
	},
	
	getSignal: function() {
		return 'wlv';
	},
	
	isParameterDisplayable: function(unitStatusType) {
		return DataConfig.isWeaponLevelDisplayable();
	}
}
);

UnitParameter.BLD = defineObject(BaseUnitParameter,
{
	getParameterType: function() {
		return ParamType.BLD;
	},
	
	getSignal: function() {
		return 'bld';
	},
	
	isParameterDisplayable: function(unitStatusType) {
		return DataConfig.isBuildDisplayable();
	}
}
);

// ユニットの力などをボーナス込みで取得する
var ParamBonus = {
	getMhp: function(unit) {
		var n = this.getBonus(unit, ParamType.MHP);
		
		// マップユニットHP表示時に毎回参照しないようにキャッシュ
		unit.saveMhp(n);
		
		return n;
	},
	
	getStr: function(unit) {
		return this.getBonus(unit, ParamType.POW);
	},
	
	getMag: function(unit) {
		return this.getBonus(unit, ParamType.MAG);
	},
	
	getSki: function(unit) {
		return this.getBonus(unit, ParamType.SKI);
	},
	
	getSpd: function(unit) {
		return this.getBonus(unit, ParamType.SPD);
	},
	
	getLuk: function(unit) {
		return this.getBonus(unit, ParamType.LUK);
	},
	
	getDef: function(unit) {
		return this.getBonus(unit, ParamType.DEF);
	},
	
	getMdf: function(unit) {
		return this.getBonus(unit, ParamType.MDF);
	},
	
	getMov: function(unit) {
		return this.getBonus(unit, ParamType.MOV);
	},
	
	getWlv: function(unit) {
		return this.getBonus(unit, ParamType.WLV);
	},
	
	getBld: function(unit) {
		return this.getBonus(unit, ParamType.BLD);
	},
	
	getBonus: function(unit, type) {
		var weapon = ItemControl.getEquippedWeapon(unit);
		
		return this.getBonusFromWeapon(unit, type, weapon);
	},
	
	getBonusFromWeapon: function(unit, type, weapon) {
		var i, typeTarget, n;
		var index = -1;
		var count = ParamGroup.getParameterCount();
		
		for (i = 0; i < count; i++) {
			typeTarget = ParamGroup.getParameterType(i);
			if (type === typeTarget) {
				index = i;
				break;
			}
		}
		
		if (index === -1) {
			return 0;
		}
		
		n = ParamGroup.getLastValue(unit, index, weapon);
		if (type === ParamType.MHP) {
			if (n < 1) {
				n = 1;
			}
		}
		else {
			if (n < 0) {
				n = 0;
			}
		}
		
		return n;
	}
};

var RealBonus = {
	getMhp: function(unit) {
		return ParamBonus.getMhp(unit);
	},
	
	getStr: function(unit) {
		return ParamBonus.getStr(unit);
	},
	
	getMag: function(unit) {
		return ParamBonus.getMag(unit);
	},
	
	getSki: function(unit) {
		return ParamBonus.getSki(unit);
	},
	
	getSpd: function(unit) {
		return ParamBonus.getSpd(unit);
	},
	
	getLuk: function(unit) {
		return ParamBonus.getLuk(unit);
	},
	
	getDef: function(unit) {
		var terrain;
		var def = 0;
		
		if (unit.getClass().getClassType().isTerrainBonusEnabled()) {
			terrain = PosChecker.getTerrainFromPos(unit.getMapX(), unit.getMapY());
			if (terrain !== null) {
				def = terrain.getDef();
			}
		}
		
		return ParamBonus.getDef(unit) + def;
	},
	
	getMdf: function(unit) {
		var terrain;
		var mdf = 0;
		
		if (unit.getClass().getClassType().isTerrainBonusEnabled()) {
			terrain = PosChecker.getTerrainFromPos(unit.getMapX(), unit.getMapY());
			if (terrain !== null) {
				mdf = terrain.getMdf();
			}
		}
		
		return ParamBonus.getMdf(unit) + mdf;
	},
	
	getMov: function(unit) {
		return ParamBonus.getMov(unit);
	},
	
	getWlv: function(unit) {
		return ParamBonus.getWlv(unit);
	},
	
	getBld: function(unit) {
		return ParamBonus.getBld(unit);
	}
};
