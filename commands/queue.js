const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const fs = require('fs');

let ffmpegPath = null;
try {
    ffmpegPath = require('ffmpeg-static');
    console.log('✅ FFmpeg found');
} catch (e) {
    console.error('❌ FFmpeg not found! Please install ffmpeg');
}

class MusicQueue {
    constructor(guildId, voiceChannel, textChannel) {
        this.guildId = guildId;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.songs = [];
        this.currentSong = null;
        this.playing = false;
        this.paused = false;
        
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        
        this.connection = null;
        
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.playNext();
        });
        
        this.player.on('error', error => {
            console.error('Player error:', error);
            this.playNext();
        });
    }
    
    async playNext() {
        if (this.songs.length === 0) {
            this.playing = false;
            this.currentSong = null;
            
            if (this.connection) {
                setTimeout(() => {
                    if (this.songs.length === 0 && this.connection) {
                        this.connection.destroy();
                        this.connection = null;
                        if (this.textChannel) {
                            this.textChannel.send('📭 Queue is empty! Leaving voice channel.');
                        }
                    }
                }, 30000);
            }
            return;
        }
        
        this.currentSong = this.songs[0];
        this.playing = true;
        this.paused = false;
        
        try {
            const stream = ytdl(this.currentSong.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
            });
            
            const resource = createAudioResource(stream, {
                inputType: 'arbitrary',
                inlineVolume: true,
            });
            
            resource.volume.setVolume(1);
            this.player.play(resource);
            
            const embed = {
                color: 0x00ff00,
                title: '🎵 Now Playing',
                description: `**[${this.currentSong.title}](${this.currentSong.url})**`,
                fields: [
                    { name: 'Requested by', value: this.currentSong.requestedBy, inline: true },
                ],
                timestamp: new Date(),
            };
            
            this.textChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error playing:', error);
            this.songs.shift();
            this.playNext();
        }
    }
    
    async addSong(song) {
        try {
            const info = await ytdl.getInfo(song.url);
            song.title = info.videoDetails.title;
            song.duration = info.videoDetails.lengthSeconds;
            this.songs.push(song);
            
            if (!this.playing) {
                await this.playNext();
            }
        } catch (error) {
            console.error('Error adding song:', error);
            song.title = 'Unknown Title';
            this.songs.push(song);
            if (!this.playing) {
                await this.playNext();
            }
        }
    }
    
    skip() {
        if (this.songs.length > 0) {
            const skipped = this.songs.shift();
            this.player.stop();
            return skipped;
        }
        return null;
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
        if (this.playing && this.paused) {
            this.player.unpause();
            this.paused = false;
            return true;
        }
        return false;
    }
    
    getQueue() {
        return this.songs;
    }
    
    stop() {
        this.songs = [];
        this.player.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
        this.playing = false;
        this.currentSong = null;
    }
}

module.exports = { MusicQueue };
