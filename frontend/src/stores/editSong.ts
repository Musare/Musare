import { defineStore } from "pinia";
import { ComputedRef, Ref } from "vue";
import { Song } from "@/types/song";
import { Report } from "@/types/report";

export const useEditSongStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`editSong-${modalUuid}`, {
		state: () => ({
			video: {
				player: null,
				paused: true,
				playerReady: false,
				autoPlayed: false,
				currentTime: 0,
				playbackRate: 1
			},
			youtubeId: null,
			song: <Song>{},
			reports: <Report[]>[],
			tab: "discogs",
			newSong: false,
			prefillData: {},
			bulk: false,
			youtubeIds: [],
			songPrefillData: {},
			form: <
				{
					inputs: Ref<{
						[key: string]:
							| {
									value: any;
									originalValue: any;
									validate?: (value: any) => boolean | string;
									errors: string[];
									ref: Ref;
									sourceChanged: boolean;
							  }
							| any;
					}>;
					unsavedChanges: ComputedRef<string[]>;
					save: (saveCb?: () => void) => void;
					setValue: (value: { [key: string]: any }) => void;
					setOriginalValue: (value: { [key: string]: any }) => void;
				}
			>{}
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
					artists: song.artists,
					genres: song.genres,
					tags: song.tags
				};
				if (reset && this.form.setValue) this.form.setValue(formSong);
				else if (!reset && this.form.setOriginalValue)
					this.form.setOriginalValue(formSong);
			},
			resetSong(youtubeId) {
				if (this.youtubeId === youtubeId) this.youtubeId = "";
				if (this.song && this.song.youtubeId === youtubeId)
					this.song = {};
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
				this.song.duration = -1;
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
			updateSongField(data) {
				this.song[data.field] = data.value;
			},
			selectDiscogsInfo(discogsInfo) {
				this.song.discogs = discogsInfo;
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
				this.song.youtubeId = youtubeId;
				this.loadVideoById(youtubeId, 0);
			},
			updateTitle(title) {
				this.song.title = title;
			},
			updateThumbnail(thumbnail) {
				this.song.thumbnail = thumbnail;
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
