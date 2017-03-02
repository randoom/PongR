/// <reference path="jquery-1.6.4.js" />
/// <reference path="jquery.signalR-2.2.1.js" />

(function ($, window) {
	/// <param name="$" type="jQuery" />
	"use strict";

	window.requestAnimFrame = function (callback) {
		window.setTimeout(callback, 10);
	};

	var keyCodes = {
		up: 38,
		down: 40,
		left: 37,
		right: 39
	};

	function newPad() {
		return {
			width: 20,
			height: 100,
			x: 0,
			y: 0
		};
	}

	function showMessage(text) {
		$("#messages").append(text + "<br>");
	}

	window.initGame = function () {
		var canvas = document.getElementById("canvas");
		var context = canvas.getContext("2d");

		var hub = $.connection.pong;

		var game = {
			pad1: newPad(),
			pad2: newPad(),
			started: false,
			pointStarted: false,
			hasBall: false,
			ball: {
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				radius: 10
			},
			keysDown: {}
		};

		game.initServer = function () {
			hub.client.receiveInvitation = function (id) {
				hub.server.confirmInvitation(id);
			};

			hub.client.receivePadPosition = function (pad2Y) {
				game.pad2.y = pad2Y;
			};

			hub.client.receivePointStart = function (vx, vy) {
				game.pointStarted = true;
				game.ball.vx = vx;
				game.ball.vy = vy;
			};

			hub.client.receivePointEnd = function (score1, score2, hasBall) {
				game.pointStarted = false;
				game.hasBall = hasBall;
				game.resetBall();
				game.resetPads();
				$("#player1 .score").text(score1);
				$("#player2 .score").text(score2);
			};

			hub.client.startGame = function (opponentName, hasBall) {
				showMessage(opponentName + " joined");
				$("#player2 .name").text(opponentName);
				game.start(hasBall);
			};

			hub.client.opponentLeft = function (name) {
				showMessage(name + " left");
				$("#player2 .name").text("");

				game.started = false;
			};

			$.connection.hub.start({}, function () {
				showMessage("Waiting for an opponent");
				hub.server.join().done(function (result) {
					$("#player1 .name").text(result);
				});
			});
		};

		game.init = function () {
			this.resetPads();

			this.initServer();

			window.onkeydown = function (e) {
				game.keysDown[e.keyCode] = true;
			};

			window.onkeyup = function (e) {
				game.keysDown[e.keyCode] = false;
			};

			$(window).unload(function () {
				hub.leave();
				console.log("leave");
			});

			this.lastFrameTime = +new Date;
			this.gameLoop();
		};

		game.resetPads = function () {
			this.pad1.x = 0;
			this.pad1.y = (canvas.height - this.pad1.height) / 2;

			this.pad2.x = canvas.width - this.pad2.width;
			this.pad2.y = (canvas.height - this.pad2.height) / 2;
		};

		game.start = function (hasBall) {
			this.hasBall = hasBall;
			this.started = true;
			this.resetPads();
			this.resetBall(hasBall);
		};

		game.resetBall = function () {
			if (this.hasBall) {
				this.ball.x = this.pad1.x + this.pad1.width + this.ball.radius;
			} else {
				this.ball.x = this.pad2.x - this.ball.radius;
			}

			this.ball.y = canvas.height / 2 - this.ball.radius / 2;
		};

		game.gameLoop = function () {
			var t = +new Date;
			var dt = t - this.lastFrameTime;

			this.updateScene(t, dt);
			this.drawFrame();

			this.lastFrameTime = t;

			window.requestAnimFrame(game.gameLoop.bind(game), canvas);
		};

		game.updatePad = function (dt) {
			var previousPad1Y = this.pad1.y;

			if (this.keysDown[keyCodes.up]) {
				this.pad1.y -= 50 / dt;
				this.pad1.y = Math.max(0, this.pad1.y);
			}
			if (this.keysDown[keyCodes.down]) {
				this.pad1.y += 50 / dt;
				this.pad1.y = Math.min(canvas.height - this.pad1.height, this.pad1.y);
			}

			if (previousPad1Y !== this.pad1.y) {
				hub.server.sendPadPosition(this.pad1.y);
			}
		};

		var minX = game.pad1.width + game.ball.radius;
		var maxX = canvas.width - game.pad2.width - game.ball.radius;
		var minY = game.ball.radius;
		var maxY = canvas.height - game.ball.radius;

		game.updateBall = function (dt) {
			if (!this.pointStarted) return;

			this.ball.x += this.ball.vx * dt;
			this.ball.y += this.ball.vy * dt;

			if (this.ball.x <= minX) {
				if (this.ball.y >= this.pad1.y && this.ball.y <= this.pad1.y + this.pad1.height) {
					this.ball.x = 2 * minX - this.ball.x;
					this.ball.vx = -this.ball.vx;
				} else {
					this.pointStarted = false;
					hub.server.missedBall();
				}
			}

			if (this.ball.x >= maxX) {
				if (this.ball.y >= this.pad2.y && this.ball.y <= this.pad2.y + this.pad2.height) {
					this.ball.x = 2 * maxX - this.ball.x;
					this.ball.vx = -this.ball.vx;
				}
			}

			if (this.ball.y <= minY) {
				this.ball.y = 2 * minY - this.ball.y;
				this.ball.vy = -this.ball.vy;
			}

			if (this.ball.y >= maxY) {
				this.ball.y = 2 * maxY - this.ball.y;
				this.ball.vy = -this.ball.vy;
			}
		};

		game.updateScene = function (t, dt) {
			if (!this.started) return;

			if (!this.pointStarted && this.hasBall && (this.keysDown[keyCodes.up] || this.keysDown[keyCodes.down])) {
				this.pointStarted = true;
				this.resetBall(true);
				hub.server.fireBall();
				return;
			}

			if (!this.pointStarted) return;

			this.updatePad(dt);
			this.updateBall(dt);
		};

		game.drawFrame = function () {
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillRect(this.pad1.x, this.pad1.y, this.pad1.width, this.pad1.height);
			context.fillRect(this.pad2.x, this.pad2.y, this.pad2.width, this.pad2.height);

			if (!this.started) return;

			context.beginPath();
			context.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2, true);
			context.closePath();
			context.fill();
		};

		game.init();
	};

}(window.jQuery, window));