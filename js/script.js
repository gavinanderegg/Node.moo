var wsUri = "ws://echo.websocket.org/";
var output;


function connectWebSocket() {
	websocket = new WebSocket(wsUri);

	websocket.onopen = function(evt) { onOpen(evt) };

	websocket.onclose = function(evt) { onClose(evt) };

	websocket.onmessage = function(evt) { onMessage(evt) };

	websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt) {
	writeToLog("CONNECTED");
}

function onClose(evt) {
	writeToLog("DISCONNECTED"); 
}

function onMessage(evt) {
	writeToLog('<span style="color: blue;">RESPONSE: ' + evt.data+'</span>');
	 websocket.close();
}  

function onError(evt) {
	writeToLog('<span style="color: red;">ERROR:</span> ' + evt.data);
}

function doSend(message) {
	writeToLog("SENT: " + message);  websocket.send(message);
}

function writeToLog(message) {
	var pre = document.createElement("p");
	pre.style.wordWrap = "break-word";
	pre.innerHTML = message;
	output.appendChild(pre);
}  

$(function(){

	output = document.getElementById("log");
	connectWebSocket();

	$('form').submit(function(){
		var message = $('#user-input').val();


		if(message){


			writeToLog('<span style="color: green;">REQUEST: ' + message+'</span>');

			doSend(message);
		}

		return false;
	});

});