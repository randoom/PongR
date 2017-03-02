<!DOCTYPE html>
<html>
<head>
	<title>PongR</title>
	<link href="Content/style.css" rel="stylesheet" type="text/css" />
</head>
<body>
	<div>
		<div class="clearfix" style="width: 800px">
			<div id="player1" style="width: 50%; float: left;">
				<span class="name"></span>
				<span class="score" style="float: right; margin-right: 0.5em">0</span>
			</div>
			<div id="player2" style="width: 50%; float: left">
				<span class="name" style="float: right"></span>
				<span class="score" style="margin-left: 0.5em">0</span>
			</div>
		</div>
		<canvas id="canvas" width="800" height="600" style="border: 1px solid black"></canvas>
		<div id="messages">
		</div>
		<br />
		<div style="font-size: 10px; color: #777">Use up/down arrow leys to move the pad</div>
	</div>
	<script src="Scripts/jquery-1.6.4.min.js" type="text/javascript"></script>
	<script src="Scripts/jquery.signalR-2.2.1.js" type="text/javascript"></script>
	<script src="signalr/hubs" type="text/javascript"></script>
	<script src="Scripts/Game.js" type="text/javascript"></script>
	<script type="text/javascript">
		$(function () {
			window.initGame();
		});
	</script>
</body>
</html>
