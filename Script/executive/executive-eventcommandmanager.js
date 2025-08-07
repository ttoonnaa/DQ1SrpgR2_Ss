
var EventCommandType = {
	MESSAGESHOW: 0,
	MESSAGEERASE: 1,
	MESSAGETEROP: 2,
	STILLMESSAGE: 3,
	
	MESSAGESCROLL: 100,
	MESSAGETITLE: 101,
	INFOWINDOW: 102,
	CHOICESHOW: 103,
	
	SCREENSCROLL: 200,
	SCREENEFFECT: 201,
	SCREENSTATECHANGE: 202,
	BACKGROUNDCHANGE: 203,
	SCREENSHAKE: 204,
	
	MUSICPLAY: 300,
	MUSICSTOP: 301,
	SOUNDPLAY: 302,
	SOUNDSTOP: 303,
	VIDEOPLAY: 304,
	
	GRAPHICSSHOW: 400,
	GRAPHICSHIDE: 401,
	ANIMATIONPLAY: 402,
	ANIMATIONSTOP: 403,
	MOVEOBJECTSHOW: 404,
	MOVEOBJECTHIDE: 405,
	
	SCENECHANGE: 500,
	SCRIPTEXECUTE: 501,
	WAITACTION: 502,
	SWITCHACTION: 503,
	VARIABLEACTION: 504,
	EVENTSKIP: 505,
	SAVECALL: 506,
	SYSTEMSETTINGS: 507,
	ENVIRONMENTACCESS: 508,
	CONSOLELOG: 509,
	OBJECTADJUST: 510,
	COMMANDJUMP: 511,
	
	UNITAPPEAR: 1000,
	UNITREMOVE: 1001,
	UNITMOVE: 1002,
	UNITASSIGN: 1003,
	
	GOLDCHANGE: 1100,
	ITEMCHANGE: 1101,
	PARAMATERCHANGE: 1102,
	SKILLCHANGE: 1103,
	
	HPRECOVERY: 1200,
	DAMAGEHIT: 1201,
	EXPERIENCEPLUS: 1202,
	CLASSCHANGE: 1203,
	
	ITEMUSE: 1300,
	FORCEBATTLE: 1301,
	
	CHAPTERSHOW: 1400,
	VICTORYMAP: 1401,
	LOCATIONFOCUS: 1402,
	MAPCHIPCHANGE: 1403,
	MAPSCROLL: 1404,
	
	EVENTSTATECHANGE: 1500,
	UNITINFOCHANGE: 1501,
	UNITSTATECHANGE: 1502,
	MAPINFOCHANGE: 1503,
	MAPSTATECHANGE: 1504,
	
	BONUSCHANGE: 1600,
	TROPHYCHANGE: 1601,
	RELATIVETURNMEASURE: 1602,
	DURABILITYCHANGE: 1603,
	UNITSTATEADDITION: 1604,
	UNITCAPACITYCHANGE: 1605,
	UNITSLIDE: 1606,
	UNITFUSION: 1607,
	UNITMETAMORPHOZE: 1608,
	UNITALLCOMMAND: 1609,
	
	POSITIONCHOOSE: 1700,
	MAPPOSOPERATION: 1701
};

var EventCommandManager = {
	_activeEventChecker: null,

	initSingleton: function() {
		this._dispMessageShowEventCommand = createObject(MessageShowEventCommand);
		this._dispMessageTeropEventCommand = createObject(MessageTeropEventCommand);
		this._dispStillMessageEventCommand = createObject(StillMessageEventCommand);
		this._dispMessageScrollEventCommand = createObject(MessageScrollEventCommand);
		this._dispMessageTitleEventCommand = createObject(MessageTitleEventCommand);
		this._dispInfoWindowEventCommand = createObject(InfoWindowEventCommand);
		this._dispChoiceShowEventCommand = createObject(ChoiceShowEventCommand);
		this._dispBackgroundChangeEventCommand = createObject(BackgroundChangeEventCommand);
		this._dispScriptExecuteEventCommand = createObject(ScriptExecuteEventCommand);
		this._dispSaveCallEventCommand = createObject(SaveCallEventCommand);
		this._dispGoldChangeEventCommand = createObject(GoldChangeEventCommand);
		this._dispItemChangeEventCommand = createObject(ItemChangeEventCommand);
		this._dispParameterChangeEventCommand = createObject(ParameterChangeEventCommand);
		this._dispSkillChangeEventCommand = createObject(SkillChangeEventCommand);
		this._dispHpRecoveryEventCommand = createObject(HpRecoveryEventCommand);
		this._dispDamageHitEventCommand = createObject(DamageHitEventCommand);
		this._dispExperiencePlusEventCommand = createObject(ExperiencePlusEventCommand);
		this._dispClassChangeEventCommand = createObject(ClassChangeEventCommand);
		this._dispForceBattleEventCommand = createObject(ForceBattleEventCommand);
		this._dispItemUseEventCommand = createObject(ItemUseEventCommand);
		this._dispChapterShowEventCommand = createObject(ChapterShowEventCommand);
		this._dispLocationFocusEventCommand = createObject(LocationFocusEventCommand);
		this._dispBonusChangeEventCommand = createObject(BonusChangeEventCommand);
		this._dispTrophyChangeEventCommand = createObject(TrophyChangeEventCommand);
		this._dispDurabilityChangeEventCommand = createObject(DurabilityChangeEventCommand);
		this._dispUnitStateAdditionEventCommand = createObject(UnitStateAdditionEventCommand);
		this._dispUnitSlideEventCommand = createObject(UnitSlideEventCommand);
		this._dispUnitFusionEventCommand = createObject(UnitFusionEventCommand);
		this._dispUnitMetamorphozeEventCommand = createObject(UnitMetamorphozeEventCommand);
		this._dispUnitAllCommandEventCommand = createObject(UnitAllCommandEventCommand);
		this._dispMapPosChooseEventCommand = createObject(MapPosChooseEventCommand);
		this._dispMapPosOperationEventCommand = createObject(MapPosOperationEventCommand);
	},
	
	enterEventCommandManagerCycle: function(commandType) {
		return EventCommandController.enterEventCommandControllerCycle(this._getEventCommandContainer(commandType));
	},
	
	moveEventCommandManagerCycle: function(commandType) {
		var result;
		
		result = EventCommandController.moveEventCommandControllerCycle(this._getEventCommandContainer(commandType));
		
		// イベントが終了しているならば、自動開始イベントがあるかどうかを調べる
		if (!root.isEventSceneActived()) {
			if (this._activeEventChecker !== null) {
				this._activeEventChecker.moveEventChecker();
			}
		}
		
		return result;	
	},
	
	drawEventCommandManagerCycle: function(commandType) {
		EventCommandController.drawEventCommandControllerCycle(this._getEventCommandContainer(commandType), commandType);
	},
	
	backEventCommandManagerCycle: function(commandType) {
		EventCommandController.backEventCommandControllerCycle(this._getEventCommandContainer(commandType));
	},
	
	setActiveEventChecker: function(eventChecker) {
		this._activeEventChecker = eventChecker;
	},
	
	returnEnterCode: function() {
		if (root.getEventExitCode() !== EventResult.PENDING) {
			return EnterResult.NOTENTER;
		}
		
		return EnterResult.OK;
	},
	
	eraseMessage: function(value) {
		this._dispMessageShowEventCommand.eraseMessage(value);
	},
	
	isEventRunning: function(targetEvent) {
		var event;
		var count = root.getChainEventCount();
		
		if (count === 0) {
			return false;
		}
		
		event = root.getChainEvent(count - 1);
		
		return event === targetEvent;
	},
	
	_getEventCommandContainer: function(commandType) {
		var obj = null;
		
		// 1つのイベントコマンドにつき、1つのオブジェクトを用意している。
		// たとえば、「メッセージの表示」はMessageShowEventCommandであり、
		// 「メッセージスクロール」はMessageScrollEventCommandという具合になる。
		// これらのオブジェクトは、createObjectに指定しない。
		
		// オブジェクトのenterEventCommandCycleでは、プロパティを適切に初期化することが望まれる。
		// そうでなければ、以前使用した際に設定された値が残ってしまい、問題が発生しやすくなる。
		
		// nullを指定しているイベントについては、そのイベントが現バージョンでは、
		// スクリプトレベルでサポートされていないことを意味する。
		// このイベントの実装は、EXE側で行われている。
		
		// イベントはその内部でイベントを使用しても問題ない。
		// たとえば、「アイテムの使用」を表すItemUseEventCommandは、
		// 回復アイテムを使用する際に「HPの回復」を表すHpRecoveryEventCommandを使用している。
		// ただし、そのHpRecoveryEventCommandがItemUseEventCommandを使用するというループ構造になってはならない。
		
		if (commandType === EventCommandType.MESSAGESHOW) {
			obj = this._dispMessageShowEventCommand;
		}
		else if (commandType === EventCommandType.MESSAGEERASE) {
			obj = null;
		}
		else if (commandType === EventCommandType.MESSAGETEROP) {
			obj = this._dispMessageTeropEventCommand;
		}
		else if (commandType === EventCommandType.STILLMESSAGE) {
			obj = this._dispStillMessageEventCommand;
		}
		
		else if (commandType === EventCommandType.MESSAGESCROLL) {
			obj = this._dispMessageScrollEventCommand;
		}
		else if (commandType === EventCommandType.MESSAGETITLE) {
			obj = this._dispMessageTitleEventCommand;
		}
		else if (commandType === EventCommandType.INFOWINDOW) {
			obj = this._dispInfoWindowEventCommand;
		}
		else if (commandType === EventCommandType.CHOICESHOW) {
			obj = this._dispChoiceShowEventCommand;
		}
		
		else if (commandType === EventCommandType.SCREENSCROLL) {
			obj = null;
		}
		else if (commandType === EventCommandType.SCREENEFFECT) {
			obj = null;
		}
		else if (commandType === EventCommandType.SCREENSTATECHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.BACKGROUNDCHANGE) {
			obj = this._dispBackgroundChangeEventCommand;
		}
		else if (commandType === EventCommandType.SCREENSHAKE) {
			obj = null;
		}
		
		else if (commandType === EventCommandType.MUSICPLAY) {
			obj = null;
		}
		else if (commandType === EventCommandType.MUSICSTOP) {
			obj = null;
		}
		else if (commandType === EventCommandType.SOUNDPLAY) {
			obj = null;
		}
		else if (commandType === EventCommandType.SOUNDSTOP) {
			obj = null;
		}
		else if (commandType === EventCommandType.VIDEOPLAY) {
			obj = null;
		}
		
		else if (commandType === EventCommandType.GRAPHICSSHOW) {
			obj = null;
		}
		else if (commandType === EventCommandType.GRAPHICSHIDE) {
			obj = null;
		}
		else if (commandType === EventCommandType.ANIMATIONPLAY) {
			obj = null;
		}
		else if (commandType === EventCommandType.ANIMATIONSTOP) {
			obj = null;
		}
		else if (commandType === EventCommandType.MOVEOBJECTSHOW) {
			obj = null;
		}
		else if (commandType === EventCommandType.MOVEOBJECTHIDE) {
			obj = null;
		}
		
		else if (commandType === EventCommandType.SCENECHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.SCRIPTEXECUTE) {
			obj = this._dispScriptExecuteEventCommand;
		}
		else if (commandType === EventCommandType.WAITACTION) {
			obj = null;
		}
		else if (commandType === EventCommandType.SWITCHACTION) {
			obj = null;
		}
		else if (commandType === EventCommandType.EVENTSKIP) {
			obj = null;
		}
		else if (commandType === EventCommandType.SAVECALL) {
			obj = this._dispSaveCallEventCommand;
		}
		else if (commandType === EventCommandType.SYSTEMSETTINGS) {
			obj = null;
		}
		else if (commandType === EventCommandType.ENVIRONMENTACCESS) {
			obj = null;
		}
		else if (commandType === EventCommandType.CONSOLELOG) {
			obj = null;
		}
		else if (commandType === EventCommandType.OBJECTADJUST) {
			obj = null;
		}
		else if (commandType === EventCommandType.COMMANDJUMP) {
			obj = null;
		}
		
		else if (commandType === EventCommandType.UNITAPPEAR) {
			obj = null;
		}
		else if (commandType === EventCommandType.UNITREMOVE) {
			obj = null;
		}
		else if (commandType === EventCommandType.UNITMOVE) {
			obj = null;
		}
		else if (commandType === EventCommandType.UNITASSIGN) {
			obj = null;
		}
		
		else if (commandType === EventCommandType.GOLDCHANGE) {
			obj = this._dispGoldChangeEventCommand;
		}
		else if (commandType === EventCommandType.ITEMCHANGE) {
			obj = this._dispItemChangeEventCommand;
		}
		else if (commandType === EventCommandType.PARAMATERCHANGE) {
			obj = this._dispParameterChangeEventCommand;
		}
		else if (commandType === EventCommandType.SKILLCHANGE) {
			obj = this._dispSkillChangeEventCommand;
		}
		
		else if (commandType === EventCommandType.HPRECOVERY) {
			obj = this._dispHpRecoveryEventCommand;
		}
		else if (commandType === EventCommandType.DAMAGEHIT) {
			obj = this._dispDamageHitEventCommand;
		}
		else if (commandType === EventCommandType.EXPERIENCEPLUS) {
			obj = this._dispExperiencePlusEventCommand;
		}
		else if (commandType === EventCommandType.CLASSCHANGE) {
			obj = this._dispClassChangeEventCommand;
		}
		
		else if (commandType === EventCommandType.FORCEBATTLE) {
			obj = this._dispForceBattleEventCommand;
		}
		else if (commandType === EventCommandType.ITEMUSE) {
			obj = this._dispItemUseEventCommand;
		}
		
		else if (commandType === EventCommandType.CHAPTERSHOW) {
			obj = this._dispChapterShowEventCommand;
		}
		else if (commandType === EventCommandType.VICTORYMAP) {
			obj = null;
		}
		else if (commandType === EventCommandType.LOCATIONFOCUS) {
			obj = this._dispLocationFocusEventCommand;
		}
		else if (commandType === EventCommandType.MAPCHIPCHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.MAPSCROLL) {
			obj = null;
		}
		
		else if (commandType === EventCommandType.UNITINFOCHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.UNITSTATECHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.MAPINFOCHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.MAPSTATECHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.EVENTSTATECHANGE) {
			obj = null;
		}
		
		else if (commandType === EventCommandType.BONUSCHANGE) {
			obj = this._dispBonusChangeEventCommand;
		}
		else if (commandType === EventCommandType.TROPHYCHANGE) {
			obj = this._dispTrophyChangeEventCommand;
		}
		else if (commandType === EventCommandType.RELATIVETURNMEASURE) {
			obj = null;
		}
		else if (commandType === EventCommandType.DURABILITYCHANGE) {
			obj = this._dispDurabilityChangeEventCommand;
		}
		else if (commandType === EventCommandType.UNITSTATEADDITION) {
			obj = this._dispUnitStateAdditionEventCommand;
		}
		else if (commandType === EventCommandType.UNITCAPACITYCHANGE) {
			obj = null;
		}
		else if (commandType === EventCommandType.UNITSLIDE) {
			obj = this._dispUnitSlideEventCommand;
		}
		else if (commandType === EventCommandType.UNITFUSION) {
			obj = this._dispUnitFusionEventCommand;
		}
		else if (commandType === EventCommandType.UNITMETAMORPHOZE) {
			obj = this._dispUnitMetamorphozeEventCommand;
		}
		else if (commandType === EventCommandType.UNITALLCOMMAND) {
			obj = this._dispUnitAllCommandEventCommand;
		}
		else if (commandType === EventCommandType.POSITIONCHOOSE) {
			obj = this._dispMapPosChooseEventCommand;
		}
		else if (commandType === EventCommandType.MAPPOSOPERATION) {
			obj = this._dispMapPosOperationEventCommand;
		}
		
		return obj;
	}
};
