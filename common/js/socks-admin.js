var pwdRules = [];
var negativePwdRule;

var hideInputDiv = function(id){
	var p = $(".input-div[data-id=" + id + "]");
	p.hide();
	p.children("p").text("");
	p.children("input").val("");
	$(".input-edit[data-id=" + id + "]").show();
}

var checkPwdStrength = function(pwd){
	var pass = true;
	for (var i = 0; i < pwdRules.length; ++i) {
		if (!pwdRules[i].test(pwd)) {
			pass = false;
			break;
		}
	}
	if (negativePwdRule.test(pwd)) pass = false;
	return pass;
}

// TODO sanitise
var submitPassword = function(){
	$(".alert-current-password").hide();
	$(".alert-password").hide();
	$(".alert-password2").hide();
	var curPwd = $("#input-current-password").val().trim();
	var pwd = $("#input-password").val().trim();
	var pwd2 = $("#input-password2").val().trim();

	var pass = checkPwdStrength(pwd);
	$(".alert-password").toggle(!pass);
	
	var match = pwd === pwd2;
	if (!match) $(".alert-password2").show();

	if (pass && match) {
		socket.emit('mentor.passwordChange', {newPwd: pwd, curPwd: curPwd});
	}
}

$("#input-current-password").on("change keyup keypress blur", function(){
	$(".alert-current-password").hide();
});

$("#input-password").on("change keyup keypress blur", function(){
	var pwd = $("#input-password").val();
	var pass = checkPwdStrength(pwd);
	$(".alert-password").toggle(!pass);
});

$("#input-password, #input-password2").on("change keyup keypress blur", function(){
	var pwd = $("#input-password").val();
	var pwd2 = $("#input-password2").val();
	$(".alert-password2").toggle(!(pwd === pwd2));
});

var submitFullname = function(){
	$(".alert-fullname").hide();
	var name = $("#input-fullname").val().trim();
	var nonalpha = new RegExp(/[^a-z ]/i);
	if (nonalpha.test(name)) {
		$(".alert-fullname").text("Please choose a name with only letters and spaces.");
		$(".alert-fullname").show();
		return false;
	} else if (name.length > 20) {
		$(".alert-fullname").text("Please choose a name with at most 20 letters.");
		$(".alert-fullname").show();
		return false;
	} else {
		$(".info-fullname").html(name);
		$(".info-panel").data("name",name);
		socket.emit("mentor.fullnameChange", name);
		return true;
	}
}

var submitEmail = function(){
	// TODO check email validity
	var email = $("#input-email").val().trim();
	$(".info-email").html(email);
	$(".info-panel").data("email",email);
	socket.emit("mentor.emailChange", email);
	return true;
}

socket.on("mentor.passwordChange", function(data){
	if (data) {
		console.log("Successfully changed password");
		hideInputDiv("password");
	} else {
		console.log("Failed to change password");
		$(".alert-current-password").show();
	}
});

$(".password-submit").click(submitPassword);

$(".fullname-submit").click(function(){
	var success = submitFullname();
	if (success) hideInputDiv($(this).data("id"));
});

$(".email-submit").click(function(){
	var success = submitEmail();
	if (success) hideInputDiv($(this).data("id"));
});

$(".input-edit").click(function(){
	var id = $(this).data("id");
	$(".input-div[data-id=" + id + "]").show();
	$(this).hide();
});

$(".input-cancel").click(function(){
	hideInputDiv($(this).data("id"));
});

$( document ).ready(function() {

	// Set password rules
	pwdRules.push(new RegExp(/.{8,}/)); // minimum 8 characters
	pwdRules.push(new RegExp(/^[a-z]/i)) // alpha
	// pwdRules.push(new RegExp(/[a-z]/)); // lowercase
	// pwdRules.push(new RegExp(/[A-Z]/)); // uppercase
	// pwdRules.push(new RegExp(/[\d]/)); // numeric
	// pwdRules.push(new RegExp(/[.\/,<>?;:"'`~!@#$%^&*()[\]{}_+=|\\-]/)); // special character
	negativePwdRule = new RegExp(/[^a-zA-Z\d.\/,<>?;:"'`~!@#$%^&*()[\]{}_+=|\\-]/); // none of the above
});
