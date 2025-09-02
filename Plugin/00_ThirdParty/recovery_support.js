/*--------------------------------------------------------------------------
　ターン開始時に範囲回復、範囲ダメージができるようになるスクリプト ver 2.2
■作成者
キュウブ

■概要
スキル「支援」でターン開始時に範囲回復、範囲ダメージができるようになるスクリプトです。
例えば、
・毎ターンxマス以内にいる味方のHPを回復する
・毎ターンxマス以内にいる敵のHPを削る
といった使い方ができます。
敵勢力支援スクリプトrival_support.jsと組み合わせるとカスタマイズ性が広がります。

■使い方
スキル「支援」のカスタムパラメータで
・敵勢に効果をもたらしたい場合は"rival_support:true"を入れてください。無い場合は通常の支援と同じく自軍に効果が発生します。
・"self_support:true"と入れると"使用者のみ"以外の設定でも自身に効果を与える事が可能です。
・HPの回復量は"hp_recovery:{value: '<HPの回復量>'}"もしくは"hp_recovery:{rate: '<HP回復率 (%)>'}"で指定してください。
・ダメージを与えたい場合はvalueやrateを負の値にしてください。
・anime {runtime:<ランタイムならtrue/オリジナルならfalse>, id: <エフェクトID>}を入れる事で、回復時のエフェクトを変更する事もできます


例1.毎ターン味方のHPを8回復させたい場合
hp_recovery:{
  value: '8'
}

例2.毎ターン敵に5ダメージを与えるようにして、エフェクトを変えたい場合(エフェクトはランタイムの"冥府の波動"になる)
{
 rival_support:true,
 hp_recovery:{
    value: '-5',
    anime: {
      runtime: true,
      id: 15
    }
  }
}

例3.毎ターン味方に対して最大HPの50%回復させたい場合
hp_recovery:{
  rate: '50'
}

例4.自分も含めて味方に対して最大HPの50%回復させたい場合
{
 self_support:true,
 hp_recovery:{
  rate: '50'
 }
}

自軍・同盟軍の場合は敵軍に支援効果を、
敵軍の場合は自軍と同盟軍に支援効果を与えるようになります。

■更新履歴
ver 2.2 2017/09/11
・二人以上同時にスキルが発動した時のアニメの不具合を修正

ver 2.1 2017/04/19
・二人以上同時にスキルが発動したときの不具合を修正
・キャンセルボタンで高速処理を行った際にHPが回復しなくなる不具合を修正

ver 2.0 2017/03/16
・演出大幅に変更
・仕様変更(realrecoveryパラメータ削除)

ver 1.2 2016/11/03
・realrecoveryパラメータ追加
・スキル発動時の演出を変更(対象キャラからスキル名が出るようになりました)。

ver 1.1 2016/11/02
・スキルが発動している事をわかりやすくしました（最初にスキル持ちのユニットに注目演出が入ります）
・割合(カスパラのrate)でHPの回復量を指定できるようにしました。


■対応バージョン
SRPG Studio Version:1.122

■規約
・利用はSRPG Studioを使ったゲームに限ります。
・商用・非商用問いません。フリーです。
・加工等、問題ありません。
・クレジット明記無し　OK (明記する場合は"キュウブ"でお願いします)
・再配布、転載　OK (バグなどがあったら修正できる方はご自身で修正版を配布してもらっても構いません)
・wiki掲載　OK
・SRPG Studio利用規約は遵守してください。

--------------------------------------------------------------------------*/

(function() {

// デフォルトのRTPのエフェクトIDです
// カスパラで設定が無い場合はこのアニメが適用されます
var ENTIRE_RECOVERY_DEFAULT_ANIME_ID = 100;

var tempFunctions = {
	TurnChangeStart: {
		pushFlowEntries: TurnChangeStart.pushFlowEntries
	}
};

TurnChangeStart.pushFlowEntries = function(straightFlow) {

	tempFunctions.TurnChangeStart.pushFlowEntries.call(this, straightFlow);

	straightFlow.insertFlowEntry(EntireRecoveryFlowEntry,1);
};

var EntireRecoveryFlowEntry = defineObject(BaseFlowEntry,
{
	_entireHpRecovery: [],
	_invocationCount: 0,
	_index: 0,

	enterFlowEntry: function(turnChange) {
                this._prepareMemberData(turnChange);
                return this._completeMemberData(turnChange);
        },

	moveFlowEntry: function() {
		var result = this._entireHpRecovery[this._index].moveEventCommandCycle();

		if (result !== MoveResult.CONTINUE) {
			this._index++;
			if (this._index < this._invocationCount) {
				return MoveResult.CONTINUE;
			}
		}

		return result;
	},

	drawFlowEntry: function() {
		this._entireHpRecovery[this._index].drawEventCommandCycle();
	},

        _prepareMemberData: function(turnChange) {
		this._entireHpRecovery = [];
        },

	_completeMemberData: function(turnChange) {
		var unit, recoveryValue, unitType, supportSkillList, entireHpRecovery, skill;
		var isSkillInvocaiton = false;
		var isSkipMode = CurrentMap.isTurnSkipMode();
		var actorList = TurnControl.getActorList();
		var listArray = FilterControl.getListArray(UnitFilterFlag.PLAYER | UnitFilterFlag.ENEMY | UnitFilterFlag.ALLY);
		var recoveryUnits = [];

		for (var actorIndex = 0; actorIndex < actorList.getCount(); actorIndex++) {
			unit = actorList.getData(actorIndex);

			if (actorIndex === 0) {
				unitType = unit.getUnitType();
			}

			supportSkillList = SkillControl.getDirectSkillArray(unit, SkillType.SUPPORT, '');

			for (var skillIndex = 0; skillIndex < supportSkillList.length; skillIndex++) {
				recoveryUnits = [];
				isSkillInvocaiton = false;

				skill = supportSkillList[skillIndex].skill;//支援スキルの取得

				if (typeof skill.custom.hp_recovery !== 'object') {
					continue;
				}

				//条件を満たしていた場合は支援回復処理を開始する
				if (this._isTargetUnitType(skill, unitType, UnitType.PLAYER)) {
					isSkillInvocaiton |= this._collectHpRecoverySupportSkill(unit, listArray[0], recoveryUnits, isSkipMode, skill);
				}

				if (this._isTargetUnitType(skill, unitType, UnitType.ENEMY)) {
					isSkillInvocaiton |= this._collectHpRecoverySupportSkill(unit, listArray[1], recoveryUnits, isSkipMode, skill);
				}

				if (this._isTargetUnitType(skill, unitType, UnitType.ALLY)) {
					isSkillInvocaiton |= this._collectHpRecoverySupportSkill(unit, listArray[2], recoveryUnits, isSkipMode, skill);
				}

				isSkillInvocaiton |= this._checkHpRecoverySupportSkill(unit, null, true, recoveryUnits, isSkipMode, skill);

				if (isSkillInvocaiton) {
					this._entireHpRecovery.push(createObject(EntireHpRecovery));
					this._entireHpRecovery[this._invocationCount].enterEventCommandCycle(skill, unit, recoveryUnits);
					this._invocationCount += 1;
				}
			}
		}

		if (this._invocationCount === 0) {
			return EnterResult.NOTENTER;
		}

		return EnterResult.OK;
	},

	_isSupportable: function(unit, targetUnit, skill) {
		return SupportCalculator._isSupportable.call(this, unit, targetUnit, skill);
	},

	_checkHpRecoverySupportSkill: function(unit, targetUnit, isSelf, recoveryUnits, isSkipMode, skill) {
		var i, skill, isSet, indexArray;
		var isInvocation = false;
		var recoveryValue = 0;
		var arrayObject = {};

		isSet = false;

		if (isSelf) {
			if (skill.getRangeType() === SelectionRangeType.SELFONLY) {
				isSet = true;
				targetUnit = unit;
			}
		} else {
			if (skill.getRangeType() === SelectionRangeType.ALL) {
				// 「全域」の場合は、常に支援が有効
				isSet = true;
			} else if (skill.getRangeType() === SelectionRangeType.MULTI) {
				if (Math.abs(unit.getMapX() - targetUnit.getMapX()) + Math.abs(unit.getMapY() - targetUnit.getMapY()) <= skill.getRangeValue()) {
					isSet = true;
				} else {
					isSet = false;
				}
			}
		}

		if (isSet && this._isSupportable(unit, targetUnit, skill)) {

			recoveryValue = this._calculateRecoveryValue(targetUnit, skill);

			arrayObject = {
				unit: targetUnit,
				recoveryValue: recoveryValue
			};

			recoveryUnits.push(arrayObject);

			if (this._isChangeHp(targetUnit, recoveryValue)) {
				isInvocation = true;
			}
		
		}

		return isInvocation;
	},

	_calculateRecoveryValue: function(unit, skill) {
		var recoveryValue = 0;
		var Mhp = ParamBonus.getMhp(unit);

		if (skill.custom.hp_recovery.value) {
			recoveryValue = parseInt(skill.custom.hp_recovery.value);
		}

		if (skill.custom.hp_recovery.rate) {
			recoveryValue += Math.floor(ParamBonus.getMhp(unit) * parseInt(skill.custom.hp_recovery.rate) / 100);
		}

		return recoveryValue;
	},

	_isChangeHp: function(unit, recoveryValue) {
		var nowHp = unit.getHp();

		return !(nowHp === ParamBonus.getMhp(unit) & recoveryValue > 0)&!(nowHp === 1 & recoveryValue < 0)&recoveryValue !== 0;

	},

	_collectHpRecoverySupportSkill: function(unit, list, recoveryUnits, isSkipMode, skill) { 
		var targetUnit;
		var isInvocation = false;
		var isSelfSupport = false;

		if (typeof skill.custom.self_support === 'boolean') {
			isSelfSupport = skill.custom.self_support;
		}

		for (var index = 0; index < list.getCount(); index++) {
			targetUnit = list.getData(index);

			if (unit === targetUnit && !isSelfSupport) {
				continue;
			}

			isInvocation |= this._checkHpRecoverySupportSkill(unit, targetUnit, false, recoveryUnits, isSkipMode, skill);
		}

		return isInvocation;
	},

	_isTargetUnitType: function(skill, unitType, targetType) {
		var isRivalSkill = false;
		var isAllySkill = false;

		if (typeof skill.custom.rival_support === 'boolean') {
			isRivalSkill = skill.custom.rival_support;
		}

		if ((unitType === targetType && !isRivalSkill) || (unitType !== targetType && isRivalSkill && (unitType === UnitType.ENEMY || targetType === UnitType.ENEMY))) {
			return true;
		}

		// ★追加：同盟軍の場合にプレイヤーも対象にする
		if (typeof skill.custom.ally_support === 'boolean') {
			isAllySkill = skill.custom.ally_support;
		}

		if (isAllySkill && (unitType === UnitType.PLAYER && targetType === UnitType.ALLY) || (unitType === UnitType.ALLY && targetType === UnitType.PLAYER)) {
			return true;
		}

		return false;
	}
}
);


var EntireHpRecovery = defineObject(BaseEventCommand,
{
	_counter: 0,
	_skill: null,
	_unit: null,
	_recoveryUnits: null,
	_animationUnits: null,
	_maxFrame: 60,
	_dynamicAnimationEvent: null,
	_isEndRecoveryValue: false,
	_isEndDynamicEvent: false,
	_isStartDynamicEvent: false,

        enterEventCommandCycle: function(skill, unit, recoveryUnits) {
                this._prepareEventCommandMemberData(skill, unit, recoveryUnits);
                return this._completeEventCommandMemberData();
        },

	moveEventCommandCycle: function() {

		this._moveRecoveryValue();
		this._moveDynamicEvent();
		
		if (this._isEndRecoveryValue && this._isEndDynamicEvent) {
			return MoveResult.END;
		}

		return MoveResult.CONTINUE;
	},

	_moveRecoveryValue: function() {

		if (this._isEndRecoveryValue) {
			return;
		}

		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			this._isEndRecoveryValue = true;
		}
	},

	_moveDynamicEvent: function() {

		if (!this._isStartDynamicEvent) {
			this._execDynamicEvent();
		}

		if (this._isEndDynamicEvent) {
			return;
		}

		if (this._dynamicAnimationEvent.moveDynamicAnime() !== MoveResult.CONTINUE) {
			this._isEndDynamicEvent = true;
		}
	},

	drawEventCommandCycle: function() {

		if (!this._isEndDynamicEvent) {
			this._dynamicAnimationEvent.drawDynamicAnime();
		}

		this._drawRecoveryValue();
        },

	_execDynamicEvent: function() {
		var anime, posAnime;
		var generator = root.getEventGenerator();

		generator.locationFocus(this._unit.getMapX(), this._unit.getMapY(), true);
		generator.execute();

		anime = this._getEffectAnimation();
		posAnime = LayoutControl.getMapAnimationPos(LayoutControl.getPixelX(this._unit.getMapX()) ,  LayoutControl.getPixelY(this._unit.getMapY()), anime);
		this._dynamicAnimationEvent.startDynamicAnime(anime,  posAnime.x, posAnime.y);

		this._isStartDynamicEvent = true;
	},

	_drawRecoveryValue: function() {
		var position = this._getNumberPosition();
		var frame = this._counter.getCounter();
		var rate = frame / this._maxFrame;
		var setHp = 0;

		for (var index = 0; index < this._animationUnits.length; index++) {
			
			if (!this._isEndRecoveryValue && frame === 0) {
				this._animationUnits[index].beforeHp = this._animationUnits[index].unit.getHp();
root.log(this._animationUnits[index].unit.getName() + ' before HP: ' + this._animationUnits[index].beforeHp);
			}

			// 回復量の数値の描画(画面外の場合は描画処理は行わない)
			if (this._animationUnits[index].x >= 0 && this._animationUnits[index].y >= 0) {
				if (this._animationUnits[index].recoveryValue >= 0) {
					NumberRenderer.drawCenterNumberColorExtensionCube(this._animationUnits[index].x + position[0], this._animationUnits[index].y + position[1], this._animationUnits[index].recoveryValue, 2, 255);
				} else if (this._animationUnits[index].recoveryValue < 0) {
					NumberRenderer.drawCenterNumberColorExtensionCube(this._animationUnits[index].x + position[0], this._animationUnits[index].y + position[1], -1 * this._animationUnits[index].recoveryValue, 3, 255);
				}
			}

			if (!this._isEndRecoveryValue && rate <= 1) {
				setHp = this._animationUnits[index].beforeHp + this._animationUnits[index].recoveryValue * rate;

				if (setHp >= ParamBonus.getMhp(this._animationUnits[index].unit)) {
					this._animationUnits[index].unit.setHp(ParamBonus.getMhp(this._animationUnits[index].unit));
				} else if (setHp <= 0) {
					this._animationUnits[index].unit.setHp(1);
				} else {
					this._animationUnits[index].unit.setHp(setHp);
				}
			} 
		}
	},

	_prepareEventCommandMemberData: function(skill, unit, recoveryUnits) {
		this._counter = createObject(CycleCounter);
		this._dynamicAnimationEvent = createObject(DynamicAnime);
		this._skill = skill;
		this._unit = unit;
		this._recoveryUnits = recoveryUnits;
		this._animationUnits = [];
        },

	_completeEventCommandMemberData: function() {
		var generator = root.getEventGenerator();

		// 次の処理の都合上、ここでユニットの注目イベントを発生させる
		generator.locationFocus(this._unit.getMapX(), this._unit.getMapY(), true);
		generator.execute();


		for (var index = 0; index < this._recoveryUnits.length; index++) {

			var arrayObject = {
				unit: null,
				x: 0,
				y: 0,
				recoveryValue: 0,
				beforeHp: 0
			};

			arrayObject.unit = this._recoveryUnits[index].unit;
			arrayObject.x = LayoutControl.getPixelX(arrayObject.unit.getMapX());
			arrayObject.y = LayoutControl.getPixelY(arrayObject.unit.getMapY());
			arrayObject.recoveryValue = this._recoveryUnits[index].recoveryValue;
			
			this._animationUnits.push(arrayObject);
		}

		this._counter.setCounterInfo(this._maxFrame);
		this._counter.disableGameAcceleration();

		return EnterResult.OK;
	},

	_getEffectAnimation: function() {
		var anime = null;

		if (this._validateAnimeCustomParameter()) {
			anime = root.getBaseData().getEffectAnimationList(this._skill.custom.hp_recovery.anime.runtime).getDataFromId(parseInt(this._skill.custom.hp_recovery.anime.id));
		}

		if (!anime) {
			anime = root.getBaseData().getEffectAnimationList(true).getDataFromId(ENTIRE_RECOVERY_DEFAULT_ANIME_ID);
		}

		return anime;
	},

	_validateAnimeCustomParameter: function() {
		if (!('anime' in this._skill.custom.hp_recovery)) {
			return false;
		}

		if (!('runtime' in this._skill.custom.hp_recovery.anime) || !('id' in this._skill.custom.hp_recovery.anime)) {
			return false;
		}

		if (typeof this._skill.custom.hp_recovery.anime.runtime !== 'boolean' || typeof parseInt(this._skill.custom.hp_recovery.anime.id) !== 'number') {
			return false;
		}

		return true;
	},

	_getNumberPosition: function() {
		var frame = this._counter.getCounter();
		var position;

		if (frame <= 6) {
			position = [GraphicsFormat.MAPCHIP_WIDTH / 2, -3 * frame];
		} else if (frame <= 12) {
			position = [GraphicsFormat.MAPCHIP_WIDTH / 2, -18 + 3 * frame];
		} else {
			position = [GraphicsFormat.MAPCHIP_WIDTH / 2, 0];
		}
		return position;
	}
}
);

// 下手したら他のスクリプトと競合しそうなのでメソッド名を変な名前にしてます
NumberRenderer.drawCenterNumberColorExtensionCube = function(x, y, number, colorIndex, alpha) {
	var pic = root.queryUI('bignumber');
	var width = UIFormat.BIGNUMBER_WIDTH / 10;
	var height = UIFormat.BIGNUMBER_HEIGHT / 5;
	var ySrc = height * colorIndex;

	this._drawCenterNumberInternalExtensionCube(x, y, number, pic, ySrc, width, height, alpha);
};

// 下手したら他のスクリプトと競合しそうなのでメソッド名を変な名前にしてます
NumberRenderer._drawCenterNumberInternalExtensionCube = function(x, y, number, pic, ySrc, width, height, alpha) {
	var i, n;
	var dx = width / 2;
	var count = 0;
	var digitArray = [];

	if (pic === null || number < 0) {
		return;
	}

	if (number === 0) {
		pic.drawParts(x - dx, y, 0, ySrc, width, height);
		return;
	}

	while (number > 0) {
		n = Math.floor(number % 10);
		number = Math.floor(number / 10);
		digitArray[count] = n;
		count++;
	}

	dx += (count - 1) * width / 2;

	for (i = count - 1; i >= 0; i--) {
		pic.setAlpha(alpha);
		pic.drawParts(x - dx, y, digitArray[i] * width , ySrc, width, height);
		x += 12;
	}
};

})();