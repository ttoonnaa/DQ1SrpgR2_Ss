
var SaveCallEventCommand = defineObject(BaseEventCommand,
{
	_loadSaveScreen: null,
	
	enterEventCommandCycle: function() {
		this._prepareEventCommandMemberData();
		
		if (!this._checkEventCommand()) {
			return EnterResult.NOTENTER;
		}
		
		return this._completeEventCommandMemberData();
	},
	
	moveEventCommandCycle: function() {
		if (SceneManager.isScreenClosed(this._loadSaveScreen)) {
			SceneManager.setForceForeground(false);
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawEventCommandCycle: function() {
	},
	
	isEventCommandSkipAllowed: function() {
		// Spaceキーや右クリック押下によるスキップを許可しない
		return false;
	},
	
	_prepareEventCommandMemberData: function() {
		this._loadSaveScreen = createObject(LoadSaveControl.getSaveScreenObject());
	},
	
	_checkEventCommand: function() {
		return true;
	},
	
	_completeEventCommandMemberData: function() {
		var screenParam;
		
		if (root.getEventCommandObject().getSaveCallType() === SaveCallType.COMPLETE) {
			this._doCompleteAction();
			return EnterResult.NOTENTER;
		}
		
		screenParam = this._createScreenParam();
		SceneManager.addScreen(this._loadSaveScreen, screenParam);
		SceneManager.setForceForeground(true);
		
		this._doCurrentAction();
		
		return EnterResult.OK;
	},
	
	_doCurrentAction: function() {
		var unit;
		
		// 戦闘シーン以外でユニットが待機状態になることはない
		if (root.getBaseScene() !== SceneType.FREE) {
			return;
		}
		
		// 「自軍無限行動」が許可されている場合は、ユニットが待機状態になることはない
		if (root.getCurrentSession().isMapState(MapStateType.PLAYERFREEACTION)) {
			return;
		}
		
		unit = this._getUnitFromUnitCommand();
		if (unit !== null) {
			// ユニットコマンド経由でセーブが行われた場合、そのユニットはコマンド操作を行ったのだから待機したとみなさなければならない。	
			// 実際にセーブが実行される前にユニットを待機状態にすることで、セーブファイルに待機状態が反映される。
			unit.setWait(true);
		}
	},
	
	_getUnitFromUnitCommand: function() {
		if (root.getCurrentSession().getTurnType() !== TurnType.PLAYER) {
			return null;
		}
		
		// root.getCurrentSession().getActiveEventUnit()を呼び出すと、
		// 「自軍ターン開始時」の自動開始イベントの際に、敵ターンで最後に行動したユニットを参照してしまう。
		return SceneManager.getActiveScene().getTurnObject().getTurnTargetUnit();
	},
	
	_doCompleteAction: function() {
		// 現在、使用している(ロードしている)セーブファイルによって、ゲームクリアを達成したものとホスト側に通知する。
		// 通知していれば、エンディング時にクリア済みセーブファイルを生成できる。
		root.getEventCommandObject().setCompleteSaveFlag();
	},
	
	_createScreenParam: function() {
		var screenParam = ScreenBuilder.buildLoadSave();
		
		screenParam.isLoad = false;
		
		// イベントコマンドでgetCurrentSceneを呼び出すとSceneType.EVENTが返るので、getBaseSceneを呼び出す
		screenParam.scene = root.getBaseScene();
		screenParam.mapId = this._getMapId(screenParam.scene);
		
		return screenParam;
	},
	
	_getMapId: function(sceneType) {
		var mapId;
		
		if (sceneType === SceneType.REST) {
			mapId = root.getSceneController().getNextMapId();
		}
		else {
			mapId = root.getCurrentSession().getCurrentMapInfo().getId();
		}
		
		return mapId;
	}
}
);
