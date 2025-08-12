
// *****************************************************************************************************************************
// 盗賊：オートアクション
// -----------------------------------------------------------------------------------------------------------------------------

AutoActionBuilder.tona_buildThiefAction = function(unit, autoActionArray) {

	var treasureId = unit.custom.tona_thiefTreasureId;

	// 宝イベントを探す
	var eventList = root.getCurrentSession().getPlaceEventList();
	var eventCount = eventList.getCount();

	for (var i = 0; i < eventCount; i++) {
		var event = eventList.getData(i);
		if (event.custom.tona_thiefTreasureId == treasureId) {
			if (event.getExecutedMark() == EventExecutedType.FREE) {

				// 未発見の宝を見つけた
				return this.tona_buildThiefTreasureAction(unit, event, autoActionArray);
			}
		}
	}

	return false;
};

// *****************************************************************************************************************************
// 盗賊：オートアクション：宝を見つけた場合のアクションを作成
// -----------------------------------------------------------------------------------------------------------------------------

AutoActionBuilder.tona_buildThiefTreasureAction = function(unit, event, autoActionArray) {

	var patternInfo = unit.getAIPattern().getMovePatternInfo();
	var eventInfo = event.getPlaceEventInfo();
	var x = eventInfo.getX();
	var y = eventInfo.getY();

	// 既に目標地点に到達しているか調べる
	if (unit.getMapX() === x && unit.getMapY() === y) {
		return false;
	}

	var combination = CombinationManager.getMoveCombination(unit, x, y, MoveAIType.MOVEONLY);
	if (combination === null) {
		return this._buildEmptyAction();
	}

	// ゴール地点を計算する（なぜか経路しか返ってこないので自分で計算）
	var goalIndex = this._tona_getThiefGoalIndex(unit, combination);
	var goalX = CurrentMap.getX(goalIndex);
	var goalY = CurrentMap.getY(goalIndex);

	// 辿り着いた場合は宝を奪う
	if (goalX == x && goalY == y) {
		combination.z_event = event;

		this._pushMove(unit, autoActionArray, combination);
		this._tona_pushThiefTreasure(unit, autoActionArray, combination);
	}
	else {

		this._pushMove(unit, autoActionArray, combination);
		this._pushWait(unit, autoActionArray, combination);
	}

	return true;
};

// *****************************************************************************************************************************
// 盗賊：オートアクション：目的地の場所インデックスを取得する
// -----------------------------------------------------------------------------------------------------------------------------

AutoActionBuilder._tona_getThiefGoalIndex = function(unit, combination) {

	var x = unit.getMapX();
	var y = unit.getMapY();
	var length = combination.cource.length;

	for (var i = 0; i < length; i++) {
		var direction = combination.cource[i];

		if (direction == DirectionType.RIGHT) { x += 1; }
		if (direction == DirectionType.BOTTOM) { y += 1; }
		if (direction == DirectionType.LEFT) { x -= 1; }
		if (direction == DirectionType.TOP) { y -= 1; }
	}

	return CurrentMap.getIndex(x, y);
};

// *****************************************************************************************************************************
// 盗賊：オートアクション：宝を奪うアクションを追加する
// -----------------------------------------------------------------------------------------------------------------------------

AutoActionBuilder._tona_pushThiefTreasure = function(unit, autoActionArray, combination) {

	var autoAction = createObject(tona_ThiefTreasureAutoAction);
	autoAction.setAutoActionInfo(unit, combination);
	autoActionArray.push(autoAction);
};

// **************************************************************************************************************************
// 盗賊：オートアクション：宝を奪うアクション本体
// --------------------------------------------------------------------------------------------------------------------------

var tona_ThiefTreasureAutoAction = defineObject(BaseAutoAction, {
	__dummy: null

	, _unit: null
	, _event: null
	, _waitCounter: null

	, setAutoActionInfo: function(unit, combination) {

		this._unit = unit;
		this._event = combination.z_event;
		this._waitCounter = createObject(CycleCounter);
	}

	, enterAutoAction: function() {

		root.log('宝を奪うアクション');

		var event = this._event;
		var eventInfo = this._event.getPlaceEventInfo();

		// イベントを実行済みにする
		event.setExecutedMark(EventExecutedType.EXECUTED);

		// 小屋破壊チップを設定する
		root.getCurrentSession().setMapChipGraphicsHandle(eventInfo.getX() - 1, eventInfo.getY() - 1, true, tona_Utility.getMapChipImageHandle(true, 60, 113));
		root.getCurrentSession().setMapChipGraphicsHandle(eventInfo.getX()    , eventInfo.getY() - 1, true, tona_Utility.getMapChipImageHandle(true, 60, 114));
		root.getCurrentSession().setMapChipGraphicsHandle(eventInfo.getX() + 1, eventInfo.getY() - 1, true, tona_Utility.getMapChipImageHandle(true, 60, 115));
		root.getCurrentSession().setMapChipGraphicsHandle(eventInfo.getX() - 1, eventInfo.getY()    , true, tona_Utility.getMapChipImageHandle(true, 60, 123));
		root.getCurrentSession().setMapChipGraphicsHandle(eventInfo.getX()    , eventInfo.getY()    , true, tona_Utility.getMapChipImageHandle(true, 60, 124));
		root.getCurrentSession().setMapChipGraphicsHandle(eventInfo.getX() - 1, eventInfo.getY()    , true, tona_Utility.getMapChipImageHandle(true, 60, 125));

		// ダメージ効果音
		var mediaHandle = tona_Utility.getSoundHandle(true, 905);
		root.getMediaManager().soundPlay(mediaHandle, 2);

		// ウェイト
		this._waitCounter.setCounterInfo(20);

		return EnterResult.OK;
	}

	, moveAutoAction: function() {

		if (this._waitCounter.moveCycleCounter() !== MoveResult.CONTINUE) {

			// ユニットは死亡扱いにする
			DamageControl.setDeathState(this._unit);

			return MoveResult.END;
		}

		return MoveResult.CONTINUE;
	}
});













