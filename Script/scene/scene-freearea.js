
var FreeAreaMode = {
	TURNSTART: 0,
	TURNEND: 1,
	MAIN: 2
};

var FreeAreaScene = defineObject(BaseScene,
{
	_turnChangeStart: null,
	_turnChangeEnd: null,
	_playerTurnObject: null,
	_enemyTurnObject: null,
	_partnerTurnObject: null,
	
	setSceneData: function() {
		this._prepareSceneMemberData();
		this._completeSceneMemberData();
	},
	
	moveSceneCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		MapLayer.moveMapLayer();
		
		if (mode === FreeAreaMode.TURNSTART) {
			result = this._moveTurnStart();
		}
		else if (mode === FreeAreaMode.TURNEND) {
			result = this._moveTurnEnd();
		}
		else if (mode === FreeAreaMode.MAIN) {
			result = this._moveMain();
		}
		
		return result;
	},
	
	drawSceneCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === FreeAreaMode.TURNSTART) {
			this._drawTurnStart();
		}
		else if (mode === FreeAreaMode.TURNEND) {
			this._drawTurnEnd();
		}
		else if (mode === FreeAreaMode.MAIN) {
			this._drawMain();
		}
	},
	
	moveBackSceneCycle: function() {
		var preAttack = AttackControl.getPreAttackObject();
		
		MapLayer.moveMapLayer();
		
		if (preAttack !== null) {
			preAttack.getCoreAttack().backCoreAttackCycle();
		}
		
		return MoveResult.CONTINUE;
	},
	
	getTurnObject: function() {
		var obj = null;
		var type = root.getCurrentSession().getTurnType();
		
		if (type === TurnType.PLAYER) {
			obj = this._playerTurnObject;
		}
		else if (type === TurnType.ENEMY) {
			obj = this._enemyTurnObject;
		}
		else if (type === TurnType.ALLY) {
			obj = this._partnerTurnObject;
		}
		
		return obj;
	},
	
	turnEnd: function() {
		this._processMode(FreeAreaMode.TURNEND);
	},
	
	notifyLoadGame: function() {
		this._isLoad = true;
	},
	
	notifyAutoEventCheck: function() {
		this.getTurnObject().notifyAutoEventCheck();
	},
	
	isDebugMouseActionAllowed: function() {
		var type = root.getCurrentSession().getTurnType();
		
		if (type !== TurnType.PLAYER) {
			return false;
		}
		
		return this.getTurnObject().isDebugMouseActionAllowed();
	},
	
	_prepareSceneMemberData: function() {
		this._turnChangeStart = createObject(TurnChangeStart);
		this._turnChangeEnd = createObject(TurnChangeEnd);
		this._playerTurnObject = createObject(PlayerTurn);
		this._enemyTurnObject = createObject(EnemyTurn);
		this._partnerTurnObject = createObject(EnemyTurn);
	},
	
	_completeSceneMemberData: function() {
		// セーブファイルのロードによってこの画面が表示される場合、ターン開始の処理を省く。
		if (root.getSceneController().isActivatedFromSaveFile()) {
			this._initializeNewMap();
			this._playTurnMusic();
			this._processMode(FreeAreaMode.MAIN);
		}
		else {
			this._processMode(FreeAreaMode.TURNSTART);
		}
	},
	
	_moveTurnStart: function() {
		if (this._turnChangeStart.moveTurnChangeCycle() !== MoveResult.CONTINUE) {
			this._processMode(FreeAreaMode.MAIN);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveTurnEnd: function() {
		if (this._turnChangeEnd.moveTurnChangeCycle() !== MoveResult.CONTINUE) {
			this._processMode(FreeAreaMode.TURNSTART);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveMain: function() {
		this.getTurnObject().moveTurnCycle();
		
		// イベントコマンドの「マップクリア」によってシーンが変更するため、
		// このメソッドは常にMoveResult.CONTINUEを返して問題ない。
		return MoveResult.CONTINUE;
	},
	
	_drawTurnStart: function() {
		MapLayer.drawUnitLayer();
		this._turnChangeStart.drawTurnChangeCycle();
	},
	
	_drawTurnEnd: function() {
		MapLayer.drawUnitLayer();
		this._turnChangeEnd.drawTurnChangeCycle();
	},
	
	_drawMain: function() {
		this.getTurnObject().drawTurnCycle();
	},
	
	_initializeNewMap: function() {
		// 新しいマップに入る時には、前のマップの設定をリセットする
		SceneManager.resetCurrentMap();
		
		MapHpControl.updateHpAll();
		
		// 塗りつぶされていたかもしれない画面を戻す
		SceneManager.setEffectAllRange(false);
		
		if (root.getCurrentSession().getTurnType() === TurnType.PLAYER) {
			this.getTurnObject().setAutoCursorSave(true);
		}
	},
	
	_playTurnMusic: function() {
		var handle;
		var map = root.getCurrentSession().getCurrentMapInfo();
		var type = root.getCurrentSession().getTurnType();
		
		if (type === TurnType.PLAYER) {
			handle = map.getPlayerTurnMusicHandle();
		}
		else if (type === TurnType.ALLY) {
			handle = map.getAllyTurnMusicHandle();
		}
		else {
			handle = map.getEnemyTurnMusicHandle();
		}
		
		MediaControl.clearMusicCache();
		MediaControl.musicPlayNew(handle);
	},
	
	_processMode: function(mode) {
		if (mode === FreeAreaMode.TURNSTART) {
			if (this._turnChangeStart.enterTurnChangeCycle() === EnterResult.NOTENTER) {
				this._processMode(FreeAreaMode.MAIN);
			}
			else {
				this.changeCycleMode(mode);
			}
		}
		else if (mode === FreeAreaMode.TURNEND) {
			if (this._turnChangeEnd.enterTurnChangeCycle() === EnterResult.NOTENTER) {
				this._processMode(FreeAreaMode.TURNSTART);
			}
			else {
				this.changeCycleMode(mode);
			}
		}
		else if (mode === FreeAreaMode.MAIN) {
			// この処理によって、PlayerTurnとEnemyTurnの自動イベントチェックで、
			// イベント条件の「開始と終了」が考慮されなくなる。
			root.getCurrentSession().setStartEndType(StartEndType.NONE);
			
			this.getTurnObject().openTurnCycle();
			
			this.changeCycleMode(mode);
		}
	}
}
);
