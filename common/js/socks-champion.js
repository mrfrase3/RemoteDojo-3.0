$(".submit-champion").click(function(){
	var user = $(".champion-select").find(":selected").val();
	var username = $(".champion-username").val();
	var email = $(".champion-email").val();
	var fullname = $(".champion-fullname").val();
	var password = $(".champion-password").val();
	socket.emit("champion.championEdit",{user: user, username: username, email: email, fullname: fullname, password: password, dojos: ""});
	$(".champion-input").val("");
});

$(".submit-mentor").click(function(){
	var user = $(".mentor-select").find(":selected").val();
	var username = $(".mentor-username").val();
	var email = $(".mentor-email").val();
	var fullname = $(".mentor-fullname").val();
	var password = $(".mentor-password").val();
	var dojos = $(".mentor-dojos").val();
	socket.emit("champion.mentorEdit",{user: user, username: username, email: email, fullname: fullname, password: password, dojos: dojos});
	$(".mentor-input").val("");
});

$(".submit-dojo").click(function(){
	var user = $(".dojo-select").find(":selected").val();
	var dojoname = $(".dojo-dojoname").val();
	var name = $(".dojo-name").val();
	var email = $(".dojo-email").val();
	var location = $(".dojo-location").val();
	var password = $(".dojo-password").val();
	socket.emit("champion.dojoEdit",{user: user, dojoname: dojoname, name: name, email: email, location: location, password: password});
	$(".dojo-input").val("");
});

$(".remove").click(function(){
	var type = $(this).data("id"); // can only delete dojos and mentors
	var uid = $("select[data-id=" + type + "]").val();
	if (window.confirm("Are you sure you want to delete the user/dojo " + uid + "?")){
		socket.emit("champion.deleteUser", {type: type, uid: uid});
	}
});

var loadAdmin = function() {
	var o = $(".admin-select").find(":selected");
	$(".admin-username").val(o.val());
	$(".admin-email").val(o.data("email"));
	$(".admin-fullname").val(o.data("fullname"));
}

var loadChampion = function() {
	var o = $(".champion-select").find(":selected");
	$(".champion-input").val("");
	$(".champion-username").prop("disabled", o.val() !== "");
	$(".champion-username").attr("placeholder", o.val());
	$(".champion-email").attr("placeholder", o.data("email"));
	$(".champion-fullname").attr("placeholder", o.data("fullname"));
	// champions can only modify themselves
	var isSelf = o.hasClass("self");
	$(".submit-champion, .champion-input").prop("disabled", !isSelf);
	$(".champion-username").prop("disabled", true);
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

socket.on("champion.fullDatabase", function(data){
	console.log("db update from server");
	$("input").val("");
	$("input").attr("placeholder", "");
	$("input[type=password]").attr("placeholder", "********");
	$(".db-option").remove();
	$("option.self").attr({"value": data.user.username})
		.text(data.user.fullname)
		.data("fullname", data.user.fullname)
		.data("email", data.user.email);
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

$(document).ready(function(){
	$(".user-select").each(function(){
		$(this).find("option:eq(0)").prop("selected",true);
	});
	loadAll();
});
