
// *****************************************************************************************************************************
// ユーティリティー
// -----------------------------------------------------------------------------------------------------------------------------

var tona_Utility = { __dummy: null

	// *****************************************************************************************************************************
	// マップチップのハンドルを取得する
	// -----------------------------------------------------------------------------------------------------------------------------
	, getMapChipImageHandle: function(isRuntime, imageId, chipIndex) {

		var imageList = root.getBaseData().getGraphicsResourceList(GraphicsType.MAPCHIP, isRuntime);
		var imageData = imageList.getCollectionDataFromId(imageId, 0);
		if (imageData != null) {
			var x = chipIndex % 10;
			var y = Math.floor(chipIndex / 10);
			return root.createResourceHandle(isRuntime, imageData.getId(), 0, x, y);
		}

		return null;
	}

	// *****************************************************************************************************************************
	// 効果音のハンドルを取得する
	// -----------------------------------------------------------------------------------------------------------------------------

	, getSoundHandle: function(isRuntime, soundId) {

		return root.createResourceHandle(isRuntime, soundId, 0, 0, 0);
	}
};

