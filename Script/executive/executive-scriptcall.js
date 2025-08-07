
// ゲームの初期化段階で一度だけ呼ばれる。
// この関数のみ、rootを参照できない。
function ScriptCall_Initialize(startupInfo)
{
}
	
// ゲームウインドウが表示される直前で一度だけ呼ばれる
function ScriptCall_Setup()
{
	SetupControl.setup();
}

// スクリプトエラー時に環境データが更新される直前に呼ばれる
function ScriptCall_Backup()
{
	SetupControl.backup();
}

// スクリプトエラー後にリトライする際に呼ばれる。
// setSceneDataより先に呼ばれる。
function ScriptCall_Retry(customObject)
{
	RetryControl.start(customObject);
}

// ゲームのリセット時に呼ばれる
function ScriptCall_Reset()
{
	MessageViewControl.reset();
	ConfigVolumeControl.setDefaultVolume();
	
	// 以前のエフェクトが残らないように初期化
	MapLayer.setEffectMotion(null);
	
	MapLayer.resetMapLayer();
	
	// 古いオブジェクトがFreeAreaScene.getPreAttackObjectで取得できてしまうのを防ぐ
	AttackControl.setPreAttackObject(null);
	
	// ゲームのリセットで、game.exe内のデータ(ユニットや武器)のアドレスが変更されるため、古いオブジェクトはクリアする
	BattlerChecker.setUnit(null, null);
}

// セーブファイルがロードされ、ユニットやマップがデータとして構築された後に呼ばれる
function ScriptCall_Load(customObject)
{
	LoadControl.start(customObject);

	// 制御を返すとScriptCall_Enterが呼ばれる
}

// 新しいシーン、またはイベントコマンドを開始する際に呼ばれる
function ScriptCall_Enter(sceneType, commandType)
{
	var result;
	
	if (sceneType === SceneType.EVENT) {
		result = EventCommandManager.enterEventCommandManagerCycle(commandType);
	}
	else {
		result = SceneManager.enterSceneManagerCycle(sceneType);
	}
	
	return result;
}

// MoveScriptを始めとするmoveという文字列から始まるメソッドでは、データの更新処理を行う。
// たとえば、ユニットの位置を変更する場合は、x座標とy座標を表すメンバの値を変更する必要があるが、
// そうした変数の更新処理を行う。
// また、ユーザー入力の検出処理も行う。
// 描画処理は一切行わないようにし、描画はdraw系メソッドに任せるようにする。
// move系メソッドでは、必ず戻り値を返さなければならない。
// 通常はデータの更新処理が完了した場合にMoveResult.ENDを返し、
// 更新がまだ完了していない場合にMoveResult.CONTINUEを返す。
// ただし、独自の戻り値を返しても問題はない。
function ScriptCall_Move(sceneType, commandType)
{
	var result;
	
	if (sceneType === SceneType.EVENT) {
		if (commandType === root.getEventCommandType()) {
			result = EventCommandManager.moveEventCommandManagerCycle(commandType);
		}
		else {
			result = EventCommandManager.backEventCommandManagerCycle(commandType);
		}
	}
	else {
		if (sceneType === root.getCurrentScene() || SceneManager.isForceForeground()) {
			result = SceneManager.moveSceneManagerCycle();
		}
		else {
			result = SceneManager.backSceneManagerCycle();
		}
	}
	
	MouseControl.moveAutoMouse();

	return result;
}

// DrawScriptを始めとするdrawという文字列から始まるメソッドでは、データの描画処理を行う。
// move系メソッドで更新した変数にしたがって描画を行うのがdraw系メソッドであるため、
// draw系メソッドで何らかの変数の値を変更してはならない。
// draw系メソッドが描画のみを行う性質から、draw系メソッドで何も処理も行わなくても、
// 画面に何も描画が行われないだけで、ゲーム自体は進むことになる。
// この性質から、ゲームの進行に問題がある場合はmove系メソッドを確認し、
// 描画に問題がある場合はdraw系メソッドを確認すればよいことになる。
// draw系メソッドでは戻り値を返す必要はない。
function ScriptCall_Draw(sceneType, layerNumber, commandType)
{
	if (layerNumber === 0) {
		if (sceneType !== SceneType.REST) {
			MapLayer.drawMapLayer();
		}
	}
	else if (layerNumber === 1) {
		SceneManager.drawSceneManagerCycle();
		root.drawAsyncEventData();
	}
	else {
		EventCommandManager.drawEventCommandManagerCycle(commandType);
	}
}

// イベントコマンドがユーザー入力を確認する際に呼ばれる。
// たとえば、イベントコマンドの「ウェイト」が0の場合は、InputControl.isSelectActionがtrueを返すまで待機する。
function ScriptCall_CheckInput(reason)
{
	var result = false;
	
	if (reason === 0) {
		result = InputControl.isSelectAction();
	}
	else if (reason === 1) {
		result = InputControl.isSystemState();
	}
	else if (reason === 2) {
		result = InputControl.isStartAction();
	}
	
	return result;
}

// マウスでユニットを移動させたり、マウスでユニットを撃破した際に呼ばれる
function ScriptCall_DebugAction()
{
	SceneManager.getActiveScene().notifyAutoEventCheck();
}

// マウス操作ができる状態かを確認する際に呼ばれる
function ScriptCall_CheckDebugAction()
{
	return SceneManager.getActiveScene().isDebugMouseActionAllowed();
}

// メッセージ消去が必要になった際に呼ばれる
function ScriptCall_EraseMessage(value)
{
	EventCommandManager.eraseMessage(value);
}

// イベントでユニットが登場する際に呼ばれる
function ScriptCall_AppearEventUnit(unit)
{
	UnitProvider.setupFirstUnit(unit);
	SkillChecker.addAllNewSkill(unit);
}

// クラスの「条件表示」のキーワードが満たされる場合に呼ばれる
function ScriptCall_NewCustomRenderer(unit)
{
	CustomCharChipGroup.createCustomRenderer(unit);
}

// イベント条件で武器を参照する際に呼ばれる
function ScriptCall_GetWeapon(unit)
{
	return ItemControl.getEquippedWeapon(unit);
}

function ScriptCall_isItemReused(checkerArray, item)
{
	return ItemIdentityChecker.isItemReused(checkerArray, item);
}

// イベント条件でアイテムを使用できるか確認する際に呼ばれる
function ScriptCall_CheckItem(unit, item)
{
	return ItemControl.isItemUsable(unit, item);
}

// マーキング時に呼ばれる
function ScriptCall_GetUnitAttackRange(unit)
{
	var rangePanel = createObject(UnitRangePanel);
	
	return rangePanel.getUnitAttackRange(unit);
}

// Simulation関数(startSimulation、startSimulationWeapon、startSimulationWeaponPlus)で呼ばれる。
// 内部で具体的な探索が行われる前に、どの軍を壁にすべきかをこの関数で習得する。
// ただし、disableMapUnitが事前に呼ばれている場合は呼ばれない。
// Simulation関数から制御を返った時点でUnitFilterFlag.OPTIONALはクリアされる。
function ScriptCall_GetSimulationFilterFlag(unit) {
	var filter;
	
	if (SimulationBlockerControl.isCustomFilterApplicable(unit)) {
		filter = SimulationBlockerControl.getCustomFilter(unit);
	}
	else {
		filter = SimulationBlockerControl.getDefaultFilter(unit);
	}
	
	return filter;
}

// ScriptCall_GetSimulationFilterFlagの後に呼ばれる
function ScriptCall_GetMoveCostArray(unit)
{
	var costObjectArray = SimulationCostControl.initCostObjectArray(unit);
	
	// 以下のようにしてもよいが、上限なしにコストが重複される
	// return costObjectArray;
	
	// 同じキーワードでのコストは結合し、上限を超えていないか確認する
	var combinedCostObjectArray = SimulationCostControl.combineCostObjectArray(unit, costObjectArray);
	
	return combinedCostObjectArray;
}

// イベントによるユニットの移動時に呼ばれる
function ScriptCall_GetUnitMoveCource(unit, xGoal, yGoal, isTerrainDisabled)
{
	var goalIndex = CurrentMap.getIndex(xGoal, yGoal);
	var simulator = root.getCurrentSession().createMapSimulator();
	
	simulator.disableMapUnit();
	if (isTerrainDisabled) {
		simulator.disableTerrain();
		simulator.disableRestrictedPass();
		simulator.disableMove();
	}
	simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
	
	return CourceBuilder.createLongCource(unit, goalIndex, simulator);
}

// イベントコマンドの「イベントのスキップ」で「ターンを終了させる」を選択した場合に呼ばれる
function ScriptCall_TurnEnd()
{
	TurnControl.turnEnd();
}

// イベントコマンドの「イベントのスキップ」で「ターンスキップを止める」を選択した場合に呼ばれる
function ScriptCall_DisableTurnSkip()
{
	CurrentMap.setTurnSkipMode(false);
	CurrentMap.enableEnemyAcceleration(false);
}

// イベントコマンドの「ユニットの移動」や「移動オブジェクトの表示」などで呼ばれる。
// 移動を加速するべきかなどを確認する。
function ScriptCall_CheckGameAcceleration()
{
	return Miscellaneous.isGameAcceleration();
}

function ScriptCall_GetFriendDirectoryName()
{
	return 'Friend';
}
