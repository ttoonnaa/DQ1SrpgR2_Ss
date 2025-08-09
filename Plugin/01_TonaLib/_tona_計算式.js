
// *****************************************************************************************************************************
// 能力値の計算
// -----------------------------------------------------------------------------------------------------------------------------

AbilityCalculator.getHit = function(unit, weapon) {

	// エンゲージの計算式

	// (技 * 2) + (運 * 0.5) + 武器の命中率

	return Math.floor(RealBonus.getSki(unit) * 2 + RealBonus.getLuk(unit) * 0.5 + weapon.getHit());
};

AbilityCalculator.getAvoid = function(unit, weapon) {

	var avoid, terrain;
	var cls = unit.getClass();

	// エンゲージの計算式

	// (速 * 2) + (運 * 0.5)

	avoid = Math.floor(RealBonus.getSpd(unit) * 2 + RealBonus.getLuk(unit) * 0.5);

	// クラスタイプが地形ボーナスを考慮する場合は、「地形効果」の回避率を加算する
	if (cls.getClassType().isTerrainBonusEnabled()) {
		terrain = PosChecker.getTerrainFromPos(unit.getMapX(), unit.getMapY());
		if (terrain !== null) {
			avoid += terrain.getAvoid();
		}
	}

	return avoid;
};

AbilityCalculator.getCritical = function(unit, weapon) {

	// エンゲージの計算式

	// (技 * 0.5) + 武器のクリティカル率

	return Math.floor(RealBonus.getSki(unit) * 0.5 + weapon.getCritical());
};

AbilityCalculator.getCriticalAvoid = function(unit, weapon) {

	// エンゲージの計算式の半分にしてクリティカルが出やすくする

	// (運 * 0.5)

	return Math.floor(RealBonus.getLuk(unit) * 0.5);
};

// *****************************************************************************************************************************
// 攻撃回数を計算する
// -----------------------------------------------------------------------------------------------------------------------------

NormalAttackOrderBuilder._getAttackCount = function(virtualActive, virtualPassive) {
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
};

// *****************************************************************************************************************************
// ラウンド数を計算する
// -----------------------------------------------------------------------------------------------------------------------------

Calculator.calculateRoundCount = function(active, passive, weapon) {

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
};

// *****************************************************************************************************************************
// ダメージの計算
// -----------------------------------------------------------------------------------------------------------------------------

DamageCalculator.calculateAttackPower = function(active, passive, weapon, isCritical, totalStatus, trueHitValue) {

	var pow = AbilityCalculator.getPower(active, weapon) + CompatibleCalculator.getPower(active, passive, weapon) + SupportCalculator.getPower(totalStatus);

	if (this.isEffective(active, passive, weapon, isCritical, trueHitValue)) {
		pow += weapon.getPow() * (this.getEffectiveFactor() - 1);		// ★改造：特効は武器の威力を上げる
	}

	return pow;
};

// *****************************************************************************************************************************
// ダメージの計算
// -----------------------------------------------------------------------------------------------------------------------------

DamageCalculator.calculateDamage = function(active, passive, weapon, isCritical, activeTotalStatus, passiveTotalStatus, trueHitValue) {
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
};

// *****************************************************************************************************************************
// 経験値計算機
// -----------------------------------------------------------------------------------------------------------------------------

ExperienceCalculator._getExperience = function(data, baseExp) {

	// ★改造：大きく改造する、レベル差の影響を大きくする

	var exp = baseExp;
	var diff = z_UnitControl.getInnerLevel(data.passive) - z_UnitControl.getInnerLevel(data.active);

	if (data.passiveHp > 0) {

		// 相手を倒せない場合は、レベル差を加算する
		exp += diff;
	}
	else {

		// レベルが相手より大きい場合は、その差だけ 40% ずつ増やす
		if (diff > 0) {
			for (var i = 0; i < diff; i++) {
				exp *= 1.4;
			}
		}

		// レベルが相手より小さい場合は、その差だけ 40% ずつ減らす
		else {

			for (var i = 0; i < -diff; i++) {
				exp *= 0.6;
			}
		}
	}

	return Math.floor(exp);
};

// *****************************************************************************************************************************
// 経験値コントロール
// -----------------------------------------------------------------------------------------------------------------------------

ExperienceControl._createGrowthArray = function(unit) {

	var i, n;
	var count = ParamGroup.getParameterCount();
	var growthArray = [];
	var weapon = ItemControl.getEquippedWeapon(unit);
	
	for (i = 0; i < count; i++) {

		// ★改造：getGrowthBonus ユニット特殊

		// 成長値(または成長率)を計算する
		n = ParamGroup.getUnitGrowthBonus(unit, i) + ParamGroup.getUnitTotalGrowthBonus(unit, i, weapon);

		// 実際に上昇する値を設定
		growthArray[i] = this._getGrowthValue(n);
	}

	return growthArray;
};

// *****************************************************************************************************************************
// 制限付き経験値コントロール
//		経験値配分ウィンドウで使うっぽい
// -----------------------------------------------------------------------------------------------------------------------------

RestrictedExperienceControl._createObjectArray = function(unit) {

	var i, obj;
	var count = ParamGroup.getParameterCount();
	var objectArray = [];
	var weapon = ItemControl.getEquippedWeapon(unit);

	for (i = 0; i < count; i++) {

		// ★改造：getGrowthBonus ユニット特殊

		obj = {};
		obj.index = i;
		obj.percent = ParamGroup.getUnitGrowthBonus(unit, i) + ParamGroup.getUnitTotalGrowthBonus(unit, i, weapon);
		obj.value = ExperienceControl._getGrowthValue(obj.percent);

		// 同一成長率のパラメータが存在した場合に、どちらのパラメータが優先されるかは乱数で決める
		obj.rand = root.getRandomNumber() % count;

		objectArray[i] = obj;
	}

	return objectArray;

};





















