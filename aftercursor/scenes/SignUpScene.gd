# SignUpScene.gd - Sahne: SignUpScene
# Apple/Google/Email ile giriş-kayıt UI
extends Node

func _ready():
	_create_ui()

func _create_ui():
	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.1, 0.4)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var email_btn = Button.new()
	email_btn.text = "Email Sign In"
	email_btn.position = Vector2(UIUtil.rw(30), UIUtil.rh(40))
	email_btn.size = Vector2(UIUtil.rw(40), UIUtil.rh(6))
	email_btn.pressed.connect(_on_email_sign_in)
	add_child(email_btn)

func _on_email_sign_in():
	_show_email_dialog()

func _show_email_dialog():
	var dialog = AcceptDialog.new()
	dialog.title = "Email Sign In"
	dialog.dialog_text = "Enter email and password"
	dialog.min_size = Vector2(UIUtil.rw(50), UIUtil.rh(35))
	get_tree().root.add_child(dialog)

	var vbox = VBoxContainer.new()
	dialog.add_child(vbox)

	var email_input = LineEdit.new()
	email_input.placeholder_text = "Email"
	vbox.add_child(email_input)

	var password_input = LineEdit.new()
	password_input.placeholder_text = "Password"
	password_input.secret = true
	vbox.add_child(password_input)

	var create_check = CheckBox.new()
	create_check.text = "Create new account"
	vbox.add_child(create_check)

	dialog.confirmed.connect(func():
		_submit_email_auth(email_input.text, password_input.text, create_check.button_pressed)
		dialog.queue_free()
	)
	dialog.canceled.connect(func(): dialog.queue_free())
	dialog.popup_centered()

func _submit_email_auth(email: String, password: String, create: bool):
	if email.is_empty() or password.is_empty():
		UIUtil.show_toast("Email and password required")
		return

	var result = await Net.authenticate_email(email, password, create)
	if result.get("success"):
		_navigate_to_lobby()
	else:
		UIUtil.show_toast(result.get("error", "Authentication failed"))

func _navigate_to_lobby():
	get_tree().change_scene_to_file("res://scenes/LobbyScene.tscn")
