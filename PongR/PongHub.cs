using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using System.Threading.Tasks;
using System.Diagnostics;

namespace PongR
{
	[HubName("pong")]
	public class PongHub : Hub
	{
		private static readonly Dictionary<string, Player> Players =
			new Dictionary<string, Player>(StringComparer.OrdinalIgnoreCase);

		private static int playerNumber = 1;

		public void Leave()
		{
			Player player;
			if (!Players.TryGetValue(this.Context.ConnectionId, out player)) return;

			Players.Remove(this.Context.ConnectionId);

			Player opponent = player.Opponent;

			if (player.Game != null)
			{
				player.Game.Stop();
				player.Game = null;
			}

			if (opponent != null)
			{
				opponent.Game = null;
				opponent.IsAvailable = true;
				this.Clients.Client(opponent.Id).opponentLeft(player.Name);
			}
		}

		public string Join()
		{
			Player player;
			if (!Players.TryGetValue(this.Context.ConnectionId, out player))
			{
				player = new Player
				{
					Id = this.Context.ConnectionId,
					Name = "Player " + (playerNumber++)
				};
				Players.Add(player.Id, player);
			}

			Player opponent = Players.Values.FirstOrDefault(p => p.Id != player.Id && p.Game == null && p.IsAvailable);
			if (opponent != null)
			{
				opponent.IsAvailable = false;
				this.Clients.Client(opponent.Id).receiveInvitation(player.Id);
			}

			return player.Name;
		}

		public void ConfirmInvitation(string clientId)
		{
			this.CreateGame(this.Context.ConnectionId, clientId);
		}

		private void CreateGame(string clientId1, string clientId2)
		{
			Game game = new Game(this, Players[clientId1], Players[clientId2]);

			this.Clients.Client(game.Player1.Id).startGame(game.Player2.Name, true);
			this.Clients.Client(game.Player2.Id).startGame(game.Player1.Name, false);
		}

		public void FireBall()
		{
			Player player;
			if (!Players.TryGetValue(this.Context.ConnectionId, out player)) return;
			if (player.Game == null) return;

			player.Game.FireBall(player);
		}

		public void MissedBall()
		{
			Player player;
			if (!Players.TryGetValue(this.Context.ConnectionId, out player)) return;
			if (player.Game == null) return;

			player.Game.MissedBall(player);
		}

		public void SendPadPosition(double y)
		{
			Player player;
			if (!Players.TryGetValue(this.Context.ConnectionId, out player)) return;

			player.Pad.Y = y;

			Player opponent = player.Opponent;
			if (opponent == null) return;

			this.Clients.Client(opponent.Id).receivePadPosition(y);
		}

		public override Task OnDisconnected(bool stopCalled)
		{
			Debug.WriteLine("OnDisconnected: " + this.Context.ConnectionId);

			this.Leave();

			return base.OnDisconnected(stopCalled);
		}

		public override Task OnReconnected()
		{
			Debug.WriteLine("OnReconnected: " + this.Context.ConnectionId);

			return base.OnReconnected();
		}

		public override Task OnConnected()
		{
			Debug.WriteLine("OnConnected: " + this.Context.ConnectionId);

			return base.OnConnected();
		}
	}

	internal struct Ball
	{
		public double X, Y, Vx, Vy;
	}

	internal struct Pad
	{
		public double X, Y;
	}

	internal class Game
	{
		private const int Width = 800,
						  Height = 600,
						  PadWidth = 20,
						  PadHeight = 100,
						  BallRadius = 10;

		private const double Speed = 0.4;

		private readonly PongHub hub;
		private Player playerWhoHasBall;
		private bool isPlaying = false;
		private readonly Random random = new Random();

		public Game(PongHub hub, Player player1, Player player2)
		{
			this.hub = hub;
			this.Player1 = this.playerWhoHasBall = player1;
			this.Player2 = player2;

			player1.Game = player2.Game = this;
			player1.Points = player2.Points = 0;

			this.Player1.Pad.Y = this.Player2.Pad.Y = Height / 2 - PadHeight / 2;
		}

		public Player Player1 { get; private set; }
		public Player Player2 { get; private set; }

		public void Stop()
		{
		}

		public void FireBall(Player player)
		{
			if (isPlaying || player != this.playerWhoHasBall) return;

			playerWhoHasBall = null;
			isPlaying = true;

			const double maxAngle = Math.PI * 2 / 3;
			double angle = random.NextDouble() * maxAngle - (maxAngle / 2);
			double vx = Speed * Math.Cos(angle);
			double vy = Speed * Math.Sin(angle);

			hub.Clients.Client(player.Id).receivePointStart(vx, vy);
			hub.Clients.Client(player.Opponent.Id).receivePointStart(-vx, vy);
		}

		public void MissedBall(Player player)
		{
			if (!isPlaying) return;
			isPlaying = false;

			Player opponent = player.Opponent;

			playerWhoHasBall = opponent;

			opponent.Points++;

			hub.Clients.Client(player.Id).receivePointEnd(player.Points, opponent.Points, false);
			hub.Clients.Client(opponent.Id).receivePointEnd(opponent.Points, player.Points, true);
		}
	}

	internal class Player
	{
		public Player()
		{
			this.IsAvailable = true;
		}

		public string Id { get; set; }
		public string Name { get; set; }
		public bool IsAvailable { get; set; }
		public int Points { get; set; }
		public Game Game { get; set; }

		public Pad Pad;

		public Player Opponent
		{
			get { return this.Game == null ? null : this.Game.Player1 == this ? this.Game.Player2 : this.Game.Player1; }
		}
	}
}