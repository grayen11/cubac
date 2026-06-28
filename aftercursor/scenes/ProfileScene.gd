# ProfileScene.gd - Sahne: ProfileScene
# Profil fotoğrafı/username değiştirme, logout
extends Node

var profile_data: Dictionary = {}

func _ready():
	_create_ui()
	await _load_profile()

func _load_profile():
	var economy_result = await Net.rpc_async("get_economy", {})
	if economy_result.get("success"):
		Net.current_gold = economy_result["economy"]["gold"]

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.08, 0.08, 0.15)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _change_username(new_username: String):
	var result = await Net.rpc_async("update_username", {"username": new_username})
	if result.get("success"):
		Net.current_username = new_username
		UIUtil.show_toast("Username changed!")

func _on_logout():
	Net.logout()
	get_tree().change_scene_to_file("res://scenes/SignUpScene.tscn")
