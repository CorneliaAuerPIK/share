import fs from 'fs'
import rimraf from 'rimraf'
import archiver from 'archiver'
import chalk from 'chalk'
import prettyBytes from 'pretty-bytes'
import path from 'path'

const FOLDER_DIST = './dist'
const FOLDER_MODULES = './modules'
const FOLDER_PREVIEWS = './previews'
const FOLDER_SHARE = '/share'
const FOLDER_SETTINGS = '/settings'

rimraf.sync(FOLDER_DIST)
fs.mkdirSync(FOLDER_DIST)
fs.mkdirSync(`${FOLDER_DIST}${FOLDER_SHARE}`)
fs.mkdirSync(`${FOLDER_DIST}${FOLDER_SETTINGS}`)

// Modules
const modulesFolders = fs.readdirSync(FOLDER_MODULES).filter(m => fs.lstatSync(`${FOLDER_MODULES}/${m}`).isDirectory())

modulesFolders.forEach(m => {
  const fileOutput = fs.createWriteStream(`${FOLDER_DIST}${FOLDER_SHARE}/${m}.zip`)
  const archive = archiver('zip', { zlib: { level: 9 } })
  fileOutput.on('close', function () {
    console.log(`${chalk.cyan.bold(m)} ${chalk.yellow.bold('→')} ${chalk.magenta.bold(prettyBytes(archive.pointer()))} 📦`)
  })

  archive.pipe(fileOutput)
  archive.directory(`${FOLDER_MODULES}/${m}`, m)
  archive.on('error', function (err) {
    throw err
  })
  archive.finalize()
})

// Settings
const settings = fs.readdirSync(`.${FOLDER_SETTINGS}`).filter(m => path.extname(`${m}`) === '.json')

settings.forEach(f => {
  const from = `.${FOLDER_SETTINGS}/${f}`
  const to = `${FOLDER_DIST}${FOLDER_SETTINGS}/${f}`
  fs.copyFile(from, to, (err) => {
    if (err) throw err
    console.log(`${chalk.cyan.bold(from)} ${chalk.yellow.bold('→')} ${chalk.magenta.bold(to)} 📃`)
  })
})

// Previews
const previews = fs.readdirSync(FOLDER_PREVIEWS).filter(m => path.extname(`${m}`) === '.png' || path.extname(`${m}`) === '.jpg')

previews.forEach(f => {
  const from = `${FOLDER_PREVIEWS}/${f}`
  const to = `${FOLDER_DIST}${FOLDER_SHARE}/${f}`
  fs.copyFile(from, to, (err) => {
    if (err) throw err
    console.log(`${chalk.cyan.bold(from)} ${chalk.yellow.bold('→')} ${chalk.magenta.bold(to)} 🖼`)
  })
})

// Sitemap
import Sitemap from 'sitemap';

const DEFAULT_PAGES = [
  { url: '/' },
  { url: '/about' },
  { url: '/imprint' },
  { url: '/presskit' }
]

const modules = JSON.parse(fs.readFileSync(`.${FOLDER_SETTINGS}/modules.json`)).modules
  .filter((module) => (module.visible == undefined || module.visible) && module.link.startsWith('/'))
  .map((module) => {
    return { url: module.link }
  })

const links = [...DEFAULT_PAGES, ...modules]

const stream = new Sitemap.SitemapStream({ hostname: 'https://dev.climatescenarios.org/' })
links.map(link => stream.write(link))
stream.end()
Sitemap.streamToPromise(stream).then(data => fs.writeFileSync(`${FOLDER_DIST}/sitemap.xml`, data.toString()))
