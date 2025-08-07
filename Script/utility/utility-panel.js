
var WavePanel = defineObject(BaseObject,
{
	_imageScroller: null,
	
	initialize: function() {
		this._imageScroller = createObject(ImageScroller);
		this._imageScroller.setImageSizeAndDispaySize(UIFormat.PANEL_WIDTH, UIFormat.PANEL_HEIGHT,
			Math.floor(UIFormat.PANEL_WIDTH / 2), UIFormat.PANEL_HEIGHT);
			
		this._imageScroller.setSpace(1);
		this._imageScroller.startScroll(ImageScrollerType.HORZ);
	},
	
	moveWavePanel: function() {
		this._imageScroller.moveImageScroller();
		
		return MoveResult.CONTINUE;
	},
	
	drawWavePanel: function(x, y, pic) {
		this._imageScroller.drawImageScroller(x, y, pic);
	},
	
	getScrollCount: function() {
		return this._imageScroller.getScrollCount();
	}
}
);

var FadePanel = defineObject(BaseObject,
{
	_counter: null,
	
	initialize: function() {
		this._counter = createObject(VolumeCounter);
		this._counter.disableGameAcceleration();
	},
	
	moveFadePanel: function() {
		this._counter.moveVolumeCounter();
		return MoveResult.CONTINUE;
	},
	
	drawFadePanel: function(x, y, color, alpha) {
		root.getGraphicsManager().fillRange(x, y, GraphicsFormat.MAPCHIP_WIDTH, GraphicsFormat.MAPCHIP_HEIGHT, color, alpha);
	},
	
	getBright: function() {
		return this._counter.getVolume();
	}
}
);

var MapLightType = {
	NORMAL: 0,
	MOVE: 1,
	RANGE: 2
};

var MapChipLight = defineObject(BaseObject,
{
	_indexArray: null,
	_fadePanel: null,
	_wavePanel: null,
	_type: 0,
	
	initialize: function() {
		this.endLight();
		this._fadePanel = createObject(FadePanel);
		this._wavePanel = createObject(WavePanel);
	},
	
	setLightType: function(type) {
		this._type = type;
	},
	
	setIndexArray: function(indexArray) {
		this._indexArray = indexArray;
	},
	
	moveLight: function() {
		if (this._type === MapLightType.NORMAL) {
			this._fadePanel.moveFadePanel();
		}
		else {
			this._wavePanel.moveWavePanel();
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawLight: function() {
		if (this._type === MapLightType.NORMAL) {
			root.drawFadeLight(this._indexArray, this._getColor(), this._getAlpha());
		}
		else if (this._type === MapLightType.MOVE) {
			root.drawWavePanel(this._indexArray, this._getMoveImage(), this._wavePanel.getScrollCount());
		}
		else if (this._type === MapLightType.RANGE) {
			root.drawWavePanel(this._indexArray, this._getRangeImage(), this._wavePanel.getScrollCount());
		}
	},
	
	drawLightClassic: function() {
		var i, x, y, index;
		var count = this._indexArray.length;
		var chipWidth = GraphicsFormat.MAPCHIP_WIDTH;
		var chipHeight = GraphicsFormat.MAPCHIP_HEIGHT;
		var xScroll = root.getCurrentSession().getScrollPixelX();
		var yScroll = root.getCurrentSession().getScrollPixelY();
		var maxWidth = root.getGameAreaWidth();
		var maxHeight = root.getGameAreaHeight();
		var picMove = this._getMoveImage();
		var picRange = this._getRangeImage();
		
		for (i = 0; i < count; i++) {
			index = this._indexArray[i];
			x = (CurrentMap.getX(index) * chipWidth) - xScroll;
			y = (CurrentMap.getY(index) * chipHeight) - yScroll;
			
			if ((x >= -chipWidth && y >= -chipHeight) && x < maxWidth && y < maxHeight) {
				if (this._type === MapLightType.NORMAL) {
					this._fadePanel.drawFadePanel(x, y, this._getColor(), this._getAlpha());
				}
				else if (this._type === MapLightType.MOVE) {
					this._wavePanel.drawWavePanel(x, y, picMove);
				}
				else if (this._type === MapLightType.RANGE) {
					this._wavePanel.drawWavePanel(x, y, picRange);
				}
			}
		}
	},
	
	endLight: function() {
		this._indexArray = [];
	},
	
	_getColor: function() {
		return 0xffffff;
	},
	
	_getAlpha: function() {
		return 128;
	},
	
	_getMoveImage: function() {
		return root.queryUI('move_panel');
	},
	
	_getRangeImage: function() {
		return root.queryUI('range_panel');
	}
}
);

var UnitRangePanel = defineObject(BaseObject,
{
	_x: 0,
	_y: 0,
	_unit: null,
	_mapChipLight: null,
	_mapChipLightWeapon: null,
	_simulator: null,
	
	initialize: function() {
		this._mapChipLight = createObject(MapChipLight);
		this._mapChipLightWeapon = createObject(MapChipLight);
		
		this._simulator = root.getCurrentSession().createMapSimulator();
		// マップ上のパネル表示では、「通れる地形」を考慮しない
		this._simulator.disableRestrictedPass();
	},
	
	setUnit: function(unit) {
		this._unit = unit;
		if (unit === null) {
			return;
		}
		
		this._x = unit.getMapX();
		this._y = unit.getMapY();
		
		this._setRangeData();
	},
	
	setRepeatUnit: function(unit) {
		this._unit = unit;
		if (unit === null) {
			return;
		}
		
		this._x = unit.getMapX();
		this._y = unit.getMapY();
		
		this._setRepeatRangeData();
	},
	
	moveRangePanel: function() {
		if (this._unit === null) {
			return MoveResult.CONTINUE;
		}
		
		this._mapChipLight.moveLight();
		this._mapChipLightWeapon.moveLight();
		
		return MoveResult.CONTINUE;
	},
	
	drawRangePanel: function() {
		if (!this._isRangeDrawable()) {
			return;
		}
		
		this._mapChipLight.drawLight();
		this._mapChipLightWeapon.drawLight();
	},
	
	isMoveArea: function(x, y) {
		var index = CurrentMap.getIndex(x, y);
		
		if (index === -1) {
			return false;
		}
		
		return this._simulator.getSimulationMovePoint(index) !== AIValue.MAX_MOVE;
	},
	
	getSimulator: function() {
		return this._simulator;
	},
	
	getUnitAttackRange: function(unit) {
		var i, item, count, rangeMetrics;
		var startRange = 99;
		var endRange = 0;
		var obj = {};
		
		if (unit.getUnitType() === UnitType.PLAYER) {
			// 自軍の場合は、装備武器を参照する
			item = ItemControl.getEquippedWeapon(unit);
			if (item !== null) {
				startRange = item.getStartRange();
				endRange = item.getEndRange();
			}
		}
		else {
			// 自軍でない場合は、最も射程がある武器を参照する
			count = UnitItemControl.getPossessionItemCount(unit);
			for (i = 0; i < count; i++) {
				item = UnitItemControl.getItem(unit, i);
				rangeMetrics = this._getRangeMetricsFromItem(unit, item);
				if (rangeMetrics !== null) {
					if (rangeMetrics.startRange < startRange) {
						startRange = rangeMetrics.startRange;
					}
					if (rangeMetrics.endRange > endRange) {
						endRange = rangeMetrics.endRange;
					}
				}
			}
		}
		
		obj.startRange = startRange;
		obj.endRange = endRange;
		obj.mov = this._getRangeMov(unit);
		
		return obj;
	},
	
	_isRangeDrawable: function() {
		if (this._unit === null) {
			return false;
		}
		
		if (PosChecker.getUnitFromPos(this._x, this._y) !== this._unit) {
			return false;
		}
		
		if (this._unit.isWait()) {
			return false;
		}
		
		return true;
	},
	
	_getRangeMov: function(unit) {
		var mov;
		
		if (unit.isMovePanelVisible()) {
			mov = ParamBonus.getMov(unit);
		}
		else {
			mov = 0;
		}
		
		return mov;
	},
	
	_setRangeData: function() {
		var attackRange = this.getUnitAttackRange(this._unit);
		var isWeapon = attackRange.endRange !== 0;
		
		if (isWeapon) {
			this._simulator.startSimulationWeapon(this._unit, attackRange.mov, attackRange.startRange, attackRange.endRange);
		}
		else {
			this._simulator.startSimulation(this._unit, attackRange.mov);
		}
		
		this._setLight(isWeapon);
	},
	
	_setRepeatRangeData: function() {
		var mov = ParamBonus.getMov(this._unit) - this._unit.getMostResentMov();
		
		this._simulator.startSimulation(this._unit, mov);
		this._setLight(false);
	},
	
	_setLight: function(isWeapon) {
		this._mapChipLight.setLightType(MapLightType.MOVE);
		this._mapChipLight.setIndexArray(this._simulator.getSimulationIndexArray());
		if (isWeapon) {
			this._mapChipLightWeapon.setLightType(MapLightType.RANGE);
			this._mapChipLightWeapon.setIndexArray(this._simulator.getSimulationWeaponIndexArray());
		}
		else{
			this._mapChipLightWeapon.endLight();
		}
	},
	
	_getRangeMetricsFromItem: function(unit, item) {
		var rangeMetrics = null;
		
		if (item.isWeapon()) {
			if (ItemControl.isWeaponAvailable(unit, item)) {
				rangeMetrics = StructureBuilder.buildRangeMetrics();
				rangeMetrics.startRange = item.getStartRange();
				rangeMetrics.endRange = item.getEndRange();
			}
		}
		else {
			if (item.getRangeType() === SelectionRangeType.MULTI && (item.getFilterFlag() & UnitFilterFlag.ENEMY)) {
				rangeMetrics = StructureBuilder.buildRangeMetrics();
				rangeMetrics.endRange = item.getRangeValue();
			}
		}
		
		return rangeMetrics;
	}
}
);

var MarkingPanel = defineObject(BaseObject,
{
	_isVisible: false,
	_simulator: null,
	_indexArray: null,
	_indexArrayWeapon: null,
	
	startMarkingPanel: function() {
		if (!EnvironmentControl.isEnemyMarking()) {
			return;
		}
		
		this._isVisible = !this._isVisible;
		
		if (this._isVisible) {
			this.updateMarkingPanel();
		}
		else {
			this.resetMarkingPanel();
		}
		
		this._playVisibleSound();
	},
	
	moveMarkingPanel: function() {
		return MoveResult.CONTINUE;
	},
	
	drawMarkingPanel: function() {
		if (!this.isMarkingEnabled()) {
			return;
		}
		
		root.drawFadeLight(this._indexArray, this._getColor(), this._getAlpha());
		root.drawFadeLight(this._indexArrayWeapon, this._getColor(), this._getAlpha());
	},
	
	updateMarkingPanel: function() {
		if (!this.isMarkingEnabled()) {
			return;
		}
		
		this._simulator = root.getCurrentSession().createMapSimulator();
		this._simulator.startSimulationWeaponAll(UnitFilterFlag.ENEMY);
		
		this._indexArray = this._simulator.getSimulationIndexArray();
		this._indexArrayWeapon = this._simulator.getSimulationWeaponIndexArray();
	},
	
	updateMarkingPanelFromUnit: function(unit) {
		if (!this.isMarkingEnabled()) {
			return;
		}
		
		// startSimulationWeaponAllで全体マーキングがされている中、
		// 一人のユニットの現在位置が変化したからといって、
		// マーキングを一から再構築するのはコストが掛かる。
		// startSimulationWeaponPlusは、startSimulationWeaponAllのマーキング結果に追加する形でマーキングするため、
		// 高速に実行される(ただし漏れが生じることがある)。
		this._simulator.startSimulationWeaponPlus(unit);
		
		this._indexArray = this._simulator.getSimulationIndexArray();
		this._indexArrayWeapon = this._simulator.getSimulationWeaponIndexArray();
	},
	
	resetMarkingPanel: function() {
		this._isVisible = false;
		this._simulator = null;
		this._indexArray = null;
		this._indexArrayWeapon = null;
	},
	
	isMarkingEnabled: function() {
		if (!this._isVisible) {
			return false;
		}
		
		if (!EnvironmentControl.isEnemyMarking()) {
			return false;
		}
		
		if (!root.isSystemSettings(SystemSettingsType.MARKING)) {
			return false;
		}
		
		return true;
	},
	
	_getColor: function() {
		return 0xffdc00;
	},
	
	_getAlpha: function() {
		return 128;
	},
	
	_playVisibleSound: function() {
		MediaControl.soundDirect('commandselect');
	}
}
);
