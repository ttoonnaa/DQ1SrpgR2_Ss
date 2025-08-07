
var SwitchItemSelection = defineObject(BaseItemSelection,
{
	setInitialSelection: function() {
		// スイッチアイテムでは、誰かを選択するという概念はないため、
		// 最初の時点で選択したものとみなす。
		this._isSelection = true;
		return EnterResult.NOTENTER;
	}
}
);

var SwitchItemUse = defineObject(BaseItemUse,
{
	_itemUseParent: null,
	
	enterMainUseCycle: function(itemUseParent) {
		this._itemUseParent = itemUseParent;
		
		this.mainAction();
		
		return EnterResult.OK;
	},
	
	mainAction: function() {
		this._itemUseParent.getItemTargetInfo().item.getSwitchInfo().startSwitchChange();
	},
	
	getItemAnimePos: function(itemUseParent, animeData) {
		var size = Miscellaneous.getFirstKeySpriteSize(animeData, 0);
		var x = LayoutControl.getCenterX(-1, size.width);
		var y = LayoutControl.getCenterY(-1, size.height) - 20;
		
		return createPos(x, y);
	},
	
	validateItem: function(itemTargetInfo) {
		return true;
	}
}
);

var SwitchItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Switch));
	},
	
	getInfoPartsCount: function() {
		return 1;
	}
}
);

var SwitchItemPotency = defineObject(BaseItemPotency,
{
}
);

var SwitchItemAvailability = defineObject(BaseItemAvailability,
{
	isItemAvailableCondition: function(unit, item) {
		return true;
	}
}
);

var SwitchItemAI = defineObject(BaseItemAI,
{
}
);
