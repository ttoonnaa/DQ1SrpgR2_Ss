
var EventCommandController = {
	_commandTypeTemporarySkip: null,
	_isTemporarySkip: false,
	
	enterEventCommandControllerCycle: function(eventContainer) {
		var eventCommandData, result;
		
		this._isTemporarySkip = false;
		
		if (!eventContainer.isSystemSkipMode()) {
			// 現在のイベントコマンドが「画像を表示しない」をデータとして含むタイプかを調べる
			if (this.isGraphicsSkipEnabled()) {
				// イベントコマンドに「画像を表示しない」がチェックがされているか調べる。
				// チェックがない場合は、isGraphicsSkipがtrueを返す。
				eventCommandData = root.getEventCommandObject();
				if (eventCommandData !== null && eventCommandData.isGraphicsSkip()) {
					this._isTemporarySkip = true;
					this._commandTypeTemporarySkip = root.getEventCommandType();
					root.setEventSkipMode(true);
				}
			}
		}
		
		// EventResult.PENDINGを設定することで、イベントコマンドはまだ完了していない状態にしておく
		root.setEventExitCode(EventResult.PENDING);
		
		result = eventContainer.enterEventCommandCycle();
		if (result === EnterResult.NOTENTER) {
			// イベントが完了したことを示す
			this.closeEventCommand(EventResult.OK);
		}
		else if (result === EnterResult.OK) {
			// EnterResult.OKということはcycleに入るということだから、スキップを止める
			eventContainer.stopEventSkip();
		}
		
		return result;
	},
	
	moveEventCommandControllerCycle: function(eventContainer) {
		var result, exitCode;
		
		// スキップキーが押された場合は、そのイベントのメイン処理(mainEventCommand)を実行して終了する。
		// ただし、isEventCommandSkipAllowedを呼び出すことで、スキップが許可されているかを調べる
		if (eventContainer.isEventCommandSkipAllowed() && !MessageViewControl.isBacklog() && (InputControl.isStartAction() || root.isEventSkipMode())) {
			exitCode = eventContainer.mainEventCommand();
			this._doEventSkipAction();
			root.endEventCommand(exitCode);
			return MoveResult.END;
		}
		
		result = eventContainer.moveEventCommandCycle();
		if (result === MoveResult.END) {
			// イベントが完了したことを示す
			this.endEventCommand(EventResult.OK);
		}
		
		return result;
	},
	
	drawEventCommandControllerCycle: function(eventContainer, commandType) {
		var isOriginAccess = this.isOriginAccess(commandType);
		
		if (isOriginAccess) {
			root.getGraphicsManager().enableMapClipping(false);
		}
		
		eventContainer.drawEventCommandCycle();
		
		if (isOriginAccess) {
			root.getGraphicsManager().enableMapClipping(true);
		}
	},
	
	backEventCommandControllerCycle: function(eventContainer) {
		eventContainer.backEventCommandCycle();
	},
	
	closeEventCommand: function(exitCode) {
		this.endTemporarySkip();
		root.setEventExitCode(exitCode);
	},
	
	endEventCommand: function(exitCode) {
		this.endTemporarySkip();
		
		// 内部でroot.setEventExitCodeが呼ばれるため、setEventExitCodeは呼び出さない。
		root.endEventCommand(exitCode);
	},
	
	endTemporarySkip: function() {
		// 一時スキップを発生させたイベントが終了する場合は、一時スキップも停止する
		if (this._isTemporarySkip && this._commandTypeTemporarySkip === root.getEventCommandType()) {
			root.setEventSkipMode(false);
			this._commandTypeTemporarySkip = null;
		}
	},
	
	isGraphicsSkipEnabled: function() {
		var commandType = root.getEventCommandType();
		var isSkipEnabled = false;
		
		if (commandType === EventCommandType.GOLDCHANGE ||
			commandType === EventCommandType.ITEMCHANGE ||
			commandType === EventCommandType.PARAMATERCHANGE ||
			commandType === EventCommandType.HPRECOVERY ||
			commandType === EventCommandType.EXPERIENCEPLUS ||
			commandType === EventCommandType.CLASSCHANGE ||
			commandType === EventCommandType.DAMAGEHIT ||
			commandType === EventCommandType.LOCATIONFOCUS ||
			commandType === EventCommandType.ITEMUSE ||
			commandType === EventCommandType.SKILLCHANGE ||
			commandType === EventCommandType.BONUSCHANGE ||
			commandType === EventCommandType.DURABILITYCHANGE ||
			commandType === EventCommandType.UNITSTATEADDITION ||
			commandType === EventCommandType.UNITSLIDE ||
			commandType === EventCommandType.UNITFUSION ||
			commandType === EventCommandType.UNITMETAMORPHOZE
		) {
			isSkipEnabled = true;
		}
		
		return isSkipEnabled;
	},
	
	isOriginAccess: function(commandType) {
		var eventCommandData;
		
		if (commandType === EventCommandType.MESSAGESHOW ||
			commandType === EventCommandType.MESSAGETEROP ||
			commandType === EventCommandType.STILLMESSAGE ||
			commandType === EventCommandType.BACKGROUNDCHANGE
		) {
			// これらのイベントコマンドでは、マップの大きさが画面解像度以下であっても、
			// 画面左上を原点として描画を行う。
			return true;
		}
		
		if (commandType === EventCommandType.MESSAGETITLE ||
			commandType === EventCommandType.INFOWINDOW
		) {
			// これらのイベントコマンドでは、特定の背景を対象にしている場合においては、
			// マップの大きさが画面解像度以下であっても、画面左上を原点として描画を行う。
			eventCommandData = root.getEventCommandObject();
			if (eventCommandData !== null) {
				return eventCommandData.isBackTarget();
			}
		}
		
		return false;
	},
	
	_doEventSkipAction: function() {
		// スキップ状態にする。
		// CurrentMap.setTurnSkipMode(true)を呼び出すのではない。
		root.setEventSkipMode(true);
		
		MessageViewControl.setHidden(false);
		MapLayer.setEffectMotion(null);	
	}
};
