# Locale.gd - Autoload Singleton
# 50 dil çeviri yükleme, dil değiştirme
extends Node

const LANGUAGES = {
	"en": {"name": "English", "rtl": false},
	"es": {"name": "Español", "rtl": false},
	"fr": {"name": "Français", "rtl": false},
	"de": {"name": "Deutsch", "rtl": false},
	"tr": {"name": "Türkçe", "rtl": false},
	"ar": {"name": "العربية", "rtl": true},
	"zh": {"name": "中文", "rtl": false},
	"ja": {"name": "日本語", "rtl": false},
	"ko": {"name": "한국어", "rtl": false},
	"ru": {"name": "Русский", "rtl": false},
}

var current_language: String = "en"
var translations: Dictionary = {}
var is_rtl: bool = false

func _ready():
	load_language(current_language)

func load_language(lang_code: String):
	if not LANGUAGES.has(lang_code):
		lang_code = "en"
	
	var file_path = "res://locales/%s.json" % lang_code
	if ResourceLoader.exists(file_path):
		var file = FileAccess.open(file_path, FileAccess.READ)
		if file:
			var json_string = file.get_as_text()
			file.close()
			var json = JSON.new()
			var error = json.parse(json_string)
			if error == OK:
				translations = json.data
	
	current_language = lang_code
	is_rtl = LANGUAGES[lang_code]["rtl"]

func tr(key: String, default_text: String = "") -> String:
	if translations.has(key):
		return translations[key]
	return default_text if default_text != "" else key

func set_language(lang_code: String):
	load_language(lang_code)
	_save_language_preference(lang_code)

func _save_language_preference(lang_code: String):
	var config = ConfigFile.new()
	config.load("user://settings.cfg")
	config.set_value("settings", "language", lang_code)
	config.save("user://settings.cfg")

func get_available_languages() -> Array:
	var langs = []
	for code in LANGUAGES:
		langs.append({"code": code, "name": LANGUAGES[code]["name"]})
	return langs
