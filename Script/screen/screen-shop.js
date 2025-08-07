
var ShopLayoutMode = {
	MESSAGE: 1,
	BUYSELLSELECT: 2,
	BUY: 3,
	BUYQUESTION: 4,
	SELL: 5,
	SELLQUESTION: 6,
	GOLDCHANGE: 7,
	VISITORSELECT: 8
};

var ShopLayoutResult = {
	ACTION: 0,
	NOACTION: 1
};

var ShopLayoutScreen = defineObject(BaseScreen,
{
	_targetUnit: null,
	_shopLayout: null,
	_screenIneropData: null,
	_isSale: false,
	_nextmode: 0,
	_itemSale: null,
	_discountFactor: 0,
	_shopItemArray: null,
	_inventoryArray: null,
	_buyItemWindow: null,
	_sellItemWindow: null,
	_buySellWindow: null,
	_buyQuestionWindow: null,
	_sellQuestionWindow: null,
	_visitorSelectWindow: null,
	_currencyWindow: null,
	_keeperWindow: null,
	_itemInfoWindow: null,
	_shopMessageTable: null,
	_activeSelectWindow: null,
	_activeItemWindow: null,
	
	setScreenData: function(screenParam) {
		this._prepareScreenMemberData(screenParam);
		this._completeScreenMemberData(screenParam);
	},
	
	moveScreenCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === ShopLayoutMode.BUYSELLSELECT) {
			result = this._moveBuySellSelect();
		}
		else if (mode === ShopLayoutMode.MESSAGE) {
			result = this._moveMessage();
		}
		else if (mode === ShopLayoutMode.BUY) {
			result = this._moveBuy();
		}
		else if (mode === ShopLayoutMode.BUYQUESTION) {
			result = this._moveBuyQuestion();
		}
		else if (mode === ShopLayoutMode.SELL) {
			result = this._moveSell();
		}
		else if (mode === ShopLayoutMode.SELLQUESTION) {
			result = this._moveSellQuestion();
		}
		else if (mode === ShopLayoutMode.VISITORSELECT) {
			result = this._moveVisitorSelect();
		}
		
		this._moveAnimation();
	
		return result;
	},
	
	drawScreenCycle: function() {
		var width = this._getTopWindowWidth();
		var height = this._getTopWindowHeight();
		var xBase = LayoutControl.getCenterX(-1, width);
		var yBase = LayoutControl.getCenterY(-1, height);
		
		// 上部
		this._keeperWindow.drawWindow(xBase, yBase);
		this._activeSelectWindow.drawWindow(xBase + this._keeperWindow.getWindowWidth(), yBase);
		this._currencyWindow.drawWindow(xBase + this._keeperWindow.getWindowWidth(), yBase + this._activeSelectWindow.getWindowHeight());
		
		if (this.getCycleMode() === ShopLayoutMode.VISITORSELECT) {
			this._visitorSelectWindow.drawWindow(xBase + this._keeperWindow.getWindowWidth(), yBase + this._activeSelectWindow.getWindowHeight());
		}
		
		// 下部
		yBase += this._keeperWindow.getWindowHeight();
		width = this._activeItemWindow.getWindowWidth();
		this._itemInfoWindow.drawWindow(xBase + width, yBase);
		this._activeItemWindow.drawWindow(xBase, yBase);
	},
	
	drawScreenBottomText: function(textui) {
		var item = this._itemInfoWindow.getInfoItem();
		
		if (item !== null) {
			TextRenderer.drawScreenBottomText(item.getDescription(), textui);
		}
		else {
			TextRenderer.drawScreenBottomText('', textui);
		}
	},
	
	getScreenInteropData: function() {
		return this._screenIneropData;
	},
	
	setScreenInteropData: function(screenIneropData) {
		this._screenIneropData = screenIneropData;
	},
	
	getScreenResult: function() {
		return this._isSale ? ShopLayoutResult.ACTION : ShopLayoutResult.NOACTION;
	},
	
	getDiscountFactor: function() {
		return this._discountFactor;
	},
	
	getVisitor: function() {
		return this._targetUnit;
	},
	
	getStockVisitor: function() {
		if (this._targetUnit === null) {
			return null;
		}
		
		if (this._visitorSelectWindow === null) {
			return this._targetUnit;
		}
		
		return this._visitorSelectWindow.getSelectIndex() === 0 ? this._targetUnit : null;
	},
	
	getGold: function() {
		return root.getMetaSession().getGold();
	},
	
	setGold: function(gold) {
		root.getMetaSession().setGold(gold);
	},
	
	getGoldFromItem: function(item) {
		return item.getGold();
	},
	
	getShopItemArray: function() {
		return this._shopItemArray;
	},
	
	getInventoryArray: function() {
		return this._inventoryArray;
	},
	
	getShopLayout: function() {
		return this._shopLayout;
	},
	
	getSelectItem: function() {
		return this._activeItemWindow.getShopSelectItem();
	},

	notifyInfoItem: function(item) {
		this._itemInfoWindow.setInfoItem(item);
	},
	
	isStockDefault: function() {
		return root.getCurrentScene() === SceneType.BATTLESETUP || Miscellaneous.isStockAccess(this._targetUnit);
	},
	
	_prepareScreenMemberData: function(screenParam) {
		// unitがnullの場合、売買ではストックアイテムが対象になる。
		// たとえば、購入時にはストックアイテムにアイテムが追加される。
		// 一方、unitがnullでない場合は、何らかのユニットが店を訪問したということで、ユニットアイテムが対象になる。
		// つまり、ユニットのアイテム欄にアイテムが追加される。
		this._targetUnit = screenParam.unit;
		
		this._shopLayout = screenParam.shopLayout;
		
		// 一度でも購入か売却を行うとtrue
		this._isSale = false;
		
		this._nextmode = 0;
		this._itemSale = createObject(ItemSale);
		this._itemSale.setParentShopScreen(this);
		
		this._shopItemArray = screenParam.itemArray;
		this._inventoryArray = screenParam.inventoryArray;
		this._buyItemWindow = createWindowObject(BuyItemWindow, this);
		this._sellItemWindow = createWindowObject(SellItemWindow, this);
		this._buySellWindow = createWindowObject(BuySellWindow, this);
		this._buyQuestionWindow = createWindowObject(BuyQuestionWindow, this);
		this._sellQuestionWindow = createWindowObject(SellQuestionWindow, this);
		this._visitorSelectWindow = createWindowObject(VisitorSelectWindow, this);
		this._currencyWindow = createWindowObject(ShopCurrencyWindow, this);
		this._keeperWindow = createWindowObject(ShopMessageWindow, this);
		this._itemInfoWindow = createWindowObject(ItemInfoWindow, this);
		
		this._activeSelectWindow = this._buySellWindow;
		this._activeItemWindow = this._buyItemWindow;
		
		this._createShopMessageTable(this._shopLayout);
	},
	
	_completeScreenMemberData: function(screenParam) {
		this._arrangeInventoryArray();
		this._checkDiscountFactor();
		
		this._buyItemWindow.setShopWindowData();
		this._sellItemWindow.setShopWindowData();
		this._buySellWindow.setShopWindowData();
		this._buyQuestionWindow.setShopWindowData();
		this._sellQuestionWindow.setShopWindowData();
		this._visitorSelectWindow.setShopWindowData();
		
		this._currencyWindow.setShopWindowData(this.getGold());
		
		this._keeperWindow.createShopAnalyzer();
		
		this._startMessage(this._shopMessageTable.FirstMessage, ShopLayoutMode.BUYSELLSELECT);
	},
	
	_createShopMessageTable: function(shopLayout) {
		this._shopMessageTable = {};
		this._shopMessageTable.FirstMessage = shopLayout.getMessage(0);
		this._shopMessageTable.QuestionBuy = shopLayout.getMessage(1);
		this._shopMessageTable.QuestionSell = shopLayout.getMessage(2);
		this._shopMessageTable.SelectQuestion = shopLayout.getMessage(3);
		this._shopMessageTable.OtherMessage = shopLayout.getMessage(4);
		this._shopMessageTable.EndBuy = shopLayout.getMessage(5);
		this._shopMessageTable.EndSell = shopLayout.getMessage(6);
		this._shopMessageTable.NoGold = shopLayout.getMessage(7);
		this._shopMessageTable.ItemFull = shopLayout.getMessage(8);
		this._shopMessageTable.ForceStock = shopLayout.getMessage(9);
		this._shopMessageTable.NoSell = shopLayout.getMessage(10);
		this._shopMessageTable.NoItemBring = shopLayout.getMessage(11);
	},
	
	_arrangeInventoryArray: function() {
		var i;
		var count = this._inventoryArray.length;
		
		for (;;) {
			count = this._inventoryArray.length;
			for (i = 0; i < count; i++) {
				if (this._inventoryArray[i].getAmount() < 0) {
					this._cutArrayData(i);
					break;
				}
			}
			
			if (i === count) {
				break;
			}
		}
	},
	
	_checkDiscountFactor: function() {
		var factor = 100;
		var skill;
		
		if (this._targetUnit !== null) {
			// 店の訪問者が「値引き」のスキルを持っているかを調べる
			skill = SkillControl.getBestPossessionSkill(this._targetUnit, SkillType.DISCOUNT);
			if (skill !== null) {
				factor = 100 - skill.getSkillValue();
			}
		}
		
		this._discountFactor = factor / 100;
	},
	
	_isStockSelectable: function() {
		if (this._targetUnit === null) {
			return false;
		}
		
		return this.isStockDefault();
	},
	
	_moveTop: function() {
		this._startMessage(this._shopMessageTable.FirstMessage, ShopLayoutMode.BUYSELLSELECT);
		return MoveResult.CONTINUE;
	},
	
	_moveBuySellSelect: function() {
		var result = this._buySellWindow.moveWindow();
			
		if (result === BuySellSelectResult.BUY) {
			if (this._buyItemWindow.getItemCount() > 0) {
				this._startMessage(this._shopMessageTable.QuestionBuy, ShopLayoutMode.BUY);
			}
		}
		else if (result === BuySellSelectResult.SELL) {
			if (this._isStockSelectable()) {
				// 「ユニット」または「ストック」を選択するモードに入る
				this._processMode(ShopLayoutMode.VISITORSELECT);
			}
			else {
				if (this._buySellWindow.isPossessionItem()) {
					this._startMessage(this._shopMessageTable.QuestionSell, ShopLayoutMode.SELL);
				}
				else {
					this._startMessage(this._shopMessageTable.NoItemBring, ShopLayoutMode.BUYSELLSELECT);
				}
			}
		}
		else if (result === BuySellSelectResult.CANCEL) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveMessage: function() {
		if (this._keeperWindow.moveWindow() !== MoveResult.CONTINUE) {
			this._processMode(this._nextmode);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveBuy: function() {
		var input = this._buyItemWindow.moveWindow();
			
		if (input === ScrollbarInput.SELECT) {
			this._startMessage(this._shopMessageTable.SelectQuestion, ShopLayoutMode.BUYQUESTION);
		}
		else if (input === ScrollbarInput.CANCEL) {
			this._startMessage(this._shopMessageTable.OtherMessage, ShopLayoutMode.BUYSELLSELECT);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveBuyQuestion: function() {
		var result = this._buyQuestionWindow.moveWindow();
		
		if (result === BuyQuestionResult.BUY) {
			// 「買う」が選択されたため、実際に購入する
			this._startSale(true, false);
			if (this._shopItemArray.length !== 0) {
				this._startMessage(this._shopMessageTable.EndBuy, ShopLayoutMode.BUY);
			}
			else {
				// 買うものがなくなったらトップに戻る
				this._startMessage(this._shopMessageTable.OtherMessage, ShopLayoutMode.BUYSELLSELECT);
			}
		}
		else if (result === BuyQuestionResult.CANCEL) {
			this._startMessage(this._shopMessageTable.QuestionBuy, ShopLayoutMode.BUY);
		}
		else if (result === BuyQuestionResult.NOGOLD) {
			this._startMessage(this._shopMessageTable.NoGold, ShopLayoutMode.BUY);
		}
		else if (result === BuyQuestionResult.ITEMFULL) {
			this._startMessage(this._shopMessageTable.ItemFull, ShopLayoutMode.BUY);
		}
		else if (result === BuyQuestionResult.FORCESTOCK) {
			this._startSale(true, true);
			if (this._shopItemArray.length !== 0) {
				this._startMessage(this._shopMessageTable.ForceStock, ShopLayoutMode.BUY);
			}
			else {
				this._startMessage(this._shopMessageTable.ForceStock, ShopLayoutMode.BUYSELLSELECT);
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveSell: function() {
		var input = this._sellItemWindow.moveWindow();
		
		if (input === ScrollbarInput.SELECT) {
			this._startMessage(this._shopMessageTable.SelectQuestion, ShopLayoutMode.SELLQUESTION);
		}
		else if (input === ScrollbarInput.CANCEL) {
			this._startMessage(this._shopMessageTable.OtherMessage, ShopLayoutMode.BUYSELLSELECT);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveSellQuestion: function() {
		var result = this._sellQuestionWindow.moveWindow();
			
		if (result === SellQuestionResult.SELL) {
			// 「売る」が選択されたため、実際に売却する
			this._startSale(false);
			if (this._buySellWindow.isPossessionItem()) {
				this._startMessage(this._shopMessageTable.EndSell, ShopLayoutMode.SELL);
			}
			else {
				// 売るものがなくなったらトップに戻る
				this._startMessage(this._shopMessageTable.OtherMessage, ShopLayoutMode.BUYSELLSELECT);
			}
		}
		else if (result === SellQuestionResult.CANCEL) {
			this._startMessage(this._shopMessageTable.QuestionSell, ShopLayoutMode.SELL);
		}
		else if (result === SellQuestionResult.NOSELL) {
			this._startMessage(this._shopMessageTable.NoSell, ShopLayoutMode.SELL);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveVisitorSelect: function() {
		var result = this._visitorSelectWindow.moveWindow();
		
		if (result === VisitorSelectResult.UNIT) {
			this._sellItemWindow.updateItemArea();
			this._startMessage(this._shopMessageTable.QuestionSell, ShopLayoutMode.SELL);
		}
		else if (result === VisitorSelectResult.STOCK) {
			this._sellItemWindow.updateItemArea();
			this._startMessage(this._shopMessageTable.QuestionSell, ShopLayoutMode.SELL);
		}
		else if (result === VisitorSelectResult.CANCEL) {
			this._processMode(ShopLayoutMode.BUYSELLSELECT);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveAnimation: function() {	
		this._currencyWindow.moveWindow();
		this._itemInfoWindow.moveWindow();
		return MoveResult.CONTINUE;
	},
	
	_getCutIndex: function(item) {
		var i, obj, n;
		var count = this._shopItemArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._shopItemArray[i] !== item) {
				continue;
			}
			
			obj = this._inventoryArray[i];
			
			if (obj.getAmount() <= 0) {
				continue;
			}
			
			n = obj.getAmount() - 1;
			if (n === 0) {
				obj.setAmount(-1);
				return i;
			}
			
			obj.setAmount(n);
		}
		
		return -1;
	},
	
	_startSale: function(isBuy, isForceStock) {
		var cutIndex;
		var price = this._itemSale.startSale(isBuy, isForceStock, this._activeItemWindow.getShopSelectItem());
		
		if (isBuy) {
			cutIndex = this._getCutIndex(this._activeItemWindow.getShopSelectItem());
			if (cutIndex !== -1) {
				this._cutArrayData(cutIndex);
				this._buyItemWindow.updateItemArea();
			}
		}
		
		// ゴールドを表示するウインドウの内容を変更する
		this._currencyWindow.startPriceCount(price);
		
		this._isSale = true;
		
		// 買ったときはアイテムを増やし、売ったときはアイテムを減らすから常に呼び出す
		this._sellItemWindow.updateItemArea();
		
		this._playSaleSound();
	},
	
	_cutArrayData: function(cutIndex) {
		this._shopItemArray.splice(cutIndex, 1);
		this._inventoryArray.splice(cutIndex, 1);
	},
	
	_playSaleSound: function() {
		MediaControl.soundDirect('itemsale');
	},
	
	_getTopWindowWidth: function() {
		return this._activeItemWindow.getWindowWidth() + this._itemInfoWindow.getWindowWidth();
	},
	
	_getTopWindowHeight: function() {
		return this._keeperWindow.getWindowHeight() + this._activeItemWindow.getWindowHeight();
	},
	
	_startMessage: function(text, mode) {
		this._keeperWindow.setShopMessage(text);
		this.changeCycleMode(ShopLayoutMode.MESSAGE);
		this._nextmode = mode;
	},
	
	_processMode: function(mode) {
		if (mode === ShopLayoutMode.SELLQUESTION) {
			this._activeSelectWindow = this._sellQuestionWindow;
			this._activeSelectWindow.resetShopIndex();
			this._activeSelectWindow.setShopActive(true);
			this._activeItemWindow = this._sellItemWindow;
			this._activeItemWindow.setShopActive(false);
		}
		else if (mode === ShopLayoutMode.BUYQUESTION) {
			this._activeSelectWindow = this._buyQuestionWindow;
			this._activeSelectWindow.resetShopIndex();
			this._activeSelectWindow.setShopActive(true);
			this._activeItemWindow = this._buyItemWindow;
			this._activeItemWindow.setShopActive(false);
		}
		else if (mode === ShopLayoutMode.BUYSELLSELECT) {
			this._activeSelectWindow = this._buySellWindow;
			this._activeSelectWindow.setShopActive(true);
			this._itemInfoWindow.setInfoItem(null);
			this._activeItemWindow.hideShopCursor();
		}
		else if (mode === ShopLayoutMode.BUY) {
			this._activeSelectWindow = this._buySellWindow;
			this._activeSelectWindow.setShopActive(false);
			this._activeItemWindow = this._buyItemWindow;
			this._activeItemWindow.setShopActive(true);
			this._itemInfoWindow.setInfoItem(this._buyItemWindow.getShopSelectItem());
		}
		else if (mode === ShopLayoutMode.SELL) {
			this._activeSelectWindow = this._buySellWindow;
			this._activeSelectWindow.setShopActive(false);
			this._activeItemWindow = this._sellItemWindow;
			this._activeItemWindow.setShopActive(true);
			this._itemInfoWindow.setInfoItem(this._sellItemWindow.getShopSelectItem());
		}
		else if (mode === ShopLayoutMode.VISITORSELECT) {
			this._activeSelectWindow.setShopActive(false);
			this._visitorSelectWindow.setShopActive(true);
		}
		
		this._nextmode = 0;
		this.changeCycleMode(mode);
	}
}
);

var ItemSale = defineObject(BaseObject,
{
	_parentShopScreen: null,
	
	startSale: function(isBuy, isForceStock, item) {
		var price = this._getPrice(isBuy, item);
		
		if (isBuy) {
			this._pushBuyItem(item, isForceStock);
		}
		else {
			this._cutSellItem(item);
		}
		
		this._setPrice(price);
		
		return price;
	},
	
	setParentShopScreen: function(parentShopScreen) {
		this._parentShopScreen = parentShopScreen;
	},
	
	_pushBuyItem: function(item, isForceStock) {
		var newItem;
		var unit = this._parentShopScreen.getVisitor();
		
		// BaseDataのアイテムはそのまま使用できないため、root.duplicateItemで複製する
		newItem = root.duplicateItem(item);
		
		if (isForceStock || unit === null) {
			StockItemControl.pushStockItem(newItem);
		}
		else {
			UnitItemControl.pushItem(unit, newItem);
		}
	},
	
	_cutSellItem: function(item) {
		var i, count;
		var unit = this._parentShopScreen.getStockVisitor();
		
		if (unit !== null) {
			count = DataConfig.getMaxUnitItemCount();
			for (i = 0; i < count; i++) {
				if (UnitItemControl.getItem(unit, i) === item) {
					UnitItemControl.cutItem(unit, i);
					break;
				}
			}
		}
		else {
			count = StockItemControl.getStockItemCount();
			for (i = 0; i < count; i++) {
				if (StockItemControl.getStockItem(i) === item) {
					StockItemControl.cutStockItem(i);
					break;
				}
			}
		}
	},
	
	_getPrice: function(isBuy, item) {
		var price;
		
		if (isBuy) {
			price = this._parentShopScreen.getGoldFromItem(item);
			price = Math.floor(price * this._parentShopScreen.getDiscountFactor());
			price *= -1;
		}
		else {
			price = Calculator.calculateSellPrice(item);
		}
		
		return price;
	},
	
	_setPrice: function(price) {
		this._parentShopScreen.setGold(this._parentShopScreen.getGold() + price);
	}
}
);

var ShopMessageWindow = defineObject(BaseWindow,
{
	_message: null,
	_messageAnalyzer: null,
	
	createShopAnalyzer: function() {
		var messageAnalyzerParam = this._createMessageAnalyzerParam();
		
		this._messageAnalyzer = createObject(MessageAnalyzer);
		this._messageAnalyzer.setMessageAnalyzerParam(messageAnalyzerParam);
	},
	
	setShopMessage: function(text) {
		if (text === '') {
			text = ' ';
		}
		
		// 通常、this._messageAnalyzer.moveMessageは、決定を押すまで制御を返さないが、
		// at文字をつけることでそれを防いでいる。
		this._messageAnalyzer.setMessageAnalyzerText('\\at[1]' + text);
	},
	
	moveWindowContent: function() {
		if (this._messageAnalyzer.moveMessageAnalyzer() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawWindowContent: function(x, y) {
		this._drawKeeperFace(x, y);
		
		// 店主のメッセージが複数ページにまたがると、違和感が生じるため、
		// setMessageAnalyzerTextにそうした文字列が指定されるべきではない。
		// 複数ページは好ましくないということで、カーソルに関する引数は指定しない。
		this._messageAnalyzer.drawMessageAnalyzer(x + GraphicsFormat.FACE_WIDTH + 10, y + 10, -1, -1, null);
	},
	
	getWindowWidth: function() {
		return 445;
	},
	
	getWindowHeight: function() {
		return DefineControl.getFaceWindowHeight();
	},
	
	getWindowXPadding: function() {
		return DefineControl.getFaceXPadding();
	},
	
	getWindowYPadding: function() {
		return DefineControl.getFaceYPadding();
	},
	
	getWindowTextUI: function() {
		return root.queryTextUI('face_window');
	},
	
	getWindowUI: function() {
		return root.queryTextUI('face_window').getUIImage();
	},
	
	_drawKeeperFace: function(x, y) {
		var handle = this.getParentInstance().getShopLayout().getFaceResourceHandle();
		
		ContentRenderer.drawFaceFromResourceHandle(x, y, handle);
	},
	
	_createMessageAnalyzerParam: function() {
		var textui = this.getWindowTextUI();
		var messageAnalyzerParam = StructureBuilder.buildMessageAnalyzerParam();
		
		messageAnalyzerParam.color = textui.getColor();
		messageAnalyzerParam.font = textui.getFont();
		messageAnalyzerParam.messageSpeedType = SpeedType.DIRECT;
		
		return messageAnalyzerParam;
	}
}
);

var ShopCurrencyWindowMode = {
	TOP: 0,
	WAIT: 1
};

var ShopCurrencyWindow = defineObject(BaseWindow,
{
	_counter: null,
	_balancer: null,
	
	setShopWindowData: function(price) {
		this._counter = createObject(CycleCounter);
		this._counter.setCounterInfo(30);
		
		this._balancer = createObject(SimpleBalancer);
		this._balancer.setBalancerInfo(price, this.getMaxPrice());
		
		this.changeCycleMode(ShopCurrencyWindowMode.NONE);
	},
	
	moveWindowContent: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === ShopCurrencyWindowMode.TOP) {
			result = this._moveTop();
		}
		else if (mode === ShopCurrencyWindowMode.WAIT) {
			result = this._moveWait();
		}
		
		return result;
	},
	
	drawWindowContent: function(x, y) {
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		var price = this._balancer.getCurrentValue();
		var text = this.getCurrencySign();
		
		TextRenderer.drawKeywordText(x, y, text, -1, color, font);
		
		NumberRenderer.drawNumber(x + 90, y, price);
	},
	
	getWindowWidth: function() {
		return 136;
	},
	
	getWindowHeight: function() {
		return 52;
	},
	
	startPriceCount: function(price) {
		this._balancer.startBalancerMove(price);
		this.changeCycleMode(ShopCurrencyWindowMode.TOP);
	},
	
	getMaxPrice: function() {
		return DataConfig.getMaxGold();
	},
	
	getCurrencySign: function() {
		return StringTable.CurrencySign_Gold;
	},
	
	_moveTop: function() {
		if (this._balancer.moveBalancer() !== MoveResult.CONTINUE) {
			this.changeCycleMode(ShopCurrencyWindowMode.WAIT);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveWait: function() {
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	}
}
);

var VisitorSelectResult = {
	UNIT: 0,
	STOCK: 1,
	CANCEL: 2,
	NONE: 3
};

var VisitorSelectWindow = defineObject(BaseWindow,
{
	_scrollbar: null,
	
	setShopWindowData: function() {
		this._createScrollbar();
	},
	
	moveWindowContent: function() {
		var index;
		var input = this._scrollbar.moveInput();
		var result = VisitorSelectResult.NONE;
		
		if (input === ScrollbarInput.SELECT) {
			index = this._scrollbar.getIndex();
			if (this._scrollbar.isSellTarget(index)) {
				if (index === 0) {
					result = VisitorSelectResult.UNIT;
				}
				else {
					result = VisitorSelectResult.STOCK;
				}
			}
			else {
				this._playOperationBlockSound();
			}
		}
		else if (input === ScrollbarInput.CANCEL) {
			result = VisitorSelectResult.CANCEL;
		}
		
		return result;
	},
	
	drawWindowContent: function(x, y) {
		this._scrollbar.drawScrollbar(x, y);
	},
	
	getWindowWidth: function() {
		return this._scrollbar.getScrollbarWidth() + (this.getWindowXPadding() * 2);
	},
	
	getWindowHeight: function() {
		return this._scrollbar.getScrollbarHeight() + (this.getWindowYPadding() * 2);
	},
	
	getSelectIndex: function() {
		if (this._scrollbar === null) {
			return 0;
		}
		
		return this._scrollbar.getIndex();
	},
	
	setShopActive: function(isActive) {
		this._scrollbar.enableSelectCursor(isActive);
	},
	
	getSelectTextArray: function() {
		return [StringTable.ShopLayout_Unit, StringTable.ShopLayout_Stock];
	},
	
	_createScrollbar: function() {
		var textArray;
		
		this._scrollbar = createScrollbarObject(VisitorSelectScrollbar, this);
		this._scrollbar.setActive(true);
		
		textArray = this.getSelectTextArray();
		this._scrollbar.setScrollFormation(1, textArray.length);
		this._scrollbar.setObjectArray(textArray);
	},
	
	_playOperationBlockSound: function() {
		MediaControl.soundDirect('operationblock');
	}
}
);

var VisitorSelectScrollbar = defineObject(BaseScrollbar,
{
	drawScrollContent: function(x, y, object, isSelect, index) {
		var length = this._getTextLength();
		var textui = this.getParentTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		if (!this.isSellTarget(index)) {
			color = ColorValue.DISABLE;
		}
		
		TextRenderer.drawText(x, y, object, length, color, font);
	},
	
	getObjectWidth: function() {
		return 105;
	},
	
	getObjectHeight: function() {
		return DefineControl.getTextPartsHeight();
	},
	
	isSellTarget: function(index) {
		var unit, result;
		
		if (index === 0) {
			unit = this.getParentInstance().getParentInstance().getVisitor();
			result = UnitItemControl.getPossessionItemCount(unit) > 0;
		}
		else {
			result = StockItemControl.getStockItemCount() > 0;
		}
		
		return result;
	},
	
	_getTextLength: function() {
		return this.getObjectWidth();
	}
}
);

// はい、いいえなどの選択肢のためのウインドウ。
// これは、BuySellWindow、BuyQuestionWindow、SellQuestionWindowが継承する。
var ShopSelectWindow = defineObject(BaseWindow,
{
	_scrollbar: null,
	
	setShopWindowData: function() {
		this._createScrollbar();
	},
	
	drawWindowContent: function(x, y) {
		this._scrollbar.drawScrollbar(x, y);
	},
	
	getWindowWidth: function() {
		return this._scrollbar.getScrollbarWidth() + (this.getWindowXPadding() * 2);
	},
	
	getWindowHeight: function() {
		return this._scrollbar.getScrollbarHeight() + (this.getWindowYPadding() * 2);
	},
	
	resetShopIndex: function() {
		this._scrollbar.setIndex(0);
	},
	
	setShopActive: function(isActive) {
		this._scrollbar.enableSelectCursor(isActive);
	},
	
	getSelectTextArray: function() {
		return null;
	},
	
	_createScrollbar: function() {
		var textArray;
		
		this._scrollbar = createScrollbarObject(ShopSelectScrollbar, this);
		this._scrollbar.setActive(true);
		
		textArray = this.getSelectTextArray();
		this._scrollbar.setScrollFormation(textArray.length, 1);
		this._scrollbar.setObjectArray(textArray);
	}	
}
);

var ShopSelectScrollbar = defineObject(BaseScrollbar,
{
	drawScrollContent: function(x, y, object, isSelect, index) {
		var length = this._getTextLength();
		var textui = this.getParentTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		TextRenderer.drawText(x, y, object, length, color, font);
	},
	
	getObjectWidth: function() {
		return 53;
	},
	
	getObjectHeight: function() {
		return DefineControl.getTextPartsHeight() - 10;
	},
	
	_getTextLength: function() {
		return this.getObjectWidth();
	}
}
);

var BuySellSelectResult = {
	BUY: 0,
	SELL: 1,
	CANCEL: 2,
	NONE: 3
};

var BuySellWindow = defineObject(ShopSelectWindow,
{
	moveWindowContent: function() {
		var input = this._scrollbar.moveInput();
		var result = BuySellSelectResult.NONE;
		
		if (input === ScrollbarInput.SELECT) {
			if (this._scrollbar.getIndex() === 0) {
				result = BuySellSelectResult.BUY;
			}
			else {
				result = BuySellSelectResult.SELL;
			}
		}
		else if (input === ScrollbarInput.CANCEL) {
			result = BuySellSelectResult.CANCEL;
		}
		else {
			result = BuySellSelectResult.NONE;
		}
		
		return result;
	},
	
	getSelectTextArray: function() {
		return [StringTable.ShopLayout_SelectBuy, StringTable.ShopLayout_SelectSell];
	},
	
	isPossessionItem: function() {
		var unit = this.getParentInstance().getStockVisitor();
		
		if (unit !== null) {
			return UnitItemControl.getPossessionItemCount(unit) > 0;
		}
		else {
			return StockItemControl.getStockItemCount() > 0;
		}
	}
}
);

var BuyQuestionResult = {
	BUY: 0,
	CANCEL: 1,
	NOGOLD: 2,
	ITEMFULL: 3,
	FORCESTOCK: 4,
	NONE: 5
};

var BuyQuestionWindow = defineObject(ShopSelectWindow,
{
	moveWindowContent: function() {
		var input = this._scrollbar.moveInput();
		var result = BuyQuestionResult.NONE;
		
		if (input === ScrollbarInput.SELECT) {
			if (this._scrollbar.getIndex() === 0) {
				if (!this._isPriceOk()) {
					// 購入しようとしたが、ゴールドが足りなかった
					result = BuyQuestionResult.NOGOLD;
				}
				else if (!this._isSpaceOk()) {
					if (!this._isForceStockOk()) {
						// 購入しようとしたが、アイテム欄が一杯だった
						result = BuyQuestionResult.ITEMFULL;
					}
					else {
						// アイテム欄が一杯だが、ストックに送ることで購入する
						result = BuyQuestionResult.FORCESTOCK;
					}
				}
				else {
					result = BuyQuestionResult.BUY;
				}
			}
			else {
				result = BuyQuestionResult.CANCEL;
			}
		}
		else if (input === ScrollbarInput.CANCEL) {
			result = BuyQuestionResult.CANCEL;
		}
		
		return result;
	},
	
	getSelectTextArray: function() {
		return [StringTable.QuestionWindow_DefaultCase1, StringTable.QuestionWindow_DefaultCase2];
	},
	
	_isPriceOk: function() {
		var gold = this.getParentInstance().getGold();
		var itemGold = this.getParentInstance().getGoldFromItem(this.getParentInstance().getSelectItem());
		
		itemGold = Math.floor(itemGold * this.getParentInstance().getDiscountFactor());
		
		return gold >= itemGold;
	},
	
	_isSpaceOk: function() {
		var result;
		var unit = this.getParentInstance().getVisitor();
		
		if (unit !== null) {
			result = this._isUnitSpaceOk(unit);
		}
		else {
			result = this._isStockSpaceOk();
		}
			
		return result;
	},
	
	_isUnitSpaceOk: function(unit) {
		return UnitItemControl.isUnitItemSpace(unit);
	},
	
	_isStockSpaceOk: function() {
		return StockItemControl.isStockItemSpace();
	},
	
	_isForceStockOk: function() {
		var unit = this.getParentInstance().getVisitor();
		
		if (unit !== null) {
			if (!Miscellaneous.isStockAccess(unit) && root.getCurrentScene() === SceneType.FREE) {
				// クラスオプションとしてストックを持っておらず、
				// さらにシーンがSceneType.FREEである場合は、
				// アイテムをストックに送れるかどうかがisFullItemTransportableで決定する。
				if (!DataConfig.isFullItemTransportable()) {
					return false;
				}
			}
		}
		
		return this._isStockSpaceOk();
	}
}
);

var SellQuestionResult = {
	SELL: 0,
	CANCEL: 1,
	NOSELL: 2,
	NONE: 3
};

var SellQuestionWindow = defineObject(ShopSelectWindow,
{
	moveWindowContent: function() {
		var input = this._scrollbar.moveInput();
		var result = BuyQuestionResult.NONE;
		
		if (input === ScrollbarInput.SELECT) {
			if (this._scrollbar.getIndex() === 0) {
				if (this._isSellOk()) {
					result = SellQuestionResult.SELL;
				}
				else {
					result = SellQuestionResult.NOSELL;
				}
			}
			else {
				result = SellQuestionResult.CANCEL;
			}
		}
		else if (input === ScrollbarInput.CANCEL) {
			result = BuyQuestionResult.CANCEL;
		}
		
		return result;
	},
	
	getSelectTextArray: function() {
		return [StringTable.QuestionWindow_DefaultCase1, StringTable.QuestionWindow_DefaultCase2];
	},
	
	_isSellOk: function() {
		var item = this.getParentInstance().getSelectItem();
		
		// 重要アイテムでなければ売れる
		return !item.isImportance();
	}	
}
);

// ShopItemWindowは下側に存在するウインドウ
var ShopItemWindow = defineObject(BaseWindow,
{
	_scrollbar: null,
	
	setShopWindowData: function() {	
		var count = 6;
		
		if (root.getGameAreaHeight() >= 600) {
			count = 7;
		}
		
		this._scrollbar = createScrollbarObject(this.getScrollbarObject(), this);
		this._scrollbar.setScrollFormation(1, count);
		this._scrollbar.enablePageChange();
		this.updateItemArea();
	},
	
	moveWindowContent: function() {
		var input = this._scrollbar.moveInput();
		
		if (this._scrollbar.checkAndUpdateIndex()) {
			this.getParentInstance().notifyInfoItem(this._scrollbar.getObject());
		}
		
		return input;
	},
	
	drawWindowContent: function(x, y) {
		// 情報ウインドウにスクロールカーソルがかぶらないように、後で描画
		this._scrollbar.drawScrollbar(x, y);
	},
	
	getWindowWidth: function() {
		return 330;
	},
	
	getWindowHeight: function() {
		return this._scrollbar.getScrollbarHeight() + (this.getWindowYPadding() * 2);
	},
	
	getDiscountFactor: function() {
		return this.getParentInstance().getDiscountFactor();
	},
	
	getShopSelectItem: function() {
		return this._scrollbar.getObject();
	},
	
	setShopActive: function(isActive) {
		this._scrollbar.enableSelectCursor(isActive);
	},
	
	hideShopCursor: function() {
		this._scrollbar.setForceSelect(-1);
		this._scrollbar.setActive(false);
	},
	
	getItemCount: function() {
		return this._scrollbar.getObjectCount();
	},
	
	getScrollbarObject: function() {
		return null;
	},
	
	updateItemArea: function() {
	}
}
);

var BuyItemWindow = defineObject(ShopItemWindow,
{
	getScrollbarObject: function() {
		return BuyScrollbar;
	},
	
	updateItemArea: function() {
		var itemArray = this.getParentInstance().getShopItemArray();
		
		// 在庫が設定されている場合はアイテムが消えるため、スクロール位置を保存
		this._scrollbar.saveScroll();
		
		this._scrollbar.setObjectArray(itemArray);
		this._scrollbar.resetAvailableData();
		
		this._scrollbar.restoreScroll();
	}
}
);

var SellItemWindow = defineObject(ShopItemWindow,
{
	_unit: null,
	
	getScrollbarObject: function() {
		return SellScrollbar;
	},
	
	updateItemArea: function() {
		var i, item, count;
		var unit = this.getParentInstance().getStockVisitor();
		
		if (this._unit === unit) {
			this._scrollbar.saveScroll();
		}
		
		this._scrollbar.resetScrollData();
		
		if (unit !== null) {
			count = DataConfig.getMaxUnitItemCount();
			for (i = 0; i < count; i++) {
				item = UnitItemControl.getItem(unit, i);
				if (item !== null) {
					this._scrollbar.objectSet(item);
				}
			}
		}
		else {
			count = StockItemControl.getStockItemCount();
			for (i = 0; i < count; i++) {
				item = StockItemControl.getStockItem(i);
				if (item !== null) {
					this._scrollbar.objectSet(item);
				}
			}
		}
		
		this._scrollbar.objectSetEnd();
		this._scrollbar.resetAvailableData();
		
		// 売却先を変更していなければ、前回のスクロール位置を維持する
		if (this._unit === unit) {
			this._scrollbar.restoreScroll();
		}
		
		this._unit = unit;
	}
}
);

var BuyScrollbar = defineObject(BaseScrollbar,
{
	_availableArray: null,
	
	drawScrollContent: function(x, y, object, isSelect, index) {
		var textui = this.getParentTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		var item = object;
		var arr = this.getParentInstance().getParentInstance().getInventoryArray();
		var amount = arr[index].getAmount();
		
		if (!this._availableArray[index]) {
			// 条件を満たしていないアイテムを薄暗くする
			color = ColorValue.DISABLE;
		}
		
		ItemRenderer.drawShopItem(x, y, item, color, font, this._getPrice(item), amount);
	},
	
	resetAvailableData: function() {
		var i, item;
		var length = this._objectArray.length;
		
		this._availableArray = [];
		
		for (i = 0; i < length; i++) {
			item = this._objectArray[i];
			if (item !== null) {
				this._availableArray.push(this._isItemBuyable(item));
			}
		}
	},
	
	getObjectWidth: function() {
		return ItemRenderer.getShopItemWidth();
	},
	
	getObjectHeight: function() {
		return ItemRenderer.getItemHeight();
	},
	
	_isItemBuyable: function(item) {
		var result;
		var unit = this.getParentInstance().getParentInstance().getVisitor();
		
		if (unit === null) {
			return true;
		}
		
		if (item.isWeapon()) {
			result = ItemControl.isWeaponAvailable(unit, item);
		}
		else {
			result = ItemControl.isItemUsable(unit, item);
		}
		
		return result;
	},
	
	_getPrice: function(item) {
		var price = this.getParentInstance().getParentInstance().getGoldFromItem(item);
		
		return Math.floor(price * this.getParentInstance().getDiscountFactor());
	}
}
);

var SellScrollbar = defineObject(BaseScrollbar,
{
	drawScrollContent: function(x, y, object, isSelect, index) {
		var textui = this.getParentTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		var item = object;
		
		ItemRenderer.drawShopItem(x, y, item, color, font, Calculator.calculateSellPrice(item), 0);
	},
	
	resetAvailableData: function() {
	},
	
	getObjectWidth: function() {
		return ItemRenderer.getShopItemWidth();
	},
	
	getObjectHeight: function() {
		return ItemRenderer.getItemHeight();
	}
}
);


//------------------------------------------------------------------


var BonusLayoutScreen = defineObject(ShopLayoutScreen,
{
	_bonusArray: null,

	_prepareScreenMemberData: function(screenParam) {
		this._targetUnit = screenParam.unit;
		this._shopLayout = screenParam.shopLayout;
		
		this._isSale = false;
		this._nextmode = 0;
		this._itemSale = createObject(ItemSale);
		this._itemSale.setParentShopScreen(this);
		
		this._shopItemArray = screenParam.itemArray;
		this._inventoryArray = screenParam.inventoryArray;
		this._buyItemWindow = createWindowObject(BuyItemWindow, this);
		this._buyQuestionWindow = createWindowObject(BuyQuestionWindow, this);
		this._currencyWindow = createWindowObject(BonusCurrencyWindow, this);
		this._keeperWindow = createWindowObject(ShopMessageWindow, this);
		this._itemInfoWindow = createWindowObject(ItemInfoWindow, this);
		
		this._sellItemWindow = createWindowObject(SellItemWindow, this);
		this._buySellWindow = createWindowObject(BuySellWindow, this);
		this._sellQuestionWindow = createWindowObject(SellQuestionWindow, this);
		
		this._activeSelectWindow = this._buySellWindow;
		this._activeItemWindow = this._buyItemWindow;
		
		this._bonusArray = screenParam.bonusArray;
		
		this._createShopMessageTable(this._shopLayout);
	},
	
	_completeScreenMemberData: function(screenParam) {
		this._arrangeInventoryArray();
		
		this._buyItemWindow.setShopWindowData();
		this._sellItemWindow.setShopWindowData();
		this._buySellWindow.setShopWindowData();
		this._buyQuestionWindow.setShopWindowData();
		this._sellQuestionWindow.setShopWindowData();
		this._currencyWindow.setShopWindowData(this.getGold());
		
		// 買う/売るのウインドウは表示しない
		this._buySellWindow.enableWindow(false);
		
		this._keeperWindow.createShopAnalyzer();
		
		this._startMessage(this._shopMessageTable.FirstMessage, ShopLayoutMode.BUY);
		
		this._buyItemWindow.setShopActive(true);
		this._itemInfoWindow.setInfoItem(this._buyItemWindow.getShopSelectItem());
	},
	
	_moveBuy: function() {
		var input = this._buyItemWindow.moveWindow();
			
		if (input === ScrollbarInput.SELECT) {
			if (this._buyItemWindow.getItemCount() > 0) {
				this._startMessage(this._shopMessageTable.SelectQuestion, ShopLayoutMode.BUYQUESTION);
			}
		}
		else if (input === ScrollbarInput.CANCEL) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_cutArrayData: function(cutIndex) {
		this._shopItemArray.splice(cutIndex, 1);
		this._inventoryArray.splice(cutIndex, 1);
		this._bonusArray.splice(cutIndex, 1);
	},
	
	getDiscountFactor: function() {
		return 1;
	},
	
	getGold: function() {
		return root.getMetaSession().getBonus();
	},
	
	setGold: function(gold) {
		root.getMetaSession().setBonus(gold);
	},
	
	getGoldFromItem: function(item) {
		var i;
		var count = this._shopItemArray.length;
			
		for (i = 0; i < count; i++) {
			if (ItemControl.compareItem(this._shopItemArray[i], item)) {
				return this._bonusArray[i];
			}
		}
		
		return 0;
	}
}
);

var BonusCurrencyWindow = defineObject(ShopCurrencyWindow,
{
	getMaxPrice: function() {
		return DataConfig.getMaxBonus();
	},
	
	getCurrencySign: function() {
		return StringTable.CurrencySign_Bonus;
	}
}
);


//------------------------------------------------------------------


var PointLayoutScreen = defineObject(BonusLayoutScreen,
{
	_point: 0,
	
	_prepareScreenMemberData: function(screenParam) {
		BonusLayoutScreen._prepareScreenMemberData.call(this, screenParam);
		
		this._currencyWindow = createWindowObject(PointCurrencyWindow, this);
		this._point = root.getExternalData().getGameClearPoint();
	},
	
	getGold: function() {
		return this._point;
	},
	
	setGold: function(gold) {
		this._point = gold;
	}
}
);

var PointCurrencyWindow = defineObject(ShopCurrencyWindow,
{
	getMaxPrice: function() {
		return DataConfig.getMaxBonus();
	},
	
	getCurrencySign: function() {
		return StringTable.CurrencySign_Point;
	}
}
);
