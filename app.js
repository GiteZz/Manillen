var express = require('express');
var app = express();
var serv = require('http').Server(app);
app.get('/',function(req,res){
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log('Server Started!');

var io = require('socket.io')(serv,{});

var SOCKET_LIST_PLAYERS = [];
var SOCKET_LIST_WATCHERS = [];
var PLAYER_LIST = [1,2,3,4];
var playInit = 0;
var avIDs = [0,1,2,3];
var avLOC = [3,2,1,0];
var currentPlayer;
var troefBool = false;
var troef;

var current_card = [];

var player_n;

var startPlayer;

var orStarterPlayer = 0;

var cardList = ["7","8","9","V","D","R","A","10"];
//1 en 3
var wiederKaarten = [];
//2 en 4
var ziederKaarten = [];

var rounds = 0;

var wScore = 0;
var zScore = 0;

var plays = [];

var aConnections = 0;

io.sockets.on('connection',function(socket){
	var player;
	var isPlayer;
	console.log('socket connection!');
	aConnections++;
	
	
	socket.emit('qLocation',avLOC);

	//ask and rec location
	
	socket.on('aLocation',function(data){
		
		if(data === "Viewer"){
			SOCKET_LIST_WATCHERS.push(socket);
			isPlayer = false;
		}else{
			isPlayer = true;
			player = new Array();
			
			socket.id = avIDs[0];
			avIDs.splice(0,1);
			
			SOCKET_LIST_PLAYERS[socket.id] = socket;
			player.push(socket.id);
			
			
			var rec_loc = avLOC.indexOf(parseInt(data.charAt(1)));
			
			PLAYER_LIST[rec_loc] = player;
			
			playInit++;
			
			if(avIDs.length == 0 && playInit==4){
				
				startPlayer = 0;
				startGame();
			}
			
			console.log('Location recieved' + data);
			console.log(PLAYER_LIST)
		}
		
	});
	
	
	var temp = socket.id;

	socket.on('disconnect',function(){
		if(isPlayer){
			avIDs.push(socket.id);
			SOCKET_LIST_PLAYERS.splice(socket.id,1);
		}else{
			
		}
		
	});
	
	//Starts the game
	
	socket.on('aTroef',function(data){
		console.log('new troef chosen' + data);
		troefBool = true;
		troef = PLAYER_LIST[orStarterPlayer][1][data].charAt(0);
		console.log(troef);
		
		for(var i in SOCKET_LIST_PLAYERS){
			SOCKET_LIST_PLAYERS[i].emit('eTroef',troef);
		}
		currentPlayer = orStarterPlayer + 1;
		startPlayer = orStarterPlayer + 1;
		orStarterPlayer++;
		
		play();
	});
	
	socket.on('aPlay',function(data){
		var cur_car = PLAYER_LIST[currentPlayer][1][data];
		current_card.push(cur_car);
		
		for(var i in SOCKET_LIST_PLAYERS){
			SOCKET_LIST_PLAYERS[i].emit('pCard',cur_car);
		}
		
		if(current_card.length !== 4){
			console.log('plays not equal to 4, next player');
			currentPlayer = (currentPlayer+1)%4;
			play();
		}else{
			console.log('plays equal to 4, determine score');
			rounds++;
			var troef_loc = [];
			var winner = 0;
			var aTroef = 0;
			for(var i in current_card){
				if(current_card[i].charAt(0) === troef)troef_loc.push(i);
			}
			if(troef_loc.length === 0){
				console.log('No troef on tbale');
				
				var card1 = current_card[0];
				var card2;
				for(var i = 1; i < 4; i++){
					card2 = current_card[i];
					console.log('comp test');
					var index1 = cardList.indexOf(card1.slice(1));
					var index2 = cardList.indexOf(card2.slice(1));
					console.log(index1);
					console.log(index2);
					
					if( index2 > index1 && card1.charAt(0)===card2.charAt(0)){
						card1 = card2;
						winner = i;
					}
				}
			}else{
				if(troef_loc.length === 1){
					winner = troef_loc[0];
				}else{
					winner = troef_loc[0];
					var card1 = current_card[troef_loc[0]];
					var card2;
					for(var i = 1; i < troef_loc.length; i++){
						card2 = current_card[troef_loc[i]];
						if(cardList.indexOf(card1.slice(1)) < cardList.indexOf(card2.slice(1)) && card1.charAt(0)===card2.charAt(0)){
							card1 = card2;
							winner = troef_loc[i];
						}
					}
				}
			}
			
			
			setTimeout(function(){
				for(var i in SOCKET_LIST_PLAYERS){
					SOCKET_LIST_PLAYERS[i].emit('clearPlayCards');
				}
			},1000);
			
			
			
			console.log('=======> winner: ' + winner);
			console.log('=======> startPlayer: ' + startPlayer);
			
			var som = parseInt(startPlayer) + parseInt(winner);
			
			console.log('=======> som: ' + som);
			
			currentPlayer = som%4;
			console.log('=======> currentPlayer: ' + currentPlayer);

			startPlayer = currentPlayer;
			console.log('=======> startPlayer: ' + startPlayer);
			
			if(startPlayer == 0 || startPlayer == 2){
				for(var i in current_card){
					wiederKaarten.push(current_card[i]);
				}
			}
			
			if(startPlayer == 1 || startPlayer == 3){
				for(var i in current_card){
					ziederKaarten.push(current_card[i]);
				}
			}
			
			current_card = [];
			
			if(rounds !== 8){
				console.log('rounds not equal to 8');
				play();
			}else{
				console.log('rounds equal to 8');
				for(var i in wiederKaarten){
					var cs = cardList.indexOf(wiederKaarten[i].slice(1)) - 2;
					if(cs > 0)wScore += cs;
				}
				
				for(var i in ziederKaarten){
					var cs = cardList.indexOf(ziederKaarten[i].slice(1)) - 2;
					if(cs > 0)zScore += cs;
				}
				
				for(var i in SOCKET_LIST_PLAYERS){
					SOCKET_LIST_PLAYERS[i].emit('scores',{
						w:wScore,
						z:zScore
					});
				}
				
				wiederKaarten = [];
				ziederKaarten = [];
			}
			
		}
		
		
	});
	});

function sendRandom(){

	// K P H C
	//7 8 9 V D R A 10
	var cards = ["K7","K8","K9","KV","KD","KR","KA","K10",
				 "C7","C8","C9","CV","CD","CR","CA","C10",
				 "H7","H8","H9","HV","HD","HR","HA","H10",
				 "P7","P8","P9","PV","PD","PR","PA","P10"];

	shuffle(cards);
	shuffle(cards);
	shuffle(cards);
	shuffle(cards);
	shuffle(cards);
	shuffle(cards);
	shuffle(cards);
	
	for(var i = 0; i< 4; i++){
		var c = cards.slice(i*8,(i+1)*8);
		
		c.sort();
		PLAYER_LIST[i].push(c);
		SOCKET_LIST_PLAYERS[PLAYER_LIST[i][0]].emit('sendCards',c);
	}
	

	console.log("cards sent");
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

/*
setInterval(function(){
	for(var i in SOCKET_LIST_PLAYERS){
		var socket = SOCKET_LIST_PLAYERS[i];
		
		socket.emit('id',{
			id:socket.id
		});
	}
},1000);
*/

function startGame(){
	for(var i in SOCKET_LIST_PLAYERS){
		SOCKET_LIST_PLAYERS[i].emit('gameStarted');
	}
	sendRandom();

	console.log("game_started!");

	SOCKET_LIST_PLAYERS[PLAYER_LIST[orStarterPlayer][0]].emit('qTroef');
	currentPlayer = orStarterPlayer;
}

function play(){
	console.log('play command issued, with currentplayer:  ' + currentPlayer);
	SOCKET_LIST_PLAYERS[PLAYER_LIST[currentPlayer][0]].emit('play');
}
