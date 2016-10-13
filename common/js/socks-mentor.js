//load the template to render ninja help requests with
var request_source   = $(".chat-list-item-template").html();
var request_template = Handlebars.compile(request_source);

joinDelay = 1000; //delay for joining the RTC room

socket.on('mentor.requestMentor', function(data){ // when a ninja has requested for a mentor
	console.log('recieved mentor request. ' + JSON.stringify(data));
	if (!chats){ // dont show or hide anything if in the middle of a chat session already
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
    }
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, ''); //make sure the username is classname friendly
	$('.chat-list').append(request_template(data));
	$('#req-btn-'+data.cleanstok).popover({"title" : "Start a Conversation",
																							"content" : "A ninja needs your help! Click here to start a conversation with them.",
																							"trigger" : "hover",
																							"container" : "body"});
	$('#req-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
    	socket.emit('mentor.acceptRequest', data.sessiontoken);
			$('#req-btn-'+data.cleanstok).popover("hide");
			$(".levels-local").popover({"title" : "Your Volume",
																									"content" : "This shows the volume of your microphone.",
																									"trigger" : "hover",
																									"container" : "body"});
			$(".levels-remote").popover({"title" : "Ninja's Volume",
																									"content" : "This shows the volume of the ninja's microphone.",
																									"trigger" : "hover",
																									"container" : "body"});
    });
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
