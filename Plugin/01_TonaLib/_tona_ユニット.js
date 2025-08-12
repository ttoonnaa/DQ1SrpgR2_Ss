
// *****************************************************************************************************************************
// ユニット
// -----------------------------------------------------------------------------------------------------------------------------

var tona_UnitControl = { __dummy: null

	// *****************************************************************************************************************************
	// プレイヤーIDを取得する
	// -----------------------------------------------------------------------------------------------------------------------------

	, getPlayerId: function(unit) {

		// プレイヤーだと分かっているユニットからプレイヤーIDを取得する
		// プレイヤーをエネミーや同盟軍として登場させた場合、getImportSrcId() が必要

		// 正しくプレイヤーの場合
		if (unit.getId() < 65536) {
			return unit.getId();
		}
		// プレイヤーをインポートした場合
		else if (unit.getImportSrcId() >= 0) {
			return unit.getImportSrcId();
		}

		return -1;
	}

	// *****************************************************************************************************************************
	// 参照プレイヤーIDを取得する
	// -----------------------------------------------------------------------------------------------------------------------------

	, getRefPlayerId: function(unit) {

		// プレイヤーを参照している場合はそのID
		if (unit.custom.tona_refType > 0) {
			return unit.custom.tona_refId;
		}
		// そうでない場合は自身のプレイヤーIDを返す
		else {
			return this.getPlayerId(unit);
		}
	}

	// *****************************************************************************************************************************
	// 内部レベルを取得する
	// -----------------------------------------------------------------------------------------------------------------------------

	, getInnerLevel: function(unit) {

		return unit.getLv();
	}

	// *****************************************************************************************************************************
	// 立ち絵を取得する
	//		0:  標準
	//		1:  バトル
	// -----------------------------------------------------------------------------------------------------------------------------
	, getImage: function(unit, faceIndex) {

		// 参照しているプレイヤーのIDを取得する
		var refPlayerId = this.getRefPlayerId(unit);

		// プレイヤーを参照している場合の立ち絵
		if (refPlayerId >= 0) {

			// 参照タイプによってインデックスを変更
			if (unit.custom.tona_refType == tona_RefType.Modoki) {
				faceIndex = 0;
			}
			else if (unit.custom.tona_refType == tona_RefType.Slime) {
				faceIndex = 4;
			}
			else if (unit.custom.tona_refType == tona_RefType.Shadow) {
				faceIndex = 5;
			}

			var masterPlayer = Master.playerById[refPlayerId];
			var imageId = masterPlayer.images[faceIndex];
			var image = tona_Utility.getImage(false, imageId);
			if (image != null) {
				return image;
			}
		}
		else {

			var image = unit.getCharIllustImage(faceIndex);
			if (image != null) {
				return image;
			}

			// 見つからなければ 0 番を使う
			image = unit.getCharIllustImage(0);
			if (image != null) {
				return image;
			}
		}

		return null;
	}
};











