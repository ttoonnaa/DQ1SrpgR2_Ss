
var PlayerTurnMode = {
	AUTOCURSOR: 0,
	AUTOEVENTCHECK: 1,
	MAP: 2,
	AREA: 3,
	MAPCOMMAND: 4,
	UNITCOMMAND: 5
};

var PlayerTurn = defineObject(BaseTurn,
{
	_targetUnit: null,
	_xCursorSave: 0,
	_yCursorSave: 0,
	_xAutoCursorSave: 0,
	_yAutoCursorSave: 0,
	_isPlayerActioned: false,
	_mapLineScroll: null,
	_mapEdit: null,
	_mapSequenceArea: null,
	_mapSequenceCommand: null,
	_mapCommandManager: null,
	_eventChecker: null,
	
	// ターンが切り替わる度に呼ばれる
	openTurnCycle: function() {
		this._prepareTurnMemberData();
		this._completeTurnMemberData();
	},
	
	moveTurnCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (this._checkAutoTurnEnd()) {
			return MoveResult.CONTINUE;
		}
		
		if (mode === PlayerTurnMode.AUTOCURSOR) {
			result = this._moveAutoCursor();
		}
		else if (mode === PlayerTurnMode.AUTOEVENTCHECK) {
			result = this._moveAutoEventCheck();
		}
		else if (mode === PlayerTurnMode.MAP) {
			result = this._moveMap();
		}
		else if (mode === PlayerTurnMode.AREA) {
			result = this._moveArea();
		}
		else if (mode === PlayerTurnMode.MAPCOMMAND) {
			result = this._moveMapCommand();
		}
		else if (mode === PlayerTurnMode.UNITCOMMAND) {
			result = this._moveUnitCommand();
		}
		
		if (this._checkAutoTurnEnd()) {
			return MoveResult.CONTINUE;
		}
		
		return result;
	},
	
	drawTurnCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === PlayerTurnMode.AUTOCURSOR) {
			this._drawAutoCursor();
		}
		else if (mode === PlayerTurnMode.AUTOEVENTCHECK) {
			this._drawAutoEventCheck();
		}
		else if (mode === PlayerTurnMode.MAP) {
			this._drawMap();	
		}
		else if (mode === PlayerTurnMode.AREA) {
			this._drawArea();	
		}
		else if (mode === PlayerTurnMode.MAPCOMMAND) {
			this._drawMapCommand();
		}
		else if (mode === PlayerTurnMode.UNITCOMMAND) {
			this._drawUnitCommand();
		}
	},
	
	isPlayerActioned: function() {
		return this._isPlayerActioned;
	},
	
	recordPlayerAction: function(isPlayerActioned) {
		this._isPlayerActioned = isPlayerActioned;
	},
	
	notifyAutoEventCheck: function() {
		this._changeEventMode();
	},
	
	isDebugMouseActionAllowed: function() {
		return this.getCycleMode() === PlayerTurnMode.MAP;
	},
	
	setCursorSave: function(unit) {
		this._xCursorSave = unit.getMapX();
		this._yCursorSave = unit.getMapY();
	},
	
	setPosValue: function(unit) {
		unit.setMapX(this._xCursorSave);
		unit.setMapY(this._yCursorSave);
		this._mapEdit.setCursorPos(unit.getMapX(), unit.getMapY());
		MapView.setScroll(unit.getMapX(), unit.getMapY());
	},
	
	setAutoCursorSave: function(isDefault) {
		var pos, session;
		
		if (isDefault) {
			pos = this._getDefaultCursorPos();
			if (pos !== null) {
				this._xAutoCursorSave = pos.x;
				this._yAutoCursorSave = pos.y;
			}
		}
		else {
			session = root.getCurrentSession();
			this._xAutoCursorSave = session.getMapCursorX();
			this._yAutoCursorSave = session.getMapCursorY();
		}
	},

	getTurnTargetUnit: function() {
		return this._targetUnit;
	},
	
	clearTurnTargetUnit: function() {
		this._targetUnit = null;
	},
	
	isRepeatMoveMode: function() {
		return false;
	},
	
	clearPanelRange: function() {
		this._mapEdit.clearRange();
	},
	
	getMapEdit: function() {
		return this._mapEdit;
	},
	
	_prepareTurnMemberData: function() {
		this._targetUnit = null;
		this._xCursorSave = 0;
		this._yCursorSave = 0;
		this._isPlayerActioned = false;
		this._mapLineScroll = createObject(MapLineScroll);
		this._mapEdit = createObject(MapEdit);
		this._mapSequenceArea = createObject(MapSequenceArea);
		this._mapSequenceCommand = createObject(MapSequenceCommand);
		this._mapCommandManager = createObject(MapCommand);
		this._eventChecker = createObject(EventChecker);
		
		if (root.getCurrentSession().getTurnCount() === 1) {
			// 初回ターンはオートカーソルの有無を問わず、ユニットに合わさる
			this.setAutoCursorSave(true);
		}
		
		this._setDefaultActiveUnit();
	},
	
	_completeTurnMemberData: function() {
		this._mapEdit.openMapEdit();
		this._changeAutoCursor();
		
		// 自軍ターン開始時にイベントでユニットが登場している可能性があるため、マーキングを実行する
		MapLayer.getMarkingPanel().updateMarkingPanel();
		
		// MapParts.UnitInfoは、_mhpプロパティを保持している。
		// これは、ユニットの最大HPをキャッシュしておくことで、
		// 呼び出しコストの高いParamBonus.getMhp(unit);を毎フレーム呼び出さないようにするためである。
		// しかし、この仕様のため、マップ開始直後のフレームのみ、ContentRenderer.drawHpのmaxHpが0になる。
		// この問題を解消するためには、drawメソッドが呼ばれる前に、_mhpプロパティを初期化しておく。
		this._mapEdit._setUnit(root.getCurrentSession().getActiveEventUnit());
	},
	
	_moveAutoCursor: function() {
		var x, y, pos;
		
		if (this._mapLineScroll.moveLineScroll() !== MoveResult.CONTINUE) {
			pos = this._getDefaultCursorPos();
			if (pos !== null && EnvironmentControl.isAutoCursor()) {
				x = pos.x;
				y = pos.y;
			}
			else {
				x = this._xAutoCursorSave;
				y = this._yAutoCursorSave;
			}
			MapView.changeMapCursor(x, y);
			this._changeEventMode();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAutoEventCheck: function() {
		if (this._eventChecker.moveEventChecker() !== MoveResult.CONTINUE) {
			this._doEventEndAction();
			MapLayer.getMarkingPanel().updateMarkingPanel();
			this.changeCycleMode(PlayerTurnMode.MAP);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveMap: function() {
		var result = this._mapEdit.moveMapEdit();
		
		if (result === MapEditResult.UNITSELECT) {
			this._targetUnit = this._mapEdit.getEditTarget();
			if (this._targetUnit !== null) {
				if (this._targetUnit.isWait()) {
					this._mapEdit.clearRange();
					
					// 待機しているユニット上での決定キー押下は、マップコマンドとして扱う
					this._mapCommandManager.openListCommandManager();
					this.changeCycleMode(PlayerTurnMode.MAPCOMMAND);
				}
				else {
					// ユニットの移動範囲を表示するモードに進む
					this._mapSequenceArea.openSequence(this);
					this.changeCycleMode(PlayerTurnMode.AREA);
				}
			}
		}
		else if (result === MapEditResult.MAPCHIPSELECT) {
			this._mapCommandManager.openListCommandManager();
			this.changeCycleMode(PlayerTurnMode.MAPCOMMAND);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveArea: function() {
		var result = this._mapSequenceArea.moveSequence();
		
		if (result === MapSequenceAreaResult.COMPLETE) {
			this._mapEdit.clearRange();
			this._mapSequenceCommand.openSequence(this);
			this.changeCycleMode(PlayerTurnMode.UNITCOMMAND);
		}
		else if (result === MapSequenceAreaResult.CANCEL) {
			this.changeCycleMode(PlayerTurnMode.MAP);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveMapCommand: function() {
		if (this._mapCommandManager.moveListCommandManager() !== MoveResult.CONTINUE) {
			// ターン終了を選択した場合は実行されない
			this._changeEventMode();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveUnitCommand: function() {
		var result = this._mapSequenceCommand.moveSequence();
		
		if (result === MapSequenceCommandResult.COMPLETE) {
			this._mapSequenceCommand.resetCommandManager();
			MapLayer.getMarkingPanel().updateMarkingPanelFromUnit(this._targetUnit);
			this._changeEventMode();
		}
		else if (result === MapSequenceCommandResult.CANCEL) {
			this._mapSequenceCommand.resetCommandManager();
			this.changeCycleMode(PlayerTurnMode.MAP);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawAutoCursor: function() {
		MapLayer.drawUnitLayer();
	},
	
	_drawAutoEventCheck: function() {
		MapLayer.drawUnitLayer();
	},
	
	_drawMap: function() {
		MapLayer.drawUnitLayer();
		if (!root.isEventSceneActived()) {
			this._mapEdit.drawMapEdit();
		}
	},
	
	_drawArea: function() {
		MapLayer.drawUnitLayer();
		this._mapSequenceArea.drawSequence();
	},
	
	_drawMapCommand: function() {
		MapLayer.drawUnitLayer();
		this._mapCommandManager.drawListCommandManager();
	},
	
	_drawUnitCommand: function() {
		MapLayer.drawUnitLayer();
		this._mapSequenceCommand.drawSequence();
	},
	
	_checkAutoTurnEnd: function() {
		var i, unit;
		var isTurnEnd = true;
		var list = PlayerList.getSortieList();
		var count = list.getCount();
		
		// コンフィグ画面でオートターンエンドを選択したと同時に、ターン変更が起きないようにする。
		// 戦闘で生存者が0になったと同時に、ターン終了させない意図もある。
		if (this.getCycleMode() !== PlayerTurnMode.MAP) {
			return false;
		}
		
		// オートターンが有効でない場合でも、生存者が存在しなくなった場合は、ターンを終了する
		if (count === 0) {
			TurnControl.turnEnd();
			return true;
		}
		
		if (!EnvironmentControl.isAutoTurnEnd()) {
			return false;
		}
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			// 全ての自軍がステートを理由に行動できない場合はターンを終了させたいため、以下コードで判定する
			if (!StateControl.isTargetControllable(unit)) {
				continue;
			}
			
			if (!unit.isWait()) {
				isTurnEnd = false;
				break;
			}
		}
		
		if (isTurnEnd) {
			this._isPlayerActioned = false;
			TurnControl.turnEnd();
		}
		
		return isTurnEnd;
	},
	
	_setDefaultActiveUnit: function() {
		var unit = PlayerList.getAliveList().getData(0);
		
		// ターンダメージで撃破された場合はnullになる
		if (unit !== null) {
			root.getCurrentSession().setActiveEventUnit(unit);
		}
	},
	
	_getDefaultCursorPos: function() {
		var i, unit;
		var targetUnit = null;
		var list = PlayerList.getSortieList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			if (unit.getImportance() === ImportanceType.LEADER) {
				targetUnit = unit;
				break;
			}
		}
		
		if (targetUnit === null) {
			targetUnit = list.getData(0);
		}
		
		if (targetUnit !== null) {
			return createPos(targetUnit.getMapX(), targetUnit.getMapY());
		}
		
		return null;
	},
	
	_changeAutoCursor: function() {
		var x, y;
		var pos = this._getDefaultCursorPos();
		
		if (pos !== null && EnvironmentControl.isAutoCursor()) {
			x = pos.x;
			y = pos.y;
		}
		else {
			x = this._xAutoCursorSave;
			y = this._yAutoCursorSave;
		}
		
		this._mapLineScroll.startLineScroll(x, y);
		this.changeCycleMode(PlayerTurnMode.AUTOCURSOR);
	},
	
	_changeEventMode: function() {
		var result;
		
		result = this._eventChecker.enterEventChecker(root.getCurrentSession().getAutoEventList(), EventType.AUTO);
		if (result === EnterResult.NOTENTER) {
			this._doEventEndAction();
			this.changeCycleMode(PlayerTurnMode.MAP);
		}
		else {
			this.changeCycleMode(PlayerTurnMode.AUTOEVENTCHECK);
		}
	},
	
	_doEventEndAction: function() {
		// このメソッドでisGameOverを呼び出しているのは、戦闘時の敗北でいったん、マップが表示されるようにしたいため。
		// 他に地形ウインドウを表示しない意図もある。
		if (GameOverChecker.isGameOver()) {
			GameOverChecker.startGameOver();
		}
		else {
			// スクリプトエラー時に再開できるように対策する。
			// openTurnCycle内で呼び出すと、再開がターン開始時になるため、やり直し感が強く出る。
			RetryControl.register();
		}
	}
}
);

var MapSequenceAreaMode = {
	AREA: 0,
	MOVING: 1
};

var MapSequenceAreaResult = {
	COMPLETE: 0,
	CANCEL: 1,
	NONE: 2
};

var MapSequenceArea = defineObject(BaseObject,
{
	_parentTurnObject: null,
	_targetUnit: null,
	_mapCursor: null,
	_unitRangePanel: null,
	_mapPartsCollection: null,
	_prevUnit: null,
	_simulateMove: null,
	
	openSequence: function(parentTurnObject) {
		this._prepareSequenceMemberData(parentTurnObject);
		this._completeSequenceMemberData(parentTurnObject);
	},
	
	moveSequence: function() {
		var mode = this.getCycleMode();
		var result = MapSequenceAreaResult.NONE;
		
		if (mode === MapSequenceAreaMode.AREA) {
			result = this._moveArea();
		}
		else if (mode === MapSequenceAreaMode.MOVING) {
			result = this._moveMoving();
		}
		
		return result;
	},
	
	drawSequence: function() {
		var mode = this.getCycleMode();
		
		if (mode === MapSequenceAreaMode.AREA) {
			this._drawArea();
		}
		else if (mode === MapSequenceAreaMode.MOVING) {
			this._drawMoving();
		}
	},
	
	_prepareSequenceMemberData: function(parentTurnObject) {
		this._parentTurnObject = parentTurnObject;
		this._targetUnit = parentTurnObject.getTurnTargetUnit();
		this._mapCursor = createObject(MapCursor);
		this._unitRangePanel = MapLayer.getUnitRangePanel();
		this._mapPartsCollection = createObject(MapPartsCollection);
		this._prevUnit = null;
		this._simulateMove = createObject(SimulateMove);
	},
	
	_completeSequenceMemberData: function(parentTurnObject) {
		this._targetUnit.setDirection(this._getDefaultDirection());
		
		this._mapCursor.setPos(this._targetUnit.getMapX(), this._targetUnit.getMapY());
		
		if (parentTurnObject.isRepeatMoveMode()) {
			this._unitRangePanel.setRepeatUnit(this._targetUnit);	
		}
		else {
			this._unitRangePanel.setUnit(this._targetUnit);
		}
		
		this._mapPartsCollection.setMapCursor(this._mapCursor);
		
		this._playMapUnitSelectSound();
		
		this.changeCycleMode(MapSequenceAreaMode.AREA);
	},
	
	_moveArea: function() {
		var unit;
		var isMove = false;
		var isCancel = false;
		var result = MapSequenceAreaResult.NONE;
		
		if (InputControl.isSelectAction()) {
			// _targetUnitが移動してもよいかどうかを調べる
			if (this._isTargetMovable()) {
				isMove = true;
			}
			else {
				isCancel = true;
			}
		}
		else if (InputControl.isCancelAction()) {
			isCancel = true;
		}
		else {
			this._mapCursor.moveCursor();
			this._mapPartsCollection.moveMapPartsCollection();
			
			unit = this._mapCursor.getUnitFromCursor();
			
			// ユニットが変更された場合は更新
			if (unit !== this._prevUnit) {
				this._setUnit(unit);
			}
		}
		
		if (isMove) {
			// カーソルが示す位置に移動してもよいかどうかを調べる
			if (this._isPlaceSelectable()) {
				if (this._startMove()) {
					result = MapSequenceAreaResult.COMPLETE;
				}
				else {
					this.changeCycleMode(MapSequenceAreaMode.MOVING);
				}
			}
		}
		else if (isCancel) {
			this._doCancelAction();
			result = MapSequenceAreaResult.CANCEL;
		}
		
		return result;
	},
	
	_moveMoving: function() {
		var result = MapSequenceAreaResult.NONE;
		
		if (this._simulateMove.moveUnit() !== MoveResult.CONTINUE) {
			result = MapSequenceAreaResult.COMPLETE;
		}
		
		return result;
	},
	
	_drawArea: function() {
		this._mapCursor.drawCursor();
		this._mapPartsCollection.drawMapPartsCollection();
		MouseControl.drawMapEdge();
	},
	
	_drawMoving: function() {
		// 移動中ユニットが表示ユニットの上に表示できるように、drawUnitLayerの後に呼び出す
		this._simulateMove.drawUnit();
	},
	
	_getDefaultDirection: function() {
		return DirectionType.RIGHT;
	},
	
	_isTargetMovable: function() {
		if (!StateControl.isTargetControllable(this._targetUnit)) {
			return false;
		}
		
		// 実際に移動を許可するのは待機していないプレイヤー
		return this._targetUnit.getUnitType() === UnitType.PLAYER && !this._targetUnit.isWait();
	},
	
	_isPlaceSelectable: function() {
		var x = this._mapCursor.getX();
		var y = this._mapCursor.getY();
		var isCurrentPos = this._targetUnit.getMapX() === x && this._targetUnit.getMapY() === y;
		var unit = PosChecker.getUnitFromPos(x, y);
		
		// 移動できる場所は範囲内の位置か現在位置
		return (this._unitRangePanel.isMoveArea(x, y) > 0 && unit === null) || isCurrentPos;
	},
	
	_startMove: function() {
		var cource;
		var x = this._mapCursor.getX();
		var y = this._mapCursor.getY();
		var isCurrentPos = this._targetUnit.getMapX() === x && this._targetUnit.getMapY() === y;
		
		this._parentTurnObject.setCursorSave(this._targetUnit);
		
		// ユニットの現在位置を選択した場合は移動不要
		if (isCurrentPos) {
			this._simulateMove.noMove(this._targetUnit);
			this._playMapUnitSelectSound();
			return true;
		}
		else {
			// コースを作成して移動開始
			cource = this._simulateMove.createCource(this._targetUnit, x, y, this._unitRangePanel.getSimulator());
			this._simulateMove.startMove(this._targetUnit, cource);
		}
		
		return false;
	},
	
	_doCancelAction: function() {
		// 選択していたユニットの位置にカーソルを戻す
		this._mapCursor.setPos(this._targetUnit.getMapX(), this._targetUnit.getMapY());
		
		this._targetUnit.setDirection(DirectionType.NULL);
		this._playMapUnitCancelSound();
		
		MapView.setScroll(this._targetUnit.getMapX(), this._targetUnit.getMapY());
	},
	
	_setUnit: function(unit) {
		this._mapPartsCollection.setUnit(unit);
		this._prevUnit = unit;
	},
	
	_playMapUnitSelectSound: function() {
		MediaControl.soundDirect('commandselect');
	},
	
	_playMapUnitCancelSound: function() {
		MediaControl.soundDirect('commandcancel');
	}
}
);

var MapSequenceCommandMode = {
	COMMAND: 0,
	FLOW: 1
};

var MapSequenceCommandResult = {
	COMPLETE: 0,
	CANCEL: 1,
	NONE: 2
};

var MapSequenceCommand = defineObject(BaseObject,
{
	_parentTurnObject: null,
	_targetUnit: null,
	_unitCommandManager: null,
	_straightFlow: null,
	
	openSequence: function(parentTurnObject) {
		this._prepareSequenceMemberData(parentTurnObject);
		this._completeSequenceMemberData(parentTurnObject);
	},
	
	moveSequence: function() {
		var mode = this.getCycleMode();
		var result = MapSequenceCommandResult.NONE;
		
		if (mode === MapSequenceCommandMode.COMMAND) {
			result = this._moveCommand();
		}
		else if (mode === MapSequenceCommandMode.FLOW) {
			result = this._moveFlow();
		}
		
		return result;
	},
	
	drawSequence: function() {
		var mode = this.getCycleMode();
		
		if (mode === MapSequenceCommandMode.COMMAND) {
			this._unitCommandManager.drawListCommandManager();
		}
		else if (mode === MapSequenceCommandMode.FLOW) {
			this._straightFlow.drawStraightFlow();
		}
	},
	
	resetCommandManager: function() {
		this._unitCommandManager = null;
	},
	
	_prepareSequenceMemberData: function(parentTurnObject) {
		this._parentTurnObject = parentTurnObject;
		this._targetUnit = parentTurnObject.getTurnTargetUnit();
		this._unitCommandManager = createObject(UnitCommand);
		this._straightFlow = createObject(StraightFlow);
	},
	
	_completeSequenceMemberData: function(parentTurnObject) {
		this._straightFlow.setStraightFlowData(parentTurnObject);
		this._pushFlowEntries(this._straightFlow);
		
		// _targetUnitをイベントにおけるアクティブユニットとして設定する
		root.getCurrentSession().setActiveEventUnit(this._targetUnit);
		
		this._unitCommandManager.setListCommandUnit(this._targetUnit);
		this._unitCommandManager.openListCommandManager();
		
		this.changeCycleMode(MapSequenceCommandMode.COMMAND);
	},
	
	_moveCommand: function() {
		var result;
		
		if (this._unitCommandManager.moveListCommandManager() !== MoveResult.CONTINUE) {
			result = this._doLastAction();
			if (result === 0) {
				this._straightFlow.enterStraightFlow();
				this.changeCycleMode(MapSequenceCommandMode.FLOW);
			}
			else if (result === 1) {
				return MapSequenceCommandResult.COMPLETE;
			}
			else {
				this._targetUnit.setMostResentMov(0);
				return MapSequenceCommandResult.CANCEL;
			}
		}
		
		return MapSequenceCommandResult.NONE;
	},
	
	_moveFlow: function() {
		if (this._straightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			// 再移動とオートターンエンドが有効な場合に、範囲が残ってしまうのを防ぐ
			this._parentTurnObject.clearPanelRange();
			return MapSequenceCommandResult.COMPLETE;
		}
		
		return MapSequenceCommandResult.NONE;
	},
	
	_doLastAction: function() {
		var i;
		var unit = null;
		var list = PlayerList.getSortieList();
		var count = list.getCount();
		
		// コマンドの実行によってユニットが存在しなくなる可能性も考えられるため確認
		for (i = 0; i < count; i++) {
			if (this._targetUnit === list.getData(i)) {
				unit = this._targetUnit;
				break;
			}
		}
		
		// ユニットが死亡などしておらず、依然として存在するか調べる
		if (unit !== null) {
			if (this._unitCommandManager.getExitCommand() !== null) {
				if (!this._unitCommandManager.isRepeatMovable()) {
					// 再移動が許可されていない場合は、再移動が発生しないようにする
					this._targetUnit.setMostResentMov(ParamBonus.getMov(this._targetUnit));
				}
				
				// ユニットは何らかの行動をしたため、待機状態にする
				this._parentTurnObject.recordPlayerAction(true);
				return 0;
			}
			else {
				// ユニットは行動しなかったため、位置とカーソルを戻す
				this._parentTurnObject.setPosValue(unit);
			}
			
			// 向きを正面にする
			unit.setDirection(DirectionType.NULL);
		}
		else {
			this._parentTurnObject.recordPlayerAction(true);
			return 1;
		}
		
		return 2;
	},
	
	_pushFlowEntries: function(straightFlow) {
		// 行動終了後に何かしたい場合にオブジェクトを追加する
		straightFlow.pushFlowEntry(RepeatMoveFlowEntry);
		straightFlow.pushFlowEntry(UnitWaitFlowEntry);
		straightFlow.pushFlowEntry(ReactionFlowEntry);
	}
}
);

var RepeatMoveFlowEntry = defineObject(BaseFlowEntry,
{
	_mapSequenceArea: null,
	_playerTurn: null,
	
	enterFlowEntry: function(playerTurn) {
		this._prepareMemberData(playerTurn);
		return this._completeMemberData(playerTurn);
	},
	
	moveFlowEntry: function() {
		var result = this._mapSequenceArea.moveSequence();
		
		if (result === MapSequenceAreaResult.COMPLETE) {
			return MoveResult.END;
		}
		else if (result === MapSequenceAreaResult.CANCEL) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._mapSequenceArea.drawSequence();
	},
	
	// 以下3つのメソッドは、MapSequenceAreaから呼ばれる
	getTurnTargetUnit: function() {
		return this._playerTurn.getTurnTargetUnit();
	},
	
	setCursorSave: function(unit) {
		this._playerTurn.setCursorSave(unit);
	},
	
	isRepeatMoveMode: function() {
		return true;
	},
	
	_prepareMemberData: function(playerTurn) {
		this._playerTurn = playerTurn;
		this._mapSequenceArea = createObject(MapSequenceArea);
	},
	
	_completeMemberData: function(playerTurn) {
		if (!this._isTargetMovable(playerTurn)) {
			return EnterResult.NOTENTER;
		}
		
		this._mapSequenceArea.openSequence(this);
		
		return EnterResult.OK;
	},
	
	_isTargetMovable: function(playerTurn) {
		var unit = playerTurn.getTurnTargetUnit();
		
		if (StateControl.isBadStateOption(unit, BadStateOption.NOACTION)) {
			return false;
		}
		
		if (StateControl.isBadStateOption(unit, BadStateOption.BERSERK)) {
			return false;
		}
		
		if (StateControl.isBadStateOption(unit, BadStateOption.AUTO)) {
			return false;
		}
		
		return unit.getMostResentMov() !== ParamBonus.getMov(unit);
	}
}
);

var UnitWaitFlowEntry = defineObject(BaseFlowEntry,
{
	_capsuleEvent: null,
	
	enterFlowEntry: function(playerTurn) {
		this._prepareMemberData(playerTurn);
		return this._completeMemberData(playerTurn);
	},
	
	moveFlowEntry: function() {
		if (this._capsuleEvent.moveCapsuleEvent() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_prepareMemberData: function(playerTurn) {
		this._capsuleEvent = createObject(CapsuleEvent);
	},
	
	_completeMemberData: function(playerTurn) {
		var event;
		var unit = playerTurn.getTurnTargetUnit();
		
		unit.setMostResentMov(0);
		
		// 「無限行動」でなければ待機
		if (!Miscellaneous.isPlayerFreeAction(unit)) {
			unit.setWait(true);
		}
		
		// unitの現在位置から待機の場所イベントを取得
		event = this._getWaitEvent(unit);
		if (event === null) {
			return EnterResult.NOTENTER;
		}
		
		return this._capsuleEvent.enterCapsuleEvent(event, true);
	},
	
	_getWaitEvent: function(unit) {
		var event = PosChecker.getPlaceEventFromUnit(PlaceEventType.WAIT, unit);
		
		if (event !== null && event.getExecutedMark() === EventExecutedType.FREE && event.isEvent()) {
			return event;
		}
		
		return null;
	}
}
);

var ReactionFlowEntry = defineObject(BaseFlowEntry,
{
	_targetUnit: null,
	_dynamicAnime: null,
	_skill: null,
	
	enterFlowEntry: function(playerTurn) {
		this._prepareMemberData(playerTurn);
		return this._completeMemberData(playerTurn);
	},
	
	moveFlowEntry: function() {
		if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
			this._doEndAction();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._dynamicAnime.drawDynamicAnime();
	},
	
	_prepareMemberData: function(playerTurn) {
		this._targetUnit = playerTurn.getTurnTargetUnit();
		this._dynamicAnime = createObject(DynamicAnime);
	},
	
	_completeMemberData: function(playerTurn) {
		if (!this._isReactionAllowed()) {
			return EnterResult.NOTENTER;
		}
		
		if (!this._checkReactionSkill()) {
			return EnterResult.NOTENTER;
		}
		
		this._startReactionAnime();
		
		return EnterResult.OK;
	},
	
	_isReactionAllowed: function() {
		if (this._targetUnit.getHp() === 0) {
			return false;
		}
		
		// 「無限行動」時には再行動は発生しない
		if (Miscellaneous.isPlayerFreeAction(this._targetUnit)) {
			return false;
		}
		
		return true;
	},
	
	_checkReactionSkill: function() {
		var skill;
		
		// 待ちターンが残っている場合、再行動できない
		if (this._targetUnit.getReactionTurnCount() !== 0) {
			return false;
		}
		
		skill = SkillControl.getBestPossessionSkill(this._targetUnit, SkillType.REACTION);
		if (skill === null) {
			return false;
		}
		
		if (!Probability.getInvocationProbabilityFromSkill(this._targetUnit, skill)) {
			return false;
		}
		
		this._skill = skill;
		
		return true;
	},
	
	_doEndAction: function() {
		this._targetUnit.setReactionTurnCount(this._skill.getSkillValue());
		this._targetUnit.setWait(false);
		// 下記コードは敵AI用
		this._targetUnit.setOrderMark(OrderMarkType.FREE);
	},
	
	_startReactionAnime: function() {
		var x = LayoutControl.getPixelX(this._targetUnit.getMapX());
		var y = LayoutControl.getPixelY(this._targetUnit.getMapY());
		var anime = this._getReactionAnime();
		var pos = LayoutControl.getMapAnimationPos(x, y, anime);
		
		this._dynamicAnime.startDynamicAnime(anime, pos.x, pos.y, anime);
	},
	
	_getReactionAnime: function() {
		return root.queryAnime('reaction');
	}
}
);
