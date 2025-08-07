
var ItemPackageControl = {
	getItemSelectionObject: function(item) {
		var obj;
		var type = item.getItemType();
		var arr = [
			null, RecoveryItemSelection, EntireRecoveryItemSelection, DamageItemSelection, DopingItemSelection, 
			ClassChangeItemSelection, SkillChangeItemSelection, KeyItemSelection, QuickItemSelection,
			TeleportationItemSelection, RescueItemSelection, ResurrectionItemSelection, DurabilityChangeItemSelection,
			StealItemSelection, StateItemSelection, StateRecoveryItemSelection, SwitchItemSelection,
			FusionItemSelection, MetamorphozeItemSelection
		];
		
		if (type === ItemType.CUSTOM) {
			obj = this.getCustomItemSelectionObject(item, item.getCustomKeyword());
		}
		else if (type === ItemType.UNUSABLE) {
			return null;
		}
		else {
			obj = arr[type];
		}
		
		return createObject(obj);
	},
	
	getItemUseParent: function(item) {
		var obj, parent;
		var type = item.getItemType();
		var arr = [
			null, RecoveryItemUse, EntireRecoveryItemUse, DamageItemUse, DopingItemUse,
			ClassChangeItemUse, SkillChangeItemUse, KeyItemUse, QuickItemUse,
			TeleportationItemUse, RescueItemUse, ResurrectionItemUse, DurabilityChangeItemUse,
			StealItemUse, StateItemUse, StateRecoveryItemUse, SwitchItemUse,
			FusionItemUse, MetamorphozeItemUse
		];
	
		if (type === ItemType.CUSTOM) {
			obj = this.getCustomItemUseObject(item, item.getCustomKeyword());
		}
		else if (type === ItemType.UNUSABLE) {
			return null;
		}
		else {
			obj = arr[type];
		}
		
		// getItemSelectionObjectやgetItemInfoObjectと異なり、RecoveryItemUseなどを返すのではなく、
		// そうしたオブジェクトを包括するオブジェクトを返す。
		parent = createObject(ItemUseParent);
		parent._itemUseObject = createObject(obj);
		
		return parent;
	},
	
	getItemInfoObject: function(item) {
		var obj;
		var type = item.getItemType();
		var arr = [
			UnusableItemInfo, RecoveryItemInfo, EntireRecoveryItemInfo, DamageItemInfo, DopingItemInfo,
			ClassChangeItemInfo, SkillChangeItemInfo, KeyItemInfo, QuickItemInfo,
			TeleportationItemInfo, RescueItemInfo, ResurrectionItemInfo, DurabilityItemInfo,
			StealItemInfo, StateItemInfo, StateRecoveryItemInfo, SwitchItemInfo,
			FusionItemInfo, MetamorphozeItemInfo
		];
		
		if (type === ItemType.CUSTOM) {
			obj = this.getCustomItemInfoObject(item, item.getCustomKeyword());
		}
		else {
			obj = arr[type];
		}
		
		return createObject(obj);
	},
	
	getItemPotencyObject: function(item) {
		var obj;
		var type = item.getItemType();
		var arr = [
			UnusableItemPotency, RecoveryItemPotency, EntireRecoveryItemPotency, DamageItemPotency, DopingItemPotency,
			ClassChangeItemPotency, SkillChangeItemPotency, KeyItemPotency, QuickItemPotency,
			TeleportationItemPotency, RescueItemPotency, ResurrectionItemPotency, DurabilityChangeItemPotency,
			StealItemPotency, StateItemPotency, StateRecoveryItemPotency, SwitchItemPotency,
			FusionItemPotency, MetamorphozeItemPotency
		];
		
		if (type === ItemType.CUSTOM) {
			obj = this.getCustomItemPotencyObject(item, item.getCustomKeyword());
		}
		else {
			obj = arr[type];
		}
		
		return createObject(obj);
	},
	
	getItemAvailabilityObject: function(item) {
		var obj;
		var type = item.getItemType();
		var arr = [
			UnusableItemAvailability, RecoveryItemAvailability, EntireRecoveryItemAvailability, DamageItemAvailability, DopingItemAvailability,
			ClassChangeItemAvailability, SkillChangeItemAvailability, KeyItemAvailability, QuickItemAvailability,
			TeleportationItemAvailability, RescueItemAvailability, ResurrectionItemAvailability, DurabilityChangeItemAvailability,
			StealItemAvailability, StateItemAvailability, StateRecoveryItemAvailability, SwitchItemAvailability,
			FusionItemAvailability, MetamorphozeItemAvailability
		];
		
		if (type === ItemType.CUSTOM) {
			obj = this.getCustomItemAvailabilityObject(item, item.getCustomKeyword());
		}
		else {
			obj = arr[type];
		}
		
		return createObject(obj);
	},
	
	getItemAIObject: function(item) {
		var obj;
		var type = item.getItemType();
		var arr = [
			UnusableItemAI, RecoveryItemAI, EntireRecoveryItemAI, DamageItemAI, DopingItemAI,
			ClassChangeItemAI, SkillChangeItemAI, KeyItemAI, QuickItemAI,
			TeleportationItemAI, RescueItemAI, ResurrectionItemAI, DurabilityChangeItemAI,
			StealItemAI, StateItemAI, StateRecoveryItemAI, SwitchItemAI,
			FusionItemAI, MetamorphozeItemAI
		];
		
		if (type === ItemType.CUSTOM) {
			obj = this.getCustomItemAIObject(item, item.getCustomKeyword());
		}
		else {
			obj = arr[type];
		}
		
		return createObject(obj);
	},
	
	getCustomItemSelectionObject: function(item, keyword) {
		return null;
	},
	
	getCustomItemUseObject: function(item, keyword) {
		return null;
	},
	
	getCustomItemInfoObject: function(item, keyword) {
		return null;
	},
	
	getCustomItemPotencyObject: function(item, keyword) {
		return null;
	},
	
	getCustomItemAvailabilityObject: function(item, keyword) {
		return null;
	},
	
	getCustomItemAIObject: function(item, keyword) {
		return null;
	}
};

var BaseItemSelection = defineObject(BaseObject,
{
	_unit: null,
	_item: null,
	_targetUnit: null,
	_targetPos: null,
	_targetClass: null,
	_targetItem: null,
	_targetMetamorphoze: null,
	_isSelection: false,
	_posSelector: null,
	
	enterItemSelectionCycle: function(unit, item) {
		this._unit = unit;
		this._item = item;
		this._targetUnit = this._unit;
		this._targetPos = createPos(this._unit.getMapX(), this._unit.getMapY());
		this._targetClass = null;
		this._targetItem = null;
		this._isSelection = false;
		this._posSelector = createObject(PosSelector);
		
		return this.setInitialSelection();
	},
	
	moveItemSelectionCycle: function() {
		var targetUnit;
		var result = this._posSelector.movePosSelector();
		
		if (result === PosSelectorResult.SELECT) {
			if (this.isPosSelectable()) {
				targetUnit = this._posSelector.getSelectorTarget(false);
				if (targetUnit !== null) {
					this._targetUnit = targetUnit;
				}
				this._isSelection = true;
				this._posSelector.endPosSelector();
				return MoveResult.END;
			}
		}
		else if (result === PosSelectorResult.CANCEL) {
			this._isSelection = false;
			this._posSelector.endPosSelector();
			return MoveResult.END;
		}

		return MoveResult.CONTINUE;
	},
	
	drawItemSelectionCycle: function() {
		this._posSelector.drawPosSelector();
	},
	
	setUnitSelection: function() {
		var filter = this.getUnitFilter();
		var indexArray = IndexArray.createIndexArray(this._unit.getMapX(), this._unit.getMapY(), this._item);
		
		indexArray = this._getUnitOnlyIndexArray(this._unit, indexArray);
		this._posSelector.setUnitOnly(this._unit, this._item, indexArray, PosMenuType.Item, filter);
		
		this.setFirstPos();
	},
	
	// アイテムを特定の位置に対して使用する場合に呼ばれる
	setPosSelection: function() {
		var indexArray = IndexArray.createIndexArray(this._unit.getMapX(), this._unit.getMapY(), this._item);
		
		this._posSelector.setPosOnly(this._unit, this._item, indexArray, PosMenuType.Item);
		
		this.setFirstPos();
	},
	
	setFirstPos: function() {
		this._posSelector.setFirstPos();
	},
	
	isPosSelectable: function() {
		return this._posSelector.getSelectorTarget(true) !== null;
	},
	
	getUnitFilter: function() {
		return FilterControl.getBestFilter(this._unit.getUnitType(), this._item.getFilterFlag());
	},
	
	setInitialSelection: function() {
		var rangeType = this._item.getRangeType();
		
		if (rangeType === SelectionRangeType.SELFONLY) {
			this._isSelection = true;
			return EnterResult.NOTENTER;
		}
		else {
			// 既定では、アイテムはユニットに対して使用できる
			this.setUnitSelection();
		}
		
		return EnterResult.OK;
	},
	
	isSelection: function() {
		return this._isSelection;
	},
	
	getResultItemTargetInfo: function() {
		var itemTargetInfo = StructureBuilder.buildItemTargetInfo();
		
		// unitとitemは、呼び出し側が設定する
		itemTargetInfo.targetUnit = this._targetUnit;
		itemTargetInfo.targetPos = this._targetPos;
		itemTargetInfo.targetClass = this._targetClass;
		itemTargetInfo.targetItem = this._targetItem;
		itemTargetInfo.targetMetamorphoze = this._targetMetamorphoze;
		
		return itemTargetInfo;
	},
	
	_getUnitOnlyIndexArray: function(unit, indexArray) {
		var i, index, x, y;
		var indexArrayNew = [];
		var count = indexArray.length;
		var obj = ItemPackageControl.getItemAvailabilityObject(this._item);
		
		if (obj === null) {
			return indexArrayNew;
		}
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			if (obj.isPosEnabled(unit, this._item, x, y)) {
				indexArrayNew.push(index);
			}
		}
		
		return indexArrayNew;
	}
}
);

var BaseItemUse = defineObject(BaseObject,
{	
	enterMainUseCycle: function(itemUseParent) {
		return EnterResult.NOTENTER;
	},
	
	moveMainUseCycle: function() {
		return MoveResult.END;
	},
	
	drawMainUseCycle: function() {
	},
	
	mainAction: function() {
	},
	
	// enterMainUseCycleより前に呼ばれる
	getItemAnimePos: function(itemUseParent, animeData) {
		return null;
	},
	
	getUnitBasePos: function(itemUseParent, animeData) {
		var x, y, size, pos;
		var targetUnit = itemUseParent.getItemTargetInfo().targetUnit;
		
		if (Miscellaneous.isPrepareScene()) {
			size = Miscellaneous.getFirstKeySpriteSize(animeData, 0);
			x = LayoutControl.getCenterX(-1, size.width);
			y = LayoutControl.getCenterY(-1, size.height);
			pos = createPos(x, y);
		}
		else {
			if (targetUnit === null) {
				return null;
			}
			
			x = LayoutControl.getPixelX(targetUnit.getMapX());
			y = LayoutControl.getPixelY(targetUnit.getMapY());
			pos = LayoutControl.getMapAnimationPos(x, y, animeData);
		}
		
		return pos;
	},
	
	// マップに登場していないターゲットにアイテムは使用できない。
	// イベントコマンドの「アイテムの使用」を使用する際に、未登場ターゲットが指定されていないか確認する。
	validateItem: function(itemTargetInfo) {
		if (itemTargetInfo.item !== null && itemTargetInfo.item.getItemType() === ItemType.CUSTOM) {
			// カスタムアイテムがターゲットを必要とするかは分からないため、無条件に使用可能とみなす
			return true;
		}
		
		// この時点で事前チェックすることで、多くのアイテムのenterMainUseCycleでターゲット検証が不要になる
		return itemTargetInfo.targetUnit !== null;
	}
}
);

// ItemUseParentが使用される前に、BaseItemSelectionが使用されているとは限らない点に注意。
// イベントコマンドの「アイテムの使用」や、敵がアイテムを使用する場合は、
// 選択モードを介さずにBaseItemUseが使用される。
var ItemUseParent = defineObject(BaseObject,
{
	_itemUseObject: null,
	_itemTargetInfo: null,
	_isItemDecrementDisabled: false,
	_isItemSkipMode: false,
	_straightFlow: null,
	
	enterUseCycle: function(itemTargetInfo) {
		this._prepareMemberData(itemTargetInfo);
		return this._completeMemberData(itemTargetInfo);
	},
	
	moveUseCycle: function() {
		if (InputControl.isStartAction()) {
			this.setItemSkipMode(true);
		}
		
		if (this._straightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			if (this._itemTargetInfo.isPlayerSideCall) {
				// 自軍側でのアイテムや杖を通じたコマンド経由において、
				// ここで無条件にスキップを無効にすることで後続操作(攻撃など)にまでスキップが影響しないようにする。
				this.setItemSkipMode(false);
			}
			this.decreaseItem();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawUseCycle: function() {
		this._straightFlow.drawStraightFlow();
	},
	
	disableItemDecrement: function() {
		this._isItemDecrementDisabled = true;
	},
	
	isItemSkipMode: function() {
		return CurrentMap.isCompleteSkipMode();
	},
	
	setItemSkipMode: function(isSkipMode) {
		CurrentMap.setTurnSkipMode(isSkipMode);
		MapLayer.setEffectMotion(null);
	},
	
	decreaseItem: function() {
		if (!this._isItemDecrementDisabled) {
			// アイテムの耐久を減らす
			ItemControl.decreaseItem(this._itemTargetInfo.unit, this._itemTargetInfo.item);
		}
	},
	
	getItemUseObject: function() {
		return this._itemUseObject;
	},
	
	getItemTargetInfo: function() {
		return this._itemTargetInfo;
	},
	
	_prepareMemberData: function(itemTargetInfo) {
		this._itemTargetInfo = itemTargetInfo;
		this._isItemDecrementDisabled = false;
		this._isItemSkipMode = false;
		this._straightFlow = createObject(StraightFlow);
	},
	
	_completeMemberData: function(itemTargetInfo) {
		var result;
		
		this._straightFlow.setStraightFlowData(this);
		this._pushFlowEntries(this._straightFlow);
		
		result = this._straightFlow.enterStraightFlow();
		if (result === EnterResult.NOTENTER) {
			// アイテムに経験値やアニメを設定しない場合は即座にここが実行される
			this.decreaseItem();
		}
		
		return result;
	},
	
	_pushFlowEntries: function(straightFlow) {
		straightFlow.pushFlowEntry(ItemTitleFlowEntry);
		straightFlow.pushFlowEntry(ItemStartScrollFlowEntry);
		straightFlow.pushFlowEntry(ItemMainFlowEntry);
		straightFlow.pushFlowEntry(ItemExpFlowEntry);
	}
}
);

var ItemTitleFlowEntry = defineObject(BaseFlowEntry,
{
	_itemUseParent: null,
	_counter: null,
	
	enterFlowEntry: function(itemUseParent) {
		this._prepareMemberData(itemUseParent);
		return this._completeMemberData(itemUseParent);
	},
	
	moveFlowEntry: function() {
		if (this._itemUseParent.isItemSkipMode()) {
			return MoveResult.END;
		}
		
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		var x, y;
		var itemTargetInfo = this._itemUseParent.getItemTargetInfo();
		var textui = root.queryTextUI('itemuse_title');
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		var text = itemTargetInfo.item.getName();
		var width = (TitleRenderer.getTitlePartsCount(text, font) + 2) * TitleRenderer.getTitlePartsWidth();
		
		x = LayoutControl.getUnitCenterX(itemTargetInfo.unit, width, 0);
		y = LayoutControl.getUnitBaseY(itemTargetInfo.unit, TitleRenderer.getTitlePartsHeight()) - 20;
		
		TextRenderer.drawTitleText(x, y, text, color, font, TextFormat.CENTER, pic);
	},
	
	_prepareMemberData: function(itemUseParent) {
		this._itemUseParent = itemUseParent;
		this._counter = createObject(CycleCounter);
	},
	
	_completeMemberData: function(itemUseParent) {
		if (Miscellaneous.isPrepareScene()) {
			return EnterResult.NOTENTER;
		}
		
		if (this._itemUseParent.isItemSkipMode()) {
			return EnterResult.NOTENTER;
		}
		
		this._counter.setCounterInfo(36);
		
		this._playItemUseSound();
		
		return EnterResult.OK;
	},
	
	_playItemUseSound: function() {
		MediaControl.soundDirect('itemuse');
	}
}
);

// 敵がアイテムを使用した場合に、対象に向かってスクロールする。
// 見出しの後に表示するために、AutoActionCursorに含めていない。
var ItemStartScrollFlowEntry = defineObject(BaseFlowEntry,
{
	_itemUseParent: null,
	_mapLineScroll: null,
	
	enterFlowEntry: function(itemUseParent) {
		this._prepareMemberData(itemUseParent);
		return this._completeMemberData(itemUseParent);
	},
	
	moveFlowEntry: function() {
		return this._mapLineScroll.moveLineScroll();
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(itemUseParent) {
		this._itemUseParent = itemUseParent;
		this._mapLineScroll = createObject(MapLineScroll);
	},
	
	_completeMemberData: function(itemUseParent) {
		var x, y;
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		var unit = itemTargetInfo.unit;
		
		if (itemUseParent.isItemSkipMode()) {
			return EnterResult.NOTENTER;
		}
		
		if (itemTargetInfo.targetUnit !== null) {
			x = itemTargetInfo.targetUnit.getMapX();
			y = itemTargetInfo.targetUnit.getMapY();
		}
		else if (itemTargetInfo.targetPos !== null) {
			x = itemTargetInfo.targetPos.x;
			y = itemTargetInfo.targetPos.y;
		}
		else {
			return EnterResult.NOTENTER;
		}
		
		if (unit.getUnitType() === UnitType.PLAYER || MapView.isVisible(x, y)) {
			return EnterResult.NOTENTER;
		}
		
		this._mapLineScroll.startLineScroll(x, y);
		
		return EnterResult.OK;
	}
}
);

var ItemMainMode = {
	ANIME: 0,
	USE: 1
};

// そのアイテム特有の処理を行う。
// たとえば、HP回復アイテムならば回復処理を行う。
var ItemMainFlowEntry = defineObject(BaseFlowEntry,
{
	_itemUseParent: null,
	_dynamicAnime: null,
	
	enterFlowEntry: function(itemUseParent) {
		this._prepareMemberData(itemUseParent);
		return this._completeMemberData(itemUseParent);
	},
	
	moveFlowEntry: function() {
		var result = MoveResult.CONTINUE;
		var mode = this.getCycleMode();
		
		if (mode === ItemMainMode.ANIME) {
			result = this._moveAnime();
		}
		else if (mode === ItemMainMode.USE) {
			result = this._moveUse();
		}
		
		return result;
	},
	
	drawFlowEntry: function() {
		var mode = this.getCycleMode();
		
		if (mode === ItemMainMode.ANIME) {
			this._drawAnime();
		}
		else if (mode === ItemMainMode.USE) {
			this._drawUse();
		}
	},
	
	_prepareMemberData: function(itemUseParent) {
		this._itemUseParent = itemUseParent;
		this._dynamicAnime = createObject(DynamicAnime);
	},
	
	_completeMemberData: function(itemUseParent) {
		var animeData = itemUseParent.getItemTargetInfo().item.getItemAnime();
		var pos = itemUseParent.getItemUseObject().getItemAnimePos(itemUseParent, animeData);
		
		if (!itemUseParent.getItemUseObject().validateItem(itemUseParent.getItemTargetInfo())) {
			return EnterResult.NOTENTER;
		}
		
		if (pos === null || itemUseParent.isItemSkipMode()) {
			return this._changeMainUse() ? EnterResult.OK : EnterResult.NOTENTER;
		}
		
		if (animeData !== null) {
			this._dynamicAnime.startDynamicAnime(animeData, pos.x, pos.y);
			this.changeCycleMode(ItemMainMode.ANIME);
			return EnterResult.OK;
		}
		
		return this._changeMainUse();
	},
	
	_moveAnime: function() {
		var result = this._dynamicAnime.moveDynamicAnime();
		
		if (result !== MoveResult.CONTINUE) {
			if (this._changeMainUse()) {
				result = MoveResult.CONTINUE;
			}
		}
		
		return result;
	},
	
	_moveUse: function() {
		return this._itemUseParent.getItemUseObject().moveMainUseCycle();
	},
	
	_drawAnime: function() {
		this._dynamicAnime.drawDynamicAnime();
	},
	
	_drawUse: function() {
		this._itemUseParent.getItemUseObject().drawMainUseCycle();
	},
	
	_changeMainUse: function() {
		var result = this._itemUseParent.getItemUseObject().enterMainUseCycle(this._itemUseParent, this._itemUseParent.isItemSkipMode()) === EnterResult.OK;
		
		if (result) {
			this.changeCycleMode(ItemMainMode.USE);
		}
		
		return result;
	}
}
);

// アイテムに設定されている経験値を取得する
var ItemExpFlowEntry = defineObject(BaseFlowEntry,
{
	_itemUseParent: null,
	_dynamicEvent: null,
	
	enterFlowEntry: function(itemUseParent) {
		this._prepareMemberData(itemUseParent);
		return this._completeMemberData(itemUseParent);
	},
	
	moveFlowEntry: function() {
		return this._dynamicEvent.moveDynamicEvent();
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(itemUseParent) {
		this._itemUseParent = itemUseParent;
		this._dynamicEvent = createObject(DynamicEvent);
	},
	
	_completeMemberData: function(itemUseParent) {
		var generator;
		var exp = this._getItemExperience(itemUseParent);
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		var unit = itemTargetInfo.unit;
		var type = unit.getUnitType();
		
		if (exp === 0 || type !== UnitType.PLAYER) {
			return EnterResult.NOTENTER;
		}
		
		generator = this._dynamicEvent.acquireEventGenerator();
		generator.experiencePlus(unit, exp, itemUseParent.isItemSkipMode());
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	_getItemExperience: function(itemUseParent) {
		var itemTargetInfo = itemUseParent.getItemTargetInfo();
		var unit = itemTargetInfo.unit;
		var exp = itemTargetInfo.item.getExp();
		
		return ExperienceCalculator.getBestExperience(unit, exp);
	}
}
);

// メニューなどで表示するためのアイテム情報を描画する
var BaseItemInfo = defineObject(BaseObject,
{
	_item: null,
	
	setInfoItem: function(item) {
		this._item = item;
	},
	
	moveItemInfoCycle: function() {
		return MoveResult.CONTINUE;
	},
	
	drawItemInfoCycle: function(x, y) {	
	},
	
	drawRange: function(x, y, rangeValue, rangeType) {
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		ItemInfoRenderer.drawKeyword(x, y, root.queryCommand('range_capacity'));
		x += ItemInfoRenderer.getSpaceX();
		
		if (rangeType === SelectionRangeType.SELFONLY) {
			TextRenderer.drawKeywordText(x, y, StringTable.Range_Self, -1, color, font);
		}
		else if (rangeType === SelectionRangeType.MULTI) {
			NumberRenderer.drawRightNumber(x, y, rangeValue);
		}
		else if (rangeType === SelectionRangeType.ALL) {
			TextRenderer.drawKeywordText(x, y, StringTable.Range_All, -1, color, font);
		}
	},
	
	getInfoPartsCount: function() {
		return 0;
	},
	
	getItemTypeName: function(name) {
		var text;
		
		if (this._item.isWand()) {
			text = StringTable.ItemWord_SuffixWand;
		}
		else {
			text = StringTable.ItemWord_SuffixItem;
		}
		
		return name + text;
	},
	
	getWindowTextUI: function() {
		return ItemInfoRenderer.getTextUI();
	}
}
);

var BaseItemPotency = defineObject(BaseObject,
{
	_value: 0,
	
	setPosMenuData: function(unit, item, targetUnit) {
	},
	
	drawPosMenuData: function(xBase, yBase, textui) {
	},
	
	getKeywordValue: function() {
		return this._value;
	},
	
	getKeywordName: function() {
		return '';
	}
}
);

// ItemControl.isItemUsableは、ユニットがそのアイテムをそもそも使用可能であるかを調べる。
// BaseItemAvailabilityは、ユニットがそのアイテムを現在使用可能であるかを調べる。
// たとえば、対象が範囲内に入っているかどうかなどを考慮する。
// BaseItemAvailabilityは自軍がアイテムを使用する場合に参照され、
// 敵軍がアイテムを使用する場合はAI処理も管理しているBaseItemAIが参照される。
var BaseItemAvailability = defineObject(BaseObject,
{
	isItemAvailableCondition: function(unit, item) {
		var rangeType = item.getRangeType();
		
		if (rangeType === SelectionRangeType.SELFONLY) {
			return this._checkSelfOnly(unit, item);
		}
		else if (rangeType === SelectionRangeType.MULTI) {
			return this._checkMulti(unit, item);
		}
		else if (rangeType === SelectionRangeType.ALL) {
			return this._checkAll(unit, item);	
		}
		
		return false;
	},
	
	isPosEnabled: function(unit, item, x, y) {
		var targetUnit;
		
		targetUnit = PosChecker.getUnitFromPos(x, y);
		if (targetUnit !== null && targetUnit !== unit) {
			if (FilterControl.isBestUnitTypeAllowed(unit.getUnitType(), targetUnit.getUnitType(), item.getFilterFlag())) {
				return this._isCondition(unit, targetUnit, item) && this.isItemAllowed(unit, targetUnit, item);
			}
		}
		
		return false;
	},
	
	isItemAllowed: function(unit, targetUnit, item) {
		return true;
	},
	
	_checkSelfOnly: function(unit, item) {
		return this._isCondition(unit, unit, item) && this.isItemAllowed(unit, unit, item);
	},
	
	_checkMulti: function(unit, item) {
		var i, index, x, y;
		var indexArray = IndexArray.createIndexArray(unit.getMapX(), unit.getMapY(), item);
		var count = indexArray.length;
		
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			if (this.isPosEnabled(unit, item, x, y)) {
				return true;
			}
		}
		
		return false;
	},
	
	_checkAll: function(unit, item) {
		var i, j, count, list, targetUnit;
		var filter = FilterControl.getBestFilter(unit.getUnitType(), item.getFilterFlag());
		var listArray = FilterControl.getListArray(filter);
		var listCount = listArray.length;
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count = list.getCount();
			for (j = 0; j < count; j++) {
				targetUnit = list.getData(j);
				if (unit !== targetUnit && this._isCondition(unit, targetUnit, item) && this.isItemAllowed(unit, targetUnit, item)) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	_isCondition: function(unit, targetUnit, item) {
		return item.getTargetAggregation().isCondition(targetUnit);
	}
}
);

var BaseItemAI = defineObject(BaseObject,
{
	getItemScore: function(unit, combination) {
		return AIValue.MIN_SCORE;
	},
	
	getUnitFilter: function(unit, item) {
		return FilterControl.getBestFilter(unit.getUnitType(), item.getFilterFlag());
	},
	
	getActionTargetType: function(unit, item) {
		if (!item.isWeapon() && item.getRangeType() === SelectionRangeType.SELFONLY) {
			return ActionTargetType.SINGLE;
		}
		
		return ActionTargetType.UNIT;
	}
}
);
