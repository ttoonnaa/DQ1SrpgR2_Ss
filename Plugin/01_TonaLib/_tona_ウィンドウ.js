
// *****************************************************************************************************************************
// BaseMessageView：イベントメッセージでの立ち絵表示位置を変更する
// -----------------------------------------------------------------------------------------------------------------------------

BaseMessageView.getIllustY = function(image) {

	return 50;
};

// **************************************************************************************************************************
// PosMenu：戦闘準備ウィンドウ
// --------------------------------------------------------------------------------------------------------------------------

PosMenu.changePosTarget = function(targetUnit) {
	var targetItem, isLeft;

	if (this._unit === null || !this._isTargetAllowed(targetUnit)) {
		this._currentTarget = null;
		return;
	}

	this._currentTarget = targetUnit;
	targetItem = ItemControl.getEquippedWeapon(targetUnit);

	// srcを常に左側に表示するものとする
	isLeft = Miscellaneous.isUnitSrcPriority(this._unit, targetUnit);

	// ★改造：入れ替えて見た
	isLeft = !isLeft;

	// 自軍を左側に表示することを優先している(左側の方が見やすいと判断)
	// このため、自軍が仕掛けた場合は当然左側に表示されるが、
	// 自軍が仕掛けられた場合でも左側に表示される。
	// 両方、自軍である場合は仕掛けた方を左側に表示する。
	if (isLeft) {

		// 仕掛けたのは自軍であるため、これを_posWindowLeftに指定
		this._posWindowLeft.setPosTarget(this._unit, this._item, targetUnit, targetItem, true);
		this._posWindowRight.setPosTarget(targetUnit, targetItem, this._unit, this._item, false);
	}
	else {

		// 仕掛けたのは自軍ではない。
		// この場合、targetUnitが自軍であるため、これを_posWindowLeftに指定。
		this._posWindowLeft.setPosTarget(targetUnit, targetItem, this._unit, this._item, true);
		this._posWindowRight.setPosTarget(this._unit, this._item, targetUnit, targetItem, false);
	}
}

