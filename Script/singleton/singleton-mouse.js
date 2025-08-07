
var MouseType = {
	MOV: 0,
	LEFT: 1,
	RIGHT: 2,
	CENTER: 3,
	DOWNWHEEL: 4,
	UPWHEEL: 5
};

var MouseControl = {
	_activeScrollbar: null,
	_prevScrollbar: null,
	_mouseLineScroll: null,
	_isSideScrollX: false,
	_isSideScrollY: false,
	_edgeCursor: null,
	
	initSingleton: function() {
		this._edgeCursor = createObject(EdgeMapSideCursor);
		this._mouseLineScroll = createObject(MouseLineScroll);
	},
	
	prepareMouseControl: function() {
		var dx = GraphicsFormat.MAPCHIP_WIDTH * 2;
		var dy = GraphicsFormat.MAPCHIP_HEIGHT * 2;
		
		this._edgeCursor.setEdgeRange(root.getGameAreaWidth() - dx, root.getGameAreaHeight() - dy);
	},
	
	isMouseMoving: function() {
		return this._mouseLineScroll.isMoving();
	},
	
	// マウスカーソルを目標位置に自動で移動させる
	moveAutoMouse: function() {
		this._mouseLineScroll.moveLineScroll();
		
		if (this._isSideScrollX || this._isSideScrollY) {
			this._checkSideScroll();
		}
		
		this._edgeCursor.moveCursor();
	},
	
	// マップ上でマウスが移動したかを調べる
	moveMapMouse: function(mapCursor) {
		// マウスが動いていない場合は続行しない
		if (!root.isMouseAction(MouseType.MOV)) {
			return;
		}
		
		// カーソル位置が画面端の可能性もあるため、スクロール確認フラグを立てる
		this._isSideScrollX = true;
		this._isSideScrollY = true;
		
		// マウスの位置に対応するようにマップカーソルを更新
		this._adjustMapCursor();
	},
	
	// スクロールバー上でマウスが移動したかを調べる
	moveScrollbarMouse: function(scrollbar) {
		var index;
		
		// マウスが動いていない場合は続行しない
		if (!root.isMouseAction(MouseType.MOV)) {
			return InputType.NONE;
		}
		
		// 現在のマウスカーソルの位置に相当する項目のインデックスを取得
		index = this.getIndexFromMouse(scrollbar);
		if (index === -1) {
			return InputType.NONE;
		}
		
		if (scrollbar.getIndex() !== index) {
			this._playHoverSound();
		}
		
		// scrollbar.setIndexは呼び出さない
		scrollbar.getCommandCursor().setCommandCursorIndex(index);
		
		return InputType.MOUSE;
	},
	
	// 現在のマウスカーソルに対応する項目のインデックスを取得
	getIndexFromMouse: function(scrollbar) {
		var i, j, x, y, xCursor, yCursor;
		var col = scrollbar.getCol();
		var rowCount = scrollbar.getRowCount();
		var width = scrollbar.getObjectWidth() + scrollbar.getSpaceX();
		var height = scrollbar.getObjectHeight() + scrollbar.getSpaceY();
		var index = 0;
		var n = (scrollbar.getScrollYValue() * scrollbar.getCol()) + scrollbar.getScrollXValue();
		var xStart = scrollbar.xRendering;
		var yStart = scrollbar.yRendering;
		
		if (!this._isMouseEnabled()) {
			return -1
		}
		
		xCursor = root.getMouseX() - root.getViewportX();
		yCursor = root.getMouseY() - root.getViewportY();
		
		for (i = 0; i < rowCount; i++) {
			y = yStart + (i * height);
			for (j = 0; j < col; j++) {
				if (index + n >= scrollbar.getObjectCount()) {
					return -1;
				}
				x = xStart + (j * width);
				if (xCursor >= x && xCursor <= x + scrollbar.getObjectWidth()) {
					if (yCursor >= y && yCursor <= y + scrollbar.getObjectHeight()) {
						return index + n;
					}
				}
				index++;
			}
		}
		
		return -1;
	},
		
	pointMouse: function(scrollbar) {
		// マウスが動いていない場合は続行しない
		if (!root.isMouseAction(MouseType.MOV)) {
			return InputType.NONE;
		}
		
		return this.getIndexFromMouse(scrollbar);
	},
	
	// 新しくアクティブになったスクロールバーを保存する
	setActiveScrollbar: function(scrollbar) {
		this._prevScrollbar = this._activeScrollbar;
		this._activeScrollbar = scrollbar;
	},
	
	isInputAction: function(type) {
		return root.isMouseAction(type);
	},
	
	// スクロールバーの項目をクリックしたかを調べる
	isScrollbarObjectPressed: function(scrollbar) {
		var index;
		
		// クリックされていない場合は続行しない
		if (!root.isMouseAction(MouseType.LEFT)) {
			return false;
		}
		
		index = this.getIndexFromMouse(scrollbar);
		if (index === -1) {
			// クリックした位置は項目内ではなかった
			return false;
		}
		
		scrollbar.getCommandCursor().setCommandCursorIndex(index);
		
		return true;
	},
	
	isRangePressed: function(range) {
		// クリックされていない場合は続行しない
		if (!root.isMouseAction(MouseType.LEFT)) {
			return false;
		}
		
		return this.isHovering(range);
	},
	
	isHovering: function(range) {
		var x = root.getMouseX() - root.getViewportX();
		var y = root.getMouseY() - root.getViewportY();
		
		return isRangeIn(x, y, range);
	},
	
	// スクロールバーのスクロールカーソルがクリックされたかを調べる
	checkScrollbarEdgeAction: function(scrollbar) {
		var range;
		var scrollableData = scrollbar.getScrollableData();
		var edgeCursor = scrollbar.getEdgeCursor();
		var x = root.getMouseX() - root.getViewportX();
		var y = root.getMouseY() - root.getViewportY();
		var xStart = scrollbar.xRendering;
		var yStart = scrollbar.yRendering;
		
		// クリックされていない場合は続行しない
		if (!root.isMouseAction(MouseType.LEFT)) {
			return false;
		}
		
		if (scrollableData.isLeft) {
			range = edgeCursor.getLeftEdgeRange(xStart, yStart);
			if (isRangeIn(x, y, range)) {
				// カーソルの領域がクリックされたため、スクロールさせる
				scrollbar.setScrollXValue(scrollbar.getScrollXValue() - 1);
				return true;
			}
		}
		if (scrollableData.isTop) {
			range = edgeCursor.getTopEdgeRange(xStart, yStart);
			if (isRangeIn(x, y, range)) {
				scrollbar.setScrollYValue(scrollbar.getScrollYValue() - 1);
				return true;
			}
		}
		if (scrollableData.isRight) {
			range = edgeCursor.getRightEdgeRange(xStart, yStart);
			if (isRangeIn(x, y, range)) {
				scrollbar.setScrollXValue(scrollbar.getScrollXValue() + 1);
				return true;
			}
		}
		if (scrollableData.isBottom) {
			range = edgeCursor.getBottomEdgeRange(xStart, yStart);
			if (isRangeIn(x, y, range)) {
				scrollbar.setScrollYValue(scrollbar.getScrollYValue() + 1);
				return true;
			}
		}
		
		return false;
	},
	
	checkScrollbarWheel: function(scrollbar) {
		var scrollableData, index;
		var isUp = MouseControl.isInputAction(MouseType.UPWHEEL);
		var isDown = MouseControl.isInputAction(MouseType.DOWNWHEEL);
		
		if (!isUp && !isDown) {
			return false;
		}
		
		scrollableData = scrollbar.getScrollableData();
		if (isUp && scrollableData.isTop) {
			scrollbar.setScrollYValue(scrollbar.getScrollYValue() - 1);
		}
		else if (isDown && scrollableData.isBottom) {
			scrollbar.setScrollYValue(scrollbar.getScrollYValue() + 1);
		}
		else {
			return false;
		}
		
		index = MouseControl.getIndexFromMouse(scrollbar);
		if (index !== -1) {
			scrollbar.getCommandCursor().setCommandCursorIndex(index);
		}
		
		return true;
	},
	
	// 現在のマウスカーソルの位置をx, yの方向に移動させる
	changeCursorFromMap: function(x, y) {
		var session = root.getCurrentSession();
		var xPixel = (x * GraphicsFormat.MAPCHIP_WIDTH) - session.getScrollPixelX();
		var yPixel = (y * GraphicsFormat.MAPCHIP_HEIGHT) - session.getScrollPixelY();
		var dx = Math.floor(GraphicsFormat.MAPCHIP_WIDTH / 2);
		var dy = Math.floor(GraphicsFormat.MAPCHIP_HEIGHT / 2);
		
		// カーソルがキャラの中心になるように+dx
		this._startMouseTracking(xPixel + dx, yPixel + dy);
	},
	
	// 現在のマウスカーソルの位置を指定インデックス上に移動させる
	changeCursorFromScrollbar: function(scrollbar, targetIndex) {
		var pos = this._getPosFromScrollIndex(scrollbar, targetIndex);
		
		if (pos !== null) {
			// カーソルが自動移動するための経路を作成する
			this._startMouseTracking(pos.x, pos.y);
		}
	},
	
	// BaseScrollbar.drawScrollbarから渡された描画先を基にマウスカーソルの移動先を計算する
	saveRenderingPos: function(scrollbar) {
		// 以前とは異なる新規のスクロールバーがアクティブになった場合は、そのスクロールバーの位置を目指してカーソルを移動させる
		if (this._activeScrollbar !== this._prevScrollbar && this._activeScrollbar === scrollbar) {
			this._prevScrollbar = this._activeScrollbar;
			
			this.changeCursorFromScrollbar(this._activeScrollbar, this._activeScrollbar.getIndex());
		}
	},
	
	// マップがスクロール可能な場合は、マップ端にカーソルを表示
	drawMapEdge: function() {
		var scrollableData = MapView.getScrollableData();
		var xStart = GraphicsFormat.MAPCHIP_WIDTH;
		var yStart = GraphicsFormat.MAPCHIP_HEIGHT;
		
		if (EnvironmentControl.isMouseOperation()) {
			this._edgeCursor.drawHorzCursor(xStart, yStart, scrollableData.isLeft, scrollableData.isRight);
			this._edgeCursor.drawVertCursor(xStart, yStart, scrollableData.isTop, scrollableData.isBottom);
		}
	},
	
	_checkSideScroll: function() {
		var n = -1;
		var session = root.getCurrentSession();
		var mx = root.getMouseX() - root.getViewportX();
		var my = root.getMouseY() - root.getViewportY();
		var sx = session.getScrollPixelX();
		var sy = session.getScrollPixelY();
		var cx = (CurrentMap.getWidth() * GraphicsFormat.MAPCHIP_WIDTH) - root.getGameAreaWidth();
		var cy = (CurrentMap.getHeight() * GraphicsFormat.MAPCHIP_HEIGHT) - root.getGameAreaHeight();
		
		if (mx <= GraphicsFormat.MAPCHIP_WIDTH) {
			if (sx > 0) {
				n = sx - Math.floor(GraphicsFormat.MAPCHIP_WIDTH / 2);
				if (n < 0) {
					n = 0;
				}
				session.setScrollPixelX(n);
			}
			else {
				this._isSideScrollX = false;
			}
		}
		else if (mx >= root.getGameAreaWidth() - GraphicsFormat.MAPCHIP_WIDTH) {
			if (sx !== cx) {
				n = sx + Math.floor(GraphicsFormat.MAPCHIP_WIDTH / 2);
				if (n > cx) {
					n = cx;
				}
				session.setScrollPixelX(n);
			}
			else {
				this._isSideScrollX = false;
			}
		}
		else {
			this._isSideScrollX = false;
		}
		
		if (my <= GraphicsFormat.MAPCHIP_HEIGHT) {
			if (sy > 0) {
				n = sy - Math.floor(GraphicsFormat.MAPCHIP_HEIGHT / 2);
				if (n < 0) {
					n = 0;
				}
				session.setScrollPixelY(n);
			}
			else {
				this._isSideScrollY = false;
			}
		}
		else if (my >= root.getGameAreaHeight() - GraphicsFormat.MAPCHIP_HEIGHT) {
			if (sy !== cy) {
				n = sy + Math.floor(GraphicsFormat.MAPCHIP_HEIGHT / 2);
				if (n > cy) {
					n = cy;
				}
				session.setScrollPixelY(n);
			}
			else {
				this._isSideScrollY = false;
			}
		}
		else {
			this._isSideScrollY = false;
		}
		
		if (this._isSideScrollX || this._isSideScrollY) {
			this._adjustMapCursor();
		}
	},
	
	_adjustMapCursor: function() {
		var session = root.getCurrentSession();
		var xCursor = Math.floor((root.getMouseX() + session.getScrollPixelX() - root.getViewportX()) / GraphicsFormat.MAPCHIP_WIDTH);
		var yCursor = Math.floor((root.getMouseY()  + session.getScrollPixelY() - root.getViewportY()) / GraphicsFormat.MAPCHIP_HEIGHT);
		
		root.getCurrentSession().setMapCursorX(xCursor);
		root.getCurrentSession().setMapCursorY(yCursor);
	},
	
	// スクロールバーの項目の位置を取得する
	_getPosFromScrollIndex: function(scrollbar, targetIndex) {
		var i, j, x, y;
		var col = scrollbar.getCol();
		var rowCount = scrollbar.getRowCount();
		var width = scrollbar.getObjectWidth() + scrollbar.getSpaceX();
		var height = scrollbar.getObjectHeight() + scrollbar.getSpaceY();
		var index = 0;
		var n = (scrollbar.getScrollYValue() * scrollbar.getCol()) + scrollbar.getScrollXValue();
		var xStart = scrollbar.xRendering;
		var yStart = scrollbar.yRendering;
		
		for (i = 0; i < rowCount; i++) {
			y = yStart + (i * height);
			for (j = 0; j < col; j++) {
				if (index + n >= scrollbar.getObjectCount()) {
					return null;
				}
				
				x = xStart+ (j * width);
				if (index + n === targetIndex) {
					// 項目の中央にカーソルが向かうようにする
					return createPos(x + Math.floor(width / 2), y + Math.floor(height / 2));
				}
				
				index++;
			}
		}
		
		return null;
	},
	
	_isMouseEnabled: function() {
		if (!EnvironmentControl.isMouseOperation()) {
			return false;
		}
		
		// 現在の画面状態がソフトウェアによるフルスクリーンの場合は、マウスを考慮しない
		if (root.getAppScreenMode() === AppScreenMode.SOFTFULLSCREEN) {
			return false;
		}
		
		return true;
	},
	
	_startMouseTracking: function(x, y) {
		if (!EnvironmentControl.isMouseOperation() || !EnvironmentControl.isMouseCursorTracking()) {
			return false;
		}
		
		this._mouseLineScroll.setGoalData(root.getMouseX(), root.getMouseY(), x + root.getViewportX(), y + root.getViewportY());
	},
	
	_playHoverSound: function() {
		// MediaControl.soundDirect('commandcursor');
	}
};
