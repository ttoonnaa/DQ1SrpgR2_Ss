
var BattleSetupMode = {
	BEFORESETUP: 0,
	TOPCOMMAND: 1,
	SETUPEDIT: 2,
	AFTERSETUP: 3
};

var BattleSetupScene = defineObject(BaseScene,
{
	_setupCommandManager: null,
	_setupEdit: null,
	_straightFlowBefore: null,
	_straightFlowAfter: null,
	_wavePanel: null,
	_sortieSetting: null,
	_isSetupFinal: false,
	
	setSceneData: function() {
		// 新しいマップに入る時には、前のマップの設定をリセットする
		SceneManager.resetCurrentMap();
		
		// オープニングイベントのために、予め画面を塗りつぶしておく
		SceneManager.setEffectAllRange(true);
		
		this._prepareSceneMemberData();
		this._completeSceneMemberData();
	},
	
	moveSceneCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		this._moveCommonAnimation();
		
		if (mode === BattleSetupMode.BEFORESETUP) {
			result = this._moveBeforeSetup();
		}
		else if (mode === BattleSetupMode.TOPCOMMAND) {
			result = this._moveTopCommand();
		}
		else if (mode === BattleSetupMode.SETUPEDIT) {
			result = this._moveSetupEdit();
		}
		else if (mode === BattleSetupMode.AFTERSETUP) {
			result = this._moveAfterSetup();
		}
		
		return result;
	},
	
	drawSceneCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === BattleSetupMode.SETUPEDIT || mode === BattleSetupMode.TOPCOMMAND) {
			this._drawSortieMark();
		}
		
		if (mode === BattleSetupMode.SETUPEDIT) {
			this._setupEdit.drawSetupUnitHotPanel();
		}
		
		MapLayer.drawUnitLayer();
		
		if (mode === BattleSetupMode.SETUPEDIT) {
			this._setupEdit.drawSetupEdit();
		}
		else if (mode === BattleSetupMode.TOPCOMMAND) {
			this._setupCommandManager.drawListCommandManager();
		}
		else if (mode === BattleSetupMode.BEFORESETUP) {
			this._straightFlowBefore.drawStraightFlow();
		}
		else if (mode === BattleSetupMode.AFTERSETUP) {
			this._straightFlowAfter.drawStraightFlow();
		}
	},
	
	moveBackSceneCycle: function() {
		this._moveCommonAnimation();
		return MoveResult.CONTINUE;
	},
	
	endBattleSetup: function() {
		var list = PlayerList.getSortieList();
		
		if (list.getCount() > 0) {
			this._isSetupFinal = true;
		}
	},
	
	getSortieSetting: function() {
		return this._sortieSetting;
	},
	
	_prepareSceneMemberData: function() {
		this._setupCommandManager = createObject(SetupCommand);
		this._setupEdit = createObject(SetupEdit);
		this._straightFlowBefore = createObject(StraightFlow);
		this._straightFlowAfter = createObject(StraightFlow);
		this._wavePanel = createObject(WavePanel);
		this._sortieSetting = createObject(SortieSetting);
		this._isSetupFinal = false;
	},
	
	_completeSceneMemberData: function() {
		if (root.getSceneController().isActivatedFromSaveFile()) {
			MediaControl.resetMusicList();
		}
		
		root.getCurrentSession().setStartEndType(StartEndType.NONE);
		
		this._setupEdit.openSetupEdit();
		
		this._straightFlowBefore.setStraightFlowData(this);
		this._pushFlowBeforeEntries(this._straightFlowBefore);
		
		this._straightFlowAfter.setStraightFlowData(this);
		this._pushFlowAfterEntries(this._straightFlowAfter);
		
		this._straightFlowBefore.enterStraightFlow();
		this.changeCycleMode(BattleSetupMode.BEFORESETUP);
	},
	
	_moveCommonAnimation: function() {
		MapLayer.moveMapLayer();
		this._wavePanel.moveWavePanel();
		return MoveResult.CONTINUE;
	},
	
	_moveBeforeSetup: function() {
		if (this._straightFlowBefore.moveStraightFlow() !== MoveResult.CONTINUE) {
			if (!root.getCurrentSession().getCurrentMapInfo().isBattleSetupScreenDisplayable()) {
				// 戦闘準備画面を表示しないため、直ちに開始
				return this._startBattle();
			}
			
			this._setupCommandManager.openListCommandManager();
			this.changeCycleMode(BattleSetupMode.TOPCOMMAND);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveTopCommand: function() {
		if (this._setupCommandManager.moveListCommandManager() !== MoveResult.CONTINUE) {
			this.changeCycleMode(BattleSetupMode.SETUPEDIT);
		}
		else {
			if (this._isSetupFinal) {
				return this._startBattle();
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveSetupEdit: function() {
		if (this._setupEdit.moveSetupEdit() !== MoveResult.CONTINUE) {
			this._setupCommandManager.openListCommandManager();
			this.changeCycleMode(BattleSetupMode.TOPCOMMAND);
		}
		else {
			if (this._isSetupFinal) {
				return this._startBattle();
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAfterSetup: function() {
		if (this._straightFlowAfter.moveStraightFlow() !== MoveResult.CONTINUE) {
			this._changeFreeScene();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	// ※ゲストの参加処理とMapStartFlowEntryの処理は、FreeAreaSceneの最初に行うよう変更される可能性がある
	_startBattle: function() {
		// イベントでゲストを扱えるように、enterStraightFlowより先に実行
		root.getCurrentSession().joinGuestUnit();
		
		if (this._straightFlowAfter.enterStraightFlow() === EnterResult.NOTENTER) {
			this._changeFreeScene();
			return MoveResult.END;
		}
		else {
			this.changeCycleMode(BattleSetupMode.AFTERSETUP);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_changeFreeScene: function() {
		// イベント内でシーン変更やマップクリアが発生していない場合のみ、SceneType.FREEを実行する
		if (root.getCurrentScene() === SceneType.BATTLESETUP) {
			this._closeMusic();
			root.changeScene(SceneType.FREE);
		}
	},
	
	_closeMusic: function() {
		var map = root.getCurrentSession().getCurrentMapInfo();
		var handle = map.getPlayerTurnMusicHandle();
		var handleActive = root.getMediaManager().getActiveMusicHandle();
		
		// 現在再生されているBGMが自軍ターンBGMと異なる場合、BGMを停止。
		// BGMが同一なら、そのまま再生される。
		if (!handle.isEqualHandle(handleActive)) {
			MediaControl.clearMusicCache();
		}
	},
	
	_drawSortieMark: function() {
		var i, x, y;
		var arr = this._sortieSetting.getSortieArray();
		var count = arr.length;
		var pic = root.queryUI('sortie_panel');
		
		if (!root.getCurrentSession().isMapState(MapStateType.UNITDRAW)) {
			return;
		}
		
		for (i = 0; i < count; i++) {
			if (!arr[i].isFixed){
				x = (arr[i].x * GraphicsFormat.MAPCHIP_WIDTH) - root.getCurrentSession().getScrollPixelX();
				y = (arr[i].y * GraphicsFormat.MAPCHIP_HEIGHT) - root.getCurrentSession().getScrollPixelY();
				this._wavePanel.drawWavePanel(x, y, pic);
			}
		}
	},
	
	_pushFlowBeforeEntries: function(straightFlow) {
		straightFlow.pushFlowEntry(OpeningEventFlowEntry);
		straightFlow.pushFlowEntry(SetupMusicFlowEntry);
		straightFlow.pushFlowEntry(AutoScrollFlowEntry);
	},
	
	_pushFlowAfterEntries: function(straightFlow) {
		straightFlow.pushFlowEntry(MapStartFlowEntry);
	}
}
);

var MapStartFlowEntry = defineObject(BaseFlowEntry,
{
	_turnChangeMapStart: null,
	
	enterFlowEntry: function(battleSetupScene) {
		this._prepareMemberData(battleSetupScene);
		return this._completeMemberData(battleSetupScene);
	},
	
	moveFlowEntry: function() {
		return this._turnChangeMapStart.moveTurnChangeCycle();
	},
	
	drawFlowEntry: function() {
		this._turnChangeMapStart.drawTurnChangeCycle();
	},
	
	_prepareMemberData: function(battleSetupScene) {
		this._turnChangeMapStart = createObject(TurnChangeMapStart);
	},
	
	_completeMemberData: function(battleSetupScene) {
		return this._turnChangeMapStart.enterTurnChangeCycle();
	}
}
);

var OpeningEventMode = {
	EVENT: 0,
	FADEIN: 1
};

var OpeningEventFlowEntry = defineObject(BaseFlowEntry,
{
	_evetChecker: null,
	_transition: null,
	
	enterFlowEntry: function(battleSetupScene) {
		this._prepareMemberData(battleSetupScene);
		return this._completeMemberData(battleSetupScene);
	},
	
	moveFlowEntry: function() {
		var result = MoveResult.END;
		var mode = this.getCycleMode();
		
		if (mode === OpeningEventMode.EVENT) {
			result = this._moveEvent();
		}
		else if (mode === OpeningEventMode.FADEIN) {
			result = this._moveFadein();
		}
		
		return result;
	},
	
	drawFlowEntry: function() {
		var mode = this.getCycleMode();
		
		if (mode === OpeningEventMode.FADEIN) {
			this._drawFadein();
		}
	},
	
	_prepareMemberData: function(battleSetupScene) {
		this._eventChecker = createObject(EventChecker);
		this._transition = createObject(SystemTransition);
	},
	
	_completeMemberData: function(battleSetupScene) {
		var result;
		
		this._checkUnitParameter();
		
		if (root.isOpeningEventSkip()) {
			this._eventChecker.enableAllSkip();
		}
		
		// オープニングイベントでは既定でユニットが非表示になる
		SceneManager.getActiveScene().getSortieSetting().startSortieSetting(true);
		
		// スクリプトエラーが発生した場合は、ゲームを再開できる機能があるが、
		// その再開が前のマップから行われるような事態にならないように、startSortieSettingの後に呼び出す。
		RetryControl.register();
		
		result = this._eventChecker.enterEventChecker(root.getCurrentSession().getOpeningEventList(), EventType.OPENING);
		if (result === EnterResult.NOTENTER) {
			this._doLastAction();
		}
		else {
			this.changeCycleMode(OpeningEventMode.EVENT);
		}
		
		return EnterResult.OK;
	},
	
	_moveEvent: function() {
		if (this._eventChecker.moveEventChecker() !== MoveResult.CONTINUE) {
			this._doLastAction();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveFadein: function() {
		return this._transition.moveTransition();
	},
	
	_drawFadein: function() {
		this._transition.drawTransition();
	},
	
	_doLastAction: function() {
		// オープニングイベントの実行で別シーン(たとえば、ゲームオーバー)に遷移した可能性があり得る。
		// この場合、シーンが戦闘準備でなくなっているため続行しない。
		if (SceneManager._sceneType !== SceneType.BATTLESETUP) {
			return;
		}
		
		// 非表示状態を解除する
		SceneManager.getActiveScene().getSortieSetting().startSortieSetting(false);
		
		// BattleSetupScreenでセーブを行い、その後にセーブファイルがロードされても、
		// オープニングイベントは実行されるべきであるため、ここで実行済み状態を解除している。
		this._resetOpeningEventList();
		
		this._transition.setFadeSpeed(10);
		this._transition.setDestIn();
		
		this.changeCycleMode(OpeningEventMode.FADEIN);
	},
	
	_resetOpeningEventList: function() {
		var i, event;
		var list = root.getCurrentSession().getOpeningEventList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			event = list.getData(i);
			event.setExecutedMark(EventExecutedType.FREE);
		}
	},
	
	_checkUnitParameter: function() {
		var i, j, list, unit, listCount, count;
		var listArray = FilterControl.getAliveListArray(UnitFilterFlag.PLAYER | UnitFilterFlag.ENEMY | UnitFilterFlag.ALLY);
		
		listCount = listArray.length;
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count = list.getCount();
			for (j = 0; j < count; j++) {
				unit = list.getData(j);
				this._resetUnit(unit);
			}
		}
		
		list = root.getCurrentSession().getGuestList();
		count = list.getCount();
		for (j = 0; j < count; j++) {
			unit = list.getData(j);
			this._resetUnit(unit);
		}
	},
	
	// 戦闘準備画面は、マップから帰還した場合(シーンの変更で戦闘準備を選択した場合)も実行されるため、
	// ここで回復処理を行うことは、帰還後にも回復処理が行われることを意味する。
	_resetUnit: function(unit) {
		if (DataConfig.isBattleSetupRecoverable() && unit.getUnitType() === UnitType.PLAYER) {
			// 戦闘準備画面では自軍以外は、保存されないため、自軍のみ回復対象になる。
			// クラスボーナスなどのHP変動に対応できる。
			UnitProvider.recoveryPrepareUnit(unit);
		}
		
		UnitProvider.setupFirstUnit(unit);
	}
}
);

var SetupMusicFlowEntry = defineObject(BaseFlowEntry,
{
	enterFlowEntry: function(battleSetupScene) {
		this._prepareMemberData(battleSetupScene);
		return this._completeMemberData(battleSetupScene);
	},
	
	moveFlowEntry: function() {
		return MoveResult.END;
	},
	
	_prepareMemberData: function(battleSetupScene) {
	},
	
	_completeMemberData: function(battleSetupScene) {
		if (root.getCurrentSession().getCurrentMapInfo().isBattleSetupScreenDisplayable()) {
			this._playSetupMusic();
		}
		
		return EnterResult.NOTENTER;
	},
	
	_playSetupMusic: function() {
		var map = root.getCurrentSession().getCurrentMapInfo();
		var handle = map.getBattleSetupMusicHandle();
		var handleActive = root.getMediaManager().getActiveMusicHandle();
		
		// 現在再生されているBGMが戦闘準備画面のBGMと異なる場合、BGMを停止。
		// BGMが同一なら、そのまま再生される。
		if (!handle.isEqualHandle(handleActive)) {
			MediaControl.clearMusicCache();
			MediaControl.musicPlayNew(handle);
		}
	}
}
);

var AutoScrollFlowEntry = defineObject(BaseFlowEntry,
{
	_dynamicEvent: null,

	enterFlowEntry: function(battleSetupScene) {
		this._prepareMemberData(battleSetupScene);
		return this._completeMemberData(battleSetupScene);
	},
	
	moveFlowEntry: function() {
		var result = this._dynamicEvent.moveDynamicEvent();
		
		if (result !== MoveResult.CONTINUE) {
			this._setCenterPos();
		}
		
		return result;
	},
	
	_prepareMemberData: function(battleSetupScene) {
		this._dynamicEvent = createObject(DynamicEvent);
	},
	
	_completeMemberData: function(battleSetupScene) {
		var generator;
	
		if (!this._isContinue()) {
			return EnterResult.NOTENTER;
		}
		
		generator = this._dynamicEvent.acquireEventGenerator();
		generator.mapScroll(SpeedType.NORMAL, true, true);
		
		// 初期メンバーなしで最初からゲームを開始し、
		// さらに戦闘準備画面を表示するマップの場合は、この条件式が成立することがある。
		if (PlayerList.getAliveList().getCount() === 0) {
			generator.infoWindow(StringTable.BattleSetup_NoPlayer, InfoWindowType.WARNING, 0, 0, true);
			generator.sceneChange(SceneChangeType.GAMEOVER);
		}
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	_isContinue: function() {
		// 戦闘準備画面を表示しない場合であるか調べる
		if (!root.getCurrentSession().getCurrentMapInfo().isBattleSetupScreenDisplayable()) {
			return false;
		}
		
		if (!root.getCurrentSession().getCurrentMapInfo().isMapScroll()) {
			return false;
		}
		
		// テストプレイにて、オープニングイベントをスキップする場合は、マップスクロールもスキップされる
		if (root.isOpeningEventSkip()) {
			return false;
		}
		
		return true;
	},
	
	_setCenterPos: function() {
		var session = root.getCurrentSession();
		var mx = session.getScrollPixelX();
		var my = session.getScrollPixelY();
		var width = Math.floor(root.getGameAreaWidth() / 2);
		var height = Math.floor(root.getGameAreaHeight() / 2);
		var x = Math.floor((mx + width) / GraphicsFormat.MAPCHIP_WIDTH);
		var y = Math.floor((my + height) / GraphicsFormat.MAPCHIP_HEIGHT);
		
		root.getCurrentSession().setMapCursorX(x);
		root.getCurrentSession().setMapCursorY(y);
	}
}
);

var SortieSetting = defineObject(BaseScreen,
{
	_sortiePosArray: null,
	
	// このメソッドは、シーンの開始時とオープニングイベントの終了時に呼ばれる。
	// 前者だけだと、オープニングイベントで出撃数を変更したり、ユニットを登場させたりしても、
	// それが反映されないことになってしまう。
	// 逆に後者だけだと、オープニングイベントでマップを表示した時に、
	// ユニットの出撃が完了していないためにユニットが見えないことになる。
	// このため、最初の呼び出しでは引数にtrueを指定することで、
	// ユニットを非表示の状態で出撃完了扱いにしている。
	// これならば、イベントコマンドの「ユニットの状態変更」で非表示状態を無効にすることで、
	// ユニットをいつでも見えるようにできる。
	// 2回目の呼び出しでは、ユニットは常に見えるべきであるため、引数にfalseを指定する。
	startSortieSetting: function(isInvisible) {
		var i, j, list, listCount, count;
		var listArray = FilterControl.getAliveListArray(UnitFilterFlag.PLAYER);
		
		if (!this._isSortieSettingEnabled()) {
			return;
		}
		
		this._createSortiePosArray();
		this._setInitialUnitPos();
		
		listCount = listArray.length;
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count = list.getCount();
			for (j = 0; j < count; j++) {
				list.getData(j).setInvisible(isInvisible);
			}
		}
	},
	
	setSortieMark: function(index) {
		var list = PlayerList.getAliveList();
		var unit = list.getData(index);
		
		if (!this.isForceSortie(unit)) {	
			if (unit.getSortieState() === SortieType.UNSORTIE) {
				this._sortieUnit(unit);
			}
			else {
				this.nonsortieUnit(unit);
			}
		}
		else {
			return false;
		}
		
		return true;
	},
	
	isForceSortie: function(unit) {	
		var i, forceSortie;
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		var count = mapInfo.getForceSortieCount();
		
		for (i = 0; i < count; i++) {
			forceSortie = mapInfo.getForceSortie(i);
			if (unit === forceSortie.getUnit()) {
				return true;
			}
		}
		
		return false;
	},
	
	isSortie: function(unit) {
		// 負傷生存のユニットは、出撃できない
		if (!DataConfig.isBattleSetupRecoverable() && unit.getHp() === ChronicInjuryHp.ZERO) {
			return false;
		}
		
		return cur_map.getSortieAggregation().isCondition(unit);
	},
	
	getSortieCount: function() {
		var i;
		var count = this._sortiePosArray.length;
		var sortieCount = 0;
		
		for (i = 0; i < count; i++) {
			if (this._sortiePosArray[i].unit !== null) {
				sortieCount++;
			}
		}
		
		return sortieCount;
	},
	
	getSortieArray: function() {
		return this._sortiePosArray;
	},
	
	nonsortieUnit: function(unit) {
		var i;
		var count = this._sortiePosArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._sortiePosArray[i].unit === unit) {
				this._sortiePosArray[i].unit = null;
				break;
			}
		}
		
		unit.setSortieState(SortieType.UNSORTIE);
	},
	
	assocUnit: function(unit, sortiePos) {
		if (unit !== null) {
			unit.setMapX(sortiePos.x);
			unit.setMapY(sortiePos.y);
		}
		
		sortiePos.unit = unit;
	},
	
	getDefaultSortieMaxCount: function() {
		return cur_map.getSortieMaxCount();
	},
	
	_isSortieSettingEnabled: function() {
		return root.getCurrentSession().getCurrentMapInfo().isBattleSetupScreenDisplayable();
	},
	
	_createSortiePosArray: function() {
		var i, sortiePos;
		var count = this.getDefaultSortieMaxCount();
		
		this._sortiePosArray = [];
		
		for (i = 0; i < count; i++) {
			sortiePos = StructureBuilder.buildSortiePos();
			sortiePos.x = this._getDefaultSortiePosX(i);
			if (sortiePos.x === -1) {
				// 本来の出撃数を超える変更がされている場合は、処理を続行しない
				break;
			}
			sortiePos.y = this._getDefaultSortiePosY(i);
			sortiePos.unit = null;
			sortiePos.isFixed = false;
			this._sortiePosArray.push(sortiePos);
		}
	},
	
	_setInitialUnitPos: function() {
		var i, unit;
		var list = PlayerList.getAliveList();
		var count = list.getCount();
		var maxCount = this._sortiePosArray.length;
		var sortieCount = 0;
		
		// 現在のマップの戦闘準備画面で一度でもセーブを行うと、isFirstSetupはfalseを返す
		if (!root.getMetaSession().isFirstSetup()) {
			// 現在のユニット位置を基準に、_sortiePosArrayのunitを初期化する
			this._arrangeUnitPos();
			return;
		}
		
		// 初めて戦闘準備画面が表示される場合は、後続の処理によって出撃状態が自動で設定される
		
		this._clearSortieList();
		
		// 強制出撃(位置指定あり)のユニットを、順に出撃状態にする
		for (i = 0; i < count && sortieCount < maxCount; i++) {
			unit = list.getData(i);
			if (this.isForceSortie(unit)) {
				if (this._sortieFixedUnit(unit)) {
					sortieCount++;
				}
			}
		}
		
		// 強制出撃(位置指定なし)のユニットを、順に出撃状態にする
		for (i = 0; i < count && sortieCount < maxCount; i++) {
			unit = list.getData(i);
			if (this.isForceSortie(unit) && unit.getSortieState() !== SortieType.SORTIE) {
				if (this._sortieForceUnit(unit)) {
					sortieCount++;
				}
			}
		}
		
		// それ以外のユニットを、順に出撃状態にする
		for (i = 0; i < count && sortieCount < maxCount; i++) {
			unit = list.getData(i);
			if (unit.getSortieState() !== SortieType.SORTIE) {
				if (this._sortieUnit(unit)) {
					sortieCount++;
				}
			}
		}
	},
	
	_arrangeUnitPos: function() {
		var i, j, unit, x, y;
		var list = PlayerList.getSortieList();
		var count = list.getCount();
		var count2 = this._sortiePosArray.length;
		var arr = [];
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			x = unit.getMapX();
			y = unit.getMapY();
			for (j = 0; j < count2; j++) {
				if (this._sortiePosArray[j].x === x && this._sortiePosArray[j].y === y) {
					this._sortiePosArray[j].unit = unit;
					this._sortiePosArray[j].isFixed = this._getForceSortieNumber(unit) > 0;
					break;
				}
			}
			
			if (j === count2) {
				// ユニットの位置がオープニングイベントによって一定でない、
				// またはプロジェクトで出撃位置を変更した場合は、ユニットを_sortiePosArrayに設定できないことがある。
				// そうした設定できないユニットを記録。
				arr.push(unit);
			}
		}
		
		count = arr.length;
		for (i = 0; i < count; i++) {
			unit = arr[i];
			for (j = 0; j < count2; j++) {
				// ユニットが設定されていない箇所が見つかったのでユニットを設定
				if (this._sortiePosArray[j].unit === null) {
					this._sortiePosArray[j].unit = unit;
					this._sortiePosArray[j].isFixed = this._getForceSortieNumber(unit) > 0;
					unit.setMapX(this._sortiePosArray[j].x);
					unit.setMapY(this._sortiePosArray[j].y);
					break;
				}
			}
		}
	},
	
	_clearSortieList: function() {
		var i, unit;
		var list = PlayerList.getAliveList();
		var count = list.getCount();
		
		// 全てのユニットを非出撃状態にする
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			this.nonsortieUnit(unit);
		}
	},
	
	_sortieUnit: function(unit) {
		var i;
		var count = this._sortiePosArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._sortiePosArray[i].unit === null && this.isSortie(unit)) {
				unit.setSortieState(SortieType.SORTIE);
				this.assocUnit(unit, this._sortiePosArray[i]);
				return true;
			}
		}
		
		return false;
	},
	
	_sortieForceUnit: function(unit) {
		var i;
		var count = this._sortiePosArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._sortiePosArray[i].unit === null) {
				unit.setSortieState(SortieType.SORTIE);
				this.assocUnit(unit, this._sortiePosArray[i]);
				return true;
			}
		}
		
		return false;
	},
	
	_sortieFixedUnit: function(unit) {
		var index = this._getForceSortieNumber(unit) - 1;
		
		if (index >= 0) {
			unit.setSortieState(SortieType.SORTIE);
			this.assocUnit(unit, this._sortiePosArray[index]);
			this._sortiePosArray[index].isFixed = true;
			return true;
		}
		
		return false;
	},
	
	_getForceSortieNumber: function(unit) {
		var i, forceUnit, forceSortie;
		var number = 0;
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		var count = mapInfo.getForceSortieCount();
		
		for (i = 0; i < count; i++) {
			forceSortie = mapInfo.getForceSortie(i);
			forceUnit = forceSortie.getUnit();
			if (forceUnit !== null && unit.getId() === forceUnit.getId()) {
				// getNumberが0を返す場合は、位置指定がないことを意味する
				number = forceSortie.getNumber();
				break;
			}
		}
		
		return number;
	},
	
	_getDefaultSortiePosX: function(i) {
		return cur_map.getSortiePosX(i);
	},
	
	_getDefaultSortiePosY: function(i) {
		return cur_map.getSortiePosY(i);
	}
}
);

var SetupEditMode = {
	TOP: 0,
	POSCHANGE: 1
};

var SetupEdit = defineObject(BaseObject,
{
	_targetObj: null,
	_mapEdit: null,
	_posDoubleCursor: null,
	
	openSetupEdit: function() {
		this._prepareMemberData();
		this._completeMemberData();
	},
	
	moveSetupEdit: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === SetupEditMode.TOP) {
			result = this._moveTopMode();
		}
		else if (mode === SetupEditMode.POSCHANGE) {
			result = this._movePosChangeMode();
		}
		
		this._posDoubleCursor.moveCursor();
		
		return result;
	},
	
	drawSetupEdit: function() {
		this._mapEdit.drawMapEdit();
		
		if (this._targetObj !== null) {
			this._posDoubleCursor.drawCursor(this._targetObj.x, this._targetObj.y, this._mapEdit.getEditX(), this._mapEdit.getEditY());
		}
	},
	
	drawSetupUnitHotPanel: function() {
	},
	
	_prepareMemberData: function() {
		this._targetObj = null;
		this._mapEdit = createObject(MapEdit);
		this._posDoubleCursor = createObject(PosDoubleCursor);	
	},
	
	_completeMemberData: function() {
		this._mapEdit.openMapEdit();
		this.changeCycleMode(SetupEditMode.TOP);
	},
	
	_moveTopMode: function() {
		var x, y;
		var result = this._mapEdit.moveMapEdit();
		
		if (result === MapEditResult.UNITSELECT || result === MapEditResult.MAPCHIPSELECT) {
			x = this._mapEdit.getEditX();
			y = this._mapEdit.getEditY();
			this._targetObj = this._getSortieObject(x, y);
			
			if (this._targetObj !== null && !this._targetObj.isFixed) {
				this._playSelectSound();
				this._mapEdit.disableMarking(true);
				this.changeCycleMode(SetupEditMode.POSCHANGE);
			}
			else {
				this._targetObj = null;
			}
			
			if (result === MapEditResult.MAPCHIPSELECT && this._targetObj === null) {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_movePosChangeMode: function() {
		var x, y, obj;
		var result = this._mapEdit.moveMapEdit();
		
		if (result === MapEditResult.UNITSELECT || result === MapEditResult.MAPCHIPSELECT) {
			x = this._mapEdit.getEditX();
			y = this._mapEdit.getEditY();
			obj = this._getSortieObject(x, y);
			if (obj !== null) {
				this._changePos(obj);
				this._targetObj = null;
				this._playSelectSound();
				this._mapEdit.disableMarking(false);
				this.changeCycleMode(SetupEditMode.TOP);
			}
		}
		else if (result === MapEditResult.MAPCHIPCANCEL) {
			this._targetObj = null;
			this._playCancelSound();
			this._mapEdit.disableMarking(false);
			this.changeCycleMode(SetupEditMode.TOP);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_getSortieObject: function(x, y) {
		var i, count;
		var sortieArray = SceneManager.getActiveScene().getSortieSetting().getSortieArray();
		
		count = sortieArray.length;
		for (i = 0 ; i < count; i++) {
			if (sortieArray[i].x === x && sortieArray[i].y === y && !sortieArray[i].isFixed) {
				return sortieArray[i];
			}
		}
		
		return null;
	},
	
	_changePos: function(obj) {
		var targetUnit = this._targetObj.unit;
		var unit = obj.unit;
		
		SceneManager.getActiveScene().getSortieSetting().assocUnit(targetUnit, obj);
		SceneManager.getActiveScene().getSortieSetting().assocUnit(unit, this._targetObj);
	},
	
	_playSelectSound: function() {
		MediaControl.soundDirect('commandselect');
	},
	
	_playCancelSound: function() {
		MediaControl.soundDirect('commandcancel');
	}
}
);

// 戦闘準備画面という言葉がしばしば記載されているが、
// 正確にはBaseScreenを継承した戦闘準備画面というものは存在していない。
// 現状はSetupCommandを表示するということを戦闘準備画面を表示するという言葉で表している。

var SetupCommand = defineObject(BaseListCommandManager,
{	
	getPositionX: function() {
		return LayoutControl.getRelativeX(8);
	},
	
	getPositionY: function() {
		return LayoutControl.getRelativeY(12);
	},
	
	getCommandTextUI: function() {
		return root.queryTextUI('setupcommand_title');
	},
	
	configureCommands: function(groupArray) {
		var mixer = createObject(CommandMixer);
		
		mixer.pushCommand(SetupCommand.UnitSortie, CommandActionType.UNITSORTIE);
		mixer.pushCommand(SetupCommand.Sortie, CommandActionType.BATTLESTART);
		
		mixer.mixCommand(CommandLayoutType.BATTLESETUP, groupArray, BaseListCommand);
	}
}
);

SetupCommand.UnitSortie = defineObject(BaseListCommand, 
{
	_unitSortieScreen: null,
	
	openCommand: function() {
		var screenParam = this._createScreenParam();
	
		this._unitSortieScreen = createObject(UnitSortieScreen);
		SceneManager.addScreen(this._unitSortieScreen, screenParam);
	},
	
	moveCommand: function() {
		if (SceneManager.isScreenClosed(this._unitSortieScreen)) {
			if (this._unitSortieScreen.getResultCode() === UnitSortieResult.START) {
				SceneManager.getActiveScene().endBattleSetup();
			}
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_createScreenParam: function() {
		var screenParam = ScreenBuilder.buildUnitSortie();
		
		return screenParam;
	}
}
);

SetupCommand.Sortie = defineObject(BaseListCommand,
{
	_questionWindow: null,
	
	openCommand: function() {
		this._questionWindow = createWindowObject(QuestionWindow, this);
		this._questionWindow.setQuestionMessage(StringTable.UnitSortie_Question);
		this._questionWindow.setQuestionActive(true);
	},
	
	moveCommand: function() {
		if (this._questionWindow.moveWindow() !== MoveResult.CONTINUE) {
			if (this._questionWindow.getQuestionAnswer() === QuestionAnswer.YES) {
				SceneManager.getActiveScene().endBattleSetup();
			}
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawCommand: function() {
		var x = LayoutControl.getCenterX(-1, this._questionWindow.getWindowWidth());
		var y = LayoutControl.getCenterY(-1, this._questionWindow.getWindowHeight());
		
		this._questionWindow.drawWindow(x, y);
	}
}
);
