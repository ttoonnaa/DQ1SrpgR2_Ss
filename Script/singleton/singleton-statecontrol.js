
// ユニットのステートを管理する
var StateControl = {
	// unitが特定のBadStateOptionを含むか調べる
	isBadStateOption: function(unit, option) {
		var i, state;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			state = list.getData(i).getState();
			if (state.getBadStateOption() === option) {
				return true;
			}
		}
		
		return false;
	},
	
	// unitが特定のBadStateFlagを含むか調べる
	isBadStateFlag: function(unit, flag) {
		var i, state;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			state = list.getData(i).getState();
			if (state.getBadStateFlag() & flag) {
				return true;
			}
		}
		
		return false;
	},
	
	// unitが指定されたstateを含むか調べる
	getTurnState: function(unit, state) {
		var i, turnState;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			turnState = list.getData(i);
			if (turnState.getState() === state) {
				return turnState;
			}
		}
		
		return null;
	},
	
	// 「自然回復」の値を取得する
	getHpValue: function(unit) {
		var i, state;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		var recoveryValue = 0;
		
		for (i = 0; i < count; i++) {
			state = list.getData(i).getState();
			recoveryValue += state.getAutoRecoveryValue();
		}
		
		return recoveryValue;
	},
	
	// ステートを発動できるか計算する
	checkStateInvocation: function(active, passive, obj) {
		var stateInvocation = obj.getStateInvocation();
		var state = stateInvocation.getState();
		
		if (this.isStateBlocked(passive, active, state)) {
			// ステートを無効にできた場合はnullを返す
			return null;
		}
		
		if (Probability.getInvocationProbability(active, stateInvocation.getInvocationType(), stateInvocation.getInvocationValue())) {
			// ステートを発動できた場合はステートを返す
			return state;
		}
		
		return null;
	},
	
	// unitに対してstateを追加、または解除する
	arrangeState: function(unit, state, increaseType) {
		var turnState = null;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		var editor = root.getDataEditor();
		
		if (increaseType === IncreaseType.INCREASE) {
			turnState = this.getTurnState(unit, state);
			if (turnState !== null) {
				// 既にステートが追加されている場合は、ターン数値を更新する
				turnState.setTurn(state.getTurn());
			}
			else {
				if (count < DataConfig.getMaxStateCount()) {
					turnState = editor.addTurnStateData(list, state);
				}
			}
		}
		else if (increaseType === IncreaseType.DECREASE) {
			editor.deleteTurnStateData(list, state);
		}
		else if (increaseType === IncreaseType.ALLRELEASE) {
			editor.deleteAllTurnStateData(list);
		}
		
		MapHpControl.updateHp(unit);
		
		return turnState;
	},
	
	// 「ターン毎のボーナス減少値」を考慮したパラメータ値を取得する
	getStateParameter: function(unit, index) {
		var i;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		var value = 0;
		
		for (i = 0; i < count; i++) {
			value += ParamGroup.getDopingParameter(list.getData(i), index);
		}
		
		return value;
	},
	
	// ユニットに設定されているステートのターンを減少させる
	decreaseTurn: function(list) {
		var i, j, count, count2, unit, arr, list2, turn, turnState;
		
		count = list.getCount();
		for (i = 0; i < count; i++) {
			arr = [];
			unit = list.getData(i);
			list2 = unit.getTurnStateList();
			count2 = list2.getCount();
			for (j = 0; j < count2; j++) {
				turnState = list2.getData(j);
				turn = turnState.getTurn();
				if (turn <= 0) {
					continue;
				}
				
				// ターンを1つ減少させ、新たに設定する
				turn--;
				turnState.setTurn(turn);
				if (turn <= 0) {
					// ステートを後で解除するために配列へ保存する
					arr.push(turnState.getState());
				}
			}
			
			count2 = arr.length;
			for (j = 0; j < count2; j++) {
				this.arrangeState(unit, arr[j], IncreaseType.DECREASE);
			}
		}
	},
	
	// unitがstateを受けるのを無効にできるか調べる
	isStateBlocked: function(unit, targetUnit, state) {
		var i, count, item, stateGroup;
		
		if (state === null) {
			return false;
		}
		
		if (state.isBadState()) {
			// ユニットがバッドステートを無効にできるか調べる
			if (unit.isBadStateGuard()) {
				return true;
			}
			
			// スキルでバッドステートを無効にできるか調べる
			if (SkillControl.getBattleSkillFromFlag(unit, targetUnit, SkillType.INVALID, InvalidFlag.BADSTATE) !== null) {
				return true;
			}
		}
		
		count = UnitItemControl.getPossessionItemCount(unit);
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item === null) {
				continue;
			}
			
			if (item.isWeapon()) {
				continue;
			}
			
			// アイテムの「耐性ステート」を考慮してもよいか確認する
			if (!this._IsGuardStateCheckEnabled(unit, targetUnit, state, item)) {
				continue;
			}
			
			// アイテムの「耐性ステート」を確認する
			stateGroup = item.getStateGroup();
			if (this.isStateGroupEnabled(state, stateGroup)) {
				return true;
			}
		}
		
		return false;
	},
	
	// ユニットに設定されているステートをstateGroupが回復できるか調べる
	isStateRecoverable: function(unit, stateGroup) {
		var i, state;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			state = list.getData(i).getState();
			if (this.isStateGroupEnabled(state, stateGroup)) {
				return true;
			}
		}
		
		return false;
	},
	
	// stateGroupがstateを処理できるか調べる
	isStateGroupEnabled: function(state, stateGroup) {
		var i, count, refList;
		
		// ステートが「バッドステート」の場合は、「全バッドステートを対象」が設定されているか調べる
		if (state.isBadState() && stateGroup.isAllBadState()) {
			return true;
		}
		else {
			refList = stateGroup.getStateReferenceList();
			count = refList.getTypeCount();
			for (i = 0; i < count; i++) {
				if (state === refList.getTypeData(i)) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	// 主に自軍ターンで、そのユニットを動作させれるか調べる目的で使用する
	isTargetControllable: function(unit) {
		var i, state, option;
		var list = unit.getTurnStateList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			state = list.getData(i).getState();
			option = state.getBadStateOption();
			// 「行動禁止」、「暴走」、「自動AI」のいずれかを含む場合、そのユニットは動作できないものと判定する
			if (option === BadStateOption.NOACTION || option === BadStateOption.BERSERK || option === BadStateOption.AUTO) {
				return false;
			}
		}
		
		return true;
	},
	
	_IsGuardStateCheckEnabled: function(unit, targetUnit, state, item) {
		return true;
		// 現状、常にtrueを返しているが、
		// isItemUsableを呼び出すことで、アイテムを使用できる場合のみ、
		// 「耐性ステート」を機能させることができる。
		// return ItemControl.isItemUsable(unit, item);
	}
};
