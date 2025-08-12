
// *****************************************************************************************************************************
// ContentRenderer
// -----------------------------------------------------------------------------------------------------------------------------
//		ThirdParty の立ち絵表示を入れてるのでそこからさらに拡張する
//		基本は unit.getCharIllustImage を tona_UnitControl.getImage に置き換えるだけ
// -----------------------------------------------------------------------------------------------------------------------------

ContentRenderer.drawUnitImage = function(x, y, unit, id, isReverse, alpha) {
	var image = tona_UnitControl.getImage(unit, id);

	if (image !== null) {
	    image.setReverse(isReverse);
	    image.setAlpha(alpha);
	    image.draw(x,y);
	}
};

// 戦闘前画面での立ち絵描画
ContentRenderer.drawUnitImage2 = function(x, y, unit, target_unit, id, isReverse, alpha, flag1, flag2) {
	var image = tona_UnitControl.getImage(unit, id);
	var image_alpha = alpha;
	var unit_over_write;
	var target_over_write;

	if (image !== null) {
		unit_over_write   = this.isOverWrite(x, image.getWidth(), y, image.getHeight(), unit);
		target_over_write = this.isOverWrite(x, image.getWidth(), y, image.getHeight(), target_unit);

		// flagがtrueなら、立ち絵がキャラと重なる場合、アルファ値を半分（半透明）にする
		if( flag1 == true && ((unit_over_write == true) || (target_over_write == true)) ) {
			image_alpha /= 2;
		}

	    image.setReverse(isReverse);
	    image.setAlpha(image_alpha);
	    image.draw(x,y);

		// flag2がtrueなら、立ち絵がキャラと重なる場合、ユニットを立ち絵の上に描画する
		if( flag2 == true ) {
			// 自ユニットが重なっていれば立ち絵の上に描画する
			if( unit_over_write == true ) {
				this.drawUnit(unit,alpha);
			}

			// 対象ユニットが重なっていれば立ち絵の上に描画する
			if( target_over_write == true ) {
				this.drawUnit(target_unit,alpha);
			}
		}

	}
};


