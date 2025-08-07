
var ScrollbarInput = {
	SELECT: 0,
	CANCEL: 1,
	NONE: 2,
	OPTION: 3,
	START: 4
};

var BaseScrollbar = defineObject(BaseObject,
{
	_col: 0,
	_rowCount: 0,
	_showRowCount: 0,
	_objectWidth: 0,
	_objectHeight: 0,
	_xScroll: 0,
	_yScroll: 0,
	_edgeCursor: null,
	_commandCursor: null,
	_objectArray: null,
	_isActive: false,
	_forceSelectIndex: -1,
	_isPageChange: false,
	_inputType: -1,
	_prevIndex: -1,
	
	initialize: function() {
	},
	
	moveInput: function() {
		var input;
		
		if (root.isInputAction(InputType.BTN1) || this._isScrollbarObjectPressed()) {
			this.playSelectSound();
			input = ScrollbarInput.SELECT;
		}
		else if (InputControl.isCancelAction()) {
			this.playCancelSound();
			input = ScrollbarInput.CANCEL;
		}
		else if (InputControl.isOptionAction()) {
			this.playOptionSound();
			input = ScrollbarInput.OPTION;
		}
		else if (InputControl.isStartAction()) {
			this.playStartSound();
			input = ScrollbarInput.START;
		}
		else {
			this.moveScrollbarCursor();
			input = ScrollbarInput.NONE;
		}
		
		return input;
	},
	
	moveScrollbarCursor: function() {
		var inputType = this._commandCursor.moveCursor();
		
		if (this._rowCount === 1) {
			// 横のみ項目が並ぶ場合
			this._xScroll = this._changeScrollValue(inputType, this._xScroll, true);
		}
		else {
			// 縦にも項目が並ぶ場合
			this._yScroll = this._changeScrollValue(inputType, this._yScroll, false);
		}
		
		if (this._isPageChange) {
			this._checkPage(inputType);
		}
		this._edgeCursor.moveCursor();
		
		MouseControl.checkScrollbarEdgeAction(this);
		MouseControl.checkScrollbarWheel(this);
		
		this.moveScrollbarContent();
		
		if (inputType === InputType.NONE) {
			inputType = MouseControl.moveScrollbarMouse(this);
		}
		
		this._inputType = inputType;
		
		return inputType;
	},
	
	moveScrollbarContent: function() {
		return true;
	},
	
	drawScrollbar: function(xStart, yStart) {
		var i, j, x, y, isSelect;
		var isLast = false;
		var objectCount = this.getObjectCount();
		var width = this._objectWidth + this.getSpaceX();
		var height = this._objectHeight + this.getSpaceY();
		var index = (this._yScroll * this._col) + this._xScroll;
		
		xStart += this.getScrollXPadding();
		yStart += this.getScrollYPadding();
		
		// draw系でデータの更新はするべきではないが、move系での位置参照のため例外とする
		this.xRendering = xStart;
		this.yRendering = yStart;
		MouseControl.saveRenderingPos(this);
		
		for (i = 0; i < this._rowCount; i++) {
			y = yStart + (i * height);
			
			this.drawDescriptionLine(xStart, y);
			
			for (j = 0; j < this._col; j++) {
				x = xStart + (j * width);
				
				isSelect = index === this.getIndex();
				this.drawScrollContent(x, y, this._objectArray[index], isSelect, index);
				if (isSelect && this._isActive) {
					this.drawCursor(x, y, true);
				}
				
				if (index === this._forceSelectIndex) {
					this.drawCursor(x, y, false);
				}
				
				if (++index === objectCount) {
					isLast = true;
					break;
				}
			}
			if (isLast) {
				break;
			}
		}
		
		if (this._isActive) {
			this.drawEdgeCursor(xStart, yStart);
		}
	},
	
	getScrollableData: function() {
		var d;
		var isLeft = false;
		var isTop = false;
		var isRight = false;
		var isBottom = false;
		
		if (this._rowCount === 1) {
			d = this._col + this._xScroll;
			
			// 1つでもスクロールしていれば、左向きのカーソルを表示
			isLeft = this._xScroll > 0;
			
			isRight = d < this._objectArray.length;
		}
		else {
			// 見えている範囲と、スクロールしないと見れない範囲を加算
			d = (this._showRowCount * this._col) + (this._col * this._yScroll);
			
			// 1つでもスクロールしていれば、上向きのカーソルを表示
			isTop = this._yScroll > 0;
			
			isBottom = d < this._objectArray.length;
		}
		
		return {
			isLeft: isLeft,
			isTop: isTop,
			isRight: isRight,
			isBottom: isBottom
		};
	},
	
	getRecentlyInputType: function() {
		return this._inputType;
	},
	
	drawCursor: function(x, y, isActive) {
		var pic = this.getCursorPicture();
		
		y = y - (32 - this._objectHeight) / 2;
		
		this._commandCursor.drawCursor(x, y, isActive, pic);
	},
	
	drawEdgeCursor: function(x, y) {
		var scrollableData = this.getScrollableData();
		
		this._edgeCursor.drawHorzCursor(x - this.getScrollXPadding(), y - this.getScrollYPadding(), scrollableData.isLeft, scrollableData.isRight);
		this._edgeCursor.drawVertCursor(x - this.getScrollXPadding(), y - this.getScrollYPadding(), scrollableData.isTop, scrollableData.isBottom);
	},
	
	drawDescriptionLine: function(x, y) {
		var count;
		var textui = this.getDescriptionTextUI();
		var pic = textui.getUIImage();
		var width = TitleRenderer.getTitlePartsWidth();
		var height = TitleRenderer.getTitlePartsHeight();
		
		if (pic !== null) {
			count = Math.floor(this.getScrollbarWidth() / width) - 1;
			TitleRenderer.drawTitle(pic, x - 14, y + this._objectHeight - 47, width, height, count);
		}
	},
	
	drawScrollContent: function(x, y, object, isSelect, index) {
	},
	
	setScrollFormation: function(col, showRowCount) {
		this._objectArray = [];
		this.setScrollFormationInternal(col, showRowCount);
	},
	
	setScrollFormationInternal: function(col, showRowCount) {
		this._commandCursor = createObject(CommandCursor);
		
		this._col = col;
		this._showRowCount = showRowCount;
		
		this._objectWidth = this.getObjectWidth();
		this._objectHeight = this.getObjectHeight();
		
		this._edgeCursor = createObject(EdgeCursor);
		this._edgeCursor.setEdgeRange(this.getScrollbarWidth(), this.getScrollbarHeight());
	},
	
	resetScrollData: function() {
		this._objectArray = [];
		this._xScroll = 0;
		this._yScroll = 0;
		this._rowCount = 0;
	},
	
	objectSet: function(obj) {
		this._objectArray.push(obj);
	},
	
	objectSetEnd: function() {
		var objectCount = this._objectArray.length;
		
		if (this._col === 1) {
			this._commandCursor.setCursorUpDown(objectCount);
		}
		else if (this._showRowCount === 1) {
			this._commandCursor.setCursorLeftRight(objectCount);
		}
		else {
			this._commandCursor.setCursorCross(objectCount, this._col);
		}
		
		this._rowCount = Math.ceil(objectCount / this._col);
		if (this._rowCount > this._showRowCount) {
			this._rowCount = this._showRowCount;
		}
		
		// 以前のインデックス数が新しいカウントを超過していないか検証
		this._commandCursor.validate(); 
	},
	
	setObjectArray: function(objectArray) {
		var i;
		var length = objectArray.length;
		
		this.resetScrollData();
		
		for (i = 0; i < length; i++) {
			this.objectSet(objectArray[i]);
		}
		
		this.objectSetEnd();
	},
	
	setDataList: function(list) {
		var i, count, data;
		
		this.resetScrollData();
		
		count = list.getCount();
		for (i = 0; i < count; i++) {
			data = list.getData(i);
			this.objectSet(data);
		}
		
		this.objectSetEnd();
	},
	
	cut: function(index) {
		this._objectArray.splice(index, 1);
	},
	
	getIndex: function() {
		return this._commandCursor.getCommandCursorIndex();
	},
	
	setIndex: function(index) {
		var pos;
		
		this._commandCursor.setCommandCursorIndex(index);
		
		if (this._rowCount === 1) {
			// 横にのみ項目が並ぶ場合
			pos = index + 1;
			if (pos > this._col) {
				this._xScroll = pos - this._col;
			}
			else {
				this._xScroll = 0;
			}
		}
		else {
			// 縦にも項目が並ぶ場合
			pos = Math.floor(index / this._col) + 1;
			if (pos > this._rowCount) {
				this._yScroll = pos - this._rowCount;
			}
			else {
				this._yScroll = 0;
			}
		}
	},
	
	getObject: function() {
		return this.getObjectFromIndex(this.getIndex());
	},
	
	getObjectFromIndex: function(index) {
		if (this._objectArray === null || this._objectArray.length === 0) {
			return null;
		}
		
		return this._objectArray[index];
	},
	
	getIndexFromObject: function(object) {
		var i;
		var count = this._objectArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._objectArray[i] === object) {
				return i;
			}
		}
		
		return -1;
	},
	
	getObjectCount: function() {
		return this._objectArray.length;
	},
	
	getCol: function() {
		return this._col;
	},
	
	getRowCount: function() {
		return this._rowCount;
	},
	
	getShowRowCount: function() {
		return this._showRowCount;
	},
	
	getCursorPicture: function() {
		return root.queryUI('menu_selectCursor');
	},
	
	enableSelectCursor: function(isActive) {
		if (isActive) {
			this.setForceSelect(-1);
		}
		else {
			this.setForceSelect(this.getIndex());
		}
		
		this.setActive(isActive);
	},
	
	setActive: function(isActive) {
		if (isActive) {
			MouseControl.setActiveScrollbar(this);
		}
		
		this._isActive = isActive;
	},
	
	setActiveSingle: function(isActive) {
		this._isActive = isActive;
	},
	
	setForceSelect: function(index) {
		this._forceSelectIndex = index;
	},
	
	getForceSelectIndex: function() {
		return this._forceSelectIndex;
	},
	
	enablePageChange: function() {
		this._isPageChange = true;
	},
	
	getScrollXValue: function() {
		return this._xScroll;
	},
	
	getScrollYValue: function() {
		return this._yScroll;
	},
	
	setScrollXValue: function(x) {
		this._xScroll = x;
	},
	
	setScrollYValue: function(y) {
		this._yScroll = y;
	},
	
	getScrollXPadding: function() {
		return 0;
	},
	
	getScrollYPadding: function() {
		return 0;
	},
	
	getSpaceX: function() {
		return 0;
	},
	
	getSpaceY: function() {
		return 0;
	},
	
	getObjectWidth: function() {
		return 0;
	},
	
	getObjectHeight: function() {
		return 0;
	},
	
	getScrollbarWidth: function() {
		return (this._col * this._objectWidth) + ((this._col - 1) * this.getSpaceX());
	},
	
	getScrollbarHeight: function() {
		return (this._showRowCount * this._objectHeight) + ((this._showRowCount - 1) * this.getSpaceY());
	},
	
	getParentTextUI: function() {
		return this.getParentInstance().getWindowTextUI();
	},
	
	getDescriptionTextUI: function() {
		return root.queryTextUI('description_title');
	},
	
	playSelectSound: function() {
		MediaControl.soundDirect('commandselect');
	},
	
	playCancelSound: function() {
		MediaControl.soundDirect('commandcancel');
	},
	
	playPageCursorSound: function() {
		MediaControl.soundDirect('commandcursor');
	},
	
	playOptionSound: function() {
		// Option時の効果音はその時々に応じて最適なものあると思われるため、ここで実装しない
	},
	
	playStartSound: function() {
		// Start時の効果音はその時々に応じて最適なものあると思われるため、ここで実装しない
	},

	getEdgeCursor: function() {
		return this._edgeCursor;
	},
	
	getCommandCursor: function() {
		return this._commandCursor;
	},
	
	saveScroll: function() {
		this._saveScrollY = this._yScroll;
	},
	
	restoreScroll: function() {
		if ((this._saveScrollY - 1) + this._showRowCount <= this.getIndex()) {
			// カーソルが見えなくなることを防ぐため、スクロール値を下げない
		}
		else if (this._saveScrollY > 0) {
			this._saveScrollY--;
		}
		
		this._yScroll = this._saveScrollY;
	},
	
	checkAndUpdateIndex: function() {
		var index = this.getIndex();
		var isChanged = this._prevIndex !== index;
		
		if (isChanged) {
			this._prevIndex = index;
		}
		
		return isChanged;
	},
	
	resetPreviousIndex: function() {
		this._prevIndex = -1;
	},
	
	_changeScrollValue: function(input, scrollValue, isHorz) {
		var showRange, div, pos, max;
		var objectCount = this._objectArray.length;
		
		if (isHorz) {
			showRange = this._col;
			div = 1;
			pos = this._commandCursor.getCommandCursorIndex();
		}
		else {
			showRange = this._showRowCount;
			div = this._col;
			pos = Math.floor(this._commandCursor.getCommandCursorIndex() / this._col);
		}
		
		if (input === DirectionType.LEFT || input === DirectionType.TOP) {
			if (pos + 1 === scrollValue) {
				// 表示範囲の最上部に到達したから、スクロールする
				scrollValue--;
			}
			else if (this._commandCursor.getCommandCursorIndex() === objectCount - 1) {
				// index値が最大値になったため、スクロール値も最大値にする
				max = objectCount - (showRange * div);
				if (max < 0) {
					scrollValue = 0;
				}
				else {
					scrollValue = Math.ceil(max / div);
				}
			}
		}
		else if (input === DirectionType.RIGHT || input === DirectionType.BOTTOM) {
			if (pos === showRange + scrollValue) {
				// 表示範囲の最下部に到達したから、スクロールする
				scrollValue++;
			}
			else if (this._commandCursor.getCommandCursorIndex() === 0) {
				// index値が初期値になったため、スクロール値も初期値にする
				scrollValue = 0;
			}
		}
		
		return scrollValue;
	},
	
	_checkPage: function(inputType) {
		var d;
		var isChange = false;
		var index = this.getIndex();
		var yScroll = this.getScrollYValue();
		var showRowCount = this.getShowRowCount();
		
		if (inputType === InputType.LEFT) {
			if (this.getObjectCount() > showRowCount) {
				d = this._getPageValue(yScroll, showRowCount * -1);
				yScroll -= d;
				index -= d;
				isChange = true;
			}
		}
		else if (inputType === InputType.RIGHT) {
			if (this.getObjectCount() > showRowCount) {
				d = this._getPageValue(yScroll, showRowCount);
				yScroll += d;
				index += d;
				isChange = true;
			}
		}
		
		if (isChange) {
			if (index !== this.getIndex()) {
				this.setIndex(index);
				this.setScrollYValue(yScroll);
				this.playPageCursorSound();
			}
		}
	},
	
	_getPageValue: function(yScroll, n) {
		var d;
		var yMin = 0;
		var yMax = this.getObjectCount() - this.getShowRowCount();
		
		if (n < 0 && yScroll === yMin) {
			// 最後のページに移動
			return -yMax;
		}
		else if (n > 0 && yScroll === yMax) {
			// 最初のページに移動
			return -yMax;
		}
		
		d = yScroll + n;
		if (yMin >= d) {
			d = yScroll;
		}
		else if (yMax < d) {
			d = yMax - yScroll;
		}
		else {
			d = this.getShowRowCount();
		}
		
		return d;
	},
	
	_isScrollbarObjectPressed: function() {
		return MouseControl.isScrollbarObjectPressed(this);
	}
}
);
