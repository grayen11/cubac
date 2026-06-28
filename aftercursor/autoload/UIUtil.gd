# UIUtil.gd - Autoload Singleton
# Safe-area hesaplama, responsive boyutlandırma
extends Node

var safe_area_top: float = 0
var safe_area_bottom: float = 0
var safe_area_left: float = 0
var safe_area_right: float = 0
var screen_width: float = 1080
var screen_height: float = 1920
var design_width: float = 1920
var design_height: float = 1080
var scale_factor: float = 1.0

func _ready():
	_update_screen_info()
	get_tree().root.size_changed.connect(_update_screen_info)

func _update_screen_info():
	screen_width = get_viewport().get_visible_rect().size.x
	screen_height = get_viewport().get_visible_rect().size.y
	
	var os_name = OS.get_name()
	if os_name == "Android" or os_name == "iOS":
		var safe_area = DisplayServer.get_display_safe_area()
		safe_area_top = safe_area.position.y
		safe_area_left = safe_area.position.x
		safe_area_bottom = screen_height - (safe_area.position.y + safe_area.size.y)
		safe_area_right = screen_width - (safe_area.position.x + safe_area.size.x)
	
	scale_factor = screen_width / design_width

func rw(percent: float) -> float:
	return screen_width * (percent / 100.0)

func rh(percent: float) -> float:
	return screen_height * (percent / 100.0)

func dp(pixel: float) -> float:
	return pixel * scale_factor

func safe_offset_x() -> float:
	return safe_area_left

func safe_offset_y() -> float:
	return safe_area_top

func show_toast(message: String, duration: float = 2.0):
	var toast = Label.new()
	toast.text = message
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast.add_theme_font_size_override("font_size", dp(18))
	toast.add_theme_color_override("font_color", Color.WHITE)
	
	var bg = ColorRect.new()
	bg.color = Color(0, 0, 0, 0.8)
	bg.size = Vector2(toast.get_minimum_size().x + dp(30), dp(40))
	toast.size = bg.size
	
	bg.position = Vector2(screen_width / 2 - bg.size.x / 2, screen_height - safe_area_bottom - dp(100))
	toast.position = bg.position
	
	get_tree().root.add_child(bg)
	bg.add_child(toast)
	toast.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	await get_tree().create_timer(duration).timeout
	if is_instance_valid(bg): bg.queue_free()
	if is_instance_valid(toast): toast.queue_free()
