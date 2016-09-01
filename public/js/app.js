window.onload = function () {

	var socket = io();

	socket.on('disconnect', function () {
		console.log('Disconnected from server');
	});

	socket.on('search', function (res) {
		console.log(res);
	});

	var data = {
		user: {
			id: null
		},
		modals: {
			register: {
				visible: false,
				email: "",
				username: "",
				password: ""
			},
			account: {
				visible: false
			},
			donate: {
				visible: false
			},
			project: {
				visible: false
			}
		},
		home: {
			visible: false,
			groups: [
				{
					id: "lu08gw56571r4497wrk9",
					name: "Official Rooms",
					rooms: [
						{ id: "73qvw65746acvo8yqfr", name: "Country", description: "Country Music", users: 10 },
						{ id: "enxcysmhn1k7ld56ogvi", name: "Pop", description: "Pop Music", users: 14 },
						{ id: "kqa99gbva7lij05dn29", name: "Chill", description: "Chill Music", users: 13 },
						{ id: "w19hu791iiub6wmjf9a4i", name: "EDM", description: "EDM Music", users: 13 }
					]
				},
				{
					id: "g2b8v03xaedj8ht1emi",
					name: "Trending Rooms",
					rooms: [
						{ id: "73qvw65746acvo8yqfr", name: "Country", description: "Country Music", users: 10 },
						{ id: "enxcysmhn1k7ld56ogvi", name: "Pop", description: "Pop Music", users: 14 },
						{ id: "kqa99gbva7lij05dn29", name: "Chill", description: "Chill Music", users: 13 },
						{ id: "w19hu791iiub6wmjf9a4i", name: "EDM", description: "EDM Music", users: 13 }
					]
				}
			]
		},
		room: {
			visible: false,
			id: "",
			name: "",
			description: "",
			player: {

			},
			chat: {
				visible: false,
				messages: []
			},
			users: {
				list: {}
			},
			playlist: {
				visible: false,
				messages: []
			}
		}
	};

	var methods = {
		leaveRoom: function () {
			data.room.visible = false;
			window.setTimeout(function () { data.home.visible = true; }, 500);
		},
		enterRoom: function (room) {
			data.home.visible = false;
			window.setTimeout(function () { data.room.visible = true; }, 500);
			data.room.id = room.id;
			data.room.name = room.name;
			data.room.description = room.description;
		},
		modalVisibilityChange: function (name) {
			var modal = data.modals[name];
			if (modal) {
				switch (name) {
					case 'register': {
						data.modals.register.email = "";
						data.modals.register.username = "";
						data.modals.register.password = "";
						grecaptcha.reset();
					} break;
				}
			}
		},
		showModal: function (name) {
			Object.keys(data.modals).forEach(function (key) {
				var visibility = data.modals[key].visible;
				data.modals[key].visible = (key == name);
				if (visibility != data.modals[key].visible) {
					methods.modalVisibilityChange(key);
				}
			});
		},
		modalVisible: function (name) {
			var visible = false;
			// check if the specific modal is visible
			if (name) {
				Object.keys(data.modals).forEach(function (key) { if (key == name) visible = data.modals[key].visible; });
			}
			// check if any of them are visible
			else {
				Object.keys(data.modals).forEach(function (key) { if (visible == false) visible = data.modals[key].visible; });
			}
			return visible;
		},
		modalPositionStyle: function (name, width, height) {
			return {
				width: width + 'px',
				height: height + 'px',
				left: 'calc(50% - ' + (width / 2) + 'px)',
				top: (data.modals[name].visible ? 'calc(50% - ' + (height / 2) + 'px)' : '-' + (height + 32) + 'px')
			}
		},
		register: function () {
			socket.emit('register', {
				email: data.modals.register.email,
				username: data.modals.register.username,
				password: data.modals.register.password,
				recaptcha: grecaptcha.getResponse()
			});
		}
	};

	var app = new Vue({ el: '#app', data: data, methods: methods, ready: function () { window.setTimeout(function () { data.home.visible = true; }, 250); } });

	window.socket = socket;
	window.data = data;
};