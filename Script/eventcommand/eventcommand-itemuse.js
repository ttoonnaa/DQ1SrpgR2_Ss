
var ItemUseEventCommandMode = {
	SELECT: 0,
	USE: 1
};

var ItemUseEventCommand = defineObject(BaseEventCommand,
{
	_unit: null,
	_item: null,
	_targetUnit: null,
	_targetPos: null,
	_targetItem: null,
	_targetClass: null,
	_targetMetamorphoze: null,
	_itemUse: null,
	_itemUI: null,
	_objectArray: null,
	
	enterEventCommandCycle: function() {
		this._prepareEventCommandMemberData();
		
		if (!this._checkEventCommand()) {
			return EnterResult.NOTENTER;
		}
		
		return this._completeEventCommandMemberData();
	},
	
	moveEventCommandCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === ItemUseEventCommandMode.SELECT) {
			result = this._moveSelect();
		}	
		else if (mode === ItemUseEventCommandMode.USE) {
			result = this._moveUse();
		}
		
		return result;
	},
	
	drawEventCommandCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === ItemUseEventCommandMode.SELECT) {
			this._drawSelect();
		}	
		else if (mode === ItemUseEventCommandMode.USE) {
			this._drawUse();
		}
	},
	
	isEventCommandSkipAllowed: function() {
		// Startの押下によるスキップを許可しない
		return false;
	},
	
	_prepareEventCommandMemberData: function() {
		var eventCommandData = root.getEventCommandObject();
		
		this._unit = eventCommandData.getUseUnit();
		// 使用できるアイテムは、ユニットが実際に所持しているアイテムでなければならない
		this._item = UnitItemControl.getMatchItem(this._unit, eventCommandData.getUseItem());
		this._targetUnit = eventCommandData.getTargetUnit();
		this._targetPos = createPos(eventCommandData.getTargetX(), eventCommandData.getTargetY());
		this._targetItem = UnitItemControl.getMatchItem(this._targetUnit, eventCommandData.getTargetItem());
		this._targetClass = null;
		this._targetMetamorphoze = null;
		
		this._itemUI = null;
		this._objectArray = [];
		this._configureItemUI(this._objectArray);
		
		this.changeCycleMode(ItemUseEventCommandMode.SELECT);
	},
	
	_checkEventCommand: function() {
		var isUseSkip;
		
		if (this._unit === null) {
			return false;
		}
		
		if (this._item === null || this._item.isWeapon() || !this._isItemAllowed(this._item)) {
			return false;
		}
		
		isUseSkip = this._preCheck();
		
		if (this.isSystemSkipMode() && isUseSkip) {
			// アイテムの使用をスキップできた場合は、cycleに入らないようにfalseを返す
			return false;
		}
		
		return true;
	},
	
	_completeEventCommandMemberData: function() {
		return EnterResult.OK;
	},
	
	_preCheck: function() {
		this._createItemUI();
		
		if (this._itemUI.enterItemUI() === EnterResult.OK) {
			return false;
		}
		
		return this._beginItemUse();
	},
	
	_createItemUI: function() {
		var i;
		var count = this._objectArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._objectArray[i].isUIRequired(this._item)) {
				this._itemUI = this._objectArray[i];
				this._itemUI.setParentCommand(this);
				break;
			}
		}
		
		if (i === count) {
			this._itemUI = createObject(BaseItemUI);
		}
	},
	
	_beginItemUse: function() {
		var itemTargetInfo = StructureBuilder.buildItemTargetInfo();
		
		itemTargetInfo.unit = this._unit;
		itemTargetInfo.item = this._item;
		itemTargetInfo.targetUnit = this._targetUnit;
		itemTargetInfo.targetPos = this._targetPos;
		itemTargetInfo.targetItem = this._targetItem;
		itemTargetInfo.targetClass = this._targetClass;
		itemTargetInfo.targetMetamorphoze = this._targetMetamorphoze;
		
		this._itemUse = ItemPackageControl.getItemUseParent(this._item);
		
		this.changeCycleMode(ItemUseEventCommandMode.USE);
		
		return this._itemUse.enterUseCycle(itemTargetInfo) === EnterResult.NOTENTER;
	},
	
	_isItemAllowed: function(item) {
		if (item.getItemType() === ItemType.UNUSABLE) {
			return false;
		}
		
		if (item.getLimit() === WeaponLimitValue.BROKEN) {
			return false;
		}
		
		return true;
	},
	
	_moveSelect: function() {
		if (this._itemUI.moveItemUI() !== MoveResult.END) {
			return MoveResult.CONTINUE;
		}
		
		return this._beginItemUse();
	},
	
	_moveUse: function() {
		if (this._itemUse.moveUseCycle() === MoveResult.END) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawSelect: function() {
		this._itemUI.drawItemUI();
	},
	
	_drawUse: function() {
		this._itemUse.drawUseCycle();
	},
	
	_configureItemUI: function(groupArray) {
		groupArray.appendObject(ItemUI.CLASSCHANGE);
		groupArray.appendObject(ItemUI.METAMORPHOZE);
	}
}
);

var BaseItemUI = defineObject(BaseObject,
{
	_parentCommand: null,
	
	setParentCommand: function(parentCommand) {
		this._parentCommand = parentCommand;
	},
	
	isUIRequired: function(item) {
		return false;
	},
	
	enterItemUI: function() {
		return EnterResult.NOTENTER;
	},
	
	moveItemUI: function() {
		return MoveResult.END;
	},
	
	drawItemUI: function() {
	},
	
	_createDefaultItemUIData: function() {
		return {
			defaultData: null,
			total: 0
		};
	},
	
	_isUIVisible: function(data) {
		// 敵ユニットが「アイテムの使用」を使用した場合は、UIを表示しないようにする
		if (data.total === 0 || this._parentCommand._unit.getUnitType() !== UnitType.PLAYER) {
			return false;
		}
		
		// スキップ状態であり、データが1つしか存在しないなら、UIを表示しない
		if (this._parentCommand.isSystemSkipMode() && data.total === 1) {
			return false;
		}
		
		// クラスチェンジ先が複数の場合にUIを表示。
		// 0を記載することで、常にUIを表示してもよい。
		return data.total > 1;
	}
}
);

var ItemUI = {};

ItemUI.CLASSCHANGE = defineObject(BaseItemUI,
{
	_classChangeSelectManager: null,
	
	isUIRequired: function(item) {
		return item.getItemType() === ItemType.CLASSCHANGE;
	},
	
	enterItemUI: function() {
		var data = this._createItemUIData();
		
		this._parentCommand._targetUnit = this._parentCommand._unit;
		
		if (this._isUIVisible(data)) {
			this._classChangeSelectManager = createObject(ClassChangeSelectManager);
			this._classChangeSelectManager.setClassChangeSelectData(this._parentCommand._unit, this._parentCommand._item);
			SceneManager.setForceForeground(true);
			return EnterResult.OK;
		}
		
		this._parentCommand._targetClass = data.defaultData;
		
		return EnterResult.NOTENTER;
	},
	
	moveItemUI: function() {
		if (this._classChangeSelectManager.moveWindowManager() === MoveResult.CONTINUE) {
			return MoveResult.CONTINUE;
		}
		
		this._parentCommand._targetClass = this._classChangeSelectManager.getTargetClass();
		if (this._parentCommand._targetClass === null) {
			// 「アイテムの使用」では、UIのキャンセルはできない。
			// つまり、クラスチェンジは必須。
			this._classChangeSelectManager.setClassChangeSelectData(this._parentCommand._unit, this._parentCommand._item);
			return MoveResult.CONTINUE;
		}
		
		SceneManager.setForceForeground(false);
		
		return MoveResult.END;
	},
	
	drawItemUI: function() {
		this._classChangeSelectManager.drawWindowManager();
	},
	
	_createItemUIData: function() {
		var i;
		var data = this._createDefaultItemUIData();
		var arr = ClassChangeChecker.getClassEntryArray(this._parentCommand._unit, true);
		var count = arr.length;
		
		for (i = 0; i < count; i++) {
			if (arr[i].isChange) {
				if (data.defaultData === null) {
					data.defaultData = arr[i].cls;
				}
				
				data.total++;
			}
		}
		
		return data;
	}
}
);

ItemUI.METAMORPHOZE = defineObject(BaseItemUI,
{
	_metamorphozeSelectManager: null,
	
	isUIRequired: function(item) {
		return item.getItemType() === ItemType.METAMORPHOZE;
	},
	
	enterItemUI: function() {
		var data = this._createItemUIData();
		
		this._parentCommand._targetUnit = this._parentCommand._unit;
		
		if (this._isUIVisible(data)) {
			this._metamorphozeSelectManager = createObject(MetamorphozeSelectManager);
			this._metamorphozeSelectManager.setMetamorphozeSelectData(this._parentCommand._unit, this._parentCommand._item.getMetamorphozeInfo().getMetamorphozeReferenceList());
			SceneManager.setForceForeground(true);
			return EnterResult.OK;
		}
		
		this._parentCommand._targetMetamorphoze = data.defaultData;
		
		return EnterResult.NOTENTER;
	},
	
	moveItemUI: function() {
		if (this._metamorphozeSelectManager.moveWindowManager() === MoveResult.CONTINUE) {
			return MoveResult.CONTINUE;
		}
		
		this._parentCommand._targetMetamorphoze = this._metamorphozeSelectManager.getTargetMetamorphoze();
		if (this._parentCommand._targetMetamorphoze === null) {
			this._metamorphozeSelectManager.setMetamorphozeSelectData(this._parentCommand._unit, this._parentCommand._item.getMetamorphozeInfo().getMetamorphozeReferenceList());
			return MoveResult.CONTINUE;
		}
		
		SceneManager.setForceForeground(false);
		
		return MoveResult.END;
	},
	
	drawItemUI: function() {
		this._metamorphozeSelectManager.drawWindowManager();
	},
	
	_createItemUIData: function() {
		var i;
		var data = this._createDefaultItemUIData();
		var refList = this._parentCommand._item.getMetamorphozeInfo().getMetamorphozeReferenceList();
		var count = refList.getTypeCount();
		
		for (i = 0; i < count; i++) {
			if (data.defaultData === null) {
				data.defaultData = refList.getTypeData(i);
			}
			
			data.total++;
		}
		
		return data;
	}
}
);