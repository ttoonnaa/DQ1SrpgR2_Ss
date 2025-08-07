
// アニメ画像を単に画像として扱う場合は、AnimeSimpleを使用する。
// モーションとして扱う場合は、AnimeMotionを使用する。

var AnimeSimple = defineObject(BaseObject,
{
	_animeData: null,
	_interpolationMode: 0,
	_parentAnimeMotion: null,
	_motionId: 0,
	_weaponResourceHandle: null,
	
	setAnimeData: function(animeData) {
		this._animeData = animeData;
		this._interpolationMode = root.getAnimePreference().getInterpolationMode();
	},
	
	setAnimeMotion: function(parentAnimeMotion) {
		this._parentAnimeMotion = parentAnimeMotion;
	},
	
	setMotionId: function(motionId) {
		this._motionId = motionId;
	},
	
	setWeaponResourceHandle: function(weaponResourceHandle) {
		this._weaponResourceHandle = weaponResourceHandle;
	},
	
	drawMotion: function(frameIndex, i, animeRenderParam, animeCoordinates) {
		var pic, srcWidth, srcHeight;
		var x = this._animeData.getSpriteX(this._motionId, frameIndex, i);
		var y = this._animeData.getSpriteY(this._motionId, frameIndex, i);
		var width = this._animeData.getSpriteWidth(this._motionId, frameIndex, i);
		var height = this._animeData.getSpriteHeight(this._motionId, frameIndex, i);
		var degree = this._animeData.getSpriteDegree(this._motionId, frameIndex, i);
		var handle = this._animeData.getSpriteGraphicsHandle(this._motionId, frameIndex, i);
		var xSrc = handle.getSrcX();
		var ySrc = handle.getSrcY();
		var isAbsolute = this._animeData.isAbsoluteMotion(this._motionId);
		var obj = this._checkReverseInfo(frameIndex, i, animeRenderParam, animeCoordinates);
		var alpha = obj.alpha;
		var isRight = obj.isRight;
		var isReverse = obj.isReverse;
		
		pic = this._getMotionPicture(frameIndex, i, animeRenderParam);
		if (pic !== null) {
			if (alpha !== 0 && typeof obj.color !== 'undefined') {
				pic.setColor(obj.color, alpha);
			}
			else {
				pic.setAlpha(alpha);
			}
			pic.setDegree(degree);
			if (this._animeData.isMirrorAllowed()) {
				pic.setReverse(isReverse);
			}
			pic.setInterpolationMode(this._interpolationMode);
			
			if (this._animeData.getSpriteGraphicsType(this._motionId, frameIndex, i) === GraphicsType.PICTURE) {
				srcWidth = pic.getWidth();
				srcHeight = pic.getHeight();
			}
			else {
				srcWidth = GraphicsFormat.MOTION_WIDTH;
				srcHeight = GraphicsFormat.MOTION_HEIGHT;
			}
			
			this._drawSprite(x, y, width, height, pic, isAbsolute, isRight, xSrc, ySrc, srcWidth, srcHeight, animeCoordinates);
		}
	},
	
	drawWeapon: function(frameIndex, i, animeRenderParam, animeCoordinates) {
		var pic, xSrc, ySrc, srcWidth, srcHeight;
		var x = this._animeData.getSpriteX(this._motionId, frameIndex, i);
		var y = this._animeData.getSpriteY(this._motionId, frameIndex, i);
		var width = this._animeData.getSpriteWidth(this._motionId, frameIndex, i);
		var height = this._animeData.getSpriteHeight(this._motionId, frameIndex, i);
		var degree = this._animeData.getSpriteDegree(this._motionId, frameIndex, i);
		var plus = this._animeData.getWeaponSrcXPlus(this._motionId, frameIndex, i); 
		var isAbsolute = this._animeData.isAbsoluteMotion(this._motionId);
		var isShoot = this._isShootAnime();
		var obj = this._checkReverseInfo(frameIndex, i, animeRenderParam, animeCoordinates);
		var alpha = obj.alpha;
		var isRight = obj.isRight;
		var isReverse = obj.isReverse;
		
		if (!this._isWeaponVisible()) {
			return;
		}
		
		xSrc = this._weaponResourceHandle.getSrcX() + plus;
		ySrc = this._weaponResourceHandle.getSrcY();
		
		pic = this._getWeaponPicture(isShoot);
		if (pic !== null) {
			if (alpha !== 0 && typeof obj.color !== 'undefined') {
				pic.setColor(obj.color, alpha);
			}
			else {
				pic.setAlpha(alpha);
			}
			pic.setDegree(degree);
			pic.setReverse(isReverse);
			pic.setInterpolationMode(this._getWeaponInterpolationMode());
			
			if (isShoot) {
				srcWidth = GraphicsFormat.BOW_WIDTH / 3;
				srcHeight = GraphicsFormat.BOW_HEIGHT;
			}
			else {
				srcWidth = GraphicsFormat.WEAPON_WIDTH;
				srcHeight = GraphicsFormat.WEAPON_HEIGHT;
			}
			
			this._drawSprite(x, y, width, height, pic, isAbsolute, isRight, xSrc, ySrc, srcWidth, srcHeight, animeCoordinates);
		}
	},
	
	_isWeaponVisible: function() {
		if (this._animeData.isWeaponDisabled(this._motionId)) {
			return false;
		}
		
		if (this._weaponResourceHandle === null) {
			return false;
		}
		
		if (this._animeData.getAttackTemplateType() === AttackTemplateType.MAGE) {
			return false;
		}
		
		return true;
	},
	
	_getWeaponInterpolationMode: function() {
		// InterpolationMode.NEARESTNEIGHBORを返すと、武器にアンチエイリアスはかからない
		return InterpolationMode.BILINEAR;
	},
	
	_isShootAnime: function() {
		return this._animeData.getAttackTemplateType() === AttackTemplateType.ARCHER;
	},
	
	_getMotionPicture: function(frameIndex, i, animeRenderParam) {
		var list, isRuntime, pic;
		var base = root.getBaseData();
		var handle = this._animeData.getSpriteGraphicsHandle(this._motionId, frameIndex, i);
		var id = handle.getResourceId();
		var handleType = handle.getHandleType();
		var colorIndex =  handle.getColorIndex();
		var graphicsType = this._animeData.getSpriteGraphicsType(this._motionId, frameIndex, i);
		
		if (handleType === ResourceHandleType.ORIGINAL) {
			isRuntime = false;
		}
		else if (handleType === ResourceHandleType.RUNTIME) {
			isRuntime = true;
		}
		else {
			return null;
		}
		
		if (this._isColorChangeEnabled(frameIndex, i, animeRenderParam)) {
			colorIndex = animeRenderParam.motionColorIndex;
		}
		
		list = base.getGraphicsResourceList(graphicsType, isRuntime);
		pic = list.getCollectionDataFromId(id, colorIndex);
		
		AnimePerformanceHelper.pickup(pic, this._parentAnimeMotion);
		
		return pic;
	},
	
	_isColorChangeEnabled: function(frameIndex, i, animeRenderParam) {
		if (animeRenderParam === null) {
			return false;
		}
		
		// モーション以外の画像、つまりエフェクトやピクチャは、エディタで適応されたカラーをそのまま使用する
		if (this._animeData.getSpriteGraphicsType(this._motionId, frameIndex, i) !== GraphicsType.MOTION) {
			return false;
		}
		
		return true;
	},
	
	_getWeaponPicture: function(isShoot, silhouetteType) {
		var list, isRuntime;
		var base = root.getBaseData();
		var handleType = this._weaponResourceHandle.getHandleType();
		var resourceId = this._weaponResourceHandle.getResourceId();
		var colorIndex = this._weaponResourceHandle.getColorIndex();
		
		if (handleType === ResourceHandleType.ORIGINAL) {
			isRuntime = false;
		}
		else if (handleType === ResourceHandleType.RUNTIME) {
			isRuntime = true;
		}
		else {
			return null;
		}
		
		if (isShoot) {
			list = base.getGraphicsResourceList(GraphicsType.BOW, isRuntime);
		}
		else {
			list = base.getGraphicsResourceList(GraphicsType.WEAPON, isRuntime);
		}
		
		return list.getCollectionDataFromId(resourceId, colorIndex);
	},
	
	_checkReverseInfo: function(frameIndex, i, animeRenderParam, animeCoordinates) {
		var isRight = true;
		var dx = 0;
		var dy = 0;
		var alpha = this._animeData.getSpriteAlpha(this._motionId, frameIndex, i);
		var isReverse = this._animeData.isSpriteReverse(this._motionId, frameIndex, i);
		
		if (animeRenderParam !== null) {
			if (this._isAlphaChangeEnabled(frameIndex, i, animeRenderParam)) {
				alpha = animeRenderParam.alpha;
			}
			
			if (!animeRenderParam.isRight) {
				// スプライトは右側に配置されていない、つまり反転している
				isReverse = !isReverse;
			}
			
			isRight = animeRenderParam.isRight;
		}
		
		if (root.getAnimePreference().isEnemyOffsetEnabled()) {
			dx = animeRenderParam.offsetX;
			dy = animeRenderParam.offsetY;
			
			if (animeRenderParam.isOffsetReverse) {
				isRight = !isRight;
				isReverse = !isReverse;
				if (!isRight) {
					dx *= -1;
				}
			}
			else {
				if (isRight) {
					dx *= -1;
				}
			}
		}
		
		animeCoordinates.dx += dx;
		animeCoordinates.dy += dy;
		
		return {
			alpha: alpha,
			isRight: isRight,
			isReverse: isReverse
		};
	},
	
	_isAlphaChangeEnabled: function(frameIndex, i, animeRenderParam) {
		if (animeRenderParam === null) {
			return false;
		}
		
		// スプライトに意図してアルファ値0が設定されている場合、常に透明を望むものと想定し、アルファ値を変更しない
		if (this._animeData.getSpriteAlpha(this._motionId, frameIndex, i) === 0) {
			return false;
		}
		
		// ターゲットの撃破などで、意図的にスプライトのアルファ値を変更しようとしている場合は、アルファ値の変更を許可する
		return animeRenderParam.alpha !== -1;
	},
	
	_drawSprite: function(x, y, width, height, pic, isAbsolute, isRight, xSrc, ySrc, srcWidth, srcHeight, animeCoordinates) {
		var xDest, yDest, dx, dy;
		
		// xDest算出処理
		if (isAbsolute) {
			dx = 0;
		}
		else {
			// 中心からのずれを計算する
			dx = animeCoordinates.xCenter - x;
		}
		if (!isRight) {
			// 向きが異なるため、ずれる方向を変える
			dx *= -1;
			// キースプライトを基準にずらす
			dx += width - animeCoordinates.keySpriteWidth;
		}
		
		// 描画予定だった位置(xBase)にずれを加算
		xDest = animeCoordinates.xBase - dx;
		
		// yDest算出処理
		if (isAbsolute) {
			dy = 0;
		}
		else {
			dy = animeCoordinates.yCenter - animeCoordinates.yBase;
		}
		// 描画予定だった位置(yBase)にずれを加算
		yDest = y - dy;
		
		pic.drawStretchParts(xDest + animeCoordinates.dx, yDest + animeCoordinates.dy, width, height, xSrc * srcWidth, ySrc * srcHeight, srcWidth, srcHeight);
	}
}
);

// このオブジェクトは、戦闘画面以外でアニメ画像を表示する場合に使用。
// アニメーションダイアログで設定された位置関係を考慮しない。
var NonBattleAnimeSimple = defineObject(AnimeSimple,
{
	_drawSprite: function(x, y, width, height, pic, isAbsolute, isRight, xSrc, ySrc, srcWidth, srcHeight, animeCoordinates) {
		var xDest = animeCoordinates.xBase - Math.floor(width / 2);
		var yDest = animeCoordinates.yBase - height;
		
		pic.drawStretchParts(xDest, yDest, width, height, xSrc * srcWidth, ySrc * srcHeight, srcWidth, srcHeight);
	}
}
);

var AnimeMotion = defineObject(BaseObject,
{
	_unit: null,
	_animeData: null,
	_versusType: 0,
	_xBase: null,
	_yBase: null,
	_animeRenderParam: null,
	_color: 0,
	_rangeType: EffectRangeType.NONE,
	_isVolume: false,
	_speedType: 0,
	_counter: null,
	_volumeCounter: null,
	_animeSimple: null,
	_motionId: 0,
	_isLast: false,
	_isLoopMode: false,
	_frameIndex: 0,
	_isThrowWeaponHidden: false,
	_isWeaponShown: true,
	_isLockSound: false,
	_includedResourceCount: 0,
	_xKey: 0,
	_yKey: 0,
	_xOffset: 0,
	_yOffset: 0,
	_realEffect: null,
	
	setMotionParam: function(motionParam) {
		this._unit = motionParam.unit;
		this._animeData = motionParam.animeData;
		this._versusType = motionParam.versusType;
		this._xBase = [];
		this._yBase = [];
		this._animeRenderParam = StructureBuilder.buildAnimeRenderParam();
		this._animeRenderParam.alpha = -1;
		this._animeRenderParam.isRight = motionParam.isRight;
		this._animeRenderParam.motionColorIndex = motionParam.motionColorIndex;
		this._animeRenderParam.parentMotion = this;
		this._rangeType = EffectRangeType.NONE;
		this._isVolume = false;
		
		this._counter = createObject(CycleCounter);
		this._volumeCounter = createObject(VolumeCounter);
		this._animeSimple = createObject(AnimeSimple);
		
		// モーションではなく、エフェクトの場合はnullになっている
		if (this._animeData === null) {
			this._animeData = BattlerChecker.findBattleAnime(this._unit.getClass(), null);
		}
		this._animeSimple.setAnimeData(this._animeData);
		this._animeSimple.setAnimeMotion(this);
		if (this._animeData !== null) {
			this._includedResourceCount = this._animeData.getIncludedResourceCount();
		}
		
		this._xKey = motionParam.x;
		this._yKey = motionParam.y;
		
		// 既定のモーションIDが設定されているかどうか調べる
		if (motionParam.motionId !== -1) {
			this.setMotionId(motionParam.motionId);
		}
	},
	
	setMotionId: function(motionId) {
		this._motionId = motionId;
		this._isLast = false;
		this._isLoopMode = false;
		this._frameIndex = 0;
		this._isThrowWeaponHidden = false;
		this._isWeaponShown = true;
		
		this._animeSimple.setMotionId(motionId);
		
		this._setFrame(this._frameIndex);
	},
	
	getMotionId: function() {
		return this._motionId;
	},
	
	getOwnerUnit: function() {
		return this._unit;
	},
	
	getAnimeData: function() {
		return this._animeData;
	},
	
	getAnimeRenderParam: function() {
		return this._animeRenderParam;
	},
	
	moveMotion: function() {
		if (this._isVolume) {
			this._volumeCounter.moveVolumeCounter();
			if (this._volumeCounter.getRoundCount() === 1) {
				this._isVolume = false;
			}
		}
		
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			return MoveResult.CONTINUE;
		}
		
		if (this._isLast) {
			return MoveResult.END;
		}
		
		return MoveResult.END;
	},
	
	drawMotion: function(xScroll, yScroll) {
		var i, spriteType;
		var count = this._animeData.getSpriteCount(this._motionId, this._frameIndex);
		var motionCategoryType = this._animeData.getMotionCategoryType(this._motionId);
		var keyIndex = this._getSpriteIndexFromSpriteType(SpriteType.KEY, this._frameIndex);
		var animeCoordinates = StructureBuilder.buildAnimeCoordinates();
		
		// 武器や追加スプライトの座標を算出する際には、キースプライトの情報が必要になる
		animeCoordinates.keySpriteWidth = this._animeData.getSpriteWidth(this._motionId, this._frameIndex, keyIndex);
		animeCoordinates.xCenter = Math.floor(GraphicsFormat.BATTLEBACK_WIDTH / 2) - Math.floor(animeCoordinates.keySpriteWidth / 2);
		animeCoordinates.keySpriteHeight = this._animeData.getSpriteHeight(this._motionId, this._frameIndex, keyIndex);
		animeCoordinates.yCenter = GraphicsFormat.BATTLEBACK_HEIGHT - root.getAnimePreference().getBoundaryHeight() - animeCoordinates.keySpriteHeight;
		
		for (i = 0; i < count; i++) {
			spriteType = this._animeData.getSpriteType(this._motionId, this._frameIndex, i);
			if (this._isSpriteHidden(i, spriteType, motionCategoryType)) {
				continue;
			}
			
			if (!this._animeData.isSpriteEnabled(this._motionId, this._frameIndex, i)) {
				continue;
			}
			
			animeCoordinates.xBase = this._xBase[i] - xScroll;
			animeCoordinates.yBase = this._yBase[i] - yScroll;
			animeCoordinates.dx = this._xOffset;
			animeCoordinates.dy = this._yOffset;
			if (spriteType === SpriteType.KEY || spriteType === SpriteType.OPTION) {
				this._animeSimple.drawMotion(this._frameIndex, i, this._animeRenderParam, animeCoordinates);
			}
			else {
				if (this._isWeaponShown) {
					this._animeSimple.drawWeapon(this._frameIndex, i, this._animeRenderParam, animeCoordinates);
				}
			}
		}
	},
	
	drawScreenColor: function() {
		var color = this.getScreenColor();
		var alpha = this.getScreenAlpha();
		
		root.getGraphicsManager().fillRange(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), color, alpha);
	},
	
	drawBackgroundAnime: function() {
		var x, y, srcWidth, srcHeight, destWidth, destHeight;
		var image = this._animeData.getBackgroundAnimeImage(this._motionId, this._frameIndex);
		
		if (image === null) {
			return;
		}
		
		srcWidth = image.getWidth();
		srcHeight = image.getHeight();
		
		if (this._isBackgroundAnimeScaling()) {
			if (AttackControl.isAttack()) {
				destWidth = RealBattleArea.WIDTH;
				destHeight = RealBattleArea.HEIGHT;
			}
			else {
				// 非戦闘時は、ゲーム画面全体まで拡大
				destWidth = root.getGameAreaWidth();
				destHeight = root.getGameAreaHeight();
			}
			x = 0;
			y = 0;
		}
		else {
			destWidth = srcWidth;
			destHeight = srcHeight;
			x = Math.floor(root.getGameAreaWidth() / 2) - Math.floor(destWidth / 2);
			y = Math.floor(root.getGameAreaHeight() / 2) - Math.floor(destHeight / 2);
		}
		
		image.setReverse(this._isBackgroundAnimeReverse());
		
		image.setAlpha(this._animeData.getBackgroundAnimeAlpha(this._motionId, this._frameIndex));
		image.drawStretchParts(x, y, destWidth, destHeight, 0, 0, srcWidth, srcHeight);
		
		AnimePerformanceHelper.pickup(image, this);
	},
	
	nextFrame: function() {
		var isContinue;
		var count = this.getFrameCount();
		
		if (this._frameIndex + 1 < count) {
			this._frameIndex++;
			this._setFrame(this._frameIndex);
			isContinue = true;
		}
		else {
			this._endFrame();
			isContinue = false;
		}
		
		return isContinue;
	},
	
	isLastFrame: function() {
		if (!this._isLast) {
			return false;
		}
		
		return true;
	},
	
	isLoopMode: function() {
		return this._isLoopMode;
	},
	
	setLoopMode: function(isLoopMode) {
		this._isLoopMode = isLoopMode;
	},
	
	getKeyX: function() {
		var index = this._getSpriteIndexFromSpriteType(SpriteType.KEY);
		
		return this._xBase[index];
	},
	
	getKeyY: function() {
		var index = this._getSpriteIndexFromSpriteType(SpriteType.KEY);
		
		return this._yBase[index];
	},
	
	getFocusX: function() {
		var index = this._getSpriteIndexFromFocus();
		var width = this._animeData.getSpriteWidth(this._motionId, this._frameIndex, index);
		var dx = this._animeRenderParam.isRight ? 0 : Math.floor(width / 2);
		
		return this._xBase[index] + dx;
	},
	
	getFocusY: function() {
		var index = this._getSpriteIndexFromFocus();
		var height = this._animeData.getSpriteHeight(this._motionId, this._frameIndex, index);
		var dy = Math.floor(height / 2);
		
		return this._yBase[index] + dy;
	},
	
	// 戦闘モーションの上からエフェクトを表示する場合に呼ばれる。
	// 拡大縮小の関係から、エフェクトがモーションと同じサイズとは限らないため、
	// 位置を計算するにはエフェクトのAnimeDataが必要になる。
	// エフェクトの拡大縮小において、全てのキースプライトは一定サイズになっていることを前提にしている。
	// すなわち、最初のキースプライトの拡大率が120の場合は、
	// 残りのキースプライトの拡大率も120でなければならない。
	getEffectPos: function(effectAnimeData, isRight) {
		var dx, dy, offset;
		var index = this._getSpriteIndexFromSpriteType(SpriteType.KEY);
		var width = this._animeData.getSpriteWidth(this._motionId, this._frameIndex, index);
		var height = this._animeData.getSpriteHeight(this._motionId, this._frameIndex, index);
		var size = Miscellaneous.getFirstKeySpriteSize(effectAnimeData, 0);
		var effectWidth = size.width;
		var effectHeight = size.height;
		
		dx = Math.floor((width - effectWidth) / 2);
		dy = Math.floor(height - effectHeight);
		
		offset = this._getEffectOffsetX();
		if (!isRight) {
			offset *= -1;
		}
		
		return createPos(this._xBase[index] + dx - offset, this._yBase[index] + dy);
	},
	
	getCenterPos: function(effectWidth, effectHeight, isRight) {
		var dx, dy, offset;
		var index = this._getSpriteIndexFromSpriteType(SpriteType.KEY);
		var width = this._animeData.getSpriteWidth(this._motionId, this._frameIndex, index);
		var height = this._animeData.getSpriteHeight(this._motionId, this._frameIndex, index);
		
		dx = Math.floor((width - effectWidth) / 2);
		dy = Math.floor((height - effectHeight) / 2);
		
		offset = this._getEffectOffsetX();
		if (!isRight) {
			offset *= -1;
		}
		
		return createPos(this._xBase[index] + dx - offset, this._yBase[index] + dy);
	},
	
	getFrameIndex: function() {
		return this._frameIndex;
	},
	
	setFrameIndex: function(frameIndex, isFrameChange) {
		this._frameIndex = frameIndex;
		if (isFrameChange) {
			this._setFrame(this._frameIndex);
		}
	},
	
	getFrameCount: function() {
		return this._animeData.getFrameCount(this._motionId);
	},
	
	isThrowStartFrame: function() {
		return this._animeData.isThrowFrame(this._motionId, this._frameIndex);
	},
	
	isAttackHitFrame: function() {
		return this._animeData.isHitFrame(this._motionId, this._frameIndex);
	},
	
	isEnemyOffsetFrame: function() {
		return this._animeData.isEnemyOffsetFrame(this._motionId, this._frameIndex);
	},
	
	isLoopStartFrame: function() {
		var value = this._animeData.getLoopValue(this._motionId, this._frameIndex);
		
		return value === LoopValue.START;
	},
	
	isLoopEndFrame: function() {
		var value = this._animeData.getLoopValue(this._motionId, this._frameIndex);
		
		return value === LoopValue.END;
	},
	
	isMagicLoopStartFrame: function() {
		var value = this._animeData.getLoopValue(this._motionId, this._frameIndex);
		
		return value === LoopValue.MAGICSTART;
	},
	
	isMagicLoopEndFrame: function() {
		var value = this._animeData.getLoopValue(this._motionId, this._frameIndex);
		
		return value === LoopValue.MAGICEND;
	},
	
	hideThrowWeapon: function() {
		if (!this._animeData.isHitLossDisabled(this._motionId)) {
			this._isThrowWeaponHidden = true;
		}
	},
	
	setWeapon: function(weaponData) {
		this._animeSimple.setWeaponResourceHandle(weaponData.getRealWeaponResourceHandle());
	},
	
	showWeapon: function(isShown) {
		this._isWeaponShown = isShown;
	},
	
	setColorAlpha: function(alpha) {
		this._animeRenderParam.alpha = alpha;
	},
	
	getScreenColor: function() {
		return this._color;
	},
	
	getScreenAlpha: function() {
		return this._volumeCounter.getVolume();
	},
	
	getScreenEffectRangeType: function() {
		return this._rangeType;
	},
	
	getBackgroundAnimeImage: function() {
		return this._animeData.getBackgroundAnimeImage(this._motionId, this._frameIndex);
	},
	
	getBackgroundAnimeAlpha: function() {
		return this._animeData.getBackgroundAnimeAlpha(this._motionId, this._frameIndex);
	},
	
	getBackgroundAnimeRangeType: function() {
		return this._animeData.getBackgroundAnimeRangeType(this._motionId, this._frameIndex);
	},
	
	lockSound: function() {
		this._isLockSound = true;
	},
	
	// 公式Pluginのrenderer-conditionalshow.jsが使用する
	setSpriteOffset: function(x, y) {
		this._xOffset = x;
		this._yOffset = y;
	},
	
	_setFrame: function(frameIndex) {
		this._checkCounter();
		this._checkSound();
		this._checkBright();
		
		// 新しいフレームに変わるため、現在位置を更新する
		this._updatePos();
		
		this._isLast = false;
	},
	
	_endFrame: function() {
		var type = this._animeData.getMotionCategoryType(this._motionId);
		
		// 移動終了時には、キースプライトの基準位置を更新する
		if (type === MotionCategoryType.APPROACH) {
			this._xKey = this.getKeyX();
			this._yKey = this.getKeyY();
		}
		
		this._isLast = true;
		this._isVolume = false;
	},
	
	_checkCounter: function() {
		var value = this._animeData.getFrameCounterValue(this._motionId, this._frameIndex);
		
		// -1によって奇数となるため、60FPSの場合のみ、アニメの速度がわずかに速くなる。
		// こうした例外は本来好ましくないが、このときの速度が最も安定していると判断した。
		this._counter.setCounterInfo(value - 1);
	},
	
	// ユニットの状況に応じては、効果音を敢えて再生しないというケースがあるかもしれないので、_checkSoundと分けている
	_isSoundEnabled: function() {
		return !this._isLockSound && this._animeData.isSoundFrame(this._motionId, this._frameIndex);
	},
	
	_checkSound: function() {
		var soundHandle;
		
		if (this._isSoundEnabled()) {
			soundHandle = this._animeData.getSoundHandle(this._motionId, this._frameIndex);
			MediaControl.soundPlay(soundHandle);
		}
	},
	
	_checkBright: function() {
		var isStart, alpha, volume;
		
		if (!this._animeData.isBrightFrame(this._motionId, this._frameIndex)) {
			return;
		}
		
		isStart = this._animeData.isScreenColorOverlay(this._motionId, this._frameIndex);
		if (isStart) {
			this._color = this._animeData.getScreenColor(this._motionId, this._frameIndex);
			this._rangeType = this._animeData.getScreenColorEffectRangeType(this._motionId, this._frameIndex);
			alpha = this._animeData.getScreenColorAlpha(this._motionId, this._frameIndex);
			
			this._speedType = this._animeData.getScreenColorChangeSpeedType(this._motionId, this._frameIndex);
			if (this._speedType === SpeedType.DIRECT) {
				this._volumeCounter.setVolume(alpha);
				return;
			}
			
			this._volumeCounter.setChangeSpeed(Miscellaneous.convertSpeedType(this._speedType));
			
			volume = this._volumeCounter.getVolume();
			if (alpha > volume) {
				this._volumeCounter.setVolumeRange(alpha, 0, volume, true);
			}
			else {
				this._volumeCounter.setVolumeRange(0, alpha, volume, false);
			}
		}
		else {
			if (this._speedType === SpeedType.DIRECT) {
				this._volumeCounter.setVolume(0);
				return;
			}
		
			this._volumeCounter.setVolumeRange(0, 0, this._volumeCounter.getVolume(), false);
		}
		
		this._isVolume = true;
	},
	
	_updatePos: function() {
		var i, count, x, width, keyIndex;
		var isAbsolute = this._animeData.isAbsoluteMotion(this._motionId);
		
		if (this._realEffect !== null) {
			this._realEffect.updateKeyPos();
		}
		
		if (isAbsolute) {
			keyIndex = this._getSpriteIndexFromSpriteType(SpriteType.KEY, this._frameIndex);
			count = this._animeData.getSpriteCount(this._motionId, this._frameIndex);
			for (i = 0; i < count; i++) {
				x = this._animeData.getSpriteX(this._motionId, this._frameIndex, i);
				if (!this._animeRenderParam.isRight) {
					width = this._animeData.getSpriteWidth(this._motionId, this._frameIndex, keyIndex);
					this._xBase[i] = (GraphicsFormat.BATTLEBACK_WIDTH - width) - x;
				}
				else {
					this._xBase[i] = x;
				}
				this._xBase[i] += this._getHorzOffset(this._animeRenderParam.isRight);
		
				this._yBase[i] = this._animeData.getSpriteY(this._motionId, this._frameIndex, i);
			}
		}
		else {
			count = this._animeData.getSpriteCount(this._motionId, this._frameIndex);
			for (i = 0; i < count; i++) {
				this._xBase[i] = this._xKey + this._getHorzOffset(this._animeRenderParam.isRight);
				this._yBase[i] = this._yKey;
			}
		}
	},
	
	_getHorzOffset: function(isRight) {
		var offset;
		
		if (this._animeData.getAnimeType() === AnimeType.EFFECT) {
			return 0;
		}
		
		offset = root.getAnimePreference().getMotionOffset(this._versusType);
		
		return isRight ? offset * -1 : offset;
	},
	
	_getSpriteIndexFromSpriteType: function(spriteType) {
		var i;
		var count = this._animeData.getSpriteCount(this._motionId, this._frameIndex);
		
		for (i = 0; i < count; i++) {
			if (this._animeData.getSpriteType(this._motionId, this._frameIndex, i) === spriteType) {
				return i;
			}
		}
		
		return 0;
	},
	
	_getSpriteIndexFromFocus: function() {
		var i;
		var count = this._animeData.getSpriteCount(this._motionId, this._frameIndex);
		
		for (i = 0; i < count; i++) {
			if (this._animeData.isFocusSprite(this._motionId, this._frameIndex, i)) {
				return i;
			}
		}
		
		return 0;
	},
	
	_isSpriteHidden: function(i, spriteType, motionCategoryType) {
		// 非表示にすべき状態ではないため、falseを返すことで非表示にしない
		if (!this._isThrowWeaponHidden) {
			return false;
		}
		
		if (motionCategoryType === MotionCategoryType.THROW && this._animeData.isFocusSprite(this._motionId, this._frameIndex, i)) {
			// 間接攻撃においては、視点となっているスプライトを非表示にする。
			// 武器を非表示にしてもよいが、武器を投げずに追加スプライトを衝撃波のように放つこともあり、
			// この場合は武器ではなく、追加スプライトの非表示が理想となる。
			// 放たれたスプライトが非表示になるべきとし、isFocusSpriteで判定を行っている。
			return true;
		}
		else if (motionCategoryType === MotionCategoryType.THROW && this._isDualSprite(i, spriteType, motionCategoryType)) {
			// 武器を視点に当てており、なおかつスプライトも投げている状態は、
			// 武器だけでなくスプライトも非表示にするべきといえる。
			return true;
		}
		else if (motionCategoryType === MotionCategoryType.SHOOT && spriteType === SpriteType.ARROW) {
			// 弓兵系の場合は、常に矢を非表示の対象とする。
			// 矢を放たないというケースは極めて稀であると判断。
			return true;
		}
		
		return false;
	},
	
	_isDualSprite: function(spriteIndex, spriteType, motionCategoryType) {
		var i, spriteTypeOther, xOther;
		var count = this._animeData.getSpriteCount(this._motionId, this._frameIndex);
		var x = this._animeData.getSpriteX(this._motionId, this._frameIndex, spriteType);
		
		for (i = 0; i < count; i++) {
			spriteTypeOther = this._animeData.getSpriteType(this._motionId, this._frameIndex, i);
			if (spriteType === SpriteType.OPTION && spriteTypeOther === SpriteType.WEAPON) {
				xOther = this._animeData.getSpriteX(this._motionId, this._frameIndex, spriteTypeOther);
				if (Math.abs(x - xOther) < 40) {
					// 武器とスプライトが離れすぎていないならば、両者が投げられたと判定
					return true;
				}
			}
		}
		
		return false;
	},
	
	// アニメーションダイアログ上での中央からのずれを取得する
	_getEffectOffsetX: function() {
		var index = this._getSpriteIndexFromSpriteType(SpriteType.KEY);
		var width = this._animeData.getSpriteWidth(this._motionId, this._frameIndex, index);
		var xCenter = Math.floor(GraphicsFormat.BATTLEBACK_WIDTH / 2) - Math.floor(width / 2);
		var x = this._animeData.getSpriteX(this._motionId, this._frameIndex, index);
		var d = 0;
		
		if (!this._animeData.isAbsoluteMotion(this._motionId)) {
			d = xCenter - x;
		}
		
		return d;
	},
	
	_isBackgroundAnimeScaling: function() {
		return true;
	},
	
	_isBackgroundAnimeReverse: function() {
		return false;
	}
}
);

// アニメが大量にリソースを使用する場合、メモリにロードされる量が肥大化してパフォーマンスが悪くなる可能性がある。
// 不要になったリソースをアンロードする間隔を速くすることでこの問題を緩和する。
var AnimePerformanceHelper = {
	pickup: function (pic, animeMotion) {
		var profiler;
		
		if (pic === null) {
			return;
		}
		
		// クラスチェンジ画面でアニメーションが使用されている場合はnullになる
		if (animeMotion === null) {
			return;
		}
		
		if (!this._isLargeMemory(animeMotion)) {
			return;
		}
		
		profiler = root.getResourceProfiler();
		// 引数の画像を解析して、要素数が1である内部データを構築する
		profiler.imageProfiling(pic);
		profiler.setLocalPerformanceTuningInterval(0, this._getInterval());
	},
	
	_isLargeMemory: function(animeMotion) {
		// アニメが20個以上のリソースを使用する可能性がある場合は、チューニングの対象とする
		return animeMotion._includedResourceCount > 20;
	},
	
	_getInterval: function() {
		// リソースが一切参照されなくなってからどれくらいの期間で開放するかを返す
		return 15;
	}
};
