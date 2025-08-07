
var EnemyTurnMode = {
	TOP: 1,
	PREACTION: 2,
	AUTOACTION: 3,
	AUTOEVENTCHECK: 4,
	END: 5,
	IDLE: 6
};

// EnemyTurnは、敵の一体ずつを自動で動作させる。
// 次にどのユニットが動作すべきかはgetOrderUnitで取得し、これは_orderUnitとして保持される。
// _orderUnitは、ゲームエディタで設定された行動パターンにしたがって行動する。
// たとえば、攻撃系のパターンの場合、特定の位置へ移動→その後攻撃という流れになるが、
// こうした移動や攻撃という単位はAutoActionとして扱われる。
// _autoActionArrayはAutoActionの配列であり、_autoActionIndexはその配列を走査する。
// たとえば、配列の中身が[MoveAutoAction, WeaponAutoAction]である場合、
// _autoActionIndexが0であると仮定すると、_autoActionArray[_autoActionIndex]はMoveAutoActionを返す。
// 実際に行動を終えた場合、_autoActionIndex++を実行するが、この次にはWeaponAutoActionが実行されることになり、
// 移動→攻撃の流れが実現されている。

var EnemyTurn = defineObject(BaseTurn,
{
	_orderIndex: 0,
	_orderUnit: null,
	_autoActionIndex: 0,
	_autoActionArray: null,
	_straightFlow: null,
	_idleCounter: null,
	_eventChecker: null,
	_orderCount: 0,
	_orderMaxCount: 0,
	
	openTurnCycle: function() {
		this._prepareTurnMemberData();
		this._completeTurnMemberData();
		
		AIFirstStage_UnitSupportStatusTable.resetTable();
		AIFirstStage_TargetUnitSupportStatusTable.resetTable();
	},
	
	moveTurnCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		// スキップの確認は、_isSkipAllowedがtrueを返した場合にしている。
		// これにより、戦闘時でのスキップがターンへのスキップまで影響しないようになる。
		if (this._isSkipAllowed() && InputControl.isStartAction()) {
			CurrentMap.setTurnSkipMode(true);
		}
		
		if (mode === EnemyTurnMode.TOP) {
			result = this._moveTop();
		}
		else if (mode === EnemyTurnMode.AUTOACTION) {
			result = this._moveAutoAction();
		}
		else if (mode === EnemyTurnMode.PREACTION) {
			result = this._movePreAction();
		}
		else if (mode === EnemyTurnMode.AUTOEVENTCHECK) {
			result = this._moveAutoEventCheck();
		}
		else if (mode === EnemyTurnMode.END) {
			result = this._moveEndEnemyTurn();
		}
		else if (mode === EnemyTurnMode.IDLE) {
			result = this._moveIdle();
		}
		
		return result;
	},
	
	drawTurnCycle: function() {
		var mode = this.getCycleMode();
		
		MapLayer.drawUnitLayer();
		
		if (mode === EnemyTurnMode.PREACTION) {
			this._drawPreAction();
		}
		else if (mode === EnemyTurnMode.AUTOACTION) {
			this._drawAutoAction();
		}
		else if (mode === EnemyTurnMode.AUTOEVENTCHECK) {
			this._drawAutoEventCheck();
		}
		
		if (this._isSkipProgressDisplayable()) {
			this._drawProgress();
		}
	},
	
	getOrderUnit: function() {
		return this._orderUnit;
	},
	
	_prepareTurnMemberData: function() {
		this._orderIndex = 0;
		this._orderUnit = null;
		this._autoActionIndex = 0;
		this._autoActionArray = [];
		this._straightFlow = createObject(StraightFlow);
		this._idleCounter = createObject(IdleCounter);
		this._eventChecker = createObject(EventChecker);
	},
	
	_completeTurnMemberData: function() {
		this._straightFlow.setStraightFlowData(this);
		this._pushFlowEntries(this._straightFlow);
		
		this._resetOrderMark();
		this.changeCycleMode(EnemyTurnMode.TOP);
		
		// 自軍ターン終了時に援軍などが登場している可能性があるため、
		// 敵ターン開始にマーキングを実行する
		MapLayer.getMarkingPanel().updateMarkingPanel();
	},
	
	_checkNextOrderUnit: function() {
		var i, unit;
		var list = this._getActorList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			if (!this._isOrderAllowed(unit)) {
				continue;
			}
			
			if (unit.getOrderMark() === OrderMarkType.FREE) {
				this._orderCount++;
				unit.setOrderMark(OrderMarkType.EXECUTED);
				return unit;
			}
		}
		
		return null;
	},
	
	_isOrderAllowed: function(unit) {
		if (unit.isActionStop() || unit.isWait() || unit.isInvisible() || StateControl.isBadStateOption(unit, BadStateOption.NOACTION)) {
			return false;
		}
		
		return true;
	},
	
	_resetOrderMark: function() {
		var i, unit;
		var list = this._getActorList();
		var count = list.getCount();
		
		// 誰も動作していない状態にする
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			unit.setOrderMark(OrderMarkType.FREE);
		}
		
		this._orderMaxCount = count;
	},
	
	_moveTop: function() {
		var result;
		
		for (;;) {
			// イベントが発生しているため、モード変更
			if (this._eventChecker.enterEventChecker(root.getCurrentSession().getAutoEventList(), EventType.AUTO) === EnterResult.OK) {
				this.changeCycleMode(EnemyTurnMode.AUTOEVENTCHECK);
				return MoveResult.CONTINUE;
			}
			
			if (GameOverChecker.isGameOver()) {
				GameOverChecker.startGameOver();
			}
			
			// イベントの実行で、シーン自体が変更された場合は続行しない。
			// たとえば、ゲームオーバーになった場合など。
			if (root.getCurrentScene() !== SceneType.FREE) {
				return MoveResult.CONTINUE;
			}
			
			// 動作するべきユニットを取得
			this._orderUnit = this._checkNextOrderUnit();
			if (this._orderUnit === null) {
				// 敵がこれ以上存在しないため、ターンの終了に入る
				this.changeCycleMode(EnemyTurnMode.END);
				break;
			}
			else {
				// イベントで\actの制御文字を参照できるようにする
				root.getCurrentSession().setActiveEventUnit(this._orderUnit);
				
				this._straightFlow.resetStraightFlow();
				
				// PreActionのフローを実行する。
				// PreActionは、ユニットが移動や攻撃などを行う前の段階の行動であり、
				// ActivePatternFlowEntryなどがある。
				result = this._straightFlow.enterStraightFlow();
				if (result === EnterResult.NOTENTER) {
					if (this._startAutoAction()) {
						// グラフィカルに行動を開始するのでモード変更
						this.changeCycleMode(EnemyTurnMode.AUTOACTION);
						break;
					}
					
					// このメソッドがfalseを返した場合は、ループすることを意味するから、直ちに次のユニットが確認される。
					// ユニットが多い場合は、ループしている時間が長くなり、ビジー状態が発生する。
					if (this._isSkipProgressDisplayable()) {
						this.changeCycleMode(EnemyTurnMode.TOP);
						break;
					}
				}
				else {
					// PreActionが存在するのでモード変更
					this.changeCycleMode(EnemyTurnMode.PREACTION);
					break;
				}
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAutoAction: function() {
		// this._autoActionIndexで識別されている行動を終えたか調べる
		if (this._autoActionArray[this._autoActionIndex].moveAutoAction() !== MoveResult.CONTINUE) {
			if (!this._countAutoActionIndex()) {
				this._changeIdleMode(EnemyTurnMode.TOP, this._getIdleValue());
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_movePreAction: function() {
		if (this._straightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			if (this._startAutoAction()) {
				// グラフィカルに行動を開始するのでモード変更
				this.changeCycleMode(EnemyTurnMode.AUTOACTION);
			}
			else {
				this.changeCycleMode(EnemyTurnMode.TOP);
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAutoEventCheck: function() {
		if (this._eventChecker.moveEventChecker() !== MoveResult.CONTINUE) {
			if (!this._isSkipMode()) {
				MapLayer.getMarkingPanel().updateMarkingPanel();
			}
			this.changeCycleMode(EnemyTurnMode.TOP);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveEndEnemyTurn: function() {
		TurnControl.turnEnd();
		MapLayer.getMarkingPanel().updateMarkingPanel();
		this._orderCount = 0;
		return MoveResult.CONTINUE;
	},
	
	_moveIdle: function() {
		var nextmode;
		
		if (this._idleCounter.moveIdleCounter() !== MoveResult.CONTINUE) {
			nextmode = this._idleCounter.getNextMode();
			this.changeCycleMode(nextmode);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawPreAction: function() {
		this._straightFlow.drawStraightFlow();
	},
	
	_drawAutoAction: function() {
		this._autoActionArray[this._autoActionIndex].drawAutoAction();
	},
	
	_drawAutoEventCheck: function() {
	},
	
	_drawProgress: function() {
		var n;
		var textui = root.queryTextUI('single_window');
		var pic  = textui.getUIImage();
		var width = 130;
		var height = 74;
		var x = LayoutControl.getCenterX(-1, width);
		var y = LayoutControl.getCenterY(-1, height);
		
		if (this._orderCount >= this._orderMaxCount) {
			n = 100;
		}
		else {
			n = Math.floor(100 * (this._orderCount / this._orderMaxCount));
		}
		
		WindowRenderer.drawStretchWindow(x, y, width, height, pic);
		
		x += DefineControl.getWindowXPadding();
		y += DefineControl.getWindowYPadding();
		
		TextRenderer.drawText(x, y, StringTable.SkipProgress, -1, textui.getColor(), textui.getFont());
		NumberRenderer.drawNumber(x + 44, y + 20, n);
		TextRenderer.drawKeywordText(x + 58, y + 21, StringTable.SignWord_Percent, -1, textui.getColor(), textui.getFont());
	},
	
	_isActionAllowed: function() {
		// 後続のgetAIPatternで常に同じパターンが返るように、ここでのみcreateAIPatternを呼び出す。
		// 毎回パターンを確認する方法は、確率などを条件にしている場合に、取得できるパターンが一定にならなくなる。
		// page1などで、許可されているページが1つもない場合はnullが返る。
		return this._orderUnit.createAIPattern() !== null;
	},
	
	_startAutoAction: function() {
		var result;
		
		if (!this._isActionAllowed()) {
			return false;
		}
		
		// AutoActionを作成できない場合は、次のユニットを調べる
		if (!this._createAutoAction()) {
			return false;
		}
		
		while (this._autoActionIndex < this._autoActionArray.length) {
			result = this._autoActionArray[this._autoActionIndex].enterAutoAction();
			if (result === EnterResult.OK) {
				return true;
			}
			
			this._autoActionIndex++;
		}
		
		this._autoActionIndex = 0;
		
		// falseを返すということは、直ちに次のユニットを調べることを意味する
		return false;
	},
	
	_countAutoActionIndex: function() {
		var result;
		
		// 次の行動を行うため、インデックスを増加する
		this._autoActionIndex++;
		
		while (this._autoActionIndex < this._autoActionArray.length) {
			result = this._autoActionArray[this._autoActionIndex].enterAutoAction();
			if (result === EnterResult.OK) {
				return true;
			}
			
			this._autoActionIndex++;
		}
		
		this._autoActionIndex = 0;
		
		return false;
	},
	
	_createAutoAction: function() {
		var keyword;
		var patternType = this._orderUnit.getAIPattern().getPatternType();
		
		this._autoActionArray = [];
		
		if (patternType === PatternType.APPROACH) {
			AutoActionBuilder.buildApproachAction(this._orderUnit, this._autoActionArray);
		}
		else if (patternType === PatternType.WAIT) {
			AutoActionBuilder.buildWaitAction(this._orderUnit, this._autoActionArray);
		}
		else if (patternType === PatternType.MOVE) {
			AutoActionBuilder.buildMoveAction(this._orderUnit, this._autoActionArray);
		}
		else if (patternType === PatternType.CUSTOM) {
			keyword = this._orderUnit.getAIPattern().getCustomKeyword();
			AutoActionBuilder.buildCustomAction(this._orderUnit, this._autoActionArray, keyword);
		}
		
		return true;
	},
	
	_getActorList: function() {
		return TurnControl.getActorList();
	},
	
	_isSkipMode: function() {
		return CurrentMap.isTurnSkipMode();
	},
	
	_isSkipProgressDisplayable: function() {
		return this._isSkipMode() && DataConfig.isEnemyTurnOptimized();
	},
	
	_getIdleValue: function() {
		return 10;
	},
	
	_isSkipAllowed: function() {
		var mode = this.getCycleMode();
		
		if (mode === EnemyTurnMode.AUTOACTION) {
			return this._autoActionArray[this._autoActionIndex].isSkipAllowed();
		}
		
		return true;
	},
	
	_changeIdleMode: function(nextmode, value) {
		this._idleCounter.setIdleInfo(value, nextmode);
		this.changeCycleMode(EnemyTurnMode.IDLE);
	},
	
	_pushFlowEntries: function(straightFlow) {
		straightFlow.pushFlowEntry(ActivePatternFlowEntry);
	}
}
);

// 敵ユニットイベントの「アクティブターン」時の処理
var ActivePatternFlowEntry = defineObject(BaseFlowEntry,
{
	_capsuleEvent: null,
	
	enterFlowEntry: function(enemyTurn) {
		this._prepareMemberData(enemyTurn);
		return this._completeMemberData(enemyTurn);
	},
	
	moveFlowEntry: function() {
		var result = MoveResult.CONTINUE;
		
		if (this._capsuleEvent.moveCapsuleEvent() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return result;
	},
	
	_prepareMemberData: function(enemyTurn) {
		this._capsuleEvent = createObject(CapsuleEvent);
	},
	
	_completeMemberData: function(enemyTurn) {
		var event = UnitEventChecker.getUnitEvent(enemyTurn.getOrderUnit(), UnitEventType.ACTIVETURN);
		
		return this._capsuleEvent.enterCapsuleEvent(event, true);
	}
}
);

// 自軍の中に「暴走」または「自動AI」ステートのユニットが存在する場合に使用される
var PlayerBerserkTurn = defineObject(EnemyTurn,
{
	_moveEndEnemyTurn: function() {
		var i, unit;
		var list = PlayerList.getSortieList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			unit = list.getData(i);
			if (StateControl.isBadStateOption(unit, BadStateOption.BERSERK)) {
				unit.setWait(false);
			}
			else if (StateControl.isBadStateOption(unit, BadStateOption.AUTO)) {
				unit.setWait(false);
			}
		}
		
		CurrentMap.setTurnSkipMode(false);
		
		return MoveResult.END;
	},
	
	_isOrderAllowed: function(unit) {
		if (!EnemyTurn._isOrderAllowed.call(this, unit)) {
			return false;
		}
		
		if (StateControl.isBadStateOption(unit, BadStateOption.BERSERK)) {
			return true;
		}
		
		if (StateControl.isBadStateOption(unit, BadStateOption.AUTO)) {
			return true;
		}
		
		return false;
	}
}
);

//------------------------------------------------------

var AutoActionBuilder = {
	buildApproachAction: function(unit, autoActionArray) {
		var combination;
		
		// 現在位置から攻撃可能なユニットの中で、最も優れた組み合わせを取得する
		combination = CombinationManager.getApproachCombination(unit, true);
		if (combination === null) {
			// 現在位置から攻撃できるユニットは存在しないため、範囲を広げて相手を探すことになる。
			// ただし、その前に範囲内のみを攻撃するように設定されているかを調べる。
			if (unit.getAIPattern().getApproachPatternInfo().isRangeOnly()) {
				// 範囲内のみ攻撃を行うと設定されていたため、何もしない。
				// 既に、範囲内で攻撃できないことを確認しているため問題ない。
				return this._buildEmptyAction();
			}
			else {
				// 現在位置では攻撃可能な相手がいないため、どの敵を狙うべきかを取得する
				combination = CombinationManager.getEstimateCombination(unit);
				if (combination === null) {
					return this._buildEmptyAction();
				}
				else {
					// 移動先を設定する
					this._pushMove(unit, autoActionArray, combination);
					
					// 移動の後には待機を行うため、それを設定する
					this._pushWait(unit, autoActionArray, combination);
				}
			}
		}
		else {
			this._pushGeneral(unit, autoActionArray, combination);
		}
		
		return true;
	},
	
	buildWaitAction: function(unit, autoActionArray) {
		var combination;
		var isWaitOnly = unit.getAIPattern().getWaitPatternInfo().isWaitOnly();
		
		if (isWaitOnly) {
			return this._buildEmptyAction();
		}
		else {
			// 現在位置から攻撃可能なユニットの中で、最も優れた組み合わせを取得する
			combination = CombinationManager.getWaitCombination(unit);
			if (combination === null) {
				// 攻撃できないため、何もしない
				return this._buildEmptyAction();
			}
			else {
				this._pushGeneral(unit, autoActionArray, combination);
			}
		}
		
		return true;
	},
	
	buildMoveAction: function(unit, autoActionArray) {
		var x, y, targetUnit;
		var combination = null;
		var patternInfo = unit.getAIPattern().getMovePatternInfo();
		
		if (patternInfo.getMoveGoalType() === MoveGoalType.POS) {
			x = patternInfo.getMoveGoalX();
			y = patternInfo.getMoveGoalY();
		}
		else {
			targetUnit = patternInfo.getMoveGoalUnit();
			if (targetUnit === null) {
				return this._buildEmptyAction();
			}
			
			x = targetUnit.getMapX();
			y = targetUnit.getMapY();
		}
		
		// 既に目標地点に到達しているか調べる
		if (unit.getMapX() === x && unit.getMapY() === y) {
			// 攻撃できる場合は攻撃
			if (patternInfo.getMoveAIType() === MoveAIType.APPROACH) {
				combination = CombinationManager.getWaitCombination(unit);
				if (combination !== null) {
					this._pushGeneral(unit, autoActionArray, combination);
					return true;
				}
			}
		}
		else {
			combination = CombinationManager.getMoveCombination(unit, x, y, patternInfo.getMoveAIType());
			if (combination === null) {
				return this._buildEmptyAction();
			}
			
			if (combination.item !== null || combination.skill !== null) {
				this._pushGeneral(unit, autoActionArray, combination);
				return true;
			}
			else {
				this._pushMove(unit, autoActionArray, combination);
			}
		}
		
		if (combination !== null) {
			this._pushWait(unit, autoActionArray, combination);
		}
		
		return true;
	},
	
	buildCustomAction: function(unit, autoActionArray, keyword) {
		return false;
	},
	
	_buildEmptyAction: function() {
		// 待機したことにしたい場合は、以下のようにする
		// pushWait(unit, this._autoActionArray, null);
		return false;
	},
	
	_pushGeneral: function(unit, autoActionArray, combination) {
		// 移動先を設定する
		this._pushMove(unit, autoActionArray, combination);
		
		if (combination.skill !== null) {
			this._pushSkill(unit, autoActionArray, combination);
		}
		else if (combination.item !== null) {
			if (combination.item.isWeapon()) {
				this._pushAttack(unit, autoActionArray, combination);
			}
			else {
				this._pushItem(unit, autoActionArray, combination);
			}
		}
		else {
			this._pushCustom(unit, autoActionArray, combination);
		}
		
		this._pushWait(unit, autoActionArray, combination);
	},
	
	_pushMove: function(unit, autoActionArray, combination) {
		var autoAction;
		
		this._pushScroll(unit, autoActionArray, combination);
		
		if (combination.cource.length === 0) {
			return;
		}
		
		autoAction = createObject(MoveAutoAction);
		autoAction.setAutoActionInfo(unit, combination);
		autoActionArray.push(autoAction);
	},
	
	_pushAttack: function(unit, autoActionArray, combination) {
		var autoAction = createObject(WeaponAutoAction);
		
		autoAction.setAutoActionInfo(unit, combination);
		autoActionArray.push(autoAction);
	},
	
	_pushItem: function(unit, autoActionArray, combination) {
		var autoAction = createObject(ItemAutoAction);
		
		autoAction.setAutoActionInfo(unit, combination);
		autoActionArray.push(autoAction);
	},
	
	_pushSkill: function(unit, autoActionArray, combination) {
		var autoAction = createObject(SkillAutoAction);
		
		autoAction.setAutoActionInfo(unit, combination);
		autoActionArray.push(autoAction);
	},
	
	_pushWait: function(unit, autoActionArray, combination) {
		var autoAction = createObject(WaitAutoAction);
		
		autoAction.setAutoActionInfo(unit, combination);
		autoActionArray.push(autoAction);
	},
	
	_pushScroll: function(unit, autoActionArray, combination) {
		var autoAction;
		
		if (CurrentMap.isCompleteSkipMode()) {
			return;
		}
		
		if (EnvironmentControl.getScrollSpeedType() === SpeedType.HIGH) {
			MapView.setScroll(unit.getMapX(), unit.getMapY());
		}
		else {
			autoAction = createObject(ScrollAutoAction);
			autoAction.setAutoActionInfo(unit, combination);
			autoActionArray.push(autoAction);
		}
	},
	
	_pushCustom: function(unit, autoActionArray, combination) {
	}
};

var CombinationManager = {
	getApproachCombination: function(unit, isShortcutEnabled) {
		var combinationArray, combinationIndex, combination;
		var misc = CombinationBuilder.createMisc(unit, root.getCurrentSession().createMapSimulator());
		var isRange = true;
		
		misc.isShortcutEnabled = isShortcutEnabled;
		
		// 検証の範囲は、ユニットの移動力の範囲内
		misc.simulator.startSimulation(unit, ParamBonus.getMov(unit));
		
		// 行動に関する組み合わせの配列を作成する
		combinationArray = CombinationBuilder.createApproachCombinationArray(misc);
		if (this._isReapproach(combinationArray, misc)) {
			combinationArray = this._getShortcutCombinationArray(misc);
			if (combinationArray.length === 0) {
				return null;
			}
			isRange = false;
		}
		
		// 組み合わせの配列から最も優れたものを取得
		combinationIndex = CombinationSelector.getCombinationIndex(unit, combinationArray);
		if (combinationIndex < 0) {
			return null;
		}
		
		// これにより、combinationに最良の組み合わせが格納される
		combination = combinationArray[combinationIndex];
		
		if (isRange) {
			// unitの現在位置から、combination.posIndexが示す位置までの移動経路を作成する
			combination.cource = CourceBuilder.createRangeCource(unit, combination.posIndex, combination.simulator);
		}
		else {
			combination.cource = CourceBuilder.createExtendCource(unit, combination.posIndex, combination.simulator);
		}
		
		return combination;
	},

	getWaitCombination: function(unit) {
		var combinationArray, combinationIndex, combination;
		var simulator = root.getCurrentSession().createMapSimulator();
		var misc = CombinationBuilder.createMisc(unit, simulator);
		
		// 待機の場合は移動力を0にする
		simulator.startSimulation(unit, 0);
		
		// 行動に関する組み合わせの配列を作成する
		combinationArray = CombinationBuilder.createWaitCombinationArray(misc);
		if (combinationArray.length === 0) {
			return null;
		}
		
		// 組み合わせの配列から最も優れたものを取得
		combinationIndex = CombinationSelector.getCombinationIndex(unit, combinationArray);
		if (combinationIndex < 0) {
			return null;
		}
		
		// これにより、combinationに最良の組み合わせが格納される
		combination = combinationArray[combinationIndex];
		
		// 移動しないためコースは空白
		combination.cource = [];
		
		return combination;
	},
	
	getMoveCombination: function(unit, x, y, moveAIType) {
		var simulator, goalIndex, blockUnitArray, data, moveCource, combination;
		
		if (unit.getMapX() === x && unit.getMapY() === y) {
			// 現在位置が目標地点の場合は移動しない
			return StructureBuilder.buildCombination();
		}
		
		simulator = root.getCurrentSession().createMapSimulator();
		simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
		
		goalIndex = CurrentMap.getIndex(x, y);
		blockUnitArray = [];
		
		if (this._getBlockUnit(unit, x, y) !== null || this._isBlocked(unit, goalIndex, simulator)) {
			// 目標地点に相手ユニット(同盟なら敵、敵なら自軍か同盟)がいるため、コースを作らない。
			// 同種ユニットはcreateExtendCourceで調整されるため扱わない。
			moveCource = [];
		}
		else {
			moveCource = CourceBuilder.createExtendCource(unit, goalIndex, simulator);
		}
		
		if (moveCource.length === 0) {
			// goalIndexの位置に移動できないため、代わりとしてなるべくgoalIndexに近い位置を取得する
			data = CourceBuilder.getValidGoalIndex(unit, goalIndex, simulator, moveAIType);
			if (goalIndex !== data.goalIndex) {
				// 新しい目標地点を見つけたので保存
				goalIndex = data.goalIndex;
				// 新しい目標地点を元にコースを作成
				moveCource = CourceBuilder.createExtendCource(unit, goalIndex, simulator);
			}
			
			// 目標地点までの通路を塞いでいたユニット群を保存
			blockUnitArray = data.blockUnitArray;
		}
		
		if (moveAIType === MoveAIType.MOVEONLY || this._isReached(unit, x, y, moveCource)) {
			// 「常に移動のみ」である場合か、目標地点に到達できる場合は、
			// 後続の処理で移動だけが行われる。
		}
		else if (moveAIType === MoveAIType.BLOCK) {
			// 「目標地点が塞がれている場合のみ攻撃」の処理
			combination = this._getBlockCombination(unit, blockUnitArray);
			if (combination !== null) {
				return combination;
			}
		}
		else if (moveAIType === MoveAIType.APPROACH) {
			// 「攻撃できる場合は攻撃」の場合は直ちにgetApproachCombinationを呼び出してもよいが、
			// 塞いでいるユニットがいるならばそれを優先的に狙うべきとして_getBlockCombinationを呼び出している。
			combination = this._getBlockCombination(unit, blockUnitArray);
			if (combination !== null) {
				return combination;
			}
			
			combination = this.getApproachCombination(unit, false);
			if (combination !== null) {
				return combination;
			}
		}
		
		combination = StructureBuilder.buildCombination();
		combination.cource = moveCource;
		
		return combination;
	},
	
	getEstimateCombination: function(unit) {
		var combinationArray, combinationIndex, combination;
		var simulator = root.getCurrentSession().createMapSimulator();
		var misc = CombinationBuilder.createMisc(unit, simulator);
			
		// 検証の範囲は、マップ全体
		simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
		
		// 移動に関する組み合わせの配列を作成する
		combinationArray = CombinationBuilder.createMoveCombinationArray(misc);
		if (combinationArray.length === 0) {
			combinationArray = this._getChaseCombinationArray(misc);
			if (combinationArray.length === 0) {
				return null;
			}
		}
		
		// 組み合わせの配列から最も優れたもののインデックスを取得
		combinationIndex = CombinationSelectorEx.getEstimateCombinationIndex(unit, combinationArray);
		if (combinationIndex < 0) {
			return null;
		}
		
		// これにより、combinationに最良の組み合わせが格納される
		combination = combinationArray[combinationIndex];
		
		// combination.posIndexには移動すべき位置を表すindexが格納されている。
		// そのindexが示す位置に、どのようなコースをたどって移動するかをcreateExtendCourceで作成する
		combination.cource = CourceBuilder.createExtendCource(unit, combination.posIndex, simulator);
		
		return combination;
	},
	
	_getBlockCombination: function(unit, blockUnitArray) {
		var combinationArray, combinationIndex, combination;
		var simulator = root.getCurrentSession().createMapSimulator();
		var misc = CombinationBuilder.createMisc(unit, simulator);
		
		// 検証の範囲は、ユニットの移動力の範囲内
		simulator.startSimulation(unit, ParamBonus.getMov(unit));
		
		misc.blockList = StructureBuilder.buildDataList();
		misc.blockList.setDataArray(blockUnitArray);
		
		// 行動に関する組み合わせの配列を作成する
		combinationArray = CombinationBuilder.createBlockCombinationArray(misc);
		if (combinationArray.length === 0) {
			return null;
		}
		
		// 組み合わせの配列から最も優れたものを取得
		combinationIndex = CombinationSelector.getCombinationIndex(unit, combinationArray);
		if (combinationIndex < 0) {
			return null;
		}
		
		// これにより、combinationに最良の組み合わせが格納される
		combination = combinationArray[combinationIndex];
		
		// unitの現在位置から、combination.posIndexが示す位置までの移動経路を作成する
		combination.cource = CourceBuilder.createRangeCource(unit, combination.posIndex, simulator);
		
		return combination;
	},
	
	_getBlockUnit: function(unit, x, y) {
		var type, targetType;
		var targetUnit = PosChecker.getUnitFromPos(x, y);
		
		if (targetUnit === null) {
			return null;
		}
		
		type = unit.getUnitType();
		targetType = targetUnit.getUnitType();
		
		if (type === UnitType.PLAYER || type === UnitType.ALLY) {
			if (targetType === UnitType.PLAYER || targetType === UnitType.ALLY) {
				return null;
			}
		}
		else {
			if (targetType === UnitType.ENEMY) {
				return null;
			}
		}
		
		return targetUnit;
	},
	
	_isTargetBlock: function(unit, xGoal, yGoal) {
		var type, targetType;
		var targetUnit = PosChecker.getUnitFromPos(xGoal, yGoal);
		
		if (targetUnit === null) {
			return false;
		}
		
		type = unit.getUnitType();
		targetType = targetUnit.getUnitType();
		
		if (type === UnitType.PLAYER || type === UnitType.ALLY) {
			if (targetType === UnitType.PLAYER || targetType === UnitType.ALLY) {
				return false;
			}
		}
		else {
			if (targetType === UnitType.ENEMY) {
				return false;
			}
		}
		
		return true;
	},
	
	_isReached: function(unit, xGoal, yGoal, moveCource) {
		var i, direction;
		var count = moveCource.length;
		var x = unit.getMapX();
		var y = unit.getMapY();
		
		for (i = 0; i < count; i++) {
			direction = moveCource[i];
			x += XPoint[direction];
			y += YPoint[direction];
		}
		
		return x === xGoal && y === yGoal;
	},
	
	_getChaseCombinationArray: function(misc) {
		// このメソッドは、unitがどこへ移動しても攻撃を行えない場合に呼ばれる。
		// たとえば、狭い一本道で2つのユニットがぶつかっている場合など。
		// このような場合、何も行わず待機というのもあるが、敵にできるだけ近づいたほうがよいと判断したため、
		// そのための処理を行っている。
		// 視覚的には、このメソッドにより、ユニットが狭い場所で渋滞を起こしているように見えることになる。
		// 以下のようにすれば、追跡はせず、渋滞は発生しない。
		// return [];
		
		misc.isForce = true;
		
		return CombinationBuilder.createMoveCombinationArray(misc);
	},
	
	_getShortcutCombinationArray: function(misc) {
		var count = misc.costArrayUnused.length;
		
		// countが0の場合は、元々敵に攻撃できないため続行しない。
		// isShortcutEnabledがfalseの場合は、近い位置を探さないため続行しない。
		if (count === 0 || !misc.isShortcutEnabled) {
			return [];
		}
		
		// countが0でない場合は、本来なら敵に攻撃できたけれども、
		// 同軍ユニットと被るため、攻撃できなかったことを意味する。
		// この場合は、その被る位置になるべく近い位置に移動するため、
		// misc.isForceをtrueにする。
		misc.isForce = true;
		
		return CombinationBuilder.createApproachCombinationArray(misc);
	},
	
	_isReapproach: function(combinationArray, misc) {
		var i, combination;
		var count = combinationArray.length;
		
		return count === 0;
		
		// コンビネーションが格納されていない状態(combinationArray.length === 0)ということは、敵が行うべきアクションが何もないことを意味する。
		// ただし、本来なら攻撃できたのに、同軍がいることによって、攻撃ができず、結果としても、何もしていない可能性もある。
		// そのようなケースを考慮するべく、このメソッドでtrueを返し、後続の処理でmisc.isForceをtrueにし、再調査を行える設計になっている。
		
		// ただし、コンビネーションが格納されていても、敵がそのアクションを必ず行うとは限らない。
		// たとえば、武器と回復アイテムを所持する敵がいたとして、同軍がいることによって、攻撃ができず、
		// 回復アイテムだけのコンビネーションが格納されていても、
		// 同軍にHPが減っていないユニットがいなければ回復アイテムを使用せず、何もしないことになる。
		// むしろ、回復アイテムを所持させなければ、(combinationArray.length === 0)が成立し、攻撃しに行くという現象が起きる。
		// この現象を再現するには、「行動型」の「範囲内のみ行動する」の敵を作成し、自軍の周囲を敵で固める。
		
		// つまり、combinationArray.lengthが0より大きいとしても、
		// 上記の理由により何もアクションしない可能性があるため、
		// 再調査を促すためのコードを残している。
		
		for (i = 0; i < count; i++) {
			combination = combinationArray[i];
			if (combination.item !== null && combination.item.isWeapon()) {
				// この場合、相手の軍に攻撃できることが分かっているので、再調査は不要となる
				return false;
			}
			else if (combination.item !== null && !combination.item.isWeapon()) {
				return true;
			}
			else if (combination.skill !== null) {
				return true;
			}
		}
		
		return count === 0;
	},
	
	_isBlocked: function(unit, goalIndex, simulator) {
		// 外部プラグインがgoalIndexを到達不可とみなせる余地を残している
		return false;
	}
};

var CombinationBuilder = {
	createApproachCombinationArray: function(misc) {
		return this._createCombinationArray(misc);
	},
	
	createWaitCombinationArray: function(misc) {
		return this._createCombinationArray(misc);
	},
	
	createMoveCombinationArray: function(misc) {
		return this._createCombinationArray(misc);
	},
	
	createBlockCombinationArray: function(misc) {
		return this._createCombinationArray(misc);
	},
	
	createMisc: function(unit, simulator) {
		var misc = {};
		
		misc.unit = unit;
		misc.simulator = simulator;
		misc.disableFlag = unit.getAIPattern().getDisableFlag();
		misc.blockList = null;
		misc.combinationArray = [];
		misc.costArrayUnused = [];
		misc.isShortcutEnabled = true;
		
		return misc;
	},
	
	_resetMisc: function(misc) {
		misc.item = null;
		misc.skill = null;
		misc.actionTargetType = 0;
		misc.indexArray = [];
		misc.targetUnit = null;
		misc.costArray = [];
		misc.posIndex = 0;
		misc.movePoint = 0;
	},
	
	_createCombinationArray: function(misc) {
		var i, count, builder;
		var groupArray = [];
		
		this._configureCombinationCollector(groupArray);
		
		count = groupArray.length;
		for (i = 0; i < count; i++) {
			this._resetMisc(misc);
			builder = groupArray[i];
			// 内部でcombinationオブジェクトを作成し、misc.combinationArrayに追加する
			builder.collectCombination(misc);
		}
		
		return misc.combinationArray;
	},
	
	_configureCombinationCollector: function(groupArray) {
		groupArray.appendObject(CombinationCollector.Weapon);
		groupArray.appendObject(CombinationCollector.Item);
		groupArray.appendObject(CombinationCollector.Skill);
	}
};

// どの場所に移動し、どの武器を選択し、どの相手に攻撃するかといった組み合わせの配列を作成するのがCombinationBuilder。
// その組み合わせの配列から、最も優れたものを選ぶのがCombinationSelector。
var CombinationSelector = {
	_scorerArray: null,
	
	// combinationArrayの中からベストなインデックスを取得する
	getCombinationIndex: function(unit, combinationArray) {
		var index, combination, costIndex, costData;
		
		// どの組み合わせを使用するかを取得
		index = this._getBestCombinationIndex(unit, combinationArray);
		if (index < 0) {
			return -1;
		}
		
		combination = combinationArray[index];
		
		if (combination.costArray.length === 0) {
			combination.posIndex = CurrentMap.getIndex(unit.getMapX(), unit.getMapY());
			combination.movePoint = 0;
			return index;
		}
		
		// どの位置を使用するかを取得
		costIndex = this._getBestCostIndex(unit, combination);
		if (costIndex < 0) {
			return -1;
		}
		
		// 決定した位置を組み合わせに設定
		costData = combination.costArray[costIndex];
		combination.posIndex = costData.posIndex;
		combination.movePoint = costData.movePoint;
		
		return index;
	},
	
	_getBestCombinationIndex: function(unit, combinationArray) {
		var i, count, totalScore;
		var scoreArray = [];
		
		// 第1ステージの処理に必要なオブジェクトを用意する。
		// 第1ステージでは、どの武器で誰を攻撃するかを決定する。
		this._scorerArray = [];
		this._configureScorerFirst(this._scorerArray);
		
		count = combinationArray.length;
		for (i = 0; i < count; i++) {
			totalScore = this._getTotalScore(unit, combinationArray[i]);
			scoreArray.push(totalScore);
		}
		
		return this._getBestIndexFromScore(scoreArray);
	},
	
	_getBestCostIndex: function(unit, combination) {
		var i, count, totalScore, costData;
		var scoreArray = [];
		
		// 第2ステージの処理に必要なオブジェクトを用意する。
		// 第1ステージでは武器と相手を決定しているが、
		// その相手にどの位置から攻撃するかまでは決定していない。
		// 第2ステージでは、その位置を決定する。
		this._scorerArray = [];
		this._configureScorerSecond(this._scorerArray);
		
		// combination.costArrayは、攻撃可能な位置を格納した配列であるため、その数だけループする
		count = combination.costArray.length;
		for (i = 0; i < count; i++) {
			// _getTotalScoreの内部処理のため、位置と消費移動力を一時的に設定する。
			costData = combination.costArray[i];
			combination.posIndex = costData.posIndex;
			combination.movePoint = costData.movePoint;
			
			totalScore = this._getTotalScore(unit, combination);
			scoreArray.push(totalScore);
		}
		
		return this._getBestIndexFromScore(scoreArray);
	},
	
	_getBestIndexFromScore: function(scoreArray) {
		var i;
		var max = -1;
		var index = -1;
		var count = scoreArray.length;
		
		for (i = 0; i < count; i++) {
			// 最も大きいスコアを保存
			if (scoreArray[i] > max) {
				max = scoreArray[i];
				index = i;
			}
		}
		
		return index;
	},
	
	_getTotalScore: function(unit, combination) {
		var i;
		var totalScore = 0;
		var count = this._scorerArray.length;
		
		for (i = 0; i < count; i++) {
			totalScore += this._scorerArray[i].getScore(unit, combination);
		}
		
		return totalScore;
	},
	
	_configureScorerFirst: function(groupArray) {
		groupArray.appendObject(AIScorer.Weapon);
		groupArray.appendObject(AIScorer.Item);
		groupArray.appendObject(AIScorer.Skill);
	},
	
	_configureScorerSecond: function(groupArray) {
		groupArray.appendObject(AIScorer.Counterattack);
		groupArray.appendObject(AIScorer.Avoid);
	}
};

// 遠くの相手を狙う際に、どの組み合わせを使用する決定する
var CombinationSelectorEx = {
	getEstimateCombinationIndex: function(unit, combinationArray) {
		var i, index, combination;
		var count = combinationArray.length;
		var data = this._createEstimateData();
		
		for (i = 0; i < count; i++) {
			combination = combinationArray[i];
			if (this._isDistanceBase(unit, combination)) {
				this._checkDistanceBaseIndex(unit, combination, data, i);
			}
			else {
				this._checkScoreBaseIndex(unit, combination, data, i);
			}
		}
		
		if (data.recheckIndex !== -1) {
			this._checkDistanceBaseIndex(unit, combinationArray[data.recheckIndex], data, data.recheckIndex);
		}
		
		index = data.combinationIndex;
		if (index < 0) {
			return -1;
		}
		
		combinationArray[index].posIndex = data.posIndex;
		combinationArray[index].movePoint = data.min;
		
		return index;
	},
	
	_checkDistanceBaseIndex: function(unit, combination, data, combinationIndex) {
		var i, costData, isSet;
		var value = -1;
		var count = combination.costArray.length;
		
		for (i = 0; i < count; i++) {
			costData = combination.costArray[i];
			isSet = false;
			
			// combination.isPriorityが有効な場合は、遠くてもそちらが優先される。
			if (combination.isPriority) {
				// 初めて検出した場合は、無条件にisSetをtrueにする
				if (!data.isPriority) {
					data.isPriority = true;
					isSet = true;
				}
				else if (costData.movePoint < data.min) {
					isSet = true;
				}
			}
			else if (data.isPriority) {
				// 一度でも場所イベントを検出した場合は、通常の行動を許可しない
				isSet = false;
			}
			else if (costData.movePoint < data.min) {
				isSet = true;
			}
			
			if (isSet) {
				// isSetがtrueということは、現在のcostDataを移動位置として記録すべきことを意味するが、
				// unitを目指して移動してよいかどうかの判定も必要になるため、_getCombinationScoreで行う。
				// costArrayのループの前に_getCombinationScoreを呼び出すこともできるが、
				// 処理に時間がかかる傾向があるため、isSetを確認した場合のみ呼び出している。
				if (value === -1) {
					// valueには1か0が格納されるため、この処理は一度のみ実行される
					value = this._getCombinationScore(unit, combination) >= 0 ? 1 : 0;
				}
				
				if (value === 1) {
					data.min = costData.movePoint;
					data.posIndex = costData.posIndex;
					data.combinationIndex = combinationIndex;
				}
			}
		}
	},
	
	_checkScoreBaseIndex: function(unit, combination, data, combinationIndex) {
		var score = this._getCombinationScore(unit, combination);
		
		if (score > data.score) {
			data.score = score;
			data.recheckIndex = combinationIndex;
		}
	},
	
	_getCombinationScore: function(unit, combination) {
		var subject, score;
		
		// 目標までの通路が塞がれている場合はnullになる
		if (combination.item === null) {
			if (combination.skill !== null) {
				subject = createObject(AIScorer.Skill);
				score = subject.getScore(unit, combination);
			}
			else {
				// 動かしたくない場合はAIValue.MIN_SCOREを設定
				score = 0;
			}
			
			return score;
		}
		
		if (combination.item.isWeapon()) {
			if (this._isZeroWeaponAllowed()) {
				score = 0;
			}
			else {
				// 威力または命中が0の場合は、そのユニットの方向に移動するべきではない
				subject = createObject(AIScorer.Weapon);
				score = subject.getScore(unit, combination);
			}
		}
		else {
			// アイテムを使用する相手として妥当かを確認する。
			// たとえば、HPが減っていない場合は、
			// 回復アイテムを使用する必要はないといえる。
			subject = createObject(AIScorer.Item);
			score = subject.getScore(unit, combination);
		}
		
		return score;
	},
	
	_isDistanceBase: function(unit, combination) {
		var d = combination.rangeMetrics.endRange - combination.rangeMetrics.startRange;
		
		// 組み合わせを決定するにあたり、距離型とスコア型がある。
		// 距離型は、距離が近い相手を狙う意味となり、スコア型はスコアが高い相手を狙う意味になる。
		// どちらで調べるかの判定は、unitがどれだけ遠距離の射程を持っているかで決まる。
		// 遠距離攻撃(回復)の場合、相手に対して攻撃(回復)できる位置が相当数存在するため、
		// どの位置が最も近いかを調べるのは時間がかかる。
		
		return d <= 6;
	},
	
	_isZeroWeaponAllowed: function() {
		return DataConfig.isAIDamageZeroAllowed() && DataConfig.isAIHitZeroAllowed();
	},
	
	_createEstimateData: function() {
		var data = {};
		
		data.isPriority = false;
		data.combinationIndex = -1;
		data.posIndex = 0;
		data.min = AIValue.MAX_MOVE;
		
		data.score = -1;
		data.recheckIndex = -1;
		
		return data;
	}
};
