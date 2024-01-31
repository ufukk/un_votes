import { resolve } from 'path'
import { read_pages, AxiosUrlReader, ResolutionListPageReader, ResolutionDetailsPageReader, ResolutionReference, CachedAxiosUrlReader, ResolutionDetailsPage, DraftResolutionPage } from '../reader/crawler'
import { Subject, Country, Resolution, Agenda, Author, Vote, ResolutionVote, ResolutionType, ResolutionStatus, CountryRepository, AgendaRepository, DraftResolution, SubjectRepository, DraftResolutionRepository, make_slug, SlugAlias, SlugAliasRepository, defaultDataSource, ResolutionRepository, AuthorRepository } from "../reader/models"
import * as fs from 'fs' 
import { DBCursorKeeper, ImportTask } from '../reader/tasks'
import { report } from '../utils'

function testRequest(url: string) {
    let response = null
    let total = 0

    function checkTotal(page, resolve) {
        console.log(`page: ${page.title}`)
        total++
        if(total == 3) {
            resolve()
        }
    }

    const urls = [
        'https://digitallibrary.un.org/record/4030835?ln=en',
        'https://digitallibrary.un.org/record/4030834?ln=en',
        'https://digitallibrary.un.org/record/4030833?ln=en'
    ]

    function _loop() {
        return new Promise<void>(resolve => {
            if(total < 3) {
                    new ResolutionDetailsPageReader(
                        new ResolutionReference('', new Date(2023, 1, 1), '', urls[0]), 
                        new AxiosUrlReader())
                    .fetch()
                    .then((page) => {
                        checkTotal(page, resolve)
                    })

                    new ResolutionDetailsPageReader(
                        new ResolutionReference('', new Date(2023, 1, 1), '', urls[1]), 
                        new AxiosUrlReader())
                    .fetch()
                    .then((page) => {
                        checkTotal(page, resolve)
                    })

                    new ResolutionDetailsPageReader(
                        new ResolutionReference('', new Date(2023, 1, 1), '', urls[2]), 
                        new AxiosUrlReader())
                    .fetch()
                    .then((page) => {
                        checkTotal(page, resolve)
                    })
            } else {
                resolve()
            }
        })
    }
    _loop()
}

class FalsePromise {

    constructor(public readonly action: (resolve: (msg: string) => void) => void) {
        action(resolve)
    }

    public then(callback: (msg: string) => void) {
        callback('finished')
    }
}

function testPromise() {
    function prm() {
        return new FalsePromise((resolve) => {
            setTimeout(() => {
                console.log('elapsed')
                resolve('--XYZ---')
            }, 300)
        })
    }
    prm()
    .then((val) => {
        let j = 3
        const p = ++j
        console.log(`then: ${p}`)
    })
}

async function importFromWeb() {
    console.log('IMPORT ...')
    const conn = await defaultDataSource.initialize()
    const cursor = new DBCursorKeeper(conn)
    const importer = new ImportTask(conn, cursor)
    async function storeData(drafts: DraftResolutionPage[], resolutions: ResolutionDetailsPage[], page: number) {
        console.log(`--SAVING ${resolutions.length}`)
        //await importer.importCollection({drafts: drafts, resolutions: resolutions})
        //await cursor.updatePage(page)
    }
    await read_pages([2024, 2023, 2022], async (result) => {
        await storeData(result.drafts, result.resolutions, result.year)
    })
}

async function main() {
    const args = process.argv.slice(2);
    if(args[0] == 'test_request') {
        testRequest(args[1])
    }
    if(args[0] == 'promise') {
        testPromise()
    }
    if(args[0] == 'import') {
        await importFromWeb()
    }
}

if (require.main.filename === __filename) {
    main()
}
