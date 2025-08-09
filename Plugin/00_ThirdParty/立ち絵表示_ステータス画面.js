/*--------------------------------------------------------------------------
  
　ステータス画面で立ち絵を表示するスクリプト

■概要
　ステータス画面で立ち絵が表示できるようになります。

■事前準備
　立ち絵を表示したいユニットは、立ち絵を設定しておく必要があります。
　ユニットの詳細情報→立ち絵画像→表情の編集で使用する立ち絵をセットしてください。
　基本的に使われるのは通常（0番）の画像です。
　（本ファイル内で使う立ち絵のIDを変える事も可能です。その場合はカスタマイズしたいの３．を参照してください）

■使用法
　このファイルと立ち絵表示_基本部分.jsをプラグインフォルダに入れればそのまま使用可能です。
　ただし、ゲーム画面のサイズは幅640高さ480を基準にしていますので、サイズが異なる場合はカスタマイズしたいの２．を確認して座標を弄ってください。


■カスタマイズしたい

　１．立ち絵を一番手前に表示したい
　　　　→本ソースの設定項目にある、立ち絵を一番手前に表示するか（var StatusPictureIsFront = false;）の部分を
　　　　　var StatusPictureIsFront = true;にすると、立ち絵を一番手前に表示します。

　２．画像の表示位置を変えたい
　　　　→本ソースの設定項目にある、立ち絵表示X座標（var StatusPicture_X = 350;）と立ち絵表示Y座標（var StatusPicture_Y = 0;）の
　　　　　数値部分を弄れば、表示位置が変化します。

　３．立ち絵に使う表情IDを変えたい
　　　　→本ソースの設定項目にある、立ち絵をセットした表情のID（var StatusPicture_ID = [0,0,0,0];）の数値部分を弄ってください。
　　　　　現在は通常（0番）になっていますが、1にすれば微笑む、12にすればカスタム1に設定した立ち絵が使用されます。

　４．立ち絵を左右反転したい
　　　　→本ソースの設定項目にある、立ち絵の左右反転（var StatusPictureRev = false;）のfalseをtrueに変えてください。
　　　　　但し、使用する立ち絵全てが左右反転で表示されてしまうので注意して下さい（特定の絵だけ左右反転する事はできません）

　５．立ち絵の透明度を変えたい
　　　　→本ソースの設定項目にある、立ち絵の透明度（var StatusPictureAlpha = 255;）の数値部分を弄ってください。
　　　　　255は不透明。128で半透明。0で透明になります。
　　　　　但し、使用する立ち絵全ての透明度が変化するので注意して下さい（特定の絵だけ透明度を変える事はできません）

　６．残HPに応じて使う表情IDを変えたい
　　　　→本ソースの設定項目にある、立ち絵をセットした表情のIDの数値部分を弄ってください。
　　　　　（var StatusPicture_ID = [
　　　　　　　　　　　　　　　　　　[0,0,0,0],　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　　[0,0,0,0]
　　　　　　　　　　　　　　　　　];）

　　　　　初期だと一番左が残HP0-25%の時のID、2番目が残HP26-50%の時のID、3番目が残HP51-75%の時のID、4番目が残HP76-100%の時のIDになっています。

　７．表情IDを変える残HP量を変えたい
　　　　→本ソースの設定項目にある、立ち絵を切り替えるHPの残り％（var StatusPicture_PercentTbl = [25,50,75,100];）の数値部分を弄ってください。
　　　　　数値がそのまま%を示しています。初期だと一番左が残HP25%、2番目が残HP50%、3番目が残HP75%、4番目が残HP100%となっています。
　　　　　[20,40,60,100]とすれば20%、40%、60%、100%で画像を切り替える事が出来るようになります。

　８．上級職と下級職で立ち絵に使う表情IDを変えたい
　　　　→本ソースの設定項目にある、上級職になると違う立ち絵を表示するか
　　　　　（var StatusPicture_DispUpperClass = false;）のfalseをtrueに書き換えてください。

　　　　　その上で本ソースの設定項目にある、立ち絵をセットした表情のIDの以下の数値部分を弄ってください。
　　　　　（var StatusPicture_ID = [
　　　　　　　　　　　　　　　　　　[0,0,0,0],
　　　　　　　　　　　　　　　　　　[0,0,0,0]　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　];）

　　　　　※この設定を有効にしている場合で、下級職と上級職で同じ立ち絵を使いまわすキャラは以下の例のようにしてください
　　　　　（var StatusPicture_ID = [
　　　　　　　　　　　　　　　　　　[0,1,2,3], 　　　//←この4つと
　　　　　　　　　　　　　　　　　　[0,1,2,3]　　　　//←この4つの数字を上下で同じ値にしてください
　　　　　　　　　　　　　　　　　];）

　９．ウィンドウの表示位置を変えたい
　　　　→本ソースの設定項目にある、ユニットメニューウィンドウの表示X座標補正値（var UnitMenuWindow_Hosei_X = 0;）と
　　　　　ユニットメニューウィンドウの表示Y座標補正値（var UnitMenuWindow_Hosei_Y = 0;）の
　　　　　数値部分を弄れば、表示位置が変化します。

　　　　　例）　UnitMenuWindow_Hosei_X = -100;とすれば、ウィンドウが中央から左へ100ドットずれた位置に表示されます。
　　　　　　　　UnitMenuWindow_Hosei_X = 100;とすれば、ウィンドウが中央から右へ100ドットずれた位置に表示されます。

　　　　　　　　UnitMenuWindow_Hosei_Y = -100;とすれば、ウィンドウが中央から上へ100ドットずれた位置に表示されます。
　　　　　　　　UnitMenuWindow_Hosei_Y = 100;とすれば、ウィンドウが中央から下へ100ドットずれた位置に表示されます。

　10．最上部の『ユニットメニュー』の表示位置を変えたい
　　　　→本ソースの設定項目にある、最上部の『ユニットメニュー』の表示X座標補正値（var UnitMenuTopText_Hosei_X = 0;）の
　　　　　数値部分を弄れば、表示位置が変化します。

　　　　　例）　UnitMenuTopText_Hosei_X = -100;とすれば、『ユニットメニュー』が中央から左へ100ドットずれた位置に表示されます。
　　　　　　　　UnitMenuTopText_Hosei_X = 100;とすれば、『ユニットメニュー』が中央から右へ100ドットずれた位置に表示されます。

　11．下部のヘルプの表示位置を変えたい
　　　　→本ソースの設定項目にある、下部のヘルプ表示X座標補正値（var UnitMenuBottomText_Hosei_X = 0;）の
　　　　　数値部分を弄れば、表示位置が変化します。

　　　　　例）　UnitMenuBottomText_Hosei_X = -100;とすれば、下部のヘルプが中央から左へ100ドットずれた位置に表示されます。
　　　　　　　　UnitMenuBottomText_Hosei_X = 100;とすれば、下部のヘルプが中央から右へ100ドットずれた位置に表示されます。

　　　　　また、本ソースの設定項目にある、下部のヘルプ内のテキストの表示位置
　　　　　（var UnitMenuBottomText_Position = TextFormat.CENTER;）のCENTERをLEFTもしくはRIGHTに書き換えると
　　　　　テキストの表示位置を中央ではなく左寄せ、右寄せにすることができます

　12．ユニット出撃画面で立ち絵を表示したい
　　　　→本ソースの設定項目にある、「var UnitSortiePictureDisplay = false;」のfalseをtrueにしてください。
　　　　　（立ち絵を一番手前に表示するかどうかは１．の設定が反映されます）

　13．ユニット出撃画面で表示した立ち絵の表示位置やウィンドウの位置を変えたい
　　　　　「var UnitSortiePicture_X = StatusPicture_X;」と
　　　　　「var UnitSortiePicture_X = StatusPicture_Y;）の
　　　　　StatusPicture_XとStatusPicture_Yを数値に変えれば、表示位置が変化します。

　　　　　「var UnitSortieWindow_Hosei_X = UnitMenuWindow_Hosei_X;」と
　　　　　「var UnitSortieWindow_Hosei_Y = UnitMenuWindow_Hosei_Y;」の
　　　　　UnitMenuWindow_Hosei_XとUnitMenuWindow_Hosei_Yを数値に変えれば、ウィンドウの表示位置が変化します。

　　　　　「var UnitSortieStart_Hosei_X = 0;」と「var UnitSortieStart_Hosei_Y = 0;」の数値を変えれば、
　　　　　Press Startの表示位置が変化します。


■注意点
　ステータス画面の描画は、以下の順で行われているようです。
　(1)画面一番上の『ユニットメニュー』という表示の部分
　(2)画面下部のヘルプ文字部分
　(3)顔グラフィックのあるウィンドウ
　(4)（環境設定でONにしてあれば）右のウィンドウ
　(5)能力値のウィンドウ

　立ち絵画像の表示位置は、設定に応じて以下のように変化します。

　【『画像を一番手前に表示しない』設定にしている場合】
　　　このスクリプトは(2)を描画する直前に立ち絵を描画します。
　　　立ち絵が画面一番上の『ユニットメニュー』という表示の部分と重なった場合は
　　　『ユニットメニュー』の文字が隠れてしまいます。
　　　『ユニットメニュー』のテキストと立ち絵が重ならないよう注意して下さい。

　【『画像を一番手前に表示する』設定にしている場合】
　　　このスクリプトは(5)の内容を描画した後で立ち絵を描画します。
　　　立ち絵が一番最後に描画されるため、立ち絵と重なる部分は全て隠れてしまいます。
　　　半透明を設定して重なる部分も見えるようにするか、画面サイズを大きくして立ち絵と重なる部分を少なくするようにしてください。


修正内容
15/08/30　新規作成
15/09/02　wikiアップ用に細かく修正
16/03/03　立ち絵を一番手前に表示するオプションを追加
16/ 4/08　HPの残量に応じて立ち絵の参照IDを変える処理を追加
16/ 4/10b キャラが下級職か上級職かで立ち絵に指定するIDを変える処理を追加
16/ 4/22　ユニットメニューウィンドウの位置を補正出来る処理を追加
16/ 4/22b 上部の『ユニットメニュー』表示とヘルプウィンドウの位置を補正出来る処理を追加
16/10/16　ヘルプウィンドウ内の文字位置を変える設定を追加
17/ 9/25　ヘルプ文字二段.jsとの併用に対応
17/10/23　1.159対応
17/11/07　立ち絵を一番手前に表示した時、ユニット出撃画面に出る立ち絵の位置を変更出来るようにした
17/11/07b ユニット出撃画面で立ち絵の表示あり／なしを切り替えられるようにし、立ち絵表示位置を手前／奥で変えられるようにした
17/11/18　ユニット出撃画面で立ち絵を奥に表示させた場合、下部のヘルプウィンドウより手前に立ち絵を表示していたのを修正
18/03/17　目視で調整：ステータス画面項目位置.jsとの併用に対応


■対応バージョン
　SRPG Studio Version:1.178


■規約
・利用はSRPG Studioを使ったゲームに限ります。
・商用・非商用問いません。フリーです。
・加工等、問題ありません。どんどん改造してください。
・クレジット明記無し　OK
・再配布、転載　OK
・wiki掲載　OK
・SRPG Studio利用規約は遵守してください。
  
--------------------------------------------------------------------------*/


//--------------------------------------------------------------------------
// 設定項目（通常はこの部分を設定するだけでOKです）
//--------------------------------------------------------------------------

// 立ち絵表示X座標（立ち絵を表示するX座標です。X座標を変えたい時は数値を変えてください）
var StatusPicture_X = 350;

// 立ち絵表示Y座標（立ち絵を表示するY座標です。Y座標を変えたい時は数値を変えてください）
var StatusPicture_Y = 0;


// ユニットメニューウィンドウの表示X座標補正値（ウィンドウのX座標を補正できます。X座標を変えたい時は数値を変えてください）
var UnitMenuWindow_Hosei_X = 0;

// ユニットメニューウィンドウの表示Y座標補正値（ウィンドウのY座標を補正できます。Y座標を変えたい時は数値を変えてください）
var UnitMenuWindow_Hosei_Y = 0;


// 最上部の『ユニットメニュー』の表示X座標補正値（最上部の『ユニットメニュー』のX座標を補正できます。X座標を変えたい時は数値を変えてください）
var UnitMenuTopText_Hosei_X = 0;

// 下部のヘルプ表示X座標補正値（下部のヘルプ表示のX座標を補正できます。X座標を変えたい時は数値を変えてください）
var UnitMenuBottomText_Hosei_X = 0;

// 下部のヘルプ内のテキストの表示位置
var UnitMenuBottomText_Position = TextFormat.CENTER;	// 表示位置：中央
//var UnitMenuBottomText_Position = TextFormat.LEFT;	// 表示位置：左
//var UnitMenuBottomText_Position = TextFormat.RIGHT;	// 表示位置：右


// 立ち絵を切り替えるHPの残り％（初期だと0-25％、26-50％、51-75％、76-100％の4通り）
var StatusPicture_PercentTbl = [25,50,75,100];

// 立ち絵をセットした表情のID（通常なら0、カスタム1なら12という風になります。詳細情報→立ち絵画像の中を参照ください)
var StatusPicture_ID = [			// （初期だと0-25％、26-50％、51-75％、76-100％の4通りのIDを入れられます）
						[0,0,0,0],	// 下級職orデフォルト時につかう表情ID
						[0,0,0,0]	// 上級職で画像を変える時につかう表情ID（StatusPicture_DispUpperClassがtrueの場合、初期上級キャラはこちらにIDを入れます）
					   ];

// 立ち絵の左右反転（立ち絵を左右反転するかどうかのフラグです。左右反転させたい時はfalseをtrueに変えてください）
var StatusPictureRev = false;

// 立ち絵の透明度（立ち絵の透明度です。255は不透明。128で半透明。0で透明になります。透明度を変えたい時に数字を変えてください）
var StatusPictureAlpha = 255;

// 立ち絵を一番手前に表示するか（true:一番手前に表示。false:ウィンドウの後ろに表示）
var StatusPictureIsFront = false;

// 上級職になると違う立ち絵を表示するか（true:違う立ち絵を表示。false:下級職と同じ立ち絵）
var StatusPicture_DispUpperClass = false;


// ユニット出撃ウィンドウにおける設定（立ち絵を一番手前に表示する場合に表示されます）
// ユニット出撃ウィンドウ立ち絵表示X座標
var UnitSortiePicture_X = StatusPicture_X;				// 通常はStatusPicture_Xと同じ
// ユニット出撃ウィンドウ立ち絵表示Y座標
var UnitSortiePicture_Y = StatusPicture_Y;				// 通常はStatusPicture_Yと同じ
// ユニット出撃ウィンドウの表示X座標補正値
var UnitSortieWindow_Hosei_X = UnitMenuWindow_Hosei_X;	// 通常はUnitMenuWindow_Hosei_Xと同じ
// ユニット出撃ウィンドウの表示Y座標補正値
var UnitSortieWindow_Hosei_Y = UnitMenuWindow_Hosei_Y;	// 通常はUnitMenuWindow_Hosei_Yと同じ
// ユニット出撃ウィンドウ Press Startの表示X座標補正値
var UnitSortieStart_Hosei_X = 0;
// ユニット出撃ウィンドウ Press Startの表示Y座標補正値
var UnitSortieStart_Hosei_Y = 0;
// ユニット出撃ウィンドウに立ち絵を表示するか（true:表示する false:表示しない）
var UnitSortiePictureDisplay = false;




(function() {


//---------------------------------------------------------------------
// 処理部分（細かくカスタマイズしたい場合、以下を触ってください）
//---------------------------------------------------------------------


//------------------------------------
// UnitMenuScreenクラス
//------------------------------------
UnitMenuScreen.drawScreenCycle= function() {
		var x, y;
		var index = this._activePageIndex;
		var width = this._topWindow.getWindowWidth();
		var topHeight = this._topWindow.getWindowHeight();
		var bottomHeight = this._bottomWindowArray[index].getWindowHeight();
		var interval = DefineControl.getWindowInterval();
		
		if (this._isUnitSentenceVisible()) {
			x = LayoutControl.getCenterX(-1, width + this._unitSentenceWindow.getWindowWidth());
		}
		else {
			x = LayoutControl.getCenterX(-1, width);
		}
		y = LayoutControl.getCenterY(-1, topHeight + bottomHeight + interval);
		
		// ユニットメニューウィンドウの表示X座標補正値分、ウィンドウのX座標をずらす
		x += UnitMenuWindow_Hosei_X;
		
		// ユニットメニューウィンドウの表示Y座標補正値分、ウィンドウのY座標をずらす
		y += UnitMenuWindow_Hosei_Y;
		
		this._topWindow.drawWindow(x, y);
		if (this._isUnitSentenceVisible()) {
			this._unitSentenceWindow.drawWindow(x + width, y);
		}
		this._bottomWindowArray[index].drawWindow(x, y + topHeight + interval);
		
		// drawWindowの後のthis._pageChanger.drawPageは、
		// スクロールカーソルがアイテムウインドウの上に表示されてしまう。
		// 予めsetDrawingMethodを呼び出すことで、drawWindowContentの前にカーソルが描画されるようにする。
}


// 立ち絵の描画（画面下部のヘルプ文字の描画より前に立ち絵画像を書くようにしています）
var alias1 = UnitMenuScreen.drawScreenBottomText
UnitMenuScreen.drawScreenBottomText= function(textui) {
		var cls_LH = ClassRank.LOW;		// デフォルトは下級職

		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( StatusPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}

		// 立ち絵の描画処理
		if( StatusPictureIsFront == false ) {
			var idx = ContentRenderer.calcPercentIndex(this._unit, StatusPicture_PercentTbl);

			ContentRenderer.drawUnitImage(StatusPicture_X, StatusPicture_Y, this._unit, StatusPicture_ID[cls_LH][idx], StatusPictureRev, StatusPictureAlpha);
		}
		
		// 以下、大部分は元の処理
		var text;
		var index = this._activePageIndex;
		
		if (this._topWindow.isTracingHelp()) {
			text = this._topWindow.getHelpText();
		}
		else if (this._bottomWindowArray[index].isHelpMode() || this._bottomWindowArray[index].isTracingHelp()) { // isInteraction
			text = this._bottomWindowArray[index].getHelpText();
		}
		else {
			text = this._unit.getDescription();
		}
		
		// 下部のヘルプ描画。ここだけ呼び出し形式を変更
		TextRenderer.drawScreenBottomText(text, textui, UnitMenuBottomText_Hosei_X, UnitMenuBottomText_Position);
};


// 画面上部の『ユニットメニュー』の表示処理
UnitMenuScreen.drawScreenTopText= function(textui) {
		if (textui === null) {
			return;
		}
		
		// 描画用関数の呼び出し形式を変更
		TextRenderer.drawScreenTopText(this.getScreenTitleName(), textui, UnitMenuTopText_Hosei_X);
}




//------------------------------------
// UnitMenuBottomWindowクラス
//------------------------------------
var alias2 = UnitMenuBottomWindow.drawWindowContent
UnitMenuBottomWindow.drawWindowContent= function(x, y) {
		alias2.call(this, x, y);

		var cls_LH = ClassRank.LOW;		// デフォルトは下級職

		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( StatusPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}

		// 立ち絵の描画処理
		if( StatusPictureIsFront == true ) {
			var idx = ContentRenderer.calcPercentIndex(this._unit, StatusPicture_PercentTbl);

			ContentRenderer.drawUnitImage(StatusPicture_X, StatusPicture_Y, this._unit, StatusPicture_ID[cls_LH][idx], StatusPictureRev, StatusPictureAlpha);
		}
};




//------------------------------------
// TextRendererクラス
//------------------------------------
var alias3 = TextRenderer.drawScreenTopText;
TextRenderer.drawScreenTopText= function(text, textui, hosei_x) {

		// 疑似オーバーロード処理
		// （javascriptは引数の数が違う同一名関数をオーバーロード出来ないので、引数の数をチェックして疑似的に処理した）

		// 引数2個のケース(今までどおりの動作)
		if (arguments.length == 2) {
			alias3.call(this, text, textui);
			return
		}

		// それ以外の場合（引数3個のケース）はこちらを通る(追加処理)
		var range;
		var x = LayoutControl.getCenterX(-1, UIFormat.SCREENFRAME_WIDTH);
		var y = 0;
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		
		// 表示X座標を補正
		x += hosei_x;
		
		if (pic !== null) {	
			pic.draw(x, y);
			
			range = createRangeObject(x + 105, y, UIFormat.SCREENFRAME_WIDTH, 45);
			TextRenderer.drawRangeText(range, TextFormat.LEFT, text, -1, color, font);
		}
	}


var alias4 = TextRenderer.drawScreenBottomText;
TextRenderer.drawScreenBottomText= function(text, textui, hosei_x, text_position) {
		// 疑似オーバーロード処理
		// （javascriptは引数の数が違う同一名関数をオーバーロード出来ないので、引数の数をチェックして疑似的に処理した）

		// 引数2個のケース(今までどおりの動作)
		if (arguments.length == 2) {
			alias4.call(this, text, textui);
			return
		}

		// それ以外の場合（引数3個のケース）はこちらを通る(追加処理)
		var range;
		var x = LayoutControl.getCenterX(-1, UIFormat.SCREENFRAME_WIDTH);
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		
		if( typeof TextRenderer.drawScreenBottomText2LineEx != 'function' ) {
			// 表示X座標を補正
			x += hosei_x;
			
			if (pic !== null) {
				pic.draw(x, root.getGameAreaHeight() - UIFormat.SCREENFRAME_HEIGHT);
				
				range = createRangeObject(x + 65, root.getGameAreaHeight() - 58, UIFormat.SCREENFRAME_WIDTH - (65 * 2), 40);
				TextRenderer.drawRangeText(range, text_position, text, -1, color, font);
			}
		}
		else {
			TextRenderer.drawScreenBottomText2LineEx(text, textui, hosei_x, text_position);
		}
}




//------------------------------------
// UnitMenuBottomWindowForUnitSortieクラス（追加）
//------------------------------------
var UnitMenuBottomWindowForUnitSortie = defineObject(UnitMenuBottomWindow,
{
	drawWindowContent: function(x, y) {
		alias2.call(this, x, y);	// UnitMenuBottomWindow.drawWindowContent(立ち絵表示対応前のもの)を呼び出し
		
		var cls_LH = ClassRank.LOW;		// デフォルトは下級職
		
		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( StatusPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}
		
		// 立ち絵の描画処理
		if( UnitSortiePictureDisplay == true && StatusPictureIsFront == true ) {
			var idx = ContentRenderer.calcPercentIndex(this._unit, StatusPicture_PercentTbl);
			ContentRenderer.drawUnitImage(UnitSortiePicture_X, UnitSortiePicture_Y, this._unit, StatusPicture_ID[cls_LH][idx], StatusPictureRev, StatusPictureAlpha);
		}
	}
}
);




//------------------------------------
// UnitMenuBottomWindowForSortieクラス
//------------------------------------
// 目視で調整：ステータス画面項目位置.jsと併用していた場合、UnitMenuBottomWindowForSortieクラスに立ち絵描画処理を追加する
if( typeof UnitMenuBottomWindowForSortie !== 'undefined' ) {
	UnitMenuBottomWindowForSortie.drawWindowContent= function(x, y) {
		alias2.call(this, x, y);	// UnitMenuBottomWindow.drawWindowContent(立ち絵表示対応前のもの)を呼び出し
		
		var cls_LH = ClassRank.LOW;		// デフォルトは下級職
		
		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( StatusPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}
		
		// 立ち絵の描画処理
		if( UnitSortiePictureDisplay == true && StatusPictureIsFront == true ) {
			var idx = ContentRenderer.calcPercentIndex(this._unit, StatusPicture_PercentTbl);
			ContentRenderer.drawUnitImage(UnitSortiePicture_X, UnitSortiePicture_Y, this._unit, StatusPicture_ID[cls_LH][idx], StatusPictureRev, StatusPictureAlpha);
		}
	}
}




//------------------------------------
// UnitSortieScreenクラス
//------------------------------------
UnitSortieScreen.drawScreenCycle= function() {
		var width = this._leftWindow.getWindowWidth() + this._unitMenuTopWindow.getWindowWidth();
		var height = this._leftWindow.getWindowHeight();
		var x = LayoutControl.getCenterX(-1, width);
		var y = LayoutControl.getCenterY(-1, height);
		
		// 以下は従来表示するものの処理
		width = this._leftWindow.getWindowWidth();
		height = this._unitMenuTopWindow.getWindowHeight();
		
		// ユニットメニューウィンドウの表示X座標補正値分、ウィンドウのX座標をずらす
		x += UnitSortieWindow_Hosei_X;
		
		// ユニットメニューウィンドウの表示Y座標補正値分、ウィンドウのY座標をずらす
		y += UnitSortieWindow_Hosei_Y;
		
		this._leftWindow.drawWindow(x, y);
		this._unitMenuTopWindow.drawWindow(x + width, y);
		this._unitMenuBottomWindow.drawWindow(x + width, y + height);
		
		// Press Startの表示位置を補正
		this._drawStartTitle(x + UnitSortieStart_Hosei_X, y + UnitSortieStart_Hosei_Y);
}


var alias10 = UnitSortieScreen.drawScreenBottomText;
UnitSortieScreen.drawScreenBottomText= function(textui) {
		var cls_LH = ClassRank.LOW;		// デフォルトは下級職
		
		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( StatusPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}
		
		// 立ち絵の描画処理（下側の場合）
		if( UnitSortiePictureDisplay == true && StatusPictureIsFront == false ) {
			var idx = ContentRenderer.calcPercentIndex(this._unit, StatusPicture_PercentTbl);
			ContentRenderer.drawUnitImage(UnitSortiePicture_X, UnitSortiePicture_Y, this._unit, StatusPicture_ID[cls_LH][idx], StatusPictureRev, StatusPictureAlpha);
		}
		
		// 以下、元の処理
		alias10.call(this, textui);
	}


var alias11 = UnitSortieScreen._prepareScreenMemberData;
UnitSortieScreen._prepareScreenMemberData= function(screenParam) {
		alias11.call(this, screenParam);
		// ユニット出撃時の下部表示ウィンドウを差し替え
		this._unitMenuBottomWindow = createWindowObject(UnitMenuBottomWindowForUnitSortie, this);

		// 目視で調整：ステータス画面項目位置.jsと併用していた場合はそれを使用
		if( typeof UnitMenuBottomWindowForSortie !== 'undefined' ) {
			this._unitMenuBottomWindow = createWindowObject(UnitMenuBottomWindowForSortie, this);
		}
}


var alias12 = UnitSortieScreen._setMenuUnit;
UnitSortieScreen._setMenuUnit= function(index) {
		alias12.call(this, index);
		
		// 現在のユニットを保持しておく（立ち絵の描画処理で使用する場合がある）
		var unit = this._unitList.getData(index);
		this._unit = unit;
}


})();