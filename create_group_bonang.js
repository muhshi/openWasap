const http = require('http');

const API_KEY = 'dev-admin-key';
const GROUP_NAME = 'petugas SE bonang';
const PARTICIPANTS = [
  "6285727253827",
  "6285848480751",
  "6282226416889",
  "6282310559106",
  "6281225008906",
  "62895352968314",
  "628886615482",
  "6285326024321",
  "6289508592098",
  "6282227182516",
  "6283865650017",
  "6285228199040",
  "6282328093023",
  "6288901293973",
  "628982375060",
  "6288215754636",
  "6289630548046",
  "62859165961517",
  "6289519688567",
  "6287766622597",
  "6281297455382",
  "6282236177014",
  "6282223664373",
  "6282134625933",
  "62895360596233",
  "6282226416524",
  "6281390153810",
  "6281328767425",
  "6285293033540",
  "628871350561",
  "6282310191286",
  "6285290652076",
  "6281225135321",
  "6285735169571",
  "6281808040549",
  "6281393546261",
  "6281513898641",
  "628895742401",
  "6289666979475",
  "6282136428106",
  "6282248969719",
  "6282131034191",
  "6285326851881",
  "628997346166",
  "6281334660013",
  "6282390611565",
  "62895800022987",
  "6281912892273",
  "6283122591676",
  "6282324157282",
  "6285290473613",
  "6283850580551",
  "6285238486946",
  "6288216691735"
];

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (e) => reject(e));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function main() {
  console.log('🔄 Mengambil daftar sesi aktif dari OpenWA...');
  try {
    const sessionRes = await makeRequest({
      hostname: 'localhost',
      port: 2785,
      path: '/api/sessions',
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (sessionRes.status !== 200) {
      console.error('❌ Gagal mengambil sesi. Status:', sessionRes.status, sessionRes.body);
      return;
    }

    const sessions = Array.isArray(sessionRes.body) ? sessionRes.body : [];
    if (sessions.length === 0) {
      console.error('❌ Tidak ada sesi aktif di OpenWA. Silakan buat dan hubungkan sesi WhatsApp Anda terlebih dahulu di dashboard.');
      return;
    }

    // Cari sesi yang statusnya ready
    const readySession = sessions.find(s => s.status === 'ready') || sessions[0];
    const sessionId = readySession.id;
    console.log(`✅ Menemukan sesi aktif: "${readySession.name}" (ID: ${sessionId}, Status: ${readySession.status})`);

    console.log(`🔄 Membuat grup "${GROUP_NAME}" dengan ${PARTICIPANTS.length} anggota...`);
    const createRes = await makeRequest({
      hostname: 'localhost',
      port: 2785,
      path: `/api/sessions/${sessionId}/groups`,
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    }, {
      name: GROUP_NAME,
      participants: PARTICIPANTS
    });

    if (createRes.status === 201 || createRes.status === 200) {
      console.log('🎉 SUKSES! Grup berhasil dibuat.');
      console.log('Detail Grup:', createRes.body);
    } else {
      console.error('❌ Gagal membuat grup. Status:', createRes.status);
      console.error('Detail Error:', createRes.body);
    }
  } catch (error) {
    console.error('❌ Terjadi kesalahan koneksi ke server OpenWA:', error.message);
    console.log('Pastikan OpenWA Anda sedang berjalan (npm run dev) dan port 2785 dapat diakses.');
  }
}

main();
