
// *****************************************************************************************************************************
// カスタムスキル：キーワード
// -----------------------------------------------------------------------------------------------------------------------------

var tona_SkillKeyword = {
	__dummy: null

	, 'スキル：月光': 'tona_スキル：月光'
	, 'スキル：勇敢': 'tona_スキル：勇敢'
	, 'スキル：神速': 'tona_スキル：神速'
	, 'スキル：華炎': 'tona_スキル：華炎'
	, 'スキル：砂陣': 'tona_スキル：砂陣'
	, 'スキル：水鏡': 'tona_スキル：水鏡'
	, 'スキル：滅殺': 'tona_スキル：滅殺'
	, 'スキル：大盾': 'tona_スキル：大盾'
	, 'スキル：練達': 'tona_スキル：練達'
	, 'スキル：金運': 'tona_スキル：金運'
	, 'スキル：復活の石': 'tona_スキル：復活の石'
};

// *****************************************************************************************************************************
// カスタムスキルの発動
// -----------------------------------------------------------------------------------------------------------------------------

SkillRandomizer.isCustomSkillInvokedInternal = function(active, passive, skill, keyword) {

	// 通常のスキルは FASTATTACK や CONTINUOUSATTACK などを個別に処理してる
	// 分ける意味あるのかな？とりあえず全て _isSkillInvokedInternal に流すよ

	return this._isSkillInvokedInternal(active, passive, skill);
};

// *****************************************************************************************************************************
// バトルスキルを取得
//		getBattleSkill の Custom 版がなかったのでここで実装
// -----------------------------------------------------------------------------------------------------------------------------

SkillControl.tona_getBattleCustomSkill = function(active, passive, keyword) {
	var arr = this.getDirectSkillArray(active, SkillType.CUSTOM, keyword);
	var skill = this._returnSkill(SkillType.CUSTOM, arr);

	return this._getBattleSkillInternal(active, passive, skill);
};

// *****************************************************************************************************************************
// ランダムスキル取得コントロール
// -----------------------------------------------------------------------------------------------------------------------------

var tona_RandomSkillControl = { __dummy: null

	, createSkillArray: function(unit) {

		// 確率で覚える
		if (Probability.getProbability(Master.randomSkillProbability)) {

			// 既にそのスキルを持っていた場合、再抽選などはしない
			// つまりスキルを多く持っていると新しく覚える確率は低くなる
			// 調べるのはユニットの追加スキルのみなのでクラススキルなどと重複する可能性はある

			var skillId = Master.randomSkillIds[root.getRandomNumber() % Master.randomSkillIds.length];
			var skill = root.getBaseData().getSkillList().getDataFromId(skillId);
			var list = unit.getSkillReferenceList();
			var count = list.getTypeCount();

			for (var i = 0; i < count; i++) {
				if (list.getTypeData(i) === skill) {
					return [];
				}
			}

			return [skill];
		}

		return [];
	}

	, obtainSkillArray: function(unit, skillArray) {
		var count = skillArray.length;

		for (var i = 0; i < count; i++) {
			var skill = skillArray[i];
			SkillChecker.arrangeSkill(unit, skill, IncreaseType.INCREASE);
		}
	}
};




