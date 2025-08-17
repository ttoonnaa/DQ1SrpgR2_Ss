
// *****************************************************************************************************************************
// コマンド
// -----------------------------------------------------------------------------------------------------------------------------

CommandActionType.tona_CHURCH = 100;

// *****************************************************************************************************************************
// 拠点
// -----------------------------------------------------------------------------------------------------------------------------

RestCommand.configureCommands = function(groupArray) {
	var mixer = createObject(CommandMixer);

	if (this._isQuestDisplayable()) {
		mixer.pushCommand(RestCommand.Quest, CommandActionType.QUEST);
	}
	if (this._isImageTalkDisplayable()) {
		mixer.pushCommand(RestCommand.ImageTalk, CommandActionType.IMAGETALK);
	}
	if (this._isNextCommandDisplayable()) {
		mixer.pushCommand(RestCommand.Next, CommandActionType.NEXT);
	}

	mixer.mixCommand(CommandLayoutType.REST, groupArray, BaseListCommand);

	// ★追加：教会
	if (this._isChurchDisplayable()) {
		groupArray.insertObject(RestCommand.tona_Church, 4);
	}
};

RestCommand._isChurchDisplayable = function() {
	return tona_ChurchControl.isChurchDisplayable();
};

// *****************************************************************************************************************************
// 教会
// -----------------------------------------------------------------------------------------------------------------------------

var tona_ChurchControl = { __dummy: null

	, isChurchDisplayable: function() {
		return true;
	}

	, getTargetList: function() {
		return PlayerList.getDeathList();
	}

	, resurrectionUnit: function(unit) {

		if (unit != null) {

			var gold = root.getMetaSession().getGold();
			if (gold >= 500) {

				unit.setAliveState(AliveType.ALIVE);
				unit.setHp(ParamBonus.getMhp(unit));

				root.getMetaSession.setGold(gold - 500);
			}
		}
	}
};

ScreenBuilder.tona_buildChurch = function() {
	return {};
}

RestCommand.tona_Church = defineObject(BaseListCommand, { __dummy: null
	, _resurrectionScreen: null

	, getCommandName: function() {
		return '教会';
	}

	, openCommand: function() {
		var screenParam = this._createScreenParam();

		this._resurrectionScreen = createObject(tona_ChurchScreen);
		SceneManager.addScreen(this._resurrectionScreen, screenParam);
	}

	, moveCommand: function() {
		if (SceneManager.isScreenClosed(this._resurrectionScreen)) {
			var targetUnit = this._resurrectionScreen.getResurrectionUnit();
			tona_ChurchControl.resurrectionUnit(targetUnit);

			return MoveResult.END;
		}

		return MoveResult.CONTINUE;
	}

	, _createScreenParam: function() {
		var screenParam = ScreenBuilder.tona_buildChurch();

		return screenParam;
	}
});

var tona_ChurchScreen = defineObject(ResurrectionScreen, { __dummy: null

	, _combineDeathList: function(screenParam) {
		return tona_ChurchControl.getTargetList();
	}
});


