
// AIを作成するとは、BaseCombinationCollector、BaseAIScorer、
// BaseAutoActionの3つを継承したオブジェクトを作成することを意味する。
// たとえば、コマンド系スキルを使用するAIを組み込むために、
// CombinationCollector.Skill、AIScorer.Skill、SkillAutoActionが存在している。

var BaseCombinationCollector = defineObject(BaseObject,
{
	collectCombination: function(misc) {
	},
	
	_setUnitRangeCombination: function(misc, filter, rangeMetrics) {
		var i, j, indexArray, list, targetUnit, targetCount, score, combination, aggregation;
		var unit = misc.unit;
		var filterNew = this._arrangeFilter(unit, filter);
		var listArray = this._getTargetListArray(filterNew, misc);
		var listCount = listArray.length;
		
		if (misc.item !== null && !misc.item.isWeapon()) {
			aggregation = misc.item.getTargetAggregation();
		}
		else if (misc.skill !== null) {
			aggregation = misc.skill.getTargetAggregation();
		}
		else {
			aggregation = null;
		}
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			targetCount = list.getCount();
			for (j = 0; j < targetCount; j++) {
				targetUnit = list.getData(j);
				if (unit === targetUnit) {
					continue;
				}
				
				if (aggregation !== null && !aggregation.isCondition(targetUnit)) {
					continue;
				}
				
				score = this._checkTargetScore(unit, targetUnit);
				if (score < 0) {
					continue;
				}
				
				// targetUnit(自分ではなく相手)の現在位置をベースに、一連の範囲を計算する
				indexArray = IndexArray.createRangeIndexArray(targetUnit.getMapX(), targetUnit.getMapY(), rangeMetrics);
				
				misc.targetUnit = targetUnit;
				misc.indexArray = indexArray;
				misc.rangeMetrics = rangeMetrics;
				
				// 一連の範囲から、実際に移動できる位置を格納した配列を取得する
				misc.costArray = this._createCostArray(misc);
				
				if (misc.costArray.length !== 0) {
					// 移動できる位置があるため、組み合わせを作成する
					combination = this._createAndPushCombination(misc);
					combination.plusScore = score;
				}
			}
		}
	},
	
	_setPlaceRangeCombination: function(misc, filter, rangeMetrics) {
		var i, x, y, event, indexArray, combination, flag, placeInfo;
		var list = root.getCurrentSession().getPlaceEventList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			event = list.getData(i);
			if (event.getExecutedMark() === EventExecutedType.EXECUTED || !event.isEvent()) {
				continue;
			}
			
			placeInfo = event.getPlaceEventInfo();
			flag = placeInfo.getPlaceEventFilterFlag();
			if (!(flag & filter)) {
				continue;
			}
			
			x = placeInfo.getX();
			y = placeInfo.getY();
			indexArray = IndexArray.createRangeIndexArray(x, y, rangeMetrics);
			
			misc.targetUnit = null;
			misc.indexArray = indexArray;
			misc.rangeMetrics = rangeMetrics;
			
			misc.costArray = this._createCostArray(misc);
			if (misc.costArray.length !== 0) {
				// 移動できる位置があるため、組み合わせを作成する
				combination = this._createAndPushCombination(misc);
				combination.targetPos = createPos(x, y);
				// 場所イベントは優先的に狙うようにする
				combination.isPriority = true;
			}
		}
	},
	
	_setSingleRangeCombination: function(misc) {
		var aggregation;
		
		if (misc.item !== null && !misc.item.isWeapon()) {
			aggregation = misc.item.getTargetAggregation();
		}
		else if (misc.skill !== null) {
			aggregation = misc.skill.getTargetAggregation();
		}
		else {
			aggregation = null;
		}
		
		// 単体のアイテムに「有効相手」が設定されている場合、自分自身に使用してよいか判定する
		if (aggregation !== null && !aggregation.isCondition(misc.unit)) {
			return;
		}
		
		misc.targetUnit = misc.unit;
		misc.indexArray = misc.simulator.getSimulationIndexArray();
		misc.rangeMetrics = StructureBuilder.buildRangeMetrics();
		misc.costArray = this._createCostArray(misc);
		this._createAndPushCombination(misc);
	},
	
	_setPlaceKeyCombination: function(misc, obj, keyFlag) {
		var rangeMetrics, rangeValueGate, rangeTypeGate, rangeValueTreasure, rangeTypeTreasure;
		
		if (KeyEventChecker.isPairKey(obj)) {
			rangeValueGate = 1;
			rangeTypeGate = SelectionRangeType.MULTI;
			rangeValueTreasure = 0;
			rangeTypeTreasure = SelectionRangeType.SELFONLY;
		}
		else {
			rangeValueGate = obj.getRangeValue();
			rangeTypeGate = obj.getRangeType();
			rangeValueTreasure = obj.getRangeValue();
			rangeTypeTreasure = obj.getRangeType();
		}
		
		if (keyFlag & KeyFlag.GATE) {
			rangeMetrics = StructureBuilder.buildRangeMetrics();
			rangeMetrics.endRange = rangeValueGate;
			rangeMetrics.rangeType = rangeTypeGate;
			this._setPlaceRangeCombination(misc, PlaceEventFilterFlag.GATE, rangeMetrics);
		}
		
		if (keyFlag & KeyFlag.TREASURE) {
			rangeMetrics = StructureBuilder.buildRangeMetrics();
			rangeMetrics.endRange = rangeValueTreasure;
			rangeMetrics.rangeType = rangeTypeTreasure;
			this._setPlaceRangeCombination(misc, PlaceEventFilterFlag.TREASURE, rangeMetrics);
		}
	},
	
	_getTargetListArray: function(filter, misc) {
		var i, unit, arr, count, flag, list;
		
		if (misc.blockList === null) {
			return FilterControl.getListArray(filter);
		}
		
		arr = [];
		count = misc.blockList.getCount();
		for (i = 0; i < count; i++) {
			unit = misc.blockList.getData(i);
			flag = FilterControl.getNormalFilter(unit.getUnitType());
			if (flag & filter) {
				arr.push(unit);
			}
		}
		
		list = StructureBuilder.buildDataList();
		list.setDataArray(arr);
		
		return [list];
	},
	
	_arrangeFilter: function(unit, filter) {
		// 「暴走」ステートの場合は、相手が逆になる
		if (!StateControl.isBadStateOption(unit, BadStateOption.BERSERK)) {
			return filter;
		}
		
		if (filter & UnitFilterFlag.PLAYER) {
			filter = UnitFilterFlag.ENEMY;
		}
		else if (filter & UnitFilterFlag.ENEMY) {
			filter = UnitFilterFlag.PLAYER | UnitFilterFlag.ALLY;
		}
		else if (filter & UnitFilterFlag.ALLY) {
			filter = UnitFilterFlag.ENEMY;
		}
		
		return filter;
	},
	
	_createCostArray: function(misc) {
		var i;
		var simulator = misc.simulator;
		var count = misc.indexArray.length;
		
		misc.costArray = [];
			
		if (count === CurrentMap.getSize()) {
			count = simulator.getLoopCount();
			for (i = 0; i < count; i++) {
				misc.posIndex = simulator.getPosIndexFromLoopIndex(i);
				misc.movePoint = simulator.getMovePointFromLoopIndex(i);
				this._createCostArrayInternal(misc);
			}
		}
		else {
			for (i = 0; i < count; i++) {
				misc.posIndex = misc.indexArray[i];
				misc.movePoint = simulator.getSimulationMovePoint(misc.posIndex);
				this._createCostArrayInternal(misc);
			}
		}
		
		return misc.costArray;
	},
	
	_createCostArrayInternal: function(misc) {
		var x, y, posUnit;
		var posIndex = misc.posIndex;
		var movePoint = misc.movePoint;
		
		if (movePoint === AIValue.MAX_MOVE) {
			return;
		}
		
		x = CurrentMap.getX(posIndex);
		y = CurrentMap.getY(posIndex);
		if (misc.isForce) {
			this._createAndPushCost(misc);
		}
		else {
			// その位置には同軍のユニットが存在している可能性がある(同軍は通行可能として処理されている)。
			// よって、自分でないユニットが存在していないかを調べる。
			posUnit = PosChecker.getUnitFromPos(x, y);
			if (posUnit === null || posUnit === misc.unit) {
				// この位置には移動できるということで、コストを作成する。
				// コストには、移動できる位置と移動するために必要な歩数が含まれる。
				this._createAndPushCost(misc);
			}
			else {
				this._createAndPushCostUnused(misc);
			}
		}
	},
	
	_createAndPushCost: function(misc) {
		var costData = StructureBuilder.buildCostData();
		
		costData.posIndex = misc.posIndex;
		costData.movePoint = misc.movePoint;
		misc.costArray.push(costData);
	},
	
	_createAndPushCostUnused: function(misc) {
		var costData = StructureBuilder.buildCostData();
		
		costData.posIndex = misc.posIndex;
		costData.movePoint = misc.movePoint;
		misc.costArrayUnused.push(costData);
	},
	
	_createAndPushCombination: function(misc) {
		var item = misc.item;
		var skill = misc.skill;
		var targetUnit = misc.targetUnit;
		var combination = StructureBuilder.buildCombination();
		
		if (misc.isForce) {
			item = null;
			skill = null;
			targetUnit = null;
		}
		
		// どのアイテムで行動を起こすか
		combination.item = item;
		
		// どのスキルで行動を起こすか
		combination.skill = skill;
		
		// どのユニットに対して行動(たとえば、攻撃や回復)を起こすか
		combination.targetUnit = targetUnit;
		
		// どの位置を使用するか(たとえば、アイテムの使用位置)
		combination.targetPos = null;
		
		combination.rangeMetrics = misc.rangeMetrics;
		
		// コストを格納する配列
		combination.costArray = misc.costArray;
		
		// どの経路を通って目標地点に向かうか
		combination.cource = [];
		
		// 次の2つの正確な値は、CombinationSelectorオブジェクトで決定される。
		// この時点で決定できないため、ダミーとして0を代入している。
		
		// どの位置で行動を起こすか
		combination.posIndex = 0;
		
		// posIndexの位置に移動するためにどれだけの歩数が必要か
		combination.movePoint = 0;
		
		combination.simulator = misc.simulator;
		
		misc.combinationArray.push(combination);
		
		return combination;
	},
	
	_checkTargetScore: function(unit, targetUnit) {
		var score = 0;
		var pattern = unit.getAIPattern();
		var type = pattern.getLockonType();
		var isCondition = pattern.isUnitCondition(targetUnit) || pattern.isDataCondition(targetUnit);
		
		if (type === LockonType.INCLUDE) {
			if (isCondition) {
				return 1000;
			}
			
			score = -1;
		}
		else if (type === LockonType.PRIORITY) {
			if (isCondition) {
				return 700;
			}
		}
		else if (type === LockonType.EXCLUDE) {
			if (isCondition) {
				return -1;
			}
		}
		
		return score;
	}
}
);

var CombinationCollector = {};

CombinationCollector.Weapon = defineObject(BaseCombinationCollector,
{
	collectCombination: function(misc) {
		var i, weapon, filter, rangeMetrics;
		var unit = misc.unit;
		var itemCount = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < itemCount; i++) {
			weapon = UnitItemControl.getItem(unit, i);
			if (weapon === null) {
				continue;
			}
			
			// 武器でないか、武器を装備できない場合は続行しない
			if (!weapon.isWeapon() || !this._isWeaponEnabled(unit, weapon, misc)) {
				continue;
			}
			
			misc.item = weapon;
			
			rangeMetrics = StructureBuilder.buildRangeMetrics();
			rangeMetrics.startRange = weapon.getStartRange();
			rangeMetrics.endRange = weapon.getEndRange();
			
			filter = this._getWeaponFilter(unit);
			this._checkSimulator(misc);
			this._setUnitRangeCombination(misc, filter, rangeMetrics);
		}
	},
	
	_checkSimulator: function(misc) {
	},
	
	_getWeaponFilter: function(unit) {
		return FilterControl.getReverseFilter(unit.getUnitType());
	},
	
	_isWeaponEnabled: function(unit, item, misc) {
		if (misc.disableFlag & AIDisableFlag.WEAPON) {
			return false;
		}
		
		return ItemControl.isWeaponAvailable(unit, item);
	}
}
);

CombinationCollector.Item = defineObject(BaseCombinationCollector,
{
	collectCombination: function(misc) {
		var i, item, filter, obj, actionTargetType;
		var unit = misc.unit;
		var itemCount = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < itemCount; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item === null) {
				continue;
			}
			
			// アイテムでないか、アイテムを使用できない場合は続行しない
			if (item.isWeapon() || !this._isItemEnabled(unit, item, misc)) {
				continue;
			}
			
			obj = ItemPackageControl.getItemAIObject(item);
			if (obj === null) {
				continue;
			}
			
			// アイテムを何に対して使用するかは、アイテムによって異なる。
			// 回復アイテムは特定のユニットであるが、鍵の場合は特定の場所になる。
			actionTargetType = obj.getActionTargetType(unit, item);
			
			misc.item = item;
			misc.actionTargetType = actionTargetType;
			
			this._setCombination(misc);
		}
	},
	
	_setCombination: function(misc) {
		var actionTargetType = misc.actionTargetType;
		
		if (actionTargetType === ActionTargetType.UNIT) {
			this._setUnitCombination(misc);
		}
		else if (actionTargetType === ActionTargetType.SINGLE) {
			this._setSingleRangeCombination(misc);
		}
		else if (actionTargetType === ActionTargetType.KEY) {
			this._setKeyCombination(misc);
		}
		else if (actionTargetType === ActionTargetType.ENTIRERECOVERY) {
			this._setEntireRecoveryCombination(misc);
		}
		else if (actionTargetType === ActionTargetType.RESURRECTION) {
			this._setResurrectionCombination(misc);
		}
	},
	
	_setUnitCombination: function(misc) {
		var filter, rangeValue, rangeType, rangeMetrics;
		var unit = misc.unit;
		var item = misc.item;
		var obj = ItemPackageControl.getItemAIObject(item);
		
		if (obj === null) {
			return;
		}
		
		filter = obj.getUnitFilter(unit, item);
		
		obj = this._getRangeObjectInternal(item);
		
		rangeMetrics = StructureBuilder.buildRangeMetrics();
		rangeMetrics.endRange = obj.rangeValue;
		rangeMetrics.rangeType = obj.rangeType;
			
		this._setUnitRangeCombination(misc, filter, rangeMetrics);
	},
	
	_setKeyCombination: function(misc) {
		this._setPlaceKeyCombination(misc, misc.item, misc.item.getKeyInfo().getKeyFlag());
	},
	
	_setEntireRecoveryCombination: function(misc) {
		misc.targetUnit = null;
		
		misc.indexArray = misc.simulator.getSimulationIndexArray();
		misc.rangeMetrics = StructureBuilder.buildRangeMetrics();
		misc.costArray = this._createCostArray(misc);
		this._createAndPushCombination(misc);
	},
	
	_setResurrectionCombination: function(misc) {
		var i, targetUnit, indexArray, score, combination;
		var arr = ResurrectionControl.getTargetArray(misc.unit, misc.item);
		var count = arr.length;
		
		for (i = 0; i < count; i++) {
			targetUnit = arr[i];
			if (misc.unit === targetUnit) {
				continue;
			}
			
			score = this._checkTargetScore(misc.unit, targetUnit);
			if (score < 0) {
				continue;
			}
			
			indexArray = misc.simulator.getSimulationIndexArray();
			
			misc.indexArray = indexArray;
			misc.targetUnit = targetUnit;
			misc.costArray = this._createCostArray(misc);
			combination = this._createAndPushCombination(misc);
			combination.plusScore = score;
		}
	},
	
	_isItemEnabled: function(unit, item, misc) {
		if (misc.disableFlag & AIDisableFlag.ITEM) {
			return false;
		}
		
		// AI時では、ItemPackageControl.getItemAvailabilityObjectを使用しない
		return ItemControl.isItemUsable(unit, item);
	},
	
	_getRangeObjectInternal: function(item) {
		var obj = ItemRangeControl.getRangeObject(item);
		
		if (item.getItemType() === ItemType.QUICK && obj.rangeType === SelectionRangeType.SELFONLY) {
			// 行動回復AIにおいては、単体設定されている場合でも、射程1として扱う。
			obj.rangeValue = 1;
			obj.rangeType = SelectionRangeType.MULTI;
		}
		
		return obj;
	}
}
);

CombinationCollector.Skill = defineObject(BaseCombinationCollector,
{
	collectCombination: function(misc) {
		var i, skillEntry, skill;
		var unit = misc.unit;
		var arr = SkillControl.getSkillMixArray(unit, null, -1, '');
		var count = arr.length;
		
		// arrに武器スキルは含まれない
		for (i = 0; i < count; i++) {
			skillEntry = arr[i];
			if (!this._isSkillEnabled(unit, skillEntry.skill, misc)) {
				continue;
			}
			
			misc.skill = skillEntry.skill;
			this._setCombination(misc);
		}
	},
	
	_setCombination: function(misc) {
		var skillType = misc.skill.getSkillType();
		
		if (skillType === SkillType.STEAL) {
			this._setStealCombination(misc);
		}
		else if (skillType === SkillType.QUICK) {
			this._setQuickCombination(misc);
		}
		else if (skillType === SkillType.PICKING) {
			this._setPickingCombination(misc);
		}
		else if (skillType === SkillType.METAMORPHOZE) {
			this._setMetamorphozeCombination(misc);
		}
	},
	
	_setStealCombination: function(misc) {
		var filter = FilterControl.getReverseFilter(misc.unit.getUnitType());
		
		this._setUnitCombination(misc, filter);
	},
	
	_setQuickCombination: function(misc) {
		var filter = FilterControl.getNormalFilter(misc.unit.getUnitType());
		
		this._setUnitCombination(misc, filter);
	},
	
	_setPickingCombination: function(misc) {
		this._setPlaceKeyCombination(misc, misc.skill, misc.skill.getSkillValue());
	},
	
	_setMetamorphozeCombination: function(misc) {
		this._setSingleRangeCombination(misc);
	},
	
	_setUnitCombination: function(misc, filter) {
		var rangeMetrics;
		var skill = misc.skill;
		
		rangeMetrics = StructureBuilder.buildRangeMetrics();
		rangeMetrics.endRange = skill.getRangeValue();
		rangeMetrics.rangeType = skill.getRangeType();
			
		this._setUnitRangeCombination(misc, filter, rangeMetrics);
	},
	
	_isSkillEnabled: function(unit, skill, misc) {
		if (misc.disableFlag & AIDisableFlag.SKILL) {
			return false;
		}
		
		return true;
	}
}
);


//------------------------------------------------------


// 敵ターンで動作する敵ユニットと、そのユニットが持つ支援情報をテーブルに記録する
var AIFirstStage_UnitSupportStatusTable = {
	_table: [],
	
	resetTable: function() {
		this._table = [];
	},
	
	registerUnit: function(unit) {
		var i;
		var length = this._table.length;
		
		// そもそも、あらゆる敵AIは、自分自身に与えられている支援を考慮するかどうか
		if (!this._isSupportStatusAllowed()) {
			return;
		}
		
		// この敵ユニットは、自分自身に与えられている支援を考慮するかどうか
		if (!this._isUnitAllowed(unit)) {
			return;
		}
		
		for (i = 0; i < length; i++) {
			if (this._table[i].unit === unit) {
				break;
			}
		}
		
		if (i === length) {
			var obj = {};
			obj.unit = unit;
			obj.totalStatus = this._createStatus(unit);
			this._table.push(obj);
		}
	},
	
	getTotalStatus: function(unit) {
		var i;
		var status = null;
		var length = this._table.length;
		
		for (i = 0; i < length; i++) {
			if (this._table[i].unit === unit) {
				status = this._table[i].totalStatus;
				break;
			}
		}
		
		return status;
	},
	
	getAvoidScore: function(unit) {
		var i, count, obj;
		var score = 0;
		var totalStatus = this.getTotalStatus(unit);
		
		if (totalStatus === null) {
			return score;
		}
		
		count = totalStatus.avoidArray.length;
		for (i = 0; i < count; i++) {
			obj = totalStatus.avoidArray[i];
			if (IndexArray.findUnit(obj.indexArray, unit)) {
				score = obj.avoid;
			}
		}
		
		return score;
	},
	
	_createStatus: function(unit) {
		var totalStatus = {};
		
		totalStatus.powerTotal = 0;
		totalStatus.defenseTotal = 0;
		totalStatus.hitTotal = 0;
		totalStatus.avoidTotal = 0;
		totalStatus.criticalTotal = 0;
		totalStatus.criticalAvoidTotal = 0;
		totalStatus.avoidArray = [];
		
		// 自身を対象にした支援スキルを所持している可能性
		this._checkSelfSupportSkill(unit, totalStatus);
		
		// 仲間(敵軍)の中に支援スキル(全体)を所持している可能性
		this._checkFriendSupportSkill(unit, totalStatus);
		
		return totalStatus;
	},
	
	_checkSelfSupportSkill: function(unit, totalStatus) {
		var i, skill;
		var temporaryWeapon = UnitItemControl.getItem(unit, 0);
		var arr = SkillControl.getSkillMixArray(unit, temporaryWeapon, SkillType.SUPPORT, '');
		var count = arr.length;
		
		for (i = 0; i < count; i++) {
			skill = arr[i].skill;
			if (skill.getRangeType() === SelectionRangeType.SELFONLY) {
				this._addStatus(totalStatus, skill.getSupportStatus());
			}
		}
	},
	
	_checkFriendSupportSkill: function(unit, totalStatus) {
		var i, j, list, count, targetUnit;
		var listArray = SupportCalculator._getListArray(unit);
		var listCount = listArray.length;
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count = list.getCount();
			for (j = 0; j < count; j++) {
				targetUnit = list.getData(j);
				if (unit === targetUnit) {
					continue;
				}
				this._checkFriendSupportSkillInternal(targetUnit, unit, totalStatus);
			}
		}
	},
	
	_checkFriendSupportSkillInternal: function(unit, targetUnit, totalStatus) {
		var i, skill, isSet, indexArray, rangeType;
		var arr = SkillControl.getDirectSkillArray(unit, SkillType.SUPPORT, '');
		var count = arr.length;
		
		for (i = 0; i < count; i++) {
			skill = arr[i].skill;
			isSet = false;
			indexArray = [];
			
			rangeType = skill.getRangeType();
			if (rangeType === SelectionRangeType.ALL) {
				isSet = true;
			}
			else if (rangeType === SelectionRangeType.MULTI) {
				indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, skill.getRangeValue());
				isSet = IndexArray.findUnit(indexArray, targetUnit);
			}
			
			if (isSet && SupportCalculator._isSupportable(unit, targetUnit, skill)) {
				this._addAvoidArray(totalStatus, skill, indexArray);
				this._addStatus(totalStatus, skill.getSupportStatus());
			}
		}
	},
	
	_addAvoidArray: function(totalStatus, skill, indexArray) {
		var supportStatus, avoid, obj;
		
		if (indexArray.length === 0) {
			return;
		}
		
		supportStatus = skill.getSupportStatus();
		avoid = supportStatus.getAvoid();
		if (avoid === 0) {
			return;
		}
		
		obj = {};
		obj.indexArray = indexArray;
		obj.avoid = avoid;
		
		totalStatus.avoidArray.push(obj);
	},
	
	_addStatus: function(totalStatus, supportStatus) {
		totalStatus.powerTotal += supportStatus.getPower();
		totalStatus.defenseTotal += supportStatus.getDefense();
		totalStatus.hitTotal += supportStatus.getHit();
		totalStatus.avoidTotal += supportStatus.getAvoid();
		totalStatus.criticalTotal += supportStatus.getCritical();
		totalStatus.criticalAvoidTotal += supportStatus.getCriticalAvoid();
	},
	
	_isSupportStatusAllowed: function() {
		// falseを返せば、支援判定処理がなくなるので高速になる
		return DataConfig.isAISupportStatusAllowed();
	},
	
	_isUnitAllowed: function(unit) {
		return true;
	}
};

// 敵ターン時に存在するターゲット(自軍と同盟軍)及び、そのターゲットが持つ支援情報をテーブルに記録する。
// ターゲットAがターゲットBの支援を受ける場合、ターゲットBが撃破されたならば、
// ターゲットAが受け取る支援情報は変化するべきだが、その点は許容している。
var AIFirstStage_TargetUnitSupportStatusTable = {
	_table: [],
	
	resetTable: function() {
		this._table = [];
	},
	
	registerUnit: function(targetUnit) {
		var i;
		var length = this._table.length;
		
		// そもそも、敵AIがターゲットの支援を考慮するかどうか
		if (!this._isSupportStatusAllowed()) {
			return;
		}
		
		// このターゲットの支援を考慮するかどうか
		if (!this._isUnitAllowed(targetUnit)) {
			return;
		}
		
		for (i = 0; i < length; i++) {
			if (this._table[i].targetUnit === targetUnit) {
				break;
			}
		}
		
		if (i === length) {
			var obj = {};
			obj.targetUnit = targetUnit;
			obj.totalStatus = this._createStatus(targetUnit);
			this._table.push(obj);
		}
	},
	
	getTotalStatus: function(targetUnit) {
		var i;
		var status = null;
		var length = this._table.length;
		
		for (i = 0; i < length; i++) {
			if (this._table[i].targetUnit === targetUnit) {
				status = this._table[i].totalStatus;
				break;
			}
		}
		
		return status;
	},
	
	_createStatus: function(targetUnit) {
		// 敵ターンにおいて、当然ながらターゲット(自軍と同盟軍)は、今いる場所を移動しないので、この呼び出しでよい
		return SupportCalculator.createTotalStatus(targetUnit);
	},
	
	_isSupportStatusAllowed: function() {
		// falseを返せば、支援判定処理がなくなるので高速になる
		return DataConfig.isAISupportStatusAllowed();
	},
	
	_isUnitAllowed: function(targetUnit) {
		// 同盟軍には基本的に支援が設定されていないので無視する
		return targetUnit.getUnitType() === UnitType.PLAYER;
	}
};


//------------------------------------------------------


var BaseAIScorer = defineObject(BaseObject,
{
	getScore: function(unit, combination) {
		return 0;
	},
	
	_getPlusScore: function(unit, combination) {
		return combination.plusScore;
	}
}
);

var AIScorer = {};

// 以下、第1ステージの処理を行うオブジェクトになる。
// この段階では、posIndexとmovePointが設定されていないため、参照してはならない。
AIScorer.Weapon = defineObject(BaseAIScorer,
{
	getScore: function(unit, combination) {
		var prevItemIndex;
		var score = 0;
		
		if (combination.item === null || !combination.item.isWeapon()) {
			return 0;
		}
		
		// combination.itemを一時的に装備する
		prevItemIndex = this._setTemporaryWeapon(unit, combination);
		if (prevItemIndex === -1) {
			return 0;
		}
		
		if (this._isScoreCalculationDisabled(unit, combination)) {
			this._resetTemporaryWeapon(unit, combination, prevItemIndex);
			// 具体的なスコア(ダメージや命中率)を算出する以前に、
			// そもそもcombination.targetUnitに攻撃するべきではないと判断した場合、処理を終了する。
			return -1;
		}
		
		AIFirstStage_UnitSupportStatusTable.registerUnit(unit);
		AIFirstStage_TargetUnitSupportStatusTable.registerUnit(combination.targetUnit);
		
		score = this._getTotalScore(unit, combination);
		
		// combination.itemの装備を解除する
		this._resetTemporaryWeapon(unit, combination, prevItemIndex);
		
		if (score < 0) {
			return -1;
		}
		
		return score + this._getPlusScore(unit, combination);
	},
	
	_isScoreCalculationDisabled: function(unit, combination) {
		return false;
	},
	
	_getTotalScore: function(unit, combination) {
		var n;
		var score = 0;
		
		n = this._getDamageScore(unit, combination);
		if (n === 0 && !DataConfig.isAIDamageZeroAllowed()) {
			return -1;
		}
		score += n;
		
		n = this._getHitScore(unit, combination);
		if (n === 0 && !DataConfig.isAIHitZeroAllowed()) {
			return -1;
		}
		score += n;
		
		score += this._getCriticalScore(unit, combination);
		score += this._getStateScore(unit, combination);
		
		// 与えれるダメージが7、命中率が80、クリティカル確率が10の場合、
		// 42 (7 * 6) 6はMiscellaneous.convertAIValue
		// 16 (80 / 5)
		// 2 (10 / 5)
		// 合計60のscoreになる
		
		return score;
	},
	
	_getDamageScore: function(unit, combination) {
		var damage;
		var score = 0;
		var hp = combination.targetUnit.getHp();
		var isDeath = false;
		
		damage = this._getDamage(unit, combination);
		
		hp -= damage;
		if (hp <= 0) {
			isDeath = true;
		}
		
		score = Miscellaneous.convertAIValue(damage);
		
		// ターゲットを倒せる場合は、スコアを大きく加算する
		if (isDeath) {
			score += 50;
		}
		else {
			// HPの減りが強いターゲットは優先して狙われる。10は基準スコア
			score += Math.floor(10 * (1 - (hp / ParamBonus.getMhp(combination.targetUnit))));
		}
		
		return score;
	},
	
	_getDamage: function(unit, combination) {
		var damage, roundAttackCount;
		var option = combination.item.getWeaponOption();
		
		if (option === WeaponOption.HPMINIMUM) {
			return combination.targetUnit.getHp() - 1;
		}
		
		damage = DamageCalculator.calculateDamage(unit, combination.targetUnit, combination.item, false, this._getSupportStatus(unit), this._getTargetSupportStatus(combination.targetUnit), 0);
		
		roundAttackCount = Calculator.calculateRoundCount(unit, combination.targetUnit, combination.item);
		roundAttackCount *= Calculator.calculateAttackCount(unit, combination.targetUnit, combination.item);
		damage *= roundAttackCount;
		
		return damage;
	},
	
	_getHitScore: function(unit, combination) {
		var hit = HitCalculator.calculateHit(unit, combination.targetUnit, combination.item, this._getSupportStatus(unit), this._getTargetSupportStatus(combination.targetUnit));
		
		if (hit === 0) {
			return 0;
		}
		
		// 命中率を優先する場合は数値を下げる
		return Math.ceil(hit / 5);
	},
	
	_getCriticalScore: function(unit, combination) {
		var crt = CriticalCalculator.calculateCritical(unit, combination.targetUnit, combination.item, this._getSupportStatus(unit), this._getTargetSupportStatus(combination.targetUnit));
		
		if (crt === 0) {
			return 0;
		}
		
		return Math.ceil(crt / 5);
	},
	
	_getStateScore: function(unit, combination) {
		var state = combination.item.getStateInvocation().getState();
		
		if (state === null) {
			return 0;
		}
		
		score = StateScoreChecker.getScore(unit, combination.targetUnit, state);
		if (score < 0) {
			// ステートに耐性がある場合はscoreは-1が返るが、0を返す
			return 0;
		}
		
		return score;
	},
	
	_setTemporaryWeapon: function(unit, combination) {
		var itemHead = UnitItemControl.getItem(unit, 0);
		var prevItemIndex = UnitItemControl.getIndexFromItem(unit, combination.item);
		
		UnitItemControl.setItem(unit, 0, combination.item);
		UnitItemControl.setItem(unit, prevItemIndex, itemHead);
		
		return prevItemIndex;
	},
	
	_resetTemporaryWeapon: function(unit, combination, prevItemIndex) {
		var itemHead = UnitItemControl.getItem(unit, 0);
		var item = UnitItemControl.getItem(unit, prevItemIndex);
		
		UnitItemControl.setItem(unit, prevItemIndex, itemHead);
		UnitItemControl.setItem(unit, 0, item);
	},
	
	_getSupportStatus: function(unit) {
		return AIFirstStage_UnitSupportStatusTable.getTotalStatus(unit);
	},
	
	_getTargetSupportStatus: function(targetUnit) {
		return AIFirstStage_TargetUnitSupportStatusTable.getTotalStatus(targetUnit);
	}
}
);

AIScorer.Item = defineObject(BaseAIScorer,
{
	getScore: function(unit, combination) {
		var obj;
		var item = combination.item;
		var score = 0;
		
		if (item === null || item.isWeapon()) {
			return score;
		}
		
		obj = ItemPackageControl.getItemAIObject(item);
		if (obj === null) {
			return score;
		}
		
		score = obj.getItemScore(unit, combination);
		if (score < 0) {
			return -1;
		}
		
		return score + this._getPlusScore(unit, combination);
	}
}
);

AIScorer.Skill = defineObject(BaseAIScorer,
{
	getScore: function(unit, combination) {
		var obj;
		var skill = combination.skill;
		var score = 0;
		
		if (skill === null) {
			return score;
		}
		
		obj = this._getAIObject(unit, combination);
		if (obj === null) {
			return score;
		}
		
		score = obj.getItemScore(unit, combination);
		if (score < 0) {
			return -1;
		}
		
		return score + this._getPlusScore(unit, combination);
	},
	
	_getAIObject: function(unit, combination) {
		var obj;
		var skillType = combination.skill.getSkillType();
		
		if (skillType === SkillType.STEAL) {
			obj = StealItemAI;
		}
		else if (skillType === SkillType.QUICK) {
			obj = QuickItemAI;
		}
		else if (skillType === SkillType.PICKING) {
			obj = KeyItemAI;
		}
		else if (skillType === SkillType.METAMORPHOZE) {
			obj = MetamorphozeItemAI;
		}
		else {
			obj = null;
		}
		
		return createObject(obj);
	}
}
);

// 以下、第2ステージの処理を行うオブジェクトになる。
// これらのオブジェクトでは、posIndexとmovePointを参照しても問題ない。
// 第1ステージの時点で攻撃すべき相手は既に決まっているため、
// 第2ステージで相手を変更することはできない点に注意。
// たとえば、AIScorer.Counterattackでは、なるべく反撃を受けない位置から攻撃するようにはできるが、
// 反撃できないことを条件に相手を決定するようなことはできない。
// つまり、getScoreで高い値を返して反撃考慮の優先度を上げたとしても、
// 反撃を食らう相手(第1ステージで決定済み)を狙うことはある。

AIScorer.Counterattack = defineObject(BaseAIScorer,
{
	getScore: function(unit, combination) {
		var index, x, y;
		var score = 50;
		
		if (combination.item === null) {
			return 0;
		}
		
		if (!combination.item.isWeapon()) {
			// unitは武器ではなくアイテムで攻撃するから反撃を食らう可能性はない。
			// よって、その分の利点としてscoreを加算する。
			return score;
		}
		else {
			index = combination.posIndex;
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			
			if (AttackChecker.isCounterattackPos(unit, combination.targetUnit, x, y)) {
				// unitはtargetUnitからの反撃を食らう可能性があるため、scoreは加算しない
				return 0;
			}
			
			return score;
		}	
	}
}
);

AIScorer.Avoid = defineObject(BaseAIScorer,
{
	getScore: function(unit, combination) {
		var score;
		var x = unit.getMapX();
		var y = unit.getMapY();
		var index = combination.posIndex;
		
		// ユニットの現在位置を一時的に変更する
		unit.setMapX(CurrentMap.getX(index));
		unit.setMapY(CurrentMap.getY(index));
		
		// 回避率がscoreになるため、有利な地形に移動する傾向がある
		score = this._getBaseScore(unit, combination);
		
		// ユニットの仲間に指定範囲の支援を持つユニットがいたとすれば、その範囲が届く位置で戦う場合はスコアを加算する
		score += this._plusScore(unit, combination);
		
		// scoreがマイナスになると行動しなくなるため対策する
		if (score < 0) {
			score = 0;
		}
		
		unit.setMapX(x);
		unit.setMapY(y);
		
		return score;
	},
	
	_getBaseScore: function(unit, combination) {
		return AbilityCalculator.getAvoid(unit);
	},
	
	_plusScore: function(unit, combination) {
		return AIFirstStage_UnitSupportStatusTable.getAvoidScore(unit);
	}
}
);


//------------------------------------------------------


var BaseAutoAction = defineObject(BaseObject,
{
	setAutoActionInfo: function(unit, combination) {
	},
	
	enterAutoAction: function() {
		return EnterResult.NOTENTER;
	},
	
	moveAutoAction: function() {
		return MoveResult.END;
	},
	
	drawAutoAction: function() {
	},
	
	isSkipMode: function() {
		return CurrentMap.isTurnSkipMode();
	},
	
	isSkipAllowed: function() {
		return true;
	}
}
);

var WeaponAutoActionMode = {
	CURSORSHOW: 0,
	PREATTACK: 1
};

var WeaponAutoAction = defineObject(BaseAutoAction,
{
	_unit: null,
	_targetUnit: null,
	_weapon: null,
	_preAttack: null,
	_autoActionCursor: null,
	
	setAutoActionInfo: function(unit, combination) {
		this._unit = unit;
		this._targetUnit = combination.targetUnit;
		this._weapon = combination.item;
		this._preAttack = createObject(PreAttack);
		this._waitCounter = createObject(CycleCounter);
		this._autoActionCursor = createObject(AutoActionCursor);
		
		ItemControl.setEquippedWeapon(this._unit, this._weapon);
	},
	
	enterAutoAction: function() {
		var isSkipMode = this.isSkipMode();
		
		if (isSkipMode) {
			if (this._enterAttack() === EnterResult.NOTENTER) {
				return EnterResult.NOTENTER;
			}
			
			this.changeCycleMode(WeaponAutoActionMode.PREATTACK);
		}
		else {
			this._changeCursorShow();
			this.changeCycleMode(WeaponAutoActionMode.CURSORSHOW);
		}
		
		return EnterResult.OK;
	},
	
	moveAutoAction: function() {
		var result = MoveResult.CONTINUE;
		var mode = this.getCycleMode();
		
		if (mode === WeaponAutoActionMode.CURSORSHOW) {
			result = this._moveCursorShow();
		}
		else if (mode === WeaponAutoActionMode.PREATTACK) {
			result = this._movePreAttack();
		}
		
		return result;
	},
	
	drawAutoAction: function() {
		var mode = this.getCycleMode();
		
		if (mode === WeaponAutoActionMode.CURSORSHOW) {
			this._drawCurosrShow();
		}
		else if (mode === WeaponAutoActionMode.PREATTACK) {
			this._drawPreAttack();
		}
	},
	
	isSkipAllowed: function() {
		var mode = this.getCycleMode();
		
		if (mode === WeaponAutoActionMode.PREATTACK) {
			return false;
		}
	
		return true;
	},
	
	_moveCursorShow: function() {
		var isSkipMode = this.isSkipMode();
		
		if (isSkipMode || this._autoActionCursor.moveAutoActionCursor() !== MoveResult.CONTINUE) {
			if (isSkipMode) {
				this._autoActionCursor.endAutoActionCursor();
			}
			
			if (this._enterAttack() === EnterResult.NOTENTER) {
				return MoveResult.END;
			}
		
			this.changeCycleMode(WeaponAutoActionMode.PREATTACK);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_movePreAttack: function() {
		if (this._preAttack.movePreAttackCycle() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawCurosrShow: function() {
		this._autoActionCursor.drawAutoActionCursor();
	},
	
	_drawPreAttack: function() {
		this._preAttack.drawPreAttackCycle();
	},
	
	_changeCursorShow: function() {
		this._autoActionCursor.setAutoActionPos(this._targetUnit.getMapX(), this._targetUnit.getMapY(), true);
	},
	
	_enterAttack: function() {
		var attackParam = this._createAttackParam();
		
		return this._preAttack.enterPreAttackCycle(attackParam);
	},
	
	_createAttackParam: function() {
		var attackParam = StructureBuilder.buildAttackParam();
		
		attackParam.unit = this._unit;
		attackParam.targetUnit = this._targetUnit;
		attackParam.attackStartType = AttackStartType.NORMAL;
		
		return attackParam;
	}
}
);

var ItemAutoActionMode = {
	CURSORSHOW: 0,
	ITEMUSE: 1
};

var ItemAutoAction = defineObject(BaseAutoAction,
{
	_unit: null,
	_item: null,
	_targetUnit: null,
	_targetItem: null,
	_targetPos: null,
	_autoActionCursor: null,
	_itemUse: null,
	
	setAutoActionInfo: function(unit, combination) {
		this._unit = unit;
		this._item = combination.item;
		this._targetUnit = combination.targetUnit;
		this._targetItem = combination.targetItem;
		this._targetPos = combination.targetPos;
		this._autoActionCursor = createObject(AutoActionCursor);
		this._itemUse = ItemPackageControl.getItemUseParent(this._item);
	},
	
	enterAutoAction: function() {
		if (this.isSkipMode() || !this._isPosVisible()) {
			if (this._enterItemUse() === EnterResult.NOTENTER) {
				return EnterResult.NOTENTER;
			}
			
			this.changeCycleMode(ItemAutoActionMode.ITEMUSE);
		}
		else {
			if (this._targetPos !== null) {
				this._autoActionCursor.setAutoActionPos(this._targetPos.x, this._targetPos.y, false);
			}
			else {
				this._autoActionCursor.setAutoActionPos(this._targetUnit.getMapX(), this._targetUnit.getMapY(), false);
			}
			
			this.changeCycleMode(ItemAutoActionMode.CURSORSHOW);
		}
		
		return EnterResult.OK;
	},
	
	moveAutoAction: function() {
		var result = MoveResult.CONTINUE;
		var mode = this.getCycleMode();
		
		if (mode === ItemAutoActionMode.CURSORSHOW) {
			result = this._moveCurosrShow();
		}
		else if (mode === ItemAutoActionMode.ITEMUSE) {
			result = this._moveItemUse();
		}
		
		return result;
	},
	
	drawAutoAction: function() {
		var mode = this.getCycleMode();
		
		if (mode === ItemAutoActionMode.CURSORSHOW) {
			this._drawCurosrShow();
		}
		else if (mode === ItemAutoActionMode.ITEMUSE) {
			this._drawItemUse();
		}
	},
	
	_moveCurosrShow: function() {
		if (this._autoActionCursor.moveAutoActionCursor() !== MoveResult.CONTINUE) {
			if (this._enterItemUse() === EnterResult.NOTENTER) {
				return MoveResult.END;
			}
			
			this.changeCycleMode(ItemAutoActionMode.ITEMUSE);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveItemUse: function() {
		if (this._itemUse.moveUseCycle() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawCurosrShow: function() {
		this._autoActionCursor.drawAutoActionCursor();
	},
	
	_drawItemUse: function() {
		this._itemUse.drawUseCycle();
	},
	
	_enterItemUse: function() {
		var targetInfo = this._createItemTargetInfo();
		
		return this._itemUse.enterUseCycle(targetInfo);
	},
	
	_createItemTargetInfo: function() {
		var itemTargetInfo = StructureBuilder.buildItemTargetInfo();
		
		itemTargetInfo.unit = this._unit;
		itemTargetInfo.item = this._item;
		itemTargetInfo.targetUnit = this._targetUnit;
		itemTargetInfo.targetItem = this._targetItem;
		itemTargetInfo.targetPos = this._targetPos;
		
		return itemTargetInfo;
	},
	
	_isPosVisible: function() {
		if (this._targetPos === null) {
			// ユニットを蘇生させる場合は、isInvisibleがtrueを返す
			if (this._targetUnit === null || this._targetUnit.isInvisible()) {
				return false;
			}
			
			if (!MapView.isVisible(this._targetUnit.getMapX(), this._targetUnit.getMapY())) {
				// マップで見える範囲に存在しない場合は、位置を表示しても見えない
				return false;
			}
		}
		
		return true;
	}
}
);

var SkillAutoActionMode = {
	CURSORSHOW: 0,
	SKILLUSE: 1
};

var SkillAutoAction = defineObject(BaseAutoAction,
{
	_unit: null,
	_skill: null,
	_targetUnit: null,
	_targetItem: null,
	_targetPos: null,
	_targetMetamorphoze: null,
	_autoActionCursor: null,
	
	setAutoActionInfo: function(unit, combination) {
		this._unit = unit;
		this._skill = combination.skill;
		this._targetUnit = combination.targetUnit;
		this._targetItem = combination.targetItem;
		this._targetPos = combination.targetPos;
		this._targetMetamorphoze = combination.targetMetamorphoze;
		this._autoActionCursor = createObject(AutoActionCursor);
	},
	
	enterAutoAction: function() {
		if (this.isSkipMode()) {
			if (this._enterSkillUse() === EnterResult.NOTENTER) {
				return EnterResult.NOTENTER;
			}
			
			this.changeCycleMode(SkillAutoActionMode.SKILLUSE);
		}
		else {
			if (this._targetPos !== null) {
				this._autoActionCursor.setAutoActionPos(this._targetPos.x, this._targetPos.y, true);
			}
			else {
				this._autoActionCursor.setAutoActionPos(this._targetUnit.getMapX(), this._targetUnit.getMapY(), true);
			}
			
			this.changeCycleMode(SkillAutoActionMode.CURSORSHOW);
		}
		
		return EnterResult.OK;
	},
	
	moveAutoAction: function() {
		var result = MoveResult.CONTINUE;
		var mode = this.getCycleMode();
		
		if (mode === SkillAutoActionMode.CURSORSHOW) {
			result = this._moveCurosrShow();
		}
		else if (mode === SkillAutoActionMode.SKILLUSE) {
			result = this._moveSkillUse();
		}
		
		return result;
	},
	
	drawAutoAction: function() {
		var mode = this.getCycleMode();
		
		if (mode === SkillAutoActionMode.CURSORSHOW) {
			this._drawCurosrShow();
		}
		else if (mode === SkillAutoActionMode.SKILLUSE) {
			this._drawSkillUse();
		}
	},
	
	_moveCurosrShow: function() {
		if (this._autoActionCursor.moveAutoActionCursor() !== MoveResult.CONTINUE) {
			if (this._enterSkillUse() === EnterResult.NOTENTER) {
				return MoveResult.END;
			}
			
			this.changeCycleMode(SkillAutoActionMode.SKILLUSE);
		}
		
		return MoveResult.CONTINUE;
	},

	_moveSkillUse: function() {
		var result = MoveResult.CONTINUE;
		var skillType = this._skill.getSkillType();
		
		if (skillType === SkillType.STEAL) {
			result = this._dynamicEvent.moveDynamicEvent();
		}
		else if (skillType === SkillType.QUICK) {
			result = this._dynamicEvent.moveDynamicEvent();
		}
		else if (skillType === SkillType.PICKING) {
			result = this._eventTrophy.moveEventTrophyCycle();
		}
		else if (skillType === SkillType.METAMORPHOZE) {
			result = this._dynamicEvent.moveDynamicEvent();
		}
		
		return result;
	},
	
	_drawCurosrShow: function() {
		this._autoActionCursor.drawAutoActionCursor();
	},
	
	_drawSkillUse: function() {
		var skillType = this._skill.getSkillType();
		
		if (skillType === SkillType.PICKING) {
			this._eventTrophy.drawEventTrophyCycle();
		}
	},
	
	_enterSkillUse: function() {
		var result = EnterResult.NOTENTER;
		var skillType = this._skill.getSkillType();
		
		if (skillType === SkillType.STEAL) {
			result = this._enterSteal();
		}
		else if (skillType === SkillType.QUICK) {
			result = this._enterQuick();
		}
		else if (skillType === SkillType.PICKING) {
			result = this._enterPicking();
		}
		else if (skillType === SkillType.METAMORPHOZE) {
			result = this._enterMetamorphoze();
		}
		
		return result;
	},
	
	_enterSteal: function() {
		var generator;
		var pixelIndex = 3;
		var direction = PosChecker.getSideDirection(this._unit.getMapX(), this._unit.getMapY(), this._targetUnit.getMapX(), this._targetUnit.getMapY());
		var directionArray = [DirectionType.RIGHT, DirectionType.BOTTOM, DirectionType.LEFT, DirectionType.TOP];
		
		ItemControl.deleteItem(this._targetUnit, this._targetItem);
		UnitItemControl.pushItem(this._unit, this._targetItem);
		
		if (this._isSkipMode) {
			return EnterResult.NOTENTER;
		}
		
		this._dynamicEvent = createObject(DynamicEvent);
		generator = this._dynamicEvent.acquireEventGenerator();
		
		generator.unitSlide(this._unit, direction, pixelIndex, SlideType.START, this._isSkipMode);
		generator.soundPlay(this._getLostSoundHandle(), 1);
		generator.unitSlide(this._unit, directionArray[direction], pixelIndex, SlideType.START, this._isSkipMode);
		generator.unitSlide(this._unit, 0, 0, SlideType.END, this._isSkipMode);
		generator.messageTitle(this._targetItem.getName() + StringTable.ItemSteal, 0, 0, true);
		
		this._appendExperience(generator);
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	_enterQuick: function() {
		var generator;
		var x = LayoutControl.getPixelX(this._targetUnit.getMapX());
		var y = LayoutControl.getPixelY(this._targetUnit.getMapY());
		var anime = root.queryAnime('quick');
		var pos = LayoutControl.getMapAnimationPos(x, y, anime);
		
		this._dynamicEvent = createObject(DynamicEvent);
		generator = this._dynamicEvent.acquireEventGenerator();
		
		generator.animationPlay(validateNull(anime), pos.x, pos.y, false, AnimePlayType.SYNC, 1);
		generator.unitStateChange(this._targetUnit, UnitStateChangeFlag.WAIT, 1);
		
		if (this._skill !== null && this._skill.getSkillValue() === QuickValue.SURROUNDINGS) {
			this._enterQuickInternal(generator, this._targetUnit);
		}
		
		this._appendExperience(generator);
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	_enterQuickInternal: function(generator, targetUnit) {
		var i, x, y, sideUnit;
		var sx = targetUnit.getMapX();
		var sy = targetUnit.getMapY();
		
		for (i = 0; i < DirectionType.COUNT; i++) {
			x = sx + XPoint[i];
			y = sy + YPoint[i];
		
			sideUnit = PosChecker.getUnitFromPos(x, y);
			if (sideUnit !== null && sideUnit.isWait()) {
				generator.unitStateChange(sideUnit, UnitStateChangeFlag.WAIT, 1);
			}
		}
	},
	
	_enterPicking: function() {
		var event = PosChecker.getKeyEvent(this._targetPos.x, this._targetPos.y, this._skill.getSkillValue());
		
		this._eventTrophy = createObject(EventTrophy);
		
		return this._eventTrophy.enterEventTrophyCycle(this._unit, event);
	},
	
	_enterMetamorphoze: function() {
		var generator;
		
		this._dynamicEvent = createObject(DynamicEvent);
		generator = this._dynamicEvent.acquireEventGenerator();
		
		generator.unitMetamorphoze(this._unit, this._targetMetamorphoze, MetamorphozeActionType.CHANGE, this._isSkipMode);
		
		this._appendExperience(generator);
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	_appendExperience: function(generator) {
		var exp;
		
		if (this._skill === null) {
			return;
		}
		
		// 自動AIの時であっても、スキルを使用したなら、自軍は経験値を取得できる
		exp = this._skill.getSkillSubValue();
		if (exp > 0 && this._unit.getUnitType() === UnitType.PLAYER) {
			generator.experiencePlus(this._unit, ExperienceCalculator.getBestExperience(this._unit, exp), false);
		}
	},
	
	_getLostSoundHandle: function() {
		return root.querySoundHandle('itemlost');
	}
}
);

var MoveAutoAction = defineObject(BaseAutoAction,
{
	_unit: null,
	_moveCource: null,
	_simulateMove: null,
	
	setAutoActionInfo: function(unit, combination) {
		this._unit = unit;
		this._moveCource = combination.cource;
		this._simulateMove = createObject(SimulateMove);
	},
	
	enterAutoAction: function() {
		var isSkipMode = this.isSkipMode();
		
		if (isSkipMode) {
			this._simulateMove.skipMove(this._unit, this._moveCource);
			return EnterResult.NOTENTER;
		}
		else {
			this._simulateMove.startMove(this._unit, this._moveCource);
		}
		
		return EnterResult.OK;
	},
	
	moveAutoAction: function() {
		// 移動中にスキップ状態になったかを調べる
		if (this.isSkipMode()) {
			// 移動をスキップさせる
			this._simulateMove.skipMove(this._unit, this._moveCource);
			return MoveResult.END;
		}
		
		if (this._simulateMove.moveUnit() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawAutoAction: function() {
		this._simulateMove.drawUnit();
	}
}
);

var WaitAutoAction = defineObject(BaseAutoAction,
{
	_unit: null,
	_straightFlow: null,
	
	setAutoActionInfo: function(unit, combination) {
		this._unit = unit;
		this._straightFlow = createObject(StraightFlow);
	},
	
	enterAutoAction: function() {
		this._straightFlow.setStraightFlowData(this);
		this._pushFlowEntries(this._straightFlow);
		
		if (!this.isSkipMode()) {
			MapLayer.getMarkingPanel().updateMarkingPanelFromUnit(this._unit);
		}
		
		return this._straightFlow.enterStraightFlow();
	},
	
	moveAutoAction: function() {
		if (this._straightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawAutoAction: function() {
		this._straightFlow.drawStraightFlow();
	},
	
	// UnitWaitFlowEntryから呼ばれる
	getTurnTargetUnit: function() {
		return this._unit;
	},
	
	_pushFlowEntries: function(straightFlow) {
		straightFlow.pushFlowEntry(UnitWaitFlowEntry);
		straightFlow.pushFlowEntry(ReactionFlowEntry);
	}
}
);

var ScrollAutoAction = defineObject(BaseAutoAction,
{
	_unit: null,
	_moveCource: null,
	_mapLineScroll: null,
	_simulateMove: null,
	
	setAutoActionInfo: function(unit, combination) {
		this._unit = unit;
		this._moveCource = combination.cource;
		this._mapLineScroll = createObject(MapLineScroll);
		this._simulateMove = createObject(SimulateMove);
	},
	
	enterAutoAction: function() {
		this._mapLineScroll.startLineScroll(this._unit.getMapX(), this._unit.getMapY());
		
		return EnterResult.OK;
	},
	
	moveAutoAction: function() {
		if (this._mapLineScroll.moveLineScroll() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawAutoAction: function() {
	}
}
);

var AutoActionCursor = defineObject(BaseObject,
{
	_lockonCursor: null,
	
	setAutoActionPos: function(x, y, isScroll) {
		this._lockonCursor = createObject(LockonCursor);
		this._lockonCursor.setPos(x, y);
		
		// アイテムの使用時では、isScrollがfalseになる
		if (isScroll) {
			if (!MapView.isVisible(x, y)) {
				// 対象位置が画面外の場合にスクロールする
				MapView.setScroll(x, y);
			}
		}
	},
	
	moveAutoActionCursor: function() {
		return this._lockonCursor.moveCursor();
	},
	
	drawAutoActionCursor: function() {
		this._lockonCursor.drawCursor();
	},
	
	endAutoActionCursor: function() {
		this._lockonCursor.endCursor();
	}
}
);
