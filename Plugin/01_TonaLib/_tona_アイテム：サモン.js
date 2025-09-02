
// *****************************************************************************************************************************
// サモン
// -----------------------------------------------------------------------------------------------------------------------------

var tona_SummonItemSelection = defineObject(BaseItemSelection, {
});

var tona_SummonItemUse = defineObject(BaseItemUse, {

    enterMainUseCycle: function(itemUseParent) {
        root.log('サモン');

        var itemTargetInfo = itemUseParent.getItemTargetInfo();
        var unit = itemTargetInfo.unit;
        var targetUnit = itemTargetInfo.targetUnit;
		var targetPos = PosChecker.getNearbyPos(unit, targetUnit);

        // 実際にサモンする
        tona_SummonItemControl.invoke(unit.custom.tona_summonId, targetPos);

        // 演出を作成
        var dynamicEvent = createObject(DynamicEvent);
        var generator = dynamicEvent.acquireEventGenerator();
        var anime = root.queryAnime('classchange');
        var x = LayoutControl.getPixelX(unit.getMapX());
        var y = LayoutControl.getPixelY(unit.getMapY());
        var pos = LayoutControl.getMapAnimationPos(x, y, anime);
        generator.animationPlay(anime, pos.x, pos.y, false, AnimePlayType.SYNC, 0);
        dynamicEvent.executeDynamicEvent();

		return EnterResult.NOTENTER;
    }
});

var tona_SummonItemInfo = defineObject(BaseItemInfo, {

    drawItemInfoCycle: function(x, y) {
        ItemInfoRenderer.drawKeyword(x, y, 'サモン');
    }

    , getInfoPartsCount: function() {
        return 1;
    }
});

var tona_SummonItemPotency = defineObject(BaseItemPotency, {});

var tona_SummonItemAvailability = defineObject(BaseItemAvailability, {

    isItemAllowed: function(unit, targetUnit, item) {
        return true;
    }
});

var tona_SummonItemAI = defineObject(BaseItemAI, {

    getItemScore: function(unit, combination) {

        return tona_ActionControl.getMaxScore();
    }
});

// *****************************************************************************************************************************
// サモン：実際にサモンする
// -----------------------------------------------------------------------------------------------------------------------------

var tona_SummonItemControl = { __dummy: null

	, invoke: function(summonId, targetPos) {

		// ブックマークユニットを使ってユニットを作成
		var bookmarkUnitId = summonId;
		var bookmarkUnitList = root.getBaseData().getBookmarkUnitList();
		var bookmarkUnit = bookmarkUnitList.getData(bookmarkUnitId);
		var unit = root.getObjectGenerator().generateUnitFromBookmarkUnit(bookmarkUnit, UnitGroup.ENEMY);
		unit.setMapX(targetPos.x);
		unit.setMapY(targetPos.y);

		// セッションからマップ情報を取得
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		var map = Master.mapById[mapInfo.getId()];

		// エネミー情報を取得
		var masterEnemy = Master.enemy;
		var level = map.level;

		// クラス情報を取得
		var klassId = unit.getClass().getId();
		var masterKlass = Master.klassById[klassId];

		// レベルを設定
		unit.setLv(level);

	    // パラメーターを設定
	    for (var pi = 0; pi <= 10; pi++) {
			var value = masterEnemy.params[pi];
			value += (masterEnemy.growths[pi] + masterKlass.growths[pi]) * (level - 1) / 100;
			unit.setParamValue(pi, Math.floor(value + 0.5));
		}

		// アイテム（デフォルトでアイテムが設定されている場合は何もしない）
		if (unit.getItem(0) == null) {
			var itemIndex = 0;
			for (var i = 0; i < masterKlass.weapons.length; i++) {
				var weaponId = masterKlass.weapons[i];
				var weapon = root.getBaseData().getWeaponList().getDataFromId(weaponId);
				unit.setItem(itemIndex++, root.duplicateItem(weapon));
			}
			for (var i = 0; i < masterKlass.items.length; i++) {
				var itemId = masterKlass.items[i];
				var item = root.getBaseData().getItemList().getDataFromId(itemId);
				unit.setItem(itemIndex++, root.duplicateItem(item));
			}
		}

	    // HP
		unit.setHp(ParamBonus.getMhp(unit));

		// セットアップ済みにする
		unit.custom.tona_isSetupDone = 1;
	}
};




