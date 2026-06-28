# Audio.gd - Autoload Singleton
# Müzik/ses efekti/titreşim çalma ve seviye kontrolü
extends Node

var music_bus_index: int
var sfx_bus_index: int
var music_volume: float = 1.0
var sfx_volume: float = 1.0
var vibration_enabled: bool = true

var music_cache: Dictionary = {}
var sfx_cache: Dictionary = {}

func _ready():
	music_bus_index = AudioServer.get_bus_index("Music")
	sfx_bus_index = AudioServer.get_bus_index("SFX")
	_load_settings()
	_apply_volumes()

func _load_settings():
	var config = ConfigFile.new()
	if config.load("user://settings.cfg") == OK:
		music_volume = config.get_value("audio", "music_volume", 1.0)
		sfx_volume = config.get_value("audio", "sfx_volume", 1.0)
		vibration_enabled = config.get_value("audio", "vibration_enabled", true)

func _save_settings():
	var config = ConfigFile.new()
	config.load("user://settings.cfg")
	config.set_value("audio", "music_volume", music_volume)
	config.set_value("audio", "sfx_volume", sfx_volume)
	config.set_value("audio", "vibration_enabled", vibration_enabled)
	config.save("user://settings.cfg")

func _apply_volumes():
	AudioServer.set_bus_volume_db(music_bus_index, linear2db(music_volume))
	AudioServer.set_bus_volume_db(sfx_bus_index, linear2db(sfx_volume))

func play_music(path: String, loop: bool = true):
	if music_cache.has(path):
		var player = music_cache[path]
		if player.playing:
			return
		player.play()
		return
	
	var stream = load(path)
	if stream:
		var player = AudioStreamPlayer.new()
		player.stream = stream
		player.bus = "Music"
		if loop:
			player.finished.connect(func(): player.play())
		add_child(player)
		player.play()
		music_cache[path] = player

func stop_music(path: String = ""):
	if path == "":
		for p in music_cache.values():
			p.stop()
	else:
		if music_cache.has(path):
			music_cache[path].stop()

func play_sfx(path: String, volume_db: float = 0):
	var stream = load(path)
	if stream:
		var player = AudioStreamPlayer.new()
		player.stream = stream
		player.bus = "SFX"
		player.volume_db = volume_db
		add_child(player)
		player.play()
		player.finished.connect(player.queue_free)

func set_music_volume(value: float):
	music_volume = clamp(value, 0.0, 1.0)
	_apply_volumes()
	_save_settings()

func set_sfx_volume(value: float):
	sfx_volume = clamp(value, 0.0, 1.0)
	_apply_volumes()
	_save_settings()

func set_vibration(enabled: bool):
	vibration_enabled = enabled
	_save_settings()

func vibrate(duration_ms: int = 50):
	if vibration_enabled:
		Input.vibrate_handheld(duration_ms)
