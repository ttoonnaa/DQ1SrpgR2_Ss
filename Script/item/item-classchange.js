
var ClassChangeItemSelection = defineObject(BaseItemSelection,
{
	_classChangeSelectManager: null,
	
	setInitialSelection: function() {
		this._classChangeSelectManager = createObject(ClassChangeSelectManager);
		this._classChangeSelectManager.setClassChangeSelectData(this._unit, this._item);
		return EnterResult.OK;
	},
	
	moveItemSelectionCycle: function() {
		if (this._classChangeSelectManager.moveWindowManager() !== MoveResult.CONTINUE) {
			this._targetClass = this._classChangeSelectManager.getTargetClass();
			if (this._targetClass === null) {
				this._isSelection = false;
			}
			else {
				this._isSelection = true;
			}
			
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawItemSelectionCycle: function() {
		this._classChangeSelectManager.drawWindowManager();
	}
}
);

var ClassChangeItemUse = defineObject(BaseItemUse,
{
	_dynamicEvent: null,
	_itemUseParent: null,
	
	enterMainUseCycle: function(itemUseParent) {
		var generator, result;
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		
		this._itemUseParent = itemUseParent;
		
		if (!this._isChangeAllowed(itemTargetInfo)) {
			// アイテムを使用しない場合は、アイテムの使用数を減らせない
			itemUseParent.disableItemDecrement();
			return EnterResult.NOTENTER;
		}
		
		this._dynamicEvent = createObject(DynamicEvent);
		generator = this._dynamicEvent.acquireEventGenerator();
		generator.classChange(itemTargetInfo.targetUnit, itemTargetInfo.targetClass, itemUseParent.isItemSkipMode());
		
		result = this._dynamicEvent.executeDynamicEvent();
		if (result === EnterResult.NOTENTER) {
			this.mainAction();
		}
		
		return result;
	},
	
	moveMainUseCycle: function() {
		var result = this._dynamicEvent.moveDynamicEvent();
		
		if (result === MoveResult.END) {
			this.mainAction();
		}
		
		return result;
	},
	
	mainAction: function() {
		var itemTargetInfo = this._itemUseParent.getItemTargetInfo();
		
		if (this._isLevelReset(itemTargetInfo)) {
			this._resetLevel(itemTargetInfo);
			if (this._isExpReset()) {
				this._resetExp(itemTargetInfo);
			}
		}
	},
	
	validateItem: function(itemTargetInfo) {
		return true;
	},
	
	_isChangeAllowed: function(itemTargetInfo) {
		if (itemTargetInfo.targetClass === null) {
			return false;
		}
		
		return true;
	},
	
	_isLevelReset: function(itemTargetInfo) {
		return itemTargetInfo.item.getClassChangeInfo().isLevelReset();
	},
	
	_resetLevel: function(itemTargetInfo) {
		itemTargetInfo.unit.setLv(1);
	},
	
	_isExpReset: function() {
		return true;
	},
	
	_resetExp: function(itemTargetInfo) {
		itemTargetInfo.unit.setExp(0);
	}
}
);

var ClassChangeItemInfo = defineObject(BaseItemInfo,
{
	_arr: null,
	
	setInfoItem: function(item) {
		var i, count, classGroup, name;
		var info = item.getClassChangeInfo();
		
		this._arr = [];
		
		BaseItemInfo.setInfoItem.call(this, item);
		
		if (info.isClassInfoDisplayable()) {
			// クラスグループは、同名のものが存在することが考えられるため、
			// 重複を除いたものを_arrに設定する。
			count = info.getClassGroupCount();
			for (i = 0; i < count; i++) {
				classGroup = info.getClassGroupData(i);
				name = classGroup.getName();
				
				if (this._arr.indexOf(name) !== -1) {
					continue;
				}
				
				this._arr.push(name);
			}
		}
	},
	
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_ClassChange));
		y += ItemInfoRenderer.getSpaceY();
		
		if (this._arr.length > 0) {
			this._drawList(x, y);
		}
	},
	
	getInfoPartsCount: function() {
		return 1 + this._arr.length;
	},
	
	_drawList: function(x, y, list) {
		var i;
		var count = this._arr.length;
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		ItemInfoRenderer.drawKeyword(x, y, StringTable.ClassChangeInfo_Target);
		x += ItemInfoRenderer.getSpaceX();
		
		for (i = 0 ; i < count; i++) {
			TextRenderer.drawKeywordText(x, y, this._arr[i], -1, color, font);
			y += ItemInfoRenderer.getSpaceY();
		}
	}
}
);

var ClassChangeItemPotency = defineObject(BaseItemPotency,
{
}
);

var ClassChangeItemAvailability = defineObject(BaseItemAvailability,
{
}
);

var ClassChangeItemAI = defineObject(BaseItemAI,
{
}
);

var ClassChangeSelectMode = {
	MSG: 0,
	SCREEN: 1
};

var ClassChangeSelectManager = defineObject(BaseWindowManager,
{
	_unit: null,
	_targetClass: null,
	_infoWindow: null,
	
	setClassChangeSelectData: function(unit, item) {
		var group, screenParam;
		
		this._unit = unit;
		this._targetClass = null;
		this._infoWindow = createWindowObject(InfoWindow, this);
		
		// 内部でmode変更が起こる
		group = this._checkGroup(unit, item);
		if (group === null) {
			return;
		}
		
		screenParam = this._createScreenParam();
		this._classChangeScreen = createObject(MultiClassChangeScreen);
		SceneManager.addScreen(this._classChangeScreen, screenParam);
		
		this.changeCycleMode(ClassChangeSelectMode.SCREEN);
	},
	
	moveWindowManager: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === ClassChangeSelectMode.MSG) {
			result = this._moveMsg();
		}
		else if (mode === ClassChangeSelectMode.SCREEN) {
			result = this._moveScreen();
		}
		
		return result;
	},
	
	drawWindowManager: function() {
		var mode = this.getCycleMode();
		
		if (mode === ClassChangeSelectMode.MSG) {
			this._drawMsg();
		}
	},
	
	getTargetClass: function() {
		return this._targetClass;
	},
	
	_moveMsg: function() {
		var result = this._infoWindow.moveWindow();
		
		if (result === MoveResult.END) {
			this._playCancelSound();
		}
		
		return result;
	},
	
	_moveScreen: function() {
		if (SceneManager.isScreenClosed(this._classChangeScreen)) {
			this._targetClass = this._classChangeScreen.getScreenResult();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawMsg: function() {
		var x = LayoutControl.getCenterX(-1, this._infoWindow.getWindowWidth());
		var y = LayoutControl.getCenterY(-1, this._infoWindow.getWindowHeight());
		
		this._infoWindow.drawWindow(x, y);
	},
	
	_checkGroup: function(unit, item) {
		var classGroupId, classUpMaxCount;
		
		if (DataConfig.isBattleSetupClassChangeAllowed()) {
			// SceneType.BATTLESETUPでのクラスチェンジが可能な場合は、クラスグループ2を使用
			classGroupId = unit.getClassGroupId2();
			classUpMaxCount = 1;
		}
		else {
			if (unit.getClassUpCount() === 0) {
				// 一度もクラスチェンジしていない場合は、クラスグループ1を使用
				classGroupId = unit.getClassGroupId1();
			}
			else {
				// クラスチェンジしたことがある場合は、クラスグループ2を使用
				classGroupId = unit.getClassGroupId2();
			}
			classUpMaxCount = 2;
		}
		
		// idが-1の場合、このユニットはCCできないことを意味する
		if (classGroupId === -1) {
			this._infoWindow.setInfoMessage(StringTable.ClassChange_UnableClassChange);
			this.changeCycleMode(ClassChangeSelectMode.MSG);
			return null;
		}
		
		return this._checkGroupInternal(unit, item, classGroupId, classUpMaxCount);
	},
	
	_checkGroupInternal: function(unit, item, classGroupId, classUpMaxCount) {
		var i;
		var info = item.getClassChangeInfo();
		var count = info.getClassGroupCount();
		var group = null;
		
		// ユニットのgroupIdが含まれているかどうかを調べる
		for (i = 0; i < count; i++) {
			group = info.getClassGroupData(i);
			if (group.getId() === classGroupId) {
				break;
			}
		}
		
		// groupIdが含まれていなかったということは、unitはitemでCCできないことを意味する
		if (i === count) {
			this._infoWindow.setInfoMessage(StringTable.ClassChange_UnableClassChangeItem);
			this.changeCycleMode(ClassChangeSelectMode.MSG);
			return null;
		}
		
		if (unit.getClassUpCount() >= classUpMaxCount) {
			// 既にクラスチェンジしているため、これ以上のクラスチェンジはできない
			this._infoWindow.setInfoMessage(StringTable.ClassChange_UnableClassChangeMore);
			this.changeCycleMode(ClassChangeSelectMode.MSG);
			return null;
		}
		
		return group;
	},
	
	_playCancelSound: function() {
		MediaControl.soundDirect('commandcancel');
	},
	
	_createScreenParam: function() {
		var screenParam = ScreenBuilder.buildMultiClassChange();
		
		screenParam.unit = this._unit;
		screenParam.isMapCall = true;
		
		return screenParam;
	}
}
);
