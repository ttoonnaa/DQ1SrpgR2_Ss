/*--------------------------------------------------------------------------
  
　戦闘前画面で立ち絵を表示するスクリプト

■概要
　戦闘前画面で立ち絵が表示できるようになります。

■事前準備
　立ち絵を表示したいユニットは、立ち絵を設定しておく必要があります。
　ユニットの詳細情報→立ち絵画像→表情の編集で使用する立ち絵をセットしてください。
　基本的に使われるのは通常（0番）の画像です。
　（本ファイル内で使う立ち絵のIDを変える事も可能です。その場合はカスタマイズしたいの２．を参照してください）

■使用法
　このファイルと立ち絵表示_基本部分.jsをプラグインフォルダに入れればそのまま使用可能です。
　ただし、ゲーム画面のサイズは幅640高さ480を基準にしていますので、サイズが異なる場合はカスタマイズしたいの１．を確認して座標を弄ってください。


■カスタマイズしたい

　１．画像の表示位置を変えたい
　　　　→本ソースの設定項目にある、
　　　　　左側立ち絵表示X座標（var LeftPicture_X = -150;）、左側立ち絵表示Y座標（var LeftPicture_Y = 0;）、
　　　　　右側立ち絵表示X座標（var RightPicture_X = 400;）、右側立ち絵表示Y座標（var RightPicture_Y = 0;）の、
　　　　　数値部分を弄れば、表示位置が変化します。

　２．立ち絵に使う表情IDを変えたい
　　　　→本ソースの設定項目にある、立ち絵をセットした表情のIDの以下の数値部分を弄ってください。
　　　　　（var AttackWindowPicture_ID = [
　　　　　　　　　　　　　　　　　　　　　[0,0,0,0],　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　　　　　[0,0,0,0]
　　　　　　　　　　　　　　　　　　　　　];）
　　　　　現在は通常（0番）になっていますが、1にすれば微笑む、12にすればカスタム1に設定した立ち絵が使用されます。

　３．立ち絵の透明度を変えたい
　　　　→本ソースの設定項目にある、立ち絵の透明度（var AttackWindowPictureAlpha = 255;）の数値部分を弄ってください。
　　　　　255は不透明。128で半透明。0で透明になります。
　　　　　但し、使用する立ち絵全ての透明度が変化するので注意して下さい（特定の絵だけ透明度を変える事はできません）

　４．残HPに応じて使う表情IDを変えたい
　　　　→本ソースの設定項目にある、立ち絵をセットした表情のID（var AttackWindowPicture_ID = [0,0,0,0];）の数値部分を弄ってください。
　　　　　初期だと一番左が残HP0-25%の時のID、2番目が残HP26-50%の時のID、3番目が残HP51-75%の時のID、4番目が残HP76-100%の時のIDになっています。

　５．表情IDを変える残HP量を変えたい
　　　　→本ソースの設定項目にある、立ち絵を切り替えるHPの残り％（var AttackWindowPicture_PercentTbl = [25,50,75,100];）の数値部分を弄ってください。
　　　　　数値がそのまま%を示しています。初期だと一番左が残HP25%、2番目が残HP50%、3番目が残HP75%、4番目が残HP100%となっています。
　　　　　[20,40,60,100]とすれば20%、40%、60%、100%で画像を切り替える事が出来るようになります。

　６．戦闘結果予測ウィンドウが上に来た場合、使う表情IDを変えたい
　　　　→本ソースの設定項目にある、戦闘結果予測ウィンドウが上に来た場合に立ち絵を切り替えるかどうか
　　　　　（var useUpperWindow_Picture = false;）のfalseをtrueに書き換えてください。
　　　　　その上で本ソースの設定項目にある、戦闘結果予測ウィンドウが上に来た場合の立ち絵IDの数値部分を弄ってください。
　　　　　（var AttackWindowPicture_UpperID = [
　　　　　　　　　　　　　　　　　　　　　　　　[0,0,0,0],　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　　　　　　　　[0,0,0,0]
　　　　　　　　　　　　　　　　　　　　　　　];）
　　　　　初期だと一番左が残HP0-25%の時のID、2番目が残HP26-50%の時のID、3番目が残HP51-75%の時のID、4番目が残HP76-100%の時のIDになっています。

　７．上級職と下級職で立ち絵に使う表情IDを変えたい
　　　　→本ソースの設定項目にある、上級職になると違う立ち絵を表示するか
　　　　　（var AttackWindowPicture_DispUpperClass = false;）のfalseをtrueに書き換えてください。

　　　　　その上で本ソースの設定項目にある、立ち絵をセットした表情のIDの以下の数値部分を弄ってください。
　　　　　（var AttackWindowPicture_ID = [
　　　　　　　　　　　　　　　　　　　　　[0,0,0,0],
　　　　　　　　　　　　　　　　　　　　　[0,0,0,0]　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　　　　　];）

　　　　　なお、戦闘結果予測ウィンドウが上に来た場合に表情IDを切り替えている場合、以下の部分も弄ってください。
　　　　　（var AttackWindowPicture_UpperID = [
　　　　　　　　　　　　　　　　　　　　　　　　[0,0,0,0],
　　　　　　　　　　　　　　　　　　　　　　　　[0,0,0,0]　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　　　　　　　];）

　　　　　※この設定を有効にしている場合で、下級職と上級職で同じ立ち絵を使いまわすキャラは以下の例のようにしてください
　　　　　（var AttackWindowPicture_ID = [
　　　　　　　　　　　　　　　　　　　　　[0,1,2,3], 　　　//←この4つと
　　　　　　　　　　　　　　　　　　　　　[0,1,2,3]　　　　//←この4つの数字を上下で同じ値にしてください
　　　　　　　　　　　　　　　　　　　　　];）

　　　　　（戦闘結果予測ウィンドウが上に来た場合に表情IDを切り替えている場合、var AttackWindowPicture_UpperIDでも同じようにしてください）

　８．立ち絵とユニットが重なる場合に立ち絵が半透明となるようにしたい
　　　　→本ソースの設定項目にある、立ち絵とキャラが重なる場合、立ち絵の透明度を半透明にするか
　　　　　（var isOverWriteHalf = false;）のfalseをtrueに書き換えてください。

　９．立ち絵とユニットが重なる場合に立ち絵の上にキャラを表示したい
　　　　→本ソースの設定項目にある、立ち絵とキャラが重なる場合、立ち絵の上にキャラを表示するか
　　　　　（var isOverWriteChar = false;）のfalseをtrueに書き換えてください。

　10．立ち絵とユニットが重なる場合に立ち絵を反対側に表示したい
　　　　※自軍ユニットにだけ立ち絵をつけている時に使えます
　　　　→本ソースの設定項目にある、立ち絵とキャラが重なる場合、自軍ユニットを反対側にキャラを表示するか
　　　　　（var isOverWriteOtherSide = false;）のfalseをtrueに書き換えてください。

　11．戦闘結果予測左側の立ち絵を通常の向きで表示したい（反転しないようにしたい）
　　　　→本ソースの設定項目にある、戦闘結果予測左側の立ち絵を反転するか
　　　　　（var isLeftSilePictureReverse = true;）のtrueをfalseに書き換えてください。


■注意点
　　注意点：使用する立ち絵は、顔の部分がなるべく幅の中央付近にくるようにしてください。
　　　　　　左側の画像は左右反転しているため、顔が幅の中央にないと反転時に大きく位置がずれてみえます。
　　　　　　（カスタマイズ11.にある設定を弄る事で、左側の立ち絵を通常の向きで表示する事も出来ます）


修正内容
15/ 9/05　新規作成
16/ 4/08　HPの残量に応じて立ち絵の参照IDを変える処理を追加
16/ 4/10　戦闘結果予測ウィンドウが上に来た場合に立ち絵の参照IDを変える処理を追加
16/ 4/10b キャラが下級職か上級職かで立ち絵に指定するIDを変える処理を追加
16/ 4/21　キャラが立ち絵と重なる場合、立ち絵を半透明にするオプションを追加
16/ 4/22　キャラが立ち絵と重なる場合、立ち絵の上にキャラを描画するオプションを追加
16/12/27　キャラが立ち絵と重なる場合、立ち絵を反対側に表示するオプションを追加（自軍ユニットにだけ立ち絵をつけている時に使えます）
19/01/26　戦闘結果予測左側の立ち絵が反転しなくなる設定を追加



■対応バージョン
　SRPG Studio Version:1.108


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


//--------------------------------------------------------------------------
// 設定項目（通常はこの部分を設定するだけでOKです）
//--------------------------------------------------------------------------

// 左側立ち絵表示X座標（立ち絵を表示するX座標です。X座標を変えたい時は数値を変えてください）
var LeftPicture_X = 0;//-150;

// 左側立ち絵表示Y座標（立ち絵を表示するY座標です。Y座標を変えたい時は数値を変えてください）
var LeftPicture_Y = 50;//0;

// 右側立ち絵表示X座標（立ち絵を表示するX座標です。X座標を変えたい時は数値を変えてください）
var RightPicture_X = 1024 - 512 - LeftPicture_X;//400;

// 右側立ち絵表示Y座標（立ち絵を表示するY座標です。Y座標を変えたい時は数値を変えてください）
var RightPicture_Y = 50;//0;

// 立ち絵の透明度（立ち絵の透明度です。255は不透明。128で半透明。0で透明になります。透明度を変えたい時に数字を変えてください）
var AttackWindowPictureAlpha = 255;



// 立ち絵を切り替えるHPの残り％（初期だと0-25％、26-50％、51-75％、76-100％の4通り）
var AttackWindowPicture_PercentTbl = [25,50,75,100];

// 立ち絵をセットした表情のID（通常なら0、カスタム1なら12という風になります。詳細情報→立ち絵画像の中を参照ください)
var AttackWindowPicture_ID = [			// （初期だと0-25％、26-50％、51-75％、76-100％の4通りのIDを入れられます）
								[0,0,0,0],	// 下級職orデフォルト時につかう表情ID
								[0,0,0,0]	// 上級職で画像を変える時につかう表情ID（AttackWindowPicture_DispUpperClassがtrueの場合、初期上級キャラはこちらにIDを入れます）
							 ];


// 戦闘結果予測ウィンドウが上に来た場合の立ち絵ID（通常なら0、カスタム1なら12という風になります。詳細情報→立ち絵画像の中を参照ください)
var AttackWindowPicture_UpperID = [		// （初期だと0-25％、26-50％、51-75％、76-100％の4通りのIDを入れられます）
								[0,0,0,0],	// 下級職orデフォルト時につかう表情ID
								[0,0,0,0]	// 上級職で画像を変える時につかう表情ID（AttackWindowPicture_DispUpperClassがtrueの場合、初期上級キャラはこちらにIDを入れます）
							 ];

// 戦闘結果予測ウィンドウが上に来た場合に立ち絵を切り替えるかどうか
var useUpperWindow_Picture = false;	// （true:立ち絵を変える false:変えない）

// 上級職になると違う立ち絵を表示するか（true:違う立ち絵を表示。false:下級職と同じ立ち絵）
var AttackWindowPicture_DispUpperClass = false;

// 立ち絵とキャラが重なる場合、立ち絵の透明度を半透明にするか（true:半透明にする。false:しない）
var isOverWriteHalf = false;

// 立ち絵とキャラが重なる場合、立ち絵の上にキャラを表示するか（true:表示する。false:しない）
var isOverWriteChar = false;

// 立ち絵とキャラが重なる場合、自軍ユニットを反対側にキャラを表示するか（true:表示する。false:しない）
var isOverWriteOtherSide = false;

// 戦闘結果予測左側の立ち絵を反転するか（true:反転する。false:しない）
var isLeftSilePictureReverse = true;




//---------------------------------------------------------------------
// 処理部分（細かくカスタマイズしたい場合、以下を触ってください）
//---------------------------------------------------------------------


// 立ち絵の描画（戦闘前ウィンドウの描画より前に立ち絵画像を書くようにしています）
PosAttackWindow.drawWindow= function(x, y) {
		var width = this.getWindowWidth();
		var height = this.getWindowHeight();
		var textui = this.getWindowTextUI();
		var pic = textui.getUIImage();
		var cls_LH = ClassRank.LOW;		// デフォルトは下級職

		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( AttackWindowPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}

		// 立ち絵描画処理
		var game_area_width = Math.floor(root.getGameAreaWidth() / 2);
		var idx = ContentRenderer.calcPercentIndex(this._unit, AttackWindowPicture_PercentTbl);

		if( x < game_area_width ){
			// ウィンドウ座標が画面中央より左にある場合（自軍ユニットが該当）

			if( isOverWriteOtherSide == true && this.isOverWrite(LeftPicture_X, LeftPicture_Y, this._unit, this._Target, AttackWindowPicture_ID[cls_LH][idx]) ) {
				// 立ち絵と重なっていてisOverWriteOtherSideがtrueなら右側に描画

				if( useUpperWindow_Picture == true && this.isWindowYUpper(this._unit, this._Target, this.getWindowHeight()) == true ) {
					// 戦闘結果予測ウィンドウが上に来た場合の立ち絵切り替えが有効な時
					ContentRenderer.drawUnitImage2(RightPicture_X, RightPicture_Y, this._unit, this._Target, 
						AttackWindowPicture_UpperID[cls_LH][idx], false, AttackWindowPictureAlpha, isOverWriteHalf, isOverWriteChar);
				}
				else {
					// 戦闘結果予測ウィンドウが上に来た場合の立ち絵切り替えが有効でない時（ウィンドウが下の場合含む）
					ContentRenderer.drawUnitImage2(RightPicture_X, RightPicture_Y, this._unit, this._Target, 
						AttackWindowPicture_ID[cls_LH][idx], false, AttackWindowPictureAlpha, isOverWriteHalf, isOverWriteChar);
				}
			}
			else {
				// そうでなければ、立ち絵を左側に左右反転して描画

				if( useUpperWindow_Picture == true && this.isWindowYUpper(this._unit, this._Target, this.getWindowHeight()) == true ) {
					// 戦闘結果予測ウィンドウが上に来た場合の立ち絵切り替えが有効な時
					ContentRenderer.drawUnitImage2(LeftPicture_X, LeftPicture_Y, this._unit, this._Target, 
						AttackWindowPicture_UpperID[cls_LH][idx], isLeftSilePictureReverse, AttackWindowPictureAlpha, isOverWriteHalf, isOverWriteChar);
				}
				else {
					// 戦闘結果予測ウィンドウが上に来た場合の立ち絵切り替えが有効でない時（ウィンドウが下の場合含む）
					ContentRenderer.drawUnitImage2(LeftPicture_X, LeftPicture_Y, this._unit, this._Target, 
						AttackWindowPicture_ID[cls_LH][idx], isLeftSilePictureReverse, AttackWindowPictureAlpha, isOverWriteHalf, isOverWriteChar);
				}
			}
		}
		else{
			// ウィンドウ座標が画面中央より右にある場合、立ち絵を右側にそのまま描画
			if( useUpperWindow_Picture == true && this.isWindowYUpper(this._unit, this._Target, this.getWindowHeight()) == true ) {
				// 戦闘結果予測ウィンドウが上に来た場合の立ち絵切り替えが有効な時
				ContentRenderer.drawUnitImage2(RightPicture_X, RightPicture_Y, this._unit, this._Target, 
					AttackWindowPicture_UpperID[cls_LH][idx], false, AttackWindowPictureAlpha, isOverWriteHalf, isOverWriteChar);
			}
			else {
				// 戦闘結果予測ウィンドウが上に来た場合の立ち絵切り替えが有効でない時（ウィンドウが下の場合含む）
				ContentRenderer.drawUnitImage2(RightPicture_X, RightPicture_Y, this._unit, this._Target, 
					AttackWindowPicture_ID[cls_LH][idx], false, AttackWindowPictureAlpha, isOverWriteHalf, isOverWriteChar);
			}
		}

		if (!this._isWindowEnabled) {
			return;
		}

		// ウィンドウの描画
		if (pic !== null) {
			WindowRenderer.drawStretchWindow(x, y, width, height, pic);
		}
		
		this.drawWindowContent(x + this.getWindowXPadding(), y + this.getWindowYPadding());
		
		this.drawWindowTitle(x, y, width, height, pic);
};


// 戦闘結果予測ウィンドウが上に来ているかどうか
PosAttackWindow.isWindowYUpper= function(unit, targetUnit, baseHeight) {
		var i, y, yLine, height, yCeneter;
		var d = LayoutControl.getRelativeY(6) - 40;
		var range = [,,,];
		var space = [,,,];
		
		if (unit === null || targetUnit === null) {
			return 0;
		}
		
		height = baseHeight;
		yCeneter = root.getGameAreaHeight() / 2;
		
		// ウインドウが上に配置されるケース
		range[0] = 0;
		space[0] = d;
		
		for (i = 0; i < 1; i++) {
			y = LayoutControl.getPixelY(unit.getMapY());
			
			// 範囲内にユニットがいる場合は、ウインドウとかぶってしまうため、処理を続行しない
			if (range[i] <= y && range[i] + height + space[i] >= y) {
				continue;
			}
			
			y = LayoutControl.getPixelY(targetUnit.getMapY());
			
			if (range[i] <= y && range[i] + height + space[i] >= y) {
				continue;
			}
			
			break;
		}
		
		// ウインドウが上に配置されるケースならtrueを返す
		if( i == 0 ) {
			return true;
		}

		return false;
}


// ターゲットの座標設定
var alias = PosAttackWindow.setPosTarget;
PosAttackWindow.setPosTarget= function(unit, item, targetUnit, targetItem, isSrc) {
		alias.call( this, unit, item, targetUnit, targetItem, isSrc );

		// ターゲットのユニットも設定するよう変更
		this._Target = targetUnit;
}


PosAttackWindow.isOverWrite= function(x, y, unit, target_unit, id) {
		var image = unit.getCharIllustImage(id);
		var unit_over_write;
		var target_over_write;

		// 立ち絵がなければキャラチップと立ち絵の重なりは発生しないのでfalseを返す
		if (image == null) {
			return false;
		}

		unit_over_write   = ContentRenderer.isOverWrite(x, image.getWidth(), y, image.getHeight(), unit);
		target_over_write = ContentRenderer.isOverWrite(x, image.getWidth(), y, image.getHeight(), target_unit);

		return (unit_over_write|target_over_write);
}


})();