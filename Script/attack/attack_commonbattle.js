
var BaseBattleTable = defineObject(BaseObject,
{
	_battleObject: null,
	_straightFlowBattleStart: null,
	_straightFlowBattleEnd: null,
	_straightFlowActionStart: null,
	_straightFlowActionEnd: null,
	_isMusicPlay: false,
	_isBattleStart: true,
	
	initialize: function() {
		this._straightFlowBattleStart = createObject(StraightFlow);
		this._straightFlowBattleEnd = createObject(StraightFlow);
		this._straightFlowActionStart = createObject(StraightFlow);
		this._straightFlowActionEnd = createObject(StraightFlow);
		
		this._straightFlowBattleStart.setStraightFlowData(this);
		this._straightFlowBattleEnd.setStraightFlowData(this);
		this._straightFlowActionStart.setStraightFlowData(this);
		this._straightFlowActionEnd.setStraightFlowData(this);
		
		this._pushFlowEntriesBattleStart(this._straightFlowBattleStart);
		this._pushFlowEntriesBattleEnd(this._straightFlowBattleEnd);
		this._pushFlowEntriesActionStart(this._straightFlowActionStart);
		this._pushFlowEntriesActionEnd(this._straightFlowActionEnd);
	},
	
	setBattleObject: function(battleObject) {
		this._battleObject = battleObject;
	},
	
	getBattleObject: function() {
		return this._battleObject;
	},
	
	enterBattleStart: function() {
		this._straightFlowBattleStart.resetStraightFlow();
		return this._straightFlowBattleStart.enterStraightFlow();
	},
	
	enterBattleEnd: function() {
		this._straightFlowBattleEnd.resetStraightFlow();
		return this._straightFlowBattleEnd.enterStraightFlow();
	},
	
	enterActionStart: function() {
		this._straightFlowActionStart.resetStraightFlow();
		return this._straightFlowActionStart.enterStraightFlow();
	},
	
	enterActionEnd: function() {
		this._straightFlowActionEnd.resetStraightFlow();
		return this._straightFlowActionEnd.enterStraightFlow();
	},
	
	moveBattleStart: function() {
		return this._straightFlowBattleStart.moveStraightFlow();
	},
	
	moveBattleEnd: function() {
		return this._straightFlowBattleEnd.moveStraightFlow();
	},
	
	moveActionStart: function() {
		return this._straightFlowActionStart.moveStraightFlow();
	},
	
	moveActionEnd: function() {
		return this._straightFlowActionEnd.moveStraightFlow();
	},
	
	drawBattleStart: function() {
		this._straightFlowBattleStart.drawStraightFlow();
	},
	
	drawBattleEnd: function() {
		this._straightFlowBattleEnd.drawStraightFlow();
	},
	
	drawActionStart: function() {
		this._straightFlowActionStart.drawStraightFlow();
	},
	
	drawActionEnd: function() {
		this._straightFlowActionEnd.drawStraightFlow();
	},
	
	isMusicPlay: function() {
		return this._isMusicPlay;
	},
	
	setMusicPlayFlag: function(isPlay) {
		this._isMusicPlay = isPlay;
	},
	
	endMusic: function() {
		if (this._isBattleStart && this._isMusicPlay) {
			this._saveCurrentMusicTime();
			MediaControl.musicStop(MusicStopType.BACK);
		}
		
		MediaControl.resetSoundList();
	},
	
	_pushFlowEntriesBattleStart: function(straightFlow) {
	},
	
	_pushFlowEntriesBattleEnd: function(straightFlow) {
	},
	
	_pushFlowEntriesActionStart: function(straightFlow) {
	},
	
	_pushFlowEntriesActionEnd: function(straightFlow) {
	},
	
	_saveCurrentMusicTime: function() {
	}
}
);


//---------------------------------------------


var EasyBattleTable = defineObject(BaseBattleTable,
{
	_pushFlowEntriesBattleStart: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyStartFlowEntry);
	},
	
	_pushFlowEntriesBattleEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyEndFlowEntry);
	},
	
	_pushFlowEntriesActionStart: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyInterruptSkillFlowEntry);
	},
	
	_pushFlowEntriesActionEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(EasyDiagnosticStateFlowEntry);
	}
}
);

var EasyStartFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveStartFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawStartFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		this._attackFlow.startAttackFlow();
		
		// falseを指定することで、「戦闘終了後も再生し続ける」場合のみBGMが変更される
		BattleMusicControl.playBattleMusic(battleTable, false);
		
		return EnterResult.OK;
	}
}
);

var EasyEndFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveEndFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawEndFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		
		return EnterResult.OK;
	}
}
);

var EasyDiagnosticStateFlowEntry = defineObject(BaseFlowEntry,
{
	_index: 0,
	_effect: null,
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._effect.isEffectLast()) {
			if (!this._checkNextState()) {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		this._index = 0;
		this._effect = null;
		this._battleTable = battleTable;
	},
	
	_completeMemberData: function(battleTable) {
		return this._checkNextState() ? EnterResult.OK : EnterResult.NOTENTER;
	},
	
	_checkNextState: function() {
		var anime;
		var battleObject = this._battleTable.getBattleObject();
		var stateArray = battleObject.getAttackOrder().getPassiveStateArray();
		
		if (this._index >= stateArray.length) {
			return false;
		}
		
		anime = stateArray[this._index].getEasyAnime();
		if (anime === null) {
			return false;
		}
		
		this._effect = this._createEasyStateEffect(battleObject, anime);
		
		this._index++;
		
		return this._effect !== null;
	},
	
	_createEasyStateEffect: function(battleObject, anime) {
		var battler = battleObject.getPassiveBattler();
		var pos = LayoutControl.getMapAnimationPos(battler.getMapUnitX(), battler.getMapUnitY(), anime);
		
		return battleObject.createEasyEffect(anime, pos.x, pos.y);
	}
}
);

var EasyInterruptSkillFlowEntry = defineObject(BaseFlowEntry,
{
	_skillProjector: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		return this._skillProjector.moveProjector();
	},
	
	drawFlowEntry: function() {
		this._skillProjector.drawProjector();
	},
	
	_prepareMemberData: function(battleTable) {
		this._skillProjector = createObject(SkillProjector);
	},
	
	_completeMemberData: function(battleTable) {
		var battleObject = battleTable.getBattleObject();
		var activeSkillArray = battleObject.getAttackOrder().getActiveSkillArray();
		var passiveSkillArray = battleObject.getAttackOrder().getPassiveSkillArray();
		
		this._skillProjector.setupProjector(BattleType.EASY, battleObject);
		
		if (battleObject.getBattler(true).getUnit() === battleObject.getAttackOrder().getActiveUnit()) {
			if (activeSkillArray.length > 0 || passiveSkillArray.length > 0) {
				this._skillProjector.startProjector(activeSkillArray, passiveSkillArray, true);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		else {
			if (passiveSkillArray.length > 0 || activeSkillArray.length > 0) {
				this._skillProjector.startProjector(passiveSkillArray, activeSkillArray, false);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		
		return EnterResult.OK;
	}
}
);


//---------------------------------------------


var RealBattleTable = defineObject(BaseBattleTable,
{
	_startBattleTransition: null,
	_endBattleTransition: null,
	
	initialize: function() {
		BaseBattleTable.initialize.call(this);
		
		this._startBattleTransition = this._createStartBattleTransition();
		this._endBattleTransition = this._createEndBattleTransition();
		
		this._isBattleStart = false;
	},
	
	getStartBattleTransition: function() {
		return this._startBattleTransition;
	},
	
	getEndBattleTransition: function() {
		return this._endBattleTransition;
	},
	
	isBattleStart: function() {
		return this._isBattleStart;
	},
	
	setBattleStartFlag: function(isStart) {
		this._isBattleStart = isStart;
		this.getBattleObject().setBattleLayoutVisible(true);
	},
	
	_createStartBattleTransition: function() {
		return createObject(BattleTransition);
	},
	
	_createEndBattleTransition: function() {
		return createObject(CloseBattleTransition);
	},
	
	_pushFlowEntriesBattleStart: function(straightFlow) {
		straightFlow.pushFlowEntry(TransitionStartFlowEntry);
		straightFlow.pushFlowEntry(WatchLoopFlowEntry);
		straightFlow.pushFlowEntry(RealStartFlowEntry);
	},
	
	_pushFlowEntriesBattleEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(RealEndFlowEntry);
		straightFlow.pushFlowEntry(TransitionEndFlowEntry);
	},
	
	_pushFlowEntriesActionStart: function(straightFlow) {
		straightFlow.pushFlowEntry(RealInterruptSkillFlowEntry);
		straightFlow.pushFlowEntry(RealWeaponCutinFlowEntry);
		straightFlow.pushFlowEntry(RealSkillCutinFlowEntry);
		straightFlow.pushFlowEntry(RealUnitCutinFlowEntry);
		
	},
	
	_pushFlowEntriesActionEnd: function(straightFlow) {
		straightFlow.pushFlowEntry(RealDiagnosticStateFlowEntry);
	}
}
);

// drawFlowEntry内の描画は拡大対象にならない。
// 拡大対象にするには、createEffectかpushCustomEffectを呼び出す。
var TransitionStartFlowEntry = defineObject(BaseFlowEntry,
{
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		this._checkMusic();
		
		if (this._battleTable.getStartBattleTransition().moveBattleTransition() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._battleTable.getStartBattleTransition().drawBattleTransition();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._battleTable = battleTable;
		this._battleTable.getStartBattleTransition().setupBattleTransition();
		
		return EnterResult.OK;
	},
	
	_checkMusic: function() {
		var isMusicPlay;
		
		if (this._battleTable.getStartBattleTransition().isSecondHalf()) {
			if (!this._battleTable.isBattleStart()) {
				isMusicPlay = BattleMusicControl.playBattleMusic(this._battleTable, true);
				this._battleTable.setMusicPlayFlag(isMusicPlay);
				this._battleTable.setBattleStartFlag(true);
			}
		}
	}
}
);

var TransitionEndFlowEntry = defineObject(BaseFlowEntry,
{
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._battleTable.getEndBattleTransition().moveBattleTransition() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._battleTable.getEndBattleTransition().drawBattleTransition();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._battleTable = battleTable;
		this._battleTable.getEndBattleTransition().setupBattleTransition();
		
		return EnterResult.OK;
	}
}
);

// 待機モーションがループ処理(または最終フレーム)に入るまで、
// 次のFlowEntry(戦闘時ユニットイベント)を実行しない。
// これにより、剣を構えてから会話が始まるなどの演出が可能になる。
var WatchLoopFlowEntry = defineObject(BaseFlowEntry,
{
	_battleTable: null,
	_battlerRight: null,
	_battlerLeft: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._battlerRight.isLoopZone() && this._battlerLeft.isLoopZone()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		var battleObject = battleTable.getBattleObject();
		
		this._battleTable = battleTable;
		this._battlerRight = battleObject.getBattler(true);
		this._battlerLeft = battleObject.getBattler(false);
	},
	
	_completeMemberData: function(battleTable) {
		return EnterResult.OK;
	}
}
);

var RealStartFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveStartFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawStartFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		this._attackFlow.startAttackFlow();
		
		return EnterResult.OK;
	}
}
);

var RealEndFlowEntry = defineObject(BaseFlowEntry,
{
	_attackFlow: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._attackFlow.moveEndFlow() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		this._attackFlow.drawEndFlow();
	},
	
	_prepareMemberData: function(battleTable) {
	},
	
	_completeMemberData: function(battleTable) {
		this._attackFlow = battleTable.getBattleObject().getAttackFlow();
		
		return EnterResult.OK;
	}
}
);

var RealDiagnosticStateFlowEntry = defineObject(BaseFlowEntry,
{
	_index: 0,
	_effect: null,
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._effect.isEffectLast()) {
			if (!this._checkNextState()) {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		this._index = 0;
		this._effect = null;
		this._battleTable = battleTable;
	},
	
	_completeMemberData: function(battleTable) {
		return this._checkNextState() ? EnterResult.OK : EnterResult.NOTENTER;
	},
	
	_checkNextState: function() {
		var anime;
		var battleObject = this._battleTable.getBattleObject();
		var stateArray = battleObject.getAttackOrder().getPassiveStateArray();
		
		if (this._index >= stateArray.length) {
			return false;
		}
		
		anime = stateArray[this._index].getRealAnime();
		if (anime === null) {
			return false;
		}
		
		this._effect = this._createRealStateEffect(battleObject, anime);
		
		this._index++;
		
		return this._effect !== null;
	},
	
	_createRealStateEffect: function(battleObject, anime) {
		var isRight;
		var battlerPassive = battleObject.getPassiveBattler();
		var pos = battlerPassive.getEffectPos(anime);
		var offsetPos = EnemyOffsetControl.getOffsetPos(battlerPassive);
		
		if (root.getAnimePreference().isEffectDefaultStyle()) {
			isRight = battleObject.getActiveBattler() === battleObject.getBattler(true);
		}
		else {
			isRight = battleObject.getPassiveBattler() === battleObject.getBattler(true);
		}
		
		return battleObject.createEffect(anime, pos.x + offsetPos.x, pos.y + offsetPos.y, isRight, false);
	}
}
);

var RealInterruptSkillFlowEntry = defineObject(BaseFlowEntry,
{
	_skillProjector: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		return this._skillProjector.moveProjector();
	},
	
	drawFlowEntry: function() {
		this._skillProjector.drawProjector();
	},
	
	_prepareMemberData: function(battleTable) {
		this._skillProjector = createObject(SkillProjector);
	},
	
	_completeMemberData: function(battleTable) {
		var battleObject = battleTable.getBattleObject();
		var activeSkillArray = battleObject.getAttackOrder().getActiveSkillArray();
		var passiveSkillArray = battleObject.getAttackOrder().getPassiveSkillArray();
		
		this._skillProjector.setupProjector(BattleType.REAL, battleObject);
		
		if (battleObject.getBattler(true).getUnit() === battleObject.getAttackOrder().getActiveUnit()) {
			if (activeSkillArray.length > 0 || passiveSkillArray.length > 0) {
				this._skillProjector.startProjector(activeSkillArray, passiveSkillArray, true);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		else {
			if (passiveSkillArray.length > 0 || activeSkillArray.length > 0) {
				this._skillProjector.startProjector(passiveSkillArray, activeSkillArray, false);
			}
			else {
				return EnterResult.NOTENTER;
			}
		}
		
		return EnterResult.OK;
	}
}
);

var BaseCutinFlowEntry = defineObject(BaseFlowEntry,
{
	_index: 0,
	_effect: null,
	_battleTable: null,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._effect.isEffectLast()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		this._index = 0;
		this._effect = null;
		this._battleTable = battleTable;
	},
	
	_completeMemberData: function(battleTable) {
		var anime = this._getCutinAnime(battleTable);
		
		this._effect = this._createCutin(anime);
		
		return this._effect !== null ? EnterResult.OK : EnterResult.NOTENTER;
	},
	
	_createCutin: function(anime) {
		var pos;
		var battleObject = this._battleTable.getBattleObject();
		var battler = battleObject.getActiveBattler();
		var isRight = battler === battleObject.getBattler(true);
		
		if (anime === null || !this._isCutinAllowed()) {
			return null;
		}
		
		if (root.getAnimePreference().isCutinCentering()) {
			pos = this._getCenterPos(anime);
		}
		else {
			pos = this._getBattlerPos(anime);
		}
		
		pos.x += root.getAnimePreference().getCutinOffsetX();
		pos.y += root.getAnimePreference().getCutinOffsetY();
		
		return battleObject.createEffect(anime, pos.x, pos.y, isRight, false);
	},
	
	_getCenterPos: function(anime) {
		var battleObject = this._battleTable.getBattleObject();
		var area = battleObject.getBattleArea();
		var size = Miscellaneous.getFirstKeySpriteSize(anime, 0);
		var x = Math.floor(area.width / 2) - Math.floor(size.width / 2);
		var y = Math.floor(area.height / 2) - Math.floor(size.height / 2);
		var pos = createPos(x, y);
		
		pos.x += battleObject.getAutoScroll().getScrollX();
		
		return pos;
	},
	
	_getBattlerPos: function(anime) {
		var battler;
		var battleObject = this._battleTable.getBattleObject();
		
		if (this._isActiveBattler()) {
			battler = battleObject.getActiveBattler();
		}
		else {
			battler = battleObject.getPassiveBattler();
		}
		
		return battler.getEffectPos(anime);
	},
	
	_isCutinAllowed: function() {
		// コンフィグにカットインオフが入る可能性
		return true;
	},
	
	_getCutinAnime: function() {
		return null;
	},
	
	_isActiveBattler: function() {
		return true;
	}
}
);

var RealWeaponCutinFlowEntry = defineObject(BaseCutinFlowEntry,
{
	_getCutinAnime: function(battleTable) {
		var order = battleTable.getBattleObject().getAttackOrder();
		var unit = order.getActiveUnit();
		
		if (order.isCurrentFirstAttack()) {
			// 装備武器の「武器エフェクト」において、「初回攻撃カットイン」が設定されているか調べる
			return WeaponEffectControl.getAnime(unit, WeaponEffectAnime.FIRSTATTACK);
		}
		
		return null;
	}
}
);

var RealSkillCutinFlowEntry = defineObject(BaseCutinFlowEntry,
{
	_index: 0,
	_arr: null,
	_battleTable: null,
	_isPassiveCheck: false,
	
	enterFlowEntry: function(battleTable) {
		this._prepareMemberData(battleTable);
		return this._completeMemberData(battleTable);
	},
	
	moveFlowEntry: function() {
		if (this._arr[this._index].isEffectLast()) {
			this._index++;
			if (this._index === this._arr.length) {
				return this._checkNextSkill();
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
	},
	
	_prepareMemberData: function(battleTable) {
		this._index = 0;
		this._arr = [];
		this._battleTable = battleTable;
	},
	
	_completeMemberData: function(battleTable) {
		this._checkActiveSkill();
		if (this._arr.length === 0) {
			this._checkPassiveSkill();
		}
		
		return this._arr.length > 0 ? EnterResult.OK : EnterResult.NOTENTER;
	},
	
	_checkActiveSkill: function() {
		var order = this._battleTable.getBattleObject().getAttackOrder();
		var unit = order.getActiveUnit();
		var arr = order.getActiveSkillArray();
		var type = order.getActiveMotionActionType();
		var attackTemplateType = BattlerChecker.findAttackTemplateTypeFromUnit(unit);
		
		this._checkSkill(unit, arr, type, attackTemplateType);
	},
	
	_checkPassiveSkill: function() {
		var order = this._battleTable.getBattleObject().getAttackOrder();
		var unit = order.getPassiveUnit();
		var arr = order.getPassiveSkillArray();
		var type = order.getPassiveMotionActionType();
		var attackTemplateType = BattlerChecker.findAttackTemplateTypeFromUnit(unit);
		
		this._isPassiveCheck = true;
		this._checkSkill(unit, arr, type, attackTemplateType);
	},
	
	_checkSkill: function(unit, arr, type, attackTemplateType) {
		var i, skill, anime, effect;
		var count = arr.length;
		
		this._arr = [];
		this._index = 0;
		
		for (i = 0; i < count; i++) {
			skill = arr[i];
			anime = unit.getCutinAnimeFromSkill(attackTemplateType, type, skill);
			effect = this._createCutin(anime);
			if (effect !== null) {
				this._arr.push(effect);
			}
		}
	},
	
	_checkNextSkill: function() {
		if (this._isPassiveCheck) {
			return MoveResult.END;
		}
		
		this._checkPassiveSkill();
		
		return this._arr.length > 0 ? MoveResult.CONTINUE : MoveResult.END;
	},
	
	_isActiveBattler: function() {
		return !this._isPassiveCheck;
	}
}
);

var RealUnitCutinFlowEntry = defineObject(BaseCutinFlowEntry,
{
	_getCutinAnime: function(battleTable) {
		var order = battleTable.getBattleObject().getAttackOrder();
		var type = order.getActiveMotionActionType();
		var unit = order.getActiveUnit();
		var attackTemplateType = BattlerChecker.findAttackTemplateTypeFromUnit(unit);
		
		return unit.getCutinAnime(attackTemplateType, type);
	}
}
);

var BattleTransition = defineObject(BaseObject,
{
	_xTransition: 0,
	_xSrc: 0,
	
	setupBattleTransition: function() {
		this._xTransition = RealBattleArea.WIDTH;
		this._xSrc = 0 - this._getMargin();
	},
	
	moveBattleTransition: function() {
		this._xSrc += this._getScrollPixel();
		
		if (this._xSrc > 1280 + this._getMargin()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawBattleTransition: function() {
		root.getGraphicsManager().enableMapClipping(false);
		
		this._drawTransitionInternal();
		
		root.getGraphicsManager().enableMapClipping(true);
	},
	
	isSecondHalf: function() {
		return this._xSrc > 640;
	},
	
	_drawTransitionInternal: function() {
		var handle = root.queryGraphicsHandle('battletransition');
		var pic = GraphicsRenderer.getGraphics(handle, GraphicsType.PICTURE);
		var x = this._xSrc;
		
		if (pic !== null) {
			pic.drawStretchParts(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), x, 0, 640, 480);
		}
	},
	
	_getScrollPixel: function() {
		var d = this._getBasePixel();
	
		if (!DataConfig.isHighPerformance()) {
			d *= 2;
		}
		
		if (Miscellaneous.isGameAcceleration()) {
			d *= 2;
		}
		
		return d;
	},
	
	_getBasePixel: function() {
		return 40;
	},
	
	_getMargin: function() {
		return 360;
	}
}
);

var CloseBattleTransition = defineObject(BaseObject,
{
	_transition: null,
	
	setupBattleTransition: function() {
		this._transition = createObject(FadeTransition);
		this._transition.setFadeSpeed(8);
		this._transition.setDestOut();
	},
	
	moveBattleTransition: function() {
		if (this._transition.moveTransition() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawBattleTransition: function() {
		root.getGraphicsManager().enableMapClipping(false);
		
		this._transition.drawTransition();
		
		root.getGraphicsManager().enableMapClipping(true);
	}
}
);

var BattleMusicControl = {
	playBattleMusic: function(battleTable, isForce) {
		var handleActive;
		var data = this._getBattleMusicData(battleTable);
		var handle = data.handle;
		var isMusicPlay = false;
		
		if (handle.isNullHandle()) {
			isMusicPlay = false;
		}
		else {
			handleActive = root.getMediaManager().getActiveMusicHandle();
			if (handle.isEqualHandle(handleActive)) {
				// 再生しようとしたBGMが既に再生されているから再生しない
				isMusicPlay = false;
			}
			else {
				if (data.isNew) {
					MediaControl.resetMusicList();
					MediaControl.musicPlayNew(handle);
					this._restorePreviousMusicTime(handle);
					this._arrangeMapMusic(handle);
				}
				else if (isForce) {
					MediaControl.musicPlay(handle);
					this._restorePreviousMusicTime(handle);
					isMusicPlay = true;
				}
			}
		}
		
		return isMusicPlay;
	},
	
	_getBattleMusicData: function(battleTable) {
		var handle;
		var battleObject = battleTable.getBattleObject();
		var attackInfo = battleObject.getAttackInfo();
		var unitSrc = attackInfo.unitSrc;
		var unitDest = attackInfo.unitDest;
		var handleUnitSrc = unitSrc.getBattleMusicHandle();
		var handleUnitDest = unitDest.getBattleMusicHandle();
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		var isNew = false;
		
		if (!handleUnitSrc.isNullHandle()) {
			handle = handleUnitSrc;
			isNew = unitSrc.isBattleMusicContinue();
		}
		else if (!handleUnitDest.isNullHandle()) {
			handle = handleUnitDest;
			isNew = unitDest.isBattleMusicContinue();
		}
		else {
			if (unitSrc.getUnitType() === UnitType.PLAYER) {
				// 攻撃をしかけたのが自軍ならば自軍用BGM
				handle = mapInfo.getPlayerBattleMusicHandle();
			}
			else if (unitSrc.getUnitType() === UnitType.ALLY) {
				handle = mapInfo.getAllyBattleMusicHandle();
			}
			else {
				handle = mapInfo.getEnemyBattleMusicHandle();
			}
		}
		
		return {
			handle: handle,
			isNew: isNew
		};
	},
	
	_arrangeMapMusic: function(handle) {
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		
		mapInfo.setPlayerTurnMusicHandle(handle);
		mapInfo.setEnemyTurnMusicHandle(handle);
		mapInfo.setAllyTurnMusicHandle(handle);
		
		mapInfo.setPlayerBattleMusicHandle(handle);
		mapInfo.setEnemyBattleMusicHandle(handle);
		mapInfo.setAllyBattleMusicHandle(handle);
	},
	
	_restorePreviousMusicTime: function() {
	}
};
