
/*--------------------------------------------------------------------------

　スキル：すり抜け


■概要
　敵をすり抜ける事が出来るスキルが作れるようになります。

■使用法
　カスタムスキルでキーワード'surinuke'を入れたスキルを作成します。
　そのスキルを所持するユニットは、敵をすり抜ける事が出来るようになります。

修正内容
16/ 4/13　新規作成
16/ 4/20　1.071対応
16/ 5/14　別のプラグインでも参照できる拡張設定を追加
17/ 8/20　ZOCプラグインとの併用に対応（競合しないようaliasを強化しました）
18/ 5/23　敵のAIが移動型の時、すり抜けのスキルを考慮していなかったバグを修正

■対応バージョン
　SRPG Studio Version:1.185


■規約
・利用はSRPG Studioを使ったゲームに限ります。
・商用・非商用問いません。フリーです。
・加工等、問題ありません。どんどん改造してください。
・クレジット明記無し　OK
・再配布、転載　OK
・wiki掲載　OK
・SRPG Studio利用規約は遵守してください。

--------------------------------------------------------------------------*/

//-------------------------------------------
// 拡張設定（別のプラグインでも参照する設定）
//-------------------------------------------
var SURINUKE_SKILL_NAME = 'surinuke';		// すり抜けのキーワード




(function() {

//-------------------------------------------
// UnitRangePanelクラス
//-------------------------------------------
var alias = UnitRangePanel.setUnit;
UnitRangePanel.setUnit= function(unit) {
		this._unit = unit;
		if (unit === null) {
			return;
		}
		
		this._simulator = root.getCurrentSession().createMapSimulator();
		// マップ上のパネル表示では、通れる地形を考慮しない
		this._simulator.disableRestrictedPass();

		if (SkillControl.getPossessionCustomSkill(unit, SURINUKE_SKILL_NAME)) { 
			// マップ上に存在するユニットを考慮しない
			this._simulator.disableMapUnit();
		}
		
		alias.call(this, unit);
}


UnitRangePanel.setRepeatUnit= function(unit) {
		this._unit = unit;
		if (unit === null) {
			return;
		}
		
		this._x = unit.getMapX();
		this._y = unit.getMapY();
		
		this._simulator = root.getCurrentSession().createMapSimulator();
		// マップ上のパネル表示では、通れる地形を考慮しない
		this._simulator.disableRestrictedPass();

		if (SkillControl.getPossessionCustomSkill(unit, SURINUKE_SKILL_NAME)) { 
			// マップ上に存在するユニットを考慮しない
			this._simulator.disableMapUnit();
		}

		this._setRepeatRangeData();
}




//-------------------------------------------
// CombinationBuilderクラス
//-------------------------------------------
CombinationBuilder.createMisc= function(unit, simulator) {
		var misc = {};
		
		if (SkillControl.getPossessionCustomSkill(unit, SURINUKE_SKILL_NAME)) { 
			// マップ上に存在するユニットを考慮しない
			simulator.disableMapUnit();
		}

		misc.unit = unit;
		misc.simulator = simulator;
		misc.disableFlag = unit.getAIPattern().getDisableFlag();
		misc.blockList = null;
		misc.combinationArray = [];
		misc.costArrayUnused = [];
		misc.isShortcutEnabled = true;
		
		return misc;
}




//-------------------------------------------
// CombinationManagerクラス
//-------------------------------------------
CombinationManager.getMoveCombination= function(unit, x, y, moveAIType) {
		var simulator, goalIndex, blockUnitArray, data, moveCource, combination;
		
		if (unit.getMapX() === x && unit.getMapY() === y) {
			// 現在位置が目標地点の場合は移動しない
			return StructureBuilder.buildCombination();
		}
		
		simulator = root.getCurrentSession().createMapSimulator();
		
		// AIが移動型の敵がすり抜けスキルを持つ場合の処理
		if (SkillControl.getPossessionCustomSkill(unit, SURINUKE_SKILL_NAME)) { 
			// マップ上に存在するユニットを考慮しない
			simulator.disableMapUnit();
		}
		
		simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
		
		goalIndex = CurrentMap.getIndex(x, y);
		blockUnitArray = [];
		
		if (this._getBlockUnit(unit, x, y) !== null) {
			// 目標地点に相手ユニット(同盟なら敵、敵なら自軍か同盟)がいるため、コースを作らない。
			// 同種ユニットはcreateExtendCourceで調整されるため扱わない。
			moveCource = [];
		}
		else {
			moveCource = CourceBuilder.createExtendCource(unit, goalIndex, simulator);
		}
		
		if (moveCource.length === 0) {
			// goalIndexの位置に移動できないため、代わりとしてなるべくgoalIndexに近い位置を取得する
			data = CourceBuilder.getValidGoalIndex(unit, goalIndex, simulator, moveAIType);
			if (goalIndex !== data.goalIndex) {
				// 新しい目標地点を見つけたので保存
				goalIndex = data.goalIndex;
				// 新しい目標地点を元にコースを作成
				moveCource = CourceBuilder.createExtendCource(unit, goalIndex, simulator);
			}
			
			// 目標地点までの通路を塞いでいたユニット群を保存
			blockUnitArray = data.blockUnitArray;
		}
		
		if (moveAIType === MoveAIType.MOVEONLY || this._isReached(unit, x, y, moveCource)) {
			// 「常に移動のみ」である場合か、目標地点に到達できる場合は、
			// 後続の処理で移動だけが行われる。
		}
		else if (moveAIType === MoveAIType.BLOCK) {
			// 「目標地点が塞がれている場合のみ攻撃」の処理
			combination = this._getBlockCombination(unit, blockUnitArray);
			if (combination !== null) {
				return combination;
			}
		}
		else if (moveAIType === MoveAIType.APPROACH) {
			// 「攻撃できる場合は攻撃」の場合は直ちにgetApproachCombinationを呼び出してもよいが、
			// 塞いでいるユニットがいるならばそれを優先的に狙うべきとして_getBlockCombinationを呼び出している。
			combination = this._getBlockCombination(unit, blockUnitArray);
			if (combination !== null) {
				return combination;
			}
			
			combination = this.getApproachCombination(unit, false);
			if (combination !== null) {
				return combination;
			}
		}
		
		combination = StructureBuilder.buildCombination();
		combination.cource = moveCource;
		
		return combination;
}


})();