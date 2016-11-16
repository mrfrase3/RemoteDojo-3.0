
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

socket.on("admin.fullDatabase", function(data){
	$("input").val("");
	$("input").attr("placeholder", "");
	$("select").find("option").remove();
	for (var i = 0; i < data.admins.length; ++i) {
		var u = data.admins[i];
		$(".select-admin").append("<option value=\"" + u.username + 
			"\" data-fullname=\"" + u.fullname + 
			"\" data-email=\"" + u.email + "\">");
	}
	for (var i = 0; i < data.champions.length; ++i) {
		var u = data.champions[i];
		$(".select-champion").append("<option value=\"" + u.username + 
			"\" data-fullname=\"" + u.fullname + 
			"\" data-email=\"" + u.email + "\">");
	}
	for (var i = 0; i < data.mentors.length; ++i) {
		var u = data.mentors[i];
		$(".select-mentors").append("<option value=\"" + u.username + 
			"\" data-fullname=\"" + u.fullname + 
			"\" data-email=\"" + u.email + "\">");
	}
	for (var i = 0; i < data.dojos.length; ++i) {
		var u = data.dojos[i];
		$(".select-dojos").append("<option value=\"" + u.dojoname + 
			"\" data-name=\"" + u.name + 
			"\" data-email=\"" + u.email + 
			"\" data-location=\"" + u.location + "\">");
		$(".mentor-dojos").append("<option value=\"" + u.dojoname + "\">");
	} // TODO add text to each option

});

$(".admin-select").change(function(){
	var o = $(this).find(":selected");
	$(".admin-input").val("");
	$(".admin-username").prop("disabled", o.val() !== "");
	$(".admin-username").attr("placeholder", o.val());
	$(".admin-email").attr("placeholder", o.data("email"));
	$(".admin-fullname").attr("placeholder", o.data("fullname"));
});

$(".champion-select").change(function(){
	var o = $(this).find(":selected");
	$(".champion-input").val("");
	$(".champion-username").prop("disabled", o.val() !== "");
	$(".champion-username").attr("placeholder", o.val());
	$(".champion-email").attr("placeholder", o.data("email"));
	$(".champion-fullname").attr("placeholder", o.data("fullname"));
});

$(".mentor-select").change(function(){
	var o = $(this).find(":selected");
	$(".mentor-input").val("");
	$(".mentor-username").prop("disabled", o.val() !== "");
	$(".mentor-username").attr("placeholder", o.val());
	$(".mentor-email").attr("placeholder", o.data("email"));
	$(".mentor-fullname").attr("placeholder", o.data("fullname"));
	var dojos = [o.data("dojos")];
	if (o.data("all-dojos")) dojos.push("all");
	$(".mentor-dojos").val(dojos);
});

$(".dojo-select").change(function(){
	var o = $(this).find(":selected");
	$(".dojo-input").val("");
	$(".dojo-dojoname").prop("disabled", o.val() !== "");
	$(".dojo-dojoname").attr("placeholder", o.val());
	$(".dojo-name").attr("placeholder", o.data("name"));
	$(".dojo-email").attr("placeholder", o.data("email"));
	$(".dojo-location").attr("placeholder", o.data("location"));
});

$(document).ready(function(){
	$(".user-select").each(function(){
		$(this).find("option:eq(0)").prop("selected",true);
		var type = $(this).data("id");
		var uidInput;
		if (type == "dojo") uidInput = $(".dojo-dojoname");
		else uidInput = $("." + type + "-username");
		if ($(this).val() !== "") uidInput.prop("disabled", true);
		else uidInput.prop("disabled", false);
		uidInput.val("");
	});
	var o = $(".mentor-select").find(":selected");
	var dojos = [o.data("dojos")];
	if (o.data("all-dojos")) dojos.push("all");
	console.dir(dojos);
	$(".mentor-dojos").val(dojos);
});
