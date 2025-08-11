
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
// クリティカル許可判定
// -----------------------------------------------------------------------------------------------------------------------------

Miscellaneous.isCriticalAllowed = function(active, passive) {
	var option = root.getMetaSession().getDifficulty().getDifficultyOption();

	// クリティカルが許可されている
	if (option & DifficultyFlag.CRITICAL) {
		return true;
	}

	// クリティカル可能スキルを持っている
	if (SkillControl.getBattleSkill(active, passive, SkillType.CRITICAL) !== null) {
		return true;
	}

	// クリティカル可能フラグを持っている
	var objectFlag = ObjectFlag.UNIT | ObjectFlag.CLASS | ObjectFlag.WEAPON | ObjectFlag.ITEM | ObjectFlag.SKILL | ObjectFlag.STATE | ObjectFlag.TERRAIN | ObjectFlag.FUSION;
	if (tona_CustomFlagControl.isCustomFlag(active, ItemControl.getEquippedWeapon(active), objectFlag, tona_CustomFlag.canCritical)) {
		return true;
	}

	return false;
};

// *****************************************************************************************************************************
// 追撃許可判定
// -----------------------------------------------------------------------------------------------------------------------------

Calculator.isRoundAttackAllowed = function(active, passive) {
	var option = root.getMetaSession().getDifficulty().getDifficultyOption();

	// 追撃が許可されている
	if (option & DifficultyFlag.ROUNDATTACK) {
		return true;
	}

	// 追撃可能スキルを持っている
	if (SkillControl.getBattleSkill(active, passive, SkillType.ROUNDATTACK) !== null) {
		return true;
	}

	// 追撃可能フラグを持っている
	var objectFlag = ObjectFlag.UNIT | ObjectFlag.CLASS | ObjectFlag.WEAPON | ObjectFlag.ITEM | ObjectFlag.SKILL | ObjectFlag.STATE | ObjectFlag.TERRAIN | ObjectFlag.FUSION;
	if (tona_CustomFlagControl.isCustomFlag(active, ItemControl.getEquippedWeapon(active), objectFlag, tona_CustomFlag.canRoundAttack)) {
		return true;
	}

	return false;
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
// 通常攻撃：攻撃回数を計算する
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
// ダメージ計算：ダメージ計算
// -----------------------------------------------------------------------------------------------------------------------------

DamageCalculator.calculateDamage = function(active, passive, weapon, isCritical, activeTotalStatus, passiveTotalStatus, trueHitValue, tona_skills) {
	var pow, def, damage;

	tona_skills = tona_skills || {};

	if (this.isHpMinimum(active, passive, weapon, isCritical, trueHitValue)) {
		return -1;
	}

	pow = this.calculateAttackPower(active, passive, weapon, isCritical, activeTotalStatus, trueHitValue, tona_skills);
	def = this.calculateDefense(active, passive, weapon, isCritical, passiveTotalStatus, trueHitValue, tona_skills);

	// スキルの計算は calculateAttackPower や calculateDefense でやる方法もある（trueHitValue はそうしてる）
	// ただ、atk / def に分離できない可能性も考え、tona_skills の計算はここで行う
	// 中に入れてもいい気がしてきた。

	if (tona_skills['スキル：月光']) {
		def = Math.floor(def / 2);
	}

	damage = pow - def;

	if (tona_skills['スキル：大盾']) {
		damage = Math.floor(damage / 2);
	}

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
// ダメージ計算：攻撃力を計算
// -----------------------------------------------------------------------------------------------------------------------------

DamageCalculator.calculateAttackPower = function(active, passive, weapon, isCritical, totalStatus, trueHitValue, tona_skills) {

	var pow = AbilityCalculator.getPower(active, weapon) + CompatibleCalculator.getPower(active, passive, weapon) + SupportCalculator.getPower(totalStatus);

	if (DamageCalculator.isEffective(active, passive, weapon, isCritical, totalStatus, trueHitValue, tona_skills)) {
		pow += weapon.getPow() * (this.getEffectiveFactor() - 1);		// ★改造：特効は武器の威力を上げる
	}

	return pow;
};

// *****************************************************************************************************************************
// ダメージ計算：特効を判定
// -----------------------------------------------------------------------------------------------------------------------------

DamageCalculator.isEffective = function(active, passive, weapon, isCritical, totalStatus, trueHitValue, tona_skills) {

	// ここは攻撃予想にも通ることに注意
	// スキル「特攻無効」は固定なのでここで判定しても良い
	// スキル「練達」は確率なので外から与える必要がある（予想時は発動しない）

	// ★改造：「必中：特効」より「特効無効」を優先する

	if (tona_skills['スキル：練達']) {
		return false;
	}

	if (SkillControl.getBattleSkillFromFlag(passive, active, SkillType.INVALID, InvalidFlag.EFFECTIVE) !== null) {
		return false;
	}

	// 「必中：特効」を判定
	if (trueHitValue === TrueHitValue.EFFECTIVE) {
		return true;
	}

	// 相手のユニットに対して、アイテムが特攻であるか調べる
	if (ItemControl.isEffectiveData(passive, weapon)) {
		return true;
	}

	return false;
}

// *****************************************************************************************************************************
// 通常戦闘：ダメージ計算
// -----------------------------------------------------------------------------------------------------------------------------

AttackEvaluator.HitCritical.evaluateAttackEntry = function(virtualActive, virtualPassive, attackEntry) {

	this._tona_skills = {};
	this._tona_trueHitValue = 0;

	// 必中スキルを調べておく（特効などの情報も含んでいる）
	this._skill = SkillControl.checkAndPushSkill(virtualActive.unitSelf, virtualPassive.unitSelf, attackEntry, true, SkillType.TRUEHIT);
	if (this._skill !== null) {
		this._tona_trueHitValue = this._skill.getSkillValue();
	}

	// tona_skills のうち、必ず発動判定を行うものをここで処理する
	// 命中しなくてもスキル発動演出は行うことに注意

	this._tona_skills['スキル：月光'] = SkillControl.checkAndPushCustomSkill(virtualActive.unitSelf, virtualPassive.unitSelf, attackEntry, true, tona_Keyword['スキル：月光']);
	this._tona_skills['スキル：滅殺'] = SkillControl.checkAndPushCustomSkill(virtualActive.unitSelf, virtualPassive.unitSelf, attackEntry, true, tona_Keyword['スキル：滅殺']);

	// 自分から攻撃した場合に発動するスキル
	if (virtualActive.isInitiative) {
		this._tona_skills['スキル：勇敢'] = SkillControl.checkAndPushCustomSkill(virtualActive.unitSelf, virtualPassive.unitSelf, attackEntry, true, tona_Keyword['スキル：勇敢']);
	}

	// 防御側のスキル
	this._tona_skills['スキル：大盾'] = SkillControl.checkAndPushCustomSkill(virtualPassive.unitSelf, virtualActive.unitSelf, attackEntry, false, tona_Keyword['スキル：大盾']);
	this._tona_skills['スキル：練達'] = SkillControl.checkAndPushCustomSkill(virtualPassive.unitSelf, virtualActive.unitSelf, attackEntry, false, tona_Keyword['スキル：練達']);

	// 攻撃が命中するかどうかを調べる
	attackEntry.isHit = this.isHit(virtualActive, virtualPassive, attackEntry);
	if (!attackEntry.isHit) {

		// スキル：必中が発動していれば攻撃は命中する
		if (this._skill !== null) {
			attackEntry.isHit = true;
		}

		// 最終的に命中しなかった場合はここで終わり
		if (!attackEntry.isHit) {
			return;
		}
	}

	// クリティカルかどうか調べる
	attackEntry.isCritical = this.isCritical(virtualActive, virtualPassive, attackEntry);

	// 与えるダメージを計算する
	attackEntry.damagePassive = this.calculateDamage(virtualActive, virtualPassive, attackEntry);

	this._checkStateAttack(virtualActive, virtualPassive, attackEntry);
};

// *****************************************************************************************************************************
// 通常戦闘：ダメージ計算：ダメージを計算
// -----------------------------------------------------------------------------------------------------------------------------

AttackEvaluator.HitCritical.calculateDamage = function(virtualActive, virtualPassive, attackEntry) {

	if (DamageCalculator.isHpMinimum(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, attackEntry.isCritical, this._tona_trueHitValue)) {
		// 現在HP-1をダメージにすることで、攻撃が当たれば相手のHPは1になる
		return virtualPassive.hp - 1;
	}

	if (DamageCalculator.isFinish(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, attackEntry.isCritical, this._tona_trueHitValue)) {
		return virtualPassive.hp;
	}

	if (this._tona_skills['スキル：滅殺']) {
		return virtualPassive.hp;
	}

	return DamageCalculator.calculateDamage(virtualActive.unitSelf, virtualPassive.unitSelf, virtualActive.weapon, attackEntry.isCritical, virtualActive.totalStatus, virtualPassive.totalStatus, this._tona_trueHitValue, attackEntry.isEffective, this._tona_skills);
};

// *****************************************************************************************************************************
// 通常戦闘：ダメージ計算：クリティカルかを調べる
// -----------------------------------------------------------------------------------------------------------------------------

AttackEvaluator.HitCritical.isCritical = function(virtualActive, virtualPassive, attackEntry) {

	// 練達：必殺、特効を無効にする
	if (this._tona_skills['スキル：練達']) {
		return false;
	}

	// 反撃クリティカルによるクリティカル発動
	// これの判定がここにあるせいで、回避されたときに発動演出が出ないかも…？
	if (!virtualActive.isInitiative && SkillControl.checkAndPushSkill(virtualActive.unitSelf, virtualPassive.unitSelf, attackEntry, true, SkillType.COUNTERATTACKCRITICAL) !== null) {
		return true;
	}

	// 勇敢：自身から攻撃したときにクリティカルになる
	if (this._tona_skills['スキル：勇敢']) {
		return true;
	}

	// クリティカルが出るかどうかは確率で計算
	return this.calculateCritical(virtualActive, virtualPassive, attackEntry);
};

// *****************************************************************************************************************************
// 経験値計算機
// -----------------------------------------------------------------------------------------------------------------------------

ExperienceCalculator._getExperience = function(data, baseExp) {

	// ★改造：大きく改造する、レベル差の影響を大きくする

	var exp = baseExp;
	var diff = tona_UnitControl.getInnerLevel(data.passive) - tona_UnitControl.getInnerLevel(data.active);

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





















