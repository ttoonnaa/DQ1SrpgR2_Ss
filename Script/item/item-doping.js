
var DopingItemSelection = defineObject(BaseItemSelection,
{
}
);

var DopingItemUse = defineObject(BaseItemUse,
{
	_itemUseParent: null,
	_parameterChangeWindow: null,
	
	enterMainUseCycle: function(itemUseParent) {
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		
		this._itemUseParent = itemUseParent;
		
		if (itemUseParent.isItemSkipMode()) {
			this.mainAction();
			return EnterResult.NOTENTER;
		}
		
		this._parameterChangeWindow = createWindowObject(ParameterChangeWindow, this);
		this._parameterChangeWindow.setParameterChangeData(itemTargetInfo.targetUnit, itemTargetInfo.item);
		
		return EnterResult.OK;
	},
	
	moveMainUseCycle: function() {
		if (InputControl.isSelectAction()) {
			this.mainAction();
			return MoveResult.END;
		}
		else {
			this._parameterChangeWindow.moveWindow();
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawMainUseCycle: function() {
		var x = LayoutControl.getCenterX(-1, this._parameterChangeWindow.getWindowWidth());
		var y = LayoutControl.getCenterY(-1, this._parameterChangeWindow.getWindowHeight());
		
		this._parameterChangeWindow.drawWindow(x, y);
	},
	
	mainAction: function() {
		var itemTargetInfo = this._itemUseParent.getItemTargetInfo();
		
		ParameterControl.addDoping(itemTargetInfo.targetUnit, itemTargetInfo.item);
	},
	
	getItemAnimePos: function(itemUseParent, animeData) {
		return this.getUnitBasePos(itemUseParent, animeData);
	}
}
);

var DopingItemPotency = defineObject(BaseItemPotency,
{
}
);

var DopingItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Doping));
		y += ItemInfoRenderer.getSpaceY();
		
		ItemInfoRenderer.drawDoping(x, y, this._item, false);
	},
	
	getInfoPartsCount: function() {
		return 1 + ItemInfoRenderer.getDopingCount(this._item, false);
	}
}
);

var DopingItemAvailability = defineObject(BaseItemAvailability,
{
	isItemAllowed: function(unit, targetUnit, item) {
		return DopingItemControl.isItemAllowed(targetUnit, item);
	}
}
);

var DopingItemAI = defineObject(BaseItemAI,
{
}
);

// マップ上でのアイテム使用は、DopingItemAvailability。
// ユニット整理上でのアイテム使用は、ItemControl.isItemUsable。
var DopingItemControl = {
	isItemAllowed: function(targetUnit, item) {
		var i, value, cur, max;
		var count = ParamGroup.getParameterCount();
		var result = false;
		
		if (this._isItemAlwaysAllowed(targetUnit, item)) {
			return true;
		}
		
		for (i = 0; i < count; i++) {
			value = ParamGroup.getDopingParameter(item, i);
			if (value === 0) {
				// ドーピング値がないので考慮しない
				continue;
			}
			
			cur = ParamGroup.getUnitValue(targetUnit, i);
			max = ParamGroup.getMaxValue(targetUnit, i);
			if (cur === max) {
				// 既に最大値なので考慮しない
				continue;
			}
			
			// 1つでもドーピングが見込めるアイテムならば使用許可とする
			result = true;
			break;
		}
		
		return result;
	},
	
	_isItemAlwaysAllowed: function(targetUnit, item) {
		// 経験値が設定されたアイテムは使用を許可する
		return item.getExp() > 0;
	}
};
