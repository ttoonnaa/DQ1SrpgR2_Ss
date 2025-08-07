
var BaseScreenMode = {
	SRC_OUT: 0,
	DEST_IN: 1,
	CONTENT: 2,
	DEST_OUT: 3,
	SRC_IN: 4
};

// 画面切り替え時には、背景表示や音楽再生、暗転処理などが必要になる。
// 全ての画面にそうしたコードを含めないように、共通処理をScreenControllerで管理する。
var ScreenController = {
	_scrollBackground: null,
	
	enterScreenControllerCycle: function(screenContainer) {
		var obj;
		var mode = -1;
		
		if (this._scrollBackground === null) {
			this._scrollBackground = createObject(ScrollBackground);
		}
		
		screenContainer.mode = 0;
		screenContainer.transition = null;
		screenContainer.isMusicPlay = false;
		
		if (SceneManager.isScreenFilled()) {
			screenContainer.transition = createObject(SystemTransition);
			mode = BaseScreenMode.DEST_IN;
		}
		else {
			obj = this._getTransitionObject(screenContainer);
			if (obj !== null) {
				screenContainer.transition = createObject(obj);
				mode = BaseScreenMode.SRC_OUT;
			}
		}
		
		if (mode !== -1) {
			screenContainer.transition.setFadeSpeed(this._getFadeSpeed());
			this._changeBaseMode(mode, screenContainer);
		}
		else {
			this._playScreenMusic(screenContainer);
			this._setScrollBackground(screenContainer);
			this._changeBaseMode(BaseScreenMode.CONTENT, screenContainer);
		}
		
		screenContainer.screen.setScreenData(screenContainer.param);
	},
	
	moveScreenControllerCycle: function(screenContainer) {
		var parentScreenContainer;
		var mode = screenContainer.mode;
		var transition = screenContainer.transition;
		
		if (mode === BaseScreenMode.SRC_OUT) {
			if (transition.moveTransition() !== MoveResult.CONTINUE) {
				this._changeBaseMode(BaseScreenMode.DEST_IN, screenContainer);
			}
		}
		else if (mode === BaseScreenMode.DEST_IN) {
			if (transition.moveTransition() !== MoveResult.CONTINUE) {
				this._changeBaseMode(BaseScreenMode.CONTENT, screenContainer);
			}
		}
		else if (mode === BaseScreenMode.CONTENT) {
			if (screenContainer.screen.moveScreenCycle() !== MoveResult.CONTINUE) {
				// 下記コードが実行されるということは、画面が閉じられたことを意味する
				if (transition === null) {
					this._stopScreenMusic(screenContainer);
					this._resetScrollBackground(screenContainer);
					
					parentScreenContainer = SceneManager.getParentScreenContainer(screenContainer);
					if (parentScreenContainer !== null) {
						parentScreenContainer.screen.notifyChildScreenClosed();
					}
					
					return MoveResult.END;
				}
				else {
					this._changeBaseMode(BaseScreenMode.DEST_OUT, screenContainer);
				}
			}
		}
		else if (mode === BaseScreenMode.DEST_OUT) {
			if (transition.moveTransition() !== MoveResult.CONTINUE) {
				this._changeBaseMode(BaseScreenMode.SRC_IN, screenContainer);
			}
		}
		else if (mode === BaseScreenMode.SRC_IN) {
			if (transition.moveTransition() !== MoveResult.CONTINUE) {
				return MoveResult.END;
			}
		}
		
		this._moveCommonAnimation();
		
		return MoveResult.CONTINUE;
	},
	
	moveScreenControllerBackCycle: function(screenContainer) {
		this._moveCommonAnimation();
		return screenContainer.screen.moveBackScreenCycle();
	},
	
	drawScreenControllerCycle: function(screenContainer) {
		var mode = screenContainer.mode;
		
		if (mode === BaseScreenMode.DEST_IN || mode === BaseScreenMode.CONTENT || mode === BaseScreenMode.DEST_OUT) {
			this._drawScreenMain(screenContainer);
		}
		
		if (mode !== BaseScreenMode.CONTENT) {
			screenContainer.transition.drawTransition();
		}
	},
	
	drawScreenControllerBackCycle: function(screenContainer) {
		var mode, childScreenContainer;
		
		// 子の画面が存在しない場合は、続行しない
		childScreenContainer = SceneManager.getChildScreenContainer(screenContainer);
		if (childScreenContainer === null) {
			return;
		}
		
		mode = childScreenContainer.mode;
		
		// 子の画面を表示するにあたり、暗転中は親の画面を表示するべきだから、
		// _drawScreenMainを呼び出す。
		if (mode === BaseScreenMode.SRC_OUT || mode === BaseScreenMode.SRC_IN) {
			this._drawScreenMain(screenContainer);
		}
	},
	
	_moveCommonAnimation: function() {
		this._scrollBackground.moveScrollBackground();
	},
	
	_drawScreenMain: function(screenContainer) {
		var interopData, textui;
		var screen = screenContainer.screen;
		
		this._drawBackground(screenContainer);
		
		interopData = screen.getScreenInteropData();
		if (interopData !== null) {
			textui = interopData.getTopFrameTextUI();
		}
		else {
			textui = null;
		}
		
		// 上フレームを描画
		screen.drawScreenTopText(textui);
		
		if (interopData !== null) {
			textui = interopData.getBottomFrameTextUI();
		}
		else {
			textui = null;
		}
		
		// 下フレームを描画
		screen.drawScreenBottomText(textui);
		
		// 画面の内容を描画
		screen.drawScreenCycle();
	},
	
	_drawBackground: function(screenContainer) {
		this._scrollBackground.drawScrollBackground();
	},
	
	_playScreenMusic: function(screenContainer) {
		var handle = screenContainer.screen.getScreenMusicHandle();
		var handleActive = root.getMediaManager().getActiveMusicHandle();
		
		// 画面に音楽が設定されていない場合は、再生する必要がない
		if (handle.isNullHandle()) {	
			return;
		}
		
		// 画面に音楽は設定されているが、現在再生されている曲と同じであるため、再生する必要がない
		if (handle.isEqualHandle(handleActive)) {
			return;
		}
		
		MediaControl.musicPlayNew(handle);
		screenContainer.isMusicPlay = true;
	},
	
	_stopScreenMusic: function(screenContainer) {
		// 画面の音楽を再生していた場合は戻す
		if (screenContainer.isMusicPlay) {
			MediaControl.musicStop(MusicStopType.BACK);
		}
	},
	
	_setScrollBackground: function(screenContainer) {
		this._scrollBackground.startScrollBackground(screenContainer.screen.getScreenBackgroundImage());
	},
	
	_resetScrollBackground: function(screenContainer) {
		var parentScreenContainer = SceneManager.getParentScreenContainer(screenContainer);
		
		if (parentScreenContainer === null) {
			this._scrollBackground.startScrollBackground(null);
			return;
		}
		
		this._scrollBackground.startScrollBackground(parentScreenContainer.screen.getScreenBackgroundImage());
	},
	
	_getTransitionObject: function(screenContainer) {
		var obj, picScreen, parentScreenContainer;
		var picScreenParent = null;
		
		// 切り替わる画面に背景が設定されていない場合は、暗転しない
		picScreen = screenContainer.screen.getScreenBackgroundImage();
		if (picScreen === null) {
			return null;
		}
		
		parentScreenContainer = SceneManager.getParentScreenContainer(screenContainer);
		if (parentScreenContainer !== null) {
			picScreenParent = parentScreenContainer.screen.getScreenBackgroundImage();
		}
		
		// 切り替え対象の画面の背景が、現在の画面の背景と異なる場合は暗転する
		if (picScreen !== picScreenParent) {
			obj = SystemTransition;
		}
		else {
			obj = null;
		}
		
		return obj;
	},
	
	_getFadeSpeed: function() {
		return 14;
	},
	
	_changeBaseMode: function(mode, screenContainer) {
		var transition = screenContainer.transition;
		
		if (mode === BaseScreenMode.SRC_OUT) {
			transition.setDestOut();
		}
		else if (mode === BaseScreenMode.DEST_IN) {
			this._playScreenMusic(screenContainer);
			this._setScrollBackground(screenContainer);
			transition.setDestIn();
		}
		else if (mode === BaseScreenMode.DEST_OUT) {
			transition.setDestOut();
		}
		else if (mode === BaseScreenMode.SRC_IN) {
			this._stopScreenMusic(screenContainer);
			this._resetScrollBackground(screenContainer);
			transition.setDestIn();
		}
		
		screenContainer.mode = mode;
	}
};
