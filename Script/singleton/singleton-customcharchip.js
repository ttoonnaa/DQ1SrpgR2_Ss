
var CustomCharChipFlag = {
	UNIT: 0x01,
	GLOBAL: 0x02
};

var CustomCharChipGroup = {
	_objectArray: null,
	
	initSingleton: function() {
		this._objectArray = [];
		this._configureCustomCharChip(this._objectArray);
	},
	
	createCustomRenderer: function(unit) {
		var i, obj;
		var count = this._objectArray.length;
		var keyword = unit.getCustomCharChipKeyword();
		
		for (i = 0; i < count; i++) {
			if (this._objectArray[i].getKeyword() === keyword) {
				obj = createObject(this._objectArray[i]);
				unit.setCustomRenderer(obj);
				break;
			}
		}
	},
	
	drawMenuUnit: function(renderer, unit, xPixel, yPixel, unitRenderParam) {
		var cpData;
		
		if (renderer !== null) {
			cpData = this.createCustomCharChipDataFromUnit(unit, xPixel, yPixel, unitRenderParam);
			renderer.drawMenuCharChip(cpData);
		}
	},
	
	createCustomCharChipDataFromUnit: function(unit, xPixel, yPixel, unitRenderParam) {
		var cpData = {};
		var terrain = PosChecker.getTerrainFromPos(unit.getMapX(), unit.getMapY());
		
		// システムがdrawCustomCharChipを呼び出す際に指定するオブジェクトと同様のオブジェクトを構築する
		cpData.xPixel = xPixel;
		cpData.yPixel = yPixel;
		cpData.unit = unit;
		cpData.cls = unit.getClass();
		cpData.terrain = terrain;
		cpData.animationIndex = unitRenderParam.animationIndex;
		cpData.direction = unitRenderParam.direction;
		cpData.alpha = unitRenderParam.alpha;
		cpData.unitType = unit.getUnitType();
		
		// メニュー上の描画なので待機を考慮しない
		cpData.isWait = false;
		
		cpData.keyword = unit.getCustomCharChipKeyword();
		
		// システムからdrawCustomCharChipが呼ばれる際には、以下のプロパティはtrueとなる
		cpData.isSymbol = false;
		cpData.isHpVisible = false;
		cpData.isStateIcon = false;
		
		return cpData;
	},
	
	getFlag: function() {
		return this._objectArray.length > 0 ? CustomCharChipFlag.UNIT : 0;
	},
	
	_configureCustomCharChip: function(groupArray) {
	}
};

var BaseCustomCharChip = defineObject(BaseObject,
{
	initialize: function() {
	},
	
	// このメソッドは、setCustomRendererを呼び出した際に折り返しシステムから呼ばれる
	setupCustomCharChip: function(unit) {
	},
	
	// システムから呼ばれる。
	// キャラチップをエフェクトとして描画するような場合、ここでフレームを進める。
	moveCustomCharChip: function() {
		return MoveResult.CONTINUE;
	},
	
	// ユニットに対してsetCustomRendererを呼び出している場合は、デフォルトで描画する代わりにこのメソッドが呼ばれる。
	// ただし、ユニットに対してsetCustomRendererを呼び出している場合は、
	// デフォルトで描画する代わりにこのメソッドが呼ばれる。
	drawCustomCharChip: function(cpData) {
	},
	
	// ユニットをメニュー上、もしくはマップ移動や簡易戦闘で描画する際にこのメソッドが呼ばれる。
	// カスタムレンダラーが適応されたユニットが多数存在したとしても、
	// メニューを開けるのはユニット一体のみだから、
	// このメソッドの処理コストはある程度許容できる。
	drawMenuCharChip: function(cpData) {
	},
	
	// この関数でtrueを返すとユニットメニューでは独自のキャラチップが描画されない
	isDefaultMenuUnit: function() {
		return true;
	},
	
	// クラスの「条件表示」を使用してキャラチップの見た目を変更するつもりがないのなら設定不要
	getKeyword: function() {
		return '';
	},
	
	_drawSymbol: function(x, y, cpData) {
		if (cpData.isSymbol) {
			root.drawCharChipSymbol(x, y, cpData.unit);
		}
	},
	
	_drawHpGauge: function(x, y, cpData) {
		if (cpData.isHpVisible) {
			root.drawCharChipHpGauge(x, y, cpData.unit);
		}
	},
	
	_drawStateIcon: function(x, y, cpData) {
		if (cpData.isStateIcon) {
			root.drawCharChipStateIcon(x, y, cpData.unit);
		}
	},
	
	_drawWaitIcon: function(x, y, cpData) {
		if (cpData.isWait) {
			GraphicsRenderer.drawImage(x, y, this._getWaitIconResourceHandle(), GraphicsType.ICON);
		}
	},
	
	_getWaitIconResourceHandle: function() {
		if (typeof this._waitResourceHandle === 'undefined') {
			this._waitResourceHandle = root.createResourceHandle(true, 10, 0, 4, 0);
		}
		
		return this._waitResourceHandle;
	}
}
);

var CustomCharChip = {};
