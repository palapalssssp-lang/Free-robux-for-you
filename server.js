const SERVER_URL = "https://minecraft-production-cfd3.up.railway.app"; 
const SECRET_PIN = "312312322";

let peer;
let socket;
let localStream;
let myPeerId;

// 1. Inisialisasi Socket.IO secara global
socket = io(SERVER_URL);

socket.on('connect', () => {
    console.log("Socket terhubung dengan ID:", socket.id);
});

socket.on('connect_error', (err) => {
    console.error("Gagal terhubung ke Socket Server:", err.message);
});

async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.warn("Izin kamera/mikrofon belum diberikan:", err);
    }
}

function initConnections() {
    requestCameraPermission();

    // Inisialisasi PeerJS Server (di Railway menggunakan port 443/HTTPS)
    myPeerId = "hp-" + Math.floor(1000 + Math.random() * 9000);
    
    // Sesuaikan host Railway
    peer = new Peer(myPeerId, {
        host: "minecraft-production-cfd3.up.railway.app",
        port: 443,
        path: '/peerjs',
        secure: true
    });

    peer.on('open', (id) => {
        const statusEl = document.getElementById('peerStatus');
        if (statusEl) {
            statusEl.innerText = "Online ID: " + id;
            statusEl.classList.add('online');
        }
    });

    peer.on('call', (call) => {
        call.answer(localStream);
    });

    socket.on('update-broadcaster-list', (broadcasterIds) => {
        const grid = document.getElementById('streamGrid');
        if (grid) grid.innerHTML = "";

        broadcasterIds.forEach(id => {
            if (id !== myPeerId) {
                connectToDevice(id);
            }
        });
    });
}

async function startBroadcast() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localPreview').srcObject = localStream;

        // CEK KONEKSI SOCKET SEBELUM EMIT
        if (socket && socket.connected) {
            socket.emit('register-broadcaster', myPeerId);
            alert("Live Broadcast Berhasil!");
        } else {
            alert("Gagal terhubung ke server Socket.IO! Periksa jaringan atau URL server.");
        }
    } catch (err) {
        alert("Gagal membuka kamera: " + err.message);
    }
}

function stopBroadcast() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        document.getElementById('localPreview').srcObject = null;
    }
}

function openModal() { document.getElementById('pinModal').style.display = 'flex'; }
function closeModal() { document.getElementById('pinModal').style.display = 'none'; document.getElementById('pinInput').value = ''; }

function verifyPin() {
    if (document.getElementById('pinInput').value === SECRET_PIN) {
        closeModal();
        openAdminGUI();
    } else {
        alert("Sandi Rahasia Salah!");
    }
}

function openAdminGUI() {
    document.getElementById('adminGUI').style.display = 'block';
    if (socket && socket.connected) {
        socket.emit('get-broadcasters');
    }
}

function closeAdminGUI() {
    document.getElementById('adminGUI').style.display = 'none';
}

function connectToDevice(targetPeerId) {
    const streamToSend = localStream || new MediaStream();
    const call = peer.call(targetPeerId, streamToSend);
    call.on('stream', (remoteStream) => {
        addRemoteVideoStream(targetPeerId, remoteStream);
    });
}

function addRemoteVideoStream(peerId, stream) {
    const grid = document.getElementById('streamGrid');
    if (document.getElementById("video-" + peerId)) return;

    const card = document.createElement('div');
    card.className = 'stream-card';
    card.id = "card-" + peerId;

    const title = document.createElement('h4');
    title.innerText = "Live Stream: " + peerId;

    const video = document.createElement('video');
    video.id = "video-" + peerId;
    video.autoplay = true;
    video.playsinline = true;
    video.style.width = "100%";
    video.style.borderRadius = "6px";
    video.srcObject = stream;

    card.appendChild(title);
    card.appendChild(video);
    grid.appendChild(card);
}

window.onload = initConnections;
