$(function(){
	$('[data-toggle="popover"]').popover();

	var alertdiv = "<div id=\"intro\" class=\"alert alert-info alert-dismissible\" role=\"alert\"> \
			<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button> \
			<strong>Hello!</strong> Would you like a quick tutorial on how to use RemoteDojo? \
			<button type=\"button\" id=\"starttutorial\" class=\"btn btn-default btn-xs\"><span >Yes please</span></button> \
	</div>";
	$(".container").before(alertdiv);

	$("#starttutorial").click(function() {
		$("#intro").remove()


		$(".chat-panel div.panel-heading").popover({"title" : "Chat Panel",
																								"content" : "If any Ninjas need help, their names will appear here. When that happens, click the green \"Answer\" button to start a conversation.",
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

		var alertdiv = "<div class=\"alert alert-info alert-dismissible\" role=\"alert\"> \
				<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button> \
				Great! Hover your mouse over anything you'd like to know more about. Try the blue panel labelled \"Chat\". \
		</div>";
		$(".container").before(alertdiv);
	})
});
