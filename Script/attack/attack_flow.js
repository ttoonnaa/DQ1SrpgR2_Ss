
var AttackFlowMode = {
	NONE: 0,
	STARTFLOW: 1,
	ATTACK: 2,
	ENDFLOW: 3,
	COMPLETE: 4
};

var AttackFlowResult = {
	DEATH: 0,
	CONTINUE: 1,
	NONE: 2
};

// RealBattleもEasyBattleも、どのユニットから攻撃するかなどの順番は同一である。
// こうした順番は、AttackOrder内のAttackEntryで構成されており、それを確認するのがAttackFlowになる。
var AttackFlow = defineObject(BaseObject,
{
	_parentCoreAttack: null,
	_order: null,
	_attackInfo: null,
	_startStraightFlow: null,
	_endStraightFlow: null,
	
	setAttackInfoAndOrder: function(attackInfo, order, parentCoreAttack) {
		this._parentCoreAttack = parentCoreAttack;
		this._order = order;
		this._attackInfo = attackInfo;
		
		this._startStraightFlow = createObject(StraightFlow);
		this._startStraightFlow.setStraightFlowData(this._parentCoreAttack);
		this._pushFlowEntriesStart(this._startStraightFlow);
		
		this._endStraightFlow = createObject(StraightFlow);
		this._endStraightFlow.setStraightFlowData(this._parentCoreAttack);
		this._pushFlowEntriesEnd(this._endStraightFlow);
	},
	
	startAttackFlow: function() {
		this._changeFirstMode();
		return EnterResult.NOTENTER;
	},
	
	moveStartFlow: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === AttackFlowMode.STARTFLOW) {
			if (this._startStraightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
				this.changeCycleMode(AttackFlowMode.ATTACK);
				result = MoveResult.END;
			}
		}
		else if (mode === AttackFlowMode.ATTACK) {
			result = MoveResult.END;
		}
		
		return result;
	},
	
	moveEndFlow: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === AttackFlowMode.ENDFLOW) {
			if (this._endStraightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
				this.changeCycleMode(AttackFlowMode.COMPLETE);
			}
		}
		else if (mode === AttackFlowMode.COMPLETE) {
			result = MoveResult.END;
		}
		
		return result;
	},
	
	drawStartFlow: function() {
		var mode = this.getCycleMode();
		
		if (mode === AttackFlowMode.STARTFLOW) {
			this._startStraightFlow.drawStraightFlow();
		}
	},
	
	drawEndFlow: function() {
		var mode = this.getCycleMode();
		
		if (mode === AttackFlowMode.ENDFLOW) {
			this._endStraightFlow.drawStraightFlow();
		}
	},
	
	checkNextAttack : function() {
		var result = AttackFlowResult.NONE;
		
		if (this.isBattleUnitLosted()) {
			this._changeLastMode();
			result = AttackFlowResult.DEATH;
		}
		else if (this._isBattleContinue()) {
			// trueを返した場合はまだAttackEntryが存在することを意味する。
			// 呼び出し元はこれを検出して戦闘を続ける。
			result = AttackFlowResult.CONTINUE; 
		}
		else {
			// AttackEntryが存在しなくなり、戦闘に決着がつかなかった場合に実行される
			this._changeLastMode();
		}
		
		return result;
	},
	
	getPlayerUnit: function() {
		var unit = this._order.getActiveUnit();
		
		if (unit.getUnitType() === UnitType.PLAYER) {
			return unit;
		}
		
		unit = this._order.getPassiveUnit();
		if (unit.getUnitType() === UnitType.PLAYER) {
			return unit;
		}
		
		return null;
	},
	
	isBattleUnitLosted: function() {
		var active = this._order.getActiveUnit();
		var passive = this._order.getPassiveUnit();
		
		return DamageControl.isLosted(active) || DamageControl.isLosted(passive);
	},
	
	getAttackOrder: function() {
		return this._order;
	},
	
	getAttackInfo: function() {
		return this._attackInfo;
	},
	
	validBattle: function() {
		var result = this._order.isNextOrder();
		
		if (!result) {
			this._changeLastMode();
		}
		
		return result;
	},
	
	// 戦闘をカットしたい場合に呼び出される。
	// オーダーの中身を一気に実行する。
	finalizeAttack: function() {
		if (!this._startStraightFlow.isFlowLast()) {
			this._startStraightFlow.enterStraightFlow();	
		}
		
		while (this._order.isNextOrder()) {
			this.executeAttackPocess();
		}
		
		if (!this._endStraightFlow.isFlowLast()) {
			this._endStraightFlow.enterStraightFlow();
		}
	},
	
	executeAttackPocess: function() {
		this._doAttackAction();
		this._order.nextOrder();
	},
	
	_doAttackAction: function() {
		var i, count, turnState;
		var order = this._order;
		var active = order.getActiveUnit();
		var passive = order.getPassiveUnit();
		var activeStateArray = order.getActiveStateArray();
		var passiveStateArray = order.getPassiveStateArray();
		var isItemDecrement = order.isCurrentItemDecrement();
		
		DamageControl.reduceHp(active, order.getActiveDamage());
		DamageControl.reduceHp(passive, order.getPassiveDamage());
		
		DamageControl.checkHp(active, passive);
		
		count = activeStateArray.length;
		for (i = 0; i < count; i++) {
			turnState = StateControl.arrangeState(active, activeStateArray[i], IncreaseType.INCREASE);
			if (turnState !== null) {
				turnState.setLocked(true);
			}
		}
		
		count = passiveStateArray.length;
		for (i = 0; i < count; i++) {
			turnState = StateControl.arrangeState(passive, passiveStateArray[i], IncreaseType.INCREASE);
			if (turnState !== null) {
				turnState.setLocked(true);
			}
		}
		
		if (isItemDecrement) {
			// 攻撃する側の武器を減らす。
			// ここで、アイテムが破棄されるようなことはない。
			// ItemControl.getEquippedWeaponはnullを返す可能性があるため呼び出さない。
			// 武器の「専用データ」が現在HPである場合は、戦闘によってHPが変化している可能性があり、装備判定も変化する。
			ItemControl.decreaseLimit(active, BattlerChecker.getBaseWeapon(active));
		}
	},
	
	_isBattleContinue: function() {
		return this._order.isNextOrder();
	},
	
	_changeFirstMode: function() {
		if (this._startStraightFlow.enterStraightFlow() === EnterResult.OK) {
			this.changeCycleMode(AttackFlowMode.STARTFLOW);
		}
		else {
			this.changeCycleMode(AttackFlowMode.ATTACK);
		}
	},
	
	_changeLastMode: function() {
		if (this._endStraightFlow.enterStraightFlow() === EnterResult.OK) {
			this.changeCycleMode(AttackFlowMode.ENDFLOW);
		}
		else {
			this.changeCycleMode(AttackFlowMode.COMPLETE);
		}
	},
	
	_pushFlowEntriesStart: function(straightFlow) {
		straightFlow.pushFlowEntry(UnitDeclarationFlowEntry);
	},
	
	_pushFlowEntriesEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(UnitDeathFlowEntry);
		straightFlow.pushFlowEntry(UnitSyncopeFlowEntry);
		
		// リアル戦闘用の経験値取得と、簡易戦闘用の経験値取得を追加しているが、
		// 実際に処理が実行されるのはどちらか片方である。
		straightFlow.pushFlowEntry(RealExperienceFlowEntry);
		straightFlow.pushFlowEntry(EasyExperienceFlowEntry);
		
		straightFlow.pushFlowEntry(WeaponBrokenFlowEntry);
		straightFlow.pushFlowEntry(StateAutoRemovalFlowEntry);
	}
}
);

var UnitDeclarationFlowEntry = defineObject(BaseFlowEntry,
{
	_capsuleEvent: null,
	
	enterFlowEntry: function(coreAttack) {
		this._prepareMemberData(coreAttack);
		return this._completeMemberData(coreAttack);
	},
	
	moveFlowEntry: function() {
		var result = MoveResult.CONTINUE;
		
		if (this._capsuleEvent.moveCapsuleEvent() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return result;
	},
	
	_prepareMemberData: function(coreAttack) {
		this._capsuleEvent = createObject(CapsuleEvent);
	},
	
	_completeMemberData: function(coreAttack) {
		var order = coreAttack.getAttackFlow().getAttackOrder();
		var battleEventData = UnitEventChecker.getUnitBattleEventData(order.getActiveUnit(), order.getPassiveUnit());
		
		// 「攻撃をする側」と「攻撃をされる側」を変数で参照できるようにする
		root.getSceneController().notifyBattleStart(order.getActiveUnit(), order.getPassiveUnit());
		
		if (battleEventData === null) {
			return EnterResult.NOTENTER;
		}
		
		this._capsuleEvent.setBattleUnit(battleEventData.unit);
		
		if (this.isFlowSkip() || coreAttack.isBattleCut()) {
			root.setEventSkipMode(true);
		}
		
		return this._capsuleEvent.enterCapsuleEvent(battleEventData.event, true);
	}
}
);

var UnitDeathMode = {
	EVENT: 0,
	ERASE: 1
};

var UnitDeathFlowEntry = defineObject(BaseFlowEntry,
{
	_coreAttack: null,
	_eraseCounter: null,
	_activeUnit: null,
	_passiveUnit: null,
	_capsuleEvent: null,
	
	enterFlowEntry: function(coreAttack) {
		this._prepareMemberData(coreAttack);
		return this._completeMemberData(coreAttack);
	},
	
	moveFlowEntry: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === UnitDeathMode.EVENT) {
			result = this._moveEvent();
		}
		else if (mode === UnitDeathMode.ERASE) {
			result = this._moveErase();
		}
		
		return result;
	},
	
	_prepareMemberData: function(coreAttack) {
		var order = coreAttack.getAttackFlow().getAttackOrder();
		
		this._coreAttack = coreAttack;
		this._eraseCounter = createObject(EraseCounter);
		this._activeUnit = order.getActiveUnit();
		this._passiveUnit = order.getPassiveUnit();
		this._capsuleEvent = createObject(CapsuleEvent);
	},
	
	_completeMemberData: function(coreAttack) {
		// イベントコマンドの「変数の調整」で「戦闘情報」を参照できるようにする。
		// これにより、ユニットの「死亡時」イベントで自身を倒した相手を特定できる。
		root.getSceneController().notifyBattleEnd(this._activeUnit, this._passiveUnit);
		
		// どちらのユニットも倒れていない場合は、処理を続行しない
		if (!coreAttack.getAttackFlow().isBattleUnitLosted()) {
			return EnterResult.NOTENTER;
		}
		
		if (DamageControl.isSyncope(this._passiveUnit)) {
			return EnterResult.NOTENTER;
		}
		
		// UnitDeathFlowEntryはCoreAttackから使用されるが、
		// CoreAttackにおけるスキップは必ず成功しなければならないため、
		// 現在がスキップ状態の場合は無条件にスキップする。
		if (this.isFlowSkip() || this._coreAttack.isBattleCut()) {
			this._doEndAction();
			return EnterResult.NOTENTER;
		}
		
		// 死亡時イベントを処理することを記録する
		coreAttack.recordUnitLostEvent(true);
		
		// イベントが存在しない、または終了できたかどうか(負傷が有効な場合、死亡時イベントは発生しない)
		if (this._capsuleEvent.enterCapsuleEvent(UnitEventChecker.getUnitLostEvent(this._passiveUnit), false) === EnterResult.NOTENTER) {
			if (this.isFlowSkip() || this._coreAttack.isBattleCut()) {
				this._doEndAction();
				return EnterResult.NOTENTER;
			}
			else {
				this.changeCycleMode(UnitDeathMode.ERASE);
				return EnterResult.OK;
			}
		}
		
		this._playUnitDeathMusic();
		
		// 死亡時メッセージを確実に見れるように、敵ターンスキップの「早送り」を止める
		CurrentMap.enableEnemyAcceleration(false);
		
		this.changeCycleMode(UnitDeathMode.EVENT);
		
		return EnterResult.OK;
	},
	
	_moveEvent: function() {
		if (this._capsuleEvent.moveCapsuleEvent() !== MoveResult.CONTINUE) {
			// ユニットイベントで表示されたかもしれないメッセージを消去する。
			// 簡易の強制戦闘でマップユニットがメッセージの上に描画されるのを防ぐ。
			EventCommandManager.eraseMessage(MessageEraseFlag.ALL);
			this.changeCycleMode(UnitDeathMode.ERASE);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveErase: function() {
		if (this._eraseCounter.moveEraseCounter() !== MoveResult.CONTINUE) {
			this._coreAttack.getBattleObject().eraseRoutine(0);
			this._doEndAction();
			return MoveResult.END;
		}
		else {
			this._coreAttack.getBattleObject().eraseRoutine(this._eraseCounter.getEraseAlpha());
		}
		
		return MoveResult.CONTINUE;
	},
	
	_doEndAction: function() {
	},
	
	_playUnitDeathMusic: function() {
		var handle;
		
		if (this._isDeathMusicAllowed()) {
			handle = this._getDeathMusicHandle();
			if (!handle.isNullHandle()) {
				MediaControl.musicPlay(handle);
				this._coreAttack.getBattleObject().getBattleTable().setMusicPlayFlag(true);
			}
		}
	},
	
	_isDeathMusicAllowed: function() {
		return this._passiveUnit.getUnitType() === UnitType.PLAYER && !this._passiveUnit.isGuest();
	},
	
	_getDeathMusicHandle: function() {
		return root.querySoundHandle('playerdeathmusic');
	}
}
);

var UnitSyncopeFlowEntry = defineObject(BaseFlowEntry,
{
	_coreAttack: null,
	_eraseCounter: null,
	_activeUnit: null,
	_passiveUnit: null,
	
	enterFlowEntry: function(coreAttack) {
		this._prepareMemberData(coreAttack);
		return this._completeMemberData(coreAttack);
	},
	
	moveFlowEntry: function() {
		if (this._eraseCounter.moveEraseCounter() !== MoveResult.CONTINUE) {
			this._coreAttack.getBattleObject().eraseRoutine(0);
			this._doEndAction();
			return MoveResult.END;
		}
		else {
			this._coreAttack.getBattleObject().eraseRoutine(this._eraseCounter.getEraseAlpha());
		}
		
		return MoveResult.CONTINUE;
	},
	
	_prepareMemberData: function(coreAttack) {
		var order = coreAttack.getAttackFlow().getAttackOrder();
		
		this._coreAttack = coreAttack;
		this._eraseCounter = createObject(EraseCounter);
		this._activeUnit = order.getActiveUnit();
		this._passiveUnit = order.getPassiveUnit();
	},
	
	_completeMemberData: function(coreAttack) {
		if (!DamageControl.isSyncope(this._passiveUnit)) {
			return EnterResult.NOTENTER;
		}
		
		if (this.isFlowSkip() || this._coreAttack.isBattleCut()) {
			this._doEndAction();
			return EnterResult.NOTENTER;
		}
		
		if (!this._coreAttack.getBattleObject().isSyncopeErasing()) {
			this._doEndAction();
			return EnterResult.NOTENTER;
		}
		
		return EnterResult.OK;
	},
	
	_doEndAction: function() {
	}
}
);

var RealExperienceMode = {
	WINDOW: 0,
	SCROLL: 1,
	ANIME: 2,
	LEVEL: 3
};

var RealExperienceFlowEntry = defineObject(BaseFlowEntry,
{
	_coreAttack: null,
	_unit: null,
	_getExp: 0,
	_growthArray: null,
	_experienceNumberView: null,
	_levelupView: null,
	_effect: null,
	
	enterFlowEntry: function(coreAttack) {
		if (this._checkLevelup()) {
			// 経験値処理の途中でスキップが発生した場合、AttackFlow.finalizeAttack経由で再度enterFlowEntryが呼ばれる
			return EnterResult.NOTENTER;
		}
		
		this._prepareMemberData(coreAttack);
		return this._completeMemberData(coreAttack);
	},
	
	moveFlowEntry: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === RealExperienceMode.WINDOW) {
			result = this._moveWindow();
		}
		else if (mode === RealExperienceMode.SCROLL) {
			result = this._moveScroll();
		}
		else if (mode === RealExperienceMode.ANIME) {
			result = this._moveAnime();
		}
		else if (mode === RealExperienceMode.LEVEL) {
			result = this._moveLevel();
		}
		
		return result;
	},
	
	drawFlowEntry: function() {
		var mode = this.getCycleMode();
		
		if (mode === RealExperienceMode.WINDOW) {
			this._drawWindow();
		}
		else if (mode === RealExperienceMode.LEVEL) {
			this._drawLevel();
		}
	},
	
	_prepareMemberData: function(coreAttack) {
		var attackFlow = coreAttack.getAttackFlow();
		var order = attackFlow.getAttackOrder();
		
		this._coreAttack = coreAttack;
		this._unit = attackFlow.getPlayerUnit();
		this._getExp = order.getExp();
		this._growthArray = null;
		this._experienceNumberView = createWindowObject(ExperienceNumberView, this);
		this._levelupView = createObject(LevelupView);
	},
	
	_completeMemberData: function(coreAttack) {
		// 戦闘がリアル形式でない場合は続行しない
		if (!coreAttack.isRealBattle()) {
			return EnterResult.NOTENTER;
		}
		
		if (!Miscellaneous.isExperienceEnabled(this._unit, this._getExp)) {
			return EnterResult.NOTENTER;
		}
		
		this._growthArray = ExperienceControl.obtainExperience(this._unit, this._getExp);
		
		if (this.isFlowSkip() || this._coreAttack.isBattleCut()) {
			// スキップ時は、直ちに経験値を与える
			this._doEndAction();
			return EnterResult.NOTENTER;
		}
		
		this._experienceNumberView.setExperienceNumberData(this._unit, this._getExp);
		this.changeCycleMode(RealExperienceMode.WINDOW);
		
		return EnterResult.OK;
	},
	
	_checkLevelup: function() {
		if (this._coreAttack === null) {
			return false;
		}
		
		this._doEndAction();
		
		return true;
	},
	
	_doEndAction: function() {
		if (this._growthArray !== null) {
			ExperienceControl.plusGrowth(this._unit, this._growthArray);
			ExperienceControl.obtainData(this._unit);
		}
	},
	
	_moveWindow: function() {
		if (this._experienceNumberView.moveNumberView() !== MoveResult.CONTINUE) {
			if (this._growthArray !== null) {
				// レベルが上がる場合はスクロール
				this._coreAttack.getBattleObject().startExperienceScroll(this._unit);
				this.changeCycleMode(RealExperienceMode.SCROLL);
			}
			else {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveScroll: function() {
		if (this._coreAttack.getBattleObject().moveAutoScroll() !== MoveResult.CONTINUE) {
			this._changeLevelAnime();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAnime: function() {
		var levelupViewParam;
		
		if (this._effect.isEffectLast()) {
			levelupViewParam = this._createLevelupViewParam();
			this._levelupView.enterLevelupViewCycle(levelupViewParam);
			this.changeCycleMode(RealExperienceMode.LEVEL);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveLevel: function() {
		var result = this._levelupView.moveLevelupViewCycle();
		
		if (result !== MoveResult.CONTINUE) {
			this._doEndAction();
		}
		
		return result;
	},
	
	_drawWindow: function() {
		var x = LayoutControl.getCenterX(-1, this._experienceNumberView.getNumberViewWidth());
		var y = this._coreAttack.getBattleObject().getBattleArea().y + 120;
		
		this._experienceNumberView.drawNumberView(x, y);
	},
	
	_drawLevel: function() {
		this._levelupView.drawLevelupViewCycle();
	},
	
	_changeLevelAnime: function() {
		var pos;
		var animeData = root.queryAnime('reallevelup');
		var isRight = true;
		var battleObject = this._coreAttack.getBattleObject();
		var battler = battleObject.getBattler(isRight);
		
		if (battler.getUnit() !== this._unit) {
			isRight = false;
			battler = battleObject.getBattler(isRight);
		}
		
		pos = battler.getEffectPos(animeData);
		this._effect = battleObject.createEffect(animeData, pos.x, pos.y, isRight, false);
		
		this.changeCycleMode(RealExperienceMode.ANIME);
	},
	
	_createLevelupViewParam: function() {
		var levelupViewParam = StructureBuilder.buildLevelupViewParam();
		
		levelupViewParam.targetUnit = this._unit;
		levelupViewParam.getExp = this._getExp;
		levelupViewParam.xAnime = 0;
		levelupViewParam.yAnime = 0;
		levelupViewParam.anime = null;
		levelupViewParam.growthArray = this._growthArray;
		
		return levelupViewParam;
	}
}
);

var EasyExperienceMode = {
	WINDOW: 0,
	LEVEL: 1
};

var EasyExperienceFlowEntry = defineObject(BaseFlowEntry,
{
	_coreAttack: null,
	_unit: null,
	_getExp: 0,
	_growthArray: null,
	_experienceNumberView: null,
	_levelupView: null,
	
	enterFlowEntry: function(coreAttack) {
		if (this._checkLevelup()) {
			return EnterResult.NOTENTER;
		}
		
		this._prepareMemberData(coreAttack);
		return this._completeMemberData(coreAttack);
	},
	
	moveFlowEntry: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === EasyExperienceMode.WINDOW) {
			result = this._moveWindow();
		}
		else if (mode === EasyExperienceMode.LEVEL) {
			result = this._moveLevel();
		}
		
		return result;
	},
	
	drawFlowEntry: function() {
		var mode = this.getCycleMode();
		
		if (mode === EasyExperienceMode.WINDOW) {
			this._drawWindow();
		}
		else if (mode === EasyExperienceMode.LEVEL) {
			this._drawLevel();
		}
	},
	
	_prepareMemberData: function(coreAttack) {
		var attackFlow = coreAttack.getAttackFlow();
		var order = attackFlow.getAttackOrder();
		
		this._coreAttack = coreAttack;
		this._unit = attackFlow.getPlayerUnit();
		this._getExp = order.getExp();
		this._growthArray = null;
		this._experienceNumberView = createWindowObject(ExperienceNumberView, this);
		this._levelupView = createObject(LevelupView);
	},
	
	_completeMemberData: function(coreAttack) {
		if (coreAttack.isRealBattle()) {
			return EnterResult.NOTENTER;
		}
		
		if (!Miscellaneous.isExperienceEnabled(this._unit, this._getExp)) {
			return EnterResult.NOTENTER;
		}
		
		this._growthArray = ExperienceControl.obtainExperience(this._unit, this._getExp);
		
		if (this.isFlowSkip() || this._coreAttack.isBattleCut()) {
			// スキップ時は、直ちに経験値を与える
			this._doEndAction();
			return EnterResult.NOTENTER;
		}
		
		this._experienceNumberView.setExperienceNumberData(this._unit, this._getExp);
		this.changeCycleMode(EasyExperienceMode.WINDOW);
		
		return EnterResult.OK;
	},
	
	_checkLevelup: function() {
		if (this._coreAttack === null) {
			return false;
		}
		
		this._doEndAction();
		
		return true;
	},
	
	_doEndAction: function() {
		if (this._growthArray !== null) {
			ExperienceControl.plusGrowth(this._unit, this._growthArray);
			ExperienceControl.obtainData(this._unit);
		}
	},
	
	_moveWindow: function() {
		var levelupViewParam;
		
		if (this._experienceNumberView.moveNumberView() !== MoveResult.CONTINUE) {
			if (this._growthArray !== null) {
				levelupViewParam = this._createLevelupViewParam();
				this._levelupView.enterLevelupViewCycle(levelupViewParam);
				
				this.changeCycleMode(EasyExperienceMode.LEVEL);
			}
			else {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveLevel: function() {
		var result = this._levelupView.moveLevelupViewCycle();
		
		if (result !== MoveResult.CONTINUE) {
			this._doEndAction();
		}
		
		return result;
	},
	
	_drawWindow: function() {
		var x = LayoutControl.getCenterX(-1, this._experienceNumberView.getNumberViewWidth());
		var y = LayoutControl.getNotifyY();
		
		this._experienceNumberView.drawNumberView(x, y);
	},
	
	_drawLevel: function() {
		this._levelupView.drawLevelupViewCycle();
	},
	
	_createLevelupViewParam: function() {
		var levelupViewParam = StructureBuilder.buildLevelupViewParam();
		var x = LayoutControl.getPixelX(this._unit.getMapX());
		var y = LayoutControl.getPixelY(this._unit.getMapY());
		var anime = root.queryAnime('easylevelup');
		var pos = LayoutControl.getMapAnimationPos(x, y, anime);
		
		levelupViewParam.targetUnit = this._unit;
		levelupViewParam.getExp = this._getExp;
		levelupViewParam.xAnime = pos.x;
		levelupViewParam.yAnime = pos.y;
		levelupViewParam.anime = anime;
		levelupViewParam.growthArray = this._growthArray;
		
		return levelupViewParam;
	}
}
);

var WeaponBrokenFlowEntry = defineObject(BaseFlowEntry,
{	
	_dynamicEvent: null,
	
	enterFlowEntry: function(coreAttack) {
		var generator;
		var attackFlow = coreAttack.getAttackFlow();
		var order = attackFlow.getAttackOrder();
		
		if (this.isFlowSkip() || coreAttack.isBattleCut()) {
			return EnterResult.NOTENTER;
		}
		
		this._dynamicEvent = createObject(DynamicEvent);
		generator = this._dynamicEvent.acquireEventGenerator();
		
		this._checkDelete(order.getActiveUnit(), generator);
		this._checkDelete(order.getPassiveUnit(), generator);
		
		return this._dynamicEvent.executeDynamicEvent();
	},
	
	moveFlowEntry: function() {
		return this._dynamicEvent.moveDynamicEvent();
	},
	
	_checkDelete: function(unit, generator) {
		var weapon;
		var isCenterShow = true;
		
		weapon = BattlerChecker.getBaseWeapon(unit);
		if (weapon === null) {
			return;
		}
		
		if (ItemControl.isItemBroken(weapon)) {
			if (unit.getUnitType() === UnitType.PLAYER && DataConfig.isWeaponLostDisplayable()) {
				generator.soundPlay(this._getLostSoundHandle(), 1);
				generator.messageTitle(weapon.getName() + StringTable.ItemLost, 0, 0, isCenterShow);
			}
		}
	},
	
	_getLostSoundHandle: function() {
		return root.querySoundHandle('itemlost');
	}
}
);

var StateAutoRemovalFlowEntry = defineObject(BaseFlowEntry,
{
	enterFlowEntry: function(coreAttack) {
		var attackFlow = coreAttack.getAttackFlow();
		var order = attackFlow.getAttackOrder();
		var attackInfo = attackFlow.getAttackInfo();
		var prevIndex = order.getCurrentIndex();
		
		this._checkState(attackInfo.unitSrc, order);
		this._checkState(attackInfo.unitDest, order);
		
		order.setCurrentIndex(prevIndex);
		
		return EnterResult.NOTENTER;
	},
	
	_checkState: function(unit, order) {
		var i, turnState, state, type;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		var arr = [];
		
		for (i = 0; i < count; i++) {
			turnState = list.getData(i);
			if (turnState.isLocked()) {
				turnState.setLocked(false);
				continue;
			}
			
			state = turnState.getState();
			type = state.getAutoRemovalType();
			if (type === StateAutoRemovalType.NONE) {
				continue;
			}
			else if (type === StateAutoRemovalType.BATTLEEND) {
				arr.push(turnState);
			}
			else if (type === StateAutoRemovalType.ACTIVEDAMAGE || type === StateAutoRemovalType.PASSIVEDAMAGE) {
				if (this._checkHit(unit, order, type)) {
					arr.push(turnState);
				}
			}
		}
		
		count = arr.length;
		for (i = 0; i < count; i++) {
			turnState = arr[i];
			this._removeState(list, turnState);
		}
	},
	
	_checkHit: function(unit, order, type) {
		var i;
		var count = order.getEntryCount();
		
		for (i = 0; i < count; i++) {
			order.setCurrentIndex(i);
			if (type === StateAutoRemovalType.ACTIVEDAMAGE) {
				if (unit === order.getActiveUnit() && order.isCurrentHit()) {
					return true;
				}
			}
			else if (type === StateAutoRemovalType.PASSIVEDAMAGE) {
				if (unit === order.getPassiveUnit() && order.isCurrentHit()) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	_removeState: function(list, turnState) {
		var count = turnState.getRemovalCount() - 1;
		
		if (count > 0) {
			turnState.setRemovalCount(count);
			return;
		}
		
		root.getDataEditor().deleteTurnStateData(list, turnState.getState());
	}
}
);
