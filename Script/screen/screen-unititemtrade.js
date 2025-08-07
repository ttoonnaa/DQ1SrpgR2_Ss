
var UnitItemTradeResult = {
	TRADEEND: 0,
	TRADENO: 1
};

var UnitItemTradeScreen = defineObject(BaseScreen,
{
	_unitSrc: null,
	_unitDest: null,
	_isSrcScrollbarActive: false,
	_isSelect: false,
	_selectIndex: 0,
	_isSrcSelect: false,
	_maxItemCount: 0,
	_resultCode: 0,
	_itemListSrc: null,
	_itemListDest: null,
	_unitWindowSrc: null,
	_unitWindowDest: null,
	_itemInfoWindow: null,
	_srcPrevItemArray: null,
	_destPrevItemArray: null,
	
	setScreenData: function(screenParam) {
		this._prepareScreenMemberData(screenParam);
		this._completeScreenMemberData(screenParam);
	},
	
	moveScreenCycle: function() {
		var input;
		var result = MoveResult.CONTINUE;
		
		if (this._isSrcScrollbarActive) {
			input = this._itemListSrc.moveWindow();
		}
		else {
			input = this._itemListDest.moveWindow();
		}
		
		if (input === ScrollbarInput.SELECT) {
			result = this._moveTradeSelect();
		}
		else if (input === ScrollbarInput.CANCEL) {
			result = this._moveTradeCancel();
		}
		else if (input === ScrollbarInput.NONE) {
			result = this._moveTradeNone();
		}
		
		return result;
	},
	
	drawScreenCycle: function() {
		var xSpace = this._getItemIntervalX();
		var yLine = this._unitWindowSrc.getWindowHeight();
		var width = (this._itemListSrc.getWindowWidth() * 2) + xSpace;
		var x = LayoutControl.getCenterX(-1, width);
		var y = this._getStartY();
		
		this._unitWindowSrc.drawWindow(x, y);
		this._itemListSrc.drawWindow(x, y + yLine);
		
		x += this._itemListSrc.getWindowWidth() + xSpace;
		this._unitWindowDest.drawWindow(x, y);
		this._itemListDest.drawWindow(x, y + yLine);
	},
	
	getScreenInteropData: function() {
		return root.queryScreen('UnitItemTrade');
	},
	
	getScreenResult: function() {
		return this._resultCode;
	},
	
	_prepareScreenMemberData: function(screenParam) {
		this._unitSrc = screenParam.unit;
		this._unitDest = screenParam.targetUnit;
		this._isSrcScrollbarActive = true;
		this._isSelect = false;
		this._selectIndex = 0;
		this._isSrcSelect = true;
		this._maxItemCount = DataConfig.getMaxUnitItemCount();
		this._resultCode = UnitItemTradeResult.TRADENO;
		this._itemListSrc = createWindowObject(ItemListWindow, this);
		this._itemListDest = createWindowObject(ItemListWindow, this);
		this._unitWindowSrc = createWindowObject(UnitSimpleWindow, this);
		this._unitWindowDest = createWindowObject(UnitSimpleWindow, this);
		this._itemInfoWindow = createWindowObject(ItemInfoWindow, this);
		this._srcPrevItemArray = new Array(this._maxItemCount);
		this._destPrevItemArray = new Array(this._maxItemCount);
	},
	
	_completeScreenMemberData: function(screenParam) {
		var count = LayoutControl.getObjectVisibleCount(ItemRenderer.getItemHeight(), 15) - 3;
		
		if (count > DataConfig.getMaxUnitItemCount()) {
			count = DataConfig.getMaxUnitItemCount();
		}
		
		this._itemListSrc.setItemFormation(count);
		this._itemListSrc.setItemIndex(0);
		this._itemListSrc.enableWarningState(true);
		
		this._itemListDest.setItemFormation(count);
		this._itemListDest.setItemIndex(0);
		this._itemListDest.enableWarningState(true);
		
		this._arrangeItemArray(true, this._unitSrc, this._srcPrevItemArray);
		this._arrangeItemArray(true, this._unitDest, this._destPrevItemArray);
		
		this._itemListSrc.setActive(true);
		
		this._updateListWindow();
	},
	
	_moveTradeSelect: function() {
		// アイテムを選択している状態で選択キーを押したか調べる
		if (this._isSelect) {
			if (!this._isTradable()) {
				this._playWarningSound();
				return MoveResult.CONTINUE;
			}
			
			// アイテムを入れ替える
			this._exchangeItem();
			
			// 入れ替えに伴いウインドウを更新
			this._updateListWindow();

			// 選択状態を解除する
			this._selectCancel();
			
			// アイテムの変更による更新を行う
			ItemControl.updatePossessionItem(this._unitSrc);
			ItemControl.updatePossessionItem(this._unitDest);
			
		}
		else {
			// 選択した位置を保存
			this._selectIndex = this._getTargetIndex();
			
			// 選択したのは交換元か交換先かの保存
			this._isSrcSelect = this._isSrcScrollbarActive;
			
			// 選択状態に設定
			this._isSelect = true;
			
			// setForceSelectを呼び出すことで、選択した位置にカーソルが常に表示されるようにする
			if (this._isSrcSelect) {
				this._itemListSrc.setForceSelect(this._selectIndex);
			}
			else {
				this._itemListDest.setForceSelect(this._selectIndex);
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveTradeCancel: function() {
		var isNoTrade;
		var result = MoveResult.CONTINUE;
		
		if (this._isSelect) {
			// 選択状態でのキャンセルは、単純に選択状態を解除するのみ
			this._selectCancel();
		}
		else {	
			isNoTrade = this._arrangeItemArray(false, this._unitSrc, this._srcPrevItemArray) && this._arrangeItemArray(false, this._unitDest, this._destPrevItemArray);
			if (isNoTrade) {
				this._resultCode = UnitItemTradeResult.TRADENO;
				result = MoveResult.END;
			}
			else {
				this._resultCode = UnitItemTradeResult.TRADEEND;
				result = MoveResult.END;
			}
		}
		
		return result;
	},
	
	_moveTradeNone: function() {
		var item, isChanged;
		var isHorz = InputControl.isInputAction(InputType.LEFT) || InputControl.isInputAction(InputType.RIGHT);
		
		// カーソルが左右に動いたか調べる
		if (isHorz) {
			this._playCursorSound();
			if (this._isSrcScrollbarActive) {
				this._setActive(false);
				this._isSrcScrollbarActive = false;
			}
			else {
				this._isSrcScrollbarActive = true;
				this._setActive(true);
			}
		}
		else {
			this._checkTracingTrade();
		}
		
		if (this._isSrcScrollbarActive) {
			item = this._getSelectedItem(this._itemListSrc);
			isChanged = this._itemListSrc.isIndexChanged();
		}
		else {
			item = this._getSelectedItem(this._itemListDest);
			isChanged = this._itemListDest.isIndexChanged();
		}
		
		if (isChanged) {
			this._itemInfoWindow.setInfoItem(item);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_getSelectedItem: function(itemList) {
		var scrollbar = itemList.getItemScrollbar();
		var index = scrollbar.getForceSelectIndex();
		
		if (index === -1) {
			return scrollbar.getObject();
		}
		
		return scrollbar.getObjectFromIndex(index);
	},
	
	_isTradable: function() {
		// 交換元と交換先が同一である場合は並び替えなので許可してよい
		if (this._isSrcSelect === this._isSrcScrollbarActive) {
			return true;
		}
		
		if (this._isTradeDisabled(this._unitSrc, this._getSelectedItem(this._itemListSrc))) {
			return false;
		}
		
		if (this._isTradeDisabled(this._unitDest, this._getSelectedItem(this._itemListDest))) {
			return false;
		}
		
		return true;
	},
	
	_isTradeDisabled: function(unit, item) {
		if (item === null) {
			return false;
		}
		
		return Miscellaneous.isTradeDisabled(unit, item);
	},
	
	_setActive: function(isSrc) {
		if (isSrc) {
			this._itemListSrc.getItemScrollbar().setActiveSingle(true);
			this._itemListDest.getItemScrollbar().setActiveSingle(false);
		}
		else {
			this._itemListDest.getItemScrollbar().setActiveSingle(true);
			this._itemListSrc.getItemScrollbar().setActiveSingle(false);
		}
	},
	
	_exchangeItem: function() {
		var unitSrc = this._getTargetUnit(this._isSrcSelect);
		var unitDest = this._getTargetUnit(this._isSrcScrollbarActive);
		var srcIndex = this._selectIndex;
		var destIndex = this._getTargetIndex();
		var itemSrc = unitSrc.getItem(srcIndex);
		var itemDest = unitDest.getItem(destIndex);
		
		UnitItemControl.setItem(unitSrc, srcIndex, itemDest);
		UnitItemControl.setItem(unitDest, destIndex, itemSrc);
		UnitItemControl.arrangeItem(unitSrc);
		UnitItemControl.arrangeItem(unitDest);
	},
	
	_selectCancel: function() {
		this._isSelect = false;
		this._itemListSrc.setForceSelect(-1);
		this._itemListDest.setForceSelect(-1);
	},
	
	_arrangeItemArray: function(isSave, unit, arr) {
		var i, result;
		
		if (isSave) {
			// 現在のアイテムの配列を保存
			for (i = 0; i < this._maxItemCount; i++) {
				arr[i] = unit.getItem(i);
			}
			result = true;
		}
		else {
			// 保存していおいた配列内のアイテムと現在のアイテムを比較
			for (i = 0; i < this._maxItemCount; i++) {
				if (arr[i] !== unit.getItem(i)) {
					break;
				}
			}
			
			if (i === this._maxItemCount) {
				result = true;
			}
			else {
				result = false;
			}
		}
		
		return result;
	},
	
	_getTargetUnit: function(isSrc) {
		var unit;
		
		if (isSrc) {
			unit = this._unitSrc;
		}
		else {
			unit = this._unitDest;
		}
		
		return unit;
	},
	
	_getTargetIndex: function() {
		var index;
		
		if (this._isSrcScrollbarActive) {
			index = this._itemListSrc.getItemIndex();
		}
		else {
			index = this._itemListDest.getItemIndex();
		}
		
		return index;
	},
	
	_updateListWindow: function() {
		this._itemListSrc.setUnitMaxItemFormation(this._unitSrc);
		this._itemListDest.setUnitMaxItemFormation(this._unitDest);
		
		this._unitWindowSrc.setFaceUnitData(this._unitSrc);
		this._unitWindowDest.setFaceUnitData(this._unitDest);
	},
	
	_getItemIntervalX: function() {
		return 30;
	},
	
	_getStartY: function() {
		var height = this._unitWindowSrc.getWindowHeight() + this._itemListSrc.getWindowHeight();
		
		return LayoutControl.getCenterY(-1, height);
	},
	
	_playCursorSound: function() {
		MediaControl.soundDirect('commandcursor');
	},
	
	_playWarningSound: function() {
		MediaControl.soundDirect('operationblock');
	},
	
	_checkTracingTrade: function() {
		var scrollbar, index;
		
		if (this._isSrcScrollbarActive) {
			scrollbar = this._itemListDest.getItemScrollbar();
		}
		else {
			scrollbar = this._itemListSrc.getItemScrollbar();
		}
		
		index = MouseControl.pointMouse(scrollbar);
		if (index !== -1) {
			if (this._isSrcScrollbarActive) {
				this._setActive(false);
				this._isSrcScrollbarActive = false;
			}
			else {
				this._isSrcScrollbarActive = true;
				this._setActive(true);
			}
			
			scrollbar.setIndex(index);
		}
	}
}
);


//------------------------------------------------------------------


var UnitItemStealScreen = defineObject(UnitItemTradeScreen,
{
	_stealFlag: 0,
	_dropTrophyArray: null,
	
	moveScreenCycle: function() {
		var result = UnitItemTradeScreen.moveScreenCycle.call(this);
		
		if (result === MoveResult.END) {
			// 盗まれたアイテムと同一idのアイテムがドロップトロフィーに含まれる場合は、そのトロフィーも削除される。
			// 盗むことによってアイテムを手に入れ、撃破することでもアイテムが手に入るということを防いでいる。
			this._checkDropTrophy(this._unitDest);
		}
		
		return result;
	},
	
	getScreenInteropData: function() {
		return root.queryScreen('UnitItemSteal');
	},
	
	_prepareScreenMemberData: function(screenParam) {
		UnitItemTradeScreen._prepareScreenMemberData.call(this, screenParam);
		this._stealFlag = screenParam.stealFlag;
	},
	
	_completeScreenMemberData: function(screenParam) {
		UnitItemTradeScreen._completeScreenMemberData.call(this, screenParam);
		this._dropTrophyArray = this._createDropArray(screenParam.targetUnit);
	},
	
	_createDropArray: function(unit) {
		var i, j, trophy, dropItem, count2;
		var list = unit.getDropTrophyList();
		var count = list.getCount();
		var arr = [];
		
		for (i = 0; i < count; i++) {
			trophy = list.getData(i);
			if (!(trophy.getFlag() & TrophyFlag.ITEM)) {
				continue;
			}
			
			dropItem = trophy.getItem();
			count2 = UnitItemControl.getPossessionItemCount(unit);
			for (j = 0; j < count2; j++) {
				if (ItemControl.compareItem(dropItem, UnitItemControl.getItem(unit, j))) {
					// トロフィーと同一のアイテムを所持しているから、そのトロフィーを保存
					arr.push(trophy);
					break;
				}
			}
		}
		
		return arr;
	},
	
	_checkDropTrophy: function(unit) {
		var i, j, trophy, count2;
		var count = this._dropTrophyArray.length;
		
		for (i = 0; i < count; i++) {
			trophy = this._dropTrophyArray[i];
			count2 = UnitItemControl.getPossessionItemCount(unit);
			for (j = 0; j < count2; j++) {
				if (ItemControl.compareItem(trophy.getItem(), UnitItemControl.getItem(unit, j))) {
					break;
				}
			}
			
			// トロフィーと同一のアイテムを所持しなくったから、トロフィーを削除
			if (j === count2) {
				root.getCurrentSession().getTrophyEditor().deleteTrophy(unit.getDropTrophyList(), trophy);
			}
		}
	},
	
	_moveTradeSelect: function() {
		var isNoTrade;
		var result = UnitItemTradeScreen._moveTradeSelect.call(this);
		
		// 複数個盗めない場合は、変更があった時点で交換終了とする
		if (!(this._stealFlag & StealFlag.MULTI)) {
			isNoTrade = this._arrangeItemArray(false, this._unitDest, this._destPrevItemArray);
			if (!isNoTrade) {
				this._resultCode = UnitItemTradeResult.TRADEEND;
				result = MoveResult.END;
			}
		}
		
		return result;
	},
	
	_isTradable: function() {
		// 「盗む」では、アイテムを並び替えれない。
		// 敵の場合は、並び替えを通じて武器の順番の変更を防ぐ。
		// 自軍の場合は、アイテムの並び替えを通じて経験値を取得するのを防ぐ。
		if (this._isSrcSelect === this._isSrcScrollbarActive) {
			return false;
		}
		
		if (this._isTradeDisabled(this._unitSrc, this._getSelectedItem(this._itemListSrc))) {
			return false;
		}
		
		if (this._isTradeDisabled(this._unitDest, this._getSelectedItem(this._itemListDest))) {
			return false;
		}
		
		return true;
	},
	
	_isTradeDisabled: function(unit, item) {
		if (item === null) {
			return false;
		}
		
		if (unit.getUnitType() === UnitType.PLAYER && item.isImportance()) {
			// 自軍が所持している重要アイテムは交換できない
			return true;
		}
		
		return Miscellaneous.isStealTradeDisabled(this._unitSrc, item, this._stealFlag);
	}
}
);
