#target photoshop

var doc = app.activeDocument;

mainProc();

alert("全ての処理が完了しました。");

// **************************************************************************************************************************
// メイン処理
// --------------------------------------------------------------------------------------------------------------------------

function mainProc() {

	oneProc("body", "a", 512, 768, "");
	oneProc("body", "b", 512, 768, "");
	oneProc("body", "c", 512, 768, "");
	oneProc("body", "d", 512, 768, "");
	oneProc("body", "e", 512, 768, "");
	oneProc("body", "f", 512, 768, "");

	oneProc("face", "a", 96, 96, "");
	oneProc("face", "b", 96, 96, "");
	oneProc("face", "c", 96, 96, "");
	oneProc("face", "d", 96, 96, "");
	oneProc("face", "e", 96, 96, "");
	oneProc("face", "f", 96, 96, "");
}

// **************************************************************************************************************************
// メイン処理
// --------------------------------------------------------------------------------------------------------------------------

function oneProc(name, prefix, width, height, option) {

	// 現在の履歴ステートを記憶
	var before = doc.activeHistoryState;

	// 差分レイヤーを表示する、無ければ終了する
	if (!showLayer(prefix, true))
		return;

	// 切り取りレイヤーを探してアクティブに
	var result = selectLayer(name);
	if (!result) {
	    alert(name + " レイヤーが見つかりません。");
	    throw new Error(name + "レイヤーが見つかりません。");
	}

	// 非表示に戻す
	app.activeDocument.activeLayer.visible = false;

	// 描画ピクセルを選択
	selectLayerPixels();

	// 選択範囲の境界（bounds）取得
	var bounds = doc.selection.bounds; // [left, top, right, bottom]

	// 矩形で切り抜き
	doc.crop(bounds);

	// サイズ変更
	doc.resizeImage(UnitValue(width, "px"), UnitValue(height, "px"), doc.resolution, ResampleMethod.AUTOMATIC);

	// PNG オプションを定義
	var pngOptions = new PNGSaveOptions();
	pngOptions.compression = 9;
	pngOptions.interlaced = false;

	// 保存パス作成
	var originalPath = doc.fullName.path;
	var originalName = doc.name.replace(/\.[^\.]+$/, ''); // 拡張子なし
	var outputFile = new File(originalPath + "/" + originalName + prefix + "_" + name + ".png");

	// PNG で保存
	doc.saveAs(outputFile, pngOptions, true, Extension.LOWERCASE);

	// 履歴をもとに戻す
	doc.activeHistoryState = before;

	// 差分レイヤーを非表示にする
	showLayer(prefix, false);
}

// **************************************************************************************************************************
// 名前を指定してレイヤーを選択する
// --------------------------------------------------------------------------------------------------------------------------

function selectLayer(name) {

	for (var i = 0; i < doc.layers.length; i++) {
	    if (doc.layers[i].name === name) {
	        doc.activeLayer = doc.layers[i];
	        return true;
	    }
	}

    return false;
}

// **************************************************************************************************************************
// 名前を指定してレイヤーの表示状態を設定する
// --------------------------------------------------------------------------------------------------------------------------

function showLayer(name, visible) {

	for (var i = 0; i < doc.layers.length; i++) {
	    if (doc.layers[i].name === name) {
	        doc.layers[i].visible = visible;
	        return true;
	    }
	}

    return false;
}

// **************************************************************************************************************************
// アクティブドキュメントのアクティブレイヤーの描画ピクセル（不透明部分）を選択する
// --------------------------------------------------------------------------------------------------------------------------

function selectLayerPixels() {

    var idSet = stringIDToTypeID("set");
    var idNull = charIDToTypeID("null");
    var idChnl = charIDToTypeID("Chnl");
    var idFsel = charIDToTypeID("fsel");
    var idT = charIDToTypeID("T   ");
    var idTrsp = charIDToTypeID("Trsp");

    var ref1 = new ActionReference();
    ref1.putProperty(idChnl, idFsel);

    var ref2 = new ActionReference();
    ref2.putEnumerated(idChnl, idChnl, idTrsp);

    var desc1 = new ActionDescriptor();
    desc1.putReference(idNull, ref1);
    desc1.putReference(idT, ref2);
    executeAction(idSet, desc1, DialogModes.NO);
}


