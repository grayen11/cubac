# LoadingScene.gd - Sahne: LoadingScene
# Açılış yükleme ekranı
extends Node

func _ready():
	_create_ui()
	await _check_session_and_navigate()

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.1, 0.4)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _check_session_and_navigate():
	await get_tree().create_timer(0.5).timeout
	if Net.has_valid_session():
		get_tree().change_scene_to_file("res://scenes/LobbyScene.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/SignUpScene.tscn")
