# Net.gd - Autoload Singleton
# Nakama client bağlantısı, socket yönetimi, RPC çağrı sarmalayıcıları
extends Node

const NAKAMA_HOST = "127.0.0.1"
const NAKAMA_PORT = 7350
const SERVER_KEY = "defaultkey"
const SSL_ENABLED = false

var client: NakamaClient
var session: NakamaSession
var socket: NakamaSocket

var current_user_id: String = ""
var current_username: String = ""
var selected_character_id: String = "char_warrior"
var selected_map_id: String = "random"
var current_gold: int = 0
var is_connected: bool = false
var reconnect_match_id: String = ""
var selected_match_results: Dictionary = {}
var matchmaker_ticket: String = ""

signal matchmaker_matched(matched: NakamaRTAPI.MatchmakerMatched)

func _ready():
	_setup_nakama()
	_load_saved_session()

func _setup_nakama():
	client = Nakama.create_client(NAKAMA_HOST, NAKAMA_PORT, SERVER_KEY, SSL_ENABLED)

func _load_saved_session():
	var saved_token = _read_local_data("auth_token")
	if saved_token.is_empty():
		return

	session = NakamaClient.restore_session(saved_token)
	if session.expired:
		_write_local_data("auth_token", "")
		session = null
		return

	current_user_id = _read_local_data("user_id")
	current_username = _read_local_data("username")
	await _connect_socket()

func _connect_socket() -> bool:
	if not session or session.expired:
		is_connected = false
		return false

	if socket and socket.is_connected_to_host():
		return true

	socket = Nakama.create_socket_from(client)
	socket.connected.connect(_on_socket_connected)
	socket.closed.connect(_on_socket_closed)
	socket.received_matchmaker_matched.connect(_on_matchmaker_matched)

	var err = await socket.connect_async(session)
	if err.is_exception():
		print("Socket connect error: ", err.get_exception().message)
		is_connected = false
		return false

	is_connected = true
	print("Socket connected")
	return true

func _on_socket_connected():
	is_connected = true
	print("WebSocket connected")

func _on_socket_closed():
	is_connected = false
	print("WebSocket closed")

func _on_matchmaker_matched(matched: NakamaRTAPI.MatchmakerMatched):
	matchmaker_matched.emit(matched)

func rpc_async(func_name: String, payload: Dictionary = {}) -> Dictionary:
	if not session or session.expired:
		return {"success": false, "error": "Not authenticated"}

	var json_payload = JSON.stringify(payload)
	var result = await client.rpc_async(session, func_name, json_payload)
	if result.is_exception():
		print("RPC Error (%s): %s" % [func_name, result.get_exception().message])
		return {"success": false, "error": result.get_exception().message}

	if result.payload.is_empty():
		return {"success": false}

	var parsed = JSON.parse_string(result.payload)
	if parsed == null:
		return {"success": false, "error": "Invalid JSON response"}
	return parsed

func authenticate_email(email: String, password: String, create: bool = false) -> Dictionary:
	var result = await client.authenticate_email_async(email, password, "", create)

	if result.is_exception():
		return {"success": false, "error": result.get_exception().message}

	session = result
	_save_session()
	var connected = await _connect_socket()
	if not connected:
		return {"success": false, "error": "Failed to connect socket"}

	return {"success": true}

func _save_session():
	if session:
		_write_local_data("auth_token", session.token)
		_write_local_data("user_id", session.user_id)
		_write_local_data("username", session.username)
		current_user_id = session.user_id
		current_username = session.username

func _read_local_data(key: String, default: String = "") -> String:
	var config = ConfigFile.new()
	var err = config.load("user://clans_online.cfg")
	if err == OK:
		return str(config.get_value("session", key, default))
	return default

func _write_local_data(key: String, value: String):
	var config = ConfigFile.new()
	config.load("user://clans_online.cfg")
	config.set_value("session", key, value)
	config.save("user://clans_online.cfg")

func has_valid_session() -> bool:
	return session != null and not session.expired

func start_matchmaking(min_count: int = 2, max_count: int = 4, query: String = "*", string_props: Dictionary = {}, numeric_props: Dictionary = {}) -> Dictionary:
	if not socket or not is_connected:
		return {"success": false, "error": "Socket not connected"}

	var result = await socket.add_matchmaker_async(query, min_count, max_count, string_props, numeric_props)
	if result.is_exception():
		return {"success": false, "error": result.get_exception().message}

	matchmaker_ticket = result.ticket
	return {"success": true, "ticket": matchmaker_ticket}

func cancel_matchmaking() -> Dictionary:
	if matchmaker_ticket.is_empty() or not socket:
		return {"success": true}

	var result = await socket.remove_matchmaker_async(matchmaker_ticket)
	matchmaker_ticket = ""
	if result.is_exception():
		return {"success": false, "error": result.get_exception().message}
	return {"success": true}

func logout():
	_write_local_data("auth_token", "")
	current_user_id = ""
	current_username = ""
	session = null
	reconnect_match_id = ""
	matchmaker_ticket = ""
	if socket:
		socket.close()
	is_connected = false
