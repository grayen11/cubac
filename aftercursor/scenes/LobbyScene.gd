# LobbyScene.gd - Sahne: LobbyScene
# Ana lobi sahnesi - karakter karuseli, PLAY/UNLOCK, harita seçimi, profil, klan, settings
extends Node

var all_characters: Array = []
var current_char_index: int = 0
var current_character_data: Dictionary = {}

func _ready():
	_load_user_data()
	_create_ui()
	await _load_characters()

# UI oluşturma, karakter yükleme vb.
func _load_user_data():
	var economy_result = await Net.rpc_async("get_economy", {})
	if economy_result.get("success"):
		Net.current_gold = economy_result["economy"]["gold"]

func _load_characters():
	var result = await Net.rpc_async("get_all_characters_base_stats", {})
	if result.get("success"):
		all_characters = result["characters"]

func _create_ui():
	# Arkaplan
	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.1, 0.4)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _on_action_button_pressed():
	Audio.play_sfx("res://assets/audio/sfx_click.wav")
	if current_character_data.get("owned", false):
		get_tree().change_scene_to_file("res://scenes/BattleLoadingScene.tscn")
