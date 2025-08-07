
var StealItemSelection = defineObject(BaseItemSelection,
{
	isPosSelectable: function() {
		var targetUnit = this._posSelector.getSelectorTarget(true);
		
		if (targetUnit === null) {
			return false;
		}
		
		return Miscellaneous.isStealEnabled(this._unit, targetUnit, this._item.getStealInfo().getStealFlag());
	}
}
);

var StealItemUse = defineObject(BaseItemUse,
{
	_itemUseParent: null,
	_unitItemStealScreen: null,
	
	enterMainUseCycle: function(itemUseParent) {
		var screenParam;
		
		this._itemUseParent = itemUseParent;
		
		if (this._isImmediately()) {
			this.mainAction();
			return EnterResult.NOTENTER;
		}
		
		if (this._itemUseParent.isItemSkipMode()) {
			// これから画面を表示するため、スキップを解除しておく
			this._itemUseParent.setItemSkipMode(false);
		}
		
		screenParam = this._createScreenParam();
		
		this._unitItemStealScreen = createObject(UnitItemStealScreen);
		SceneManager.addScreen(this._unitItemStealScreen, screenParam);
		
		return EnterResult.OK;
	},
	
	moveMainUseCycle: function() {
		if (SceneManager.isScreenClosed(this._unitItemStealScreen)) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawMainUseCycle: function() {
	},
	
	mainAction: function() {
		var flag;
		var itemTargetInfo = this._itemUseParent.getItemTargetInfo();
		
		if (itemTargetInfo.targetUnit === null || itemTargetInfo.targetItem === null) {
			return;
		}
		
		if (itemTargetInfo.targetUnit.getUnitType() === UnitType.PLAYER && itemTargetInfo.targetItem.isImportance()) {
			// 自軍が所持している重要アイテムは交換できない
			return;
		}
		
		flag = itemTargetInfo.item.getStealInfo().getStealFlag();
		if (!Miscellaneous.isStealEnabled(itemTargetInfo.unit, itemTargetInfo.targetUnit, flag)) {
			// 速さが足りないため盗めない
			return;
		}
		
		if (Miscellaneous.isStealTradeDisabled(itemTargetInfo.unit, itemTargetInfo.targetItem, flag)) {
			// 指定アイテムが交換禁止、または重さを理由に盗めない
			return;
		}
		
		if (!UnitItemControl.pushItem(itemTargetInfo.unit, itemTargetInfo.targetItem)) {
			// アイテムの使用者の所持アイテムが一杯なため、アイテムを追加できなかった
			return;
		}
		
		// targetUnitがtargetItemをドロップトロフィーに含んでいる可能性があるため、その場合は削除する
		ItemControl.deleteTrophy(itemTargetInfo.targetUnit, itemTargetInfo.targetItem);
		
		// unitにtargetItemを追加できたため、targetUnitからtargetItemを除く
		ItemControl.deleteItem(itemTargetInfo.targetUnit, itemTargetInfo.targetItem);
	},
	
	getItemAnimePos: function(itemUseParent, animeData) {
		return this.getUnitBasePos(itemUseParent, animeData);
	},
	
	validateItem: function(itemTargetInfo) {
		// 自軍が「盗む」アイテムを、アイテム欄から使用する場合、画面経由で盗むので、targetItemが初期化されている必要はない
		if (itemTargetInfo.unit.getUnitType() === UnitType.PLAYER && root.getCurrentScene() !== SceneType.EVENT) {
			return itemTargetInfo.targetUnit !== null;
		}
		
		// イベントコマンドの「アイテムの使用」で「盗む」アイテムを使用する場合、もしくは敵AIが「盗む」アイテムを使用する場合は、targetItemが初期化されていなければならない
		return itemTargetInfo.targetUnit !== null && itemTargetInfo.targetItem !== null;
	},
	
	_isImmediately: function() {
		// 既にtargetItemが設定されている場合は、交換画面を表示せず直ちに盗める
		return this._itemUseParent.getItemTargetInfo().targetItem !== null;
	},
	
	_createScreenParam: function() {
		var screenParam = ScreenBuilder.buildUnitItemSteal();
		
		screenParam.unit = this._itemUseParent.getItemTargetInfo().unit;
		screenParam.targetUnit = this._itemUseParent.getItemTargetInfo().targetUnit;
		screenParam.stealFlag = this._itemUseParent.getItemTargetInfo().item.getStealInfo().getStealFlag();
		
		return screenParam;
	}
}
);

var StealItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Steal));
		
		y += ItemInfoRenderer.getSpaceY();
		this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
	},
	
	getInfoPartsCount: function() {
		return 2;
	}
}
);

var StealItemPotency = defineObject(BaseItemPotency,
{
}
);

var StealItemAvailability = defineObject(BaseItemAvailability,
{
	isItemAllowed: function(unit, targetUnit, item) {
		var stealFlag = item.getStealInfo().getStealFlag();
		
		return Miscellaneous.isStealEnabled(unit, targetUnit, stealFlag);
	}
}
);

var StealItemAI = defineObject(BaseItemAI,
{
	getItemScore: function(unit, combination) {
		var stealFlag;
		
		if (!UnitItemControl.isUnitItemSpace(unit)) {
			return AIValue.MIN_SCORE;
		}
		
		stealFlag = this._getStealFlag(unit, combination);
		if (!Miscellaneous.isStealEnabled(unit, combination.targetUnit, stealFlag)) {
			return AIValue.MIN_SCORE;
		}
		
		combination.targetItem = this._getBestItem(unit, combination, stealFlag);
		if (combination.targetItem === null) {
			return AIValue.MIN_SCORE;
		}
		
		return 150;
	},
	
	// AIでは複数個盗むことはない
	_getBestItem: function(unit, combination, stealFlag) {
		var i, item;
		var arr = [];
		var count = UnitItemControl.getPossessionItemCount(combination.targetUnit);
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(combination.targetUnit, i);
			if (item === null) {
				continue;
			}
			
			if (item.isImportance() || item.isTradeDisabled()) {
				continue;
			}
			
			if (Miscellaneous.isStealTradeDisabled(unit, item, stealFlag)) {
				continue;
			}
			
			arr.push(item);
		}
		
		if (arr.length === 0) {
			return null;
		}
		
		this._sortItem(arr);
	
		return arr[0];
	},
	
	_getStealFlag: function(unit, combination) {
		var stealFlag = 0;
		
		if (combination.item !== null) {
			stealFlag = combination.item.getStealInfo().getStealFlag();
		}
		else if (combination.skill !== null) {
			stealFlag = combination.skill.getSkillValue();
		}
		
		return stealFlag;
	},
	
	_sortItem: function(arr) {
		arr.sort(
			function(item1, item2) {
				var price1, price2;
				
				price1 = item1.getGold();
				price2 = item2.getGold();
				
				if (price1 > price2) {
					return -1;
				}
				else if (price1 < price2) {
					return 1;
				}
				
				return 0;
			}
		);
	}
}
);
