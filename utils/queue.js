const { createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const PYTHON = '/home/runner/workspace/.pythonlibs/bin/python3';

const YTDLP_ARGS = ['--extractor-args', 'youtube:player_client=android', '-q', '--no-warnings'];

function ytdlpInfo(url) {
    return new Promise((resolve, reject) => {
        const proc = spawn('python3', [
            '-m', 'yt_dlp',
            ...YTDLP_ARGS,
            '--dump-json',
            url,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });

        let output = '';
        proc.stdout.on('data', d => output += d);
        proc.on('close', code => {
            if (output) {
                try { resolve(JSON.parse(output)); }
                catch (e) { reject(e); }
            } else {
                reject(new Error(`yt-dlp info failed (code ${code})`));
            }
        });
        proc.on('error', reject);
    });
}

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
            const info = await ytdlpInfo(song.url);
            song.title = info.title;
            song.duration = info.duration;
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

        const ytdlp = spawn('python3', [
            '-m', 'yt_dlp',
            ...YTDLP_ARGS,
            '-f', 'bestaudio',
            '-o', '-',
            song.url,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });

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
