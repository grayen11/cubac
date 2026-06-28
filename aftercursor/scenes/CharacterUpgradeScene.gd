# CharacterUpgradeScene.gd - Sahne: CharacterUpgradeScene
# Karakter 3D modeli + stat yükseltme arayüzü
extends Node

var character_data: Dictionary = {}

func _ready():
	_create_ui()
	await _load_character_data()

func _load_character_data():
	var result = await Net.rpc_async("get_character_stats", {"character_id": Net.selected_character_id})
	if result.get("success"):
		character_data = result

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.1, 0.4)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _upgrade_stat(stat_id: String):
	var result = await Net.rpc_async("upgrade_character_stat", {"character_id": Net.selected_character_id, "stat": stat_id})
	if result.get("success"):
		Net.current_gold = result.get("remaining_gold", Net.current_gold)
		Audio.play_sfx("res://assets/audio/sfx_upgrade.wav")
