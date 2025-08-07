
var MessageAnalyzerMode = {
	PAGE: 0,
	CANCEL: 1,
	CLEAR: 2
};

var MessageAnalyzerState = {
	NONE: 0,
	ENDTEXT: 1,
	READBLOCK: 2
};

var MessageWaitState = {
	WAIT: 0,
	NONE: 1
};

var MessageRowCount = 3;

// このオブジェクトは、複数行の文字列を1文字ずつ表示したい場合に使用する。
// 文字を表示する間隔や、ページの切り替えなどを主に担当し、
// 実際の文字の描画などはCoreAnalyzerのメソッドを呼び出している。
var MessageAnalyzer = defineObject(BaseObject,
{
	_voiceSoundHandle: null,
	_pageSoundHandle: null,
	_messageSpeedValue: 0,
	_messageState: 0,
	_pageCursor: null,
	_coreAnalyzer: null,
	_waitChain: null,
	_parserInfo: null,
	_cancelCounter: null,
	
	setMessageAnalyzerParam: function(messageAnalyzerParam) {
		this._voiceSoundHandle = messageAnalyzerParam.voiceSoundHandle;
		this._pageSoundHandle = messageAnalyzerParam.pageSoundHandle;
		this._messageSpeedValue = this._convertSpeed(messageAnalyzerParam.messageSpeedType);
		this._messageState = 0;
		this._pageCursor = createObject(PageCursor);
		this._coreAnalyzer = createObject(CoreAnalyzer);
		this._waitChain = createObject(WaitChain);
		this._cancelCounter = createObject(CycleCounter);
		
		this._parserInfo = StructureBuilder.buildParserInfo();
		this._parserInfo.defaultColor = messageAnalyzerParam.color;
		this._parserInfo.defaultFont = messageAnalyzerParam.font;
		this._parserInfo.maxTextLength = messageAnalyzerParam.maxTextLength;
		
		this._waitChain.setupWaitChain(this);
	},
	
	setMessageAnalyzerText: function(text) {
		this._parserInfo.wait = 0;
		this._parserInfo.autoWait = 0;
		this._parserInfo.speed = -1;
		this._coreAnalyzer.setCoreAnalyzerData(text, this._parserInfo);
		
		if (this._getCancelSpeedValue() >= 0) {
			this._cancelCounter.disableGameAcceleration();
			this._cancelCounter.setCounterInfo(this._getCancelSpeedValue());
		}
		
		this._startNewPage();
	},
	
	moveMessageAnalyzer: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === MessageAnalyzerMode.PAGE) {
			result = this._movePage();
		}
		else if (mode === MessageAnalyzerMode.CANCEL) {
			result = this._moveCancel();
		}
		else if (mode === MessageAnalyzerMode.CLEAR) {
			result = this._moveClear();
		}
		
		this._pageCursor.moveCursor();
		
		return result;
	},
	
	drawMessageAnalyzer: function(xMessage, yMessage, xCursor, yCursor, pic) {
		this._coreAnalyzer.drawCoreAnalyzer(xMessage, yMessage + 5);
		
		if (pic !== null) {
			if (this._messageState === MessageAnalyzerState.READBLOCK && !this._waitChain.isAutoMode()) {
				this._pageCursor.drawCursor(xCursor, yCursor, pic);
			}
		}
	},
	
	endMessageAnalyzer: function() {
		this._cleanPage();
	},
	
	setMaxRowCount: function(maxRowCount) {
		this._coreAnalyzer.setMaxRowCount(maxRowCount);
	},
	
	getEnsureText: function() {
		return this._coreAnalyzer.getEnsureText();
	},
	
	isMessageDirect: function() {
		// 0の場合は文字が1文字ずつではなく、一斉に表示される
		return this._messageSpeedValue === 0;
	},
	
	cutPage: function() {
		var isMessageDirect = this.isMessageDirect();
		
		for (;;) {
			// ページをカットするため、trueを指定
			this._checkCurrentPage(true);
			
			// 高速を理由にcutPageが呼ばれたが、
			// カット中にspeedが変更される可能性があるため確認
			if (isMessageDirect && !this.isMessageDirect()) {
				break;
			}
			
			// 1つのページを処理したからループを抜ける
			if (this._isPageLast()) {
				break;
			}
		}
		
		// ページを処理したため、明示的な待機は無効にする
		this._parserInfo.wait = 0;
		this._waitChain.endPage();
	},
	
	getMessageSpeed: function() {
		return this._messageSpeedValue;
	},
	
	setMessageSpeed: function(messageSpeedValue) {
		this._messageSpeedValue = messageSpeedValue;
	},
	
	getCoreAnalyzer: function() {
		return this._coreAnalyzer;
	},
	
	_movePage: function() {
		// 次のページに進むべきかを調べる
		if (this._isPageChange()) {
			this._changeNextPage();
			return MoveResult.CONTINUE;
		}
		else {
			// 現在のページの処理をしたいが、待機状態に入っているかを先に調べる
			if (this._waitChain.moveWaitChain() === MoveResult.CONTINUE) {
				// 待機状態に入っているため処理を続行しない
				return MoveResult.CONTINUE;
			}
		}
		
		// 現在のページを処理する
		this._checkCurrentPage(false);
		
		// 30FPSの場合は、2文字ずつ処理されることになる
		if (!DataConfig.isHighPerformance()) {
			this._checkCurrentPage(false);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveCancel: function() {
		if (this._cancelCounter.moveCycleCounter() !== MoveResult.CONTINUE) {
			this._changeNextPage();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveClear: function() {
		this._cleanPage();
		
		// これ以上テキストがないため終了する
		if (this._messageState === MessageAnalyzerState.ENDTEXT) {
			return MoveResult.END;
		}
		
		this._coreAnalyzer.nextCoreAnalyzer();
		this._waitChain.startPage();
		
		this._startNewPage();
		
		return MoveResult.CONTINUE;
	},
	
	_changeNextPage: function() {
		if (this._messageState === MessageAnalyzerState.NONE) {
			// 文字を表示している途中だった場合は、
			// いったん全ての文字を表示し、すぐにページを切り替えない。
			this.cutPage();
			return;
		}
		
		// 次のページに変わるため、音を鳴らす
		this._playMessagePageSound();
		
		this.changeCycleMode(MessageAnalyzerMode.CLEAR);
	},
	
	_startNewPage: function() {
		this._messageState = MessageAnalyzerState.NONE;
		
		if (this.isMessageDirect()) {
			if (this._voiceSoundHandle !== null && !this._voiceSoundHandle.isNullHandle()) {
				// 文字を一気に表示する場合でも、一度だけメッセージ音を再生する
				MediaControl.soundPlay(this._voiceSoundHandle);
			}
			this.cutPage();
		}
		
		this.changeCycleMode(MessageAnalyzerMode.PAGE);
	},
	
	// 1つのページが終了したときの処理を行う
	_cleanPage: function() {
		// 既にボイスが再生されているならば、その音を停止する
		if (this._parserInfo.voiceRefId !== -1) {
			root.getMaterialManager().voiceStop(this._parserInfo.voiceRefId, false);
			this._parserInfo.voiceRefId = -1;
		}
	},
	
	_checkCurrentPage: function(isPageCut) {
		var isAdvance = true;
		
		if (this._isPageLast()) {
			// 既に1ページ処理されているから、何も処理しない
			return;
		}
		
		// ページ内の1文字を処理する
		this._messageState = this._coreAnalyzer.moveCoreAnalyzer();
		
		// 1ページを表示し終えたかどうか調べる
		if (this._isPageLast()) {
			this._waitChain.endPage();
		}
		else {
			isAdvance = this._waitChain.checkWaitChain(this._parserInfo, isPageCut) === MessageWaitState.NONE;
		}
		
		if (isAdvance) {
			// ページをカットしない場合は、メッセージ音が再生されることがある
			if (!isPageCut) {
				this._playMessageVoiceSound();
			}
			this._coreAnalyzer.advanceStep();
		}
	},
	
	_isPageChange: function() {
		if (this._waitChain.isAutoMode()) {
			if (this._waitChain.isPageAutoChange()) {
				// 自動待機が完了したから、ページを切り替える
				return true;
			}
		}
		else {
			if (this._isCancelAllowed()) {
				// キャンセルキーを押しっぱなしの場合は、ページを切り替える
				if (this._getCancelSpeedValue() >= 0) {
					// 高速すぎる切り替えを避けたい場合は待機する
					this.changeCycleMode(MessageAnalyzerMode.CANCEL);
					return false;
				}
				
				// _getCancelSpeedValueがマイナスを返す場合は、待機せず即座にページを切り替える
				
				return true;
			}
			else if (InputControl.isSelectAction()) {
				// 決定キーが押された場合は、ページを切り替える
				return true;
			}
		}
		
		return false;
	},
	
	_isPageLast: function() {
		return this._messageState === MessageAnalyzerState.READBLOCK || this._messageState === MessageAnalyzerState.ENDTEXT;
	},
	
	_playMessageVoiceSound: function() {
		if (this._voiceSoundHandle !== null && !this._voiceSoundHandle.isNullHandle()) {
			if ((this._coreAnalyzer.getCurrentIndex() % 7) === 0) {
				MediaControl.soundPlay(this._voiceSoundHandle);
			}
		}
	},
	
	_playMessagePageSound: function() {
		if (this._pageSoundHandle !== null && !this._pageSoundHandle.isNullHandle()) {
			if (!this._waitChain.isAutoMode()) {
				MediaControl.soundPlay(this._pageSoundHandle);
			}
		}
	},
	
	_convertSpeed: function(speedType) {
		var n = 2;
		
		if (speedType === SpeedType.DIRECT || speedType === SpeedType.SUPERHIGH || speedType === SpeedType.HIGH) {
			n = 0;
		}
		else if (speedType === SpeedType.NORMAL) {
			n = 1;
		}
		
		return n;
	},
	
	_isCancelAllowed: function() {
		return Miscellaneous.isGameAcceleration();
	},
	
	_getCancelSpeedValue: function() {
		return 0;
	}
}
);

// メッセージを表示する際に、待機状態が発生するのは主に3つある。
// 1つ目は、\.のような制御文字による明示的な待機であり、ExplicitWaitが処理を担当する。
// 2つ目は、\atのような制御文字による待機であり、次のページに自動で切り替わるまで待機する。
// これは、AutoWaitが担当する。
// 3つ目は、次の文字を解析するまでの待機であり、コンフィグのメッセージスピードが遅く設定されていれば、
// それに応じて待機も長くなる。これは、SpeedWaitが担当する。
var WaitChain = defineObject(BaseObject,
{
	_waitPartsArray: null,
	
	setupWaitChain: function(parentMessageAnalyzer) {
		var i, count;
		
		this._waitPartsArray = [];
		this._configureWaitParts(this._waitPartsArray);
		
		count = this._waitPartsArray.length;
		for (i = 0; i < count; i++) {
			this._waitPartsArray[i].setupWaitParts(parentMessageAnalyzer);
		}
	},
	
	moveWaitChain: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._waitPartsArray[i].moveWaitParts() === MoveResult.CONTINUE) {
				return MoveResult.CONTINUE;
			}
		}
		
		return MoveResult.END;
	},
	
	checkWaitChain: function(parserInfo, isPageCut) {
		var i;
		var count = this._waitPartsArray.length;
		var waitState = MessageWaitState.NONE;
		
		for (i = 0; i < count; i++) {
			// 1つでもfalseを返すオブジェクトがあれば、次の文字には進まないことになる
			if (this._waitPartsArray[i].checkWaitParts(parserInfo, isPageCut) === MessageWaitState.WAIT) {
				waitState = MessageWaitState.WAIT;
			}
		}
		
		return waitState;
	},
	
	startPage: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			this._waitPartsArray[i].startPage();
		}
	},
	
	endPage: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			this._waitPartsArray[i].endPage();
		}
	},
	
	isPageAutoChange: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._waitPartsArray[i].isPageAutoChange()) {
				return true;
			}
		}
		
		return false;
	},
	
	isAutoMode: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._waitPartsArray[i].isAutoMode()) {
				return true;
			}
		}
		
		return false;
	},
	
	_configureWaitParts: function(groupArray) {
		groupArray.appendObject(WaitParts.Explicit);
		groupArray.appendObject(WaitParts.Auto);
		groupArray.appendObject(WaitParts.Speed);
	}
}
);

var BaseWaitParts = defineObject(BaseObject,
{
	_isWaitMode: false,
	_counter: null,
	_parentMessageAnalyzer: null,
	
	setupWaitParts: function(parentMessageAnalyzer) {
		this._counter = createObject(CycleCounter);
		this._parentMessageAnalyzer = parentMessageAnalyzer;
	},
	
	moveWaitParts: function() {
		if (!this._isWaitMode) {
			// 待機する場合は、MoveResult.CONTINUEを返す
			return MoveResult.END;
		}
		
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			this._isWaitMode = false;
			this.doEndWaitAction();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	// 次の文字に進まない場合は、MessageWaitState.WAITを返す
	checkWaitParts: function(parserInfo, isPageCut) {
		return MessageWaitState.NONE;
	},
	
	// 新しいページを処理する場合に呼ばれる
	startPage: function() {
	},
	
	// 1つのページの解析が完了したら呼ばれる
	endPage: function() {
	},
	
	// 入力なしでページを切り替えたい場合は、trueを返す
	isPageAutoChange: function() {
		return false;
	},
	
	// ページカーソルを表示しない場合は、trueを返す
	isAutoMode: function() {
		return false;
	},
	
	doEndWaitAction: function() {
	}
}
);

var WaitParts = {};

WaitParts.Explicit = defineObject(BaseWaitParts,
{	
	checkWaitParts: function(parserInfo, isPageCut) {
		// ページをカットしない場合のみ、待機情報の確認を行う
		if (!isPageCut && parserInfo.wait !== 0) {
			// 文字の中で/wsなどが見つかった場合は、待機状態に入る
			this._counter.setCounterInfo(parserInfo.wait);
			
			parserInfo.wait = 0;
			this._isWaitMode = true;
			
			// 待機状態になるため、次の文字に進まない
			return MessageWaitState.WAIT;
		}
		
		return MessageWaitState.NONE;
	},
	
	endPage: function() {
		this._counter.resetCounterValue();
		this._isWaitMode = false;
	},
	
	doEndWaitAction: function() {
		// 待機が終わったため、次の文字に進む
		this._parentMessageAnalyzer.getCoreAnalyzer().advanceStep();
	}
}
);

WaitParts.Auto = defineObject(BaseWaitParts,
{
	_isForceAuto: false,
	_isAutoSelectAction: false,
	
	checkWaitParts: function(parserInfo, isPageCut) {
		if (parserInfo.autoWait !== 0) {
			// 文字の中で/atが見つかった場合は、自動で次のページに入れるように準備
			this._counter.setCounterInfo(parserInfo.autoWait);
			parserInfo.autoWait = 0;
			this._isForceAuto = true;
		}
		
		return MessageWaitState.NONE;
	},
	
	startPage: function() {
		if (this._isForceAuto) {
			this._isAutoSelectAction = false;
		}
	},
	
	endPage: function() {
		if (this._isForceAuto) {
			this._isWaitMode = true;
		}
	},
	
	isPageAutoChange: function() {
		if (this._isForceAuto && this._isAutoSelectAction) {
			return true;
		}
		
		return false;
	},
	
	doEndWaitAction: function() {
		this._isAutoSelectAction = true;
	},
	
	isAutoMode: function() {
		return this._isWaitMode || this._isAutoSelectAction;
	}
}
);

WaitParts.Speed = defineObject(BaseWaitParts,
{
	_value: 0,
	_maxValue: 0,
	
	setupWaitParts: function(parentMessageAnalyzer) {
		this._value = 0;
		this._maxValue = parentMessageAnalyzer.getMessageSpeed();
	
		BaseWaitParts.setupWaitParts.call(this, parentMessageAnalyzer);
	},
	
	moveWaitParts: function() {
		if (this._parentMessageAnalyzer.isMessageDirect()) {
			return MoveResult.END;
		}
		
		if (++this._value >= this._maxValue) {
			this._value = 0;
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	checkWaitParts: function(parserInfo, isPageCut) {
		if (parserInfo.speed !== -1) {
			// メッセージスピードを設定
			this._parentMessageAnalyzer.setMessageSpeed(parserInfo.speed);
			
			if (this._parentMessageAnalyzer.isMessageDirect() || isPageCut) {
				// 次の文字から解析が行われるようにする
				this._parentMessageAnalyzer.getCoreAnalyzer().advanceStep();
					
				this._parentMessageAnalyzer.cutPage();
					
				// この時点で1ページ読み終えたため、直ちに次の文字に進む必要はない
				return MessageWaitState.WAIT;
			}
			else {
				this._maxValue = this._parentMessageAnalyzer.getMessageSpeed();
			}
			
			parserInfo.speed = -1;
		}
		
		return MessageWaitState.NONE;
	}
}
);

// 実際に文字を処理する。
// 全ての文字を理解できる形にするために、
// 変数はVariableReplacerで置換され、制御文字はTextParserで置換される。
var CoreAnalyzer = defineObject(BaseObject,
{
	_totalIndex: 0,
	_isNextRow: false,
	_rowCount: 0,
	_fontSize: 0,
	_parserInfo: null,
	_maxRowCount: MessageRowCount,
	_textLineArray: null,
	_textParser: null,
	_totalText: null,
	
	setCoreAnalyzerData: function(text, parserInfo) {
		this._totalIndex = 0;
		this._rowCount = 0;
		this._fontSize = parserInfo.defaultFont.getSize();
		this._parserInfo = parserInfo;
		
		// _totalTextに制御文字は含まれない
		this._totalText = this._startParse(text, parserInfo);
		
		this._createTextLine();
	},
	
	moveCoreAnalyzer: function() {
		var result = MessageAnalyzerState.NONE;
		var textLine = this._textLineArray[this._rowCount];
		
		// 一行の終端までチェックし終えてない場合は続行しない
		if (textLine.currentIndex !== textLine.text.length) {
			this._textParser.checkParserInfo(textLine.currentIndex + textLine.baseIndex);
			return result;
		}
		
		// ブロック内の行を全て処理したか調べる
		if (this._rowCount + 1 === this._textLineArray.length) {
			if (this._totalIndex >= this._totalText.length) {
				// これ以上メッセージは存在しないため終了する
				result = MessageAnalyzerState.ENDTEXT;
			}
			else {
				// メッセージは存在するため次のブロックに進む
				result = MessageAnalyzerState.READBLOCK;
			}
		}
		else {
			this._isNextRow = true;
		}
		
		return result;
	},
	
	drawCoreAnalyzer: function(xStart, yStart) {
		var i, j;
		var drawInfo, textLine, count2;
		var count = this._textLineArray.length;
		
		for (i = 0; i < count; i++) {
			textLine = this._textLineArray[i];
			
			// formattedTextが初期化されてないということは、今から描画する一行に描画効果(色変更など)が生じないことを意味するから、
			// 単純に描画メソッドを呼び出すだけでよい。
			if (textLine.formattedText === null) {
				root.getGraphicsManager().drawCharText(xStart, yStart, textLine.text, textLine.currentIndex,
					this._parserInfo.defaultColor, 255, this._parserInfo.defaultFont);
				
				yStart += this.getCharSpaceHeight();
				continue;
			}
			
			// 単純にdrawFormattedTextを呼び出すと、テキストが全て描画されてしまう。
			// よって、描画する範囲を事前に定義する。
			textLine.formattedText.setValidArea(0, textLine.currentIndex);
			
			// 描画範囲内のデフォルトテキスト色を決定する
			textLine.formattedText.setColorAlpha(0, textLine.currentIndex, this._parserInfo.defaultColor, 255);
			
			// checkDrawInfo内でsetColorなどが呼ばれるため、そのために必要な情報を設定する
			drawInfo = {};
			drawInfo.formattedText = textLine.formattedText;
			drawInfo.baseIndex = textLine.baseIndex;
			drawInfo.defaultColor = this._parserInfo.defaultColor;
			drawInfo.defaultFont = this._parserInfo.defaultFont;
			
			// テキスト終端に位置していたかもしれない制御文字を含めるため+1
			count2 = textLine.text.length + 1;
			for (j = 0; j < count2; j++) {
				this._textParser.checkDrawInfo(j + textLine.baseIndex, drawInfo);
			}
			
			textLine.formattedText.drawFormattedText(xStart, yStart, 0x0, 0);
			
			yStart += this.getCharSpaceHeight();
		}
	},
	
	nextCoreAnalyzer: function() {
		this._baseIndex = this._textLineArray[this._rowCount].currentIndex;
		this._rowCount = 0;
		
		this._createTextLine();
	},
	
	advanceStep: function() {
		if (this._isNextRow) {
			this._isNextRow = false;
			this._rowCount++;
		}
		else {
			this._textLineArray[this._rowCount].currentIndex++;
		}
	},
	
	setMaxRowCount: function(maxRowCount) {
		this._maxRowCount = maxRowCount;
	},

	getCurrentIndex: function() {
		return this._textLineArray[this._rowCount].currentIndex;
	},

	getEnsureText: function() {
		return this._totalText;
	},
	
	getCharSpaceHeight: function() {
		return this._fontSize + 10;
	},
	
	setTextLineArray: function(textLineArray) {
		this._textLineArray = textLineArray;
	},
	
	createTextContainerArray: function() {
		var i, count;
		var arr = [];
		
		for (;;) {
			if (arr.length !== 0) {
				this._createTextLine();
			}
			
			count = this._textLineArray.length;
			for (i = 0; i < count; i++) {
				this._textLineArray[i].currentIndex = this._textLineArray[i].text.length;
			}
			arr.push(this._textLineArray);
			
			if (this._totalIndex >= this._totalText.length) {
				break;
			}
		}
		
		return arr;
	},
	
	_startParse: function(text, parserInfo) {
		var variableReplacer = createObject(VariableReplacer);
		
		// 変数を置き換える
		text = variableReplacer.startReplace(text);
		
		this._textParser = createObject(TextParser);
		
		// 制御文字を置き換える
		return this._textParser.startReplace(text, parserInfo);
	},
	
	_createTextLine: function() {
		var i, j, c, textLine;
		var s = this._totalIndex;
		var baseIndex = 0;
		var textParts = '';
		var isDrawingObject = false;
		
		this._textLineArray = [];
		
		for (i = 0; i < this._maxRowCount; i++) {
			for (j = s; j < this._totalText.length; j++) {
				c = this._totalText.charAt(j);
				if (c === '\n' || j + 1 === this._totalText.length) {
					// 制御文字法則：
					// ・行の開始と終端に設定できる
					// ・ブロックの開始と終端に設定できる
					// ・行の終端が制御文字であり、次の行の開始が制御文字でも問題ない
					// ・\C[2]\tu[1]のように連結できる
					// ・行単位で有効
					// ・描画系制御文字は\C[2]text\C[0]のように挟まなければならない
					
					if (j + 1 === this._totalText.length) {
						j++;
					}
					
					// テキスト一行を抽出
					textParts = this._totalText.substring(s, j);
					
					// その一行の範囲が制御文字を含むか調べる
					isDrawingObject = this._textParser.isDrawingObject(s, j);
					
					baseIndex = s;
					
					// どこまで調査したか保存する
					s = j + 1;
					
					break;
				}
			}
			
			textLine = {};
			textLine.currentIndex = 0;
			textLine.baseIndex = baseIndex;
			textLine.text = textParts;
			textLine.formattedText = isDrawingObject ? root.getGraphicsManager().createFormattedText(textParts, this._parserInfo.defaultFont) : null;
			this._textLineArray[i] = textLine;
			
			if (j === this._totalText.length) {
				break;
			}
		}
		
		// 次に_createTextLineが呼ばれた際に、この値から始めれるようにする
		this._totalIndex = s;
	}
}
);

// テキスト内の制御文字を置換したテキストを返す
var TextParser = defineObject(BaseObject,
{
	_variableArray: null,
	_controlObjectArray: null,
	_parserInfo: null,

	startReplace: function(text, parserInfo) {
		var i, count, n, min, result;
		var s = text;
		var arr = [];
		var index = -1;
		
		this._parserInfo = parserInfo;
		this._controlObjectArray = [];
		this._variableArray = [];
		this._configureVariableObject(this._variableArray);
		
		arr = this._variableArray;
		
		for (;;) {
			// テキスト上のインデックス
			min = this._getDefaultMin();
			
			// 文字列上のインデックス
			index = -1;
		
			count = arr.length;
			for (i = 0; i < count; i++) {
				n = s.search(arr[i].getKey());
				if (n === -1) {
					continue;
				}
				
				// 前方に存在する制御文字から処理する
				if (n < min) {
					// 文字が先頭から何番目に存在するかを保存
					min = n;
					index = i;
				}
			}
			
			if (index === -1) {
				break;
			}
			
			// 変換結果を受け取る
			result = arr[index].startParser(s, min, this._controlObjectArray);
			
			// 実際に文字変換を行う
			s = s.replace(arr[index].getKey(), result);
		}
		
		return s;
	},
	
	// このメソッドはmove系メソッドから呼ばれる
	checkParserInfo: function(index) {
		var i;
		var count = this._variableArray.length;
		
		for (i = 0; i < count; i++) {
			// 指定インデックスに対する処理を行わせる
			this._variableArray[i].checkParserInfo(index, this._controlObjectArray, this._parserInfo);
		}
	},
	
	// このメソッドはdraw系メソッドから呼ばれる
	checkDrawInfo: function(index, drawInfo) {
		var i;
		var count = this._variableArray.length;
		
		count = this._variableArray.length;
		for (i = 0; i < count; i++) {
			// 指定インデックスに対する処理を行わせる
			this._variableArray[i].checkDrawInfo(index, this._controlObjectArray, drawInfo);
		}
	},
	
	isDrawingObject: function(start, end) {
		var i, obj;
		var count = this._controlObjectArray.length;
		
		for (i = 0; i < count; i++) {
			obj = this._controlObjectArray[i];
			if (obj.isDrawingObject) {
				if (obj.index >= start && obj.index <= end) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	_getDefaultMin: function() {
		return 999;
	},
	
	// 1つの制御文字に対して、1つのオブジェクトが存在する。
	// たとえば、\Cを置換するのはControlVariable.Colorという具合になる。
	_configureVariableObject: function(groupArray) {
		// 描画系の制御文字
		groupArray.appendObject(ControlVariable.Color);
		groupArray.appendObject(ControlVariable.Font);
		groupArray.appendObject(ControlVariable.FontIndex);
		groupArray.appendObject(ControlVariable.FontSize);
		groupArray.appendObject(ControlVariable.FontWeight);
		groupArray.appendObject(ControlVariable.FontStyle);
		groupArray.appendObject(ControlVariable.Strikethrough);
		groupArray.appendObject(ControlVariable.Underline);
		
		// システム系の制御文字
		groupArray.appendObject(ControlVariable.WaitShort);
		groupArray.appendObject(ControlVariable.WaitMiddle);
		groupArray.appendObject(ControlVariable.WaitLong);
		groupArray.appendObject(ControlVariable.Auto);
		groupArray.appendObject(ControlVariable.Speed);
		if (this._parserInfo.isVoiceIncluded) {
			groupArray.appendObject(ControlVariable.Voice);
		}
	}
}
);

var BaseControlVariable = defineObject(BaseObject,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.sig = Number(c[1]);
		obj.isDrawingObject = this.isDrawingObject();
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
	},
	
	checkDrawInfo: function(index, objectArray, drawInfo) {
	},
	
	isDrawingObject: function() {
		return false;
	},
	
	getObjectFromIndex: function(index, objectArray, parentObject) {
		var i;
		var count = objectArray.length;
		
		for (i = 0; i < count; i++) {
			if (objectArray[i].index === index && objectArray[i].parentObject === parentObject) {
				return objectArray[i];
			}
		}
		
		return null;
	}
}
);

var ControlVariable = {};

ControlVariable.Color = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newColorObj !== 'undefined') {
			drawInfo.formattedText.setColorAlpha(drawInfo.newColorObj.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex, this._getColor(drawInfo), 255);
		}
		
		drawInfo.newColorObj = obj;
	},
	
	getKey: function() {
		var key = /\\C\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	},
	
	_getColor: function(drawInfo) {
		var c = [0xffffff, 0x10efff, 0xefff00, 0x20ff40, 0xff5040, 0xff10ef, 0x7f7f8f, 0x0];
		var count = c.length;
		var colorIndex = drawInfo.newColorObj.sig;
		
		if (colorIndex < 0 || colorIndex > count - 1) {
			return drawInfo.defaultColor;
		}
		
		return c[colorIndex];
	}
}
);

ControlVariable.Font = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newFontObj !== 'undefined') {
			drawInfo.formattedText.setFont(drawInfo.newFontObj.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex, this._getFont(drawInfo));
		}
		
		drawInfo.newFontObj = obj;
	},
	
	getKey: function() {
		var key = /\\F\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	},
	
	_getFont: function(drawInfo) {
		var font = root.getBaseData().getFontList().getDataFromId(drawInfo.newFontObj.sig);
		
		if (font === null) {
			font = drawInfo.defaultFont;
		}
		
		return font;
	}
}
);

ControlVariable.FontIndex = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newFontObj2 !== 'undefined') {
			drawInfo.formattedText.setFont(drawInfo.newFontObj2.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex, this._getFont(drawInfo));
		}
		
		drawInfo.newFontObj2 = obj;
	},
	
	getKey: function() {
		var key = /\\font\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	},
	
	_getFont: function(drawInfo) {
		var font = root.getBaseData().getFontList().getData(drawInfo.newFontObj2.sig);
		
		if (font === null) {
			font = drawInfo.defaultFont;
		}
		
		return font;
	}
}
);

ControlVariable.FontSize = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newSizeObj !== 'undefined') {
			drawInfo.formattedText.setFontSize(drawInfo.newSizeObj.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex, drawInfo.newSizeObj.sig);
		}
		
		drawInfo.newSizeObj = obj;
	},
	
	getKey: function() {
		var key = /\\fs\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	}
}
);

ControlVariable.FontWeight = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newWeightObj !== 'undefined') {
			drawInfo.formattedText.setFontWeight(drawInfo.newWeightObj.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex, drawInfo.newWeightObj.sig);
		}
		
		drawInfo.newWeightObj = obj;
	},
	
	getKey: function() {
		var key = /\\fw\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	}
}
);

ControlVariable.FontStyle = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newStyleObj !== 'undefined') {
			drawInfo.formattedText.setFontStyle(drawInfo.newStyleObj.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex, drawInfo.newStyleObj.sig);
		}
		
		drawInfo.newStyleObj = obj;
	},
	
	getKey: function() {
		var key = /\\fi\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	}
}
);

ControlVariable.Strikethrough = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newStrikeObj !== 'undefined') {
			drawInfo.formattedText.setStrikethrough(drawInfo.newStrikeObj.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex);
		}
		
		drawInfo.newStrikeObj = obj;
	},
	
	getKey: function() {
		var key = /\\ts\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	}
}
);

ControlVariable.Underline = defineObject(BaseControlVariable,
{
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof drawInfo.newUnderObj !== 'undefined') {
			drawInfo.formattedText.setUnderline(drawInfo.newUnderObj.index - drawInfo.baseIndex, obj.index - drawInfo.baseIndex);
		}
		
		drawInfo.newUnderObj = obj;
	},
	
	getKey: function() {
		var key = /\\tu\[(\d+)\]/;
		
		return key;
	},
	
	isDrawingObject: function() {
		return true;
	}
}
);

ControlVariable.WaitShort = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.sig = 24;
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.wait = obj.sig;
	},
	
	getKey: function() {
		var key = /\\\./;
		
		return key;
	}
}
);

ControlVariable.WaitMiddle = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.sig = 46;
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.wait = obj.sig;
	},
	
	getKey: function() {
		var key = /\\_/;
		
		return key;
	}
}
);

ControlVariable.WaitLong = defineObject(BaseControlVariable,
{
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.wait = obj.sig;
	},
	
	getKey: function() {
		var key = /\\wa\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.Auto = defineObject(BaseControlVariable,
{
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.autoWait = obj.sig;
	},
	
	getKey: function() {
		var key = /\\at\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.Speed = defineObject(BaseControlVariable,
{
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.speed = obj.sig;
	},
	
	getKey: function() {
		var key = /\\sp\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.Voice = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.sig = c[1];
		obj.isDrawingObject = this.isDrawingObject();
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var fileName;
		var ext = ['ogg', 'mp3', 'wav'];
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		fileName = obj.sig + '.' + ext[this._getVoiceExtIndex()];
		
		root.getMaterialManager().voicePlay(this._getVoiceCategory(), fileName, 1);
		
		parserInfo.voiceRefId = 1;
	},
	
	getKey: function() {
		var key = /\\vo\[(.+?)\]/;
		
		return key;
	},
	
	_getVoiceCategory: function() {
		return DataConfig.getVoiceCategoryName();
	},
	
	_getVoiceExtIndex: function() {
		return DataConfig.getVoiceExtIndex();
	}
}
);

// テキスト内の変数を置換したテキストを返す
var VariableReplacer = defineObject(BaseObject,
{
	_variableArray: null,

	startReplace: function(text) {
		var i, count, n, min, result;
		var s = text;
		var arr = [];
		var index = -1;
		
		this._variableArray = [];
		this._configureVariableObject(this._variableArray);

		arr = this._variableArray;
		
		for (;;) {
			min = this._getDefaultMin();
			index = -1;
		
			count = arr.length;
			for (i = 0; i < count; i++) {
				n = s.search(arr[i].getKey());
				if (n === -1) {
					continue;
				}
				
				// 前方に存在する制御文字から処理する
				if (n < min) {
					min = n;
					index = i;
				}
			}
			
			if (index === -1) {
				break;
			}
			
			// 変換結果を受け取る
			result = arr[index].getReplaceValue(s);
			
			// 実際に変換を行う
			s = s.replace(arr[index].getKey(), result);
		}
		
		return s;
	},
	
	_getDefaultMin: function() {
		return 999;
	},
	
	_configureVariableObject: function(groupArray) {
		groupArray.appendObject(DataVariable.Act);
		groupArray.appendObject(DataVariable.Pdb);
		groupArray.appendObject(DataVariable.Cdb);
		groupArray.appendObject(DataVariable.Wdb);
		groupArray.appendObject(DataVariable.Idb);
		groupArray.appendObject(DataVariable.Sdb);
		groupArray.appendObject(DataVariable.Turn);
		groupArray.appendObject(DataVariable.Gold);
		groupArray.appendObject(DataVariable.Bonus);
		groupArray.appendObject(DataVariable.Va1);
		groupArray.appendObject(DataVariable.Va2);
		groupArray.appendObject(DataVariable.Va3);
		groupArray.appendObject(DataVariable.Va4);
		groupArray.appendObject(DataVariable.Va5);
		groupArray.appendObject(DataVariable.Va6);
		groupArray.appendObject(DataVariable.VPdb);
		groupArray.appendObject(DataVariable.VCdb);
		groupArray.appendObject(DataVariable.VWdb);
		groupArray.appendObject(DataVariable.VIdb);
		groupArray.appendObject(DataVariable.VSdb);
	}
}
);

var BaseDataVariable = defineObject(BaseObject,
{
	_variableArray: null,
	
	getReplaceValue: function(text) {
		var i, data;
		var id = this.getIdFromKey(text);
		var result = '';
		var list = this.getList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			data = list.getData(i);
			if (data.getId() === id) {
				result = data.getName();
				break;
			}
		}
		
		return result;
	},
	
	getList: function() {
		return null;
	},
	
	getKey: function() {
		return null;
	},
	
	getVariableValue: function(text, n) {
		var id = this.getIdFromKey(text);
		var table = root.getMetaSession().getVariableTable(n - 1);
		var index = table.getVariableIndexFromId(id);
		
		return table.getVariable(index);
	},
	
	getIdFromKey: function(text) {
		var key = this.getKey();
		var c = text.match(key);
		
		return Number(c[1]);
	}
}
);

var DataVariable = {};

DataVariable.Act = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var unit = root.getCurrentSession().getActiveEventUnit();
		var result = '';
		
		if (unit !== null) {
			result = unit.getName();
		}
		
		return result;
	},
	
	getKey: function() {
		var key = /\\act/;
		
		return key;
	}
}
);

DataVariable.Pdb = defineObject(BaseDataVariable,
{
	getList: function() {
		// ユニットの名前を、「ユニットの情報変更」やunit.setName()で動的に変更するゲームであり、
		// なおかつpdb制御文字を使用する場合は、以下のコードを使用する。これにより、変更後の名前を表示できる。
		// var sceneType = root.getCurrentScene();return sceneType === SceneType.TITLE || sceneType === SceneType.EVENTTEST ? root.getBaseData().getPlayerList() : root.getMetaSession().getTotalPlayerList();
		
		// ただし、getTotalPlayerListは、まだ仲間になっていない、「データ設定/プレイヤー」のユニットの名前は取得できない。
		// 動的な名前変更を優先するか、未加入ユニットの名前取得を優先するかだが、後者を選択している。
		return root.getBaseData().getPlayerList();
	},
	
	getKey: function() {
		var key = /\\pdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Cdb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getClassList();
	},
	
	getKey: function() {
		var key = /\\cdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Wdb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getWeaponList();
	},
	
	getKey: function() {
		var key = /\\wdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Idb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getItemList();
	},
	
	getKey: function() {
		var key = /\\idb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Sdb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getSkillList();
	},
	
	getKey: function() {
		var key = /\\sdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Turn = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var session = root.getCurrentSession();
		
		if (session === null || typeof session.getTurnCount === 'undefined') {
			return '';
		}
		
		return session.getTurnCount().toString();
	},
	
	getKey: function() {
		var key = /\\T/;
		
		return key;
	}
}
);

DataVariable.Gold = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var result = root.getMetaSession().getGold().toString();
		
		return result;
	},
	
	getKey: function() {
		var key = /\\G/;
		
		return key;
	}
}
);

DataVariable.Bonus = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var result = root.getMetaSession().getBonus().toString();
		
		return result;
	},
	
	getKey: function() {
		var key = /\\B/;
		
		return key;
	}
}
);

DataVariable.Va1 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 1);
	},
	
	getKey: function() {
		var key = /\\va1\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va2 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 2);
	},
	
	getKey: function() {
		var key = /\\va2\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va3 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 3);
	},
	
	getKey: function() {
		var key = /\\va3\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va4 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 4);
	},
	
	getKey: function() {
		var key = /\\va4\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va5 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 5);
	},
	
	getKey: function() {
		var key = /\\va5\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va6 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 6);
	},
	
	getKey: function() {
		var key = /\\va6\[(\d+)\]/;
		
		return key;
	}
}
);

// \pdb[va1[0]]のような記述は冗長であるため、\vpdb1[0]のような記述をサポートするオブジェクトが用意されている

var BaseDataVariable2 = defineObject(BaseDataVariable,
{
	getIdFromKey: function(text) {
		var key = this.getKey();
		var c = text.match(key);
		var v_tab = Number(c[1]);
		var v_id = Number(c[2]);
		var table = root.getMetaSession().getVariableTable(v_tab - 1);
		var index = table.getVariableIndexFromId(v_id);
		
		return table.getVariable(index);
	}
}
);

DataVariable.VPdb = defineObject(BaseDataVariable2,
{
	getList: function() {
		return root.getBaseData().getPlayerList();
	},
	
	getKey: function() {
		var key = /\\vpdb(\d{1})\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.VCdb = defineObject(BaseDataVariable2,
{
	getList: function() {
		return root.getBaseData().getClassList();
	},
	
	getKey: function() {
		var key = /\\vcdb(\d{1})\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.VWdb = defineObject(BaseDataVariable2,
{
	getList: function() {
		return root.getBaseData().getWeaponList();
	},
	
	getKey: function() {
		var key = /\\vwdb(\d{1})\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.VIdb = defineObject(BaseDataVariable2,
{
	getList: function() {
		return root.getBaseData().getItemList();
	},
	
	getKey: function() {
		var key = /\\vidb(\d{1})\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.VSdb = defineObject(BaseDataVariable2,
{
	getList: function() {
		return root.getBaseData().getSkillList();
	},
	
	getKey: function() {
		var key = /\\vsdb(\d{1})\[(\d+)\]/;
		
		return key;
	}
}
);
