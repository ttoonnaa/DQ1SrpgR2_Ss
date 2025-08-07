
var KeyItemSelection = defineObject(BaseItemSelection,
{
	_keyData: null,
	
	setInitialSelection: function() {
		this._keyData = KeyEventChecker.buildKeyDataItem(this._item, KeyFlag.ALL);
		
		// 現在の位置で鍵を使うか調べる
		if (this._keyData.rangeType === SelectionRangeType.SELFONLY) {
			// その位置がイベントであるかを調べる
			if (KeyEventChecker.getKeyEvent(this._unit.getMapX(), this._unit.getMapY(), this._keyData) === null) {
				this._isSelection = false;
				return EnterResult.NOTENTER;
			}
			
			// 現在位置にイベントがあるため選択可能とする
			this._isSelection = true;
			return EnterResult.NOTENTER;
		}
		else {
			this.setPosSelection();
		}
		
		return EnterResult.OK;
	},
	
	setPosSelection: function() {
		var indexArray = KeyEventChecker.getIndexArrayFromKeyType(this._unit, this._keyData);
		
		this._posSelector.setPosOnly(this._unit, this._item, indexArray, PosMenuType.Item);
		
		this.setFirstPos();
	},
	
	moveItemSelectionCycle: function() {
		var result = this._posSelector.movePosSelector();
	
		if (result === PosSelectorResult.SELECT) {
			if (this.isPosSelectable()) {
				// 選択した位置を記録する
				this._targetPos = this._posSelector.getSelectorPos(false);
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
	
	isPosSelectable: function() {
		var event;
		var pos = this._posSelector.getSelectorPos(true);
		
		if (pos === null) {
			return false;
		}
		
		event = KeyEventChecker.getKeyEvent(pos.x, pos.y, this._keyData);
		if (event === null) {
			return false;
		}
		
		return true;
	}
}
);

var KeyItemUse = defineObject(BaseItemUse,
{
	_itemUseParent: null,
	_eventTrophy: null,
	
	enterMainUseCycle: function(itemUseParent) {
		var event;
		
		this._itemUseParent = itemUseParent;
		
		event = this._getEvent();
		if (event === null) {
			// イベントがなければ、鍵を使うことはできないため終了する。
			// 鍵を使っていないため、使用数は減らさない。
			itemUseParent.disableItemDecrement();
			return EnterResult.NOTENTER;
		}
		
		// 通常、アイテムを減らす処理はBaseItemUseが行うが、KeyItemUseではこの時点で行っている。
		// 鍵の使用によってアイテムを入手し、それによりアイテムが一杯になることがあるが、
		// このときに既に使い切った鍵が表示されないようにするためである。
		itemUseParent.decreaseItem();
		
		// 既に減らしているため無効にする
		itemUseParent.disableItemDecrement();
		
		this._eventTrophy = createObject(EventTrophy);
		
		return this._eventTrophy.enterEventTrophyCycle(this._itemUseParent.getItemTargetInfo().unit, event);
	},
	
	moveMainUseCycle: function() {
		return this._eventTrophy.moveEventTrophyCycle();
	},
	
	drawMainUseCycle: function() {
		this._eventTrophy.drawEventTrophyCycle();
	},
	
	getItemAnimePos: function(itemUseParent, animeData) {
		var targetPos = itemUseParent.getItemTargetInfo().targetPos;
		var x = LayoutControl.getPixelX(targetPos.x);
		var y = LayoutControl.getPixelY(targetPos.y);
		
		return LayoutControl.getMapAnimationPos(x, y, animeData);
	},
	
	validateItem: function(itemTargetInfo) {
		return true;
	},
	
	_getEvent: function() {
		var itemTargetInfo = this._itemUseParent.getItemTargetInfo();
		var targetPos = itemTargetInfo.targetPos;
		var keyInfo = itemTargetInfo.item.getKeyInfo();
		
		return PosChecker.getKeyEvent(targetPos.x, targetPos.y, keyInfo.getKeyFlag());
	}
}
);

var KeyItemInfo = defineObject(BaseItemInfo,
{
	drawItemInfoCycle: function(x, y) {
		ItemInfoRenderer.drawKeyword(x, y, this.getItemTypeName(StringTable.ItemInfo_Key));
		y += ItemInfoRenderer.getSpaceY();
	
		this._drawValue(x, y);
		y += ItemInfoRenderer.getSpaceY();
		
		if (!KeyEventChecker.isPairKey(this._item)) {
			this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
		}
	},
	
	getInfoPartsCount: function() {
		var n = 0;
		
		if (!KeyEventChecker.isPairKey(this._item)) {
			n++;
		}
		
		return 2 + n;
	},
	
	_drawValue: function(x, y) {
		var keyInfo = this._item.getKeyInfo();
		var dx = 0;
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		ItemInfoRenderer.drawKeyword(x, y, StringTable.Key_Target);
		x += ItemInfoRenderer.getSpaceX();
		
		if (keyInfo.getKeyFlag() & KeyFlag.GATE) {
			TextRenderer.drawKeywordText(x, y, StringTable.Key_Gate, -1, color, font);
			dx = 40;
		}
		
		if (keyInfo.getKeyFlag() & KeyFlag.TREASURE) {
			TextRenderer.drawKeywordText(x + dx, y, StringTable.Key_Treasure, -1, color, font);
		}
	}
}
);

var KeyItemPotency = defineObject(BaseItemPotency,
{
}
);

var KeyItemAvailability = defineObject(BaseItemAvailability,
{
	isItemAvailableCondition: function(unit, item) {
		var keyData = KeyEventChecker.buildKeyDataItem(item, KeyFlag.ALL);
		
		return KeyEventChecker.getIndexArrayFromKeyType(unit, keyData).length > 0;
	}
}
);

var KeyItemAI = defineObject(BaseItemAI,
{
	getItemScore: function(unit, combination) {
		// 鍵開けを優先するため高い値を返す
		return 300;
	},
	
	getActionTargetType: function(unit, item) {
		return ActionTargetType.KEY;
	}
}
);
