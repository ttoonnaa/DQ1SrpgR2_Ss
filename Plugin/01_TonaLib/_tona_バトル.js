
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
// RealEffect
// -----------------------------------------------------------------------------------------------------------------------------

RealEffect.setupRealEffect = function(anime, x, y, isRight, realBattle) {
	var motionParam;

	this._realBattle = realBattle;

	if (anime === null) {
		return null;
	}

	motionParam = StructureBuilder.buildMotionParam();
	motionParam.animeData = anime;
	motionParam.x = x;
	motionParam.y = y;
	motionParam.isRight = isRight;
	motionParam.motionId = 0;
	motionParam.unit = realBattle.getActiveBattler().getUnit();        // ★追加：アクティブバトラーのユニットを渡しておく

	this._motion = createObject(AnimeMotion);
	this._motion.setMotionParam(motionParam);

	return this._motion;
};

// *****************************************************************************************************************************
// AnimeSimple
// -----------------------------------------------------------------------------------------------------------------------------

AnimeSimple._unit = null;

AnimeSimple.setUnit = function(unit) {
    this._unit = unit;
};

AnimeSimple._getMotionPicture = function(frameIndex, i, animeRenderParam) {
	var list, isRuntime, pic;
	var base = root.getBaseData();
	var handle = this._animeData.getSpriteGraphicsHandle(this._motionId, frameIndex, i);
	var id = handle.getResourceId();
	var handleType = handle.getHandleType();
	var colorIndex =  handle.getColorIndex();
	var graphicsType = this._animeData.getSpriteGraphicsType(this._motionId, frameIndex, i);

	if (handleType === ResourceHandleType.ORIGINAL) {
		isRuntime = false;
	}
	else if (handleType === ResourceHandleType.RUNTIME) {
		isRuntime = true;
	}
	else {
		return null;
	}

	if (this._isColorChangeEnabled(frameIndex, i, animeRenderParam)) {
		colorIndex = animeRenderParam.motionColorIndex;
	}

	pic = tona_UnitControl.changeCriticalCutinImage(this._unit, graphicsType, isRuntime, id, colorIndex);		// ★追加：ユニットによって画像を入れ替える

	AnimePerformanceHelper.pickup(pic, this._parentAnimeMotion);

	return pic;
};

// *****************************************************************************************************************************
// AnimeMotion
// -----------------------------------------------------------------------------------------------------------------------------

AnimeMotion.setMotionParam = function(motionParam) {
	this._unit = motionParam.unit;
	this._animeData = motionParam.animeData;
	this._versusType = motionParam.versusType;
	this._xBase = [];
	this._yBase = [];
	this._animeRenderParam = StructureBuilder.buildAnimeRenderParam();
	this._animeRenderParam.alpha = -1;
	this._animeRenderParam.isRight = motionParam.isRight;
	this._animeRenderParam.motionColorIndex = motionParam.motionColorIndex;
	this._animeRenderParam.parentMotion = this;
	this._rangeType = EffectRangeType.NONE;
	this._isVolume = false;

	this._counter = createObject(CycleCounter);
	this._volumeCounter = createObject(VolumeCounter);
	this._animeSimple = createObject(AnimeSimple);

	// モーションではなく、エフェクトの場合はnullになっている
	if (this._animeData === null) {
		this._animeData = BattlerChecker.findBattleAnime(this._unit.getClass(), null);
	}

	this._animeSimple.setAnimeData(this._animeData);
	this._animeSimple.setAnimeMotion(this);
    this._animeSimple.setUnit(this._unit);            // ★追加：ユニットを参照できるようにする

	if (this._animeData !== null) {
		this._includedResourceCount = this._animeData.getIncludedResourceCount();
	}

	this._xKey = motionParam.x;
	this._yKey = motionParam.y;

	// 既定のモーションIDが設定されているかどうか調べる
	if (motionParam.motionId !== -1) {
		this.setMotionId(motionParam.motionId);
	}
};

// *****************************************************************************************************************************
// AnimeMotion
// -----------------------------------------------------------------------------------------------------------------------------

AnimeMotion._checkSound = function() {
	var soundHandle;

	if (this._isSoundEnabled()) {
		soundHandle = this._animeData.getSoundHandle(this._motionId, this._frameIndex);
		soundHandle = tona_UnitControl.changeCriticalCutinSound(this._unit, soundHandle);		// ★追加：ユニットによって音を入れ替える
		MediaControl.soundPlay(soundHandle);
	}
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
            return animeData;
        }

        return null;
    }
});
