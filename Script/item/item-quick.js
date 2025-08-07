
var QuickItemSelection = defineObject(BaseItemSelection,
{
	setInitialSelection: function() {
		if (this._isSingle()) {
			this._isSelection = true;
			return EnterResult.NOTENTER;
		}
		else {
			this.setUnitSelection();
		}
		
		return EnterResult.OK;
	},
	
	isPosSelectable: function() {
		var unit = this._posSelector.getSelectorTarget(true);
		
		if (unit === null) {
			return false;
		}
		
		// 再度行動アイテムの対象になるユニットは、待機状態でなければならない
		return unit.isWait();
	},
	
	_isSingle: function() {
		var rangeType = this._item.getRangeType();
		
		return rangeType === SelectionRangeType.SELFONLY && this._item.getQuickInfo().getValue() === QuickValue.SURROUNDINGS;
	}
}
);

var QuickItemUse = defineObject(BaseItemUse,
{
	_itemUseParent: null,
	
	enterMainUseCycle: function(itemUseParent) {
		this._itemUseParent = itemUseParent;
		
		this.mainAction();
		
		return EnterResult.OK;
	},
	
	mainAction: function() {
		var item = this._itemUseParent.getItemTargetInfo().item;
		var targetUnit = this._itemUseParent.getItemTargetInfo().targetUnit;
		
		this._mainActionInternal(targetUnit);
		
		if (item.getQuickInfo().getValue() === QuickValue.SURROUNDINGS) {
			this._centerAction(targetUnit, item);
		}
	},
	
	getItemAnimePos: function(itemUseParent, animeData) {
		return this.getUnitBasePos(itemUseParent, animeData);
	},
	
	_mainActionInternal: function(targetUnit) {
		targetUnit.setWait(false);
		
		// 行動済みを解除することで、敵ターンで動けるようにする
		targetUnit.setOrderMark(OrderMarkType.FREE);
	},
	
	_centerAction: function(centerUnit, item) {
		var i, x, y, targetUnit;
		
		for (i = 0; i < DirectionType.COUNT; i++) {
			x = centerUnit.getMapX() + XPoint[i];
			y = centerUnit.getMapY() + YPoint[i];
			targetUnit = PosChecker.getUnitFromPos(x, y);
			if (targetUnit !== null && this._isTargetAllowed(targetUnit, centerUnit, item)) {
				this._mainActionInternal(targetUnit);
			}
		}
	},
	
	_isTargetAllowed: function(targetUnit, unit, item) {
		if (!targetUnit.isWait()) {
			return false;
		}
		
		if (targetUnit.getUnitType() !== unit.getUnitType()) {
			return false;
		}
		
		if (!item.getTargetAggregation().isCondition(targetUnit)) {
			return false;
		}
		
		return true;
	}
}
);

var QuickItemInfo = defineObject(BaseItemInfo,
{
	_isSurroundings: false,
	
	setInfoItem: function(item) {
		BaseItemInfo.setInfoItem.call(this, item);
		this._isSurroundings = item.getQuickInfo().getValue() === QuickValue.SURROUNDINGS;
	},
	
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Quick));
		
		y += ItemInfoRenderer.getSpaceY();
		this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
		
		if (this._isSurroundings) {
			y += ItemInfoRenderer.getSpaceY();
			ItemInfoRenderer.drawKeyword(x, y, StringTable.QuickInfo_Surroundings);
		}
	},
	
	getInfoPartsCount: function() {
		return 2 + (this._isSurroundings ? 1 : 0);
	}
}
);

var QuickItemPotency = defineObject(BaseItemPotency,
{
}
);

var QuickItemAvailability = defineObject(BaseItemAvailability,
{
	isItemAllowed: function(unit, targetUnit, item) {
		var result;
		
		if (item.getRangeType() === SelectionRangeType.SELFONLY) {
			result = this._isSideEnabled(unit, targetUnit, item);
		}
		else {
			// 待機していないユニットは、対象にならない
			result = targetUnit.isWait();
		}
		
		return result;
	},
	
	_isSideEnabled: function(unit, targetUnit, item) {
		var i, x, y;
		var sx = unit.getMapX();
		var sy = unit.getMapY();
		
		for (i = 0; i < DirectionType.COUNT; i++) {
			x = sx + XPoint[i];
			y = sy + YPoint[i];
		
			targetUnit = PosChecker.getUnitFromPos(x, y);
			if (targetUnit !== null && targetUnit.isWait()) {
				return true;
			}
		}
		
		return false;
	}
}
);

var QuickItemAI = defineObject(BaseItemAI,
{
	getActionTargetType: function(unit, item) {
		// item.getRangeType() === SelectionRangeType.SELFONLYが成立する場合でも、ActionTargetType.SINGLEを返さない。
		// 言い換えると、敵AIは周囲設定されたアイテムでも、自身に使用することはない。
		return ActionTargetType.UNIT;
	},
	
	getItemScore: function(unit, combination) {
		var score;
		
		if (!combination.targetUnit.isWait()) {
			return AIValue.MIN_SCORE;
		}
		
		score = this._getScoreFromUnit(combination.targetUnit);
		
		if (this._isSurroundings(combination)) {
			score += this._getSideScore(combination.targetUnit);
		}
		
		return score;
	},
	
	_isSurroundings: function(combination) {
		if (combination.item !== null && combination.item.getQuickInfo().getValue() === QuickValue.SURROUNDINGS) {
			return true;
		}
		
		if (combination.skill !== null && combination.skill.getSkillValue() === QuickValue.SURROUNDINGS) {
			return true;
		}
		
		return false;
	},
	
	_getSideScore: function(targetUnit) {
		var i, x, y, sideUnit;
		var sx = targetUnit.getMapX();
		var sy = targetUnit.getMapY();
		var score = 0;
		
		for (i = 0; i < DirectionType.COUNT; i++) {
			x = sx + XPoint[i];
			y = sy + YPoint[i];
		
			sideUnit = PosChecker.getUnitFromPos(x, y);
			if (sideUnit !== null && sideUnit.isWait()) {
				score += this._getScoreFromUnit(sideUnit);
			}
		}
		
		return score;
	},
	
	_getScoreFromUnit: function(targetUnit) {
		// レベルの高いユニットほど再行動の対象になる
		return targetUnit.getLv() * 7;
	}
}
);
