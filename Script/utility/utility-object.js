
var SimpleBalancer = defineObject(BaseObject,
{
	_counter: null,
	_curValue: 0,
	_maxValue: 0,
	_speed: 0,
	_intervalArray: null,
	_limitValue: 0,
	_isMoving: false,
	
	initialize: function() {
		this._counter = createObject(CycleCounter);
	},
	
	setBalancerInfo: function(curValue, maxValue) {
		this._curValue = curValue;
		this._maxValue = maxValue;
		this._speed = 5;
	},
	
	setBalancerSpeed: function(speed) {
		this._speed = speed;
	},
	
	moveBalancer: function() {
		var isLast;
		
		if (this._counter === null) {
			return MoveResult.END;
		}
		
		if (!this._isMoving) {
			return MoveResult.END;
		}
	
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			if (this._isUp) {
				isLast = this._increaseValue();
			}
			else {
				isLast = this._decreaseValue();
			}
			
			// 限界値に到達した。または必要分だけ上昇させたか調べる
			if (isLast) {
				this._isMoving = false;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	startBalancerMove: function(value) {
		this._isUp = value > 0;
		
		// valueの数だけ、this._curValueが増減する。
		// valueの値にthis._curValueがなるわけではない。
		this._intervalArray = this._calculateInterval(value);
		this._limitValue = this._calculateLimitValue(value);
		
		// 現在値と最大値が同一、または上昇値が0であるか調べる
		if (this._curValue === this._limitValue || value === 0) {
			this._isMoving = false;
		}
		else {
			this._counter.setCounterInfo(0);
			this._isMoving = true;
		}
	},
	
	getCurrentValue: function() {
		return this._curValue;
	},
	
	setCurrentValue: function(value) {
		this._curValue = value;
	},
	
	getMaxValue: function() {
		return this._maxValue;
	},
	
	getLimitValue: function() {
		return this._limitValue;
	},
	
	isMoving: function() {
		return this._isMoving;
	},
	
	_increaseValue: function() {
		var d = this._intervalArray[0];
		
		this._intervalArray.shift();
		
		this._curValue += d;
		if (this._curValue >= this._limitValue) {
			this._curValue = this._limitValue;
			return true;
		}
		
		return false;
	},
	
	_decreaseValue: function() {
		var d = this._intervalArray[0];
		
		this._intervalArray.shift();
		
		this._curValue -= d;
		if (this._curValue <= this._limitValue) {
			this._curValue = this._limitValue;
			return true;
		}
		
		return false;
	},
	
	_calculateInterval: function(value) {
		var i, interval, mod, arr;
		var count = this._speed;
		
		if (value < 0) {
			value *= -1;
		}
		
		arr = new Array(count);
		
		interval = Math.floor(value / count);
		mod = Math.floor(value % count);
		
		for (i = 0; i < count; i++) {
			arr[i] = interval;
		}
		
		for (i = 0; i < mod; i++) {
			arr[i]++;
		}
			
		return arr;
	},
	
	_calculateLimitValue: function(value) {
		var max, min, limitValue;
		
		if (this._isUp > 0) {
			max = this._curValue + value;
			if (max > this._maxValue) {
				max = this._maxValue;
			}
			limitValue = max;
		}
		else {
			min = this._curValue + value;
			if (min < 0) {
				min = 0;
			}
			limitValue = min;
		}
		
		return limitValue;
	}
}
);

var GaugeBar = defineObject(BaseObject,
{
	_colorIndex: 0,
	_counter: null,
	_balancer: null,
	_partsCount: 0,
	
	initialize: function() {
		this._balancer = createObject(SimpleBalancer);
	},
	
	setGaugeInfo: function(value, maxValue, colorIndex) {
		this._balancer.setBalancerInfo(value, maxValue);
		this._colorIndex = colorIndex;
		this._partsCount = 11;
	},
	
	setPartsCount: function(partsCount) {
		this._partsCount = partsCount;
	},
	
	moveGaugeBar: function() {
		return this._balancer.moveBalancer();
	},
	
	drawGaugeBar: function(xBase, yBase, pic) {
		var curValue = this._balancer.getCurrentValue();
		var maxValue = this._balancer.getMaxValue();
		
		ContentRenderer.drawGauge(xBase, yBase, curValue, maxValue, this._colorIndex, this.getGaugeWidth(), pic);
	},
	
	startMove: function(value) {
		this._balancer.startBalancerMove(value);
	},
	
	// 指定値へ直ちに変更する。
	// アニメーションをカットする目的で使用。
	forceValue: function(value) {
		this._balancer.setCurrentValue(value);
		this._balancer.setWaitMode();
	},
	
	getBalancer: function() {
		return this._balancer;
	},
	
	isMoving: function() {
		return this._balancer.isMoving();
	},
	
	getGaugeWidth: function() {
		return this._partsCount * 10;
	}
}
);

var FadeTransition = defineObject(BaseObject,
{
	_counter: null,
	_color: 0,
	_maxCount: 1,
	
	initialize: function() {
		this._counter = createObject(VolumeCounter);
	},
	
	moveTransition: function() {
		this._counter.moveVolumeCounter();
		
		if (this._counter.getRoundCount() === this._maxCount) {
			return MoveResult.END;
		}

		return MoveResult.CONTINUE;
	},
	
	drawTransition: function() {
		var alpha = this._counter.getVolume();
		var color = this._color;
	
		root.getGraphicsManager().fillRange(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), color, alpha);
	},
	
	// 通常の画面状態から特定色へ切り替える
	setDestOut: function() {
		this.setVolume(255, 0, 0, true);
		
		if (SceneManager.isScreenFilled()) {
			this._counter.setVolume(255);
		}
	},
	
	// 特定色の画面から通常へ切り替える
	setDestIn: function() {
		this.setVolume(255, 0, 255, false);
		
		if (!SceneManager.isScreenFilled()) {
			this._counter.setVolume(0);
		}
	},
	
	setHalfOut: function() {
		this.setVolume(128, 0, 0, true);
	},
	
	setHalfIn: function() {
		this.setVolume(128, 0, 128, false);
	},
	
	setVolume: function(max, min, cur, isUp) {
		this._counter.setVolumeRange(max, min, cur, isUp);
	},
	
	setFadeSpeed: function(speed) {
		this._counter.setChangeSpeed(speed);
	},
	
	setFadeColor: function(color) {
		this._color = color;
	},
	
	enableDoubleFade: function() {
		this._maxCount = 2;
	},
	
	isOneFadeLast: function() {
		return this._counter.getRoundCount() === 1;
	}
}
);

// イベントコマンドの画面効果と連動させる場合は、SystemTransitionを使用する
var SystemTransition = defineObject(FadeTransition,
{
	initialize: function() {
		var effect = root.getScreenEffect();
		
		this._counter = createObject(VolumeCounter);
		
		effect.setColor(this._color);
		effect.setRange(EffectRangeType.ALL);
	},
	
	setEffectRangeType: function(effectRangeType) {
		var effect = root.getScreenEffect();
		
		effect.setRange(effectRangeType);
	},
	
	moveTransition: function() {
		var effect = root.getScreenEffect();
		
		this._counter.moveVolumeCounter();
		
		effect.setAlpha(this._counter.getVolume());
		
		if (this._counter.getRoundCount() === this._maxCount) {
			return MoveResult.END;
		}

		return MoveResult.CONTINUE;
	},
	
	drawTransition: function() {
	},
	
	setFadeColor: function(color) {
		var effect = root.getScreenEffect();
		
		this._color = color;
		effect.setColor(color);
	},
	
	resetTransition: function() {
		var effect = root.getScreenEffect();
		
		effect.setAlpha(0);
	}
}
);

var SafeClipping = defineObject(BaseObject,
{
	_xPrevViewport: 0,
	_yPrevViewport: 0,
	
	saveClipping: function(clippingArea) {
		var xNewViewport, yNewViewport;
		
		this._xPrevViewport = root.getViewportX();
		this._yPrevViewport = root.getViewportY();
		
		xNewViewport = clippingArea.getClippingX();
		yNewViewport = clippingArea.getClippingY();
		
		root.setViewportPos(xNewViewport, yNewViewport);
		root.getGraphicsManager().pushClippingArea(clippingArea);
	},
	
	restoreClipping: function() {
		root.getGraphicsManager().popClippingArea();
		root.setViewportPos(this._xPrevViewport, this._yPrevViewport);
	}
}
);

// 分岐ではなく一直線で処理が進む場合は、MODEでなくStraightFlowを使うことが多い。
// StraightFlowを使用するオブジェクトは、多くの場合pushFlowEntriesというメソッドを用意し、
// そこでBaseFlowEntryから派生したオブジェクトをpushFlowEntryでプッシュする。
// そして、StraightFlowからプッシュされたオブジェクトから順に処理していく。
// この仕組みの利点は、pushFlowEntryを呼び出す順番次第で処理の順番を変更できる点と、
// 開発者が新規処理を容易に追加しやすい点がある。
var StraightFlow = defineObject(BaseObject,
{
	_entryIndex: 0,
	_entryArray: null,
	_flowData: null,
	
	setStraightFlowData: function(flowData) {
		this._entryIndex = 0;
		this._entryArray = [];
		this._flowData = flowData;
		this.resetStraightFlow();
	},
	
	enterStraightFlow: function() {
		var i;
		var count = this._entryArray.length;
		
		for (i = this._entryIndex; i < count; i++) {
			if (this._entryArray[i].enterFlowEntry(this._flowData) === EnterResult.OK) {
				return EnterResult.OK;
			}
			
			this._entryIndex++;
		}
		
		return EnterResult.NOTENTER;
	},
	
	moveStraightFlow: function() {
		if (this._entryArray.length === 0) {
			return MoveResult.END;
		}
	
		if (this.isFlowLast()) {
			return MoveResult.END;
		}
	
		if (this._entryArray[this._entryIndex].moveFlowEntry() !== MoveResult.CONTINUE) {
			this._entryIndex++;
			// NOTENTERが返るということは、cycleに入る必要がないため終了する
			if (this.enterStraightFlow() === EnterResult.NOTENTER) {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawStraightFlow: function() {
		if (this._entryArray.length === 0) {
			return;
		}
		
		if (this._entryArray.length <= this._entryIndex) {
			return;
		}
		
		this._entryArray[this._entryIndex].drawFlowEntry();
	},
	
	moveBackStraightFlow: function() {
		if (this._entryArray.length === 0) {
			return;
		}
		
		if (this._entryArray.length <= this._entryIndex) {
			return;
		}
		
		this._entryArray[this._entryIndex].moveBackFlowEntry();
	},
	
	resetStraightFlow: function() {
		this._entryIndex = 0;
	},
	
	pushFlowEntry: function(obj) {
		this._entryArray.push(createObject(obj));
	},
	
	insertFlowEntry: function(obj, index) {
		this._entryArray.splice(index, 0, createObject(obj));
	},
	
	isFlowLast: function() {
		return this._entryArray.length <= this._entryIndex;
	}
}
);
