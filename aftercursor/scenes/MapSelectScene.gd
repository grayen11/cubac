# MapSelectScene.gd - Sahne: MapSelectScene
# Harita seçimi - low poly 3D modellerin kaydırmalı seçimi
extends Node

var maps: Array = [
	{"id": "random", "name": "Random", "model_path": "res://assets/maps/map_random.tscn"},
	{"id": "map_arena_1", "name": "Battle Arena", "model_path": "res://assets/maps/map_arena_1.tscn"},
	{"id": "map_soccer_1", "name": "Soccer Field", "model_path": "res://assets/maps/map_soccer_1.tscn"},
]

var current_map_index: int = 0

func _ready():
	for i in range(maps.size()):
		if maps[i]["id"] == Net.selected_map_id:
			current_map_index = i
			break

	_create_ui()

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.05, 0.12)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _on_select_map():
	Net.selected_map_id = maps[current_map_index]["id"]
	UIUtil.show_toast("Map selected!")
	Audio.play_sfx("res://assets/audio/sfx_click.wav")
	await get_tree().create_timer(0.5).timeout
	get_tree().change_scene_to_file("res://scenes/LobbyScene.tscn")
