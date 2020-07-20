const config = require('./config.js');
const DiscordRPC = require("discord-rpc");
const net = require('net');


DiscordRPC.register(config.discord.clientID);

const client = new DiscordRPC.Client({ transport: "ipc" });
const startTimestamp = Date.now();

const connect = () => new Promise((res, rej) => {
    const conn = net.connect({
        port: config.mpd.port,
        host: config.mpd.hostname
    })

    conn.once('data', (data) => res(conn));
})

const apiCall = (action = '') => new Promise((resolve, reject) => {
    connect().then((conn) => {
        conn.once('data', (d) => {
            resolve((d.toString('utf-8').match(/^(.*?: .*)$/mg) || []).reduce((a, b) => {
                const spl = b.split(/:/g);
                a.set(spl[0], spl[1]);
                return a;
            }, new Map()))
        });
        conn.write(action + '\n');
    })
});

const setStatus = async () => {
    // Get the mpd now playing status
    const currentSong = await apiCall('currentsong');
    const status = await apiCall('status');
    
    client.setActivity({
        startTimestamp: Date.now() - Number(status.get('elapsed')) * 1000,
        state: `${currentSong.get('Artist')} - ${currentSong.get('Album')}`,
        details: currentSong.get('Title')
    });
};

client.on('ready', () => {
    console.log('Connected')
    setStatus();

    setInterval(() => setStatus(), 2000);
})

client.login({ clientId: config.discord.clientID }).catch(console.error);