const path = require('path')

// signAndEditExecutable is off (winCodeSign needs symlink privileges on Windows),
// so electron-builder skips icon embedding. Do it here with rcedit instead.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return
  const { rcedit } = await import('rcedit')
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  await rcedit(exe, { icon: path.join(context.packager.projectDir, 'assets', 'icon.ico') })
}
