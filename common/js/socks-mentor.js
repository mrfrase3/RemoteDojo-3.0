var request_source   = $(".chat-list-item-template").html();
var request_template = Handlebars.compile(request_source);

joinDelay = 1000;

socket.on('mentor.requestMentor', function(data){
	console.log('recieved mentor request. ' + JSON.stringify(data));
	if (!chats){
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
    }
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, '');
	$('.chat-list').append(request_template(data));
	$('#req-btn-'+data.cleanstok).click(function(){
    	socket.emit('mentor.acceptRequest', data.sessiontoken);
    });
});

var request_checkEmpty = function(){
	if($('.chat-list-item').length < 1){
    	if (!chats){
    		$('.chat-body-request').show();
			$('.chat-body-start').hide();
        }
    }
}

socket.on('mentor.cancelRequest', function(stok){
	$('#req-' + JSON.stringify(stok).replace(/\W/g, '')).remove();
	request_checkEmpty();
})




