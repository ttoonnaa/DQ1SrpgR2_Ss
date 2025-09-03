
// *****************************************************************************************************************************
// PreAttack
// -----------------------------------------------------------------------------------------------------------------------------
//		復活の石の処理
//		金運の処理
// -----------------------------------------------------------------------------------------------------------------------------

var tona_PreAttack_pushFlowEntriesStart = PreAttack._pushFlowEntriesStart;

PreAttack._pushFlowEntriesStart = function(straightFlow) {

	tona_PreAttack_pushFlowEntriesStart.call(this, straightFlow);
};

var tona_PreAttack_pushFlowEntriesEnd = PreAttack._pushFlowEntriesEnd;

PreAttack._pushFlowEntriesEnd = function(straightFlow) {

	// ★追加：復活の石の処理を追加
	straightFlow.pushFlowEntry(tona_RevivalFlow);

	// ★追加：「スキル：金運」の処理を追加
	straightFlow.pushFlowEntry(tona_RichQuickEndFlow);

	tona_PreAttack_pushFlowEntriesEnd.call(this, straightFlow);
};

// *****************************************************************************************************************************
// RealBattleTable
// -----------------------------------------------------------------------------------------------------------------------------

var _RealBattleTable_pushFlowEntriesActionStart = RealBattleTable._pushFlowEntriesActionStart;

RealBattleTable._pushFlowEntriesActionStart = function(straightFlow) {

    // ★追加：クリティカルのカットインフロー
    straightFlow.pushFlowEntry(tona_CriticalCutinFlowEntry);

    _RealBattleTable_pushFlowEntriesActionStart.call(this, straightFlow);
};

// *****************************************************************************************************************************
// クリティカルのカットインフロー
// -----------------------------------------------------------------------------------------------------------------------------

var tona_CriticalCutinFlowEntry = defineObject(BaseCutinFlowEntry,
{
    _getCutinAnime: function(battleTable) {

		var attackParam = AttackControl.getAttackParam();
        var order = battleTable.getBattleObject().getAttackOrder();

        // ▲カットインを出してみる
        if (order.getCurrentIndex() == 0) {

            var animeList = root.getBaseData().getEffectAnimationList(false);
            var animeData = animeList.getDataFromId(tona_Setting.criticalCutinAnimeId);
            root.log(animeData.getName());
            return animeData;
        }

        return null;
    }
});
