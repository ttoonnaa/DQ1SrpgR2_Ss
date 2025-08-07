
// getUnitStyleの呼び出しはこのファイルのみで行われる
var FusionControl = {
	catchUnit: function(unit, targetUnit, fusionData) {
		if (!this.isFusionAllowed(unit, targetUnit, fusionData)) {
			return false;
		}
		
		unit.getUnitStyle().clearFusionInfo();
		unit.getUnitStyle().setFusionChild(targetUnit);
		unit.getUnitStyle().setFusionData(fusionData);
		
		targetUnit.getUnitStyle().clearFusionInfo();
		targetUnit.getUnitStyle().setFusionParent(unit);
		targetUnit.getUnitStyle().setFusionData(fusionData);
		
		targetUnit.setInvisible(true);
		
		this._observeUnitHp(unit, fusionData, IncreaseType.INCREASE);
		
		return true;
	},
	
	// unitのリリース位置は呼び出し側が決める
	releaseChild: function(unit) {
		var fusionData;
		var targetUnit = this.getFusionChild(unit);
		
		if (targetUnit === null) {
			return false;
		}
		
		fusionData = unit.getUnitStyle().getFusionData();
		
		unit.getUnitStyle().clearFusionInfo();
		targetUnit.getUnitStyle().clearFusionInfo();
		
		targetUnit.setInvisible(false);
		
		this._observeUnitHp(unit, fusionData, IncreaseType.DECREASE);
		
		return true;
	},
	
	// 両ユニットがフュージョン中の場合、入れ替えはできない
	tradeChild: function(unit, targetUnit) {
		var fusionData;
		var childUnit = this.getFusionChild(unit);
		
		if (childUnit === null) {
			return false;
		}
		
		fusionData = unit.getUnitStyle().getFusionData();
		unit.getUnitStyle().clearFusionInfo();
		
		targetUnit.getUnitStyle().clearFusionInfo();
		targetUnit.getUnitStyle().setFusionChild(childUnit);
		targetUnit.getUnitStyle().setFusionData(fusionData);
		
		childUnit.getUnitStyle().clearFusionInfo();
		childUnit.getUnitStyle().setFusionParent(targetUnit);
		childUnit.getUnitStyle().setFusionData(fusionData);
		
		childUnit.setInvisible(true);
		
		this._observeUnitHp(unit, fusionData, IncreaseType.DECREASE);
		this._observeUnitHp(targetUnit, fusionData, IncreaseType.INCREASE);
		
		return true;
	},
	
	getFusionData: function(unit) {
		return unit.getUnitStyle().getFusionData();
	},
	
	// unitがフュージョンしている相手(子)を取得する
	getFusionChild: function(unit) {
		return unit.getUnitStyle().getFusionChild();
	},
	
	// unitをフュージョンしている相手(親)を取得する
	getFusionParent: function(unit) {
		return unit.getUnitStyle().getFusionParent();
	},
	
	// fusionDataをベースに、unitがtargetUnitとフュージョンできるか調べる
	isFusionAllowed: function(unit, targetUnit, fusionData) {
		if (!fusionData.compareUnitCapacity(unit, targetUnit)) {
			return false;
		}
		
		if (!fusionData.isSrcCondition(unit)) {
			return false;
		}
		
		if (!fusionData.isDestCondition(targetUnit)) {
			return false;
		}
		
		return true;
	},
	
	isCatchable: function(unit, targetUnit, fusionData) {
		if (this.getFusionChild(targetUnit) !== null) {
			return false;
		}
		
		if (!this.isFusionAllowed(unit, targetUnit, fusionData)) {
			return false;
		}
		
		return FilterControl.isBestUnitTypeAllowed(unit.getUnitType(), targetUnit.getUnitType(), fusionData.getFilterFlag());
	},
	
	isAttackable: function(unit, targetUnit, fusionData) {
		return this.isCatchable(unit, targetUnit, fusionData);
	},
	
	isControllable: function(unit, targetUnit, fusionData) {
		var result;
		
		if (fusionData.getFusionType() === FusionType.NORMAL) {
			result = this.isCatchable(unit, targetUnit, fusionData);
		}
		else {
			result = this.isAttackable(unit, targetUnit, fusionData);
		}
		
		return result;
	},
	
	isItemAllowed: function(unit, targetUnit, fusionData) {
		return true;
	},
	
	// アイテムでないフュージョン攻撃は互いに隣接していなければならない
	isRangeAllowed: function(unit, targetUnit, fusionData) {
		var i;
		var x = unit.getMapX();
		var y = unit.getMapY();
		var x2 = targetUnit.getMapX();
		var y2 = targetUnit.getMapY();
		
		for (i = 0; i < DirectionType.COUNT; i++) {
			if (x + XPoint[i] === x2 && y + YPoint[i] === y2) {
				return true;
			}
		}
		
		return false;
	},
	
	isUnitTradable: function(unit) {
		var data = unit.getUnitStyle().getFusionData();
		
		if (data === null) {
			return false;
		}
		
		return data.isUnitTradable();
	},
	
	isItemTradable: function(unit) {
		var data = unit.getUnitStyle().getFusionData();
		
		if (data === null) {
			return false;
		}
		
		return data.isItemTradable();
	},
	
	clearFusion: function(unit) {
		unit.getUnitStyle().clearFusionInfo();
	},
	
	getFusionAttackData: function(unit) {
		return unit.getUnitStyle().getFusionAttackData();
	},
	
	startFusionAttack: function(unit, fusionData) {
		unit.getUnitStyle().startFusionAttack(fusionData);
	},
	
	endFusionAttack: function(unit) {
		unit.getUnitStyle().endFusionAttack();
	},
	
	isExperienceDisabled: function(unit) {
		var fusionData = unit.getUnitStyle().getFusionAttackData();
		
		if (fusionData === null) {
			return false;
		}
		
		// リリース後の処理が「消去」でない「フュージョン攻撃」では、経験値の取得を許可しない。
		// リリース後に再びキャッチすることで、無限に経験値を稼げるのを防ぐ。
		return fusionData.getFusionReleaseType() !== FusionReleaseType.ERASE;
	},
	
	getLastValue: function(unit, index, n) {
		var childValue;
		var value = n;
		var calc = null;
		var child = null;
		var fusionData = FusionControl.getFusionData(unit);
		var isChildCheck = false;
		
		// UnitStatusScrollbar._createStatusEntryで、ParamGroup.getLastValueが呼ばれることを考える。
		// UnitStatusScrollbar._createStatusEntryに指定されるindexは、0,1,..パラメータ総数(カスタム込み)。
		// たとえば、1はメニューの左上の項目であり、デフォルトでは「力」だが、_configureUnitParametersで、
		// パラメータは並び替えできるので、パラメータは、並び替えの順番通りに表示されなければならない。
		// よって、getLastValueでindexを使用する場合は、事前にParamGroup.getParameterTypeを呼び出すことで、
		// 並び替えられたパラメータの実際の位置を識別するよう更新しておく。
		index = ParamGroup.getParameterType(index);
		
		if (fusionData !== null) {
			// 通常のフュージョンの場合は、「フュージョン中補正」を取得
			calc = fusionData.getStatusCalculation();
			child = FusionControl.getFusionChild(unit);
			if (child === null) {
				calc = null;
			}
			else {
				isChildCheck = calc.isChildCheck(index);
			}
		}
		else {
			fusionData = FusionControl.getFusionAttackData(unit);
			if (fusionData !== null) {
				// 「フュージョン攻撃」の場合は、「フュージョン攻撃補正」を取得
				calc = fusionData.getAttackCalculation();
			}
		}
		
		if (calc !== null) {
			if (isChildCheck) {
				childValue = SymbolCalculator.calculateEx(child, index, calc);
				value = SymbolCalculator.calculate(n, childValue, calc.getOperatorSymbol(index));
			}
			else {
				value = SymbolCalculator.calculate(n, calc.getValue(index), calc.getOperatorSymbol(index));
			}
		}
		
		return value;
	},
	
	getFusionArray: function(unit) {
		var i, list, skillArray, skill, fusionData;
		var fusionArray = [];
		var refList = root.getMetaSession().getDifficulty().getFusionReferenceList();
		var count = refList.getTypeCount();
		
		// 「既定で有効なフュージョン」を調べる
		for (i = 0; i < count; i++) {
			fusionData = refList.getTypeData(i);
			if (!this._isUsed(fusionArray, fusionData)) {
				fusionArray.push(fusionData);
			}
		}
		
		list = root.getBaseData().getFusionList();
		
		// フュージョンスキルを調べる場合は、武器はnullを指定する。
		// このスキルは武器スキルとして持つことはできない。
		skillArray = SkillControl.getSkillMixArray(unit, null, SkillType.FUSION, '');
		count = skillArray.length;
		for (i = 0; i < count; i++) {
			skill = skillArray[i].skill;
			fusionData = list.getDataFromId(skill.getSkillValue());
			if (fusionData !== null && !this._isUsed(fusionArray, fusionData)) {
				fusionArray.push(fusionData);
			}
		}
		
		return fusionArray;
	},
	
	_isUsed: function(arr, obj) {
		var i;
		var count = arr.length;
		
		for (i = 0; i < count; i++) {
			if (arr[i].getId() === obj.getId()) {
				return true;
			}
		}
		
		return false;
	},
	
	_observeUnitHp: function(unit, fusionData, increaseType) {
		var hpPlus = this._getFusionCorrectionValue(unit, 0, fusionData);
		
		if (increaseType === IncreaseType.DECREASE) {
			hpPlus *= -1;
		}
		
		if (hpPlus !== 0) {
			unit.setHp(unit.getHp() + hpPlus);
		}
		
		// HPを下げる「フュージョン中補正」において、hp > mhpが成立しないようにする
		MapHpControl.updateHp(unit);
	},
	
	_getFusionCorrectionValue: function(unit, index, fusionData) {
		var value = 0;
		var calc = null;
		
		index = ParamGroup.getParameterType(index);
		
		if (fusionData !== null) {
			calc = fusionData.getStatusCalculation();
		}
		
		if (calc !== null) {
			value = SymbolCalculator.calculate(0, calc.getValue(index), calc.getOperatorSymbol(index));
		}
		
		return value;
	}
};

var MetamorphozeControl = {
	startMetamorphoze: function(unit, metamorphozeData) {
		var mhpPrev;
		
		if (!this.isMetamorphozeAllowed(unit, metamorphozeData)) {
			return false;
		}
		
		mhpPrev = ParamBonus.getMhp(unit);
		
		unit.getUnitStyle().setMetamorphozeData(metamorphozeData);
		unit.getUnitStyle().setMetamorphozeTurn(metamorphozeData.getCancelTurn());
		
		this._addState(unit, metamorphozeData);
		
		Miscellaneous.changeHpBonus(unit, mhpPrev);
		
		return true;
	},
	
	clearMetamorphoze: function(unit) {
		var mhpPrev = ParamBonus.getMhp(unit);
		
		unit.getUnitStyle().clearMetamorphozeData();
		this._deleteMetamorphozeItem(unit);
		
		Miscellaneous.changeHpBonus(unit, mhpPrev);
	},
	
	getMetamorphozeData: function(unit) {
		return unit.getUnitStyle().getMetamorphozeData();
	},
	
	getMetamorphozeTurn: function(unit) {
		return unit.getUnitStyle().getMetamorphozeTurn();
	},
	
	setMetamorphozeTurn: function(unit, turn) {
		unit.getUnitStyle().setMetamorphozeTurn(turn);
	},
	
	isMetamorphozeAllowed: function(unit, metamorphozeData) {
		return metamorphozeData.isParameterCondition(unit) && metamorphozeData.isDataCondition(unit);
	},
	
	getLastValue: function(unit, index, n) {
		var value = n;
		var calc = null;
		var metamorphozeData = MetamorphozeControl.getMetamorphozeData(unit);
		
		if (metamorphozeData !== null) {
			calc = metamorphozeData.getStatusCalculation();
		}
		
		if (calc !== null) {
			value = SymbolCalculator.calculate(n, calc.getValue(index), calc.getOperatorSymbol(index));
		}
		
		return value;
	},
	
	_addState: function(unit, metamorphozeData) {
		var i, state;
		var refList = metamorphozeData.getStateReferenceList();
		var count = refList.getTypeCount();
		
		for (i = 0; i < count; i++) {
			state = refList.getTypeData(i);
			StateControl.arrangeState(unit, state, IncreaseType.INCREASE);
		}
	},
	
	_deleteMetamorphozeItem: function(unit) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item === null) {
				continue;
			}
			
			if (!item.isWeapon() && item.getItemType() === ItemType.METAMORPHOZE) {
				if (item.getLimit() === WeaponLimitValue.BROKEN) {
					UnitItemControl.cutItem(unit, i);
					break;
				}
			}
		}
	}
};
