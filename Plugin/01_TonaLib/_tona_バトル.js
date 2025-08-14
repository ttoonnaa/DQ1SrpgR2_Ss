
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

	// ★追加：「スキル：金運」の処理を追加
	straightFlow.pushFlowEntry(tona_RichQuickEndFlow);

	tona_PreAttack_pushFlowEntriesEnd.call(this, straightFlow);
};


