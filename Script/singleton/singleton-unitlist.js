
// ユニットリストを取得する時点で判定を行う。
// ユニットリストからユニットを取得する度に生存などの判定は行わない。
// DefaultListメソッドは、フュージョンされているユニットを考慮する。
var AllUnitList = {
	getAliveList: function(list) {
		var funcCondition = function(unit) {
			return unit.getAliveState() === AliveType.ALIVE && FusionControl.getFusionParent(unit) === null;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getAliveDefaultList: function(list) {
		var funcCondition = function(unit) {
			return unit.getAliveState() === AliveType.ALIVE;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getDeathList: function(list) {
		var funcCondition = function(unit) {
			return unit.getAliveState() === AliveType.DEATH;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getSortieList: function(list) {
		var funcCondition = function(unit) {
			return unit.getSortieState() === SortieType.SORTIE && unit.getAliveState() === AliveType.ALIVE && FusionControl.getFusionParent(unit) === null;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getSortieDefaultList: function(list) {
		var funcCondition = function(unit) {
			return unit.getSortieState() === SortieType.SORTIE && unit.getAliveState() === AliveType.ALIVE;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getSortieOnlyList: function(list) {
		var funcCondition = function(unit) {
			return unit.getSortieState() === SortieType.SORTIE;
		};
		
		return this.getList(list, funcCondition);
	},
	
	getList: function(list, funcCondition) {
		var i, unit, obj;
		var arr = [];
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			if (funcCondition(unit)) {
				arr.push(unit);
			}
		}
		
		obj = StructureBuilder.buildDataList();
		obj.setDataArray(arr);
		
		return obj;
	}
};

var PlayerList = {
	getAliveList: function() {
		return AllUnitList.getAliveList(this.getMainList());
	},
	
	getAliveDefaultList: function() {
		return AllUnitList.getAliveDefaultList(this.getMainList());
	},
	
	getDeathList: function() {
		return AllUnitList.getDeathList(this.getMainList());
	},
	
	getSortieList: function() {
		return AllUnitList.getSortieList(this.getMainList());
	},
	
	getSortieDefaultList: function() {
		return AllUnitList.getSortieDefaultList(this.getMainList());
	},
	
	getSortieOnlyList: function() {
		return AllUnitList.getSortieOnlyList(this.getMainList());
	},
	
	getMainList: function() {
		return root.getMetaSession().getTotalPlayerList();
	}
};

var EnemyList = {
	getAliveList: function() {
		return AllUnitList.getAliveList(this.getMainList());
	},
	
	getAliveDefaultList: function() {
		return AllUnitList.getAliveDefaultList(this.getMainList());
	},
	
	getDeathList: function() {
		return AllUnitList.getDeathList(this.getMainList());
	},
	
	getMainList: function() {
		var obj;
		var session = root.getCurrentSession();
		
		if (session === null || typeof session.getEnemyList === 'undefined') {
			obj = StructureBuilder.buildDataList();
			obj.setDataArray([]);
			return obj;
		}
		
		return session.getEnemyList();
	}
};

var AllyList = {
	getAliveList: function() {
		return AllUnitList.getAliveList(this.getMainList());
	},
	
	getAliveDefaultList: function() {
		return AllUnitList.getAliveDefaultList(this.getMainList());
	},
	
	getDeathList: function() {
		return AllUnitList.getDeathList(this.getMainList());
	},
	
	getMainList: function() {
		var obj;
		var session = root.getCurrentSession();
		
		if (session === null || typeof session.getAllyList === 'undefined') {
			obj = StructureBuilder.buildDataList();
			obj.setDataArray([]);
			return obj;
		}
		
		return session.getAllyList();
	}
};

var TurnControl = {
	turnEnd: function() {
		// イベントから呼ばれることがあるため、getCurrentSceneではなくgetBaseSceneを呼び出す
		if (root.getBaseScene() === SceneType.FREE) {
			if (root.getCurrentSession().getTurnType() === TurnType.PLAYER) {
				SceneManager.getActiveScene().getTurnObject().clearTurnTargetUnit();
			}
			
			SceneManager.getActiveScene().turnEnd();
		}
	},
	
	getActorList: function() {
		var list = null;
		var turnType = root.getCurrentSession().getTurnType();
		
		if (turnType === TurnType.PLAYER) {
			list = PlayerList.getSortieList();
		}
		else if (turnType === TurnType.ENEMY) {
			list = EnemyList.getAliveList();
		}
		else if (turnType === TurnType.ALLY) {
			list = AllyList.getAliveList();
		}
		
		return list;
	},
	
	getTargetList: function() {
		var list = null;
		var turnType = root.getCurrentSession().getTurnType();
		
		if (turnType === TurnType.PLAYER) {
			list = EnemyList.getAliveList();
		}
		else if (turnType === TurnType.ENEMY) {
			list = PlayerList.getSortieList();
		}
		else if (turnType === TurnType.ALLY) {
			list = EnemyList.getAliveList();
		}
		
		return list;
	}
};

var FilterControl = {
	getNormalFilter: function(unitType) {
		var filter = 0;
		
		if (unitType === UnitType.PLAYER) {
			filter = UnitFilterFlag.PLAYER;
		}
		else if (unitType === UnitType.ENEMY) {
			filter = UnitFilterFlag.ENEMY;
		}
		else if (unitType === UnitType.ALLY) {
			filter = UnitFilterFlag.ALLY;
		}
		
		return filter;
	},

	getReverseFilter: function(unitType) {
		var filter = 0;
		
		if (unitType === UnitType.PLAYER) {
			filter = UnitFilterFlag.ENEMY;
		}
		else if (unitType === UnitType.ENEMY) {
			filter = UnitFilterFlag.PLAYER | UnitFilterFlag.ALLY;
		}
		else if (unitType === UnitType.ALLY) {
			filter = UnitFilterFlag.ENEMY;
		}
		
		return filter;
	},
	
	getBestFilter: function(unitType, filterFlag) {
		var newFlag = 0;
		
		if (unitType === UnitType.ENEMY) {
			if (filterFlag & UnitFilterFlag.PLAYER) {
				newFlag |= UnitFilterFlag.ENEMY;
			}
			if (filterFlag & UnitFilterFlag.ENEMY) {
				newFlag |= UnitFilterFlag.PLAYER | UnitFilterFlag.ALLY;
			}
			
			filterFlag = newFlag;
		}
		
		return filterFlag;
	},
	
	getListArray: function(filter) {
		var listArray = [];
		
		if (filter & UnitFilterFlag.PLAYER) {
			listArray.push(PlayerList.getSortieList());
		}
		
		if (filter & UnitFilterFlag.ENEMY) {
			listArray.push(EnemyList.getAliveList());
		}
		
		if (filter & UnitFilterFlag.ALLY) {
			listArray.push(AllyList.getAliveList());
		}
		
		return listArray;
	},
	
	getAliveListArray: function(filter) {
		var listArray = [];
		
		if (filter & UnitFilterFlag.PLAYER) {
			listArray.push(PlayerList.getAliveList());
		}
		
		if (filter & UnitFilterFlag.ENEMY) {
			listArray.push(EnemyList.getAliveList());
		}
		
		if (filter & UnitFilterFlag.ALLY) {
			listArray.push(AllyList.getAliveList());
		}
		
		return listArray;	
	},
	
	getDeathListArray: function(filter) {
		var listArray = [];
		
		if (filter & UnitFilterFlag.PLAYER) {
			listArray.push(PlayerList.getDeathList());
		}
		
		if (filter & UnitFilterFlag.ENEMY) {
			listArray.push(EnemyList.getDeathList());
		}
		
		if (filter & UnitFilterFlag.ALLY) {
			listArray.push(AllyList.getDeathList());
		}
		
		return listArray;	
	},
	
	isUnitTypeAllowed: function(unit, targetUnit) {
		var unitType = unit.getUnitType();
		var targetUnitType = targetUnit.getUnitType();
		
		if (unitType === UnitType.PLAYER) {
			return targetUnitType === UnitType.PLAYER;
		}
		else if (unitType === UnitType.ENEMY) {
			return targetUnitType === UnitType.ENEMY;
		}
		else if (unitType === UnitType.ALLY) {
			return targetUnitType === UnitType.ALLY;
		}
		
		return false;
	},
	
	isReverseUnitTypeAllowed: function(unit, targetUnit) {
		var unitType = unit.getUnitType();
		var targetUnitType = targetUnit.getUnitType();
		
		if (unitType === UnitType.PLAYER) {
			return targetUnitType === UnitType.ENEMY;
		}
		else if (unitType === UnitType.ENEMY) {
			return targetUnitType === UnitType.PLAYER || targetUnitType === UnitType.ALLY;
		}
		else if (unitType === UnitType.ALLY) {
			return targetUnitType === UnitType.ENEMY;
		}
		
		return false;
	},
	
	isBestUnitTypeAllowed: function(unitType, targetUnitType, filterFlag) {
		filterFlag = this.getBestFilter(unitType, filterFlag);
		
		if ((filterFlag & UnitFilterFlag.PLAYER) && (targetUnitType === UnitType.PLAYER)) {
			return true;
		}
		
		if ((filterFlag & UnitFilterFlag.ALLY) && (targetUnitType === UnitType.ALLY)) {
			return true;
		}
		
		if ((filterFlag & UnitFilterFlag.ENEMY) && (targetUnitType === UnitType.ENEMY)) {
			return true;
		}
		
		return false;
	}
};

var SimulationBlockerControl = {
	isCustomFilterApplicable: function(unit) {
		var i, count;
		var arr = [];
		var groupArray = [];
		
		this._configureBlockerRule(arr);
		
		count = arr.length;
		for (i = 0; i < count; i++) {
			if (arr[i].isRuleApplicable(unit)) {
				// ルールが適応できるオブジェクトのみ別の配列にまとめる
				groupArray.push(arr[i]);
			}
		}
		
		if (groupArray.length > 0) {
			this._scanUnitList(unit, groupArray);
			return true;
		}
		
		return false;
	},
	
	// ScriptCall_GetSimulationFilterFlagでUnitFilterFlag.ENEMYを返せばすべての敵が壁になるが、
	// どの敵を壁にするかを個別に決めたいこともある。
	// この関数でUnitFilterFlag.OPTIONALを返せば、
	// UnitFilterFlag.OPTIONALが設定されたユニットだけ壁になる。
	getCustomFilter: function(unit) {
		return UnitFilterFlag.OPTIONAL;
	},
	
	getDefaultFilter: function(unit) {
		return FilterControl.getReverseFilter(unit.getUnitType());
	},
	
	_scanUnitList: function(unit, groupArray) {
		var i, j, count, list, targetUnit;
		var filter = this._getScanFilter(unit);
		var listArray = FilterControl.getListArray(filter);
		var listCount = listArray.length;
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count = list.getCount();
			for (j = 0; j < count; j++) {
				targetUnit = list.getData(j);
				if (unit === targetUnit) {
					continue;
				}
				
				if (this._isTargetBlocker(unit, targetUnit, groupArray)) {
					this._registerAsBlocker(unit, targetUnit, groupArray);
				}
			}
		}
	},
	
	_isTargetBlocker: function(unit, targetUnit, groupArray) {
		var i;
		var count = groupArray.length;
		
		for (i = 0; i < count; i++) {
			if (groupArray[i].isTargetBlocker(unit, targetUnit)) {
				return true;
			}
		}
		
		return false;
	},
	
	_registerAsBlocker: function(unit, targetUnit, groupArray) {
		// UnitFilterFlag.OPTIONALの設定によって、targetUnitは壁として登録される
		targetUnit.setOptionalFilterFlag(UnitFilterFlag.OPTIONAL);
	},
	
	_getScanFilter: function(unit) {
		return UnitFilterFlag.PLAYER | UnitFilterFlag.ENEMY | UnitFilterFlag.ALLY;
		
		// 仲間(自軍なら自軍と同盟軍)を壁にする予定がないなら、以下コードでよい。
		// この場合、敵対勢力のみスキャンの対象になり、_scanUnitListのループ文は短くなる。
		// isTargetBlockerが仲間かどうかの判定も不要になる。
		// return this.getDefaultFilter(unit);
	},
	
	_configureBlockerRule: function(groupArray) {
	}
};

var BlockerRule = {};

var BaseBlockerRule = defineObject(BaseObject,
{
	isRuleApplicable: function(unit) {
		// unitがターゲットを個別に壁とみなす能力をそもそも持っているかどうか
		return false;
	},
	
	isTargetBlocker: function(unit, targetUnit) {
		// ここでtrueを返すことは、targetUnitを壁として扱うことを意味する
		return false;
	}
}
);

var SimulationCostControl = {
	initCostObjectArray: function(unit) {
		var i, count, obj;
		var costObjectArray = [];
		var groupArray = [];
		
		this._configureCostRule(groupArray);
		
		count = groupArray.length;
		for (i = 0; i < count; i++) {
			obj = groupArray[i].getCostObject(unit);
			if (obj !== null) {
				costObjectArray.push(obj);
			}
		}
		
		return costObjectArray;
	},
	
	combineCostObjectArray: function(unit, costObjectArray) {
		var i, count, obj;
		var lastArray = [];
		
		count = costObjectArray.length;
		for (i = 0; i < count; i++) {
			// 同じkeyで識別されるコストは一つに統合する
			this._combineCost(lastArray, costObjectArray[i]);
		}
		
		count = lastArray.length;
		for (i = 0; i < count; i++) {
			obj = lastArray[i];
			
			// 統合を終えているので、トータルでどれだけコストが変化するか特定できる。
			// コストが上限を超えている場合は、上限内にとどめる。
			cost = this._getMaxCost(obj);
			if (obj.cost > cost) {
				obj.cost = cost;
			}
		}
		
		return lastArray;
	},
	
	_combineCost: function(lastArray, obj) {
		var i;
		var count = lastArray.length;
		
		for (i = 0; i < count; i++) {
			if (lastArray[i].key === obj.key) {
				lastArray[i].cost += obj.cost;
				break;
			}
		}
		
		if (i === count) {
			lastArray.push(obj)
		}
	},
	
	_getMaxCost: function(obj) {
		// 移動タイプ騎馬は、既定では山の移動コストは3である。
		// 2を許容すれば、移動コストは1まで下げれる。
		return 2;
	},
	
	_configureCostRule: function(groupArray) {
	}
};

var CostRule = {};

var BaseCostRule = defineObject(BaseObject,
{
	getCostObject: function(unit) {
		var obj = {};
		
		// MapSimulator内部が理解できるように、必ずこのフォーマットで返す
		obj.key = '';
		obj.cost = 1;
		
		return obj;
	}
}
);
