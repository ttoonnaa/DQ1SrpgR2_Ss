/*--------------------------------------------------------------------------
  
　LVUP画面で立ち絵を表示するスクリプト

■概要
　LVUP画面で立ち絵が表示できるようになります。

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
　　　　→本ソースの設定項目にある、立ち絵を一番手前に表示するか（var ExpPictureIsFront = false;）の部分を
　　　　　var ExpPictureIsFront = true;にすると、立ち絵を一番手前に表示します。

　２．画像の表示位置を変えたい
　　　　→本ソースの設定項目にある、立ち絵表示X座標（var ExpPicture_X = 350;）と立ち絵表示Y座標（var ExpPicture_Y = 0;）の
　　　　　数値部分を弄れば、表示位置が変化します。

　　　　　なお、立ち絵をステータス画面と同じ位置に表示する場合は、
　　　　　設定の部分を↓のように書き換えてください
　　　　　//var ExpPicture_X = 350;
　　　　　var ExpPicture_X = StatusPicture_X;	// 立ち絵をステータス画面と同じ位置に表示したい時はこちらを有効にしてください

　　　　　//var ExpPicture_Y = 0;
　　　　　var ExpPicture_Y = StatusPicture_Y;	// 立ち絵をステータス画面と同じ位置に表示したい時はこちらを有効にしてください

　３．立ち絵に使う表情IDを変えたい
　　　　→本ソースの設定項目にある、立ち絵をセットした表情のID（var ExpPicture_ID = [0,0,0,0];）の数値部分を弄ってください。
　　　　　現在は通常（0番）になっていますが、1にすれば微笑む、12にすればカスタム1に設定した立ち絵が使用されます。

　４．立ち絵を左右反転したい
　　　　→本ソースの設定項目にある、立ち絵の左右反転（var ExpPictureRev = false;）のfalseをtrueに変えてください。
　　　　　但し、使用する立ち絵全てが左右反転で表示されてしまうので注意して下さい（特定の絵だけ左右反転する事はできません）

　５．立ち絵の透明度を変えたい
　　　　→本ソースの設定項目にある、立ち絵の透明度（var ExpPictureAlpha = 255;）の数値部分を弄ってください。
　　　　　255は不透明。128で半透明。0で透明になります。
　　　　　但し、使用する立ち絵全ての透明度が変化するので注意して下さい（特定の絵だけ透明度を変える事はできません）

　６．残HPに応じて使う表情IDを変えたい
　　　　→本ソースの設定項目にある、立ち絵をセットした表情のIDの数値部分を弄ってください。
　　　　　（var ExpPicture_ID = [
　　　　　　　　　　　　　　　　　　[0,0,0,0],　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　　[0,0,0,0]
　　　　　　　　　　　　　　　　　];）

　　　　　初期だと一番左が残HP0-25%の時のID、2番目が残HP26-50%の時のID、3番目が残HP51-75%の時のID、4番目が残HP76-100%の時のIDになっています。

　７．表情IDを変える残HP量を変えたい
　　　　→本ソースの設定項目にある、立ち絵を切り替えるHPの残り％（var ExpPicture_PercentTbl = [25,50,75,100];）の数値部分を弄ってください。
　　　　　数値がそのまま%を示しています。初期だと一番左が残HP25%、2番目が残HP50%、3番目が残HP75%、4番目が残HP100%となっています。
　　　　　[20,40,60,100]とすれば20%、40%、60%、100%で画像を切り替える事が出来るようになります。

　８．表情IDを、残HP量ではなく成長した能力のポイント数で変えたい
　　　　→本ソースの設定項目にある、レベルアップ時の能力上昇数に応じて立ち絵を表示するか
　　　　　（var GrouthUpParameterUse = false;）のfalseをtrueに変えると、レベルアップ時の能力値数に応じた立ち絵を表示します。

　　　　　初期状態だと、成長したポイント数が0-1、2-3、4-5、6-10の4種類が設定可能です。
　　　　　（var GrouthPicture_PercentTbl = [1,3,5,10];の数値を弄る事でポイント数を変える事が可能です）

　　　　　表示する立ち絵については
　　　　　（var ExpPicture_ID = []の配列に設定されたものが適用されます）

　９．上級職と下級職で立ち絵に使う表情IDを変えたい
　　　　→本ソースの設定項目にある、上級職になると違う立ち絵を表示するか
　　　　　（var ExpPicture_DispUpperClass = false;）のfalseをtrueに書き換えてください。

　　　　　その上で本ソースの設定項目にある、立ち絵をセットした表情のIDの以下の数値部分を弄ってください。
　　　　　（var ExpPicture_ID = [
　　　　　　　　　　　　　　　　　　[0,0,0,0],
　　　　　　　　　　　　　　　　　　[0,0,0,0]　　　　//←この4つの数字を弄ってください
　　　　　　　　　　　　　　　　　];）

　　　　　※この設定を有効にしている場合で、下級職と上級職で同じ立ち絵を使いまわすキャラは以下の例のようにしてください
　　　　　（var ExpPicture_ID = [
　　　　　　　　　　　　　　　　　　[0,1,2,3], 　　　//←この4つと
　　　　　　　　　　　　　　　　　　[0,1,2,3]　　　　//←この4つの数字を上下で同じ値にしてください
　　　　　　　　　　　　　　　　　];）

　10．ウィンドウの表示位置を変えたい
　　　　→本ソースの設定項目にある、ユニットメニューウィンドウの表示X座標補正値（var ExpWindow_Hosei_X = 0;）と
　　　　　ユニットメニューウィンドウの表示Y座標補正値（var ExpWindow_Hosei_Y = 0;）の
　　　　　数値部分を弄れば、表示位置が変化します。

　　　　　例）　ExpWindow_Hosei_X = -100;とすれば、ウィンドウが中央から左へ100ドットずれた位置に表示されます。
　　　　　　　　ExpWindow_Hosei_X = 100;とすれば、ウィンドウが中央から右へ100ドットずれた位置に表示されます。

　　　　　　　　ExpWindow_Hosei_Y = -100;とすれば、ウィンドウが中央から上へ100ドットずれた位置に表示されます。
　　　　　　　　ExpWindow_Hosei_Y = 100;とすれば、ウィンドウが中央から下へ100ドットずれた位置に表示されます。


修正内容
16/04/30　新規作成
17/06/28　レベルアップ時、能力成長したポイント数に応じて立ち絵を切り替える設定を追加
17/06/28b レベルアップ時、上限に到達した能力が成長した場合はカウントしないよう修正
17/06/29　Lvup_１つずつ.jsと併用しており、GrouthUpParameterUseがtrueなら能力成長が終了した後で立ち絵を表示するよう修正


■対応バージョン
　SRPG Studio Version:1.073
　SRPG Studio Version:1.135


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

// 立ち絵表示X座標（立ち絵を表示するX座標です。X座標を変えたい時は数値を変えてください）
//var ExpPicture_X = 350;
var ExpPicture_X = StatusPicture_X;	// 立ち絵をステータス画面と同じ位置に表示したい時はこちらを有効にしてください

// 立ち絵表示Y座標（立ち絵を表示するY座標です。Y座標を変えたい時は数値を変えてください）
//var ExpPicture_Y = 0;
var ExpPicture_Y = StatusPicture_Y;	// 立ち絵をステータス画面と同じ位置に表示したい時はこちらを有効にしてください


// LVUPウィンドウの表示X座標補正値（ウィンドウのX座標を補正できます。X座標を変えたい時は数値を変えてください）
var ExpWindow_Hosei_X = -160;//0;

// LVUPウィンドウの表示Y座標補正値（ウィンドウのY座標を補正できます。Y座標を変えたい時は数値を変えてください）
var ExpWindow_Hosei_Y = 0;


// 立ち絵を切り替えるHPの残り％（初期だと0-25％、26-50％、51-75％、76-100％の4通り）
var ExpPicture_PercentTbl = [25,50,75,100];

// 立ち絵をセットした表情のID（通常なら0、カスタム1なら12という風になります。詳細情報→立ち絵画像の中を参照ください)
var ExpPicture_ID = [				// （初期だと0-25％、26-50％、51-75％、76-100％の4通りのIDを入れられます）
						[0,0,0,0],	// 下級職orデフォルト時につかう表情ID
						[0,0,0,0]	// 上級職で画像を変える時につかう表情ID（ExpPicture_DispUpperClassがtrueの場合、初期上級キャラはこちらにIDを入れます）
					   ];


// レベルアップ時の能力上昇数に応じて立ち絵を切り替える場合の、能力値上昇量テーブル
// （初期だと0-1、2-3、4-5、6-10の4通り）※HP+2なら2ポイント上昇したとみなします
// 　※立ち絵はExpPicture_IDに設定されたものを使用します
var GrouthPicture_PercentTbl = [1,3,5,10];

// 立ち絵の左右反転（立ち絵を左右反転するかどうかのフラグです。左右反転させたい時はfalseをtrueに変えてください）
var ExpPictureRev = false;

// 立ち絵の透明度（立ち絵の透明度です。255は不透明。128で半透明。0で透明になります。透明度を変えたい時に数字を変えてください）
var ExpPictureAlpha = 255;

// 立ち絵を一番手前に表示するか（true:一番手前に表示。false:ウィンドウの後ろに表示）
var ExpPictureIsFront = false;

// 上級職になると違う立ち絵を表示するか（true:違う立ち絵を表示。false:下級職と同じ立ち絵）
var ExpPicture_DispUpperClass = false;

// レベルアップ時の能力上昇数に応じて立ち絵を表示するか（true:レベルアップの能力上昇数で立ち絵を表示。false:HPへの負傷%で立ち絵表示）
var GrouthUpParameterUse = false;





//---------------------------------------------------------------------
// 処理部分（細かくカスタマイズしたい場合、以下を触ってください）
//---------------------------------------------------------------------


//------------------------------------
// ExperienceParameterWindowクラス
//------------------------------------
var alias1 = ExperienceParameterWindow.setExperienceParameterData
ExperienceParameterWindow.setExperienceParameterData= function(targetUnit, growthArray) {
		// 従来の描画処理を呼び出す
		alias1.call(this, targetUnit, growthArray);

		this._unit = targetUnit;
		// 成長した能力値の合計ポイント算出
		this._grouthPoint = this._getGrowthParameterCount(this._unit, growthArray);
		// 最後に成長する能力値の位置を取得
		this._endIdx = this._getGrowthEndIdx(this._unit, growthArray);
};


var alias2 = ExperienceParameterWindow.drawWindow
ExperienceParameterWindow.drawWindow= function(x, y) {
		var idx = 0;
		var cls_LH = ClassRank.LOW;		// デフォルトは下級職

		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( ExpPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}

		// 立ち絵の描画処理
		if( ExpPictureIsFront == false ) {
			if( GrouthUpParameterUse == false ) {
				idx = ContentRenderer.calcPercentIndex(this._unit, ExpPicture_PercentTbl);
				ContentRenderer.drawUnitImage(ExpPicture_X, ExpPicture_Y, this._unit, ExpPicture_ID[cls_LH][idx], ExpPictureRev, ExpPictureAlpha);
			}
			else {
				if( this._isGrouthDisplay() == true ) {
					idx = this._calcGrouthIndex(this._grouthPoint, GrouthPicture_PercentTbl);
					ContentRenderer.drawUnitImage(ExpPicture_X, ExpPicture_Y, this._unit, ExpPicture_ID[cls_LH][idx], ExpPictureRev, ExpPictureAlpha);
				}
			}
		}

		// 従来の描画処理を呼び出す
		alias2.call(this, x+ExpWindow_Hosei_X, y+ExpWindow_Hosei_Y);
};


var alias3 = ExperienceParameterWindow.drawWindowContent
ExperienceParameterWindow.drawWindowContent= function(x, y) {
		// 従来の描画処理を呼び出す
		alias3.call(this, x, y);

		var idx = 0;
		var cls_LH = ClassRank.LOW;		// デフォルトは下級職

		// 上級職になると違う立ち絵を表示する設定が有効な場合、現在のクラスが下級か上級かを設定
		if( ExpPicture_DispUpperClass == true ) {
			cls_LH = this._unit.getClass().getClassRank();
		}

		// 立ち絵の描画処理
		if( ExpPictureIsFront == true ) {
			if( GrouthUpParameterUse == false ) {
				idx = ContentRenderer.calcPercentIndex(this._unit, ExpPicture_PercentTbl);
				ContentRenderer.drawUnitImage(ExpPicture_X, ExpPicture_Y, this._unit, ExpPicture_ID[cls_LH][idx], ExpPictureRev, ExpPictureAlpha);
			}
			else {
				if( this._isGrouthDisplay() == true ) {
					idx = this._calcGrouthIndex(this._grouthPoint, GrouthPicture_PercentTbl);
					ContentRenderer.drawUnitImage(ExpPicture_X, ExpPicture_Y, this._unit, ExpPicture_ID[cls_LH][idx], ExpPictureRev, ExpPictureAlpha);
				}
			}
		}
};


// 成長した能力値数の算出
ExperienceParameterWindow._getGrowthParameterCount= function(unit, growthArray) {
		var i, l, m;
		var total = 0;
		var count = growthArray.length;

		// 成長した能力値の合計を算出
		// （能力が下がった場合はマイナスとして集計。一つの能力値が+2以上になった場合は値分成長したとして集計）
		for (i = 0; i < count; i++) {
			l = ParamGroup.getUnitValue(unit, i);
			m = ParamGroup.getValidValue(unit, (l + growthArray[i]), i);
			// 成長結果が上限（下限）を超えていなければカウント
			if( l != m ) {
				total += (m-l);
			}
		}

		return total;
};


// 一番最後に成長する能力値のインデックスを取得
ExperienceParameterWindow._getGrowthEndIdx= function(unit, growthArray) {
		var i, l, m;

		// 成長した能力値の数を算出
		for (i = growthArray.length-1; i >= 0; i--) {
			l = ParamGroup.getUnitValue(unit, i);
			m = ParamGroup.getValidValue(unit, (l + growthArray[i]), i);
			// 成長結果が上限（下限）を超えていなければカウント
			if( l != m ) {
				break;
			}
		}

		return i;
};


// 成長した能力値数とGrouthPicture_PercentTblの定義値を比較し、描画する立ち絵のインデックスを算出する
ExperienceParameterWindow._calcGrouthIndex= function(grouth_point, grouth_tbl) {
		var i;
		var cnt = grouth_tbl.length;

		for (i = 0;i < cnt;i++ ) {
			if( grouth_point <= grouth_tbl[i] ) {
				return i;
			}
		}
		return (cnt-1);
};


// 成長が終了したか（成長終了時に立ち絵を描画する）
ExperienceParameterWindow._isGrouthDisplay= function() {
		var index;

		// Lvup_１つずつ.jsが存在しない場合は無条件に描画
		// （Lvup_１つずつ.jsが存在しない場合、一気に能力値が表示されるので立ち絵もすぐ表示する）
		if( typeof StatusScrollbarLvUp == 'undefined') {
			return true;
		}
		
		// Lvup_１つずつ.jsが存在すれば、最後に成長する能力を描画したら立ち絵を描画開始する
		index = this._scrollbar._lvup_draw_index;
		
		return (index >= this._endIdx);
}


})();