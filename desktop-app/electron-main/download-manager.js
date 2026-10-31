const { dialog, app, shell } = require('electron');
const path = require('path');

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.msi', '.ps1', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.scr', '.pif', '.com', '.jar'
]);

/**
 * Attaches download management to the given session.
 * Enforces Rule S16: confirmation dialog on executable downloads.
 * Reports progress to renderer via IPC.
 *
 * @param {import('electron').Session} session
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 */
function setupDownloadManager(session, getMainWindow) {
  if (!session) return;

  session.on('will-download', (event, item, webContents) => {
    const filename = item.getFilename();
    const ext = path.extname(filename).toLowerCase();
    const mainWindow = getMainWindow ? getMainWindow() : null;

    // Rule S16: Executable download confirmation guard
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      const parentWin = mainWindow || null;
      const choice = dialog.showMessageBoxSync(parentWin, {
        type: 'warning',
        buttons: ['Cancel Download', 'Download Anyway'],
        defaultId: 0,
        cancelId: 0,
        title: 'Security Warning: Executable Download',
        message: `The file "${filename}" is an executable or script (${ext}).`,
        detail: 'Executing untrusted downloaded files can harm your computer. Do you want to continue downloading this file?'
      });

      if (choice === 0) {
        item.cancel();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-completed', {
            filename,
            state: 'cancelled',
            reason: 'Security check rejected'
          });
        }
        return;
      }
    }

    // Ensure item has a concrete save path so downloads (including blob URLs) are never cancelled or 0 bytes
    if (!item.getSavePath()) {
      const downloadsFolder = app.getPath('downloads');
      const safeFilename = filename || `FlowTrack_Download_${Date.now()}${ext || ''}`;
      item.setSavePath(path.join(downloadsFolder, safeFilename));
    }

    const downloadId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    item.on('updated', (updateEvent, state) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          id: downloadId,
          filename: item.getFilename(),
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
          state
        });
      }
    });

    item.once('done', (doneEvent, state) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-completed', {
          id: downloadId,
          filename: item.getFilename(),
          savePath: item.getSavePath(),
          state
        });
      }
    });
  });
}

module.exports = {
  setupDownloadManager,
  DANGEROUS_EXTENSIONS
};
