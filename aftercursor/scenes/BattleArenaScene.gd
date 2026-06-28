# BattleArenaScene.gd - Sahne: BattleArenaScene
# İzometrik savaş alanları - hareket/ateş/ulti kontrolleri
extends Node

var match_id: String = ""
var local_player_id: String = ""
var match_state: Dictionary = {}
var players: Dictionary = {}
var items: Dictionary = {}
var is_initialized: bool = false
var time_remaining: int = 180

func _ready():
	local_player_id = Net.current_user_id
	match_id = Net.reconnect_match_id
	_create_ui()
	await _connect_to_match()
	add_to_group("battle_arena")

func _create_ui():
	var viewport_container = SubViewportContainer.new()
	viewport_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(viewport_container)

func _connect_to_match():
	if match_id.is_empty():
		print("No match id available")
		return

	if not Net.socket or not Net.is_connected:
		print("Socket not connected")
		return

	Net.socket.received_match_state.connect(_on_match_state)
	Net.socket.received_match_presence.connect(_on_match_presence)

	var join_result = await Net.socket.join_match_async(match_id)
	if join_result.is_exception():
		print("Failed to join match: ", join_result.get_exception().message)
		return

	print("Joined match: ", match_id)
	is_initialized = true

func _on_match_state(state: NakamaRTAPI.MatchData):
	var data = JSON.parse_string(state.data.get_string_from_utf8())
	if data == null:
		return

	match data.get("type", ""):
		"match_ended", "match_terminated":
			Net.selected_match_results = data.get("results", {})
			get_tree().change_scene_to_file("res://scenes/ResultsScene.tscn")
		"state_update":
			_update_from_state(data)

func _on_match_presence(_event: NakamaRTAPI.MatchPresenceEvent):
	pass

func _update_from_state(data: Dictionary):
	if data.has("players"):
		for player in data["players"]:
			players[player.get("user_id", "")] = player
	if data.has("scores"):
		match_state["scores"] = data["scores"]

func _process(_delta: float):
	if not is_initialized:
		return

func _exit_tree():
	if Net.socket:
		if Net.socket.received_match_state.is_connected(_on_match_state):
			Net.socket.received_match_state.disconnect(_on_match_state)
		if Net.socket.received_match_presence.is_connected(_on_match_presence):
			Net.socket.received_match_presence.disconnect(_on_match_presence)
