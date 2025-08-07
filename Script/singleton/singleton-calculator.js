
var AbilityCalculator = {
	getPower: function(unit, weapon) {
		var pow;
		
		if (Miscellaneous.isPhysicsBattle(weapon)) {
			// 物理攻撃または投射攻撃
			pow = RealBonus.getStr(unit);
		}
		else {
			// 魔法攻撃
			pow = RealBonus.getMag(unit);
		}
		
		// 武器の威力 + (力 or 魔力)
		return pow + weapon.getPow();
	},
	
	getHit: function(unit, weapon) {
		// 武器の命中率 + (技 * 3)
		return weapon.getHit() + (RealBonus.getSki(unit) * 3);
	},
	
	getAvoid: function(unit) {
		var avoid, terrain;
		var cls = unit.getClass();
		
		// 回避は、(速さ * 2)
		avoid = RealBonus.getSpd(unit) * 2;
		
		// クラスタイプが地形ボーナスを考慮する場合は、「地形効果」の回避率を加算する
		if (cls.getClassType().isTerrainBonusEnabled()) {
			terrain = PosChecker.getTerrainFromPos(unit.getMapX(), unit.getMapY());
			if (terrain !== null) {
				avoid += terrain.getAvoid();
			}
		}
		
		return avoid;
	},
	
	getCritical: function(unit, weapon) {
		// 技 + 武器のクリティカル率
		return RealBonus.getSki(unit) + weapon.getCritical();
	},
	
	getCriticalAvoid: function(unit) {
		// 幸運がクリティカル回避率
		return RealBonus.getLuk(unit);
	},
	
	getAgility: function(unit, weapon) {
		var agi, value, param;
		var spd = RealBonus.getSpd(unit);
		
		// 通常、敏捷は速さと同一
		agi = spd;
		
		// 武器が指定されてない場合、または重さを考慮しない場合は、敏捷は変わらない
		if (weapon === null || !DataConfig.isItemWeightDisplayable()) {
			return agi;
		}
		
		// 体格が有効な場合は体格で判定し、そうでない場合は力(魔力)で判定する
		if (DataConfig.isBuildDisplayable()) {
			param = ParamBonus.getBld(unit);
		}
		else {
			if (Miscellaneous.isPhysicsBattle(weapon)) {
				param = ParamBonus.getStr(unit);
			}
			else {
				param = ParamBonus.getMag(unit);
			}
		}
		
		value = weapon.getWeight() - param;
		if (value > 0) {
			// パラメータが重さより低い場合は、その差分だけ敏捷を下げる
			agi -= value;
		}
		
		return agi;
	}
};

var DamageCalculator = {
	calculateDamage: function(active, passive, weapon, isCritical, activeTotalStatus, passiveTotalStatus, trueHitValue) {
		var pow, def, damage;
		
		if (this.isHpMinimum(active, passive, weapon, isCritical, trueHitValue)) {
			return -1;
		}
		
		pow = this.calculateAttackPower(active, passive, weapon, isCritical, activeTotalStatus, trueHitValue);
		def = this.calculateDefense(active, passive, weapon, isCritical, passiveTotalStatus, trueHitValue);
		
		damage = pow - def;
		if (this.isHalveAttack(active, passive, weapon, isCritical, trueHitValue)) {
			if (!this.isHalveAttackBreak(active, passive, weapon, isCritical, trueHitValue)) {
				damage = Math.floor(damage / 2);
			}
		}
		
		if (this.isCritical(active, passive, weapon, isCritical, trueHitValue)) {
			damage = Math.floor(damage * this.getCriticalFactor());
		}
		
		return this.validValue(active, passive, weapon, damage);
	},
	
	calculateAttackPower: function(active, passive, weapon, isCritical, totalStatus, trueHitValue) {
		var pow = AbilityCalculator.getPower(active, weapon) + CompatibleCalculator.getPower(active, passive, weapon) + SupportCalculator.getPower(totalStatus);
		
		if (this.isEffective(active, passive, weapon, isCritical, trueHitValue)) {
			pow = Math.floor(pow * this.getEffectiveFactor());
		}
		
		return pow;
	},
	
	calculateDefense: function(active, passive, weapon, isCritical, totalStatus, trueHitValue) {
		var def;
		
		if (this.isNoGuard(active, passive, weapon, isCritical, trueHitValue)) {
			return 0;
		}
		
		if (Miscellaneous.isPhysicsBattle(weapon)) {
			// 物理攻撃または投射攻撃
			def = RealBonus.getDef(passive);
		}
		else {
			// 魔法攻撃
			def = RealBonus.getMdf(passive);
		}
		
		def += CompatibleCalculator.getDefense(passive, active, ItemControl.getEquippedWeapon(passive)) + SupportCalculator.getDefense(totalStatus);
		
		return def;
	},
	
	validValue: function(active, passive, weapon, damage) {
		if (damage < DefineControl.getMinDamage()) {
			damage = DefineControl.getMinDamage();
		}
		
		return damage;
	},
	
	isCritical: function(active, passive, weapon, isCritical, trueHitValue) {
		return isCritical;
	},
	
	isEffective: function(active, passive, weapon, isCritical, trueHitValue) {
		if (trueHitValue === TrueHitValue.EFFECTIVE) {
			return true;
		}
		
		// 相手が「特攻無効」スキルを持っているか調べる
		if (SkillControl.getBattleSkillFromFlag(passive, active, SkillType.INVALID, InvalidFlag.EFFECTIVE) === null) {
			// 相手のユニットに対して、アイテムが特攻であるか調べる
			if (ItemControl.isEffectiveData(passive, weapon)) {
				return true;
			}
		}
		
		return false;
	},
	
	isNoGuard: function(active, passive, weapon, isCritical, trueHitValue) {
		var option = weapon.getWeaponOption();
		
		return option === WeaponOption.NOGUARD || trueHitValue === TrueHitValue.NOGUARD;
	},
	
	isHpMinimum: function(active, passive, weapon, isCritical, trueHitValue) {
		var option = weapon.getWeaponOption();
		
		return option === WeaponOption.HPMINIMUM || trueHitValue === TrueHitValue.HPMINIMUM;
	},
	
	isFinish: function(active, passive, weapon, isCritical, trueHitValue) {
		return trueHitValue === TrueHitValue.FINISH;
	},
	
	isHalveAttack: function(active, passive, weapon, isCritical, trueHitValue) {
		var weaponPassive = ItemControl.getEquippedWeapon(passive);
		
		if (weaponPassive !== null && weaponPassive.getWeaponOption() === WeaponOption.HALVEATTACK) {
			return true;
		}
		
		return SkillControl.getBattleSkillFromValue(passive, active, SkillType.BATTLERESTRICTION, BattleRestrictionValue.HALVEATTACK) !== null;
	},
	
	isHalveAttackBreak: function(active, passive, weapon, isCritical, trueHitValue) {
		if (weapon.getWeaponOption() === WeaponOption.HALVEATTACKBREAK) {
			return true;
		}
		
		return SkillControl.getBattleSkillFromFlag(active, passive, SkillType.INVALID, InvalidFlag.HALVEATTACKBREAK) !== null;
	},
	
	isWeaponLimitless: function(active, passive, weapon) {
		var skill;
		
		if (weapon === null) {
			return false;
		}
		
		// ゲームオプションで「武器の耐久を無限にする」が設定されているか調べる
		if (DataConfig.isWeaponInfinity()) {
			return true;
		}
		
		// ユニットが「武器の使用回数が減らない」スキルを所持しているか調べる
		skill = SkillControl.getBattleSkill(active, passive, SkillType.NOWEAPONDECREMENT);
		if (skill === null) {
			return false;
		}
		
		return ItemControl.isWeaponTypeAllowed(skill.getDataReferenceList(), weapon);
	},
	
	getEffectiveFactor: function() {
		return DataConfig.getEffectiveFactor() / 100;
	},
	
	getCriticalFactor: function() {
		return DataConfig.getCriticalFactor() / 100;
	}
};

var HitCalculator = {
	calculateHit: function(active, passive, weapon, activeTotalStatus, passiveTotalStatus) {
		var hit, avoid, percent;
		
		if (root.isAbsoluteHit()) {
			if (passive.isImmortal()) {
				// 相手が不死身の場合は、命中率が100%にならない
				return 99;
			}
			return 100;
		}
		
		hit = this.calculateSingleHit(active, passive, weapon, activeTotalStatus);
		avoid = this.calculateAvoid(active, passive, weapon, passiveTotalStatus);
		
		percent = hit - avoid;
		
		return this.validValue(active, passive, weapon, percent);
	},
	
	calculateSingleHit: function(active, passive, weapon, totalStatus) {
		return AbilityCalculator.getHit(active, weapon) + CompatibleCalculator.getHit(active, passive, weapon) + SupportCalculator.getHit(totalStatus);
	},
	
	calculateAvoid: function(active, passive, weapon, totalStatus) {
		return AbilityCalculator.getAvoid(passive) + CompatibleCalculator.getAvoid(passive, active, ItemControl.getEquippedWeapon(passive)) + SupportCalculator.getAvoid(totalStatus);
	},
	
	validValue: function(active, passive, weapon, percent) {
		if (percent < DefineControl.getMinHitPercent()) {
			percent = DefineControl.getMinHitPercent();
		}
		else if (percent > DefineControl.getMaxHitPercent()) {
			percent = DefineControl.getMaxHitPercent();
		}
		
		if (percent === 100 && passive.isImmortal()) {
			percent = 99;
		}
		
		return percent;
	}
};

var CriticalCalculator = {
	calculateCritical: function(active, passive, weapon, activeTotalStatus, passiveTotalStatus) {
		var critical, avoid, percent;
		
		if (!this.isCritical(active, passive, weapon)) {
			return 0;
		}
		
		critical = this.calculateSingleCritical(active, passive, weapon, activeTotalStatus);
		avoid = this.calculateCriticalAvoid(active, passive, weapon, passiveTotalStatus);
		
		percent = critical - avoid;
		
		return this.validValue(active, passive, weapon, percent);
	},
	
	calculateSingleCritical: function(active, passive, weapon, totalStatus) {
		return AbilityCalculator.getCritical(active, weapon) + CompatibleCalculator.getCritical(active, passive, weapon) + SupportCalculator.getCritical(totalStatus);
	},
	
	calculateCriticalAvoid: function(active, passive, weapon, totalStatus) {
		return AbilityCalculator.getCriticalAvoid(passive) + CompatibleCalculator.getCriticalAvoid(passive, active, ItemControl.getEquippedWeapon(passive)) + SupportCalculator.getCriticalAvoid(totalStatus);
	},
	
	isCritical: function(active, passive, weapon, percent) {
		// 相手が「クリティカル無効」スキルを持っている場合は、クリティカルは発動しない
		if (SkillControl.getBattleSkillFromFlag(passive, active, SkillType.INVALID, InvalidFlag.CRITICAL) !== null) {
			return false;
		}
		
		return Miscellaneous.isCriticalAllowed(active, passive);
	},
	
	validValue: function(active, passive, weapon, percent) {
		if (percent < 0) {
			percent = 0;
		}
		else if (percent > 100) {
			percent = 100;
		}
		
		return percent;
	}
};

var Calculator = {
	calculateAttackCount: function(active, passive, weapon) {
		return weapon.getAttackCount();
	},
	
	calculateRoundCount: function(active, passive, weapon) {
		var activeAgi;
		var passiveAgi;
		var value;
		
		if (!this.isRoundAttackAllowed(active, passive)) {
			return 1;
		}
		
		activeAgi = AbilityCalculator.getAgility(active, weapon) + this.getAgilityPlus(active, passive, weapon);
		passiveAgi = AbilityCalculator.getAgility(passive, ItemControl.getEquippedWeapon(passive));
		value = this.getDifference();
		
		return (activeAgi - passiveAgi) >= value ? 2 : 1;
	},
	
	getAgilityPlus: function(active, passive, weapon) {
		return CompatibleCalculator.getAgility(active, passive, weapon);
	},
	
	getDifference: function(unit) {
		return DataConfig.getRoundDifference();
	},
	
	isRoundAttackAllowed: function(active, passive) {
		var option = root.getMetaSession().getDifficulty().getDifficultyOption();
		
		// 難易度オプションに「再攻撃」が含まれるか調べる。
		// 「再攻撃」スキルも所持していない場合は、falseを返す。
		if (!(option & DifficultyFlag.ROUNDATTACK) && SkillControl.getBattleSkill(active, passive, SkillType.ROUNDATTACK) === null) {
			return false;
		}
		
		return true;
	},
	
	isCounterattackAllowed: function(active, passive) {
		var option = root.getMetaSession().getDifficulty().getDifficultyOption();
		
		if (!(option & DifficultyFlag.COUNTERATTACK) && SkillControl.getBattleSkill(passive, active, SkillType.COUNTERATTACK) === null) {
			return false;
		}
		
		return true;
	},
	
	calculateRecoveryItemPlus: function(unit, targetUnit, item) {
		var plus = 0;
		var itemType = item.getItemType();
		
		if (itemType !== ItemType.RECOVERY && itemType !== ItemType.ENTIRERECOVERY) {
			return 0;
		}
		
		// アイテムが杖の場合は、使用者の魔力を加算する
		if (item.isWand()) {
			plus = ParamBonus.getMag(unit);
		}
		
		return plus;
	},
	
	calculateRecoveryValue: function(targetUnit, recoveryValue, recoveryType, plus) {
		var n = 0;
		var maxMhp = ParamBonus.getMhp(targetUnit);
		
		if (recoveryType === RecoveryType.SPECIFY) {
			n = recoveryValue + plus;
			if (n > maxMhp) {
				n = maxMhp;
			}
		}
		else if (recoveryType === RecoveryType.MAX) {
			n = maxMhp;
		}
		
		return n;
	},
	
	calculateDamageItemPlus: function(unit, targetUnit, item) {
		var damageInfo, damageType;
		var plus = 0;
		var itemType = item.getItemType();
		
		if (itemType === ItemType.DAMAGE) {
			damageInfo = item.getDamageInfo();
		}
		else {
			return 0;
		}
		
		damageType = damageInfo.getDamageType();
		if (item.isWand()) {
			if (damageType === DamageType.MAGIC) {
				plus = ParamBonus.getMag(unit);
			}
		}
		
		return plus;
	},
	
	calculateDamageValue: function(targetUnit, damageValue, damageType, plus) {
		var n, def;
		
		// DamageTypeによって、参照する守備力は異なる
		if (damageType === DamageType.FIXED) {
			def = 0;
		}
		else if (damageType === DamageType.PHYSICS) {
			def = RealBonus.getDef(targetUnit);
		}
		else {
			def = RealBonus.getMdf(targetUnit);
		}
		
		n = (damageValue + plus) - def;
		
		if (n < DefineControl.getMinDamage()) {
			n = DefineControl.getMinDamage();
		}
		
		return n;
	},
	
	calculateDamageHit: function(targetUnit, hit) {
		var totalStatus;
		
		if (hit === 0) {
			// 命中率が0の場合は、攻撃は必ず当たるものとする
			return 100;
		}
		
		totalStatus = SupportCalculator.createTotalStatus(targetUnit);
		
		hit -= HitCalculator.calculateAvoid(null, targetUnit, null, totalStatus);
		if (hit < 0) {
			hit = 0;
		}
		
		return hit;
	},
	
	calculateSellPrice: function(item) {
		var d;
		var gold = item.getGold() / 2;
		var limitMax = item.getLimitMax();
		
		if (limitMax === 0) {
			// 耐久0、つまり無限に使用できる武器は定価の半額で売れる
			d = 1;
		}
		else if (limitMax === WeaponLimitValue.BROKEN) {
			// 武器が破損している場合は0ゴールドでしか売れない
			d = 0;
		}
		else {
			d = item.getLimit() / limitMax;
		}
		
		gold = Math.floor(gold * d);
		
		return gold;
	}
};

var SupportCalculator = {
	createTotalStatus: function(unit) {
		var i, x, y, index, targetUnit, indexArray, count;
		var totalStatus = {};
		
		totalStatus.powerTotal = 0;
		totalStatus.defenseTotal = 0;
		totalStatus.hitTotal = 0;
		totalStatus.avoidTotal = 0;
		totalStatus.criticalTotal = 0;
		totalStatus.criticalAvoidTotal = 0;
		
		if (unit === null || this._isStatusDisabled()) {
			return totalStatus;
		}
		
		indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, this._getSupportRange());
		count = indexArray.length;
		
		// unitの一定範囲(既定3マス)にいるtargetUnitを探す
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			targetUnit = PosChecker.getUnitFromPos(x, y);
			if (targetUnit !== null) {
				// targetUnitが見つかった場合は、支援データをtotalStatusに加算
				this._collectStatus(unit, targetUnit, totalStatus);
			}
		}
		
		this._collectSkillStatus(unit, totalStatus);
		
		return totalStatus;
	},
	
	getPower: function(totalStatus) {
		if (totalStatus === null) {
			return 0;
		}
		
		return totalStatus.powerTotal;
	},
	
	getDefense: function(totalStatus) {
		if (totalStatus === null) {
			return 0;
		}
		
		return totalStatus.defenseTotal;
	},
	
	getHit: function(totalStatus) {
		if (totalStatus === null) {
			return 0;
		}
		
		return totalStatus.hitTotal;
	},
	
	getAvoid: function(totalStatus) {
		if (totalStatus === null) {
			return 0;
		}
		
		return totalStatus.avoidTotal;
	},
	
	getCritical: function(totalStatus) {
		if (totalStatus === null) {
			return 0;
		}
		
		return totalStatus.criticalTotal;
	},
	
	getCriticalAvoid: function(totalStatus) {
		if (totalStatus === null) {
			return 0;
		}
		
		return totalStatus.criticalAvoidTotal;
	},
	
	_collectStatus: function(unit, targetUnit, totalStatus) {
		var i, data;
		var count = targetUnit.getSupportDataCount();
		
		for (i = 0; i < count; i++) {
			data = targetUnit.getSupportData(i);
			if (unit === data.getUnit() && data.isGlobalSwitchOn() && data.isVariableOn()) {
				this._addStatus(totalStatus, data.getSupportStatus());
				break;
			}
		}
	},
	
	_collectSkillStatus: function(unit, totalStatus) {
		var i, j, list, count, targetUnit;
		var listArray = this._getListArray(unit);
		var listCount = listArray.length;
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			count = list.getCount();
			for (j = 0; j < count; j++) {
				targetUnit = list.getData(j);
				if (unit === targetUnit) {
					continue;
				}
				
				this._checkSkillStatus(targetUnit, unit, false, totalStatus);
			}
		}
		
		// ユニット自身が「単体」のスキルを持つ場合は、自分自身に加算
		this._checkSkillStatus(unit, null, true, totalStatus);
	},
	
	_checkSkillStatus: function(unit, targetUnit, isSelf, totalStatus) {
		var i, skill, isSet, indexArray;
		var arr = SkillControl.getDirectSkillArray(unit, SkillType.SUPPORT, '');
		var count = arr.length;
		
		for (i = 0; i < count; i++) {
			skill = arr[i].skill;
			isSet = false;
			
			if (isSelf) {
				if (skill.getRangeType() === SelectionRangeType.SELFONLY) {
					isSet = true;
				}
			}
			else {
				if (skill.getRangeType() === SelectionRangeType.ALL) {
					// 「全域」の場合は、常に支援が有効
					isSet = true;
				}
				else if (skill.getRangeType() === SelectionRangeType.MULTI) {
					indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, skill.getRangeValue());
					// 「指定範囲」の場合は、indexArray内の位置にunitが存在しているか調べる
					isSet = IndexArray.findUnit(indexArray, targetUnit);
				}
			}
			
			if (isSet && this._isSupportable(unit, targetUnit, skill)) {
				this._addStatus(totalStatus, skill.getSupportStatus());
			}
		}
	},
	
	_addStatus: function(totalStatus, supportStatus) {
		totalStatus.powerTotal += supportStatus.getPower();
		totalStatus.defenseTotal += supportStatus.getDefense();
		totalStatus.hitTotal += supportStatus.getHit();
		totalStatus.avoidTotal += supportStatus.getAvoid();
		totalStatus.criticalTotal += supportStatus.getCritical();
		totalStatus.criticalAvoidTotal += supportStatus.getCriticalAvoid();
	},
	
	_isSupportable: function(unit, targetUnit, skill) {
		if (targetUnit === null) {
			targetUnit = unit;
		}
		
		return skill.getTargetAggregation().isCondition(targetUnit);
	},
	
	_getSupportRange: function() {
		return DataConfig.getSupportRange();
	},
	
	_isStatusDisabled: function() {
		return root.getBaseScene() === SceneType.REST;
	},
	
	_getListArray: function(unit) {
		var filter = this._getSupportFilterFlag(unit);
		var listArray = FilterControl.getListArray(filter);
		
		this._appendGuestList(listArray, filter);
		
		return listArray;
	},
	
	_getSupportFilterFlag: function(unit) {
		var filter;
		var unitType = unit.getUnitType();
		
		if (unitType === UnitType.PLAYER) {
			filter = UnitFilterFlag.PLAYER;
		}
		else if (unitType === UnitType.ENEMY) {
			filter = UnitFilterFlag.ENEMY;
		}
		else {
			filter = UnitFilterFlag.ALLY;
			// 有効相手に同盟軍を含んだ支援スキルを自軍が持つような場合
			// filter = UnitFilterFlag.PLAYER | UnitFilterFlag.ALLY;
		}
		
		return filter;
	},
	
	_appendGuestList: function(listArray, filter) {
		if (!(filter & UnitFilterFlag.PLAYER)) {
			return;
		}
		
		if (root.getBaseScene() !== SceneType.BATTLESETUP) {
			return;
		}
		
		listArray.push(root.getCurrentSession().getNonJoinedGuestList());
	}
};

var CompatibleCalculator = {
	getPower: function(active, passive, weapon) {
		var compatible = this._getCompatible(active, passive, weapon);
		
		if (compatible === null) {
			return 0;
		}
		
		return compatible.getPower();
	},
	
	getDefense: function(active, passive, weapon) {
		var compatible = this._getCompatible(active, passive, weapon);
		
		if (compatible === null) {
			return 0;
		}
		
		return compatible.getDefense();
	},
	
	getHit: function(active, passive, weapon) {
		var compatible = this._getCompatible(active, passive, weapon);
		
		if (compatible === null) {
			return 0;
		}
		
		return compatible.getHit();
	},
	
	getAvoid: function(active, passive, weapon) {
		var compatible = this._getCompatible(active, passive, weapon);
		
		if (compatible === null) {
			return 0;
		}
		
		return compatible.getAvoid();
	},
	
	getCritical: function(active, passive, weapon) {
		var compatible = this._getCompatible(active, passive, weapon);
		
		if (compatible === null) {
			return 0;
		}
		
		return compatible.getCritical();
	},
	
	getCriticalAvoid: function(active, passive, weapon) {
		var compatible = this._getCompatible(active, passive, weapon);
		
		if (compatible === null) {
			return 0;
		}
		
		return compatible.getCriticalAvoid();
	},
	
	getAgility: function(active, passive, weapon) {
		var compatible = this._getCompatible(active, passive, weapon);
		
		if (compatible === null) {
			return 0;
		}
		
		return compatible.getAgility();
	},
	
	_getCompatible: function(active, passive, weapon) {
		var i, count, compatible, weaponTypeActive, weaponTypePassive;
		var weaponPassive = ItemControl.getEquippedWeapon(passive);
		
		if (weaponPassive === null || weapon === null) {
			return null;
		}
		
		weaponTypeActive = weapon.getWeaponType();
		weaponTypePassive = weaponPassive.getWeaponType();
		
		count = weaponTypeActive.getCompatibleCount();
		for (i = 0; i < count; i++) {
			compatible = weaponTypeActive.getCompatibleData(i);
			if (compatible.getSrcObject() === weaponTypePassive) {
				return compatible.getSupportStatus();
			}
		}
		
		return null;
	}
};

var ExperienceCalculator = {
	calculateExperience: function(data) {
		var exp;
		
		// activeHpとpassiveHpは、ユニットが死亡している場合にマイナスの値が設定されることもある。
		// つまり、0を超えて格納されることがある。
		if (data.passiveDamageTotal === 0) {
			exp = this._getNoDamageExperience(data);
		}
		else if (data.passiveHp <= 0) {
			exp = this._getVictoryExperience(data);
		}
		else {
			exp = this._getNormalValue(data);
		}
		
		return this.getBestExperience(data.active, exp);
	},
	
	// アイテム使用時からも呼ばれる
	getBestExperience: function(unit, exp) {
		exp = Math.floor(exp * this._getExperienceFactor(unit));
		
		if (exp > 100) {
			exp = 100;
		}
		else if (exp < 0) {
			exp = 0;
		}
		
		return exp;
	},
	
	_getExperienceFactor: function(unit) {
		var skill;
		var factor = 100;
		var option = root.getMetaSession().getDifficulty().getDifficultyOption();
		
		skill = SkillControl.getBestPossessionSkill(unit, SkillType.GROWTH);
		if (skill !== null) {
			factor = skill.getSkillValue();
		}
		
		if (option & DifficultyFlag.GROWTH) {
			factor *= 2;
		}
		
		return factor / 100;
	},
	
	_getNoDamageExperience: function(data) {
		var baseExp = 5;
		var exp = this._getExperience(data, baseExp);
		
		return this._getValidExperience(exp);
	},
	
	_getVictoryExperience: function(data) {
		var exp;
		var baseExp = this._getBaseExperience();
		var bonusExp = data.passive.getClass().getBonusExp();
		
		// クラスの「追加経験値」がマイナスの場合は、勝利時に経験値を取得しない。
		// これは最終マップのリーダー撃破を想定している。
		if (bonusExp < 0) {
			return 0;
		}
		
		// 「敵撃破時の経験値をクラスの追加経験値にする」が有効な場合は、クラスの「追加経験値」をそのまま返す 
		if (DataConfig.isFixedExperience()) {
			return this._getValidExperience(bonusExp + this._getBonusExperience(data.passive));
		}
		
		exp = this._getExperience(data, baseExp);
		
		// 相手がリーダー、またはサブリーダーの場合は経験値を加算
		exp += this._getBonusExperience(data.passive);
		
		// 相手のクラスの「追加経験値」を加算
		exp += bonusExp;
		
		return this._getValidExperience(exp);
	},
	
	_getNormalValue: function(data) {
		var baseExp = 8;
		var exp = this._getExperience(data, baseExp);
		
		return this._getValidExperience(exp);
	},
	
	_getExperience: function(data, baseExp) {
		var n;
		var lv = data.passive.getLv() - data.active.getLv();
		
		if (data.passiveHp > 0) {
			// 相手を倒せない場合は、レベル差を加算する
			n = baseExp + lv;
		}
		else {
			if (lv > 0) {
				// レベルが相手より大きい場合は、その差だけ4ずつ増やす
				n = lv * 4;
			}
			else {
				// レベルが相手より小さい場合は、その差だけ2ずつ減らす(lvはマイナスになっているため減る)
				n = lv * 2;
			}
			
			n += baseExp;
		}
		
		if (data.active.getClass().getClassRank() === data.passive.getClass().getClassRank()) {
			// 下級クラス同士、または上級クラス同士の戦闘では、これ以上経験値を調整しない
			return n;
		}
		
		if (data.active.getClass().getClassRank() === ClassRank.LOW) {
			// 下級クラスが上級クラスを攻撃した場合の処理
			n = Math.floor(n * (DataConfig.getLowExperienceFactor() / 100));
		}
		else {
			// 上級クラスが下級クラスを攻撃した場合の処理
			n = Math.floor(n * (DataConfig.getHighExperienceFactor() / 100));
		}
		
		return n;
	},
	
	_getValidExperience: function(exp) {
		var minExp = DataConfig.getMinimumExperience();
		
		if (exp < minExp) {
			exp = minExp;
		}
		
		return exp;
	},
	
	_getBonusExperience: function(unit) {
		var exp = 0;
		var type = unit.getImportance();
		
		if (type === ImportanceType.LEADER) {
			exp = DataConfig.getLeaderExperience();
		}
		else if (type === ImportanceType.SUBLEADER) {
			exp = DataConfig.getSubLeaderExperience();
		}
		
		return exp;
	},
	
	_getBaseExperience: function() {
		var difficulty = root.getMetaSession().getDifficulty();
		
		return difficulty.getBaseExperience();
	}
};

var ExperienceControl = {
	obtainExperience: function(unit, getExp) {
		var growthArray;
		
		if (!this._addExperience(unit, getExp)) {
			return null;
		}
		
		if (unit.getUnitType() === UnitType.PLAYER) {
			growthArray = this._createGrowthArray(unit);
		}
		else {
			growthArray = this._createCusotmGrowthArray(unit);
		}
		
		return growthArray;
	},
	
	plusGrowth: function(unit, growthArray) {
		var i;
		var count = growthArray.length;
		
		for (i = 0; i < count; i++) {
			ParameterControl.changeParameter(unit, i, growthArray[i]);
		}
	},
	
	directGrowth: function(unit, getExp) {
		var growthArray = this.obtainExperience(unit, getExp);
		
		if (growthArray !== null) {
			this.plusGrowth(unit, growthArray);
		}
	},
	
	obtainData: function(unit) {
		SkillChecker.addAllNewSkill(unit);
	},
	
	_createGrowthArray: function(unit) {
		var i, n;
		var count = ParamGroup.getParameterCount();
		var growthArray = [];
		var weapon = ItemControl.getEquippedWeapon(unit);
		
		for (i = 0; i < count; i++) {
			// 成長値(または成長率)を計算する
			n = ParamGroup.getGrowthBonus(unit, i) + ParamGroup.getUnitTotalGrowthBonus(unit, i, weapon);
			
			// 実際に上昇する値を設定
			growthArray[i] = this._getGrowthValue(n);
		}
		
		return growthArray;
	},
	
	_createCusotmGrowthArray: function(unit) {
		var i, type, defIndex;
		var count = ParamGroup.getParameterCount();
		var customGrowthArray = [];
		var defaultGrowthArray = unit.getClass().getPrototypeInfo().getGrowthArray(unit.getLv());
		
		// このメソッドでは、基本的にdefaultGrowthArrayを返しても問題はないが、
		// ParamGroup._configureUnitParametersでパラメータの並び替えが発生している場合、
		// 成長させるパラメータにずれが発生するため、その点を考慮して調整する。
		
		for (i = 0; i < count; i++) {
			type = ParamGroup.getParameterType(i);
			
			defIndex = -1;
			
			if (type === ParamType.MHP) {
				defIndex = 0;
			}
			else if (type === ParamType.POW) {
				defIndex = 1;
			}
			else if (type === ParamType.MAG) {
				defIndex = 2;
			}
			else if (type === ParamType.SKI) {
				defIndex = 3;
			}
			else if (type === ParamType.SPD) {
				defIndex = 4;
			}
			else if (type === ParamType.LUK) {
				defIndex = 5;
			}
			else if (type === ParamType.DEF) {
				defIndex = 6;
			}
			else if (type === ParamType.MDF) {
				defIndex = 7;
			}	
			else if (type === ParamType.MOV) {
				defIndex = 8;
			}
			else if (type === ParamType.WLV) {
				defIndex = 9;
			}
			else if (type === ParamType.BLD) {
				defIndex = 10;
			}

			if (defIndex === -1) {
				// ParamGroup._configureUnitParametersに独自パラメータが追加されていても、
				// 敵の「プロトタイプ情報」に独自パラメータの情報は設定できないことから、0を設定している。
				customGrowthArray[i] = 0;
			}
			else {
				customGrowthArray[i] = defaultGrowthArray[defIndex];
			}
		}
		
		return customGrowthArray;
	},
	
	_getGrowthValue: function(n) {
		var value, value2;
		var isMunus = false;
		
		if (n < 0) {
			n *= -1;
			isMunus = true;
		}
		
		// たとえば、nが270である場合は、確実に2上昇する。
		// さらに、70%の確率で1上昇する。
		value = Math.floor(n / 100);
		value2 = Math.floor(n % 100);
		
		if (Probability.getProbability(value2)) {
			value++;
		}
		
		if (isMunus) {
			value *= -1;
		}
		
		return value;
	},
	
	_addExperience: function(unit, getExp) {
		var exp;
		var baselineExp = this._getBaselineExperience();
		
		// 現在のユニットの経験値と習得経験値を加算
		exp = unit.getExp() + getExp; 
		
		if (exp >= baselineExp) {
			// 基準値を超えた場合は、レベルを1つ上げる
			unit.setLv(unit.getLv() + 1);
			if (unit.getLv() >= Miscellaneous.getMaxLv(unit)) {
				// 最大レベルに到達した場合は、経験値は0
				exp = 0;
			}
			else {
				// 基準値を引くことで、expが基準値以下に収まるようにする
				exp -= baselineExp;
			}
			
			unit.setExp(exp);
		}
		else {
			unit.setExp(exp);
			
			// レベルアップでない場合は、falseを返す
			return false;
		}
		
		return true;
	},
	
	_getBaselineExperience: function() {
		return DefineControl.getBaselineExperience();
	}
};

var RestrictedExperienceControl = {
	obtainExperience: function(unit, getExp) {
		var i, count, objectArray;
		var sum = 0;
		
		if (!ExperienceControl._addExperience(unit, getExp)) {
			return null;
		}
		
		objectArray = this._createObjectArray(unit);
		count = objectArray.length;
		for (i = 0; i < count; i++) {
			if (objectArray[i].value !== 0) {
				// 成長したパラメータの合計をカウント
				sum++;
			}
		}
		
		objectArray = this._sortObjectArray(objectArray, sum, unit);
		
		return this._getGrowthArray(objectArray);
	},
	
	_sortObjectArray: function(objectArray, sum, unit) {
		var i, obj;
		var n = 0;
		var count = objectArray.length;
		var max = this._getMax(unit);
		
		// 成長率が高い順に並び替える
		this._sort(objectArray);
		
		if (sum > max) {
			// 成長したパラメータが多いので減らす。
			// 成長しやすいパラメータから無効にしていく。
			for (i = 0; i < count; i++) {
				obj = objectArray[i];
				if (obj.value === 0) {
					continue;
				}
				
				obj.value = 0;
				if (++n == sum - max) {
					break;
				}
			}
		}
		else if (sum < max) {
			// 成長したパラメータが少ないので増やす。
			// 成長しやすいパラメータから成長させる。
			for (i = 0; i < count; i++) {
				obj = objectArray[i];
				if (obj.value !== 0) {
					continue;
				}
				
				obj.value = ExperienceControl._getGrowthValue(100);
				if (++n == max - sum) {
					break;
				}
			}
		}
		
		return objectArray;
	},
	
	_getGrowthArray: function(objectArray) {
		var i, count, obj;
		var growthArray = [];
		
		count = objectArray.length;
		for (i = 0; i < count; i++) {
			growthArray[i] = 0;
		}
		
		for (i = 0; i < count; i++) {
			obj = objectArray[i];
			if (obj.value !== 0) {	
				growthArray[obj.index] = obj.value;
			}
		}
		
		return growthArray;
	},
	
	_createObjectArray: function(unit) {
		var i, obj;
		var count = ParamGroup.getParameterCount();
		var objectArray = [];
		var weapon = ItemControl.getEquippedWeapon(unit);
		
		for (i = 0; i < count; i++) {
			obj = {};
			obj.index = i;
			obj.percent = ParamGroup.getGrowthBonus(unit, i) + ParamGroup.getUnitTotalGrowthBonus(unit, i, weapon);
			obj.value = ExperienceControl._getGrowthValue(obj.percent);
			// 同一成長率のパラメータが存在した場合に、どちらのパラメータが優先されるかは乱数で決める
			obj.rand = root.getRandomNumber() % count;
			
			objectArray[i] = obj;
		}
		
		return objectArray;
	},
	
	_sort: function(arr) {
		arr.sort(
			function(obj1, obj2) {
				if (obj1.percent > obj2.percent) {
					return -1;
				}
				else if (obj1.percent < obj2.percent) {
					return 1;
				}
				else {
					// このコードによって、同一成長率のパラメータが存在した場合に、後寄りのパラメータが成長しやすくなることを防止する
					if (obj1.rand > obj2.rand) {
						return -1;
					}
					else if (obj1.rand < obj2.rand) {
						return 1;
					}
				}
				
				return 0;
			}
		);
	},
	
	_getMax: function(unit) {
		// 上昇するパラメータは3つ
		return 3;
	}
};

var ParameterControl = {
	changeParameter: function(unit, index, growthValue) {
		var n;
		
		// 現在のパラメータを取得し、成長値と加算
		n = ParamGroup.getUnitValue(unit, index) + growthValue;
		
		n = ParamGroup.getValidValue(unit, n, index);
		
		ParamGroup.setUnitValue(unit, index, n);
		
		this.adjustParameter(unit, index, growthValue);
	},
	
	adjustParameter: function(unit, index, growthValue) {
		var hp, mhp;
		
		// 成長した分だけ現在のHPも増やす
		if (index === ParamType.MHP) {
			hp = unit.getHp() + growthValue;
			unit.setHp(hp);
			mhp = ParamBonus.getMhp(unit);
			if (hp > mhp) {
				unit.setHp(mhp);
			}
			else if (hp < 1) {
				unit.setHp(1);
			}
		}
	},
	
	addDoping: function(unit, obj) {
		var i, value, n;
		var count = ParamGroup.getParameterCount();
		
		for (i = 0; i < count; i++) {
			n = ParamGroup.getGrowthBonus(unit, i);
			if (n === 0 && !DataConfig.isFullDopingEnabled()) {
				continue;
			}
			value = ParamGroup.getDopingParameter(obj, i);
			this.changeParameter(unit, i, value);
		}
	}
};

var SymbolCalculator = {
	calculate: function(a, b, symbol) {
		var n = a;
		
		if (symbol === OperatorSymbol.ADD) {
			n = a + b;
		}
		else if (symbol === OperatorSymbol.SUBTRACT) {
			n = a - b;
		}
		else if (symbol === OperatorSymbol.MULTIPLY) {
			n = a * b;
		}
		else if (symbol === OperatorSymbol.DIVIDE) {
			n = Math.floor(a / b);
		}
		else if (symbol === OperatorSymbol.MOD) {
			n = Math.floor(a % b);
		}
		else if (symbol === OperatorSymbol.ASSIGNMENT) {
			n = b;
		}
		
		return n;
	},
	
	calculateEx: function(unit, index, calc) {
		var type, n;
		
		if (unit === null) {
			return 0;
		}
		
		type = calc.getParameterType(index);
		n = ParamBonus.getBonus(unit, type);
		
		return this.calculate(n, calc.getParameterValue(index), calc.getParameterOperatorSymbol(index));
	}
};
