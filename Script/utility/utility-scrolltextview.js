
var ScrollTextView = defineObject(BaseObject,
{
	_text: null,
	_moveTime: 0,
	_nextTime: 0,
	_isMove: false,
	_scrollTextParam: null,
	_factoryArray: null,
	_blockArray: null,
	_isAcceleration: false,
	
	openScrollTextViewCycle: function(scrollTextParam) {
		this._prepareMemberData(scrollTextParam);
		this._completeMemberData(scrollTextParam);
	},
	
	moveScrollTextViewCycle: function() {
		var i, count;
		
		// 表示しきったブロックは削除
		if (this._blockArray.length > 0) {
			if (this._blockArray[0].isLastBlock()) {
				this._blockArray.shift();
			}
		}
		
		if (!this._checkMove()) {
			return MoveResult.CONTINUE;
		}
		
		// 経過時間をカウントする
		this._moveTime += this.getBlockInterval();
		
		// ブロックの表示間隔を一定にするために、高速化の検出も一定の間隔で行う
		if (this._moveTime % this._getBaseTime() === 0) {
			if (this._isAcceleration) {
				if (!Miscellaneous.isGameAcceleration()) {
					this._isAcceleration = false;
				}
			}
			else {
				if (Miscellaneous.isGameAcceleration()) {
					this._isAcceleration = true;
				}
			}
		}
		
		count = this._blockArray.length;
		for (i = 0; i < count; i++) {
			this._blockArray[i].notifyTime(this._moveTime);
			this._blockArray[i].moveBlock();
		}
		
		if (count === 0) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawScrollTextViewCycle: function() {
		var i;
		var count = this._blockArray.length;
		
		this._drawScrollWindow();
		
		for (i = 0; i < count; i++) {
			this._blockArray[i].drawBlock();
		}
	},
	
	// _getBaseTimeを割り切れる数値を返す
	getBlockInterval: function() {
		var n;
		var speedType = this._scrollTextParam.speedType;
		
		if (this._isAcceleration) {
			return 20;
		}
		
		if (speedType === SpeedType.DIRECT) {
			n = 8;
		}
		else if (speedType === SpeedType.SUPERHIGH) {
			n = 5;
		}
		else if (speedType === SpeedType.HIGH) {
			n = 4;
		}
		else if (speedType === SpeedType.NORMAL) {
			n = 2.5;
		}
		else if (speedType === SpeedType.LOW) {
			n = 2;
		}
		else {
			n = 1;
		}
		
		return n;
	},
	
	getMoveTime: function() {
		return this._moveTime;
	},
	
	setNextTime: function(nextTime) {
		nextTime = this._nextTime;
	},
	
	getScrollTextParam: function() {
		return this._scrollTextParam;
	},
	
	_prepareMemberData: function(scrollTextParam) {
		this._text = scrollTextParam.text;
		this._moveTime = 0;
		this._nextTime = 0;
		this._isMove = false;
		this._scrollTextParam = scrollTextParam;
		
		this._factoryArray = [];
		this._configureFactoryObject(this._factoryArray);
		
		this._blockArray = [];
	},
	
	_completeMemberData: function(scrollTextParam) {
		var i, count, oneblock;
		var text = this._text;
		
		while (text.length !== 0) {
			// WaitBlockFactoryがthis._nextTimeを変更するため、毎回初期化している
			this._nextTime = this._getBaseTime();
			
			// テキストから一行取得する
			oneblock = this._readBlock(text);
			
			// 取得した行を処理できるオブジェクトを探す
			count = this._factoryArray.length;
			for (i = 0; i < count; i++) {
				if (this._factoryArray[i].checkBlock(oneblock, this._blockArray, this)) {
					// 行を処理できた場合は次の行を探すためループを抜ける
					break;
				}
			}
			
			// 仮の経過時間をカウントする
			this._moveTime += this._nextTime;
			
			// 次の行の先頭のテキストを取得
			text = this._nextBlock(text);
		}
		
		// 後でmoveScrollTextViewCycleを呼び出すために初期化
		this._moveTime = 0;
	},
	
	_readBlock: function(text) {
		var i;
		var count = text.length;
		
		for (i = 0; i < count; i++) {
			if (text.charAt(i) === '\n') {
				// 改行までに存在していたテキストを取得
				return text.substring(0, i);
			}
		}
		
		// 改行がない場合は、これが最後の行であるためそのまま返してよい
		return text;
	},
	
	_nextBlock: function(text) {
		var i;
		var count = text.length;
		
		for (i = 0; i < count; i++) {
			if (text.charAt(i) === '\n') {
				// 改行までに存在していたテキストを取得
				return text.substring(i + 1, text.length);
			}
		}
		
		return '';
	},
	
	_checkMove: function() {
		if (!DataConfig.isHighPerformance()) {
			return true;
		}
		
		this._isMove = !this._isMove;
		
		return this._isMove;
	},
	
	_getBaseTime: function() {
		return 40;
	},
	
	_drawScrollWindow: function() {
		var textui = root.queryTextUI('messagescroll_window');
		var pic = textui.getUIImage();
		var n = this._scrollTextParam.margin;
		var x = n;
		var y = n;
		var width = root.getGameAreaWidth() - (n * 2);
		var height = root.getGameAreaHeight() - (n * 2);
		
		if (pic !== null) {
			WindowRenderer.drawStretchWindow(x, y, width, height, pic);
		}
	},
	
	_configureFactoryObject: function(groupArray) {
		groupArray.appendObject(BlockFactory.Picture);
		groupArray.appendObject(BlockFactory.Wait);
		
		// テキスト処理オブジェクトは\spaceなどの制御文字を持たない。
		// よって、最後に確認されるようにする。
		groupArray.appendObject(BlockFactory.Text);
	}
}
);

// BaseBlockFactoryは、ScrollBlockを作成するオブジェクト
var BaseBlockFactory = defineObject(BaseObject,
{
	checkBlock: function(text, arr, parentTextView) {
		return true;
	}
}
);

var BlockFactory = {};

BlockFactory.Text = defineObject(BaseBlockFactory,
{
	checkBlock: function(text, arr, parentTextView) {
		var obj = createObject(TextScrollBlock);
		
		obj.setBlockData(text, parentTextView);
		arr.push(obj);
		
		return true;
	}
}
);

BlockFactory.Picture = defineObject(BaseBlockFactory,
{
	checkBlock: function(text, arr, parentTextView) {
		var obj;
		var key = this.getKey();
		var c = text.match(key);
		
		if (c !== null) {
			obj = createObject(PictureScrollBlock);
			obj.setBlockData(c[1], parentTextView);
			arr.push(obj);
			
			return true;
		}
	
		return false;
	},
	
	getKey: function() {
		var key = /\\pic\[(.+)\]/;
		
		return key;
	}
}
);

BlockFactory.Wait = defineObject(BaseBlockFactory,
{
	checkBlock: function(text, arr, parentTextView) {
		var key = this.getKey();
		var c = text.match(key);
		
		if (c !== null) {
			parentTextView.setNextTime(Number(c[1]));
			return true;
		}
		
		return false;
	},
	
	getKey: function() {
		var key = /\\space\[(\d+)\]/;
		
		return key;
	}
}
);

// BaseScrollBlockは、画面上を実際に移動するオブジェクト
var BaseScrollBlock = defineObject(BaseObject,
{
	_x: 0,
	_y: 0,
	_top: 0,
	_bottom: 0,
	_value: null,
	_startTime: 0,
	_isStart: false,
	_isLast: false,
	_alpha: 0,
	_parentTextView: null,
	
	setBlockData: function(value, parentTextView) {
		var scrollTextParam = parentTextView.getScrollTextParam();
		var n = scrollTextParam.margin;
		var size = root.queryTextUI('messagescroll_window').getFont().getSize();
		
		this._top = n;
		this._bottom = root.getGameAreaHeight() - n - size;
		this._x = scrollTextParam.x;
		this._y = this._bottom;
		this._value = value;
		this._startTime = parentTextView.getMoveTime();
		this._isStart = false;
		this._isLast = false;
		this._alpha = 0;
		this._parentTextView = parentTextView;
	},
	
	moveBlock: function() {
		var zone = this._getAlphaZone();
		var blockInterval = this._parentTextView.getBlockInterval();
		var d = Math.floor(zone / blockInterval);
		var da = Math.floor(255 / d);
		
		if (this._isLast) {
			return MoveResult.END;
		}
		
		if (this._isStart) {
			// 現在位置がbottom - zoneの値より大きい場合は、アルファ値を上げる
			if (this._y > this._bottom - zone) {
				this._alpha += da;
				if (this._alpha > 255) {
					this._alpha = 255;
				}
			}
			
			// 現在位置がtopの値より低い場合は、アルファ値を下げる
			if (this._y < this._top + zone) {
				this._alpha -= da;
				if (this._alpha < 0) {
					this._alpha = 0;
				}
			}
			
			this._y -= blockInterval;
			// 現在位置が、top - zoneを超えている場合は完全に透明になっているはずだから、終了フラグを立てる
			if (this._y < this._top) {
				this._isLast = true;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawBlock: function() {
	},
	
	isLastBlock: function() {
		return this._isLast;
	},
	
	notifyTime: function(time) {
		if (!this._isStart) {
			// 通知された時間が、ブロックが動き始めるべき時間を超えたか調べる
			if (time >= this._startTime) {
				// ブロックの動きを開始する
				this._isStart = true;
			}
		}
	},
	
	_getAlphaZone: function() {
		return 40;
	}
}
);

var TextScrollBlock = defineObject(BaseScrollBlock,
{
	drawBlock: function() {
		var x, width, textui, color, font;
		var text = this._value;
		
		if (this._isStart) {
			textui = root.queryTextUI('messagescroll_window');
			color = textui.getColor();
			font = textui.getFont();
			
			if (this._x === -1) {
				width = TextRenderer.getTextWidth(text, font);
				x = LayoutControl.getCenterX(-1, width);
			}
			else {
				x = this._x;
			}
			
			TextRenderer.drawAlphaText(x, this._y, text, -1, color, this._alpha, font);
		}
	}
}
);

var PictureScrollBlock = defineObject(BaseScrollBlock,
{
	_pictureId: -1,
	
	setBlockData: function(value, parentTextView) {
		var i, data;
		var list = root.getBaseData().getGraphicsResourceList(GraphicsType.PICTURE, false);
		var count = list.getCount();
		
		BaseScrollBlock.setBlockData.call(this, value, parentTextView);
		
		for (i = 0; i < count; i++) {
			data = list.getCollectionData(i, 0);
			if (data.getName() === value) {
				// データの総数だけ、getCollectionDataを呼び出すのは、本当は好ましくない。
				// getCollectionDataは内部でリソースをロードするため、Pictureの数が多ければ、
				// それだけ一斉にロードが発生して、メモリ不足に陥る懸念がある。
				// このbreak文は、文字がヒットしたからループを抜けるためのものだが、
				// なるべくgetCollectionDataを呼び続けたくない意図が強い。
				// DataListオブジェクトが名前からデータを検索するメソッドを実装しない現段階では、
				// メッセージスクロールで使用するPictureが、リソースの並び順で前方に位置するのが理想といえる。
				this._pictureId = data.getId();
				break;
			}
		}
	},
	
	drawBlock: function() {
		var x, width, pic;
		var text = this._value;
		
		if (this._isStart) {
			pic = this._getGraphics(text);
			if (pic === null) {
				return;
			}
			
			width = pic.getWidth();
			
			if (this._x === -1) {
				x = LayoutControl.getCenterX(-1, width);
			}
			else {
				x = this._x;
			}
			
			pic.setAlpha(this._alpha);
			pic.draw(x, this._y);
		}
	},
	
	_getGraphics: function(text) {
		var list = root.getBaseData().getGraphicsResourceList(GraphicsType.PICTURE, false);
		
		return list.getCollectionDataFromId(this._pictureId, 0);
	}
}
);
