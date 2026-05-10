const { createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const play = require('play-dl');
const { spawn } = require('child_process');

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

        this.player.on(AudioPlayerStatus.Playing, () => {
            console.log(`▶️  AudioPlayer entered Playing state`);
        });

        this.player.on(AudioPlayerStatus.Buffering, () => {
            console.log(`⏳ AudioPlayer buffering...`);
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            console.log(`⏹️  AudioPlayer entered Idle state`);
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
            console.error('Audio player error:', error.message);
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
            const info = await play.video_info(song.url);
            song.title = info.video_details.title;
            song.duration = info.video_details.durationInSec;
        } catch (err) {
            console.error('Error fetching song info:', err.message);
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

        console.log(`🎵 Starting playback: ${song.title || song.url}`);

        // yt-dlp downloads the best audio and writes to stdout
        const ytdlp = spawn('python3', [
            '-m', 'yt_dlp',
            '-f', 'bestaudio',
            '-q',
            '--no-warnings',
            '-o', '-',
            song.url,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });

        // ffmpeg transcodes to Ogg Opus — more reliable framing than raw PCM
        const ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-c:a', 'libopus',
            '-f', 'ogg',
            '-ar', '48000',
            '-ac', '2',
            '-loglevel', '0',
            'pipe:1',
        ], { stdio: ['pipe', 'pipe', 'ignore'] });

        ytdlp.stdout.pipe(ffmpegProcess.stdin);

        // Suppress EPIPE errors from early termination (skip/stop)
        ytdlp.stdout.on('error', () => {});
        ffmpegProcess.stdin.on('error', () => {});

        ytdlp.on('error', (err) => {
            console.error('yt-dlp process error:', err.message);
            ffmpegProcess.kill();
        });

        ffmpegProcess.on('error', (err) => {
            console.error('ffmpeg process error:', err.message);
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`ffmpeg exited with code ${code}`);
        });

        const resource = createAudioResource(ffmpegProcess.stdout, {
            inputType: StreamType.OggOpus,
        });

        this.player.play(resource);
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
