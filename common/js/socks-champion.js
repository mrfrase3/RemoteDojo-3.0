
$(".submit-admin").click(function(){
	var user = $(".admin-select").find(":selected").val();
	var username = $(".admin-username").val();
	var email = $(".admin-email").val();
	var fullname = $(".admin-fullname").val();
	var password = $(".admin-password").val();
	socket.emit("admin.adminEdit",{user: user, username: username, email: email, fullname: fullname, password: password});
	$(".admin-input").val("");
});

$(".submit-champion").click(function(){
	var user = $(".champion-select").find(":selected").val();
	var username = $(".champion-username").val();
	var email = $(".champion-email").val();
	var fullname = $(".champion-fullname").val();
	var password = $(".champion-password").val();
	socket.emit("admin.championEdit",{user: user, username: username, email: email, fullname: fullname, password: password});
	$(".champion-input").val("");
});

$(".submit-mentor").click(function(){
	var user = $(".mentor-select").find(":selected").val();
	var username = $(".mentor-username").val();
	var email = $(".mentor-email").val();
	var fullname = $(".mentor-fullname").val();
	var password = $(".mentor-password").val();
	socket.emit("admin.mentorEdit",{user: user, username: username, email: email, fullname: fullname, password: password});
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
	var user = $("select[data-id=" + type + "]");
	if (window.confirm("Are you sure you want to delete the user " + user + "?")){
		socket.emit("admin.deleteUser", {type: type, user: user});
	}
});

socket.on("admin.fullUserUpdate", function(data){
	$("input").val("");
	$("input").attr("placeholder", "");
	$("select").find("option").remove();
	for (int i = 0; i < data.admins.length; ++i) {
		var u = data.admins[i];
		$(".select-admin").append("<option value=\"" + u.username + 
			"\" data-fullname=\"" + u.fullname + 
			"\" data-email=\"" + u.email + "\">");
	}
	for (int i = 0; i < data.champions.length; ++i) {
		var u = data.champions[i];
		$(".select-champion").append("<option value=\"" + u.username + 
			"\" data-fullname=\"" + u.fullname + 
			"\" data-email=\"" + u.email + "\">");
	}
	for (int i = 0; i < data.mentors.length; ++i) {
		var u = data.mentors[i];
		$(".select-mentors").append("<option value=\"" + u.username + 
			"\" data-fullname=\"" + u.fullname + 
			"\" data-email=\"" + u.email + "\">");
	}
	for (int i = 0; i < data.dojos.length; ++i) {
		var u = data.dojos[i];
		$(".select-dojos").append("<option value=\"" + u.dojoname + 
			"\" data-name=\"" + u.name + 
			"\" data-email=\"" + u.email + 
			"\" data-location=\"" + u.location + "\">");
	}

});

$(".admin-select").change(function(){
	var o = $(this).find(":selected");
	$(".admin-input").val("");
	$(".admin-username").attr("placeholder", o.val());
	$(".admin-email").attr("placeholder", o.data("email"));
	$(".admin-fullname").attr("placeholder", o.data("fullname"));
});

$(".champion-select").change(function(){
	var o = $(this).find(":selected");
	$(".champion-input").val("");
	$(".champion-username").attr("placeholder", o.val());
	$(".champion-email").attr("placeholder", o.data("email"));
	$(".champion-fullname").attr("placeholder", o.data("fullname"));
});

$(".mentor-select").change(function(){
	var o = $(this).find(":selected");
	$(".mentor-input").val("");
	$(".mentor-username").attr("placeholder", o.val());
	$(".mentor-email").attr("placeholder", o.data("email"));
	$(".mentor-fullname").attr("placeholder", o.data("fullname"));
});

$(".dojo-select").change(function(){
	var o = $(this).find(":selected");
	$(".dojo-input").val("");
	$(".dojo-dojoname").attr("placeholder", o.val());
	$(".dojo-name").attr("placeholder", o.data("name"));
	$(".dojo-email").attr("placeholder", o.data("email"));
	$(".dojo-location").attr("placeholder", o.data("location"));

});
