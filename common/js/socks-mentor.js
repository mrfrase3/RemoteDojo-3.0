//load the template to render ninja help requests with
var request_source   = $(".req-list-item-template").html();
var request_template = Handlebars.compile(request_source);

var doTutorial = false;
var inCall = false;

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


socket.on('mentor.requestMentor', function(data){ // when a ninja has requested for a mentor
	console.log('recieved mentor request. ' + JSON.stringify(data));
	if (!chats){ // dont show or hide anything if in the middle of a chat session already
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
    }
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, ''); //make sure the username is classname friendly
	$('.req-list').append(request_template(data));
	$('#req-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
    	socket.emit('mentor.acceptRequest', data.sessiontoken);
			inCall = true;
			if(doTutorial == true) {
				$('#req-btn-'+data.cleanstok).popover("hide");
				addCallTutorialPopups();
			}
    });
	$('#req-ignore-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
    	$('#req-'+data.cleanstok).remove();
    	request_checkEmpty();
    });
});

// Helper function, that really shouldn't exist
var request_checkEmpty = function(){
	if($('.req-list-item').length < 1){ //make sure there are no other requests active
    	if (!chats){
    		$('.chat-body-request').show();
			$('.chat-body-start').hide();
        }
    }
}

socket.on('mentor.cancelRequest', function(stok){ // when a ninja cancels a request
	console.log('#req-' + JSON.stringify(stok).replace(/\W/g, ''));
	$('#req-' + JSON.stringify(stok).replace(/\W/g, '')).remove();
	request_checkEmpty();
});


$( document ).ready(function() {
	offerTutorial();
});
