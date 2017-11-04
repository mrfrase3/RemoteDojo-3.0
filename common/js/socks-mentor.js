//load the template to render ninja help requests with
let request_source   = $(".req-list-item-template").html();
let request_template = Handlebars.compile(request_source);

let doTutorial = false;

let pwdRules = [];
let negativePwdRule;

joinDelay = 1000; //delay for joining the RTC room

const addPreCallTutorialPopups = function() {
	$('[data-toggle="popover"]').popover();
	$(".starttutorial").popover('hide');

	const alertdiv = "<div class=\"alert alert-info alert-dismissible\" role=\"alert\"> \
			<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button> \
			Hover your mouse over anything you'd like to know more about. Try the blue panel labelled \"Chat\". To end the tutorial, reload the page. \
	</div>";
			$(".container").before(alertdiv);
	doTutorial = true;
	$("#intro").remove();

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

const addCallTutorialPopups = function() {
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
};

const offerTutorial = function() {
    let startTutorial = $(".starttutorial");
    startTutorial.popover({
        "title": "Start Tutorial",
        "placement": "top",
        "content": "Click here to start the tutorial!",
        "trigger": "hover",
        "container": "body"
    });
    startTutorial.click(addPreCallTutorialPopups);
    startTutorial.popover('show');
    setTimeout(function () {
        startTutorial.popover('hide');
    }, 3000);
}

$(()=>{

const hideInputDiv = function(id){
	let p = $(".input-div[data-id=" + id + "]");
	p.hide();
	p.children("input").val("");
	$(".input-edit[data-id=" + id + "]").show();
};

const checkPwdStrength = function(pwd){
	let pass = true;
	for (let i = 0; i < pwdRules.length; ++i) {
		if (!pwdRules[i].test(pwd)) {
			pass = false;
			break;
		}
	}
	if (negativePwdRule.test(pwd)) pass = false;
	return pass;
};

// TODO sanitise
const submitPassword = function(){
	$(".alert-current-password").hide();
	let curPwd = $("#input-current-password").val().trim();
	let pwd = $("#input-password").val().trim();
	let pwd2 = $("#input-password2").val().trim();

	let pass = checkPwdStrength(pwd);
	$(".alert-password").toggle(!pass);
	
	let match = pwd === pwd2;
	if (!match) $(".alert-password2").show();
	else $(".alert-password2").hide();

	if (pass && match) {
		socket.emit('mentor.passwordChange', {newPwd: pwd, curPwd: curPwd});
	}
};

$("#input-current-password").on("change keyup keypress blur", function(){
	$(".alert-current-password").hide();
});

$("#input-password").on("change keyup keypress blur", function(){
	let pwd = $("#input-password").val();
	let pass = checkPwdStrength(pwd);
	$(".alert-password").toggle(!pass);
});

$("#input-password, #input-password2").on("change keyup keypress blur", function(){
	let pwd = $("#input-password").val();
    let pwd2 = $("#input-password2").val();
	$(".alert-password2").toggle(!(pwd === pwd2));
});

$(".fullname-submit").click(function(){
	$(".alert-fullname").hide();
    let firstname = $("#input-firstname").val().trim();
	if(firstname) socket.emit("mentor.firstnameChange", firstname);
    let lastname = $("#input-lastname").val().trim();
	if(lastname) socket.emit("mentor.lastnameChange", lastname);
	hideInputDiv($(this).data("id"));
});

socket.on("mentor.firstname", firstname => {
	$(".info-firstname").text(firstname);
	let fullname = $(".user-info-panel .info-fullname").text();
	$(".info-panel").attr("data-name", fullname);
	if(RTC_Data && RTC_Data.datachan) RTC_Data.emit("name.change", fullname);
});

socket.on("mentor.lastname", lastname => {
	$(".info-lastname").text(lastname);
    let fullname = $(".user-info-panel .info-fullname").text();
	$(".info-panel").data("name",fullname);
	if(RTC_Data && RTC_Data.datachan) RTC_Data.emit("name.change", fullname);
});

const submitEmail = function(){
	// TODO check email validity
	let email = $("#input-email").val().trim();
	$(".info-email").html(email);
	$(".info-panel").data("email",email);
	socket.emit("mentor.emailChange", email);
	return true;
};

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

$(".email-submit").click(function(){
    let success = submitEmail();
	if (success) hideInputDiv($(this).data("id"));
});

$(".input-edit").click(function(){
	let id = $(this).data("id");
	$(".input-div[data-id=" + id + "]").show();
	$(this).hide();
});

$(".input-cancel").click(function(){
	hideInputDiv($(this).data("id"));
});

});


socket.on('mentor.requestMentor', function(data){ // when a ninja has requested for a mentor
	console.log('recieved mentor request. ' + JSON.stringify(data));
	$('.chat-body-request').hide();
	$('.chat-body-start').show();
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, ''); // ensure the username is classname friendly
	$('.req-list').append(request_template(data));

    let answerbtn = $('#req-btn-'+data.cleanstok);
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
const request_checkEmpty = function(){ // Hide the queue if empty
	if($('.req-list-item').length < 1){
		$('.chat-body-request').show();
		$('.chat-body-start').hide();
	}
};

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
