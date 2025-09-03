
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
	// 参照プレイヤーを設定する
	// -----------------------------------------------------------------------------------------------------------------------------

	, setRefPlayerId: function(unit, refType, refId) {

		unit.custom.tona_refType = refType;
		unit.custom.tona_refId = refId;
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
			if (unit.custom.tona_refType == tona_RefType.Enemy) {
				faceIndex = 1;
			}
			else if (unit.custom.tona_refType == tona_RefType.Modoki) {
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

	// *****************************************************************************************************************************
	// 顔グラを更新する
	// -----------------------------------------------------------------------------------------------------------------------------
	, updateFace: function(unit) {

		var faceIndex = 0;		// 通常

		// 参照しているプレイヤーのIDを取得する
		var refPlayerId = this.getRefPlayerId(unit);

		// プレイヤーを参照している場合の顔グラ
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
			var imageHandle = tona_Utility.getFaceImageHandle(false, imageId);
			unit.setFaceResourceHandle(imageHandle);
		}
	}

    // *****************************************************************************************************************************
    // 音声ハンドルを取得する
    // -----------------------------------------------------------------------------------------------------------------------------
	, getVoiceHandle: function(unit, index) {

		// 参照しているプレイヤーのIDを取得する
		var refPlayerId = this.getRefPlayerId(unit);

		// プレイヤーを参照している場合の音声
		if (refPlayerId >= 0) {

	        var masterPlayer = Master.playerById[refPlayerId];
	        if (masterPlayer.voice != null) {
	            var soundId = masterPlayer.voice[index];
	            if (soundId != null) {
					var soundHandle = tona_Utility.getSoundHandle(soundId);
					if (soundHandle != null) {
						return soundHandle;
					}
	            }
	        }
		}

		return null;
	}

    // *****************************************************************************************************************************
    // クリティカルのカットイン画像を入れ替える
    // -----------------------------------------------------------------------------------------------------------------------------
    , changeCriticalCutinImage: function(unit, graphicsType, isRuntime, imageId, colorIndex) {

		// カットイン画像の場合は置き換える
		if (graphicsType == GraphicsType.PICTURE && isRuntime == false && imageId == tona_Setting.criticalCutinDummyImageId) {
           	return this.getImage(unit, 1);
		}

		// そのままのデータを返す
		var imageList = root.getBaseData().getGraphicsResourceList(graphicsType, isRuntime);
		var image = imageList.getCollectionDataFromId(imageId, colorIndex);
		return image;
    }

    // *****************************************************************************************************************************
    // クリティカルのカットイン音声を入れ替える
    // -----------------------------------------------------------------------------------------------------------------------------
    , changeCriticalCutinSound: function(unit, soundHandle) {

		var isRuntime = soundHandle.getHandleType() == ResourceHandleType.RUNTIME;
		var resourceId = soundHandle.getResourceId();

        // カットイン音声の場合は入れ替える
        if (isRuntime == false && resourceId == tona_Setting.criticalCutinDummySoundId) {
			return this.getVoiceHandle(unit, 0);
        }

		// そのままのハンドルを返す
        return soundHandle;
    }
};











