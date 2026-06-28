# ClanScene.gd - Sahne: ClanScene
# Klan oluşturma/katılma/üye listesi/klan savaşı
extends Node

var my_clans: Array = []
var search_results: Array = []

func _ready():
	_create_ui()
	_load_my_clans()

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.08, 0.08, 0.15)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

func _load_my_clans():
	var result = await Net.rpc_async("clan_list", {})
	if result.get("success"):
		my_clans = result["clans"]

func _create_clan(name: String, description: String):
	var result = await Net.rpc_async("clan_create", {"name": name, "description": description})
	if result.get("success"):
		UIUtil.show_toast("Clan created!")
		_load_my_clans()
