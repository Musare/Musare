import { defineStore } from "pinia";
import { ComputedRef, Ref } from "vue";
import { Song } from "@/types/song";
import { Report } from "@/types/report";

export const useEditSongStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`editSong-${modalUuid}`, {
		state: (): {
			video: {
				player: any;
				paused: boolean;
				playerReady: boolean;
				autoPlayed: boolean;
				currentTime: number;
				playbackRate: 0.5 | 1 | 2;
			};
			youtubeId: string;
			song: Song;
			reports: Report[];
			tab: "discogs" | "reports" | "youtube" | "musare-songs";
			newSong: boolean;
			prefillData: any;
			bulk: boolean;
			youtubeIds: string[];
			songPrefillData: any;
			form: {
				inputs: Ref<
					Record<
						string,
						| {
								value: any;
								originalValue: any;
								validate?: (value: any) => boolean | string;
								errors: string[];
								ref: Ref;
								sourceChanged: boolean;
								required: boolean;
								ignoreUnsaved: boolean;
						  }
						| any
					>
				>;
				unsavedChanges: ComputedRef<string[]>;
				save: (saveCb?: () => void) => void;
				setValue: (value: Record<string, any>, reset?: boolean) => void;
				setOriginalValue: (value: Record<string, any>) => void;
			};
		} => ({
			video: {
				player: null,
				paused: true,
				playerReady: false,
				autoPlayed: false,
				currentTime: 0,
				playbackRate: 1
			},
			youtubeId: null,
			song: {},
			reports: [],
			tab: "discogs",
			newSong: false,
			prefillData: {},
			bulk: false,
			youtubeIds: [],
			songPrefillData: {},
			form: {}
		}),
		actions: {
			init({ song, songs }) {
				if (songs) {
					this.bulk = true;
					this.youtubeIds = songs.map(song => song.youtubeId);
					this.songPrefillData = Object.fromEntries(
						songs.map(song => [
							song.youtubeId,
							song.prefill ? song.prefill : {}
						])
					);
				} else this.editSong(song);
			},
			showTab(tab) {
				this.tab = tab;
			},
			editSong(song) {
				this.newSong = !!song.newSong || !song._id;
				this.youtubeId = song.youtubeId || null;
				this.prefillData = song.prefill ? song.prefill : {};
			},
			setSong(song, reset?: boolean) {
				if (song.discogs === undefined) song.discogs = null;
				this.song = JSON.parse(JSON.stringify(song));
				this.newSong = !song._id;
				this.youtubeId = song.youtubeId;
				const formSong = {
					title: song.title,
					duration: song.duration,
					skipDuration: song.skipDuration,
					thumbnail: song.thumbnail,
					youtubeId: song.youtubeId,
					verified: song.verified,
					addArtist: "",
					artists: song.artists,
					addGenre: "",
					genres: song.genres,
					addTag: "",
					tags: song.tags,
					discogs: song.discogs
				};
				if (reset) this.form.setValue(formSong, true);
				else this.form.setOriginalValue(formSong);
			},
			resetSong(youtubeId) {
				if (this.youtubeId === youtubeId) this.youtubeId = "";
				if (this.song && this.song.youtubeId === youtubeId) {
					this.song = {};
					if (this.form.setValue)
						this.form.setValue(
							{
								title: "",
								duration: 0,
								skipDuration: 0,
								thumbnail: "",
								youtubeId: "",
								verified: false,
								addArtist: "",
								artists: [],
								addGenre: "",
								genres: [],
								addTag: "",
								tags: [],
								discogs: {}
							},
							true
						);
				}
			},
			stopVideo() {
				if (this.video.player && this.video.player.pauseVideo) {
					this.video.player.pauseVideo();
					this.video.player.seekTo(0);
				}
			},
			hardStopVideo() {
				if (this.video.player && this.video.player.stopVideo) {
					this.video.player.stopVideo();
				}
			},
			loadVideoById(id, skipDuration) {
				this.form.setValue({ duration: -1 });
				this.video.player.loadVideoById(id, skipDuration);
			},
			pauseVideo(status) {
				if (
					(this.video.player && this.video.player.pauseVideo) ||
					this.video.playVideo
				) {
					if (status) this.video.player.pauseVideo();
					else this.video.player.playVideo();
				}
				this.video.paused = status;
			},
			selectDiscogsInfo(discogsInfo) {
				this.form.setValue({ discogs: discogsInfo });
			},
			updateReports(reports) {
				this.reports = reports;
			},
			resolveReport(reportId) {
				this.reports = this.reports.filter(
					report => report._id !== reportId
				);
			},
			updateYoutubeId(youtubeId) {
				this.form.setValue({ youtubeId });
				this.loadVideoById(youtubeId, 0);
			},
			setPlaybackRate(rate) {
				if (rate) {
					this.video.playbackRate = rate;
					this.video.player.setPlaybackRate(rate);
				} else if (
					this.video.player.getPlaybackRate() !== undefined &&
					this.video.playbackRate !==
						this.video.player.getPlaybackRate()
				) {
					this.video.player.setPlaybackRate(this.video.playbackRate);
					this.video.playbackRate =
						this.video.player.getPlaybackRate();
				}
			}
		}
	})();
