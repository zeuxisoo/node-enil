import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import request from 'request'

const argv = yargs
    .usage('Usage: $0 <command> [options]')
    .demand('s').alias('s', 'sticker-id').describe('si', 'sticker id')
    .help('h').alias('h', 'help')
    .argv

let stickerId    = argv.stickerId
let downloadPath = path.dirname(__dirname) + '/download'

function downloadStickerZip(stickerId) {
    return new Promise((resolve, reject) => {
        let stickerZipUrl  = `http://dl.stickershop.line.naver.jp/products/0/0/1/${stickerId}/android/stickers.zip`
        let stickerZipPath = `${downloadPath}/${stickerId}.zip`

        let stream = request(stickerZipUrl).pipe(fs.createWriteStream(stickerZipPath))

        stream.on('finish', () => resolve(stickerZipPath))
        stream.on('error', (error) => reject(error))
    });
}

async function main() {
    let stickerZipPath = await downloadStickerZip(stickerId)
}

main()
