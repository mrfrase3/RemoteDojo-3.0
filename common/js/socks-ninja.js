var doTutorial = false;

var addPreCallTutorialPopups = function() {
	$('[data-toggle="popover"]').popover();
	$(".starttutorial").popover('hide');

	var alertdiv = "<div class=\"alert alert-info alert-dismissible\" role=\"alert\"> \
			<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button> \
			Hover your mouse over anything you'd like to know more about. Try the blue panel labelled \"Mentors\". To end the tutorial, reload the page.\
	</div>";
			$(".container").before(alertdiv);
	doTutorial = true;
	$("#intro").remove()

	$(".mentor-list-panel div.panel-heading").popover({"title" : "List of Mentors",
																							"content" : "Shows a list of online mentors and whether they are busy or available to help.",
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
	$(".levels-remote").popover({"title" : "Mentor's Volume",
																							"content" : "This shows the volume of the mentor's microphone.",
																							"trigger" : "hover",
																							"container" : "body"});
	$(".screen-remote-box div.panel-heading").popover({"title" : "Mentor's Screen Panel",
																						"content" : "Here, you can see the mentor's screen.",
																						"trigger" : "hover",
																						"container" : "body"});
	$(".screen-local-start").popover({"title" : "Start Sharing your Screen",
																						"content" : "Click here to start sharing your screen with the mentor.",
																						"trigger" : "hover",
																						"container" : "body"});
	$(".screen-local").popover({"title" : "Your Screen Panel",
																						"content" : "This is a preview of what your screen looks like to the mentor.",
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

var submitProfile = function(){
	$(".alert-fullname").hide();
	var name = $("#input-fullname").val();
	var nonalpha = new RegExp(/[^a-z ]/i);
	if (nonalpha.test(name)) {
		$(".alert-fullname").text("Please choose a name with only letters and spaces.");
		$(".alert-fullname").show();
	} else if (name.length > 10) {
		$(".alert-fullname").text("Please choose a name with at most 10 letters.");
		$(".alert-fullname").show();
	} else {
		$(".info-fullname").html(name);
		$(".info-panel").data("name",name);
		socket.emit('ninja.fullnameChange', name);
		$('#profileOverlay').modal('hide');
	}
}

$(".fullname-submit").click(submitProfile);

$(function() {

	var callingTimeout = function(totaltime, lapse, waited){
		if(!$('.chat-body-start').data("calling")) return;
		if(waited < totaltime){
			$(".chat-body-start .progress-bar").width(((waited/totaltime)*100) + "%");
			setTimeout(callingTimeout, lapse, totaltime, lapse, waited + lapse);
		} else {
			$('.chat-btn-cancel').click();
		}
	}

	$('.chat-btn-start').click(function(){ // add even to the 'request a mentor' button
		console.log('sending mentor request');
		socket.emit('ninja.requestMentor');
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
		addCallTutorialPopups();
		$('.chat-body-start').data("calling", true);
		callingTimeout(120000, 200, 0);
	});

	$('.chat-btn-cancel').click(function(){ // add even to the 'leave' button
		console.log('canceling mentor request');
		socket.emit('ninja.cancelRequest');
		$('.mentor-list-panel').show();
		$('.chat-body-request').show();
		$('.chat-body-start').hide();
		$('.chat-body-start').data("calling", false);
	});
});

$( document ).ready(function() {
	offerTutorial();
// TODO onshow/onhide? Set fields to current...
	// $('#profileOverlay').on('shown.bs.modal', function() {
	// 	$("#input-username").focus();
	// });

	$('#profileOverlay').on('hidden.bs.modal', function() {
		$("#input-fullname").val("");
		$(".form-error-text").hide();
	});
});
