import fs from 'fs'
import path from 'path'
import child_process from 'child_process'
import winston from 'winston'
import colors from 'colors'
import yargs from 'yargs'
import request from 'request'
import del from 'del'
import AdmZip from 'adm-zip'

const argv = yargs
    .usage('Usage: $0 <command> [options]')
    .demand('s').alias('s', 'sticker-id').describe('s', 'sticker id')
    .help('h').alias('h', 'help')
    .argv

let stickerId     = argv.stickerId
let downloadPath  = path.dirname(__dirname) + '/download'
let unzipPath     = path.dirname(__dirname) + '/unzip'
let stickerZipUrl = {
    static   : `http://dl.stickershop.line.naver.jp/products/0/0/1/${stickerId}/android/stickers.zip`,
    animation: `http://dl.stickershop.line.naver.jp/products/0/0/1/${stickerId}/android/stickerpack.zip`
}

let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true
        }),
        // new (winston.transports.File)({
        //     filename: path.dirname(__dirname) + '/debug.log'
        // })
    ]
});

function downloadStaticStickerZip(stickerId) {
    return new Promise((resolve, reject) => {
        let zipUrl  = stickerZipUrl.static
        let zipPath = `${downloadPath}/${stickerId}.zip`

        // Remove exists file first
        del.sync(zipPath)

        // Download
        let stream = request(zipUrl).pipe(fs.createWriteStream(zipPath))

        stream.on('finish', () => resolve(zipPath))
        stream.on('error', (error) => reject(error))
    })
}

function downloadAnimationStickerZip(stickerId) {
    return new Promise((resolve, reject) => {
        let zipUrl  = stickerZipUrl.animation
        let zipPath = `${downloadPath}/${stickerId}.zip`

        // Remove exists file first
        del.sync(zipPath)

        // Download
        let stream = request(zipUrl).pipe(fs.createWriteStream(zipPath))

        stream.on('finish', () => resolve(zipPath))
        stream.on('error', (error) => reject(error))
    })
}

async function analystStickerType() {
    let headPromise = (url) => {
        return new Promise((resolve, reject) => {
            request(url, { method: 'HEAD' }, (err, response, body) => {
                if (err) {
                    reject(err)
                }else{
                    resolve(response.statusCode)
                }
            })
        })
    }

    let staticPromise    = headPromise(stickerZipUrl.static)
    let animationPromise = headPromise(stickerZipUrl.animation)

    var data = {}

    await Promise.all([staticPromise, animationPromise]).then(statusCodes => {
        data = {
            static   : statusCodes[0] === 200,
            animation: statusCodes[1] === 200,
        }
    })

    return data
}

function unzipStickerZip(stickerId, zipPath) {
    let admZip      = new AdmZip(zipPath)
    let unzipFolder = `${unzipPath}/${stickerId}`

    del.sync(unzipFolder)

    admZip.extractAllTo(unzipFolder, true)

    return unzipFolder
}

function convertApngToGif(unzipPath) {
    var animationPath = `${unzipPath}/animation`

    fs.readdir(animationPath, (err, files) => {
        files.forEach(file => {
            let fromFile = `${animationPath}/${file}`
            let toFile   = `${animationPath}/${file}`.replace(".png", ".gif")

            let apng2gif = child_process.spawn('./bin/apng2gif', [fromFile, toFile])

            apng2gif.stdout.on('data', data => {
                logger.info(`Convert ${fromFile} ... ... ... %s`, colors.green('OK'))
            })

            apng2gif.stderr.on('data', data => {
                logger.info(`Convert ${fromFile} ... ... ... %s`, colors.red('Faield'))
            })
        })
    })
}

async function main() {
    try {
        let zipPath = ""
        let zipType = await analystStickerType()

        if (zipType.animation === true) {
            zipPath = await downloadAnimationStickerZip(stickerId)
        }else if (zipType.static === true) {
            zipPath = await downloadStaticStickerZip(stickerId)
        }else{
            throw new Error("Can not found matched static or animation zip file")
        }

        let unzipPath = unzipStickerZip(stickerId, zipPath)

        if (zipType.animation === true) {
            convertApngToGif(unzipPath)
        }
    }catch(e) {
        console.log(e)
    }
}

main()
