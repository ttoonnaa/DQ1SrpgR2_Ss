
var UnitFusionMode = {
	SLIDE: 0,
	ANIME: 1
};

var UnitFusionEventCommand = defineObject(BaseEventCommand,
{
	_fusionParam: null,
	_fusionAction: null,
	
	enterEventCommandCycle: function() {
		this._prepareEventCommandMemberData();
		
		if (!this._checkEventCommand()) {
			return EnterResult.NOTENTER;
		}
		
		return this._completeEventCommandMemberData();
	},
	
	moveEventCommandCycle: function() {
		return this._fusionAction.moveFusionAction();
	},
	
	drawEventCommandCycle: function() {
		this._fusionAction.drawFusionAction();
	},
	
	mainEventCommand: function() {
		this._fusionAction.skipFusionAction();
	},
	
	_prepareEventCommandMemberData: function() {
		var eventCommandData = root.getEventCommandObject();
		
		this._fusionParam = StructureBuilder.buildFusionParam();
		this._fusionParam.parentUnit = eventCommandData.getUnit();
		this._fusionParam.targetUnit = eventCommandData.getTargetUnit();
		this._fusionParam.fusionData = eventCommandData.getFusionData();
		this._fusionParam.direction = eventCommandData.getDirectionType();
		
		this._fusionAction = this._getFusionAction(eventCommandData.getFusionActionType());
	},
	
	_checkEventCommand: function() {
		if (this._fusionParam.parentUnit === null || !this._fusionAction.setFusionParam(this._fusionParam)) {
			return false;
		}
		
		return this.isEventCommandContinue();
	},
	
	_completeEventCommandMemberData: function() {
		this._fusionAction.openFusionAction();
		
		return EnterResult.OK;
	},
	
	_getFusionAction: function(type) {
		var fusionAction;
		
		if (type === FusionActionType.CATCH) {
			fusionAction = createObject(CatchFusionAction);
		}
		else if (type === FusionActionType.RELEASE) {
			fusionAction = createObject(ReleaseFusionAction);
		}
		else {
			fusionAction = createObject(UnitTradeFusionAction);
		}
		
		return fusionAction;
	}
}
);

var FusionCommonMode = {
	SLIDE: 0,
	ANIME: 1,
	ERASE: 2
};

var BaseFusionAction = defineObject(BaseObject,
{
	_parentUnit: null,
	_slideUnit: null,
	_direction: 0,
	_slideObject: null,
	_dynamicAnime: null,
	
	setFusionCommonObject: function() {
		this._slideObject = createObject(SlideObject);
		this._dynamicAnime = createObject(DynamicAnime);
	},
	
	openFusionAction: function(fusionParam) {
	},
	
	moveFusionAction: function() {
		return MoveResult.END;
	},
	
	drawFusionAction: function() {
		var mode = this.getCycleMode();
		
		if (mode === FusionCommonMode.SLIDE) {
			this._drawSlide();
		}
		else if (mode === FusionCommonMode.ANIME) {
			this._drawAnime();
		}
		else if (mode === FusionCommonMode.ERASE) {
			this._drawErase();
		}
	},
	
	skipFusionAction: function() {
	},
	
	_moveSlide: function() {
		return this._slideObject.moveSlide();
	},
	
	_moveAnime: function() {
		return this._dynamicAnime.moveDynamicAnime();
	},
	
	_drawSlide: function() {
		this._slideObject.drawSlide();
	},
	
	_drawAnime: function() {
		this._dynamicAnime.drawDynamicAnime();
	},
	
	_drawErase: function() {
	},
	
	_changeSlideMode: function() {
		var pixelIndex = 3;
		
		this._slideObject.setSlideData(this._slideUnit, this._direction, pixelIndex);
		this._slideObject.openSlide();
		this.changeCycleMode(FusionCommonMode.SLIDE);
	},
	
	_changeAnimeMode: function() {
		var x = LayoutControl.getPixelX(this._parentUnit.getMapX());
		var y = LayoutControl.getPixelY(this._parentUnit.getMapY());
		var anime = this._getFusionAnime();
		var pos = LayoutControl.getMapAnimationPos(x, y, anime);
		
		this._dynamicAnime.startDynamicAnime(anime, pos.x, pos.y);
		
		this.changeCycleMode(FusionCommonMode.ANIME);
	},
	
	_getFusionAnime: function() {
		return null;
	}
}
);

var CatchFusionAction = defineObject(BaseFusionAction,
{
	_fusionData: null,
	
	setFusionParam: function(fusionParam) {
		var directionArray = [DirectionType.RIGHT, DirectionType.BOTTOM, DirectionType.LEFT, DirectionType.TOP];
		
		this._parentUnit = fusionParam.parentUnit;
		this._fusionData = fusionParam.fusionData;
		this._slideUnit = fusionParam.targetUnit;
		if (this._isFusionParamDisabled()) {
			return false;
		}
		
		if (!this._checkTargetFusionInfo()) {
			return false;
		}
		
		if (!FusionControl.isControllable(this._parentUnit, this._slideUnit, this._fusionData)) {
			return false;
		}
		
		this._direction = PosChecker.getSideDirection(this._parentUnit.getMapX(), this._parentUnit.getMapY(), this._slideUnit.getMapX(), this._slideUnit.getMapY());
		if (this._direction !== DirectionType.NULL) {
			this._direction = directionArray[this._direction];
		}
		
		return true;
	},
	
	openFusionAction: function() {
		this.setFusionCommonObject();
		this._changeSlideMode();
	},
	
	moveFusionAction: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === FusionCommonMode.SLIDE) {
			if (this._moveSlide() !== MoveResult.CONTINUE) {
				this._slideObject.endSlide();
				this._slideUnit.setInvisible(true);
				this._changeAnimeMode();
			}
		}
		else if (mode === FusionCommonMode.ANIME) {
			if (this._moveAnime() !== MoveResult.CONTINUE) {
				this._doCatchAction();
				result = MoveResult.END;
			}
		}
		
		return result;
	},
	
	skipFusionAction: function() {
		this._doCatchAction();
		
		if (this._slideObject !== null) {
			// イベントコマンドでキャッチとリリースを連続で組んでおり、キャッチの瞬間にスキップしたとする。
			// この場合、スライド値が残ったままだと、リリース時に反映されてしまうので初期化しておく。
			// (スキップされたReleaseFusionActionでは_slideObjectがnullなので、この呼び出しができない。)
			this._slideObject.endSlide();
		}
	},
	
	_doCatchAction: function() {
		var metamorphozeData = this._fusionData.getMetamorphozeData();
		
		FusionControl.catchUnit(this._parentUnit, this._slideUnit, this._fusionData);
		
		if (metamorphozeData === null || MetamorphozeControl.getMetamorphozeData(this._parentUnit) !== null) {
			return null;
		}
		
		MetamorphozeControl.startMetamorphoze(this._parentUnit, metamorphozeData);
	},
	
	_getFusionAnime: function() {
		var metamorphozeData = this._fusionData.getMetamorphozeData();
		
		if (metamorphozeData === null || MetamorphozeControl.getMetamorphozeData(this._parentUnit) !== null) {
			return null;
		}
		
		return metamorphozeData.getChangeAnime();
	},
	
	_checkTargetFusionInfo: function() {
		var fusionAction, fusionParam, result;
		var fusionParent = FusionControl.getFusionParent(this._slideUnit);
		var fusionChild = FusionControl.getFusionChild(this._slideUnit);
		
		// これからキャッチするターゲットは、誰かをキャッチしておらず、また誰にもキャッチされていないかどうか
		if (fusionParent === null && fusionChild === null) {
			return true;
		}
		
		// ターゲットが既に誰かをキャッチしていたとして、それでもターゲットのキャッチを強制的に試みるかどうか
		if (!this._isForceCatch()) {
			return false;
		}
		
		fusionParam = StructureBuilder.buildFusionParam();
		
		// ターゲットが誰かをキャッチしているのだから、まず現在キャッチしているユニットをリリースさせる
		if (fusionChild !== null) {
			fusionAction = createObject(ReleaseFusionAction);
			
			fusionParam.parentUnit = this._slideUnit;
			fusionParam.targetUnit = null;
			
			// これからターゲットをキャッチする必要があるので処理は続行しないといけない
			result = true;
		}
		else {
			// 誰かがターゲットをキャッチしているのだから、その誰かとターゲットをトレードすればいい
			fusionAction = createObject(UnitTradeFusionAction);
			
			fusionParam.parentUnit = FusionControl.getFusionParent(this._slideUnit);
			fusionParam.targetUnit = this._parentUnit;
			
			// トレードした時点でキャッチは成立したことになるので処理の続行は必要ない
			result = false;
		}
		
		fusionParam.fusionData = this._fusionData;
		fusionParam.direction = DirectionType.NULL;
		
		fusionAction.setFusionParam(fusionParam);
		fusionAction.skipFusionAction();
		
		return result;
	},
	
	_isForceCatch: function() {
		return true;
	},
	
	_isFusionParamDisabled: function() {
		return this._fusionData === null || this._slideUnit === null || this._slideUnit.getAliveState() !== AliveType.ALIVE;
	}
}
);

var ReleaseFusionAction = defineObject(BaseFusionAction,
{
	_fusionData: null,
	_counter: null,
	_fusionReleaseType: 0,
	
	setFusionParam: function(fusionParam) {
		this._parentUnit = fusionParam.parentUnit;
		this._fusionData = FusionControl.getFusionData(this._parentUnit);
		this._slideUnit = FusionControl.getFusionChild(this._parentUnit);
		if (this._fusionData === null || this._slideUnit === null) {
			return false;
		}
		
		this._initFusionReleaseType();
		
		if (this._fusionReleaseType === FusionReleaseType.ERASE) {
			this._direction = fusionParam.direction;
		}
		else {
			this._direction = this._validDirection(fusionParam.direction);
		}
		
		return true;
	},
	
	openFusionAction: function() {
		this.setFusionCommonObject();
		
		this._counter = createObject(CycleCounter);
		this._counter.setCounterInfo(10);
		
		this._changeAnimeMode();
	},
	
	moveFusionAction: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === FusionCommonMode.ANIME) {
			if (this._moveAnime() !== MoveResult.CONTINUE) {
				this._changeSlideMode();
				this._doReleaseAction();
			}
		}
		else if (mode === FusionCommonMode.SLIDE) {
			if (this._moveSlide() !== MoveResult.CONTINUE) {
				this._slideObject.updateUnitPos();
				this._slideObject.endSlide();
				if (this._fusionReleaseType === FusionReleaseType.ERASE) {
					this._slideUnit.setInvisible(true);
					this.changeCycleMode(FusionCommonMode.ERASE);
				}
				else {
					this._doEndSlideAction();
					result = MoveResult.END;
				}
			}
		}
		else if (mode === FusionCommonMode.ERASE) {
			if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
				this._doEndSlideAction();
				result = MoveResult.END;
			}
		}
		
		return result;
	},
	
	skipFusionAction: function() {
		this._doReleaseAction();
		
		if (this._direction !== DirectionType.NULL) {
			this._slideUnit.setMapX(this._parentUnit.getMapX() + XPoint[this._direction]);
			this._slideUnit.setMapY(this._parentUnit.getMapY() + YPoint[this._direction]);
		}
		
		this._doEndSlideAction();
	},
	
	_doEndSlideAction: function() {
		var type = this._fusionReleaseType;
		
		if (type === FusionReleaseType.WAIT) {
			if (this._parentUnit.getUnitType() === this._slideUnit.getUnitType() && this._parentUnit.getUnitType() === root.getCurrentSession().getTurnType()) {
				this._slideUnit.setWait(true);
			}
		}
		else if (type === FusionReleaseType.ERASE) {
			DamageControl.setReleaseState(this._slideUnit);
		}
		
		if (this._slideObject !== null) {
			// これを忘れると、スキップ時にスライド値が保存されたままになり、ユニットの表示位置がずれる
			this._slideObject.endSlide();
		}
	},
	
	_drawErase: function() {
		var unit = this._slideUnit;
		var x = LayoutControl.getPixelX(unit.getMapX());
		var y = LayoutControl.getPixelY(unit.getMapY());
		var alpha = 255 - (this._counter.getCounter() * 22);
		var unitRenderParam = StructureBuilder.buildUnitRenderParam();
		var colorIndex = unit.getUnitType();
		var animationIndex = MapLayer.getAnimationIndexFromUnit(unit);
		
		if (unit.isWait()) {
			colorIndex = 3;
		}
		
		if (unit.isActionStop()) {
			animationIndex = 1;
		}
		
		unitRenderParam.colorIndex = colorIndex;
		unitRenderParam.animationIndex = animationIndex;
		unitRenderParam.alpha = alpha;
		
		UnitRenderer.drawScrollUnit(unit, x, y, unitRenderParam);
	},
	
	_initFusionReleaseType: function() {
		this._fusionReleaseType = this._fusionData.getFusionReleaseType();
		
		if (!this._isForceWait()) {
			return;
		}
		
		// 「フュージョン攻撃」かつ「リリース後の処理」が「消去」である場合は、対象が敵でなければ待機扱いにする
		if (this._fusionData.getFusionType() === FusionType.ATTACK && this._fusionReleaseType === FusionReleaseType.ERASE) {
			if (this._slideUnit.getUnitType() !== UnitType.ENEMY) {
				this._fusionReleaseType = FusionReleaseType.WAIT;
			}
		}
	},
	
	_isForceWait: function() {
		return true;
	},
	
	_validDirection: function(direction) {
		var pos;
		var x = this._parentUnit.getMapX();
		var y = this._parentUnit.getMapY();
		
		if (direction === DirectionType.NULL) {
			this._slideUnit.setMapX(x);
			this._slideUnit.setMapY(y);
			return DirectionType.NULL;
		}
		
		if (PosChecker.getUnitFromPos(x + XPoint[direction], y + YPoint[direction]) === null) {
			this._slideUnit.setMapX(x);
			this._slideUnit.setMapY(y);
			return direction;
		}
		
		pos = PosChecker.getNearbyPos(this._parentUnit, this._slideUnit);
		if (pos !== null) {
			this._slideUnit.setMapX(pos.x);
			this._slideUnit.setMapY(pos.y);
		}
		
		return DirectionType.NULL;
	},
	
	_doReleaseAction: function() {
		FusionControl.releaseChild(this._parentUnit);
		
		if (this._getMetamorphozeData() === null) {
			return;
		}
		
		MetamorphozeControl.clearMetamorphoze(this._parentUnit);
	},
	
	_getFusionAnime: function() {
		var metamorphozeData = this._getMetamorphozeData();
		
		if (metamorphozeData === null) {
			return null;
		}
		
		return metamorphozeData.getCancelAnime();
	},
	
	_getMetamorphozeData: function() {
		var metamorphozeData = MetamorphozeControl.getMetamorphozeData(this._parentUnit);
		
		if (metamorphozeData === null) {
			return null;
		}
		
		// metamorphozeDataがフュージョンによって生じた形態変化であるかどうかを調べる
		return this._fusionData.getMetamorphozeData() === metamorphozeData ? metamorphozeData : null;
	}
}
);

var UnitTradeFusionAction = defineObject(BaseFusionAction,
{
	_fusionData: null,
	_targetUnit: null,
	
	setFusionParam: function(fusionParam) {
		this._parentUnit = fusionParam.parentUnit;
		this._targetUnit = fusionParam.targetUnit;
		this._fusionData = FusionControl.getFusionData(this._parentUnit);
		this._slideUnit = FusionControl.getFusionChild(this._parentUnit);
		if (this._targetUnit === null || this._fusionData === null || this._slideUnit === null) {
			return false;
		}
		
		if (!FusionControl.isControllable(this._targetUnit, this._slideUnit, this._fusionData)) {
			return false;
		}
		
		this._direction = PosChecker.getSideDirection(this._parentUnit.getMapX(), this._parentUnit.getMapY(), this._targetUnit.getMapX(), this._targetUnit.getMapY());
		
		return true;
	},
	
	openFusionAction: function() {
		this.setFusionCommonObject();
		
		this._slideUnit.setMapX(this._parentUnit.getMapX());
		this._slideUnit.setMapY(this._parentUnit.getMapY());
		
		this._changeAnimeMode();
	},
	
	moveFusionAction: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === FusionCommonMode.ANIME) {
			if (this._moveAnime() !== MoveResult.CONTINUE) {
				this._slideUnit.setInvisible(false);
				this._changeSlideMode();
			}
		}
		else if (mode === FusionCommonMode.SLIDE) {
			if (this._moveSlide() !== MoveResult.CONTINUE) {
				this._slideObject.endSlide();
				FusionControl.tradeChild(this._parentUnit, this._targetUnit);
				result = MoveResult.END;
			}
		}
		
		return result;
	},
	
	skipFusionAction: function() {
		FusionControl.tradeChild(this._parentUnit, this._targetUnit);
	}
}
);
