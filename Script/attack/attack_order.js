
// 戦闘の仕組において最も重要なのは、ユニットがどのような行動をするかが予め決まっているということである。
// つまり、攻撃を命中させるか、外れるかなどは、実際に戦闘中(RealBattleやEasyBattle)で計算しているのではなく、
// 戦闘に入る前の時点で既に計算され、データとして定義されている。
// それがAttackEntryであり、複数のAttackEntryを管理しているのがAttackOrderになる。
// 戦闘ではAttackFlowがAttackOrderからAttackEntryを順に取得することで、
// 戦闘が既に定義された通りに進むことになる。
// NormalAttackOrderBuilderの役割は、ユニットが戦闘でどのような行動をするべきかを計算し、
// それをAttackEntryとしてAttackOrderに登録することである。
// そして、全ての行動を定義したら、AttackOrderを呼び出し元に返す。
var NormalAttackOrderBuilder = defineObject(BaseObject,
{
	_attackInfo: null,
	_order: null,
	_evaluatorArray: null,
	
	createAttackOrder: function(attackInfo) {
		this._attackInfo = attackInfo;
		
		this._order = createObject(AttackOrder);
		this._order.resetAttackOrder();
		
		this._evaluatorArray = [];
		this._configureEvaluator(this._evaluatorArray);
		
		// 戦闘をシミュレーションする
		this._startVirtualAttack();
		
		return this._order;
	},
	
	isDirectAttack: function() {
		// ユニット同士が隣接していればtrue(直接攻撃)になる
		return this._attackInfo.isDirectAttack;
	},
	
	isMagicWeaponAttack: function(unit) {
		return this._attackInfo.checkMagicWeaponAttack(unit);
	},
	
	_startVirtualAttack: function() {
		var i, j, isFinal, attackCount, src, dest;
		var virtualActive, virtualPassive, isDefaultPriority;
		var unitSrc = this._attackInfo.unitSrc;
		var unitDest = this._attackInfo.unitDest;
			
		src = VirtualAttackControl.createVirtualAttackUnit(unitSrc, unitDest, true, this._attackInfo);
		dest = VirtualAttackControl.createVirtualAttackUnit(unitDest, unitSrc, false, this._attackInfo);
		
		src.isWeaponLimitless = DamageCalculator.isWeaponLimitless(unitSrc, unitDest, src.weapon);
		dest.isWeaponLimitless = DamageCalculator.isWeaponLimitless(unitDest, unitSrc, dest.weapon);
		
		isDefaultPriority = this._isDefaultPriority(src, dest);
		if (isDefaultPriority) {
			src.isInitiative = true;
		}
		else {
			dest.isInitiative = true;
		}
		
		for (i = 0;; i++) {
			// if文とelse文が交互に実行される。
			// これにより、こちらが攻撃をした後は、相手が攻撃のように順番が変わる。
			if ((i % 2) === 0) {
				if (isDefaultPriority) {
					virtualActive = src;
					virtualPassive = dest;
				}
				else {
					virtualActive = dest;
					virtualPassive = src;
				}
			}
			else {
				if (isDefaultPriority) {
					virtualActive = dest;
					virtualPassive = src;
				}
				else {
					virtualActive = src;
					virtualPassive = dest;
				}
			}
			
			// 行動回数は残っているか
			if (VirtualAttackControl.isRound(virtualActive)) {
				VirtualAttackControl.decreaseRoundCount(virtualActive);
				
				attackCount = this._getAttackCount(virtualActive, virtualPassive);
			
				// 2回連続で攻撃するようなこともあるため、ループ処理
				for (j = 0; j < attackCount; j++) {
					isFinal = this._setDamage(virtualActive, virtualPassive);
					if (isFinal) {
						// ユニットが死亡したから、これ以上戦闘を継続しない
						virtualActive.roundCount = 0;
						virtualPassive.roundCount = 0;
						break;
					}
				}
			}
			
			if (virtualActive.roundCount === 0 && virtualPassive.roundCount === 0) {
				break;
			}
		}
		
		this._endVirtualAttack(src, dest);
	},
	
	_endVirtualAttack: function(virtualActive, virtualPassive) {
		var exp = this._calculateExperience(virtualActive, virtualPassive);
		var waitIdSrc = MotionIdControl.getWaitId(virtualActive.unitSelf, virtualActive.weapon);
		var waitIdDest = MotionIdControl.getWaitId(virtualPassive.unitSelf, virtualPassive.weapon);
		
		this._order.registerExp(exp);
		this._order.registerBaseInfo(this._attackInfo, waitIdSrc, waitIdDest);
	},
	
	_isDefaultPriority: function(virtualActive, virtualPassive) {
		var active = virtualActive.unitSelf;
		var passive = virtualPassive.unitSelf;
		var skilltype = SkillType.FASTATTACK;
		var skill = SkillControl.getPossessionSkill(active, skilltype);
		
		if (SkillRandomizer.isSkillInvoked(active, passive, skill)) {
			// 攻撃をしかけた方が「先制攻撃」のスキルを持つ場合は、その時点で通常戦闘と判断する
			return true;
		}
		
		if (this._attackInfo.isCounterattack) {
			// 相手が反撃可能な場合は、「先制攻撃」のスキルを持つか調べる。
			// 攻撃をしかけた方が先制攻撃のスキルを持たず、逆に相手が持つ場合は、相手から攻撃が行われる。
			skill = SkillControl.getPossessionSkill(passive, skilltype);	
			if (SkillRandomizer.isSkillInvoked(passive, active, skill)) {
				// attackEntryがないから、現時点で追加処理はできない。
				// 後で追加できるように保存する。
				virtualPassive.skillFastAttack = skill;
				return false;
			}
		}
		
		return true;
	},
	
	_getAttackCount: function(virtualActive, virtualPassive) {
		var skill;
		var attackCount = virtualActive.attackCount;
		
		skill = SkillControl.getBattleSkill(virtualActive.unitSelf, virtualPassive.unitSelf, SkillType.CONTINUOUSATTACK);
		if (SkillRandomizer.isSkillInvoked(virtualActive.unitSelf, virtualPassive.unitSelf, skill)) {
			// 連続攻撃のスキルによって攻撃回数が倍になる
			attackCount *= skill.getSkillValue();
			
			// attackEntryがないから、現時点で追加処理はできない。
			// 後で追加できるように保存する。
			virtualActive.skillContinuousAttack = skill;
		}
		
		return attackCount;
	},
	
	_setDamage: function(virtualActive, virtualPassive) {
		var attackEntry;
		
		if (!this._isAttackContinue(virtualActive, virtualPassive)) {
			// 何らかの理由でユニットが攻撃を行えない場合は、falseを返す
			return false;
		}
		
		attackEntry = this._createAndRegisterAttackEntry(virtualActive, virtualPassive);
		
		if (!virtualActive.isWeaponLimitless) {
			// 耐久が無制限でないため減少させる
			this._decreaseWeaponLimit(virtualActive, virtualPassive, attackEntry);
		}
		
		return attackEntry.isFinish;
	},
	
	_isAttackContinue: function(virtualActive, virtualPassive) {
		// 武器が足りないなどで攻撃できない
		if (!VirtualAttackControl.isAttackContinue(virtualActive)) {
			return false;
		}
		
		if (this._isSealAttack(virtualActive, virtualPassive)) {
			if (!this._isSealAttackBreak(virtualActive, virtualPassive)) {
				return false;
			}
		}
		
		return true;
	},
	
	_decreaseWeaponLimit: function(virtualActive, virtualPassive, attackEntry) {
		var weaponType;
		var weapon = virtualActive.weapon;
		var isItemDecrement = false;
			
		if (weapon === null) {
			return;
		}
		
		weaponType = weapon.getWeaponType();
		
		if (weaponType.isHitDecrement()) {
			if (attackEntry.isHit) {
				// 命中したため減らす
				isItemDecrement = true;
			}
		}
		else {
			// 命中の有無を問わず減らす
			isItemDecrement = true;
		}
		
		if (isItemDecrement) {
			attackEntry.isItemDecrement = true;
			
			// 武器の使用回数をカウント
			virtualActive.weaponUseCount++;
		}
	},
	
	_createAndRegisterAttackEntry: function(virtualActive, virtualPassive) {
		var i, attackEntry;
		var count = this._evaluatorArray.length;
		
		// AttackEntryを作成する
		attackEntry = this._order.createAttackEntry();
		
		attackEntry.isSrc = virtualActive.isSrc;
		
		attackEntry.isFirstAttack = virtualActive.isFirstAttack;
		
		this._setInitialSkill(virtualActive, virtualPassive, attackEntry);
		
		// AttackEntryにどのような値を設定するかは、Evaluatorオブジェクトが決定する。
		// AttackEvaluator.AttackMotionは攻撃時のモーションを決定し、
		// AttackEvaluator.HitCriticalは攻撃が命中するかどうかを決定するという要領になる。
		for (i = 0; i < count; i++) {
			this._evaluatorArray[i].setParentOrderBuilder(this);
			this._evaluatorArray[i].evaluateAttackEntry(virtualActive, virtualPassive, attackEntry);
		}
		
		// AttackEntryをAttackOrderに登録する
		this._order.registerAttackEntry(attackEntry);
		
		virtualActive.isFirstAttack = false;
		
		return attackEntry;
	},
	
	_setInitialSkill: function(virtualActive, virtualPassive, attackEntry) {
		if (virtualActive.skillFastAttack !== null) {
			if (virtualActive.skillFastAttack.isSkillDisplayable()) {
				attackEntry.skillArrayActive.push(virtualActive.skillFastAttack);
			}
			virtualActive.skillFastAttack = null;
		}
		
		if (virtualActive.skillContinuousAttack !== null) {
			if (virtualActive.skillContinuousAttack.isSkillDisplayable()) {
				attackEntry.skillArrayActive.push(virtualActive.skillContinuousAttack);
			}
			virtualActive.skillContinuousAttack = null;
		}
	},
	
	_calculateExperience: function(virtualActive, virtualPassive) {
		var unitSrc = this._attackInfo.unitSrc;
		var unitDest = this._attackInfo.unitDest;
		var data = StructureBuilder.buildAttackExperience();
		
		if (this._isExperienceDisabled()) {
			return -1;
		}
		
		// 経験値を得るのは自軍であるため、UnitType.PLAYERの比較は必須。
		// 自軍はunitSrcのときもunitDestのときもある。
		
		if (unitSrc.getUnitType() === UnitType.PLAYER && virtualActive.hp > 0) {
			// 攻撃をしかけたのが自軍であり、さらに死亡していない場合の処理
			data.active = unitSrc;
			data.activeHp = virtualActive.hp;
			data.activeDamageTotal = virtualActive.damageTotal;
			data.passive = unitDest;
			data.passiveHp = virtualPassive.hp;
			data.passiveDamageTotal = virtualPassive.damageTotal;
		}
		else if (unitDest.getUnitType() === UnitType.PLAYER && virtualPassive.hp > 0) {
			// 攻撃を受けたのが自軍であり、さらに死亡していない場合の処理
			data.active = unitDest;
			data.activeHp = virtualPassive.hp;
			data.activeDamageTotal = virtualPassive.damageTotal;
			data.passive = unitSrc;
			data.passiveHp = virtualActive.hp;
			data.passiveDamageTotal = virtualActive.damageTotal;
		}
		else {
			// 経験値を得ることはない
			return -1; 
		}
		
		return ExperienceCalculator.calculateExperience(data);
	},
	
	_isExperienceDisabled: function() {
		var unitSrc = this._attackInfo.unitSrc;
		var unitDest = this._attackInfo.unitDest;
		
		// 同じ種類のユニットが戦闘した場合は、経験値は発生しないものとする
		if (unitSrc.getUnitType() === unitDest.getUnitType()) {
			return true;
		}
		
		if (!root.getCurrentSession().isMapState(MapStateType.GETEXPERIENCE)) {
			return true;
		}
		
		return FusionControl.isExperienceDisabled(unitSrc);
	},
	
	_isSealAttack: function(virtualActive, virtualPassive) {
		var weapon = virtualPassive.weapon;
		
		if (weapon !== null && weapon.getWeaponOption() === WeaponOption.SEALATTACK) {
			return true;
		}
		
		return SkillControl.getBattleSkillFromValue(virtualPassive.unitSelf, virtualActive.unitSelf, SkillType.BATTLERESTRICTION, BattleRestrictionValue.SEALATTACK) !== null;
	},
	
	_isSealAttackBreak: function(virtualActive, virtualPassive) {
		var weapon = virtualActive.weapon;
		
		if (weapon.getWeaponOption() === WeaponOption.SEALATTACKBREAK) {
			return true;
		}
		
		return SkillControl.getBattleSkillFromFlag(virtualActive.unitSelf, virtualPassive.unitSelf, SkillType.INVALID, InvalidFlag.SEALATTACKBREAK) !== null;
	},
	
	_configureEvaluator: function(groupArray) {
		groupArray.appendObject(AttackEvaluator.HitCritical);
		groupArray.appendObject(AttackEvaluator.ActiveAction);
		groupArray.appendObject(AttackEvaluator.PassiveAction);
		
		groupArray.appendObject(AttackEvaluator.TotalDamage);
		
		// AttackMotionとDamageMotionでリアル戦闘時に使用するモーションを決定する。
		// attackEntry.isCriticalとattackEntry.isFinishは既に初期化されている必要がある。
		groupArray.appendObject(AttackEvaluator.AttackMotion);
		groupArray.appendObject(AttackEvaluator.DamageMotion);
	}
}
);

var ForceAttackOrderBuilder = defineObject(NormalAttackOrderBuilder,
{
	_srcForceEntryCount: 0,
	_destForceEntryCount: 0,
	
	getForceEntryType: function(unit, isSrc) {
		var type;
		
		if (this._attackInfo.forceBattleObject === null) {
			return 0;
		}
		
		if (isSrc) {
			type = this._attackInfo.forceBattleObject.getSrcForceEntryType(this._srcForceEntryCount);
		}
		else {
			type = this._attackInfo.forceBattleObject.getDestForceEntryType(this._destForceEntryCount);
		}
		
		return type;
	},
	
	_setDamage: function(virtualActive, virtualPassive) {
		var result = NormalAttackOrderBuilder._setDamage.call(this, virtualActive, virtualPassive);
		
		// 強制戦闘では、カウントを上昇させる
		if (this._attackInfo.attackStartType === AttackStartType.FORCE) {
			this._increaseForceCount(virtualActive.isSrc);
		}
		
		return result;
	},
	
	_isExperienceDisabled: function() {
		// 経験値を考慮しない場合
		if (!this._attackInfo.isExperienceEnabled) { 
			return true;
		}
		
		return NormalAttackOrderBuilder._isExperienceDisabled.call(this);
	},
	
	_increaseForceCount: function(isSrc) {
		if (isSrc) {
			this._srcForceEntryCount++;
		}
		else {
			this._destForceEntryCount++;
		}
	},
	
	_configureEvaluator: function(groupArray) {
		groupArray.appendObject(AttackEvaluator.ForceHit);
		groupArray.appendObject(AttackEvaluator.ActiveAction);
		groupArray.appendObject(AttackEvaluator.PassiveAction);
		groupArray.appendObject(AttackEvaluator.TotalDamage);
		groupArray.appendObject(AttackEvaluator.AttackMotion);
		groupArray.appendObject(AttackEvaluator.DamageMotion);
	}
}
);

// ユニットがどのような戦闘を行うかを決めておくために、
// 戦闘を事前にシミュレーションすることになる。
// たとえば、ユニットAがユニットBに直接攻撃を行う場合、
// まずユニットAのAttackEntryがAttackOrderに追加される。
// そして、与えれるダメージの分だけユニットBのHPを減らし、
// ユニットAの武器も一回使用したものとしてカウントする。
// このような変動をユニットに対して行うのは戦闘中であるべきだから、
// AttackEntryを作成する時点では、VirtualAttackUnitという仮のオブジェクトを使用している。
var VirtualAttackControl = {
	createVirtualAttackUnit: function(unitSelf, targetUnit, isSrc, attackInfo) {
		var isAttack;
		var virtualAttackUnit = StructureBuilder.buildVirtualAttackUnit();
		
		virtualAttackUnit.unitSelf = unitSelf;
		virtualAttackUnit.hp = unitSelf.getHp();
		virtualAttackUnit.weapon = BattlerChecker.getRealBattleWeapon(unitSelf);
		virtualAttackUnit.isSrc = isSrc;
		virtualAttackUnit.isCounterattack = attackInfo.isCounterattack;
		virtualAttackUnit.stateArray = [];
		virtualAttackUnit.totalStatus = SupportCalculator.createTotalStatus(unitSelf);
		virtualAttackUnit.isFirstAttack = true;
		
		this._setStateArray(virtualAttackUnit);
		
		if (isSrc) {
			// 攻撃をしかけた側は、武器を装備していれば攻撃可能とみなす
			isAttack = virtualAttackUnit.weapon !== null;
		}
		else {
			// 攻撃を受けた側は、反撃可能かどうかを調べる
			isAttack = virtualAttackUnit.isCounterattack;	
		}
		
		this._calculateAttackAndRoundCount(virtualAttackUnit, isAttack, targetUnit);
		
		return virtualAttackUnit;
	},
	
	isRound: function(virtualAttackUnit) {
		return virtualAttackUnit.roundCount > 0;
	},
	
	decreaseRoundCount: function(virtualAttackUnit) {
		virtualAttackUnit.roundCount--;
	},
	
	isAttackContinue: function(virtualAttackUnit) {
		var i, count;
		var weapon = virtualAttackUnit.weapon;
		var result = false;
		
		count = virtualAttackUnit.stateArray.length;
		for (i = 0; i < count; i++) {
			if (this._isAttackStopState(virtualAttackUnit, virtualAttackUnit.stateArray[i])) {
				// 攻撃を禁止するステートが存在するため、falseを返すことで攻撃が続行しないようにする
				return false;
			}
		}		
		
		// 攻撃を続けてよいかを調べる。
		// 武器の使用回数がなくなる場合は、攻撃が続かないことがある。
		if (weapon !== null) {
			if (weapon.getLimitMax() === 0 || weapon.getLimit() === WeaponLimitValue.BROKEN) {
				// 耐久が0の場合、もしくは破損している場合は何度でも使用できる
				result = true;
			}
			else if (weapon.getLimit() - virtualAttackUnit.weaponUseCount > 0) {
				// this._weaponUseCountには、この戦闘で武器を使用した回数が記録されている。
				// これと武器の耐久を引いて0より大きい場合は、まだ武器を使用でき、攻撃可能といえる。
				result = true;
			}
		}
		
		return result;
	},
	
	_isAttackStopState: function(virtualAttackUnit, state) {
		var option, flag, weapon;
		
		if (state === null) {
			return false;
		}
		
		option = state.getBadStateOption();
		if (option === BadStateOption.NOACTION) {
			return true;
		}
		
		weapon = virtualAttackUnit.weapon;
		flag = state.getBadStateFlag();
		if (flag & BadStateFlag.PHYSICS) {
			if (weapon !== null && weapon.getWeaponCategoryType() !== WeaponCategoryType.MAGIC) {
				return true;
			}
		}
		
		if (flag & BadStateFlag.MAGIC) {
			if (weapon !== null && weapon.getWeaponCategoryType() === WeaponCategoryType.MAGIC) {
				return true;
			}
		}
		
		return false;
	},
	
	_setStateArray: function(virtualAttackUnit) {
		var i;
		var list = virtualAttackUnit.unitSelf.getTurnStateList();
		var count = list.getCount();
		
		// ユニットに設定されているステートを配列に設定
		for (i = 0; i < count; i++) {
			virtualAttackUnit.stateArray.push(list.getData(i).getState());
		}
	},
	
	_calculateAttackAndRoundCount: function(virtualAttackUnit, isAttack, targetUnit) {
		var weapon;
		
		if (isAttack) {
			weapon = virtualAttackUnit.weapon;
			
			// 1回のラウンドにおける攻撃回数を取得する。
			// 通常は1だがスキル次第では2が返り、連続で2回攻撃できる場合もある。
			virtualAttackUnit.attackCount = Calculator.calculateAttackCount(virtualAttackUnit.unitSelf, targetUnit, weapon);
			
			virtualAttackUnit.roundCount = Calculator.calculateRoundCount(virtualAttackUnit.unitSelf, targetUnit, weapon);
		}
		else {
			virtualAttackUnit.attackCount = 0;
			virtualAttackUnit.roundCount = 0;
		}
	}
};

var BaseAttackEvaluator = defineObject(BaseObject,
{
	_parentOrderBuilder: null,
	
	setParentOrderBuilder: function(parentOrderBuilder) {
		this._parentOrderBuilder = parentOrderBuilder;
	},
	
	evaluateAttackEntry: function(virtualActive, virtualPassive, attackEntry) {
	}
}
);

var AttackEvaluator = {};

AttackEvaluator.HitCritical = defineObject(BaseAttackEvaluator,
{
	_skill: null,
	
	evaluateAttackEntry: function(virtualActive, virtualPassive, attackEntry) {
		this._skill = SkillControl.checkAndPushSkill(virtualActive.unitSelf, virtualPassive.unitSelf, attackEntry, true, SkillType.TRUEHIT);
		
		// 攻撃が命中するかどうかを調べる
		attackEntry.isHit = this.isHit(virtualActive, virtualPassive, attackEntry);
		if (!attackEntry.isHit) {
			if (this._skill === null) {
				// 攻撃が命中せず、スキルも発動しないため続行しない
				return;
			}
			
			// スキルは発動しているため、攻撃は命中する
			attackEntry.isHit = true;
		}
		
		// クリティカルかどうか調べる
		attackEntry.isCritical = this.isCritical(virtualActive, virtualPassive, attackEntry);
		
		// 与えるダメージを計算する
		attackEntry.damagePassive = this.calculateDamage(virtualActive, virtualPassive, attackEntry);
		
		this._checkStateAttack(virtualActive, virtualPassive, attackEntry);
	},
	
	isHit: function(virtualActive, virtualPassive, attackEntry) {
		// 命中するかどうかは確率で計算
		return this.calculateHit(virtualActive, virtualPassive, attackEntry);
	},
	
	isCritical: function(virtualActive, virtualPassive, attackEntry) {
		var active = virtualActive.unitSelf;
		var passive = virtualPassive.unitSelf;
		
		if (!virtualActive.isInitiative && SkillControl.checkAndPushSkill(active, passive, attackEntry, true, SkillType.COUNTERATTACKCRITICAL) !== null) {
			// 反撃クリティカルによるクリティカル発動のためtrueを返す
			return true;
		}
		
		// クリティカルが出るかどうかは確率で計算
		return this.calculateCritical(virtualActive, virtualPassive, attackEntry);
	},
	
	calculateHit: function(virtualActive, virtualPassive, attackEntry) {
		var percent = HitCalculator.calculateHit(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, virtualActive.totalStatus, virtualPassive.totalStatus);
		
		return Probability.getProbability(percent);
	},
	
	calculateCritical: function(virtualActive, virtualPassive, attackEntry) {
		var percent = CriticalCalculator.calculateCritical(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, virtualActive.totalStatus, virtualPassive.totalStatus);
		
		return Probability.getProbability(percent);
	},
	
	calculateDamage: function(virtualActive, virtualPassive, attackEntry) {
		var trueHitValue = 0;
		
		if (this._skill !== null) {
			trueHitValue = this._skill.getSkillValue();
		}
		
		if (DamageCalculator.isHpMinimum(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, attackEntry.isCritical, trueHitValue)) {
			// 現在HP-1をダメージにすることで、攻撃が当たれば相手のHPは1になる
			return virtualPassive.hp - 1;
		}
		
		if (DamageCalculator.isFinish(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, attackEntry.isCritical, trueHitValue)) {
			return virtualPassive.hp;
		}
		
		return DamageCalculator.calculateDamage(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, attackEntry.isCritical, virtualActive.totalStatus, virtualPassive.totalStatus, trueHitValue);
	},
	
	_checkStateAttack: function(virtualActive, virtualPassive, attackEntry) {
		var i, count, skill, state;
		var arr = SkillControl.getDirectSkillArray(virtualActive.unitSelf, SkillType.STATEATTACK, '');
		
		// スキルの「ステート攻撃」を確認する
		count = arr.length;
		for (i = 0; i < count; i++) {
			skill = arr[i].skill;
			state = this._getState(skill);
			
			if (StateControl.isStateBlocked(virtualPassive.unitSelf, virtualActive.unitSelf, state)) {
				// ステートは無効化されるため発動しない
				continue;
			}
			
			if (!SkillRandomizer.isSkillInvoked(virtualActive.unitSelf, virtualPassive.unitSelf, skill)) {
				// スキルの発動率が成立しなかった
				continue;
			}
			
			// Active側はスキルが発動したからskillArrayActiveに追加
			if (skill.isSkillDisplayable()) {
				attackEntry.skillArrayActive.push(skill);
			}
			
			// Passive側はステートを受けるからstateArrayPassiveに追加
			attackEntry.stateArrayPassive.push(state);
			
			// 戦闘全体に渡ってステートを記録する
			virtualPassive.stateArray.push(state);
		}
		
		// 武器の「追加ステート」を確認する
		state = StateControl.checkStateInvocation(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon);
		if (state !== null) {
			attackEntry.stateArrayPassive.push(state);
			virtualPassive.stateArray.push(state);
		}
	},
	
	_getState: function(skill) {
		var id = skill.getSkillValue();
		var list = root.getBaseData().getStateList();
		
		return list.getDataFromId(id);
	}
}
);

AttackEvaluator.ForceHit = defineObject(AttackEvaluator.HitCritical,
{
	isHit: function(virtualActive, virtualPassive, attackEntry) {
		var tpye = this._parentOrderBuilder.getForceEntryType(virtualActive.unitSelf, virtualActive.isSrc);
		
		if (tpye === ForceEntryType.HIT || tpye === ForceEntryType.CRITICAL) {
			// 命中すべきであるためtrueを返す
			return true;
		}
		else if (tpye === ForceEntryType.MISS) {
			return false;
		}
		else {
			// エントリがなくなった場合は、既定値を参照する
			return AttackEvaluator.HitCritical.isHit(virtualActive, virtualPassive, attackEntry);
		}
	},
	
	isCritical: function(virtualActive, virtualPassive, attackEntry) {
		var tpye = this._parentOrderBuilder.getForceEntryType(virtualActive.unitSelf, virtualActive.isSrc);
		
		if (tpye === ForceEntryType.CRITICAL) {
			// クリティカルを出すべきであるため、trueを返す
			return true;
		}
		else if (tpye === ForceEntryType.HIT || tpye === ForceEntryType.MISS) {
			return false;
		}
		else {
			return AttackEvaluator.HitCritical.isCritical(virtualActive, virtualPassive, attackEntry);
		}
	}
}
);

AttackEvaluator.ActiveAction = defineObject(BaseAttackEvaluator,
{
	evaluateAttackEntry: function(virtualActive, virtualPassive, attackEntry) {
		if (!attackEntry.isHit) {
			return;
		}
		
		attackEntry.damagePassiveFull = attackEntry.damagePassive;
		
		// 攻撃を受ける側のダメージの最終調整を行う
		attackEntry.damagePassive = this._arrangePassiveDamage(virtualActive, virtualPassive, attackEntry);
		
		// 攻撃をする側のダメージの最終調整を行う。
		// 通常、攻撃をする側にダメージが生じることはないため、damageActiveは原則0になる。
		// ダメージがマイナスである場合は、回復とみなされる。
		attackEntry.damageActive = this._arrangeActiveDamage(virtualActive, virtualPassive, attackEntry);
	},
	
	_arrangePassiveDamage: function(virtualActive, virtualPassive, attackEntry) {
		var damagePassive = attackEntry.damagePassive;
		var value = this._getDamageGuardValue(virtualActive, virtualPassive, attackEntry);
		
		if (value !== -1) {
			value = 100 - value;
			damagePassive = Math.floor(damagePassive * (value / 100));
		}
		
		// 相手がダメージを受けて、HPが0以下になる場合
		if (virtualPassive.hp - damagePassive < 0) {
			// _showDamagePopupでは、getPassiveFullDamageが呼ばれるため、初期化しておく
			attackEntry.damagePassiveFull = damagePassive;
			
			// 与えるダメージは相手のHPとする。
			// たとえば、相手のHPが3でダメージが5の場合、ダメージは3となる。
			damagePassive = virtualPassive.hp;
		}
		else {
			attackEntry.damagePassiveFull = damagePassive;
		}
		
		return damagePassive;
	},
	
	_arrangeActiveDamage: function(virtualActive, virtualPassive, attackEntry) {
		var max;
		var active = virtualActive.unitSelf;
		var damageActive = attackEntry.damageActive;
		var damagePassive = attackEntry.damagePassive;
		var absorptionPercent = this._isAbsorption(virtualActive, virtualPassive, attackEntry);
		
		if (absorptionPercent > 0) {
			max = ParamBonus.getMhp(active);
			
			damageActive = Math.floor(damagePassive * (absorptionPercent / 100));
			
			if (virtualActive.hp + damageActive > max) {
				damageActive = max - virtualActive.hp;
			}
			
			// ダメージをマイナスにすると、回復の意味になる
			damageActive *= -1;
		}
		else {
			damageActive = 0;
		}
		
		return damageActive;
	},
	
	// true/false以外を返すが、互換性のため、この名前にしている
	_isAbsorption: function(virtualActive, virtualPassive, attackEntry) {
		var weaponAbsorptionPercent = 0;
		var skillAbsorptionPercent = 0;
		var active = virtualActive.unitSelf;
		var passive = virtualPassive.unitSelf;
		var weapon = virtualActive.weapon;
		var skill = SkillControl.checkAndPushSkill(active, passive, attackEntry, true, SkillType.DAMAGEABSORPTION);
		
		if (skill !== null) {
			skillAbsorptionPercent = skill.getSkillValue();
		}
		
		weaponAbsorptionPercent = this._getWeaponAbsorptionPercent(weapon);
		
		// 「ダメージ吸収」は、「スキル」と「武器オプション」の2種類がある。
		// 大きいパーセントを使用しているが、両者を加算してパーセントを上昇するという方法もあるかもしれない。
		return Math.max(weaponAbsorptionPercent, skillAbsorptionPercent);
	},
	
	_getWeaponAbsorptionPercent: function(weapon) {
		var weaponAbsorptionPercent = 0;
		
		if (weapon !== null && weapon.getWeaponOption() === WeaponOption.HPABSORB) {
			// 「武器オプション」の「ダメージ吸収」は、既定では常に100%
			weaponAbsorptionPercent = 100;
		}
		
		return weaponAbsorptionPercent;
	},
	
	_getDamageGuardValue: function(virtualActive, virtualPassive, attackEntry) {
		var i, count, skill, flag;
		var value = -1;
		var arr = SkillControl.getDirectSkillArray(virtualPassive.unitSelf, SkillType.DAMAGEGUARD, '');
		
		count = arr.length;
		for (i = 0; i < count; i++) {
			skill = arr[i].skill;
			flag = skill.getSkillValue();
			
			// ガードできる武器であるか調べる
			if (!ItemControl.isWeaponTypeAllowed(skill.getDataReferenceList(), virtualActive.weapon)) {
				continue;
			}
			
			if (!SkillRandomizer.isSkillInvoked(virtualPassive.unitSelf, virtualActive.unitSelf, skill)) {
				// スキルの発動率が成立しなかった
				continue;
			}
			
			if (skill.isSkillDisplayable()) {
				attackEntry.skillArrayPassive.push(skill);
			}
			
			value = skill.getSkillValue();
			
			break;
		}
		
		return value;
	}
}
);

AttackEvaluator.PassiveAction = defineObject(BaseAttackEvaluator,
{
	evaluateAttackEntry: function(virtualActive, virtualPassive, attackEntry) {
		var value;
		
		if (!attackEntry.isHit) {
			return;
		}
		
		// ダメージを受けても死亡しない場合は続行しない
		if (virtualPassive.hp - attackEntry.damagePassive > 0) {
			return;
		}
		
		value = this._getSurvivalValue(virtualActive, virtualPassive, attackEntry);
		if (value === -1) {
			return;
		}
		
		if (value === SurvivalValue.SURVIVAL) {
			// ダメージを1つ減らすことでHP1で生き残るようにする
			attackEntry.damagePassive--;
			attackEntry.damagePassiveFull = attackEntry.damagePassive;
			
			if (attackEntry.damageActive < 0) {
				// 吸収による回復が生じているため、1つ増やす(回復量が1つ減る)
				attackEntry.damageActive++;
			}
		}
		else if (value === SurvivalValue.AVOID) {
			// 相手は不死身であり、死亡させるわけにはいかないため、これまでの設定を無効にする
			attackEntry.isHit = false;
			attackEntry.isCritical = false;
			attackEntry.damagePassive = 0;
			attackEntry.damageActive = 0;
			attackEntry.damagePassiveFull = 0;
		}
	},
	
	_getSurvivalValue: function(virtualActive, virtualPassive, attackEntry) {
		var skill;
		var active = virtualActive.unitSelf;
		var passive = virtualPassive.unitSelf;
		
		if (passive.isImmortal()) {
			return SurvivalValue.AVOID;
		}
		
		skill = SkillControl.checkAndPushSkill(passive, active, attackEntry, false, SkillType.SURVIVAL);
		if (skill !== null) {
			return skill.getSkillValue();
		}
		
		return -1;
	}
}
);

AttackEvaluator.TotalDamage = defineObject(BaseAttackEvaluator,
{
	evaluateAttackEntry: function(virtualActive, virtualPassive, attackEntry) {
		virtualActive.hp -= attackEntry.damageActive;
		virtualPassive.hp -= attackEntry.damagePassive;
		virtualActive.damageTotal += attackEntry.damageActive;
		virtualPassive.damageTotal += attackEntry.damagePassive;
		
		attackEntry.isFinish = this._isAttackFinish(virtualActive, virtualPassive, attackEntry);
	},
	
	_isAttackFinish: function(virtualActive, virtualPassive, attackEntry) {
		// どちらかが倒れたら戦闘は終了する
		if (virtualPassive.hp <= 0 || virtualActive.hp <= 0) {
			// 倒れる場合は、ステートも発動しないようにする
			if (virtualPassive.hp <= 0) {
				attackEntry.stateArrayPassive = [];
			}
			
			if (virtualActive.hp <= 0) {
				attackEntry.stateArrayActive = [];
			}
			
			return true;
		}
		
		return false;
	}
}
);

AttackEvaluator.AttackMotion = defineObject(BaseAttackEvaluator,
{
	evaluateAttackEntry: function(virtualActive, virtualPassive, attackEntry) {
		var midData = this._getAttackMotionId(virtualActive, virtualPassive, attackEntry);
		
		// 攻撃のモーションIDを取得
		attackEntry.motionIdActive = midData.id;
		attackEntry.motionActionTypeActive = midData.type;
		
		attackEntry.moveIdActive = midData.idMoveOnly;
		attackEntry.moveActionTypeActive = midData.typeMoveOnly;
	},
	
	_getAttackMotionId: function(virtualActive, virtualPassive, attackEntry) {
		var midData = MotionIdControl.createMotionIdData(virtualActive, virtualPassive, attackEntry, virtualActive.motionAttackCount);
		
		// 各種メソッド名は"get"になっているが、内部でmidDataにデータを設定する
		
		if (midData.attackTemplateType === AttackTemplateType.ARCHER) {
			MotionIdControl.getBowId(midData);
		}
		else if (midData.attackTemplateType === AttackTemplateType.MAGE) {
			MotionIdControl.getMagicId(midData);
		}
		else {
			if (this._parentOrderBuilder.isMagicWeaponAttack(midData.unit)) {
				// 魔法武器攻撃
				MotionIdControl.getMagicWeaponAttackId(midData);
			}
			else {
				if (this._parentOrderBuilder.isDirectAttack()) {
					if (virtualActive.isApproach) {
						// 直接攻撃
						MotionIdControl.getDirectAttackId(midData);
					}
					else {
						// 移動後攻撃
						MotionIdControl.getMoveAttackId(midData);
						MotionIdControl.getMoveId(midData);
						virtualActive.isApproach = true;
						virtualPassive.isApproach = true;
					}
				}
				else {
					// 間接攻撃
					MotionIdControl.getIndirectAttackId(midData);
				}
			}
		}
		
		virtualActive.motionAttackCount++;
		
		return midData;
	}
}
);

AttackEvaluator.DamageMotion = defineObject(BaseAttackEvaluator,
{
	evaluateAttackEntry: function(virtualActive, virtualPassive, attackEntry) {
		var midData;
		
		if (attackEntry.isHit) {
			// 攻撃は命中するから、相手を「ダメージ受け」モーションにするべくIDを取得
			midData = this._getDamageMotionId(virtualActive, virtualPassive, attackEntry);
		}
		else {
			// 攻撃は外れるから、相手を「回避」モーションにするべくIDを取得
			midData = this._getAvoidMotionId(virtualActive, virtualPassive, attackEntry);
		}
		
		attackEntry.motionIdPassive = midData.id;
		attackEntry.motionActionTypePassive = midData.type;
	},
	
	_getDamageMotionId: function(virtualActive, virtualPassive, attackEntry) {
		var midData = MotionIdControl.createMotionIdData(virtualPassive, virtualActive, attackEntry, virtualPassive.motionDamageCount);
		
		MotionIdControl.getDamageId(midData);
	
		virtualPassive.motionDamageCount++;
		
		return midData;
	},
	
	_getAvoidMotionId: function(virtualActive, virtualPassive, attackEntry) {
		var midData = MotionIdControl.createMotionIdData(virtualPassive, virtualActive, attackEntry, virtualPassive.motionAvoidCount);
		
		MotionIdControl.getAvoidId(midData);
		
		virtualPassive.motionAvoidCount++;
		
		return midData;
	}
}
);

var AttackOrder = defineObject(BaseObject,
{
	_attackEntryCount: 0,
	_attackEntryArray: null,
	_currentIndex: 0,
	_unitSrc: null,
	_unitDest: null,
	_waitIdSrc: 0,
	_waitIdDest: 0,
	_exp: 0,
	
	resetAttackOrder: function() {
		this._attackEntryCount = 0;
		this._attackEntryArray = [];
		this._currentIndex = 0;
	},
	
	registerBaseInfo: function(attackInfo, waitIdSrc, waitIdDest) {
		this._unitSrc = attackInfo.unitSrc;
		this._unitDest = attackInfo.unitDest;
		this._waitIdSrc = waitIdSrc;
		this._waitIdDest = waitIdDest;
	},
	
	registerExp: function(exp) {
		this._exp = exp;
	},
	
	createAttackEntry: function() {
		var attackEntry = StructureBuilder.buildAttackEntry();
		
		attackEntry.skillArrayActive = [];
		attackEntry.skillArrayPassive = [];
		attackEntry.stateArrayActive = [];
		attackEntry.stateArrayPassive = [];
		
		return attackEntry;
	},
	
	registerAttackEntry: function(attackEntry) {
		this._attackEntryArray[this._attackEntryCount++] = attackEntry;
	},
	
	prevOrder: function() {
		if (this._currentIndex - 1 === -1) {
			return false;
		}
		
		this._currentIndex--;
		
		return true;
	},
	
	nextOrder: function() {
		if (!this.isNextOrder()) {
			return false;
		}
		
		this._currentIndex++;
		
		return true;
	},
	
	isNextOrder: function() {
		if (this._currentIndex === this._attackEntryArray.length) {
			return false;
		}
		
		return true;
	},
	
	getExp: function() {
		return this._exp;
	},
	
	getEntryCount: function() {
		return this._attackEntryCount;
	},
	
	getCurrentIndex: function() {
		return this._currentIndex;
	},
	
	setCurrentIndex: function(index) {
		this._currentIndex = index;
	},
	
	getCurrentEntry: function() {
		var attackEntry;
		
		// 既に最後までエントリがチェックされている場合は、便宜上最後のエントリを返すようにしている
		if (!this.isNextOrder()) {
			if (this._currentIndex === 0) {
				// 射程1の「攻撃封じ」の武器を持つ相手に、離れた場所から攻撃するなどした場合に発生する。
				// 両方とも攻撃がないため、ダミーのAttackEntryを作成する。
				attackEntry = this.createAttackEntry();
				attackEntry.isSrc = true;
				return attackEntry;
			}
			
			return this._attackEntryArray[this._currentIndex - 1];
		}
	
		return this._attackEntryArray[this._currentIndex];
	},
	
	getActiveUnit: function() {
		var unit;
		var attackEntry = this.getCurrentEntry();
		
		if (attackEntry.isSrc) {
			unit = this._unitSrc;
		}
		else {
			unit = this._unitDest;
		}
		
		return unit;
	},
	
	getPassiveUnit: function() {
		var unit;
		var attackEntry = this.getCurrentEntry();
		
		if (!attackEntry.isSrc) {
			unit = this._unitSrc;
		}
		else {
			unit = this._unitDest;
		}
		
		return unit;
	},
	
	isCurrentCritical: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.isCritical;
	},
	
	isCurrentHit: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.isHit;
	},
	
	isCurrentFinish: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.isFinish;
	},
	
	isCurrentFirstAttack: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.isFirstAttack;
	},
	
	isCurrentItemDecrement: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.isItemDecrement;
	},
	
	getActiveDamage: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.damageActive;
	},
	
	getPassiveDamage: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.damagePassive;
	},
	
	getPassiveFullDamage: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.damagePassiveFull;
	},
	
	getActiveSkillArray: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.skillArrayActive;
	},
	
	getPassiveSkillArray: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.skillArrayPassive;
	},
	
	getActiveStateArray: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.stateArrayActive;
	},
	
	getPassiveStateArray: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.stateArrayPassive;
	},
	
	getActiveMotionId : function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.motionIdActive;
	},
	
	getPassiveMotionId : function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.motionIdPassive;
	},
	
	getActiveMotionActionType: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.motionActionTypeActive;
	},
	
	getPassiveMotionActionType: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.motionActionTypePassive;
	},
	
	getMoveId: function() {
		var attackEntry = this.getCurrentEntry();
		return attackEntry.moveIdActive;
	},
	
	getWaitIdSrc: function() {
		return this._waitIdSrc;
	},
	
	getWaitIdDest: function() {
		return this._waitIdDest;
	}
}
);

// 通常はクラスに設定されているモーションIDを使用するが、
// 武器にモーションIDが設定されている場合はそれを優先する。
var MotionIdControl = {
	createEmptyMotionIdData: function() {
		var midData = {};
	
		midData.unit = null;
		midData.weapon = null;
		midData.cls = null;
		midData.attackTemplateType = 0;
		midData.isCritical = false;
		midData.isFinish = false;
		midData.count = 0;
		midData.id = MotionIdValue.NONE;
		midData.type = -1;
		midData.idMoveOnly = MotionIdValue.NONE;
		midData.typeMoveOnly = -1;
		
		return midData;
	},
	
	createMotionIdData: function(virtualActive, virtualPassive, attackEntry, count) {
		var midData = this.createEmptyMotionIdData();
		
		midData.unit = virtualActive.unitSelf;
		midData.weapon = virtualActive.weapon;
		midData.cls = BattlerChecker.getRealBattleClass(midData.unit, midData.weapon);
		midData.attackTemplateType = BattlerChecker.findAttackTemplateType(midData.cls, midData.weapon);
		midData.isCritical = attackEntry.isCritical;
		midData.isFinish = attackEntry.isFinish;
		midData.count = count;
		
		return midData;
	},
	
	getWaitId: function(unit, weapon) {
		var collection;
		var id = -1;
		var cls = BattlerChecker.getRealBattleClass(unit, weapon);
		var attackTemplateType = BattlerChecker.findAttackTemplateType(cls, weapon);
			
		if (weapon !== null) {
			collection = weapon.getMotionIdCollection();
			id = this._getWaitIdInternal(attackTemplateType, collection);
		}
		
		if (id === MotionIdValue.NONE) {
			collection = cls.getMotionIdCollection();
			id = this._getWaitIdInternal(attackTemplateType, collection);
		}
		
		return id;
	},
	
	getMoveId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getMoveIdInternal(collection, midData);
		}
		
		if (midData.idMoveOnly === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getMoveIdInternal(collection, midData);
		}
	},
	
	getMoveAttackId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getMoveAttackIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getMoveAttackIdInternal(collection, midData);
		}
	},
	
	getDirectAttackId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getDirectAttackIdIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getDirectAttackIdIdInternal(collection, midData);
		}
	},
	
	getIndirectAttackId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getIndirectAttackIdIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getIndirectAttackIdIdInternal(collection, midData);
		}
	},
	
	getMagicWeaponAttackId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getMagicWeaponAttackIdIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getMagicWeaponAttackIdIdInternal(collection, midData);
		}
	},
	
	getBowId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getBowIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getBowIdInternal(collection, midData);
		}
	},
	
	getMagicId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getMagicIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getMagicIdInternal(collection, midData);
		}
	},
	
	getAvoidId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getAvoidIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getAvoidIdInternal(collection, midData);
		}
	},
	
	getDamageId: function(midData) {
		var collection;
		
		if (midData.weapon !== null) {
			collection = midData.weapon.getMotionIdCollection();
			this._getDamageIdInternal(collection, midData);
		}
		
		if (midData.id === MotionIdValue.NONE) {
			collection = midData.cls.getMotionIdCollection();
			this._getDamageIdInternal(collection, midData);
		}
	},
	
	_getWaitIdInternal: function(attackTemplateType, collection) {
		var id = MotionIdValue.NONE;
		
		if (attackTemplateType === AttackTemplateType.FIGHTER) {
			id = collection.getFighterId(MotionFighter.WAIT);
		}
		else if (attackTemplateType === AttackTemplateType.ARCHER) {
			id = collection.getArcherId(MotionArcher.WAIT);
		}
		else if (attackTemplateType === AttackTemplateType.MAGE) {
			id = collection.getMageId(MotionMage.WAIT);
		}
		
		return id;
	},
	
	_getMoveIdInternal: function(collection, midData) {
		var type;
		
		if (midData.isCritical) {
			if (midData.isFinish) {
				type = MotionFighter.CRITICALFINISHMOVE;
			}
			else {
				type = MotionFighter.CRITICALMOVE;
			}
		}
		else {
			type = MotionFighter.MOVE;
		}
		
		midData.idMoveOnly = collection.getFighterId(type);
		midData.typeMoveOnly = type;
	},
	
	_getMoveAttackIdInternal: function(collection, midData) {
		var type;
		
		if (midData.isCritical) {
			if (midData.isFinish) {
				type = MotionFighter.CRITICALFINISHMOVEATTACK;
			}
			else {
				type = MotionFighter.CRITICALMOVEATTACK;
			}
		}
		else {
			type = MotionFighter.MOVEATTACK;
		}
		
		midData.id = collection.getFighterId(type);
		midData.type = type;
	},
	
	_getDirectAttackIdIdInternal: function(collection, midData) {
		var id, type;
		var count = midData.count;
		
		if (midData.isCritical && midData.isFinish) {
			type = MotionFighter.CRITICALFINISHATTACK;
			id = collection.getFighterId(type);
			if (id !== MotionIdValue.NONE) {
				// 「クリティカル直接とどめ」が設定されているからそれを使用する
				midData.id = id;
				midData.type = type;
				return;
			}
		}
		
		count %= 2;
		
		if (midData.isCritical) {
			if (count === 0) {
				type = MotionFighter.CRITICALATTACK1;
			}
			else {
				type = MotionFighter.CRITICALATTACK2;
			}
		}
		else {
			if (count === 0) {
				type = MotionFighter.ATTACK1;
			}
			else {
				type = MotionFighter.ATTACK2;
			}
		}
		
		midData.id = collection.getFighterId(type);
		midData.type = type;
	},
	
	_getIndirectAttackIdIdInternal: function(collection, midData) {
		var type;
		
		if (midData.isCritical) {
			type = MotionFighter.CRITICALINDIRECTATTACK;
		}
		else {
			type = MotionFighter.INDIRECTATTACK;
		}
		
		midData.id = collection.getFighterId(type);
		midData.type = type;
	},
	
	_getMagicWeaponAttackIdIdInternal: function(collection, midData) {
		var type;
		
		if (midData.isCritical) {
			type = MotionFighter.CRITICALMAGICATTACK;
		}
		else {
			type = MotionFighter.MAGICATTACK;
		}
		
		midData.id = collection.getFighterId(type);
		midData.type = type;
		
		if (type === MotionFighter.CRITICALMAGICATTACK && midData.id === MotionIdValue.NONE) {
			// 「クリティカル魔法武器攻撃」が設定されていない場合は、「魔法武器攻撃」を使用する
			midData.id = collection.getFighterId(MotionFighter.MAGICATTACK);
		}
	},
	
	_getBowIdInternal: function(collection, midData) {
		var type;
		var count = midData.count;
		
		count %= 2;
		
		if (midData.isCritical) {
			if (midData.isFinish) {
				type = MotionArcher.CRITICALFINISH;
			}
			else {
				type = MotionArcher.CRITICALBOW;
			}
		}
		else {
			if (count === 0) {
				type = MotionArcher.BOW;
			}
			else {
				type = MotionArcher.BOW2;
			}
		}
		
		midData.id = collection.getArcherId(type);
		midData.type = type;
	},
	
	_getMagicIdInternal: function(collection, midData) {
		var type;
		var count = midData.count;
		
		count %= 2;
		
		if (midData.isCritical) {
			if (midData.isFinish) {
				type = MotionMage.CRITICALFINISH;
			}
			else {
				type = MotionMage.CRITICALMAGIC;
			}
		}
		else {
			if (count === 0) {
				type = MotionMage.MAGIC;
			}
			else {
				type = MotionMage.MAGIC2;
			}
		}
		
		midData.id = collection.getMageId(type);
		midData.type = type;
	},
	
	_getAvoidIdInternal: function(collection, midData) {
		var id = 0;
		var type = 0;
		var count = midData.count;
		
		count %= 2;
		
		if (midData.attackTemplateType === AttackTemplateType.FIGHTER) {
			if (count === 0) {
				type = MotionFighter.AVOID1;
			}
			else {
				type = MotionFighter.AVOID2;
			}
			id = collection.getFighterId(type);
		}
		else if (midData.attackTemplateType === AttackTemplateType.ARCHER) {
			if (count === 0) {
				type = MotionArcher.AVOID1;
			}
			else {
				type = MotionArcher.AVOID2;
			}
			id = collection.getArcherId(type);
		}
		else if (midData.attackTemplateType === AttackTemplateType.MAGE) {
			if (count === 0) {
				type = MotionMage.AVOID1;
			}
			else {
				type = MotionMage.AVOID2;
			}
			id = collection.getMageId(type);
		}
		
		midData.id = id;
		midData.type = type;
	},
	
	_getDamageIdInternal: function(collection, midData) {
		var id = MotionIdValue.NONE;
		var type = -1;
		
		if (midData.attackTemplateType === AttackTemplateType.FIGHTER) {
			if (midData.isFinish) {
				type = MotionFighter.FINISHDAMAGE;
			}
			else {
				type = MotionFighter.DAMAGE;
			}
			id = collection.getFighterId(type);
		}
		else if (midData.attackTemplateType === AttackTemplateType.ARCHER) {
			if (midData.isFinish) {
				type = MotionArcher.FINISHDAMAGE;
			}
			else {
				type = MotionArcher.DAMAGE;
			}
			id = collection.getArcherId(type);
		}
		else if (midData.attackTemplateType === AttackTemplateType.MAGE) {
			if (midData.isFinish) {
				type = MotionMage.FINISHDAMAGE;
			}
			else {
				type = MotionMage.DAMAGE;
			}
			id = collection.getMageId(type);
		}
		
		midData.id = id;
		midData.type = type;
	}
};
