
var tona_MediaControl = { __dummy: null

	// **************************************************************************************************************************
	// 声を再生する
	// --------------------------------------------------------------------------------------------------------------------------

	, playVoice: function(resId) {

		this.stopVoice();

		root.getMediaManager().soundStop(tona_Setting.voiceSoundId, false);
		var mediaList = root.getBaseData().getMediaResourceList(MediaType.SE, false);
		var mediaData = mediaList.getDataFromId(resId);
		var mediaHandle = root.createResourceHandle(false, mediaData.getId(), 0, 0, 0);
		root.getMediaManager().soundPlay(mediaHandle, 1);
	}

	// **************************************************************************************************************************
	// 声を停止する
	// --------------------------------------------------------------------------------------------------------------------------

	, stopVoice: function() {

		root.getMediaManager().soundStop(tona_Setting.voiceSoundId, false);
	}
};

