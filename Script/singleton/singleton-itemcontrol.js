
var ItemControl = {
	decreaseItem: function(unit, item) {
		this.decreaseLimit(unit, item);
		
		if (this.isItemBroken(item)) {
			this.lostItem(unit, item);
			
			if (unit.getUnitType() !== UnitType.PLAYER && DataConfig.isDropTrophyLinked()) {
				ItemControl.deleteTrophy(unit, item);
			}
		}
	},
	
	decreaseLimit: function(unit, item) {
		var limit;
		
		// 耐久が0のアイテムは減らない
		if (item.getLimitMax() === 0) {
			return;
		}
		
		if (item.isWeapon()) {
			// 武器が破損している場合は減らない
			if (item.getLimit() === WeaponLimitValue.BROKEN) {
				return;
			}
		}
		
		limit = item.getLimit() - 1;
		item.setLimit(limit);
	},
	
	lostItem: function(unit, item) {
		var weaponType = item.getWeaponType();
		
		if (weaponType.getBreakedWeapon() !== null) {
			// 「破損時の武器」が設定されている場合は、破損状態を示す値を設定する
			item.setLimit(WeaponLimitValue.BROKEN);
			return;
		}
		
		if (unit === null) {
			StockItemControl.cutStockItem(StockItemControl.getIndexFromItem(item));
		}
		else {
			this.deleteItem(unit, item);
		}
	},
	
	deleteItem: function(unit, item) {
		var i;
		var count = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < count; i++) {
			if (UnitItemControl.getItem(unit, i) === item) {
				// unitのアイテム欄から外す
				UnitItemControl.cutItem(unit, i);
				return true;
			}
		}
		
		return false;
	},
	
	deleteTrophy: function(unit, item) {
		var i, trophy;
		var list = unit.getDropTrophyList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			trophy = list.getData(i);
			if ((trophy.getFlag() & TrophyFlag.ITEM) && ItemControl.compareItem(trophy.getItem(), item)) {
				// itemと同じidのアイテムがドロップトロフィーに含まれるため削除
				root.getCurrentSession().getTrophyEditor().deleteTrophy(list, trophy);
				return true;
			}
		}
		
		return false;
	},
	
	isItemBroken: function(item) {
		// 耐久が無限でないアイテムの耐久が0であるか調べる
		return item.getLimitMax() !== 0 && item.getLimit() === 0;
	},
	
	isWeaponTypeAllowed: function(refList, weapon) {
		var i;
		var count = refList.getTypeCount();
		
		for (i = 0; i < count; i++) {
			if (weapon.isWeaponTypeMatched(refList.getTypeData(i))) {
				break;
			}
		}
		
		if (i === count) {
			return false;
		}
		
		return true;
	},
	
	getEquippedWeapon: function(unit) {
		var i, item, count;
		
		if (unit === null) {
			return null;
		}
		
		count = UnitItemControl.getPossessionItemCount(unit);
		
		// 装備している武器とは、アイテム欄の中で先頭の武器
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item !== null && this.isWeaponAvailable(unit, item)) {
				return item;
			}
		}
		
		return null;
	},
	
	setEquippedWeapon: function(unit, targetItem) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(unit);
		var fastIndex = -1, targetIndex = -1;
		
		// unitがtargetItemの武器を装備する。
		// targetItemはアイテム欄の先頭に配置される。
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item !== null && fastIndex === -1) {
				// アイテム欄の中で先頭のアイテムのインデックスを保存
				fastIndex = i;
			}
			
			if (item === targetItem) {
				// 装備するアイテムのインデックスを保存
				targetIndex = i;
			}
		}
		
		if (fastIndex === -1 || targetIndex === -1) {
			return;
		}
		
		// 交換先が一致する場合は交換しない
		if (fastIndex === targetIndex) {
			return;
		}
		
		// アイテムを入れ替える
		item = UnitItemControl.getItem(unit, fastIndex);
		UnitItemControl.setItem(unit, fastIndex, targetItem);
		UnitItemControl.setItem(unit, targetIndex, item);
		
		this.updatePossessionItem(unit);
	},
	
	// このメソッドは、アイテム欄に変化が生じた場合に呼ばれる。
	// たとえば、アイテム装備、増加、交換、ストック交換、武器耐久ゼロなど。
	updatePossessionItem: function(unit) {
		var mhp, scene;
		var curHp = unit.getHp();
		
		// 負傷生存のユニットは、HPが変化するべきではない
		if (!DataConfig.isBattleSetupRecoverable() && curHp === ChronicInjuryHp.ZERO) {
			return;
		}
		
		mhp = ParamBonus.getMhp(unit);
		scene = root.getCurrentScene();
		
		// シーンがFREEでもEVENTでもない場合は、常にHPは最大HPと一致する。
		// この処理を忘れた場合は、アイテム交換やアイテム増減でHPが変化する。
		if (scene !== SceneType.FREE && scene !== SceneType.EVENT) {
			unit.setHp(mhp);
		}
		
		// HPは最大HPを超えてはならない
		if (curHp > mhp) {
			unit.setHp(mhp);
		}
		else if (curHp < 1) {
			unit.setHp(1);
		}
	},
	
	// unitがitemを装備できるか調べる。
	// unitがitemを装備しているか調べるのではない。
	isWeaponAvailable: function(unit, item) {
		if (item === null) {
			return false;
		}
		
		// itemが武器でない場合は装備できない
		if (!item.isWeapon()) {
			return false;
		}
		
		// 「熟練度」を調べる
		if (!this._isWeaponLevel(unit, item)) {
			return false;
		}
		
		// 「戦士系」などが一致するか調べる
		if (!this._compareTemplateAndCategory(unit, item)) {
			return false;
		}
		
		// クラスの「装備可能武器」のリストに入っているか調べる
		if (!this.isWeaponTypeAllowed(unit.getClass().getEquipmentWeaponTypeReferenceList(), item)) {
			return false;
		}
		
		// 「専用データ」を調べる
		if (!this.isOnlyData(unit, item)) {
			return false;
		}
		
		if (item.getWeaponCategoryType() === WeaponCategoryType.MAGIC) {
			// 「魔法攻撃」が禁止されているか調べる
			if (StateControl.isBadStateFlag(unit, BadStateFlag.MAGIC)) {
				return false;
			}
		}
		else {
			// 「物理攻撃」が禁止されているか調べる
			if (StateControl.isBadStateFlag(unit, BadStateFlag.PHYSICS)) {
				return false;
			}
		}
		
		return true;
	},
	
	// unitがアイテムを使用できるか調べる
	isItemUsable: function(unit, item) {
		// 武器は使用できない
		if (item.isWeapon()) {
			return false;
		}
		
		// アイテムの使用が禁止されているか調べる
		if (StateControl.isBadStateFlag(unit, BadStateFlag.ITEM)) {
			return false;
		}
			
		if (item.isWand()) {
			// アイテムが杖の場合は、クラスが杖を使用できなければならない
			if (!(unit.getClass().getClassOption() & ClassOptionFlag.WAND)) {
				return false;
			}
			
			// 杖の使用が禁止されているか調べる
			if (StateControl.isBadStateFlag(unit, BadStateFlag.WAND)) {
				return false;
			}
		}
		
		if (!this._isItemTypeAllowed(unit, item)) {
			return false;
		}
		
		// 「専用データ」を調べる
		if (!this.isOnlyData(unit, item)) {
			return false;
		}
		
		return true;
	},
	
	// 「専用データ」を調べる
	isOnlyData: function(unit, item) {
		// 「専用データ」にスキルが指定されている場合は、武器のスキルも調べる必要があるが、
		// その武器を第2引数に指定することでループするのを防ぐ。
		return item.getAvailableAggregation().isConditionFromWeapon(unit, item);
	},
	
	// 特効かどうかを調べる
	isEffectiveData: function(unit, item) {
		var aggregation = item.getEffectiveAggregation();
		
		if (aggregation.getObjectCount() === 0) {
			return false;
		}
		
		return aggregation.isCondition(unit);
	},
	
	// unitが所持しているアイテムから、flagを含む鍵アイテムを取得する
	getKeyItem: function(unit, flag) {
		var i, item, info, isKey;
		var count = UnitItemControl.getPossessionItemCount(unit);
		
		// アイテムを順番に調べる。
		// 前方のアイテムほど優先される。
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item === null) {
				continue;
			}
			
			if (!item.isWeapon() && item.getItemType() === ItemType.KEY && this.isItemUsable(unit, item)) {
				isKey = false;
				info = item.getKeyInfo();
				
				// 杖の場合はアイテムを返さない
				if (!item.isWand()) {
					if (info.getKeyFlag() & flag) {
						isKey = true;
					}
					else {
						isKey = false;
					}
				}
				
				if (isKey) {
					return item;
				}
			}
		}
		
		return null;
	},
	
	// itemとtargetItemが同一種類かどうか調べる
	compareItem: function(item, targetItem) {
		var id, targetId;
		
		if (item === null || targetItem === null) {
			return false;
		}
		
		id = item.getId();
		targetId = targetItem.getId();
		
		if (!item.isWeapon()) {
			id += ItemIdValue.BASE;
		}
		
		if (!targetItem.isWeapon()) {
			targetId += ItemIdValue.BASE;
		}
		
		// 通常、データのidはそれぞれ唯一の値である。
		// ただし、同じアイテムは同じIDを持つため、以下の判定は有効である。
		return id === targetId;
	},
	
	_isItemTypeAllowed: function(unit, item) {
		var itemType = item.getItemType();
		
		if (itemType === ItemType.KEY) {
			if (item.getKeyInfo().isAdvancedKey()) {
				// 「専用鍵」の場合は、クラスが鍵を使用できなければならない
				if (!(unit.getClass().getClassOption() & ClassOptionFlag.KEY)) {
					return false;
				}
			}
		}
		else if (itemType === ItemType.DOPING) {
			// 以下コードをコメントアウトする場合、ItemMessenger._isItemTypeAllowedでDopingItemControl.isItemAllowedを呼ばなくてよい
			//if (!DopingItemControl.isItemAllowed(unit, item)) {
			//	return false;
			//}
		}
		
		return true;
	},
	
	_isWeaponLevel: function(unit, item) {
		// ParamBonus.getWlvを呼び出すとループする
		return ParamBonus.getBonusFromWeapon(unit, ParamType.WLV, item) >= item.getWeaponLevel();
	},
	
	_compareTemplateAndCategory: function(unit, item) {
		var result = false;
		var classMotionFlag = unit.getClass().getClassMotionFlag();
		var weaponCategoryType = item.getWeaponCategoryType();
		
		// クラスの「戦士系」、「弓兵系」、「魔道士系」の全てが空白である場合は、
		// 全ての武器を装備できる。
		if (classMotionFlag === 0) {
			return true;
		}
		
		if (weaponCategoryType === WeaponCategoryType.PHYSICS) {
			if (classMotionFlag & ClassMotionFlag.FIGHTER) {
				result = true;
			}
		}
		else if (weaponCategoryType === WeaponCategoryType.SHOOT) {
			if (classMotionFlag & ClassMotionFlag.ARCHER) {
				result = true;
			}
		}
		else if (weaponCategoryType === WeaponCategoryType.MAGIC) {
			if (classMotionFlag & ClassMotionFlag.MAGE) {
				result = true;
			}
		}
		
		return result;
	}
};

// unit.getItemなどの呼び出しをラッピングする
var UnitItemControl = {
	getItem: function(unit, index) {
		return unit.getItem(index);
	},
	
	setItem: function(unit, index, item) {
		if (unit === null || typeof unit === 'undefined') {
			return;
		}
		
		if (index < 0) {
			return;
		}
		
		if (item === null || typeof item === 'undefined') {
			unit.clearItem(index);
		}
		else {
			// スクリプトAPIにnullを指定するのは避けることが推奨される
			unit.setItem(index, item);
		}
	},
	
	cutItem: function(unit, index) {
		var item;
		
		// clearItemは、indexが示すアイテム位置をnullにする。
		// 戻り値は、以前に存在していたアイテム。
		item = unit.clearItem(index);
		
		this.arrangeItem(unit);
		
		return item;
	},
	
	// アイテムの順番を整頓する
	arrangeItem: function(unit) {
		var i, j, item;
		var count = this.getPossessionItemCount(unit);
		var maxCount = DataConfig.getMaxUnitItemCount();
		
		// 間に空白ができないようにアイテムを詰める
		for (i = 0; i < count; i++) {
			if (unit.getItem(i) === null) {
				for (j = i + 1; j < maxCount; j++) {
					item = unit.getItem(j);
					if (item !== null) {
						unit.setItem(i, item);
						unit.clearItem(j);
						break;
					}
				}
			}
		}
	},
	
	// unitのアイテム欄にitemを追加する
	pushItem: function(unit, item) {
		var count = this.getPossessionItemCount(unit);
		
		if (count < DataConfig.getMaxUnitItemCount()) {	
			this.arrangeItem(unit);
			unit.setItem(count, item);
			return true;
		}
		
		return false;
	},
	
	// unitが所持しているアイテムの数を返す
	getPossessionItemCount: function(unit) {
		var i;
		var count = DataConfig.getMaxUnitItemCount();
		var bringCount = 0;
		
		for (i = 0; i < count; i++) {
			if (unit.getItem(i) !== null) {
				bringCount++;
			}
		}
		
		return bringCount;
	},
	
	// アイテムを追加できるスペースがあるか調べる
	isUnitItemSpace: function(unit) {
		return this.getPossessionItemCount(unit) !== DataConfig.getMaxUnitItemCount();
	},
	
	getMatchItem: function(unit, targetItem) {
		var i, item, count;
		
		if (unit === null) {
			return null;
		}
		
		count = this.getPossessionItemCount(unit);

		// targetItemをunitが所持しているかを調べる
		for (i = 0; i < count; i++) {
			item = this.getItem(unit, i);
			if (item === targetItem) {
				return item;
			}
		}

		// 所持していない場合は、同一IDのアイテムを所持しているかを調べる
		for (i = 0; i < count; i++) {
			item = this.getItem(unit, i);
			if (ItemControl.compareItem(item, targetItem)) {
				return item;
			}
		}
		
		return null;
	},
	
	getIndexFromItem: function(unit, targetItem) {
		var i, item;
		var count = UnitItemControl.getPossessionItemCount(unit);
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (item === targetItem) {
				return i;
			}
		}
		
		return -1;
	}
};

// root.getMetaSession().getStockItemArrayの呼び出しをラッピングする
var StockItemControl = {
	getStockItemArray: function() {
		return root.getMetaSession().getStockItemArray();
	},
	
	getStockItem: function(index) {
		var itemArray = this.getStockItemArray();
		return itemArray[index];
	},
	
	setStockItem: function(index, item) {
		var itemArray = this.getStockItemArray();
		
		itemArray[index] = item;
		this.sortItem();
	},
	
	pushStockItem: function(item) {
		var itemArray = this.getStockItemArray();
		
		itemArray.push(item);
		this.sortItem();
	},
	
	cutStockItem: function(index) {
		var itemArray = this.getStockItemArray();
		
		itemArray.splice(index, 1);
		this.sortItem();
	},
	
	getStockItemCount: function() {
		var itemArray = this.getStockItemArray();
		return itemArray.length;
	},
	
	isStockItemSpace: function() {
		return this.getStockItemCount() !== DataConfig.getMaxStockItemCount();
	},
	
	getMatchItem: function(targetItem) {
		var i, item;
		var count = this.getStockItemCount();
		
		for (i = 0; i < count; i++) {
			item = this.getStockItem(i);
			if (ItemControl.compareItem(item, targetItem)) {
				return item;
			}
		}
		
		return null;
	},
	
	getIndexFromItem: function(item) {
		var i;
		var count = this.getStockItemCount();
		
		for (i = 0; i < count; i++) {
			if (this.getStockItem(i) === item) {
				return i;
			}
		}
		
		return -1;
	},
	
	sortItem: function() {
		var itemArray = this.getStockItemArray();
		
		// 並び替えの優先順位は次のようになる。
		// ・武器はアイテムより優先
		// ・idが低いアイテムは高いアイテムより優先
		// ・耐久が低いアイテムは高いアイテムより優先
		itemArray.sort(
			function(item1, item2) {
				var id1, id2;
				var limit1, limit2;
				
				id1 = item1.getId();
				id2 = item2.getId();
				
				if (!item1.isWeapon()) {
					id1 += ItemIdValue.BASE;
				}
				
				if (!item2.isWeapon()) {
					id2 += ItemIdValue.BASE;
				}
				
				if (id1 > id2) {
					return 1;
				}
				else if (id1 < id2) {
					return -1;
				}
				else {
					limit1 = item1.getLimit();
					limit2 = item2.getLimit();
					
					if (limit1 > limit2) {
						return 1;
					}
					else if (limit1 < limit2) {
						return -1;
					}
				}
				
				return 0;
			}
		);
	}
};

var ItemChangeControl = {
	changeStockItem: function(targetItem, increaseType) {
		var arr = [];
		
		// arrにアイテムが格納された場合は、そのアイテムはストックに格納できない
		
		if (increaseType === IncreaseType.INCREASE) {
			arr = this._increaseStockItem(targetItem);
		}
		else if (increaseType === IncreaseType.DECREASE) {
			arr = this._decreaseStockItem(targetItem);
		}
		else if (increaseType === IncreaseType.ALLRELEASE) {
			arr = this._releaseAllStockItem();
		}
		
		return arr;
	},
	
	changeUnitItem: function(unit, targetItem, increaseType, isStockSend) {
		var arr = [];
		
		// arrにアイテムが格納された場合は、そのアイテムは所持またはストックに格納できない
		
		if (increaseType === IncreaseType.INCREASE) {
			arr = this._increaseUnitItem(unit, targetItem);
		}
		else if (increaseType === IncreaseType.DECREASE) {
			arr = this._decreaseUnitItem(unit, targetItem, isStockSend);
		}
		else if (increaseType === IncreaseType.ALLRELEASE) {
			arr = this._releaseAllUnitItem(unit, isStockSend);
		}
		
		MapHpControl.updateHp(unit);
		
		return arr;
	},
	
	_increaseStockItem: function(targetItem) {
		var arr = [];
		
		if (!StockItemControl.isStockItemSpace()) {
			arr.push(targetItem);
			return arr;
		}
		
		StockItemControl.pushStockItem(targetItem);
		
		return arr;
	},
	
	_decreaseStockItem: function(targetItem) {
		var i, item;
		var count = StockItemControl.getStockItemCount();
		
		for (i = 0; i < count; i++) {
			item = StockItemControl.getStockItem(i);
			if (item !== null && ItemControl.compareItem(item, targetItem)) {
				StockItemControl.cutStockItem(i);
				break;
			}
		}
		
		return [];
	},
	
	_releaseAllStockItem: function() {
		var i;
		var count = StockItemControl.getStockItemCount();
		
		// 重要アイテムも含めて全て削除される
		for (i = 0; i < count; i++) {
			StockItemControl.cutStockItem(0);
		}
		
		return [];
	},
	
	_increaseUnitItem: function(unit, targetItem) {
		var arr = [];
		
		if (!UnitItemControl.isUnitItemSpace(unit)) {
			arr.push(targetItem);
			return arr;
		}
		
		UnitItemControl.pushItem(unit, targetItem);
		
		// 新しいアイテムを所持したため更新
		ItemControl.updatePossessionItem(unit);
		
		return arr;
	},
	
	_decreaseUnitItem: function(unit, targetItem, isStockSend) {
		var i, item, curItem;
		var count = DataConfig.getMaxUnitItemCount();
		var arr = [];
		
		for (i = 0; i < count; i++) {
			item = UnitItemControl.getItem(unit, i);
			if (ItemControl.compareItem(item, targetItem)) {
				// 同じアイテムが見つかったから消去
				curItem = UnitItemControl.cutItem(unit, i);
				if (curItem !== null && isStockSend) {
					if (StockItemControl.isStockItemSpace()) {
						StockItemControl.pushStockItem(curItem);
					}
					else {
						arr.push(curItem);
					}
				}
				break;
				
			}
		}
		
		return arr;
	},
	
	_releaseAllUnitItem: function(unit, isStockSend) {
		var i, curItem;
		var count = DataConfig.getMaxUnitItemCount();
		var arr = [];
		
		for (i = 0; i < count; i++) {
			curItem = UnitItemControl.cutItem(unit, 0);
			if (curItem !== null && isStockSend) {
				if (StockItemControl.isStockItemSpace()) {
					StockItemControl.pushStockItem(curItem);
				}
				else {
					arr.push(curItem);
				}
			}
		}
		
		return arr;
	}
};
