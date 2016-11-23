//load the template to render ninja help requests with
var request_source   = $(".req-list-item-template").html();
var request_template = Handlebars.compile(request_source);

var doTutorial = false;

var pwdRules = [];
var negativePwdRule;

joinDelay = 1000; //delay for joining the RTC room

var addPreCallTutorialPopups = function() {
	$('[data-toggle="popover"]').popover();
	$(".starttutorial").popover('hide');

	var alertdiv = "<div class=\"alert alert-info alert-dismissible\" role=\"alert\"> \
			<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button> \
			Hover your mouse over anything you'd like to know more about. Try the blue panel labelled \"Chat\". To end the tutorial, reload the page. \
	</div>";
			$(".container").before(alertdiv);
	doTutorial = true;
	$("#intro").remove()

	$(".chat-panel div.panel-heading").popover({"title" : "Chat Panel",
																							"content" : "If any Ninjas need help, their names will appear here. When a green \"Answer\" button appears, click it to start a conversation.",
																							"trigger" : "hover",
																							"container" : "body"});

	$(".user-info-panel div.panel-heading").popover({"title" : "User Info Panel",
																							"content" : "Displays some basic information about your account.",
																							"trigger" : "hover",
																							"container" : "body"});

	$(".presentations-panel div.panel-heading").popover({"title" : "Presentations Panel",
																							"content" : "To do",
																							"trigger" : "hover",
																							"container" : "body"});

	// What if we start the tutorial while in a call? We'll need to add popups to the newly visible elements
	if(answeredRequest) {
		addCallTutorialPopups();
	}
};

var addCallTutorialPopups = function() {
	$(".levels-local").popover({"title" : "Your Volume",
																							"content" : "This shows the volume of your microphone.",
																							"trigger" : "hover",
																							"container" : "body"});
	$(".levels-remote").popover({"title" : "Ninja's Volume",
																							"content" : "This shows the volume of the ninja's microphone.",
																							"trigger" : "hover",
																							"container" : "body"});
	$(".screen-remote-box div.panel-heading").popover({"title" : "Ninja's Screen Panel",
																						"content" : "Here, you can see the ninja's screen.",
																						"trigger" : "hover",
																						"container" : "body"});
	$(".screen-local").popover({"title" : "Your Screen/Webcam Panel",
																						"content" : "This is a preview of what your screen or webcam video (depending on which one is currently being used) looks like to the ninja.",
																						"trigger" : "hover",
																						"container" : "body"});
	$(".webcam-controls").popover({"title" : "Webcam Controls",
																						"content" : "These buttons will let you switch between sharing your screen or the video from your webcam with the ninja, as well as allow you to exit the chat. Try clicking the Webcam button to test it out!",
																						"trigger" : "hover",
																						"container" : "body"});
	$(".screen-local-stop").popover({"title" : "Stop Sharing",
																						"content" : "This button will let you stop sharing your screen or webcam video with the ninja.",
																						"trigger" : "hover",
																						"container" : "body"});
	$(".chat-btn-stop").popover({"title" : "Leave Chat",
																						"content" : "Clicking this button will end the chat session.",
																						"trigger" : "hover",
																						"container" : "body"});
}

var offerTutorial = function() {
	$(".starttutorial").popover({"title" : "Start Tutorial",
																						"placement" : "top",
																						"content" : "Click here to start the tutorial!",
																						"trigger" : "hover",
																						"container" : "body"});
	$(".starttutorial").click(addPreCallTutorialPopups);
	$	(".starttutorial").popover('show');
	setTimeout(function() {
		$(".starttutorial").popover('hide');
	}, 3000);
}

var hideInputDiv = function(id){
	var p = $(".input-div[data-id=" + id + "]");
	p.hide();
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

// TODO replace this with a form submission and a check / response on the server side.
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


socket.on('mentor.requestMentor', function(data){ // when a ninja has requested for a mentor
	console.log('recieved mentor request. ' + JSON.stringify(data));
	$('.chat-body-request').hide();
	$('.chat-body-start').show();
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, ''); // ensure the username is classname friendly
	$('.req-list').append(request_template(data));
	
	var answerbtn = $('#req-btn-'+data.cleanstok);
	if (answeredRequest) answerbtn.addClass("disabled");
	answerbtn.click(function(){ //add click event to the 'Answer' button
		if (answeredRequest) return;
		socket.emit('mentor.acceptRequest', data.sessiontoken);
		answeredRequest = true;
		if(doTutorial) {
			$('#req-btn-'+data.cleanstok).popover("hide");
			addCallTutorialPopups();
		}
	});
	$('#req-ignore-btn-'+data.cleanstok).click(function(){ // add click event to the 'Ignore' button
		$('#req-'+data.cleanstok).hide(); // TODO show number of ninjas in queue, add button to show hidden requests
	});
});

// Helper function, that really shouldn't exist
var request_checkEmpty = function(){ // Hide the queue if empty
	if($('.req-list-item').length < 1){
		$('.chat-body-request').show();
		$('.chat-body-start').hide();
	}
}

socket.on('mentor.cancelRequest', function(stok){ // when a ninja cancels a request
	console.log('#req-' + JSON.stringify(stok).replace(/\W/g, ''));
	$('#req-' + JSON.stringify(stok).replace(/\W/g, '')).remove();
	request_checkEmpty();
});

$( document ).ready(function() {
	offerTutorial();

	// Set password rules
	// pwdRules.push(new RegExp(/.{8,}/)); // minimum 8 characters
	// pwdRules.push(new RegExp(/^[a-z]/i)) // alpha
	// pwdRules.push(new RegExp(/[a-z]/)); // lowercase
	// pwdRules.push(new RegExp(/[A-Z]/)); // uppercase
	// pwdRules.push(new RegExp(/[\d]/)); // numeric
	// pwdRules.push(new RegExp(/[.\/,<>?;:"'`~!@#$%^&*()[\]{}_+=|\\-]/)); // special character
	negativePwdRule = new RegExp(/[^a-zA-Z\d.\/,<>?;:"'`~!@#$%^&*()[\]{}_+=|\\-]/); // keyboard character
});
