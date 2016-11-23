$(document).ready(function() {

	//Even blocks have darker backgrounds
	$("div.block:odd").addClass("bg-grey");
	
	
	$(".img-caption-ninja-detail").hide();
	$(".img-caption-mentor-detail").hide();
		
	$(".mode-link-ninja").mouseover(function(){
		$(".img-caption-ninja").hide("slow");
		$(".img-caption-ninja-detail").show("slow");
	});
	
	$(".mode-link-ninja").mouseleave(function(){
		$(".img-caption-ninja-detail").hide("slow");
		$(".img-caption-ninja").show("slow");
	});
	
	$(".mode-link-mentor").mouseover(function(){
		$(".img-caption-mentor").hide("slow");
		$(".img-caption-mentor-detail").show("slow");
	});
	
	$(".mode-link-mentor").mouseleave(function(){
		$(".img-caption-mentor-detail").hide("slow");
		$(".img-caption-mentor").show("slow");
	});

	$("#mentorCopyButton").click(function(){
		copyToClipboard($("#mentorCopyTarget").get(0));
		$("#mentorCopyButton b").text("COPIED");
		$("#ninjaCopyButton b").text("COPY");
	});
	$("#ninjaCopyButton").click(function(){
		copyToClipboard($("#ninjaCopyTarget").get(0));
		$("#ninjaCopyButton b").text("COPIED");
		$("#mentorCopyButton b").text("COPY");
	});

})


/* Reference: http://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery */
function copyToClipboard(elem) {
	  // create hidden text element, if it doesn't already exist
	var targetId = "_hiddenCopyText_";
	var isInput = elem.tagName === "INPUT" || elem.tagName === "TEXTAREA";
	var origSelectionStart, origSelectionEnd;
	if (isInput) {
		// can just use the original source element for the selection and copy
		target = elem;
		origSelectionStart = elem.selectionStart;
		origSelectionEnd = elem.selectionEnd;
	} else {
		// must use a temporary form element for the selection and copy
		target = document.getElementById(targetId);
		if (!target) {
			var target = document.createElement("textarea");
			target.style.position = "absolute";
			target.style.left = "-9999px";
			target.style.top = "0";
			target.id = targetId;
			document.body.appendChild(target);
		}
		target.textContent = elem.textContent;
	}
	// select the content
	var currentFocus = document.activeElement;
	target.focus();
	target.setSelectionRange(0, target.value.length);
	
	// copy the selection
	var succeed;
	try {
		succeed = document.execCommand("copy");
	} catch(e) {
		succeed = false;
	}
	// restore original focus
	if (currentFocus && typeof currentFocus.focus === "function") {
		currentFocus.focus();
	}
	
	if (isInput) {
		// restore prior selection
		elem.setSelectionRange(origSelectionStart, origSelectionEnd);
	} else {
		// clear temporary content
		target.textContent = "";
	}
	return succeed;
}
