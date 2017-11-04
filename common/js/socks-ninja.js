let doTutorial = false;

const addPreCallTutorialPopups = function() {
	$('[data-toggle="popover"]').popover();
	$(".starttutorial").popover('hide');

	const alertdiv = "<div class=\"alert alert-info alert-dismissible\" role=\"alert\"> \
			<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button> \
			Hover your mouse over anything you'd like to know more about. Try the blue panel labelled \"Mentors\". To end the tutorial, reload the page.\
	</div>";
			$(".container").before(alertdiv);
	doTutorial = true;
	$("#intro").remove();

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

const addCallTutorialPopups = function() {
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
};

const offerTutorial = function() {
	let startTutorial = $(".starttutorial");
    startTutorial.popover({"title" : "Start Tutorial",
																						"placement" : "top",
																						"content" : "Click here to start the tutorial!",
																						"trigger" : "hover",
																						"container" : "body"});
    startTutorial.click(addPreCallTutorialPopups);
    startTutorial.popover('show');
	setTimeout(function() {
        startTutorial.popover('hide');
	}, 3000);
};

$(".lastname-submit").click(() => {
	let name = $("input.animal-radio:checked").val();
	
	socket.emit('ninja.lastnameChange', name);
	$('#profileOverlay').modal('hide');
});

socket.on('ninja.lastname', name => {
	let fullname_el = $(".info-fullname");
    let lastname_el = $(".info-lastname");
	$(".user-info-panel .animals").removeClass(lastname_el.text()).addClass(name);
    lastname_el.text(name);
	$(".info-panel").data("name", fullname_el.text());
	if(RTC_Data && RTC_Data.datachan) RTC_Data.emit("name.change", fullname_el.text());
});

$(function() {

	const callingTimeout = function(totaltime, lapse, waited){
		if(!$('.chat-body-start').data("calling")) return;
		if(waited < totaltime){
			$(".chat-body-start .progress-bar").width(((waited/totaltime)*100) + "%");
			setTimeout(callingTimeout, lapse, totaltime, lapse, waited + lapse);
		} else {
			$('.chat-btn-cancel').click();
		}
	};

	$('.chat-btn-start').click(function(){ // add even to the 'request a mentor' button
		console.log('sending mentor request');
		socket.emit('ninja.requestMentor');
		$('.chat-body-request').hide();
		$('.chat-body-start').show().data("calling", true);
		addCallTutorialPopups();
		callingTimeout(120000, 200, 0);
	});

	$('.chat-btn-cancel').click(function(){ // add even to the 'leave' button
		console.log('canceling mentor request');
		socket.emit('ninja.cancelRequest');
		$('.mentor-list-panel').show();
		$('.chat-body-request').show();
		$('.chat-body-start').hide().data("calling", false);
	});

	offerTutorial();

	$('input.animal-radio[value="'+$(".info-lastname").text()+'"]').prop("checked", true);
	$('#profileOverlay').on('hidden.bs.modal', function() {
    	$('input.animal-radio').prop("checked", false);
		$('input.animal-radio[value="'+$(".info-lastname").text()+'"]').prop("checked", true);
		$(".form-error-text").hide();
	});
});

