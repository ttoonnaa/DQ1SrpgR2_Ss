
var BaseEventCommand = defineObject(BaseObject,
{
	enterEventCommandCycle: function() {
		return EnterResult.NOTENTER;
	},
	
	moveEventCommandCycle: function() {
		// 画面がアクティブでない場合でも、何らかのアニメーション処理を行いたい場合はオーバーライドする
		return MoveResult.END;
	},
	
	drawEventCommandCycle: function() {
	},
	
	backEventCommandCycle: function() {
	},
	
	mainEventCommand: function() {
	},
	
	isEventCommandContinue: function() {
		// 現在、イベントがスキップ状態である場合はメイン処理だけ実行して終了する。
		// 画像表示する必要がない場合もメイン処理だけ実行して終了する。
		if (this.isSystemSkipMode()) {
			this.mainEventCommand();
			// メイン処理を終えたため、falseを返すことでイベントコマンドの処理を続行すべきではないことを伝える
			return false;
		}
		
		return true;
	},
	
	stopEventSkip: function() {
		root.setEventSkipMode(false);
	},
	
	isEventCommandSkipAllowed: function() {
		// スキップを許可しないイベントコマンド(選択肢など)はfalseを返す
		return true;
	},
	
	isSystemSkipMode: function() {
		// スキップには、イベントスキップとターンスキップの2種類がある。
		// イベントスキップはイベント中でスキップキーが押されたときに生じるもので、
		// あくまでイベントのみをスキップするためのものである。
		// つまり、ターンそのものがスキップされることはない。
		
		// 一方、ターンイベントは敵軍及び同盟軍ターンそのものをスキップするためのものであり、
		// 各軍のユニットの動作はもちろん、ターン内で発生するイベントもスキップされる。
		// つまり、ターンスキップはイベントスキップの意味合いを含んでいるため、
		// ここの条件式に指定されている。
		return root.isEventSkipMode() || CurrentMap.isTurnSkipMode();
	},
	
	getEventCommandName: function() {
		// 独自のイベントコマンドを実装する場合は、ここで名前を返す
		return '';
	}
}
);

var BaseScene = defineObject(BaseObject,
{
	setSceneData: function(screenParam) {
	},
	
	moveSceneCycle: function() {
		return MoveResult.END;
	},
	
	moveBackSceneCycle: function() {
		// 画面がアクティブでない場合でも、何らかのアニメーション処理を行いたい場合はオーバーライドする
		return MoveResult.END;
	},
	
	drawSceneCycle: function() {
	}
}
);

var BaseScreen = defineObject(BaseObject,
{
	setScreenData: function(screenParam) {
	},
	
	moveScreenCycle: function() {
		return MoveResult.END;
	},
	
	moveBackScreenCycle: function() {
		// 画面がアクティブでない場合でも、何らかのアニメーション処理を行いたい場合はオーバーライドする
		return MoveResult.END;
	},
	
	drawScreenCycle: function() {
	},
	
	drawScreenTopText: function(textui) {
		if (textui === null) {
			return;
		}
		
		TextRenderer.drawScreenTopText(this.getScreenTitleName(), textui);
	},
	
	drawScreenBottomText: function(textui) {
		if (textui === null) {
			return;
		}
		
		TextRenderer.drawScreenBottomTextCenter('', textui);
	},
	
	getScreenInteropData: function() {
		return null;
	},
	
	getScreenTitleName: function() {
		var interopData = this.getScreenInteropData();
		
		if (interopData === null) {
			return '';
		}
		
		return interopData.getScreenTitleName();
	},
	
	getScreenBackgroundImage: function() {
		var interopData = this.getScreenInteropData();
		
		if (interopData === null) {
			return null;
		}
		
		return interopData.getScreenBackgroundImage();
	},
	
	getScreenMusicHandle: function() {
		var interopData = this.getScreenInteropData();
		
		if (interopData === null) {
			return root.createEmptyHandle();
		}
		
		return interopData.getScreenMusicHandle();
	},
	
	getScreenResult: function() {
		return true;
	},
	
	notifyChildScreenClosed: function() {
	}
}
);

var BaseWindow = defineObject(BaseObject,
{
	_isWindowEnabled: true,
	_drawParentData: null,
	
	initialize: function() {
	},
	
	moveWindow: function() {
		return this.moveWindowContent();
	},
	
	moveWindowContent: function() {
		return MoveResult.CONTINUE;
	},
	
	drawWindow: function(x, y) {
		var width = this.getWindowWidth();
		var height = this.getWindowHeight();
		
		if (!this._isWindowEnabled) {
			return;
		}
		
		this._drawWindowInternal(x, y, width, height);
		
		if (this._drawParentData !== null) {
			this._drawParentData(x, y);
		}
		
		// move系メソッドにて、座標をマウスで参照できるようにする
		this.xRendering = x + this.getWindowXPadding();
		this.yRendering = y + this.getWindowYPadding();
		
		this.drawWindowContent(x + this.getWindowXPadding(), y + this.getWindowYPadding());
		
		this.drawWindowTitle(x, y, width, height);
	},
	
	drawWindowContent: function(x, y) {
	},
	
	drawWindowTitle: function(x, y, width, height) {
		var color, font, pic, titleWidth, dx;
		var titleCount = 3;
		var textui = this.getWindowTitleTextUI();
		var text = this.getWindowTitleText();
		
		if (textui === null || text === '') {
			return;
		}
		
		color = textui.getColor();
		font = textui.getFont();
		pic = textui.getUIImage();
		titleWidth = TitleRenderer.getTitlePartsWidth() * (titleCount + 2);
		dx = Math.floor((width - titleWidth) / 2);
		TextRenderer.drawFixedTitleText(x + dx, y - 40, text, color, font, TextFormat.CENTER, pic, titleCount);
	},
	
	getWindowTextUI: function() {
		return root.queryTextUI('default_window');
	},
	
	getWindowTitleTextUI: function() {
		return null;
	},
	
	getWindowTitleText: function() {
		return '';
	},
	
	getWindowWidth: function() {
		return 100;
	},
	
	getWindowHeight: function() {
		return 100;
	},
	
	getWindowXPadding: function() {
		return DefineControl.getWindowXPadding();
	},
	
	getWindowYPadding: function() {
		return DefineControl.getWindowYPadding();
	},
	
	enableWindow: function(isWindowEnabled) {
		this._isWindowEnabled = isWindowEnabled;
	},
	
	setDrawingMethod: function(method) {
		this._drawParentData = method;
	},
	
	_drawWindowInternal: function(x, y, width, height) {
		var pic = null;
		var textui = this.getWindowTextUI();
		
		if (textui !== null) {
			pic = textui.getUIImage();
		}
		
		if (pic !== null) {
			WindowRenderer.drawStretchWindow(x, y, width, height, pic);
		}
	}
}
);

var BaseWindowManager = defineObject(BaseObject,
{
	initialize: function() {
	},
	
	moveWindowManager: function() {
		return MoveResult.CONTINUE;
	},
	
	drawWindowManager: function() {
	},
	
	getTotalWindowWidth: function() {
		return 0;
	},
	
	getTotalWindowHeight: function() {
		return 0;
	},
	
	getPositionWindowX: function() {
		return 0;
	},
	
	getPositionWindowY: function() {
		return 0;
	}
}
);

var BaseNoticeView = defineObject(BaseObject,
{
	moveNoticeView: function() {
		if (InputControl.isSelectAction()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawNoticeView: function(x, y) {
		var textui = this.getTitleTextUI();
		var pic = textui.getUIImage();
		var width = TitleRenderer.getTitlePartsWidth();
		var height = TitleRenderer.getTitlePartsHeight();
		var count = this.getTitlePartsCount();
		
		TitleRenderer.drawTitle(pic, x, y, width, height, count);
		
		x += 30;
		y += 18;
		this.drawNoticeViewContent(x, y);
	},
	
	drawNoticeViewContent: function(x, y) {
	},
	
	getNoticeViewWidth: function() {
		return (this.getTitlePartsCount() + 2) * TitleRenderer.getTitlePartsWidth();
	},
	
	getNoticeViewHeight: function() {
		return TitleRenderer.getTitlePartsHeight();
	},
	
	getTitleTextUI: function() {
		return root.queryTextUI('support_title');
	},
	
	getTitlePartsCount: function() {
		return 6;
	}
}
);

var BaseFlowEntry = defineObject(BaseObject,
{
	enterFlowEntry: function(flowData) {
		return EnterResult.NOTENTER;
	},
	
	moveFlowEntry: function() {
		return MoveResult.END;
	},
	
	moveBackFlowEntry: function() {
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	isFlowSkip: function() {
		return CurrentMap.isCompleteSkipMode();
	}
}
);

var BaseTurn = defineObject(BaseObject,
{
	initialize: function() {
	},
	
	openTurnCycle: function() {
	},
	
	moveTurnCycle: function() {
		return MoveResult.END;
	},
	
	drawTurnCycle: function() {
	}
}
);

var BaseBattle = defineObject(BaseObject,
{
	_battleTable: null,
	_attackFlow: null,
	_order: null,
	_attackInfo: null,
	_battlerRight: null,
	_battlerLeft: null,
	_effectArray: null,
	
	initialize: function() {
	},
	
	openBattleCycle: function() {
	},
	
	moveBattleCycle: function() {
		return MoveResult.END;
	},
	
	drawBattleCycle: function() {
	},
	
	backBattleCycle: function() {
	},
	
	eraseRoutine: function() {
	},
	
	notifyStopMusic: function() {
	},
	
	endBattle: function() {
	},
	
	getBattleTable: function() {
		return this._battleTable;
	},
	
	isSyncopeErasing: function() {
		return true;
	},
	
	isBattleSkipAllowed: function() {
		return true;
	},
	
	getAttackFlow: function() {
		return this._attackFlow;
	},
	
	getAttackOrder: function() {
		return this._order;
	},
	
	getAttackInfo: function() {
		return this._attackInfo;
	},
	
	getBattler: function(isRight) {
		var battler;
		
		if (isRight) {
			battler = this._battlerRight;
		}
		else {
			battler = this._battlerLeft;
		}
		
		return battler;
	},
	
	// アクティブは今攻撃をするユニット。
	// アクティブは右にいる可能性も、左にいる可能性もある。
	getActiveBattler: function() {
		var unit = this._order.getActiveUnit();
		
		if (unit === this._battlerRight.getUnit()) {
			return this._battlerRight;
		}
		
		return this._battlerLeft;
	},
	
	// パッシブは今攻撃を受けるユニット
	getPassiveBattler: function() {
		var unit = this._order.getPassiveUnit();
		
		if (unit === this._battlerRight.getUnit()) {
			return this._battlerRight;
		}
		
		return this._battlerLeft;
	},
	
	createEffect: function(anime, x, y, right, isHitCheck) {
		var effect = createObject(RealEffect);
		
		if (anime === null) {
			return null;
		}
		
		effect.setupRealEffect(anime, x, y, right, this);
		effect.setHitCheck(isHitCheck);
		
		this._effectArray.push(effect);
		
		return effect;
	},
	
	createEasyEffect: function(anime, x, y) {
		var effect = createObject(RealEffect);
		
		if (anime === null) {
			return null;
		}
		
		effect.setupRealEffect(anime, x, y, true, this);
		effect.setEasyFlag(true);
		
		this._effectArray.push(effect);
		
		return effect;
	},
	
	pushCustomEffect: function(object) {
		this._effectArray.push(object);
	},
	
	getEffectArray: function() {
		return this._effectArray;
	},
	
	_moveEffect: function() {
		var i, effect;
		var count = this._effectArray.length;
		
		for (i = 0; i < count; i++) {
			effect = this._effectArray[i];
			effect.moveEffect();
			if (effect.isEffectLast()) {
				i--;
				count--;
				this._removeEffect(effect);
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAsyncEffect: function() {
		var i, effect;
		var count = this._effectArray.length;
		
		for (i = 0; i < count; i++) {
			effect = this._effectArray[i];
			if (!effect.isAsync()) {
				continue;
			}
			
			effect.moveEffect();
			if (effect.isEffectLast()) {
				i--;
				count--;
				this._removeEffect(effect);
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawEffect: function() {
		var i, effect;
		var effectArray = this._effectArray;
		var count = effectArray.length;
		
		for (i = 0; i < count; i++) {
			effect = effectArray[i];
			effect.drawEffect(0, 0, false);
		}
	},
	
	_removeEffect: function(effect) {
		var i;
		var count = this._effectArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._effectArray[i] === effect) {
				this._effectArray.splice(i, 1);
				break;
			}
		}
	},
	
	_isSyncEffectLast: function() {
		var i;
		var count = this._effectArray.length;
		
		for (i = 0; i < count; i++) {
			if (!this._effectArray[i].isAsync()) {
				return false;
			}
		}
		
		return true;
	}
}
);

var BaseCustomEffect = defineObject(BaseObject,
{
	_isLast: false,
	_isAsync: false,
	
	moveEffect: function() {
		return MoveResult.CONTINUE;
	},
	
	drawEffect: function(xScroll, yScroll) {
	},
	
	endEffect: function() {
		this._isLast = true;
	},
	
	isEffectLast: function() {
		return this._isLast;
	},
	
	getEffectX: function() {
		return 0;
	},
	
	getEffectY: function() {
		return 0;
	},
	
	setAsync: function(isAsync) {
		this._isAsync = isAsync;
	},
	
	isAsync: function() {
		return this._isAsync;
	},
	
	getAnimeMotion: function() {
		return null;
	}
}
);
