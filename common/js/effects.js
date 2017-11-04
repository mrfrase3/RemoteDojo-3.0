/*$(document).ready(function() {

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



})*/
$(function(){
    let ninjaCopyTarget = $("#ninjaCopyTarget");
    if(ninjaCopyTarget.length < 0) return;
    let mentorCopyTarget = $("#mentorCopyTarget");
    let mentorCopyButton = $("#mentorCopyButton");
    let ninjaCopyButton = $("#ninjaCopyButton");

	/* Reference: http://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery */
	function copyToClipboard(elem) {
		  // create hidden text element, if it doesn't already exist
		let targetId = "_hiddenCopyText_";
		let isInput = elem.tagName === "INPUT" || elem.tagName === "TEXTAREA";
		let origSelectionStart, origSelectionEnd;
		if (isInput) {
			// can just use the original source element for the selection and copy
			target = elem;
			origSelectionStart = elem.selectionStart;
			origSelectionEnd = elem.selectionEnd;
		} else {
			// must use a temporary form element for the selection and copy
			target = document.getElementById(targetId);
			if (!target) {
				let target = document.createElement("textarea");
				target.style.position = "absolute";
				target.style.left = "-9999px";
				target.style.top = "0";
				target.id = targetId;
				document.body.appendChild(target);
			}
			target.textContent = elem.textContent;
		}
		// select the content
		let currentFocus = document.activeElement;
		target.focus();
		target.setSelectionRange(0, target.value.length);

		// copy the selection
		let succeed;
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
    mentorCopyButton.click(function(){
        copyToClipboard(mentorCopyTarget.get(0));
        mentorCopyButton.find("b").text("COPIED");
        ninjaCopyButton.find("b").text("COPY");
    });
    ninjaCopyButton.click(function(){
        copyToClipboard(ninjaCopyTarget.get(0));
        ninjaCopyButton.find("b").text("COPIED");
        mentorCopyButton.find("b").text("COPY");
    });



    let ninjaURL = "https://" + location.host + ninjaCopyTarget.val();
    let mentorURL = "https://" + location.host + mentorCopyTarget.val();
    mentorCopyTarget.val(mentorURL);
    ninjaCopyTarget.val(ninjaURL);
    $(".mode-link-mentor").attr("href", mentorURL);
    $(".mode-link-ninja").attr("href", ninjaURL);

    let expire = (new Date(Number($(".button-menu-buttons .expiry-wrap").attr("data-expires")))).getTime();
    let expireTimer = function(){
        let timeleft = Math.floor(( expire - Date.now() ) / 1000);
        if(timeleft < 0) timeleft = 0;
        let seconds = timeleft % 60;
        if(seconds < 10) seconds = "0"+seconds;
        let minutes = Math.floor(timeleft / 60);
        if(minutes < 10) minutes = "0"+minutes;
        $(".button-menu-buttons .expiry-count-down").text(minutes + ":" + seconds);
        if(timeleft > 0) setTimeout(expireTimer, 100);
    };
    expireTimer();
});