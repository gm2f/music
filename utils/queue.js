const { createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

class MusicQueue {
    constructor(guildId, voiceChannel, textChannel) {
        this.guildId = guildId;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.songs = [];
        this.playing = false;
        this.paused = false;
        this.connection = null;
        this.player = createAudioPlayer();

        this.player.on(AudioPlayerStatus.Idle, () => {
            this.songs.shift();
            if (this.songs.length > 0) {
                this._playSong(this.songs[0]);
            } else {
                this.playing = false;
                if (this.textChannel) {
                    this.textChannel.send('Queue finished. Leaving voice channel.').catch(() => {});
                }
                if (this.connection) {
                    this.connection.destroy();
                    this.connection = null;
                }
            }
        });

        this.player.on('error', (error) => {
            console.error('Audio player error:', error);
            this.songs.shift();
            if (this.songs.length > 0) {
                this._playSong(this.songs[0]);
            } else {
                this.playing = false;
            }
        });
    }

    async addSong(song) {
        try {
            const info = await ytdl.getInfo(song.url);
            song.title = info.videoDetails.title;
            song.duration = info.videoDetails.lengthSeconds;
        } catch (err) {
            console.error('Error fetching song info:', err);
            song.title = song.url;
        }

        this.songs.push(song);

        if (!this.playing) {
            this._playSong(this.songs[0]);
        }
    }

    _playSong(song) {
        this.playing = true;
        this.paused = false;

        try {
            const stream = ytdl(song.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
            });

            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
            });

            this.player.play(resource);
        } catch (error) {
            console.error('Error playing song:', error);
            this.songs.shift();
            if (this.songs.length > 0) {
                this._playSong(this.songs[0]);
            } else {
                this.playing = false;
            }
        }
    }

    get currentSong() {
        return this.songs[0] || null;
    }

    pause() {
        if (this.playing && !this.paused) {
            this.player.pause();
            this.paused = true;
            return true;
        }
        return false;
    }

    resume() {
        if (this.paused) {
            this.player.unpause();
            this.paused = false;
            return true;
        }
        return false;
    }

    skip() {
        this.player.stop();
    }

    stop() {
        this.songs = [];
        this.playing = false;
        this.paused = false;
        this.player.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
    }
}

module.exports = { MusicQueue };
