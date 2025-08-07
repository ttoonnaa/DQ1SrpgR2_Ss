
var cur_map = null;

// 1つのシーンには、複数の画面が存在する可能性がある。
// それらは_screenArrayとして管理され、配列の最後の要素が現在前面に表示されている画面である。
// 具体的な画面処理は、ScreenControllerを通じて行う。
var SceneManager = {
	_sceneType: 0,
	_screenArray: null,
	_activeAcene: null,
	_isForceForeground: false,
	
	enterSceneManagerCycle: function(sceneType) {
		this._sceneType = sceneType;
		this._screenArray = [];
		
		CacheControl.clearCache();
		
		// ゲーム開始直後のOPイベントで、「セーブ画面呼び出し」が行われる可能性がゼロではないため、
		// 先行して初期化
		this._isForceForeground = false;
		
		this._activeAcene = this._createSceneObject(sceneType);
		this._activeAcene.setSceneData();
		
		return EnterResult.OK;
	},
	
	moveSceneManagerCycle: function() {
		var i;
		var count = this._screenArray.length;
		var result = this._activeAcene.moveSceneCycle();
		
		for (i = 0; i < count; i++) {
			if (i + 1 === count) {
				// this._screenArray[i]は現在前面に表示されているため、moveScreenControllerCycleを呼び出す
				result = ScreenController.moveScreenControllerCycle(this._screenArray[i]);
				if (result !== MoveResult.CONTINUE) {
					// this._screenArray[i]の画面が閉じられたから、前の画面に戻る
					this._screenArray.pop();
				}
			}
			else {
				// this._screenArray[i]は現在後面に表示されているため、moveScreenControllerBackCycleを呼び出す
				ScreenController.moveScreenControllerBackCycle(this._screenArray[i]);
			}
		}
		
		return result;
	},
	
	drawSceneManagerCycle: function() {
		var i;
		var count = this._screenArray.length;
		
		this._activeAcene.drawSceneCycle();
		
		for (i = 0; i < count; i++) {
			if (i + 1 === count) {
				ScreenController.drawScreenControllerCycle(this._screenArray[i]);
			}
			else {
				ScreenController.drawScreenControllerBackCycle(this._screenArray[i]);
			}
		}
	},
	
	backSceneManagerCycle: function() {
		var i;
		var count = this._screenArray.length;
		
		this._activeAcene.moveBackSceneCycle();
		
		for (i = 0; i < count; i++) {
			ScreenController.moveScreenControllerBackCycle(this._screenArray[i]);
		}
		
		return true;
	},
	
	addScreen: function(screen, param) {
		var screenContainer = {};
		
		screenContainer.screen = screen;
		screenContainer.param = param;
		this._screenArray.push(screenContainer);
		
		ScreenController.enterScreenControllerCycle(screenContainer);
	},
	
	getChildScreenContainer: function(screenContainer) {
		var i;
		var count = this._screenArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._screenArray[i] === screenContainer) {
				if (i < count - 1) {
					// 現在の画面の次の画面(子の画面)を返す
					return this._screenArray[i + 1];
				}
			}
		}
		
		return null;
	},
	
	getParentScreenContainer: function(screenContainer) {
		var i;
		var count = this._screenArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._screenArray[i] === screenContainer) {
				if (i - 1 >= 0) {
					// 現在の画面の前の画面(親の画面)を返す
					return this._screenArray[i - 1];
				}
			}
		}
		
		return null;
	},
	
	getActiveScene: function() {
		return this._activeAcene;
	},
	
	getLastScreen: function() {
		return this._screenArray[this._screenArray.length - 1].screen;
	},
	
	setEffectAllRange: function(isFilled) {
		var effect = root.getScreenEffect();
		
		if (isFilled) {
			effect.setAlpha(255);
		}
		else {
			effect.setAlpha(0);
		}
		
		effect.setRange(EffectRangeType.ALL);
	},
	
	// このメソッドがtrueを返す場合は、effect.getColor()が示す色によって、
	// 画面全体が一色で塗りつぶされていることを意味する。
	isScreenFilled: function() {
		var effect = root.getScreenEffect();
		
		return effect.getAlpha() === 255;
	},
	
	resetCurrentMap: function() {
		cur_map = root.getCurrentSession().getCurrentMapInfo();
		
		CurrentMap.prepareMap();
	},
	
	isScreenClosed: function(screen) {
		var i;
		var count = this._screenArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._screenArray[i].screen === screen) {
				return false;
			}
		}
		
		return true;
	},
	
	getScreenCount: function() {
		return this._screenArray.length;
	},
	
	isForceForeground: function() {
		return this._isForceForeground;
	},
	
	setForceForeground: function(isForceForeground) {
		this._isForceForeground = isForceForeground;
	},
	
	isCustomScene: function(sceneType) {
		return sceneType >= SceneType.CUSTOM && sceneType <= SceneType.RESERVED;
	},
	
	_createSceneObject: function(scene) {
		var obj = null;
		
		if (scene === SceneType.TITLE) {
			obj = TitleScene;
		}
		else if (scene === SceneType.ENDING) {
			obj = EndingScene;
		}
		else if (scene === SceneType.GAMEOVER) {
			obj = GameOverScene;
		}
		else if (scene === SceneType.FREE) {
			obj = FreeAreaScene;
		}
		else if (scene === SceneType.BATTLESETUP) {
			obj = BattleSetupScene;
		}
		else if (scene === SceneType.BATTLERESULT) {
			obj = BattleResultScene;
		}
		else if (scene === SceneType.REST) {
			obj = RestScene;
		}
		else if (scene === SceneType.EVENTTEST) {
			obj = EventTestScene;
		}
		
		return createObject(obj);
	}
};
