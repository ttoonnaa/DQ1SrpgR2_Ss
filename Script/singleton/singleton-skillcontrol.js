
// スキルの発動を管理する
var SkillRandomizer = {
	isSkillInvoked: function(active, passive, skill) {
		var skilltype;
		var result = false;
		
		if (skill === null) {
			return false;
		}
		
		skilltype = skill.getSkillType();
		
		if (skilltype === SkillType.FASTATTACK) {
			result = this._isFastAttack(active, passive, skill);
		}
		else if (skilltype === SkillType.CONTINUOUSATTACK) {
			result = this._isContinuousAttack(active, passive, skill);
		}
		else if (skilltype === SkillType.COUNTERATTACKCRITICAL) {
			result = this._isCounterattackCritical(active, passive, skill);
		}
		else if (skilltype === SkillType.DAMAGEABSORPTION) {
			result = this._isDamageAbsorption(active, passive, skill);
		}
		else if (skilltype === SkillType.TRUEHIT) {
			result = this._isTrueHit(active, passive, skill);
		}
		else if (skilltype === SkillType.STATEATTACK) {
			result = this._isStateAttack(active, passive, skill);
		}
		else if (skilltype === SkillType.DAMAGEGUARD) {
			result = this._isDamageGuard(active, passive, skill);
		}
		else if (skilltype === SkillType.SURVIVAL) {
			result = this._isSurvival(active, passive, skill);
		}
		
		return result;
	},
	
	isCustomSkillInvoked: function(active, passive, skill, keyword) {
		if (skill === null || skill.getCustomKeyword() !== keyword) {
			return false;
		}
		
		return this.isCustomSkillInvokedInternal(active, passive, skill, keyword);
	},
	
	isCustomSkillInvokedInternal: function(active, passive, skill, keyword) {
		return false;
	},
	
	_isFastAttack: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isContinuousAttack: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isCounterattackCritical: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isDamageAbsorption: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isTrueHit: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isStateAttack: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isDamageGuard: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isSurvival: function(active, passive, skill) {
		return this._isSkillInvokedInternal(active, passive, skill);
	},
	
	_isSkillInvokedInternal: function(active, passive, skill) {
		if (!skill.getTargetAggregation().isCondition(passive)) {
			return false;
		}
		
		// 相手がスキルを無効化できる場合は、スキルを発動しない
		if (SkillControl.getBattleSkillFromFlag(passive, active, SkillType.INVALID, InvalidFlag.SKILL) !== null) {
			return false;
		}
		
		return Probability.getInvocationProbabilityFromSkill(active, skill);
	}
};

var ObjectFlag = {
	UNIT: 0x01,
	CLASS: 0x02,
	WEAPON: 0x04,
	ITEM: 0x08,
	SKILL: 0x10,
	STATE: 0x20,
	TERRAIN: 0x40,
	FUSION: 0x80
};

// スキルの所持確認などを行う
var SkillControl = {
	checkAndPushSkill: function(active, passive, attackEntry, isActive, skilltype) {
		var skill = this.getPossessionSkill(active, skilltype);
		
		if (SkillRandomizer.isSkillInvoked(active, passive, skill)) {
			// スキルに「発動時に表示する」が設定されているか調べる
			if (skill.isSkillDisplayable()) {
				// 表示する場合は、描画時にスキルを参照できるように保存する
				if (isActive) {
					attackEntry.skillArrayActive.push(skill);
				}
				else {
					attackEntry.skillArrayPassive.push(skill);
				}
			}
			return skill;
		}
		
		return null;
	},
	
	checkAndPushCustomSkill: function(active, passive, attackEntry, isActive, keyword) {
		var skill = this.getPossessionCustomSkill(active, keyword);
		
		if (SkillRandomizer.isCustomSkillInvoked(active, passive, skill, keyword)) {
			if (skill.isSkillDisplayable()) {
				if (isActive) {
					attackEntry.skillArrayActive.push(skill);
				}
				else {
					attackEntry.skillArrayPassive.push(skill);
				}
			}
			return skill;
		}
		
		return null;
	},
	
	getBattleSkill: function(active, passive, skilltype) {
		var arr = this.getDirectSkillArray(active, skilltype, '');
		var skill = this._returnSkill(skilltype, arr);
		
		return this._getBattleSkillInternal(active, passive, skill);
	},
	
	getBattleSkillFromFlag: function(active, passive, skilltype, flag) {
		var i, count, skill;
		var arr = this.getDirectSkillArray(active, skilltype, '');
		
		count = arr.length;
		for (i = 0; i < count; i++) {
			if (arr[i].skill.getSkillType() === skilltype && arr[i].skill.getSkillValue() & flag) {
				skill = this._getBattleSkillInternal(active, passive, arr[i].skill);
				if (skill !== null) {
					return skill;
				}
			}
		}
		
		return null;
	},
	
	getBattleSkillFromValue: function(active, passive, skilltype, value) {
		var i, count, skill;
		var arr = this.getDirectSkillArray(active, skilltype, '');
		
		count = arr.length;
		for (i = 0; i < count; i++) {
			if (arr[i].skill.getSkillType() === skilltype && arr[i].skill.getSkillValue() === value) {
				skill = this._getBattleSkillInternal(active, passive, arr[i].skill);
				if (skill !== null) {
					return skill;
				}
			}
		}
		
		return null;
	},
	
	// unitがskilltypeのスキルを所持しているか調べる。
	// 戻り値は、所持しているスキル。
	getPossessionSkill: function(unit, skilltype) {
		var arr = this.getDirectSkillArray(unit, skilltype, '');
		
		return this._returnSkill(skilltype, arr);
	},
	
	// 最も数値が大きいスキルを返す
	getBestPossessionSkill: function(unit, skilltype) {
		var i, count;
		var arr = this.getDirectSkillArray(unit, skilltype, '');
		var max = -1000;
		var index = -1;
		
		count = arr.length;
		for (i = 0; i < count; i++) {
			if (arr[i].skill.getSkillType() === skilltype && arr[i].skill.getSkillValue() > max) {
				max = arr[i].skill.getSkillValue();
				index = i;
			}
		}
		
		if (index === -1) {
			return null;
		}
		
		return arr[index].skill;
	},
	
	getPossessionCustomSkill: function(unit, keyword) {
		var arr = this.getDirectSkillArray(unit, SkillType.CUSTOM, keyword);
		
		return this._returnSkill(SkillType.CUSTOM, arr);
	},
	
	getDirectSkillArray: function(unit, skilltype, keyword) {
		if (unit === null) {
			return [];
		}
		
		return this.getSkillMixArray(unit, ItemControl.getEquippedWeapon(unit), skilltype, keyword);
	},
	
	// skilltypeが-1の場合は、unitに関連する全てのスキルが対象になる
	getSkillMixArray: function(unit, weapon, skilltype, keyword) {
		var objectFlag = ObjectFlag.UNIT | ObjectFlag.CLASS | ObjectFlag.WEAPON | ObjectFlag.ITEM | ObjectFlag.STATE | ObjectFlag.TERRAIN | ObjectFlag.FUSION;
		
		return this.getSkillObjectArray(unit, weapon, skilltype, keyword, objectFlag);
	},
	
	getSkillObjectArray: function(unit, weapon, skilltype, keyword, objectFlag) {
		var arr = [];
		
		if (unit === null) {
			return arr;
		}
		
		this._pushObjectSkill(unit, weapon, arr, skilltype, keyword, objectFlag);
		
		return this._getValidSkillArray(arr);
	},
	
	_getBattleSkillInternal: function(active, passive, skill) {
		if (skill === null) {
			return null;
		}
	
		// 「有効相手」として許可されない
		if (passive !== null && !skill.getTargetAggregation().isCondition(passive)) {
			return null;
		}
		
		return skill;
	},
	
	_pushObjectSkill: function(unit, weapon, arr, skilltype, keyword, objectFlag) {
		var i, item, list, count, terrain, child;
		var checkerArray = [];
		var cls = unit.getClass();
		
		if (objectFlag & ObjectFlag.UNIT) {
			// ユニットのスキルを追加する
			this._pushSkillValue(unit, ObjectType.UNIT, arr, skilltype, keyword);
		}
		
		if (objectFlag & ObjectFlag.CLASS) {
			// ユニットが属するクラスのスキルを追加する
			this._pushSkillValue(cls, ObjectType.CLASS, arr, skilltype, keyword);
		}
		
		if (objectFlag & ObjectFlag.WEAPON) {
			if (weapon !== null) {
				// 武器のスキルを追加する
				this._pushSkillValue(weapon, ObjectType.WEAPON, arr, skilltype, keyword);
			}
		}
		
		if (objectFlag & ObjectFlag.ITEM) {
			count = UnitItemControl.getPossessionItemCount(unit);
			for (i = 0; i < count; i++) {
				item = UnitItemControl.getItem(unit, i);
				if (!ItemIdentityChecker.isItemReused(checkerArray, item)) {
					continue;
				}
				
				if (item !== null && ItemControl.isItemUsable(unit, item)) {
					// アイテムを使用できる場合は、スキルを追加する
					this._pushSkillValue(item, ObjectType.ITEM, arr, skilltype, keyword);
				}
			}
		}
		
		if (objectFlag & ObjectFlag.STATE) {
			// ユニットにかかっているステートのスキルを追加する
			list = unit.getTurnStateList();
			count = list.getCount();
			for (i = 0; i < count; i++) {
				this._pushSkillValue(list.getData(i).getState(), ObjectType.STATE, arr, skilltype, keyword);
			}
		}
		
		if (objectFlag & ObjectFlag.TERRAIN) {
			terrain = PosChecker.getTerrainFromPos(unit.getMapX(), unit.getMapY());
			if (terrain !== null) {
				this._pushSkillValue(terrain, ObjectType.TERRAIN, arr, skilltype, keyword);
			}
		}
		
		if (objectFlag & ObjectFlag.FUSION) {
			child = FusionControl.getFusionChild(unit);
			if (child !== null) {
				objectFlag = FusionControl.getFusionData(unit).getSkillIncludedObjectFlag();
				this._pushObjectSkillFromFusion(child, ItemControl.getEquippedWeapon(child), arr, skilltype, keyword, objectFlag);
			}
		}
	},
	
	_pushObjectSkillFromFusion: function(unit, weapon, arr, skilltype, keyword, objectFlag) {
		var i, item, list, count;
		var checkerArray = [];
		var cls = unit.getClass();
		
		// 全ての_pushSkillValueにはObjectType.FUSIONが指定される
		
		if (objectFlag & ObjectFlag.UNIT) {
			this._pushSkillValue(unit, ObjectType.FUSION, arr, skilltype, keyword);
		}
		
		if (objectFlag & ObjectFlag.CLASS) {
			this._pushSkillValue(cls, ObjectType.FUSION, arr, skilltype, keyword);
		}
		
		if (objectFlag & ObjectFlag.WEAPON) {
			if (weapon !== null) {
				this._pushSkillValue(weapon, ObjectType.FUSION, arr, skilltype, keyword);
			}
		}
		
		if (objectFlag & ObjectFlag.ITEM) {
			count = UnitItemControl.getPossessionItemCount(unit);
			for (i = 0; i < count; i++) {
				item = UnitItemControl.getItem(unit, i);
				if (!ItemIdentityChecker.isItemReused(checkerArray, item)) {
					continue;
				}
				
				if (item !== null && ItemControl.isItemUsable(unit, item)) {
					this._pushSkillValue(item, ObjectType.FUSION, arr, skilltype, keyword);
				}
			}
		}
		
		if (objectFlag & ObjectFlag.STATE) {
			list = unit.getTurnStateList();
			count = list.getCount();
			for (i = 0; i < count; i++) {
				this._pushSkillValue(list.getData(i).getState(), ObjectType.FUSION, arr, skilltype, keyword);
			}
		}
	},
	
	_pushSkillValue: function(data, objecttype, arr, skilltype, keyword) {
		var i, skill, skillEntry, isBuild;
		var list = data.getSkillReferenceList();
		var count = list.getTypeCount();
		
		// スキルリストからtypeで識別されるスキルを探す。
		// 見つかった場合は、そのスキルの値をarrに保存する。
		for (i = 0; i < count; i++) {
			skill = list.getTypeData(i);
			if (skill === null) {
				// セーブファイルロード時に、スキルが見つからないことでnullが返ることがある
				continue;
			}
			
			isBuild = false;
			if (skilltype === -1) {
				isBuild = true;
			}
			else if (skill.getSkillType() === skilltype) {
				if (skilltype === SkillType.CUSTOM) {
					if (skill.getCustomKeyword() === keyword) {
						isBuild = true;
					}
				}
				else {
					isBuild = true;
				}
			}
			
			if (isBuild) {
				skillEntry = StructureBuilder.buildMixSkillEntry();
				skillEntry.objecttype = objecttype;
				skillEntry.skill = skill;
				arr.push(skillEntry);
			}
		}
	},
	
	_returnSkill: function(skilltype, arr) {
		var i;
		var count = arr.length;
		var max = -1000;
		var index = -1;
		
		// arrの中からskilltypeと一致スキルを探す。
		// 同種スキルが複数存在する場合は、発動率が高いスキルを優先する
		for (i = 0; i < count; i++) {
			if (arr[i].skill.getSkillType() === skilltype && arr[i].skill.getInvocationValue() > max) {
				max = arr[i].skill.getInvocationValue();
				index = i;
			}
		}
		
		if (index === -1) {
			return null;
		}
		
		return arr[index].skill;
	},
	
	_getValidSkillArray: function(arr) {
		var i;
		var count = arr.length;
		var usedAry = [];
		
		for (i = 0; i < count; i++) {
			// 既に追加されているスキルは、再び追加してはならない
			if (this._isUsed(usedAry, arr[i])) {
				continue;
			}
			
			usedAry.push(arr[i]);
		}
		
		return usedAry;
	},
	
	_isUsed: function(arr, obj) {
		var i;
		var count = arr.length;
		
		for (i = 0; i < count; i++) {
			if (arr[i].skill.getId() === obj.skill.getId()) {
				return true;
			}
		}
		
		return false;
	}
};

// ユニットに対してスキルの追加や削除を行う。ユニットのクラススキルなどは削除できない
var SkillChecker = {
	arrangeSkill: function(unit, skill, increaseType) {
		var list = unit.getSkillReferenceList();
		var count = list.getTypeCount();
		var editor = root.getDataEditor();
		
		if (increaseType === IncreaseType.INCREASE) {
			// コンフィグの「スキル所持数」を超えてないか調べる
			if (count < DataConfig.getMaxSkillCount()) {
				editor.addSkillData(list, skill);
			}
		}
		else if (increaseType === IncreaseType.DECREASE) {
			editor.deleteSkillData(list, skill);
		}
		else if (increaseType === IncreaseType.ALLRELEASE) {
			editor.deleteAllSkillData(list);
		}
	},
	
	addAllNewSkill: function(unit) {
		var i, count, newSkill;
		
		if (unit === null) {
			return;
		}
		
		count = unit.getNewSkillCount();
		for (i = 0; i < count; i++) {
			newSkill = unit.getNewSkill(i);
			this.addNewSkill(unit, newSkill);
		}
	},
	
	addNewSkill: function(unit, newSkill) {
		// スキルを習得できるレベルに達してないか調べる
		if (this._isLevelDisabled(unit, newSkill)) {
			return false;
		}
		
		// スキルを既に習得しているか調べる
		if (this._isSkillLearned(unit, newSkill.getSkill())) {
			return false;
		}
		
		if (newSkill.getNewSkillType() === NewSkillType.NEW) {
			// スキルの新規習得の場合は、既にそのスキルが置き換わったことがあるかどうか調べる
			if (!this._isSkillReplaced(unit, newSkill.getSkill())) {
				this.arrangeSkill(unit, newSkill.getSkill(), IncreaseType.INCREASE);
				return true;
			}
		}
		else {
			// スキルの置き換えの場合は、置き換え元スキルを習得しているかどうか調べる
			if (this._isSkillLearned(unit, newSkill.getOldSkill())) {
				this._powerupSkill(unit, newSkill);
				return true;
			}
		}
		
		return false;
	},
	
	_powerupSkill: function(unit, newSkill) {
		var list = unit.getSkillReferenceList();
		
		root.getDataEditor().changeSkillData(list, newSkill.getSkill(), newSkill.getOldSkill());
	},
	
	_isLevelDisabled: function(unit, newSkill) {
		return unit.getLv() < newSkill.getLv();
	},
	
	_isSkillLearned: function(unit, skill) {
		var i;
		var list = unit.getSkillReferenceList();
		var count = list.getTypeCount();
		
		for (i = 0; i < count; i++) {
			if (skill === list.getTypeData(i)) {
				return true;
			}
		}
		
		return false;
	},
	
	// 置き換え後スキルを習得している場合は、置き換え元スキルは再習得できない
	_isSkillReplaced: function(unit, skill) {
		var i, data, oldSkill;
		var list = unit.getSkillReferenceList();
		var count = list.getTypeCount();
		
		for (i = 0; i < count; i++) {
			data = list.getTypeData(i);
			for (;;) {
				oldSkill = this._isSkillReplacedInternal(unit, data);
				if (oldSkill === null) {
					break;
				}
				else if (oldSkill === skill) {
					return true;
				}
				else {
					data = oldSkill;
				}
			}
		}
		
		return false;
	},
	
	_isSkillReplacedInternal: function(unit, skill) {
		var i, newSkill;
		var count = unit.getNewSkillCount();
		
		for (i = 0; i < count; i++) {
			newSkill = unit.getNewSkill(i);
			if (newSkill.getNewSkillType() === NewSkillType.POWERUP && newSkill.getSkill() === skill) {
				return newSkill.getOldSkill();
			}
		}
		
		return null;
	}
};

