/**
 * Electron JS Source Code Generator & Deployment Assets
 * Provides the complete, production-ready Electron codebase
 * for kiosk lockdown, shortcut blocking, and window focus tracking.
 */

export const ELECTRON_MAIN_JS = `// ============================================================================
// MathLock Kiosk - Electron Main Process (main.js)
// Sesuai Permintaan Guru Matematika Kelas 9:
// - Kiosk Mode & Always On Top
// - Global Shortcut Interceptor (Blokir Alt+Tab, Ctrl+T, Ctrl+W, F12, dsb.)
// - Window Focus & Blur Event Tracking
// - Audio Siren Alert & AES-256 Central Server Audit Logger
// ============================================================================

const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let isExamActive = true;
let strikeCount = 0;

// Path log audit terenkripsi lokal
const AUDIT_LOG_FILE = path.join(app.getPath('userData'), 'math9_security_audit.enc');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: true,
    kiosk: true,              // Kiosk Mode: Mencegah user keluar ke desktop
    alwaysOnTop: true,        // Jendela tetap di atas aplikasi lain
    skipTaskbar: true,        // Sembunyikan dari taskbar Windows/Linux
    frame: false,             // Hilangkan window chrome / close button
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true, // Keamanan isolasi konteks
      devTools: false,        // Nonaktifkan Developer Tools
      sandbox: true,
    },
  });

  // URL aplikasi ujian (dapat berupa URL web online atau index.html lokal)
  const examUrl = process.env.EXAM_URL || 'https://ais-dev-34e4nf5aelmzvbrxtt5j2i-624591457868.asia-east1.run.app';
  mainWindow.loadURL(examUrl);

  // ==========================================================================
  // 1. WINDOW FOCUS TRACKING & BLUR DETECTION
  // Memicu peringatan jika jendela kehilangan fokus (misal user mencoba membuka app lain)
  // ==========================================================================
  mainWindow.on('blur', () => {
    if (!isExamActive) return;
    strikeCount += 1;
    console.warn('[PELANGGARAN] Jendela aplikasi kehilangan fokus! Strike: ' + strikeCount);
    
    // Kirim notifikasi event ke renderer process untuk memicu alarm Web Audio & overlay
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('security:window-blur', {
        timestamp: Date.now(),
        strike: strikeCount,
        message: 'Perubahan fokus terdeteksi! Siswa dilarang berpindah aplikasi.'
      });
    }

    // Paksa kembali ke jendela ujian dan pertahankan status Always On Top
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }, 150);
  });

  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('security:window-focus', { timestamp: Date.now() });
    }
  });

  // Blokir pembukaan DevTools secara paksa
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.closeDevTools();
    triggerSecurityAlarm('Mencoba membuka inspect element / DevTools');
  });

  // Cegah navigasi keluar dari domain ujian
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(examUrl) && !url.startsWith('file://')) {
      event.preventDefault();
      triggerSecurityAlarm('Mencoba navigasi keluar url: ' + url);
    }
  });

  // ==========================================================================
  // 2. SHORTCUT BLOCKING MODULE (Global Shortcuts)
  // Memblokir kombinasi tombol berbahaya
  // ==========================================================================
  registerSecurityShortcuts();
}

function registerSecurityShortcuts() {
  const blockedShortcuts = [
    'Alt+Tab',
    'Alt+F4',
    'Alt+Space',
    'CommandOrControl+Tab',
    'CommandOrControl+Shift+Tab',
    'CommandOrControl+T',        // Tab baru
    'CommandOrControl+N',        // Jendela baru
    'CommandOrControl+W',        // Tutup tab
    'CommandOrControl+Q',        // Quit
    'CommandOrControl+R',        // Reload
    'CommandOrControl+Shift+R',
    'F5',
    'F11',                       // Fullscreen toggle
    'F12',                       // DevTools
    'CommandOrControl+Shift+I',  // Inspect
    'CommandOrControl+Shift+J',  // Console
    'CommandOrControl+Shift+C',  // Inspect node
    'CommandOrControl+U',        // View source
    'CommandOrControl+P',        // Print
    'CommandOrControl+S',        // Save
    'CommandOrControl+H',        // History
    'Super',                     // Tombol Windows / Meta
  ];

  blockedShortcuts.forEach((shortcut) => {
    try {
      const success = globalShortcut.register(shortcut, () => {
        console.warn('[SECURITY] Tombol pintas dicegah: ' + shortcut);
        triggerSecurityAlarm('Kombinasi tombol dilarang ditekan: ' + shortcut);
      });
      if (!success) {
        console.warn('Gagal mendaftarkan pintasan: ' + shortcut);
      }
    } catch (err) {
      // Platform specific shortcut error
    }
  });
}

function triggerSecurityAlarm(reason) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  strikeCount += 1;
  mainWindow.webContents.send('security:violation-alert', {
    reason,
    strikeCount,
    timestamp: Date.now()
  });
}

// ==========================================================================
// 3. IPC HANDLERS: LOG AKTIVITAS TERENKRIPSI KE SERVER PUSAT & UNLOCK GURU
// ==========================================================================
ipcMain.handle('security:log-violation-encrypted', async (event, encryptedPacket) => {
  try {
    const entry = JSON.stringify(encryptedPacket) + '\\n';
    fs.appendFileSync(AUDIT_LOG_FILE, entry, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Gagal menulis log audit:', error);
    return { success: false, error: error.message };
  }
});

// Guru memasukkan PIN pengawas untuk membuka kunci layar penuh / keluar ujian
ipcMain.handle('proctor:unlock-kiosk', async (event, inputPin) => {
  const MASTER_PROCTOR_PIN = 'GURU9MAT';
  if (inputPin === MASTER_PROCTOR_PIN) {
    isExamActive = false;
    globalShortcut.unregisterAll();
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.close();
    return { success: true };
  }
  return { success: false, message: 'PIN Pengawas Salah!' };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
`;

export const ELECTRON_PRELOAD_JS = `// ============================================================================
// MathLock Kiosk - Electron Preload Bridge (preload.js)
// Mengamankan komunikasi antara Main Process dan Renderer UI
// ============================================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Event Listeners dari Main Process
  onWindowBlur: (callback) => {
    ipcRenderer.on('security:window-blur', (event, data) => callback(data));
  },
  onWindowFocus: (callback) => {
    ipcRenderer.on('security:window-focus', (event, data) => callback(data));
  },
  onViolationAlert: (callback) => {
    ipcRenderer.on('security:violation-alert', (event, data) => callback(data));
  },

  // Mengirim log aktivitas terenkripsi ke file audit Electron
  logEncryptedViolation: async (encryptedPacket) => {
    return await ipcRenderer.invoke('security:log-violation-encrypted', encryptedPacket);
  },

  // Buka kunci ujian dengan PIN Pengawas
  unlockKioskWithPin: async (pin) => {
    return await ipcRenderer.invoke('proctor:unlock-kiosk', pin);
  },
});
`;

export const ELECTRON_PACKAGE_JSON = `{
  "name": "mathlock-kiosk-exam",
  "version": "1.0.0",
  "description": "Aplikasi Ujian Terkunci Ulangan Harian Matematika Kelas 9 dengan Deteksi Fokus, Alarm Anti-Sontek & Enkripsi AES-256",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "keywords": ["exam", "lockdown", "education", "kiosk", "anti-cheat", "electron"],
  "author": "Guru Matematika Kelas 9",
  "license": "ISC",
  "dependencies": {},
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.1.8"
  },
  "build": {
    "appId": "com.smp.mathlock.exam",
    "productName": "MathLock Ujian Terkunci Kelas 9",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "icon.ico"
    }
  }
}
`;

export const ELECTRON_README = `# Panduan Penggunaan Aplikasi Kiosk Electron Ujian Matematika Kelas 9

Aplikasi ini dirancang khusus untuk memastikan integritas ujian matematika kelas 9 dengan sistem proteksi berlapis:

### Fitur Keamanan:
1. **Layar Penuh Terkunci (Kiosk Mode)**: Layar tertutup penuh, tanpa tombol close, minimize, atau taskbar.
2. **Blokir Tombol Pintas Global**: Mencegah \`Alt+Tab\`, \`Ctrl+T\`, \`Ctrl+W\`, \`Ctrl+N\`, \`F12\`, tombol Windows/Super.
3. **Deteksi Perpindahan Tab / Aplikasi (Window Blur Tracking)**: Jika siswa menggeser fokus atau membuka aplikasi AI (ChatGPT, Gemini, PhotoMath), sistem seketika membunyikan sirine alarm.
4. **Log Aktivitas Terenkripsi AES-256**: Setiap insiden dicatat dengan tanda tangan kriptografi dan dikirim ke server pusat atau file audit lokal.
5. **Kunci Darurat Guru**: Aplikasi hanya dapat ditutup menggunakan PIN Pengawas (\`GURU9MAT\`).

### Cara Menjalankan di Komputer Lab Sekolah:
1. Pasang Node.js di komputer (unduh dari nodejs.org).
2. Buat folder baru, misalnya \`mathlock-exam\`.
3. Letakkan \`package.json\`, \`main.js\`, dan \`preload.js\` di dalam folder tersebut.
4. Buka Terminal / CMD di folder tersebut, lalu jalankan:
   \`\`\`bash
   npm install
   npm start
   \`\`\`
5. Untuk membuat file installer \`.exe\` mandiri yang bisa dijalankan langsung oleh siswa:
   \`\`\`bash
   npm run build:win
   \`\`\`
   File installer siap didistribusikan ke seluruh komputer lab!
`;
