const CoreClass = require("../core.js");

const config = require("config");
const async = require("async");
const request = require("request");
const crypto = require("crypto");

let youtubeRequestCallbacks = [];
let youtubeRequestsPending = 0;
let youtubeRequestsActive = false;

class UtilsModule extends CoreClass {
    constructor() {
        super("utils");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.io = this.moduleManager.modules["io"];
            this.db = this.moduleManager.modules["db"];
            this.spotify = this.moduleManager.modules["spotify"];
            this.cache = this.moduleManager.modules["cache"];

            resolve();
        });
    }

    PARSE_COOKIES(payload) {
        //cookieString
        return new Promise((resolve, reject) => {
            let cookies = {};
            payload.cookieString.split("; ").map((cookie) => {
                cookies[
                    cookie.substring(0, cookie.indexOf("="))
                ] = cookie.substring(cookie.indexOf("=") + 1, cookie.length);
            });
            resolve(cookies);
        });
    }

    // COOKIES_TO_STRING() {//cookies
    // 	return new Promise((resolve, reject) => {
    //         let newCookie = [];
    //         for (let prop in cookie) {
    //             newCookie.push(prop + "=" + cookie[prop]);
    //         }
    //         return newCookie.join("; ");
    //     });
    // }

    REMOVE_COOKIE(payload) {
        //cookieString, cookieName
        return new Promise(async (resolve, reject) => {
            var cookies = await this.runJob("PARSE_COOKIES", {
                cookieString: payload.cookieString,
            });
            delete cookies[payload.cookieName];
            resolve(this.toString(cookies));
        });
    }

    HTML_ENTITIES(payload) {
        //str
        return new Promise((resolve, reject) => {
            resolve(
                String(payload.str)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
            );
        });
    }

    GENERATE_RANDOM_STRING(payload) {
        //length
        return new Promise(async (resolve, reject) => {
            let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(
                ""
            );
            let result = [];
            for (let i = 0; i < payload.length; i++) {
                result.push(
                    chars[
                        await this.runJob("GET_RANDOM_NUMBER", {
                            min: 0,
                            max: chars.length - 1,
                        })
                    ]
                );
            }
            resolve(result.join(""));
        });
    }

    GET_SOCKET_FROM_ID(payload) {
        //socketId
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            resolve(io.sockets.sockets[payload.socketId]);
        });
    }

    GET_RANDOM_NUMBER(payload) {
        //min, max
        return new Promise((resolve, reject) => {
            resolve(
                Math.floor(Math.random() * (payload.max - payload.min + 1)) +
                    payload.min
            );
        });
    }

    CONVERT_TIME(payload) {
        //duration
        return new Promise((resolve, reject) => {
            let duration = payload.duration;
            let a = duration.match(/\d+/g);

            if (
                duration.indexOf("M") >= 0 &&
                duration.indexOf("H") == -1 &&
                duration.indexOf("S") == -1
            ) {
                a = [0, a[0], 0];
            }

            if (duration.indexOf("H") >= 0 && duration.indexOf("M") == -1) {
                a = [a[0], 0, a[1]];
            }
            if (
                duration.indexOf("H") >= 0 &&
                duration.indexOf("M") == -1 &&
                duration.indexOf("S") == -1
            ) {
                a = [a[0], 0, 0];
            }

            duration = 0;

            if (a.length == 3) {
                duration = duration + parseInt(a[0]) * 3600;
                duration = duration + parseInt(a[1]) * 60;
                duration = duration + parseInt(a[2]);
            }

            if (a.length == 2) {
                duration = duration + parseInt(a[0]) * 60;
                duration = duration + parseInt(a[1]);
            }

            if (a.length == 1) {
                duration = duration + parseInt(a[0]);
            }

            let hours = Math.floor(duration / 3600);
            let minutes = Math.floor((duration % 3600) / 60);
            let seconds = Math.floor((duration % 3600) % 60);

            resolve(
                (hours < 10 ? "0" + hours + ":" : hours + ":") +
                    (minutes < 10 ? "0" + minutes + ":" : minutes + ":") +
                    (seconds < 10 ? "0" + seconds : seconds)
            );
        });
    }

    GUID(payload) {
        return new Promise((resolve, reject) => {
            resolve(
                [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1]
                    .map((b) =>
                        b
                            ? Math.floor((1 + Math.random()) * 0x10000)
                                  .toString(16)
                                  .substring(1)
                            : "-"
                    )
                    .join("")
            );
        });
    }

    SOCKET_FROM_SESSION(payload) {
        //socketId
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            let ns = io.of("/");
            if (ns) {
                resolve(ns.connected[payload.socketId]);
            }
        });
    }

    SOCKETS_FROM_SESSION_ID(payload) {
        //sessionId, cb
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            let ns = io.of("/");
            let sockets = [];
            if (ns) {
                async.each(
                    Object.keys(ns.connected),
                    (id, next) => {
                        let session = ns.connected[id].session;
                        if (session.sessionId === payload.sessionId)
                            sockets.push(session.sessionId);
                        next();
                    },
                    () => {
                        resolve({ sockets });
                    }
                );
            }
        });
    }

    SOCKETS_FROM_USER(payload) {
        //userId, cb
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            let ns = io.of("/");
            let sockets = [];
            if (ns) {
                async.each(
                    Object.keys(ns.connected),
                    (id, next) => {
                        let session = ns.connected[id].session;
                        this.cache
                            .runJob("HGET", {
                                table: "sessions",
                                key: session.sessionId,
                            })
                            .then((session) => {
                                if (
                                    session &&
                                    session.userId === payload.userId
                                )
                                    sockets.push(ns.connected[id]);
                                next();
                            })
                            .catch(() => {
                                next();
                            });
                    },
                    () => {
                        resolve({ sockets });
                    }
                );
            }
        });
    }

    SOCKETS_FROM_IP(payload) {
        //ip, cb
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            let ns = io.of("/");
            let sockets = [];
            if (ns) {
                async.each(
                    Object.keys(ns.connected),
                    (id, next) => {
                        let session = ns.connected[id].session;
                        this.cache
                            .runJob("HGET", {
                                table: "sessions",
                                key: session.sessionId,
                            })
                            .then((session) => {
                                if (
                                    session &&
                                    ns.connected[id].ip === payload.ip
                                )
                                    sockets.push(ns.connected[id]);
                                next();
                            })
                            .catch((err) => {
                                next();
                            });
                    },
                    () => {
                        resolve({ sockets });
                    }
                );
            }
        });
    }

    SOCKETS_FROM_USER_WITHOUT_CACHE(payload) {
        //userId, cb
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            let ns = io.of("/");
            let sockets = [];
            if (ns) {
                async.each(
                    Object.keys(ns.connected),
                    (id, next) => {
                        let session = ns.connected[id].session;
                        if (session.userId === payload.userId)
                            sockets.push(ns.connected[id]);
                        next();
                    },
                    () => {
                        resolve({ sockets });
                    }
                );
            }
        });
    }

    SOCKET_LEAVE_ROOMS(payload) {
        //socketId
        return new Promise(async (resolve, reject) => {
            let socket = await this.runJob("SOCKET_FROM_SESSION", {
                socketId: payload.socketId,
            });
            let rooms = socket.rooms;
            for (let room in rooms) {
                socket.leave(room);
            }

            resolve();
        });
    }

    SOCKET_JOIN_ROOM(payload) {
        //socketId, room
        return new Promise(async (resolve, reject) => {
            let socket = await this.runJob("SOCKET_FROM_SESSION", {
                socketId: payload.socketId,
            });
            let rooms = socket.rooms;
            for (let room in rooms) {
                socket.leave(room);
            }
            socket.join(payload.room);
            resolve();
        });
    }

    SOCKET_JOIN_SONG_ROOM(payload) {
        //socketId, room
        return new Promise(async (resolve, reject) => {
            let socket = await this.runJob("SOCKET_FROM_SESSION", {
                socketId: payload.socketId,
            });
            let rooms = socket.rooms;
            for (let room in rooms) {
                if (room.indexOf("song.") !== -1) socket.leave(rooms);
            }
            socket.join(payload.room);
            resolve();
        });
    }

    SOCKETS_JOIN_SONG_ROOM(payload) {
        //sockets, room
        return new Promise((resolve, reject) => {
            for (let id in payload.sockets) {
                let socket = payload.sockets[id];
                let rooms = socket.rooms;
                for (let room in rooms) {
                    if (room.indexOf("song.") !== -1) socket.leave(room);
                }
                socket.join(payload.room);
            }
            resolve();
        });
    }

    SOCKETS_LEAVE_SONG_ROOMS(payload) {
        //sockets
        return new Promise((resolve, reject) => {
            for (let id in payload.sockets) {
                let socket = payload.sockets[id];
                let rooms = socket.rooms;
                for (let room in rooms) {
                    if (room.indexOf("song.") !== -1) socket.leave(room);
                }
            }
            resolve();
        });
    }

    EMIT_TO_ROOM(payload) {
        //room, ...args
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            let sockets = io.sockets.sockets;
            for (let id in sockets) {
                let socket = sockets[id];
                if (socket.rooms[payload.room]) {
                    socket.emit.apply(socket, payload.args);
                }
            }
            resolve();
        });
    }

    GET_ROOM_SOCKETS(payload) {
        //room
        return new Promise(async (resolve, reject) => {
            let io = await this.io.runJob("IO", {});
            let sockets = io.sockets.sockets;
            let roomSockets = [];
            for (let id in sockets) {
                let socket = sockets[id];
                if (socket.rooms[payload.room]) roomSockets.push(socket);
            }
            resolve(roomSockets);
        });
    }

    GET_SONG_FROM_YOUTUBE(payload) {
        //songId, cb
        return new Promise((resolve, reject) => {
            youtubeRequestCallbacks.push({
                cb: (test) => {
                    youtubeRequestsActive = true;
                    const youtubeParams = [
                        "part=snippet,contentDetails,statistics,status",
                        `id=${encodeURIComponent(payload.songId)}`,
                        `key=${config.get("apis.youtube.key")}`,
                    ].join("&");

                    request(
                        `https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`,
                        (err, res, body) => {
                            youtubeRequestCallbacks.splice(0, 1);
                            if (youtubeRequestCallbacks.length > 0) {
                                youtubeRequestCallbacks[0].cb(
                                    youtubeRequestCallbacks[0].songId
                                );
                            } else youtubeRequestsActive = false;

                            if (err) {
                                console.error(err);
                                return null;
                            }

                            body = JSON.parse(body);

                            //TODO Clean up duration converter
                            let dur = body.items[0].contentDetails.duration;
                            dur = dur.replace("PT", "");
                            let duration = 0;
                            dur = dur.replace(/([\d]*)H/, (v, v2) => {
                                v2 = Number(v2);
                                duration = v2 * 60 * 60;
                                return "";
                            });
                            dur = dur.replace(/([\d]*)M/, (v, v2) => {
                                v2 = Number(v2);
                                duration += v2 * 60;
                                return "";
                            });
                            dur = dur.replace(/([\d]*)S/, (v, v2) => {
                                v2 = Number(v2);
                                duration += v2;
                                return "";
                            });

                            let song = {
                                songId: body.items[0].id,
                                title: body.items[0].snippet.title,
                                duration,
                            };
                            resolve({ song });
                        }
                    );
                },
                songId: payload.songId,
            });

            if (!youtubeRequestsActive) {
                youtubeRequestCallbacks[0].cb(
                    youtubeRequestCallbacks[0].songId
                );
            }
        });
    }

    FILTER_MUSIC_VIDEOS_YOUTUBE(payload) {
        //videoIds, cb
        return new Promise((resolve, reject) => {
            function getNextPage(cb2) {
                let localVideoIds = payload.videoIds.splice(0, 50);

                const youtubeParams = [
                    "part=topicDetails",
                    `id=${encodeURIComponent(localVideoIds.join(","))}`,
                    `maxResults=50`,
                    `key=${config.get("apis.youtube.key")}`,
                ].join("&");

                request(
                    `https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`,
                    async (err, res, body) => {
                        if (err) {
                            console.error(err);
                            return next("Failed to find playlist from YouTube");
                        }

                        body = JSON.parse(body);

                        let songIds = [];
                        body.items.forEach((item) => {
                            const songId = item.id;
                            if (!item.topicDetails) return;
                            else if (
                                item.topicDetails.topicIds.indexOf(
                                    "/m/04rlf"
                                ) !== -1
                            ) {
                                songIds.push(songId);
                            }
                        });

                        if (payload.videoIds.length > 0) {
                            getNextPage((newSongIds) => {
                                cb2(songIds.concat(newSongIds));
                            });
                        } else cb2(songIds);
                    }
                );
            }

            if (payload.videoIds.length === 0) resolve({ songIds: [] });
            else
                getNextPage((songIds) => {
                    resolve({ songIds });
                });
        });
    }

    GET_PLAYLIST_FROM_YOUTUBE(payload) {
        //url, musicOnly, cb
        return new Promise((resolve, reject) => {
            let local = this;

            let name = "list".replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
            let playlistId = regex.exec(payload.url)[1];

            function getPage(pageToken, songs) {
                let nextPageToken = pageToken ? `pageToken=${pageToken}` : "";
                const youtubeParams = [
                    "part=contentDetails",
                    `playlistId=${encodeURIComponent(playlistId)}`,
                    `maxResults=50`,
                    `key=${config.get("apis.youtube.key")}`,
                    nextPageToken,
                ].join("&");

                request(
                    `https://www.googleapis.com/youtube/v3/playlistItems?${youtubeParams}`,
                    async (err, res, body) => {
                        if (err) {
                            console.error(err);
                            return next("Failed to find playlist from YouTube");
                        }

                        body = JSON.parse(body);
                        songs = songs.concat(body.items);
                        if (body.nextPageToken)
                            getPage(body.nextPageToken, songs);
                        else {
                            songs = songs.map(
                                (song) => song.contentDetails.videoId
                            );
                            if (!payload.musicOnly) resolve({ songs });
                            else {
                                local
                                    .runJob("FILTER_MUSIC_VIDEOS_YOUTUBE", {
                                        videoIds: songs.slice(),
                                    })
                                    .resolve((filteredSongs) => {
                                        resolve({ filteredSongs, songs });
                                    });
                            }
                        }
                    }
                );
            }
            getPage(null, []);
        });
    }

    GET_SONG_FROM_SPOTIFY(payload) {
        //song, cb
        return new Promise(async (resolve, reject) => {
            if (!config.get("apis.spotify.enabled"))
                return reject(new Error("Spotify is not enabled."));

            const song = Object.assign({}, payload.song);

            const spotifyParams = [
                `q=${encodeURIComponent(payload.song.title)}`,
                `type=track`,
            ].join("&");

            const token = await this.spotify.runJob("GET_TOKEN", {});
            const options = {
                url: `https://api.spotify.com/v1/search?${spotifyParams}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            request(options, (err, res, body) => {
                if (err) console.error(err);
                body = JSON.parse(body);
                if (body.error) console.error(body.error);

                durationArtistLoop: for (let i in body) {
                    let items = body[i].items;
                    for (let j in items) {
                        let item = items[j];
                        let hasArtist = false;
                        for (let k = 0; k < item.artists.length; k++) {
                            let artist = item.artists[k];
                            if (song.title.indexOf(artist.name) !== -1)
                                hasArtist = true;
                        }
                        if (hasArtist && song.title.indexOf(item.name) !== -1) {
                            song.duration = item.duration_ms / 1000;
                            song.artists = item.artists.map((artist) => {
                                return artist.name;
                            });
                            song.title = item.name;
                            song.explicit = item.explicit;
                            song.thumbnail = item.album.images[1].url;
                            break durationArtistLoop;
                        }
                    }
                }

                resolve({ song });
            });
        });
    }

    GET_SONGS_FROM_SPOTIFY(payload) {
        //title, artist, cb
        return new Promise(async (resolve, reject) => {
            if (!config.get("apis.spotify.enabled"))
                return reject(new Error("Spotify is not enabled."));

            const spotifyParams = [
                `q=${encodeURIComponent(payload.title)}`,
                `type=track`,
            ].join("&");

            const token = await this.spotify.runJob("GET_TOKEN", {});
            const options = {
                url: `https://api.spotify.com/v1/search?${spotifyParams}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            request(options, (err, res, body) => {
                if (err) return console.error(err);
                body = JSON.parse(body);
                if (body.error) return console.error(body.error);

                let songs = [];

                for (let i in body) {
                    let items = body[i].items;
                    for (let j in items) {
                        let item = items[j];
                        let hasArtist = false;
                        for (let k = 0; k < item.artists.length; k++) {
                            let localArtist = item.artists[k];
                            if (
                                payload.artist.toLowerCase() ===
                                localArtist.name.toLowerCase()
                            )
                                hasArtist = true;
                        }
                        if (
                            hasArtist &&
                            (payload.title.indexOf(item.name) !== -1 ||
                                item.name.indexOf(payload.title) !== -1)
                        ) {
                            let song = {};
                            song.duration = item.duration_ms / 1000;
                            song.artists = item.artists.map((artist) => {
                                return artist.name;
                            });
                            song.title = item.name;
                            song.explicit = item.explicit;
                            song.thumbnail = item.album.images[1].url;
                            songs.push(song);
                        }
                    }
                }

                resolve({ songs });
            });
        });
    }

    SHUFFLE(payload) {
        //array
        return new Promise((resolve, reject) => {
            const array = payload.array.slice();

            let currentIndex = payload.array.length,
                temporaryValue,
                randomIndex;

            // While there remain elements to shuffle...
            while (0 !== currentIndex) {
                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;

                // And swap it with the current element.
                temporaryValue = array[currentIndex];
                array[currentIndex] = array[randomIndex];
                array[randomIndex] = temporaryValue;
            }

            return array;
        });
    }

    GET_ERROR(payload) {
        //err
        return new Promise((resolve, reject) => {
            let error = "An error occurred.";
            if (typeof payload.error === "string") error = payload.error;
            else if (payload.error.message) {
                if (payload.error.message !== "Validation failed")
                    error = payload.error.message;
                else
                    error =
                        payload.error.errors[Object.keys(payload.error.errors)]
                            .message;
            }
            resolve(error);
        });
    }

    CREATE_GRAVATAR(payload) {
        //email
        return new Promise((resolve, reject) => {
            const hash = crypto
                .createHash("md5")
                .update(payload.email)
                .digest("hex");

            resolve(`https://www.gravatar.com/avatar/${hash}`);
        });
    }
}

module.exports = new UtilsModule();
