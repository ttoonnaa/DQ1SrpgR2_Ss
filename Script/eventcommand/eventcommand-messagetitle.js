
var MessageTitleEventCommand = defineObject(BaseEventCommand,
{
	_text: null,
	_textWidth: 0,
	_partsCount: 0,
	_partsWidth: 0,
	_partsHeight: 0,
	_xStart: 0,
	_yStart: 0,
	
	enterEventCommandCycle: function() {
		this._prepareEventCommandMemberData();
		
		if (!this._checkEventCommand()) {
			return EnterResult.NOTENTER;
		}
		
		return this._completeEventCommandMemberData();
	},
	
	moveEventCommandCycle: function() {
		if (InputControl.isSelectAction()) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawEventCommandCycle: function() {
		var x, y, pos;
		var textui = this._getTitleText();
		var pic = textui.getUIImage();
		var color = textui.getColor();
		var font = textui.getFont();
		
		if (this._xStart === -1 && this._xStart === -1) {
			pos = this._getTitleCenterPos();
			x = pos.x;
			y = pos.y;
		}
		else {
			x = this._xStart;
			y = this._yStart;
		}
		
		TextRenderer.drawTitleText(x, y, this._text, color, font, TextFormat.CENTER, pic);
	},
	
	_prepareEventCommandMemberData: function() {
		var eventCommandData = root.getEventCommandObject();
		var textui = this._getTitleText();
		var font = textui.getFont();
		
		this._text = eventCommandData.getText();
		this._textWidth = TextRenderer.getTextWidth(this._text, font);
		this._partsCount = TitleRenderer.getTitlePartsCount(this._text, font);
		this._partsWidth = TitleRenderer.getTitlePartsWidth();
		this._partsHeight = TitleRenderer.getTitlePartsHeight();
		
		if (eventCommandData.isCenterShow()) {
			// 特定の背景ベースであるか、マップベースであるかによって、root.getGameAreaWidthの値は変化し、
			// 中央位置は異なるため、ここで_getTitleCenterPosを呼び出さない。
			this._xStart = -1;
			this._yStart = -1;
		}
		else {
			this._xStart = eventCommandData.getX();
			this._yStart = eventCommandData.getY();
		}
	},
	
	_checkEventCommand: function() {
		return this.isEventCommandContinue();
	},
	
	_completeEventCommandMemberData: function() {
		return EnterResult.OK;
	},
	
	_getTitleCenterPos: function() {
		var x, y;
		var maxWidth = this._partsWidth * (this._partsCount + 2);
		
		x = Math.floor(root.getGameAreaWidth() / 2);
		x -= Math.floor(maxWidth / 2);

		y = Math.floor(root.getGameAreaHeight() / 2);
		y -= Math.floor(this._partsHeight / 2);
		
		return createPos(x, y);
	},
	
	_getTitleText: function() {
		return root.queryTextUI('eventmessage_title');
	}
}
);
