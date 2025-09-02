
// *****************************************************************************************************************************
// カスタムアイテム
// -----------------------------------------------------------------------------------------------------------------------------

var tona_CustomItemControl = { __dummy: null

    , customItem: null

    , initialize: function() {

        this.customItem = { __dummy: null

            , 'tona_アイテム：シェイプコピー': [
                tona_ShapeCopyItemSelection,
                tona_ShapeCopyItemUse,
                tona_ShapeCopyItemInfo,
                tona_ShapeCopyItemPotency,
                tona_ShapeCopyItemAvailability,
                tona_ShapeCopyItemAI
            ]
            , 'tona_アイテム：サモン': [
                tona_SummonItemSelection,
                tona_SummonItemUse,
                tona_SummonItemInfo,
                tona_SummonItemPotency,
                tona_SummonItemAvailability,
                tona_SummonItemAI
            ]
        };
    }
};

// *****************************************************************************************************************************
// アイテムパッケージ：カスタムアイテム
// -----------------------------------------------------------------------------------------------------------------------------

ItemPackageControl.getCustomItemSelectionObject = function(item, keyword) {
	return tona_CustomItemControl.customItem[keyword][0];
}

ItemPackageControl.getCustomItemUseObject = function(item, keyword) {
	return tona_CustomItemControl.customItem[keyword][1];
}

ItemPackageControl.getCustomItemInfoObject = function(item, keyword) {
	return tona_CustomItemControl.customItem[keyword][2];
}

ItemPackageControl.getCustomItemPotencyObject = function(item, keyword) {
	return tona_CustomItemControl.customItem[keyword][3];
}

ItemPackageControl.getCustomItemAvailabilityObject = function(item, keyword) {
	return tona_CustomItemControl.customItem[keyword][4];
}

ItemPackageControl.getCustomItemAIObject = function(item, keyword) {
	return tona_CustomItemControl.customItem[keyword][5];
}
