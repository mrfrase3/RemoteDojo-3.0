//load the template to render ninja help requests with
var request_source   = $(".chat-list-item-template").html();
var request_template = Handlebars.compile(request_source);

var doTutorial = false;
var inCall = false;
var callBtnId;

joinDelay = 1000; //delay for joining the RTC room

var addPreCallTutorialPopups = function() {
	$('[data-toggle="popover"]').popover();

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
	if(inCall == true) {
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
	var alertdiv = "<div id=\"intro\" class=\"alert alert-info alert-dismissible\" role=\"alert\"> \
			<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button> \
			<strong>Hello!</strong> Would you like a quick tutorial on how to use RemoteDojo? \
			<button type=\"button\" id=\"starttutorial\" class=\"btn btn-default btn-xs\"><span >Yes please</span></button> \
	</div>";
	$(".container").before(alertdiv);
	$("#starttutorial").click(addPreCallTutorialPopups);
}


socket.on('mentor.requestMentor', function(data){ // when a ninja has requested for a mentor
	console.log('recieved mentor request. ' + JSON.stringify(data));
	if (!chats){ // dont show or hide anything if in the middle of a chat session already
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
    }
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, ''); //make sure the username is classname friendly
	$('.chat-list').append(request_template(data));
	if(doTutorial) {
		// We have to add the popover to the answer button after the mentor recieves a request from a ninja (so that it is visible), but before the answer button is clicked.
		$('#req-btn-'+data.cleanstok).popover({"title" : "Start a Conversation",
																						"content" : "A ninja needs your help! Click here to start a conversation with them.",
																						"trigger" : "hover",
																						"container" : "body"});
		$('#req-btn-'+data.cleanstok).popover('show');
	}
	$('#req-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
		socket.emit('mentor.acceptRequest', data.sessiontoken);
		inCall = true;
		if(doTutorial == true) {
			$('#req-btn-'+data.cleanstok).popover("hide");
			addCallTutorialPopups();
		}
	});
});

// Helper function, that really shouldn't exist
var request_checkEmpty = function(){
	if($('.chat-list-item').length < 1){ //make sure there are no other requests active
    	if (!chats){
    		$('.chat-body-request').show();
			$('.chat-body-start').hide();
        }
    }
}

socket.on('mentor.cancelRequest', function(stok){ // when a ninja cancels a request
	$('#req-' + JSON.stringify(stok).replace(/\W/g, '')).remove();
	request_checkEmpty();
});

offerTutorial();
