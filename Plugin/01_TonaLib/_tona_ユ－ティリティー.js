
// *****************************************************************************************************************************
// ユーティリティー
// -----------------------------------------------------------------------------------------------------------------------------

var tona_Utility = { __dummy: null

	// **************************************************************************************************************************
	// キャライラストのイメージを取得する
	// --------------------------------------------------------------------------------------------------------------------------
	, getImage: function(isRuntime, imageId) {

		var imageList = root.getBaseData().getGraphicsResourceList(GraphicsType.CHARILLUST, isRuntime);
		var image = imageList.getDataFromId(imageId);
		if (image != null) {
			return image;
		}

		return null;
	}

	// **************************************************************************************************************************
	// キャライラストのイメージハンドルを取得する
	// --------------------------------------------------------------------------------------------------------------------------
	, getImageHandle: function(isRuntime, imageId) {

		return root.createResourceHandle(isRuntime, imageId, 0, 0, 0);
	}

	// **************************************************************************************************************************
	// 顔グラのイメージハンドルを取得する
	// --------------------------------------------------------------------------------------------------------------------------
	, getFaceImageHandle: function(isRuntime, imageId) {

		var imageList = root.getBaseData().getGraphicsResourceList(GraphicsType.FACE, isRuntime);
		var image = imageList.getCollectionDataFromId(imageId, 0);
		if (image != null) {
			return root.createResourceHandle(isRuntime, image.getId(), 0, 0, 0);
		}

		return null;
	}

	// *****************************************************************************************************************************
	// マップチップのハンドルを取得する
	// -----------------------------------------------------------------------------------------------------------------------------
	, getMapChipImageHandle: function(isRuntime, imageId, chipIndex) {

		var imageList = root.getBaseData().getGraphicsResourceList(GraphicsType.MAPCHIP, isRuntime);
		var image = imageList.getCollectionDataFromId(imageId, 0);
		if (image != null) {
			var x = chipIndex % 10;
			var y = Math.floor(chipIndex / 10);
			return root.createResourceHandle(isRuntime, image.getId(), 0, x, y);
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

