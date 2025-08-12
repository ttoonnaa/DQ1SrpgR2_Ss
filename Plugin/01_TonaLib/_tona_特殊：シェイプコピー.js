
// *****************************************************************************************************************************
// シェイプコピー
// -----------------------------------------------------------------------------------------------------------------------------
//		コピー後に再行動しない
//		行動型のユニットに持たせる
// -----------------------------------------------------------------------------------------------------------------------------

var tona_ShapeCopyItemSelection = defineObject(BaseItemSelection, {
});

var tona_ShapeCopyItemUse = defineObject(BaseItemUse, {

    enterMainUseCycle: function(itemUseParent) {
        root.log('シェイプコピー');

        var itemTargetInfo = itemUseParent.getItemTargetInfo();
        var unit = itemTargetInfo.unit;
        var targetUnit = itemTargetInfo.targetUnit;

        // 実際にコピーする
        tona_ShapeCopyItemControl.invoke(unit, targetUnit);

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

var tona_ShapeCopyItemInfo = defineObject(BaseItemInfo, {

    drawItemInfoCycle: function(x, y) {
        ItemInfoRenderer.drawKeyword(x, y, 'シェイプコピー');
    }

    , getInfoPartsCount: function() {
        return 1;
    }
});

var tona_ShapeCopyItemPotency = defineObject(BaseItemPotency, {});

var tona_ShapeCopyItemAvailability = defineObject(BaseItemAvailability, {

    isItemAllowed: function(unit, targetUnit, item) {
        return true;
    }
});

var tona_ShapeCopyItemAI = defineObject(BaseItemAI, {

    getItemScore: function(unit, combination) {

		// 体を失っているユニットは対象にしない
		if (combination.targetUnit.custom.tona_isLostBody != null) {
			return -1;
		}

		// 武器を持っていないユニットは対象にしない
		if (ItemControl.getEquippedWeapon(combination.targetUnit) == null) {
			return -1;
		}

        return tona_AiControl.getMaxRandomScoreWithLevel(combination.targetUnit);
    }
});

// *****************************************************************************************************************************
// シェイプコピー：実際にシェイプコピーする
// -----------------------------------------------------------------------------------------------------------------------------

var tona_ShapeCopyItemControl = { __dummy: null

	, invoke: function(unit, targetUnit) {

		// セッションからマップ情報を取得
		var mapInfo = root.getCurrentSession().getCurrentMapInfo();
		var map = z_master.mapById[mapInfo.getId()];

		// ターゲット情報を取得
	    var targetUnitId = targetUnit.getId();

		// クラスを設定
	    unit.setClass(targetUnit.getClass());

	    // 基本設定
		unit.setName(targetUnit.getName() + 'もどき');
	    unit.setDescription(targetUnit.getDescription());

		// レベルは変更しない（経験値バランスの問題）

	    // パラメーターを設定
	    for (var pi = 0; pi <= 10; pi++) {
			unit.setParamValue(pi, targetUnit.getParamValue(pi));
		}

		// スキルを設定
		var skillList = targetUnit.getSkillReferenceList();
		var skillCount = skillList.getTypeCount();
		for (var i = 0; i < skillCount; i++) {
			var skill = skillList.getTypeData(i);
			SkillChecker.arrangeSkill(unit, skill, IncreaseType.INCREASE);
		}

	    // アイテムを設定
		for (var i = 0; i < 6; i++) {
			var item = targetUnit.getItem(i);
			if (item != null) {
				var newItem = root.duplicateItem(item);
				newItem.custom.z_isTradeDisabled = true;
				unit.setItem(i, newItem);
			}
			else {
				unit.clearItem(i);
			}
		}

		// HP
		unit.setHp(ParamBonus.getMhp(unit));

		// スライムフラグを立てる
		//z_UnitControl.setRefUnit(unit, targetUnit.getId(), z_RefType.Slime);

		// 顔グラを更新する
		//z_UnitControl.updateFace(unit);
	}
};




