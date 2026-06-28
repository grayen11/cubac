# BattleLoadingScene.gd - Sahne: BattleLoadingScene
# Savaş yükleniyor - rastgele görsel + Loading yazısı + eşleşme
extends Node

var match_found: bool = false
var match_data: Dictionary = {}

func _ready():
	_create_ui()
	Net.matchmaker_matched.connect(_on_matchmaker_matched)
	_request_match()
	add_to_group("battle_loading")

func _exit_tree():
	if Net.matchmaker_matched.is_connected(_on_matchmaker_matched):
		Net.matchmaker_matched.disconnect(_on_matchmaker_matched)

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.1, 0.4)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _request_match():
	Audio.play_sfx("res://assets/audio/sfx_searching.wav")

	var config = await Net.rpc_async("request_match", {
		"character_id": Net.selected_character_id,
		"map_id": Net.selected_map_id,
	})
	if not config.get("success", false):
		UIUtil.show_toast("Matchmaking failed")
		await get_tree().create_timer(2).timeout
		get_tree().change_scene_to_file("res://scenes/LobbyScene.tscn")
		return

	var result = await Net.start_matchmaking(
		config.get("min_count", 2),
		config.get("max_count", 4),
		config.get("query", "*"),
		config.get("string_properties", {}),
		config.get("numeric_properties", {}),
	)
	if not result.get("success", false):
		UIUtil.show_toast(result.get("error", "Matchmaking failed"))
		await get_tree().create_timer(2).timeout
		get_tree().change_scene_to_file("res://scenes/LobbyScene.tscn")

func _on_matchmaker_matched(matched: NakamaRTAPI.MatchmakerMatched):
	on_match_found(matched)

func on_match_found(matched_data: NakamaRTAPI.MatchmakerMatched):
	if match_found:
		return
	match_found = true
	match_data = {"match_id": matched_data.match_id, "token": matched_data.token}
	Audio.play_sfx("res://assets/audio/sfx_match_found.wav")
	Net.reconnect_match_id = matched_data.match_id
	get_tree().change_scene_to_file("res://scenes/BattleArenaScene.tscn")

func _cancel_match():
	Audio.play_sfx("res://assets/audio/sfx_click.wav")
	await Net.cancel_matchmaking()
	get_tree().change_scene_to_file("res://scenes/LobbyScene.tscn")
