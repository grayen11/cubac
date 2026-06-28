# SettingsScene.gd - Sahne: SettingsScene
# Ses/müzik/titreşim ayarları, dil seçimi, hesap silme talebi
extends Node

func _ready():
	_create_ui()

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.08, 0.08, 0.15)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _request_deletion():
	var result = await Net.rpc_async("request_account_deletion", {})
	if result.get("success"):
		UIUtil.show_toast("Deletion requested")
		await get_tree().create_timer(1.5).timeout
		Net.logout()
		get_tree().change_scene_to_file("res://scenes/SignUpScene.tscn")
