
var SimulateMove = defineObject(BaseObject,
{
	_unit: null,
	_moveCount: 0,
	_moveMaxCount: 0,
	_xPixel: 0,
	_yPixel: 0,
	_isMoveFinal: false,
	_dxSpeedValue: 0,
	_dySpeedValue: 0,
	_unitCounter: null,
	_moveCource: null,
	
	createCource: function(unit, x, y, simulator) {
		var index = CurrentMap.getIndex(x, y);
		
		return CourceBuilder.createRangeCource(unit, index, simulator);
	},
	
	getGoalPos: function(unit, moveCource) {
		var i, direction;
		var count = moveCource.length;
		var x = unit.getMapX();
		var y = unit.getMapY();
		
		for (i = 0; i < count; i++) {
			direction = moveCource[i];
			x += XPoint[direction];
			y += YPoint[direction];
		}
		
		return createPos(x, y);
	},
	
	skipMove: function(unit, moveCource) {
		var pos = this.getGoalPos(unit, moveCource);
		
		unit.setMapX(pos.x);
		unit.setMapY(pos.y);
		
		this._endMove(unit);
	},
	
	startMove: function(unit, moveCource) {
		var i;
		var moveMaxCount = moveCource.length;
		
		// 消費移動力を保存
		this._saveMostResentMov(unit, moveCource);
		
		// 0の場合は、現在位置から移動する必要がない
		if (moveMaxCount === 0) {
			this._endMove(unit);
			return;
		}
		
		this._unit = unit;
		this._moveCount = 0;
		this._moveMaxCount = moveMaxCount;
		this._xPixel = this._unit.getMapX() * GraphicsFormat.MAPCHIP_WIDTH;
		this._yPixel = this._unit.getMapY() * GraphicsFormat.MAPCHIP_HEIGHT;
		this._isMoveFinal = false;
		this._dxSpeedValue = this._getUnitSppedValue(GraphicsFormat.MAPCHIP_WIDTH);
		this._dySpeedValue = this._getUnitSppedValue(GraphicsFormat.MAPCHIP_HEIGHT);
		this._unitCounter = createObject(UnitCounter);
		
		this._moveCource = [];
		for (i = 0; i < moveMaxCount; i++) {
			this._moveCource[i] = moveCource[i];
		}
		
		this._unit.setDirection(moveCource[0]);
		
		// 移動時のユニットは明示的に描画するため、デフォルトの描画を無効にする
		this._unit.setInvisible(true);
	},
	
	noMove: function(unit) {
		unit.setDirection(DirectionType.NULL);
		unit.setMostResentMov(0);
	},
	
	moveUnit: function() {
		var x, y;
		var dx = this._dxSpeedValue;
		var dy = this._dySpeedValue;
		var chipWidth = GraphicsFormat.MAPCHIP_WIDTH;
		var chipHeight = GraphicsFormat.MAPCHIP_HEIGHT;
		
		if (this._isMoveFinal) {
			return MoveResult.END;
		}
		
		if (DataConfig.isHighPerformance()) {
			dx /= 2;
			dy /= 2;
		}
		
		this._controlScroll(dx, dy);
		
		this._xPixel += XPoint[this._unit.getDirection()] * dx;
		this._yPixel += YPoint[this._unit.getDirection()] * dy;
		
		if ((this._xPixel % chipWidth) === 0 && (this._yPixel % chipHeight) === 0) {
			this._playMovingSound();
			this._moveCount++;
			if (this._moveCount === this._moveMaxCount) {
				x = Math.floor(this._xPixel / chipWidth);
				y = Math.floor(this._yPixel / chipHeight);
				this._unit.setMapX(x);
				this._unit.setMapY(y); 
				this._endMove(this._unit);
				return MoveResult.END;
			}
			else {
				this._unit.setDirection(this._moveCource[this._moveCount]);
			}
		}
		
		this._unitCounter.moveUnitCounter();
		
		return MoveResult.CONTINUE;
	},
	
	drawUnit: function() {
		var unitRenderParam = StructureBuilder.buildUnitRenderParam();
		
		if (this._isMoveFinal) {
			return;
		}
		
		unitRenderParam.direction = this._unit.getDirection();
		unitRenderParam.animationIndex = this._unitCounter.getAnimationIndexFromUnit(this._unit);
		unitRenderParam.isScroll = true;
		UnitRenderer.drawScrollUnit(this._unit, this._xPixel, this._yPixel, unitRenderParam);
	},
	
	_saveMostResentMov: function(unit, moveCource) {
		var i, direction;
		var count = moveCource.length;
		var n = 0;
		var x = unit.getMapX();
		var y = unit.getMapY();
		
		for (i = 0; i < count; i++) {
			direction = moveCource[i];
			x += XPoint[direction];
			y += YPoint[direction];
			n += PosChecker.getMovePointFromUnit(x, y, unit);
		}
		
		unit.setMostResentMov(n);
	},
	
	_getUnitSppedValue: function(d) {
		var speedType = this._getSpeedType();
		
		if (Miscellaneous.isGameAcceleration()) {
			return d;
		}
		
		if (speedType === SpeedType.NORMAL) {
			d = Math.floor(d / 2);
		}
		else if (speedType === SpeedType.LOW) {
			d = Math.floor(d / 4);
		}
		
		return d;
	},
	
	_getSpeedType: function() {
		return EnvironmentControl.getUnitSpeedType();
	},
	
	_endMove: function(unit) {
		// 移動が終了したため向きを正面にする
		unit.setDirection(DirectionType.NULL);
		
		// 移動が終了したためデフォルトの描画を有効にする
		unit.setInvisible(false);
		
		this._isMoveFinal = true;
	},
	
	_playMovingSound: function() {
		if (this._moveCount % 2 === 0) {
			Miscellaneous.playFootstep(this._unit.getClass());
		}
	},
	
	_controlScroll: function(dx, dy) {
		var x, y;
		
		// 自軍の場合は、移動前に目的地まで既にスクロールしているはず
		if (this._unit.getUnitType() === UnitType.PLAYER) {
			return;
		}
		
		// 移動力が高い敵及び同盟ユニットは、移動時に画面から見えなくなることがある。
		// スクロール値を調整することでこれを防ぐ
		if (!MapView.isVisiblePixel(this._xPixel, this._yPixel)) {
			x = root.getCurrentSession().getScrollPixelX();
			y = root.getCurrentSession().getScrollPixelY();
			
			x += XPoint[this._unit.getDirection()] * dx;
			y += YPoint[this._unit.getDirection()] * dy;
			
			root.getCurrentSession().setScrollPixelX(x);
			root.getCurrentSession().setScrollPixelY(y);
		}
		
		// 上記if文の代わりに下記の処理を実行する方法もあるが、画面の動きが激しくなる
		// MapView.setScrollPixel(this._xPixel, this._yPixel);
	}
}
);

var CourceType = {
	RANGE: 0,
	EXTEND: 1,
	VIRTUAL: 2
};

var CourceBuilder = {
	// createRangeCourceは、ユニットの移動力の分に応じたコースを作成する場合に呼ばれる
	createRangeCource: function(unit, goalIndex, simulator) {
		if (unit.getMapX() === CurrentMap.getX(goalIndex) && unit.getMapY() === CurrentMap.getY(goalIndex)) {
			return [];
		}
		
		return this._createCource(unit, goalIndex, simulator, [], ParamBonus.getMov(unit), CourceType.RANGE);
	},
	
	// イベントコマンドの「ユニットの移動」で「移動先」を指定した場合に呼ばれる
	createLongCource: function(unit, goalIndex, simulator) {
		var cource;
		var moveCount = ParamBonus.getMov(unit);
		var indexArrayDisabled = [];
		
		if (unit.getMapX() === CurrentMap.getX(goalIndex) && unit.getMapY() === CurrentMap.getY(goalIndex)) {
			return [];
		}
		
		cource = this._createCource(unit, goalIndex, simulator, indexArrayDisabled, moveCount, CourceType.VIRTUAL);
		if (cource.length === 0) {
			return [];
		}
		
		return cource;
	},
	
	// 現在の移動力では到達できない遠い場所を目指す場合は、createExtendCourceが呼ばれる
	createExtendCource: function(unit, goalIndex, simulator) {
		var cource;
		var moveCount = ParamBonus.getMov(unit);
		var indexArrayDisabled = [];
		
		if (unit.getMapX() === CurrentMap.getX(goalIndex) && unit.getMapY() === CurrentMap.getY(goalIndex)) {
			return [];
		}
		
		cource = this._createCource(unit, goalIndex, simulator, indexArrayDisabled, moveCount, CourceType.EXTEND);
		if (cource.length === 0) {
			// cource.lengthが0の場合はコースを作れなかったことを意味する。
			// indexArrayDisabled.lengthが0の場合は同じ軍のユニットが塞いでいることが原因でないため、
			// 処理を続行しない。
			if (indexArrayDisabled.length === 0) {
				return [];
			}
			
			// 現在位置<unit.x, unit.y>が(1, 1)で、目標地点<goalIndex>が(10, 1)であると仮定したとき、
			// ユニットの移動力が6であれば、(7, 1)まで移動することが最短経路になる。
			// ただし、その(7, 1)にはユニットと同じ軍の別ユニットが存在している可能性があるため、
			// (7, 1)以外の場所を探す必要がある。
			// この例であれば、indexArrayDisabledに(7, 1)のインデックスが格納されていることになる。
			goalIndex = this._getNewGoalIndex(unit, simulator, indexArrayDisabled, moveCount);
			if (goalIndex === -1) {
				return [];
			}
			
			// 前回の_createCourceで設定した記録を消去
			simulator.resetSimulationMark();
			
			// 新しいgoalIndexでコースを作り直す
			cource = this._createCource(unit, goalIndex, simulator, indexArrayDisabled, moveCount, CourceType.RANGE);
		}
		else {
			this._validCource(unit, cource, simulator, moveCount);
		}
		
		return cource;
	},
	
	// goalIndexへ到達するコースが作れなかった場合、
	// 元からその位置へ移動できなかった可能性もあるが、
	// 異なる軍がその位置を囲っているような場合もある。
	// それを考慮するため、異なる軍の存在を無効にして新しいgoalIndexを取得する。
	getValidGoalIndex: function(unit, goalIndex, simulator, moveAIType) {
		var i, direction, simulatorMap, index, movePoint, cource, blockUnitArray;
		var newGoalIndex = goalIndex;
		var moveCount = ParamBonus.getMov(unit);
		var x = CurrentMap.getX(goalIndex);
		var y = CurrentMap.getY(goalIndex);
		var directionArray = [DirectionType.RIGHT, DirectionType.BOTTOM, DirectionType.LEFT, DirectionType.TOP];
		
		simulatorMap = root.getCurrentSession().createMapSimulator();
		// disableMapUnitを呼び出すことで、マップ上に存在するユニットを無効にする。
		simulatorMap.disableMapUnit();
		simulatorMap.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
		
		// simulatorではなくsimulatorMapを指定することで、マップ上のユニットを除外してコースを作成する
		cource = this._createCource(unit, goalIndex, simulatorMap, [], moveCount, CourceType.VIRTUAL);
		
		for (i = cource.length - 1; i >= 0; i--) {
			direction = directionArray[cource[i]];
			x += XPoint[direction];
			y += YPoint[direction];
			index = CurrentMap.getIndex(x, y);
			movePoint = simulator.getSimulationMovePoint(index);
			if (movePoint !== AIValue.MAX_MOVE) {
				// 移動ポイントが設定されている場所を見つけたので、ここを目標地点とする
				newGoalIndex = index;
				break;
			}
		}
		
		if (moveAIType === MoveAIType.BLOCK || moveAIType === MoveAIType.APPROACH) {
			blockUnitArray = this._getBlockUnitArray(unit, simulator, simulatorMap, goalIndex);
		}
		else {
			blockUnitArray = [];
		}
		
		return {
			goalIndex: newGoalIndex,
			blockUnitArray: blockUnitArray
		};
	},
	
	_getBlockUnitArray: function(unit, simulator, simulatorMap, goalIndex) {
		var i, j, k, x, y, x2, y2, index, list, movePoint, movePointMap, targetCount, targetUnit, mapIndex;
		var filter = FilterControl.getReverseFilter(unit.getUnitType());
		var listArray = FilterControl.getListArray(filter);
		var listCount = listArray.length;
		var blockUnitArray = [];
		
		for (i = 0; i < listCount; i++) {
			list = listArray[i];
			targetCount = list.getCount();
			for (j = 0; j < targetCount; j++) {
				targetUnit = list.getData(j);
				x = targetUnit.getMapX();
				y = targetUnit.getMapY();
				
				mapIndex = CurrentMap.getIndex(x, y);
				if (mapIndex === goalIndex) {
					blockUnitArray.push(targetUnit);
					continue;
				}
				
				for (k = 0; k < DirectionType.COUNT; k++) {
					x2 = x + XPoint[k];
					y2 = y + YPoint[k];
					index = CurrentMap.getIndex(x2, y2);
					if (index === -1) {
						continue;
					}
					movePoint = simulator.getSimulationMovePoint(index);
					movePointMap = simulatorMap.getSimulationMovePoint(index);
					// 移動できなかった場所が、移動できるようになっているか調べる
					if (movePoint === AIValue.MAX_MOVE && movePointMap !== AIValue.MAX_MOVE) {
						if (PosChecker.getUnitFromPos(x2, y2) === null) {
							blockUnitArray.push(targetUnit);
							break;
						}
					}
				}
			}
		}
		
		return blockUnitArray;
	},
	
	_createCource: function(unit, goalIndex, simulator, indexArrayDisabled, moveMaxCount, type) {
		var i, index, x, y, x2, y2, sideIndex, movePoint, newPoint, firstPoint, data, dataNew;
		var dataArray = [];
		var moveCource = [];
		var directionArray = [DirectionType.RIGHT, DirectionType.BOTTOM, DirectionType.LEFT, DirectionType.TOP];
		var xGoal = CurrentMap.getX(goalIndex);
		var yGoal = CurrentMap.getY(goalIndex);
		
		// このデータは、最初のdataArray.popで取得される
		data = {};
		data.x = xGoal;
		data.y = yGoal;
		data.moveCource = [];
		data.moveCount = 0;
		data.direction = -1;
		dataArray.push(data);
		
		movePoint = simulator.getSimulationMovePoint(goalIndex);
		firstPoint = movePoint;
		
		// 移動コースの作成は、ユニットの現在位置からgoalIndexまでを調べるのではなく、
		// goalIndexを開始位置としてmovePointが0になるまでを調べている。
		// ユニットが現在位置の移動ポイントは0であるためこの方法は成立する。
		for (;;) {
			data = dataArray.pop();
			if (typeof data === 'undefined') {
				moveCource = [];
				break;
			}
			
			x = data.x;
			y = data.y;
			index = CurrentMap.getIndex(x, y);
			movePoint = simulator.getSimulationMovePoint(index);
			// movePointが0の場合は、ユニットの現在位置
			if (movePoint === 0) {
				// 一回の移動で到達できるか調べる
				if (type !== CourceType.VIRTUAL && firstPoint <= moveMaxCount) {
					if (PosChecker.getUnitFromPos(xGoal, yGoal) !== null) {
						// goalIndexにユニットが存在したため、そこへ移動できないことを記録する
						indexArrayDisabled.push(CurrentMap.getIndex(xGoal, yGoal));
						return [];
					}
				}
				
				// ユニットの現在位置まで到達できたためループを抜ける
				moveCource = data.moveCource;
				break;
			}
			
			sideIndex = this._getSideIndex(x, y, movePoint, simulator);
			if (sideIndex === -1) {
				continue;
			}
			
			i = sideIndex;
			x2 = x + XPoint[i];
			y2 = y + YPoint[i];
			index = CurrentMap.getIndex(x2, y2);
			newPoint = simulator.getSimulationMovePoint(index);
			
			// 調べたことを記録する
			simulator.setSimulationMark(index, true);
			
			if (type === CourceType.EXTEND) {
				// ユニットが一回の移動で到達できる最も遠い位置かどうか
				if (movePoint > moveMaxCount && newPoint <= moveMaxCount) {
					// (x2, y2)にユニットが存在する場合は、移動時に重複してしまうため、
					// コースとして扱わないようにする。
					if (PosChecker.getUnitFromPos(x2, y2) !== null) {
						indexArrayDisabled.push(CurrentMap.getIndex(x2, y2));
						continue;
					}
				}
			}
			
			dataNew = {};
			dataNew.x = x2;
			dataNew.y = y2;
			dataNew.moveCource = this._copyCource(data.moveCource);
			dataNew.moveCource.push(directionArray[i]);
			dataNew.direction = i;
			
			dataArray.push(dataNew);
		}
		
		// goalIndexからユニットの現在位置という移動コースを逆にする
		this._reverseCource(moveCource);
		
		return moveCource;
	},
	
	_getSideIndex: function(x, y, movePoint, simulator) {
		var i, x2, y2, index, newPoint;
		var sideIndex = -1;
		
		for (i = 0; i < DirectionType.COUNT; i++) {
			x2 = x + XPoint[i];
			y2 = y + YPoint[i];
			
			index = CurrentMap.getIndex(x2, y2);
			if (index === -1) {
				continue;
			}
			
			newPoint = simulator.getSimulationMovePoint(index);
			
			// 新しい位置の移動ポイント(newPoint)が現在の移動ポイント(movePoint)より低い場合は、
			// その新しい位置を確認するようにする。
			if (newPoint < movePoint) {
				// 指定indexの位置が記録されていないか調べる
				if (!simulator.isSimulationMark(index)) {
					// movePointを更新することで、より低い移動ポイントを探せるようにする
					movePoint = newPoint;
					sideIndex = i;
				}
			}
		}
		
		return sideIndex;
	},
	
	// 移動したい場所にユニットが存在して移動できないため、代わりとなる位置のindexを取得する。
	_getNewGoalIndex: function(unit, simulator, indexArrayDisabled, moveMaxCount) {
		var i, j, simulatorBlock, movePoint, mapIndex, xPrev, yPrev, count;
		var x = CurrentMap.getX(indexArrayDisabled[0]);
		var y = CurrentMap.getY(indexArrayDisabled[0]);
		var curPoint = simulator.getSimulationMovePoint(CurrentMap.getIndex(unit.getMapX(), unit.getMapY()));
		
		// 目標地点を元に、移動範囲を作成する。
		// unitを一時的に到達できない位置に変更しておく。
		xPrev = unit.getMapX();
		yPrev = unit.getMapY();
		unit.setMapX(x);
		unit.setMapY(y);
		simulatorBlock = root.getCurrentSession().createMapSimulator();
		simulatorBlock.startSimulation(unit, moveMaxCount);
		unit.setMapX(xPrev);
		unit.setMapY(yPrev);
		
		count = simulatorBlock.getLoopCount();
		
		// iが1から始まることから、低い移動ポイントから調べていく。
		// これは、低い移動ポイントほど目標地点に近いためである。
		for (i = 1; i <= moveMaxCount; i++) {
			for (j = 0; j < count; j++) {
				movePoint = simulatorBlock.getMovePointFromLoopIndex(j);
				if (i !== movePoint) {
					continue;
				}
				
				mapIndex = simulatorBlock.getPosIndexFromLoopIndex(j);	
				
				movePoint = simulator.getSimulationMovePoint(mapIndex);
				
				// 移動可能範囲内であるかを調べる
				if (movePoint <= moveMaxCount) {
					// 現在位置から遠い方向に向かわないかを調べる
					if (curPoint >= movePoint) {
						return -1;
					}
					
					if (PosChecker.getUnitFromPos(CurrentMap.getX(mapIndex), CurrentMap.getY(mapIndex)) === null) {
						// ユニットが存在しないため、この位置を目標地点とする
						return mapIndex;
					}
				}
			}
		}
		
		return -1;
	},
	
	_validCource: function(unit, cource, simulator, moveCount) {
		var i, dx, dy, direction, index;
		var n = cource.length;
		var x = unit.getMapX();
		var y = unit.getMapY();
		
		// 移動できる数だけ移動
		for (i = 0; i < n; i++) {
			direction = cource[i];
			dx = XPoint[direction];
			dy = YPoint[direction];
			
			index = CurrentMap.getIndex(x + dx, y + dy);
			if (simulator.getSimulationMovePoint(index) > moveCount) {
				// indexが示す位置までは移動力が足りないからループを抜ける
				break;	
			}
			
			x += dx;
			y += dy;
		}
		
		cource.length = i;
	},
	
	_copyCource: function(cource) {
		var i;
		var count = cource.length;
		var newCource = [];
		
		for (i = 0; i < count; i++) {
			newCource[i] = cource[i];
		}
		
		return newCource;
	},
	
	_reverseCource: function(moveCource) {
		var tmp;
		var i = 0;
		var j = moveCource.length - 1;
		
		while (i < j) {
			tmp = moveCource[j];
			moveCource[j] = moveCource[i];
			moveCource[i] = tmp;
			i++;
			j--;
		}
	}
};
