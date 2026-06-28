# ResultsScene.gd - Sahne: ResultsScene
# Maç sonu altını gösterimi, reklam alanı, lobiye dön
extends Node

var match_results: Dictionary = {}
var ad_config: Dictionary = {}

func _ready():
	match_results = Net.selected_match_results
	_create_ui()
	await _load_ad_config()
	Audio.play_sfx("res://assets/audio/sfx_match_end.wav")

func _load_ad_config():
	var result = await Net.rpc_async("get_ad_config", {})
	if result.get("success"):
		ad_config = result.get("ad_config", {})

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.05, 0.12)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _is_local_player_winner() -> bool:
	var winner_team = match_results.get("winner_team", -1)
	for team_index in match_results.get("teams", {}):
		for player in match_results["teams"][team_index]:
			if player.get("user_id") == Net.current_user_id:
				return int(team_index) == winner_team
	return false
