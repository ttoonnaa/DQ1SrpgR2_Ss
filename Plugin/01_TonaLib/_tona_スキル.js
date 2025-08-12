
// *****************************************************************************************************************************
// カスタムスキル：キーワード
// -----------------------------------------------------------------------------------------------------------------------------

var tona_SkillKeyword = {
	__dummy: null

	, 'スキル：月光': 'tona_スキル：月光'
	, 'スキル：勇敢': 'tona_スキル：勇敢'
	, 'スキル：神速': 'tona_スキル：神速'
	, 'スキル：滅殺': 'tona_スキル：滅殺'
	, 'スキル：大盾': 'tona_スキル：大盾'
	, 'スキル：練達': 'tona_スキル：練達'
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
