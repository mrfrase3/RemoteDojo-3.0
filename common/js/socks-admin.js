var socket = io.connect('/main');

$(".submit-admin").click(function(){
	var user = $(".admin-select").find(":selected").val();
	var username = $(".admin-username").val();
	var email = $(".admin-email").val();
	var fullname = $(".admin-fullname").val();
	var password = $(".admin-password").val();
	socket.emit("admin.adminEdit",{user: user, username: username, email: email, fullname: fullname, password: password, dojos: ""});
	$(".admin-input").val("");
});

$(".submit-champion").click(function(){
	var user = $(".champion-select").find(":selected").val();
	var username = $(".champion-username").val();
	var email = $(".champion-email").val();
	var fullname = $(".champion-fullname").val();
	var password = $(".champion-password").val();
	socket.emit("admin.championEdit",{user: user, username: username, email: email, fullname: fullname, password: password, dojos: ""});
	$(".champion-input").val("");
});

$(".submit-mentor").click(function(){
	var user = $(".mentor-select").find(":selected").val();
	var username = $(".mentor-username").val();
	var email = $(".mentor-email").val();
	var fullname = $(".mentor-fullname").val();
	var password = $(".mentor-password").val();
	var dojos = $(".mentor-dojos").val();
	socket.emit("admin.mentorEdit",{user: user, username: username, email: email, fullname: fullname, password: password, dojos: dojos});
	$(".mentor-input").val("");
});

$(".submit-dojo").click(function(){
	var user = $(".dojo-select").find(":selected").val();
	var dojoname = $(".dojo-dojoname").val();
	var name = $(".dojo-name").val();
	var email = $(".dojo-email").val();
	var location = $(".dojo-location").val();
	var password = $(".dojo-password").val();
	socket.emit("admin.dojoEdit",{user: user, dojoname: dojoname, name: name, email: email, location: location, password: password});
	$(".dojo-input").val("");
});

$(".remove").click(function(){
	var type = $(this).data("id");
	var uid = $("select[data-id=" + type + "]").val();
	if (window.confirm("Are you sure you want to delete the user/dojo " + uid + "?")){
		socket.emit("admin.deleteUser", {type: type, uid: uid});
	}
});

var loadAdmin = function() {
	var o = $(".admin-select").find(":selected");
	$(".admin-input").val("");
	$(".admin-username").prop("disabled", o.val() !== "");
	$(".admin-username").attr("placeholder", o.val());
	$(".admin-email").attr("placeholder", o.data("email"));
	$(".admin-fullname").attr("placeholder", o.data("fullname"));
	var isSelf = o.hasClass("self");
	$(".remove[data-id=\"admin\"]").prop("disabled", isSelf);
}

var loadChampion = function() {
	var o = $(".champion-select").find(":selected");
	$(".champion-input").val("");
	$(".champion-username").prop("disabled", o.val() !== "");
	$(".champion-username").attr("placeholder", o.val());
	$(".champion-email").attr("placeholder", o.data("email"));
	$(".champion-fullname").attr("placeholder", o.data("fullname"));
}

var loadMentor = function() {
	var o = $(".mentor-select").find(":selected");
	$(".mentor-input").val("");
	$(".mentor-username").prop("disabled", o.val() !== "");
	$(".mentor-username").attr("placeholder", o.val());
	$(".mentor-email").attr("placeholder", o.data("email"));
	$(".mentor-fullname").attr("placeholder", o.data("fullname"));
	var dojos = [o.data("dojos")];
	if (o.data("all-dojos")) dojos = dojos.concat("all");
	$(".mentor-dojos").val(dojos);
}

var loadDojo = function() {
	var o = $(".dojo-select").find(":selected");
	$(".dojo-input").val("");
	$(".dojo-dojoname").prop("disabled", o.val() !== "");
	$(".dojo-dojoname").attr("placeholder", o.val());
	$(".dojo-name").attr("placeholder", o.data("name"));
	$(".dojo-email").attr("placeholder", o.data("email"));
	$(".dojo-location").attr("placeholder", o.data("location"));
}

var loadAll = function() {
	loadAdmin();
	loadChampion();
	loadMentor();
	loadDojo();
}

$(".admin-select").change(loadAdmin);
$(".champion-select").change(loadChampion);
$(".mentor-select").change(loadMentor);
$(".dojo-select").change(loadDojo);

socket.on("admin.fullDatabase", function(data){
	console.log("db update from server");
	$("input").val("");
	$("input").attr("placeholder", "");
	$("input[type=password]").attr("placeholder", "********");
	$(".db-option").remove();
	$("option.self").attr({"value": data.user.username})
		.text(data.user.fullname)
		.data("fullname", data.user.fullname)
		.data("email", data.user.email);
	$(".info-fullname").text(data.user.fullname);
	for (var i = 0; i < data.admins.length; ++i) {
		var u = data.admins[i];
		$(".admin-select").append($("<option>",{
			"value": u.username,
			"data-fullname": u.fullname,
			"text": u.fullname,
			"data-email": u.email
		}).addClass("db-option"));
	}
	for (var i = 0; i < data.champions.length; ++i) {
		var u = data.champions[i];
		$(".champion-select").append($("<option>",{
			"value": u.username,
			"data-fullname": u.fullname,
			"text": u.fullname,
			"data-email": u.email
		}).addClass("db-option"));
	}
	for (var i = 0; i < data.mentors.length; ++i) {
		var u = data.mentors[i];
		$(".mentor-select").append($("<option>",{
			"value": u.username,
			"data-fullname": u.fullname,
			"text": u.fullname,
			"data-email": u.email,
			"data-dojos": u.dojos,
			"data-all-dojos": u.allDojos
		}).addClass("db-option"));
	}
	for (var i = 0; i < data.dojos.length; ++i) {
		var d = data.dojos[i];
		$(".dojo-select").append($("<option>",{
			"value": d.dojoname,
			"data-name": d.name,
			"text": d.name,
			"data-email": d.email,
			"data-location": d.location
		}).addClass("db-option"));
		$(".mentor-dojos").append($("<option>", {
			"value": d.dojoname,
			"text": d.name
		}).addClass("db-option"));
	}
	loadAll();
});

//Helper Function to authenticate the connection
// socket and callback are passed, callback is called if the socket is authenticated
var authSock = function(sock, cb){
	sock.on('sockauth.request', function(){ //when the server requests authentication
		$.get('/sockauth'+window.location.search, function(res){ //get the user session token to prove identity
			if(res.err){
				sock.close();
				alert('Authentication with server failed, please log back in.');
				console.log('Failed to authorise socket connection: ' + res.err);
			} else sock.emit('sockauth.validate', res); //send the token to the server
		});
	});

	sock.on('sockauth.dupeConflict', function(){ //server says the token is valid
		socket.emit('sockauth.dupeResolution', confirm("You currently have another active session in another window/tab.\nForce the other to disconnect?"));
	});

	sock.on('sockauth.valid', function(){ //server says the token is valid
		console.log('socket connection authorised');
		if(cb) cb();
	});

	sock.on('sockauth.invalid', function(){ //server says the token is not valid
		sock.close();
		//alert('Authentication with server failed, please log back in.');
		$(".alert-wrapper").prepend(genalert("danger", false, "Authentication with server failed, please log back in."));
		console.log('Failed to authorise socket connection: Token was not valid.');
	});
}

// Socket Processing

socket.on('connect', function(){
	console.log('socket connection made.');
	authSock(socket, function(){
		socket.auth = true;
		$(".loading-overlay").hide(200);
	});
});

socket.on('reconnect', function(){
	console.log('socket connection made.');
});

socket.on('disconnect', function(){
	console.log('socket disconnected.');
});

socket.on('general.disconnect', function(m){
	$(".alert-wrapper").prepend(genalert("danger", false, "You were disconnected from the server!<br>Because " + m));
});

$(document).ready(function(){
	$(".user-select").each(function(){
		$(this).find("option:eq(0)").prop("selected",true);
	});
	loadAll();
});
