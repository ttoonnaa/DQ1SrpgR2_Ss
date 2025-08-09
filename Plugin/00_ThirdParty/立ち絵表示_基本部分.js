/*--------------------------------------------------------------------------
  
　立ち絵を表示するスクリプト（基本部分）

■概要
　このファイルは立ち絵表示用スクリプトで使用する基本部分です。
　立ち絵表示スクリプトを使用する場合、このファイルも一緒に入れてください。


■注意点
　このファイルだけを入れても立ち絵は表示できません。
　必ず他の『立ち絵表示_XXX.js』というプラグインも一緒に入れてください。


修正内容
15/8/30　新規作成
15/9/02　wikiアップ用に細かく修正
15/9/05　戦闘前立ち絵表示スクリプト追加の為、ソースファイルを分割
16/4/08　HPの残量に応じて立ち絵の参照IDを変える処理を追加
16/ 4/21　キャラが立ち絵と重なる場合、立ち絵を半透明にするオプションを追加
16/ 4/22　キャラが立ち絵と重なる場合、立ち絵の上にキャラを描画するオプションを追加
16/ 9/21　立ち絵の上にキャラを描画する判定にバグがあった為修正


■対応バージョン
　SRPG Studio Version:1.093


■規約
・利用はSRPG Studioを使ったゲームに限ります。
・商用・非商用問いません。フリーです。
・加工等、問題ありません。どんどん改造してください。
・クレジット明記無し　OK
・再配布、転載　OK
・wiki掲載　OK
・SRPG Studio利用規約は遵守してください。
  
--------------------------------------------------------------------------*/


(function() {


//---------------------------------------------------------------------
// 立ち絵描画処理の基本部分（ContentRendererクラス内に追加作成した）
//---------------------------------------------------------------------
// ステータス画面での立ち絵描画
ContentRenderer.drawUnitImage= function(x, y, unit, id, isReverse, alpha) {
		var image = unit.getCharIllustImage(id);

		if (image !== null) {
		    image.setReverse(isReverse);
		    image.setAlpha(alpha);
		    image.draw(x,y);
		}
};


// 戦闘前画面での立ち絵描画
ContentRenderer.drawUnitImage2= function(x, y, unit, target_unit, id, isReverse, alpha, flag1, flag2) {
		var image = unit.getCharIllustImage(id);
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


// ユニットの残HPのパーセントからID参照用のインデックスを求める
ContentRenderer.calcPercentIndex = function(unit, percent_tbl) {
		var percent = Math.floor((unit.getHp()*100) / ParamBonus.getMhp(unit));
		var i;
		var cnt = percent_tbl.length;

		for (i = 0;i < cnt;i++ ) {
			if( percent <= percent_tbl[i] ) {
				return i;
			}
		}
		return (cnt-1);
};


ContentRenderer.isOverWrite= function(x, width, y, height, unit) {
		var unit_x = LayoutControl.getPixelX(unit.getMapX());
		var unit_y = LayoutControl.getPixelY(unit.getMapY());

//root.log('x:'+x+'～'+(x+width )+' unit_X:'+unit_x+'～'+(unit_x+32));
//root.log('y:'+y+'～'+(y+height)+' unit_Y:'+unit_y+'～'+(unit_y+32));

		if( x < unit_x && (unit_x+32) < (x + width) && y < unit_y && (unit_y+32) < (y + height) ) {
			return true;
		}
		return false;
}


ContentRenderer.drawUnit= function(unit, alpha) {
		var x = LayoutControl.getPixelX(unit.getMapX());
		var y = LayoutControl.getPixelY(unit.getMapY());
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
}


})();