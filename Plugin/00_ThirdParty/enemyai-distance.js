/*------------------------------------------------------------------------------
AIの攻撃位置取り改善プラグイン

AIが攻撃位置を決定する要素はデフォルトでは以下の通り
※この段階で既に攻撃対象や武器は決定済み
①反撃されない位置があるか
②回避率が高い地形があるか
③マップ左上から1行ずつ検索して最初にヒットする移動可能位置

本プラグインは以下の要素を追加することで③による無駄な移動を改善します
優先度が高い順に
・(遠距離攻撃は)なるべく遠くから攻撃する
・歩数はなるべく少なくなるようにする
・(遠距離攻撃は)相手とX軸またはY軸を合わせるように動く

使用方法:
Pluginフォルダにこのファイルを置いてください

■作成者
wiz

■対応バージョン
SRPG Stduio Version:1.144
------------------------------------------------------------------------------*/

(function() {

var alias1 = CombinationSelector._configureScorerSecond;
CombinationSelector._configureScorerSecond = function(groupArray) {
	alias1.call(this, groupArray);
	groupArray.appendObject(AIScorer.Distance);
};

AIScorer.Distance = defineObject(BaseAIScorer, {
	getScore: function(unit, combination) {
		if(combination.targetUnit == null) {
			return 0;
		}
		
		var mov = ParamBonus.getMov(unit);
		
		//距離:遠い方が高スコア
		var distance = this._getDistance(unit, combination);
		
		//歩数:少ない方が高スコア
		var movePoint = combination.movePoint;
		
		//方向:処理内容による
		var direction = this._getDirectionByPosition(unit, combination);
		
		//補正の大きさは距離＞歩数＞方向
		//movePointの最大値がmovなので同量にしておけばマイナスにはならない
		var rev = 100;
		var score = mov*rev/2 + distance*rev - movePoint*rev/2 + direction;
		
		// scoreがマイナスになると行動しなくなるため避ける
		if (score < 0) {
			score = 0;
		}
		
		//他のスコアへの影響を減らす
		//スコアは比較にしか使われないので小数でも可
		score /= rev;
		
		//基本的には距離＝最大射程になるよう動くはずなのでそこだけログ抽出
		//if(distance === combination.rangeMetrics.endRange) {
		//	root.log('('+(mov*rev/2)+'+'+(distance*rev)+'-'+(movePoint*rev/2)+'+'+(direction)+')/'+rev+'='+score);
		//}
		
		return score;
	},
	
	_getDistance: function(unit, combination) {
		var index = combination.posIndex;
		var x = CurrentMap.getX(index);
		var y = CurrentMap.getY(index);
		var targetUnit = combination.targetUnit;
		
		//ターゲットと行動位置の距離
		var dx_tp = Math.abs(targetUnit.getMapX() - x);
		var dy_tp = Math.abs(targetUnit.getMapY() - y);
		var distance = dx_tp + dy_tp;
		
		return distance;
	},
	
	//位置ベース
	_getDirectionByPosition: function(unit, combination) {
		var mov = ParamBonus.getMov(unit);
		var movePoint = combination.movePoint;
		var index = combination.posIndex;
		var x = CurrentMap.getX(index);
		var y = CurrentMap.getY(index);
		var targetUnit = combination.targetUnit;
		
		//ターゲットとユニットの距離
		var dx_tu = Math.abs(targetUnit.getMapX() - unit.getMapX());
		var dy_tu = Math.abs(targetUnit.getMapY() - unit.getMapY());
		
		//ターゲットと行動位置の距離
		var dx_tp = Math.abs(targetUnit.getMapX() - x);
		var dy_tp = Math.abs(targetUnit.getMapY() - y);
		
		//ユニットと行動位置の距離
		var dx_up = Math.abs(unit.getMapX() - x);
		var dy_up = Math.abs(unit.getMapY() - y);
		
		var direction = 0;
		if(dx_tu > dy_tu) {
			//X軸寄り
			direction = dx_tp*2 + dy_tp;
		}
		else if(dx_tu < dy_tu) {
			//Y軸寄り
			direction = dx_tp + dy_tp*2;
		}
		else {
			//中間
			direction = this._getDirectDistance(movePoint, dx_up, dy_up);
		}
		return direction;
	},
	
	//直線距離が短い方が高スコア
	_getDirectDistance: function(movePoint, dx_up, dy_up) {
		var max = Math.pow(movePoint, 2);
		var d1 = Math.pow(dx_up, 2) + Math.pow(dy_up, 2);
		var score = max - d1;
		return score;
	}
});

})();
