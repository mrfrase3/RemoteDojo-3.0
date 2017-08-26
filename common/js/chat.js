$(()=>{

var converter = new showdown.Converter({
	simplifiedAutoLink: true, 
	excludeTrailingPunctuationFromURLs: true,
	strikethrough: true,
	tasklists: true,
	simpleLineBreaks: true,
	openLinksInNewWindow: true
});

var addMessage = function(msg, local=false) {
	//var item = document.createElement("li");
	//$(item).text(msg.name + ": " + msg.data);
	msg.data = converter.makeHtml(msg.data.replace(/[&<>]/g, tag => { return {'&': '&amp;','<': '&lt;','>': '&gt;'}[tag] || tag; } ));
	var item = "";
	if (local) {
		item = '<li class="local-msg"><div>' + msg.data + '</div></li>';
    	RTC_Data.emit('tabs.focus', 'chat');
	}
	else {
		item = '<li class="remote-msg"><div>' + msg.data + '</div></li>';
		//$(".button-menu .chat-list-wrap").toggle(true);
	} 
	var chatList = $(".chat-list-wrap .chat-list");
	chatList.append(item);
	chatList.scrollTop(chatList.get(0).scrollHeight); // scroll to the latest message
};

RTC_Data.on('chat.message', addMessage);

var rtcSendMessage = function(){
	var txtInput = $(".input-group .chat-input");
	//txtInput.get(0).style.height = "auto";
	txtInput.css("height","auto");
	var msg = txtInput.val();
	if (msg.length == 0) return;
	var e = {
		"name": $(".info-fullname").text(),
		"data": msg
	};
	txtInput.val("");

	//e = JSON.stringify(e);
	//console.log("Sending message: " + e);
	//dataChannel.send(e);
	RTC_Data.emit('chat.message', e);

	addMessage(e, true);
}

// Record and send the content of the text input
$(".input-group .chat-send").click(function(){
	rtcSendMessage();
	$(".input-group .chat-input").focus();
});

$(".input-group .chat-input").keyup(function(e){
	if(e.which !== 13) return;	// if enter
	if(e.shiftKey || e.ctrlKey) return; // continue if not in chat or additional keys held.
	if($(this).val().trim().length < 1) return; // if the chat isn"t empty, send the message
	rtcSendMessage();
});

// Resize text box to match content
$(".resizeBox").on("change keyup keypress blur focus", function() {
	if (this.scrollHeight > 53) {
		this.style.height = "1px";
		this.style.height = (12 + this.scrollHeight) + "px";
		$(this).scrollTop(this.scrollHeight);
	} else {
    	this.style.height = "45px";
    }
});

$(".resizeBox").blur();

});

