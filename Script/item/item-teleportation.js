
var ItemTeleportationSelectMode = {
	TARGETSELECT: 0,
	POSSELECT: 1
};

var TeleportationItemSelection = defineObject(BaseItemSelection,
{
	_isSingleMode: false,
	_posDoubleCursor: null,
	
	setInitialSelection: function() {
		this._changeTargetSelect();
		return EnterResult.OK;
	},
	
	moveItemSelectionCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === ItemTeleportationSelectMode.TARGETSELECT) {
			result = this._moveTargetSelect();
		}
		else if (mode === ItemTeleportationSelectMode.POSSELECT) {
			result = this._movePosSelect();
		}
		
		if (this._posDoubleCursor !== null) {
			this._posDoubleCursor.moveCursor();
		}
		
		if (result === MoveResult.END) {
			this._posSelector.endPosSelector();
		}

		return result;
	},

	drawItemSelectionCycle: function() {
		var pos;
		var mode = this.getCycleMode();
		
		this._posSelector.drawPosSelector();
		
		if (mode === ItemTeleportationSelectMode.POSSELECT && this._targetUnit !== null) {
			pos = this._posSelector.getSelectorPos();
			if (this._posDoubleCursor !== null) {
				this._posDoubleCursor.drawCursor(this._targetUnit.getMapX(), this._targetUnit.getMapY(), pos.x, pos.y);
			}
		}
	},
	
	isPosSelectable: function() {
		var pos;
		var mode = this.getCycleMode();
		
		if (mode === ItemTeleportationSelectMode.TARGETSELECT) {
			return this._posSelector.getSelectorTarget(true) !== null;
		}
		else if (mode === ItemTeleportationSelectMode.POSSELECT) {
			pos = this._posSelector.getSelectorPos(true);
			if (pos === null) {
				return false;
			}
			
			return PosChecker.getUnitFromPos(pos.x, pos.y) === null;
		}
		
		return true;
	},
	
	setPosSelection: function() {
		var indexArray = [];
		var teleportationInfo = this._item.getTeleportationInfo();
		var rangeType = teleportationInfo.getRangeType();
		var rangeValue = teleportationInfo.getRangeValue();
		
		if (rangeType === SelectionRangeType.MULTI) {
			indexArray = this._getMultiTeleportationIndexArray(rangeValue);
		}
		else if (rangeType === SelectionRangeType.ALL) {
			indexArray = this._getAllTeleportationIndexArray();
		}
		
		// 任意の場所を選択するためにPosSelectorType.FREEを指定する
		this._posSelector.setPosSelectorType(PosSelectorType.FREE);
		this._posSelector.setPosOnly(this._unit, this._item, indexArray, PosMenuType.Item);
		
		// カーソルが一瞬で遠くに行かないように、setFirstPosは呼び出さない
		// this._posSelector.setFirstPos();
	},
	
	_moveTargetSelect: function() {
		var result = this._posSelector.movePosSelector();
		
		if (result === PosSelectorResult.SELECT) {
			if (this.isPosSelectable()) {
				this._targetUnit = this._posSelector.getSelectorTarget(false);
				this._changePosSelect();
			}
		}
		else if (result === PosSelectorResult.CANCEL) {
			this._isSelection = false;
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_movePosSelect: function() {
		var result = this._posSelector.movePosSelector();
		
		if (result === PosSelectorResult.SELECT) {
			if (this.isPosSelectable()) {
				this._targetPos = this._posSelector.getSelectorPos(false);
				this._isSelection = true;
				return MoveResult.END;
			}
		}
		else if (result === PosSelectorResult.CANCEL) {
			if (this._isSingleMode) {
				return MoveResult.END;
			}
			else {
				this._changeTargetSelect();
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_getMultiTeleportationIndexArray: function(rangeValue) {
		var i, index, x, y;
		var indexArrayNew = [];
		var indexArray = IndexArray.getBestIndexArray(this._unit.getMapX(), this._unit.getMapY(), 1, rangeValue);
		var count = indexArray.length;
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			if (this._isPosEnabled(x, y, this._targetUnit)) {
				indexArrayNew.push(index);
			}
		}
		
		return indexArrayNew;
	},
	
	_getAllTeleportationIndexArray: function() {
		var i, index, x, y;
		var indexArrayNew = [];
		var count = CurrentMap.getSize();
		
		for (i = 0; i < count; i++) {
			index = i;
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			if (this._isPosEnabled(x, y, this._targetUnit)) {
				indexArrayNew.push(index);
			}
		}
		
		return indexArrayNew;
	},
	
	_changeTargetSelect: function() {
		if (this._item.getRangeType() === SelectionRangeType.SELFONLY) {
			// 使用者が瞬間移動する場合は、直ちに位置選択に入る
			this._targetUnit = this._unit;
			this._isSingleMode = true;
			
			this._changePosSelect();
		}
		else {
			this._posDoubleCursor = createObject(PosDoubleCursor);
		
			this.setUnitSelection();
			this.changeCycleMode(ItemTeleportationSelectMode.TARGETSELECT);
		}
	},
	
	_changePosSelect: function() {
		this.setPosSelection();
		this.changeCycleMode(ItemTeleportationSelectMode.POSSELECT);
	},
	
	_isPosEnabled: function(x, y, targetUnit) {
		// ユニットが存在する位置には瞬間移動できない
		if (PosChecker.getUnitFromPos(x, y) !== null) {
			return false;
		}
		
		// ユニットが通行できない位置には瞬間移動できない
		if (PosChecker.getMovePointFromUnit(x, y, targetUnit) === 0) {
			return false;
		}
		
		return true;
	}
}
);

var ItemTeleportationUseMode = {
	SRC: 0,
	FOCUS: 1,
	DEST: 2,
	END: 3,
	SRCANIME: 4,
	DESTANIME: 5
};

var TeleportationItemUse = defineObject(BaseItemUse,
{
	_itemUseParent: null,
	_targetUnit: null,
	_targetPos: null,
	_dynamicAnime: null,
	
	enterMainUseCycle: function(itemUseParent) {
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		
		this._itemUseParent = itemUseParent;
		this._targetPos = itemTargetInfo.targetPos;
		
		if (itemTargetInfo.item.getRangeType() === SelectionRangeType.SELFONLY) {
			this._targetUnit = itemTargetInfo.unit;
		}
		else {
			this._targetUnit = itemTargetInfo.targetUnit;
		}
		
		// AIによるアイテム使用では、位置が初期化されていないことがある
		if (this._targetPos === null) {
			this._targetPos = TeleportationControl.getTeleportationPos(itemTargetInfo.unit, this._targetUnit, itemTargetInfo.item);
			if (this._targetPos === null) {
				return EnterResult.NOTENTER;
			}
		}
		
		if (PosChecker.getUnitFromPos(this._targetPos.x, this._targetPos.y) !== null) {
			// ユニットが存在して移動できないため、アイテムを減らさない
			this._itemUseParent.disableItemDecrement();
			return EnterResult.NOTENTER;
		}
		
		if (itemUseParent.isItemSkipMode()) {
			this.mainAction();
			return EnterResult.NOTENTER;
		}
		
		this.changeCycleMode(ItemTeleportationUseMode.SRC);
		
		return EnterResult.OK;
	},
	
	moveMainUseCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
			
		if (mode === ItemTeleportationUseMode.SRC) {
			result = this._moveSrc();
		}
		else if (mode === ItemTeleportationUseMode.SRCANIME) {
			result = this._moveSrcAnime();
		}
		else if (mode === ItemTeleportationUseMode.FOCUS) {
			result = this._moveFocus();
		}
		else if (mode === ItemTeleportationUseMode.DEST) {
			result = this._moveDest();
		}
		else if (mode === ItemTeleportationUseMode.DESTANIME) {
			result = this._moveDestAnime();
		}
		else if (mode === ItemTeleportationUseMode.END) {
			result = this._moveEnd();
		}
		
		return result;
	},
	
	drawMainUseCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === ItemTeleportationUseMode.SRCANIME || mode === ItemTeleportationUseMode.DESTANIME) {
			this._dynamicAnime.drawDynamicAnime();
		}
	},
	
	mainAction: function() {
		this._targetUnit.setMapX(this._targetPos.x);
		this._targetUnit.setMapY(this._targetPos.y);
		this._targetUnit.setInvisible(false);
	},
	
	_moveSrc: function() {
		this._showAnime(this._targetUnit.getMapX(), this._targetUnit.getMapY());
		this.changeCycleMode(ItemTeleportationUseMode.SRCANIME);
		
		return MoveResult.CONTINUE;
	},
	
	_moveSrcAnime: function() {
		if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
			this.changeCycleMode(ItemTeleportationUseMode.FOCUS);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveFocus: function() {
		var generator; 
		
		this._targetUnit.setInvisible(true);
		
		generator = root.getEventGenerator();
		generator.locationFocus(this._targetPos.x, this._targetPos.y, true);
		generator.execute();
		
		this.changeCycleMode(ItemTeleportationUseMode.DEST);
		
		return MoveResult.CONTINUE;
	},
	
	_moveDest: function() {
		this._showAnime(this._targetPos.x, this._targetPos.y);
		this.changeCycleMode(ItemTeleportationUseMode.DESTANIME);
		
		return MoveResult.CONTINUE;
	},
	
	_moveDestAnime: function() {
		if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
			this.changeCycleMode(ItemTeleportationUseMode.END);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveEnd: function() {
		this.mainAction();
		return MoveResult.END;
	},
	
	_showAnime: function(xTarget, yTarget) {
		var x = LayoutControl.getPixelX(xTarget);
		var y = LayoutControl.getPixelY(yTarget);
		var anime = this._itemUseParent.getItemTargetInfo().item.getItemAnime();
		var pos = LayoutControl.getMapAnimationPos(x, y, anime);
		
		this._dynamicAnime = createObject(DynamicAnime);
		this._dynamicAnime.startDynamicAnime(anime, pos.x, pos.y);
	}
}
);

var TeleportationItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Teleportation));
		y += ItemInfoRenderer.getSpaceY();
		
		this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
		y += ItemInfoRenderer.getSpaceY();
		
		this._drawValue(x, y);
	},
	
	getInfoPartsCount: function() {
		return 3;
	},
	
	_drawValue: function(x, y) {
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		var teleportationInfo = this._item.getTeleportationInfo();
		
		ItemInfoRenderer.drawKeyword(x, y, StringTable.Teleportation_Range);
		x += ItemInfoRenderer.getSpaceX();
		
		if (teleportationInfo.getRangeType() === SelectionRangeType.ALL) {
			TextRenderer.drawKeywordText(x, y, StringTable.Range_All, -1, color, font);
		}
		else {
			NumberRenderer.drawRightNumber(x, y, teleportationInfo.getRangeValue());	
		}
	}
}
);

var TeleportationItemPotency = defineObject(BaseItemPotency,
{
}
);

var TeleportationItemAvailability = defineObject(BaseItemAvailability,
{
}
);

// どのユニットを瞬間移動させるかを調べる。
// 瞬間移動する位置はTeleportationControlが決定する。
// TeleportationItemAIとTeleportationControlは、item.getFilterFlagを参照しない。
var TeleportationItemAI = defineObject(BaseItemAI,
{
	getItemScore: function(unit, combination) {
		var n = 15;
		
		// combination.targetUnitを瞬間移動させる位置があるかどうかを調べる。
		// 基準は、瞬間移動の範囲内に自分と異なる種類のユニットが存在するかどうかである。
		if (!this._isTeleportationEnabled(unit, combination)) {
			return AIValue.MIN_SCORE;
		}
		
		// 自分が瞬間移動するより、仲間を瞬間移動させる方が優先度を高くしている
		if (combination.item.getRangeType() !== SelectionRangeType.SELFONLY) {
			n += 10;
		}
		
		// combination.targetUnitは、瞬間移動されるユニット。
		// レベルが高いほど優先される。
		return combination.targetUnit.getLv() + n;
	},
	
	getUnitFilter: function(unit, item) {
		if (item.getRangeType() === SelectionRangeType.SELFONLY) {
			// 自身が相手に対して瞬間移動するから相手を探す	
			return FilterControl.getReverseFilter(unit.getUnitType());
		}
		else {
			// 仲間を瞬間移動させるから仲間を探す
			return FilterControl.getNormalFilter(unit.getUnitType());
		}
	},
	
	getActionTargetType: function(unit, item) {
		// item.getRangeType() === SelectionRangeType.SELFONLYである場合も、常にActionTargetType.UNIT
		return ActionTargetType.UNIT;
	},
	
	_isTeleportationEnabled: function(unit, combination) {
		var targetUnit = combination.targetUnit;
		var teleportationInfo = combination.item.getTeleportationInfo();
		var rangeType = teleportationInfo.getRangeType();
		
		// この条件が成立する場合は、既に相手がいることを特定している
		if (combination.item.getRangeType() === SelectionRangeType.SELFONLY) {	
			return true;
		}
		
		if (rangeType === SelectionRangeType.SELFONLY) {
			return false;
		}
		else if (rangeType === SelectionRangeType.MULTI) {
			return this._isMultiRangeEnabled(unit, targetUnit, teleportationInfo);
		}
		else if (rangeType === SelectionRangeType.ALL) {
			return this._isAllRangeEnabled(unit, targetUnit);
		}
		
		return false;
	},
	
	_isMultiRangeEnabled: function(unit, targetUnit, teleportationInfo) {
		var i, index, x, y, focusUnit;
		var indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, teleportationInfo.getRangeValue() + 1);
		var count = indexArray.length;
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			focusUnit = PosChecker.getUnitFromPos(x, y);
			if (focusUnit === null) {
				continue;
			}
			
			if (!this._isUnitTypeAllowed(targetUnit, focusUnit)) {
				continue;
			}
			
			// targetUnitを基準とした範囲に何らかのユニット(focusUnit)が存在するため、瞬間移動を許可する
			return true;
		}
		
		return false;
	},
	
	_isAllRangeEnabled: function(unit, targetUnit) {
		var i, list;
		var count = 0;
		var filter = FilterControl.getReverseFilter(targetUnit.getUnitType());
		var listArray = FilterControl.getListArray(filter);
		var listCount = listArray.length;
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count += list.getCount();
		}
		
		return count > 0;
	},
	
	_isUnitTypeAllowed: function(unit, targetUnit) {
		// 自分と異なる種類のユニットを調べる
		return FilterControl.isReverseUnitTypeAllowed(unit, targetUnit);
	}
}
);

// AI時にどこに瞬間移動するかを調べる
var TeleportationControl = {
	getTeleportationPos: function(unit, targetUnit, item) {
		var teleportationInfo = item.getTeleportationInfo();
		var rangeType = teleportationInfo.getRangeType();
		var curUnit = null;
		var parentIndexArray = null;
		
		if (rangeType === SelectionRangeType.SELFONLY) {
			return null;
		}
		else if (rangeType === SelectionRangeType.MULTI) {
			curUnit = this._getMultiRangeUnit(unit, targetUnit, teleportationInfo);
			parentIndexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, teleportationInfo.getRangeValue());
		}
		else if (rangeType === SelectionRangeType.ALL) {
			curUnit = this._getAllRangeUnit(unit, targetUnit);
		}
		
		// 射程を越えた位置を返すことのないように、getNearbyPosではなくgetNearbyPosExを呼び出す
		return PosChecker.getNearbyPosEx(curUnit, targetUnit, parentIndexArray);
	},
	
	// getRangeValueに+1することで、限界射程隣のユニットも対象にできる
	_getMultiRangeUnit: function(unit, targetUnit, teleportationInfo) {
		var i, index, x, y, focusUnit;
		var indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, teleportationInfo.getRangeValue() + 1);
		var count = indexArray.length;
		var curUnit = null;
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			focusUnit = PosChecker.getUnitFromPos(x, y);
			if (focusUnit === null) {
				continue;
			}
			
			if (!this._isUnitTypeAllowed(targetUnit, focusUnit)) {
				continue;
			}
			
			curUnit = this._checkUnit(curUnit, focusUnit);
		}
		
		return curUnit;
	},
	
	_getAllRangeUnit: function(unit, targetUnit) {
		var i, j, count, list, focusUnit;
		var curUnit = null;
		var filter = FilterControl.getReverseFilter(targetUnit.getUnitType());
		var listArray = FilterControl.getListArray(filter);
		var listCount = listArray.length;
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count = list.getCount();
			for (j = 0; j < count; j++) {
				focusUnit = list.getData(j);
				curUnit = this._checkUnit(curUnit, focusUnit);
			}
		}
		
		return curUnit;
	},
	
	_checkUnit: function(curUnit, focusUnit) {
		if (curUnit === null) {
			curUnit = focusUnit;
		}
		else {
			if (focusUnit.getLv() > curUnit.getLv()) {
				curUnit = focusUnit;
			}
		}
		
		return curUnit;
	},
	
	_isUnitTypeAllowed: function(unit, targetUnit) {
		if (StateControl.isBadStateOption(unit, BadStateOption.BERSERK)) {
			return FilterControl.isUnitTypeAllowed(unit, targetUnit);
		}
		
		return FilterControl.isReverseUnitTypeAllowed(unit, targetUnit);
	}
};
